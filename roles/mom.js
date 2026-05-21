(function () {
  const def = {
    id: 'mom', name: 'Mom', type: 'family',
    cards: [
      {
        id: 'ff_family', cat: 'e', from: 'Mom',
        body: "just checking in! dad and i were talking about you last night. so proud. how's it going? let us know if there's anything we can do.",
        urgency: 2, weeks: 1, priority: true,
        available: (s, char) => s.week <= 6 && !char.flags.done,
        options: [
          { label: "Ask if they'd put money in", key: 'ask',
            execute(s, char) {
              char.flags.done = true;
              if (Math.random() < 0.8) { s.cash += 8000; return "Mom called back. They're in for $8,000. It hits different when it's family money."; }
              return "They'd love to help but timing is bad — stretched with the house right now.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.mom = def;
})();
