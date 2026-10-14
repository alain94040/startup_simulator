# Startup Simulator — PlusOne

A browser-based educational game about the first 25 weeks of a startup. You text with your
co-founders, early users, advisors, family and the press, and you answer by tapping reply chips.
Every choice is recorded in a founder's journal, and at week 25 a report card grades what you
actually did.

You are building **PlusOne**, a dating app for people sick of swiping. You have **$10,000**,
**two moves a week**, and **25 weeks** to get into Y Combinator.

**Play it:** `open game.html` (no build step, no dependencies, no server).

> The story of how and why it was made: [The making of a startup simulator](https://foundrs.com/the-making-of-a-startup-simulator.html)

---

## Why it exists

The game is a follow-up to a popular startup equity calculator. It aims to teach new founders
the mistakes that sink early startups by letting them make those mistakes in a safe place.

Lessons (full list in [`GOALS.md`](GOALS.md)):

- **Hard conversations.** An equity split can't leave everyone happy, and a co-founder you
  neglect drifts away. At some point you will have to let Jordan go.
- **Money.** Without early money from friends and family you go bankrupt before launch.
  Most consultants who reach out want your money, not to help you.
- **Lean plans and market fit.** Only a lean plan can win, and only talking to real users
  unlocks better options. The first product won't fit the market, so a pivot is required.
- **Clean cap table.** Sign the equity split. Buy back a departed co-founder's unvested stake.

## The design ideas

- **Attention is the constraint.** Each week you can answer only two of the messages waiting
  for you, which recreates the overwhelm of a real startup. Being ignored is a real outcome
  that the story branches on.
- **Story over simulation.** Earlier versions modeled the company in depth and weren't fun.
  Text threads with people you come to know are easier to remember than a dashboard of numbers.
- **Rooms.** The equity fight, demo night, launch day, the pivot night and the firing play as
  fast scenes. Entering one costs a move and the whole conversation is free after that.
- **Failure is evidence.** A wrong fix (a traffic push, a feature spree) banks a fact that
  becomes a playable argument later. The pivot night and the final report card are answered
  with whatever your run actually banked.

## The five chapters

| Ch | Goal | Climax |
|----|------|--------|
| 1 · Ship the demo | Become a real company: paperwork, the equity split, something a stranger can touch | Demo night |
| 2 · Get to launch | Launch before the waitlist and runway go cold | Launch day |
| 3 · The trough of sorrow | The graph only goes down. Try the quick fixes, watch them fail, bank the evidence | The pivot night |
| 4 · Rebuild as v2 | Ship the pivot, and decide who builds it | The relaunch |
| 5 · Make the case | Prove it before week 25: revenue, a channel, a clean cap table | The deadline and the verdict |

**Win:** 75 or better out of 100 on the report card *and* a shipped, pivoted company.
**Lose:** miss that bar at week 25, run out of cash, or lose your technical co-founder.

---

## Running it

```
open game.html            # the game
open game.html?seed=42    # a reproducible run
open play.html            # plain debug harness, for inspecting state
```

After editing any source file, refresh the page. `leaderboard.php` is an optional top-50
board (PHP and a writable `score/` directory, no database). Without it the game keeps a local
board in `localStorage`, so it works from `file://`.

## How it's built

Plain JavaScript, loaded by `<script>` tags in the browser and by `require` in Node.

```
engine.js     Story-graph engine: facts ledger, scheduler, effects, scenes. No DOM, no content.
cast.js       The character registry.
world.js      The weekly economy: burn, co-founder effort, conversion, growth, win/lose.
scoring.js    The report card: 100 points of moments across 3 lessons, off the facts ledger.
story/        All narrative content, one file per storyline.
game.html     The game UI (iMessage-style chat, desktop and phone layouts).
play.html     Plain debug UI.
tests/        Headless simulation and regression tools.
```

## Tests and tools

```
node tests/test_narrative.js    # primary regression suite
node tests/test_slice.js        # deterministic engine + content checks
node tests/test_scenes.js       # every path through every scene exits cleanly
node tests/sim_behaviors.js     # strategy → designed consequence contracts
node tests/phase_map.js         # pacing, win rate, per-chapter card balance
node tests/sim_strategies.js    # strategy comparison
node tests/transcript.js        # read a run as a screenplay (--compact, --driver, --char, --audit)
node tests/transcript.js --sample --html book.html   # the typical runs, as a page
```

## More docs

| File | What it is |
|------|------------|
| [`CLAUDE.md`](CLAUDE.md) | Codebase guide: architecture, story-graph model, conventions |
| [`GOALS.md`](GOALS.md) | The lessons the game teaches |
| [`characters.md`](characters.md) | Character bible and dialogue rules |
| [`revamp.md`](revamp.md) | Design log for the story-graph engine |
| [`reading_the_game.md`](reading_the_game.md) | Background on the transcript tool |

Most of the code and card text was written with AI. The creative direction, taste and
curation are the author's.
