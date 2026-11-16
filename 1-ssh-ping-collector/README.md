# 1. SSH Ping Collector (`collect_pings.py`)

Administrator tool that connects over SSH to every server in a CSV file, runs `ping` via standard POSIX `sh` to all other servers in the list (without installing any applications or opening any ports), and saves the full latency matrix to JSON (without SSH usernames).

## Requirements

- Python 3.8+ (standard library only — no `pip install` needed)
- OpenSSH client (`ssh` in `PATH` — built into Windows 10/11, Linux, and macOS)
- SSH keys (`ssh-agent` / `~/.ssh/config`) recommended for parallel non-interactive connections

## CSV Format

The CSV file uses `country,datacenter,IP,linux user` columns (header row is optional):

```csv
country,datacenter,IP,linux user
PL,OVH,1.2.3.4,root
USA,Hetzner,2.3.4.5,ubuntu
BR,LookingGlass,5.6.7.8,onlyping
```

- Use `onlyping` as the `linux user` for servers/IPs you do **not** have SSH access to (e.g. a provider test IP / Looking Glass or an external server). `collect_pings.py` will skip SSH for those entries, ping them from all SSH-accessible servers, mark them as `sshStatus: "onlyping"` in `server-pings.json`, and still include them in `2-player-ping-tool/` (`servers.txt`, `.bat`, `.php`) so players ping them too.
- Optionally, you can specify a custom SSH port as `1.2.3.4:2222` or in a 5th column.

## Basic Usage

```bash
python collect_pings.py --csv servers.csv --out ../3-web-viewer/data/server-pings.json --sync-player-dir ../2-player-ping-tool
```

What this command does:
1. Measures ping between every pair of servers in `servers.csv` (parallelized across SSH hosts and inside each server).
2. Writes `../3-web-viewer/data/server-pings.json` (plus `server-pings.js` so the web page can also be opened locally via `file://`).
3. Updates the server list (without SSH usernames!) in `../2-player-ping-tool/` (`servers.txt`, `ping-servers.bat`, `ping-servers.php`).

## Useful Options

- `--dry-run` — validates the CSV and prints planned SSH commands without connecting.
- `--count 10` — number of measured ICMP packets per pair (default: `5`).
- `--warmup 2` — number of initial warmup packets discarded from stats (default: `2`, removes `icmp_seq=1` ARP/conntrack/cloud SDN spikes).
- `--ssh-workers 15` — number of concurrent SSH sessions (default: `10`).
- `--remote-concurrency 8` — number of concurrent `ping` targets inside each server (default: `8`).
- `--merge --retry-failed` — retries only servers that failed or were newly added to the CSV while keeping previous successful measurements.
- `--no-batch-mode` — disables `BatchMode=yes` (allows typing passwords interactively).
- `--ssh-option IdentityFile=~/.ssh/my_key` — passes an extra `-o` option to `ssh`.

## Unit Tests

```bash
python test_collector.py -v
```
