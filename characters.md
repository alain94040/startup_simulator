# Characters and dialogue rules

Read this before writing or changing dialogue. It is the character bible
(who these people are, what they would and wouldn't say) and the rules we
learned the hard way while rewriting the pivot night and the Jordan firing
(`final_arc_draft.html`, `story/pivot_day.js`, `story/jordan_talk.js`). Each
rule below corrects a mistake a draft actually made.

---

## The cast

### The founder (the player)
- **Runs the company and the conversations.** In a group thread the
  founder is the one who calls on people, asks the follow-up, and makes the
  call. Other characters don't hold a meeting *at* the player.
- **Doesn't contradict themself.** The founder never volunteers someone for
  a job and then doubts them an hour later. (A draft had the founder say
  "jordan, you've been itching for this one" and then question whether she
  could do it; now Jordan claims the board before the founder can answer.)
- **Has feelings the moments deserve.** At a breakthrough they are excited
  and say so ("this is it… i haven't felt like this since the day we
  started"). After letting a friend go they're "not really" okay. Don't
  write the founder as a neutral decision machine.
- **Talks like a person texting.** Lowercase, short, direct. What they send
  is what a real founder would type, even when their intent is bigger than
  the words (see *Labels and bubbles* below).

### Alex, co-founder and CTO
- **Confident, analytical, argues his side hard.** He shows up with a plan,
  a price and a deadline ("$1,500… the gym holds the slot till midnight").
  He is sometimes wrong (more users won't fix the product), and he can be
  talked out of it *by evidence*. When the evidence lands, he converts
  himself, out loud ("so the $1,500 would have paid for 300 more people to
  get stuck at 'hey'. cancel the gym.").
- **Fair, but not neutral, about Jordan.** He wanted 40% in week 2, and he
  knows that colours how he sees her. When he raises her pace he praises her
  first, names the pattern with specifics (the picker, the iOS sprint, the
  PR review), and doubts his own motives ("maybe that's on me"). **He never
  says "fire her"** and never says "she's not earning it".
- **Says things once.** Rebuffed, he doesn't nag; the second time he gives a
  status, not a complaint ("board's at the RSVP button. same as last week…
  i've stopped waiting for it."). Terse signals carry his feelings: a 👍 to
  Jordan's offer, "okay." after losing an argument, "sure." when he's given
  up asking.
- **Private things go in his DM, not the group.** "can i say something i've
  been sitting on. not in the group."

### Jordan, co-founder (iOS, then the board)
- **The one true fact:** she kept her day job. The company went full-time
  and she didn't. Nobody did anything wrong, and that's the tragedy.
- **Talented and warm.** She has the best product instincts on the team: the
  intake screen her sister shared, watching Maya on launch day, banning the
  abuser, the email to users who left. The player must like her. She is
  often right about the design.
- **Always a week behind, never early.** Her work is good but late: the
  HEIC fix two days late, demo night missed for a release at work. In the
  late game she **only promises, never delivers early** ("first version by
  sunday", "this weekend for sure"). A draft had her ship a sketch at
  midnight, which undercut the whole case against her.
- **Oblivious.** She believes she's doing fine. She never self-diagnoses
  ("i know i've been slow" was cut). When confronted she defends each slip
  as having had a reason ("…has it? i mean — each of those had a reason").
  Her first reaction to being let go is genuine surprise ("i honestly
  didn't see this coming. i thought i was doing fine.").
- **Fights, even when it's pointless.** When told it's over she argues at
  least twice: a protest (partly right — "over text? at midnight? the night
  we finally figured out what we're building?") and a bargain ("give me the
  three weeks… that's fair. you know that's fair."). Only then does she
  stop.
- **Not every split is amicable.** If the founder shows no curiosity about
  her ("I know. I'm sorry." and nothing else), she ends it herself, blocks
  the founder, and a week later closes her developer account and takes the
  App Store listing down with it. If the founder asks what's going on with
  her, she tells the truth, sorts out the practical things, and leaves
  decently.

### Priya, advisor
- **An outsider who has seen the pattern.** She ran a consumer app for four
  years. She gives frameworks and her own scars, **not verdicts**; she
  never tells the player what to decide.
- **Double-edged when it matters.** Her lines can read two ways: "that's a
  big responsibility, jordan… it has to be live in three weeks. not four."
  Jordan hears encouragement; the player hears a warning.
- **Tells her own story after the decision, not before.** Her "i kept a
  co-founder a year too long" lands when she checks in weeks after the
  firing. Told beforehand, it would hand the player the answer.
- **Speaks plainly.** No slogans. A draft had "zero at fifty and you move —
  no second meeting", which nobody could parse; now: "keep count. of the
  next 50 matches, how many actually make plans to meet up? if the answer is
  zero… the app itself is the problem."

---

## Dialogue rules

### Big decisions are never a menu item
- **No option in a routine text says the big thing** ("Fire Jordan"). The
  big decision arrives as the answer to a character's question: Jordan asks
  "are you asking me to leave?", and the founder answers yes or no.
- **Build up to it with honest steps, each with a warm way out.** The
  player chooses honesty several times; the decision is the last step, not
  the first.
- **Signals come from sources with different biases** (Alex resents her,
  Jordan is warm, Priya is ambiguous, the board just doesn't move), so the
  player forms a feeling, not a verdict someone handed them.
- **Keeping the status quo is a choice, labelled as one** ("Let her have
  tonight", "Back off"), so warm exits don't read as merely polite replies.

### Labels and bubbles
- **The chip label is the founder's intent; the bubble is the words sent.**
  Precedent: the mom card, where "Let them invest" sends "can I come over
  for dinner this weekend?". For Jordan, "Ask if she can keep up" sends "it
  sounds great. can i ask you something real?". The player must always know
  what they're stepping into, even when the message itself can't say it.
- **No pronouns without a referent in labels.** "Raise it with her" fails
  because the player doesn't know what "it" is. Name the thing: "I'll talk
  to her about her pace."

### Plain language
- Write how people text. Avoid clever, compressed or aphoristic lines
  ("late beats never", "zero at fifty and you move"). If a line needs
  decoding, rewrite it.
- Every line should make sense to a player who skimmed the previous week.

### Pacing and player control
- **At most 3 options per beat.** More is too many branches to care about.
- **At most 2 single-option beats in a row**, anywhere in a scene
  (`tests/test_scenes.js` enforces this). A run of forced taps reads as a
  cutscene; a 2-forced, 1-choice, 2-forced pattern also makes the player
  feel out of control. When a beat only has one natural reply, find a real
  second one: say the insight yourself, fall for the tempting trap, or pick
  a different tone.
- **One tap, one voice** in a group thread. Never dump several speakers'
  messages at once; the player calls on people, and each tap brings one or
  two messages back.
- **Discovery should be findable but missable.** The pivot has to be dug
  out, and most options lead down (curiosity); one or two plausible options
  stop short. Two wrong choices out of three was too hard.

### Openings and context
- **Every new thread or room opens with a message that says what it's
  about.** A group thread that opened on a bare system cue left the player
  not knowing what to post. Now Alex opens it by restating his pitch for
  Priya and handing the founder the meeting.
- **Don't make the opener redundant.** If a character already made their
  case in the opener, don't offer "make your case" to them as the next
  option.
- **Big arcs are pushed by a character over chat,** not by a founder "Your
  move" card, which players barely notice. The pivot night opens because
  Alex wants to spend the money (a Hail Mary), and stopping him is the big
  decision.
- **Put a door where it will surface.** A character's own thread can be
  busy with other cards; a door that can't appear is no door (the Hail Mary
  moved to the founders' group chat for this reason).

### Consistency
- **Keep the timeline straight.** The run is 25 weeks. Nobody has "two
  years" of history.
- **Keep facts consistent across paths.** If the founder never assigned
  something, no one later speaks as if they did. If Jordan is oblivious, no
  line can have her admit the problem.
- **Everything happens over chat.** No in-person meetings, whiteboards or
  "clear Saturday" framing; the game is an iMessage transcript.

### Consequences
- **Show the cost through the simulation, not a hard-coded loss.** Keeping
  Jordan isn't a lose screen; the board builds at her pace, v2 misses the
  deadline, and the report card says why.
- **Aftermath beats make decisions felt:** the empty standup ("i keep typing
  '@j' out of habit"), Priya checking in, Jordan's cheerful promises that
  keep not arriving, the app vanishing from the store after a cold split.
- **Keep it simple.** One clear recovery beats two clever ones (the
  delisting card has one way back, not a lawyer alternative).

---

## Before you commit dialogue

1. Read the path aloud as a transcript: `node tests/transcript.js --compact`
   (or `--driver <archetype>` for other paths).
2. Run `node tests/test_scenes.js`, which checks forced-tap runs, and
   `node tests/test_narrative.js`.
3. For any new big decision: is it the answer to someone's question? Is
   every label an intent the player understands? Is there a warm exit, and
   is it labelled as one?
