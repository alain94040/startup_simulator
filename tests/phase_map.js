"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// phase_map.js — simulation-driven pacing / phase-timeline extractor
//
// Plays many games and records *when* each phase of the arc happens (first week
// it's reached), the gaps between phases, and where the game goes quiet. Answers
// pacing questions: how many weeks until equity is resolved? when do planning /
// dev / pivot land? when does launch and the first-customer-issue beat happen?
// which stretch is the long boring one to shorten?
//
// Unlike the others: earlymap.js is a *static* hand-coded weeks-1–8 Gantt;
// test_engine.js checks behavior; test_narrative.js checks narrative consistency;
// sim_proto.js tunes win-rate balance. This one measures *tempo*.
//
// Timing stats are over the WINNING cohort (the canonical path); reach% is over
// ALL games. Default drivers are the realistic ones (decent + pivot); the random
// fuzzer is opt-in (--driver random) since it doesn't represent a real player.
//
// Usage:
//   node phase_map.js                 # default run (decent+pivot), full report
//   node phase_map.js 500             # games per driver (default 300)
//   node phase_map.js --driver pivot  # single driver
//   node phase_map.js --all           # pool all games, ignore winning-cohort filter
// ─────────────────────────────────────────────────────────────────────────────

const { Engine } = require("../engine.js");

const WEEK_CAP = 120;
const DEFAULT_GAMES = 300;

// ── seeded RNG (mulberry32) so runs are reproducible ──────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function withSeed(seed, fn) {
  const real = Math.random;
  Math.random = mulberry32(seed);
  try { return fn(); } finally { Math.random = real; }
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASES — the arc beats, in narrative order. Each is recorded as "first week
// `reached(s)` becomes true". Predicates mirror the founder journal milestones
// (roles/founder.js:30) and the state setters in roles/alex.js, jordan.js,
// priya.js. `first_issue` is special — it's a card-event, not a state flag (see
// CARD_EVENTS below) — so it has no `reached`.
// ─────────────────────────────────────────────────────────────────────────────
const PHASES = [
  { key: "equity",         label: "Equity signed",     reached: s => !!s.jordan_equity },
  { key: "dev_plan",       label: "Dev plan chosen",   reached: s => s.dev_plan != null },
  { key: "incorporated",   label: "Incorporated",      reached: s => !!s.incorporated },
  { key: "demo",           label: "First demo",        reached: s => !!s.has_demo },
  { key: "met_priya",      label: "Pivot mentor met",  reached: s => !!s.met_priya },
  { key: "pivot",          label: "Pivot committed",   reached: s => !!s.activities_pivot },
  { key: "launched",       label: "Launched",          reached: s => !!s.launched },
  { key: "first_customer", label: "First customer",    reached: s => s.customers >= 1 },
  { key: "first_issue",    label: "First cust. issue", reached: null },  // card-event, set below
  { key: "jordan_fired",   label: "Jordan let go",     reached: s => !!s.jordan_resolved },
];

// The "dealing with first customer issues" beat: first time a churn/bug card from
// roles/users.js surfaces (as an offered action or a posted message).
const CARD_EVENTS = { first_issue: new Set(["bug_reports", "churn_interview", "custom_request"]) };

// ─────────────────────────────────────────────────────────────────────────────
// Drivers — copied from test_narrative.js so play matches that harness.
// ─────────────────────────────────────────────────────────────────────────────
const DBG_PREFS = {
  dev_planning_session: "lean", alex_commitment: "accept", start_prototype: "build",
  incorporate_week1: "atlas", jordan_equity: "fair",
};
const PIVOT_RE = /pivot|activit|discover|interview|talk|meetup|priya|reframe|rebuild/i;

function chooseOption(a, driver) {
  const keys = a.options.map(o => o.key);
  if (driver === "random") return keys[Math.floor(Math.random() * keys.length)];
  if (driver === "pivot") {
    const hit = a.options.find(o => PIVOT_RE.test(o.key) || PIVOT_RE.test(o.label || ""));
    if (hit) return hit.key;
  }
  const pref = DBG_PREFS[a.cardId];
  return (pref && keys.includes(pref)) ? pref : keys[0];
}

function drive(e, driver) {
  let safety = 0;
  while (e.stats().actionsLeft > 0 && safety++ < 12) {
    const actions = e.openActions();
    if (!actions.length) break;
    let pick;
    if (driver === "random") {
      const pool = actions.filter(() => Math.random() < 0.7);
      if (!pool.length) break;
      pick = pool[Math.floor(Math.random() * pool.length)];
    } else {
      pick = actions[0];
    }
    const key = chooseOption(pick, driver);
    if (!key) break;
    e.act(pick.cardId, key);
  }
}

// ── one game → a record of when each beat happened ────────────────────────────
function classifyOutcome(s) {
  if (s.game_won) return s.ycAccepted ? "won_yc" : "won_angels";
  if (s.game_over) return "bankrupt";        // cash <= 0
  return "timeout";                          // hit WEEK_CAP still playing
}

function playGame(seed, driver) {
  return withSeed(seed, () => {
    const e = new Engine();
    const firstWeek = {};                    // phase key -> first week reached
    const density = [];                      // actionsOffered per played week
    const cursors = {};
    for (const id of e.order) cursors[id] = e.threads[id].length;

    const noteState = () => {
      for (const p of PHASES) {
        if (p.reached && firstWeek[p.key] == null && p.reached(e.s)) firstWeek[p.key] = e.s.week;
      }
    };
    const noteCardEvent = (cardId) => {
      if (!cardId) return;
      for (const key in CARD_EVENTS) {
        if (firstWeek[key] == null && CARD_EVENTS[key].has(cardId)) firstWeek[key] = e.s.week;
      }
    };

    noteState();  // week-1 starting state

    while (!e.s.game_over && !e.s.game_won && e.s.week <= WEEK_CAP) {
      const offered = e.openActions();
      density.push(offered.length);
      for (const a of offered) noteCardEvent(a.cardId);

      drive(e, driver);
      e.nextWeek();

      // messages posted since last week (dropMsg / pending / intros)
      for (const id of e.order) {
        const thread = e.threads[id];
        for (let i = cursors[id]; i < thread.length; i++) {
          if (thread[i].type === "incoming") noteCardEvent(thread[i].cardId);
        }
        cursors[id] = thread.length;
      }
      noteState();
    }

    return { seed, driver, firstWeek, density, endWeek: e.s.week, outcome: classifyOutcome(e.s) };
  });
}

// ── stats helpers ─────────────────────────────────────────────────────────────
function quantile(sorted, q) {
  if (!sorted.length) return null;
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i), hi = Math.ceil(i);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const r1 = n => (n == null ? "—" : (Math.round(n * 10) / 10).toString());
const pct = (n, d) => `${Math.round((n / Math.max(1, d)) * 100)}%`;
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

// ── reporting ─────────────────────────────────────────────────────────────────
function report(records, opts) {
  const all = records;
  const winners = all.filter(r => r.outcome.startsWith("won"));

  // Timing cohort: prefer winners (the canonical path), but the auto-play drivers
  // currently win rarely, so fall back to all games when winners are too few. Note:
  // these are *first-week-reached* distributions, computed per phase over only the
  // games that reached that phase — so a game that later went bankrupt still gives a
  // valid timing sample for the beats it did hit; it isn't a skew, just a smaller n.
  const MIN_WINNERS = 20;
  let cohort, cohortName;
  if (opts.all) { cohort = all; cohortName = "all games"; }
  else if (opts.winners) { cohort = winners; cohortName = "winning games"; }
  else if (winners.length >= MIN_WINNERS) { cohort = winners; cohortName = "winning games"; }
  else { cohort = all; cohortName = "all games"; }

  console.log(`\nPhase pacing — ${all.length} games (${opts.drivers.join(", ")}), cap wk ${WEEK_CAP}`);
  console.log(`Timing distributions over ${cohortName} (n=${cohort.length}); reach% over all games (n=${all.length}).`);
  if (cohort === all && !opts.all)
    console.log(`(only ${winners.length} winning game(s) — too few for a winners-only cohort, so timing is over all games)`);

  // ── outcome mix ──
  const outcomes = { won_yc: 0, won_angels: 0, bankrupt: 0, timeout: 0 };
  for (const r of all) outcomes[r.outcome]++;
  const endByOutcome = {};
  for (const r of all) (endByOutcome[r.outcome] ||= []).push(r.endWeek);
  console.log("\n── Outcomes ────────────────────────────────────────────────");
  for (const k of ["won_yc", "won_angels", "bankrupt", "timeout"]) {
    const ended = (endByOutcome[k] || []).sort((a, b) => a - b);
    console.log(`  ${pad(k, 12)} ${padL(outcomes[k], 5)}  ${padL(pct(outcomes[k], all.length), 4)}` +
                `   median end wk ${r1(quantile(ended, 0.5))}`);
  }

  // ── phase timeline table ──
  // weeks[key] = sorted first-week values within the cohort; reach over all games.
  const weeks = {}, reachAll = {};
  for (const p of PHASES) { weeks[p.key] = []; reachAll[p.key] = 0; }
  for (const r of all) for (const p of PHASES) if (r.firstWeek[p.key] != null) reachAll[p.key]++;
  for (const r of cohort) for (const p of PHASES) {
    if (r.firstWeek[p.key] != null) weeks[p.key].push(r.firstWeek[p.key]);
  }
  for (const k in weeks) weeks[k].sort((a, b) => a - b);

  console.log("\n── Phase timeline (first week reached) ─────────────────────");
  console.log("  phase           reach%   p10  median   p90   mean");
  const medians = {};
  for (const p of PHASES) {
    const w = weeks[p.key];
    const med = quantile(w, 0.5);
    medians[p.key] = med;
    console.log(`  ${pad(p.label, 16)} ${padL(pct(reachAll[p.key], all.length), 5)}` +
                `   ${padL(r1(quantile(w, 0.1)), 3)}  ${padL(r1(med), 5)}  ${padL(r1(quantile(w, 0.9)), 4)}  ${padL(r1(mean(w)), 5)}`);
  }

  // ── ASCII timeline (median week per phase, earlymap-style) ──
  const maxMed = Math.max(...PHASES.map(p => medians[p.key] || 0), 1);
  const axisW = 50;
  console.log("\n── Median timeline ─────────────────────────────────────────");
  console.log(`  ${pad("", 16)} wk 0${" ".repeat(axisW - 6)}${Math.ceil(maxMed)}`);
  for (const p of PHASES) {
    const med = medians[p.key];
    if (med == null) { console.log(`  ${pad(p.label, 16)} (not reached)`); continue; }
    const col = Math.round((med / maxMed) * (axisW - 1));
    console.log(`  ${pad(p.label, 16)} ${" ".repeat(col)}● wk ${r1(med)}`);
  }

  // ── phase-gap analysis (the boring-stretch finder) ──
  // Adjacency is derived from the *observed* median order (not a hardcoded sequence),
  // so the gaps reflect how the arc actually unfolds. For each consecutive pair we
  // report the per-game elapsed-week distribution over games that reached both.
  console.log("\n── Phase gaps (consecutive beats, by median order) ─────────");
  const ordered = PHASES
    .filter(p => medians[p.key] != null)
    .sort((a, b) => medians[a.key] - medians[b.key]);
  const gapRows = [];
  for (let i = 0; i + 1 < ordered.length; i++) {
    const from = ordered[i], to = ordered[i + 1];
    const ds = [];
    for (const r of cohort) {
      const a = r.firstWeek[from.key], b = r.firstWeek[to.key];
      if (a != null && b != null) ds.push(b - a);   // signed: usually ≥0 in this order
    }
    ds.sort((x, y) => x - y);
    gapRows.push({ from, to, n: ds.length, med: quantile(ds, 0.5), p90: quantile(ds, 0.9) });
  }
  const longest = gapRows.reduce((m, g) => (g.n && g.med > (m ? m.med : -1) ? g : m), null);
  for (const g of gapRows) {
    const flag = (g === longest) ? "  ← longest stretch (shorten candidate)" : "";
    const label = pad(`${g.from.label} → ${g.to.label}`, 38);
    const signed = n => (n != null && n >= 0 ? `+${r1(n)}` : r1(n));
    const body = g.n ? `${padL(signed(g.med), 5)} wk median  (p90 ${signed(g.p90)}, n=${g.n})`
                     : `(rarely both reached, n=0)`;
    console.log(`  ${label} ${body}${flag}`);
  }

  // ── dead-air / action density ──
  console.log("\n── Dead air (decision density over " + cohortName + ") ──────");
  const perWeekAll = [];      // every week's offered-count, pooled
  let longestQuiet = 0, longestQuietSeed = null;
  for (const r of cohort) {
    let run = 0;
    r.density.forEach((d, i) => {
      perWeekAll.push(d);
      if (d <= 1) { run++; if (run > longestQuiet) { longestQuiet = run; longestQuietSeed = r.seed; } }
      else run = 0;
    });
  }
  const quietWeeks = perWeekAll.filter(d => d <= 1).length;
  console.log(`  mean actions offered / week: ${r1(mean(perWeekAll))}`);
  console.log(`  quiet weeks (≤1 action):     ${pct(quietWeeks, perWeekAll.length)} of all played weeks`);
  console.log(`  longest quiet run:           ${longestQuiet} consecutive weeks` +
              (longestQuietSeed != null ? `  (e.g. seed ${longestQuietSeed})` : ""));

  // ── launch vs pivot ordering ──
  console.log("\n── Launch vs pivot ordering (" + cohortName + ") ───────────");
  let before = [], after = [], noPivot = [], noLaunch = 0;
  for (const r of cohort) {
    const lw = r.firstWeek.launched, pw = r.firstWeek.pivot;
    if (lw == null) { noLaunch++; continue; }
    if (pw == null) noPivot.push(lw);
    else if (pw <= lw) before.push(lw);
    else after.push(lw);
  }
  const n = cohort.length;
  console.log(`  pivot before launch:  ${padL(pct(before.length, n), 4)}  (median launch wk ${r1(quantile(before.sort((a,b)=>a-b), 0.5))})`);
  console.log(`  pivot after launch:   ${padL(pct(after.length, n), 4)}  (median launch wk ${r1(quantile(after.sort((a,b)=>a-b), 0.5))})`);
  console.log(`  launched, no pivot:   ${padL(pct(noPivot.length, n), 4)}  (median launch wk ${r1(quantile(noPivot.sort((a,b)=>a-b), 0.5))})`);
  console.log(`  never launched:       ${padL(pct(noLaunch, n), 4)}`);

  console.log("");
}

// ── CLI ───────────────────────────────────────────────────────────────────────
function main() {
  const argv = process.argv.slice(2);
  const has = f => argv.includes(f);
  const val = f => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };

  const games = parseInt(argv.find(a => /^\d+$/.test(a)) || DEFAULT_GAMES, 10);
  const drivers = val("--driver") ? [val("--driver")] : ["decent", "pivot"];
  const all = has("--all");           // force all-games cohort
  const winners = has("--winners");   // force winners-only cohort (may be empty)

  const records = [];
  let seed = 1;
  for (const driver of drivers) {
    for (let i = 0; i < games; i++) records.push(playGame(seed++, driver));
  }
  report(records, { drivers, all, winners });
}

main();
