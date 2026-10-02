/* #RViShcametrue - Shrinav weds Vidushi. Content comes from /invites/<link>.json (built by tools/build_invites.py). */
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
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
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
      $(".doha", sec).hidden = ev.key !== "wedding";
      const title = $(".ev-title", sec);
      if (ev.titleArt) { title.classList.add("art", "draw", "foil"); title.dataset.svg = ev.titleArt; }
      else title.innerHTML = `<p class="title-text">${ev.title}</p>`;
      const fill = (sel, v) => { const el = $(sel, sec); if (v) el.textContent = v; else el.hidden = true; };
      fill(".ev-date", ev.dateLine); fill(".ev-time", ev.timeLine); fill(".ev-venue", ev.venue); fill(".ev-venue-line", ev.venueLine);
      const maps = $(".ev-maps", sec);
      if (ev.mapsQuery) maps.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(ev.mapsQuery); else maps.hidden = true;
      const cal = $(".ev-cal", sec);
      if (ev.start) cal.addEventListener("click", () => addToCalendar(ev)); else cal.hidden = true;
      if (!ev.mapsQuery && !ev.start) $(".actions", sec).hidden = true;
      if (ev.countdown && ev.start) { $(".countdown", sec).hidden = false; startClock(sec, ev); }
      addLights($(".lights", sec), ev.lights);
      $("#events").appendChild(sec);
    });

    $("#couple-photo").src = C.couplePhoto;
    $("#deck").innerHTML = C.moments.map((src) => `<div class="ph"><img src="${src}" alt="" decoding="async"></div>`).join("");
    if (!C.moments.length) $("#moments").hidden = true;
    $$(".arch img, .ph img").forEach((img) => img.addEventListener("error", () => img.parentElement.classList.add("is-empty"), { once: true }));

    buildRsvp();
  }

  function addLights(svg, kind) {
    const g = $(".bulbs", svg), flower = kind === "marigold";
    $$(".wire", svg).forEach((wire, wi) => {
      const len = wire.getTotalLength(), n = flower ? 16 : 22;
      for (let i = 1; i < n; i++) {
        const pt = wire.getPointAtLength((len * i) / n);
        const c = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        c.setAttribute("cx", pt.x.toFixed(1)); c.setAttribute("cy", (pt.y + (flower ? 3 : 2.2)).toFixed(1));
        c.setAttribute("rx", flower ? 3.2 : 1.1); c.setAttribute("ry", flower ? 3.6 : 2.4);
        c.setAttribute("class", "bulb"); c.dataset.i = i;
        g.appendChild(c);
      }
    });
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

  /* ================= characters ================= */
  // pivots in each character's 200x400 drawing space
  const PIV = { legL: "88 290", legR: "112 290", armL: "64 182", armR: "136 182", head: "100 150", body: "100 300", rig: "100 390" };
  const part = (actor, name) => $(`.${name}`, actor);

  function walkCycle(a, dir) {
    const L = part(a, "legL"), R = part(a, "legR"), aL = part(a, "armL"), aR = part(a, "armR");
    const rig = part(a, "rig"), head = part(a, "head"), hem = part(a, "hem");
    gsap.set(L, { svgOrigin: PIV.legL }); gsap.set(R, { svgOrigin: PIV.legR });
    gsap.set(aL, { svgOrigin: PIV.armL }); gsap.set(aR, { svgOrigin: PIV.armR });
    gsap.set(head, { svgOrigin: PIV.head }); gsap.set(hem, { svgOrigin: PIV.body }); gsap.set(rig, { svgOrigin: PIV.rig });
    const d = { ease: "sine.inOut", duration: 0.22 };
    return gsap.timeline({ repeat: -1 })
      .to(L, { ...d, rotation: 16 * dir, y: -9 }, 0).to(R, { ...d, rotation: -8 * dir, y: 0 }, 0)
      .to([aL, aR], { ...d, rotation: -18 * dir }, 0).to(rig, { ...d, y: -8 }, 0)
      .to(head, { ...d, rotation: 3 * dir }, 0).to(hem, { ...d, skewX: -3 * dir }, 0)
      .to(L, { ...d, rotation: -8 * dir, y: 0 }, 0.22).to(R, { ...d, rotation: 16 * dir, y: -9 }, 0.22)
      .to([aL, aR], { ...d, rotation: 18 * dir }, 0.22).to(rig, { ...d, y: 0 }, 0.22)
      .to(head, { ...d, rotation: -3 * dir }, 0.22).to(hem, { ...d, skewX: 3 * dir }, 0.22);
  }
  function settle(a) {
    const parts = ["legL", "legR", "armL", "armR", "head", "hem"].map((n) => part(a, n));
    return gsap.timeline()
      .to(parts, { rotation: 0, y: 0, skewX: 0, duration: 0.25, ease: "power2.out" }, 0)
      .to(part(a, "rig"), { y: 0, scaleY: 0.94, scaleX: 1.04, duration: 0.1, ease: "power2.out" }, 0)
      .to(part(a, "rig"), { scaleY: 1, scaleX: 1, duration: 0.45, ease: "elastic.out(1.2, 0.4)" }, 0.1);
  }

  /* ================= the envelope ================= */
  let walks = [], idles = [];
  function showGate() {
    const gate = $("#gate");
    gate.hidden = false;
    const groom = $("#a-groom"), bride = $("#a-bride");
    gsap.set([groom, bride], { xPercent: -50 });
    if (reduced) return;
    gsap.from(".env", { autoAlpha: 0, scale: 1.04, duration: 0.5, ease: "power2.out" });
    gsap.from([".thread", ".knot"], { autoAlpha: 0, duration: 0.4, delay: 0.2 });
    gsap.from("#hint", { autoAlpha: 0, duration: 0.6, delay: 1.3 });
    // they walk in from the two edges and wait by the thread
    [[groom, -1], [bride, 1]].forEach(([a, side], i) => {
      const w = walkCycle(a, -side);
      walks.push(w);
      gsap.fromTo(a, { x: side * innerWidth * 0.6 }, {
        x: 0, duration: 1.25, ease: "power1.out", delay: 0.15 + i * 0.12,
        onComplete: () => { w.kill(); settle(a); idles.push(gsap.to(part(a, "body"), { scaleY: 1.015, svgOrigin: PIV.body, duration: 1.2, yoyo: true, repeat: -1, ease: "sine.inOut" })); },
      });
    });
    const open = () => openEnvelope();
    $("#open").addEventListener("click", open, { once: true });
  }

  function openEnvelope() {
    playMusic(); // inside the tap, so phones allow sound
    const groom = $("#a-groom"), bride = $("#a-bride");
    walks.forEach((w) => w.kill()); idles.forEach((t) => t.kill());
    gsap.killTweensOf([groom, bride]);
    gsap.set([groom, bride], { x: 0 });
    $$(".rig > g, .rig", $("#cast")).forEach((g) => gsap.set(g, { rotation: 0, y: 0, skewX: 0, scale: 1 }));
    if (reduced) { $("#gate").remove(); $("#cast").remove(); revealHero(true); unlock(); return; }

    const gR = part(groom, "armR"), bL = part(bride, "armL");
    const tl = gsap.timeline();
    tl.to("#hint", { autoAlpha: 0, duration: 0.15 }, 0)
      // reach for the thread
      .to(gR, { rotation: -98, svgOrigin: PIV.armR, duration: 0.3, ease: "back.out(1.6)" }, 0)
      .to(bL, { rotation: 98, svgOrigin: PIV.armL, duration: 0.3, ease: "back.out(1.6)" }, 0.03)
      .to([part(groom, "rig"), part(bride, "rig")], { y: -12, svgOrigin: PIV.rig, duration: 0.15, yoyo: true, repeat: 1, ease: "power2.out" }, 0)
      // and pull it apart
      .to(groom, { x: -36, duration: 0.38, ease: "power2.in" }, 0.33)
      .to(bride, { x: 36, duration: 0.38, ease: "power2.in" }, 0.33)
      .to(part(groom, "rig"), { rotation: -7, svgOrigin: PIV.rig, duration: 0.3 }, 0.33)
      .to(part(bride, "rig"), { rotation: 7, svgOrigin: PIV.rig, duration: 0.3 }, 0.33)
      .to(".th-l, .th-r", { scaleX: 0, duration: 0.38, ease: "power2.in" }, 0.4)
      .to(".knot", { scale: 1.25, duration: 0.1, ease: "power2.out" }, 0.42)
      .to(".knot", { y: innerHeight * 0.6, rotation: 140, autoAlpha: 0, duration: 0.55, ease: "power2.in" }, 0.52)
      .to([gR, bL, part(groom, "rig"), part(bride, "rig")], { rotation: 0, duration: 0.3, ease: "power2.out" }, 0.8)
      // the envelope opens
      .to(".env-flap", { rotationX: 180, duration: 0.55, ease: "power2.inOut" }, 0.75)
      .to(".env-flap", { autoAlpha: 0, duration: 0.15 }, 1.15)
      .to(".env-body", { yPercent: 100, duration: 0.6, ease: "power3.in" }, 1.05)
      .call(() => $("#gate").remove(), null, 1.7)
      .add(absorb(), 1.7);
  }

  /* the two of them jump into "Sh" and "Vi" of the hashtag */
  function absorb() {
    const pairs = [[$("#a-groom"), $("#tg-sh"), 360], [$("#a-bride"), $("#tg-vi"), -360]];
    const tl = gsap.timeline({ onComplete: () => { $("#cast").remove(); } });
    pairs.forEach(([a, target, spin], i) => {
      const at = i * 0.12;
      tl.call(() => {
        const ar = a.getBoundingClientRect(), tr = target.getBoundingClientRect();
        const dx = tr.left + tr.width / 2 - (ar.left + ar.width / 2);
        const dy = tr.top + tr.height / 2 - (ar.top + ar.height / 2);
        const sc = (tr.height * 1.1) / ar.height;
        gsap.timeline()
          .to(a, { y: -50, duration: 0.2, ease: "power2.out" })
          .to(a, { x: `+=${dx}`, y: dy, scale: sc, rotation: spin, transformOrigin: "50% 50%", duration: 0.55, ease: "power2.in" })
          .to(a, { autoAlpha: 0, duration: 0.1 }, "-=0.08")
          .fromTo(target, { autoAlpha: 0, scale: 0.2 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(3)" }, "-=0.1")
          .call(() => pop(tr, getComputedStyle(target).color), null, "<");
      }, null, at);
    });
    tl.add(revealHero(), 0.95).call(unlock, null, 1.05);
    return tl;
  }
  function pop(r, color) {
    const d = document.createElement("div");
    Object.assign(d.style, {
      position: "fixed", left: `${r.left + r.width / 2}px`, top: `${r.top + r.height / 2}px`, width: "20px", height: "20px",
      margin: "-10px 0 0 -10px", borderRadius: "50%", border: `3px solid ${color}`, zIndex: 65, pointerEvents: "none",
    });
    document.body.appendChild(d);
    gsap.fromTo(d, { scale: 0.3, opacity: 1 }, { scale: Math.max(r.width, r.height) / 9, opacity: 0, duration: 0.6, ease: "power2.out", onComplete: () => d.remove() });
  }

  /* ================= hero + scroll ================= */
  function revealHero(instant) {
    const tl = gsap.timeline();
    if (instant) { gsap.set(".tg, .names, .hero-date, .hero-place, .cue", { autoAlpha: 1 }); drawTl($(".names"), 0).progress(1); return tl; }
    tl.fromTo(".tg-hash, .tg-r, .tag-2", { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.09, ease: "back.out(2)" }, 0)
      .fromTo(".bell", { yPercent: -110 }, { yPercent: 0, duration: 1.3, ease: "back.out(1.4)", stagger: 0.12 }, 0.1)
      .set(".names", { autoAlpha: 1 }, 0.3)
      .add(drawTl($(".names"), 1.8), 0.3)
      .fromTo(".hero-date, .hero-place", { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.12 }, 1.4)
      .fromTo(".cue", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, 2);
    $$(".bell").forEach((b, i) => {
      gsap.fromTo(b, { rotation: i ? 2.2 : -2.2 }, { rotation: i ? -2.2 : 2.2, duration: 2.4 + i * 0.35, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.2, transformOrigin: "50% 0" });
    });
    const kick = $$(".bell-art").map((b) => gsap.quickTo(b, "rotation", { duration: 1.4, ease: "elastic.out(1, 0.3)" }));
    ScrollTrigger.create({ trigger: "#hero", start: "top top", end: "bottom top", onUpdate: (s) => { const v = gsap.utils.clamp(-9, 9, s.getVelocity() / 260); kick.forEach((k, i) => k(i ? -v : v)); } });
    return tl;
  }
  function unlock() {
    root.classList.remove("is-locked");
    lenis?.start();
    ScrollTrigger.refresh();
  }

  const STATES = {
    paper: { "--sky-top": "#F6EFE2", "--sky-bot": "#EFE5D2", "--fg": "#2A1D1A", "--fg-soft": "#6B564A", "--line": "#2A1D1A", "--gold": "#9A6A1E", "--stars": 0, "--horizon": 0, "--grain": 0.5 },
    dusk: { "--sky-top": "#4A3561", "--sky-bot": "#D98A6A", "--fg": "#FFF3E4", "--fg-soft": "#F2D9C6", "--line": "#F6D596", "--gold": "#F6D596", "--stars": 0.25, "--horizon": 0.6, "--grain": 0.25 },
    night: { "--sky-top": "#0D1030", "--sky-bot": "#241C47", "--fg": "#F6ECD8", "--fg-soft": "#C9BDA8", "--line": "#E2B35C", "--gold": "#E2B35C", "--stars": 1, "--horizon": 1, "--grain": 0.12 },
    rose: { "--sky-top": "#2E1433", "--sky-bot": "#9A3F5E", "--fg": "#FCEEE8", "--fg-soft": "#EBC9CF", "--line": "#F2C46D", "--gold": "#F2C46D", "--stars": 0.45, "--horizon": 0.7, "--grain": 0.15 },
    sun: { "--sky-top": "#FFE79A", "--sky-bot": "#F6B347", "--fg": "#2A1A08", "--fg-soft": "#5E3E14", "--line": "#5A300A", "--gold": "#8F520A", "--stars": 0, "--horizon": 0.9, "--grain": 0.3 },
  };
  const BAR = { paper: "#F6EFE2", dusk: "#4A3561", night: "#0D1030", rose: "#2E1433", sun: "#FFE79A" };
  const meta = $('meta[name="theme-color"]');

  function skyTween(from, to, trigger, start, end) {
    gsap.fromTo(root, STATES[from], {
      ...STATES[to], ease: "none", immediateRender: false,
      scrollTrigger: { trigger, start, end, scrub: 0.6, onUpdate: (s) => meta.setAttribute("content", BAR[s.progress > 0.5 ? to : from]) },
    });
  }
  function buildSky() {
    gsap.set(root, STATES.paper);
    let prev = "paper";
    $$(".event").forEach((sec) => {
      const next = sec.dataset.sky;
      if (next === prev) return;
      if (prev === "paper" && next === "night") {
        skyTween("paper", "dusk", "#invite", "bottom 85%", "bottom 30%");
        skyTween("dusk", "night", sec, "top 85%", "top 35%");
      } else skyTween(prev, next, sec, "top 70%", "top 30%");
      prev = next;
    });
  }

  function buildScroll() {
    gsap.timeline({ scrollTrigger: { trigger: "#blessing", start: "top 72%" } })
      .add(drawTl($(".ganesha"), 1.6))
      .from("#blessing .ln", { autoAlpha: 0, y: 14, duration: 0.9, stagger: 0.22, ease: "power2.out" }, 0.6)
      .from("#blessing .divider", { scaleX: 0, duration: 1.1, ease: "power2.inOut" }, 1.2);
    gsap.timeline({ scrollTrigger: { trigger: ".frame", start: "top 78%" } })
      .from(".frame", { autoAlpha: 0, scale: 0.97, duration: 1.1, ease: "power2.out" })
      .from(".corner", { autoAlpha: 0, scale: 0.6, duration: 1.2, stagger: 0.1, ease: "power3.out" }, 0.2);
    $$(".frame [data-reveal]:not([hidden])").forEach((el) => gsap.from(el, { autoAlpha: 0, y: 16, duration: 0.9, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 88%" } }));
    $$(".name").forEach((n) => gsap.from($$(".ch", n), { yPercent: 60, autoAlpha: 0, rotation: 4, duration: 0.9, ease: "power3.out", stagger: 0.035, scrollTrigger: { trigger: n, start: "top 86%" } }));

    $$(".event").forEach((sec) => {
      const bulbs = $$(".bulb", sec).sort((a, b) => a.dataset.i - b.dataset.i);
      ScrollTrigger.create({
        trigger: sec, start: "top 45%",
        onEnter: () => bulbs.forEach((b, i) => gsap.delayedCall(i * 0.03 + Math.random() * 0.15, () => b.classList.add("on"))),
        onLeaveBack: () => bulbs.forEach((b) => b.classList.remove("on")),
      });
      if (!$(".doha", sec).hidden) gsap.from($$(".doha .ln", sec), { autoAlpha: 0, y: 14, duration: 0.9, stagger: 0.2, ease: "power2.out", scrollTrigger: { trigger: $(".doha", sec), start: "top 80%" } });
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

    const prints = $$(".ph");
    if (prints.length) {
      const vw = () => Math.min(innerWidth, 900), mid = (prints.length - 1) / 2;
      const scatterAt = [[-0.55, -0.42, -24], [0.6, -0.3, 18], [-0.62, 0.38, 14], [0.55, 0.45, -20], [0.02, 0.7, 8]];
      prints.forEach((p, i) => {
        const [sx, sy, sr] = scatterAt[i % scatterAt.length];
        gsap.set(p, { x: () => sx * vw(), y: () => sy * innerHeight, rotation: sr, scale: 0.78, zIndex: 10 - Math.round(Math.abs(i - mid) * 2) });
      });
      const mtl = gsap.timeline({ scrollTrigger: { trigger: "#moments", start: "top top", end: "+=140%", pin: ".stage", scrub: 0.8, invalidateOnRefresh: true } });
      prints.forEach((p, i) => {
        const off = i - mid;
        mtl.to(p, { x: () => off * 0.17 * Math.min(vw(), 560), y: () => Math.abs(off) * 0.012 * innerHeight, rotation: off * 7, scale: 1, ease: "power2.out", duration: 1 }, i * 0.14);
      });
      mtl.fromTo(".moments-title", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.1);
    }
    buildSky();
    gsap.from(".rsvp > :not([hidden])", { autoAlpha: 0, y: 20, duration: 0.9, stagger: 0.12, ease: "power2.out", scrollTrigger: { trigger: "#rsvp", start: "top 80%" } });
    gsap.from(".ornament", { autoAlpha: 0, scale: 0.7, duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: ".ornament", start: "top 90%" } });
    $$("#closing [data-reveal]").forEach((el) => gsap.from(el, { autoAlpha: 0, y: 18, duration: 1, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 92%" } }));
  }

  /* ================= countdown + calendar ================= */
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
  function addToCalendar(ev) {
    const z = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const start = new Date(ev.start), end = new Date(ev.end || ev.start);
    const title = `Shrinav & Vidushi - ${ev.title}`, where = [ev.venue, ev.venueLine].filter(Boolean).join(", ");
    const details = `#RViShcametrue · With best compliments, ${C.family}. ${location.origin}${location.pathname}`;
    if (/iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) && "ontouchend" in document) {
      const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//rvishcametrue//EN", "BEGIN:VEVENT", `UID:${ev.key}@rvishcametrue.us`,
        `DTSTAMP:${z(new Date())}`, `DTSTART:${z(start)}`, `DTEND:${z(end)}`, `SUMMARY:${title}`, `LOCATION:${where}`, `DESCRIPTION:${details}`,
        "END:VEVENT", "END:VCALENDAR"].join("\r\n");
      location.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
    } else {
      const u = new URL("https://calendar.google.com/calendar/render");
      Object.entries({ action: "TEMPLATE", text: title, dates: `${z(start)}/${z(end)}`, location: where, details }).forEach(([k, v]) => u.searchParams.set(k, v));
      window.open(u.toString(), "_blank", "noopener");
    }
  }

  /* ================= RSVP: one reply per event on this link ================= */
  function buildRsvp() {
    const form = $("#rsvp-form"), done = $("#rsvp-done"), err = $("#rsvp-error");
    const guestsField = $("#guests-field"), out = $("#r-guests"), submit = $("#rsvp-submit");
    const store = `rsvp:${linkId}`, single = EVENTS.length === 1;
    $("#replies").innerHTML = EVENTS.map((ev) => `
      <fieldset class="field ev-reply">
        <legend class="ev-name">${single ? "Will you attend?" : ev.short}</legend>
        <div class="choice">
          <label class="pill"><input type="radio" name="att-${ev.key}" value="yes"><span>${single ? "Yes, we'll be there" : "Attending"}</span></label>
          <label class="pill"><input type="radio" name="att-${ev.key}" value="no"><span>${single ? "Sorry, can't make it" : "Can't make it"}</span></label>
        </div>
      </fieldset>`).join("");
    let guests = 1;
    const setGuests = (n) => { guests = Math.max(1, Math.min(15, n)); out.textContent = guests; };
    if (guest) $("#r-name").value = guest;
    form.addEventListener("change", () => {
      guestsField.hidden = !EVENTS.some((ev) => new FormData(form).get(`att-${ev.key}`) === "yes");
      ScrollTrigger.refresh();
    });
    $$(".stepper button").forEach((b) => b.addEventListener("click", () => setGuests(guests + Number(b.dataset.step))));

    const listOf = (names) => names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
    function showDone(r) {
      const first = r.name.trim().split(/\s+/)[0];
      const yes = EVENTS.filter((ev) => r.replies[ev.key]).map((ev) => ev.short);
      $("#done-title").textContent = yes.length ? `Thank you, ${first}!` : `Thank you, ${first}.`;
      $("#done-sub").textContent = yes.length
        ? `We've noted ${r.guests} ${r.guests > 1 ? "guests" : "guest"} for the ${listOf(yes)}.`
        : "We'll miss you. Your blessings mean a lot to the family.";
      form.hidden = true; done.hidden = false; ScrollTrigger.refresh();
    }
    try { const saved = JSON.parse(localStorage.getItem(store) || "null"); if (saved?.replies) showDone(saved); } catch {}
    $("#rsvp-change").addEventListener("click", () => { done.hidden = true; form.hidden = false; ScrollTrigger.refresh(); $("#r-name").focus(); });

    form.addEventListener("submit", async (e) => {
      e.preventDefault(); err.hidden = true;
      const fd = new FormData(form), name = (fd.get("name") || "").toString().trim();
      if (!name) { err.textContent = "Please add your name so the family knows who replied."; err.hidden = false; $("#r-name").focus(); return; }
      const missing = EVENTS.find((ev) => !fd.get(`att-${ev.key}`));
      if (missing) { err.textContent = single ? "Please choose whether you'll attend." : `Please choose yes or no for the ${missing.short}.`; err.hidden = false; return; }
      const replies = Object.fromEntries(EVENTS.map((ev) => [ev.key, fd.get(`att-${ev.key}`) === "yes"]));
      const anyYes = Object.values(replies).some(Boolean);
      const reply = { name, replies, guests: anyYes ? guests : 0 };
      if (fd.get("website")) { showDone(reply); return; } // a bot filled the hidden field
      submit.disabled = true; submit.textContent = "Sending…";
      try {
        await Promise.all(EVENTS.map(async (ev) => {
          const res = await fetch(`${C.supabaseUrl}/rest/v1/rpc/submit_wedding_rsvp`, {
            method: "POST", headers: { "Content-Type": "application/json", apikey: C.supabaseKey },
            body: JSON.stringify({ p_event: ev.key, p_name: name, p_phone: (fd.get("phone") || "").toString(), p_attending: replies[ev.key],
              p_guests: replies[ev.key] ? guests : 0, p_message: (fd.get("message") || "").toString(), p_invite_label: guest || null }),
          });
          if (!res.ok) throw new Error(await res.text());
        }));
        try { localStorage.setItem(store, JSON.stringify(reply)); } catch {}
        showDone(reply); done.focus({ preventScroll: true });
      } catch {
        err.textContent = "Your reply didn't send. Check your connection and try again."; err.hidden = false;
      } finally { submit.disabled = false; submit.textContent = "Send reply"; }
    });
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
    try { audio.src = URL.createObjectURL(await (await fetch(url)).blob()); } // fully buffered, so it starts on the tap
    catch { audio.src = url; }
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
    const work = [track(document.fonts.ready), track(inlineArt()), track(loadAudio(C.music)),
      ...[C.couplePhoto, ...C.moments].map((s) => track(loadImg(s)))];
    await Promise.race([Promise.all(work), wait(7000)]);
    await document.fonts.ready;
    const left = 1300 - (performance.now() - t0);
    if (left > 0) await wait(left);

    $$(".art.draw").forEach(prepDraw);
    gsap.set(".tg, .names, .hero-date, .hero-place, .cue", { autoAlpha: 0 });
    buildScroll();
    gsap.to("#preload", { autoAlpha: 0, duration: 0.45, onComplete: () => $("#preload").remove() });
    showGate();
  }
  boot();
})();
