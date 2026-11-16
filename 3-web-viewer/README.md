# 3. Strona WWW — Analizator macierzy proxy (`3-web-viewer`)

Statyczna aplikacja WWW (czysty HTML + CSS + JS, bez backendu i bez buildera), którą można:
- wrzucić na dowolny serwer WWW (Nginx, Apache, GitHub Pages, Cloudflare Pages), **albo**
- otworzyć bezpośrednio lokalnie w przeglądarce (`index.html` przez `file://` — działa dzięki automatycznie generowanemu `data/server-pings.js`).

## Funkcje

1. **Ładowanie macierzy serwer↔serwer**:
   - Automatycznie pobiera `data/server-pings.json` (po HTTP/HTTPS) lub `data/server-pings.js` (lokalnie przez `file://`).
   - Pozwala też wczytać dowolny plik `server-pings.json` przez przycisk **„Wgraj server-pings.json”** w górnym pasku.
2. **Wklejanie wyników gracza**:
   - Akceptuje `my-pings.json` wygenerowany przez `ping-servers.bat` / `ping-servers.php`, wklejony ze schowka lub wgrany z pliku.
   - Obsługuje też proste formaty tekstowe (`1.2.3.4=35`, `1.2.3.4: 35ms`) oraz ręczną edycję pingów per serwer.
3. **Podsumowanie najlepszych proxy**:
   - Pokazuje dla każdego serwera docelowego najlepsze proxy, składowe ścieżki (`Gracz→Proxy + Proxy→Cel`), zysk/stratę w `ms` i `%` oraz alternatywy.
4. **Tabela każdy-do-każdego (`Proxy × Cel`)**:
   - Zamrożone nagłówki (góra i lewo) ułatwiające pracę z dziesiątkami serwerów.
   - Różne tryby wyświetlania komórek (pełny, tylko `+/- ms`, tylko suma, tylko `serwer ↔ serwer`).
   - Filtry wierszy i kolumn, próg opłacalności (`1/5/10/20 ms`), przełącznik metryki (`avg`/`min`), zamiana osi oraz obsługa kierunku odwrotnego gdy brakuje jednego pomiaru.
   - Przełącznik języka `PL / EN`.

## Testy logiki JS

```bash
node test_analyzer.js
```
