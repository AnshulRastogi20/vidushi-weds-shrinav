"""Green-screen Veo clips -> transparent video the page scrubs by scroll.
  python3 tools/ai/cast_export.py <clip> [--end k/<frame>.png] [--fps 24] [--width 640] [--crf 24]
Reads tools/ai/out/clips/<clip>.mp4, writes assets/cast/<clip>.mp4 (colour premultiplied on the left half,
matte on the right half, H.264 with a short GOP so it scrubs both ways) + <clip>.json.
Every clip shares one 9:16 frame, so they line up with each other and with the stills and plates.
The json has the frame count, fps, and per-frame bride/groom boxes (fractions of the frame) for the gold dust."""
import argparse, json, pathlib, shutil, subprocess, tempfile, cv2, numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "cast"


def key(bgr):
    """difference matte on the green, then unmix the green out of the edge pixels. returns RGBA float 0..1"""
    f = bgr[..., ::-1].astype(np.float32) / 255.0
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    border = np.concatenate([f[:8].reshape(-1, 3), f[-8:].reshape(-1, 3), f[:, :8].reshape(-1, 3), f[:, -8:].reshape(-1, 3)])
    bg = np.median(border[(border[:, 1] - np.maximum(border[:, 0], border[:, 2])) > 0.3], axis=0) if len(border) else np.array([0, 1, 0])
    d = g - np.maximum(r, b)                      # how much greener than the rest
    a = 1.0 - np.clip((d - 0.08) / (0.42 - 0.08), 0, 1)
    a = cv2.morphologyEx(a, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    a = cv2.erode(a, np.ones((2, 2), np.uint8))   # pull the edge in a touch: no green halo
    a = cv2.GaussianBlur(a, (3, 3), 0)
    a[a < 0.04] = 0
    # Veo frames carry a thin dark border: never let the frame's own edge show
    a[:, :5] = 0; a[:, -5:] = 0; a[:3] = 0; a[-3:] = 0
    # what the pixel would be without the green behind it
    am = np.maximum(a, 0.08)[..., None]
    unmixed = np.clip((f - (1 - am) * bg) / am, 0, 1)
    clamped = f.copy(); clamped[..., 1] = np.minimum(f[..., 1], np.maximum(f[..., 0], f[..., 2]))
    rgb = 0.5 * unmixed + 0.5 * clamped          # one leans purple, the other olive: together they're neutral
    rgb = np.where(a[..., None] > 0.97, f, rgb)
    # and never greener than the brighter of red and blue
    lim = np.maximum(rgb[..., 0], rgb[..., 2])
    rgb[..., 1] = np.minimum(rgb[..., 1], lim * 1.0 + 0.02)
    rgb[a == 0] = 0  # nothing under the clear parts, so they compress to almost nothing
    return np.dstack([rgb, a])


def split_boxes(a):
    """bride (left) and groom (right) boxes from the alpha, as fractions"""
    H, W = a.shape
    cols = a.sum(0); xs = np.where(cols > 2)[0]
    if len(xs) == 0:
        return None
    x0, x1 = xs[0], xs[-1]
    lo, hi = x0 + int((x1 - x0) * 0.3), x0 + int((x1 - x0) * 0.7)
    cut = lo + int(np.argmin(cols[lo:hi + 1])) if hi > lo else (x0 + x1) // 2

    def box(sl, off):
        m = a[:, sl] > 0.3
        ys, xs2 = np.where(m)
        if len(ys) == 0:
            return [0.5, 0.6, 0.0, 0.0]
        return [round((xs2.min() + off) / W, 4), round(ys.min() / H, 4), round((xs2.max() - xs2.min()) / W, 4), round((ys.max() - ys.min()) / H, 4)]
    return {"bride": box(slice(0, cut), 0), "groom": box(slice(cut, W), cut)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("clip"); ap.add_argument("--end"); ap.add_argument("--fps", type=float, default=24)
    ap.add_argument("--width", type=int, default=640); ap.add_argument("--crf", type=int, default=24)
    ap.add_argument("--first", type=int, default=0); ap.add_argument("--last", type=int, help="stop at this source frame")
    a = ap.parse_args()
    cap = cv2.VideoCapture(str(ROOT / "tools/ai/out/clips" / f"{a.clip}.mp4"))
    src_fps = cap.get(cv2.CAP_PROP_FPS)
    frames = []
    while True:
        ok, f = cap.read()
        if not ok:
            break
        frames.append(f)
    W = a.width; H = round(W * 16 / 9 / 2) * 2
    frames = [cv2.resize(f, (W, H), interpolation=cv2.INTER_AREA) for f in frames]
    last = len(frames) - 1
    if a.end:  # Veo reaches the last frame a few frames early, then drifts: stop where it matches best
        k = cv2.resize(cv2.imread(str(ROOT / "tools/ai/out" / a.end)), (W, H), interpolation=cv2.INTER_AREA).astype(np.float32)
        tail = range(max(0, len(frames) - 24), len(frames))
        diffs = {i: float(np.abs(frames[i].astype(np.float32) - k).mean()) for i in tail}
        last = min(diffs, key=diffs.get)
        print(f"end match at frame {last} of {len(frames) - 1} (diff {diffs[last]:.1f})")
    if a.last is not None:
        last = min(last, a.last)
    span = frames[a.first:last + 1]
    n = max(2, round((len(span) - 1) / src_fps * a.fps) + 1)
    pick = [a.first + round(i * (len(span) - 1) / (n - 1)) for i in range(n)]
    OUT.mkdir(parents=True, exist_ok=True)
    tmp = pathlib.Path(tempfile.mkdtemp())
    boxes = []
    for j, i in enumerate(pick):
        rgba = key(frames[i])
        al = rgba[..., 3:4]
        boxes.append(split_boxes(rgba[..., 3]))
        # side by side: premultiplied colour on the left, the matte on the right
        sbs = np.concatenate([rgba[..., :3] * al, np.repeat(al, 3, 2)], 1)
        cv2.imwrite(str(tmp / f"{j:04d}.png"), (sbs[..., ::-1] * 255 + 0.5).astype(np.uint8))
    out = OUT / f"{a.clip}.mp4"
    # short GOP and no B-frames, so scrubbing backwards and forwards stays quick
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(a.fps), "-i", str(tmp / "%04d.png"),
                    "-c:v", "libx264", "-preset", "slow", "-crf", str(a.crf), "-pix_fmt", "yuv420p", "-g", "8", "-bf", "0",
                    "-movflags", "+faststart", "-an", str(out)], check=True)
    shutil.rmtree(tmp)
    meta = {"frames": n, "fps": a.fps, "w": W, "h": H, "boxes": boxes}
    (OUT / f"{a.clip}.json").write_text(json.dumps(meta, separators=(",", ":")))
    print(f"{a.clip}: {n} frames, {out.stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
