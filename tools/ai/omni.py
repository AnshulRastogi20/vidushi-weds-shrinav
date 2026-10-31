"""Video clips with Gemini Omni Flash (Google retired Veo 3.1 on 2026-10-22). Key from card/.env (GEMINI_API_KEY), never printed.
  python3 tools/ai/omni.py <name> <prompt|file> --start img.png [--end img.png] [--ref sheet.png ...] [--aspect 9:16] [--res 720p]
(the prompt should say which image is which: first frame, last frame, then references)
Writes tools/ai/out/clips/<name>.mp4 and prints the raw response shape on errors."""
import argparse, base64, json, pathlib, sys, time, urllib.request, urllib.error

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "tools" / "ai" / "out" / "clips"
API = "https://generativelanguage.googleapis.com/v1beta"


def key():
    for line in (ROOT / ".env").read_text().splitlines():
        if line.strip().startswith("GEMINI_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("GEMINI_API_KEY missing from .env")


def call(url, body=None, raw=False, method=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, method=method,
                                 headers={"x-goog-api-key": key(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=900) as r:
            return r.read() if raw else json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code}: {e.read().decode()[:1200]}")


def img(path):
    p = pathlib.Path(path)
    return {"type": "image", "data": base64.b64encode(p.read_bytes()).decode(),
            "mime_type": "image/png" if p.suffix.lower() == ".png" else "image/jpeg"}


def find(o, k):
    """first value for key k anywhere in a nested response"""
    if isinstance(o, dict):
        if k in o:
            return o[k]
        for v in o.values():
            r = find(v, k)
            if r is not None:
                return r
    if isinstance(o, list):
        for v in o:
            r = find(v, k)
            if r is not None:
                return r
    return None


def shape(o, depth=0):
    if isinstance(o, dict):
        return {k: (f"<{len(v)} chars>" if isinstance(v, str) and len(v) > 200 else shape(v, depth + 1)) for k, v in o.items()}
    if isinstance(o, list):
        return [shape(v, depth + 1) for v in o[:4]]
    return o


ap = argparse.ArgumentParser()
ap.add_argument("name"); ap.add_argument("prompt")
ap.add_argument("--start", required=True); ap.add_argument("--end"); ap.add_argument("--ref", action="append", default=[])
ap.add_argument("--aspect", default="9:16"); ap.add_argument("--res", default="720p")
ap.add_argument("--model", default="gemini-omni-1.1-flash")
a = ap.parse_args()
text = pathlib.Path(a.prompt).read_text() if pathlib.Path(a.prompt).exists() else a.prompt
inputs = [img(a.start)] + ([img(a.end)] if a.end else []) + [img(r) for r in a.ref] + [{"type": "text", "text": text}]
body = {"model": a.model, "input": inputs,
        "response_format": {"type": "video", "delivery": "uri", "aspect_ratio": a.aspect, "resolution": a.res}}
res = call(f"{API}/interactions", body)
# a long-running interaction may come back unfinished: poll it
iid = res.get("id") or res.get("name")
for _ in range(120):
    status = (res.get("status") or res.get("state") or "").lower()
    if find(res, "uri") or find(res, "data") or status in ("completed", "complete", "succeeded", "failed", "error"):
        break
    time.sleep(10)
    res = call(f"{API}/interactions/{iid}")
OUT.mkdir(parents=True, exist_ok=True)
out = OUT / f"{a.name}.mp4"
uri = find(res, "uri")
if uri:
    fid = uri.rstrip("/").split("/files/")[-1].split(":")[0].split("?")[0]
    for _ in range(60):
        f = call(f"{API}/files/{fid}")
        if f.get("state") in ("ACTIVE", None):
            break
        time.sleep(5)
    out.write_bytes(call(f"{API}/files/{fid}:download?alt=media", raw=True))
else:
    data = find(res, "data")
    if not data:
        sys.exit("no video in response: " + json.dumps(shape(res))[:1500])
    out.write_bytes(base64.b64decode(data))
print(out)
usage = find(res, "usage") or find(res, "usage_metadata")
if usage:
    print("usage:", json.dumps(usage)[:400])
