/* Vidushi weds Shrinav - motion + behaviour. Content comes from events.js. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;
  const isLocal = /^(localhost|127\.0\.0\.1|192\.168\.|10\.)/.test(location.hostname);

  /* ---------- which invitation is this ---------- */
  const W = window.WEDDING;
  const slug = location.pathname.replace(/^\/+|\/+$/g, "").replace(/\.html$/, "").toLowerCase() || "wedding";
  const key = slug === "index" ? "wedding" : slug;
  const ev = window.EVENTS[key];
  if (!ev || (!ev.live && !isLocal)) { location.replace("/"); return; }
  const isWedding = key === "wedding";
  const EVENT_START = ev.start ? new Date(ev.start) : null;
  const EVENT_END = ev.end ? new Date(ev.end) : null;
  root.dataset.theme = ev.theme;
  if (!isWedding) document.title = `${ev.title} · Vidushi & Shrinav`;

  const text = {
    title: ev.title, heroPlace: ev.heroPlace, hosts: W.hosts, request: ev.request,
    brideName: W.bride.name, brideParents: W.bride.parents, groomName: W.groom.name, groomParents: W.groom.parents,
    dateLine: ev.dateLine, timeLine: ev.timeLine, venue: ev.venue, venueLine: ev.venueLine, family: W.family,
  };
  $$("[data-bind]").forEach((el) => {
    const v = text[el.dataset.bind];
    if (v) el.textContent = v; else el.hidden = true;
  });
  $(".hero-event").hidden = isWedding;

  const heroDate = $("#hero-date");
  if (ev.heroDate) {
    heroDate.setAttribute("aria-label", ev.dateLine);
    heroDate.innerHTML = ev.heroDate.map((p) => `<span>${p}</span>`).join("<i></i>");
  } else heroDate.hidden = true;

  // Title: the card's own lettering where we have it, otherwise script type in gold foil
  const titleSlot = $("#ceremony-title");
  if (ev.titleArt) { titleSlot.className = "art draw foil ceremony-title"; titleSlot.dataset.svg = ev.titleArt; }
  else titleSlot.innerHTML = `<p class="title-text">${ev.title}</p>`;

  // The printed card has "To, ____". The link fills it: /?to=Sharma%20Family
  const guest = (new URLSearchParams(location.search).get("to") || "").trim().slice(0, 60);
  if (guest) $("#guest").textContent = guest;

  if (ev.mapsQuery) $("#directions").href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(ev.mapsQuery);
  else $("#directions").hidden = true;
  if (!EVENT_START) { $("#calendar").hidden = true; $("#countdown").hidden = true; }
  if (ev.rsvpBy) $("#rsvp-sub").textContent = `Kindly reply by ${ev.rsvpBy}.`;

  if (matchMedia("(hover: hover) and (pointer: fine)").matches) $(".env-hint").textContent = "Click the seal to open";

  /* ---------- photos ---------- */
  $("#couple-photo").src = W.couplePhoto;
  $("#deck").innerHTML = W.moments.map((src) => `<div class="ph"><img src="${src}" alt="" decoding="async"></div>`).join("");
  if (!W.moments.length) $("#moments").hidden = true;
  // A missing photo falls back to the monogram on card stock.
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
        svgCache[name] ??= fetch(`/assets/art/${name}.svg`).then((r) => r.text());
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
    const tl = gsap.timeline();
    if (!el?._draw) return tl;
    const { paths, knock } = el._draw;
    tl.to(paths, { strokeDashoffset: 0, duration: dur, ease: "power1.inOut", stagger: { amount: dur * 0.55 } })
      .to(paths, { fillOpacity: 1, duration: 0.9, ease: "power1.out", stagger: { amount: 0.5 } }, `-=${dur * 0.55}`)
      .to(paths, { strokeOpacity: 0, duration: 0.8 }, "<+0.4");
    if (knock.length) tl.to(knock, { opacity: 1, duration: 0.4 }, "<");
    return tl;
  }

  /* ---------- name letters ---------- */
  $$("[data-split]").forEach((h) => {
    const words = h.textContent.trim().split(/\s+/);
    h.setAttribute("aria-label", h.textContent.trim());
    h.innerHTML = words
      .map((w) => `<span class="w" aria-hidden="true">${[...w].map((c) => `<span class="ch">${c}</span>`).join("")}</span>`)
      .join(" ");
  });

  /* ---------- fairy lights (marigold garland in daylight) ---------- */
  (() => {
    const g = $(".lights .bulbs");
    const flower = ev.theme === "morning";
    $$(".lights .wire").forEach((wire, wi) => {
      const len = wire.getTotalLength();
      const n = flower ? 16 : 22;
      for (let i = 1; i < n; i++) {
        const pt = wire.getPointAtLength((len * i) / n);
        const c = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        c.setAttribute("cx", pt.x.toFixed(1));
        c.setAttribute("cy", (pt.y + (flower ? 3 : 2.2)).toFixed(1));
        c.setAttribute("rx", flower ? 3.2 : 1.1);
        c.setAttribute("ry", flower ? 3.6 : 2.4);
        c.setAttribute("class", "bulb");
        c.dataset.i = wi * 100 + i;
        g.appendChild(c);
      }
    });
  })();

  /* ---------- the day: sky + ink tween with scroll ---------- */
  const DAY = { "--sky-top": "#F6EFE2", "--sky-bot": "#EFE5D2", "--fg": "#2A1D1A", "--fg-soft": "#6B564A", "--line": "#2A1D1A", "--stars": 0, "--horizon": 0, "--grain": 0.5 };
  const THEMES = {
    evening: {
      mid: { "--sky-top": "#4A3561", "--sky-bot": "#D98A6A", "--fg": "#FFF3E4", "--fg-soft": "#F2D9C6", "--line": "#F6D596", "--stars": 0.25, "--horizon": 0.6, "--grain": 0.25 },
      end: { "--sky-top": "#0D1030", "--sky-bot": "#241C47", "--fg": "#F6ECD8", "--fg-soft": "#C9BDA8", "--line": "#E2B35C", "--stars": 1, "--horizon": 1, "--grain": 0.12 },
      bar: "#0D1030",
    },
    morning: {
      mid: { "--sky-top": "#FBEBC0", "--sky-bot": "#F6D37E", "--fg": "#2E1F0E", "--fg-soft": "#6A4A20", "--line": "#6B3F0C", "--stars": 0, "--horizon": 0.5, "--grain": 0.35 },
      end: { "--sky-top": "#FFE28F", "--sky-bot": "#F4AE3F", "--fg": "#2A1A08", "--fg-soft": "#5E3E14", "--line": "#5A300A", "--stars": 0, "--horizon": 0.9, "--grain": 0.3 },
      bar: "#F4AE3F",
    },
    henna: {
      mid: { "--sky-top": "#D5DCBE", "--sky-bot": "#9DB58E", "--fg": "#1F2A1A", "--fg-soft": "#3E4E36", "--line": "#2C3F26", "--stars": 0, "--horizon": 0.2, "--grain": 0.35 },
      end: { "--sky-top": "#0F2016", "--sky-bot": "#21402A", "--fg": "#F3EBD6", "--fg-soft": "#C4C9AE", "--line": "#E2B35C", "--stars": 0.8, "--horizon": 0.8, "--grain": 0.15 },
      bar: "#0F2016",
    },
  };
  const theme = THEMES[ev.theme] || THEMES.evening;
  const meta = $('meta[name="theme-color"]');

  function buildSky() {
    // created after the gallery pin so their positions include its pin spacing
    const midTrigger = $("#moments").hidden ? "#couple" : "#moments";
    gsap.fromTo(root, DAY, {
      ...theme.mid, ease: "none",
      scrollTrigger: { trigger: midTrigger, start: "top 75%", end: "top top", scrub: 0.6 },
    });
    gsap.fromTo(root, theme.mid, {
      ...theme.end, ease: "none", immediateRender: false,
      scrollTrigger: {
        trigger: "#ceremony", start: "top 95%", end: "top 30%", scrub: 0.6,
        onUpdate: (self) => meta.setAttribute("content", self.progress > 0.5 ? theme.bar : "#F6EFE2"),
      },
    });
  }

  /* ---------- hero entrance (after the envelope opens) ---------- */
  function heroIn() {
    const tl = gsap.timeline();
    tl.from(".bell", { yPercent: -110, duration: 1.4, ease: "back.out(1.4)", stagger: 0.12 }, 0)
      .add(drawTl($(".monogram"), 2.1), 0.3)
      .add(drawTl($(".names"), 2.2), 1.3)
      .from(".hero-inner > p:not([hidden])", { autoAlpha: 0, y: 12, duration: 1, stagger: 0.15, ease: "power2.out" }, 3.2)
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
    gsap.timeline({ scrollTrigger: { trigger: "#blessing", start: "top 72%" } })
      .add(drawTl($(".ganesha"), 1.6))
      .from("#blessing .ln", { autoAlpha: 0, y: 14, duration: 0.9, stagger: 0.22, ease: "power2.out" }, 0.6)
      .from("#blessing .divider", { scaleX: 0, duration: 1.1, ease: "power2.inOut" }, 1.2);

    gsap.timeline({ scrollTrigger: { trigger: ".frame", start: "top 78%" } })
      .from(".frame", { autoAlpha: 0, scale: 0.97, duration: 1.1, ease: "power2.out" })
      .from(".corner", { autoAlpha: 0, scale: 0.6, duration: 1.2, stagger: 0.1, ease: "power3.out" }, 0.2);
    $$(".frame [data-reveal]:not([hidden])").forEach((el) =>
      gsap.from(el, { autoAlpha: 0, y: 16, duration: 0.9, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 88%" } })
    );
    $$(".name").forEach((n) =>
      gsap.from($$(".ch", n), {
        yPercent: 60, autoAlpha: 0, rotation: 4, duration: 0.9, ease: "power3.out", stagger: 0.035,
        scrollTrigger: { trigger: n, start: "top 86%" },
      })
    );

    // couple: arch rises, photo drifts inside it
    const portrait = $(".portrait");
    gsap.from(portrait, { autoAlpha: 0, y: 60, duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: portrait, start: "top 85%" } });
    gsap.fromTo("#couple-photo", { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: portrait, start: "top bottom", end: "bottom top", scrub: true } });

    // moments: scattered prints gather into a fanned stack
    const prints = $$(".ph");
    if (prints.length) {
      const vw = () => Math.min(innerWidth, 900);
      const scatterAt = [[-0.55, -0.42, -24], [0.6, -0.3, 18], [-0.62, 0.38, 14], [0.55, 0.45, -20], [0.02, 0.7, 8]];
      const mid = (prints.length - 1) / 2;
      prints.forEach((p, i) => {
        const [sx, sy, sr] = scatterAt[i % scatterAt.length];
        gsap.set(p, { x: () => sx * vw(), y: () => sy * innerHeight, rotation: sr, scale: 0.78, zIndex: 10 - Math.round(Math.abs(i - mid) * 2) });
      });
      const mtl = gsap.timeline({
        scrollTrigger: { trigger: "#moments", start: "top top", end: "+=140%", pin: ".stage", scrub: 0.8, invalidateOnRefresh: true },
      });
      prints.forEach((p, i) => {
        const off = i - mid; // fan outwards from the centre print
        mtl.to(p, { x: () => off * 0.17 * Math.min(vw(), 560), y: () => Math.abs(off) * 0.012 * innerHeight, rotation: off * 7, scale: 1, ease: "power2.out", duration: 1 }, i * 0.14);
      });
      mtl.fromTo(".moments-title", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.1);
    }
    buildSky();

    // ceremony: lights come on as the day turns
    const bulbs = $$(".bulb").sort((a, b) => (a.dataset.i % 100) - (b.dataset.i % 100));
    ScrollTrigger.create({
      trigger: "#ceremony", start: "top 45%",
      onEnter: () => bulbs.forEach((b, i) => gsap.delayedCall(i * 0.035 + Math.random() * 0.15, () => b.classList.add("on"))),
      onLeaveBack: () => bulbs.forEach((b) => b.classList.remove("on")),
    });
    gsap.from("#ceremony .ln", { autoAlpha: 0, y: 14, duration: 0.9, stagger: 0.2, ease: "power2.out", scrollTrigger: { trigger: ".doha", start: "top 80%" } });
    const title = $("#ceremony-title");
    ScrollTrigger.create({
      trigger: title, start: "top 82%", once: true,
      onEnter: () => (title._draw ? drawTl(title, 2.2) : gsap.from(title, { autoAlpha: 0, y: 20, duration: 1.2, ease: "power2.out" })),
    });
    $$("#ceremony [data-reveal], #closing [data-reveal]").forEach((el) =>
      gsap.from(el, { autoAlpha: 0, y: 18, duration: 1, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 90%" } })
    );
    gsap.from("#ceremony .divider", { scaleX: 0, duration: 1, ease: "power2.inOut", scrollTrigger: { trigger: "#ceremony .divider", start: "top 90%" } });
    if (EVENT_START) gsap.from(".clock div", { autoAlpha: 0, y: 24, duration: 0.9, stagger: 0.1, ease: "power2.out", scrollTrigger: { trigger: ".clock", start: "top 85%" } });
    gsap.from(".rsvp > :not([hidden])", { autoAlpha: 0, y: 20, duration: 0.9, stagger: 0.12, ease: "power2.out", scrollTrigger: { trigger: "#rsvp", start: "top 80%" } });
    gsap.from(".ornament", { autoAlpha: 0, scale: 0.7, duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: ".ornament", start: "top 90%" } });
  }

  /* ---------- countdown ---------- */
  function tickClock() {
    if (!EVENT_START) return;
    const cells = Object.fromEntries($$("#clock b").map((b) => [b.dataset.u, b]));
    const pad = (n) => String(n).padStart(2, "0");
    const label = $("#count-label");
    const tick = () => {
      const now = Date.now();
      let ms = EVENT_START - now;
      if (ms <= 0) {
        label.textContent = now < EVENT_END ? "The celebration has begun" : "Thank you for celebrating with us";
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
  $("#calendar").addEventListener("click", () => {
    const z = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const title = `Vidushi & Shrinav - ${ev.title}`;
    const where = [ev.venue, ev.venueLine].filter(Boolean).join(", ");
    const details = "With best compliments, " + W.family + ". " + location.origin + location.pathname;
    const apple = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) && "ontouchend" in document;
    if (apple) {
      const ics = [
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//vidushi-shrinav//EN", "BEGIN:VEVENT",
        `UID:vidushi-shrinav-${key}@rvishcametrue.us`, `DTSTAMP:${z(new Date())}`,
        `DTSTART:${z(EVENT_START)}`, `DTEND:${z(EVENT_END)}`,
        `SUMMARY:${title}`, `LOCATION:${where}`, `DESCRIPTION:${details}`,
        "END:VEVENT", "END:VCALENDAR",
      ].join("\r\n");
      location.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
    } else {
      const u = new URL("https://calendar.google.com/calendar/render");
      u.searchParams.set("action", "TEMPLATE");
      u.searchParams.set("text", title);
      u.searchParams.set("dates", `${z(EVENT_START)}/${z(EVENT_END)}`);
      u.searchParams.set("location", where);
      u.searchParams.set("details", details);
      window.open(u.toString(), "_blank", "noopener");
    }
  });

  /* ---------- RSVP ---------- */
  (() => {
    const form = $("#rsvp-form"), done = $("#rsvp-done"), err = $("#rsvp-error");
    const guestsField = $("#guests-field"), out = $("#r-guests"), submit = $("#rsvp-submit");
    const store = `rsvp:${key}`;
    let guests = 1;
    const setGuests = (n) => { guests = Math.max(1, Math.min(15, n)); out.textContent = guests; };
    if (guest) $("#r-name").value = guest;

    form.addEventListener("change", (e) => {
      if (e.target.name === "attending") { guestsField.hidden = e.target.value !== "yes"; ScrollTrigger.refresh(); }
    });
    $$(".stepper button").forEach((b) => b.addEventListener("click", () => setGuests(guests + Number(b.dataset.step))));

    const firstName = (n) => n.trim().split(/\s+/)[0];
    const when = ev.dateLine.replace(/^\w+, /, "");
    function showDone(r) {
      $("#done-title").textContent = r.attending ? `Thank you, ${firstName(r.name)}!` : `Thank you, ${firstName(r.name)}.`;
      $("#done-sub").textContent = r.attending
        ? `We've noted ${r.guests} ${r.guests > 1 ? "guests" : "guest"}.${EVENT_START ? ` See you on ${when}.` : ""}`
        : "We'll miss you. Your blessings mean a lot to the family.";
      form.hidden = true;
      done.hidden = false;
      ScrollTrigger.refresh();
    }
    try { const saved = JSON.parse(localStorage.getItem(store) || "null"); if (saved) showDone(saved); } catch {}

    $("#rsvp-change").addEventListener("click", () => {
      done.hidden = true; form.hidden = false; ScrollTrigger.refresh(); $("#r-name").focus();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      err.hidden = true;
      const fd = new FormData(form);
      const name = (fd.get("name") || "").toString().trim();
      const attending = fd.get("attending");
      if (!name) { err.textContent = "Please add your name so the family knows who replied."; err.hidden = false; $("#r-name").focus(); return; }
      if (!attending) { err.textContent = "Please choose whether you'll attend."; err.hidden = false; return; }
      const reply = { name, attending: attending === "yes", guests: attending === "yes" ? guests : 0 };
      if (fd.get("website")) { showDone(reply); return; } // a bot filled the hidden field
      submit.disabled = true; submit.textContent = "Sending…";
      try {
        const res = await fetch(`${W.supabaseUrl}/rest/v1/rpc/submit_wedding_rsvp`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: W.supabaseKey },
          body: JSON.stringify({
            p_event: key, p_name: name, p_phone: (fd.get("phone") || "").toString(), p_attending: reply.attending,
            p_guests: reply.guests, p_message: (fd.get("message") || "").toString(), p_invite_label: guest || null,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        try { localStorage.setItem(store, JSON.stringify(reply)); } catch {}
        showDone(reply);
        done.focus({ preventScroll: true });
      } catch {
        err.textContent = "Your reply didn't send. Check your connection and try again.";
        err.hidden = false;
      } finally {
        submit.disabled = false; submit.textContent = "Send reply";
      }
    });
  })();

  /* ---------- music ---------- */
  const music = $("#music");
  const audio = new Audio();
  audio.loop = true;
  audio.preload = "auto";
  let audioOk = true;
  audio.addEventListener("error", () => { audioOk = false; music.hidden = true; });
  audio.src = W.music;
  function setMusicState(on) {
    music.setAttribute("aria-pressed", String(on));
    music.setAttribute("aria-label", on ? "Pause music" : "Play music");
  }
  function playMusic() {
    if (!audioOk) return;
    audio.volume = 0;
    audio.play().then(() => {
      music.hidden = false;
      gsap.to(audio, { volume: 0.6, duration: 1.8 });
    }).catch(() => { music.hidden = false; setMusicState(false); });
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
    playMusic(); // inside the tap, so mobile browsers allow sound
    const done = () => {
      $("#gate").remove();
      root.classList.remove("is-locked");
      lenis?.start();
      ScrollTrigger.refresh();
    };
    if (reduced) { done(); return; }
    gsap.timeline()
      .to(".seal", { scale: 1.12, duration: 0.18, ease: "power2.out" })
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
    if (reduced) $$(".art.draw").forEach((el) => drawTl(el, 0).progress(1));
    $("#seal").addEventListener("click", openEnvelope);
    gsap.from(".seal", { scale: 0.4, autoAlpha: 0, duration: 0.9, ease: "back.out(2)", delay: 0.2 });
    gsap.from(".env-address > *", { autoAlpha: 0, y: 10, duration: 0.9, stagger: 0.15, delay: 0.5 });
  });
})();
