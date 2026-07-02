// scoring.js — endgame scorecard. Pure logic, no DOM.
// When the YC verdict arrives the game ends and the player is graded on ten
// dimensions, each tied to specific card choices and anchored to a canonical
// piece of startup writing (the 📚 ref). scoreGame(engine) is safe to call at
// any point in any game — categories the player never got to face come back
// with score:null and an explanatory line instead of a fake grade.
(function () {

  function grade(score) {
    if (score == null) return null;
    if (score >= 85) return "A";
    if (score >= 70) return "B";
    if (score >= 55) return "C";
    if (score >= 40) return "D";
    return "F";
  }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function scoreGame(engine) {
    const s = engine.s;
    const log = engine.log || [];
    const ledger = engine.ledger || [];
    const chars = engine.chars;
    const jordan = chars && chars.get("jordan");
    const alex = chars && chars.get("alex");
    const founder = chars && chars.get("founder");

    // ── log index: what the player answered, ignored, or was shown ──────────
    const acted = new Map();     // cardId -> [{week, option}]
    const ignoredSet = new Map();// cardId -> [week]
    const surfacedW = new Map(); // cardId -> first week surfaced
    for (const en of log) {
      if (en.acted) {
        if (!acted.has(en.acted)) acted.set(en.acted, []);
        acted.get(en.acted).push({ week: en.week, option: en.option });
      } else if (en.ignored) {
        if (!ignoredSet.has(en.ignored)) ignoredSet.set(en.ignored, []);
        ignoredSet.get(en.ignored).push(en.week);
      } else if (en.surfaced && !surfacedW.has(en.surfaced)) {
        surfacedW.set(en.surfaced, en.week);
      }
    }
    const chose = (cardId, key) =>
      (acted.get(cardId) || []).some((a) => key == null || a.option === key);
    const choseWeek = (cardId, key) => {
      const hit = (acted.get(cardId) || []).find((a) => key == null || a.option === key);
      return hit ? hit.week : null;
    };
    const wasIgnored = (cardId) => ignoredSet.has(cardId);
    const faced = (cardId) =>
      acted.has(cardId) || ignoredSet.has(cardId) || surfacedW.has(cardId);

    const cats = [];

    // ── 1. Have the Hard Conversation (equity) ───────────────────────────────
    {
      const EQ = ["jordan_equity_mention", "jordan_equity_worry", "jordan_equity_counter_jordan",
        "jordan_equity_5050_interject", "jordan_equity_split", "jordan_equity_alex",
        "jordan_equity_alex_why", "jordan_equity_counter_alex", "jordan_equity_counter_alex_50",
        "equity_signing"];
      const answered = EQ.filter((id) => acted.has(id)).length;
      const dodged = EQ.filter((id) => wasIgnored(id)).length;
      const skipped = jordan && jordan.flags.equity_skipped; // arc defaulted because you went quiet
      const split = jordan && jordan.flags.equity_proposal;
      const brokePromise = jordan && jordan.flags.reassured && chose("jordan_equity_counter_jordan", "hold_40");

      let score = 0, detail;
      if (!s.jordan_equity) {
        score = answered > 0 ? 20 : 5;
        detail = "You never signed a founder agreement. Every week without one, the ambiguity compounded" +
          (s.jordan_resolved ? " — and when Jordan left, Alex asked what you were even building on." : ".");
      } else {
        score = 40;                                        // it got signed
        score += Math.round(30 * (answered / Math.max(1, answered + dodged)));
        if (skipped) { score = Math.min(score, 35); }
        if (answered >= 3 && !skipped) score += 15;        // you actually sat in the conversation
        if (split === "40/40/20") score += 10;             // matched risk to reward and said it out loud
        if (split === "50/25/25") score -= 10;             // grabbed half before there was anything to grab
        if (brokePromise) score -= 20;                     // "you're an equal partner" … then held her at 20%
        detail = skipped
          ? "You went quiet and the split defaulted to equal thirds — the conversation happened without you."
          : `You settled on ${split || "a split"} and signed${brokePromise ? " — after telling Jordan she was an equal partner, then holding her at 20%. She remembered." : "."}` +
            " Nobody set up vesting — the omission every founder regrets.";
      }
      cats.push({
        key: "equity", label: "Have the Hard Conversation",
        score: clamp(score, 0, 100), detail,
        lesson: "Dodging the equity talk doesn't make the split fair — it makes it explode later. And always set up vesting.",
        ref: "Noam Wasserman, The Founder's Dilemmas",
      });
    }

    // ── 2. Keep Your Co-founders Close ───────────────────────────────────────
    {
      const cofounderIds = new Set(["alex", "jordan"]);
      let ignoredCount = 0;
      for (const en of log) if (en.ignored && cofounderIds.has(en.charId)) ignoredCount++;

      let score, detail;
      if (alex && !alex.active) {
        score = 10;
        detail = "Alex walked. You stopped answering, he stopped believing — the startup lost its builder.";
      } else {
        const vibe = alex ? (alex.trust + alex.morale) / 2 : 50;
        score = Math.round(vibe * 0.7);                    // 0–70 from where Alex actually is
        score -= Math.min(30, ignoredCount * 4);           // every unanswered text cost you
        if (engine.alexDepartureRisk) score -= 15;
        if (ignoredCount === 0) score += 15;
        score = clamp(score, 0, 100);
        detail = ignoredCount === 0
          ? "You never left a co-founder on read. Alex finished the game still believing."
          : `You left co-founder messages unanswered ${ignoredCount} time${ignoredCount === 1 ? "" : "s"}. ` +
            (alex && alex.trust >= 60 ? "Alex hung in there anyway." : "It showed — trust drained week by week.");
      }
      cats.push({
        key: "cofounders", label: "Keep Your Co-founders Close",
        score, detail,
        lesson: "Founder fights and drift kill more startups than competitors do. The fix is boring: answer, engage, repeat.",
        ref: "Paul Graham, “The 18 Mistakes That Kill Startups”",
      });
    }

    // ── 3. Face the Wrong Co-founder (Jordan) ────────────────────────────────
    {
      let score = null, detail;
      if (!s.jordan_drifting && !s.jordan_resolved) {
        detail = "Jordan's commitment problem never came to a head — you ran out of road before the hard part.";
      } else if (s.jordan_resolved) {
        score = 55;
        const fireW = choseWeek("jordan_confrontation", "fire");
        const driftW = surfacedW.get("jordan_drift_start");
        const drag = fireW != null && driftW != null ? fireW - driftW : null;
        if (chose("jordan_fulltime_ask", "pressure")) score += 10;   // named the dealbreaker out loud
        if (drag != null && drag <= 4) score += 15;
        else if (drag != null && drag <= 8) score += 8;
        if (chose("jordan_confrontation", "defer")) score -= 10;     // "one more sprint" — you both knew
        if (!s.jordan_cleanup_needed) score += 20;                   // lawyer, buyback, clean cap table
        detail = "You had the conversation and let Jordan go" +
          (drag != null && drag > 8 ? ` — but only after ${drag} weeks of Alex covering for her.` : ".") +
          (s.jordan_cleanup_needed
            ? " Her stake is still on the cap table; every investor who looks will ask."
            : " Then you paid the lawyer and cleaned the cap table.");
      } else {
        score = jordan && jordan.flags.confrontation_done ? 5 : 15;  // Alex forced it and you ducked
        detail = jordan && jordan.flags.confrontation_done
          ? "Alex brought you the conversation and you never had it. He stopped asking — that silence was expensive."
          : "Jordan drifted for weeks and the confrontation never happened. Avoiding the decision was a decision.";
      }
      cats.push({
        key: "jordan", label: "Face the Wrong Co-founder",
        score: score == null ? null : clamp(score, 0, 100), detail,
        lesson: "A half-committed co-founder is a decision you're avoiding. Make the break early and cleanly — this is what vesting was for.",
        ref: "PG, “18 Mistakes” (A Half-Hearted Effort); Michael Seibel on co-founder breakups",
      });
    }

    // ── 4. Ask for Money Early (friends & family) ────────────────────────────
    {
      const asks = [];
      if (chose("ff_family", "ask") || chose("ff_family_2", "ask") || chose("ff_family_3", "ask"))
        asks.push({ who: "your parents", week: choseWeek("ff_family", "ask") ?? choseWeek("ff_family_2", "ask") ?? choseWeek("ff_family_3", "ask") });
      if (chose("ff_friend_ask", "ask")) asks.push({ who: "Jamie", week: choseWeek("ff_friend_ask", "ask") });
      if (chose("ff_mentor_pitch", "pitch")) asks.push({ who: "David", week: choseWeek("ff_mentor_pitch", "pitch") });

      let score = asks.length * 25;
      const firstAsk = asks.length ? Math.min(...asks.map((a) => a.week ?? 99)) : null;
      if (firstAsk != null) score += firstAsk <= 4 ? 25 : firstAsk <= 8 ? 15 : 5;
      score = clamp(score, 0, 100);
      const detail = asks.length === 0
        ? "You never asked anyone. The people who already believed in you were the cheapest money you'll ever not raise."
        : `You asked ${asks.map((a) => a.who).join(", ")} — first ask in week ${firstAsk}. ` +
          (asks.length === 3 ? "Every early door, knocked on." : "There were doors you never knocked on.");
      cats.push({
        key: "ffmoney", label: "Ask for Money Early",
        score, detail,
        lesson: "Swallow the embarrassment and raise from people who trust you — before you need it, not when the account hits zero.",
        ref: "Paul Graham, “How to Fund a Startup”",
      });
    }

    // ── 5. Read Your Investors (leads vs followers) ──────────────────────────
    {
      let score = null, detail;
      if (!faced("investor_intro_warm") && !s.marcusCommitted) {
        detail = "No real investor ever reached out — your network never got warm enough to produce one.";
      } else if (s.marcusCommitted) {
        score = s.followerCommitted ? 100 : 88;
        detail = s.followerCommitted
          ? "You landed Marcus — and the moment he committed, Fatima 'decided' too. That ordering was never a coincidence."
          : "You landed Marcus, the one investor in your pipeline who actually leads.";
      } else {
        score = 20;
        if (chose("investor_intro_warm", "call")) score += 20;
        if (s.deck_ready) score += 20;
        if (chose("investor_ready", "meet")) score += 10;
        const marcusFlags = chars.get("marcus") ? chars.get("marcus").flags : {};
        if (marcusFlags.intro_moved_on) score -= 20;
        if ((s.investor_warmth || 0) < 30) score -= 10;
        const chasedFollowers = (chose("fatima_deck") || chose("fatima_meeting")) && marcusFlags.intro_moved_on;
        detail = marcusFlags.intro_moved_on
          ? "Marcus — your only lead — moved on while you " + (chasedFollowers ? "took meeting after meeting with Fatima, who never invests first." : "left his messages sitting.")
          : "You worked the investor pipeline but never got your lead to commit" +
            (chose("fatima_deck") ? " — and Fatima, however interested she sounded, was always waiting for someone else to go first." : ".");
      }
      cats.push({
        key: "investors", label: "Read Your Investors",
        score: score == null ? null : clamp(score, 0, 100), detail,
        lesson: "Investors are a herd: most follow, few lead. Find your lead; every hour spent pitching followers first is wasted.",
        ref: "Paul Graham, “How to Raise Money”",
      });
    }

    // ── 6. Scope Lean, Launch Fast ───────────────────────────────────────────
    {
      let score, detail;
      const waits = (acted.get("good_enough_launch") || []).filter((a) => a.option === "wait").length;
      if (s.dev_plan == null) {
        score = 15;
        detail = "You never locked a build plan — the roadmap drifted and the product was never ready for the market to judge.";
      } else if (s.dev_plan === "full") {
        score = 25;
        detail = "You picked the full plan: twice the scope, twice the weeks, zero extra learning. The market never got a vote.";
      } else {
        score = 75;
        if (chose("dev_planning_session", "sprint")) score += 5;   // saw through the 'do it all in sprints' decoy
        if (s.launched) score += 15; else score = Math.min(score, 45);
        score -= waits * 8;                                        // "two more weeks" — the polish trap
        detail = "You scoped lean" + (s.launched
          ? (waits ? ` but stalled ${waits} time${waits === 1 ? "" : "s"} at the launch door before shipping.` : " and shipped the moment it was good enough.")
          : " but never launched — a perfect product nobody used.");
      }
      // panic-copying the funded competitor (Flare) is scope creep, whatever the plan
      if (chose("competitor_launch", "copy")) score -= 15;
      cats.push({
        key: "lean", label: "Scope Lean, Launch Fast",
        score: clamp(score, 0, 100), detail,
        lesson: "If you're not embarrassed by v1, you launched too late. Over-scoping is how startups die before touching reality.",
        ref: "Paul Graham, “Startups in 13 Sentences”; Reid Hoffman",
      });
    }

    // ── 7. Build Your Edge, Buy the Rest ─────────────────────────────────────
    {
      const subs = [];
      if (faced("auth_build_buy")) {
        const boughtClean = chose("auth_build_buy", "buy");
        subs.push({
          label: "auth", ok: boughtClean,
          note: boughtClean ? "bought hosted auth in an afternoon"
            : "let Alex rebuild a solved problem — weeks lost, then you bought it anyway",
        });
      }
      if (faced("matching_engine_choice") || s.matching_owned || s.matching_licensed) {
        const owned = !!s.matching_owned && !s.matching_licensed;
        subs.push({
          label: "matching engine", ok: owned,
          note: owned ? "kept the matching engine in-house — the one thing that makes you different"
            : "licensed the core IP as a black box; at the pivot you paid to rip it out",
        });
      }
      if (faced("analytics_choice")) {
        const bought = chose("analytics_choice", "buy");
        subs.push({
          label: "analytics", ok: bought,
          note: bought ? "dropped in an analytics SDK — it later surfaced the signal that mattered"
            : "built a dashboard nobody needed instead of wiring in an SDK",
        });
      }
      let score = null, detail;
      if (subs.length === 0) {
        detail = "The build-vs-buy calls never reached your desk — the plan never got far enough.";
      } else {
        const right = subs.filter((x) => x.ok).length;
        score = Math.round((right / subs.length) * 100);
        detail = `${right}/${subs.length} calls right: ` + subs.map((x) => `${x.ok ? "✓" : "✗"} ${x.note}`).join("; ") + ".";
      }
      cats.push({
        key: "buildbuy", label: "Build Your Edge, Buy the Rest",
        score, detail,
        lesson: "Own the code that makes you different; never rebuild commodities. “If it's a core business function — do it yourself, no matter what.”",
        ref: "Joel Spolsky, “In Defense of Not-Invented-Here Syndrome”",
      });
    }

    // ── 8. Get Out of the Building ───────────────────────────────────────────
    {
      let score = 0;
      const bits = [];
      if (founder && founder.flags.interviews_done) {
        const w = choseWeek("founder_first_interviews", "interview");
        score += 30 + (w != null && w <= 3 ? 5 : 0);
        bits.push(`ran customer interviews${w != null ? ` in week ${w}` : ""}`);
      }
      if (s.met_priya) { score += 20; bits.push("went to the meetup and met Priya"); }
      score += Math.min(20, (s.user_depth_count || 0) * 10);
      if (s.user_depth_count) bits.push("sat and watched real users use the product");
      if (chose("alex_sync_discover")) { score += 10; bits.push("spent sprints on discovery"); }
      if (s.dont_scale_done) { score += 10; bits.push("did the unscalable thing to make the first matches happen"); }
      if (chose("waitlist_cold", "reach")) { score += 5; bits.push("kept the waitlist warm"); }
      score = clamp(score, 0, 100);
      const missed = [];
      if (!(founder && founder.flags.interviews_done)) missed.push("the customer interviews");
      if (!s.met_priya) missed.push("the founder meetup (and Priya)");
      if (!s.user_depth_count) missed.push("watching users work");
      const detail = bits.length
        ? "You " + bits.join(", ") + "." +
          (missed.length && score < 55 ? ` But you skipped ${missed.join(", ")} — the cheapest learning in the game.` : "")
        : "You never talked to a user. Everything you built was a guess, and the guesses compounded.";
      cats.push({
        key: "discovery", label: "Get Out of the Building",
        score, detail,
        lesson: "Everything you think you know about users is a guess until you've talked to them — and their compliments are lies; watch what they do.",
        ref: "Steve Blank; Rob Fitzpatrick, The Mom Test",
      });
    }

    // ── 9. Find the Real Product (the pivot) ─────────────────────────────────
    {
      const arcFaced = s.launched || faced("pivot_open") || faced("pivot_alex_pushback") ||
        faced("post_match_dropoff") || s.activities_pivot || s.pivot_shipped;
      let score = null, detail;
      if (!arcFaced) {
        detail = "You never launched, so the market never got the chance to tell you Plan A was wrong.";
      } else {
        score = 0;
        if (chose("post_match_dropoff")) score += 20;               // read the analytics signal, didn't scroll past
        if (chose("churn_interview", "call")) score += 10;          // called the churned subscriber
        if (chose("feature_cluster", "build")) score += 10;         // three unprompted asks = signal
        if (chose("feature_request_custom", "decline") || chose("feature_request_custom", "negotiate")) score += 5;
        if (chose("feature_request_custom", "build")) score -= 10;  // built a one-off for one loud user
        if (s.activities_pivot) score += 30;
        if (s.pivot_deferred) score -= 20;
        if (s.pivot_direction_game === "ship" && !s.activities_pivot) score -= 10;
        if (s.pivot_shipped) score += 25;
        score = clamp(score, 0, 100);
        detail = s.pivot_shipped
          ? "You heard the signal, committed to the pivot, and shipped v2 — the product users had been describing all along."
          : s.activities_pivot
            ? "You committed to the pivot but v2 never shipped — the insight died in the backlog."
            : s.pivot_deferred || s.pivot_direction_game === "ship"
              ? "The signal was there — matches going nowhere — and you shipped Plan A anyway."
              : "The drop-off data and the churn calls were pointing somewhere. You never followed them.";
      }
      cats.push({
        key: "pivot", label: "Find the Real Product",
        score, detail,
        lesson: "Plan A never survives contact with users. Product-market fit is the only thing that matters — hear the signal, pivot, ship.",
        ref: "Marc Andreessen, “The Only Thing That Matters”; Eric Ries, The Lean Startup",
      });
    }

    // ── 10. Stay Default Alive ───────────────────────────────────────────────
    {
      let score = 100;
      const hires = [];
      if (chose("consultant_brand", "hire")) hires.push("Brett's $1,500 'brand workshop' (45 minutes of sticky notes)");
      if (chose("consultant_growth", "hire")) hires.push("Kevin's $2,000 'growth audit' (a 58-slide deck saying post more on LinkedIn)");
      score -= hires.length * 30;
      // lowest the account ever got, before any YC wire distorts the picture
      let minCash = Infinity;
      for (const wk of ledger) { if (!s.ycAccepted || wk.week < s.week) minCash = Math.min(minCash, wk.balanceAfter); }
      if (minCash !== Infinity && minCash < 1000) score -= 20;
      else if (minCash !== Infinity && minCash < 2500) score -= 10;
      if ((s.extra_burn || 0) > 200) score -= 10;
      score = clamp(score, 0, 100);
      const detail =
        (hires.length ? `You paid for ${hires.join(" and ")}. The people who cold-emailed you were never on your side. ` : "You turned the consultants away — every one of them invoiced faster than they delivered. ") +
        (minCash !== Infinity && minCash < 1000
          ? `And the account dipped to $${Math.max(0, Math.round(minCash))} — one bad week from the end.`
          : "The bank account never got scary.");
      cats.push({
        key: "runway", label: "Stay Default Alive",
        score, detail,
        lesson: "Know your runway to the week and spend nothing. The people trying to sell you things are not your friends.",
        ref: "Paul Graham, “Default Alive or Default Dead?”",
      });
    }

    // ── assemble ─────────────────────────────────────────────────────────────
    for (const c of cats) c.grade = grade(c.score);
    const graded = cats.filter((c) => c.score != null);
    const avg = graded.length
      ? Math.round(graded.reduce((t, c) => t + c.score, 0) / graded.length) : 0;

    const outcome = s.ycAccepted ? "yc_accepted"
      : s.ycRejected ? "yc_rejected"
      : s.game_won ? "won_angels"
      : s.game_over ? "bankrupt" : "in_progress";

    let verdict = null;
    if (outcome === "yc_accepted") {
      verdict = {
        title: "You're in the batch.",
        sub: `Week ${s.week}. $500k for 7%. However the interviews went, what got you here is on this card.`,
      };
    } else if (outcome === "yc_rejected") {
      verdict = {
        title: "YC passed. This run ends here.",
        sub: s.ycQualified
          ? `Week ${s.week}. You were a real candidate — launched, pivoted, paying subscribers — and the odds still said no. Most batches do. Here's what you built along the way.`
          : `Week ${s.week}. You applied before you were ready — not launched, no proven pivot, no paying subscribers. The application was never going to carry a company that wasn't there yet.`,
      };
    }

    return {
      outcome,
      week: s.week,
      qualified: !!s.ycQualified,
      verdict,
      categories: cats,
      overall: { score: avg, grade: grade(avg) },
    };
  }

  const api = { scoreGame };
  if (typeof module !== "undefined") module.exports = api;
  else window.Scoring = api;
})();
