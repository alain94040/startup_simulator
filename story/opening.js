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
    key: "atlas", label: "Incorporate via Stripe Atlas — $500",
    reply: "do it. stripe atlas, delaware c-corp. let's get this done today.",
    journal: "Incorporated: Delaware C-corp via Stripe Atlas, $500. We're a real company now.",
    effects: { cash: -500, flags: { incorporated: true }, surface: "equity_open" },
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
            journal: "The build starts today — core first. The activity-planning idea is shelved: it's a second product.",
            fx(s) {
              kickoff(s);
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
        text: "i'm still at my day job so my hours are weird. do we want a quick daily check-in so you know when i'm available? or just async and ping me when you need something?",
        choices: [
          {
            key: "standup", label: "Daily 15-min standup",
            reply: "let's do a daily 15-minute standup at 9am. keeps us both honest while you're still juggling the day job.",
            journal: "Daily 9am standup with Jordan while she juggles her day job.",
            effects: { char: { jordan: { morale: 5 } } },
          },
          {
            key: "async", label: "Async — ping when blocked",
            reply: "let's stay async — ping me when you're blocked, otherwise heads down.",
            journal: "Async with Jordan by default — ping when blocked.",
          },
        ],
        timeout: { weeks: 1 },
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
  else (window.STORY = window.STORY || []).push(mod);
})();
