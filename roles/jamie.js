(function () {
  const def = {
    id: 'jamie', type: 'family',

    slice: [
      "ff_friend",
      "ff_friend_ask",
    ],

    role: "College friend",
    name: "Jamie",  // chat display name
    intro: "yo! heard you actually quit to do this for real. wild. coffee?",
    voice: {
      "ff_friend|tell": "Caught up with Jamie over coffee. Told him everything. He was into it — put him on the waitlist.",
      "ff_friend_ask|ask": "Asked Jamie to invest. He wants to support this."
    },
    unlockCondition: (s) => s.week >= 3,
    cards: [
      {
        id: 'ff_friend', cat: 'e', from: 'Jamie (college friend)', chat: false,
        body: "heard you actually quit to do this full time. wild. coffee this week? i've been wanting to hear — a dating app, seriously?",
        urgency: 12, weeks: 1,
        available: (s, char) => s.week <= 10 && !char.flags.first_meeting_done,
        options: [
          { label: 'Tell him about it', key: 'tell',
            execute(s, char) {
              char.flags.first_meeting_done = true;
              char.flags.first_meeting_week = s.week;
              return "Caught up over coffee. Told him everything. He was into it — 'a dating app that actually works? I need to try this.' You put him on the waitlist.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'ff_friend_ask', cat: 'e', from: 'Jamie (college friend)', chat: false,
        body: "hey — been thinking about what you told me. i want to support this somehow. can we talk again?",
        urgency: 12, weeks: 1,
        available: (s, char) => char.flags.first_meeting_done && !char.flags.done && s.week >= char.flags.first_meeting_week + 4 && s.week <= char.flags.first_meeting_week + 12,
        options: [
          { label: 'Ask him to invest', key: 'ask',
            execute(s, char) {
              char.flags.done = true;
              if (Math.random() < 0.7) { s.cash += 7000; return "Jamie sent $7,000 via Venmo. 'Least I could do — you'd have done the same for me. go build something great.'"; }
              return "Jamie's cash is tied up right now — car loan and a wedding coming up. 'I'm rooting for you though.'";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.done = true; },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.jamie = def;
})();
