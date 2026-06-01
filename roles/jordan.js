(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'jordan', name: 'Jordan', type: 'cofounder',
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
        urgency: 1, weeks: 1,
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

      // Week 2: Founder's opening offer
      {
        id: 'jordan_equity_alex', cat: 't', from: 'Alex',
        body: "jordan wants equal thirds. i've been thinking — she's still at her job, i'm treating this as my main thing. you and i are doing the same amount. i think 40/40/20 is fair. what are you thinking?",
        urgency: 2, weeks: 1, priority: true,
        available: (s, char) => char.flags.equity_mention_done && !char.flags.equity_proposal && s.week <= 8,
        options: [
          { label: 'Equal thirds — 33/33/33', key: 'propose_33',
            execute(s, char, e) {
              char.flags.equity_proposal = '33/33/33';
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale - 8, 0, 100);
              return "Equal split. Alex went quiet — he expected more weight for his commitment.";
            } },
          { label: '40/40/20 — you and I equal, Jordan gets less', key: 'propose_40',
            execute(s, char, e) {
              char.flags.equity_proposal = '40/40/20';
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale + 5, 0, 100);
              return "Alex: 'yeah — that's what I was thinking.' Jordan hasn't heard yet.";
            } },
          { label: '50/25/25 — I need majority as founder', key: 'propose_50',
            execute(s, char, e) {
              char.flags.equity_proposal = '50/25/25';
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale - 3, 0, 100);
              return "Alex was quiet for a moment. 'Okay. I'll take 25 alongside Jordan.' You'll hear from both of them.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          char.flags.equity_proposal = '33/33/33';
          char.flags.equity_skipped = true;
          const alex = e && e.chars && e.chars.get('alex');
          if (alex) alex.morale = clamp(alex.morale - 10, 0, 100);
        },
      },

      // Week 3a: Alex counters (only if proposal is 33/33/33)
      {
        id: 'jordan_equity_counter_alex', cat: 't', from: 'Alex',
        body: (s, char) => char.flags.equity_skipped
          ? "you didn't respond to jordan. been thinking about it anyway — she's still at her job, i'm all-in. equal thirds means i get the same as someone who's not putting in the same."
          : "i've been thinking about the 33/33/33 thing. jordan's still at her job. i'm all-in. equal thirds means i get the same as someone who's not putting in the same. i think i should have at least equal to you.",
        urgency: 2, weeks: 1,
        available: (s, char) => char.flags.equity_proposal === '33/33/33' && !char.flags.equity_counter_done && s.week <= 10,
        options: [
          { label: "You're right — 40/40/20", key: 'cave_40',
            execute(s, char, e) {
              char.flags.equity_counter_done = true;
              char.flags.equity_proposal = '40/40/20';
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale + 10, 0, 100);
              return "Alex appreciated it. Jordan will hear about the change.";
            } },
          { label: 'Equal thirds is still fair', key: 'hold_33',
            execute(s, char, e) {
              char.flags.equity_counter_done = true;
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale - 5, 0, 100);
              return "Alex accepted it. He didn't agree — but he dropped it.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          char.flags.equity_counter_done = true;
          const alex = e && e.chars && e.chars.get('alex');
          if (alex) alex.morale = clamp(alex.morale - 8, 0, 100);
        },
      },

      // Week 3b: Jordan counters (only if proposal is 40/40/20)
      {
        id: 'jordan_equity_counter_jordan', cat: 't', from: 'Jordan',
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
        id: 'jordan_equity_counter_both', cat: 't', from: 'Jordan & Alex',
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
        urgency: 3, weeks: 1, priority: true,
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
          ? "profile screen, photo uploads, basic navigation working on iOS. one more sprint to wire up the backend — matching, messaging, notifications through the API."
          : "iOS connected to the backend — matching, messaging, notifications all live. same experience as web. ready to open it up.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.jordan_active && !s.jordan_drifting && s.week >= 3
          && (char.flags.ios_sprint_count || 0) < 2,
        options: [
          { label: 'Good — keep the momentum', key: 'ack',
            execute(s, char) {
              char.flags.ios_sprint_count = (char.flags.ios_sprint_count || 0) + 1;
              s.product = clamp(s.product + 5, 0, 100);
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

      // ── DRIFT PHASE ──────────────────────────────────────────────────────────
      {
        id: 'jordan_drift_start', cat: 't', from: 'Alex',
        body: "jordan's been slower this week. said she's swamped at work. i covered the iOS push — took me two days. not complaining, just flagging it.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.jordan_active && !s.jordan_drifting && s.week >= 8
          && !char.flags.drift_start_done,
        options: [
          { label: 'Talk to Jordan directly', key: 'talk',
            execute(s, char, e) {
              char.flags.drift_start_done = true;
              s.jordan_drifting = true;
              char.focus = null;
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale - 5, 0, 100);
              return "Jordan was apologetic. Said it's temporary. You're not sure.";
            } },
          { label: 'Alex can cover for now', key: 'cover',
            execute(s, char, e) {
              char.flags.drift_start_done = true;
              s.jordan_drifting = true;
              char.focus = null;
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale - 10, 0, 100);
              return "Alex nodded. He'll cover it. The iOS backlog keeps growing.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          char.flags.drift_start_done = true;
          s.jordan_drifting = true;
          char.focus = null;
          const alex = e && e.chars && e.chars.get('alex');
          if (alex) alex.morale = clamp(alex.morale - 8, 0, 100);
        },
      },
      {
        id: 'jordan_drag', cat: 't', from: 'Alex',
        body: (s, char) => (char.flags.drag_count || 0) === 0
          ? "pushed the iOS release back again. jordan said she'd review my PR by tuesday — it's friday. i've covered it, but this is the second time this sprint."
          : "user reported a crash on iphone 12. jordan's the only one who knows that part of the codebase. i've been waiting two days. this can't keep going.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.jordan_drifting && !s.jordan_resolved
          && (char.flags.drag_count || 0) < 2
          && s.week >= (char.flags.drag_last || 0) + 4,
        options: [
          { label: 'Talk to Jordan directly', key: 'talk',
            execute(s, char, e) {
              char.flags.drag_count = (char.flags.drag_count || 0) + 1;
              char.flags.drag_last = s.week;
              s.jordan_confrontation_triggered = true;
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale + 5, 0, 100);
              return "Sat down with Jordan. She heard the weight of it. Alex noticed you followed up — the real conversation is coming.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          const count = (char.flags.drag_count || 0) + 1;
          char.flags.drag_count = count;
          char.flags.drag_last = s.week;
          const alex = e && e.chars && e.chars.get('alex');
          if (count >= 2) {
            // Second warning ignored — Alex is at breaking point
            if (alex) { alex.morale = 5; alex.trust = clamp(alex.trust - 20, 0, 100); }
            s.jordan_confrontation_triggered = true;
          } else {
            if (alex) alex.morale = clamp(alex.morale - 12, 0, 100);
          }
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

      // ── LAUNCH BLOCKER ───────────────────────────────────────────────────────
      {
        id: 'jordan_launch_blocker', cat: 'p', from: 'Alex',
        body: "backend's solid. web works end to end. i've been ready to ship for two weeks. but we can't launch a dating app without mobile — nobody will use it. jordan needs to finish the iOS build or we need to talk about what's actually happening.",
        urgency: 3, weeks: 1, priority: true,
        available: (s, char) => s.jordan_drifting && !s.jordan_resolved && !char.flags.launch_blocker_done
          && s.has_beta && !s.launched && !s.ios_unblocked,
        options: [
          { label: 'Launch web-only — fix iOS later', key: 'web_only',
            execute(s, char) {
              char.flags.launch_blocker_done = true;
              s.launched = true;
              s.signal = clamp(s.signal - 10, 0, 100);
              return "Launched. Web-only. A dating app without iOS is a real handicap — early retention will show it.";
            } },
          { label: 'Give Jordan two more weeks', key: 'wait',
            execute(s, char, e) {
              char.flags.launch_blocker_wait = (char.flags.launch_blocker_wait || 0) + 1;
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale - 8, 0, 100);
              return "Alex wasn't happy. Jordan said she'd prioritize it. The clock is running.";
            },
            available: (s, char) => (char.flags.launch_blocker_wait || 0) < 1 },
          { label: 'Confront Jordan — this has to be resolved', key: 'confront',
            execute(s, char) {
              char.flags.launch_blocker_done = true;
              s.jordan_confrontation_triggered = true;
              return "Agreed. This conversation is overdue.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) {
          char.flags.launch_blocker_done = true;
          s.launched = true;
          s.signal = clamp(s.signal - 15, 0, 100);
        },
      },

      // ── CONFRONTATION ────────────────────────────────────────────────────────
      {
        id: 'jordan_confrontation', cat: 't', from: 'Alex',
        body: (s, char) => {
          const pct = char.flags.equity_proposal === '33/33/33' ? '33%' : char.flags.equity_proposal === '50/25/25' ? '25%' : '20%';
          return `i need to say something. jordan's been part-time for two months. i'm covering her work and mine. she has ${pct} of the company and i don't think she's earning it anymore. we need to have the conversation.`;
        },
        urgency: 3, weeks: 1, priority: true,
        available: (s, char) => s.jordan_drifting && !s.jordan_resolved && !char.flags.confrontation_done
          && (s.jordan_confrontation_triggered || s.week >= (s.jordan_confrontation_defer_until || 20)),
        options: [
          { label: 'Have the conversation — let Jordan go', key: 'fire',
            execute(s, char, e) {
              char.flags.confrontation_done = true;
              s.jordan_resolved = true;
              const alex = e.chars.get('alex');
              if (alex) {
                alex.morale = clamp(alex.morale + 10, 0, 100);
                alex.trust = clamp(alex.trust + 8, 0, 100);
              }
              const pct = char.flags.equity_proposal === '33/33/33' ? '33%' : char.flags.equity_proposal === '50/25/25' ? '25%' : '20%';
              return `Hard conversation. Jordan wasn't surprised — she knew it wasn't working. She's off the team. Her ${pct} is still on the cap table.`;
            } },
          { label: 'One more sprint to turn it around', key: 'defer',
            execute(s, char, e) {
              s.jordan_confrontation_triggered = false;
              s.jordan_confrontation_defer_until = s.week + 4;
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale - 8, 0, 100);
              return "Alex went quiet. Jordan will try again. You both know how this ends.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          char.flags.confrontation_done = true;
          // Jordan stays — only the player can fire her. Alex can't take it anymore.
          const alex = e && e.chars && e.chars.get('alex');
          if (alex) { alex.morale = 0; alex.trust = clamp(alex.trust - 25, 0, 100); }
        },
      },

      // ── CAP TABLE CLEANUP ────────────────────────────────────────────────────
      {
        id: 'jordan_cap_table', cat: 'e', from: 'Alex',
        body: (s, char) => {
          const pct = char.flags.equity_proposal === '33/33/33' ? '33%' : char.flags.equity_proposal === '50/25/25' ? '25%' : '20%';
          return `jordan's ${pct} is still on the cap table — fully vested, no cliff. any investor who looks at this will ask questions we can't answer well. we need a lawyer to clean it up.`;
        },
        urgency: 2, weeks: 1, priority: true,
        available: (s, char) => s.jordan_resolved && s.jordan_cleanup_needed && !char.flags.cap_table_done,
        options: [
          { label: 'Hire a lawyer — $2,000', key: 'lawyer',
            execute(s, char) {
              char.flags.cap_table_done = true;
              s.jordan_cleanup_needed = false;
              s.cash = clamp(s.cash - 2000, 0, 9999999);
              return "Lawyer drafted a buyback agreement. Jordan signed for a nominal amount. Cap table clean.";
            } },
          { label: "Can't afford it right now", key: 'defer',
            execute(s, char) {
              char.flags.cap_table_done = true;
              return "Left it for now. Every investor who looks at the cap table will ask about Jordan's stake.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.cap_table_done = true; },
      },

    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.jordan = def;
})();
