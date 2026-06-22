(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'fatima', type: 'investor',

    slice: [
      "fatima_intro",
      "fatima_meeting",
      "fatima_deck",
      "fatima_commit",
    ],

    role: "Angel investor",
    name: "Fatima",  // chat display name
    intro: "a few people i trust have mentioned kindred. i invest in consumer social — would love to hear more.",
    voice: {
      "fatima_intro|call": "Good call with Fatima. Sharp questions about the problem space. She asked for the deck when it's ready.",
      "fatima_intro|pass": "Declined Fatima's call. She said to reach out when timing is better.",
      "fatima_meeting|meet": "Strong meeting with Fatima. She pushed hard on distribution, then asked for the deck and latest numbers.",
      "fatima_deck|walk": "Walked Fatima through the unit economics and TAM. She said the story is tight — completing diligence now.",
      "fatima_commit|welcome": "Fatima committed. Her diligence is done."
    },
    unlockCondition: (s) => s.week >= 8 && s.network.advisors >= 1,
    cards: [
      {
        id: 'fatima_intro', cat: 'e', from: 'Fatima (angel)',
        body: "heard good things about kindred from a few people in the network. would love a quick intro call this week.",
        urgency: 2, weeks: 1,
        available: (s, char) => !char.flags.intro_done,
        options: [
          { label: 'Take the call', key: 'call',
            execute(s, char) { char.flags.intro_done = true; s.fatima_intro_week = s.week; return "Good call. Fatima asked sharp questions about the problem space. 'Send me your deck when it's ready — I want to track this one.'"; } },
          { label: 'Not right now', key: 'pass',
            execute(s, char) { char.flags.intro_done = true; s.fatima_intro_week = s.week; return "Declined. Fatima said to reach out when timing is better."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'fatima_meeting', cat: 'e', from: 'Fatima (angel)',
        body: "been thinking about our call. love the space — dating apps with real retention are rare. can we do a deeper dive this week? i want to understand the go-to-market before i go further.",
        urgency: 22, weeks: 1,
        available: (s, char) => char.flags.intro_done && !char.flags.meeting_done && s.week >= (s.fatima_intro_week || 0) + 2,
        options: [
          { label: 'Set up the meeting', key: 'meet',
            execute(s, char) { char.flags.meeting_done = true; return "Strong meeting. Fatima pushed hard on distribution. 'Send me the deck and latest numbers and I'll take it from there.'"; } },
        ],
        dropDelay: 2, dropFrom: 'Fatima',
        dropMsg: "you went quiet after the intro — going to let you drive timing. reach out when you're ready to go deeper.",
        dropCondition: (s, char) => !char.flags.meeting_done,
        dropFx(s, char) { char.flags.meeting_done = true; },
      },
      {
        id: 'fatima_deck', cat: 'e', from: 'Fatima (angel)',
        body: "strong deck. a few follow-up questions on unit economics and TAM. once i have those i can take it to my next step.",
        urgency: 21, weeks: 1,
        available: (s, char) => char.flags.meeting_done && s.deck_ready && !char.flags.deck_done,
        options: [
          { label: 'Walk her through it', key: 'walk',
            execute(s, char) { char.flags.deck_done = true; return "Good follow-up. Fatima: 'the story is tight. i'm going to complete my diligence and come back to you.'"; } },
        ],
        dropDelay: 3, dropFrom: 'Fatima',
        dropMsg: "still working through my diligence process. will be in touch.",
        dropCondition: (s, char) => !char.flags.deck_done,
        dropFx(s, char) { char.flags.deck_done = true; },
      },
      {
        id: 'fatima_commit', cat: 'e', from: 'Fatima (angel)',
        body: "i've completed my diligence. metrics are where i need them, conviction is there. i'd like to put in $100K — are you still filling the round?",
        urgency: 23, weeks: 1,
        available: (s, char) => char.flags.deck_done && s.marcusCommitted && !char.flags.committed,
        options: [
          { label: 'Yes — welcome aboard', key: 'welcome',
            execute(s, char, e) {
              if (s.jordan_resolved && s.jordan_cleanup_needed) {
                char.flags.committed = true;
                const jordan = e && e.chars && e.chars.get('jordan');
                const jPct = jordan && jordan.flags.equity_proposal === '33/33/33' ? '33%' : jordan && jordan.flags.equity_proposal === '50/25/25' ? '25%' : '20%';
                return `Fatima: "my diligence flagged the cap table — there's a ${jPct} stake with no vesting terms. that needs to be cleaned up before i can wire anything. let me know when it's resolved."`;
              }
              const alexGone = e && !(e.chars.get('alex')?.active ?? true);
              if (alexGone && Math.random() < 0.70) {
                char.flags.committed = true;
                return "Fatima: \"i need to pass. losing your technical co-founder this late is a real red flag — i can't get comfortable with the execution risk.\"";
              }
              char.flags.committed = true;
              s.followerCommitted = true;
              s.cash = clamp(s.cash + 100000, 0, 9999999);
              return "Fatima wired $100K. $500K raised. Round closed.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.fatima = def;
})();
