/* What to reply. Takes what the visitor said or tapped, and what this visit has already shown,
   and returns a reply as plain data. No page code, no generated text: every sentence comes
   from content/. Works in the browser (window.Respond) and in Node (tests).

   There are four templates. They all return the same shape, and chat.js shows any of them
   the same way (my view on a common question, from content/views/, is said as talk):
     { template,              'project' | 'choice' | 'talk' | 'none'
       says:  [line],         what the agent says, word by word
       why:   line,           "Why this one: you mentioned …"
       cards: [card],         projects to choose from, side by side
       form:  { text },       the form that sends a question to me
       link:  { text, href },
       next:  { label, items },   suggestions, in the visitor's words
       invite: true | line,   "Want to talk about your version of this?", or the reply's own words
       go:    href,           leave for this page once the line is said
       trace: { how, verdict, targets, score }   how the reply was decided                     */
(function (root) {
  var node = typeof module !== 'undefined' && module.exports;
  var Match = node ? require('./match.js') : root.Match;
  var CLOSE = 0.8; /* a second project within 80% of the best one is a close call */

  function create(data) {
    var site = data.site, voice = site.voice, pieces = data.pieces;
    var base = site.basePath || '';
    var index = Match.prepare(pieces);
    var bySlug = {};
    pieces.forEach(function (p) { bySlug[p.slug] = p; });

    /* Memory, for this visit only: what was shown, what else was close, which project and which topic the talk is on. */
    var seen, told, pool, focus, topic, viewed, lastNone = -1;
    function reset() { seen = {}; told = {}; pool = []; focus = null; topic = null; viewed = false; }
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
        next: questions(unseen(pool).slice(0, 3), voice.also, p),
        invite: true
      };
    }

    /* No project answers it, but I wrote my view on it: said as a view, then the question that
       naturally follows (another view of mine), then the invitation. That it is a view and not
       work is said once per visit, not before each one. */
    function view(p) {
      var then = (p.next || []).map(function (s) { return bySlug[s]; }).filter(Boolean);
      var lead = viewed ? [] : [voice.viewLead];
      viewed = true;
      return {
        template: 'talk',
        says: lead.concat(p.says || []),
        next: { label: voice.then, items: then.map(function (o) { return { text: o.answers[0], pick: o.slug, said: true }; }) },
        invite: p.invite || voice.viewInvite   /* not "your version of this": there is no project to have a version of */
      };
    }

    /* About me or what I do (content/intents/): said as it is written, with the form when it asks for one. */
    function intent(p) {
      var then = (p.next || []).map(function (s) { return bySlug[s]; }).filter(Boolean);
      return {
        template: 'talk',
        says: p.says || [],
        form: p.form ? { text: '' } : null,
        next: then.length ? { label: voice.then, items: then.map(function (o) { return { text: (o.answers || [])[0] || o.title, pick: o.slug, said: true }; }) } : null,
        invite: p.form ? null : true
      };
    }

    /* One answer, whatever kind it is. `lead` is said first when the match is only the closest I have. */
    function answer(p, lead, why) {
      if (p.type === 'view') return view(p);
      if (p.type === 'intent') return intent(p);
      return project(p, lead, why);
    }

    /* Several projects fit: what I say first (one line or several), then a card each. */
    function choice(lines, list, link) {
      return { template: 'choice', says: [].concat(lines), cards: list.map(card), link: link || null };
    }

    /* A written line for things said to a person: hello, who are you, how does this work. */
    function talk(line, extra) {
      var reply = { template: 'talk', says: [line] };
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
      if (p.type === 'view' || p.type === 'intent') {
        return { title: p.title, meta: p.type === 'view' ? voice.viewCard : '', text: (p.answers || [])[0] || '', cta: voice.open, pick: p.slug };
      }
      var meta = [p.where, p.year || (p.type === 'note' ? p.date : '')].filter(Boolean).join(' · ');
      return { title: p.title, meta: meta, text: p.question || '', cta: voice.open, pick: p.slug };
    }

    /* Suggestions are written the way a visitor would ask them. `said` means: show it as their message.
       Of the questions a project answers, the one closest to the project just shown is offered. */
    function questions(list, label, from) {
      var used = {}, near = {};
      Match.terms([from.title].concat(from.keywords || [], from.answers || []).join(' ')).forEach(function (t) { near[t] = true; });
      function shared(a) { return Match.terms(a).filter(function (t) { return near[t]; }).length; }
      return { label: label, items: list.map(function (p) {
        var text = (p.answers || []).filter(function (a) { return !used[a]; })
          .reduce(function (best, a) { return best === null || shared(a) > shared(best) ? a : best; }, null) || p.question;
        used[text] = true;
        return { text: text, pick: p.slug, said: true };
      }) };
    }

    function topics(label) {
      return { label: label, items: site.themes.map(function (t) { return { text: t.label, theme: t.id, said: true }; }) };
    }

    /* The projects listed under a topic in site.json. */
    function inTopic(id) {
      var t = site.themes.filter(function (x) { return x.id === id; })[0];
      return (t ? t.pieces : []).map(function (s) { return bySlug[s]; }).filter(Boolean);
    }

    /* The other projects worth offering after this one: the close matches, then its neighbours in
       the topic the visitor is on, or else in the first of its own topics that has other projects.
       One topic, not every topic it touches: that is how suggestions wandered off the subject. */
    function related(p, close) {
      var list = close.filter(function (o) { return o !== p; });
      var here = [topic].concat(p.themes || []).filter(function (id) {
        var all = inTopic(id);
        return all.indexOf(p) !== -1 && all.length > 1;
      })[0];
      inTopic(here).forEach(function (o) { if (o !== p && list.indexOf(o) === -1) list.push(o); });
      return list;
    }

    /* "Why this one: you mentioned …" The visitor's own words, and only those that are keywords I
       gave this project. A keyword of several words ("making things up") counts when its words
       were said together, and is quoted together, never as loose everyday words. */
    function heard(text, p) {
      var keys = [p.title].concat(p.keywords || []).map(function (k) {
        return { terms: Match.terms(k), as: Match.fold(k), size: k.trim().split(/\s+/).length };
      }).filter(function (k) { return k.terms.length; });
      var words = [];
      text.split(/\s+/).forEach(function (raw, at) {
        var w = raw.replace(/^[^A-Za-z0-9À-ÿ]+|[^A-Za-z0-9À-ÿ]+$/g, '');
        var t = Match.terms(w)[0];
        if (t) words.push({ w: w, t: t, at: at });
      });
      var raw = text.split(/\s+/), out = [], used = {}, i = 0;
      while (i < words.length) {
        var n = 0, key = null;
        keys.forEach(function (k) {
          if (k.terms.length > n && k.terms.every(function (t, j) { return words[i + j] && words[i + j].t === t; })) { n = k.terms.length; key = k; }
        });
        if (!n) { i++; continue; }
        /* quoted as the visitor wrote it: the whole keyword when they said it whole ("making things up") */
        var whole = raw.slice(words[i].at, words[i].at + key.size).join(' ');
        var said = (Match.fold(whole) === key.as ? whole : raw.slice(words[i].at, words[i + n - 1].at + 1).join(' '))
          .replace(/^[^A-Za-z0-9À-ÿ]+|[^A-Za-z0-9À-ÿ]+$/g, '');
        if (!used[said.toLowerCase()]) { used[said.toLowerCase()] = true; out.push(said); }
        i += n;
      }
      return out.length ? voice.heard + ' ' + out.slice(0, 4).join(', ') + '.' : null;
    }

    function nothingLeft() { return talk(voice.noMore, { next: topics(voice.themesAgain) }); }

    /* ---------- what the visitor can do ---------- */

    /* They typed something. In order: a project asked for by name, a topic by name, talk,
       then a search through everything I can answer: by meaning when the model answered (`found`,
       see nlu.js), by keywords when it did not. */
    function ask(text, found) {
      var cmd = Match.command(text, pieces, focus);
      if (cmd) return traced(cmd.action === 'open' ? open(cmd.slug) : pick(cmd.slug), 'name', cmd.slug);

      var topic = site.themes.filter(function (t) { return Match.fold(t.label) === Match.fold(text); })[0];
      if (topic) return traced(theme(topic.id), 'topic', topic.id);

      var kind = Match.intent(text);
      if (kind) return traced(small(kind), 'talk', kind);

      if (found) return traced(byMeaning(text, found), 'meaning', found);
      return traced(byKeywords(text), 'keywords');
    }

    /* The keyword scores the meaning search adds a little weight to: { slug: score }. */
    function keywordScores(text) {
      var out = {};
      Match.search(index, text).filter(function (r) { return r.grounded; }).forEach(function (r) { out[r.piece.slug] = r.score; });
      return out;
    }

    function traced(reply, how, about) {
      reply.trace = { how: how };
      if (how === 'meaning') {
        reply.trace.verdict = about.verdict;
        reply.trace.targets = about.targets.map(function (t) { return t.slug; });
        reply.trace.score = Math.round(about.score * 1000) / 1000;
      } else if (about) reply.trace.targets = [about];
      return reply;
    }

    /* The decision from nlu.js, turned into a reply. An intent is only given when the page is sure:
       "the closest I have" makes sense for my work, not for my rates. */
    function byMeaning(text, found) {
      var list = found.targets.map(function (t) { return bySlug[t.slug]; }).filter(Boolean);
      if (found.verdict === 'none' || !list.length) return Match.wantsList(text) ? everything() : none(text);
      if (found.verdict === 'choice') {
        var shown = list.filter(function (p, i) { return i === 0 || p.type !== 'intent'; });
        if (shown.length > 1) return choice(voice.closeCall, shown);
        list = shown;
      }
      var top = list[0];
      if (top.type === 'intent' && found.verdict !== 'answer') return none(text);
      if (seen[top.slug] && top.type !== 'view' && top.type !== 'intent') {
        return talk(voice.seen.replace('{title}', top.title), { link: storyLink(top), invite: true });
      }
      return answer(top, found.verdict === 'maybe' ? site.partialIntro : null, heard(text, top));
    }

    /* Without the model: the keyword search, as before. */
    function byKeywords(text) {
      var v = Match.verdict(Match.search(index, text));
      if (v.kind === 'none') return Match.wantsList(text) ? everything() : none(text);
      var ok = v.results.filter(function (r) { return r.score >= Match.PARTIAL; });
      var top = ok[0];
      if (top.piece.type === 'view' || top.piece.type === 'intent') return answer(top.piece);
      ok = ok.filter(function (r) { return r.piece.type !== 'view' && r.piece.type !== 'intent'; }); /* never a card, nor a suggestion after a project */
      var others = ok.slice(1).map(function (r) { return r.piece; });

      /* Already shown in this visit: offer the next angle, or say it's still the best one. */
      if (seen[top.piece.slug]) {
        var alt = ok.filter(function (r) { return !seen[r.piece.slug]; })[0];
        if (alt) return project(alt.piece, voice.another, heard(text, alt.piece), others);
        return talk(voice.seen.replace('{title}', top.piece.title), { link: storyLink(top.piece), invite: true });
      }

      /* Several projects answer it about equally well: ask rather than pick. */
      var close = ok.filter(function (r) { return r.score >= Match.STRONG && r.score >= top.score * CLOSE && !seen[r.piece.slug]; });
      if (close.length > 1) return choice(voice.askBack, close.slice(0, 3).map(function (r) { return r.piece; }));

      return project(top.piece, v.kind === 'answer' ? null : site.partialIntro, heard(text, top.piece), others);
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
      if (!bySlug[slug]) return nothingLeft();
      return answer(bySlug[slug]);
    }

    /* "Open Senz", "show me" once it has been presented: say so, then go to its page. */
    function open(slug) {
      var p = bySlug[slug];
      focus = slug;
      return talk(voice.opening.replace('{title}', p.title), { go: p.url });
    }

    function theme(id) {
      var t = site.themes.filter(function (x) { return x.id === id; })[0];
      var list = inTopic(id);
      topic = id;
      var fresh = unseen(list);
      if (!list.length) return none(t ? t.label : '');
      /* A topic is a question too: my own short answer first, then the projects it comes from. */
      if (t.says && !told[id]) {
        told[id] = true;
        if (list.length === 1) focus = list[0].slug;      /* one project: "show me" means that one */
        return choice(t.says.concat(voice.fromWork), fresh.length ? fresh : list);
      }
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

    return { ask: ask, pick: pick, theme: theme, reset: reset, keywordScores: keywordScores };
  }

  var api = { create: create };
  if (node) module.exports = api;
  else root.Respond = api;
})(this);
