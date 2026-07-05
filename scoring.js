// scoring.js — endgame scorecard. Pure logic, no DOM.
// When the YC verdict arrives the game ends and the player is graded on seven
// lessons, each tied to specific card choices and anchored to a canonical
// piece of startup writing (the 📚 ref). scoreGame(engine) is safe to call at
// any point in any game — a category the player never got to face comes back
// with score:null and an explanatory line instead of a fake grade, and merged
// categories degrade to the half that was always available.
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

    // ── 1. Have the Hard Conversations (the equity talk + firing Jordan) ─────
    {
      // Part A — the equity conversation (always gradable: dodging IS the failure)
      const EQ = ["jordan_equity_mention", "jordan_equity_worry", "jordan_equity_counter_jordan",
        "jordan_equity_5050_interject", "jordan_equity_split", "jordan_equity_alex",
        "jordan_equity_alex_why", "jordan_equity_counter_alex", "jordan_equity_counter_alex_50",
        "equity_signing"];
      const answered = EQ.filter((id) => acted.has(id)).length;
      const dodged = EQ.filter((id) => wasIgnored(id)).length;
      const skipped = jordan && jordan.flags.equity_skipped; // arc defaulted because you went quiet
      const split = jordan && jordan.flags.equity_proposal;
      const brokePromise = jordan && jordan.flags.reassured && chose("jordan_equity_counter_jordan", "hold_40");

      let eqScore = 0, eqDetail;
      if (!s.jordan_equity) {
        eqScore = answered > 0 ? 20 : 5;
        eqDetail = "You never signed a founder agreement — every week without one, the ambiguity compounded" +
          (s.jordan_resolved ? ", and when Jordan left, Alex asked what you were even building on." : ".");
      } else {
        eqScore = 40;                                        // it got signed
        eqScore += Math.round(30 * (answered / Math.max(1, answered + dodged)));
        if (skipped) { eqScore = Math.min(eqScore, 35); }
        if (answered >= 3 && !skipped) eqScore += 15;        // you actually sat in the conversation
        if (split === "40/40/20") eqScore += 10;             // matched risk to reward and said it out loud
        if (split === "50/25/25") eqScore -= 10;             // grabbed half before there was anything to grab
        if (brokePromise) eqScore -= 20;                     // "you're an equal partner" … then held her at 20%
        eqDetail = skipped
          ? "You went quiet on equity and the split defaulted to equal thirds — that conversation happened without you."
          : `You settled equity at ${split || "a split"} and signed${brokePromise ? " — after telling Jordan she was an equal partner, then holding her at 20%. She remembered." : "."}` +
            " Nobody set up vesting — the omission every founder regrets.";
        eqScore = clamp(eqScore, 0, 100);
      }

      // Part B — the other conversation founders dodge: the half-committed co-founder
      const jordanFaced = !!(s.jordan_drifting || s.jordan_resolved);
      let jScore = null, jDetail = "";
      if (!jordanFaced) {
        jDetail = " Jordan's commitment problem never came to a head — you ran out of road before that one.";
      } else if (s.jordan_resolved) {
        jScore = 55;
        const fireW = choseWeek("jordan_confrontation", "fire");
        const driftW = surfacedW.get("jordan_drift_start");
        const drag = fireW != null && driftW != null ? fireW - driftW : null;
        if (chose("jordan_fulltime_ask", "pressure")) jScore += 10;  // named the dealbreaker out loud
        if (drag != null && drag <= 4) jScore += 15;
        else if (drag != null && drag <= 8) jScore += 8;
        if (chose("jordan_confrontation", "defer")) jScore -= 10;    // "one more sprint" — you both knew
        if (!s.jordan_cleanup_needed) jScore += 20;                  // lawyer, buyback, clean cap table
        jScore = clamp(jScore, 0, 100);
        jDetail = " And when Jordan stopped earning her stake, you had that conversation too" +
          (drag != null && drag > 8 ? ` — though only after ${drag} weeks of Alex covering for her` : "") +
          (s.jordan_cleanup_needed
            ? "; her equity is still on the cap table, and every investor who looks will ask."
            : ", then paid the lawyer and cleaned the cap table.");
      } else {
        jScore = jordan && jordan.flags.confrontation_done ? 5 : 15; // Alex forced it and you ducked
        jDetail = jordan && jordan.flags.confrontation_done
          ? " But when Alex brought you the Jordan conversation, you never had it — he stopped asking, and that silence was expensive."
          : " But Jordan drifted for weeks and the confrontation never happened — avoiding the decision was a decision.";
      }

      const score = jScore == null ? eqScore : Math.round(eqScore * 0.6 + jScore * 0.4);
      cats.push({
        key: "hard_conversations", label: "Have the Hard Conversations",
        score: clamp(score, 0, 100), detail: eqDetail + jDetail,
        lesson: "The equity talk, the firing — dodging a hard conversation doesn't resolve it, it just moves it somewhere more expensive. And always set up vesting.",
        ref: "Noam Wasserman, The Founder's Dilemmas; Michael Seibel on co-founder breakups",
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

    // ── 3. Build Something People Want ───────────────────────────────────────
    // The core loop as one lesson: talk to users, scope small and ship, then
    // let what they do (not what they say) redirect you to the real product.
    {
      // Part A — "people want", before launch: get out of the building
      let disc = 0;
      const bits = [];
      if (founder && founder.flags.interviews_done) {
        const w = choseWeek("founder_first_interviews", "interview");
        disc += 30 + (w != null && w <= 3 ? 5 : 0);
        bits.push(`ran customer interviews${w != null ? ` in week ${w}` : ""}`);
      }
      if (s.met_priya) { disc += 20; bits.push("met Priya at the meetup"); }
      disc += Math.min(20, (s.user_depth_count || 0) * 10);
      if (s.user_depth_count) bits.push("watched real users use the product");
      if (chose("alex_sync_discover")) { disc += 10; bits.push("spent sprints on discovery"); }
      if (s.dont_scale_done) { disc += 10; bits.push("hand-made the first matches yourself"); }
      if (chose("waitlist_cold", "reach")) { disc += 5; bits.push("kept the waitlist warm"); }
      disc = clamp(disc, 0, 100);
      const discDetail = bits.length
        ? "You " + bits.join(", ") + "."
        : "You never talked to a user — everything you built was a guess, and the guesses compounded.";

      // Part B — "build something": scope small, ship it
      let scope, scopeDetail;
      const waits = (acted.get("good_enough_launch") || []).filter((a) => a.option === "wait").length;
      if (s.dev_plan == null) {
        scope = 15;
        scopeDetail = "No build plan ever got locked, the roadmap drifted, and the market never got a vote.";
      } else if (s.dev_plan === "full") {
        scope = 25;
        scopeDetail = "You picked the full plan: twice the scope, twice the weeks, zero extra learning.";
      } else {
        scope = 75;
        if (chose("dev_planning_session", "sprint")) scope += 5;   // saw through the 'do it all in sprints' decoy
        if (s.launched) scope += 15; else scope = Math.min(scope, 45);
        scope -= waits * 8;                                        // "two more weeks" — the polish trap
        scopeDetail = "You scoped lean" + (s.launched
          ? (waits ? ` but stalled ${waits} time${waits === 1 ? "" : "s"} at the launch door.` : " and shipped the moment it was good enough.")
          : " but never launched — a perfect product nobody used.");
      }
      scope = clamp(scope, 0, 100);

      // Part C — "people want", after launch: hear the signal and pivot.
      // The decision now lives on pivot day (the post-launch summit): credit for
      // the listening that preceded it (analytics, Maya's call, evidence chips
      // played in the room) and for deciding — decisively, not by hedge or drift.
      const pivotFaced = s.launched || faced("pivot_open") ||
        faced("post_match_dropoff") || faced("pivot_day_decide") ||
        s.activities_pivot || s.pivot_shipped;
      let piv = null, pivDetail;
      if (!pivotFaced) {
        pivDetail = "The market never got the chance to tell you Plan A was wrong.";
      } else {
        piv = 0;
        if (chose("post_match_dropoff")) piv += 20;               // read the analytics signal, didn't scroll past
        if (chose("slide_maya_call", "call")) piv += 15;          // called the first churned user
        if (chose("churn_interview", "call")) piv += 10;          // called the churned subscriber
        if (s.evidence_chip && s.evidence_chip !== "gut") piv += 15;  // argued pivot day with receipts, not vibes
        if (s.activities_pivot) piv += 30;
        if (s.pivot_deferred) piv -= 20;
        if (s.pivot_hedged && !s.activities_pivot) piv -= 10;
        if (s.pivot_shipped) piv += 25;
        piv = clamp(piv, 0, 100);
        pivDetail = s.pivot_shipped
          ? "When the data said matches were going nowhere, you pivoted and shipped v2 — the product users had been describing all along."
          : s.activities_pivot
            ? "You committed to the pivot but v2 never shipped — the insight died in the backlog."
            : s.pivot_hedged
              ? "At the summit you hedged — an activities tab bolted onto the deck — and got neither the pivot nor the focus."
              : s.pivot_deferred
                ? "The signal was there — matches going nowhere — and you rode Plan A anyway."
                : "The drop-off data and the churn calls were pointing somewhere; you never followed them.";
      }

      const score = piv == null
        ? Math.round(disc * 0.5 + scope * 0.5)
        : Math.round(disc * 0.3 + scope * 0.3 + piv * 0.4);
      cats.push({
        key: "mspw", label: "Build Something People Want",
        score: clamp(score, 0, 100),
        detail: `${discDetail} ${scopeDetail} ${pivDetail}`,
        lesson: "The whole game in one line: talk to users, scope small, ship fast — and when what they do contradicts your plan, the plan is what's wrong. Product-market fit is the only thing that matters.",
        ref: "Paul Graham / YC: “Make something people want”; Steve Blank; Marc Andreessen; Eric Ries",
      });
    }

    // ── 4. Features Won't Save You ───────────────────────────────────────────
    // The post-launch flailing traps: when traction stalls, the wrong answers
    // are one more feature and your competitor's roadmap. Each trap the player
    // actually faced contributes its weight; never tempted → "never faced".
    {
      const comp = [];   // { w: weight, v: 0–100, txt: detail clause }
      if (faced("competitor_launch")) {
        let v, txt;
        if (s.copied_competitor) {
          v = 5; txt = "When Flare raised $3M you copied their features — building for their users, not yours; Twitter called you a clone";
        } else if (s.competitive_intel) {
          v = 100; txt = "When Flare raised $3M you studied them instead of copying — their breadth became your wedge";
          if (s.moat_answered && chose("investor_moat_question", "niche"))
            txt += ", and that homework won the investor's moat question";
        } else if (chose("competitor_launch", "compare")) {
          v = 70; txt = "You answered Flare's launch with a comparison piece and held your position";
        } else if (chose("competitor_launch", "ignore")) {
          v = 60; txt = "You ignored Flare's launch and stayed on your roadmap";
        } else {
          v = 35; txt = "Flare launched into your space and you never even formed a response";
        }
        comp.push({ w: 30, v, txt });
      }
      if (faced("competitor_growing")) {
        let v, txt;
        if (chose("competitor_growing", "calls")) {
          v = 100; txt = "When your own subscribers asked for Flare's video dates, you called them and found the real need underneath";
        } else if (chose("competitor_growing", "discount")) {
          v = 55; txt = "You answered the Flare pressure with discounts — loyalty bought, question dodged";
        } else if (chose("competitor_growing", "ignore")) {
          v = 40; txt = "You waved off your subscribers' Flare questions and lost a couple of them";
        } else {
          v = 15; txt = "Your subscribers asked about Flare's features and heard nothing back";
        }
        comp.push({ w: 20, v, txt });
      }
      if (faced("feature_request_custom")) {
        let v, txt;
        if (chose("feature_request_custom", "build")) {
          v = 10; txt = "You built video dates for one loud power user — weeks of WebRTC for one person's workflow";
        } else if (chose("feature_request_custom", "negotiate")) {
          v = 85; txt = "You turned a one-off feature demand into a lightweight version everyone used";
        } else if (chose("feature_request_custom", "decline")) {
          v = 100; txt = "You said no to the pay-double feature ask and let the customer churn — clarity on what NOT to build";
        } else {
          v = 30; txt = "The power user's feature ask sat unanswered until they left for Flare";
        }
        comp.push({ w: 20, v, txt });
      }
      if (faced("feature_spree")) {
        const held = chose("feature_spree", "no");
        comp.push({
          w: 20, v: held ? 100 : 10,
          txt: held
            ? "And when the graph went flat, you held the roadmap until you knew why users leave"
            : "And when the graph went flat, you let Alex ship streaks-by-Friday — the numbers didn't move",
        });
      }
      if (s.pivot_hedged) {
        comp.push({
          w: 20, v: 10,
          txt: "When pivot day forced a direction, you hedged — an activities tab bolted onto the swipe deck, both halves mediocre",
        });
      }
      if (faced("feature_cluster")) {
        const built = chose("feature_cluster", "build");
        comp.push({
          w: 10, v: built ? 100 : 30,
          txt: built
            ? "But when three strangers asked for the same thing unprompted, you built it — that one was signal, not noise"
            : "Three strangers asked for the same thing unprompted and you let it slide — that one was real signal",
        });
      }

      let score = null, detail;
      if (comp.length === 0) {
        detail = "You never got far enough for the temptations to show up — Flare, the feature asks, the flat-graph panic all live past launch.";
      } else {
        const wSum = comp.reduce((t, c) => t + c.w, 0);
        score = Math.round(comp.reduce((t, c) => t + c.v * c.w, 0) / wSum);
        detail = comp.map((c) => c.txt).join(". ") + ".";
      }
      cats.push({
        key: "focus", label: "Features Won't Save You",
        score: score == null ? null : clamp(score, 0, 100), detail,
        lesson: "When traction stalls, the answer is never one more feature and never your competitor's roadmap — it's understanding your users. Say no by default; build what clusters.",
        ref: "Jason Fried & DHH, Getting Real (“say no by default”); Jeff Bezos: obsess over customers, not competitors",
      });
    }

    // ── 5. Build Your Edge, Buy the Rest ─────────────────────────────────────
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

    // ── 6. Raise Early, Find Your Lead ───────────────────────────────────────
    {
      // Part A — friends & family, before you need it
      const asks = [];
      if (chose("ff_family", "ask") || chose("ff_family_2", "ask") || chose("ff_family_3", "ask"))
        asks.push({ who: "your parents", week: choseWeek("ff_family", "ask") ?? choseWeek("ff_family_2", "ask") ?? choseWeek("ff_family_3", "ask") });
      if (chose("ff_friend_ask", "ask")) asks.push({ who: "Jamie", week: choseWeek("ff_friend_ask", "ask") });
      if (chose("ff_mentor_pitch", "pitch")) asks.push({ who: "David", week: choseWeek("ff_mentor_pitch", "pitch") });

      let ff = asks.length * 25;
      const firstAsk = asks.length ? Math.min(...asks.map((a) => a.week ?? 99)) : null;
      if (firstAsk != null) ff += firstAsk <= 4 ? 25 : firstAsk <= 8 ? 15 : 5;
      ff = clamp(ff, 0, 100);
      const ffDetail = asks.length === 0
        ? "You never asked friends or family — the people who already believed in you were the cheapest money you'll ever not raise."
        : `You asked ${asks.map((a) => a.who).join(", ")} — first ask in week ${firstAsk}.` +
          (asks.length === 3 ? " Every early door, knocked on." : "");

      // Part B — the seed round: leads vs followers
      const invFaced = faced("investor_intro_warm") || s.marcusCommitted;
      let inv = null, invDetail;
      if (!invFaced) {
        invDetail = " No real investor ever surfaced — your network never got warm enough to produce one.";
      } else if (s.marcusCommitted) {
        inv = s.followerCommitted ? 100 : 88;
        invDetail = s.followerCommitted
          ? " Then you landed Marcus — and the moment he committed, Fatima 'decided' too. That ordering was never a coincidence."
          : " Then you landed Marcus, the one investor in your pipeline who actually leads.";
      } else {
        inv = 20;
        if (chose("investor_intro_warm", "call")) inv += 20;
        if (s.deck_ready) inv += 20;
        if (chose("investor_ready", "meet")) inv += 10;
        const marcusFlags = chars.get("marcus") ? chars.get("marcus").flags : {};
        if (marcusFlags.intro_moved_on) inv -= 20;
        if ((s.investor_warmth || 0) < 30) inv -= 10;
        inv = clamp(inv, 0, 100);
        const chasedFollowers = (chose("fatima_deck") || chose("fatima_meeting")) && marcusFlags.intro_moved_on;
        invDetail = marcusFlags.intro_moved_on
          ? " Marcus — your only lead — moved on while you " + (chasedFollowers ? "took meeting after meeting with Fatima, who never invests first." : "left his messages sitting.")
          : " You worked the investor pipeline but never got your lead to commit" +
            (chose("fatima_deck") ? " — and Fatima, however interested she sounded, was always waiting for someone else to go first." : ".");
      }

      const score = inv == null ? ff : Math.round(ff * 0.5 + inv * 0.5);
      cats.push({
        key: "fundraising", label: "Raise Early, Find Your Lead",
        score: clamp(score, 0, 100), detail: ffDetail + invDetail,
        lesson: "Raise from people who trust you before you need it. Then find the investor who leads — the rest are a herd, and the herd follows the first commitment.",
        ref: "Paul Graham, “How to Fund a Startup” + “How to Raise Money”",
      });
    }

    // ── 7. Stay Default Alive ────────────────────────────────────────────────
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

  const api = { scoreGame, CATEGORY_COUNT: 7 };
  if (typeof module !== "undefined") module.exports = api;
  else window.Scoring = api;
})();
