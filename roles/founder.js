(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'founder', name: 'You', type: 'founder',

    slice: [
      "founder_landing",
      "founder_first_interviews",
      "founder_waitlist_calls",
      "equity_signing",
      "founder_meetup",
      "slide_maya_call",
      "pivot_summit_call",
      "founder_codebuild",
      "founder_pair_jordan",
      "founder_build_onboarding",
      "founder_build_empty_states",
      "founder_build_export",
      "founder_build_demo_account",
      "founder_solo_launch",
      "founder_solo_build",
      "founder_solo_discover",
      "founder_solo_growth",
      "founder_user_depth",
      "dont_scale_seed",
      "first_customer_offer",
      "reference_checkin",
      "website_social_proof",
      "founder_pricing_experiment",
      "founder_reflect",
    ],

    role: "Founder · Journal",
    milestones: [
      { key: "building", cls: "green", label: "We're Building", test: (s, c) => !!(c.alex.flags.prototype_kicked) },
      { key: "incorporated", cls: "blue", label: "Incorporated", test: (s) => !!s.incorporated },
      { key: "equity", cls: "red", label: "Equity Signed", test: (s) => !!s.jordan_equity },
      { key: "demo", cls: "green", label: "First Demo", test: (s) => !!s.has_demo },
      { key: "launched", cls: "green", label: "Launched", test: (s) => !!s.launched },
      { key: "pivotshipped", cls: "green", label: "Shipped v2", test: (s) => !!s.pivot_shipped },
      { key: "firstcust", cls: "blue", label: "First Customer", test: (s) => s.customers >= 1 },
      { key: "marcus", cls: "blue", label: "Lead Investor", test: (s) => !!s.marcusCommitted },
      { key: "funded", cls: "red", label: "Round Closed", test: (s) => !!s.followerCommitted },
      { key: "yc", cls: "red", label: "YC Accepted", test: (s) => !!s.ycAccepted },
    ],
    cards: [
      {
        id: 'founder_landing', cat: 'p', from: 'You',
        body: "you keep telling people you're building a dating app for people sick of swiping — but you have nowhere to point them. no domain, no landing page, no email capture.",
        urgency: 2, weeks: 1,
        available: (s) => s.week <= 5 && !s.has_landing_page,
        options: [
          { label: 'Register the domain + set up a landing page — $200', key: 'build',
            journal: "Registered the domain and put up a simple landing page — $200 for the domain, hosting, and Carrd. Already got twelve 'signups'… all crypto spam. Still, we exist online now.",
            execute(s) { s.has_landing_page = true; s.cash = clamp(s.cash - 200, 0, 9999999); s.signal = clamp(s.signal + 8, 0, 100); return "Domain registered. Simple landing page live. $200 out for domain, annual hosting, and a Carrd subscription. Already have 12 email signups from people! wait actually these are just spammers pushing some crypto scam."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'founder_first_interviews', cat: 'c', from: 'You',
        body: "you've been building without a single structured conversation with someone who's used dating apps and given up. everything you think you know about what they want is a guess.",
        urgency: 2, weeks: 1,
        // Window rides the dev clock: the co-founders' direction questions start
        // landing at dev_start+1, and their research-gated options need this done.
        available: (s, char) => !s.launched && !char.flags.interviews_done
          && s.week <= Math.max(8, (s.dev_start_week || 0) + 3),
        options: [
          { label: 'Block off this week for 5 customer interviews', key: 'interview',
            journal: "Blocked off the week for five customer interviews. Two insights I didn't expect, and one person said they'd pay right now if it existed. The picture's much clearer.",
            execute(s, char) { char.flags.interviews_done = true; char.flags.recent_user_signal_week = s.week; s.signal = clamp(s.signal + 15, 0, 100); s.market_fit = clamp(s.market_fit + 12, 0, 100); s.waitlist += 1; return "5 calls done. Two insights you didn't expect. One person said they'd pay right now if it existed. Signal much clearer."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },

      // ── RECURRING: call the waitlist (keeps the research *fresh*) ────────────
      // Later direction cards' best options check recent_user_signal_week — research
      // is a habit you maintain, not a week-2 checkbox. Costs an action every time;
      // that's the build-vs-research tension in the 2-action week.
      {
        id: 'founder_waitlist_calls', cat: 'c', from: 'You',
        body: (s) => `there are ${Math.max(5, (s.waitlist || 0) + 5)} people between the waitlist and your early-access DMs, and you haven't spoken to one of them since the last round of calls. block an afternoon. call five.`,
        urgency: 2, weeks: 1,
        available: (s, char) => !s.launched && s.dev_start_week != null
          && s.week >= s.dev_start_week + 2
          && (s.waitlist >= 3 || char.flags.interviews_done)
          && (char.flags.waitlist_calls_count || 0) < 3
          && s.week >= (char.flags.waitlist_calls_last || 0) + 4,
        options: [
          { label: 'Call five of them', key: 'call',
            journal: "Called five people from the waitlist. One woman keeps a spreadsheet of her matches across four apps — the HN thread wasn't exaggerating. Two others said nearly the same sentence, unprompted: 'I'm fine getting matches. Nothing ever happens after.' Logged.",
            execute(s, char) {
              char.flags.waitlist_calls_last = s.week;
              char.flags.recent_user_signal_week = s.week;
              s.signal = clamp(s.signal + 6, 0, 100);
              s.market_fit = clamp(s.market_fit + 4, 0, 100);
              const n = (char.flags.waitlist_calls_count = (char.flags.waitlist_calls_count || 0) + 1);
              const rounds = [
                "Five calls. One woman keeps a spreadsheet of her matches across four apps — the HN thread wasn't exaggerating. Two others said nearly the same sentence, unprompted: 'I'm fine getting matches. Nothing ever happens after.' Logged.",
                "Five more calls. A teacher who deleted every app twice. A guy who wrote three drafts of a first message and sent none. The pattern doesn't move: getting matches isn't the problem — what comes after is.",
                "Another round of calls. Someone asked, dead serious, if kindred could just 'decide the first date for both of us.' Filed under: things users say that sound like jokes and aren't.",
              ];
              return rounds[(n - 1) % rounds.length];
            } },
          { label: 'Not this week — the build needs you', key: 'skip',
            journal: "Skipped the waitlist calls this week. The build needed me — but the research is going stale.",
            execute(s, char) {
              char.flags.waitlist_calls_last = s.week;
              return "Skipped. The build got the afternoon instead — and the user signal gets a week staler.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.waitlist_calls_last = s.week; },
      },

      // ── EQUITY SIGNING: surfaces after the counter-offer arc resolves ──────
      {
        id: 'equity_signing', cat: 'e', from: 'You', focus: 'equity',
        body: (s, char, e) => {
          const jordan = e.chars.get('jordan');
          const split = (jordan && jordan.flags.equity_proposal) || '40/40/20';
          if (split === '33/33/33') return "three-way call. equal thirds. jordan got what she wanted. alex went quiet when the documents came out. nobody brought up vesting — it felt unnecessary between friends.";
          if (split === '50/25/25') return "three-way call. 50/25/25 on the table. jordan accepted — at least she's equal to alex. alex signed without comment. nobody mentioned vesting schedules.";
          return "three-way call. 40/40/20 agreed. alex seemed satisfied. jordan signed — said she'd prove she's worth more than 20%. nobody set up vesting schedules.";
        },
        urgency: 13, weeks: 1,
        available: (s, char, e) => {
          const jordan = e.chars.get('jordan');
          return jordan && jordan.flags.equity_counter_done && !s.jordan_equity && s.week <= 12;
        },
        options: [
          { label: 'Sign the agreement', key: 'sign',
            journal: "We signed the founder agreement. The split's locked in. Nobody set up vesting schedules — it felt unnecessary between friends. I hope that's not something I regret.",
            execute(s, char, e) {
              s.jordan_equity = true;
              s.equity_week = s.week;
              s.jordan_cleanup_needed = true;
              s.focus = null;  // exit the equity focus arc — the world un-holds
              // Morale/trust were already settled by the proposal + counter beats;
              // signing is pure ceremony so the deltas aren't double-counted here.
              const alex = e.chars.get('alex');
              if (alex) alex.flags.equity_set = true;
              return "split locked in. documents signed. nobody set up vesting schedules — it felt unnecessary between friends.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          s.jordan_equity = true;
          s.equity_week = s.week;
          s.jordan_cleanup_needed = true;
          s.focus = null;  // never leave focus stuck if signing is ignored
          const alex = e && e.chars && e.chars.get('alex');
          if (alex) alex.flags.equity_set = true;
        },
      },

      // ── RECURRING: founder pairs with Alex ──────────────────────────────────
      {
        id: 'founder_codebuild', cat: 'p', from: 'You', _cofounderEngagement: 'alex',
        body: (s, char, engine) => {
          const timesPaired = engine.history.filter(h => h.chosen.includes('founder_codebuild')).length;
          if (timesPaired === 0)
            return "alex has been heads-down but the queue isn't shrinking. you can code — take this sprint and build alongside him.";
          if (timesPaired < 3)
            return "same situation as last time — queue still isn't moving fast enough. you could jump in again.";
          const extras = [
            "the queue's never fully empty. at some point pairing stops being a one-off and becomes the default way you ship.",
            "matching algorithm is getting slower as the user base grows. alex flagged it — not urgent yet, but a focused sprint together would close it.",
            "photo upload pipeline is still flaky for some devices. alex has it on the list but it keeps sliding. worth a sprint.",
          ];
          return extras[(timesPaired - 3) % extras.length];
        },
        urgency: 2, weeks: 1,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          // Recurs the whole time Alex is heads-down building — including post-launch
          // (the timesPaired>=3 body variants and the demos option's `else s.users += 3`
          // branch are written for the growth phase).
          return alex && alex.active && alex.focus === 'build'
            && s.week >= (s.cobuild_last || 0) + 4;
        },
        options: [
          { label: 'Pair up this sprint', key: 'pair',
            execute(s, char, e) {
              s.cobuild_last = s.week;
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale + 8, 0, 100);
              // Building our own matching engine? Pairing on it is how the secret sauce
              // gets sharper. Research-gated: you only know what to match on after talking
              // to users (GOALS.md), so discovery makes the pairing pay off far more.
              if (s.matching_owned && !s.launched) {
                const researched = !!char.flags.interviews_done || (alex && alex.focus === 'discover');
                s.market_fit = clamp(s.market_fit + (researched ? 6 : 2), 0, 100);
                if (s.items && s.items.matching_algo && s.items.matching_algo.status !== 'obsolete' && researched) {
                  s.items.matching_algo.quality = 'solid';
                }
                if (!char.flags.matching_pair_intro) {
                  char.flags.matching_pair_intro = true;
                  return researched
                    ? "Paired with Alex on the matching engine — the core of Kindred. Everything from the user interviews went straight into the ranking. Slow going, but it's ours and it's getting smarter."
                    : "Paired with Alex on the matching engine — the core of Kindred. It's ours and improving, but without real user signal you're both half-guessing at what 'a good match' even means.";
                }
                const pairN = (char.flags.matching_pair_count = (char.flags.matching_pair_count || 0) + 1);
                const researchedMsgs = [
                  "Back on the algorithm with Alex. Last week's interviews surfaced two ranking heuristics we hadn't considered — both are in now.",
                  "Two days deep on match scoring with Alex. Building intuition nobody else has, one heuristic at a time.",
                  "More engine work with Alex. The ranking is tightening up — you can feel it in the match quality.",
                  "Another focused sprint with Alex. Refined match weighting based on what users actually do after matching, not what they say they want.",
                  "Spent the day pair-programming on the core algorithm. A subtle bias in the scoring got fixed — match quality should improve.",
                  "Deep into the algorithm with Alex again. One major edge case squashed; first-match acceptance rate up noticeably.",
                ];
                const unresearchedMsgs = [
                  "More time on the algorithm with Alex. Moving forward, but without real user signal you're still partly guessing.",
                  "Another engine sprint. Useful, but optimizing without user data means some of this will get thrown out later.",
                  "Paired on the matching logic again. Progress is real but slow when you don't know what a good match looks like in practice.",
                  "More algorithm work with Alex. The logic feels tighter but you're still flying blind on what users actually respond to.",
                  "Another week on the engine. Without user signal, it's hard to know if you're improving what matters.",
                  "Back on the matching engine with Alex. Smart engineering — but engineering without signal is just guessing dressed up as progress.",
                ];
                const pool = researched ? researchedMsgs : unresearchedMsgs;
                return pool[(pairN - 1) % pool.length];
              }
              return "Paired up. You worked on the profiles UI, Alex handled the matching algorithm. Your contribution was modest but Alex shipped faster with you there.";
            } },
          { label: 'Run demos instead', key: 'demos',
            execute(s, char, e) {
              s.cobuild_last = s.week;
              if (!s.launched) s.waitlist += 3; else s.users += 3;
              s.signal = clamp(s.signal + 4, 0, 100);
              return "Ran 3 demos instead. 3 people signed up for early access. Alex kept building solo.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s) { s.cobuild_last = s.week; },
      },

      // ── PAIR A SPRINT WITH JORDAN (confirm it firsthand) ─────────────────────
      // Second beat of the firing arc: Alex has flagged Jordan slowing down
      // (jordan_drift_start → s.jordan_drifting). Before you decide anything, you pair
      // a sprint with her and see it for yourself — half-finished branches, standups
      // she takes from her day job. Diagnostic only (it never turns her around). It
      // banks s.jordan_underperf_witnessed (the fire option is gated on that) and arms
      // the confrontation, so the sequence is: Alex flags → you confirm → you choose.
      // One-shot at spine urgency so it surfaces promptly; ignoring it just means you
      // never confirmed firsthand (Alex's continued nagging can still get you there).
      {
        id: 'founder_pair_jordan', cat: 'p', from: 'You', _cofounderEngagement: 'jordan',
        body: "alex keeps flagging that jordan's slowing down. before you make any call, take a sprint and pair with her on the iOS backend yourself — you'll see exactly how the work is going.",
        urgency: 12, weeks: 1,
        available: (s, char, e) => {
          const j = e.chars.get('jordan');
          return j && j.active && s.jordan_active && s.jordan_drifting && !s.jordan_resolved
            && !s.launched && !char.flags.paired_jordan_done;
        },
        options: [
          { label: 'Pair with Jordan this sprint', key: 'pair',
            journal: "Paired with Jordan for a sprint on the iOS backend. Alex was right — half-built branches, standups she takes from her desk at work. She's stretched thin, and it isn't temporary.",
            execute(s, char, e) {
              char.flags.paired_jordan_done = true;
              s.jordan_underperf_witnessed = true;       // you've now seen it firsthand
              s.jordan_confrontation_triggered = true;   // → the hard conversation is next
              const j = e.chars.get('jordan');
              if (j && s.items && s.items.ios_server && s.items.ios_server.status === 'active') {
                s.items.ios_server.note = "Founder paired to push it forward";
              }
              return "Spent the sprint pairing with Jordan on the iOS backend. Alex was right — half-finished branches, standups she takes from her desk at work. She's spread thin, and it isn't temporary. Now you've seen it for yourself.";
            } },
          { label: 'Not yet — keep shipping', key: 'defer',
            journal: "Didn't pair with Jordan yet. Taking Alex's word for now and staying heads-down.",
            execute(s, char) {
              char.flags.paired_jordan_done = true;
              return "Left it for now — you're taking Alex's word and staying heads-down. You can still have the conversation when it's forced.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.paired_jordan_done = true; },
      },

      // ── ONE-TIME: specific pre-launch dev tasks ──────────────────────────────
      {
        id: 'founder_build_onboarding', cat: 'p', from: 'You',
        body: "you mapped onboarding from demo night and the testflight group — where people stall is profile setup, every time. it's a 3-step wizard, within your abilities to build. alex is maxed on the matching algorithm.",
        urgency: 2, weeks: 1,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          return !s.launched && s.has_demo && !char.flags.onboarding_built && alex && alex.active;
        },
        options: [
          { label: 'Build it yourself', key: 'build',
            journal: "Built the onboarding end-to-end myself. Took longer than expected — not my strongest skill — but it shipped.",
            execute(s, char, e) {
              char.flags.onboarding_built = true;
              s.market_fit = clamp(s.market_fit + 5, 0, 100);
              return "Built the onboarding end-to-end. Took longer than expected — not your strongest skill — but it shipped. Alex could stay heads-down on the backend.";
            } },
          { label: 'Hand the spec to Alex', key: 'pass',
            execute(s, char, e) {
              char.flags.onboarding_built = true;
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale - 3, 0, 100);
              return "Gave Alex the spec. He'll fit it in — but his queue just got longer.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'founder_build_empty_states', cat: 'p', from: 'You',
        body: "every first session opens on empty screens — an empty matches tab, an empty inbox — and the app looks broken. half the testflight group said so within a day of getting the build. two hours of work.",
        urgency: 2, weeks: 1,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          return !s.launched && s.has_demo && !char.flags.empty_states_built && alex && alex.active;
        },
        options: [
          { label: 'Fix the empty states yourself', key: 'build',
            execute(s, char, e) {
              char.flags.empty_states_built = true;
              s.market_fit = clamp(s.market_fit + 4, 0, 100);
              const alex = e.chars.get('alex');
              const jordan = e.chars.get('jordan');
              if (alex) alex.morale = clamp(alex.morale + 5, 0, 100);
              if (jordan) jordan.morale = clamp(jordan.morale + 5, 0, 100);
              return s.waitlist > 0 || s.users > 0
                ? "Added helpful empty states to every screen. Small fix, big impact — the TestFlight group stopped asking 'is the app broken?'"
                : "Added helpful empty states to every screen. Ready before anyone hits them.";
            } },
          { label: 'Add it to the backlog', key: 'pass',
            execute(s, char) {
              char.flags.empty_states_built = true;
              return "Added to the backlog. It'll stay there a while.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'founder_build_export', cat: 'p', from: 'You',
        // (Pre-launch, so the ask comes from the waitlist, not live users — the old
        // users>=3 gate could never pass before launch and left this card dead.)
        body: "three replies to your last waitlist update ask the same question: how do i know the matches are real? photo verification keeps coming up — nobody wants to join a dating app full of ghosts. a few days of work.",
        urgency: 2, weeks: 1,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          return !s.launched && s.has_demo && s.waitlist >= 5 && !char.flags.export_built && alex && alex.active;
        },
        options: [
          { label: 'Build photo verification yourself', key: 'build',
            execute(s, char) {
              char.flags.export_built = true;
              s.market_fit = clamp(s.market_fit + 6, 0, 100);
              return "Photo verification shipped ahead of launch. You replied to all three with a screenshot; two wrote back variations of 'ok NOW i'm in.'";
            } },
          { label: 'Ask Alex to prioritize it', key: 'pass',
            execute(s, char, e) {
              char.flags.export_built = true;
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale - 3, 0, 100);
              return "Alex added it to his sprint. It shipped two weeks later — one waitlist update too late to answer the people who asked.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'founder_build_demo_account', cat: 'p', from: 'You',
        body: "every investor demo starts with two blank profiles and zero matches. you spend 5 minutes saying 'imagine this has real users.' build a seeded demo account.",
        urgency: 1, weeks: 1,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          return !s.launched && s.has_demo && !char.flags.demo_account_built && alex && alex.active;
        },
        options: [
          { label: 'Build the demo environment', key: 'build',
            execute(s, char) {
              char.flags.demo_account_built = true;
              s.signal = clamp(s.signal + 6, 0, 100);
              s.investor_warmth = clamp(s.investor_warmth + 8, 0, 100);
              return "Demo account seeded with realistic profiles, matches, and messages. Next investor call, they asked 'can I sign up?' instead of 'how does this work?'";
            } },
          { label: 'Keep winging it', key: 'pass',
            execute(s, char) {
              char.flags.demo_account_built = true;
              return "Kept winging it. Lost two investor calls to confusion in the demo.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },

      // ── ONE-TIME: meetup → introduces Priya ─────────────────────────────────
      {
        id: 'founder_meetup', cat: 'e', from: 'You',
        body: (s, char) => s.week >= 8
          ? "the monthly founder meetup for consumer social and dating apps is this week. same community, different conversations."
          : "there's a meetup for founders building in the consumer social and relationships space — a dozen people building adjacent things. you haven't been to one of these in months.",
        urgency: 1, weeks: 1,
        available: (s, char) => {
          if (char.flags.meetup_done || char.flags.meetup_over) return false;
          if (s.week >= 8 && s.week <= 11) return true;
          return s.week >= 2 && s.week <= 6;
        },
        options: [
          { label: 'Go to the meetup', key: 'go',
            journal: "Went to the founder meetup. Good crowd. Long talk with Priya — she launched a consumer app years ago, has strong opinions on retention, and seemed genuinely curious about what we're building.",
            execute(s, char) {
              char.flags.meetup_done = true;
              s.met_priya = true;
              s.met_priya_week = s.week;
              s.signal = clamp(s.signal + 4, 0, 100);
              s.market_fit = clamp(s.market_fit + 3, 0, 100);
              return "Good crowd. You talked to a few people building in adjacent spaces. Had a long conversation with Priya — she launched a consumer app a few years ago, has strong opinions on retention, and seemed genuinely interested in what you're working on.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) {
          if (s.week >= 11) char.flags.meetup_over = true;
        },
      },

      // ── THE SLIDE (week L+2): the human beat — call the first churned user ───
      {
        id: 'slide_maya_call', cat: 'c', from: 'You',
        body: "Maya — the first signup, launch day, Jordan watched her fill out her profile live — hasn't opened the app in 9 days. She matched with three people in week one. You have her number.",
        urgency: 13, weeks: 1,
        available: (s, char) => s.launched && s.activities_cut && !s.activities_pivot
          && s.week >= (s.launch_week || 0) + 2 && !char.flags.maya_done,
        options: [
          { label: 'Call her', key: 'call',
            journal: "Called Maya. She was nice about it, which somehow made it worse. 'The matching was honestly good? I matched with a guy who seemed great. We said hey. And then it was just… a chat window. I already have seven dead chat windows on Hinge. I deleted Kindred because it made me feel worse, not better.'",
            execute(s, char) {
              char.flags.maya_done = true;
              s.maya_quote = true;
              s.market_fit = clamp(s.market_fit + 4, 0, 100);
              s.signal = clamp(s.signal + 3, 0, 100);
              return "Maya picked up. She was nice about it, which made it worse: 'The matching was honestly good. I matched with a guy who seemed great. We said hey. And then it was just… a chat window. I already have seven of those on Hinge. Kindred made me feel worse, not better.' You wrote down every word.";
            } },
          { label: 'Send an email survey', key: 'survey',
            journal: "Sent Maya (and the other quiet accounts) a churn survey. Two replies, both polite, nothing quotable. Surveys get answers; calls get the truth.",
            execute(s, char) {
              char.flags.maya_done = true;
              s.market_fit = clamp(s.market_fit + 1, 0, 100);
              return "Two survey replies, both polite, nothing quotable. Surveys get answers; calls get the truth.";
            } },
          { label: 'Churned users churn — focus forward', key: 'let_go',
            journal: "Decided not to chase Maya. Churned users churn. Focus forward.",
            execute(s, char) {
              char.flags.maya_done = true;
              return "Focused forward. Whatever Maya knew about why she left, she took with her.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.maya_done = true; },
      },

      // ── PIVOT DAY TRIGGER (week L+3): the founder calls the summit ───────────
      // Drifting past this is itself the failure the scorecard names: ignore it
      // long enough and pivot_deferred sets silently — the default won.
      {
        id: 'pivot_summit_call', cat: 'p', from: 'You',
        body: (s, char, e) => `Three weeks since launch and the graph is flat. Two explanations on the table. Alex: the product is fine, there just aren't enough users yet. Priya: more users won't help — every match hits a dead end. You can't chase both. With ${e ? e.runwayWeeks : 10} weeks of cash left, you get to be wrong exactly once. Clear Saturday. Get them both in a room. Settle it.`,
        urgency: 14, weeks: 1, patience: 3,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          const priya = e.chars.get('priya');
          return s.launched && s.activities_cut && !s.activities_pivot
            && !s.pivot_summit_done && !s.pivot_deferred
            && s.week >= (s.launch_week || 0) + 3
            && alex && alex.active && priya && priya.active;
        },
        options: [
          { label: 'Call it — Saturday, whiteboard', key: 'call_it',
            journal: "Called the summit. Saturday, whiteboard, nobody leaves until we know what we're building Monday. Alex will argue we just need more users; Priya's bringing four years of scar tissue.",
            execute(s, char, e) {
              s.focus = { id: 'pivot', charIds: ['alex', 'priya'] };
              return "Saturday. Whiteboard. Nobody leaves until you know what you're building Monday.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) {
          // Never called the room: the default direction wins by inertia.
          // No summit means no Priya tally either — the story just goes quiet,
          // which is exactly what drifting into a default feels like.
          s.pivot_deferred = true;
          s.pivot_summit_done = true;
        },
      },

      // ── SOLO MODE: cards that unlock when Alex leaves ────────────────────────
      // Alex was the only one who could call a launch, drive product, and push
      // discovery. Without him, the founder inherits those jobs — slower, harder,
      // but still possible. Win chances are very slim.
      {
        id: 'founder_solo_launch', cat: 'p', from: 'You',
        body: "alex is gone. you're the one who has to decide when to ship now. nobody is going to tell you it's ready. it's not perfect — but it works.",
        urgency: 3, weeks: 1,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          return alex && !alex.active && s.has_demo && !s.launched;
        },
        options: [
          { label: 'Ship it', key: 'ship',
            execute(s, char, e) {
              s.launched = true;
              s.launch_week = s.week;
              s.signal = clamp(s.signal + 6, 0, 100);
              e.finishItemsAtLaunch();
              return "Launched solo. No fanfare. But it's live.";
            } },
          { label: 'One more week of polish', key: 'wait',
            execute(s) {
              return "Polished a few things. Still not launched.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'founder_solo_build', cat: 'p', from: 'You',
        body: "no co-founder to pair with, no one to review PRs. you're putting in double shifts to keep the product moving.",
        urgency: 2, weeks: 2,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          return alex && !alex.active && s.week >= (s.solo_build_last || 0) + 6;
        },
        options: [
          { label: 'Put in the hours', key: 'build',
            execute(s) {
              s.solo_build_last = s.week;
              s.market_fit = clamp(s.market_fit + 2, 0, 100);
              return "Two weeks of solo heads-down. Much slower without Alex — things that used to take a day take a week. The product is barely moving.";
            } },
          { label: 'Do the minimum', key: 'min',
            execute(s) {
              s.solo_build_last = s.week;
              return "Kept things barely moving. Not much progress but nothing broke.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'founder_solo_discover', cat: 'c', from: 'You',
        body: "nobody's doing discovery anymore. you have to reach out yourself — message 3 people who've given up on dating apps and ask what would bring them back.",
        urgency: 1, weeks: 1,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          return alex && !alex.active && s.week >= (s.solo_discover_last || 0) + 6;
        },
        options: [
          { label: 'Do the calls', key: 'calls',
            execute(s) {
              s.solo_discover_last = s.week;
              s.signal = clamp(s.signal + 8, 0, 100);
              s.market_fit = clamp(s.market_fit + 5, 0, 100);
              return "Three calls done. One person asked if they could pay now. Signal is still there.";
            } },
          { label: 'Send a survey instead', key: 'survey',
            journal: "Sent a survey instead of doing calls. Lower signal but saves time.",
            execute(s) {
              s.solo_discover_last = s.week;
              s.signal = clamp(s.signal + 3, 0, 100);
              return "Survey sent. Lower signal than real calls but saves time.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },

      // ── RECURRING: solo growth fallback (post-launch, alex gone) ───────────────
      {
        id: 'founder_solo_growth', cat: 'e', from: 'You',
        body: "nobody's coming to you. post in two communities where single people actually talk, and follow up with people who signed up but went quiet.",
        urgency: 1, weeks: 1,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          return alex && !alex.active && s.launched && s.week >= (s.solo_growth_last || 0) + 2;
        },
        options: [
          { label: 'Do the outreach', key: 'outreach',
            journal: "Cold batch sent. 2 signups from people I messaged directly.",
            execute(s) {
              s.solo_growth_last = s.week;
              s.users += 2;
              s.signal = clamp(s.signal + 3, 0, 100);
              return "Cold batch sent. 2 signups from people you messaged directly.";
            } },
          { label: 'Post in one community', key: 'light',
            execute(s) {
              s.solo_growth_last = s.week;
              s.signal = clamp(s.signal + 2, 0, 100);
              return "Posted an update. Small ripple. Keeps the light on.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },

      // ── RECURRING: deep user research (post-launch) ──────────────────────────
      {
        id: 'founder_user_depth', cat: 'c', from: 'You',
        body: "you've been shipping for weeks but making decisions from support tickets. you don't actually know how your users experience dating on kindred — are they going on dates? are they happy with their matches?",
        urgency: 2, weeks: 1,
        available: (s) => s.launched && (s.users >= 5 || s.customers >= 2)
          && (s.user_depth_count || 0) < 2 && s.week >= (s.user_depth_last || 0) + 6,
        options: [
          { label: 'Five sessions — watch them use it', key: 'deep',
            execute(s) {
              s.user_depth_last = s.week;
              s.user_depth_count = (s.user_depth_count || 0) + 1;
              s.market_fit = clamp(s.market_fit + 8, 0, 100);
              s.signal = clamp(s.signal + 6, 0, 100);
              if (s.user_depth_count === 1)
                return "Five sessions done. Two users showed you patterns you didn't expect — they message matches in bursts, then go silent for days. You found why 30% churn in week 2 and fixed it immediately.";
              return "Five sessions done. Same burst-then-silence pattern, but this time you found where drop-off happens later in the conversation — users who don't get a reply within 48 hours almost never come back. Adjusted the nudge timing.";
            } },
          { label: 'Send a structured survey', key: 'survey',
            journal: "Sent a structured survey. 60% response rate. Useful signal, but nothing I didn't already suspect.",
            execute(s) {
              s.user_depth_last = s.week;
              s.user_depth_count = (s.user_depth_count || 0) + 1;
              s.market_fit = clamp(s.market_fit + 5, 0, 100);
              s.signal = clamp(s.signal + 3, 0, 100);
              return "Survey sent. 60% response rate. Useful signal, but nothing you didn't already suspect.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      // ── DO THINGS THAT DON'T SCALE (PG): hand-make the early magic ───────────
      {
        id: 'dont_scale_seed', cat: 'c', from: 'You',
        body: "the app is live but the early matches are thin — a real chicken-and-egg. paul graham's voice in your head: do things that don't scale. you could manufacture the magic for the first users by hand, just to get the flywheel turning.",
        urgency: 1, weeks: 1,
        available: (s) => s.launched && !s.dont_scale_done && s.users >= 3 && !s.pivot_shipped,
        options: [
          { label: 'Hand-match the first users yourself', key: 'concierge',
            journal: "Spent the week as a one-person matching engine — read every new profile, made introductions by hand, texted people when someone good showed up. Doesn't scale even slightly. Two of them went on dates this weekend. Worth every hour.",
            execute(s) {
              s.dont_scale_done = true;
              s.market_fit = clamp(s.market_fit + 8, 0, 100);
              s.signal = clamp(s.signal + 4, 0, 100);
              // Hand-picking your happiest early user jump-starts the testimonial chain.
              if (s.customers === 0 && !s.reference_customer) {
                s.reference_customer = true;
                s.reference_customer_week = s.week;
              }
              return "Became the matching engine for a week — introductions by hand, nudges by text. Two first dates out of it, and one user who now thinks you hung the moon. It doesn't scale. It doesn't have to yet.";
            } },
          { label: 'Host a singles night — make the first match in the room', key: 'mixer',
            journal: "Threw a small singles night for early users — manufactured the first real match in person. Doesn't scale, but I walked away with a story I can actually sell and a room full of believers.",
            execute(s) {
              s.dont_scale_done = true;
              s.cash = clamp(s.cash - 300, 0, 9999999);
              s.users += 5;
              s.signal = clamp(s.signal + 8, 0, 100);
              s.market_fit = clamp(s.market_fit + 4, 0, 100);
              if (s.customers === 0 && !s.reference_customer) {
                s.reference_customer = true;
                s.reference_customer_week = s.week;
              }
              return "Twelve early users in a room, two drinks in, one introduction that actually clicked. $300 on snacks and a story you can tell every investor for the next year. Five of them invited friends on the spot.";
            } },
          { label: 'Let the algorithm do its thing', key: 'wait',
            journal: "Decided not to put my thumb on the scale — let the matching run on its own. Cleaner, more honest. Also colder: the cold-start stayed cold.",
            execute(s) {
              s.dont_scale_done = true;
              return "Stayed hands-off and let the system run. Fewer awkward DMs from the founder — and a lot fewer matches. The cold-start stayed cold.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s) { s.dont_scale_done = true; },
      },

      // ── CHAIN: reference selling → testimonial → website social proof ────────
      {
        id: 'first_customer_offer', cat: 'c', from: 'You',
        body: "free users show up every day but nobody's paying. one person has been swiping through profiles every single day for two weeks. time to convert the first subscriber.",
        urgency: 3, weeks: 1,
        available: (s) => s.launched && s.users >= 3 && s.customers === 0 && !s.first_customer_offered,
        options: [
          { label: 'Offer free access for a testimonial', key: 'reference',
            execute(s) {
              s.first_customer_offered = true;
              s.reference_customer = true;
              s.reference_customer_week = s.week;
              s.signal = clamp(s.signal + 8, 0, 100);
              return "Offered 3 months free in exchange for a public testimonial. They said yes immediately. First reference customer locked in.";
            } },
          { label: 'Pitch them at $49/month', key: 'pitch',
            journal: "Pitched them at $49/month. They converted. First paying subscriber. Not much, but it's real.",
            execute(s) {
              s.first_customer_offered = true;
              s.users = Math.max(0, s.users - 1);
              s.customers += 1;
              s.signal = clamp(s.signal + 5, 0, 100);
              return "Made the ask. They converted. First paying subscriber. $49/month — not much, but it's real.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'reference_checkin', cat: 'c', from: 'You',
        body: "your reference user has been on kindred for 3 weeks. they've been on two dates. time to collect that story while the experience is fresh.",
        urgency: 2, weeks: 1,
        available: (s) => s.reference_customer && !s.testimonial && s.week >= (s.reference_customer_week || 0) + 3,
        options: [
          { label: 'Schedule a call, get the full story', key: 'call',
            execute(s) {
              s.testimonial = true;
              s.market_fit = clamp(s.market_fit + 3, 0, 100);
              s.signal = clamp(s.signal + 6, 0, 100);
              return "One hour call. They walked you through what actually leads to a date on kindred — two patterns you hadn't designed around. And a quote you can use anywhere.";
            } },
          { label: 'Ask over email', key: 'email',
            journal: "Asked the reference customer for a testimonial over email. Short paragraph back — honest and usable.",
            execute(s) {
              s.testimonial = true;
              s.signal = clamp(s.signal + 3, 0, 100);
              return "They sent a short paragraph. Honest and usable. Not as rich as a call, but it's real.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'website_social_proof', cat: 'p', from: 'You',
        body: "your website still leads with features and a tagline. you now have a real story — someone who went on their first date in years because of kindred. features tell, stories sell.",
        urgency: 2, weeks: 1,
        available: (s) => s.testimonial && !s.website_updated,
        options: [
          { label: 'Rewrite around the customer story', key: 'rebuild',
            execute(s) {
              s.website_updated = true;
              s.signal = clamp(s.signal + 10, 0, 100);
              return "Website rebuilt. Hero section is now the customer quote. Features moved to a second page. Conversion on the signup form jumped immediately.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },

      // ── ONE-TIME: pricing experiment (post-launch) ──────────────────────────
      {
        id: 'founder_pricing_experiment', cat: 'c', from: 'You',
        body: "free users open the app every day, swipe, and match — but haven't upgraded. the product clearly works. nobody's been asked to pay. time to test.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.launched && s.users >= 10 && s.customers >= 1 && !char.flags.pricing_exp_done && s.week >= (s.pricing_exp_last || 0) + 4,
        options: [
          { label: 'Add a timed upgrade prompt', key: 'prompt',
            execute(s, char) {
              char.flags.pricing_exp_done = true;
              const converted = Math.min(4, Math.max(1, Math.floor(s.users * 0.1)));
              s.users = clamp(s.users - converted, 0, 9999);
              s.customers += converted;
              s.signal = clamp(s.signal - 2, 0, 100);
              return `Prompt added. ${converted} free user${converted !== 1 ? 's' : ''} upgraded this week. A few complained about the nag. Worth it.`;
            } },
          { label: 'Cap the free tier at 3 seats', key: 'cap',
            execute(s, char) {
              char.flags.pricing_exp_done = true;
              const converted = Math.min(5, Math.max(1, Math.floor(s.users * 0.15)));
              const churned = Math.min(4, Math.max(0, Math.floor(s.users * 0.08)));
              s.users = clamp(s.users - converted - churned, 0, 9999);
              s.customers += converted;
              s.signal = clamp(s.signal - 5, 0, 100);
              return `Seat cap live. ${converted} upgraded, ${churned} left when the wall went up. More revenue, fewer free users.`;
            } },
          { label: 'Hold — grow the free tier first', key: 'hold',
            journal: "Held off on pricing. Free users keep coming. The conversion problem isn't going anywhere.",
            execute(s) {
              s.pricing_exp_last = s.week;
              s.users += 5;
              return "Held off. Free users keep coming. The conversion problem isn't going anywhere.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },

      // ── FALLBACK: safety valve — only surfaces when no other cards are available ──
      {
        id: 'founder_reflect', cat: 'e', from: 'You', fallback: true,
        body: (s) => {
          if (s.cash < 3000) return "runway is nearly gone. whatever you focus on this sprint, it has to matter.";
          if (s.cash < 7000) return "a quieter stretch — but the runway is shrinking. no fires right now, but don't mistake that for safety.";
          const quietVariants = [
            "a quiet stretch. no fires, no urgent asks. a rare chance to get ahead instead of staying afloat.",
            "no crises this week. good moment to look at match-to-date conversion — the number most dating app founders ignore until it's too late.",
            "things are quiet. worth a sprint looking at what your most active users actually do in the app — not what they say they want.",
          ];
          return quietVariants[Math.floor(s.week / 4) % quietVariants.length];
        },
        urgency: 1, weeks: 1,
        available: () => true,
        options: [
          { label: 'Review your positioning', key: 'review',
            execute(s, char) {
              s.signal = clamp(s.signal + 2, 0, 100);
              const n = (char.flags.reflect_count = (char.flags.reflect_count || 0) + 1);
              const msgs = [
                "Spent time thinking about the pitch. Small refinements. Nothing dramatic.",
                "Wrote out the 'why now' for Kindred again. Tighter than before, but still not crisp enough for a cold email.",
                "Mapped out how we talk about the problem. Some clarity — nothing that changes the strategy.",
                "Refined the one-liner. Closer, but still not the version that makes someone lean in.",
                "Ran through the positioning again. A few word changes, one sharper framing. Progress.",
                "Wrote down the three objections we always get. No good answers yet — but naming them is a start.",
                "Spent an hour on the competitive landscape. We're not as unique as I thought, but the distribution angle still holds.",
                "Revisited the target persona. Still feels right. The ICP is narrow but it's real.",
              ];
              return msgs[(n - 1) % msgs.length];
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.founder = def;
})();
