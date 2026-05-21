(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'tom', name: 'Tom (your top user)', type: 'customer',
    unlockCondition: (s) => s.launched && s.customers >= 10,
    cards: [
      {
        id: 'power_user_quiet', cat: 'c', from: 'Tom (your top user)',
        body: "he was in the product every single day for 6 weeks. then nothing for 10 days. something changed.",
        urgency: 2, weeks: 1,
        available: (s) => s.launched && s.customers >= 10,
        options: [
          { label: 'Call Tom', key: 'call',
            execute(s) { s.signal = clamp(s.signal + 8, 0, 100); return "Called Tom. He was stuck on a new workflow. Unblocked him — he's back and grateful."; } },
        ],
        dropDelay: 2, dropFrom: 'Tom',
        dropMsg: "moved on to Rivalio. nothing personal, just works better for my workflow now.",
        dropFx(s) { s.signal = clamp(s.signal - 14, 0, 100); s.customers = clamp(s.customers - 3, 0, 9999); },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.tom = def;
})();
