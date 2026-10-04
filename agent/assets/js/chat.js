/* Shows the conversation. It knows nothing about the content: it takes a reply as data
   (see respond.js) and shows every reply the same way, in this order:

     what the agent says → why → cards → form → link → what to do next → the invitation

   It also looks after the question field, which rests under the topic cards and is held at the
   bottom of the screen once the conversation is longer than the screen (CSS, position: sticky). */
(function () {
  /* Milliseconds. One place to tune how a reply feels. */
  var PACE = { word: 38, line: 120, go: 900 };

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

  /* o: { thread, form, input, composer, restart, invite,
          onAsk(text), onChoice(item, turn), onForm(turn, text), onReset() } */
  function create(o) {
    var thread = o.thread, composer = o.composer;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function wait(ms) { return new Promise(function (r) { setTimeout(r, reduce ? 0 : ms); }); }

    /* ---------- a round: the visitor's part, then the reply ---------- */

    var queue = Promise.resolve();

    /* `said` is what the visitor typed or tapped; empty when they tapped something without words.
       getReply() is called when its turn comes, so replies are worked out in the order they were asked. */
    function round(said, label, getReply) {
      queue = queue.then(function () {
        var t = turn(said, label);
        /* a reply can take a moment (the model reading the question): it is awaited, never skipped */
        return Promise.resolve(getReply()).then(function (reply) {
          return show(t, reply);
        });
      }).catch(function (e) { console.error(e); });
      return queue;
    }

    function turn(said, label) {
      /* Only words the visitor wrote or tapped are shown as theirs. */
      var t = el('div', { class: 'turn' }, [
        said ? el('p', { class: 'you' }, [el('span', { class: 'label', text: label }), document.createTextNode(said)]) : null
      ]);
      glide(function () { thread.appendChild(t); });
      t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      return t;
    }

    /* Every reply, whatever its template, is shown in the same order. */
    function show(t, reply) {
      return reply.says.reduce(function (chain, line) {
        return chain.then(function () { return say(line, t); }).then(function () { return wait(PACE.line); });
      }, Promise.resolve()).then(function () {
        if (reply.why) t.appendChild(el('p', { class: 'heard', text: reply.why }));
        if (reply.cards) t.appendChild(deck(reply.cards, t));
        if (reply.form) o.onForm(t, reply.form.text);
        if (reply.link) t.appendChild(el('a', { class: 'follow', href: reply.link.href, text: reply.link.text }));
        if (reply.next && reply.next.items.length) t.appendChild(suggestions(reply.next, t));
        /* the invitation to write to me: the usual words, or the reply's own */
        if (reply.invite) t.appendChild(button('linkbtn', { text: reply.invite === true ? o.invite : reply.invite, invite: true }, t));
        if (reply.go) return wait(PACE.go).then(function () { location.assign(reply.go); });
      });
    }

    /* Words appear one by one, like someone answering. Instant with reduced motion. */
    function say(text, parent) {
      var p = el('p', { class: 'say' });
      parent.appendChild(p);
      if (reduce) { p.textContent = text; return Promise.resolve(); }
      var words = text.split(' ').map(function (w) { return p.appendChild(el('span', { class: 'w', text: w + ' ' })); });
      return words.reduce(function (chain, w) {
        return chain.then(function () { w.classList.add('on'); return wait(PACE.word); });
      }, Promise.resolve());
    }

    /* A chip, a card or a quiet link: tapping it hands the item back, untouched. */
    function button(cls, item, t, children) {
      return el('button', { type: 'button', class: cls, text: children ? '' : item.text, onclick: function () { o.onChoice(item, t); } }, children);
    }

    function suggestions(next, t) {
      return el('div', { class: 'more' }, [
        next.label ? el('p', { class: 'label', text: next.label }) : null,
        el('div', { class: 'themes' }, next.items.map(function (item) { return button('chip', item, t); }))
      ]);
    }

    /* Cards side by side, swiped left and right. Arrows show when there is more than fits. */
    function deck(cards, t) {
      var row = el('div', { class: 'deck' }, cards.map(function (c) {
        return button('pick', c, t, [
          el('span', { class: 'pick-title', text: c.title }),
          el('span', { class: 'pick-where', text: c.meta }),
          el('span', { class: 'pick-q', text: c.text }),
          el('span', { class: 'pick-go', text: c.cta })
        ]);
      }));
      function move(dir) {
        row.scrollBy({ left: dir * (row.firstChild.offsetWidth + 12), behavior: reduce ? 'auto' : 'smooth' });
      }
      var prev = el('button', { type: 'button', class: 'deck-btn', 'aria-label': 'Previous', text: '←', onclick: function () { move(-1); } });
      var next = el('button', { type: 'button', class: 'deck-btn', 'aria-label': 'Next', text: '→', onclick: function () { move(1); } });
      var nav = el('div', { class: 'deck-nav' }, [prev, next]);
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

    /* ---------- the question field ---------- */

    /* When its place changes, it glides there instead of jumping. */
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

    o.form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = o.input.value.trim();
      o.input.value = '';
      if (text) o.onAsk(text);
    });

    /* Start over: the conversation fades, its section comes back to the top, the field glides up. */
    o.restart.addEventListener('click', function () {
      function clear() {
        glide(function () { thread.textContent = ''; thread.closest('section').scrollIntoView({ behavior: 'instant' }); });
        o.input.value = '';
        o.input.focus({ preventScroll: true });
        o.onReset();
      }
      queue = queue.then(function () {
        if (reduce || !thread.animate) return clear();
        return new Promise(function (done) {
          thread.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'ease' }).onfinish = function () { clear(); done(); };
        });
      });
    });

    /* The layout needs the real heights of the fixed header and the question field. */
    function track(node, name) {
      if (!node || !window.ResizeObserver) return;
      new ResizeObserver(function () {
        document.documentElement.style.setProperty(name, node.offsetHeight + 'px');
      }).observe(node);
    }
    track(document.querySelector('body > header'), '--top-h');
    track(composer, '--composer-h');

    return { round: round };
  }

  window.Chat = { create: create, el: el };
})();
