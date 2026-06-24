(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'analytics', name: 'Analytics', type: 'system', noChat: true,

    slice: [
      "post_match_dropoff",
      "silent_churn",
    ],

    role: "Product data",
    intro: "instrumentation is live — enough data to start seeing patterns.",
    voice: {
      "post_match_dropoff|dig": "Pulled the early cohort apart. Matches that never become conversations, conversations that never become dates. The instrumentation paid for itself — I can see the pivot from here.",
      "silent_churn|call": "Called all 3 silent users. Found a critical onboarding gap. Fixed it. 2 came back."
    },
    // Unlocks early if you BOUGHT analytics (the "sight" payoff), otherwise only once
    // there's real post-launch traffic to look at.
    unlockCondition: (s) => s.analytics_live || (s.launched && (s.users >= 3 || s.customers >= 1)),
    cards: [
      // Pre-launch: bought analytics surfaces the post-match drop-off — the pivot signal.
      {
        id: 'post_match_dropoff', cat: 'c', from: 'Analytics',
        body: "the funnel is stark: people match, open the thread… and stop. ~80% of matches never get past 'hey.' it's not the matching that's losing them — it's what comes after a match. there's nowhere for them to go.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.analytics_live && s.has_demo && !s.launched && !char.flags.dropoff_done,
        options: [
          { label: 'Dig into the drop-off', key: 'dig',
            execute(s, char) {
              char.flags.dropoff_done = true;
              s.analytics_dropoff_seen = true;
              s.market_fit = clamp(s.market_fit + 8, 0, 100);
              s.signal = clamp(s.signal + 4, 0, 100);
              return "Pulled the cohort apart. The story's unambiguous — matches that never become conversations, conversations that never become dates. You can see the pivot from here, with time to act on it.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.dropoff_done = true; s.analytics_dropoff_seen = true; },
      },
      {
        id: 'silent_churn', cat: 'c', from: 'Analytics',
        body: "free users are signing up, swiping through profiles for 20 minutes, and disappearing. they match with someone but never send a message. no explanation.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.launched && s.users >= 3 && s.users < 30 && !char.flags.done && s.week >= (s.silent_churn_last || 0) + 8,
        options: [
          { label: 'Call all three', key: 'call',
            execute(s, char) { char.flags.done = true; s.silent_churn_last = s.week; s.signal = clamp(s.signal + 6, 0, 100); return "Called all 3. Found a critical onboarding gap. Fixed it. 2 came back."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.done = true; s.silent_churn_last = s.week; s.signal = clamp(s.signal - 12, 0, 100); s.users = clamp(s.users - 8, 0, 9999); },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.analytics = def;
})();
