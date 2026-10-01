/* Matching: finds the piece of work that best answers a question.
   Extractive only: it ranks existing pieces and never writes text.
   Works in the browser (window.Match) and in Node (module.exports) for tests. */
(function (root) {
  var STOP = ('a an the and or but if then so of to in on at by for with from about into over under ' +
    'is are was were be been being am do does did doing have has had having can could should would will shall may might must ' +
    'i me my we our us you your he she it its they them their this that these those what which who whom how why when where ' +
    'not no yes very just also too more most some any all each other than as up out there here get got make made').split(' ');
  var stop = {};
  STOP.forEach(function (w) { stop[w] = true; });

  function fold(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function stem(w) {
    if (w.length > 5 && /ations?$/.test(w)) return w.replace(/ations?$/, 'at');
    if (w.length > 5 && /isations?$|izations?$/.test(w)) return w.replace(/[iz]ations?$|isations?$/, 'is');
    if (w.length > 4 && /ing$/.test(w)) return w.slice(0, -3);
    if (w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (w.length > 4 && /ed$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /es$/.test(w) && !/ses$/.test(w)) return w.slice(0, -1);
    if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
    return w.replace(/ise$/, 'iz');
  }

  function terms(s) {
    return fold(s).split(' ').filter(function (w) { return w && !stop[w] && w.length > 1; }).map(stem);
  }

  function phrase(s) { return ' ' + terms(s).join(' ') + ' '; }

  function prepare(pieces) {
    return pieces.map(function (p) {
      var fields = [p.title, p.brief, p.question, p.answer].join(' ');
      return {
        piece: p,
        keys: (p.keywords || []).map(phrase).filter(function (k) { return k.trim(); }),
        answers: (p.answers || []).map(function (a) { return uniq(terms(a)); }),
        fields: uniq(terms(fields))
      };
    });
  }

  function uniq(a) {
    var seen = {}, out = [];
    a.forEach(function (x) { if (!seen[x]) { seen[x] = true; out.push(x); } });
    return out;
  }

  function score(entry, qTerms, qPhrase) {
    var s = 0, hits = [];
    entry.keys.forEach(function (k) { if (qPhrase.indexOf(k) !== -1) { s += 3; hits.push(k.trim()); } });
    var best = 0;
    entry.answers.forEach(function (a) {
      var n = a.filter(function (t) { return qTerms.indexOf(t) !== -1; }).length;
      var ratio = a.length ? n / a.length : 0;
      var v = n * 1.5 + (ratio >= 0.6 ? 3 : 0);
      if (v > best) best = v;
    });
    s += best;
    s += entry.fields.filter(function (t) { return qTerms.indexOf(t) !== -1; }).length * 0.5;
    return { score: s, hits: hits };
  }

  function search(index, question) {
    var qTerms = uniq(terms(question));
    var qPhrase = ' ' + qTerms.join(' ') + ' ';
    if (!qTerms.length) return [];
    return index.map(function (entry) {
      var r = score(entry, qTerms, qPhrase);
      return { piece: entry.piece, score: Math.round(r.score * 10) / 10, hits: r.hits };
    }).filter(function (r) { return r.score > 0; })
      .sort(function (a, b) { return b.score - a.score; });
  }

  var STRONG = 4.5, PARTIAL = 2;

  function verdict(results) {
    if (!results.length || results[0].score < PARTIAL) return { kind: 'none', results: results };
    return { kind: results[0].score >= STRONG ? 'answer' : 'partial', results: results };
  }

  var api = { prepare: prepare, search: search, verdict: verdict, terms: terms, STRONG: STRONG, PARTIAL: PARTIAL };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Match = api;
})(this);
