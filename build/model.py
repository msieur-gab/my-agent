"""The model the page loads (all-MiniLM-L6-v2, 8-bit ONNX, src/assets/models/), run natively.
Used by build/embed.py and tests/routing.py so both share the page's vector space.
Needs onnxruntime, tokenizers and numpy."""
import os
import numpy as np, onnxruntime as ort
from tokenizers import Tokenizer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = f"{ROOT}/src/assets/models/Xenova/all-MiniLM-L6-v2"


def load(path=PATH):
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


def int8(vecs):
    """What the index stores, and what the page multiplies with: 8-bit, scaled by 127."""
    return np.clip(np.round(vecs * 127), -127, 127).astype(np.int8)
