/* The home page conversation, wired together:
     match.js    understands what was typed by its words (typos, small talk, commands, keyword search)
     nlu.js      understands it by meaning, with a small model in the visitor's browser
     respond.js  decides the reply, as one of four templates
     chat.js     shows it, always in the same order
     send.js     the form that reaches me
     intro.js    the opening lines
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
    intro: document.getElementById('intro'),
    restart: document.getElementById('restart'),
    invite: site.softInvite,
    onAsk: function (text) {
      count('question', text);
      /* By meaning when the model is there; by keywords when it is not (not loaded in time, or no support). */
      round(text, 'You asked', function () {
        if (!window.Nlu) return brain.ask(text);
        return Nlu.find(text).then(function (found) { return brain.ask(text, found); });
      });
    },
    onChoice: choose,
    onForm: function (turn, text) { Send.open(turn, text, { email: site.email }); },
    onReset: brain.reset
  });

  function round(said, label, getReply) {
    if (window.Intro) Intro.finish(); /* asking ends the intro */
    if (said) lastSaid = said;
    chat.round(said, label, getReply);
  }

  /* Something was tapped: the invitation, a topic, a suggested question, or a project card.
     Topics and suggested questions are the visitor's words (item.said); a card is not. */
  function choose(item, turn) {
    if (item.invite) return Send.open(turn, lastSaid, { email: site.email, scroll: true });
    var said = item.said ? item.text : '';
    if (item.listed) {
      /* one of my listed questions: its paragraph is in the prepared index, no model needed */
      return round(said, 'You picked', function () {
        return Nlu.index().then(function (nlu) { return brain.listed(item.listed.slug, item.listed.q, nlu); },
          function () { return brain.pick(item.listed.slug); });
      });
    }
    if (item.theme) {
      count('theme', item.theme);
      return round(said, 'You picked', function () { return brain.theme(item.theme); });
    }
    round(said, 'You picked', function () { return brain.pick(item.pick); });
  }

  /* The model starts loading when the visitor shows they are about to ask, never on page load. */
  var field = document.getElementById('q');
  if (window.Nlu && field) field.addEventListener('focus', function () { Nlu.warm().catch(function () {}); }, { once: true });

  /* The topic cards under the intro. */
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
