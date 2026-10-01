#!/usr/bin/env python3
"""Build the site into public/.

No dependencies. Reads content/ (site.json, work/*.md, notes/*.md, pages/*.md),
writes static, crawlable HTML plus answers.json, sitemap.xml, robots.txt and llms.txt.

    python3 build/build.py
"""
import html
import json
import os
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
SRC = ROOT / "src"
OUT = ROOT / "public"


# ---------------------------------------------------------------- parsing

def parse_value(raw):
    raw = raw.strip()
    if raw.startswith("[") and raw.endswith("]"):
        inner = raw[1:-1].strip()
        return [unquote(x) for x in inner.split(",") if x.strip()] if inner else []
    if raw in ("true", "false"):
        return raw == "true"
    return unquote(raw)


def unquote(s):
    s = s.strip()
    if len(s) >= 2 and s[0] == s[-1] and s[0] in "\"'":
        return s[1:-1]
    return s


def parse_frontmatter(text):
    """Small YAML subset: `key: value`, `key: [a, b]`, `key:` followed by `  - item` lines,
    and `questions:` followed by `  - q: …` entries with indented `see:` / `a:` lines under each."""
    meta, body = {}, text
    if text.startswith("---"):
        end = text.find("\n---", 3)
        head, body = text[3:end].strip("\n"), text[end + 4:].lstrip("\n")
        key = None
        for line in head.splitlines():
            if not line.strip():
                continue
            m = re.match(r"^\s+-\s+q:\s+(.*)$", line)
            if m and key:                                  # a question entry starts
                meta[key] = meta[key] if isinstance(meta[key], list) else []
                meta[key].append({"q": unquote(m.group(1))})
                continue
            m = re.match(r"^\s{4,}(see|a):\s+(.*)$", line)
            if m and key and isinstance(meta.get(key), list) and meta[key] and isinstance(meta[key][-1], dict):
                meta[key][-1][m.group(1)] = unquote(m.group(2))    # …and takes its pointer or its answer
                continue
            m = re.match(r"^\s+-\s+(.*)$", line)
            if m and key:
                meta.setdefault(key, [])
                if not isinstance(meta[key], list):
                    meta[key] = []
                meta[key].append(unquote(m.group(1)))
                continue
            k, _, v = line.partition(":")
            key = k.strip()
            meta[key] = parse_value(v) if v.strip() else []
    return meta, body


# ---------------------------------------------------------------- markdown

def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<![*\w])\*([^*]+)\*(?!\*)", r"<em>\1</em>", s)
    s = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", lambda m: f'<a href="{html.escape(m.group(2))}">{m.group(1)}</a>', s)
    return s


def markdown(md):
    out, para, items, quote = [], [], [], []

    def flush():
        if para:
            out.append(f"<p>{inline(' '.join(para))}</p>")
            para.clear()
        if items:
            out.append("<ul>" + "".join(f"<li>{inline(i)}</li>" for i in items) + "</ul>")
            items.clear()
        if quote:
            out.append(f"<blockquote><p>{inline(' '.join(quote))}</p></blockquote>")
            quote.clear()

    for line in md.splitlines():
        s = line.rstrip()
        if not s.strip():
            flush()
            continue
        h = re.match(r"^(#{2,4})\s+(.*)$", s)
        if h:
            flush()
            n = len(h.group(1))
            out.append(f"<h{n}>{inline(h.group(2))}</h{n}>")
        elif re.match(r"^\s*[-*]\s+", s):
            if para:
                flush()
            items.append(re.sub(r"^\s*[-*]\s+", "", s))
        elif s.startswith(">"):
            quote.append(s.lstrip("> "))
        else:
            if items:
                flush()
            para.append(s.strip())
    flush()
    return "\n".join(out)


# ---------------------------------------------------------------- content

# Where the site lives. Empty for a root domain (Netlify, local preview);
# "/my-agent" on GitHub Pages. Set by the deploy workflow through BASE_PATH / BASE_URL.
BASE = os.environ.get("BASE_PATH", "").rstrip("/")


def load_site():
    site = json.loads((CONTENT / "site.json").read_text(encoding="utf-8"))
    if os.environ.get("BASE_URL"):
        site["baseUrl"] = os.environ["BASE_URL"]
    site["basePath"] = BASE
    return site


def with_base(text):
    """Prefix every root-relative link (href, src, action) with the base path."""
    if not BASE:
        return text
    return re.sub(r'\b(href|src|action)="/(?!/)', lambda m: f'{m.group(1)}="{BASE}/', text)


def load_pieces(folder, kind):
    pieces = []
    for f in sorted((CONTENT / folder).glob("*.md")):
        meta, body = parse_frontmatter(f.read_text(encoding="utf-8"))
        meta["slug"] = f.stem
        meta["type"] = meta.get("type", kind)
        meta["url"] = f"/{folder}/{f.stem}/"
        meta["html"] = markdown(body)
        for k in ("themes", "keywords", "answers"):
            meta.setdefault(k, [])
        pieces.append(meta)
    return pieces


# ---------------------------------------------------------------- layout

def e(s):
    return html.escape(str(s or ""))


def page(site, title, body, description="", path="/", scripts=(), json_ld=None, body_class=""):
    full_title = site["name"] if title == site["name"] else f"{title} · {site['name']}"
    ld = f'<script type="application/ld+json">{json.dumps(json_ld, ensure_ascii=False)}</script>' if json_ld else ""
    js = "".join(f'<script src="{s}" defer></script>' for s in scripts)
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(full_title)}</title>
<meta name="description" content="{e(description)}">
<link rel="canonical" href="{e(site['baseUrl'].rstrip('/') + path)}">
<link rel="preload" href="/assets/fonts/InstrumentSans-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/site.css">
<script>document.documentElement.classList.add('js')</script>
{ld}
</head>
<body class="{body_class}">
<a class="skip" href="#main">Skip to content</a>
<header class="top">
  <a class="home" href="/">{e(site['name'])}</a>
  <nav aria-label="Main">
    <a href="/work/">Work</a>
    <a href="/notes/">Notes</a>
    <a href="/how-this-site-works/">How this site works</a>
  </nav>
</header>
<main id="main">
{body}
</main>
<footer class="foot">
  <span>© 2026 {e(site['name'])} · {e(site['location'])}</span>
  <span>{contact_links(site)}</span>
</footer>
{js}
</body>
</html>
"""


def contact_links(site):
    parts = []
    parts.append(f'<span class="addr">{e(site["email"])}</span>' if site.get("email") else '<span class="gap">[email]</span>')
    if site.get("linkedin"):
        parts.append(f'<a href="{e(site["linkedin"])}">LinkedIn</a>')
    if site.get("cv"):
        parts.append(f'<a href="{e(site["cv"])}">CV</a>')
    return " · ".join(parts)


def meta_line(p):
    bits = [p.get("where", ""), p.get("year") or ('<span class="gap">[year]</span>' if p["type"] == "work" else p.get("date", ""))]
    return " · ".join(b if b.startswith("<span") else e(b) for b in bits if b)


# ---------------------------------------------------------------- pages

def build_home(site, work, notes):
    by_slug = {p["slug"]: p for p in work + notes}
    # A topic only shows if at least one of its pieces is on the site.
    themes = [dict(t, pieces=[s for s in t["pieces"] if s in by_slug]) for t in site["themes"]]
    themes = [t for t in themes if t["pieces"]]
    chips = []
    for t in themes:
        first = by_slug[t["pieces"][0]]
        href = first["url"]
        chips.append(f'<a class="chip" href="{e(href)}" data-theme="{e(t["id"])}">{e(t["label"])}</a>')

    data = {
        "site": dict({k: site[k] for k in ("partialIntro", "noMatch", "softInvite", "email", "countEndpoint",
                                           "voice", "smalltalk", "basePath")}, themes=themes),
        "pieces": [public_piece(p) for p in work + notes],
    }
    data_json = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    body = f"""
<section class="col open" id="intro">
  <div class="stage" id="stage">
    <p class="who">{e(site['who'])}</p>
    <h1>{e(site['opening'])}</h1>
    {''.join(f"<p>{e(line)}</p>" for line in site['stance'])}
    <p class="invite">{e(site['invite'])}</p>
  </div>
  <div class="themes" id="themes">{''.join(chips)}</div>
</section>

<section class="col thread" id="thread" aria-live="polite"></section>
<div class="col restart-wrap"><button type="button" class="linkbtn restart" id="restart">Start over</button></div>

<div class="composer" id="composer"><div class="col">
  <form class="ask" id="ask" role="search" action="/work/">
    <label for="q" class="sr">Your question</label>
    <input id="q" name="q" type="text" autocomplete="off" placeholder="{e(site['placeholder'])}">
    <button type="submit">Ask</button>
  </form>
  <p class="honesty">{e(site['honesty'])} <a href="/how-this-site-works/">How this works</a></p>
</div></div>

<form name="question" data-netlify="true" netlify-honeypot="bot-field" hidden>
  <input name="question"><input name="email"><input name="bot-field">
</form>
<script type="application/json" id="answers">{data_json}</script>
"""
    ld = {"@context": "https://schema.org", "@type": "Person", "name": site["name"],
          "jobTitle": site["role"], "url": site["baseUrl"], "address": site["location"]}
    return page(site, site["name"], body, description=site["opening"], path="/",
                scripts=["/assets/js/match.js", "/assets/js/redact.js", "/assets/js/respond.js", "/assets/js/chat.js",
                         "/assets/js/send.js", "/assets/js/intro.js", "/assets/js/agent.js"],
                json_ld=ld, body_class="is-home")


def public_piece(p):
    keep = ("slug", "type", "title", "url", "where", "year", "date", "context", "themes",
            "intro", "about", "brief", "question", "answer", "keywords", "answers")
    out = {k: p.get(k) for k in keep if p.get(k) not in (None, "")}
    if "url" in out:
        out["url"] = BASE + out["url"]
    return out


def build_piece(site, p):
    draft = '<p class="draft">Draft text, to be rewritten.</p>' if p.get("draft") else ""
    label = "The brief" if p["type"] == "work" else "The common view"
    body = f"""
<article class="col piece">
  {draft}
  <p class="where">{meta_line(p)}</p>
  <h1>{e(p['title'])}</h1>
  <div class="trio">
    <div class="step"><span class="label">{label}</span><p class="brief">“{e(p.get('brief'))}”</p></div>
    <div class="step"><span class="label">The question nobody asked</span><p class="q">{e(p.get('question'))}</p></div>
    <div class="step"><span class="label">The answer</span><p class="a">{e(p.get('answer'))}</p></div>
  </div>
  <div class="story">{p['html']}</div>
  <p class="after"><a href="/?about={e(p['slug'])}#q">Ask me about this →</a></p>
</article>
"""
    kind = "CreativeWork" if p["type"] == "work" else "Article"
    ld = {"@context": "https://schema.org", "@type": kind, "name": p["title"],
          "description": p.get("answer", ""), "author": {"@type": "Person", "name": site["name"]},
          "url": site["baseUrl"].rstrip("/") + p["url"], "keywords": ", ".join(p.get("keywords", []))}
    return page(site, p["title"], body, description=p.get("question", ""), path=p["url"], json_ld=ld)


def build_index(site, title, intro, pieces, path, themes, with_filters):
    filters = ""
    if with_filters:
        btns = ['<button type="button" class="chip" data-filter="all" aria-pressed="true">All</button>']
        btns += [f'<button type="button" class="chip" data-filter="{e(t["id"])}" aria-pressed="false">{e(t["label"])}</button>' for t in themes]
        btns += ['<button type="button" class="chip" data-filter="commissioned" aria-pressed="false">Commissioned</button>',
                 '<button type="button" class="chip" data-filter="self-initiated" aria-pressed="false">Self-initiated</button>']
        filters = f'<div class="themes filters" id="filters">{"".join(btns)}</div>'
    rows = "".join(
        f'<li data-tags="{e(" ".join(p.get("themes", []) + [p.get("context", "")]))}">'
        f'<a href="{e(p["url"])}"><span class="t">{e(p["title"])}</span>'
        f'<span class="q">{e(p.get("question", ""))}</span><span class="m">{meta_line(p)}</span></a></li>'
        for p in pieces)
    body = f"""
<section class="col list">
  <h1>{e(title)}</h1>
  <p class="invite">{e(intro)}</p>
  {filters}
  <ul class="index big" id="list">{rows}</ul>
</section>
"""
    return page(site, title, body, description=intro, path=path, scripts=["/assets/js/filter.js"] if with_filters else ())


def build_plain_page(site, slug):
    meta, body = parse_frontmatter((CONTENT / "pages" / f"{slug}.md").read_text(encoding="utf-8"))
    html_body = f'<article class="col piece plain"><h1>{e(meta.get("title"))}</h1><div class="story">{markdown(body)}</div></article>'
    return page(site, meta.get("title", slug), html_body, path=f"/{slug}/")


# ---------------------------------------------------------------- machine-readable

def build_llms(site, work, notes):
    base = site["baseUrl"].rstrip("/")
    lines = [f"# {site['name']}", "", f"> {site['role']}, {site['location']}. {site['opening']}", "",
             "Every answer on this site comes from the work below. Nothing is generated.", "", "## Work", ""]
    lines += [f"- [{p['title']}]({base}{p['url']}): {p.get('question', '')} {p.get('answer', '')}" for p in work]
    lines += ["", "## Notes", ""]
    lines += [f"- [{p['title']}]({base}{p['url']}): {p.get('answer', '')}" for p in notes]
    lines += ["", "## About this site", "", f"- [How this site works]({base}/how-this-site-works/)"]
    return "\n".join(lines) + "\n"


def build_sitemap(site, urls):
    base = site["baseUrl"].rstrip("/")
    items = "".join(f"<url><loc>{e(base + u)}</loc></url>" for u in urls)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{items}</urlset>\n'


# ---------------------------------------------------------------- main

def write(rel, text):
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    if rel.endswith(".html"):
        text = with_base(text)
    path.write_text(text, encoding="utf-8")


def main():
    site = load_site()
    work = load_pieces("work", "work")
    notes = load_pieces("notes", "note")

    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(SRC / "assets", OUT / "assets")

    write("index.html", build_home(site, work, notes))
    for p in work + notes:
        write(p["url"].strip("/") + "/index.html", build_piece(site, p))
    write("work/index.html", build_index(site, "Work", "Commissioned and self-initiated, each told from the question that changed it.", work, "/work/", site["themes"], True))
    write("notes/index.html", build_index(site, "Notes", "Writing, ideas and positions that feed the work.", notes, "/notes/", site["themes"], False))
    write("how-this-site-works/index.html", build_plain_page(site, "how-this-site-works"))

    write("answers.json", json.dumps({"pieces": [public_piece(p) for p in work + notes]}, ensure_ascii=False, indent=1))
    urls = ["/", "/work/", "/notes/", "/how-this-site-works/"] + [p["url"] for p in work + notes]
    write("sitemap.xml", build_sitemap(site, urls))
    write("robots.txt", f"User-agent: *\nAllow: /\n\nSitemap: {site['baseUrl'].rstrip('/')}/sitemap.xml\n")
    write("llms.txt", build_llms(site, work, notes))
    write(".nojekyll", "")

    print(f"Built {len(work)} work pieces, {len(notes)} notes → {OUT.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
