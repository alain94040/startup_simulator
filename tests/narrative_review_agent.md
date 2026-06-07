# Narrative Consistency Review — Agent Instructions

You are reviewing game traces from a browser-based startup simulation game. Your job is to find moments where the story doesn't hold together — where a player would be confused, misled, or pulled out of the experience. This document explains the game, its characters, and exactly what to look for.

---

## The Game

The player is a founder taking a startup from idea to seed round. Each sprint (usually 1 week), they are shown up to 6 cards representing situations, requests, or decisions. They pick 2. The rest are dropped. After ~20–60 weeks the game ends in a win (YC accepted, or two angel investors committed) or bankruptcy (cash hits $0).

**Key stats shown at the end of each sprint:**
- `Cash` — starts at $10k, burns $500/week
- `Product` — 0–100%, built by Alex
- `Fit` (market_fit) — 0–100%, built through discovery
- `Users` — free users (post-launch)
- `Customers` — paying customers (post-launch)
- `Signal` — investor/market confidence (0–100)
- `launched` — whether the product is live (pre-launch or launched)
- `Alex trust / morale` — Alex's relationship health (shown while he's active)
- `Alex: gone` — shown when Alex has left

**Trace format:**
```
Wk 7   Month 2   ──────────────────
  ✓  [cat] Character   "card body text"
       → Chosen option label
  ✗  [cat] Character   "card body text"

       "Outcome text from chosen cards"
       "Character: "delayed message text""

       Cash $X  Product Y%  Fit Z%  Users N  Customers M  Signal S  pre-launch  Alex trust:T morale:M
```

`✓` = player picked this card. `✗` = player saw it but didn't pick it (it was dropped).
Outcomes are the results of chosen cards plus any delayed messages that fired this sprint.
Delayed messages are formatted as `CharacterName: "text in double quotes"`.

---

## Card System Mechanics

**Delayed messages** (`dropMsg`): when a card is dropped (not chosen), it can schedule a message to appear 1–4 weeks later. These are shown in the outcomes block as `Character: "..."`. They represent follow-ups, consequences, or reactions from the character who owned the dropped card.

**The critical timing problem**: a delayed message is queued when the card is dropped, and fires a fixed number of weeks later regardless of what the player did in the meantime. This means a player can drop a card in week 8, take action in week 9 to resolve the situation, and still receive the "you went quiet" message in week 10. **This is the most common source of incoherency.**

**Cooldowns**: recurring cards have cooldown timers (e.g. "available every 5 weeks"). If the cooldown only resets when the card is *chosen* (not when dropped), the card can spam every sprint when the player ignores it.

**One-shot cards**: cards with `!char.flags.done` guards fire exactly once. After that they're gone. If they appear multiple times, something is wrong.

---

## Characters

### Alex (co-founder, engineer)
- **Always active from week 1.** He's the technical co-founder — the player's partner.
- **Cards**: equity split, commitment level, vision alignment, discovery vs. build tradeoffs, side project confession, departure threat, launch decisions.
- **Departure arc**: if morale and trust collapse (from being ignored), Alex's `alexDepartureRisk` flag triggers a "leaving threat" card. Dropping that card causes him to leave (`Alex: gone`). After departure, his delayed messages are now suppressed — **no Alex messages should appear after `Alex: gone`**.
- **Common issue**: Alex's delayed messages (queued before his departure) used to fire after he left. This is now fixed in the engine, but watch for regressions.
- **Another issue**: Alex has cards that fire based on his `focus` (build vs. discover). Cards about "should we shift to discovery" (`alex_sync_discover`) should NOT fire post-launch — by that point the question is moot. Check for this card appearing when `launched=true`.
- **Language watch**: Alex's discovery cards say "we've been heads-down building without talking to anyone outside" — this is wrong post-launch when the company has users and customers. Flag any sprint where this card appears after launch.

### Priya (advisor)
- **Unlocks only after the player attends a meetup** (the `founder_meetup` card, available weeks 2–6 and 8–11). Until then she must not appear.
- **First card**: "looked at your idea over the weekend. you should know: 3 companies are working on this right now..." — only fires when `signal < 60`.
- **Red flag**: Priya appearing before the meetup outcome text has been seen. Her intro comes from a TechCrunch `dropMsg` that formerly used `dropFrom: 'Priya (advisor)'` — that's been fixed, but watch for any Priya message before the player's meetup outcome.

### Marcus (angel investor)
- **Unlocks at week 6+ when `network.advisors >= 1`.**
- **Arc**: intro call → deck request → investor meetings → seed pitch → commit ($400k).
- **Common issue**: Marcus's intro card drops with `dropDelay: 1, dropMsg: "tried twice. no reply. moving on"`. If the player drops the intro at week 9 and takes it at week 10, both "Great call" and "tried twice" appear in week 10's outcomes. This is now fixed with a `dropCondition` — flag any recurrence.
- **Watch for**: Marcus's "tried twice" message appearing in a sprint where Marcus's intro was successfully taken that same week.

### Fatima (angel investor)
- **Unlocks at week 8+ when `network.advisors >= 1`.**
- **Arc**: intro call → deeper meeting → deck Q&A → commit ($100k, follows Marcus).
- **Common issue**: same as Marcus — `fatima_meeting` drops with `dropDelay: 2, dropMsg: "you went quiet after the intro"`. If the player takes the meeting the same sprint that message fires, both outcomes appear together. Now gated with `dropCondition: !char.flags.meeting_done`.
- **Same issue on `fatima_deck`**: `dropMsg: "still working through my diligence process"` should not fire after the deck Q&A is complete.
- **Watch for**: any Fatima message referencing her being stalled/waiting in a sprint where she just had a successful meeting.

### Ryan (angel investor)
- **Unlocks at week 8+ when `network.advisors >= 1`.**
- **Arc**: intro coffee → recurring check-ins every 5 weeks.
- **Watch for**: the `ryan_checkin` card body rotates through 4 variants — verify they actually vary (not all identical). The "Skip it this week" option now resets the cooldown, so the card should respect the 5-week gap.

### Mom
- **Always active from week 1.** Family/friend fundraising character.
- **Cards**: emotional check-ins, small cash injections ($5k–$15k), moral support.
- **Watch for**: Mom cards appearing very late in the game (week 40+) — the F&F fundraising window should be early. Cards with `s.week <= N` guards should prevent this.

### Jamie (college friend) and David (ex-manager)
- **Early-game characters**, typically weeks 3–8.
- **Jamie**: intro coffee, small angel ask, testimonial chain.
- **David**: lunch, potential advisor intro.
- **Watch for**: these characters appearing very late in the game — they have `s.week <= N` guards on most cards. Flag any appearance after week 15.

### Brett (brand strategist) and Kevin (growth consultant)
- **Consultants** — optional, cost money, one-time cards.
- **Brett**: positioning workshop ($1,500). Appears pre-launch.
- **Kevin**: growth audit ($2,000). Appears post-launch.
- **Watch for**: Brett appearing post-launch, Kevin appearing pre-launch.

### Tom (top user)
- **Unlocks when `customers >= 10`.**
- **Card**: "he was in the product every single day for 6 weeks. then nothing for 10 days." — silent churn from a power user.
- **Watch for**: Tom appearing when customers < 10, or his card body referencing "6 weeks of daily use" when the product has only been live for 2 weeks.

### Hacker News / Reddit / Indie Hackers (community platforms)
- **Pre-launch community signal** (3 cards each, sequential one-shots):
  - Card 1: first discovery of the problem space on the platform
  - Card 2: deeper thread, escalating stakes
  - Card 3: the platform discovers the player's product
- **Post-launch**: recurring "someone posted your product" cards with cooldowns.
- **Watch for**: the sequence firing out of order (card 2 before card 1 resolved), or post-launch community cards appearing pre-launch.

### TechCrunch
- **Competitor launch arc**: 3 cards — Rivalio stealth launch, Rivalio growing, investor asking why you win.
- **Watch for**: `dropMsg: "Rivalio has 200 customers..."` — this was formerly attributed to `Priya (advisor)` before the fix. Any Priya-attributed competitive message before the meetup is attended is a regression.

### Analytics
- **Unlocks post-launch when `users >= 3`.**
- **`silent_churn` card**: "free users are signing up, poking around for 20 minutes, and disappearing. no explanation." Cooldown: 8 weeks.
- **Watch for**: this card appearing pre-launch (users = 0), or the old "your first free users" phrasing (now fixed — flag any recurrence of "first free users").

### YC
- **YC application arc** (Hacker News character): opens every 12 weeks, requires `product >= 60` and `customers >= 10` for the "ready" version.
- **Watch for**: the "Stats qualify" (ready) card appearing when product < 60 or customers < 10, or the "stats aren't there" (early) card appearing when they ARE qualified.

---

## What to Look For

### 1. Delayed messages that contradict current state
The most common issue. Look for `Character: "message"` lines in the outcomes block that don't match what happened that sprint or in recent sprints.

**Examples of bugs:**
- `Fatima: "you went quiet after the intro"` appearing in the same sprint as `"Strong meeting. Fatima pushed hard on distribution."` — player didn't go quiet, they just had the meeting.
- `Marcus: "tried twice. no reply. moving on"` in the same sprint as `"Great call. Marcus is following your progress."`
- `Alex: "i accepted the offer"` appearing in the same sprint as `"i need to decide by friday"` — two departure beats collapsed into one.
- Any `Alex: "..."` message after the stats line shows `Alex: gone`.

**How to spot**: look for the outcomes block containing two messages that directly contradict each other, or a `Character: "..."` message referencing inaction when that same sprint shows action.

### 2. Card body text assuming wrong game state
The card was written for a specific context but fires in a different one.

**Examples:**
- `"we've been heads-down building without talking to anyone outside. should we shift to customer discovery?"` — wrong after launch when the player has users and paying customers.
- `"your first free users signed up, poked around..."` — wrong when users > 10 and the product has been live for weeks.
- `"you've been building for two weeks without a single structured customer conversation"` — wrong if the player already ran customer interviews.
- `"you don't have a public launch yet"` — wrong if `launched = true` in the stats.

**How to spot**: read the card body, then check the stats line for that sprint. If the body assumes a state the stats contradict, flag it.

### 3. Same card text appearing in consecutive or near-consecutive sprints
Recurring cards should have cooldowns. If the exact same body text appears in weeks 15 and 16 back-to-back, the cooldown isn't working.

**Examples:**
- `"alex has been heads-down but the queue isn't shrinking"` appearing every sprint for 10+ weeks.
- `"a quiet stretch. no fires, no urgent asks"` (the fallback card) appearing 5 weeks in a row — the game has no real content left.
- Any community signal card (`HN`, `Reddit`, `Indie Hackers`) appearing twice with identical text — these are now one-shot sequences.

**How to spot**: look at the "Repeated cards (>3×)" line at the end of each trace. Any card there that isn't `founder_reflect`, `alex_sync_discover`, or `founder_solo_discover` is worth investigating. Then scroll through the trace and look for near-identical card bodies in adjacent weeks.

### 4. Character appearing without any prior introduction
A character sends a card or message when the player has never had any interaction that would make them aware of each other.

**Examples:**
- Priya (advisor) sending a competitive intelligence message before the meetup outcome text has appeared in the trace.
- Marcus or Fatima appearing as if they know the player when neither a network introduction nor any advisor relationship has been established.
- Tom (top user) appearing with `customers < 10`.

**How to spot**: for each character's first appearance in a trace, verify the unlock conditions were met. Check the stats at that week: did the player have enough `network.advisors`, or `customers`, or did the meetup card fire?

### 5. Outcome text contradicting the chosen option
The player chose one option but the outcome describes something else.

**Examples:**
- Player chose "engage" on a community card but the outcome says "Didn't engage. Thread faded."
- Player chose "Do the competitive deep-dive" but the outcome describes ignoring the competition.

**How to spot**: read the `→ Chosen option label` line and then the outcome text. The outcome should clearly follow from the choice. If the outcome sounds like a different option was taken, flag it.

### 6. Two cards in the same sprint that contradict each other
Two ✓ cards chosen in the same sprint produce outcomes that tell incompatible stories.

**Examples:**
- One card says "launched the product to wide public" and another says "decided to keep the beta private."
- One card says "Alex is pushing for a major pivot" and another says "Alex locked in the direction and is building."

**How to spot**: read both outcome texts for any sprint and check if they describe the same reality.

### 7. Timing violations — card fires too early or too late
Some cards have strong implicit timing requirements.

**Too early:**
- The competitor launch (Rivalio stealth) card appearing in week 2 — the player hasn't built anything yet, so "your product looks similar" is premature.
- Marcus's formal pitch card (`seed_pitch`) appearing before the player has 6 paying customers.
- Family/friend fundraising cards (Mom, Jamie) appearing after week 20 — these should be early runway.

**Too late:**
- `founder_first_interviews` ("you've been building for two weeks without a single customer conversation") appearing at week 30 post-launch with 20 users.
- `alex_commitment` ("I can't quit my job until we have real traction") appearing after Alex has been working full-time for months.

**How to spot**: note the week and the implicit timing the card assumes. A card saying "it's only been two weeks" at week 40 is wrong.

---

## How to Generate Traces


### Basic command structure

```
node sim_proto.js N --all --strategy STRATEGY [--messages] [--no-yc]
```

- `N` — number of game traces to print
- `--all` — print full narrative traces (required for review; without it, only aggregate stats are shown)
- `--strategy STRATEGY` — which AI strategy drives the player's decisions (see below)
- `--messages` — show full card body text; without this flag, bodies are truncated at 60 characters, which makes narrative review impossible. **Always use `--messages`.**
- `--no-yc` — force the angel fundraising path (YC acceptances are blocked); use this to exercise the Marcus/Fatima/Ryan investor arc

### Strategies and what they exercise

| Strategy | What it exercises | Why useful for review |
|---|---|---|
| `lean_loop` | Balanced YC path, full character roster | Best general-purpose trace; exercises most cards |
| `lean_loop --no-yc` | Angel fundraising arc | Exercises Marcus, Fatima, Ryan investor chains fully |
| `angel_path` | Investor-first approach | Best for Marcus/Fatima timing issues |
| `ignore_alex` | Alex departure arc | Always triggers Alex leaving; tests post-departure behaviour |
| `yc_grind` | Aggressive YC focus | Fast product/launch arc; good for post-launch card timing |
| `distracted` | Unfocused play, many dropped cards | Triggers the most delayed messages; maximises delayed-message bugs |
| `random` | Fully random choices | Finds edge cases other strategies miss; noisy but useful |

### Recommended review session

Run these commands and read all output. Each produces output too large to print inline — capture to files using `2>&1 >`:

```bash
node sim_proto.js 5 --all --strategy lean_loop --messages > trace_lean.txt
node sim_proto.js 4 --all --strategy ignore_alex --messages > trace_ignore_alex.txt
node sim_proto.js 4 --all --strategy angel_path --no-yc --messages > trace_angel.txt
node sim_proto.js 3 --all --strategy distracted --messages > trace_distracted.txt
```

Then read each file in full. The traces are long (30–100KB each) — read them completely, not just the first few weeks.

### What a trace looks like

Each game starts with `=== STORY TRACE: strategy run N/total ===` and ends with a summary line showing outcome, final stats, active characters, and repeated cards.

Within a game, each sprint looks like:

```
  Wk 9   Month 3   ────────────────────────────────────────────────────
  ✓  [e] Fatima (angel)        "heard good things about what you're building..."
         → Take the call
  ✗  [t] Alex                  "we've been heads-down building without talking..."
  ✗  [e] Marcus (angel)        "genuinely interested in what you're building..."
  ✗  [e] Ryan (angel)          "heard about you through the network..."

         "Good call. Fatima asked sharp questions about the problem space."
         "Marcus: "tried twice. no reply. moving on — good luck with the company.""

         Cash $26,800  Product 21%  Fit 29%  Users 0  Customers 0  Signal 40  pre-launch  Alex trust:40 morale:57
```

**Reading the sprint:**
- `✓` cards were chosen; `✗` cards were in the player's hand but not picked (dropped)
- `→ label` shows which option the player chose
- The indented quoted lines after the blank line are **outcomes** — results from chosen cards and any delayed messages that fired this sprint
- Lines formatted as `Character: "text"` are **delayed messages** — these fired from cards dropped in a previous sprint
- The stats line at the bottom shows the state *after* this sprint resolves

### The summary block at the end of each game

```
  💸 BANKRUPT — Week 38 · Product 45% · Customers 0
  YC: applied=false accepted=false
  Active chars: alex, marcus, fatima, ryan, sarah, ...
  Repeated cards (>3×): alex_sync_discover×12@wk18  founder_codebuild×8@wk22  ...
```

- **Active chars** — which characters were ever activated. Use this to spot characters who appeared despite unlock conditions not being met (e.g. Priya active but no meetup in the trace).
- **Repeated cards** — `cardId×N@wkAvg` means the card appeared N times, average at week wkAvg. Any card here that isn't `founder_reflect` or `founder_solo_discover` is a candidate for a cooldown bug. Cards appearing 10+ times are almost certainly broken.

---

## Reporting Format

For each issue found:

1. **Game / week**: which run, which week
2. **Quote**: the exact card body, outcome text, or delayed message
3. **Stats at that week**: the relevant stat that contradicts it (e.g., `Users 0` when body says "your active users")
4. **Why it's wrong**: one sentence
5. **Category**: one of — *stale delayed message*, *wrong state assumption*, *repeat without variation*, *missing introduction*, *outcome contradiction*, *timing violation*

Group issues by category. Skip pure balance concerns (win rate, cash amounts). If unsure whether something is a bug or intentional design, note it as "possibly intentional" rather than skipping it.
