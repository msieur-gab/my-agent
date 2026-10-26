# my-agent

The home page of Gabriel Baude's site: a conversation instead of a showcase.
Visitors ask a question or pick a theme; the page answers with a piece of work, the closest one, or invites them to send the question. Nothing is generated, nothing is stored on the visitor's device.

Every reply to a typed question comes from one file, `content/bank.md`: the questions visitors ask, a few ways of asking each, my reply, and where it leads. A small embedding model (MiniLM, 23 MB, served by this site) matches the visitor's words to those questions by meaning, in the browser. `docs/authoring-eval.md` has the measurements.

## Run it

```sh
pip install -r requirements.txt   # once: onnxruntime, tokenizers, numpy, to embed the bank
python3 build/build.py            # builds the site into public/, bank vectors included
cd public && python3 -m http.server 8000
python3 tests/eval.py --sweep     # measures the matching against held-out questions → tests/eval-results.md
```

The site has no dependencies: the browser loads the vendored model and library from `src/assets/`.
The build has three Python packages to embed the bank with the same model file; without them the site still builds and the page matches by words only. Nothing here needs Node: the two JavaScript checks (`tests/check.js`, `tests/talk.mjs`) run in the GitHub Action.

## Publishing

Every push to `main` builds the site and puts the result on the `gh-pages` branch
(`.github/workflows/pages.yml`). GitHub Pages serves that branch at
https://msieur-gab.github.io/my-agent/ (Settings → Pages → Deploy from a branch → `gh-pages`, `/ (root)`).
The build gets the `/my-agent` base path so links work in that sub-folder;
locally and on a root domain the base path stays empty.
Netlify would also work as is (`netlify.toml`).

## Where things live

```
content/site.json        opening line, themes, "no answer" replies, contact details
content/bank.md          the question bank: what a typed question gets, and where it leads
content/work/*.md        one file per project
content/notes/*.md       one file per note
content/pages/*.md       plain pages (how this site works)
src/assets/js/match.js   typos, commands ("open Senz"), the list; the old keyword search
src/assets/js/bank.js    finds the bank entry that answers: by words (instant) or by meaning (MiniLM)
src/assets/js/respond.js decides the reply, as one of four templates (project, choice, talk, none)
src/assets/js/chat.js    shows a reply, always in the same order; looks after the question field
src/assets/js/send.js    the form that reaches me
src/assets/js/redact.js  removes names and contact details before anything is sent
src/assets/js/intro.js   the opening lines, shown one after another
src/assets/js/agent.js   wires the above together
src/assets/models/       the embedding model, int8 ONNX (Xenova/all-MiniLM-L6-v2)
src/assets/js/vendor/    transformers.js 2.17 and its WASM runtime
build/build.py           content → static, crawlable pages + answers.json, bank.json, sitemap, robots.txt, llms.txt
build/embed.py           the bank's vectors, with the same model file the browser loads (onnxruntime)
tests/eval.py            the measurements (held-out.json, bank-eval.json) → tests/eval-results.md
tests/talk.mjs           a whole conversation through respond.js (Action only)
docs/                    site foundation, interaction model, the questions log, the matcher evaluation
.github/workflows/       build and deploy to GitHub Pages
```

## Adding an answer

Add an entry to `content/bank.md`, under the section it belongs to:

```
### Can we launch without an app store?
- Do we need a native app
- Is a PWA enough
say: Pebbble is a PWA launched from an NFC tap: no installation, no icon, nothing to find on the phone.
leads: pebbble
```

Then rebuild. The rules are at the top of that file.

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
- Messages are posted as a Netlify form named `question`. GitHub Pages can't receive them, so the form says it can't send yet (and gives the email once `email` is set in `site.json`).
- Email, LinkedIn, CV and the final domain (`baseUrl`) are empty in `site.json`.
