"""chunks.json → src/assets/nlu/compare.json + compare.bin, for /assets/nlu/compare.html:
a page where Gab types his own questions and sees, side by side, what brainboard's cut, today's
paragraph cut and sentence-level matching each bring back. Vectors are 8-bit, like the page's index."""
import json, os
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
ns = {"__file__": f"{ROOT}/build/embed.py"}
exec(open(f"{ROOT}/build/embed.py").read().split("pieces = cut.load_pieces")[0], ns)
embed = ns["load"](ns["MODEL"])
c = json.load(open(f"{HERE}/chunks.json")); far = embed(json.load(open(f"{ROOT}/tests/held-out.json"))["far"])
q8 = lambda v: np.clip(np.round(v * 127), -127, 127).astype(np.int8)
sets = [("brainboard", c["shipped"], False), ("paragraphs", c["mine"], True), ("sentences", c["sentences"], True)]
rows, meta = [], {}
for name, items, titled in sets:
    V = q8(embed([f"{x['title']}. {x['text']}" if titled else x["text"] for x in items]))
    floor = float(max((V.astype(np.float32) @ v / 127).max() for v in far)) + 0.01
    meta[name] = {"start": sum(len(r) for r in rows), "count": len(items), "floor": round(floor, 3),
                  "items": [{k: x[k] for k in ("slug", "title", "text", "passage") if k in x} for x in items]}
    rows.append(V); print(name, len(items), "rows, floor", round(floor, 3))
out = f"{ROOT}/src/assets/nlu"
json.dump({"dim": 384, "sets": meta}, open(f"{out}/compare.json", "w"), ensure_ascii=False, separators=(",", ":"))
np.concatenate(rows).tofile(f"{out}/compare.bin")
print("compare.json", os.path.getsize(f"{out}/compare.json") // 1024, "KB, compare.bin", os.path.getsize(f"{out}/compare.bin") // 1024, "KB")
