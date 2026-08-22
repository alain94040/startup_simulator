// ─────────────────────────────────────────────────────────────────────────────
// story/dev_directions.js — the rest of the direction-decision spine:
// the matching build-vs-buy (Jordan's red flag), the ranking question (the
// core-IP call, research-gated), Jordan's iOS sprints, and the post-demo trio
// (analytics build-vs-buy, seed strategy, trust & safety).
//
// Dependency notes:
//  - ranking rides `took: [["matching_choice:build", "matching_choice:@ignored"]]`
//    — both paths leave the engine owned; licensing kills the question entirely.
//  - the iOS sprints are two nodes chained on effort thresholds, replacing the
//    old single card with a count flag and per-option available() gates.
//  - C-options are gated on the founder's research: interviews or *fresh*
//    waitlist calls (a later "skip" outcome overwrites "call", going stale —
//    exactly the freshness rule the old recent_user_signal_week flag encoded).
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const freshResearch = (s, e) =>
    e.took("interviews:interview")
    || (e.took("waitlist_calls:call") && e.weeksSince("waitlist_calls") <= 6);

  const mod = {
    nodes: [

      // ── BUILD vs BUY: MATCHING (the core → BUILD is right) ──────────────────
      // Jordan pushes to license the *core* matching engine — an early red flag.
      // Licensing is a black box that can't be re-tuned for the pivot; it bites
      // later (applyActivitiesPivot, ported with the pivot arc).
      {
        id: "matching_choice", char: "jordan",
        text: "sprint 2 direction, my two cents. found something — MatchKit. they license a ready-made recommendation engine; we'd have matching working in days instead of weeks. alex will hate this because he hand-rolls everything, that's what CTOs do. but why reinvent the wheel? i say we plug it in.",
        when: {
          after: ["dev_plan"], delay: 1,
          if: (s, e) => !s.has_demo && e.weeksSince("dev_plan") <= 6,
        },
        choices: [
          {
            key: "build", label: "No — matching is the whole product, we build it",
            reply: "no. the matching engine *is* plusone — it's the one thing we can't outsource. we build it ourselves.",
            journal: "Overruled Jordan — we build the matching engine ourselves. Slower, but it's the one thing that makes us us, and Alex was relieved we're not renting our own product.",
            effects: { flags: { matching_owned: true }, char: { jordan: { morale: -3 }, alex: { morale: 5, effort: 1.0 } } },
            fx(s) {
              if (s.items && s.items.matching_algo) s.items.matching_algo.note = "Building our own — the IP";
              return "Overruled Jordan — we build the matching engine ourselves. Slower, but it's the IP, the one thing we can't outsource. Alex was visibly relieved.";
            },
          },
          {
            key: "license", label: "Good find — license it and ship faster",
            reply: "nice find. plug in MatchKit — if we can ship matching in days, let's not waste weeks on it.",
            journal: "Took Jordan's lead and licensed MatchKit for matching. Working in days — but it's a black box everyone else can rent too, and Alex went quiet. Outsourcing the core might be a decision I regret.",
            effects: {
              flags: { matching_licensed: true },
              saas: { label: "MatchKit license", cost: 100 },
              char: { jordan: { morale: 5 }, alex: { morale: -8 } },
              say: { char: "alex", text: "saw the MatchKit contract go through. it's our whole product and we just rented it. hope the demo's worth it." },
            },
            fx(s) {
              if (s.items && s.items.matching_algo) {
                s.items.matching_algo.status = "done"; s.items.matching_algo.quality = "generic";
                s.items.matching_algo.assignee = null; s.items.matching_algo.note = "Licensed: MatchKit · $100/wk";
              }
              return "Licensed MatchKit. Matching working in days — but it's a black box everyone else can rent too. $100/wk, and Alex went quiet.";
            },
          },
        ],
        // Ignored: Alex steps in and builds the core himself; Jordan's idea quietly dropped.
        timeout: {
          weeks: 3,
          effects: { flags: { matching_owned: true }, char: { alex: { morale: 3 } } },
          fx(s) { if (s.items && s.items.matching_algo) s.items.matching_algo.note = "Building our own — the IP"; },
        },
      },

      // ── DIRECTION: WHAT DO WE RANK ON? (the core-IP question) ───────────────
      // Only exists if the engine stayed ours (built, or Alex's default after
      // the ignore). The C-option is the research payoff.
      {
        id: "ranking", char: "alex",
        text: "matching engine update: it runs end to end — profiles in, pairs out. one problem. the scoring function is literally `return Math.random()`. before i write the real one i need product direction, not code: what makes two people a good plusone match?",
        when: {
          took: [["matching_choice:build", "matching_choice:@ignored"]],
          if: (s) => !s.has_demo && !s.launched,
        },
        choices: [
          {
            key: "proximity", label: "Distance, age, availability — the standard stack",
            reply: "keep it simple. distance, age range, shared availability — the stuff every app ranks on. it works.",
            effects: { marketFit: 2, char: { alex: { effort: 1.2 } } },
            fx(s) {
              if (s.items && s.items.matching_algo) s.items.matching_algo.note = "Ranks distance + availability";
              return "Alex shipped the standard ranking in two days. It works. It's also exactly what every other app does.";
            },
          },
          {
            key: "interests", label: "Shared interests — climbers see climbers first",
            reply: "interest overlap. two people who both climb at 7am should see each other first.",
            effects: { marketFit: 3, char: { alex: { effort: 1.2 } } },
            fx(s) {
              if (s.items && s.items.matching_algo) s.items.matching_algo.note = "Ranks interest overlap";
              return "Interest-overlap scoring went in over the weekend. Reasonable, defensible — and still a guess about what makes matches actually work.";
            },
          },
          {
            key: "conversation", label: "Rank on conversation odds — the research answered this",
            if: freshResearch,
            reply: "neither. every conversation with users says the same thing — matches don't fail at the match, they die in the chat. rank on conversation odds: profile specificity, question-askers, people who actually reply. optimize the first message, not the first look.",
            journal: "Gave Alex the ranking thesis straight from the research: optimize for the conversation, not the match. He went quiet, then called it 'actually a thesis.' The engine ranks conversation odds now — nobody else's does.",
            effects: {
              marketFit: 8, signal: 4,
              char: { alex: { effort: 1.2, flags: { ranking_thesis: true } } },
              say: { char: "alex", text: "huh. that's… actually a thesis. i can proxy it — specificity score on the profile text now, response-rate signal once we have real data. writing it tonight." },
            },
            fx(s) {
              if (s.items && s.items.matching_algo) s.items.matching_algo.note = "Ranks conversation odds (from research)";
              return "The ranking thesis came straight out of the research: optimize the first message, not the first look. Alex is proxying it with profile-text specificity until there's real response data. No other app ranks on this.";
            },
          },
        ],
        // Ignored: Alex guesses — competently, but generically.
        timeout: {
          weeks: 3,
          effects: {
            char: { alex: { morale: -4 } },
            schedule: {
              in: 2, char: "alex",
              say: { char: "alex", text: "fyi — i shipped distance-based ranking because we never talked about it. it works. it's also exactly what every other app does." },
            },
          },
          fx(s) { if (s.items && s.items.matching_algo) s.items.matching_algo.note = "Ranks distance (Alex's default)"; },
        },
      },

      // ── JORDAN'S iOS SPRINTS (two effort-gated milestones) ───────────────────
      {
        id: "ios_sprint_1", char: "jordan",
        text: "iOS milestone — the shell works: profile screens, photo upload, the first-screen flow. now i need a call on next sprint. i can polish what people will *see* at the demo, or i can start wiring the backend — login, the matching API, messaging. tempo or truth?",
        when: { after: ["first_screen"], if: (s, e, char) => !s.has_demo && char.buildEffort >= 2 },
        choices: [
          {
            key: "demo_polish", label: "Polish the demo surface",
            reply: "polish what they'll see. the demo has to feel good in someone's hand — we get one first impression.",
            effects: { signal: 4, marketFit: 2, char: { jordan: { effort: 1.0 } } },
            fx(s) {
              if (s.items) {
                if (s.items.ios_ui) { s.items.ios_ui.status = "done"; s.items.ios_ui.quality = "solid"; s.items.ios_ui.note = "Polished for the demo"; }
                if (s.items.ios_server) s.items.ios_server.status = "active";
              }
              return "Jordan spent the sprint on feel — transitions, haptics, the photo grid. The demo build is genuinely nice to hold. The backend wiring waits a week.";
            },
          },
          {
            key: "wire_backend", label: "Wire the backend first",
            reply: "wire the backend first. a pretty shell with fake data is a lie we'd be telling ourselves.",
            effects: { char: { jordan: { effort: 1.4 } } },
            fx(s) {
              if (s.items) {
                if (s.items.ios_ui) { s.items.ios_ui.status = "done"; s.items.ios_ui.quality = "solid"; }
                if (s.items.ios_server) { s.items.ios_server.status = "active"; s.items.ios_server.note = "Wiring first, polish later"; }
              }
              return "Jordan went straight at the integration — login, matching API, messaging. Less shine at the demo, but the app is real all the way down.";
            },
          },
        ],
        // Ignored: she picks for herself and the milestone still lands — but the
        // facts ledger remembers nobody answered.
        timeout: {
          weeks: 3,
          fx(s) {
            if (s.items) {
              if (s.items.ios_ui) { s.items.ios_ui.status = "done"; s.items.ios_ui.quality = "rough"; }
              if (s.items.ios_server) s.items.ios_server.status = "active";
            }
          },
        },
      },
      {
        id: "ios_sprint_2", char: "jordan",
        text: "iOS is wired to the backend now — login, matching, and messaging all flowing through the API. same experience as web. ready to open it up.",
        when: { after: ["ios_sprint_1"], if: (s, e, char) => char.buildEffort >= 5 },
        choices: [
          {
            key: "ack", label: "Good — keep the momentum",
            effects: { signal: 3, flags: { ios_unblocked: true }, char: { jordan: { effort: 1.0 } } },
            fx(s) {
              if (s.items && s.items.ios_server) { s.items.ios_server.status = "done"; s.items.ios_server.quality = "solid"; }
              return "iOS feature-complete — login, matching, and messaging all wired through the API. Same experience as web. Ready to open it up.";
            },
          },
        ],
        timeout: {
          weeks: 3,
          effects: { flags: { ios_unblocked: true } },
          fx(s) { if (s.items && s.items.ios_server) { s.items.ios_server.status = "done"; s.items.ios_server.quality = "solid"; } },
        },
      },

      // ── BUILD vs BUY: ANALYTICS (commodity → buy is right; buying buys sight) ─
      // Buying instrumentation surfaces the post-match drop-off early — the
      // pivot signal. Building it leaves you blind until it's too late.
      {
        id: "analytics_choice", char: "alex",
        text: "demo night bugged me. the only reason i saw her session at all is that i was tailing logs by hand. the testflight group is a dozen people and i can't tell you what a single one of them does in the app — and on launch day it'll be hundreds of strangers. i can wire an analytics SDK in a day — $30/wk, dashboards tomorrow. or i build our own event pipeline: a week of my time, free forever, and i kind of want to own our data anyway.",
        when: { if: (s) => s.has_demo && !s.launched },
        choices: [
          {
            key: "buy", label: "Drop in an analytics SDK",
            reply: "drop in the SDK. i want to see what users actually do, not guess. the monthly cost is nothing next to shipping blind.",
            effects: { flags: { analytics_live: true }, saas: { label: "Analytics SDK", cost: 30 }, char: { alex: { effort: 1.0 } } },
            fx(s) {
              if (s.items && s.items.analytics) { s.items.analytics.status = "done"; s.items.analytics.quality = "bought"; s.items.analytics.assignee = null; s.items.analytics.note = "Bought: SDK · $30/wk"; }
              return "Analytics SDK live in a day — funnels, retention, event tracking. Now we can see what's actually happening instead of guessing.";
            },
          },
          {
            key: "build", label: "Build our own dashboard",
            reply: "build our own — no point paying monthly when you can do it yourself.",
            effects: { char: { alex: { effort: -2.0 } } },
            fx(s) {
              if (s.items && s.items.analytics) { s.items.analytics.status = "active"; s.items.analytics.assignee = "alex"; s.items.analytics.note = "Building our own pipeline"; }
              return "Alex started building an analytics dashboard. His plate was already full — and we're flying half-blind until it's done.";
            },
          },
        ],
        timeout: {
          weeks: 3,
          fx(s) { if (s.items && s.items.analytics) { s.items.analytics.status = "active"; s.items.analytics.assignee = "alex"; } },
        },
      },

      // ── DIRECTION: WHERE DO WE SHIP? (cold-start density, made visible by data) ─
      {
        id: "seed_strategy", char: "alex",
        text: (s, e) => {
          const informed = s.analytics_live || freshResearch(s, e);
          return informed
            ? "launch mechanics. we always assumed we launch here — we live here, we can seed the first hundred by hand, jordan can host a mixer. but i pulled the waitlist by city and… austin has almost three times as many people on it as our own city. none of us has ever set foot in austin. do we launch where we live, or where the demand is?"
            : "launch mechanics. a dating app opening to an empty room is a ghost town — first person in sees an empty deck, closes the app, never comes back. one city to start, right? here at home, where we can seed the room by hand. or do we just open the doors everywhere and pray?";
        },
        when: { after: ["analytics_choice"], if: (s) => s.has_demo && !s.launched && s.beachhead == null },
        choices: [
          {
            key: "local", label: "Launch here — hometown advantage",
            reply: "here. hometown advantage is real — we seed the first hundred by hand, host the mixer, fix things in person.",
            effects: { marketFit: 3, flags: { beachhead: "narrow", seed_strategy: "local" }, char: { alex: { effort: 0.8 } } },
            fx: () => "One city: ours. Invite waves by neighborhood, a launch mixer you can drive to, bugs fixed across a coffee table. Small top line, dense room.",
          },
          {
            key: "everywhere", label: "Open everywhere — momentum is the story",
            reply: "open it everywhere. momentum is the story — we densify later.",
            effects: { signal: 5, flags: { beachhead: "broad", seed_strategy: "open" }, char: { alex: { effort: 0.8 } } },
            fx: () => "Open signups, no gates. The launch-day number will look great. Whether anyone finds a match within 50 miles is a different question.",
          },
          {
            key: "waitlist_city", label: "Launch where the waitlist lives — Austin",
            if: (s, e) => s.analytics_live || freshResearch(s, e),
            reply: "austin. the waitlist already voted — demand beats home-field advantage. we run it remote, fly out for launch week, and every invite lands somewhere dense.",
            journal: "The waitlist data made the launch call for us: Austin, where our signups actually are — three times our home city. We're launching a dating app in a city none of us has set foot in, because that's where the demand lives.",
            effects: {
              marketFit: 4, waitlist: 4,
              flags: { beachhead: "narrow", seed_strategy: "austin", launch_city: "Austin" },
              char: { alex: { effort: 0.8 } },
              say: { char: "alex", text: "booked two flights to austin for launch week. jordan found a bar for the mixer on yelp. this is either very smart or very funny." },
            },
            fx: () => "Austin it is — invite waves by neighborhood, launch-week flights booked, a mixer venue picked off Yelp. Every invite lands somewhere dense enough to matter.",
          },
        ],
        // Ignored: Alex plans around home by default — without ever checking the data.
        timeout: {
          weeks: 3,
          effects: {
            flags: { beachhead: "narrow", seed_strategy: "local" },
            schedule: {
              in: 2, char: "alex",
              say: { char: "alex", text: "we never picked a launch city so i'm planning around here. hope that's right — nobody ever actually checked where the waitlist lives." },
            },
          },
        },
      },

      // ── DIRECTION: TRUST & SAFETY (App Store review forces the safety call) ──
      // The C-option is gated on community engagement (s.community_engaged_count,
      // written by the hacker_news chains — ports in a later pass; until then the
      // option simply never unlocks, which is correct).
      {
        id: "trust_safety", char: "jordan",
        text: "not a fun one. i started the app store review paperwork for the launch build and apple wants our safety story — user-generated content moderation, reporting, blocking. what we have is: nothing. i saved the form as a draft and stared at it for a while. so: a report button now and verification later, or do verification properly before we launch?",
        when: { if: (s) => s.has_demo && !s.launched },
        choices: [
          {
            key: "report_now", label: "Report button this sprint, verify later",
            reply: "report button this sprint. it answers apple honestly — verification can come after launch, we can't gate the release behind a feature we haven't built.",
            effects: { marketFit: 2, char: { jordan: { effort: 1.0 } } },
            fx(s) {
              if (s.items && s.items.ios_ui) s.items.ios_ui.note = (s.items.ios_ui.note ? s.items.ios_ui.note + " · " : "") + "Report button pre-launch";
              return "Report + block shipped in three days. Not deep, but real — the app review form has an honest answer now, and so does the first person who'll ever need that button.";
            },
          },
          {
            key: "verify_first", label: "Full verification before launch",
            reply: "verification before launch. the day strangers show up is the day it has to already work — one bad first week and the women never come back.",
            effects: { marketFit: 4, char: { jordan: { effort: 0.6 } } }, // real scope — it costs build time
            fx: () => "Photo verification goes in before launch. It costs a chunk of Jordan's sprint — the launch-ready date slips — but the safety story is real before a single stranger is in the app.",
          },
          {
            key: "verify_flagship", label: "Verification as THE feature — the threads called it",
            if: (s) => (s.community_engaged_count || 0) >= 2,
            reply: "look at every dating thread we've been in — fake profiles are the top complaint, every single time. photo verification at signup, checkmark on the card, and we *lead* with it. it's not a safety feature, it's the brand.",
            journal: "Made the call from the community threads: verification isn't a safety checkbox, it's the brand. Photo-verified at signup, checkmark on every card. Every thread we engaged had fake profiles as complaint #1 — now it's our headline.",
            effects: { marketFit: 6, waitlist: 3, char: { jordan: { effort: 1.2 } } },
            fx(s) {
              if (s.items && s.items.ios_ui) s.items.ios_ui.note = (s.items.ios_ui.note ? s.items.ios_ui.note + " · " : "") + "Verified-only (from community)";
              return "Verification became the headline: photo-verified at signup, checkmark on every card, 'no fakes' on the landing page. Three waitlist signups came in the day the copy changed.";
            },
          },
        ],
        // Ignored: the app review deadline forces a bare minimum, shipped alone.
        timeout: {
          weeks: 3,
          effects: {
            marketFit: -3,
            char: { jordan: { morale: -6, trust: -4 } },
            schedule: {
              in: 2, char: "jordan",
              say: { char: "jordan", text: "app review wouldn't wait, so i shipped a bare report button on my own and submitted. it deserved an actual decision — this is the feature that decides whether women stay past week one." },
            },
          },
        },
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.STORY = window.STORY || []).push(mod);
})();
