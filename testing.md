# Testing

All game logic lives in `engine.js`. The simulation tools load it directly via `require('./engine.js')` — no browser needed.

## Tools

### `node sim_proto.js`
Runs 100 games per strategy and reports balance metrics. Use this after any change to card logic, state formulas, or the Engine class.

Output per strategy:
- **Win / Bankrupt / Timeout %** — primary balance signal. Timeout means the game ran past week 120 without resolving.
- **Alex left %** — how often Alex departed. Should be low (<15%) for most strategies except ones that deliberately ignore him.
- **YC applied / accepted %** — whether the YC path is reachable.
- **Avg week / Avg customers** — pacing indicators.
- **Issues** — any STUCK / ERROR / TIMEOUT messages from the simulation harness itself (not game outcomes). These indicate bugs.

Strategies tested: Random, YC grind, Alex first, Ignore Alex, Customer focus.

Healthy baselines (approximate):
- Random: win ~10–20%, bankrupt ~60–75%
- YC grind: 0% win is expected (the sim doesn't play it optimally), bankrupt ~60%
- Alex first: ~0% win, high bankrupt (burns cash without customers)
- Ignore Alex: high win rate but Alex leaves ~60–80% of games
- Zero errors across all strategies

### `node earlymap.js`
Lists every available card at weeks 1, 3, and 6. Use this to verify early-game balance — specifically that weeks 1–4 aren't dominated by a single character or category.

Output format:
```
[P]  cat  card_id  (from)
```
`[P]` = priority card. Cards without `[P]` fill category slots after priority cards are placed.

Healthy week 1: 2–3 Alex priority cards (`t`/`e`), plus at least one `p` and one `c` card from the founder or global pool.

### `node debug_context.js`
Runs 10 games and flags cards that appeared in logically impossible context (e.g. a customer churn card before launch, a reporter card before the product exists). Output is grouped by issue with occurrence count and the weeks it was seen.

Zero output = no context violations. Any output = a card's `available()` condition is too loose and needs tightening.

## Writing a quick one-off simulation

```js
const { Engine } = require('./engine.js');

const e = new Engine();
// Optionally pre-set state:
// e.s.week = 5;
// e.chars.get('alex').flags.committed_fulltime = true;

for (let turn = 0; turn < 60; turn++) {
  if (e.s.game_won || e.s.game_over) break;
  e.generateDemands();
  if (e.current.length === 0) break;

  // Pick first 2 cards, choose first option on each
  const ids = e.current.slice(0, 2).map(c => c.id);
  const opts = {};
  for (const id of ids) {
    const card = e.current.find(c => c.id === id);
    if (card && card.options) opts[id] = card.options[0].key;
  }
  e.resolveTurn(ids, opts);
}

console.log(e.s.game_won ? 'WON' : e.s.game_over ? 'BANKRUPT' : 'TIMEOUT');
console.log('week', e.s.week, '| cash', e.s.cash, '| customers', e.s.customers);
```

## Key Engine API

```js
const e = new Engine();
e.s                    // full game state object
e.chars                // Map of character instances { active, morale, trust, focus, flags }
e.generateDemands()    // populates e.current with 4 cards
e.current              // array of active demand cards
e.resolveTurn(ids, optKeys)  // ids: array of chosen card ids, optKeys: { cardId: optionKey }
// returns { results: string[], sprintWeeks: number }
```

State fields most relevant to balance checks: `e.s.cash`, `e.s.week`, `e.s.product`, `e.s.customers`, `e.s.signal`, `e.s.launched`, `e.s.incorporated`, `e.s.ycApplied`, `e.s.ycAccepted`, `e.s.game_won`, `e.s.game_over`.
