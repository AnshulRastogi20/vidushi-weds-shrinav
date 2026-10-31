/* Royal font options for the owner to choose between. Not used by guests: the card keeps its current font
   unless the link carries ?font=<key>, e.g. /family?font=cinzel. The palette page (mock/_review/fonts/) shows them all.
   Each option sets the three font roles in styles.css: --script (titles, names, envelope), --serif (body text),
   --caps (small labels and the date line). Devanagari always stays Tiro. */
window.FONT_OPTIONS = {
  current: { name: "Chosen: Great Vibes", families: [], script: '"Great Vibes", cursive', serif: '"Cormorant Garamond", serif', caps: '"Cinzel", serif' },
  calibri: { name: "Old (Calibri)", families: ["Carlito:ital,wght@0,400;0,700;1,400"], script: '"Carlito", Calibri, sans-serif', serif: '"Carlito", Calibri, sans-serif', caps: '"Carlito", Calibri, sans-serif', bodySize: 0.9, titleWeight: 700, titleSize: 0.77 },
  cinzel: { name: "Cinzel + Cormorant", families: ["Cinzel:wght@500;700", "Cormorant+Garamond:ital,wght@0,500;0,700;1,500"],
    script: '"Cinzel", serif', serif: '"Cormorant Garamond", serif', caps: '"Cinzel", serif', bodySize: 1.12, phoneTitle: 22 },
  cormorant: { name: "Cormorant Royale", families: ["Cormorant+Garamond:ital,wght@0,500;0,700;1,500;1,700", "Cormorant+SC:wght@600"],
    script: '"Cormorant Garamond", serif', serif: '"Cormorant Garamond", serif', caps: '"Cormorant SC", serif', bodySize: 1.14 },
  playfair: { name: "Playfair + Lora", families: ["Playfair+Display:ital,wght@0,700;1,500", "Lora:ital,wght@0,400;0,600;1,400", "Cinzel:wght@500"],
    script: '"Playfair Display", serif', serif: '"Lora", serif', caps: '"Cinzel", serif' },
  marcellus: { name: "Marcellus", families: ["Marcellus", "Marcellus+SC", "Cormorant+Garamond:ital,wght@0,500;0,700;1,500"],
    script: '"Marcellus", serif', serif: '"Cormorant Garamond", serif', caps: '"Marcellus SC", serif', bodySize: 1.12, titleWeight: 400 },
  bodoni: { name: "Bodoni Couture", families: ["Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,700;1,6..96,400"],
    script: '"Bodoni Moda", serif', serif: '"Bodoni Moda", serif', caps: '"Bodoni Moda", serif' },
  vibes: { name: "Great Vibes script", families: ["Great+Vibes", "Cormorant+Garamond:ital,wght@0,500;0,700;1,500", "Cinzel:wght@500"],
    script: '"Great Vibes", cursive', serif: '"Cormorant Garamond", serif', caps: '"Cinzel", serif', bodySize: 1.12, titleWeight: 400, titleSize: 1.3 },
  decorative: { name: "Cinzel Decorative", families: ["Cinzel+Decorative:wght@700", "Cinzel:wght@500", "Cormorant+Garamond:ital,wght@0,500;0,700;1,500"],
    script: '"Cinzel Decorative", serif', serif: '"Cormorant Garamond", serif', caps: '"Cinzel", serif', bodySize: 1.12, titleSize: 0.86 },
};

// apply one option to this page (adds the Google Fonts stylesheet and sets the font roles)
window.applyFontOption = (key, root = document.documentElement) => {
  const o = window.FONT_OPTIONS[key];
  if (!o || key === "current") return false;
  if (o.families.length) {
    const l = document.createElement("link"); l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?" + o.families.map((f) => "family=" + f).join("&") + "&display=swap";
    document.head.appendChild(l);
  }
  root.style.setProperty("--script", o.script);
  root.style.setProperty("--serif", o.serif);
  root.style.setProperty("--caps", o.caps);
  const css = [];
  if (o.bodySize) css.push(`body { font-size: ${17 * o.bodySize}px; }`);
  if (o.titleWeight) css.push(`.title-text, .who, .env-address .guest, .sign-h { font-weight: ${o.titleWeight}; }`);
  // phones: a wide face gets a smaller event title, so "Engagement" fits the clear column between the two of them
  if (o.phoneTitle) css.push(`@media (max-width: 600px) { .ev-title .title-text { font-size: ${o.phoneTitle}px !important; } }`);
  if (o.titleSize) {
    const s = o.titleSize;
    css.push(`.title-text { font-size: calc(clamp(30px, 8vw, 56px) * ${s}); } .who { font-size: calc(clamp(28px, 7.5vw, 38px) * ${s}); }`,
      `.env-address .guest { font-size: calc(clamp(24px, 6.6vw, 34px) * ${s}); } .sign-h { font-size: calc(clamp(18px, 5vw, 23px) * ${s}); }`,
      `@media (max-width: 600px) { .ev-title .title-text { font-size: ${Math.round(26 * s)}px; } }`);
  }
  if (css.length) { const s = document.createElement("style"); s.textContent = css.join("\n"); document.head.appendChild(s); }
  return true;
};

(() => {
  const key = new URLSearchParams(location.search).get("font");
  if (key && document.getElementById("world")) window.applyFontOption(key);
})();
