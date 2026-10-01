# Interaction model

Working definition, 1 October 2026. Companion to `site-foundation.md`.
The bar, in Gab's words: it has to feel like discussing with an LLM, not like a dumb form.
Everything stays extractive: every sentence the page says is written in `content/`, none is generated.

## The home page, in order

1. **The intro tells a short story.** Its lines show one after another in the same place: who I am,
   the claim, the stance (symptoms, root cause, the wrong fix), then the question that leads to the
   topic cards. A tap moves on; the marks below go back. The question field is there from the start,
   and asking ends the intro. (`intro.js`)
2. **The question field stays within reach.** It sits under the intro at rest and is held at the
   bottom of the screen once the conversation is longer than the screen. It glides there. The intro
   stays on the page, above the conversation.
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

## Open

- **Content written for speech.** Each field of a piece should complete a sentence the agent says
  (`about:` completes "Senz is about …"), saying in a few words how the project relates to the
  visitor's problem, just enough to lead to the full story. Guidelines for the frontmatter to define.
- **The full answer** (brief, question nobody asked, answer) still appears as a labelled card when a
  typed question matches one piece. Speech or card: not decided.
- **How the reply appears**: word by word today. Pace and form not decided.
- **Code structure**: `agent.js` holds everything. A split into "what to say" and "how it is shown"
  was sketched and not adopted.
- All wording under `voice` and `smalltalk` in `site.json` is a draft for Gab to rewrite.
