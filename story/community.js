// ─────────────────────────────────────────────────────────────────────────────
// story/community.js — the communities feed: four threads before launch.
// (The YC application lives in story/fundraising.js on the yc thread.)
//
// Two kinds of community, one job each:
//   · r/datingapps is where your USERS talk — market research happens here.
//   · Hacker News and Indie Hackers are where FOUNDERS talk — startup advice,
//     not insight about daters. Plugging a dating app there is the wrong room.
//
// Every thread offers the same two moves, and they differ in time as well as
// in kind:
//   · promote — only while the thread is live (the week it surfaces). A few
//     signups now; nothing learned. The trap: it feels like traction.
//   · read    — the comments are still there next week, so it can wait while
//     this week's actions go elsewhere. It banks what the thread said.
// Reading the first thread in a community earns a third move on the second
// one (a research-gated ⚑ option): DM the people behind the comments. Leaving
// a thread on read is free — it just scrolls away with nothing banked.
//
// What gets banked pays three ways: scoring.js grades the threads directly
// (under "Build something people want"); s.heard_fake_profiles arms the
// trust-&-safety flagship option (story/dev_directions.js); and each DM takes
// half a week off the v2 rebuild (knowV2, below).
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  // Promote is on the table only the week the thread is live. `branch: true`:
  // the gate is the thread's age, not something the player earned, so the UI
  // must not flag it ⚑ like a research unlock.
  const live = (s, e) => !!(e.open.hacker_news && e.open.hacker_news.week === s.week);

  // A DM is a conversation about what happens AFTER the match — the exact
  // question v2 answers. Each one takes half a week off the v2 plans board
  // (world.js: BOARD_WEEKS + s.board_extra), the same size as Alex's
  // cut-to-the-bone scope call: when the rebuild comes, you already know
  // what it has to do. Pre-launch research paid back in the one currency
  // that decides the deadline — rebuild weeks.
  const knowV2 = (s) => { s.board_extra = (s.board_extra || 0) - 0.5; };

  const thread = (o) => ({
    id: o.id, char: "hacker_news", from: o.from, ambient: true,
    text: o.text,
    when: o.when,
    choices: [
      { key: "promote", label: o.promote.label, branch: true, if: live,
        journal: o.promote.journal, effects: o.promote.effects,
        fx: (s) => { s.community_promoted = (s.community_promoted || 0) + 1; return o.promote.outcome; } },
      { key: "read", label: o.read.label,
        journal: o.read.journal, effects: o.read.effects, fx: () => o.read.outcome },
      ...(o.dm ? [{ key: "dm", label: o.dm.label, if: o.dm.if,
        journal: o.dm.journal, effects: o.dm.effects,
        fx: (s) => { knowV2(s); return o.dm.outcome; } }] : []),
    ],
    timeout: { weeks: 2 }, // live this week, readable the next — then it's gone
  });

  const mod = {};
  mod.nodes = [
    // ── 1 · r/datingapps: the market complains (users) ──────────────────────
    // Week 4, not 3: week 3 is the first free week after the equity sitting,
    // and it holds exactly one card per kind of call — the team (Alex), the
    // market (the interviews), money (Mom).
    thread({
      id: "community_datingapps", from: "r/datingapps",
      text: "r/datingapps — top post this week: 'what's actually wrong with the apps you use?' 400 comments and climbing. the people you're building for, talking openly.",
      when: { if: (s) => !s.launched && s.week >= 4 },
      promote: {
        label: "Post the waitlist link",
        journal: "Dropped the waitlist link in the r/datingapps thread. Six signups — then a moderator removed it for self-promotion.",
        effects: { waitlist: 6, signal: 2 },
        outcome: "Six signups in an hour. Then the comment vanished: 'removed — rule 3, no self-promotion.'",
      },
      read: {
        label: "Read the comments, note the themes",
        journal: "Read all 400 comments of the r/datingapps thread with a notepad open. Three themes: fake profiles (by far the loudest), matches that never turn into dates, and swipe fatigue.",
        effects: { marketFit: 3, flags: { read_dating_thread: true, heard_fake_profiles: true } },
        outcome: "An evening, 400 comments, one notepad. Fake profiles came up more than everything else combined.",
      },
    }),

    // ── 2 · Hacker News: startup advice (founders) ──────────────────────────
    thread({
      id: "community_hn", from: "Hacker News",
      text: "'Ask HN: how did you get your first 100 users for a consumer app?' — 250 comments, mostly founders who've done it, some who didn't make it.",
      when: { if: (s) => !s.launched && s.week >= 6 },
      promote: {
        label: "Plug plusone in a comment",
        journal: "Plugged plusone in an Ask HN thread. Two signups — both developers asking about the stack, neither of them looking for a date.",
        effects: { waitlist: 2, signal: 2 },
        outcome: "Two signups. Both asked what the backend is written in. Neither is single.",
      },
      read: {
        label: "Read what the founders say",
        journal: "Read the Ask HN thread on first users end to end. The consensus from people who've done it: launch to one small community that already gathers, not to the whole internet.",
        effects: { signal: 2, flags: { read_founder_advice: true } },
        outcome: "Founder after founder, the same answer: pick one small community that already gathers, and launch there first.",
      },
    }),

    // ── 3 · r/datingapps: the competitor, through its users' eyes ───────────
    // Surfaces only once Flare has made the news (story/press.js), so the
    // thread never names a competitor the founder hasn't heard of. The press
    // beat is the gut punch; this is the other side of it.
    thread({
      id: "community_flare_thread", from: "r/datingapps",
      text: "r/datingapps: 'anyone tried Flare? worth it?' — 'honestly the app is gorgeous.' 'five matches my first day.' 'they're all over my TikTok.' further down: 'matched with 40 people, went on zero dates.' 'half the profiles feel like bots.' and one reply nobody answered: 'someone mentioned plusone? anyone know what that is?'",
      when: { if: (s, e) => !s.launched && s.week >= 8 && (e.done("flare_stealth") || e.done("flare_10k")) },
      promote: {
        label: "Answer: try plusone instead",
        journal: "Answered 'try plusone instead' under the Flare thread. Two signups — and 'founder shill?' got more upvotes than my comment.",
        effects: { waitlist: 2, signal: -2 },
        outcome: "Two signups. Then: 'founder shill?' — 30 upvotes, three more than your comment.",
      },
      read: {
        label: "Read the whole thread",
        journal: "Read every comment about Flare. Their app is beautiful and they're everywhere. And their users are saying exactly what we're building for: forty matches, zero dates, too many bots.",
        effects: { marketFit: 2, flags: { heard_fake_profiles: true, read_flare_thread: true } },
        outcome: "Their app is gorgeous, they're everywhere, and they have $3M. Their users are also describing, word for word, the problem you're solving.",
      },
      dm: {
        // Earned by reading the first r/datingapps thread: you know by now
        // that the people worth hearing from are in the comments.
        label: "DM the people who gave up on Flare",
        if: (s) => !!s.read_dating_thread,
        journal: "DM'd five people who'd given up on Flare. Three got on a call. Nobody wanted more matches — they wanted one that turns into an actual evening. All three joined the waitlist.",
        effects: { marketFit: 5, waitlist: 3, flags: { heard_fake_profiles: true, read_flare_thread: true, dm_flare_users: true } },
        outcome: "Five DMs, three calls. Nobody who left Flare wanted more matches. They wanted one that turns into an evening. All three joined the waitlist.",
      },
    }),

    // ── 4 · Indie Hackers: the post-mortem (founders) ───────────────────────
    thread({
      id: "community_ih", from: "Indie Hackers",
      text: "indie hackers: 'we shut down our dating app after 8 months — here's everything.' same angle as yours. the founder is answering questions in the comments today.",
      when: { if: (s) => !s.launched && s.week >= 10 },
      promote: {
        label: "Reply: here's why we're different",
        journal: "Replied to the dating-app post-mortem with why plusone is different. A few likes. Reading it back, it's a pitch under someone's obituary.",
        effects: { signal: 2 },
        outcome: "A few likes. Reading it back, it's a pitch under someone's obituary.",
      },
      read: {
        label: "Read why it died",
        journal: "Read the dating-app post-mortem twice. Signups were never the problem. They died of retention: people matched, chatted for a day, and never met.",
        effects: { marketFit: 2, flags: { read_postmortem: true } },
        outcome: "Signups were never their problem. People matched, chatted for a day, and never met. Month 8, lights out.",
      },
      dm: {
        // Earned by reading the Ask HN thread: founders answer founders.
        label: "DM the founder",
        if: (s) => !!s.read_founder_advice,
        journal: "DM'd the founder of the dating app that shut down. We talked the next day. 'We measured matches. We should have measured whether anyone actually met.'",
        effects: { marketFit: 3, flags: { read_postmortem: true, dm_postmortem: true } },
        outcome: "A call the next day. 'We measured matches. We should have measured whether anyone actually met.'",
      },
    }),
  ];

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.STORY = window.STORY || []).push(mod);
})();
