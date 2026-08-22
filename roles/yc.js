(function () {
  const def = {
    id: 'yc', type: 'institution', noChat: true,

    slice: [
      "yc_apply",
    ],

    role: "Y Combinator",
    name: "YC",  // chat display name
    unlockCondition: (s) => s.ycDeciding,
    cards: [
      {
        id: 'yc_apply', cat: 'e', from: 'Y Combinator',
        body: "Application deadline is this week. What you're building in the dating space, why you, what you've learned from subscribers. Takes a focused day to do well.",
        urgency: 13, weeks: 1,
        available: (s) => s.ycDeciding && !s.ycApplied,
        options: [
          { label: 'Submit the application', key: 'submit',
            journal: "YC application submitted. Decision in 3 weeks.",
            execute(s, char, e) {
              s.ycDeciding = false; s.ycApplied = true;
              // The decision resolver lives here as a pending event (was lost from
              // engine.js in the chat-engine refactor). Three weeks out, YC rolls a
              // verdict — better odds if we qualified (launched + 10+ subscribers).
              // Either way the verdict ends the game: accept → $500k + win;
              // reject → s.ycRejected, engine flips game_over, the scorecard shows.
              e.pending.push({
                fireWeek: s.week + 3, from: 'Y Combinator',
                cancel: (st) => st.ycAccepted,        // already in — nothing to decide
                fx(st, _char, en) {
                  if (st.ycAccepted) return;
                  const accepted = Math.random() < (st.ycQualified ? 0.18 : 0.04);
                  const post = (body) => en.threads.founder.push({
                    type: 'incoming', from: 'Y Combinator', body, week: st.week, isNew: true });
                  if (accepted) {
                    st.ycAccepted = true; st.ycApplied = false;
                    st.cash += 500000;
                    st.signal = Math.min(100, st.signal + 25);
                    post("You're in. Welcome to the batch — $500k for 7%. See you at kickoff.");
                  } else {
                    st.ycApplied = false;
                    st.ycRejected = true;              // final — the run ends at the verdict
                    post("Thanks for applying — we're passing. We look at thousands of these; the ones that come back are the companies that kept going. Whatever plusone becomes, this application wasn't the end of it.");
                  }
                },
              });
              return "Application submitted. Decision in 3 weeks.";
            } },
        ],
        dropDelay: 1, dropFrom: 'Y Combinator',
        dropMsg: "Missed the YC deadline. The next batch opens in about 6 months.",
        dropFx(s, char, e) { s.ycDeciding = false; e.ycWeek = s.week + 26; },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.yc = def;
})();
