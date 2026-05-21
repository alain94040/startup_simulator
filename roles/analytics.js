(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'analytics', name: 'Analytics', type: 'system',
    unlockCondition: (s) => s.launched && s.customers >= 3,
    cards: [
      {
        id: 'silent_churn', cat: 'c', from: 'Analytics',
        body: "your first 3 beta users signed up, poked around for 20 minutes, and disappeared. no explanation.",
        urgency: 3, weeks: 1,
        available: (s) => s.launched && s.customers >= 3 && s.customers < 20,
        options: [
          { label: 'Call all three', key: 'call',
            execute(s) { s.signal = clamp(s.signal + 6, 0, 100); return "Called all 3. Found a critical onboarding gap. Fixed it. 2 came back."; } },
        ],
        dropDelay: 2, dropFrom: 'Analytics',
        dropMsg: "churn rate this month: 40%. every new signup leaves after a day.",
        dropFx(s) { s.signal = clamp(s.signal - 12, 0, 100); s.customers = clamp(s.customers - 5, 0, 9999); },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.analytics = def;
})();
