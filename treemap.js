// node treemap.js
// Prints the game's progression dependency tree, Civ-style.
// Static visualization only — no engine is loaded.

const C = {
  bold:  s => `\x1b[1m${s}\x1b[0m`,
  dim:   s => `\x1b[2m${s}\x1b[0m`,
  green: s => `\x1b[32m${s}\x1b[0m`,
  cyan:  s => `\x1b[36m${s}\x1b[0m`,
  yellow:s => `\x1b[33m${s}\x1b[0m`,
  red:   s => `\x1b[31m${s}\x1b[0m`,
  reset: s => `\x1b[0m${s}`,
};

const W = 104;
const line  = (ch = '━') => ch.repeat(W);
const col   = (s, w)     => s.padEnd(w);
const bar   = C.dim('│');

function header() {
  console.log(C.bold(line()));
  console.log(C.bold('  STARTUP SIMULATOR — PROGRESSION TREE'));
  console.log(C.dim('  Left → Right = early game → win condition. Two paths: YC (top) and Angel (bottom).'));
  console.log(C.bold(line()));
  const eras = [
    col('  ERA I · SETUP', 24),
    col('  ERA II · BUILD', 27),
    col('  ERA III · TRACTION', 28),
    col('  ERA IV · WIN', 18),
  ];
  console.log(C.bold(eras.join('')));
  const wks = [
    col('  wk 1–5', 24),
    col('  wk 5–15', 27),
    col('  wk 10–25', 28),
    col('', 18),
  ];
  console.log(C.dim(wks.join('')));
  console.log(line('─'));
}

function section(label, color = C.yellow) {
  console.log();
  console.log(color(C.bold(` ${label} `) + C.dim(line('─').slice(label.length + 2))));
}

const BOX = (lines, color = s => s) => lines.map(l => color(`│ ${l.padEnd(20)} │`));

function print(...rows) {
  rows.forEach(r => console.log(r));
}

header();

// ── YC PATH ──────────────────────────────────────────────────────────────────
section('YC PATH');
print(
  '',
  `                                 ${C.dim('launched + product + customers build up over turns')}`,
  '',
  `                                            ┌───────────────────────┐`,
  `                              ┌────────────►│ yc_discussion_early   │──┐`,
  `                              │             │ ${C.yellow('p < 60  OR  c < 10')}    │  │    ┌─────────────┐`,
  `       ┌──────────────┐       │             └───────────────────────┘  ├───►│  ${C.green(C.bold('yc_apply'))}  │──► ${C.green(C.bold('YC WIN'))}`,
  `  ┌───►│    LAUNCH    │───────┤                                         │   └─────────────┘   ${C.green('$500k')}`,
  `  │    │ p≥50, has_β  │       │             ┌───────────────────────┐  │`,
  `  │    └──────────────┘       └────────────►│ yc_discussion_ready   │──┘`,
  `  │                                         │ ${C.green('p≥60  AND  c≥10')}       │`,
  `  │                                         └───────────────────────┘`,
  '',
);

// ── SHARED FOUNDATION ────────────────────────────────────────────────────────
section('SHARED BUILD FOUNDATION', C.cyan);
print(
  '',
  `  ┌──────────────────┐   ┌────────────────┐   ┌────────────────┐   ┌────────────────┐`,
  `  │  alex_commitment │   │  demo (p≥18)   │   │  beta (p≥38)   │   │    LAUNCH      │`,
  `  │  ${C.yellow('push')} → fulltime  │──►│  → has_demo    │──►│  → has_beta    │──►│  p≥50 + has_β  │`,
  `  │  ${C.red('accept')} → part    │   └────────────────┘   └────────────────┘   └────────────────┘`,
  `  │  time (−signal)  │                                                        ╱              ╲`,
  `  └──────────────────┘                                              customers grow        signal builds`,
  `           │           ┌──────────────────┐   ┌────────────────┐   (users → paying)   (sales, launches)`,
  `           │      ┌───►│  market_fit       │──►│  priya →       │`,
  `  ┌────────┴─────┐│    │  (user calls,     │   │  1st customer  │`,
  `  │  early_*     ││    │   priya feedback) │   │  (p≥30+launch) │`,
  `  │  wk 1–4      ├┘    └──────────────────┘   └────────────────┘`,
  `  │  alex trust  │`,
  `  │  × output/wk │`,
  `  └──────────────┘`,
  '',
);

// ── ANGEL PATH ───────────────────────────────────────────────────────────────
section('ANGEL PATH');
print(
  '',
  `                              ┌───────────────────┐`,
  `                         ┌───►│  prep_deck        │──┐`,
  `  ┌──────────────┐        │   │  sig≥38, c≥2 OR   │  │   ┌───────────────────────┐`,
  `  │  david/jamie │        │   │  users≥20          │  │   │  marcus commit        │`,
  `  │  F&F cash    │──────► │   └───────────────────┘  ├──►│  ${C.green('c≥8, p≥40, sig≥45')}   │──┐`,
  `  │  +warmth     │  inv   │                           │   └───────────────────────┘  │`,
  `  └──────────────┘  warmth│   ┌───────────────────┐  │                               │`,
  `                    grows └──►│  investor_ready   │──┘                               ▼`,
  `                              │  warmth<75, ang≥1 │                    ┌──────────────────────┐`,
  `                              └───────────────────┘                    │  fatima commit        │`,
  `                                                                        │  (marcus reqd)        │──► ${C.green(C.bold('ANGEL WIN'))}`,
  `                                                                        └──────────────────────┘   ${C.green('2 angels')}`,
  '',
);

// ── DANGER ZONE ──────────────────────────────────────────────────────────────
section('DANGER', C.red);
print(
  '',
  `  ${C.red('alex.trust < 15')}  OR  ${C.red('alex.morale < 10')}`,
  `      └──► ${C.red('departure_risk')} set  ──►  ${C.red('alex_leaving_threat')} fires`,
  `                                            ├── accept: trust+20, morale+15, risk cleared`,
  `                                            └── ${C.red('drop/ignore')} → Alex leaves → product stalls`,
  '',
  `  Trust delta per sprint:  ${C.green('+2×wks')} if (alexChosen − alexDropped) > 0`,
  `                           ${C.red('−4×wks')} if delta < 0  ${C.dim('[ignoreForTrust cards excluded]')}`,
  '',
);

// ── FOOTER ───────────────────────────────────────────────────────────────────
console.log(line('─'));
console.log(C.dim('  GLOBAL GUARD: cash > 0  ($500/wk burn · starting cash $10k → ~20 wks runway)'));
console.log(C.dim('  ALEX OUTPUT:  base × (trust/100) × (committed_fulltime ? 1.0 : 0.5) × efficiency'));
console.log(C.dim('  EFFICIENCY:   0.88^(product − market_fit − 10), clamped [0.05, 1.0]'));
console.log(line('━'));
