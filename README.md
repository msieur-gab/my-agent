# my-agent

The home page of Gabriel Baude's site: a conversation instead of a showcase.
Visitors ask a question or pick a theme; the page answers with a piece of work, the closest one, or invites them to send the question. Nothing is generated, nothing is stored on the visitor's device.

## Run it

```sh
python3 build/build.py        # builds the site into public/
cd public && python3 -m http.server 8000
node tests/check.js           # checks matching and redaction (after a build)
```

No dependencies. Netlify runs the same build (`netlify.toml`).

## Where things live

```
content/site.json        opening line, themes, "no answer" replies, contact details
content/work/*.md        one file per project
content/notes/*.md       one file per note
content/pages/*.md       plain pages (how this site works)
src/assets/js/match.js   finds the best piece for a question (extractive, no generation)
src/assets/js/redact.js  removes names and contact details before anything is sent
src/assets/js/agent.js   the conversation
build/build.py           content → static, crawlable pages + answers.json, sitemap, robots.txt, llms.txt
docs/                    site foundation and the questions log
```

## Adding a piece

Create `content/work/<slug>.md`:

```yaml
---
title: Senz
type: work
context: commissioned        # or self-initiated
year: 2018–21
where: Allianz · Kaiser X Labs
draft: true                  # shows a "draft" label on the page
themes: [ideas, trust]       # theme ids from site.json
intro: That's what Senz was about.
brief: "We need to innovate faster."
question: What if testing an idea cost less than the meeting about it?
answer: One or two sentences.
keywords: [prototype, test, idea]
answers:                     # real visitor questions this piece answers
  - How can my team test an idea before we commit a budget?
---

## The situation
…
```

Then rebuild. The piece appears on its own page, in the "Everything here" list, in `llms.txt`, and in the conversation.

## Not wired yet

- Counting theme clicks and questions: set `countEndpoint` in `site.json` once there's somewhere to send them.
- Messages are posted as a Netlify form named `question`; they only work once deployed on Netlify.
- Email, LinkedIn, CV and the final domain (`baseUrl`) are empty in `site.json`.
