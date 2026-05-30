(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'brett', name: 'Brett (brand strategist)', type: 'consultant',
    unlockCondition: (s) => s.incorporated && s.hn_thread_done && s.week >= 4,
    cards: [
      {
        id: 'consultant_brand', cat: 'e', from: 'Brett (brand strategist)',
        body: "found you on crunchbase. you're using the same language as tinder and bumble — 'find your match.' i can't tell you apart in 10 seconds. one-day workshop to fix that, $1,500. i work directly with founders.",
        urgency: 1, weeks: 1,
        available: (s, char) => !char.flags.done,
        options: [
          { label: 'Book the session — $1,500', key: 'hire',
            execute(s, char) { char.flags.done = true; s.cash = clamp(s.cash - 1500, 0, 9999999); s.product = clamp(s.product - 3, 0, 100); return "45 minutes of sticky notes and a 'narrative architecture' framework. Brett's main insight: 'lean into your why.' You already knew this. He emailed his invoice immediately."; } },
        ],
        dropDelay: 1, dropFrom: 'Brett',
        dropMsg: "just wanted to follow up — offer stands. a lot of founders wait too long on this.",
        dropCancel: (s, char) => char.flags.done,
        dropFx(s, char) { char.flags.done = true; },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.brett = def;
})();
