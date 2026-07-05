(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'analytics', name: 'Analytics', type: 'system', noChat: true,

    slice: [
      "post_match_dropoff",
      "slide_cohort",
    ],

    role: "Product data",
    intro: "analytics are live — enough data to start seeing patterns.",
    // Unlocks early if you BOUGHT analytics (the "sight" payoff), otherwise only once
    // there's real post-launch traffic to look at.
    unlockCondition: (s) => s.analytics_live || (s.launched && (s.users >= 3 || s.customers >= 1)),
    cards: [
      // Pre-launch: bought analytics surfaces the post-match drop-off — the pivot signal.
      {
        id: 'post_match_dropoff', cat: 'c', from: 'Analytics',
        body: "first real pattern out of the analytics. the testflight group is tiny — a dozen people, 14 matches between them since the demo build went out. 11 of those matches never got past 'hey.' small numbers, but the pattern is loud: it's not the matching that loses people, it's what comes after a match. there's nowhere for them to go.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.analytics_live && s.has_demo && !s.launched && !char.flags.dropoff_done,
        options: [
          { label: 'Dig into the drop-off', key: 'dig',
            journal: "Pulled the test group's numbers apart. Matches that never become conversations, conversations that never become dates — twelve people is a small sample and an unambiguous one. The analytics paid for themselves before launch: I can see the pivot from here.",
            execute(s, char) {
              char.flags.dropoff_done = true;
              s.analytics_dropoff_seen = true;
              s.market_fit = clamp(s.market_fit + 8, 0, 100);
              s.signal = clamp(s.signal + 4, 0, 100);
              return "Pulled the test group's numbers apart. The story's unambiguous even at twelve people — matches that never become conversations, conversations that never become dates. You can see the pivot from here, with time to act on it before a single stranger signs up.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.dropoff_done = true; s.analytics_dropoff_seen = true; },
      },
      {
        // The slide's Friday number (week L+2): the week-one cohort, delivered
        // cold. Only exists if the player bought analytics — without it, Friday
        // is just a feeling, and pivot day's evidence beat runs hollow.
        id: 'slide_cohort', cat: 'c', from: 'Analytics',
        body: (s) => {
          const total = Math.max(8, s.users);
          const matches = Math.max(10, Math.round(total * 1.4));
          const opened = Math.max(3, Math.round(total * 0.26));
          const convos = Math.max(2, Math.round(matches * 0.13));
          return `week-one numbers are in. of ${total} launch-week signups, ${opened} opened the app this week. ${matches} matches made since launch; ${convos} conversations got past two messages; actual dates planned: 0. same pattern as the testflight group — just bigger.`;
        },
        urgency: 12, weeks: 1,
        available: (s, char) => s.analytics_live && s.launched && !s.activities_pivot
          && s.week >= (s.launch_week || 0) + 2 && !char.flags.cohort_done,
        options: [
          { label: 'Sit with the numbers', key: 'dig',
            journal: "Friday. The week-one numbers came in and it's the TestFlight group's pattern, just bigger: matches happen, conversations don't, dates — zero. It's not that we don't know. It's that the number is now too big to un-know.",
            execute(s, char) {
              char.flags.cohort_done = true;
              s.cohort_seen = true;
              s.market_fit = clamp(s.market_fit + 4, 0, 100);
              s.signal = clamp(s.signal + 2, 0, 100);
              return "You sat with the numbers until the pattern stopped being deniable: people don't leave before the match. They leave right after it.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.cohort_done = true; },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.analytics = def;
})();
