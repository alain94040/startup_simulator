# Simulations

Game logic lives in `engine.js`. All simulation tools run in Node — no browser needed.

---

## Read a game story

The most useful command. Runs one full game and prints every sprint: what cards were offered, which were chosen, the outcome, and the state of the relationship.

```
node sim_proto.js
```

Scroll past the strategy summary at the top. The story trace starts with `=== STORY TRACE ===`.

Sample output:

```
  Wk 1   Month 1   ────────────────────────────────────────────────────
  ✓  [t] Alex    "i've been thinking — i can't quit my job until we..."
        → Accept — milestones first
  ✓  [t] Alex    "wait — i demoed to my colleague today and called it..."
        → Go with Alex's framing
  ✗  [p] You     "you've been talking about this for two weeks but..."
  ✗  [c] You     "you've been building for two weeks and haven't had..."

        "Alex stays part-time for now. Slower, but stable."
        "Went with Alex's framing. Cleaner for developers."

        Cash $9,500  Product 12%  Customers 0  Signal 22  Alex trust:100 morale:88
```

`✓` = chosen, `✗` = dropped. Categories: `[p]` product, `[c]` customer, `[t]` team, `[e]` external.

---

## Check balance across strategies

The strategy summary at the top of `node sim_proto.js` runs 100 games per strategy and reports outcomes.

```
── Random ──
  Win 14%  Bankrupt 67%  Timeout 19%  Errors 0
  Alex left: 19%  YC applied: 12%  YC accepted: 28%
  Avg week: 54.6  Avg customers: 78.4
```

**What to look for:**

| Metric | Healthy range | Problem if... |
|--------|--------------|---------------|
| Errors | 0 | Any errors → bug in card logic |
| Random win % | 10–25% | Too high → game too easy; too low → unwinnable |
| Random Alex left % | 15–25% | Too high → morale/trust too fragile |
| Ignore Alex departure | 90–100% | Lower → morale doesn't matter |
| Timeout % | < 20% | High → game loops without resolving |

**Strategies:**
- **Random** — picks cards and options randomly. Baseline for a disengaged player.
- **YC grind** — prioritises YC and product cards, neglects team. Tests the investor path.
- **Alex first** — always picks Alex's cards. Tests the co-founder-first path.
- **Ignore Alex** — always deprioritises Alex. Should reliably cause his departure.
- **Customer focus** — prioritises customer cards. Tests growth-first path.

---

## Check what cards appear early

```
node earlymap.js
```

Lists every available card at weeks 1, 3, and 6. Use this after adding or changing a card's `available()` condition to verify it appears at the right time.

```
=== Week 1 ===
[P] t  alex_commitment          (Alex)
[P] t  vision_mismatch          (Alex)
[P] e  incorporate_now          (Alex)
    p  founder_landing          (You)
    c  founder_first_interviews (You)
```

`[P]` = priority card (fills first slots before category balancing). A healthy week 1 has 2–3 priority cards and at least one `p` and one `c` non-priority card.

---

## Check for context bugs

```
node debug_context.js
```

Runs 10 games and flags cards that appeared in impossible context — e.g. a churn card before launch, a reporter card before the product exists.

Zero output means no issues. Any output means a card's `available()` condition needs tightening.

---

## Write a one-off script

```js
const { Engine } = require('./engine.js');

const e = new Engine();
e.generateDemands();

for (let turn = 0; turn < 60; turn++) {
  if (e.s.game_won || e.s.game_over) break;
  e.generateDemands();
  if (e.current.length === 0) break;

  const ids = e.current.slice(0, 2).map(c => c.id);
  const opts = {};
  for (const id of ids) {
    const card = e.current.find(c => c.id === id);
    if (card && card.options) opts[id] = card.options[0].key;
  }
  e.resolveTurn(ids, opts);
}

console.log(e.s.game_won ? 'WON' : e.s.game_over ? 'BANKRUPT' : 'TIMEOUT');
console.log('week', e.s.week, 'cash', e.s.cash, 'customers', e.s.customers);
```

**Useful state fields:** `e.s.cash`, `e.s.week`, `e.s.product`, `e.s.customers`, `e.s.signal`, `e.s.launched`, `e.s.incorporated`, `e.s.ycApplied`, `e.s.ycAccepted`, `e.s.game_won`, `e.s.game_over`

**Alex specifically:** `e.chars.get('alex')` → `{ active, morale, trust, focus, focusSprints, flags }`

**Pre-set state to test a specific scenario:**
```js
const e = new Engine();
e.s.week = 8;
e.s.incorporated = true;
e.chars.get('alex').flags.committed_fulltime = true;
```
