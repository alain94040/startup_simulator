(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'priya', type: 'advisor',

    slice: [
      "mentor_competitor_bomb",
      "slide_priya_ping",
      "pivot_day_priya_case",
      "pivot_day_shape",
      "pivot_day_close",
    ],

    role: "Advisor",
    name: "Priya",  // chat display name
    // Two ways in: the founder meetup (early), or — if the player never went —
    // she reaches out herself once the launch makes PlusOne visible. Either way
    // the pivot summit always has its second voice.
    intro: (s) => s.met_priya
      ? "hey! great meeting you at the meetup last week. been thinking about what you're building — i have some thoughts on the dating app space when you have a minute."
      : "hey — you don't know me. priya. a friend sent me plusone's launch thread; i ran a consumer social app for four years, sold it, now i mostly drink coffee with founders. i've seen your week-two graph before — not yours specifically, but i'd bet rent on the shape. this is me offering the coffee.",
    unlockCondition: (s) => (s.met_priya === true && s.week >= s.met_priya_week + 2)
      || (s.launched && s.week >= (s.launch_week || 0) + 2),
    cards: [
      {
        id: 'mentor_competitor_bomb', cat: 'c', from: 'Priya (advisor)',
        body: "looked at your idea over the weekend. you should know: there are at least 8 serious relationship apps in the app store right now — two well-funded. one is YC-backed from last year. you need a sharper answer to 'why plusone.'",
        urgency: 3, weeks: 1,
        available: (s, char) => s.week <= 10 && s.signal < 60 && !char.flags.competitor_resolved,
        options: [
          { label: 'Do a competitive deep-dive', key: 'research',
            journal: "Spent the weekend doing a full competitive analysis. Eight serious dating apps, two well-funded, one YC-backed. None of them solve it the way we do — that's our wedge. Priya's officially advising now.",
            execute(s, char) { char.flags.competitor_resolved = true; s.signal = clamp(s.signal + 8, 0, 100); s.market_fit = clamp(s.market_fit + 6, 0, 100); s.network.advisors++; return "Did a full competitive analysis. None of them solve it for your niche. That's your wedge. Priya is now a real advisor."; } },
        ],
        dropDelay: 2, dropFrom: 'Priya',
        dropMsg: "any progress on differentiating from the competition? investors will definitely ask.",
        dropFx(s, char) { s.signal = clamp(s.signal - 8, 0, 100); s.investor_warmth = clamp(s.investor_warmth - 8, 0, 100); },
      },

      // ── THE SLIDE (week L+2/L+3): Priya names the number that matters ─────────
      {
        id: 'slide_priya_ping', cat: 'c', from: 'Priya (advisor)',
        body: (s) => s.met_priya
          ? "saw the launch — congrats, genuinely. that's the part most people never do. real talk though: how's week two? and i mean retention, not signups. those are different numbers and only one of them is real."
          : "so — the coffee offer was half social. the real question: how's week two treating you? and i mean retention, not signups. those are different numbers and only one of them is real.",
        urgency: 12, weeks: 1,
        available: (s, char) => s.launched && s.activities_cut && !s.activities_pivot
          && !s.pivot_summit_done && s.week >= (s.launch_week || 0) + 2
          && !char.flags.ping_done,
        options: [
          { label: 'Give her the real numbers', key: 'real_numbers',
            reply: "honestly? day one was great and it's been gravity ever since. matches happen, then nothing.",
            journal: "Priya asked about week two — retention, not signups. I gave her the real answer: matches happen, then nothing. She said 'then nothing' is the whole ballgame, and offered to clear a Saturday.",
            execute(s, char, e) {
              char.flags.ping_done = true;
              char.flags.ping_honest = true;
              e.threads.priya.push({
                type: 'incoming', from: 'Priya',
                body: "'then nothing' is the whole ballgame. when you're ready to take that seriously, i'll clear a saturday.",
                week: s.week, isNew: true, seq: e._seq++,
              });
              return "'Then nothing' is the whole ballgame, she said. She's ready to clear a Saturday.";
            } },
          { label: "Still reading the data", key: 'deflect',
            reply: "still reading the data. early days.",
            journal: "Priya asked about week-two retention and I deflected — 'still reading the data.' Her reply landed anyway: data doesn't read itself. The offer stands.",
            execute(s, char, e) {
              char.flags.ping_done = true;
              e.threads.priya.push({
                type: 'incoming', from: 'Priya',
                body: "sure. data doesn't read itself though. offer stands.",
                week: s.week, isNew: true, seq: e._seq++,
              });
              return "She didn't push. 'Data doesn't read itself though. Offer stands.'";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.ping_done = true; },
      },

      // ── PIVOT DAY — Priya's beats in the summit focus arc ─────────────────────
      {
        // Beat 3: she doesn't argue back — she raises the stakes on evidence.
        id: 'pivot_day_priya_case', cat: 'p', from: 'Priya (advisor)', focus: 'pivot',
        body: "my turn. short version. 'it'll get better when we're bigger' is the most expensive sentence in this business — i've said it myself, and it cost me a year. sometimes it's even true. that's what makes it dangerous. so let's not argue opinions. alex: your analytics score every match, right? pull up the best ones — the matches that *should* have worked. show me what happened to them.",
        urgency: 19.5, patience: Infinity,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          return s.focus && s.focus.id === 'pivot' && alex && alex.flags.pd_case_done && !char.flags.pd_priya_done;
        },
        options: [
          { key: 'pull_it', label: 'Pull the best matches — watch the replay',
            reply: "do it. best matches we've ever made. let's watch the replay.",
            journal: null,
            execute(s, char) { char.flags.pd_priya_done = true; return null; } },
        ],
      },
      {
        // Beat 5: what "pivot" even means — a reframe, not a feature.
        id: 'pivot_day_shape', cat: 'p', from: 'Priya (advisor)', focus: 'pivot',
        body: "so say it's the product. one warning first: don't just bolt an 'events tab' onto the app. every dying dating app does that, and users can smell it. flip the whole thing instead. you don't browse people — you browse plans: 'thursday. climbing gym. six of us, two spots open.' the first message is never 'hey' again — it's 'i'm in.' plusone stops being a chat app full of dead ends and becomes a calendar with people on it.",
        urgency: 18.5, patience: Infinity,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          return s.focus && s.focus.id === 'pivot' && alex && alex.flags.pd_evidence_done && !char.flags.pd_shape_done;
        },
        options: [
          { key: 'flip', label: 'Browse plans, not people',
            reply: "that's it. you browse a plan, not a person. write it on the board.",
            journal: null,
            execute(s, char, e) {
              char.flags.pd_shape_done = true;
              // Alex's engineering read — the old MatchKit decision bites or pays here.
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: s.matching_licensed
                  ? "here's where i get to be mad about a months-old decision: matchkit can't do this. it matches singles, that's all it does, and we can't touch its insides. it has to come out — all of it. we'd be paying to remove the thing we paid to add."
                  : "…the weird part: the matching engine survives. picking people for a plan is the same math — i can repoint it in a week. what dies is everything you can see. every screen. all of it.",
                week: s.week, isNew: true, focus: 'pivot', seq: e._seq++,
              });
              return null;
            } },
        ],
      },
      {
        // Beat 8: night. Closes the focus arc — the world resumes.
        id: 'pivot_day_close', cat: 'p', from: 'Priya (advisor)', focus: 'pivot',
        body: (s) => s.pivot_choice === 'pivot'
          ? "one more thing before i go. most founders can't do what you did today — kill a thing that works in favor of a thing that's true. that's the whole job, and almost nobody does it while there's still enough cash to survive it. text me the second v2 is live. i want to be user #1."
          : s.pivot_choice === 'growth'
            ? "good fight today. it's your company and it was a real argument. watch one number for me: of your next 50 matches, how many turn into a plan to meet. zero at fifty and you move — no second summit. deal?"
            : "that's not a strategy, it's a hedge — and hedges ship late and mediocre twice. i said it once, and now i'll respect your call. for what it's worth, i hope i'm wrong. i'm usually not about this one.",
        urgency: 16, patience: Infinity,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          return s.focus && s.focus.id === 'pivot' && alex && alex.flags.pd_decide_done && !char.flags.pd_close_done;
        },
        options: [
          { key: 'night', label: 'Thank her — long day, right call',
            reply: "thank you for today. whichever way it goes — that was the most useful room this company has ever been in.",
            journal: "Pivot day ended after dark. Whiteboard full, coffee cold, decision made. Whatever happens next, that room was the most useful eight hours this company has spent.",
            execute(s, char) {
              char.flags.pd_close_done = true;
              s.focus = null;  // pivot day is over — the world resumes
              return null;
            } },
        ],
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.priya = def;
})();
