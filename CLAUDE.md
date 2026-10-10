# Shrinav weds Vidushi - animated wedding invitation (#RViShCameTrue)

Static site, no build step. Plain HTML/CSS/JS + GSAP. Mobile first (most guests open it from WhatsApp on a phone), must also work on laptops with mouse wheel.

- Live: https://shrinav-weds-vidushi.vercel.app (custom domain rvishcametrue.us once its DNS points to Vercel)
- Stack: GSAP 3.12.5 + ScrollTrigger (cdnjs), Lenis (unpkg, desktop only), Google Fonts (Carlito, Tiro Devanagari Hindi). No npm dependencies.

## Run it
```bash
python tools/serve.py          # http://127.0.0.1:5173  (also prints a LAN URL for a phone on the same Wi-Fi)
```
Use this server, not a plain static server: it also routes `/i/<code>` to `index.html` the way Vercel does.

## What happens on the page (in order)
1. ॐ preloader while fonts, art, logo layers, photos and music load (capped so it never hangs).
2. Envelope tied with a mauli thread. Two cartoon characters (Shrinav, Vidushi) walk in.
3. Tap: they pull the thread, the envelope opens (<2s), music starts (the tap is what unlocks audio).
4. They hold hands, glow, dissolve into gold dust: his dust fills the **S**, hers the **V** of the couple's logo monogram. Then the logo assembles: hashtag writes, ornament, elephants walk in, gold ring draws round, flowers bloom. Balloons rise.
5. Ganesh blessing, then one full-screen framed card per event: Engagement (indigo night) -> Haldi (turmeric, rani-pink type) -> Wedding (red velvet + countdown). Then couple photo, photo stack, closing.

## Files
| Path | What it is |
|---|---|
| `index.html` | Page skeleton + `<template id="event-tpl">` for event cards |
| `main.js` | All behaviour: boot/preload, envelope, character rig + walk/merge, logo assembly, sky colour states, event cards, countdown, calendar, music |
| `styles.css` | Page styles. `toon.css` = character styles |
| `assets/art/` | Card ornaments (SVG, lifted from the printed card PDF by `tools/extract_art.py`) + rigged characters `groom.svg`, `bride.svg` |
| `assets/logo/` | The couple's real logo split into transparent layers (`tools/split_logo.py`): wreath, ornament, hashtag, mono-s, mono-v, elephant-l/r. Stacked they recreate the exact logo |
| `assets/audio/` | `achutam-keshavam.mp3` (in use), `theme.mp3` (old shehnai). See CREDITS.txt |
| `assets/photos/` | Web crops of the couple photos (raw originals are NOT in the repo) |
| `tools/invites.json` | **Source of truth** for all text, events and links. Not deployed |
| `invites/*.json` | Generated per link. Never edit by hand |
| `mock/` | Design previews (palettes, character demo). Not deployed |
| `guests.html` | Old RSVP replies page. RSVP was removed from the invite; kept but unused |

## Content and the three invite links
Edit `tools/invites.json`, then:
```bash
python tools/build_invites.py
```
| Link | Shows |
|---|---|
| `/` | Wedding only |
| `/i/ct1r4q` | Engagement + Wedding |
| `/i/3oyocz` | Engagement + Haldi + Wedding |

Each link loads only its own `invites/<id>.json`, so a guest's browser never receives events their link doesn't include. Unknown codes fall back to `/`. Event order on the page = order in the link's `events` array. Add `?to=Sharma%20Family` to any link to personalise the envelope.

## Locked decisions (do not undo without the owner asking)
- **Never redraw or retype the logo or hashtag.** The hero animates the real logo layers only. Hashtag spelling: `#RViShCameTrue`.
- **Gold is always the multi-stop foil gradient** (`--foil-grad` in styles.css), never a flat gold colour. Flat gold looked cheap.
- **Each event card owns its colours** via `.event[data-sky="night|sun|crimson"]`. The global sky (`STATES` / `VIA` in main.js) only changes in the gaps between cards. Never let a card show a half-blended background behind its text.
- Event looks: Engagement `night` (#0D1030 -> #241C47, stars, gold), Haldi `sun` (#FFD45A -> #F0A010, rani-pink text and pink foil), Wedding `crimson` (#2B0408 -> #7A0E1C, gold).
- Font is plain Calibri / Carlito for now (Devanagari stays Tiro). Typography will be revisited.
- RSVP form was removed on request.
- Mobile touch: Lenis smooth scroll runs only on `(hover: hover) and (pointer: fine)`; phones use native scrolling. Envelope flap/thread/knot have `pointer-events: none` so only `#open` takes the tap. Every `svh` size has a `vh` fallback before it.

## Characters
`assets/art/groom.svg`, `bride.svg` are rigged: groups `rig`, `body`, `head`, `armL`, `armR`, `legL`, `legR`, `eyes`, `pupils`, `hem`. Pivot points live in `PIV` in main.js (200x400 drawing space). Animate parts with GSAP `svgOrigin`. Shrinav's look follows his photo (side-swept hair, rimless glasses, groomed beard, charcoal Nehru jacket with coral blossoms over a cream chikan kurta).

## Testing tips
- Slow motion: in the console run `gsap.globalTimeline.timeScale(0.1)` before tapping. Freeze: `timeScale(0.00001)`.
- Desktop scrolling from scripts: `window.__lenis.scrollTo(el, { immediate: true })` (plain `window.scrollTo` is fought by Lenis).
- Real touch test: puppeteer `page.touchscreen.tap()` and touchStart/Move/End swipes with an iPhone/Pixel profile.

## Deploy
Vercel static. `vercel.json`: `cleanUrls` + rewrite `/i/:code` -> `/`, `noindex` headers. `.vercelignore` keeps `tools/`, `mock/`, `photos-raw/` out of deploys.
```bash
npx vercel deploy --prod --yes
```
The production project and domain belong to the owner. Anyone else deploys to their own Vercel account.

## Open items
- Engagement and Haldi dates/venues are still "to be announced".
- Reported: not working on an iPhone (device/app not yet identified). Investigate in Safari / WhatsApp in-app browser first.
- rvishcametrue.us DNS (Namecheap) not yet pointed at Vercel.
