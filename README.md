# Runners Exchange (Arbeitstitel)

Börse für kaum getragene Sportschuhe: kaufen, verkaufen, tauschen. Das hier ist nur das Frontend, alle Daten sind Dummy-Daten.

## Starten
`index.html` im Browser öffnen, oder:
```
python -m http.server 8080   # → http://localhost:8080
```

## Struktur
- `index.html` – Grundgerüst (Header, Footer)
- `css/styles.css` – komplettes Styling, responsiv
- `js/data.js` – **Gebührenmodell (`FEES`)** und alle Dummy-Daten → später durch API ersetzen
- `js/app.js` – SPA mit Hash-Routing, alle Seiten

## Seiten
Start · Marktplatz (Filter/Sortierung) · Artikel (Galerie, Preisvorschlag) · Tauschbörse (Größen-Matching) · Tausch vorschlagen (Aufpreis-Rechner) · Verkaufen (5-Schritt-Wizard) · Warenkorb · Kasse · Bestätigung · Merkliste · Konto (Übersicht, Inserate, Tausch, Bestellungen, Nachrichten, Einstellungen) · Nachrichten/Chat · Verkäuferprofil · So geht's · Gebühren (Rechner) · FAQ · Größenrechner · Rechtliches

## Erlösmodell (in `FEES` anpassbar)
| Quelle | Wert |
|---|---|
| Verkäuferprovision | 5 %, min. 1,00 € (nur bei Verkauf) |
| Käuferschutz | 5 % + 0,70 € |
| Tauschgebühr | 2,49 € pro Person |
| Boost | 1,99 € / 7 Tage |

Warenkorb, Merkliste und eigene Inserate werden nur zu Demozwecken im `localStorage` gehalten.

## Bildnachweise
Kategorie-Fotos in `img/cat/` von [Unsplash](https://unsplash.com/license) (kostenlos, auch kommerziell nutzbar, Nennung freiwillig). Fotograf:innen und Links stehen in `img/cat/CREDITS.json`.
