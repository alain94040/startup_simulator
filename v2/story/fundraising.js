// ─────────────────────────────────────────────────────────────────────────────
// v2/story/fundraising.js — the money: the two-angel round (Marcus leads,
// Fatima follows — together the non-YC win), relationship-warmth texture
// (Ryan), the post-pivot connector (Sarah), and the YC application + verdict.
//
// s.investor_warmth is the shared thermometer; the `warmth` effect key moves it.
// The lead-then-follower structure is the raise-early/find-your-lead lesson:
// Fatima never commits before Marcus does (fatima_commit requires
// s.marcusCommitted). Both verdict rolls ride e.rng() — seeded, reproducible.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const CHECKIN_BODIES = [
    "it's been a few weeks since you last touched base with Ryan. a short update on the numbers keeps you top of mind.",
    "you haven't sent Ryan anything in a while. investors go cold if you don't keep them warm.",
    "Ryan seemed genuinely interested in the dating app space. worth spending 20 minutes on a quick progress note.",
    "it's been over a month. a brief update — new subscribers, dates that happened, what's working — could be worth it.",
  ];
  const CHECKIN_REPLIES = [
    "Ryan: 'this is great, exactly what I like to see. keep the updates coming.'",
    "Ryan: 'love the progress. tracking this closely — keep me posted.'",
    "Ryan: 'still a bit early for my thesis right now — but keep me looped in. i want to see where the retention goes.'",
    "Ryan: 'good to hear from you. need to see this compound a bit more before i can get excited. keep pushing.'",
  ];

  const mod = {
    nodes: [

      // ── MARCUS — the lead ────────────────────────────────────────────────────
      {
        id: "marcus_intro", char: "marcus", from: "Marcus (angel)",
        text: "genuinely interested in what you're building in the dating space. if i don't hear back by end of week i'll assume timing's off.",
        when: { if: (s) => s.investor_warmth < 50 },
        choices: [
          {
            key: "call", label: "Take the call",
            journal: "Great call with Marcus. He's following our progress now.",
            effects: { warmth: 20 },
            fx: () => "Great call. Marcus is following your progress.",
          },
        ],
        timeout: {
          weeks: 2,
          effects: { warmth: -15, flags: { marcus_moved_on: true } },
          say: { char: "marcus", text: "tried twice. no reply. moving on — good luck with the company." },
        },
      },
      {
        id: "prep_deck", char: "marcus", from: "Marcus (angel)",
        text: "when you're ready to have a more formal conversation, can you send me a deck? you don't want to be scrambling to build one mid-diligence.",
        when: {
          took: ["marcus_intro:call"],
          if: (s) => !s.deck_ready && s.signal >= 38
            && (s.customers >= 2 || s.users >= 20 || s.waitlist >= 20),
        },
        choices: [
          {
            key: "build", label: "Build the deck now",
            journal: "Built the investor deck. Story is clear, numbers are real. Ready when the time comes.",
            effects: { flags: { deck_ready: true } },
            fx: () => "Deck done. Story is clear. Ready when the time comes.",
          },
        ],
        timeout: {
          weeks: 3,
          effects: { warmth: -25 },
          say: { char: "marcus", text: "i'll be honest — when founders don't respond to this kind of ask, i take it as a signal. i'm still watching but my conviction has cooled." },
        },
      },
      {
        id: "investor_meetings", char: "marcus", from: "Marcus (angel)",
        text: "two investors want to meet this week. deck is ready, story is tight, both have context. momentum is high right now.",
        when: {
          took: ["prep_deck:build"],
          if: (s) => s.deck_ready && s.signal >= 38 && s.investor_warmth < 75 && !s.marcus_moved_on,
        },
        choices: [
          {
            key: "meet", label: "Take both meetings",
            journal: "Took both investor meetings. Strong — both want to see our next milestone.",
            effects: { warmth: 33 },
            fx: () => "Strong meetings. Both investors want to see your next milestone.",
          },
        ],
        timeout: {
          weeks: 3,
          effects: { warmth: -20 },
          say: { from: "Investor", text: "reached out twice. no reply. assumed timing wasn't right. moving on." },
        },
      },
      {
        // The lead check. Recurring (cooldown) — a "not yet" costs warmth but
        // the conversation can reopen once traction improves.
        id: "seed_pitch", char: "marcus", from: "Marcus (angel)",
        text: "we've been watching your progress. i think the traction is there. ready to have the formal conversation about me leading your round?",
        when: {
          cooldown: 3,
          if: (s) => s.investor_warmth >= 50 && s.deck_ready && s.customers >= 6
            && s.signal >= 45 && !s.marcusCommitted && !s.marcus_moved_on,
        },
        choices: [
          {
            key: "pitch", label: "Yes — let's talk terms",
            journal: "Had the formal conversation with Marcus about leading our round.",
            fx(s, e) {
              // Diligence hits the cap table first: an un-vested departed
              // co-founder stake blocks the round until a lawyer cleans it up
              // (jordan_cap_table in story/jordan_arc.js).
              if (s.jordan_cleanup_needed && s.jordan_resolved) {
                s.investor_warmth = clamp(s.investor_warmth - 10, 0, 100);
                const pct = s.equity_proposal === "33/33/33" ? "33%" : s.equity_proposal === "50/25/25" ? "25%" : "20%";
                return "Marcus: \"one flag before we go further — there's a " + pct + " stake on the cap table with no vesting schedule. who is that and why do they still own that much of the company? we'd need that cleaned up before i can lead a round.\"";
              }
              const alexGone = !e.cast.get("alex").active;
              const productPts = s.launched ? 20 : s.productPhase === "product" ? 12 : s.has_demo ? 6 : 0;
              const score = clamp(s.customers * 2, 0, 35) + productPts
                + clamp(s.investor_warmth / 4, 0, 25) + (s.signal >= 60 ? 8 : 0);
              const baseP = score >= 65 ? 0.85 : score >= 50 ? 0.55 : 0.15;
              if (e.rng() < (alexGone ? baseP * 0.25 : baseP)) {
                s.marcusCommitted = true;
                s.cash += 400000;
                return "Marcus committed. $400K wired. He's leading — now fill the rest of the round.";
              }
              s.investor_warmth = clamp(s.investor_warmth - 15, 0, 100);
              return alexGone
                ? "Marcus: \"i heard alex left. i need to see a complete technical team before i can lead a round.\""
                : "Marcus: \"we love the vision but need more traction to lead. come back in 2 months.\"";
            },
          },
        ],
      },

      // ── FATIMA — the follower ────────────────────────────────────────────────
      {
        id: "fatima_intro", char: "fatima", from: "Fatima (angel)",
        text: "heard good things about kindred from a few people in the network. would love a quick intro call this week.",
        choices: [
          { key: "call", label: "Take the call",
            fx: () => "Good call. Fatima asked sharp questions about the problem space. 'Send me your deck when it's ready — I want to track this one.'" },
          { key: "pass", label: "Not right now",
            fx: () => "Declined. Fatima said to reach out when timing is better." },
        ],
        timeout: { weeks: 3 },
      },
      {
        id: "fatima_meeting", char: "fatima", from: "Fatima (angel)",
        text: "been thinking about our call. love the space — dating apps with real retention are rare. can we do a deeper dive this week? i want to understand the go-to-market before i go further.",
        when: { took: ["fatima_intro:call"], delay: 2 },
        choices: [
          { key: "meet", label: "Set up the meeting",
            fx: () => "Strong meeting. Fatima pushed hard on distribution. 'Send me the deck and latest numbers and I'll take it from there.'" },
        ],
        timeout: {
          weeks: 3,
          say: { char: "fatima", text: "you went quiet after the intro — going to let you drive timing. reach out when you're ready to go deeper." },
        },
      },
      {
        id: "fatima_deck", char: "fatima", from: "Fatima (angel)",
        text: "strong deck. a few follow-up questions on unit economics and TAM. once i have those i can take it to my next step.",
        when: { took: ["fatima_meeting:meet"], if: (s) => s.deck_ready },
        choices: [
          { key: "walk", label: "Walk her through it",
            journal: "Walked Fatima through the unit economics and TAM. She said the story is tight — completing diligence now.",
            fx: () => "Good follow-up. Fatima: 'the story is tight. i'm going to complete my diligence and come back to you.'" },
        ],
        timeout: {
          weeks: 3,
          say: { char: "fatima", text: "still working through my diligence process. will be in touch." },
        },
      },
      {
        // The follower never leads: this only exists once Marcus committed.
        id: "fatima_commit", char: "fatima", from: "Fatima (angel)",
        text: "i've completed my diligence. metrics are where i need them, conviction is there. i'd like to put in $100K — are you still filling the round?",
        when: {
          took: [["fatima_deck:walk", "fatima_deck:@ignored"]],
          if: (s) => s.marcusCommitted && !s.followerCommitted,
        },
        choices: [
          {
            key: "welcome", label: "Yes — welcome aboard",
            fx(s, e) {
              const alexGone = !e.cast.get("alex").active;
              if (alexGone && e.rng() < 0.70) {
                return "Fatima: \"i need to pass. losing your technical co-founder this late is a real red flag — i can't get comfortable with the execution risk.\"";
              }
              s.followerCommitted = true;
              s.cash += 100000;
              return "Fatima wired $100K. $500K raised. Round closed.";
            },
          },
        ],
      },

      // ── RYAN — the keep-them-warm texture ────────────────────────────────────
      {
        id: "ryan_intro", char: "ryan", from: "Ryan (angel)",
        text: "heard about you through the network. love what you're building in the dating space. would love to grab coffee and hear more.",
        choices: [
          { key: "meet", label: "Grab coffee",
            journal: "Great coffee with Ryan. Sharp questions, genuinely excited. He wants to stay close as things develop.",
            fx: () => "Great coffee. Ryan asked sharp questions and seemed genuinely excited. 'Keep me posted as things develop — I want to stay close to this.'" },
          { key: "pass", label: "Not right now",
            journal: "Declined Ryan's coffee invite. He said to reach out when timing's better.",
            fx: () => "Declined. Ryan said to reach out when timing is better." },
        ],
        timeout: { weeks: 3 },
      },
      {
        id: "ryan_checkin", char: "ryan", from: "You", ambient: true,
        text: (s, e) => CHECKIN_BODIES[e.timesResolved("ryan_checkin") % CHECKIN_BODIES.length],
        when: { took: ["ryan_intro:meet"], delay: 5, cooldown: 5 },
        choices: [
          { key: "update", label: "Send Ryan a quick update",
            effects: { warmth: 3 },
            fx: (s, e) => CHECKIN_REPLIES[e.timesResolved("ryan_checkin") % CHECKIN_REPLIES.length] },
          { key: "skip", label: "Skip it this week",
            fx: () => "Left it for another time." },
        ],
      },

      // ── SARAH — the post-pivot connector ─────────────────────────────────────
      {
        id: "sarah_intro", char: "sarah", from: "Sarah (mutual)",
        text: "sarah runs a 'singles in SF' facebook group — 18,000 members, weekly events, huge trust in the community. she heard about kindred from a mutual and wants to explore promoting it to her members. she's also talking to flare. you have until friday.",
        when: { if: (s) => s.launched && s.activities_pivot },
        choices: [
          {
            key: "reply", label: "Meet with Sarah now",
            journal: "Met with Sarah — she runs a singles community of 18,000 members. She liked the product and agreed to feature kindred at her next event. 12 signups in the first week.",
            effects: { users: 12, signal: 7 },
            fx: () => "Met with Sarah. She liked the product and agreed to feature kindred in her next event. 12 signups in the first week. She's now a connector you can rely on.",
          },
        ],
        timeout: {
          weeks: 1,
          effects: { signal: -8 },
          say: { char: "sarah", text: "went with flare — they got back to me faster. let me know if you want to revisit." },
        },
      },

      // ── YC — the application and the verdict ─────────────────────────────────
      {
        id: "yc_apply", char: "yc", from: "Y Combinator",
        text: "Application deadline is this week. What you're building in the dating space, why you, what you've learned from subscribers. Takes a focused day to do well.",
        when: { if: (s) => s.ycDeciding && !s.ycApplied },
        choices: [
          {
            key: "submit", label: "Submit the application",
            journal: "YC application submitted. Decision in 3 weeks.",
            fx(s, e) {
              s.ycDeciding = false;
              s.ycApplied = true;
              // Three weeks out, YC rolls a verdict — better odds if we
              // qualified. Either way the verdict ends the run: accept → $500k
              // + win; reject → final, game over (no reapplying).
              e.schedule({
                in: 3,
                unless: (st) => st.ycAccepted,
                fx(st, en) {
                  const accepted = en.rng() < (st.ycQualified ? 0.18 : 0.04);
                  if (accepted) {
                    st.ycAccepted = true; st.ycApplied = false;
                    st.cash += 500000;
                    st.signal = Math.min(100, st.signal + 25);
                    en.say({ char: "founder", from: "Y Combinator", text: "You're in. Welcome to the batch — $500k for 7%. See you at kickoff." });
                  } else {
                    st.ycApplied = false;
                    st.ycRejected = true;
                    en.say({ char: "founder", from: "Y Combinator", text: "Thanks for applying — we're passing. We look at thousands of these; the ones that come back are the companies that kept going. Whatever kindred becomes, this application wasn't the end of it." });
                  }
                },
              });
              return "Application submitted. Decision in 3 weeks.";
            },
          },
        ],
        timeout: {
          weeks: 2,
          fx(s) { s.ycDeciding = false; s.yc_week = s.week + 26; },
          say: { from: "Y Combinator", text: "Missed the YC deadline. The next batch opens in about 6 months." },
        },
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.V2STORY = window.V2STORY || []).push(mod);
})();
