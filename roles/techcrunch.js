(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'techcrunch', name: 'TechCrunch', type: 'press',
    unlockCondition: (s) => s.product > 15,
    cards: [
      {
        id: 'competitor_launch', cat: 'e', from: 'TechCrunch',
        body: "Rivalio just came out of stealth with $3M. product looks similar to what you're building. they already have developer traction on Twitter.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.product > 20 && !char.flags.done,
        options: [
          { label: 'Write a comparison piece', key: 'compare',
            execute(s, char) { char.flags.done = true; s.signal = clamp(s.signal + 6, 0, 100); return "Published a direct comparison. Your niche is clearer."; } },
        ],
        dropDelay: 2, dropFrom: 'Priya (advisor)',
        dropMsg: "Rivalio has 200 customers and is well-funded. you need a sharper answer to 'why you and not them.'",
        dropFx(s, char) { char.flags.done = true; s.signal = clamp(s.signal - 12, 0, 100); },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.techcrunch = def;
})();
