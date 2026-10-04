# Intents

Things visitors ask that are about me or about what I do, not about a piece of work: where I am,
whether I'm free, what I don't do. One file per intent, written like a view.

- `answers:` the ways a visitor might ask it, in their words. Six to ten, as different from each other
  as you can make them: the page recognises a question by its closeness to one of these lines, so each
  new wording widens what it understands.
- The text is the reply, one or two short paragraphs.
- `form: true` (optional) opens the form to write to me under the reply.
- `next:` (optional) lists pieces, views or intents to offer after it, by file name.

An intent also keeps questions away from the work: without `services.md`, "we need a pitch deck" lands
on Senz, because Senz mentions a deck. With it, the page says what I do instead.

The three files here are drafts written by Claude to test the mechanism. Rewrite them in your words.
