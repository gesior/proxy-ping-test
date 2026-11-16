# Proxy Ping Test — Zestaw 3 narzędzi

Narzędzie pozwala sprawdzić, czy przekierowanie ruchu gracza przez serwery proxy w innych krajach / centrach danych obniży jego ping względem bezpośredniego połączenia.

## Struktura katalogów

1. [`1-ssh-ping-collector/`](1-ssh-ping-collector/README.md) — skrypt Pythona dla administratora: łączy się po SSH do serwerów z listy CSV (bez instalowania czegokolwiek i bez otwierania portów), wykonuje `ping` między każdą parą serwerów i generuje `server-pings.json` (bez loginów SSH).
2. [`2-player-ping-tool/`](2-player-ping-tool/README.md) — jawne, łatwe do zweryfikowania w Notatniku skrypty dla graczy (`ping-servers.bat` dla Windows oraz `ping-servers.php`), które wykonują tylko systemowe `ping`, zapisują `my-pings.json` i kopiują wynik do schowka.
3. [`3-web-viewer/`](3-web-viewer/README.md) — statyczna strona WWW (HTML/CSS/JS), która ładuje macierz `server-pings.json`, pozwala graczowi wkleić jego ping i pokazuje rekomendacje oraz pełną tabelę **każdy-do-każdego (`Proxy × Serwer docelowy`)** z różnicą `+/- ms`.

## Szybki start (krok po kroku)

1. Utwórz swój plik `servers.csv` (np. na podstawie `1-ssh-ping-collector/servers.example.csv`):
   ```csv
   kraj,centrum danych,IP,uzytkownik linux
   PL,OVH,1.2.3.4,root
   USA,Hetzner,2.3.4.5,ubuntu
   ```
2. Wygeneruj macierz pingów między serwerami i od razu zaktualizuj listę w narzędziu gracza oraz dane strony WWW:
   ```bash
   python 1-ssh-ping-collector/collect_pings.py \
     --csv servers.csv \
     --out 3-web-viewer/data/server-pings.json \
     --sync-player-dir 2-player-ping-tool
   ```
3. Udostępnij graczom stronę `3-web-viewer/` (np. na GitHub Pages / Nginx / Apache) oraz plik `2-player-ping-tool/ping-servers.bat` (lub `ping-servers.php` + `servers.txt`).
4. Gracz uruchamia `ping-servers.bat`, klika **Wklej ze schowka** na stronie i od razu widzi, przez które proxy zyskuje/traci ile milisekund.
