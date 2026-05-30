(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'twitter', name: 'Twitter', type: 'platform',
    unlockCondition: (s) => s.launched && (s.users >= 10 || s.customers >= 2),
    cards: [
      {
        id: 'public_complaint', cat: 'c', from: 'Twitter',
        body: "'@kindredapp matched me with the same guy THREE times. we already dated. this is a bug AND a nightmare.' — 40 retweets and counting.",
        urgency: 3, weeks: 1,
        available: (s) => s.launched && (s.users >= 10 || s.customers >= 2) && !s.public_complaint_done,
        options: [
          { label: 'Respond publicly', key: 'respond',
            execute(s) { s.public_complaint_done = true; s.signal = clamp(s.signal + 5, 0, 100); return "Responded publicly, fixed the duplicate match bug. The user deleted the tweet and posted an apology. A few people replied saying they'd sign up now."; } },
        ],
        dropDelay: 1, dropFrom: 'Twitter',
        dropMsg: "tweet is at 200 retweets. a dating app journalist screenshot it. signup rate dropped 30%.",
        dropFx(s) { s.public_complaint_done = true; s.signal = clamp(s.signal - 18, 0, 100); s.users = clamp(s.users - 10, 0, 9999); },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.twitter = def;
})();
