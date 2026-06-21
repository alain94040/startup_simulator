(function () {
  const rnd   = n => Math.floor(Math.random() * n);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'lena', type: 'press',

    slice: [
      "reporter_deadline",
    ],

    role: "Tech journalist",
    name: "Lena",  // chat display name
    intro: "hi — i'm a reporter covering the consumer dating space. might want to feature you in an upcoming piece.",
    voice: {
      "reporter_deadline|reply": "Replied to Lena's deadline. Story ran the next morning."
    },
    unlockCondition: (s) => s.launched,
    cards: [
      {
        id: 'reporter_deadline', cat: 'e', from: 'Lena (TechMedia)',
        body: "writing a piece on the new wave of anti-Tinder apps — you'd be the only founder quote. story runs tomorrow 9am. you're out if i don't hear back tonight.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.launched && !char.flags.done,
        options: [
          { label: 'Reply to Lena now', key: 'reply',
            execute(s, char) { char.flags.done = true; const n = 10 + rnd(10); s.users += n; s.signal = clamp(s.signal + 10, 0, 100); s.network.press++; return `Story ran. ${n} signups in 24 hours.`; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.done = true; },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.lena = def;
})();
