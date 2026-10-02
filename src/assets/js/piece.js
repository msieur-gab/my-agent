/* The split reader of a project or a note, after web-thecube's split-sync.js.
   On a wide screen the text scrolls beside a pane that holds the figures (site.css). As each
   figure's place in the text crosses the reading line, the pane shows that figure.
   Without JavaScript the pane keeps the first figure; on a narrow screen figures sit in the text. */
(function () {
  var pane = [].slice.call(document.querySelectorAll('#piece > aside figure'));
  var marks = [].slice.call(document.querySelectorAll('#piece > div figure'));
  var bar = document.querySelector('body > header');
  if (!pane.length) return;

  function update() {
    var line = bar.offsetHeight + window.innerHeight * 0.22, on = marks[0];
    marks.forEach(function (m) { if (m.getBoundingClientRect().top < line) on = m; });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) on = marks[marks.length - 1];
    pane.forEach(function (f) {
      var show = f.dataset.media === on.dataset.media, video = f.querySelector('video');
      f.toggleAttribute('data-on', show);
      if (video) { if (show) video.play().catch(function () {}); else video.pause(); }
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
