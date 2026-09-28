/* Runners Exchange – Frontend-SPA mit Hash-Routing (keine Abhängigkeiten) */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const app = $("#app");
  const eur = n => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const byId = id => LISTINGS.find(l => l.id === +id);
  const isShoe = l => !l.apparel && !l.gear && l.cat !== "bekleidung" && l.cat !== "zubehoer";
  const wetPill = l => isShoe(l) && typeof l.wet === "boolean" ? `<span class="pill ${l.wet ? "pill-wet" : "pill-dry"}">${WET[l.wet].icon} ${WET[l.wet].short}</span>` : "";
  const sizeLabel = s => typeof s === "number" ? `EU ${String(s).replace(".", ",")}` : s;

  /* ---------- Persistenter Zustand (nur Komfort, Demo) ---------- */
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem("rx_" + k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("rx_" + k, JSON.stringify(v)); } catch {} }
  };
  const state = {
    cart: store.get("cart", []),
    favs: store.get("favs", [3, 14]),
    mySizes: store.get("mySizes", [43, 44]),
    myListings: store.get("myListings", MY_LISTINGS),
    swapOffers: store.get("swapOffers", []),
    lastOrder: null
  };
  const save = () => { ["cart", "favs", "mySizes", "myListings", "swapOffers"].forEach(k => store.set(k, state[k])); updateBadges(); };

  function updateBadges() {
    const c = $("#cartCount"), f = $("#favCount");
    c.textContent = state.cart.length || ""; f.textContent = state.favs.length || "";
  }
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600);
  }

  /* ---------- Gebühren ---------- */
  const round = n => Math.round(n * 100) / 100;
  const buyerFee = p => round(p * FEES.buyerProtectionPct + FEES.buyerProtectionFix);
  const sellerFee = p => round(Math.max(p * FEES.sellerCommissionPct, FEES.sellerCommissionMin));
  const payout = p => round(p - sellerFee(p));

  /* ---------- Schuh-Illustration (SVG, farbvariabel) ---------- */
  function shoe(l, variant = 0) {
    const [a, b] = l.colors;
    if (l.apparel) return `<svg class="shoe-svg" viewBox="0 0 200 160"><path d="M60 20 L85 12 Q100 24 115 12 L140 20 L170 50 L150 66 L140 56 L140 148 L60 148 L60 56 L50 66 L30 50Z" fill="${a}" stroke="#1a1a1a" stroke-width="3" stroke-linejoin="round"/><path d="M60 100 H140" stroke="${b}" stroke-width="10"/></svg>`;
    if (l.gear) return `<svg class="shoe-svg" viewBox="0 0 200 160"><rect x="20" y="66" width="160" height="28" rx="14" fill="${a}" stroke="#1a1a1a" stroke-width="3"/><rect x="72" y="52" width="56" height="56" rx="14" fill="${b}" stroke="#1a1a1a" stroke-width="3"/><path d="M84 82 h8 l5 -10 l6 20 l5 -10 h8" stroke="#fff" stroke-width="3" fill="none"/></svg>`;
    const flip = variant === 1 ? `transform="translate(200 0) scale(-1 1)"` : "";
    const tilt = variant === 2 ? `transform="rotate(-8 100 80)"` : variant === 3 ? `transform="translate(0 6) scale(1 .92)"` : "";
    const spikes = l.cat === "spikes" ? [40, 62, 84, 106].map(x => `<path d="M${x} 118 l4 10 l4 -10" fill="#333"/>`).join("") : "";
    const cleat = l.cat === "rad" ? `<rect x="92" y="116" width="36" height="8" rx="2" fill="#444"/>` : "";
    const lug = l.cat === "trail" ? [30, 55, 80, 105, 130, 155].map(x => `<rect x="${x}" y="116" width="14" height="7" rx="2" fill="#333"/>`).join("") : "";
    return `<svg class="shoe-svg" viewBox="0 0 200 160" aria-hidden="true"><g ${flip}><g ${tilt}>
      <path d="M18 112 Q16 96 30 92 L78 80 Q92 50 118 44 Q132 42 138 56 L150 78 Q176 84 184 100 Q188 114 176 118 L30 120 Q18 120 18 112Z" fill="${a}" stroke="#1a1a1a" stroke-width="3" stroke-linejoin="round"/>
      <path d="M16 110 Q16 124 34 126 L178 124 Q190 122 188 110 L184 104 Q170 114 30 114Z" fill="${b}" stroke="#1a1a1a" stroke-width="3" stroke-linejoin="round"/>
      <path d="M60 100 Q110 76 150 92" stroke="${b}" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M100 58 l14 12 M108 52 l14 12 M116 48 l12 12" stroke="#1a1a1a" stroke-width="3" stroke-linecap="round"/>
      ${spikes}${cleat}${lug}</g></g></svg>`;
  }
  const bgFor = l => `background:linear-gradient(150deg, ${l.colors[0]}33, ${l.colors[1]}33)`;

  /* ---------- Bausteine ---------- */
  function kindPill(kind) {
    if (kind === "swap") return `<span class="pill pill-blue">⇄ Nur Tausch</span>`;
    if (kind === "both") return `<span class="pill pill-blue">⇄ Tausch möglich</span>`;
    return "";
  }
  function card(l) {
    const off = Math.round((1 - l.price / l.retail) * 100);
    const s = SELLERS[l.seller];
    return `<article class="card">
      <button class="fav ${state.favs.includes(l.id) ? "on" : ""}" data-fav="${l.id}" aria-label="Merken">${state.favs.includes(l.id) ? "♥" : "♡"}</button>
      <a href="#/artikel/${l.id}">
        <div class="card-img" style="${bgFor(l)}">${shoe(l)}
          <div class="card-tags">${wetPill(l)}${l.cond === "neu" || l.cond === "anprobiert" ? `<span class="pill pill-green">${CONDITIONS[l.cond].label}</span>` : ""}${kindPill(l.kind)}</div>
        </div>
        <div class="card-body">
          <div class="card-brand">${esc(l.brand)}</div>
          <div class="card-title">${esc(l.model)}</div>
          <div class="card-meta">${sizeLabel(l.size)} · ${isShoe(l) ? l.km + " km · " : ""}${s.city}</div>
          <div class="card-price"><b>${eur(l.price)}</b><s>${eur(l.retail)}</s><span class="pill pill-accent">−${off}%</span></div>
        </div>
      </a>
    </article>`;
  }
  const cards = list => list.length ? `<div class="cards">${list.map(card).join("")}</div>` : `<div class="empty"><span>🔍</span>Keine Treffer. Filter lockern oder Suchauftrag speichern.</div>`;
  const stars = r => "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));
  const avatar = (s, size = 46) => `<div class="av" style="background:${s.color};width:${size}px;height:${size}px">${s.name.split(" ").map(p => p[0]).join("")}</div>`;

  /* ---------- Seiten ---------- */
  const pages = {};

  pages.home = () => {
    const fresh = [...LISTINGS].sort((a, b) => a.days - b.days).slice(0, 8);
    const swaps = LISTINGS.filter(l => l.kind !== "sale" && typeof l.size === "number").slice(0, 4);
    return `
    <section class="hero wrap"><div class="hero-grid">
      <div>
        <span class="pill pill-accent">Fehlkauf? Kein Problem.</span>
        <h1 style="margin-top:14px">Passt nicht? <em>Tausch ihn.</em><br>Oder verkauf ihn weiter.</h1>
        <p class="lead">Die Börse für kaum getragene Lauf- und Sportschuhe. Einmal gelaufen, nicht mehr zurückzugeben: Hier findet dein Schuh jemanden, dem er passt.</p>
        <form class="searchbar" id="heroSearch"><input type="search" name="q" placeholder="Marke, Modell oder Größe, z. B. „Vaporfly 43“"><button class="btn btn-primary">Suchen</button></form>
        <div class="row"><a class="btn btn-dark" href="#/verkaufen">Schuh inserieren – kostenlos</a><a class="btn" href="#/tausch">Tauschbörse ansehen</a></div>
        <div class="hero-stats"><div><b>12.480</b><span class="muted small">Paar gewechselt</span></div><div><b>Ø 46 %</b><span class="muted small">unter Neupreis</span></div><div><b>4,9 ★</b><span class="muted small">Bewertung</span></div></div>
      </div>
      <div class="hero-art"><img src="img/hero.jpg" alt="Weiß-orangener Laufschuh" width="1100" height="990">
        <div class="hero-chip c1"><span class="muted">Nur 1× getragen</span><b>EU 43 · −45 %</b></div>
        <div class="hero-chip c2"><span class="muted">Tausch gegen Gr. 44</span><b>⇄ Match gefunden</b></div>
      </div>
    </div></section>

    <section class="wrap"><nav class="catbar" aria-label="Kategorien">${CATEGORIES.map(c => `<a class="catbar-item" href="#/markt?cat=${c.id}"><span class="catbar-ico">${CAT_ICONS[c.id]}</span><span class="catbar-name">${c.name}</span></a>`).join("")}<a class="catbar-item catbar-all" href="#/markt"><span class="catbar-ico"><svg class="cat-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><rect x="10" y="10" width="11" height="11" rx="3"/><rect x="27" y="10" width="11" height="11" rx="3"/><rect x="10" y="27" width="11" height="11" rx="3"/><rect x="27" y="27" width="11" height="11" rx="3"/></svg></span><span class="catbar-name">Alle</span></a></nav></section>

    <section class="section wrap">
      <div class="spread"><h2>Frisch eingestellt</h2><a href="#/markt" class="btn btn-sm">Alle ansehen →</a></div>
      ${cards(fresh)}
    </section>

    <section class="wrap"><div class="band">
      <div><span class="pill" style="background:#2a2d33;color:#fff">⇄ Größen-Matching</span>
        <h2 style="margin-top:12px">Du hast 43, brauchst 44? Wir finden den Gegenpart.</h2>
        <p class="muted">Hinterlege deine Größen. Wir zeigen dir automatisch Sportler, die genau deinen Schuh in deiner falschen Größe suchen. Tausch mit Treuhand: Beide Seiten versenden, beide Seiten prüfen, erst dann ist alles abgeschlossen.</p>
        <a href="#/tausch" class="btn btn-primary">Meine Tausch-Matches</a></div>
      <div class="grid" style="grid-template-columns:1fr 1fr">${swaps.map(l => `<a href="#/artikel/${l.id}" style="background:#22252a;border-radius:14px;padding:10px"><div style="${bgFor(l)};border-radius:10px">${shoe(l)}</div><div class="small" style="margin-top:6px"><b>${esc(l.model)}</b><br><span class="muted">${sizeLabel(l.size)} → sucht ${l.wantSizes.map(sizeLabel).join(" / ")}</span></div></a>`).join("")}</div>
    </div></section>

    <section class="section wrap">
      <h2>So funktioniert's</h2>
      <div class="steps">
        <div class="step"><div class="step-num">1</div><h3>Inserieren in 2 Minuten</h3><p class="muted">Fotos, Größe, gelaufene Kilometer. Verkaufen, tauschen oder beides. Einstellen ist kostenlos.</p></div>
        <div class="step"><div class="step-num">2</div><h3>Kaufen mit Käuferschutz</h3><p class="muted">Bezahlt wird über uns. Das Geld geht erst an den Verkäufer, wenn du den Schuh erhalten und geprüft hast.</p></div>
        <div class="step"><div class="step-num">3</div><h3>Laufen statt lagern</h3><p class="muted">Der Schuh kommt an den Fuß, dem er passt. Gut für den Geldbeutel und gut für die Umwelt.</p></div>
      </div>
    </section>

    <section class="wrap"><div class="band band-accent">
      <div><h2>Was hast du im Schrank?</h2><p style="opacity:.9">Ø Verkaufsdauer: 4 Tage. Du zahlst nur ${Math.round(FEES.sellerCommissionPct * 100)} % Provision, wenn dein Schuh tatsächlich verkauft wird.</p></div>
      <div class="row" style="justify-content:flex-end"><a class="btn btn-dark" href="#/verkaufen">Jetzt inserieren</a><a class="btn" href="#/gebuehren">Gebühren ansehen</a></div>
    </div></section>`;
  };

  /* Marktplatz mit Filtern */
  const market = { q: "", cats: [], sizes: [], conds: [], kinds: [], maxPrice: 300, sort: "neu", gender: "", dryOnly: false };
  pages.markt = params => {
    if (params.cat) market.cats = [params.cat];
    if (params.q !== undefined) market.q = params.q;
    const allSizes = [38.5, 39, 40, 41, 42, 42.5, 43, 44, 44.5, 45, 46];
    return `<div class="wrap market">
      <aside class="filters" id="filters">
        <h4>Suche</h4><input type="search" id="fq" value="${esc(market.q)}" placeholder="Marke, Modell …">
        <h4>Angebotsart</h4>
        ${[["sale", "Kaufen"], ["swap", "Tauschen"]].map(([k, n]) => `<label class="check"><input type="checkbox" data-f="kinds" value="${k}" ${market.kinds.includes(k) ? "checked" : ""}> ${n}</label>`).join("")}
        <h4>Kategorie</h4>
        ${CATEGORIES.map(c => `<label class="check"><input type="checkbox" data-f="cats" value="${c.id}" ${market.cats.includes(c.id) ? "checked" : ""}> <span class="ico-inline" data-cat="${c.id}">${CAT_ICONS[c.id]}</span>${c.name}</label>`).join("")}
        <h4>Größe (EU)</h4>
        <div class="sizes">${allSizes.map(s => `<button class="size-btn ${market.sizes.includes(s) ? "on" : ""}" data-size="${s}">${String(s).replace(".", ",")}</button>`).join("")}</div>
        <label class="check small" style="margin-top:8px"><input type="checkbox" id="mySizesBtn"> Nur meine Größen (${state.mySizes.join(", ")})</label>
        <h4>Zustand</h4>
        ${Object.entries(CONDITIONS).map(([k, c]) => `<label class="check"><input type="checkbox" data-f="conds" value="${k}" ${market.conds.includes(k) ? "checked" : ""}> ${c.label}</label>`).join("")}
        <h4>Nässe</h4>
        <label class="check"><input type="checkbox" id="fdry" ${market.dryOnly ? "checked" : ""}> ☀ Nur trocken getragene Schuhe</label>
        <h4>Geschlecht</h4>
        <select id="fg"><option value="">Alle</option>${["Damen", "Herren", "Unisex"].map(g => `<option ${market.gender === g ? "selected" : ""}>${g}</option>`).join("")}</select>
        <h4>Max. Preis: <span id="pv">${eur(market.maxPrice)}</span></h4>
        <input type="range" id="fp" min="20" max="300" step="5" value="${market.maxPrice}">
        <button class="btn btn-sm btn-block" id="reset" style="margin-top:16px">Filter zurücksetzen</button>
      </aside>
      <section>
        <div class="toolbar">
          <div class="toolbar-left"><h2 style="margin:0">Marktplatz</h2><span class="muted" id="count"></span></div>
          <div class="row"><button class="btn btn-sm" id="saveSearch">🔔 Suchauftrag speichern</button>
          <select id="sort" style="width:auto"><option value="neu">Neueste</option><option value="preis-auf">Preis aufsteigend</option><option value="preis-ab">Preis absteigend</option><option value="rabatt">Höchster Rabatt</option><option value="km">Wenigste km</option></select></div>
        </div>
        <div id="results"></div>
      </section>
    </div>`;
  };
  function filterMarket() {
    const q = market.q.toLowerCase().trim();
    let r = LISTINGS.filter(l => {
      const hay = `${l.brand} ${l.model} ${l.size}`.toLowerCase();
      if (q && !q.split(/\s+/).every(t => hay.includes(t.replace(",", ".")))) return false;
      if (market.cats.length && !market.cats.includes(l.cat)) return false;
      if (market.sizes.length && !market.sizes.includes(l.size)) return false;
      if (market.conds.length && !market.conds.includes(l.cond)) return false;
      if (market.dryOnly && isShoe(l) && l.wet !== false) return false;
      if (market.gender && l.gender !== market.gender && l.gender !== "Unisex") return false;
      if (market.kinds.length && !market.kinds.some(k => l.kind === k || l.kind === "both")) return false;
      return l.price <= market.maxPrice;
    });
    const s = { neu: (a, b) => a.days - b.days, "preis-auf": (a, b) => a.price - b.price, "preis-ab": (a, b) => b.price - a.price, rabatt: (a, b) => a.price / a.retail - b.price / b.retail, km: (a, b) => a.km - b.km }[market.sort];
    r.sort(s);
    $("#results").innerHTML = cards(r);
    $("#count").textContent = `${r.length} Angebote`;
  }
  function bindMarket() {
    const f = $("#filters");
    $("#sort").value = market.sort;
    f.addEventListener("change", e => {
      const k = e.target.dataset.f;
      if (k) { const v = e.target.value; market[k] = e.target.checked ? [...market[k], v] : market[k].filter(x => x !== v); }
      if (e.target.id === "fg") market.gender = e.target.value;
      if (e.target.id === "fdry") market.dryOnly = e.target.checked;
      if (e.target.id === "mySizesBtn") { market.sizes = e.target.checked ? [...state.mySizes] : []; $$(".size-btn").forEach(b => b.classList.toggle("on", market.sizes.includes(+b.dataset.size))); }
      filterMarket();
    });
    $("#fq").addEventListener("input", e => { market.q = e.target.value; filterMarket(); });
    $("#fp").addEventListener("input", e => { market.maxPrice = +e.target.value; $("#pv").textContent = eur(market.maxPrice); filterMarket(); });
    $$(".size-btn").forEach(b => b.addEventListener("click", () => {
      const s = +b.dataset.size; b.classList.toggle("on");
      market.sizes = market.sizes.includes(s) ? market.sizes.filter(x => x !== s) : [...market.sizes, s]; filterMarket();
    }));
    $("#sort").addEventListener("change", e => { market.sort = e.target.value; filterMarket(); });
    $("#reset").addEventListener("click", () => { Object.assign(market, { q: "", cats: [], sizes: [], conds: [], kinds: [], maxPrice: 300, gender: "", dryOnly: false }); location.hash = "#/markt"; render(); });
    $("#saveSearch").addEventListener("click", () => toast("Suchauftrag gespeichert – wir benachrichtigen dich bei neuen Treffern."));
    filterMarket();
  }

  /* Artikeldetail */
  pages.artikel = (_, id) => {
    const l = byId(id); if (!l) return pages.notfound();
    const s = SELLERS[l.seller], c = CONDITIONS[l.cond];
    const bf = buyerFee(l.price), ship = FEES.shipping.dhl.price;
    const similar = LISTINGS.filter(x => x.id !== l.id && (x.cat === l.cat || x.size === l.size)).slice(0, 4);
    return `<div class="wrap">
      <div class="crumbs"><a href="#/markt">Marktplatz</a> / <a href="#/markt?cat=${l.cat}">${CATEGORIES.find(c => c.id === l.cat).name}</a> / ${esc(l.brand)} ${esc(l.model)}</div>
      <div class="detail">
        <div>
          <div class="gallery-main" id="gmain" style="${bgFor(l)}">${shoe(l, 0)}</div>
          <div class="thumbs">${[0, 1, 2, 3].map(v => `<div class="thumb ${v === 0 ? "on" : ""}" data-v="${v}" style="${bgFor(l)}">${shoe(l, v)}</div>`).join("")}</div>
          <div class="panel" style="margin-top:18px"><h3>Warum wird verkauft?</h3><p class="muted" style="margin:0">„${esc(l.reason)}“</p></div>
        </div>
        <div>
          <div class="row">${wetPill(l)}${kindPill(l.kind)}<span class="pill pill-green">✓ Sohlenfoto geprüft</span><span class="muted small">vor ${l.days} Tag${l.days > 1 ? "en" : ""}</span></div>
          <div class="card-brand" style="margin-top:14px">${esc(l.brand)}</div>
          <h1 style="font-size:2.2rem">${esc(l.model)}</h1>
          ${l.kind !== "swap" ? `<div class="row"><span class="price-big">${eur(l.price)}</span><s class="muted">${eur(l.retail)} UVP</s><span class="pill pill-accent">−${Math.round((1 - l.price / l.retail) * 100)}%</span></div>
          <div class="muted small">+ ${eur(bf)} Käuferschutz · zzgl. Versand ab ${eur(FEES.shipping.hermes.price)}</div>` : `<div class="notice">Nur Tausch · Richtwert ${eur(l.price)}. Sucht: <b>${l.wantSizes.map(sizeLabel).join(" oder ")}</b></div>`}
          <div class="specs">
            <div><small>Größe</small><b>${sizeLabel(l.size)}</b></div>
            <div><small>Modell für</small><b>${l.gender}</b></div>
            <div><small>Zustand</small><b>${c.label}</b><div class="wear"><i style="width:${100 - c.wear}%"></i></div></div>
            <div><small>Gelaufen</small><b>${l.km} von max. ${MAX_KM} km</b></div>
            ${isShoe(l) ? `<div class="${l.wet ? "spec-wet" : "spec-dry"}"><small>Nässe</small><b>${WET[l.wet].icon} ${WET[l.wet].label}</b></div>` : ""}
            ${typeof l.size === "number" ? `<div><small>Sprengung</small><b>${l.drop} mm</b></div><div><small>Originalkarton</small><b>Ja</b></div>` : ""}
          </div>
          <div class="grid" style="gap:10px">
            ${l.kind !== "swap" ? `<a class="btn btn-primary btn-block" href="#/kasse/${l.id}">Jetzt kaufen · ${eur(l.price + bf + ship)}</a>
            <button class="btn btn-block" data-cart="${l.id}">In den Warenkorb</button>` : ""}
            ${l.kind !== "sale" ? `<a class="btn btn-dark btn-block" href="#/tausch-anbieten/${l.id}">⇄ Tausch vorschlagen</a>` : ""}
            <div class="row"><button class="btn btn-sm" id="offerBtn" ${l.kind === "swap" ? "hidden" : ""}>💬 Preisvorschlag</button><button class="btn btn-sm" data-fav="${l.id}">${state.favs.includes(l.id) ? "♥ Gemerkt" : "♡ Merken"}</button><a class="btn btn-sm" href="#/nachrichten">✉ Frage stellen</a></div>
          </div>
          <div id="offerBox" class="panel hidden" style="margin-top:14px">
            <label class="field"><span>Dein Angebot (min. ${eur(Math.round(l.price * .7))})</span><input type="number" id="offerVal" value="${Math.round(l.price * .85)}"></label>
            <button class="btn btn-primary btn-sm" id="offerSend">Angebot senden</button>
          </div>
          <div class="panel" style="margin-top:18px">
            <div class="seller">${avatar(s)}<div style="flex:1"><b>${s.name}</b><div class="small muted">${stars(s.rating)} ${s.rating.toString().replace(".", ",")} (${s.reviews}) · ${s.city} · ${s.sport}</div></div><a class="btn btn-sm" href="#/verkaeufer/${l.seller}">Profil</a></div>
          </div>
          <div class="notice notice-green" style="margin-top:14px">🛡 <b>Käuferschutz:</b> Dein Geld liegt treuhänderisch bei uns, bis du den Artikel erhalten und bestätigt hast. 48 h Prüfzeit nach Zustellung.</div>
        </div>
      </div>
      ${similar.length ? `<h2>Ähnliche Angebote</h2>${cards(similar)}` : ""}
      <div style="height:40px"></div>
    </div>`;
  };
  function bindArtikel(_, id) {
    const l = byId(id); if (!l) return;
    $$(".thumb").forEach(t => t.addEventListener("click", () => {
      $$(".thumb").forEach(x => x.classList.remove("on")); t.classList.add("on");
      $("#gmain").innerHTML = shoe(l, +t.dataset.v);
    }));
    $("#offerBtn")?.addEventListener("click", () => $("#offerBox").classList.toggle("hidden"));
    $("#offerSend")?.addEventListener("click", () => {
      const v = +$("#offerVal").value;
      if (v < Math.round(l.price * .7)) return toast("Angebot zu niedrig – mindestens 70 % des Preises.");
      $("#offerBox").classList.add("hidden"); toast(`Angebot über ${eur(v)} an ${SELLERS[l.seller].name} gesendet.`);
    });
  }

  /* Tauschbörse */
  pages.tausch = () => {
    const swaps = LISTINGS.filter(l => l.kind !== "sale" && l.wantSizes);
    const matches = swaps.filter(l => l.wantSizes.some(w => state.mySizes.includes(w)) || state.mySizes.includes(l.size));
    return `<div class="wrap section">
      <div class="two-col">
        <div><span class="pill pill-blue">⇄ Tauschbörse</span><h1 style="margin-top:12px">Gleicher Schuh, richtige Größe.</h1>
        <p class="muted" style="font-size:1.1rem">Tausche deinen Fehlkauf gegen ein passendes Paar. Wenn die Schuhe unterschiedlich viel wert sind, gleicht ein Aufpreis die Differenz aus. Beide Pakete laufen über unsere Tausch-Treuhand.</p></div>
        <div class="panel"><h3>Meine Größen</h3><p class="small muted">Danach richten sich deine Matches.</p>
          <div class="sizes" id="mySizes">${[39, 40, 41, 42, 42.5, 43, 44, 44.5, 45, 46].map(s => `<button class="size-btn ${state.mySizes.includes(s) ? "on" : ""}" data-size="${s}">${String(s).replace(".", ",")}</button>`).join("")}</div>
        </div>
      </div>
      <h2 style="margin-top:36px">🎯 Deine Matches <span class="muted" style="font-size:1rem">(${matches.length})</span></h2>
      ${cards(matches)}
      <h2 style="margin-top:36px">Alle Tauschangebote</h2>
      <div class="panel"><div class="list">${swaps.map(l => `<div class="list-item">
        <div class="list-thumb" style="${bgFor(l)}">${shoe(l)}</div>
        <div class="list-main"><b>${esc(l.brand)} ${esc(l.model)}</b><div class="small muted">Hat <b>${sizeLabel(l.size)}</b> → sucht <b>${l.wantSizes.map(sizeLabel).join(" / ")}</b> · ${SELLERS[l.seller].name}, ${SELLERS[l.seller].city}</div></div>
        <a class="btn btn-sm btn-dark" href="#/tausch-anbieten/${l.id}">Tausch vorschlagen</a></div>`).join("")}</div></div>
      <div class="steps" style="margin-top:36px">
        <div class="step"><div class="step-num">1</div><h3>Vorschlagen</h3><p class="muted">Wähle eins deiner Inserate und ggf. einen Aufpreis. Der Partner nimmt an, lehnt ab oder macht ein Gegenangebot.</p></div>
        <div class="step"><div class="step-num">2</div><h3>Beide versenden</h3><p class="muted">Ihr bekommt beide ein Versandlabel. Tauschgebühr: ${eur(FEES.swapFeePerParty)} pro Person, inklusive Treuhand.</p></div>
        <div class="step"><div class="step-num">3</div><h3>Prüfen & freigeben</h3><p class="muted">Erst wenn beide bestätigen, ist der Tausch abgeschlossen. Bei Problemen vermitteln wir.</p></div>
      </div>
    </div>`;
  };
  function bindTausch() {
    $$("#mySizes .size-btn").forEach(b => b.addEventListener("click", () => {
      const s = +b.dataset.size;
      state.mySizes = state.mySizes.includes(s) ? state.mySizes.filter(x => x !== s) : [...state.mySizes, s];
      save(); render();
    }));
  }

  pages["tausch-anbieten"] = (_, id) => {
    const l = byId(id); if (!l) return pages.notfound();
    const mine = state.myListings.filter(m => m.status === "live" || m.status === "swap");
    return `<div class="wrap section"><div class="two-col">
      <div class="panel">
        <h2>Tausch vorschlagen</h2>
        <p class="muted">Du möchtest <b>${esc(l.brand)} ${esc(l.model)}</b> in ${sizeLabel(l.size)} von ${SELLERS[l.seller].name}.</p>
        <h4>Was bietest du an?</h4>
        <div class="choice-grid" id="myChoice">${mine.map((m, i) => `<button class="choice ${i === 0 ? "on" : ""}" data-id="${m.id}" data-price="${m.price}"><div style="${bgFor(m)};border-radius:8px">${shoe(m)}</div><b>${esc(m.model)}</b><span class="small muted">EU ${m.size} · Wert ${eur(m.price)}</span></button>`).join("")}
          <a class="choice" href="#/verkaufen"><b>+ Neues Inserat</b><span class="small muted">Erst einstellen, dann tauschen</span></a></div>
        <h4 style="margin-top:20px">Aufpreis</h4>
        <div class="seg" id="dir"><button class="on" data-d="1">Ich zahle drauf</button><button data-d="-1">Ich bekomme Aufpreis</button></div>
        <label class="field" style="margin-top:10px"><span>Betrag</span><input type="number" id="topup" min="0" step="5" value="0"></label>
        <label class="field"><span>Nachricht</span><textarea id="swapMsg" rows="3" placeholder="z. B. Meine sind nur 1× gelaufen, Karton vorhanden."></textarea></label>
        <button class="btn btn-primary" id="sendSwap">Tauschvorschlag senden</button>
      </div>
      <div class="sticky"><div class="panel">
        <div style="${bgFor(l)};border-radius:12px">${shoe(l)}</div>
        <h3 style="margin-top:12px">${esc(l.model)} · ${sizeLabel(l.size)}</h3>
        <table class="breakdown" id="swapCalc"></table>
        <p class="small muted" style="margin-top:10px">Der Aufpreis wird treuhänderisch verwahrt und erst nach beidseitiger Bestätigung ausgezahlt.</p>
      </div></div>
    </div></div>`;
  };
  function bindTauschAnbieten(_, id) {
    const l = byId(id); if (!l) return;
    let dir = 1;
    const calc = () => {
      const t = Math.max(0, +$("#topup").value || 0) * dir;
      const pay = FEES.swapFeePerParty + FEES.shipping.dhl.price + Math.max(t, 0);
      $("#swapCalc").innerHTML = `
        <tr><td>Richtwert Partner-Schuh</td><td>${eur(l.price)}</td></tr>
        <tr><td>${t >= 0 ? "Dein Aufpreis" : "Aufpreis an dich"}</td><td>${t >= 0 ? "" : "+"}${eur(Math.abs(t))}</td></tr>
        <tr class="fee"><td>Tauschgebühr inkl. Treuhand</td><td>${eur(FEES.swapFeePerParty)}</td></tr>
        <tr class="fee"><td>Versandlabel</td><td>${eur(FEES.shipping.dhl.price)}</td></tr>
        <tr class="total"><td>Du zahlst</td><td>${eur(pay)}</td></tr>`;
    };
    $$("#myChoice .choice[data-id]").forEach(c => c.addEventListener("click", () => {
      $$("#myChoice .choice").forEach(x => x.classList.remove("on")); c.classList.add("on");
      const diff = l.price - +c.dataset.price; dir = diff >= 0 ? 1 : -1;
      $$("#dir button").forEach(b => b.classList.toggle("on", +b.dataset.d === dir));
      $("#topup").value = Math.abs(Math.round(diff / 5) * 5); calc();
    }));
    $$("#dir button").forEach(b => b.addEventListener("click", () => { dir = +b.dataset.d; $$("#dir button").forEach(x => x.classList.toggle("on", x === b)); calc(); }));
    $("#topup").addEventListener("input", calc);
    $("#sendSwap").addEventListener("click", () => {
      const mineId = +$("#myChoice .choice.on")?.dataset.id;
      state.swapOffers.push({ to: l.id, mine: mineId, topup: (+$("#topup").value || 0) * dir, date: new Date().toLocaleDateString("de-DE") });
      save(); toast("Tauschvorschlag gesendet!"); location.hash = "#/konto/tausch";
    });
    $("#myChoice .choice[data-id]")?.click();
    calc();
  }

  /* Verkaufen – Wizard */
  const draft = { step: 0, cat: "laufschuhe", brand: "", model: "", size: 43, gender: "Herren", cond: "einmal", km: 5, wet: null, reason: "", kind: "both", wantSizes: [], price: 90, retail: 160, photos: 0, boost: false, ship: "dhl" };
  pages.verkaufen = () => {
    const steps = ["Artikel", "Zustand", "Fotos", "Angebot", "Vorschau"];
    const d = draft;
    const body = [
      () => `<h2>Was verkaufst du?</h2>
        <div class="choice-grid">${CATEGORIES.map(c => `<button class="choice ${d.cat === c.id ? "on" : ""}" data-set="cat" data-val="${c.id}"><span class="ico-inline" data-cat="${c.id}">${CAT_ICONS[c.id]}</span><b>${c.name}</b></button>`).join("")}</div>
        <div class="form-grid" style="margin-top:18px">
          <label class="field"><span>Marke</span><input type="text" data-bind="brand" value="${esc(d.brand)}" list="brands" placeholder="z. B. Nike"></label>
          <label class="field"><span>Modell</span><input type="text" data-bind="model" value="${esc(d.model)}" placeholder="z. B. Pegasus 41"></label>
          <label class="field"><span>Größe (EU)</span><select data-bind="size">${[36, 37, 38, 38.5, 39, 40, 40.5, 41, 42, 42.5, 43, 44, 44.5, 45, 46, 47].map(s => `<option ${d.size == s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
          <label class="field"><span>Modell für</span><select data-bind="gender">${["Damen", "Herren", "Unisex"].map(g => `<option ${d.gender === g ? "selected" : ""}>${g}</option>`).join("")}</select></label>
        </div>
        <datalist id="brands">${["Nike", "Adidas", "ASICS", "Hoka", "On", "Saucony", "Brooks", "New Balance", "Puma", "Salomon", "Mizuno"].map(b => `<option>${b}</option>`).join("")}</datalist>`,
      () => `<h2>Wie gut ist er erhalten?</h2>
        <div class="choice-grid">${Object.entries(CONDITIONS).map(([k, c]) => `<button class="choice ${d.cond === k ? "on" : ""}" data-set="cond" data-val="${k}"><b>${c.label}</b></button>`).join("")}</div>
        ${isShoe(d) ? `<label class="field" style="margin-top:18px"><span>Gelaufene Kilometer: <b id="kmv">${d.km} km</b> <span class="muted">(max. ${MAX_KM} km)</span></span><input type="range" min="0" max="${MAX_KM}" data-bind="km" value="${d.km}"></label>
        <p class="small muted" style="margin-top:-8px">Schuhe mit mehr als ${MAX_KM} km können nicht inseriert werden. So bleibt jedes Angebot praktisch neuwertig.</p>
        <h4 style="margin-top:18px">Wurden die Schuhe nass oder im Regen getragen? <span style="color:var(--accent)">*</span></h4>
        <div class="choice-grid">${[false, true].map(w => `<button class="choice ${d.wet === w ? "on" : ""}" data-set="wet" data-val="${w}"><b>${WET[w].icon} ${w ? "Ja, nass / Regen" : "Nein, nur trocken"}</b><span class="small muted">${w ? "Auch einmalig, z. B. Pfützen oder Nieselregen" : "Nie bei Nässe gelaufen"}</span></button>`).join("")}</div>
        <p class="small muted">Pflichtangabe. Käufer sehen sie direkt auf dem Inserat. Falsche Angaben sind ein Reklamationsgrund.</p>` : ""}
        <label class="field"><span>Warum gibst du ihn ab? (schafft Vertrauen)</span><textarea rows="3" data-bind="reason" placeholder="z. B. Fällt eine halbe Nummer klein aus.">${esc(d.reason)}</textarea></label>`,
      () => `<h2>Fotos</h2><p class="muted">Mindestens 3 Fotos: seitlich, von oben und <b>die Sohle</b>. Sohlenfotos erhöhen die Verkaufschance um das Dreifache.</p>
        <div class="upload" id="upload">📷<br><b>Fotos hier ablegen oder klicken</b><br><span class="small">Demo: jeder Klick fügt ein Foto hinzu</span></div>
        <div class="photo-row">${Array.from({ length: d.photos }, (_, i) => `<div style="background:#e9e6df">${["Seite", "Oben", "Sohle", "Ferse", "Karton", "Detail"][i] || "Foto"}</div>`).join("")}</div>`,
      () => `<h2>Wie möchtest du anbieten?</h2>
        <div class="choice-grid">${[["sale", "💶 Verkaufen"], ["swap", "⇄ Nur tauschen"], ["both", "✨ Beides"]].map(([k, n]) => `<button class="choice ${d.kind === k ? "on" : ""}" data-set="kind" data-val="${k}"><b>${n}</b></button>`).join("")}</div>
        <div class="form-grid" style="margin-top:18px">
          <label class="field"><span>${d.kind === "swap" ? "Richtwert" : "Verkaufspreis"} (€)</span><input type="number" data-bind="price" value="${d.price}" min="1"></label>
          <label class="field"><span>Neupreis / UVP (€)</span><input type="number" data-bind="retail" value="${d.retail}"></label>
        </div>
        <div class="notice" id="priceHint"></div>
        ${d.kind !== "sale" ? `<h4 style="margin-top:18px">Gewünschte Größen im Tausch</h4><div class="sizes">${[40, 41, 42, 42.5, 43, 43.5, 44, 44.5, 45, 46].map(s => `<button class="size-btn ${d.wantSizes.includes(s) ? "on" : ""}" data-want="${s}">${String(s).replace(".", ",")}</button>`).join("")}</div>` : ""}
        <h4 style="margin-top:18px">Versand</h4>
        <div class="choice-grid">${Object.entries(FEES.shipping).map(([k, s]) => `<button class="choice ${d.ship === k ? "on" : ""}" data-set="ship" data-val="${k}"><b>${s.label}</b><span class="small muted">${s.price ? eur(s.price) + " (zahlt Käufer)" : "kostenlos"}</span></button>`).join("")}</div>
        <label class="check" style="margin-top:16px"><input type="checkbox" id="boost" ${d.boost ? "checked" : ""}> 🚀 <b>Boost</b>: 7 Tage oben in Suche & Matches (${eur(FEES.boostPrice)})</label>`,
      () => {
        const pv = { ...d, id: 0, colors: ["#e8e8e8", "#ff5a1f"], seller: "me" };
        return `<h2>Vorschau</h2><div class="grid" style="grid-template-columns:240px 1fr;gap:20px;align-items:start">
          <div class="card"><div class="card-img" style="${bgFor(pv)}">${shoe(pv)}<div class="card-tags">${wetPill(pv)}</div></div><div class="card-body"><div class="card-brand">${esc(d.brand || "Marke")}</div><div class="card-title">${esc(d.model || "Modell")}</div><div class="card-meta">EU ${d.size} · ${CONDITIONS[d.cond].label}${isShoe(d) ? " · " + d.km + " km" : ""}</div><div class="card-price"><b>${eur(+d.price)}</b></div></div></div>
          <div><table class="breakdown">
            <tr><td>Verkaufspreis</td><td>${eur(+d.price)}</td></tr>
            <tr class="fee"><td>Provision (${Math.round(FEES.sellerCommissionPct * 100)} %, min. ${eur(FEES.sellerCommissionMin)}) – nur bei Verkauf</td><td>−${eur(sellerFee(+d.price))}</td></tr>
            ${d.boost ? `<tr class="fee"><td>Boost (einmalig)</td><td>−${eur(FEES.boostPrice)}</td></tr>` : ""}
            <tr class="total"><td>Deine Auszahlung</td><td>${eur(payout(+d.price) - (d.boost ? FEES.boostPrice : 0))}</td></tr>
          </table>
          <p class="small muted" style="margin-top:12px">Käuferschutz (${eur(buyerFee(+d.price))}) und Versand zahlt der Käufer. Einstellen ist kostenlos.</p>
          <label class="check small"><input type="checkbox" id="agb"> Ich bestätige, dass die Angaben stimmen und akzeptiere die AGB.</label></div></div>`;
      }
    ][d.step]();
    return `<div class="wrap section" style="max-width:860px">
      <div class="wizard-steps">${steps.map((s, i) => `<span class="${i === d.step ? "on" : i < d.step ? "done" : ""}">${i < d.step ? "✓ " : `${i + 1}. `}${s}</span>`).join("")}</div>
      <div class="panel" id="wiz">${body}
        <div class="spread" style="margin-top:24px"><button class="btn" id="back" ${d.step === 0 ? "disabled" : ""}>← Zurück</button>
        <button class="btn btn-primary" id="next">${d.step === steps.length - 1 ? "Inserat veröffentlichen" : "Weiter →"}</button></div>
      </div></div>`;
  };
  function bindVerkaufen() {
    const d = draft, w = $("#wiz");
    const hint = () => {
      const h = $("#priceHint"); if (!h) return;
      const pct = Math.round(d.price / d.retail * 100);
      h.innerHTML = `Du erhältst <b>${eur(payout(+d.price))}</b> nach Provision. ${pct > 75 ? "Tipp: Bei „" + CONDITIONS[d.cond].label + "“ verkaufen sich Schuhe bei 55–70 % der UVP am schnellsten." : pct < 40 ? "Sehr günstig – das geht bestimmt schnell weg!" : "Guter Preis – im typischen Bereich für diesen Zustand."}`;
    };
    w.addEventListener("click", e => {
      const b = e.target.closest("[data-set]");
      if (b) { const v = b.dataset.val; d[b.dataset.set] = v === "true" ? true : v === "false" ? false : v; render(); return; }
      const ws = e.target.closest("[data-want]");
      if (ws) { const s = +ws.dataset.want; d.wantSizes = d.wantSizes.includes(s) ? d.wantSizes.filter(x => x !== s) : [...d.wantSizes, s]; ws.classList.toggle("on"); }
      if (e.target.closest("#upload")) { d.photos = Math.min(6, d.photos + 1); render(); }
    });
    w.addEventListener("input", e => {
      const k = e.target.dataset.bind; if (!k) return;
      d[k] = ["km", "price", "retail", "size"].includes(k) ? +e.target.value : e.target.value;
      if (k === "km") $("#kmv").textContent = d.km + " km";
      hint();
    });
    $("#boost")?.addEventListener("change", e => d.boost = e.target.checked);
    $("#back").addEventListener("click", () => { d.step--; render(); });
    $("#next").addEventListener("click", () => {
      if (d.step === 0 && (!d.brand || !d.model)) return toast("Bitte Marke und Modell angeben.");
      if (d.step === 1 && isShoe(d) && d.wet === null) return toast("Bitte angeben, ob die Schuhe nass getragen wurden.");
      if (d.step === 1 && isShoe(d) && d.km > MAX_KM) return toast(`Maximal ${MAX_KM} km erlaubt.`);
      if (d.step === 2 && d.photos < 3) return toast("Bitte mindestens 3 Fotos hinzufügen.");
      if (d.step === 4) {
        if (!$("#agb").checked) return toast("Bitte AGB bestätigen.");
        state.myListings.unshift({ id: Date.now(), brand: d.brand, model: d.model, size: d.size, price: +d.price, cond: d.cond, wet: d.wet, kind: d.kind, status: "live", views: 0, favs: 0, colors: ["#e8e8e8", "#ff5a1f"] });
        save(); Object.assign(d, { step: 0, brand: "", model: "", photos: 0, reason: "", boost: false, wet: null, km: 5 });
        toast("🎉 Dein Inserat ist online!"); location.hash = "#/konto/inserate"; return;
      }
      d.step++; render();
    });
    hint();
  }

  /* Warenkorb & Kasse */
  pages.warenkorb = () => {
    const items = state.cart.map(byId).filter(Boolean);
    if (!items.length) return `<div class="wrap section"><div class="empty"><span>🛒</span><h2>Dein Warenkorb ist leer</h2><a class="btn btn-primary" href="#/markt">Zum Marktplatz</a></div></div>`;
    const sub = items.reduce((a, l) => a + l.price, 0), bf = items.reduce((a, l) => a + buyerFee(l.price), 0), ship = items.length * FEES.shipping.dhl.price;
    return `<div class="wrap section"><h1>Warenkorb</h1><div class="two-col">
      <div class="panel"><div class="list">${items.map(l => `<div class="list-item"><div class="list-thumb" style="${bgFor(l)}">${shoe(l)}</div>
        <div class="list-main"><b>${esc(l.brand)} ${esc(l.model)}</b><div class="small muted">${sizeLabel(l.size)} · ${CONDITIONS[l.cond].label} · von ${SELLERS[l.seller].name}</div></div>
        <b>${eur(l.price)}</b><button class="btn btn-sm btn-ghost" data-rm="${l.id}">✕</button></div>`).join("")}</div>
        <p class="small muted" style="margin-top:12px">Artikel verschiedener Verkäufer werden separat versendet.</p></div>
      <div class="panel sticky"><table class="breakdown">
        <tr><td>Artikel (${items.length})</td><td>${eur(sub)}</td></tr>
        <tr class="fee"><td>Käuferschutz</td><td>${eur(bf)}</td></tr>
        <tr class="fee"><td>Versand (DHL)</td><td>${eur(ship)}</td></tr>
        <tr class="total"><td>Gesamt</td><td>${eur(sub + bf + ship)}</td></tr></table>
        <a class="btn btn-primary btn-block" style="margin-top:14px" href="#/kasse/${items.map(i => i.id).join(",")}">Zur Kasse</a></div>
    </div></div>`;
  };

  pages.kasse = (_, ids) => {
    const items = String(ids || "").split(",").map(byId).filter(Boolean);
    if (!items.length) return pages.notfound();
    return `<div class="wrap section"><h1>Kasse</h1><div class="two-col">
      <div>
        <div class="panel"><h3>1. Lieferadresse</h3><div class="form-grid">
          <label class="field"><span>Vorname</span><input type="text" value="Karsten"></label><label class="field"><span>Nachname</span><input type="text" value="Muster"></label>
          <label class="field"><span>Straße & Nr.</span><input type="text" value="Rheinstraße 12"></label><label class="field"><span>PLZ & Ort</span><input type="text" value="55116 Mainz"></label></div></div>
        <div class="panel"><h3>2. Versand</h3><div class="choice-grid" id="shipChoice">${Object.entries(FEES.shipping).map(([k, s], i) => `<button class="choice ${i === 0 ? "on" : ""}" data-ship="${k}"><b>${s.label}</b><span class="small muted">${s.price ? eur(s.price) : "kostenlos"}</span></button>`).join("")}</div></div>
        <div class="panel"><h3>3. Zahlung</h3><div class="choice-grid" id="payChoice">${["PayPal", "Kreditkarte", "Apple Pay", "SEPA-Lastschrift", "Klarna"].map((p, i) => `<button class="choice ${i === 0 ? "on" : ""}"><b>${p}</b></button>`).join("")}</div>
          <p class="small muted" style="margin-top:10px">Demo: Es findet keine echte Zahlung statt.</p></div>
      </div>
      <div class="panel sticky">
        ${items.map(l => `<div class="list-item"><div class="list-thumb" style="${bgFor(l)}">${shoe(l)}</div><div class="list-main"><b>${esc(l.model)}</b><div class="small muted">${sizeLabel(l.size)}</div></div><b>${eur(l.price)}</b></div>`).join("")}
        <table class="breakdown" id="sum" style="margin-top:10px"></table>
        <div class="notice notice-green small" style="margin:12px 0">🛡 Käuferschutz inklusive: Geld zurück, wenn der Artikel nicht wie beschrieben ist.</div>
        <button class="btn btn-primary btn-block" id="pay">Zahlungspflichtig bestellen</button>
      </div></div></div>`;
  };
  function bindKasse(_, ids) {
    const items = String(ids || "").split(",").map(byId).filter(Boolean);
    let ship = "dhl";
    const sum = () => {
      const sub = items.reduce((a, l) => a + l.price, 0), bf = items.reduce((a, l) => a + buyerFee(l.price), 0), sh = FEES.shipping[ship].price * items.length;
      $("#sum").innerHTML = `<tr><td>Zwischensumme</td><td>${eur(sub)}</td></tr><tr class="fee"><td>Käuferschutz (${FEES.buyerProtectionPct * 100} % + ${eur(FEES.buyerProtectionFix)})</td><td>${eur(bf)}</td></tr><tr class="fee"><td>Versand</td><td>${eur(sh)}</td></tr><tr class="total"><td>Gesamt</td><td>${eur(sub + bf + sh)}</td></tr>`;
      return sub + bf + sh;
    };
    $$("#shipChoice .choice").forEach(c => c.addEventListener("click", () => { $$("#shipChoice .choice").forEach(x => x.classList.remove("on")); c.classList.add("on"); ship = c.dataset.ship; sum(); }));
    $$("#payChoice .choice").forEach(c => c.addEventListener("click", () => { $$("#payChoice .choice").forEach(x => x.classList.remove("on")); c.classList.add("on"); }));
    $("#pay").addEventListener("click", () => {
      const btn = $("#pay"); btn.disabled = true; btn.textContent = "Zahlung wird verarbeitet …";
      setTimeout(() => {
        state.lastOrder = { id: "RX-" + (20418 + Math.floor(Math.random() * 900)), items, total: sum() };
        state.cart = state.cart.filter(id => !items.some(i => i.id === id)); save();
        location.hash = "#/bestaetigung";
      }, 900);
    });
    sum();
  }

  pages.bestaetigung = () => {
    const o = state.lastOrder;
    if (!o) return pages.notfound();
    return `<div class="wrap section" style="max-width:640px;text-align:center">
      <div style="font-size:60px">🎉</div><h1>Danke für deine Bestellung!</h1>
      <p class="muted">Bestellnummer <b>${o.id}</b> · ${eur(o.total)}</p>
      <div class="panel" style="text-align:left;margin:24px 0">
        <h3>Wie geht's weiter?</h3>
        <div class="list">
          <div class="list-item">✅ <div class="list-main"><b>Zahlung gesichert</b><div class="small muted">Dein Geld liegt treuhänderisch bei uns.</div></div></div>
          <div class="list-item">📦 <div class="list-main"><b>Verkäufer versendet</b><div class="small muted">Innerhalb von 3 Werktagen, sonst bekommst du automatisch dein Geld zurück.</div></div></div>
          <div class="list-item">🔍 <div class="list-main"><b>48 h prüfen</b><div class="small muted">Passt alles? Dann bestätigen und der Verkäufer wird ausgezahlt.</div></div></div>
        </div>
      </div>
      <div class="row" style="justify-content:center"><a class="btn btn-dark" href="#/konto/bestellungen">Meine Bestellungen</a><a class="btn" href="#/markt">Weiter stöbern</a></div>
    </div>`;
  };

  pages.merkliste = () => `<div class="wrap section"><h1>Merkliste</h1>${state.favs.length ? cards(state.favs.map(byId).filter(Boolean)) : `<div class="empty"><span>♡</span>Noch nichts gemerkt.</div>`}</div>`;

  /* Konto */
  pages.konto = (_, tab = "uebersicht") => {
    const tabs = [["uebersicht", "Übersicht"], ["inserate", "Meine Inserate"], ["tausch", "Tausch"], ["bestellungen", "Bestellungen"], ["nachrichten", "Nachrichten"], ["einstellungen", "Einstellungen"]];
    const ml = state.myListings;
    const statusMap = { live: ["st-live", "Aktiv"], pending: ["st-pending", "Verkauft · Versand offen"], sold: ["st-sold", "Abgeschlossen"], swap: ["st-swap", "Tausch läuft"] };
    const listRow = m => `<div class="list-item"><div class="list-thumb" style="${bgFor(m)}">${shoe(m)}</div>
      <div class="list-main"><b>${esc(m.brand)} ${esc(m.model)}</b> <span class="status ${statusMap[m.status][0]}">${statusMap[m.status][1]}</span>
      <div class="small muted">EU ${m.size} · ${typeof m.wet === "boolean" ? WET[m.wet].icon + " " + WET[m.wet].short + " · " : ""}${eur(m.price)} · 👁 ${m.views} · ♡ ${m.favs}</div></div>
      ${m.status === "live" ? `<button class="btn btn-sm" data-boost="${m.id}">🚀 Boost</button><button class="btn btn-sm btn-ghost" data-del="${m.id}">Löschen</button>` : m.status === "pending" ? `<button class="btn btn-sm btn-primary" data-label>Versandlabel</button>` : ""}</div>`;
    const content = {
      uebersicht: () => `<div class="kpis">
          <div class="kpi"><span class="muted small">Guthaben</span><b>${eur(ME.balance)}</b><a class="small" style="color:var(--accent)" href="#/konto/einstellungen">Auszahlen →</a></div>
          <div class="kpi"><span class="muted small">Aktive Inserate</span><b>${ml.filter(m => m.status === "live").length}</b></div>
          <div class="kpi"><span class="muted small">Verkauft</span><b>${ml.filter(m => m.status === "sold" || m.status === "pending").length}</b></div>
          <div class="kpi"><span class="muted small">Bewertung</span><b>${ME.rating.toString().replace(".", ",")} ★</b></div></div>
        <div class="two-col"><div class="panel"><div class="spread"><h3>Aktuelle Inserate</h3><a class="btn btn-sm" href="#/konto/inserate">Alle</a></div><div class="list">${ml.slice(0, 3).map(listRow).join("")}</div></div>
        <div class="panel"><h3>To-dos</h3><div class="list">
          <div class="list-item">📦<div class="list-main"><b>Metaspeed Sky versenden</b><div class="small muted">Frist: 30.09.2026</div></div></div>
          <div class="list-item">⇄<div class="list-main"><b>Tauschanfrage von Lena R.</b><div class="small muted">Vaporfly 3 ↔ Mach 6</div></div><a class="btn btn-sm" href="#/nachrichten">Öffnen</a></div>
          <div class="list-item">⭐<div class="list-main"><b>Tobias K. bewerten</b><div class="small muted">Speedgoat 6</div></div></div></div></div></div>`,
      inserate: () => `<div class="spread" style="margin-bottom:10px"><h3>Meine Inserate (${ml.length})</h3><a class="btn btn-primary btn-sm" href="#/verkaufen">+ Neues Inserat</a></div><div class="panel"><div class="list">${ml.map(listRow).join("")}</div></div>`,
      tausch: () => `<h3>Gesendete Tauschvorschläge</h3><div class="panel"><div class="list">${state.swapOffers.length ? state.swapOffers.map(o => { const l = byId(o.to), m = ml.find(x => x.id === o.mine); return `<div class="list-item"><div class="list-thumb" style="${bgFor(l)}">${shoe(l)}</div><div class="list-main"><b>${m ? esc(m.model) : "?"} ⇄ ${esc(l.model)}</b><div class="small muted">${o.date} · ${o.topup > 0 ? "Du zahlst " + eur(o.topup) : o.topup < 0 ? "Du erhältst " + eur(-o.topup) : "ohne Aufpreis"}</div></div><span class="status st-pending">Wartet auf Antwort</span></div>`; }).join("") : `<div class="empty"><span>⇄</span>Noch keine Vorschläge. <a href="#/tausch" style="color:var(--accent)">Zur Tauschbörse</a></div>`}</div></div>`,
      bestellungen: () => `<div class="panel"><div class="list">${ORDERS.map(o => `<div class="list-item"><div class="list-thumb" style="${bgFor(o)}">${shoe(o)}</div><div class="list-main"><b>${o.item}</b><div class="small muted">${o.id} · ${o.date} · ${eur(o.total)}</div></div><span class="status ${o.status === "Unterwegs" ? "st-pending" : "st-sold"}">${o.status}</span>${o.status === "Unterwegs" ? `<button class="btn btn-sm btn-primary" data-confirm>Erhalt bestätigen</button>` : ""}</div>`).join("")}</div></div>`,
      nachrichten: () => pages.nachrichten(null, null, true),
      einstellungen: () => `<div class="two-col"><div class="panel"><h3>Profil</h3><div class="form-grid">
          <label class="field"><span>Name</span><input type="text" value="${ME.name}"></label><label class="field"><span>Ort</span><input type="text" value="${ME.city}"></label>
          <label class="field"><span>Hauptsportart</span><select><option>Triathlon</option><option>Laufen</option><option>Trailrunning</option><option>Radsport</option></select></label>
          <label class="field"><span>E-Mail</span><input type="email" value="karsten@example.com"></label></div>
          <h3 style="margin-top:10px">Benachrichtigungen</h3>
          <label class="check"><input type="checkbox" checked> Neue Tausch-Matches in meiner Größe</label>
          <label class="check"><input type="checkbox" checked> Preisvorschläge</label>
          <label class="check"><input type="checkbox"> Newsletter</label>
          <button class="btn btn-primary" style="margin-top:14px" data-savesettings>Speichern</button></div>
        <div class="panel"><h3>Auszahlung</h3><p class="muted">Verfügbares Guthaben: <b>${eur(ME.balance)}</b></p>
          <label class="field"><span>IBAN</span><input type="text" value="DE89 3704 0044 0532 0130 00"></label>
          <button class="btn btn-dark btn-block" data-payout>Guthaben auszahlen</button>
          <p class="small muted" style="margin-top:10px">Auszahlungen sind kostenlos und dauern 1–2 Werktage.</p></div></div>`
    };
    return `<div class="wrap section">
      <div class="seller" style="margin-bottom:20px">${avatar(ME, 60)}<div><h1 style="font-size:1.8rem;margin:0">Hallo, Karsten</h1><span class="muted small">${ME.city} · Mitglied seit ${ME.since} · ${stars(ME.rating)} (${ME.reviews})</span></div></div>
      <nav class="tabs">${tabs.map(([k, n]) => `<a href="#/konto/${k}" class="${k === tab ? "on" : ""}">${n}</a>`).join("")}</nav>
      ${(content[tab] || content.uebersicht)()}</div>`;
  };
  function bindKonto(_, tab) {
    app.addEventListener("click", e => {
      const del = e.target.closest("[data-del]"), boost = e.target.closest("[data-boost]");
      if (del) { state.myListings = state.myListings.filter(m => m.id !== +del.dataset.del); save(); render(); toast("Inserat gelöscht."); }
      if (boost) toast(`Boost für ${eur(FEES.boostPrice)} aktiviert – 7 Tage ganz oben.`);
      if (e.target.closest("[data-label]")) toast("Versandlabel als PDF erstellt (Demo).");
      if (e.target.closest("[data-confirm]")) toast("Danke! Verkäufer wird jetzt ausgezahlt. Bitte bewerten.");
      if (e.target.closest("[data-savesettings]")) toast("Einstellungen gespeichert.");
      if (e.target.closest("[data-payout]")) toast(`${eur(ME.balance)} werden überwiesen.`);
    }, { once: false, signal: pageAbort.signal });
    if (tab === "nachrichten") bindNachrichten();
  }

  /* Nachrichten */
  let activeConv = "c1";
  pages.nachrichten = (_, id, embedded) => {
    if (id) activeConv = id;
    const conv = CONVERSATIONS.find(c => c.id === activeConv);
    const s = SELLERS[conv.with], l = byId(conv.listing);
    const html = `<div class="chat">
      <div class="chat-list">${CONVERSATIONS.map(c => { const p = SELLERS[c.with], last = c.msgs[c.msgs.length - 1]; return `<a href="#/nachrichten/${c.id}" class="${c.id === activeConv ? "on" : ""}">${avatar(p, 38)}<div class="list-main"><b>${p.name}</b>${c.unread && c.id !== activeConv ? ` <span class="pill pill-accent">${c.unread}</span>` : ""}<div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(last.text)}</div></div></a>`; }).join("")}</div>
      <div class="chat-main">
        <div class="chat-head spread"><div class="seller">${avatar(s, 36)}<div><b>${s.name}</b><div class="small muted">zu: <a href="#/artikel/${l.id}" style="text-decoration:underline">${esc(l.model)} · ${sizeLabel(l.size)}</a></div></div></div>
          ${l.kind !== "sale" ? `<button class="btn btn-sm btn-dark" id="acceptSwap">Tausch annehmen</button>` : ""}</div>
        <div class="chat-msgs" id="msgs">${conv.msgs.map(m => `<div class="msg ${m.from === "me" ? "me" : m.from === "sys" ? "sys" : ""}">${esc(m.text)}</div>`).join("")}</div>
        <form class="chat-input" id="chatForm"><input type="text" id="chatText" placeholder="Nachricht schreiben …" autocomplete="off"><button class="btn btn-primary">Senden</button></form>
        <div class="small muted" style="padding:0 12px 10px">🛡 Zahle niemals außerhalb von Runners Exchange – nur so greift der Käuferschutz.</div>
      </div></div>`;
    conv.unread = 0;
    return embedded ? html : `<div class="wrap section"><h1>Nachrichten</h1>${html}</div>`;
  };
  function bindNachrichten() {
    const conv = CONVERSATIONS.find(c => c.id === activeConv);
    const box = $("#msgs"); box.scrollTop = box.scrollHeight;
    $("#chatForm").addEventListener("submit", e => {
      e.preventDefault(); const t = $("#chatText").value.trim(); if (!t) return;
      conv.msgs.push({ from: "me", text: t }); $("#chatText").value = "";
      box.insertAdjacentHTML("beforeend", `<div class="msg me">${esc(t)}</div>`); box.scrollTop = box.scrollHeight;
      setTimeout(() => { const r = "Alles klar, klingt gut! 👍"; conv.msgs.push({ from: conv.with, text: r }); box.insertAdjacentHTML("beforeend", `<div class="msg">${r}</div>`); box.scrollTop = box.scrollHeight; }, 1200);
    });
    $("#acceptSwap")?.addEventListener("click", () => {
      const m = "Tausch angenommen ✓ Beide Versandlabels wurden erstellt. Aufpreis liegt in Treuhand.";
      conv.msgs.push({ from: "sys", text: m }); box.insertAdjacentHTML("beforeend", `<div class="msg sys">${m}</div>`); box.scrollTop = box.scrollHeight;
      $("#acceptSwap").remove();
    });
  }

  /* Verkäuferprofil */
  pages.verkaeufer = (_, id) => {
    const s = SELLERS[id]; if (!s) return pages.notfound();
    const items = LISTINGS.filter(l => l.seller === id);
    const reviews = [["Super schneller Versand, Schuhe exakt wie beschrieben!", 5], ["Tausch hat reibungslos geklappt. Gerne wieder.", 5], ["Gute Kommunikation, Karton leicht eingedrückt.", 4]];
    return `<div class="wrap section">
      <div class="panel"><div class="seller">${avatar(s, 72)}<div style="flex:1"><h1 style="font-size:2rem;margin:0">${s.name}</h1><div class="muted">${stars(s.rating)} ${s.rating.toString().replace(".", ",")} · ${s.reviews} Bewertungen · ${s.city} · ${s.sport} · seit ${s.since}</div></div>
        <div class="row"><span class="pill pill-green">✓ Verifiziert</span><span class="pill">⚡ Antwortet in ~1 h</span></div></div></div>
      <h2 style="margin-top:30px">Angebote (${items.length})</h2>${cards(items)}
      <h2 style="margin-top:30px">Bewertungen</h2>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">${reviews.map(([t, r]) => `<div class="panel" style="margin:0"><div style="color:var(--accent)">${stars(r)}</div><p style="margin:6px 0 0">„${t}“</p></div>`).join("")}</div>
    </div>`;
  };

  /* Infoseiten */
  pages["so-gehts"] = () => `<div class="wrap section" style="max-width:960px">
    <h1>So geht's</h1><p class="muted" style="font-size:1.1rem">Online bestellt, einmal gelaufen, passt nicht, und zurückschicken geht nicht mehr. Genau dafür gibt es Runners Exchange.</p>
    <h2 style="margin-top:30px">Für Verkäufer</h2>
    <div class="steps"><div class="step"><div class="step-num">1</div><h3>Kostenlos inserieren</h3><p class="muted">Fotos inklusive Sohle, Größe, Kilometer, Grund. Du entscheidest: verkaufen, tauschen oder beides.</p></div>
      <div class="step"><div class="step-num">2</div><h3>Versandlabel drucken</h3><p class="muted">Nach dem Verkauf bekommst du ein fertiges Label. Paket zur Packstation, fertig.</p></div>
      <div class="step"><div class="step-num">3</div><h3>Geld erhalten</h3><p class="muted">Sobald der Käufer den Erhalt bestätigt, landet der Betrag abzüglich ${Math.round(FEES.sellerCommissionPct * 100)} % in deinem Guthaben.</p></div></div>
    <h2 style="margin-top:30px">Für Käufer</h2>
    <div class="steps"><div class="step"><div class="step-num">1</div><h3>Finden</h3><p class="muted">Nach Größe, Modell, Kilometerstand filtern. Mit Suchauftrag verpasst du nichts.</p></div>
      <div class="step"><div class="step-num">2</div><h3>Sicher bezahlen</h3><p class="muted">Käuferschutz inklusive. Das Geld wird erst freigegeben, wenn du zufrieden bist.</p></div>
      <div class="step"><div class="step-num">3</div><h3>48 h prüfen</h3><p class="muted">Nicht wie beschrieben? Problem melden, wir klären es oder du bekommst dein Geld zurück.</p></div></div>
    <h2 style="margin-top:30px">Tauschen</h2>
    <p class="muted">Tausch mit Treuhand: Beide Parteien zahlen ${eur(FEES.swapFeePerParty)} und versenden mit unseren Labels. Ein eventueller Aufpreis wird treuhänderisch verwahrt. Erst wenn beide bestätigen, ist der Tausch abgeschlossen.</p>
    <a class="btn btn-primary" href="#/verkaufen">Jetzt starten</a></div>`;

  pages.gebuehren = () => `<div class="wrap section" style="max-width:960px">
    <h1>Faire, transparente Gebühren</h1><p class="muted" style="font-size:1.1rem">Einstellen ist immer kostenlos. Wir verdienen nur, wenn ein Deal zustande kommt.</p>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));margin:24px 0">
      <div class="panel" style="margin:0"><span class="pill">Verkäufer</span><h2 style="margin-top:10px">${Math.round(FEES.sellerCommissionPct * 100)} %</h2><p class="muted">Provision auf den Verkaufspreis, mind. ${eur(FEES.sellerCommissionMin)}. Nur bei Verkauf.</p></div>
      <div class="panel" style="margin:0"><span class="pill">Käufer</span><h2 style="margin-top:10px">${FEES.buyerProtectionPct * 100} % + ${eur(FEES.buyerProtectionFix)}</h2><p class="muted">Käuferschutz inkl. Treuhand, Zahlungsabwicklung und Support.</p></div>
      <div class="panel" style="margin:0"><span class="pill pill-blue">Tausch</span><h2 style="margin-top:10px">${eur(FEES.swapFeePerParty)}</h2><p class="muted">Pro Person, inkl. Tausch-Treuhand. Aufpreise ohne Provision.</p></div>
      <div class="panel" style="margin:0"><span class="pill pill-accent">Optional</span><h2 style="margin-top:10px">${eur(FEES.boostPrice)}</h2><p class="muted">Boost: 7 Tage oben in Suche und Tausch-Matches.</p></div>
    </div>
    <div class="panel"><h2>Rechner</h2>
      <label class="field"><span>Verkaufspreis: <b id="cv">100 €</b></span><input type="range" id="calc" min="10" max="300" step="5" value="100"></label>
      <div class="two-col" style="grid-template-columns:1fr 1fr"><div><h3>Käufer zahlt</h3><table class="breakdown" id="cb"></table></div><div><h3>Verkäufer erhält</h3><table class="breakdown" id="cs"></table></div></div>
    </div></div>`;
  function bindGebuehren() {
    const up = () => {
      const p = +$("#calc").value; $("#cv").textContent = eur(p);
      $("#cb").innerHTML = `<tr><td>Artikel</td><td>${eur(p)}</td></tr><tr class="fee"><td>Käuferschutz</td><td>${eur(buyerFee(p))}</td></tr><tr class="fee"><td>Versand (DHL)</td><td>${eur(FEES.shipping.dhl.price)}</td></tr><tr class="total"><td>Gesamt</td><td>${eur(p + buyerFee(p) + FEES.shipping.dhl.price)}</td></tr>`;
      $("#cs").innerHTML = `<tr><td>Verkaufspreis</td><td>${eur(p)}</td></tr><tr class="fee"><td>Provision</td><td>−${eur(sellerFee(p))}</td></tr><tr class="total"><td>Auszahlung</td><td>${eur(payout(p))}</td></tr>`;
    };
    $("#calc").addEventListener("input", up); up();
  }

  pages.faq = () => {
    const qa = [
      ["Welche Artikel darf ich anbieten?", "Sportschuhe, Spikes, Radschuhe, Sportbekleidung und Zubehör in gutem Zustand. Schuhe dürfen höchstens 50 km gelaufen sein. Außerdem muss bei jedem Paar angegeben werden, ob es nass oder im Regen getragen wurde."],
      ["Warum die Angabe „nass getragen“?", "Nässe verändert Schaum, Kleber und Obermaterial, und Schuhe können danach riechen oder sich verformen. Deshalb sieht jeder Käufer auf einen Blick, ob ein Paar nur trocken gelaufen wurde. Mit dem Filter „Nur trocken“ kannst du gezielt danach suchen."],
      ["Wie funktioniert der Käuferschutz?", "Du bezahlst über Runners Exchange. Das Geld wird treuhänderisch gehalten und erst nach deiner Bestätigung (oder automatisch 48 h nach Zustellung) an den Verkäufer ausgezahlt."],
      ["Was passiert, wenn der Schuh nicht wie beschrieben ist?", "Melde das Problem innerhalb von 48 h mit Fotos. Wir vermitteln und erstatten bei berechtigter Reklamation den vollen Betrag."],
      ["Kann ich einen Schuh zurückgeben, weil er nicht passt?", "Zwischen Privatpersonen gibt es kein Widerrufsrecht. Deshalb gibt es bei uns Größenrechner, Kilometerangaben und die Tauschbörse. Und du kannst den Schuh natürlich direkt wieder einstellen."],
      ["Wie wird der Aufpreis beim Tausch abgesichert?", "Der Aufpreis wird beim Annehmen des Tauschs eingezogen und erst ausgezahlt, wenn beide Parteien den Erhalt bestätigt haben."],
      ["Wie lange dauert die Auszahlung?", "Nach Bestätigung ist das Guthaben sofort verfügbar. Die Überweisung aufs Bankkonto dauert 1–2 Werktage und ist kostenlos."],
      ["Sind gebrauchte Schuhe hygienisch?", "Wir empfehlen, Einlegesohlen zu tauschen. Verkäufer müssen den Zustand wahrheitsgemäß angeben. Schuhe mit mehr als 50 km sind nicht zulässig."]
    ];
    return `<div class="wrap section" style="max-width:800px"><h1>Häufige Fragen</h1>${qa.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</div>`;
  };

  pages.groessen = () => `<div class="wrap section" style="max-width:800px">
    <h1>Größenrechner</h1><p class="muted">Hersteller schneiden unterschiedlich aus. Orientiere dich an der Fußlänge in cm und miss abends, mit Laufsocke.</p>
    <div class="panel"><label class="field"><span>Meine Fußlänge (cm)</span><input type="number" id="foot" step="0.1" value="27.3"></label>
      <div class="notice" id="sizeRes"></div></div>
    <div class="panel"><table class="breakdown"><tr style="font-weight:700"><td>EU</td><td>US (Herren)</td><td>UK</td><td>cm</td></tr>
      ${SIZE_TABLE.map(r => `<tr><td>${String(r[0]).replace(".", ",")}</td><td style="text-align:left">${r[1]}</td><td style="text-align:left">${r[2]}</td><td>${r[3]}</td></tr>`).join("")}</table></div></div>`;
  function bindGroessen() {
    const up = () => {
      const cm = +$("#foot").value + 0.5; // ~5 mm Zugabe
      const r = SIZE_TABLE.find(r => r[3] >= cm) || SIZE_TABLE[SIZE_TABLE.length - 1];
      $("#sizeRes").innerHTML = `Empfehlung: <b>EU ${String(r[0]).replace(".", ",")}</b> (US ${r[1]}, UK ${r[2]}). Bei Carbon-Wettkampfschuhen eher eng, bei langen Läufen eine halbe Nummer größer.`;
    };
    $("#foot").addEventListener("input", up); up();
  }

  pages.rechtliches = () => `<div class="wrap section" style="max-width:800px"><h1>Impressum, AGB & Datenschutz</h1><div class="panel"><p class="muted">Platzhalter. Vor dem Livegang müssen hier Impressum (§ 5 DDG), AGB inklusive Plattformregeln, Datenschutzerklärung (DSGVO) sowie Hinweise zur Zahlungsabwicklung über einen lizenzierten Zahlungsdienstleister stehen.</p></div></div>`;
  pages.notfound = () => `<div class="wrap section"><div class="empty"><span>🏃</span><h2>Seite nicht gefunden</h2><a class="btn btn-primary" href="#/">Zur Startseite</a></div></div>`;

  /* ---------- Router ---------- */
  const binders = { markt: bindMarket, artikel: bindArtikel, tausch: bindTausch, "tausch-anbieten": bindTauschAnbieten, verkaufen: bindVerkaufen, kasse: bindKasse, konto: bindKonto, nachrichten: bindNachrichten, gebuehren: bindGebuehren, groessen: bindGroessen };
  let pageAbort = new AbortController();
  let lastRoute = "";

  function render() {
    const hash = location.hash.slice(2) || "";
    const [path, qs] = hash.split("?");
    const [name, arg] = path.split("/");
    const params = Object.fromEntries(new URLSearchParams(qs || ""));
    const key = name || "home";
    const page = pages[key] || pages.notfound;
    pageAbort.abort(); pageAbort = new AbortController();
    app.innerHTML = page(params, arg);
    binders[key]?.(params, arg);
    $$(".mainnav a").forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#/" + name));
    $("#mainnav").classList.remove("open");
    if (hash !== lastRoute && !(key === "verkaufen" && lastRoute.startsWith("verkaufen"))) window.scrollTo(0, 0);
    lastRoute = hash;
    updateBadges();
  }

  /* Globale Klicks: Merken & Warenkorb */
  document.addEventListener("click", e => {
    const f = e.target.closest("[data-fav]");
    if (f) {
      e.preventDefault(); const id = +f.dataset.fav;
      const on = !state.favs.includes(id);
      state.favs = on ? [...state.favs, id] : state.favs.filter(x => x !== id); save();
      $$(`[data-fav="${id}"]`).forEach(b => { b.classList.toggle("on", on); b.textContent = b.classList.contains("fav") ? (on ? "♥" : "♡") : (on ? "♥ Gemerkt" : "♡ Merken"); });
      toast(on ? "Zur Merkliste hinzugefügt" : "Von Merkliste entfernt");
      if (location.hash === "#/merkliste") render();
    }
    const c = e.target.closest("[data-cart]");
    if (c) { const id = +c.dataset.cart; if (!state.cart.includes(id)) { state.cart.push(id); save(); } toast("Im Warenkorb ✓"); }
    const rm = e.target.closest("[data-rm]");
    if (rm) { state.cart = state.cart.filter(x => x !== +rm.dataset.rm); save(); render(); }
  });
  document.addEventListener("submit", e => {
    if (e.target.id === "heroSearch") { e.preventDefault(); location.hash = "#/markt?q=" + encodeURIComponent(new FormData(e.target).get("q")); }
  });
  $("#burger").addEventListener("click", () => $("#mainnav").classList.toggle("open"));
  window.addEventListener("hashchange", render);
  render();
})();
