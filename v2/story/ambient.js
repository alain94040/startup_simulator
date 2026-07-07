// ─────────────────────────────────────────────────────────────────────────────
// v2/story/ambient.js — flavor and filler: Mom's check-in chain and the
// founder's quiet-week card. Proves the class ordering (ambient/filler never
// out-compete a story beat) and the "@ignored" chain (each of Mom's nags only
// exists because the previous one went unanswered).
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  // Asking family for money never resolves on the spot — they need to talk it
  // over. The outcome is decided now but lands three weeks later.
  function askFamily(s, e) {
    const willInvest = e.rng() < 0.9;
    e.schedule({
      in: 3, char: "mom",
      say: {
        char: "mom",
        text: willInvest
          ? "ok!! dad and i talked it over — i just wired you $4,000. so proud of you honey ❤️ go build something amazing."
          : "honey, we talked it over and we'd love to, but money's a little tight with the house right now. so sorry. we believe in you no matter what ❤️",
      },
      fx(st) { if (willInvest) st.cash += 4000; },
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
      fx: () => "Mom asked around. Turns out she doesn't know any investors. \"Not everyone has a mom like Bill Gates.\"",
    },
  ]);

  const mod = {
    nodes: [
      {
        id: "ff_family", char: "mom", ambient: true,
        text: "just checking in! dad and i were talking about you last night. so proud. how's it going? let us know if there's anything we can do.",
        when: { if: (s) => s.week <= 8 },
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
        text: "dad looked up kindred and has been reading everything. he wants to put some money in if you'll let him. also asked if he can 'test it for a friend.' it might feel weird — but he's really proud.",
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

      // ── the safety valve: only surfaces when the founder has nothing real ────
      {
        id: "founder_reflect", char: "founder", filler: true,
        text: (s) => {
          if (s.cash < 3000) return "runway is nearly gone. whatever you focus on this sprint, it has to matter.";
          if (s.cash < 7000) return "a quieter stretch — but the runway is shrinking. no fires right now, but don't mistake that for safety.";
          const quietVariants = [
            "a quiet stretch. no fires, no urgent asks. a rare chance to get ahead instead of staying afloat.",
            "no crises this week. good moment to look at match-to-date conversion — the number most dating app founders ignore until it's too late.",
            "things are quiet. worth a sprint looking at what your most active users actually do in the app — not what they say they want.",
          ];
          return quietVariants[Math.floor(s.week / 4) % quietVariants.length];
        },
        when: { cooldown: 1 },
        choices: [
          {
            key: "review", label: "Review your positioning",
            effects: { signal: 2 },
            fx(s, e) {
              const msgs = [
                "Spent time thinking about the pitch. Small refinements. Nothing dramatic.",
                "Wrote out the 'why now' for Kindred again. Tighter than before, but still not crisp enough for a cold email.",
                "Mapped out how we talk about the problem. Some clarity — nothing that changes the strategy.",
                "Refined the one-liner. Closer, but still not the version that makes someone lean in.",
                "Ran through the positioning again. A few word changes, one sharper framing. Progress.",
                "Wrote down the three objections we always get. No good answers yet — but naming them is a start.",
              ];
              return msgs[e.timesResolved("founder_reflect") % msgs.length];
            },
          },
        ],
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.V2STORY = window.V2STORY || []).push(mod);
})();
