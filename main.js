/* Vidushi weds Shrinav - motion + behaviour */
(() => {
  const EVENT_START = new Date("2026-12-12T20:00:00+05:30");
  const EVENT_END = new Date("2026-12-13T02:00:00+05:30");
  const VENUE = "Royal Heritage, Country Inn & Suites, Ghaziabad";
  const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("Royal Heritage Country Inn & Suites Ghaziabad");
  const MUSIC_SRC = "assets/audio/theme.mp3";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;

  // The printed card has "To, ____". The link fills it: yourdomain/?to=Sharma%20Family
  const guest = new URLSearchParams(location.search).get("to");
  if (guest && guest.trim()) $("#guest").textContent = guest.trim().slice(0, 60);

  $("#directions").href = MAPS_URL;
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) $(".env-hint").textContent = "Click the seal to open";

  // Missing photos fall back to the monogram on card stock.
  $$(".arch img, .ph img").forEach((img) => {
    const mark = () => img.parentElement.classList.add("is-empty");
    if (img.complete && img.naturalWidth === 0) mark();
    img.addEventListener("error", mark, { once: true });
  });

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

  /* ---------- inline the drawn art ---------- */
  const svgCache = {};
  const inlineArt = () =>
    Promise.all(
      $$("[data-svg]").map(async (el) => {
        const name = el.dataset.svg;
        svgCache[name] ??= fetch(`assets/art/${name}.svg`).then((r) => r.text());
        el.innerHTML = await svgCache[name];
        const svg = el.querySelector("svg");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
      })
    );

  function prepDraw(el) {
    const paths = $$("path:not(.k)", el);
    paths.forEach((p) => {
      const len = Math.ceil(p.getTotalLength()) + 1;
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
      p.style.fillOpacity = 0;
    });
    const knock = $$("path.k", el);
    if (knock.length) gsap.set(knock, { opacity: 0 });
    return { paths, knock };
  }

  function drawTl(el, dur = 2) {
    const { paths, knock } = el._draw;
    return gsap
      .timeline()
      .to(paths, { strokeDashoffset: 0, duration: dur, ease: "power1.inOut", stagger: { amount: dur * 0.55 } })
      .to(paths, { fillOpacity: 1, duration: 0.9, ease: "power1.out", stagger: { amount: 0.5 } }, `-=${dur * 0.55}`)
      .to(paths, { strokeOpacity: 0, duration: 0.8 }, "<+0.4")
      .to(knock.length ? knock : {}, { opacity: 1, duration: 0.4 }, "<");
  }

  /* ---------- name letters ---------- */
  $$("[data-split]").forEach((h) => {
    const words = h.textContent.trim().split(/\s+/);
    h.setAttribute("aria-label", h.textContent.trim());
    h.innerHTML = words
      .map((w) => `<span class="w" aria-hidden="true">${[...w].map((c) => `<span class="ch">${c}</span>`).join("")}</span>`)
      .join(" ");
  });

  /* ---------- fairy lights along the wires ---------- */
  (() => {
    const g = $(".lights .bulbs");
    $$(".lights .wire").forEach((wire, wi) => {
      const len = wire.getTotalLength();
      const n = 22;
      for (let i = 1; i < n; i++) {
        const pt = wire.getPointAtLength((len * i) / n);
        const c = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        c.setAttribute("cx", pt.x.toFixed(1));
        c.setAttribute("cy", (pt.y + 2.2).toFixed(1));
        c.setAttribute("rx", 1.1);
        c.setAttribute("ry", 2.4);
        c.setAttribute("class", "bulb");
        c.dataset.i = wi * 100 + i;
        g.appendChild(c);
      }
    });
  })();

  /* ---------- the evening: sky + ink tween with scroll ---------- */
  const DAY = { "--sky-top": "#F6EFE2", "--sky-bot": "#EFE5D2", "--fg": "#2A1D1A", "--fg-soft": "#6B564A", "--line": "#2A1D1A", "--stars": 0, "--horizon": 0, "--grain": 0.5 };
  const DUSK = { "--sky-top": "#4A3561", "--sky-bot": "#D98A6A", "--fg": "#FFF3E4", "--fg-soft": "#F2D9C6", "--line": "#F6D596", "--stars": 0.25, "--horizon": 0.6, "--grain": 0.25 };
  const NIGHT = { "--sky-top": "#0D1030", "--sky-bot": "#241C47", "--fg": "#F6ECD8", "--fg-soft": "#C9BDA8", "--line": "#E2B35C", "--stars": 1, "--horizon": 1, "--grain": 0.12 };
  const meta = $('meta[name="theme-color"]');

  function buildSky() {
    // created after the gallery pin so their positions include its pin spacing
    gsap.fromTo(root, DAY, {
      ...DUSK, ease: "none",
      scrollTrigger: { trigger: "#moments", start: "top 75%", end: "top top", scrub: 0.6 },
    });
    gsap.fromTo(root, DUSK, {
      ...NIGHT, ease: "none", immediateRender: false,
      scrollTrigger: {
        trigger: "#ceremony", start: "top 95%", end: "top 30%", scrub: 0.6,
        onUpdate: (self) => meta.setAttribute("content", self.progress > 0.5 ? "#0D1030" : "#F6EFE2"),
      },
    });
  }

  /* ---------- hero entrance (after the envelope opens) ---------- */
  function heroIn() {
    const tl = gsap.timeline();
    tl.from(".bell", { yPercent: -110, duration: 1.4, ease: "back.out(1.4)", stagger: 0.12 }, 0)
      .add(drawTl($(".monogram"), 2.1), 0.3)
      .add(drawTl($(".names"), 2.2), 1.3)
      .from(".hero-date, .hero-place", { autoAlpha: 0, y: 12, duration: 1, stagger: 0.15, ease: "power2.out" }, 3.2)
      .from(".cue", { autoAlpha: 0, duration: 1 }, 3.8);

    // bells keep swinging; scroll speed gives them an extra nudge
    $$(".bell").forEach((b, i) => {
      gsap.fromTo(b, { rotation: i ? 2.2 : -2.2 }, { rotation: i ? -2.2 : 2.2, duration: 2.4 + i * 0.35, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.2 });
    });
    const kick = $$(".bell-art").map((a) => gsap.quickTo(a, "rotation", { duration: 1.4, ease: "elastic.out(1, 0.3)" }));
    ScrollTrigger.create({
      trigger: "#hero", start: "top top", end: "bottom top",
      onUpdate: (self) => {
        const v = gsap.utils.clamp(-9, 9, self.getVelocity() / 260);
        kick.forEach((k, i) => k(i ? -v : v));
      },
    });
    return tl;
  }

  /* ---------- scroll choreography ---------- */
  function buildScroll() {

    // blessing
    const ganesha = $(".ganesha");
    gsap.timeline({ scrollTrigger: { trigger: "#blessing", start: "top 72%" } })
      .add(drawTl(ganesha, 1.6))
      .from("#blessing .ln", { autoAlpha: 0, y: 14, duration: 0.9, stagger: 0.22, ease: "power2.out" }, 0.6)
      .from("#blessing .divider", { scaleX: 0, duration: 1.1, ease: "power2.inOut" }, 1.2);

    // invitation frame + text
    gsap.timeline({ scrollTrigger: { trigger: ".frame", start: "top 78%" } })
      .from(".frame", { autoAlpha: 0, scale: 0.97, duration: 1.1, ease: "power2.out" })
      .from(".corner", { autoAlpha: 0, scale: 0.6, duration: 1.2, stagger: 0.1, ease: "power3.out" }, 0.2);

    $$(".frame [data-reveal]").forEach((el) =>
      gsap.from(el, { autoAlpha: 0, y: 16, duration: 0.9, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 88%" } })
    );
    $$(".name").forEach((n) =>
      gsap.from($$(".ch", n), {
        yPercent: 60, autoAlpha: 0, rotation: 4, duration: 0.9, ease: "power3.out", stagger: 0.035,
        scrollTrigger: { trigger: n, start: "top 86%" },
      })
    );

    // portraits: arch rises, photo drifts inside it
    $$(".portrait").forEach((p) => {
      gsap.from(p, { autoAlpha: 0, y: 60, duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: p, start: "top 85%" } });
      const img = $("img", p);
      gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: "none", scrollTrigger: { trigger: p, start: "top bottom", end: "bottom top", scrub: true } });
    });

    // moments: scattered prints gather into a fanned stack
    const prints = $$(".ph");
    const vw = () => Math.min(innerWidth, 900);
    const scatter = [
      { x: -0.55, y: -0.42, r: -24 }, { x: 0.6, y: -0.3, r: 18 }, { x: -0.62, y: 0.38, r: 14 },
      { x: 0.55, y: 0.45, r: -20 }, { x: 0.02, y: 0.7, r: 8 },
    ];
    const fan = [
      { x: -0.2, y: 0.02, r: -11 }, { x: 0.2, y: 0.03, r: 10 }, { x: -0.09, y: -0.01, r: -5 },
      { x: 0.09, y: 0.0, r: 4 }, { x: 0, y: -0.02, r: 0 },
    ];
    prints.forEach((p, i) => gsap.set(p, { x: () => scatter[i].x * vw(), y: () => scatter[i].y * innerHeight, rotation: scatter[i].r, scale: 0.78 }));
    const mtl = gsap.timeline({
      scrollTrigger: { trigger: "#moments", start: "top top", end: "+=140%", pin: ".stage", scrub: 0.8, invalidateOnRefresh: true },
    });
    prints.forEach((p, i) =>
      mtl.to(p, { x: () => fan[i].x * Math.min(vw(), 560), y: () => fan[i].y * innerHeight, rotation: fan[i].r, scale: 1, ease: "power2.out", duration: 1 }, i * 0.12)
    );
    mtl.fromTo(".moments-title", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.1);
    buildSky();

    // ceremony: lights come on as night falls
    const bulbs = $$(".bulb").sort((a, b) => (a.dataset.i % 100) - (b.dataset.i % 100));
    ScrollTrigger.create({
      trigger: "#ceremony", start: "top 45%",
      onEnter: () => bulbs.forEach((b, i) => gsap.delayedCall(i * 0.035 + Math.random() * 0.15, () => b.classList.add("on"))),
      onLeaveBack: () => bulbs.forEach((b) => b.classList.remove("on")),
    });
    gsap.timeline({ scrollTrigger: { trigger: ".doha", start: "top 80%" } })
      .from("#ceremony .ln", { autoAlpha: 0, y: 14, duration: 0.9, stagger: 0.2, ease: "power2.out" });
    ScrollTrigger.create({ trigger: ".ceremony-title", start: "top 82%", once: true, onEnter: () => drawTl($(".ceremony-title"), 2.2) });
    $$("#ceremony [data-reveal], #closing [data-reveal]").forEach((el) =>
      gsap.from(el, { autoAlpha: 0, y: 18, duration: 1, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 90%" } })
    );
    gsap.from("#ceremony .divider", { scaleX: 0, duration: 1, ease: "power2.inOut", scrollTrigger: { trigger: "#ceremony .divider", start: "top 90%" } });

    gsap.from(".clock div", { autoAlpha: 0, y: 24, duration: 0.9, stagger: 0.1, ease: "power2.out", scrollTrigger: { trigger: ".clock", start: "top 85%" } });
    gsap.from(".ornament", { autoAlpha: 0, scale: 0.7, duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: ".ornament", start: "top 90%" } });
  }

  /* ---------- countdown ---------- */
  function tickClock() {
    const cells = Object.fromEntries($$("#clock b").map((b) => [b.dataset.u, b]));
    const pad = (n) => String(n).padStart(2, "0");
    const label = $("#count-label");
    const tick = () => {
      const now = Date.now();
      let ms = EVENT_START - now;
      if (ms <= 0) {
        label.textContent = now < EVENT_END ? "The celebration has begun" : "Married on 12th December 2026";
        ms = 0;
      }
      const s = Math.floor(ms / 1000);
      cells.d.textContent = pad(Math.floor(s / 86400));
      cells.h.textContent = pad(Math.floor((s % 86400) / 3600));
      cells.m.textContent = pad(Math.floor((s % 3600) / 60));
      cells.s.textContent = pad(s % 60);
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- calendar ---------- */
  function addToCalendar() {
    const z = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const title = "Vidushi & Shrinav - Wedding Ceremony";
    const details = "With best compliments, Vatsa Family. " + location.origin + location.pathname;
    const apple = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) && "ontouchend" in document;
    if (apple) {
      const ics = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//vidushi-shrinav//EN", "BEGIN:VEVENT",
        `UID:vidushi-shrinav-20261212@wedding`, `DTSTAMP:${z(new Date())}`,
        `DTSTART:${z(EVENT_START)}`, `DTEND:${z(EVENT_END)}`,
        `SUMMARY:${title}`, `LOCATION:${VENUE}`, `DESCRIPTION:${details}`,
        "END:VEVENT", "END:VCALENDAR",
      ].join("\r\n");
      location.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
    } else {
      const u = new URL("https://calendar.google.com/calendar/render");
      u.searchParams.set("action", "TEMPLATE");
      u.searchParams.set("text", title);
      u.searchParams.set("dates", `${z(EVENT_START)}/${z(EVENT_END)}`);
      u.searchParams.set("location", VENUE);
      u.searchParams.set("details", details);
      window.open(u.toString(), "_blank", "noopener");
    }
  }
  $("#calendar").addEventListener("click", addToCalendar);

  /* ---------- music ---------- */
  const music = $("#music");
  const audio = new Audio();
  audio.loop = true;
  audio.preload = "auto";
  let audioOk = true;
  audio.addEventListener("error", () => { audioOk = false; music.hidden = true; });
  audio.src = MUSIC_SRC;
  function playMusic() {
    if (!audioOk) return;
    audio.volume = 0;
    audio.play().then(() => {
      music.hidden = false;
      gsap.to(audio, { volume: 0.55, duration: 2.5 });
    }).catch(() => { music.hidden = false; setMusicState(false); });
  }
  function setMusicState(on) {
    music.setAttribute("aria-pressed", String(on));
    music.setAttribute("aria-label", on ? "Pause music" : "Play music");
  }
  music.addEventListener("click", () => {
    if (audio.paused) { audio.play(); setMusicState(true); } else { audio.pause(); setMusicState(false); }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !audio.paused) { audio.pause(); audio._autoPaused = true; }
    else if (!document.hidden && audio._autoPaused) { audio.play(); audio._autoPaused = false; }
  });

  /* ---------- envelope ---------- */
  function openEnvelope() {
    $("#seal").disabled = true;
    playMusic();
    const done = () => {
      $("#gate").remove();
      root.classList.remove("is-locked");
      lenis?.start();
      ScrollTrigger.refresh();
    };
    if (reduced) { done(); return; }
    const tl = gsap.timeline();
    tl.to(".seal", { scale: 1.12, duration: 0.18, ease: "power2.out" })
      .to(".seal", { scale: 0, rotation: 35, autoAlpha: 0, duration: 0.4, ease: "back.in(2)" })
      .to(".env-flap", { rotationX: 180, duration: 0.95, ease: "power2.inOut" }, "-=0.1")
      .to(".env-flap", { autoAlpha: 0, duration: 0.3 }, "-=0.25")
      .to(".env-address, .env-hint", { autoAlpha: 0, y: 10, duration: 0.35 }, "<-0.5")
      .to(".env-body", { yPercent: 100, duration: 1.1, ease: "power3.in" }, "-=0.15")
      .addLabel("cleared")
      .call(done, null, "cleared") // guests can scroll while the hero is still drawing
      .add(heroIn(), "cleared-=0.45");
  }

  /* ---------- boot ---------- */
  inlineArt().then(() => {
    $$(".art.draw").forEach((el) => (el._draw = prepDraw(el)));
    buildScroll();
    tickClock();
    if (reduced) {
      $$(".art.draw").forEach((el) => drawTl(el, 0).progress(1));
    }
    $("#seal").addEventListener("click", openEnvelope);
    gsap.from(".seal", { scale: 0.4, autoAlpha: 0, duration: 0.9, ease: "back.out(2)", delay: 0.2 });
    gsap.from(".env-address > *", { autoAlpha: 0, y: 10, duration: 0.9, stagger: 0.15, delay: 0.5 });
  });
})();
