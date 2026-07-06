(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Direction decisions move the build (mirror of the helper in roles/alex.js):
  // answering a direction ask grants immediate buildEffort on top of the passive
  // weekly accrual. Jordan has no part-time penalty — her drag is the lower
  // build skill and, later, the drifting arc.
  function grantEffort(char, amt) {
    const pt = (char.archetypeId === 'alex' && !char.flags.committed_fulltime) ? 0.6 : 1.0;
    char.buildEffort = (char.buildEffort || 0) + amt * pt;
  }

  const def = {
    id: 'jordan', name: 'Jordan', type: 'cofounder',

    slice: [
      "jordan_equity_mention",
      "jordan_equity_worry",
      "jordan_equity_counter_jordan",
      "jordan_equity_5050_interject",
      "early_working_style",
      "early_pricing",
      "jordan_dir_first_screen",
      "matching_engine_choice",
      "jordan_ios_sprint",
      "jordan_dir_trust_safety",
      "pivot_open",
      "slide_jordan_echo",
      "jordan_fulltime_ask",
      "launch_first_bounce",
      "launch_first_signup_live",
      "launch_hustle_temptation",
      "launch_abuser_early",
      "launch_going_home",
      "launch_9pm_crisis",
      "launch_signal",
    ],

    role: "Co-founder · iOS",
    skills: { build: 0.7 },

    // Jordan's day job ramps up a few weeks into the build: her real hours erode,
    // so her passive build contribution (the engine honors flags.effort_mult)
    // trails Alex's within a couple of weeks. That lag is the *observable* signal —
    // her iOS items stall on the roadmap — that the drift arc later names, so firing
    // follows something the player could see rather than a bare timer. It's a shallow
    // slide (floor 0.85): enough to be visible and to cross the drift threshold, not
    // enough to swing the balance. Diagnostic only — nothing the player does reverses
    // it (she's genuinely half-committed). Freezes once she drifts or the arc resolves.
    tick(s, char, e) {
      if (!s.jordan_active || s.jordan_drifting || s.jordan_resolved) return;
      if (s.dev_start_week == null || s.week < s.dev_start_week + 1) return;
      const cur = typeof char.flags.effort_mult === "number" ? char.flags.effort_mult : 1.0;
      char.flags.effort_mult = clamp(cur - 0.08, 0.85, 1.0);
    },

    cards: [

      // ── EQUITY ARC (focus mode — chains in one sitting, free of action cost) ──
      // Jordan opens with equal thirds → Alex refuses without naming a number
      // (roles/alex.js: jordan_equity_alex). The player probes ("what are you
      // thinking?" → jordan_equity_alex_why) or commits a split. Whoever the split
      // shortchanges counters (Alex on 33/50, Jordan on 40/40/20); Jordan also pings
      // in parallel via jordan_equity_worry (post-probe) and jordan_equity_5050_interject.
      // Exactly one counter-round fires (equity_counter_done gates founder's
      // equity_signing). No split satisfies both — only vesting (skipped here) is the
      // clean lesson left standing.
      {
        id: 'jordan_equity_mention', cat: 't', from: 'Jordan', focus: 'equity',
        body: "hey — the three of us should probably sort out equity before it gets weird. equal thirds feels right to me. doesn't have to be today, but soon.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.week >= 2 && s.week <= 5 && !char.flags.equity_mention_done,
        options: [
          { label: "Let's sit down right now and settle it", key: 'open',
            reply: "you're right. let's get the three of us on a call and hash it out now — better us than lawyers later.",
            journal: null,
            execute(s, char) {
              char.flags.equity_mention_done = true;
              // Enter the equity focus arc: only these participants surface, free of
              // action cost, each beat re-polled mid-week so the talk flows in one
              // sitting. 'founder' owns the closing equity_signing beat.
              s.focus = { id: 'equity', charIds: ['jordan', 'alex', 'founder'] };
              return "Cleared the calendar. The three of us, sorting it out now.";
            } },
        ],
        dropDelay: 2, dropMsg: null,
        dropFx(s, char) { char.flags.equity_mention_done = true; },
      },

      // Week 2: equity proposal is now on Alex's character (he texts you separately)

      // Parallel rumor beat: once the player has probed Alex (but not yet committed a
      // split), Jordan hears the two of them talking numbers without her and pushes back
      // from her own thread. Non-mutating — it only banks/erodes trust. Reassuring her
      // here and then choosing 40/40/20 reads as a broken promise (see counter below).
      {
        id: 'jordan_equity_worry', cat: 't', from: 'Jordan', focus: 'equity',
        body: "i can hear you and alex going back and forth without me. i opened this with equal thirds and now i'm getting it secondhand. tell me straight — am i an equal partner here, or am i the part-timer you two are quietly pricing down?",
        urgency: 22, weeks: 1,
        available: (s, char) => char.flags.equity_probed && !char.flags.equity_proposal && !char.flags.worry_done,
        options: [
          { label: "You're an equal partner", key: 'reassure',
            reply: "you're an equal partner. i'm not cutting you out — we'll land this fair.",
            journal: null,
            execute(s, char) {
              char.flags.worry_done = true;
              char.flags.reassured = true;
              char.trust = clamp(char.trust + 6, 0, 100);
              return "Jordan eased up. 'Okay. I trust you.' Now you've said it out loud.";
            } },
          { label: "We're still working it out", key: 'noncommittal',
            reply: "we're still working it out. nothing's decided yet. i'll loop you in.",
            journal: null,
            execute(s, char) {
              char.flags.worry_done = true;
              char.trust = clamp(char.trust - 4, 0, 100);
              return "Jordan went quiet. 'Right. Let me know when you've decided what I'm worth.'";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.worry_done = true; char.trust = clamp(char.trust - 4, 0, 100); },
      },

      // Week 3a: Alex counters (now on Alex's character — he texts you)

      // Week 3b: Jordan counters (only if proposal is 40/40/20)
      {
        id: 'jordan_equity_counter_jordan', cat: 't', from: 'Jordan', focus: 'equity',
        body: "alex just told me the split. 40, 40, and 20 for me. we write the same code — i'm building the entire iOS app on my own. so why is my work worth half of his? that's not a cap table. that's a message. tell me i'm wrong.",
        urgency: 22, weeks: 1,
        available: (s, char) => char.flags.equity_proposal === '40/40/20' && !char.flags.equity_counter_done && s.week <= 10,
        options: [
          { label: 'Equal thirds — fair point', key: 'cave_33',
            reply: "you're right. two people building the product shouldn't be split that unevenly. equal thirds.",
            journal: null,
            execute(s, char, e) {
              char.flags.equity_counter_done = true;
              char.flags.equity_proposal = '33/33/33';
              char.morale = clamp(char.morale + 8, 0, 100);
              char.trust = clamp(char.trust + (char.flags.reassured ? 10 : 6), 0, 100);
              // Alex now grudging at thirds — he loses this one without his own counter.
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale - 5, 0, 100);
              return "Jordan seemed relieved. Alex heard about it and went quiet — equal wasn't what he asked for.";
            } },
          { label: "You're not full-time — this reflects that", key: 'hold_40',
            reply: "i hear you. but you're still at your job — the split reflects that. 40/40/20 stands until you're all-in.",
            journal: null,
            execute(s, char) {
              char.flags.equity_counter_done = true;
              char.morale = clamp(char.morale - 10, 0, 100);
              // Telling her she was an equal and then holding 20% is a broken promise.
              char.trust = clamp(char.trust - (char.flags.reassured ? 18 : 10), 0, 100);
              return "Jordan went quiet. 'Fine. I'll show you what 20% worth of work looks like.'";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.equity_counter_done = true; char.trust = clamp(char.trust - 8, 0, 100); },
      },

      // Parallel line on the 50/25/25 two-front: while Alex confronts you in his thread,
      // Jordan pipes up in hers. Non-mutating — the number is resolved on Alex's card;
      // this just raises the trust cost of grabbing half.
      {
        id: 'jordan_equity_5050_interject', cat: 't', from: 'Jordan', focus: 'equity',
        body: "fifty for yourself? i came to you asking for equal thirds and you're keeping double what alex and i get. i'll be blunt — founders who grab half before there's anything to grab don't keep their co-founders for long. don't sign that.",
        urgency: 21, weeks: 1,
        available: (s, char) => char.flags.equity_proposal === '50/25/25' && !char.flags.equity_counter_done && !char.flags.jordan_50_said,
        options: [
          { label: "Hear you — still settling it", key: 'ack',
            reply: "i hear you. nothing's signed. we're still settling it.",
            journal: null,
            execute(s, char) {
              char.flags.jordan_50_said = true;
              char.trust = clamp(char.trust - 5, 0, 100);
              return "Jordan's blunt about it. 'Fix it before you sign.' Her goodwill is on the clock.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.jordan_50_said = true; char.trust = clamp(char.trust - 5, 0, 100); },
      },

      // Week 3c: the 50/25/25 path is a two-front fight — Alex confronts you first
      // (roles/alex.js: jordan_equity_counter_alex_50). If you bump him to 40/40/20,
      // Jordan then comes at you in her own thread via jordan_equity_counter_jordan
      // above. No merged "heard from both" card — each co-founder hits you 1:1.

      // Week 4: Signing
      {
        id: 'jordan_equity_split', cat: 'e', from: 'Jordan & Alex',
        body: (s, char) => {
          const split = char.flags.equity_proposal || '40/40/20';
          if (split === '33/33/33') return "three-way call. equal thirds. jordan got what she wanted. alex went quiet when the documents came out. nobody brought up vesting — it felt unnecessary between friends.";
          if (split === '50/25/25') return "three-way call. 50/25/25 on the table. jordan accepted — at least she's equal to alex. alex signed without comment. nobody mentioned vesting schedules.";
          return "three-way call. 40/40/20 agreed. alex seemed satisfied. jordan signed — said she'd prove she's worth more than 20%. nobody set up vesting schedules.";
        },
        urgency: 13, weeks: 1,
        available: (s, char) => char.flags.equity_counter_done && !s.jordan_equity && s.week <= 12,
        options: [
          { label: 'Sign the agreement', key: 'sign',
            execute(s, char, e) {
              s.jordan_equity = true;
              s.jordan_cleanup_needed = true;
              const split = char.flags.equity_proposal || '40/40/20';
              const alex = e.chars.get('alex');
              if (alex) {
                alex.flags.equity_set = true;
                if (split === '33/33/33') alex.morale = clamp(alex.morale - 8, 0, 100);
                else if (split === '50/25/25') alex.morale = clamp(alex.morale - 3, 0, 100);
                else alex.morale = clamp(alex.morale + 5, 0, 100);
              }
              return "split locked in. documents signed. nobody set up vesting schedules — it felt unnecessary between friends.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          s.jordan_equity = true;
          s.jordan_cleanup_needed = true;
          const alex = e && e.chars && e.chars.get('alex');
          if (alex) alex.flags.equity_set = true;
        },
      },

      // ── CONTRIBUTION PHASE ───────────────────────────────────────────────────
      {
        id: 'jordan_ios_sprint', cat: 'p', from: 'Jordan',
        body: (s, char) => (char.flags.ios_sprint_count || 0) === 0
          ? "iOS milestone — the shell works: profile screens, photo upload, the first-screen flow. now i need a call on next sprint. i can polish what people will *see* at the demo, or i can start wiring the backend — login, the matching API, messaging. tempo or truth?"
          : "iOS is wired to the backend now — login, matching, and messaging all flowing through the API. same experience as web. ready to open it up.",
        urgency: 22, weeks: 1,
        available: (s, char) => {
          const count = char.flags.ios_sprint_count || 0;
          // Sprint 1 waits for the first-screen direction call (the shell she
          // describes *is* that flow) — answered, ignored past patience, or mooted.
          if (count === 0 && !(char.flags.first_screen_done || s.has_demo)) return false;
          return s.jordan_active && !s.jordan_drifting && count < 2
            && (char.buildEffort || 0) >= (count === 0 ? 2 : 5);
        },
        options: [
          // Sprint 1 is a real trade-off: a smoother demo vs a faster launch path.
          { label: 'Polish the demo surface', key: 'demo_polish',
            available: (s, char) => (char.flags.ios_sprint_count || 0) === 0,
            reply: "polish what they'll see. the demo has to feel good in someone's hand — we get one first impression.",
            execute(s, char) {
              char.flags.ios_sprint_count = 1;
              grantEffort(char, 1.0);
              s.signal = clamp(s.signal + 4, 0, 100);
              s.market_fit = clamp(s.market_fit + 2, 0, 100);
              if (s.items) {
                if (s.items.ios_ui) { s.items.ios_ui.status = 'done'; s.items.ios_ui.quality = 'solid'; s.items.ios_ui.note = "Polished for the demo"; }
                if (s.items.ios_server) s.items.ios_server.status = 'active';
              }
              return "Jordan spent the sprint on feel — transitions, haptics, the photo grid. The demo build is genuinely nice to hold. The backend wiring waits a week.";
            } },
          { label: 'Wire the backend first', key: 'wire_backend',
            available: (s, char) => (char.flags.ios_sprint_count || 0) === 0,
            reply: "wire the backend first. a pretty shell with fake data is a lie we'd be telling ourselves.",
            execute(s, char) {
              char.flags.ios_sprint_count = 1;
              grantEffort(char, 1.4);
              if (s.items) {
                if (s.items.ios_ui) { s.items.ios_ui.status = 'done'; s.items.ios_ui.quality = 'solid'; }
                if (s.items.ios_server) { s.items.ios_server.status = 'active'; s.items.ios_server.note = "Wiring first, polish later"; }
              }
              return "Jordan went straight at the integration — login, matching API, messaging. Less shine at the demo, but the app is real all the way down.";
            } },
          // Sprint 2: the wrap-up beat.
          { label: 'Good — keep the momentum', key: 'ack',
            available: (s, char) => (char.flags.ios_sprint_count || 0) >= 1,
            execute(s, char) {
              char.flags.ios_sprint_count = 2;
              grantEffort(char, 1.0);
              s.signal = clamp(s.signal + 3, 0, 100);
              s.ios_unblocked = true;
              if (s.items) {
                if (s.items.ios_server) { s.items.ios_server.status = 'done'; s.items.ios_server.quality = 'solid'; }
              }
              return "iOS feature-complete — login, matching, and messaging all wired through the API. Same experience as web. Ready to open it up.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) {
          const count = (char.flags.ios_sprint_count || 0) + 1;
          char.flags.ios_sprint_count = count;
          // Ignored: she picks for herself and the milestone still lands — but you
          // didn't answer, and the engine's ignore log remembers that.
          if (count >= 2) {
            s.ios_unblocked = true;
            if (s.items && s.items.ios_server) { s.items.ios_server.status = 'done'; s.items.ios_server.quality = 'solid'; }
          } else if (s.items) {
            if (s.items.ios_ui) { s.items.ios_ui.status = 'done'; s.items.ios_ui.quality = 'rough'; }
            if (s.items.ios_server) s.items.ios_server.status = 'active';
          }
        },
      },

      // ── EARLY CONVERSATIONS ──────────────────────────────────────────────────
      {
        id: 'early_working_style', cat: 't', from: 'Jordan', ignoreForTrust: true,
        body: "i'm still at my day job so my hours are weird. do we want a quick daily check-in so you know when i'm available? or just async and ping me when you need something?",
        urgency: 1, weeks: 1,
        available: (s, char) => s.week <= 4 && !char.flags.working_style_done,
        options: [
          { label: 'Daily 15-min standup', key: 'standup',
            journal: "Set a daily 15-minute standup at 9am with Jordan. Keeps us both honest while she's still juggling her day job.",
            execute(s, char) { char.flags.working_style_done = true; char.morale = clamp(char.morale + 5, 0, 100); return "Daily standup at 9am. Keeps both of you honest."; } },
          { label: 'Async — ping when blocked', key: 'async',
            journal: "Decided to work async with Jordan — ping when blocked. Fewer interruptions, more deep work.",
            execute(s, char) { char.flags.working_style_done = true; return "Async by default. Fewer interruptions, more deep work."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx(s, char) { char.flags.working_style_done = true; },
      },
      {
        id: 'early_pricing', cat: 't', from: 'Jordan', ignoreForTrust: true,
        body: "thinking about the iOS onboarding flow — do we charge from day one, or free until we have real critical mass? nobody pays for a dating app with 20 users in it, but charging early filters out the tire-kickers.",
        urgency: 1, weeks: 1,
        available: (s, char) => s.week >= 4 && s.week <= 8 && !char.flags.pricing_done,
        options: [
          { label: 'Charge from day one — find the true believers', key: 'charge',
            journal: "Decided to charge from day one. Ten serious subscribers beat a hundred who open it once. If they pay before there are many matches, they really want this.",
            execute(s, char) { char.flags.pricing_done = true; s.signal = clamp(s.signal + 4, 0, 100); return "Charging early. You'll get 10 serious subscribers instead of 100 who open it once. If they pay before there are many matches, they really want this."; } },
          { label: 'Free until we have real critical mass', key: 'free',
            journal: "Decided to stay free until we have critical mass. More people in the door — the cold-start problem is real, and nobody finds a match worth paying for in an empty app.",
            execute(s, char) { char.flags.pricing_done = true; s.waitlist += 2; return "Free to start. More people in the door. The cold start problem is real — you need enough singles before anyone finds a match worth paying for."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx(s, char) { char.flags.pricing_done = true; },
      },

      // ── DIRECTION: THE FIRST SCREEN (what a stranger sees in 10 seconds) ──────
      // The dev arc's first direction ask from Jordan. The C-option is research-gated
      // on the founder's interviews — GOALS.md's "research → better build options".
      {
        id: 'jordan_dir_first_screen', cat: 'p', from: 'Jordan',
        body: "first real iOS question. someone installs kindred, opens it — ten seconds later, what are they looking at? i can do a classic swipe deck: zero learning curve, demos great, i could have it in TestFlight friday. or a guided intake — five questions before we show a single face. slower, weirder, but it's a statement.",
        urgency: 12, weeks: 1,
        available: (s, char) => s.dev_plan != null && s.dev_start_week != null
          && s.week >= s.dev_start_week + 1 && !char.flags.first_screen_done
          && s.jordan_active && !s.jordan_drifting && !s.has_demo,
        options: [
          { label: 'Swipe deck — zero learning curve', key: 'deck',
            reply: "deck. zero learning curve. don't make people think on day one.",
            execute(s, char, e) {
              char.flags.first_screen_done = true;
              grantEffort(char, 1.0);
              s.waitlist += 1;
              if (s.items && s.items.ios_ui) s.items.ios_ui.note = "Swipe deck first";
              if (e && e.pending) e.pending.push({
                fireWeek: s.week + 2, from: 'Jordan', charId: 'jordan',
                text: "deck build's in TestFlight. showed my sister and her roommate — same reaction from both: 'nice — so it's like hinge?' not wrong. not great either.",
              });
              return "Deck it is — in TestFlight by Friday, and everyone who opens it knows exactly what to do. Whether they know why it's different is another matter.";
            } },
          { label: 'Guided intake — five questions first', key: 'intake',
            reply: "intake. five questions before any faces. we're not another swipe app.",
            execute(s, char) {
              char.flags.first_screen_done = true;
              grantEffort(char, 1.0);
              s.market_fit = clamp(s.market_fit + 3, 0, 100);
              if (s.items && s.items.ios_ui) s.items.ios_ui.note = "Intake-first onboarding";
              return "Intake-first. Riskier open — five questions before a single face — but nobody will mistake kindred for another swipe app.";
            } },
          { label: 'Intake — built from the interview questions', key: 'intake_interviews',
            available: (s, char, e) => {
              const f = e.chars.get('founder');
              return !!(f && f.flags.interviews_done);
            },
            reply: "intake — and use the interview questions verbatim. open with 'how many matches went nowhere for you last month?' make them feel seen in ten seconds.",
            journal: "Gave Jordan the first screen straight from the interviews: open with the question every user we talked to already answered — 'how many matches went nowhere last month?' She built it word for word.",
            execute(s, char, e) {
              char.flags.first_screen_done = true;
              grantEffort(char, 1.2);
              s.market_fit = clamp(s.market_fit + 7, 0, 100);
              s.signal = clamp(s.signal + 3, 0, 100);
              if (s.items && s.items.ios_ui) s.items.ios_ui.note = "Intake-first (from interviews)";
              if (e && e.pending) e.pending.push({
                fireWeek: s.week + 1, from: 'Jordan', charId: 'jordan',
                text: "intake flow is live in TestFlight. my sister answered question 3 and screenshotted it to her group chat. first organic share we've ever had.",
              });
              return "The interview questions became the first screen, word for word. Ten seconds in, a new user feels like the app already knows why they're here.";
            } },
        ],
        // Ignored: she ships the deck by default — and the testers ask the question
        // you never answered. Rework eats most of a sprint (GOALS lesson 2).
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          char.flags.first_screen_done = true;
          char.morale = clamp(char.morale - 6, 0, 100);
          char.trust = clamp(char.trust - 4, 0, 100);
          char.buildEffort = Math.max(0, (char.buildEffort || 0) - 1.0);
          if (s.items && s.items.ios_ui) { s.items.ios_ui.quality = 'rough'; s.items.ios_ui.note = "Swipe deck (Jordan's default)"; }
          if (e && e.pending) e.pending.push({
            fireWeek: s.week + 2, from: 'Jordan', charId: 'jordan',
            text: "you never picked a first screen so i shipped the swipe deck. showed it to three friends this week and all three asked the same question: 'so how is this different from hinge?' i didn't have an answer. rebuilding the intake — there goes most of the sprint.",
          });
        },
      },

      // ── BUILD vs BUY: MATCHING (the core → BUILD is right) ───────────────────
      // Jordan pushes to license the *core* matching engine from a vendor — an early
      // red flag that she's the wrong co-founder (she'd outsource the one thing that
      // makes Kindred Kindred). Right call: overrule her and build it. Licensing is a
      // black box that can't be re-tuned for the pivot — it bites later (see
      // applyActivitiesPivot in roles/alex.js). Lives here so Jordan owns the proposal;
      // reads/writes Alex via e.chars.get('alex').
      {
        id: 'matching_engine_choice', cat: 'p', from: 'Jordan',
        body: "sprint 2 direction, my two cents. found something — MatchKit. they license a ready-made recommendation engine; we'd have matching working in days instead of weeks. alex will hate this because he hand-rolls everything, that's what CTOs do. but why reinvent the wheel? i say we plug it in.",
        urgency: 12, weeks: 1,
        // Rides the dev clock (dev_start_week implies equity is signed, so this can no
        // longer preempt the equity arc the old week>=6 floor protected).
        available: (s, char) => s.dev_plan != null && !char.flags.matching_choice_done && !s.has_demo
          && s.dev_start_week != null && s.week >= s.dev_start_week + 1 && s.week <= s.dev_start_week + 6,
        options: [
          { label: "No — matching is the whole product, we build it", key: 'build',
            reply: "no. the matching engine *is* kindred — it's the one thing we can't outsource. we build it ourselves.",
            journal: "Overruled Jordan — we build the matching engine ourselves. Slower, but it's the one thing that makes us us, and Alex was relieved we're not renting our own product.",
            execute(s, char, e) {
              char.flags.matching_choice_done = true;
              s.matching_owned = true;
              char.morale = clamp(char.morale - 3, 0, 100);
              const alex = e.chars.get('alex');
              if (alex) {
                alex.morale = clamp(alex.morale + 5, 0, 100);
                grantEffort(alex, 1.0);  // he dives straight into the core
              }
              if (s.items && s.items.matching_algo) s.items.matching_algo.note = "Building our own — the IP";
              return "Overruled Jordan — we build the matching engine ourselves. Slower, but it's the IP, the one thing we can't outsource. Alex was visibly relieved.";
            } },
          { label: "Good find — license it and ship faster", key: 'license',
            reply: "nice find. plug in MatchKit — if we can ship matching in days, let's not waste weeks on it.",
            journal: "Took Jordan's lead and licensed MatchKit for matching. Working in days — but it's a black box everyone else can rent too, and Alex went quiet. Outsourcing the core might be a decision I regret.",
            execute(s, char, e) {
              char.flags.matching_choice_done = true;
              s.matching_licensed = true;
              s.extra_burn += 100;
              s.saas.push({ label: "MatchKit license", cost: 100 });
              char.morale = clamp(char.morale + 5, 0, 100);
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale - 8, 0, 100);
              if (s.items && s.items.matching_algo) { s.items.matching_algo.status = 'done'; s.items.matching_algo.quality = 'generic'; s.items.matching_algo.assignee = null; s.items.matching_algo.note = "Licensed: MatchKit · $100/wk"; }
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "saw the MatchKit contract go through. it's our whole product and we just rented it. hope the demo's worth it.",
                week: s.week, isNew: true, seq: e._seq++,
              });
              return "Licensed MatchKit. Matching working in days — but it's a black box everyone else can rent too. $100/wk, and Alex went quiet.";
            } },
        ],
        // If ignored, Alex steps in and builds the core himself; Jordan's idea quietly dropped.
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          char.flags.matching_choice_done = true;
          s.matching_owned = true;
          const alex = e && e.chars && e.chars.get('alex');
          if (alex) alex.morale = clamp(alex.morale + 3, 0, 100);
          if (s.items && s.items.matching_algo) s.items.matching_algo.note = "Building our own — the IP";
        },
      },

      // ── DIRECTION: TRUST & SAFETY (App Store review forces the safety call) ──
      // Pre-launch there are no strangers in the app, so the forcing function is
      // Apple's UGC-moderation requirements, not an incident. The C-option is gated
      // on community engagement: the threads already told you fake profiles are the
      // #1 complaint — engaged founders get to make safety the brand.
      {
        id: 'jordan_dir_trust_safety', cat: 'p', from: 'Jordan',
        body: "not a fun one. i started the app store review paperwork for the launch build and apple wants our safety story — user-generated content moderation, reporting, blocking. what we have is: nothing. i saved the form as a draft and stared at it for a while. so: a report button now and verification later, or do verification properly before we launch?",
        urgency: 12, weeks: 1,
        available: (s, char) => s.has_demo && !s.launched && !char.flags.trust_safety_done
          && s.jordan_active && !s.jordan_drifting,
        options: [
          { label: 'Report button this sprint, verify later', key: 'report_now',
            reply: "report button this sprint. it answers apple honestly — verification can come after launch, we can't gate the release behind a feature we haven't built.",
            execute(s, char) {
              char.flags.trust_safety_done = true;
              grantEffort(char, 1.0);
              s.market_fit = clamp(s.market_fit + 2, 0, 100);
              if (s.items && s.items.ios_ui) s.items.ios_ui.note = (s.items.ios_ui.note ? s.items.ios_ui.note + " · " : "") + "Report button pre-launch";
              return "Report + block shipped in three days. Not deep, but real — the app review form has an honest answer now, and so does the first person who'll ever need that button.";
            } },
          { label: 'Full verification before launch', key: 'verify_first',
            reply: "verification before launch. the day strangers show up is the day it has to already work — one bad first week and the women never come back.",
            execute(s, char) {
              char.flags.trust_safety_done = true;
              grantEffort(char, 0.6);  // real scope — it costs build time
              s.market_fit = clamp(s.market_fit + 4, 0, 100);
              return "Photo verification goes in before launch. It costs a chunk of Jordan's sprint — the launch-ready date slips — but the safety story is real before a single stranger is in the app.";
            } },
          { label: 'Verification as THE feature — the threads called it', key: 'verify_flagship',
            available: (s) => (s.community_engaged_count || 0) >= 2,
            reply: "look at every dating thread we've been in — fake profiles are the top complaint, every single time. photo verification at signup, checkmark on the card, and we *lead* with it. it's not a safety feature, it's the brand.",
            journal: "Made the call from the community threads: verification isn't a safety checkbox, it's the brand. Photo-verified at signup, checkmark on every card. Every thread we engaged had fake profiles as complaint #1 — now it's our headline.",
            execute(s, char) {
              char.flags.trust_safety_done = true;
              grantEffort(char, 1.2);
              s.market_fit = clamp(s.market_fit + 6, 0, 100);
              s.waitlist += 3;
              if (s.items && s.items.ios_ui) s.items.ios_ui.note = (s.items.ios_ui.note ? s.items.ios_ui.note + " · " : "") + "Verified-only (from community)";
              return "Verification became the headline: photo-verified at signup, checkmark on every card, 'no fakes' on the landing page. Three waitlist signups came in the day the copy changed.";
            } },
        ],
        // Ignored: the app review deadline forces a bare minimum, shipped alone.
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          char.flags.trust_safety_done = true;
          char.morale = clamp(char.morale - 6, 0, 100);
          char.trust = clamp(char.trust - 4, 0, 100);
          s.market_fit = clamp(s.market_fit - 3, 0, 100);
          if (e && e.pending) e.pending.push({
            fireWeek: s.week + 2, from: 'Jordan', charId: 'jordan',
            text: "app review wouldn't wait, so i shipped a bare report button on my own and submitted. it deserved an actual decision — this is the feature that decides whether women stay past week one.",
          });
        },
      },

      // ── PIVOT FORESHADOWING: Jordan flags the circle pattern before launch ────
      // No longer opens a decision chain — the pivot question is settled after
      // launch, on pivot day (the summit focus arc). Answering this banks Jordan's
      // receipt (s.pivot_flagged); ignoring it just means walking into pivot day
      // without it. No re-nag: the launch checklist swallows the conversation.
      {
        id: 'pivot_open', cat: 'p', from: 'Jordan',
        body: (s) => s.demo_question_seen
          ? "been going through the testflight group's feedback. remember demo night — 'so what happens now?' it wasn't a one-off. three more people in the group used almost the same phrase: 'i matched, but then what?' they're not complaining about the matching — they want somewhere to go. thought i'd flag it before we get closer to launch."
          : "been going through the testflight group's feedback. three of them independently used almost the same phrase: 'i matched, but then what?' they're not complaining about the matching — they want somewhere to go. could be noise. thought i'd flag it before we get closer to launch.",
        // Spine band: post-demo this *is* the central storyline — it can't sit
        // behind the sprint chatter the way it could when weeks were quiet.
        urgency: 12,
        weeks: 1,
        available: (s, char) => s.activities_cut && s.has_demo && s.market_fit >= 5
          && s.jordan_active && !s.jordan_resolved && !s.launched
          && !char.flags.pivot_open_done,
        options: [
          { label: "Good flag — write it down verbatim", key: "open",
            reply: "write it down, word for word. 'i matched, but then what.' if it's still true with strangers, we'll know exactly where to look.",
            journal: "Jordan flagged a pattern from the TestFlight group: people keep saying 'I matched, but then what?' Wrote it down verbatim. Launch will tell us if it's noise or the whole story.",
            execute(s, char) {
              char.flags.pivot_open_done = true;
              s.pivot_flagged = true;
              return "Written down, word for word. If strangers say it too, you'll know where to look.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) {
          // Launch prep buries the flag. No penalty now — the receipt is just
          // missing later, when the same sentence comes back from strangers.
          char.flags.pivot_open_done = true;
        },
      },

      // Post-launch slide texture: the person who flagged it, watching it come
      // true. Deliberately quiet (urgency 3) and conditional — Jordan may be
      // drifting or gone by now, and the summit never depends on her.
      {
        id: 'slide_jordan_echo', cat: 'c', from: 'Jordan',
        body: "not my lane anymore maybe. but i've been lurking the support inbox. 'i matched, but then what' — that's the test group's feedback again, word for word, from strangers this time. same shape. anyway.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.launched && s.activities_cut && !s.activities_pivot
          && !s.pivot_summit_done && s.jordan_active && !s.jordan_resolved
          && s.week >= (s.launch_week || 0) + 2 && !char.flags.slide_echo_done,
        options: [
          { label: "You called it first", key: "ack",
            reply: "you called it first — that's on the record. it's on the agenda, for real this time.",
            execute(s, char) {
              char.flags.slide_echo_done = true;
              s.pivot_flagged = true;
              char.morale = clamp(char.morale + 4, 0, 100);
              return "Jordan called it before launch and she's calling it again now. On the record.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.slide_echo_done = true; },
      },

      // ── LAUNCH FOCUS ARC (Jordan's beats) ───────────────────────────────────
      // Jordan watches the user side during launch day. Sending her to hustle on
      // social media (the tempting response to a quiet launch) means nobody is
      // watching the platform — the abuser runs unchecked until 9pm.
      {
        id: 'launch_first_bounce', cat: 'e', from: 'Jordan', focus: 'launch',
        body: "first click from the blast just came in. someone opened it on their phone, hit the homepage, maybe 10 seconds — didn't scroll past the hero. no signup.",
        urgency: 19, patience: Infinity,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          return s.focus && s.focus.id === 'launch' && alex && alex.flags.email_pulse_done && !char.flags.first_bounce_done;
        },
        options: [
          { key: 'normal', label: "Normal — first visitors are just curious",
            reply: "normal. probably opened it on their commute. real signups need a minute to think.",
            journal: null,
            execute(s, char) { char.flags.first_bounce_done = true; return null; } },
          { key: 'broken', label: "Was something wrong on mobile?",
            reply: "check if the page is broken on mobile.",
            journal: null,
            execute(s, char, e) {
              char.flags.first_bounce_done = true;
              e.threads.jordan.push({
                type: 'incoming', from: 'Jordan',
                body: "tested on my phone — page loads clean, 1.4s, no errors. they just weren't ready to commit on a first glance.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              return null;
            } },
          { key: 'who', label: "Can we figure out who it was?",
            reply: "any way to tell who it was? might be worth reaching out.",
            journal: null,
            execute(s, char, e) {
              char.flags.first_bounce_done = true;
              const msg = s.analytics_live
                ? "it's a uuid — no name until they sign up. they hit the /how-it-works page before leaving."
                : "just a hit in the access logs. no identity until they sign up.";
              e.threads.jordan.push({
                type: 'incoming', from: 'Jordan',
                body: msg,
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              return null;
            } },
        ],
      },

      {
        id: 'launch_first_signup_live', cat: 'e', from: 'Jordan', focus: 'launch',
        body: "first real profile just went live — maya, 28, SF. she's still filling it out but she's in the app. pipeline runs every few minutes so matches haven't shown up yet.",
        urgency: 18.5, patience: Infinity,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          return s.focus && s.focus.id === 'launch' && alex && alex.flags.staging_done && char.flags.first_bounce_done && !char.flags.first_signup_live_done;
        },
        options: [
          { key: 'watch', label: "Watch her — first real user in the app",
            reply: "watch her. i want to see what a real user actually does.",
            journal: null,
            execute(s, char, e) {
              char.flags.first_signup_live_done = true;
              e.threads.jordan.push({
                type: 'incoming', from: 'Jordan',
                body: "she completed her profile — 3 photos, full bio. she's now checking for matches.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              return null;
            } },
          { key: 'welcome', label: "Send her a welcome message",
            reply: "send her a personal welcome. first user deserves it.",
            journal: null,
            execute(s, char, e) {
              char.flags.first_signup_live_done = true;
              e.threads.jordan.push({
                type: 'incoming', from: 'Jordan',
                body: "sent. she replied 'omg i didn't expect to hear from you!' — she's filling out her profile now.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              return null;
            } },
          { key: 'leave', label: "Leave her — let her explore on her own",
            reply: "don't hover. let her figure it out herself.",
            journal: null,
            execute(s, char) {
              char.flags.first_signup_live_done = true;
              return null;
            } },
        ],
      },

      {
        id: 'launch_hustle_temptation', cat: 'e', from: 'Jordan', focus: 'launch',
        body: "it's noon and we only have 14 signups. should i post a thread on LinkedIn? might drive some traffic while the email's still fresh.",
        urgency: 18, patience: Infinity,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          return s.focus && s.focus.id === 'launch' && alex && alex.flags.staging_done && alex.flags.inbox_question_done && !char.flags.hustle_done;
        },
        options: [
          { key: 'go', label: 'Go for it — hustle for more signups',
            reply: "yes, go post. let's hustle for signups.",
            journal: null,
            execute(s, char, e) {
              char.flags.hustle_done = true;
              s.jordan_left_watch = true;
              s.launch_time = '1PM';
              e.threads.jordan.push({
                type: 'incoming', from: 'Jordan',
                body: "on it. writing a great post and pinging all my contacts. back in a couple hours.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              return null;
            } },
          { key: 'stay', label: 'Stay in the app — watch real users',
            reply: "stay in the app. watch how real users behave — that's worth more than 20 extra signups right now.",
            journal: null,
            execute(s, char) {
              char.flags.hustle_done = true;
              s.launch_time = '1PM';
              return null;
            } },
        ],
      },

      // Only surfaces if Jordan stayed to watch (not sent to hustle).
      // Surfaces simultaneously with Alex's launch_test_profiles — triage window.
      {
        id: 'launch_abuser_early', cat: 'e', from: 'Jordan', focus: 'launch',
        body: "seeing something weird. one user has sent the exact same opener to at least 10 women in the last hour. just got a DM from one asking if this is allowed. what do you want me to do?",
        urgency: 17, patience: Infinity,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          return s.focus && s.focus.id === 'launch' && alex && alex.flags.staging_done && char.flags.hustle_done && !s.jordan_left_watch && !char.flags.abuser_done;
        },
        options: [
          { key: 'ban', label: 'Ban him now',
            reply: "ban him. we don't need a ToS to know mass-messaging isn't okay.",
            journal: null,
            execute(s, char, e) {
              char.flags.abuser_done = true;
              s.launch_time = '4PM';
              e.threads.jordan.push({
                type: 'incoming', from: 'Jordan',
                body: "done. he's off the platform. the woman who complained sent a thank you.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              return null;
            } },
          { key: 'warn', label: 'Send him a warning first',
            reply: "send him a warning — one chance to stop.",
            journal: null,
            execute(s, char) {
              char.flags.abuser_done = true;
              s.moderation_warned = true;
              s.launch_time = '4PM';
              return null;
            } },
          { key: 'investigate', label: 'Investigate more before deciding',
            reply: "look into it more — how many women, what did he actually say?",
            journal: null,
            execute(s, char, e) {
              char.flags.abuser_done = true;
              s.moderation_warned = true;
              s.launch_time = '4PM';
              e.threads.jordan.push({
                type: 'incoming', from: 'Jordan',
                body: "checked — he sent the same message to 15 women. nothing explicitly offensive, just copy-pasted. sent him a warning for now.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              return null;
            } },
        ],
      },

      {
        id: 'launch_going_home', cat: 'e', from: 'Jordan', focus: 'launch',
        body: "it's 6pm. heading home — long day. 19 signups total. not bad for day one?",
        urgency: 14, patience: Infinity,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          const abuser_resolved = s.jordan_left_watch || char.flags.abuser_done;
          return s.focus && s.focus.id === 'launch' && alex && alex.flags.stripe_done && abuser_resolved && !char.flags.going_home_done;
        },
        options: [
          { key: 'ack', label: 'Good work today. Rest up.',
            reply: "good work today. rest up.",
            journal: null,
            execute(s, char, e) {
              char.flags.going_home_done = true;
              s.launch_time = (s.moderation_warned || s.jordan_left_watch) ? '9PM' : '11PM';
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "same. grabbing dinner. 19 signups honestly isn't bad. more tomorrow.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              return null;
            } },
        ],
      },

      // Fires if abuser was warned (not banned) OR Jordan was on LinkedIn all day.
      // Warned path: he came back. LinkedIn path: Jordan had no idea until victims DM'd her.
      // Both people are home; the constraint is emotional, not logistical.
      {
        id: 'launch_9pm_crisis', cat: 'e', from: 'Jordan', focus: 'launch',
        body: (s) => s.jordan_left_watch && !s.moderation_warned
          ? "hey — just got DMs from 3 women who signed up today. one guy's been sending the same opener to everyone while i was posting on linkedin. one of them is about to go public. i had no idea this was happening."
          : "hey — i know we said we were done. the guy i warned is back. messaged 5 more women tonight. one of them is threatening to post publicly about it. alex says he doesn't have his laptop.",
        urgency: 13, patience: Infinity,
        available: (s, char) => s.focus && s.focus.id === 'launch' && char.flags.going_home_done
          && (!!s.moderation_warned || !!s.jordan_left_watch) && !char.flags.crisis_done,
        options: [
          { key: 'ban', label: 'Ban him now',
            reply: "ban him now. should have done it this afternoon.",
            journal: null,
            execute(s, char, e) {
              char.flags.crisis_done = true;
              s.launch_time = '11PM';
              e.threads.jordan.push({
                type: 'incoming', from: 'Jordan',
                body: "done. banned. reached out to the victim — she's still upset but said thank you. we need a real ToS.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              return null;
            } },
          { key: 'victim_first', label: 'Reach out to the victim first, then ban',
            reply: "message the victim first — apologize, then ban him.",
            journal: null,
            execute(s, char, e) {
              char.flags.crisis_done = true;
              s.launch_time = '11PM';
              e.threads.jordan.push({
                type: 'incoming', from: 'Jordan',
                body: "messaged her. she softened when we apologized. banned him. she said she'll hold off on posting.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              return null;
            } },
          { key: 'morning', label: 'Handle it in the morning',
            reply: "it can wait until morning.",
            journal: null,
            execute(s, char, e) {
              char.flags.crisis_done = true;
              s.moderation_ignored = true;
              s.launch_time = '11PM';
              e.pending.push({
                fireWeek: s.week + 2, from: 'Jordan', charId: 'jordan',
                text: "that woman posted about the harassment overnight. 'new dating app has zero moderation.' it's getting shared.",
                cancel: (st) => !st.moderation_ignored,
              });
              return null;
            } },
        ],
      },

      {
        id: 'launch_signal', cat: 'e', from: 'Jordan', focus: 'launch',
        body: "hey — i know it's late. just got a DM. two users matched and they're already texting each other. 😭 this is actually real.",
        urgency: 12, patience: Infinity,
        available: (s, char) => {
          const needCrisis = !!s.moderation_warned || !!s.jordan_left_watch;
          return s.focus && s.focus.id === 'launch' && char.flags.going_home_done && (!needCrisis || char.flags.crisis_done) && !char.flags.signal_done;
        },
        options: [
          { key: 'ack', label: "That's what we built it for",
            reply: "that's why we did all of this. get some sleep.",
            journal: "11pm. Jordan texted — two users matched and they're already talking to each other. The whole chaotic day collapsed into one message. It's working.",
            execute(s, char) {
              char.flags.signal_done = true;
              s.launch_time = '11PM';
              s.focus = null;  // launch day is over — world resumes
              return null;
            } },
        ],
      },

      // ── FULL-TIME ASK ────────────────────────────────────────────────────────
      {
        id: 'jordan_fulltime_ask', cat: 't', from: 'Jordan',
        body: "i need to be straight with you about the full-time thing. i can't leave my job right now — i need the salary, i can't just walk away from it yet. i know that's not what you and alex need. i'll carve out more hours, i promise.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.jordan_drifting && !s.jordan_resolved && !char.flags.fulltime_ask_done && s.week >= 10,
        options: [
          { label: 'Accept her answer — she stays part-time', key: 'accept',
            journal: "Accepted Jordan's answer — she stays part-time. Alex heard and he's covering her work.",
            execute(s, char, e) {
              char.flags.fulltime_ask_done = true;
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale - 5, 0, 100);
              return "Jordan's staying part-time. Alex heard the outcome. He's covering her work — and now he knows you know it too.";
            } },
          { label: 'Tell her this is a dealbreaker', key: 'pressure',
            journal: "Told Jordan this is a dealbreaker. She said she'd think about it. She didn't change.",
            execute(s, char, e) {
              char.flags.fulltime_ask_done = true;
              s.jordan_confrontation_triggered = true;
              s.jordan_underperf_witnessed = true;  // she told you herself she's not going full-time
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale + 5, 0, 100);
              return "Jordan went quiet. Said she'd think about it. She didn't change. The situation will need to be resolved.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.fulltime_ask_done = true; },
      },


    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.jordan = def;
})();
