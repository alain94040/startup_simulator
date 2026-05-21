(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'founder', name: 'You', type: 'founder',
    cards: [
      {
        id: 'founder_landing', cat: 'p', from: 'You',
        body: "you've been talking about this for two weeks but there's nowhere to point people. no domain, no landing page, no email capture. it's making conversations awkward.",
        urgency: 2, weeks: 1,
        available: (s) => s.week <= 5 && !s.has_landing_page,
        options: [
          { label: 'Register the domain + set up a landing page', key: 'build',
            execute(s) { s.has_landing_page = true; s.signal = clamp(s.signal + 8, 0, 100); return "Domain registered. Simple landing page live. Already have 12 email signups from people you talked to this week."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'founder_first_interviews', cat: 'c', from: 'You',
        body: "you've been building for two weeks and haven't had a single structured conversation with a real potential customer. everything you're building is a guess.",
        urgency: 2, weeks: 1,
        available: (s, char) => !s.launched && !char.flags.interviews_done && s.week <= 8,
        options: [
          { label: 'Block off this week for 5 customer interviews', key: 'interview',
            execute(s, char) { char.flags.interviews_done = true; s.signal = clamp(s.signal + 15, 0, 100); s.market_fit = clamp(s.market_fit + 12, 0, 100); s.customers += 5; return "5 calls done. Two insights you didn't expect. One interviewee asked if they could pay you now. Signal much clearer."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.founder = def;
})();
