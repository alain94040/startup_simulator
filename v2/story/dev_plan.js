// ─────────────────────────────────────────────────────────────────────────────
// v2/story/dev_plan.js — the dev arc opening: scope, the auth build-vs-buy
// lesson, and the first research-gated direction call.
//
// Everything here rides the facts ledger instead of hand-stamped weeks:
//  - the old `s.dev_start_week + n` windows become `after: ["dev_plan"], delay: n`
//  - the old `auth_build_start + 2` becomes `took: [auth_choice:build|@ignored], delay: 2`
//  - the old `founder.flags.interviews_done` gate becomes `e.took("interviews:interview")`
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  // The over-scoped (full/A) plan's tax: inert auto items the engine's build
  // burn-down completes passively, doubling time-to-product-ready.
  const SCOPE_ITEMS = ["scope_social", "scope_verification", "scope_premium", "scope_socialgraph", "scope_video"];
  function expandItems(s, plan) {
    if (!s.items || plan !== "full") return;
    for (const k of SCOPE_ITEMS) s.items[k] = { status: "todo", quality: null, assignee: null, auto: true };
  }

  const buyAuth = (s) => {
    if (s.items && s.items.auth) {
      s.items.auth.status = "done"; s.items.auth.quality = "bought";
      s.items.auth.assignee = null; s.items.auth.note = "Bought: hosted provider · $30/wk";
    }
  };

  const mod = {
    arcs: [
      {
        id: "dev",
        beats: [
          {
            id: "dev_plan", char: "alex",
            text: "couldn't sleep — mocked up three directions for kindred. tap through them and take a real look before we lock scope. which one do we actually build?",
            // Lands right after the equity signing — a week later if the split
            // left Alex grudging (anything but 40/40/20). No timeout: this is
            // the spine gate; Alex holds the question until he gets an answer.
            when: {
              after: ["equity_signing"],
              if: (s, e) => e.weeksSince("equity_signing") >= (s.equity_proposal === "40/40/20" ? 0 : 1),
            },
            mockups: {
              full:   { tag: "A", variant: "rich" },
              lean:   { tag: "B", variant: "minimal" },
              sprint: { tag: "C", variant: "generic" },
            },
            choices: [
              {
                key: "full", label: "Build version A",
                reply: "let's build A. activity layer, recommendations, all of it. i want us to know exactly what we're building before we go deeper.",
                fx(s) {
                  s.dev_plan = "full";
                  expandItems(s, "full");
                  return "Three-hour session. Whiteboard filled. Twenty-plus items in the backlog. Jordan's excited. Alex is skeptical but admits it looks thorough.";
                },
              },
              {
                key: "lean", label: "Build version B",
                reply: "let's build B. core hypothesis only — ship and learn. we can spec the rest when we know what works.",
                journal: "Kept the plan tight: ninety minutes, five items, core hypothesis only. Alex looked relieved. We can spec the rest once we know what works.",
                fx(s) {
                  s.dev_plan = "lean";
                  return "Ninety minutes. Five items on the board. Alex seemed relieved.";
                },
              },
              {
                // Hidden binary: C resolves to the same lean plan as B. The only
                // real decision is avoiding A (the over-scoped build).
                key: "sprint", label: "Build version C",
                reply: "let's build C. strip it to the essentials and ship — we can layer the rest on once it's working.",
                journal: "Kept the plan tight: ninety minutes, five items, core hypothesis only. Alex looked relieved. We can spec the rest once we know what works.",
                fx(s) {
                  s.dev_plan = "lean";
                  return "Ninety minutes. Five items on the board. Alex seemed relieved.";
                },
              },
            ],
          },

          // ── build vs buy: auth (commodity → buy is right) ────────────────────
          // Hidden binary. Buying (+$30/wk) is correct; letting Alex build it is
          // strictly worse — he runs late, you buy anyway AND lose ~2 weeks.
          {
            id: "auth_choice", char: "alex",
            text: "sprint 1 planning. first brick is accounts — login, account creation, password reset, social sign-in. i can hand-roll it, couple days tops, and we own it forever. or i wire up a hosted provider in an afternoon and we pay $30/wk for the privilege. your call — i genuinely don't mind building it. kind of want to, actually.",
            when: { after: ["dev_plan"] },
            choices: [
              {
                key: "buy", label: "Just buy a hosted auth provider",
                reply: "let's not reinvent the wheel. wire up a hosted provider — auth is a solved problem. the monthly fee is worth it.",
                effects: { saas: { label: "Auth provider", cost: 30 }, char: { alex: { effort: 1.0 } } },
                fx(s) {
                  buyAuth(s);
                  return "Hosted auth wired up in an afternoon — login, signup, reset, social sign-in. $30/wk for it, but it's done and it's solid. Alex grumbled about the fee, then spent the rest of the sprint on the matching engine.";
                },
              },
              {
                key: "build", label: "Let Alex build it himself",
                reply: "ok — build it, if you're sure it's just a few days.",
                effects: { char: { alex: { morale: 4 } } },
                fx(s) {
                  if (s.items && s.items.auth) { s.items.auth.status = "active"; s.items.auth.assignee = "alex"; s.items.auth.note = "Building our own"; }
                  return "Alex is building our own auth. He's sure it's a few days of work.";
                },
              },
            ],
            // If the founder doesn't say no, Alex optimistically starts building it.
            timeout: {
              weeks: 3,
              fx(s) {
                if (s.items && s.items.auth) { s.items.auth.status = "active"; s.items.auth.assignee = "alex"; }
              },
            },
          },
          {
            // Two weeks into hand-rolled auth, reality arrives. The dependency
            // covers both the explicit "build" answer and the ignored default.
            id: "auth_forced", char: "alex",
            text: "i'm behind. the auth thing is fighting me — oauth refresh tokens, password-reset edge cases, account recovery. it's eating the whole sprint. honestly... we should just buy it.",
            when: { took: [["auth_choice:build", "auth_choice:@ignored"]], delay: 2 },
            choices: [
              {
                key: "buy", label: "Tell him to buy it",
                reply: "stop — buy the hosted provider. we should've done that two weeks ago. let's move on.",
                journal: "Two weeks in, Alex was still fighting OAuth refresh tokens and password-reset edge cases. We bought the hosted provider in the end — same monthly fee we'd have paid on day one, plus two weeks of his time down the drain. Lesson logged.",
                effects: { saas: { label: "Auth provider", cost: 30 }, char: { alex: { effort: -2.4, morale: -4 } } },
                fx(s) {
                  buyAuth(s);
                  return "Bought the hosted provider in the end — same $30/wk we'd have paid on day one, plus two weeks of Alex's time gone. The throwaway code got tossed.";
                },
              },
            ],
            // Ignored too: he gives up and buys it himself — same cost, no decision made.
            timeout: {
              weeks: 3,
              effects: { saas: { label: "Auth provider", cost: 30 }, char: { alex: { effort: -2.4, morale: -4 } } },
              fx(s) { buyAuth(s); },
            },
          },

          // ── direction: the first screen (research-gated C-option) ────────────
          {
            id: "first_screen", char: "jordan",
            text: "first real iOS question. someone installs kindred, opens it — ten seconds later, what are they looking at? i can do a classic swipe deck: zero learning curve, demos great, i could have it in TestFlight friday. or a guided intake — five questions before we show a single face. slower, weirder, but it's a statement.",
            when: { after: ["dev_plan"], delay: 1, if: (s) => !s.has_demo },
            choices: [
              {
                key: "deck", label: "Swipe deck — zero learning curve",
                reply: "deck. zero learning curve. don't make people think on day one.",
                effects: {
                  waitlist: 1, char: { jordan: { effort: 1.0 } },
                  schedule: {
                    in: 2, char: "jordan",
                    say: { char: "jordan", text: "deck build's in TestFlight. showed my sister and her roommate — same reaction from both: 'nice — so it's like hinge?' not wrong. not great either." },
                  },
                },
                fx(s) {
                  if (s.items && s.items.ios_ui) s.items.ios_ui.note = "Swipe deck first";
                  return "Deck it is — in TestFlight by Friday, and everyone who opens it knows exactly what to do. Whether they know why it's different is another matter.";
                },
              },
              {
                key: "intake", label: "Guided intake — five questions first",
                reply: "intake. five questions before any faces. we're not another swipe app.",
                effects: { marketFit: 3, char: { jordan: { effort: 1.0 } } },
                fx(s) {
                  if (s.items && s.items.ios_ui) s.items.ios_ui.note = "Intake-first onboarding";
                  return "Intake-first. Riskier open — five questions before a single face — but nobody will mistake kindred for another swipe app.";
                },
              },
              {
                // The strictly-better option only exists if the founder did the
                // interviews — research buys build options (GOALS.md).
                key: "intake_interviews", label: "Intake — built from the interview questions",
                if: (s, e) => e.took("interviews:interview"),
                reply: "intake — and use the interview questions verbatim. open with 'how many matches went nowhere for you last month?' make them feel seen in ten seconds.",
                journal: "Gave Jordan the first screen straight from the interviews: open with the question every user we talked to already answered — 'how many matches went nowhere last month?' She built it word for word.",
                effects: {
                  marketFit: 7, signal: 3, char: { jordan: { effort: 1.2 } },
                  schedule: {
                    in: 1, char: "jordan",
                    say: { char: "jordan", text: "intake flow is live in TestFlight. my sister answered question 3 and screenshotted it to her group chat. first organic share we've ever had." },
                  },
                },
                fx(s) {
                  if (s.items && s.items.ios_ui) s.items.ios_ui.note = "Intake-first (from interviews)";
                  return "The interview questions became the first screen, word for word. Ten seconds in, a new user feels like the app already knows why they're here.";
                },
              },
            ],
            // Ignored: she ships the deck by default — and the testers ask the
            // question you never answered. Rework eats most of a sprint.
            timeout: {
              weeks: 3,
              effects: {
                char: { jordan: { morale: -6, trust: -4, effort: -1.0 } },
                schedule: {
                  in: 2, char: "jordan",
                  say: { char: "jordan", text: "you never picked a first screen so i shipped the swipe deck. showed it to three friends this week and all three asked the same question: 'so how is this different from hinge?' i didn't have an answer. rebuilding the intake — there goes most of the sprint." },
                },
              },
              fx(s) {
                if (s.items && s.items.ios_ui) { s.items.ios_ui.quality = "rough"; s.items.ios_ui.note = "Swipe deck (Jordan's default)"; }
              },
            },
          },
        ],
      },
    ],

    nodes: [
      // The research supply for the direction cards' C-options. Standalone: it
      // doesn't belong to the dev arc, it competes with it for the 2-action week.
      // Recurring research supply: calling the waitlist keeps the signal *fresh*.
      // The C-option gates elsewhere check `took("waitlist_calls:call")` plus
      // `weeksSince` — and a later "skip" outcome overwrites "call", going stale.
      {
        id: "waitlist_calls", char: "founder",
        text: (s) => "there are " + Math.max(5, (s.waitlist || 0) + 5) + " people between the waitlist and your early-access DMs, and you haven't spoken to one of them since the last round of calls. block an afternoon. call five.",
        when: {
          after: ["dev_plan"], delay: 2, cooldown: 4,
          if: (s, e) => !s.launched
            && (s.waitlist >= 3 || e.took("interviews:interview"))
            && e.timesResolved("waitlist_calls") < 4,
        },
        choices: [
          {
            key: "call", label: "Call five of them",
            effects: { signal: 6, marketFit: 4 },
            fx(s, e) {
              const rounds = [
                "Five calls. One woman keeps a spreadsheet of her matches across four apps — the HN thread wasn't exaggerating. Two others said nearly the same sentence, unprompted: 'I'm fine getting matches. Nothing ever happens after.' Logged.",
                "Five more calls. A teacher who deleted every app twice. A guy who wrote three drafts of a first message and sent none. The pattern doesn't move: getting matches isn't the problem — what comes after is.",
                "Another round of calls. Someone asked, dead serious, if kindred could just 'decide the first date for both of us.' Filed under: things users say that sound like jokes and aren't.",
              ];
              return rounds[e.timesResolved("waitlist_calls") % rounds.length];
            },
          },
          {
            key: "skip", label: "Not this week — the build needs you",
            journal: "Skipped the waitlist calls this week. The build needed me — but the research is going stale.",
            fx: () => "Skipped. The build got the afternoon instead — and the user signal gets a week staler.",
          },
        ],
      },

      {
        id: "interviews", char: "founder",
        text: "you've been building without a single structured conversation with someone who's used dating apps and given up. everything you think you know about what they want is a guess.",
        when: {
          if: (s, e) => !s.launched && s.incorporated 
            && s.week <= Math.max(8, e.done("dev_plan") ? e.weekOf("dev_plan") + 3 : 8),
        },
        choices: [
          {
            key: "interview", label: "Block off this week for 5 customer interviews",
            journal: "Blocked off the week for five customer interviews. Two insights I didn't expect, and one person said they'd pay right now if it existed. The picture's much clearer.",
            effects: { signal: 15, marketFit: 12, waitlist: 1 },
            fx: () => "5 calls done. Two insights you didn't expect. One person said they'd pay right now if it existed. Signal much clearer.",
          },
        ],
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.V2STORY = window.V2STORY || []).push(mod);
})();
