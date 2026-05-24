# Startup Simulator

A browser-based educational game about the early startup journey — from idea to seed round. Players navigate a card-driven narrative, making trade-off decisions about building, selling, and fundraising across a cast of characters: a co-founder, early customers, investors, family, and the press.

**Target play time:** 10–20 minutes. **Win conditions:** YC acceptance or two angel investors committed.

---

## Playing

```
open prototype.html        # opens the game in your browser
```

No build step, no dependencies. After editing any source file, refresh the page.

---

## Running simulations

`sim_proto.js` is a Node.js harness that plays many games automatically and reports win rates, narrative behavior, and regression checks.

```
node sim_proto.js                               # all strategies, 100 games each
node sim_proto.js 500                           # all strategies, 500 games each
node sim_proto.js 500 --no-yc                   # force the angel fundraising path
node sim_proto.js 200 --winners                 # hunt for 3 lean_loop winning traces
node sim_proto.js 500 --winners 1 --no-yc       # one angel-path winning trace
node sim_proto.js 5 --all --strategy angel_path # print 5 angel_path traces
node sim_proto.js 5 --all --messages            # same, with full card text
node sim_proto.js --help                        # full usage
```

Strategies: `random`, `distracted`, `yc_grind`, `alex_first`, `ignore_alex`, `customer_focus`, `lean_loop`, `angel_path`, `rand_fulltime`, `rand_parttime`.

---

## Directory structure

```
prototype.html        Active game UI. Self-contained (inline CSS + JS). Loads engine.js
                      and all roles/*.js via <script> tags.

engine.js             Engine class — all game logic, no DOM. Exports { Engine,
                      CHARACTER_DEFS, WORLD }. Manages state, card pool, turn resolution,
                      build output, trust/morale decay, and win/lose conditions.

roles/                One file per character. Each exports an id, unlockCondition,
                      and a cards[] array. Cards have available(), options[], and
                      optionally dropFx(). Files work in both Node and browser
                      (IIFE + module.exports / ROLES global pattern).

  founder.js          The player's own cards (early decisions, fundraising readiness)
  alex.js             Co-founder — trust/morale system, commitment arc, departure risk
  marcus.js           Lead angel investor
  fatima.js           Follow-on angel investor
  priya.js            First paying customer
  ryan.js             Enterprise prospect
  sarah.js            Design advisor
  brett.js / kevin.js Competing founders / distractions
  lena.js             Journalist (TechCrunch)
  techcrunch.js       Press arc
  hacker_news.js      HN launch arc
  twitter.js          Social signal events
  yc.js               YC application and interview arc
  tom.js              YC partner
  analytics.js        Product analytics events
  users.js            Early user feedback cards
  mom.js              Family support (friends & family funding)
  jamie.js            College friend (friends & family funding)
  david.js            Ex-manager / mentor (friends & family funding)

sim_proto.js          Simulation harness and regression suite. Defines strategies,
                      runs games, prints traces, and checks behavioral invariants.

tests/
  testing.md          Notes on test approach (in progress)

CLAUDE.md             Codebase guide for Claude Code (architecture, conventions,
                      command reference).

---

## Key mechanics

**Cash and burn.** Game starts with $10k. Burn is $500/week. Hitting $0 ends the game.

**Build efficiency decay.** Building more than 10 points ahead of `market_fit` loses efficiency exponentially (`0.88^(product - market_fit - 10)`), bottoming at 5%. Pure build strategies stall.

**Alex's trust and morale.** Alex contributes passive product output scaled by `trust / 100`. Trust rises when his cards are chosen and falls when they're dropped (excluding cards flagged `ignoreForTrust`). Morale recovers slowly each sprint. If either drops below threshold, a departure card fires — ignore it and he leaves.

**Win via YC.** Apply, wait 3 weeks, get accepted: +$500k and a fundraising score boost. Requires `ycApplied` and meeting threshold conditions.

**Win via angels.** Get Marcus and a follower both committed. Marcus requires `customers >= 8`, `product >= 40`, `signal >= 45`.
