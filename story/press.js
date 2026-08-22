// ─────────────────────────────────────────────────────────────────────────────
// story/press.js — the outside world: the Flare arc (the competitor as a
// per-chapter drumbeat), social media, the reporter's deadline, the power
// user's happy churn, the two snake-oil consultants, and the friends-and-
// family micro-checks (Jamie, David).
//
// THE FLARE ARC — one beat per chapter, phase-gated (no after-chains: a beat
// whose chapter passes un-surfaced is a newspaper you missed, not a stuck
// dependency). The design lesson: a competitor launching is DEVASTATING for
// morale — that's the text — but the right move is to steady the team and
// stay on your own roadmap. Copying them is the trap (s.copied_competitor,
// scored under "Features won't save you"). Leaving a beat on read is mostly
// harmless to the company — nobody steadied Alex, that's all.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const mod = {
    nodes: [

      // ── THE FLARE ARC (one beat per chapter) ─────────────────────────────────
      {
        // Ch 1 — mid-build, pre-demo: the gut punch. Someone shipped "your" idea
        // while your product is still a whiteboard.
        id: "flare_stealth", char: "techcrunch", from: "TechCrunch",
        text: "Flare just came out of stealth with $3M — same space, serious relationships, same price point. 5,000 users from one TikTok campaign. alex sent the article at 1am with no comment. jordan replied with one word: 'oof.'",
        when: { if: (s) => s.items != null && !s.has_demo && s.week >= 5 },
        choices: [
          {
            key: "steady", label: "Steady the team — their launch isn't our roadmap",
            journal: "Flare came out of stealth with $3M and the team took it hard. Called both of them: a competitor's launch is proof the problem is real, and their broad-and-shallow approach is exactly what we're not building. Back to work.",
            effects: { marketFit: 3, char: { alex: { morale: 6 }, jordan: { morale: 4 } } },
            fx: () => "You called both of them that morning. A funded competitor is proof the problem is real — and everything in their screenshots is broad and shallow, the exact thing you're not building. Alex exhaled. Back to work.",
          },
          {
            key: "copy", label: "Rework our plan around what they shipped",
            journal: "Panicked at Flare's launch and reworked the plan around their feature list. We're building for their users now, not ours — and Alex knows it.",
            effects: { marketFit: -6, flags: { copied_competitor: true }, char: { alex: { morale: -10, effort: -1.0 } } },
            fx: () => "You spent the week rebuilding the roadmap around their screenshots. Alex shipped none of it happily. You're building their product a year late now, with $2.99M less.",
          },
        ],
        // On read: the company is fine — but nobody talked Alex down.
        timeout: { weeks: 3, effects: { char: { alex: { morale: -6 } } } },
      },
      {
        // Ch 2 — the road to launch: their graph goes up while yours is a checklist.
        id: "flare_10k", char: "techcrunch", from: "TechCrunch",
        text: "Flare crossed 10,000 users and closed a party round. your launch is still a checklist. alex keeps refreshing their app store page between commits — 'should we just add their top three features before we flip the switch?'",
        when: { if: (s) => s.has_demo && !s.launched },
        choices: [
          {
            key: "course", label: "Our launch, our scope — nothing gets added",
            journal: "Flare hit 10K and Alex wanted to stuff their top features into our launch. Held the scope: we launch our product, not a reaction to theirs. He deleted the app store tab.",
            effects: { signal: 3, char: { alex: { morale: 5 } } },
            fx: () => "You held the scope. 'We're not launching a reaction to their product.' Alex closed the app store tab and went back to the launch list — faster, if anything.",
          },
          {
            key: "copy", label: "Add their top three features first",
            journal: "Delayed our launch to bolt on Flare's top three features. Scope creep in its purest form — and the launch list just got two weeks longer.",
            effects: { marketFit: -5, flags: { copied_competitor: true }, char: { alex: { morale: -8, effort: -1.2 } } },
            fx: () => "Three borrowed features went on the launch list. None of them serve your niche, all of them cost build weeks, and Flare will have shipped three more by the time you're live.",
          },
        ],
        timeout: { weeks: 3, effects: { char: { alex: { morale: -5 } } } },
      },
      {
        // Ch 3 — the slide: their shiny feature ships exactly when your graph flattens.
        id: "flare_feature", char: "techcrunch", from: "TechCrunch",
        text: "Flare shipped video dates to a wave of press — the same week your signups flatlined. two of your users emailed asking if plusone will match it. alex forwarded both without comment.",
        when: { if: (s) => s.launched && !s.activities_pivot && !s.pivot_summit_done && s.users >= 3 },
        choices: [
          {
            key: "hold", label: "The evidence work comes first — their feature isn't our leak",
            journal: "Flare shipped video dates the week our graph flattened, and the pressure to match them was real. Held the line: our users aren't leaving for video dates, they're leaving after the match. The evidence work continues.",
            effects: { marketFit: 4, char: { alex: { morale: 3 } } },
            fx: () => "You put the two emails next to Maya's quote and the cohort numbers. Nobody churned asking for video dates — they churned when nothing happened after the match. Their feature is not your leak. Back to the evidence.",
          },
          {
            key: "copy", label: "Match them — build video dates now",
            journal: "Dropped the retention investigation to chase Flare's video dates. Weeks of build for a feature none of our churned users asked for. The real leak is still open.",
            effects: { marketFit: -6, flags: { copied_competitor: true }, char: { alex: { morale: -6, effort: -1.5 } } },
            fx: () => "Alex went heads-down on WebRTC while the week-one cohort kept evaporating. Nobody who churned had asked for video dates. The real leak stayed open the whole time.",
          },
        ],
        timeout: { weeks: 3, effects: { char: { alex: { morale: -4 } } } },
      },
      {
        // Ch 4 — the rebuild: Flare stumbles on the exact thing you pivoted to fix.
        id: "flare_stumble", char: "techcrunch", from: "TechCrunch",
        text: "Flare's growth stalled. their app store rating slid to 3.1 and the top review reads: 'thousands of matches, zero actual dates.' the exact disease you're rebuilding to cure. alex sent it with three exclamation marks — first good morale day in a while.",
        when: { if: (s) => s.activities_pivot && !s.pivot_shipped },
        choices: [
          {
            key: "screenshot", label: "Save the receipt — then back to the rebuild",
            journal: "Flare is stalling on 'matches that go nowhere' — the exact thing v2 fixes. Saved the review for the YC application and sent the team back to the rebuild. Their stumble is our thesis, written by their users.",
            effects: { signal: 4, marketFit: 3, char: { alex: { morale: 6 }, jordan: { morale: 3 } } },
            fx: () => "Screenshot saved — a competitor's users writing your pivot thesis for you. You gave the team one victory lap around the kitchen, then pointed everyone back at the rebuild. The window is open exactly as long as you're fast.",
          },
          {
            key: "gloat", label: "Write the told-you-so thread",
            journal: "Spent a day writing a told-you-so thread about Flare's stumble. Felt great, read petty, moved nothing. The rebuild lost a day.",
            effects: { signal: 2, char: { alex: { morale: 2, effort: -0.5 } } },
            fx: () => "The thread did numbers. It also cost the rebuild a day and read exactly as petty as it was. Their users' complaints were already making your argument better than you could.",
          },
        ],
        timeout: { weeks: 3 },
      },
      {
        // Ch 5 — the proving weeks: the antagonist blinks. They're copying YOU now.
        id: "flare_epilogue", char: "techcrunch", from: "TechCrunch",
        text: "Flare just announced a 'reimagining' — activity-based matching, plans instead of profiles. sound familiar? they have $3M and 40 people to point at your idea. jordan-from-the-group-chat take: 'lol.' alex take: 'we should panic, right?'",
        when: { if: (s) => s.pivot_shipped },
        choices: [
          {
            key: "work", label: "No panic — they validated us. Let the work answer",
            journal: "Flare is pivoting to copy our plans-first model. Told the team the only answer is the work: we're months ahead on the thing that matters and we talk to our users every week. Their copy of our screens won't come with our understanding.",
            effects: { signal: 5, marketFit: 3, char: { alex: { morale: 6 } } },
            fx: () => "A $3M competitor just told the market your pivot was right. They can copy the screens; they can't copy fifty user calls and a rebuilt matching engine. It goes in the application word for word. Back to work.",
          },
          {
            key: "panic", label: "They'll crush us — rush everything out now",
            journal: "Panicked at Flare copying our pivot and rushed half-finished work out the door. Quality dipped exactly when the application needed proof of the opposite.",
            effects: { signal: -4, marketFit: -4, char: { alex: { morale: -8 } } },
            fx: () => "Everything half-done shipped in a week. The bug reports arrived in the same week the application asked for your retention numbers. Panic is a strategy the way falling is flying.",
          },
        ],
        timeout: { weeks: 3 },
      },

      // ── SOCIAL & PRESS ───────────────────────────────────────────────────────
      {
        id: "public_complaint", char: "twitter", from: "Twitter",
        text: "'@plusoneapp matched me with the same guy THREE times. we already dated. this is a bug AND a nightmare.' — 40 retweets and counting.",
        when: { if: (s) => s.launched && (s.users >= 10 || s.customers >= 2) },
        choices: [
          {
            key: "respond", label: "Respond publicly",
            journal: "Responded publicly to the Twitter complaint, fixed the duplicate match bug. The user deleted the tweet and posted an apology.",
            effects: { signal: 5 },
            fx: () => "Responded publicly, fixed the duplicate match bug. The user deleted the tweet and posted an apology. A few people replied saying they'd sign up now.",
          },
        ],
        timeout: {
          weeks: 1,
          // Reputation damage, sized for the trough era: the user base is
          // already a handful, so the hit is signal-heavy, users-light.
          effects: { signal: -18, users: -3 },
          say: { char: "twitter", text: "tweet is at 200 retweets. a dating app journalist screenshot it. signup rate dropped 30%." },
        },
      },
      {
        id: "reporter_deadline", char: "lena", from: "Lena (TechMedia)",
        text: "writing a piece on the new wave of anti-Tinder apps — you'd be the only founder quote. story runs tomorrow 9am. you're out if i don't hear back tonight.",
        when: { if: (s) => s.launched },
        choices: [
          {
            key: "reply", label: "Reply to Lena now",
            journal: "Replied to Lena's deadline. Story ran the next morning.",
            effects: { signal: 10 },
            fx(s, e) {
              const n = 10 + Math.floor(e.rng() * 10);
              s.users += n;
              return "Story ran. " + n + " signups in 24 hours.";
            },
          },
        ],
        timeout: { weeks: 1 }, // deadline journalism: the moment simply passes
      },
      {
        id: "power_user_quiet", char: "tom", from: "Tom (your top user)",
        text: "he was in the app every single day for 6 weeks — swiping, matching, messaging. then nothing for 10 days. something changed.",
        when: { if: (s) => s.launched && s.customers >= 10 },
        choices: [
          {
            key: "call", label: "Call Tom",
            journal: "Called Tom. He met someone on plusone 5 weeks ago — they've been on 7 dates. He forgot to cancel his subscription. He wrote a glowing review before hanging up. Best churn I've ever had.",
            effects: { customers: -1, signal: 16, marketFit: 10 },
            fx: () => "Called Tom. He met someone on plusone 5 weeks ago — they've been on 7 dates. He forgot to cancel his subscription and was a bit embarrassed about it. He's canceling, but he wrote you a glowing review before hanging up. Best churn you've ever had.",
          },
        ],
        timeout: { weeks: 3, effects: { signal: -8, customers: -1 } },
      },

      // ── THE CONSULTANTS (the correct answer is silence) ──────────────────────
      {
        id: "consultant_growth", char: "kevin", from: "Kevin (growth consultant)", ambient: true,
        text: "saw your HN post. quick look at your acquisition funnel and i can see 3 places you're leaving signups on the table. week-long audit, $2,000 flat. guarantee 3× subscribers in 30 days.",
        choices: [
          {
            key: "hire", label: "Hire Kevin for a week — $2,000",
            journal: "Hired Kevin for a growth audit. Got a 58-slide deck titled 'Growth Architecture 2.0.' Top recommendation: post more on LinkedIn. $2,000.",
            effects: { cash: -2000 },
            fx: () => "Kevin delivered a 58-slide deck titled 'Growth Architecture 2.0'. His top recommendation: post more on LinkedIn. He invoiced before the final call.",
          },
        ],
        timeout: {
          weeks: 2,
          say: { char: "kevin", text: "reaching out one more time — this offer won't be available much longer. founders who act early see the biggest gains." },
        },
      },
      {
        id: "consultant_brand", char: "brett", from: "Brett (brand strategist)", ambient: true,
        text: "found you on crunchbase. you're using the same language as tinder and bumble — 'find your match.' i can't tell you apart in 10 seconds. one-day workshop to fix that, $1,500. i work directly with founders.",
        choices: [
          {
            key: "hire", label: "Book the session — $1,500",
            journal: "Hired Brett for a brand workshop. 45 minutes of sticky notes and a 'narrative architecture' framework. His main insight: 'lean into your why.' I already knew this. $1,500.",
            effects: { cash: -1500 },
            fx: () => "45 minutes of sticky notes and a 'narrative architecture' framework. Brett's main insight: 'lean into your why.' You already knew this. He emailed his invoice immediately.",
          },
        ],
        timeout: {
          weeks: 2,
          say: { char: "brett", text: "just wanted to follow up — offer stands. a lot of founders wait too long on this." },
        },
      },

      // ── FRIENDS & FAMILY MICRO-CHECKS ────────────────────────────────────────
      {
        id: "ff_friend", char: "jamie", from: "Jamie (college friend)", ambient: true,
        text: "heard you actually quit to do this full time. wild. coffee this week? i've been wanting to hear — a dating app, seriously?",
        when: { if: (s) => s.week <= 10 },
        choices: [
          {
            key: "tell", label: "Tell him about it",
            journal: "Caught up with Jamie over coffee. Told him everything. He was into it — put him on the waitlist.",
            effects: { waitlist: 1 },
            fx: () => "Caught up over coffee. Told him everything. He was into it — 'a dating app that actually works? I need to try this.' You put him on the waitlist.",
          },
        ],
        timeout: { weeks: 3 },
      },
      {
        id: "ff_friend_ask", char: "jamie", from: "Jamie (college friend)",
        text: "hey — been thinking about what you told me. i want to support this somehow. can we talk again?",
        when: { took: ["ff_friend:tell"], delay: 4, if: (s, e) => e.weeksSince("ff_friend") <= 12 },
        choices: [
          {
            key: "ask", label: "Ask him to invest",
            reply: "sure thing.",
            fx(s, e) {
              if (e.rng() < 0.7) { s.cash += 5000; return "Jamie sent $5,000 via Venmo. 'Least I could do — you'd have done the same for me. go build something great.'"; }
              return "Jamie's cash is tied up right now — car loan and a wedding coming up. 'I'm rooting for you though.'";
            },
          },
        ],
        timeout: { weeks: 3 },
      },
      {
        id: "ff_mentor", char: "david", from: "David (ex-manager)", ambient: true,
        text: "keeping an eye on what you're doing. would love to grab lunch — been a while. let me know when you're free.",
        when: { if: (s) => s.week <= 12 },
        choices: [
          {
            key: "lunch", label: "Have lunch with David",
            journal: "Good lunch with David. Sharp questions about the dating app space. He wants something concrete — what makes people stay.",
            fx: () => "Good lunch. David asked sharp questions about the dating app space. 'Send me something concrete this week — what makes people actually stay?'",
          },
        ],
        timeout: { weeks: 3 },
      },
      {
        id: "ff_mentor_pitch", char: "david", from: "David (ex-manager)",
        text: "been chewing on what you told me at lunch. want to grab coffee and go through the numbers?",
        when: { took: ["ff_mentor:lunch"], delay: 3, if: (s, e) => e.weeksSince("ff_mentor") <= 10 },
        choices: [
          {
            key: "pitch", label: "Show him the deck",
            fx(s, e) {
              if (e.rng() < 0.7) {
                s.cash += 4000;
                return "David pulled out his checkbook. $4,000. 'Pay me back by building the thing.'";
              }
              return "Great coffee. David's being conservative with money this year — new baby coming. 'I'm rooting for you though.'";
            },
          },
        ],
        timeout: { weeks: 3 },
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.STORY = window.STORY || []).push(mod);
})();
