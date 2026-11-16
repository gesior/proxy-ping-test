# 2. Player Ping Tool (`ping-servers.bat` / `ping-servers.php`)

Simple, fully transparent scripts that any player can open in Notepad to verify they are safe: they only run the built-in `ping` command for the listed servers, save the results to `my-pings.json`, and copy them to the clipboard.

## `.bat` Version (Recommended for Windows Players)

- File: `ping-servers.bat`
- Requires zero extra software or libraries.
- Works with `servers.txt` next to the script **or completely standalone** using the embedded server list (automatically updated by `collect_pings.py --sync-player-dir`).
- Saves `my-pings.json` and automatically copies it to the clipboard (`Ctrl+V` on the website).

### How to Run

1. Download `ping-servers.bat` (optionally with `servers.txt`).
2. Double-click `ping-servers.bat`.
3. Wait for the test to finish, open the website, and paste the result (`Ctrl+V`).

## `.php` Version (Windows / Linux / macOS)

- File: `ping-servers.php`
- Requires PHP CLI (7.4+ / 8.x), no external extensions or Composer packages.
- Pings servers **in parallel** (8 at a time by default), finishing in a few seconds even with large server lists.

```bash
php ping-servers.php
```

Optional flags:
- `--count=4` — number of measured `ping` packets per server
- `--warmup=1` — initial warmup packets discarded from stats (default: `1`)
- `--timeout=1500` — timeout in ms
- `--concurrency=8` — number of concurrent `ping` processes
- `--servers=path.txt` — custom server list file
- `--out=result.json` — custom output file path
