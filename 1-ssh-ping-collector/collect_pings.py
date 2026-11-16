#!/usr/bin/env python3
"""
SSH Mesh Ping Collector
=======================
Connects via OpenSSH (`ssh`) to every Linux server listed in a CSV file,
runs ICMP `ping` from each server to all other servers in the list without
installing any software or opening ports on the remote servers, and exports
the full server-to-server latency matrix as JSON (without SSH usernames).

Input CSV format:
    kraj,centrum danych,IP,uzytkownik linux
    PL,OVH,1.2.3.4,root
    USA,Hetzner,2.3.4.5,ubuntu

Optional 5th column: ssh_port (or use IP:PORT in the IP column).
Optional 6th column: custom_label.

Use `onlyping` as `uzytkownik linux` for servers without SSH access — they will
not be queried over SSH, and will only be pinged from your SSH servers and the
player ping tool.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import csv
import datetime as dt
import ipaddress
import json
import math
import re
import shlex
import statistics
import subprocess
import sys
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any


SAFE_HOST_RE = re.compile(r"^[A-Za-z0-9._:-]+$")
REPLY_SEQ_RE = re.compile(
    r"(?:icmp_seq|seq)=(\d+).*?\btime(?:=|<)\s*([0-9.]+)\s*ms",
    re.IGNORECASE,
)
REPLY_TIME_RE = re.compile(
    r"\btime(?:=|<)\s*([0-9.]+)\s*ms",
    re.IGNORECASE,
)
PACKET_STATS_RE = re.compile(
    r"(\d+)\s+packets?\s+transmitted,\s+(\d+)\s+(?:packets?\s+)?received.*?"
    r"(\d+(?:\.\d+)?)%\s+(?:packet\s+)?loss",
    re.IGNORECASE,
)
RTT_SUMMARY_RE = re.compile(
    r"(?:rtt|round-trip)\s+min/avg/max(?:/(?:mdev|stddev))?\s*=\s*"
    r"([0-9.]+)/([0-9.]+)/([0-9.]+)(?:/([0-9.]+))?\s*ms",
    re.IGNORECASE,
)
BLOCK_RE = re.compile(
    r"__PING_BEGIN__\s+(\S+)\s+(-?\d+)\r?\n(.*?)\r?\n__PING_END__\s+\S+",
    re.DOTALL,
)

HEADER_COUNTRY_NAMES = {"kraj", "country", "region", "lokalizacja"}
HEADER_IP_NAMES = {"ip", "ip address", "adres ip", "host", "hostname", "adres"}


@dataclass(frozen=True)
class ServerEntry:
    """Represents a server parsed from CSV."""

    id: str
    country: str
    datacenter: str
    ip: str
    user: str
    ssh_port: int
    label: str

    @property
    def is_only_ping(self) -> bool:
        """Return True if this server is ping-only (no SSH access)."""
        return self.user.strip().lower() == "onlyping"

    def to_public_dict(self, ssh_status: str, ssh_error: str | None) -> dict[str, Any]:
        """Return server metadata safe for public consumption (no SSH user/port)."""
        return {
            "id": self.id,
            "country": self.country,
            "datacenter": self.datacenter,
            "ip": self.ip,
            "label": self.label,
            "sshStatus": ssh_status,
            "sshError": ssh_error,
            "onlyPing": self.is_only_ping,
        }


def parse_host_and_port(raw_host: str, explicit_port: str | None = None) -> tuple[str, int]:
    """Parse IP/hostname and optional SSH port from `IP` or `IP:PORT`."""
    host = raw_host.strip()
    port = 22

    # [2001:db8::1]:2222
    if host.startswith("[") and "]" in host:
        end_idx = host.index("]")
        addr = host[1:end_idx]
        rest = host[end_idx + 1 :]
        if rest.startswith(":") and rest[1:].isdigit():
            port = int(rest[1:])
        host = addr
    elif host.count(":") == 1:
        addr, maybe_port = host.split(":", 1)
        if maybe_port.isdigit():
            host = addr
            port = int(maybe_port)

    if explicit_port:
        explicit_port = explicit_port.strip()
        if explicit_port:
            if not explicit_port.isdigit():
                raise ValueError(f"Invalid SSH port '{explicit_port}' for host '{raw_host}'")
            port = int(explicit_port)

    if not (1 <= port <= 65535):
        raise ValueError(f"SSH port out of range (1-65535): {port} for host '{raw_host}'")

    if not host or not SAFE_HOST_RE.match(host):
        raise ValueError(f"Unsafe or empty IP/hostname: '{raw_host}'")

    # Validate IP syntax if it looks numeric, while still permitting DNS hostnames.
    try:
        ipaddress.ip_address(host)
    except ValueError:
        if any(c.isspace() for c in host):
            raise ValueError(f"Invalid host '{host}'")

    return host, port


def is_header_row(row: list[str]) -> bool:
    """Detect whether the first CSV row is a header."""
    if len(row) < 3:
        return False
    c0 = row[0].strip().lower()
    c2 = row[2].strip().lower()
    return c0 in HEADER_COUNTRY_NAMES or c2 in HEADER_IP_NAMES


def load_servers_csv(csv_path: Path) -> list[ServerEntry]:
    """Load and validate servers from CSV file."""
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_path}")

    raw_entries: list[dict[str, Any]] = []
    seen_ips: set[str] = set()

    with csv_path.open("r", encoding="utf-8-sig", newline="") as fh:
        reader = csv.reader(fh)
        for line_no, row in enumerate(reader, start=1):
            if not row or all(not cell.strip() for cell in row):
                continue
            first = row[0].strip()
            if first.startswith("#") or first.startswith(";"):
                continue

            if not raw_entries and is_header_row(row):
                continue

            if len(row) < 4:
                raise ValueError(
                    f"{csv_path}:{line_no}: expected at least 4 columns "
                    f"(kraj,centrum danych,IP,uzytkownik linux), got {len(row)}"
                )

            country = row[0].strip()
            datacenter = row[1].strip()
            raw_ip = row[2].strip()
            user = row[3].strip()
            explicit_port = row[4].strip() if len(row) >= 5 else None
            custom_label = row[5].strip() if len(row) >= 6 else ""

            if not country or not datacenter or not raw_ip or not user:
                raise ValueError(f"{csv_path}:{line_no}: empty required column in row {row}")

            ip, ssh_port = parse_host_and_port(raw_ip, explicit_port)
            if ip in seen_ips:
                print(
                    f"[WARN] Duplicate IP '{ip}' at line {line_no} skipped.",
                    file=sys.stderr,
                )
                continue
            seen_ips.add(ip)

            raw_entries.append(
                {
                    "country": country,
                    "datacenter": datacenter,
                    "ip": ip,
                    "user": user,
                    "ssh_port": ssh_port,
                    "custom_label": custom_label,
                }
            )

    if not raw_entries:
        raise ValueError(f"No server rows found in {csv_path}")

    # Disambiguate labels if multiple servers share the same country + datacenter.
    pair_counts: dict[tuple[str, str], int] = {}
    for item in raw_entries:
        key = (item["country"], item["datacenter"])
        pair_counts[key] = pair_counts.get(key, 0) + 1

    pair_indices: dict[tuple[str, str], int] = {}
    servers: list[ServerEntry] = []
    for item in raw_entries:
        key = (item["country"], item["datacenter"])
        if item["custom_label"]:
            label = item["custom_label"]
        elif pair_counts[key] > 1:
            idx = pair_indices.get(key, 0) + 1
            pair_indices[key] = idx
            label = f"{item['country']} · {item['datacenter']} #{idx}"
        else:
            label = f"{item['country']} · {item['datacenter']}"

        servers.append(
            ServerEntry(
                id=item["ip"],
                country=item["country"],
                datacenter=item["datacenter"],
                ip=item["ip"],
                user=item["user"],
                ssh_port=item["ssh_port"],
                label=label,
            )
        )

    return servers


def build_remote_ping_script(
    targets: list[str],
    count: int,
    interval: float,
    timeout: int,
    concurrency: int,
) -> str:
    """Build a zero-dependency POSIX `sh` script to ping all targets on the remote host."""
    safe_targets = " ".join(shlex.quote(t) for t in targets)
    return f"""#!/bin/sh
LC_ALL=C
LANG=C
export LC_ALL LANG
COUNT={int(count)}
INTERVAL={interval}
TIMEOUT={int(timeout)}
CONCURRENCY={max(1, int(concurrency))}

TMPDIR=$(mktemp -d 2>/dev/null || printf '/tmp/proxy_ping_%s' "$$")
mkdir -p "$TMPDIR" 2>/dev/null || {{
  TMPDIR="${{HOME:-/tmp}}/.proxy_ping_$$"
  mkdir -p "$TMPDIR" || exit 91
}}
trap 'rm -rf "$TMPDIR"' EXIT INT TERM

ping_one() {{
  target="$1"
  outfile="$2"
  rc=0
  case "$target" in
    *:*)
      if out=$(ping -6 -n -c "$COUNT" -i "$INTERVAL" -W "$TIMEOUT" "$target" 2>&1); then
        rc=0
      else
        rc=$?
        case "$out" in
          *[Ii]nvalid*|*[Ii]llegal*|*[Uu]sage*|*[Bb]ad*|*[Ii]nterval*|*[Oo]ption*|*[Pp]ermission*|*"not permitted"*)
            if command -v ping6 >/dev/null 2>&1; then
              out2=$(ping6 -n -c "$COUNT" -i "$INTERVAL" -W "$TIMEOUT" "$target" 2>&1)
              rc2=$?
              if [ $rc2 -ne 0 ]; then
                case "$out2" in
                  *[Ii]nvalid*|*[Ii]llegal*|*[Uu]sage*|*[Ii]nterval*)
                    out2=$(ping6 -n -c "$COUNT" -W "$TIMEOUT" "$target" 2>&1)
                    rc2=$?
                    ;;
                esac
              fi
            else
              out2=$(ping -6 -n -c "$COUNT" -W "$TIMEOUT" "$target" 2>&1)
              rc2=$?
            fi
            if [ $rc2 -eq 0 ] || [ -n "$out2" ]; then
              out="$out2"
              rc=$rc2
            fi
            ;;
        esac
      fi
      ;;
    *)
      if out=$(ping -n -c "$COUNT" -i "$INTERVAL" -W "$TIMEOUT" "$target" 2>&1); then
        rc=0
      else
        rc=$?
        case "$out" in
          *[Ii]nvalid*|*[Ii]llegal*|*[Uu]sage*|*[Bb]ad*|*[Ii]nterval*|*[Pp]ermission*|*"not permitted"*)
            out2=$(ping -n -c "$COUNT" -W "$TIMEOUT" "$target" 2>&1)
            rc2=$?
            if [ $rc2 -eq 0 ] || [ -n "$out2" ]; then
              out="$out2"
              rc=$rc2
            fi
            ;;
        esac
      fi
      ;;
  esac
  {{
    printf '__PING_BEGIN__ %s %s\\n' "$target" "$rc"
    printf '%s\\n' "$out"
    printf '__PING_END__ %s\\n' "$target"
  }} > "$outfile"
}}

idx=0
active=0
for t in {safe_targets}; do
  idx=$((idx + 1))
  ping_one "$t" "$TMPDIR/$idx.out" &
  active=$((active + 1))
  if [ "$active" -ge "$CONCURRENCY" ]; then
    wait
    active=0
  fi
done
wait

for f in "$TMPDIR"/*.out; do
  [ -f "$f" ] && cat "$f"
done
"""


def parse_single_ping_output(
    raw_output: str,
    exit_code: int = 0,
    warmup: int = 0,
) -> dict[str, Any]:
    """Parse Linux/BSD/BusyBox `ping` stdout/stderr into steady-state latency metrics."""
    sent = None
    received = None
    loss = None

    stats_match = PACKET_STATS_RE.search(raw_output)
    if stats_match:
        sent = int(stats_match.group(1))
        received = int(stats_match.group(2))
        loss = round(float(stats_match.group(3)), 2)

    rtt_match = RTT_SUMMARY_RE.search(raw_output)
    raw_avg_ms = round(float(rtt_match.group(2)), 2) if rtt_match else None

    seq_samples = [
        (int(m.group(1)), float(m.group(2)))
        for m in REPLY_SEQ_RE.finditer(raw_output)
    ]
    plain_samples = (
        []
        if seq_samples
        else [float(m.group(1)) for m in REPLY_TIME_RE.finditer(raw_output)]
    )

    used_samples: list[float] = []
    warmup_applied = False

    if seq_samples:
        if warmup > 0:
            filtered = [val for seq, val in seq_samples if seq > warmup]
            if filtered:
                used_samples = filtered
                warmup_applied = True
                if sent is not None and sent > warmup:
                    measured_sent = sent - warmup
                    measured_recv = min(len(filtered), measured_sent)
                    loss = round(((measured_sent - measured_recv) / measured_sent) * 100.0, 2)
                    sent = measured_sent
                    received = measured_recv
            else:
                used_samples = [val for _, val in seq_samples]
        else:
            used_samples = [val for _, val in seq_samples]
    elif plain_samples:
        if warmup > 0 and len(plain_samples) > warmup:
            used_samples = plain_samples[warmup:]
            warmup_applied = True
            if sent is not None and sent > warmup:
                measured_sent = sent - warmup
                measured_recv = min(len(used_samples), measured_sent)
                loss = round(((measured_sent - measured_recv) / measured_sent) * 100.0, 2)
                sent = measured_sent
                received = measured_recv
        else:
            used_samples = plain_samples

    if warmup_applied and used_samples:
        mean_ms = sum(used_samples) / len(used_samples)
        mdev_ms = math.sqrt(sum((x - mean_ms) ** 2 for x in used_samples) / len(used_samples))
        result: dict[str, Any] = {
            "avg": round(mean_ms, 2),
            "median": round(statistics.median(used_samples), 2),
            "min": round(min(used_samples), 2),
            "max": round(max(used_samples), 2),
            "mdev": round(mdev_ms, 2),
            "loss": loss if loss is not None else 0.0,
            "sent": sent,
            "received": received,
        }
        if raw_avg_ms is not None:
            result["rawAvg"] = raw_avg_ms
        return result

    if rtt_match:
        min_ms = round(float(rtt_match.group(1)), 2)
        avg_ms = raw_avg_ms
        max_ms = round(float(rtt_match.group(3)), 2)
        mdev_ms = round(float(rtt_match.group(4)), 2) if rtt_match.group(4) is not None else None
        median_ms = round(statistics.median(used_samples), 2) if used_samples else avg_ms
        return {
            "avg": avg_ms,
            "median": median_ms,
            "min": min_ms,
            "max": max_ms,
            "mdev": mdev_ms,
            "loss": loss if loss is not None else 0.0,
            "sent": sent,
            "received": received,
        }

    # No RTT stats (100% loss or ping command error)
    lines = [line.strip() for line in raw_output.splitlines() if line.strip()]
    error_msg = None
    if not stats_match or (received == 0 and exit_code != 0 and lines):
        if not stats_match:
            error_msg = lines[-1] if lines else f"ping exited with code {exit_code}"

    result = {
        "avg": None,
        "median": None,
        "min": None,
        "max": None,
        "mdev": None,
        "loss": loss if loss is not None else 100.0,
        "sent": sent,
        "received": received if received is not None else 0,
    }
    if error_msg:
        result["error"] = error_msg
    return result


def parse_remote_blocks(stdout_text: str, warmup: int = 0) -> dict[str, dict[str, Any]]:
    """Parse framed `__PING_BEGIN__` ... `__PING_END__` blocks from SSH stdout."""
    results: dict[str, dict[str, Any]] = {}
    for match in BLOCK_RE.finditer(stdout_text):
        target = match.group(1).strip()
        rc = int(match.group(2))
        body = match.group(3)
        results[target] = parse_single_ping_output(body, rc, warmup=warmup)
    return results


def build_ssh_command(
    server: ServerEntry,
    strict_host_key: str,
    batch_mode: bool,
    connect_timeout: int,
    extra_options: list[str],
) -> list[str]:
    """Construct the OpenSSH CLI command."""
    cmd = [
        "ssh",
        "-T",
        "-o",
        f"StrictHostKeyChecking={strict_host_key}",
        "-o",
        f"ConnectTimeout={connect_timeout}",
    ]
    if batch_mode:
        cmd.extend(["-o", "BatchMode=yes"])
    if server.ssh_port != 22:
        cmd.extend(["-p", str(server.ssh_port)])
    for opt in extra_options:
        cmd.extend(["-o", opt])
    cmd.append(f"{server.user}@{server.ip}")
    cmd.append("sh -s")
    return cmd


def collect_from_server(
    source: ServerEntry,
    all_servers: list[ServerEntry],
    *,
    count: int,
    warmup: int,
    interval: float,
    timeout: int,
    remote_concurrency: int,
    ssh_timeout: int,
    connect_timeout: int,
    strict_host_key: str,
    batch_mode: bool,
    extra_ssh_options: list[str],
    verbose: bool,
    log_lock: threading.Lock,
) -> tuple[str, str, str | None, dict[str, dict[str, Any]]]:
    """Run SSH session on one source server to ping all other servers."""
    targets = [srv.ip for srv in all_servers if srv.ip != source.ip]
    if not targets:
        return source.ip, "ok", None, {}

    total_packets = max(1, count) + max(0, warmup)
    script = build_remote_ping_script(
        targets=targets,
        count=total_packets,
        interval=interval,
        timeout=timeout,
        concurrency=remote_concurrency,
    )
    cmd = build_ssh_command(
        server=source,
        strict_host_key=strict_host_key,
        batch_mode=batch_mode,
        connect_timeout=connect_timeout,
        extra_options=extra_ssh_options,
    )

    if verbose:
        with log_lock:
            print(f"[SSH] Connecting {source.label} ({source.user}@{source.ip}:{source.ssh_port}) -> {len(targets)} targets")

    script_bytes = script.replace("\r\n", "\n").encode("utf-8")
    try:
        proc = subprocess.run(
            cmd,
            input=script_bytes,
            capture_output=True,
            timeout=ssh_timeout,
        )
    except subprocess.TimeoutExpired:
        return source.ip, "error", f"SSH timeout after {ssh_timeout}s", {}
    except FileNotFoundError:
        return source.ip, "error", "OpenSSH 'ssh' command not found in PATH", {}
    except Exception as exc:
        return source.ip, "error", f"SSH execution failed: {exc}", {}

    stdout_text = proc.stdout.decode("utf-8", errors="replace") if proc.stdout else ""
    stderr_text = proc.stderr.decode("utf-8", errors="replace") if proc.stderr else ""

    parsed = parse_remote_blocks(stdout_text, warmup=max(0, warmup))
    if not parsed:
        err_lines = [ln.strip() for ln in stderr_text.splitlines() if ln.strip()]
        err_msg = " | ".join(err_lines[-3:]) if err_lines else f"SSH exited with code {proc.returncode} and no ping output"
        return source.ip, "error", err_msg, {}

    missing = [t for t in targets if t not in parsed]
    if missing:
        for t in missing:
            parsed[t] = {
                "avg": None,
                "median": None,
                "min": None,
                "max": None,
                "mdev": None,
                "loss": 100.0,
                "sent": None,
                "received": 0,
                "error": "Target missing from remote output",
            }
        return source.ip, "partial", f"Missing {len(missing)}/{len(targets)} target blocks", parsed

    return source.ip, "ok", None, parsed


def load_existing_json(out_path: Path) -> dict[str, Any] | None:
    """Load existing `server-pings.json` for --merge / --retry-failed."""
    if not out_path.exists():
        return None
    try:
        with out_path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
        if isinstance(data, dict) and "servers" in data and "matrix" in data:
            return data
    except Exception as exc:
        print(f"[WARN] Could not load existing JSON {out_path}: {exc}", file=sys.stderr)
    return None


def write_outputs(
    payload: dict[str, Any],
    out_path: Path,
    write_js: bool,
) -> None:
    """Write `server-pings.json` and optional sibling `server-pings.js` for file:// support."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    json_text = json.dumps(payload, indent=2, ensure_ascii=False)
    out_path.write_text(json_text + "\n", encoding="utf-8")

    if write_js:
        js_path = out_path.with_suffix(".js")
        js_text = (
            "// Auto-generated by 1-ssh-ping-collector/collect_pings.py\n"
            f"window.PROXY_PING_DATA = {json_text};\n"
        )
        js_path.write_text(js_text, encoding="utf-8")


def replace_marker_block(text: str, start_marker: str, end_marker: str, new_block: str) -> str:
    """Replace lines strictly between `start_marker` and `end_marker` preserving line endings."""
    newline = "\r\n" if "\r\n" in text else "\n"
    start_idx = text.find(start_marker)
    end_idx = text.find(end_marker)
    if start_idx == -1 or end_idx == -1 or end_idx <= start_idx:
        raise ValueError(f"Markers '{start_marker}' / '{end_marker}' not found")

    after_start = text.find("\n", start_idx)
    if after_start == -1:
        raise ValueError(f"Missing newline after '{start_marker}'")
    after_start += 1

    # Preserve indentation of end_marker line if any
    line_start_of_end = text.rfind("\n", 0, end_idx)
    line_start_of_end = 0 if line_start_of_end == -1 else line_start_of_end + 1

    body = new_block.replace("\r\n", "\n").replace("\n", newline)
    if body and not body.endswith(newline):
        body += newline
    return text[:after_start] + body + text[line_start_of_end:]


def sync_player_tool_dir(servers: list[ServerEntry], player_dir: Path) -> list[Path]:
    """Update `servers.txt` and embedded lists in `ping-servers.bat` / `ping-servers.php`."""
    updated: list[Path] = []
    player_dir.mkdir(parents=True, exist_ok=True)

    # 1. servers.txt (no SSH usernames!)
    servers_txt = player_dir / "servers.txt"
    lines = [
        "# Server list for ping test (no SSH credentials)",
        "# Format: country,datacenter,IP",
    ]
    for srv in servers:
        c = srv.country.replace(",", " ")
        dc = srv.datacenter.replace(",", " ")
        lines.append(f"{c},{dc},{srv.ip}")
    servers_txt.write_text("\n".join(lines) + "\n", encoding="utf-8")
    updated.append(servers_txt)

    # 2. ping-servers.bat embedded block
    bat_path = player_dir / "ping-servers.bat"
    if bat_path.exists():
        bat_text = bat_path.read_text(encoding="utf-8")
        bat_lines = []
        for srv in servers:
            c = srv.country.replace('"', "")
            dc = srv.datacenter.replace('"', "")
            ip = srv.ip.replace('"', "")
            bat_lines.append(f'call :add_server "{c}" "{dc}" "{ip}"')
        new_bat = replace_marker_block(
            bat_text,
            ":: === EMBEDDED_SERVERS_START ===",
            ":: === EMBEDDED_SERVERS_END ===",
            "\n".join(bat_lines),
        )
        bat_path.write_text(new_bat, encoding="utf-8")
        updated.append(bat_path)

    # 3. ping-servers.php embedded block
    php_path = player_dir / "ping-servers.php"
    if php_path.exists():
        php_text = php_path.read_text(encoding="utf-8")
        php_lines = []
        for srv in servers:
            c = srv.country.replace("'", "\\'")
            dc = srv.datacenter.replace("'", "\\'")
            ip = srv.ip.replace("'", "\\'")
            php_lines.append(f"    ['country' => '{c}', 'datacenter' => '{dc}', 'ip' => '{ip}'],")
        new_php = replace_marker_block(
            php_text,
            "// === EMBEDDED_SERVERS_START ===",
            "// === EMBEDDED_SERVERS_END ===",
            "\n".join(php_lines),
        )
        php_path.write_text(new_php, encoding="utf-8")
        updated.append(php_path)

    return updated


def compute_recommended_ssh_timeout(num_targets: int, count: int, interval: float, timeout: int, concurrency: int, explicit: int | None) -> int:
    """Compute a safe per-SSH-session timeout based on target count and batch concurrency."""
    if explicit is not None:
        return explicit
    batches = max(1, (num_targets + concurrency - 1) // max(1, concurrency))
    per_batch = count * max(interval, 1.0) + timeout + 4
    return max(60, int(batches * per_batch + 20))


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Collects an every-to-every ping matrix from SSH servers without installing anything on them."
    )
    parser.add_argument(
        "--csv",
        type=Path,
        default=Path("servers.csv"),
        help="Path to CSV file: country,datacenter,IP,linux user (default: servers.csv)",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("../3-web-viewer/data/server-pings.json"),
        help="Output JSON path (default: ../3-web-viewer/data/server-pings.json)",
    )
    parser.add_argument(
        "--no-js",
        action="store_true",
        help="Do not generate sibling .js file (the .js file allows opening the page locally via file://)",
    )
    parser.add_argument(
        "--sync-player-dir",
        type=Path,
        default=None,
        help="Player tool directory (e.g. ../2-player-ping-tool) to update servers.txt and embedded lists in .bat/.php",
    )
    parser.add_argument("--count", type=int, default=5, help="Measured ICMP ping packets per pair (default: 5)")
    parser.add_argument(
        "--warmup",
        type=int,
        default=2,
        help="Initial warmup packets discarded from stats to avoid ARP/conntrack/SDN cold-start spikes (default: 2)",
    )
    parser.add_argument("--interval", type=float, default=0.2, help="Interval between packets in seconds (default: 0.2)")
    parser.add_argument("--timeout", type=int, default=2, help="Per-packet timeout in seconds (default: 2)")
    parser.add_argument(
        "--ssh-workers",
        type=int,
        default=10,
        help="Number of SSH servers to query in parallel (default: 10)",
    )
    parser.add_argument(
        "--remote-concurrency",
        type=int,
        default=8,
        help="Number of targets to ping concurrently inside each server (default: 8)",
    )
    parser.add_argument(
        "--ssh-timeout",
        type=int,
        default=None,
        help="Overall SSH session timeout in seconds (auto-calculated by default)",
    )
    parser.add_argument("--connect-timeout", type=int, default=10, help="SSH ConnectTimeout in seconds (default: 10)")
    parser.add_argument(
        "--strict-host-key",
        choices=["accept-new", "yes", "no"],
        default="accept-new",
        help="SSH StrictHostKeyChecking value (default: accept-new)",
    )
    parser.add_argument(
        "--no-batch-mode",
        action="store_true",
        help="Disable BatchMode=yes (allows interactive password prompts; forces --ssh-workers 1)",
    )
    parser.add_argument(
        "--ssh-option",
        action="append",
        default=[],
        help="Extra SSH -o option (e.g. --ssh-option IdentityFile=~/.ssh/id_ed25519)",
    )
    parser.add_argument(
        "--merge",
        action="store_true",
        help="Merge with existing --out JSON (keeps previous successful measurements for skipped servers)",
    )
    parser.add_argument(
        "--retry-failed",
        action="store_true",
        help="With --merge: only SSH into servers missing or marked as failed in existing JSON",
    )
    parser.add_argument(
        "--only-from",
        type=str,
        default="",
        help="Comma-separated list of source IPs or country codes to run from",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate CSV and print planned SSH commands without connecting",
    )
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose logging")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_arg_parser()
    args = parser.parse_args(argv)

    try:
        servers = load_servers_csv(args.csv)
    except Exception as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 1

    onlyping_servers = [s for s in servers if s.is_only_ping]
    ssh_servers = [s for s in servers if not s.is_only_ping]
    if onlyping_servers:
        print(
            f"Loaded {len(servers)} servers from {args.csv} "
            f"({len(ssh_servers)} SSH, {len(onlyping_servers)} onlyping)"
        )
    else:
        print(f"Loaded {len(servers)} servers from {args.csv}")

    if args.sync_player_dir:
        updated = sync_player_tool_dir(servers, args.sync_player_dir)
        print("Updated player tool files: " + ", ".join(str(p) for p in updated))

    existing_data = load_existing_json(args.out) if (args.merge or args.retry_failed) else None
    existing_matrix: dict[str, dict[str, Any]] = {}
    existing_statuses: dict[str, tuple[str, str | None]] = {}
    if existing_data:
        existing_matrix = existing_data.get("matrix", {}) or {}
        for item in existing_data.get("servers", []) or []:
            ip = item.get("ip")
            if ip:
                existing_statuses[ip] = (item.get("sshStatus", "unknown"), item.get("sshError"))

    only_filter = {x.strip().lower() for x in args.only_from.split(",") if x.strip()}
    sources_to_run: list[ServerEntry] = []
    for srv in servers:
        if srv.is_only_ping:
            if only_filter and (srv.ip.lower() in only_filter or srv.country.lower() in only_filter):
                print(f"[INFO] Skipping '{srv.label}' ({srv.ip}) from --only-from because user is 'onlyping' (no SSH).")
            continue
        if only_filter and srv.ip.lower() not in only_filter and srv.country.lower() not in only_filter:
            continue
        if args.retry_failed and srv.ip in existing_statuses and existing_statuses[srv.ip][0] == "ok":
            # Also check if all current targets already exist for this source
            row = existing_matrix.get(srv.ip, {})
            missing_targets = [t.ip for t in servers if t.ip != srv.ip and t.ip not in row]
            if not missing_targets:
                continue
        sources_to_run.append(srv)

    if args.dry_run:
        print(f"[DRY-RUN] Servers to query via SSH: {len(sources_to_run)}/{len(servers)}.")
        for srv in sources_to_run:
            cmd = build_ssh_command(
                srv,
                strict_host_key=args.strict_host_key,
                batch_mode=not args.no_batch_mode,
                connect_timeout=args.connect_timeout,
                extra_options=args.ssh_option,
            )
            print("  " + " ".join(shlex.quote(part) for part in cmd))
        if onlyping_servers:
            print(f"[DRY-RUN] Ping-only targets (no SSH, user=onlyping): {len(onlyping_servers)}")
            for srv in onlyping_servers:
                print(f"  {srv.label} ({srv.ip})")
        return 0

    ssh_workers = 1 if args.no_batch_mode else max(1, args.ssh_workers)
    warmup = max(0, args.warmup)
    ssh_timeout = compute_recommended_ssh_timeout(
        num_targets=max(0, len(servers) - 1),
        count=args.count + warmup,
        interval=args.interval,
        timeout=args.timeout,
        concurrency=args.remote_concurrency,
        explicit=args.ssh_timeout,
    )

    matrix: dict[str, dict[str, Any]] = {}
    statuses: dict[str, tuple[str, str | None]] = {}

    if existing_data:
        valid_ips = {s.ip for s in servers}
        for srv in servers:
            if srv.is_only_ping:
                statuses[srv.ip] = ("onlyping", None)
                matrix[srv.ip] = {}
                continue
            if srv.ip in existing_matrix:
                matrix[srv.ip] = {
                    t_ip: val
                    for t_ip, val in existing_matrix[srv.ip].items()
                    if t_ip in valid_ips and t_ip != srv.ip
                }
            if srv.ip in existing_statuses:
                statuses[srv.ip] = existing_statuses[srv.ip]

    log_lock = threading.Lock()
    total = len(sources_to_run)
    completed = 0

    if total == 0:
        if not ssh_servers:
            print("No SSH source servers to query (all servers in CSV are 'onlyping').")
        else:
            print("No servers to query (all skipped by --retry-failed / --only-from / onlyping).")
    else:
        print(
            f"Starting measurements: {total} source servers -> {len(servers) - 1} targets each "
            f"(ssh_workers={ssh_workers}, remote_concurrency={args.remote_concurrency}, "
            f"count={args.count}, warmup={warmup}, ssh_timeout={ssh_timeout}s)..."
        )
        with concurrent.futures.ThreadPoolExecutor(max_workers=ssh_workers) as pool:
            future_map = {
                pool.submit(
                    collect_from_server,
                    srv,
                    servers,
                    count=args.count,
                    warmup=warmup,
                    interval=args.interval,
                    timeout=args.timeout,
                    remote_concurrency=args.remote_concurrency,
                    ssh_timeout=ssh_timeout,
                    connect_timeout=args.connect_timeout,
                    strict_host_key=args.strict_host_key,
                    batch_mode=not args.no_batch_mode,
                    extra_ssh_options=args.ssh_option,
                    verbose=args.verbose,
                    log_lock=log_lock,
                ): srv
                for srv in sources_to_run
            }
            for fut in concurrent.futures.as_completed(future_map):
                srv = future_map[fut]
                completed += 1
                ip, status, err, row_results = fut.result()
                statuses[ip] = (status, err)
                if row_results:
                    matrix[ip] = row_results
                elif ip not in matrix:
                    matrix[ip] = {}

                ok_pairs = sum(1 for v in row_results.values() if v.get("avg") is not None)
                with log_lock:
                    if status == "ok":
                        print(f"[{completed}/{total}] OK      {srv.label} ({srv.ip}) -> {ok_pairs}/{len(servers) - 1} replies")
                    elif status == "partial":
                        print(f"[{completed}/{total}] PARTIAL {srv.label} ({srv.ip}) -> {ok_pairs}/{len(servers) - 1} ({err})")
                    else:
                        print(f"[{completed}/{total}] ERROR   {srv.label} ({srv.ip}) -> {err}")

    public_servers = []
    for srv in servers:
        if srv.is_only_ping:
            st, err = "onlyping", None
            matrix.setdefault(srv.ip, {})
        else:
            st, err = statuses.get(srv.ip, ("skipped", "Not queried in this run"))
        public_servers.append(srv.to_public_dict(st, err))

    payload: dict[str, Any] = {
        "schemaVersion": 1,
        "generatedAt": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "pingConfig": {
            "count": args.count,
            "warmup": warmup,
            "interval": args.interval,
            "timeout": args.timeout,
        },
        "servers": public_servers,
        "matrix": matrix,
    }

    write_outputs(payload, args.out, write_js=not args.no_js)
    print(f"\nSaved results to: {args.out}")
    if not args.no_js:
        print(f"Saved JS wrapper for file:// to: {args.out.with_suffix('.js')}")

    failed_count = sum(1 for s in public_servers if s["sshStatus"] == "error")
    if failed_count:
        print(f"[WARNING] {failed_count} server(s) failed over SSH. You can retry them with --merge --retry-failed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
