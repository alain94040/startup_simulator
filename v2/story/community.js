// ─────────────────────────────────────────────────────────────────────────────
// v2/story/community.js — the communities feed (HN / Reddit / Indie Hackers).
// (The YC application lives in story/fundraising.js on the yc thread.)
//
// The three staged pre-launch ladders port as plain chains: each rung is
// `after: [previous], delay: 3` — the old stage/stage_week flag pairs are gone.
// Every `engage` increments s.community_engaged_count, which is what unlocks
// the trust-&-safety flagship option (story/dev_directions.js) — engaged
// founders get to make safety the brand.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const engage = (n) => { return (s) => { s.community_engaged_count = (s.community_engaged_count || 0) + 1; return n; }; };

  // One rung of a community ladder.
  const rung = (o) => ({
    id: o.id, char: "hacker_news", from: o.from, ambient: true,
    text: o.text,
    when: o.when,
    choices: [
      { key: "engage", label: o.engageLabel, journal: o.engageJournal,
        effects: o.engageEffects, fx: engage(o.engageOutcome) },
      { key: "skip", label: o.skipLabel, journal: o.skipJournal,
        effects: o.skipEffects, fx: () => o.skipOutcome },
    ],
    timeout: { weeks: 1 }, // news is ephemeral — engage that week or the thread scrolls away (the ladder still advances)
  });

  const mod = {};
  mod.nodes = [
    {
      id: "hn_thread", char: "hacker_news", from: "Hacker News", ambient: true,
      text: "'Ask HN: Why are dating apps still so bad in 2026?' — top thread right now, 300 comments. this is your market talking openly.",
      when: { if: (s) => !s.launched },
      choices: [
        {
          key: "engage", label: "Engage the thread",
          journal: "Engaged the HN thread authentically. 7 DMs requesting early access.",
          effects: { signal: 12, marketFit: 3, waitlist: 7 },
          fx: engage("Engaged the thread authentically. 7 DMs requesting early access."),
        },
      ],
      timeout: { weeks: 1, effects: { signal: -3 } },
    },

    // ── HN ladder ────────────────────────────────────────────────────────────
    rung({
      id: "community_hn_1", from: "Hacker News",
      text: "there's an Ask HN thread about what's broken with dating apps. 200 comments. the top answer is a shared Google spreadsheet where people manually track matches across apps. it has 50,000 views.",
      when: { if: (s) => !s.launched && s.week >= 4 },
      engageLabel: "Drop a comment",
      engageJournal: "Commented on the HN thread with a genuine take. 4 people DM'd asking when we're launching.",
      engageEffects: { signal: 6, waitlist: 4, marketFit: 1 },
      engageOutcome: "Commented with a genuine take. 4 people DM'd asking when you're launching.",
      skipLabel: "Read and move on", skipJournal: "Read the HN thread. Nothing actionable right now.",
      skipOutcome: "Read it. Nothing actionable right now.",
    }),
    rung({
      id: "community_hn_2", from: "Hacker News",
      text: "another HN thread about dating apps, bigger this time. people are explicitly asking for something that actually helps — not another swipe interface.",
      when: { after: ["community_hn_1"], delay: 3, if: (s) => !s.launched },
      engageLabel: "Leave a detailed reply",
      engageJournal: "Left a detailed reply on the HN thread. Two people asked to be notified at launch — one is a former PM at a big company.",
      engageEffects: { signal: 7, waitlist: 5 },
      engageOutcome: "Left a detailed reply. Two people asked to be notified at launch. One is a former PM at a big company.",
      skipLabel: "Leave it", skipJournal: "Didn't engage the HN thread. Kept building.",
      skipOutcome: "Didn't engage. Kept building.",
    }),
    rung({
      id: "community_hn_3", from: "Hacker News",
      text: "someone posted your exact frustration as an HN thread. it hit the front page. three comments specifically mention wanting a real product, not 'tinder but slightly different.'",
      when: { after: ["community_hn_2"], delay: 3, if: (s) => !s.launched },
      engageLabel: "Share the waitlist link",
      engageJournal: "Shared the waitlist link on HN. 8 signups from the thread. One person asked for early access.",
      engageEffects: { signal: 9, waitlist: 8, marketFit: 2 },
      engageOutcome: "Shared the link. 8 signups from the thread. One person asked for early access — you said yes.",
      skipLabel: "Stay quiet for now", skipJournal: "Watched the HN thread from the sidelines. Three potential users moved on.",
      skipEffects: { signal: 2 },
      skipOutcome: "Watched from the sidelines. Three potential users moved on. The thread died.",
    }),

    // ── Reddit ladder ────────────────────────────────────────────────────────
    rung({
      id: "community_reddit_1", from: "Reddit",
      text: "r/datingapps — top post this week: 'what apps do you actually use and why?' 200 comments, mostly complaints about ghosting and time-wasters.",
      when: { if: (s) => !s.launched && s.week >= 6 },
      engageLabel: "Join the conversation",
      engageJournal: "Joined the Reddit conversation as a builder. 2 people signed up for early access.",
      engageEffects: { signal: 5, waitlist: 2, marketFit: 2 },
      engageOutcome: "Joined as a builder, not a promoter. 2 people signed up for early access.",
      skipLabel: "Skip it", skipJournal: "Skipped the Reddit thread. Staying focused.",
      skipOutcome: "Skipped. Staying focused.",
    }),
    rung({
      id: "community_reddit_2", from: "Reddit",
      text: "a reddit thread analyzing why the last three 'anti-Tinder' startups all failed. the pattern is uncomfortably familiar.",
      when: { after: ["community_reddit_1"], delay: 3, if: (s) => !s.launched },
      engageLabel: "Respond with your read on it",
      engageJournal: "Added my take on why anti-Tinder startups keep failing. 12 upvotes, 3 private follow-ups.",
      engageEffects: { signal: 5, marketFit: 4 },
      engageOutcome: "Added your take on where they missed. 12 upvotes. Three people followed up privately.",
      skipLabel: "Take notes and move on", skipJournal: "Took notes from the Reddit thread. Three failure modes to avoid.",
      skipEffects: { marketFit: 2 },
      skipOutcome: "Read everything. Three things to avoid. Filed away.",
    }),
    rung({
      id: "community_reddit_3", from: "Reddit",
      text: "someone posted your landing page on r/datingapps without asking. 40 upvotes. people in the comments are asking when it launches.",
      when: { after: ["community_reddit_2"], delay: 3, if: (s) => !s.launched },
      engageLabel: "Jump in as the founder",
      engageJournal: "Jumped into the Reddit thread as the founder. Thread stayed warm for two days. 7 signups.",
      engageEffects: { signal: 8, waitlist: 7, marketFit: 2 },
      engageOutcome: "Jumped in as the founder. Thread stayed warm for two days. 7 signups.",
      skipLabel: "Let it run on its own", skipJournal: "Let the Reddit thread run on its own. 3 signups without lifting a finger.",
      skipEffects: { signal: 3, waitlist: 3 },
      skipOutcome: "Organic momentum. 3 signups without lifting a finger.",
    }),

    // ── Indie Hackers ladder ─────────────────────────────────────────────────
    rung({
      id: "community_ih_1", from: "Indie Hackers",
      text: "a thread on Indie Hackers: 'how do you validate a consumer social app before you build?' — half the comments describe the exact frustration kindred is trying to solve.",
      when: { if: (s) => !s.launched && s.week >= 8 },
      engageLabel: "Share what you've learned",
      engageJournal: "Posted an honest update on Indie Hackers. 5 people followed up with their own experiences.",
      engageEffects: { signal: 5, marketFit: 1 },
      engageOutcome: "Posted an honest update. 5 people followed up with their own experiences. Real signal.",
      skipLabel: "Skip it", skipJournal: "Skipped the Indie Hackers thread. Head down this week.",
      skipOutcome: "Skipped. Head down this week.",
    }),
    rung({
      id: "community_ih_2", from: "Indie Hackers",
      text: "an indie hacker just published a post-mortem for a dating app that tried your exact angle. failed in month 8. you read every word.",
      when: { after: ["community_ih_1"], delay: 3, if: (s) => !s.launched },
      engageLabel: "Reply with what you're doing differently",
      engageJournal: "Replied to the dating app post-mortem on Indie Hackers with what we're doing differently. The author DM'd me.",
      engageEffects: { signal: 5, marketFit: 5 },
      engageOutcome: "Left a detailed reply on what you learned from their mistakes. The author DM'd you. Useful conversation.",
      skipLabel: "Take notes privately", skipJournal: "Took notes from the IH post-mortem. Three failure modes to avoid.",
      skipEffects: { marketFit: 3 },
      skipOutcome: "Took notes. Three failure modes to avoid. Filed away.",
    }),
    rung({
      id: "community_ih_3", from: "Indie Hackers",
      text: "indie hackers build-in-public thread for consumer social apps. five founders posting weekly updates. your waitlist is half the size of the least active one.",
      when: { after: ["community_ih_2"], delay: 3, if: (s) => !s.launched },
      engageLabel: "Start posting weekly updates",
      engageJournal: "Started posting weekly updates on Indie Hackers. 6 new subscribers in 48 hours. Two founders reached out.",
      engageEffects: { signal: 6, waitlist: 6 },
      engageOutcome: "First public update posted. 6 new subscribers in 48 hours. Two founders reached out to compare notes.",
      skipLabel: "Keep heads down", skipJournal: "Stayed quiet on Indie Hackers. The gap with other builders is widening.",
      skipOutcome: "Stayed quiet. The gap is widening.",
    }),

  ];

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.V2STORY = window.V2STORY || []).push(mod);
})();
