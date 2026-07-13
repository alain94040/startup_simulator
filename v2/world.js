// ─────────────────────────────────────────────────────────────────────────────
// v2/world.js — the weekly economy tick, separated from the story graph.
// Ported from the old engine.js nextWeek() guts: passive co-founder
// contributions, the over-scope build burn-down, per-item effort completion,
// launch conversion, organic growth, free-to-paid, and the lose condition.
// Pure logic, no content, no DOM. The engine calls tick(game) once per week
// (after scheduled consequences, before timeouts/poll).
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Cumulative team build-effort needed to silently finish one over-scope
  // ("auto") roadmap item — the full/A plan's tax (see story/dev_plan.js).
  const AUTO_BUILD_INCREMENT = 11;

  function tick(game) {
    const s = game.s;

    // Passive co-founder contributions (by focus/skills/trust).
    for (const [, char] of game.cast) {
      if (!char.active || !char.focus) continue;
      if (char.def.type !== "cofounder") continue;
      const skill = (char.def.skills || {})[char.focus] || 1.0;
      const trustFactor = char.trust != null ? char.trust / 100 : 1.0;
      const base = 1.2 * skill * trustFactor;
      const sideProjectMult = char.flags.side_project_active ? 0.7 : 1.0;
      const mult = (char.def.passiveMult ? char.def.passiveMult(s, char) : 1.0) * sideProjectMult;
      if (char.focus === "build") {
        char.buildEffort += base * mult;
      } else if (char.focus === "discover") {
        s.signal = clamp(s.signal + base * 1.5, 0, 100);
        s.market_fit = clamp(s.market_fit + base, 0, 100);
      }
    }

    // Over-scope build burn-down: the full plan's inert "auto" items complete
    // passively as cumulative team build effort accrues.
    let teamEffort = 0;
    for (const [, char] of game.cast) {
      if (char.def.type === "cofounder" && char.active) teamEffort += char.buildEffort;
    }
    if (s.items) {
      const autoKeys = Object.keys(s.items).filter(k => s.items[k] && s.items[k].auto);
      const target = Math.floor(teamEffort / AUTO_BUILD_INCREMENT);
      let done = autoKeys.filter(k => s.items[k].status === "done").length;
      for (const k of autoKeys) {
        if (done >= target) break;
        if (s.items[k].status === "todo" || s.items[k].status === "obsolete") {
          s.items[k].status = "done";
          s.items[k].quality = s.items[k].quality || "solid";
          done++;
        }
      }
      // Per-item effort completion: any item carrying { owner, effortTarget }
      // flips to done once its owner's cumulative buildEffort passes the target.
      for (const k of Object.keys(s.items)) {
        const it = s.items[k];
        if (!it || it.status !== "active" || it.effortTarget == null || !it.owner) continue;
        const owner = game.cast.get(it.owner);
        if (owner && owner.buildEffort >= it.effortTarget) {
          it.status = "done";
          it.quality = it.quality || "solid";
        }
      }
      // Pivot rebuild burn-down: after pivot day, team effort accrued since the
      // decision completes the plans-first replacements (see story/pivot_day.js).
      if (s.activities_pivot && s.launched) {
        if (s.pivot_effort_base == null) s.pivot_effort_base = teamEffort;
        // If the team shrinks after pivot day (Jordan fired, Alex walks), the
        // active-cofounder effort sum drops below the recorded base — clamp the
        // base down so the rebuild clock resumes instead of going negative.
        if (teamEffort < s.pivot_effort_base) s.pivot_effort_base = teamEffort;
        const pivotEffort = teamEffort - s.pivot_effort_base;
        if (pivotEffort >= 3.0 && s.items.plans_matching && s.items.plans_matching.status === "active")
          s.items.plans_matching.status = "done";
        if (pivotEffort >= 5.5 && s.items.plans_ui && s.items.plans_ui.status === "todo")
          s.items.plans_ui.status = "done";
      }
    }

    // Launch day: convert the waitlist to users, once.
    if (s.launched && s.waitlist > 0 && !s._launch_converted) {
      s._launch_converted = true;
      const converted = Math.max(1, Math.round(s.waitlist * (0.25 + game.rng() * 0.15)));
      s.users += converted;
      s.waitlist = 0;
    }

    // Organic signups at high signal.
    if (s.launched && s.signal >= 70) {
      s.users += Math.floor((s.signal - 70) / 30) + 1;
    }

    // Channel-driven growth (after committing via Bullseye). A channel that
    // fits dating compounds; a dud barely moves even after you've focused.
    if (s.launched && s.primary_channel) {
      const ch = s.channels[s.primary_channel];
      const fit = ch ? ch.fit : 0;
      const densityGrow = s.beachhead === "narrow" ? 1.25 : s.beachhead === "broad" ? 0.7 : 1.0;
      const gained = Math.round((1 + fit * 7) * densityGrow);
      if (gained > 0) s.users += gained;
    }

    // True product-market fit: pre-pivot the raw score overstates reality.
    if (s.activities_pivot && s.fit_at_pivot == null) s.fit_at_pivot = s.market_fit;
    const trueFit = Math.max(0,
      s.pivot_shipped ? s.market_fit
        : s.activities_pivot ? s.fit_at_pivot * 0.3 + (s.market_fit - s.fit_at_pivot) * 0.5
          : s.market_fit / 6);

    // Cold-start density (the dating ghost-town lesson): owning one narrow
    // market gives liquidity; spreading thin means an empty app.
    const density = s.beachhead === "narrow" ? 1.25 : s.beachhead === "broad" ? 0.7 : 1.0;

    // Free-to-paid conversion (users don't pay for a product that doesn't retain them).
    if (s.launched && s.users > 0) {
      const baseRate = trueFit < 30 ? 0.005 : trueFit < 50 ? 0.01 : trueFit < 70 ? 0.02 : 0.03;
      const raw = s.users * baseRate * density * (s.website_updated ? 1.3 : 1.0);
      const converted = Math.floor(raw) + (game.rng() < (raw % 1) ? 1 : 0);
      if (converted > 0) {
        s.users = Math.max(0, s.users - converted);
        s.customers += converted;
      }
    }
    s.revenue = s.customers * 50;

    // The horizon: entering deadline week, every run ends. An applied run's
    // verdict (accept/reject) was already delivered by the scheduled letter in
    // story/fundraising.js — scheduled consequences fire before this tick. A
    // run that never applied ends here too: the batch filled without you, and
    // the report card prints regardless.
    if (!s.game_won && !s.game_over && s.week >= s.deadline_week
      && !s.ycAccepted && !s.ycRejected) {
      s.deadline_passed = true;
      s.game_over = true;
    }
    // Win condition: YC acceptance. Lose: rejection, never applying, or $0.
    if (!s.game_won && s.ycAccepted) s.game_won = true;
    if (s.ycRejected) s.game_over = true;
    if (s.cash <= 0) s.game_over = true;
  }

  const api = { tick, AUTO_BUILD_INCREMENT };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.V2WORLD = api;
})();
