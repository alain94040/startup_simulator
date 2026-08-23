"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// tests/sim_behaviors.js — the behavior-contract suite. Each check asserts
// that a specific founder behavior has its designed consequence ("if Alex is
// part-time, the product must not build faster than full-time"), stated as a
// contract over many simulated games rather than a single scripted run. The
// cap-table lesson, for instance, lands as "a dirty cap table shows up as a
// worse report card".
//
// Usage:  node tests/sim_behaviors.js [N]     (default 60 games/strategy)
// Exit code = number of failed contracts (like the other test_* tools).
// ─────────────────────────────────────────────────────────────────────────────

const H = require("./harness.js");
const Scoring = require("../scoring.js");
const { mean, r1, pct, pad, padL } = H;

const N = parseInt(process.argv[2] || "60", 10);

// ── strategy builders ────────────────────────────────────────────────────────
// The archetypes themselves live in harness.js (`H.STRATEGIES`) so that
// transcript.js can replay the exact same founders — when a contract below
// fails, `node tests/transcript.js --driver <name>` prints that run's story.
const { withPrefs, STRATEGIES } = H;

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
      m.qualified = !!(s.launched && s.pivot_shipped && s.customers >= 1);
      m.alexLeft = !g.cast.get("alex").active;
      m.jordanFired = !!s.jordan_resolved;
      m.jordanQuit = !!s.jordan_quit;
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
    qualified: share(m => m.qualified), alexLeft: share(m => m.alexLeft),
    jordanFired: share(m => m.jordanFired),
    jordanQuit: share(m => m.jordanQuit),
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

console.log(`\nBehavior contracts — ${N} games per strategy\n`);
const S = {};
for (const [name, spec] of Object.entries(STRATEGIES)) S[name] = runStrategy(name, spec);
S.no_meetup.priyaSeen = priyaShare(STRATEGIES.no_meetup);

// ── the strategy table ────────────────────────────────────────────────────────
console.log(`  ${pad("strategy", 13)} ${padL("win", 5)} ${padL("launch", 7)} ${padL("pivot", 6)} ${padL("v2", 4)} ${padL("qual", 6)} ${padL("alexLeft", 9)} ${padL("fired", 6)} ${padL("items", 6)} ${padL("grade", 6)}`);
for (const r of Object.values(S)) {
  console.log(`  ${pad(r.name, 13)} ${padL(r.wins + "%", 5)} ${padL(r.launched + "%", 7)} ${padL(r.pivoted + "%", 6)} ${padL(r.v2 + "%", 4)} ${padL(r.qualified + "%", 6)} ${padL(r.alexLeft + "%", 9)} ${padL(r.jordanFired + "%", 6)} ${padL(r1(r.itemsDone), 6)} ${padL(r.grade == null ? "—" : Math.round(r.grade), 6)}`);
}

// ── the contracts ─────────────────────────────────────────────────────────────
const checks = [];
const check = (desc, pass) => checks.push({ desc, pass });

// A · skill beats luck
check(`random.wins (${S.random.wins}%) < 5%`, S.random.wins < 5);
check(`random.wins (${S.random.wins}%) < decent.wins (${S.decent.wins}%)`, S.random.wins < S.decent.wins);
check(`random.launched (${S.random.launched}%) < decent.launched (${S.decent.launched}%)`, S.random.launched < S.decent.launched);

// B · broken founders never win
check(`ignore_alex.wins = ${S.ignore_alex.wins}% (expected 0)`, S.ignore_alex.wins === 0);
check(`outside_only.wins = ${S.outside_only.wins}% (expected 0 — all market, no product)`, S.outside_only.wins === 0);

// C · the commitment lesson: part-time Alex must never out-build full-time Alex.
check(`fulltime demo (wk ${r1(S.fulltime.meanDemoWk)}) no later than part-time (wk ${r1(S.decent.meanDemoWk)})`,
  S.fulltime.meanDemoWk <= S.decent.meanDemoWk + 0.101);
check(`fulltime launch (wk ${r1(S.fulltime.meanLaunchWk)}) no later than part-time (wk ${r1(S.decent.meanLaunchWk)})`,
  S.fulltime.meanLaunchWk <= S.decent.meanLaunchWk + 0.101);
check(`fulltime.wins (${S.fulltime.wins}%) >= decent.wins (${S.decent.wins}%) - 3`,
  S.fulltime.wins >= S.decent.wins - 3);

// D · neglect has a face: departure rates, morale trajectory, roadmap counts
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

// E · the traction bar — decent play must clear it (launched, shipped the
// pivot, at least one paying customer) well before the deadline grades it
check(`decent.qualified (${S.decent.qualified}%) >= 90%`, S.decent.qualified >= 90);

// F · the cap-table bill: the lesson lives on the report card, so skipping the
// lawyer must show up as a visibly worse card, category and rollup both)
check(`skip_captable cap-table category (${r1(S.skip_captable.capScore)}) < 70`,
  S.skip_captable.capScore != null && S.skip_captable.capScore < 70);
check(`skip_captable.grade (${r1(S.skip_captable.grade)}) < decent.grade (${r1(S.decent.grade)})`,
  S.skip_captable.grade < S.decent.grade);

// G · the Jordan question — GOALS.md: "to win the game you will have to fire
// Jordan". These contracts encode that: dodging the conversation must drag the
// rebuild and cost most wins — if they fail, keeping a drifting co-founder is
// currently free and needs design teeth.
check(`keep_jordan.jordanFired = ${S.keep_jordan.jordanFired}% (expected 0 — never has the talk)`,
  S.keep_jordan.jordanFired === 0);
check(`decent.jordanFired (${S.decent.jordanFired}%) >= 80%`, S.decent.jordanFired >= 80);
check(`keep_jordan v2 ships later: wk ${r1(S.keep_jordan.meanV2Wk)} > decent wk ${r1(S.decent.meanV2Wk)}`,
  (S.keep_jordan.meanV2Wk || Infinity) > S.decent.meanV2Wk);
check(`keep_jordan.wins (${S.keep_jordan.wins}%) <= half of decent.wins (${S.decent.wins}%)`,
  S.keep_jordan.wins <= S.decent.wins / 2);

// G2 · the compromise (new with the firing scene): reaching the room and
// blinking is worse than deferring, not better. She resigns on her own, so the
// founder never gets the decision — and the report card must say so.
check(`fold_jordan.jordanFired = ${S.fold_jordan.jordanFired}% (expected 0 — blinked in the room)`,
  S.fold_jordan.jordanFired === 0);
check(`fold_jordan.jordanQuit (${S.fold_jordan.jordanQuit}%) >= 80% — she leaves on her own`,
  S.fold_jordan.jordanQuit >= 80);
check(`fold_jordan.grade (${Math.round(S.fold_jordan.grade)}) < decent.grade (${Math.round(S.decent.grade)})`,
  S.fold_jordan.grade < S.decent.grade);

// H · the pivot is required — the YC traction bar makes refusing it fatal
check(`decent.pivoted (${S.decent.pivoted}%) >= 80%`, S.decent.pivoted >= 80);
check(`no_pivot.pivoted = ${S.no_pivot.pivoted}% (expected 0 — refuses twice)`, S.no_pivot.pivoted === 0);
check(`no_pivot.wins = ${S.no_pivot.wins}% (expected 0 — no pivot, no batch)`, S.no_pivot.wins === 0);

// I · Priya's two routes: skipping the meetup doesn't lock her out — she
// reaches out herself post-launch, and win rates stay comparable
check(`no_meetup.priyaSeen (${S.no_meetup.priyaSeen}%) > 50%`, S.no_meetup.priyaSeen > 50);
check(`no_meetup.wins (${S.no_meetup.wins}%) within 15pts of decent.wins (${S.decent.wins}%)`,
  Math.abs(S.no_meetup.wins - S.decent.wins) <= 15);

// J · the scope lesson: the over-scope tax — plan A must cost calendar time
// and wins
check(`full_plan launches later: wk ${r1(S.full_plan.meanLaunchWk)} > decent wk ${r1(S.decent.meanLaunchWk)}`,
  (S.full_plan.meanLaunchWk || Infinity) > S.decent.meanLaunchWk);
check(`full_plan.wins (${S.full_plan.wins}%) < decent.wins (${S.decent.wins}%)`,
  S.full_plan.wins < S.decent.wins);

// K · the lean asymmetry: a half-decent
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

// L · hygiene
const totalErrors = Object.values(S).reduce((n, r) => n + r.errors, 0);
check(`no runtime errors across all strategies (total: ${totalErrors})`, totalErrors === 0);

// ── report ────────────────────────────────────────────────────────────────────
const passed = checks.filter(c => c.pass).length;
console.log(`\n── Behavior contracts (${passed}/${checks.length} passed) ──`);
for (const c of checks) console.log(`  ${c.pass ? "PASS " : "FAIL▶"} ${c.desc}`);
console.log("");
process.exit(checks.length - passed > 0 ? 1 : 0);
