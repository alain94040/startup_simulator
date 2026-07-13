"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// v2/tests/sim_strategies.js — minimal strategy-comparison table.
//
// PLACEHOLDER: this deliberately does NOT port sim_proto.js's strategy system
// (1,838 lines of per-card preference tables) — that gets redesigned when the
// re-balance pass starts. Until then, this prints win-rate / outcome / cash
// stats for the strategies the shared harness already expresses.
//
// Usage:  node v2/tests/sim_strategies.js [N] [--subsidy 500]
// ─────────────────────────────────────────────────────────────────────────────

const H = require("./harness.js");
const { quantile, r1, pct, pad, padL } = H;

const argv = process.argv.slice(2);
const N = parseInt(argv.find(a => /^\d+$/.test(a)) || 200, 10);
const si = argv.indexOf("--subsidy");
const SUBSIDY = si >= 0 ? parseInt(argv[si + 1], 10) : 0;

// Strategy = a chooser (+ optional priority). `noapply` never sends the YC
// application — the deadline still ends the run at wk 25 (the graded no-show).
const STRATEGIES = {
  decent: { chooser: "decent" },
  noapply: { chooser: (a, g) => a.nodeId === "yc_apply" ? null : H.decent(a, g) },
  pivot: { chooser: "pivot" },
  random: { chooser: "random" },
};

console.log(`\nStrategy comparison (v2) — ${N} games each` + (SUBSIDY ? `, subsidy $${SUBSIDY}/wk` : "") + "\n");
console.log("  strategy   win%   yc-rej  no-apply  bankrupt   med-end  med-peak-cash");

for (const [name, strat] of Object.entries(STRATEGIES)) {
  const out = { won_yc: 0, yc_rejected: 0, never_applied: 0, bankrupt: 0 };
  const ends = [], peaks = [];
  for (let seed = 1; seed <= N; seed++) {
    const g = H.playGame(seed, strat.chooser, { subsidy: SUBSIDY, priority: strat.priority });
    const s = g.s;
    const o = s.game_won ? "won_yc"
      : s.ycRejected ? "yc_rejected" : s.deadline_passed ? "never_applied" : "bankrupt";
    out[o]++;
    ends.push(s.week);
    peaks.push(g.ledger.reduce((m, w) => Math.max(m, w.balanceAfter), 0));
  }
  ends.sort((a, b) => a - b); peaks.sort((a, b) => a - b);
  console.log(`  ${pad(name, 9)} ${padL(pct(out.won_yc, N), 5)}  ${padL(pct(out.yc_rejected, N), 5)}   ${padL(pct(out.never_applied, N), 6)}   ${padL(pct(out.bankrupt, N), 6)}   ${padL(r1(quantile(ends, 0.5)), 6)}   $${padL(Math.round(quantile(peaks, 0.5)).toLocaleString(), 10)}`);
}
console.log("");
