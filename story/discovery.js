// ─────────────────────────────────────────────────────────────────────────────
// story/discovery.js — the discovery-mode payoff chain (what Alex finds when
// you give him sprints for user calls), the post-launch research habit, the
// reference-customer chain, the Jordan pairing card, and solo mode (the game after
// Alex walks).
//
// The pivot_insight ladder is gated on Alex actually being in discover focus
// (alex_sync_discover in story/team.js is the switch) — research isn't a
// checkbox, it's sprints you chose not to spend building.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const discovering = (s, e, char) => char.focus === "discover" && e.weeksSince("alex_sync_discover") >= 2;

  // The Jordan pairing card (founder_codebuild, below).
  const JORDAN_PACE = 0.4; // world.js's JORDAN_PACE: her share of a full week on the v2 board
  const CODEBUILD_MAX = 2, CODEBUILD_GAP = 6, CODEBUILD_WINDOW = 2;
  const jordanOnBoard = (s, e) => {
    const b = s.items && s.items.plans_ui;
    return !!(s.activities_pivot && s.launched && b && b.status === "todo" && b.assignee === "jordan");
  };
  // Before the pivot she always has a column (the iPhone app, then its fixes);
  // after it, only while the v2 board she claimed is still hers to finish.
  const jordanOwnsWork = (s, e) =>
    jordanOnBoard(s, e) || (!s.activities_pivot && e.done("dev_plan"));
  const nothingElseOpen = (e) => e.order.every(id => id === "founder"
    || !e.open[id] || !e.options(e.open[id].nodeId).length);
  // The week each offer opened. Re-shows within one offer's window (a story
  // beat took the founder's slot, then handed it back) are the same offer.
  const codebuildOffers = (e) => {
    const starts = [];
    for (const l of e.log) {
      if (l.surfaced !== "founder_codebuild") continue;
      if (!starts.length || l.week - starts[starts.length - 1] >= CODEBUILD_WINDOW) starts.push(l.week);
    }
    return starts;
  };

  const mod = {
    nodes: [

      // ── WHAT DISCOVERY TURNS UP (Alex in discover focus) ─────────────────────
      {
        id: "first_interview_shock", char: "alex",
        text: "just got off a customer interview. the real frustration isn't finding matches — it's that conversations go nowhere. they matched with 20 people last month and went on zero dates. they'd pay $200/month for something that actually got them to a date.",
        when: { if: (s, e, char) => s.week <= 8 && !s.has_demo && char.focus === "discover" },
        choices: [
          {
            key: "pivot", label: "Pivot — focus on getting people to dates",
            effects: { signal: 15, marketFit: 11 },
            fx: () => "Pivoted focus to conversation quality and date-booking. Three more interviews confirmed it. Some earlier work won't carry over.",
          },
          {
            key: "stay", label: "Stay the course",
            effects: { signal: 5 },
            fx: () => "Filed it away. Not ready to pivot on one data point. Logged it for later.",
          },
        ],
        timeout: {
          weeks: 2,
          effects: { signal: -15 },
          say: { char: "alex", text: "had 2 more interviews. same thing — people are matching but never going on dates. we're solving the wrong problem." },
        },
      },
      {
        id: "cold_silence", char: "alex",
        text: "posted in 5 subreddits and messaged 30 people who complained about dating apps. 0 real responses — not even 'not interested.' is the message wrong, or are we targeting the wrong people?",
        when: { if: (s, e, char) => s.week >= 2 && s.week <= 12 && !s.launched && s.signal < 50 && char.focus === "discover" },
        choices: [
          {
            key: "rewrite", label: "Rewrite the outreach",
            effects: { signal: 10, marketFit: 5 },
            fx: () => "Rewrote the outreach. New version leads with the pain — 'you've matched with dozens of people and gone on zero dates' — not the product. First reply came in 4 hours.",
          },
        ],
        timeout: {
          weeks: 2,
          effects: { signal: -10, char: { alex: { morale: -8 } } },
          say: { char: "alex", text: "week 2 of silence. i'm starting to wonder if the people who complain about dating apps actually want anything different." },
        },
      },
      {
        id: "random_reframe", char: "alex",
        text: "talked to a stranger at a coffee shop about what we're building. they reframed it completely — 'sounds less like a dating app, more like a vetting tool.' different pitch, different product. we both went quiet. it kind of makes more sense.",
        when: { if: (s, e, char) => s.week <= 12 && s.signal < 55 && char.focus === "discover" },
        choices: [
          {
            key: "test", label: "Test the new framing",
            effects: { signal: 12, marketFit: 6, char: { alex: { flags: { reframe_resolved: true } } } },
            fx: () => "Ran the new framing by 3 more people. All 3 immediately got it. Updated the positioning.",
          },
        ],
      },
      {
        id: "pivot_insight_1", char: "alex",
        text: "been talking to users all week and something keeps coming up. they're not frustrated by matching — they're frustrated that matches go nowhere. we've been solving the wrong part.",
        when: { if: (s, e, char) => discovering(s, e, char) && s.market_fit >= 8 },
        choices: [
          {
            key: "pivot", label: "Pivot — rethink the approach",
            effects: { marketFit: 15, signal: 8 },
            fx: () => "Rethought the approach. The real problem is conversation quality, not match quantity. Signal improved immediately.",
          },
          {
            key: "stay", label: "Stay the course",
            journal: "Logged the feedback but staying the course for now. Alex isn't convinced either.",
                        fx: () => "Stayed the course. Alex logged the feedback but we're not changing direction yet.",
          },
        ],
        timeout: {
          weeks: 2,
          effects: { marketFit: -5, signal: -8 },
          say: { char: "alex", text: "users keep saying the same thing. i'm worried we're building the wrong product." },
        },
      },
      {
        id: "pivot_insight_2", char: "alex",
        text: "second round of interviews done. consistent: they want depth on one thing, not breadth. scope's too wide — they're not seeing the core value.",
        // Fit thresholds here are on engine.addFit's diminishing scale (30 ≈ the
        // old flat 35, 42 ≈ the old 55).
        when: { after: ["pivot_insight_1"], if: (s, e, char) => discovering(s, e, char) && s.market_fit >= 30 },
        choices: [
          {
            key: "pivot", label: "Narrow scope — go deep",
            effects: { marketFit: 11, signal: 10 },
            fx: () => "Narrowed scope significantly. Less ambitious but far more right. Three users asked for exactly this.",
          },
          {
            key: "stay", label: "Ship the broader version",
                        fx: () => "Decided to ship the broader scope. Market fit isn't perfect but you're moving.",
          },
        ],
        timeout: {
          weeks: 2,
          effects: { marketFit: -8, signal: -5 },
          say: { char: "alex", text: "still not hearing the right signal from users. i think we're talking to the wrong people." },
        },
      },
      {
        id: "pmf_lock", char: "alex",
        text: "three users said the exact same thing unprompted this week: 'i actually went on a date because of this.' never seen that before. i think we finally know what to build.",
        // "three users went on a date because of this" needs users, which needs
        // a launched product. Without the clause a stalled pre-launch run that
        // ground its market_fit up through interviews could hear Alex report
        // dates from an app nobody outside the team had ever opened.
        when: {
          after: ["pivot_insight_2"],
          if: (s, e, char) => discovering(s, e, char) && s.market_fit >= 42 && s.launched,
        },
        choices: [
          {
            key: "lock", label: "Lock in the direction",
            journal: "Locked in. Three users said the same thing unprompted this week: 'I actually went on a date because of this.' This is the product. Now build it right.",
            effects: { marketFit: 9, signal: 15 },
            fx: () => "Locked in. This is the product. Now build it right.",
          },
        ],
      },

      // ── POST-LAUNCH RESEARCH HABIT ───────────────────────────────────────────
      {
        id: "founder_user_depth", char: "founder", ambient: true,
        text: "you've been shipping for weeks but making decisions from support emails. you don't actually know how your users experience dating on plusone — are they going on dates? are they happy with their matches?",
        when: {
          cooldown: 6,
          if: (s, e) => s.launched && (s.users >= 5 || s.customers >= 2) && e.timesResolved("founder_user_depth") < 2,
        },
        choices: [
          {
            key: "deep", label: "Five sessions — watch them use it",
            effects: { marketFit: 6, signal: 6 },
            fx: (s, e) => e.timesResolved("founder_user_depth") === 0
              ? "Five sessions done. Two users showed you patterns you didn't expect — they message matches in bursts, then go silent for days. You found why 30% quit in week 2 and fixed it immediately."
              : "Five sessions done. Same burst-then-silence pattern, but this time you found where drop-off happens later in the conversation — users who don't get a reply within 48 hours almost never come back. Adjusted the nudge timing.",
          },
          {
            key: "survey", label: "Send a structured survey",
            journal: "Sent a structured survey. 60% response rate. Useful signal, but nothing I didn't already suspect.",
            effects: { marketFit: 4, signal: 3 },
            fx: () => "Survey sent. 60% response rate. Useful signal, but nothing you didn't already suspect.",
          },
        ],
      },

      // ── THE REFERENCE CHAIN: testimonial → website social proof ─────────────
      {
        id: "reference_checkin", char: "founder", ambient: true,
        text: "your reference user has been on plusone for 3 weeks. they've been on two dates. time to collect that story while the experience is fresh.",
        when: {
          if: (s, e) => s.reference_customer && !s.testimonial
            && (e.weeksSince("first_customer_offer") >= 3 || e.weeksSince("dont_scale_seed") >= 3),
        },
        choices: [
          {
            key: "call", label: "Schedule a call, get the full story",
            effects: { marketFit: 2, signal: 6, flags: { testimonial: true } },
            fx: () => "One hour call. They walked you through what actually leads to a date on plusone — two patterns you hadn't designed around. And a quote you can use anywhere.",
          },
          {
            key: "email", label: "Ask over email",
            journal: "Asked the reference customer for a testimonial over email. Short paragraph back — honest and usable.",
            effects: { signal: 3, flags: { testimonial: true } },
            fx: () => "They sent a short paragraph. Honest and usable. Not as rich as a call, but it's real.",
          },
        ],
      },
      {
        id: "website_social_proof", char: "founder", ambient: true,
        text: "your website still leads with features and a tagline. you now have a real story — someone who went on their first date in years because of plusone. features tell, stories sell.",
        when: { if: (s) => !!s.testimonial && !s.website_updated },
        choices: [
          {
            key: "rebuild", label: "Rewrite around the customer story",
            effects: { signal: 10, flags: { website_updated: true } },
            fx: () => "Website rebuilt. The top of the homepage is now the customer quote. Features moved to a second page. More visitors signed up right away.",
          },
        ],
      },

      // ── PAIRING WITH JORDAN (her part-time pace, felt) ───────────────────────
      // Alex is full-time; Jordan builds at night around her day job. This
      // card is one of the few places the player feels that before the pivot
      // night names it: her part of the build sits still, and the founder can
      // spend a week covering for her. Pairing helps, so it isn't a trap — it
      // just costs an action, and it never fixes the pace. Shown only while
      // she owns open work (her column before the pivot, or the v2 board she
      // claimed), at most twice a run, 6+ weeks apart, and withdrawn after 2
      // weeks unanswered. A standing offer (no timeout) so it
      // still yields the founder's slot to story beats.
      {
        id: "founder_codebuild", char: "founder", ambient: true,
        text: (s, e) => (codebuildOffers(e).length < 2
          ? "jordan's part of the board hasn't moved since last week. she only gets to it at night, after work. you can code — spend this week building alongside her."
          : "her column is still the one that's open. you could jump in again."),
        when: {
          cooldown: CODEBUILD_GAP,
          if: (s, e) => {
            if (!e.cast.get("jordan").active || !jordanOwnsWork(s, e)) return false;
            // A stalled run can reach a week where nobody else has anything to
            // ask (the founder's thread is polled last). This card has always
            // been what fills it, so the cap doesn't apply there — the
            // no-dead-air invariant (test_narrative Layer C) outranks rarity.
            if (nothingElseOpen(e)) return true;
            const offers = codebuildOffers(e);
            if (!offers.length) return true;
            const since = s.week - offers[offers.length - 1];
            if (since < CODEBUILD_WINDOW) return true;  // this offer is still on the table
            return since >= CODEBUILD_GAP && offers.length < CODEBUILD_MAX;
          },
        },
        choices: [
          {
            key: "pair", label: "Code with Jordan this week",
            effects: { char: { jordan: { morale: 5 } } },
            fx(s, e) {
              const board = jordanOnBoard(s, e);
              if (board) s.board_progress = (s.board_progress || 0) + (1 - JORDAN_PACE); // a full week, this once
              else e.cast.get("jordan").buildEffort += 1.0;
              return "Two nights on the " + (board ? "board" : "app") + " with Jordan, 9pm to 1am. She's fast and careful. She also fell asleep on Thursday's call.";
            },
          },
          {
            key: "demos", label: "Run demos instead",
            effects: { signal: 4 },
            fx(s) {
              if (!s.launched) s.waitlist += 3; else s.users += 3;
              return "Ran 3 demos. 3 people signed up. Jordan's column stayed where it was.";
            },
          },
        ],
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.STORY = window.STORY || []).push(mod);
})();
