(function () {
  const rnd = n => Math.floor(Math.random() * n);

  const CHECKIN_BODIES = [
    "it's been a few weeks since you last touched base with Ryan. a short update on subscriber growth keeps you top of mind.",
    "you haven't sent Ryan anything in a while. investors go cold if you don't keep them warm.",
    "Ryan seemed genuinely interested in the dating app space. worth spending 20 minutes on a quick progress note.",
    "it's been over a month. a brief update — new subscribers, dates that happened, what's working — could be worth it.",
  ];
  const CHECKIN_REPLIES = [
    "Ryan: 'this is great, exactly what I like to see. keep the updates coming.'",
    "Ryan: 'love the progress. tracking this closely — keep me posted.'",
    "Ryan: 'solid update. i'm watching this space carefully. stay in touch.'",
    "Ryan: 'appreciate the detail. let's catch up again in a few weeks.'",
  ];

  const def = {
    id: 'ryan', name: 'Ryan (angel)', type: 'investor',
    unlockCondition: (s) => s.week >= 8 && s.network.advisors >= 1,
    cards: [
      {
        id: 'ryan_intro', cat: 'e', from: 'Ryan (angel)',
        body: "heard about you through the network. love what you're building in the dating space. would love to grab coffee and hear more.",
        urgency: 2, weeks: 1,
        available: (s, char) => !char.flags.intro_done,
        options: [
          { label: 'Grab coffee', key: 'meet',
            execute(s, char) {
              char.flags.intro_done = true;
              char.flags.lastUpdateWeek = s.week;
              return "Great coffee. Ryan asked sharp questions and seemed genuinely excited. 'Keep me posted as things develop — I want to stay close to this.'";
            } },
          { label: 'Not right now', key: 'pass',
            execute(s, char) { char.flags.intro_done = true; return "Declined. Ryan said to reach out when timing is better."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'ryan_checkin', cat: 'e', from: 'You',
        get body() { return CHECKIN_BODIES[rnd(CHECKIN_BODIES.length)]; },
        urgency: 1, weeks: 1,
        available: (s, char) => char.flags.intro_done && char.flags.lastUpdateWeek != null && s.week >= char.flags.lastUpdateWeek + 5,
        options: [
          { label: 'Send Ryan a quick update', key: 'update',
            execute(s, char) {
              char.flags.lastUpdateWeek = s.week;
              return CHECKIN_REPLIES[rnd(CHECKIN_REPLIES.length)];
            } },
          { label: 'Skip it this week', key: 'skip',
            execute(s, char) { char.flags.lastUpdateWeek = s.week; return "Left it for another time."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.lastUpdateWeek = s.week; },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.ryan = def;
})();
