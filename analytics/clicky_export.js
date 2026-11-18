#!/usr/bin/env node
// Clicky exporter: pulls everything Clicky tracked for the game into CSV + raw
// JSON, for analysis outside Clicky (traffic sources, how far and how long
// people play).
//
//   CLICKY_SITEKEY=xxxx node analytics/clicky_export.js [--from 2026-10-01] [--to 2026-11-18]
//
// Options:
//   --site <id>       Clicky site ID (default 101301276, the one game.html loads)
//   --sitekey <key>   or CLICKY_SITEKEY env (Clicky → Preferences → Info → Site key)
//   --from / --to     YYYY-MM-DD, inclusive (default: the last 30 days, ending today)
//   --out <dir>       output directory (default analytics/out/<from>_<to>)
//   --no-actions      skip the per-action log (fewer API calls)
//   --base <url>      API base (default https://api.clicky.com/api/stats/4)
//   --offline         no API calls: rebuild the CSVs from a previous run's raw/ (same --from/--to/--out)
//
// Writes:
//   sessions.csv          one row per session: visitor UID, session ID, time, duration,
//                         referrer, UTM, campaign, country, device, goals, how far they got
//   visitors.csv          one row per visitor UID, rolled up over their sessions
//   goal_completions.csv  one row per goal completed: session, visitor, goal ID, goal name
//   goals_summary.csv     per goal: Clicky's count and conversion, plus unique sessions
//                         and visitors, and conversion over all / over engaged sessions
//   funnel.csv            sessions reaching each stage (intro → weeks → end)
//   engagement.csv        sessions per engagement bucket, with median duration
//   players.csv           new vs returning players (from the game's saved-game signal):
//                         sessions, how many played, finished, won, average grade
//   sources.csv           sessions, engaged sessions and median duration per referrer
//                         domain / UTM source / campaign / country / player type
//   actions.csv           every tracked action (pageviews, goals, clicks) with its time
//   report_<type>.csv     Clicky's own aggregate reports (referrers, countries, campaigns, …)
//   raw/*.json            every API response, unmodified
//
// Clicky only keeps visitor-level logs (visitors-list, actions-list) for as long
// as your plan's history allows; aggregate reports go back further. Clicky
// answers one request at a time per IP, so requests run sequentially.
"use strict";
const fs = require("fs");
const path = require("path");

// ── args ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = name => argv.includes("--" + name);
const opt = (name, dflt) => { const i = argv.indexOf("--" + name); return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt; };
if (flag("help") || flag("h")) {
  console.log(fs.readFileSync(__filename, "utf8").split("\n").slice(1, 33).map(l => l.replace(/^\/\/ ?/, "")).join("\n"));
  process.exit(0);
}
const SITE = opt("site", process.env.CLICKY_SITE_ID || "101301276");
const KEY = opt("sitekey", process.env.CLICKY_SITEKEY);
const BASE = opt("base", "https://api.clicky.com/api/stats/4");
const ymd = d => d.toISOString().slice(0, 10);
const today = new Date();
const TO = opt("to", ymd(today));
const FROM = opt("from", ymd(new Date(Date.parse(TO) - 29 * 864e5)));
const OUT = path.resolve(opt("out", path.join(__dirname, "out", FROM + "_" + TO)));
const WITH_ACTIONS = !flag("no-actions");
const OFFLINE = flag("offline");
if (!KEY && !OFFLINE) { console.error("Missing site key: set CLICKY_SITEKEY or pass --sitekey (Clicky → Preferences → Info)."); process.exit(1); }
if (!/^\d{4}-\d{2}-\d{2}$/.test(FROM) || !/^\d{4}-\d{2}-\d{2}$/.test(TO) || FROM > TO) { console.error("Bad --from/--to: " + FROM + " .. " + TO); process.exit(1); }
fs.mkdirSync(path.join(OUT, "raw"), { recursive: true });

// ── API ──────────────────────────────────────────────────────────────────────
let calls = 0;
async function api(params, rawName) {
  if (OFFLINE) {
    const f = path.join(OUT, "raw", rawName + ".json");
    if (!fs.existsSync(f)) throw Object.assign(new Error("not in raw/: " + rawName), { fatal: true });
    return JSON.parse(fs.readFileSync(f, "utf8"));
  }
  const q = new URLSearchParams({ site_id: SITE, sitekey: KEY, output: "json", ...params });
  for (let attempt = 1; ; attempt++) {
    calls++;
    try {
      const res = await fetch(BASE + "?" + q);
      const text = await res.text();
      if (!res.ok) throw new Error("HTTP " + res.status + ": " + text.slice(0, 200));
      const json = JSON.parse(text);
      const err = json.error || (Array.isArray(json) && json[0] && json[0].error);
      if (err) throw Object.assign(new Error("Clicky: " + err), { fatal: true });
      if (rawName) fs.writeFileSync(path.join(OUT, "raw", rawName + ".json"), JSON.stringify(json, null, 1));
      return json;
    } catch (e) {
      if (e.fatal || attempt >= 4) throw e;
      await new Promise(r => setTimeout(r, 1000 * attempt * attempt));
    }
  }
}
// Clicky JSON: [{ type, dates: [{ date, items: [...] }] }, ...] → { type: items[] }
function itemsByType(json) {
  const out = {};
  for (const block of [].concat(json || [])) {
    if (!block || !block.type) continue;
    out[block.type] = (out[block.type] || []).concat(...(block.dates || []).map(d => d.items || []));
  }
  return out;
}
const days = [];
for (let t = Date.parse(FROM); t <= Date.parse(TO); t += 864e5) days.push(ymd(new Date(t)));

// Visitor-level lists: one day at a time (Clicky caps their date range), 1000 a page.
async function listByDay(type, extra = {}) {
  const all = [];
  for (const day of days) {
    for (let page = 1; ; page++) {
      const json = await api({ type, date: day, limit: 1000, page, ...extra }, type + "_" + day + "_p" + page);
      const items = itemsByType(json)[type] || [];
      all.push(...items);
      process.stdout.write("\r  " + type + " " + day + "  " + all.length + " rows   ");
      if (items.length < 1000) break;
    }
  }
  process.stdout.write("\n");
  return all;
}

// ── helpers ──────────────────────────────────────────────────────────────────
const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
function utmFrom(...urls) {
  const out = {};
  for (const u of urls) {
    if (!u) continue;
    let qs;
    try { qs = new URL(u, "https://foundrs.com").searchParams; } catch (e) { continue; }
    for (const k of UTM) if (!out[k] && qs.get(k)) out[k] = qs.get(k);
    if (!out.utm_source && qs.get("ref")) out.utm_source = qs.get("ref");
  }
  return out;
}
const num = v => (v === undefined || v === null || v === "" ? null : Number(v));
const unix = v => { const n = num(v); return n && n > 1e9 ? n : null; };
const iso = t => (t ? new Date(t * 1000).toISOString().replace(".000Z", "Z") : "");
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (n, d) => (d ? Math.round(1e4 * n / d) / 100 : 0);
function csv(name, rows, cols) {
  cols = cols || [...new Set(rows.flatMap(r => Object.keys(r)))];
  const esc = v => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  fs.writeFileSync(path.join(OUT, name), [cols.join(",")].concat(rows.map(r => cols.map(c => esc(r[c])).join(","))).join("\n") + "\n");
}
// A goal ID hides in the item itself or in its stats_url ("…&goal=123").
function goalIdOf(g) {
  if (g.id != null) return String(g.id);
  if (g.goal_id != null) return String(g.goal_id);
  // Configured goals carry a numeric ID in stats_url ("…&goal=123"); dynamic
  // goals (every clicky.goal("…") the game fires) have none, only their name.
  const m = /[?&]goal(?:_id)?=(\d+)(?:&|$)/.exec(g.stats_url || g.url || "");
  return m ? m[1] : "";
}

// What a session's goals say about how far the player got (goal names are the
// ones game.html's track() fires: "Intro 2 of 5", "Week 07", "Scene: launch",
// "End: deadline", "Grade: B", …).
function progressOf(names) {
  let maxWeek = 0, intro = 0, end = "", grade = "";
  for (const n of names) {
    let m;
    if ((m = /^Week (\d+)$/.exec(n))) maxWeek = Math.max(maxWeek, +m[1]);
    else if ((m = /^Intro (\d+) of/.exec(n))) intro = Math.max(intro, +m[1]);
    else if (n === "Intro done") intro = Math.max(intro, 99);
    else if ((m = /^End: (.+)$/.exec(n))) end = m[1];
    else if ((m = /^Grade: (.+)$/.exec(n))) grade = m[1];
  }
  return { max_week: maxWeek || "", intro_done: intro === 99, end, grade };
}
// Engagement buckets, from "a quick look" to "finished a run".
function bucketOf(s) {
  if (!s.game_session) return "0 site only, no game";
  if (s.end) return "6 finished a run";
  if (s.max_week >= 10) return "5 played 10+ weeks";
  if (s.max_week >= 3) return "4 played 3-9 weeks";
  if (s.max_week >= 1 || s.intro_done) return "3 started a game";
  if ((s.duration_s || 0) >= 60) return "2 on the menu 60s+, no game";
  return "1 bounced off the menu";
}
const ENGAGED = b => b >= "3";
// New or returning player, from the game's own saves rather than Clicky's
// visitor ID (which doesn't hold up across days). The title menu fires "Menu"
// when this browser has a saved game (anyone who made one call) and
// "Menu: nothing saved" when not; Play again and a mid-run restart reload the
// page past the menu and fire "Play again" / "Restarted: week N". The menu
// shipped on 2026-10-28: earlier sessions are "unknown". A save lives in one
// browser, so a player on a new device or in private browsing counts as new.
function playerOf(s, names) {
  if (!s.game_session) return "";
  const has = p => names.some(n => n === p || n.startsWith(p + ":") || n.startsWith(p + " "));
  if (names.includes("Menu")) {
    if (names.includes("Menu: new game")) return "returning: new game";
    if (has("Menu: resume game") || has("Resumed")) return "returning: resumed";
    if (names.some(n => /^(Week|Intro|End|Scene)/.test(n))) return "returning: played";
    return "returning: left at menu";
  }
  if (has("Play again") || has("Restarted")) return "replay in the same sitting";
  if (names.includes("Menu: nothing saved")) return "new";
  return "unknown";
}
const RETURNING = p => p.startsWith("returning") || p === "replay in the same sitting";

// ── run ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log("Clicky site " + SITE + ", " + FROM + " .. " + TO + " → " + OUT);
  const range = FROM + "," + TO;

  // 1. Aggregate reports for the whole range (Clicky's own numbers).
  console.log("Aggregate reports…");
  const REPORTS = [
    "visitors", "visitors-unique", "actions", "actions-average", "time-average", "time-average-pretty",
    "bounce-rate", "goals", "campaigns", "referring-domains", "links", "links-domains", "searches",
    "countries", "regions", "cities", "languages", "web-browsers", "operating-systems", "screen-resolutions",
    "traffic-sources", "pages", "pages-entrance", "pages-exit", "visitors-most-active",
  ];
  const reports = {};
  for (let i = 0; i < REPORTS.length; i += 6) {   // a few types per request
    const types = REPORTS.slice(i, i + 6);
    try {
      Object.assign(reports, itemsByType(await api({ type: types.join(","), date: range, limit: "all" }, "report_" + i)));
    } catch (e) {
      // One unsupported type fails the whole batch; retry them one by one.
      for (const t of types) {
        try { Object.assign(reports, itemsByType(await api({ type: t, date: range, limit: "all" }, "report_" + t))); }
        catch (e2) { console.warn("  skipped report " + t + ": " + e2.message); }
      }
    }
  }
  for (const [type, items] of Object.entries(reports)) if (items.length) csv("report_" + type + ".csv", items);
  // Daily traffic, for a time series.
  try {
    const daily = await api({ type: "visitors,visitors-unique,actions,time-average,bounce-rate", date: range, daily: 1 }, "daily");
    const byDay = {};
    for (const block of [].concat(daily)) for (const d of block.dates || []) {
      const it = (d.items || [])[0];
      (byDay[d.date] = byDay[d.date] || { date: d.date })[block.type] = it ? it.value : "";
    }
    csv("daily.csv", Object.values(byDay).sort((a, b) => (a.date < b.date ? -1 : 1)));
  } catch (e) { console.warn("  skipped daily series: " + e.message); }

  // Goal catalogue: name ↔ ID.
  const goalReport = reports.goals || [];
  const goalById = {}, goalIdByName = {};
  for (const g of goalReport) {
    const id = goalIdOf(g), name = g.title || g.name || "";
    if (id) goalById[id] = name;
    if (name) goalIdByName[name] = id;
  }

  // 2. Every session.
  console.log("Sessions (visitors-list)…");
  const visits = await listByDay("visitors-list");

  // 3. Every action (pageviews, goals, clicks), for durations and goal times.
  let actions = [];
  if (WITH_ACTIONS) { console.log("Actions (actions-list)…"); actions = await listByDay("actions-list"); }
  const actionsBySession = {};
  for (const a of actions) if (a.session_id) (actionsBySession[a.session_id] = actionsBySession[a.session_id] || []).push(a);

  // ── sessions + goal completions ──
  const completions = [];
  const sessions = visits.map(v => {
    const sid = String(v.session_id || "");
    const uid = String(v.uid || v.visitor_id || "");
    const start = unix(v.time);
    const acts = actionsBySession[sid] || [];
    const actTimes = acts.map(a => unix(a.time)).filter(Boolean);
    // Duration: Clicky's time_total, else first → last action.
    let duration = num(v.time_total);
    if (duration == null && actTimes.length) duration = Math.max(...actTimes) - Math.min(start || Infinity, ...actTimes);

    // Goals: the visit's own list, plus any goal actions in the action log.
    const seen = new Map();   // name|id → { id, name, time }
    const addGoal = (raw, time) => {
      let id = "", name = "";
      if (raw && typeof raw === "object") { id = goalIdOf(raw); name = raw.title || raw.name || raw.goal || ""; }
      else if (/^\d+$/.test(String(raw))) id = String(raw);
      else name = String(raw || "");
      if (!name && id) name = goalById[id] || "";
      if (!id && name) id = goalIdByName[name] || "";
      if (!name && !id) return;
      const k = name || id;
      if (!seen.has(k)) seen.set(k, { id, name, time: time || null });
    };
    const vg = v.goals;
    if (vg) {
      const list = Array.isArray(vg) ? vg : vg.completed || vg.goals || (typeof vg === "object" ? Object.values(vg).flat() : String(vg).split(","));
      for (const g of [].concat(list || [])) addGoal(typeof g === "string" ? g.trim() : g);
    }
    for (const a of acts) if (/goal/i.test(a.action_type || "")) addGoal(a.goal_id ? { id: a.goal_id, title: a.action_title } : a.action_title, unix(a.time));
    const goals = [...seen.values()];
    for (const g of goals) completions.push({
      session_id: sid, visitor_uid: uid, session_start: iso(start), goal_time: iso(g.time),
      seconds_into_session: g.time && start ? g.time - start : "", goal_id: g.id, goal_name: g.name,
    });

    const utm = utmFrom(v.landing_page, v.landing_page_url, v.referrer_url);
    for (const k of UTM) if (v[k]) utm[k] = v[k];
    // Clicky reports a tagged visit's UTM as campaign: { name, source, medium, term, content }.
    const camp = v.campaign && typeof v.campaign === "object" ? v.campaign : null;
    if (camp) for (const k of ["source", "medium", "term", "content"]) if (camp[k]) utm["utm_" + k] = camp[k];
    if (camp && camp.name) utm.utm_campaign = camp.name;
    const s = {
      session_id: sid,
      visitor_uid: uid,
      start: iso(start),
      date: start ? iso(start).slice(0, 10) : "",
      duration_s: duration,
      actions: num(v.actions),
      visitor_total_visits: num(v.total_visits),
      landing_page: v.landing_page || "",
      referrer_url: v.referrer_url || "",
      referrer_domain: v.referrer_domain || "",
      referrer_search: v.referrer_search || "",
      referrer_type: v.referrer_type || (v.referrer_search ? "search" : v.referrer_domain ? "link" : "direct"),
      utm_source: utm.utm_source || "", utm_medium: utm.utm_medium || "", utm_campaign: utm.utm_campaign || "",
      utm_term: utm.utm_term || "", utm_content: utm.utm_content || "",
      campaign: camp ? [camp.name, camp.source, camp.medium].filter(Boolean).join(" / ") : (v.campaign || v.campaign_name || utm.utm_campaign || ""),
      country: v.country || v.country_name || "",
      country_code: v.country_code || "",
      geolocation: v.geolocation || "",
      language: v.language || "",
      browser: v.web_browser || "",
      os: v.operating_system || "",
      screen: v.screen_resolution || "",
      mobile: /\b(iOS|Android)\b/i.test(v.operating_system || "") ? 1 : 0,
      ip_address: v.ip_address || "",
      organization: v.organization || "",
      // Clicky's site is all of foundrs.com: a game session landed on game.html,
      // viewed it, or fired any of its goals.
      game_session: /game\.html/.test(v.landing_page || "") || acts.some(a => /game\.html/.test(a.action_url || "")) || goals.length > 0 ? 1 : 0,
      goal_count: goals.length,
      goals: goals.map(g => g.name || g.id).join(" | "),
      ...progressOf(goals.map(g => g.name)),
      stats_url: v.stats_url || "",
    };
    s.engagement = bucketOf(s);
    s.player = playerOf(s, goals.map(g => g.name));
    // A replay can also happen after a returning player's menu choice.
    s.replayed = goals.some(g => g.name === "Play again" || /^Restarted/.test(g.name)) ? 1 : 0;
    return s;
  });
  csv("sessions.csv", sessions);
  csv("goal_completions.csv", completions);
  if (actions.length) csv("actions.csv", actions.map(a => ({ time: iso(unix(a.time)), ...a })));

  // ── visitors ──
  const byVisitor = {};
  for (const s of sessions) (byVisitor[s.visitor_uid || "session:" + s.session_id] = byVisitor[s.visitor_uid || "session:" + s.session_id] || []).push(s);
  const visitors = Object.entries(byVisitor).map(([uid, ss]) => {
    ss.sort((a, b) => (a.start < b.start ? -1 : 1));
    const first = ss[0];
    return {
      visitor_uid: uid, sessions: ss.length, session_ids: ss.map(s => s.session_id).join(" "),
      first_seen: first.start, last_seen: ss[ss.length - 1].start,
      total_duration_s: ss.reduce((t, s) => t + (s.duration_s || 0), 0),
      max_week: Math.max(0, ...ss.map(s => +s.max_week || 0)) || "",
      runs_finished: ss.filter(s => s.end).length,
      best_grade: ss.map(s => s.grade).filter(Boolean).sort()[0] || "",
      first_referrer_domain: first.referrer_domain, first_utm_source: first.utm_source, first_campaign: first.campaign,
      country: first.country, best_engagement: ss.map(s => s.engagement).sort().pop(),
    };
  });
  csv("visitors.csv", visitors);

  // ── goals summary ──
  const games = sessions.filter(s => s.game_session);
  const nS = games.length, nV = new Set(games.map(s => s.visitor_uid || s.session_id)).size;
  const engaged = new Set(sessions.filter(s => ENGAGED(s.engagement)).map(s => s.session_id));
  const g = {};
  for (const c of completions) {
    const k = c.goal_name || c.goal_id;
    const r = (g[k] = g[k] || { goal_id: c.goal_id, goal_name: c.goal_name, sessions: new Set(), visitors: new Set(), secs: [] });
    r.sessions.add(c.session_id); r.visitors.add(c.visitor_uid || c.session_id);
    if (c.seconds_into_session !== "") r.secs.push(c.seconds_into_session);
  }
  for (const item of goalReport) {
    const name = item.title || item.name || "", k = name || goalIdOf(item);
    const r = (g[k] = g[k] || { goal_id: goalIdOf(item), goal_name: name, sessions: new Set(), visitors: new Set(), secs: [] });
    r.clicky_completions = item.value ?? item.count ?? "";
    r.clicky_conversion_pct = item.conversion ?? item.value_percent ?? "";
    r.clicky_revenue = item.revenue ?? "";
  }
  const goalsSummary = Object.values(g).map(r => ({
    goal_id: r.goal_id, goal_name: r.goal_name,
    clicky_completions: r.clicky_completions ?? "", clicky_conversion_pct: r.clicky_conversion_pct ?? "", clicky_revenue: r.clicky_revenue ?? "",
    sessions: r.sessions.size, visitors: r.visitors.size,
    pct_of_game_sessions: pct(r.sessions.size, nS), pct_of_game_visitors: pct(r.visitors.size, nV), pct_of_all_sessions: pct(r.sessions.size, sessions.length),
    pct_of_engaged_sessions: pct([...r.sessions].filter(x => engaged.has(x)).length, engaged.size),
    median_seconds_into_session: median(r.secs),
  })).sort((a, b) => b.sessions - a.sessions || String(a.goal_name).localeCompare(String(b.goal_name)));
  csv("goals_summary.csv", goalsSummary);

  // ── funnel: how far people get ──
  // The game fires "Week NN" on reaching week 2..24 (not week 1, and the run
  // ends entering week 25), so week 1 is "Intro done".
  const reached = (test) => games.filter(test).length;
  const funnel = [
    ["Game page", () => true],
    ["New game", s => /Menu: new game|Intro 1 of/.test(s.goals) || s.intro_done || s.max_week],
    ["Intro done (week 1)", s => s.intro_done || s.max_week],
    ...Array.from({ length: 23 }, (_, i) => ["Week " + String(i + 2).padStart(2, "0"), s => +s.max_week >= i + 2]),
    ["Finished a run", s => !!s.end],
    ["YC accepted", s => s.end === "YC"],
  ].map(([stage, test]) => { const n = reached(test); return { stage, sessions: n, pct_of_game_sessions: pct(n, nS) }; });
  csv("funnel.csv", funnel);

  // ── engagement buckets ──
  const buckets = {};
  for (const s of sessions) (buckets[s.engagement] = buckets[s.engagement] || []).push(s);
  csv("engagement.csv", Object.keys(buckets).sort().map(b => ({
    bucket: b, sessions: buckets[b].length, pct_of_all_sessions: pct(buckets[b].length, sessions.length),
    pct_of_game_sessions: b.startsWith("0") ? "" : pct(buckets[b].length, nS),
    median_duration_s: median(buckets[b].map(s => s.duration_s).filter(x => x != null)),
  })));

  // ── players: new vs returning ──
  const GRADES = "FDCBA";
  const byPlayer = {};
  for (const s of games) (byPlayer[s.player] = byPlayer[s.player] || []).push(s);
  const playerRow = (label, ss) => {
    const played = ss.filter(s => ENGAGED(s.engagement)), fin = ss.filter(s => s.end), graded = fin.filter(s => GRADES.includes(s.grade) && s.grade);
    return {
      player: label, sessions: ss.length, pct_of_game_sessions: pct(ss.length, nS),
      played: played.length, played_pct: pct(played.length, ss.length),
      finished_runs: fin.length, finished_pct: pct(fin.length, ss.length), finished_pct_of_played: pct(fin.length, played.length),
      yc: fin.filter(s => s.end === "YC").length, out_of_cash: fin.filter(s => s.end === "out of cash").length,
      avg_grade_0F_4A: graded.length ? Math.round(100 * graded.reduce((t, s) => t + GRADES.indexOf(s.grade), 0) / graded.length) / 100 : "",
      replayed: ss.filter(s => s.replayed).length, phone_pct: pct(ss.filter(s => s.mobile).length, ss.length),
      median_duration_s: median(ss.map(s => s.duration_s).filter(x => x != null)),
    };
  };
  const ORDER = ["new", "returning: new game", "returning: resumed", "returning: played", "returning: left at menu", "replay in the same sitting", "unknown"];
  csv("players.csv", [
    ...Object.keys(byPlayer).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).map(p => playerRow(p, byPlayer[p])),
    playerRow("ALL returning (incl. same-sitting replays)", games.filter(s => RETURNING(s.player))),
  ]);

  // ── sources: which traffic actually plays ──
  const sources = [];
  for (const dim of ["referrer_domain", "utm_source", "utm_medium", "campaign", "country", "browser", "mobile", "player"]) {
    const by = {};
    for (const s of games) (by[s[dim] === "" ? "(none)" : s[dim]] = by[s[dim] === "" ? "(none)" : s[dim]] || []).push(s);
    for (const [value, ss] of Object.entries(by)) sources.push({
      dimension: dim, value, sessions: ss.length,
      engaged_sessions: ss.filter(s => ENGAGED(s.engagement)).length,
      engaged_pct: pct(ss.filter(s => ENGAGED(s.engagement)).length, ss.length),
      finished_runs: ss.filter(s => s.end).length,
      median_duration_s: median(ss.map(s => s.duration_s).filter(x => x != null)),
      median_max_week: median(ss.map(s => +s.max_week).filter(Boolean)),
    });
  }
  sources.sort((a, b) => (a.dimension < b.dimension ? -1 : a.dimension > b.dimension ? 1 : b.sessions - a.sessions));
  csv("sources.csv", sources);

  // ── summary ──
  console.log("\n" + calls + " API calls.");
  console.log(sessions.length + " sessions (" + nS + " touched the game), " + visitors.length + " visitors, " + completions.length + " goal completions (" + goalsSummary.length + " distinct goals).");
  for (const b of Object.keys(buckets).sort()) console.log("  " + b.padEnd(24) + String(buckets[b].length).padStart(6));
  for (const p of ORDER) if (byPlayer[p]) console.log("  player: " + p.padEnd(28) + String(byPlayer[p].length).padStart(6));
  if (nS && !completions.length) console.warn("No goals found on any session: check raw/visitors-list_*.json for how this plan reports them.");
  console.log("Written to " + OUT);
})().catch(e => { console.error("\n" + e.message); process.exit(1); });
