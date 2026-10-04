/* flow.js — hand-drawn flow diagrams, rendered client-side over their own source.
   Finds .flow-mount (emitted by build/enrich.py render_flow_block), parses the little
   `flow` DSL, runs a small layered (Sugiyama-lite) layout, and draws sketchy SVG in the
   cube's construction-drawing register — wobbly double strokes, seeded so the wobble is
   stable across reloads, DepartureMono labels. The <pre> source stays as the no-JS fallback.

   DSL:  first token line is the direction (LR|TB); `# ` line is the title (shown as the
   figure caption, not drawn); every other line is a chain of nodes joined by labelled edges:
       [<shape icon:name> Label] -> edge label -> [<shape> Label] -> ...
   A node's identity is its Label, so a label reused across lines is the same node (branches,
   merges, loops). Shapes: ellipse · roundrect · hexagon · diamond · database · (default) rect. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";

  // ── seeded RNG (mulberry32) + string hash → stable, per-shape wobble ─────
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(s) {
    var h = 2166136261, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function el(name, attrs) {
    var e = document.createElementNS(NS, name), k;
    if (attrs) for (k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  // ── parse the DSL → { title, nodes(Map label→node), edges[] } ────────────
  function parse(text) {
    var lines = text.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
    var title = "", nodes = new Map(), edges = [], order = { n: 0 };
    function node(raw) {
      var m = raw.match(/^\[(?:<([^>]*)>)?\s*([\s\S]*?)\]$/);
      if (!m) return null;
      var shape = "rect", icon = "";
      (m[1] || "").trim().split(/\s+/).filter(Boolean).forEach(function (tok) {
        if (tok.indexOf("icon:") === 0) icon = tok.slice(5); else shape = tok;
      });
      var label = m[2].trim().replace(/^"|"$/g, "");
      if (!nodes.has(label)) nodes.set(label, { label: label, shape: shape, icon: icon, i: order.n++ });
      else { var n = nodes.get(label); if (shape !== "rect") n.shape = shape; if (icon) n.icon = icon; }
      return label;
    }
    lines.forEach(function (line) {
      if (line[0] === "#") { title = line.replace(/^#+\s*/, ""); return; }
      var parts = line.split("->").map(function (s) { return s.trim(); }), prev = null, k;
      for (k = 0; k < parts.length; k += 2) {
        var lab = node(parts[k]);
        if (prev !== null && lab !== null) edges.push({ from: prev, to: lab, label: parts[k - 1] || "" });
        prev = lab;
      }
    });
    return { title: title, nodes: nodes, edges: edges };
  }

  // ── layered layout (longest-path ranking, cycle-safe) ────────────────────
  var LH = 42, CH = 7.8, PADX = 15, MINW = 66;   // node height, char advance (mono), padding, min width
  function layout(g, dir) {
    var nodes = Array.from(g.nodes.values());
    var rank = new Map(); nodes.forEach(function (n) { rank.set(n.label, 0); });
    for (var pass = 0; pass < nodes.length; pass++) {
      var changed = false;
      g.edges.forEach(function (e) {
        if (rank.get(e.to) < rank.get(e.from) + 1 && rank.get(e.from) + 1 <= nodes.length) {
          rank.set(e.to, rank.get(e.from) + 1); changed = true;   // bound breaks cycles
        }
      });
      if (!changed) break;
    }
    nodes.forEach(function (n) { n.w = Math.max(MINW, Math.round(n.label.length * CH) + PADX * 2); n.h = LH; });

    var byRank = new Map();
    nodes.forEach(function (n) {
      var r = rank.get(n.label);
      if (!byRank.has(r)) byRank.set(r, []);
      byRank.get(r).push(n);
    });
    byRank.forEach(function (l) { l.sort(function (a, b) { return a.i - b.i; }); });
    var ranks = Array.from(byRank.keys()).sort(function (a, b) { return a - b; });

    var GX = dir === "LR" ? 80 : 46, GY = dir === "LR" ? 34 : 72, M = 24;
    var primary = new Map(), cur = M;
    ranks.forEach(function (r) {
      primary.set(r, cur);
      var l = byRank.get(r);
      var step = dir === "LR" ? Math.max.apply(null, l.map(function (n) { return n.w; })) : LH;
      cur += step + (dir === "LR" ? GX : GY);
    });
    function span(r) {
      var l = byRank.get(r);
      return dir === "LR"
        ? l.reduce(function (s, n) { return s + n.h; }, 0) + GY * (l.length - 1)
        : l.reduce(function (s, n) { return s + n.w; }, 0) + GX * (l.length - 1);
    }
    var maxSpan = Math.max.apply(null, ranks.map(span));
    ranks.forEach(function (r) {
      var l = byRank.get(r), c = M + (maxSpan - span(r)) / 2;
      l.forEach(function (n) {
        if (dir === "LR") { n.x = primary.get(r); n.y = c; c += n.h + GY; }
        else { n.x = c; n.y = primary.get(r); c += n.w + GX; }
      });
    });
    var W = 0, H = 0;
    nodes.forEach(function (n) { W = Math.max(W, n.x + n.w); H = Math.max(H, n.y + n.h); });
    return { nodes: nodes, edges: g.edges, rank: rank, dir: dir, W: W + M, H: H + M };
  }

  // ── sketch primitives ────────────────────────────────────────────────────
  function subdivide(pts, close, per) {
    var out = [], n = pts.length, i, s;
    for (i = 0; i < (close ? n : n - 1); i++) {
      var a = pts[i], b = pts[(i + 1) % n];
      for (s = 0; s < per; s++) { var t = s / per; out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    if (!close) out.push(pts[n - 1]);
    return out;
  }
  function roughPath(pts, rnd, close, amp) {
    var d = "", i;
    for (i = 0; i < pts.length; i++) {
      var x = pts[i][0] + (rnd() * 2 - 1) * amp, y = pts[i][1] + (rnd() * 2 - 1) * amp;
      d += (i === 0 ? "M " : " L ") + x.toFixed(1) + " " + y.toFixed(1);
    }
    return d + (close ? " Z" : "");
  }
  // a filled, double-stroked hand-drawn outline for a closed shape
  function sketchShape(pts, rnd, cls) {
    var dense = subdivide(pts, true, 3), g = el("g", { "class": cls });
    g.appendChild(el("path", { d: roughPath(dense, rnd, true, 1.4), "class": "fl-fill" }));
    g.appendChild(el("path", { d: roughPath(dense, rnd, true, 1.6), "class": "fl-stroke" }));
    g.appendChild(el("path", { d: roughPath(dense, rnd, true, 2.0), "class": "fl-stroke fl-stroke2" }));
    return g;
  }
  function nodeOutline(n) {
    var x = n.x, y = n.y, w = n.w, h = n.h, a, t, pts = [];
    switch (n.shape) {
      case "ellipse": case "stadium":
        for (a = 0; a < 26; a++) { t = a / 26 * Math.PI * 2; pts.push([x + w / 2 + (w / 2) * Math.cos(t), y + h / 2 + (h / 2) * Math.sin(t)]); }
        return pts;
      case "diamond": return [[x + w / 2, y], [x + w, y + h / 2], [x + w / 2, y + h], [x, y + h / 2]];
      case "hexagon": var o = Math.min(16, w * 0.22);
        return [[x + o, y], [x + w - o, y], [x + w, y + h / 2], [x + w - o, y + h], [x + o, y + h], [x, y + h / 2]];
      default: return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];   // rect / roundrect / database
    }
  }

  // ── draw a node ──────────────────────────────────────────────────────────
  function drawNode(n) {
    var rnd = rng(hash("n:" + n.label)), g = el("g", { "class": "fl-node" });
    g.appendChild(sketchShape(nodeOutline(n), rnd, "sh-" + n.shape));
    if (n.shape === "database") {   // cylinder seam near the top
      var lip = subdivide([[n.x + 4, n.y + 9], [n.x + n.w - 4, n.y + 9]], false, 4);
      g.appendChild(el("path", { d: roughPath(lip, rnd, false, 1.2), "class": "fl-stroke" }));
    }
    var label = (n.icon ? "◦ " : "") + n.label;   // icon → a small mark prefix (glyphs are v-next)
    var t = el("text", { x: (n.x + n.w / 2).toFixed(1), y: (n.y + n.h / 2 + 4).toFixed(1),
                         "class": "fl-label", "text-anchor": "middle" });
    t.textContent = label;
    g.appendChild(t);
    return g;
  }

  // ── draw an edge (elbow-ish, wobbly, arrowhead + optional label) ─────────
  function drawEdge(e, nmap, dir) {
    var a = nmap.get(e.from), b = nmap.get(e.to);
    if (!a || !b) return null;
    var rnd = rng(hash("e:" + e.from + ">" + e.to + ":" + e.label));
    var p0, p1, back = false;
    if (dir === "LR") { p0 = [a.x + a.w, a.y + a.h / 2]; p1 = [b.x, b.y + b.h / 2]; back = b.x <= a.x; }
    else { p0 = [a.x + a.w / 2, a.y + a.h]; p1 = [b.x + b.w / 2, b.y]; back = b.y <= a.y; }
    var mid = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
    if (back) {   // bow a returning edge out to the side so it reads as a loop
      var off = dir === "LR" ? [0, 46] : [56, 0];
      mid = [mid[0] + off[0], mid[1] + off[1]];
    }
    var g = el("g", { "class": "fl-edge" });
    var line = subdivide([p0, mid, p1], false, 6);
    g.appendChild(el("path", { d: roughPath(line, rnd, false, back ? 2.2 : 1.4), "class": "fl-line" }));
    // arrowhead at p1, aimed along the incoming segment
    var from = line[line.length - 2] || p0;
    var ang = Math.atan2(p1[1] - from[1], p1[0] - from[0]), L = 11, sp = 0.42;
    g.appendChild(el("path", {
      d: roughPath([[p1[0] - L * Math.cos(ang - sp), p1[1] - L * Math.sin(ang - sp)], p1,
                    [p1[0] - L * Math.cos(ang + sp), p1[1] - L * Math.sin(ang + sp)]], rnd, false, 1.0),
      "class": "fl-line"
    }));
    if (e.label) {
      var lw = e.label.length * 6.2 + 10;
      g.appendChild(el("rect", { x: (mid[0] - lw / 2).toFixed(1), y: (mid[1] - 15).toFixed(1),
                                 width: lw.toFixed(1), height: "16", rx: "2", "class": "fl-elabel-bg" }));
      var lt = el("text", { x: mid[0].toFixed(1), y: (mid[1] - 3).toFixed(1), "class": "fl-elabel", "text-anchor": "middle" });
      lt.textContent = e.label;
      g.appendChild(lt);
    }
    return g;
  }

  // ── render one mount ─────────────────────────────────────────────────────
  function render(mount) {
    var pre = mount.querySelector(".flow-src");
    if (!pre || mount.classList.contains("fl-done")) return;
    var dir = (mount.getAttribute("data-flow-dir") || "TB").toUpperCase();
    var g = parse(pre.textContent);
    if (!g.nodes.size) return;
    var L = layout(g, dir);
    var svg = el("svg", { "class": "fl-svg", viewBox: "0 0 " + L.W + " " + L.H,
                          width: L.W, height: L.H, role: "img", preserveAspectRatio: "xMidYMid meet" });
    if (g.title) svg.setAttribute("aria-label", g.title);
    var nmap = new Map(); L.nodes.forEach(function (n) { nmap.set(n.label, n); });
    L.edges.forEach(function (e) { var x = drawEdge(e, nmap, dir); if (x) svg.appendChild(x); });   // edges under
    L.nodes.forEach(function (n) { svg.appendChild(drawNode(n)); });                                  // nodes over
    mount.insertBefore(svg, pre);
    mount.classList.add("fl-done");
  }

  function boot() { document.querySelectorAll(".flow-mount").forEach(render); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
