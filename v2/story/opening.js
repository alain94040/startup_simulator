// ─────────────────────────────────────────────────────────────────────────────
// v2/story/opening.js — week 1-3: the kickoff and the paperwork.
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

  const incorporateChoice = {
    key: "atlas", label: "Incorporate via Stripe Atlas — $500",
    reply: "do it. stripe atlas, delaware c-corp. let's get this done today.",
    journal: "Filed through Stripe Atlas. Delaware C-corp, EIN, bank account in two days. $500 gone, but we're a real company now.",
    effects: { cash: -500, flags: { incorporated: true } },
    fx: () => "Delaware C-corp registered. EIN assigned, bank account open. $500 gone — you're officially a company.",
  };

  const mod = {
    nodes: [
      {
        id: "start_prototype", char: "alex",
        text: "three of us in the same room for the first time since we decided to do this for real. time to stop talking. i'm ready on the backend. jordan's offered to take the iOS side. one word from you and this becomes real.",
        choices: [
          {
            key: "build", label: "Game on — everyone start building",
            reply: "let's do this. you take backend, jordan takes iOS. i'll handle everything else. game on.",
            journal: "Told the team to start building today. Alex took profiles and matching, Jordan's on iOS, I'll cover everything else. We're shelving the activity-planning idea — it's really a second product. Core first.",
            fx(s) {
              kickoff(s);
              return "Alex is on profiles and matching. Jordan's on the iOS build. Activity planning goes on the backlog — that's a second product. You're building the core first.";
            },
          },
        ],
        // Ignored: they start anyway — you just weren't the one who said go.
        timeout: { weeks: 2, fx(s) { kickoff(s); } },
      },
      {
        id: "incorporate", char: "alex",
        text: "before we do anything else — all three of us need a legal entity. no bank account, no contracts, no equity split without one. Stripe Atlas is the fastest path: Delaware C-corp, EIN, bank account in two days.",
        when: { after: ["start_prototype"] },
        choices: [incorporateChoice],
        timeout: {
          weeks: 3,
          effects: { char: { alex: { morale: -4 } } },
          say: { char: "alex", text: "we still don't have a legal entity. can't split equity or sign anything without one." },
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
  else (window.V2STORY = window.V2STORY || []).push(mod);
})();
