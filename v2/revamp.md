# The Kindred engine revamp — from card-dealer to story graph

A running summary of the v2 rewrite, phase by phase. Everything lives under
`v2/`, side-by-side with the untouched v1 game (`engine.js`, `roles/`,
`game.html`, `tests/` at the repo root still run).

---

## The problem (why we rebuilt)

The v1 engine surfaced "cards" by a single numeric `urgency` axis. An audit of
all 22 role files (~200 cards) showed urgency was really doing three different
jobs — spine-beats-flavor, ordering the four focus arcs, and making equity/
investor beats un-skippable — while "when a card triggers" was ~90 hand-rolled
`available()` functions stamping and reading week markers (`s.dev_start_week + 2`)
and `_done` flags, and "consequences" had three spellings (`execute`,
`dropFx`/`dropMsg`/`dropCancel`, `pending.push`). Arcs were smeared across files
(equity spanned jordan.js + alex.js + founder.js).

**Goal:** a from-scratch *story-graph engine* where every node declares its
dependencies (when it triggers), its choices, and its consequences — one
mechanism each — organized by storyline, not by character.

---

## The engine design (the core ideas)

- **Facts ledger.** Every node resolution is recorded: `resolved[nodeId] =
  { outcome, week, count }`. Being ignored is just another outcome (`"@ignored"`),
  so the ignored path is a queryable edge like any choice. This kills all `_done`
  flags and `*_week` stamps. Content asks `e.done(id)`, `e.outcome(id)`,
  `e.took("node:key")`, `e.weeksSince(id)`, `e.timesResolved(id)`.

- **Node schema** (replaces "card"): `id`, `char`, `text` (string or fn),
  `when { after, took, not, delay, if, cooldown }`, `choices[]` (each with an
  optional per-option `if` gate — the research-gated C-options), and
  `timeout { weeks, when, unless, effects, fx, say }` (the ignore path). Fires
  once by default; `cooldown` makes it recurring.

- **One effects vocabulary** (replaces execute / dropFx / pending):
  `{ cash, signal, marketFit, warmth, waitlist, users, customers, saas, flags,
  char{ morale,trust,effort,focus,flags }, say, schedule, scene }`, plus an
  `fx(s, e)` escape hatch for anything the data form can't express. Cash deltas
  auto-log to the ledger.

- **Arcs** are ordered beat lists; a beat with no `when` chains to the previous.
  A `scene:` arc is a war-room (equity, demo, launch, pivot): entering it makes
  only its cast surface, its beats free of action cost, re-polls after each
  answer so the talk flows in one sitting, and holds the rest of the world.

- **Scheduler — no urgency.** Per character, per week, pick the first eligible
  node by class then FIFO: scene beat > story beat > `ambient` > `filler`.
  An open node holds its slot until answered or its `timeout.weeks` passes.

- **Separation of concerns.** `engine.js` = facts + scheduler + effects + scenes
  (no content, no DOM). `world.js` = the weekly economy tick (burn, passive
  co-founder effort, build burn-down, growth, win/lose). `cast.js` = character
  registry (name, unlock, intro, skills). `story/*.js` = content, by arc.

---

## The build passes

### Pass 1 — engine core + vertical slice, then the dev arc
Built `engine.js`, `world.js`, `cast.js`, `scoring.js` shell, `play.html`, and
the first story files. Proved every mechanism on a slice (equity scene + dev/auth
spine), then completed the development stretch: `opening.js`, `equity.js`,
`dev_plan.js`, `team.js`, `dev_directions.js`, `demo_night.js`, `users.js`,
`ambient.js`. Delivered: the equity scene, the direction-decision spine
(matching build-vs-buy, ranking, Jordan's iOS sprints, analytics, seed strategy,
trust & safety), demo night (2nd scene, character unlock + intro). **73/73
checks.**

### Pass 2 — launch day, the slide, pivot day
`launch_day.js` (the road to launch + the 17-beat launch scene DAG),
`slide.js` (the post-launch gravity + evidence banking), `pivot_day.js` (the
8-beat summit scene with evidence-chip hinge, the growth-path redemption card,
the Maya bookend). The old urgency ladders became pure dependency chains; branches
became outcome-gates (`took: ["launch_staging_decide:hotfix"]`). Four distinct
endings of the same story now regression-tested. **104/104 checks.**

### Pass 3 — money, community, growth, scoring
`community.js` (HN/Reddit/IH ladders + the YC window), `fundraising.js`
(Marcus leads → Fatima follows, Ryan warmth, Sarah, the YC verdict),
`growth.js` (the Bullseye channel loop + hand-made-traction founder cards).
`scoring.js` rebuilt on the facts ledger — the report card asks `e.took()` and
reads `"@ignored"` outcomes directly, so it's far simpler than v1's log-mining.
Win conditions wired (YC, or lead+follower angels). **129/129 checks.**

### Pass 3.5 — the wrong-co-founder arc, press, texture, solo
`jordan_arc.js` (drift → confrontation → firing, with the un-vested cap-table
stake that investors' diligence flags), `press.js` (the Flare competitor arc,
Twitter, Lena, Tom, the two snake-oil consultants, Jamie/David micro-checks),
`discovery.js` (the discover-focus payoff ladder, the reference-testimonial
chain, the pairing card, solo mode after Alex walks), plus the relationship
texture in `team.js` (side project, going quiet, equity regret, early debates).
The content set is now complete: **162 nodes, 22 cast, 5 scene arcs.**
**137/137 checks.**

### Regression fix — win rate 0% → 10%
The full content exposed three bugs: (1) founder opportunity cards weren't
`ambient`, so they starved the spine of its slot (the pivot shipped past the
YC window) — reclassified; (2) firing Jordan post-pivot left her effort in
`pivot_effort_base`, freezing the rebuild — clamped; (3) the decent driver was
skipping YC — fixed. v2 now beats v1's simulated win rate (10% vs 3%, both YC-path).
**138/138 checks.**

### Pass 4a — the tooling (statistical harness)
- `tests/harness.js` — shared drivers (decent/pivot/random on a seeded second
  RNG stream), the game loop with observer hooks, `jumpTo`, stats utils. The
  `PREF` table lives here once.
- `tests/test_narrative.js` — the narrative-consistency fuzzer, ported. Seeded
  RNG (no more Math.random patching). Exit code tracks realistic-play violations
  (kept at **0**); fuzzer-only findings documented.
- `tests/phase_map.js` — pacing/win-rate extractor reading the ledger exactly,
  plus a new **"left on read"** section measuring `@ignored` rates.
- `tests/test_scenes.js` — permutation test over all four scenes (BFS + random
  walks): **every path exits cleanly, one sitting, no duplicate beats.**
- `tests/sim_strategies.js` — minimal strategy-comparison table (placeholder for
  a redesigned sim_proto).
- Engine gained an `openActions().kind` field; `play.html` gained a debug bar
  (`jumpTo`, seed, +5wk). `test_slice.js` moved into `tests/`.

**Baseline the tools produced** (the re-balance pass's input): unassisted YC
win ~10%, angel round still ~0% (meetup/competitor-bomb keys starve; Marcus's
failed-pitch warmth penalty soft-locks retries), demo→launch is the longest gap
(+8 wk median), rail-tail characters starve at ~100% `@ignored`.

### The UI redesign (mockups → the messenger)
Iterated three directions as artifacts (founder's desk / messenger / dashboard),
converged on a **polished messenger**: three surfaces (Messages · News Feed ·
Bank), a persistent "This week" triage column, a ☑ **to-do gauge** (one checklist
per company stage: Ship the demo → Get to launch → Survive the slide → Rebuild as
v2 → Prove a channel → Fill the round), and the journal as a read-only mirror.
Grammar: *people you answer in-thread; your own moves you act on in the column;
the press you engage in the feed.*

### Pass 4b — v2/game.html (the playable UI)
Built the messenger UI reading only existing engine APIs. Surfaces, triage column,
to-do checklist derived from the facts ledger + `s.items`, inline outcome notes,
scene takeovers, endgame report card (`V2Scoring`), intro overlay, debug bar.
Then a first juice layer: iOS notifications, message reveal, cinematic scenes.

### Pass 4c — porting v1's polish grammar
Audited v1's polish and re-implemented it as the *ordered grammar* it actually is:
- **No End-week button** — the week auto-advances when both moves are spent; a
  fallback pill appears only on ambient-only weeks.
- **The turn-end reveal, in order**: runway counts down → the journal beat leads
  (column glows, entries ink in one at a time) → the phone buzzes one notification
  every 750ms → the active thread refreshes after its own notification →
  changed stats pulse.
- **Notifications anchored under a header bell** (badge = week's count; the bell
  reopens them as a notification center).
- **Read-cursor thread reveal** (typing dots), the "Respond ↓" pill, the
  blocked-Jordan footer, and the **dev-plan phone mockups + lightbox** (A/B/C).
- **Scene cinematics**: staged fade-in lines, per-arc accent, enter *and* exit
  (pivot's exit keyed to the decision), launch-day background + clock walking the
  time of day.
- The v1 iOS character palette. `prefers-reduced-motion` honored.

Verified by a headless DOM smoke drive (24 checks) + the engine suites unchanged.

---

## Current status

| Area | State |
|---|---|
| Engine + content | Complete: 162 nodes, 22 cast, 5 scenes |
| `test_slice.js` | 138/138 deterministic checks |
| `test_narrative.js` | 0 realistic-play violations (fuzzer-only documented) |
| `test_scenes.js` | 16/16 — all scene paths exit cleanly |
| `game.html` | Full UI, polished; the shipping surface |
| `play.html` | Plain debug harness (kept) |

## File map (`v2/`)
`engine.js` · `world.js` · `cast.js` · `scoring.js` · `game.html` · `play.html`
`story/`: opening, equity, dev_plan, team, dev_directions, demo_night, users,
launch_day, slide, pivot_day, community, fundraising, growth, jordan_arc,
discovery, press, ambient
`tests/`: harness, test_slice, test_narrative, phase_map, test_scenes, sim_strategies

## Open items (next passes)
- **Re-balance** (tools now exist): the angel round win path, the Marcus
  warmth soft-lock, the demo→launch gap, the action-starvation tail. Drive with
  `phase_map.js` / `sim_strategies.js`.
- **UI feel**: judge the messenger direction in real play; the user remains
  "not fully convinced."
- **sim_proto redesign** (the current `sim_strategies.js` is a placeholder).
- **The v1→v2 switchover**: retire the root engine, repoint CLAUDE.md commands.

## How to run
- Play: `open v2/game.html` (or `?seed=42` for a reproducible run;
  `v2/play.html` for the plain debug harness).
- Regressions: `node v2/tests/test_slice.js`, `node v2/tests/test_narrative.js`,
  `node v2/tests/test_scenes.js`.
- Balance/pacing: `node v2/tests/phase_map.js [--subsidy 500]`,
  `node v2/tests/sim_strategies.js`.
