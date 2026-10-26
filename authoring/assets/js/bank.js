/* The bank: finds the entry of content/bank.md that answers a question.
   Two ways to look, both extractive, both returning the same shape:
     words    the visitor's words against each phrasing (typos forgiven by match.js), instant
     meaning  the visitor's sentence embedded by a small model in the browser, compared by cosine
              with the phrasings embedded at build time (public/bank.json)
   Works in the browser (window.Bank) and in Node (tests). */
(function (root) {
  var node = typeof module !== 'undefined' && module.exports;
  var Match = node ? require('./match.js') : root.Match;

  /* Thresholds, measured by tests/eval.mjs against tests/held-out.json and tests/bank-eval.json.
     SURE: at or above it the entry is said as the answer.
     MEANING: between the two the entry is said as "the closest I have"; below it there is no answer.
     CLOSE: a second entry this near the best one, leading somewhere else, is a close call: ask back.
     WORDS: a phrasing sharing this much of its words with the question is the same question. */
  var SURE = 0.56, MEANING = 0.47, CLOSE = 0.04, WORDS = 0.75;

  function decode(b64) {
    var bytes = node ? Buffer.from(b64, 'base64') : Uint8Array.from(atob(b64), function (c) { return c.charCodeAt(0); });
    return new Int8Array(bytes.buffer, bytes.byteOffset, bytes.length);
  }

  /* bank: public/bank.json. Phrasings are flattened; vectors (when present) are read back to unit floats. */
  function prepare(bank) {
    var phr = [], vocab = {};
    bank.entries.forEach(function (e) {
      [e.q].concat(e.also).forEach(function (t) {
        var terms = uniq(Match.terms(t));
        terms.forEach(function (w) { vocab[w] = true; });
        phr.push({ entry: e, text: t, terms: terms, v: null });
      });
    });
    var byText = {};
    phr.forEach(function (p) { byText[p.entry.id + '\n' + p.text] = p; });
    (bank.vectors || []).forEach(function (row) {
      var p = byText[row.e + '\n' + row.t];
      if (!p) return;
      var q = decode(row.b), v = new Float32Array(q.length), n = 0;
      for (var i = 0; i < q.length; i++) { v[i] = q[i] * row.s; n += v[i] * v[i]; }
      n = Math.sqrt(n) || 1;
      for (i = 0; i < v.length; i++) v[i] /= n;
      p.v = v;
    });
    return { entries: bank.entries, phr: phr, known: Object.keys(vocab), vocab: vocab, embedded: !!(bank.vectors && bank.vectors.length), model: bank.model };
  }

  function uniq(a) {
    var seen = {}, out = [];
    a.forEach(function (x) { if (!seen[x]) { seen[x] = true; out.push(x); } });
    return out;
  }

  /* One result per entry: its best phrasing and that phrasing's score, best first. */
  function rank(index, scoreOf) {
    var best = {};
    index.phr.forEach(function (p) {
      var s = scoreOf(p);
      if (s <= 0) return;
      var cur = best[p.entry.id];
      if (!cur || s > cur.score) best[p.entry.id] = { entry: p.entry, text: p.text, score: s };
    });
    return Object.keys(best).map(function (k) { return best[k]; }).sort(function (a, b) { return b.score - a.score; });
  }

  /* ---------- by words ---------- */

  function query(index, text) {
    return uniq(Match.terms(text).map(function (t) {
      return index.vocab[t] ? t : Match.nearest(t, index.known) || t;
    }));
  }

  /* Cosine between the two sets of words: shared / sqrt(|question| · |phrasing|). 1 is the same words;
     the same sentence, give or take typos and punctuation, scores above that. */
  function words(index, text) {
    var q = query(index, text), f = Match.fold(text);
    if (!q.length) return [];
    return rank(index, function (p) {
      if (Match.fold(p.text) === f) return 1.5;
      var n = p.terms.filter(function (t) { return q.indexOf(t) !== -1; }).length;
      return n ? n / Math.sqrt(q.length * p.terms.length) : 0;
    }).map(function (r) { r.score = Math.round(r.score * 1000) / 1000; r.how = 'words'; return r; });
  }

  /* ---------- by meaning ---------- */

  function cosine(a, b) {
    var s = 0;
    for (var i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  /* vec: the question embedded (Float32Array or array of floats, unit length). */
  function meaning(index, vec) {
    return rank(index, function (p) { return p.v ? cosine(p.v, vec) : 0; })
      .map(function (r) { r.score = Math.round(r.score * 1000) / 1000; r.how = 'meaning'; return r; });
  }

  /* What the results mean: an answer, the closest thing to one (partial), a close call between entries
     leading to different places, or nothing. `how` is 'words' or 'meaning'; the floors differ. */
  function verdict(results, how) {
    var floor = how === 'meaning' ? MEANING : WORDS, sure = how === 'meaning' ? SURE : WORDS;
    var top = results[0];
    if (!top || top.score < floor) return { kind: 'none', results: results, how: how };
    /* Two entries sharing the same words equally, leading to different places: words can't tell. */
    if (how === 'words' && results[1] && results[1].score === top.score && results[1].entry.leads !== top.entry.leads) return { kind: 'none', results: results, how: how };
    var close = results.filter(function (r) {
      return r !== top && r.score >= top.score - (how === 'meaning' ? CLOSE : 0) && r.entry.leads !== top.entry.leads && r.score >= sure;
    });
    var kind = close.length ? 'close' : top.score >= sure ? 'answer' : 'partial';
    return { kind: kind, results: results, close: [top].concat(close).slice(0, 3), how: how };
  }

  /* ---------- the model, in the browser ----------
     Loaded once, after the page is interactive. The files are served by this site: nothing is fetched
     from anywhere else, and nothing is written to storage beyond the browser's ordinary cache. */
  function loader(base) {
    var ready = null;
    function load() {
      if (ready) return ready;
      ready = import(base + '/assets/js/vendor/transformers.min.js').then(function (tf) {
        tf.env.allowRemoteModels = false;
        tf.env.allowLocalModels = true;
        tf.env.localModelPath = base + '/assets/models/';
        tf.env.useBrowserCache = false;
        tf.env.backends.onnx.wasm.wasmPaths = base + '/assets/js/vendor/';
        tf.env.backends.onnx.wasm.numThreads = 1;
        return tf.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
      }).then(function (model) {
        return function embed(text) {
          return model(text, { pooling: 'mean', normalize: true }).then(function (t) { return t.data; });
        };
      });
      ready.catch(function (e) { console.warn('bank: model unavailable, matching by words', e); });
      return ready;
    }
    return { load: load, loading: function () { return !!ready; } };
  }

  var api = { prepare: prepare, words: words, meaning: meaning, verdict: verdict, loader: loader, cosine: cosine,
    SURE: SURE, MEANING: MEANING, CLOSE: CLOSE, WORDS: WORDS };
  if (node) module.exports = api;
  else root.Bank = api;
})(this);
