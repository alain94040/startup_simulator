# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser-based educational startup simulation game. Players navigate from idea to seed round ($1M+), learning trade-offs between building, selling, and fundraising. No build step, no dependencies — everything runs directly in the browser or Node.js.

## Commands

| Action | Command |
|--------|---------|
| Play original UI | `open startup_game.html` |
| Play inbox UI | `open startup_inbox_game.html` |
| Run tests in browser | `open tests.html` |
| Run tests in Node | `node tests.js` |
| Run a simulation | `node simulate.js` or `node sim2.js` / `sim3.js` |
| Run strategy comparison | `node simulate_strategies.js` |

After editing `game.js`, refresh the browser page. No compilation needed.

## Architecture

The codebase has two separate UIs that share one game engine:

- **`game.js`** — `StartupGame` class, pure logic, no DOM. All mechanics, formulas, and state live here.
- **`startup_game.html` + `ui.js` + `styles.css`** — Original UI. `ui.js` bridges DOM events to `game.js` methods.
- **`startup_inbox_game.html`** — Newer Gmail-style inbox UI, self-contained (inline CSS + JS, no external deps). This is the actively developed version.
- **`tests.js` + `tests.html`** — Test harness works in both browser (`<script>` tags) and Node (`require('./game.js')`). Uses a minimal `test(name, fn)` / `assert(cond, msg)` API.
- **`simulate*.js` / `sim*.js`** — Node.js scripts that run many playthroughs with fixed strategies to measure win rates and formula balance. These are analysis/debugging tools, not production code.

`game.js` uses `module.exports = { StartupGame }` at the bottom for Node compatibility, while also being loaded via `<script>` in the browser.

## Key Game Mechanics

**Win condition:** Raise a seed round ($1M+). **Lose condition:** Cash hits $0 (only if full-time).

**Fundraising score formula** (capped at 100):
```
min(100, min(35, customers/50) + product_progress/5 + team.length*5 + incubator_bonus + fundraising_bonus + pivot_bonus)
```

**Seed round success:**
```
score >= 65 ? min(1, (score - 30) / 60) : 0
```
Scores below 65 always fail. The threshold means **YC (+35 bonus) is effectively the only reliable win path** — without it, the max achievable score (~48-55) falls short.

**Build efficiency decay** (prevents pure-build strategies):
```
efficiency = max(0.05, 0.95^(product_progress - market_fit - 10))
```
Building more than 10 points ahead of market fit loses efficiency exponentially.

**Talk-to-users diminishing returns:** Effectiveness drops to 0.15× above 70% market fit.

**YC application window:** Opens 1–6 months after game start (randomized). Requires `product_progress >= 80` and `customers >= 100`. Acceptance rate 2–15%. Gives +35 fundraising score, +25 market fit, $500k at 7% equity.

## Known Issues (from game_design_notes.md)

- YC equity test bug: `beforeFounder` is a reference, not a copy (in `tests.js`)
- YC open date test uses wrong variable (`tests.js` line ~211)
- Some simulation files (`simulate*.js`) have hardcoded old formulas in analysis comment sections — don't trust their inline comments for current formula values; check `game.js` and `game_design_notes.md` instead.

## Coding Conventions

- 2-space indentation, double quotes, semicolons.
- `game.js` must stay free of DOM manipulation — all UI belongs in `ui.js` or inline in the HTML files.
- Test names are descriptive behavioral sentences (e.g., `"Can't reach 100% product by just building repeatedly"`).
