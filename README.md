# Shrinav weds Vidushi · rvishcametrue.us

Static invitation site, no build step. Hosted on Vercel, RSVPs in Supabase (PersonalWebsite project).

## Flow
ॐ preloader (everything loads) -> envelope tied with mauli thread -> tap: Shrinav + Vidushi pull the thread,
envelope opens (<2s) -> they jump into "Sh" and "Vi" of #RViShcametrue -> wedding -> engagement -> haldi -> photos -> RSVP.

## Links (selective invites)
- `/` wedding only · `/i/ct1r4q` wedding + engagement · `/i/3oyocz` all three.
- Source of truth: `tools/invites.json` (not deployed). Run `python tools/build_invites.py` after editing;
  it writes `invites/<id>.json` with ONLY that link's events, so a wedding-only guest never receives haldi details.
- `/guests` - family-only replies page (passcode). CSV export.
- Personal links: add `?to=Sharma%20Family` to any link; it fills the envelope's "To," and the RSVP name.

## Characters
`assets/art/groom.svg` + `bride.svg` (rigged parts: legL/legR/armL/armR/head/body/rig), styled by `toon.css`.
`mock/characters.html` is the standalone walk-in demo (not deployed).

## Assets
- Card art `assets/art/` is lifted from the printer's vector PDF by `tools/extract_art.py`.
- Photos: originals in `photos-raw/` (git-ignored), web crops in `assets/photos/`.
- Music: `assets/audio/theme.mp3` (Pixabay licence, see CREDITS.txt).

## RSVP backend
- `public.wedding_rsvps`, no direct access. Guests call `submit_wedding_rsvp()`, the family page calls `list_wedding_rsvps(passcode)`.
- Change the passcode: `update wedding_admin set passcode_hash = extensions.crypt('<new>', extensions.gen_salt('bf'));`

## Local preview
`python tools/serve.py` then http://127.0.0.1:5173 (the phone URL on the same Wi-Fi is printed too).
