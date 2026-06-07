# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser-based educational startup simulation game. Players navigate from idea to seed round, learning trade-offs between building, selling, and fundraising. No build step, no dependencies — everything runs directly in the browser or Node.js.

## Commands

| Action | Command |
|--------|---------|
| Play | `open game.html` |
| Run simulation | `node sim_proto.js` |
| Simulation help | `node sim_proto.js --help` |
| Card availability map | `node earlymap.js` |
| Progression tree | `node treemap.js` |
| Card balance tests | `node test_card_balance.js` |

After editing `engine.js` or any `roles/*.js` file, refresh the browser page. No compilation needed.

## Architecture

- **`engine.js`** — `Engine` class, pure logic, no DOM. Exports `{ Engine, CHARACTER_DEFS, WORLD }`. All game mechanics and state live here. Characters are loaded from `roles/` (Node: `require`, browser: `ROLES` global populated by `<script>` tags).
- **`roles/*.js`** — One file per character. Each exports a definition object with `id`, `type`, `unlockCondition`, and a `cards` array. See any existing role for the pattern.
- **`game.html`** — The active browser UI. Self-contained (inline CSS + JS). Loads `engine.js` and all `roles/*.js` via `<script>` tags.
- **`sim_proto.js`** — Node.js simulation harness. Runs many games with fixed strategies to measure win rates and narrative behavior. This is the primary analysis and debugging tool.
- **`earlymap.js`** — Prints a Gantt-style map of every card available in weeks 1–8, grouped by track.
- **`treemap.js`** — Prints the game's progression dependency tree (static visualization, no engine loaded).
- **`test_card_balance.js`** — Card balance tests; verifies characters have meaningful early-game presence.
- **`tests/`** — Contains `testing.md` (manual test checklist) and `narrative_review_agent.md`.

Legacy files no longer maintained: `startup_game.html`, `ui.js`, `styles.css`, `tests.js`, `tests.html`, `test_yc.js`, `test_yc_delay.js`.

## Simulation (`sim_proto.js`)

```
node sim_proto.js                          # Strategy comparison, 100 games each
node sim_proto.js 500                      # Strategy comparison, 500 games each
node sim_proto.js 500 --no-yc             # Force the angel fundraising path
node sim_proto.js 200 --winners           # Hunt for 3 winning traces
node sim_proto.js 500 --winners 1 --no-yc # One angel-path winning trace
node sim_proto.js 5 --all                 # Print 5 lean_loop traces
node sim_proto.js 5 --all --messages      # Same, with full card bodies
node sim_proto.js 5 --all --strategy yc_grind  # Traces for a specific strategy
```

Strategies defined in `sim_proto.js`: `random`, `distracted`, `yc_grind`, `alex_first`, `ignore_alex`, `customer_focus`, `lean_loop`, `ignore_meetup`, `angel_path`, `rand_fulltime`, `rand_parttime`, `keep_jordan`, `skip_cap_table_angel`, `no_pivot`.

## Key Game Mechanics

**Win conditions:**
- YC acceptance (gives $500k + 35 fundraising score boost)
- Two angel investors committed (`marcusCommitted && followerCommitted`)

**Lose condition:** Cash hits $0.

**Starting cash:** $10,000. **Burn rate:** $500/week.

**Build efficiency decay** (prevents pure-build strategies):
```
efficiency = clamp(0.88^(product - market_fit - 10), 0.05, 1.0)
```
Building more than 10 points ahead of market fit loses efficiency exponentially.

**YC decision:** 3 weeks after application. Acceptance requires `ycApplied === true`. Gives +$500k and sets `ycAccepted`.

## Character System

Each character in `roles/` has:
- `unlockCondition(s)` — when to activate the character (omit for always-active)
- `cards[]` — cards this character can surface

Each card has:
- `id` — unique string
- `cat` — category: `'p'` (product), `'t'` (team/trust), `'e'` (event), `'c'` (customer/market), `'f'` (fundraising)
- `from` — display sender name (string)
- `urgency` — 1–3 (affects sort priority)
- `weeks` — how many weeks the card is shown before it auto-drops
- `priority` — (optional) boolean, surfaces before other cards
- `available(s, char)` — whether the card should appear this sprint
- `options[]` — player choices; each has `execute(s, char, engine)` returning an outcome string
- `dropDelay` — weeks after drop before `dropFx`/`dropMsg` fires (0 = immediate and silent)
- `dropFrom` — sender name for the delayed drop message
- `dropMsg` — narrative message shown when the delayed drop fires (null = silent)
- `dropCancel(s, char)` — if returns true, cancels the pending drop event entirely
- `dropFx(s, char, e)` — side effects when the card is ignored (dropped); `e` is the Engine instance

**One-shot card pattern** (card should fire exactly once):
```js
available: (s, char) => !char.flags.done,
execute(s, char) { char.flags.done = true; /* ... */ },
dropFx(s, char) { char.flags.done = true; },
```

**Recurring card with cooldown:**
```js
available: (s, char) => char.flags.lastWeek != null && s.week >= char.flags.lastWeek + 5,
execute(s, char) { char.flags.lastWeek = s.week; /* ... */ },
```

Use `char.flags.x != null` (not `char.flags.x || 0`) to guard "was this ever set" — the `|| 0` form conflates undefined with week 0.

## Pending Events

Cards can schedule future narrative events via the engine's pending queue:

```js
e.pending.push({
  fireWeek: s.week + 2,
  from: 'Alex', charId: 'alex',
  text: "message shown to player when this fires",
  fx(st) { /* state mutations */ },
  cancel: (st, char) => someCondition,  // if true, suppresses both text and fx
});
```

`dropDelay > 0` causes the drop flow to automatically push a pending event rather than running `dropFx` immediately.

## Coding Conventions

- 2-space indentation, double quotes, semicolons.
- `engine.js` must stay free of DOM manipulation — all UI belongs in `game.html`.
- Character definitions in `roles/` must work in both Node and browser (see the IIFE + `module.exports` / `ROLES.id` pattern at the bottom of each file).

## Instructions

Do not change the thresholds in sim_proto.js when a test fails.
When running regressions, use sim_proto.js with a count of 1000.
