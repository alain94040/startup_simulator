// ─────────────────────────────────────────────────────────────────────────────
// v2/tests/harness.js — shared driver + game-loop infrastructure for every v2
// tool: the deterministic checks (test_slice), the narrative fuzzer
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
// Dual export: Node (module.exports) + browser (window.V2Harness).
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const Game = (typeof require !== "undefined")
    ? require("../engine.js").Game
    : window.V2Engine;

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
    "equity_worry", "equity_5050_interject", "interviews", "waitlist_cold",
    "slide_maya_call", "slide_cohort", "slide_first_echo",
    "slide_alex_thesis", "slide_priya_ping", "feature_spree", "pivot_summit_call",
    "yc_apply",
  ];
  const actPriority = (a) => {
    const i = ANSWER_ORDER.indexOf(a.nodeId);
    return i >= 0 ? i : a.charId === "hacker_news" ? 500 : 99;
  };

  // Preferred option keys (first available wins; unknown nodes take the first
  // offered option; "SKIP" leaves the message unanswered on purpose).
  const PREF = {
    start_prototype: ["build"], incorporate: ["atlas"], incorporate_again: ["atlas"],
    equity_open: ["open"], equity_alex: ["probe"], equity_alex_why: ["propose_40"],
    equity_worry: ["reassure"], equity_counter_jordan: ["cave_33"],
    equity_counter_alex: ["cave_40"], equity_counter_alex_50: ["give_alex"],
    equity_5050_interject: ["ack"], equity_signing: ["sign"],
    dev_plan: ["lean"], auth_choice: ["buy"], auth_forced: ["buy"],
    interviews: ["interview"], first_screen: ["intake_interviews", "intake"],
    ff_family: ["ask"], ff_family_2: ["ask"], ff_family_3: ["ask"],
    founder_reflect: ["review"], founder_consulting: ["take"],
    alex_commitment: ["accept"], vision_mismatch: ["test"],
    matching_choice: ["build"], ranking: ["conversation", "interests"],
    ios_sprint_1: ["wire_backend"], ios_sprint_2: ["ack"],
    demo_ready: ["rough"], demo_watch: ["watch"], demo_bug: ["note"], demo_first_message: ["note"],
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
    pivot_summit_call: ["call_it"], pivot_day_open: ["deal"], pivot_day_alex_case: ["probe"],
    pivot_day_priya_case: ["pull_it"], pivot_day_evidence: ["maya", "circle", "gut"],
    pivot_day_shape: ["flip"], pivot_day_cost: ["ack"], pivot_day_decide: ["pivot"],
    pivot_day_close: ["night"], pivot_relaunch: ["ship"], pivot_fifty_verdict: ["pivot_now"],
    pivot_payoff_maya: ["ack"],
    sarah_intro: ["reply"],
    yc_apply: ["submit"],
    beachhead_choice: ["narrow"], launch_surface: ["quiet"], launch_scramble: ["firefight"],
    channel_test: ["referrals", "creators", "community", "paid"], channel_double_down: ["referrals"],
    dont_scale_seed: ["concierge"], first_customer_offer: ["pitch"], pricing_experiment: ["prompt"],
    bug_reports: ["fix"], churn_interview: ["call"], feature_request_custom: ["negotiate"],
    feature_cluster: ["build"],
    jordan_drift_start: ["talk"], jordan_drag: ["talk"], jordan_launch_blocker: ["confront"],
    jordan_confrontation: ["fire"], jordan_cap_table: ["lawyer"],
    competitor_launch: ["study"], competitor_growing: ["calls"],
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
  //         onNewMessages(game, msgs), until(game) }
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
    playGame, jumpTo,
    quantile, mean, r1, pct, pad, padL,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.V2Harness = api;
})();
