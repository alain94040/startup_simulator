// ─────────────────────────────────────────────────────────────────────────────
// story/users.js — the aggregate Users voice. The character unlocks off the
// waitlist (see cast.js) — the first unlock-with-intro in the cast.
// Pre-launch it has one thing to say: the waitlist is going cold.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const mod = {
    nodes: [
      {
        id: "waitlist_cold", char: "users",
        text: "people who signed up for early access haven't heard from you in 2 weeks. every day you wait, a few more download something else.",
        when: { if: (s) => !s.launched && s.signal > 45 && s.waitlist >= 5 },
        choices: [
          {
            key: "reach", label: "Reach out now",
            journal: "Reached out to the waitlist. Good feedback — people are still excited, want to know when we're launching.",
            effects: { signal: 8, marketFit: 5 },
            fx: () => "Reached out to waitlist. Good feedback — people are still excited, want to know when you're launching.",
          },
        ],
        timeout: {
          weeks: 2,
          effects: { signal: -10 },
          say: { from: "Waitlist", text: "signed up a few weeks ago. assumed the product was dead. unsubscribed." },
        },
      },

      // ── POST-PIVOT: the customer voices of Ch 5 (feed the features-won't-
      //    save-you and build-what-people-want scoring). All gated on the
      //    shipped pivot — pre-pivot, the users' only story is the trough
      //    (see story/slide.js), and these voices would contradict it. ────────
      {
        id: "bug_reports", char: "users", from: "Users",
        text: (s, e) => e.done("bug_reports")
          ? "another crash report — different users, same broken screen. something in this path is still not stable."
          : "all three emailed within an hour. the RSVP button dies on any plan with more than six people — tap, spinner, nothing. the product is unusable for them right now.",
        when: { cooldown: 5, if: (s) => s.launched && s.pivot_shipped && s.customers >= 1 },
        choices: [
          {
            key: "fix", label: "Drop everything and fix it",
            journal: "Dropped everything and fixed the RSVP crash. Users notified. Goodwill recovered.",
            fx: () => "Fixed the crash. Users notified. Goodwill recovered.",
          },
        ],
        timeout: {
          weeks: 2,
          effects: {
            customers: -1, signal: -10,
            schedule: { in: 1, char: "users", say: { from: "Subscriber", text: "we cancelled. the bug never got fixed and our thursday plan fell apart twice because of it. no hard feelings." } },
          },
        },
      },
      {
        id: "churn_interview", char: "users", ambient: true, from: "Customer",
        text: "a paying subscriber just canceled. they RSVP'd to five plans in their first month, then nothing for two weeks — something changed. you have their number.",
        when: { if: (s) => s.launched && s.pivot_shipped && s.customers >= 1 },
        choices: [
          {
            key: "call", label: "Call them — 20 minutes",
            journal: "Called the churned subscriber. Nothing was wrong with the product — the plans near them dried up. They live 40 minutes out, and the calendar in their area went quiet. It's the density lesson wearing a new shirt: own one neighborhood before you promise the whole map.",
            effects: { marketFit: 10, signal: 5 },
            fx: () => "20-minute call. The product wasn't the problem — the plans near them dried up. They live 40 minutes out. Density, again: the app is only alive where the calendar is.",
          },
          {
            key: "email", label: "Send a quick email",
            journal: "Emailed the churned subscriber. One paragraph back. Less than a call, more than nothing.",
            effects: { marketFit: 4 },
            fx: () => "They replied with one paragraph. Less than a call, more than nothing. You have a direction.",
          },
          {
            key: "ignore", label: "Let them go",
            journal: "Let the churned subscriber go. I'll never know why they left.",
            fx: () => "Moved on. You'll never know why they left.",
          },
        ],
        timeout: { weeks: 3 },
      },
      {
        id: "feature_request_custom", char: "users", ambient: true, from: "Your most active subscriber",
        text: "your most active subscriber — four plans hosted, never misses a thursday — messaged this week: 'i'd pay double for standing plans. my climbing group is the same six people every week and i rebuild the plan by hand every time. give me a repeat button with auto-invites.'",
        when: { if: (s) => s.launched && s.pivot_shipped && s.customers >= 3 },
        choices: [
          {
            key: "build", label: "Build standing plans — keep them happy",
            journal: "Built recurring plans for our best host — repeat scheduling, auto-invites, attendance history. They doubled their subscription. It's also two weeks of Alex's time spent on one person's Thursday.",
            effects: { char: { alex: { morale: -8 } } },
            fx(s, e) {
              const alex = e.cast.get("alex");
              if (s.items) s.items.standing_plans = { status: "active", quality: null, assignee: "alex", owner: "alex", effortStart: alex.buildEffort, effortTarget: alex.buildEffort + 3.0 };
              return "Said yes. Alex is heads-down on recurrence rules, auto-invites, and attendance edge cases — for one user's Thursday.";
            },
          },
          {
            key: "decline", label: "Decline — stay on roadmap",
            journal: "Declined the standing-plans request. They churned. The clarity on what NOT to build was worth it.",
            effects: { customers: -1, marketFit: 6 },
            fx: () => "Declined politely. They churned. The clarity on what NOT to build was worth it.",
          },
          {
            key: "negotiate", label: "Build a lightweight version for everyone",
            journal: "Proposed a one-tap 'run it back' button — clone last week's plan, same people invited — instead of a full recurrence engine. Low friction, easy to build. Five other hosts used it the first week.",
            effects: { marketFit: 4 },
            fx: () => "Proposed 'run it back' — one tap clones last week's plan and re-invites the same people. They agreed. Five other hosts used it the first week.",
          },
        ],
        timeout: {
          weeks: 2,
          effects: { customers: -1 },
          say: { from: "Subscriber", text: "waited 2 weeks. downloaded flare. no hard feelings." },
        },
      },
      {
        id: "feature_cluster", char: "users", ambient: true, from: "3 users (separately)",
        text: "none of them know each other. all three asked for the same thing this week — a way to see who's already in before they RSVP to a plan. that's not coincidence.",
        when: { if: (s) => s.launched && s.pivot_shipped && (s.users >= 5 || s.customers >= 2) },
        choices: [
          {
            key: "build", label: "Build the feature",
            journal: "Built the attendee preview three users independently asked for. All 3 loved it. Two immediately referred a friend.",
            effects: { signal: 10, marketFit: 4 },
            fx: () => "Built it — you see the group before you commit to the plan. All 3 users loved it. Two immediately referred a friend.",
          },
        ],
        timeout: {
          weeks: 3,
          effects: {
            signal: -8,
            schedule: { in: 3, char: "users", say: { from: "User", text: "asked about this feature weeks ago. still nothing. starting to wonder if you're listening." } },
          },
        },
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.STORY = window.STORY || []).push(mod);
})();
