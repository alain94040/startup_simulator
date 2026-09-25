// ─────────────────────────────────────────────────────────────────────────────
// story/opening.js — week 1-3: the kickoff and the paperwork.
// Standalone nodes (no arc): the prototype kickoff gates everything downstream
// via `after: ["start_prototype"]`, and incorporation shows the ignored-path
// pattern — "@ignored" is an outcome other nodes can chain on (incorporate_again).
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  function kickoff(s) {
    s.activities_cut = true;
    s.items = {
      matching_algo: { status: "active", quality: null, assignee: "alex" },
      api_design:    { status: "todo",   quality: null, assignee: "alex" },
      auth:          { status: "todo",   quality: null, assignee: null },
      ios_ui:        { status: "active", quality: null, assignee: "jordan" },
      ios_server:    { status: "todo",   quality: null, assignee: "jordan" },
    };
  }

  // Filing is what makes the split a live question — the Atlas form asks who
  // owns what — so Jordan's equity opener is pulled into the same week instead
  // of waiting for the boundary (`effects.surface`). Alex's own card says it:
  // "no equity split without one."
  const incorporateChoice = {
    key: "atlas", label: "Register the company online — $500",
    payee: "Stripe Atlas",
    reply: "do it. let's get the paperwork done today.",
    journal: "Registered the company through Stripe Atlas. Tax number, bank account, two days. $500 gone, but we're a real company now.",
    effects: { cash: -500, flags: { incorporated: true }, surface: "equity_open" },
    fx: () => "Company registered. Tax number assigned, bank account open. $500 gone — you're officially a company.",
  };

  const mod = {
    nodes: [
      {
        id: "start_prototype", char: "alex",
        text: "three of us in the same room for the first time since we decided to do this for real. time to stop talking. i'll build the engine behind the app — accounts, matching, the stuff nobody sees. jordan's offered to build the iPhone app itself. one word from you and this becomes real.",
        choices: [
          {
            key: "build", label: "Game on — everyone start building",
            reply: "let's do this. you take the engine, jordan takes the iPhone app. i'll handle everything else. game on.",
            journal: "Told the team to start building today. Alex took profiles and matching, Jordan's on the iPhone app, I'll cover everything else. We're shelving the activity-planning idea — it's really a second product. Core first.",
            fx(s) {
              kickoff(s);
              return "Alex is on profiles and matching. Jordan's on the iPhone app. Activity planning goes on the someday list — that's a second product. You're building the core first.";
            },
          },
        ],
        // Ignored: they start anyway — you just weren't the one who said go.
        timeout: { weeks: 2, fx(s) { kickoff(s); } },
      },
      {
        // Jordan's own opener, so week 1 isn't Alex-only. No `when` —
        // eligible from turn one, same as start_prototype.
        id: "jordan_working_style", char: "jordan",
        text: "heads up — i still have my day job, so my hours are all over the place. want to do a quick call every morning so you know where i'm at? or should i just work when i can and text you if i get stuck?",
        choices: [
          {
            key: "standup", label: "Quick call every morning",
            reply: "let's do a quick 15-minute call every morning at 9. keeps us both honest while you're juggling the day job.",
            journal: "Set up a quick 15-minute call with Jordan every morning at 9. Keeps us both honest while she's juggling her day job.",
            effects: { char: { jordan: { morale: 5 } } },
            fx: () => "A quick call every morning at 9. Keeps both of you honest.",
          },
          {
            key: "async", label: "Your own hours — text me if stuck",
            reply: "work whenever it suits you, and text me if you get stuck. otherwise i'll leave you to it.",
            journal: "Told Jordan to work on her own schedule and text me if she gets stuck. Fewer interruptions, more time to focus.",
            fx: () => "Jordan works her own hours and texts when she's stuck. Fewer interruptions, more time to focus.",
          },
        ],
        timeout: { weeks: 1 },
      },
      {
        id: "incorporate", char: "alex",
        text: "before we do anything else — we need to become an actual company, on paper. no bank account, no contracts, no splitting ownership until we do. there's an online service, Stripe Atlas, that does the paperwork: company registered, tax number, bank account, in about two days.",
        when: { after: ["start_prototype"] },
        choices: [incorporateChoice],
        timeout: {
          weeks: 3,
          effects: { char: { alex: { morale: -4 } } },
          say: { char: "alex", text: "we still aren't a company on paper. can't split ownership or sign anything until we are." },
        },
      },
      {
        // The ignored path continues: Alex re-raises it two weeks later. Chaining
        // on "incorporate:@ignored" keeps the ignored branch a real story path
        // instead of a dead end.
        id: "incorporate_again", char: "alex",
        text: "second time i'm asking — we're still not a company. i'm not writing another line of code that legally belongs to nobody. can we just file the thing?",
        when: { took: ["incorporate:@ignored"], delay: 2, if: (s) => !s.incorporated },
        choices: [incorporateChoice],
        timeout: {
          weeks: 3,
          effects: { char: { alex: { morale: -6, trust: -4 } } },
        },
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.STORY = window.STORY || []).push(mod);
})();
