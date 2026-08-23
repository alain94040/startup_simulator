# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser-based educational startup simulation game. Players navigate from idea to the YC application, learning trade-offs between building, market research, and money. The game is an **iMessage-style chat sim**: characters (co-founders, advisors, customers, family, press) text the founder, and the player responds by picking reply chips. A run is a **five-chapter story on a fixed 25-week horizon** (see *The five chapters*). No build step, no dependencies — everything runs directly in the browser or Node.js.

This game is educational; the educational goals are in `GOALS.md`.

## Layout

Everything lives at the repo root — the engine (`engine.js`, `world.js`, `cast.js`, `scoring.js`), the content (`story/*.js`), the UI (`game.html`, `play.html`), and the simulation tools (`tests/`). There is no build step and no dependency tree: the browser loads the sources directly, Node `require`s the same files.

`revamp.md` is the design log for the story-graph engine — why it is shaped this way, the build passes, current status. It is the record of a rewrite, so it argues against an older card-dealer engine that no longer exists in the repo; read it for background on the design decisions.

## Commands

Run from the repo root:

| Action | Command |
|--------|---------|
| Play | `open game.html` (add `?seed=42` for a reproducible run) |
| Plain debug harness | `open play.html` |
| Deterministic slice checks | `node tests/test_slice.js` |
| Narrative checks / **primary regression suite** | `node tests/test_narrative.js` |
| Scene-permutation test | `node tests/test_scenes.js` |
| Pacing, win-rate & chapter-economy map | `node tests/phase_map.js` |
| Strategy comparison | `node tests/sim_strategies.js` |
| Behavior contracts | `node tests/sim_behaviors.js` |
| **Read a run as a story** | `node tests/transcript.js` (`--compact`, `--driver <archetype>`, `--char alex`, `--src`) |
| The typical stories, as a page | `node tests/transcript.js --sample --html book.html` |
| Narrative smells across archetypes | `node tests/transcript.js --audit` |

After editing `engine.js`, `world.js`, `cast.js`, or any `story/*.js`, just refresh the browser — no compilation. The browser loads each file via a `<script>` tag; Node loads them with `require` (see `engine.js`'s `DEPS`).

## Architecture

Separation of concerns is the whole point of the redesign: the engine holds no content and no DOM; content is organized **by storyline, not by character**.

- **`engine.js`** — the `Game` class: facts ledger + scheduler + effects + scenes. Pure logic, no DOM. Dual export: `module.exports = { Game }` (Node) / `window.Engine` (browser). Reads the `CAST` / `WORLD` / `STORY` globals in the browser, `require`s them in Node.
- **`cast.js`** — the character registry (who exists, unlock rule, stats). Just names, `unlock(s,e)`, `intro`, `type`, and simulation params (`skills`, `effortMult`, `passiveMult`, founder-only `milestones`). Export: `window.CAST` / `module.exports`. **Rail order = declaration order; `founder` stays last.**
- **`story/*.js`** — the content, one file **per storyline** (not per character). Each pushes a module `{ nodes?, arcs? }` onto `window.STORY` (browser) / `module.exports = mod` (Node). This is where all narrative text and node/arc definitions live.
- **`world.js`** — the weekly economy `tick(game)`: burn, passive co-founder effort, the over-scope build burn-down, launch conversion, growth, revenue, win/lose. Pure logic. Export: `window.WORLD` / `module.exports` (`{ tick, AUTO_BUILD_INCREMENT }`).
- **`scoring.js`** — the endgame report card. `scoreGame(game)` grades a run on 7 lessons (including "Keep the cap table clean" — the vesting lesson) by asking the facts ledger directly (`e.took()`, `"@ignored"` outcomes) rather than mining a log. Pure logic, dual export `window.Scoring` / `module.exports`. A never-faced category returns `score:null` — **except once the run is over**: at the deadline, an unreached spine lesson (never launched, never questioned the product) grades as a failure, not an exemption, so the card can't contradict the verdict. Safe to call in any game state (`test_narrative.js` smoke-checks it at every game end).
- **`game.html`** — the browser UI (the shipping surface). Self-contained inline CSS + JS; loads the engine, cast, world, story, and scoring via `<script>` tags. See *The UI* below.
- **`play.html`** — a plain debug harness UI (kept for quick inspection).
- **`tests/`** — `harness.js` (shared drivers + game loop + `jumpTo` + the 16 player **archetypes** (`STRATEGIES`), exports `Harness`), `test_slice.js`, `test_narrative.js`, `test_scenes.js`, `phase_map.js`, `sim_strategies.js`, `sim_behaviors.js` (the behavior-contract suite: strategy → consequence), `transcript.js` (the story reader — see below).
- **`transcript.js`** — the only tool that shows the *run* rather than statistics about runs: it replays a headless playthrough as a screenplay, merging all 19 threads into one stream by the engine's `seq` stamp. It renders each entry on **the surface `game.html` would put it on** — Messages bubble, News Feed post (`FEED`), the "Your move" card (`SELF` = founder/growth, whose node text is never a bubble), or the journal mirror — and flags in red anything the UI displays nowhere. Prints the chosen option **and the ones passed over**, chapter/scene/week seams (a chapter banner landing mid-scene is held until the room empties), `⌛` timeouts, and the report card; `--src` tags every beat with `story/<file>:<line>`. `--sample` reads one representative run per archetype (the *median* run by grade for the seed-varying ones), `--html` writes a self-contained readable page, `--audit` reports narrative smells (prose never surfaced, branches no driver takes, **text the UI displays on no surface**, messages landing after the run is over, silent weeks, repeated journal lines). **When you change how `game.html` routes threads to surfaces, update `FEED`/`SELF`/`uiSurface()` in `transcript.js` to match** — they're kept in sync by name, not by import. Background and the ideas not built: `reading_the_game.md`.

The content set: **~178 nodes, 19 cast, 7 arcs (6 of them scenes)** across the `story/` files: `opening`, `equity`, `dev_plan`, `team`, `dev_directions`, `demo_night`, `users`, `launch_day`, `slide`, `pivot_day`, `community`, `fundraising`, `growth`, `jordan_arc`, `firing`, `discovery`, `press`, `ambient`.

## The story graph: nodes, when-clauses, effects

The engine replaced v1's single-`urgency`-axis "cards" with an explicit dependency graph. Three ideas do all the work:

**1. Facts ledger.** Every node resolution is recorded: `resolved[nodeId] = { outcome, week, count }`. Being ignored is just another outcome (`"@ignored"`), so the ignored path is a queryable edge like any choice. There are **no `_done` flags or `*_week` stamps** — content asks:
`e.done(id)`, `e.outcome(id)`, `e.took("node:key1|key2")`, `e.weeksSince(id)`, `e.timesResolved(id)` — and `e.chapter` (1–5, derived from the same transitions the to-do gauge reads). A card that belongs to an era gates on the chapter (`if: (s, e) => e.chapter === 3`) instead of re-deriving the flag combination; note the growth/deferred paths skip chapter 4, and a late pivot re-enters it.

**2. Node schema** (a story beat):
- `id`, `char` (whose thread it lands in), `from` (display sender), `text` (string or `(s,e,char)=>string`), optional `subtext`, `mockups`.
- `when { after, took, not, delay, if, cooldown }` — when it can surface. `after`: these nodes resolved (any outcome). `took`: these outcomes taken (`"a|b"` = OR of keys; an array entry = OR across specs). `not`: none of these taken. `delay`: weeks after the latest dep. `if(s,e,char)`: world-state escape hatch. `cooldown`: makes it recurring (re-eligible N weeks after last resolution; without it a node fires once).
- `choices[]` — each `{ key, label, reply?, replyTo?, if?, journal?, effects?, fx? }`. `reply` lands as an outgoing bubble in the answering character's thread; `replyTo: "<charId>"` sends it to a different thread instead — which is what a decision made on the founder's own "Your move" card needs, since the founder thread renders no bubbles at all. A per-option `if(s,e,char)` gates it (this is how the research-gated "C-options" appear only when the player has learned enough).
- `timeout { weeks, when, unless, effects, fx, say }` — the **ignore path**: resolves the node as `"@ignored"` when its patience runs out or its `if` window closes. Window closure is swept at the week boundary **and after every act** (outside scenes), so an action that moots other open cards — flipping the launch switch — clears them from the triage immediately. No `timeout` = a standing offer that yields to higher-class nodes but never auto-resolves (and is quietly withdrawn, unresolved, when its window closes).
- `ambient: true` / `filler: true` — scheduler class (see below). No content uses `filler` any more: the one card that did was a "quiet stretch, no fires" placeholder that sat in the triage from week 1 of every run, and it was retired (see *No dead air*). The class stays in the engine as the tier below ambient.

**3. One effects vocabulary** (a choice or a timeout carries `effects` data and/or an `fx(s,e,char)` escape hatch):
`{ cash, signal, marketFit, waitlist, users, customers, saas, flags, char{ morale, trust, effort, focus, flags }, say, schedule, surface, scene }`. Cash deltas auto-log to `engine.ledger` (the Bank statement). `effects.schedule` queues a delayed consequence (`{ in, char?, say?, effects?, fx?, unless? }`), fired in `nextWeek()`. `effects.surface = "<nodeId>"` pulls a named node into the **current** week — the opt-in exception to the boundary rule, for a beat an answer directly causes (filing the incorporation is what makes the split a live question, so Jordan's opener lands the same week). `effects.scene = arcId` enters a scene; `scene: null` exits it.

## Turn & surfacing model

**Turn = 1 week, 2 actions.** An action is answering one open node (`engine.act(nodeId, key)`). When both actions are spent the week auto-advances (`engine.nextWeek()`); the UI has no explicit End-week button except a fallback on ambient-only weeks.

**One open slot per character**, tracked in `engine.open[charId] = { nodeId, week }`. Surfacing happens in `_poll()` (constructor + `nextWeek()`, and mid-scene after each answer). **Scheduler — no urgency:** per character, pick the first eligible node by class then FIFO (earliest-eligible, then declaration order):
`scene beat > story beat > ambient > filler`.
An open node holds its slot until answered or its `timeout` fires. New messages appear at the week boundary — with two exceptions: **mid-scene**, where the next beat lands immediately, and a beat a choice names with **`effects.surface`**, which lands the moment that choice is answered. A scene also *displaces* whatever its cast had open; those cards are handed straight back when the room empties (`_restoreDisplaced`), so a sitting that opens and closes inside one week still owes the player its two actions.

**The horizon:** every run ends entering `s.deadline_week` (25) — YC applications close and the report card prints no matter what. Admission needs **both** the grade (`engine.gradeScore()` ≥ 80, a B+) **and** the traction bar (`launched && pivot_shipped && customers >= 1` — wise answers without a shipped company don't get funded). **Win:** YC acceptance (`s.ycAccepted`). **Lose:** rejection (`s.ycRejected`), never applying (`s.deadline_passed`), cash hitting $0, or **losing Alex** (`s.cofounder_left`) — neglecting the technical co-founder until he takes the other offer ends the run on the spot, like bankruptcy. One founder cannot build, launch, pivot and sell inside the horizon, so there is no solo mode; the report card prints immediately and grades accordingly. **Starting cash** $10,000; **burn** `burnPerWeek = 500 + s.extra_burn` (recurring SaaS costs from build-vs-buy choices). The application beat lives on the `yc` thread from week `deadline_week - 3` (`story/fundraising.js`); the verdict letter is scheduled at submission and world.js is the mechanical backstop that ends every run.

## The five chapters

A run is five chapters, bounded by the same state transitions the to-do gauge reads — **demo → launch → pivot committed → v2 shipped → the deadline**:

| Ch | Goal | Climax |
|----|------|--------|
| 1 · Ship the demo | Become a real company: paperwork, the split, something a stranger can touch | Demo night (equity scene is the opening crisis, wk 2) |
| 2 · Get to launch | Launch before the waitlist and runway go cold — and **end on a marketing decision** (the splash is planned before the switch flips) | Launch day |
| 3 · The trough of sorrow | The graph only goes down; try the quick fixes, watch them fail, bank the evidence | Pivot summit |
| 4 · Rebuild as v2 | Ship the pivot — and decide who's on the team for it (the Jordan arc) | v2 relaunch (on a chosen stage) / the firing scene |
| 5 · Ace the application | Prove it before week 25: revenue, a channel, a clean cap table | The application scene → the verdict |

Chapters have **no cinematic separation** — the scene arcs do that; the **☑ to-do gauge is the chapter guide** (one checklist + one goal line per chapter, in `game.html`'s `STAGES`).

### Chapter design philosophy

- **Every chapter has the same shape: a felt problem → a loop the player plays → banked consequences → one climax.** The problem must be *visible in the numbers the player watches* (users, runway), not just narrated; the loop is real decisions competing for the 2 actions; the climax is a scene or a decision card that cashes in what the loop banked. A chapter that is only messages ("the graph is bad", with nothing falling and nothing to try) is the failure mode the story-graph rewrite exists to avoid.
- **Chapters are state, not script.** A chapter is defined by its entry/exit transitions, derived from the facts ledger — `e.chapter` is the one source of truth. Nothing "advances the chapter"; play does. Corollary: chapters aren't strictly linear — the growth/deferred summit paths skip chapter 4 entirely, and a late pivot (the fifty-match verdict) re-enters it. Wrong turns stay playable: a bad summit call is winnable at a price (less cash, lower grade, a compressed rebuild), and only refusing the lesson twice (`ride`) is a dead end.
- **Every card belongs to an era.** Gate it on `e.chapter` (plus whatever moment-specific state it needs) rather than an ad-hoc flag pile, and give it a window that closes when its era ends — the engine sweeps window-closed cards out of the triage at act time, so "flip the switch" instantly clears the pre-launch pile. A card that can legitimately span chapters (Flare, money, `founder_codebuild`) must read correctly in *every* chapter it can surface in; branch its text on state if it doesn't. When touching gates, re-run the lingering audit: simulate several styles, snapshot `openActions()` after every act and at every chapter transition, and eyeball each survivor.
- **The trough is scripted, not simulated.** Chapter 3's premise is that the player built the wrong product, so retention is bad *no matter what* — `world.js` drains users toward a floor of diehards each week, and only the shipped pivot turns the curve. There is no retention model to optimize; there is a story fact to discover. Growth actions during the trough still land — as one-week bumps that visibly evaporate, which *is* the lesson (top-of-funnel can't fix a leaky product).
- **Failure is evidence.** Trying the wrong fix is never purely punished: the traffic push, the feature spree, and the win-back blast each bank a flag that becomes a playable chip later. This is the game's core currency — **facts banked in one chapter become the chips of a later exam**. There are two exams: pivot day (chapter 3's climax, arguing Alex off his whiteboard) and the YC application (chapter 5's, a scene where the three real questions are answered with whatever the run actually banked — Maya's quote, the cohort, the failed fixes, the channel tests). A bluff option always exists; whether you *need* it is the whole game. New evidence sources should plug into one of these two sinks, or they're trivia.
- **Chapters end on decisions, not events.** Ch 2 ends choosing the splash before the switch; Ch 4 ends choosing the relaunch stage (Sarah's event / the press second-bite / a quiet update); Ch 5 ends choosing what to write. The mechanical transition (launch, ship, submit) should always arrive *through* a player call, so the boundary is something they did, not something that happened to them.
- **The early-game tension is build vs. market research.** Chapters 1–2 run action-saturated on purpose: research cards (community ladders, waitlist calls, Flare) compete with the build spine for the 2 actions — that split is what `fit` tracks. Check the balance with `phase_map.js`'s **chapter economy** table (every card classified build/research/team/money/growth) before adding cards to a chapter — chapter 4's rebuild is on-screen beats (scope call, beta invite, the Jordan arc) precisely so the mid-game never goes silent. (`phase_map`'s "quiet weeks (≤1 action)" sits around 4%, and all of it is week 2 in every run: the week-start triage holds only the incorporation card, and answering it opens the equity sitting mid-week. It is the densest week in the game, not a quiet one — the metric counts cards at the week boundary. The real floor is the invariant below.)

- **No dead air: every live week offers at least one answerable card.** This is a hard invariant, checked as **Layer C** of `test_narrative.js` across all 16 archetypes, and any hit fails the build regardless of driver. It used to be papered over by a filler card (`founder_reflect`, "a quiet stretch. no fires, no urgent asks") that surfaced on weeks 1 and 2 of *every* run — weeks that are anything but quiet — because the scheduler's class ordering is **per character** and the founder's own thread had nothing else on it. Deleting it exposed the real holes, which were all one story: a run whose build spine had stalled, where every window had closed and no beat was left to say so. They are covered by three backstop cards (`demo_stall`, `launch_stall`, `scope_grind` — all **ambient**, so a backstop can never outrank the spine it exists to restart, and all **standing offers with no timeout**, because a card that resolves itself leaves a hole on the week it resolves). `game.html`'s `scheduleTurn()` carries the player through a hole if one ever appears; the invariant is what keeps one from appearing.
- **The Flare competitor arc is one beat per chapter** (`press.js`), phase-gated with 3-week windows that close at chapter boundaries. The design lesson: a competitor's news is devastating for morale (that's the text) but the right move is to steady the team and stay on the roadmap — copying is the trap (`s.copied_competitor`, scored under "Features won't save you"). Leaving a beat on read is harmless to the company; it just means nobody steadied Alex.

## Focus arcs (scenes)

An arc with `scene: { cast: [...] }` is a **war-room** (there are 6: `equity`, `demo`, `launch`, `pivot`, `application`, `firing` — the last is a one-on-one, and the only one whose cast is a single character plus the founder). Entering it (`effects.scene = arcId`) makes only its cast surface, re-polls after every answer so the talk flows in one sitting, and holds the rest of the world. **The action economy of a room: entering one is answering a message, so it costs one of the week's two moves — and that one move buys the whole sitting.** Every beat answered once you are inside is free (`inSceneBefore` in `act()`); the answer that opens the room is not, whether the content authored it as the arc's own first beat (`equity_open`, `demo_ready`) or as a standalone card (`pivot_summit_call`, `good_enough_launch`, `jordan_confrontation`, `yc_apply`). Each beat is authored on its own character's thread — scenes are **not** one merged transcript.

The UI renders a scene as the **same iMessage chat, restricted to the room**: a conversation rail of just the participants, one private thread each, everything else blocked out. New messages in another participant's thread light a blue unread dot — the UI never auto-switches threads for the player. Beats are scoped to the sitting by the `scene` tag the engine stamps on their messages (`_show`/`_say`). Cinematics bookend a scene (staged fade-in enter/exit lines, per-arc accent). **Launch day** additionally gets a cinematic dark stage: the time-of-day sky walks the hours, and a big clock counts the minutes forward as `s.launch_time` advances.

## The UI (`game.html`)

Self-contained. Three surfaces — **Messages** (rail · thread), **News Feed** (press/community posts you engage inline), and **Bank** (the ledger; opened from the clickable Runway gauge, not a tab). A persistent right column carries the **triage** ("Needs a call" / "When you have a minute" — your own moves you act on in-column) and the **journal mirror** (a read-only, handwritten-font recap of outcomes + milestone stamps) — the journal is the **only** surface for recap prose; threads render bubbles only. A header **☑ to-do gauge** is the chapter guide: one checklist + goal line per chapter (Ch 1 · Ship the demo → Ch 2 · Get to launch → Ch 3 · The trough of sorrow → Ch 4 · Rebuild as v2 → Ch 5 · Ace the application), derived from the facts ledger + `s.items`; a second header gauge counts down to the week-25 YC deadline. The turn-end reveal is ordered: runway counts down → the journal inks in → iOS-style notifications buzz under a header bell → the active thread refreshes → changed stats pulse. Endgame shows the `Scoring` report card. Avatar colors/initials live in a `STYLE` map here — presentation, not engine state.

## Coding conventions

- 2-space indentation, double quotes, semicolons.
- **`engine.js` and `world.js` stay free of DOM** — all UI belongs in `game.html`. **All narrative text** (node text, option labels, `reply`/`journal`, intros, names, scene copy) belongs in `story/*.js` / `cast.js`, never the engine.
- **A chat thread holds messages and nothing else.** If a character says something, it's a real message — `effects.say` (or `e.say(...)` for a conditional one mid-`fx`), which lands as a bubble in their thread. Everything else — what a choice cost you, how someone reacted, a tapback, a silence — is a **founder recap** and belongs in the journal: the `journal` field (a string, or a `(s,e,char)` function for a branchy one), or the `fx` return when a choice has no explicit `journal`. **The journal is a summary, not a transcript**: a multi-beat conversation writes one line, at the ending it reaches (the equity arc records the signing — or the tabling that replaces it — and nothing else, `journal: null` on every other beat). Never write a third-person aside that quotes a character ("Alex: 'take your time'"): the chat is an iMessage transcript, and a narrator line inside it reads as a text nobody sent.
- Every content file must work in **both Node and browser**: the IIFE + `module.exports` / `window.<Global>` (or `STORY.push`) pattern at the bottom of the file.
- `char` passed to a node is the **owning** character. A node that reasons about someone else reads them via `engine.cast.get('jordan')`.
- Guard "was this ever set" with `flags.x != null`, not `flags.x || 0` (the `|| 0` form conflates undefined with week 0).

## Instructions

When running regressions use `node tests/test_narrative.js` — **keep realistic-play violations at 0** (fuzzer-only findings are documented at the top of that file; replay one with `--seed N --driver X`). Its **Layer C** dead-air check is stricter: a hit from *any* driver fails the run, because an empty week is a hole in the content and "only the fuzzer walks into it" doesn't make it less of one. After any balance-affecting change, check pacing, win rate, and the per-chapter card balance with `node tests/phase_map.js` (it plays a second, randomized-attention cohort to separate "one tactic skips this card" from "structurally unanswerable"), run the behavior contracts with `node tests/sim_behaviors.js` (**don't regress the 34 passing contracts**; the 3 documented failures are open balance TODOs — see `revamp.md` Pass 5c), and confirm scenes still exit cleanly with `node tests/test_scenes.js`. New story nodes must be classified in `phase_map.js`'s `CATEGORY` table (unclassified ids are flagged in its output).
