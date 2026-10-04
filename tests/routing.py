"""Where typed questions land: the developer's check after changing the settings in build/embed.py.

    python3 tests/routing.py                    the bundled questions (tests/routing.json)
    python3 tests/routing.py -v                 also list every question that went wrong
    python3 tests/routing.py --tune             try other settings and show the trade-off (does not change them)

Run after `python3 build/build.py` and `python3 build/embed.py`. Needs onnxruntime, tokenizers, numpy and node.

A rough guide, not a verdict: the bundled questions were written by Claude, who also drafted the intents.
Whether the conversation holds up is judged by talking to it on the page. Rough targets:
  answerable questions        the right answer given or offered among the choices: 80% or more
                              a wrong answer given as if it were right: 10% or less
  questions I can't answer    the page says so, or gives the matching intent: 85% or more"""
import json, os, subprocess, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, f"{ROOT}/build")
PASS = {"reach": 0.80, "wrong": 0.10, "honest": 0.85}
NEGATIVE = {"services", "me", "near", "far"}          # categories where "I don't have that" is a right answer


def load_index():
    idx = json.load(open(f"{ROOT}/src/assets/nlu/index.json"))
    V = np.fromfile(f"{ROOT}/src/assets/nlu/vectors.bin", dtype=np.int8).reshape(-1, idx["dim"]).astype(np.float32)
    idx["V"] = V
    idx["names"] = [("intent:" + t["slug"]) if t["kind"] == "intent" else t["slug"] for t in idx["targets"]]
    return idx


def decide(idx, q, kw, settings=None):
    """The page's decision (src/assets/js/nlu.js, rank). q: the question's vector; kw: {slug: keyword score}."""
    st = settings or idx["settings"]
    w = st["weights"]
    s = idx["V"] @ np.asarray(q, dtype=np.float32) / 127
    best = [-1.0] * len(idx["targets"]); at = [-1] * len(idx["targets"])
    for i, r in enumerate(idx["rows"]):
        x = float(s[i]) * w[r["kind"]]
        if x > best[r["t"]]: best[r["t"]] = x; at[r["t"]] = i
    for i, t in enumerate(idx["targets"]):
        if t["slug"] in kw: best[i] += st["keyword"]["boost"] * min(kw[t["slug"]] / st["keyword"]["full"], 1)
    order = sorted(range(len(best)), key=lambda i: -best[i])
    top = best[order[0]]
    if top < st["floor"]:
        return {"verdict": "none", "targets": [], "score": round(top, 4)}
    close = [i for i in order[:3] if top - best[i] < st["margin"]]
    verdict = "choice" if len(close) > 1 else "answer" if top >= st["sure"] else "maybe"
    return {"verdict": verdict, "targets": [idx["names"][i] for i in close], "rows": [at[i] for i in close],
            "score": round(top, 4)}


def keywords(questions):
    """Keyword scores from match.js, through node, so the decision is the page's own."""
    out = subprocess.run(["node", f"{HERE}/keywords.js"], input=json.dumps(questions), capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def outcome(d, to):
    """→ 'right' | 'offered' | 'none' | 'wrong' for one decision, given the acceptable landings."""
    if d["verdict"] == "none": return "right" if "none" in to else "none"
    hit = [t for t in d["targets"] if t in to]
    if d["verdict"] == "choice": return "offered" if hit else "wrong"
    return "right" if hit else "wrong"


def bundled(idx, embed, verbose, settings=None):
    test = json.load(open(f"{HERE}/routing.json"))
    cases = [(c, x["q"], x["to"]) for c, v in test.items() if c != "note" for x in v]
    vecs = embed([q for _, q, _ in cases]); kw = keywords([q for _, q, _ in cases])
    per, bad = {}, []
    for (c, q, to), v in zip(cases, vecs):
        d = decide(idx, v, kw.get(q, {}), settings)
        o = outcome(d, to)
        per.setdefault(c, {"right": 0, "offered": 0, "none": 0, "wrong": 0})[o] += 1
        if o in ("none", "wrong") or (c in NEGATIVE and o != "right"): bad.append((c, o, d, q, to))
    return per, bad


def summary(per):
    pos = [v for c, v in per.items() if c not in NEGATIVE]; neg = [v for c, v in per.items() if c in NEGATIVE]
    n = sum(sum(v.values()) for v in pos); m = sum(sum(v.values()) for v in neg)
    reach = sum(v["right"] + v["offered"] for v in pos) / n
    wrong = sum(v["wrong"] for v in pos) / n
    honest = sum(v["right"] for v in neg) / m
    return {"reach": reach, "wrong": wrong, "honest": honest, "n": n, "m": m,
            "direct": sum(v["right"] for v in pos) / n}


def report(per, bad, verbose):
    print(f"{'':10} {'right':>6} {'offered':>8} {'nothing':>8} {'wrong':>6}")
    for c, v in per.items():
        print(f"{c:10} {v['right']:>6} {v['offered']:>8} {v['none']:>8} {v['wrong']:>6}")
    s = summary(per)
    print(f"\nanswerable ({s['n']}): reached {s['reach']:.0%} (given directly {s['direct']:.0%}), wrong {s['wrong']:.0%}"
          f" | can't answer ({s['m']}): honest {s['honest']:.0%}")
    checks = [("reach", s["reach"] >= PASS["reach"]), ("wrong", s["wrong"] <= PASS["wrong"]), ("honest", s["honest"] >= PASS["honest"])]
    print("pass mark: " + ", ".join(f"{k} {'PASS' if ok else 'FAIL'}" for k, ok in checks))
    if verbose:
        print()
        for c, o, d, q, to in bad:
            print(f"  {c:9} {o:6} {d['verdict']:6} {d['score']:.2f} {q}  →  {d['targets'] or ['none']}  (wanted {to})")
    return all(ok for _, ok in checks)


def tune(idx, embed):
    st = json.loads(json.dumps(idx["settings"]))
    print("floor  sure  margin  text  | reach direct wrong honest")
    for floor in (0.30, 0.32, 0.34, 0.36, 0.38):
        for sure in (0.40, 0.45, 0.50):
            for margin in (0.03, 0.06, 0.09):
                st.update(floor=floor, sure=sure, margin=margin)
                s = summary(bundled(idx, embed, False, st)[0])
                print(f"{floor:.2f}  {sure:.2f}  {margin:.2f}    {st['weights']['text']:.2f}  | {s['reach']:.0%}   {s['direct']:.0%}   {s['wrong']:.0%}   {s['honest']:.0%}")


def main():
    verbose = "-v" in sys.argv
    import model
    idx, embed = load_index(), model.load()
    if "--tune" in sys.argv: return tune(idx, embed)
    per, bad = bundled(idx, embed, verbose)
    sys.exit(0 if report(per, bad, verbose) else 1)


if __name__ == "__main__":
    main()
