# 2. Narzędzie dla graczy (`ping-servers.bat` / `ping-servers.php`)

Prosty, w pełni jawny skrypt, który gracz może otworzyć w Notatniku, aby upewnić się, że nie robi nic podejrzanego: uruchamia wyłącznie systemowy program `ping` dla podanej listy serwerów, zapisuje wynik do `my-pings.json` i kopiuje go do schowka.

## Wersja `.bat` (zalecana dla graczy Windows)

- Plik: `ping-servers.bat`
- Nie wymaga instalowania żadnych programów ani bibliotek.
- Działa z plikiem `servers.txt` obok skryptu **lub całkowicie samodzielnie** (korzysta wtedy z listy wbudowanej w sam skrypt — zaktualizowanej automatycznie przez `collect_pings.py --sync-player-dir`).
- Po zakończeniu zapisuje `my-pings.json` i automatycznie kopiuje go do schowka (`Ctrl+V` na stronie WWW).

### Jak uruchomić

1. Rozpakuj / pobierz `ping-servers.bat` (opcjonalnie z `servers.txt`).
2. Kliknij dwukrotnie `ping-servers.bat`.
3. Poczekaj na zakończenie testu, przejdź na stronę WWW i wklej wynik (`Ctrl+V`).

## Wersja `.php` (Windows / Linux / macOS)

- Plik: `ping-servers.php`
- Wymaga PHP CLI (7.4+ / 8.x), nie wymaga dodatkowych rozszerzeń ani Composera.
- Odpytuje serwery **równolegle** (domyślnie 8 naraz), więc przy bardzo dużej liczbie serwerów kończy test znacznie szybciej.

```bash
php ping-servers.php
```

Dodatkowe opcje:
- `--count=4` — liczba pakietów `ping` na serwer
- `--timeout=1500` — timeout w ms
- `--concurrency=8` — liczba równoległych procesów `ping`
- `--servers=sciezka.txt` — własny plik z listą serwerów
- `--out=wynik.json` — własna ścieżka pliku wyjściowego
