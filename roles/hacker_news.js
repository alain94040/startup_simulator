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
            execute(s) { s.hn_thread_done = true; s.signal = clamp(s.signal + 12, 0, 100); s.market_fit = clamp(s.market_fit + 5, 0, 100); s.customers += 3; s.network.peers += 8; return "Engaged the thread authentically. 12 DMs requesting early access."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s) { s.hn_thread_done = true; s.signal = clamp(s.signal - 3, 0, 100); },
      },
      {
        id: 'yc_discussion_ready', cat: 'e', from: 'Hacker News',
        body: "YC application window just opened. Your stats qualify — 60%+ product, 40+ customers. A lot of founders in your space are applying this batch.",
        urgency: 2, weeks: 1, priority: true,
        available: (s, char, e) => s.week >= e.ycWeek && !s.ycDeciding && !s.ycApplied && s.product >= 60 && s.customers >= 40,
        options: [
          { label: 'Apply this cycle', key: 'apply',
            execute(s, char, e) { s.ycDeciding = true; return "Decided to go for it. Need to write the application this sprint."; } },
          { label: 'Skip this batch', key: 'skip',
            execute(s, char, e) { e.ycWeek += 12; return "Decided to skip this batch. Next one opens in ~12 weeks."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'yc_discussion_early', cat: 'e', from: 'Hacker News',
        body: "YC application window just opened. Stats aren't quite there yet — need 60% product and 40 customers. Some teams apply anyway to get partner feedback. Apply or wait for next batch?",
        urgency: 2, weeks: 1, priority: true,
        available: (s, char, e) => s.week >= e.ycWeek && !s.ycDeciding && !s.ycApplied && (s.product < 60 || s.customers < 40),
        options: [
          { label: 'Apply anyway', key: 'apply',
            execute(s, char, e) { s.ycDeciding = true; return "Going for it — a long shot, but the partner feedback alone is worth it."; } },
          { label: 'Wait for next batch', key: 'skip',
            execute(s, char, e) { e.ycWeek += 12; return "Waiting for next batch. More time to hit the numbers. Next window in ~12 weeks."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.hacker_news = def;
})();
