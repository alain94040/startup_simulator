(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'analytics', name: 'Analytics', type: 'system',
    unlockCondition: (s) => s.launched && (s.users >= 3 || s.customers >= 1),
    cards: [
      {
        id: 'silent_churn', cat: 'c', from: 'Analytics',
        body: "free users are signing up, swiping through profiles for 20 minutes, and disappearing. they match with someone but never send a message. no explanation.",
        urgency: 3, weeks: 1,
        available: (s) => s.launched && s.users >= 3 && s.users < 30 && s.week >= (s.silent_churn_last || 0) + 8,
        options: [
          { label: 'Call all three', key: 'call',
            execute(s) { s.silent_churn_last = s.week; s.signal = clamp(s.signal + 6, 0, 100); return "Called all 3. Found a critical onboarding gap. Fixed it. 2 came back."; } },
        ],
        dropDelay: 2, dropFrom: 'Analytics',
        dropMsg: "churn rate this month: 40%. every new signup leaves after a day.",
        dropFx(s) { s.silent_churn_last = s.week; s.signal = clamp(s.signal - 12, 0, 100); s.users = clamp(s.users - 8, 0, 9999); },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.analytics = def;
})();
