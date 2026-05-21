(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'david', name: 'David (ex-manager)', type: 'family',
    unlockCondition: (s) => s.week >= 3,
    cards: [
      {
        id: 'ff_mentor', cat: 'e', from: 'David (ex-manager)',
        body: "keeping an eye on what you're doing. would love to grab lunch — been a while. let me know when you're free.",
        urgency: 2, weeks: 1, priority: true,
        available: (s, char) => s.week <= 10 && !char.flags.first_meeting_done,
        options: [
          { label: 'Have lunch with David', key: 'lunch',
            execute(s, char) {
              char.flags.first_meeting_done = true;
              char.flags.first_meeting_week = s.week;
              return "Good lunch. David asked sharp questions about the market. 'Send me something concrete this week and let's go deeper.'";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'ff_mentor_pitch', cat: 'e', from: 'David (ex-manager)',
        body: "been chewing on what you told me at lunch. want to grab coffee and go through the numbers?",
        urgency: 3, weeks: 1, priority: true,
        available: (s, char) => char.flags.first_meeting_done && !char.flags.done && s.week <= char.flags.first_meeting_week + 2,
        options: [
          { label: 'Show him the deck', key: 'pitch',
            execute(s, char) {
              char.flags.done = true;
              if (Math.random() < 0.7) { s.cash += 10000; s.investor_warmth = clamp(s.investor_warmth + 5, 0, 100); return "David pulled out his checkbook. $10,000 and a warm intro to two angels he knows."; }
              return "Great coffee. David's being conservative with money this year — new baby coming. 'I'm rooting for you though.'";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.david = def;
})();
