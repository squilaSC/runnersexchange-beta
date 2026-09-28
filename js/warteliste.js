/* Warteliste – Vorab-Landingpage. Dummy-Daten; später POST /waitlist */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem("rxwl_" + k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("rxwl_" + k, JSON.stringify(v)); } catch {} }
  };

  // Startdatum, Ziel und Aktion kommen aus SITE (im Admin-Bereich änderbar)
  const LAUNCH = new Date(SITE.launch);
  const GOAL = +SITE.goal || 1000;
  document.querySelectorAll(".promo-sellers").forEach(e => e.textContent = SITE.promoSellers);
  document.querySelectorAll(".promo-months").forEach(e => e.textContent = SITE.promoMonths);
  document.querySelectorAll(".promo-pct").forEach(e => e.textContent = Math.round(FEES.sellerCommissionPct * 1000) / 10);
  document.getElementById("goal").textContent = GOAL.toLocaleString("de-DE");
  const MODELS = {
    Nike: ["Vaporfly 3", "Alphafly 3", "Pegasus 41", "Zoom Fly 6", "Streakfly"],
    Adidas: ["Adios Pro 4", "Boston 13", "Evo SL", "Takumi Sen 10"],
    ASICS: ["Metaspeed Sky Paris", "Novablast 5", "Superblast 2", "Gel-Nimbus 27"],
    Hoka: ["Mach 6", "Rocket X 2", "Clifton 10", "Speedgoat 6"],
    Saucony: ["Endorphin Pro 4", "Endorphin Speed 5", "Kinvara 15"],
    On: ["Cloudboom Strike", "Cloudmonster 2"],
    Puma: ["Deviate Nitro Elite 3", "Deviate Nitro 3"],
    "New Balance": ["SC Elite v5", "FuelCell Rebel v5"],
    Brooks: ["Hyperion Elite 4", "Ghost 17"],
    Andere: []
  };
  const SIZES = [36, 37, 37.5, 38, 38.5, 39, 40, 40.5, 41, 42, 42.5, 43, 44, 44.5, 45, 46, 47];

  // Dummy-Stand der Warteliste
  const base = { total: 612, sellers: 184, buyers: 428 };
  const DEMAND = [
    { m: "Nike Vaporfly 3", s: 43, n: 23, where: "Neustadt & Altstadt" }, { m: "Adidas Adios Pro 4", s: 42, n: 17, where: "Gonsenheim" },
    { m: "ASICS Metaspeed Sky Paris", s: 44, n: 14, where: "Oberstadt" }, { m: "Nike Alphafly 3", s: 42.5, n: 12, where: "Uni-Campus" },
    { m: "Hoka Rocket X 2", s: 41, n: 9, where: "Hechtsheim" }, { m: "Saucony Endorphin Pro 4", s: 45, n: 8, where: "Mombach" }
  ];
  const CLUBS = [["Tri-Team Mainz", 41], ["Lauftreff Mainz", 36], ["USC Mainz", 29], ["Uni-Sport Mainz", 24], ["Lauftreff Gonsenheim", 18]];
  const CO2_PER_PAIR = 14;   // kg CO2e, Cheah et al. (MIT) 2013
  const CO2_PER_CAR_KM = 0.15;
  // Herkunft analoger Werbung: QR-Codes auf Plakat/Flyer verlinken auf ?src=...
  const SOURCES = {
    plakat: "👋 Schön, dass du unser Plakat gesehen hast! Trag dich ein, bald geht's in Mainz los.",
    flyer: "👋 Hallo aus dem Laufladen! Schön, dass du den Flyer mitgenommen hast.",
    lauftreff: "👋 Willkommen vom Lauftreff! Trag deinen Verein ein und punkte für die Schrank-Challenge.",
    marathon: "👋 Hallo vom Gutenberg-Marathon! Neue Schuhe gekauft, die nicht passen? Dann bist du hier richtig."
  };
  const src = new URLSearchParams(location.search).get("src");

  let me = store.get("me", null);
  let role = "buy";
  const fmtSize = s => String(s).replace(".", ",");

  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600);
  }

  /* Zähler */
  function counts() {
    const add = me ? 1 : 0;
    const total = base.total + add;
    $("#total").textContent = total.toLocaleString("de-DE");
    $("#sellers").textContent = base.sellers + (me?.role === "sell" ? 1 : 0);
    $("#buyers").textContent = base.buyers + (me?.role === "buy" ? 1 : 0);
    requestAnimationFrame(() => $("#bar").style.width = Math.min(100, total / GOAL * 100) + "%");
    const pairs = base.sellers + (me?.role === "sell" ? 1 : 0), co2 = pairs * CO2_PER_PAIR;
    $("#co2Hero").textContent = co2.toLocaleString("de-DE");
    $("#co2Big").textContent = co2.toLocaleString("de-DE");
    $("#co2Km").textContent = Math.round(co2 / CO2_PER_CAR_KM).toLocaleString("de-DE");
  }

  /* Countdown */
  function countdown() {
    const d = Math.max(0, LAUNCH - Date.now());
    const parts = [[Math.floor(d / 864e5), "Tage"], [Math.floor(d / 36e5) % 24, "Std"], [Math.floor(d / 6e4) % 60, "Min"]];
    $("#countdown").innerHTML = parts.map(([v, l]) => `<div><b>${v}</b><span class="small muted">${l}</span></div>`).join("");
  }

  /* Nachfrage-Board & Vereine */
  function boards() {
    $("#demand").innerHTML = DEMAND.map(d => `<div class="demand-row"><b class="n">${d.n}</b><div style="flex:1"><b>${esc(d.m)}</b><div class="small muted">Größe EU ${fmtSize(d.s)} · 📍 ${d.where}</div></div><button class="btn btn-sm" data-have="${esc(d.m)}|${d.s}">Hab ich!</button></div>`).join("");
    const clubs = [...CLUBS];
    if (me?.club) { const c = clubs.find(c => c[0].toLowerCase() === me.club.toLowerCase()); c ? c[1]++ : clubs.push([me.club, 1]); }
    clubs.sort((a, b) => b[1] - a[1]);
    const max = clubs[0][1];
    $("#clubsBoard").innerHTML = clubs.slice(0, 6).map(([n, v], i) => `<div class="list-item"><b style="width:22px">${["🥇", "🥈", "🥉"][i] || i + 1}</b><div class="list-main"><b>${esc(n)}</b><div class="progress" style="margin:4px 0 0"><i style="width:${v / max * 100}%"></i></div></div><span class="small muted">${v} Paar</span></div>`).join("");
  }

  const tickerItems = ["Lena aus der Neustadt sucht Vaporfly 3 in 43", "Tobias aus Gonsenheim bietet Speedgoat 6 in 44,5 an", "Aylin vom Uni-Sport sucht Metaspeed Sky in 40", "Übergabe am Winterhafen: Novablast 5 hat ein neues Zuhause 🌱", "Marco aus Hechtsheim bietet Adios Pro 4 in 42 an", "Tri-Team Mainz übernimmt Platz 1 der Schrank-Challenge"];

  /* Formular */
  function fillSelects() {
    $("#brand").innerHTML = Object.keys(MODELS).map(b => `<option>${b}</option>`).join("");
    $("#size").innerHTML = SIZES.map(s => `<option value="${s}" ${s === 43 ? "selected" : ""}>${fmtSize(s)}</option>`).join("");
    const setModels = () => $("#models").innerHTML = (MODELS[$("#brand").value] || []).map(m => `<option>${m}</option>`).join("");
    $("#brand").addEventListener("change", setModels); setModels();
  }
  function setRole(r) {
    role = r;
    $$("#role .choice").forEach(c => c.classList.toggle("on", c.dataset.role === r));
    $$(".sell-only").forEach(e => e.classList.toggle("hidden", r !== "sell"));
    $("#submit").textContent = r === "sell" ? "Schuh vormerken" : "Auf die Warteliste";
  }

  function success(entry) {
    $("#formWrap").classList.add("hidden");
    const w = $("#successWrap"); w.classList.remove("hidden");
    const refUrl = `${location.origin}${location.pathname}?ref=${entry.code}`;
    const pos = Math.max(1, entry.position - entry.refs * 10);
    const matches = DEMAND.filter(d => entry.model && d.m.toLowerCase().includes(entry.model.toLowerCase()) && d.s == entry.size);
    w.innerHTML = `
      <div style="font-size:44px">🎉</div><h2>Du bist dabei!</h2>
      <p class="muted">Dein Platz auf der Warteliste</p><div class="pos">#${pos}</div>
      ${entry.role === "sell"
        ? `<div class="notice notice-green" style="text-align:left;margin:14px 0">${matches.length ? `🔥 <b>${matches[0].n} Personen</b> suchen genau diesen Schuh. Du wirst zum Start als Erstes vermittelt.` : `Wir melden uns, sobald jemand deinen <b>${esc(entry.brand)} ${esc(entry.model || "")}</b> in ${fmtSize(entry.size)} sucht.`} 0 % Provision sind dir sicher.</div>`
        : `<div class="notice" style="text-align:left;margin:14px 0">Wir benachrichtigen dich, sobald <b>${esc(entry.brand)} ${esc(entry.model || "")}</b> in EU ${fmtSize(entry.size)} angeboten wird.</div>`}
      <p style="margin:18px 0 4px"><b>Rück 10 Plätze vor pro Empfehlung</b></p>
      <div class="ref"><input type="text" readonly value="${esc(refUrl)}" id="refUrl"><button class="btn btn-dark btn-sm" id="copy">Kopieren</button></div>
      <div class="row" style="justify-content:center">
        <a class="btn btn-sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent("Fehlkauf im Schrank? Runners Exchange startet bald in Mainz: " + refUrl)}">WhatsApp</a>
        <button class="btn btn-sm" id="share">Teilen …</button>
      </div>
      <p class="small muted" style="margin-top:14px">${entry.refs} Empfehlung(en)</p>
      <button class="btn btn-ghost btn-sm" id="another">Weiteren Schuh eintragen</button>`;
    $("#copy").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(refUrl); toast("Link kopiert ✓"); } catch { $("#refUrl").select(); toast("Link markiert – jetzt kopieren"); }
    });
    $("#share").addEventListener("click", () => navigator.share ? navigator.share({ title: "Runners Exchange", url: refUrl }).catch(() => {}) : toast("Teilen wird hier nicht unterstützt – Link kopieren."));
    $("#another").addEventListener("click", () => { $("#formWrap").classList.remove("hidden"); w.classList.add("hidden"); $("#wlForm").reset(); fillSelects(); });
  }

  $("#wlForm").addEventListener("submit", e => {
    e.preventDefault();
    const f = new FormData(e.target), err = $("#err");
    const email = (f.get("email") || "").trim(), plz = (f.get("plz") || "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err.textContent = "Bitte gültige E-Mail angeben.";
    if (!/^\d{5}$/.test(plz)) return err.textContent = "Bitte fünfstellige PLZ angeben.";
    if (role === "sell" && !f.get("wet")) return err.textContent = "Bitte angeben, ob die Schuhe nass getragen wurden.";
    if (!f.get("consent")) return err.textContent = "Bitte der Benachrichtigung zustimmen.";
    err.textContent = "";
    const inRegion = /^(55[0-2]|65[0-2])/.test(plz); // Mainz, Rheinhessen-Nord, Wiesbaden
    const entry = {
      role, email, plz, brand: f.get("brand"), model: (f.get("model") || "").trim(), size: +f.get("size"),
      price: +f.get("price") || null, wet: role === "sell" ? f.get("wet") === "true" : null, club: (f.get("club") || "").trim(),
      code: Math.random().toString(36).slice(2, 8), position: base.total + 1, refs: 0,
      ref: new URLSearchParams(location.search).get("ref"), src, created: new Date().toISOString()
    };
    // TODO Backend: POST /waitlist (Double-Opt-in-Mail!)
    store.set("me", entry); me = entry;
    counts(); boards(); success(entry);
    if (!inRegion) toast("Wir starten zuerst in Mainz – wir melden uns, sobald wir zu dir kommen. Versand geht natürlich auch!");
  });

  $("#partnerForm").addEventListener("submit", e => {
    e.preventDefault();
    if (!e.target.checkValidity()) return toast("Bitte alle Felder ausfüllen.");
    e.target.reset(); toast("Danke! Wir melden uns innerhalb von 2 Werktagen.");
  });

  document.addEventListener("click", e => {
    const h = e.target.closest("[data-have]");
    if (h) {
      const [m, s] = h.dataset.have.split("|"); const [brand, ...rest] = m.split(" ");
      setRole("sell");
      if (me) { $("#formWrap").classList.remove("hidden"); $("#successWrap").classList.add("hidden"); }
      $("#brand").value = MODELS[brand] ? brand : "Andere"; $("#brand").dispatchEvent(new Event("change"));
      $("[name=model]").value = rest.join(" "); $("#size").value = s;
      $("#form").scrollIntoView({ behavior: "smooth" }); $("[name=plz]").focus({ preventScroll: true });
    }
    const r = e.target.closest("#role .choice"); if (r) setRole(r.dataset.role);
  });

  if (SOURCES[src]) { $("#srcBanner").textContent = SOURCES[src]; $("#srcBanner").classList.remove("hidden"); }
  fillSelects(); counts(); countdown(); boards();
  $("#ticker").textContent = [...tickerItems, ...tickerItems].join("   ·   ");
  setInterval(countdown, 30000);
  if (me) success(me);
})();
