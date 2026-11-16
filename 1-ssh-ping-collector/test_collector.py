#!/usr/bin/env python3
"""Unit tests for 1-ssh-ping-collector/collect_pings.py."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
import collect_pings as cp  # noqa: E402


class TestCollector(unittest.TestCase):
    def test_csv_parsing_with_headers_ports_and_duplicates(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            csv_path = Path(tmp) / "servers.csv"
            csv_path.write_text(
                "\ufeffkraj,centrum danych,IP,uzytkownik linux\n"
                "# komentarz\n"
                "PL,OVH,1.2.3.4,root\n"
                "PL,OVH,1.2.3.5:2222,ubuntu\n"
                "USA,Hetzner,2.3.4.5,debian,2200\n"
                "DE,Hetzner,[2001:db8::1]:2222,root\n",
                encoding="utf-8",
            )
            servers = cp.load_servers_csv(csv_path)
            self.assertEqual(len(servers), 4)
            self.assertEqual(servers[0].label, "PL · OVH #1")
            self.assertEqual(servers[1].label, "PL · OVH #2")
            self.assertEqual(servers[1].ip, "1.2.3.5")
            self.assertEqual(servers[1].ssh_port, 2222)
            self.assertEqual(servers[2].ssh_port, 2200)
            self.assertEqual(servers[3].ip, "2001:db8::1")
            self.assertEqual(servers[3].ssh_port, 2222)

            pub = servers[0].to_public_dict("ok", None)
            self.assertNotIn("user", pub)
            self.assertNotIn("ssh_port", pub)

    def test_csv_parsing_without_header(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            csv_path = Path(tmp) / "servers.csv"
            csv_path.write_text(
                "PL,OVH,1.2.3.4,root\nUSA,Hetzner,2.3.4.5,ubuntu\n",
                encoding="utf-8",
            )
            servers = cp.load_servers_csv(csv_path)
            self.assertEqual(len(servers), 2)
            self.assertEqual(servers[0].label, "PL · OVH")
            self.assertEqual(servers[1].label, "USA · Hetzner")

    def test_parse_ping_variants(self) -> None:
        iputils_ok = (
            "PING 2.3.4.5 (2.3.4.5) 56(84) bytes of data.\n"
            "5 packets transmitted, 5 received, 0% packet loss, time 804ms\n"
            "rtt min/avg/max/mdev = 117.901/118.423/119.104/0.451 ms\n"
        )
        res = cp.parse_single_ping_output(iputils_ok, 0)
        self.assertEqual(res["avg"], 118.42)
        self.assertEqual(res["min"], 117.9)
        self.assertEqual(res["max"], 119.1)
        self.assertEqual(res["mdev"], 0.45)
        self.assertEqual(res["loss"], 0.0)
        self.assertEqual(res["sent"], 5)
        self.assertEqual(res["received"], 5)

        busybox_partial = (
            "PING 1.2.3.4 (1.2.3.4): 56 data bytes\n"
            "--- 1.2.3.4 ping statistics ---\n"
            "5 packets transmitted, 3 packets received, 40% packet loss\n"
            "round-trip min/avg/max = 10.100/12.500/15.200 ms\n"
        )
        res2 = cp.parse_single_ping_output(busybox_partial, 0)
        self.assertEqual(res2["avg"], 12.5)
        self.assertIsNone(res2["mdev"])
        self.assertEqual(res2["loss"], 40.0)

        timeout_out = (
            "--- 9.9.9.9 ping statistics ---\n"
            "5 packets transmitted, 0 received, 100% packet loss, time 4099ms\n"
        )
        res3 = cp.parse_single_ping_output(timeout_out, 1)
        self.assertIsNone(res3["avg"])
        self.assertEqual(res3["loss"], 100.0)
        self.assertEqual(res3["received"], 0)

        cold_start_out = (
            "PING 141.144.226.122 (141.144.226.122) 56(84) bytes of data.\n"
            "64 bytes from 141.144.226.122: icmp_seq=1 ttl=56 time=39.0 ms\n"
            "64 bytes from 141.144.226.122: icmp_seq=2 ttl=56 time=7.50 ms\n"
            "64 bytes from 141.144.226.122: icmp_seq=3 ttl=56 time=4.00 ms\n"
            "64 bytes from 141.144.226.122: icmp_seq=4 ttl=56 time=3.95 ms\n"
            "64 bytes from 141.144.226.122: icmp_seq=5 ttl=56 time=4.05 ms\n"
            "64 bytes from 141.144.226.122: icmp_seq=6 ttl=56 time=3.98 ms\n"
            "64 bytes from 141.144.226.122: icmp_seq=7 ttl=56 time=4.02 ms\n"
            "7 packets transmitted, 7 received, 0% packet loss, time 1205ms\n"
            "rtt min/avg/max/mdev = 3.950/9.500/39.000/12.110 ms\n"
        )
        res4 = cp.parse_single_ping_output(cold_start_out, 0, warmup=2)
        self.assertEqual(res4["avg"], 4.0)
        self.assertEqual(res4["median"], 4.0)
        self.assertEqual(res4["min"], 3.95)
        self.assertEqual(res4["max"], 4.05)
        self.assertEqual(res4["rawAvg"], 9.5)
        self.assertEqual(res4["sent"], 5)
        self.assertEqual(res4["received"], 5)
        self.assertEqual(res4["loss"], 0.0)

    def test_parse_remote_blocks(self) -> None:
        framed = (
            "__PING_BEGIN__ 2.3.4.5 0\n"
            "5 packets transmitted, 5 received, 0% packet loss, time 800ms\n"
            "rtt min/avg/max/mdev = 20.0/21.0/22.0/0.5 ms\n"
            "__PING_END__ 2.3.4.5\n"
            "__PING_BEGIN__ 3.4.5.6 1\n"
            "5 packets transmitted, 0 received, 100% packet loss, time 4000ms\n"
            "__PING_END__ 3.4.5.6\n"
        )
        parsed = cp.parse_remote_blocks(framed)
        self.assertEqual(parsed["2.3.4.5"]["avg"], 21.0)
        self.assertIsNone(parsed["3.4.5.6"]["avg"])
        self.assertEqual(parsed["3.4.5.6"]["loss"], 100.0)

    def test_end_to_end_mocked_ssh_and_player_sync(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            csv_path = tmp_path / "servers.csv"
            csv_path.write_text(
                "kraj,centrum danych,IP,uzytkownik linux\n"
                "PL,OVH,1.2.3.4,secretuser\n"
                "USA,Hetzner,2.3.4.5,ubuntu\n",
                encoding="utf-8",
            )
            out_json = tmp_path / "out" / "server-pings.json"
            player_dir = tmp_path / "player"
            player_dir.mkdir()
            (player_dir / "ping-servers.bat").write_text(
                "@echo off\n"
                ":: === EMBEDDED_SERVERS_START ===\n"
                'call :add_server "OLD" "OLD" "9.9.9.9"\n'
                ":: === EMBEDDED_SERVERS_END ===\n",
                encoding="utf-8",
            )
            (player_dir / "ping-servers.php").write_text(
                "<?php\n$servers = [\n"
                "// === EMBEDDED_SERVERS_START ===\n"
                "    ['country' => 'OLD', 'datacenter' => 'OLD', 'ip' => '9.9.9.9'],\n"
                "// === EMBEDDED_SERVERS_END ===\n"
                "];\n",
                encoding="utf-8",
            )

            def fake_run(cmd, input=None, **kwargs):
                self.assertIsInstance(input, bytes)
                self.assertNotIn(b"\r", input)
                target_arg = cmd[-2]
                if target_arg.endswith("@1.2.3.4"):
                    stdout = (
                        b"__PING_BEGIN__ 2.3.4.5 0\n"
                        b"5 packets transmitted, 5 received, 0% packet loss, time 800ms\n"
                        b"rtt min/avg/max/mdev = 110.0/112.5/115.0/1.2 ms\n"
                        b"__PING_END__ 2.3.4.5\n"
                    )
                else:
                    stdout = (
                        b"__PING_BEGIN__ 1.2.3.4 0\n"
                        b"5 packets transmitted, 5 received, 0% packet loss, time 800ms\n"
                        b"rtt min/avg/max/mdev = 111.0/113.0/116.0/1.0 ms\n"
                        b"__PING_END__ 1.2.3.4\n"
                    )
                return mock.Mock(returncode=0, stdout=stdout, stderr=b"")

            with mock.patch("subprocess.run", side_effect=fake_run):
                rc = cp.main(
                    [
                        "--csv",
                        str(csv_path),
                        "--out",
                        str(out_json),
                        "--sync-player-dir",
                        str(player_dir),
                    ]
                )
            self.assertEqual(rc, 0)

            raw_json = out_json.read_text(encoding="utf-8")
            self.assertNotIn("secretuser", raw_json)
            self.assertNotIn("ubuntu", raw_json)
            data = json.loads(raw_json)
            self.assertEqual(data["matrix"]["1.2.3.4"]["2.3.4.5"]["avg"], 112.5)
            self.assertEqual(data["matrix"]["2.3.4.5"]["1.2.3.4"]["avg"], 113.0)
            self.assertTrue(out_json.with_suffix(".js").exists())

            bat_text = (player_dir / "ping-servers.bat").read_text(encoding="utf-8")
            self.assertNotIn("9.9.9.9", bat_text)
            self.assertIn('call :add_server "PL" "OVH" "1.2.3.4"', bat_text)

            php_text = (player_dir / "ping-servers.php").read_text(encoding="utf-8")
            self.assertNotIn("9.9.9.9", php_text)
            self.assertIn("'ip' => '2.3.4.5'", php_text)

            txt_text = (player_dir / "servers.txt").read_text(encoding="utf-8")
            self.assertIn("PL,OVH,1.2.3.4", txt_text)
            self.assertNotIn("secretuser", txt_text)

    def test_merge_and_retry_failed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            csv_path = tmp_path / "servers.csv"
            csv_path.write_text(
                "kraj,centrum danych,IP,uzytkownik linux\n"
                "PL,OVH,1.2.3.4,root\n"
                "USA,Hetzner,2.3.4.5,ubuntu\n",
                encoding="utf-8",
            )
            out_json = tmp_path / "server-pings.json"
            out_json.write_text(
                json.dumps(
                    {
                        "schemaVersion": 1,
                        "servers": [
                            {"id": "1.2.3.4", "ip": "1.2.3.4", "sshStatus": "ok", "sshError": None},
                            {"id": "2.3.4.5", "ip": "2.3.4.5", "sshStatus": "error", "sshError": "timeout"},
                        ],
                        "matrix": {
                            "1.2.3.4": {"2.3.4.5": {"avg": 115.0, "min": 114.0, "max": 116.0, "loss": 0.0}},
                            "2.3.4.5": {},
                        },
                    }
                ),
                encoding="utf-8",
            )

            called_hosts = []

            def fake_run(cmd, input=None, **kwargs):
                called_hosts.append(cmd[-2])
                stdout = (
                    b"__PING_BEGIN__ 1.2.3.4 0\n"
                    b"5 packets transmitted, 5 received, 0% packet loss, time 800ms\n"
                    b"rtt min/avg/max/mdev = 114.0/115.5/117.0/1.0 ms\n"
                    b"__PING_END__ 1.2.3.4\n"
                )
                return mock.Mock(returncode=0, stdout=stdout, stderr=b"")

            with mock.patch("subprocess.run", side_effect=fake_run):
                rc = cp.main(
                    [
                        "--csv",
                        str(csv_path),
                        "--out",
                        str(out_json),
                        "--merge",
                        "--retry-failed",
                    ]
                )
            self.assertEqual(rc, 0)
            self.assertEqual(called_hosts, ["ubuntu@2.3.4.5"])
            data = json.loads(out_json.read_text(encoding="utf-8"))
            self.assertEqual(data["matrix"]["1.2.3.4"]["2.3.4.5"]["avg"], 115.0)
            self.assertEqual(data["matrix"]["2.3.4.5"]["1.2.3.4"]["avg"], 115.5)


if __name__ == "__main__":
    unittest.main()
