"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// tests/phase_map.js — simulation-driven pacing / phase-timeline extractor.
//
// Plays many games and records when each arc beat happens, the gaps between
// beats, decision density, and where the game goes quiet. The facts ledger
// makes most beats exact: fact-based phases read game.weekOf(nodeId) after the
// game ends; only genuinely multi-source state (launched, incorporated, first
// customer) is polled weekly.
//
// It also prints a "left on read" section measuring how much of the story
// resolves by @ignored timeout — the action-starvation signal.
//
// Usage:
//   node tests/phase_map.js                 # default (decent+pivot)
//   node tests/phase_map.js 500             # games per driver (default 300)
//   node tests/phase_map.js --driver pivot
//   node tests/phase_map.js --all           # pool all games (no winner cohort)
//   node tests/phase_map.js --subsidy 500   # test-only weekly stipend
//
// Analysis tool — always exits 0.
// ─────────────────────────────────────────────────────────────────────────────

const H = require("./harness.js");
const { quantile, mean, r1, pct, pad, padL } = H;

const WEEK_CAP = 30; // the deadline ends every run by wk 25
const DEFAULT_GAMES = 300;

// Beats: `fact` reads the ledger post-game (exact resolution week, any outcome);
// `reached` is polled weekly for multi-source state.
const PHASES = [
  { key: "equity",         label: "Equity signed",     fact: "equity_signing" },
  { key: "dev_plan",       label: "Dev plan chosen",   fact: "dev_plan" },
  { key: "incorporated",   label: "Incorporated",      reached: s => !!s.incorporated },
  { key: "demo",           label: "Demo night",        fact: "demo_ready" },
  { key: "priya_active",   label: "Priya unlocked",    reached: (s, g) => g.cast.get("priya").active },
  { key: "launched",       label: "Launched",          reached: s => !!s.launched },
  { key: "summit",         label: "Pivot day",         fact: "pivot_day_decide" },
  { key: "pivot",          label: "Pivot committed",   reached: s => !!s.activities_pivot },
  { key: "pivot_shipped",  label: "Pivot shipped (v2)", reached: s => !!s.pivot_shipped },
  { key: "first_customer", label: "First customer",    reached: s => s.customers >= 1 },
  { key: "first_issue",    label: "First cust. issue", log: ["bug_reports", "churn_interview", "feature_request_custom"] },
  { key: "jordan_fired",   label: "Jordan let go",     fact: "jordan_confrontation", outcome: "fire" },
  { key: "applied",        label: "Applied to YC",     reached: s => !!s.ycApplied },
];

// ── the chapter economy ───────────────────────────────────────────────────────
// Every non-scene card classified by what kind of founder-hour it asks for.
// The early-game design tension (GOALS.md): make progress on the build WHILE
// spending real actions on market research (online discussions, watching the
// competition, user calls) — that split is what `fit` tracks. This table lets
// us check the offered/answered balance per chapter instead of guessing.
// Scene-arc beats (equity/demo/launch/pivot day) are excluded: they're free of
// action cost and don't compete for the 2-action week.
const { CATEGORY, CAT_LIST } = H;
const UNCLASSIFIED = new Set();

// Chapter boundaries per run, from the same state transitions the to-do gauge
// uses: demo → launch → pivot committed → v2 shipped → the deadline.
const CHAPTER_LABELS = [
  "Ch1 · Ship the demo", "Ch2 · Get to launch", "Ch3 · Why they leave",
  "Ch4 · Rebuild as v2", "Ch5 · The application",
];

function classifyOutcome(s) {
  if (s.game_won) return "won_yc";
  if (s.ycRejected) return "yc_rejected";
  if (s.deadline_passed) return "never_applied";
  if (s.game_over) return "bankrupt";
  return "timeout"; // shouldn't happen: the deadline ends every run by wk 25
}

function playGame(seed, driver, subsidy, priority) {
  const firstWeek = {};
  const density = [];
  const game = H.playGame(seed, driver, {
    weeks: WEEK_CAP, subsidy, priority,
    onWeekStart(g, offered) {
      density.push(offered.filter(a => !a.onHold).length);
      for (const p of PHASES) {
        if (p.reached && firstWeek[p.key] == null && p.reached(g.s, g)) firstWeek[p.key] = g.s.week;
      }
    },
  });
  // Fact- and log-based beats, read exactly from the ledger after the game.
  for (const p of PHASES) {
    if (p.fact && game.done(p.fact) && (!p.outcome || game.outcome(p.fact) === p.outcome)) {
      firstWeek[p.key] = game.weekOf(p.fact);
    }
    if (p.log) {
      for (const l of game.log) {
        if (l.surfaced && p.log.includes(l.surfaced)) { firstWeek[p.key] = l.week; break; }
      }
    }
  }
  // Left-on-read stats from the engine log.
  let surfacedStory = 0, ignoredStory = 0;
  const ignoredIds = [];
  const kindOf = (id) => {
    const n = game.nodes.get(id);
    return n && n.filler ? "filler" : n && n.ambient ? "ambient" : "story";
  };
  const surfacedSet = new Set(game.log.filter(l => l.surfaced).map(l => l.surfaced));
  for (const id of surfacedSet) if (kindOf(id) === "story") surfacedStory++;
  for (const l of game.log) {
    if (l.ignored && kindOf(l.ignored) === "story") { ignoredStory++; ignoredIds.push(l.ignored); }
  }

  // The chapter economy: every acted/ignored log entry (scene beats excluded —
  // they're free of action cost) tallied by chapter × category.
  const bounds = [
    firstWeek.demo, firstWeek.launched, firstWeek.pivot, firstWeek.pivot_shipped,
  ].map(b => (b == null ? Infinity : b));
  const chapterOf = (w) => {
    for (let i = 0; i < bounds.length; i++) if (w <= bounds[i]) return i;
    return 4;
  };
  const econ = Array.from({ length: 5 }, () =>
    Object.fromEntries(CAT_LIST.map(c => [c, { ans: 0, ign: 0 }])));
  const chapterWeeks = [0, 0, 0, 0, 0];
  for (let w = 1; w <= game.s.week; w++) chapterWeeks[chapterOf(w)]++;
  for (const l of game.log) {
    const id = l.acted || l.ignored;
    if (!id) continue;
    const arc = game.arcOf.get(id);
    if (arc && arc.scene) continue;
    const cat = CATEGORY[id] || (UNCLASSIFIED.add(id), "other");
    econ[chapterOf(l.week)][cat][l.acted ? "ans" : "ign"]++;
  }

  return {
    seed, driver, firstWeek, density,
    endWeek: game.s.week, outcome: classifyOutcome(game.s),
    surfacedStory, ignoredStory, ignoredIds,
    econ, chapterWeeks,
    peakCash: game.ledger.reduce((m, w) => Math.max(m, w.balanceAfter), game.s.cash),
  };
}

// ── reporting ─────────────────────────────────────────────────────────────────
function report(records, opts) {
  const all = records;
  const winners = all.filter(r => r.outcome.startsWith("won"));

  const MIN_WINNERS = 20;
  let cohort, cohortName;
  if (opts.all) { cohort = all; cohortName = "all games"; }
  else if (winners.length >= MIN_WINNERS) { cohort = winners; cohortName = "winning games"; }
  else { cohort = all; cohortName = "all games"; }

  console.log(`\nPhase pacing — ${all.length} games (${opts.drivers.join(", ")})` +
    (opts.subsidy ? `, subsidy $${opts.subsidy}/wk` : "") + `, cap wk ${WEEK_CAP}`);
  console.log(`Timing distributions over ${cohortName} (n=${cohort.length}); reach% over all games (n=${all.length}).`);
  if (cohort === all && !opts.all)
    console.log(`(only ${winners.length} winning game(s) — too few for a winners-only cohort, so timing is over all games)`);

  // outcome mix
  const outcomes = { won_yc: 0, yc_rejected: 0, never_applied: 0, bankrupt: 0, timeout: 0 };
  const endByOutcome = {};
  for (const r of all) { outcomes[r.outcome]++; (endByOutcome[r.outcome] ||= []).push(r.endWeek); }
  console.log("\n── Outcomes ────────────────────────────────────────────────");
  for (const k of ["won_yc", "yc_rejected", "never_applied", "bankrupt", "timeout"]) {
    const ended = (endByOutcome[k] || []).sort((a, b) => a - b);
    console.log(`  ${pad(k, 12)} ${padL(outcomes[k], 5)}  ${padL(pct(outcomes[k], all.length), 4)}` +
      `   median end wk ${r1(quantile(ended, 0.5))}`);
  }

  // phase timeline
  const weeks = {}, reachAll = {};
  for (const p of PHASES) { weeks[p.key] = []; reachAll[p.key] = 0; }
  for (const r of all) for (const p of PHASES) if (r.firstWeek[p.key] != null) reachAll[p.key]++;
  for (const r of cohort) for (const p of PHASES) {
    if (r.firstWeek[p.key] != null) weeks[p.key].push(r.firstWeek[p.key]);
  }
  for (const k in weeks) weeks[k].sort((a, b) => a - b);

  console.log("\n── Phase timeline (first week reached) ─────────────────────");
  console.log("  phase             reach%   p10  median   p90   mean");
  const medians = {};
  for (const p of PHASES) {
    const w = weeks[p.key];
    const med = quantile(w, 0.5);
    medians[p.key] = med;
    console.log(`  ${pad(p.label, 18)} ${padL(pct(reachAll[p.key], all.length), 5)}` +
      `   ${padL(r1(quantile(w, 0.1)), 3)}  ${padL(r1(med), 5)}  ${padL(r1(quantile(w, 0.9)), 4)}  ${padL(r1(mean(w)), 5)}`);
  }

  // ASCII median timeline
  const maxMed = Math.max(...PHASES.map(p => medians[p.key] || 0), 1);
  const axisW = 50;
  console.log("\n── Median timeline ─────────────────────────────────────────");
  console.log(`  ${pad("", 18)} wk 0${" ".repeat(axisW - 6)}${Math.ceil(maxMed)}`);
  for (const p of PHASES) {
    const med = medians[p.key];
    if (med == null) { console.log(`  ${pad(p.label, 18)} (not reached)`); continue; }
    const col = Math.round((med / maxMed) * (axisW - 1));
    console.log(`  ${pad(p.label, 18)} ${" ".repeat(col)}● wk ${r1(med)}`);
  }

  // phase gaps (boring-stretch finder)
  console.log("\n── Phase gaps (consecutive beats, by median order) ─────────");
  const ordered = PHASES.filter(p => medians[p.key] != null).sort((a, b) => medians[a.key] - medians[b.key]);
  const gapRows = [];
  for (let i = 0; i + 1 < ordered.length; i++) {
    const from = ordered[i], to = ordered[i + 1];
    const ds = [];
    for (const r of cohort) {
      const a = r.firstWeek[from.key], b = r.firstWeek[to.key];
      if (a != null && b != null) ds.push(b - a);
    }
    ds.sort((x, y) => x - y);
    gapRows.push({ from, to, n: ds.length, med: quantile(ds, 0.5), p90: quantile(ds, 0.9) });
  }
  const longest = gapRows.reduce((m, g) => (g.n && g.med > (m ? m.med : -1) ? g : m), null);
  for (const g of gapRows) {
    const flag = (g === longest) ? "  ← longest stretch (shorten candidate)" : "";
    const label = pad(`${g.from.label} → ${g.to.label}`, 40);
    const signed = n => (n != null && n >= 0 ? `+${r1(n)}` : r1(n));
    const body = g.n ? `${padL(signed(g.med), 5)} wk median  (p90 ${signed(g.p90)}, n=${g.n})`
      : `(rarely both reached, n=0)`;
    console.log(`  ${label} ${body}${flag}`);
  }

  // dead air
  console.log("\n── Dead air (decision density over " + cohortName + ") ──────");
  const perWeekAll = [];
  let longestQuiet = 0, longestQuietSeed = null;
  for (const r of cohort) {
    let run = 0;
    r.density.forEach(d => {
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

  // left on read — the action-starvation signal
  console.log("\n── Left on read (story beats resolving by @ignored) ────────");
  const ratios = cohort.filter(r => r.surfacedStory > 0)
    .map(r => r.ignoredStory / r.surfacedStory);
  console.log(`  mean share of surfaced story beats that timed out: ${pct(Math.round((mean(ratios) || 0) * 100), 100)}`);
  // "Ignored" is only meaningful across play styles: a card one tactic always
  // skips is that tactic's choice; a card EVERY attention allocation skips is
  // structurally unanswerable. So compare the canonical drivers against the
  // mixed-attention population (same sensible choices, randomized priorities).
  const ignoredPct = (coh) => {
    const m = new Map();
    for (const r of coh) for (const id of r.ignoredIds) m.set(id, (m.get(id) || 0) + 1);
    return m;
  };
  // All mixed games count (not just winners): the balance question is what the
  // game offers and what an untacticed player answers, win or lose.
  const canonIgn = ignoredPct(cohort);
  const mixedCohort = opts.mixed;
  const mixedIgn = mixedCohort && mixedCohort.length ? ignoredPct(mixedCohort) : null;
  const top = [...canonIgn.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  console.log("  most-ignored story beats:        canonical" + (mixedIgn ? "   mixed-attention" : ""));
  for (const [id, n] of top) {
    const mixedCell = mixedIgn
      ? padL(pct(mixedIgn.get(id) || 0, mixedCohort.length), 8)
      : "";
    console.log(`    ${pad(id, 28)} ${padL(pct(n, cohort.length), 8)}   ${mixedCell}`);
  }
  if (!top.length) console.log("    (none)");

  // the chapter economy — the founder-hour balance the chapters are asking for
  const printEconomy = (coh, title) => {
    console.log("\n── Chapter economy (mean cards answered per game, " + title + ") ──");
    console.log("  Scene beats excluded (free of action cost). Share = of that chapter's answers.");
    const catMeans = (ch, field) => CAT_LIST.map(cat =>
      mean(coh.map(r => r.econ[ch][cat][field])) || 0);
    console.log(`  ${pad("chapter", 22)} ${padL("wks", 4)} ${padL("cap", 4)}  `
      + CAT_LIST.map(c => pad(c, 11)).join(""));
    for (let ch = 0; ch < 5; ch++) {
      const wks = mean(coh.map(r => r.chapterWeeks[ch])) || 0;
      const ans = catMeans(ch, "ans");
      const total = ans.reduce((a, b) => a + b, 0);
      const cells = ans.map(v => {
        if (total === 0 || v < 0.05) return pad("—", 11);
        return pad(`${r1(v)} ·${Math.round((v / total) * 100)}%`, 11);
      });
      console.log(`  ${pad(CHAPTER_LABELS[ch], 22)} ${padL(r1(wks), 4)} ${padL(Math.round(wks * 2), 4)}  ${cells.join("")}`
        + `  = ${r1(total)}`);
    }
    console.log("\n  …and left on read (mean cards timing out per game):");
    console.log(`  ${pad("chapter", 22)} ${padL("", 9)}  ` + CAT_LIST.map(c => pad(c, 11)).join(""));
    for (let ch = 0; ch < 5; ch++) {
      const ign = catMeans(ch, "ign");
      const cells = ign.map(v => pad(v < 0.05 ? "—" : r1(v), 11));
      console.log(`  ${pad(CHAPTER_LABELS[ch], 22)} ${padL("", 9)}  ${cells.join("")}`
        + `  = ${r1(ign.reduce((a, b) => a + b, 0))}`);
    }
  };
  printEconomy(cohort, cohortName + " · canonical attention");
  if (mixedCohort && mixedCohort.length >= 20) {
    const winPct = pct(mixedCohort.filter(r => r.outcome.startsWith("won")).length, mixedCohort.length);
    printEconomy(mixedCohort, "mixed attention · all games, decent choices, random priorities (win " + winPct + ")");
  }
  if (UNCLASSIFIED.size) {
    console.log("  ⚠ uncategorized node ids (add to CATEGORY): " + [...UNCLASSIFIED].join(", "));
  }

  // launch vs pivot ordering
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
  console.log(`  pivot before launch:  ${padL(pct(before.length, n), 4)}`);
  console.log(`  pivot after launch:   ${padL(pct(after.length, n), 4)}  (median launch wk ${r1(quantile(after.sort((a, b) => a - b), 0.5))})`);
  console.log(`  launched, no pivot:   ${padL(pct(noPivot.length, n), 4)}`);
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
  const subsidy = val("--subsidy") ? parseInt(val("--subsidy"), 10) : 0;

  const records = [];
  let seed = 1;
  for (const driver of drivers) {
    for (let i = 0; i < games; i++) records.push(playGame(seed++, driver, subsidy));
  }
  // The mixed-attention population: decent choices, but WHICH open card gets
  // each action is a per-game random shuffle — no baked-in tactic. Used to
  // cross-check the ignored stats and the chapter economy.
  const mixed = [];
  for (let i = 0; i < games; i++) {
    const s = seed++;
    mixed.push(playGame(s, "decent", subsidy, H.makeAttentionPriority(s)));
  }
  report(records, { drivers, all: has("--all"), subsidy, mixed });
}

main();
