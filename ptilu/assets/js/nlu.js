/* What kind of message this is: the intent part of ptiLU (msieur-gab/minios-nlu, branch main-fixes,
   web/runtime.js), without the slot tagger. Same features and model format, so a ptiLU model reads here.
   Features: words, word pairs, letter 3-4-grams, TF-IDF; a logistic regression gives each intent a share.
   Trained from content/intents.md by build/train.js. Works in the browser (window.NLU) and in Node. */
(function (root) {
  var TOKEN = /[\p{L}\p{N}_](?:[\p{L}\p{N}_.\-]*[\p{L}\p{N}_])?/gu;

  function features(text) {
    var toks = String(text).toLowerCase().match(TOKEN) || [];
    var out = [], prev = '<s>';
    toks.forEach(function (t) {
      out.push('w:' + t, 'b:' + prev + '_' + t);
      var p = '<' + t + '>';
      for (var n = 3; n <= 4; n++) for (var i = 0; i + n <= p.length; i++) out.push('c:' + p.slice(i, i + n));
      prev = t;
    });
    out.push('b:' + prev + '_</s>');
    return out;
  }

  function bytes(b64) {
    var bin = atob(b64), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  }

  /* The model keeps only the weights that matter, one byte each: per feature a count, then (intent, value) pairs. */
  function create(m) {
    var K = m.intents.length, nf = m.vocab.length;
    var vocab = new Map(m.vocab.map(function (f, i) { return [f, i]; }));
    var idf = new Float32Array(bytes(m.idf).buffer);
    var w = bytes(m.weights), coef = new Float32Array(K * nf), o = 0;
    for (var j = 0; j < nf; j++) {
      for (var n = w[o++], q = 0; q < n; q++) {
        var k = w[o++], v = w[o++];
        coef[k * nf + j] = (v > 127 ? v - 256 : v) * m.scale;
      }
    }

    /* → [[intent, share], …], best first */
    function classify(text) {
      var counts = new Map();
      features(text).forEach(function (f) {
        var j = vocab.get(f);
        if (j !== undefined) counts.set(j, (counts.get(j) || 0) + 1);
      });
      var vec = [], norm = 0;
      counts.forEach(function (c, j) { var v = (1 + Math.log(c)) * idf[j]; vec.push([j, v]); norm += v * v; });
      norm = Math.sqrt(norm) || 1;
      var s = m.intents.map(function (_, k) {
        var x = m.intercept[k];
        vec.forEach(function (e) { x += coef[k * nf + e[0]] * e[1] / norm; });
        return x;
      });
      var mx = Math.max.apply(null, s), ex = s.map(function (x) { return Math.exp(x - mx); });
      var sum = ex.reduce(function (a, b) { return a + b; }, 0);
      return ex.map(function (e, k) { return [m.intents[k], e / sum]; }).sort(function (a, b) { return b[1] - a[1]; });
    }
    return { classify: classify };
  }

  var api = { create: create, features: features };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NLU = api;
})(this);
