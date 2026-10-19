/* #RViShCameTrue - Shrinav weds Vidushi. Content comes from /invites/<link>.json (built by tools/build_invites.py). */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // "/" is the wedding-only link; "/i/<code>" links carry more events.
  const m = location.pathname.match(/^\/i\/([a-z0-9]+)\/?$/);
  const linkId = m ? m[1] : "main";
  const guest = (new URLSearchParams(location.search).get("to") || "").trim().slice(0, 60);
  if (guest) $("#guest").textContent = guest;
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) $("#hint").textContent = "Click to open";

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  let lenis = null;
  if (!reduced && window.Lenis && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
    window.__lenis = lenis; // lets tests and the console scroll the page
  }

  let C, EVENTS, audio, audioOk = true;

  /* ================= build the page from the link's data ================= */
  function build(data) {
    C = data.common;
    EVENTS = data.events;
    const text = {
      hosts: C.hosts, request: C.request, family: C.family,
      firstName: C.first.name, firstParents: C.first.parents, secondName: C.second.name, secondParents: C.second.parents,
    };
    $$("[data-bind]").forEach((el) => { const v = text[el.dataset.bind]; if (v) el.textContent = v; else el.hidden = true; });

    $$("[data-split]").forEach((h) => {
      const t = h.textContent.trim();
      h.setAttribute("aria-label", t);
      h.innerHTML = t.split(/\s+/).map((w) => `<span class="w" aria-hidden="true">${[...w].map((c) => `<span class="ch">${c}</span>`).join("")}</span>`).join(" ");
    });

    const tpl = $("#event-tpl");
    EVENTS.forEach((ev) => {
      const sec = tpl.content.firstElementChild.cloneNode(true);
      sec.id = `ev-${ev.key}`;
      sec.dataset.sky = ev.sky;
      $(".ev-heading", sec).textContent = ev.title;
      const title = $(".ev-title", sec);
      if (ev.titleArt) { title.classList.add("art", "draw", "foil"); title.dataset.svg = ev.titleArt; }
      else title.innerHTML = `<p class="title-text">${ev.title}</p>`;
      const fill = (sel, v) => { const el = $(sel, sec); if (v) el.textContent = v; else el.hidden = true; };
      fill(".ev-date", ev.dateLine); fill(".ev-time", ev.timeLine); fill(".ev-venue", ev.venue); fill(".ev-venue-line", ev.venueLine);
      const maps = $(".ev-maps", sec);
      if (ev.mapsQuery) maps.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(ev.mapsQuery); else maps.hidden = true;
      if (!ev.mapsQuery) $(".actions", sec).hidden = true;
      if (ev.countdown && ev.start) { $(".countdown", sec).hidden = false; startClock(sec, ev); }
      // each event's scene plays first, then its details follow
      if (!reduced && SCENE_ART[ev.key]) $(".ev-tag", sec).insertAdjacentHTML("beforebegin", SCENE_ART[ev.key]);
      $("#events").appendChild(sec);
    });

    $("#couple-photo").src = C.couplePhoto;
    // the closing: who to reply to, and with best compliments from
    const names = (id, list) => { const ul = $("#" + id); if (list && list.length) ul.innerHTML = list.map((n) => `<li>${n}</li>`).join(""); else ul.closest(".sign-col").hidden = true; };
    names("rsvp", C.rsvp); names("wbcf", C.wbcf);
    $$(".arch img").forEach((img) => img.addEventListener("error", () => img.parentElement.classList.add("is-empty"), { once: true }));

  }

  /* ================= art ================= */
  const svgCache = {};
  const getSvg = (name) => (svgCache[name] ??= fetch(`/assets/art/${name}.svg`).then((r) => r.text()));
  const inlineArt = () => Promise.all($$("[data-svg], [data-toon]").map(async (el) => {
    el.innerHTML = await getSvg(el.dataset.svg || el.dataset.toon);
    const svg = $("svg", el); svg.setAttribute("aria-hidden", "true"); svg.setAttribute("focusable", "false");
  }));

  function prepDraw(el) {
    const paths = $$("path:not(.k)", el);
    paths.forEach((p) => {
      const len = Math.ceil(p.getTotalLength()) + 1;
      p.style.strokeDasharray = len; p.style.strokeDashoffset = len; p.style.fillOpacity = 0;
    });
    el._draw = paths;
  }
  function drawTl(el, dur = 2) {
    const tl = gsap.timeline();
    if (!el?._draw) return tl;
    const paths = el._draw;
    return tl.to(paths, { strokeDashoffset: 0, duration: dur, ease: "power1.inOut", stagger: { amount: dur * 0.55 } })
      .to(paths, { fillOpacity: 1, duration: 0.9, ease: "power1.out", stagger: { amount: 0.5 } }, `-=${dur * 0.55}`)
      .to(paths, { strokeOpacity: 0, duration: 0.8 }, "<+0.4");
  }

  /* ================= the couple: animated clips and key poses, drawn by cast.js on the #world layer ================= */
  let world = null;
  const worldReady = new Promise((res) => {
    if (window.World) return res(window.World);
    addEventListener("world:ready", () => res(window.World), { once: true });
    addEventListener("world:fail", () => res(null), { once: true });
  });
  // something with a getBoundingClientRect, so the 2D dust can fly to and from them
  const body = (who) => ({ getBoundingClientRect: () => world.rect(who) });

  /* ================= the envelope ================= */
  function showGate() {
    $("#gate").hidden = false;
    if (reduced) return;
    gsap.from(".env", { autoAlpha: 0, scale: 1.04, duration: 0.5, ease: "power2.out" });
    gsap.from([".thread", ".knot"], { autoAlpha: 0, duration: 0.4, delay: 0.2 });
    gsap.from("#hint", { autoAlpha: 0, duration: 0.6, delay: 1.3 });
    world?.gateIn(); // they walk in from the two edges and wait by the thread
    let opened = false;
    const open = (e) => { if (opened) return; opened = true; e?.preventDefault?.(); openEnvelope(); };
    ["pointerup", "touchend", "click"].forEach((t) => $("#open").addEventListener(t, open));
  }

  function openEnvelope() {
    playMusic(); // inside the tap, so phones allow sound
    askTilt();
    setTimeout(() => { $("#gate")?.remove(); castReturn(); revealHero(true); unlock(); }, 11000);
    if (reduced) { $("#gate").remove(); world?.hide(); revealHero(true); unlock(); return; }
    const tl = gsap.timeline();
    tl.to("#hint", { autoAlpha: 0, duration: 0.15 }, 0)
      // they take the thread and pull it apart
      .add(world ? world.pullThread() : gsap.timeline(), 0)
      .to(".th-l, .th-r", { scaleX: 0, duration: 0.38, ease: "power2.in" }, 0.4)
      .to(".knot", { scale: 1.25, duration: 0.1, ease: "power2.out" }, 0.42)
      .to(".knot", { y: innerHeight * 0.6, rotation: 140, autoAlpha: 0, duration: 0.55, ease: "power2.in" }, 0.52)
      // the envelope opens
      .to(".env-flap", { rotationX: 180, duration: 0.55, ease: "power2.inOut" }, 0.75)
      .to(".env-flap", { autoAlpha: 0, duration: 0.15 }, 1.15)
      .to(".env-body", { yPercent: 100, duration: 0.6, ease: "power3.in" }, 1.05)
      .call(() => $("#gate").remove(), null, 1.7)
      .add(merge(), 1.6);
  }

  /* ---- the merge: they meet, rise as light, and become "Sh" and "Vi" ---- */
  const GROOM_LIGHT = ["#E9C46A", "#FCF6BA", "#7FAE68", "#C9A04B"];
  const BRIDE_LIGHT = ["#E9C46A", "#FCF6BA", "#F08AA4", "#C9A04B"];

  function merge() {
    const lgS = $("#lg-s"), lgV = $("#lg-v");
    const tl = gsap.timeline();
    // they walk to each other first (a real clip), so everything after waits for them
    const o = world ? 1.6 : 0;
    if (world) tl.add(world.meet(), 0);
    // the room dims, a warm light rises behind them, the logo's S and V wait above as faint gold
    tl.call(placeHalo, null, o + 0.8)
      .to("#veil", { autoAlpha: 1, duration: 0.9, ease: "power2.out" }, o + 0.85)
      .fromTo("#halo", { autoAlpha: 0, scale: 0.3 }, { autoAlpha: 1, scale: 1, duration: 1.1, ease: "power2.out" }, o + 0.9)
      .to(".lg-ghost", { opacity: 0.22, duration: 0.8, ease: "power2.out" }, o + 1.0)
      // they become light
      .call(() => { if (world) { dust(body("groom"), $("#tgt-s"), GROOM_LIGHT); dust(body("bride"), $("#tgt-v"), BRIDE_LIGHT); } }, null, o + 1.75)
      .add(world ? world.vanish() : gsap.timeline(), o + 1.75)
      .to("#halo", { autoAlpha: 0, scale: 1.5, duration: 1.3, ease: "power2.out" }, o + 2.0)
      // Shrinav fills the S, Vidushi the V, bottom to top as the light arrives
      .to(lgS, { clipPath: "inset(39% 0% 0% 0%)", duration: 0.95, ease: "power2.inOut" }, o + 2.3)
      .to(lgV, { clipPath: "inset(38% 0% 0% 0%)", duration: 0.95, ease: "power2.inOut" }, o + 2.36)
      .to([lgS, lgV], { filter: "drop-shadow(0px 0px 14px rgba(255,196,96,0.95))", duration: 0.35, ease: "power2.out" }, o + 3.15)
      .to([lgS, lgV], { filter: "drop-shadow(0px 0px 0px rgba(255,196,96,0))", duration: 0.9, ease: "power2.inOut" }, o + 3.5)
      .to(".lg-ghost", { opacity: 0, duration: 0.4 }, o + 3.25)
      .to("#veil", { autoAlpha: 0, duration: 1.2, ease: "power2.inOut" }, o + 3.2)
      .add(revealHero(), o + 3.15)
      .call(castReturn, null, o + 4.9)
      .call(unlock, null, o + 5.3)
      .call(() => { if (!reduced) { autoBtn.hidden = false; setAuto(true); } }, null, o + 8.3);
    return tl;
  }
  function placeHalo() {
    if (!world) return;
    const g = world.rect("groom"), b = world.rect("bride");
    gsap.set("#halo", { left: (g.left + g.width / 2 + b.left + b.width / 2) / 2, top: g.top + g.height * 0.45, xPercent: -50, yPercent: -50 });
  }

  /* gold dust: each mote leaves the figure, arcs, and lands inside its letter */
  const canvas = $("#dust"), ctx = canvas.getContext("2d");
  let motes = [], running = false;
  function dust(actor, target, colors) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(innerWidth * dpr)) {
      canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const a = actor.getBoundingClientRect(), t = target.getBoundingClientRect();
    const n = innerWidth < 600 ? 90 : 140, rnd = (lo, hi) => lo + Math.random() * (hi - lo);
    for (let i = 0; i < n; i++) {
      const u = Math.random(); // where on the body: the head is narrower than the kurta
      const sx = a.left + a.width / 2 + rnd(-1, 1) * (u < 0.4 ? 0.22 : 0.3) * a.width;
      const sy = a.top + (0.06 + u * 0.86) * a.height;
      const ex = t.left + rnd(0.08, 0.92) * t.width, ey = t.top + rnd(0.2, 0.9) * t.height;
      motes.push({
        sx, sy, ex, ey, x: sx, y: sy,
        cx: (sx + ex) / 2 + rnd(-0.28, 0.28) * innerWidth, cy: Math.min(sy, ey) - rnd(0.06, 0.22) * innerHeight,
        age: 0, delay: rnd(0, 0.4), dur: rnd(0.75, 1.15), r: rnd(0.8, 2.6), c: colors[i % colors.length],
      });
    }
    if (!running) { running = true; gsap.ticker.add(drawDust); }
  }
  function drawDust() {
    const dt = (gsap.ticker.deltaRatio() / 60) * gsap.globalTimeline.timeScale();
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    let pending = 0;
    for (const m of motes) {
      m.age += dt;
      const p = Math.min(1, Math.max(0, (m.age - m.delay) / m.dur));
      if (p < 1) pending++;
      if (p <= 0 || p >= 1) continue;
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2, k = 1 - e;
      const x = k * k * m.sx + 2 * k * e * m.cx + e * e * m.ex, y = k * k * m.sy + 2 * k * e * m.cy + e * e * m.ey;
      const alpha = p < 0.12 ? p / 0.12 : p > 0.85 ? (1 - p) / 0.15 : 1;
      ctx.globalAlpha = alpha * 0.55;
      ctx.strokeStyle = m.c; ctx.lineWidth = m.r * 0.9; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(x, y); ctx.stroke();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = m.c; ctx.shadowBlur = 8;
      ctx.fillStyle = m.c; ctx.beginPath(); ctx.arc(x, y, m.r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      m.x = x; m.y = y;
    }
    if (!pending) { motes = []; running = false; gsap.ticker.remove(drawDust); ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  /* ---- balloons: a release when the hashtag lands, then two bunches stay ---- */
  const BALLOONS = { gold: ["#F8DA8C", "#C48A28"], peony: ["#F7B0C2", "#D8456B"], coral: ["#F9B59A", "#E0674A"], ivory: ["#FFFBF0", "#DCCBA6"], leaf: ["#B9D69E", "#5E8C4A"] };
  $("svg defs").insertAdjacentHTML("beforeend", Object.entries(BALLOONS).map(([k, [hi, lo]]) =>
    `<radialGradient id="bl-${k}" cx="36%" cy="30%" r="78%"><stop offset="0" stop-color="${hi}"/><stop offset=".55" stop-color="${lo}"/><stop offset="1" stop-color="${lo}" stop-opacity=".92"/></radialGradient>`).join(""));
  const balloonSvg = (k) => `<svg viewBox="0 0 60 150" aria-hidden="true">
      <path d="M30 4 C48 4 58 20 58 38 C58 60 42 76 30 80 C18 76 2 60 2 38 C2 20 12 4 30 4 Z" fill="url(#bl-${k})"/>
      <ellipse cx="19" cy="23" rx="5" ry="10" fill="#fff" opacity=".5" transform="rotate(-24 19 23)"/>
      <path d="M26.5 79 L33.5 79 L30 85 Z" fill="${BALLOONS[k][1]}"/>
      <path d="M30 85 C25 100 35 112 30 126 C26 136 33 142 30 150" fill="none" stroke="#9A8A72" stroke-width="1.1"/></svg>`;
  function releaseBalloons() {
    const box = $("#balloons"), H = $("#hero").offsetHeight, keys = Object.keys(BALLOONS);
    const n = innerWidth < 600 ? 12 : 18;
    for (let i = 0; i < n; i++) {
      const b = document.createElement("div"), size = gsap.utils.random(38, 78);
      b.className = "balloon"; b.innerHTML = balloonSvg(keys[i % keys.length]);
      Object.assign(b.style, { left: `${gsap.utils.random(2, 92)}%`, width: `${size}px`, opacity: size < 50 ? 0.75 : 1 });
      box.appendChild(b);
      const dur = gsap.utils.random(5.5, 8.5) * (size < 50 ? 1.25 : 1);
      gsap.fromTo(b, { y: H + 40 }, { y: -size * 3 - 40, duration: dur, delay: gsap.utils.random(0, 1.4), ease: "none", onComplete: () => b.remove() });
      gsap.fromTo($("svg", b), { x: -14, rotation: -5 }, { x: 14, rotation: 5, duration: gsap.utils.random(1.6, 2.4), yoyo: true, repeat: -1, ease: "sine.inOut" });
    }
    // two bunches stay tied at the bottom corners
    [["bunch-l", ["peony", "gold", "ivory"]], ["bunch-r", ["leaf", "coral", "gold"]]].forEach(([cls, ks]) => {
      const bunch = document.createElement("div");
      bunch.className = `bunch ${cls}`;
      bunch.innerHTML = ks.map((k, i) => `<div class="tied" style="--r:${(i - 1) * 14}deg">${balloonSvg(k)}</div>`).join("");
      box.appendChild(bunch);
      gsap.from(bunch, { y: 200, autoAlpha: 0, duration: 1.6, ease: "power3.out", delay: 0.6 });
      $$(".tied svg", bunch).forEach((t, i) => gsap.to(t, { rotation: i % 2 ? 4 : -4, y: -6, duration: 2 + i * 0.4, yoyo: true, repeat: -1, ease: "sine.inOut", transformOrigin: "50% 100%" }));
    });
  }

  /* ================= hero + scroll ================= */
  const LOGO_HIDDEN = () => {
    gsap.set(".lg-s, .lg-v", { clipPath: "inset(74% 0% 0% 0%)" });
    gsap.set(".lg-hashtag", { clipPath: "inset(0% 72% 0% 0%)", autoAlpha: 0 });
    gsap.set(".lg-ornament, .lg-el, .lg-wreath, .hero-date, .hero-place, .cue", { autoAlpha: 0 });
  };
  function revealHero(instant) {
    const tl = gsap.timeline();
    if (instant) {
      gsap.set(".lg-s, .lg-v, .lg-hashtag", { clipPath: "inset(0% 0% 0% 0%)", autoAlpha: 1 });
      gsap.set(".lg-ornament, .lg-el, .lg-wreath, .hero-date, .hero-place, .cue", { autoAlpha: 1 });
      gsap.set(".lg-wreath", { "--a": "360deg" });
      return tl;
    }
    tl // the hashtag writes itself left to right
      .set(".lg-hashtag", { autoAlpha: 1 }, 0)
      .to(".lg-hashtag", { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "power1.inOut" }, 0)
      .fromTo(".lg-ornament", { autoAlpha: 0, scale: 0.7, transformOrigin: "50% 27%" }, { autoAlpha: 1, scale: 1, duration: 0.8, ease: "back.out(1.6)" }, 0.5)
      // the elephants walk in from both sides
      .fromTo(".lg-el-l", { autoAlpha: 0, xPercent: -60 }, { autoAlpha: 1, xPercent: 0, duration: 1.5, ease: "power2.out" }, 0.7)
      .fromTo(".lg-el-r", { autoAlpha: 0, xPercent: 60 }, { autoAlpha: 1, xPercent: 0, duration: 1.5, ease: "power2.out" }, 0.75)
      .fromTo(".lg-el", { y: 0 }, { y: -6, duration: 0.25, yoyo: true, repeat: 5, ease: "sine.inOut" }, 0.7)
      // then the gold ring draws round and the flowers bloom into place
      .set(".lg-wreath", { autoAlpha: 1, "--a": "0deg" }, 1.9)
      .to(".lg-wreath", { "--a": "380deg", duration: 1.6, ease: "power2.inOut" }, 1.9)
      .fromTo(".lg-wreath", { scale: 0.97, filter: "blur(4px)" }, { scale: 1, filter: "blur(0px)", duration: 1.6, ease: "power2.out" }, 1.9)
      .call(releaseBalloons, null, 2.6)
      .fromTo(".bell", { yPercent: -110 }, { yPercent: 0, duration: 1.3, ease: "back.out(1.4)", stagger: 0.12 }, 2.4)
      .fromTo(".hero-date, .hero-place", { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.12 }, 3.2)
      .fromTo(".cue", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, 3.8);
    $$(".bell").forEach((b, i) => {
      gsap.fromTo(b, { rotation: i ? 2.2 : -2.2 }, { rotation: i ? -2.2 : 2.2, duration: 2.4 + i * 0.35, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.2, transformOrigin: "50% 0" });
    });
    const kick = $$(".bell-art").map((b) => gsap.quickTo(b, "rotation", { duration: 1.4, ease: "elastic.out(1, 0.3)" }));
    ScrollTrigger.create({ trigger: "#hero", start: "top top", end: "bottom top", onUpdate: (s) => { const v = gsap.utils.clamp(-9, 9, s.getVelocity() / 260); kick.forEach((k, i) => k(i ? -v : v)); } });
    return tl;
  }
  let unlocked = false;
  function unlock() {
    if (unlocked) return; unlocked = true;
    root.classList.remove("is-locked");
    lenis?.start();
    ScrollTrigger.refresh();
  }

  const STATES = {
    paper: { "--sky-top": "#F7F2E8", "--sky-bot": "#EFE7D6", "--fg": "#4A3426", "--fg-soft": "#7A6552", "--line": "#B8892E", "--gold": "#9A6A1E", "--stars": 0, "--horizon": 0, "--grain": 0.5 },
    dusk: { "--sky-top": "#4A3561", "--sky-bot": "#D98A6A", "--fg": "#FFF3E4", "--fg-soft": "#F2D9C6", "--line": "#F6D596", "--gold": "#F6D596", "--stars": 0.25, "--horizon": 0.6, "--grain": 0.25 },
    ember: { "--sky-top": "#5A1220", "--sky-bot": "#C8654E", "--fg": "#FFF1E4", "--fg-soft": "#F2D2C2", "--line": "#F1C76A", "--gold": "#F1C76A", "--stars": 0.15, "--horizon": 0.5, "--grain": 0.25 },
    // wedding: Sindoor Velvet
    crimson: { "--sky-top": "#2B0408", "--sky-bot": "#7A0E1C", "--fg": "#FFF4E2", "--fg-soft": "#E9C9B9", "--line": "#D9A948", "--gold": "#F1C76A", "--stars": 0.35, "--horizon": 0.6, "--grain": 0.14 },
    // engagement: indigo night
    night: { "--sky-top": "#0D1030", "--sky-bot": "#241C47", "--fg": "#F6ECD8", "--fg-soft": "#C9BDA8", "--line": "#E2B35C", "--gold": "#E2B35C", "--stars": 1, "--horizon": 1, "--grain": 0.12 },
    dawn: { "--sky-top": "#5B2E5A", "--sky-bot": "#F29E5C", "--fg": "#FFF0E6", "--fg-soft": "#F6D3C4", "--line": "#F6C27A", "--gold": "#F6C27A", "--stars": 0.2, "--horizon": 0.9, "--grain": 0.2 },
    // haldi: turmeric with rani-pink type
    sun: { "--sky-top": "#FFD45A", "--sky-bot": "#F0A010", "--fg": "#8A0E45", "--fg-soft": "#A8245E", "--line": "#B0125B", "--gold": "#B0125B", "--stars": 0, "--horizon": 0.9, "--grain": 0.3 },
  };
  const BAR = { paper: "#F6EFE2", dusk: "#4A3561", ember: "#5A1220", crimson: "#2B0408", night: "#0D1030", dawn: "#5B2E5A", sun: "#FFD45A" };
  // passing straight between some pairs goes through mud; route them through a sunset or a dawn
  const VIA = { "paper>crimson": "ember", "paper>night": "dusk", "night>sun": "dawn", "sun>crimson": "ember", "crimson>sun": "ember" };
  const meta = $('meta[name="theme-color"]');

  function skyTween(from, to, trigger, start, end) {
    gsap.fromTo(root, STATES[from], {
      ...STATES[to], ease: "none", immediateRender: false,
      scrollTrigger: { trigger, start, end, scrub: 0.6, onUpdate: (s) => meta.setAttribute("content", BAR[s.progress > 0.5 ? to : from]) },
    });
  }
  function buildSky() {
    gsap.set(root, STATES.paper);
    root.dataset.mood = "paper";
    let prev = "paper";
    $$(".event").forEach((sec, i) => {
      const next = sec.dataset.sky, via = VIA[`${prev}>${next}`];
      // each card paints its own colours; the shared sky only changes across the gap between cards
      if (next !== prev) {
        if (via) {
          skyTween(prev, via, sec, "top 100%", "top 60%");
          skyTween(via, next, sec, "top 60%", "top 20%");
        } else skyTween(prev, next, sec, "top 95%", "top 25%");
      }
      // buttons, foil and form colours follow the event on screen
      ScrollTrigger.create({
        trigger: sec, start: "top 50%",
        onEnter: () => (root.dataset.mood = next),
        onLeaveBack: () => (root.dataset.mood = i ? $$(".event")[i - 1].dataset.sky : "paper"),
      });
      prev = next;
    });
  }

  function buildScroll() {
    buildStory();
    gsap.timeline({ scrollTrigger: { trigger: "#blessing", start: "top 72%" } })
      .add(drawTl($(".ganesha"), 1.6))
      .from("#blessing .ln", { autoAlpha: 0, y: 14, duration: 0.9, stagger: 0.22, ease: "power2.out" }, 0.6)
      .from("#blessing .divider", { scaleX: 0, duration: 1.1, ease: "power2.inOut" }, 1.2);

    $$(".event").forEach((sec) => {
      const title = $(".ev-title", sec);
      ScrollTrigger.create({ trigger: title, start: "top 82%", once: true, onEnter: () => (title._draw ? drawTl(title, 2.2) : gsap.from(title, { autoAlpha: 0, y: 20, duration: 1.2, ease: "power2.out" })) });
      $$("[data-reveal]:not([hidden])", sec).forEach((el) => gsap.from(el, { autoAlpha: 0, y: 18, duration: 1, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 90%" } }));
      gsap.from($(".divider", sec), { scaleX: 0, duration: 1, ease: "power2.inOut", scrollTrigger: { trigger: $(".divider", sec), start: "top 90%" } });
      const clock = $(".countdown:not([hidden]) .clock", sec);
      if (clock) gsap.from(clock.children, { autoAlpha: 0, y: 24, duration: 0.9, stagger: 0.1, ease: "power2.out", scrollTrigger: { trigger: clock, start: "top 85%" } });
    });

    const portrait = $(".portrait");
    gsap.from(portrait, { autoAlpha: 0, y: 60, duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: portrait, start: "top 85%" } });
    gsap.fromTo("#couple-photo", { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: portrait, start: "top bottom", end: "bottom top", scrub: true } });

    buildSky();
    gsap.from(".ornament", { autoAlpha: 0, scale: 0.7, duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: ".ornament", start: "top 90%" } });
    $$("#closing [data-reveal]").forEach((el) => gsap.from(el, { autoAlpha: 0, y: 18, duration: 1, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 92%" } }));
  }

  /* ================= the story ================= */
  // After the logo they come back out of the S and V and stay until the photo. Each event card ends in a
  // stage: when it fills the screen the page holds still and they act the event out in 3D. Meanwhile the
  // page drifts down on its own; any touch hands control to the guest, and it carries on after a pause.
  const SCENE_ART = Object.fromEntries(["engagement", "haldi", "wedding"].map((k) => [k, `<div class="ev-stage" data-scene="${k}" aria-hidden="true"></div>`]));

  let castBack = false;
  function castReturn() {
    if (castBack || reduced || !world) return;
    castBack = true;
    world.park(); world.hide();
    const field = dustField([$("#tgt-s"), $("#tgt-v")], [body("groom"), body("bride")], [GROOM_LIGHT, BRIDE_LIGHT], innerWidth < 600 ? 70 : 110);
    gsap.timeline()
      .to(field, { p: 1, duration: 1.4, ease: "none", onUpdate: field.render, onComplete: field.clear }, 0)
      .add(world.comeBack(), 0)
      // from here they live inside the page: behind its text, in front of its colours, moved only by scroll
      .call(() => { world.behindPage(true); buildMaster(); }, null, 3.6);
  }

  /* gold dust you can drive: motes travel from one set of boxes to another as p goes 0 -> 1 */
  function dustField(from, to, colors, n) {
    const rnd = (lo, hi) => lo + Math.random() * (hi - lo);
    const motes = [];
    from.forEach((_, k) => {
      for (let i = 0; i < n; i++) motes.push({ k, u0: rnd(0.15, 0.85), v0: rnd(0.1, 0.9), u1: rnd(0.2, 0.8), v1: rnd(0.08, 0.95),
        bx: rnd(-0.25, 0.25), by: rnd(0.05, 0.2), d: rnd(0, 0.35), dur: rnd(0.45, 0.65), r: rnd(0.8, 2.4), c: colors[k][i % colors[k].length] });
    });
    const f = { p: 0 };
    f.clear = () => ctx.clearRect(0, 0, innerWidth, innerHeight);
    f.render = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(innerWidth * dpr)) { canvas.width = Math.round(innerWidth * dpr); canvas.height = Math.round(innerHeight * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
      f.clear();
      if (f.p <= 0 || f.p >= 1) return;
      const A = from.map((el) => el.getBoundingClientRect()), Z = to.map((el) => el.getBoundingClientRect());
      for (const m of motes) {
        const q = Math.min(1, Math.max(0, (f.p - m.d) / m.dur));
        if (q <= 0 || q >= 1) continue;
        const a = A[m.k], z = Z[Math.min(m.k, Z.length - 1)];
        const sx = a.left + m.u0 * a.width, sy = a.top + m.v0 * a.height, ex = z.left + m.u1 * z.width, ey = z.top + m.v1 * z.height;
        const cx = (sx + ex) / 2 + m.bx * innerWidth, cy = Math.min(sy, ey) - m.by * innerHeight;
        const e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2, k = 1 - e;
        const x = k * k * sx + 2 * k * e * cx + e * e * ex, y = k * k * sy + 2 * k * e * cy + e * e * ey;
        ctx.globalAlpha = q < 0.15 ? q / 0.15 : q > 0.85 ? (1 - q) / 0.15 : 1;
        ctx.shadowColor = m.c; ctx.shadowBlur = 8; ctx.fillStyle = m.c;
        ctx.beginPath(); ctx.arc(x, y, m.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    };
    return f;
  }

  /* ---- the page drifts on its own; a touch hands over to the guest, and it carries on after a pause ---- */
  const auto = { on: false, idleUntil: 0, y: -1, set: -1 };
  const autoBtn = $("#auto");
  const scrollNow = () => (lenis ? lenis.scroll : scrollY);
  function setAuto(on) {
    auto.on = on; auto.y = -1; auto.idleUntil = 0;
    autoBtn.setAttribute("aria-pressed", String(on));
    autoBtn.setAttribute("aria-label", on ? "Stop scrolling by itself" : "Scroll by itself");
  }
  autoBtn.addEventListener("click", () => setAuto(!auto.on));
  // only actual scrolling hands over (a tap does not), and the drift picks up again a second after it stops,
  // including after a phone's momentum glide: any scroll we didn't make ourselves counts as the guest's
  const hold = () => { auto.idleUntil = performance.now() + 1000; auto.y = -1; };
  ["wheel", "touchmove"].forEach((t) => addEventListener(t, hold, { passive: true }));
  addEventListener("keydown", (e) => { if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key)) hold(); });
  addEventListener("scroll", () => { if (auto.set < 0 || Math.abs(scrollNow() - auto.set) > 3) hold(); }, { passive: true });
  gsap.ticker.add((time, dtMs) => {
    if (!auto.on || performance.now() < auto.idleUntil || !unlocked) return;
    const max = document.documentElement.scrollHeight - innerHeight, now = scrollNow();
    if (now >= max - 1) return; // at the end it just waits; scroll back up and it carries on
    if (auto.y < 0 || Math.abs(now - auto.y) > 4) auto.y = now;
    // a little quicker while a stage holds the screen, so the clips play at about their real speed
    const onStage = pins.some(({ st }) => now >= st.start && now < st.end);
    auto.y = Math.min(max, auto.y + innerHeight * (onStage ? 0.16 : 0.1) * (dtMs / 1000));
    auto.set = Math.round(auto.y);
    if (lenis) lenis.scrollTo(auto.y, { immediate: true, force: true }); else scrollTo(0, auto.y);
  });

  /* ---- one script for the whole page: every movement is tied to a scroll position, so it runs backwards too ---- */
  const STAGE_SCREENS = { engagement: 1.3, haldi: 1.25, wedding: 2.0 };
  const pins = [];
  let master = null, builtFor = "";
  function buildMaster() {
    if (!world || !castBack) return;
    const key = `${innerWidth}x${innerHeight}`;
    if (master && key === builtFor) return;
    builtFor = key;
    master?.st?.kill(); if (master) { gsap.killTweensOf(master); master.kill(); }
    world.layout(); world.resetPose();
    gsap.set("#couple-photo", { autoAlpha: 0 });
    const K = 0.01, top = (el) => el.getBoundingClientRect().top + scrollNow();
    const tl = gsap.timeline({ paused: true });
    // place a paused sub-timeline so it runs exactly between two scroll positions
    const put = (sub, from, to) => { const span = Math.max(0.05, (to - from) * K); sub.timeScale(sub.duration() / span).paused(false); tl.add(sub, Math.max(0, from * K)); };
    let floor = 0;
    const bl = $("#blessing");
    if (bl) { const t0 = top(bl); put(world.namaste(), t0 - innerHeight * 0.6, t0 + bl.offsetHeight * 0.55); floor = t0 + bl.offsetHeight * 0.55; }
    pins.forEach(({ name, st }) => {
      const s = world.scene(name), aFrom = Math.max(floor, st.start - innerHeight * 0.65);
      put(s.approach, aFrom, st.start);
      put(s.act, st.start, st.end);
      put(s.leave, st.end, st.end + innerHeight * 0.6);
      floor = st.end + innerHeight * 0.6;
    });
    // they walk to the middle, glow, and become the photograph
    const ph = pins.photo;
    if (ph) {
      const p = world.photo(), arch = $(".arch"), photo = $("#couple-photo");
      // they wait at the sides while the wedding details are read, and come together as the photo arrives
      const pFrom = Math.max(floor, ph.start - innerHeight * 0.6), cap = $(".portrait figcaption");
      // their names step aside while they stand in front of the arch, and return with the real photo
      p.approach.fromTo(cap, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.4, immediateRender: false }, 0);
      put(p.approach, pFrom, Math.max(pFrom + innerHeight * 0.3, ph.start));
      const fin = gsap.timeline({ paused: true });
      const field = dustField([body("groom"), body("bride")], [arch, arch], [GROOM_LIGHT, BRIDE_LIGHT], innerWidth < 600 ? 80 : 130);
      fin.add(p.act.paused(false), 0)
        .fromTo(field, { p: 0 }, { p: 1, duration: 1.3, ease: "none", immediateRender: false, onUpdate: field.render }, 0.3)
        .fromTo(photo, { autoAlpha: 0, filter: "brightness(1.6) blur(10px)" }, { autoAlpha: 1, filter: "brightness(1) blur(0px)", duration: 0.8, immediateRender: false }, 0.9)
        .fromTo(cap, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.6, immediateRender: false }, 1.3);
      put(fin, ph.start, ph.end);
    }
    master = tl;
    // timeline time = scroll position: down plays it, up rewinds it, and a fling just eases there
    tl.time(scrollNow() * K);
    master.st = ScrollTrigger.create({ start: 0, end: "max", onUpdate: (st) => gsap.to(tl, { time: st.scroll() * K, duration: lenis ? 0.35 : 0.5, ease: "power3.out", overwrite: true }) });
  }
  ScrollTrigger.addEventListener("refresh", () => { if (castBack && master) requestAnimationFrame(buildMaster); });

  // on phones the scenery can lean with the phone (iOS asks once, on the envelope tap)
  function askTilt() {
    const D = window.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === "function") D.requestPermission().catch(() => {});
  }

  // each event card ends in a stage that holds the screen while they act it out
  function buildStory() {
    if (reduced || !world) { $$(".ev-stage").forEach((el) => el.remove()); return; }
    $$(".ev-stage").forEach((el) => {
      const name = el.dataset.scene;
      pins.push({ name, st: ScrollTrigger.create({ trigger: el, start: "top top", end: () => "+=" + innerHeight * STAGE_SCREENS[name], pin: true, pinSpacing: true }) });
    });
    pins.photo = ScrollTrigger.create({ trigger: "#couple", start: "top top", end: () => "+=" + innerHeight * 0.6, pin: true, pinSpacing: true });
  }

  /* ================= countdown ================= */
  function startClock(sec, ev) {
    const start = new Date(ev.start), end = new Date(ev.end || ev.start);
    const cells = Object.fromEntries($$(".clock b", sec).map((b) => [b.dataset.u, b]));
    const label = $(".countdown .label", sec), pad = (n) => String(n).padStart(2, "0");
    const tick = () => {
      const now = Date.now(); let ms = start - now;
      if (ms <= 0) { label.textContent = now < end ? "The celebration has begun" : "Thank you for celebrating with us"; ms = 0; }
      const s = Math.floor(ms / 1000);
      cells.d.textContent = pad(Math.floor(s / 86400)); cells.h.textContent = pad(Math.floor((s % 86400) / 3600));
      cells.m.textContent = pad(Math.floor((s % 3600) / 60)); cells.s.textContent = pad(s % 60);
    };
    tick(); setInterval(tick, 1000);
  }

  /* ================= music ================= */
  const music = $("#music");
  function setMusicState(on) { music.setAttribute("aria-pressed", String(on)); music.setAttribute("aria-label", on ? "Pause music" : "Play music"); }
  function playMusic() {
    if (!audioOk || !audio) return;
    audio.volume = 0;
    audio.play().then(() => { music.hidden = false; gsap.to(audio, { volume: 0.6, duration: 1.8 }); })
      .catch(() => { music.hidden = false; setMusicState(false); });
  }
  music.addEventListener("click", () => { if (audio.paused) { audio.play(); setMusicState(true); } else { audio.pause(); setMusicState(false); } });
  document.addEventListener("visibilitychange", () => {
    if (!audio) return;
    if (document.hidden && !audio.paused) { audio.pause(); audio._auto = true; }
    else if (!document.hidden && audio._auto) { audio.play(); audio._auto = false; }
  });
  async function loadAudio(url) {
    audio = new Audio(); audio.loop = true; audio.preload = "auto";
    audio.addEventListener("error", () => { audioOk = false; music.hidden = true; });
    // stream it, and let the loader wait only until enough is buffered to start cleanly on the tap
    audio.src = url;
    // iPhones don't buffer before a tap, so never hold the loader for more than 2.5 s on the music
    await Promise.race([wait(2500), new Promise((res) => {
      audio.addEventListener("canplaythrough", res, { once: true }); audio.addEventListener("error", res, { once: true }); audio.load();
    })]);
  }

  /* ================= boot: everything loads behind the ॐ ================= */
  async function boot() {
    const t0 = performance.now();
    const ring = $("#ring");
    let done = 0, total = 0;
    const track = (p) => { total++; return Promise.resolve(p).catch(() => {}).finally(() => { done++; ring.style.strokeDashoffset = String(1 - done / total); }); };

    let data;
    try {
      const res = await fetch(`/invites/${linkId}.json`, { cache: "no-store" });
      if (!res.ok) throw new Error(res.status);
      data = await res.json();
    } catch { if (linkId !== "main") { location.replace("/"); return; } throw new Error("invite data missing"); }
    build(data);

    const loadImg = (src) => { const i = new Image(); i.src = src; return i.decode(); };
    const work = [track(document.fonts.ready), track(inlineArt()), track(loadAudio(C.music)), track(Promise.race([worldReady, wait(8000)]).then((w) => (world = w || null))),
      ...[C.couplePhoto, ...$$(".lg").map((i) => i.getAttribute("src"))].map((s) => track(loadImg(s)))];
    await Promise.race([Promise.all(work), wait(7000)]);
    await Promise.race([document.fonts.ready, wait(2000)]);
    const left = 1300 - (performance.now() - t0);
    if (left > 0) await wait(left);

    $$(".art.draw").forEach(prepDraw);
    LOGO_HIDDEN();
    buildScroll();
    gsap.to("#preload", { autoAlpha: 0, duration: 0.45, onComplete: () => $("#preload").remove() });
    showGate();
  }
  boot();
})();
