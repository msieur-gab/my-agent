/* What to reply. Takes what the visitor said or tapped, and what this visit has already shown,
   and returns a reply as plain data. No page code, no generated text: every sentence comes
   from content/, and a typed question is answered from content/bank.md through bank.js.
   Works in the browser (window.Respond) and in Node (tests).

   There are four templates. They all return the same shape, and chat.js shows any of them
   the same way:
     { template,              'project' | 'choice' | 'talk' | 'none'
       says:  [line],         what the agent says, word by word
       why:   line,           "Why this one: you mentioned …"
       cards: [card],         projects to choose from, side by side
       form:  { text },       the form that sends a question to me
       link:  { text, href },
       next:  { label, items },   suggestions, in the visitor's words
       invite: true,          "Want to talk about your version of this?"
       go:    href }          leave for this page once the line is said                        */
(function (root) {
  var node = typeof module !== 'undefined' && module.exports;
  var Match = node ? require('./match.js') : root.Match;
  var Bank = node ? require('./bank.js') : root.Bank;
  var CLOSE = 0.8; /* a second project within 80% of the best one is a close call */

  /* data: { site, pieces }. bank (optional): public/bank.json. embed (optional): text → Promise<vector>,
     the model in the browser; without it the bank is searched by words only, then the pieces as before. */
  function create(data, bank, embed) {
    var site = data.site, voice = site.voice, pieces = data.pieces;
    var base = site.basePath || '';
    var index = Match.prepare(pieces);
    var bySlug = {};
    pieces.forEach(function (p) { bySlug[p.slug] = p; });
    var bankIndex = bank ? Bank.prepare(bank) : null;
    function setBank(b, e) { bankIndex = Bank.prepare(b); embed = e; }

    /* Memory, for this visit only: what was shown, what else was close, which project the talk is on. */
    var seen, said, pool, focus, lastNone = -1;
    function reset() { seen = {}; said = {}; pool = []; focus = null; }
    reset();

    function unseen(list) { return list.filter(function (p) { return p && !seen[p.slug]; }); }

    /* ---------- the four templates ---------- */

    /* One project answers: "Senz is about …" and the way to its full story. */
    function project(p, lead, why, close) {
      seen[p.slug] = true;
      focus = p.slug;
      pool = related(p, close || []);
      return {
        template: 'project',
        says: [lead, aboutLine(p)].filter(Boolean),
        why: why || null,
        link: storyLink(p),
        next: questions(unseen(pool).slice(0, 3), voice.also),
        invite: true
      };
    }

    /* Several projects fit: one line, then a card each. */
    function choice(line, list, link) {
      return { template: 'choice', says: [line], cards: list.map(card), link: link || null };
    }

    /* A written line for things said to a person: hello, who are you, how does this work. */
    function talk(line, extra) {
      var reply = { template: 'talk', says: [].concat(line) };
      Object.keys(extra || {}).forEach(function (k) { reply[k] = extra[k]; });
      return reply;
    }

    /* Nothing fits: say so, offer to send me the question, keep the topics one tap away. */
    function none(text) {
      var i;
      do { i = Math.floor(Math.random() * site.noMatch.length); } while (site.noMatch.length > 1 && i === lastNone);
      lastNone = i;
      return { template: 'none', says: [site.noMatch[i]], form: { text: text }, next: topics(voice.themesAgain) };
    }

    /* ---------- their parts ---------- */

    /* "Brainboard is about a thinking canvas…": the project's own `about` line if it has one, else its answer. */
    function aboutLine(p) {
      var rest = p.about ? p.about.replace(/\.$/, '') + '.'
        : (p.answer || '').replace(/^(A|An|The) /, function (m) { return m.toLowerCase(); });
      return voice.aboutLead.replace('{title}', p.title).replace('{about}', rest);
    }

    function storyLink(p) {
      return { text: p.type === 'note' ? voice.readNote : voice.readStory, href: p.url };
    }

    function card(p) {
      var meta = [p.where, p.year || (p.type === 'note' ? p.date : '')].filter(Boolean).join(' · ');
      return { title: p.title, meta: meta, text: p.question || '', cta: voice.open, pick: p.slug };
    }

    /* Suggestions are written the way a visitor would ask them. `said` means: show it as their message. */
    function questions(list, label) {
      var used = {};
      return { label: label, items: list.map(function (p) {
        var text = (p.answers || []).filter(function (a) { return !used[a]; })[0] || p.question;
        used[text] = true;
        return { text: text, pick: p.slug, said: true };
      }) };
    }

    function topics(label) {
      return { label: label, items: site.themes.map(function (t) { return { text: t.label, theme: t.id, said: true }; }) };
    }

    /* The other projects worth offering after this one: the close matches, then its topic neighbours. */
    function related(p, close) {
      var list = close.filter(function (o) { return o !== p; });
      (p.themes || []).forEach(function (t) {
        pieces.forEach(function (o) {
          if (o !== p && o.themes && o.themes.indexOf(t) !== -1 && list.indexOf(o) === -1) list.push(o);
        });
      });
      return list;
    }

    /* "Why this one: you mentioned …" The visitor's own words that led to this project. */
    function heard(text, matched) {
      var words = [], used = {};
      text.split(/\s+/).forEach(function (raw) {
        var w = raw.replace(/^[^A-Za-z0-9À-ÿ]+|[^A-Za-z0-9À-ÿ]+$/g, '');
        var t = Match.terms(w)[0];
        if (t && matched.indexOf(t) !== -1 && !used[t]) { used[t] = true; words.push(w); }
      });
      return words.length ? voice.heard + ' ' + words.slice(0, 4).join(', ') + '.' : null;
    }

    function nothingLeft() { return talk(voice.noMore, { next: topics(voice.themesAgain) }); }

    /* ---------- what the visitor can do ---------- */

    /* They typed something. In order: a project asked for by name, a topic by name, then the bank:
       by words when a phrasing is nearly the same sentence, by meaning otherwise (that one takes a
       moment, so a Promise is returned). Without the bank, or when it has nothing: the pieces, as before. */
    function ask(text) {
      var cmd = Match.command(text, pieces, focus);
      if (cmd) return cmd.action === 'open' ? open(cmd.slug) : pick(cmd.slug);

      var topic = site.themes.filter(function (t) { return Match.fold(t.label) === Match.fold(text); })[0];
      if (topic) return theme(topic.id);

      if (bankIndex) {
        var vw = Bank.verdict(Bank.words(bankIndex, text), 'words');
        if (vw.kind !== 'none') return fromBank(vw, text);
        if (bankIndex.embedded && embed) {
          return embed(text).then(function (vec) {
            var vm = Bank.verdict(Bank.meaning(bankIndex, vec), 'meaning');
            return vm.kind === 'none' ? nothing(text) : fromBank(vm, text);
          }, function () { return nothing(text); });
        }
        return nothing(text);
      }
      return search(text);
    }

    /* The bank has no answer. Only the list and the talk patterns are still tried: the pieces' keywords
       are not, so that the bank stays the one place that decides what a question gets. */
    function nothing(text) {
      var kind = Match.intent(text);
      if (kind) return small(kind);
      return Match.wantsList(text) ? everything() : none(text);
    }

    /* What the bank found: an entry (said in full, or as the closest thing), or a close call between a few. */
    function fromBank(v, text) {
      var top = v.results[0];
      if (v.kind === 'close') {
        var list = unseen(v.close.map(function (r) { return bySlug[r.entry.leads]; }));
        if (list.length > 1) return choice(voice.askBack, list);
      }
      return entry(top.entry, text, v.kind === 'partial', top.text);
    }

    /* An entry of the bank, said. `read` is the phrasing that matched: when it isn't what the visitor
       typed, the reply shows how the question was understood. */
    function entry(e, text, partial, read) {
      var why = read && Match.fold(read) !== Match.fold(text) ? voice.read.replace('{q}', e.q) : null;
      var lead = partial ? site.partialIntro : null;
      var lines = [lead].concat(e.say).filter(Boolean);
      var to = e.leads || '';
      var p = bySlug[to];
      if (p) {
        /* The same entry again: the piece is still the answer. Another entry leading to a piece already shown
           is still said, in full: the reply is new even if the story isn't. */
        if (said[e.id] && seen[p.slug] && !partial) return talk(voice.seen.replace('{title}', p.title), { why: why, link: storyLink(p), next: alsoOn(e), invite: true });
        said[e.id] = true;
        seen[p.slug] = true;
        focus = p.slug;
        pool = related(p, []);
        return { template: 'project', says: lines, why: why, link: storyLink(p), next: alsoOn(e), invite: true };
      }
      said[e.id] = true;
      if (to === 'invite') return { template: 'none', says: lines, why: why, form: { text: text }, next: topics(voice.themesAgain) };
      if (to === 'contact') return talk(lines, { why: why, form: { text: '' } });
      if (to === 'all') return choice(lines[0], pieces.filter(function (x) { return x.type === 'work'; }), { text: voice.allLink, href: base + '/work/' });
      if (to === 'more') return small('more');
      if (to.indexOf('page:') === 0) return talk(lines, { why: why, link: { text: voice.howLink, href: base + '/' + to.slice(5) + '/' }, next: topics() });
      var next = alsoOn(e);
      return talk(lines, { why: why, next: next.items.length ? next : topics() });
    }

    /* The other questions of the same section, not yet said, the way the bank writes them. */
    function alsoOn(e) {
      var items = bankIndex.entries.filter(function (o) {
        return o !== e && o.section === e.section && !said[o.id] && o.theme !== 'talk';
      }).slice(0, 3).map(function (o) { return { text: o.q, entry: o.id, said: true }; });
      return { label: voice.also, items: items };
    }

    /* The pieces themselves, by keywords and listed questions: the matcher the site had before the bank. */
    function search(text) {
      var kind = Match.intent(text);
      if (kind) return small(kind);

      var v = Match.verdict(Match.search(index, text));
      if (v.kind === 'none') return Match.wantsList(text) ? everything() : none(text);
      var ok = v.results.filter(function (r) { return r.score >= Match.PARTIAL; });
      var top = ok[0];
      var others = ok.slice(1).map(function (r) { return r.piece; });

      /* Already shown in this visit: offer the next angle, or say it's still the best one. */
      if (seen[top.piece.slug]) {
        var alt = ok.filter(function (r) { return !seen[r.piece.slug]; })[0];
        if (alt) return project(alt.piece, voice.another, heard(text, alt.matched), others);
        return talk(voice.seen.replace('{title}', top.piece.title), { link: storyLink(top.piece), invite: true });
      }

      /* Several projects answer it about equally well: ask rather than pick. */
      var close = ok.filter(function (r) { return r.score >= Match.STRONG && r.score >= top.score * CLOSE && !seen[r.piece.slug]; });
      if (close.length > 1) return choice(voice.askBack, close.slice(0, 3).map(function (r) { return r.piece; }));

      return project(top.piece, v.kind === 'answer' ? null : site.partialIntro, heard(text, top.matched), others);
    }

    function small(kind) {
      var line = site.smalltalk[kind];
      if (kind === 'more') {
        var another = unseen(pool)[0];
        return another ? project(another, voice.another, null, pool) : nothingLeft();
      }
      if (kind === 'contact') return talk(line, { form: { text: '' } });
      if (kind === 'thanks') return talk(line);
      if (kind === 'how') return talk(line, { link: { text: voice.howLink, href: base + '/how-this-site-works/' }, next: topics() });
      return talk(line, { next: topics() });
    }

    /* A card or a suggested question was tapped, or a project was asked for by name. */
    function pick(slug) {
      return bySlug[slug] ? project(bySlug[slug]) : nothingLeft();
    }

    /* "Open Senz", "show me" once it has been presented: say so, then go to its page. */
    function open(slug) {
      var p = bySlug[slug];
      focus = slug;
      return talk(voice.opening.replace('{title}', p.title), { go: p.url });
    }

    function theme(id) {
      var t = site.themes.filter(function (x) { return x.id === id; })[0];
      var list = (t ? t.pieces : []).map(function (s) { return bySlug[s]; }).filter(Boolean);
      var fresh = unseen(list);
      if (!list.length) return none(t ? t.label : '');
      if (list.length === 1) return project(list[0]);
      if (fresh.length === 1) return project(fresh[0], null, null, list);
      if (!fresh.length) return nothingLeft();
      return choice(voice.askBack, fresh);
    }

    /* "Show me all your work." */
    function everything() {
      var work = pieces.filter(function (p) { return p.type === 'work'; });
      return choice(voice.all, work, { text: voice.allLink, href: base + '/work/' });
    }

    /* A suggested question was tapped: say its entry. */
    function entryById(id) {
      var e = bankIndex && bankIndex.entries[id];
      return e ? entry(e, e.q, false, e.q) : nothingLeft();
    }

    return { ask: ask, pick: pick, theme: theme, entry: entryById, reset: reset, setBank: setBank };
  }

  var api = { create: create };
  if (node) module.exports = api;
  else root.Respond = api;
})(this);
