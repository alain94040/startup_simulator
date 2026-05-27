(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'priya', name: 'Priya (advisor)', type: 'advisor',
    unlockCondition: (s) => s.week >= 4,
    cards: [
      {
        id: 'mentor_competitor_bomb', cat: 'c', from: 'Priya (advisor)',
        body: "looked at your idea over the weekend. you should know: 3 companies are working on this right now, one YC-backed from 2022. you need a sharper answer to 'why you.'",
        urgency: 3, weeks: 1,
        available: (s, char) => s.week <= 10 && s.signal < 60 && !char.flags.competitor_resolved,
        options: [
          { label: 'Do a competitive deep-dive', key: 'research',
            execute(s, char) { char.flags.competitor_resolved = true; s.signal = clamp(s.signal + 8, 0, 100); s.market_fit = clamp(s.market_fit + 6, 0, 100); s.network.advisors++; return "Did a full competitive analysis. None of them solve it for your niche. That's your wedge. Priya is now a real advisor."; } },
        ],
        dropDelay: 2, dropFrom: 'Priya',
        dropMsg: "any progress on differentiating from the competition? investors will definitely ask.",
        dropFx(s, char) { s.signal = clamp(s.signal - 8, 0, 100); s.investor_warmth = clamp(s.investor_warmth - 8, 0, 100); },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.priya = def;
})();
