"use strict";
// ─────────────────────────────────────────────────────────────────────────────
// v2/tests/test_scenes.js — scene permutation test (generalizes the old
// tests/test_launch_arc.js from one hand-coded arc to all four scene arcs).
//
// For each scene (equity, demo, launch, pivot): play a decent game up to the
// scene's entry beat, then explore the choice tree through the scene by
// replaying from seed with an incremental choice script (game state is not
// clonable, so each path replays). Every completed path must:
//   - exit the scene (game.scene === null) in ONE sitting — no nextWeek needed,
//   - never deadlock (scene active but nothing answerable for the cast),
//   - never surface the same beat twice.
//
// The launch scene's branch product is large, so exploration is capped: after
// CAP path-probes per scene, remaining open prefixes are closed greedily
// (first option), and RANDOM_PATHS extra fully-random walks add breadth.
//
// Usage:  node v2/tests/test_scenes.js [--verbose]
// ─────────────────────────────────────────────────────────────────────────────

const H = require("./harness.js");

const VERBOSE = process.argv.includes("--verbose");
const CAP = 800;           // max replays per scene during BFS
const RANDOM_PATHS = 40;   // extra seeded random walks per scene

const SCENES = [
  { id: "equity", entry: { node: "equity_open", keys: ["open"] }, seed: 42 },
  { id: "demo", entry: { node: "demo_ready", keys: ["rough", "polish"] }, seed: 42 },
  { id: "launch", entry: { node: "good_enough_launch", keys: ["ship"] }, seed: 42 },
  { id: "pivot", entry: { node: "pivot_summit_call", keys: ["call_it"] }, seed: 42 },
];

let failures = 0, checks = 0;
function ok(cond, label) {
  checks++;
  if (!cond) { failures++; console.log("  ✗ " + label); }
  else console.log("  ✓ " + label);
}

// Play one path through a scene. `mode.script` = fixed key list (stop with the
// current frontier when it runs out); `mode.rng` = pick randomly and never stop.
// Returns { status: "exited"|"frontier"|"deadlock"|"noentry", ... }.
function runPath(cfg, mode) {
  const g = H.jumpTo(cfg.entry.node, { seed: cfg.seed, subsidy: 600 });
  const isOpen = Object.values(g.open).some(o => o && o.nodeId === cfg.entry.node);
  if (!isOpen) return { status: "noentry", week: g.s.week };

  const entryWeek = g.s.week;
  let started = false, si = 0, acted = 0;
  const script = mode.script || null;

  for (let guard = 0; guard < 60; guard++) {
    if (started && !g.scene) {
      // Scene exited — verify one-sitting + no duplicate beats.
      const sceneSurfaced = g.log.filter(l =>
        l.surfaced && l.week === entryWeek && g.arcOf.get(l.surfaced) === g.arcs.get(cfg.id));
      const ids = sceneSurfaced.map(l => l.surfaced);
      const dup = ids.find((id, i) => ids.indexOf(id) !== i) || null;
      return {
        status: "exited", acted, beats: ids,
        sameWeek: g.s.week === entryWeek, dup,
      };
    }
    const acts = g.openActions().filter(a => !a.onHold);
    const relevant = acts.filter(a => a.nodeId === cfg.entry.node
      || g.arcOf.get(a.nodeId) === g.arcs.get(cfg.id));
    if (!relevant.length) {
      if (g.scene && g.scene.id === cfg.id) return { status: "deadlock", acted, week: g.s.week };
      if (!started) return { status: "noentry", week: g.s.week };
      continue; // scene just closed; loop re-checks the exit branch
    }
    const a = relevant[0];
    let offered = a.options.map(o => o.key);
    if (a.nodeId === cfg.entry.node && !started) {
      offered = offered.filter(k => cfg.entry.keys.includes(k)); // only scene-entering keys
    }
    let key;
    if (script) {
      if (si >= script.length) return { status: "frontier", frontier: offered, acted };
      key = script[si++];
      if (!offered.includes(key)) return { status: "badkey", key, offered, node: a.nodeId };
    } else {
      key = offered[Math.floor(mode.rng() * offered.length)];
    }
    g.act(a.nodeId, key);
    acted++;
    if (g.scene && g.scene.id === cfg.id) started = true;
  }
  return { status: "stuck-guard", acted };
}

function exploreScene(cfg) {
  console.log(`scene "${cfg.id}"`);
  const queue = [[]];
  let probes = 0, exitedPaths = 0, capped = false;
  let maxBeats = 0, dupFail = null, weekFail = null;
  const bad = [];

  while (queue.length) {
    const script = queue.shift();
    const res = runPath(cfg, { script });
    probes++;
    if (res.status === "frontier") {
      if (probes < CAP) {
        for (const k of res.frontier) queue.push([...script, k]);
      } else {
        capped = true;
        queue.push([...script, res.frontier[0]]); // greedy close-out past the cap
      }
    } else if (res.status === "exited") {
      exitedPaths++;
      maxBeats = Math.max(maxBeats, res.beats.length);
      if (res.dup && !dupFail) dupFail = { script, dup: res.dup };
      if (!res.sameWeek && !weekFail) weekFail = { script };
      if (VERBOSE) console.log(`    path [${script.join(",")}] → ${res.beats.length} beats`);
    } else {
      bad.push({ script, res });
    }
  }

  // Extra breadth: seeded random walks through the whole tree.
  for (let i = 0; i < RANDOM_PATHS; i++) {
    const res = runPath(cfg, { rng: H.mulberry32(1000 + i) });
    if (res.status === "exited") {
      exitedPaths++;
      if (res.dup && !dupFail) dupFail = { script: ["(random#" + i + ")"], dup: res.dup };
      if (!res.sameWeek && !weekFail) weekFail = { script: ["(random#" + i + ")"] };
    } else {
      bad.push({ script: ["(random#" + i + ")"], res });
    }
  }

  ok(exitedPaths > 0, `reached and entered the scene (${exitedPaths} completed paths${capped ? ", BFS capped" : ""}, ${probes} probes)`);
  ok(bad.length === 0, bad.length === 0
    ? "every path exited cleanly — no deadlocks, dead ends, or bad keys"
    : `${bad.length} bad path(s), first: [${bad[0].script.join(",")}] → ${bad[0].res.status}` +
      (bad[0].res.node ? ` at ${bad[0].res.node} (offered: ${(bad[0].res.offered || []).join("/")})` : ""));
  ok(!dupFail, dupFail ? `beat surfaced twice (${dupFail.dup}) on [${dupFail.script.join(",")}]` : "no beat surfaced twice on any path");
  ok(!weekFail, weekFail ? `scene spilled past its week on [${weekFail.script.join(",")}]` : `every path finished in one sitting (max ${maxBeats} beats)`);
}

for (const cfg of SCENES) exploreScene(cfg);

console.log(`\n${checks - failures}/${checks} checks passed` + (failures ? ` — ${failures} FAILED` : ""));
process.exit(failures ? 1 : 0);
