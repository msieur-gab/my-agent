/* The conversation on the home page.
   Visitor asks or picks a theme → the page answers with one piece of work, the closest one,
   or invites them to send the question. Nothing is generated; nothing is stored on the device. */
(function () {
  var dataEl = document.getElementById('answers');
  var thread = document.getElementById('thread');
  var form = document.getElementById('ask');
  var input = document.getElementById('q');
  var themesEl = document.getElementById('themes');
  var composer = document.getElementById('composer');
  var intro = document.querySelector('.open');
  if (!dataEl || !thread || !form || !window.Match) return;

  var data = JSON.parse(dataEl.textContent);
  var site = data.site;
  var pieces = data.pieces;
  var bySlug = {};
  pieces.forEach(function (p) { bySlug[p.slug] = p; });
  var index = Match.prepare(pieces);
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var voice = site.voice;
  var lastQuestion = '';
  var lastNoMatch = -1;
  var CLOSE = 0.8; /* a second piece within 80% of the best one is a close call */
  /* Memory for this visit only, kept in the page: what was already shown, and what else was close. */
  var seen = {};
  var lastPool = [];
  var focus = null; /* the project the conversation is on, so "this one" or "open it" mean something */

  /* ---------- small helpers ---------- */

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, reduce ? 0 : ms); }); }

  function scrollTo(node) {
    node.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  /* Words appear one by one, like someone answering. Instant with reduced motion. */
  function say(text, parent) {
    var p = el('p', { class: 'say' });
    parent.appendChild(p);
    if (reduce) { p.textContent = text; return Promise.resolve(p); }
    var words = text.split(' ');
    words.forEach(function (w, i) {
      p.appendChild(el('span', { class: 'w', text: w + (i < words.length - 1 ? ' ' : '') }));
    });
    var spans = p.querySelectorAll('.w');
    return new Promise(function (resolve) {
      var i = 0;
      (function next() {
        if (i >= spans.length) return resolve(p);
        spans[i++].classList.add('on');
        setTimeout(next, 38);
      })();
    });
  }

  function reveal(node) {
    requestAnimationFrame(function () { requestAnimationFrame(function () { node.classList.add('on'); }); });
  }

  /* The question field sticks to the bottom of the screen as the conversation grows (CSS).
     When its place changes, it glides there instead of jumping. */
  function glide(change) {
    var before = composer.getBoundingClientRect().top;
    change();
    var delta = before - composer.getBoundingClientRect().top;
    if (reduce || !delta || !composer.animate) return;
    composer.animate(
      [{ transform: 'translateY(' + delta + 'px)' }, { transform: 'none' }],
      { duration: 520, easing: 'cubic-bezier(.2, .8, .2, 1)' }
    );
  }

  /* The layout needs the real heights of the fixed header and the question field. */
  function track(node, name) {
    if (!node || !window.ResizeObserver) return;
    new ResizeObserver(function () {
      document.documentElement.style.setProperty(name, node.offsetHeight + 'px');
    }).observe(node);
  }
  track(document.querySelector('.top'), '--top-h');
  track(composer, '--composer-h');

  /* ---------- counting: at most once per visit, no identifier, nothing stored on the device ---------- */

  var counted = {};
  function count(kind, value) {
    var key = kind + ':' + value;
    if (counted[key]) return;
    counted[key] = true;
    if (!site.countEndpoint) return;
    var text = kind === 'question' ? Redact.join(Redact.redact(value)) : value;
    try {
      navigator.sendBeacon(site.countEndpoint, new Blob([JSON.stringify({ kind: kind, value: text })], { type: 'application/json' }));
    } catch (e) { /* counting is optional */ }
  }

  /* ---------- turns ---------- */

  function newTurn(questionText, label) {
    /* Only words the visitor wrote or tapped are shown as theirs. No text: no bubble. */
    var turn = el('div', { class: 'turn' }, [
      questionText ? el('p', { class: 'you' }, [el('span', { class: 'label', text: label || 'You asked' }), document.createTextNode(questionText)]) : null
    ]);
    if (window.Intro) Intro.finish(); /* asking ends the intro: the cards are there to pick from */
    glide(function () {
      thread.appendChild(turn);
      restartLink();
    });
    scrollTo(turn);
    return turn;
  }

  function card(p) {
    var isNote = p.type === 'note';
    var where = [p.where, p.year || (isNote ? p.date : '')].filter(Boolean).join(' · ');
    return el('div', { class: 'card' }, [
      el('p', { class: 'where', text: (isNote ? 'Note · ' : '') + p.title + (where ? ' · ' + where : '') }),
      el('div', { class: 'step' }, [el('span', { class: 'label', text: isNote ? 'The common view' : 'The brief' }), el('p', { class: 'brief', text: p.brief ? '“' + p.brief + '”' : '' })]),
      el('div', { class: 'step' }, [el('span', { class: 'label', text: 'The question nobody asked' }), el('p', { class: 'q', text: p.question || '' })]),
      el('div', { class: 'step' }, [el('span', { class: 'label', text: 'The answer' }), el('p', { class: 'a', text: p.answer || '' })]),
      el('a', { class: 'follow', href: p.url, text: isNote ? 'Read the note →' : 'Read the full story →' })
    ]);
  }

  function unseen(list) {
    return list.filter(function (p) { return p && !seen[p.slug]; });
  }

  /* Choices are written the way a visitor would ask them, not as my reframed question. */
  function options(list, label) {
    if (!list.length) return null;
    var box = el('div', { class: 'more' }, [label ? el('p', { class: 'label', text: label }) : null]);
    var chips = el('div', { class: 'themes' });
    var used = {};
    list.forEach(function (p) {
      var text = (p.answers || []).filter(function (a) { return !used[a]; })[0] || p.question;
      used[text] = true;
      chips.appendChild(el('button', {
        type: 'button', class: 'chip', text: text,
        onclick: function () { showPiece(p, text, 'You picked'); }
      }));
    });
    box.appendChild(chips);
    return box;
  }

  function themeOptions(label) {
    var box = el('div', { class: 'more' }, [label ? el('p', { class: 'label', text: label }) : null]);
    var chips = el('div', { class: 'themes' });
    site.themes.forEach(function (t) {
      chips.appendChild(el('button', { type: 'button', class: 'chip', text: t.label, onclick: function () { pickTheme(t); } }));
    });
    box.appendChild(chips);
    return box;
  }

  function related(current, candidates) {
    return options(unseen(candidates).filter(function (p) { return p.slug !== current.slug; }).slice(0, 3), 'Also on this');
  }

  /* "Why this one: you mentioned …" The visitor's own words that led to this piece. */
  function heard(text, matched) {
    if (!text || !matched || !matched.length) return null;
    var words = [], used = {};
    text.split(/\s+/).forEach(function (raw) {
      var w = raw.replace(/^[^A-Za-z0-9À-ÿ]+|[^A-Za-z0-9À-ÿ]+$/g, '');
      var t = Match.terms(w)[0];
      if (t && matched.indexOf(t) !== -1 && !used[t]) { used[t] = true; words.push(w); }
    });
    if (!words.length) return null;
    return el('p', { class: 'heard' }, [
      document.createTextNode(voice.heard + ' '),
      el('span', { class: 'kw', text: words.slice(0, 4).join(', ') }),
      document.createTextNode('.')
    ]);
  }

  function actions(turn) {
    var row = el('div', { class: 'actions' }, [
      el('button', { type: 'button', class: 'linkbtn', text: site.softInvite, onclick: function () { openSend(turn, lastQuestion, null); } }),
      el('button', { type: 'button', class: 'linkbtn', text: 'Ask something else', onclick: function () { input.focus(); } })
    ]);
    return row;
  }

  function relatedFor(p, extra) {
    var pool = (extra || []).slice();
    (p.themes || []).forEach(function (t) {
      pieces.forEach(function (o) { if (o.themes && o.themes.indexOf(t) !== -1 && pool.indexOf(o) === -1) pool.push(o); });
    });
    return pool;
  }

  function answer(turn, p, intro, relatedPool, why) {
    seen[p.slug] = true;
    focus = p.slug;
    lastPool = relatedFor(p, relatedPool);
    return say(intro, turn).then(function () { return wait(120); }).then(function () {
      if (why) { turn.appendChild(why); reveal(why); }
      var c = card(p);
      turn.appendChild(c);
      reveal(c);
      var r = related(p, lastPool);
      if (r) turn.appendChild(r);
      turn.appendChild(actions(turn));
    });
  }

  function showPiece(p, questionText, label) {
    lastQuestion = questionText;
    var turn = newTurn(questionText, label);
    return answer(turn, p, p.intro || voice.fallbackIntro, []);
  }

  /* A broad theme or a close call: ask which one is theirs instead of guessing. */
  function askBack(turn, list) {
    return say(voice.askBack, turn).then(function () { return wait(120); }).then(function () {
      turn.appendChild(deck(list));
    });
  }

  /* What a visitor can do with a project, whether they tap or type:
       about  the short reply (tapping a card, "tell me about Senz", "Senz")
       open   its full story  (tapping the link, "open Senz", "show me this project")
     Taps come with no words of their own; typed sentences bring their turn with them. */
  var act = {
    about: function (p, turn) {
      turn = turn || newTurn('');
      lastQuestion = lastQuestion || p.title;
      seen[p.slug] = true;
      focus = p.slug;
      lastPool = relatedFor(p, []);
      return say(aboutLine(p), turn).then(function () {
        turn.appendChild(el('a', { class: 'follow', href: p.url, text: p.type === 'note' ? 'Read the note →' : 'Read the full story →' }));
        turn.appendChild(actions(turn));
      });
    },
    open: function (p, turn) {
      focus = p.slug;
      return say(voice.opening.replace('{title}', p.title), turn || newTurn('')).then(function () { return wait(900); }).then(function () {
        location.assign(p.url);
      });
    }
  };

  /* "Brainboard is about a thinking canvas…": the piece's own `about` line if it has one, else its answer. */
  function aboutLine(p) {
    var rest = p.about ? p.about.replace(/\.$/, '') + '.' : (p.answer || '').replace(/^(A|An|The) /, function (m) { return m.toLowerCase(); });
    return voice.aboutLead.replace('{title}', p.title).replace('{about}', rest);
  }

  /* Several pieces to choose from: one card each, side by side, swiped left and right. */
  function deck(list) {
    var row = el('div', { class: 'deck', tabindex: '-1' }, list.map(function (p) {
      var where = [p.where, p.year || (p.type === 'note' ? p.date : '')].filter(Boolean).join(' · ');
      var card = el('button', { type: 'button', class: 'pick', 'aria-pressed': 'false' }, [
        el('span', { class: 'pick-title', text: p.title }),
        el('span', { class: 'pick-where', text: where }),
        el('span', { class: 'pick-q', text: p.question || '' }),
        el('span', { class: 'pick-go', text: voice.open })
      ]);
      card.addEventListener('click', function () {
        row.querySelectorAll('.pick').forEach(function (c) { c.setAttribute('aria-pressed', c === card ? 'true' : 'false'); });
        act.about(p);
      });
      return card;
    }));
    function move(dir) {
      var step = row.firstChild.getBoundingClientRect().width + 12;
      row.scrollBy({ left: dir * step, behavior: reduce ? 'auto' : 'smooth' });
    }
    var prev = el('button', { type: 'button', class: 'deck-btn', 'aria-label': 'Previous', text: '←', onclick: function () { move(-1); } });
    var next = el('button', { type: 'button', class: 'deck-btn', 'aria-label': 'Next', text: '→', onclick: function () { move(1); } });
    var nav = el('div', { class: 'deck-nav' }, [prev, next]);
    /* The arrows only show when there is more than fits, and dim at each end. */
    function update() {
      var more = row.scrollWidth - row.clientWidth;
      nav.hidden = more < 8;
      prev.disabled = row.scrollLeft < 8;
      next.disabled = row.scrollLeft > more - 8;
    }
    row.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    requestAnimationFrame(update);
    return el('div', { class: 'deck-wrap' }, [row, nav]);
  }

  function pickTheme(t) {
    lastQuestion = t.label;
    return theme(t, newTurn(t.label, 'You picked'));
  }

  function theme(theme, turn) {
    count('theme', theme.id);
    var list = theme.pieces.map(function (s) { return bySlug[s]; }).filter(Boolean);
    var fresh = unseen(list);
    if (!list.length) return noMatch(turn, theme.label);
    if (list.length === 1) return answer(turn, list[0], list[0].intro, []);
    if (fresh.length === 1) return answer(turn, fresh[0], fresh[0].intro, list);
    if (!fresh.length) return say(voice.noMore, turn).then(function () { turn.appendChild(themeOptions(voice.themesAgain)); });
    return askBack(turn, fresh);
  }

  /* Things said to a person rather than asked about the work. Replies are written, not generated. */
  function small(turn, kind) {
    if (kind === 'more') {
      var next = unseen(lastPool)[0];
      if (next) return answer(turn, next, voice.another, lastPool);
      return say(voice.noMore, turn).then(function () { turn.appendChild(themeOptions(voice.themesAgain)); });
    }
    return say(site.smalltalk[kind], turn).then(function () { return wait(120); }).then(function () {
      if (kind === 'contact') return openSend(turn, '', true);
      if (kind === 'how') turn.appendChild(el('a', { class: 'follow', href: '/how-this-site-works/', text: 'How this site works →' }));
      if (kind !== 'thanks') turn.appendChild(themeOptions());
    });
  }

  function ask(text) {
    text = text.trim();
    if (!text) return;
    lastQuestion = text;
    count('question', text);
    var turn = newTurn(text);
    var cmd = Match.command(text, pieces, focus);
    if (cmd) return act[cmd.action](bySlug[cmd.slug], turn);
    var named = site.themes.filter(function (t) { return Match.fold(t.label) === Match.fold(text); })[0];
    if (named) return theme(named, turn);
    var kind = Match.intent(text);
    if (kind) return small(turn, kind);
    var v = Match.verdict(Match.search(index, text));
    if (v.kind === 'none') return noMatch(turn, text);
    var ok = v.results.filter(function (r) { return r.score >= Match.PARTIAL; });
    var top = ok[0];
    var others = ok.slice(1).map(function (r) { return r.piece; });

    /* Already shown in this visit: offer the next angle, or say it's still the best one. */
    if (seen[top.piece.slug]) {
      var alt = ok.filter(function (r) { return !seen[r.piece.slug]; })[0];
      if (alt) return answer(turn, alt.piece, voice.another, others, heard(text, alt.matched));
      return say(voice.seen.replace('{title}', top.piece.title), turn).then(function () {
        turn.appendChild(el('a', { class: 'follow', href: top.piece.url, text: 'Read the full story →' }));
        turn.appendChild(actions(turn));
      });
    }

    /* Several pieces answer it about equally well: ask rather than pick. */
    var close = ok.filter(function (r) { return r.score >= Match.STRONG && r.score >= top.score * CLOSE && !seen[r.piece.slug]; });
    if (close.length > 1) return askBack(turn, close.slice(0, 3).map(function (r) { return r.piece; }));

    return answer(turn, top.piece, v.kind === 'answer' ? top.piece.intro : site.partialIntro, others, heard(text, top.matched));
  }

  function noMatch(turn, text) {
    var i;
    do { i = Math.floor(Math.random() * site.noMatch.length); } while (site.noMatch.length > 1 && i === lastNoMatch);
    lastNoMatch = i;
    return say(site.noMatch[i], turn).then(function () { return wait(150); }).then(function () {
      openSend(turn, text, true);
      turn.appendChild(themeOptions(voice.themesAgain));
    });
  }

  /* ---------- sending a question to me ---------- */

  function openSend(turn, text, fromNoMatch) {
    var existing = turn.querySelector('.send');
    if (existing) { existing.querySelector('textarea').focus(); return; }
    var id = 'send-' + Date.now();
    var restored = {};
    var segs = [];
    var ta = el('textarea', { id: id + '-q', rows: '3' });
    ta.value = text || '';
    var preview = el('p', { class: 'preview', 'aria-live': 'polite' });
    var mail = el('input', { id: id + '-m', type: 'email', autocomplete: 'email', required: 'required' });
    var status = el('p', { class: 'status' });

    function render() {
      segs = Redact.redact(ta.value);
      preview.textContent = '';
      segs.forEach(function (s, i) {
        if (!s.kind) { preview.appendChild(document.createTextNode(s.text)); return; }
        var on = !!restored[i];
        preview.appendChild(el('button', {
          type: 'button', class: 'redacted', 'aria-pressed': on ? 'true' : 'false',
          title: on ? 'Hide this again' : 'Show this detail to Gabriel',
          text: on ? s.original : s.text,
          onclick: function () { restored[i] = !restored[i]; render(); }
        }));
      });
      if (!ta.value.trim()) preview.textContent = 'Your question will appear here.';
    }
    ta.addEventListener('input', function () { restored = {}; render(); });

    var box = el('form', { class: 'send', novalidate: 'novalidate' }, [
      el('div', {}, [el('label', { for: id + '-q', text: 'Your question' }), ta]),
      el('div', {}, [el('span', { class: 'label', text: 'This is exactly what I’ll receive' }), preview]),
      el('p', { class: 'hint', text: 'Names and contact details are removed automatically. Tap a hidden detail to include it. Check before sending, the removal can miss things.' }),
      el('div', {}, [el('label', { for: id + '-m', text: 'Your email, so I can reply' }), mail]),
      el('button', { type: 'submit', class: 'btn', text: 'Send it to me' }),
      status
    ]);
    box.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = Redact.join(segs, restored).trim();
      if (!q) { status.textContent = 'Write your question first.'; ta.focus(); return; }
      if (!mail.value || !mail.checkValidity()) { status.textContent = 'Add an email address so I can reply.'; mail.focus(); return; }
      var body = new URLSearchParams({ 'form-name': 'question', question: q, email: mail.value }).toString();
      status.textContent = 'Sending…';
      fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
        .then(function (r) {
          if (!r.ok) throw new Error(r.status);
          box.textContent = '';
          box.appendChild(el('p', { class: 'status', text: 'Sent. I’ll reply to ' + mail.value + ' myself.' }));
        })
        .catch(function () {
          status.textContent = site.email
            ? 'This copy of the site can’t send messages. Write to ' + site.email + '.'
            : 'This copy of the site can’t send messages yet.';
        });
    });
    render();
    turn.appendChild(box);
    reveal(box);
    if (!fromNoMatch) scrollTo(box);
  }

  /* ---------- start over ---------- */

  function restartLink() {
    if (document.getElementById('restart')) return;
    var wrap = el('div', { id: 'restart', class: 'col' });
    var b = el('button', {
      type: 'button', class: 'linkbtn restart', text: 'Start over',
      onclick: function () {
        seen = {};
        lastPool = [];
        focus = null;
        themesEl.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
        input.value = '';
        /* The conversation fades, then the intro comes back and the field glides up to it. */
        function clear() {
          glide(function () { thread.textContent = ''; window.scrollTo({ top: 0, behavior: 'instant' }); });
          if (!reduce && intro.animate) intro.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: 'ease' });
          input.focus({ preventScroll: true });
        }
        if (reduce || !thread.animate) return clear();
        thread.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'ease' }).onfinish = clear;
      }
    });
    wrap.appendChild(b);
    thread.parentNode.insertBefore(wrap, thread.nextSibling);
    var obs = new MutationObserver(function () { if (!thread.children.length && wrap.parentNode) { wrap.remove(); obs.disconnect(); } });
    obs.observe(thread, { childList: true });
  }

  /* ---------- wiring ---------- */

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value;
    input.value = '';
    themesEl.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
    ask(text);
  });

  themesEl.querySelectorAll('.chip').forEach(function (chip) {
    chip.addEventListener('click', function (e) {
      e.preventDefault();
      var theme = site.themes.filter(function (t) { return t.id === chip.dataset.theme; })[0];
      if (!theme) return;
      themesEl.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
      pickTheme(theme);
    });
  });

  /* Arriving from a project page: /?about=slug */
  var about = new URLSearchParams(location.search).get('about');
  if (about && bySlug[about]) {
    var p = bySlug[about];
    act.about(p);
    setTimeout(function () { input.focus({ preventScroll: true }); }, 400);
  }
})();
