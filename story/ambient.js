// ─────────────────────────────────────────────────────────────────────────────
// story/ambient.js — flavor: Mom's check-in chain and the ramen valve. Proves
// the class ordering (an ambient card never out-competes a story beat) and the
// "@ignored" chain (each of Mom's nags only exists because the previous one
// went unanswered).
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  // Asking family for money never resolves on the spot — they need to talk it
  // over. The answer lands three weeks later. Family money is the one certain
  // check in the game (the friends' checks still ride dice) — the cash clock
  // should be tensioned by decisions, not by a week-5 coin flip.
  function askFamily(s, e) {
    e.schedule({
      in: 3, char: "mom",
      say: {
        char: "mom",
        text: "ok!! dad and i talked it over — i just wired you $4,000. so proud of you honey ❤️ go build something amazing.",
      },
      fx(st) { st.cash += 4000; },
    });
    return "Asked Mom and Dad if they'd put money in. They said they'd talk it over and let me know.";
  }

  const momChoices = (journalAsk) => ([
    {
      key: "ask", label: "Ask if they'd put money in",
      reply: "about that. can I come over for dinner this weekend? there's something I want to talk to you about.",
      journal: journalAsk,
      fx: (s, e) => askFamily(s, e),
    },
    {
      key: "intro", label: "Ask for investor introductions",
      journal: "Asked Mom for investor introductions. Turns out she doesn't know any investors.",
    },
  ]);

  const mod = {
    nodes: [
      {
        id: "ff_family", char: "mom", ambient: true,
        text: "just checking in! dad and i were talking about you last night. so proud. how's it going? let us know if there's anything we can do.",
        when: { if: (s) => s.week >= 3 && s.week <= 12 },
        choices: momChoices("Asked Mom and Dad if they'd put money in. They're going to talk it over and get back to me."),
        timeout: { weeks: 3 },
      },
      {
        // Only exists because the first text went unanswered.
        id: "ff_family_2", char: "mom", ambient: true,
        text: "hey, still haven't heard back. dad keeps asking how things are going. if there's anything we can do to help, we really want to.",
        when: { took: ["ff_family:@ignored"], if: (s) => s.week <= 9 },
        choices: momChoices("Asked the parents again about chipping in. They said they'd discuss it. Family money — complicated feelings."),
        timeout: { weeks: 3 },
      },
      {
        id: "ff_family_3", char: "mom", ambient: true,
        text: "dad looked up plusone and has been reading everything. he wants to put some money in if you'll let him. also asked if he can 'test it for a friend.' it might feel weird — but he's really proud.",
        when: { took: ["ff_family_2:@ignored"], if: (s) => s.week <= 12 },
        choices: [
          {
            key: "ask", label: "Let them invest",
            reply: "about that. can I come over for dinner this weekend? there's something I want to talk to you about.",
            journal: "Told Dad he could invest. He's going to sort it out. Family money hits different.",
            fx: (s, e) => askFamily(s, e),
          },
          {
            key: "intro", label: "Ask for investor introductions",
            fx: () => "Mom asked around. Turns out she doesn't know any investors. \"Not everyone has a mom like Bill Gates.\"",
          },
        ],
        timeout: { weeks: 3 },
      },

      // ── the ramen valve: trade a week's focus for rent money ─────────────────
      // Story class on purpose: when the runway is this short it IS the story.
      // Converts a pure dice-death (thin friends-and-family rolls) into a
      // choice — you can consult your way out of a cash hole, but each gig
      // burns a week of focus against the deadline.
      {
        id: "founder_consulting", char: "founder",
        text: (s) => "the bank balance says $" + Math.max(0, Math.round(s.cash)).toLocaleString() + ". your old firm keeps a freelance list — one week of contract work is $2,500, no questions asked. it's rent money. it's also a week not spent on plusone.",
        when: {
          cooldown: 3,
          if: (s) => s.week >= 4 && s.cash < 2500 && !s.game_over,
        },
        choices: [
          {
            key: "take", label: "Take the contract week — $2,500",
            journal: "Took a week of contract work to keep the lights on. $2,500 in, one week of plusone momentum out. Nobody puts this part in the founding story.",
            effects: { cash: 2500, signal: -2 },
          },
          {
            key: "decline", label: "No — every week belongs to plusone",
            journal: "Turned down the contract week. Every remaining week belongs to plusone — and the bank balance knows it.",
          },
        ],
        timeout: { weeks: 2 },
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.STORY = window.STORY || []).push(mod);
})();
