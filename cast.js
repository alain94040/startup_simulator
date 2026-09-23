// ─────────────────────────────────────────────────────────────────────────────
// cast.js — the character registry. Who exists, how they're introduced, and
// their simulation parameters. Story content (what they say) lives in
// story/*.js; a character here is just a name, an unlock rule, and stats.
//
//   { id, name, role, type, noChat?, intro?, unlock?(s, e),
//     start?: { morale, trust, focus },
//     skills?: { build, discover, pitch },       // passive weekly contribution
//     effortMult?(s, char),                       // scales direction-call effort grants
//     passiveMult?(s, char),                      // scales passive weekly accrual
//     members?,                                   // group chats only: who's in the room
//     milestones? }                                // founder only: journal stamps
//
// A `type: "group"` entry is a thread that is a room rather than a person: it
// has `members` and no stats, and every message in it names its own `speaker`
// (see engine.js's _show/_say). Content addresses it like any other thread —
// `char: "founders"` to have someone talk in it, `replyTo: "founders"` to post
// the founder's own answer there.
//
// Order matters: it is the rail order; founder stays last.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const CAST = [
    {
      id: "alex", name: "Alex", role: "Co-founder · CTO", type: "cofounder",
      start: { morale: 80, trust: 90, focus: "build" },
      skills: { build: 1.2, discover: 0.7, pitch: 0.5 },
      // Alex is part-time until he commits — his effort grants and passive
      // accrual shrink so the commitment lesson survives (see alex_commitment
      // in the full game; the flag is set by that arc when ported).
      effortMult: (s, char) => (char.flags.committed_fulltime ? 1.0 : 0.6),
      passiveMult: (s, char) => (char.flags.committed_fulltime ? 1.0 : 0.4),
    },
    {
      id: "jordan", name: "Jordan", role: "Co-founder · iOS", type: "cofounder",
      start: { morale: 80, trust: 90, focus: "build" },
      skills: { build: 0.7 },
    },
    {
      // The founders' group chat — a thread that is a ROOM, not a person.
      // `members` is what the UI draws (stacked avatars, "Alex, Jordan" in the
      // header); every message in here carries its own `speaker`, because the
      // thread's owner isn't the one talking. It holds no morale/trust of its
      // own: what gets said here lands on the members, via their own stats.
      //
      // It opens once Jordan's invitation is actually resolved — answered
      // (into the formal sit-down) or left on read (into the same
      // conversation happening piecemeal, one text at a time, over the
      // coming weeks). Unlocking any earlier, on the incorporation or the
      // invitation itself, would show an empty "Alex & Jordan" row in the
      // rail before the room has anything in it.
      id: "founders", name: "Alex & Jordan", role: "Group · you, Alex, Jordan",
      type: "group", members: ["alex", "jordan"],
      unlock: (s, e) => e.done("equity_open"),
    },
    {
      // The pivot-night thread: the founder starts it (story/pivot_day.js) to
      // stop Alex's growth push long enough to ask one question. A room, like
      // `founders` — every message names its speaker, and Priya's in it.
      // Unlocks the moment the founder asks for it, never before, so the rail
      // never shows an empty row.
      id: "summit", name: "what are we building monday", role: "Group · you, Alex, Jordan, Priya",
      type: "group", members: ["alex", "jordan", "priya"],
      unlock: (s, e) => e.took("pivot_hail_mary:hold"),
    },
    {
      id: "mom", name: "Mom", role: "Family", type: "family",
      // Mom texts from week 3 — she waits a beat, but she is family, not a
      // consequence of the paperwork: gating her on `s.incorporated` (as this
      // rule briefly did) deleted the whole family-money arc for any founder
      // who left the incorporation card on read.
      unlock: (s) => s.week >= 3,
    },
    {
      id: "priya", name: "Priya", role: "Advisor", type: "advisor",
      // Two ways in: the founder meetup (early), or — if the player never went —
      // she reaches out herself once the launch makes PlusOne visible. Either
      // way the pivot summit always has its second voice.
      unlock: (s) => (s.met_priya === true && s.week >= (s.met_priya_week || 0) + 2)
        || (s.launched && s.week >= (s.launch_week || 0) + 2),
      intro: (s) => s.met_priya
        ? "hey! great meeting you at the meetup last week. been thinking about what you're building — i have some thoughts on the dating app space when you have a minute."
        : "hey — you don't know me. priya. a friend sent me plusone's launch thread; i ran a consumer social app for four years, sold it, now i mostly drink coffee with founders. i've seen your week-two graph before — not yours specifically, but i'd bet rent on the shape. this is me offering the coffee.",
    },
    {
      id: "sarah", name: "Sarah", role: "Community leader", type: "connector",
      unlock: (s) => s.launched && !!s.activities_pivot,
      intro: "hey — heard about plusone from a mutual friend. i run a singles community in SF and i think there could be a fit.",
    },
    {
      id: "jamie", name: "Jamie", role: "College friend", type: "family",
      unlock: (s) => s.week >= 3,
    },
    {
      id: "david", name: "David", role: "Ex-manager", type: "family",
      unlock: (s) => s.week >= 7 && s.items != null,
      intro: "keeping an eye on what you're doing. would love to grab lunch — been a while.",
    },
    {
      id: "kevin", name: "Kevin", role: "Growth consultant", type: "consultant",
      unlock: (s) => s.launched && s.customers >= 3,
      intro: "saw your HN post. i do growth audits for consumer startups — think i can help.",
    },
    {
      id: "brett", name: "Brett", role: "Brand consultant", type: "consultant",
      unlock: (s, e) => s.incorporated && e.done("hn_thread") && s.week >= 4,
      intro: "found you on crunchbase. i work with early-stage founders on positioning — dropping you a line.",
    },
    {
      id: "hacker_news", name: "HN / Reddit", role: "Communities", type: "platform",
    },
    {
      id: "techcrunch", name: "Market", role: "Industry news", type: "press",
      unlock: (s) => s.items != null,
    },
    {
      id: "twitter", name: "Twitter", role: "Social media", type: "platform",
      unlock: (s) => s.launched && (s.users >= 10 || s.customers >= 2),
      intro: "people are talking about plusone on social media.",
    },
    {
      id: "lena", name: "Lena", role: "Tech journalist", type: "press",
      unlock: (s) => !!s.launched,
      intro: "hi — i'm a reporter covering the consumer dating space. might want to feature you in an upcoming piece.",
    },
    {
      id: "tom", name: "Tom", role: "Power user", type: "customer",
      unlock: (s) => s.launched && s.customers >= 10,
      intro: "your most active subscriber just went quiet.",
    },
    {
      id: "users", name: "Users", role: "Your customers", type: "customer",
      unlock: (s) => s.waitlist >= 5 || s.users >= 3 || s.customers >= 1,
      intro: (s) => (s.users >= 3 || s.customers >= 1)
        ? "you have real users now. they're going to start talking."
        : "the waitlist just crossed a real number. people are starting to expect to hear from you.",
    },
    {
      id: "growth", name: "Growth", role: "Traction", type: "platform",
      unlock: (s) => s.productPhase === "product" || s.launched,
    },
    {
      id: "analytics", name: "Analytics", role: "Product data", type: "system",
      // Unlocks early if you BOUGHT analytics (the "sight" payoff), otherwise
      // only once there's real post-launch traffic to look at.
      unlock: (s) => s.analytics_live || (s.launched && (s.users >= 3 || s.customers >= 1)),
      intro: "analytics are live — enough data to start seeing patterns.",
    },
    {
      id: "founder", name: "You", role: "Founder · Journal", type: "founder",
      milestones: [
        { key: "building", cls: "green", label: "We're Building", test: (s, e) => e.done("start_prototype") },
        { key: "incorporated", cls: "blue", label: "Incorporated", test: (s) => !!s.incorporated },
        { key: "equity", cls: "red", label: "Equity Signed", test: (s) => !!s.jordan_equity },
        { key: "demo", cls: "green", label: "First Demo", test: (s) => !!s.has_demo },
        { key: "launched", cls: "green", label: "Launched", test: (s) => !!s.launched },
        { key: "pivotshipped", cls: "green", label: "Shipped v2", test: (s) => !!s.pivot_shipped },
        { key: "firstcust", cls: "blue", label: "First Customer", test: (s) => s.customers >= 1 },
        { key: "yc", cls: "red", label: "YC Accepted", test: (s) => !!s.ycAccepted },
      ],
    },
  ];

  if (typeof module !== "undefined" && module.exports) module.exports = CAST;
  else window.CAST = CAST;
})();
