(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'twitter', name: 'Twitter', type: 'platform',
    unlockCondition: (s) => s.launched && (s.users >= 10 || s.customers >= 2),
    cards: [
      {
        id: 'public_complaint', cat: 'c', from: 'Twitter',
        body: "'@yourproduct has been broken for 3 days and nobody responded to my support email. do not use this.' — 40 retweets and counting.",
        urgency: 3, weeks: 1,
        available: (s) => s.launched && (s.users >= 10 || s.customers >= 2) && s.week >= (s.public_complaint_last || 0) + 6,
        options: [
          { label: 'Respond publicly', key: 'respond',
            execute(s) { s.public_complaint_last = s.week; s.signal = clamp(s.signal + 5, 0, 100); return "Responded publicly, fixed the issue. Turned a critic into a vocal supporter."; } },
        ],
        dropDelay: 1, dropFrom: 'Twitter',
        dropMsg: "tweet is at 200 retweets. a journalist screenshot it. signup rate dropped 30%.",
        dropFx(s) { s.public_complaint_last = s.week; s.signal = clamp(s.signal - 18, 0, 100); s.users = clamp(s.users - 10, 0, 9999); },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.twitter = def;
})();
