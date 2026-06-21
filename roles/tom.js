(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'tom', type: 'customer',

    slice: [
      "power_user_quiet",
    ],

    role: "Power user",
    name: "Tom",  // chat display name
    intro: "your most active subscriber just went quiet.",
    voice: {
      "power_user_quiet|call": "Called Tom. He met someone on kindred 5 weeks ago — they've been on 7 dates. He forgot to cancel his subscription. He wrote a glowing review before hanging up. Best churn I've ever had."
    },
    unlockCondition: (s) => s.launched && s.customers >= 10,
    cards: [
      {
        id: 'power_user_quiet', cat: 'c', from: 'Tom (your top user)',
        body: "he was in the app every single day for 6 weeks — swiping, matching, messaging. then nothing for 10 days. something changed.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.launched && s.customers >= 10 && !char.flags.done && s.week >= (s.power_user_quiet_last || 0) + 6,
        options: [
          { label: 'Call Tom', key: 'call',
            execute(s, char) {
              char.flags.done = true;
              s.power_user_quiet_last = s.week;
              s.customers = clamp(s.customers - 1, 0, 9999);
              s.signal = clamp(s.signal + 16, 0, 100);
              s.market_fit = clamp(s.market_fit + 10, 0, 100);
              return "Called Tom. He met someone on kindred 5 weeks ago — they've been on 7 dates. He forgot to cancel his subscription and was a bit embarrassed about it. He's canceling, but he wrote you a glowing review before hanging up. Best churn you've ever had.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.done = true; s.power_user_quiet_last = s.week; s.signal = clamp(s.signal - 8, 0, 100); s.customers = clamp(s.customers - 1, 0, 9999); },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.tom = def;
})();
