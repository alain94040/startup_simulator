# Narrative Consistency Review — Agent Instructions

Find moments where the story contradicts game state — text that would confuse or mislead a real player.

## The Game

Founder chat sim, idea → seed round, ~20–60 weeks. Player answers up to 2 character messages per week. Ends: YC accepted, two angels committed, or cash = $0.

Key state: `cash` (starts $8k, burns $500+/wk) · `fit` 0–100% · `users` · `customers` · `launched` (bool) · `signal`

---

## Trace Format

```bash
node sim_proto.js --chat [K] --strategy STRATEGY --messages
```

`--messages` is required (without it text is truncated). Each trace has five sections:

---

### 1. TIMELINE

Notable weeks only. Use to orient: when launch happened, when customers appeared, cash burn rate.

```
W 1  cash=$8,000  users=0  customers=0  fit=0%  start
W20  cash=$4,760  users=7  customers=0  fit=84%  launched=true  first_user
W23  cash=$3,080  users=18  customers=1  fit=85%  first_customer
W29  ← BANKRUPT
```

---

### 2. CHAT blocks (one per real character)

Real people the founder texts: Alex, Jordan, Priya, Marcus, Fatima, Ryan, Sarah, Mom, Jamie, David, Brett, Kevin, Tom, Lena.

```
[W06] Alex: "we need login, account creation, password reset..."
       state: {cash:$8,800 launched:false customers:0 fit:20%}
       ✓ Chose: "let's not reinvent the wheel. wire up a hosted provider"
         → Wired up a hosted auth provider in an afternoon.…
       ↩ Skipped: "Let Alex build it himself"

[W07] Alex: "jordan wants equal thirds. i've been thinking..."
       state: {cash:$8,270 launched:false customers:0 fit:20%}
       ⚠ IGNORED (patience expired)

[W09]   → Alex: "you never responded. i've been thinking about it anyway..."  ← follow-up after no reply
```

**Field reference:**
- `state:` — game state **when the message surfaced**. The message text must make sense given this state.
- `✓ Chose:` / `→ outcome` — what player replied and what happened.
- `↩ Skipped:` — unchosen options. **Their text can also contain bugs.**
- `(no dialogue reply)` — card has `chat:false`; action happens silently but outcome still posts to journal.
- `⚠ IGNORED` — message expired unanswered; drop consequence fired.
- `← follow-up after no reply` — consequence message queued at ignore-time, fires on fixed delay. **Most bug-prone area**: can arrive after the situation resolved.
- `(open at game end)` — never answered.

---

### 3. EVENTS & NOTIFICATIONS

Impersonal sources (HN, Reddit, Twitter, Analytics, YC, Users) in chronological order. Same fields as CHAT. Apply the same consistency checks.

---

### 4. ROADMAP CHANGES

Every item status/quality change, derived from weekly state diffs. Attributed to the week the change occurred.

```
[W 1] + matching_algo: active  ← new item {launched:false customers:0 fit:0%}
[W 6]   auth:  todo → done (bought) {launched:false customers:0 fit:20%}
[W18]   matching_algo:  done (solid) → obsolete (solid) {launched:false customers:0 fit:56%}
[W18] + plans_matching: active  ← new item {launched:false customers:0 fit:56%}
```

Quality values: `solid` = properly built · `bought` = third-party SaaS · `rough` = shipped fast · `licensed` = outsourced matching (strategic mistake).

---

### 5. JOURNAL (founder)

All outcomes and stamps in chronological order. `✦` = milestone stamp. `[CharName]` = voiced outcome from that character's card.

```
[W 2] ✦ Incorporated
[W 6] [Alex] Wired up a hosted auth provider in an afternoon.…
[W19] ✦ Launched
[W23] ✦ First Customer
```

---

## Characters & Unlock Conditions

| Character | Unlocks when | Key watch |
|---|---|---|
| Alex | Always (W1) | No messages after departure. `alex_sync_discover` wrong post-launch. |
| Jordan | Always (W1) | Follow-ups after ignored equity cards should reference tension, not praise. |
| Priya | After `founder_meetup` card is answered | No appearance before meetup outcome in journal. |
| Marcus | W6+, `network.advisors >= 1` | "tried twice" follow-up must not appear same week as successful call. |
| Fatima | W8+, `network.advisors >= 1` | "you went quiet" follow-up must not appear same week as successful meeting. |
| Ryan | W8+, `network.advisors >= 1` | `ryan_checkin` body rotates 4 variants — should not repeat identically. |
| Mom / Jamie / David | W1 / W2 / W2 | Should not appear after W20 (family/friend window is early runway). |
| Brett (brand) | Pre-launch only | Flag if appears when `launched:true`. |
| Kevin (growth) | Post-launch only | Flag if appears when `launched:false`. |
| Tom (top user) | `customers >= 10` | Flag if `customers < 10` in state line at first appearance. |
| Analytics | Post-launch, `users >= 3` | `silent_churn` must not fire with `launched:false` or `users:0`. |
| HN / Reddit / Indie Hackers | Sequence: 3 pre-launch one-shots, then recurring post-launch | Out-of-order or wrong phase. |
| YC | Fixed windows (W30, then every 12 wk) | "stats qualify" version wrong if `customers < 10`. |

---

## What to Look For

### 1. Stale follow-ups
Every `← follow-up after no reply` line: check the state when it fires vs. when the original was ignored. Look for the situation having resolved in the meantime.

**Bug examples:**
- `"you went quiet after the intro"` same week JOURNAL shows a successful Fatima meeting.
- Any Alex message after his CHAT block ends (post-departure).

### 2. Message body vs. state
Read the body, check the `state:` line. Body must match.

**Bug examples:**
- `"we've been heads-down building without talking to anyone"` when journal shows interviews already done.
- `"your first free users signed up"` when `users > 20`.
- Any reference to subscribers/churn when `customers:0` or `launched:false`.

### 3. Skipped option text wrong
`↩ Skipped:` labels can also reference wrong state.

**Bug examples:**
- Option says "fire Jordan" after Jordan was already fired.
- Option references "your investors" before any investor committed.

### 4. Repeat without variation
Within a CHAT block, same body text in adjacent `[W##]` entries = broken cooldown. Fallback journal card repeating 5+ weeks in a row = game ran out of content.

### 5. Missing introduction
Check each character's first CHAT entry against unlock conditions in the table above.

### 6. Outcome contradicts choice
`✓ Chose:` label and `→ outcome` must agree. "Chose 'engage'" + outcome "Didn't engage" is a bug.

### 7. Roadmap vs. card actions
Cross-reference ROADMAP CHANGES with CHAT blocks:
- `auth: done(bought)` but Alex's CHAT shows "build it himself" was chosen → contradiction.
- `plans_matching` appears but no pivot card (`pivot_open`, `pivot_alex_pushback`, `pivot_priya_verdict`) in any CHAT → orphaned state change.
- `analytics: done(bought)` appears *after* an Analytics EVENTS card fires → used before set up.
- `✦ Launched` in JOURNAL before `launched:true` in TIMELINE → ordering bug.

### 8. Timing violations
- Any investor intro before W6.
- `seed_pitch` before `customers >= 6`.
- `"you've been building two weeks without talking to customers"` at W30 post-launch.
- `alex_commitment` ("can't quit my job") after Alex has been full-time for months.

---

## Strategies

| Strategy | Use for |
|---|---|
| `lean_loop` | General — exercises most cards |
| `lean_loop --no-yc` | Angel arc (Marcus / Fatima / Ryan) |
| `ignore_alex` | Alex departure + post-departure follow-up suppression |
| `distracted` | Maximises `⚠ IGNORED` and follow-ups — best for stale-follow-up bugs |
| `random` | Edge cases |

### Recommended session

```bash
node sim_proto.js --chat 1 --strategy lean_loop --messages
```

Read each file completely — bugs often appear in weeks 20–40.

---

## Reporting Format

For each issue: **file · game · week** · character/section · exact quote · state at that week · why it's wrong · category.

Categories: *stale follow-up* · *wrong state assumption* · *option text wrong* · *repeat without variation* · *missing introduction* · *outcome contradiction* · *roadmap mismatch* · *timing violation*

Group by category. Mark uncertain cases "possibly intentional" rather than skipping.
