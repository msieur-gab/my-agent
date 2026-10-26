# Matcher evaluation — 2026-10-26

Questions: 36 held-out (piece labels, conceptual only: the 20 factual ones ask for details inside the texts, which no bank entry carries) + 67 bank-eval (entry labels) answerable; 76 that must get no answer.
Floors: words ≥ 0.75; meaning ≥ 0.56 is an answer, ≥ 0.47 is "the closest I have", close call within 0.04.

## held-out.json (written before the bank)

| matcher | right piece | missed | wrong | abstain on no-answer | false answers (hedged) |
|---|---|---|---|---|---|
| words | 17/36 (47%) | 19 | 0 | 44/45 (98%) | 1 (0) |
| meaning | 30/36 (83%) | 3 | 3 | 41/45 (91%) | 4 (1) |
| page | 30/36 (83%) | 3 | 3 | 41/45 (91%) | 4 (1) |

## bank-eval.json (rewordings of the bank)

| matcher | right piece | right entry | missed | wrong | abstain on no-answer | false answers (hedged) |
|---|---|---|---|---|---|---|
| words | 9/67 (13%) | 9/67 (13%) | 58 | 0 | 31/31 (100%) | 0 (0) |
| meaning | 61/67 (91%) | 57/67 (85%) | 4 | 2 | 29/31 (94%) | 2 (1) |
| page | 61/67 (91%) | 57/67 (85%) | 4 | 2 | 29/31 (94%) | 2 (1) |

## Meaning scores

Answerable: lowest 0.316 ("is GPT-4 overkill for sorting invoices"), median 0.661, highest 0.993.
No answer: highest 0.943 ("we need a new brand identity"), median 0.335.
Five lowest answerable: 0.316 "is GPT-4 overkill for sorting invoices"; 0.347 "why did you refuse gamification"; 0.401 "what about the right to be forgotten"; 0.409 "how do you align a business model with the user's interest"; 0.448 "our corporate lab takes a year to ship anything".
Five highest no-answer: 0.943 "we need a new brand identity"; 0.761 "do you do social media marketing"; 0.608 "which design system should we buy"; 0.574 "which design system should we buy"; 0.536 "how do we hire developers faster".

## What the page gets wrong

- wrong: "why did your first tool for non-experts fail" → "How do we improve a tool without making people learn something new?" → dowgo (0.52); wanted senz
- wrong: "why avoid frameworks and build steps" → "Why not just build a dashboard?" → dowgo (0.474); wanted autoflow
- wrong: "can privacy be guaranteed without trusting the company" → "Compliance keeps saying no. What would a yes look like?" → autoflow (0.487); wanted pebbble/vrooom
- missed: "what about the right to be forgotten" → no answer (0.401); wanted pebbble
- missed: "why did you refuse gamification" → no answer (0.347); wanted vrooom
- missed: "how do you align a business model with the user's interest" → no answer (0.409); wanted vrooom
- false answer: "we need a new brand identity" → "What do you not do?" → (say only) (0.866); wanted no answer
- false answer: "do you do social media marketing" → "What do you not do?" → (say only) (0.761); wanted no answer
- false answer: "how do I hire developers faster" → "Our innovation lab is too slow. How do we speed it up?" → senz (0.52); wanted no answer
- false answer: "which design system should we buy" → "How do we make a design system adoptable?" → senz (0.574); wanted no answer
- wrong: "we spend 3 months in workshops and still no prototype" → "Do you run workshops?" → contact (0.577); wanted "How do we stop debating ideas and start learning from them?"
- missed: "our corporate lab takes a year to ship anything" → no answer (0.448); wanted "Our innovation lab is too slow. How do we speed it up?"
- missed: "half the company wants change, the other half wants different change" → no answer (0.462); wanted "Everyone agrees something must change. Nobody agrees on what."
- missed: "is GPT-4 overkill for sorting invoices" → no answer (0.316); wanted "Do we even need a large language model for this?"
- wrong: "we need a new logo and visual identity" → "What do you not do?" → (say only) (0.661); wanted "Do you do logo design?"
- missed: "we need help with our SEO" → no answer (0.457); wanted "What do you not do?"
- false answer: "how do we hire developers faster" → "Our innovation lab is too slow. How do we speed it up?" → senz (0.536); wanted no answer
- false answer: "which design system should we buy" → "How do we make a design system adoptable?" → senz (0.608); wanted no answer
