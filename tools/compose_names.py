"""Reorder the card's own lettering: the Vatsa card reads "Vidushi weds Shrinav"; the Rastogi
side reads "Shrinav weds Vidushi". Same glyphs, same gaps, words swapped."""
import re
from pathlib import Path

ART = Path(__file__).resolve().parent.parent / "assets" / "art"
svg = (ART / "names-script.svg").read_text(encoding="utf-8")
groups = re.findall(r'<g class="w">(.*?)</g>', svg)
assert len(groups) == 3, "expected Vidushi / weds / Shrinav"

def xs(g):
    nums = [float(n) for d in re.findall(r' d="([^"]+)"', g) for n in re.findall(r"-?\d+(?:\.\d+)?", d)]
    return nums[0::2], nums[1::2]

box = []
for g in groups:
    x, y = xs(g)
    box.append((min(x), max(x), min(y), max(y)))
(v0, v1, *_), (w0, w1, *_), (s0, s1, *_) = box
gap1, gap2 = w0 - v1, s0 - w1          # Vidushi->weds, weds->Shrinav
order = [(groups[2], s0, s1), (groups[1], w0, w1), (groups[0], v0, v1)]
gaps = [gap2, gap1]                      # keep each gap with the small word "weds"
out, cursor = [], v0
for i, (g, x0, x1) in enumerate(order):
    dx = cursor - x0
    out.append(f'<g class="w" transform="translate({dx:.2f} 0)">{g}</g>')
    cursor = x1 + dx + (gaps[i] if i < 2 else 0)
y0 = min(b[2] for b in box) - 2; y1 = max(b[3] for b in box) + 2
vb = f"{v0 - 2:.2f} {y0:.2f} {cursor - v0 + 4:.2f} {y1 - y0:.2f}"
(ART / "names-script-groom.svg").write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">{"".join(out)}</svg>', encoding="utf-8")
print("names-script-groom.svg", vb)
