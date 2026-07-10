// ─────────────────────────────────────────────────────────────────────────────
// v2/story/press.js — the outside world: the competitor arc (Flare), social
// media, the reporter's deadline, the power user's happy churn, the two
// snake-oil consultants, and the friends-and-family micro-checks (Jamie,
// David). Mostly ambient texture; the competitor arc feeds the
// features-won't-save-you and moat lessons.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const mod = {
    nodes: [

      // ── THE COMPETITOR ARC (Market feed) ─────────────────────────────────────
      {
        id: "competitor_launch", char: "techcrunch", from: "TechCrunch",
        text: "Flare just came out of stealth with $3M. same space — serious relationships, same price point. they already have 5,000 users from a TikTok campaign.",
        when: { if: (s) => s.has_demo },
        choices: [
          {
            key: "study", label: "Study what they built",
            journal: "Spent 2 weeks mapping Flare's product. They went broad — swiping, video dates, lots of noise. Our niche is the gap they skipped.",
            effects: { marketFit: 8, signal: 4, flags: { competitive_intel: true }, char: { alex: { morale: -3 } } },
            fx: () => "Spent 2 weeks mapping their product. They went broad — swiping, video dates, lots of noise. Your niche is the gap they skipped.",
          },
          {
            key: "compare", label: "Write a comparison piece",
            journal: "Published a direct comparison with Flare. Our niche is clearer now. Alex is rattled but focused.",
            effects: { signal: 6, char: { alex: { morale: -5 } } },
            fx: () => "Published a direct comparison. Your niche is clearer. Alex is rattled but focused.",
          },
          {
            key: "copy", label: "Copy their best features",
            journal: "Copied Flare's best features. Shipped fast — but we're building for their users now, not ours. Alex is frustrated.",
            effects: { marketFit: -8, signal: -5, flags: { copied_competitor: true }, char: { alex: { morale: -10 } } },
            fx: () => "Shipped fast. But you're building for their users now, not yours. Alex is frustrated. Twitter called you a Flare clone.",
          },
          {
            key: "ignore", label: "Ignore it — stay on roadmap",
            journal: "Ignored Flare's launch and stayed on our roadmap. Their noise is real but so is our plan.",
            effects: { flags: { competitor_ignored: true }, char: { alex: { morale: -5 } } },
            fx: () => "Back to building. Their noise is real but so is your roadmap. Alex saw the article and went quiet for a day.",
          },
        ],
        timeout: {
          weeks: 1,
          effects: { signal: -12, flags: { competitor_ignored: true } },
          say: { from: "Market signal", text: "Flare has 10,000 users and is well-funded. you need a sharper answer to 'why kindred and not them.'" },
        },
      },
      {
        id: "competitor_growing", char: "techcrunch", from: "TechCrunch",
        text: "Flare hit 10,000 users. two of your subscribers emailed asking if you're planning to add video dates — the feature Flare just launched.",
        when: {
          took: [["competitor_launch:ignore", "competitor_launch:@ignored"]], delay: 3,
          if: (s) => s.customers >= 1,
        },
        choices: [
          {
            key: "calls", label: "Do user calls — understand what they actually need",
            journal: "Called 5 subscribers. Most still prefer our approach. Two want video dates — for a different reason than I assumed. Now I know what to build next.",
            effects: { marketFit: 6, signal: 4 },
            fx: () => "Called 5 subscribers. Most still prefer your approach. Two want video dates — but for a different reason than you assumed. Now you know what to build next.",
          },
          {
            key: "discount", label: "Offer existing subscribers a discount to stay",
            journal: "Offered existing subscribers a discount to stay. Bought loyalty — not ideal, but stopped the bleeding.",
            effects: { cash: -500, customers: 1 },
            fx: () => "Gave 3 subscribers 20% off. Bought loyalty — not ideal, but stopped the bleeding. The feature question didn't go away.",
          },
          {
            key: "ignore", label: "Keep building, ignore the noise",
            journal: "Kept building, ignored the Flare noise. Lost two subscribers. The remaining users are still with us — for now.",
            effects: { marketFit: -5 },
            fx: () => "Stayed the course. Lost two subscribers to Flare. The remaining users are still with you — for now.",
          },
        ],
        timeout: {
          weeks: 1,
          effects: { marketFit: -8, signal: -8, users: -3 },
          say: { from: "User", text: "we've been evaluating Flare. going to give them a try — nothing personal." },
        },
      },
      {
        id: "investor_moat_question", char: "techcrunch", from: "Investor",
        text: "an investor you're pitching asks directly: 'Flare raised $3M and has 10,000 users. why does kindred win?'",
        when: { after: ["competitor_launch"], if: (s) => s.deck_ready },
        choices: [
          {
            key: "niche", label: "Explain the niche they ignored",
            journal: "Answered the moat question directly — explained the niche Flare ignored.",
            fx(s) {
              if (s.competitive_intel) {
                s.investor_warmth = clamp(s.investor_warmth + 12, 0, 100);
                return "Your answer was specific and confident — you mapped their product, you know where they stopped. 'That's exactly what I was hoping to hear.'";
              }
              s.investor_warmth = clamp(s.investor_warmth - 5, 0, 100);
              return "You said 'they're going broad, we're going deep' — but couldn't back it up with specifics. The investor nodded slowly. Conviction cooled.";
            },
          },
          {
            key: "speed", label: "We're moving faster and closer to customers",
            journal: "Told the investor we're moving faster and closer to customers. Plausible but he wanted more.",
            effects: { warmth: 2 },
            fx: () => "Plausible answer. The investor appreciated the honesty but wanted more. 'Come back when you have 3 months of retention data.'",
          },
          {
            key: "deflect", label: "Deflect — pivot to your traction story",
            journal: "Tried to pivot to traction instead of answering the Flare question. The investor noticed.",
            effects: { warmth: -8 },
            fx: () => "The investor noticed the pivot. 'You didn't answer my question.' The meeting wrapped up quickly after that.",
          },
        ],
        timeout: { weeks: 3 },
      },

      // ── SOCIAL & PRESS ───────────────────────────────────────────────────────
      {
        id: "public_complaint", char: "twitter", from: "Twitter",
        text: "'@kindredapp matched me with the same guy THREE times. we already dated. this is a bug AND a nightmare.' — 40 retweets and counting.",
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
          effects: { signal: -18, users: -10 },
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
            journal: "Called Tom. He met someone on kindred 5 weeks ago — they've been on 7 dates. He forgot to cancel his subscription. He wrote a glowing review before hanging up. Best churn I've ever had.",
            effects: { customers: -1, signal: 16, marketFit: 10 },
            fx: () => "Called Tom. He met someone on kindred 5 weeks ago — they've been on 7 dates. He forgot to cancel his subscription and was a bit embarrassed about it. He's canceling, but he wrote you a glowing review before hanging up. Best churn you've ever had.",
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
              if (e.rng() < 0.7) { s.cash += 7000; return "Jamie sent $7,000 via Venmo. 'Least I could do — you'd have done the same for me. go build something great.'"; }
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
                s.cash += 5000;
                s.investor_warmth = clamp(s.investor_warmth + 5, 0, 100);
                return "David pulled out his checkbook. $5,000 and a warm intro to two angels he knows.";
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
  else (window.V2STORY = window.V2STORY || []).push(mod);
})();
