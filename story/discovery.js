// ─────────────────────────────────────────────────────────────────────────────
// story/discovery.js — the discovery-mode payoff chain (what Alex finds when
// you give him sprints for user calls), the post-launch research habit, the
// reference-customer chain, the pairing card, and solo mode (the game after
// Alex walks).
//
// The pivot_insight ladder is gated on Alex actually being in discover focus
// (alex_sync_discover in story/team.js is the switch) — research isn't a
// checkbox, it's sprints you chose not to spend building.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const discovering = (s, e, char) => char.focus === "discover" && e.weeksSince("alex_sync_discover") >= 2;

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
            effects: { signal: 15, marketFit: 14 },
            fx: () => "Pivoted focus to conversation quality and date-booking. Three more interviews confirmed it. Some earlier work won't carry over.",
          },
          {
            key: "stay", label: "Stay the course",
            effects: { signal: 5, marketFit: 3 },
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
            effects: { signal: 10, marketFit: 6 },
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
            effects: { signal: 12, marketFit: 8, char: { alex: { flags: { reframe_resolved: true } } } },
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
            effects: { marketFit: 25, signal: 8 },
            fx: () => "Rethought the approach. The real problem is conversation quality, not match quantity. Signal improved immediately.",
          },
          {
            key: "stay", label: "Stay the course",
            journal: "Logged the feedback but staying the course for now. Alex isn't convinced either.",
            effects: { marketFit: 5 },
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
        when: { after: ["pivot_insight_1"], if: (s, e, char) => discovering(s, e, char) && s.market_fit >= 35 },
        choices: [
          {
            key: "pivot", label: "Narrow scope — go deep",
            effects: { marketFit: 20, signal: 10 },
            fx: () => "Narrowed scope significantly. Less ambitious but far more right. Three users asked for exactly this.",
          },
          {
            key: "stay", label: "Ship the broader version",
            effects: { marketFit: 8 },
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
          if: (s, e, char) => discovering(s, e, char) && s.market_fit >= 55 && s.launched,
        },
        choices: [
          {
            key: "lock", label: "Lock in the direction",
            effects: { marketFit: 15, signal: 15 },
            fx: () => "Locked in. The product is the date, not the match — build it right.",
          },
        ],
      },

      // ── POST-LAUNCH RESEARCH HABIT ───────────────────────────────────────────
      {
        id: "founder_user_depth", char: "founder", ambient: true,
        text: "you've been shipping for weeks but making decisions from support tickets. you don't actually know how your users experience dating on plusone — are they going on dates? are they happy with their matches?",
        when: {
          cooldown: 6,
          if: (s, e) => s.launched && (s.users >= 5 || s.customers >= 2) && e.timesResolved("founder_user_depth") < 2,
        },
        choices: [
          {
            key: "deep", label: "Five sessions — watch them use it",
            effects: { marketFit: 8, signal: 6 },
            fx: (s, e) => e.timesResolved("founder_user_depth") === 0
              ? "Five sessions done. Two users showed you patterns you didn't expect — they message matches in bursts, then go silent for days. You found why 30% churn in week 2 and fixed it immediately."
              : "Five sessions done. Same burst-then-silence pattern, but this time you found where drop-off happens later in the conversation — users who don't get a reply within 48 hours almost never come back. Adjusted the nudge timing.",
          },
          {
            key: "survey", label: "Send a structured survey",
            journal: "Sent a structured survey. 60% response rate. Useful signal, but nothing I didn't already suspect.",
            effects: { marketFit: 5, signal: 3 },
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
            effects: { marketFit: 3, signal: 6, flags: { testimonial: true } },
            fx: () => "One hour call. They walked you through what actually leads to a date on plusone — two patterns you hadn't designed around. And a quote you can use anywhere.",
          },
          {
            key: "email", label: "Ask over email",
            journal: "Asked the reference customer for a testimonial over email. Short paragraph back — honest and usable.",
            effects: { signal: 3, flags: { testimonial: true } },
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
            fx: () => "Website rebuilt. Hero section is now the customer quote. Features moved to a second page. Conversion on the signup form jumped immediately.",
          },
        ],
      },

      // ── PAIRING WITH ALEX (the recurring build-together card) ────────────────
      {
        id: "founder_codebuild", char: "founder", ambient: true,
        text: (s, e) => {
          const n = e.timesResolved("founder_codebuild");
          if (n === 0) return "alex has been heads-down but the queue isn't shrinking. you can code — take this sprint and build alongside him.";
          if (n < 3) return "same situation as last time — queue still isn't moving fast enough. you could jump in again.";
          const extras = [
            "the queue's never fully empty. at some point pairing stops being a one-off and becomes the default way you ship.",
            "matching algorithm is getting slower as the user base grows. alex flagged it — not urgent yet, but a focused sprint together would close it.",
            "photo upload pipeline is still flaky for some devices. alex has it on the list but it keeps sliding. worth a sprint.",
          ];
          return extras[(n - 3) % extras.length];
        },
        when: {
          cooldown: 4,
          if: (s, e) => {
            const alex = e.cast.get("alex");
            return alex.active && alex.focus === "build" && e.done("dev_plan");
          },
        },
        choices: [
          {
            key: "pair", label: "Pair up this sprint",
            effects: { char: { alex: { morale: 8, effort: 0.5 } } },
            fx(s, e) {
              // Pairing on an owned matching engine sharpens the secret sauce —
              // far more if you know what to match on (research, GOALS.md).
              if (s.matching_owned && !s.launched) {
                const researched = e.took("interviews:interview") || e.cast.get("alex").focus === "discover";
                s.market_fit = clamp(s.market_fit + (researched ? 6 : 2), 0, 100);
                if (s.items && s.items.matching_algo && s.items.matching_algo.status !== "obsolete" && researched) {
                  s.items.matching_algo.quality = "solid";
                }
                return researched
                  ? "Paired with Alex on the matching engine — the core of PlusOne. Everything from the user interviews went straight into the ranking. Slow going, but it's ours and it's getting smarter."
                  : "Paired with Alex on the matching engine — the core of PlusOne. It's ours and improving, but without real user signal you're both half-guessing at what 'a good match' even means.";
              }
              return "Paired up. You worked on the profiles UI, Alex handled the matching algorithm. Your contribution was modest but Alex shipped faster with you there.";
            },
          },
          {
            key: "demos", label: "Run demos instead",
            effects: { signal: 4 },
            fx(s) {
              if (!s.launched) s.waitlist += 3; else s.users += 3;
              return "Ran 3 demos instead. 3 people signed up for early access. Alex kept building solo.";
            },
          },
        ],
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.STORY = window.STORY || []).push(mod);
})();
