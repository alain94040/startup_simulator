(function () {
  const def = {
    id: 'yc', type: 'institution',

    slice: [
      "yc_apply",
    ],

    role: "Y Combinator",
    name: "YC",  // chat display name
    voice: {
      "yc_apply|submit": "YC application submitted. Decision in 3 weeks."
    },
    unlockCondition: (s) => s.ycDeciding,
    cards: [
      {
        id: 'yc_apply', cat: 'e', from: 'Y Combinator',
        body: "Application deadline is this week. What you're building in the dating space, why you, what you've learned from subscribers. Takes a focused day to do well.",
        urgency: 13, weeks: 1,
        available: (s) => s.ycDeciding && !s.ycApplied,
        options: [
          { label: 'Submit the application', key: 'submit',
            execute(s) { s.ycDeciding = false; s.ycApplied = true; return "Application submitted. Decision in 3 weeks."; } },
        ],
        dropDelay: 1, dropFrom: 'Y Combinator',
        dropMsg: "Missed the YC deadline. The next batch opens in about 12 weeks.",
        dropFx(s, char, e) { s.ycDeciding = false; e.ycWeek = s.week + 12; },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.yc = def;
})();
