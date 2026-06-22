(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'analytics', name: 'Analytics', type: 'system', noChat: true,

    slice: [
      "silent_churn",
    ],

    role: "Product data",
    intro: "enough data to start seeing patterns.",
    voice: {
      "silent_churn|call": "Called all 3 silent users. Found a critical onboarding gap. Fixed it. 2 came back."
    },
    unlockCondition: (s) => s.launched && (s.users >= 3 || s.customers >= 1),
    cards: [
      {
        id: 'silent_churn', cat: 'c', from: 'Analytics',
        body: "free users are signing up, swiping through profiles for 20 minutes, and disappearing. they match with someone but never send a message. no explanation.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.launched && s.users >= 3 && s.users < 30 && !char.flags.done && s.week >= (s.silent_churn_last || 0) + 8,
        options: [
          { label: 'Call all three', key: 'call',
            execute(s, char) { char.flags.done = true; s.silent_churn_last = s.week; s.signal = clamp(s.signal + 6, 0, 100); return "Called all 3. Found a critical onboarding gap. Fixed it. 2 came back."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.done = true; s.silent_churn_last = s.week; s.signal = clamp(s.signal - 12, 0, 100); s.users = clamp(s.users - 8, 0, 9999); },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.analytics = def;
})();
