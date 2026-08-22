# Startup Simulator — PlusOne

A browser-based educational game about the first 25 weeks of a startup, from idea to the YC
application. It plays as an **iMessage-style chat sim**: your co-founders, early users,
advisors, family, and the press text you, and you answer by picking reply chips. What each
choice cost you is recorded in a founder's journal.

You are building **PlusOne**, a dating app for people sick of swiping. You have **$10,000**,
**two moves a week**, and **25 weeks** until YC applications close.

A full run is 25 weeks at two moves each — about fifty decisions in one sitting.
**Win:** get into YC. **Lose:** get rejected, never apply, or run out of cash first.

---

## Playing

```
open game.html            # the game
open game.html?seed=42    # a reproducible run
open play.html            # plain debug harness, for inspecting state
```

No build step, no dependencies, no server. After editing any source file, refresh the page.

`leaderboard.php` is an optional server-side top-50 board (PHP + a writable `score/`
directory, no database). Without it the game keeps a local board in `localStorage`, so it is
fully playable from `file://`.

---

## How it plays

- **Turn = 1 week, 2 actions.** An action is answering one open message. Spend both and the
  week advances on its own.
- **One open message per person.** Each character holds at most one open card; new messages
  arrive at the week boundary.
- **You can't answer everyone.** Two moves a week means threads pile up. Leave someone hanging
  and the moment resolves without you — a co-founder's morale slips, an offer expires, a card
  quietly closes. Being ignored is a real outcome the story branches on, not a null.
- **Rooms cost one move and buy the whole conversation.** The equity fight, demo night, launch
  day, pivot day, the firing, the application — each is a *scene*: entering it costs one of your
  two moves, and every beat inside it is free.
- **The journal** records what happened in the founder's own voice, with milestone stamps
  (Incorporated, Launched, Shipped v2, …).

Cash starts at **$10,000** and burns **$500/week**, plus whatever recurring SaaS you bought
along the way. Co-founders contribute passively each week depending on what they're focused on.

---

## The five chapters

A run is one five-chapter story, bounded by what you actually do — not by a script:

| Ch | Goal | Climax |
|----|------|--------|
| 1 · Ship the demo | Become a real company: paperwork, the equity split, something a stranger can touch | Demo night |
| 2 · Get to launch | Launch before the waitlist and the runway go cold | Launch day |
| 3 · The trough of sorrow | The graph only goes down. Try the quick fixes, watch them fail, bank the evidence | Pivot summit |
| 4 · Rebuild as v2 | Ship the pivot — and decide who is on the team for it | The relaunch / the firing |
| 5 · Ace the application | Prove it before week 25: revenue, a channel, a clean cap table | The application → the verdict |

Admission needs **both** a good report card and real traction — wise answers without a shipped
company don't get funded. The lessons the game is built to teach are in `GOALS.md`.

---

## Directory structure

```
game.html     The game UI, self-contained (inline CSS + JS). Three surfaces — Messages
              (rail · thread), News Feed, and Bank — plus a persistent triage column and
              the journal mirror. Loads everything below via <script> tags.
play.html     Plain debug harness UI, for inspecting state quickly.

engine.js     The story-graph engine: the facts ledger, the scheduler, effects, and scenes.
              Pure logic, no DOM, no content.
cast.js       The character registry — who exists, how they unlock, their simulation stats.
world.js      The weekly economy tick: burn, co-founder effort, conversion, growth, revenue,
              win/lose.
scoring.js    The endgame report card: 7 lessons, graded off the facts ledger.

story/        All narrative content, one file per storyline (not per character):
              opening, equity, dev_plan, team, dev_directions, demo_night, users,
              launch_day, slide, pivot_day, community, fundraising, growth, jordan_arc,
              firing, discovery, press, ambient.

tests/        Headless simulation tools (see below).
leaderboard.php  Optional top-50 board. No database — a JSON file under score/.

CLAUDE.md     The codebase guide. Read this before changing anything.
GOALS.md      The educational lessons the game is built to teach.
revamp.md     Design log for the story-graph engine — why it is built this way.
reading_the_game.md  Background on the transcript tool.
```

Every source file works in both Node and the browser: the browser loads it with a `<script>`
tag, Node `require`s the same file.

---

## Running the tests

```
node tests/test_narrative.js    # primary regression suite (narrative-consistency fuzzer)
node tests/test_slice.js        # deterministic engine + content checks
node tests/test_scenes.js       # every path through every scene must exit cleanly
node tests/sim_behaviors.js     # behavior contracts: strategy → designed consequence
node tests/phase_map.js         # pacing, win rate, per-chapter card balance
node tests/sim_strategies.js    # strategy comparison table
```

And the one that shows you the game instead of statistics about it:

```
node tests/transcript.js                        # read a run as a screenplay
node tests/transcript.js --compact              # one line per beat
node tests/transcript.js --driver no_pivot      # play it as a named archetype
node tests/transcript.js --char alex            # one relationship, in context
node tests/transcript.js --sample --html book.html   # the typical runs, as a page
node tests/transcript.js --audit                # narrative smells across archetypes
```

---

## Key mechanics

**Attention is the constraint.** Two moves a week is the whole design. Every card competes for
them, and the early game deliberately runs saturated: the build spine competes with market
research, and how you split them is what the game measures.

**Facts, not flags.** Every answer (including every non-answer) is recorded in a ledger, and
later content asks that ledger directly — what you did in week 4 is what makes an option
available in week 18.

**Failure is evidence.** The wrong fix is never purely punished. The traffic push, the feature
spree, the win-back blast each bank something that becomes a playable argument later. The two
exams — pivot day and the YC application — are answered with whatever the run actually banked.
A bluff is always available. Whether you need it is the game.

**Cash and burn.** $10,000, $500/week, plus recurring costs you signed up for. Hitting $0 ends
the run.
