(function () {
  const def = {
    id: 'jamie', name: 'Jamie (college friend)', type: 'family',
    unlockCondition: (s) => s.week >= 2,
    cards: [
      {
        id: 'ff_friend', cat: 'e', from: 'Jamie (college friend)',
        body: "heard you actually quit to do this full time. wild. coffee this week? i've been wanting to hear about it.",
        urgency: 2, weeks: 1, priority: true,
        available: (s, char) => s.week <= 8 && !char.flags.done,
        options: [
          { label: 'Tell him about it — and ask', key: 'ask',
            execute(s, char) {
              char.flags.done = true;
              if (Math.random() < 0.8) { s.cash += 7000; return "Jamie sent $7,000 via Venmo. 'Least I could do — you believed in me when I quit my job.'"; }
              return "Jamie's cash is tied up right now — car loan and a wedding. 'Ask me again in 6 months.'";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.jamie = def;
})();
