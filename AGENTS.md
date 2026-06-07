# Repository Guidelines

## Project Structure

```
├─ engine.js           # Engine class — pure game logic, no DOM
├─ roles/              # One file per character (alex.js, jordan.js, priya.js, …)
├─ game.html           # Active browser UI (inline CSS + JS, loads engine + roles)
├─ sim_proto.js        # Node.js simulation harness — primary analysis tool
├─ earlymap.js         # Gantt-style card availability map for weeks 1–8
├─ treemap.js          # Static progression dependency tree
├─ test_card_balance.js # Card balance regression tests
└─ tests/              # testing.md, narrative_review_agent.md
```

No build step. No dependencies. Everything runs directly in the browser or Node.js.

## Commands

| Action | Command |
|--------|---------|
| Play | `open game.html` |
| Run simulation | `node sim_proto.js 1000` |
| Card map | `node earlymap.js` |
| Progression tree | `node treemap.js` |
| Card balance tests | `node test_card_balance.js` |

## Coding Style

- 2-space indentation, double quotes, semicolons.
- `engine.js` must stay free of DOM manipulation.
- `roles/*.js` must use the IIFE + `module.exports` / `ROLES.id` dual-export pattern.

## Testing

Run `node sim_proto.js 1000` for regression testing. Do not change thresholds when a test fails — investigate the logic instead.

## Commit Guidelines

- One-line imperative commit messages, no emoji.
- No force-pushes to main.
