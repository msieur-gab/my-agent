#!/usr/bin/env python3
"""Measures the bank's matching against held-out questions. Run after a build:

    python3 build/build.py && python3 tests/eval.py [--sweep]

Three matchers, the ones bank.js runs, ported line for line (fold, stop words, stem, typos):
  words    the bank's phrasings by shared words
  meaning  the bank's phrasings by MiniLM cosine (the same model file the page loads)
  page     what the page does: words when a phrasing is nearly the same sentence, meaning otherwise
The keyword matcher the site had before the bank (match.js) is not ported; its numbers on the same
questions are recorded in docs/authoring-eval.md.

Two question sets:
  tests/held-out.json   written 1 Oct 2026 against the five texts, before the bank existed; labels are pieces
  tests/bank-eval.json  written 26 Oct 2026 against the bank, in another register; labels are entries

--sweep prints how accuracy and false answers move with the meaning floor.
Writes tests/eval-results.md."""
import base64
import json
import re
import sys
import unicodedata
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "build"))
from embed import embed  # noqa: E402

# Thresholds, as in bank.js.
SURE, MEANING, CLOSE, WORDS = 0.56, 0.47, 0.04, 0.75

# ---------------------------------------------------------------- match.js, in Python

STOP = set(("a an the and or but if then so of to in on at by for with from about into over under "
            "is are was were be been being am do does did doing have has had having can could should would will shall may might must "
            "i me my we our us you your he she it its they them their this that these those what which who whom how why when where "
            "not no yes very just also too more most some any all each other than as up out there here get got make made").split())


def fold(s):
    s = unicodedata.normalize("NFD", str(s or "")).lower()
    s = "".join(c for c in s if not ("̀" <= c <= "ͯ"))
    s = re.sub(r"[’']", "", s)
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def stem(w):
    if len(w) > 5 and re.search(r"ations?$", w): return re.sub(r"ations?$", "at", w)
    if len(w) > 5 and re.search(r"isations?$|izations?$", w): return re.sub(r"[iz]ations?$|isations?$", "is", w)
    if len(w) > 4 and w.endswith("ing"): return w[:-3]
    if len(w) > 4 and w.endswith("ies"): return w[:-3] + "y"
    if len(w) > 4 and w.endswith("ed"): return w[:-2]
    if len(w) > 3 and w.endswith("es") and not w.endswith("ses"): return w[:-1]
    if len(w) > 3 and w.endswith("s") and not w.endswith("ss"): return w[:-1]
    return re.sub(r"ise$", "iz", w)


def terms(s):
    return [stem(w) for w in fold(s).split(" ") if w and w not in STOP and len(w) > 1]


def uniq(a):
    seen, out = set(), []
    for x in a:
        if x not in seen:
            seen.add(x); out.append(x)
    return out


def distance(a, b):
    prev2, prev = None, list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        row = [i]
        for j in range(1, len(b) + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            row.append(min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost))
            if i > 1 and j > 1 and a[i - 1] == b[j - 2] and a[i - 2] == b[j - 1]:
                row[j] = min(row[j], prev2[j - 2] + 1)
        prev2, prev = prev, row
    return prev[len(b)]


def slips(word):
    return 2 if len(word) >= 9 else 1 if len(word) >= 5 else 0


def nearest(word, known):
    mx = slips(word)
    if len(word) == 4:
        letters = "".join(sorted(word))
        swaps = [k for k in known if len(k) == 4 and "".join(sorted(k)) == letters and distance(word, k) == 1]
        return swaps[0] if len(swaps) == 1 else None
    if not mx: return None
    best, best_d, tie = None, mx + 1, False
    for k in known:
        if abs(len(k) - len(word)) > mx: continue
        d = distance(word, k)
        if d < best_d: best, best_d, tie = k, d, False
        elif d == best_d and k != best: tie = True
    return best if best and not tie else None


# ---------------------------------------------------------------- bank.js, in Python

def decode(row):
    v = np.frombuffer(base64.b64decode(row["b"]), dtype=np.int8).astype(np.float32) * row["s"]
    return v / (np.linalg.norm(v) or 1)


def prepare(bank):
    vec = {(r["e"], r["t"]): decode(r) for r in bank["vectors"] or []}
    phr, vocab = [], set()
    for e in bank["entries"]:
        for t in [e["q"]] + e["also"]:
            tt = uniq(terms(t)); vocab.update(tt)
            phr.append({"entry": e, "text": t, "terms": tt, "v": vec.get((e["id"], t))})
    return {"entries": bank["entries"], "phr": phr, "vocab": vocab, "known": sorted(vocab)}


def rank(index, score_of):
    best = {}
    for p in index["phr"]:
        s = score_of(p)
        if s <= 0: continue
        cur = best.get(p["entry"]["id"])
        if not cur or s > cur["score"]:
            best[p["entry"]["id"]] = {"entry": p["entry"], "text": p["text"], "score": round(s, 3)}
    return sorted(best.values(), key=lambda r: -r["score"])


def words(index, text):
    q = uniq(t if t in index["vocab"] else (nearest(t, index["known"]) or t) for t in terms(text))
    f = fold(text)
    if not q: return []

    def score(p):
        if fold(p["text"]) == f: return 1.5
        n = sum(1 for t in p["terms"] if t in q)
        return n / np.sqrt(len(q) * len(p["terms"])) if n else 0
    return rank(index, score)


def meaning(index, vec):
    return rank(index, lambda p: float(p["v"] @ vec) if p["v"] is not None else 0)


def verdict(results, how):
    floor, sure = (MEANING, SURE) if how == "meaning" else (WORDS, WORDS)
    top = results[0] if results else None
    if not top or top["score"] < floor: return {"kind": "none", "results": results}
    if how == "words" and len(results) > 1 and results[1]["score"] == top["score"] and results[1]["entry"]["leads"] != top["entry"]["leads"]:
        return {"kind": "none", "results": results}
    close = [r for r in results if r is not top and r["score"] >= top["score"] - (CLOSE if how == "meaning" else 0)
             and r["entry"]["leads"] != top["entry"]["leads"] and r["score"] >= sure]
    return {"kind": "close" if close else "answer" if top["score"] >= sure else "partial", "results": results}


# ---------------------------------------------------------------- the questions

def read(f):
    return json.loads((ROOT / f).read_text(encoding="utf-8"))


answers = read("public/answers.json")
bank_json = read("public/bank.json")
if not bank_json["vectors"]:
    sys.exit("public/bank.json has no vectors: pip install -r requirements.txt and rebuild")
held, bank_eval = read("tests/held-out.json"), read("tests/bank-eval.json")
sweep = "--sweep" in sys.argv

bank = prepare(bank_json)
on_site = {p["slug"] for p in answers["pieces"]}
by_q = {e["q"]: e for e in bank_json["entries"]}

allq = []
for x in held["answerable"]:
    if any(p in on_site for p in x["piece"]):
        allq.append({"q": x["q"], "piece": x["piece"], "entry": None, "set": "held-out", "kind": x["kind"]})
for q in [x["q"] for x in held["near"]] + held["far"] + held["requests"]:
    allq.append({"q": q, "none": True, "set": "held-out"})
for x in bank_eval["answerable"]:
    e = by_q.get(x["entry"])
    if not e: sys.exit(f"bank-eval names an entry that is not in the bank: {x['entry']}")
    allq.append({"q": x["q"], "piece": [e["leads"]] if e["leads"] in on_site else None, "entry": e["id"], "set": "bank"})
for q in bank_eval["none"]:
    allq.append({"q": q, "none": True, "set": "bank"})
for x, v in zip(allq, embed([x["q"] for x in allq])):
    x["vec"] = np.asarray(v, dtype=np.float32)
    x.setdefault("none", False); x.setdefault("kind", None)


def from_verdict(v):
    top = v["results"][0] if v["results"] else None
    if v["kind"] == "none":
        return {"leads": None, "score": top["score"] if top else 0, "entry": top["entry"]["id"] if top else None}
    return {"leads": top["entry"]["leads"], "entry": top["entry"]["id"], "score": top["score"], "partial": v["kind"] == "partial"}


MATCHERS = {
    "words": lambda x: from_verdict(verdict(words(bank, x["q"]), "words")),
    "meaning": lambda x: from_verdict(verdict(meaning(bank, x["vec"]), "meaning")),
    "page": lambda x: from_verdict(verdict(meaning(bank, x["vec"]), "meaning") if verdict(words(bank, x["q"]), "words")["kind"] == "none"
                                   else verdict(words(bank, x["q"]), "words")),
}


def judge(x, r):
    if x["none"]: return "abstain" if r["leads"] is None else "false answer"
    if r["leads"] is None: return "missed"
    if x["entry"] is not None and "entry" in r:
        return "right entry" if r["entry"] == x["entry"] else "right piece" if x["piece"] and r["leads"] in x["piece"] else "wrong"
    return "right piece" if x["piece"] and r["leads"] in x["piece"] else "wrong"


def pct(a, b):
    return f"{round(100 * a / b)}%" if b else "—"


lines = []


def out(s=""):
    lines.append(s); print(s)


from datetime import date  # noqa: E402
ans_all = [x for x in allq if not x["none"] and x["kind"] != "factual"]
out(f"# Matcher evaluation — {date.today().isoformat()}\n")
out(f"Questions: {sum(1 for x in ans_all if x['set'] == 'held-out')} held-out (piece labels, conceptual only: the "
    f"{sum(1 for x in allq if x['kind'] == 'factual')} factual ones ask for details inside the texts, which no bank entry carries) + "
    f"{sum(1 for x in ans_all if x['set'] == 'bank')} bank-eval (entry labels) answerable; {sum(1 for x in allq if x['none'])} that must get no answer.")
out(f"Floors: words ≥ {WORDS}; meaning ≥ {SURE} is an answer, ≥ {MEANING} is \"the closest I have\", close call within {CLOSE}.\n")

for s in ("held-out", "bank"):
    ans = [x for x in ans_all if x["set"] == s]
    non = [x for x in allq if x["set"] == s and x["none"]]
    out(f"## {'held-out.json (written before the bank)' if s == 'held-out' else 'bank-eval.json (rewordings of the bank)'}\n")
    out(f"| matcher | right piece | {'right entry | ' if s == 'bank' else ''}missed | wrong | abstain on no-answer | false answers (hedged) |")
    out(f"|---|---|{'---|' if s == 'bank' else ''}---|---|---|---|")
    for name, fn in MATCHERS.items():
        j = [judge(x, fn(x)) for x in ans]
        rn = [fn(x) for x in non]
        jn = [judge(x, r) for x, r in zip(non, rn)]
        hedged = sum(1 for r, v in zip(rn, jn) if v == "false answer" and r.get("partial"))
        n, m = len(ans), len(non)
        piece_right = sum(1 for v in j if v in ("right piece", "right entry"))
        row = [f"{piece_right}/{n} ({pct(piece_right, n)})"]
        if s == "bank":
            er = sum(1 for v in j if v == "right entry"); row.append(f"{er}/{n} ({pct(er, n)})")
        ab = jn.count("abstain")
        row += [str(j.count("missed")), str(j.count("wrong")), f"{ab}/{m} ({pct(ab, m)})", f"{jn.count('false answer')} ({hedged})"]
        out(f"| {name} | {' | '.join(row)} |")
    out()

ans_scores = sorted(((meaning(bank, x["vec"])[0]["score"], x) for x in ans_all), key=lambda t: t[0])
non_scores = sorted(((meaning(bank, x["vec"])[0]["score"], x) for x in allq if x["none"]), key=lambda t: -t[0])
out("## Meaning scores\n")
out(f"Answerable: lowest {ans_scores[0][0]} (\"{ans_scores[0][1]['q']}\"), median {ans_scores[len(ans_scores) // 2][0]}, highest {ans_scores[-1][0]}.")
out(f"No answer: highest {non_scores[0][0]} (\"{non_scores[0][1]['q']}\"), median {non_scores[len(non_scores) // 2][0]}.")
out("Five lowest answerable: " + "; ".join(f"{s} \"{x['q']}\"" for s, x in ans_scores[:5]) + ".")
out("Five highest no-answer: " + "; ".join(f"{s} \"{x['q']}\"" for s, x in non_scores[:5]) + ".\n")

if sweep:
    out("## Floor sweep (meaning)\n")
    out("| floor | right | missed | false answers |")
    out("|---|---|---|---|")
    f = 0.35
    while f <= 0.66:
        right = missed = false_a = 0
        for x in allq:
            if x["kind"] == "factual": continue
            r = meaning(bank, x["vec"])[0]
            got = r["entry"]["leads"] if r and r["score"] >= f else None
            if x["none"]:
                if got is not None: false_a += 1
            elif got is None: missed += 1
            elif (x["entry"] is not None and r["entry"]["id"] == x["entry"]) or (x["piece"] and got in x["piece"]): right += 1
        out(f"| {f:.2f} | {right}/{len(ans_all)} | {missed} | {false_a}/{sum(1 for x in allq if x['none'])} |")
        f += 0.03
    out()

out("## What the page gets wrong\n")
for x in allq:
    if x["kind"] == "factual": continue
    r = MATCHERS["page"](x)
    j = judge(x, r)
    if j in ("right entry", "right piece", "abstain"): continue
    got = "no answer" if r["leads"] is None else f"\"{bank_json['entries'][r['entry']]['q']}\" → {r['leads'] or '(say only)'}"
    want = "no answer" if x["none"] else (f"\"{bank_json['entries'][x['entry']]['q']}\"" if x["entry"] is not None else "/".join(x["piece"]))
    out(f"- {j}: \"{x['q']}\" → {got} ({r['score']}); wanted {want}")

(ROOT / "tests/eval-results.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
print("\nWritten to tests/eval-results.md")
