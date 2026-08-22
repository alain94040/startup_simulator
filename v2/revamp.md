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

### Pass 5 — the horizon (chapters groundwork)

The game got a fixed ending: **every run ends entering week 25** — YC
applications close, the run is graded off the report card (B+ = 80 admits),
and the scorecard prints whether you applied or not. Consequences:

- **The angel path is gone.** Simulation showed it was structurally dead
  (`priya_advising` — the only key to the investor cast — expired at wk 16,
  before Priya usually unlocked; 0% of 800 simulated games closed the round).
  Marcus/Fatima/Ryan, `investor_warmth`, `deck_ready`, the deck/pitch chain and
  the YC window machinery (`yc_week`, skip/miss ± 26 weeks) are deleted.
  `fundraising.js` is now Sarah + the application/verdict. Wins collapse to
  `s.ycAccepted`; a run that never applies ends as `s.deadline_passed`.
- **The cap-table lesson moved into the score.** Scoring category 6
  ("Raise early, find your lead", Marcus-based) became **"Keep the cap table
  clean"**: incorporate, sign the split, take the F&F money, buy back Jordan's
  stake after the firing. Its old payoff (Marcus's diligence bounce) is now
  grade points every player faces.
- **Compression so chapter 5 exists.** The pre-launch architecture-refactor
  detour (`alex_wants_rebuild`/`arch_refactor_done`) was retired — it
  double-taught proto_to_product's lesson and serialized Alex's thread. Median
  launch moved 16 → 14, pivot 19 → 16, v2 ships ~21, leaving ~4 proving weeks
  before the wall. The Bullseye loop tightened to 2 tests + all-in (cooldown 1);
  `pivot_payoff_maya` promoted to story class (the packed endgame starved it);
  `alex_decision` demoted to ambient.
- **Economy retuned for 25 weeks.** Mom's $4k is now certain; Jamie $5k /
  David $4k stay on dice; a new `founder_consulting` valve (story-class, cash
  < $2.5k) trades a week's focus for $2,500 — dice-deaths became a time-vs-money
  decision. Outcome mix: decent/pivot 100% win (mastery is the ceiling),
  random 12% win / 49% rejected / 11% never-applied / 28% bankrupt.
- Tooling followed: phase_map buckets (`never_applied`, cap wk 30),
  sim_strategies (`noapply` replaces `angel`), harness PREF/ANSWER_ORDER,
  test_slice deadline + never-applied blocks. **133/133 · 0 realistic
  violations · 16/16 scenes.**

Content set after the cut: **148 nodes, 19 cast, 5 scenes.**

### Pass 5b — the chapter guide and the Flare drumbeat

Two follow-ups from playtesting the horizon build:

- **The to-do gauge is the chapter guide.** No cinematic chapter separation —
  the scene arcs already do that. The header ☑ gauge's stages became the five
  chapters (Ch 1 · Ship the demo → Ch 2 · Get to launch → Ch 3 · Find out why
  they leave → Ch 4 · Rebuild as v2 → Ch 5 · Ace the application), each with a
  one-line goal shown in the dropdown. "Prove a channel" merged into Ch 5; the
  Jordan question joined Ch 4's list.
- **The Flare arc: one beat per chapter, ignore-is-right.** The old
  competitor_launch/competitor_growing pair (1-week timeouts, ignored in 100%
  of games, ignore-penalized) became five phase-gated beats: stealth launch
  (ch 1) → 10k users (ch 2) → their feature ships during your slide (ch 3) →
  they stumble on the exact thing you pivoted to fix (ch 4) → they copy your
  pivot (ch 5). The design lesson: a competitor launching is devastating for
  morale — that's the text — but the right move is to steady the team and stay
  on your own roadmap. Copying is the trap (s.copied_competitor, a weight-2
  part of "Features won't save you"). Leaving a beat on read is harmless to
  the company; it just means nobody steadied Alex (small morale drift). Beats
  ride 3-week windows and close at chapter boundaries — a missed newspaper,
  not a stuck dependency.

### Pass 5c — the behavior-contract suite (sim_proto's regressions, by rationale)

Old sim_proto.js carried 38 regression checks over 12 strategies — each one a
contract that a founder behavior has its designed consequence. Ported to
`tests/sim_behaviors.js` by rationale, not line-by-line: 11 strategies (all
speaking through the decent chooser with targeted overrides — ignore_alex,
outside_only, fulltime, keep_jordan, skip_captable, no_pivot, no_meetup,
full_plan, distracted/random) and 31 contracts. The angel-path checks are
gone with the angel path; "a dirty cap table blocks the round" became "a
dirty cap table is a visibly worse report card" (its new home per the
horizon design). The commitment lesson is the canonical example: part-time
Alex must never out-build full-time Alex.

Two "lopsided founder" strategies probe whether the canonical player wins
by balance: `builder` (decent choices, but research/growth cards get 25% of
his attention) and `marketer` (the mirror — build cards at 50%; a 25% build
lean simply never ships, 0% — too broken to be a tier). Result: builder 31%
(always launches, under-pivots — the summit and slide evidence are research
cards), marketer 3% (launches late at 88%, pivots MORE than the builder at
73% — the research banks the evidence — but the rebuild is pure build, so
v2 ships in only 7% of runs). Decent doesn't win by being balanced — its
ch1 research share is just 11% — it wins by never dropping a spine gate.
The asymmetry is GOALS-shaped and now a contract: build is existential,
research is instrumental (it buys the pivot).

**Current status: 31/34.** The three failing contracts are balance TODOs,
not test bugs:

- `ignore_alex morale wk10 (62) crashed < 30` — neglect drops morale
  (80 → 62, direction correct; departure itself fires reliably at 100% via
  the ignore-count trigger) but the morale meter decays gently. Design
  target: sustained neglect should visibly crater the meter before he walks.
- `keep_jordan v2 ships later` / `keep_jordan.wins <= half of decent` —
  **keeping a drifting Jordan is currently free** (98% wins, same v2 ship
  week). Her frozen effort doesn't slow the rebuild because the firing
  normally happens after v2 ships anyway, and an unresolved drifting
  co-founder carries no cap-table or application consequence. GOALS.md says
  firing her is required to win; the mechanics don't enforce it yet.

### Pass 5d — the shortest-path report (scene depth audit)

Observation from play: the equity negotiation can be over almost before it
starts — commit to equal thirds at Alex's first ask, hold it through his one
counter, sign. `test_scenes.js` already BFS-enumerated every path through
each scene to prove clean exits; it now also keeps what it used to throw
away — each completed path's length (beats surfaced in the sitting) and its
exact `node:key` script — and prints a shortest-path report per scene:
distribution, the shortest scripts themselves, and a ⚠ when the minimum sits
way under the median (min ≤ median − 2 or min ≤ max/2). The BFS is
level-order, so the minimum is exact wherever the tree is fully enumerated;
for the capped launch tree the report says "upper bound" and at which depth
the cap bit (`--cap N` to push it).

Findings: **equity was the outlier the observation predicted** — 4-beat
floor vs median 6 / max 8, four scripts hit it (direct-propose 33 or 40,
survive the single counter, sign; the probe/why/worry texture and the
50/25/25 double-counter never surface). Demo (all paths exactly 4) and
pivot (all 8) are constant-depth. Launch is a 15–19-beat gauntlet whose
floor held at 15 across 4,810 paths at `--cap 8000`.

The fix (same pass): the arc was rebuilt so a number named early is an
**anchor, not an ending**. `equity_counter_done` (one counter round, then
sign) became `equity_decided`: counters put the case on record without
moving the number, the demands collide out loud in a crossfire (Alex does
the algebra — parity with the founder AND daylight over Jordan vs Jordan's
no-daylight-at-all has no solution; it's his kind of argument, so no
narrator needed), and only the founder's call at a new `equity_impasse`
beat finalizes the split. Whoever the final number disappoints gets a
consent beat before the signing — nobody signs unheard, which also fixes
the old cave-shortcut where a flipped split was signed behind the loser's
back. The earn-in ("the day you're full-time, we revisit") is rhetoric,
not an outcome: a softer hold on Jordan's counter (`promised_path` cushions
her consent) and Alex's own justification of the 40. Tabling the whole
thing at the impasse is allowed, terminal, and silently expensive: default
thirds go into the paperwork unexamined (`equity_tabled`), both meters
deflate, nobody ever texts about equity again, and both `hard-conversations`
(a weighted zero — worse than never assembling the room) and
`clean-cap-table` (0.3, below the ignored path's 0.4) remember. The
`dev_plan` spine gate learned to open off the impasse on that path, since
the signing never fires.

After the rebuild: floor 7 · median 9 · max 11, fully enumerated, and the
report shows every 7-beat path funnels through `equity_impasse:table` — so
the shortest tier is the designed dodge, not an under-written corner. The
report now detects that funnel shape and names the exit, distinguishing
"one deliberate, scored escape hatch" from "scattered shortcuts."

---

## Current status

| Area | State |
|---|---|
| Engine + content | Complete: 180 nodes, 19 cast, 6 scenes |
| `test_slice.js` | 139/139 deterministic checks |
| `test_narrative.js` | 0 realistic-play violations (fuzzer-only documented) |
| `test_scenes.js` | 20/20 — all scene paths exit cleanly; shortest-path report: equity 7/10/12 (short tier = the tabling dodge), demo 5, launch 15–19, pivot 8, firing 2/6/7 (short tier = the compromise) |
| `game.html` | Full UI, polished; the shipping surface |
| `play.html` | Plain debug harness (kept) |

## File map (`v2/`)
`engine.js` · `world.js` · `cast.js` · `scoring.js` · `game.html` · `play.html`
`story/`: opening, equity, dev_plan, team, dev_directions, demo_night, users,
launch_day, slide, pivot_day, community, fundraising, growth, jordan_arc,
firing, discovery, press, ambient
`tests/`: harness, test_slice, test_narrative, phase_map, test_scenes, sim_strategies

## Pass 6 — the Jordan arc gets its scene

**Why.** Firing a co-founder was `jordan_confrontation:fire`: one button, in
*Alex's* thread, with no reply text. The hardest human moment in the game
happened off-screen and Jordan never heard from the player at all. Most
founders will have to do this once, and almost nobody is good at it — the
educational content is entirely in *how*, which the old card could not express.

**What shipped.**
- **`story/firing.js`** — a one-on-one scene (`cast: ["jordan", "founder"]`,
  the first single-character room). `jordan_confrontation:fire` stopped being a
  resolution and became a door. Five beats a player answers, ~16 bubbles: the
  opener, her reaction, her counter-offer, the logistics, the last word.
  Deliberately shorter than pivot (8) and equity (10) — one voice reads longer
  than three arguing, and the outcome is settled at beat 2; everything after is
  the cost. A seventh beat (Alex asking what she said) only exists if you asked
  her what was going on.
- **She texts first, and every beat is a message.** Nothing in the scene is a
  founder card: a firing is a conversation, so it plays in her thread with
  ordinary reply chips, and each chip is the sentence you are about to send
  rather than a label for a strategy. The opener is her, at midnight, on the
  first free evening she has had in weeks — pushing the plans screen to staging
  and asking whether to walk you through it tomorrow. You answer that.
- **No secret and no villain.** Asking her what is going on does not uncover a
  hidden job — she has been part-time with a day job since week one, says so in
  the opening scene, and argues it in the equity negotiation. Her answer is
  that nothing has changed and nothing is going to: the company went full-time
  around her and nobody ever said a word about it. That removes the player's
  excuse (*she deceived me, so this is easy*) and points the one accusation in
  the scene back at the founder, who set the split knowing exactly this.
  Holding the line after hearing it is the skill the beat tests.
- **Beat 2 is an exam on the whole run**, not on the last five minutes: three
  tiers off the drift history, the ratio of her messages left on read, and the
  equity paperwork. At the bottom she pre-empts you (`firing_preempt`) and the
  scene ends — you can lose this conversation.
- **Two exits.** The clean exit, and the compromise (`firing_reaction:fold`),
  which schedules her resignation five weeks out with an `unless`: the
  conversation re-arms after four, so there is exactly one week to walk back
  in. Refusing twice (`firing_reentry:fold_again`) is the dead end — the same
  shape as `ride` on the fifty-match verdict.
- **Demo night plants it.** Jordan joins the `demo` scene cast and is silent in
  it (the engine guarantees the empty chair: `_candidates` only surfaces the
  active arc's beats). The HEIC uploader moved from the server to *her* iOS
  picker, so Alex can't fix it live and a third option — text her, get nothing
  — is the player's first lived data point. The scene now closes on her 12:41 AM
  message asking how it went.
- **Alex is awake.** His "so what did she say?" is a beat inside the scene on
  his own thread (he is in the arc's cast), so his name only enters the room's
  rail — with an unread dot — on the branch where he actually interrupts. It
  lives inside the sitting because on his thread afterwards it landed past the
  last playable week in 15 of 48 audited runs. Deliberately ungraded:
  discretion and transparency both cost something.
- **Consequences.** `s.jordan_quit` (she left) is kept distinct from
  `s.jordan_resolved` (you decided): the quit locks the YC `team_call` chip and
  fires `app_q_founders_left`, the question the real YC form asks — *"Have any
  of the founders left? If so, why, and how much equity do they have?"* — where
  every available answer is bad. The guilt payment moved out of the scene onto
  `jordan_cap_table` as a third option, where it is a cold decision with a
  price rather than a midnight flinch.

**Two bugs found on the way.**
- `jordan_confrontation` was starving on Alex's thread in chapter 4: it and
  `pivot_payoff_maya` both go eligible the week after the relaunch, and a
  declaration-order tiebreak decided which one the player ever saw. It stays on
  Alex's thread — the entry has to be *answering him*, agreeing to have the
  talk, because a founder-thread "Your move" card can be skimmed past and this
  is the one call that must be made to somebody's face. The Maya bookend yields
  Alex's slot instead, bounded by the confrontation's own 3-week patience.
- Inserting a conditional beat mid-arc broke the chain: `engine.js` auto-links
  a beat with no `when` to the previous one, so `app_q_growth` ended up gated
  behind a question that only exists on some runs. It now chains explicitly.

**Measured.** Pacing unchanged except Jordan leaving a week earlier (wk 22 vs
23). Win rate 100%, dead air 0%. Behavior contracts 34/37 (the same three
documented failures, plus three new passing contracts for the compromise).
Three new archetypes — `fold_jordan`, `ghost_jordan`, `blame_alex` — exist so
every branch of the scene is exercised by some run.

**Open balance question.** `fold_jordan` still wins 100% at grade 90: the
compromise costs ~10 points, which an otherwise-perfect run absorbs. Whether
blinking should be able to cost the batch is a dial, not a bug.

## Pass 7 — the application stops being a scene

**Why.** Measured on the sample book, the firing scene and the application scene
both landed in week 22 — in 85 of 192 archetype runs, the same week; in 17 of
them the founder fired a co-founder *after* submitting the answer to "why this
team." That was the visible complaint. Probing it turned up a worse one: the
application scene's choices changed nothing. Playing all three questions as
evidence versus all three as bluffs produced an identical outcome in 20/20
seeds, because `app_learned` / `app_why` / `app_growth` / `app_bluffs` were read
by exactly one thing — flavour text in the rejection letter. Nothing in
`scoring.js` touched them, and the verdict reads `gradeScore()` plus the
traction bar, both fully settled before the scene opens. The final exam was a
recap quiz administered after the grading had finished, and the always-present
bluff option cost nothing in a scene whose beats are free of action cost.

**What changed.**
- The `application` arc is gone (four beats). `yc_apply` is now one node with
  one button: applying computes the verdict in the same act and ends the run,
  so the report card follows immediately. No three-week letter — nothing
  between submitting and hearing could change the answer, so the wait was only
  a wait.
- Window unchanged at `deadline_week - 3`. Narrowing it to `- 1` was tried and
  reverted: the win rate fell 53% → 23%, because `yc_apply` loses the action
  race in an already-crowded week 24 and the run ends never having applied. The
  three-week window is scaffolding for an action-starved endgame, not padding.

**What the shorter run broke, and how it was fixed.** Ending the run on submit
removed weeks 23–25, which turned out to be load-bearing for two tails:
- **The cap table.** `jordan_cap_table` sits on Alex's contended thread and used
  to land at wk 24. With the run ending at 22–23 it never surfaced, and 61 runs
  were graded down on "Keep the cap table clean" for a decision the game never
  offered. The firing scene's three exits now carry
  `effects.surface: "jordan_cap_table"`, so the question is asked the same night
  she leaves — which reads better anyway than Alex raising it a fortnight later.
- **That created a cash trap**: firing week now carried $500 handoff + $99
  App Store + $2,000 lawyer against a ~$2,600 balance, and bankruptcies went
  18/192 → 22/192, killing three archetypes that should win. The lawyer option
  is now gated on `s.cash >= 2750`. Below that the bill doesn't disappear — it
  stops being a choice, leaving the gift or the deferral, which *is* the lesson:
  cleaning up after a co-founder costs money you have to still have.
  Bankruptcies back to 18/192, all in archetypes that were already losing.
- **The compromise fuse.** `firing_reaction:fold` schedules Jordan's
  resignation five weeks out; at a wk-22 fold that only ever landed because the
  run kept playing after the application went out. Now she is still there when
  the founder hits submit — so folding was *protecting* the cap table (score
  67 → 100, grade 90 → 95). `scoring.js` now counts `jordan_compromised` as
  faced and grades it 0: you decided a co-founder was off the team, took it
  back, and applied with her stake and the question both where they were. The
  G2 contract was rewritten to check that grade rather than the resignation.

**Measured.** test_slice 161/161, test_scenes 20/20, test_narrative 0
realistic-play violations (the same two documented fuzzer-only findings),
sim_behaviors 34 passing / the same 3 documented failures, phase_map 100% win ·
0 bankrupt · 0 quiet weeks. Median run end wk 25 → 24. Pacing is otherwise
untouched: demo wk 9, launch wk 13, summit wk 18, relaunch wk 21, firing wk 22.
The firing and the application no longer share a week in any run.

**Not done, deliberately.** The arcs still run
equity → demo night → launch → pivot → fire Jordan, and the two-week
compression that would put clear water between the firing and the application
was scoped out — the collision is resolved by the application no longer being
an arc, not by moving the spine.

**Still open.** The grade bar is not the binding constraint: every archetype
that clears the traction gate scores ≥ 89, and every loss in the table is a
traction loss, not a grade loss. `features-wont-save-you` scores 100 for 15 of
16 archetypes. And `gradeScore()` at verdict time runs 6–11 points below the
card the player is then shown, because `default-alive` flips to 100 on the win.

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
