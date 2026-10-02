"""Write one data file per invitation link into invites/<id>.json, each holding ONLY that link's events.
A wedding-only guest's browser never receives engagement or haldi details.
Usage: python tools/build_invites.py"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = json.loads((ROOT / "tools" / "invites.json").read_text(encoding="utf-8"))
out = ROOT / "invites"
out.mkdir(exist_ok=True)
for old in out.glob("*.json"):
    old.unlink()

for link_id, link in src["links"].items():
    events = [{"key": k, **src["events"][k]} for k in link["events"]]
    (out / f"{link_id}.json").write_text(
        json.dumps({"common": src["common"], "events": events}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{link['path']:<14} -> invites/{link_id}.json  ({', '.join(link['events'])})")
