# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser-based educational startup simulation game. Players navigate from idea to seed round, learning trade-offs between building, selling, and fundraising. The game is an **iMessage-style chat sim**: characters (co-founders, investors, customers, family, press) text the founder, and the player responds by picking reply chips. No build step, no dependencies — everything runs directly in the browser or Node.js.

This game is educational, the educational goals are in GOALS.md

## Commands

| Action | Command |
|--------|---------|
| Play | `open game.html` |
| Run regressions and tests | `node sim_proto.js 1000` |
| Run narrative checks / regressions | `node tests/test_narrative.js` |
| Map game pacing & win rate | `node tests/phase_map.js` |

After editing `engine.js` or any `roles/*.js` file, refresh the browser page. No compilation needed.

> **Legacy (card-based) tooling — no longer wired to the engine.** `earlymap.js`, `treemap.js`, `test_card_balance.js`, and `test_redesign.js` were built against the old card-dealing `Engine` API (`generateDemands`/`resolveTurn`/`CHARACTER_DEFS`/`WORLD`), which no longer exists. They will not run until ported to the chat engine. Don't rely on them.

## Architecture

- **`engine.js`** — the `Engine` class, pure logic, no DOM. Exports `{ Engine }` (Node) / `window.Engine` (browser). The engine is a **thin coordinator**: it owns game state and the weekly tick, but it does *not* decide what characters say. Characters are loaded from `roles/` (Node: `require`, browser: the `ROLES` global populated by `<script>` tags).
- **`roles/*.js`** — one file per character. Each exports a definition object (`id`, `name`, `role`, `type`, optional `intro`, a `slice` of participating card ids, a `voice` map, and a `cards` array). Each character owns its own curation, ranking, and reactions. See any existing role for the pattern.
- **`scoring.js`** — the endgame report card. Pure logic, no DOM; dual export (`module.exports` / `window.Scoring`). `scoreGame(engine)` grades a run on 7 lessons — have the hard conversations (equity + firing Jordan), keep your co-founders close, build something people want (discovery + lean scope/launch + the pivot), features won't save you (post-launch feature creep + copying the competitor: `competitor_launch`/`competitor_growing`/`feature_request_custom`/`feature_spree`/`feature_cluster`), build your edge / buy the rest, raise early / find your lead (F&F + lead-vs-follower investors), stay default alive — from `engine.s` flags, `engine.log` (acted cardId+option, `ignored`, `surfaced` entries), and `engine.ledger`; each category carries a 📚 reference to the canonical startup writing it teaches (PG essays, Wasserman, Spolsky, Blank, Andreessen, Ries). A category the player never got to face returns `score:null` ("never faced"); merged categories degrade to the half that was always available. Safe to call in any game state — `tests/test_narrative.js` smoke-checks it at every game end.
- **`game.html`** — the browser UI. Self-contained (inline CSS + JS). Loads `engine.js` and all `roles/*.js` via `<script>` tags; renders the conversation rail, chat threads, and the founder journal. Avatar styling (colors/initials) lives here in a `STYLE` map — it is presentation, not engine state.
- **`tests/test_narrative.js`** — narrative-consistency fuzzer **and the primary regression suite**. Auto-plays many games across several drivers (decent / pivot / random) with a seeded RNG, then flags any card or message whose text contradicts the game state when it surfaces — two layers: state invariants on `engine.s` (e.g. `customers>0 ⇒ launched`) and card-surfacing rules (e.g. a "subscriber churned" message requires `customers>=1`). It tags each finding ‹realistic› (reachable by decent/pivot play) vs ‹fuzzer-only› (random-only edge state) — **keep realistic-play violations at 0**; fix a flagged card by rewording it or, for a genuine pre-launch beat, adding it to the `ALLOW` set. Rules + allowlist live in one block at the top of the file; replay a finding with `--seed N --driver X`.
- **`tests/phase_map.js`** — simulation-driven pacing / phase-timeline extractor (this is the *live* counterpart to the static `earlymap.js`). Reuses the `tests/test_narrative.js` harness (seeded RNG + decent/pivot drivers) but instead of checking consistency it records the first week each arc beat is reached (equity, dev plan, demo, beta, pivot, launch, first customer, first customer issue, firing Jordan) across many games, then reports: a phase-timeline table (reach% + p10/median/p90), an ASCII median timeline, consecutive-beat **gaps with the longest stretch flagged** (the boring-stretch finder), decision-density / dead-air stats, launch-vs-pivot ordering, and the outcome mix (win rate). Analysis tool, always exits 0.

Legacy files no longer maintained: `startup_game.html`, `ui.js`, `tests.js`, `tests.html`, plus the card-based tools listed above.

## Turn & surfacing model

**Turn = 1 week, 2 actions.** An action is answering one open chat message (`engine.act(cardId, optionKey)`) or a journal action. After 2 actions (or an explicit "End week"), `engine.nextWeek()` advances.

**One slot per character.** Each character shows at most one open (unanswered) message at a time, tracked in `engine.open[charId] = { cardId, def, week }`.

**Surfacing happens once per week** in `_poll()` (called from the constructor and `nextWeek()`). For each active character the engine asks:

```js
const card = def.next ? def.next(s, char, engine) : engine.defaultNext(def, char);
```

The returned card becomes that character's slot: same id → left in place (no repost); different card → replaces it; `null` → the character stays silent. New messages (including arc continuations) appear at the next week boundary, never mid-week.

**Engine APIs a character calls** (so roles don't duplicate logic):
- `pick(cards, char)` — the best available card by `urgency` (a `fallback` card only wins when nothing else is available).
- `sliceCards(def)` — the card defs named in `def.slice`.
- `openCardId(charId)`, `weeksWaiting(charId)`, `answered(cardId)`, `isOpen(cardId)` — awareness so a character can react to (not) being answered. Plus full `engine.s`, `engine.chars`, `engine.history`.
- `defaultNext(def, char)` — the shared default decision: hold the open card while it's still relevant; once its moment passes (window closed, or unanswered past its patience) call `_reactIgnored` and move on.

**Win conditions:** YC acceptance (`s.ycAccepted`), or two angel investors committed (`s.marcusCommitted && s.followerCommitted`). **Lose conditions:** cash hits $0, or a YC rejection (`s.ycRejected`, set in `roles/yc.js` — the YC verdict is final either way, no reapplying; `sim_proto.js --no-yc` neutralizes it to keep exercising the angel arc). Either YC verdict ends the run with the `scoring.js` report card (`showEndgame()` in `game.html`); bankruptcy keeps the plain out-of-runway modal. **Starting cash:** $10,000. **Burn:** `burnPerWeek` = $500/week base **+ `s.extra_burn`** (recurring SaaS costs from build-vs-buy decisions; see *Build arc*). `nextWeek()` also runs passive co-founder contributions (by `focus`/`skills`/`trust`), the over-scope build burn-down (auto items), launch conversion, organic signups, free-to-paid conversion, and revenue.

## Character & card model

A role definition (`roles/*.js`):
- `id`, `name` (chat display name), `role` (subtitle), `type` (`'cofounder'`, `'investor'`, `'press'`, …)
- `unlockCondition(s, engine)` — when to activate (omit for always-active); posts `intro` when it flips true
- `intro` — greeting posted when the character first unlocks
- `slice` — array of this character's card ids that participate
- `voice` — map of `"cardId|optionKey"` → first-person journal retelling of the outcome (falls back to the option's `execute()` return)
- `skills` — for co-founders: `{ build, discover, pitch }` multipliers
- `cards` — the card array
- `milestones` — (founder only) `[{ key, cls, label, test }]` for journal rubber-stamps
- `next(s, char, engine)` — *optional* custom decision fn; omit to use `defaultNext`

Each card:
- `id` — unique string
- `cat` — category: `'p'` product, `'t'` team/trust, `'e'` event, `'c'` customer/market, `'f'` fundraising
- `from` — display sender name (shown in the bubble)
- `body` — message text (string, or `(s, char, engine) => string` for dynamic text)
- `subtext` — optional secondary line
- `urgency` — the single slot-ranking key. Normal cards use 1–3; arc-continuation cards that must out-rank others use a higher band (e.g. 11–23). May be a function `(s, char) => n`.
- `fallback` — boolean; the card only surfaces when nothing else is available (e.g. the founder quiet-week card)
- `weeks` — sprint length if chosen
- `patience` — weeks the character waits before treating the message as ignored (default `DEFAULT_PATIENCE = 3`; `Infinity` = never)
- `available(s, char, engine)` — whether the card can surface now
- `options[]` — player choices; each has `key`, `label`, optional `reply` (chip/bubble text), optional `available(s, char, engine)`, and `execute(s, char, engine)` returning an outcome string

**Ignore reaction** (replaces the old "dropped card" subsystem): when a character's open message goes unanswered past its `patience` (or its `available()` window closes), `defaultNext` calls `_reactIgnored`, which fires the card's reaction. The reaction content lives on the card:
- `dropFx(s, char, engine)` — state effects when ignored
- `dropMsg` / `dropFrom` — an optional follow-up message posted to the thread
- `dropCancel(s, char)` / `dropCondition(s, char)` — guards that suppress the reaction

> Note: `char` passed to a card is the **owning** character's instance. A card that lives in one character's file but reasons about another (e.g. Alex's cards about Jordan) must read the other via `engine.chars.get('jordan')`, not `char`.

**One-shot card pattern** (fire exactly once):
```js
available: (s, char) => !char.flags.done,
options: [{ key: 'ok', label: '…', execute(s, char) { char.flags.done = true; /* … */ } }],
dropFx(s, char) { char.flags.done = true; },
```

**Recurring card with cooldown:**
```js
available: (s, char) => char.flags.lastWeek != null && s.week >= char.flags.lastWeek + 5,
```
Use `char.flags.x != null` (not `char.flags.x || 0`) to guard "was this ever set" — the `|| 0` form conflates undefined with week 0.

## Pending events

Cards can schedule future narrative events via the engine's pending queue (fired in `nextWeek()`):

```js
e.pending.push({
  fireWeek: s.week + 2,
  from: 'Alex', charId: 'alex',
  text: "message shown to the player when this fires",
  fx(st) { /* state mutations */ },
  cancel: (st, char) => someCondition,  // if true, suppresses both text and fx
});
```

This is the mechanism for delayed consequences. (The engine no longer auto-queues a delayed drop; a card that wants a delayed follow-up pushes its own pending event from `dropFx`/`execute`.)

## Build arc — engineering decisions

After the dev-plan scope choice (`dev_planning_session`: A/full vs B/lean vs C/decoy-lean) the build
phase is a sequence of **build-vs-buy** decisions teaching *buy commodity, build your edge* (not
"always buy"):

- **Auth** (`auth_build_buy` → `auth_buy_forced`, Alex) — **buy** is right (+$30/wk `s.extra_burn`).
  Letting Alex build it is strictly worse: he runs late, you buy anyway (same fee) *and* lose ~2 weeks
  (`buildEffort` hit). If the card is ignored, Alex optimistically starts building by default.
- **Matching engine** (`matching_engine_choice`, **Jordan**) — **build** is right; it's the core IP.
  Jordan proposing to license it is an early red flag she's the wrong co-founder. Licensing
  (`s.matching_licensed`) caps market-fit and is penalized at the pivot (`applyActivitiesPivot` rips out
  the black box). Building (`s.matching_owned`) makes the `founder_codebuild` pairing card advance the
  algorithm (research-gated via `interviews_done`/discovery focus).
- **Analytics** (`analytics_choice`, Alex) — **buy** is right (+$30/wk); sets `s.analytics_live`, which
  unlocks the pre-launch post-match drop-off card (`roles/analytics.js`) that reveals the pivot signal.

**Recurring SaaS cost.** Bought commodity adds to `s.extra_burn` (folded into `burnPerWeek`) — the
perceived ongoing downside that tempts the wrong build choice. Keep these modest so correct play stays
winnable (tune with `tests/phase_map.js`).

**Lean vs full = scope *volume*.** The build-vs-buy decisions fire on both plans. The over-scoped
`full` plan additionally carries ~2× inert **auto items** (`expandItems` adds `{ auto:true }` `scope_*`
items, no cards); the engine's build burn-down in `nextWeek()` flips them to `done` as cumulative team
`buildEffort` passes `AUTO_BUILD_INCREMENT`, so full takes ~2× longer to reach launch-ready
(`allScopeBuilt` gates `good_enough_launch`). There are no per-sprint "build properly / lean / defer"
cards. There is no separate beta phase — the game goes directly from demo to launch.

**Roadmap (`game.html`)** renders `s.items` (the 🗺️ panel): `quality:'bought'` → **SaaS** pill,
`quality:'generic'` (licensed matching) → **licensed** pill; auto `scope_*` rows appear on the full plan
only and burn down visibly.

## Coding conventions

- 2-space indentation, double quotes, semicolons.
- `engine.js` must stay free of DOM manipulation — all UI belongs in `game.html`. All narrative text (bodies, options, voice, intros, names, stamp labels) belongs in `roles/*.js`, not the engine.
- Character definitions in `roles/` must work in both Node and browser (IIFE + `module.exports` / `ROLES.id` pattern at the bottom of each file).

## Instructions

When running regressions, use `node tests/test_narrative.js` (keep realistic-play violations at 0), and `node tests/phase_map.js` to check pacing and win rate after balance-affecting changes.
