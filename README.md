# Proxy Ping Test — 3-Tool Suite

This suite helps you test whether routing a player's traffic through proxy servers in other countries / data centers lowers their ping compared to a direct connection.

## Directory Structure

1. [`1-ssh-ping-collector/`](1-ssh-ping-collector/README.md) — Python script for the administrator: connects over SSH to all servers listed in a CSV file (without installing anything or opening any ports), runs `ping` between every pair of servers, and exports `server-pings.json` (without SSH usernames).
2. [`2-player-ping-tool/`](2-player-ping-tool/README.md) — transparent, easy-to-audit scripts for players (`ping-servers.bat` for Windows and `ping-servers.php` cross-platform) that only run the system `ping` command, save `my-pings.json`, and copy the result to the clipboard.
3. [`3-web-viewer/`](3-web-viewer/README.md) — static web app (HTML/CSS/JS) that loads `server-pings.json`, lets a player paste their own ping results, and displays best-proxy recommendations plus a full **every-to-every (`Proxy × Target`)** matrix with `+/- ms` differences.

## Quick Start (Step by Step)

1. Create your `servers.csv` file (see `1-ssh-ping-collector/servers.example.csv`):
   ```csv
   country,datacenter,IP,linux user
   PL,OVH,1.2.3.4,root
   USA,Hetzner,2.3.4.5,ubuntu
   ```
2. Collect the server-to-server ping matrix and sync the server list to the player tool and web viewer:
   ```bash
   python 1-ssh-ping-collector/collect_pings.py \
     --csv servers.csv \
     --out 3-web-viewer/data/server-pings.json \
     --sync-player-dir 2-player-ping-tool
   ```
3. Host `3-web-viewer/` (e.g. GitHub Pages / Nginx / Apache) and share `2-player-ping-tool/ping-servers.bat` (or `ping-servers.php` + `servers.txt`) with your players.
4. A player runs `ping-servers.bat`, clicks **Paste from clipboard** on the website, and immediately sees how many milliseconds each proxy would save or add.
