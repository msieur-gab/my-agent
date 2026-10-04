/* Understanding by meaning, in the visitor's own browser.

   The visitor's question is turned into a vector by a small model (all-MiniLM-L6-v2, 23 MB, served
   from this site) running in a worker. It is compared with vectors prepared ahead of time
   (build/embed.py) for every answer I can give: projects, notes, views and intents. Each answer has
   rows: the ways a visitor might ask it (`answers:`), its gist, and my own paragraphs.
   Nothing is sent anywhere, and no text is generated: the result is always one of my own answers.

   The decision (settings in index.json, chosen and measured in tests/routing.py):
     each answer scores its best row (paragraphs count a little less), plus a little for its keywords;
     below `floor`              → nothing: the page says it has no answer
     a second within `margin`   → a choice: the page asks which is closest
     below `sure`               → maybe: shown as "the closest I have"
     else                       → that answer

   rank() is pure and also runs in Node (tests/check.js). The rest needs a browser. */
(function (root) {
  var node = typeof module !== 'undefined' && module.exports;

  /* index: { dim, settings, targets: [{slug, kind}], rows: [{t, kind, text}] }
     vectors: Int8Array, one row per index.rows entry; q: the question's vector (Float32Array, normalised)
     kw: { slug: keyword score } from Match.search, or {} */
  function rank(index, vectors, q, kw) {
    var dim = index.dim, st = index.settings, w = st.weights, n = index.targets.length;
    var best = [], at = [], i;
    for (i = 0; i < n; i++) { best.push(-1); at.push(-1); }
    index.rows.forEach(function (r, row) {
      var s = 0, o = row * dim;
      for (var k = 0; k < dim; k++) s += q[k] * vectors[o + k];
      s = s / 127 * w[r.kind];
      if (s > best[r.t]) { best[r.t] = s; at[r.t] = row; }
    });
    kw = kw || {};
    index.targets.forEach(function (t, j) {
      if (kw[t.slug]) best[j] += st.keyword.boost * Math.min(kw[t.slug] / st.keyword.full, 1);
    });
    var order = best.map(function (_, j) { return j; }).sort(function (a, b) { return best[b] - best[a]; });
    var top = best[order[0]];
    if (top < st.floor) return { verdict: 'none', targets: [], score: top };
    var close = order.slice(0, 3).filter(function (j) { return top - best[j] < st.margin; });
    return {
      verdict: close.length > 1 ? 'choice' : top >= st.sure ? 'answer' : 'maybe',
      targets: close.map(function (j) {
        return { slug: index.targets[j].slug, kind: index.targets[j].kind, score: best[j], row: at[j], via: index.rows[at[j]].kind };
      }),
      score: top
    };
  }

  if (node) { module.exports = { rank: rank }; return; }

  /* ---------- in the browser ---------- */

  var PATIENCE = 6000; /* how long a question waits for the model's first load before the keyword logic answers instead */
  var loaded = null, worker = null, ready = null, isReady = false, jobs = {}, nextId = 1;

  /* '' on a root domain, '/my-agent' on GitHub Pages (set by agent.js from the page's data). */
  function base() { return root.SITE_BASE || ''; }

  /* The prepared index and vectors: two small files (about 150 KB), fetched once. */
  function index() {
    if (!loaded) {
      loaded = Promise.all([
        fetch(base() + '/assets/nlu/index.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
        fetch(base() + '/assets/nlu/vectors.bin').then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      ]).then(function (got) { got[0].vectors = new Int8Array(got[1]); return got[0]; });
      loaded.catch(function () { loaded = null; });
    }
    return loaded;
  }

  function post(message) {
    return new Promise(function (resolve, reject) {
      var id = nextId++;
      jobs[id] = { resolve: resolve, reject: reject };
      message.id = id;
      worker.postMessage(message);
    });
  }

  /* Start loading the model. Called when the visitor shows they are about to ask (focus on the field),
     never on page load. Safe to call many times. */
  function warm() {
    if (ready) return ready;
    try {
      worker = new Worker(base() + '/assets/js/nlu.worker.js', { type: 'module' });
    } catch (e) { return (ready = Promise.reject(e)); }
    worker.onmessage = function (e) {
      var job = jobs[e.data.id];
      if (!job) return;
      delete jobs[e.data.id];
      if (e.data.ok) job.resolve(e.data); else job.reject(new Error(e.data.error));
    };
    worker.onerror = function (e) {
      Object.keys(jobs).forEach(function (id) { jobs[id].reject(new Error(e.message || 'worker failed')); delete jobs[id]; });
    };
    ready = post({ type: 'load' }).then(function (r) { isReady = true; return r; });
    ready.catch(function () { /* stays failed: the keyword logic keeps answering */ });
    index().catch(function () {});
    return ready;
  }

  function embed(text) {
    return warm().then(function () { return post({ type: 'embed', text: text }); }).then(function (r) { return r.vec; });
  }

  /* What my work has on this question, or null when the model is not available (not loaded in time,
     failed, or an old browser): the caller then falls back on the keyword logic. */
  function find(text, kw) {
    var work = Promise.all([index(), embed(text)]).then(function (got) { return rank(got[0], got[0].vectors, got[1], kw); });
    var gaveUp = new Promise(function (resolve) { if (!isReady) setTimeout(function () { resolve(null); }, PATIENCE); });
    return Promise.race([work, gaveUp]).catch(function () { return null; });
  }

  root.Nlu = { rank: rank, index: index, warm: warm, embed: embed, find: find };
})(this);
