(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'hacker_news', type: 'platform', noChat: true,

    slice: [
      "hn_thread",
      "community_signal_hn_1",
      "community_signal_hn_2",
      "community_signal_hn_3",
      "community_signal_reddit_1",
      "community_signal_reddit_2",
      "community_signal_reddit_3",
      "community_signal_slack_1",
      "community_signal_slack_2",
      "community_signal_slack_3",
      "yc_discussion_ready",
      "yc_discussion_early",
    ],

    role: "Communities",
    name: "HN / Reddit",  // chat display name
    cards: [
      {
        id: 'hn_thread', cat: 'e', from: 'Hacker News',
        body: "'Ask HN: Why are dating apps still so bad in 2026?' — top thread right now, 300 comments. this is your market talking openly.",
        urgency: 2, weeks: 1,
        available: (s) => !s.launched && !s.hn_thread_done,
        options: [
          { label: 'Engage the thread', key: 'engage',
            journal: "Engaged the HN thread authentically. 7 DMs requesting early access.",
            execute(s) { s.hn_thread_done = true; s.community_engaged_count = (s.community_engaged_count || 0) + 1; s.signal = clamp(s.signal + 12, 0, 100); s.market_fit = clamp(s.market_fit + 3, 0, 100); s.waitlist += 7; s.network.peers += 8; return "Engaged the thread authentically. 7 DMs requesting early access."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s) { s.hn_thread_done = true; s.signal = clamp(s.signal - 3, 0, 100); },
      },
      // ── SEQUENCE: pre-launch HN signal (3 one-shot cards) ───────────────────
      {
        id: 'community_signal_hn_1', cat: 'e', from: 'Hacker News',
        body: "there's an Ask HN thread about what's broken with dating apps. 200 comments. the top answer is a shared Google spreadsheet where people manually track matches across apps. it has 50,000 views.",
        urgency: 1, weeks: 1,
        available: (s, char) => !s.launched && s.week >= 4 && (char.flags.hn_stage || 0) === 0,
        options: [
          { label: 'Drop a comment', key: 'engage',
            journal: "Commented on the HN thread with a genuine take. 4 people DM'd asking when we're launching.",
            execute(s, char) { char.flags.hn_stage = 1; char.flags.hn_stage_week = s.week; s.community_engaged_count = (s.community_engaged_count || 0) + 1; s.signal = clamp(s.signal + 6, 0, 100); s.waitlist += 4; s.network.peers += 3; s.market_fit = clamp(s.market_fit + 1, 0, 100); return "Commented with a genuine take. 4 people DM'd asking when you're launching."; } },
          { label: 'Read and move on', key: 'skip',
            journal: "Read the HN thread. Nothing actionable right now.",
            execute(s, char) { char.flags.hn_stage = 1; char.flags.hn_stage_week = s.week; return "Read it. Nothing actionable right now."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.hn_stage = 1; char.flags.hn_stage_week = s.week; },
      },
      {
        id: 'community_signal_hn_2', cat: 'e', from: 'Hacker News',
        body: "another HN thread about dating apps, bigger this time. people are explicitly asking for something that actually helps — not another swipe interface.",
        urgency: 1, weeks: 1,
        available: (s, char) => !s.launched && char.flags.hn_stage === 1 && s.week >= (char.flags.hn_stage_week || 0) + 3,
        options: [
          { label: 'Leave a detailed reply', key: 'engage',
            journal: "Left a detailed reply on the HN thread. Two people asked to be notified at launch — one is a former PM at a big company.",
            execute(s, char) { char.flags.hn_stage = 2; char.flags.hn_stage_week = s.week; s.community_engaged_count = (s.community_engaged_count || 0) + 1; s.signal = clamp(s.signal + 7, 0, 100); s.waitlist += 5; s.network.peers += 4; return "Left a detailed reply. Two people asked to be notified at launch. One is a former PM at a big company."; } },
          { label: 'Leave it', key: 'skip',
            journal: "Didn't engage the HN thread. Kept building.",
            execute(s, char) { char.flags.hn_stage = 2; char.flags.hn_stage_week = s.week; return "Didn't engage. Kept building."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.hn_stage = 2; char.flags.hn_stage_week = s.week; },
      },
      {
        id: 'community_signal_hn_3', cat: 'e', from: 'Hacker News',
        body: "someone posted your exact frustration as an HN thread. it hit the front page. three comments specifically mention wanting a real product, not 'tinder but slightly different.'",
        urgency: 2, weeks: 1,
        available: (s, char) => !s.launched && char.flags.hn_stage === 2 && s.week >= (char.flags.hn_stage_week || 0) + 3,
        options: [
          { label: 'Share the waitlist link', key: 'engage',
            journal: "Shared the waitlist link on HN. 8 signups from the thread. One person asked for early access.",
            execute(s, char) { char.flags.hn_stage = 3; s.community_engaged_count = (s.community_engaged_count || 0) + 1; s.signal = clamp(s.signal + 9, 0, 100); s.waitlist += 8; s.network.peers += 5; s.market_fit = clamp(s.market_fit + 2, 0, 100); return "Shared the link. 8 signups from the thread. One person asked for early access — you said yes."; } },
          { label: 'Stay quiet for now', key: 'skip',
            journal: "Watched the HN thread from the sidelines. Three potential users moved on.",
            execute(s, char) { char.flags.hn_stage = 3; s.signal = clamp(s.signal + 2, 0, 100); return "Watched from the sidelines. Three potential users moved on. The thread died."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.hn_stage = 3; },
      },

      // ── SEQUENCE: pre-launch Reddit signal (3 one-shot cards) ───────────────
      {
        id: 'community_signal_reddit_1', cat: 'e', from: 'Reddit',
        body: "r/datingapps — top post this week: 'what apps do you actually use and why?' 200 comments, mostly complaints about ghosting and time-wasters.",
        urgency: 1, weeks: 1,
        available: (s, char) => !s.launched && s.week >= 6 && (char.flags.reddit_stage || 0) === 0,
        options: [
          { label: 'Join the conversation', key: 'engage',
            journal: "Joined the Reddit conversation as a builder. 2 people signed up for early access.",
            execute(s, char) { char.flags.reddit_stage = 1; char.flags.reddit_stage_week = s.week; s.community_engaged_count = (s.community_engaged_count || 0) + 1; s.signal = clamp(s.signal + 5, 0, 100); s.waitlist += 2; s.market_fit = clamp(s.market_fit + 2, 0, 100); return "Joined as a builder, not a promoter. 2 people signed up for early access."; } },
          { label: 'Skip it', key: 'skip',
            journal: "Skipped the Reddit thread. Staying focused.",
            execute(s, char) { char.flags.reddit_stage = 1; char.flags.reddit_stage_week = s.week; return "Skipped. Staying focused."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.reddit_stage = 1; char.flags.reddit_stage_week = s.week; },
      },
      {
        id: 'community_signal_reddit_2', cat: 'e', from: 'Reddit',
        body: "a reddit thread analyzing why the last three 'anti-Tinder' startups all failed. the pattern is uncomfortably familiar.",
        urgency: 1, weeks: 1,
        available: (s, char) => !s.launched && char.flags.reddit_stage === 1 && s.week >= (char.flags.reddit_stage_week || 0) + 3,
        options: [
          { label: 'Respond with your read on it', key: 'engage',
            journal: "Added my take on why anti-Tinder startups keep failing. 12 upvotes, 3 private follow-ups.",
            execute(s, char) { char.flags.reddit_stage = 2; char.flags.reddit_stage_week = s.week; s.community_engaged_count = (s.community_engaged_count || 0) + 1; s.signal = clamp(s.signal + 5, 0, 100); s.market_fit = clamp(s.market_fit + 4, 0, 100); return "Added your take on where they missed. 12 upvotes. Three people followed up privately."; } },
          { label: 'Take notes and move on', key: 'skip',
            journal: "Took notes from the Reddit thread. Three failure modes to avoid.",
            execute(s, char) { char.flags.reddit_stage = 2; char.flags.reddit_stage_week = s.week; s.market_fit = clamp(s.market_fit + 2, 0, 100); return "Read everything. Three things to avoid. Filed away."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.reddit_stage = 2; char.flags.reddit_stage_week = s.week; },
      },
      {
        id: 'community_signal_reddit_3', cat: 'e', from: 'Reddit',
        body: "someone posted your landing page on r/datingapps without asking. 40 upvotes. people in the comments are asking when it launches.",
        urgency: 2, weeks: 1,
        available: (s, char) => !s.launched && char.flags.reddit_stage === 2 && s.week >= (char.flags.reddit_stage_week || 0) + 3,
        options: [
          { label: 'Jump in as the founder', key: 'engage',
            journal: "Jumped into the Reddit thread as the founder. Thread stayed warm for two days. 7 signups.",
            execute(s, char) { char.flags.reddit_stage = 3; s.community_engaged_count = (s.community_engaged_count || 0) + 1; s.signal = clamp(s.signal + 8, 0, 100); s.waitlist += 7; s.market_fit = clamp(s.market_fit + 2, 0, 100); return "Jumped in as the founder. Thread stayed warm for two days. 7 signups."; } },
          { label: 'Let it run on its own', key: 'watch',
            journal: "Let the Reddit thread run on its own. 3 signups without lifting a finger.",
            execute(s, char) { char.flags.reddit_stage = 3; s.signal = clamp(s.signal + 3, 0, 100); s.waitlist += 3; return "Organic momentum. 3 signups without lifting a finger."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.reddit_stage = 3; },
      },

      // ── SEQUENCE: pre-launch Indie Hackers signal (3 one-shot cards) ─────────
      {
        id: 'community_signal_slack_1', cat: 'e', from: 'Indie Hackers',
        body: "a thread on Indie Hackers: 'how do you validate a consumer social app before you build?' — half the comments describe the exact frustration plusone is trying to solve.",
        urgency: 1, weeks: 1,
        available: (s, char) => !s.launched && s.week >= 8 && (char.flags.ih_stage || 0) === 0,
        options: [
          { label: 'Share what you\'ve learned', key: 'engage',
            journal: "Posted an honest update on Indie Hackers. 5 people followed up with their own experiences.",
            execute(s, char) { char.flags.ih_stage = 1; char.flags.ih_stage_week = s.week; s.community_engaged_count = (s.community_engaged_count || 0) + 1; s.signal = clamp(s.signal + 5, 0, 100); s.network.peers += 4; s.market_fit = clamp(s.market_fit + 1, 0, 100); return "Posted an honest update. 5 people followed up with their own experiences. Real signal."; } },
          { label: 'Skip it', key: 'skip',
            journal: "Skipped the Indie Hackers thread. Head down this week.",
            execute(s, char) { char.flags.ih_stage = 1; char.flags.ih_stage_week = s.week; return "Skipped. Head down this week."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.ih_stage = 1; char.flags.ih_stage_week = s.week; },
      },
      {
        id: 'community_signal_slack_2', cat: 'e', from: 'Indie Hackers',
        body: "an indie hacker just published a post-mortem for a dating app that tried your exact angle. failed in month 8. you read every word.",
        urgency: 1, weeks: 1,
        available: (s, char) => !s.launched && char.flags.ih_stage === 1 && s.week >= (char.flags.ih_stage_week || 0) + 3,
        options: [
          { label: 'Reply with what you\'re doing differently', key: 'engage',
            journal: "Replied to the dating app post-mortem on Indie Hackers with what we're doing differently. The author DM'd me.",
            execute(s, char) { char.flags.ih_stage = 2; char.flags.ih_stage_week = s.week; s.community_engaged_count = (s.community_engaged_count || 0) + 1; s.signal = clamp(s.signal + 5, 0, 100); s.market_fit = clamp(s.market_fit + 5, 0, 100); s.network.peers += 3; return "Left a detailed reply on what you learned from their mistakes. The author DM'd you. Useful conversation."; } },
          { label: 'Take notes privately', key: 'skip',
            journal: "Took notes from the IH post-mortem. Three failure modes to avoid.",
            execute(s, char) { char.flags.ih_stage = 2; char.flags.ih_stage_week = s.week; s.market_fit = clamp(s.market_fit + 3, 0, 100); return "Took notes. Three failure modes to avoid. Filed away."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.ih_stage = 2; char.flags.ih_stage_week = s.week; },
      },
      {
        id: 'community_signal_slack_3', cat: 'e', from: 'Indie Hackers',
        body: "indie hackers build-in-public thread for consumer social apps. five founders posting weekly updates. your waitlist is half the size of the least active one.",
        urgency: 2, weeks: 1,
        available: (s, char) => !s.launched && char.flags.ih_stage === 2 && s.week >= (char.flags.ih_stage_week || 0) + 3,
        options: [
          { label: 'Start posting weekly updates', key: 'engage',
            journal: "Started posting weekly updates on Indie Hackers. 6 new subscribers in 48 hours. Two founders reached out.",
            execute(s, char) { char.flags.ih_stage = 3; s.community_engaged_count = (s.community_engaged_count || 0) + 1; s.signal = clamp(s.signal + 6, 0, 100); s.waitlist += 6; s.network.peers += 5; return "First public update posted. 6 new subscribers in 48 hours. Two founders reached out to compare notes."; } },
          { label: 'Keep heads down', key: 'skip',
            journal: "Stayed quiet on Indie Hackers. The gap with other builders is widening.",
            execute(s, char) { char.flags.ih_stage = 3; return "Stayed quiet. The gap is widening."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.ih_stage = 3; },
      },

      // NOTE: the three recurring "someone posted your product on HN/Reddit/IH"
      // cards were retired — post-launch growth is now driven by the deliberate
      // channel-experiment loop in roles/growth.js (test cheap → focus), which
      // replaces the old passive, repetitive community drip.

      {
        id: 'yc_discussion_ready', cat: 'e', from: 'Hacker News',
        body: "YC applications just opened. Your stats qualify — live product, at least one paying subscriber, and a clear pivot story. A lot of founders in the consumer social space are applying.",
        urgency: 12, weeks: 1,
        available: (s, char, e) => s.week >= e.ycWeek && !s.ycDeciding && !s.ycApplied && !s.ycAccepted && s.launched && s.pivot_shipped && s.customers >= 1,
        options: [
          { label: 'Start writing the application', key: 'apply',
            journal: "Committed to this YC batch. Deadline is next sprint — time to write the application.",
            execute(s, char, e) { s.ycDeciding = true; s.ycQualified = true; return "Committed to this batch. Deadline is next sprint — time to write."; } },
          { label: 'Skip this batch', key: 'skip',
            journal: "Decided to skip this YC batch. Next one opens in ~6 months.",
            execute(s, char, e) { e.ycWeek += 26; return "Decided to skip this batch. Next one opens in ~6 months."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'yc_discussion_early', cat: 'e', from: 'Hacker News',
        body: "YC applications just opened. Stats aren't quite there yet — not launched, no pivot, or no paying subscribers yet. Some apply anyway for partner feedback. Apply or wait?",
        urgency: 12, weeks: 1,
        available: (s, char, e) => s.week >= e.ycWeek && !s.ycDeciding && !s.ycApplied && !s.ycAccepted && (!s.launched || !s.pivot_shipped || s.customers < 1),
        options: [
          { label: 'Start writing anyway', key: 'apply',
            journal: "Going for YC anyway — a long shot, but the partner feedback alone is worth it.",
            execute(s, char, e) { s.ycDeciding = true; s.ycQualified = false; return "Going for it — a long shot, but the partner feedback alone is worth it."; } },
          { label: 'Wait for next batch', key: 'skip',
            journal: "Waiting for the next YC batch. More time to hit the numbers.",
            execute(s, char, e) { e.ycWeek += 26; return "Waiting for next batch. More time to hit the numbers. Next window in ~6 months."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) { e.ycWeek = s.week + 26; },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.hacker_news = def;
})();
