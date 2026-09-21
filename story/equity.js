// ─────────────────────────────────────────────────────────────────────────────
// story/equity.js — the equity arc, complete, in one file.
//
// Five beats, one scene: dance → confess → propose → push back → dictate.
//
// Jordan opens the topic (the Atlas paperwork forces it) but nobody names a
// number in the open — that's the dance: everyone dodges, in their own way,
// in the group. The real asks come out in private DMs instead (Alex's case,
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
// `e.say`) in their own thread — no narrator asides in the chat (see
// CLAUDE.md). Every ending writes exactly ONE journal line — the ruling
// itself, whichever choice it lands on. There's no separate signing beat:
// the founder's dictate IS the close.
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
        scene: { cast: ["jordan", "alex", "founder"] },
        beats: [
          // ── Act 1: the group chat — the dance ─────────────────────────────
          {
            id: "equity_open", char: "jordan",
            text: (s) => s.incorporated
              ? "ok, the atlas form just asked how many shares each of us gets. we should figure this out before it's a whole thing.\n...honestly? i don't know what's \"fair\" here. does anyone want to say a number first?"
              : "hey — we're going to have to answer this eventually, might as well be now: how many shares does each of us get?\n...honestly? i don't know what's \"fair\" here. does anyone want to say a number first?",
            when: { after: ["incorporate"] },
            choices: [
              {
                key: "shortcut", label: "Let's just say equal thirds and move on",
                reply: "easiest answer: equal thirds. can we just go with that and get back to work?",
                journal: null,
                effects: {
                  scene: "equity",
                  say: [
                    { char: "jordan", text: "👍" },
                    { char: "alex", text: "sure — i mean, thirds works if we're all doing the same thing day to day. are we? genuinely asking. not trying to start anything." },
                    { char: "jordan", text: "we're all in this together. different contributions, sure — but the second we start trying to slice percentages to match who did what, this stops being about building something and starts being about who gets more money. i don't want us to be that." },
                    { char: "alex", text: "...no, yeah. that's fair." },
                  ],
                },
              },
              {
                key: "open_up", label: "Let's actually talk about what everyone wants first",
                reply: "let's not default our way into this. tell me — actually — what feels fair to each of you. i'll listen to both before anyone signs anything.",
                journal: null,
                effects: {
                  scene: "equity",
                  say: [
                    { char: "alex", text: "can we not do this in the group though? no offense to either of you — i just don't want to negotiate in real time in front of both of you." },
                    { char: "jordan", text: "sure, whatever's easier. i'm not trying to put anyone on the spot." },
                  ],
                },
              },
            ],
            // Ignored: no sit-down — the same conversation happens piecemeal,
            // one text at a time, over the coming weeks.
            timeout: { weeks: 2 },
          },

          // ── Act 2: DMs — what they actually want (parallel, independent) ──
          {
            id: "equity_dm_alex", char: "alex",
            text: [
              "ok, not in front of jordan, but — here's what i actually think. i quit a $140k job for this. she didn't quit anything. i'm not saying that to be harsh, i'm saying the risk isn't the same and the split shouldn't pretend it is.",
              "i want the same equity as you. not close — the same number. that's the difference between being your co-founder and being your first hire. jordan's still got a paycheck behind her, and i think that shows up in her number too. 40/40/20.",
              "...and look, i know how \"i did math about this\" sounds. but i ran our situation through a co-founder equity calculator last night — foundrs.com has one — and it said 40/40/20 too. i'm not just making this up to sound fair.",
            ].join("\n\n"),
            mockups: { calc: { variant: "calc" } },
            when: { after: ["equity_open"] },
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
            text: [
              "not in the group, but — i need you to actually hear this part. i had an offer. full-time, with equity, from an actual company, three weeks ago. i turned it down to keep building this.",
              "so when the argument is \"jordan still has a job to fall back on\" — i want you to know that's not free. i gave up a real one to be here. i just didn't tell alex, because i didn't want it to sound like a threat.",
              "i'm not saying i need more than thirds. i'm saying don't let \"she's not all-in\" be the thing that costs me. i am all-in. i just didn't quit loudly.",
            ].join("\n\n"),
            when: { after: ["equity_open"] },
            choices: [
              {
                key: "why_not_told", label: "Why didn't you tell either of us that?",
                reply: "why didn't you say something? that changes how i'm thinking about this.",
                journal: null,
                effects: { char: { jordan: { trust: 5 } }, say: { char: "jordan", text: "because the second i say it, it's leverage, not truth. i wanted you to believe me without needing proof." } },
              },
              {
                key: "does_alex_know", label: "Does Alex know you turned that down?",
                reply: "does alex know?",
                journal: null,
                effects: { say: { char: "jordan", text: "no. and i'd rather it stayed that way unless it actually matters to what you decide." } },
              },
              {
                key: "doesnt_change_math", label: "That doesn't change the math for me — but I hear you",
                reply: "i hear you. i'm not sure it changes the number, but it changes how i see you.",
                journal: null,
                effects: { char: { jordan: { trust: 3 } }, say: { char: "jordan", text: "that's... actually all i wanted. i wasn't asking you to pay me for it." } },
              },
            ],
            timeout: { weeks: 2, effects: { char: { jordan: { trust: -4 } } } },
          },

          // ── Act 3: back to the group — the founder's first offer ──────────
          // This is where s.equity_proposal actually gets set.
          {
            id: "equity_offer", char: "founder",
            text: "you've heard both of them now. whatever you send to the group next is the number.",
            when: { after: ["equity_dm_alex", "equity_dm_jordan"], if: (s) => !s.equity_proposal },
            choices: [
              {
                // Founder-thread `reply` text never reaches any surface (see
                // reading_the_game.md's writeup of this exact node) — the
                // journal mirror keeps stamps and outcomes, not replies. So
                // the actual number has to be legible from Alex/Jordan's own
                // reactions, not from the reply the player never sees.
                key: "thirds", label: "Thirds — everyone's essential",
                reply: "different risk, different shapes, but everyone here gave up something to be in this. i think it's thirds.",
                journal: null,
                effects: { flags: { equity_proposal: "33/33/33" }, say: { char: "alex", text: "...ok. thirds, then." } },
              },
              {
                key: "forty", label: "40/40/20 — Alex's case",
                reply: "alex — you're right that day-one risk isn't equal between the two of you. i'm going 40/40/20.",
                journal: null,
                effects: { flags: { equity_proposal: "40/40/20" }, say: { char: "jordan", text: "wow. ok. forty-forty-twenty." } },
              },
              {
                key: "fifty", label: "50/25/25 — I'm taking half",
                reply: "i'm taking 50. i started this, i'm the one who doesn't get to walk away when it's bad. 25 each for you two.",
                journal: null,
                effects: {
                  flags: { equity_proposal: "50/25/25" },
                  say: [
                    { char: "alex", text: "you're kidding — you're keeping fifty for yourself?" },
                    { char: "jordan", text: "...that's a choice, keeping half for yourself." },
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
            id: "equity_impasse", char: "founder",
            text: (s, e) => s.equity_proposal === "50/25/25"
              ? "alex and jordan just made almost the same argument to me, separately, without knowing it. neither of them thinks i should keep half. whatever i send next is final."
              : s.equity_proposal === "40/40/20"
                ? "jordan's made her case twice now. whatever i send next is final."
                : "alex's made his case twice now. whatever i send next is final.",
            when: {
              if: (s, e) => !s.equity_decided && (
                (s.equity_proposal === "33/33/33" && e.done("equity_pushback_alex"))
                || (s.equity_proposal === "40/40/20" && e.done("equity_pushback_jordan"))
                || (s.equity_proposal === "50/25/25" && e.done("equity_pushback_alex_50") && e.done("equity_pushback_jordan_50"))
              ),
            },
            choices: [
              {
                key: "hold_thirds", label: "Hold — thirds, final", if: (s) => s.equity_proposal === "33/33/33",
                reply: "equal thirds. final. i'd rather lose points than partners — that's not a cop-out, it's the actual reason.",
                journal: "The cap table's set: equal thirds. Jordan got what she wanted from the start. Alex signed anyway. Nobody set up vesting schedules.",
                effects: {
                  flags: { equity_decided: true, jordan_equity: true }, scene: null,
                  say: [
                    { char: "jordan", text: "thank you." },
                    { char: "alex", text: "ran the numbers and still lost the argument. noted, i guess." },
                  ],
                },
              },
              {
                key: "cave_forty", label: "Cave — you're right, 40/40/20", if: (s) => s.equity_proposal === "33/33/33",
                reply: "you're right. i went with the easy number instead of the real one. 40/40/20 — that's what full-time risk should actually get.",
                journal: "The cap table's set: 40/40/20. I walked back my own first call once I heard Alex out again. Nobody set up vesting schedules.",
                effects: {
                  flags: { equity_proposal: "40/40/20", equity_decided: true, jordan_equity: true }, scene: null,
                  say: [
                    { char: "alex", text: "...thank you. i wasn't sure i'd said it clearly enough the first time." },
                    { char: "jordan", text: "so the group vote didn't count. good to know for next time." },
                  ],
                },
              },
              {
                key: "hold_forty", label: "Hold — 40/40/20, final", if: (s) => s.equity_proposal === "40/40/20",
                reply: "40/40/20. final. full-time risk gets full-time equity — that's the whole argument and i'm not pretending it's more complicated than that.",
                journal: "The cap table's set: 40/40/20. Alex got what he asked for. Jordan said the work would argue for her from here. Nobody set up vesting schedules.",
                effects: {
                  flags: { equity_decided: true, jordan_equity: true }, scene: null,
                  say: [
                    { char: "alex", text: "thank you for saying it plainly." },
                    { char: "jordan", text: "i said no to a real job for this. twenty percent it is." },
                  ],
                },
              },
              {
                key: "cave_thirds_from_forty", label: "Cave — let's do thirds", if: (s) => s.equity_proposal === "40/40/20",
                reply: "you turned down a real offer to be here. you just didn't make it a whole thing when you did. and you're right — seven points isn't going to change how alex or i sleep at night. thirds. equal.",
                journal: "The cap table's set: equal thirds. I walked back 40/40/20 once I actually weighed what Jordan gave up to be here. Nobody set up vesting schedules.",
                effects: {
                  flags: { equity_proposal: "33/33/33", equity_decided: true, jordan_equity: true }, scene: null,
                  say: [
                    { char: "jordan", text: "...thank you. i didn't think i'd have to say it three times." },
                    { char: "alex", text: "so the calculator was just for my own information, then." },
                  ],
                },
              },
              {
                key: "hold_fifty", label: "Hold — 50/25/25 stands, final", if: (s) => s.equity_proposal === "50/25/25",
                reply: "the 50 stands. i'll carry what that costs me with both of you. i need it to build this the way it needs building.",
                journal: "The cap table's set: 50/25/25. I kept half. Alex and Jordan agreed on something for the first time all week — that it shouldn't be this. Nobody set up vesting schedules.",
                effects: {
                  flags: { equity_decided: true, jordan_equity: true }, scene: null,
                  say: [
                    { char: "alex", text: "for the record — jordan and i actually agree on something. wish it wasn't this." },
                    { char: "jordan", text: "he's right. mark the date." },
                  ],
                },
              },
              {
                key: "cave_thirds_from_fifty", label: "Cave — thirds, all three of us equal", if: (s) => s.equity_proposal === "50/25/25",
                reply: "you're both right, and neither of you should've had to say it twice to two different people to get here. thirds. all three of us equal.",
                journal: "The cap table's set: equal thirds. I gave back the extra 25 once Alex and Jordan made almost the same argument without knowing it. Nobody set up vesting schedules.",
                effects: {
                  flags: { equity_proposal: "33/33/33", equity_decided: true, jordan_equity: true }, scene: null,
                  say: [
                    { char: "alex", text: "it's not the 40 i wanted. but at least nobody's taking more than their share anymore. i can live with equal." },
                    { char: "jordan", text: "thank you. genuinely — equal is all i ever wanted. i just couldn't sit with you keeping half." },
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
                    { char: "alex", text: "so we're back to \"fine.\" cool. that's new." },
                    { char: "jordan", text: "we did two rounds of this to land back on the emoji. impressive, honestly." },
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
