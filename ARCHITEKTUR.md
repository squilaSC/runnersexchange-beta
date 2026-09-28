# Backend-Architektur – Runners Exchange

Entwurf für das Backend zum bestehenden Frontend. Ziel: klein anfangen, selbst hosten (k3s + Traefik), später skalieren können.

## 1. Grundentscheidung: modularer Monolith

Ein einziger Backend-Dienst mit klar getrennten Modulen statt Microservices. Bei einem Marktplatz im Start gibt es wenig Last, aber viel Fachlogik (Treuhand, Tausch, Gebühren). Ein Monolith ist einfacher zu betreiben, zu testen und zu debuggen. Die Modulgrenzen sind so gezogen, dass man einzelne Module später herauslösen kann (Kandidaten: Suche, Benachrichtigungen).

**Stack**

| Bereich | Wahl | Begründung |
|---|---|---|
| Sprache/Framework | TypeScript + Fastify | Gleiche Sprache wie das Frontend, schnell, gute Schema-Validierung |
| Datenbank | PostgreSQL 16 | Transaktionen für Geldflüsse, Volltextsuche reicht am Anfang |
| ORM/Migrationen | Drizzle oder Prisma | Typsichere Queries, versionierte Migrationen |
| Jobs & Queue | pg-boss (Queue in Postgres) | Kein zusätzlicher Dienst; später Redis/BullMQ |
| Dateien (Fotos) | S3-kompatibel (MinIO selbst gehostet) | Direkt-Upload per Presigned URL |
| Echtzeit (Chat) | WebSocket (Fastify-Plugin) | Chat und Live-Status von Tausch/Bestellung |
| Suche | Postgres `tsvector` → später Meilisearch | Erst einfach, dann Tippfehler-Toleranz/Facetten |
| Auth | Eigene Sessions (HttpOnly-Cookie) oder Keycloak/Authentik | Magic-Link + Passkeys, kein Passwortzwang |

## 2. Systemübersicht

```mermaid
flowchart LR
  subgraph Client
    FE[Web-Frontend<br/>SPA]
  end

  subgraph k3s["k3s-Cluster"]
    TR[Traefik<br/>Ingress + TLS]
    API[API-Server<br/>Fastify, modularer Monolith]
    WK[Worker<br/>Jobs, Webhooks, Mails]
    PG[(PostgreSQL)]
    S3[(MinIO<br/>Fotos)]
    MS[(Meilisearch<br/>optional, Phase 2)]
  end

  subgraph Extern
    PSP[Zahlungsdienstleister<br/>Stripe Connect / Mangopay]
    SHIP[Versand<br/>DHL-API / Sendcloud]
    MAIL[E-Mail<br/>Postmark / SES]
    PUSH[Web-Push]
  end

  FE -->|HTTPS / WSS| TR --> API
  FE -->|Presigned Upload| S3
  API --> PG
  API --> S3
  API --> MS
  API -->|Jobs| PG
  WK --> PG
  WK --> PSP
  WK --> SHIP
  WK --> MAIL
  WK --> PUSH
  PSP -->|Webhooks| TR
  SHIP -->|Tracking-Webhooks| TR
```

API und Worker sind dasselbe Container-Image, nur mit anderem Startbefehl.

## 3. Module

| Modul | Aufgabe | Frontend-Seiten |
|---|---|---|
| **identity** | Registrierung, Login (Magic-Link/Passkey), Sessions, Profil, Verifizierung (KYC über PSP) | Konto › Einstellungen |
| **catalog** | Inserate anlegen/ändern, Zustand, Größen, Fotos, Moderation | Verkaufen, Artikel, Konto › Inserate |
| **search** | Filter, Sortierung, Suchaufträge, Größen-Matching | Marktplatz, Tauschbörse |
| **pricing** | Gebührenberechnung (heute `FEES` in `data.js`) – **einzige Quelle der Wahrheit** | Überall, wo Preise stehen |
| **orders** | Kauf, Preisvorschläge, Treuhand-Status, Reklamation | Kasse, Bestellungen |
| **swaps** | Tauschvorschlag, Gegenangebot, Aufpreis, beidseitige Bestätigung | Tausch vorschlagen, Konto › Tausch |
| **payments** | Anbindung PSP: Zahlung, Treuhand, Auszahlung, Erstattung, Webhooks | Kasse, Auszahlung |
| **shipping** | Versandlabel erzeugen, Tracking, Zustellbestätigung | Versandlabel, Bestellstatus |
| **messaging** | Unterhaltungen, Nachrichten, Systemnachrichten, WebSocket | Nachrichten |
| **reviews** | Bewertungen nach Abschluss, Durchschnittswerte | Verkäuferprofil |
| **notifications** | E-Mail, Push, In-App; ausgelöst durch Domain-Events | Suchauftrag, Match-Hinweise |
| **admin** | Moderation, Streitfälle, Gebührenreport, Sperren | (eigenes Admin-UI, später) |

**Regel:** Module sprechen nur über ihre Service-Schnittstelle oder über Domain-Events miteinander, nie direkt in fremde Tabellen.

## 4. Datenmodell

```mermaid
erDiagram
  USER ||--o{ LISTING : "bietet an"
  USER ||--o{ ORDER : "kauft"
  USER ||--o{ SWAP : "schlägt vor"
  USER ||--o{ REVIEW : "schreibt/erhält"
  USER ||--o{ SAVED_SEARCH : hat
  USER ||--o{ FAVORITE : "Wishlist"
  USER ||--|| WALLET : hat
  LISTING ||--o{ LISTING_PHOTO : hat
  LISTING ||--o{ OFFER : "Preisvorschlag"
  LISTING ||--o| ORDER : "wird verkauft in"
  LISTING ||--o{ SWAP : "angefragt / angeboten"
  ORDER ||--o{ SHIPMENT : hat
  SWAP ||--o{ SHIPMENT : "2 Pakete"
  ORDER ||--o{ LEDGER_ENTRY : bucht
  SWAP ||--o{ LEDGER_ENTRY : bucht
  WALLET ||--o{ LEDGER_ENTRY : enthält
  CONVERSATION ||--o{ MESSAGE : enthält
  CONVERSATION }o--|| LISTING : "bezieht sich auf"
  ORDER ||--o| DISPUTE : "kann haben"

  USER {
    uuid id PK
    text email UK
    text display_name
    text city
    numeric[] my_sizes
    text psp_account_id
    text kyc_status
    timestamptz created_at
  }
  LISTING {
    uuid id PK
    uuid seller_id FK
    text category
    text brand
    text model
    text size
    text gender
    text condition
    int km "CHECK km <= 50"
    bool worn_wet "Pflicht bei Schuhen"
    int price_cents
    int retail_cents
    text kind "sale|swap|both"
    text[] want_sizes
    text status "draft|live|reserved|sold|swapped|removed"
    timestamptz boosted_until
    tsvector search
  }
  ORDER {
    uuid id PK
    uuid listing_id FK
    uuid buyer_id FK
    int price_cents
    int buyer_fee_cents
    int seller_fee_cents
    int shipping_cents
    text status
    text psp_payment_id
  }
  SWAP {
    uuid id PK
    uuid requested_listing_id FK
    uuid offered_listing_id FK
    uuid proposer_id FK
    int topup_cents "positiv = Vorschlagender zahlt"
    text status
  }
  LEDGER_ENTRY {
    uuid id PK
    uuid wallet_id FK
    text ref_type
    uuid ref_id
    int amount_cents
    text kind "sale|fee|topup|refund|payout"
  }
```

Wichtig:
- **Geld immer als Integer in Cent**, nie als Float.
- **Plattformregeln in der Datenbank absichern:** `CHECK (km <= 50)` und `worn_wet NOT NULL` für Schuh-Kategorien, nicht nur im Frontend prüfen.
- **Gebühren werden bei Bestellung eingefroren** (`buyer_fee_cents`, `seller_fee_cents`). Spätere Änderungen an `FEES` betreffen alte Bestellungen nicht.
- **Ledger (Buchungsjournal)**: Jede Geldbewegung ist eine unveränderliche Zeile. Das Guthaben ist die Summe der Zeilen. So bleibt alles nachvollziehbar, auch für Steuer und DAC7.

## 5. Kernabläufe als Zustandsmaschinen

### Kauf mit Käuferschutz

```mermaid
stateDiagram-v2
  [*] --> pending_payment: Käufer bestellt
  pending_payment --> paid: PSP-Webhook "succeeded"
  pending_payment --> cancelled: Timeout 30 min
  paid --> shipped: Label gescannt (Tracking)
  paid --> refunded: Nicht versendet in 3 Werktagen
  shipped --> delivered: Zustellung laut Tracking
  delivered --> completed: Käufer bestätigt ODER 48 h ohne Meldung
  delivered --> disputed: Käufer meldet Problem
  disputed --> completed: Entscheidung pro Verkäufer
  disputed --> refunded: Entscheidung pro Käufer
  completed --> [*]: Auszahlung an Verkäufer, Provision gebucht
  refunded --> [*]
```

Das Inserat wird bei `pending_payment` **reserviert**, damit es nicht doppelt verkauft wird (Row-Lock / `UPDATE … WHERE status='live'`).

### Tausch mit Treuhand

```mermaid
stateDiagram-v2
  [*] --> proposed
  proposed --> countered: Partner macht Gegenangebot
  countered --> proposed: Vorschlagender passt an
  proposed --> declined
  proposed --> accepted: Partner nimmt an
  accepted --> funded: Beide zahlen Tauschgebühr (+ Aufpreis in Treuhand)
  accepted --> expired: Nicht bezahlt in 24 h
  funded --> in_transit: Beide Labels erzeugt
  in_transit --> both_delivered
  both_delivered --> completed: Beide bestätigen / 48 h
  both_delivered --> disputed
  completed --> [*]: Aufpreis ausgezahlt
```

Beide Inserate sind ab `accepted` reserviert.

## 6. API-Entwurf (REST, JSON)

```
POST   /auth/magic-link              GET  /me              PATCH /me
GET    /listings?q=&cat=&size=&cond=&kind=&max=&sort=&cursor=
GET    /listings/:id                 POST /listings        PATCH /listings/:id
POST   /listings/:id/photos/upload-url                     POST  /listings/:id/boost
POST   /listings/:id/offers          POST /offers/:id/accept|decline
GET    /matches                      (Tausch-Matches zu my_sizes)
POST   /swaps                        POST /swaps/:id/accept|decline|counter|confirm
POST   /orders                       (→ liefert PSP-Client-Secret)
POST   /orders/:id/confirm-receipt   POST /orders/:id/dispute
GET    /orders?role=buyer|seller     GET  /shipments/:id/label
GET    /conversations                GET  /conversations/:id/messages
WS     /ws                           (Chat, Statusänderungen)
GET    /favorites  PUT/DELETE /favorites/:listingId
GET    /saved-searches  POST /saved-searches
GET    /wallet     POST /wallet/payout
GET    /fees/quote?price=            (Frontend holt Gebühren vom Server)
POST   /webhooks/psp                 POST /webhooks/shipping
```

- Eingaben/Ausgaben per JSON-Schema (TypeBox) validiert. Daraus wird eine OpenAPI-Datei generiert, aus der wiederum der Frontend-Client erzeugt wird.
- Paginierung per Cursor, nicht per Offset.
- Schreibende Zahlungsaufrufe mit `Idempotency-Key`-Header.

## 7. Zahlungen: der kritischste Teil

**Das Geld darf nicht auf dem eigenen Konto zwischengeparkt werden.** Wer fremdes Geld treuhänderisch hält und weiterleitet, braucht in Deutschland eine BaFin-Erlaubnis (ZAG). Lösung: Ein **Marktplatz-Zahlungsdienstleister** übernimmt Treuhand, KYC der Verkäufer und Auszahlung:

| Anbieter | Pro | Contra |
|---|---|---|
| **Stripe Connect** (Express-Konten) | Beste Doku, schnell integriert, `application_fee` = Provision | Gebühren etwas höher |
| **Mangopay** | Speziell für Marktplätze/Treuhand, in EU verbreitet (Vinted-ähnlich) | Aufwendigere Integration |
| Adyen for Platforms | Sehr mächtig | Erst ab größerem Volumen sinnvoll |

Empfehlung für den Start: **Stripe Connect** mit „separate charges and transfers“: Käufer zahlt an die Plattform, nach `completed` wird per Transfer an den Verkäufer ausgezahlt, die Provision bleibt einfach übrig.

Geldfluss bei einem Schuh für 100 €:

```
Käufer zahlt 111,19 €  = 100,00 Artikel + 5,70 Käuferschutz + 5,49 Versand
 ├─ an Verkäufer:  95,00 €   (100 − 5 % Provision)
 ├─ an Versand:     5,49 €   (Label-Kosten)
 └─ Plattform:     10,70 €   brutto, abzgl. PSP-Gebühren (~1,5 % + 0,25 €) ≈ 9,00 € netto
```

## 8. Querschnittsthemen

**Sicherheit**
- Sessions als HttpOnly/SameSite-Cookie, CSRF-Schutz, Rate-Limit (Login, Nachrichten, Angebote)
- Webhooks nur mit Signaturprüfung; jede Webhook-ID nur einmal verarbeiten
- Foto-Upload: nur Presigned URLs, Größen- und Typprüfung, EXIF-Daten entfernen (GPS!)
- Chat: Filter gegen „zahl doch per PayPal Freunde“ (Betrugsprävention)

**Recht & Compliance**
- **DAC7 / PStTG**: Plattformen müssen Verkäufer ab 30 Verkäufen oder 2.000 € im Jahr ans BZSt melden → Steuer-ID beim Onboarding abfragen, Jahresreport aus dem Ledger
- **DSGVO**: Datenexport und Löschung pro Nutzer, Auftragsverarbeitungsverträge mit PSP, Mail- und Versanddienst
- **DSA** (Digital Services Act): Meldeweg für illegale Inhalte, Begründung bei Sperrungen
- Impressum und AGB mit Plattformregeln (u. a. „max. 50 km“, Pflichtangabe „nass getragen“, kein Handel außerhalb der Plattform)

**Betrieb**
- Logs strukturiert (pino) → Loki; Metriken → Prometheus/Grafana; Fehler → Sentry/GlitchTip
- Tägliche Postgres-Backups (pgBackRest oder CloudNativePG), Wiederherstellung regelmäßig testen
- Health-Endpoints `/healthz` und `/readyz` für k3s-Probes

## 9. Deployment auf k3s

```mermaid
flowchart TB
  subgraph ns["Namespace: runners-exchange"]
    ING[IngressRoute Traefik<br/>runners.example.de<br/>api.runners.example.de]
    FEP[Deployment: frontend<br/>nginx, statische Dateien]
    APID[Deployment: api ×2]
    WKD[Deployment: worker ×1]
    CNPG[(CloudNativePG<br/>Postgres-Cluster)]
    MIO[(MinIO)]
    SEC[Secrets<br/>PSP-Keys, DB, Mail]
  end
  ING --> FEP
  ING --> APID
  APID --> CNPG
  WKD --> CNPG
  APID --> MIO
  SEC -.-> APID
  SEC -.-> WKD
```

- TLS über Traefik + cert-manager / Let's Encrypt
- Secrets per SOPS oder Sealed Secrets im Git
- CI: Tests → Image bauen → Migrationen als Job vor dem Rollout → Rollout
- Die PSP-Webhooks brauchen eine öffentlich erreichbare URL. Falls der Cluster zu Hause läuft: Cloudflare Tunnel o. Ä.

## 10. Projektstruktur

```
backend/
  src/
    modules/
      identity/   catalog/   search/   pricing/   orders/
      swaps/      payments/  shipping/ messaging/ reviews/
      notifications/  admin/
        ├─ routes.ts      (HTTP)
        ├─ service.ts     (Fachlogik)
        ├─ repo.ts        (DB-Zugriff)
        ├─ events.ts      (Domain-Events)
        └─ *.test.ts
    shared/   (db, auth, errors, money, event-bus)
    server.ts   worker.ts
  migrations/
  openapi.json
```

## 11. Umsetzungsreihenfolge

| Phase | Inhalt | Ergebnis |
|---|---|---|
| **1 – MVP Kaufen** | identity, catalog, pricing, einfache Suche, orders, Stripe Connect, manuelle Versandnummer, E-Mail | Man kann echt kaufen und verkaufen |
| **2 – Vertrauen** | Versandlabel-API + Tracking, Bewertungen, Chat, Reklamation, Admin-Moderation | Käuferschutz läuft automatisch |
| **3 – Tausch** | swaps inkl. Treuhand-Aufpreis, Größen-Matching, Suchaufträge, Push | Alleinstellungsmerkmal live |
| **4 – Wachstum** | Meilisearch, Boost, DAC7-Report, Auswertungen, ggf. App | Skalierung und zusätzliche Einnahmen |

Tauschen erst in Phase 3, weil es die komplexeste Geldlogik hat (zwei Pakete, zwei Zahlungen, Aufpreis) und auf allen Bausteinen aus Phase 1 und 2 aufsetzt.
