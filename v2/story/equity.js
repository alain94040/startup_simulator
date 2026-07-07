// ─────────────────────────────────────────────────────────────────────────────
// v2/story/equity.js — the equity arc, complete, in one file.
//
// Jordan opens with equal thirds → Alex refuses without naming a number. The
// player probes ("what are you thinking?") or commits a split. Whoever the
// split shortchanges counters — exactly one counter round — then the founder
// signs. No split satisfies everyone; only vesting (nobody sets it up) is the
// clean lesson left standing.
//
// This is a *scene* arc: answering Jordan's opener drops all three of you into
// a war-room sitting — beats are free of action cost and flow back-to-back.
// Ignoring her instead plays the same graph out over normal weeks: every beat
// also has an "@ignored" edge, so the whole conversation can resolve by pure
// inertia (the split defaults to equal thirds, trust quietly leaks away).
//
// Shared state: `s.equity_proposal` (the split currently on the table — written
// by several nodes, so it's genuinely world state, not a resolution fact) and
// `s.equity_counter_done` (the one counter round has happened).
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const proposeChoices = (variant) => ([
    {
      key: "propose_33", label: "Equal thirds",
      reply: "equal thirds. jordan found the space and brought us together. you're building. i'm running it. we're all essential.",
      journal: null,
      effects: { flags: { equity_proposal: "33/33/33" }, char: { alex: { morale: -3 } } },
      fx: () => variant === "why"
        ? "Equal split. Alex went quiet — he'd just told you he wanted to be your equal, not Jordan's."
        : "Equal split. Alex went quiet — he expected more weight for his commitment.",
    },
    {
      key: "propose_40", label: variant === "why" ? "40/40/20 — you and me even, Jordan at 20" : "40/40/20",
      reply: "you're right. you and i are all in — jordan's still at her job. 40/40/20 until she goes full-time.",
      journal: null,
      effects: { flags: { equity_proposal: "40/40/20" }, char: { alex: { morale: 5 } } },
      fx: () => variant === "why"
        ? "Alex: 'yeah — that's exactly it.' Jordan hasn't heard yet."
        : "Alex: 'yeah — that's what I was thinking.' Jordan hasn't heard yet.",
    },
    {
      key: "propose_50", label: variant === "why" ? "50/25/25 — I take half" : "50/25/25",
      reply: "i'm taking 50. this is my company — i found the idea, i'm the one not sleeping. 25 each for you and jordan.",
      journal: null,
      effects: { flags: { equity_proposal: "50/25/25" }, char: { alex: { morale: -3 } } },
      fx: () => variant === "why"
        ? "Alex went still. 'I just asked to be even with you.' You'll hear from both of them."
        : "Alex was quiet for a moment. 'Okay. I'll take 25 alongside Jordan.' You'll hear from both of them.",
    },
  ]);

  // Ignoring Alex's ask: the topic dies in the group chat and equal thirds wins
  // by default — he never forgets that you didn't take a position.
  const proposalTimeout = {
    weeks: 3,
    effects: { flags: { equity_proposal: "33/33/33", equity_skipped: true }, char: { alex: { morale: -10 } } },
  };

  const signingText = (s) => {
    const split = s.equity_proposal || "33/33/33";
    if (split === "50/25/25") return "three-way call. 50/25/25 on the table. jordan accepted — at least she's equal to alex. alex signed without comment. nobody mentioned vesting schedules.";
    if (split === "40/40/20") return "three-way call. 40/40/20 agreed. alex seemed satisfied. jordan signed — said she'd prove she's worth more than 20%. nobody set up vesting schedules.";
    return "three-way call. equal thirds. jordan got what she wanted. alex went quiet when the documents came out. nobody brought up vesting — it felt unnecessary between friends.";
  };

  const mod = {
    arcs: [
      {
        id: "equity",
        scene: { cast: ["jordan", "alex", "founder"] },
        beats: [
          {
            id: "equity_open", char: "jordan",
            text: "hey — the three of us should probably sort out equity before it gets weird. equal thirds feels right to me. doesn't have to be today, but soon.",
            when: { after: ["start_prototype"], delay: 1 },
            choices: [
              {
                key: "open", label: "Let's sit down right now and settle it",
                reply: "you're right. let's get the three of us on a call and hash it out now — better us than lawyers later.",
                journal: null,
                effects: { scene: "equity" },
                fx: () => "Cleared the calendar. The three of us, sorting it out now.",
              },
            ],
            // Ignored: no sit-down — the same conversation happens piecemeal,
            // one text at a time, over the coming weeks.
            timeout: { weeks: 2 },
          },
          {
            id: "equity_alex", char: "alex",
            text: "before we lock anything in — i can't sign off on equal thirds. not the way jordan framed it. i need to know where your head's actually at first.",
            when: { after: ["equity_open"], if: (s) => !s.equity_proposal },
            choices: [
              {
                key: "probe", label: "What are you thinking?",
                reply: "before i put a number on the table — talk to me. what feels fair to you, and why?",
                journal: null,
                fx: () => "Asked Alex to lay out his thinking before you name a split.",
              },
              ...proposeChoices("direct"),
            ],
            timeout: proposalTimeout,
          },
          {
            // The probe's answer: his reasoning, then the same three splits.
            id: "equity_alex_why", char: "alex",
            text: "i am doing exactly what you are doing — same hours, same code, same risk. i'm not asking for a gift. i'm asking to be your equal. you and me, even. jordan's great, but she's still got a paycheck to fall back on. so — what's the split?",
            when: { took: ["equity_alex:probe"], if: (s) => !s.equity_proposal },
            choices: proposeChoices("why"),
            timeout: proposalTimeout,
          },
          {
            // Parallel beat: Jordan hears you two talking numbers without her.
            // If the split lands before you answer her, the moment passes — the
            // window closes and the "@ignored" trust hit fires: she got talked past.
            id: "equity_worry", char: "jordan",
            text: "i can hear you and alex going back and forth without me. i opened this with equal thirds and now i'm getting it secondhand. tell me straight — am i an equal partner here, or am i the part-timer you two are quietly pricing down?",
            when: { took: ["equity_alex:probe"], if: (s) => !s.equity_proposal },
            choices: [
              {
                key: "reassure", label: "You're an equal partner",
                reply: "you're an equal partner. i'm not cutting you out — we'll land this fair.",
                journal: null,
                effects: { char: { jordan: { trust: 6, flags: { reassured: true } } } },
                fx: () => "Jordan eased up. 'Okay. I trust you.' Now you've said it out loud.",
              },
              {
                key: "noncommittal", label: "We're still working it out",
                reply: "we're still working it out. nothing's decided yet. i'll loop you in.",
                journal: null,
                effects: { char: { jordan: { trust: -4 } } },
                fx: () => "Jordan went quiet. 'Right. Let me know when you've decided what I'm worth.'",
              },
            ],
            timeout: { weeks: 2, effects: { char: { jordan: { trust: -4 } } } },
          },

          // ── the one counter round: whoever the split shortchanges pushes back ──
          {
            id: "equity_counter_alex", char: "alex",
            text: (s, e) => e.took("equity_alex:@ignored")
              ? "you never even answered jordan on equity, so i'll say it: equal thirds isn't fair. she's got a day job to fall back on. i quit mine. we are not taking the same risk, and the split shouldn't pretend we are."
              : "i need to push back on equal thirds. jordan still has a paycheck coming in every two weeks. i gave that up. same equity for different risk isn't 'fair' — it just feels fair because it's round. i should be at least even with you.",
            when: { if: (s) => s.equity_proposal === "33/33/33" && !s.equity_counter_done },
            choices: [
              {
                key: "cave_40", label: "Give Alex 40%",
                reply: "you're right. you're full-time, she's not. 40/40/20 — i'll tell jordan.",
                journal: null,
                effects: { flags: { equity_proposal: "40/40/20", equity_counter_done: true }, char: { alex: { morale: 10 } } },
                fx: () => "Alex appreciated it. Jordan will hear about the change.",
              },
              {
                key: "hold_33", label: "Keep equal thirds",
                reply: "i hear you, but equal thirds is the right call. everyone's essential. let's not let this fester.",
                journal: null,
                effects: { flags: { equity_counter_done: true }, char: { alex: { morale: -5 } } },
                fx: () => "Alex accepted it. He didn't agree — but he dropped it.",
              },
            ],
            timeout: { weeks: 3, effects: { flags: { equity_counter_done: true }, char: { alex: { morale: -8 } } } },
          },
          {
            id: "equity_counter_alex_50", char: "alex",
            text: "you kept half? and you're handing me the same as jordan??? same hours, same code, same risk — and half says you don't see me as your equal. fix this.",
            when: { if: (s) => s.equity_proposal === "50/25/25" && !s.equity_counter_done },
            choices: [
              {
                key: "give_alex", label: "You're right — you and me at 40, Jordan at 20",
                reply: "you're right. you and i are doing the same work. 40/40/20 — i'll square it with jordan.",
                journal: null,
                // counter_done stays false: Jordan's at 20 now — she counters next.
                effects: {
                  flags: { equity_proposal: "40/40/20" },
                  char: { alex: { morale: 8 } },
                  say: { char: "alex", text: "good. you and me at 40. i'm solid." },
                },
                fx: () => "Alex is solid again. But Jordan's at 20 now — you'll hear from her.",
              },
              {
                key: "equalize", label: "Everyone equal — thirds across the board",
                reply: "you know what, you're both right. equal thirds. we're all essential, let's not poison this over points.",
                journal: null,
                effects: { flags: { equity_proposal: "33/33/33", equity_counter_done: true } },
                fx: () => "Equal thirds. You gave up your majority — but nobody's nursing a grudge.",
              },
              {
                key: "hold_50", label: "I took the risk first — 50/25/25 stands",
                reply: "i hear you. but i started this, i carry the most risk, and the split reflects that. 50/25/25. i need you with me on this.",
                journal: null,
                effects: { flags: { equity_counter_done: true }, char: { alex: { morale: -12, trust: -8 } } },
                fx: () => "Alex went quiet. 'Okay. You're the boss.' Something cooled between you.",
              },
            ],
            timeout: { weeks: 3, effects: { flags: { equity_counter_done: true }, char: { alex: { morale: -12 } } } },
          },
          {
            // Parallel texture on the 50 path: Jordan pipes up in her own thread
            // while Alex confronts you in his. Non-mutating beyond trust.
            id: "equity_5050_interject", char: "jordan",
            text: "fifty for yourself? i came to you asking for equal thirds and you're keeping double what alex and i get. i'll be blunt — founders who grab half before there's anything to grab don't keep their co-founders for long. don't sign that.",
            when: { if: (s) => s.equity_proposal === "50/25/25" && !s.equity_counter_done },
            choices: [
              {
                key: "ack", label: "Hear you — still settling it",
                reply: "i hear you. nothing's signed. we're still settling it.",
                journal: null,
                effects: { char: { jordan: { trust: -5 } } },
                fx: () => "Jordan's blunt about it. 'Fix it before you sign.' Her goodwill is on the clock.",
              },
            ],
            timeout: { weeks: 2, effects: { char: { jordan: { trust: -5 } } } },
          },
          {
            id: "equity_counter_jordan", char: "jordan",
            text: "alex just told me the split. 40, 40, and 20 for me. we write the same code — i'm building the entire iOS app on my own. so why is my work worth half of his? that's not a cap table. that's a message. tell me i'm wrong.",
            when: { if: (s) => s.equity_proposal === "40/40/20" && !s.equity_counter_done },
            choices: [
              {
                key: "cave_33", label: "Equal thirds — fair point",
                reply: "you're right. two people building the product shouldn't be split that unevenly. equal thirds.",
                journal: null,
                effects: { flags: { equity_proposal: "33/33/33", equity_counter_done: true }, char: { alex: { morale: -5 } } },
                fx(s, e) {
                  const jordan = e.cast.get("jordan");
                  jordan.morale = Math.min(100, jordan.morale + 8);
                  jordan.trust = Math.min(100, jordan.trust + (jordan.flags.reassured ? 10 : 6));
                  return "Jordan seemed relieved. Alex heard about it and went quiet — equal wasn't what he asked for.";
                },
              },
              {
                key: "hold_40", label: "You're not full-time — this reflects that",
                reply: "i hear you. but you're still at your job — the split reflects that. 40/40/20 stands until you're all-in.",
                journal: null,
                effects: { flags: { equity_counter_done: true } },
                fx(s, e) {
                  const jordan = e.cast.get("jordan");
                  jordan.morale = Math.max(0, jordan.morale - 10);
                  // Telling her she was an equal and then holding 20% is a broken promise.
                  jordan.trust = Math.max(0, jordan.trust - (jordan.flags.reassured ? 18 : 10));
                  return "Jordan went quiet. 'Fine. I'll show you what 20% worth of work looks like.'";
                },
              },
            ],
            timeout: { weeks: 3, effects: { flags: { equity_counter_done: true }, char: { jordan: { trust: -8 } } } },
          },

          // ── the signing: the founder closes the arc (and the scene) ──────────
          {
            id: "equity_signing", char: "founder",
            text: signingText,
            when: { if: (s) => !!s.equity_counter_done && !s.jordan_equity },
            choices: [
              {
                key: "sign", label: "Sign the agreement",
                journal: "We signed the founder agreement. The split's locked in. Nobody set up vesting schedules — it felt unnecessary between friends. I hope that's not something I regret.",
                effects: { flags: { jordan_equity: true }, char: { alex: { flags: { equity_set: true } } }, scene: null },
                fx: () => "split locked in. documents signed. nobody set up vesting schedules — it felt unnecessary between friends.",
              },
            ],
            // Never leave the world on hold if the signing is ignored.
            timeout: {
              weeks: 3,
              effects: { flags: { jordan_equity: true }, char: { alex: { flags: { equity_set: true } } }, scene: null },
            },
          },
        ],
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.V2STORY = window.V2STORY || []).push(mod);
})();
