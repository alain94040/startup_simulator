// ─────────────────────────────────────────────────────────────────────────────
// tests/harness.js — shared driver + game-loop infrastructure for every
// simulation tool: the deterministic checks (test_slice), the narrative fuzzer
// (test_narrative), the pacing extractor (phase_map), the scene permutation
// test (test_scenes), the strategy table (sim_strategies), and the play.html
// debug bar (jumpTo).
//
// Design notes:
//  - The engine owns its own seeded RNG; drivers that need randomness (the
//    `random` fuzzer) get a SECOND seeded stream (seed ^ golden ratio) so play
//    choices never perturb the content's rolls. No Math.random patching.
//  - A driver is a chooser: (action, game) => preferred key(s) | null (skip).
//    `playGame` handles the 2-actions-per-week economy, scene free-actions,
//    priority ordering, and optional observer hooks.
//
// Dual export: Node (module.exports) + browser (window.Harness).
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const Game = (typeof require !== "undefined")
    ? require("../engine.js").Game
    : window.Engine;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ── the canonical decent player ─────────────────────────────────────────────
  // Which open message gets an action first when the week is crowded: parallel
  // scene beats, then the research/evidence beats, then everything in rail
  // order; community threads only get spare actions.
  // The summit comes AFTER the evidence beats: a decent player banks the slide's
  // chips first and calls the room a week later — the summit's own 3-week
  // patience is designed to allow exactly that.
  const ANSWER_ORDER = [
    "founder_consulting", // rent money first — a sensible player never lets it expire
    "start_prototype", "jordan_working_style", // week 1: one message per founder
    "equity_worry", "equity_jordan_relief", "equity_alex_justify",
    "equity_5050_interject", "interviews", "waitlist_cold",
    "launch_surface",     // the launch plan beats the ship call — a sensible
                          // player picks the splash before flipping the switch
    "slide_maya_call", "slide_cohort", "slide_first_echo",
    "slide_alex_thesis", "slide_priya_ping", "feature_spree", "pivot_summit_call",
    "pivot_relaunch", "pivot_relaunch_rough", "public_complaint",
    // The co-founder conversation outranks everything else late-game: it now
    // sits on the founder's thread, where founder_codebuild (which a decent
    // player never answers) can otherwise squat the slot until the deadline.
    "jordan_confrontation", "jordan_cap_table",
  ];
  const actPriority = (a) => {
    const i = ANSWER_ORDER.indexOf(a.nodeId);
    return i >= 0 ? i : a.charId === "hacker_news" ? 500 : 99;
  };

  // Preferred option keys (first available wins; unknown nodes take the first
  // offered option; "SKIP" leaves the message unanswered on purpose).
  const PREF = {
    start_prototype: ["build"], jordan_working_style: ["standup"],
    incorporate: ["atlas"], incorporate_again: ["atlas"],
    equity_open: ["open"], equity_alex: ["probe"], equity_alex_why: ["propose_40"],
    equity_worry: ["reassure"], equity_jordan_relief: ["not_yet"], equity_alex_justify: ["mine"],
    equity_counter_jordan: ["hear_her"], equity_counter_alex: ["risk_real"],
    equity_counter_alex_50: ["hear_him"], equity_5050_interject: ["ack"],
    equity_impasse_alex: ["ack"], equity_impasse_jordan: ["heard"],
    equity_impasse: ["thirds_final"], equity_consent_alex: ["own_it"],
    equity_consent_jordan: ["heard"], equity_signing: ["sign"],
    dev_plan: ["lean"], auth_choice: ["buy"], auth_forced: ["buy"],
    interviews: ["interview"], first_screen: ["intake_interviews", "intake"],
    ff_family: ["ask"], ff_family_2: ["ask"], ff_family_3: ["ask"],
    founder_consulting: ["take"],
    alex_commitment: ["accept"], vision_mismatch: ["test"],
    matching_choice: ["build"], ranking: ["conversation", "interests"],
    ios_sprint_1: ["wire_backend"], ios_sprint_2: ["ack"],
    demo_ready: ["rough"], demo_stall: ["build"], launch_stall: ["ship"], scope_grind: ["ack"],
    demo_watch: ["watch"], demo_bug: ["note"], demo_first_message: ["note"],
    demo_jordan_late: ["tell"],
    analytics_choice: ["buy"], seed_strategy: ["waitlist_city", "local"],
    trust_safety: ["report_now"], waitlist_calls: ["call"], waitlist_cold: ["reach"],
    alex_sync_discover: "SKIP", alex_sync_build: ["build"],
    proto_to_product: ["commit"], good_enough_launch: ["ship"],
    launch_preflight: ["review"], launch_email_pulse: ["yes"], launch_first_bounce: ["normal"],
    launch_staging_discover: ["check"], launch_staging_found: ["options"], launch_staging_decide: ["hotfix"],
    launch_first_signup: ["watch"], launch_inbox_question: ["personal"], launch_hustle: ["stay"],
    launch_test_profiles: ["how_many"], launch_test_profiles_scope: ["damage"], launch_test_profiles_decide: ["disclose"],
    launch_abuser: ["ban"], launch_stripe_discover: ["fix"], launch_stripe_research: ["timeline"],
    launch_stripe_decide: ["fix_now"], launch_going_home: ["ack"], launch_9pm_crisis: ["victim_first"],
    launch_signal: ["ack"],
    founder_meetup: ["go"], mentor_competitor_bomb: ["research"],
    post_match_dropoff: ["dig"], pivot_open: ["open"],
    slide_hangover: ["retention"], slide_first_echo: ["reply_honest"], slide_cohort: ["dig"],
    slide_alex_thesis: ["push_back", "hear_him"], slide_priya_ping: ["real_numbers"],
    slide_maya_call: ["call"], slide_jordan_echo: ["ack"], feature_spree: ["no"],
    win_back_blast: ["skip"],
    pivot_summit_call: ["call_it"], pivot_day_open: ["deal"], pivot_day_alex_case: ["probe"],
    pivot_day_priya_case: ["pull_it"], pivot_day_evidence: ["maya", "circle", "fixes", "gut"],
    pivot_day_shape: ["flip"], pivot_day_cost: ["ack"], pivot_day_decide: ["pivot"],
    pivot_day_close: ["night"],
    pivot_scope_call: ["cut"], pivot_beta_invite: ["invite"],
    pivot_relaunch: ["sarah_event", "press", "quiet"], pivot_fifty_verdict: ["pivot_now"],
    pivot_relaunch_rough: ["wait"],
    pivot_payoff_maya: ["ack"],
    sarah_intro: ["reply"],
    beachhead_choice: ["narrow"], launch_surface: ["quiet"], launch_scramble: ["firefight"],
    channel_test: ["referrals", "creators", "community", "paid"], channel_double_down: ["referrals"],
    dont_scale_seed: ["concierge"], first_customer_offer: ["pitch"], pricing_experiment: ["prompt"],
    bug_reports: ["fix"], churn_interview: ["call"], feature_request_custom: ["negotiate"],
    feature_cluster: ["build"],
    jordan_drift_start: ["talk"], jordan_drag: ["talk"], jordan_launch_blocker: ["confront"],
    jordan_confrontation: ["fire"], jordan_cap_table: ["lawyer", "defer"],
    firing_open: ["own"], firing_restate: ["say_it"], firing_reentry: ["finish"],
    firing_preempt: ["nothing"], firing_reaction: ["ask", "hold"],
    firing_ask_finish: ["hold_informed"], firing_counter: ["buy_handoff"],
    firing_logistics: ["transfer"], firing_alex_after: ["keep_confidence"],
    firing_last_word: ["human"],
    flare_stealth: ["steady"], flare_10k: ["course"], flare_feature: ["hold"],
    flare_stumble: ["screenshot"], flare_epilogue: ["work"],
    public_complaint: ["respond"], reporter_deadline: ["reply"], power_user_quiet: ["call"],
    consultant_growth: "SKIP", consultant_brand: "SKIP",
    ff_friend: ["tell"], ff_friend_ask: ["ask"], ff_mentor: ["lunch"], ff_mentor_pitch: ["pitch"],
    early_name: ["catchy"], early_customer_target: ["individuals"], early_funding_goal: ["profitable"],
    alex_side_project: ["pause"], alex_side_project_escalation: ["talk"], alex_quiet: ["checkin"],
    alex_equity_regret: ["fair"], family_doubt: ["talk"],
    alex_decision: ["ship"],
    alex_leaving_threat: ["talk"],
    first_interview_shock: ["pivot"], cold_silence: ["rewrite"], random_reframe: ["test"],
    pivot_insight_1: ["pivot"], pivot_insight_2: ["pivot"], pmf_lock: ["lock"],
    founder_user_depth: ["deep"], reference_checkin: ["call"], website_social_proof: ["rebuild"],
    founder_codebuild: "SKIP",
  };

  const decent = (a) => {
    const p = PREF[a.nodeId];
    if (p === "SKIP") return null;
    return p || a.options[0].key;
  };

  const CATEGORY = {
    // build — the product: scope, build-vs-buy, direction calls, fixes
    start_prototype: "build", dev_plan: "build", auth_choice: "build", auth_forced: "build",
    first_screen: "build", matching_choice: "build", ranking: "build",
    ios_sprint_1: "build", ios_sprint_2: "build", analytics_choice: "build",
    trust_safety: "build", proto_to_product: "build", good_enough_launch: "build",
    demo_stall: "build", launch_stall: "build", scope_grind: "build",
    feature_spree: "build", bug_reports: "build", feature_request_custom: "build",
    feature_cluster: "build", pivot_relaunch: "build", pivot_fifty_verdict: "build",
    pivot_relaunch_rough: "build",
    pivot_scope_call: "build",
    founder_codebuild: "build", alex_sync_build: "build", alex_decision: "build",
    jordan_launch_blocker: "build",
    // research — the market: interviews, communities, the competitor, evidence
    interviews: "research", waitlist_calls: "research", waitlist_cold: "research",
    hn_thread: "research", community_hn_1: "research", community_hn_2: "research",
    community_hn_3: "research", community_reddit_1: "research", community_reddit_2: "research",
    community_reddit_3: "research", community_ih_1: "research", community_ih_2: "research",
    community_ih_3: "research", founder_meetup: "research", mentor_competitor_bomb: "research",
    flare_stealth: "research", flare_10k: "research", flare_feature: "research",
    flare_stumble: "research", flare_epilogue: "research",
    post_match_dropoff: "research", pivot_open: "research", slide_hangover: "research",
    slide_first_echo: "research", slide_cohort: "research", slide_alex_thesis: "research",
    slide_priya_ping: "research", slide_maya_call: "research", slide_jordan_echo: "research",
    win_back_blast: "research",
    pivot_summit_call: "research", pivot_payoff_maya: "research", power_user_quiet: "research",
    churn_interview: "research", first_interview_shock: "research", cold_silence: "research",
    random_reframe: "research", pivot_insight_1: "research", pivot_insight_2: "research",
    pmf_lock: "research", founder_user_depth: "research", reference_checkin: "research",
    alex_sync_discover: "research", early_customer_target: "research",
    // team — co-founders, family, the company itself
    incorporate: "team", incorporate_again: "team", alex_commitment: "team",
    jordan_working_style: "team",
    vision_mismatch: "team", alex_side_project: "team", alex_side_project_escalation: "team",
    alex_quiet: "team", alex_equity_regret: "team", family_doubt: "team",
    alex_leaving_threat: "team", jordan_drift_start: "team", jordan_drag: "team",
    jordan_confrontation: "team",
    // money — checks in, checks out
    ff_family: "money", ff_family_2: "money", ff_family_3: "money",
    founder_consulting: "money", ff_friend: "money", ff_friend_ask: "money",
    ff_mentor: "money", ff_mentor_pitch: "money", consultant_growth: "money",
    consultant_brand: "money", jordan_cap_table: "money",
    early_funding_goal: "money",
    // growth — distribution: markets, channels, press, pricing
    seed_strategy: "growth", beachhead_choice: "growth", launch_surface: "growth",
    launch_scramble: "growth", channel_test: "growth", channel_double_down: "growth",
    dont_scale_seed: "growth", first_customer_offer: "growth", pricing_experiment: "growth",
    sarah_intro: "growth", pivot_beta_invite: "growth", website_social_proof: "growth",
    public_complaint: "growth", reporter_deadline: "growth", early_name: "growth",
    // the firing scene's beats (free of action cost, like every scene beat)
    firing_open: "team", firing_restate: "team", firing_reentry: "team",
    firing_preempt: "team", firing_reaction: "team", firing_ask_finish: "team",
    firing_counter: "team", firing_logistics: "team", firing_alex_after: "team",
    firing_last_word: "team",
    demo_jordan_late: "team",
  };
  const CAT_LIST = ["build", "research", "team", "money", "growth", "other"];

  // Randomized attention: same sensible choices, but WHICH open card gets the
  // founder's action is random — a stable per-game shuffle, so each seeded run
  // models one player who consistently favors different threads. Used by
  // phase_map to separate "this card loses under one tactic" from "this card
  // is structurally unanswerable".
  function makeAttentionPriority(seed) {
    const rng = mulberry32((seed ^ 0x51ED270) >>> 0);
    const rank = new Map();
    return (a) => {
      if (!rank.has(a.nodeId)) rank.set(a.nodeId, rng());
      return rank.get(a.nodeId);
    };
  }

  const PIVOT_RE = /pivot|activit|discover|interview|talk|meetup|priya|reframe|rebuild/i;
  const pivot = (a) => {
    const hit = a.options.find(o => PIVOT_RE.test(o.key) || PIVOT_RE.test(o.label || ""));
    return hit ? [hit.key] : decent(a);
  };

  // `random` needs per-game state, so it's a factory.
  const makeRandom = (seed) => {
    const rng = mulberry32((seed ^ 0x9E3779B9) >>> 0);
    return (a) => {
      if (rng() < 0.3) return null;                       // sometimes leave it on read
      const keys = a.options.map(o => o.key);
      return keys[Math.floor(rng() * keys.length)];
    };
  };

  function makeChooser(driver, seed) {
    if (typeof driver === "function") return driver;
    if (driver === "decent") return decent;
    if (driver === "pivot") return pivot;
    if (driver === "random") return makeRandom(seed);
    throw new Error("unknown driver: " + driver);
  }

  // ── the game loop ───────────────────────────────────────────────────────────
  // opts: { weeks=120, subsidy, priority, onWeekStart(game, offered),
  //         onNewMessages(game, msgs), onAct(game, action, key), until(game) }
  // `onAct` fires immediately after each `game.act`, with the pre-act action
  // snapshot (body + the options that were on offer) — that's how transcript.js
  // reconstructs "what was chosen, and what wasn't".
  // Returns the game, with `game.seenOptions[nodeId]` = options offered when a
  // node first surfaced (for option-gating assertions).
  function playGame(seed, driver, opts) {
    opts = opts || {};
    const weeks = opts.weeks != null ? opts.weeks : 120;
    const chooser = makeChooser(driver, seed);
    const pri = opts.priority || actPriority;
    const game = new Game({ seed });
    game.seenOptions = {};
    const cursors = {};
    for (const id of game.order) cursors[id] = 0;

    const collectMessages = () => {
      if (!opts.onNewMessages) { for (const id of game.order) cursors[id] = game.threads[id].length; return; }
      const msgs = [];
      for (const id of game.order) {
        const t = game.threads[id];
        for (let i = cursors[id]; i < t.length; i++) if (t[i].type === "incoming") msgs.push(t[i]);
        cursors[id] = t.length;
      }
      if (msgs.length) opts.onNewMessages(game, msgs);
    };
    const hit = () => opts.until && opts.until(game);

    collectMessages(); // week-1 surfacing
    for (let w = 0; w < weeks && !game.s.game_over && !game.s.game_won; w++) {
      if (opts.subsidy) game.s.cash += opts.subsidy;
      if (opts.onWeekStart) opts.onWeekStart(game, game.openActions());
      if (hit()) return game;

      let guard = 0;
      for (;;) {
        if (guard++ > 80) throw new Error("driver stuck in week " + game.s.week);
        const acts = game.openActions().filter(a => !a.onHold);
        for (const a of acts) if (!game.seenOptions[a.nodeId]) game.seenOptions[a.nodeId] = a.options.map(o => o.key);
        acts.sort((a, b) => pri(a) - pri(b));
        let did = false;
        for (const a of acts) {
          const key = chooser(a, game);
          if (!key) continue;
          const free = a.scene && game.scene && game.scene.id === a.scene;
          if (game.actionsLeft <= 0 && !free) continue;
          const offered = a.options.map(o => o.key);
          const k = [].concat(key).find(x => offered.includes(x)) || offered[0];
          game.act(a.nodeId, k);
          if (opts.onAct) opts.onAct(game, a, k);
          did = true;
          break; // re-read: a scene answer surfaces the next beat immediately
        }
        if (hit()) return game;
        if (!did) break;
      }
      game.nextWeek();
      collectMessages();
    }
    return game;
  }

  // ── player archetypes ───────────────────────────────────────────────────────
  // The named founders the tools play as. Lives here (not in sim_behaviors.js)
  // so the contract suite and the transcript reader replay the SAME people —
  // a contract failure and the story you read to understand it are one run.
  //
  // A spec is { chooser } (a driver name or chooser fn), { makeChooser(seed) },
  // and/or { priority(seed) }; `blurb` is the one-line character sketch the
  // transcript reader prints as the run's byline.
  const withPrefs = (over) => (a, g) => {
    if (a.nodeId in over) {
      const v = over[a.nodeId];
      return typeof v === "function" ? v(a, g) : v; // null = deliberately skip
    }
    return decent(a, g);
  };
  const skipChars = (chars) => (a, g) => chars.has(a.charId) ? null : decent(a, g);
  const onlyChars = (chars) => (a, g) => chars.has(a.charId) ? decent(a, g) : null;

  const OUTSIDE = new Set(["users", "growth", "twitter", "lena", "techcrunch", "hacker_news", "tom", "sarah"]);

  // A half-decent founder with a lean: decent choices whenever they engage, but
  // cards in the disfavored categories only get their attention `p` of the time
  // (seeded roll, memoized per node·week — so a standing offer like dev_plan is
  // delayed by the lean, while a 1-3 week timeout card is usually missed).
  const lopsided = (skipCats, p) => (seed) => {
    const rng = mulberry32((seed ^ 0x10B51D3D) >>> 0);
    const rolls = new Map();
    return (a, g) => {
      const cat = CATEGORY[a.nodeId] || "other";
      if (skipCats.includes(cat)) {
        const key = a.nodeId + ":" + g.s.week;
        if (!rolls.has(key)) rolls.set(key, rng() < p);
        if (!rolls.get(key)) return null;
      }
      return decent(a, g);
    };
  };

  const STRATEGIES = {
    decent: { chooser: "decent", blurb: "the canonical good founder — every contract's baseline" },
    random: { chooser: "random", blurb: "no tactic at all: random choices, sometimes left on read" },
    distracted: { chooser: "decent", priority: (seed) => makeAttentionPriority(seed),
      blurb: "decent choices, but which card gets the action is random" },
    ignore_alex: { chooser: skipChars(new Set(["alex"])), blurb: "never answers the CTO" },
    outside_only: { chooser: onlyChars(OUTSIDE), blurb: "all market, no team, no build" },
    fulltime: { chooser: withPrefs({ alex_commitment: ["push"] }),
      blurb: "pushes Alex to commit full-time instead of accepting part-time" },
    // The keep-vs-fire ladder. `decent` is the top rung (fires at the first
    // ask); these two are the rungs below it. Both must still reach a shipped
    // v2 — a founder who won't have the conversation ships around Jordan on
    // Alex's stand-in screen rather than never relaunching at all.
    keep_jordan: { chooser: withPrefs({
        jordan_confrontation: ["defer"], pivot_relaunch_rough: ["ship_rough"],
      }), blurb: "never has the Jordan conversation — ships around her instead" },
    // Lets it slide twice before having it: the same conversation, three weeks
    // and a chunk of runway later. Per-game closure state, so `makeChooser`
    // (called once per game) rather than a shared `chooser`.
    fire_late: { makeChooser: () => {
        let deferrals = 0;
        return withPrefs({
          jordan_confrontation: () => (deferrals++ < 1 ? ["defer"] : ["fire"]),
          pivot_relaunch_rough: ["wait"],
        });
      }, blurb: "lets the Jordan conversation slide once, then has it" },
    skip_captable: { chooser: withPrefs({ jordan_cap_table: ["defer"], firing_logistics: ["defer"] }),
      blurb: "fires Jordan but never does the paperwork" },
    fold_jordan: { chooser: withPrefs({ firing_reaction: ["fold"], firing_reentry: ["fold_again"] }),
      blurb: "has the Jordan conversation and blinks in it" },
    // Ghosts Jordan for the whole run, then opens the firing with the charge
    // sheet — the only archetype that reaches her tier-3 reaction and the
    // pre-emptive resignation (firing_preempt), and the one that exercises
    // firing_restate on the way.
    // Leaves every Jordan card that isn't build-critical on read, then opens
    // the firing with the charge sheet — the only archetype that reaches her
    // tier-3 reaction and the pre-emptive resignation.
    ghost_jordan: { chooser: withPrefs({
        jordan_working_style: null, slide_jordan_echo: null, pivot_beta_invite: null,
        // pivot_open too: Jordan flagging user feedback is exactly the
        // not-build-critical card this archetype is defined by leaving on read.
        // It also keeps her tier-3 reaction reachable — the firing now lands
        // early enough to close pivot_beta_invite's window before it can time
        // out, which used to supply the third ignored card on its own.
        pivot_open: null,
        firing_open: ["litigate"],
      }), blurb: "leaves Jordan on read all run, then opens with the charge sheet" },
    // Opens the firing by hiding behind Alex — exercises firing_restate, the
    // beat that charges you a message for not leading with the decision.
    blame_alex: { chooser: withPrefs({ firing_open: ["outsource"] }),
      blurb: "fires Jordan, but makes it Alex's fault" },
    no_pivot: { chooser: withPrefs({ pivot_day_decide: ["growth"], pivot_fifty_verdict: ["ride"] }),
      blurb: "explicitly refuses the pivot, twice" },
    no_meetup: { chooser: withPrefs({ founder_meetup: null }), blurb: "never goes to the founder meetup" },
    full_plan: { chooser: withPrefs({ dev_plan: ["full"] }), blurb: "picks the over-scoped plan A" },
    builder: { makeChooser: lopsided(["research", "growth"], 0.25),
      blurb: "loves the IDE, ignores the market" },
    marketer: { makeChooser: lopsided(["build"], 0.5), blurb: "works the market, never ships" },
  };

  // Resolve a strategy name (or a raw driver name) to a playGame-ready pair.
  function strategyOpts(name, seed) {
    const spec = STRATEGIES[name];
    if (!spec) return { driver: name, priority: undefined }; // raw "decent"/"pivot"/"random"
    return {
      driver: spec.makeChooser ? spec.makeChooser(seed) : spec.chooser,
      priority: spec.priority ? spec.priority(seed) : undefined,
    };
  }

  // Play decent until a condition holds (a node id resolved, a node id open,
  // or a predicate). For the debug bar and the scene permutation test.
  function jumpTo(spec, opts) {
    opts = opts || {};
    const until = typeof spec === "function" ? spec
      : (g) => g.done(spec) || Object.values(g.open).some(o => o && o.nodeId === spec);
    return playGame(opts.seed != null ? opts.seed : 42, opts.driver || "decent",
      { ...opts, until });
  }

  // ── stats utils ─────────────────────────────────────────────────────────────
  function quantile(sorted, q) {
    if (!sorted.length) return null;
    const i = (sorted.length - 1) * q;
    const lo = Math.floor(i), hi = Math.ceil(i);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
  }
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const r1 = n => (n == null ? "—" : (Math.round(n * 10) / 10).toString());
  const pct = (n, d) => Math.round((n / Math.max(1, d)) * 100) + "%";
  const pad = (s, n) => String(s).padEnd(n);
  const padL = (s, n) => String(s).padStart(n);

  const api = {
    Game, mulberry32,
    ANSWER_ORDER, actPriority, PREF, decent, pivot, makeRandom, makeChooser,
    makeAttentionPriority, CATEGORY, CAT_LIST,
    withPrefs, skipChars, onlyChars, lopsided, STRATEGIES, strategyOpts,
    playGame, jumpTo,
    quantile, mean, r1, pct, pad, padL,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.Harness = api;
})();
