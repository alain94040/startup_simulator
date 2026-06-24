(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'founder', name: 'You', type: 'founder',

    slice: [
      "founder_landing",
      "founder_first_interviews",
      "equity_signing",
      "founder_meetup",
      "founder_codebuild",
      "founder_build_onboarding",
      "founder_build_empty_states",
      "founder_build_export",
      "founder_build_demo_account",
      "founder_solo_launch",
      "founder_solo_build",
      "founder_solo_discover",
      "founder_solo_growth",
      "founder_user_depth",
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
      { key: "firstcust", cls: "blue", label: "First Customer", test: (s) => s.customers >= 1 },
      { key: "marcus", cls: "blue", label: "Lead Investor", test: (s) => !!s.marcusCommitted },
      { key: "funded", cls: "red", label: "Round Closed", test: (s) => !!s.followerCommitted },
      { key: "yc", cls: "red", label: "YC Accepted", test: (s) => !!s.ycAccepted },
    ],
    voice: {
      "equity_signing|sign": "We signed the founder agreement. The split's locked in. Nobody set up vesting schedules — it felt unnecessary between friends. I hope that's not something I regret.",
      "founder_landing|build": "Registered the domain and put up a simple landing page — $200 for the domain, hosting, and Carrd. Already got twelve 'signups'… all crypto spam. Still, we exist online now.",
      "founder_first_interviews|interview": "Blocked off the week for five customer interviews. Two insights I didn't expect, and one person said they'd pay right now if it existed. The picture's much clearer.",
      "founder_meetup|go": "Went to the founder meetup. Good crowd. Long talk with Priya — she launched a consumer app years ago, has strong opinions on retention, and seemed genuinely curious about what we're building.",
      "founder_reflect|review": "Quiet week. Sharpened the pitch — small refinements, nothing dramatic. Sometimes that's the work.",
      "founder_codebuild|demos": "Ran 3 demos instead of pairing with Alex. 3 people signed up for early access.",
      "founder_build_onboarding|build": "Built the onboarding end-to-end myself. Took longer than expected — not my strongest skill — but it shipped.",
      "founder_build_onboarding|pass": "Handed the onboarding spec to Alex. He'll fit it in — but his queue just got longer.",
      "founder_build_empty_states|build": "Added helpful empty states to every screen. Small fix, big impact.",
      "founder_build_empty_states|pass": "Added empty states to the backlog. It'll stay there a while.",
      "founder_build_export|build": "Photo verification shipped. All four users who asked about it upgraded.",
      "founder_build_export|pass": "Asked Alex to prioritize photo verification. He'll ship it — but two weeks later, two of the four users had moved on.",
      "founder_build_demo_account|build": "Seeded the demo account with realistic profiles. Next investor call, they asked 'can I sign up?' instead of 'how does this work?'",
      "founder_build_demo_account|pass": "Kept winging investor demos. Lost two calls to confusion.",
      "founder_solo_launch|ship": "Launched solo. No fanfare. But it's live.",
      "founder_solo_launch|wait": "Polished a few things. Still not launched.",
      "founder_solo_build|build": "Two weeks of solo heads-down. Much slower without Alex — things that took a day take a week now.",
      "founder_solo_build|min": "Kept things barely moving. Not much progress but nothing broke.",
      "founder_solo_discover|calls": "Three calls done on my own. One person asked if they could pay now. Signal is still there.",
      "founder_solo_discover|survey": "Sent a survey instead of doing calls. Lower signal but saves time.",
      "founder_solo_growth|outreach": "Cold batch sent. 2 signups from people I messaged directly.",
      "founder_solo_growth|light": "Posted an update in one community. Small ripple. Keeps the light on.",
      "founder_user_depth|deep": "Five user sessions done. Found patterns I didn't expect.",
      "founder_user_depth|survey": "Sent a structured survey. 60% response rate. Useful signal, but nothing I didn't already suspect.",
      "first_customer_offer|reference": "Offered 3 months free for a testimonial. They said yes immediately. First reference customer locked in.",
      "first_customer_offer|pitch": "Pitched them at $49/month. They converted. First paying subscriber. Not much, but it's real.",
      "reference_checkin|call": "One hour call with the reference customer. They've been on two dates from kindred. Got a quote I can use anywhere.",
      "reference_checkin|email": "Asked the reference customer for a testimonial over email. Short paragraph back — honest and usable.",
      "website_social_proof|rebuild": "Rebuilt the website around the customer story. Hero section is now the customer quote. Conversion jumped immediately.",
      "founder_pricing_experiment|prompt": "Added an upgrade prompt. A few users complained about the nag — but some converted. Worth it.",
      "founder_pricing_experiment|cap": "Capped the free tier at 3 seats. More revenue, fewer free users.",
      "founder_pricing_experiment|hold": "Held off on pricing. Free users keep coming. The conversion problem isn't going anywhere."
    },
    cards: [
      {
        id: 'founder_landing', cat: 'p', from: 'You',
        body: "you keep telling people you're building a dating app for people sick of swiping — but you have nowhere to point them. no domain, no landing page, no email capture.",
        urgency: 2, weeks: 1,
        available: (s) => s.week <= 5 && !s.has_landing_page,
        options: [
          { label: 'Register the domain + set up a landing page — $200', key: 'build',
            execute(s) { s.has_landing_page = true; s.cash = clamp(s.cash - 200, 0, 9999999); s.signal = clamp(s.signal + 8, 0, 100); return "Domain registered. Simple landing page live. $200 out for domain, annual hosting, and a Carrd subscription. Already have 12 email signups from people! wait actually these are just spammers pushing some crypto scam."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'founder_first_interviews', cat: 'c', from: 'You',
        body: "you've been building without a single structured conversation with someone who's used dating apps and given up. everything you think you know about what they want is a guess.",
        urgency: 2, weeks: 1,
        available: (s, char) => !s.launched && !char.flags.interviews_done && s.week <= 8,
        options: [
          { label: 'Block off this week for 5 customer interviews', key: 'interview',
            execute(s, char) { char.flags.interviews_done = true; s.signal = clamp(s.signal + 15, 0, 100); s.market_fit = clamp(s.market_fit + 12, 0, 100); s.waitlist += 1; return "5 calls done. Two insights you didn't expect. One person said they'd pay right now if it existed. Signal much clearer."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },

      // ── EQUITY SIGNING: surfaces after the counter-offer arc resolves ──────
      {
        id: 'equity_signing', cat: 'e', from: 'You',
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
            execute(s, char, e) {
              s.jordan_equity = true;
              s.jordan_cleanup_needed = true;
              const jordan = e.chars.get('jordan');
              const split = (jordan && jordan.flags.equity_proposal) || '40/40/20';
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
                return researched
                  ? "Paired with Alex on the matching engine — the core of Kindred. Everything from the user interviews went straight into the ranking. Slow going, but it's ours and it's getting smarter."
                  : "Paired with Alex on the matching engine — the core of Kindred. It's ours and improving, but without real user signal you're both half-guessing at what 'a good match' even means.";
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

      // ── ONE-TIME: specific pre-launch dev tasks ──────────────────────────────
      {
        id: 'founder_build_onboarding', cat: 'p', from: 'You',
        body: "you mapped onboarding based on where testers get stuck — most drop off during profile setup. it's a 3-step wizard, within your abilities to build. alex is maxed on the matching algorithm.",
        urgency: 2, weeks: 1,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          return !s.launched && s.has_demo && !char.flags.onboarding_built && alex && alex.active;
        },
        options: [
          { label: 'Build it yourself', key: 'build',
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
        body: "new users hit empty screens on their first session — an empty matches tab, an empty inbox — and assume the app is broken. two hours of work.",
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
                ? "Added helpful empty states to every screen. Small fix, big impact — testers stopped asking 'is the app broken?'"
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
        body: "four testers have messaged asking about photo verification. they're hesitant to upgrade without knowing their matches are real. a few days of work.",
        urgency: 2, weeks: 1,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          return !s.launched && s.has_demo && (s.users >= 3 || s.customers >= 1) && !char.flags.export_built && alex && alex.active;
        },
        options: [
          { label: 'Build photo verification yourself', key: 'build',
            execute(s, char) {
              char.flags.export_built = true;
              s.market_fit = clamp(s.market_fit + 6, 0, 100);
              return "Photo verification shipped. All four users upgraded. One said it was the only thing holding them back.";
            } },
          { label: 'Ask Alex to prioritize it', key: 'pass',
            execute(s, char, e) {
              char.flags.export_built = true;
              const alex = e.chars.get('alex');
              if (alex) alex.morale = clamp(alex.morale - 3, 0, 100);
              return "Alex added it to his sprint. Shipped two weeks later. Two of the four users had moved on.";
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
            execute(s) { s.signal = clamp(s.signal + 2, 0, 100); return "Spent time thinking about the pitch. Small refinements. Nothing dramatic."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.founder = def;
})();
