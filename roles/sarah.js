(function () {
  const rnd   = n => Math.floor(Math.random() * n);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'sarah', name: 'Sarah (mutual)', type: 'connector',
    unlockCondition: (s) => s.week >= 3,
    cards: [
      {
        id: 'intro_expiring', cat: 'c', from: 'Sarah (mutual)',
        body: "intro'd you to the head of ops at a fast-growing startup. she told me yesterday she's evaluating 2 other tools. you need to reply today.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.week > 3 && !char.flags.intro_done && (s.launched || s.product >= 35),
        options: [
          { label: 'Reply to Sarah now', key: 'reply',
            execute(s, char) { char.flags.intro_done = true; s.customers += 5 + rnd(5); s.signal = clamp(s.signal + 7, 0, 100); s.network.advisors++; return "Had the call. Strong fit — they signed up on the spot. Sarah is now a connector you can rely on."; } },
        ],
        dropDelay: 1, dropFrom: 'Sarah',
        dropMsg: "they went with something else. mentioned they didn't hear back in time. that one hurt.",
        dropFx(s, char) { s.signal = clamp(s.signal - 8, 0, 100); },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.sarah = def;
})();
