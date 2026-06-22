(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Asking family for money never resolves on the spot — they need to talk it
  // over. We decide the outcome now but defer it to the next week boundary: mom
  // texts back (and the cash lands) when the week ticks over, via the engine's
  // pending queue.
  function askFamily(s, char, engine) {
    char.flags.done = true;
    const willInvest = Math.random() < 0.9;
    engine.pending.push({
      fireWeek: s.week + 1,
      from: 'Mom', charId: 'mom',
      text: willInvest
        ? "ok!! dad and i talked it over — i just wired you $5,000. so proud of you honey ❤️ go build something amazing."
        : "honey, we talked it over and we'd love to, but money's a little tight with the house right now. so sorry. we believe in you no matter what ❤️",
      fx(st) { if (willInvest) st.cash += 5000; },
    });
    return "Asked Mom and Dad if they'd put money in. They said they'd talk it over and let me know.";
  }

  const askOption = {
    label: "Ask if they'd put money in", key: 'ask',
    execute(s, char, engine) { return askFamily(s, char, engine); },
  };

  const introOption = {
    label: 'Ask for investor introductions', key: 'intro',
    execute(s, char) {
      char.flags.done = true;
      return "Mom asked around. Turns out she doesn't know any investors. \"Not everyone has a mom like Bill Gates.\"";
    },
  };

  const def = {
    id: 'mom', name: 'Mom', type: 'family',

    slice: [
      "ff_family",
      "ff_family_2",
      "ff_family_3",
    ],

    role: "Family",
    voice: {
      "ff_family|ask": "Asked Mom and Dad if they'd put money in. They're going to talk it over and get back to me.",
      "ff_family|intro": "Asked Mom for investor introductions. Turns out she doesn't know any investors.",
      "ff_family_2|ask": "Asked the parents again about chipping in. They said they'd discuss it. Family money — complicated feelings.",
      "ff_family_2|intro": "Mom asked around again. Still no investor connections.",
      "ff_family_3|ask": "Told Dad he could invest. He's going to sort it out. Family money hits different."
    },
    cards: [
      {
        id: 'ff_family', cat: 'e', from: 'Mom',
        body: "just checking in! dad and i were talking about you last night. so proud. how's it going? let us know if there's anything we can do.",
        urgency: 12, weeks: 1,
        available: (s, char) => s.week <= 8 && !char.flags.done && !char.flags.shown_1,
        options: [ askOption, introOption ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.shown_1 = true; },
      },
      {
        id: 'ff_family_2', cat: 'e', from: 'Mom',
        body: "hey, still haven't heard back. dad keeps asking how things are going. if there's anything we can do to help, we really want to.",
        urgency: 12, weeks: 1,
        available: (s, char) => s.week <= 8 && !char.flags.done && char.flags.shown_1 && !char.flags.shown_2,
        options: [ askOption, introOption ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.shown_2 = true; },
      },
      {
        id: 'ff_family_3', cat: 'e', from: 'Mom',
        body: "dad looked up kindred and has been reading everything. he wants to put some money in if you'll let him. also asked if he can 'test it for a friend.' it might feel weird — but he's really proud.",
        urgency: 13, weeks: 1,
        available: (s, char) => s.week <= 10 && !char.flags.done && char.flags.shown_2,
        options: [
          { label: 'Let them invest', key: 'ask',
            execute(s, char, engine) { return askFamily(s, char, engine); } },
          introOption,
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.done = true; },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.mom = def;
})();
