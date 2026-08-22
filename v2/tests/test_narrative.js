"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// v2/tests/test_narrative.js — narrative-consistency fuzzer for the v2 engine.
//
// Auto-plays many games across several drivers and seeds, then flags any message
// or open node whose narrative contradicts the game state when it surfaces.
// Ported from tests/test_narrative.js; the v2 engine's seeded RNG removes the
// Math.random patching, and the shared harness owns the drivers.
//
// Two layers:
//   A. State invariants  — game.s self-consistency each week.
//   B. Card-surfacing    — every offered node AND every newly-posted message is
//      rules               checked against the state it appears in.
//
// Usage:
//   node v2/tests/test_narrative.js                # full run (all drivers)
//   node v2/tests/test_narrative.js 500            # games per driver (default 300)
//   node v2/tests/test_narrative.js --verbose
//   node v2/tests/test_narrative.js --seed 1234 --driver pivot   # replay w/ trace
//
// Exit code is non-zero if any un-allowlisted violation remains (CI-able).
// ─────────────────────────────────────────────────────────────────────────────

const H = require("./harness.js");
const Scoring = require("../scoring.js");

const WEEK_CAP = 120;
const DEFAULT_GAMES = 300;
const CATEGORY_COUNT = 7;

// ─────────────────────────────────────────────────────────────────────────────
// LAYER A — state invariants. Must hold on game.s at every week boundary.
// ─────────────────────────────────────────────────────────────────────────────
const STATE_INVARIANTS = [
  { name: "customers-imply-launched",
    holds: s => !(s.customers > 0) || s.launched,
    describe: s => `customers=${s.customers} but launched=${!!s.launched}` },
  { name: "users-imply-launched",
    holds: s => !(s.users > 0) || s.launched,
    describe: s => `users=${s.users} but launched=${!!s.launched}` },
  { name: "launched-implies-pre-launch-items-done",
    holds: s => {
      if (!s.launched || !s.items) return true;
      const POST_LAUNCH = new Set(["plans_matching", "plans_ui", "arch_refactor", "api_design", "video_dates"]);
      return Object.keys(s.items).every(k => {
        if (POST_LAUNCH.has(k)) return true;
        const it = s.items[k];
        return !it || it.status === "done" || it.status === "obsolete" || it.status === "deferred";
      });
    },
    describe: s => {
      if (!s.items) return "launched with no items";
      const POST_LAUNCH = new Set(["plans_matching", "plans_ui", "arch_refactor", "api_design", "video_dates"]);
      const spinning = Object.keys(s.items).filter(k => !POST_LAUNCH.has(k) && s.items[k] && (s.items[k].status === "active" || s.items[k].status === "todo"));
      return `launched but pre-launch items still active/todo: ${spinning.join(", ")}`;
    } },
  { name: "pivot-creates-plans",
    holds: s => !s.activities_pivot || !!(s.items && s.items.plans_matching),
    describe: s => `activities_pivot but items.plans_matching=${s.items && s.items.plans_matching ? "ok" : "(missing)"}` },
  { name: "pivot-shipped-implies-pivot",
    holds: s => !s.pivot_shipped || s.activities_pivot,
    describe: s => `pivot_shipped but activities_pivot=${!!s.activities_pivot}` },
];

// ─────────────────────────────────────────────────────────────────────────────
// LAYER B — card-surfacing rules (regexes ported verbatim from the old suite).
// ─────────────────────────────────────────────────────────────────────────────
const CARD_RULES = [
  { name: "paying-talk",
    test: c => /\bsubscribers?\b|cancell?ed|\bchurn(?:ed|ing)?\b|testimonial/i.test(c.body),
    require: s => s.customers >= 1,
    need: "customers>=1" },
  { name: "launched-claim",
    test: c => /now live|we (?:just )?launched|we shipped|in the app every day|went on a date because/i.test(c.body),
    require: s => !!s.launched,
    need: "launched" },
  { name: "live-metrics-talk",
    test: c => /signups?|downloads?|active users|daily actives|user retention|churn rate/i.test(c.body),
    require: s => !!s.launched,
    need: "launched" },
  { name: "customer-feedback-msg",
    test: c => /feedback|complaint|review|churn|cancell?ed|retention/i.test(c.body) && /user|subscriber|customer/i.test(c.body),
    require: s => !!s.launched,
    need: "launched" },
];

// Nodes that legitimately speak in customer/user/signup terms BEFORE launch —
// discovery, waitlist, and meta beats, each exempt with a reason.
const ALLOW = new Set([
  "interviews",             // pre-launch customer discovery interviews
  "founder_solo_discover",  // discovery after Alex leaves
  "cold_silence",           // cold outreach with no responses, pre-launch
  "first_interview_shock",  // Alex's first discovery interview, pre-demo
  "random_reframe",         // a stranger reframes the idea, discovery phase
  "pivot_insight_1",        // discovery interviews that motivate the pivot
  "pivot_insight_2",        // second round of discovery interviews
  "mentor_competitor_bomb", // advisor warns about competitors, pre-product
  "waitlist_cold",          // waitlist signups going cold, explicitly pre-launch
  "first_customer_offer",   // convert-the-first-customer card — customers===0 by design
  "yc_apply",               // application boilerplate referencing user learnings
  "waitlist_calls",         // calling waitlist SIGNUPS pre-launch (the research habit)
  "founder_meetup",         // "consumer social" meetup flavor, not our metrics
  "trust_safety",           // "app store REVIEW" + "USER-generated content" — Apple's
                            // form, not customer feedback; deliberately pre-launch
  "alex_sync_build",        // "customer feedback" = discovery-sprint findings, pre-launch
  // The Flare arc quotes the COMPETITOR's users/signups/funding — market talk,
  // not claims about plusone being live.
  "flare_stealth", "flare_10k", "flare_feature", "flare_stumble", "flare_epilogue",
  // Community ladders: threads quote OTHER products' users/signups and waitlist
  // asks — market talk, not claims about plusone being live.
  "hn_thread", "community_hn_1", "community_hn_2", "community_hn_3",
  "community_reddit_1", "community_reddit_2", "community_reddit_3",
  "community_ih_1", "community_ih_2", "community_ih_3",
]);

// Sender-based exemptions for scheduled follow-ups with no node id. The
// "we cancelled" notice fires one week AFTER the timeout already docked the
// customer count — a past-tense message about a customer who just left is
// consistent even when the count reads 0 at delivery time.
const ALLOW_FROM = new Set(["Subscriber"]);

// ── violation aggregation ─────────────────────────────────────────────────────
const layerA = new Map();
const layerB = new Map();
let totalViolations = 0;
const scoringFailures = [];

const coverage = {};
function cov(driver) {
  return coverage[driver] || (coverage[driver] = { games: 0, launched: 0, pivot: 0, fired: 0, customers: 0, won: 0 });
}

function snapshot(s) {
  return {
    week: s.week, launched: !!s.launched, has_demo: !!s.has_demo,
    customers: s.customers, users: s.users, market_fit: Math.round(s.market_fit),
    signal: Math.round(s.signal), activities_pivot: !!s.activities_pivot,
    pivot_shipped: !!s.pivot_shipped, dev_plan: s.dev_plan || null,
  };
}
const clip = (str, n) => (str && str.length > n ? str.slice(0, n - 1) + "…" : str || "");

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
    body: clip(card.body, 110), state: snapshot(s) });
}

// Normalize either an openActions() entry or a thread message into a checkable card.
function asCard(x) {
  return { id: x.nodeId || null, body: x.body || "", from: x.from || x.name || null };
}
function checkCardRules(raw, s, ctx) {
  const card = asCard(raw);
  if (!card.body) return;
  for (const rule of CARD_RULES) {
    if (card.id && ALLOW.has(card.id)) continue;
    if (!card.id && card.from && ALLOW_FROM.has(card.from)) continue;
    if (rule.test(card) && !rule.require(s)) recordB(rule, card, s, ctx);
  }
}

// ── one game ──────────────────────────────────────────────────────────────────
function playGame(seed, driver, trace) {
  const c = cov(driver); c.games++;
  const seen = { launched: false, pivot: false, fired: false, customers: false };

  const game = H.playGame(seed, driver, {
    weeks: WEEK_CAP,
    onWeekStart(g, offered) {
      const ctx = { seed, driver, week: g.s.week, surface: "offered" };
      for (const a of offered) checkCardRules(a, g.s, ctx);
      if (trace) {
        console.log(`\nWeek ${g.s.week}  ${JSON.stringify(snapshot(g.s))}`);
        for (const a of offered) console.log(`  node [${a.kind}] ${a.nodeId} «${clip(a.body, 80)}»`);
      }
      // A-layer + coverage each week boundary
      for (const inv of STATE_INVARIANTS) if (!inv.holds(g.s)) recordA(inv, g.s, { seed, driver, week: g.s.week });
      if (g.s.launched) seen.launched = true;
      if (g.s.activities_pivot) seen.pivot = true;
      if (g.s.jordan_resolved) seen.fired = true;
      if (g.s.customers > 0) seen.customers = true;
    },
    onNewMessages(g, msgs) {
      const ctx = { seed, driver, week: g.s.week, surface: "message" };
      for (const m of msgs) {
        checkCardRules(m, g.s, ctx);
        if (trace) console.log(`  msg  ${m.from}: «${clip(m.body, 80)}»`);
      }
    },
  });

  if (seen.launched) c.launched++;
  if (seen.pivot) c.pivot++;
  if (seen.fired) c.fired++;
  if (seen.customers) c.customers++;
  if (game.s.game_won) c.won++;

  // Endgame scorecard smoke check — whatever state the game ended in.
  try {
    const cats = Scoring.scoreGame(game);
    if (!Array.isArray(cats) || cats.length !== CATEGORY_COUNT) {
      scoringFailures.push({ seed, driver, why: `expected ${CATEGORY_COUNT} categories, got ${Array.isArray(cats) ? cats.length : "none"}` });
    } else for (const cat of cats) {
      const ok = cat.key && cat.label && cat.ref && cat.verdict !== undefined &&
        (cat.score === null || (typeof cat.score === "number" && cat.score >= 0 && cat.score <= 100));
      if (!ok) scoringFailures.push({ seed, driver, why: `malformed category ${cat.key || "?"} (score=${cat.score})` });
    }
  } catch (err) {
    scoringFailures.push({ seed, driver, why: `scoreGame threw: ${err.message}` });
  }
}

// ── reporting ─────────────────────────────────────────────────────────────────
function fmtFirst(f) {
  return `seed ${f.seed} · wk ${f.week} · ${f.driver}/${f.surface || "state"} · ${JSON.stringify(f.state)}`;
}
const realistic = e => (e.byDriver.decent || 0) + (e.byDriver.pivot || 0) > 0;
const fmtDrivers = e => Object.entries(e.byDriver).map(([d, n]) => `${d}:${n}`).join(" ");
const tag = e => realistic(e) ? "‹realistic›" : "‹fuzzer-only›";

function report(games, drivers, verbose) {
  console.log(`\nNarrative consistency (v2) — ${games} games × ${drivers.length} drivers (${drivers.join(", ")}), cap wk ${WEEK_CAP}`);
  console.log("‹realistic› = reached by decent/pivot play · ‹fuzzer-only› = only the random fuzzer hit it");

  console.log("\n── Coverage (states each driver actually reached) ──────────");
  console.log("  driver   games  launched  pivot  fired-jordan  customers   won");
  for (const d of drivers) {
    const c = cov(d); const p = n => `${Math.round((n / Math.max(1, c.games)) * 100)}%`.padStart(4);
    console.log(`  ${d.padEnd(8)} ${String(c.games).padStart(5)}   ${p(c.launched)}     ${p(c.pivot)}       ${p(c.fired)}         ${p(c.customers)}    ${p(c.won)}`);
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
  if (!layerB.size) console.log("  ok   no node or message contradicted its state");
  const rows = [...layerB.values()].sort((a, b) => (realistic(b) - realistic(a)) || (b.count - a.count));
  for (const e of rows) {
    const f = e.first;
    console.log(`  FAIL [${f.rule}] ${f.id} ${tag(e)}  needs ${f.need} — ${e.count} hit${e.count === 1 ? "" : "s"} [${fmtDrivers(e)}]`);
    console.log(`         «${f.body}»`);
    console.log(`         ${fmtFirst(f)}`);
  }

  if (verbose && totalViolations) {
    console.log("\n(— verbose: first example per group shown above; counts are total occurrences —)");
  }

  console.log("\n── Endgame scorecard (v2/scoring.js smoke check) ───────────");
  if (!scoringFailures.length) console.log(`  ok   scoreGame returned ${CATEGORY_COUNT} well-formed categories at every game end`);
  for (const f of scoringFailures.slice(0, 5)) console.log(`  FAIL seed ${f.seed} · ${f.driver} — ${f.why}`);
  if (scoringFailures.length > 5) console.log(`  … and ${scoringFailures.length - 5} more`);

  const realB = [...layerB.values()].filter(realistic).length;
  const realA = [...layerA.values()].filter(realistic).length;
  console.log(`\n${totalViolations ? "VIOLATIONS FOUND" : "ALL NARRATIVE CHECKS PASSED"} ` +
    `(${layerA.size} invariant group(s), ${layerB.size} card/message group(s); ` +
    `${realA + realB} reachable by realistic play; ${totalViolations} total occurrences)`);
  return realA + realB; // the CI bar: realistic-play violations must be 0
}

// ── CLI ───────────────────────────────────────────────────────────────────────
function main() {
  const argv = process.argv.slice(2);
  const has = f => argv.includes(f);
  const val = f => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };

  const seedArg = val("--seed");
  if (seedArg != null) {
    const driver = val("--driver") || "pivot";
    console.log(`Replay — seed ${seedArg}, driver ${driver}`);
    playGame(parseInt(seedArg, 10), driver, true);
    const realCount = report(1, [driver], true);
    process.exit(realCount || scoringFailures.length ? 1 : 0);
  }

  const games = parseInt(argv.find(a => /^\d+$/.test(a)) || DEFAULT_GAMES, 10);
  const drivers = val("--driver") ? [val("--driver")] : ["decent", "pivot", "random"];
  const verbose = has("--verbose");

  let seed = 1;
  for (const driver of drivers) {
    for (let i = 0; i < games; i++) playGame(seed++, driver, false);
  }
  // Exit code tracks the repo's stated bar: realistic-play violations at 0.
  // Fuzzer-only findings stay visible in the report but don't fail CI.
  const realCount = report(games, drivers, verbose);
  process.exit(realCount || scoringFailures.length ? 1 : 0);
}

main();
