// ─────────────────────────────────────────────────────────────────────────────
// story/jordan_talk.js — the Jordan conversation: the honest ladder and the
// firing, as a beat FACTORY rather than a story module. The same conversation
// happens in two rooms, and each room needs its own copy of the beats (a beat
// fires once, and a room can't borrow another arc's beats):
//
//   - the pivot night (story/pivot_day.js, arc "pivot") — right after Alex's
//     DM, the same sitting as the pivot call. Ids as written: jordan_ladder_open …
//   - the second chance (story/firing.js, arc "firing") — Alex's door opening
//     one last time two weeks later, or the first time after a late pivot.
//     Ids suffixed "_2": jordan_ladder_open_2 …
//
// Shape of the talk (see final_arc_draft.html for the full script):
//   1. The ladder. Jordan texts first, excited, with a PROMISE ("first
//      version by sunday"). No chip ever says "fire": the player climbs three
//      honest rungs, and each has a warm way out that keeps her.
//   2. Jordan names it: "are you asking me to leave?" The decision is a
//      one-word answer to her question.
//   3. The firing. She argues twice — a protest, then a bargain (taking the
//      bargain is one more way to keep her) — then stops. The next reply
//      decides whether the split is amicable: "What's actually going on with
//      you?" leads to the shares, the App Store account, her notes and a last
//      word; "I know. I'm sorry." shows no curiosity about her, and she ends it
//      herself and blocks the founder. Every mechanical consequence lands once,
//      in jordanLeaves().
//
// Not a STORY module: pivot_day.js and firing.js call jordanTalk() to build
// their beats. Dual export: module.exports (Node) / window.JORDAN_TALK.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const pctOf = (s) => s.equity_proposal === "33/33/33" ? "33%"
    : s.equity_proposal === "50/25/25" ? "25%" : "20%";

  // Every way the founder doesn't finish the sentence lands here: Jordan keeps
  // the board (built at her part-time pace, see world.js). The first time,
  // Alex opens the door once more two weeks later (jordan_door_again); the
  // second time is final.
  function keepHer(s, final) {
    if (!s.jordan_kept) { s.jordan_kept = true; s.jordan_kept_week = s.week; }
    if (final) s.jordan_kept_final = true;
  }

  // The terminal consequence of the firing, applied once. mode: "warm" (the
  // conversation ran its course) | "cold" (she ended it and blocked you).
  function jordanLeaves(s, e, mode) {
    const jordan = e.cast.get("jordan");
    const alex = e.cast.get("alex");
    jordan.active = false;
    s.jordan_resolved = true;
    s.jordan_cleanup_needed = true;   // her stake stays on the cap table until the lawyer
    s.jordan_fired_week = s.week;
    // The board goes to Alex. Her progress on it stays; reading it cold costs
    // him a week, unless she wrote down what was in her head.
    if (s.items && s.items.plans_ui && s.items.plans_ui.status === "todo") {
      s.items.plans_ui.assignee = "alex";
      if (!s.jordan_handoff) s.board_extra = (s.board_extra || 0) + 1;
    }
    if (mode === "cold") {
      s.jordan_cold_exit = true;
      s.jordan_blocked = true;
      s.appstore_on_jordan = true;    // nobody got to ask her to move it
      // …and a week later she closes the developer account the listing
      // lives on. The app vanishes from the App Store; the team finds out
      // from a user (appstore_delisted in story/jordan_arc.js).
      e.schedule({
        in: 1,
        fx(st) {
          st.app_delisted = true;
          st.app_was_delisted = true;
          st.users = Math.floor(st.users * 0.6);
        },
      });
    }
    e.say({ char: "founders", system: true, text: "Jordan left the conversation" });
    if (!s.jordan_equity) {
      // Equity was never papered — Alex sees the same dysfunction coming.
      alex.morale = clamp(alex.morale - 30, 0, 100);
      alex.trust = clamp(alex.trust - 25, 0, 100);
      s.alex_departure_risk = true;
      return;
    }
    alex.morale = clamp(alex.morale + (mode === "cold" ? 4 : 10), 0, 100);
    alex.trust = clamp(alex.trust + (mode === "cold" ? 2 : 8), 0, 100);
  }

  // Build the conversation's beats. `sfx` suffixes every id ("" or "_2");
  // `entry` is the `took` spec that opens it; `final` makes every keep-her
  // exit the last one (no third door).
  function jordanTalk(sfx, entry, final) {
    const id = (b) => b + sfx;
    // The second chance proper — Jordan kept the board two weeks ago and it's
    // still not built — is worded differently from a first conversation.
    const again = (s) => !!s.jordan_kept;

    const yes = {
      key: "yes", label: "Yes. It's not working out.",
      reply: "yes. it's not working out, jordan. plusone needs people who can go full speed right now, and that's not where you are. i'm taking you off the founding team.",
      journal: null,
    };
    const no = {
      key: "no", label: "No. Forget I said anything.",
      reply: "no. no. forget i said anything.",
      journal: "Jordan asked me straight out if I was asking her to leave. I said no. She said you can't un-ask that.",
      effects: { scene: null, say: { char: "jordan", text: "okay.\n\nyou can't un-ask that, you know." } },
      fx(s) { s.jordan_folded = true; keepHer(s, final); return null; },
    };

    return [
      // ── the ladder ────────────────────────────────────────────────────────
      {
        // She texts first. She has no idea — and nothing is built yet, it's
        // all a promise. That is the pattern, in one message.
        id: id("jordan_ladder_open"), char: "jordan",
        text: (s) => again(s)
          ? "almost done with the RSVP flow 🙃\n\nthis weekend for sure. you're going to love it."
          : "couldn't sleep. i've got the whole board in my head. thursday, climbing gym, 6 going, 2 spots, one big 'i'm in' button.\n\nno profiles on the front screen. no chat until you've said yes to something.\n\nfirst version by sunday. monday latest. you're going to love it.",
        when: { took: entry },
        choices: [
          {
            // Labels are the founder's intent, bubbles are the words (see
            // ff_family: "Let them invest" → "can I come over for dinner").
            // The warm exits are labelled as what they are — choosing not to
            // say it — so they don't read as merely polite replies.
            key: "bed", label: "Let her have tonight",
            reply: "sounds great. go to bed.",
            journal: (s) => again(s)
              ? "Jordan texted at 2am: the RSVP flow is almost done, this weekend for sure. I told her it sounded great. Again."
              : "Jordan texted at midnight with the whole board in her head, first version by Sunday. I told her it sounded great. I didn't ask.",
            effects: { scene: null, say: { char: "jordan", text: "💜 night" } },
            fx(s) { keepHer(s, final); return null; },
          },
          {
            key: "real", label: (s) => again(s) ? "Ask again if she can keep up" : "Ask if she can keep up",
            reply: (s) => again(s) ? "it's 2am, jordan. can i ask you something real?" : "it sounds great. can i ask you something real?",
            journal: null,
          },
        ],
      },
      {
        id: id("jordan_ladder_go"), char: "jordan",
        text: (s) => again(s) ? "…go." : "…that's a scary sentence at midnight. go.",
        // Every step of the talk gates on the answer that CONTINUES it, not
        // just on the previous beat resolving: a warm exit closes the room,
        // and a plain `after` chain would then surface the next step later,
        // outside it.
        when: { took: [id("jordan_ladder_open") + ":real"] },
        choices: [
          {
            key: "ask",
            label: (s) => again(s) ? "You said that two weeks ago." : "Sunday, with the job — can you actually do that?",
            reply: (s) => again(s)
              ? "you said that two weeks ago. the board was supposed to take three weeks, and it's still not there."
              : "sunday. with the job. can you actually do that?",
            journal: null,
          },
          {
            key: "back", label: "Back off",
            reply: "…never mind. it's late. get some sleep.",
            journal: "Started to ask Jordan whether she could really build the board around her job. Then I told her to get some sleep.",
            effects: { scene: null, say: { char: "jordan", text: "okay?? you're being weird. night 💜" } },
            fx(s) { s.jordan_doubted = true; keepHer(s, final); return null; },
          },
        ],
      },
      {
        // She pushes back — she genuinely thinks she's been doing fine.
        id: id("jordan_ladder_defend"), char: "jordan",
        text: (s) => (again(s)
          ? "i know. the job's been insane. it'll be different once—"
          : "yes? i've been doing it since day one.")
          + "\n\nwhy — did alex say something?",
        when: { took: [id("jordan_ladder_go") + ":ask"] },
        choices: [
          {
            key: "nothing", label: "Back off",
            reply: "no, nothing. forget it. let's do it.",
            journal: "Asked Jordan if she could really build the board around her job. She said yes, and asked if Alex had said something. I said no.",
            effects: { scene: null, say: { char: "jordan", text: "thank you. you won't regret it." } },
            fx(s) { s.jordan_doubted = true; keepHer(s, final); return null; },
          },
          {
            key: "late", label: "Name the pattern: everything's a week late",
            reply: "no, i'm saying it. everything's landed about a week late. the picker, the ios sprint, alex's PR.",
            journal: null,
            effects: { say: { char: "jordan", text: "…has it?\n\ni mean — each of those had a reason." } },
          },
          {
            key: "demo", label: "Name the pattern: demo night",
            if: (s) => !!s.demo_jordan_absent,
            reply: "demo night. you weren't there, and it was your sister's friend testing.",
            journal: null,
            effects: { say: { char: "jordan", text: "that was a release cut. that wasn't—\n\n…okay. and the fix was two days late too." } },
          },
        ],
      },
      {
        // She names it. The founder never picks "fire" from a menu — they
        // answer a friend's question.
        id: id("jordan_ladder_names"), char: "jordan",
        text: "are you asking me to leave?",
        when: { took: [id("jordan_ladder_defend") + ":late|demo"] },
        choices: [
          yes,
          {
            key: "ask_back", label: "I'm asking what you think.",
            reply: "i'm asking what you think.",
            journal: null,
          },
          no,
        ],
      },
      {
        id: id("jordan_ladder_names_again"), char: "jordan",
        text: "i think if i were you i'd have asked a month ago.\n\nso. are you?",
        when: { took: [id("jordan_ladder_names") + ":ask_back"] },
        choices: [yes, no],
      },

      // ── the firing ────────────────────────────────────────────────────────
      {
        // Pushback 1: she protests — and she's partly right.
        id: id("firing_protest"), char: "jordan",
        text: (s, e) => (again(s) ? "you could have said this two weeks ago. i'd have taken it better.\n\n" : "")
          + "no. wait.\n\n"
          + (again(s) ? "over text? at 2am?" : "you're doing this over text? at midnight? the night we finally figured out what we're building?")
          + "\n\nthe board is my idea. "
          + (e.took("first_screen:intake_interviews|intake") ? "the intake screen was my idea. " : "the first screen anyone ever saw was mine. ")
          + "i turned down a real job for this, you KNOW that.",
        when: { took: [[id("jordan_ladder_names") + ":yes", id("jordan_ladder_names_again") + ":yes"]] },
        choices: [
          { key: "true", label: "All true. It's still the decision.", reply: "all of that is true. it's still the decision.", journal: null },
          {
            key: "sooner", label: "You should have heard this sooner. That's on me.",
            reply: "you should have heard this months ago, and that's on me, not you. it's still the decision.",
            journal: null,
          },
        ],
      },
      {
        // Pushback 2: she bargains. Taking the bargain is backing off with a
        // deadline attached — the most reasonable-sounding way to keep her.
        id: id("firing_bargain"), char: "jordan",
        text: (s) => (again(s) ? "then give me two more weeks." : "then give me the three weeks.")
          + "\n\nif the board isn't live by then, i'll leave on my own. you won't even have to say it.\n\nthat's fair. you know that's fair.",
        when: { after: [id("firing_protest")] },
        choices: [
          {
            key: "no", label: "No. I'm sorry.",
            reply: "no. i'm sorry. if i say yes, we have this conversation again in three weeks, and it's worse for both of us.",
            journal: null,
          },
          {
            key: "deal", label: (s) => again(s) ? "…Okay. Two weeks." : "…Okay. Three weeks.",
            reply: (s) => again(s) ? "…okay. two weeks." : "…okay. three weeks.",
            journal: "Told Jordan it wasn't working out, then took her deal: more time on the board, and if it isn't live she leaves on her own.",
            effects: { scene: null, say: { char: "jordan", text: "thank you. you'll see." } },
            fx(s) { s.jordan_bargained = true; keepHer(s, final); return null; },
          },
        ],
      },
      {
        id: id("firing_stops"), char: "jordan",
        text: "…okay.\n\ni honestly didn't see this coming. i thought i was doing fine.",
        when: { took: [id("firing_bargain") + ":no"] },
        choices: [
          {
            // The cold ending. After two pushbacks, "sorry" is the one reply
            // that shows no curiosity about her — she takes it as proof the
            // decision was made without her, ends it, and blocks you.
            key: "sorry", label: "I know. I'm sorry.",
            reply: "i know. i'm sorry.",
            journal: "Told Jordan it wasn't working out. She argued, then she asked for more time, then I said 'I'm sorry' and nothing else. She blocked me. Her shares go through lawyers now, the App Store listing is still on her account, and nobody wrote down what was in her head.",
            fx(s, e) {
              e.say({
                char: "jordan",
                text: "sorry.\n\ni turned down a real job for this. every evening, every weekend. and i get a text at midnight and 'sorry'.\n\nyou didn't even ask me anything. you'd decided before you opened this thread.\n\nanything else about shares or accounts can go through a lawyer. don't text me.",
              });
              e.say({ char: "jordan", outgoing: true, undelivered: true, text: "jordan, the app store account is still on yours. can we at least—" });
              jordanLeaves(s, e, "cold");
              return null;
            },
          },
          {
            key: "ask", label: "What's actually going on with you?",
            reply: "can i ask what's actually going on with you? not the work. you.",
            journal: null,
            effects: {
              say: {
                char: "jordan",
                text: "honestly? nothing. that's the whole answer, and i know how it sounds.\n\ni'm doing exactly what i said i'd do in week one. evenings and weekends, around a job i can't afford to quit. that hasn't changed once.\n\nyou two went full-time and i didn't. i was never going to be able to match that. nobody said a word about it, so i thought maybe it was fine.",
              },
            },
          },
        ],
      },
      {
        // The practical half — the half founders actually botch.
        id: id("firing_shares"), char: "jordan",
        text: "what happens to my shares?\n\nand one practical thing — the app store listing is on my personal developer account. it was $99 and we were being careful with money.",
        when: { took: [id("firing_stops") + ":ask"] },
        choices: [
          {
            key: "transfer", label: "Paperwork this week, and I'll move the account ($99)",
            reply: "you keep what's vested, i pay the lawyer. and i'll open the org account tomorrow — we transfer before you sign anything.",
            payee: "Apple Developer",
            journal: null,
            effects: { cash: -99, say: { char: "jordan", text: "yeah. do it while i still care about doing it properly." } },
          },
          {
            key: "defer", label: "Paperwork's coming. Leave the account for now.",
            reply: "paperwork this week. can the account stay where it is for now? i've got nine things ahead of it.",
            journal: null,
            effects: { flags: { appstore_on_jordan: true }, say: { char: "jordan", text: "sure. it's not going anywhere." } },
          },
        ],
      },
      {
        id: id("firing_notes"), char: "jordan",
        text: "the board. it's mostly in my head. do you want me to write it down for alex?",
        when: { after: [id("firing_shares")] },
        choices: [
          {
            key: "handoff", label: "Yes — if you're okay with that.",
            reply: "yes. if you're okay with that.",
            journal: null,
            effects: { flags: { jordan_handoff: true }, say: { char: "jordan", text: "i'll write it up tomorrow. it was always for plusone." } },
          },
          {
            key: "fresh", label: "We'll start fresh.",
            reply: "we'll start fresh. you shouldn't have to hand us anything tonight.",
            journal: null,
            effects: { say: { char: "jordan", text: "okay." } },
          },
        ],
      },
      {
        id: id("firing_last"), char: "jordan",
        text: "is that everything?",
        when: { after: [id("firing_notes")] },
        choices: [
          {
            key: "intake", label: "The intake screen was yours.",
            if: (s, e) => e.took("first_screen:intake_interviews|intake"),
            reply: "one more thing. the intake screen — your sister's group chat — is still the only thing anyone ever shared on their own. that was you. tonight doesn't erase it.",
            journal: (s) => "Told Jordan it wasn't working out — myself, over text. She argued, then she stopped. Her " + pctOf(s)
              + " gets papered this week; Alex has the board from Monday. I told her the intake screen was hers, and that tonight doesn't erase it.",
            fx(s, e) {
              e.say({ char: "jordan", text: "…thanks. that lands better than you'd think." });
              jordanLeaves(s, e, "warm");
              return null;
            },
          },
          {
            key: "maya", label: "You saw Maya before any of us did.",
            if: (s, e) => e.took("launch_first_signup:watch"),
            reply: "you saw maya before any of us did. launch day, and again tonight. we're building v2 on something you noticed.",
            journal: (s) => "Told Jordan it wasn't working out — myself, over text. She argued, then she stopped. Her " + pctOf(s)
              + " gets papered this week; Alex has the board from Monday. I told her v2 is built on something she noticed first.",
            fx(s, e) {
              e.say({ char: "jordan", text: "…i did, didn't i." });
              jordanLeaves(s, e, "warm");
              return null;
            },
          },
          {
            key: "close", label: "That's everything. I'm sorry.",
            reply: "that's everything. i'm sorry.",
            journal: (s) => "Told Jordan it wasn't working out — myself, over text. She argued, then she stopped. Her " + pctOf(s)
              + " gets papered this week; Alex has the board from Monday.",
            fx(s, e) {
              e.say({ char: "jordan", text: "okay. goodnight." });
              jordanLeaves(s, e, "warm");
              return null;
            },
          },
        ],
      },
      {
        // The founders' group chat, after. The system line ("Jordan left the
        // conversation", from jordanLeaves) does what a journal entry can't.
        id: id("firing_after"), char: "founders", speaker: "alex",
        text: "you okay?",
        when: { took: [[id("firing_last"), id("firing_stops") + ":sorry"]] },
        choices: [
          { key: "not_really", label: "Not really.", reply: "not really.", journal: null },
          { key: "right_call", label: "It was the right call.", reply: "it was the right call.", journal: null },
        ].map(c => Object.assign(c, {
          effects: {
            scene: null,
            say: [
              { char: "founders", speaker: "alex", text: "yeah. both, probably." },
              {
                char: "founders", speaker: "alex",
                text: (s) => s.jordan_cold_exit
                  ? "board's mine now. i'll start from the screens, since nobody wrote anything down. we start monday."
                  : s.jordan_handoff
                    ? "when her notes come in, they go in the doc. board's mine now. we start monday."
                    : "board's mine now. we start monday.",
              },
            ],
          },
        })),
      },
    ];
  }

  const api = { jordanTalk, jordanLeaves, pctOf };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.JORDAN_TALK = api;
})();
