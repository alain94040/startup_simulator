// ─────────────────────────────────────────────────────────────────────────────
// v2/scoring.js — the endgame report card, rebuilt on the facts ledger.
//
// scoreGame(game) grades a run on 7 lessons. Where the old scoring.js mined
// engine.log for acted/ignored entries and a pile of flags, this one asks the
// ledger directly: g.took("node:key") is the record of every decision, and
// "@ignored" outcomes are first-class evidence of the conversations a player
// dodged. A lesson the player never got to face returns score:null.
//
// Category shape: { key, label, score: 0-100 | null, verdict, notes: [], ref }.
// Pure logic, no DOM; dual export (module.exports / window.V2Scoring).
// Safe to call in any game state.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Ratio of answered-vs-ignored among the given nodes (only counting resolved
  // ones). Returns null if none of them ever resolved.
  function answeredRatio(g, ids) {
    let answered = 0, ignored = 0;
    for (const id of ids) {
      if (!g.done(id)) continue;
      if (g.outcome(id) === "@ignored") ignored++;
      else answered++;
    }
    return answered + ignored === 0 ? null : answered / (answered + ignored);
  }
  // Accumulate earned/possible over parts that were actually faced.
  function parts(list) {
    let earned = 0, possible = 0, faced = false;
    const notes = [];
    for (const p of list) {
      if (!p.faced) continue;
      faced = true;
      possible += p.weight;
      earned += p.weight * clamp(p.got, 0, 1);
      if (p.note) notes.push(p.note);
    }
    return faced ? { score: Math.round((earned / possible) * 100), notes } : null;
  }

  function scoreGame(g) {
    const s = g.s;
    const out = [];
    const add = (key, label, ref, result, verdicts) => {
      if (!result) {
        out.push({ key, label, ref, score: null, verdict: "never faced", notes: [] });
        return;
      }
      const v = result.score >= 70 ? verdicts[0] : result.score >= 40 ? verdicts[1] : verdicts[2];
      out.push({ key, label, ref, score: result.score, verdict: v, notes: result.notes });
    };

    // ── 1. Have the hard conversations ───────────────────────────────────────
    {
      const talkRatio = answeredRatio(g, [
        "equity_open", "equity_alex", "equity_alex_why", "equity_worry",
        "equity_counter_alex", "equity_counter_alex_50", "equity_counter_jordan",
        "equity_signing", "alex_commitment",
      ]);
      add("hard-conversations", "Have the hard conversations", "📚 Wasserman, The Founder's Dilemmas",
        talkRatio == null ? null : parts([
          { faced: true, weight: 3, got: talkRatio,
            note: talkRatio === 1 ? "Every equity and commitment talk got an answer." : "Some of the hardest conversations resolved by silence." },
          { faced: g.done("equity_alex"), weight: 1, got: g.took("equity_alex:probe") ? 1 : 0.4,
            note: g.took("equity_alex:probe") ? "Asked where Alex's head was before naming a number." : null },
          { faced: g.done("jordan_confrontation"), weight: 2,
            got: g.took("jordan_confrontation:fire") ? 1 : g.took("jordan_confrontation:defer") ? 0.3 : 0,
            note: g.took("jordan_confrontation:fire") ? "Fired a drifting co-founder while it was still fixable."
              : g.done("jordan_confrontation") ? "The Jordan conversation kept getting deferred." : null },
        ]),
        ["You had the talks nobody wants to have — early, in person.",
          "Some conversations happened; others were left to fester.",
          "Equity and commitment settled themselves by default. That bill comes due."]);
    }

    // ── 2. Keep your co-founders close ───────────────────────────────────────
    {
      const cofounderNodes = [];
      for (const [id, node] of g.nodes) {
        if (node.char === "alex" || node.char === "jordan") cofounderNodes.push(id);
      }
      const ratio = answeredRatio(g, cofounderNodes);
      const alex = g.cast.get("alex"), jordan = g.cast.get("jordan");
      const rel = ((alex.morale + alex.trust + jordan.morale + jordan.trust) / 4) / 100;
      add("cofounders-close", "Keep your co-founders close", "📚 PG, \"What Startups Are Really Like\"",
        ratio == null ? null : parts([
          { faced: true, weight: 2, got: ratio,
            note: Math.round(ratio * 100) + "% of your co-founders' messages got an answer." },
          { faced: true, weight: 2, got: rel,
            note: "Team morale/trust ended around " + Math.round(rel * 100) + "." },
        ]),
        ["They texted, you answered. It shows in the trust.",
          "Left on read more than once — they noticed.",
          "Your co-founders spent the run talking to a wall."]);
    }

    // ── 3. Build something people want ───────────────────────────────────────
    {
      const chips = [!!s.maya_quote, !!s.rachel_answer, !!s.demo_question_seen, !!s.analytics_dropoff_seen]
        .filter(Boolean).length;
      const pivotGot = g.took("pivot_day_decide:pivot") ? 1
        : g.took("pivot_fifty_verdict:pivot_now") ? 0.5
          : (s.pivot_deferred || g.took("pivot_day_decide:growth|hedge")) ? 0.1 : 0;
      add("build-something-people-want", "Build something people want", "📚 Steve Blank / PG, \"How to Get Startup Ideas\"",
        parts([
          { faced: g.done("interviews") || g.done("dev_plan"), weight: 1,
            got: g.took("interviews:interview") ? 1 : 0,
            note: g.took("interviews:interview") ? "Did the customer interviews before locking scope." : "Built without a single structured user conversation." },
          { faced: g.done("dev_plan"), weight: 1, got: s.dev_plan === "lean" ? 1 : 0,
            note: s.dev_plan === "lean" ? "Kept the scope lean." : s.dev_plan === "full" ? "Over-scoped the build — the extra work cost weeks." : null },
          { faced: g.done("first_screen") || g.done("ranking"), weight: 1,
            got: (g.took("first_screen:intake_interviews") ? 0.5 : 0) + (g.took("ranking:conversation") ? 0.5 : 0),
            note: "Research-backed direction calls: " + ((g.took("first_screen:intake_interviews") ? 1 : 0) + (g.took("ranking:conversation") ? 1 : 0)) + "/2." },
          { faced: s.launched, weight: 1, got: chips / 4,
            note: chips + "/4 evidence chips banked before pivot day." },
          { faced: g.done("pivot_day_decide") || s.pivot_deferred, weight: 2, got: pivotGot,
            note: g.took("pivot_day_decide:pivot") ? "Pivoted on evidence, with cash left to survive it."
              : g.took("pivot_fifty_verdict:pivot_now") ? "Pivoted late — right call, three weeks and $1k dearer."
                : s.pivot_deferred ? "The default direction won by inertia." : null },
        ]),
        ["You listened first, built second, and turned the ship while you still could.",
          "Some signal reached the roadmap; a lot of it didn't.",
          "The product was built on guesses and defended against evidence."]);
    }

    // ── 4. Features won't save you ───────────────────────────────────────────
    {
      add("features-wont-save-you", "Features won't save you", "📚 Ries, The Lean Startup",
        parts([
          { faced: g.done("feature_spree"), weight: 2, got: g.took("feature_spree:no") ? 1 : 0,
            note: g.took("feature_spree:no") ? "Held the roadmap until you knew why users leave." : "Shipped streaks at the graph. The graph didn't move." },
          { faced: g.done("feature_request_custom"), weight: 1,
            got: g.took("feature_request_custom:decline") || g.took("feature_request_custom:negotiate") ? 1 : 0,
            note: g.took("feature_request_custom:build") ? "Built one power-user's workflow into the product." : null },
          { faced: g.done("feature_cluster"), weight: 1, got: g.took("feature_cluster:build") ? 1 : 0,
            note: g.took("feature_cluster:build") ? "Built the thing three users asked for independently — that one counts." : null },
          { faced: g.done("pivot_day_decide"), weight: 1, got: g.took("pivot_day_decide:hedge") ? 0 : 1,
            note: g.took("pivot_day_decide:hedge") ? "The hedge: an events tab bolted onto a dating app." : null },
        ]),
        ["You shipped what demand asked for and nothing the graph merely wished for.",
          "A mixed record — some features were bets, some were flinches.",
          "When the graph flattened, you threw features at it."]);
    }

    // ── 5. Build your edge, buy the rest ─────────────────────────────────────
    {
      add("edge-vs-commodity", "Build your edge, buy the rest", "📚 Spolsky, \"In Defense of Not-Invented-Here\"",
        parts([
          { faced: g.done("auth_choice"), weight: 1,
            got: g.took("auth_choice:buy") ? 1 : g.took("auth_forced:buy") ? 0.4 : 0,
            note: g.took("auth_choice:buy") ? "Bought auth day one — commodity plumbing." : "Hand-rolled auth; bought it anyway two weeks later." },
          { faced: g.done("matching_choice"), weight: 2,
            got: g.took("matching_choice:license") ? 0 : 1,
            note: g.took("matching_choice:license") ? "Licensed the core. The black box got ripped out at the pivot." : "Kept the matching engine — the one thing you can't rent." },
          { faced: g.done("analytics_choice"), weight: 1,
            got: g.took("analytics_choice:buy") ? 1 : 0,
            note: g.took("analytics_choice:buy") ? "Bought sight: the analytics paid for themselves before launch." : "Built a dashboard while flying blind." },
        ]),
        ["Owned the differentiator, rented the plumbing.",
          "Got some build-vs-buy calls right, paid tuition on the rest.",
          "Built the commodity, rented the edge — exactly backwards."]);
    }

    // ── 6. Keep the cap table clean ──────────────────────────────────────────
    {
      const pct = s.equity_proposal === "33/33/33" ? "33%" : s.equity_proposal === "50/25/25" ? "25%" : "20%";
      add("clean-cap-table", "Keep the cap table clean", "📚 Fred Wilson, \"Founder Vesting\"",
        parts([
          { faced: g.done("incorporate") || g.done("incorporate_again"), weight: 1,
            got: s.incorporated ? 1 : 0,
            note: s.incorporated ? "Incorporated before the work belonged to nobody." : "Never formed a legal entity — there is no cap table to keep clean." },
          { faced: g.done("equity_open") || !!s.equity_proposal, weight: 2,
            got: s.jordan_equity ? (s.equity_skipped ? 0.4 : 1) : 0,
            note: s.jordan_equity ? (s.equity_skipped ? "The split defaulted to even thirds — signed, but never actually discussed." : "Equity split negotiated and signed while everyone was still friends.")
              : "The split was never signed. Every later conversation got harder." },
          { faced: g.done("ff_family"), weight: 1, got: g.took("ff_family:ask") || g.took("ff_family_2:ask") || g.took("ff_family_3:ask") ? 1 : 0.3,
            note: g.took("ff_family:ask") ? "Took the friends-and-family money early." : null },
          { faced: !!s.jordan_resolved, weight: 2,
            got: s.jordan_cleanup_needed ? 0 : 1,
            note: s.jordan_resolved ? (s.jordan_cleanup_needed
              ? "A departed co-founder still owns " + pct + ", fully vested, no cliff. Anyone doing diligence will stop there."
              : "Bought back the departed co-founder's stake — the cap table survived the firing.") : null },
        ]),
        ["Paper first, feelings second — the cap table stayed clean through everything.",
          "The ownership questions got answered, but late and at a price.",
          "The cap table is a diligence minefield — unsigned splits and dead equity."]);
    }

    // ── 7. Stay default alive ────────────────────────────────────────────────
    {
      let minBalance = s.cash;
      for (const wk of g.ledger) minBalance = Math.min(minBalance, wk.balanceAfter);
      const score = s.game_won ? 100
        : !s.game_over ? clamp(40 + g.runwayWeeks * 3, 40, 90)
          : s.ycRejected ? 55 : s.deadline_passed ? 45 : 10;
      out.push({
        key: "default-alive", label: "Stay default alive", ref: "📚 PG, \"Default Alive or Default Dead?\"",
        score, verdict: s.game_won ? "You reached the other side with the lights on."
          : !s.game_over ? "Still alive — runway is the scoreboard."
            : s.ycRejected ? "The run ended on a verdict, not on the bank balance."
              : s.deadline_passed ? "Alive at the deadline — but the application never went out."
                : "Cash hit zero. Everything else became irrelevant.",
        notes: ["Lowest bank balance: $" + Math.max(0, Math.round(minBalance)).toLocaleString() + "."],
      });
    }

    return out;
  }

  const api = { scoreGame };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.V2Scoring = api;
})();
