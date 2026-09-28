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
- `js/config.js` – legt die Einstellungen aus dem Admin-Bereich über die Standardwerte aus `data.js`

## Seiten
Start · Marktplatz (Filter/Sortierung) · Artikel (Galerie, Preisvorschlag) · Tauschbörse (Größen-Matching) · Tausch vorschlagen (Aufpreis-Rechner) · Verkaufen (5-Schritt-Wizard) · Warenkorb · Kasse · Bestätigung · Wishlist · Konto (Übersicht, Inserate, Tausch, Bestellungen, Nachrichten, Einstellungen) · Nachrichten/Chat · Verkäuferprofil · So geht's · Gebühren (Rechner) · FAQ · Größenrechner · Rechtliches · Admin (`#/admin`)

## Erlösmodell (in `FEES` anpassbar)
| Quelle | Wert |
|---|---|
| Verkäuferprovision | 5 %, min. 1,00 € (nur bei Verkauf) |
| Käuferschutz | 5 % + 0,70 € |
| Tauschgebühr | 2,49 € pro Person |

Warenkorb, Wishlist und eigene Inserate werden nur zu Demozwecken im `localStorage` gehalten.

## Bildnachweise
Kategorie-Fotos in `img/cat/` von [Unsplash](https://unsplash.com/license) (kostenlos, auch kommerziell nutzbar, Nennung freiwillig). Fotograf:innen und Links stehen in `img/cat/CREDITS.json`.

## Admin-Bereich
Unter `#/admin` (Link im Footer): Gebühren, Versandpreise, Plattformregeln (max. km, Lebensdauer), Kategorien umbenennen/deaktivieren, Inserate ausblenden und Preise ändern, Nutzer sperren, Texte und Kennzahlen der Startseite, Startdatum/Ziel/Aktion der Warteliste. In der Demo werden Änderungen im `localStorage` des Browsers gespeichert und gelten sofort für Marktplatz und Warteliste. Im echten Betrieb: Admin-Login und Server-API.
