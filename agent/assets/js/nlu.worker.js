/* Turns a sentence into a vector, off the main thread so the page never freezes.
   Loads transformers.js and all-MiniLM-L6-v2 (8-bit) from this site, never from a CDN.
   Same pattern as brainboard's embed.worker.js, which is proven in Brave and on a phone.

   Messages (each carries `id`, the reply echoes it):
     { id, type: 'load' }          → { id, ok, version }
     { id, type: 'embed', text }   → { id, ok, vec: Float32Array(384), ms }
   On failure: { id, ok: false, error } */
const VERSION = '2026-10-01.1';   // shown by /assets/nlu/test.html, so a stale cached worker is visible

let pipe = null, loading = null;

function load() {
  if (pipe) return Promise.resolve(pipe);
  if (!loading) {
    loading = (async () => {
      const lib = await import(new URL('../vendor/transformers/transformers.min.js', self.location.href).href);
      lib.env.allowRemoteModels = false;                                        // never reach Hugging Face
      lib.env.allowLocalModels = true;
      lib.env.localModelPath = new URL('../models/', self.location.href).href;  // models/Xenova/…
      lib.env.backends.onnx.wasm.wasmPaths = new URL('../vendor/transformers/', self.location.href).href;
      lib.env.backends.onnx.wasm.numThreads = 1;                                // SIMD wasm, no special headers needed
      pipe = await lib.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
      return pipe;
    })();
  }
  return loading;
}

self.onmessage = async (e) => {
  const { id, type, text } = e.data;
  try {
    const p = await load();
    if (type === 'load') return self.postMessage({ id, ok: true, version: VERSION });
    const t0 = performance.now();
    const out = await p([text], { pooling: 'mean', normalize: true });
    self.postMessage({ id, ok: true, vec: out.data.slice(0, out.dims[1]), ms: Math.round(performance.now() - t0) });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String((err && err.message) || err) });
  }
};
