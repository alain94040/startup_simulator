"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// test_narrative.js — narrative-consistency fuzzer
//
// Auto-plays many games across several drivers and seeds, then flags any message
// or card whose narrative contradicts the game state when it surfaces. It does
// NOT tune balance (that's sim_proto.js) or check single deterministic paths
// (that's test_engine.js) — it asserts that *what a character says* is consistent
// with *the state when they say it*.
//
// Two layers:
//   A. State invariants  — engine.s self-consistency each week
//                          (e.g. customers>0 must imply launched).
//   B. Card-surfacing     — every offered card AND every newly-posted message is
//      rules                checked against the state it appears in
//                          (e.g. a "your subscriber churned" message requires
//                           customers>=1).
//
// Usage:
//   node test_narrative.js                       # full run (all drivers), summary report
//   node test_narrative.js 500                   # games per driver (default 300)
//   node test_narrative.js --verbose             # list every occurrence, not just first
//   node test_narrative.js --seed 1234 --driver pivot   # replay one game with a trace
//
// Exit code is non-zero if any un-allowlisted violation remains (CI-able).
// ─────────────────────────────────────────────────────────────────────────────

const { Engine } = require("../engine.js");
const { scoreGame } = require("../scoring.js");

const WEEK_CAP = 120;            // hard stop so a stalled game can't loop forever
const DEFAULT_GAMES = 300;       // per driver

// ── seeded RNG (mulberry32) so every finding is reproducible by seed ──────────
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
// LAYER A — state invariants. Each must hold on engine.s at every week boundary.
// These are intended narrative truths; a failure is either an engine bug or a
// wrong assumption to revise here. `describe` renders the contradiction.
// ─────────────────────────────────────────────────────────────────────────────
const STATE_INVARIANTS = [
  { name: "customers-imply-launched",
    holds: s => !(s.customers > 0) || s.launched,
    describe: s => `customers=${s.customers} but launched=${!!s.launched}` },
  { name: "users-imply-launched",
    holds: s => !(s.users > 0) || s.launched,
    describe: s => `users=${s.users} but launched=${!!s.launched}` },
  { name: "launched-implies-pre-launch-items-done",
    // Items that existed before launch should be done. Post-launch items (pivot
    // rebuild, arch refactor) are legitimately active.
    holds: s => {
      if (!s.launched || !s.items) return true;
      const POST_LAUNCH = new Set(["plans_matching", "plans_ui", "arch_refactor", "api_design", "video_dates"]);
      return Object.keys(s.items).every(k => {
        if (POST_LAUNCH.has(k)) return true;
        const it = s.items[k];
        return !it || it.status === 'done' || it.status === 'obsolete' || it.status === 'deferred';
      });
    },
    describe: s => {
      if (!s.items) return "launched with no items";
      const POST_LAUNCH = new Set(["plans_matching", "plans_ui", "arch_refactor", "api_design", "video_dates"]);
      const spinning = Object.keys(s.items).filter(k => !POST_LAUNCH.has(k) && s.items[k] && (s.items[k].status === 'active' || s.items[k].status === 'todo'));
      return `launched but pre-launch items still active/todo: ${spinning.join(', ')}`;
    } },
  { name: "pivot-creates-plans",
    holds: s => !s.activities_pivot || !!(s.items && s.items.plans_matching),
    describe: s => `activities_pivot but items.plans_matching=${s.items && s.items.plans_matching ? "ok" : "(missing)"}` },
  { name: "pivot-shipped-implies-pivot",
    holds: s => !s.pivot_shipped || s.activities_pivot,
    describe: s => `pivot_shipped but activities_pivot=${!!s.activities_pivot}` },
];

// ─────────────────────────────────────────────────────────────────────────────
// LAYER B — card-surfacing rules. For each card/message shown, if `test` matches,
// `require(s)` must hold for the state it surfaced in. Rules are high-precision:
// they target claims that only make sense once the product is live / has paying
// users. `ALLOW` exempts cards that legitimately use this language pre-launch.
// ─────────────────────────────────────────────────────────────────────────────
const CARD_RULES = [
  { name: "paying-talk",
    // Asserts an *existing* paying relationship. Note "paying"/"first customer" were
    // dropped: phrases like "nobody's paying" / "convert the first customer" describe
    // the pre-customer state, the opposite of what this rule means.
    test: c => /\bsubscribers?\b|cancell?ed|\bchurn(?:ed|ing)?\b|testimonial/i.test(c.body),
    require: s => s.customers >= 1,
    need: "customers>=1" },
  { name: "launched-claim",
    // Affirmative "we're live" phrasing only — bare "launched" also matches "not
    // launched", which is a status acknowledgement, not a claim of being live.
    test: c => /now live|we (?:just )?launched|we shipped|in the app every day|went on a date because/i.test(c.body),
    require: s => !!s.launched,
    need: "launched" },
  { name: "live-metrics-talk",
    // Claims about *our* live metrics. Bare "retention" was dropped — it also matches
    // generic market talk ("dating apps with real retention are rare"), which is not a
    // claim about this product's numbers.
    test: c => /signups?|downloads?|active users|daily actives|user retention|churn rate/i.test(c.body),
    require: s => !!s.launched,
    need: "launched" },
  { name: "customer-feedback-cat",
    test: c => c.cat === "c" && /feedback|complaint|review|churn|cancell?ed|retention/i.test(c.body),
    require: s => !!s.launched,
    need: "launched" },
];

// Cards that legitimately speak in customer/user terms BEFORE launch — these are
// discovery / market-research / waitlist beats, not live-product feedback. Each
// is exempt with a reason so the suspect set stays small and intentional.
const ALLOW = new Set([
  "founder_first_interviews", // pre-launch customer discovery interviews
  "founder_solo_discover",    // founder doing discovery after Alex leaves
  "cold_silence",             // cold-outreach with no responses, pre-launch
  "first_interview_shock",    // Alex's first discovery interview, pre-demo
  "random_reframe",           // a stranger reframes the idea, discovery phase
  "pivot_insight_1",          // discovery interviews that motivate the pivot
  "pivot_insight_2",          // second round of discovery interviews
  // NOTE: pmf_lock is deliberately NOT allowlisted. Its "i actually went on a date
  // because of this" claims real product usage, which only makes sense post-launch —
  // exactly the kind of pre-launch contradiction this tool exists to surface.
  "mentor_competitor_bomb",   // advisor warns about competitors, pre-product
  "waitlist_cold",            // waitlist signups going cold, explicitly pre-launch
  "first_customer_offer",     // the convert-the-first-customer card — customers===0 by design
  "yc_discussion_early",      // YC criteria meta-message; literally says "not launched / <10 subscribers"
  "yc_apply",                 // YC application boilerplate referencing subscriber learnings
  "pivot_priya_verdict",      // advisor *warning* about post-launch retention risk, not a current claim
]);

// ── violation aggregation ─────────────────────────────────────────────────────
const layerA = new Map();   // invariantName -> { count, byDriver, first }
const layerB = new Map();   // `${rule}|${cardId}` -> { count, byDriver, first }
let totalViolations = 0;
const scoringFailures = []; // endgame scorecard smoke check — { seed, driver, why }

// Coverage — proves the drivers actually exercise the states we care about, so a
// clean result means "checked and consistent", not "never reached".
const coverage = {};  // driver -> { games, launched, pivot, pivotPrelaunch, customers }
function cov(driver) {
  return coverage[driver] || (coverage[driver] = { games: 0, launched: 0, pivot: 0, pivotPrelaunch: 0, customers: 0 });
}

function snapshot(s) {
  return {
    week: s.week, launched: !!s.launched, has_demo: !!s.has_demo,
    customers: s.customers, users: s.users, market_fit: Math.round(s.market_fit),
    signal: Math.round(s.signal), activities_pivot: !!s.activities_pivot,
    pivot_shipped: !!s.pivot_shipped,
    dev_plan: s.dev_plan || null,
    plans_matching: s.items && s.items.plans_matching ? s.items.plans_matching.status : null,
  };
}
const clip = (str, n) => (str && str.length > n ? str.slice(0, n - 1) + "…" : str || "");

// Realistic drivers outrank the random fuzzer when choosing which example to show:
// a violation a sensible player can hit matters more than a fuzzer-only edge state.
const DRIVER_RANK = { decent: 0, pivot: 1, random: 2 };
function bumpExample(e, ctx, extra) {
  const cand = { ...ctx, ...extra };
  if (!e.first || DRIVER_RANK[cand.driver] < DRIVER_RANK[e.first.driver]) e.first = cand;
}
function entry(map, key) {
  let e = map.get(key);
  if (!e) { e = { count: 0, byDriver: {}, first: null }; map.set(key, e); }
  return e;
}

function recordA(inv, s, ctx) {
  totalViolations++;
  const e = entry(layerA, inv.name);
  e.count++; e.byDriver[ctx.driver] = (e.byDriver[ctx.driver] || 0) + 1;
  bumpExample(e, ctx, { detail: inv.describe(s), state: snapshot(s) });
}
function recordB(rule, card, s, ctx) {
  totalViolations++;
  const id = card.id || `${card.from || "?"}:msg`;
  const e = entry(layerB, `${rule.name}|${id}`);
  e.count++; e.byDriver[ctx.driver] = (e.byDriver[ctx.driver] || 0) + 1;
  bumpExample(e, ctx, { id, rule: rule.name, need: rule.need, from: card.from,
                        cat: card.cat, body: clip(card.body, 110), state: snapshot(s) });
}

// Normalize either an openActions() entry or a thread message into a checkable card.
function asCard(x) {
  return { id: x.cardId || null, body: x.body || "", cat: x.cat || null, from: x.from || null };
}
function checkCardRules(raw, s, ctx) {
  const card = asCard(raw);
  if (!card.body) return;
  for (const rule of CARD_RULES) {
    if (card.id && ALLOW.has(card.id)) continue;
    if (rule.test(card) && !rule.require(s)) recordB(rule, card, s, ctx);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Drivers — decide which cards to answer and with which option. Variety here is
// what reaches the diverse states; the trio + RNG fuzzing makes it systematic.
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

// Act on up to the weekly budget for this driver. `random` sometimes ignores a card.
function drive(e, driver) {
  let safety = 0;
  while (e.stats().actionsLeft > 0 && safety++ < 12) {
    const actions = e.openActions();
    if (!actions.length) break;
    let pick;
    if (driver === "random") {
      const pool = actions.filter(() => Math.random() < 0.7);   // sometimes skip → stalls
      if (!pool.length) break;
      pick = pool[Math.floor(Math.random() * pool.length)];
    } else {
      pick = actions[0];   // openActions is urgency-sorted
    }
    const key = chooseOption(pick, driver);
    if (!key) break;
    e.act(pick.cardId, key);
  }
}

// ── one game ──────────────────────────────────────────────────────────────────
function playGame(seed, driver, trace) {
  withSeed(seed, () => {
    const e = new Engine();
    const cursors = {};
    for (const id of e.order) cursors[id] = e.threads[id].length;
    const c = cov(driver); c.games++;
    const seen = { launched: false, pivot: false, pivotPrelaunch: false, customers: false };

    while (!e.s.game_over && !e.s.game_won && e.s.week <= WEEK_CAP) {
      const week = e.s.week;
      const ctx = { seed, driver, week };

      // (B-1) offered cards, checked against the state they surfaced in
      const offered = e.openActions();
      for (const a of offered) checkCardRules(a, e.s, { ...ctx, surface: "offered" });

      if (trace) {
        console.log(`\nWeek ${week}  ${JSON.stringify(snapshot(e.s))}`);
        for (const a of offered) console.log(`  card  [${a.cat}] ${a.cardId} «${clip(a.body, 80)}»`);
      }

      drive(e, driver);
      e.nextWeek();

      // (B-2) messages posted since last week, checked against the new state
      for (const id of e.order) {
        const thread = e.threads[id];
        for (let i = cursors[id]; i < thread.length; i++) {
          const m = thread[i];
          if (m.type !== "incoming") continue;
          checkCardRules(m, e.s, { ...ctx, week: e.s.week, surface: "message" });
          if (trace) console.log(`  msg   ${m.from || id}: «${clip(m.body, 80)}»`);
        }
        cursors[id] = thread.length;
      }

      // (A) state invariants on the new state
      for (const inv of STATE_INVARIANTS) {
        if (!inv.holds(e.s)) recordA(inv, e.s, { ...ctx, week: e.s.week });
      }

      // coverage bookkeeping
      if (e.s.launched) seen.launched = true;
      if (e.s.activities_pivot) seen.pivot = true;
      if (e.s.activities_pivot && !e.s.launched) seen.pivotPrelaunch = true;
      if (e.s.customers > 0) seen.customers = true;
    }
    if (seen.launched) c.launched++;
    if (seen.pivot) c.pivot++;
    if (seen.pivotPrelaunch) c.pivotPrelaunch++;
    if (seen.customers) c.customers++;

    // Endgame scorecard smoke check: whatever state the game ended in (early
    // bankruptcy, YC verdict, timeout), scoreGame must return 10 well-formed
    // categories — each graded or explicitly "never faced" — without throwing.
    try {
      const sc = scoreGame(e);
      if (!sc || !Array.isArray(sc.categories) || sc.categories.length !== 10)
        scoringFailures.push({ seed, driver, why: `expected 10 categories, got ${sc && sc.categories ? sc.categories.length : "none"}` });
      else for (const cat of sc.categories) {
        const ok = cat.label && cat.detail && cat.lesson && cat.ref &&
          (cat.score == null ? cat.grade == null
            : typeof cat.score === "number" && cat.score >= 0 && cat.score <= 100 && /^[ABCDF]$/.test(cat.grade));
        if (!ok) scoringFailures.push({ seed, driver, why: `malformed category ${cat.key || "?"} (score=${cat.score}, grade=${cat.grade})` });
      }
    } catch (err) {
      scoringFailures.push({ seed, driver, why: `scoreGame threw: ${err.message}` });
    }
  });
}

// ── reporting ─────────────────────────────────────────────────────────────────
function fmtFirst(f) {
  return `seed ${f.seed} · wk ${f.week} · ${f.driver}/${f.surface || "state"} · ${JSON.stringify(f.state)}`;
}
// "decent"/"pivot" hits are reachable by sensible play (what the debug-skip showed);
// "random"-only hits are fuzzer edge states. Surface that distinction prominently.
const realistic = e => (e.byDriver.decent || 0) + (e.byDriver.pivot || 0) > 0;
const fmtDrivers = e => Object.entries(e.byDriver).map(([d, n]) => `${d}:${n}`).join(" ");
const tag = e => realistic(e) ? "‹realistic›" : "‹fuzzer-only›";

function report(games, drivers, verbose) {
  console.log(`\nNarrative consistency — ${games} games × ${drivers.length} drivers (${drivers.join(", ")}), cap wk ${WEEK_CAP}`);
  console.log("‹realistic› = reached by decent/pivot play · ‹fuzzer-only› = only the random fuzzer hit it");

  console.log("\n── Coverage (states each driver actually reached) ──────────");
  console.log("  driver   games  launched  pivot  pivot&pre-launch  customers");
  for (const d of drivers) {
    const c = cov(d); const pct = n => `${Math.round((n / Math.max(1, c.games)) * 100)}%`.padStart(4);
    console.log(`  ${d.padEnd(8)} ${String(c.games).padStart(5)}   ${pct(c.launched)}     ${pct(c.pivot)}        ${pct(c.pivotPrelaunch)}            ${pct(c.customers)}`);
  }

  console.log("\n── Layer A · state invariants ──────────────────────────────");
  if (!layerA.size) console.log("  ok   all state invariants held");
  for (const inv of STATE_INVARIANTS) {
    const e = layerA.get(inv.name);
    if (!e) { console.log(`  ok   ${inv.name}`); continue; }
    console.log(`  FAIL ${inv.name} ${tag(e)} — ${e.count} hit${e.count === 1 ? "" : "s"} [${fmtDrivers(e)}]`);
    console.log(`         e.g. ${e.first.detail}  (${fmtFirst(e.first)})`);
  }

  console.log("\n── Layer B · card / message surfacing ──────────────────────");
  if (!layerB.size) console.log("  ok   no card or message contradicted its state");
  // Realistic-play violations first, then by frequency.
  const rows = [...layerB.values()].sort((a, b) =>
    (realistic(b) - realistic(a)) || (b.count - a.count));
  for (const e of rows) {
    const f = e.first;
    console.log(`  FAIL [${f.rule}] ${f.id} ${tag(e)}  needs ${f.need} — ${e.count} hit${e.count === 1 ? "" : "s"} [${fmtDrivers(e)}]`);
    console.log(`         «${f.body}»`);
    console.log(`         ${fmtFirst(f)}`);
  }

  if (verbose && totalViolations) {
    console.log("\n(— verbose: first example per group shown above; counts are total occurrences —)");
  }

  console.log("\n── Endgame scorecard (scoring.js smoke check) ──────────────");
  if (!scoringFailures.length) console.log("  ok   scoreGame returned 10 well-formed categories at every game end");
  for (const f of scoringFailures.slice(0, 5))
    console.log(`  FAIL seed ${f.seed} · ${f.driver} — ${f.why}`);
  if (scoringFailures.length > 5) console.log(`  … and ${scoringFailures.length - 5} more`);

  const realB = [...layerB.values()].filter(realistic).length;
  const realA = [...layerA.values()].filter(realistic).length;
  console.log(`\n${totalViolations ? "VIOLATIONS FOUND" : "ALL NARRATIVE CHECKS PASSED"} ` +
              `(${layerA.size} invariant group(s), ${layerB.size} card/message group(s); ` +
              `${realA + realB} reachable by realistic play; ${totalViolations} total occurrences)`);
}

// ── CLI ───────────────────────────────────────────────────────────────────────
function main() {
  const argv = process.argv.slice(2);
  const has = f => argv.includes(f);
  const val = f => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };

  // Replay mode: one seeded game, full trace.
  const seedArg = val("--seed");
  if (seedArg != null) {
    const driver = val("--driver") || "pivot";
    console.log(`Replay — seed ${seedArg}, driver ${driver}`);
    playGame(parseInt(seedArg, 10), driver, true);
    report(1, [driver], true);
    process.exit(totalViolations || scoringFailures.length ? 1 : 0);
  }

  const games = parseInt(argv.find(a => /^\d+$/.test(a)) || DEFAULT_GAMES, 10);
  const drivers = val("--driver") ? [val("--driver")] : ["decent", "pivot", "random"];
  const verbose = has("--verbose");

  let seed = 1;
  for (const driver of drivers) {
    for (let i = 0; i < games; i++) playGame(seed++, driver, false);
  }
  report(games, drivers, verbose);
  process.exit(totalViolations || scoringFailures.length ? 1 : 0);
}

main();
