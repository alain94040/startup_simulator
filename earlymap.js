// node earlymap.js
// Gantt-style map of every card available in weeks 1–8, grouped by track.
// Bar key:  ████ available (certain)   ╌╌╌╌ conditional on state   ···· after prerequisite

const C = {
  bold:   s => `\x1b[1m${s}\x1b[0m`,
  dim:    s => `\x1b[2m${s}\x1b[0m`,
  green:  s => `\x1b[32m${s}\x1b[0m`,
  cyan:   s => `\x1b[36m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  red:    s => `\x1b[31m${s}\x1b[0m`,
  blue:   s => `\x1b[34m${s}\x1b[0m`,
  mag:    s => `\x1b[35m${s}\x1b[0m`,
};

const W = 108;
const line  = (ch = '━') => ch.repeat(W);
const N_COL = 32; // label column width
const WK    = [1,2,3,4,5,6,7,8];
const WK_W  = 5;  // chars per week column

// Render a single availability bar across weeks 1–8.
// spec: array of 8 entries, each one of: 'on' | 'cond' | 'after' | 'off'
// Each column is WK_W chars wide.
function bar(spec, color = s => s) {
  const glyph = { on: '████', cond: '╌╌╌╌', after: '····', off: '    ' };
  const colr  = { on: color, cond: C.dim, after: C.dim, off: s => s };
  return spec.map((s, i) => {
    const g = (glyph[s] || '    ').padEnd(WK_W - 1) + ' ';
    return colr[s](g);
  }).join('');
}

// Build a spec array from a simple availability predicate description.
// from/to are 1-indexed weeks. cond: weeks where availability depends on state.
// after: weeks unlocked by a prerequisite (show as dotted).
function span(from, to, condFrom, condTo, afterFrom, afterTo) {
  return WK.map(w => {
    if (afterFrom && afterTo && w >= afterFrom && w <= afterTo) return 'after';
    if (condFrom  && condTo  && w >= condFrom  && w <= condTo)  return 'cond';
    if (w >= from && w <= to) return 'on';
    return 'off';
  });
}

function row(label, spec, note, labelColor = s => s, barColor = s => s) {
  const lbl  = labelColor(label.padEnd(N_COL));
  const b    = bar(spec, barColor);
  const n    = note ? C.dim('  ' + note) : '';
  console.log(lbl + b + n);
}

function section(title, color = C.yellow) {
  console.log();
  const t = ` ${title} `;
  console.log(color(C.bold(t)) + C.dim('─'.repeat(Math.max(0, W - t.length))));
}

function header() {
  console.log(C.bold(line()));
  console.log(C.bold('  STARTUP SIMULATOR — EARLY GAME MAP  (weeks 1–8)'));
  console.log(C.dim('  Gantt view: when each card is available and what it produces.'));
  console.log(C.dim('  ★ priority card   ⚡ one-shot   ░ conditional on state   ··· after prerequisite'));
  console.log(C.bold(line()));

  const lbl = ''.padEnd(N_COL);
  const wks = WK.map(w => String(w).padEnd(WK_W)).join('');
  console.log(lbl + C.bold(C.cyan(wks)));
  console.log(C.dim('─'.repeat(W)));
}

header();

// ── ALEX ALIGNMENT ───────────────────────────────────────────────────────────
section('ALEX ALIGNMENT  (early_* expire fast — cheap trust, pick any order)', C.cyan);
console.log();

row('  early_name  ⚡  ★',      span(1,3),    '→ team name. ignoreForTrust', C.cyan, C.cyan);
row('  early_tech_stack  ⚡',   span(1,4),    '→ stack chosen. ignoreForTrust', C.cyan, C.cyan);
row('  early_working_style  ⚡',span(1,4),    '→ work style set. ignoreForTrust', C.cyan, C.cyan);
row('  early_customer_target ⚡',span(1,6),   '→ ICP defined. ignoreForTrust', C.cyan, C.cyan);
row('  early_mvp_scope  ⚡',    span(2,6),    '→ scope locked. ignoreForTrust', C.cyan, C.cyan);
row('  early_pricing  ⚡',      span(2,7),    '→ pricing strategy set. ignoreForTrust', C.cyan, C.cyan);
row('  early_funding_goal  ⚡', span(3,8),    '→ raise target set. ignoreForTrust', C.cyan, C.cyan);

console.log();
row('  alex_commitment  ⚡  ★', span(1,5),
  'push → committed_fulltime, prod+4, morale−25, trust−10\n' +
  ' '.repeat(N_COL + WK.length*WK_W + 2) +
  C.dim('accept → part-time, signal−5, morale−5  |  drop → morale−14'),
  C.yellow, C.yellow);

console.log();
row('  vision_mismatch  ⚡  ★', span(1,10, 1,10),
  '≤wk10, product<50  |  test→ mkt_fit+8, sig+14  |  drop→ sig−10, morale−10',
  C.yellow, C.yellow);
row('  ip_concern  ⚡  ★',      span(1,8, 1,8),
  '≤wk12, !ip_clear  |  resolve→ ip_clear  |  drop→ sig−12, warmth−10',
  C.red, C.red);
row('  family_doubt  ⚡',       span(2,8, 2,8),
  'morale<50  |  resolve→ morale+12  |  drop: unresolved tension',
  C.red, C.red);

// ── BUILD TRACK ───────────────────────────────────────────────────────────────
section('BUILD TRACK  (product climbs wk 1–8, gates every later milestone)', C.green);
console.log();

row('  founder_codebuild  ↺',  span(1,8),
  'always pre-launch (alex active+build)  prod += 2–6/turn × efficiency × trust/100',
  C.green, C.green);
row('  alex sync discuss',     span(6,8, 6,8),
  'wk≥6, focus=build, 3+ sprints  →  shift focus to discover',
  s => s, C.dim);
console.log(C.dim('  ' + '─'.repeat(W - 2)));
row('  incorporate_now  ⚡',   span(3,8, 3,8),
  'product≥20  →  incorporated, −$500  |  unlocks equity_talk',
  s => s);
row('  equity_talk  ⚡  ★',    span(1,8, 5,8, 1,4),
  'needs: incorporated  |  fair→ equity set, trust+8  |  negotiate→ trust−10',
  C.yellow, C.yellow);
console.log(C.dim('  ' + '─'.repeat(W - 2)));
row('  BUILD MILESTONE: demo', span(3,8, 3,8),
  'product≥18  →  has_demo  |  opens beta card',
  C.green, C.green);
row('  BUILD MILESTONE: beta', span(5,8, 5,8),
  'has_demo + product≥38  →  has_beta  |  opens good_enough_launch',
  C.green, C.green);

// ── DISCOVER TRACK ────────────────────────────────────────────────────────────
section('DISCOVER TRACK  (signal + market_fit — needed for YC and Marcus gates)', C.mag);
console.log();

row('  founder_landing  ⚡  ★',  span(1,5),
  '→ has_landing_page, signal+8, −$200',
  C.mag, C.mag);
row('  founder_first_interviews ⚡ ★', span(1,8),
  '≤wk8, !launched  →  signal+15, mkt_fit+12, users+5',
  C.mag, C.mag);
row('  cold_silence  ⚡',         span(2,8, 2,8),
  'signal<50, focus=discover  →  sig+10, mkt_fit+6  |  drop→ sig−10, morale−8',
  C.mag, C.mag);
row('  random_reframe  ⚡',       span(1,8, 1,8),
  'signal<55, focus=discover  →  sig+12, mkt_fit+8, peers+3',
  C.mag, C.mag);
row('  first_interview_shock  ⚡', span(1,8, 1,8),
  'product<40, focus=discover  →  pivot→ mkt_fit+15, sig+8',
  C.mag, C.mag);

// ── F&F MONEY ─────────────────────────────────────────────────────────────────
section('F&F MONEY WINDOWS  (free runway — sequential chains, expire fast)', C.blue);
console.log();

row('  ff_family  ⚡  ★',        span(1,8),
  '→ shown_1  →  opens ff_family_2',
  C.blue, C.blue);
row('    ff_family_2  ⚡',        span(1,8, 3,8, 1,2),
  'after ff_family  →  shown_2  →  opens ff_family_3',
  C.blue, C.blue);
row('    ff_family_3  ⚡',        span(1,8, 5,8, 1,4),
  'after ff_family_2  →  70% $5k cash injection',
  C.blue, C.blue);
console.log();
row('  ff_friend (Jamie)  ⚡',    span(2,8),
  'wk≥2, ≤wk10  →  first_meeting_done',
  C.blue, C.blue);
row('    ff_friend_ask  ⚡',      span(2,8, 6,8, 2,5),
  '+4wks after meeting, ≤wk22  →  70% $7k',
  C.blue, C.blue);
console.log();
row('  ff_mentor (David)  ⚡',    span(3,8),
  'wk≥3, ≤wk12  →  first_meeting_done',
  C.blue, C.blue);
row('    ff_mentor_pitch  ⚡',    span(3,8, 6,8, 3,5),
  '+3wks after lunch, ≤wk13  →  70% $10k + warmth+5',
  C.blue, C.blue);

// ── DANGER ─────────────────────────────────────────────────────────────────────
section('DANGER  (can fire any week if thresholds breached)', C.red);
console.log();

row('  alex_side_project  ⚡',   span(3,8, 3,8),
  '!committed_fulltime, morale>50  |  ask to pause→ trust+5  |  drop→ side_project_active',
  C.red, C.red);
row('  alex_leaving_threat  ⚡ ★', span(1,8, 1,8),
  'trust<15 OR morale<10  →  talk→ trust+20, morale+15  |  drop→ ALEX LEAVES',
  C.red, C.red);

// ── FOOTER ─────────────────────────────────────────────────────────────────────
console.log();
console.log(C.dim('─'.repeat(W)));
console.log(C.dim('  KEY THRESHOLDS TO HIT BY WK 8:'));
console.log(C.dim('    product ≥ 18 → demo available    product ≥ 20 → can incorporate'));
console.log(C.dim('    product ≥ 25 → onboarding card   signal  ≥ 38 → prep_deck gate (angel path)'));
console.log(C.dim('    alex.trust ≥ 15, morale ≥ 10     F&F chains started before windows close'));
console.log(C.bold(line()));
