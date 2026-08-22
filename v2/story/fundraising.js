// ─────────────────────────────────────────────────────────────────────────────
// v2/story/fundraising.js — the endgame money beats: the YC application and
// its verdict, plus Sarah (the relaunch channel, met mid-rebuild).
//
// The game runs on a fixed horizon: s.deadline_week (25). The application
// window opens two weeks out on the YC thread, and it is one button: you
// apply, and you find out. There is no application scene and no waiting letter
// — the run is the application, and by the time the button appears every
// answer it could contain has already been decided by play. A questionnaire
// here would only ask the player to summarize themselves, and a delay would
// only ask them to wait.
//
// The verdict is earned, not rolled: YC reads the run's report card
// (engine.gradeScore(), the same 0-100 rollup the endgame shows) and takes B+
// and better — provided the company exists (launched, pivot shipped, someone
// paying).
//
// Hearing back is NOT the ending. world.js closes every run entering deadline
// week and the report card prints there, so a founder who gets in at week 23
// still has the rest of the run to play — and one who applies the day the
// button appears is graded on the company as it stood that day. Applying is
// therefore a real call about whether the company is finished, not a formality
// to get out of the way. Not applying at all is its own ending.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  // Minimum report-card grade (0-100 rollup, per V2Scoring) for YC admission.
  // 80 is a B+ on the endgame scale (A ≥ 85, B ≥ 70), so YC takes the top of
  // the B band and better.
  const YC_ADMISSION_GRADE = 80;

  const mod = {
    nodes: [

      // ── SARAH — the relaunch channel ─────────────────────────────────────────
      // Lands mid-rebuild: meeting her banks the relaunch-day option (v2 debuts
      // at her event — see pivot_relaunch in story/pivot_day.js). Ignoring her
      // hands the community to Flare.
      {
        id: "sarah_intro", char: "sarah", from: "Sarah (mutual)",
        text: "sarah runs a 'singles in SF' facebook group — 18,000 members, weekly events, huge trust in the community. she heard through a mutual that kindred is rebuilding around real-world plans, and that's exactly what her events are. she wants to talk about debuting the new version at one of them. she's also talking to flare.",
        when: { if: (s, e) => e.chapter === 4 && s.pivot_week != null && s.week >= s.pivot_week + 1 },
        choices: [
          {
            key: "reply", label: "Meet with Sarah now",
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

      // ── YC — the application, and the verdict in the same breath ────────────
      // One node, one button. Everything a real application would ask about —
      // what you learned, why this team, how you'll grow — is already sitting
      // in the facts ledger, so the button reads it there instead of asking the
      // player to type it back. The verdict is immediate for the same reason:
      // nothing between submitting and hearing could change the answer, so the
      // wait was only a wait.
      {
        id: "yc_apply", char: "yc", from: "Y Combinator",
        text: (s) => "Applications close week " + s.deadline_week + " — one batch, hard deadline, no make-up round. The form asks what you've learned from your users, why this team, and how you'll grow; you've spent " + (s.week - 1) + " weeks answering all three. Partners read the company as it stands the day you send it, so the only question left is whether it's finished.",
        // Opens two weeks out, not three: at three the button appeared in the
        // same week as the co-founder conversation, and a founder should not be
        // firing someone and applying to YC in one turn.
        when: { if: (s) => s.week >= s.deadline_week - 2 && !s.ycApplied },
        choices: [
          {
            key: "submit", label: "Apply to Y Combinator",
            journal: "Applied to Y Combinator. Every answer on the form was something that actually happened to this company.",
            fx(s, e) {
              s.ycApplied = true;
              // Admission needs both: a company that exists (live product,
              // shipped pivot, someone paying) AND a report card at B+ or
              // better. Wise decisions without a shipped company don't get
              // funded; GOALS.md's "to win, a pivot is required" is this line.
              const grade = e.gradeScore();
              const qualified = s.launched && s.pivot_shipped && s.customers >= 1;
              if (qualified && grade != null && grade >= YC_ADMISSION_GRADE) {
                s.ycAccepted = true;
                s.cash += 500000;
                s.signal = Math.min(100, s.signal + 25);
                e.say({
                  char: "yc", from: "Y Combinator",
                  text: "You're in. Welcome to the batch — $500k for 7%. See you at kickoff."
                    + (s.maya_quote ? " PS — the partner who read your application repeated your churned user's line in the meeting. Answers like that are why you're in the room."
                      : s.pivot_shipped ? " PS — 'we killed our own product while we could still afford to.' That sentence did most of the work."
                        : ""),
                });
              } else {
                s.ycRejected = true;
                e.say({
                  char: "yc", from: "Y Combinator",
                  text: !qualified
                    ? "Thanks for applying — we're passing. We fund launched products with users who pay; the application reads like a company that's still ahead of you. The ones that come back are the founders who shipped anyway."
                    : "Thanks for applying — we're passing. We look at thousands of these; the ones that come back are the companies that kept going. Whatever kindred becomes, this application wasn't the end of it.",
                });
              }
              // The verdict is immediate; the RUN is not. world.js still closes
              // every run entering deadline week, so hearing back early doesn't
              // cost the player the weeks they have left — it just tells them
              // what those weeks are for. The report card prints at week 25
              // either way.
              return s.ycAccepted
                ? "You hit submit. The reply comes back the same day: you're in."
                : "You hit submit. The reply comes back the same day, and it's a no.";
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
