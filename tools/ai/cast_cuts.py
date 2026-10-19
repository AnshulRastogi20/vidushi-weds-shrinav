"""For every frame of every clip (and every still), find where to split the frame between her (left) and him (right)
when the page pushes them apart on wide screens: the middle of the widest strip of columns that is completely
empty between them. Frames with no empty strip are marked "touch" (the page must not split those).
Reads the finished assets (the matte half of assets/cast/<clip>.mp4, the alpha of the stills), so it works on
clips whose source is gone. Writes "cut" and "touch" into each frame's entry in the json.
  python3 tools/ai/cast_cuts.py"""
import json, pathlib, cv2, numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
CAST = ROOT / "assets" / "cast"


def cut_of(alpha, prev):
    W = alpha.shape[1]
    used = (alpha > 0.06).any(axis=0)
    xs = np.where(used)[0]
    if len(xs) == 0:
        return prev, False
    runs, start = [], None
    for x in range(xs[0], xs[-1] + 1):
        if not used[x] and start is None:
            start = x
        elif used[x] and start is not None:
            runs.append((start, x)); start = None
    if not runs:
        return prev, True
    # the widest empty strip (ties: the one nearest the last cut, so the line doesn't jump around)
    best = max(runs, key=lambda r: (r[1] - r[0], -abs((r[0] + r[1]) / 2 / W - prev)))
    return round((best[0] + best[1]) / 2 / W, 4), False


for meta_path in sorted(CAST.glob("*.json")):
    meta = json.loads(meta_path.read_text())
    cap = cv2.VideoCapture(str(meta_path.with_suffix(".mp4")))
    prev, touching = 0.5, 0
    for i, box in enumerate(meta["boxes"]):
        ok, f = cap.read()
        if not ok:
            break
        half = f.shape[1] // 2
        cut, touch = cut_of(f[:, half:, 0].astype(np.float32) / 255, prev)
        box = box or {}
        box["cut"], box["touch"] = cut, touch
        meta["boxes"][i] = box
        prev = cut; touching += touch
    meta_path.write_text(json.dumps(meta, separators=(",", ":")))
    first = next((i for i, b in enumerate(meta["boxes"]) if b and b.get("touch")), None)
    print(f"{meta_path.stem}: {len(meta['boxes'])} frames, touching in {touching}, first touch at frame {first}")

still = CAST / "still" / "meta.json"
meta = json.loads(still.read_text())
for name, box in meta["boxes"].items():
    a = np.asarray(Image.open(CAST / "still" / f"{name}.webp").convert("RGBA"))[..., 3].astype(np.float32) / 255
    cut, touch = cut_of(a, 0.5)
    box = box or {}; box["cut"], box["touch"] = cut, touch; meta["boxes"][name] = box
still.write_text(json.dumps(meta, separators=(",", ":")))
print("stills:", {k: (v["cut"], v["touch"]) for k, v in meta["boxes"].items()})
