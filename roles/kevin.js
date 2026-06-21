(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'kevin', type: 'consultant',

    slice: [
      "consultant_growth",
    ],

    role: "Growth consultant",
    name: "Kevin",  // chat display name
    intro: "saw your HN post. i do growth audits for consumer startups — think i can help.",
    voice: {
      "consultant_growth|hire": "Hired Kevin for a growth audit. Got a 58-slide deck titled 'Growth Architecture 2.0.' Top recommendation: post more on LinkedIn. $2,000."
    },
    unlockCondition: (s) => s.launched && s.customers >= 3,
    cards: [
      {
        id: 'consultant_growth', cat: 'e', from: 'Kevin (growth consultant)',
        body: "saw your HN post. quick look at your acquisition funnel and i can see 3 places you're leaving signups on the table. week-long audit, $2,000 flat. guarantee 3× subscribers in 30 days.",
        urgency: 1, weeks: 1,
        available: (s, char) => !char.flags.done,
        options: [
          { label: 'Hire Kevin for a week — $2,000', key: 'hire',
            execute(s, char) { char.flags.done = true; s.cash = clamp(s.cash - 2000, 0, 9999999); return "Kevin delivered a 58-slide deck titled 'Growth Architecture 2.0'. His top recommendation: post more on LinkedIn. He invoiced before the final call."; } },
        ],
        dropDelay: 1, dropFrom: 'Kevin',
        dropMsg: "reaching out one more time — this offer won't be available much longer. founders who act early see the biggest gains.",
        dropCancel: (s, char) => char.flags.done,
        dropFx(s, char) { char.flags.done = true; },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.kevin = def;
})();
