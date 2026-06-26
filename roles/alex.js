(function () {
  const rnd   = n => Math.floor(Math.random() * n);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ── Roadmap item helpers ──────────────────────────────────────────────────
  // The over-scoped (full/A) plan's extra work. These are inert "auto" items — no
  // cards; they build themselves over time via the engine's build burn-down, doubling
  // time-to-product-ready. (They replace the old per-sprint decision cards.)
  const SCOPE_ITEMS = ['scope_social', 'scope_verification', 'scope_premium', 'scope_socialgraph', 'scope_video'];

  function expandItems(s, plan) {
    if (!s.items) return;
    if (plan === 'full') {
      for (const k of SCOPE_ITEMS) s.items[k] = { status: 'todo', quality: null, assignee: null, auto: true };
    }
  }

  // True once every over-scope (auto) item is built or cleaned up — gates launch on the
  // full plan. Lean has no auto items, so this is always true there. Items marked
  // obsolete by the pivot still need cleanup time (the engine's passive build burn-down
  // handles them at the same rate as building new).
  function allScopeBuilt(s) {
    if (!s.items) return true;
    return Object.keys(s.items).every(k => !s.items[k].auto
      || s.items[k].status === 'done' || s.items[k].status === 'deferred');
  }

  function applyActivitiesPivot(s) {
    if (!s.items) return;
    // Cross out the items built for profile-based matching
    if (s.items.matching_algo) s.items.matching_algo.status = 'obsolete';
    if (s.items.ios_ui)        s.items.ios_ui.status        = 'obsolete';
    // Full-plan over-scope items are also superseded
    SCOPE_ITEMS.forEach(k => {
      if (s.items[k] && s.items[k].status === 'todo') s.items[k].status = 'obsolete';
    });
    // Licensing the core (Jordan's call) bites here: a black box can't be re-tuned for
    // the pivot — it has to be ripped out and rebuilt, costing extra cash and fit.
    if (s.matching_licensed && !s.matching_blackbox_ripped) {
      s.matching_blackbox_ripped = true;
      s.cash = clamp(s.cash - 1500, 0, 9999999);
      s.market_fit = clamp(s.market_fit - 10, 0, 100);
    }
    // Add plans-first replacements
    s.items.plans_matching = { status: 'active', quality: null, assignee: 'alex'   };
    s.items.plans_ui       = { status: 'todo',   quality: null, assignee: s.jordan_resolved ? null : 'jordan' };
  }

  const def = {
    id: 'alex', name: 'Alex', type: 'cofounder',

    slice: [
      "start_prototype",
      "incorporate_week1",
      "dev_planning_session",
      "alex_commitment",
      "early_name",
      "early_tech_stack",
      "early_customer_target",
      "early_funding_goal",
      "vision_mismatch",
      "jordan_equity_alex",
      "jordan_equity_counter_alex",
      "alex_side_project",
      "alex_side_project_escalation",
      "alex_quiet",
      "alex_equity",
      "alex_sync_discover",
      "alex_sync_build",
      "alex_sync_pitch",
      "alex_demo_ready",
      "auth_build_buy",
      "auth_buy_forced",
      "analytics_choice",
      "pivot_alex_pushback",
      "pivot_counter_alex",
      "bad_retention",
      "pivot_relaunch",
      "proto_to_product",
      "good_enough_launch",
      "alex_wants_rebuild",
      "arch_refactor_done",
      "alex_decision",
      "alex_leaving_threat",
      "incorporate_now",
      "ip_concern",
      "first_interview_shock",
      "cold_silence",
      "random_reframe",
      "pivot_insight_1",
      "pivot_insight_2",
      "pmf_lock",
      "family_doubt",
      "jordan_drift_start",
      "jordan_drag",
      "jordan_launch_blocker",
      "jordan_confrontation",
      "jordan_cap_table",
    ],

    role: "Co-founder · CTO",
    voice: {
      "start_prototype|build": "Told the team to start building today. Alex took profiles and matching, Jordan's on iOS, I'll cover everything else. We're shelving the activity-planning idea — it's really a second product. Core first.",
      "incorporate_week1|atlas": "Filed through Stripe Atlas. Delaware C-corp, EIN, bank account in two days. $500 gone, but we're a real company now.",
      "dev_planning_session|full": "We spec'd the whole thing — three hours, the whiteboard packed with twenty-plus items. Jordan's thrilled. Alex thinks it's too much, and part of me suspects he's right.",
      "dev_planning_session|lean": "Kept the plan tight: ninety minutes, five items, core hypothesis only. Alex looked relieved. We can spec the rest once we know what works.",
      "dev_planning_session|sprint": "Kept the plan tight: ninety minutes, five items, core hypothesis only. Alex looked relieved. We can spec the rest once we know what works.",
      "alex_commitment|accept": "Agreed Alex stays part-time for now — evenings and weekends. Slower, but he won't resent it. We set a milestone to revisit once we have traction.",
      "alex_commitment|push": "Pushed Alex to go full-time. He said yes, but I could tell he wasn't ready. I'll need to watch how he's doing.",
      "early_name|catchy": "Locked the name. Warm and memorable — people get what it's for the second they hear it.",
      "early_name|descriptive": "Locked the name. Clean and distinctive, hard to confuse with anything else. It grows on people once they try it.",
      "early_tech_stack|fast": "Decided to ship the fast version of the matching algorithm and fix scale later. The 10,000-user problem is a good problem to have.",
      "early_tech_stack|scalable": "Decided to build the matching engine to scale from the start. Slower, but a cleaner foundation — and Alex hates rewriting things.",
      "early_customer_target|individuals": "Settled on who we're for: 25–35, tired of swiping. Bigger pool, faster feedback.",
      "early_customer_target|teams": "Settled on relationship-seekers — people seriously looking. Higher willingness to pay, a stronger retention story.",
      "early_customer_target|open": "Decided to stay flexible on who we're for and let the first signups tell us who they are.",
      "early_funding_goal|vc": "We aligned on the VC path — raise, grow fast, aim big. Every investor conversation gets sharper now that we know what we're building toward.",
      "early_funding_goal|profitable": "We agreed to aim for profitable first — a real business, no VC required. Every product call gets cleaner when the bar is 'do people pay for this.'",
      "early_funding_goal|open": "Left the funding question open. We'll revisit once we have enough users to know what kind of company we actually are.",
      "vision_mismatch|alex": "Conceded the framing to Alex — we're 'casual dating done right.' Broader market, easier to explain. A few old 'serious matches' conversations are awkward now, but at least we're aligned.",
      "vision_mismatch|yours": "Held the line on serious relationships. Alex went along with it — he still thinks casual is bigger, but the investor story is cleaner. The tension isn't really gone.",
      "vision_mismatch|test": "Instead of arguing, I ran eight quick user calls. People who want serious relationships hate swiping apps, and vice versa — two real segments. We're leading with the relationship-seekers: they pay more and churn less.",
      "jordan_equity_alex|propose_33": "Proposed equal thirds — Jordan found the space and brought us together, Alex builds, I run it. We're all essential. Alex went quiet; he expected more for being all-in.",
      "jordan_equity_alex|propose_40": "Proposed 40/40/20 — Alex and I are all in, Jordan's still at her job. Alex was happy. Jordan hasn't heard yet.",
      "jordan_equity_alex|propose_50": "Took 50 for myself, 25 each for Alex and Jordan. Alex went quiet for a moment, then said okay. I'll be hearing from both of them.",
      "jordan_equity_counter_alex|cave_40": "Alex pushed back, and he had a point — he's full-time, Jordan isn't. Moved to 40/40/20. He appreciated it.",
      "jordan_equity_counter_alex|hold_33": "Alex pushed for more, but I held equal thirds. Everyone's essential. He didn't agree — but he dropped it.",
      "alex_side_project|pause": "Appreciated the honesty. Asked him to pause the side project until we hit a milestone. He agreed — relationship's stronger for it.",
      "alex_side_project_escalation|talk": "Had a hard conversation. Alex committed fully — said he was relieved I brought it up directly.",
      "alex_quiet|checkin": "Noticed Alex had gone quiet. Checked in. Honest conversation — he's exhausted. Adjusted expectations for the week.",
      "alex_equity|fair": "Revised the equity split. Both sides signed. Relationship's back on solid ground.",
      "alex_equity|hard": "Pushed back hard on the equity ask. Alex accepted for now but he's not happy — this is coming back.",
      "alex_equity|defer": "Kicked the equity discussion down the road. Alex grudgingly agreed, but the tension's building.",
      "alex_sync_discover|discover": "Agreed to shift Alex to customer discovery this sprint. Time to talk to real people again.",
      "alex_sync_build|build": "Alex back to building. Enough feedback for now — time to act on what we learned.",
      "alex_sync_pitch|pitch": "Alex is working the investor pipeline. Traction story is solid enough to pitch.",
      "alex_demo_ready|rough": "Showed the demo rough. Three contacts in the room — two hit bugs, but one leaned forward: 'Show me that again.' We know what to build next.",
      "alex_demo_ready|polish": "Spent a sprint polishing before showing anyone. Demo ran cleanly. Contacts were impressed — but one extra sprint of polish is one sprint of not hearing 'I'd pay for that.'",
      "auth_build_buy|buy": "Wired up a hosted auth provider — login, signup, password reset, social sign-in, all of it — in an afternoon. Costs us a bit each month, but it's a solved problem and now it's solved. Alex grumbled about the monthly fee.",
      "auth_build_buy|build": "Let Alex build our own auth. He's sure it's a few days of work — 'why pay monthly for something this basic.' We'll see.",
      "auth_buy_forced|buy": "Two weeks in, Alex was still fighting OAuth refresh tokens and password-reset edge cases. We bought the hosted provider in the end — same monthly fee we'd have paid on day one, plus two weeks of his time down the drain. Lesson logged.",
      "analytics_choice|buy": "Dropped in a real analytics SDK. Funnels, retention curves, event tracking — live in a day. Now we can actually see what users do instead of guessing. Small monthly cost, worth every cent.",
      "analytics_choice|build": "Decided to build our own analytics dashboard. Alex's plate is already full. We're flying half-blind until it's done.",
      "pivot_relaunch|ship": "Shipped the pivot. Different product under the same name. The first activity was created within an hour.",
      "pivot_alex_pushback|ship": "Sided with Alex — we ship what we have, add activities post-launch. Alex looked relieved. Jordan went quiet.",
      "pivot_alex_pushback|pivot": "Told Alex the signal is real — we should pivot. He went quiet. 'Okay. It's your call.' He doesn't agree.",
      "pivot_counter_alex|confirm": "Confirmed the pivot over Alex's objection. Three weeks, $2k. We're rebuilding around activities.",
      "pivot_counter_alex|reverse": "Changed my mind — shipping as planned. Alex seemed relieved.",
      "bad_retention|fix": "Retrofitted activity features post-launch. More expensive and disruptive than doing it pre-launch, but users who stayed are responding.",
      "bad_retention|calls": "Did 12 user calls this week. Every single one mentioned not knowing what to do after matching. The path forward is clear — just late.",
      "bad_retention|stay": "Decided the problem was matching quality, not the post-match experience. Users keep churning. I think Alex is right that this was the wrong call.",
      "proto_to_product|commit": "Keeping what worked from the demo, scrapping the rest. We know the core flow — now we build it properly.",
      "proto_to_product|delay": "Not ready to rebuild yet — still learning from the demo. Alex nods, but I can tell he wants to move on.",
      "good_enough_launch|ship": "Launched. First real users are in. Feedback starts flowing.",
      "good_enough_launch|wait": "Polished a few more things instead of launching. Alex thinks I'm stalling — and he might be right.",
      "alex_wants_rebuild|refactor": "Gave Alex two weeks to rebuild the API layer from scratch. Nothing else gets done — but if he's right, it'll save us months later.",
      "arch_refactor_done|review": "Walked through the new codebase with Alex. Clean separation, well-documented. He seemed proud of this one.",
      "alex_decision|ship": "Pulled off photo verification by Friday. User upgraded immediately. Set clear boundaries with Alex about making commitments without asking first.",
      "alex_leaving_threat|talk": "Long, honest conversation with Alex. He's staying. Things need to improve — but we're aligned now.",
      "incorporate_now|atlas": "Incorporated via Stripe Atlas. $500, Delaware C-corp, EIN, bank account. Feels official.",
      "ip_concern|lawyer": "Lawyer reviewed Alex's previous employer IP agreement. Personal time, unrelated enough — no claim. IP assignment signed. Clean. $1,500.",
      "first_interview_shock|pivot": "Pivoted focus to conversation quality and date-booking. Three more interviews confirmed it. Some earlier work won't carry over.",
      "first_interview_shock|stay": "Filed the customer insight away. Not ready to pivot on one data point.",
      "cold_silence|rewrite": "Rewrote the outreach. New version leads with the pain — 'you've matched with dozens of people and gone on zero dates.' First reply came in 4 hours.",
      "random_reframe|test": "Ran the 'vetting tool' framing by 3 more people. All 3 immediately got it. Updated the positioning.",
      "pivot_insight_1|pivot": "Rethought the approach. The real problem is conversation quality, not match quantity. Signal improved immediately.",
      "pivot_insight_1|stay": "Logged the feedback but staying the course for now. Alex isn't convinced either.",
      "pivot_insight_2|pivot": "Narrowed scope significantly. Less ambitious but far more right. Three users asked for exactly this.",
      "pivot_insight_2|stay": "Decided to ship the broader scope. Market fit isn't perfect but we're moving.",
      "pmf_lock|lock": "Locked in. Three users said the same thing unprompted this week: 'I actually went on a date because of this.' This is the product. Now build it right.",
      "family_doubt|talk": "Long talk with Alex about family pressure. Reminded each other why we're doing this. Morale reset.",
      "jordan_drift_start|talk": "Talked to Jordan directly about slowing down. She was apologetic, said it's temporary. I'm not sure.",
      "jordan_drift_start|cover": "Let Alex cover for Jordan. He nodded, but his backlog just got longer.",
      "jordan_drag|talk": "Sat down with Jordan. She heard the weight of it. Alex noticed I followed up.",
      "jordan_launch_blocker|web_only": "Launched web-only. A dating app without iOS is a real handicap — early retention will show it.",
      "jordan_launch_blocker|wait": "Gave Jordan two more weeks. Alex wasn't happy. The clock is running.",
      "jordan_launch_blocker|confront": "Decided to confront Jordan about the launch blocker. This conversation is overdue.",
      "jordan_confrontation|fire": "Hard conversation. Jordan wasn't surprised — she knew it wasn't working. She's off the team.",
      "jordan_confrontation|defer": "Gave Jordan one more sprint. Alex went quiet. We both know how this ends.",
      "jordan_cap_table|lawyer": "Hired a lawyer to clean up Jordan's equity. $2,000, buyback agreement signed. Cap table clean.",
      "jordan_cap_table|defer": "Can't afford cap table cleanup right now. Every investor who looks will ask about Jordan's stake."
    },
    skills: { build: 1.2, discover: 0.7, pitch: 0.5 },
    cards: [

      // ── WEEK 1 ONBOARDING (only 2 cards shown on week 1) ────────────────────
      {
        id: 'start_prototype', cat: 'p', from: 'Alex',
        body: "three of us in the same room for the first time since we decided to do this for real. time to stop talking. i'm ready on the backend. jordan's offered to take the iOS side. one word from you and this becomes real.",
        urgency: 13, weeks: 1,
        available: (s, char) => s.week === 1 && !char.flags.prototype_kicked,
        options: [
          { label: "Game on — everyone start building", key: 'build',
            reply: "let's do this. you take backend, jordan takes iOS. i'll handle everything else. game on.",
            execute(s, char, e) {
              char.flags.prototype_kicked = true;
              s.jordan_active = true;
              s.activities_cut = true;
              s.items = {
                matching_algo: { status: 'active', quality: null, assignee: 'alex'   },
                api_design:    { status: 'todo',   quality: null, assignee: 'alex'   },
                auth:          { status: 'todo',   quality: null, assignee: null     },
                ios_ui:        { status: 'active', quality: null, assignee: 'jordan' },
                ios_server:    { status: 'todo',   quality: null, assignee: 'jordan' },
              };
              const jordan = e.chars.get('jordan');
              if (jordan) jordan.flags.ios_update_done = true;
              return "Alex is on profiles and matching. Jordan's on the iOS build. Activity planning goes on the backlog — that's a second product. You're building the core first.";
            } },
        ],
        dropFx(s, char, e) {
          char.flags.prototype_kicked = true;
          s.jordan_active = true;
          s.activities_cut = true;
          s.items = {
            matching_algo: { status: 'active', quality: null, assignee: 'alex'   },
            api_design:    { status: 'todo',   quality: null, assignee: 'alex'   },
            auth:          { status: 'todo',   quality: null, assignee: null     },
            ios_ui:        { status: 'active', quality: null, assignee: 'jordan' },
            ios_server:    { status: 'todo',   quality: null, assignee: 'jordan' },
          };
          const jordan = e && e.chars && e.chars.get('jordan');
          if (jordan) jordan.flags.ios_update_done = true;
        },
      },
      {
        id: 'incorporate_week1', cat: 'e', from: 'Alex',
        body: "before we do anything else — all three of us need a legal entity. no bank account, no contracts, no equity split without one. Stripe Atlas is the fastest path: Delaware C-corp, EIN, bank account in two days.",
        urgency: 13, weeks: 1, ignoreForTrust: true,
        available: (s, char) => s.week <= 3 && char.flags.prototype_kicked && !s.incorporated,
        options: [
          { label: 'Incorporate via Stripe Atlas — $500', key: 'atlas',
            reply: "do it. stripe atlas, delaware c-corp. let's get this done today.",
            execute(s, char) { s.incorporated = true; s.cash = clamp(s.cash - 500, 0, 9999999); return "Delaware C-corp registered. EIN assigned, bank account open. $500 gone — you're officially a company."; } },
        ],
        dropDelay: 1, dropFrom: 'Alex',
        dropMsg: "we still don't have a legal entity. can't split equity or sign anything without one.",
        dropFx(s, char) { char.morale = clamp(char.morale - 4, 0, 100); },
      },

      // ── DEVELOPMENT PLANNING ────────────────────────────────────────────────
      {
        id: 'dev_planning_session', cat: 'p', from: 'Alex',
        body: "couldn't sleep — mocked up three directions for kindred. tap through them and take a real look before we lock scope. which one do we actually build?",
        urgency: 2, weeks: 2, patience: 4,
        available: (s, char) => char.flags.prototype_kicked && !char.flags.plan_done && s.week >= 2 && s.week <= 5,
        // Browser-only: Alex texts three phone mockups (iMessage-style photos the
        // player taps to view full-size). No cost/time labels — the player has to
        // judge scope from the screens themselves: the feature-loaded one (full) is
        // the runway-killer, the sparse one (lean) is the right call, the rough one
        // (sprint) is no plan at all. Headless play ignores this and uses the keys.
        mockups: {
          full:   { tag: 'A', variant: 'rich' },
          lean:   { tag: 'B', variant: 'minimal' },
          sprint: { tag: 'C', variant: 'generic' },
        },
        options: [
          { label: "Build version A", key: 'full',
            reply: "let's build A. activity layer, recommendations, all of it. i want us to know exactly what we're building before we go deeper.",
            execute(s, char) {
              char.flags.plan_done = true;
              s.dev_plan = 'full';
              expandItems(s, 'full');
              return "Three-hour session. Whiteboard filled. Twenty-plus items in the backlog. Jordan's excited. Alex is skeptical but admits it looks thorough.";
            } },
          { label: 'Build version B', key: 'lean',
            reply: "let's build B. core hypothesis only — ship and learn. we can spec the rest when we know what works.",
            execute(s, char) {
              char.flags.plan_done = true;
              s.dev_plan = 'lean';
              expandItems(s, 'lean');
              return "Ninety minutes. Five items on the board. Alex seemed relieved.";
            } },
          { label: 'Build version C', key: 'sprint',
            reply: "let's build C. strip it to the essentials and ship — we can layer the rest on once it's working.",
            execute(s, char) {
              char.flags.plan_done = true;
              // Hidden binary: C resolves to the same lean plan as B. The only real
              // decision here is avoiding A (the over-scoped build).
              s.dev_plan = 'lean';
              expandItems(s, 'lean');
              return "Ninety minutes. Five items on the board. Alex seemed relieved.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },

      // ── BUILD vs BUY: AUTH (commodity → buy is right) ────────────────────────
      // Hidden binary. Buying (+$30/wk) is correct; letting Alex build it is strictly
      // worse — he runs late, you buy anyway (same +$30/wk) AND lose ~2 weeks.
      {
        id: 'auth_build_buy', cat: 'p', from: 'Alex',
        body: "we need login, account creation, password reset, social sign-in. i can build our own auth — couple days, tops. why pay a monthly fee for something this basic? or we just wire up a hosted provider. your call.",
        // urgency 13: surfaces and gets answered early (alongside the commitment/vision
        // arc) so it doesn't linger in Alex's slot and floor the demo — that's what lets
        // part-time vs full-time Alex differ on demo timing again. Wide window so it lands.
        urgency: 13, weeks: 1,
        available: (s, char) => char.flags.plan_done && !char.flags.auth_resolved && !char.flags.auth_building
          && s.week >= 3 && s.week <= 14,
        options: [
          { label: 'Just buy a hosted auth provider', key: 'buy',
            reply: "let's not reinvent the wheel. wire up a hosted provider — auth is a solved problem. the monthly fee is worth it.",
            execute(s, char) {
              char.flags.auth_resolved = true;
              s.extra_burn += 30;
              s.saas.push({ label: "Auth provider", cost: 30 });
              if (s.items && s.items.auth) { s.items.auth.status = 'done'; s.items.auth.quality = 'bought'; s.items.auth.assignee = null; }
              return "Hosted auth wired up in an afternoon — login, signup, reset, social sign-in. $30/wk for it, but it's done and it's solid. Alex grumbled about the fee.";
            } },
          { label: 'Let Alex build it himself', key: 'build',
            reply: "ok — build it, if you're sure it's just a few days.",
            execute(s, char) {
              char.flags.auth_building = true;
              char.flags.auth_build_start = s.week;
              char.morale = clamp(char.morale + 4, 0, 100);
              if (s.items && s.items.auth) { s.items.auth.status = 'active'; s.items.auth.assignee = 'alex'; }
              return "Alex is building our own auth. He's sure it's a few days of work.";
            } },
        ],
        // If the founder doesn't say no, Alex optimistically starts building it.
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) {
          char.flags.auth_building = true;
          char.flags.auth_build_start = s.week;
          if (s.items && s.items.auth) { s.items.auth.status = 'active'; s.items.auth.assignee = 'alex'; }
        },
      },
      {
        id: 'auth_buy_forced', cat: 'p', from: 'Alex',
        body: "i'm behind. the auth thing is fighting me — oauth refresh tokens, password-reset edge cases, account recovery. it's eating the whole sprint. honestly... we should just buy it.",
        urgency: 12, weeks: 1,
        available: (s, char) => char.flags.auth_building && !char.flags.auth_resolved
          && s.week >= (char.flags.auth_build_start || 0) + 2,
        options: [
          { label: 'Tell him to buy it', key: 'buy',
            reply: "stop — buy the hosted provider. we should've done that two weeks ago. let's move on.",
            execute(s, char) {
              char.flags.auth_resolved = true;
              char.flags.auth_building = false;
              s.extra_burn += 30;
              s.saas.push({ label: "Auth provider", cost: 30 });
              char.buildEffort = Math.max(0, (char.buildEffort || 0) - 2.4);
              char.morale = clamp(char.morale - 4, 0, 100);
              if (s.items && s.items.auth) { s.items.auth.status = 'done'; s.items.auth.quality = 'bought'; s.items.auth.assignee = null; }
              return "Bought the hosted provider in the end — same $30/wk we'd have paid on day one, plus two weeks of Alex's time gone. The throwaway code got tossed.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) {
          char.flags.auth_resolved = true;
          char.flags.auth_building = false;
          s.extra_burn += 30;
          s.saas.push({ label: "Auth provider", cost: 30 });
          char.buildEffort = Math.max(0, (char.buildEffort || 0) - 2.4);
          char.morale = clamp(char.morale - 4, 0, 100);
          if (s.items && s.items.auth) { s.items.auth.status = 'done'; s.items.auth.quality = 'bought'; s.items.auth.assignee = null; }
        },
      },

      // ── BUILD vs BUY: ANALYTICS (commodity → buy is right; buying buys you sight) ─
      // Buying instrumentation surfaces the "users match, then go silent" drop-off
      // early — the pivot signal. Building it leaves you blind until it's too late.
      {
        id: 'analytics_choice', cat: 'p', from: 'Alex',
        body: "we're flying blind — no analytics. i can build us a proper dashboard, or we drop in an off-the-shelf SDK and have funnels and retention curves today. building it ourselves is more work but no monthly fee.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.has_demo && !s.launched && !char.flags.analytics_choice_done,
        options: [
          { label: 'Drop in an analytics SDK', key: 'buy',
            reply: "drop in the SDK. i want to see what users actually do, not guess. the monthly cost is nothing next to shipping blind.",
            execute(s, char) {
              char.flags.analytics_choice_done = true;
              s.analytics_live = true;
              s.extra_burn += 30;
              s.saas.push({ label: "Analytics SDK", cost: 30 });
              if (s.items && s.items.analytics) { s.items.analytics.status = 'done'; s.items.analytics.quality = 'bought'; s.items.analytics.assignee = null; }
              return "Analytics SDK live in a day — funnels, retention, event tracking. Now we can see what's actually happening instead of guessing.";
            } },
          { label: 'Build our own dashboard', key: 'build',
            reply: "build our own — no point paying monthly when you can do it yourself.",
            execute(s, char) {
              char.flags.analytics_choice_done = true;
              char.buildEffort = Math.max(0, (char.buildEffort || 0) - 2.0);
              if (s.items && s.items.analytics) { s.items.analytics.status = 'active'; s.items.analytics.assignee = 'alex'; }
              return "Alex started building an analytics dashboard. His plate was already full — and we're flying half-blind until it's done.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) {
          char.flags.analytics_choice_done = true;
          if (s.items && s.items.analytics) { s.items.analytics.status = 'active'; s.items.analytics.assignee = 'alex'; }
        },
      },

      // ── EARLY: RELATIONSHIP ──────────────────────────────────────────────────
      {
        id: 'alex_commitment', cat: 't', from: 'Alex',
        body: "i can't quit my job until we have real traction. evenings and weekends for now. should be enough to get to launch, right?",
        urgency: 13, weeks: 1,
        available: (s, char) => s.week >= 2 && s.week <= 5 && char.flags.plan_done && !char.flags.commitment_resolved,
        options: [
          { label: 'Agree — part-time for now', key: 'accept',
            reply: "that's fair. evenings and weekends works for now. let's set a milestone to revisit — once we hit traction, we talk again.",
            execute(s, char) { char.flags.commitment_resolved = true; s.signal = clamp(s.signal - 5, 0, 100); return "Alex stays part-time for now. Slower, but stable. Set a clear milestone to revisit."; } },
          { label: 'Push for full-time', key: 'push',
            reply: "i hear you but i need you all in. evenings and weekends won't cut it — we'll get outrun. can you make the jump now?",
            execute(s, char) { char.flags.commitment_resolved = true; char.flags.committed_fulltime = true; char.morale = clamp(char.morale - 10, 0, 100); char.trust = clamp(char.trust - 10, 0, 100); return "Alex agreed to go full-time. He said yes, but you could tell he wasn't ready. Watch his mood."; } },
        ],
        dropDelay: 3, dropFrom: 'Alex',
        dropMsg: "got a really good offer from a startup. i need to decide by friday. can we talk about where this is actually going?",
        dropCancel: (s, char) => char.flags.committed_fulltime || char.flags.offer_msg_sent,
        dropFx(s, char) { char.flags.offer_msg_sent = true; char.morale = clamp(char.morale - 14, 0, 100); s.alex_offer_week = s.week; },
      },
      // ── EQUITY (Alex's side — Jordan opened the topic in her thread) ─────────
      {
        id: 'jordan_equity_alex', cat: 't', from: 'Alex',
        body: "jordan wants equal thirds. i've been thinking — she's still at her job, i'm treating this as my main thing. you and i are doing the same amount. i think 40/40/20 is fair. what are you thinking?",
        urgency: 32, weeks: 1,
        available: (s, char, e) => {
          const jordan = e.chars.get('jordan');
          return jordan && jordan.flags.equity_mention_done && !jordan.flags.equity_proposal && s.week <= 8;
        },
        options: [
          { label: 'Equal thirds', key: 'propose_33',
            reply: "equal thirds. jordan found the space and brought us together. you're building. i'm running it. we're all essential.",
            execute(s, char, e) {
              const jordan = e.chars.get('jordan');
              if (jordan) jordan.flags.equity_proposal = '33/33/33';
              char.morale = clamp(char.morale - 8, 0, 100);
              return "Equal split. Alex went quiet — he expected more weight for his commitment.";
            } },
          { label: '40/40/20', key: 'propose_40',
            reply: "you're right. you and i are all in — jordan's still at her job. 40/40/20 until she goes full-time.",
            execute(s, char, e) {
              const jordan = e.chars.get('jordan');
              if (jordan) jordan.flags.equity_proposal = '40/40/20';
              char.morale = clamp(char.morale + 5, 0, 100);
              return "Alex: 'yeah — that's what I was thinking.' Jordan hasn't heard yet.";
            } },
          { label: '50/25/25', key: 'propose_50',
            reply: "i'm taking 50. this is my company — i found the idea, i'm the one not sleeping. 25 each for you and jordan.",
            execute(s, char, e) {
              const jordan = e.chars.get('jordan');
              if (jordan) jordan.flags.equity_proposal = '50/25/25';
              char.morale = clamp(char.morale - 3, 0, 100);
              return "Alex was quiet for a moment. 'Okay. I'll take 25 alongside Jordan.' You'll hear from both of them.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          const jordan = e && e.chars && e.chars.get('jordan');
          if (jordan) { jordan.flags.equity_proposal = '33/33/33'; jordan.flags.equity_skipped = true; }
          char.morale = clamp(char.morale - 10, 0, 100);
        },
      },
      // Alex counters if you picked equal thirds
      {
        id: 'jordan_equity_counter_alex', cat: 't', from: 'Alex',
        body: (s, char, e) => {
          const jordan = e.chars.get('jordan');
          return (jordan && jordan.flags.equity_skipped)
            ? "you never responded to jordan about equity. i've been thinking about it anyway — she's still at her job, i'm all-in. equal thirds means i get the same as someone who's not putting in the same."
            : "i've been thinking about the 33/33/33 thing. jordan's still at her job. i'm all-in. equal thirds means i get the same as someone who's not putting in the same. i think i should have at least equal to you.";
        },
        urgency: 22, weeks: 1,
        available: (s, char, e) => {
          const jordan = e.chars.get('jordan');
          return jordan && jordan.flags.equity_proposal === '33/33/33' && !jordan.flags.equity_counter_done && s.week <= 10;
        },
        options: [
          { label: "Give Alex 40%", key: 'cave_40',
            reply: "you're right. you're full-time, she's not. 40/40/20 — i'll tell jordan.",
            execute(s, char, e) {
              const jordan = e.chars.get('jordan');
              if (jordan) { jordan.flags.equity_counter_done = true; jordan.flags.equity_proposal = '40/40/20'; }
              char.morale = clamp(char.morale + 10, 0, 100);
              return "Alex appreciated it. Jordan will hear about the change.";
            } },
          { label: 'Keep equal thirds', key: 'hold_33',
            reply: "i hear you, but equal thirds is the right call. everyone's essential. let's not let this fester.",
            execute(s, char, e) {
              const jordan = e.chars.get('jordan');
              if (jordan) jordan.flags.equity_counter_done = true;
              char.morale = clamp(char.morale - 5, 0, 100);
              return "Alex accepted it. He didn't agree — but he dropped it.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          const jordan = e && e.chars && e.chars.get('jordan');
          if (jordan) jordan.flags.equity_counter_done = true;
          char.morale = clamp(char.morale - 8, 0, 100);
        },
      },

      {
        id: 'vision_mismatch', cat: 't', from: 'Alex',
        body: "i keep pitching this as 'casual dating done right.' you've been calling it 'serious relationships.' those are different products with different users. which are we actually building?",
        urgency: 13, weeks: 1,
        available: (s, char) => s.week >= 4 && s.week <= 10 && !s.has_demo && char.flags.commitment_resolved && !char.flags.vision_resolved,
        options: [
          { label: "Go with casual dating", key: 'alex',
            reply: "you're right, casual is the bigger market. let's go with your framing — 'casual dating done right.'",
            execute(s, char) { char.flags.vision_resolved = true; char.trust = clamp(char.trust + 8, 0, 100); char.morale = clamp(char.morale + 10, 0, 100); s.signal = clamp(s.signal - 4, 0, 100); return "Went with casual dating. Broader market, easier to explain. Some earlier conversations about 'serious matches' are now awkward, but at least you're aligned."; } },
          { label: 'Serious relationships', key: 'yours',
            reply: "i've been saying serious relationships because that's what we're building. the investor story is cleaner and the users pay more. i want to stay with that.",
            execute(s, char) { char.flags.vision_resolved = true; s.signal = clamp(s.signal + 8, 0, 100); char.morale = clamp(char.morale - 8, 0, 100); char.trust = clamp(char.trust - 4, 0, 100); return "Alex went along with it. He thinks the casual market is bigger, but the investor story is cleaner. Tension unresolved."; } },
          { label: 'Test it with users', key: 'test',
            reply: "we're both guessing. let me run a quick test this week — 8 calls with real users. let's find out which framing actually resonates before we commit.",
            execute(s, char) { char.flags.vision_resolved = true; s.signal = clamp(s.signal + 14, 0, 100); s.market_fit = clamp(s.market_fit + 8, 0, 100); char.morale = clamp(char.morale + 5, 0, 100); char.trust = clamp(char.trust + 6, 0, 100); return "Ran 8 quick calls. People who tried serious relationship apps hate swiping apps and vice versa — two real segments. Decided to lead with the relationship-seekers: they pay more and churn less."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "pitched it as a casual app again. someone in the audience asked me directly which it is. i didn't have a good answer. investors are going to notice.",
        dropFx(s, char) { char.flags.vision_resolved = true; s.signal = clamp(s.signal - 10, 0, 100); char.morale = clamp(char.morale - 10, 0, 100); },
      },
      {
        id: 'alex_side_project', cat: 't', from: 'Alex',
        body: "full disclosure — i've been putting 3 hours a day into a side project. didn't mention it earlier and i should have. i wanted you to hear it from me before it became a problem.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.week >= 3 && s.week <= 14 && char.morale > 50 && !char.flags.committed_fulltime && !char.flags.side_project_resolved && !char.flags.side_project_active,
        options: [
          { label: 'Ask him to pause it', key: 'pause',
            reply: "appreciate you telling me. can you pause it until we hit our first real milestone? i need to know you're fully here for this stretch.",
            execute(s, char) { char.flags.side_project_resolved = true; char.morale = clamp(char.morale + 5, 0, 100); char.trust = clamp(char.trust + 5, 0, 100); return "Honest conversation. Alex drops the side project until you hit a milestone. Relationship stronger for it."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.side_project_resolved = true; char.flags.side_project_active = true; char.morale = clamp(char.morale - 20, 0, 100); char.trust = clamp(char.trust - 10, 0, 100); },
      },
      {
        id: 'alex_side_project_escalation', cat: 't', from: 'Alex',
        body: "i know we talked about this, but i've been putting more in — probably 15 hours a week. i need to be honest about where my head is at.",
        urgency: 3, weeks: 1,
        available: (s, char) => char.flags.side_project_active && s.week <= 26,
        options: [
          { label: 'Tell him to commit', key: 'talk',
            reply: "alex, i need to be direct. 15 hours a week on something else means you're not here. i need you fully in or we need to have a different conversation.",
            execute(s, char) { char.flags.side_project_active = false; char.morale = clamp(char.morale + 22, 0, 100); char.trust = clamp(char.trust + 10, 0, 100); return "Hard conversation. Alex commits fully. He was relieved you brought it up directly."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          char.flags.side_project_active = false; // set immediately so card can't re-fire
          char.morale = clamp(char.morale - 30, 0, 100);
          char.trust  = clamp(char.trust  - 25, 0, 100);
          if (e && e.pending) e.pending.push({
            fireWeek: s.week + 3, from: 'Alex', charId: 'alex',
            text: "i've decided to pursue it seriously. i'll keep helping part-time but i think we both know i'm not fully in anymore.",
            fx() {},
            cancel: (st, ch) => !ch || !ch.active || !!ch.flags.departure_resolved,
          });
        },
      },
      {
        id: 'alex_quiet', cat: 't', from: 'Alex',
        body: "yeah. fine. just busy.",
        subtext: "Short replies for 3 days. Skipped standup yesterday.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.week > 4 && char.morale < 40 && s.week >= (char.flags.last_quiet || 0) + 4,
        options: [
          { label: 'Check in', key: 'checkin',
            reply: "hey — noticed you've been quiet. everything ok? no pressure, just checking in.",
            execute(s, char) { char.flags.last_quiet = s.week; char.morale = clamp(char.morale + 20, 0, 100); return "Had an honest conversation. Alex is exhausted. Adjusted expectations for the week."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          char.flags.last_quiet = s.week; // set immediately so cooldown blocks re-fire
          char.morale = clamp(char.morale - 14, 0, 100);
          char.trust  = clamp(char.trust  - 6,  0, 100);
          if (e && e.pending) e.pending.push({
            fireWeek: s.week + 2, from: 'Alex', charId: 'alex',
            text: "i need some space. working from home this week to figure some things out.",
            fx() {},
            cancel: (st, ch) => !ch || ch.morale >= 40,
          });
        },
      },
      {
        id: 'alex_equity', cat: 't', from: 'Alex',
        body: "third time this month. 'i'm not sure the current split reflects what i'm actually contributing.' getting harder to deflect.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.week >= 16 && char.morale < 55 && !char.flags.equity_resolved,
        options: [
          { label: 'Revise fairly', key: 'fair',
            execute(s, char) { char.flags.equity_resolved = true; char.morale = clamp(char.morale + 30, 0, 100); char.trust = clamp(char.trust + 15, 0, 100); return "Revised the split. Both sides signed. Relationship back on solid ground."; } },
          { label: 'Bargain hard', key: 'hard',
            execute(s, char) { char.morale = clamp(char.morale + 8, 0, 100); return "Pushed back hard. Alex accepted for now but isn't happy — expect this again."; } },
          { label: 'Defer it', key: 'defer',
            execute(s, char) { char.morale = clamp(char.morale - 8, 0, 100); char.trust = clamp(char.trust - 5, 0, 100); return "Kicked the can. Alex grudgingly agreed to wait, but this is coming back."; } },
        ],
        dropDelay: 1, dropFrom: 'Alex',
        dropMsg: "i've been talking to a lawyer. i want to revisit the founder agreement formally. this isn't going away.",
        dropFx(s, char) { char.morale = clamp(char.morale - 18, 0, 100); char.trust = clamp(char.trust - 12, 0, 100); },
      },

      // ── FOCUS ALIGNMENT ──────────────────────────────────────────────────────
      {
        id: 'alex_sync_discover', cat: 't', from: 'Alex', ignoreForTrust: true,
        body: (s, char) => {
          if (!char.flags.discoveryEverAgreed)
            return "we've been heads-down building without talking to anyone outside. should we shift to customer discovery for a sprint or two?";
          const weeksAgo = s.week - (char.flags.lastDiscoveryWeek || 0);
          return weeksAgo >= 12
            ? `it's been ${weeksAgo} weeks since we last did discovery. things shift — worth a sprint to check if we're still solving the right problem?`
            : "we're back in build mode. it's only been a few weeks since we last talked to customers, but the queue keeps growing. do another round or keep building?";
        },
        urgency: 1, weeks: 1,
        available: (s, char) => !s.launched && s.week >= 6 && char.focus === 'build' && char.focusSprints >= 3
          && s.market_fit < 80
          && s.week >= (char.flags.lastSyncToDiscover || 0) + 8,
        options: [
          { label: 'Yes — shift to discovery', key: 'discover',
            execute(s, char) { char.focus = 'discover'; char.focusSprints = 1; char.flags.lastSyncToDiscover = s.week; char.flags.discoveryEverAgreed = true; char.flags.lastDiscoveryWeek = s.week; return "Agreed. Alex on customer discovery this sprint."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.lastSyncToDiscover = s.week; },
      },
      {
        id: 'alex_sync_build', cat: 't', from: 'Alex', ignoreForTrust: true,
        body: "i think we have enough customer feedback to act on for now. ready to get back to building?",
        urgency: 1, weeks: 1,
        available: (s, char) => char.focus === 'discover' && char.focusSprints >= 2 && !(s.signal >= 45 && s.customers >= 8 && s.deck_ready),
        options: [
          { label: 'Yes — back to building', key: 'build',
            execute(s, char) { char.focus = 'build'; char.focusSprints = 1; return "Agreed. Alex back to building."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'alex_sync_pitch', cat: 't', from: 'Alex', ignoreForTrust: true,
        body: "traction story is solid. i'd create more value pitching investors right now than doing more discovery. frees you up to stay on users. worth trying?",
        urgency: 1, weeks: 1,
        available: (s, char) => char.focus === 'discover' && char.focusSprints >= 2 && s.signal >= 45 && s.customers >= 8 && s.deck_ready,
        options: [
          { label: 'Yes — work the pipeline', key: 'pitch',
            execute(s, char) { char.focus = 'pitch'; char.focusSprints = 1; return "Agreed. Alex working the investor pipeline."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },

      // ── EARLY CONVERSATIONS (weeks 1–8): founder debates, low-stakes ────────
      {
        id: 'early_name', cat: 'e', from: 'Alex', ignoreForTrust: true,
        body: "we need to stop calling this 'the project.' found three good domains: one sounds romantic, one sounds clean and abstract, one is a made-up word. pick one.",
        urgency: 1, weeks: 1,
        available: (s, char) => s.week >= 2 && s.week <= 5 && s.incorporated && !char.flags.name_done,
        options: [
          { label: 'The romantic one', key: 'catchy',
            execute(s, char) { char.flags.name_done = true; s.signal = clamp(s.signal + 4, 0, 100); return "Name locked. Memorable, a little warm in exactly the right way. People immediately know what it's for."; } },
          { label: 'The clean, abstract one', key: 'descriptive',
            execute(s, char) { char.flags.name_done = true; s.market_fit = clamp(s.market_fit + 2, 0, 100); return "Name locked. Distinctive, hard to confuse with anything else. Grows on people once they try it."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx(s, char) { char.flags.name_done = true; },
      },
      {
        id: 'early_tech_stack', cat: 'e', from: 'Alex', ignoreForTrust: true,
        body: "the matching algorithm is fine for 100 users. at 10,000 it'll fall apart. i can build it to scale properly — takes twice as long. or i ship something that works now and we fix it when it matters.",
        urgency: 1, weeks: 1,
        available: (s, char) => s.dev_plan != null && s.week <= 6 && !char.flags.stack_done,
        options: [
          { label: 'Ship now — fix the algorithm later', key: 'fast',
            execute(s, char) { char.flags.stack_done = true; return "Shipping with the fast version. Alex moving immediately. The 10,000-user problem is a good problem to have."; } },
          { label: 'Build it to scale from the start', key: 'scalable',
            execute(s, char) { char.flags.stack_done = true; s.tech_debt -= 5; return "Slower start, cleaner foundation. Alex is happy — he hates rewriting things."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx(s, char) { char.flags.stack_done = true; },
      },
      {
        id: 'early_customer_target', cat: 't', from: 'Alex', ignoreForTrust: true,
        body: "we keep switching who we're talking to — sometimes we pitch to young singles, sometimes to divorced 30-somethings. we should agree before it gets confusing.",
        urgency: 1, weeks: 1,
        available: (s, char) => s.week >= 3 && s.week <= 8 && char.flags.plan_done && !char.flags.customer_target_done,
        options: [
          { label: 'Young singles — bigger market, easier to reach', key: 'individuals',
            execute(s, char) { char.flags.customer_target_done = true; s.market_fit = clamp(s.market_fit + 4, 0, 100); return "Locked in: 25-35 year olds tired of swiping. Bigger pool, faster feedback."; } },
          { label: 'Relationship-seekers — that\'s where the revenue is', key: 'teams',
            execute(s, char) { char.flags.customer_target_done = true; s.investor_warmth = clamp(s.investor_warmth + 4, 0, 100); return "Going after people who are seriously looking. Higher willingness to pay, stronger retention story."; } },
          { label: 'Follow the early users', key: 'open',
            execute(s, char) { char.flags.customer_target_done = true; return "Staying flexible. Let the first signups tell you who they are."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx(s, char) { char.flags.customer_target_done = true; },
      },
      {
        id: 'early_funding_goal', cat: 't', from: 'Alex', ignoreForTrust: true,
        body: "been sitting on this: dating apps go one of three ways — VC-backed and scale fast (Hinge, Bumble), get acquired by Match Group, or build a quiet profitable subscription business. which are we aiming for? changes everything about how we make decisions.",
        urgency: 1, weeks: 1,
        available: (s, char) => s.week >= 3 && s.week <= 8 && !char.flags.funding_goal_done,
        options: [
          { label: 'VC route — raise, grow fast, aim for IPO or acquisition', key: 'vc',
            execute(s, char) { char.flags.funding_goal_done = true; s.investor_warmth = clamp(s.investor_warmth + 5, 0, 100); return "Aligned on the VC path. Every conversation with investors gets sharper when you know what you're building toward."; } },
          { label: 'Profitable first — build a real business, no VC needed', key: 'profitable',
            execute(s, char) { char.flags.funding_goal_done = true; s.market_fit = clamp(s.market_fit + 3, 0, 100); return "Profitable first. Every product decision gets cleaner when the bar is 'do people pay for this', not 'can we raise on this'."; } },
          { label: 'Stay flexible — let traction tell us', key: 'open',
            execute(s, char) { char.flags.funding_goal_done = true; return "Staying flexible. Revisit when you have enough users to know what kind of company you actually are."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx(s, char) { char.flags.funding_goal_done = true; },
      },

      // ── EARLY: ADMIN & LEGAL ────────────────────────────────────────────────
      {
        id: 'incorporate_now', cat: 'e', from: 'Alex',
        body: "an advisor we're trying to bring on officially asked us to sign an NDA first. we can't without a legal entity. also need a bank account. stripe atlas or find a lawyer?",
        urgency: 12, weeks: 1, ignoreForTrust: true,
        available: (s, char) => s.week >= 3 && s.week <= 14 && s.items != null && !s.incorporated,
        options: [
          { label: 'Stripe Atlas — fast and cheap', key: 'atlas',
            execute(s, char) { s.incorporated = true; s.cash = clamp(s.cash - 500, 0, 9999999); return "Incorporated via Stripe Atlas. $500, Delaware C-corp, EIN, bank account open. Feels official."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "that user followed up on the NDA again. we still don't have a legal entity.",
        dropFx(s, char) { s.signal = clamp(s.signal - 6, 0, 100); },
      },
      {
        id: 'ip_concern', cat: 'e', from: 'Alex',
        body: "been meaning to raise this: at my last job i built early prototypes of a recommendation engine — similar ML concepts to what we're using for matching. if an investor's lawyer finds this in diligence, they can kill the deal. we need to clean it up now.",
        urgency: 3, weeks: 1, ignoreForTrust: true,
        available: (s, char) => s.week >= 5 && s.week <= 12 && !s.ip_clear && !s.ip_concern_dismissed,
        options: [
          { label: 'Get a lawyer to review', key: 'lawyer',
            execute(s, char) { s.ip_clear = true; s.cash -= 1500; return "Lawyer reviewed. Previous employer has no claim — personal time, unrelated enough. IP assignment signed. Clean. ($1,500)"; } },
        ],
        dropDelay: 3, dropFrom: 'Lawyer (friend)',
        dropMsg: "heads up — looked at your previous employer's IP agreement. it's broadly written. clean this up before investor diligence.",
        dropFx(s, char) { s.ip_concern_dismissed = true; s.signal = clamp(s.signal - 12, 0, 100); s.investor_warmth = clamp(s.investor_warmth - 10, 0, 100); },
      },

      // ── EARLY: MARKET & IDEA ────────────────────────────────────────────────
      {
        id: 'first_interview_shock', cat: 'c', from: 'Alex',
        body: "just got off a customer interview. the real frustration isn't finding matches — it's that conversations go nowhere. they matched with 20 people last month and went on zero dates. they'd pay $200/month for something that actually got them to a date.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.week <= 8 && !s.has_demo && char.focus === 'discover' && !char.flags.interview_shock_resolved,
        options: [
          { label: 'Pivot — focus on getting people to dates', key: 'pivot',
            execute(s, char) { char.flags.interview_shock_resolved = true; s.signal = clamp(s.signal + 15, 0, 100); s.market_fit = clamp(s.market_fit + 14, 0, 100); return "Pivoted focus to conversation quality and date-booking. Three more interviews confirmed it. Some earlier work won't carry over."; } },
          { label: 'Stay the course', key: 'stay',
            execute(s, char) { char.flags.interview_shock_resolved = true; s.signal = clamp(s.signal + 5, 0, 100); s.market_fit = clamp(s.market_fit + 3, 0, 100); return "Filed it away. Not ready to pivot on one data point. Logged it for later."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "had 2 more interviews. same thing — people are matching but never going on dates. we're solving the wrong problem.",
        dropFx(s, char) { char.flags.interview_shock_resolved = true; s.signal = clamp(s.signal - 15, 0, 100); },
      },
      {
        id: 'cold_silence', cat: 'c', from: 'Alex',
        body: "posted in 5 subreddits and messaged 30 people who complained about dating apps. 0 real responses — not even 'not interested.' is the message wrong, or are we targeting the wrong people?",
        urgency: 3, weeks: 1,
        available: (s, char) => s.week >= 2 && s.week <= 12 && !s.launched && s.signal < 50 && char.focus === 'discover' && !char.flags.cold_silence_resolved,
        options: [
          { label: 'Rewrite the outreach', key: 'rewrite',
            execute(s, char) { char.flags.cold_silence_resolved = true; s.signal = clamp(s.signal + 10, 0, 100); s.market_fit = clamp(s.market_fit + 6, 0, 100); return "Rewrote the outreach. New version leads with the pain — 'you've matched with dozens of people and gone on zero dates' — not the product. First reply came in 4 hours."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "week 2 of silence. i'm starting to wonder if the people who complain about dating apps actually want anything different.",
        dropFx(s, char) { char.flags.cold_silence_resolved = true; s.signal = clamp(s.signal - 10, 0, 100); char.morale = clamp(char.morale - 8, 0, 100); },
      },
      {
        id: 'random_reframe', cat: 'c', from: 'Alex',
        body: "talked to a stranger at a coffee shop about what we're building. they reframed it completely — 'sounds less like a dating app, more like a vetting tool.' different pitch, different product. we both went quiet. it kind of makes more sense.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.week <= 12 && s.signal < 55 && char.focus === 'discover' && !char.flags.reframe_resolved,
        options: [
          { label: 'Test the new framing', key: 'test',
            execute(s, char) { char.flags.reframe_resolved = true; s.signal = clamp(s.signal + 12, 0, 100); s.market_fit = clamp(s.market_fit + 8, 0, 100); s.network.peers += 3; return "Ran the new framing by 3 more people. All 3 immediately got it. Updated the positioning."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'pivot_insight_1', cat: 'c', from: 'Alex',
        body: "been talking to users all week and something keeps coming up. they're not frustrated by matching — they're frustrated that matches go nowhere. we've been solving the wrong part.",
        urgency: 3, weeks: 1,
        available: (s, char) => char.focus === 'discover' && char.focusSprints >= 2 && s.market_fit >= 8 && !char.flags.pivot1,
        options: [
          { label: 'Pivot — rethink the approach', key: 'pivot',
            execute(s, char) { char.flags.pivot1 = true; s.market_fit = clamp(s.market_fit + 25, 0, 100); s.signal = clamp(s.signal + 8, 0, 100); return "Rethought the approach. The real problem is conversation quality, not match quantity. Signal improved immediately."; } },
          { label: 'Stay the course', key: 'stay',
            execute(s, char) { char.flags.pivot1 = true; s.market_fit = clamp(s.market_fit + 5, 0, 100); return "Stayed the course. Alex logged the feedback but we're not changing direction yet."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "users keep saying the same thing. i'm worried we're building the wrong product.",
        dropFx(s, char) { char.flags.pivot1 = true; s.market_fit = clamp(s.market_fit - 5, 0, 100); s.signal = clamp(s.signal - 8, 0, 100); },
      },
      {
        id: 'pivot_insight_2', cat: 'c', from: 'Alex',
        body: "second round of interviews done. consistent: they want depth on one thing, not breadth. scope's too wide — they're not seeing the core value.",
        urgency: 3, weeks: 1,
        available: (s, char) => char.flags.pivot1 && char.focus === 'discover' && char.focusSprints >= 2 && s.market_fit >= 35 && !char.flags.pivot2,
        options: [
          { label: 'Narrow scope — go deep', key: 'pivot',
            execute(s, char) { char.flags.pivot2 = true; s.market_fit = clamp(s.market_fit + 20, 0, 100); s.signal = clamp(s.signal + 10, 0, 100); return "Narrowed scope significantly. Less ambitious but far more right. Three users asked for exactly this."; } },
          { label: 'Ship the broader version', key: 'stay',
            execute(s, char) { char.flags.pivot2 = true; s.market_fit = clamp(s.market_fit + 8, 0, 100); return "Decided to ship the broader scope. Market fit isn't perfect but you're moving."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "still not hearing the right signal from users. i think we're talking to the wrong people.",
        dropCancel: (s, char) => char.flags.pivot2 || char.flags.pmf_locked,
        dropFx(s, char) { char.flags.pivot2 = true; s.market_fit = clamp(s.market_fit - 8, 0, 100); s.signal = clamp(s.signal - 5, 0, 100); },
      },
      {
        id: 'pmf_lock', cat: 'c', from: 'Alex',
        body: "three users said the exact same thing unprompted this week: 'i actually went on a date because of this.' never seen that before. i think we finally know what to build.",
        urgency: 2, weeks: 1,
        available: (s, char) => char.flags.pivot2 && char.focus === 'discover' && char.focusSprints >= 2 && s.market_fit >= 55 && !char.flags.pmf_locked,
        options: [
          { label: 'Lock in the direction', key: 'lock',
            execute(s, char) { char.flags.pmf_locked = true; s.market_fit = clamp(s.market_fit + 15, 0, 100); s.signal = clamp(s.signal + 15, 0, 100); return "Locked in. This is the product. Now build it right."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'family_doubt', cat: 't', from: 'Alex',
        body: "my parents asked again when i'm getting a real job. yours too? i keep explaining but they don't really get it. tbh it's getting in my head.",
        urgency: 1, weeks: 1,
        available: (s, char) => s.week >= 2 && s.week <= 18 && char.morale < 50 && !char.flags.family_doubt_resolved,
        options: [
          { label: 'Remind each other why', key: 'talk',
            execute(s, char) { char.flags.family_doubt_resolved = true; char.morale = clamp(char.morale + 12, 0, 100); return "Long talk. Reminded each other why you're doing this. Morale reset."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.family_doubt_resolved = true; },
      },

      // ── MID: PRODUCT ────────────────────────────────────────────────────────
      {
        id: 'alex_demo_ready', cat: 'p', from: 'Alex',
        body: "profiles and matching work end-to-end for the first time. create an account, get matched, send a message. that's the core hypothesis. want to put it in front of real people?",
        // urgency 12: once the build is ready the demo is the headline beat — fires promptly
        // instead of being crowded out by urgency-3 flavor cards (which masked the penalty).
        urgency: 12, weeks: 1,
        // buildEffort>=6 (not 4) so Alex's actual build output is the binding constraint:
        // part-time Alex (0.4x buildEffort, see engine ptMult) reaches it ~3-4 weeks later
        // than full-time, so part-time genuinely slows the demo. Also gated on the matching
        // decision (so a licensed engine isn't overwritten); matching's execute only finishes
        // matching_algo when it's still 'active', so the licensed/generic engine is preserved.
        available: (s, char, e) => (char.buildEffort || 0) >= 6 && !s.has_demo && !s.launched
          && (s.matching_owned || s.matching_licensed || !(e.chars.get('jordan') && e.chars.get('jordan').active)),
        options: [
          { label: 'Show it rough — learn fast', key: 'rough',
            execute(s) {
              s.has_demo = true; s.tech_debt += 12;
              s.waitlist += 2; s.market_fit = clamp(s.market_fit + 8, 0, 100);
              if (s.items) {
                if (s.items.matching_algo && s.items.matching_algo.status === 'active') { s.items.matching_algo.status = 'done'; s.items.matching_algo.quality = 'rough'; }
                if (s.items.api_design) s.items.api_design.status = 'active';
                if (!s.items.analytics) s.items.analytics = { status: 'todo', quality: null, assignee: null };
              }
              return "Three contacts in the room. Two hit bugs immediately. One leaned forward: 'Show me that again — I've been on every app and none of them work like this.' You know what to build next.";
            } },
          { label: 'One sprint to polish it first', key: 'polish',
            execute(s) {
              s.has_demo = true; s.tech_debt += 3;
              s.waitlist += 2; s.market_fit = clamp(s.market_fit + 4, 0, 100); s.signal = clamp(s.signal + 4, 0, 100);
              if (s.items) {
                if (s.items.matching_algo && s.items.matching_algo.status === 'active') { s.items.matching_algo.status = 'done'; s.items.matching_algo.quality = 'solid'; }
                if (s.items.api_design) s.items.api_design.status = 'active';
                if (!s.items.analytics) s.items.analytics = { status: 'todo', quality: null, assignee: null };
              }
              return "Spent the sprint cleaning up the worst rough edges. Demo ran cleanly. Contacts were impressed — but one extra sprint of polish is one sprint of not hearing 'I'd pay for that.'";
            } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "someone asked for a demo and i scheduled it for next week. we're showing what we have.",
        dropFx(s) {
          s.has_demo = true; s.tech_debt += 18; s.waitlist += 1;
          if (s.items) {
            if (s.items.matching_algo && s.items.matching_algo.status === 'active') { s.items.matching_algo.status = 'done'; s.items.matching_algo.quality = 'rough'; }
            if (s.items.api_design) s.items.api_design.status = 'active';
            if (!s.items.analytics) s.items.analytics = { status: 'todo', quality: null, assignee: null };
          }
        },
      },
      // ── PIVOT DISCUSSION (card 2 of 3: Alex pushes back on Jordan's flag) ──────
      {
        id: 'pivot_alex_pushback', cat: 'p', from: 'Alex',
        body: (s) => {
          const base = "heard what jordan flagged. i disagree. we cut activities for a reason — scope creep is what kills startups at our stage. we built a strong matching engine. users always want more features. three people saying 'i don't know what to do' doesn't mean we rip up the product right before we're ready to ship.";
          return s.met_priya
            ? base + " priya pushed back on me — she said she's seen this kind of signal get ignored before. i respect her, but she didn't build this."
            : base;
        },
        urgency: 2, weeks: 1,
        available: (s, char, e) => {
          const jordan = e.chars.get("jordan");
          return jordan && jordan.flags.pivot_open_done && !char.flags.pivot_direction_set
            && s.activities_cut && !s.jordan_resolved && s.week <= 22;
        },
        options: [
          { label: "Alex is right — ship what we have, add activities post-launch", key: "ship",
            execute(s, char, e) {
              char.flags.pivot_direction = "ship";
              char.flags.pivot_direction_set = true;
              s.pivot_direction_game = "ship";
              char.morale = clamp(char.morale + 6, 0, 100);
              const jordan = e.chars.get("jordan");
              if (jordan) jordan.morale = clamp(jordan.morale - 5, 0, 100);
              if (!s.met_priya) {
                s.pivot_resolved_flag = true;
                s.pivot_deferred = true;
              }
              return "Alex looked relieved. Jordan went quiet — she's not sure you're right, but she'll build the release checklist.";
            } },
          { label: "The signal is real — I think we should pivot", key: "pivot",
            execute(s, char) {
              char.flags.pivot_direction = "pivot";
              char.flags.pivot_direction_set = true;
              s.pivot_direction_game = "pivot";
              char.morale = clamp(char.morale - 8, 0, 100);
              return "Alex went quiet. 'Okay. It's your call.' He doesn't agree.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          char.flags.pivot_direction = "ship";
          char.flags.pivot_direction_set = true;
          s.pivot_direction_game = "ship";
          const jordan = e && e.chars && e.chars.get("jordan");
          if (jordan) jordan.morale = clamp(jordan.morale - 5, 0, 100);
          if (!s.met_priya) { s.pivot_resolved_flag = true; s.pivot_deferred = true; }
        },
      },
      // ── PIVOT DISCUSSION (card 3 of 3: Alex counter, no-Priya pivot path) ────
      {
        id: 'pivot_counter_alex', cat: 'p', from: 'Alex',
        body: "i still think you're wrong. we built the right product — the matching engine is solid. i'll build whatever you decide. but i want it on the record: we're adding scope we already said no to.",
        urgency: 2, weeks: 1,
        available: (s, char) => char.flags.pivot_direction === "pivot" && !s.pivot_resolved_flag
          && !s.met_priya && s.week <= 22,
        options: [
          { label: "I've made the call — we pivot", key: "confirm",
            execute(s, char, e) {
              s.pivot_resolved_flag = true;
              s.activities_pivot = true;
              s.pivot_week = s.week;
              s.cash = clamp(s.cash - 2000, 0, 9999999);
              s.market_fit = clamp(s.market_fit + 15, 0, 100);
              char.morale = clamp(char.morale - 10, 0, 100);
              const jordan = e.chars.get("jordan");
              if (jordan) jordan.morale = clamp(jordan.morale + 5, 0, 100);
              applyActivitiesPivot(s);
              return "Alex went quiet. 'Okay.' Three weeks. $2k. Rebuilding around activities.";
            } },
          { label: "You're right — we ship as planned", key: "reverse",
            execute(s, char) {
              s.pivot_resolved_flag = true;
              s.pivot_deferred = true;
              char.morale = clamp(char.morale + 5, 0, 100);
              return "Alex seemed relieved. Shipping as planned.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) {
          s.pivot_resolved_flag = true;
          s.pivot_deferred = true;
          char.morale = clamp(char.morale + 5, 0, 100);
        },
      },
      {
        id: 'bad_retention', cat: 'p', from: 'Alex',
        body: "week two post-launch. signups are coming in but nobody's coming back. ran a quick survey — eight out of ten say the same thing: 'i matched with someone but then what?' they don't know what to do with a match. the retention curve is flat.",
        urgency: 13, weeks: 1,
        available: (s, char) => s.launched && s.activities_cut && !s.activities_pivot
          && !char.flags.bad_retention_seen && s.week >= 12,
        options: [
          { label: 'Add activity features now — two-sprint fix', key: 'fix',
            execute(s, char) {
              char.flags.bad_retention_seen = true;
              s.activities_pivot = true;
              s.pivot_week = s.week;
              s.cash = clamp(s.cash - 3000, 0, 9999999);
              s.market_fit = clamp(s.market_fit + 8, 0, 100);
              char.morale = clamp(char.morale + 3, 0, 100);
              applyActivitiesPivot(s);
              return "Two sprints to retrofit activities post-launch. More expensive and disruptive than doing it before. Users who stayed are responding.";
            } },
          { label: "Run user calls — figure out what they actually need", key: 'calls',
            execute(s, char) {
              char.flags.bad_retention_seen = true;
              s.market_fit = clamp(s.market_fit + 4, 0, 100);
              char.morale = clamp(char.morale - 3, 0, 100);
              return "12 user calls this week. Every single one mentioned not knowing what to do after a match. The path forward is clear — it's just late.";
            } },
          { label: "Stay course — improve matching quality", key: 'stay',
            execute(s, char) {
              char.flags.bad_retention_seen = true;
              s.market_fit = clamp(s.market_fit - 20, 0, 100);
              s.signal = clamp(s.signal - 20, 0, 100);
              char.morale = clamp(char.morale - 15, 0, 100);
              return "Decided the problem is matching quality. Users keep churning. Alex thinks this is the wrong call but goes along with it.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) {
          char.flags.bad_retention_seen = true;
          s.market_fit = clamp(s.market_fit - 25, 0, 100);
          s.signal = clamp(s.signal - 25, 0, 100);
          char.morale = clamp(char.morale - 15, 0, 100);
        },
      },
      {
        id: 'pivot_relaunch', cat: 'p', from: 'Alex',
        body: "activity features are live in staging. the matching is rebuilt around shared interests instead of profiles. this is a different product — ready to push it to users?",
        urgency: 14, weeks: 1,
        available: (s, char) => s.activities_pivot && s.launched && !s.pivot_shipped
          && s.items && s.items.plans_matching && s.items.plans_matching.status === "done"
          && (!s.items.plans_ui || s.items.plans_ui.status === "done" || s.jordan_resolved)
          && s.week >= (s.pivot_relaunch_last || 0) + 4,
        options: [
          { label: 'Ship it — relaunch now', key: 'ship',
            execute(s, char) {
              s.pivot_shipped = true;
              s.signal = clamp(s.signal + 15, 0, 100);
              s.market_fit = clamp(s.market_fit + 20, 0, 100);
              return "Pushed to production. Existing users got the update. First activity was created within an hour. Retention will tell the real story over the next few weeks.";
            } },
          { label: 'One more week of polish', key: 'wait',
            execute(s, char) {
              s.pivot_relaunch_last = s.week;
              char.morale = clamp(char.morale - 8, 0, 100);
              return "Another week polishing. Alex thinks you're overthinking it.";
            } },
        ],
        dropFx(s, char) {
          s.pivot_relaunch_last = s.week;
          char.morale = clamp(char.morale - 10, 0, 100);
        },
      },
      {
        id: 'proto_to_product', cat: 'p', from: 'Alex',
        body: "the demo held together long enough to learn what we needed. but we both know it's duct tape. real users will break it in a week. i want to build this properly.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.has_demo && !char.flags.rebuild_triggered
          && s.week >= (char.flags.rebuild_last || 0) + 4,
        options: [
          { label: "Let's build it for real", key: 'commit',
            execute(s, char) {
              char.flags.rebuild_triggered = true;
              s.productPhase = "product";
              s.waitlist += 5; s.market_fit = clamp(s.market_fit + 8, 0, 100);
              return "Keeping what worked, scrapping the rest. We know the core flow — now we build it properly. Word's getting around — 5 people already asked for early access.";
            } },
          { label: 'Not yet — keep polishing the demo', key: 'delay',
            execute(s, char) {
              char.flags.rebuild_last = s.week;
              return "Still things to learn from the demo. Alex nods, but you can tell he's ready to move on.";
            } },
        ],
        dropFx(s, char) { char.flags.rebuild_last = s.week; },
      },
      {
        id: 'good_enough_launch', cat: 'p', from: 'Alex',
        body: "the product is solid. we could keep polishing or we could ship it and learn from real users. nothing's on fire — let's launch.",
        urgency: 3, weeks: 1,
        available: (s, char, e) => s.productPhase === "product" && allScopeBuilt(s)
          && (s.ios_unblocked || s.jordan_resolved) && !s.launched
          && char.focus === 'build' && s.week >= (s.good_enough_last || 0) + 4
          && !(s.jordan_drifting && !s.jordan_resolved),
        options: [
          { label: 'Ship it — launch now', key: 'ship',
            execute(s, char, e) {
              s.launched = true; s.signal = clamp(s.signal + 12, 0, 100);
              e.finishItemsAtLaunch();
              if (s.market_fit < 40) return "Launched. Users are signing up but not sticking around — the product doesn't match what they actually needed. Expect churn.";
              return "Launched. First real users are in. Feedback starts flowing.";
            } },
          { label: 'Two more weeks', key: 'wait',
            execute(s, char) { s.good_enough_last = s.week; char.morale = clamp(char.morale - 12, 0, 100); return "Polished a few more things. Alex thinks you're stalling — and he might be right."; } },
        ],
        dropDelay: 1, dropFrom: 'Alex',
        dropMsg: "another week building in a vacuum. runway is ticking and real users are waiting.",
        dropFx(s, char) { s.cash = clamp(s.cash - 800, 0, 9999999); char.morale = clamp(char.morale - 10, 0, 100); },
      },
      {
        id: 'alex_wants_rebuild', cat: 'p', from: 'Alex',
        body: "the current approach won't scale past 100 users. i know it's 2 weeks of work but if we don't do it now, it'll take 3x longer later.",
        urgency: 2, weeks: 2,
        available: (s, char) => !s.alex_rebuild_done && char.focus === 'build' && (s.has_demo || s.tech_debt >= 20),
        options: [
          { label: 'Do the refactor', key: 'refactor',
            execute(s, char) {
              s.alex_rebuild_done = true;
              char.morale = clamp(char.morale + 10, 0, 100);
              if (s.items?.api_design) { s.items.api_design.status = 'active'; s.items.api_design.quality = null; }
              if (s.items) { s.items.arch_refactor = { status: 'active', quality: null, assignee: 'alex' }; }
              s.arch_refactor_effort_target = (char.buildEffort || 0) + 2.0;
              return "Alex is heads-down. He's rebuilding the API layer from scratch — 2 weeks, nothing else gets done.";
            } },
        ],
        dropDelay: 4, dropFrom: 'Alex',
        dropMsg: "3 active outages this week from the tech debt i flagged. we're losing users in real time.",
        dropCancel: (s) => !s.launched,
        dropFx(s, char) {
          s.alex_rebuild_done = true;
          s.users = clamp(s.users - 8, 0, 9999);
          s.customers = clamp(s.customers - 2, 0, 9999);
          char.morale = clamp(char.morale - 20, 0, 100);
          if (s.items?.api_design) { s.items.api_design.status = 'done'; s.items.api_design.quality = 'rough'; }
        },
      },
      {
        id: 'arch_refactor_done', cat: 't', from: 'Alex',
        body: "refactor's done. rebuilt the api layer from scratch — clean, fast, and can scale past 10k users without touching it again.",
        urgency: 23, weeks: 1,
        available: (s, char) => s.arch_refactor_effort_target != null && (char.buildEffort || 0) >= s.arch_refactor_effort_target && s.items?.arch_refactor?.status === 'active',
        options: [
          { label: 'Review the new architecture', key: 'review',
            execute(s, char) {
              if (s.items?.api_design) { s.items.api_design.status = 'done'; s.items.api_design.quality = 'solid'; }
              if (s.items?.arch_refactor) { s.items.arch_refactor.status = 'done'; s.items.arch_refactor.quality = 'solid'; }
              char.trust = clamp(char.trust + 5, 0, 100);
              char.morale = clamp(char.morale + 5, 0, 100);
              return "Walked through the new codebase with Alex. Clean separation, well-documented. He seemed proud of this one.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s) {
          if (s.items?.api_design) { s.items.api_design.status = 'done'; s.items.api_design.quality = 'solid'; }
          if (s.items?.arch_refactor) { s.items.arch_refactor.status = 'done'; s.items.arch_refactor.quality = 'solid'; }
        },
      },
      {
        id: 'alex_decision', cat: 't', from: 'Customer',
        body: "alex told me you'd add photo verification by end of week. it's wednesday. there's nothing about this in the roadmap.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.launched && s.customers > 1 && !char.flags.decision_done,
        options: [
          { label: 'Ship photo verification by Friday', key: 'ship',
            execute(s, char) { char.flags.decision_done = true; s.customers += 1; char.morale = clamp(char.morale + 5, 0, 100); return "Pulled it off. User upgraded immediately. Set clear boundaries with Alex about making commitments without checking first."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          char.flags.decision_done = true;
          s.signal = clamp(s.signal - 10, 0, 100);
          s.customers = clamp(s.customers - 1, 0, 9999);
          if (e && e.pending) e.pending.push({
            fireWeek: s.week + 1, from: 'User',
            text: "it's monday. still nothing. i'm going to try flare instead.",
            fx() {},
          });
        },
      },

      // ── DEPARTURE ARC ────────────────────────────────────────────────────────
      {
        id: 'alex_leaving_threat', cat: 't', from: 'Alex',
        body: "got a message from an old colleague at a well-funded startup. not going anywhere — but we need an honest conversation about where this is headed.",
        urgency: 13, weeks: 1,
        // Surfaces from the Jordan-fire fallout (alexDepartureRisk), from cratered
        // stats, OR — the ignore-Alex case — from sustained recent neglect: three of
        // his messages ignored within a rolling 10-week window. The neglect trigger
        // fires early enough to beat the runway (morale decay alone bottoms out too
        // late, after most games have already gone bankrupt). Resolvable via 'talk'
        // (sets departure_resolved so it never nags a re-engaged founder again).
        available: (s, char, e) => {
          if (!char.active || char.flags.departure_resolved) return false;
          if (e.alexDepartureRisk || char.trust < 15 || char.morale < 10) return true;
          const recentIgnores = e.log.filter(
            l => l.charId === "alex" && l.ignored && l.week >= s.week - 10).length;
          return recentIgnores >= 3;
        },
        options: [
          { label: 'Have the honest conversation', key: 'talk',
            execute(s, char, e) { char.trust = clamp(char.trust + 20, 0, 100); char.morale = clamp(char.morale + 15, 0, 100); char.flags.departure_resolved = true; e.alexDepartureRisk = false; return "Long, honest conversation. Alex is staying. Things need to improve — but you're aligned now."; } },
        ],
        dropDelay: 1, dropFrom: 'Alex',
        dropMsg: "i've decided to take the other opportunity. i'm sorry — i'll do a proper handoff this week.",
        dropFx(s, char, e) { char.active = false; e.alexDepartureRisk = false; },
      },

      // ── JORDAN ARC (Alex texts you about Jordan; logic reads Jordan's state) ──
      // These live on Alex's thread but track Jordan via e.chars.get('jordan').
      {
        id: 'jordan_drift_start', cat: 't', from: 'Alex',
        body: "jordan's been slower this week. said she's swamped at work. i covered the iOS push — took me two days. not complaining, just flagging it.",
        urgency: 2, weeks: 1,
        available: (s, char, e) => {
          const j = e.chars.get('jordan');
          return s.jordan_active && !s.jordan_drifting && s.week >= 8 && !j.flags.drift_start_done;
        },
        options: [
          { label: 'Talk to Jordan directly', key: 'talk',
            execute(s, char, e) {
              const j = e.chars.get('jordan');
              j.flags.drift_start_done = true;
              s.jordan_drifting = true;
              j.focus = null;
              char.morale = clamp(char.morale - 5, 0, 100);
              return "Jordan was apologetic. Said it's temporary. You're not sure.";
            } },
          { label: 'Alex can cover for now', key: 'cover',
            execute(s, char, e) {
              const j = e.chars.get('jordan');
              j.flags.drift_start_done = true;
              s.jordan_drifting = true;
              j.focus = null;
              char.morale = clamp(char.morale - 10, 0, 100);
              return "Alex nodded. He'll cover it. The iOS backlog keeps growing.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          const j = e.chars.get('jordan');
          j.flags.drift_start_done = true;
          s.jordan_drifting = true;
          j.focus = null;
          char.morale = clamp(char.morale - 8, 0, 100);
        },
      },
      {
        id: 'jordan_drag', cat: 't', from: 'Alex',
        body: (s, char, e) => ((e.chars.get('jordan').flags.drag_count || 0) === 0)
          ? "pushed the iOS release back again. jordan said she'd review my PR by tuesday — it's friday. i've covered it, but this is the second time this sprint."
          : "user reported a crash on iphone 12. jordan's the only one who knows that part of the codebase. i've been waiting two days. this can't keep going.",
        urgency: 2, weeks: 1,
        available: (s, char, e) => {
          const j = e.chars.get('jordan');
          return s.jordan_drifting && !s.jordan_resolved
            && (j.flags.drag_count || 0) < 2
            && s.week >= (j.flags.drag_last || 0) + 4;
        },
        options: [
          { label: 'Talk to Jordan directly', key: 'talk',
            execute(s, char, e) {
              const j = e.chars.get('jordan');
              j.flags.drag_count = (j.flags.drag_count || 0) + 1;
              j.flags.drag_last = s.week;
              s.jordan_confrontation_triggered = true;
              char.morale = clamp(char.morale + 5, 0, 100);
              return "Sat down with Jordan. She heard the weight of it. Alex noticed you followed up — the real conversation is coming.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          const j = e.chars.get('jordan');
          const count = (j.flags.drag_count || 0) + 1;
          j.flags.drag_count = count;
          j.flags.drag_last = s.week;
          if (count >= 2) {
            char.morale = 5; char.trust = clamp(char.trust - 20, 0, 100);
            s.jordan_confrontation_triggered = true;
            if (e && e.pending) e.pending.push({
              fireWeek: s.week + 1, from: 'Alex', charId: 'alex',
              text: "you've been aware of the jordan situation for weeks. i've been covering for her and saying nothing. it's been affecting me more than i let on.",
              fx() {},
            });
          } else {
            char.morale = clamp(char.morale - 12, 0, 100);
          }
        },
      },
      {
        id: 'jordan_launch_blocker', cat: 'p', from: 'Alex',
        body: "backend's solid. web works end to end. i've been ready to ship for two weeks. but we can't launch a dating app without mobile — nobody will use it. jordan needs to finish the iOS build or we need to talk about what's actually happening.",
        urgency: 23, weeks: 1,
        available: (s, char, e) => {
          const j = e.chars.get('jordan');
          return s.jordan_drifting && !s.jordan_resolved && !j.flags.launch_blocker_done
            && s.productPhase === "product" && allScopeBuilt(s) && !s.launched && !s.ios_unblocked;
        },
        options: [
          { label: 'Launch web-only — fix iOS later', key: 'web_only',
            execute(s, char, e) {
              e.chars.get('jordan').flags.launch_blocker_done = true;
              s.launched = true;
              s.signal = clamp(s.signal - 10, 0, 100);
              e.finishItemsAtLaunch();
              return "Launched. Web-only. A dating app without iOS is a real handicap — early retention will show it.";
            } },
          { label: 'Give Jordan two more weeks', key: 'wait',
            execute(s, char, e) {
              const j = e.chars.get('jordan');
              j.flags.launch_blocker_wait = (j.flags.launch_blocker_wait || 0) + 1;
              char.morale = clamp(char.morale - 8, 0, 100);
              return "Alex wasn't happy. Jordan said she'd prioritize it. The clock is running.";
            },
            available: (s, char, e) => (e.chars.get('jordan').flags.launch_blocker_wait || 0) < 1 },
          { label: 'Confront Jordan — this has to be resolved', key: 'confront',
            execute(s, char, e) {
              e.chars.get('jordan').flags.launch_blocker_done = true;
              s.jordan_confrontation_triggered = true;
              return "Agreed. This conversation is overdue.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          e.chars.get('jordan').flags.launch_blocker_done = true;
          s.launched = true;
          s.signal = clamp(s.signal - 15, 0, 100);
          e.finishItemsAtLaunch();
        },
      },
      {
        id: 'jordan_confrontation', cat: 't', from: 'Alex',
        body: (s, char, e) => {
          const j = e.chars.get('jordan');
          const pct = j.flags.equity_proposal === '33/33/33' ? '33%' : j.flags.equity_proposal === '50/25/25' ? '25%' : '20%';
          return `i need to say something. jordan's been part-time for two months. i'm covering her work and mine. she has ${pct} of the company and i don't think she's earning it anymore. we need to have the conversation.`;
        },
        urgency: 23, weeks: 1,
        available: (s, char, e) => {
          const j = e.chars.get('jordan');
          return s.jordan_drifting && !s.jordan_resolved && !j.flags.confrontation_done
            && (s.jordan_confrontation_triggered || s.week >= (s.jordan_confrontation_defer_until || 20));
        },
        options: [
          { label: 'Have the conversation — let Jordan go', key: 'fire',
            execute(s, char, e) {
              const j = e.chars.get('jordan');
              j.flags.confrontation_done = true;
              s.jordan_resolved = true;
              s.jordan_cleanup_needed = true; // always needs legal review on departure
              if (s.items) {
                if (s.items.ios_server && s.items.ios_server.status !== 'done' && s.items.ios_server.status !== 'obsolete') {
                  s.items.ios_server.assignee = 'alex';
                  e.pending.push({
                    fireWeek: s.week + 2, from: 'Alex', charId: 'alex',
                    text: "picked up jordan's ios backend integration. took a few days to orient in her code but it's running.",
                    fx(st) {
                      if (st.items?.ios_server) { st.items.ios_server.status = 'done'; st.items.ios_server.quality = 'solid'; }
                      st.ios_unblocked = true;
                    },
                    cancel: (st) => !!st.ios_unblocked,
                  });
                }
                if (s.items.ios_ui && s.items.ios_ui.status !== 'done' && s.items.ios_ui.status !== 'obsolete') {
                  s.items.ios_ui.assignee = 'alex';
                }
                if (s.items.plans_ui && s.items.plans_ui.status !== 'done' && s.items.plans_ui.status !== 'obsolete') {
                  s.items.plans_ui.assignee = null;
                }
              }
              if (!s.jordan_equity) {
                // Equity was never formally signed — Alex sees the same dysfunction
                char.morale = clamp(char.morale - 30, 0, 100); char.trust = clamp(char.trust - 25, 0, 100);
                e.alexDepartureRisk = true;
                return "Hard conversation. Jordan left. Then Alex pulled you aside: 'we never actually signed anything. no equity split, no vesting. what are we even building here?' he looked serious.";
              }
              char.morale = clamp(char.morale + 10, 0, 100);
              char.trust = clamp(char.trust + 8, 0, 100);
              const pct = j.flags.equity_proposal === '33/33/33' ? '33%' : j.flags.equity_proposal === '50/25/25' ? '25%' : '20%';
              return `Hard conversation. Jordan wasn't surprised — she knew it wasn't working. She's off the team. Her ${pct} is still on the cap table.`;
            } },
          { label: 'One more sprint to turn it around', key: 'defer',
            execute(s, char, e) {
              s.jordan_confrontation_triggered = false;
              s.jordan_confrontation_defer_until = s.week + 4;
              char.morale = clamp(char.morale - 8, 0, 100);
              return "Alex went quiet. Jordan will try again. You both know how this ends.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          e.chars.get('jordan').flags.confrontation_done = true;
          // Jordan stays — only the player can fire her. Alex can't take it anymore.
          char.morale = 0; char.trust = clamp(char.trust - 25, 0, 100);
        },
      },
      {
        id: 'jordan_cap_table', cat: 'e', from: 'Alex',
        body: (s, char, e) => {
          const j = e.chars.get('jordan');
          const pct = j.flags.equity_proposal === '33/33/33' ? '33%' : j.flags.equity_proposal === '50/25/25' ? '25%' : '20%';
          return `jordan's ${pct} is still on the cap table — fully vested, no cliff. any investor who looks at this will ask questions we can't answer well. we need a lawyer to clean it up.`;
        },
        urgency: 22, weeks: 1,
        available: (s, char, e) => {
          const j = e.chars.get('jordan');
          return s.jordan_resolved && s.jordan_cleanup_needed && !j.flags.cap_table_done;
        },
        options: [
          { label: 'Hire a lawyer — $2,000', key: 'lawyer',
            execute(s, char, e) {
              e.chars.get('jordan').flags.cap_table_done = true;
              s.jordan_cleanup_needed = false;
              s.cash = clamp(s.cash - 2000, 0, 9999999);
              return "Lawyer drafted a buyback agreement. Jordan signed for a nominal amount. Cap table clean.";
            } },
          { label: "Can't afford it right now", key: 'defer',
            execute(s, char, e) {
              e.chars.get('jordan').flags.cap_table_done = true;
              return "Left it for now. Every investor who looks at the cap table will ask about Jordan's stake.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) { e.chars.get('jordan').flags.cap_table_done = true; },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.alex = def;
})();
