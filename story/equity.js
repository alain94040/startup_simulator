// ─────────────────────────────────────────────────────────────────────────────
// story/equity.js — the equity arc, complete, in one file.
//
// Invite → dance → confess → propose → push back → dictate, one scene.
//
// Jordan opens the topic (the Atlas paperwork forces it), and the ONLY
// choice at that point is whether to sit down at all (`equity_open`) — no
// tone-setting yet, so agreeing to talk doesn't already feel like the
// negotiation started. The real first move — `equity_dance` — only surfaces
// once the player is actually in the room, and nobody names a number in it:
// everyone dodges, in their own way, in the group. Closing the room is its
// own beat (`equity_split_off`): the
// player has to say "i'll talk to each of you separately" before anyone will,
// so the DMs arrive as a consequence rather than on top of the group's last
// word. The real asks come out in those private DMs (Alex's case,
// with the equity calculator as his private homework; Jordan's case, with a
// turned-down job offer she doesn't want read as leverage). Only then does
// the founder go back to the GROUP with a first offer — that's where
// `s.equity_proposal` actually gets set. Whoever it shortchanges pushes back
// a second time, in DM again, angrier because this is round two. The founder
// then rules unilaterally — hold the offer, cave to the pushback, or table
// it — and that message, sent to the group, closes the scene on the spot.
// No consent round, no signing ceremony: the ruling itself is the ending.
//
// No split satisfies both co-founders (by design): thirds leaves Alex
// resentful, 40/40/20 leaves Jordan resentful, 50/25/25 leaves both
// resentful (the one point they end up agreeing on all week), and tabling
// leaves both worse off — and its stated reasoning ("we'll know who's
// carrying what once we're live") is a *worse* dodge than silence, since it
// quietly proposes the exact contribution-based money-grab Jordan rejected
// in Act 1.
//
// This is a *scene* arc: answering Jordan's opener drops all three of you
// into a war-room sitting — beats are free of action cost and flow back to
// back. Ignoring her instead plays the same graph out over normal weeks:
// every beat also has an "@ignored" edge, so the whole conversation can
// resolve by pure inertia (the split defaults to equal thirds, trust quietly
// leaks away).
//
// Everything a co-founder says here is a real message (`effects.say` /
// `e.say`) — no narrator asides in the chat (see CLAUDE.md). WHERE it lands
// is the arc's whole structure: Act 1 and the ruling go to the founders'
// group thread (`char: "founders"`, with `speaker` naming who's talking —
// the founder's own offer and ruling are real group-thread beats too, not
// founder "Your call" pop-ups, since announcing a number to the room is
// exactly the kind of thing that belongs in the room; `system: true` marks
// their framing text as a cue nobody in the room actually said, rendered
// unattributed rather than falsely credited to the group as a whole), while
// Acts 2 and 4 are DMs on the co-founders' own threads. "not in the group,
// but—" only means something because the group is a real room you stepped
// out of. Every ending writes exactly ONE journal line — the ruling itself,
// whichever choice it lands on. There's no separate signing beat: the
// founder's dictate IS the close.
//
// Shared state: `s.equity_proposal` (the split currently on the table — set
// at the Act 3 offer, and the impasse ruling can move it again), `s.equity_
// decided` (the founder made the call — or silence made it for them),
// `s.equity_tabled` (the discussion was parked "until after launch" and
// never came back).
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  // Ignoring the founder's own offer: the topic dies in the group chat and
  // equal thirds wins by default — nobody forgets that the founder never
  // actually said anything.
  const offerTimeout = {
    weeks: 3,
    effects: { flags: { equity_proposal: "33/33/33", equity_skipped: true } },
  };

  const mod = {
    arcs: [
      {
        id: "equity",
        // The room is the group chat plus the two private threads hanging off
        // it — that split IS the arc: Act 1 and the ruling happen in front of
        // everyone, Acts 2 and 4 happen where the other one can't see.
        scene: { cast: ["founders", "jordan", "alex"] },
        beats: [
          // ── Act 1a: the invitation ─────────────────────────────────────────
          // Jordan's opener lands in the founders' GROUP thread (cast.js
          // `founders`), not a DM — but this beat is just the invitation: one
          // choice, sitting down. The real tone-setting decision (Act 1b,
          // below) only happens once the player is actually IN the room, so
          // it never feels like the arc started before they agreed to it.
          {
            id: "equity_open", char: "jordan",
            text: (s) => s.incorporated
              ? "ok, the company paperwork just asked how many shares each of us gets. we should figure this out before it's a whole thing.\n...honestly? i don't know what's \"fair\" here. does anyone want to say a number first?"
              : "hey — we're going to have to answer this eventually, might as well be now: how many shares does each of us get?\n...honestly? i don't know what's \"fair\" here. does anyone want to say a number first?",
            when: { after: ["incorporate"] },
            choices: [
              {
                key: "open", label: "Let's sit down right now and settle it",
                reply: "you're right. let's get the three of us on a call and hash it out now — better us than lawyers later.",
                journal: null,
                effects: { scene: "equity" },
              },
            ],
            // Ignored: no sit-down — the same conversation happens piecemeal,
            // one text at a time, over the coming weeks.
            timeout: { weeks: 2 },
          },

          // ── Act 1b: the dance — now that everyone's actually in the room ──
          // Mid-scene, so it lands the instant the sitting opens. `system` is
          // the cue that the room's open and waiting; the two options are
          // where the founder actually sets the tone for the sitting.
          {
            id: "equity_dance", char: "founders", system: true,
            text: "the call's started — how do you want to open it?",
            when: { after: ["equity_open"] },
            choices: [
              {
                key: "shortcut", label: "Let's just say equal thirds and move on",
                reply: "easiest answer: equal thirds. can we just go with that and get back to work?",
                journal: null,
                effects: {
                  say: [
                    { char: "founders", speaker: "jordan", text: "👍" },
                    { char: "founders", speaker: "alex", text: "sure — i mean, thirds works if we're all doing the same thing day to day. are we? genuinely asking. not trying to start anything." },
                    { char: "founders", speaker: "jordan", text: "we're all in this together. different contributions, sure — but the second we start trying to slice percentages to match who did what, this stops being about building something and starts being about who gets more money. i don't want us to be that." },
                  ],
                },
              },
              {
                key: "open_up", label: "Let's actually talk about what everyone wants first",
                reply: "let's not default our way into this. tell me — actually — what feels fair to each of you. i'll listen to both before anyone signs anything.",
                journal: null,
                effects: {
                  say: { char: "founders", speaker: "alex", text: "can we not do this in the group though? no offense to either of you — i just don't want to negotiate in real time in front of both of you." },
                },
              },
            ],
            // Ignored (real-world-rare — you're already in the room): silence
            // reads as the shortcut, same as the timed-out path below reads
            // as Alex's "...no, yeah. that's fair."
            timeout: { weeks: 2 },
          },

          // ── The room going quiet: Act 1 → Act 2 ───────────────────────────
          // A beat of its own, because the DMs mean nothing if they arrive in
          // the same instant as the group's last word — it reads as everyone
          // talking over each other. The player has to actually close the room
          // ("i'll talk to each of you separately") before either of them will
          // say what they think. Whoever spoke last in the group says it, so
          // both openings land somewhere different: the polite shortcut ends
          // on Alex conceding, the honest one on Jordan standing aside.
          {
            id: "equity_split_off", char: "founders",
            speaker: (s, e) => e.took("equity_dance:open_up") ? "jordan" : "alex",
            text: (s, e) => e.took("equity_dance:open_up")
              ? "sure, whatever's easier. i'm not trying to put anyone on the spot."
              : "...no, yeah. that's fair.",
            when: { after: ["equity_dance"] },
            choices: [
              {
                // A transition, not a fork — the same "continue" shape as
                // launch day's discover→scope→decide setup beats.
                key: "separate", label: "I'll talk to each of you separately",
                reply: "ok — this isn't a group conversation. i'm going to talk to each of you on your own. tell me what you actually think, not what's polite.",
                journal: null,
                fx(s, e) {
                  e.say(e.took("equity_open:open_up")
                    ? { char: "founders", speaker: "alex", text: "yeah. thanks." }
                    : { char: "founders", speaker: "jordan", text: "ok. that's probably fairer anyway." });
                  return null;
                },
              },
            ],
            // Ignored: the room goes quiet on its own and they come to you
            // anyway — nobody was going to let this sit forever.
            timeout: { weeks: 1 },
          },

          // ── Act 2: DMs — what they actually want (parallel, independent) ──
          // Both land together, on purpose: two people messaging you within a
          // minute of the group going quiet, neither knowing the other did.
          {
            id: "equity_dm_alex", char: "alex",
            text: "ok, not in front of jordan, but — here's what i actually think. i quit a $140k job for this. she didn't quit anything. i'm not saying that to be harsh, i'm saying the risk isn't the same and the split shouldn't pretend it is.",
            when: { after: ["equity_split_off"] },
            choices: [
              {
                // A transition, not a fork — same shape as equity_split_off's
                // "I'll talk to each of you separately": the real decision is
                // one beat away, once Alex actually names a number.
                key: "ask", label: "What do you want?",
                reply: "ok. what do you want?",
                journal: null,
              },
            ],
            // Ignored: he doesn't wait to be asked twice.
            timeout: { weeks: 1 },
          },
          {
            id: "equity_dm_alex_ask", char: "alex",
            text: [
              "i want the same equity as you. not close — the same number. that's the difference between being your co-founder and being your first hire. jordan's still got a paycheck behind her, and i think that shows up in her number too. 40/40/20.",
              "...and look, i know how \"i did math about this\" sounds. but i ran our situation through a co-founder equity calculator last night — foundrs.com has one — and it said 40/40/20 too. i'm not just making this up to sound fair.",
            ].join("\n\n"),
            mockups: { calc: { variant: "calc" } },
            when: { after: ["equity_dm_alex"] },
            choices: [
              {
                key: "take_seriously", label: "That's a fair ask — I'm taking it seriously",
                reply: "that's a fair ask, alex. i'm taking it seriously — i'm not deciding anything yet, but i'm not brushing it off either.",
                journal: null,
                effects: { say: { char: "alex", text: "that's all i wanted. i wasn't sure i was allowed to want that." } },
              },
              {
                key: "see_it", label: "Send me the calculator — I want to run it myself",
                reply: "send it to me. i want to look at the actual numbers, not just the number.",
                journal: null,
                effects: { say: { char: "alex", text: "...yeah, fair. here. i'm not trying to hide behind a website. i just wanted backup." } },
              },
              {
                key: "wait_for_jordan", label: "I hear you, but I'm not deciding until I've talked to Jordan too",
                reply: "i hear you. i'm not committing to a number until i've heard her side too.",
                journal: null,
                effects: { char: { alex: { morale: -3 } }, say: { char: "alex", text: "...ok. fair. i just didn't want my case to get lost." } },
              },
            ],
            timeout: { weeks: 2, effects: { char: { alex: { morale: -6 } } } },
          },
          {
            id: "equity_dm_jordan", char: "jordan",
            text: "not in the group, but — i need you to actually hear this part. i had an offer. full-time, with equity, from an actual company, three weeks ago. i turned it down to keep building this.",
            when: { after: ["equity_split_off"] },
            choices: [
              {
                // A transition, not a fork — same shape as equity_dm_alex's
                // "what do you want?": the real ask is one beat away.
                key: "ask", label: "What are you saying?",
                reply: "what are you saying?",
                journal: null,
              },
            ],
            // Ignored: she doesn't wait to be asked twice either.
            timeout: { weeks: 1 },
          },
          {
            id: "equity_dm_jordan_ask", char: "jordan",
            text: [
              "i'm not saying i need more than thirds. i'm saying don't let \"she's not all-in\" be the thing that costs me. i am all-in. i just didn't quit loudly.",
              "so when the argument is \"jordan still has a job to fall back on\" — i want you to know that's not free. i gave up a real one to be here. i just didn't tell alex, because i didn't want it to sound like a threat.",
            ].join("\n\n"),
            when: { after: ["equity_dm_jordan"] },
            choices: [
              {
                // Same three registers as Alex's DM above (validate / verify /
                // defer-and-it-costs-something), not by coincidence — both DMs
                // are the founder deciding how to receive a private confession,
                // and it reads oddly if only one side of that decision has
                // real weight. This used to offer "why didn't you tell either
                // of us" and "does Alex know" as separate choices, which asked
                // the same thing twice: her answer never actually stays secret
                // either way (Act 5 surfaces the offer to Alex regardless of
                // which split it lands on), so the two were pure flavor
                // duplicates rather than a real fork.
                key: "big_deal", label: "That's a big deal — thank you for trusting me with it",
                reply: "that's a big deal, jordan. thank you for trusting me with it.",
                journal: null,
                effects: { char: { jordan: { trust: 5 } }, say: { char: "jordan", text: "...yeah. it felt like a big deal to turn down, too." } },
              },
              {
                key: "doesnt_change_math", label: "That doesn't change the math for me — but I hear you",
                reply: "i hear you. i'm not sure it changes the number, but it changes how i see you.",
                journal: null,
                effects: { char: { jordan: { trust: 3 } }, say: { char: "jordan", text: "that's... actually all i wanted. i wasn't asking you to pay me for it." } },
              },
              {
                key: "need_a_minute", label: "I need to sit with that — give me a minute",
                reply: "i need to sit with that. give me a minute.",
                journal: null,
                effects: { char: { jordan: { trust: -3 } }, say: { char: "jordan", text: "...yeah. that's kind of what i was afraid you'd say." } },
              },
            ],
            timeout: { weeks: 2, effects: { char: { jordan: { trust: -4 } } } },
          },

          // ── Act 3: back to the group — the founder's first offer ──────────
          // This is where s.equity_proposal actually gets set. It's a real
          // group-thread beat (char: "founders"), not a founder "Your call"
          // pop-up — announcing a number to the room is exactly the kind of
          // thing that belongs IN the room, gated the same way any group beat
          // would be (after both DMs), not pulled out of it into a modal.
          {
            id: "equity_offer", char: "founders", system: true,
            text: "you've heard both of them now — everyone's waiting on what you send next.",
            when: { after: ["equity_dm_alex_ask", "equity_dm_jordan_ask"], if: (s) => !s.equity_proposal },
            choices: [
              {
                key: "thirds", label: "Thirds — everyone's essential",
                reply: "different risk, different shapes, but everyone here gave up something to be in this. i think it's thirds.",
                journal: null,
                effects: { flags: { equity_proposal: "33/33/33" }, say: { char: "founders", speaker: "alex", text: "...ok. thirds, then." } },
              },
              {
                key: "forty", label: "40/40/20 — Alex's case",
                reply: "alex — you're right that day-one risk isn't equal between the two of you. i'm going 40/40/20.",
                journal: null,
                effects: { flags: { equity_proposal: "40/40/20" }, say: { char: "founders", speaker: "jordan", text: "wow. ok. forty-forty-twenty." } },
              },
              {
                key: "fifty", label: "50/25/25 — I'm taking half",
                reply: "i'm taking 50. i started this, i'm the one who doesn't get to walk away when it's bad. 25 each for you two.",
                journal: null,
                effects: {
                  flags: { equity_proposal: "50/25/25" },
                  say: [
                    { char: "founders", speaker: "alex", text: "you're kidding — you're keeping fifty for yourself?" },
                    { char: "founders", speaker: "jordan", text: "...that's a choice, keeping half for yourself." },
                  ],
                },
              },
            ],
            timeout: offerTimeout,
          },

          // ── Act 4: DMs again — pushback, sharper (per anchor) ─────────────
          {
            id: "equity_pushback_alex", char: "alex",
            text: [
              "i told you exactly what i needed and you went with the easy number anyway. i get that \"everyone's essential\" sounds nice in a group chat. it also isn't what i asked for.",
              "so — did you not believe me, or did you just not want the fight?",
            ].join("\n\n"),
            when: { if: (s) => s.equity_proposal === "33/33/33" && !s.equity_decided },
            choices: [
              {
                key: "believed_him", label: "I believed you. I still think thirds is right",
                reply: "i believed you. i still think thirds is right.",
                journal: null,
                effects: { say: { char: "alex", text: "ok. at least say it's a choice and not a compromise." } },
              },
              {
                key: "reframe", label: "It wasn't about you — it was about not starting unequal",
                reply: "it wasn't about you. it was about not starting this company already unequal.",
                journal: null,
                effects: { say: { char: "alex", text: "...i can live with that framing. i still don't love it." } },
              },
              {
                key: "flinched", label: "You're right, I flinched. Let me think about it again",
                reply: "you're right. i flinched. let me think about it again.",
                journal: null,
                effects: { say: { char: "alex", text: "don't tell me that unless you mean it." } },
              },
            ],
            timeout: { weeks: 2, effects: { char: { alex: { morale: -6 } } } },
          },
          {
            id: "equity_pushback_jordan", char: "jordan",
            text: [
              "you heard about the offer. you know what i turned down. and you still went with the number that makes it look like i wasn't all-in.",
              "i'm not going to bring up the offer again like it's a bargaining chip. but i need you to understand — you're not just picking a percentage, you're telling me what my \"yes\" was worth. and you said 20%.",
              "and look — the actual difference between 40/40/20 and equal thirds is about seven points each, for you two. that's not nothing, but it's not what's keeping either of you up at night either. for me it's the difference between being a partner and being on an allowance.",
            ].join("\n\n"),
            when: { if: (s) => s.equity_proposal === "40/40/20" && !s.equity_decided },
            choices: [
              {
                key: "fix_it", label: "You're right — it should be closer. Let me fix it",
                reply: "you're right. it should be closer. let me fix it.",
                journal: null,
                effects: { say: { char: "jordan", text: "...don't say that unless you mean it." } },
              },
              {
                key: "where_we_start", label: "20% today isn't a verdict on you. It's where we start",
                reply: "20% today isn't a verdict on you. it's where we start, not where it ends.",
                journal: null,
                effects: { char: { jordan: { trust: -5 } }, say: { char: "jordan", text: "i've heard that before. from other people, about other things." } },
              },
              {
                key: "need_both", label: "I can't undo it in a DM. I need to say this to both of you",
                reply: "i can't undo this in a dm. i need to say whatever i decide to both of you.",
                journal: null,
                effects: { say: { char: "jordan", text: "fine. but you already know what i think." } },
              },
            ],
            timeout: { weeks: 2, effects: { char: { jordan: { trust: -8 } } } },
          },
          {
            // 50/25/25: both push back independently, neither knowing the
            // other is doing the same thing in a separate DM.
            id: "equity_pushback_alex_50", char: "alex",
            text: "you kept half. i left a job for this and i'm getting the same as jordan, who didn't. i'm not trying to be petty — i genuinely don't understand how you landed here.",
            when: { if: (s) => s.equity_proposal === "50/25/25" && !s.equity_decided },
            choices: [
              {
                key: "not_comfortable", label: "You're right. I'm not comfortable with it either",
                reply: "you're right. i'm not comfortable with it either.",
                journal: null,
              },
              {
                key: "need_the_room", label: "I need the room to build something — that's what the 50 is for",
                reply: "i need the room to build something. that's what the 50 is for.",
                journal: null,
                effects: { char: { alex: { morale: -6 } } },
              },
            ],
            timeout: { weeks: 2, effects: { char: { alex: { morale: -6 } } } },
          },
          {
            id: "equity_pushback_jordan_50", char: "jordan",
            text: "you gave yourself double what either of us gets. i get that you started this. i don't get why that means you get to un-equal it the second there's actually something to divide.",
            when: { if: (s) => s.equity_proposal === "50/25/25" && !s.equity_decided },
            choices: [
              {
                key: "not_comfortable", label: "You're right. I'm not comfortable with it either",
                reply: "you're right. i'm not comfortable with it either.",
                journal: null,
              },
              {
                key: "need_the_room", label: "I need the room to build something — that's what the 50 is for",
                reply: "i need the room to build something. that's what the 50 is for.",
                journal: null,
                effects: { char: { jordan: { trust: -6 } } },
              },
            ],
            timeout: { weeks: 2, effects: { char: { jordan: { trust: -6 } } } },
          },

          // ── Act 5: the ruling — final, no negotiating ──────────────────────
          // The founder's own call, sent to the group. Ends the scene. No
          // consent round, no signing ceremony — this beat is the ending.
          {
            // Same reasoning as equity_offer: the ruling is a real group-
            // thread beat, not a founder "Your call" pop-up — announcing the
            // final split is exactly the kind of thing that belongs in the
            // room it closes.
            id: "equity_impasse", char: "founders", system: true,
            text: (s, e) => s.equity_proposal === "50/25/25"
              ? "alex and jordan just made almost the same argument, separately, without knowing it — neither thinks you should keep half. whatever you send next is final."
              : s.equity_proposal === "40/40/20"
                ? "jordan's made her case twice now. whatever you send next is final."
                : "alex's made his case twice now. whatever you send next is final.",
            when: {
              if: (s, e) => !s.equity_decided && (
                (s.equity_proposal === "33/33/33" && e.done("equity_pushback_alex"))
                || (s.equity_proposal === "40/40/20" && e.done("equity_pushback_jordan"))
                || (s.equity_proposal === "50/25/25" && e.done("equity_pushback_alex_50") && e.done("equity_pushback_jordan_50"))
              ),
            },
            choices: [
              {
                key: "hold_thirds", label: "Hold — thirds, final", if: (s) => s.equity_proposal === "33/33/33", branch: true,
                reply: "equal thirds. final. i'd rather lose points than partners — that's not a cop-out, it's the actual reason.",
                journal: "The cap table's set: equal thirds. Jordan got what she wanted from the start. Alex signed anyway. Nobody set up vesting schedules.",
                effects: {
                  flags: { equity_decided: true, jordan_equity: true }, scene: null,
                  say: [
                    { char: "founders", speaker: "jordan", text: "thank you." },
                    { char: "founders", speaker: "alex", text: "ran the numbers and still lost the argument. noted, i guess." },
                  ],
                },
              },
              {
                key: "cave_forty", label: "Cave — you're right, 40/40/20", if: (s) => s.equity_proposal === "33/33/33", branch: true,
                reply: "you're right. i went with the easy number instead of the real one. 40/40/20 — that's what full-time risk should actually get.",
                journal: "The cap table's set: 40/40/20. I walked back my own first call once I heard Alex out again. Nobody set up vesting schedules.",
                effects: {
                  flags: { equity_proposal: "40/40/20", equity_decided: true, jordan_equity: true }, scene: null,
                  say: [
                    { char: "founders", speaker: "alex", text: "...thank you. i wasn't sure i'd said it clearly enough the first time." },
                    { char: "founders", speaker: "jordan", text: "so the group vote didn't count. good to know for next time." },
                  ],
                },
              },
              {
                key: "hold_forty", label: "Hold — 40/40/20, final", if: (s) => s.equity_proposal === "40/40/20", branch: true,
                reply: "40/40/20. final. full-time risk gets full-time equity — that's the whole argument and i'm not pretending it's more complicated than that.",
                journal: "The cap table's set: 40/40/20. Alex got what he asked for. Jordan said the work would argue for her from here. Nobody set up vesting schedules.",
                effects: {
                  flags: { equity_decided: true, jordan_equity: true }, scene: null,
                  say: [
                    { char: "founders", speaker: "alex", text: "thank you for saying it plainly." },
                    { char: "founders", speaker: "jordan", text: "i said no to a real job for this. twenty percent it is." },
                  ],
                },
              },
              {
                key: "cave_thirds_from_forty", label: "Cave — let's do thirds", if: (s) => s.equity_proposal === "40/40/20", branch: true,
                reply: "you turned down a real offer to be here. you just didn't make it a whole thing when you did. and you're right — seven points isn't going to change how alex or i sleep at night. thirds. equal.",
                journal: "The cap table's set: equal thirds. I walked back 40/40/20 once I actually weighed what Jordan gave up to be here. Nobody set up vesting schedules.",
                effects: {
                  flags: { equity_proposal: "33/33/33", equity_decided: true, jordan_equity: true }, scene: null,
                  say: [
                    { char: "founders", speaker: "jordan", text: "...thank you. i didn't think i'd have to say it three times." },
                    { char: "founders", speaker: "alex", text: "so the calculator was just for my own information, then." },
                  ],
                },
              },
              {
                key: "hold_fifty", label: "Hold — 50/25/25 stands, final", if: (s) => s.equity_proposal === "50/25/25", branch: true,
                reply: "the 50 stands. i'll carry what that costs me with both of you. i need it to build this the way it needs building.",
                journal: "The cap table's set: 50/25/25. I kept half. Alex and Jordan agreed on something for the first time all week — that it shouldn't be this. Nobody set up vesting schedules.",
                effects: {
                  flags: { equity_decided: true, jordan_equity: true }, scene: null,
                  say: [
                    { char: "founders", speaker: "alex", text: "for the record — jordan and i actually agree on something. wish it wasn't this." },
                    { char: "founders", speaker: "jordan", text: "he's right. mark the date." },
                  ],
                },
              },
              {
                key: "cave_thirds_from_fifty", label: "Cave — thirds, all three of us equal", if: (s) => s.equity_proposal === "50/25/25", branch: true,
                reply: "you're both right, and neither of you should've had to say it twice to two different people to get here. thirds. all three of us equal.",
                journal: "The cap table's set: equal thirds. I gave back the extra 25 once Alex and Jordan made almost the same argument without knowing it. Nobody set up vesting schedules.",
                effects: {
                  flags: { equity_proposal: "33/33/33", equity_decided: true, jordan_equity: true }, scene: null,
                  say: [
                    { char: "founders", speaker: "alex", text: "it's not the 40 i wanted. but at least nobody's taking more than their share anymore. i can live with equal." },
                    { char: "founders", speaker: "jordan", text: "thank you. genuinely — equal is all i ever wanted. i just couldn't sit with you keeping half." },
                  ],
                },
              },
              {
                // The dodge. Terminal: nobody ever reopens it — and the stated
                // reasoning ("we'll know who's carrying what") is worse than
                // plain silence, since it quietly proposes the contribution-
                // based money-grab Jordan rejected outright back in Act 1.
                key: "table", label: "Table it until after launch",
                reply: "we're going in circles and we have a company to build. i'm parking this until after launch — once we're live, we'll actually be able to see who's carrying what, and we can settle it then.",
                journal: "We tabled equity until after launch — and agreed we'd settle it by who's carrying what once we're live. Everyone typed something short. Nobody meant it. The default thirds went into the paperwork unexamined, like an unpaid bill.",
                effects: {
                  flags: { equity_proposal: "33/33/33", equity_decided: true, equity_tabled: true, jordan_equity: true },
                  char: { alex: { morale: -8, flags: { equity_set: true } }, jordan: { morale: -8 } },
                  say: [
                    { char: "founders", speaker: "alex", text: "so we're back to \"fine.\" cool. that's new." },
                    { char: "founders", speaker: "jordan", text: "we did two rounds of this to land back on the emoji. impressive, honestly." },
                  ],
                  scene: null,
                },
              },
            ],
            // Ignored: silence makes the call — whatever number is on the
            // table sticks, and everyone saw you not send it.
            timeout: { weeks: 3, effects: { flags: { equity_decided: true, jordan_equity: true }, scene: null } },
          },
        ],
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.STORY = window.STORY || []).push(mod);
})();
