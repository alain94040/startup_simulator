# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser-based educational startup simulation game. Players navigate from idea to the YC application, learning trade-offs between building, market research, and money. The game is an **iMessage-style chat sim**: characters (co-founders, advisors, customers, family, press) text the founder, and the player responds by picking reply chips. A run is a **five-chapter story on a fixed 25-week horizon** (see *The five chapters*). No build step, no dependencies — everything runs directly in the browser or Node.js.

This game is educational; the educational goals are in `GOALS.md`.

## The active codebase is `v2/`

The game was rebuilt from scratch as a **story-graph engine** and that redesign, under `v2/`, is the shipping game. **Do all new work in `v2/`.** The files at the repo root (`engine.js`, `roles/*.js`, `game.html`, `tests/`, `sim_proto.js`, …) are the **legacy v1** card-dealer engine — kept side-by-side, still runnable, but superseded. Don't edit v1 for new features; see *Legacy v1* at the bottom.

`v2/revamp.md` is the running design log of the rewrite (why we rebuilt, the engine ideas, the build passes, current status). Read it for background.

## Commands

Run from the repo root:

| Action | Command |
|--------|---------|
| Play | `open v2/game.html` (add `?seed=42` for a reproducible run) |
| Plain debug harness | `open v2/play.html` |
| Deterministic slice checks | `node v2/tests/test_slice.js` |
| Narrative checks / **primary regression suite** | `node v2/tests/test_narrative.js` |
| Scene-permutation test | `node v2/tests/test_scenes.js` |
| Pacing, win-rate & chapter-economy map | `node v2/tests/phase_map.js` |
| Strategy comparison | `node v2/tests/sim_strategies.js` |
| Behavior contracts | `node v2/tests/sim_behaviors.js` |

After editing `v2/engine.js`, `v2/world.js`, `v2/cast.js`, or any `v2/story/*.js`, just refresh the browser — no compilation. The browser loads each file via a `<script>` tag; Node loads them with `require` (see `v2/engine.js`'s `DEPS`).

## Architecture (`v2/`)

Separation of concerns is the whole point of the redesign: the engine holds no content and no DOM; content is organized **by storyline, not by character**.

- **`engine.js`** — the `Game` class: facts ledger + scheduler + effects + scenes. Pure logic, no DOM. Dual export: `module.exports = { Game }` (Node) / `window.V2Engine` (browser). Reads the `V2CAST` / `V2WORLD` / `V2STORY` globals in the browser, `require`s them in Node.
- **`cast.js`** — the character registry (who exists, unlock rule, stats). Just names, `unlock(s,e)`, `intro`, `type`, and simulation params (`skills`, `effortMult`, `passiveMult`, founder-only `milestones`). Export: `window.V2CAST` / `module.exports`. **Rail order = declaration order; `founder` stays last.**
- **`story/*.js`** — the content, one file **per storyline** (not per character). Each pushes a module `{ nodes?, arcs? }` onto `window.V2STORY` (browser) / `module.exports = mod` (Node). This is where all narrative text and node/arc definitions live.
- **`world.js`** — the weekly economy `tick(game)`: burn, passive co-founder effort, the over-scope build burn-down, launch conversion, growth, revenue, win/lose. Pure logic. Export: `window.V2WORLD` / `module.exports` (`{ tick, AUTO_BUILD_INCREMENT }`).
- **`scoring.js`** — the endgame report card. `scoreGame(game)` grades a run on 7 lessons (including "Keep the cap table clean" — the vesting lesson) by asking the facts ledger directly (`e.took()`, `"@ignored"` outcomes) rather than mining a log. Pure logic, dual export `window.V2Scoring` / `module.exports`. A never-faced category returns `score:null` — **except once the run is over**: at the deadline, an unreached spine lesson (never launched, never questioned the product) grades as a failure, not an exemption, so the card can't contradict the verdict. Safe to call in any game state (`test_narrative.js` smoke-checks it at every game end).
- **`game.html`** — the browser UI (the shipping surface). Self-contained inline CSS + JS; loads the engine, cast, world, story, and scoring via `<script>` tags. See *The UI* below.
- **`play.html`** — a plain debug harness UI (kept for quick inspection).
- **`tests/`** — `harness.js` (shared drivers + game loop + `jumpTo`, exports `V2Harness`), `test_slice.js`, `test_narrative.js`, `test_scenes.js`, `phase_map.js`, `sim_strategies.js`, `sim_behaviors.js` (the behavior-contract suite: strategy → consequence).

The content set: **~148 nodes, 19 cast, 5 scene arcs** across the `story/` files: `opening`, `equity`, `dev_plan`, `team`, `dev_directions`, `demo_night`, `users`, `launch_day`, `slide`, `pivot_day`, `community`, `fundraising`, `growth`, `jordan_arc`, `discovery`, `press`, `ambient`.

## The story graph: nodes, when-clauses, effects

The engine replaced v1's single-`urgency`-axis "cards" with an explicit dependency graph. Three ideas do all the work:

**1. Facts ledger.** Every node resolution is recorded: `resolved[nodeId] = { outcome, week, count }`. Being ignored is just another outcome (`"@ignored"`), so the ignored path is a queryable edge like any choice. There are **no `_done` flags or `*_week` stamps** — content asks:
`e.done(id)`, `e.outcome(id)`, `e.took("node:key1|key2")`, `e.weeksSince(id)`, `e.timesResolved(id)`.

**2. Node schema** (a story beat):
- `id`, `char` (whose thread it lands in), `from` (display sender), `text` (string or `(s,e,char)=>string`), optional `subtext`, `mockups`.
- `when { after, took, not, delay, if, cooldown }` — when it can surface. `after`: these nodes resolved (any outcome). `took`: these outcomes taken (`"a|b"` = OR of keys; an array entry = OR across specs). `not`: none of these taken. `delay`: weeks after the latest dep. `if(s,e,char)`: world-state escape hatch. `cooldown`: makes it recurring (re-eligible N weeks after last resolution; without it a node fires once).
- `choices[]` — each `{ key, label, reply?, if?, journal?, effects?, fx? }`. A per-option `if(s,e,char)` gates it (this is how the research-gated "C-options" appear only when the player has learned enough).
- `timeout { weeks, when, unless, effects, fx, say }` — the **ignore path**: resolves the node as `"@ignored"` when its patience runs out or its `if` window closes. No `timeout` = a standing offer that yields to higher-class nodes but never auto-resolves.
- `ambient: true` / `filler: true` — scheduler class (see below).

**3. One effects vocabulary** (a choice or a timeout carries `effects` data and/or an `fx(s,e,char)` escape hatch):
`{ cash, signal, marketFit, waitlist, users, customers, saas, flags, char{ morale, trust, effort, focus, flags }, say, schedule, scene }`. Cash deltas auto-log to `engine.ledger` (the Bank statement). `effects.schedule` queues a delayed consequence (`{ in, char?, say?, effects?, fx?, unless? }`), fired in `nextWeek()`. `effects.scene = arcId` enters a scene; `scene: null` exits it.

## Turn & surfacing model

**Turn = 1 week, 2 actions.** An action is answering one open node (`engine.act(nodeId, key)`). When both actions are spent the week auto-advances (`engine.nextWeek()`); the UI has no explicit End-week button except a fallback on ambient-only weeks.

**One open slot per character**, tracked in `engine.open[charId] = { nodeId, week }`. Surfacing happens in `_poll()` (constructor + `nextWeek()`, and mid-scene after each answer). **Scheduler — no urgency:** per character, pick the first eligible node by class then FIFO (earliest-eligible, then declaration order):
`scene beat > story beat > ambient > filler`.
An open node holds its slot until answered or its `timeout` fires. New messages appear at the week boundary — except **mid-scene**, where the next beat lands immediately.

**The horizon:** every run ends entering `s.deadline_week` (25) — YC applications close and the report card prints no matter what. Admission needs **both** the grade (`engine.gradeScore()` ≥ 80, a B+) **and** the traction bar (`launched && pivot_shipped && customers >= 1` — wise answers without a shipped company don't get funded). **Win:** YC acceptance (`s.ycAccepted`). **Lose:** rejection (`s.ycRejected`), never applying (`s.deadline_passed`), or cash hitting $0 first. **Starting cash** $10,000; **burn** `burnPerWeek = 500 + s.extra_burn` (recurring SaaS costs from build-vs-buy choices). The application beat lives on the `yc` thread from week `deadline_week - 3` (`story/fundraising.js`); the verdict letter is scheduled at submission and world.js is the mechanical backstop that ends every run.

## The five chapters

A run is five chapters, bounded by the same state transitions the to-do gauge reads — **demo → launch → pivot committed → v2 shipped → the deadline**:

| Ch | Goal | Climax |
|----|------|--------|
| 1 · Ship the demo | Become a real company: paperwork, the split, something a stranger can touch | Demo night (equity scene is the opening crisis, wk 2) |
| 2 · Get to launch | Launch before the waitlist and runway go cold | Launch day |
| 3 · Find out why they leave | Bank the evidence, then get both sides in a room | Pivot summit |
| 4 · Rebuild as v2 | Ship the pivot — and decide who's on the team for it (the Jordan arc) | v2 ships / the confrontation |
| 5 · Ace the application | Prove it before week 25: revenue, a channel, a clean cap table | The verdict |

Chapters have **no cinematic separation** — the scene arcs do that; the **☑ to-do gauge is the chapter guide** (one checklist + one goal line per chapter, in `game.html`'s `STAGES`). Design rules that hang off the chapters:

- **The early-game tension is build vs. market research.** Chapters 1–2 run action-saturated on purpose: research cards (community ladders, waitlist calls, Flare) compete with the build spine for the 2 actions — that split is what `fit` tracks. Check the balance with `phase_map.js`'s **chapter economy** table (every card classified build/research/team/money/growth) before adding cards to a chapter.
- **The Flare competitor arc is one beat per chapter** (`press.js`), phase-gated with 3-week windows that close at chapter boundaries. The design lesson: a competitor's news is devastating for morale (that's the text) but the right move is to steady the team and stay on the roadmap — copying is the trap (`s.copied_competitor`, scored under "Features won't save you"). Leaving a beat on read is harmless to the company; it just means nobody steadied Alex.

## Focus arcs (scenes)

An arc with `scene: { cast: [...] }` is a **war-room** (there are 5: `equity`, `demo`, `launch`, `pivot`). Entering it (`effects.scene = arcId`) makes only its cast surface, its beats free of action cost, re-polls after every answer so the talk flows in one sitting, and holds the rest of the world. Each beat is authored on its own character's thread — scenes are **not** one merged transcript.

The UI renders a scene as the **same iMessage chat, restricted to the room**: a conversation rail of just the participants, one private thread each, everything else blocked out. New messages in another participant's thread light a blue unread dot — the UI never auto-switches threads for the player. Beats are scoped to the sitting by the `scene` tag the engine stamps on their messages (`_show`/`_say`). Cinematics bookend a scene (staged fade-in enter/exit lines, per-arc accent). **Launch day** additionally gets a cinematic dark stage: the time-of-day sky walks the hours, and a big clock counts the minutes forward as `s.launch_time` advances.

## The UI (`v2/game.html`)

Self-contained. Three surfaces — **Messages** (rail · thread), **News Feed** (press/community posts you engage inline), and **Bank** (the ledger; opened from the clickable Runway gauge, not a tab). A persistent right column carries the **triage** ("Needs a call" / "When you have a minute" — your own moves you act on in-column) and the **journal mirror** (a read-only, handwritten-font recap of outcomes + milestone stamps). A header **☑ to-do gauge** is the chapter guide: one checklist + goal line per chapter (Ch 1 · Ship the demo → Ch 2 · Get to launch → Ch 3 · Find out why they leave → Ch 4 · Rebuild as v2 → Ch 5 · Ace the application), derived from the facts ledger + `s.items`; a second header gauge counts down to the week-25 YC deadline. The turn-end reveal is ordered: runway counts down → the journal inks in → iOS-style notifications buzz under a header bell → the active thread refreshes → changed stats pulse. Endgame shows the `V2Scoring` report card. Avatar colors/initials live in a `STYLE` map here — presentation, not engine state.

## Coding conventions

- 2-space indentation, double quotes, semicolons.
- **`engine.js` and `world.js` stay free of DOM** — all UI belongs in `game.html`. **All narrative text** (node text, option labels, `reply`/`journal`, intros, names, scene copy) belongs in `story/*.js` / `cast.js`, never the engine.
- Every content file must work in **both Node and browser**: the IIFE + `module.exports` / `window.V2*` (or `V2STORY.push`) pattern at the bottom of the file.
- `char` passed to a node is the **owning** character. A node that reasons about someone else reads them via `engine.cast.get('jordan')`.
- Guard "was this ever set" with `flags.x != null`, not `flags.x || 0` (the `|| 0` form conflates undefined with week 0).

## Instructions

When running regressions use `node v2/tests/test_narrative.js` — **keep realistic-play violations at 0** (fuzzer-only findings are documented at the top of that file; replay one with `--seed N --driver X`). After any balance-affecting change, check pacing, win rate, and the per-chapter card balance with `node v2/tests/phase_map.js` (it plays a second, randomized-attention cohort to separate "one tactic skips this card" from "structurally unanswerable"), run the behavior contracts with `node v2/tests/sim_behaviors.js` (**don't regress the 28 passing contracts**; the 3 documented failures are open balance TODOs — see `v2/revamp.md` Pass 5c), and confirm scenes still exit cleanly with `node v2/tests/test_scenes.js`. New story nodes must be classified in `phase_map.js`'s `CATEGORY` table (unclassified ids are flagged in its output).

## Legacy v1 (repo root)

The root `engine.js` (`Engine` class, single-`urgency` card dealer), `roles/*.js` (one file per character, `cards`/`voice`/`slice`), `game.html`, `scoring.js`, `sim_proto.js`, and root `tests/` are the **previous version**, superseded by `v2/` and no longer developed. They still run (`open game.html`, `node sim_proto.js 1000`), and `v2/revamp.md` explains what changed and why. The card-based tools `earlymap.js`, `treemap.js`, `test_card_balance.js`, `test_redesign.js`, and the files `startup_game.html`, `ui.js`, `tests.js`, `tests.html` are dead even against v1. Don't build on any of this.
