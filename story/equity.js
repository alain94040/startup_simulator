// ─────────────────────────────────────────────────────────────────────────────
// story/equity.js — the equity arc, complete, in one file.
//
// Jordan opens with equal thirds → Alex refuses without naming a number. The
// player probes ("what are you thinking?") or commits a split — but a number
// named early is an ANCHOR, not an ending: whoever it shortchanges argues
// back, the demands collide out loud (Alex wants parity with the founder AND
// daylight over Jordan; Jordan wants no daylight at all — no split satisfies
// both), and only the founder's call at the impasse makes a number final.
// Whoever the final split disappoints gets their say before the signing —
// nobody signs a cap table they never got to argue with. Tabling the whole
// thing at the impasse is allowed, terminal, and silently expensive: default
// thirds go into the paperwork unexamined, both co-founders deflate, and the
// report card remembers. Only vesting (nobody sets it up) is the clean lesson
// left standing.
//
// This is a *scene* arc: answering Jordan's opener drops all three of you into
// a war-room sitting — beats are free of action cost and flow back-to-back.
// Ignoring her instead plays the same graph out over normal weeks: every beat
// also has an "@ignored" edge, so the whole conversation can resolve by pure
// inertia (the split defaults to equal thirds, trust quietly leaks away).
//
// Everything a co-founder says here is a real message (`effects.say` / `e.say`)
// in their own thread — no narrator asides in the chat (see CLAUDE.md). And the
// arc writes exactly ONE journal line, at whichever ending it reaches: the
// signing, or the tabling that replaces it. The journal is a summary of the run,
// not a transcript of a negotiation — every other beat here is `journal: null`.
//
// Shared state: `s.equity_proposal` (the split currently on the table — the
// impasse decision overwrites it, so downstream readers always see the final
// number), `s.equity_decided` (the founder made the call — or silence made it
// for them), `s.equity_tabled` (the discussion was parked "until after launch"
// and never came back).
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const proposeChoices = (variant) => ([
    {
      key: "propose_33", label: "Equal thirds",
      reply: "equal thirds. jordan found the space and brought us together. you're building. i'm running it. we're all essential.",
      journal: null,
      effects: { flags: { equity_proposal: "33/33/33" }, char: { alex: { morale: -3 } } },
    },
    {
      key: "propose_40", label: variant === "why" ? "40/40/20 — you and me even, Jordan at 20" : "40/40/20",
      reply: "you're right. you and i are all in — jordan's still at her job. 40/40/20 until she goes full-time.",
      journal: null,
      effects: { flags: { equity_proposal: "40/40/20" }, char: { alex: { morale: 5 } } },
    },
    {
      key: "propose_50", label: variant === "why" ? "50/25/25 — I take half" : "50/25/25",
      reply: "i'm taking 50. this is my company — i found the idea, i'm the one not sleeping. 25 each for you and jordan.",
      journal: null,
      effects: { flags: { equity_proposal: "50/25/25" }, char: { alex: { morale: -3 } } },
    },
  ]);

  // Ignoring Alex's ask: the topic dies in the group chat and equal thirds wins
  // by default — he never forgets that you didn't take a position.
  const proposalTimeout = {
    weeks: 3,
    effects: { flags: { equity_proposal: "33/33/33", equity_skipped: true }, char: { alex: { morale: -10 } } },
  };

  // Has the party the current anchor shortchanges been heard? Gates the
  // crossfire: the impasse only makes sense once the pushback is on record.
  const counterHeard = (s, e) =>
    s.equity_proposal === "33/33/33" ? e.done("equity_counter_alex")
      : s.equity_proposal === "40/40/20" ? e.done("equity_counter_jordan")
        : e.done("equity_counter_alex_50") && e.done("equity_5050_interject");

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
            // Two openings, because there are two ways in. Filed: the Atlas
            // form itself asks who owns what, and Jordan just read that
            // question. Never filed (the paperwork went unanswered): she
            // raises it on her own, the way she always would have.
            text: (s) => s.incorporated
              ? "the atlas form just asked how many shares each of us gets 😅 so — we should sort out equity before it gets weird. equal thirds feels right to me. doesn't have to be today, but soon."
              : "hey — the three of us should probably sort out equity before it gets weird. equal thirds feels right to me. doesn't have to be today, but soon.",
            // Chained to the paperwork, not the calendar: you can't split a
            // company that doesn't exist yet (see incorporate's own text). On
            // the golden path the filing pulls this into the same week via
            // `effects.surface`, so the crisis still lands in week 2; if the
            // paperwork gets ignored instead, the @ignored resolution satisfies
            // `after` and the opener arrives at the next boundary — late, but
            // never lost.
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
          {
            id: "equity_alex", char: "alex",
            text: "before we lock anything in — i can't sign off on equal thirds. not the way jordan framed it. i need to know where your head's actually at first.",
            when: { after: ["equity_open"], if: (s) => !s.equity_proposal },
            choices: [
              {
                key: "probe", label: "What are you thinking?",
                reply: "before i put a number on the table — talk to me. what feels fair to you, and why?",
                journal: null,
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
                effects: {
                  char: { jordan: { trust: 6, flags: { reassured: true } } },
                  say: { char: "jordan", text: "okay. i trust you. it just helps to hear it out loud." },
                },
              },
              {
                key: "noncommittal", label: "We're still working it out",
                reply: "we're still working it out. nothing's decided yet. i'll loop you in.",
                journal: null,
                effects: {
                  char: { jordan: { trust: -4 } },
                  say: { char: "jordan", text: "right. let me know when you two have decided what i'm worth." },
                },
              },
            ],
            timeout: { weeks: 2, effects: { char: { jordan: { trust: -4 } } } },
          },

          // ── the reactions: the anchor lands and the room takes positions ─────
          {
            // 33 on the table: Jordan thinks it's over. It isn't — Alex is next.
            id: "equity_jordan_relief", char: "jordan",
            text: "alex says you're at thirds. good. see — that wasn't hard. can we get it in writing before anyone gets clever about it?",
            // Her premature relief is overtaken once the impasse opens (Alex has
            // countered and you're being asked to call it). If it's still sitting
            // unanswered, its window closes so it yields Jordan's single slot to
            // the impasse beat waiting behind it — otherwise a scene sitting can't
            // surface her report/impasse line while this holds her thread.
            when: { if: (s, e) => s.equity_proposal === "33/33/33" && !s.equity_decided && !s.equity_skipped && !e.done("equity_impasse_alex") },
            choices: [
              {
                key: "not_yet", label: "It's not signed yet",
                reply: "not yet it isn't. alex still gets his say before anything goes in writing.",
                journal: null,
                effects: { say: { char: "jordan", text: "his say about what, exactly?" } },
              },
              {
                key: "celebrate", label: "Thirds it is",
                reply: "thirds it is.",
                journal: null,
                effects: { char: { jordan: { trust: 2 } }, say: { char: "jordan", text: "🍾🍾🍾" } },
              },
            ],
            timeout: { weeks: 2 },
          },
          {
            // 40 on the table: Alex hands you his own defense of it — the
            // earn-in argument, in his voice, before Jordan pushes back.
            id: "equity_alex_justify", char: "alex",
            text: "thank you. seriously. and so you have it for when jordan pushes back — my case isn't 'jordan matters less.' i'm not saying she's worth 20 forever. i'm saying the split should match today, and today she has a salary and we don't.",
            when: { if: (s) => s.equity_proposal === "40/40/20" && !s.equity_decided },
            choices: [
              {
                key: "argument", label: "That's the argument I'll make",
                reply: "that's the argument i'll make if she pushes. the split matches today.",
                journal: null,
                effects: {
                  char: { alex: { morale: 2 } },
                  say: { char: "alex", text: "good. then we're saying the same thing when she asks." },
                },
              },
              {
                key: "mine", label: "If she pushes back, that's mine to answer",
                reply: "don't rehearse her rebuttal for me. if she pushes back, i answer for it.",
                journal: null,
                effects: { say: { char: "alex", text: "fair. she's already typing, by the way." } },
              },
            ],
            timeout: { weeks: 2 },
          },

          // ── the counters: whoever the anchor shortchanges argues back.
          // Nothing gets decided here — these put the case on record; the
          // number only moves at the impasse, where the founder calls it. ─────
          {
            id: "equity_counter_alex", char: "alex",
            text: (s, e) => e.took("equity_alex:@ignored")
              ? "you never even answered jordan on equity, so i'll say it: equal thirds isn't fair. she's got a day job to fall back on. i quit mine. we are not taking the same risk, and the split shouldn't pretend we are."
              : e.took("equity_alex:propose_33")
                ? "wow. okay. that was fast. before that number sticks — i quit a $140k job for this. jordan still gets a paycheck every two weeks. i'll say what i'm asking out loud: even with you, and ahead of her. equal thirds gives me neither."
                : "i laid out my whole case and you still went with the round number. so, one more time, slower: jordan has a paycheck. i don't. same equity for different risk isn't fair — it just feels fair because it's round.",
            when: { if: (s) => s.equity_proposal === "33/33/33" && !s.equity_decided },
            choices: [
              {
                key: "risk_real", label: "You're right — it's not the same risk",
                reply: "you're right that it's not the same risk. i'm not pretending it is. let me sit with the numbers.",
                journal: null,
                effects: {
                  char: { alex: { morale: 4, trust: 2 } },
                  say: { char: "alex", text: "that's all i'm asking you to admit. take the time, just don't send anything to the group until you have." },
                },
              },
              {
                key: "essential", label: "Everyone's essential — that's what thirds says",
                reply: "you're not wrong about the risk. i still think everyone here is essential, and that's what thirds says.",
                journal: null,
                effects: { char: { alex: { morale: -4 } }, say: { char: "alex", text: "noted." } },
              },
            ],
            timeout: { weeks: 2, effects: { char: { alex: { morale: -6 } } } },
          },
          {
            id: "equity_counter_alex_50", char: "alex",
            text: "you kept half? and you're handing me the same as jordan??? same hours, same code, same risk — and half says you don't see me as your equal. fix this.",
            when: { if: (s) => s.equity_proposal === "50/25/25" && !s.equity_decided },
            choices: [
              {
                key: "hear_him", label: "Say it all — I'm listening",
                reply: "say all of it. i'm listening.",
                journal: null,
                effects: {
                  char: { alex: { morale: 2 } },
                  say: [
                    { char: "alex", text: "i'm not asking for a gift. i left a salary. i write half this product. i'm not asking to be paid, i'm asking not to be an employee at the company i'm building." },
                    { char: "alex", text: "i just need to know you see me as your equal." },
                  ],
                },
              },
              {
                key: "first_risk", label: "I started this — the risk was mine first",
                reply: "i started this. i carried it alone before either of you said yes. that's what the 50 is.",
                journal: null,
                effects: {
                  char: { alex: { morale: -6, trust: -4 } },
                  say: { char: "alex", text: "okay. so we're employees." },
                },
              },
            ],
            timeout: { weeks: 2, effects: { char: { alex: { morale: -10 } } } },
          },
          {
            // Parallel texture on the 50 path: Jordan pipes up in her own thread
            // while Alex confronts you in his. Non-mutating beyond trust.
            id: "equity_5050_interject", char: "jordan",
            text: "fifty for yourself? i came to you asking for equal thirds and you're keeping double what alex and i get. i'll be blunt — founders who grab half before there's anything to grab don't keep their co-founders for long. don't sign that.",
            when: { if: (s) => s.equity_proposal === "50/25/25" && !s.equity_decided },
            choices: [
              {
                key: "ack", label: "Blunt is fine — it isn't settled",
                reply: "blunt is fine. i'd rather hear it now than after i've signed something. this isn't settled.",
                journal: null,
                effects: {
                  char: { jordan: { trust: -5 } },
                  say: { char: "jordan", text: "fix it before you sign, then." },
                },
              },
            ],
            timeout: { weeks: 2, effects: { char: { jordan: { trust: -5 } } } },
          },
          {
            id: "equity_counter_jordan", char: "jordan",
            text: "alex just told me the split. 40, 40, and 20 for me. we write the same code — i'm building the entire iOS app on my own. so why is my work worth half of his? and before anyone says 'salary' — my day job is why i cost this company nothing. that's not a discount, that's a subsidy. tell me i'm wrong.",
            when: { if: (s) => s.equity_proposal === "40/40/20" && !s.equity_decided },
            choices: [
              {
                key: "hear_her", label: "Two builders shouldn't be that far apart",
                reply: "you're right that the gap is ugly. two people building the same product shouldn't be half of each other. i'm not done thinking.",
                journal: null,
                effects: {
                  char: { jordan: { trust: 3 } },
                  say: { char: "jordan", text: "then think fast. docusign doesn't do take-backs." },
                },
              },
              {
                key: "today", label: "The split matches today — you're not full-time",
                reply: "you're not wrong about the code. but the split matches today, and today you're moonlighting. that's not an insult, it's a fact.",
                journal: null,
                effects: { char: { jordan: { morale: -4, trust: -6 } } },
              },
              {
                key: "revisit", label: "40/40/20 today — the day you're full-time, we revisit",
                reply: "the 20 isn't a verdict on you, it's a photo of today. the day you go full-time, we revisit the whole thing. i mean that.",
                journal: null,
                effects: {
                  char: { jordan: { trust: 1, flags: { promised_path: true } } },
                  say: { char: "jordan", text: "i'm screenshotting this." },
                },
              },
            ],
            timeout: { weeks: 3, effects: { char: { jordan: { trust: -8 } } } },
          },

          // ── the crossfire: two live arguments, then the founder's call.
          // Both cofounders already made their formal case in the counter
          // beats above, so this isn't re-argument — it's Alex reaching for
          // outside validation (very him) and Jordan naming the meta-problem
          // (having to argue for her own worth at all). Private threads: Alex
          // and Jordan can't see each other's message here, only what they
          // tell each other directly (the convince-Jordan branch below). ─────
          {
            id: "equity_impasse_alex", char: "alex",
            text: "okay, very \"plugged it into a spreadsheet\" of me, but i found this co-founder equity calculator on foundrs.com and ran our numbers through it last night. it said 40/40/20, give or take. i'm allowed to double-check my own case.",
            mockups: { calc: { variant: "calc" } },
            when: { if: (s, e) => !!s.equity_proposal && !s.equity_decided && counterHeard(s, e) },
            choices: [
              {
                key: "ack", label: "Noted — give me a minute",
                reply: "duly noted. give me a minute with this.",
                journal: null,
                effects: { say: { char: "alex", text: "take your time. i just wanted you to know i did my homework." } },
              },
              {
                // The dodge: pass the hard call to the two people already in
                // conflict. It costs nothing yet — that's the trap; the real
                // price lands in the report-back beats below.
                key: "convince_jordan", label: "Go talk to Jordan — try to convince her yourself",
                reply: "you two are the ones who actually disagree. go talk to her — see if you can find the number between you.",
                journal: null,
                effects: { say: { char: "alex", text: "uh — okay. i can do that." } },
              },
            ],
            timeout: { weeks: 1, effects: { char: { alex: { morale: -3 } } } },
          },
          {
            // Report-back A: the dodge produced nothing — both of them stand
            // exactly where they started, and now both are waiting on the
            // founder instead of one.
            id: "equity_impasse_alex_report", char: "alex",
            text: "talked to jordan. told her about the calculator, walked through the numbers. she wasn't having it. we're exactly where we started.",
            when: { after: ["equity_impasse_alex"], took: ["equity_impasse_alex:convince_jordan"], if: (s) => !s.equity_decided },
            choices: [
              {
                key: "ok", label: "Okay — I'll figure it out",
                reply: "okay. i'll figure it out myself.",
                journal: null,
                effects: {
                  char: { alex: { morale: -6, trust: -4 } },
                  say: { char: "alex", text: "yeah. probably should've been you from the start." },
                },
              },
            ],
            timeout: { weeks: 1, effects: { char: { alex: { morale: -6, trust: -4 } } } },
          },
          {
            id: "equity_impasse_jordan_report", char: "jordan",
            text: "alex called me — walked me through that equity calculator like the numbers would change my mind. so i sent him back paul graham's essay, the one where he says founders should just split it equally and stop trying to price who mattered most. we went in circles. i still don't want to keep making the case for why i belong here — that's still the whole problem. nothing's different, except now there's two of us waiting on you instead of one.",
            when: { after: ["equity_impasse_alex"], took: ["equity_impasse_alex:convince_jordan"], if: (s) => !s.equity_decided },
            choices: [
              {
                key: "own_it", label: "That's on me, not him — I'll decide",
                reply: "that's on me, not him. i'll decide.",
                journal: null,
                effects: {
                  char: { jordan: { morale: -6, trust: -4 } },
                  say: { char: "jordan", text: "good." },
                },
              },
            ],
            timeout: { weeks: 1, effects: { char: { jordan: { morale: -6, trust: -4 } } } },
          },
          {
            id: "equity_impasse_jordan", char: "jordan",
            text: "i don't want to keep making the case for why i deserve to be here. i shouldn't have to. that's kind of the whole problem.",
            when: { if: (s, e) => e.done("equity_impasse_alex") && !e.took("equity_impasse_alex:convince_jordan") && !s.equity_decided },
            choices: [
              {
                key: "heard", label: "You shouldn't have to",
                reply: "you shouldn't have to. you're not on trial here — i'm not going to make you keep proving it.",
                journal: null,
                effects: { say: { char: "jordan", text: "okay." } },
              },
            ],
            timeout: { weeks: 1, effects: { char: { jordan: { trust: -2 } } } },
          },
          {
            // The founder's call. Notes-to-self thread, same register as the
            // signing. Tabling is allowed, terminal, and quietly expensive.
            id: "equity_impasse", char: "founder",
            text: (s) => "notes to self. alex: even with me, ahead of jordan — he won't bend. jordan: no gaps at all — she won't ask twice."
              + (s.equity_proposal === "50/25/25" ? " my 50 is still on the table and neither of them will sign it happily." : "")
              + " both waiting. whatever i send to the group next is the cap table.",
            when: {
              if: (s, e) => !s.equity_decided && !s.jordan_equity
                && (e.done("equity_impasse_jordan") || (e.done("equity_impasse_alex_report") && e.done("equity_impasse_jordan_report"))),
            },
            choices: [
              {
                key: "thirds_final", label: "Equal thirds — final",
                reply: "equal thirds, final. we're all essential and i'd rather lose points than partners. yell at me if you need to — the number's set.",
                journal: null,
                effects: {
                  flags: { equity_proposal: "33/33/33", equity_decided: true },
                  say: { char: "jordan", text: "thank you." },
                },
                fx(s, e) {
                  const jordan = e.cast.get("jordan");
                  jordan.morale = Math.min(100, jordan.morale + 8);
                  jordan.trust = Math.min(100, jordan.trust + (jordan.flags.reassured ? 10 : 6));
                  return null;
                },
              },
              {
                key: "forty_final", label: "40/40/20 — final",
                reply: "40/40/20, final. full-time risk gets full-time equity. jordan — come yell at me, not at him.",
                journal: null,
                effects: {
                  flags: { equity_proposal: "40/40/20", equity_decided: true },
                  char: { alex: { morale: 10 } },
                  say: { char: "alex", text: "thank you for saying it plainly." },
                },
              },
              {
                key: "fifty_final", label: "50/25/25 stands — final",
                if: (s) => s.equity_proposal === "50/25/25",
                reply: "the 50 stands. i started this and i'll carry the blame for it too. 25 each — i need you both anyway.",
                journal: null,
                effects: {
                  flags: { equity_decided: true },
                  say: { char: "jordan", text: "noted." },
                },
              },
              {
                // The dodge. Terminal: nobody ever reopens it — default thirds
                // go into the incorporation paperwork unexamined, and the only
                // callbacks are the deflated meters and the report card.
                key: "table", label: "Table it until after launch",
                reply: "we're going in circles and we have a product to ship. parking this until after launch — i promise we come back to it.",
                journal: "We tabled equity until after launch. Everyone typed 'fine.' Nobody meant it. The default thirds went into the paperwork unexamined, like an unpaid bill.",
                effects: {
                  flags: { equity_proposal: "33/33/33", equity_decided: true, equity_tabled: true, jordan_equity: true },
                  char: { alex: { morale: -8, flags: { equity_set: true } }, jordan: { morale: -8 } },
                  say: [
                    { char: "alex", text: "fine." },
                    { char: "jordan", text: "👍" },
                  ],
                  scene: null,
                },
              },
            ],
            // Ignored: silence makes the call — whatever number is on the
            // table sticks, and everyone saw you not send it.
            timeout: { weeks: 3, effects: { flags: { equity_decided: true } } },
          },

          // ── consent: whoever the final number disappoints says so to your
          // face before anything gets signed. Nobody signs unheard. ────────────
          {
            id: "equity_consent_alex", char: "alex",
            text: (s, e) => s.equity_proposal === "50/25/25"
              ? "okay. you're the boss. 25 for me, 25 for jordan, half for you. i'll get back to work."
              : e.took("equity_counter_alex:risk_real")
                ? "for the record — you saying the risk isn't the same is the only reason i'm signing this without a fight. equal thirds. your call. i'm still here."
                : "fine. equal thirds. just remember, when my girlfriend asks why i left a salary to be worth exactly what the part-timer is worth — this was your call, not mine.",
            when: { if: (s) => !!s.equity_decided && !s.equity_tabled && !s.jordan_equity && s.equity_proposal !== "40/40/20" },
            choices: [
              {
                key: "own_it", label: "It was my call",
                reply: "it was my call, and i'll own every consequence of it. thank you for staying.",
                journal: null,
                fx(s, e) {
                  const alex = e.cast.get("alex");
                  if (s.equity_proposal === "50/25/25") {
                    alex.morale = Math.max(0, alex.morale - 12);
                    alex.trust = Math.max(0, alex.trust - 8);
                    return null;
                  }
                  const soft = e.took("equity_counter_alex:risk_real");
                  alex.morale = Math.max(0, alex.morale - (soft ? 2 : 5));
                  return null;
                },
              },
            ],
            timeout: {
              weeks: 1,
              fx(s, e) {
                const alex = e.cast.get("alex");
                alex.morale = Math.max(0, alex.morale - (s.equity_proposal === "50/25/25" ? 12 : 6));
                if (s.equity_proposal === "50/25/25") alex.trust = Math.max(0, alex.trust - 8);
                return null;
              },
            },
          },
          {
            id: "equity_consent_jordan", char: "jordan",
            text: (s, e, char) => char.flags.promised_path
              ? "okay. twenty — for now. i screenshotted 'we revisit' and i'm holding you to it. now let's go build the thing."
              : e.done("equity_jordan_relief")
                ? "so the thirds i said thank-you for lasted about an hour. twenty. understood. i'll let the commits argue for me from here."
                : "okay. twenty. i'll keep score in commits.",
            when: { if: (s) => !!s.equity_decided && !s.equity_tabled && !s.jordan_equity && s.equity_proposal === "40/40/20" },
            choices: [
              {
                key: "heard", label: "The work already argues for you",
                reply: "twenty for now — and i know what it cost you to type that. the work already argues for you, louder than i did.",
                journal: null,
                fx(s, e, char) {
                  const promised = !!char.flags.promised_path;
                  char.morale = Math.max(0, char.morale - (promised ? 3 : 10));
                  // Telling her she was an equal and then holding 20% is a
                  // broken promise; the earn-in framing softens the landing.
                  const hit = promised ? (char.flags.reassured ? 6 : 3) : (char.flags.reassured ? 18 : 10);
                  char.trust = Math.max(0, char.trust - hit);
                  if (!promised) e.say({ char: "jordan", text: "fine. i'll show you what 20% worth of work looks like." });
                  return null;
                },
              },
            ],
            timeout: {
              weeks: 1,
              fx(s, e) {
                const jordan = e.cast.get("jordan");
                jordan.morale = Math.max(0, jordan.morale - 10);
                jordan.trust = Math.max(0, jordan.trust - (jordan.flags.reassured ? 18 : 10));
                return null;
              },
            },
          },

          // ── the signing: the founder closes the arc (and the scene) ──────────
          {
            id: "equity_signing", char: "founder",
            text: signingText,
            when: {
              if: (s, e) => !!s.equity_decided && !s.equity_tabled && !s.jordan_equity
                && (s.equity_proposal === "40/40/20" ? e.done("equity_consent_jordan") : e.done("equity_consent_alex")),
            },
            choices: [
              {
                key: "sign", label: "Sign the agreement",
                journal: "We signed the founder agreement. The split's locked in. Nobody set up vesting schedules — it felt unnecessary between friends. I hope that's not something I regret.",
                effects: { flags: { jordan_equity: true }, char: { alex: { flags: { equity_set: true } } }, scene: null },
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
  else (window.STORY = window.STORY || []).push(mod);
})();
