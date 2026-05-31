(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'jordan', name: 'Jordan', type: 'cofounder',
    cards: [

      // ── EQUITY ARC: 3 weeks ──────────────────────────────────────────────────
      {
        id: 'jordan_equity_mention', cat: 't', from: 'Jordan',
        body: "hey — i know we're heads down right now, but the three of us should probably talk about equity at some point. doesn't have to be today, but before it gets weird.",
        urgency: 1, weeks: 1,
        available: (s, char) => s.week >= 2 && s.week <= 5 && !char.flags.equity_mention_done,
        options: [
          { label: "Agreed — let's find a time this week", key: 'agree',
            execute(s, char) {
              char.flags.equity_mention_done = true;
              return "Scheduled it. Good that someone brought it up.";
            } },
          { label: 'Soon — want to get a few more things in place first', key: 'defer',
            execute(s, char) {
              char.flags.equity_mention_done = true;
              return "Jordan nodded. It'll come up again.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.equity_mention_done = true; },
      },
      {
        id: 'jordan_equity_alex', cat: 't', from: 'Alex',
        body: "jordan's right — we should document the split. i don't want to have this conversation in six months when the stakes are higher. what are you thinking?",
        urgency: 2, weeks: 1,
        available: (s, char) => char.flags.equity_mention_done && !char.flags.equity_alex_done && s.week <= 8,
        options: [
          { label: '40 / 40 / 20 — you and Alex equal, Jordan gets 20%', key: 'split_40',
            execute(s, char, e) {
              char.flags.equity_alex_done = true;
              char.flags.equity_proposal = '40/40/20';
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale + 5, 0, 100);
              return "Makes sense. Jordan's been building too — 20% feels right for where things stand. Set up a three-way call.";
            } },
          { label: 'Equal thirds — 33 / 33 / 33', key: 'split_33',
            execute(s, char, e) {
              char.flags.equity_alex_done = true;
              char.flags.equity_proposal = '33/33/33';
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale - 5, 0, 100);
              return "Equal split. Alex seemed surprised but didn't push back. Set up a three-way call.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.equity_alex_done = true; char.flags.equity_proposal = '40/40/20'; },
      },
      {
        id: 'jordan_equity_split', cat: 'e', from: 'Jordan & Alex',
        body: (s, char) => `three-way call. ${char.flags.equity_proposal || '40/40/20'} split on the table — everyone agrees. someone mentions vesting schedules but nobody follows up on it. feels premature between people who trust each other.`,
        urgency: 3, weeks: 1, priority: true,
        available: (s, char) => char.flags.equity_alex_done && !s.jordan_equity && s.week <= 10,
        options: [
          { label: 'Sign the agreement', key: 'sign',
            execute(s, char, e) {
              s.jordan_equity = true;
              s.jordan_cleanup_needed = true;
              const alex = e.chars.get('alex');
              if (alex) alex.flags.equity_set = true;
              return `split locked in. documents signed. nobody set up vesting schedules — it felt unnecessary between friends.`;
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
          ? "got photo uploads working on iOS. push notifications are mostly behaving now. a few rough edges but it moves."
          : "updated the matching view on iOS. a bit faster now. not quite on par with the web version yet.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.jordan_active && !s.jordan_drifting && s.week >= 3
          && (char.flags.ios_sprint_count || 0) < 2,
        options: [
          { label: 'Good — keep the momentum', key: 'ack',
            execute(s, char) {
              char.flags.ios_sprint_count = (char.flags.ios_sprint_count || 0) + 1;
              s.product = clamp(s.product + 5, 0, 100);
              s.signal = clamp(s.signal + 3, 0, 100);
              return "iOS is ahead of schedule. Users on mobile are converting better than web.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.ios_sprint_count = (char.flags.ios_sprint_count || 0) + 1; },
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
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale - 5, 0, 100);
              return "Jordan was apologetic. Said it's temporary. You're not sure.";
            } },
          { label: 'Alex can cover for now', key: 'cover',
            execute(s, char, e) {
              char.flags.drift_start_done = true;
              s.jordan_drifting = true;
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale - 10, 0, 100);
              return "Alex nodded. He'll cover it. The iOS backlog keeps growing.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          char.flags.drift_start_done = true;
          s.jordan_drifting = true;
          const alex = e && e.chars && e.chars.get('alex');
          if (alex) alex.morale = clamp(alex.morale - 8, 0, 100);
        },
      },
      {
        id: 'jordan_drag', cat: 't', from: 'Alex',
        body: (s, char) => {
          const variants = [
            "pushed the iOS release back again. jordan said she'd review my PR by tuesday — it's friday.",
            "spent half a sprint on iOS debt jordan left. not blocking us, but it's slowing me down.",
            "user reported a crash on iphone 12. jordan's the only one who knows that part of the codebase. waiting on her.",
          ];
          return variants[(char.flags.drag_count || 0) % variants.length];
        },
        urgency: 2, weeks: 1,
        available: (s, char) => s.jordan_drifting && !s.jordan_resolved
          && s.week >= (char.flags.drag_last || 0) + 2,
        options: [
          { label: 'Noted', key: 'ack',
            execute(s, char, e) {
              char.flags.drag_count = (char.flags.drag_count || 0) + 1;
              char.flags.drag_last = s.week;
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale - 4, 0, 100);
              return "Alex absorbed it. The problem isn't going away.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          char.flags.drag_count = (char.flags.drag_count || 0) + 1;
          char.flags.drag_last = s.week;
          const alex = e && e.chars && e.chars.get('alex');
          if (alex) alex.morale = clamp(alex.morale - 6, 0, 100);
        },
      },

      // ── LAUNCH BLOCKER ───────────────────────────────────────────────────────
      {
        id: 'jordan_launch_blocker', cat: 'p', from: 'Alex',
        body: "backend's solid. web works end to end. i've been ready to ship for two weeks. but we can't launch a dating app without mobile — nobody will use it. jordan needs to finish the iOS build or we need to talk about what's actually happening.",
        urgency: 3, weeks: 1, priority: true,
        available: (s, char) => s.jordan_drifting && !s.jordan_resolved && !char.flags.launch_blocker_done
          && s.product >= 50 && s.has_beta && !s.launched,
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
        body: "i need to say something. jordan's been part-time for two months. i'm covering her work and mine. she has 20% of the company and i don't think she's earning it anymore. we need to have the conversation.",
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
              return "Hard conversation. Jordan wasn't surprised — she knew it wasn't working. She's off the team. Her 20% is still on the cap table.";
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
          s.jordan_resolved = true;
          const alex = e && e.chars && e.chars.get('alex');
          if (alex) alex.morale = clamp(alex.morale - 12, 0, 100);
        },
      },

      // ── CAP TABLE CLEANUP ────────────────────────────────────────────────────
      {
        id: 'jordan_cap_table', cat: 'e', from: 'Alex',
        body: "jordan's 20% is still on the cap table — fully vested, no cliff. legally she owns a fifth of the company. any investor who looks at this will ask questions we can't answer well. we need a lawyer to clean it up.",
        urgency: 2, weeks: 1,
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
