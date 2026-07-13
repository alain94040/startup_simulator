"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// v2/tests/sim_behaviors.js — the behavior-contract suite, ported from the old
// sim_proto.js regression checks (38 checks over 12 strategies) by RATIONALE,
// not line-by-line. Each old check asserted that a specific founder behavior
// has its designed consequence ("if Alex is part-time, the product must not
// build faster than full-time"). This file re-derives those contracts against
// the v2 engine; obsolete ones (the cut angel path: marcus/fatima gates,
// angel_path strategy) are re-aimed at their v2 equivalents — e.g. "a dirty
// cap table blocks the angel round" became "a dirty cap table shows up as a
// worse report card", which is the lesson's new home.
//
// Usage:  node v2/tests/sim_behaviors.js [N]     (default 60 games/strategy)
// Exit code = number of failed contracts (like the other test_* tools).
// ─────────────────────────────────────────────────────────────────────────────

const H = require("./harness.js");
const Scoring = require("../scoring.js");
const { mean, r1, pct, pad, padL } = H;

const N = parseInt(process.argv[2] || "60", 10);

// ── strategy builders (all speak through the decent chooser) ─────────────────
const withPrefs = (over) => (a, g) => {
  if (a.nodeId in over) {
    const v = over[a.nodeId];
    return typeof v === "function" ? v(a, g) : v; // null = deliberately skip
  }
  return H.decent(a, g);
};
const skipChars = (chars) => (a, g) => chars.has(a.charId) ? null : H.decent(a, g);
const onlyChars = (chars) => (a, g) => chars.has(a.charId) ? H.decent(a, g) : null;

const OUTSIDE = new Set(["users", "growth", "twitter", "lena", "techcrunch", "hacker_news", "tom", "sarah"]);

// A half-decent founder with a lean: decent choices whenever they engage, but
// cards in the disfavored categories only get their attention `p` of the time
// (seeded roll, memoized per node·week — so a standing offer like dev_plan is
// delayed by the lean, while a 1-3 week timeout card is usually missed).
const lopsided = (skipCats, p) => (seed) => {
  const rng = H.mulberry32((seed ^ 0x10B51D3D) >>> 0);
  const rolls = new Map();
  return (a, g) => {
    const cat = H.CATEGORY[a.nodeId] || "other";
    if (skipCats.includes(cat)) {
      const key = a.nodeId + ":" + g.s.week;
      if (!rolls.has(key)) rolls.set(key, rng() < p);
      if (!rolls.get(key)) return null;
    }
    return H.decent(a, g);
  };
};

const STRATEGIES = {
  // the canonical good founder — every contract's baseline
  decent: { chooser: "decent" },
  // no tactic at all: random choices, sometimes left on read
  random: { chooser: "random" },
  // decent choices but randomized attention (which card gets the action)
  distracted: { chooser: "decent", priority: (seed) => H.makeAttentionPriority(seed) },
  // never answers the CTO — the run should collapse
  ignore_alex: { chooser: skipChars(new Set(["alex"])) },
  // all market, no team, no build — the old customer_focus
  outside_only: { chooser: onlyChars(OUTSIDE) },
  // pushes Alex to commit full-time instead of accepting part-time
  fulltime: { chooser: withPrefs({ alex_commitment: ["push"] }) },
  // never has the Jordan conversation
  keep_jordan: { chooser: withPrefs({ jordan_confrontation: ["defer"] }) },
  // fires Jordan but never pays the lawyer
  skip_captable: { chooser: withPrefs({ jordan_cap_table: ["defer"] }) },
  // explicitly refuses the pivot, twice
  no_pivot: { chooser: withPrefs({ pivot_day_decide: ["growth"], pivot_fifty_verdict: ["ride"] }) },
  // never goes to the founder meetup (Priya's early route)
  no_meetup: { chooser: withPrefs({ founder_meetup: null }) },
  // picks the over-scoped plan A
  full_plan: { chooser: withPrefs({ dev_plan: ["full"] }) },
  // the lopsided founders: half-decent, one lean each. builder loves the IDE
  // and tends to ignore marketing (research + growth cards get 25% of his
  // attention); marketer works the market and tends to ignore the build.
  builder: { makeChooser: lopsided(["research", "growth"], 0.25) },
  // the marketer's lean is softer (50%): a full 25% build-attention founder
  // simply never ships (0% wins) — too broken to be an interesting tier.
  marketer: { makeChooser: lopsided(["build"], 0.5) },
};

// ── play + metrics ────────────────────────────────────────────────────────────
function runStrategy(name, spec) {
  const games = [];
  let errors = 0;
  for (let i = 0; i < N; i++) {
    const seed = 1000 + i;
    const m = { moraleWk3: null, moraleWk10: null };
    try {
      const g = H.playGame(seed, spec.makeChooser ? spec.makeChooser(seed) : spec.chooser, {
        priority: spec.priority ? spec.priority(seed) : undefined,
        onWeekStart(game) {
          if (game.s.week === 3) m.moraleWk3 = game.cast.get("alex").morale;
          if (game.s.week === 10) m.moraleWk10 = game.cast.get("alex").morale;
        },
      });
      const s = g.s;
      m.won = !!s.game_won;
      m.launched = !!s.launched;
      m.launchWk = s.launch_week || null;
      m.demoWk = g.weekOf("demo_ready");
      m.pivoted = !!s.activities_pivot;
      m.v2 = !!s.pivot_shipped;
      m.v2Wk = m.v2 ? g.weekOf("pivot_relaunch") : null;
      m.applied = !!s.ycApplied;
      m.alexLeft = !g.cast.get("alex").active;
      m.jordanFired = !!s.jordan_resolved;
      m.itemsDone = Object.values(s.items || {}).filter(it => it && it.status === "done").length;
      m.grade = g.gradeScore();
      const cap = Scoring.scoreGame(g).find(c => c.key === "clean-cap-table");
      m.capScore = cap ? cap.score : null;
      games.push(m);
    } catch (err) {
      errors++;
      games.push(m);
    }
  }
  const share = (f) => Math.round((games.filter(f).length / N) * 100);
  const avg = (f) => mean(games.map(f).filter(v => v != null));
  return {
    name, errors,
    wins: share(m => m.won), launched: share(m => m.launched),
    pivoted: share(m => m.pivoted), v2: share(m => m.v2),
    applied: share(m => m.applied), alexLeft: share(m => m.alexLeft),
    jordanFired: share(m => m.jordanFired),
    priyaSeen: share(m => m.priya == null ? m.launched : m.priya), // filled below for no_meetup
    meanDemoWk: avg(m => m.demoWk), meanLaunchWk: avg(m => m.launchWk),
    meanV2Wk: avg(m => m.v2Wk), itemsDone: avg(m => m.itemsDone),
    moraleWk3: avg(m => m.moraleWk3), moraleWk10: avg(m => m.moraleWk10),
    grade: avg(m => m.grade), capScore: avg(m => m.capScore),
  };
}

// priyaSeen needs the cast, so run no_meetup (and decent for its baseline) with
// a dedicated pass that records it.
function priyaShare(spec) {
  let seen = 0;
  for (let i = 0; i < N; i++) {
    const seed = 1000 + i;
    const g = H.playGame(seed, spec.chooser, { priority: spec.priority ? spec.priority(seed) : undefined });
    if (g.cast.get("priya").active) seen++;
  }
  return Math.round((seen / N) * 100);
}

console.log(`\nBehavior contracts (v2) — ${N} games per strategy\n`);
const S = {};
for (const [name, spec] of Object.entries(STRATEGIES)) S[name] = runStrategy(name, spec);
S.no_meetup.priyaSeen = priyaShare(STRATEGIES.no_meetup);

// ── the strategy table ────────────────────────────────────────────────────────
console.log(`  ${pad("strategy", 13)} ${padL("win", 5)} ${padL("launch", 7)} ${padL("pivot", 6)} ${padL("v2", 4)} ${padL("apply", 6)} ${padL("alexLeft", 9)} ${padL("fired", 6)} ${padL("items", 6)} ${padL("grade", 6)}`);
for (const r of Object.values(S)) {
  console.log(`  ${pad(r.name, 13)} ${padL(r.wins + "%", 5)} ${padL(r.launched + "%", 7)} ${padL(r.pivoted + "%", 6)} ${padL(r.v2 + "%", 4)} ${padL(r.applied + "%", 6)} ${padL(r.alexLeft + "%", 9)} ${padL(r.jordanFired + "%", 6)} ${padL(r1(r.itemsDone), 6)} ${padL(r.grade == null ? "—" : Math.round(r.grade), 6)}`);
}

// ── the contracts ─────────────────────────────────────────────────────────────
const checks = [];
const check = (desc, pass) => checks.push({ desc, pass });

// A · skill beats luck (old: random < 5%, random < yc_grind/lean_loop, random.launched < grind.launched)
check(`random.wins (${S.random.wins}%) < 5%`, S.random.wins < 5);
check(`random.wins (${S.random.wins}%) < decent.wins (${S.decent.wins}%)`, S.random.wins < S.decent.wins);
check(`random.launched (${S.random.launched}%) < decent.launched (${S.decent.launched}%)`, S.random.launched < S.decent.launched);

// B · broken founders never win (old: ignore_alex.wins = 0, customer_focus.wins = 0)
check(`ignore_alex.wins = ${S.ignore_alex.wins}% (expected 0)`, S.ignore_alex.wins === 0);
check(`outside_only.wins = ${S.outside_only.wins}% (expected 0 — all market, no product)`, S.outside_only.wins === 0);

// C · the commitment lesson (old: alex_first < yc_grind, rand_parttime vs rand_fulltime)
// Part-time Alex must never out-build full-time Alex.
check(`fulltime demo (wk ${r1(S.fulltime.meanDemoWk)}) no later than part-time (wk ${r1(S.decent.meanDemoWk)})`,
  S.fulltime.meanDemoWk <= S.decent.meanDemoWk + 0.101);
check(`fulltime launch (wk ${r1(S.fulltime.meanLaunchWk)}) no later than part-time (wk ${r1(S.decent.meanLaunchWk)})`,
  S.fulltime.meanLaunchWk <= S.decent.meanLaunchWk + 0.101);
check(`fulltime.wins (${S.fulltime.wins}%) >= decent.wins (${S.decent.wins}%) - 3`,
  S.fulltime.wins >= S.decent.wins - 3);

// D · neglect has a face (old: alexLeft rates, morale trajectory, roadmap counts)
check(`ignore_alex.alexLeft (${S.ignore_alex.alexLeft}%) >= 90%`, S.ignore_alex.alexLeft >= 90);
check(`decent.alexLeft (${S.decent.alexLeft}%) <= 5%`, S.decent.alexLeft <= 5);
check(`distracted.alexLeft (${S.distracted.alexLeft}%) >= decent.alexLeft (${S.decent.alexLeft}%)`,
  S.distracted.alexLeft >= S.decent.alexLeft);
check(`ignore_alex.itemsDone (${r1(S.ignore_alex.itemsDone)}) < decent.itemsDone (${r1(S.decent.itemsDone)})`,
  S.ignore_alex.itemsDone < S.decent.itemsDone);
check(`ignore_alex morale wk3 (${r1(S.ignore_alex.moraleWk3)}) starts > 60`, S.ignore_alex.moraleWk3 > 60);
check(`ignore_alex morale declining: wk3 (${r1(S.ignore_alex.moraleWk3)}) > wk10 (${r1(S.ignore_alex.moraleWk10)})`,
  S.ignore_alex.moraleWk3 > S.ignore_alex.moraleWk10);
check(`ignore_alex morale wk10 (${r1(S.ignore_alex.moraleWk10)}) crashed < 30`, S.ignore_alex.moraleWk10 < 30);
check(`decent morale wk10 (${r1(S.decent.moraleWk10)}) healthy > 50`, S.decent.moraleWk10 > 50);

// E · the application (old: grinders apply >= 40%; v2 has one window, no skips)
check(`decent.applied (${S.decent.applied}%) >= 90%`, S.decent.applied >= 90);

// F · the cap-table bill (old: "dirty cap table blocks the angel round" — the
// round is gone; the lesson's new home is the report card, so skipping the
// lawyer must show up as a visibly worse card, category and rollup both)
check(`skip_captable cap-table category (${r1(S.skip_captable.capScore)}) < 70`,
  S.skip_captable.capScore != null && S.skip_captable.capScore < 70);
check(`skip_captable.grade (${r1(S.skip_captable.grade)}) < decent.grade (${r1(S.decent.grade)})`,
  S.skip_captable.grade < S.decent.grade);

// G · the Jordan question (old: keep_jordan never fires, decent does,
// "unresolved Jordan collapses execution" + GOALS.md: "to win the game you
// will have to fire Jordan". The v2 contracts encode that: dodging the
// conversation must drag the rebuild and cost most wins — if these fail,
// keeping a drifting co-founder is currently free and needs design teeth.)
check(`keep_jordan.jordanFired = ${S.keep_jordan.jordanFired}% (expected 0 — never has the talk)`,
  S.keep_jordan.jordanFired === 0);
check(`decent.jordanFired (${S.decent.jordanFired}%) >= 80%`, S.decent.jordanFired >= 80);
check(`keep_jordan v2 ships later: wk ${r1(S.keep_jordan.meanV2Wk)} > decent wk ${r1(S.decent.meanV2Wk)}`,
  (S.keep_jordan.meanV2Wk || Infinity) > S.decent.meanV2Wk);
check(`keep_jordan.wins (${S.keep_jordan.wins}%) <= half of decent.wins (${S.decent.wins}%)`,
  S.keep_jordan.wins <= S.decent.wins / 2);

// H · the pivot is required (old: lean pivots >= 80%, no_pivot refuses, no_pivot
// loses — v2 is stricter: the YC traction bar makes refusing fatal)
check(`decent.pivoted (${S.decent.pivoted}%) >= 80%`, S.decent.pivoted >= 80);
check(`no_pivot.pivoted = ${S.no_pivot.pivoted}% (expected 0 — refuses twice)`, S.no_pivot.pivoted === 0);
check(`no_pivot.wins = ${S.no_pivot.wins}% (expected 0 — no pivot, no batch)`, S.no_pivot.wins === 0);

// I · Priya's two routes (old: skipping the meetup doesn't lock her out — she
// reaches out herself post-launch, and win rates stay comparable)
check(`no_meetup.priyaSeen (${S.no_meetup.priyaSeen}%) > 50%`, S.no_meetup.priyaSeen > 50);
check(`no_meetup.wins (${S.no_meetup.wins}%) within 15pts of decent.wins (${S.decent.wins}%)`,
  Math.abs(S.no_meetup.wins - S.decent.wins) <= 15);

// J · the scope lesson (old: strategies pick their plan; the real contract is
// the over-scope tax — plan A must cost calendar time and wins)
check(`full_plan launches later: wk ${r1(S.full_plan.meanLaunchWk)} > decent wk ${r1(S.decent.meanLaunchWk)}`,
  (S.full_plan.meanLaunchWk || Infinity) > S.decent.meanLaunchWk);
check(`full_plan.wins (${S.full_plan.wins}%) < decent.wins (${S.decent.wins}%)`,
  S.full_plan.wins < S.decent.wins);

// K · the lean asymmetry (new, from the chapter-economy work): a half-decent
// founder who leans against the market loses most wins — the summit and the
// slide evidence are research cards, so he under-pivots. One who leans
// against the build loses nearly all of them, and the failure mode is
// instructive: at a 50% build lean he still launches (late) and even pivots
// MORE than the builder (all that research banks the evidence) — but the
// rebuild is pure build, so v2 almost never ships before the wall. Build is
// existential, research is instrumental — the ordering must hold.
check(`builder.wins (${S.builder.wins}%) < decent.wins (${S.decent.wins}%) — ignoring the market costs wins`,
  S.builder.wins < S.decent.wins);
check(`marketer.wins (${S.marketer.wins}%) < builder.wins (${S.builder.wins}%) — no product beats no research`,
  S.marketer.wins < S.builder.wins);
check(`builder launches (${S.builder.launched}%) >= 90%; marketer ships v2 (${S.marketer.v2}%) < builder (${S.builder.v2}%)`,
  S.builder.launched >= 90 && S.marketer.v2 < S.builder.v2);

// L · hygiene (old: no runtime errors across all strategies)
const totalErrors = Object.values(S).reduce((n, r) => n + r.errors, 0);
check(`no runtime errors across all strategies (total: ${totalErrors})`, totalErrors === 0);

// ── report ────────────────────────────────────────────────────────────────────
const passed = checks.filter(c => c.pass).length;
console.log(`\n── Behavior contracts (${passed}/${checks.length} passed) ──`);
for (const c of checks) console.log(`  ${c.pass ? "PASS " : "FAIL▶"} ${c.desc}`);
console.log("");
process.exit(checks.length - passed > 0 ? 1 : 0);
