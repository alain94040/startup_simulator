// ─────────────────────────────────────────────────────────────────────────────
// story/fundraising.js — Sarah (the relaunch channel, met mid-rebuild).
//
// The game runs on a fixed horizon: s.deadline_week (25). There is no
// application to write — the run is graded automatically the moment the
// deadline arrives (world.js, using engine.gradeScore()); this file just
// carries the one pre-deadline beat that still lands here for historical
// reasons (Sarah's channel, which the pivot relaunch can use as its stage).
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const mod = {
    nodes: [

      // ── SARAH — the relaunch channel ─────────────────────────────────────────
      // Lands mid-rebuild: meeting her banks the relaunch-day option (v2 debuts
      // at her event — see pivot_relaunch in story/pivot_day.js). Ignoring her
      // hands the community to Flare.
      {
        id: "sarah_intro", char: "sarah", from: "Sarah (mutual)",
        text: "sarah runs a 'singles in SF' facebook group — 18,000 members, weekly events, huge trust in the community. she heard through a mutual that plusone is rebuilding around real-world plans, and that's exactly what her events are. she wants to talk about debuting the new version at one of them. she's also talking to flare.",
        when: { if: (s, e) => e.chapter === 4 && s.pivot_week != null && s.week >= s.pivot_week + 1 },
        choices: [
          {
            key: "reply", label: "Meet with Sarah now",
            reply: "let's talk. we just rebuilt the whole app around real-world plans — your events might be exactly where it belongs.",
            journal: "Met with Sarah — 18,000 singles, weekly events, and she got the pivot in one sentence: 'so the app is the plan now.' She's holding a slot at her next event for the v2 debut. That's our relaunch stage if we want it.",
            effects: { signal: 7, flags: { sarah_onboard: true } },
            fx: () => "Met with Sarah. She got the pivot instantly — 'so the app is the plan now.' She's holding a slot at her next event for the v2 debut. Your relaunch has a stage, if you want it.",
          },
        ],
        timeout: {
          weeks: 2,
          effects: { signal: -8 },
          say: { char: "sarah", text: "went with flare — they got back to me faster. let me know if you want to revisit." },
        },
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.STORY = window.STORY || []).push(mod);
})();
