# Vidushi weds Shrinav

Static wedding invitation site. No build step: `index.html` + `styles.css` + `main.js`.

- Art in `assets/art/` is lifted from the printer's vector PDF by `tools/extract_art.py`.
- Photos: `assets/photos/bride.jpg`, `groom.jpg`, `moment-1..5.jpg`. A missing file shows the monogram.
- Music: `assets/audio/theme.mp3`. If absent, the music button hides itself.
- Personal link: `/?to=Sharma%20Family` fills the envelope's "To,".
- Local preview: `python -m http.server 5173`, then open http://127.0.0.1:5173
