"use strict";
// Launch arc permutation test.
// Runs every combination of option choices through the launch focus arc and
// verifies that no path deadlocks (arc active but no cards to answer).
//
// Usage:
//   node tests/test_launch_arc.js             # all combos, summary only
//   node tests/test_launch_arc.js --verbose   # print every path

const { Engine } = require("../engine.js");
const VERBOSE = process.argv.includes("--verbose");

// ── Seeded RNG — patches Math.random for the duration of fn() ─────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let z = Math.imul(a ^ a >>> 15, 1 | a);
    z = z + Math.imul(z ^ z >>> 7, 61 | z) ^ z;
    return ((z ^ z >>> 14) >>> 0) / 4294967296;
  };
}
function withSeed(seed, fn) {
  const real = Math.random;
  Math.random = mulberry32(seed);
  try { return fn(); } finally { Math.random = real; }
}

// ── Pre-launch prefs (same as test_narrative.js decent driver) ─────────────
const PRE_PREFS = {
  dev_planning_session: "lean",
  alex_commitment: "accept",
  start_prototype: "build",
  incorporate_week1: "atlas",
  jordan_equity: "fair",
  good_enough_launch: "ship",
};

// Play to the moment good_enough_launch→ship fires (s.focus just set, no
// focus beats answered yet).  Returns { e, week } or null if never reached.
// NOTE: must stop INSIDE the inner action loop the instant s.focus turns on —
// focus beats are free so the driver would chew the entire arc in one pass.
function playToLaunch(seed) {
  return withSeed(seed, () => {
    const e = new Engine();
    for (let week = 0; week < 100; week++) {
      if (e.s.game_over || e.s.game_won) return null;

      let safety = 0;
      while (e.stats().actionsLeft > 0 && safety++ < 40) {
        const aa = e.openActions().filter(a => !a.onHold);
        if (!aa.length) break;
        const a = aa[0];
        const opts = e.options(a.cardId);
        if (!opts.length) break;
        const prefKey = PRE_PREFS[a.cardId];
        const opt = (prefKey && opts.find(o => o.key === prefKey)) || opts[0];
        if (!opt) break;
        e.act(a.cardId, opt.key);
        // Stop the instant the launch focus arc opens — before any focus beats
        // are answered (the caller will drive the arc with their own choices).
        if (e.s.focus && e.s.focus.id === "launch") return { e, week };
      }
      e.nextWeek();
    }
    return null; // never reached launch
  });
}

// ── All launch-arc cards and their option keys ─────────────────────────────
// Conditional cards (abuser, crisis) are listed too; if they never surface
// for a given path the specified key is simply unused.
const ARC_CARDS = [
  ["launch_preflight",          ["review", "send"]],
  ["launch_email_pulse",        ["yes", "no"]],
  ["launch_first_bounce",       ["normal", "broken", "who"]],
  ["launch_staging_bug_discover", ["check"]],
  ["launch_staging_bug_found",    ["options"]],
  ["launch_staging_bug_decide",   ["hotfix", "takedown", "wait"]],
  ["launch_first_signup_live",  ["watch", "welcome", "leave"]],
  ["launch_inbox_question",     ["personal", "faq", "wait"]],
  ["launch_hustle_temptation",  ["go", "stay"]],
  ["launch_abuser_early",       ["ban", "warn", "investigate"]],
  ["launch_test_profiles_notice",  ["how_many"]],
  ["launch_test_profiles_scope",   ["damage"]],
  ["launch_test_profiles_decide",  ["disclose", "delete", "nothing"]],
  ["launch_stripe_sting",       ["tell", "fix_charge", "free_month", "wait"]],
  ["launch_going_home",         ["ack"]],
  ["launch_9pm_crisis",         ["ban", "victim_first", "morning"]],
  ["launch_signal",             ["ack"]],
];
const TOTAL = ARC_CARDS.reduce((n, [, opts]) => n * opts.length, 1);

// ── Cartesian product generator ────────────────────────────────────────────
function* cartesian(entries, idx = 0, cur = {}) {
  if (idx === entries.length) { yield cur; return; }
  const [key, vals] = entries[idx];
  for (const v of vals) yield* cartesian(entries, idx + 1, { ...cur, [key]: v });
}

// ── Drive the launch arc with specified option choices ─────────────────────
// Returns { ok: true, path } or { ok: false, stuckAt, path, flags }
function runArc(e, choices) {
  const path = [];
  for (let step = 0; step < 40; step++) {
    if (!e.s.focus) return { ok: true, path };

    const fa = e.openActions().filter(a => a.focus && !a.onHold);
    if (!fa.length) {
      const af = e.chars.get("alex").flags;
      const jf = e.chars.get("jordan").flags;
      return {
        ok: false,
        stuckAt: "no_focus_actions",
        path,
        alexOpen:   e.openCardId("alex"),
        jordanOpen: e.openCardId("jordan"),
        alexFlags:  Object.keys(af).filter(k => af[k]),
        jordanFlags:Object.keys(jf).filter(k => jf[k]),
      };
    }

    // When multiple focus cards are open (triage window), answer the first one.
    const action = fa[0];
    const opts = e.options(action.cardId);
    if (!opts.length) return { ok: false, stuckAt: `no_options:${action.cardId}`, path };

    const choiceKey = choices[action.cardId];
    const opt = (choiceKey && opts.find(o => o.key === choiceKey)) || opts[0];
    e.act(action.cardId, opt.key);
    path.push(`${action.cardId}:${opt.key}`);
  }
  return { ok: false, stuckAt: "safety(40)", path };
}

// ── Main ───────────────────────────────────────────────────────────────────
// Find a seed that reliably reaches the launch arc with the pre-launch prefs.
function findWorkingSeed() {
  for (let s = 1; s <= 500; s++) {
    if (playToLaunch(s)) return s;
  }
  return null;
}

const SEED = findWorkingSeed();
if (!SEED) {
  console.error("ERROR: no seed in 1-500 reaches the launch arc — check pre-launch prefs");
  process.exit(1);
}
const probe = playToLaunch(SEED);
console.log(`Launch arc permutation test — ${TOTAL.toLocaleString()} combinations`);
console.log(`Seed ${SEED}, launch arc opens at week ${probe.week}\n`);

let total = 0, passed = 0;
const failures = [];

for (const choices of cartesian(ARC_CARDS)) {
  total++;
  const preResult = playToLaunch(SEED);
  if (!preResult) {
    failures.push({ choices, result: { ok: false, stuckAt: "pre-launch-failed", path: [] } });
    continue;
  }
  const result = runArc(preResult.e, choices);
  if (result.ok) {
    passed++;
    if (VERBOSE) console.log(`  OK  ${result.path.join(" → ")}`);
  } else {
    failures.push({ choices, result });
    if (failures.length <= 10) {
      console.log(`  FAIL stuck=${result.stuckAt}`);
      console.log(`       path:    ${result.path.join(" → ")}`);
      if (result.alexFlags !== undefined) {
        console.log(`       alex:    open=${result.alexOpen||"—"} flags=[${result.alexFlags.join(",")}]`);
        console.log(`       jordan:  open=${result.jordanOpen||"—"} flags=[${result.jordanFlags.join(",")}]`);
      }
    }
  }

  if (total % 5000 === 0) process.stderr.write(`  ${total}/${TOTAL}...\r`);
}

console.log(`\n── Results ────────────────────────────────────────────────────`);
console.log(`  Combinations: ${total.toLocaleString()}`);
console.log(`  Passed:       ${passed.toLocaleString()}`);
console.log(`  Failed:       ${failures.length.toLocaleString()}`);
if (failures.length > 10) console.log(`  (showing first 10 of ${failures.length} above)`);

process.exit(failures.length > 0 ? 1 : 0);
