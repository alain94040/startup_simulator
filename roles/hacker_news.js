(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'hacker_news', name: 'Hacker News', type: 'platform',
    cards: [
      {
        id: 'hn_thread', cat: 'e', from: 'Hacker News',
        body: "'Ask HN: Why is [your space] still so broken?' — top thread right now, 300 comments. this is your market talking openly.",
        urgency: 2, weeks: 1,
        available: (s) => !s.launched && !s.hn_thread_done,
        options: [
          { label: 'Engage the thread', key: 'engage',
            execute(s) { s.hn_thread_done = true; s.signal = clamp(s.signal + 12, 0, 100); s.market_fit = clamp(s.market_fit + 3, 0, 100); s.users += 3; s.network.peers += 8; return "Engaged the thread authentically. 12 DMs requesting early access."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s) { s.hn_thread_done = true; s.signal = clamp(s.signal - 3, 0, 100); },
      },
      // ── RECURRING: pre-launch community signal ───────────────────────────────
      // HN and Reddit use separate cooldown trackers (4-week each) so they
      // interleave and cover each other's gaps instead of both going dark
      // at the same time.
      {
        id: 'community_signal_hn', cat: 'e', from: 'Hacker News',
        body: "another thread in your space today. same complaints, still no good solution. the frustration is real and public.",
        urgency: 1, weeks: 1,
        available: (s) => !s.launched && s.week >= 6 && s.week >= (s.community_hn_last || 0) + 5,
        options: [
          { label: 'Drop a comment', key: 'engage',
            execute(s) { s.community_hn_last = s.week; s.signal = clamp(s.signal + 6, 0, 100); s.network.peers += 3; s.market_fit = clamp(s.market_fit + 1, 0, 100); return "Commented with a genuine take. 4 people DM'd asking when you're launching."; } },
          { label: 'Read and move on', key: 'skip',
            execute(s) { s.community_hn_last = s.week; return "Read it. Nothing actionable right now."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'community_signal_reddit', cat: 'e', from: 'Reddit',
        body: "r/[yourspace] — top post this week: 'what tools do you actually use for this?' 200 comments, mostly complaints about existing options.",
        urgency: 1, weeks: 1,
        available: (s) => !s.launched && s.week >= 8 && s.week >= (s.community_reddit_last || 0) + 5,
        options: [
          { label: 'Join the conversation', key: 'engage',
            execute(s) { s.community_reddit_last = s.week; s.signal = clamp(s.signal + 5, 0, 100); s.users += 2; s.market_fit = clamp(s.market_fit + 2, 0, 100); return "Joined the thread as a builder, not a promoter. 2 people signed up for early access."; } },
          { label: 'Skip it', key: 'skip',
            execute(s) { s.community_reddit_last = s.week; return "Skipped. Staying focused."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },

      {
        id: 'community_signal_slack', cat: 'e', from: 'Indie Hackers',
        body: "a thread on Indie Hackers asking 'how are you validating before you build?' — half the comments describe your exact problem.",
        urgency: 1, weeks: 1,
        available: (s) => !s.launched && s.week >= 10 && s.week >= (s.community_slack_last || 0) + 5,
        options: [
          { label: 'Share what you\'ve learned', key: 'engage',
            execute(s) { s.community_slack_last = s.week; s.signal = clamp(s.signal + 5, 0, 100); s.network.peers += 4; s.market_fit = clamp(s.market_fit + 1, 0, 100); return "Posted an honest update. 5 people followed up with their own experiences. Real signal."; } },
          { label: 'Skip it', key: 'skip',
            execute(s) { s.community_slack_last = s.week; return "Skipped. Head down this week."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },

      // ── RECURRING: post-launch product mentions ──────────────────────────────
      {
        id: 'community_product_hn', cat: 'e', from: 'Hacker News',
        body: "someone posted your product on HN. mixed reactions — a few critiques, but 5 people asking how to sign up.",
        urgency: 1, weeks: 1,
        available: (s) => s.launched && s.week >= (s.community_product_hn_last || 0) + 3,
        options: [
          { label: 'Engage the thread', key: 'engage',
            execute(s) { s.community_product_hn_last = s.week; s.signal = clamp(s.signal + 7, 0, 100); s.users += 5; return "Responded to every comment. Thread stayed warm for 3 days. 5 signups."; } },
          { label: 'Let it run', key: 'watch',
            execute(s) { s.community_product_hn_last = s.week; s.users += 1; return "Didn't engage. Thread faded quickly. 1 signup."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'community_product_reddit', cat: 'e', from: 'Reddit',
        body: "someone recommended your product in a thread. comment got 40 upvotes. you're showing up in searches now.",
        urgency: 1, weeks: 1,
        available: (s) => s.launched && s.week >= (s.community_product_reddit_last || 0) + 3,
        options: [
          { label: 'Reach out to the poster', key: 'engage',
            execute(s) { s.community_product_reddit_last = s.week; s.signal = clamp(s.signal + 5, 0, 100); s.users += 3; s.market_fit = clamp(s.market_fit + 1, 0, 100); return "Thanked them publicly and privately. They became a power user and wrote a short review."; } },
          { label: 'Let it ride', key: 'watch',
            execute(s) { s.community_product_reddit_last = s.week; s.users += 2; return "Organic momentum. 2 more signups from the thread tail."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },

      {
        id: 'community_product_slack', cat: 'e', from: 'Indie Hackers',
        body: "someone posted a 'Show IH' about your product. mostly positive. a few asking about pricing.",
        urgency: 1, weeks: 1,
        available: (s) => s.launched && s.week >= (s.community_product_slack_last || 0) + 3,
        options: [
          { label: 'Engage and answer pricing questions', key: 'engage',
            execute(s) { s.community_product_slack_last = s.week; s.signal = clamp(s.signal + 4, 0, 100); s.users += 2; return "Answered everything honestly. 2 signups, 1 feature request worth exploring."; } },
          { label: 'Let it run', key: 'watch',
            execute(s) { s.community_product_slack_last = s.week; s.users += 1; return "Thread ran its course. 1 signup."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },

      {
        id: 'yc_discussion_ready', cat: 'e', from: 'Hacker News',
        body: "YC application window just opened. Your stats qualify — 60%+ product, 10+ paying customers. A lot of founders in your space are applying this batch.",
        urgency: 2, weeks: 1, priority: true,
        available: (s, char, e) => s.week >= e.ycWeek && !s.ycDeciding && !s.ycApplied && !s.ycAccepted && s.product >= 60 && s.customers >= 10,
        options: [
          { label: 'Start writing the application', key: 'apply',
            execute(s, char, e) { s.ycDeciding = true; return "Committed to this batch. Deadline is next sprint — time to write."; } },
          { label: 'Skip this batch', key: 'skip',
            execute(s, char, e) { e.ycWeek += 12; return "Decided to skip this batch. Next one opens in ~12 weeks."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'yc_discussion_early', cat: 'e', from: 'Hacker News',
        body: "YC application window just opened. Stats aren't quite there yet — need 60% product and 10 paying customers. Some teams apply anyway to get partner feedback. Apply or wait for next batch?",
        urgency: 2, weeks: 1, priority: true,
        available: (s, char, e) => s.week >= e.ycWeek && !s.ycDeciding && !s.ycApplied && !s.ycAccepted && (s.product < 60 || s.customers < 10),
        options: [
          { label: 'Start writing anyway', key: 'apply',
            execute(s, char, e) { s.ycDeciding = true; return "Going for it — a long shot, but the partner feedback alone is worth it."; } },
          { label: 'Wait for next batch', key: 'skip',
            execute(s, char, e) { e.ycWeek += 12; return "Waiting for next batch. More time to hit the numbers. Next window in ~12 weeks."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) { e.ycWeek = s.week + 12; },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.hacker_news = def;
})();
