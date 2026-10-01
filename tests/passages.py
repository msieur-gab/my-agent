"""Experiment, not part of the site: when a visitor asks in their own words, does a small embedding
model find the right piece, the passage that answers, and does it know when to say "not here"?

Only my own texts are tested (content/work/), fed the way the librarian study in the brain found works
(knowledge/retrieval/librarian-verdict-management-over-model.md):
  - passages are my paragraphs: headings and very short paragraphs join the next one, long ones are
    cut at sentence ends; paragraph breaks are kept
  - the piece title goes in front of every passage before embedding (the passage itself stays plain)
  - thresholds by one rule: FLOOR just above the highest far off-topic score, CONFIDENT just above
    the highest near-miss score
  - variants are compared on separation (margin, Cohen's d), not on a min-max gap
Tried here and dropped: letting short lines (taglines, bylines) stand as their own passages (worse: short
generic passages match everything), and choosing the piece first then ranking its passages without the
title (no gain).
  - the models are the int8 ONNX files a browser would load

Ground truth: tests/held-out.json (questions and labels are Claude's; correct them there).

It also tests the questions listed in each piece's front matter (`questions:`, each pointing at the paragraph
that answers it): is the visitor's wording matched to the right listed question, and does its paragraph answer?
Mind the bias: the listed questions are drafts by Claude, who also wrote the test questions.

Needs onnxruntime, tokenizers, numpy and local copies of the models. On Gab's machine:
  ~/dev/nlu-comparison/.venv/bin/python tests/passages.py [minilm] [gte-small] [-v]
MiniLM is the copy the page loads (src/assets/models/); gte-small is read from nlu-comparison. Nothing is written.
Scores here are float cosines from native kernels: good for comparing variants, but an absolute
floor must be confirmed in the browser (knowledge/retrieval/local-embedding-harness.md)."""
import glob, json, os, re, sys
import numpy as np, onnxruntime as ort
from tokenizers import Tokenizer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS = {"minilm": f"{ROOT}/src/assets/models/Xenova/all-MiniLM-L6-v2",     # the file the page itself loads
          "gte-small": "/home/gab/dev/nlu-comparison/models/Xenova/gte-small"}
VERBOSE = "-v" in sys.argv

def load(path):
    tok = Tokenizer.from_file(f"{path}/tokenizer.json"); tok.enable_truncation(max_length=512); tok.enable_padding()
    sess = ort.InferenceSession(f"{path}/onnx/model_quantized.onnx", providers=["CPUExecutionProvider"])
    names = {i.name for i in sess.get_inputs()}
    def embed(texts, bs=32):
        out = []
        for i in range(0, len(texts), bs):
            encs = tok.encode_batch(texts[i:i + bs])
            ids = np.array([e.ids for e in encs], dtype=np.int64); mask = np.array([e.attention_mask for e in encs], dtype=np.int64)
            feed = {"input_ids": ids, "attention_mask": mask}
            if "token_type_ids" in names: feed["token_type_ids"] = np.zeros_like(ids)
            h = sess.run(None, feed)[0]; m = mask[..., None].astype(np.float32)
            v = (h * m).sum(1) / np.clip(m.sum(1), 1e-9, None)
            out.append(v / np.linalg.norm(v, axis=1, keepdims=True))
        return np.concatenate(out)
    return embed

# ---------- my texts, cut into passages: the same cutter that builds the page's index ----------
sys.path.insert(0, f"{ROOT}/build")
import passages as cut

PIECES = cut.load_pieces(ROOT)
QUESTIONS = [(slug, q, see) for slug, p in PIECES.items() for q, see in p["questions"]]   # (slug, question, where it points)

def corpus(title=True, skip=()):
    """→ [(slug, section, passage text, text as embedded)]"""
    return [(x["slug"], x["section"], x["text"], x["embed"]) for x in cut.corpus(PIECES, title, skip)]

H = json.load(open(f"{ROOT}/tests/held-out.json"))
ANS, NEAR, FAR, REQ = H["answerable"], [n["q"] for n in H["near"]], H["far"], H["requests"]
qmd = open(f"{ROOT}/docs/questions.md").read()
ME = re.findall(r"^\| ([^|]+\?) \|", qmd[qmd.index("## L. Questions about me"):qmd.index("## When nothing matches")], re.M)

def auc(pos, neg): return sum((p > n) + 0.5 * (p == n) for p in pos for n in neg) / (len(pos) * len(neg))
def cohen(a, b):
    a, b = np.array(a), np.array(b)
    return (a.mean() - b.mean()) / np.sqrt((a.var(ddof=1) + b.var(ddof=1)) / 2)

def run(embed, Q, name, index, detail=False):
    P = embed([x[3] for x in index])
    def ranked(q): sc = P @ Q[q]; return sc, np.argsort(-sc)
    top = lambda qs: [float((P @ Q[q]).max()) for q in qs]
    s_far, s_near, s_me, s_req = top(FAR), top(NEAR), top(ME), top(REQ)
    floor, confident = max(s_far) + 0.01, max(s_near) + 0.01

    rows = []
    for a in ANS:
        sc, order = ranked(a["q"])
        hit = lambda i: any(e.lower() in index[i][2].lower() for e in a["expect"])
        rows.append({"a": a, "s": float(sc[order[0]]), "piece": index[order[0]][0] in a["piece"],
                     "hit1": hit(order[0]), "hit3": any(hit(i) for i in order[:3]), "top": index[order[0]]})
    n = len(rows); s_ans = [r["s"] for r in rows]
    by = lambda k: f"{sum(r['hit1'] for r in rows if r['a']['kind'] == k)}/{sum(r['a']['kind'] == k for r in rows)}"
    print(f"\n--- {name}: {len(index)} passages")
    print(f"   right piece first:            {sum(r['piece'] for r in rows)}/{n}")
    print(f"   the first passage answers:    {sum(r['hit1'] for r in rows)}/{n}   (conceptual {by('conceptual')}, factual {by('factual')})")
    print(f"   an answer in the first three: {sum(r['hit3'] for r in rows)}/{n}")
    print(f"   scores: answerable {min(s_ans):.2f}–{max(s_ans):.2f} (mean {np.mean(s_ans):.2f}) | far off-topic max {max(s_far):.2f} (mean {np.mean(s_far):.2f}) | near-miss max {max(s_near):.2f}")
    print(f"   separation answerable vs far off-topic: margin {np.mean(s_ans) - np.mean(s_far):.2f}, Cohen's d {cohen(s_ans, s_far):.1f} | answerable vs near-miss AUC {auc(s_ans, s_near):.2f}")
    print(f"   FLOOR {floor:.2f}: refuses {sum(s < floor for s in s_far)}/{len(FAR)} far off-topic, wrongly refuses {sum(s < floor for s in s_ans)}/{n} answerable; "
          f"lets through {sum(s >= floor for s in s_near)}/{len(NEAR)} near-misses, {sum(s >= floor for s in s_me)}/{len(ME)} questions about me, {sum(s >= floor for s in s_req)}/{len(REQ)} requests for things I don't do")
    print(f"   CONFIDENT {confident:.2f}: {sum(s >= confident for s in s_ans)}/{n} answerable are above every near-miss")
    if detail:
        for r in rows:
            if r["s"] < floor: print(f"      refused      {r['s']:.2f}  {r['a']['q']}")
        for r in rows:
            if not r["piece"]: print(f"      wrong piece  {r['s']:.2f}  {r['top'][0]:9} {r['a']['q']}")
        for r in rows:
            if r["piece"] and not r["hit1"]:
                print(f"      {'in top 3 ' if r['hit3'] else 'not found'}    {r['s']:.2f}  {r['a']['q']}\n                         got [{r['top'][1]}] {r['top'][2][:110]}")
    return rows

def by_question(embed, Q, name):
    """The visitor's wording is matched to the questions listed in each piece's front matter. The reply is
    the paragraph that question points at. Below the floor, fall back to passage search (the recipe above)."""
    idx = corpus()
    target = []
    for slug, q, see in QUESTIONS:
        at = [i for i, x in enumerate(idx) if x[0] == slug and see in x[2]]
        assert len(at) >= 1, f"pointer not found: {slug}: {see}"
        target.append(at[0])
    QV, PV = embed([q for _, q, _ in QUESTIONS]), embed([x[3] for x in idx])
    best = lambda q: float((QV @ Q[q]).max())
    s_far, s_near, s_me, s_req = [best(q) for q in FAR], [best(q) for q in NEAR], [best(q) for q in ME], [best(q) for q in REQ]
    floor = max(s_far) + 0.01
    p_floor = max(float((PV @ Q[q]).max()) for q in FAR) + 0.01
    n = len(ANS); stats = dict(piece=0, hit1=0, hit3=0, direct=0, direct_hit=0, fb=0, fb_hit=0, refused=0); misses = []
    s_ans = []
    for a in ANS:
        hit = lambda i: any(e.lower() in idx[i][2].lower() for e in a["expect"])
        sc = QV @ Q[a["q"]]; order = np.argsort(-sc); s_ans.append(float(sc[order[0]]))
        qi = int(order[0])
        stats["piece"] += QUESTIONS[qi][0] in a["piece"]
        stats["hit1"] += hit(target[qi]); stats["hit3"] += any(hit(target[int(i)]) for i in order[:3])
        if sc[qi] >= floor:                                  # one of my questions is close enough: its paragraph is the reply
            stats["direct"] += 1; stats["direct_hit"] += hit(target[qi])
            if not hit(target[qi]): misses.append((float(sc[qi]), a["q"], QUESTIONS[qi][1]))
        else:                                                # otherwise search the passages
            ps = PV @ Q[a["q"]]; pi = int(ps.argmax())
            if ps[pi] >= p_floor: stats["fb"] += 1; stats["fb_hit"] += hit(pi)
            else: stats["refused"] += 1
    print(f"\n--- {name}: {len(QUESTIONS)} questions listed in the pieces")
    print(f"   closest listed question is from the right piece: {stats['piece']}/{n}")
    print(f"   its paragraph answers:                           {stats['hit1']}/{n}   (within the three closest questions: {stats['hit3']}/{n})")
    print(f"   scores: answerable {min(s_ans):.2f}–{max(s_ans):.2f} (mean {np.mean(s_ans):.2f}) | far off-topic max {max(s_far):.2f} | margin {np.mean(s_ans) - np.mean(s_far):.2f}, Cohen's d {cohen(s_ans, s_far):.1f}")
    print(f"   FLOOR {floor:.2f}: lets through {sum(x >= floor for x in s_near)}/{len(NEAR)} near-misses, {sum(x >= floor for x in s_me)}/{len(ME)} questions about me, {sum(x >= floor for x in s_req)}/{len(REQ)} requests")
    print(f"   questions first, passages as fallback: {stats['direct_hit']}/{stats['direct']} answered through a listed question, "
          f"{stats['fb_hit']}/{stats['fb']} through passage search, {stats['refused']} refused  →  {stats['direct_hit'] + stats['fb_hit']}/{n} get a paragraph that answers")
    if VERBOSE:
        for sc, q, got in sorted(misses, reverse=True): print(f"      matched {sc:.2f}  {q}\n                    → {got}")

for model in [a for a in sys.argv[1:] if a in MODELS] or ["minilm"]:
    embed = load(MODELS[model])
    allq = [a["q"] for a in ANS] + NEAR + FAR + ME + REQ
    Q = dict(zip(allq, embed(allq)))
    print(f"\n================ {model}: {len(ANS)} answerable, {len(NEAR)} near-miss, {len(FAR)} far off-topic, {len(ME)} about me, {len(REQ)} requests")
    run(embed, Q, "paragraphs, title in front (the brain's recipe)", corpus(), detail=VERBOSE)
    if QUESTIONS: by_question(embed, Q, "matching my listed questions")
    if "--variants" in sys.argv:
        run(embed, Q, "same, without the title", corpus(title=False))
        run(embed, Q, "same as the recipe, without the Team and Tech sections", corpus(skip=("Team", "Tech")))
