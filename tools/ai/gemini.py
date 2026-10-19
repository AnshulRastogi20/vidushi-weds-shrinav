"""Google AI Studio: stills with Gemini image models, clips with Veo. Key from card/.env (GEMINI_API_KEY=...), never printed.
  python3 tools/ai/gemini.py models                                  # list what this key can use
  python3 tools/ai/gemini.py image <name> <prompt|file> [--ref p ...] [--aspect 9:16] [--model ...]
  python3 tools/ai/gemini.py video <name> <prompt|file> --start img.png [--end img.png] [--aspect 9:16] [--seconds 8] [--model ...]
Output goes to tools/ai/out/."""
import argparse, base64, json, pathlib, sys, time, urllib.request, urllib.error

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "tools" / "ai" / "out"
API = "https://generativelanguage.googleapis.com/v1beta"


def key():
    for name in (".env", ".env.local"):
        f = ROOT / name
        if f.exists():
            for line in f.read_text().splitlines():
                if line.strip().startswith("GEMINI_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("GEMINI_API_KEY missing from .env")


def call(url, body=None, raw=False):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"x-goog-api-key": key(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            return r.read() if raw else json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code}: {e.read().decode()[:800]}")


def b64(path):
    p = pathlib.Path(path)
    return ("image/png" if p.suffix.lower() == ".png" else "image/jpeg"), base64.b64encode(p.read_bytes()).decode()


def text_of(arg):
    p = pathlib.Path(arg)
    return p.read_text() if p.exists() else arg


def models():
    res = call(f"{API}/models?pageSize=200")
    for m in res.get("models", []):
        name = m["name"].split("/", 1)[1]
        if any(k in name for k in ("image", "veo", "imagen")):
            print(name, "|", ",".join(m.get("supportedGenerationMethods", [])))


def image(a):
    parts = [{"text": text_of(a.prompt)}]
    for r in a.ref:
        mime, data = b64(r); parts.append({"inline_data": {"mime_type": mime, "data": data}})
    body = {"contents": [{"parts": parts}], "generationConfig": {"responseModalities": ["TEXT", "IMAGE"], "imageConfig": {"aspectRatio": a.aspect}}}
    res = call(f"{API}/models/{a.model}:generateContent", body)
    OUT.mkdir(parents=True, exist_ok=True)
    n = 0
    for cand in res.get("candidates", []):
        for part in cand.get("content", {}).get("parts", []):
            d = part.get("inlineData") or part.get("inline_data")
            if d:
                out = OUT / (f"{a.name}.png" if n == 0 else f"{a.name}-{n + 1}.png")
                out.write_bytes(base64.b64decode(d["data"])); print(out); n += 1
    if not n:
        sys.exit("no image returned: " + json.dumps(res)[:800])


def video(a):
    inst = {"prompt": text_of(a.prompt)}
    mime, data = b64(a.start); inst["image"] = {"bytesBase64Encoded": data, "mimeType": mime}
    if a.end:
        mime, data = b64(a.end); inst["lastFrame"] = {"bytesBase64Encoded": data, "mimeType": mime}
    params = {"aspectRatio": a.aspect, "durationSeconds": a.seconds, "resolution": a.res, "personGeneration": "allow_adult"}
    op = call(f"{API}/models/{a.model}:predictLongRunning", {"instances": [inst], "parameters": params})
    name = op["name"]
    print("started", name.split("/")[-1], flush=True)
    while not op.get("done"):
        time.sleep(10)
        op = call(f"{API}/{name}")
    if "error" in op:
        sys.exit("video failed: " + json.dumps(op["error"])[:800])
    samples = (op.get("response", {}).get("generateVideoResponse", {}) or {}).get("generatedSamples", [])
    if not samples:
        sys.exit("no video returned: " + json.dumps(op)[:800])
    OUT.mkdir(parents=True, exist_ok=True)
    for i, s in enumerate(samples):
        uri = s["video"]["uri"]
        out = OUT / (f"{a.name}.mp4" if i == 0 else f"{a.name}-{i + 1}.mp4")
        out.write_bytes(call(uri, raw=True)); print(out)


ap = argparse.ArgumentParser()
sub = ap.add_subparsers(dest="cmd", required=True)
sub.add_parser("models")
pi = sub.add_parser("image"); pi.add_argument("name"); pi.add_argument("prompt"); pi.add_argument("--ref", action="append", default=[])
pi.add_argument("--aspect", default="9:16"); pi.add_argument("--model", default="gemini-3-pro-image-preview")
pv = sub.add_parser("video"); pv.add_argument("name"); pv.add_argument("prompt"); pv.add_argument("--start", required=True); pv.add_argument("--end")
pv.add_argument("--aspect", default="9:16"); pv.add_argument("--seconds", type=int, default=8); pv.add_argument("--res", default="1080p"); pv.add_argument("--model", default="veo-3.1-generate-preview")
a = ap.parse_args()
{"models": lambda: models(), "image": lambda: image(a), "video": lambda: video(a)}[a.cmd]()
