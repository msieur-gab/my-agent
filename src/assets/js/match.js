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

  /* ---------- typos ----------
     A word the pieces don't know is read as the closest word they do know, when it is close enough:
     one slip for words of 5 letters or more, two for 9 or more. A slip is a wrong, missing, extra
     or swapped letter. Four-letter words only get two swapped letters ("gdrp"), anything shorter
     is left alone. If two known words are equally close, nothing is guessed. */
  function distance(a, b) {
    var prev2, prev = [], row, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      row = [i];
      for (j = 1; j <= b.length; j++) {
        var cost = a[i - 1] === b[j - 1] ? 0 : 1;
        row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) row[j] = Math.min(row[j], prev2[j - 2] + 1);
      }
      prev2 = prev; prev = row;
    }
    return prev[b.length];
  }

  function slips(word) { return word.length >= 9 ? 2 : word.length >= 5 ? 1 : 0; }

  function nearest(word, known) {
    var max = slips(word), best = null, bestD = max + 1, tie = false;
    if (word.length === 4) {
      var letters = word.split('').sort().join('');
      var swaps = known.filter(function (k) { return k.length === 4 && k.split('').sort().join('') === letters && distance(word, k) === 1; });
      return swaps.length === 1 ? swaps[0] : null;
    }
    if (!max) return null;
    for (var i = 0; i < known.length; i++) {
      var k = known[i];
      if (Math.abs(k.length - word.length) > max) continue;
      var d = distance(word, k);
      if (d < bestD) { best = k; bestD = d; tie = false; }
      else if (d === bestD && k !== best) tie = true;
    }
    return best && !tie ? best : null;
  }

  function prepare(pieces) {
    var vocab = {};
    var index = build(pieces);
    index.forEach(function (entry) {
      entry.fields.concat.apply(entry.fields, entry.answers).forEach(function (t) { vocab[t] = true; });
      Object.keys(entry.all).forEach(function (t) { vocab[t] = true; });
    });
    index.vocab = vocab;
    index.known = Object.keys(vocab);
    return index;
  }

  function build(pieces) {
    return pieces.map(function (p) {
      var fields = [p.title, p.brief, p.question, p.answer].join(' ');
      var all = {};
      terms([p.title].concat(p.keywords || []).join(' ')).forEach(function (t) { all[t] = true; });
      return {
        piece: p,
        keys: (p.keywords || []).map(phrase).filter(function (k) { return k.trim(); }),
        answers: (p.answers || []).map(function (a) { return uniq(terms(a)); }),
        fields: uniq(terms(fields)),
        all: all
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
    var qTerms = uniq(terms(question).map(function (t) {
      return index.vocab[t] ? t : nearest(t, index.known) || t;
    }));
    var qPhrase = ' ' + qTerms.join(' ') + ' ';
    if (!qTerms.length) return [];
    return index.map(function (entry) {
      var r = score(entry, qTerms, qPhrase);
      /* matched: the visitor's own terms found in this piece's keywords, so the reply can say what it picked up on */
      var matched = qTerms.filter(function (t) { return entry.all[t]; });
      return { piece: entry.piece, score: Math.round(r.score * 10) / 10, hits: r.hits, matched: matched };
    }).filter(function (r) { return r.score > 0; })
      .sort(function (a, b) { return b.score - a.score; });
  }

  var STRONG = 4.5, PARTIAL = 2;

  function verdict(results) {
    if (!results.length || results[0].score < PARTIAL) return { kind: 'none', results: results };
    return { kind: results[0].score >= STRONG ? 'answer' : 'partial', results: results };
  }

  /* Things people say to a person that aren't questions about the work.
     Whole-message patterns only, so a real question is never swallowed. */
  var INTENTS = [
    ['greeting', /^(hi|hello|hey|hallo|bonjour|salut|servus|guten tag|good (morning|afternoon|evening))( there| gabriel| gab)?$/],
    ['thanks', /^(ok |okay |great |nice |perfect )?(thanks|thank you|thx|merci|danke|cheers)( a lot| very much| so much| gabriel| gab)?$/],
    ['more', /^(more|tell me more|go on|what else|anything else|next|another( one| example)?|show me (more|another)( one)?)$/],
    ['how', /^((are|r) (you|u) (an? |the )?(real |actual )?(ai|bot|robot|llm|chatbot|human|person|real|chatgpt|gpt|claude|machine)|is this (an? )?(ai|bot|chatbot|llm|chatgpt|real)|how does (this|it|the (site|page))( site| page)? work|how do you work|what is this( site| page)?|who am i (talking|speaking|chatting) (to|with))/],
    ['who', /^(who are you|who is (gabriel|gab|this)|what do you do|tell me about (yourself|you)|about you|what(s| is) your (job|background|story))/],
    ['what', /^(help|what can i ask|what should i ask|what can you (do|answer|tell me)|what do you (know|have))/],
    ['contact', /^(contact|get in touch|how (can|do) i (contact|reach|hire|book) you|can i (contact|hire|reach|call|email|book) you|are you available|can we talk|lets talk|i (want|would like) to (talk|work) (to|with) you|what(s| is) your email)/]
  ];

  function intent(text) {
    var f = fold(text);
    for (var i = 0; i < INTENTS.length; i++) if (INTENTS[i][1].test(f)) return INTENTS[i][0];
    return null;
  }

  /* A typed sentence that asks for a project: by its name, or "this one" for the project in focus.
     Returns { action: 'about' | 'open', slug } or null. The same two actions as tapping a card
     and tapping "Read the full story". A real question that mentions a project is left to search(). */
  var OPEN = /(^| )(open|read|view|visit|go to|take me to)( |$)/;
  var SHOW = /(^| )(show|see)( |$)/; /* the short reply first; the full story once that has been given */
  var ABOUT = /(^| )(tell|about|explain|describe|what is|whats)( |$)/;
  var THIS = /(^| )((this|that|the) (project|one|piece|work|case|story|note)|it|this|that)$/;
  var STORY = /(^| )((full|whole) story|project page|case study)( |$)/;

  /* A project name with a slip in it ("titptap", "pebble", "vroom") or split in two ("tip tap"). */
  function misspelt(f, pieces) {
    var words = f.split(' '), joined = words.join('');
    var hits = pieces.filter(function (p) {
      var t = fold(p.title);
      if (t.indexOf(' ') !== -1 || t.length < 5) return false;
      if (t.length >= 6 && joined.indexOf(t) !== -1) return true;
      return words.some(function (w) { return w.length >= 5 && Math.abs(w.length - t.length) <= slips(t) && distance(w, t) <= slips(t); });
    });
    return hits.length === 1 ? hits[0] : null;
  }

  var FILLER = {};
  'open read view visit show see tell go to take me us please can could would you i want like yes ok okay then now'.split(' ')
    .forEach(function (w) { FILLER[w] = true; });

  function command(text, pieces, focus) {
    var f = fold(text);
    var padded = ' ' + f + ' ';
    var words = f ? f.split(' ').length : 0;
    var action = OPEN.test(f) || STORY.test(f) ? 'open' : SHOW.test(f) ? 'show' : ABOUT.test(f) ? 'about' : null;
    function step(slug) { return action === 'show' ? (slug === focus ? 'open' : 'about') : action || 'about'; }
    var named = pieces.filter(function (p) { return padded.indexOf(' ' + fold(p.title) + ' ') !== -1; })[0] || misspelt(f, pieces);
    if (named) {
      var extra = words - 1;
      if (!action && extra > 2) return null;
      return { action: step(named.slug), slug: named.slug };
    }
    /* "show me", "open", "can you show me please": nothing but the verb, so it means the project in focus */
    var bare = !f.split(' ').some(function (w) { return !FILLER[w]; });
    if (focus && action && words <= 6 && (bare || THIS.test(f) || STORY.test(f))) return { action: step(focus), slug: focus };
    return null;
  }

  var api = { command: command, fold: fold, prepare: prepare, search: search, verdict: verdict, terms: terms, intent: intent, STRONG: STRONG, PARTIAL: PARTIAL };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Match = api;
})(this);
