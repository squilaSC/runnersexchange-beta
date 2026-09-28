/* Kategorie-Icons: Monoline, 48er-Raster, eine Strichstärke, currentColor. */
const CAT_ICONS = (() => {
  const svg = (body, vb = "0 0 48 48") => `<svg class="cat-icon" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  // Seitenprofil eines Schuhs: Ferse links, Spitze rechts, Sohlenkante y=34
  const upper = "M8 18.5l4.5-1.2c1.2 3.2 3.7 4.9 7.3 4.6l4.2-.4 6.8 4.7c7.2 1 11.6 3 12.9 5.9.5 1.1-.3 1.9-1.4 1.9H7.2A2.2 2.2 0 0 1 5 31.8V24c0-2.6 1.1-4.7 3-5.5z";
  const laces = "M22.5 21.8l2 3M26.3 23.8l2 3";
  return {
    laufschuhe: svg(`<path d="${upper}"/><path d="${laces}"/><path d="M5 29.2c9.5.9 25.5 1 37.3.2"/>`, "3 9 42 32"),
    trail: svg(`<path d="${upper}"/><path d="${laces}"/><path d="M5 29.5h38"/><path d="M9 34v2.5M15 34v2.5M21 34v2.5M27 34v2.5M33 34v2.5M39 34v2.5"/>`, "3 9 42 32"),
    spikes: svg(`<path d="M8 20l4.5-1.2c1.2 3 3.7 4.5 7.3 4.2l4.2-.3 6.8 4.1c7.2.9 11.6 2.7 12.9 5.2.4.9-.3 1.5-1.4 1.5H7.2A2.2 2.2 0 0 1 5 31.3V25c0-2.3 1.1-4.3 3-5z"/><path d="M22.5 23l2 2.6M26.3 24.7l2 2.6"/><path d="M26 33.5l1 3.5 1-3.5M32 33.5l1 3.5 1-3.5M38 33.5l1 3.5 1-3.5"/>`, "3 9 42 32"),
    rad: svg(`<path d="${upper}"/><circle cx="19" cy="27" r="2.6"/><path d="M24.5 23.5l6 5"/><path d="M26 34v2.5h9V34"/>`, "3 9 42 32"),
    bekleidung: svg(`<path d="M17 7v5.5c0 4.5-2.4 7.2-5 9V41h24V21.5c-2.6-1.8-5-4.5-5-9V7"/><path d="M17 7c1.5 3.3 3.9 5 7 5s5.5-1.7 7-5"/><path d="M19 27h10v7H19z"/>`),
    zubehoer: svg(`<rect x="13" y="13" width="22" height="22" rx="7"/><path d="M18 13l1.2-6h9.6L30 13M18 35l1.2 6h9.6L30 35"/><path d="M24 18.5V24l3.5 2.5"/><path d="M35 21.5h1.5v5H35"/>`)
  };
})();
