// ─────────────────────────────────────────────────────────────────────────────
// v2/story/fundraising.js — the endgame money beats: the YC application and
// its verdict, plus Sarah (the post-pivot community connector).
//
// The game runs on a fixed horizon: s.deadline_week (25). The application
// window opens three weeks out on the YC thread; submitting schedules the
// verdict letter to land entering deadline week. The verdict is earned, not
// rolled: YC reads the run's report card (engine.gradeScore(), the same 0-100
// rollup the endgame shows) and takes B+ and better. Not applying is a choice
// with its own ending — world.js closes every run at the deadline either way,
// and the report card prints regardless.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  // Minimum report-card grade (0-100 rollup, per V2Scoring) for YC admission.
  // 80 is a B+ on the endgame scale (A ≥ 85, B ≥ 70), so YC takes the top of
  // the B band and better.
  const YC_ADMISSION_GRADE = 80;

  const mod = {
    nodes: [

      // ── SARAH — the post-pivot connector ─────────────────────────────────────
      {
        id: "sarah_intro", char: "sarah", from: "Sarah (mutual)",
        text: "sarah runs a 'singles in SF' facebook group — 18,000 members, weekly events, huge trust in the community. she heard about kindred from a mutual and wants to explore promoting it to her members. she's also talking to flare. you have until friday.",
        when: { if: (s) => s.launched && s.activities_pivot },
        choices: [
          {
            key: "reply", label: "Meet with Sarah now",
            journal: "Met with Sarah — she runs a singles community of 18,000 members. She liked the product and agreed to feature kindred at her next event. 12 signups in the first week.",
            effects: { users: 12, signal: 7 },
            fx: () => "Met with Sarah. She liked the product and agreed to feature kindred in her next event. 12 signups in the first week. She's now a connector you can rely on.",
          },
        ],
        timeout: {
          weeks: 1,
          effects: { signal: -8 },
          say: { char: "sarah", text: "went with flare — they got back to me faster. let me know if you want to revisit." },
        },
      },

      // ── YC — the application and the verdict ─────────────────────────────────
      {
        id: "yc_apply", char: "yc", from: "Y Combinator",
        text: (s) => "Applications close week " + s.deadline_week + " — one batch, hard deadline, no make-up round. What you're building in the dating space, why you, what you've learned from your users. Takes a focused day to do well.",
        when: { if: (s) => s.week >= s.deadline_week - 3 && !s.ycApplied },
        choices: [
          {
            key: "submit", label: "Submit the application",
            journal: "YC application submitted. Decisions go out on deadline week.",
            fx(s, e) {
              s.ycApplied = true;
              // The verdict letter lands entering deadline week, graded off the
              // report card as it stands that morning.
              e.schedule({
                in: Math.max(1, s.deadline_week - s.week),
                unless: (st) => st.game_over || st.game_won,
                fx(st, en) {
                  const grade = en.gradeScore();
                  if (grade != null && grade >= YC_ADMISSION_GRADE) {
                    st.ycAccepted = true;
                    st.cash += 500000;
                    st.signal = Math.min(100, st.signal + 25);
                    en.say({ char: "yc", from: "Y Combinator", text: "You're in. Welcome to the batch — $500k for 7%. See you at kickoff." });
                  } else {
                    st.ycRejected = true;
                    en.say({ char: "yc", from: "Y Combinator", text: "Thanks for applying — we're passing. We look at thousands of these; the ones that come back are the companies that kept going. Whatever kindred becomes, this application wasn't the end of it." });
                  }
                },
              });
              return "Application submitted. Decisions go out week " + s.deadline_week + ".";
            },
          },
        ],
        // Left unanswered, the deadline simply arrives — world.js ends the run
        // and the endgame narrates the application you never sent.
        timeout: { weeks: 4 },
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.V2STORY = window.V2STORY || []).push(mod);
})();
