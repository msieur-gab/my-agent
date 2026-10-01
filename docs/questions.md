# Questions the site should answer

Working log for the "ask me" landing page. Started 1 October 2026.

**How to use this file**
- Each theme lists real questions a visitor might ask, in their own words.
- "Candidate answer" is a first guess at which project or note could answer it. Check it, change it, or delete it.
- Fill the **Fit** column: **✓** answered by a project or note · **~** partly · **✗** nothing yet.
- ✗ rows are not failures. They show which notes to write next, or which themes to drop.

---

## Concept notes (decisions so far)

- **Opening line:** "I answer the questions nobody dares to ask." Then the visitor asks theirs, or picks a theme.
- **Answers come only from my own work** (projects, experiments, notes). No generated text. If nothing matches, the page says so honestly.
- **Format of an answer:** the brief → the question nobody asked → the answer → follow the full story.
- **Themes as a starting point:** predefined questions for visitors who don't want to type.
- **No answer = the conversion point.** Not having worked on a theme doesn't mean I have no ability or opinion on it. When nothing matches, the page invites the visitor to send me the question, already filled in, with their email. Ten replies, picked at random (drafts at the end of this file).
- **Crawlable:** all work and all notes live in plain folders with their own pages, listed on the home page for scanners, search engines and LLMs. See `site-foundation.md`.
- **Feel of the reply:** text should appear the way a conversation does, not all at once. To refine later.
- **Privacy:** no cookies. Store the question text only, with no IP, fingerprint or anything else. Say so on the page.
- **How the site works:** a short note on the page explaining that it's a one-purpose NLU interaction model, built to show what can be made without frontier models.
- **Matching:** keyword matching for now. Later, a small embedding model (MiniLM) in the browser to match by meaning, still extractive, with a similarity threshold that decides when to abstain.
- **Coverage:** the matching should search notes and writing too, not only projects.
- **Quiet index:** a "See all work" link to the full list of projects, experiments and notes, also readable by search engines.

---

## A. Ideas that never get tested
*Innovation, acceleration, letting teams test ideas faster.*

**Why it matters:** in a 2025 Forrester study for Mastercard, 87% of senior leaders struggle to balance innovation with risk, 80% believe small-scale testing would speed innovation up, and nearly 70% say aligning experimentation practices across the organisation is a major obstacle. The study's conclusion: innovation fails on how decisions are made, not on ideas.

| Question | Candidate answer | Fit |
|---|---|---|
| How can my team test an idea before we commit a budget? | Senz | |
| How do we stop debating ideas and start learning from them? | Senz | |
| Can people without a technical background build a prototype themselves? | Senz | |
| How do we make failing cheap enough that people dare to try? | Senz, note | |
| The board wants proof, not another deck. Where do we start? | Senz | |
| How do I give a team the freedom to experiment without losing control? | | |

## B. AI pilots that don't go anywhere

**Why it matters:** MIT found 95% of generative AI pilots deliver no measurable return. In PwC's 2026 CEO survey, 56% of CEOs saw neither revenue nor cost gains from AI, and 42% rank "are we transforming fast enough?" as their top concern. Gartner expects over 40% of agentic AI projects to be cancelled by the end of 2027.

| Question | Candidate answer | Fit |
|---|---|---|
| Our AI pilot worked in the demo. Why won't it work in the organisation? | Senz, note | |
| We've spent a year on AI. How do I show the board what it's worth? | | |
| Which of our AI ideas should we stop? | | |
| Should we build this ourselves or buy it? | | |
| Are we moving fast enough, or just moving? | note | |

## C. AI people can trust

**Why it matters:** nearly two-thirds of European insurers use generative AI, mostly still at proof-of-concept stage, and hallucinations are their top-cited risk (EIOPA, 2026). MIT found the organisations that succeed build "humble AI" that admits uncertainty.

| Question | Candidate answer | Fit |
|---|---|---|
| How do we use AI without it making things up in front of customers? | Brainboard, this site | |
| Can we have an AI that says "I don't know"? | Brainboard, this site | |
| How do we keep a human in control of the decision? | Babiban, note | |
| How do we explain an AI's answer to a customer or a supervisor? | DataDraw, Brainboard | |
| Do we even need a large language model for this? | Babiban, Brainboard, note on bounded AI | |

## D. Regulation that keeps saying no

**Why it matters:** among EU companies that considered AI but didn't adopt it, legal uncertainty is one of the main reasons (Eurostat). The AI Act deadlines moved on 27 July 2026: high-risk obligations now apply from December 2027 (standalone systems) and August 2028 (embedded systems), while the transparency rules still apply. Only 27% of surveyed companies felt fully ready for the European Accessibility Act (Evinced, 2025).

| Question | Candidate answer | Fit |
|---|---|---|
| Compliance keeps saying no. What would a yes look like? | DataDraw | |
| Is our use case high-risk under the AI Act, and what do we actually have to do? | note | |
| The deadlines moved. Do we pause or keep going? | note | |
| Can regulation be a design brief instead of a blocker? | DataDraw, note | |
| Is our product accessible enough for the new European rules? | | |

## E. Data protection and GDPR (for organisations)

**Why it matters:** data protection concerns and insufficient data quality are among the main barriers EU companies give for not adopting AI (Eurostat).

| Question | Candidate answer | Fit |
|---|---|---|
| Where does our personal data actually go? | DataDraw | |
| How do we make GDPR understandable to people outside legal? | DataDraw | |
| Can we build a useful feature without collecting personal data? | Brainboard, Pebbble | |
| Can the data stay on the user's device? | Brainboard, DataDraw | |
| Can we use our customer data with AI and stay GDPR-compliant? | DataDraw, note | |
| Can we keep our data in Europe and still use good tools? | Pebbble (storage), note | |

## F. Privacy for people
*The consumer side of data protection.*

**Why it matters:** 76.9% of EU internet users took steps to protect their personal data in 2025, and 58.8% refused the use of their data for advertising, both up since 2023 (Eurostat).

| Question | Candidate answer | Fit |
|---|---|---|
| Can I send a private message without a platform being able to read it? | Pigeon | |
| Can a product work without an account? | Pebbble, Brainboard | |
| Can my notes stay mine, on my own device? | Brainboard | |
| Can identity live with the person instead of on a server? | Symbios | |
| What happens to my data if the company disappears? | Pebbble | |

## G. Presence across distance
*Separated families, children far from a parent, child protection.*

**Why it matters:** European missing-children hotlines recorded 1,014 new international parental abduction cases in 2024, 16% of all their cases (Missing Children Europe). Across OECD countries, more than half of divorces involve at least one dependent child (OECD Family Database).
*Note: this theme touches personal ground. Decide how much of the personal story to tell on the site.*

| Question | Candidate answer | Fit |
|---|---|---|
| How can a child keep a parent's voice when they live apart? | Pebbble, Babiban | |
| How do I stay present for a child who lives far away? | Pebbble, Babiban, Tiptap | |
| How can a child reach a familiar voice without owning a phone? | Babiban | |
| How do I leave a message my child can only open years from now? | Pebbble | |
| How do you design for a child's safety when families are separated? | note | |

## H. Children and screens

**Why it matters:** in an EU survey published June 2026, adolescents spend 4.5 hours a day online on school days and over 6 at weekends, 9 in 10 report at least one negative symptom linked to screen use, and over half of parents believe screens harm young people's lives.

| Question | Candidate answer | Fit |
|---|---|---|
| Can digital play happen without a screen? | Vrooom, peg board | |
| Can a toy be connected without being addictive? | Vrooom, Pebbble | |
| How can kids use technology without more screen time? | Pebbble, Babiban, peg board | |
| How can a child say how they feel without an app? | peg board (Kyo / pilipala) | |
| Can technology hide inside an ordinary object? | Pebbble | |

## I. Product discovery without advertising

**Why it matters:** 58.8% of EU internet users refuse the use of their data for advertising (Eurostat, 2025). Personal recommendations remain the most trusted form of advertising (Nielsen, but that study is from 2015, so look for newer data).
*Evidence here is thin. Treat this theme as a hypothesis to test.*

| Question | Candidate answer | Fit |
|---|---|---|
| How do people discover a product without ads? | Vrooom / phygital games, Pebbble | |
| Can the object itself be how people find the product? | Pebbble, Vrooom | |
| Can we launch with a small handmade series and a community instead of an ad budget? | Vrooom / phygital games | |
| How do we grow without tracking users? | this site, Pebbble | |

## J. Stuck organisations and complexity
*Mostly from my own client patterns, not surveys.*

| Question | Candidate answer | Fit |
|---|---|---|
| Everyone agrees something must change. Nobody agrees on what. | Senz, note | |
| Our process has grown too complex. Where does the friction come from? | Dowgo | |
| We're raising. How do we get due diligence under control? | Dowgo | |
| Nobody in-house really understands this. Where do we start? | | |
| How do I explain this to my board in plain words? | DataDraw, note | |

## K. Curiosity questions
*For readers who aren't buying anything yet.*

| Question | Candidate answer | Fit |
|---|---|---|
| What happens when machine learning meets music and nature? | Human After All | |
| Can a computer be small, local and yours? | cyberdeck | |
| Is there a method to design? | note "Design Has No Method" | |
| Why do some tools disappear into the work? | note "The Quiet Tool" | |

---

## When nothing matches: replies that invite the question (drafts)

Each one is followed by the visitor's question, already filled in, an email field and a Send button.

1. I haven't built this one yet, but I have a view on it. Send me the question and I'll answer you myself.
2. Nothing in my work covers this yet. That doesn't mean I can't help. Tell me more?
3. That's a question I'd rather answer properly than guess at. Send it to me.
4. I haven't worked on exactly this. I'd like to hear why you're asking.
5. No project to show for that one, but I do have thoughts. Want them?
6. You've found a gap in my work. Send me the question and I'll answer it properly.
7. I'd be guessing if I showed you something now. Send it over and get a real answer.
8. Not something I've built yet. That's often where the interesting work starts.
9. I don't have a case study for this. I do have an opinion. Ask me directly.
10. That one's new here. Leave it with me and I'll reply personally.

---

## Sources

- [Mastercard: When innovation fails, it comes down to how decisions are made (Forrester study)](https://www.mastercard.com/us/en/news-and-trends/Insights/2026/when-innovation-fails-it-comes-down-to-how-decisions-not-ideas-are-made.html)
- [Forbes: MIT finds 95% of GenAI pilots fail](https://www.forbes.com/sites/jasonsnyder/2025/08/26/mit-finds-95-of-genai-pilots-fail-because-companies-avoid-friction/)
- [AI Magazine: What PwC's CEO Survey reveals about AI ROI](https://aimagazine.com/news/what-pwc-ceo-survey-reveals-about-roi-on-ai-investments)
- [BigDATAwire: Gartner predicts over 40% of agentic AI projects will be canceled by end of 2027](https://www.hpcwire.com/bigdatawire/this-just-in/gartner-predicts-over-40-of-agentic-ai-projects-will-be-canceled-by-end-of-2027/)
- [EIOPA: Survey on generative AI among Europe's insurers](https://www.eiopa.europa.eu/eiopa-survey-generative-ai-shows-swift-cautious-adoption-among-europes-insurers-2026-02-02_en)
- [Eurostat: 20% of EU enterprises use AI technologies](https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20251211-2)
- [EU Tech Loop: Why European businesses are not using AI tools (Eurostat barrier data)](https://eutechloop.com/why-european-businesses-are-not-using-ai-tools/)
- [White & Case: EU AI Omnibus enters into force](https://www.whitecase.com/insight-alert/eu-ai-omnibus-enters-force-amending-ai-act)
- [Evinced via PR Newswire: Most European companies not fully ready for the EAA](https://www.prnewswire.com/news-releases/new-report-reveals-most-european-companies-not-fully-ready-for-the-european-accessibility-act-302491468.html)
- [Eurostat: 76.9% of internet users protected their data in 2025](https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20260128-1)
- [Missing Children Europe: Figures and Trends 2024](https://missingchildreneurope.eu/wp-content/uploads/2025/05/Figures-Trends.pdf)
- [OECD Family Database: Family dissolution and children](https://webfs.oecd.org/els-com/Family_Database/SF_3_2_Family_dissolution_children.pdf)
- [European Commission: EU survey confirms link between screen time and wellbeing](https://commission.europa.eu/news-and-media/news/child-safety-online-eu-survey-confirms-link-between-screen-time-and-wellbeing-2026-06-16_en)
- [Research Live: Consumer trust in traditional advertising declines (Nielsen, 2015)](https://www.research-live.com/article/news/consumer-trust-in-traditional-advertising-declines-in-uk/id/4013938)
