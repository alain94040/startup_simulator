(function () {
  const rnd   = n => Math.floor(Math.random() * n);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'sarah', name: 'Sarah (mutual)', type: 'connector',
    unlockCondition: (s) => s.week >= 3,
    cards: [
      {
        id: 'intro_expiring', cat: 'c', from: 'Sarah (mutual)',
        body: "sarah runs a 'singles in SF' facebook group — 18,000 members, weekly events, huge trust in the community. she heard about kindred from a mutual and wants to explore promoting it to her members. she's also talking to flare. you have until friday.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.week > 3 && !char.flags.intro_done && s.launched && s.activities_pivot,
        options: [
          { label: 'Meet with Sarah now', key: 'reply',
            execute(s, char) { char.flags.intro_done = true; s.users += 12; s.signal = clamp(s.signal + 7, 0, 100); s.network.advisors++; return "Met with Sarah. She liked the product and agreed to feature kindred in her next event. 12 signups in the first week. She's now a connector you can rely on."; } },
        ],
        dropDelay: 1, dropFrom: 'Sarah',
        dropMsg: "went with flare — they got back to me faster. let me know if you want to revisit.",
        dropFx(s, char) { char.flags.intro_done = true; s.signal = clamp(s.signal - 8, 0, 100); },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.sarah = def;
})();
