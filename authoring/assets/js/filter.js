/* Filters the work list by theme or context. The full list is plain HTML without it. */
(function () {
  var bar = document.getElementById('filters');
  var list = document.getElementById('list');
  if (!bar || !list) return;
  bar.addEventListener('click', function (e) {
    var b = e.target.closest('[data-filter]');
    if (!b) return;
    var f = b.dataset.filter;
    bar.querySelectorAll('[data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    list.querySelectorAll('li').forEach(function (li) {
      li.hidden = f !== 'all' && (' ' + li.dataset.tags + ' ').indexOf(' ' + f + ' ') === -1;
    });
  });
})();
