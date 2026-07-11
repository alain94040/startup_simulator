# v2 playability review — is the game fun?

*A structured playtest of `v2/game.html`. Method: read the engine + story files; played
full runs as transcripts (decent play on seeds 42 & 1, a deliberate "bad founder" run —
greedy equity, full scope, licensed matching, deferred pivot); drove the real UI in
Chromium through week rollovers and all four scenes; ran `phase_map.js` (600 games); and
compared against the games this genre borrows from (Reigns, Lifeline, chat fiction,
narrative roguelites).*

---

## Verdict in one paragraph

The middle of this game — roughly demo night through pivot day — is genuinely fun, and the
writing is the best asset the project has. The scenes do exactly what they were built to
do: they break the weekly routine, and launch day in particular is a real high point. What
keeps v2 from being a game people replay is the **frame around that middle**: the ending is
decided by a literal dice roll (YC accepts 18% of qualified applicants and a rejection is
game over), the second win path (angels) is unreachable in practice, the punishment for the
game's own central lesson (over-scoping) is **twelve consecutive weeks of silence**, and
almost half the "decisions" offer exactly one reply chip while consuming one of the
player's two weekly actions. The game currently earns its drama but not its endings.

---

## 1. Is the game fun?

**Weeks 1–19: yes.** The cadence works — two moves a week is a real economy, the triage
column frames each week as "what do I spend myself on," and the story spine (equity → dev
plan → build-vs-buy → demo night → launch → the slide → pivot day) lands beat after beat.
The evidence-banking design is quietly brilliant: calling Maya in week 17 because a journal
card nudged you, then *playing that call as your winning argument* on pivot day, is the
best mechanic in the game. It makes research feel like ammunition instead of homework.

**Weeks 20–29: it deflates.** After pivot day the game reverts to disconnected one-off
cards (fix a crash, call a churned user, ignore two spam consultants, run a channel test)
while runway drains. The narrative pull that carried the first two acts is gone; the maya
bookend is lovely but it's one message in a sea of maintenance. Then the run ends on a
coin flip (below).

**The endings are the problem, in both directions.**

- **The win doesn't feel won.** On seed 1 and seed 42 I played *materially identical*
  runs — same equity call, same lean plan, same pivot, same week-26 application. Seed 1:
  "You're in. Welcome to the batch." Seed 42: "we're passing," game over. The verdict is
  `rng() < 0.18` (`story/fundraising.js:264`). An 18% acceptance rate is realistic, but a
  game is not a startup: when perfect play loses 4 times in 5 to hidden dice *and the loss
  ends the run*, the player's correct takeaway is "my choices didn't matter." That is the
  exact opposite of the lesson the game wants to teach.
- **The alternative win is a mirage.** `phase_map.js`: `won_angels 0%`, `Lead investor
  reach 0%`. The whole investor cast (Marcus, Fatima, Ryan) unlocks only via
  `s.priya_advising`, which requires: go to a founder meetup (an *ambient* card that loses
  to story beats for the founder slot, window weeks 2–11) → Priya unlocks → answer her
  competitor-bomb card, which is gated `week <= 16` — while median launch is week 16 and
  Priya's fallback unlock is launch+2. In normal play the chain is dead before it starts,
  so the player never even *sees* an investor, never learns the angel path exists, and the
  "Lead Investor / Round Closed" milestones read as decoration. (revamp.md already flags
  this under re-balance; this playtest confirms it's not a tuning nit — it's half the win
  state missing.)
- **The worst failure mode is boredom.** The bad-founder run (full/A plan) hit the
  designed trap — `good_enough_launch` gated on `allScopeBuilt`, auto items crawling on a
  part-time team — and the result was weeks 23→35 with **zero messages, zero choices,
  zero commentary**, just the runway ticking to bankruptcy. Nobody says "we're drowning in
  scope." Alex doesn't panic, Jordan doesn't quit, no descope rescue card fires. The
  over-scope lesson — arguably the game's thesis — is taught as dead air. A punished
  player should be busy drowning, not watching a number decrement.

**Fun scorecard:** opening act B+, middle act A−, endgame C−, endings D.

## 2. Are the dialogues engaging?

**Yes — this is the project's superpower.** The voices are distinct and consistently in
character: Alex's lowercase engineer-earnestness ("wrong either way is the same grave.
different flowers."), Jordan's defensiveness that reads as foreshadowing ("that's not a cap
table. that's a message."), Priya's scar-tissue mentoring ("'then nothing' is the whole
ballgame."), Mom's "i just wired you $4,000. so proud of you honey ❤️". Demo night's
"so what happens now?" post-it is a genuinely great piece of narrative design — planted as
a feeling, harvested twice (Jordan's flag, pivot day's echo).

Three caveats:

1. **The system voices break the fiction.** "Users", "Growth", "Market", "Analytics" speak
   like tooltips wearing a trenchcoat ("you have real users now. they're going to start
   talking." / "one channel down, the picture's still fuzzy."). Every real character earns
   the messenger idiom; these four spend it. Chat fiction lives or dies on the interface
   feeling authentic (see §5) — consider routing analytics through Alex, user mail as
   actual forwarded emails (the Rachel K. card already does this perfectly), and growth
   beats through the journal.
2. **Double-texted intros read as a bug.** Every unlock posts its `intro` *and* its first
   story node in the same poll, so Brett, David, Lena, Kevin, Sarah, Priya, Twitter and
   Users all introduce themselves twice in a row, often with near-identical text ("found
   you on crunchbase…" ×2 back-to-back). In the UI this doubles the notification stack.
   Easy fix, disproportionate polish gain.
3. **43% of interactive nodes have exactly one choice** (69 of 162). Inside scenes,
   single-chip beats are fine — they're pacing. Outside scenes they cost one of two weekly
   actions to press "okay" (`bug_reports`: the only chip is "Drop everything and fix it";
   `incorporate`, `interviews`, `waitlist_cold`, `ios_sprint_2`…). The player notices the
   difference between *making a call* and *acknowledging a cutscene*, and the action
   economy shouldn't price them the same.

## 3. Do the cinematic moments break the routine?

**Emphatically yes — best thing about v2.** Verified in the browser: launch day takes over
the screen ("Launch Day. / The code is live." fade-in, dark war-room skin, a clock walking
8AM → 11PM, "moves in the room are free"), and its 19-beat DAG has real texture — the
staging-database panic, the lorem-ipsum test profile mini-crisis with an honesty decision,
the Stripe verification wall, Jordan's 😭 goodnight. It compresses "launch day feels like a
week in an hour" into play, and the free-action rule correctly signals *this day is
different*.

- **Equity (9 beats)** — good scene, and its reactivity is underrated: probing Alex first
  changes his proposal framing, Jordan interjects *because* you and Alex went back-channel,
  and the one-counter-round rule keeps it from cycling. It fires week 2, which is early for
  a "cinematic" (no attachment yet), but as a tone-setter it works.
- **Demo night (4 beats)** — small and perfect. Watching a stranger fight a broken uploader
  is show-don't-tell product education.
- **Pivot day (8 beats)** — the intellectual peak. Alex arguing his own side honestly
  ("what result would change your mind?"), Priya forcing the replay of the eleven best
  matches, and the evidence-chip hinge paying off three weeks of banking. This is the
  scene that teaches.
- **The gap between scenes is felt.** phase_map: demo→launch is +7 weeks median, the
  longest stretch, and it's mostly direction cards + community filler. One more mid-sized
  scene (App Store review day? the Austin mixer?) would carry the middle.

The turn-end reveal grammar (runway ticks down → journal inks in → notifications buzz in
sequence) gives even ordinary weeks a heartbeat. It's good juice and it's honest juice.

## 4. Is the game easy to understand, not overwhelming?

**Mostly yes — the UI is doing heavy, successful lifting.** The intro states the goal in
one breath ("$10,000, a burn rate, two moves a week. Get to a seed round (or YC) before the
money runs out."). The triage column ("Needs a call" / "When you have a minute") solves
chat-sim's classic problem — *where am I supposed to look?* — and the stage-based to-do
gauge ("Ship the demo 0 of 7" → "Survive the slide 4 of 5") always names the current act.
YC window countdown in the header creates useful dread.

Where it overwhelms or under-informs:

- **The rail grows to ~15 threads by week 18**, many of them one-message spam characters
  (Brett, Kevin, Jamie, David). Real messengers archive; this rail only grows.
- **Meters saturate and go dead.** Signal and fit both pin at 100 by ~week 17 in decent
  play and never move again — two of the four header stats stop meaning anything for the
  back half of the game (Reigns keeps its four meters *dangerous* for the whole run;
  that's the whole game).
- **The invisible economy cuts both ways.** Morale/trust/warmth being hidden is a fine
  design choice (people, not progress bars) — but only if the *behavior* leaks the number.
  Alex at morale 40 texts the same way as Alex at 90 outside his scripted arcs, so holding
  50/25/25 "worked" in my bad run as far as the player could see.
- **Half the win condition is unexplained.** The intro says "seed round (or YC)" but
  nothing in-game ever shows round progress (no angel gauge parallel to the YC window),
  and since investors never unlock (§1), a player could finish three runs without knowing
  angels are a win path.

## 5. What the comparable games know (and what to steal)

- **Reigns** (~887 cards, runs measured in minutes): its addictiveness comes from visible
  meters that stay dangerous at both extremes, runs short enough that death is content, and
  cards that reference earlier choices so "the whole game becomes authored in weird and
  unexpected ways." Kindred's single 60–90 minute run with a fixed spine can't do
  death-as-content — which means each run's *ending* carries far more weight, and a dice
  ending is priced accordingly. Meters that pin at 100 are anti-Reigns.
- **Lifeline**: proof that the texting idiom + economical writing + timing (typing
  delays, real-time gaps) creates attachment. v2's typing dots, staggered notifications and
  read-cursor reveal are the right instincts, already in place. Lifeline also never breaks
  voice — no system narrator — which is the standard the Users/Growth/Market threads miss.
- **Narrative roguelites**: the replay loop is "every failed run reveals something that
  makes the next run smarter," with meta-progression as the retention hook. v2's report
  card *is* that reveal — it's a great artifact — but the YC coin flip severs the loop:
  a loss that doesn't map to a mistake teaches nothing and motivates nothing. A
  cross-run hook is missing entirely: nothing persists between runs, and because the spine
  is deterministic (p10 = median = p90 for every beat), a second run replays ~85% identical
  text. Either embrace "this is a 2–3 attempt game" and vary the endings, or add
  cross-run recognition ("lessons mastered across runs" on the report card).
- **Bury Me, My Love / Simulacra**: chat fiction engagement hangs on the interface feeling
  *real* — real senders, real cadence. v2's best moments already comply (Rachel K.'s
  forwarded support email; Jordan's 11pm 😭 text). The double-intro stutter and tooltip
  characters are the compliance failures.
- **Business sims** (Startup Wars, Wharton's Startup Game): their value is compressed
  feedback loops — decision → consequence fast enough to feel. v2's slowest feedback
  (equity → Jordan's decay → firing, ~20 weeks) is fine *because* the journal narrates the
  chain; the broken case is feedback that never arrives (silent scope-death, invisible
  morale).

## 6. Prioritized recommendations

1. **Make the ending earned (highest impact).** Replace the flat 18% roll with a verdict
   computed from the same facts the report card grades — pivot story, paying customers,
   evidence trail, team intact — with the dice at most nudging a middle band. And a
   rejection should name its reason in-fiction ("the co-founder question worried us" when
   Jordan's 33% is still dirty on the cap table). Alternatively (or additionally): YC
   rejection stops ending the game — you're rejected *into* the angel path with 8 weeks of
   runway. Rejection becomes act four, not a modal.
2. **Resurrect the angel path.** Multiple routes into `priya_advising` (she's already
   guaranteed post-launch — let her later cards grant it too); an in-header round gauge
   once any investor is warm, so the second win condition is visible.
3. **Never let failure be silent.** The over-scope stall needs an escalation ladder:
   Alex's warning → a descope rescue decision (cut the extra scope, lose morale, keep the
   company) → if still ignored, Jordan walks / Alex forces the conversation. If the
   player is truly cornered, fast-forward to the ending — 12 empty weeks is the one thing
   a chat game must never do.
4. **Stop charging actions for acknowledgments.** Single-chip, non-scene nodes should be
   free (or auto-resolve into the journal). Reserve the 2-action economy for nodes where
   the player actually chooses between futures. This one change makes every week feel
   denser at zero content cost.
5. **De-duplicate unlock intros** (suppress `intro` when the character's first node
   surfaces in the same poll, or make the intro *be* the first node).
6. **Keep the meters alive.** Rescale signal/fit so decent play sits at 60–80 pre-pivot
   (or make the header show *retention/true fit* post-launch — which the world model
   already computes as `trueFit` and hides). A number that can still disappoint is a
   number worth watching.
7. **Let the hidden stats leak.** 2–3 morale-keyed flavor variants on Alex/Jordan's
   routine messages (curt when low, warm when high) would make the relationship economy
   legible without showing a bar.
8. **Trim the endgame.** Weeks 20+ need either the fundraising arc actually present
   (fix #2 and this mostly solves itself) or a compression of the maintenance cards.

## Appendix: the numbers behind the claims

- `phase_map.js` (600 games, decent+pivot): 10% win (all YC), 57% YC-rejected, 32%
  bankrupt; `won_angels 0%`, `Lead investor reach 0%`; demo→launch +7wk median is the
  longest gap; `competitor_launch`, `reporter_deadline`, `launch_surface` ignored in
  ~100% of games (mis-scheduled, not mis-written).
- 162 choice-bearing nodes; 69 (43%) single-option.
- Seed 42 vs seed 1, identical decent play: rejection vs acceptance (`fundraising.js:264`,
  `rng() < 0.18`).
- Bad-founder run (seed 7, full plan): last surfaced choice week 25, bankruptcy week 35 —
  10+ consecutive weeks with no message of any kind.
- Scenes verified in-browser: intro overlay, triage column, week-end reveal, launch-day
  takeover + clock, pivot summit, report card path (`showEndgame`).

**Reference reading on the comparators:**
[Reigns adaptive narrative deep dive (Game Developer)](https://www.gamedeveloper.com/design/game-design-deep-dive-creating-an-adaptive-narrative-in-i-reigns-i-) ·
[Reigns review — "addicted to death" (TechRaptor)](https://techraptor.net/gaming/reviews/reigns-review-addicted-to-death) ·
[Lifeline: building narrative out of push notifications (Game Developer)](https://www.gamedeveloper.com/design/building-a-narrative-out-of-push-notifications-in-i-lifeline-i-) ·
[Lifeline retrospective (50 Years of Text Games)](https://if50.substack.com/p/2015-lifeline) ·
[Bury Me, My Love: writing a game that feels real (Game Developer)](https://www.gamedeveloper.com/design/bury-me-my-love-tips-for-writing-a-game-that-feels-real) ·
[Roguelite meta-progression design (Bugnet)](https://bugnet.io/blog/how-to-design-a-roguelite-meta-progression) ·
[Agency in roguelikes](https://thom.ee/blog/what-makes-or-breaks-agency-in-roguelikes/)
