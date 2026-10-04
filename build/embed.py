"""Builds the index the page searches: every answer I can give (projects, notes, views, intents),
as rows of 8-bit vectors, plus the settings the page decides with.

Run it after changing any text or any `answers:` line (the site build says when it is needed):
    python3 build/embed.py
It needs onnxruntime, tokenizers and numpy, which the site build itself does not. It uses the very
model file the browser loads (src/assets/models/), so the page and the index share one vector space.

Writes:
    src/assets/nlu/index.json   targets, rows (what each vector is), settings
    src/assets/nlu/vectors.bin  one 384-byte row per entry in `rows`
    src/assets/nlu/probe.json   test questions with their vectors and the decision taken here,
                                so the browser can check it decides the same (/assets/nlu/test.html)

How the page decides (src/assets/js/nlu.js, mirrored in tests/routing.py):
  each answer scores its best row: a visitor wording (`asked`) or its gist counts in full, one of my
  paragraphs (`text`) counts at WEIGHTS["text"]; words that are keywords of that answer add a little.
  Then: below FLOOR → nothing; a second answer within MARGIN → a choice; below SURE → "the closest I have";
  else → that answer. The values were chosen on tests/routing.json (see tests/routing.py)."""
import json, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import passages as cut, model

SETTINGS = {
    "weights": {"asked": 1.0, "gist": 1.0, "text": 0.75},
    "keyword": {"boost": 0.1, "full": 9},     # keyword score from match.js: boost × min(score / full, 1)
    "floor": 0.34,                            # below: nothing of mine answers this
    "sure": 0.45,                             # below: shown as "the closest I have"
    "margin": 0.06,                           # a second answer this close: ask which one
}
OUT = f"{ROOT}/src/assets/nlu"


def main():
    targets = cut.load_targets(ROOT)
    rows = cut.rows(targets)
    embed = model.load()
    V = model.int8(embed([r["embed"] for r in rows]))

    os.makedirs(OUT, exist_ok=True)
    index = {"model": "Xenova/all-MiniLM-L6-v2, 8-bit", "dim": int(V.shape[1]),
             "fingerprint": cut.fingerprint(targets, rows), "settings": SETTINGS,
             "targets": [{"slug": x["slug"], "kind": x["kind"]} for x in targets],
             "rows": [{"t": r["t"], "kind": r["kind"], "text": r["text"]} for r in rows]}
    json.dump(index, open(f"{OUT}/index.json", "w"), ensure_ascii=False, separators=(",", ":"))
    V.tofile(f"{OUT}/vectors.bin")

    # Probes: a spread of test questions, decided here exactly as the page will (no keyword boost:
    # the browser test checks the model and the arithmetic, tests/check.js checks the whole reply).
    sys.path.insert(0, f"{ROOT}/tests")
    from routing import decide, load_index
    test = json.load(open(f"{ROOT}/tests/routing.json"))
    qs = [x["q"] for k, v in test.items() if k != "note" for x in v][::4]
    vecs = embed(qs)
    idx = load_index()
    json.dump([dict(q=q, vec=[round(float(x), 5) for x in v], **decide(idx, v, {})) for q, v in zip(qs, vecs)],
              open(f"{OUT}/probe.json", "w"), ensure_ascii=False, separators=(",", ":"))

    kinds = {}
    for x in targets: kinds[x["kind"]] = kinds.get(x["kind"], 0) + 1
    print(f"{len(rows)} rows for {len(targets)} answers {kinds} → {OUT}/")
    print(f"index.json {os.path.getsize(OUT + '/index.json') // 1024} KB, vectors.bin {os.path.getsize(OUT + '/vectors.bin') // 1024} KB, "
          f"{len(qs)} probes | fingerprint {index['fingerprint']}")


if __name__ == "__main__":
    main()
