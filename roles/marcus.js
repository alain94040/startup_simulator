(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'marcus', name: 'Marcus (angel)', type: 'investor',
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
        id: 'investor_ready', cat: 'e', from: 'Marcus (angel)',
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
        available: (s, char) => s.investor_warmth >= 50 && s.deck_ready && s.customers >= 6 && s.product >= 40 && s.signal >= 45 && !s.marcusCommitted && !char.flags.intro_moved_on,
        options: [{ label: "Yes — let's talk terms", key: 'pitch',
          execute(s, char, e) {
            const alexGone = e && !(e.chars.get('alex')?.active ?? true);
            const score = clamp(s.customers * 2, 0, 35) + clamp(s.product / 5, 0, 20)
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
