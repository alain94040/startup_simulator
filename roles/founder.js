(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'founder', name: 'You', type: 'founder',
    cards: [
      {
        id: 'founder_landing', cat: 'p', from: 'You',
        body: "you've been talking about this for two weeks but there's nowhere to point people. no domain, no landing page, no email capture. it's making conversations awkward.",
        urgency: 2, weeks: 1,
        available: (s) => s.week <= 5 && !s.has_landing_page,
        options: [
          { label: 'Register the domain + set up a landing page', key: 'build',
            execute(s) { s.has_landing_page = true; s.signal = clamp(s.signal + 8, 0, 100); return "Domain registered. Simple landing page live. Already have 12 email signups from people you talked to this week."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'founder_first_interviews', cat: 'c', from: 'You',
        body: "you've been building for two weeks and haven't had a single structured conversation with a real potential customer. everything you're building is a guess.",
        urgency: 2, weeks: 1,
        available: (s, char) => !s.launched && !char.flags.interviews_done && s.week <= 8,
        options: [
          { label: 'Block off this week for 5 customer interviews', key: 'interview',
            execute(s, char) { char.flags.interviews_done = true; s.signal = clamp(s.signal + 15, 0, 100); s.market_fit = clamp(s.market_fit + 12, 0, 100); s.users += 5; return "5 calls done. Two insights you didn't expect. One interviewee asked if they could pay you now. Signal much clearer."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },

      // ── RECURRING: founder pairs with Alex ──────────────────────────────────
      {
        id: 'founder_codebuild', cat: 'p', from: 'You',
        body: "alex has been heads-down for two weeks but the feature queue isn't shrinking. you can code. take this sprint and build alongside him instead of managing from the sidelines.",
        urgency: 2, weeks: 1,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          return alex && alex.active && alex.focus === 'build' && s.product < 70
            && s.week >= (s.cobuild_last || 0) + 4;
        },
        options: [
          { label: 'Pair up this sprint', key: 'pair',
            execute(s, char, e) {
              s.cobuild_last = s.week;
              const alex = e.chars.get('alex');
              s.product = clamp(s.product + 7, 0, 100);
              if (alex) alex.morale = clamp(alex.morale + 8, 0, 100);
              return "Paired up. You took the front-end, Alex handled the data layer. Shipped more in one week than the previous three combined.";
            } },
          { label: 'Run demos instead', key: 'demos',
            execute(s, char, e) {
              s.cobuild_last = s.week;
              s.users += 3;
              s.signal = clamp(s.signal + 4, 0, 100);
              return "Ran 3 demos instead. 3 people signed up for early access. Alex kept building solo.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },

      // ── ONE-TIME: specific pre-launch dev tasks ──────────────────────────────
      {
        id: 'founder_build_onboarding', cat: 'p', from: 'You',
        body: "you mapped the onboarding flow based on where beta users keep getting stuck. it's a 3-step wizard — within your abilities to build. alex is maxed out on the backend.",
        urgency: 2, weeks: 1,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          return !s.launched && s.product >= 25 && !char.flags.onboarding_built && alex && alex.active;
        },
        options: [
          { label: 'Build it yourself', key: 'build',
            execute(s, char, e) {
              char.flags.onboarding_built = true;
              s.product = clamp(s.product + 8, 0, 100);
              s.market_fit = clamp(s.market_fit + 5, 0, 100);
              return "Built the onboarding end-to-end. First-time completion jumped. Alex could stay heads-down on the backend.";
            } },
          { label: 'Hand the spec to Alex', key: 'pass',
            execute(s, char, e) {
              char.flags.onboarding_built = true;
              const alex = e.chars.get('alex');
              s.product = clamp(s.product + 4, 0, 100);
              if (alex) alex.morale = clamp(alex.morale - 3, 0, 100);
              return "Gave Alex the spec. He'll fit it in — but his queue just got longer.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'founder_build_empty_states', cat: 'p', from: 'You',
        body: "every screen in the product shows a blank white box when there's no data. two hours of work. new users are hitting these on their first session and assuming something is broken.",
        urgency: 2, weeks: 1,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          return !s.launched && s.product >= 35 && !char.flags.empty_states_built && alex && alex.active;
        },
        options: [
          { label: 'Fix the empty states yourself', key: 'build',
            execute(s, char) {
              char.flags.empty_states_built = true;
              s.product = clamp(s.product + 5, 0, 100);
              s.market_fit = clamp(s.market_fit + 4, 0, 100);
              return "Added empty states with clear CTAs to every screen. Beta users stopped asking 'is something wrong?'";
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
        body: "three beta users asked for CSV export this week. they have reporting requirements — without it they can't fully adopt the product. a few hours of work on your end.",
        urgency: 2, weeks: 1,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          return !s.launched && s.product >= 40 && (s.users >= 3 || s.customers >= 1) && !char.flags.export_built && alex && alex.active;
        },
        options: [
          { label: 'Build the export yourself', key: 'build',
            execute(s, char) {
              char.flags.export_built = true;
              s.product = clamp(s.product + 6, 0, 100);
              s.market_fit = clamp(s.market_fit + 6, 0, 100);
              return "CSV export shipped. All three users converted to active. One said it was the last thing blocking them.";
            } },
          { label: 'Ask Alex to prioritize it', key: 'pass',
            execute(s, char, e) {
              char.flags.export_built = true;
              const alex = e.chars.get('alex');
              s.product = clamp(s.product + 3, 0, 100);
              if (alex) alex.morale = clamp(alex.morale - 3, 0, 100);
              return "Alex added it to his sprint. Shipped two weeks later. Two of the three users had moved on.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'founder_build_demo_account', cat: 'p', from: 'You',
        body: "every investor demo and sales call starts with a blank slate. you're spending 5 minutes of every meeting saying 'pretend this has data in it.' build a seeded demo account.",
        urgency: 1, weeks: 1,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          return !s.launched && s.product >= 50 && !char.flags.demo_account_built && alex && alex.active;
        },
        options: [
          { label: 'Build the demo environment', key: 'build',
            execute(s, char) {
              char.flags.demo_account_built = true;
              s.signal = clamp(s.signal + 6, 0, 100);
              s.investor_warmth = clamp(s.investor_warmth + 8, 0, 100);
              return "Demo account seeded with realistic data. Next investor call, they asked 'can I sign up?' instead of 'how does this work?'";
            } },
          { label: 'Keep winging it', key: 'pass',
            execute(s, char) {
              char.flags.demo_account_built = true;
              return "Kept winging it. Lost two investor calls to confusion in the demo.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
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
          return alex && !alex.active && s.product >= 45 && !s.launched;
        },
        options: [
          { label: 'Ship it', key: 'ship',
            execute(s) {
              s.launched = true;
              s.signal = clamp(s.signal + 6, 0, 100);
              return "Launched solo. No fanfare. But it's live.";
            } },
          { label: 'One more week of polish', key: 'wait',
            execute(s) {
              s.product = clamp(s.product + 4, 0, 100);
              return "Polished a few more things. Still not launched.";
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
          return alex && !alex.active && s.product < 100 && s.week >= (s.solo_build_last || 0) + 3;
        },
        options: [
          { label: 'Put in the hours', key: 'build',
            execute(s) {
              s.solo_build_last = s.week;
              s.product = clamp(s.product + 5, 0, 100);
              return "Two weeks of solo heads-down. Slower without Alex but the product is moving.";
            } },
          { label: 'Do the minimum', key: 'min',
            execute(s) {
              s.solo_build_last = s.week;
              s.product = clamp(s.product + 2, 0, 100);
              return "Kept things barely moving. Not much progress but nothing broke.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'founder_solo_discover', cat: 'c', from: 'You',
        body: "nobody's doing discovery anymore. you have to get out of the building yourself — reach out to 3 potential users this week.",
        urgency: 1, weeks: 1,
        available: (s, char, e) => {
          const alex = e.chars.get('alex');
          return alex && !alex.active && s.week >= (s.solo_discover_last || 0) + 3;
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
        body: "nobody's coming to you. write a cold email batch, post in two communities, and follow up with people who signed up but went quiet.",
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
        body: "you've been shipping and selling for weeks but you're making product decisions from support tickets. you don't actually know how your users work day to day. block a week.",
        urgency: 2, weeks: 1,
        available: (s) => s.launched && (s.users >= 5 || s.customers >= 2) && s.week >= (s.user_depth_last || 0) + 6,
        options: [
          { label: 'Five sessions — watch them use it', key: 'deep',
            execute(s) {
              s.user_depth_last = s.week;
              s.market_fit = clamp(s.market_fit + 8, 0, 100);
              s.signal = clamp(s.signal + 6, 0, 100);
              return "Five sessions done. Two users showed you workflows you didn't know existed. You found why 30% churn in week 2 — and fixed it immediately.";
            } },
          { label: 'Send a structured survey', key: 'survey',
            execute(s) {
              s.user_depth_last = s.week;
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
        body: "you have free users showing up every day but nobody's paying yet. one of them has been in the product daily for two weeks. time to try to close the first real customer.",
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
          { label: 'Pitch them at $50/month', key: 'pitch',
            execute(s) {
              s.first_customer_offered = true;
              s.users = Math.max(0, s.users - 1);
              s.customers += 1;
              s.signal = clamp(s.signal + 5, 0, 100);
              return "Made the ask. They converted. First paying customer. $50/month — not much, but it's real.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'reference_checkin', cat: 'c', from: 'You',
        body: "your reference customer has been live for 3 weeks. they're getting value — time to collect that testimonial while the experience is fresh.",
        urgency: 2, weeks: 1,
        available: (s) => s.reference_customer && !s.testimonial && s.week >= (s.reference_customer_week || 0) + 3,
        options: [
          { label: 'Schedule a call, get the full story', key: 'call',
            execute(s) {
              s.testimonial = true;
              s.market_fit = clamp(s.market_fit + 3, 0, 100);
              s.signal = clamp(s.signal + 6, 0, 100);
              return "One hour call. They walked you through how they actually use it — two workflows you hadn't designed for. And a quote you can use anywhere.";
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
        body: "your website still leads with features and a tagline. you now have a real customer story. features tell, stories sell — time to rebuild it.",
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
        body: "you have free users who open the app daily but haven't upgraded. the product is clearly useful — nobody's been asked to pay. time to test something.",
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

      // ── FALLBACK: always available, prevents card-pool empty state ─────────────
      {
        id: 'founder_reflect', cat: 'e', from: 'You',
        body: "a quiet stretch. no fires, no urgent asks. a rare chance to get ahead instead of staying afloat.",
        urgency: 1, weeks: 1,
        available: (s) => true,
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
