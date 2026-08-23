// ─────────────────────────────────────────────────────────────────────────────
// story/slide.js — the slide (weeks L+1..L+3): three weeks of gravity after
// launch day's high, plus the pre-launch evidence sources that pivot day will
// cash in. Two competing diagnoses of the same flat graph — Alex's density
// thesis vs the retention failure. Evidence banked here becomes the chip
// options at the summit:
//   maya   ← slide_maya_call:call        (s.maya_quote)
//   rachel ← slide_first_echo:reply_honest (s.rachel_answer)
//   demo   ← demo_first_message:note     (s.demo_question_seen, demo_night.js)
//   circle ← post_match_dropoff:dig      (s.analytics_dropoff_seen)
//   fixes  ← the failed-fix loop         (s.funnel_first / feature_spree / winback_flat)
// The trough is mechanical (world.js drains users toward a floor pre-pivot), so
// the desperation loop — traffic push, feature spree, win-back blast — plays as
// attempt → visible failure; each failure is itself summit evidence. Also here:
// Priya's two ways in (the meetup or the launch).
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const mod = {
    nodes: [

      // ── PRIYA'S EARLY ROUTE: the founder meetup ──────────────────────────────
      {
        id: "founder_meetup", char: "founder", ambient: true,
        text: (s) => s.week >= 8
          ? "the monthly founder meetup for consumer social and dating apps is this week. same community, different conversations."
          : "there's a meetup for founders building in the consumer social and relationships space — a dozen people building adjacent things. you haven't been to one of these in months.",
        when: {
          cooldown: 2,
          if: (s) => !!s.jordan_equity && !s.met_priya
            && ((s.week >= 2 && s.week <= 6) || (s.week >= 8 && s.week <= 11)),
        },
        choices: [
          {
            key: "go", label: "Go to the meetup",
            journal: "Went to the founder meetup. Good crowd. Long talk with Priya — she launched a consumer app years ago, has strong opinions on retention, and seemed genuinely curious about what we're building.",
            effects: { signal: 4, marketFit: 3 },
            fx(s) {
              s.met_priya = true;
              s.met_priya_week = s.week;
              return "Good crowd. You talked to a few people building in adjacent spaces. Had a long conversation with Priya — she launched a consumer app a few years ago, has strong opinions on retention, and seemed genuinely interested in what you're working on.";
            },
          },
        ],
        timeout: { weeks: 2 }, // skipped this month; the cooldown re-offers within the windows
      },
      {
        // Deliberately ungated on signal: this card is the sole key to the
        // advisor network that unlocks the investors, and a well-played early
        // game routinely pushes signal high before Priya unlocks — a signal
        // ceiling here would dead-lock the entire fundraising arc.
        id: "mentor_competitor_bomb", char: "priya",
        text: "looked at your idea over the weekend. you should know: there are at least 8 serious relationship apps in the app store right now — two well-funded. one is YC-backed from last year. you need a sharper answer to 'why plusone.'",
        when: { if: (s) => s.week <= 16 },
        choices: [
          {
            key: "research", label: "Do a competitive deep-dive",
            journal: "Spent the weekend doing a full competitive analysis. Eight serious dating apps, two well-funded, one YC-backed. None of them solve it the way we do — that's our wedge. Priya's officially advising now.",
            effects: { signal: 8, marketFit: 6, flags: { priya_advising: true } },
            fx: () => "Did a full competitive analysis. None of them solve it for your niche. That's your wedge. Priya is now a real advisor.",
          },
        ],
        timeout: {
          weeks: 3,
          effects: { signal: -8 },
          say: { char: "priya", text: "any progress on differentiating from the competition? investors will definitely ask." },
        },
      },

      // ── PRE-LAUNCH EVIDENCE: the analytics drop-off & Jordan's flag ──────────
      {
        // Only exists if analytics were BOUGHT — sight, before a single stranger
        // signs up. This is the "circle" chip on pivot day.
        id: "post_match_dropoff", char: "analytics", from: "Analytics",
        text: "first real pattern out of the analytics. the testflight group is tiny — a dozen people, 14 matches between them since the demo build went out. 11 of those matches never got past 'hey.' small numbers, but the pattern is loud: it's not the matching that loses people, it's what comes after a match. there's nowhere for them to go.",
        when: { if: (s) => s.analytics_live && s.has_demo && !s.launched },
        choices: [
          {
            key: "dig", label: "Dig into the drop-off",
            journal: "Pulled the test group's numbers apart. Matches that never become conversations, conversations that never become dates — twelve people is a small sample and an unambiguous one. The analytics paid for themselves before launch: I can see the pivot from here.",
            effects: { marketFit: 8, signal: 4, flags: { analytics_dropoff_seen: true } },
            fx: () => "Pulled the test group's numbers apart. The story's unambiguous even at twelve people — matches that never become conversations, conversations that never become dates. You can see the pivot from here, with time to act on it before a single stranger signs up.",
          },
        ],
        // Even unread, the number exists — the chip is banked either way (old behavior).
        timeout: { weeks: 3, effects: { flags: { analytics_dropoff_seen: true } } },
      },
      {
        // Jordan flags the circle pattern before launch — pure foreshadowing.
        // Answering banks her receipt; ignoring just means walking into pivot
        // day without it. No re-nag: launch prep swallows the conversation.
        id: "pivot_open", char: "jordan",
        text: (s) => s.demo_question_seen
          ? "been going through the testflight group's feedback. remember demo night — 'so what happens now?' it wasn't a one-off. three more people in the group used almost the same phrase: 'i matched, but then what?' they're not complaining about the matching — they want somewhere to go. thought i'd flag it before we get closer to launch."
          : "been going through the testflight group's feedback. three of them independently used almost the same phrase: 'i matched, but then what?' they're not complaining about the matching — they want somewhere to go. could be noise. thought i'd flag it before we get closer to launch.",
        when: { if: (s) => s.activities_cut && s.has_demo && s.market_fit >= 5 && !s.launched },
        choices: [
          {
            key: "open", label: "Good flag — write it down verbatim",
            reply: "write it down, word for word. 'i matched, but then what.' if it's still true with strangers, we'll know exactly where to look.",
            journal: "Jordan flagged a pattern from the TestFlight group: people keep saying 'I matched, but then what?' Wrote it down verbatim. Launch will tell us if it's noise or the whole story.",
            effects: { flags: { pivot_flagged: true } },
            fx: () => "Written down, word for word. If strangers say it too, you'll know where to look.",
          },
        ],
        timeout: { weeks: 3 }, // buried by launch prep — the receipt is just missing later
      },

      // ── THE SLIDE, WEEK BY WEEK ──────────────────────────────────────────────
      {
        id: "slide_hangover", char: "alex",
        text: (s) => s.launch_splash === "show_hn"
          ? "morning-after math. the front page got us to " + Math.max(4, s.users) + " accounts and the graph looked incredible for a day. then i read the profiles: half list 'github' under interests, most have no photo. hacker news signed up to admire the matching engine, not to date. the number that actually matters is how many of them come back. i'll have a real answer friday."
          : "morning-after math. we ended launch week at " + Math.max(4, s.users) + " accounts. day one was the spike — yesterday 6 new, today 2. some comedown is normal: the launch push is spent, that traffic was never going to repeat. the number that actually matters is how many of them come back. i'll have a real answer friday.",
        when: { took: [["good_enough_launch:ship", "jordan_launch_blocker:web_only", "jordan_launch_blocker:@ignored"]], delay: 2, if: (s) => !s.activities_pivot },
        choices: [
          {
            key: "retention", label: "Watch retention, not signups",
            reply: "agreed — ignore the top of the funnel for now. friday, i want to know who came back.",
            journal: "Week one post-launch. The day-one spike is over. Told Alex the only number I care about is who comes back on Friday — retention, not signups.",
            effects: {
              signal: 2, say: { char: "alex", text: "that's the correct question. most founders ask the other one." },
              schedule: [
                { in: 1, char: "analytics", unless: (s) => !s.analytics_live || s.pivot_summit_done,
                  say: { char: "analytics", from: "Analytics", text: (s) => "weekly pulse: " + Math.max(2, Math.round(s.users * 0.4)) + " of " + Math.max(3, s.users) + " accounts opened the app this week. down again. the line only bends one way right now." } },
                { in: 2, char: "analytics", unless: (s) => !s.analytics_live || s.pivot_summit_done,
                  say: { char: "analytics", from: "Analytics", text: (s) => "weekly pulse: " + Math.max(3, s.users) + " accounts left active. matches still happen; conversations still don't. whatever this is, more weeks of it won't change the shape." } },
              ],
            },
            fx: () => "Friday it is. Whoever comes back is the real launch number.",
          },
          {
            key: "funnel", label: "We need another traffic push",
            reply: "2 a day won't cut it. we need another traffic push this week.",
            journal: "Told Alex to run another traffic push. It netted five signups and cost two days — and a week later the graph had swallowed them whole. The lesson was loud: the leak isn't at the top of the funnel.",
            effects: {
              users: 5, flags: { funnel_first: true },
              say: { char: "alex", text: "ran the re-blast plus a post in two local subreddits. five signups. cost us two days. the leak isn't at the top." },
              schedule: [
                { in: 1, char: "alex", unless: (s) => s.pivot_summit_done,
                  say: { char: "alex", text: "the re-blast bump is gone. every one of those five signups matched, said hey, and went quiet. we poured water into a bucket we haven't patched." } },
                { in: 1, char: "analytics", unless: (s) => !s.analytics_live || s.pivot_summit_done,
                  say: { char: "analytics", from: "Analytics", text: (s) => "weekly pulse: " + Math.max(2, Math.round(s.users * 0.4)) + " of " + Math.max(3, s.users) + " accounts opened the app this week. the traffic push shows up as a one-week blip, already fading." } },
              ],
            },
            fx: () => "Five signups for two days of work. The leak isn't at the top.",
          },
        ],
        timeout: { weeks: 2 },
      },
      {
        // Support inbox: the demo-night question comes back from a stranger.
        // Replying personally banks Rachel's answer — the "rachel" chip.
        id: "slide_first_echo", char: "users", from: "Support inbox",
        text: "support email, forwarded by alex: \"hi! i matched with two people this week. we both said hi. now the app just… shows me the same two chats. am i missing a feature? is something supposed to happen next? — rachel k.\"",
        when: { took: [["good_enough_launch:ship", "jordan_launch_blocker:web_only", "jordan_launch_blocker:@ignored"]], delay: 2, if: (s) => !s.activities_pivot },
        choices: [
          {
            key: "reply_honest", label: "Write her back yourself",
            journal: "Rachel K. emailed support: 'is something supposed to happen next?' I wrote back myself and asked what she'd hoped would happen. Her answer, word for word: 'I hoped the app would give one of us an excuse. A place to say yes to.' Kept it.",
            effects: { signal: 3, marketFit: 3, flags: { rachel_answer: true } },
            fx: () => "You wrote back: 'You're not missing anything — tell me what you hoped would happen?' Rachel's answer, verbatim: 'Honestly? I hoped the app would give one of us an excuse. A place to say yes to.' That one goes in the file.",
          },
          {
            key: "faq", label: "Add it to the FAQ pile",
            journal: "A user asked what's supposed to happen after a match. Sent the standard answer — 'check back as more people join.' The just-wait-for-more-users answer, given without thinking.",
            fx: () => "Filed under FAQ: 'check back as more people join.' The just-wait-for-more-users answer, given without thinking.",
          },
        ],
        timeout: { weeks: 2 },
      },
      {
        // The slide's Friday number: the week-one cohort, delivered cold. Only
        // exists if the player bought analytics — without it, Friday is just a
        // feeling, and pivot day's evidence beat runs hollow.
        id: "slide_cohort", char: "analytics", from: "Analytics",
        text: (s) => {
          const total = Math.max(8, s.users);
          const matches = Math.max(10, Math.round(total * 1.4));
          const opened = Math.max(3, Math.round(total * 0.26));
          const convos = Math.max(2, Math.round(matches * 0.13));
          return "week-one numbers are in. of " + total + " launch-week signups, " + opened + " opened the app this week. " + matches + " matches made since launch; " + convos + " conversations got past two messages; actual dates planned: 0. same pattern as the testflight group — just bigger.";
        },
        when: { took: [["good_enough_launch:ship", "jordan_launch_blocker:web_only", "jordan_launch_blocker:@ignored"]], delay: 3, if: (s) => s.analytics_live && !s.activities_pivot },
        choices: [
          {
            key: "dig", label: "Sit with the numbers",
            journal: "Friday. The week-one numbers came in and it's the TestFlight group's pattern, just bigger: matches happen, conversations don't, dates — zero. It's not that we don't know. It's that the number is now too big to un-know.",
            effects: { marketFit: 4, signal: 2, flags: { cohort_seen: true } },
            fx: () => "You sat with the numbers until the pattern stopped being deniable: people don't leave before the match. They leave right after it.",
          },
        ],
        timeout: { weeks: 2 },
      },
      {
        // Alex's rationalization of the flat graph — and it's *good*. The classic
        // cold-start read. The counter-option only exists with banked evidence.
        id: "slide_alex_thesis", char: "alex",
        text: (s) => {
          const base = "before anyone panics: we have " + Math.max(5, s.users) + " users. with " + Math.max(5, s.users) + " users, everyone gets shown the same three faces and an empty screen — of course they leave. the problem isn't the app, it's the empty room. the fix is more people: the mixer, referrals, flyers where our users actually hang out. you don't rewrite the menu because the restaurant is empty.";
          return s.funnel_first
            ? base + " and monday you were the one asking for more signups — so part of you already agrees with me."
            : base;
        },
        when: { after: ["slide_hangover"], if: (s) => !s.activities_pivot && !s.pivot_summit_done },
        choices: [
          {
            key: "hear_him", label: "Fair read — draft the growth plan",
            reply: "it's a fair read. get me the growth plan — but i'm watching what happens *after* a match, not just how many we make.",
            journal: "Alex made his case: too few users for matching to work — fill the room before you blame the menu. It's a fair read. I asked for the growth plan — and I'm watching what happens after a match.",
            fx: () => "He's drafting the growth plan. You're watching the after-match numbers.",
          },
          {
            key: "push_back", label: "Our test group was a full room",
            if: (s) => s.analytics_dropoff_seen || s.demo_question_seen,
            reply: "our testflight group was twelve people who all knew each other — a full room, by your own logic. 11 of their 14 matches still went nowhere. explain that.",
            journal: "Alex blamed the empty room and I hit him with the TestFlight group: twelve people who all knew each other, and 11 of 14 matches still went nowhere. He didn't have an answer. First crack in the wall.",
            effects: {
              flags: { alex_crack: true },
              say: { char: "alex", text: "…i don't have a clean answer to that one. friday's numbers will tell us." },
            },
            fx: () => "He went quiet, then honest: no clean answer. Friday's numbers will tell.",
          },
        ],
        timeout: {
          weeks: 2,
          say: { char: "alex", text: "taking the silence as agreement — starting on the growth plan. if you disagree, now's the time." },
        },
      },
      {
        id: "slide_priya_ping", char: "priya",
        text: (s) => s.met_priya
          ? "saw the launch — congrats, genuinely. that's the part most people never do. real talk though: how's week two? and i mean retention, not signups. those are different numbers and only one of them is real."
          : "so — the coffee offer was half social. the real question: how's week two treating you? and i mean retention, not signups. those are different numbers and only one of them is real.",
        when: { took: [["good_enough_launch:ship", "jordan_launch_blocker:web_only", "jordan_launch_blocker:@ignored"]], delay: 3, if: (s, e) => e.chapter === 3 },
        choices: [
          {
            key: "real_numbers", label: "Give her the real numbers",
            reply: "honestly? day one was great and it's been gravity ever since. matches happen, then nothing.",
            journal: "Priya asked about week two — retention, not signups. I gave her the real answer: matches happen, then nothing. She said 'then nothing' is the whole ballgame, and offered to clear a Saturday.",
            effects: { say: { char: "priya", text: "'then nothing' is the whole ballgame. when you're ready to take that seriously, i'll clear a saturday." } },
            fx: () => "'Then nothing' is the whole ballgame, she said. She's ready to clear a Saturday.",
          },
          {
            key: "deflect", label: "Still reading the data",
            reply: "still reading the data. early days.",
            journal: "Priya asked about week-two retention and I deflected — 'still reading the data.' Her reply landed anyway: data doesn't read itself. The offer stands.",
            effects: { say: { char: "priya", text: "sure. data doesn't read itself though. offer stands." } },
            fx: () => "She didn't push. 'Data doesn't read itself though. Offer stands.'",
          },
        ],
        timeout: { weeks: 2 },
      },
      {
        // The human beat — call the first churned user. Banks the "maya" chip.
        id: "slide_maya_call", char: "founder",
        text: "Maya — the first signup, launch day, Jordan watched her fill out her profile live — hasn't opened the app in 9 days. She matched with three people in week one. You have her number.",
        when: { took: [["good_enough_launch:ship", "jordan_launch_blocker:web_only", "jordan_launch_blocker:@ignored"]], delay: 3, if: (s) => !s.activities_pivot },
        choices: [
          {
            key: "call", label: "Call her",
            journal: "Called Maya. She was nice about it, which somehow made it worse. 'The matching was honestly good? I matched with a guy who seemed great. We said hey. And then it was just… a chat window. I already have seven dead chat windows on Hinge. I deleted PlusOne because it made me feel worse, not better.'",
            effects: { marketFit: 4, signal: 3, flags: { maya_quote: true } },
            fx: () => "Maya picked up. She was nice about it, which made it worse: 'The matching was honestly good. I matched with a guy who seemed great. We said hey. And then it was just… a chat window. I already have seven of those on Hinge. PlusOne made me feel worse, not better.' You wrote down every word.",
          },
          {
            key: "survey", label: "Send an email survey",
            journal: "Sent Maya (and the other quiet accounts) a churn survey. Two replies, both polite, nothing quotable. Surveys get answers; calls get the truth.",
            effects: { marketFit: 1 },
            fx: () => "Two survey replies, both polite, nothing quotable. Surveys get answers; calls get the truth.",
          },
          {
            key: "let_go", label: "Churned users churn — focus forward",
            journal: "Decided not to chase Maya. Churned users churn. Focus forward.",
            fx: () => "Focused forward. Whatever Maya knew about why she left, she took with her.",
          },
        ],
        timeout: { weeks: 2 },
      },
      {
        // The person who flagged it, watching it come true. Deliberately quiet.
        id: "slide_jordan_echo", char: "jordan", ambient: true,
        text: "not my lane anymore maybe. but i've been lurking the support inbox. 'i matched, but then what' — that's the test group's feedback again, word for word, from strangers this time. same shape. anyway.",
        when: { took: [["good_enough_launch:ship", "jordan_launch_blocker:web_only", "jordan_launch_blocker:@ignored"]], delay: 3, if: (s, e) => e.chapter === 3 },
        choices: [
          {
            key: "ack", label: "You called it first",
            reply: "you called it first — that's on the record. it's on the agenda, for real this time.",
            effects: { flags: { pivot_flagged: true }, char: { jordan: { morale: 4 } } },
            fx: () => "Jordan called it before launch and she's calling it again now. On the record.",
          },
        ],
        timeout: { weeks: 2 },
      },
      {
        // The post-launch flailing trap: throw features at the graph. Saying yes
        // ships noise; the right call holds the roadmap until you know why users
        // leave. (Scored: "Features Won't Save You".)
        id: "feature_spree", char: "alex",
        text: "signups are flat and i keep staring at the graph. i could bang out icebreaker prompts, streaks, read receipts — pick one and it's live by friday. something will stick, right?",
        when: { took: [["good_enough_launch:ship", "jordan_launch_blocker:web_only", "jordan_launch_blocker:@ignored"]], delay: 3, if: (s, e) => e.chapter === 3 && s.users >= 3 },
        choices: [
          {
            key: "spree", label: "Pick one and ship it — something will stick",
            reply: "pick one and ship it. motion beats meetings.",
            journal: "Let Alex ship streaks by Friday. It was live, it was shiny, and the graph didn't move. We're guessing.",
            effects: {
              marketFit: -6, signal: -4, flags: { feature_spree: true },
              schedule: { in: 1, char: "alex", say: { char: "alex", text: "streaks is live. daily active streak users: 1. it's me." } },
            },
            fx: () => "Streaks shipped by Friday. A handful of users tapped it once. The graph didn't move — you're not learning, you're guessing.",
          },
          {
            key: "no", label: "Nothing new ships until we know why they leave",
            journal: "Told Alex nothing new ships until we know why users leave. He grumbled, then admitted the streaks idea was a dice roll.",
            effects: { marketFit: 4, char: { alex: { morale: -4 } } },
            fx: () => "You held the line: no new features until you know why users leave. Alex grumbled, then admitted the streaks idea was a dice roll.",
          },
        ],
        timeout: {
          weeks: 2,
          // The moment can pass two ways: the player went quiet (Alex ships
          // streaks into the void) or the pivot got decided first (the spree
          // question is moot — no consequence).
          unless: (s) => s.activities_pivot || s.pivot_summit_done,
          effects: { marketFit: -4, flags: { feature_spree: true } },
          say: { char: "alex", text: "went ahead and shipped streaks while you were quiet. a few taps, then nothing. the graph didn't move." },
        },
      },
      {
        // The third desperate fix: beg the quiet accounts to come back. Like the
        // traffic push, trying it isn't punished — the failure IS the finding
        // (s.winback_flat), and it plays at the summit as the "fixes" chip.
        id: "win_back_blast", char: "users", from: "The quiet accounts",
        text: (s) => "the dashboard splits your users into 'active' and 'quiet' and the quiet column is winning. " + Math.max(6, s.users + 8) + " people signed up, matched, and stopped opening the app. you could send the win-back email — 'we miss you, here's what's new' — tonight.",
        when: { took: [["good_enough_launch:ship", "jordan_launch_blocker:web_only", "jordan_launch_blocker:@ignored"]], delay: 3, if: (s, e) => e.chapter === 3 },
        choices: [
          {
            key: "blast", label: "Send the win-back email tonight",
            journal: "Sent the win-back email to every quiet account. A third opened it, a handful came back, and by the next week they'd all gone quiet again — same spot, right after the match. The email worked. The product didn't. That's not a marketing finding, that's a verdict.",
            effects: {
              users: 4, flags: { winback_flat: true },
              schedule: {
                in: 1, char: "users", unless: (s) => s.pivot_summit_done,
                say: { from: "The quiet accounts", text: "win-back, one week later: everyone the email brought back has gone quiet again. same spot — right after the match. they came back to the exact wall they left over." },
              },
            },
            fx: () => "The email went out to every quiet account. A third opened it. A handful reinstalled. Watch what happens next week.",
          },
          {
            key: "skip", label: "Don't beg — fix the reason they left",
            reply: "no. if we don't know why they left, 'we miss you' is just asking them to leave twice.",
            journal: "Skipped the win-back email. If we don't know why they left, 'we miss you' is just asking them to leave twice. The sends can wait until there's something new to come back to.",
            effects: { marketFit: 3 },
            fx: () => "No blast. Whatever brings them back, it won't be an apology email for the same product.",
          },
        ],
        timeout: { weeks: 2 },
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.STORY = window.STORY || []).push(mod);
})();
