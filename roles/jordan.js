(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'jordan', name: 'Jordan', type: 'cofounder',

    slice: [
      "jordan_equity_mention",
      "jordan_equity_counter_jordan",
      "jordan_equity_counter_both",
      "early_working_style",
      "early_pricing",
      "jordan_ios_sprint",
      "pivot_open",
      "jordan_fulltime_ask",
    ],

    role: "Co-founder · iOS",
    voice: {
      "jordan_equity_mention|open": "Jordan brought up equity before it gets weird. Put it on the agenda — glad someone said it out loud.",
      "jordan_equity_counter_jordan|cave_33": "Jordan was right — two people writing code shouldn't be split so unevenly. Went back to equal thirds. She was relieved; Alex went quiet when he heard.",
      "jordan_equity_counter_jordan|hold_40": "Held 40/40/20 — Jordan's not full-time and the split reflects that. She went quiet. 'Fine. I'll show you what 20% of work looks like.'",
      "jordan_equity_counter_both|cave_alex": "Gave Alex what he wanted — 40/40/20. Jordan has less than she hoped, but she accepted it.",
      "jordan_equity_counter_both|cave_jordan": "Gave Jordan equal thirds. Alex went quiet, and I gave up my majority — but it felt fair.",
      "jordan_equity_counter_both|hold_50": "Held 50/25/25 — I run this company. Both accepted it. Alex was terse, Jordan just said 'okay.' The tension didn't disappear.",
      "early_working_style|standup": "Set a daily 15-minute standup at 9am with Jordan. Keeps us both honest while she's still juggling her day job.",
      "early_working_style|async": "Decided to work async with Jordan — ping when blocked. Fewer interruptions, more deep work.",
      "early_pricing|charge": "Decided to charge from day one. Ten serious subscribers beat a hundred who open it once. If they pay before there are many matches, they really want this.",
      "early_pricing|free": "Decided to stay free until we have critical mass. More people in the door — the cold-start problem is real, and nobody finds a match worth paying for in an empty app.",
      "jordan_ios_sprint|ack": "Jordan's iOS sprint is done. Good momentum — keep it rolling.",
      "pivot_open|open": "Jordan flagged something in the beta feedback: users keep saying 'I matched, but then what?' Put it on the agenda.",
      "jordan_fulltime_ask|accept": "Accepted Jordan's answer — she stays part-time. Alex heard and he's covering her work.",
      "jordan_fulltime_ask|pressure": "Told Jordan this is a dealbreaker. She said she'd think about it. She didn't change."
    },
    skills: { build: 0.7 },
    cards: [

      // ── EQUITY ARC: 4 cards, 3 weeks ─────────────────────────────────────────
      // Week 1: Jordan opens topic (atmospheric, single option)
      // Week 2: Founder makes opening offer (3 options)
      // Week 3: Unhappy co-founder(s) counter — exactly one of three cards fires
      // Week 4: Signing
      {
        id: 'jordan_equity_mention', cat: 't', from: 'Jordan',
        body: "hey — the three of us should probably sort out equity before it gets weird. equal thirds feels right to me. doesn't have to be today, but soon.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.week >= 2 && s.week <= 5 && !char.flags.equity_mention_done,
        options: [
          { label: "Agreed — let's work through it over the next few weeks", key: 'open',
            execute(s, char) {
              char.flags.equity_mention_done = true;
              return "On the agenda. Good that someone brought it up.";
            } },
        ],
        dropDelay: 2, dropMsg: null,
        dropFx(s, char) { char.flags.equity_mention_done = true; },
      },

      // Week 2: equity proposal is now on Alex's character (he texts you separately)

      // Week 3a: Alex counters (now on Alex's character — he texts you)

      // Week 3b: Jordan counters (only if proposal is 40/40/20)
      {
        id: 'jordan_equity_counter_jordan', priority: 2, cat: 't', from: 'Jordan',
        body: "alex told me about the 40/40/20. we're both writing code — he gets twice what i get? i'm building the whole iOS side. equal thirds is fair. why do i get less?",
        urgency: 2, weeks: 1,
        available: (s, char) => char.flags.equity_proposal === '40/40/20' && !char.flags.equity_counter_done && s.week <= 10,
        options: [
          { label: 'Equal thirds — fair point', key: 'cave_33',
            execute(s, char, e) {
              char.flags.equity_counter_done = true;
              char.flags.equity_proposal = '33/33/33';
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale - 8, 0, 100);
              return "Jordan seemed relieved. Alex heard about it and went quiet.";
            } },
          { label: "You're not full-time — this reflects that", key: 'hold_40',
            execute(s, char) {
              char.flags.equity_counter_done = true;
              return "Jordan went quiet. 'Fine. I'll show you what 20% worth of work looks like.'";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.equity_counter_done = true; },
      },

      // Week 3c: Both counter (only if proposal is 50/25/25)
      {
        id: 'jordan_equity_counter_both', priority: 2, cat: 't', from: 'Jordan & Alex',
        body: "heard back from both. alex: 'i should be equal to you — i'm doing as much as you are.' jordan: 'alex and i are both writing code. 25% each feels low.'",
        urgency: 2, weeks: 1,
        available: (s, char) => char.flags.equity_proposal === '50/25/25' && !char.flags.equity_counter_done && s.week <= 10,
        options: [
          { label: "Give Alex what he wants — 40/40/20", key: 'cave_alex',
            execute(s, char, e) {
              char.flags.equity_counter_done = true;
              char.flags.equity_proposal = '40/40/20';
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale + 8, 0, 100);
              return "Alex got what he wanted. Jordan still has less than she wanted, but she accepted it.";
            } },
          { label: "Give Jordan what she wants — 33/33/33", key: 'cave_jordan',
            execute(s, char, e) {
              char.flags.equity_counter_done = true;
              char.flags.equity_proposal = '33/33/33';
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale - 8, 0, 100);
              return "Jordan got equal thirds. Alex went quiet. You gave up your majority.";
            } },
          { label: '50/25/25 stands — I run this company', key: 'hold_50',
            execute(s, char, e) {
              char.flags.equity_counter_done = true;
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale - 5, 0, 100);
              return "Both accepted it. Alex was terse. Jordan said 'okay.' The tension didn't disappear.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          char.flags.equity_counter_done = true;
          char.flags.equity_proposal = '33/33/33';
          const alex = e && e.chars && e.chars.get('alex');
          if (alex) alex.morale = clamp(alex.morale - 10, 0, 100);
        },
      },

      // Week 4: Signing
      {
        id: 'jordan_equity_split', cat: 'e', from: 'Jordan & Alex',
        body: (s, char) => {
          const split = char.flags.equity_proposal || '40/40/20';
          if (split === '33/33/33') return "three-way call. equal thirds. jordan got what she wanted. alex went quiet when the documents came out. nobody brought up vesting — it felt unnecessary between friends.";
          if (split === '50/25/25') return "three-way call. 50/25/25 on the table. jordan accepted — at least she's equal to alex. alex signed without comment. nobody mentioned vesting schedules.";
          return "three-way call. 40/40/20 agreed. alex seemed satisfied. jordan signed — said she'd prove she's worth more than 20%. nobody set up vesting schedules.";
        },
        urgency: 3, weeks: 1, priority: 1,
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
        id: 'jordan_ios_sprint', priority: 2, cat: 'p', from: 'Jordan',
        body: (s, char) => (char.flags.ios_sprint_count || 0) === 0
          ? "profile screen, photo uploads, basic navigation working on iOS. one more sprint to wire up the backend — matching, messaging, notifications through the API."
          : "iOS connected to the backend — matching, messaging, notifications all live. same experience as web. ready to open it up.",
        urgency: 2, weeks: 1,
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
                return "iOS feature complete. Matching, messaging, notifications — same experience as web. Ready to open it up.";
              }
              if (s.items) {
                if (s.items.ios_ui) { s.items.ios_ui.status = 'done'; s.items.ios_ui.quality = 'solid'; }
                if (s.items.ios_server) s.items.ios_server.status = 'active';
              }
              return "First iOS sprint done. Profile screen, photo uploads, navigation are working. One more sprint for feature parity with web.";
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
            execute(s, char) { char.flags.working_style_done = true; char.morale = clamp(char.morale + 5, 0, 100); return "Daily standup at 9am. Keeps both of you honest."; } },
          { label: 'Async — ping when blocked', key: 'async',
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
            execute(s, char) { char.flags.pricing_done = true; s.signal = clamp(s.signal + 4, 0, 100); return "Charging early. You'll get 10 serious subscribers instead of 100 who open it once. If they pay before there are many matches, they really want this."; } },
          { label: 'Free until we have real critical mass', key: 'free',
            execute(s, char) { char.flags.pricing_done = true; s.waitlist += 2; return "Free to start. More people in the door. The cold start problem is real — you need enough singles before anyone finds a match worth paying for."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx(s, char) { char.flags.pricing_done = true; },
      },

      // ── PIVOT DISCUSSION (card 1 of 3: Jordan surfaces the user signal) ────────
      {
        id: 'pivot_open', cat: 'p', from: 'Jordan',
        body: (s, char) => (char.flags.pivot_dismissed || 0) >= 2
          ? "this has come up four separate times now. i'm not saying we pivot — i'm saying we need to have the conversation."
          : "been going through beta feedback threads. three users independently used almost the same phrase: 'i matched, but then what?' they're not complaining about the matching — they want somewhere to go. could be noise. thought i'd flag it before we get closer to launch.",
        urgency: (s, char) => (char.flags.pivot_dismissed || 0) >= 2 ? 3 : 2,
        weeks: 1,
        available: (s, char) => s.activities_cut && s.has_beta && s.market_fit >= 5
          && s.jordan_active && !s.jordan_resolved && !s.launched
          && !char.flags.pivot_open_done && s.week >= (char.flags.pivot_open_wait || 0),
        options: [
          { label: "Good flag — let's talk through it", key: "open",
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
            execute(s, char, e) {
              char.flags.fulltime_ask_done = true;
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale - 5, 0, 100);
              return "Jordan's staying part-time. Alex heard the outcome. He's covering her work — and now he knows you know it too.";
            } },
          { label: 'Tell her this is a dealbreaker', key: 'pressure',
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
