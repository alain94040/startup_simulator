# Startup Simulator

A browser-based educational game about the early startup journey — from idea to seed round. It plays as an **iMessage-style chat sim**: your co-founders, early customers, investors, family, and the press text you, and you respond by picking reply chips. Outcomes are narrated in a founder's journal. Every week you decide who gets your attention — you can't answer everyone.

**Target play time:** 10–20 minutes. **Win conditions:** YC acceptance, or two angel investors committed. **Lose condition:** you run out of cash.

---

## Playing

```
open game.html        # opens the game in your browser
```

No build step, no dependencies. After editing any source file, refresh the page.

---

## How it plays

- **Turn = 1 week, 2 actions.** An action is answering one chat message (pick a suggested reply) or taking a journal action. After two actions — or when you hit "End week" — the week advances.
- **One message per person at a time.** Each character shows at most one open message. New messages arrive at the start of each week.
- **You can't answer everyone.** With only two actions a week, threads pile up. If you leave someone hanging too long, they react — a co-founder's morale slips, an investor moves on, a moment passes.
- **The journal** records what happened in the founder's own voice, with milestone stamps ("Incorporated", "Launched", "YC Accepted", …).

Cash starts at **$10,000** and burns **$500/week**. Co-founders contribute passively each week based on what they're focused on (building, customer discovery, or pitching).

---

## Directory structure

```
game.html     Game UI. Self-contained (inline CSS + JS). Loads engine.js and all
              roles/*.js via <script> tags. Renders the conversation rail, chat
              threads, and the founder journal. Avatar colors/initials live here.

engine.js     The Engine class — pure logic, no DOM. Exports { Engine }. A thin
              coordinator: it owns game state and the weekly tick, but each
              character decides what it says. Each week it polls every active
              character (their own next(), or the shared defaultNext()) and shows
              the result; tracks the per-character open slot; resolves answers;
              runs the economy (burn, passive contributions, conversion, revenue)
              and win/lose checks.

roles/        One file per character. Each exports id, name, role, optional intro,
              a slice of participating card ids, a voice map (journal retellings),
              and a cards[] array. Cards have body, options[], urgency (slot rank),
              available(), and an ignore reaction (dropFx/dropMsg). Files work in
              both Node and browser (IIFE + module.exports / ROLES global).

  founder.js          The player's own decisions + journal action cards + milestones
  alex.js             Co-founder/CTO — trust/morale, commitment arc, the Jordan arc
  jordan.js           Co-founder/iOS — equity negotiation, drift, full-time ask
  marcus.js           Lead angel investor
  fatima.js           Follow-on angel investor
  ryan.js             Angel investor
  priya.js            Advisor
  sarah.js            Community leader
  brett.js / kevin.js Consultants / distractions
  lena.js             Tech journalist
  techcrunch.js       Market / competitor news
  hacker_news.js      HN / Reddit / Indie Hackers community arcs
  twitter.js          Social signal events
  yc.js               YC application arc
  tom.js              Power user
  analytics.js        Product analytics events
  users.js            Early user feedback
  mom.js / jamie.js / david.js   Friends & family funding

test_engine.js  Headless regression checks for the engine.

CLAUDE.md       Codebase guide (architecture, mechanics, conventions).
```

---

## Running the tests

```
node test_engine.js
```

Checks that the game advances past week 1/2 without freezing, that characters react when ignored, that no character spams the same message, and that ignore reactions move state.

> The older card-based tools (`sim_proto.js`, `earlymap.js`, `treemap.js`, `test_card_balance.js`) target a previous card-dealing engine API and are not wired to the current engine.

---

## Key mechanics

**Cash and burn.** Start with $10k; burn $500/week. Hitting $0 ends the game.

**Attention is the constraint.** Two actions a week means moments pass if you don't engage. Each character decides — from the full game state and history — what to bring up and how to react when unanswered.

**Slot ranking.** When a character has several things it could say, it surfaces the one with the highest `urgency`; arc-continuation beats use a higher urgency band so they win the slot. A `fallback` card only appears when there's nothing else.

**Win via YC.** Apply, wait, get accepted.

**Win via angels.** Get a lead (Marcus) and a follower (Fatima/Ryan) both committed.
