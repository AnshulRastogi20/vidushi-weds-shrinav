# Vidushi weds Shrinav · rvishcametrue.us

Static invitation site, no build step. Hosted on Vercel, RSVPs in Supabase (PersonalWebsite project).

## Routes
- `/` wedding · `/haldi` · `/mehndi` - one template, content + theme from `events.js`.
  Pages never link to each other, so each link only reveals its own event.
- An event with `live: false` renders only on the local preview server. To launch one:
  fill its fields in `events.js`, set `live: true`, then `python tools/build_pages.py` (writes `haldi.html` etc. with the right link preview).
- `/guests` - family-only replies page (passcode). CSV export.
- Personal links: `/?to=Sharma%20Family` fills the envelope's "To," and prefills the RSVP name.

## Assets
- Card art `assets/art/` is lifted from the printer's vector PDF by `tools/extract_art.py`.
- Photos: originals in `photos-raw/` (git-ignored), web crops in `assets/photos/`.
- Music: `assets/audio/theme.mp3` (Pixabay licence, see CREDITS.txt).

## RSVP backend
- `public.wedding_rsvps`, no direct access. Guests call `submit_wedding_rsvp()`, the family page calls `list_wedding_rsvps(passcode)`.
- Change the passcode: `update wedding_admin set passcode_hash = extensions.crypt('<new>', extensions.gen_salt('bf'));`

## Local preview
`python tools/serve.py` then http://127.0.0.1:5173 (the phone URL on the same Wi-Fi is printed too).
