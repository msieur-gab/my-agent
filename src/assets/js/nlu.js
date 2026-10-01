/* Understanding by meaning, in the visitor's own browser.

   The visitor's question is turned into a vector by a small model (all-MiniLM-L6-v2, 23 MB, served
   from this site) running in a worker. It is compared with vectors prepared ahead of time
   (build/embed.py) for the questions I listed in each piece and for every passage of my texts.
   Nothing is sent anywhere, and no text is generated: the result is always one of my own paragraphs.

   The decision, in order:
     1. one of my listed questions is close enough  → the paragraph it points at
     2. else a passage is close enough              → that passage, and its neighbours from the same piece
     3. else                                        → nothing: the page says it has no answer
   "Close enough" is a floor measured in build/embed.py: just above what any far off-topic question reaches.

   rank() is pure and also runs in Node (tests/check.js). The rest needs a browser. */
(function (root) {
  var node = typeof module !== 'undefined' && module.exports;

  /* index: { dim, floors, passages: [{slug, section, text}], questions: [{slug, q, passage}] }
     vectors: Int8Array, one row per passage then one per listed question; q: the question's vector */
  function rank(index, vectors, q) {
    var dim = index.dim, nP = index.passages.length;
    function score(row) {
      var s = 0, o = row * dim;
      for (var i = 0; i < dim; i++) s += q[i] * vectors[o + i];
      return s / 127;
    }
    var bestQ = { i: -1, score: -1 };
    index.questions.forEach(function (_, i) {
      var s = score(nP + i);
      if (s > bestQ.score) bestQ = { i: i, score: s };
    });
    var scored = index.passages.map(function (_, i) { return { i: i, score: score(i) }; })
      .sort(function (a, b) { return b.score - a.score; });

    var out = { question: null, passages: [], best: Math.max(bestQ.score, scored[0].score) };
    if (bestQ.score >= index.floors.question) {
      var e = index.questions[bestQ.i];
      out.question = { index: bestQ.i, slug: e.slug, q: e.q, score: bestQ.score, passage: index.passages[e.passage] };
    }
    if (scored[0].score >= index.floors.passage) {
      var slug = index.passages[scored[0].i].slug;
      out.passages = scored.filter(function (r) { return r.score >= index.floors.passage && index.passages[r.i].slug === slug; })
        .slice(0, 3).map(function (r) {
          var p = index.passages[r.i];
          return { index: r.i, slug: p.slug, section: p.section, text: p.text, score: r.score };
        });
    }
    return out;
  }

  if (node) { module.exports = { rank: rank }; return; }

  /* ---------- in the browser ---------- */

  var PATIENCE = 6000; /* how long a question waits for the model's first load before the keyword logic answers instead */
  var loaded = null, worker = null, ready = null, isReady = false, jobs = {}, nextId = 1;

  /* '' on a root domain, '/my-agent' on GitHub Pages (set by agent.js from the page's data). */
  function base() { return root.SITE_BASE || ''; }

  /* The prepared index and vectors: two small files (about 160 KB), fetched once. */
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
  function find(text) {
    var work = Promise.all([index(), embed(text)]).then(function (got) { return rank(got[0], got[0].vectors, got[1]); });
    var gaveUp = new Promise(function (resolve) { if (!isReady) setTimeout(function () { resolve(null); }, PATIENCE); });
    return Promise.race([work, gaveUp]).catch(function () { return null; });
  }

  root.Nlu = { rank: rank, index: index, warm: warm, embed: embed, find: find };
})(this);
