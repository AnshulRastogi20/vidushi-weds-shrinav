"""Pull the printed card's vector ornaments + script lettering into standalone SVGs.
Source: the printer's PDF (fully vector). Output: assets/art/*.svg, all paths in
absolute page coordinates baked (no transforms) so stroke-draw animation works."""
import re, sys, fitz
from pathlib import Path

PDF = Path(sys.argv[1] if len(sys.argv) > 1 else r"C:/Users/Anshul/Downloads/wed Vidushi & Shrinav.pdf")
OUT = Path(__file__).resolve().parent.parent / "assets" / "art"
WHITE = (1.0, 1.0, 1.0)

def f(v): return f"{v:.2f}".rstrip("0").rstrip(".")

def drawing_d(dr):
    parts, cur = [], None
    for it in dr["items"]:
        op = it[0]
        if op == "l":
            a, b = it[1], it[2]
            if cur is None or abs(cur.x - a.x) > .01 or abs(cur.y - a.y) > .01: parts.append(f"M{f(a.x)} {f(a.y)}")
            parts.append(f"L{f(b.x)} {f(b.y)}"); cur = b
        elif op == "c":
            a, c1, c2, b = it[1:5]
            if cur is None or abs(cur.x - a.x) > .01 or abs(cur.y - a.y) > .01: parts.append(f"M{f(a.x)} {f(a.y)}")
            parts.append(f"C{f(c1.x)} {f(c1.y)} {f(c2.x)} {f(c2.y)} {f(b.x)} {f(b.y)}"); cur = b
        elif op == "re":
            r = it[1]; parts.append(f"M{f(r.x0)} {f(r.y0)}H{f(r.x1)}V{f(r.y1)}H{f(r.x0)}Z"); cur = None
        elif op == "qu":
            q = it[1]; parts.append(f"M{f(q.ul.x)} {f(q.ul.y)}L{f(q.ur.x)} {f(q.ur.y)}L{f(q.lr.x)} {f(q.lr.y)}L{f(q.ll.x)} {f(q.ll.y)}Z"); cur = None
    if dr.get("closePath"): parts.append("Z")
    return "".join(parts)

def drawings_in(page, clip):
    out = []
    for dr in page.get_drawings():
        r = fitz.Rect(dr["rect"])
        if r.width > 380 or r.height > 380: continue          # page frames
        if not clip.contains(r): continue
        fill, stroke = dr.get("fill"), dr.get("color")
        attrs = []
        if fill is not None:
            attrs.append('class="k"' if tuple(fill) == WHITE else 'class="i"')
            if dr.get("even_odd"): attrs.append('fill-rule="evenodd"')
        else:
            attrs.append(f'class="s" stroke-width="{f(dr.get("width") or 1)}"')
        out.append(f'<path {" ".join(attrs)} d="{drawing_d(dr)}"/>')
    return out

# --- glyph outlines from MuPDF's text-as-path SVG ---------------------------
NUM = r"-?(?:\d+\.?\d*|\.\d+)(?:[eE]-?\d+)?"
def transform_d(d, m):
    a, b, c, dd, e, ff = m
    toks = re.findall(r"[MLCHVZmlchvz]|" + NUM, d)
    out, i, cmd, cx, cy = [], 0, None, 0.0, 0.0
    def P(x, y): return a * x + c * y + e, b * x + dd * y + ff
    while i < len(toks):
        t = toks[i]
        if re.fullmatch("[A-Za-z]", t): cmd = t; i += 1
        if cmd in "Zz": out.append("Z"); continue
        if cmd in "ML":
            x, y = float(toks[i]), float(toks[i + 1]); i += 2; cx, cy = x, y
            X, Y = P(x, y); out.append(f"{cmd}{f(X)} {f(Y)}"); cmd = "L" if cmd == "M" else cmd
        elif cmd == "H":
            cx = float(toks[i]); i += 1; X, Y = P(cx, cy); out.append(f"L{f(X)} {f(Y)}")
        elif cmd == "V":
            cy = float(toks[i]); i += 1; X, Y = P(cx, cy); out.append(f"L{f(X)} {f(Y)}")
        elif cmd == "C":
            v = [float(x) for x in toks[i:i + 6]]; i += 6; cx, cy = v[4], v[5]
            pts = [P(v[k], v[k + 1]) for k in (0, 2, 4)]
            out.append("C" + " ".join(f"{f(x)} {f(y)}" for x, y in pts))
        else:
            raise ValueError(f"unsupported path op {cmd}")
    return "".join(out)

def glyphs_in(page, clip, word_break_gap=6):
    svg = page.get_svg_image(text_as_path=True)
    defs = dict(re.findall(r'<path id="([^"]+)" d="([^"]+)"', svg))
    words, cur, last_x = [], [], None
    for ch, ref, mat in re.findall(r'<use data-text="([^"]*)" xlink:href="#([^"]+)" transform="matrix\(([^)]+)\)"', svg):
        m = [float(x) for x in mat.split(",")]
        if not clip.contains(fitz.Point(m[4], m[5])): continue
        if ch.strip() == "":
            if cur: words.append(cur); cur = []
            continue
        cur.append(f'<path class="i" data-ch="{ch}" d="{transform_d(defs[ref], m)}"/>')
    if cur: words.append(cur)
    return words

def write(name, clip, body, pad=2):
    vb = f"{f(clip.x0 - pad)} {f(clip.y0 - pad)} {f(clip.width + 2 * pad)} {f(clip.height + 2 * pad)}"
    (OUT / f"{name}.svg").write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">{"".join(body)}</svg>', encoding="utf-8")
    print(f"{name}.svg  {len(body)} parts  {(OUT / f'{name}.svg').stat().st_size // 1024} KB")

doc = fitz.open(PDF)
p0, p1, p2 = doc[0], doc[1], doc[2]
R = fitz.Rect
write("bell-left",  R(30, 95, 112, 312),  drawings_in(p0, R(30, 95, 112, 312)))
write("bell-right", R(483, 95, 566, 312), drawings_in(p0, R(483, 95, 566, 312)))
write("monogram",   R(187, 235, 408, 467), drawings_in(p0, R(187, 235, 408, 467)))
write("ganesha",    R(264, 120, 333, 202), drawings_in(p1, R(264, 120, 333, 202)))
write("divider",    R(211, 279, 385, 292), drawings_in(p1, R(211, 279, 385, 292)))
write("ornament",   R(220, 671, 377, 724), drawings_in(p1, R(220, 671, 377, 724)))
write("corner",     R(57, 114, 163, 250), drawings_in(p1, R(57, 114, 163, 250)))
w = glyphs_in(p0, R(70, 500, 520, 600))
write("names-script", R(74, 512, 512, 584), [f'<g class="w">{"".join(x)}</g>' for x in w])
w = glyphs_in(p2, R(130, 330, 460, 420))
write("wedding-ceremony", R(132, 332, 452, 410), [f'<g class="w">{"".join(x)}</g>' for x in w])
