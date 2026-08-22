// roles/growth.js — the launch & growth strategic layer.
//
// This is a no-chat source (surfaces under "You", like analytics/communities). It
// owns the moments the old engine glossed over:
//   • beachhead_choice  — cold-start density (own one market vs sprawl)        [pre-launch]
//   • launch_surface    — where you make the launch splash (the spike)         [launch day]
//   • launch_scramble   — the day-after chaos (the exciting/stressful beat)    [launch day+1]
//   • channel_test      — Bullseye: test channels cheaply, read CAC/retention  [post-launch]
//   • channel_double_down — focus everything on the one that works             [post-launch]
//
// Teaching: most channels are duds for any given startup (Traction); a dating app
// needs density in one market before it's fun (cold-start); early traction is
// hand-made (PG, "do things that don't scale"); focus beats spreading thin (Naval).
(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Hidden per-channel effectiveness *for a consumer dating app*. `fit` (0..1) drives
  // sustained growth once you commit (engine reads s.channels[primary].fit). Most are
  // duds — that discovery is the lesson. `cost` is the cheap test spend; `testUsers`
  // is the small bump the experiment itself brings in.
  const CHANNELS = {
    referrals: { label: "a referral / invite-a-friend loop", fit: 0.90, cac: 4,   cost: 200, testUsers: 4 },
    creators:  { label: "TikTok creators",                   fit: 0.80, cac: 9,   cost: 600, testUsers: 6 },
    community: { label: "niche communities (Reddit, Discord)",fit: 0.55, cac: 18,  cost: 150, testUsers: 3 },
    paid:      { label: "paid ads (Google / Meta)",          fit: 0.18, cac: 90,  cost: 700, testUsers: 5 },
  };
  const tested = (s) => Object.keys(s.channels || {}).filter(k => k !== 'mixed');
  const testReadout = (id) => {
    const c = CHANNELS[id];
    if (c.fit >= 0.7) return `Tested ${c.label}. CAC came in around $${c.cac} — cheap — and the people it brought matched and stuck around. This one has legs.`;
    if (c.fit >= 0.4) return `Tested ${c.label}. CAC ~$${c.cac}. Real users, decent retention — workable, not a rocket.`;
    return `Tested ${c.label}. CAC ~$${c.cac} — brutal — and most bounced the same day. Looks like a vanity channel, not yours.`;
  };

  const def = {
    id: 'growth', name: 'Growth', type: 'platform', noChat: true,
    role: "Traction",

    slice: [
      "beachhead_choice",
      "launch_surface",
      "launch_scramble",
      "channel_test",
      "channel_double_down",
    ],

    // Active once the team commits to building the real product (so the beachhead
    // call can land before launch), and stays active through the growth phase.
    unlockCondition: (s) => s.productPhase === "product" || s.launched,

    cards: [
      // ── COLD-START DENSITY: pick a beachhead before you flip the switch ───────
      {
        id: 'beachhead_choice', cat: 'c', from: 'You',
        body: "before you flip the switch — a dating app is only fun if there's someone to match with. open to everyone and the map looks empty everywhere. own one place and it actually feels alive. where do you point the launch?",
        // urgency 1: a standing strategic offer that waits patiently; it never out-ranks
        // the real customer/investor work a focused founder is doing.
        urgency: 1, weeks: 1,
        available: (s) => s.productPhase === "product" && !s.launched && s.beachhead == null,
        options: [
          { label: 'Own one city / campus first', key: 'narrow',
            journal: "Decided to launch one neighborhood at a time — pick a single campus, get it dense enough that people actually match, then expand. Smaller top-line, real liquidity.",
            execute(s) {
              s.beachhead = 'narrow';
              s.signal = clamp(s.signal + 4, 0, 100);
              s.market_fit = clamp(s.market_fit + 4, 0, 100);
              return "Picked one campus and its three closest neighborhoods. Everything points there. The TAM slide is smaller — but the people who join will actually find someone nearby.";
            } },
          { label: 'Launch everywhere — bigger TAM', key: 'broad',
            journal: "Opened it nationwide on day one. The market-size slide looks incredible. Quietly worried everyone will open the app, see nobody within 50 miles, and leave.",
            execute(s) {
              s.beachhead = 'broad';
              s.signal = clamp(s.signal + 7, 0, 100);
              return "Open nationwide. The TAM slide looks incredible. Whether anyone finds a match within 50 miles of them is a different question.";
            } },
        ],
        // If you never make the call, density stays neutral (no penalty) — the
        // ghost-town lesson lives in *choosing* broad, which is the human-facing trap.
        // (A consequence-free standing offer; it just waits until launch closes it.)
        dropDelay: 0, dropMsg: null, dropFx: null,
      },

      // ── LAUNCH DAY: where do you make the splash? (the spike) ────────────────
      {
        id: 'launch_surface', cat: 'e', from: 'You',
        body: "it's live. now the part nobody warns you about: a launch is only as big as where you announce it, and you get one first impression. where do you make the splash?",
        urgency: 3, weeks: 1,
        available: (s) => s.launched && !s.launch_surface_done,
        options: [
          { label: 'Soft-launch to the waitlist + friends', key: 'quiet',
            journal: "Soft-launched to the waitlist and a few dozen friends. No fireworks. But every single one is a real person who wants this to work — and they're telling me exactly what's broken.",
            execute(s) {
              s.launch_surface_done = true; s.launch_surface_week = s.week;
              s.users += 8; s.market_fit = clamp(s.market_fit + 5, 0, 100); s.signal = clamp(s.signal + 4, 0, 100);
              return "Quiet launch to the people who already raised their hands. ~8 active on day one — small, but every one is high-intent and loud with feedback. The kind of start that compounds.";
            } },
          { label: 'Give a reporter the exclusive', key: 'press',
            journal: "Gave a reporter the launch exclusive — the anti-Tinder angle. Smaller than a viral hit, but the people who came in from a thoughtful piece actually read the whole thing first.",
            execute(s, char, e) {
              s.launch_surface_done = true; s.launch_surface_week = s.week;
              s.users += 12; s.signal = clamp(s.signal + 10, 0, 100);
              s.network.press = (s.network.press || 0) + 1;
              s.investor_warmth = clamp(s.investor_warmth + 4, 0, 100);
              return "The piece ran with the 'dating app that wants you to delete it' angle. ~12 signups in a day, plus an investor reply-all. Quality over volume.";
            } },
          { label: 'Pay 3 TikTok creators to post', key: 'tiktok',
            journal: "Paid three TikTok creators to post about PlusOne — the same playbook Flare used. Spendy ($1,200), but it put real daters in the door fast.",
            execute(s) {
              s.launch_surface_done = true; s.launch_surface_week = s.week;
              s.cash = clamp(s.cash - 1200, 0, 9999999);
              s.users += 18; s.signal = clamp(s.signal + 8, 0, 100); s.market_fit = clamp(s.market_fit + 2, 0, 100);
              return "Three creator posts went up. ~18 signups in 48 hours — actual daters, not tire-kickers. $1,200 gone, but the funnel is primed.";
            } },
          { label: 'Go big — post to Show HN / Product Hunt', key: 'show_hn',
            journal: "Posted to Show HN and Product Hunt. Front page for six hours, the signup graph went vertical — and almost all of them were engineers admiring the stack, not single people looking to date. The best-looking launch that taught me the least.",
            execute(s) {
              s.launch_surface_done = true; s.launch_surface_week = s.week;
              s.users += 35; s.signal = clamp(s.signal + 12, 0, 100);
              // No market_fit gain on purpose: the wrong audience. The spike deflates on
              // its own (pre-pivot trueFit is low → these users don't convert or retain).
              return "Front page for six hours. ~35 signups in a day — the graph looks unbelievable. Then you read the comments: builders admiring the matching engine, almost nobody who'd actually use a dating app. A spike, not traction.";
            } },
        ],
        // Ignored → treat as a quiet launch (a modest organic trickle).
        dropDelay: 0, dropMsg: null,
        dropFx(s) { if (!s.launch_surface_done) { s.launch_surface_done = true; s.launch_surface_week = s.week; s.users += 4; } },
      },

      // ── LAUNCH DAY +1: the scramble (the stressful/exciting beat) ────────────
      {
        id: 'launch_scramble', cat: 'e', from: 'Alex',
        body: "first morning live and it's already on fire — signups are flooding the onboarding faster than the matching queue can keep up, and a few people are stuck on a blank screen. how do we play it?",
        urgency: 3, weeks: 1,
        available: (s) => s.launched && s.launch_surface_done && !s.launch_scramble_done
          && s.week >= (s.launch_surface_week || 0) + 1,
        options: [
          { label: 'Drop everything — keep it up and triage live', key: 'firefight',
            journal: "Pulled an all-nighter with Alex keeping the launch alive — patched the queue, DM'd every stuck user personally. Exhausting. But nobody who showed up on day one walked away because we weren't there.",
            execute(s) {
              s.launch_scramble_done = true;
              s.market_fit = clamp(s.market_fit + 4, 0, 100); s.signal = clamp(s.signal + 4, 0, 100);
              return "All hands, all night. Queue patched, stuck users personally unblocked. You lost a night of sleep and saved the launch.";
            } },
          { label: 'Triage the worst bug, let the rest wait', key: 'triage',
            execute(s) {
              s.launch_scramble_done = true;
              s.signal = clamp(s.signal + 2, 0, 100); s.users = clamp(s.users - 3, 0, 9999);
              return "Fixed the blank-screen crash, queued the rest. A handful of first-day users hit the rough edges and bounced before you got to them.";
            } },
        ],
        // Ignore-neutral: a founder heads-down elsewhere just lets the chaos pass; no
        // penalty (keeps these optional launch beats from taxing focused strategies).
        dropDelay: 0, dropMsg: null,
        dropFx(s) { s.launch_scramble_done = true; },
      },

      // ── BULLSEYE: test channels cheaply, read CAC/retention ──────────────────
      {
        id: 'channel_test', cat: 'c', from: 'You',
        body: (s) => {
          const t = tested(s).length;
          if (t === 0) return "the launch spike is fading and signups have flatlined. you can't pour money into every channel — pick one cheap experiment this sprint and see what the numbers say.";
          return "one channel down, the picture's still fuzzy. run another cheap test — you only get a couple of these before the runway says pick one.";
        },
        urgency: 3, weeks: 1,
        // Gated on the pivot relaunch: channel strategy only pays off once the product
        // actually retains (post-pivot). Before that you'd just be buying churn — and it
        // keeps these out of the pre-seed fundraising scramble where they don't belong.
        available: (s) => s.pivot_shipped && !s.primary_channel && tested(s).length < 3
          && s.week >= (s.channel_test_last || 0) + 2,
        options: [
          { label: 'Test a referral loop ($200)', key: 'referrals',
            available: (s) => !s.channels.referrals,
            execute(s) { s.channels.referrals = { fit: CHANNELS.referrals.fit, cac: CHANNELS.referrals.cac, tested: true };
              s.channel_test_last = s.week; s.cash = clamp(s.cash - CHANNELS.referrals.cost, 0, 9999999);
              s.users += CHANNELS.referrals.testUsers; s.signal = clamp(s.signal + 3, 0, 100); return testReadout('referrals'); } },
          { label: 'Test TikTok creators ($600)', key: 'creators',
            available: (s) => !s.channels.creators,
            execute(s) { s.channels.creators = { fit: CHANNELS.creators.fit, cac: CHANNELS.creators.cac, tested: true };
              s.channel_test_last = s.week; s.cash = clamp(s.cash - CHANNELS.creators.cost, 0, 9999999);
              s.users += CHANNELS.creators.testUsers; s.signal = clamp(s.signal + 3, 0, 100); return testReadout('creators'); } },
          { label: 'Test niche communities ($150)', key: 'community',
            available: (s) => !s.channels.community,
            execute(s) { s.channels.community = { fit: CHANNELS.community.fit, cac: CHANNELS.community.cac, tested: true };
              s.channel_test_last = s.week; s.cash = clamp(s.cash - CHANNELS.community.cost, 0, 9999999);
              s.users += CHANNELS.community.testUsers; s.signal = clamp(s.signal + 2, 0, 100); return testReadout('community'); } },
          { label: 'Test paid ads ($700)', key: 'paid',
            available: (s) => !s.channels.paid,
            execute(s) { s.channels.paid = { fit: CHANNELS.paid.fit, cac: CHANNELS.paid.cac, tested: true };
              s.channel_test_last = s.week; s.cash = clamp(s.cash - CHANNELS.paid.cost, 0, 9999999);
              s.users += CHANNELS.paid.testUsers; s.signal = clamp(s.signal + 1, 0, 100); return testReadout('paid'); } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s) { s.channel_test_last = s.week; },
      },

      // ── BULLSEYE: focus everything on the one that worked ────────────────────
      {
        id: 'channel_double_down', cat: 'c', from: 'You',
        body: "you've got data now, not opinions. the runway won't fund three channels. naval's line keeps echoing — be exceptional at one. where do all the chips go?",
        // Above channel_test (2) so once you have data, "commit" out-ranks "test more"
        // for the growth slot — otherwise testing would never hand off to focusing.
        urgency: 3, weeks: 1,
        available: (s) => s.pivot_shipped && !s.primary_channel && tested(s).length >= 2,
        options: (function () {
          const commit = (id) => ({
            label: `Go all-in on ${CHANNELS[id].label}`, key: id,
            available: (s) => !!s.channels[id],
            execute(s) {
              s.primary_channel = id;
              const ch = s.channels[id];
              s.users += Math.round(ch.fit * 12);
              s.signal = clamp(s.signal + Math.round(ch.fit * 8), 0, 100);
              if (ch.fit >= 0.7) return `All chips on ${CHANNELS[id].label}. With one channel to obsess over, the loop tightens every week — signups are compounding instead of trickling.`;
              return `Committed to ${CHANNELS[id].label}. You're focused now, but you're focusing on a channel the data already flagged as weak — growth is a grind and the CAC eats runway.`;
            } });
          return [
            commit('referrals'), commit('creators'), commit('community'), commit('paid'),
            { label: 'Keep all of them going at once', key: 'spread',
              execute(s) {
                s.channels.mixed = { fit: 0.30, cac: 40, tested: true };
                s.primary_channel = 'mixed';
                s.signal = clamp(s.signal + 2, 0, 100);
                return "Decided not to decide — a little of everything. Jack of all channels, master of none. Each one limps along; nothing compounds; the spend adds up.";
              } },
          ];
        })(),
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.growth = def;
})();
