// ─────────────────────────────────────────────────────────────────────────────
// v2/story/fundraising.js — the endgame money beats: the YC application (a
// scene — the game's final exam) and its verdict, plus Sarah (the relaunch
// channel, met mid-rebuild).
//
// The game runs on a fixed horizon: s.deadline_week (25). The application
// window opens three weeks out on the YC thread; starting it enters the
// `application` scene — three real questions answered with evidence chips the
// run banked (Maya's quote, the cohort, the failed fixes, the channel tests),
// each with an always-available bluff. Submitting schedules the verdict letter
// to land entering deadline week; the letter quotes the answers back. The
// verdict is earned, not rolled: YC reads the run's report card
// (engine.gradeScore(), the same 0-100 rollup the endgame shows) and takes B+
// and better — provided the company exists (launched, pivot shipped, someone
// paying). Not applying is a choice with its own ending — world.js closes
// every run at the deadline either way, and the report card prints regardless.
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
        when: { if: (s, e) => s.launched && s.activities_pivot && !s.pivot_shipped && s.pivot_week != null && s.week >= s.pivot_week + 1 },
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

      // ── YC — the application (the game's final exam) and the verdict ─────────
      // Writing the application is a scene: three real questions answered with
      // evidence chips the run banked — the pivot-day mechanic, one last time.
      // Bluff options always exist; whether you NEED them is the whole game.
      {
        id: "yc_apply", char: "yc", from: "Y Combinator",
        text: (s) => "Applications close week " + s.deadline_week + " — one batch, hard deadline, no make-up round. Three questions carry it: what have you learned from your users, why this team, how will you grow. Takes a focused day to do well.",
        when: { if: (s) => s.week >= s.deadline_week - 3 && !s.ycApplied },
        choices: [
          {
            key: "start", label: "Clear the day — write it",
            journal: "Cleared the day for the YC application. Three questions, and every honest answer is something that happened to us this year.",
            effects: { scene: "application" },
            fx: () => "Blank form, three questions. Everything you could write in it already happened.",
          },
        ],
        // Left unanswered, the deadline simply arrives — world.js ends the run
        // and the endgame narrates the application you never sent.
        timeout: { weeks: 4 },
      },
    ],

    arcs: [
      {
        id: "application",
        scene: { cast: ["yc"] },
        beats: [
          {
            id: "app_q_learned", char: "yc", from: "The application",
            text: "Question 1 — the one they weigh most: \"What have you learned from the people you built this for?\" Every application answers it with the same three adjectives. The ones that get read twice quote somebody.",
            when: { took: ["yc_apply:start"] },
            choices: [
              {
                key: "maya", label: "Quote Maya, verbatim",
                if: (s) => !!s.maya_quote,
                journal: "Application, Q1: Maya's words, verbatim — 'I already have seven dead chat windows on Hinge. Kindred made me feel worse, not better.' Then what we built because of them. You can't fake a sentence like that.",
                effects: { signal: 3 },
                fx: (s) => { s.app_learned = "maya"; return "You write her words exactly as she said them, and then what you built because of them. It reads like nothing else in the pile."; },
              },
              {
                key: "cohort", label: "The cohort numbers — where they leave",
                if: (s) => !!(s.cohort_seen || s.analytics_dropoff_seen),
                journal: "Application, Q1: the cohort data. Users didn't leave before the match — they left right after it. We found the exact step, and rebuilt the product around it.",
                effects: { signal: 2 },
                fx: (s) => { s.app_learned = "cohort"; return "You write the number: they don't leave before the match, they leave right after it. Precision reads as competence."; },
              },
              {
                key: "fixes", label: "Growth can't fix retention — we tested it",
                if: (s) => !!(s.funnel_first || s.feature_spree || s.winback_flat),
                journal: "Application, Q1: we ran the growth experiments first — traffic pushes, win-back emails, a shiny feature. Every bump evaporated in a week. That's how we learned the product was the leak, and earned the pivot.",
                effects: { signal: 2 },
                fx: (s) => { s.app_learned = "fixes"; return "You list the failed fixes honestly — every bump that evaporated. Knowing what DIDN'T work is evidence too."; },
              },
              {
                key: "bluff", label: "\"We iterate fast and listen to feedback\"",
                journal: "Application, Q1: wrote 'we iterate fast and listen to feedback.' It's what every application says. Reading it back, I couldn't point to a single sentence a partner would remember.",
                fx: (s) => { s.app_learned = "bluff"; s.app_bluffs = (s.app_bluffs || 0) + 1; return "You write the sentence every application has. Reading it back, there's nothing in it a reader would remember."; },
              },
            ],
          },
          {
            id: "app_q_team", char: "yc", from: "The application",
            text: "Question 2: \"Why are you the right founders for this?\" They don't mean your résumés. They mean: what did you do when it got hard?",
            choices: [
              {
                key: "killed", label: "We killed our own product in time",
                if: (s) => !!s.pivot_shipped,
                journal: "Application, Q2: when the data said our product was the problem, we killed it — while there was still cash to survive the rebuild — and shipped v2 before this deadline. Most founders can't erase their own whiteboard. We did.",
                effects: { signal: 3 },
                fx: (s) => { s.app_why = "killed"; return "The strongest sentence available to any founder: we found out we were wrong, and we moved while we could still afford to."; },
              },
              {
                key: "team_call", label: "We made the hard team call",
                if: (s) => !!s.jordan_resolved,
                journal: "Application, Q2: we made the hardest call a founding team makes — a co-founder who'd stopped earning her stake, told to her face, handled on paper. The company runs on the people who show up.",
                effects: { signal: 2 },
                fx: (s) => { s.app_why = "team_call"; return "You write about the Jordan conversation — the one most founders postpone until diligence finds it. Uncomfortable, and exactly what they ask this question to find."; },
              },
              {
                key: "bluff", label: "\"We're passionate and resilient\"",
                journal: "Application, Q2: 'we're passionate and resilient.' So is everyone in the pile. The question wanted a scar and I gave it a slogan.",
                fx: (s) => { s.app_why = "bluff"; s.app_bluffs = (s.app_bluffs || 0) + 1; return "Passion and resilience — the words every application uses in the space where a scar should go."; },
              },
            ],
          },
          {
            id: "app_q_growth", char: "yc", from: "The application",
            text: "Question 3: \"How will you get users?\" 'Marketing' is not an answer. A channel with a number attached is.",
            choices: [
              {
                key: "channel", label: "One tested channel, with the CAC",
                if: (s) => !!s.primary_channel && s.primary_channel !== "mixed" && s.channels[s.primary_channel] && s.channels[s.primary_channel].fit >= 0.7,
                journal: "Application, Q3: we tested channels cheaply, killed the duds, and went all-in on the one with legs — CAC in single digits and compounding. One channel, one number, no adjectives.",
                effects: { signal: 3 },
                fx: (s) => { s.app_growth = "channel"; return "One channel, one CAC number, and the two tests you ran to find it. The rare growth answer that's made of arithmetic."; },
              },
              {
                key: "tested", label: "The channel tests — data over adjectives",
                if: (s, e) => Object.keys(s.channels || {}).filter(k => k !== "mixed").length >= 1,
                journal: "Application, Q3: the channel tests, with numbers — what we tried, what each user cost, which ones we killed. No winner declared yet, but the method is the answer.",
                effects: { signal: 2 },
                fx: (s) => { s.app_growth = "tested"; return "You show the tests and the CACs, including the duds you killed. The method reads as maturity even without a winner."; },
              },
              {
                key: "community", label: "Our community partner — 18,000 singles",
                if: (s) => !!s.sarah_onboard,
                journal: "Application, Q3: our distribution isn't an ad budget, it's Sarah — 18,000 singles who already trust her, and v2 debuted at her event. Warm channel, zero CAC, hard to copy.",
                effects: { signal: 2 },
                fx: (s) => { s.app_growth = "community"; return "You write about Sarah's community — warm distribution money can't buy, and a relaunch that already proved it converts."; },
              },
              {
                key: "bluff", label: "\"TikTok, ads, press — we'll be everywhere\"",
                journal: "Application, Q3: 'TikTok, ads, press, influencers.' Four channels, zero numbers. It's the answer of a company that hasn't tested anything.",
                fx: (s) => { s.app_growth = "bluff"; s.app_bluffs = (s.app_bluffs || 0) + 1; return "Four channels, zero numbers. Every reader knows what that means: none of them have been tried."; },
              },
            ],
          },
          {
            id: "app_send", char: "yc", from: "The application",
            text: (s) => "Read it back, top to bottom. Three answers" + ((s.app_bluffs || 0) > 0 ? " — " + s.app_bluffs + " of them borrowed from the pile of things everyone says" : ", every one of them something that actually happened to this company") + ". The button says Submit.",
            choices: [
              {
                key: "submit", label: "Submit the application",
                journal: "YC application submitted. Decisions go out on deadline week.",
                effects: { scene: null },
                fx(s, e) {
                  s.ycApplied = true;
                  // The verdict letter lands entering deadline week, graded off
                  // the report card as it stands that morning — and it quotes
                  // the application back at you.
                  e.schedule({
                    in: Math.max(1, s.deadline_week - s.week),
                    unless: (st) => st.game_over || st.game_won,
                    fx(st, en) {
                      // Admission needs both: a company that exists (live
                      // product, shipped pivot, someone paying) AND a report
                      // card at B+ or better. Wise decisions without a shipped
                      // company don't get funded; GOALS.md's "to win, a pivot
                      // is required" is this line.
                      const grade = en.gradeScore();
                      const qualified = st.launched && st.pivot_shipped && st.customers >= 1;
                      if (qualified && grade != null && grade >= YC_ADMISSION_GRADE) {
                        st.ycAccepted = true;
                        st.cash += 500000;
                        st.signal = Math.min(100, st.signal + 25);
                        en.say({
                          char: "yc", from: "Y Combinator",
                          text: "You're in. Welcome to the batch — $500k for 7%. See you at kickoff."
                            + (st.app_learned === "maya" ? " PS — the partner who read your application repeated your churned user's line in the meeting. Answers like that are why you're in the room."
                              : st.app_why === "killed" ? " PS — 'we killed our own product while we could still afford to.' That sentence did most of the work."
                                : ""),
                        });
                      } else {
                        st.ycRejected = true;
                        en.say({
                          char: "yc", from: "Y Combinator",
                          text: !qualified
                            ? "Thanks for applying — we're passing. We fund launched products with users who pay; the application reads like a company that's still ahead of you. The ones that come back are the founders who shipped anyway."
                            : (st.app_bluffs || 0) >= 2
                              ? "Thanks for applying — we're passing. The strongest applications quote their users and show their numbers; yours mostly told us what every application tells us. The ones that come back are the companies that kept going."
                              : "Thanks for applying — we're passing. We look at thousands of these; the ones that come back are the companies that kept going. Whatever kindred becomes, this application wasn't the end of it.",
                        });
                      }
                    },
                  });
                  return "Application submitted. Decisions go out week " + s.deadline_week + ".";
                },
              },
            ],
          },
        ],
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.V2STORY = window.V2STORY || []).push(mod);
})();
