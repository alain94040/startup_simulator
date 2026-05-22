(function () {
  const rnd   = n => Math.floor(Math.random() * n);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'lena', name: 'Lena (TechMedia)', type: 'press',
    unlockCondition: (s) => s.launched,
    cards: [
      {
        id: 'reporter_deadline', cat: 'e', from: 'Lena (TechMedia)',
        body: "writing about startups in your space. you'd be the only founder quote. story publishes tomorrow 9am — you're out if i don't hear back tonight.",
        urgency: 3, weeks: 1,
        available: (s) => s.launched && s.week >= (s.reporter_deadline_last || 0) + 8,
        options: [
          { label: 'Reply to Lena now', key: 'reply',
            execute(s) { s.reporter_deadline_last = s.week; const n = 10 + rnd(10); s.users += n; s.signal = clamp(s.signal + 10, 0, 100); s.network.press++; return `Story ran. ${n} signups in 24 hours.`; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.lena = def;
})();
