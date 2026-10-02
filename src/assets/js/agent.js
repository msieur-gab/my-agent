/* The home page conversation, wired together:
     match.js    understands what was typed (search, typos, small talk, commands)
     respond.js  decides the reply, as one of four templates
     chat.js     shows it, always in the same order
     send.js     the form that reaches me
   Nothing is generated; nothing is stored on the device. */
(function () {
  var dataEl = document.getElementById('answers');
  var thread = document.getElementById('thread');
  if (!dataEl || !thread || !window.Chat || !window.Respond) return;

  var data = JSON.parse(dataEl.textContent);
  var site = data.site;
  window.SITE_BASE = site.basePath || '';
  var brain = Respond.create(data);
  var lastSaid = ''; /* what the send form is filled with when the visitor accepts the invitation */

  /* Counting: at most once per visit, no identifier, nothing stored on the device. */
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

  var chat = Chat.create({
    thread: thread,
    form: document.getElementById('ask'),
    input: document.getElementById('q'),
    composer: document.getElementById('composer'),
    restart: document.getElementById('restart'),
    invite: site.softInvite,
    onAsk: function (text) {
      count('question', text);
      round(text, 'You asked', function () { return brain.ask(text); });
    },
    onChoice: choose,
    onForm: function (turn, text) { Send.open(turn, text, { email: site.email }); },
    onReset: brain.reset
  });

  function round(said, label, getReply) {
    if (said) lastSaid = said;
    chat.round(said, label, getReply);
  }

  /* Something was tapped: the invitation, a topic, a suggested question, or a project card.
     Topics and suggested questions are the visitor's words (item.said); a card is not. */
  function choose(item, turn) {
    if (item.invite) return Send.open(turn, lastSaid, { email: site.email, scroll: true });
    var said = item.said ? item.text : '';
    if (item.theme) {
      count('theme', item.theme);
      return round(said, 'You picked', function () { return brain.theme(item.theme); });
    }
    round(said, 'You picked', function () { return brain.pick(item.pick); });
  }

  /* The topic cards that open the conversation. */
  document.querySelectorAll('#themes .chip').forEach(function (chip) {
    chip.addEventListener('click', function (e) {
      e.preventDefault();
      choose({ text: chip.textContent, theme: chip.dataset.theme, said: true });
    });
  });

  /* Arriving from a project page: /?about=slug */
  var about = new URLSearchParams(location.search).get('about');
  if (about) choose({ pick: about });
})();
