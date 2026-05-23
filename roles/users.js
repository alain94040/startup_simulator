(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'users', name: 'Users', type: 'customer',
    unlockCondition: (s) => s.users >= 3 || s.customers >= 1,
    cards: [
      {
        id: 'bug_reports', cat: 'p', from: 'Maya + 2 others',
        body: "all three emailed within an hour. same crash, same workflow. the product is unusable for them right now.",
        urgency: 3, weeks: 1,
        available: (s) => s.launched && s.customers >= 1 && s.week >= (s.bug_reports_last || 0) + 5,
        options: [
          { label: 'Drop everything and fix it', key: 'fix',
            execute(s) { s.bug_reports_last = s.week; return "Fixed the crash. Users notified. Goodwill recovered."; } },
        ],
        dropDelay: 1, dropFrom: 'Maya',
        dropMsg: "we cancelled. the bug never got fixed and we had a deadline. no hard feelings.",
        dropFx(s) { s.bug_reports_last = s.week; s.customers = clamp(s.customers - 2, 0, 9999); s.signal = clamp(s.signal - 10, 0, 100); },
      },
      {
        id: 'churn_interview', cat: 'c', from: 'Customer',
        body: "a paying customer just canceled. their last session was 3 days ago — something changed. you have their number.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.launched && s.customers >= 1 && !char.flags.churn_interview_done,
        options: [
          { label: 'Call them — 20 minutes', key: 'call',
            execute(s, char) {
              char.flags.churn_interview_done = true;
              s.market_fit = clamp(s.market_fit + 10, 0, 100);
              s.signal = clamp(s.signal + 5, 0, 100);
              return "20-minute call. They left because a competitor shipped a feature you're missing. You now know exactly what to build next.";
            } },
          { label: 'Send a quick email', key: 'email',
            execute(s, char) {
              char.flags.churn_interview_done = true;
              s.market_fit = clamp(s.market_fit + 4, 0, 100);
              return "They replied with one paragraph. Less than a call, more than nothing. You have a direction.";
            } },
          { label: 'Let them go', key: 'ignore',
            execute(s, char) {
              char.flags.churn_interview_done = true;
              return "Moved on. You'll never know why they left.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'feature_request_custom', cat: 'p', from: 'Your biggest customer',
        body: "message from your highest-paying account: 'we'd double our subscription if you build a direct integration with our internal tool. it's specific to us — maybe 2 weeks of work.'",
        urgency: 2, weeks: 1,
        available: (s, char) => s.launched && s.customers >= 2 && !char.flags.custom_request_done,
        options: [
          { label: 'Build it — keep them happy', key: 'build',
            execute(s, char, e) {
              char.flags.custom_request_done = true;
              s.customers += 1;
              s.market_fit = clamp(s.market_fit - 5, 0, 100);
              const alex = e.chars.get('alex');
              if (alex && alex.active) alex.morale = clamp(alex.morale - 8, 0, 100);
              return "Built it. Customer doubled their plan. Alex spent 2 weeks on something only one company uses.";
            } },
          { label: 'Decline — stay on roadmap', key: 'decline',
            execute(s, char) {
              char.flags.custom_request_done = true;
              s.customers = clamp(s.customers - 1, 0, 9999);
              s.market_fit = clamp(s.market_fit + 6, 0, 100);
              return "Declined politely. They churned. The clarity on what NOT to build was worth it.";
            } },
          { label: 'Negotiate — build a general version', key: 'negotiate',
            execute(s, char) {
              char.flags.custom_request_done = true;
              s.product = clamp(s.product + 6, 0, 100);
              s.market_fit = clamp(s.market_fit + 4, 0, 100);
              return "Proposed a general integration API instead. They agreed. Took 3 weeks but 3 other customers immediately turned it on.";
            } },
        ],
        dropDelay: 1, dropFrom: 'Customer',
        dropMsg: "we waited 2 weeks. we're going with another tool. no hard feelings.",
        dropFx(s, char) { char.flags.custom_request_done = true; s.customers = clamp(s.customers - 1, 0, 9999); },
      },
      {
        id: 'feature_cluster', cat: 'p', from: '3 users (separately)',
        body: "none of them know each other. all three asked for the exact same thing this week. that's not coincidence.",
        urgency: 2, weeks: 2,
        available: (s) => s.launched && (s.users >= 5 || s.customers >= 2) && !s.feature_cluster_done,
        options: [
          { label: 'Build the feature', key: 'build',
            execute(s) { s.feature_cluster_done = true; s.signal = clamp(s.signal + 10, 0, 100); s.product = clamp(s.product + 8, 0, 100); s.market_fit = clamp(s.market_fit + 4, 0, 100); return "Built the feature. All 3 users loved it. Two immediately referred a colleague."; } },
        ],
        dropDelay: 3, dropFrom: 'User',
        dropMsg: "asked about this feature weeks ago. still nothing. starting to wonder if you're listening.",
        dropFx(s) { s.feature_cluster_done = true; s.signal = clamp(s.signal - 8, 0, 100); },
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
