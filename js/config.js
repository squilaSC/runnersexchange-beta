/* Admin-Einstellungen: werden im Admin-Bereich gespeichert und beim Laden über die Standardwerte gelegt.
   Demo: Speicherung im Browser (localStorage). Später: GET/PUT /admin/config im Backend. */
const ADMIN_KEY = "rx_admin";
const ALL_LISTINGS = LISTINGS.slice();          // inkl. ausgeblendeter Inserate, für den Admin-Bereich
const ALL_CATEGORIES = CATEGORIES.slice();
const DEFAULTS = JSON.parse(JSON.stringify({ FEES, MAX_KM, SHOE_LIFE_KM, SITE, listings: Object.fromEntries(LISTINGS.map(l => [l.id, { price: l.price }])) }));

const adminStore = {
  load() { try { return JSON.parse(localStorage.getItem(ADMIN_KEY)) || {}; } catch { return {}; } },
  save(cfg) { try { localStorage.setItem(ADMIN_KEY, JSON.stringify(cfg)); return true; } catch { return false; } },
  reset() { try { localStorage.removeItem(ADMIN_KEY); } catch {} }
};

(function applyAdminConfig() {
  const cfg = adminStore.load();
  const num = v => typeof v === "number" && isFinite(v);
  if (cfg.fees) {
    for (const k of ["buyerProtectionPct", "buyerProtectionFix", "sellerCommissionPct", "sellerCommissionMin", "swapFeePerParty"]) if (num(cfg.fees[k])) FEES[k] = cfg.fees[k];
    for (const k of Object.keys(FEES.shipping)) if (num(cfg.fees.shipping?.[k])) FEES.shipping[k].price = cfg.fees.shipping[k];
  }
  if (num(cfg.rules?.maxKm)) MAX_KM = cfg.rules.maxKm;
  if (num(cfg.rules?.lifeKm)) SHOE_LIFE_KM = cfg.rules.lifeKm;
  if (cfg.site) {
    const s = cfg.site;
    if (Array.isArray(s.typerWords)) { const w = s.typerWords.map(x => String(x).trim()).filter(Boolean); if (w.length) SITE.typerWords = w; }
    if (s.subline) SITE.subline = s.subline;
    if (Array.isArray(s.stats)) SITE.stats = SITE.stats.map((d, i) => [s.stats[i]?.[0] || d[0], s.stats[i]?.[1] || d[1]]);
    for (const k of ["launch", "goal", "promoSellers", "promoMonths"]) if (s[k] !== undefined && s[k] !== "") SITE[k] = s[k];
  }
  // Kategorien umbenennen / deaktivieren
  const cats = cfg.categories || {};
  CATEGORIES.forEach(c => { if (cats[c.id]?.name) c.name = cats[c.id].name; });
  const off = new Set(Object.keys(cats).filter(id => cats[id].enabled === false));
  // Inserate: Preis ändern, ausblenden; Inserate gesperrter Nutzer ausblenden
  const blocked = new Set(Object.keys(cfg.users || {}).filter(u => cfg.users[u].blocked));
  ALL_LISTINGS.forEach(l => { const o = cfg.listings?.[l.id]; if (num(o?.price) && o.price > 0) l.price = o.price; });
  const visible = ALL_LISTINGS.filter(l => !cfg.listings?.[l.id]?.hidden && !blocked.has(l.seller) && !off.has(l.cat));
  LISTINGS.splice(0, LISTINGS.length, ...visible);
  const cv = CATEGORIES.filter(c => !off.has(c.id));
  CATEGORIES.splice(0, CATEGORIES.length, ...cv);
})();
