"""How my texts are cut into passages, and which paragraph each listed question points at.
No dependencies. One place, used by:
  build/embed.py     to build the index the page searches
  build/build.py     to notice when that index is older than the content
  tests/passages.py  to measure the model

The cut follows what the librarian study in the brain found works: my own paragraphs are the passages,
headings and very short paragraphs join the next one, long paragraphs are cut at sentence ends."""
import glob, hashlib, os, re

SHORT, LONG = 120, 1000      # characters: shorter joins the next paragraph, longer is cut at sentence ends

def plain(block):
    block = re.sub(r"^\s*([-*]|>)\s*", "", block, flags=re.M)             # list marks, quote marks
    block = re.sub(r"^#+\s*", "", block, flags=re.M)                      # heading marks
    block = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", block)                # links keep their label
    return " ".join(re.sub(r"[*_`]", "", block).split())

def sentences(text, limit=LONG):
    parts, cur = [], ""
    for s in re.split(r"(?<=[.!?])\s+", text):
        if cur and len(cur) + len(s) + 1 > limit: parts.append(cur); cur = s
        else: cur = (cur + " " + s).strip()
    return parts + [cur] if cur else parts

def passages_of(body, skip=()):
    """→ [(section, text, shown)]: `text` is what gets embedded (the heading rides along),
    `shown` is what a visitor reads (no heading)."""
    out, heading, short, section, dropping = [], "", "", "", False
    def add(shown):
        nonlocal heading, short
        parts = sentences((short + " " + shown).strip())
        for i, part in enumerate(parts):
            out.append((section, (heading + " " + part).strip() if i == 0 else part, part))
        heading, short = "", ""
    for block in re.split(r"\n\s*\n", body.strip()):
        block = block.strip()
        if not block: continue
        if block.startswith("#"):
            if block.startswith("## "):
                section = block.split("\n")[0][3:].strip(); dropping = section in skip
            if not dropping: heading = (heading + " " + plain(block.split("\n")[0])).strip()
            block = "\n".join(block.split("\n")[1:]).strip()
            if not block: continue
        if dropping: continue
        text = plain(block)
        if len(text) < SHORT: short = (short + " " + text).strip()
        else: add(text)
    if short: add("")
    return [p for p in out if p[2]]

def load_pieces(root):
    """→ {slug: {title, body, questions: [(question, pointer)]}} for everything on the site."""
    pieces = {}
    for f in sorted(glob.glob(f"{root}/content/work/*.md") + glob.glob(f"{root}/content/notes/*.md")):
        _, fm, body = open(f, encoding="utf-8").read().split("---", 2)
        pieces[os.path.basename(f)[:-3]] = {
            "title": re.search(r"^title:\s*(.+)$", fm, re.M).group(1).strip(),
            "body": body,
            "questions": [(q.strip(), see.strip()) for q, see in re.findall(r"^  - q: (.+)\n    see: (.+)$", fm, re.M)],
        }
    return pieces

def corpus(pieces, title=True, skip=()):
    """→ [{slug, section, text, shown, embed}]. `embed` puts the piece title in front: the biggest lever."""
    out = []
    for slug, p in pieces.items():
        for section, text, shown in passages_of(p["body"], skip):
            out.append({"slug": slug, "section": section, "text": text, "shown": shown,
                        "embed": f"{p['title']}. {text}" if title else text})
    return out

def listed_questions(pieces, passages):
    """→ [{slug, q, passage}]: each listed question with the index of the passage it points at."""
    out = []
    for slug, p in pieces.items():
        for q, see in p["questions"]:
            at = [i for i, x in enumerate(passages) if x["slug"] == slug and see in x["text"]]
            if not at: raise SystemExit(f"{slug}: the question “{q}” points at “{see}”, which is not in the text")
            out.append({"slug": slug, "q": q, "passage": at[0]})
    return out

def fingerprint(passages, questions):
    """Changes whenever a passage or a listed question changes: tells the build the index is stale."""
    h = hashlib.sha1()
    for x in passages: h.update(x["embed"].encode("utf-8") + b"\0")
    for x in questions: h.update(f"{x['slug']}|{x['q']}|{x['passage']}".encode("utf-8") + b"\0")
    return h.hexdigest()[:16]
