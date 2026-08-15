// ─────────────────────────────────────────────────────────────────────────────
// v2/tests/transcript.js — READ the game instead of playing it.
//
// Every other tool in v2/tests/ prints statistics about runs. This one prints
// the run itself: a headless playthrough replayed in order as a screenplay —
// every message, in the order a player would have seen it, with the choice that
// was made, the choices that were passed over, the journal line it wrote, the
// beats that timed out unanswered, and the numbers moving underneath.
//
//   node v2/tests/transcript.js                        # seed 42, decent player
//   node v2/tests/transcript.js --seed 7 --driver pivot
//   node v2/tests/transcript.js --char alex            # one thread, in context
//   node v2/tests/transcript.js --compact              # one line per beat
//   node v2/tests/transcript.js --html run.html        # readable chat export
//   node v2/tests/transcript.js --sample --html book.html
//                                                      # N typical stories, bucketed
//
// See `--help` for the full flag list.
//
// Node-only (it reads v2/story/*.js off disk to map node ids back to their
// source file). No DOM, no engine changes: it drives the shared harness and
// reads the engine's own transcript state (threads, log, ledger, resolved).
// ─────────────────────────────────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
const H = require("./harness.js");
const { scoreGame } = require("../scoring.js");

// ── node id → story file, so a beat you dislike is one grep away ─────────────
let SRC = null;
function sourceOf(nodeId) {
  if (!SRC) {
    SRC = new Map();
    const dir = path.join(__dirname, "..", "story");
    for (const f of fs.readdirSync(dir).filter(n => n.endsWith(".js"))) {
      const body = fs.readFileSync(path.join(dir, f), "utf8");
      const lines = body.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const m = /^\s*id:\s*"([A-Za-z0-9_]+)"/.exec(lines[i]);
        if (m && !SRC.has(m[1])) SRC.set(m[1], f + ":" + (i + 1));
      }
    }
  }
  return SRC.get(nodeId) || null;
}

// ── the spine: the handful of calls that decide what kind of story this is ───
// Used to fingerprint a run so `--sample` can bucket many playthroughs into
// "typical stories" instead of dumping fifty near-identical transcripts.
const SPINE = [
  ["equity_signing", "equity"], ["equity_impasse", "split"], ["dev_plan", "scope"],
  ["good_enough_launch", "launch"], ["launch_surface", "splash"],
  ["feature_spree", "features"], ["pivot_day_decide", "verdict"],
  ["pivot_day_evidence", "evidence"], ["pivot_relaunch", "relaunch"],
  ["jordan_confrontation", "jordan"], ["channel_test", "channel"],
  ["app_q_learned", "app_learned"], ["app_send", "app"],
];

function endingOf(g) {
  const s = g.s;
  if (s.game_won || s.ycAccepted) return "accepted";
  if (s.ycRejected) return "rejected";
  if (s.cash <= 0) return "bankrupt";
  if (s.deadline_passed) return "never applied";
  return "unresolved";
}

// ── record one playthrough as an ordered event stream ────────────────────────
function record(seed, driverName, opts) {
  opts = opts || {};
  const resolved = H.strategyOpts(driverName, seed);
  const base = H.makeChooser(resolved.driver, seed);

  const acts = [];          // one per answered beat
  const chapterEvents = []; // {seq, chapter}
  const sceneEvents = [];   // {seq, scene|null} — real engine enter/exit, not message tags
  const weekStats = new Map();
  const marks = [];         // {logLen, seq} checkpoints, to place timeouts
  let pendingSeq = 0, pendingChapter = 1, lastChapter = 1, pendingScene = null;
  let game = null;

  const snap = (g) => ({
    week: g.s.week, cash: Math.round(g.s.cash), runway: g.runwayWeeks,
    users: Math.round(g.s.users), customers: Math.round(g.s.customers),
    waitlist: Math.round(g.s.waitlist), revenue: Math.round(g.s.revenue),
    fit: Math.round(g.s.market_fit), signal: Math.round(g.s.signal),
    chapter: g.chapter,
  });

  const chooser = (a, g) => {
    game = g; pendingSeq = g._seq; pendingChapter = g.chapter;
    pendingScene = g.scene ? g.scene.id : null;
    return base(a, g);
  };

  const game_ = H.playGame(seed, chooser, {
    weeks: opts.weeks != null ? opts.weeks : 60,
    subsidy: opts.subsidy,
    priority: resolved.priority,
    onWeekStart(g, offered) {
      game = g;
      if (!weekStats.has(g.s.week)) weekStats.set(g.s.week, snap(g));
      if (g.chapter !== lastChapter) {
        chapterEvents.push({ seq: g._seq - 0.75, chapter: g.chapter });
        lastChapter = g.chapter;
      }
      marks.push({ logLen: g.log.length, seq: g._seq });
      // what the founder had on the table but did not (yet) touch this week
      weekStats.get(g.s.week).offered = offered
        .filter(a => !a.onHold)
        .map(a => ({ nodeId: a.nodeId, name: a.name, kind: a.kind }));
    },
    onAct(g, a, key) {
      const chosen = a.options.find(o => o.key === key);
      acts.push({
        seq: pendingSeq + 0.5, week: g.s.week, charId: a.charId, nodeId: a.nodeId,
        name: a.name, kind: a.kind, scene: a.scene,
        key, label: chosen ? chosen.label : key,
        alts: a.options.filter(o => o.key !== key).map(o => ({ key: o.key, label: o.label })),
      });
      // the war-room opens and closes on an answer — record the real transition
      const nowScene = g.scene ? g.scene.id : null;
      if (nowScene !== pendingScene) sceneEvents.push({ seq: pendingSeq + 0.6, scene: nowScene });
      if (g.chapter !== pendingChapter) {
        chapterEvents.push({ seq: g._seq + 0.25, chapter: g.chapter });
        lastChapter = g.chapter;
      }
      marks.push({ logLen: g.log.length, seq: g._seq });
    },
  });
  game = game_;

  // ── merge every thread into one stream, in the order it happened ──────────
  const events = [];
  for (const charId of game.order) {
    for (const m of game.threads[charId]) {
      events.push({
        t: m.type === "outcome" ? "journal" : m.type, // incoming | reply | journal | stamp
        seq: m.seq, week: m.week, charId,
        // a journal line lives on the founder thread but belongs to whoever caused it
        owner: m.type === "outcome" ? (m.sourceChar || "founder") : charId,
        from: m.from || null, body: m.body || null, subtext: m.subtext || null,
        nodeId: m.nodeId || null, scene: m.scene || null,
        label: m.label || null, stampClass: m.stampClass || null,
      });
    }
  }
  for (const a of acts) events.push({ t: "act", ...a, owner: a.charId });
  events.push({ t: "chapter", seq: -1, chapter: 1 });
  for (const c of chapterEvents) events.push({ t: "chapter", seq: c.seq, chapter: c.chapter });
  for (const sv of sceneEvents) events.push({ t: "sceneMark", seq: sv.seq, scene: sv.scene });

  // timeouts: the log knows the week, the checkpoints put it back on the timeline
  marks.push({ logLen: game.log.length, seq: game._seq });
  game.log.forEach((l, i) => {
    if (!l.ignored) return;
    const mk = marks.find(m => m.logLen > i);
    const ch = game.cast.get(l.charId);
    events.push({
      t: "ignored", seq: (mk ? mk.seq : game._seq) - 0.6, week: l.week,
      charId: l.charId, owner: l.charId, nodeId: l.ignored,
      name: ch ? ch.def.name : l.charId,
    });
  });

  events.sort((a, b) => a.seq - b.seq);

  const spine = {};
  for (const [id, key] of SPINE) { const o = game.outcome(id); if (o) spine[key] = o; }

  return {
    seed, driver: driverName, events,
    weekStats: [...weekStats.values()].sort((a, b) => a.week - b.week),
    cast: game.order.map(id => ({ id, name: game.cast.get(id).def.name, role: game.cast.get(id).def.role || "" })),
    ledger: game.ledger,
    ending: endingOf(game), spine,
    blurb: (H.STRATEGIES[driverName] || {}).blurb || null,
    grade: game.gradeScore(),
    report: scoreGame(game),
    final: snap(game),
    counts: {
      answered: acts.length,
      ignored: game.log.filter(l => l.ignored).length,
      surfaced: new Set(game.log.filter(l => l.surfaced).map(l => l.surfaced)).size,
    },
  };
}

// ── text rendering ───────────────────────────────────────────────────────────
const C = {
  on: false,
  d(s) { return this.on ? "\x1b[2m" + s + "\x1b[0m" : s; },
  b(s) { return this.on ? "\x1b[1m" + s + "\x1b[0m" : s; },
  y(s) { return this.on ? "\x1b[33m" + s + "\x1b[0m" : s; },
  c(s) { return this.on ? "\x1b[36m" + s + "\x1b[0m" : s; },
  g(s) { return this.on ? "\x1b[32m" + s + "\x1b[0m" : s; },
  m(s) { return this.on ? "\x1b[35m" + s + "\x1b[0m" : s; },
};

function wrap(text, width, indent) {
  const out = [];
  for (const para of String(text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      if (line && (line + " " + word).length > width) { out.push(indent + line); line = word; }
      else line = line ? line + " " + word : word;
    }
    out.push(indent + line);
  }
  return out.join("\n");
}

const clip = (s, n) => {
  const one = String(s).replace(/\s+/g, " ").trim();
  return one.length <= n ? one : one.slice(0, Math.max(0, n - 1)) + "…";
};

function statLine(st) {
  const bits = [
    "$" + st.cash.toLocaleString(), st.runway + "w runway",
    "users " + st.users, "fit " + st.fit, "signal " + st.signal,
  ];
  if (st.waitlist) bits.splice(3, 0, "waitlist " + st.waitlist);
  if (st.customers) bits.push("customers " + st.customers);
  if (st.revenue) bits.push("$" + st.revenue + " MRR");
  return bits.join(" · ");
}

const CHAPTER_NAMES = {
  1: "Ship the demo", 2: "Get to launch", 3: "The trough of sorrow",
  4: "Rebuild as v2", 5: "Ace the application",
};

function renderText(run, o) {
  const W = o.width || 78;
  const L = [];
  const nameOf = {};
  for (const c of run.cast) nameOf[c.id] = c.name;

  L.push("═".repeat(W));
  L.push(C.b(`  seed ${run.seed} · ${run.driver} player · ends ${run.ending.toUpperCase()}` +
    (run.grade != null ? ` · grade ${run.grade}` : "")));
  const sp = Object.entries(run.spine).map(([k, v]) => `${k}=${v}`).join("  ");
  if (sp) L.push(C.d(wrap(sp, W - 4, "  ")));
  L.push("═".repeat(W));

  let week = null, scene = null, lastSpeaker = null;
  const statsByWeek = new Map(run.weekStats.map(s => [s.week, s]));

  for (const e of run.events) {
    if (o.char && e.owner !== o.char && e.t !== "chapter") continue;
    if (o.hideAmbient && (e.kind === "ambient" || e.kind === "filler")) continue;

    if (e.week != null && e.week !== week) {
      week = e.week;
      const st = statsByWeek.get(week);
      L.push("");
      L.push(C.c("━━ WEEK " + week + " " + "━".repeat(Math.max(0, W - 10 - String(week).length))));
      if (st) L.push(C.d("   " + statLine(st)));
      lastSpeaker = null;
    }

    if (e.t === "chapter") {
      L.push("");
      L.push(C.m(`   ▐ CHAPTER ${e.chapter} · ${CHAPTER_NAMES[e.chapter] || ""}`));
      lastSpeaker = null;
      continue;
    }

    if (e.t === "sceneMark") {
      if (scene) L.push(C.y("   ╰── end of scene · " + scene));
      if (e.scene) L.push(C.y("   ╭── SCENE · " + e.scene + " " + "─".repeat(Math.max(0, W - 19 - e.scene.length))));
      scene = e.scene;
      lastSpeaker = null;
      continue;
    }

    if (e.t === "incoming") {
      const who = (e.from || nameOf[e.charId] || e.charId).toUpperCase();
      if (o.compact) { L.push("  " + C.b(who.padEnd(14).slice(0, 14)) + " " + clip(e.body, W - 20)); continue; }
      if (who !== lastSpeaker) { L.push(""); L.push("  " + C.b(who) + (o.src && e.nodeId ? C.d("   " + (sourceOf(e.nodeId) || e.nodeId)) : "")); }
      lastSpeaker = who;
      L.push(wrap('"' + e.body + '"', W - 6, "    "));
      if (e.subtext) L.push(C.d(wrap("(" + e.subtext + ")", W - 6, "    ")));
    } else if (e.t === "reply") {
      if (o.compact) continue; // the act line already carries the decision
      L.push(C.g(wrap(`↳ you → ${nameOf[e.charId] || e.charId}: ` + e.body, W - 8, "      ")));
      lastSpeaker = null;
    } else if (e.t === "act") {
      if (o.compact) {
        L.push(C.g(`  ▸ ${(e.name + ":").padEnd(14).slice(0, 14)} ${clip(e.label, W - 34)} `) +
          C.d(`[${e.nodeId}:${e.key}]`));
      } else {
        L.push(C.d(wrap(`▸ ${e.name}: chose “${e.label}” [${e.key}]`, W - 8, "      ")));
        if (!o.noAlts && e.alts.length) {
          L.push(C.d(wrap("passed: " + e.alts.map(a => `“${a.label}” [${a.key}]`).join(" · "), W - 12, "        ")));
        }
      }
      lastSpeaker = null;
    } else if (e.t === "journal") {
      if (o.compact) continue;
      L.push(C.y(wrap("📓 " + e.body, W - 6, "    ")));
      lastSpeaker = null;
    } else if (e.t === "stamp") {
      L.push(C.m("    ★ " + (e.label || "").toUpperCase()));
      lastSpeaker = null;
    } else if (e.t === "ignored") {
      L.push(C.d(`    ⌛ left on read — ${e.name}: ${e.nodeId}` + (o.src ? " (" + (sourceOf(e.nodeId) || "?") + ")" : "")));
      lastSpeaker = null;
    }
  }
  if (scene) L.push(C.y("   ╰── end of scene: " + scene));

  L.push("");
  L.push("═".repeat(W));
  L.push(C.b("  ENDING: " + run.ending.toUpperCase()) + "   " + C.d(statLine(run.final)));
  L.push(C.d(`  ${run.counts.answered} beats answered · ${run.counts.ignored} left on read · ${run.counts.surfaced} distinct beats surfaced`));
  L.push("");
  for (const cat of run.report) {
    const sc = cat.score == null ? " — " : String(cat.score).padStart(3);
    L.push(`  ${sc}  ${cat.label}`);
    L.push(C.d(wrap(cat.verdict, W - 8, "       ")));
  }
  L.push("═".repeat(W));
  return L.join("\n");
}

// ── HTML rendering: the run as a readable chat log ───────────────────────────
const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function runHtml(run, idx) {
  const nameOf = {};
  for (const c of run.cast) nameOf[c.id] = c.name;
  const statsByWeek = new Map(run.weekStats.map(s => [s.week, s]));
  const parts = [];
  let week = null, scene = null;

  for (const e of run.events) {
    const cls = `own-${esc(e.owner || e.charId || "")}`;
    if (e.week != null && e.week !== week) {
      if (scene) { parts.push("</div>"); scene = null; }
      week = e.week;
      const st = statsByWeek.get(week);
      parts.push(`<div class="wk" id="r${idx}w${week}"><b>Week ${week}</b>${st ? `<span>${esc(statLine(st))}</span>` : ""}</div>`);
    }
    if (e.t === "chapter") {
      if (scene) { parts.push("</div>"); scene = null; }
      parts.push(`<div class="chap" id="r${idx}c${e.chapter}">Chapter ${e.chapter} · ${esc(CHAPTER_NAMES[e.chapter] || "")}</div>`);
      continue;
    }
    if (e.t === "sceneMark") {
      if (scene) parts.push("</div>");
      if (e.scene) parts.push(`<div class="scene"><div class="scene-h">scene · ${esc(e.scene)}</div>`);
      scene = e.scene;
      continue;
    }
    const kindAttr = e.kind ? ` data-kind="${esc(e.kind)}"` : "";
    if (e.t === "incoming") {
      parts.push(`<div class="row in ${cls}"${kindAttr}><div class="av">${esc((e.from || nameOf[e.charId] || "?").slice(0, 1))}</div>` +
        `<div><div class="who">${esc(e.from || nameOf[e.charId])}${e.nodeId ? `<code title="${esc(sourceOf(e.nodeId) || "")}">${esc(e.nodeId)}</code>` : ""}</div>` +
        `<div class="bub">${esc(e.body)}</div>${e.subtext ? `<div class="sub">${esc(e.subtext)}</div>` : ""}</div></div>`);
    } else if (e.t === "reply") {
      parts.push(`<div class="row out ${cls}"><div><div class="who to">to ${esc(nameOf[e.charId] || e.charId)}</div>` +
        `<div class="bub me">${esc(e.body)}</div></div></div>`);
    } else if (e.t === "act") {
      const alts = e.alts.map(a => `<span class="alt">${esc(a.label)}</span>`).join("");
      parts.push(`<div class="choice ${cls}"><b>${esc(e.name)}:</b> ${esc(e.label)} <code>${esc(e.key)}</code>` +
        (alts ? `<div class="alts">passed over: ${alts}</div>` : "") + `</div>`);
    } else if (e.t === "journal") {
      parts.push(`<div class="jr ${cls}">${esc(e.body)}</div>`);
    } else if (e.t === "stamp") {
      parts.push(`<div class="stamp">${esc(e.label)}</div>`);
    } else if (e.t === "ignored") {
      parts.push(`<div class="ign ${cls}">left on read — ${esc(e.name)}: <code>${esc(e.nodeId)}</code></div>`);
    }
  }
  if (scene) parts.push("</div>");

  const report = run.report.map(c =>
    `<li><b>${c.score == null ? "—" : c.score}</b> ${esc(c.label)}<div>${esc(c.verdict)}</div></li>`).join("");
  // the index: every week, with the chapter it opened folded in above it
  const chapAt = new Map();
  {
    let wk = null;
    for (const e of run.events) {
      if (e.week != null) wk = e.week;
      if (e.t === "chapter" && !chapAt.has(e.chapter)) chapAt.set(e.chapter, wk == null ? 1 : wk);
    }
  }
  const chapByWeek = new Map();
  for (const [ch, wk] of chapAt) if (!chapByWeek.has(wk)) chapByWeek.set(wk, ch);
  const weeks = run.weekStats.map(s =>
    (chapByWeek.has(s.week) ? `<a class="ch" href="#r${idx}c${chapByWeek.get(s.week)}">ch ${chapByWeek.get(s.week)}</a>` : "") +
    `<a href="#r${idx}w${s.week}">wk ${s.week}</a>`).join("");
  const spine = Object.entries(run.spine).map(([k, v]) => `<span class="chip">${esc(k)}: ${esc(v)}</span>`).join("");

  return `<section class="run" data-run="${idx}">
  <div class="runhead">
    <h2>seed ${run.seed} · ${esc(run.driver)} player</h2>
    <p class="verdict ${esc(run.ending.replace(/\s/g, "-"))}">${esc(run.ending)}${run.grade != null ? ` · grade ${run.grade}` : ""}</p>
    <div class="spine">${spine}</div>
  </div>
  <div class="cols">
    <nav class="idx">${weeks}</nav>
    <div class="log">${parts.join("\n")}</div>
  </div>
  <div class="card"><h3>Report card</h3><ul class="report">${report}</ul></div>
</section>`;
}

function renderHtml(runs, title) {
  const picker = runs.length > 1
    ? `<div class="picker">${runs.map((r, i) =>
      `<button data-go="${i}" class="${i ? "" : "on"}">${esc(r.label || ("seed " + r.seed))} <em>${esc(r.ending)}</em></button>`).join("")}</div>`
    : "";
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root { --bg:#f2f2f7; --panel:#fff; --line:#e3e3e8; --ink:#1c1c1e; --dim:#8e8e93; --blue:#0a84ff; }
  * { box-sizing:border-box; margin:0; }
  body { font:15px/1.5 -apple-system,"Segoe UI",Helvetica,Arial,sans-serif; background:var(--bg); color:var(--ink); }
  header { position:sticky; top:0; z-index:5; background:var(--panel); border-bottom:1px solid var(--line); padding:10px 18px; }
  header h1 { font-size:16px; }
  .picker { display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; }
  .picker button { border:1px solid var(--line); background:#fafafa; border-radius:20px; padding:4px 12px; font-size:12.5px; cursor:pointer; }
  .picker button.on { background:var(--blue); color:#fff; border-color:var(--blue); }
  .picker em { opacity:.7; font-style:normal; }
  .filters { display:flex; gap:14px; flex-wrap:wrap; margin-top:8px; font-size:12.5px; color:var(--dim); }
  main { max-width:1080px; margin:0 auto; padding:18px; }
  .run { display:none; } .run.on { display:block; }
  .runhead { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:14px 18px; margin-bottom:14px; }
  .verdict { font-weight:700; margin-top:2px; }
  .verdict.accepted { color:#1d8f3c; } .verdict.rejected,.verdict.bankrupt,.verdict.never-applied { color:#c0392b; }
  .spine { margin-top:8px; display:flex; gap:6px; flex-wrap:wrap; }
  .chip { background:#eef4ff; color:#2456c4; border-radius:12px; padding:2px 9px; font-size:11.5px; }
  .cols { display:flex; gap:16px; align-items:flex-start; }
  .idx { position:sticky; top:96px; width:88px; flex:none; display:flex; flex-direction:column; gap:2px; max-height:80vh; overflow:auto; }
  .idx a { color:var(--dim); text-decoration:none; font-size:12px; padding:2px 6px; border-radius:6px; }
  .idx a:hover { background:#fff; color:var(--ink); }
  .idx a.ch { color:#7b3fb5; font-weight:700; margin-top:6px; text-transform:uppercase; font-size:11px; }
  .log > .wk:first-child { margin-top:0; border-top:0; padding-top:0; }
  .log > .chap:first-child { margin-top:0; }
  .log { flex:1; min-width:0; background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:16px 20px; }
  .wk { display:flex; justify-content:space-between; gap:10px; align-items:baseline; border-top:1px solid var(--line); margin:22px -20px 10px; padding:10px 20px 0; font-size:12.5px; color:var(--dim); }
  .wk b { color:var(--ink); font-size:13px; }
  .chap { margin:18px 0 10px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; font-size:12px; color:#7b3fb5; border-left:3px solid #7b3fb5; padding-left:9px; }
  .scene { border:1px dashed #e0a96d; background:#fffaf3; border-radius:12px; padding:10px 14px; margin:12px 0; }
  .scene-h { color:#b25000; font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; margin-bottom:6px; }
  .row { display:flex; gap:9px; margin:8px 0; }
  .row.out { justify-content:flex-end; }
  .av { width:28px; height:28px; border-radius:50%; background:#c7c7cc; color:#fff; font-weight:700; font-size:13px; display:flex; align-items:center; justify-content:center; flex:none; }
  .who { font-size:11.5px; color:var(--dim); margin-bottom:2px; display:flex; gap:6px; align-items:center; }
  .who code { font-size:10.5px; background:#f4f4f6; border-radius:4px; padding:0 4px; display:none; }
  .who.to { justify-content:flex-end; }
  body.ids .who code { display:inline; }
  .bub { background:#e9e9eb; border-radius:16px; border-bottom-left-radius:5px; padding:8px 13px; max-width:62ch; white-space:pre-wrap; }
  .bub.me { background:var(--blue); color:#fff; border-bottom-left-radius:16px; border-bottom-right-radius:5px; }
  .sub { font-size:12px; color:var(--dim); margin:3px 0 0 6px; }
  .choice { margin:2px 0 10px 37px; font-size:12.5px; color:#2456c4; }
  .choice code { background:#eef4ff; border-radius:4px; padding:0 4px; font-size:11px; }
  .alts { color:var(--dim); margin-top:2px; }
  .alt { display:inline-block; border:1px solid var(--line); border-radius:10px; padding:0 7px; margin:2px 4px 0 0; font-size:11.5px; }
  .jr { background:#fffbe8; border:1px solid #f0e6b8; color:#5b5340; border-radius:10px; padding:8px 13px; margin:8px 0 8px 37px; font-size:13.5px; }
  body.nojr .jr { display:none; }
  .stamp { text-align:center; margin:12px 0; font-weight:800; letter-spacing:.08em; text-transform:uppercase; font-size:11.5px; color:#1d8f3c; }
  .ign { margin:6px 0 6px 37px; font-size:12px; color:#b0442f; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:14px 18px; margin-top:16px; }
  .report { list-style:none; margin-top:8px; }
  .report li { border-top:1px solid var(--line); padding:8px 0; font-size:13.5px; }
  .report li b { display:inline-block; min-width:34px; }
  .report li div { color:var(--dim); font-size:12.5px; margin-left:34px; }
  body.noamb [data-kind="ambient"], body.noamb [data-kind="filler"] { display:none; }
</style></head><body class="ids">
<header>
  <h1>${esc(title)}</h1>
  ${picker}
  <div class="filters">
    <label><input type="checkbox" id="fIds" checked> node ids</label>
    <label><input type="checkbox" id="fJr" checked> journal lines</label>
    <label><input type="checkbox" id="fAmb" checked> ambient / filler</label>
  </div>
</header>
<main>${runs.map((r, i) => runHtml(r, i)).join("\n")}</main>
<script>
  const runs = [...document.querySelectorAll(".run")];
  const show = (i) => {
    runs.forEach((r, j) => r.classList.toggle("on", i === j));
    document.querySelectorAll(".picker button").forEach((b, j) => b.classList.toggle("on", i === j));
    window.scrollTo(0, 0);
  };
  document.querySelectorAll(".picker button").forEach(b => b.onclick = () => show(+b.dataset.go));
  show(0);
  fIds.onchange = () => document.body.classList.toggle("ids", fIds.checked);
  fJr.onchange = () => document.body.classList.toggle("nojr", !fJr.checked);
  fAmb.onchange = () => document.body.classList.toggle("noamb", !fAmb.checked);
</script></body></html>`;
}

// ── `--sample`: the typical stories, one per player archetype ────────────────
// The 13 archetypes in harness.js are the founders worth reading: the good one,
// the builder who never talks to a user, the one who refuses the pivot, the one
// who keeps a dead co-founder on the cap table. For the archetypes whose story
// varies by seed (random, distracted, builder, marketer), it plays a small
// cohort and picks the run closest to that archetype's MEDIAN grade — so what
// you read is representative, not the luckiest or unluckiest draw.
const VARIES = new Set(["random", "distracted", "builder", "marketer"]);

function sample(opts) {
  opts = opts || {};
  const n = opts.n || 9;
  const names = opts.only && opts.only.length ? opts.only : Object.keys(H.STRATEGIES);
  const out = [];
  for (const name of names) {
    const seeds = VARIES.has(name) ? Array.from({ length: n }, (_, i) => 1000 + i) : [opts.seed || 42];
    const runs = seeds.map(s => record(s, name, { weeks: opts.weeks }));
    const sorted = [...runs].sort((a, b) => (a.grade || 0) - (b.grade || 0));
    const pick = sorted[Math.floor(sorted.length / 2)]; // the median story
    const endings = {};
    for (const r of runs) endings[r.ending] = (endings[r.ending] || 0) + 1;
    out.push({ name, run: pick, n: runs.length, endings, blurb: H.STRATEGIES[name].blurb });
  }
  return out;
}

function sampleTable(list) {
  const L = [`Player archetypes — ${list.length} founders, one representative run each\n`];
  for (const b of list) {
    const mix = Object.entries(b.endings).sort((x, y) => y[1] - x[1])
      .map(([k, v]) => b.n > 1 ? `${k} ${Math.round((v / b.n) * 100)}%` : k).join(", ");
    L.push(`  ${C.b(b.name.padEnd(13))} ${String(b.run.grade == null ? "—" : b.run.grade).padStart(3)}  ${mix}`);
    L.push(C.d(`                ${b.blurb}`));
    const sp = Object.entries(b.run.spine).map(([k, v]) => `${k}=${v}`).join("  ");
    L.push(C.d(wrap(sp || "(never reached a spine decision)", 74, "                ")));
    L.push("");
  }
  return L.join("\n");
}

// ── `--audit`: narrative smells you can only see by reading many runs ────────
// Not a pass/fail suite (that's test_narrative.js) — a list of things a writer
// would want to look at: prose nobody ever reads, branches nobody ever takes,
// messages that land after the story is over, and weeks where nobody speaks.
function audit(opts) {
  opts = opts || {};
  const names = opts.only && opts.only.length ? opts.only : Object.keys(H.STRATEGIES);
  const seeds = opts.n ? Array.from({ length: opts.n }, (_, i) => 1000 + i) : [42, 1000, 1001];

  const inventory = new H.Game({ seed: 1 });
  const allNodes = [...inventory.nodes.keys()];
  const allChoices = new Set();
  for (const [id, node] of inventory.nodes) {
    for (const c of node.choices || []) allChoices.add(id + ":" + c.key);
  }

  const surfaced = new Set(), taken = new Set();
  const tails = new Map();   // nodeId -> times it landed after the last action
  const silent = [];         // {driver, seed, week}
  const dupJournal = new Map();

  for (const name of names) {
    for (const seed of seeds) {
      const run = record(seed, name, { weeks: opts.weeks });
      const lastActSeq = run.events.filter(e => e.t === "act").reduce((m, e) => Math.max(m, e.seq), -1);
      const weeksWithTalk = new Set();
      const journalSeen = new Set();
      for (const e of run.events) {
        if (e.t === "incoming") {
          if (e.nodeId) surfaced.add(e.nodeId);
          weeksWithTalk.add(e.week);
          if (e.seq > lastActSeq && e.nodeId) tails.set(e.nodeId, (tails.get(e.nodeId) || 0) + 1);
        } else if (e.t === "act") {
          taken.add(e.nodeId + ":" + e.key);
        } else if (e.t === "journal" && e.body) {
          if (journalSeen.has(e.body)) {
            const k = e.body.slice(0, 90);
            dupJournal.set(k, (dupJournal.get(k) || 0) + 1);
          }
          journalSeen.add(e.body);
        } else if (e.t === "ignored") {
          taken.add(e.nodeId + ":@ignored");
        }
      }
      for (const st of run.weekStats) if (!weeksWithTalk.has(st.week)) silent.push({ name, seed, week: st.week });
    }
  }

  return {
    runs: names.length * seeds.length,
    deadNodes: allNodes.filter(id => !surfaced.has(id)),
    deadChoices: [...allChoices].filter(k => !taken.has(k) && surfaced.has(k.split(":")[0])),
    tails: [...tails.entries()].sort((a, b) => b[1] - a[1]),
    silent, dupJournal: [...dupJournal.entries()].sort((a, b) => b[1] - a[1]),
    totals: { nodes: allNodes.length, choices: allChoices.size, surfaced: surfaced.size },
  };
}

function auditReport(a) {
  const L = [];
  L.push(`Narrative audit — ${a.runs} runs across the archetypes\n`);
  L.push(`  ${a.totals.surfaced}/${a.totals.nodes} nodes surfaced at least once\n`);

  L.push(C.b(`  ✕ never surfaced in any run (${a.deadNodes.length})`));
  L.push(C.d("    prose no player has ever seen — either unreachable, or gated behind a path"));
  L.push(C.d("    none of these founders walks"));
  for (const id of a.deadNodes) L.push(`      ${id.padEnd(28)} ${C.d(sourceOf(id) || "")}`);

  L.push("");
  L.push(C.b(`  ✕ options never chosen (${a.deadChoices.length})`));
  L.push(C.d("    offered to a player and never taken. NOTE: every archetype answers through"));
  L.push(C.d("    harness.js's one PREF table, so this is mostly a gap in the DRIVERS, not"));
  L.push(C.d("    proof of dead prose — it's the list of branches no automated run exercises."));
  for (const k of a.deadChoices) L.push(`      ${k}`);

  L.push("");
  L.push(C.b(`  ⌛ arrives after the last possible action (${a.tails.length})`));
  L.push(C.d("    the run is over — these land in a thread the player can never answer"));
  for (const [id, n] of a.tails) L.push(`      ${id.padEnd(28)} ${n}× ${C.d(sourceOf(id) || "")}`);

  L.push("");
  L.push(C.b(`  ␣ weeks where nobody said anything (${a.silent.length})`));
  if (a.silent.length) {
    const by = {};
    for (const s of a.silent) (by[s.name] = by[s.name] || []).push(s.week);
    for (const k of Object.keys(by)) L.push(`      ${k.padEnd(14)} wk ${[...new Set(by[k])].sort((x, y) => x - y).join(", ")}`);
  }

  L.push("");
  L.push(C.b(`  ⧉ journal lines repeated verbatim inside one run (${a.dupJournal.length})`));
  for (const [body, n] of a.dupJournal.slice(0, 15)) L.push(`      ${n}×  ${clip(body, 66)}`);
  return L.join("\n");
}

// ── CLI ──────────────────────────────────────────────────────────────────────
function main(argv) {
  const o = { seed: 42, driver: "decent", width: 78 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") return console.log(HELP);
    else if (a === "--seed") o.seed = +argv[++i];
    else if (a === "--driver") o.driver = argv[++i];
    else if (a === "--weeks") o.weeks = +argv[++i];
    else if (a === "--char") o.char = argv[++i];
    else if (a === "--width") o.width = +argv[++i];
    else if (a === "--html") o.html = argv[++i];
    else if (a === "--out") o.out = argv[++i];
    else if (a === "--compact") o.compact = true;
    else if (a === "--no-alts") o.noAlts = true;
    else if (a === "--no-ambient") o.hideAmbient = true;
    else if (a === "--src") o.src = true;
    else if (a === "--color") o.color = true;
    else if (a === "--sample") o.sample = true;
    else if (a === "--audit") o.audit = true;
    else if (a === "--only") o.only = argv[++i].split(",");
    else if (a === "--n") o.n = +argv[++i];
    else if (a === "--list") { console.log(Object.entries(H.STRATEGIES).map(([k, v]) => `  ${k.padEnd(14)} ${v.blurb}`).join("\n")); return; }
    else return console.log("unknown flag: " + a + "\n" + HELP);
  }
  C.on = !!o.color || (!o.html && !o.out && process.stdout.isTTY);

  const known = new Set([...Object.keys(H.STRATEGIES), "decent", "pivot", "random"]);
  for (const name of [o.driver, ...(o.only || [])]) {
    if (name && !known.has(name)) {
      console.log(`unknown player "${name}". Known archetypes:\n` +
        Object.entries(H.STRATEGIES).map(([k, v]) => `  ${k.padEnd(14)} ${v.blurb}`).join("\n") +
        `\n  (plus the raw drivers: decent, pivot, random)`);
      return;
    }
  }

  if (o.audit) {
    const rep = auditReport(audit({ only: o.only, n: o.n, weeks: o.weeks }));
    if (o.out) { fs.writeFileSync(o.out, rep); console.log("wrote " + o.out); }
    else console.log(rep);
    return;
  }

  if (o.sample) {
    const list = sample({ n: o.n, weeks: o.weeks, seed: o.seed, only: o.only });
    console.log(sampleTable(list));
    if (o.html) {
      const runs = list.map(b => ({ ...b.run, label: b.name }));
      fs.writeFileSync(o.html, renderHtml(runs, `Typical stories — ${runs.length} player archetypes`));
      console.log(`wrote ${o.html} (${runs.length} runs — use the buttons to switch founder)`);
    } else if (o.out) {
      fs.writeFileSync(o.out, list.map(b => renderText(b.run, o)).join("\n\n"));
      console.log(`wrote ${o.out}`);
    }
    return;
  }

  const run = record(o.seed, o.driver, { weeks: o.weeks });
  if (o.html) {
    fs.writeFileSync(o.html, renderHtml([run], `Run — seed ${run.seed} · ${run.driver}`));
    console.log(`wrote ${o.html}`);
    return;
  }
  const text = renderText(run, o);
  if (o.out) { fs.writeFileSync(o.out, text); console.log("wrote " + o.out); }
  else console.log(text);
}

const HELP = `
transcript.js — replay a headless run as a readable story.

  --seed N          RNG seed (default 42)
  --driver NAME     a player archetype (--list to see them) or a raw driver
                    (decent | pivot | random). Default: decent.
  --weeks N         week cap (default 60)
  --list            list the player archetypes and what each one does

  --char ID         only this character's beats (alex, jordan, priya, …)
  --no-ambient      drop ambient/filler beats
  --no-alts         hide the options that were passed over
  --compact         one line per beat instead of full prose
  --src             annotate each beat with story/<file>:<line>
  --width N         wrap column (default 78)
  --color           force ANSI color (default: on when a TTY)

  --html FILE       write a readable chat-log page instead of text
  --out FILE        write the text transcript to a file

  --sample          one representative run per player archetype — the
                    "typical stories". Add --html FILE for the readable book,
                    or --out FILE for all of them as text.
  --audit           narrative smells across every archetype: prose never seen,
                    options never taken, messages that land after the run is
                    over, silent weeks, repeated journal lines
  --only A,B        restrict --sample / --audit to these archetypes
  --n N             cohort size for the archetypes whose story varies by seed
                    (random, distracted, builder, marketer). Default 9.
`;

if (require.main === module) main(process.argv.slice(2));
module.exports = { record, renderText, renderHtml, sample, SPINE };
