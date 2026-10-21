# my-agent

The home page of Gabriel Baude's site: a conversation instead of a showcase.
Visitors ask a question or pick a theme; the page answers with a piece of work, the closest one, or invites them to send the question. Nothing is generated, nothing is stored on the visitor's device.

What kind of message it is (hello, a question about me, a problem, off-topic) is read by a small intent model,
the intent part of [ptiLU](https://github.com/msieur-gab/minios-nlu), trained from `content/intents.md`
when the site is built. About 40 KB (17 KB gzipped), a second to train, well under a millisecond per message, no network.

## Run it

```sh
python3 build/build.py        # builds the site into public/
cd public && python3 -m http.server 8000
node tests/check.js           # checks matching and redaction (after a build)
```

Python and Node, no packages.

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
content/intents.md       what the agent understands (hello, about me…) and what it answers
content/work/*.md        one file per project
content/notes/*.md       one file per note
content/pages/*.md       plain pages (how this site works)
src/assets/js/nlu.js     what kind of message it is (the model, trained from intents.md)
src/assets/js/match.js   finds the piece that answers: search, typos, a project named
src/assets/js/respond.js decides the reply, as one of four templates (project, choice, talk, none)
src/assets/js/chat.js    shows a reply, always in the same order; looks after the question field
src/assets/js/send.js    the form that reaches me
src/assets/js/redact.js  removes names and contact details before anything is sent
src/assets/js/intro.js   the opening lines, shown one after another
src/assets/js/agent.js   wires the above together
build/train.js           content/intents.md → the intent model (run by build.py)
build/build.py           content → static, crawlable pages + answers.json, sitemap, robots.txt, llms.txt
docs/                    site foundation, interaction model and the questions log
.github/workflows/       build and deploy to GitHub Pages
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

## Teaching it

Add sentences under the right `## name` in `content/intents.md`, or a new `## name` with its `reply:` and
`offer:`, then rebuild. When the model isn't sure (below 0.45) it stays quiet and the search through the
work decides, then the honest "no answer". `node tests/check.js` scores it on `tests/intents-held-out.md`,
sentences it never saw: "wrong" (a written reply to the wrong kind of message) is the number to keep at zero.

## Not wired yet

- Counting theme clicks and questions: set `countEndpoint` in `site.json` once there's somewhere to send them.
- Messages are posted as a Netlify form named `question`. GitHub Pages can't receive them, so the form says it can't send yet (and gives the email once `email` is set in `site.json`).
- Email, LinkedIn, CV and the final domain (`baseUrl`) are empty in `site.json`.
