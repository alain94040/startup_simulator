(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'brett', name: 'Brett (brand strategist)', type: 'consultant',
    unlockCondition: (s) => s.incorporated && s.hn_thread_done && s.week >= 4,
    cards: [
      {
        id: 'consultant_brand', cat: 'e', from: 'Brett (brand strategist)',
        body: "just found you on crunchbase — congrats on the incorporation. i've worked with a dozen early-stage startups and i can immediately see your positioning is muddled. a one-day workshop would tighten the story significantly. $1,500, i work directly with founders.",
        urgency: 1, weeks: 1,
        available: (s, char) => !char.flags.done,
        options: [
          { label: 'Book the session — $1,500', key: 'hire',
            execute(s, char) { char.flags.done = true; s.cash = clamp(s.cash - 1500, 0, 9999999); s.product = clamp(s.product - 3, 0, 100); return "45 minutes of sticky notes and a 'narrative architecture' framework. Brett's main insight: 'lean into your why.' You already knew this. He emailed his invoice immediately."; } },
          { label: 'Pass on this one', key: 'pass',
            execute(s, char) { char.flags.done = true; return "Declined politely. Brett replied: 'no worries — here's my newsletter.' Subscribed automatically."; } },
        ],
        dropDelay: 1, dropFrom: 'Brett',
        dropMsg: "just wanted to follow up — offer stands. a lot of founders wait too long on this.",
        dropFx(s, char) { char.flags.done = true; },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.brett = def;
})();
