# 1. SSH Ping Collector (`collect_pings.py`)

Program dla administratora, który łączy się przez SSH do każdego serwera z listy CSV, uruchamia `ping` ze standardowego POSIX `sh` do wszystkich pozostałych serwerów z listy (bez instalowania jakichkolwiek aplikacji i bez otwierania portów), a następnie zapisuje pełną macierz opóźnień do JSON (bez loginów SSH).

## Wymagania

- Python 3.8+ (wyłącznie biblioteka standardowa — brak `pip install`)
- Klient OpenSSH (`ssh` w `PATH` — wbudowany w Windows 10/11, Linux i macOS)
- Zalecane klucze SSH (`ssh-agent` / `~/.ssh/config`) dla połączeń równoległych bez ręcznego wpisywania hasła

## Format pliku CSV

Plik CSV powinien mieć kolumny `kraj,centrum danych,IP,uzytkownik linux` (nagłówek jest opcjonalny):

```csv
kraj,centrum danych,IP,uzytkownik linux
PL,OVH,1.2.3.4,root
USA,Hetzner,2.3.4.5,ubuntu
```

Opcjonalnie można podać niestandardowy port SSH jako `1.2.3.4:2222` albo w 5. kolumnie.

## Podstawowe użycie

```bash
python collect_pings.py --csv servers.csv --out ../3-web-viewer/data/server-pings.json --sync-player-dir ../2-player-ping-tool
```

Co zrobi powyższe polecenie:
1. Zmierzy ping między każdą parą serwerów z `servers.csv` (zrównoleglone po SSH i na samych serwerach).
2. Zapisze `../3-web-viewer/data/server-pings.json` (oraz `server-pings.js` do otwierania strony lokalnie bez serwera HTTP).
3. Zaktualizuje listę serwerów (bez użytkowników SSH!) w `../2-player-ping-tool/` (`servers.txt`, `ping-servers.bat`, `ping-servers.php`).

## Przydatne opcje

- `--dry-run` — sprawdza CSV i wypisuje komendy SSH bez łączenia się z serwerami.
- `--count 10` — zwiększa liczbę mierzonych pakietów ICMP (domyślnie `5`).
- `--warmup 2` — liczba pierwszych pakietów rozgrzewkowych odrzucanych ze statystyk (domyślnie `2`, eliminuje skok `icmp_seq=1` z ARP/conntrack/SDN w chmurze).
- `--ssh-workers 15` — liczba równoczesnych sesji SSH (domyślnie `10`).
- `--remote-concurrency 8` — liczba równoczesnych `ping` na jednym serwerze (domyślnie `8`).
- `--merge --retry-failed` — ponawia tylko te serwery, które nie odpowiedziały lub zostały dopisane do CSV, zachowując poprzednie udane pomiary.
- `--no-batch-mode` — wyłącza `BatchMode=yes` (pozwala wpisać hasło ręcznie po kolei).
- `--ssh-option IdentityFile=~/.ssh/moj_klucz` — przekazuje dodatkową opcję `-o` do `ssh`.

## Testy jednostkowe

```bash
python test_collector.py -v
```
