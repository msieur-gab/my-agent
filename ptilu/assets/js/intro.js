/* The intro: its lines show one after another, in the same place, and end on the question
   that leads to the topic cards. Tap the text to move on, or a mark below it to go back.
   Without JavaScript, or with reduced motion, the lines simply stack (see site.css). */
(function () {
  var intro = document.getElementById('intro');
  var stage = document.getElementById('stage');
  if (!intro || !stage || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* Reading time for a line, in milliseconds: a base, plus a little per character. */
  var BASE = 850, PER_CHAR = 38;

  var lines = [].slice.call(stage.children);
  var last = lines.length - 1;
  var at = -1, timer;

  var steps = document.createElement('div');
  steps.className = 'steps';
  var marks = lines.map(function (line, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'Line ' + (i + 1) + ' of ' + lines.length);
    b.addEventListener('click', function () { go(i); });
    return steps.appendChild(b);
  });
  stage.parentNode.insertBefore(steps, stage.nextSibling);

  function go(i) {
    clearTimeout(timer);
    at = Math.min(i, last);
    lines.forEach(function (line, n) {
      line.classList.toggle('is-on', n === at);
      line.classList.toggle('was-on', n < at);
    });
    marks.forEach(function (m, n) { m.classList.toggle('is-on', n === at); });
    if (at === last) { intro.classList.add('done'); return; }
    timer = setTimeout(function () { go(at + 1); }, BASE + PER_CHAR * lines[at].textContent.length);
  }

  stage.addEventListener('click', function () { if (at < last) go(at + 1); });

  /* Arriving from a project page with a question already asked: no intro to sit through. */
  go(new URLSearchParams(location.search).has('about') ? last : 0);

  window.Intro = { finish: function () { go(last); } };
})();
