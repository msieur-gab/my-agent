/* The conversation on the home page.
   Visitor asks or picks a theme → the page answers with one piece of work, the closest one,
   or invites them to send the question. Nothing is generated; nothing is stored on the device. */
(function () {
  var dataEl = document.getElementById('answers');
  var thread = document.getElementById('thread');
  var form = document.getElementById('ask');
  var input = document.getElementById('q');
  var themesEl = document.getElementById('themes');
  if (!dataEl || !thread || !form || !window.Match) return;

  var data = JSON.parse(dataEl.textContent);
  var site = data.site;
  var pieces = data.pieces;
  var bySlug = {};
  pieces.forEach(function (p) { bySlug[p.slug] = p; });
  var index = Match.prepare(pieces);
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lastQuestion = '';
  var lastNoMatch = -1;

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
    var turn = el('div', { class: 'turn' }, [
      el('p', { class: 'you' }, [el('span', { class: 'label', text: label || 'You asked' }), document.createTextNode(questionText)])
    ]);
    thread.appendChild(turn);
    restartLink();
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
      el('a', { class: 'follow', href: p.url, text: isNote ? 'Read the note →' : 'Follow the full story →' })
    ]);
  }

  function related(current, candidates) {
    var list = candidates.filter(function (p) { return p && p.slug !== current.slug; }).slice(0, 3);
    if (!list.length) return null;
    var box = el('div', { class: 'more' }, [el('p', { class: 'label', text: 'Also on this' })]);
    var chips = el('div', { class: 'themes' });
    list.forEach(function (p) {
      chips.appendChild(el('button', {
        type: 'button', class: 'chip', text: p.question,
        onclick: function () { showPiece(p, p.question, 'You picked'); }
      }));
    });
    box.appendChild(chips);
    return box;
  }

  function actions(turn) {
    var row = el('div', { class: 'actions' }, [
      el('button', { type: 'button', class: 'linkbtn', text: site.softInvite, onclick: function () { openSend(turn, lastQuestion, null); } }),
      el('button', { type: 'button', class: 'linkbtn', text: 'Ask something else', onclick: function () { input.focus(); scrollTo(form); } })
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

  function answer(turn, p, intro, relatedPool) {
    return say(intro, turn).then(function () { return wait(120); }).then(function () {
      var c = card(p);
      turn.appendChild(c);
      reveal(c);
      var r = related(p, relatedFor(p, relatedPool));
      if (r) turn.appendChild(r);
      turn.appendChild(actions(turn));
    });
  }

  function showPiece(p, questionText, label) {
    lastQuestion = questionText;
    var turn = newTurn(questionText, label);
    return answer(turn, p, p.intro || 'This is what I have on that.', []);
  }

  function ask(text) {
    text = text.trim();
    if (!text) return;
    lastQuestion = text;
    count('question', text);
    var turn = newTurn(text);
    var v = Match.verdict(Match.search(index, text));
    var others = v.results.slice(1).map(function (r) { return r.piece; });
    if (v.kind === 'answer') return answer(turn, v.results[0].piece, v.results[0].piece.intro, others);
    if (v.kind === 'partial') return answer(turn, v.results[0].piece, site.partialIntro, others);
    return noMatch(turn, text);
  }

  function noMatch(turn, text) {
    var i;
    do { i = Math.floor(Math.random() * site.noMatch.length); } while (site.noMatch.length > 1 && i === lastNoMatch);
    lastNoMatch = i;
    return say(site.noMatch[i], turn).then(function () { return wait(150); }).then(function () {
      openSend(turn, text, true);
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
        thread.textContent = '';
        themesEl.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
        input.value = '';
        input.focus();
        scrollTo(document.body);
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
      count('theme', theme.id);
      var list = theme.pieces.map(function (s) { return bySlug[s]; }).filter(Boolean);
      if (!list.length) return;
      lastQuestion = theme.label;
      var turn = newTurn(theme.label, 'You picked');
      answer(turn, list[0], list[0].intro, list.slice(1));
    });
  });

  /* Arriving from a project page: /?about=slug */
  var about = new URLSearchParams(location.search).get('about');
  if (about && bySlug[about]) {
    var p = bySlug[about];
    showPiece(p, 'Tell me about ' + p.title, 'You asked');
    setTimeout(function () { input.focus({ preventScroll: true }); }, 400);
  }
})();
