"""Bar charts drawn at build time as static SVG, after web-thecube's enrich.py.

A chart is written in a text as a fenced block:

    ```chart-bar
    title: Voice vs. text
    description: What the figures mean and where they come from.

    Modality, Stress, Bonding
    Voice, 85, 72
    Text, 12, 8
    ```

The first column holds the categories, every other column is a series.
"""
import html
import math
import re

W, H, LEFT, RIGHT, BOTTOM = 680, 300, 54, 16, 42


def esc(s):
    return html.escape(str(s), quote=True)


def number(cell):
    """The leading number of a cell ('~25 ms' → 25, '' → None)."""
    m = re.search(r"-?\d+(?:\.\d+)?", cell.replace(",", "."))
    return float(m.group()) if m else None


def fmt(v):
    return str(int(v)) if float(v).is_integer() else f"{v:.1f}"


def nice_ceil(v):
    if v <= 0:
        return 1
    base = 10 ** math.floor(math.log10(v))
    return next((m * base for m in (1, 2, 2.5, 5, 10) if v <= m * base), 10 * base)


def parse(text):
    """Leading "key: value" lines are the title and description; the rest is comma-separated rows."""
    meta, rows = {}, []
    for line in filter(None, (l.strip() for l in text.splitlines())):
        m = re.match(r"^(\w+)\s*:\s*(.*)$", line)
        if not rows and m and "," not in line[: line.index(":")]:
            meta[m.group(1)] = m.group(2)
        else:
            rows.append(re.split(r"\s*,\s*", line))
    return meta, rows


def bar_svg(categories, series, names, title):
    s = len(series)
    top = (28 if title else 14) + (20 if s > 1 else 0)
    vmax = nice_ceil(max([v for ser in series for v in ser if v is not None] or [1]))
    plot, slot = H - top - BOTTOM, (W - LEFT - RIGHT) / len(categories)
    group = slot * 0.72
    bar = group / s

    def y(v):
        return top + plot * (1 - v / vmax)

    def fill(j):
        return "c-solo" if s == 1 else f"c-s{j % 6}"

    p = [f'<svg class="chart" viewBox="0 0 {W} {H}" role="img" aria-label="{esc(title)}">']
    if title:
        p.append(f'<text class="c-title" x="{LEFT}" y="14">{esc(title)}</text>')
    x = LEFT
    for j, name in enumerate(names if s > 1 else []):                    # the legend
        p.append(f'<rect class="{fill(j)}" x="{x:.0f}" y="{(26 if title else 12) - 8}" width="10" height="10"/>')
        p.append(f'<text class="c-leg" x="{x + 14:.0f}" y="{(26 if title else 12) + 1}">{esc(name)}</text>')
        x += 16 + 7.6 * (len(name) + 2)
    for k in range(5):                                                   # the value axis
        v = vmax * k / 4
        p.append(f'<line class="c-grid" x1="{LEFT}" y1="{y(v):.1f}" x2="{W - RIGHT}" y2="{y(v):.1f}"/>')
        p.append(f'<text class="c-tick" x="{LEFT - 8}" y="{y(v) + 3:.1f}">{fmt(v)}</text>')
    p.append(f'<line class="c-axis" x1="{LEFT}" y1="{y(0):.1f}" x2="{W - RIGHT}" y2="{y(0):.1f}"/>')
    for i, cat in enumerate(categories):
        gx = LEFT + slot * i + (slot - group) / 2
        for j, ser in enumerate(series):
            v, bx = ser[i], gx + bar * j
            if v is None:
                continue
            p.append(f'<rect class="{fill(j)}" x="{bx + 1:.1f}" y="{y(v):.1f}" width="{bar - 2:.1f}" height="{y(0) - y(v):.1f}"/>')
            if s == 1:
                p.append(f'<text class="c-val" x="{bx + bar / 2:.1f}" y="{y(v) - 6:.1f}">{fmt(v)}</text>')
        p.append(f'<text class="c-lbl" x="{LEFT + slot * i + slot / 2:.1f}" y="{H - BOTTOM + 16:.1f}">{esc(cat)}</text>')
    return "".join(p) + "</svg>"


def figure(text):
    """A chart-bar block → a figure: the chart, and its description as the caption."""
    meta, rows = parse(text)
    if len(rows) < 2:
        return f"<pre><code>{esc(text)}</code></pre>"
    header, rows = rows[0], rows[1:]
    series = [[number(r[j]) if j < len(r) else None for r in rows] for j in range(1, len(header))]
    svg = bar_svg([r[0] for r in rows], series, header[1:], meta.get("title", ""))
    return f'<figure>{svg}<figcaption>{esc(meta.get("description", meta.get("title", "")))}</figcaption></figure>'
