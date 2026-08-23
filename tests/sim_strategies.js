"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// tests/sim_strategies.js — minimal strategy-comparison table.
//
// PLACEHOLDER: a full per-node preference system is deliberately not built
// here — that gets designed when the re-balance pass starts. Until then, this
// prints win-rate / outcome / cash stats for the strategies the shared harness
// already expresses.
//
// Usage:  node tests/sim_strategies.js [N] [--subsidy 500]
// ─────────────────────────────────────────────────────────────────────────────

const H = require("./harness.js");
const { quantile, r1, pct, pad, padL } = H;

const argv = process.argv.slice(2);
const N = parseInt(argv.find(a => /^\d+$/.test(a)) || 200, 10);
const si = argv.indexOf("--subsidy");
const SUBSIDY = si >= 0 ? parseInt(argv[si + 1], 10) : 0;

// Strategy = a chooser (+ optional priority). Every run is graded
// automatically at the deadline (wk 25) — there's no application to skip.
const STRATEGIES = {
  decent: { chooser: "decent" },
  pivot: { chooser: "pivot" },
  random: { chooser: "random" },
};

console.log(`\nStrategy comparison — ${N} games each` + (SUBSIDY ? `, subsidy $${SUBSIDY}/wk` : "") + "\n");
console.log("  strategy   win%   not-funded  bankrupt   med-end  med-peak-cash");

for (const [name, strat] of Object.entries(STRATEGIES)) {
  const out = { won_yc: 0, not_funded: 0, bankrupt: 0 };
  const ends = [], peaks = [];
  for (let seed = 1; seed <= N; seed++) {
    const g = H.playGame(seed, strat.chooser, { subsidy: SUBSIDY, priority: strat.priority });
    const s = g.s;
    const o = s.game_won ? "won_yc" : s.deadline_passed ? "not_funded" : "bankrupt";
    out[o]++;
    ends.push(s.week);
    peaks.push(g.ledger.reduce((m, w) => Math.max(m, w.balanceAfter), 0));
  }
  ends.sort((a, b) => a - b); peaks.sort((a, b) => a - b);
  console.log(`  ${pad(name, 9)} ${padL(pct(out.won_yc, N), 5)}  ${padL(pct(out.not_funded, N), 9)}   ${padL(pct(out.bankrupt, N), 6)}   ${padL(r1(quantile(ends, 0.5)), 6)}   $${padL(Math.round(quantile(peaks, 0.5)).toLocaleString(), 10)}`);
}
console.log("");
