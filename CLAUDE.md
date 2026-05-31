# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser-based educational startup simulation game. Players navigate from idea to seed round, learning trade-offs between building, selling, and fundraising. No build step, no dependencies — everything runs directly in the browser or Node.js.

## Commands

| Action | Command |
|--------|---------|
| Play | `open prototype.html` |
| Run simulation | `node sim_proto.js` |
| Simulation help | `node sim_proto.js --help` |

After editing `engine.js` or any `roles/*.js` file, refresh the browser page. No compilation needed.

## Architecture

- **`engine.js`** — `Engine` class, pure logic, no DOM. Exports `{ Engine, CHARACTER_DEFS, WORLD }`. All game mechanics and state live here. Characters are loaded from `roles/` (Node: `require`, browser: `ROLES` global populated by `<script>` tags).
- **`roles/*.js`** — One file per character. Each exports a definition object with `id`, `type`, `unlockCondition`, and a `cards` array. Each card has `available(s, char)`, `options[]`, and optionally `dropFx`. See any existing role for the pattern.
- **`prototype.html`** — The active browser UI. Self-contained (inline CSS + JS). Loads `engine.js` and all `roles/*.js` via `<script>` tags.
- **`sim_proto.js`** — Node.js simulation harness. Runs many games with fixed strategies to measure win rates and narrative behavior. This is the primary analysis and debugging tool.
- **`tests/`** — Test directory (in progress). Currently contains `testing.md`.

The files `startup_game.html`, `ui.js`, `styles.css`, `tests.js`, and `tests.html` are leftovers from a previous architecture and are no longer maintained.

## Simulation (`sim_proto.js`)

```
node sim_proto.js                          # Strategy comparison, 100 games each
node sim_proto.js 500                      # Strategy comparison, 500 games each
node sim_proto.js 500 --no-yc             # Force the angel fundraising path
node sim_proto.js 200 --winners           # Hunt for 3 winning traces
node sim_proto.js 500 --winners 1 --no-yc # One angel-path winning trace
node sim_proto.js 5 --all                 # Print 5 lean_loop traces
node sim_proto.js 5 --all --messages      # Same, with full card bodies
```

Strategies defined in `sim_proto.js`: `lean_loop`, `yc_grind`, `alex_first`, `customer_focus`, `angel_path`, `ignore_alex`.

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
  - `available(s, char)` — whether the card should appear this sprint
  - `options[]` — player choices; each has `execute(s, char, engine)` returning an outcome string
  - `dropFx(s, char)` — side effects when the card is ignored (dropped)

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

## Coding Conventions

- 2-space indentation, double quotes, semicolons.
- `engine.js` must stay free of DOM manipulation — all UI belongs in `prototype.html`.
- Character definitions in `roles/` must work in both Node and browser (see the IIFE + `module.exports` / `ROLES.id` pattern at the bottom of each file).

## Instructions

Do not change the thresholds in sim_proto.js when a test fails.
When running regressions, use sim_proto.js with a count of 1000.
