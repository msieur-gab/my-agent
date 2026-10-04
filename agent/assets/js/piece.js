/* The split reader of a project or a note, after web-thecube's split-sync.js.
   On a wide screen the text scrolls beside a pane that holds the figures (site.css).
   A figure belongs to a stretch of the text: from the paragraph just before its place, which
   introduces it, to the next figure's stretch. The pane shows the figure whose stretch holds
   the middle of the screen. That depends only on where the page is, not on the direction of
   the scroll, so reading down and reading back up show the same figure beside the same text.
   Without JavaScript the pane keeps the first figure; on a narrow screen figures sit in the text. */
(function () {
  var pane = [].slice.call(document.querySelectorAll('#piece > aside figure'));
  var marks = [].slice.call(document.querySelectorAll('#piece > div figure'));
  if (!pane.length) return;

  function update() {
    var middle = window.innerHeight / 2, on = marks[0];
    marks.forEach(function (m) {
      if ((m.previousElementSibling || m).getBoundingClientRect().top < middle) on = m;
    });
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
