// Simulation harness — runs N games per strategy, reports findings.

const { Engine } = require('./engine.js');

// ─── Engine adapter ──────────────────────────────────────────────────────────
// The engine was rewritten from a card-dealing model (generateDemands / e.current
// / resolveTurn) into a chat coordinator (openActions / act / nextWeek). These two
// helpers bridge the old strategy code to the new API so selectCards / pickOptions /
// CARD_PREFS stay untouched.

// The current "hand": map each open action to the shape the strategy code expects
// ({ id, _charId, cat, urgency, options, body, from }).
function handFromEngine(e) {
  return e.openActions().map(a => ({
    id: a.cardId, _charId: a.charId, cat: a.cat,
    urgency: a.urgency, options: a.options,   // options: [{ key, label }]
    body: a.body, from: a.name,
  }));
}

// Resolve the chosen card ids for this week (2 actions max), returning the outcome
// strings. Does NOT advance the week — caller decides when to call e.nextWeek().
function actTurn(e, ids, opts) {
  const results = [];
  for (const id of ids) {
    const out = e.act(id, opts[id]);
    if (out) results.push(out);
  }
  return results;
}

// ─── Strategy helpers ────────────────────────────────────────────────────────

// Preferred option key per card per strategy.
// Cards with a single option don't need an entry — they're handled automatically.
const CARD_PREFS = {
  yc_grind: {
    jordan_equity_mention:         'open',
    jordan_equity_alex:            'propose_50',
    jordan_equity_counter_alex:    'cave_40',
    jordan_equity_counter_jordan:  'hold_40',
    jordan_equity_counter_both:    'hold_50',
    jordan_drag:              'talk',
    jordan_drift_start:       'talk',
    jordan_launch_blocker:    'confront',
    jordan_confrontation:     'fire',
    jordan_cap_table:         'lawyer',
    alex_commitment:          'push',
    vision_mismatch:          'test',
    alex_sync_discover:       'discover',
    alex_sync_build:          'build',
    alex_sync_pitch:          'pitch',
    alex_equity:              'fair',
    first_interview_shock:    'pivot',
    pivot_insight_1:          'pivot',
    pivot_insight_2:          'pivot',
    alex_demo_ready:          'polish',

    proto_to_product:         'commit',
    good_enough_launch:       'ship',
    yc_discussion_ready:      'apply',
    yc_discussion_early:      'apply',
    consultant_growth:        'hire',
    consultant_brand:         'hire',
    competitor_launch:        'study',
    competitor_growing:       'calls',
    investor_moat_question:   'niche',
    dev_planning_session:     'full',
    sprint_social:            'build',
    sprint_algo:              'build',
    sprint_mono:              'defer',
    sprint_adv:               'defer',
  },
  alex_first: {
    jordan_equity_mention:         'open',
    jordan_equity_alex:            'propose_40',
    jordan_equity_counter_alex:    'cave_40',
    jordan_equity_counter_jordan:  'hold_40',
    jordan_equity_counter_both:    'cave_alex',
    jordan_drag:              'talk',
    jordan_drift_start:       'talk',
    jordan_launch_blocker:    'confront',
    jordan_confrontation:     'fire',
    jordan_cap_table:         'lawyer',
    alex_commitment:          'push',
    vision_mismatch:          'alex',
    alex_sync_discover:       'discover',
    alex_sync_build:          'discover',
    alex_sync_pitch:          'pitch',
    alex_equity:              'fair',
    first_interview_shock:    'pivot',
    pivot_insight_1:          'pivot',
    pivot_insight_2:          'pivot',
    alex_demo_ready:          'polish',

    proto_to_product:         'commit',
    good_enough_launch:       'ship',
    yc_discussion_ready:      'apply',
    yc_discussion_early:      'apply',
    consultant_growth:        'pass',
    consultant_brand:         'pass',
    competitor_launch:        'study',
    competitor_growing:       'calls',
    investor_moat_question:   'niche',
    dev_planning_session:     'lean',
    sprint_social:            'build',
    sprint_algo:              'build',
    sprint_mono:              'defer',
    sprint_adv:               'defer',
  },
  customer_focus: {
    jordan_equity_mention:         'open',
    jordan_equity_alex:            'propose_33',
    jordan_equity_counter_alex:    'hold_33',
    jordan_equity_counter_jordan:  'cave_33',
    jordan_equity_counter_both:    'cave_jordan',
    jordan_drift_start:       'cover',
    jordan_launch_blocker:    'wait',
    jordan_confrontation:     'defer',
    jordan_cap_table:         'defer',
    alex_commitment:          'accept',
    vision_mismatch:          'test',
    alex_sync_discover:       'discover',
    alex_sync_build:          'discover',
    alex_sync_pitch:          'stay',
    alex_equity:              'fair',
    first_interview_shock:    'pivot',
    pivot_insight_1:          'pivot',
    pivot_insight_2:          'pivot',
    alex_demo_ready:          'rough',

    proto_to_product:         'commit',
    good_enough_launch:       'ship',
    yc_discussion_ready:      'skip',
    yc_discussion_early:      'skip',
    consultant_growth:        'hire',
    consultant_brand:         'pass',
    competitor_launch:        'study',
    competitor_growing:       'calls',
    investor_moat_question:   'niche',
    dev_planning_session:     'lean',
    sprint_social:            'build',
    sprint_algo:              'defer',
    sprint_mono:              'defer',
    sprint_adv:               'defer',
  },
  ignore_alex: {
    jordan_equity_mention:         'open',
    jordan_equity_alex:            'propose_33',
    jordan_equity_counter_alex:    'hold_33',
    jordan_equity_counter_jordan:  'cave_33',
    jordan_equity_counter_both:    'cave_jordan',
    jordan_drift_start:       'cover',
    jordan_launch_blocker:    'wait',
    jordan_confrontation:     'defer',
    jordan_cap_table:         'defer',
    alex_commitment:          'push',
    vision_mismatch:          'yours',
    alex_sync_discover:       'build',
    alex_sync_build:          'discover',
    alex_sync_pitch:          'stay',
    alex_equity:              'defer',
    first_interview_shock:    'stay',
    pivot_insight_1:          'stay',
    pivot_insight_2:          'stay',
    good_enough_launch:       'wait',
    yc_discussion_ready:      'skip',
    yc_discussion_early:      'skip',
    consultant_growth:        'pass',
    consultant_brand:         'pass',
    competitor_launch:        'copy',
    competitor_growing:       'ignore',
    investor_moat_question:   'deflect',
    dev_planning_session:     'sprint',
    sprint_social:            'defer',
    sprint_algo:              'defer',
    sprint_mono:              'defer',
    sprint_adv:               'defer',
  },
  // Angel path: build traction → warm marcus → build users → launch → convert → pitch
  angel_path: {
    jordan_equity_mention:         'open',
    jordan_equity_alex:            'propose_40',
    jordan_equity_counter_alex:    'cave_40',
    jordan_equity_counter_jordan:  'hold_40',
    jordan_equity_counter_both:    'cave_alex',
    jordan_drag:              'talk',
    jordan_drift_start:       'talk',
    jordan_launch_blocker:    'confront',
    jordan_confrontation:     'fire',
    jordan_cap_table:         'lawyer',
    alex_commitment:          'accept',
    vision_mismatch:          'test',
    alex_equity:              'fair',
    first_interview_shock:    'pivot',
    cold_silence:             'rewrite',
    random_reframe:           'test',
    pivot_insight_1:          'pivot',
    pivot_insight_2:          'pivot',
    alex_demo_ready:          'rough',

    proto_to_product:         'commit',
    good_enough_launch:       'ship',
    yc_discussion_ready:      'skip',
    yc_discussion_early:      'skip',
    consultant_growth:        'pass',
    consultant_brand:         'pass',
    hn_thread:                'engage',
    community_signal_hn_1:    'engage',
    community_signal_hn_2:    'engage',
    community_signal_hn_3:    'engage',
    community_signal_reddit_1:'engage',
    community_signal_reddit_2:'engage',
    community_signal_reddit_3:'engage',
    community_signal_slack_1: 'engage',
    community_signal_slack_2: 'engage',
    community_signal_slack_3: 'engage',
    community_product_hn:     'engage',
    community_product_reddit: 'engage',
    community_product_slack:  'engage',
    silent_churn:             'call',
    public_complaint:         'respond',
    bug_reports:              'fix',
    feature_cluster:          'build',
    waitlist_cold:            'reach',
    reporter_deadline:        'reply',
    founder_codebuild:        'demos',
    founder_user_depth:       'deep',
    competitor_launch:        'compare',
    competitor_growing:       'discount',
    investor_moat_question:   'speed',
    // investor chain — engage fully
    investor_intro_warm:      'call',
    fatima_intro:             'call',
    fatima_meeting:           'meet',
    fatima_deck:              'walk',
    ryan_intro:               'meet',
    ryan_checkin:             'update',
    intro_expiring:           'reply',
    dev_planning_session:     'lean',
    sprint_social:            'defer',
    sprint_algo:              'defer',
    sprint_mono:              'defer',
    sprint_adv:               'defer',
    // pivot arc — angel path trusts Alex, doesn't pivot on advice
    pivot_open:               'open',
    pivot_alex_pushback:      'ship',
    pivot_priya_verdict:      'ship',
  },
  // Teach-the-lesson strategy: discover → build → engage → YC
  lean_loop: {
    jordan_equity_mention:         'open',
    jordan_equity_alex:            'propose_40',
    jordan_equity_counter_alex:    'cave_40',
    jordan_equity_counter_jordan:  'hold_40',
    jordan_equity_counter_both:    'cave_alex',
    jordan_drag:              'talk',
    jordan_drift_start:       'talk',
    jordan_launch_blocker:    'confront',
    jordan_confrontation:     'fire',
    jordan_cap_table:         'lawyer',
    alex_commitment:          'accept',
    vision_mismatch:          'test',
    alex_equity:              'fair',
    first_interview_shock:    'pivot',
    cold_silence:             'rewrite',
    random_reframe:           'test',
    pivot_insight_1:          'pivot',
    pivot_insight_2:          'pivot',
    alex_demo_ready:          'rough',

    proto_to_product:         'commit',
    good_enough_launch:       'ship',
    yc_discussion_ready:      'apply',
    yc_discussion_early:      'apply',
    consultant_growth:        'pass',
    consultant_brand:         'pass',
    hn_thread:                'engage',
    community_signal_hn_1:    'engage',
    community_signal_hn_2:    'engage',
    community_signal_hn_3:    'engage',
    community_signal_reddit_1:'engage',
    community_signal_reddit_2:'engage',
    community_signal_reddit_3:'engage',
    community_signal_slack_1: 'engage',
    community_signal_slack_2: 'engage',
    community_signal_slack_3: 'engage',
    community_product_hn:     'engage',
    community_product_reddit: 'engage',
    community_product_slack:  'engage',
    silent_churn:             'call',
    public_complaint:         'respond',
    power_user_quiet:         'call',
    mentor_competitor_bomb:   'research',
    pivot_open:               'open',
    pivot_alex_pushback:      'pivot',
    pivot_counter_alex:       'confirm',
    pivot_priya_verdict:      'go',
    bug_reports:              'fix',
    feature_cluster:          'build',
    waitlist_cold:            'reach',
    reporter_deadline:        'reply',
    founder_landing:          'interview',
    founder_codebuild:        'pair',
    founder_user_depth:       'deep',
    competitor_launch:        'study',
    competitor_growing:       'calls',
    investor_moat_question:   'niche',
    // angel cards — engage all three (player doesn't know who's who)
    fatima_intro:             'call',
    fatima_meeting:           'meet',
    fatima_deck:              'walk',
    // fatima_commit is single-option, auto-selected
    ryan_intro:               'meet',
    ryan_checkin:             'update',
    // alex_sync_* resolved dynamically via state in pickOptions
    dev_planning_session:     'lean',
    sprint_social:            'defer',
    sprint_algo:              'defer',
    sprint_mono:              'defer',
    sprint_adv:               'defer',
  },
};

function pickOptions(cards, ids, strategy, state) {
  const opts = {};
  const prefs = CARD_PREFS[strategy] || {};
  for (const id of ids) {
    const card = cards.find(c => c.id === id);
    if (!card || !card.options) continue;
    const keys = card.options.map(o => o.key);
    if (keys.length === 1) { opts[id] = keys[0]; continue; }
    // lean_loop: keep Alex in build focus so founder_codebuild stays available;
    // shift to pitch only when ready to fundraise
    if (strategy === 'lean_loop' && state &&
        (id === 'alex_sync_discover' || id === 'alex_sync_build' || id === 'alex_sync_pitch')) {
      const phase = state.launched && state.signal >= 60 ? 'pitch' : 'build';
      if (keys.includes(phase)) { opts[id] = phase; continue; }
    }
    if (strategy === 'rand_fulltime' && id === 'alex_commitment') {
      opts[id] = 'push'; continue;
    }
    if (strategy === 'rand_parttime' && id === 'alex_commitment') {
      opts[id] = 'accept'; continue;
    }
    if (strategy === 'random' || strategy === 'rand_fulltime' || strategy === 'rand_parttime') {
      opts[id] = keys[Math.floor(Math.random() * keys.length)];
    } else if (prefs[id] && keys.includes(prefs[id])) {
      opts[id] = prefs[id];
    } else {
      opts[id] = keys[0];
    }
  }
  return opts;
}

function selectCards(current, strategy, state) {
  if (current.length === 0) return [];
  const pool = [...current];

  if (strategy === 'random' || strategy === 'rand_fulltime' || strategy === 'rand_parttime') {
    const shuffled = pool.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2).map(c => c.id);
  }

  if (strategy === 'yc_grind') {
    const FAMILY_CASH = new Set(['ff_family','ff_family_2','ff_family_3','ff_friend','ff_friend_ask','ff_mentor','ff_mentor_pitch']);
    // Priority: YC cards > product > customer > external > team
    const order = ['jordan_confrontation','dev_planning_session','yc_apply','yc_discussion_ready','yc_discussion_early','seed_pitch',
                   'alex_demo_ready','proto_to_product',
                   'good_enough_launch','bug_reports','feature_cluster','silent_churn',
                   'public_complaint','power_user_quiet','reporter_deadline','hn_thread'];
    const sorted = pool.slice().sort((a, b) => {
      // F&F cash is free runway — grab it whenever available
      const aFF = FAMILY_CASH.has(a.id), bFF = FAMILY_CASH.has(b.id);
      if (aFF !== bFF) return aFF ? -1 : 1;
      const ai = order.indexOf(a.id), bi = order.indexOf(b.id);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      // urgency then category preference p>c>e>t
      if (b.urgency !== a.urgency) return b.urgency - a.urgency;
      const catOrder = { p: 0, c: 1, e: 2, t: 3 };
      return (catOrder[a.cat] || 9) - (catOrder[b.cat] || 9);
    });
    return sorted.slice(0, 2).map(c => c.id);
  }

  if (strategy === 'alex_first') {
    const ALEX_CRITICAL = new Set(['jordan_confrontation']);
    // Always pick Alex's cards, prefer urgent ones
    const sorted = pool.slice().sort((a, b) => {
      const aCrit = ALEX_CRITICAL.has(a.id) ? 1 : 0;
      const bCrit = ALEX_CRITICAL.has(b.id) ? 1 : 0;
      if (aCrit !== bCrit) return bCrit - aCrit;
      const aAlex = a._charId === 'alex' ? 1 : 0;
      const bAlex = b._charId === 'alex' ? 1 : 0;
      if (aAlex !== bAlex) return bAlex - aAlex;
      return b.urgency - a.urgency;
    });
    return sorted.slice(0, 2).map(c => c.id);
  }

  if (strategy === 'distracted') {
    const YC_IDS = new Set(['yc_discussion_ready', 'yc_discussion_early']);
    const alexFirst = Math.random() < 0.5;
    const sorted = pool.slice().sort((a, b) => {
      const aYC = YC_IDS.has(a.id) ? 1 : 0;
      const bYC = YC_IDS.has(b.id) ? 1 : 0;
      if (aYC !== bYC) return bYC - aYC;
      // alexFirst: boost Alex to top; otherwise push Alex to bottom
      const aAlex = a._charId === 'alex' ? 1 : 0;
      const bAlex = b._charId === 'alex' ? 1 : 0;
      if (aAlex !== bAlex) return alexFirst ? bAlex - aAlex : aAlex - bAlex;
      return b.urgency - a.urgency;
    });
    return sorted.slice(0, 2).map(c => c.id);
  }

  if (strategy === 'ignore_alex') {
    // Never pick Alex's cards unless forced
    const nonAlex = pool.filter(c => c._charId !== 'alex');
    const alex    = pool.filter(c => c._charId === 'alex');
    const pick    = [...nonAlex, ...alex].slice(0, 2);
    return pick.map(c => c.id);
  }

  if (strategy === 'customer_focus') {
    const sorted = pool.slice().sort((a, b) => {
      const catOrder = { c: 0, p: 1, e: 2, t: 3 };
      if (a.cat !== b.cat) return (catOrder[a.cat] ?? 9) - (catOrder[b.cat] ?? 9);
      return b.urgency - a.urgency;
    });
    return sorted.slice(0, 2).map(c => c.id);
  }

  if (strategy === 'angel_path' || strategy === 'skip_cap_table_angel' || strategy === 'no_pivot') {
    const s = state || {};
    const INVESTOR_IDS  = new Set(['investor_intro_warm','prep_deck','investor_ready','seed_pitch',
                                   'fatima_intro','fatima_meeting','fatima_deck','fatima_commit']);
    const ALEX_CRITICAL = new Set(['alex_commitment','alex_equity','vision_mismatch','jordan_confrontation','dev_planning_session']);
    // Never pick alex_sync_discover — keeps Alex in build mode so demo card stays available
    const NEVER_PICK    = new Set(['alex_sync_discover','yc_discussion_ready','yc_discussion_early']);

    // Family/friend cash cards — free runway, expires early; pick them while available
    const FAMILY_CASH = new Set(['ff_family', 'ff_family_2', 'ff_family_3',
                                  'ff_friend', 'ff_friend_ask',
                                  'ff_mentor', 'ff_mentor_pitch']);

    const priority = c => {
      if (NEVER_PICK.has(c.id))    return 99;
      if (ALEX_CRITICAL.has(c.id)) return 0;
      if (c.id === 'jordan_cap_table') return 0; // must clean before any investor pitch
      if (INVESTOR_IDS.has(c.id))  return 1;
      if (FAMILY_CASH.has(c.id))   return 2;
      if (c.id === 'alex_demo_ready' || c.id === 'proto_to_product') return 2;
      if (c.id === 'good_enough_launch' && s.productPhase === "product") return 2;
      if (c.cat === 'p') return 3;   // product cards: demos add direct paying customers
      if (c.cat === 'c') return 4;
      return 5 + (4 - c.urgency);
    };
    const sorted = pool.slice().sort((a, b) => {
      const pa = priority(a), pb = priority(b);
      if (pa !== pb) return pa - pb;
      return b.urgency - a.urgency;
    });
    // Hard-exclude NEVER_PICK cards: never force them as a second pick
    const eligible = sorted.filter(c => !NEVER_PICK.has(c.id));
    return eligible.slice(0, 2).map(c => c.id);
  }

  if (strategy === 'lean_loop' || strategy === 'ignore_meetup' || strategy === 'keep_jordan' || strategy === 'plan_lean' || strategy === 'plan_full') {
    const s = state || {};
    const fit = s.market_fit || 0;
    const CONSULTANT_IDS = new Set(['consultant_growth', 'consultant_brand']);
    const MEETUP_IDS     = strategy === 'ignore_meetup' ? new Set(['founder_meetup']) : new Set();
    const YC_IDS         = new Set(['yc_apply', 'yc_discussion_ready', 'yc_discussion_early', 'seed_pitch', 'fatima_commit']);
    // Alex founding cards must never be skipped — losing Alex kills the card pool
    const JORDAN_FORCED  = strategy === 'keep_jordan'
      ? new Set(['jordan_confrontation', 'jordan_fulltime_ask'])
      : new Set();
    const ALEX_CRITICAL  = new Set(['alex_commitment', 'alex_equity', 'vision_mismatch', 'alex_leaving_threat', 'jordan_confrontation', 'dev_planning_session', 'pivot_open', 'pivot_alex_pushback', 'pivot_counter_alex', 'pivot_priya_verdict', 'bad_retention']);

    const usable = pool.filter(c => !CONSULTANT_IDS.has(c.id) && !MEETUP_IDS.has(c.id));
    const candidates = usable.length > 0 ? usable : pool;

    let catOrder;
    if (fit < 50) {
      // Discover phase: talk to customers, but still build alongside
      catOrder = { c: 0, p: 1, e: 2, t: 3 };
    } else if (!s.launched) {
      // Build phase: ship product, stay close to users
      catOrder = { p: 0, c: 1, t: 2, e: 3 };
    } else {
      // Launch/YC phase: engage the world, then customers, then polish
      catOrder = { e: 0, c: 1, p: 2, t: 3 };
    }

    const priority = c => {
      if (ALEX_CRITICAL.has(c.id) || JORDAN_FORCED.has(c.id)) return 0;
      if (YC_IDS.has(c.id))                                    return 1;
      return 2 + (catOrder[c.cat] ?? 9);
    };

    const sorted = candidates.slice().sort((a, b) => {
      const pa = priority(a), pb = priority(b);
      if (pa !== pb) return pa - pb;
      return b.urgency - a.urgency;
    });
    return sorted.filter(c => !MEETUP_IDS.has(c.id)).slice(0, 2).map(c => c.id);
  }

  return pool.slice(0, 2).map(c => c.id);
}

// ─── Roadmap helpers ──────────────────────────────────────────────────────────


function roadmapScore(items) {
  if (!items) return 0;
  return Object.values(items).filter(v => v.status === 'done' && v.quality === 'solid').length;
}

function roadmapStr(items) {
  if (!items) return '—';
  const parts = [];
  for (const [k, v] of Object.entries(items)) {
    if (v.status === 'obsolete') continue;
    const label = v.status === 'done' ? 'done'
      : v.status === 'active'   ? 'in progress'
      : v.status === 'deferred' ? 'deferred'
      : 'not started';
    parts.push(`${k} (${label})`);
  }
  return parts.length ? parts.join('  ') : '—';
}

// ─── Run one game ─────────────────────────────────────────────────────────────

function runGame(strategy, maxWeek = 120, verbose = false, noYC = false, cardOverrides = {}, chatMode = false) {
  const e = new Engine();
  const log = [];
  const cardCounts = {};   // cardId -> times offered this game
  const handSizes  = [];   // {week, size} per turn
  const moraleSnaps = [];  // {week, morale, trust} snapshot at start of each turn
  let errorCount = 0;
  const weekSnaps = {};    // chatMode only: week -> state snapshot before turn
  const cardOptMap = {};   // chatMode only: cardId -> {options, chosenKey}
  let ycEverApplied = false;   // tracks ever-applied, not reset on rejection
  let launchWeek = null;

  const optStrategy = strategy;

  for (let turn = 0; turn < maxWeek + 5; turn++) {
    if (e.s.game_won || e.s.game_over) break;
    if (e.s.week >= maxWeek) { log.push(`TIMEOUT at week ${e.s.week}`); break; }

    if (chatMode) {
      weekSnaps[e.s.week] = {
        cash: e.s.cash, launched: e.s.launched,
        customers: e.s.customers, users: e.s.users,
        fit: Math.round(e.s.market_fit), signal: Math.round(e.s.signal),
        items: e.s.items ? Object.fromEntries(
          Object.entries(e.s.items).map(([k, v]) => [k, { status: v.status, quality: v.quality }])
        ) : null,
      };
    }

    let hand;
    try {
      hand = handFromEngine(e);
    } catch(err) {
      log.push(`ERROR building hand turn ${turn}: ${err.message}`);
      errorCount++;
      break;
    }

    if (hand.length === 0) {
      log.push(`STUCK: no cards available at week ${e.s.week}`);
      break;
    }

    const seenIds = new Set();
    for (const card of hand) {
      if (seenIds.has(card.id)) {
        log.push(`DUPLICATE_CARD: ${card.id} appeared twice in hand at week ${e.s.week}`);
        errorCount++;
      }
      seenIds.add(card.id);
    }

    handSizes.push({ week: e.s.week, size: hand.length });

    const alexNow = e.chars.get('alex');
    if (alexNow && alexNow.active) {
      moraleSnaps.push({ week: e.s.week, morale: Math.round(alexNow.morale), trust: Math.round(alexNow.trust) });
    }

    let ids = selectCards(hand, strategy, e.s);
    for (const [cardId, action] of Object.entries(cardOverrides)) {
      if (action === 'force_pick' && hand.some(c => c.id === cardId) && !ids.includes(cardId))
        ids.unshift(cardId);   // unshift so a forced pick survives the 2-action cap below
      else if (action === 'force_drop')
        ids = ids.filter(id => id !== cardId);
    }
    ids = ids.slice(0, 2);     // the week has 2 actions
    const opts = pickOptions(hand, ids, optStrategy, e.s);

    if (chatMode) {
      for (const id of ids) {
        const card = hand.find(c => c.id === id);
        if (card && card.options) {
          cardOptMap[id] = {
            options: card.options.map(o => ({ key: o.key, label: o.label })),
            chosenKey: opts[id],
          };
        }
      }
    }

    for (const card of hand) {
      const c = cardCounts[card.id] || (cardCounts[card.id] = { count: 0, weekSum: 0 });
      c.count++;
      c.weekSum += e.s.week;
    }

    // For YC discussions, always apply
    for (const id of ids) {
      if ((id === 'yc_discussion_ready' || id === 'yc_discussion_early') && !opts[id]) {
        opts[id] = 'apply';
      }
      if (id === 'alex_sync_discover' && !opts[id]) opts[id] = 'discover';
      if (id === 'alex_sync_build'    && !opts[id]) opts[id] = 'build';
      if (id === 'alex_commitment'    && !opts[id]) opts[id] = 'accept';

    }

    const offeredSnapshot = verbose ? hand.map(d => ({
      id: d.id, cat: d.cat,
      from: d.from || 'System',
      body: d.body,
      chosen: ids.includes(d.id),
      optLabel: ids.includes(d.id) && d.options ? (d.options.find(o => o.key === opts[d.id]) || d.options[0]).label : null,
    })) : null;

    if (e.s.ycApplied) ycEverApplied = true;
    const weekBefore = e.s.week;
    const ycWasPending = e.s.ycApplied && !e.s.ycAccepted;
    const alexChar = e.chars.get('alex');
    const alexAlreadyGone = alexChar && !alexChar.active;
    let results;
    try {
      results = actTurn(e, ids, opts);   // resolve the chosen cards (does not advance)
    } catch(err) {
      log.push(`ERROR resolving actions turn ${turn}: ${err.message}`);
      errorCount++;
      break;
    }

    // Ghost check: Alex pending messages must not fire after he has left
    if (alexAlreadyGone) {
      for (const msg of results) {
        if (/^Alex: "/.test(msg)) {
          log.push(`ALEX_GHOST: "${msg.slice(0, 80)}" at week ${weekBefore}`);
          errorCount++;
        }
      }
    }

    // --no-yc: intercept a fresh acceptance and revert it to a rejection
    if (noYC && ycWasPending && e.s.ycAccepted) {
      e.s.ycAccepted  = false;
      e.s.ycApplied   = false;
      e.s.game_won    = false;
      e.s.cash        = Math.max(0, e.s.cash - 500000);
      e.s.signal      = Math.max(0, e.s.signal - 25);
      e.ycWeek        = e.s.week + 12;
      const idx = results.indexOf("YC accepted! $500k added. See you at kickoff.");
      if (idx !== -1) results[idx] = "[no-yc] YC: passing on this batch. Next window opens in ~12 weeks.";
    }

    // Advance the week (burn, passive contributions, conversions, win/loss checks).
    e.nextWeek();
    // --no-yc: a natural rejection is now game-ending (s.ycRejected → game_over);
    // neutralize it too so this mode keeps exercising the angel arc.
    if (noYC && e.s.ycRejected) {
      e.s.ycRejected = false;
      e.s.game_over = e.s.cash <= 0;
      e.ycWeek = e.s.week + 12;
    }
    if (launchWeek == null && e.s.launched) launchWeek = e.s.week;

    if (verbose) {
      const alex = e.chars.get('alex');
      log.push({
        week: weekBefore,
        offered: offeredSnapshot,
        outcomes: results,
        cash: e.s.cash,
        roadmap: roadmapStr(e.s.items),
        fit: Math.round(e.s.market_fit),
        users: e.s.users,
        customers: e.s.customers,
        signal: Math.round(e.s.signal),
        launched: e.s.launched,
        alexTrust: alex ? Math.round(alex.trust) : null,
        alexMorale: alex ? Math.round(alex.morale) : null,
        alexActive: alex ? alex.active : false,
      });
    }
  }

  const alex = e.chars.get('alex');
  const activeChars = [...e.chars.entries()].filter(([,c]) => c.active).map(([id]) => id);

  if (chatMode) {
    weekSnaps[e.s.week] = {
      cash: e.s.cash, launched: e.s.launched,
      customers: e.s.customers, users: e.s.users,
      fit: Math.round(e.s.market_fit), signal: Math.round(e.s.signal),
      items: e.s.items ? Object.fromEntries(
        Object.entries(e.s.items).map(([k, v]) => [k, { status: v.status, quality: v.quality }])
      ) : null,
    };
  }

  return {
    won:      e.s.game_won,
    bankrupt: e.s.game_over,
    week:     e.s.week,
    roadmap:  roadmapScore(e.s.items),
    market_fit: e.s.market_fit,
    users:    e.s.users,
    customers:e.s.customers,
    signal:   e.s.signal,
    launched:   e.s.launched,
    launchWeek,
    ycApplied:        ycEverApplied,
    ycAccepted:       e.s.ycAccepted,
    marcusCommitted:  e.s.marcusCommitted,
    followerCommitted:e.s.followerCommitted,
    alexActive: alex ? alex.active : false,
    alexMorale: alex ? alex.morale : 0,
    alexTrust:  alex ? alex.trust  : 0,
    jordanResolved:    e.s.jordan_resolved    || false,
    activitiesPivoted: e.s.activities_pivot   || false,
    devPlan:           e.s.dev_plan           || null,
    activeChars,
    metPriya: e.s.met_priya || false,
    errors: errorCount,
    log,
    cardCounts,
    handSizes,
    moraleSnaps,
    ...(chatMode ? { engine: e, weekSnaps, cardOpts: cardOptMap } : {}),
  };
}

// ─── Run N games per strategy ────────────────────────────────────────────────

function runStrategy(name, strategy, n = 100, noYC = false) {
  const results = [];
  for (let i = 0; i < n; i++) results.push(runGame(strategy, 120, false, noYC));

  const pct = count => Math.round(count / n * 100);

  const wins      = pct(results.filter(r => r.won).length);
  const bankrupt  = pct(results.filter(r => r.bankrupt).length);
  const timeout   = pct(results.filter(r => !r.won && !r.bankrupt).length);
  const errors    = results.reduce((s, r) => s + r.errors, 0);
  const alexLeft  = pct(results.filter(r => !r.alexActive).length);
  const launched  = pct(results.filter(r => r.launched).length);
  const ycApplied = pct(results.filter(r => r.ycApplied).length);
  const ycAccepted= pct(results.filter(r => r.ycAccepted).length);

  const avgWeek   = (results.reduce((s,r) => s+r.week, 0) / n).toFixed(1);
  const avgUsers  = (results.reduce((s,r) => s+r.users, 0) / n).toFixed(1);
  const avgCust   = (results.reduce((s,r) => s+r.customers, 0) / n).toFixed(1);

  const avg    = arr => (arr.reduce((s, v) => s + v, 0) / n).toFixed(1);
  const avgRoadmap  = avg(results.map(r => r.roadmap));
  const avgFit      = avg(results.map(r => r.market_fit));
  const minFit      = Math.min(...results.map(r => r.market_fit)).toFixed(0);
  const maxFit      = Math.max(...results.map(r => r.market_fit)).toFixed(0);
  const pctReachedFit50  = pct(results.filter(r => r.market_fit >= 50).length);
  const pctReachedFit100 = pct(results.filter(r => r.market_fit >= 100).length);
  const marcusCommit       = pct(results.filter(r => r.marcusCommitted).length);
  const followerCommit     = pct(results.filter(r => r.followerCommitted).length);
  const jordanResolved     = pct(results.filter(r => r.jordanResolved).length);
  const activitiesPivoted  = pct(results.filter(r => r.activitiesPivoted).length);
  const devPlanLean = pct(results.filter(r => r.devPlan === 'lean').length);
  const devPlanFull = pct(results.filter(r => r.devPlan === 'full').length);
  const ryanEngaged    = pct(results.filter(r => r.activeChars.includes('ryan')).length);
  const priyaSeen  = pct(results.filter(r => r.activeChars.includes('priya')).length);
  const marcusSeen = pct(results.filter(r => r.activeChars.includes('marcus')).length);
  const fatimaSeen = pct(results.filter(r => r.activeChars.includes('fatima')).length);
  const ryanSeen   = pct(results.filter(r => r.activeChars.includes('ryan')).length);
  const sarahSeen  = pct(results.filter(r => r.activeChars.includes('sarah')).length);

  // Collect errors/stuck messages
  const issues = [];
  results.forEach(r => r.log.forEach(l => {
    if (l.includes('ERROR') || l.includes('STUCK') || l.includes('TIMEOUT')) issues.push(l);
  }));
  const uniqueIssues = [...new Set(issues)].slice(0, 5);

  // Aggregate card repetition counts across all games
  const countTotals = {};
  for (const r of results) {
    for (const [id, { count, weekSum }] of Object.entries(r.cardCounts)) {
      if (!countTotals[id]) countTotals[id] = { total: 0, max: 0, weekSum: 0 };
      countTotals[id].total   += count;
      countTotals[id].weekSum += weekSum;
      countTotals[id].max      = Math.max(countTotals[id].max, count);
    }
  }
  const repetition = Object.entries(countTotals)
    .map(([id, v]) => ({ id, avg: v.total / n, max: v.max, avgWeek: Math.round(v.weekSum / v.total) }))
    .filter(r => r.avg >= 2)
    .sort((a, b) => b.avg - a.avg);

  // Aggregate hand sizes by week
  const weekBuckets = {};
  for (const r of results) {
    for (const { week, size } of r.handSizes) {
      if (!weekBuckets[week]) weekBuckets[week] = [];
      weekBuckets[week].push(size);
    }
  }
  const weeklyHandSizes = Object.entries(weekBuckets)
    .map(([w, sizes]) => ({
      week: +w,
      avg:    +(sizes.reduce((a, b) => a + b, 0) / sizes.length).toFixed(2),
      min:    Math.min(...sizes),
      pctLow: +(sizes.filter(s => s < 4).length / sizes.length * 100).toFixed(0),
      games:  sizes.length,
    }))
    .sort((a, b) => a.week - b.week);

  // Alex morale at specific weeks: for each game, find the snap closest to targetWeek
  function avgMoraleAt(week) {
    const vals = [];
    for (const r of results) {
      let best = null, bestDist = Infinity;
      for (const s of r.moraleSnaps) {
        const d = Math.abs(s.week - week);
        if (d < bestDist) { bestDist = d; best = s; }
      }
      if (best && bestDist <= 2) vals.push(best.morale);
    }
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b) / vals.length) : null;
  }
  const avgMoraleWk3  = avgMoraleAt(3);
  const avgMoraleWk10 = avgMoraleAt(10);

  return { name, n, wins, bankrupt, timeout, errors, launched, alexLeft,
           ycApplied, ycAccepted, marcusCommit, followerCommit, ryanEngaged, jordanResolved, activitiesPivoted, devPlanLean, devPlanFull,
           avgWeek, avgUsers, avgCust, avgRoadmap,
           avgFit, minFit, maxFit, pctReachedFit50, pctReachedFit100,
           priyaSeen, marcusSeen, fatimaSeen, ryanSeen, sarahSeen,
           uniqueIssues, repetition, weeklyHandSizes,
           avgMoraleWk3, avgMoraleWk10 };
}

// ─── Report ───────────────────────────────────────────────────────────────────

CARD_PREFS.ignore_meetup = CARD_PREFS.lean_loop;
CARD_PREFS.plan_lean = { ...CARD_PREFS.lean_loop, dev_planning_session: 'lean' };
CARD_PREFS.plan_full = { ...CARD_PREFS.lean_loop, dev_planning_session: 'full' };
CARD_PREFS.no_pivot = {
  ...CARD_PREFS.angel_path,
  pivot_open:          'open',
  pivot_alex_pushback: 'ship',
  pivot_priya_verdict: 'ship',
  bad_retention:       'stay',
};
CARD_PREFS.keep_jordan = {
  ...CARD_PREFS.lean_loop,
  jordan_fulltime_ask:  'accept',
  jordan_launch_blocker:'web_only',
  jordan_confrontation: 'defer',
  jordan_cap_table:     'defer',
};
CARD_PREFS.skip_cap_table_angel = {
  ...CARD_PREFS.angel_path,
  jordan_cap_table: 'defer',
};

const strategies = [
  ['Random',              'random'],
  ['Distracted',          'distracted'],
  ['YC grind',            'yc_grind'],
  ['Alex first',          'alex_first'],
  ['Ignore Alex',         'ignore_alex'],
  ['Customer focus',      'customer_focus'],
  ['Lean loop',           'lean_loop'],
  ['Ignore meetup',       'ignore_meetup'],
  ['Angel path',          'angel_path'],
  ['Rand + full-time',    'rand_fulltime'],
  ['Rand + part-time',    'rand_parttime'],
  ['Keep Jordan',         'keep_jordan'],
  ['Skip cap table',      'skip_cap_table_angel'],
  ['No pivot',            'no_pivot'],
];

// ─── Options parser ───────────────────────────────────────────────────────────

const STRATEGY_NAMES = ['random','distracted','yc_grind','alex_first','ignore_alex','customer_focus','lean_loop','ignore_meetup','angel_path','rand_fulltime','rand_parttime','keep_jordan','skip_cap_table_angel','no_pivot'];

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { n: 100, noYC: false, mode: 'summary', winners: 3, fullMessages: false, strategy: 'lean_loop', chat: 1 };
  const errors = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i];

    if (a === '--help' || a === '-h') {
      console.log(`
Usage: node sim_proto.js [N] [--no-yc] [--winners [K] | --all | --chat [K]] [--strategy NAME]

Modes (mutually exclusive — default is summary):
  (no flag)          Run strategy comparison across all strategies.
  --winners [K]      Hunt for K winning traces (default: 3). Tries up to N games.
  --all              Print N card-centric traces regardless of outcome.
  --chat [K]         Print K per-character chat traces (default: 1). Runs up to N games.

Options:
  N                  Number of games: samples per strategy (summary),
                     max attempts (--winners/--chat), or traces printed (--all).
                     Default: 100.
  --strategy NAME    Strategy to use for --all, --winners, and --chat modes (default: lean_loop).
                     One of: ${STRATEGY_NAMES.join(', ')}.
  --no-yc            Block YC acceptance — forces the angel fundraising path.
  --messages         Print full card bodies and outcome messages without truncation.
  -h, --help         Show this help.

Examples:
  node sim_proto.js                              Summary, 100 games each
  node sim_proto.js 500                          Summary, 500 games each
  node sim_proto.js 500 --no-yc                  Summary, angel path only
  node sim_proto.js 200 --winners                Hunt for 3 lean_loop winners
  node sim_proto.js 500 --winners 1 --no-yc      One angel-path win, up to 500 tries
  node sim_proto.js 5 --all                      Print 5 lean_loop card-centric traces
  node sim_proto.js 5 --all --strategy angel_path  Print 5 angel_path traces
  node sim_proto.js --chat                       Print 1 lean_loop chat trace
  node sim_proto.js 50 --chat 3                  Hunt up to 50 games for 3 winners, print chat traces
  node sim_proto.js --chat --strategy angel_path  Print 1 angel_path chat trace
`);
      process.exit(0);
    }

    if (a === '--no-yc')     { opts.noYC = true; continue; }
    if (a === '--messages')  { opts.fullMessages = true; continue; }

    if (a === '--strategy') {
      const name = args[i + 1];
      if (!name || !STRATEGY_NAMES.includes(name)) {
        errors.push(`--strategy requires a name: ${STRATEGY_NAMES.join(', ')}`);
        break;
      }
      opts.strategy = name;
      i++;
      continue;
    }

    if (a === '--winners') {
      if (opts.mode === 'all') { errors.push('--winners and --all are mutually exclusive'); break; }
      opts.mode = 'winners';
      const v = parseInt(args[i + 1], 10);
      if (!isNaN(v) && v > 0) { opts.winners = v; i++; }
      continue;
    }

    if (a === '--all') {
      if (opts.mode === 'winners') { errors.push('--winners and --all are mutually exclusive'); break; }
      opts.mode = 'all';
      continue;
    }

    if (a === '--chat') {
      if (opts.mode === 'winners' || opts.mode === 'all') { errors.push('--chat is mutually exclusive with --winners and --all'); break; }
      opts.mode = 'chat';
      const v = parseInt(args[i + 1], 10);
      if (!isNaN(v) && v > 0) { opts.chat = v; i++; }
      continue;
    }

    if (/^\d+$/.test(a)) { opts.n = parseInt(a, 10); continue; }

    errors.push(`unknown option: ${a}`);
  }

  if (errors.length) {
    errors.forEach(e => console.error(`error: ${e}`));
    console.error('Run with --help for usage.');
    process.exit(1);
  }

  return opts;
}

const { n: N, noYC: NO_YC, mode, winners: WINNERS_COUNT, chat: CHAT_COUNT, fullMessages: FULL_MESSAGES, strategy: TRACE_STRATEGY } = parseArgs(process.argv);
const WINNERS_FLAG = mode === 'winners';
const ALL_FLAG     = mode === 'all';
const CHAT_FLAG    = mode === 'chat';

// ─── Narrative trace ──────────────────────────────────────────────────────────

function printTrace(trace, label, fullMessages = false) {
  const trunc = fullMessages ? (str) => str : (str, n) => str.length > n ? str.slice(0, n - 1) + '…' : str;
  const sep = '─'.repeat(72);

  console.log(`=== STORY TRACE: ${label || 'lean_loop'} ===\n`);

  for (const turn of trace.log) {
    if (typeof turn === 'string') { console.log('  ' + turn); continue; }

    const mo = Math.ceil(turn.week / 4);
    console.log(`  Wk ${String(turn.week).padEnd(3)} Month ${mo}   ${sep.slice(0, 52)}`);

    // Cards offered
    for (const d of turn.offered) {
      const marker = d.chosen ? '  ✓' : '  ✗';
      const tag    = `[${d.cat}] ${d.from}`.padEnd(24);
      console.log(`${marker}  ${tag}  "${trunc(d.body, 60)}"`);
      if (d.chosen && d.optLabel) {
        console.log(`         → ${d.optLabel}`);
      }
    }

    // Outcomes
    if (turn.outcomes.length) {
      console.log();
      for (const msg of turn.outcomes) {
        console.log(`         "${trunc(msg, 80)}"`);
      }
    }

    // Stats
    const alexStr = turn.alexActive !== false
      ? `Alex trust:${turn.alexTrust} morale:${turn.alexMorale}`
      : 'Alex: gone';
    const launchStr = turn.launched ? 'launched' : 'pre-launch';
    console.log(`\n         Cash $${turn.cash.toLocaleString()}  Fit ${turn.fit}%  Users ${turn.users}  Customers ${turn.customers}  Signal ${turn.signal}  ${launchStr}  ${alexStr}`);
    if (turn.roadmap !== '—') console.log(`         Roadmap: ${turn.roadmap}`);
    console.log();
  }

  const result = trace.won ? '🏆 WON' : trace.bankrupt ? '💸 BANKRUPT' : '⏱  TIMEOUT';
  console.log(`  ${result} — Week ${trace.week} · Roadmap: ${trace.roadmap} solid · Customers ${trace.customers}`);
  console.log(`  YC: applied=${trace.ycApplied} accepted=${trace.ycAccepted}`);
  console.log(`  Active chars: ${trace.activeChars.join(', ')}`);

  const reps = Object.entries(trace.cardCounts || {})
    .filter(([, v]) => v.count > 3)
    .sort(([, a], [, b]) => b.count - a.count);
  if (reps.length > 0) {
    const parts = reps.slice(0, 10).map(([id, v]) => {
      const avgWk = Math.round(v.weekSum / v.count);
      return `${id}×${v.count}@wk${avgWk}`;
    });
    console.log(`  Repeated cards (>3×): ${parts.join('  ')}`);
  }
}

// ─── Chat-thread trace ────────────────────────────────────────────────────────

function printChatTrace(result, fullMessages = false) {
  const trunc = fullMessages
    ? (s) => s || ''
    : (s, n) => s && s.length > (n || 80) ? s.slice(0, (n || 80) - 1) + '…' : (s || '');

  const e = result.engine;
  const weekSnaps = result.weekSnaps || {};
  const cardOptMap = result.cardOpts || {};

  // Outcome lookup: cardId → voiced outcome (lives in founder thread)
  const outcomeByCard = {};
  for (const entry of (e.threads.founder || [])) {
    if (entry.type === 'outcome' && entry.cardId) {
      outcomeByCard[entry.cardId] = entry.body;
    }
  }

  // Set of cardIds that expired unanswered
  const ignoredCards = new Set();
  for (const l of e.log) {
    if (l.ignored) ignoredCards.add(l.ignored);
  }

  // ── Header ─────────────────────────────────────────────────────────────────
  const resultLabel = result.won ? 'WIN' : result.bankrupt ? 'BANKRUPT' : 'TIMEOUT';
  console.log('\n' + '═'.repeat(70));
  console.log(`TRACE  result=${resultLabel} (W${result.week})  customers=${result.customers}  fit=${Math.round(result.market_fit)}%`);
  console.log('═'.repeat(70));

  // ── Timeline ───────────────────────────────────────────────────────────────
  console.log('\nTIMELINE');
  console.log('─'.repeat(50));

  const stampsByWeek = {};
  for (const entry of (e.threads.founder || [])) {
    if (entry.type === 'stamp') {
      if (!stampsByWeek[entry.week]) stampsByWeek[entry.week] = [];
      stampsByWeek[entry.week].push(entry.label);
    }
  }

  const weeks = Object.keys(weekSnaps).map(Number).sort((a, b) => a - b);
  let prevSnap = null;
  for (const wk of weeks) {
    const snap = weekSnaps[wk];
    const events = [];
    if (!prevSnap) {
      events.push('start');
    } else {
      if (snap.launched && !prevSnap.launched)           events.push('launched=true');
      if (snap.customers > 0 && prevSnap.customers === 0) events.push('first_customer');
      else if (snap.customers !== prevSnap.customers)    events.push(`customers=${snap.customers}`);
      if (snap.users > 0 && prevSnap.users === 0)       events.push('first_user');
    }
    for (const label of (stampsByWeek[wk] || [])) events.push(`✦ ${label}`);
    {
      const evStr = events.length ? '  ' + events.join('  ') : '';
      console.log(`W${String(wk).padStart(2)}  cash=$${snap.cash.toLocaleString()}  users=${snap.users}  customers=${snap.customers}  fit=${snap.fit}%${evStr}`);
    }
    prevSnap = snap;
  }
  if (result.won)      console.log(`W${result.week}  ← YC_ACCEPTED  WIN`);
  else if (result.bankrupt) console.log(`W${result.week}  ← BANKRUPT`);

  // ── Per-character chat threads ─────────────────────────────────────────────
  const noChatSet = new Set(e.noChatChars);
  const chatCharIds  = e.order.filter(id => id !== 'founder' && !noChatSet.has(id));
  const eventCharIds = e.order.filter(id => noChatSet.has(id));

  for (const charId of chatCharIds) {
    const thread = e.threads[charId] || [];
    if (thread.length === 0) continue;

    const nameEntry = thread.find(ent => ent.from && ent.type === 'incoming' && !ent.dropped);
    const charName = nameEntry ? nameEntry.from : charId;

    console.log(`\n${'─'.repeat(70)}`);
    console.log(`CHAT: ${charName}`);
    console.log('─'.repeat(70));

    let i = 0;
    while (i < thread.length) {
      const entry = thread[i];

      // Consequence/follow-up message (dropMsg) — shown inline after its ignored card
      if (entry.type === 'incoming' && entry.dropped) {
        console.log(`[W${String(entry.week).padStart(2)}]   → ${entry.from}: "${trunc(entry.body, 90)}"  ← follow-up after no reply`);
        console.log();
        i++;
        continue;
      }

      if (entry.type === 'incoming') {
        const wk = entry.week;
        const cardId = entry.cardId;
        const snap = weekSnaps[wk] || {};

        // Detect what happened to this message
        const next = thread[i + 1];
        const wasReplied = next && next.type === 'reply' && next.cardId === cardId;
        const wasIgnored = cardId && ignoredCards.has(cardId);
        // Some cards have chat:false — answered but no reply bubble, only an outcome in the journal
        const wasAnsweredSilently = !wasReplied && cardId && !!outcomeByCard[cardId];

        console.log(`[W${String(wk).padStart(2)}] ${entry.from}: "${trunc(entry.body, 90)}"`);
        if (entry.subtext) console.log(`       ${entry.subtext}`);

        if (wasReplied || wasAnsweredSilently) {
          const cardData = cardId ? cardOptMap[cardId] : null;
          const chosenKey = cardData ? cardData.chosenKey : null;

          if (wasReplied) {
            console.log(`       ✓ Chose: "${trunc(next.body, 80)}"`);
          } else {
            const chosenOpt = cardData && cardData.options.find(o => o.key === chosenKey);
            if (chosenOpt) console.log(`       ✓ Chose: "${chosenOpt.label}" (no dialogue reply)`);
          }

          if (cardData && cardData.options.length > 1) {
            for (const opt of cardData.options) {
              if (opt.key !== chosenKey) console.log(`       ↩ Skipped: "${opt.label}"`);
            }
          }

          i += wasReplied ? 2 : 1;
        } else if (wasIgnored) {
          console.log(`       ⚠ IGNORED (patience expired)`);
          i++;
        } else {
          console.log(`       (open at game end)`);
          i++;
        }
        console.log();
        continue;
      }

      i++;
    }
  }

  // ── Events & notifications (noChat sources: HN, Twitter, YC, Analytics, etc.) ──
  const eventEntries = [];
  for (const charId of eventCharIds) {
    for (const entry of (e.threads[charId] || [])) {
      eventEntries.push({ charId, ...entry });
    }
  }
  eventEntries.sort((a, b) => a.week - b.week);

  if (eventEntries.length > 0) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log('EVENTS & NOTIFICATIONS (HN, Twitter, YC, Analytics, Users)');
    console.log('─'.repeat(70));
    for (const entry of eventEntries) {
      const wk = String(entry.week).padStart(2);
      const snap = weekSnaps[entry.week] || {};
      const snapStr = snap.cash !== undefined
        ? `       state: {cash:$${snap.cash.toLocaleString()} launched:${snap.launched} customers:${snap.customers} fit:${snap.fit}%}`
        : '';
      if (entry.type === 'incoming' && !entry.dropped) {
        console.log(`[W${wk}] ${entry.from}: "${trunc(entry.body, 90)}"`);
        if (snapStr) console.log(snapStr);
        // Show chosen option + outcome if answered
        const cardData = entry.cardId ? cardOptMap[entry.cardId] : null;
        if (cardData) {
          const chosenOpt = cardData.options.find(o => o.key === cardData.chosenKey);
          if (chosenOpt) console.log(`       ✓ Chose: "${chosenOpt.label}"`);
          if (cardData.options.length > 1) {
            for (const opt of cardData.options) {
              if (opt.key !== cardData.chosenKey) console.log(`       ↩ Skipped: "${opt.label}"`);
            }
          }
        } else if (ignoredCards.has(entry.cardId)) {
          console.log(`       ⚠ IGNORED`);
        }
        console.log();
      } else if (entry.type === 'incoming' && entry.dropped) {
        console.log(`[W${wk}]   → ${entry.from}: "${trunc(entry.body, 90)}"  ← follow-up`);
        console.log();
      }
    }
  }

  // ── Roadmap changes ────────────────────────────────────────────────────────
  // Diff consecutive weekSnaps to find when item statuses/qualities changed.
  // Changes are logged as happening *during* the week whose snapshot precedes them.
  const roadmapChanges = [];
  for (let wi = 1; wi < weeks.length; wi++) {
    const prevWk  = weeks[wi - 1];
    const curWk   = weeks[wi];
    const prevIts = weekSnaps[prevWk].items || {};
    const curIts  = weekSnaps[curWk].items  || {};
    const allKeys = new Set([...Object.keys(prevIts), ...Object.keys(curIts)]);
    for (const k of allKeys) {
      const p = prevIts[k] || null;
      const c = curIts[k]  || null;
      if (!p && c) {
        roadmapChanges.push({ week: prevWk, key: k, from: null, to: c });
      } else if (p && !c) {
        roadmapChanges.push({ week: prevWk, key: k, from: p, to: null });
      } else if (p && c && (p.status !== c.status || p.quality !== c.quality)) {
        roadmapChanges.push({ week: prevWk, key: k, from: p, to: c });
      }
    }
  }

  if (roadmapChanges.length > 0) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log('ROADMAP CHANGES');
    console.log('─'.repeat(70));
    for (const { week: wk, key, from, to } of roadmapChanges) {
      const wkStr = String(wk).padStart(2);
      const snap  = weekSnaps[wk] || {};
      const ctx   = snap.cash !== undefined
        ? ` {launched:${snap.launched} customers:${snap.customers} fit:${snap.fit}%}`
        : '';
      if (!from) {
        const qual = to.quality ? ` (${to.quality})` : '';
        console.log(`[W${wkStr}] + ${key}: ${to.status}${qual}  ← new item${ctx}`);
      } else if (!to) {
        console.log(`[W${wkStr}] - ${key}: removed${ctx}`);
      } else {
        const fromStr = from.quality ? `${from.status} (${from.quality})` : from.status;
        const toStr   = to.quality   ? `${to.status} (${to.quality})`     : to.status;
        console.log(`[W${wkStr}]   ${key}:  ${fromStr} → ${toStr}${ctx}`);
      }
    }
  }

  // ── Founder journal ────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(70)}`);
  console.log('JOURNAL (founder)');
  console.log('─'.repeat(70));

  for (const entry of (e.threads.founder || [])) {
    const wk = String(entry.week).padStart(2);
    if (entry.type === 'stamp') {
      console.log(`[W${wk}] ✦ ${entry.label}`);
    } else if (entry.type === 'outcome') {
      const tag = entry.from ? `[${entry.from}] ` : '';
      console.log(`[W${wk}] ${tag}${trunc(entry.body, 110)}`);
    } else if (entry.type === 'incoming') {
      console.log(`[W${wk}] ${entry.from}: "${trunc(entry.body, 90)}"`);
    }
  }
  console.log();
}

// ─── Mode dispatch ────────────────────────────────────────────────────────────

if (WINNERS_FLAG) {
  const winners = [];
  let attempts = 0;

  process.stdout.write(`\nHunting for ${WINNERS_COUNT} winning ${TRACE_STRATEGY} game(s)${NO_YC ? ' [YC disabled]' : ''} (up to ${N} tries)…`);
  while (winners.length < WINNERS_COUNT && attempts < N) {
    const g = runGame(TRACE_STRATEGY, 120, true, NO_YC);
    attempts++;
    if (g.won) {
      winners.push(g);
      process.stdout.write(` found one (attempt ${attempts})`);
    }
  }
  console.log(`\nFound ${winners.length}/${WINNERS_COUNT} in ${attempts} attempts.\n`);

  winners.forEach((w, i) =>
    printTrace(w, `${TRACE_STRATEGY} WIN #${i + 1} of ${winners.length} (attempt ~${Math.round(attempts / winners.length * (i + 1))})`, FULL_MESSAGES)
  );

} else if (ALL_FLAG) {
  const ycTag = NO_YC ? ' — YC disabled' : '';
  for (let i = 0; i < N; i++) {
    const g = runGame(TRACE_STRATEGY, 120, true, NO_YC);
    printTrace(g, `${TRACE_STRATEGY} run ${i + 1}/${N}${ycTag}`, FULL_MESSAGES);
  }

} else if (CHAT_FLAG) {
  const found = [];
  let attempts = 0;
  process.stdout.write(`\nHunting for ${CHAT_COUNT} ${TRACE_STRATEGY} chat trace(s) (any outcome)${NO_YC ? ' [YC disabled]' : ''}…`);
  while (found.length < CHAT_COUNT && attempts < Math.max(N, CHAT_COUNT)) {
    const g = runGame(TRACE_STRATEGY, 120, false, NO_YC, {}, true);
    attempts++;
    found.push(g);
  }
  console.log(` ${found.length} game(s) in ${attempts} attempt(s).\n`);
  found.forEach(g => printChatTrace(g, FULL_MESSAGES));

} else {
  // Default: strategy summary only
  console.log(`\n=== PROTOTYPE SIMULATION (${N} games each${NO_YC ? ' — YC DISABLED' : ''}) ===\n`);

  const byStrat = {};
  for (const [name, strat] of strategies) {
    const r = runStrategy(name, strat, N, NO_YC);
    byStrat[strat] = r;
    console.log(`── ${r.name} ──`);
    console.log(`  Win ${r.wins}%  Bankrupt ${r.bankrupt}%  Timeout ${r.timeout}%  Errors ${r.errors}`);
    console.log(`  Launched: ${r.launched}%  Alex left: ${r.alexLeft}%  Jordan resolved: ${r.jordanResolved}%  Activities pivoted: ${r.activitiesPivoted}%  YC applied: ${r.ycApplied}%  YC accepted: ${r.ycAccepted}%`);
    console.log(`  Marcus committed: ${r.marcusCommit}%  Follower in: ${r.followerCommit}%  Ryan engaged: ${r.ryanEngaged}%`);
    console.log(`  Avg week: ${r.avgWeek}  Avg users (free): ${r.avgUsers}  Avg customers (paying): ${r.avgCust}`);
    console.log(`  Roadmap — avg solid items: ${r.avgRoadmap}`);
    console.log(`  Fit     — avg: ${r.avgFit}%  min: ${r.minFit}%  max: ${r.maxFit}%  (fit≥50: ${r.pctReachedFit50}%  fit=100: ${r.pctReachedFit100}%)`);
    console.log(`  Characters unlocked — Priya: ${r.priyaSeen}%  Sarah: ${r.sarahSeen}%  Marcus: ${r.marcusSeen}%  Ryan: ${r.ryanSeen}%  Fatima: ${r.fatimaSeen}%`);
    if (r.avgMoraleWk3 !== null || r.avgMoraleWk10 !== null)
      console.log(`  Alex morale — wk3 avg: ${r.avgMoraleWk3 ?? 'n/a'}  wk10 avg: ${r.avgMoraleWk10 ?? 'n/a'}`);
    if (r.uniqueIssues.length > 0) console.log(`  Issues: ${r.uniqueIssues.join(' | ')}`);
    console.log();
  }

  // ── Regression checks ──────────────────────────────────────────────────────
  (function regressionChecks(s) {
    const checks = [];
    const check = (desc, pass) => checks.push({ desc, pass });

    // Win rate ordering — smart strategies must beat random
    check(`random.wins (${s.random.wins}%) < 5%`,
          s.random.wins < 5);
    check(`random.wins (${s.random.wins}%) < yc_grind.wins (${s.yc_grind.wins}%)`,
          s.random.wins < s.yc_grind.wins);
    check(`random.wins (${s.random.wins}%) < lean_loop.wins (${s.lean_loop.wins}%)`,
          s.random.wins < s.lean_loop.wins);
    check(`random.wins (${s.random.wins}%) < angel_path.wins (${s.angel_path.wins}%)`,
          s.random.wins < s.angel_path.wins);
    check(`random.launched (${s.random.launched}%) < yc_grind.launched (${s.yc_grind.launched}%)`,
          s.random.launched < s.yc_grind.launched);

    // Broken strategies must never win
    check(`ignore_alex.wins = ${s.ignore_alex.wins}% (expected 0)`,
          s.ignore_alex.wins === 0);
    check(`customer_focus.wins = ${s.customer_focus.wins}% (expected 0)`,
          s.customer_focus.wins === 0);

    // Pushing alex_commitment full-time (yc_grind) beats accepting part-time (alex_first)
    check(`alex_first.wins (${s.alex_first.wins}%) < yc_grind.wins (${s.yc_grind.wins}%)`,
          s.alex_first.wins < s.yc_grind.wins);

    // Alex retention
    check(`ignore_alex.alexLeft (${s.ignore_alex.alexLeft}%) >= 90%`,
          s.ignore_alex.alexLeft >= 90);
    check(`customer_focus.alexLeft (${s.customer_focus.alexLeft}%) >= 80%`,
          s.customer_focus.alexLeft >= 80);
    check(`alex_first.alexLeft (${s.alex_first.alexLeft}%) <= 10%`,
          s.alex_first.alexLeft <= 10);
    check(`lean_loop.alexLeft (${s.lean_loop.alexLeft}%) <= 10%`,
          s.lean_loop.alexLeft <= 10);
    check(`distracted.alexLeft (${s.distracted.alexLeft}%) > alex_first.alexLeft (${s.alex_first.alexLeft}%)`,
          s.distracted.alexLeft > s.alex_first.alexLeft);

    // Ignoring Alex must produce fewer roadmap items completed than actively engaging him
    check(`ignore_alex.avgRoadmap (${s.ignore_alex.avgRoadmap}) < alex_first.avgRoadmap (${s.alex_first.avgRoadmap})`,
          parseFloat(s.ignore_alex.avgRoadmap) < parseFloat(s.alex_first.avgRoadmap));
    check(`ignore_alex.avgRoadmap (${s.ignore_alex.avgRoadmap}) < lean_loop.avgRoadmap (${s.lean_loop.avgRoadmap})`,
          parseFloat(s.ignore_alex.avgRoadmap) < parseFloat(s.lean_loop.avgRoadmap));

    // Controlled test: full-time commitment (rand_fulltime) reduces Alex departure vs part-time (rand_parttime)
    check(`rand_parttime.alexLeft (${s.rand_parttime.alexLeft}%) >= rand_fulltime.alexLeft (${s.rand_fulltime.alexLeft}%)`,
          s.rand_parttime.alexLeft >= s.rand_fulltime.alexLeft);

    // YC application behaviour — batch 1 now at fixed week 30
    // yc_grind uses full-time Alex and grabs F&F cash → survives to week 30 → applies (often unqualified)
    check(`yc_grind.ycApplied (${s.yc_grind.ycApplied}%) >= 40% — full plan with full-time Alex applies to YC`,
          s.yc_grind.ycApplied >= 40);
    // lean plan survives to week 30 in roughly half of games → applies
    check(`lean_loop.ycApplied (${s.lean_loop.ycApplied}%) >= 40%`,
          s.lean_loop.ycApplied >= 40);
    check(`angel_path.ycApplied (${s.angel_path.ycApplied}%) <= 10%`,
          s.angel_path.ycApplied <= 10);
    check(`ignore_alex.ycApplied (${s.ignore_alex.ycApplied}%) <= 10%`,
          s.ignore_alex.ycApplied <= 10);

    // Angel path must engage Marcus
    check(`angel_path.marcusCommit (${s.angel_path.marcusCommit}%) >= 10%`,
          s.angel_path.marcusCommit >= 10);

    // Alex morale: ignoring him must cause morale to crash, engaging must keep it healthy
    check(`ignore_alex.avgMoraleWk3 (${s.ignore_alex.avgMoraleWk3}) > 70 — starts high before consequences hit`,
          (s.ignore_alex.avgMoraleWk3 ?? 0) > 70);
    check(`ignore_alex.avgMoraleWk10 (${s.ignore_alex.avgMoraleWk10}) < 15 — crashed near departure threshold`,
          (s.ignore_alex.avgMoraleWk10 ?? 100) < 15);
    check(`ignore_alex morale declining: wk3 (${s.ignore_alex.avgMoraleWk3}) > wk10 (${s.ignore_alex.avgMoraleWk10})`,
          (s.ignore_alex.avgMoraleWk3 ?? 0) > (s.ignore_alex.avgMoraleWk10 ?? 100));
    check(`alex_first.avgMoraleWk10 (${s.alex_first.avgMoraleWk10}) > 50 — engagement keeps morale healthy`,
          (s.alex_first.avgMoraleWk10 ?? 0) > 50);

    // Meetup: skipping it must suppress Priya; win rates should stay comparable
    check(`ignore_meetup.priyaSeen = ${s.ignore_meetup.priyaSeen}% (expected 0)`,
          s.ignore_meetup.priyaSeen === 0);
    check(`ignore_meetup.wins (${s.ignore_meetup.wins}%) within 15pts of lean_loop.wins (${s.lean_loop.wins}%)`,
          Math.abs(s.ignore_meetup.wins - s.lean_loop.wins) <= 15);

    // Jordan arc: not resolving Jordan collapses execution; cap table blocks angel round
    check(`skip_cap_table_angel.wins (${s.skip_cap_table_angel.wins}%) < 5% — dirty cap table blocks angel round`,
          s.skip_cap_table_angel.wins < 5);
    check(`keep_jordan.jordanResolved = ${s.keep_jordan.jordanResolved}% (expected 0) — strategy never fires Jordan`,
          s.keep_jordan.jordanResolved === 0);
    check(`lean_loop.jordanResolved (${s.lean_loop.jordanResolved}%) >= 80%`,
          s.lean_loop.jordanResolved >= 80);
    check(`angel_path.jordanResolved (${s.angel_path.jordanResolved}%) >= 90%`,
          s.angel_path.jordanResolved >= 90);
    check(`keep_jordan.launched (${s.keep_jordan.launched}%) < lean_loop.launched/2 (${Math.floor(s.lean_loop.launched / 2)}%) — unresolved Jordan collapses execution`,
          s.keep_jordan.launched < s.lean_loop.launched / 2);

    // Pivot arc: pivoting must improve outcomes; refusing must hurt
    check(`lean_loop.activitiesPivoted (${s.lean_loop.activitiesPivoted}%) >= 80% — lean strategy follows user signal`,
          s.lean_loop.activitiesPivoted >= 80);
    check(`no_pivot.activitiesPivoted (${s.no_pivot.activitiesPivoted}%) === 0 — strategy explicitly refuses`,
          s.no_pivot.activitiesPivoted === 0);
    check(`no_pivot.wins (${s.no_pivot.wins}%) < angel_path.wins (${s.angel_path.wins}%) — ignoring user signal kills angel-path traction`,
          s.no_pivot.wins < s.angel_path.wins);

    // Errors — no strategy should produce runtime errors
    const totalErrors = Object.values(s).reduce((sum, r) => sum + r.errors, 0);
    check(`no runtime errors across all strategies (total: ${totalErrors})`,
          totalErrors === 0);

    // Dev plan: strategies pick the right plan type
    check(`lean_loop picks dev_plan=lean (${s.lean_loop.devPlanLean}%) >= 80%`, s.lean_loop.devPlanLean >= 80);
    check(`yc_grind picks dev_plan=full (${s.yc_grind.devPlanFull}%) >= 85%`, s.yc_grind.devPlanFull >= 85);

    const passed = checks.filter(c => c.pass).length;
    const failed = checks.filter(c => !c.pass).length;
    console.log(`── Regression checks (${passed}/${checks.length} passed) ──`);
    for (const c of checks) {
      console.log(`  ${c.pass ? 'PASS' : 'FAIL'}  ${c.desc}`);
    }
    if (failed > 0) console.log(`\n  ✗ ${failed} check${failed > 1 ? 's' : ''} FAILED`);
    console.log();
  })(byStrat);

  // ── Repetition report ──────────────────────────────────────────────────────
  (function repetitionReport(s) {
    // Merge repetition data: for each card, track worst avg across all strategies
    const merged = {};
    for (const r of Object.values(s)) {
      for (const { id, avg, max, avgWeek } of r.repetition) {
        if (!merged[id] || merged[id].avg < avg) merged[id] = { avg, max, avgWeek };
      }
    }
    const rows = Object.entries(merged)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 20);

    if (rows.length === 0) { console.log(`── Repetition report — no cards averaging ≥2×/game ──\n`); return; }

    // Cards that are intentionally high-frequency (safety valve, solo-mode fallback, etc.)
    // — high counts are expected and not bugs.
    const EXPECTED_FREQUENT = new Set(['founder_reflect', 'alex_sync_discover', 'founder_solo_discover']);
    const WARN = 5, CRIT = 15;
    const flagged = rows.filter(r => !EXPECTED_FREQUENT.has(r.id));
    const expected = rows.filter(r => EXPECTED_FREQUENT.has(r.id));

    console.log(`── Repetition report (worst avg across strategies, cards avg ≥2×/game) ──`);
    console.log(`   ${'card'.padEnd(32)} avg/game    max  avgWk`);
    for (const r of flagged) {
      const flag = r.avg >= CRIT ? '  ← CRITICAL' : r.avg >= WARN ? '  ← WARN' : '';
      console.log(`   ${r.id.padEnd(32)} ${r.avg.toFixed(1).padStart(6)}   ${String(r.max).padStart(4)}   ${String(r.avgWeek).padStart(3)}${flag}`);
    }
    if (expected.length > 0) {
      console.log(`   (expected fallbacks — high counts normal in losing/stuck games)`);
      for (const r of expected) {
        console.log(`   ${r.id.padEnd(32)} ${r.avg.toFixed(1).padStart(6)}   ${String(r.max).padStart(4)}   ${String(r.avgWeek).padStart(3)}`);
      }
    }
    console.log();
  })(byStrat);

  // ── Card availability distribution ────────────────────────────────────────
  (function cardDistribution(s) {
    const strats = Object.values(s);
    const maxWeek = Math.max(...strats.flatMap(r => r.weeklyHandSizes.map(w => w.week)));
    const SHOW_UP_TO = Math.min(maxWeek, 24);

    // Short labels for column headers
    const labels = strats.map(r => r.name.slice(0, 6).padEnd(6));
    console.log(`── Card availability: avg hand size per week (max 6) ──`);
    console.log(`   Wk  ` + labels.join('  '));

    for (let wk = 1; wk <= SHOW_UP_TO; wk++) {
      const cells = strats.map(r => {
        const entry = r.weeklyHandSizes.find(e => e.week === wk);
        if (!entry || entry.games < Math.max(1, r.n * 0.05)) return '  --  ';
        const val = entry.avg.toFixed(1);
        const flag = entry.pctLow >= 50 ? '!' : entry.pctLow >= 20 ? '~' : ' ';
        return (flag + val).padStart(5) + ' ';
      });
      console.log(`  ${String(wk).padStart(2)}  ${cells.join(' ')}`);
    }
    console.log(`   (! = >50% of turns had <4 cards  ~ = >20%)\n`);
  })(byStrat);

  // Sanity check
  (function checkBuildGrowsFit() {
    const RUNS = 30;
    let grew = 0, totalFit = 0;
    for (let i = 0; i < RUNS; i++) {
      const e = new Engine();
      const alex = e.chars.get('alex');
      for (let turn = 0; turn < 15; turn++) {
        if (e.s.game_won || e.s.game_over) break;
        alex.focus = 'build';
        const hand = handFromEngine(e);
        if (hand.length === 0) break;
        const ids  = selectCards(hand, 'yc_grind').slice(0, 2);
        const opts = pickOptions(hand, ids, 'yc_grind');
        actTurn(e, ids, opts);
        e.nextWeek();
      }
      if (e.s.market_fit > 0) grew++;
      totalFit += e.s.market_fit;
    }
    const avg = (totalFit / RUNS).toFixed(1);
    const pass = grew >= Math.ceil(RUNS * 0.5);
    console.log(`CHECK build→market_fit: grew in ${grew}/${RUNS} games, avg fit=${avg}  ${pass ? 'PASS' : 'FAIL'}`);
  })();

  // ── Meetup impact: attend vs skip ────────────────────────────────────────────
  (function checkMeetupImpact() {
    const RUNS = 200;
    const attend = [], skip = [];
    for (let i = 0; i < RUNS; i++) {
      attend.push(runGame('lean_loop', 120, false, false, { founder_meetup: 'force_pick' }));
      skip.push(  runGame('lean_loop', 120, false, false, { founder_meetup: 'force_drop' }));
    }

    const pct = (arr, fn) => Math.round(arr.filter(fn).length / arr.length * 100);
    const avg = (arr, fn) => (arr.reduce((s, r) => s + fn(r), 0) / arr.length).toFixed(1);

    const rows = [
      ['Win rate',      pct(attend, r => r.won),                          pct(skip, r => r.won)],
      ['Bankrupt',      pct(attend, r => r.bankrupt),                     pct(skip, r => r.bankrupt)],
      ['Priya active',  pct(attend, r => r.activeChars.includes('priya')),pct(skip, r => r.activeChars.includes('priya'))],
      ['Avg signal',    avg(attend, r => r.signal),                       avg(skip, r => r.signal)],
      ['Avg market fit',avg(attend, r => r.market_fit),                   avg(skip, r => r.market_fit)],
      ['Avg week',      avg(attend, r => r.week),                         avg(skip, r => r.week)],
    ];

    console.log(`\nCHECK meetup impact (lean_loop, ${RUNS} games each)`);
    console.log(`  ${''.padEnd(18)} attend    skip`);
    for (const [label, a, s] of rows) {
      const fmt = v => typeof v === 'number' ? v + '%' : v;
      console.log(`  ${label.padEnd(18)} ${fmt(a).padStart(6)}  ${fmt(s).padStart(6)}`);
    }

    const priyaWithAttend = pct(attend, r => r.activeChars.includes('priya'));
    const priyaWithSkip   = pct(skip,   r => r.activeChars.includes('priya'));
    const p1 = priyaWithAttend > 50;
    const p2 = priyaWithSkip === 0;
    console.log(`  Priya unlock rate >50% when attended: ${p1 ? 'PASS' : 'FAIL'}  (${priyaWithAttend}%)`);
    console.log(`  Priya never unlocks when skipped:     ${p2 ? 'PASS' : 'FAIL'}  (${priyaWithSkip}%)`);
  })();

  // ── Planning strategy impact: lean vs full vs no planning ───────────────────
  (() => {
    const RUNS = 500;
    const lean = [], full = [], none = [];
    for (let i = 0; i < RUNS; i++) {
      lean.push(runGame('plan_lean', 120, false, false));
      full.push(runGame('plan_full', 120, false, false));
      none.push(runGame('lean_loop', 120, false, false, { dev_planning_session: 'force_drop' }));
    }

    const pct = (arr, fn) => Math.round(arr.filter(fn).length / arr.length * 100);
    const avg = (arr, fn) => (arr.reduce((s, r) => s + fn(r), 0) / arr.length).toFixed(1);

    const medLaunch = (arr) => {
      const wks = arr.map(r => r.launchWeek).filter(w => w != null).sort((a, b) => a - b);
      return wks.length ? String(wks[Math.floor(wks.length / 2)]) : '—';
    };
    const avgLaunch = (arr) => {
      const wks = arr.map(r => r.launchWeek).filter(w => w != null);
      return wks.length ? (wks.reduce((s, v) => s + v, 0) / wks.length).toFixed(1) : '—';
    };

    const rows = [
      ['Win rate',      pct(lean, r => r.won),                     pct(full, r => r.won),                     pct(none, r => r.won)],
      ['Bankrupt',      pct(lean, r => r.bankrupt),                pct(full, r => r.bankrupt),                pct(none, r => r.bankrupt)],
      ['Plan=lean',     pct(lean, r => r.devPlan === 'lean'),      pct(full, r => r.devPlan === 'lean'),      pct(none, r => r.devPlan === 'lean')],
      ['Plan=full',     pct(lean, r => r.devPlan === 'full'),      pct(full, r => r.devPlan === 'full'),      pct(none, r => r.devPlan === 'full')],
      ['No plan',       pct(lean, r => r.devPlan == null),         pct(full, r => r.devPlan == null),         pct(none, r => r.devPlan == null)],
      ['Alex active',   pct(lean, r => r.alexActive),              pct(full, r => r.alexActive),              pct(none, r => r.alexActive)],
      ['Launched',      pct(lean, r => r.launched),                pct(full, r => r.launched),                pct(none, r => r.launched)],
      ['Launch wk med', medLaunch(lean),                           medLaunch(full),                           medLaunch(none)],
      ['Launch wk avg', avgLaunch(lean),                           avgLaunch(full),                           avgLaunch(none)],
      ['Avg product',   avg(lean, r => r.product),                 avg(full, r => r.product),                 avg(none, r => r.product)],
      ['Avg fit',       avg(lean, r => r.market_fit),              avg(full, r => r.market_fit),              avg(none, r => r.market_fit)],
      ['Avg customers', avg(lean, r => r.customers),               avg(full, r => r.customers),               avg(none, r => r.customers)],
      ['Avg week',      avg(lean, r => r.week),                    avg(full, r => r.week),                    avg(none, r => r.week)],
    ];

    console.log(`\nCHECK planning strategy impact (${RUNS} games each, base: lean_loop)`);
    console.log(`  ${''.padEnd(16)} lean      full      none`);
    for (const [label, a, b, c] of rows) {
      const fmt = v => (typeof v === 'number' ? v + '%' : v).padStart(6);
      console.log(`  ${label.padEnd(16)} ${fmt(a)}    ${fmt(b)}    ${fmt(c)}`);
    }

    const leanWins = pct(lean, r => r.won);
    const fullWins = pct(full, r => r.won);
    const noneWins = pct(none, r => r.won);
    const noneNoPlan = pct(none, r => r.devPlan == null);

    const p1 = leanWins > fullWins;
    const p2 = leanWins > noneWins;
    const p3 = noneNoPlan >= 80;
    const leanLaunchMed = medLaunch(lean);
    const fullLaunchMed = medLaunch(full);
    // lean ships earlier than full — if full never ships at all, lean having a median is a pass
    const p4 = leanLaunchMed !== '—' && (fullLaunchMed === '—' || Number(leanLaunchMed) < Number(fullLaunchMed));
    const leanLaunchRate = pct(lean, r => r.launched);
    const fullLaunchRate = pct(full, r => r.launched);
    const p5 = leanLaunchRate >= 75 && fullLaunchRate <= 5;
    console.log(`  lean wins more than full:   ${p1 ? 'PASS' : 'FAIL'}  (lean ${leanWins}% vs full ${fullWins}%)`);
    console.log(`  lean wins more than none:   ${p2 ? 'PASS' : 'FAIL'}  (lean ${leanWins}% vs none ${noneWins}%)`);
    console.log(`  lean launches before full:  ${p4 ? 'PASS' : 'FAIL'}  (lean wk ${leanLaunchMed} vs full wk ${fullLaunchMed})`);
    console.log(`  lean launches, full doesn't:  ${p5 ? 'PASS' : 'FAIL'}  (lean ${leanLaunchRate}% launched vs full ${fullLaunchRate}%)`);
    console.log(`  force_drop leaves no plan:  ${p3 ? 'PASS' : 'FAIL'}  (${noneNoPlan}% have no dev_plan)`);
  })();

  // part-time Alex → demo fires later than full-time
  (() => {
    const RUNS = 300;

    function avgDemoWeek(commitmentKey) {
      const weeks = [];
      for (let i = 0; i < RUNS; i++) {
        const e = new Engine();
        for (let turn = 0; turn < 35 && !e.s.has_demo && !e.s.game_over && e.s.week <= 22; turn++) {
          const hand = handFromEngine(e);
          if (hand.length === 0) break;
          let ids = selectCards(hand, 'lean_loop', e.s);
          if (hand.some(c => c.id === 'alex_commitment') && !ids.includes('alex_commitment'))
            ids.unshift('alex_commitment');   // force, and keep within the 2-action cap
          ids = ids.slice(0, 2);
          const opts = pickOptions(hand, ids, 'lean_loop', e.s);
          if (ids.includes('alex_commitment')) opts['alex_commitment'] = commitmentKey;
          const weekBefore = e.s.week;
          actTurn(e, ids, opts);
          if (e.s.has_demo) { weeks.push(weekBefore); break; }
          e.nextWeek();
        }
      }
      return weeks.length ? (weeks.reduce((a, b) => a + b) / weeks.length).toFixed(1) : '—';
    }

    const ftWeek = avgDemoWeek('push');   // full-time
    const ptWeek = avgDemoWeek('accept'); // part-time
    const pass = parseFloat(ptWeek) >= parseFloat(ftWeek) + 3;
    console.log(`\nCHECK part-time slows product: demo week avg — full-time: ${ftWeek}  part-time: ${ptWeek}  ${pass ? 'PASS' : 'FAIL'}`);
  })();

  // jordan_drag ignored → morale crash → alex_leaving_threat ignored → Alex departs
  (() => {
    const RUNS = 200;
    const ignored = [];
    for (let i = 0; i < RUNS; i++) {
      ignored.push(runGame('lean_loop', 120, false, false,
        { jordan_drag: 'force_drop', jordan_confrontation: 'force_drop', alex_leaving_threat: 'force_drop' }));
    }
    const pct = (arr, fn) => Math.round(arr.filter(fn).length / arr.length * 100);
    const alexLeftPct = pct(ignored, r => !r.alexActive);
    const pass = alexLeftPct >= 80;
    console.log(`\nCHECK jordan_drag ignored → Alex departs (lean_loop, ${RUNS} games)`);
    console.log(`  Alex left when Jordan warnings ignored: ${pass ? 'PASS' : 'FAIL'}  (${alexLeftPct}%)`);
  })();

  // ── Repeated narrative detection ───────────────────────────────────────────
  // In a real chat, you never see the same message twice. Games capped at 50
  // weeks — covers both wins (~wk30) and typical bankruptcies (~wk25–35) while
  // excluding degenerate 120-week timeout sessions no real player experiences.
  // lean_loop exercises the canonical path: 'build' on matching_engine_choice
  // (s.matching_owned) + 'pair' on founder_codebuild (recurs every 4+ weeks).
  (() => {
    const RUNS = 100;
    const MAX_WEEK = 50;
    const MIN_LENGTH = 60;

    const violations = new Map();  // msg → worst { count, firstWeek, lastWeek }

    for (let i = 0; i < RUNS; i++) {
      const g = runGame('lean_loop', MAX_WEEK, true, false);

      const counts = new Map();
      for (const entry of g.log) {
        if (typeof entry !== 'object' || !entry.outcomes) continue;
        for (const msg of entry.outcomes) {
          if (typeof msg !== 'string' || msg.length < MIN_LENGTH) continue;
          const prev = counts.get(msg);
          if (!prev) {
            counts.set(msg, { count: 1, firstWeek: entry.week, lastWeek: entry.week });
          } else {
            counts.set(msg, { count: prev.count + 1, firstWeek: prev.firstWeek, lastWeek: entry.week });
          }
        }
      }

      for (const [msg, data] of counts) {
        if (data.count > 1) {
          const prev = violations.get(msg);
          if (!prev || data.count > prev.count) violations.set(msg, data);
        }
      }
    }

    const pass = violations.size === 0;
    console.log(`\nCHECK repeated narrative (lean_loop, ${RUNS} games ≤${MAX_WEEK}wk, min ${MIN_LENGTH} chars)`);
    if (pass) {
      console.log(`  No repeated narrative detected  PASS`);
    } else {
      for (const [msg, { count, firstWeek, lastWeek }] of violations) {
        console.log(`  FAIL  "${msg.slice(0, 90)}…"  ×${count} (wk${firstWeek}–wk${lastWeek})`);
      }
    }
  })();
}
