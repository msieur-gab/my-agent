/* Redaction: removes contact details, account numbers and likely names before anything leaves the page.
   Returns segments so the page can show the visitor exactly what will be sent, and let them restore a detail.
   Works in the browser (window.Redact) and in Node (module.exports) for tests. */
(function (root) {
  var LEGAL = 'GmbH(?: & Co\\.? KG)?|AG|SE|SA|S\\.A\\.|SAS|SARL|Ltd\\.?|Limited|Inc\\.?|LLC|B\\.?V\\.?|N\\.?V\\.?|AB|Oy|S\\.?p\\.?A\\.?|KG|PLC|plc';
  var NAME = "[A-ZÀ-Ý][a-zà-ÿ'’-]+";

  var RULES = [
    { kind: 'email',   re: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g },
    { kind: 'link',    re: /\b(?:https?:\/\/|www\.)[^\s]+/gi },
    { kind: 'account', re: /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,3})?\b/g },
    { kind: 'phone',   re: /(?:\+|\b00)?\d[\d\s().\/-]{6,}\d\b/g },
    { kind: 'company', re: new RegExp("\\b(?:[A-ZÀ-Ý0-9][\\w&.'’-]*\\s){1,3}(?:" + LEGAL + ")(?=[\\s,.;:!?)]|$)", 'g') },
    { kind: 'name',    re: new RegExp("\\b(?:I am|I'm|I’m|[Mm]y name is|[Tt]his is|[Ii]ch bin|[Jj]e suis|[Jj]e m'appelle)\\s+(" + NAME + "(?:\\s" + NAME + ")?)", 'g'), group: 1 },
    { kind: 'company', re: new RegExp("\\b(?:[Ww]ork(?:ing)? (?:at|for)|[Ww]e at|[Hh]ere at|[Oo]n behalf of|[Bb]ei|[Cc]hez)\\s+(" + NAME.replace("[a-zà-ÿ'’-]+", "[\\wà-ÿ&'’-]+") + "(?:\\s" + NAME.replace("[a-zà-ÿ'’-]+", "[\\wà-ÿ&'’-]+") + "){0,2})", 'g'), group: 1 }
  ];

  function redact(text) {
    var marks = [];
    RULES.forEach(function (rule) {
      rule.re.lastIndex = 0;
      var m;
      while ((m = rule.re.exec(text))) {
        var value = rule.group ? m[rule.group] : m[0];
        var start = m.index + (rule.group ? m[0].indexOf(value) : 0);
        var end = start + value.length;
        if (rule.kind === 'phone' && value.replace(/\D/g, '').length < 7) continue;
        var overlaps = marks.some(function (x) { return start < x.end && end > x.start; });
        if (!overlaps) marks.push({ start: start, end: end, kind: rule.kind, value: value });
        if (m[0].length === 0) rule.re.lastIndex++;
      }
    });
    marks.sort(function (a, b) { return a.start - b.start; });
    var segs = [], pos = 0;
    marks.forEach(function (x) {
      if (x.start > pos) segs.push({ text: text.slice(pos, x.start) });
      segs.push({ text: '[' + x.kind + ']', kind: x.kind, original: x.value });
      pos = x.end;
    });
    if (pos < text.length) segs.push({ text: text.slice(pos) });
    return segs;
  }

  function join(segs, restored) {
    return segs.map(function (s, i) { return s.kind && restored && restored[i] ? s.original : s.text; }).join('');
  }

  var api = { redact: redact, join: join };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Redact = api;
})(this);
