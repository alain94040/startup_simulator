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
        id: "sarah_intro", char: "sarah",
        text: "it's about 18,000 members, weekly events, real trust in the group — not just a feed people scroll. heard through a mutual you're rebuilding around real-world plans, which is basically what my events already are. want to talk about debuting the new version at one of them? i'm also talking to flare, so let me know soon.",
        when: { if: (s, e) => e.chapter === 4 && s.pivot_week != null && s.week >= s.pivot_week + 1 },
        choices: [
          {
            key: "reply", label: "Meet with Sarah now",
            reply: "let's talk. we just rebuilt the whole app around real-world plans — your events might be exactly where it belongs.",
            journal: "Met with Sarah — she's holding a slot at her next event for the v2 debut. That's our relaunch stage if we want it.",
            effects: {
              signal: 7, flags: { sarah_onboard: true },
              say: { char: "sarah", text: "i've got a slot at my next event for the v2 debut — it's yours if you want it." },
            },
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
