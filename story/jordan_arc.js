// ─────────────────────────────────────────────────────────────────────────────
// story/jordan_arc.js — the Jordan question between the two conversations,
// and the bill after.
//
// The question is asked on the pivot night (story/pivot_day.js): Alex's DM,
// then Jordan's thread. If the founder doesn't finish the sentence, Jordan
// keeps the board and builds it at her part-time pace (world.js) — and the
// next two weeks show it:
//   - jordan_slip: the promise slips ("weekend got eaten by a release at work").
//   - jordan_door_again: Alex opens the door one last time — or, after a late
//     pivot that skipped the pivot night, for the first time. "I'll talk to
//     her" enters the second-chance room (story/firing.js). Fires once.
//
// After she's gone: jordan_cap_table, the vesting bill. Her stake stays on the
// cap table until a lawyer cleans it up; the investors' diligence flags it
// (see seed_pitch in story/fundraising.js). A cold exit (she blocked you)
// makes it a negotiation with her lawyer, not a signature.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const pctOf = (s) => s.equity_proposal === "33/33/33" ? "33%"
    : s.equity_proposal === "50/25/25" ? "25%" : "20%";
  const boardTodo = (s) => !!(s.items && s.items.plans_ui && s.items.plans_ui.status === "todo");

  const mod = {
    nodes: [
      {
        // A week after she kept the board: the promise slips. Harmless to
        // answer either way — the point is that the player watches it happen.
        id: "jordan_slip", char: "jordan",
        text: "ugh, weekend got eaten by a release at work 😩\n\nboard's half there. i'll have it this week, promise.",
        when: {
          if: (s, e) => !!s.jordan_kept && !s.jordan_resolved && e.cast.get("jordan").active
            && s.week >= (s.jordan_kept_week || 0) + 1 && boardTodo(s),
        },
        choices: [
          { key: "great", label: "Great work — no stress.", reply: "great work. no stress.", journal: null },
          {
            key: "when", label: "When's 'this week'?",
            reply: "when's 'this week'? alex is waiting on it.",
            journal: null,
            effects: { say: { char: "jordan", text: "thursday. friday latest." } },
          },
        ],
        timeout: { weeks: 2 },
      },
      {
        // Once the door is closed for good, the board keeps not arriving —
        // one cheerful, sincere promise every other week until the deadline.
        // This IS the cost of keeping her, felt instead of narrated.
        id: "jordan_board_promise", char: "jordan",
        text: (s, e) => [
          "RSVP flow is done-ish! join screen next. this weekend for real 🙌",
          "sorry, launch week at work 😩 board by friday. promise.",
          "almost there. i know i keep saying that. this is the last week, i swear.",
        ][Math.min(2, e.timesResolved("jordan_board_promise"))],
        when: {
          cooldown: 2,
          if: (s, e) => !!s.jordan_kept_final && !s.jordan_resolved && e.cast.get("jordan").active
            && boardTodo(s) && e.done("jordan_slip"),
        },
        choices: [
          { key: "ok", label: "No stress.", reply: "no stress.", journal: null },
          {
            key: "when", label: "You know the deadline doesn't move, right?",
            reply: "you know the deadline doesn't move, right?",
            journal: null,
            effects: { say: { char: "jordan", text: "i know. i know. i've got it." } },
          },
        ],
        timeout: { weeks: 1 },
      },
      {
        // The cold ending's aftershock: a week after she blocked the founder,
        // Jordan closes the personal developer account the App Store listing
        // lives on, and the app is simply gone. Nobody moved the account
        // because nobody got to ask her. The team finds out the way teams do:
        // a user can't find the app.
        id: "appstore_delisted", char: "founders", speaker: "alex",
        text: "we have a problem. a user just emailed: 'is plusone gone?' i checked.\n\nit's not down. it's GONE. the listing says 'this developer account has been closed.' jordan closed her apple account — the one the app lived on.\n\nnew installs are impossible, and anyone who deletes the app can't get it back. the relaunch can't happen with no listing.",
        when: { if: (s) => !!s.app_delisted },
        choices: [
          {
            key: "resubmit", label: "Resubmit under our own account ($99)",
            reply: "open an org account tonight and resubmit. $99. we eat the reviews.",
            payee: "Apple Developer",
            journal: "Jordan closed her developer account and PlusOne vanished from the App Store. Resubmitted under our own account: $99, a week in review, zero reviews, and every user had to reinstall.",
            effects: {
              cash: -99,
              say: { char: "founders", speaker: "alex", text: "on it. new listing, zero reviews, and everyone has to reinstall. a week in review if we're lucky." },
              schedule: {
                in: 1,
                fx(st) { st.app_delisted = false; st.appstore_on_jordan = false; st.signal = clamp(st.signal - 5, 0, 100); },
                say: { char: "founders", speaker: "alex", text: "we're back in the store. new listing, no reviews, no history. like launching twice, except the first one doesn't count." },
              },
            },
          },
          {
            key: "lawyer", label: "Lawyer asks for the listing back ($1,000)",
            reply: "get the lawyer to ask her lawyer to transfer the listing instead of us starting over. we keep the reviews.",
            payee: "Lawyer",
            journal: "Jordan closed her developer account and PlusOne vanished from the App Store. Paid a lawyer $1,000 to get the listing transferred back — two weeks of nobody able to install the app.",
            effects: {
              cash: -1000,
              say: { char: "founders", speaker: "alex", text: "okay. that's two weeks with no app in the store. i'll keep building." },
              schedule: {
                in: 2,
                fx(st) { st.app_delisted = false; st.appstore_on_jordan = false; },
                say: { char: "founders", speaker: "alex", text: "listing's transferred. reviews intact. it cost a grand and two weeks, and she didn't write a single word to either of us." },
              },
            },
          },
        ],
        // Ignored: Alex resubmits himself — and says so.
        timeout: {
          weeks: 1,
          effects: { cash: -99, char: { alex: { morale: -8 } } },
          say: { char: "founders", speaker: "alex", text: "i resubmitted under an org account myself. $99. i'd have liked you to answer me about the app disappearing." },
          fx(s, e) { e.schedule({ in: 1, fx(st) { st.app_delisted = false; st.appstore_on_jordan = false; } }); },
        },
      },
      {
        // Alex's door, one last time. Not a complaint — a status, from someone
        // who said his piece once and won't say it the same way twice. Or,
        // after a late pivot (no pivot night), the first time he says it.
        id: "jordan_door_again", char: "alex",
        text: (s) => s.jordan_kept
          ? "matching's done. repointed, tested, merged.\n\nboard's at the RSVP button. same as last week.\n\ni'm not asking you to do anything. i'm telling you i've stopped waiting for it."
          : "can i say something i've been sitting on?\n\njordan's great. i mean that. she's also been a week behind on everything since demo night — the picker, the ios sprint, the review on my PR. every time there's a good reason. every time it's a week.\n\nand v2 doesn't have a week in it. …or maybe that's on me. i don't know if i'm being fair to her.",
        when: {
          if: (s, e) => s.activities_pivot && s.pivot_week != null
            && e.cast.get("jordan").active && !s.jordan_resolved && !s.jordan_kept_final
            && boardTodo(s)
            && (s.jordan_kept
              ? s.week >= (s.jordan_kept_week || 0) + 2
              : !e.done("pivot_alex_door") && s.week >= s.pivot_week + 1),
        },
        choices: [
          {
            key: "talk", label: (s) => s.jordan_kept ? "I'll talk to her about her pace. Properly this time." : "I'll talk to her about her pace.",
            reply: (s) => s.jordan_kept ? "i'll talk to her. properly this time." : "i'll talk to her. tonight.",
            journal: null,
            effects: { scene: "firing", say: { char: "alex", text: "okay." } },
          },
          {
            key: "almost", label: "She's almost there.",
            reply: "she's almost there.",
            journal: "Alex told me the board hasn't moved. I told him she's almost there. He said 'sure', and I don't think he'll bring it up again.",
            effects: { say: { char: "alex", text: "sure." } },
            fx(s) {
              if (!s.jordan_kept) { s.jordan_kept = true; s.jordan_kept_week = s.week; }
              s.jordan_kept_final = true;
              return null;
            },
          },
        ],
        // Left on read, Alex stops asking. She stays.
        timeout: {
          weeks: 3,
          fx(s, e) {
            if (!s.jordan_kept) { s.jordan_kept = true; s.jordan_kept_week = s.week; }
            s.jordan_kept_final = true;
            const alex = e.cast.get("alex");
            alex.morale = clamp(alex.morale - 10, 0, 100);
          },
        },
      },
      {
        // A couple of weeks on: the founders' chat is two people now. The
        // empty chair, said out loud by the person who asked for it to be
        // empty. (Two weeks, not one: the week after the firing is crowded
        // with the rebuild's own calls, and this beat is what fills the
        // quiet stretch before the board lands.)
        id: "founders_first_standup", char: "founders", speaker: "alex",
        text: "two weeks of standups with two of us. still weird.\n\ni keep typing '@j' out of habit.",
        when: {
          if: (s) => !!s.jordan_resolved && s.jordan_fired_week != null && s.week >= s.jordan_fired_week + 2
            && !s.pivot_shipped,
        },
        choices: [
          {
            key: "weird", label: "Weird for me too.",
            reply: "weird for me too. i almost texted her about the board this morning.",
            journal: "Two weeks of standups with two of us. Alex keeps typing '@j' out of habit. So do I.",
            effects: { char: { alex: { morale: 4, trust: 2 } }, say: { char: "founders", speaker: "alex", text: "yeah. okay. board's at the RSVP flow. i'll have it by friday — and i mean friday." } },
          },
          {
            key: "go", label: "Two people, one board. Let's go.",
            reply: "two people, one board. let's go.",
            journal: "Two weeks of standups with two of us. We didn't talk about Jordan. We talked about the board.",
            effects: { char: { alex: { morale: 2 } }, say: { char: "founders", speaker: "alex", text: "board's at the RSVP flow. friday." } },
          },
        ],
        timeout: { weeks: 2 },
      },
      {
        // Jordan's beta-list idea outlives her on the team — it's in her notes
        // if she wrote them, and on the founder's own list if she didn't.
        id: "beta_list_after", char: "founder",
        text: (s) => s.jordan_handoff
          ? "Jordan's notes came in. Most of it is the board — and on the last page, a list: everyone who left the old app, and a two-line email she'd drafted. 'You told us what was wrong. We rebuilt it. Want to see?' Send it before the relaunch?"
          : "The people who left the old app are still on a list somewhere. They're the only ones who already know why v1 failed. Write to them before the relaunch — or relaunch to fresh eyes?",
        when: {
          if: (s, e) => e.chapter === 4 && !!s.jordan_resolved && !s.beta_invited && !e.done("pivot_beta_invite")
            && s.jordan_fired_week != null && s.week >= s.jordan_fired_week + 1,
        },
        choices: [
          {
            key: "invite", label: (s) => s.jordan_handoff ? "Send Jordan's email" : "Write to them",
            journal: (s) => s.jordan_handoff
              ? "Sent Jordan's email to everyone who left: 'you told us what was wrong. we rebuilt it. want to see?' Her idea, her words, sent after she'd gone."
              : "Wrote to everyone who left the old app before the relaunch: we rebuilt it — want to see?",
            effects: { marketFit: 5, flags: { beta_invited: true } },
          },
          {
            key: "fresh", label: "Clean slate — relaunch to fresh eyes",
            journal: "Left the quiet list alone. v2 relaunches to fresh eyes.",
          },
        ],
        timeout: { weeks: 2 },
      },
      {
        // A few weeks on, the outsider checks in — on the rebuild, and on the
        // founder. Her own story lands here, after the decision, not as advice
        // before it: the game never tells the player the answer in advance.
        id: "priya_after_jordan", char: "priya",
        text: (s) => (s.pivot_shipped ? "saw v2 is out. congratulations — it looks like the thing you should have built the first time." : "how's the rebuild?")
          + "\n\nand — how are you doing, after jordan? alex mentioned it.",
        when: {
          if: (s, e) => !!s.jordan_resolved && s.jordan_fired_week != null && s.week >= s.jordan_fired_week + 3
            && s.week <= s.jordan_fired_week + 5,
        },
        choices: [
          {
            key: "honest", label: "Honestly? Not great.",
            reply: (s) => "honestly? not great. " + (s.pivot_shipped ? "v2 shipped faster than anything we've ever built." : "the board's moving faster than it ever did.") + " i still feel like i did something wrong.",
            journal: "Priya asked how I was doing after Jordan. I told her the truth: the work is moving, and I still feel like I did something wrong. She told me about the co-founder she kept a year too long.",
            effects: { say: { char: "priya", text: "that's the right feeling to have about the right call.\n\ni kept a co-founder a year too long once. lovely guy, always one week behind, always a good reason. by the time i said it, he'd heard it from everyone but me. you said it yourself, and early. that's the part that counts." } },
          },
          {
            key: "fine", label: "Heads down. It was the right call.",
            reply: "heads down. it was the right call.",
            journal: "Priya asked how I was doing after Jordan. I said it was the right call. She said it probably was — and that it's allowed to hurt anyway.",
            effects: { say: { char: "priya", text: "it probably was. it's allowed to hurt anyway.\n\ni kept one a year too long once. the year cost more than the conversation would have." } },
          },
        ],
        timeout: { weeks: 2 },
      },
      {
        // The vesting bill. Until the lawyer cleans it up, Marcus's diligence
        // bounces the round (see seed_pitch in story/fundraising.js).
        id: "jordan_cap_table", char: "alex",
        text: (s) => s.jordan_cold_exit
          ? "jordan's " + pctOf(s) + " is still on the cap table — fully vested, no cliff — and she's not answering either of us. any investor who looks at this will ask questions we can't answer. we need a lawyer to talk to her lawyer."
          : "jordan's " + pctOf(s) + " is still on the cap table — fully vested, no cliff. any investor who looks at this will ask questions we can't answer well. we need a lawyer to clean it up.",
        // Recurs until cleaned up — a one-shot card would let a single defer
        // lock the round out permanently.
        // Only once the bill won't sink the company: the firing now lands on
        // the pivot night, when the rebuild has just eaten the runway, and a
        // $2k card there bankrupted otherwise-sound runs. A founder raises
        // the lawyer when the bank can cover it.
        when: {
          cooldown: 4,
          if: (s, e) => s.jordan_resolved && s.jordan_cleanup_needed
            && s.cash >= (s.jordan_cold_exit ? 3500 : 2000) + 2 * e.burnPerWeek,
        },
        choices: [
          {
            key: "lawyer", label: (s) => s.jordan_cold_exit ? "Hire a lawyer — $3,500" : "Hire a lawyer — $2,000",
            payee: "Lawyer",
            journal: (s) => s.jordan_cold_exit
              ? "Hired a lawyer to negotiate Jordan's equity with her lawyer. $3,500 and three weeks of emails, but the buyback is signed. Cap table clean."
              : "Hired a lawyer to clean up Jordan's equity. $2,000, buyback agreement signed. Cap table clean.",
            fx(s) {
              s.cash = Math.max(0, s.cash - (s.jordan_cold_exit ? 3500 : 2000));
              s.jordan_cleanup_needed = false;
              return s.jordan_cold_exit
                ? "Her lawyer made it a negotiation. It closed. Cap table clean."
                : "Lawyer drafted a buyback agreement. Jordan signed for a nominal amount. Cap table clean.";
            },
          },
          {
            // The guilt payment: a cold decision with a price on it.
            key: "keep", label: "Let her keep it — she earned the early part",
            journal: "Decided to let Jordan keep her full stake. It felt like the decent thing. It is also the largest cheque this company will ever write, and it is written to someone who does not work here.",
            effects: { flags: { jordan_cleanup_needed: false, jordan_equity_gifted: true } },
            fx: () => "Left her stake alone. Nothing to clean up now — a departed co-founder simply owns a piece of the company, forever.",
          },
          {
            key: "defer", label: "Can't afford it right now",
            journal: "Can't afford cap table cleanup right now. Every investor who looks will ask about Jordan's stake.",
            fx: () => "Left it for now. Every investor who looks at the cap table will ask about Jordan's stake.",
          },
        ],
        timeout: { weeks: 3 },
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.STORY = window.STORY || []).push(mod);
})();
