(function () {
  const def = {
    id: 'yc', name: 'Y Combinator', type: 'institution',
    unlockCondition: (s) => s.ycDeciding,
    cards: [
      {
        id: 'yc_apply', cat: 'e', from: 'Y Combinator',
        body: "Application deadline is this week. What you're building, why you, what you've learned from users. Takes a focused day to do well.",
        urgency: 3, weeks: 1, priority: true,
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
