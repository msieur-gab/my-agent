# Site foundation

Agreed direction, 1 October 2026. Companion to `questions.md`.

The home page is a conversation: the visitor asks, the site answers from my own work, and when it can't, it asks them to send me the question. That moment is the conversion point. Everything else (work, notes) lives in plain, crawlable folders.

---

## 1. Structure

```
/                      Home: the conversation (also a plain, crawlable page)
/work/                 All work, one list
/work/<slug>/          One project, told as a narrative arc
/notes/                All writing, ideas and notes
/notes/<slug>/         One note
/about/                Short bio, CV, links
/how-this-site-works/  What the conversation is, what's stored, no cookies
```

**Header, on every page:** Gabriel Baude (home) · Work · Notes · About.
No separate Contact page: the conversation is the contact, and the email address sits in the footer.

## 2. One source of truth

Each project and note is one Markdown file with a short header:

```yaml
title: Senz
type: work            # work | note
context: commissioned # commissioned | self-initiated
year: 2018–21
themes: [ideas-never-tested, ai-pilots]
brief: "We need to innovate faster."
question: What if testing an idea cost less than the meeting about it?
answer: Experts sketch on paper and get a working prototype...
answers_questions:     # real questions from questions.md this piece answers
  - How can my team test an idea before we commit a budget?
  - Can people without a technical background build a prototype themselves?
keywords: [prototype, test, idea, mvp, sketch]
```

A small build script turns these files into:
- every page under `/work/` and `/notes/`
- `answers.json`, the data the conversation searches
- `sitemap.xml`, `robots.txt`, `llms.txt` and structured data, so search engines and LLMs can read everything

One file per piece means adding a project automatically adds it to the site, the conversation and the crawlers.

## 3. Home page: states and behaviour

**At rest**
- Opening line: "I answer the questions nobody dares to ask."
- One line of invitation, the question field, and six themes written as the buyer's problems.
- A quiet line: "Answers come only from my own work. No cookies." with a link to `/how-this-site-works/`.
- Further down, a plain list, "Everything here": all work and all notes as links. People who want to scan, and every crawler, find the whole site here without touching the conversation.

**Asking**
1. The visitor types or picks a theme. Their question appears as a line on the page.
2. The reply appears progressively, like a person answering. It's instant with reduced motion.
3. The answer: the brief → the question nobody asked → the answer → follow the full story.
4. Two or three related questions to continue with, plus "Ask something else".
5. A soft invitation under every answer: "Want to talk about your version of this?"

**No match: the conversion point**
- One of ten replies, picked at random, saying I haven't built this yet but would like to hear it.
- The visitor's question already filled into a small form, plus an email field and a Send button.
- No dead end: the closest themes stay one tap away.

**Partial match**
- "This is the closest I have," then the answer, then the same invitation to send the question.

**Memory**
- The conversation stacks on the page for the current visit only. Nothing is kept in the browser.
- Question text is logged anonymously, with no IP, no fingerprint and nothing else. This is said on `/how-this-site-works/`.

## 4. Work index (`/work/`)

- One text-first list: title, year, and the question nobody asked.
- Filters use the same themes as the conversation, plus Commissioned / Self-initiated.
- No thumbnails needed. The question is what makes someone click.

## 5. Project page (`/work/<slug>/`)

A narrative arc, paced like a deck but scrolled like a page, with one message per screen:
1. The brief, or the situation
2. What everyone assumed
3. The reframes, one or more, including dead ends
4. What got built, with one piece of real evidence (photo or short loop)
5. What changed
6. Optional: open the thinking board
7. "Ask me about this project": the conversation, limited to this piece

## 6. Notes (`/notes/`)

- A list of title, date and one line, newest first, filterable by theme.
- Notes answer questions in the conversation too, especially "what do you think about…" questions.

## 7. Design foundation

- Light and open only. Dark grounds read as closed.
- One message per screen, at most three elements competing on any screen.
- One typeface family, one link colour, generous space.
- Calm before clever: no effect that needs decoding.
- Fully readable without JavaScript. The conversation is an enhancement on top of a normal page.

## 8. Matching

- **Version 1:** keyword and phrase matching against `answers.json`, including the `answers_questions` lists.
- **Version 2:** a small embedding model (MiniLM) in the browser, loaded only after the first question, with a similarity threshold that decides answer / closest / no match. Still extractive: it ranks my pieces and never writes text.

## 9. Decisions

- **Launch:** 1 November 2026, after live tests with friends, colleagues and former clients.
- **Domain:** not decided, not blocking. Candidates: misterbau.de, mistergab.eu, thecu.be.
- **Order of work:** the conversation first. Get the interaction and the discussion experience right before anything else.
- **Matching during development:** a simple keyword file.
- **Testing:** locally, or deployed to Netlify.

### What gets counted (and what doesn't)

The goal is to learn what interests visitors, to decide what to write or build next. Not to track people.

- **Counted:** which theme gets clicked, and the text of a typed question.
- **At most once per visit:** the page remembers in memory which themes were already counted during this visit, so repeated clicks on the same theme count once. Reloading the page starts a new visit.
- **Not counted:** who clicked. No cookie, no ID, no IP, no fingerprint, nothing stored on the visitor's device. Without an identifier there is no "per user" count, and that's deliberate.
- **Typed questions:** visitors may type names or company details, so treat the text with care: review it, then delete it. Say this on `/how-this-site-works/`.
- **Messages sent to me:** handled separately (for example Netlify Forms), since the visitor chose to send them.

### Redaction before anything leaves the page

Personal details are removed in the browser, and the visitor sees the result before it's sent.

- **Removed automatically:** email addresses, phone numbers, web addresses, account and ID numbers, company names with a legal form (GmbH, AG, SE, SA, SAS, Ltd, Inc…), and likely person names.
- **Shown as placeholders:** "We at [company] asked [person] to…", so the meaning survives.
- **Preview before sending:** "This is exactly what I'll receive." The visitor can tap a placeholder to put a detail back if they want me to know it (useful in a message to me), or send as it is.
- **Logged questions:** always the redacted version, never the original.
- **Honest limit:** detection can miss things. The preview says so: "I remove names and contact details automatically. Check before sending."
- **Open concern, to solve later:** redaction must not remove what I need to reply. The visitor's own email (in its own field) is never redacted; redaction applies to the question text. Idea to explore: encrypt messages in the browser with WebCrypto so only I can read them, which would allow keeping details safely.
- **How:** version 1 uses patterns plus a few simple rules (legal forms, capitalised words in the middle of a sentence, "I'm…", "at…"). A small in-browser name-recognition model could come later if the rules miss too much.

## 10. Path to 1 November

- **Week 1 (to 8 Oct):** keyword file, six themes, conversation behaviour on the home page with 3–4 real pieces.
- **Week 2 (to 15 Oct):** reply feel (progressive text), no-match invitation and send form, related questions.
- **Week 3 (to 22 Oct):** 8–10 pieces written in the brief / question / answer format; work and notes folders; crawlable home list.
- **Week 4 (to 29 Oct):** live test on Netlify with friends, colleagues and former clients; fix what confuses them.
- **1 November:** launch.
