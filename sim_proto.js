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
};

function pickOptions(cards, ids, strategy) {
  const opts = {};
  const prefs = CARD_PREFS[strategy] || {};
  for (const id of ids) {
    const card = cards.find(c => c.id === id);
    if (!card || !card.options) continue;
    const keys = card.options.map(o => o.key);
    if (keys.length === 1) { opts[id] = keys[0]; continue; }
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

function selectCards(current, strategy) {
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

  return pool.slice(0, 2).map(c => c.id);
}

// ─── Run one game ─────────────────────────────────────────────────────────────

function runGame(strategy, maxWeek = 120, verbose = false) {
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

    const ids  = selectCards(e.current, strategy);
    const opts = pickOptions(e.current, ids, optStrategy);

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
    let results, sprintWeeks;
    try {
      ({ results, sprintWeeks } = e.resolveTurn(ids, opts));
    } catch(err) {
      log.push(`ERROR in resolveTurn turn ${turn}: ${err.message}`);
      errorCount++;
      break;
    }

    if (verbose) {
      const alex = e.chars.get('alex');
      log.push({
        week: weekBefore,
        offered: offeredSnapshot,
        outcomes: results,
        cash: e.s.cash,
        product: Math.round(e.s.product),
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
    customers:e.s.customers,
    signal:   e.s.signal,
    ycApplied:  e.s.ycApplied,
    ycAccepted: e.s.ycAccepted,
    alexActive: alex ? alex.active : false,
    alexMorale: alex ? alex.morale : 0,
    alexTrust:  alex ? alex.trust  : 0,
    activeChars,
    errors: errorCount,
    log,
  };
}

// ─── Run N games per strategy ────────────────────────────────────────────────

function runStrategy(name, strategy, n = 100) {
  const results = [];
  for (let i = 0; i < n; i++) results.push(runGame(strategy));

  const wins      = results.filter(r => r.won).length;
  const bankrupt  = results.filter(r => r.bankrupt).length;
  const timeout   = results.filter(r => !r.won && !r.bankrupt).length;
  const errors    = results.reduce((s, r) => s + r.errors, 0);
  const alexLeft  = results.filter(r => !r.alexActive).length;
  const ycApplied = results.filter(r => r.ycApplied).length;
  const ycAccepted= results.filter(r => r.ycAccepted).length;

  const avgWeek   = (results.reduce((s,r) => s+r.week, 0) / n).toFixed(1);
  const avgCust   = (results.reduce((s,r) => s+r.customers, 0) / n).toFixed(1);
  const priyaSeen = results.filter(r => r.activeChars.includes('priya')).length;
  const marcusSeen= results.filter(r => r.activeChars.includes('marcus')).length;
  const sarahSeen = results.filter(r => r.activeChars.includes('sarah')).length;

  // Collect errors/stuck messages
  const issues = [];
  results.forEach(r => r.log.forEach(l => {
    if (l.includes('ERROR') || l.includes('STUCK') || l.includes('TIMEOUT')) issues.push(l);
  }));
  const uniqueIssues = [...new Set(issues)].slice(0, 5);

  return { name, n, wins, bankrupt, timeout, errors, alexLeft, ycApplied, ycAccepted,
           avgWeek, avgCust, priyaSeen, marcusSeen, sarahSeen, uniqueIssues };
}

// ─── Report ───────────────────────────────────────────────────────────────────

const strategies = [
  ['Random',          'random'],
  ['YC grind',        'yc_grind'],
  ['Alex first',      'alex_first'],
  ['Ignore Alex',     'ignore_alex'],
  ['Customer focus',  'customer_focus'],
];

console.log('\n=== PROTOTYPE SIMULATION (100 games each) ===\n');

for (const [name, strat] of strategies) {
  const r = runStrategy(name, strat, 100);
  console.log(`── ${r.name} ──`);
  console.log(`  Win ${r.wins}%  Bankrupt ${r.bankrupt}%  Timeout ${r.timeout}%  Errors ${r.errors}`);
  console.log(`  Alex left: ${r.alexLeft}%  YC applied: ${r.ycApplied}%  YC accepted: ${r.ycAccepted}%`);
  console.log(`  Avg week: ${r.avgWeek}  Avg customers: ${r.avgCust}`);
  console.log(`  Characters unlocked — Priya: ${r.priyaSeen}%  Sarah: ${r.sarahSeen}%  Marcus: ${r.marcusSeen}%`);
  if (r.uniqueIssues.length > 0) console.log(`  Issues: ${r.uniqueIssues.join(' | ')}`);
  console.log();
}

// ─── Narrative trace of one YC-grind game ────────────────────────────────────

function printTrace(trace) {
  const catLabel = { p: 'product', c: 'customer', t: 'team', e: 'external' };
  const trunc = (str, n) => str.length > n ? str.slice(0, n - 1) + '…' : str;
  const sep = '─'.repeat(72);

  console.log('=== STORY TRACE: one YC-grind game ===\n');

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
    console.log(`\n         Cash $${turn.cash.toLocaleString()}  Product ${turn.product}%  Customers ${turn.customers}  Signal ${turn.signal}  ${alexStr}`);
    console.log();
  }

  const result = trace.won ? '🏆 WON' : trace.bankrupt ? '💸 BANKRUPT' : '⏱  TIMEOUT';
  console.log(`  ${result} — Week ${trace.week} · Product ${Math.round(trace.product)}% · Customers ${trace.customers}`);
  console.log(`  YC: applied=${trace.ycApplied} accepted=${trace.ycAccepted}`);
  console.log(`  Active chars: ${trace.activeChars.join(', ')}`);
}

const trace = runGame('yc_grind', 120, true);
printTrace(trace);
