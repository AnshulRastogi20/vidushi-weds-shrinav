# Shrinav weds Vidushi - animated wedding invitation (#RViShCameTrue)

Static site, no build step. Plain HTML/CSS/JS + GSAP. Mobile first (most guests open it from WhatsApp on a phone), must also work on laptops with mouse wheel.

- Live: https://rvishcametrue.us (also https://shrinav-weds-vidushi.vercel.app). Vercel deploys every push to `master`.
- Stack: GSAP 3.12.5 + ScrollTrigger (cdnjs), Lenis (unpkg, desktop only), plain WebGL for the characters (`cast.js`), Google Fonts (Carlito, Tiro Devanagari Hindi). No npm dependencies.

## Run it
```bash
python tools/serve.py          # http://127.0.0.1:5173  (also prints a LAN URL for a phone on the same Wi-Fi)
```
Use this server, not a plain static server: it also routes `/celebrate`, `/family` (and old `/i/<code>` links) to `index.html` the way Vercel does.

## What happens on the page (in order)
1. ॐ preloader while fonts, art, logo layers, photos and music load (capped so it never hangs).
2. Envelope tied with a mauli thread. The couple (AI-animated, `cast.js`) shimmer in on either side of it.
3. Tap: the thread falls, the envelope opens (<2s), music starts (the tap is what unlocks audio).
4. They walk to each other and take hands (the `meet` clip), glow and dissolve into gold (all of them at once): his dust fills the **S**, hers the **V** of the logo. The logo assembles: hashtag, ornament, elephants, gold ring, flowers, balloons.
5. The gold comes back out of the S and V and they stand near the bottom corners, alive (the looping `idle` clip). From here they live *inside* the page: the canvas sits in front of the card colours and ornaments and behind the words.
6. Everything after this is one scroll-driven script (`buildMaster` in main.js): timeline time = scroll position, so scrolling up rewinds it exactly and manual scroll and auto-scroll behave the same. The page also drifts down on its own (auto-scroll button under the music button). Only real scrolling hands over (a tap doesn't), and it picks up again 1 s after the guest stops; it rests 2 s with each event's details centred (`holds` in buildMaster).
7. Ganesh blessing, then per event: FIRST its scene (they come to the middle, the set, an AI-painted plate, draws itself in gold pencil and fills with colour, the stage pins while they act, then they go back to the sides), THEN that event's details. So the wedding scene sits between the haldi details and the wedding details. Engagement = walk in, ring box, rings exchanged (real clips); Haldi = before / haldi on each other's cheeks; Wedding = the jaimala: she garlands him, then he garlands her (no phera: removed on request). Arriving and leaving a set is still a gold shimmer between poses until those clips are made (see AI pipeline).
8. From the mandap they walk hand in hand to the middle and dissolve into gold that lands in the photo arch; the real couple photo appears. Then the closing, all centred: "Kindly respond to" (`rsvp`), "With best compliments from" (`wbcf`), the family line (`family`) and the hashtag.

## Files
| Path | What it is |
|---|---|
| `index.html` | Page skeleton + `<template id="event-tpl">` for event cards |
| `main.js` | Boot/preload, envelope, merge, logo assembly, sky colour states, event cards, the scroll-driven master timeline, auto-scroll, countdown, music |
| `cast.js` | The couple and the sets: plays the keyed clips / key poses / set plates in one shared 9:16 frame on `#world` (WebGL), and every scene's choreography. Exposes `window.World` |
| `assets/cast/` | `<clip>.mp4` (colour left half, matte right half) + `<clip>.json`, `still/*.webp` key poses, `plate/*.webp` sets (+ `-lines` pencil, `-amb` blur). Built by `tools/ai/` |
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
| `/celebrate` | Engagement + Wedding |
| `/family` | Engagement + Haldi + Wedding |

The first links sent out (`/i/ct1r4q`, `/i/3oyocz`) still work: `OLD_LINKS` in main.js maps them to `celebrate` and `family`. A new link = a new entry in `links` (its key is the path) and a rebuild; Vercel's `/:slug` rewrite already serves it.

Each link loads only its own `invites/<id>.json`, so a guest's browser never receives events their link doesn't include (the names are readable, so a guest could guess another link). Unknown names fall back to `/`. Event order on the page = order in the link's `events` array. Add `?to=Sharma%20Family` to any link to personalise the envelope.

## Locked decisions (do not undo without the owner asking)
- **Never redraw or retype the logo or hashtag.** The hero animates the real logo layers only. Hashtag spelling: `#RViShCameTrue`.
- **Gold is always the multi-stop foil gradient** (`--foil-grad` in styles.css), never a flat gold colour. Flat gold looked cheap.
- **Each event card owns its colours** via `.event[data-sky="night|sun|crimson"]`. The global sky (`STATES` / `VIA` in main.js) only changes in the gaps between cards. Never let a card show a half-blended background behind its text.
- Event looks: Engagement `night` (#0D1030 -> #241C47, stars, gold), Haldi `sun` (#FFD45A -> #F0A010, rani-pink text and pink foil), Wedding `crimson` (#2B0408 -> #7A0E1C, gold).
- Font is plain Calibri / Carlito for now (Devanagari stays Tiro). Typography will be revisited.
- RSVP form was removed on request.
- Mobile touch: Lenis smooth scroll runs only on `(hover: hover) and (pointer: fine)`; phones use native scrolling. Envelope flap/thread/knot have `pointer-events: none` so only `#open` takes the tap. Every `svh` size has a `vh` fallback before it.

## Characters
- The live characters are the AI-animated couple in `cast.js`, from the locked character sheets in `tools/ai/ref/locked/` (approved by the owner). She is on the LEFT, he is on the RIGHT in every frame. The old 3D build (`world3d.js`) and the flat SVGs in `assets/art/` are retired.
- Do not change their looks or outfits without the owner approving a draft.
- On wide screens the two halves of the frame are pushed apart while they wait at the sides; the split runs through the empty strip between them in each frame (`cut`/`touch` per frame, written by `python3 tools/ai/cast_cuts.py` from the finished mattes; rerun it after any export, then bump `V` at the top of cast.js: browsers cache `/assets` for a week, so a re-exported file under the same name is otherwise never fetched again). index.html loads styles.css, toon.css, cast.js and main.js with the same `?v=`: bump those together when shipping a change that must reach everyone at once (WhatsApp's in-app browser caches hard). A clip must be fully back together (`sa` = 0) before its first `touch` frame: meet touches at 52%, eng-approach at 18%.
- Every scene is three paused timelines (`approach`, `act`, `leave`) that main.js places on the master timeline by scroll position. Only use tweens (and `fromTo`/`set`) on the state object `S`, never one-off state changes, or scrolling back will not undo them. `play()` scrubs a clip by tween progress; `morph()` turns one pose/clip into another through the gold shimmer.
- Vanishing is a dissolve in the cast shader (`S.dis`), fine gold grain rising from the feet, so everything goes at once.
- Layering: `#world` canvas is z-index 1 after the intro: in front of the page colours (sky, card backgrounds, the photo and moments sections) and the ornaments (frames, corners, dividers), behind the words, which get `position: relative; z-index: 2` (Ganesha, shloka, event tag/title/details/actions/countdown, the photo's caption). The shaders clamp premultiplied colour to alpha: Safari shows garbage colours otherwise.

## AI pipeline (characters)
Key in `.env` (`GEMINI_API_KEY`, Google AI Studio, prepaid). Never print it; `.env` is git-excluded and in `.vercelignore`.
- `tools/ai/gemini.py image|video ...`: Gemini 3 Pro Image stills, Veo 3.1 clips (start + end frame; `lastFrame` is honoured about 8 frames before the clip ends, so exports trim to the best match).
- Key poses on flat green: `tools/ai/out/k/*-green.png` (park, meet, eng-a/b, haldi-a/b, jai-a/b, phera-a, finale, enter) + plates (`eng-plate`, `haldi-plate`, `wed-plate`). Prompts in `tools/ai/prompts/frames/`.
- Clips: `tools/ai/clips.sh <name...>` (start/end pose per clip inside; prompts in `tools/ai/prompts/clips/` + `common.txt`). Veo allows ~4 jobs at once.
- Export: `python3 tools/ai/cast_export.py <clip> --end k/<end-pose>.png` (key, trim, H.264 side-by-side alpha) and `python3 tools/ai/cast_stills.py` (stills + plates). Needs ffmpeg (Homebrew).
- Done: meet, idle, eng-approach, eng-act, jai1 (Veo 3.1; jai1 exported with `--last 110`: after that his own garland fades away and pops back), haldi-act, jai2 (Veo 3.1 Fast, `MODEL=veo-3.1-fast-generate-preview tools/ai/clips.sh ...`). Rejected: a one-clip jaimala (they garlanded themselves), a Veo 3.1 jai2 (he loses the garland he wears; the Fast jai2 export in assets/cast is the good one, its source was overwritten), phera (scene removed on request). Still to make: in, namaste, eng-leave, haldi-approach, haldi-leave, wed-approach, finale (from jai-b, no end frame). Add each to `CLIPS` in cast.js and swap the matching `morph()` for `play()`.

## Testing tips
- Slow motion: in the console run `gsap.globalTimeline.timeScale(0.1)` before tapping. Freeze: `timeScale(0.00001)`.
- WebGL needs a GPU: the gstack headless browser has none. Test with real Chrome (headless "new" + `--use-angle=metal`) via puppeteer-core, or on a phone.
- Desktop scrolling from scripts: `window.__lenis.scrollTo(el, { immediate: true })` (plain `window.scrollTo` is fought by Lenis).
- Real touch test: puppeteer `page.touchscreen.tap()` and touchStart/Move/End swipes with an iPhone/Pixel profile.

## Deploy
Vercel static. `vercel.json`: `cleanUrls` + rewrite `/i/:code` -> `/`, `noindex` headers. `.vercelignore` keeps `tools/`, `mock/`, `photos-raw/` out of deploys.
```bash
npx vercel deploy --prod --yes
```
The production project and domain belong to the owner. Anyone else deploys to their own Vercel account.

## Open items
- Engagement (11 Dec, 7 pm, Majestic) and Haldi (12 Dec, 11 am, Crystal) are set; their end times (11 pm, 2 pm) are estimates. "Add to calendar" was removed on request.
- Reported: not working on an iPhone (device/app not yet identified). Investigate in Safari / WhatsApp in-app browser first.
