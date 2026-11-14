# Dialogue de-AI-ing: proposed edits

Nine minimal edits — each replaces only the aphoristic tail of a line, leaving
everything else untouched. No test asserts on any of these strings
(verified with a grep of `tests/`, `scoring.js`, `engine.js`), so all are safe.

Rejected categories can be dropped wholesale.

## Why

The feedback is that some dialogue reads too much like AI. The smell
concentrates in three places, not in the character messages (which are mostly
well written):

1. **Slogans** — Priya's "'then nothing' is the whole ballgame" violates
   `characters.md` ("No slogans. … If a line needs decoding, rewrite it."),
   and it appears 3× so it reads like a catchphrase.
2. **Alex's podcast-isms** — Alex is a CTO, not a startup podcaster. Per his
   bible he should end on a fact or a question, never a maxim.
3. **The founder-journal couplet** — a setup sentence, then a punchline that
   restates it as a maxim ("The leak isn't at the top.", "you're not learning,
   you're guessing."). The tell of the whole corpus.

## Category A — Priya's "ballgame" (3 places, must change together)

| File | Current | Suggested |
|------|---------|-----------|
| `story/slide.js:251` | `"'then nothing' is the whole ballgame. when you're ready to take that seriously, i'll clear a saturday."` | `"'then nothing' is the whole problem. when you're ready to take that seriously, i'll clear a saturday."` |
| `story/slide.js:250` (journal) | `She said 'then nothing' is the whole ballgame, and offered to clear a Saturday.` | `She said 'then nothing' is the whole problem, and offered to clear a Saturday.` |
| `story/slide.js:252` (fx) | `"'Then nothing' is the whole ballgame, she said. She's ready to clear a Saturday."` | `"'Then nothing' is the whole problem, she said. She's ready to clear a Saturday."` |

## Category B — Alex's podcast-isms (2 places)

| File | Current | Suggested |
|------|---------|-----------|
| `story/slide.js:129` | `"that's the correct question. most founders ask the other one."` | `"that's the question i was going to ask you friday."` |
| `story/slide.js:145` | `"ran the re-blast plus a post in two local subreddits. five signups. cost us two days. the leak isn't at the top."` | `"ran the re-blast plus a post in two local subreddits. five signups. cost us two days. they're already gone."` |

(`slide.js:153`'s fx also ends with "The leak isn't at the top." — but that's
the *founder's* journal, where the metaphor is acceptable, so leave it.)

## Category C — the founder-journal aphorisms (4 places)

| File | Current tail | Suggested tail |
|------|-------------|----------------|
| `story/slide.js:198` | `…It's not that we don't know. It's that the number is now too big to un-know.` | `…The number's too big to un-know now.` (or delete the last sentence) |
| `story/slide.js:321` | `…The graph didn't move — you're not learning, you're guessing.` | `…The graph didn't move.` |
| `story/slide.js:350` | `…The email worked. The product didn't. That's not a marketing finding, that's a verdict.` | `…The email worked. The product didn't.` |
| `story/users.js:62` | `…It's the density lesson wearing a new shirt: own one neighborhood before you promise the whole map.` | `…Same lesson as the empty room, different app.` (or delete the last sentence) |

## Deliberately not touching

- **The founder's equity replies** (`equity.js:476, 500, 512`). Long and
  articulate, yes — but they're the climactic ruling of the arc and the chip
  label already carries the intent. Shortening them is a bigger tone call;
  do it in a separate pass if wanted.
- **`story/pivot_day.js:463`** ("The lean lesson, learned twice") and
  **`:636/638`** ("That's the whole pivot in one notification") — both mild;
  the Maya one is a genuine emotional beat that earns its keep. Only touch
  these if the pass should be more aggressive.

## After applying

- `node tests/test_narrative.js` — keep realistic-play violations at 0
- Skim the changed lines in context: `node tests/transcript.js --compact`
  (the founder's replies and ✎ jots are the surfaces to re-read)
