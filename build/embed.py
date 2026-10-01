"""Builds the index the page searches: my passages and my listed questions, as 8-bit vectors.

Run it after changing a piece's text or its questions (the site build says when it is needed):
    ~/dev/nlu-comparison/.venv/bin/python build/embed.py
It needs onnxruntime, tokenizers and numpy, which the site build itself does not. It uses the very
model file the browser loads (src/assets/models/), so the page and the index share one vector space.

Writes:
    src/assets/nlu/index.json   passages (as shown), listed questions, the two refusal floors
    src/assets/nlu/vectors.bin  one 384-byte row per passage, then one per listed question
    src/assets/nlu/probe.json   a few questions with their vectors, to check the page ranks like Python
                                (read by tests/check.js and by /assets/nlu/test.html)

Floors, by the brain's rule: just above the highest score any far off-topic question reaches
(the `far` list in tests/held-out.json). They are measured here on native code; the browser's wasm
kernels differ by about 0.003, so confirm them in the browser with /assets/nlu/test.html."""
import json, os, sys
import numpy as np, onnxruntime as ort
from tokenizers import Tokenizer

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import passages as cut

MODEL = f"{ROOT}/src/assets/models/Xenova/all-MiniLM-L6-v2"
OUT = f"{ROOT}/src/assets/nlu"

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
        return np.concatenate(out).astype(np.float32)
    return embed

pieces = cut.load_pieces(ROOT)
passages = cut.corpus(pieces)
questions = cut.listed_questions(pieces, passages)
embed = load(MODEL)

P = np.clip(np.round(embed([x["embed"] for x in passages]) * 127), -127, 127).astype(np.int8)
Q = np.clip(np.round(embed([x["q"] for x in questions]) * 127), -127, 127).astype(np.int8)
score = lambda rows, v: rows.astype(np.float32) @ v / 127          # what the page computes

held = json.load(open(f"{ROOT}/tests/held-out.json"))
far = embed(held["far"])
floors = {"question": round(float(max(score(Q, v).max() for v in far)) + 0.01, 3),
          "passage": round(float(max(score(P, v).max() for v in far)) + 0.01, 3)}

os.makedirs(OUT, exist_ok=True)
index = {"model": "Xenova/all-MiniLM-L6-v2, 8-bit", "dim": int(P.shape[1]),
         "fingerprint": cut.fingerprint(passages, questions), "floors": floors,
         "passages": [{"slug": x["slug"], "section": x["section"], "text": x["shown"]} for x in passages],
         "questions": questions}
json.dump(index, open(f"{OUT}/index.json", "w"), ensure_ascii=False, separators=(",", ":"))
np.concatenate([P, Q]).tofile(f"{OUT}/vectors.bin")

def route(v):
    """The same decision the page makes (src/assets/js/nlu.js): a listed question, else a passage, else nothing."""
    sq, sp = score(Q, v), score(P, v)
    if sq.max() >= floors["question"]: return {"route": "question", "index": int(sq.argmax()), "score": round(float(sq.max()), 4)}
    if sp.max() >= floors["passage"]: return {"route": "passage", "index": int(sp.argmax()), "score": round(float(sp.max()), 4)}
    return {"route": "none", "index": -1, "score": round(float(max(sq.max(), sp.max())), 4)}

probes = [a["q"] for a in held["answerable"][::5]] + held["far"][:4] + [questions[0]["q"], questions[-1]["q"]]
vecs = embed(probes)
json.dump([dict(q=q, vec=[round(float(x), 5) for x in v], **route(v)) for q, v in zip(probes, vecs)],
          open(f"{OUT}/probe.json", "w"), ensure_ascii=False, separators=(",", ":"))

print(f"{len(passages)} passages and {len(questions)} listed questions from {len(pieces)} pieces → {OUT}/")
print(f"floors: listed question {floors['question']}, passage {floors['passage']} | fingerprint {index['fingerprint']}")
print(f"index.json {os.path.getsize(OUT + '/index.json') // 1024} KB, vectors.bin {os.path.getsize(OUT + '/vectors.bin') // 1024} KB, {len(probes)} probes")
