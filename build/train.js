// node build/train.js [content/intents.md]
// Reads content/intents.md, trains the intent model, prints { model, replies } as JSON (build.py embeds it).
// The intent trainer of ptiLU (msieur-gab/minios-nlu, main-fixes, web/trainer.js), without the slot tagger:
// TF-IDF + multinomial logistic regression (L-BFGS), weak weights dropped, the rest stored as 1 byte each.
const fs = require('fs');
const path = require('path');
const { features } = require('../src/assets/js/nlu.js');

/* ## name, then `reply:` and `offer:` lines, then `- example` lines. Anything else is a comment for people. */
function read(md) {
  const intents = {};
  let cur = null;
  for (const raw of md.split('\n')) {
    const line = raw.trim();
    const h = /^##\s+([a-z_]+)\s*$/.exec(line);
    if (h) { cur = intents[h[1]] = { examples: [] }; continue; }
    if (!cur) continue;
    const kv = /^(reply|offer):\s*(.+)$/.exec(line);
    if (kv) cur[kv[1]] = kv[2].trim();
    else if (line.startsWith('- ')) cur.examples.push(line.slice(2).trim());
  }
  return intents;
}

function tfidf(texts) {
  const docs = texts.map(t => { const c = new Map(); for (const f of features(t)) c.set(f, (c.get(f) || 0) + 1); return c; });
  const df = new Map();
  for (const d of docs) for (const f of d.keys()) df.set(f, (df.get(f) || 0) + 1);
  const vocab = [...df.keys()].filter(f => df.get(f) >= 2).sort();
  const index = new Map(vocab.map((f, i) => [f, i]));
  const idf = Float64Array.from(vocab, f => Math.log((1 + texts.length) / (1 + df.get(f))) + 1);
  const rows = docs.map(d => {
    const idx = [], val = [];
    let norm = 0;
    for (const [f, c] of d) {
      const j = index.get(f);
      if (j === undefined) continue;
      const v = (1 + Math.log(c)) * idf[j];
      idx.push(j); val.push(v); norm += v * v;
    }
    norm = Math.sqrt(norm) || 1;
    return { idx, val: val.map(v => v / norm) };
  });
  return { vocab, idf, rows };
}

// cross-entropy weighted so every intent counts the same, plus |W|^2 / 2C (intercepts not penalised)
function logreg(rows, y, K, nf, C = 8) {
  const n = rows.length, counts = new Float64Array(K), s = new Float64Array(K);
  for (const k of y) counts[k]++;
  const sw = y.map(k => n / (K * counts[k]));
  return lbfgs((w, g) => {
    g.fill(0);
    let f = 0;
    for (let i = 0; i < n; i++) {
      const { idx, val } = rows[i];
      let mx = -Infinity, z = 0;
      for (let k = 0; k < K; k++) {
        let v = w[K * nf + k];
        for (let q = 0; q < idx.length; q++) v += w[k * nf + idx[q]] * val[q];
        s[k] = v; if (v > mx) mx = v;
      }
      for (let k = 0; k < K; k++) { s[k] = Math.exp(s[k] - mx); z += s[k]; }
      f += sw[i] * (Math.log(z) - Math.log(s[y[i]]));
      for (let k = 0; k < K; k++) {
        const d = sw[i] * (s[k] / z - (k === y[i] ? 1 : 0));
        for (let q = 0; q < idx.length; q++) g[k * nf + idx[q]] += d * val[q];
        g[K * nf + k] += d;
      }
    }
    for (let p = 0; p < K * nf; p++) { f += w[p] * w[p] / (2 * C); g[p] += w[p] / C; }
    return f;
  }, new Float64Array(K * nf + K));
}

function lbfgs(fg, x, m = 10, maxIter = 200, tol = 1e-4) {
  const P = x.length, S = [], Y = [], rho = [];
  const dot = (a, b) => { let t = 0; for (let i = 0; i < P; i++) t += a[i] * b[i]; return t; };
  let g = new Float64Array(P), f = fg(x, g);
  const xn = new Float64Array(P), gn = new Float64Array(P), d = new Float64Array(P);
  for (let it = 0; it < maxIter; it++) {
    let gmax = 0;
    for (let i = 0; i < P; i++) gmax = Math.max(gmax, Math.abs(g[i]));
    if (gmax < tol) break;
    for (let i = 0; i < P; i++) d[i] = -g[i];
    const alpha = [];
    for (let j = S.length - 1; j >= 0; j--) { alpha[j] = rho[j] * dot(S[j], d); for (let i = 0; i < P; i++) d[i] -= alpha[j] * Y[j][i]; }
    const L = S.length - 1, gamma = S.length ? dot(S[L], Y[L]) / dot(Y[L], Y[L]) : 1 / Math.sqrt(dot(g, g));
    for (let i = 0; i < P; i++) d[i] *= gamma;
    for (let j = 0; j < S.length; j++) { const b = rho[j] * dot(Y[j], d); for (let i = 0; i < P; i++) d[i] += S[j][i] * (alpha[j] - b); }
    let slope = dot(g, d);
    if (slope >= 0) { for (let i = 0; i < P; i++) d[i] = -g[i]; S.length = Y.length = rho.length = 0; slope = dot(g, d); }
    let step = 1, fn;
    for (let ls = 0; ls < 30; ls++) {
      for (let i = 0; i < P; i++) xn[i] = x[i] + step * d[i];
      fn = fg(xn, gn);
      if (fn <= f + 1e-4 * step * slope) break;
      step *= 0.5;
    }
    const sv = new Float64Array(P), yv = new Float64Array(P);
    for (let i = 0; i < P; i++) { sv[i] = xn[i] - x[i]; yv[i] = gn[i] - g[i]; }
    const sy = dot(sv, yv);
    if (sy > 1e-10) { S.push(sv); Y.push(yv); rho.push(1 / sy); if (S.length > m) { S.shift(); Y.shift(); rho.shift(); } }
    x.set(xn); g.set(gn);
    const rel = Math.abs(f - fn) / Math.max(1, Math.abs(f));
    f = fn;
    if (rel < 1e-9) break;
  }
  return x;
}

// keep weights with |w| >= prune, stored as round(w / scale) in -127..127
function pack(w, K, nf, vocab, idf, prune) {
  let mx = 0;
  for (let p = 0; p < K * nf; p++) if (Math.abs(w[p]) >= prune) mx = Math.max(mx, Math.abs(w[p]));
  const scale = mx / 127 || 1, keep = [], out = [];
  for (let j = 0; j < nf; j++) {
    const c = [];
    for (let k = 0; k < K; k++) {
      const q = Math.abs(w[k * nf + j]) < prune ? 0 : Math.round(w[k * nf + j] / scale);
      if (q) c.push(k, q & 0xff);
    }
    if (c.length) { keep.push(j); out.push(c.length / 2, ...c); }
  }
  const b64 = a => Buffer.from(a).toString('base64');
  return {
    vocab: keep.map(j => vocab[j]),
    idf: b64(new Uint8Array(Float32Array.from(keep, j => idf[j]).buffer)),
    scale: +scale.toPrecision(6),
    weights: b64(Uint8Array.from(out))
  };
}

function train(intents, prune = 0.5) {
  const names = Object.keys(intents).sort();
  const ex = names.flatMap((name, k) => intents[name].examples.map(text => ({ text, k })));
  const { vocab, idf, rows } = tfidf(ex.map(e => e.text));
  const K = names.length, nf = vocab.length;
  const w = logreg(rows, ex.map(e => e.k), K, nf);
  return Object.assign({ intents: names }, pack(w, K, nf, vocab, idf, prune),
    { intercept: Array.from(w.subarray(K * nf), v => Math.round(v * 1e4) / 1e4) });
}

if (require.main === module) {
  const file = process.argv[2] || path.join(__dirname, '../content/intents.md');
  const intents = read(fs.readFileSync(file, 'utf8'));
  const replies = {};
  for (const [name, it] of Object.entries(intents)) if (it.reply || it.offer) replies[name] = { line: it.reply || '', offer: it.offer || '' };
  process.stdout.write(JSON.stringify({ model: train(intents), replies }));
}

module.exports = { read, train };
