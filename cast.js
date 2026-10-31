/* The couple, animated: AI-filmed clips and key poses, keyed out of green screen, drawn into the page on #world.
   main.js drives them through window.World. Everything that changes over scroll is a GSAP tween on the state S,
   so scrolling back rewinds it exactly.

   Sources share one 9:16 frame (the clips were filmed to start and end on the same key poses), so a clip, a still
   and a set plate line up with each other wherever that frame is on screen.
   - clips:  assets/cast/<name>.mp4 (premultiplied colour | matte, side by side) + <name>.json (frames, fps, boxes)
   - stills: assets/cast/still/<name>.webp (transparent) + still/meta.json (boxes)
   - plates: assets/cast/plate/<scene>.webp + <scene>-lines.webp (gold pencil lines for the sketch-in) */
(() => {
  "use strict";
  const canvas = document.getElementById("world");
  const gl = canvas && canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) { dispatchEvent(new Event("world:fail")); return; }

  const BASE = "/assets/cast/";
  // browsers keep /assets for a week: bump this whenever a clip, still or plate is re-exported, so everyone gets the new one
  const V = "?v=20261020b";
  // in the order they load. A clip falls back to its first and last key pose until (or unless) its video is ready
  const CLIPS = {
    meet: { from: "park", to: "meet-pose" },
    idle: { loop: true, from: "park", to: "park" },
    "eng-approach": { from: "park", to: "eng-a" },
    "eng-act": { from: "eng-a", to: "eng-b" },
    "haldi-act": { from: "haldi-a", to: "haldi-b" },
    jai1: { from: "jai-a", to: "jai-m" },
    "jai1-old": { from: "jai-a", to: "jai-m" },
    jai2: { from: "jai-m", to: "jai-b" },
  };
  // never give a still the same name as a clip: the still would be shown in its place
  const STILLS = ["park", "meet-pose", "eng-a", "eng-b", "haldi-a", "haldi-b", "jai-a", "jai-m", "jai-b", "finale"];
  const PLATES = ["engagement", "haldi", "wedding"];
  // where the havan fire is, so it can flicker (fractions of the frame: x0, y0, x1, y1)
  const FIRE = [0.4, 0.6, 0.6, 0.82];
  const FIRE_IN = { "jai-a": FIRE, "jai-m": FIRE, "jai-b": FIRE };

  /* ---------- GL ---------- */
  const NOISE = `
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
    float fbm(vec2 p) { return noise(p) * 0.55 + noise(p * 2.3 + 1.7) * 0.3 + noise(p * 5.1 + 4.1) * 0.15; }
    vec2 flicker(vec2 uv, vec4 fire, float t) {
      if (fire.z > 0.0 && uv.x > fire.x && uv.x < fire.z && uv.y > fire.y && uv.y < fire.w) {
        float k = (fire.w - uv.y) / (fire.w - fire.y);
        uv.x += sin(uv.y * 90.0 + t * 11.0) * 0.004 * k; uv.y += sin(uv.x * 70.0 + t * 7.0) * 0.003 * k;
      }
      return uv;
    }`;
  const VERT = "attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }";
  const CAST = `precision mediump float;
    uniform vec2 res; uniform float dpr, time;
    uniform sampler2D tA, tB; uniform float sbsA, sbsB, stillA, stillB, spreadA, spreadB, mixv, dis, glow, alpha;
    uniform vec4 rect, fireA, fireB; uniform float cutA, cutB;
    ${NOISE}
    // pushed apart, each side shows only its own person (she is on the left, he on the right); the split runs
    // through the gap between them in this very frame, so a hand reaching across the middle is never sliced off
    vec2 frameUV(vec2 p, float spread, float cut) {
      float cx = rect.x + rect.z * cut; bool left = p.x < cx;
      p.x += left ? spread : -spread;
      vec2 uv = (p - rect.xy) / rect.zw;
      if (spread > 0.5 && (left ? uv.x > cut : uv.x < cut)) uv.x = -1.0;
      return uv;
    }
    vec2 life(vec2 uv, float still, vec4 fire) {
      if (still > 0.5) { float fv = 0.93; uv.y = fv + (uv.y - fv) / (1.0 + 0.007 * sin(time * 1.7)); uv.x += 0.002 * sin(time * 0.8) * (fv - uv.y); }
      return flicker(uv, fire, time);
    }
    vec4 samp(sampler2D t, vec2 uv, float sbs) {
      if (uv.x < 0.008 || uv.x > 0.992 || uv.y < 0.004 || uv.y > 0.996) return vec4(0.0);
      // anything that touches the side of the frame fades out instead of ending in a hard line
      if (sbs > 0.5) { vec3 c = texture2D(t, vec2(uv.x * 0.5, uv.y)).rgb; float a = texture2D(t, vec2(0.5 + uv.x * 0.5, uv.y)).r; return vec4(min(c, vec3(a)), a); }
      return texture2D(t, uv);
    }
    void main() {
      vec2 p = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y) / dpr;
      vec4 A = samp(tA, life(frameUV(p, spreadA, cutA), stillA, fireA), sbsA);
      vec4 B = mixv > 0.0 ? samp(tB, life(frameUV(p, spreadB, cutB), stillB, fireB), sbsB) : vec4(0.0);
      vec2 q = (p - rect.xy) / rect.zw;
      vec3 gold = vec3(1.0, 0.8, 0.42);
      // one pose melts into the next like a film dissolve, with a warm glow at the crossing
      float k = smoothstep(0.0, 1.0, mixv);
      vec4 c = mix(A, B, k);
      c.rgb += gold * sin(3.14159 * mixv) * 0.28 * c.a;
      // and they turn to gold dust all at once
      // fine grain, rising from the feet up, so it reads as gold dust rather than holes
      if (dis > 0.001 && c.a > 0.0) {
        float n2 = fbm(q * vec2(70.0, 124.0) + 3.7) * 0.6 + (1.0 - q.y) * 0.4, td = dis * 1.16 - 0.08;
        float keep = smoothstep(td - 0.008, td + 0.008, n2);
        float rim = (1.0 - smoothstep(0.0, 0.03, abs(n2 - td))) * step(dis, 0.999);
        c.rgb = mix(c.rgb, gold * c.a * 1.15, rim * 0.9);
        c *= keep;
      }
      c.rgb += gold * glow * c.a * 0.45;
      // premultiplied colour may never be brighter than its alpha: Chrome clips it, Safari (every iPhone) shows garbage
      c.rgb = min(c.rgb, vec3(c.a));
      gl_FragColor = c * alpha;
    }`;
  const PLATE = `precision mediump float;
    uniform vec2 res; uniform float dpr, time, pa, sketch, fill;
    uniform sampler2D tP, tL, tA; uniform vec4 rect, fire;
    ${NOISE}
    void main() {
      vec2 p = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y) / dpr;
      vec2 uv = (p - rect.xy) / rect.zw, scr = res / dpr;
      // behind it, a blurred copy fills the whole width, so wide screens get the scene's colours edge to edge
      float aw = max(rect.z, scr.x), ah = aw * 16.0 / 9.0;
      vec2 au = vec2(0.5, 0.55) + (p - vec2(scr.x * 0.5, scr.y * 0.5)) / vec2(aw, ah);
      vec3 amb = texture2D(tA, au).rgb * 0.62;
      bool inside = uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0;
      vec2 cu = clamp(uv, 0.0, 1.0);
      vec3 col = inside ? texture2D(tP, flicker(uv, fire, time)).rgb : amb;
      float line = inside ? texture2D(tL, uv).a : 0.0;
      // the sharp set melts into the blurred one at its sides
      float side = smoothstep(0.0, 0.12, cu.x) * smoothstep(1.0, 0.88, cu.x);
      col = inside ? mix(amb, col, side) : col;
      // the set draws itself in gold pencil from the floor up, then fills with colour
      float n = fbm(vec2(p.x / scr.y, p.y / scr.y) * vec2(5.0, 9.0)), r = n * 0.45 + (1.0 - p.y / scr.y) * 0.55;
      float ls = smoothstep(r - 0.06, r, sketch * 1.08), fs = smoothstep(r - 0.14, r, fill * 1.16);
      vec3 gold = vec3(0.98, 0.83, 0.5) * (0.85 + 0.15 * sin(uv.x * 40.0 + uv.y * 30.0 + time * 2.0));
      float la = line * ls * (1.0 - fs * 0.9) * side;
      vec4 o = vec4(col * fs, fs) + vec4(gold * la, la) * (1.0 - fs);
      float edge = smoothstep(0.0, 0.3, (p.y - max(rect.y, 0.0)) / scr.y);
      o.rgb = min(o.rgb, vec3(o.a));
      gl_FragColor = o * edge * pa;
    }`;
  function program(fs) {
    const pr = gl.createProgram();
    [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, fs]].forEach(([type, src]) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(pr, s);
    });
    gl.bindAttribLocation(pr, 0, "p"); gl.linkProgram(pr);
    const u = {}, n = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(pr, i).name; u[name] = gl.getUniformLocation(pr, name); }
    return { pr, u };
  }
  let castP, plateP;
  try { castP = program(CAST); plateP = program(PLATE); } catch (e) { console.warn(e); dispatchEvent(new Event("world:fail")); return; }
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  function texture() {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]].forEach(([k, v]) => gl.texParameteri(gl.TEXTURE_2D, k, v));
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    return t;
  }
  function upload(t, src, premultiply) {
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  }

  /* ---------- sources ---------- */
  const stills = {}, plates = {}, clips = {};
  let stillBoxes = {};
  const img = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  async function loadStills() {
    stillBoxes = (await (await fetch(BASE + "still/meta.json" + V)).json()).boxes;
    await Promise.all([
      ...STILLS.map(async (n) => { const t = texture(); upload(t, await img(`${BASE}still/${n}.webp${V}`), true); stills[n] = t; }),
      ...PLATES.map(async (n) => {
        const [c, l, a] = await Promise.all(["", "-lines", "-amb"].map((k) => img(`${BASE}plate/${n}${k}.webp${V}`)));
        const tc = texture(), tl = texture(), ta = texture(); upload(tc, c, false); upload(tl, l, false); upload(ta, a, false);
        plates[n] = { c: tc, l: tl, a: ta };
      }),
    ]);
  }
  // clips stream in after the stills; until a clip can play, its key poses stand in for it
  function loadClip(name) {
    if (clips[name]) return clips[name].loading;
    const c = (clips[name] = { name, ready: false, tex: texture(), dirty: false, meta: null });
    c.loading = (async () => {
      const [meta, blob] = await Promise.all([fetch(`${BASE}${name}.json${V}`).then((r) => r.json()), fetch(`${BASE}${name}.mp4${V}`).then((r) => r.blob())]);
      const v = document.createElement("video");
      Object.assign(v, { muted: true, playsInline: true, preload: "auto", loop: !!CLIPS[name].loop, crossOrigin: "anonymous" });
      v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
      v.src = URL.createObjectURL(blob);
      c.meta = meta; c.v = v;
      // ready whenever the browser has a frame, even if that comes late (slow phones, or only after a tap on iPhones)
      const check = () => { if (v.readyState >= 2) { c.ready = true; c.dirty = true; } };
      ["loadeddata", "canplay", "seeked"].forEach((t) => v.addEventListener(t, check));
      v.load();
      wake(v);
      check();
      // done once its first frame is decoded and on the GPU, so its first use doesn't stall (capped: iPhones may wait for a tap)
      if ("requestVideoFrameCallback" in v) { c.rvfc = true; const tick = () => { c.dirty = true; v.requestVideoFrameCallback(tick); }; v.requestVideoFrameCallback(tick); }
      await new Promise((res) => { if (v.readyState >= 4) res(); v.addEventListener("canplaythrough", res, { once: true }); setTimeout(res, 15000); });
      if (v.readyState >= 2) { upload(c.tex, v, false); c.ready = true; }
    })().catch((e) => console.warn("cast clip", name, e));
    return c.loading;
  }

  // phones only decode a video after it has played once; a muted inline play is allowed, and after any tap always is
  const isLoop = (v) => Object.values(clips).some((c) => c.v === v && CLIPS[c.name].loop && S.a === c.name);
  function wake(v) { const p = v.play(); if (p && p.then) p.then(() => { if (!isLoop(v)) v.pause(); }).catch(() => {}); }
  ["pointerdown", "touchend", "click"].forEach((t) => addEventListener(t, () => Object.values(clips).forEach((c) => c.v && !c.ready && wake(c.v)), { passive: true }));

  // ?jaimala=old: the earlier first half of the jaimala (Veo 3.1 Fast, longer), to compare with the current one
  const OLD_JAIMALA = new URLSearchParams(location.search).get("jaimala") === "old";
  if (!OLD_JAIMALA) delete CLIPS["jai1-old"];
  // the ॐ loader in main.js waits for every clip (and, through world:ready, the key poses and sets)
  window.CastPreload = { names: () => Object.keys(CLIPS), clip: (n) => loadClip(n) };

  /* ---------- state (everything here is tweened by the scroll script) ---------- */
  const S = { a: "idle", af: 0, sa: 1, b: "", bf: 0, sb: 0, mix: 0, dis: 0, glow: 0, zoom: 1, alpha: 1, plate: "", pa: 0, sketch: 0, fill: 0 };
  const L = { W: 0, H: 0, fw: 0, fh: 0, cover: 1, park: 1, spread: 0, dpr: 1 };
  function layout() {
    const W = innerWidth, H = innerHeight, phone = W / H < 0.75;
    L.W = W; L.H = H; L.dpr = Math.min(devicePixelRatio || 1, 1.5);
    L.fw = phone ? W : Math.min(W, H * 0.98 * 9 / 16); L.fh = L.fw * 16 / 9;
    L.cover = phone ? Math.max(1, H / L.fh) : 1;
    // waiting at the sides they stand a little smaller, out in the corners, so the text and logo stay clear
    L.park = phone ? 0.74 : 0.9;
    L.spread = phone ? (W - L.fw * L.park) / 2 * 0.92 : Math.min((W - L.fw * L.park) / 2 * 0.7, L.fw * 0.8);
    canvas.width = Math.round(W * L.dpr); canvas.height = Math.round(H * L.dpr);
  }
  // where the shared 9:16 frame is on screen right now (it grows from the bottom centre)
  function frameRect() { const w = L.fw * S.zoom, h = L.fh * S.zoom; return { x: (L.W - w) / 2, y: L.H - h, w, h }; }

  // what to draw for one layer: texture, side-by-side?, still?, fire box
  const clipFrame = (c, f) => Math.min(c.meta.frames - 1, Math.max(0, Math.round(f * (c.meta.frames - 1))));
  function resolve(name, f, now) {
    if (!name) return null;
    if (stills[name]) return { tex: stills[name], sbs: 0, still: 1, fire: FIRE_IN[name], boxes: stillBoxes[name] };
    const c = clips[name], spec = CLIPS[name];
    if (!c || !c.ready) {
      const k = spec.loop ? spec.from : f < 0.5 ? spec.from : spec.to;
      return { tex: stills[k], sbs: 0, still: 1, fire: FIRE_IN[k], boxes: stillBoxes[k], fallback: [spec.from, spec.to] };
    }
    const v = c.v, fps = c.meta.fps;
    // video export (tools: frame-by-frame render with a stepped clock): never play, always show the exact frame
    if (window.__RENDER) {
      const dur = c.meta.frames / fps;
      const t = spec.loop ? ((now % dur) + dur) % dur : (f * (c.meta.frames - 1) + 0.5) / fps;
      if (!v.paused) v.pause();
      if (Math.abs(v.currentTime - t) > 0.4 / fps && !v.seeking) v.currentTime = t;
      if (!v.seeking && v.readyState >= 2) upload(c.tex, v, false);
      const fi = Math.min(c.meta.frames - 1, Math.floor(v.currentTime * fps));
      return { tex: c.tex, sbs: 1, still: 0, fire: null, boxes: c.meta.boxes[fi] };
    }
    if (spec.loop) { if (v.playbackRate !== 1) v.playbackRate = 1; if (v.paused) v.play().catch(() => {}); if (!c.rvfc) c.dirty = true; }
    else {
      // scrolling forward the video simply plays (smooth, the browser's own decoding), a little faster or slower
      // to keep up with the scroll; it only jumps when the scroll is far ahead or going backwards
      const t = (f * (c.meta.frames - 1) + 0.5) / fps, ahead = t - v.currentTime;
      if (ahead > 0.6 / fps && ahead < 1.5) {
        const rate = Math.min(4, Math.max(0.3, ahead * 2.5));
        if (Math.abs(v.playbackRate - rate) > 0.1) v.playbackRate = rate;
        if (v.paused) v.play().catch(() => {});
      } else {
        if (!v.paused) v.pause();
        if (Math.abs(ahead) > 0.6 / fps && !v.seeking && now - (c.lastSeek || 0) > 0.06) { v.currentTime = t; c.lastSeek = now; }
      }
      if (!v.paused && !c.rvfc) c.dirty = true;
    }
    if (c.dirty && v.readyState >= 2) { upload(c.tex, v, false); c.dirty = false; }
    const fi = Math.min(c.meta.frames - 1, Math.floor((v.currentTime * fps) % c.meta.frames));
    return { tex: c.tex, sbs: 1, still: 0, fire: null, boxes: c.meta.boxes[fi] };
  }
  // where to split her (left) from him (right) in this frame: the middle of the empty strip between them,
  // measured from the matte by tools/ai/cast_cuts.py (frames where they touch are never split: see the scenes)
  function gapOf(L) {
    const b = L && L.boxes;
    return b && typeof b.cut === "number" ? b.cut : 0.5;
  }
  let drawnA = null, drawnB = null;
  const NOFIRE = [0, 0, 0, 0];
  function render(time) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    const r = frameRect();
    const set = (P, extra) => {
      gl.useProgram(P.pr);
      gl.uniform2f(P.u.res, canvas.width, canvas.height); gl.uniform1f(P.u.dpr, L.dpr); gl.uniform1f(P.u.time, time);
      gl.uniform4f(P.u.rect, r.x, r.y, r.w, r.h); extra(P.u);
    };
    // the set behind them
    const pl = plates[S.plate];
    if (pl && S.pa > 0.001) {
      set(plateP, (u) => {
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, pl.c); gl.uniform1i(u.tP, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, pl.l); gl.uniform1i(u.tL, 1);
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, pl.a); gl.uniform1i(u.tA, 2);
        gl.uniform1f(u.pa, S.pa); gl.uniform1f(u.sketch, S.sketch); gl.uniform1f(u.fill, S.fill);
        gl.uniform4fv(u.fire, S.plate === "wedding" ? FIRE : NOFIRE);
      });
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    // the two of them
    let A = resolve(S.a, S.af, time), B = S.mix > 0 ? resolve(S.b, S.bf, time) : null, mix = S.mix;
    // a clip whose video isn't here yet: shimmer between its two key poses instead
    if (A && A.fallback && !B && !CLIPS[S.a].loop) {
      const [f0, f1] = A.fallback;
      A = resolve(f0); B = resolve(f1); mix = gsap.utils.clamp(0, 1, (S.af - 0.3) / 0.4);
    }
    // a video that isn't on screen this frame stops decoding
    Object.values(clips).forEach((c) => { if (c.v && !c.v.paused && c.name !== S.a && !(S.mix > 0 && c.name === S.b)) c.v.pause(); });
    drawnA = A; drawnB = B && mix > 0.5 ? B : null;
    if (!A || S.alpha <= 0.001 || S.dis >= 0.999) return;
    set(castP, (u) => {
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A.tex); gl.uniform1i(u.tA, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, (B || A).tex); gl.uniform1i(u.tB, 1);
      gl.uniform1f(u.sbsA, A.sbs); gl.uniform1f(u.sbsB, (B || A).sbs); gl.uniform1f(u.stillA, A.still); gl.uniform1f(u.stillB, (B || A).still);
      // a frame where they touch is never split, so no hand is ever cut
      const touch = (X) => !!(X && X.boxes && X.boxes.touch);
      gl.uniform1f(u.spreadA, touch(A) ? 0 : S.sa * L.spread); gl.uniform1f(u.spreadB, touch(B || A) ? 0 : S.sb * L.spread);
      gl.uniform1f(u.cutA, gapOf(A)); gl.uniform1f(u.cutB, gapOf(B || A));
      gl.uniform1f(u.mixv, B ? mix : 0); gl.uniform1f(u.dis, S.dis); gl.uniform1f(u.glow, S.glow); gl.uniform1f(u.alpha, S.alpha);
      gl.uniform4fv(u.fireA, A.fire || NOFIRE); gl.uniform4fv(u.fireB, (B && B.fire) || NOFIRE);
    });
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // their on-screen box, so the gold dust can leave from (and land on) the right person
  function rect(who) {
    const L0 = drawnB || drawnA, r = frameRect(), b = L0 && L0.boxes && L0.boxes[who];
    const sp = (drawnB ? S.sb : S.sa) * L.spread * (who === "bride" ? -1 : 1);
    const [x, y, w, h] = b && b[2] > 0 ? b : who === "bride" ? [0.08, 0.35, 0.3, 0.58] : [0.6, 0.3, 0.3, 0.63];
    const left = r.x + x * r.w + sp, top = r.y + y * r.h, width = w * r.w, height = h * r.h;
    return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top };
  }

  /* ---------- choreography helpers: tweens only, so scroll can run them both ways ---------- */
  // play a clip (or hold a still) on layer A, frame progress following the tween
  function play(tl, name, at, dur, ease = "none") {
    tl.set(S, { a: name }, at).fromTo(S, { af: 0 }, { af: 1, duration: dur, ease, immediateRender: false }, at);
  }
  // turn whatever is on layer A into another pose/clip through the gold shimmer
  function morph(tl, name, at, dur, spreadTo = 0, f = 0) {
    tl.set(S, { b: name, bf: f, sb: spreadTo }, at)
      .fromTo(S, { mix: 0 }, { mix: 1, duration: dur, ease: "power1.inOut", immediateRender: false }, at)
      .set(S, { a: name, af: f, sa: spreadTo, mix: 0, b: "", sb: 0 }, at + dur);
  }
  function setIn(tl, name, at, dur) {
    tl.set(S, { plate: name }, at)
      .fromTo(S, { pa: 0 }, { pa: 1, duration: dur * 0.25, immediateRender: false }, at)
      .fromTo(S, { sketch: 0 }, { sketch: 1, duration: dur * 0.55, ease: "power1.inOut", immediateRender: false }, at)
      .fromTo(S, { fill: 0 }, { fill: 1, duration: dur * 0.45, ease: "power1.inOut", immediateRender: false }, at + dur * 0.45);
  }
  function setOut(tl, at, dur) {
    tl.to(S, { fill: 0, duration: dur * 0.5 }, at).to(S, { sketch: 0, duration: dur * 0.5 }, at + dur * 0.3)
      .to(S, { pa: 0, duration: dur * 0.3 }, at + dur * 0.7);
  }
  // captions live in the page (#scene-caps) and fade with scroll
  const capBox = document.getElementById("scene-caps");
  function caption(tl, at, out, hi, en, tone) {
    const el = document.createElement("div"); el.className = "scene-cap"; el.dataset.tone = tone;
    // the big line can be Hindi (Devanagari) or English; the small line is optional
    const lang = /[\u0900-\u097F]/.test(hi) ? "hi" : "en";
    el.innerHTML = `<span class="cap-hi" lang="${lang}">${hi}</span>${en ? `<span class="cap-en">${en}</span>` : ""}`; capBox.appendChild(el);
    tl.fromTo(el, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.6, immediateRender: false }, at).to(el, { autoAlpha: 0, y: -8, duration: 0.5 }, out);
  }
  // back to the sides, alive, waiting for the next card
  function backToSides(tl, at, dur) {
    morph(tl, "idle", at, dur * 0.6, 1);
    tl.to(S, { zoom: L.park, duration: dur, ease: "power2.inOut" }, at);
  }
  const timelines = () => ({ approach: gsap.timeline({ paused: true }), act: gsap.timeline({ paused: true }), leave: gsap.timeline({ paused: true }) });
  const hold = (tl, len) => tl.to({}, { duration: Math.max(0, len - tl.duration()) });

  /* ---------- the scenes ---------- */
  const SCENES = {
    engagement() {
      const t = timelines();
      // they walk in from the sides as the garden sketches itself in; he opens the ring box
      setIn(t.approach, "engagement", 1.1, 2.9);
      play(t.approach, "eng-approach", 0, 4, "sine.inOut");
      // back together before his hand with the box reaches across to her (18% into the clip)
      t.approach.fromTo(S, { sa: 1 }, { sa: 0, duration: 0.95, ease: "sine.inOut", immediateRender: false }, 0)
        .to(S, { zoom: L.cover, duration: 3.6, ease: "power2.inOut" }, 0.3);
      // the rings
      caption(t.act, 0, 8.8, "सगाई", "The ring ceremony", "engagement");
      play(t.act, "eng-act", 0.4, 8.6);
      hold(t.act, 9.6);
      setOut(t.leave, 0, 3); backToSides(t.leave, 0, 3);
      return t;
    },
    haldi() {
      const t = timelines();
      setIn(t.approach, "haldi", 1.1, 2.9);
      morph(t.approach, "haldi-a", 0.6, 2.4);
      t.approach.to(S, { zoom: L.cover, duration: 3.4, ease: "power2.inOut" }, 0.3);
      // he smears the haldi on her cheek, she gets him back, and they both crack up
      caption(t.act, 0, 7.6, "हल्दी", "A touch of turmeric", "haldi");
      play(t.act, "haldi-act", 0.3, 7.4);
      hold(t.act, 8);
      setOut(t.leave, 0, 3); backToSides(t.leave, 0, 3);
      return t;
    },
    wedding() {
      const t = timelines();
      setIn(t.approach, "wedding", 1.1, 2.9);
      morph(t.approach, "jai-a", 0.6, 2.4);
      t.approach.to(S, { zoom: L.cover, duration: 3.4, ease: "power2.inOut" }, 0.3);
      // the jaimala: she garlands him, then he garlands her, and they fold their hands
      if (OLD_JAIMALA) {
        caption(t.act, 0, 12.4, "जयमाला", "The garland exchange", "wedding");
        play(t.act, "jai1-old", 0.3, 5.4);
        morph(t.act, "jai2", 5.8, 0.6);
        play(t.act, "jai2", 6.4, 6.4);
        hold(t.act, 13);
      } else {
        caption(t.act, 0, 11.6, "जयमाला", "The garland exchange", "wedding");
        play(t.act, "jai1", 0.3, 4.6);
        morph(t.act, "jai2", 4.9, 0.35);
        play(t.act, "jai2", 5.25, 6.4);
        hold(t.act, 12);
      }
      setOut(t.leave, 0, 3); backToSides(t.leave, 0, 3);
      return t;
    },
  };

  function resetPose() {
    Object.assign(S, { a: "idle", af: 0, sa: 1, b: "", bf: 0, sb: 0, mix: 0, dis: 0, glow: 0, zoom: L.park, alpha: 1, plate: "", pa: 0, sketch: 0, fill: 0 });
    capBox.innerHTML = "";
  }

  const World = {
    ready: true,
    rect,
    park: resetPose,
    resetPose,
    layout,
    // they live inside the page and always stand in front of it (the words keep clear of them instead)
    behindPage(on = true) { canvas.style.zIndex = on ? "3" : ""; },
    canvas,
    // at the envelope: they shimmer in on either side of it
    gateIn() {
      resetPose(); S.dis = 1; S.glow = 0.8;
      return gsap.timeline().to(S, { dis: 0, duration: 1.3, ease: "power1.out" }, 0.2).to(S, { glow: 0, duration: 1.2 }, 0.8);
    },
    pullThread() { return gsap.timeline().to({}, { duration: 0.8 }); },
    // they walk to each other and take hands (time-driven, during the intro)
    meet() {
      const tl = gsap.timeline();
      loadClip("meet");
      // the real walk (8 s of film) at a natural pace; together again long before their hands meet (52% in)
      tl.set(S, { a: "meet", af: 0 }, 0).to(S, { af: 1, duration: 4.6, ease: "sine.inOut" }, 0)
        .to(S, { sa: 0, duration: 1.6, ease: "sine.inOut" }, 0).to(S, { zoom: 1, duration: 4.6, ease: "sine.inOut" }, 0)
        .to(S, { glow: 0.85, duration: 0.8, ease: "power1.in" }, 4.0);
      return tl;
    },
    // all of them, hair and all, turns to gold at once
    vanish() { return gsap.timeline().to(S, { dis: 1, duration: 0.9, ease: "power1.in" }).to(S, { glow: 0, duration: 0.3 }, 0.6); },
    comeBack() {
      const tl = gsap.timeline();
      tl.call(resetPose, null, 0).set(S, { dis: 1, glow: 1 }, 0)
        .to(S, { dis: 0, duration: 1.1, ease: "power1.out" }, 0.8).to(S, { glow: 0, duration: 1.2 }, 1.2);
      return tl;
    },
    hide() { S.dis = 1; },
    // the blessing (no clip of its own yet: they stay as they are, alive)
    namaste() { return gsap.timeline({ paused: true }).to({}, { duration: 3 }); },
    scene: (name) => SCENES[name](),
    // after the wedding: they glow and turn to gold (scroll-driven)
    photo() {
      const approach = gsap.timeline({ paused: true }), act = gsap.timeline({ paused: true });
      // hand in hand in the middle as the photo arrives
      morph(approach, "finale", 0, 1.6);
      approach.to(S, { zoom: L.park === 1 ? 1 : 0.92, duration: 1.6, ease: "power2.inOut" }, 0).to(S, { glow: 0.25, duration: 0.6 }, 1.2);
      act.to(S, { glow: 0.9, duration: 0.4 }, 0).to(S, { dis: 1, duration: 1.2, ease: "power1.in" }, 0.3).to(S, { glow: 0, duration: 0.3 }, 1.3).to({}, { duration: 0.6 }, 1.6);
      return { approach, act };
    },
    _state: S,
    _render: (t) => render(t),
    _clips: clips,
  };

  layout();
  addEventListener("resize", layout);
  gsap.ticker.add((time) => render(time));
  // the key poses are small: wait for those, then let the clips stream in, the first ones first
  loadStills()
    .then(() => {
      window.World = World; dispatchEvent(new Event("world:ready"));
      Object.keys(CLIPS).forEach(loadClip); // normally already started by the ॐ loader
    })
    .catch((e) => { console.warn("cast", e); dispatchEvent(new Event("world:fail")); });
})();
