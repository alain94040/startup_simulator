(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'jordan', name: 'Jordan', type: 'cofounder',

    slice: [
      "jordan_equity_mention",
      "jordan_equity_worry",
      "jordan_equity_counter_jordan",
      "jordan_equity_5050_interject",
      "early_working_style",
      "early_pricing",
      "matching_engine_choice",
      "jordan_ios_sprint",
      "pivot_open",
      "jordan_fulltime_ask",
    ],

    role: "Co-founder · iOS",
    skills: { build: 0.7 },
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
          ? "the iOS shell is coming together — profile screens, photo upload, the swipe deck. next sprint i wire it to the backend: login, the matching API, messaging."
          : "iOS is wired to the backend now — login, matching, and messaging all flowing through the API. same experience as web. ready to open it up.",
        urgency: 22, weeks: 1,
        available: (s, char) => {
          const count = char.flags.ios_sprint_count || 0;
          return s.jordan_active && !s.jordan_drifting && count < 2
            && (char.buildEffort || 0) >= (count === 0 ? 2 : 5);
        },
        options: [
          { label: 'Good — keep the momentum', key: 'ack',
            execute(s, char) {
              char.flags.ios_sprint_count = (char.flags.ios_sprint_count || 0) + 1;
              s.signal = clamp(s.signal + 3, 0, 100);
              if (char.flags.ios_sprint_count >= 2) {
                s.ios_unblocked = true;
                if (s.items) {
                  if (s.items.ios_server) { s.items.ios_server.status = 'done'; s.items.ios_server.quality = 'solid'; }
                }
                return "iOS feature-complete — login, matching, and messaging all wired through the API. Same experience as web. Ready to open it up.";
              }
              if (s.items) {
                if (s.items.ios_ui) { s.items.ios_ui.status = 'done'; s.items.ios_ui.quality = 'solid'; }
                if (s.items.ios_server) s.items.ios_server.status = 'active';
              }
              return "First iOS sprint done — profile screens, photo upload, and the swipe deck are working. One more sprint to wire it to auth and the matching API.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.ios_sprint_count = (char.flags.ios_sprint_count || 0) + 1; },
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

      // ── BUILD vs BUY: MATCHING (the core → BUILD is right) ───────────────────
      // Jordan pushes to license the *core* matching engine from a vendor — an early
      // red flag that she's the wrong co-founder (she'd outsource the one thing that
      // makes Kindred Kindred). Right call: overrule her and build it. Licensing is a
      // black box that can't be re-tuned for the pivot — it bites later (see
      // applyActivitiesPivot in roles/alex.js). Lives here so Jordan owns the proposal;
      // reads/writes Alex via e.chars.get('alex').
      {
        id: 'matching_engine_choice', cat: 'p', from: 'Jordan',
        body: "found something — MatchKit. they license a ready-made recommendation engine; we'd have matching working in days instead of building it from scratch. why reinvent the wheel? i say we plug it in.",
        urgency: 12, weeks: 1,
        // week>=6 so this (urgency 12) can't preempt the low-urgency equity opener
        // (jordan_equity_mention, urgency 2, window wk2-5) and derail the equity arc.
        available: (s, char) => s.dev_plan != null && !char.flags.matching_choice_done && !s.has_demo
          && s.week >= 6 && s.week <= 14,
        options: [
          { label: "No — matching is the whole product, we build it", key: 'build',
            reply: "no. the matching engine *is* kindred — it's the one thing we can't outsource. we build it ourselves.",
            journal: "Overruled Jordan — we build the matching engine ourselves. Slower, but it's the one thing that makes us us, and Alex was relieved we're not renting our own product.",
            execute(s, char, e) {
              char.flags.matching_choice_done = true;
              s.matching_owned = true;
              char.morale = clamp(char.morale - 3, 0, 100);
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale + 5, 0, 100);
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
              if (s.items && s.items.matching_algo) { s.items.matching_algo.status = 'done'; s.items.matching_algo.quality = 'generic'; s.items.matching_algo.assignee = null; }
              return "Licensed MatchKit. Matching working in days — but it's a black box everyone else can rent too. Alex went quiet: 'It's our whole product and we just rented it.' $100/wk.";
            } },
        ],
        // If ignored, Alex steps in and builds the core himself; Jordan's idea quietly dropped.
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          char.flags.matching_choice_done = true;
          s.matching_owned = true;
          const alex = e && e.chars && e.chars.get('alex');
          if (alex) alex.morale = clamp(alex.morale + 3, 0, 100);
        },
      },

      // ── PIVOT DISCUSSION (card 1 of 3: Jordan surfaces the user signal) ────────
      {
        id: 'pivot_open', cat: 'p', from: 'Jordan',
        body: (s, char) => (char.flags.pivot_dismissed || 0) >= 2
          ? "this has come up four separate times now. i'm not saying we pivot — i'm saying we need to have the conversation."
          : "been going through demo feedback. three testers independently used almost the same phrase: 'i matched, but then what?' they're not complaining about the matching — they want somewhere to go. could be noise. thought i'd flag it before we get closer to launch.",
        urgency: (s, char) => (char.flags.pivot_dismissed || 0) >= 2 ? 3 : 2,
        weeks: 1,
        available: (s, char) => s.activities_cut && s.has_demo && s.market_fit >= 5
          && s.jordan_active && !s.jordan_resolved && !s.launched
          && !char.flags.pivot_open_done && s.week >= (char.flags.pivot_open_wait || 0),
        options: [
          { label: "Good flag — let's talk through it", key: "open",
            journal: "Jordan flagged something from the early testers: users keep saying 'I matched, but then what?' Put it on the agenda.",
            execute(s, char) {
              char.flags.pivot_open_done = true;
              return "On the agenda. Good that someone flagged it before launch.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) {
          char.flags.pivot_dismissed = (char.flags.pivot_dismissed || 0) + 1;
          char.flags.pivot_open_wait = s.week + 3;
        },
      },

      // ── FULL-TIME ASK ────────────────────────────────────────────────────────
      {
        id: 'jordan_fulltime_ask', cat: 't', from: 'Jordan',
        body: "had a direct conversation with jordan about going full-time. she was apologetic but firm: 'i can't leave my job right now — i need the salary. i'll carve out more hours, i promise.' she hasn't.",
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
