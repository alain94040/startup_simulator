(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'users', name: 'Users', type: 'customer', noChat: true,

    slice: [
      "bug_reports",
      "churn_interview",
      "feature_request_custom",
      "feature_cluster",
      "waitlist_cold",
    ],

    role: "Your customers",
    intro: "you have real users now. they're going to start talking.",
    voice: {
      "bug_reports|fix": "Dropped everything and fixed the crash. Users notified. Goodwill recovered.",
      "churn_interview|call": "Called the churned subscriber. They left because Flare launched video dates — the one thing they'd been asking for. Now I know exactly what to build next.",
      "churn_interview|email": "Emailed the churned subscriber. One paragraph back. Less than a call, more than nothing.",
      "churn_interview|ignore": "Let the churned subscriber go. I'll never know why they left.",
      "feature_request_custom|build": "Built video dates for our power user. They doubled their plan — but it's really built around one person's workflow.",
      "feature_request_custom|decline": "Declined the video dates request. They churned. The clarity on what NOT to build was worth it.",
      "feature_request_custom|negotiate": "Proposed a 60-second video hello instead of full video calls. Low friction, easy to build. 5 other subscribers turned it on immediately.",
      "feature_cluster|build": "Built the feature three users independently asked for. All 3 loved it. Two immediately referred a friend.",
      "waitlist_cold|reach": "Reached out to the waitlist. Good feedback — people are still excited, want to know when we're launching."
    },
    unlockCondition: (s) => s.waitlist >= 5 || s.users >= 3 || s.customers >= 1,
    cards: [
      {
        id: 'bug_reports', cat: 'p', from: 'Users',
        body: (s) => s.bug_reports_last
          ? "another crash report — different users, same broken screen. something in this path is still not stable."
          : "all three emailed within an hour. the messaging screen goes blank when someone sends a photo. the product is unusable for them right now.",
        urgency: 3, weeks: 1,
        available: (s) => s.launched && s.customers >= 1 && s.week >= (s.bug_reports_last || 0) + 5,
        options: [
          { label: 'Drop everything and fix it', key: 'fix',
            execute(s) { s.bug_reports_last = s.week; return "Fixed the crash. Users notified. Goodwill recovered."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          s.bug_reports_last = s.week;
          s.customers = clamp(s.customers - 2, 0, 9999);
          s.signal = clamp(s.signal - 10, 0, 100);
          if (e && e.pending) e.pending.push({
            fireWeek: s.week + 1, from: 'Subscriber',
            text: "we cancelled. the bug never got fixed and we had a deadline. no hard feelings.",
            fx() {},
          });
        },
      },
      {
        id: 'churn_interview', cat: 'c', from: 'Customer',
        body: "a paying subscriber just canceled. they had 5 active conversations going 3 days ago — something changed. you have their number.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.launched && s.customers >= 1 && !char.flags.churn_interview_done,
        options: [
          { label: 'Call them — 20 minutes', key: 'call',
            execute(s, char) {
              char.flags.churn_interview_done = true;
              s.market_fit = clamp(s.market_fit + 10, 0, 100);
              s.signal = clamp(s.signal + 5, 0, 100);
              return "20-minute call. They left because Flare launched video dates — the one thing they'd been asking for. You now know exactly what to build next.";
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
        id: 'feature_request_custom', cat: 'p', from: 'Your most active subscriber',
        body: "a power user who's been on 4 dates from kindred messaged this week: 'i'd pay double if you add video dates. i always need to move to FaceTime before i'm comfortable meeting someone. it breaks the flow.'",
        urgency: 2, weeks: 1,
        available: (s, char) => s.launched && s.customers >= 3 && !char.flags.custom_request_done,
        options: [
          { label: 'Build video dates — keep them happy', key: 'build',
            execute(s, char, e) {
              char.flags.custom_request_done = true;
              s.customers += 1;
              s.market_fit = clamp(s.market_fit - 5, 0, 100);
              const alex = e.chars.get('alex');
              if (alex && alex.active) alex.morale = clamp(alex.morale - 8, 0, 100);
              const alexActive = e.chars.get('alex')?.active;
              return alexActive
                ? "Built it. They doubled their plan. Alex spent 3 weeks on video infrastructure — it works, but it's really built around one person's workflow."
                : "Built it. They doubled their plan. Took 3 weeks of engineering time — it works, but it's really built around one person's workflow.";
            } },
          { label: 'Decline — stay on roadmap', key: 'decline',
            execute(s, char) {
              char.flags.custom_request_done = true;
              s.customers = clamp(s.customers - 1, 0, 9999);
              s.market_fit = clamp(s.market_fit + 6, 0, 100);
              return "Declined politely. They churned. The clarity on what NOT to build was worth it.";
            } },
          { label: 'Build a lightweight version for everyone', key: 'negotiate',
            execute(s, char) {
              char.flags.custom_request_done = true;
              s.market_fit = clamp(s.market_fit + 4, 0, 100);
              return "Proposed a 60-second video hello instead of full video calls — low friction, easy to build. They agreed. Took 2 weeks but 5 other subscribers turned it on immediately.";
            } },
        ],
        dropDelay: 1, dropFrom: 'Subscriber',
        dropMsg: "waited 2 weeks. downloaded flare. no hard feelings.",
        dropFx(s, char) { char.flags.custom_request_done = true; s.customers = clamp(s.customers - 1, 0, 9999); },
      },
      {
        id: 'feature_cluster', cat: 'p', from: '3 users (separately)',
        body: "none of them know each other. all three asked for the same thing this week — a way to signal they're looking for something serious before matching. that's not coincidence.",
        urgency: 2, weeks: 2,
        available: (s) => s.launched && (s.users >= 5 || s.customers >= 2) && !s.feature_cluster_done,
        options: [
          { label: 'Build the feature', key: 'build',
            execute(s) { s.feature_cluster_done = true; s.signal = clamp(s.signal + 10, 0, 100); s.market_fit = clamp(s.market_fit + 4, 0, 100); return "Built the feature. All 3 users loved it. Two immediately referred a colleague."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          s.feature_cluster_done = true;
          s.signal = clamp(s.signal - 8, 0, 100);
          if (e && e.pending) e.pending.push({
            fireWeek: s.week + 3, from: 'User',
            text: "asked about this feature weeks ago. still nothing. starting to wonder if you're listening.",
            fx() {},
          });
        },
      },
      {
        id: 'waitlist_cold', cat: 'c', from: 'Waitlist signups',
        body: "people who signed up for early access haven't heard from you in 2 weeks. every day you wait, a few more download something else.",
        urgency: 2, weeks: 1,
        available: (s, char) => !s.launched && s.signal > 45 && s.network.peers >= 14 && !char.flags.waitlist_done,
        options: [
          { label: 'Reach out now', key: 'reach',
            execute(s, char) { char.flags.waitlist_done = true; s.signal = clamp(s.signal + 8, 0, 100); s.market_fit = clamp(s.market_fit + 5, 0, 100); return "Reached out to waitlist. Good feedback — people are still excited, want to know when you're launching."; } },
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
