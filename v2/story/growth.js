// ─────────────────────────────────────────────────────────────────────────────
// v2/story/growth.js — the launch & growth strategic layer: the beachhead
// fallback, the launch splash, the day-after scramble, the Bullseye channel
// loop (test cheap → focus on the one that works), and the founder's
// hand-made-traction cards (do things that don't scale, the first paying
// subscriber, the pricing experiment) that turn users into the customers the
// investors' gates count.
//
// Teaching: most channels are duds for any given startup (Traction); a dating
// app needs density in one market before it's fun (cold-start); early traction
// is hand-made (PG); focus beats spreading thin (Naval).
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Hidden per-channel effectiveness *for a consumer dating app*. Most are duds
  // — that discovery is the lesson. world.js reads s.channels[primary].fit.
  const CHANNELS = {
    referrals: { label: "a referral / invite-a-friend loop", fit: 0.90, cac: 4, cost: 200, testUsers: 4 },
    creators:  { label: "TikTok creators", fit: 0.80, cac: 9, cost: 600, testUsers: 6 },
    community: { label: "niche communities (Reddit, Discord)", fit: 0.55, cac: 18, cost: 150, testUsers: 3 },
    paid:      { label: "paid ads (Google / Meta)", fit: 0.18, cac: 90, cost: 700, testUsers: 5 },
  };
  const tested = (s) => Object.keys(s.channels || {}).filter(k => k !== "mixed");
  const testReadout = (id) => {
    const c = CHANNELS[id];
    if (c.fit >= 0.7) return "Tested " + c.label + ". CAC came in around $" + c.cac + " — cheap — and the people it brought matched and stuck around. This one has legs.";
    if (c.fit >= 0.4) return "Tested " + c.label + ". CAC ~$" + c.cac + ". Real users, decent retention — workable, not a rocket.";
    return "Tested " + c.label + ". CAC ~$" + c.cac + " — brutal — and most bounced the same day. Looks like a vanity channel, not yours.";
  };
  const testChoice = (id) => ({
    key: id, label: "Test " + CHANNELS[id].label + " ($" + CHANNELS[id].cost + ")",
    if: (s) => !s.channels[id],
    effects: { cash: -CHANNELS[id].cost, users: CHANNELS[id].testUsers },
    fx(s) {
      s.channels[id] = { fit: CHANNELS[id].fit, cac: CHANNELS[id].cac, tested: true };
      s.signal = clamp(s.signal + (CHANNELS[id].fit >= 0.5 ? 3 : 1), 0, 100);
      return testReadout(id);
    },
  });
  const commitChoice = (id) => ({
    key: id, label: "Go all-in on " + CHANNELS[id].label,
    if: (s) => !!s.channels[id],
    fx(s) {
      s.primary_channel = id;
      const ch = s.channels[id];
      s.users += Math.round(ch.fit * 12);
      s.signal = clamp(s.signal + Math.round(ch.fit * 8), 0, 100);
      if (ch.fit >= 0.7) return "All chips on " + CHANNELS[id].label + ". With one channel to obsess over, the loop tightens every week — signups are compounding instead of trickling.";
      return "Committed to " + CHANNELS[id].label + ". You're focused now, but you're focusing on a channel the data already flagged as weak — growth is a grind and the CAC eats runway.";
    },
  });

  const mod = {
    nodes: [
      {
        // The fallback density call — only if the seed-strategy card never set
        // a beachhead pre-launch (it usually does; this is the safety net).
        id: "beachhead_choice", char: "growth", from: "You", ambient: true,
        text: "before you flip the switch — a dating app is only fun if there's someone to match with. open to everyone and the map looks empty everywhere. own one place and it actually feels alive. where do you point the launch?",
        when: { if: (s) => s.productPhase === "product" && !s.launched && s.beachhead == null },
        choices: [
          {
            key: "narrow", label: "Own one city / campus first",
            journal: "Decided to launch one neighborhood at a time — pick a single campus, get it dense enough that people actually match, then expand. Smaller top-line, real liquidity.",
            effects: { signal: 4, marketFit: 4, flags: { beachhead: "narrow" } },
            fx: () => "Picked one campus and its three closest neighborhoods. Everything points there. The TAM slide is smaller — but the people who join will actually find someone nearby.",
          },
          {
            key: "broad", label: "Launch everywhere — bigger TAM",
            journal: "Opened it nationwide on day one. The market-size slide looks incredible. Quietly worried everyone will open the app, see nobody within 50 miles, and leave.",
            effects: { signal: 7, flags: { beachhead: "broad" } },
            fx: () => "Open nationwide. The TAM slide looks incredible. Whether anyone finds a match within 50 miles of them is a different question.",
          },
        ],
      },
      {
        id: "launch_surface", char: "growth", from: "You",
        text: "it's live. now the part nobody warns you about: a launch is only as big as where you announce it, and you get one first impression. where do you make the splash?",
        when: { took: [["good_enough_launch:ship", "jordan_launch_blocker:web_only", "jordan_launch_blocker:@ignored", "founder_solo_launch:ship"]] },
        choices: [
          {
            key: "quiet", label: "Soft-launch to the waitlist + friends",
            journal: "Soft-launched to the waitlist and a few dozen friends. No fireworks. But every single one is a real person who wants this to work — and they're telling me exactly what's broken.",
            effects: { users: 8, marketFit: 5, signal: 4 },
            fx: () => "Quiet launch to the people who already raised their hands. ~8 active on day one — small, but every one is high-intent and loud with feedback. The kind of start that compounds.",
          },
          {
            key: "press", label: "Give a reporter the exclusive",
            journal: "Gave a reporter the launch exclusive — the anti-Tinder angle. Smaller than a viral hit, but the people who came in from a thoughtful piece actually read the whole thing first.",
            effects: { users: 12, signal: 10, warmth: 4 },
            fx: () => "The piece ran with the 'dating app that wants you to delete it' angle. ~12 signups in a day, plus an investor reply-all. Quality over volume.",
          },
          {
            key: "tiktok", label: "Pay 3 TikTok creators to post",
            journal: "Paid three TikTok creators to post about Kindred — the same playbook Flare used. Spendy ($1,200), but it put real daters in the door fast.",
            effects: { cash: -1200, users: 18, signal: 8, marketFit: 2 },
            fx: () => "Three creator posts went up. ~18 signups in 48 hours — actual daters, not tire-kickers. $1,200 gone, but the funnel is primed.",
          },
          {
            // No market_fit gain on purpose: the wrong audience. The spike
            // deflates on its own (pre-pivot trueFit is low → no retention).
            key: "show_hn", label: "Go big — post to Show HN / Product Hunt",
            journal: "Posted to Show HN and Product Hunt. Front page for six hours, the signup graph went vertical — and almost all of them were engineers admiring the stack, not single people looking to date. The best-looking launch that taught me the least.",
            effects: { users: 35, signal: 12 },
            fx: () => "Front page for six hours. ~35 signups in a day — the graph looks unbelievable. Then you read the comments: builders admiring the matching engine, almost nobody who'd actually use a dating app. A spike, not traction.",
          },
        ],
        // Ignored → a modest organic trickle stands in for the splash.
        timeout: { weeks: 2, effects: { users: 4 } },
      },
      {
        id: "launch_scramble", char: "growth", from: "Alex",
        text: "first morning live and it's already on fire — signups are flooding the onboarding faster than the matching queue can keep up, and a few people are stuck on a blank screen. how do we play it?",
        when: { after: ["launch_surface"], delay: 1, if: (s) => s.launched },
        choices: [
          {
            key: "firefight", label: "Drop everything — keep it up and triage live",
            journal: "Pulled an all-nighter with Alex keeping the launch alive — patched the queue, DM'd every stuck user personally. Exhausting. But nobody who showed up on day one walked away because we weren't there.",
            effects: { marketFit: 4, signal: 4 },
            fx: () => "All hands, all night. Queue patched, stuck users personally unblocked. You lost a night of sleep and saved the launch.",
          },
          {
            key: "triage", label: "Triage the worst bug, let the rest wait",
            effects: { signal: 2, users: -3 },
            fx: () => "Fixed the blank-screen crash, queued the rest. A handful of first-day users hit the rough edges and bounced before you got to them.",
          },
        ],
        // Ignore-neutral: heads-down elsewhere just lets the chaos pass.
        timeout: { weeks: 2 },
      },

      // ── BULLSEYE: test cheap, then focus ─────────────────────────────────────
      {
        id: "channel_test", char: "growth", from: "You",
        text: (s) => tested(s).length === 0
          ? "the launch spike is fading and signups have flatlined. you can't pour money into every channel — pick one cheap experiment this sprint and see what the numbers say."
          : "one channel down, the picture's still fuzzy. run another cheap test — you only get a couple of these before the runway says pick one.",
        // Gated on the pivot relaunch: channel strategy only pays off once the
        // product actually retains. Before that you'd just be buying churn.
        when: {
          cooldown: 2,
          if: (s) => s.pivot_shipped && !s.primary_channel && tested(s).length < 3,
        },
        choices: [testChoice("referrals"), testChoice("creators"), testChoice("community"), testChoice("paid")],
      },
      {
        id: "channel_double_down", char: "growth", from: "You",
        text: "you've got data now, not opinions. the runway won't fund three channels. naval's line keeps echoing — be exceptional at one. where do all the chips go?",
        when: { if: (s) => s.pivot_shipped && !s.primary_channel && tested(s).length >= 3 },
        choices: [
          commitChoice("referrals"), commitChoice("creators"), commitChoice("community"), commitChoice("paid"),
          {
            key: "spread", label: "Keep all of them going at once",
            effects: { signal: 2 },
            fx(s) {
              s.channels.mixed = { fit: 0.30, cac: 40, tested: true };
              s.primary_channel = "mixed";
              return "Decided not to decide — a little of everything. Jack of all channels, master of none. Each one limps along; nothing compounds; the spend adds up.";
            },
          },
        ],
      },

      // ── HAND-MADE TRACTION (the founder's customer accelerators) ─────────────
      {
        id: "dont_scale_seed", char: "founder",
        text: "the app is live but the early matches are thin — a real chicken-and-egg. paul graham's voice in your head: do things that don't scale. you could manufacture the magic for the first users by hand, just to get the flywheel turning.",
        when: { if: (s) => s.launched && s.users >= 3 && !s.pivot_shipped },
        choices: [
          {
            key: "concierge", label: "Hand-match the first users yourself",
            journal: "Spent the week as a one-person matching engine — read every new profile, made introductions by hand, texted people when someone good showed up. Doesn't scale even slightly. Two of them went on dates this weekend. Worth every hour.",
            effects: { marketFit: 8, signal: 4 },
            fx(s) {
              // Hand-picking your happiest early user jump-starts the testimonial chain.
              if (s.customers === 0 && !s.reference_customer) s.reference_customer = true;
              return "Became the matching engine for a week — introductions by hand, nudges by text. Two first dates out of it, and one user who now thinks you hung the moon. It doesn't scale. It doesn't have to yet.";
            },
          },
          {
            key: "mixer", label: "Host a singles night — make the first match in the room",
            journal: "Threw a small singles night for early users — manufactured the first real match in person. Doesn't scale, but I walked away with a story I can actually sell and a room full of believers.",
            effects: { cash: -300, users: 5, signal: 8, marketFit: 4 },
            fx: () => "Twelve early users in a room, two drinks in, one introduction that actually clicked. $300 on snacks and a story you can tell every investor for the next year. Five of them invited friends on the spot.",
          },
          {
            key: "wait", label: "Let the algorithm do its thing",
            journal: "Decided not to put my thumb on the scale — let the matching run on its own. Cleaner, more honest. Also colder: the cold-start stayed cold.",
            fx: () => "Stayed hands-off and let the system run. Fewer awkward DMs from the founder — and a lot fewer matches. The cold-start stayed cold.",
          },
        ],
        timeout: { weeks: 3 },
      },
      {
        id: "first_customer_offer", char: "founder",
        text: "free users show up every day but nobody's paying. one person has been swiping through profiles every single day for two weeks. time to convert the first subscriber.",
        when: { if: (s) => s.launched && s.users >= 3 && s.customers === 0 },
        choices: [
          {
            key: "reference", label: "Offer free access for a testimonial",
            effects: { signal: 8, flags: { reference_customer: true } },
            fx: () => "Offered 3 months free in exchange for a public testimonial. They said yes immediately. First reference customer locked in.",
          },
          {
            key: "pitch", label: "Pitch them at $49/month",
            journal: "Pitched them at $49/month. They converted. First paying subscriber. Not much, but it's real.",
            effects: { users: -1, customers: 1, signal: 5 },
            fx: () => "Made the ask. They converted. First paying subscriber. $49/month — not much, but it's real.",
          },
        ],
        timeout: { weeks: 3 },
      },
      {
        id: "pricing_experiment", char: "founder",
        text: "free users open the app every day, swipe, and match — but haven't upgraded. the product clearly works. nobody's been asked to pay. time to test.",
        when: { if: (s) => s.launched && s.users >= 10 && s.customers >= 1 && s.pivot_shipped },
        choices: [
          {
            key: "prompt", label: "Add a timed upgrade prompt",
            fx(s) {
              const converted = Math.min(4, Math.max(1, Math.floor(s.users * 0.1)));
              s.users = Math.max(0, s.users - converted);
              s.customers += converted;
              s.signal = clamp(s.signal - 2, 0, 100);
              return "Prompt added. " + converted + " free user" + (converted !== 1 ? "s" : "") + " upgraded this week. A few complained about the nag. Worth it.";
            },
          },
          {
            key: "cap", label: "Cap the free tier at 3 seats",
            fx(s) {
              const converted = Math.min(5, Math.max(1, Math.floor(s.users * 0.15)));
              const churned = Math.min(4, Math.max(0, Math.floor(s.users * 0.08)));
              s.users = Math.max(0, s.users - converted - churned);
              s.customers += converted;
              s.signal = clamp(s.signal - 5, 0, 100);
              return "Seat cap live. " + converted + " upgraded, " + churned + " left when the wall went up. More revenue, fewer free users.";
            },
          },
          {
            key: "hold", label: "Hold — grow the free tier first",
            journal: "Held off on pricing. Free users keep coming. The conversion problem isn't going anywhere.",
            effects: { users: 5 },
            fx: () => "Held off. Free users keep coming. The conversion problem isn't going anywhere.",
          },
        ],
        timeout: { weeks: 3 },
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.V2STORY = window.V2STORY || []).push(mod);
})();
