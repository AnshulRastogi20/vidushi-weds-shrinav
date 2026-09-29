"""Write <slug>.html for every live non-wedding event in events.js, so WhatsApp's link preview
(which never runs JS) shows that event's title and date. Vercel's cleanUrls then serves /<slug>."""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = (ROOT / "events.js").read_text(encoding="utf-8")
block = src[src.index("window.EVENTS = ") + len("window.EVENTS = "):].rstrip().rstrip(";")
# events.js is plain object literals: quote keys, drop comments and trailing commas, then parse as JSON
js = re.sub(r"//[^\n]*", "", block)
js = re.sub(r"(\n\s*)([A-Za-z_]\w*):", r'\1"\2":', js)
js = re.sub(r",(\s*[}\]])", r"\1", js)
events = json.loads(js)
index = (ROOT / "index.html").read_text(encoding="utf-8")

for slug, ev in events.items():
    out = ROOT / f"{slug}.html"
    if slug == "wedding":
        continue
    if not ev.get("live"):
        if out.exists():
            out.unlink(); print("removed", out.name)
        continue
    desc = " · ".join(x for x in [ev["dateLine"], ev.get("timeLine"), ev.get("venue")] if x)
    html = index
    html = re.sub(r"<title>.*?</title>", f"<title>{ev['title']} · Shrinav &amp; Vidushi</title>", html)
    html = re.sub(r'(<meta property="og:title" content=")[^"]*', rf"\g<1>{ev['title']} · Shrinav &amp; Vidushi", html)
    html = re.sub(r'(<meta property="og:description" content=")[^"]*', rf"\g<1>{desc}", html)
    html = re.sub(r'(<meta name="description" content=")[^"]*', rf"\g<1>{desc}", html)
    out.write_text(html, encoding="utf-8")
    print("wrote", out.name)
