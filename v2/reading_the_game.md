# Reading the game instead of playing it

Notes on how to grasp the story without clicking through `game.html`, what other
narrative-game makers do about the same problem, and what's now built.

## The problem

Every tool in `v2/tests/` reports **statistics about runs** — pacing quantiles,
win rates, card balance, contract pass/fail. None of them shows the **run**.
To read the actual story you had to play the UI, which is slow, repetitive, and
biases you toward the paths your fingers already know.

## What other people in this space do

The interactive-fiction world converged on four moves. None of them is a better
UI — they are all about **getting the prose out of the player loop**.

| Move | Who does it | What it buys |
|---|---|---|
| **Auto-play with a fixed seed** | inkle's [Ink Player window](https://github.com/inkle/ink-unity-integration/blob/master/Documentation/InkPlayerWindow.md) for Unity — runs a story on its own, optionally seeded so you replay the exact same route | You watch a whole route in seconds, and can reproduce it |
| **Thousands of random runs → a coverage report** | [Ink-Tester](https://github.com/wildwinter/Ink-Tester) — plays the story thousands of times picking random options, reports which lines were reached and how often, plus a mode that hunts "ran out of content" dead ends | Finds prose nobody ever sees, and hard dead ends |
| **Fast-forward to the bit you're editing** | [Inky](https://github.com/inkle/inky) — the play pane remembers your choices and, on recompile, fast-forwards back to where you were | Editing a late scene doesn't cost you a full replay |
| **Jump straight to a passage** | Twine's play/test-from-passage | Same idea, from the other end |

The through-line: **the transcript is the artifact**, and the tooling exists to
produce transcripts cheaply and in bulk. That's the gap here, and it's the one
now filled.

Worth noting what we already had that these tools don't: `phase_map.js`'s
"left on read" table is a coverage report in the Ink-Tester sense, and
`play.html`'s debug bar (`jumpTo`) is Inky's fast-forward. The missing third was
the transcript itself.

## What's built: `v2/tests/transcript.js`

A headless run, replayed in order as something you read.

```
node v2/tests/transcript.js                      # seed 42, the decent founder
node v2/tests/transcript.js --compact            # skim the whole run, ~430 lines
node v2/tests/transcript.js --driver no_pivot    # a named archetype
node v2/tests/transcript.js --char alex          # one relationship, in context
node v2/tests/transcript.js --src                # every beat tagged story/file:line
node v2/tests/transcript.js --sample --html book.html
node v2/tests/transcript.js --audit
```

### It reads the surfaces the UI reads

The engine keeps one flat thread per character, but `game.html` splits those
across four surfaces and **drops some entries entirely**. The transcript mirrors
that split, so what you read is what a player saw — not what the engine
recorded. The rules (verified by reading `game.html`'s own constants in a
browser, not by re-deriving them):

| thread | surface | what renders |
|---|---|---|
| ordinary cast | Messages | `incoming` + your `reply` bubbles |
| `hacker_news`, `techcrunch`, `twitter` (`FEED`) | News Feed | `incoming` posts only, options inline |
| `founder`, `growth` (`SELF`) | the "Your move" card, right column | the node text + its options — **never a bubble** |
| `founder` | journal mirror | `outcome` + `stamp` + `incoming` *without* a nodeId |

Everything else the engine records is displayed nowhere. `--audit` lists those.

Five things it shows that the UI can't:

1. **Everything merged in true order.** The engine already stamps every message
   with a monotonic `seq` "for merged transcripts" — this cashes that in. All 19
   threads become one screenplay, so you see what a week actually *felt* like.
2. **The road not taken.** Each answered beat prints the option chosen *and the
   options passed over*, so the branch space is visible while you read.
3. **The seams.** Chapter banners, scene bands (from real engine
   enter/exit, not message tags), week headers with the numbers underneath,
   milestone stamps, `⌛ left on read` for every timeout, and the report card.
4. **Where to go fix it.** `--src` maps every beat back to `story/<file>:<line>`.
5. **Prose the UI silently swallows**, marked in red rather than hidden — the
   whole point is to see what the player doesn't.

### The archetypes (`--sample`)

"Typical stories" means the **13 player archetypes** that `sim_behaviors.js`
already defines — the good founder, the one who never answers the CTO, the one
who refuses the pivot twice, the builder who never talks to a user. Those
definitions moved from `sim_behaviors.js` into `harness.js` so both tools replay
the *same* founders: when a behavior contract fails, the story behind it is one
command away (`--driver <name>`).

`--sample` prints one representative run per archetype with its spine decisions
and outcome mix; for the four archetypes whose story varies by seed (`random`,
`distracted`, `builder`, `marketer`) it plays a cohort and picks the **median**
run by grade, so you read the typical story rather than the luckiest draw.

`--sample --html book.html` writes a self-contained page: all 13 runs, a button
row to switch founder, a week/chapter index down the left (which doubles as a
pacing chart at a glance), and toggles for node ids, journal lines, and ambient
beats.

### The audit (`--audit`)

Ink-Tester's coverage idea, aimed at things a writer wants flagged:

- **never surfaced in any run** — prose no automated founder has ever seen
- **options never chosen** — branches no driver exercises (see caveat below)
- **written but displayed on no UI surface** — the engine recorded it and
  `game.html` renders it nowhere
- **arrives after the last possible action** — text landing in a thread the
  player can never answer, because the run is already over
- **weeks where nobody said anything** — dead air, per archetype
- **journal lines repeated verbatim** inside one run

Caveat, printed in the report itself: every archetype answers through the single
`PREF` table in `harness.js`, so "options never chosen" is mostly a gap in the
**drivers**, not proof of dead prose. Read it as "no automated run exercises
this branch."

## Ideas not built

Roughly in order of value-per-hour, if you want more:

1. **`--diff A B`** — play two archetypes and align their event streams, showing
   only where the stories diverge. The direct answer to "what actually changes
   if I never fire Jordan?" The spine fingerprint in `transcript.js` is already
   most of the machinery.
2. **Fast-forward in `game.html`.** `play.html` has `jumpTo` buttons; the
   shipping UI doesn't. Inky's trick — remember the choice list, replay it on
   reload — would let you edit a chapter-4 beat and be back in chapter 4 in a
   second. Cheap: the choice list is just `game.log`.
3. **"Read the story" button at game over.** The HTML renderer here is
   Node-side; the same view inside `game.html` after the report card would let a
   *player* re-read their run. That's arguably a feature, not just a tool.
4. **Prose-level lint.** Now that transcripts are cheap: flag beats whose text
   contradicts state (a character mentioning users when `users === 0`), narrator
   asides that quote a character (the convention `CLAUDE.md` bans), or a
   character going silent for N weeks after being introduced.
5. **An LLM reader.** Feed `--compact` output to a model with the chapter design
   philosophy from `CLAUDE.md` and ask where the story sags. The transcripts are
   small enough (~430 lines compact) that this is now trivial to run per-commit.
6. **Choice-space explorer.** `test_scenes.js` already BFS's scene permutations;
   generalizing it to the whole graph would answer "which endings are actually
   reachable, and by what."

## First findings

### `equity_impasse`'s reply is written and never shown

The founder's final call on the split —

> equal thirds, final. we're all essential and i'd rather lose points than
> partners. yell at me if you need to — the number's set.

— is a `reply` on a `char: "founder"` node (`story/equity.js:402`). The founder's
thread is rendered by `journalMirror()`, which keeps stamps, outcomes and orphan
drops and **drops replies**; no other surface renders that thread. So the line
never reaches the player on any screen. Jordan's scripted `"thank you."` lands a
beat later, thanking the founder for an announcement the player never saw made.

All three choices on the node carry a reply and `journal: null`, so the
announcement is the intended payload and all of it is lost. Two ways out, both
content-side: turn the reply into a `say` on Alex's and Jordan's threads (it *is*
a message to the group, which matches the "a chat thread holds messages" rule),
or give the node a `journal` line. I left the call to you — it's narrative
content, not a tool bug. `--audit` now reports this class so it can't come back
silently.

### The rest

Reading the decent run end-to-end immediately turned up things the stats hide:

- **The tail after the win.** After `YC ACCEPTED` in week 25, Kevin's cold
  pitch, a churn notice, and a customer complaint all still land. `--audit`
  counts 31 such beats across the archetypes — `alex_decision` (12×) and
  `feature_cluster` (10×) lead. The story ends, then keeps texting.
- **Dead air is archetype-specific.** `decent` has zero silent weeks (as
  `phase_map` reports), but `full_plan` goes quiet in weeks 16, 20, 21 and 24 —
  the over-scoped founder's mid-game is empty, which is exactly when it should
  hurt most.
- **The consulting journal line repeats 8× verbatim** in one run. Recurring
  cards need varied recaps or the journal reads like a stuck record.
- **20 nodes never surface** under any archetype, including a whole cluster in
  `discovery.js` and the growth cards (`dont_scale_seed`, `pricing_experiment`,
  `first_customer_offer`).
