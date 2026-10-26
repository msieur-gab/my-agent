#!/usr/bin/env python3
"""The embedding model, for the build and the tests. The same files the browser loads
(src/assets/models/Xenova/all-MiniLM-L6-v2: int8 ONNX, tokenizer), run with onnxruntime,
so a cosine measured here is the cosine the page will see.

Needs: pip install onnxruntime tokenizers numpy   (requirements.txt)

    python3 build/embed.py                 adds the vectors to public/bank.json (build.py does this itself)
    echo '["a question"]' | python3 build/embed.py --texts     JSON list of texts in → JSON list of vectors out
"""
import base64
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
MODEL_ID = "Xenova/all-MiniLM-L6-v2"
MODEL = ROOT / "src/assets/models" / MODEL_ID

_session = None
_tokenizer = None


def load():
    global _session, _tokenizer
    if _session is None:
        import onnxruntime as ort
        from tokenizers import Tokenizer
        _tokenizer = Tokenizer.from_file(str(MODEL / "tokenizer.json"))
        _tokenizer.enable_truncation(max_length=512)
        _tokenizer.enable_padding()
        _session = ort.InferenceSession(str(MODEL / "onnx/model_quantized.onnx"), providers=["CPUExecutionProvider"])
    return _session, _tokenizer


def embed(texts, batch=32):
    """Texts → unit vectors (lists of 384 floats), mean pooled, as the page does it."""
    session, tokenizer = load()
    names = {i.name for i in session.get_inputs()}
    out = []
    for i in range(0, len(texts), batch):
        enc = tokenizer.encode_batch(texts[i:i + batch])
        ids = np.array([e.ids for e in enc], dtype=np.int64)
        mask = np.array([e.attention_mask for e in enc], dtype=np.int64)
        feed = {"input_ids": ids, "attention_mask": mask}
        if "token_type_ids" in names:
            feed["token_type_ids"] = np.zeros_like(ids)
        hidden = session.run(None, feed)[0]                       # (n, tokens, 384)
        m = mask[:, :, None].astype(np.float32)
        pooled = (hidden * m).sum(1) / np.maximum(m.sum(1), 1e-9)
        pooled /= np.maximum(np.linalg.norm(pooled, axis=1, keepdims=True), 1e-12)
        out.extend(pooled.tolist())
    return out


def pack(v):
    """A float vector → 8-bit integers in base64, with the scale to read it back. ~1/4 the size of JSON floats."""
    v = np.asarray(v, dtype=np.float32)
    scale = float(np.abs(v).max() / 127) or 1.0
    q = np.round(v / scale).astype(np.int8)
    return {"b": base64.b64encode(q.tobytes()).decode("ascii"), "s": scale}


def embed_bank(path=ROOT / "public/bank.json"):
    """One vector per phrasing of every entry (the question and its `also` lines), into bank.json."""
    bank = json.loads(path.read_text(encoding="utf-8"))
    texts = [(e["id"], t) for e in bank["entries"] for t in [e["q"]] + e["also"]]
    vectors = embed([t for _, t in texts])
    bank["model"] = MODEL_ID
    bank["dim"] = len(vectors[0])
    bank["vectors"] = [dict(e=eid, t=t, **pack(v)) for (eid, t), v in zip(texts, vectors)]
    path.write_text(json.dumps(bank, ensure_ascii=False), encoding="utf-8")
    return len(texts), len(bank["entries"])


if __name__ == "__main__":
    if "--texts" in sys.argv:
        print(json.dumps(embed(json.load(sys.stdin))))
    else:
        n, m = embed_bank()
        print(f"Embedded {n} phrasings of {m} entries → public/bank.json")
