"""chunks.json + the held-out questions → ranks.json: for each cut, the five passages closest to each question.
Same int8 model file the page loads. `shipped` is embedded as brainboard ships (no title in front);
`shipped+title`, `study` and `mine` put the piece title in front, as the librarian study recommends."""
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
ns = {"__file__": f"{ROOT}/build/embed.py"}   # reuse embed.py's model loader: one copy of the embedding code
exec(open(f"{ROOT}/build/embed.py").read().split("pieces = cut.load_pieces")[0], ns)
embed = ns["load"](ns["MODEL"])
chunks = json.load(open(f"{HERE}/chunks.json")); held = json.load(open(f"{ROOT}/tests/held-out.json"))
if "--concepts" in sys.argv: held["answerable"] = json.load(open(f"{HERE}/concepts.json"))["answerable"]
qs = [a["q"] for a in held["answerable"]]; Q = embed(qs); F = embed(held["far"])
out = {}
for name, src, titled in [("shipped", "shipped", False), ("shipped+title", "shipped", True), ("study", "study", True), ("mine", "mine", True)]:
    P = embed([f"{c['title']}. {c['text']}" if titled else c["text"] for c in chunks[src]])
    floor = float(max((P @ v).max() for v in F)) + 0.01
    out[name] = {"cut": src, "floor": round(floor, 3),
                 "top": [[[int(i), round(float((P @ v)[i]), 4)] for i in np.argsort(-(P @ v))[:5]] for v in Q]}
    print(name, len(chunks[src]), "passages, floor", round(floor, 3))
# sentence level: each of my passages is scored by its best SENTENCE (alone, and blended with the passage itself)
S = chunks["sentences"]; SV = embed([f"{c['title']}. {c['text']}" for c in S]); PV = embed([f"{c['title']}. {c['text']}" for c in chunks["mine"]])
owner = np.array([c["passage"] for c in S]); n = len(chunks["mine"])
def by_sentence(v, blend):
    ss = SV @ v; best = np.full(n, -1.0); arg = np.zeros(n, dtype=int)
    for i, (o, x) in enumerate(zip(owner, ss)):
        if x > best[o]: best[o], arg[o] = x, i
    score = np.maximum(best, PV @ v) if blend else best
    return score, arg
for name, blend in [("mine, by sentence", False), ("mine, sentence or passage", True)]:
    floor = float(max(by_sentence(v, blend)[0].max() for v in F)) + 0.01
    top = []
    for v in Q:
        score, arg = by_sentence(v, blend)
        top.append([[int(i), round(float(score[i]), 4), int(arg[i])] for i in np.argsort(-score)[:5]])
    out[name] = {"cut": "mine", "floor": round(floor, 3), "top": top, "sentences": True}
    print(name, len(S), "sentences, floor", round(floor, 3))
json.dump(out, open(f"{HERE}/ranks-concepts.json" if "--concepts" in sys.argv else f"{HERE}/ranks.json", "w"))
