/* The form that sends a question to me, inside a turn of the conversation.
   Names and contact details are removed in the browser, and the visitor sees
   exactly what I'll receive before sending. */
(function () {
  var el = Chat.el;

  /* o: { email, scroll } */
  function open(turn, text, o) {
    o = o || {};
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
      fetch((window.SITE_BASE || '') + '/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
        .then(function (r) {
          if (!r.ok) throw new Error(r.status);
          box.textContent = '';
          box.appendChild(el('p', { class: 'status', text: 'Sent. I’ll reply to ' + mail.value + ' myself.' }));
        })
        .catch(function () {
          status.textContent = o.email
            ? 'This copy of the site can’t send messages. Write to ' + o.email + '.'
            : 'This copy of the site can’t send messages yet.';
        });
    });
    render();
    turn.appendChild(box);
    if (o.scroll) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  window.Send = { open: open };
})();
