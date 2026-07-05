(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'analytics', name: 'Analytics', type: 'system', noChat: true,

    slice: [
      "post_match_dropoff",
      "slide_cohort",
    ],

    role: "Product data",
    intro: "instrumentation is live — enough data to start seeing patterns.",
    // Unlocks early if you BOUGHT analytics (the "sight" payoff), otherwise only once
    // there's real post-launch traffic to look at.
    unlockCondition: (s) => s.analytics_live || (s.launched && (s.users >= 3 || s.customers >= 1)),
    cards: [
      // Pre-launch: bought analytics surfaces the post-match drop-off — the pivot signal.
      {
        id: 'post_match_dropoff', cat: 'c', from: 'Analytics',
        body: "first real pattern out of the instrumentation. the testflight circle is tiny — a dozen people, 14 matches between them since the demo build went out. 11 of those matches never got past 'hey.' small numbers, loud shape: it's not the matching that loses people, it's what comes after a match. there's nowhere for them to go.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.analytics_live && s.has_demo && !s.launched && !char.flags.dropoff_done,
        options: [
          { label: 'Dig into the drop-off', key: 'dig',
            journal: "Pulled the test circle's numbers apart. Matches that never become conversations, conversations that never become dates — twelve people is a small sample and an unambiguous one. The instrumentation paid for itself before launch: I can see the pivot from here.",
            execute(s, char) {
              char.flags.dropoff_done = true;
              s.analytics_dropoff_seen = true;
              s.market_fit = clamp(s.market_fit + 8, 0, 100);
              s.signal = clamp(s.signal + 4, 0, 100);
              return "Pulled the circle's numbers apart. The story's unambiguous even at twelve people — matches that never become conversations, conversations that never become dates. You can see the pivot from here, with time to act on it before a single stranger signs up.";
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
          return `week-one cohort is in. of ${total} launch-week signups, ${opened} opened the app this week. ${matches} matches created since launch; ${convos} conversations passed two messages; plans made to actually meet: 0. the shape is identical to the testflight circle — at 3x the size.`;
        },
        urgency: 12, weeks: 1,
        available: (s, char) => s.analytics_live && s.launched && !s.activities_pivot
          && s.week >= (s.launch_week || 0) + 2 && !char.flags.cohort_done,
        options: [
          { label: 'Sit with the numbers', key: 'dig',
            journal: "Friday. The week-one cohort came in and it's the TestFlight circle's shape at 3x the size: matches happen, conversations don't, plans to meet — zero. It's not that we don't know. It's that the number is now too big to un-know.",
            execute(s, char) {
              char.flags.cohort_done = true;
              s.cohort_seen = true;
              s.market_fit = clamp(s.market_fit + 4, 0, 100);
              s.signal = clamp(s.signal + 2, 0, 100);
              return "You sat with the cohort until the shape stopped being deniable: the drop-off is after the match, at every size you've ever measured.";
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
