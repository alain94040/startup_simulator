// Simulation harness — runs N games per strategy, reports findings.

const { Engine, CHARACTER_DEFS } = require('./engine.js');

// ─── Strategy helpers ────────────────────────────────────────────────────────

// Preferred option key per card per strategy.
// Cards with a single option don't need an entry — they're handled automatically.
const CARD_PREFS = {
  yc_grind: {
    equity_talk:           'fair',
    alex_commitment:       'push',
    vision_mismatch:       'test',
    alex_sync_discover:    'discover',
    alex_sync_build:       'build',
    alex_sync_pitch:       'pitch',
    alex_equity:           'fair',
    first_interview_shock: 'pivot',
    pivot_insight_1:       'pivot',
    pivot_insight_2:       'pivot',
    good_enough_launch:    'ship',
    yc_discussion_ready:   'apply',
    yc_discussion_early:   'apply',
    consultant_growth:     'hire',
    consultant_brand:      'hire',
  },
  alex_first: {
    equity_talk:           'fair',
    alex_commitment:       'accept',
    vision_mismatch:       'alex',
    alex_sync_discover:    'discover',
    alex_sync_build:       'discover',
    alex_sync_pitch:       'pitch',
    alex_equity:           'fair',
    first_interview_shock: 'pivot',
    pivot_insight_1:       'pivot',
    pivot_insight_2:       'pivot',
    good_enough_launch:    'ship',
    yc_discussion_ready:   'apply',
    yc_discussion_early:   'apply',
    consultant_growth:     'pass',
    consultant_brand:      'pass',
  },
  customer_focus: {
    equity_talk:           'fair',
    alex_commitment:       'accept',
    vision_mismatch:       'test',
    alex_sync_discover:    'discover',
    alex_sync_build:       'discover',
    alex_sync_pitch:       'stay',
    alex_equity:           'fair',
    first_interview_shock: 'pivot',
    pivot_insight_1:       'pivot',
    pivot_insight_2:       'pivot',
    good_enough_launch:    'ship',
    yc_discussion_ready:   'apply',
    yc_discussion_early:   'skip',
    consultant_growth:     'hire',
    consultant_brand:      'pass',
  },
  ignore_alex: {
    equity_talk:           'negotiate',
    alex_commitment:       'push',
    vision_mismatch:       'yours',
    alex_sync_discover:    'build',
    alex_sync_build:       'discover',
    alex_sync_pitch:       'stay',
    alex_equity:           'defer',
    first_interview_shock: 'stay',
    pivot_insight_1:       'stay',
    pivot_insight_2:       'stay',
    good_enough_launch:    'wait',
    yc_discussion_ready:   'skip',
    yc_discussion_early:   'skip',
    consultant_growth:     'pass',
    consultant_brand:      'pass',
  },
  // Teach-the-lesson strategy: discover → build → engage → YC
  lean_loop: {
    equity_talk:              'fair',
    alex_commitment:          'accept',
    vision_mismatch:          'test',
    alex_equity:              'fair',
    first_interview_shock:    'pivot',
    cold_silence:             'rewrite',
    random_reframe:           'test',
    pivot_insight_1:          'pivot',
    pivot_insight_2:          'pivot',
    good_enough_launch:       'ship',
    yc_discussion_ready:      'apply',
    yc_discussion_early:      'apply',
    consultant_growth:        'pass',
    consultant_brand:         'pass',
    hn_thread:                'engage',
    community_signal_hn:      'engage',
    community_signal_reddit:  'engage',
    community_signal_slack:   'engage',
    community_product_hn:     'engage',
    community_product_reddit: 'engage',
    community_product_slack:  'engage',
    silent_churn:             'call',
    public_complaint:         'respond',
    power_user_quiet:         'call',
    mentor_competitor_bomb:   'research',
    bug_reports:              'fix',
    feature_cluster:          'build',
    waitlist_cold:            'reach',
    reporter_deadline:        'reply',
    founder_landing:          'interview',
    founder_codebuild:        'pair',
    founder_user_depth:       'deep',
    // angel cards — engage all three (player doesn't know who's who)
    fatima_intro:             'call',
    fatima_meeting:           'meet',
    fatima_deck:              'walk',
    // fatima_commit is single-option, auto-selected
    ryan_intro:               'meet',
    ryan_checkin:             'update',
    // alex_sync_* resolved dynamically via state in pickOptions
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
      const phase = state.product >= 80 && state.launched ? 'pitch' : 'build';
      if (keys.includes(phase)) { opts[id] = phase; continue; }
    }
    if (strategy === 'random') {
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

  if (strategy === 'random') {
    const shuffled = pool.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2).map(c => c.id);
  }

  if (strategy === 'yc_grind') {
    // Priority: YC cards > product > customer > external > team
    const order = ['yc_apply','yc_discussion_ready','yc_discussion_early','seed_pitch',
                   'good_enough_launch','bug_reports','feature_cluster','silent_churn',
                   'public_complaint','power_user_quiet','reporter_deadline','hn_thread'];
    const sorted = pool.slice().sort((a, b) => {
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
    // Always pick Alex's cards, prefer urgent ones
    const sorted = pool.slice().sort((a, b) => {
      const aAlex = a._charId === 'alex' ? 1 : 0;
      const bAlex = b._charId === 'alex' ? 1 : 0;
      if (aAlex !== bAlex) return bAlex - aAlex;
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
      if (a.cat !== b.cat) return (catOrder[a.cat] || 9) - (catOrder[b.cat] || 9);
      return b.urgency - a.urgency;
    });
    return sorted.slice(0, 2).map(c => c.id);
  }

  if (strategy === 'lean_loop') {
    const s = state || {};
    const fit     = s.market_fit || 0;
    const product = s.product    || 0;
    const CONSULTANT_IDS = new Set(['consultant_growth', 'consultant_brand']);
    const YC_IDS         = new Set(['yc_apply', 'yc_discussion_ready', 'seed_pitch', 'fatima_commit']);
    // Alex founding cards must never be skipped — losing Alex kills the card pool
    const ALEX_CRITICAL  = new Set(['equity_talk', 'alex_commitment', 'alex_equity', 'vision_mismatch']);

    const usable = pool.filter(c => !CONSULTANT_IDS.has(c.id));
    const candidates = usable.length > 0 ? usable : pool;

    let catOrder;
    if (fit < 50) {
      // Discover phase: talk to customers, but still build alongside
      catOrder = { c: 0, p: 1, e: 2, t: 3 };
    } else if (product < 80) {
      // Build phase: ship product, stay close to users
      catOrder = { p: 0, c: 1, t: 2, e: 3 };
    } else {
      // Launch/YC phase: engage the world, then customers, then polish
      catOrder = { e: 0, c: 1, p: 2, t: 3 };
    }

    const priority = c => {
      if (ALEX_CRITICAL.has(c.id)) return 0;
      if (YC_IDS.has(c.id))        return 1;
      return 2 + (catOrder[c.cat] ?? 9);
    };

    const sorted = candidates.slice().sort((a, b) => {
      const pa = priority(a), pb = priority(b);
      if (pa !== pb) return pa - pb;
      return b.urgency - a.urgency;
    });
    return sorted.slice(0, 2).map(c => c.id);
  }

  return pool.slice(0, 2).map(c => c.id);
}

// ─── Run one game ─────────────────────────────────────────────────────────────

function runGame(strategy, maxWeek = 120, verbose = false, noYC = false) {
  const e = new Engine();
  const log = [];
  let errorCount = 0;

  const optStrategy = strategy;

  for (let turn = 0; turn < 80; turn++) {
    if (e.s.game_won || e.s.game_over) break;
    if (e.s.week >= maxWeek) { log.push(`TIMEOUT at week ${e.s.week}`); break; }

    try {
      e.generateDemands();
    } catch(err) {
      log.push(`ERROR in generateDemands turn ${turn}: ${err.message}`);
      errorCount++;
      break;
    }

    if (e.current.length === 0) {
      log.push(`STUCK: no cards available at week ${e.s.week}`);
      break;
    }

    const ids  = selectCards(e.current, strategy, e.s);
    const opts = pickOptions(e.current, ids, optStrategy, e.s);

    // For YC discussions, always apply
    for (const id of ids) {
      if ((id === 'yc_discussion_ready' || id === 'yc_discussion_early') && !opts[id]) {
        opts[id] = 'apply';
      }
      if (id === 'alex_sync_discover' && !opts[id]) opts[id] = 'discover';
      if (id === 'alex_sync_build'    && !opts[id]) opts[id] = 'build';
      if (id === 'alex_commitment'    && !opts[id]) opts[id] = 'accept';
      if (id === 'equity_talk'        && !opts[id]) opts[id] = 'fair';
    }

    const offeredSnapshot = verbose ? e.current.map(d => ({
      id: d.id, cat: d.cat,
      from: d.from || (d._charId ? CHARACTER_DEFS[d._charId].name : 'System'),
      body: d.body,
      chosen: ids.includes(d.id),
      optLabel: ids.includes(d.id) && d.options ? (d.options.find(o => o.key === opts[d.id]) || d.options[0]).label : null,
    })) : null;

    const weekBefore = e.s.week;
    const ycWasPending = e.s.ycApplied && !e.s.ycAccepted;
    let results, sprintWeeks;
    try {
      ({ results, sprintWeeks } = e.resolveTurn(ids, opts));
    } catch(err) {
      log.push(`ERROR in resolveTurn turn ${turn}: ${err.message}`);
      errorCount++;
      break;
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

    if (verbose) {
      const alex = e.chars.get('alex');
      log.push({
        week: weekBefore,
        offered: offeredSnapshot,
        outcomes: results,
        cash: e.s.cash,
        product: Math.round(e.s.product),
        fit: Math.round(e.s.market_fit),
        customers: e.s.customers,
        signal: Math.round(e.s.signal),
        alexTrust: alex ? Math.round(alex.trust) : null,
        alexMorale: alex ? Math.round(alex.morale) : null,
        alexActive: alex ? alex.active : false,
      });
    }
  }

  const alex = e.chars.get('alex');
  const activeChars = [...e.chars.entries()].filter(([,c]) => c.active).map(([id]) => id);

  return {
    won:      e.s.game_won,
    bankrupt: e.s.game_over,
    week:     e.s.week,
    product:  e.s.product,
    market_fit: e.s.market_fit,
    customers:e.s.customers,
    signal:   e.s.signal,
    launched:   e.s.launched,
    ycApplied:        e.s.ycApplied,
    ycAccepted:       e.s.ycAccepted,
    marcusCommitted:  e.s.marcusCommitted,
    followerCommitted:e.s.followerCommitted,
    alexActive: alex ? alex.active : false,
    alexMorale: alex ? alex.morale : 0,
    alexTrust:  alex ? alex.trust  : 0,
    activeChars,
    errors: errorCount,
    log,
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
  // ycApplied resets to false on rejection, so use ycApplied||ycAccepted to count ever-applied
  const ycApplied = pct(results.filter(r => r.ycApplied || r.ycAccepted).length);
  const ycAccepted= pct(results.filter(r => r.ycAccepted).length);

  const avgWeek   = (results.reduce((s,r) => s+r.week, 0) / n).toFixed(1);
  const avgCust   = (results.reduce((s,r) => s+r.customers, 0) / n).toFixed(1);

  const avg    = arr => (arr.reduce((s, v) => s + v, 0) / n).toFixed(1);
  const avgProduct  = avg(results.map(r => r.product));
  const minProduct  = Math.min(...results.map(r => r.product)).toFixed(0);
  const maxProduct  = Math.max(...results.map(r => r.product)).toFixed(0);
  const avgFit      = avg(results.map(r => r.market_fit));
  const minFit      = Math.min(...results.map(r => r.market_fit)).toFixed(0);
  const maxFit      = Math.max(...results.map(r => r.market_fit)).toFixed(0);
  const pctReachedFit50  = pct(results.filter(r => r.market_fit >= 50).length);
  const pctReachedFit100 = pct(results.filter(r => r.market_fit >= 100).length);
  const marcusCommit   = pct(results.filter(r => r.marcusCommitted).length);
  const followerCommit = pct(results.filter(r => r.followerCommitted).length);
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

  return { name, n, wins, bankrupt, timeout, errors, launched, alexLeft,
           ycApplied, ycAccepted, marcusCommit, followerCommit, ryanEngaged,
           avgWeek, avgCust,
           avgProduct, minProduct, maxProduct,
           avgFit, minFit, maxFit, pctReachedFit50, pctReachedFit100,
           priyaSeen, marcusSeen, fatimaSeen, ryanSeen, sarahSeen, uniqueIssues };
}

// ─── Report ───────────────────────────────────────────────────────────────────

const strategies = [
  ['Random',          'random'],
  ['YC grind',        'yc_grind'],
  ['Alex first',      'alex_first'],
  ['Ignore Alex',     'ignore_alex'],
  ['Customer focus',  'customer_focus'],
  ['Lean loop',       'lean_loop'],
];

// ─── Options parser ───────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = { n: 100, noYC: false, mode: 'summary', winners: 3 };
  const errors = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i];

    if (a === '--help' || a === '-h') {
      console.log(`
Usage: node sim_proto.js [N] [--no-yc] [--winners [K] | --all]

Modes (mutually exclusive — default is summary):
  (no flag)          Run strategy comparison across all strategies.
  --winners [K]      Hunt for K winning lean_loop traces (default: 3).
                     Tries up to N games.
  --all              Print N lean_loop game traces regardless of outcome.

Options:
  N                  Number of games: samples per strategy (summary),
                     max attempts (--winners), or traces printed (--all).
                     Default: 100.
  --no-yc            Block YC acceptance — forces the angel fundraising path.
  -h, --help         Show this help.

Examples:
  node sim_proto.js                        Summary, 100 games each
  node sim_proto.js 500                    Summary, 500 games each
  node sim_proto.js 500 --no-yc            Summary, angel path only
  node sim_proto.js 200 --winners          Hunt for 3 winners, up to 200 tries
  node sim_proto.js 500 --winners 1 --no-yc  One angel-path win, up to 500 tries
  node sim_proto.js 5 --all               Print 5 lean_loop traces
`);
      process.exit(0);
    }

    if (a === '--no-yc')  { opts.noYC = true; continue; }

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

const { n: N, noYC: NO_YC, mode, winners: WINNERS_COUNT } = parseArgs(process.argv);
const WINNERS_FLAG = mode === 'winners';
const ALL_FLAG     = mode === 'all';

// ─── Narrative trace ──────────────────────────────────────────────────────────

function printTrace(trace, label) {
  const trunc = (str, n) => str.length > n ? str.slice(0, n - 1) + '…' : str;
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
    console.log(`\n         Cash $${turn.cash.toLocaleString()}  Product ${turn.product}%  Fit ${turn.fit}%  Customers ${turn.customers}  Signal ${turn.signal}  ${alexStr}`);
    console.log();
  }

  const result = trace.won ? '🏆 WON' : trace.bankrupt ? '💸 BANKRUPT' : '⏱  TIMEOUT';
  console.log(`  ${result} — Week ${trace.week} · Product ${Math.round(trace.product)}% · Customers ${trace.customers}`);
  console.log(`  YC: applied=${trace.ycApplied} accepted=${trace.ycAccepted}`);
  console.log(`  Active chars: ${trace.activeChars.join(', ')}`);
}

// ─── Mode dispatch ────────────────────────────────────────────────────────────

if (WINNERS_FLAG) {
  // Hunt for winning lean_loop games — print traces only, no summary
  const winners = [];
  let attempts = 0;

  process.stdout.write(`\nHunting for ${WINNERS_COUNT} winning lean_loop game(s)${NO_YC ? ' [YC disabled]' : ''} (up to ${N} tries)…`);
  while (winners.length < WINNERS_COUNT && attempts < N) {
    const g = runGame('lean_loop', 120, true, NO_YC);
    attempts++;
    if (g.won) {
      winners.push(g);
      process.stdout.write(` found one (attempt ${attempts})`);
    }
  }
  console.log(`\nFound ${winners.length}/${WINNERS_COUNT} in ${attempts} attempts.\n`);

  winners.forEach((w, i) =>
    printTrace(w, `lean_loop WIN #${i + 1} of ${winners.length} (attempt ~${Math.round(attempts / winners.length * (i + 1))})`)
  );

} else if (ALL_FLAG) {
  // Print N lean_loop traces regardless of outcome — no summary
  const ycTag = NO_YC ? ' — YC disabled' : '';
  for (let i = 0; i < N; i++) {
    const g = runGame('lean_loop', 120, true, NO_YC);
    printTrace(g, `lean_loop run ${i + 1}/${N}${ycTag}`);
  }

} else {
  // Default: strategy summary only
  console.log(`\n=== PROTOTYPE SIMULATION (${N} games each${NO_YC ? ' — YC DISABLED' : ''}) ===\n`);

  for (const [name, strat] of strategies) {
    const r = runStrategy(name, strat, N, NO_YC);
    console.log(`── ${r.name} ──`);
    console.log(`  Win ${r.wins}%  Bankrupt ${r.bankrupt}%  Timeout ${r.timeout}%  Errors ${r.errors}`);
    console.log(`  Launched: ${r.launched}%  Alex left: ${r.alexLeft}%  YC applied: ${r.ycApplied}%  YC accepted: ${r.ycAccepted}%`);
    console.log(`  Marcus committed: ${r.marcusCommit}%  Follower in: ${r.followerCommit}%  Ryan engaged: ${r.ryanEngaged}%`);
    console.log(`  Avg week: ${r.avgWeek}  Avg customers: ${r.avgCust}`);
    console.log(`  Product — avg: ${r.avgProduct}%  min: ${r.minProduct}%  max: ${r.maxProduct}%`);
    console.log(`  Fit     — avg: ${r.avgFit}%  min: ${r.minFit}%  max: ${r.maxFit}%  (fit≥50: ${r.pctReachedFit50}%  fit=100: ${r.pctReachedFit100}%)`);
    console.log(`  Characters unlocked — Priya: ${r.priyaSeen}%  Sarah: ${r.sarahSeen}%  Marcus: ${r.marcusSeen}%  Ryan: ${r.ryanSeen}%  Fatima: ${r.fatimaSeen}%`);
    if (r.uniqueIssues.length > 0) console.log(`  Issues: ${r.uniqueIssues.join(' | ')}`);
    console.log();
  }

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
        e.generateDemands();
        if (e.current.length === 0) break;
        const ids  = selectCards(e.current, 'yc_grind');
        const opts = pickOptions(e.current, ids, 'yc_grind');
        e.resolveTurn(ids, opts);
      }
      if (e.s.market_fit > 0) grew++;
      totalFit += e.s.market_fit;
    }
    const avg = (totalFit / RUNS).toFixed(1);
    const pass = grew >= Math.ceil(RUNS * 0.5);
    console.log(`CHECK build→market_fit: grew in ${grew}/${RUNS} games, avg fit=${avg}  ${pass ? 'PASS' : 'FAIL'}`);
  })();
}
