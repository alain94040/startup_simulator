(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'marcus', type: 'investor',

    slice: [
      "investor_intro_warm",
      "prep_deck",
      "investor_ready",
      "seed_pitch",
    ],

    role: "Angel investor",
    name: "Marcus",  // chat display name
    intro: "heard about kindred through the network. genuinely curious about what you're building in the dating space — would love to connect when you have a minute.",
    voice: {
      "investor_intro_warm|call": "Great call with Marcus. He's following our progress now.",
      "prep_deck|build": "Built the investor deck. Story is clear, numbers are real. Ready when the time comes.",
      "investor_ready|meet": "Took both investor meetings. Strong — both want to see our next milestone.",
      "seed_pitch|pitch": "Had the formal conversation with Marcus about leading our round."
    },
    unlockCondition: (s) => s.week >= 6 && s.network.advisors >= 1,
    cards: [
      {
        id: 'investor_intro_warm', cat: 'e', from: 'Marcus (angel)',
        body: "genuinely interested in what you're building in the dating space. if i don't hear back by end of week i'll assume timing's off.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.week > 4 && s.investor_warmth < 50 && !char.flags.intro_warm_done,
        options: [
          { label: 'Take the call', key: 'call',
            execute(s, char) { char.flags.intro_warm_done = true; s.investor_warmth = clamp(s.investor_warmth + 20, 0, 100); s.network.angels++; return "Great call. Marcus is following your progress."; } },
        ],
        dropDelay: 1, dropFrom: 'Marcus',
        dropMsg: "tried twice. no reply. moving on — good luck with the company.",
        dropCondition: (s, char) => !char.flags.intro_warm_done,
        dropFx(s, char) { char.flags.intro_warm_done = true; char.flags.intro_moved_on = true; s.investor_warmth = clamp(s.investor_warmth - 15, 0, 100); },
      },
      {
        id: 'prep_deck', cat: 'e', from: 'Marcus (angel)',
        body: "when you're ready to have a more formal conversation, can you send me a deck? you don't want to be scrambling to build one mid-diligence.",
        urgency: 1, weeks: 1,
        available: (s, char) => char.flags.intro_warm_done && !char.flags.intro_moved_on && !s.deck_ready && !char.flags.deck_asked && s.signal >= 38 && (s.customers >= 2 || s.users >= 20 || s.waitlist >= 20),
        options: [
          { label: 'Build the deck now', key: 'build',
            execute(s, char) { s.deck_ready = true; char.flags.deck_asked = true; return "Deck done. Story is clear. Ready when the time comes."; } },
        ],
        dropDelay: 2, dropFrom: 'Marcus',
        dropMsg: "i'll be honest — when founders don't respond to this kind of ask, i take it as a signal. i'm still watching but my conviction has cooled.",
        dropFx(s, char) { char.flags.deck_asked = true; s.investor_warmth = clamp(s.investor_warmth - 25, 0, 100); },
      },
      {
        id: 'investor_ready', priority: 2, cat: 'e', from: 'Marcus (angel)',
        body: "two investors want to meet this week. deck is ready, story is tight, both have context. momentum is high right now.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.deck_ready && s.signal >= 38 && s.investor_warmth < 75 && s.network.angels >= 1 && !char.flags.investor_ready_done && !char.flags.intro_moved_on,
        options: [
          { label: 'Take both meetings', key: 'meet',
            execute(s, char) { char.flags.investor_ready_done = true; s.investor_warmth = clamp(s.investor_warmth + 33, 0, 100); return "Strong meetings. Both investors want to see your next milestone."; } },
        ],
        dropDelay: 2, dropFrom: 'Investor',
        dropMsg: "reached out twice. no reply. assumed timing wasn't right. moving on.",
        dropFx(s, char) { s.investor_warmth = clamp(s.investor_warmth - 20, 0, 100); },
      },
      {
        id: 'seed_pitch', cat: 'e', from: 'Marcus (angel)',
        body: "we've been watching your progress. i think the traction is there. ready to have the formal conversation about me leading your round?",
        urgency: 2, weeks: 2,
        available: (s, char) => s.investor_warmth >= 50 && s.deck_ready && s.customers >= 6 && s.has_beta && s.signal >= 45 && !s.marcusCommitted && !char.flags.intro_moved_on,
        options: [{ label: "Yes — let's talk terms", key: 'pitch',
          execute(s, char, e) {
            if (s.jordan_cleanup_needed) {
              s.investor_warmth = clamp(s.investor_warmth - 10, 0, 100);
              const jordan = e && e.chars && e.chars.get('jordan');
              const jPct = jordan && jordan.flags.equity_proposal === '33/33/33' ? '33%' : jordan && jordan.flags.equity_proposal === '50/25/25' ? '25%' : '20%';
              return `Marcus: "one flag before we go further — there's a ${jPct} stake on the cap table with no vesting schedule. who is that and why do they still own that much of the company? we'd need that cleaned up before i can lead a round."`;
            }
            const alexGone = e && !(e.chars.get('alex')?.active ?? true);
            const productPts = s.launched ? 20 : s.has_beta ? 12 : s.has_demo ? 6 : 0;
            const score = clamp(s.customers * 2, 0, 35) + productPts
              + clamp(s.investor_warmth / 4, 0, 25) + (s.signal >= 60 ? 8 : 0);
            const baseP = score >= 65 ? 0.85 : score >= 50 ? 0.55 : 0.15;
            if (Math.random() < (alexGone ? baseP * 0.25 : baseP)) {
              s.marcusCommitted = true;
              s.cash = clamp(s.cash + 400000, 0, 9999999);
              return "Marcus committed. $400K wired. He's leading — now fill the rest of the round.";
            }
            s.investor_warmth = clamp(s.investor_warmth - 15, 0, 100);
            return alexGone
              ? "Marcus: \"i heard alex left. i need to see a complete technical team before i can lead a round.\""
              : "Marcus: \"we love the vision but need more traction to lead. come back in 2 months.\"";
          } }],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.marcus = def;
})();
