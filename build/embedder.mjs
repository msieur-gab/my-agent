/* The embedding model, for the build and the tests. The same files the browser loads:
   src/assets/models/Xenova/all-MiniLM-L6-v2 (int8 ONNX) through the same library (@xenova/transformers),
   so a cosine measured here is the cosine the page will see. */
import { pipeline, env } from '@xenova/transformers';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
env.allowRemoteModels = false;
env.localModelPath = path.join(ROOT, 'src/assets/models');
export const MODEL = 'Xenova/all-MiniLM-L6-v2';

let extractor = null;

export async function load() {
  if (!extractor) extractor = await pipeline('feature-extraction', MODEL, { quantized: true });
  return extractor;
}

/* Texts → unit vectors (arrays of 384 floats), mean pooled, as the page does it. */
export async function embed(texts) {
  const model = await load();
  const out = [];
  for (let i = 0; i < texts.length; i += 32) {
    const t = await model(texts.slice(i, i + 32), { pooling: 'mean', normalize: true });
    out.push(...t.tolist());
  }
  return out;
}

/* A float vector → 8-bit integers in base64, with the scale to read it back. ~1/4 the size of JSON floats. */
export function pack(v) {
  let max = 0;
  for (const x of v) max = Math.max(max, Math.abs(x));
  const scale = max / 127 || 1;
  const q = new Int8Array(v.length);
  for (let i = 0; i < v.length; i++) q[i] = Math.round(v[i] / scale);
  return { b: Buffer.from(q.buffer).toString('base64'), s: scale };
}
