"""Key the green stills and prepare the set plates (colour + a gold pencil-line version for the sketch-in).
  python3 tools/ai/cast_stills.py
Writes assets/cast/still/<name>.webp, assets/cast/plate/<name>.webp, <name>-lines.webp and <name>-amb.webp (blurred,
for wide screens), plus boxes in still/meta.json."""
import json, pathlib, sys, cv2, numpy as np
from PIL import Image
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from cast_export import key, split_boxes

ROOT = pathlib.Path(__file__).resolve().parents[2]
K = ROOT / "tools/ai/out/k"
OUT = ROOT / "assets/cast"
W = 640; H = round(W * 16 / 9)
STILLS = ["park", "meet", "eng-a", "eng-b", "haldi-a", "haldi-b", "jai-a", "jai-m", "jai-b", "finale"]
PLATES = {"engagement": "eng-plate", "haldi": "haldi-plate", "wedding": "wed-plate"}


def load(name):
    return cv2.resize(cv2.imread(str(K / f"{name}.png")), (W, H), interpolation=cv2.INTER_AREA)


(OUT / "still").mkdir(parents=True, exist_ok=True); (OUT / "plate").mkdir(parents=True, exist_ok=True)
meta = {}
for n in STILLS:
    rgba = key(load(f"{n}-green"))
    meta[n] = split_boxes(rgba[..., 3])
    Image.fromarray((rgba * 255 + 0.5).astype(np.uint8)).save(OUT / "still" / f"{n}.webp", "WEBP", quality=80, alpha_quality=85, method=6)
(OUT / "still" / "meta.json").write_text(json.dumps({"w": W, "h": H, "boxes": meta}, separators=(",", ":")))

for scene, src in PLATES.items():
    img = load(src)
    Image.fromarray(img[..., ::-1]).save(OUT / "plate" / f"{scene}.webp", "WEBP", quality=78, method=6)
    # a soft, blurred copy that fills wide screens behind the sharp set
    amb = cv2.GaussianBlur(cv2.resize(img, (160, 284), interpolation=cv2.INTER_AREA), (0, 0), 7)
    Image.fromarray(amb[..., ::-1]).save(OUT / "plate" / f"{scene}-amb.webp", "WEBP", quality=70, method=6)
    # pencil lines: colour dodge of the grey image by its blurred negative, kept as alpha
    grey = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
    blur = cv2.GaussianBlur(255 - grey, (0, 0), 6)
    dodge = np.clip(grey * 255 / np.maximum(1, 255 - blur), 0, 255)
    line = np.clip((235 - dodge) / 120, 0, 1) ** 0.8
    edges = cv2.Canny(cv2.GaussianBlur(img, (3, 3), 0), 60, 140).astype(np.float32) / 255
    line = np.clip(line * 0.85 + edges * 0.5, 0, 1)
    rgba = np.dstack([np.full_like(line, 255), np.full_like(line, 255), np.full_like(line, 255), line * 255]).astype(np.uint8)
    Image.fromarray(rgba).save(OUT / "plate" / f"{scene}-lines.webp", "WEBP", quality=70, alpha_quality=70, method=6)
total = sum(p.stat().st_size for p in (OUT / "still").glob("*")) + sum(p.stat().st_size for p in (OUT / "plate").glob("*"))
print(f"stills + plates: {total / 1e6:.2f} MB")
