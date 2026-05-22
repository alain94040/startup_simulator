(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'users', name: 'Users', type: 'customer',
    unlockCondition: (s) => s.users >= 3 || s.customers >= 1,
    cards: [
      {
        id: 'bug_reports', cat: 'p', from: 'Priya + 2 others',
        body: "all three emailed within an hour. same crash, same workflow. the product is unusable for them right now.",
        urgency: 3, weeks: 1,
        available: (s) => s.launched && s.customers >= 1 && s.week >= (s.bug_reports_last || 0) + 5,
        options: [
          { label: 'Drop everything and fix it', key: 'fix',
            execute(s) { s.bug_reports_last = s.week; return "Fixed the crash. Users notified. Goodwill recovered."; } },
        ],
        dropDelay: 1, dropFrom: 'Priya',
        dropMsg: "we cancelled. the bug never got fixed and we had a deadline. no hard feelings.",
        dropFx(s) { s.bug_reports_last = s.week; s.customers = clamp(s.customers - 2, 0, 9999); s.signal = clamp(s.signal - 10, 0, 100); },
      },
      {
        id: 'feature_cluster', cat: 'p', from: '3 users (separately)',
        body: "none of them know each other. all three asked for the exact same thing this week. that's not coincidence.",
        urgency: 2, weeks: 2,
        available: (s) => s.launched && (s.users >= 5 || s.customers >= 2) && s.week >= (s.feature_cluster_last || 0) + 5,
        options: [
          { label: 'Build the feature', key: 'build',
            execute(s) { s.feature_cluster_last = s.week; s.signal = clamp(s.signal + 10, 0, 100); s.product = clamp(s.product + 8, 0, 100); s.market_fit = clamp(s.market_fit + 4, 0, 100); return "Built the feature. All 3 users loved it. Two immediately referred a colleague."; } },
        ],
        dropDelay: 3, dropFrom: 'User',
        dropMsg: "asked about this feature weeks ago. still nothing. starting to wonder if you're listening.",
        dropFx(s) { s.feature_cluster_last = s.week; s.signal = clamp(s.signal - 8, 0, 100); },
      },
      {
        id: 'waitlist_cold', cat: 'c', from: 'Waitlist signups',
        body: "people who expressed interest haven't heard from you in 2 weeks. every day you wait, a few more move on.",
        urgency: 2, weeks: 1,
        available: (s, char) => !s.launched && s.signal > 45 && s.network.peers >= 14 && !char.flags.waitlist_done,
        options: [
          { label: 'Reach out now', key: 'reach',
            execute(s, char) { char.flags.waitlist_done = true; s.users += 8; s.signal = clamp(s.signal + 8, 0, 100); s.market_fit = clamp(s.market_fit + 5, 0, 100); return "Reached out to waitlist. 8 became active beta testers."; } },
        ],
        dropDelay: 2, dropFrom: 'Waitlist',
        dropMsg: "signed up a few weeks ago. assumed the product was dead. unsubscribed.",
        dropFx(s, char) { char.flags.waitlist_done = true; s.signal = clamp(s.signal - 10, 0, 100); },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.users = def;
})();
