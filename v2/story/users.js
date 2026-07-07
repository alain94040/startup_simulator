// ─────────────────────────────────────────────────────────────────────────────
// v2/story/users.js — the aggregate Users voice. The character unlocks off the
// waitlist (see v2/cast.js) — the first unlock-with-intro in the v2 slice.
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

      // ── POST-LAUNCH: the customer voices (feed the features-won't-save-you
      //    and build-what-people-want scoring) ──────────────────────────────────
      {
        id: "bug_reports", char: "users", from: "Users",
        text: (s, e) => e.done("bug_reports")
          ? "another crash report — different users, same broken screen. something in this path is still not stable."
          : "all three emailed within an hour. the messaging screen goes blank when someone sends a photo. the product is unusable for them right now.",
        when: { cooldown: 5, if: (s) => s.launched && s.customers >= 1 },
        choices: [
          {
            key: "fix", label: "Drop everything and fix it",
            journal: "Dropped everything and fixed the crash. Users notified. Goodwill recovered.",
            fx: () => "Fixed the crash. Users notified. Goodwill recovered.",
          },
        ],
        timeout: {
          weeks: 2,
          effects: {
            customers: -2, signal: -10,
            schedule: { in: 1, char: "users", say: { from: "Subscriber", text: "we cancelled. the bug never got fixed and we had a deadline. no hard feelings." } },
          },
        },
      },
      {
        id: "churn_interview", char: "users", from: "Customer",
        text: "a paying subscriber just canceled. they had 5 active conversations going 3 days ago — something changed. you have their number.",
        when: { if: (s) => s.launched && s.customers >= 1 },
        choices: [
          {
            key: "call", label: "Call them — 20 minutes",
            journal: "Called the churned subscriber. They left because Flare launched video dates — the one thing they'd been asking for. Now I know exactly what to build next.",
            effects: { marketFit: 10, signal: 5 },
            fx: () => "20-minute call. They left because Flare launched video dates — the one thing they'd been asking for. You now know exactly what to build next.",
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
        id: "feature_request_custom", char: "users", from: "Your most active subscriber",
        text: "a power user who's been on 4 dates from kindred messaged this week: 'i'd pay double if you add video dates. i always need to move to FaceTime before i'm comfortable meeting someone. it breaks the flow.'",
        when: { if: (s) => s.launched && s.customers >= 3 },
        choices: [
          {
            key: "build", label: "Build video dates — keep them happy",
            journal: "Built video dates for our power user. They doubled their plan — but it's really built around one person's workflow.",
            effects: { char: { alex: { morale: -8 } } },
            fx(s, e) {
              const alex = e.cast.get("alex");
              if (s.items) s.items.video_dates = { status: "active", quality: null, assignee: "alex", owner: "alex", effortStart: alex.buildEffort, effortTarget: alex.buildEffort + 3.0 };
              return "Said yes. Alex is heads-down on video infrastructure — WebRTC, TURN servers, recording consent.";
            },
          },
          {
            key: "decline", label: "Decline — stay on roadmap",
            journal: "Declined the video dates request. They churned. The clarity on what NOT to build was worth it.",
            effects: { customers: -1, marketFit: 6 },
            fx: () => "Declined politely. They churned. The clarity on what NOT to build was worth it.",
          },
          {
            key: "negotiate", label: "Build a lightweight version for everyone",
            journal: "Proposed a 60-second video hello instead of full video calls. Low friction, easy to build. 5 other subscribers turned it on immediately.",
            effects: { marketFit: 4 },
            fx: () => "Proposed a 60-second video hello instead of full video calls — low friction, easy to build. They agreed. Took 2 weeks but 5 other subscribers turned it on immediately.",
          },
        ],
        timeout: {
          weeks: 2,
          effects: { customers: -1 },
          say: { from: "Subscriber", text: "waited 2 weeks. downloaded flare. no hard feelings." },
        },
      },
      {
        id: "feature_cluster", char: "users", from: "3 users (separately)",
        text: "none of them know each other. all three asked for the same thing this week — a way to signal they're looking for something serious before matching. that's not coincidence.",
        when: { if: (s) => s.launched && (s.users >= 5 || s.customers >= 2) },
        choices: [
          {
            key: "build", label: "Build the feature",
            journal: "Built the feature three users independently asked for. All 3 loved it. Two immediately referred a friend.",
            effects: { signal: 10, marketFit: 4 },
            fx: () => "Built the feature. All 3 users loved it. Two immediately referred a colleague.",
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
  else (window.V2STORY = window.V2STORY || []).push(mod);
})();
