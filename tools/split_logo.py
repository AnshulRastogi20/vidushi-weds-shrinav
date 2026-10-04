"""Split the couple's logo (one flat PNG) into transparent layers that stack back into the exact logo.
Layers: wreath (ring + flowers), elephant-l, elephant-r, ornament, hashtag, mono-s, mono-v."""
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage  # noqa

SRC = r"D:/Anshul/Shrinav Bhaiyya/logo.png"
OUT = "assets/logo"
im = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32)
H, W, _ = im.shape
k = W / 1794  # the coordinates below were read off a 1794-wide preview

# alpha: distance from the ivory paper (estimated locally, so the paper grain and vignette drop out)
paper = np.asarray(Image.open(SRC).convert("RGB").filter(ImageFilter.MedianFilter(3)).resize((W // 16, H // 16), Image.BILINEAR)
                   .filter(ImageFilter.MaxFilter(5)).resize((W, H), Image.BILINEAR)).astype(np.float32)
dist = np.sqrt(((im - paper) ** 2).sum(-1))
alpha = np.clip((dist - 10) / 30, 0, 1)

r, g, b = im[..., 0], im[..., 1], im[..., 2]
mx, mn = im.max(-1), im.min(-1)
sat = (mx - mn) / np.maximum(mx, 1)
hue = np.zeros_like(mx)
d = np.maximum(mx - mn, 1e-3)
hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
gold = (hue >= 28) & (hue <= 58) & (sat > 0.18) & (alpha > 0.05)

def box(x0, y0, x1, y1):
    m = np.zeros((H, W), bool); m[int(y0 * k):int(y1 * k), int(x0 * k):int(x1 * k)] = True; return m

mono_box, tag_box, orn_box = box(575, 800, 1312, 1492), box(505, 645, 1240, 785), box(710, 465, 1080, 605)
el_l, el_r = box(100, 1185, 572, 1705), box(1192, 1185, 1705, 1665)

mono = gold & mono_box
# S and V touch, so split by shape: the V's two strokes all sit right of x~940 (preview coords);
# the S body and its long hairline flourish sit left of it.
from PIL import ImageDraw
vpoly = Image.new("L", (W, H), 0)
ImageDraw.Draw(vpoly).polygon([(int(x * k), int(y * k)) for x, y in
    [(942, 905), (1060, 905), (1060, 810), (1320, 790), (1320, 1500), (942, 1500)]], fill=1)
vpoly = np.asarray(vpoly).astype(bool)
mono &= ~el_l & ~el_r
def keep_big(m):  # drop stray specks (bits of flowers or elephant jewellery that happen to be gold)
    lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=3))
    if not n: return m
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    keep = [i + 1 for i, sz in enumerate(sizes) if sz > 0.03 * sizes.max()]
    return m & np.isin(lab, keep)
v_mask = keep_big(mono & vpoly)
s_mask = keep_big(mono & ~vpoly)

layers = {
    "mono-s": s_mask, "mono-v": v_mask,
    "hashtag": gold & tag_box, "ornament": gold & orn_box,
    "elephant-l": el_l & (alpha > 0), "elephant-r": el_r & (alpha > 0),
}
# elephants: cut by colour inside their boxes (grey body, blue trim, gold howdah, orange blanket),
# then fill holes (the pink mandala on the blanket) and keep the one big body, so no flowers ride along
val = mx / 255
body = (alpha > 0.35) & (((sat < 0.30) & (val < 0.80)) | ((hue >= 165) & (hue <= 260)) |
                         ((hue >= 8) & (hue <= 58) & (sat > 0.42)))
def elephant(boxm):
    m = ndimage.binary_closing(body & boxm, iterations=4)
    m = ndimage.binary_fill_holes(m)
    lab, n = ndimage.label(m)
    if not n: return m
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    m = lab == (1 + int(np.argmax(sizes)))
    return ndimage.binary_opening(m, iterations=2) & (alpha > 0) & boxm
layers["elephant-l"] = elephant(el_l)
layers["elephant-r"] = elephant(el_r)
used = np.zeros((H, W), bool)
for m in layers.values(): used |= m
layers["wreath"] = (alpha > 0) & ~used

src = np.asarray(Image.open(SRC).convert("RGB"))
scale = 1100 / W
for name, m in layers.items():
    a = (alpha * ndimage.binary_dilation(m, iterations=1)) * 255
    rgba = np.dstack([src, a.astype(np.uint8)])
    out = Image.fromarray(rgba, "RGBA").resize((1100, round(H * scale)), Image.LANCZOS)
    out.save(f"{OUT}/{name}.webp", quality=88, method=6)
    print(name, out.size)
