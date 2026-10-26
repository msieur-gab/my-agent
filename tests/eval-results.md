# Matcher evaluation — 2026-10-26

Questions: 36 held-out (piece labels, conceptual only: the 20 factual ones ask for details inside the texts, which no bank entry carries) + 67 bank-eval (entry labels) answerable; 76 that must get no answer.
Floors: words ≥ 0.75; meaning ≥ 0.56 is an answer, ≥ 0.47 is "the closest I have", close call within 0.04.

## held-out.json (written before the bank)

| matcher | right piece | missed | wrong | abstain on no-answer | false answers (hedged) |
|---|---|---|---|---|---|
| old | 18/36 (50%) | 15 | 3 | 37/45 (82%) | 8 (0) |
| words | 17/36 (47%) | 19 | 0 | 44/45 (98%) | 1 (0) |
| meaning | 30/36 (83%) | 3 | 3 | 40/45 (89%) | 5 (2) |
| page | 30/36 (83%) | 3 | 3 | 40/45 (89%) | 5 (2) |

## bank-eval.json (rewordings of the bank)

| matcher | right piece | right entry | missed | wrong | abstain on no-answer | false answers (hedged) |
|---|---|---|---|---|---|---|
| old | 21/67 (31%) | — | 40 | 6 | 25/31 (81%) | 6 (0) |
| words | 9/67 (13%) | 9/67 (13%) | 58 | 0 | 31/31 (100%) | 0 (0) |
| meaning | 61/67 (91%) | 58/67 (87%) | 4 | 2 | 28/31 (90%) | 3 (2) |
| page | 61/67 (91%) | 58/67 (87%) | 4 | 2 | 28/31 (90%) | 3 (2) |

## Meaning scores

Answerable: lowest 0.322 ("is GPT-4 overkill for sorting invoices"), median 0.659, highest 0.993.
No answer: highest 0.947 ("we need a new brand identity"), median 0.341.
Five lowest answerable: 0.322 "is GPT-4 overkill for sorting invoices"; 0.349 "why did you refuse gamification"; 0.396 "what about the right to be forgotten"; 0.408 "how do you align a business model with the user's interest"; 0.454 "our corporate lab takes a year to ship anything".
Five highest no-answer: 0.947 "we need a new brand identity"; 0.761 "do you do social media marketing"; 0.604 "which design system should we buy"; 0.564 "which design system should we buy"; 0.544 "how do we hire developers faster".

## What the page gets wrong

- wrong: "why did your first tool for non-experts fail" → "How do we improve a tool without making people learn something new?" → dowgo (0.512); wanted senz
- wrong: "why avoid frameworks and build steps" → "Why not just build a dashboard?" → dowgo (0.477); wanted autoflow
- wrong: "can privacy be guaranteed without trusting the company" → "Compliance keeps saying no. What would a yes look like?" → autoflow (0.492); wanted pebbble/vrooom
- missed: "what about the right to be forgotten" → no answer (0.396); wanted pebbble
- missed: "why did you refuse gamification" → no answer (0.349); wanted vrooom
- missed: "how do you align a business model with the user's interest" → no answer (0.408); wanted vrooom
- false answer: "we need a new brand identity" → "What do you not do?" → (say only) (0.866); wanted no answer
- false answer: "do you do social media marketing" → "What do you not do?" → (say only) (0.761); wanted no answer
- false answer: "how do I hire developers faster" → "Our innovation lab is too slow. How do we speed it up?" → senz (0.538); wanted no answer
- false answer: "which design system should we buy" → "How do we make a design system adoptable?" → senz (0.564); wanted no answer
- false answer: "we need a pitch deck" → "The board wants proof, not another deck. Where do we start?" → senz (0.474); wanted no answer
- wrong: "we spend 3 months in workshops and still no prototype" → "Do you run workshops?" → contact (0.593); wanted "How do we stop debating ideas and start learning from them?"
- missed: "our corporate lab takes a year to ship anything" → no answer (0.454); wanted "Our innovation lab is too slow. How do we speed it up?"
- missed: "half the company wants change, the other half wants different change" → no answer (0.463); wanted "Everyone agrees something must change. Nobody agrees on what."
- missed: "is GPT-4 overkill for sorting invoices" → no answer (0.322); wanted "Do we even need a large language model for this?"
- wrong: "we need a new logo and visual identity" → "What do you not do?" → (say only) (0.657); wanted "Do you do logo design?"
- missed: "we need help with our SEO" → no answer (0.466); wanted "What do you not do?"
- false answer: "can you build our mobile app" → "Do you design interfaces too?" → vrooom (0.473); wanted no answer
- false answer: "how do we hire developers faster" → "Our innovation lab is too slow. How do we speed it up?" → senz (0.544); wanted no answer
- false answer: "which design system should we buy" → "How do we make a design system adoptable?" → senz (0.604); wanted no answer
