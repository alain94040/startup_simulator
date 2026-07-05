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

  // Direction decisions move the build: answering a co-founder's direction ask
  // grants immediate buildEffort on top of the passive weekly accrual, so an
  // engaged founder ships weeks faster than one who leaves chats on read.
  // Alex's grants shrink while he's part-time (committed_fulltime lifts it) so
  // the commitment lesson survives the compressed dev arc.
  function grantEffort(char, amt) {
    const pt = (char.archetypeId === 'alex' && !char.flags.committed_fulltime) ? 0.6 : 1.0;
    char.buildEffort = (char.buildEffort || 0) + amt * pt;
  }

  // Pivot-day beat 4: the player plays an evidence chip and Alex responds in
  // character. Conversion rule: the cohort (bought analytics) plus one human
  // quote — a face on the data — is what moves him off his own column.
  function pdPlayChip(s, char, e, key) {
    char.flags.pd_evidence_done = true;
    s.evidence_chip = key;
    const human = key === 'maya' || key === 'rachel' || key === 'demo';
    if (human && s.analytics_live) {
      s.alex_converted = true;
      e.threads.alex.push({
        type: 'incoming', from: 'Alex',
        body: "…yeah. put that next to the cohort. i'm going to go quietly erase half my column.",
        week: s.week, isNew: true, focus: 'pivot', seq: e._seq++,
      });
    } else if (key === 'circle') {
      e.threads.alex.push({
        type: 'incoming', from: 'Alex',
        body: "…the circle. i keep forgetting our best density experiment already ran, and density lost.",
        week: s.week, isNew: true, focus: 'pivot', seq: e._seq++,
      });
    } else if (human) {
      e.threads.alex.push({
        type: 'incoming', from: 'Alex',
        body: "that's a real data point and it stings. i just wish i could test it at scale — one quote against one theory isn't a cohort.",
        week: s.week, isNew: true, focus: 'pivot', seq: e._seq++,
      });
    } else {
      // 'gut' — Priya answers, gently.
      e.threads.priya.push({
        type: 'incoming', from: 'Priya',
        body: "then we're guessing. i've won and lost on guesses. just know which one this is.",
        week: s.week, isNew: true, focus: 'pivot', seq: e._seq++,
      });
    }
  }

  const def = {
    id: 'alex', name: 'Alex', type: 'cofounder',

    slice: [
      "start_prototype",
      "incorporate_week1",
      "dev_planning_session",
      "alex_commitment",
      "early_name",
      "early_customer_target",
      "early_funding_goal",
      "vision_mismatch",
      "jordan_equity_alex",
      "jordan_equity_alex_why",
      "jordan_equity_counter_alex",
      "jordan_equity_counter_alex_50",
      "alex_side_project",
      "alex_side_project_escalation",
      "alex_quiet",
      "alex_equity",
      "alex_sync_discover",
      "alex_sync_build",
      "alex_sync_pitch",
      "alex_demo_ready",
      "demo_live_watch",
      "demo_live_bug",
      "demo_first_message",
      "auth_build_buy",
      "auth_buy_forced",
      "alex_dir_ranking",
      "alex_dir_seed_strategy",
      "analytics_choice",
      "slide_hangover",
      "slide_alex_thesis",
      "pivot_day_open",
      "pivot_day_alex_case",
      "pivot_day_evidence",
      "pivot_day_cost",
      "pivot_day_decide",
      "pivot_payoff_maya",
      "pivot_fifty_verdict",
      "feature_spree",
      "pivot_relaunch",
      "proto_to_product",
      "good_enough_launch",
      "launch_preflight",
      "launch_email_pulse",
      "launch_staging_bug_discover",
      "launch_staging_bug_found",
      "launch_staging_bug_decide",
      "launch_inbox_question",
      "launch_test_profiles_notice",
      "launch_test_profiles_scope",
      "launch_test_profiles_decide",
      "launch_stripe_sting_discover",
      "launch_stripe_sting_research",
      "launch_stripe_sting_decide",
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
            journal: "Told the team to start building today. Alex took profiles and matching, Jordan's on iOS, I'll cover everything else. We're shelving the activity-planning idea — it's really a second product. Core first.",
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
            journal: "Filed through Stripe Atlas. Delaware C-corp, EIN, bank account in two days. $500 gone, but we're a real company now.",
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
        // urgency 12: the plan choice is the dev arc's opening headline — it starts the
        // clock (s.dev_start_week) that every sprint-direction card keys off, so it can't
        // sit behind flavor cards. Window rides the equity signing instead of a fixed wk8.
        urgency: 12, weeks: 2, patience: 4,
        available: (s, char, e) => {
          if (!char.flags.prototype_kicked || char.flags.plan_done) return false;
          if (!s.jordan_equity) return false;
          const jordan = e.chars.get('jordan');
          const isAlexHappy = jordan && jordan.flags.equity_proposal === '40/40/20';
          const delay = isAlexHappy ? 0 : 1;
          return s.week >= (s.equity_week || 0) + delay && s.week <= Math.max(8, (s.equity_week || 0) + 4);
        },
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
              s.dev_start_week = s.week;
              expandItems(s, 'full');
              return "Three-hour session. Whiteboard filled. Twenty-plus items in the backlog. Jordan's excited. Alex is skeptical but admits it looks thorough.";
            } },
          { label: 'Build version B', key: 'lean',
            reply: "let's build B. core hypothesis only — ship and learn. we can spec the rest when we know what works.",
            journal: "Kept the plan tight: ninety minutes, five items, core hypothesis only. Alex looked relieved. We can spec the rest once we know what works.",
            execute(s, char) {
              char.flags.plan_done = true;
              s.dev_plan = 'lean';
              s.dev_start_week = s.week;
              expandItems(s, 'lean');
              return "Ninety minutes. Five items on the board. Alex seemed relieved.";
            } },
          { label: 'Build version C', key: 'sprint',
            reply: "let's build C. strip it to the essentials and ship — we can layer the rest on once it's working.",
            journal: "Kept the plan tight: ninety minutes, five items, core hypothesis only. Alex looked relieved. We can spec the rest once we know what works.",
            execute(s, char) {
              char.flags.plan_done = true;
              // Hidden binary: C resolves to the same lean plan as B. The only real
              // decision here is avoiding A (the over-scoped build).
              s.dev_plan = 'lean';
              s.dev_start_week = s.week;
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
        body: "sprint 1 planning. first brick is accounts — login, account creation, password reset, social sign-in. i can hand-roll it, couple days tops, and we own it forever. or i wire up a hosted provider in an afternoon and we pay $30/wk for the privilege. your call — i genuinely don't mind building it. kind of want to, actually.",
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
              if (s.items && s.items.auth) { s.items.auth.status = 'done'; s.items.auth.quality = 'bought'; s.items.auth.assignee = null; s.items.auth.note = "Bought: hosted provider · $30/wk"; }
              grantEffort(char, 1.0);  // afternoon of wiring, rest of the sprint goes to the core
              return "Hosted auth wired up in an afternoon — login, signup, reset, social sign-in. $30/wk for it, but it's done and it's solid. Alex grumbled about the fee, then spent the rest of the sprint on the matching engine.";
            } },
          { label: 'Let Alex build it himself', key: 'build',
            reply: "ok — build it, if you're sure it's just a few days.",
            execute(s, char) {
              char.flags.auth_building = true;
              char.flags.auth_build_start = s.week;
              char.morale = clamp(char.morale + 4, 0, 100);
              if (s.items && s.items.auth) { s.items.auth.status = 'active'; s.items.auth.assignee = 'alex'; s.items.auth.note = "Building our own"; }
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
            journal: "Two weeks in, Alex was still fighting OAuth refresh tokens and password-reset edge cases. We bought the hosted provider in the end — same monthly fee we'd have paid on day one, plus two weeks of his time down the drain. Lesson logged.",
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

      // ── DIRECTION: WHAT DO WE RANK ON? (the core-IP question) ────────────────
      // Only exists if you kept the matching engine (s.matching_owned). The C-option
      // is research-gated: interviews, the reframe, or fresh waitlist calls unlock
      // the conversation-odds thesis — GOALS.md's "research → better build options".
      {
        id: 'alex_dir_ranking', cat: 'p', from: 'Alex',
        body: "matching engine update: it runs end to end — profiles in, pairs out. one problem. the scoring function is literally `return Math.random()`. before i write the real one i need product direction, not code: what makes two people a good kindred match?",
        urgency: 12, weeks: 1,
        available: (s, char) => s.matching_owned && char.flags.plan_done && !char.flags.ranking_done
          && !s.has_demo && !s.launched,
        options: [
          { label: 'Distance, age, availability — the standard stack', key: 'proximity',
            reply: "keep it simple. distance, age range, shared availability — the stuff every app ranks on. it works.",
            execute(s, char) {
              char.flags.ranking_done = true;
              grantEffort(char, 1.2);
              s.market_fit = clamp(s.market_fit + 2, 0, 100);
              if (s.items && s.items.matching_algo) s.items.matching_algo.note = "Ranks distance + availability";
              return "Alex shipped the standard ranking in two days. It works. It's also exactly what every other app does.";
            } },
          { label: 'Shared interests — climbers see climbers first', key: 'interests',
            reply: "interest overlap. two people who both climb at 7am should see each other first.",
            execute(s, char) {
              char.flags.ranking_done = true;
              grantEffort(char, 1.2);
              s.market_fit = clamp(s.market_fit + 3, 0, 100);
              if (s.items && s.items.matching_algo) s.items.matching_algo.note = "Ranks interest overlap";
              return "Interest-overlap scoring went in over the weekend. Reasonable, defensible — and still a guess about what makes matches actually work.";
            } },
          { label: 'Rank on conversation odds — the research answered this', key: 'conversation',
            available: (s, char, e) => {
              const f = e.chars.get('founder');
              const fresh = f && f.flags.recent_user_signal_week != null && s.week <= f.flags.recent_user_signal_week + 6;
              return !!((f && f.flags.interviews_done) || char.flags.reframe_resolved || fresh);
            },
            reply: "neither. every conversation with users says the same thing — matches don't fail at the match, they die in the chat. rank on conversation odds: profile specificity, question-askers, people who actually reply. optimize the first message, not the first look.",
            journal: "Gave Alex the ranking thesis straight from the research: optimize for the conversation, not the match. He went quiet, then called it 'actually a thesis.' The engine ranks conversation odds now — nobody else's does.",
            execute(s, char, e) {
              char.flags.ranking_done = true;
              char.flags.ranking_thesis = true;
              grantEffort(char, 1.2);
              s.market_fit = clamp(s.market_fit + 8, 0, 100);
              s.signal = clamp(s.signal + 4, 0, 100);
              if (s.items && s.items.matching_algo) s.items.matching_algo.note = "Ranks conversation odds (from research)";
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "huh. that's… actually a thesis. i can proxy it — specificity score on the profile text now, response-rate signal once we have real data. writing it tonight.",
                week: s.week, isNew: true, seq: e._seq++,
              });
              return "The ranking thesis came straight out of the research: optimize the first message, not the first look. Alex is proxying it with profile-text specificity until there's real response data. No other app ranks on this.";
            } },
        ],
        // Ignored: Alex guesses — competently, but generically.
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          char.flags.ranking_done = true;
          char.morale = clamp(char.morale - 4, 0, 100);
          if (s.items && s.items.matching_algo) s.items.matching_algo.note = "Ranks distance (Alex's default)";
          if (e && e.pending) e.pending.push({
            fireWeek: s.week + 2, from: 'Alex', charId: 'alex',
            text: "fyi — i shipped distance-based ranking because we never talked about it. it works. it's also exactly what every other app does.",
          });
        },
      },

      // ── BUILD vs BUY: ANALYTICS (commodity → buy is right; buying buys you sight) ─
      // Buying instrumentation surfaces the "users match, then go silent" drop-off
      // early — the pivot signal. Building it leaves you blind until it's too late.
      {
        id: 'analytics_choice', cat: 'p', from: 'Alex',
        body: "demo night bugged me. the only reason i saw her session at all is that i was tailing logs by hand. the testflight circle is a dozen people and i can't tell you what a single one of them does in the app — and on launch day it'll be hundreds of strangers. i can wire an analytics SDK in a day — $30/wk, dashboards tomorrow. or i build our own event pipeline: a week of my time, free forever, and i kind of want to own our data anyway.",
        urgency: 12, weeks: 1,
        available: (s, char) => s.has_demo && !s.launched && !char.flags.analytics_choice_done,
        options: [
          { label: 'Drop in an analytics SDK', key: 'buy',
            reply: "drop in the SDK. i want to see what users actually do, not guess. the monthly cost is nothing next to shipping blind.",
            execute(s, char) {
              char.flags.analytics_choice_done = true;
              s.analytics_live = true;
              s.extra_burn += 30;
              s.saas.push({ label: "Analytics SDK", cost: 30 });
              if (s.items && s.items.analytics) { s.items.analytics.status = 'done'; s.items.analytics.quality = 'bought'; s.items.analytics.assignee = null; s.items.analytics.note = "Bought: SDK · $30/wk"; }
              grantEffort(char, 1.0);  // a day of wiring, the sprint stays on product
              return "Analytics SDK live in a day — funnels, retention, event tracking. Now we can see what's actually happening instead of guessing.";
            } },
          { label: 'Build our own dashboard', key: 'build',
            reply: "build our own — no point paying monthly when you can do it yourself.",
            execute(s, char) {
              char.flags.analytics_choice_done = true;
              char.buildEffort = Math.max(0, (char.buildEffort || 0) - 2.0);
              if (s.items && s.items.analytics) { s.items.analytics.status = 'active'; s.items.analytics.assignee = 'alex'; s.items.analytics.note = "Building our own pipeline"; }
              return "Alex started building an analytics dashboard. His plate was already full — and we're flying half-blind until it's done.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) {
          char.flags.analytics_choice_done = true;
          if (s.items && s.items.analytics) { s.items.analytics.status = 'active'; s.items.analytics.assignee = 'alex'; }
        },
      },

      // ── DIRECTION: WHERE DO WE SHIP? (cold-start density, made visible by data) ─
      // Supersedes growth.js's beachhead_choice by setting s.beachhead before launch
      // (that card only fires while s.beachhead == null). The dilemma itself is
      // research-gated: without analytics / waitlist calls / community engagement,
      // Alex can't see past the hometown default — buying analytics literally makes
      // this decision visible.
      {
        id: 'alex_dir_seed_strategy', cat: 'p', from: 'Alex',
        body: (s, char, e) => {
          const f = e.chars.get('founder');
          const informed = s.analytics_live || (s.community_engaged_count || 0) >= 2
            || (f && f.flags.recent_user_signal_week != null);
          return informed
            ? "launch mechanics. we always assumed we launch here — we live here, we can seed the first hundred by hand, jordan can host a mixer. but i pulled the waitlist by city and… austin has almost three times as many people on it as our own city. none of us has ever set foot in austin. do we launch where we live, or where the demand is?"
            : "launch mechanics. a dating app opening to an empty room is a ghost town — first person in sees an empty deck, closes the app, never comes back. one city to start, right? here at home, where we can seed the room by hand. or do we just open the doors everywhere and pray?";
        },
        urgency: 12, weeks: 1,
        available: (s, char) => s.has_demo && !s.launched && !char.flags.seed_strategy_done
          && s.beachhead == null && char.flags.analytics_choice_done,
        options: [
          { label: 'Launch here — hometown advantage', key: 'local',
            reply: "here. hometown advantage is real — we seed the first hundred by hand, host the mixer, fix things in person.",
            execute(s, char) {
              char.flags.seed_strategy_done = true;
              s.beachhead = 'narrow';
              s.seed_strategy = 'local';
              grantEffort(char, 0.8);
              s.market_fit = clamp(s.market_fit + 3, 0, 100);
              return "One city: ours. Invite waves by neighborhood, a launch mixer you can drive to, bugs fixed across a coffee table. Small top line, dense room.";
            } },
          { label: 'Open everywhere — momentum is the story', key: 'everywhere',
            reply: "open it everywhere. momentum is the story — we densify later.",
            execute(s, char) {
              char.flags.seed_strategy_done = true;
              s.beachhead = 'broad';
              s.seed_strategy = 'open';
              grantEffort(char, 0.8);
              s.signal = clamp(s.signal + 5, 0, 100);
              return "Open signups, no gates. The launch-day number will look great. Whether anyone finds a match within 50 miles is a different question.";
            } },
          { label: 'Launch where the waitlist lives — Austin', key: 'waitlist_city',
            available: (s, char, e) => {
              const f = e.chars.get('founder');
              return !!(s.analytics_live || (s.community_engaged_count || 0) >= 2
                || (f && f.flags.recent_user_signal_week != null));
            },
            reply: "austin. the waitlist already voted — demand beats home-field advantage. we run it remote, fly out for launch week, and every invite lands somewhere dense.",
            journal: "The waitlist data made the launch call for us: Austin, where our signups actually are — three times our home city. We're launching a dating app in a city none of us has set foot in, because that's where the demand lives.",
            execute(s, char, e) {
              char.flags.seed_strategy_done = true;
              s.beachhead = 'narrow';
              s.seed_strategy = 'austin';
              s.launch_city = 'Austin';
              grantEffort(char, 0.8);
              s.market_fit = clamp(s.market_fit + 4, 0, 100);
              s.waitlist += 4;
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "booked two flights to austin for launch week. jordan found a bar for the mixer on yelp. this is either very smart or very funny.",
                week: s.week, isNew: true, seq: e._seq++,
              });
              return "Austin it is — invite waves by neighborhood, launch-week flights booked, a mixer venue picked off Yelp. Every invite lands somewhere dense enough to matter.";
            } },
        ],
        // Ignored: Alex plans around home by default — without ever checking the data.
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          char.flags.seed_strategy_done = true;
          s.beachhead = 'narrow';
          s.seed_strategy = 'local';
          if (e && e.pending) e.pending.push({
            fireWeek: s.week + 2, from: 'Alex', charId: 'alex',
            text: "we never picked a launch city so i'm planning around here. hope that's right — nobody ever actually checked where the waitlist lives.",
          });
        },
      },

      // ── EARLY: RELATIONSHIP ──────────────────────────────────────────────────
      {
        id: 'alex_commitment', cat: 't', from: 'Alex',
        body: "i can't quit my job until we have real traction. evenings and weekends for now. should be enough to get to launch, right?",
        urgency: 13, weeks: 1,
        // Rides the dev clock: the quit-my-job talk lands right as the sprint cadence
        // starts making his evenings-and-weekends pace visible.
        available: (s, char) => s.dev_start_week != null && s.week <= s.dev_start_week + 3
          && char.flags.plan_done && !char.flags.commitment_resolved,
        options: [
          { label: 'Agree — part-time for now', key: 'accept',
            reply: "that's fair. evenings and weekends works for now. let's set a milestone to revisit — once we hit traction, we talk again.",
            journal: "Agreed Alex stays part-time for now — evenings and weekends. Slower, but he won't resent it. We set a milestone to revisit once we have traction.",
            execute(s, char) { char.flags.commitment_resolved = true; s.signal = clamp(s.signal - 5, 0, 100); return "Alex stays part-time for now. Slower, but stable. Set a clear milestone to revisit."; } },
          { label: 'Push for full-time', key: 'push',
            reply: "i hear you but i need you all in. evenings and weekends won't cut it — we'll get outrun. can you make the jump now?",
            journal: "Pushed Alex to go full-time. He said yes, but I could tell he wasn't ready. I'll need to watch how he's doing.",
            execute(s, char) { char.flags.commitment_resolved = true; char.flags.committed_fulltime = true; char.morale = clamp(char.morale - 10, 0, 100); char.trust = clamp(char.trust - 10, 0, 100); return "Alex agreed to go full-time. He said yes, but you could tell he wasn't ready. Watch his mood."; } },
        ],
        dropDelay: 3, dropFrom: 'Alex',
        dropMsg: "got a really good offer from a startup. i need to decide by friday. can we talk about where this is actually going?",
        dropCancel: (s, char) => char.flags.committed_fulltime || char.flags.offer_msg_sent,
        dropFx(s, char) { char.flags.offer_msg_sent = true; char.morale = clamp(char.morale - 14, 0, 100); s.alex_offer_week = s.week; },
      },
      // ── EQUITY (Alex's side — Jordan opened the topic in her thread) ─────────
      // Alex opens by refusing equal thirds, but WITHOUT naming a number. The player
      // can probe ("what are you thinking?") to hear his reasoning, or commit a split.
      // Alex's real position is 40/40/20 — he wants to be the founder's equal AND
      // Jordan dialed down (she's part-time). 33/33/33 still triggers his counter
      // (jordan_equity_counter_alex); 50/25/25 triggers his 50-counter. The probe is
      // pure info: it sets equity_probed and hands off to jordan_equity_alex_why.
      {
        id: 'jordan_equity_alex', cat: 't', from: 'Alex', focus: 'equity',
        body: "before we lock anything in — i can't sign off on equal thirds. not the way jordan framed it. i need to know where your head's actually at first.",
        urgency: 32, weeks: 1,
        available: (s, char, e) => {
          const jordan = e.chars.get('jordan');
          return jordan && jordan.flags.equity_mention_done && !jordan.flags.equity_probed
            && !jordan.flags.equity_proposal && s.week <= 8;
        },
        options: [
          { label: "What are you thinking?", key: 'probe',
            reply: "before i put a number on the table — talk to me. what feels fair to you, and why?",
            journal: null,
            execute(s, char, e) {
              const jordan = e.chars.get('jordan');
              if (jordan) jordan.flags.equity_probed = true;
              return "Asked Alex to lay out his thinking before you name a split.";
            } },
          { label: 'Equal thirds', key: 'propose_33',
            reply: "equal thirds. jordan found the space and brought us together. you're building. i'm running it. we're all essential.",
            journal: null,
            execute(s, char, e) {
              const jordan = e.chars.get('jordan');
              if (jordan) jordan.flags.equity_proposal = '33/33/33';
              char.morale = clamp(char.morale - 3, 0, 100);
              return "Equal split. Alex went quiet — he expected more weight for his commitment.";
            } },
          { label: '40/40/20', key: 'propose_40',
            reply: "you're right. you and i are all in — jordan's still at her job. 40/40/20 until she goes full-time.",
            journal: null,
            execute(s, char, e) {
              const jordan = e.chars.get('jordan');
              if (jordan) jordan.flags.equity_proposal = '40/40/20';
              char.morale = clamp(char.morale + 5, 0, 100);
              return "Alex: 'yeah — that's what I was thinking.' Jordan hasn't heard yet.";
            } },
          { label: '50/25/25', key: 'propose_50',
            reply: "i'm taking 50. this is my company — i found the idea, i'm the one not sleeping. 25 each for you and jordan.",
            journal: null,
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
      // Probe answer: Alex lays out his reasoning, then the same three splits. His line
      // ("you and me, even") is deliberately ambiguous — it rules out 50 but a player
      // can misread it as "33 is fine too." Picking 33 still triggers his counter.
      {
        id: 'jordan_equity_alex_why', cat: 't', from: 'Alex', focus: 'equity',
        body: "i am doing exactly what you are doing — same hours, same code, same risk. i'm not asking for a gift. i'm asking to be your equal. you and me, even. jordan's great, but she's still got a paycheck to fall back on. so — what's the split?",
        urgency: 32, weeks: 1,
        available: (s, char, e) => {
          const jordan = e.chars.get('jordan');
          return jordan && jordan.flags.equity_probed && !jordan.flags.equity_proposal && s.week <= 12;
        },
        options: [
          { label: 'Equal thirds', key: 'propose_33',
            reply: "equal thirds. jordan found the space and brought us together. you're building. i'm running it. we're all essential.",
            journal: null,
            execute(s, char, e) {
              const jordan = e.chars.get('jordan');
              if (jordan) jordan.flags.equity_proposal = '33/33/33';
              char.morale = clamp(char.morale - 3, 0, 100);
              return "Equal split. Alex went quiet — he'd just told you he wanted to be your equal, not Jordan's.";
            } },
          { label: '40/40/20 — you and me even, Jordan at 20', key: 'propose_40',
            reply: "you're right. you and i are all in — jordan's still at her job. 40/40/20 until she goes full-time.",
            journal: null,
            execute(s, char, e) {
              const jordan = e.chars.get('jordan');
              if (jordan) jordan.flags.equity_proposal = '40/40/20';
              char.morale = clamp(char.morale + 5, 0, 100);
              return "Alex: 'yeah — that's exactly it.' Jordan hasn't heard yet.";
            } },
          { label: '50/25/25 — I take half', key: 'propose_50',
            reply: "i'm taking 50. this is my company — i found the idea, i'm the one not sleeping. 25 each for you and jordan.",
            journal: null,
            execute(s, char, e) {
              const jordan = e.chars.get('jordan');
              if (jordan) jordan.flags.equity_proposal = '50/25/25';
              char.morale = clamp(char.morale - 3, 0, 100);
              return "Alex went still. 'I just asked to be even with you.' You'll hear from both of them.";
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
        id: 'jordan_equity_counter_alex', cat: 't', from: 'Alex', focus: 'equity',
        body: (s, char, e) => {
          const jordan = e.chars.get('jordan');
          return (jordan && jordan.flags.equity_skipped)
            ? "you never even answered jordan on equity, so i'll say it: equal thirds isn't fair. she's got a day job to fall back on. i quit mine. we are not taking the same risk, and the split shouldn't pretend we are."
            : "i need to push back on equal thirds. jordan still has a paycheck coming in every two weeks. i gave that up. same equity for different risk isn't 'fair' — it just feels fair because it's round. i should be at least even with you.";
        },
        urgency: 22, weeks: 1,
        available: (s, char, e) => {
          const jordan = e.chars.get('jordan');
          return jordan && jordan.flags.equity_proposal === '33/33/33' && !jordan.flags.equity_counter_done && s.week <= 10;
        },
        options: [
          { label: "Give Alex 40%", key: 'cave_40',
            reply: "you're right. you're full-time, she's not. 40/40/20 — i'll tell jordan.",
            journal: null,
            execute(s, char, e) {
              const jordan = e.chars.get('jordan');
              if (jordan) { jordan.flags.equity_counter_done = true; jordan.flags.equity_proposal = '40/40/20'; }
              char.morale = clamp(char.morale + 10, 0, 100);
              return "Alex appreciated it. Jordan will hear about the change.";
            } },
          { label: 'Keep equal thirds', key: 'hold_33',
            reply: "i hear you, but equal thirds is the right call. everyone's essential. let's not let this fester.",
            journal: null,
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

      // 50/25/25 path — Alex comes at you first (his own thread). If you bump him to
      // 40/40/20, Jordan then hits you in hers (jordan_equity_counter_jordan). A
      // two-front fight, never a merged "heard from both" card.
      {
        id: 'jordan_equity_counter_alex_50', cat: 't', from: 'Alex', focus: 'equity',
        body: "you kept half? and you're handing me the same as jordan??? same hours, same code, same risk — and half says you don't see me as your equal. fix this.",
        urgency: 23, weeks: 1,
        available: (s, char, e) => {
          const jordan = e.chars.get('jordan');
          return jordan && jordan.flags.equity_proposal === '50/25/25' && !jordan.flags.equity_counter_done && s.week <= 10;
        },
        options: [
          { label: "You're right — you and me at 40, Jordan at 20", key: 'give_alex',
            reply: "you're right. you and i are doing the same work. 40/40/20 — i'll square it with jordan.",
            journal: null,
            execute(s, char, e) {
              const jordan = e.chars.get('jordan');
              if (jordan) jordan.flags.equity_proposal = '40/40/20';  // → Jordan now confronts you
              char.morale = clamp(char.morale + 8, 0, 100);
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "good. you and me at 40. i'm solid.",
                week: s.week, isNew: true, focus: 'equity', seq: e._seq++,
              });
              return "Alex is solid again. But Jordan's at 20 now — you'll hear from her.";
            } },
          { label: "Everyone equal — thirds across the board", key: 'equalize',
            reply: "you know what, you're both right. equal thirds. we're all essential, let's not poison this over points.",
            journal: null,
            execute(s, char, e) {
              const jordan = e.chars.get('jordan');
              if (jordan) { jordan.flags.equity_counter_done = true; jordan.flags.equity_proposal = '33/33/33'; }
              return "Equal thirds. You gave up your majority — but nobody's nursing a grudge.";
            } },
          { label: "I took the risk first — 50/25/25 stands", key: 'hold_50',
            reply: "i hear you. but i started this, i carry the most risk, and the split reflects that. 50/25/25. i need you with me on this.",
            journal: null,
            execute(s, char, e) {
              const jordan = e.chars.get('jordan');
              if (jordan) jordan.flags.equity_counter_done = true;
              char.morale = clamp(char.morale - 12, 0, 100);
              char.trust = clamp(char.trust - 8, 0, 100);
              return "Alex went quiet. 'Okay. You're the boss.' Something cooled between you.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          const jordan = e && e.chars && e.chars.get('jordan');
          if (jordan) jordan.flags.equity_counter_done = true;
          char.morale = clamp(char.morale - 12, 0, 100);
        },
      },

      {
        id: 'vision_mismatch', cat: 't', from: 'Alex',
        body: "i keep pitching this as 'casual dating done right.' you've been calling it 'serious relationships.' those are different products with different users. which are we actually building?",
        // urgency 12 + dev-clock window so it fills a gap in the sprint spine instead
        // of colliding head-on with the direction asks in the same 13 band.
        urgency: 12, weeks: 1,
        available: (s, char) => s.dev_start_week != null && s.week >= s.dev_start_week + 2
          && s.week <= s.dev_start_week + 8 && !s.has_demo
          && char.flags.commitment_resolved && !char.flags.vision_resolved,
        options: [
          { label: "Go with casual dating", key: 'alex',
            reply: "you're right, casual is the bigger market. let's go with your framing — 'casual dating done right.'",
            journal: "Conceded the framing to Alex — we're 'casual dating done right.' Broader market, easier to explain. A few old 'serious matches' conversations are awkward now, but at least we're aligned.",
            execute(s, char) { char.flags.vision_resolved = true; char.trust = clamp(char.trust + 8, 0, 100); char.morale = clamp(char.morale + 10, 0, 100); s.signal = clamp(s.signal - 4, 0, 100); return "Went with casual dating. Broader market, easier to explain. Some earlier conversations about 'serious matches' are now awkward, but at least you're aligned."; } },
          { label: 'Serious relationships', key: 'yours',
            reply: "i've been saying serious relationships because that's what we're building. the investor story is cleaner and the users pay more. i want to stay with that.",
            journal: "Held the line on serious relationships. Alex went along with it — he still thinks casual is bigger, but the investor story is cleaner. The tension isn't really gone.",
            execute(s, char) { char.flags.vision_resolved = true; s.signal = clamp(s.signal + 8, 0, 100); char.morale = clamp(char.morale - 8, 0, 100); char.trust = clamp(char.trust - 4, 0, 100); return "Alex went along with it. He thinks the casual market is bigger, but the investor story is cleaner. Tension unresolved."; } },
          { label: 'Test it with users', key: 'test',
            reply: "we're both guessing. let me run a quick test this week — 8 calls with real users. let's find out which framing actually resonates before we commit.",
            journal: "Instead of arguing, I ran eight quick user calls. People who want serious relationships hate swiping apps, and vice versa — two real segments. We're leading with the relationship-seekers: they pay more and churn less.",
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
            journal: "Noticed Alex had gone quiet. Checked in. Honest conversation — he's exhausted. Adjusted expectations for the week.",
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
            journal: "Revised the equity split. Both sides signed. Relationship's back on solid ground.",
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
            return "offer: i can take this sprint for user calls instead of code. the build slips a week — that's real. but we've been heads-down since the plan and honestly? it's starting to feel like we're building confidently in the dark.";
          const weeksAgo = s.week - (char.flags.lastDiscoveryWeek || 0);
          return weeksAgo >= 12
            ? `it's been ${weeksAgo} weeks since we last did discovery. things shift — worth a sprint to check if we're still solving the right problem?`
            : "we're back in build mode. it's only been a few weeks since we last talked to customers, but the queue keeps growing. do another round or keep building?";
        },
        urgency: 1, weeks: 1,
        // The build-vs-research trade stated as a standing offer from the start of the
        // dev arc (the old triple-gate meant it rarely surfaced before the demo).
        available: (s, char) => !s.launched && s.dev_start_week != null
          && s.week >= s.dev_start_week + 1 && char.focus === 'build'
          && s.market_fit < 80
          && s.week >= (char.flags.lastSyncToDiscover || 0) + 4,
        options: [
          { label: 'Yes — take the sprint for user calls', key: 'discover',
            execute(s, char) { char.focus = 'discover'; char.focusSprints = 1; char.flags.lastSyncToDiscover = s.week; char.flags.discoveryEverAgreed = true; char.flags.lastDiscoveryWeek = s.week; return "Agreed. Alex is on user calls this sprint — the build slows while he listens."; } },
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
            journal: "Lawyer reviewed Alex's previous employer IP agreement. Personal time, unrelated enough — no claim. IP assignment signed. Clean. $1,500.",
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
            journal: "Logged the feedback but staying the course for now. Alex isn't convinced either.",
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
            journal: "Locked in. Three users said the same thing unprompted this week: 'I actually went on a date because of this.' This is the product. Now build it right.",
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
            journal: "Long talk with Alex about family pressure. Reminded each other why we're doing this. Morale reset.",
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
            reply: "show it rough. tonight. i'd rather watch someone hit a wall than polish a guess.",
            execute(s, char, e) {
              s.has_demo = true; s.tech_debt += 12;
              s.waitlist += 2; s.market_fit = clamp(s.market_fit + 8, 0, 100);
              if (s.items) {
                if (s.items.matching_algo && s.items.matching_algo.status === 'active') { s.items.matching_algo.status = 'done'; s.items.matching_algo.quality = 'rough'; }
                if (s.items.api_design) s.items.api_design.status = 'active';
                if (!s.items.analytics) s.items.analytics = { status: 'todo', quality: null, assignee: null };
              }
              // Demo night: the first true stranger uses the app while Alex watches
              // the session live — a short focus arc (free beats, like launch day).
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "ok. jordan found us a real first tester — her sister's friend. total stranger, never seen the app. she's on tonight at 8 and i'm watching the session live. don't make plans.",
                week: s.week, isNew: true, focus: 'demo', seq: e._seq++,
              });
              s.focus = { id: 'demo', charIds: ['alex'] };
              return "Demo's out — rough edges and all. Tonight it goes in front of a total stranger for the first time, live, while Alex watches the session logs.";
            } },
          { label: 'One sprint to polish it first', key: 'polish',
            reply: "one sprint of polish first. if the first stranger hits a crash in minute one we learn nothing.",
            execute(s, char, e) {
              s.has_demo = true; s.tech_debt += 3;
              s.waitlist += 2; s.market_fit = clamp(s.market_fit + 4, 0, 100); s.signal = clamp(s.signal + 4, 0, 100);
              if (s.items) {
                if (s.items.matching_algo && s.items.matching_algo.status === 'active') { s.items.matching_algo.status = 'done'; s.items.matching_algo.quality = 'solid'; }
                if (s.items.api_design) s.items.api_design.status = 'active';
                if (!s.items.analytics) s.items.analytics = { status: 'todo', quality: null, assignee: null };
              }
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "polish sprint done — worst edges are gone. and jordan lined up our first true stranger: her sister's friend, tonight at 8. i'm watching the session live. don't make plans.",
                week: s.week, isNew: true, focus: 'demo', seq: e._seq++,
              });
              s.focus = { id: 'demo', charIds: ['alex'] };
              return "One sprint of cleanup, then out the door. Tonight the polished demo goes in front of a total stranger for the first time, live, while Alex watches the session logs.";
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

      // ── DEMO NIGHT FOCUS ARC (triggered by alex_demo_ready → rough/polish) ────
      // The first true stranger uses the app while Alex live-narrates the session.
      // Three free beats (focus:'demo', launch-arc pattern). The last one plants the
      // pivot seed as story: her first message is "so what happens now?" —
      // s.demo_question_seen lets pivot_open (jordan.js) echo it later.
      {
        id: 'demo_live_watch', cat: 'p', from: 'Alex', focus: 'demo',
        body: "she's in. no idea we're watching. she's been on the intake screen for 90 seconds — is that good or bad? i genuinely can't tell. nobody has ever used this without one of us narrating over their shoulder.",
        urgency: 19, patience: Infinity,
        available: (s, char) => s.focus && s.focus.id === 'demo' && !char.flags.demo_watch_done,
        options: [
          { key: 'watch', label: 'Say nothing — watch what she does',
            reply: "don't touch anything. watch what she does with it.",
            journal: null,
            execute(s, char, e) {
              char.flags.demo_watch_done = true;
              s.signal = clamp(s.signal + 3, 0, 100);
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "she typed an answer, deleted it, typed it again. four minutes on question 2. she's taking it seriously.",
                week: s.week, isNew: true, focus: 'demo', seq: e._seq++,
              });
              return null;
            } },
          { key: 'hint', label: 'Message her — she can skip ahead',
            reply: "ping her that it's ok to skip anything. i don't want to lose her on question 2.",
            journal: null,
            execute(s, char, e) {
              char.flags.demo_watch_done = true;
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "she skipped straight to the matches. faster — but now we'll never know if the questions were landing or losing her.",
                week: s.week, isNew: true, focus: 'demo', seq: e._seq++,
              });
              return null;
            } },
        ],
      },
      {
        id: 'demo_live_bug', cat: 'p', from: 'Alex', focus: 'demo',
        body: "problem. she's trying to upload a photo from her camera roll — it's a HEIC file and the uploader just spins. she's retried twice. do i push a converter hotfix while she's mid-session, or note it and let her hit the wall?",
        urgency: 18.5, patience: Infinity,
        available: (s, char) => s.focus && s.focus.id === 'demo' && char.flags.demo_watch_done && !char.flags.demo_bug_done,
        options: [
          { key: 'hotfix', label: 'Hotfix it live — she never knows',
            reply: "fix it now, while she's in there. first impressions don't get a second take.",
            journal: null,
            execute(s, char, e) {
              char.flags.demo_bug_done = true;
              s.tech_debt += 4;
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "pushed the converter mid-session. her third retry just worked — she thinks it was her wifi. also: we had zero HEIC handling, which is every iphone since 2017. adding it to the list.",
                week: s.week, isNew: true, focus: 'demo', seq: e._seq++,
              });
              return null;
            } },
          { key: 'note', label: 'Note it — see if she pushes through',
            reply: "leave it. i want to see what she does when it doesn't work.",
            journal: null,
            execute(s, char, e) {
              char.flags.demo_bug_done = true;
              s.signal = clamp(s.signal + 4, 0, 100);
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "she gave up on the photo and kept going anyway. still filling everything in. honestly? someone fighting through a broken uploader to finish a profile is the most encouraging bug report we will ever get.",
                week: s.week, isNew: true, focus: 'demo', seq: e._seq++,
              });
              return null;
            } },
        ],
      },
      {
        id: 'demo_first_message', cat: 'p', from: 'Alex', focus: 'demo',
        body: "ok. she finished the profile. matched with one of the seed-cohort guys. she just sent the first message and i have to read it to you verbatim: 'so what happens now?' …i've been staring at it for five minutes. i don't know what our app answers to that.",
        urgency: 18, patience: Infinity,
        available: (s, char) => s.focus && s.focus.id === 'demo' && char.flags.demo_bug_done && !char.flags.demo_arc_done,
        options: [
          { key: 'note', label: 'Write it down — verbatim',
            reply: "write it down exactly like that. 'so what happens now?' that one goes on the wall.",
            journal: "Demo night. A total stranger finished the flow, matched, and her first message was 'so what happens now?' Wrote it on a post-it and stuck it on the monitor. The product answered every question except the one that matters.",
            execute(s, char, e) {
              char.flags.demo_arc_done = true;
              s.demo_question_seen = true;
              s.market_fit = clamp(s.market_fit + 6, 0, 100);
              s.focus = null;  // demo night ends — the world un-holds
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "post-it's on the monitor. good night. weird night. the app works and i can't stop thinking about her question.",
                week: s.week, isNew: true, focus: 'demo', seq: e._seq++,
              });
              // Establishes the pre-launch fiction: a hand-recruited TestFlight
              // circle — a dozen friends-of-friends, explicitly NOT a launch. Every
              // pre-launch "tester" reference reads from this circle; real strangers
              // only arrive on launch day.
              e.pending.push({
                fireWeek: s.week + 1, from: 'Jordan', charId: 'jordan',
                text: "put the demo build on testflight for my sister's friend group — a dozen people, all vouched for. not a launch, just eyes on it while we build.",
              });
              return null;
            } },
        ],
      },

      // ═══ THE SLIDE (weeks L+1..L+3): three weeks of gravity after launch ═══════
      // Launch day ends on a high (launch_signal); these beats walk it back.
      // Two competing diagnoses of the same flat graph — Alex's density thesis
      // vs the retention failure — set up pivot day. Evidence banked here
      // (s.maya_quote, s.rachel_answer, s.alex_crack) detonates at the summit.
      {
        id: 'slide_hangover', cat: 'c', from: 'Alex',
        body: (s) => `morning-after math. we ended launch week at ${Math.max(4, s.users)} accounts. day one was the spike — yesterday 6 new, today 2. some comedown is normal: the email blast is spent, that traffic was never going to repeat. the number that actually matters is how many of them come back. i'll have a real answer friday.`,
        urgency: 12, weeks: 1,
        available: (s, char) => s.launched && s.activities_cut && !s.activities_pivot
          && s.week >= (s.launch_week || 0) + 1 && !char.flags.slide_hangover_done,
        options: [
          { label: 'Watch retention, not signups', key: 'retention',
            reply: "agreed — ignore the top of the funnel for now. friday, i want to know who came back.",
            journal: "Week one post-launch. The day-one spike is over. Told Alex the only number I care about is who comes back on Friday — retention, not signups.",
            execute(s, char, e) {
              char.flags.slide_hangover_done = true;
              s.signal = clamp(s.signal + 2, 0, 100);
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "that's the correct question. most founders ask the other one.",
                week: s.week, isNew: true, seq: e._seq++,
              });
              return "Friday it is. Whoever comes back is the real launch number.";
            } },
          { label: 'We need another traffic push', key: 'funnel',
            reply: "2 a day won't cut it. we need another traffic push this week.",
            journal: "Told Alex to run another traffic push. It netted five signups and cost two days. He was polite about it, but the lesson was loud: the leak isn't at the top of the funnel.",
            execute(s, char, e) {
              char.flags.slide_hangover_done = true;
              s.funnel_first = true;
              s.users += 5;
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "ran the re-blast plus a post in two local subreddits. five signups. cost us two days. the leak isn't at the top.",
                week: s.week, isNew: true, seq: e._seq++,
              });
              return "Five signups for two days of work. The leak isn't at the top.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.slide_hangover_done = true; },
      },
      {
        // Alex's rationalization of the flat graph — and it's *good*. The classic
        // cold-start read: density, not product. The counter-argument (option B)
        // only exists if the player banked pre-launch evidence.
        id: 'slide_alex_thesis', cat: 'p', from: 'Alex',
        body: (s) => {
          const base = `before anyone says the p-word: look at it from the marketplace side. ${Math.max(5, s.users)} accounts. in one city that's not a dating pool, it's a dinner party. matching is throwing darts — of course people bounce off three mediocre options and an empty screen. hinge's week three looked exactly like this. this is a density problem. the mixer, campus seeding, referrals — that's the fix. you don't redesign the menu because the restaurant is empty.`;
          return s.funnel_first
            ? base + " and monday you were the one asking for a traffic push — so part of you already agrees with me."
            : base;
        },
        urgency: 12, weeks: 1,
        available: (s, char) => s.launched && s.activities_cut && !s.activities_pivot
          && !s.pivot_summit_done && s.week >= (s.launch_week || 0) + 2
          && char.flags.slide_hangover_done && !char.flags.thesis_done,
        options: [
          { label: "Fair read — draft the growth plan", key: 'hear_him',
            reply: "it's a fair read. get me the growth plan — but i'm watching what happens *after* a match, not just how many we make.",
            journal: "Alex made the density case: too few users for matching to work, fix the room before you blame the menu. It's a fair read. I asked for the growth plan — and I'm watching what happens after a match.",
            execute(s, char) {
              char.flags.thesis_done = true;
              return "He's drafting the growth plan. You're watching the after-match numbers.";
            } },
          { label: 'The TestFlight circle says otherwise', key: 'push_back',
            reply: "the testflight circle was a dozen people who all knew each other — a full room, by your own logic. 11 of 14 matches still died. explain that with darts.",
            available: (s) => s.analytics_dropoff_seen || s.demo_question_seen,
            journal: "Alex made the density case and I hit him with the TestFlight circle: a dozen people who all knew each other, and 11 of 14 matches still died. He didn't have a clean answer. First crack in the wall.",
            execute(s, char, e) {
              char.flags.thesis_done = true;
              s.alex_crack = true;
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "…i don't have a clean answer to that one. friday's numbers will tell us.",
                week: s.week, isNew: true, seq: e._seq++,
              });
              return "He went quiet, then honest: no clean answer. Friday's numbers will tell.";
            } },
        ],
        dropDelay: 1, dropFrom: 'Alex',
        dropMsg: "taking the silence as agreement — starting on the growth plan. if you disagree, now's the time.",
        dropCancel: (s, char) => char.flags.thesis_done,
        dropFx(s, char) { char.flags.thesis_done = true; },
      },

      // ═══ PIVOT DAY — the summit focus arc (opened by pivot_summit_call) ════════
      // One Saturday, one whiteboard: Alex argues density, Priya argues retention,
      // the player decides. Launch-day machinery: focus:'pivot', free beats,
      // patience Infinity, chained by flags across alex/priya threads.
      {
        id: 'pivot_day_open', cat: 'p', from: 'Alex', focus: 'pivot',
        body: "saturday. office. i got here early and covered the whiteboard — two columns: DENSITY PROBLEM / PRODUCT PROBLEM. before priya shows up i want one thing said founder-to-founder: i'm going to argue my column as hard as i can today, because someone has to. but whatever you decide at 6pm, i build it. deal?",
        urgency: 20, patience: Infinity,
        available: (s, char) => s.focus && s.focus.id === 'pivot' && !char.flags.pd_open_done,
        options: [
          { key: 'deal', label: 'Deal — argue hard',
            reply: "deal. argue hard. i'd be worried if you didn't.",
            journal: null,
            execute(s, char) { char.flags.pd_open_done = true; return null; } },
        ],
      },
      {
        id: 'pivot_day_alex_case', cat: 'p', from: 'Alex', focus: 'pivot',
        body: (s) => `opening statement. ${Math.max(5, s.users)} accounts. a dating app under a few hundred users per city isn't a product yet — it's a raffle with bad odds. every user who left saw the same thing: three so-so matches, an empty discovery screen, silence. that experience drives people out of *hinge*, and hinge works. the mixer, campus ambassadors, a referral loop — six weeks, call it $1,500, and we're at 300 users and rerun the numbers. rebuilding the product off launch week's behavior is reading tea leaves and calling it data.`,
        urgency: 19.5, patience: Infinity,
        available: (s, char) => s.focus && s.focus.id === 'pivot' && char.flags.pd_open_done && !char.flags.pd_case_done,
        options: [
          { key: 'probe', label: 'What would prove you wrong?',
            reply: "steelman it for me then. what result would prove you wrong?",
            journal: null,
            execute(s, char, e) {
              char.flags.pd_case_done = true;
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "…fine. if the matches that were GOOD also died. good match, both active, conversation starts — and still nothing. density explains bad matches. it can't explain good ones going nowhere.",
                week: s.week, isNew: true, focus: 'pivot', seq: e._seq++,
              });
              return null;
            } },
          { key: 'challenge', label: 'When do we find out you were wrong?',
            reply: "your fix costs six weeks and the runway math doesn't have six spare. say your plan works — when do we find out it didn't?",
            journal: null,
            execute(s, char, e) {
              char.flags.pd_case_done = true;
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "…yeah. the math is the weakest part of my column.",
                week: s.week, isNew: true, focus: 'pivot', seq: e._seq++,
              });
              return null;
            } },
        ],
      },
      {
        // The hinge of the whole arc: what fires here depends entirely on what
        // the player banked. With analytics Alex pulls the cohort and converts
        // himself; without it the beat is hollow and the call runs on conviction.
        id: 'pivot_day_evidence', cat: 'p', from: 'Alex', focus: 'pivot',
        body: (s, char, e) => {
          const priya = e && e.chars && e.chars.get('priya');
          const asked = priya && priya.flags.pd_priya_done;
          const core = s.analytics_live
            ? "…okay. top-decile matches. mutual like, both users active, high score. eleven since launch. ten went: match — 'hey' — 'hey' — nothing. number eleven made it to five messages and died when he asked 'so what does your week look like?' and she never answered. …that's not a density failure. that's the app going silent at the exact moment it was supposed to have an answer."
            : "i can't split matches by quality. we never instrumented it — i've got total counts and my own memory of watching the logs. you're going to have to make this call on conviction, because i can't make it on data.";
          return s.jordan_resolved
            ? core + "\n\nfor the record: jordan called this in testflight. before everything. i argued with her too."
            : core;
        },
        urgency: 19, patience: Infinity,
        available: (s, char, e) => {
          const priya = e.chars.get('priya');
          return s.focus && s.focus.id === 'pivot' && priya && priya.flags.pd_priya_done && !char.flags.pd_evidence_done;
        },
        options: [
          { key: 'maya', label: "Maya's call — she liked her match",
            reply: "maya matched with a guy she *liked*. her words: 'it was just a chat window. i already have seven of those on hinge. kindred made me feel worse.' we didn't lose her to thin supply. we lost her after we delivered.",
            available: (s) => !!s.maya_quote,
            journal: null,
            execute(s, char, e) { pdPlayChip(s, char, e, 'maya'); return null; } },
          { key: 'rachel', label: "Rachel's email — 'a place to say yes'",
            reply: "rachel told me what she wanted, unprompted: 'i hoped the app would give one of us an excuse. a place to say yes to.' she wasn't asking for more matches.",
            available: (s) => !!s.rachel_answer,
            journal: null,
            execute(s, char, e) { pdPlayChip(s, char, e, 'rachel'); return null; } },
          { key: 'demo', label: "Demo night — 'so what happens now?'",
            reply: "the first stranger who ever touched this app finished the flow, matched, and typed 'so what happens now?' we've had the question since demo night. we just never answered it.",
            available: (s) => !!s.demo_question_seen,
            journal: null,
            execute(s, char, e) { pdPlayChip(s, char, e, 'demo'); return null; } },
          { key: 'circle', label: 'TestFlight circle — 11 of 14 died',
            reply: "and the testflight circle kills the density theory outright — twelve people, all friends of friends, everyone knew everyone. 11 of 14 matches died anyway.",
            available: (s) => !!s.analytics_dropoff_seen,
            journal: null,
            execute(s, char, e) { pdPlayChip(s, char, e, 'circle'); return null; } },
          { key: 'gut', label: 'A feeling and a flat graph',
            reply: "i don't have clean data. i have a feeling and a flat graph.",
            journal: null,
            execute(s, char, e) { pdPlayChip(s, char, e, 'gut'); return null; } },
        ],
      },
      {
        id: 'pivot_day_cost', cat: 'p', from: 'Alex', focus: 'pivot',
        body: (s, char, e) => {
          const weeks = Math.max(0, Math.floor((s.cash - 2000) / (e ? e.burnPerWeek : 500)));
          return `cost column, because someone has to write it. rebuild: three weeks, call it $2k all-in. that leaves us relaunching with ${weeks} weeks of cash — i did the division twice hoping i'd made an error. if we pivot and i was right about density — we die having built two products nobody used. if we push growth and priya's right — we spend our last dollars marketing a dead end. wrong in either direction is the same grave. it just has different flowers.`;
        },
        urgency: 18, patience: Infinity,
        available: (s, char, e) => {
          const priya = e.chars.get('priya');
          return s.focus && s.focus.id === 'pivot' && priya && priya.flags.pd_shape_done && !char.flags.pd_cost_done;
        },
        options: [
          { key: 'ack', label: 'Write it in red — then we decide',
            reply: "noted. write it in red. now let's decide anyway — that's the job.",
            journal: null,
            execute(s, char) { char.flags.pd_cost_done = true; return null; } },
        ],
      },
      {
        id: 'pivot_day_decide', cat: 'p', from: 'Alex', focus: 'pivot',
        body: "6pm. board's full. both columns argued. your company, your call: what are we building monday morning?",
        urgency: 17, patience: Infinity,
        available: (s, char) => s.focus && s.focus.id === 'pivot' && char.flags.pd_cost_done && !char.flags.pd_decide_done,
        options: [
          { key: 'pivot', label: 'We pivot — the plan is the product',
            reply: "we pivot. the plan is the product — a match needs somewhere to go, and monday we start building the somewhere.",
            journal: "Pivot day, 6pm. I called it: we pivot. The thing you browse won't be a person anymore — it'll be a plan. Three weeks, $2k, and Kindred becomes a calendar with people attached.",
            execute(s, char, e) {
              char.flags.pd_decide_done = true;
              s.pivot_summit_done = true;
              s.pivot_choice = 'pivot';
              s.activities_pivot = true;
              s.pivot_week = s.week;
              s.cash = clamp(s.cash - 2000, 0, 9999999);
              s.market_fit = clamp(s.market_fit + 15, 0, 100);
              applyActivitiesPivot(s);
              const jordan = e.chars.get('jordan');
              if (jordan && jordan.active) jordan.morale = clamp(jordan.morale + 5, 0, 100);
              if (s.alex_converted) {
                // He argued himself out of his own column — the rebuild starts
                // committed, with a head start on the pivot effort clock.
                const te = (char.buildEffort || 0) + (jordan && jordan.active ? (jordan.buildEffort || 0) : 0);
                s.pivot_effort_base = te - 1.0;
                e.threads.alex.push({
                  type: 'incoming', from: 'Alex',
                  body: "yeah. honestly? i got there around 4 o'clock — number eleven did it. monday. erase my column.",
                  week: s.week, isNew: true, focus: 'pivot', seq: e._seq++,
                });
              } else {
                char.morale = clamp(char.morale - 10, 0, 100);
                e.threads.alex.push({
                  type: 'incoming', from: 'Alex',
                  body: "okay. on the record: not convinced. but i said i'd build whatever you decide, and i meant it.",
                  week: s.week, isNew: true, focus: 'pivot', seq: e._seq++,
                });
              }
              return null;
            } },
          { key: 'growth', label: "Alex is right — all-in on density",
            reply: "alex is right — the room's just empty. we don't touch the product. all-in on density: mixer, ambassadors, referrals.",
            journal: "Pivot day, 6pm. I sided with Alex: it's a density problem. We don't touch the product — mixer, ambassadors, referrals. Priya left me one number to watch: of the next 50 matches, how many turn into a plan to meet.",
            execute(s, char, e) {
              char.flags.pd_decide_done = true;
              s.pivot_summit_done = true;
              s.pivot_choice = 'growth';
              s.pivot_deferred = true;
              s.pivot_summit_week = s.week;
              s.signal = clamp(s.signal + 4, 0, 100);
              char.morale = clamp(char.morale + 6, 0, 100);
              e.pending.push({
                fireWeek: s.week + 2, from: 'Alex', charId: 'alex',
                text: "mixer report: 40 rsvps, 19 showed, 11 installed on the spot. good night, honestly. i'm watching the after-match numbers like a hawk, like you asked.",
                fx(st) { st.users += 20; },
                cancel: (st) => st.activities_pivot,
              });
              return null;
            } },
          { key: 'hedge', label: 'Split it — tab, deck, and growth',
            reply: "split it. keep the deck, add an activities tab, push growth too. cover every base.",
            journal: "Pivot day, 6pm. I split the difference: keep the deck, bolt on an activities tab, push growth too. Priya said it out loud — that's not a strategy, it's a hedge. We'll see who's right.",
            execute(s, char) {
              char.flags.pd_decide_done = true;
              s.pivot_summit_done = true;
              s.pivot_choice = 'hedge';
              s.pivot_hedged = true;
              s.pivot_summit_week = s.week;
              s.market_fit = clamp(s.market_fit + 5, 0, 100);
              s.cash = clamp(s.cash - 800, 0, 9999999);
              return null;
            } },
        ],
      },

      // ═══ AFTERMATH ═════════════════════════════════════════════════════════════
      {
        // The bookend — only exists if the player called Maya during the slide.
        id: 'pivot_payoff_maya', cat: 'c', from: 'Alex',
        body: "small thing. maya — launch-day maya, the one you called — just RSVP'd to a thursday climbing plan. she came back on her own. someone must have told her it's a different app now.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.pivot_shipped && !!s.maya_quote && !char.flags.maya_payoff_done,
        options: [
          { label: 'It is a different app now', key: 'ack',
            reply: "it is a different app now. she told us exactly what was wrong with the old one — feels right that she's first back.",
            journal: "Maya came back. The first launch-day signup, the one who told me the app made her feel worse — she RSVP'd to a Thursday climbing plan on her own. That's the whole pivot in one notification.",
            execute(s, char) {
              char.flags.maya_payoff_done = true;
              s.signal = clamp(s.signal + 5, 0, 100);
              return "The first churned user, back on her own. That's the whole pivot in one notification.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.maya_payoff_done = true; },
      },
      {
        // The redemption card: three weeks after choosing growth (or the hedge),
        // Priya's number comes due. Being wrong is recoverable exactly once,
        // at a price — later, costlier, with runway nearly spent.
        id: 'pivot_fifty_verdict', cat: 'p', from: 'Alex',
        body: (s) => {
          const core = "i kept priya's tally on the whiteboard. we're at 61 new signups since the summit — the growth push worked, you were right about that part. matches since the summit: 54. plans to meet: zero. not low. zero. i erased my column this morning. how much runway do we have left?";
          return s.pivot_choice === 'hedge'
            ? core + " and the events tab has 9 views. the deck is still the front door. half-pivots don't count — i checked."
            : core;
        },
        urgency: 13, weeks: 1,
        available: (s, char) => (s.pivot_choice === 'growth' || s.pivot_choice === 'hedge')
          && !s.activities_pivot && s.launched
          && s.week >= (s.pivot_summit_week || 0) + 3 && !char.flags.fifty_done,
        options: [
          { label: 'Pivot now — late beats never', key: 'pivot_now',
            reply: "zero at fifty. priya said we'd know, and we know. we pivot — now, with whatever runway is left.",
            journal: "Zero plans to meet out of 54 matches. Alex erased his own column. We're pivoting late — $3k instead of $2k, with runway nearly spent. The lesson was on the whiteboard three weeks ago.",
            execute(s, char, e) {
              char.flags.fifty_done = true;
              s.activities_pivot = true;
              s.pivot_week = s.week;
              s.cash = clamp(s.cash - 3000, 0, 9999999);
              s.market_fit = clamp(s.market_fit + 8, 0, 100);
              applyActivitiesPivot(s);
              const jordan = e.chars.get('jordan');
              if (jordan && jordan.active) jordan.morale = clamp(jordan.morale + 3, 0, 100);
              return "Pivoting three weeks late. $3k, less runway, same rebuild. Alex is already sketching the plans screen — he got there on his own this time.";
            } },
          { label: 'Ride Plan A down', key: 'ride',
            reply: "we made our call at the summit. we ride it.",
            journal: "54 matches, zero plans to meet — and I chose to ride Plan A anyway. Alex went quiet. Priya stopped texting.",
            execute(s, char) {
              char.flags.fifty_done = true;
              s.market_fit = clamp(s.market_fit - 15, 0, 100);
              s.signal = clamp(s.signal - 15, 0, 100);
              char.morale = clamp(char.morale - 10, 0, 100);
              return "Riding Plan A. The graph doesn't care about resolve.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) {
          char.flags.fifty_done = true;
          s.market_fit = clamp(s.market_fit - 15, 0, 100);
          s.signal = clamp(s.signal - 15, 0, 100);
          char.morale = clamp(char.morale - 12, 0, 100);
        },
      },
      {
        // The post-launch flailing trap: traction is flat and Alex offers to
        // throw features at the graph. Saying yes ships noise; the right call
        // holds the roadmap until you know why users leave. Low urgency on
        // purpose — it surfaces in a lull, not during the launch-week flood.
        // Scored by scoring.js ("Features Won't Save You").
        id: 'feature_spree', cat: 'p', from: 'Alex',
        body: "signups are flat and i keep staring at the graph. i could bang out icebreaker prompts, streaks, read receipts — pick one and it's live by friday. something will stick, right?",
        // Slide week 3: Alex's coping mechanism surfaces while the pivot idea
        // hangs in the air — spine urgency so the trap is actually faced.
        urgency: 12, weeks: 1,
        available: (s, char) => s.launched && !s.pivot_shipped && s.users >= 3
          && s.week >= (s.launch_week || 0) + 3
          && !char.flags.feature_spree_done,
        options: [
          { label: 'Pick one and ship it — something will stick', key: 'spree',
            reply: "pick one and ship it. motion beats meetings.",
            journal: "Let Alex ship streaks by Friday. It was live, it was shiny, and the graph didn't move. We're guessing.",
            execute(s, char, e) {
              char.flags.feature_spree_done = true;
              s.feature_spree = true;
              s.market_fit = clamp(s.market_fit - 6, 0, 100);
              s.signal = clamp(s.signal - 4, 0, 100);
              e.pending.push({
                fireWeek: s.week + 1, from: 'Alex', charId: 'alex',
                text: "streaks is live. daily active streak users: 1. it's me.",
              });
              return "Streaks shipped by Friday. A handful of users tapped it once. The graph didn't move — you're not learning, you're guessing.";
            } },
          { label: "Nothing new ships until we know why they leave", key: 'no',
            journal: "Told Alex nothing new ships until we know why users leave. He grumbled, then admitted the streaks idea was a dice roll.",
            execute(s, char) {
              char.flags.feature_spree_done = true;
              s.market_fit = clamp(s.market_fit + 4, 0, 100);
              char.morale = clamp(char.morale - 4, 0, 100);
              return "You held the line: no new features until you know why users leave. Alex grumbled, then admitted the streaks idea was a dice roll.";
            } },
        ],
        dropDelay: 1, dropFrom: 'Alex',
        dropMsg: "went ahead and shipped streaks while you were quiet. a few taps, then nothing. the graph didn't move.",
        dropCancel: (s, char) => char.flags.feature_spree_done,
        dropFx(s, char) {
          char.flags.feature_spree_done = true;
          s.feature_spree = true;
          s.market_fit = clamp(s.market_fit - 4, 0, 100);
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
            journal: "Shipped the pivot. Different product under the same name. The first activity was created within an hour.",
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
        body: "before we point real strangers at this: honesty hour. password-reset emails land in spam. the match queue crashes on profiles with zero photos. and i'm about 80% sure you can see other people's photos by editing a url. one hardening week and i can sleep at night. or we ship as-is and firefight.",
        urgency: 12, weeks: 1,
        available: (s, char) => s.has_demo && !char.flags.rebuild_triggered
          && s.week >= (char.flags.rebuild_last || 0) + 4,
        options: [
          { label: 'Take the hardening week', key: 'commit',
            reply: "take the week. fix the resets, the crash, and for god's sake the photo urls. then we point strangers at it.",
            execute(s, char) {
              char.flags.rebuild_triggered = true;
              s.productPhase = "product";
              s.tech_debt = Math.max(0, s.tech_debt - 8);
              s.waitlist += 5; s.market_fit = clamp(s.market_fit + 8, 0, 100);
              grantEffort(char, 1.0);
              return "One week of deeply unglamorous work: spam headers fixed, the zero-photo crash squashed, photo urls signed. Nothing to demo, everything to trust. Word's getting around — 5 people asked for early access.";
            } },
          { label: "Ship as-is — we'll firefight", key: 'delay',
            reply: "no hardening week. we ship with the bugs and firefight — write them on the whiteboard so we at least know our own landmines.",
            journal: "Skipped the hardening week — the bugs are on the whiteboard under the heading 'known landmines.' Alex didn't argue. He just circled the photo-url one twice.",
            execute(s, char) {
              char.flags.rebuild_triggered = true;
              s.productPhase = "product";
              s.tech_debt += 5;
              char.morale = clamp(char.morale - 3, 0, 100);
              grantEffort(char, 0.6);
              return "No hardening week. The known bugs went up on the whiteboard under 'landmines.' Alex didn't argue — he just circled the photo-url one twice.";
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
            reply: "ship it. we're launching.",
            journal: null,
            execute(s, char, e) {
              s.launched = true; s.launch_week = s.week; s.signal = clamp(s.signal + 12, 0, 100);
              e.finishItemsAtLaunch();
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "tomorrow 8am. game on.",
                week: s.week, isNew: true, seq: e._seq++,
              });
              // Enter launch focus arc — the day plays out beat by beat
              s.launch_time = '8AM';
              s.focus = { id: 'launch', charIds: ['alex', 'jordan'] };
              if (s.market_fit < 40) return "Launched. Users are signing up but not sticking around — the product doesn't match what they actually needed. Expect churn.";
              return "Launched. First real users are in. Feedback starts flowing.";
            } },
          { label: 'Two more weeks', key: 'wait',
            journal: "Polished a few more things instead of launching. Alex thinks I'm stalling — and he might be right.",
            execute(s, char) { s.good_enough_last = s.week; char.morale = clamp(char.morale - 12, 0, 100); return "Polished a few more things. Alex thinks you're stalling — and he might be right."; } },
        ],
        dropDelay: 1, dropFrom: 'Alex',
        dropMsg: "another week building in a vacuum. runway is ticking and real users are waiting.",
        dropFx(s, char) { s.cash = clamp(s.cash - 800, 0, 9999999); char.morale = clamp(char.morale - 10, 0, 100); },
      },

      // ── LAUNCH FOCUS ARC (triggered by good_enough_launch → ship) ────────────
      // Launch day plays out as a sequence of beats. Alex and Jordan each hold one
      // active slot; decisions in one beat can open or close paths in the next.
      // All cards are free (focus arc) and tagged focus:'launch'.
      {
        id: 'launch_preflight', cat: 'e', from: 'Alex', focus: 'launch',
        body: "email's queued — 847 addresses. want a quick look before i hit send, or we go now?",
        urgency: 20, patience: Infinity,
        available: (s, char) => s.focus && s.focus.id === 'launch' && !char.flags.preflight_done,
        options: [
          { key: 'review', label: 'Quick review — two minutes',
            reply: "quick review first.",
            journal: null,
            execute(s, char, e) {
              char.flags.preflight_done = true;
              s.launch_time = '9AM';
              e.threads.jordan.push({
                type: 'incoming', from: 'Jordan',
                body: "i'm keeping an eye on the site.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              return null;
            } },
          { key: 'send', label: 'Send it — we\'re ready',
            reply: "send it. we're ready.",
            journal: null,
            execute(s, char, e) {
              char.flags.preflight_done = true;
              s.launch_email_mistake = true;
              s.launch_time = '9AM';
              e.threads.jordan.push({
                type: 'incoming', from: 'Jordan',
                body: "i'm keeping an eye on the site.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "oh no. subject line on the blast says 'test - do not send'. went to all 847 people.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              // deferred: Alex mentions unsubscribes next week
              e.pending.push({
                fireWeek: s.week + 1, from: 'Alex', charId: 'alex',
                text: "checked the stats — about 80 people unsubscribed after the launch email. the test subject line thing. annoying but recoverable.",
                cancel: (st) => !st.launch_email_mistake,
              });
              return null;
            } },
        ],
      },

      {
        id: 'launch_email_pulse', cat: 'e', from: 'Alex', focus: 'launch',
        body: "30 minutes since the blast. open rate's at 19% — solid. 6 click-throughs. nobody's signed up yet. want me to keep watching?",
        urgency: 19.5, patience: Infinity,
        available: (s, char) => s.focus && s.focus.id === 'launch' && char.flags.preflight_done && !char.flags.email_pulse_done,
        options: [
          { key: 'yes', label: 'Yes — keep an eye on it',
            reply: "keep watching. ping me when someone signs up.",
            journal: null,
            execute(s, char, e) {
              char.flags.email_pulse_done = true;
              s.launch_time = '10AM';
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "47 opens, 8 click-throughs. rate's holding at 19%. most people haven't seen it yet — opens usually spike after lunch.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              return null;
            } },
          { key: 'no', label: "No — step away. Stats don't make signups happen.",
            reply: "step away. watching the numbers won't make people sign up faster.",
            journal: null,
            execute(s, char) {
              char.flags.email_pulse_done = true;
              s.launch_time = '10AM';
              return null;
            } },
        ],
      },

      {
        id: 'launch_staging_bug_discover', cat: 'e', from: 'Alex', focus: 'launch',
        body: "hold on. signups are coming in but the match pipeline is completely silent — not a single match in 45 minutes. something is wrong. pulling logs.",
        urgency: 19, patience: Infinity,
        available: (s, char, e) => {
          const jordan = e.chars.get('jordan');
          return s.focus && s.focus.id === 'launch' && char.flags.preflight_done && jordan && jordan.flags.first_bounce_done && !char.flags.staging_bug_seen;
        },
        options: [
          { key: 'check', label: "What's happening?",
            reply: "what's wrong?",
            journal: null,
            execute(s, char, e) {
              char.flags.staging_bug_seen = true;
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "one sec.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              return null;
            } },
        ],
      },

      {
        id: 'launch_staging_bug_found', cat: 'e', from: 'Alex', focus: 'launch',
        body: "oh no. oh no oh no. we're on the staging database. the env var is pointing at staging. every signup since 8am has been going into the test environment — none of them can see each other. we have real users in a ghost app.",
        urgency: 19, patience: Infinity,
        available: (s, char) => s.focus && s.focus.id === 'launch' && char.flags.staging_bug_seen && !char.flags.staging_bug_diagnosed,
        options: [
          { key: 'options', label: "What are our options?",
            reply: "okay. what are our options?",
            journal: null,
            execute(s, char, e) {
              char.flags.staging_bug_diagnosed = true;
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "hotfix — i swap the env var and redeploy. 5 minutes but if prod hiccups during deploy we could end up with a corrupted state. or maintenance page, fix it clean, back up in 30. or we wait — peak traffic is tonight, most people haven't opened the email yet.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              return null;
            } },
        ],
      },

      {
        id: 'launch_staging_bug_decide', cat: 'e', from: 'Alex', focus: 'launch',
        body: "ready to move. what's the call?",
        urgency: 19, patience: Infinity,
        available: (s, char) => s.focus && s.focus.id === 'launch' && char.flags.staging_bug_diagnosed && !char.flags.staging_done,
        options: [
          { key: 'hotfix', label: 'Push the hotfix — 5 minutes of risk',
            reply: "push it. 5 minutes of risk is better than 30 minutes of downtime.",
            journal: null,
            execute(s, char, e) {
              char.flags.staging_done = true;
              char.flags.did_hotfix = true;
              s.launch_time = '11AM';
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "deploying.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "done. pointed at prod. pipeline's running. first real matches should show up in the next few minutes.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              return null;
            } },
          { key: 'takedown', label: 'Take it down — fix it cleanly',
            reply: "take it down. fix it right. i'd rather have 30 minutes of downtime than a corrupted state.",
            journal: null,
            execute(s, char, e) {
              char.flags.staging_done = true;
              s.launch_time = '11AM';
              s.press_bounce = true;
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "maintenance page up. fixing the env var. back up in 20-30 min.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "back online. took 25 minutes. env is correct, pipeline is running. some early visitors hit the maintenance page.",
                week: s.week, isNew: true, focus: 'launch', launchTime: '11:30AM', seq: e._seq++,
              });
              s.launch_time = '12PM';
              return null;
            } },
          { key: 'wait', label: "Wait — peak traffic is tonight",
            reply: "wait. peak traffic is tonight. we fix it properly this afternoon before people actually open the app.",
            journal: null,
            execute(s, char, e) {
              char.flags.staging_done = true;
              s.launch_time = '11AM';
              s.press_bounce = true;
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "ok. every signup right now is in limbo but nobody knows it yet. let's hope nobody tries to use it before we fix it.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              return null;
            } },
        ],
      },

      {
        id: 'launch_test_profiles_notice', cat: 'e', from: 'Alex', focus: 'launch',
        body: "hey — while i was swapping the env var i was looking at the db schema to make sure the migration ran clean. we still have test accounts in there.",
        urgency: 18, patience: Infinity,
        available: (s, char, e) => {
          const jordan = e.chars.get('jordan');
          return s.focus && s.focus.id === 'launch' && char.flags.did_hotfix && jordan && jordan.flags.hustle_done && !char.flags.test_profiles_seen;
        },
        options: [
          { key: 'how_many', label: 'How many?',
            reply: "how many test accounts?",
            journal: null,
            execute(s, char, e) {
              char.flags.test_profiles_seen = true;
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "checking.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              return null;
            } },
        ],
      },

      {
        id: 'launch_test_profiles_scope', cat: 'e', from: 'Alex', focus: 'launch',
        body: "6 test accounts total. most are obviously fake — no photo, username like 'test_user_001'. but sarah_test_003 has a real photo and a full bio. she's been in there since the first test builds. she matched with 3 real users. two of them already sent her messages. she replied with lorem ipsum filler from when we seeded the db.",
        urgency: 18, patience: Infinity,
        available: (s, char) => s.focus && s.focus.id === 'launch' && char.flags.test_profiles_seen && !char.flags.test_profiles_scoped,
        options: [
          { key: 'damage', label: 'Have they figured out she\'s fake?',
            reply: "do the users know she's a test account?",
            journal: null,
            execute(s, char, e) {
              char.flags.test_profiles_scoped = true;
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "not yet. the replies look normal enough that they probably think she's just slow to respond. but if either of them sends another message and gets lorem ipsum back, it's going to be obvious. what do you want to do?",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              return null;
            } },
        ],
      },

      {
        id: 'launch_test_profiles_decide', cat: 'e', from: 'Alex', focus: 'launch',
        body: "i can delete all 6 right now. or we tell those two users what happened. or we leave it and hope nobody notices.",
        urgency: 18, patience: Infinity,
        available: (s, char) => s.focus && s.focus.id === 'launch' && char.flags.test_profiles_scoped && !char.flags.test_profiles_done,
        options: [
          { key: 'disclose', label: 'Email the affected users — be honest',
            reply: "email them both. apologize, explain what happened, give them a free month.",
            journal: null,
            execute(s, char, e) {
              char.flags.test_profiles_done = true;
              s.honest_launch = true;
              s.launch_time = '4PM';
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "done. two emails out, deleted all 6 test accounts. one user already replied — said he appreciated us catching it. the other hasn't opened it yet.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              return null;
            } },
          { key: 'delete', label: 'Quietly delete them — nobody will know',
            reply: "just delete all of them now. those matches weren't real anyway.",
            journal: null,
            execute(s, char, e) {
              char.flags.test_profiles_done = true;
              s.silent_delete = true;
              s.launch_time = '4PM';
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "deleted. those two users just lost a match without knowing why.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              e.pending.push({
                fireWeek: s.week + 2, from: 'Jordan', charId: 'jordan',
                text: "one of the users who matched with sarah_test_003 just reached out — they want to know why their match disappeared. what do i tell them?",
                cancel: (st) => !st.silent_delete,
              });
              return null;
            } },
          { key: 'nothing', label: 'Leave them — not worth the disruption on day one',
            reply: "leave them for now. we'll clean it up tonight. one fake profile isn't worth disrupting real users mid-launch.",
            journal: null,
            execute(s, char) {
              char.flags.test_profiles_done = true;
              s.test_profiles_live = true;
              s.launch_time = '4PM';
              return null;
            } },
        ],
      },

      {
        id: 'launch_stripe_sting_discover', cat: 'e', from: 'Alex', focus: 'launch',
        body: "first upgrade attempt. user in SF hit the premium button. stripe rejected it — 'your account cannot currently make live charges.' we built the whole payment flow, tested it perfectly, but never finished the business verification. we literally cannot accept money right now.",
        urgency: 16, patience: Infinity,
        available: (s, char, e) => {
          const jordan = e.chars.get('jordan');
          const abuser_resolved = s.jordan_left_watch || (jordan && jordan.flags.abuser_done);
          return s.focus && s.focus.id === 'launch' && char.flags.staging_done && abuser_resolved && !char.flags.stripe_contacted;
        },
        options: [
          { key: 'fix', label: 'Fix it — what do we need to do?',
            reply: "fix it. what do we need?",
            journal: null,
            execute(s, char, e) {
              char.flags.stripe_contacted = true;
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "on it. reading the stripe activation docs and getting someone on their support chat.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              return null;
            } },
        ],
      },

      {
        id: 'launch_stripe_sting_research', cat: 'e', from: 'Alex', focus: 'launch',
        body: "okay so. i got someone on stripe's support chat. we need to submit: business type, EIN, bank account for payouts, and they run an identity check on whoever owns the account. i read through the full verification docs while i was waiting.",
        urgency: 16, patience: Infinity,
        available: (s, char) => s.focus && s.focus.id === 'launch' && char.flags.stripe_contacted && !char.flags.stripe_researched,
        options: [
          { key: 'timeline', label: 'How long does verification take?',
            reply: "how long does it take once we submit?",
            journal: null,
            execute(s, char, e) {
              char.flags.stripe_researched = true;
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "stripe says 1 to 3 business days. minimum. and that's after we submit everything, which i don't have ready right now. so realistically — not today. she's been sitting on a failed payment for 20 minutes.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              return null;
            } },
        ],
      },

      {
        id: 'launch_stripe_sting_decide', cat: 'e', from: 'Alex', focus: 'launch',
        body: "what do we tell the user?",
        urgency: 16, patience: Infinity,
        available: (s, char) => s.focus && s.focus.id === 'launch' && char.flags.stripe_researched && !char.flags.stripe_done,
        options: [
          { key: 'fix_now', label: 'Tell her honestly — she\'ll be first when it\'s live',
            reply: "email her. be honest — our fault, payment system isn't activated yet. she'll be first to retry when it is.",
            journal: null,
            execute(s, char) {
              char.flags.stripe_done = true;
              s.first_paid = true;
              s.launch_time = '6PM';
              return null;
            } },
          { key: 'free_month', label: 'Give her a free month — she earned it',
            reply: "email her. apologize. give her a free month while we get the account activated.",
            journal: null,
            execute(s, char) {
              char.flags.stripe_done = true;
              s.launch_time = '6PM';
              return null;
            } },
          { key: 'wait', label: 'Say nothing — hope she retries herself',
            reply: "say nothing for now. she probably just thinks her card failed. she might retry on her own.",
            journal: null,
            execute(s, char) {
              char.flags.stripe_done = true;
              s.first_churn = true;
              s.launch_time = '6PM';
              return null;
            } },
        ],
      },

      {
        id: 'launch_inbox_question', cat: 'e', from: 'Alex', focus: 'launch',
        body: "first support email just hit the inbox — 'i signed up but i don't understand how matching works. when will i get someone?' what should i tell her?",
        urgency: 18.5, patience: Infinity,
        available: (s, char, e) => {
          const jordan = e.chars.get('jordan');
          return s.focus && s.focus.id === 'launch' && jordan && jordan.flags.first_signup_live_done && !char.flags.inbox_question_done;
        },
        options: [
          { key: 'personal', label: 'Reply personally',
            reply: "reply from me personally. first user gets a real answer.",
            journal: null,
            execute(s, char, e) {
              char.flags.inbox_question_done = true;
              s.launch_time = '12PM';
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "done. she responded: 'omg the founder replied — so cool!'",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              return null;
            } },
          { key: 'faq', label: 'Write a 3-line FAQ answer',
            reply: "write a quick faq answer. we'll need the template anyway.",
            journal: null,
            execute(s, char, e) {
              char.flags.inbox_question_done = true;
              s.launch_time = '12PM';
              s.faq_started = true;
              e.threads.alex.push({
                type: 'incoming', from: 'Alex',
                body: "wrote 3 lines, sent it. she said 'thanks!' — first ticket closed.",
                week: s.week, isNew: true, focus: 'launch', launchTime: s.launch_time || null, seq: e._seq++,
              });
              return null;
            } },
          { key: 'wait', label: "Leave it — the product should explain itself",
            reply: "leave it. if the product needs a manual, that's the real problem.",
            journal: null,
            execute(s, char) {
              char.flags.inbox_question_done = true;
              s.launch_time = '12PM';
              return null;
            } },
        ],
      },

      {
        id: 'alex_wants_rebuild', cat: 'p', from: 'Alex',
        body: "the current approach won't scale past 100 users. i know it's 2 weeks of work but if we don't do it now, it'll take 3x longer later.",
        urgency: 2, weeks: 2,
        available: (s, char) => !s.alex_rebuild_done && char.focus === 'build' && (s.has_demo || s.tech_debt >= 20),
        options: [
          { label: 'Do the refactor', key: 'refactor',
            journal: "Gave Alex two weeks to rebuild the API layer from scratch. Nothing else gets done — but if he's right, it'll save us months later.",
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
        // Spine band: the drift arc gates the launch, so it can't queue for weeks
        // behind direction cards the way urgency 2 now would.
        urgency: 12, weeks: 1,
        available: (s, char, e) => {
          const j = e.chars.get('jordan');
          return s.jordan_active && !s.jordan_drifting && s.week >= 8 && !j.flags.drift_start_done;
        },
        options: [
          { label: 'Talk to Jordan directly', key: 'talk',
            journal: "Talked to Jordan directly about slowing down. She was apologetic, said it's temporary. I'm not sure.",
            execute(s, char, e) {
              const j = e.chars.get('jordan');
              j.flags.drift_start_done = true;
              s.jordan_drifting = true;
              j.focus = null;
              char.morale = clamp(char.morale - 5, 0, 100);
              return "Jordan was apologetic. Said it's temporary. You're not sure.";
            } },
          { label: 'Alex can cover for now', key: 'cover',
            journal: "Let Alex cover for Jordan. He nodded, but his backlog just got longer.",
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
        urgency: 12, weeks: 1,
        available: (s, char, e) => {
          const j = e.chars.get('jordan');
          return s.jordan_drifting && !s.jordan_resolved
            && (j.flags.drag_count || 0) < 2
            && s.week >= (j.flags.drag_last || 0) + 4;
        },
        options: [
          { label: 'Talk to Jordan directly', key: 'talk',
            journal: "Sat down with Jordan. She heard the weight of it. Alex noticed I followed up.",
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
            journal: "Gave Jordan two more weeks. Alex wasn't happy. The clock is running.",
            execute(s, char, e) {
              const j = e.chars.get('jordan');
              j.flags.launch_blocker_wait = (j.flags.launch_blocker_wait || 0) + 1;
              char.morale = clamp(char.morale - 8, 0, 100);
              return "Alex wasn't happy. Jordan said she'd prioritize it. The clock is running.";
            },
            available: (s, char, e) => (e.chars.get('jordan').flags.launch_blocker_wait || 0) < 1 },
          { label: 'Confront Jordan — this has to be resolved', key: 'confront',
            journal: "Decided to confront Jordan about the launch blocker. This conversation is overdue.",
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
            journal: "Gave Jordan one more sprint. Alex went quiet. We both know how this ends.",
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
            journal: "Hired a lawyer to clean up Jordan's equity. $2,000, buyback agreement signed. Cap table clean.",
            execute(s, char, e) {
              e.chars.get('jordan').flags.cap_table_done = true;
              s.jordan_cleanup_needed = false;
              s.cash = clamp(s.cash - 2000, 0, 9999999);
              return "Lawyer drafted a buyback agreement. Jordan signed for a nominal amount. Cap table clean.";
            } },
          { label: "Can't afford it right now", key: 'defer',
            journal: "Can't afford cap table cleanup right now. Every investor who looks will ask about Jordan's stake.",
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
