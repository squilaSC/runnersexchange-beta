/* Dummy-Daten & Geschäftsmodell. Später durch API ersetzen. */

// Gebührenmodell – hier zentral anpassen.
// Verkäufer inseriert kostenlos; Einnahmen kommen aus:
//  1) Käuferschutz (zahlt Käufer): prozentual + Fixbetrag
//  2) Verkaufsprovision (zahlt Verkäufer): kleiner Prozentsatz, mit Mindestbetrag
//  3) Tauschgebühr: Pauschale je Partei inkl. Tausch-Treuhand
const FEES = {
  buyerProtectionPct: 0.05,
  buyerProtectionFix: 0.70,
  sellerCommissionPct: 0.05,
  sellerCommissionMin: 1.00,
  swapFeePerParty: 2.49,
  shipping: { dhl: { label: "DHL Paket (versichert)", price: 5.49 }, hermes: { label: "Hermes S", price: 4.50 }, pickup: { label: "Persönliche Übergabe", price: 0 } }
};

const CATEGORIES = [
  { id: "laufschuhe", name: "Laufschuhe", icon: "👟" },
  { id: "trail", name: "Trailschuhe", icon: "⛰️" },
  { id: "spikes", name: "Spikes", icon: "⚡" },
  { id: "rad", name: "Radschuhe", icon: "🚴" },
  { id: "bekleidung", name: "Bekleidung", icon: "👕" },
  { id: "zubehoer", name: "Zubehör", icon: "⌚" }
];

const CONDITIONS = {
  neu: { label: "Neu mit Etikett", wear: 0 },
  anprobiert: { label: "Nur anprobiert", wear: 3 },
  einmal: { label: "1× getragen", wear: 8 },
  wenig: { label: "Wenig getragen (≤50 km)", wear: 20 }
};

// Plattformregel: Schuhe nur bis max. 50 km Laufleistung
let MAX_KM = 50;
// Geschätzte Lebensdauer eines Laufschuhs, nur für die Anzeige der Restlaufleistung
let SHOE_LIFE_KM = 600;

// Texte & Kennzahlen, die im Admin-Bereich änderbar sind
const SITE = {
  typerWords: ["Tausch ihn.", "Verkauf ihn.", "Gib ihn weiter."],
  subline: "Bloß nicht wegwerfen.",
  stats: [["12.480", "Paar gewechselt"], ["Ø 46 %", "unter Neupreis"], ["4,9 ★", "Bewertung"]],
  launch: "2027-03-15T10:00",
  goal: 1000,
  promoSellers: 500,
  promoMonths: 3
};
// Pflichtangabe bei Schuhen: wet = true (nass/Regen getragen) | false (nur trocken)
// Icons im Linienstil der Kategorie-Icons, Farbe über currentColor
const WET_SVG = body => `<svg class="wet-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const WET = {
  false: { label: "Nur trocken getragen", short: "Nur trocken", icon: WET_SVG('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>') },
  true: { label: "Nass / im Regen getragen", short: "Nass getragen", icon: WET_SVG('<path d="M12 3c3.3 4.2 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.7-6.8 6-11z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>') }
};

const SELLERS = {
  u1: { name: "Lena R.", city: "Mainz", rating: 4.9, reviews: 38, color: "#2255ff", since: 2024, sport: "Marathon" },
  u2: { name: "Tobias K.", city: "Frankfurt", rating: 4.8, reviews: 12, color: "#12a150", since: 2025, sport: "Trailrunning" },
  u3: { name: "Aylin S.", city: "Wiesbaden", rating: 5.0, reviews: 64, color: "#b43cd6", since: 2023, sport: "Triathlon" },
  u4: { name: "Marco P.", city: "Köln", rating: 4.6, reviews: 7, color: "#e0a100", since: 2026, sport: "Mittelstrecke" },
  u5: { name: "Jana W.", city: "Darmstadt", rating: 4.9, reviews: 21, color: "#e8412c", since: 2025, sport: "Halbmarathon" },
  u6: { name: "Felix B.", city: "Mannheim", rating: 4.7, reviews: 15, color: "#0f8a8a", since: 2024, sport: "Radsport" }
};

// kind: "sale" | "swap" | "both"
const LISTINGS = [
  { id: 1, photo: "img/listings/1.jpg", cat: "laufschuhe", brand: "Nike", model: "Vaporfly 3", size: 43, gender: "Herren", price: 169, retail: 259, cond: "einmal", kind: "both", seller: "u1", colors: ["#f5f5f5", "#ff5a1f"], km: 12, wet: false, wantSizes: [44, 44.5], drop: 8, reason: "Fällt eine halbe Nummer zu klein aus – beim 10er gemerkt.", days: 1 },
  { id: 2, photo: "img/listings/2.jpg", cat: "laufschuhe", brand: "ASICS", model: "Novablast 5", size: 40, gender: "Damen", price: 89, retail: 150, cond: "anprobiert", kind: "swap", seller: "u5", colors: ["#9ad7ff", "#1b2a4a"], km: 0, wet: false, wantSizes: [41], drop: 8, reason: "Online bestellt, Rücksendefrist verpasst.", days: 2 },
  { id: 3, photo: "img/listings/3.jpg", cat: "trail", brand: "Hoka", model: "Speedgoat 6", size: 44.5, gender: "Herren", price: 99, retail: 155, cond: "wenig", kind: "sale", seller: "u2", colors: ["#2d6a4f", "#ffd166"], km: 38, wet: true, drop: 5, reason: "Zu wenig Platz im Vorfuß für lange Läufe.", days: 3 },
  { id: 4, photo: "img/listings/4.jpg", cat: "spikes", brand: "Adidas", model: "Adizero Avanti TYO", size: 42, gender: "Unisex", price: 95, retail: 180, cond: "einmal", kind: "both", seller: "u4", colors: ["#ffffff", "#00b3a4"], km: 3, wet: false, wantSizes: [42.5, 43], drop: 0, reason: "Disziplin gewechselt.", days: 1 },
  { id: 5, photo: "img/listings/5.jpg", cat: "laufschuhe", brand: "New Balance", model: "Fresh Foam X More v5", size: 38.5, gender: "Damen", price: 110, retail: 190, cond: "neu", kind: "sale", seller: "u3", colors: ["#f2e8dc", "#ff7a5c"], km: 0, wet: false, drop: 6, reason: "Doppelt geschenkt bekommen.", days: 4 },
  { id: 6, photo: "img/listings/6.jpg", cat: "laufschuhe", brand: "Saucony", model: "Endorphin Speed 5", size: 45, gender: "Herren", price: 115, retail: 180, cond: "wenig", kind: "swap", seller: "u1", colors: ["#1f1f1f", "#c6ff00"], km: 25, wet: true, wantSizes: [44], drop: 8, reason: "Zu lang, Ferse rutscht.", days: 5 },
  { id: 7, photo: "img/listings/7.jpg", cat: "trail", brand: "Salomon", model: "S/Lab Genesis", size: 41, gender: "Unisex", price: 135, retail: 200, cond: "anprobiert", kind: "both", seller: "u2", colors: ["#e6e6e6", "#e63946"], km: 0, wet: false, wantSizes: [40, 40.5], drop: 4, reason: "Nur im Wohnzimmer probiert.", days: 6 },
  { id: 8, photo: "img/listings/8.jpg", cat: "rad", brand: "Shimano", model: "RC703", size: 43, gender: "Unisex", price: 139, retail: 250, cond: "einmal", kind: "sale", seller: "u6", colors: ["#111111", "#3a86ff"], km: 0, wet: false, drop: 0, reason: "Falsches Pedalsystem gekauft.", days: 2 },
  { id: 9, photo: "img/listings/9.jpg", cat: "laufschuhe", brand: "New Balance", model: "FuelCell Rebel v5", size: 42.5, gender: "Herren", price: 79, retail: 140, cond: "einmal", kind: "sale", seller: "u4", colors: ["#fdf0d5", "#003049"], km: 7, wet: false, drop: 6, reason: "Zu weich für mich.", days: 8 },
  { id: 10, photo: "img/listings/10.jpg", cat: "laufschuhe", brand: "Puma", model: "Deviate Nitro Elite 3", size: 39, gender: "Damen", price: 129, retail: 230, cond: "anprobiert", kind: "swap", seller: "u5", colors: ["#ff006e", "#fb5607"], km: 0, wet: false, wantSizes: [39.5, 40], drop: 8, reason: "Zu eng im Mittelfuß.", days: 1 },
  { id: 11, photo: "img/listings/11.jpg", cat: "bekleidung", brand: "Tracksmith", model: "Van Cortlandt Singlet", size: "M", gender: "Herren", price: 35, retail: 72, cond: "neu", kind: "sale", seller: "u3", colors: ["#264653", "#e9c46a"], km: 0, drop: 0, reason: "Passt nicht – zu kurz.", days: 9, apparel: true },
  { id: 12, photo: "img/listings/12.jpg", cat: "zubehoer", brand: "COROS", model: "HRM Armband-Pulsmesser", size: "One Size", gender: "Unisex", price: 55, retail: 79, cond: "wenig", kind: "sale", seller: "u1", colors: ["#222222", "#ff5a1f"], km: 0, drop: 0, reason: "Auf Brustgurt umgestiegen.", days: 3, gear: true },
  { id: 13, photo: "img/listings/13.jpg", cat: "trail", brand: "Brooks", model: "Cascadia 18", size: 46, gender: "Herren", price: 69, retail: 150, cond: "wenig", kind: "sale", seller: "u6", colors: ["#6d597a", "#b56576"], km: 42, wet: true, drop: 8, reason: "Eine Nummer zu groß, nach 42 km aufgegeben.", days: 12 },
  { id: 14, photo: "img/listings/14.jpg", cat: "laufschuhe", brand: "Adidas", model: "Adios Pro 4", size: 41, gender: "Unisex", price: 175, retail: 250, cond: "einmal", kind: "both", seller: "u3", colors: ["#e0fbfc", "#ee6c4d"], km: 21, wet: true, wantSizes: [41.5], drop: 6, reason: "Einmal beim Halbmarathon, Zehenbox zu schmal.", days: 2 },
  { id: 15, photo: "img/listings/15.jpg", cat: "spikes", brand: "Nike", model: "Dragonfly 2", size: 44, gender: "Unisex", price: 110, retail: 170, cond: "anprobiert", kind: "sale", seller: "u4", colors: ["#fdfdfd", "#8338ec"], km: 0, wet: false, drop: 0, reason: "Doch Größe 45 gebraucht.", days: 4 },
  { id: 16, photo: "img/listings/16.jpg", cat: "bekleidung", brand: "Nike", model: "Dri-FIT ADV Laufjacke", size: "S", gender: "Damen", price: 49, retail: 120, cond: "einmal", kind: "swap", seller: "u5", colors: ["#90be6d", "#277da1"], km: 0, wantSizes: ["M"], drop: 0, reason: "Zu figurbetont.", days: 7, apparel: true }
];

const ME = { id: "me", name: "Karsten M.", city: "Mainz", rating: 4.9, reviews: 9, since: 2026, color: "#2255ff", balance: 142.30 };

const MY_LISTINGS = [
  { id: 101, brand: "Hoka", model: "Mach 6", size: 44, price: 85, cond: "einmal", wet: false, kind: "both", status: "live", views: 214, favs: 11, colors: ["#fefae0", "#bc6c25"] },
  { id: 102, brand: "ASICS", model: "Metaspeed Sky Paris", size: 44.5, price: 140, cond: "anprobiert", wet: false, kind: "sale", status: "pending", views: 388, favs: 27, colors: ["#caf0f8", "#0077b6"] },
  { id: 103, brand: "Saucony", model: "Kinvara 15", size: 44, price: 60, cond: "wenig", wet: true, kind: "swap", status: "swap", views: 97, favs: 4, colors: ["#ffb4a2", "#6d6875"] },
  { id: 104, brand: "Nike", model: "Pegasus 41", size: 43.5, price: 70, cond: "einmal", wet: false, kind: "sale", status: "sold", views: 301, favs: 19, colors: ["#e5e5e5", "#14213d"] }
];

const CONVERSATIONS = [
  { id: "c1", with: "u1", listing: 1, unread: 2, msgs: [
    { from: "sys", text: "Tauschanfrage: Deine Hoka Mach 6 (44) ↔ Nike Vaporfly 3 (43)" },
    { from: "u1", text: "Hi! Die Vaporfly sind wirklich nur einmal 12 km gelaufen. Deine Mach 6 in 44 wären perfekt." },
    { from: "me", text: "Klingt gut. Sohle sieht auf den Fotos top aus. Wie sieht's mit dem Zuschuss aus, der Vaporfly ist ja teurer?" },
    { from: "u1", text: "Wie wäre es mit 60 € Aufpreis von dir? Dann starten wir den Treuhand-Tausch." }
  ]},
  { id: "c2", with: "u5", listing: 2, unread: 0, msgs: [
    { from: "me", text: "Hallo Jana, sind die Novablast noch da?" },
    { from: "u5", text: "Ja! Nur anprobiert, Karton ist auch dabei." }
  ]},
  { id: "c3", with: "u2", listing: 3, unread: 0, msgs: [
    { from: "sys", text: "Bestellung #RX-20417 wurde versendet (DHL)." },
    { from: "u2", text: "Paket ist unterwegs – viel Spaß auf den Trails!" }
  ]}
];

const ORDERS = [
  { id: "RX-20417", item: "Hoka Speedgoat 6 · 44.5", date: "24.09.2026", total: 110.64, status: "Unterwegs", colors: ["#2d6a4f", "#ffd166"] },
  { id: "RX-19880", item: "Adidas Adios Pro 3 · 44", date: "02.08.2026", total: 136.84, status: "Abgeschlossen", colors: ["#fff", "#2255ff"] }
];

// Größentabelle (vereinfacht, EU ↔ US Herren ↔ UK ↔ cm)
const SIZE_TABLE = [
  [39, 6.5, 6, 24.5], [40, 7, 6.5, 25], [40.5, 7.5, 6.5, 25.5], [41, 8, 7, 26], [42, 8.5, 7.5, 26.5],
  [42.5, 9, 8, 27], [43, 9.5, 8.5, 27.5], [44, 10, 9, 28], [44.5, 10.5, 9.5, 28.5], [45, 11, 10, 29], [46, 12, 11, 30]
];
