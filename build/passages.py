"""What the page compares a visitor's question with: every answer I can give, cut into rows.

An answer (a "target") is one file: a project (content/work/), a note (content/notes/), a view
(content/views/) or an intent (content/intents/). Each target gives three kinds of rows:

  asked   the ways a visitor might ask it, in their words: the `answers:` lines (and `questions:`
          entries, which also point at the paragraph that answers them). The strongest evidence.
  gist    what the piece is, in a line: its title, `question`, `answer` and `brief`.
  text    my own paragraphs, the piece title in front (the librarian study's recipe). Headings and very
          short paragraphs join the next one, long paragraphs are cut at sentence ends.

No dependencies beyond build.py's own front-matter reader. One place, used by:
  build/embed.py     to build the index the page searches
  build/build.py     to notice when that index is older than the content
  tests/routing.py   to measure where questions land"""
import hashlib, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import parse_frontmatter  # noqa: E402

SHORT, LONG = 120, 1000      # characters: shorter joins the next paragraph, longer is cut at sentence ends
KINDS = (("work", "work"), ("notes", "note"), ("views", "view"), ("intents", "intent"))


def plain(block):
    block = re.sub(r"^\s*([-*]|>)\s*", "", block, flags=re.M)             # list marks, quote marks
    block = re.sub(r"^#+\s*", "", block, flags=re.M)                      # heading marks
    block = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", block)                    # images
    block = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", block)                # links keep their label
    block = re.sub(r"^:\s*", "", block, flags=re.M)                       # definition-list marks
    return " ".join(re.sub(r"[*_`]", "", block).split())


def sentences(text, limit=LONG):
    parts, cur = [], ""
    for s in re.split(r"(?<=[.!?])\s+", text):
        if cur and len(cur) + len(s) + 1 > limit: parts.append(cur); cur = s
        else: cur = (cur + " " + s).strip()
    return parts + [cur] if cur else parts


def passages_of(body):
    """→ [(section, text, shown)]: `text` is what gets embedded (the heading rides along),
    `shown` is what a visitor reads (no heading)."""
    out, heading, short, section = [], "", "", ""
    def add(shown):
        nonlocal heading, short
        for i, part in enumerate(sentences((short + " " + shown).strip())):
            out.append((section, (heading + " " + part).strip() if i == 0 else part, part))
        heading, short = "", ""
    for block in re.split(r"\n\s*\n", body.strip()):
        block = block.strip()
        if not block: continue
        if block.startswith("#"):
            if block.startswith("## "): section = block.split("\n")[0][3:].strip()
            heading = (heading + " " + plain(block.split("\n")[0])).strip()
            block = "\n".join(block.split("\n")[1:]).strip()
            if not block: continue
        text = plain(block)
        if not text: continue
        if len(text) < SHORT: short = (short + " " + text).strip()
        else: add(text)
    if short: add("")
    return [p for p in out if p[2]]


def load_targets(root):
    """→ [{slug, kind, title, meta, body}] for every answer the page can give, in a stable order."""
    out = []
    for folder, kind in KINDS:
        d = os.path.join(root, "content", folder)
        if not os.path.isdir(d): continue
        for name in sorted(os.listdir(d)):
            if not name.endswith(".md") or name == "README.md": continue
            meta, body = parse_frontmatter(open(os.path.join(d, name), encoding="utf-8").read())
            out.append({"slug": name[:-3], "kind": meta.get("type", kind), "title": meta.get("title", name[:-3]),
                        "meta": meta, "body": body})
    return out


def rows(targets):
    """→ [{t, kind, text, embed, passage?}]: one row per thing to embed. `t` is the target's position."""
    out = []
    for ti, x in enumerate(targets):
        m, title = x["meta"], x["title"]
        for a in m.get("answers") or []:
            out.append({"t": ti, "kind": "asked", "text": a, "embed": a})
        first = len(out)
        body = passages_of(x["body"])
        for section, text, shown in body:
            out.append({"t": ti, "kind": "text", "text": shown, "embed": f"{title}. {text}", "section": section})
        for q in m.get("questions") or []:                   # paragraph-level questions, optional
            if not isinstance(q, dict) or not q.get("q"): continue
            at = [first + i for i, p in enumerate(body) if q.get("see") and q["see"] in p[1]]
            if q.get("see") and not at:
                raise SystemExit(f"{x['slug']}: the question “{q['q']}” points at “{q['see']}”, which is not in the text")
            out.append({"t": ti, "kind": "asked", "text": q["q"], "embed": q["q"], "passage": at[0] if at else None})
        for k in ("question", "answer", "brief"):
            if m.get(k):
                out.append({"t": ti, "kind": "gist", "text": m[k], "embed": f"{title}. {m[k]}"})
        if x["kind"] != "intent":
            out.append({"t": ti, "kind": "gist", "text": title, "embed": title})
    return out


def fingerprint(targets, rs):
    """Changes whenever an answer or anything embedded changes: tells the build the index is stale."""
    h = hashlib.sha1()
    for x in targets: h.update(f"{x['slug']}|{x['kind']}".encode("utf-8") + b"\0")
    for r in rs: h.update(f"{r['t']}|{r['kind']}|{r['embed']}".encode("utf-8") + b"\0")
    return h.hexdigest()[:16]
