# Interaction model

Working definition, 1 October 2026. Companion to `site-foundation.md`.
The bar, in Gab's words: it has to feel like discussing with an LLM, not like a dumb form.
Everything stays extractive: every sentence the page says is written in `content/`, none is generated.

## The home page, in order

1. **The page is a sheet of sections lying on the footer** (2 October 2026). The intro, then the
   conversation, each at least one screen tall; another section can be added between them. Each
   one pushes the one before it up. The footer waits underneath, held at the bottom of the screen,
   and shows once the end of the conversation has lifted past it. Each section catches gently at
   its top when the scroll settles near it; inside a long conversation the scroll stays free.
   - **The intro shows everything at once**, on a grid: the claim top left, who I am and the
     stance bottom right, with a link down to the conversation.
   - **The conversation** opens on the question that leads to the topic cards.
   - **The footer** uses the same grid: a closing line top left, contact bottom right.
2. **The question field stays within reach.** It sits under the topic cards at rest and is held at
   the bottom of the screen once the conversation is longer than the screen. It glides there. It
   belongs to the conversation's section and leaves with it, so it never sits on the footer.
3. **Things arrive, they don't pop.** Messages, replies and choices fade in with a slight rise.

## The conversation

4. **It shows it listened.** "Why this one: you mentioned …", using only words found in the piece's
   keywords.
5. **It remembers the visit.** A piece is not shown twice; asked again, it offers another angle or
   says the first is still its best answer. It knows which project the talk is on. Memory lives in
   the page and ends with the visit.
6. **It asks back instead of guessing.** A broad topic, or a question several pieces answer about
   equally well (second within 80% of the best), gets one question and a row of cards, one per
   project, swiped left and right.
7. **Tapping and typing do the same things.** Two actions on a project:
   - *about*: the short reply, "Pebbble is about …", then "Read the full story". Tapping a card,
     or typing "Pebbble", "tell me about Pebbble", "show me Pebbble".
   - *open*: the agent says it is opening the story, then goes to the project page. Tapping the
     link, or typing "open Pebbble", "read the full story", or "show me" once the short reply has
     been given. "This", "it" and a bare "show me" mean the project the talk is on.
8. **Only the visitor's own words are shown as theirs.** A typed sentence or a tapped label gets a
   bubble; a tapped card does not get an invented sentence.
9. **It answers talk as talk.** Hello, thanks, who are you, are you an AI, can I hire you, tell me
   more. Written replies, matched on the whole message so a real question is never swallowed.
10. **It forgives typos.** A word it doesn't know is read as the closest word it does know: one slip
    for words of five letters or more, two for nine or more. Project names too.
11. **It never dead-ends.** No match gives the invitation to send the question, and the topics.

## The four reply templates

Every reply is one of four templates, and all four are shown the same way.

| Template | When | What it holds |
|---|---|---|
| **Project** | One project answers | "Senz is about …", the link to the full story, related questions, the invitation |
| **Choice** | Several projects fit, or "show me all your work" | One line, then a card per project |
| **Talk** | Hello, who are you, how this works, "opening the story" | A written line, sometimes a link, the topics or the form |
| **No answer** | Nothing fits | The honest line, the form to send the question, the topics |

Shown in this order, whatever the template:
what the agent says → why ("you mentioned …") → cards → form → link → what to do next → the invitation.

## How the code is split

- `match.js` understands what was typed: search with an evidence rule, typos, small talk, commands.
- `respond.js` decides the reply and returns it as plain data, one of the four templates. No page code,
  so `tests/check.js` runs whole conversations against it.
- `chat.js` shows any reply in the fixed order above and looks after the question field. It knows
  nothing about the content.
- `send.js` is the form. `agent.js` wires them together.

A new kind of answer is a new template function in `respond.js`; the look stays in one place, `chat.js`.

## Open

- **Questions about me** (where I'm based, my process, my rate…): 44 listed in `questions.md`, section L,
  to mark as answer / invite / no.
- **Content written for speech.** Each field of a piece should complete a sentence the agent says
  (`about:` completes "Senz is about …"), saying in a few words how the project relates to the
  visitor's problem, just enough to lead to the full story. Guidelines for the frontmatter to define.
- **How the reply appears**: word by word today. Pace and form not decided.
- All wording under `voice` and `smalltalk` in `site.json` is a draft for Gab to rewrite.
