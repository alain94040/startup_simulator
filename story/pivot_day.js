// ─────────────────────────────────────────────────────────────────────────────
// story/pivot_day.js — the pivot night: one group thread, one question, and the
// co-founder conversation it leads to. Chapter 3's climax and chapter 4's
// human one, in a single sitting.
//
// The door is a Hail Mary, not a founder card: a month into the trough, Alex
// wants to spend the money on a growth push (pivot_hail_mary). Saying yes is
// the default — the big decision is to STOP a confident co-founder long enough
// to ask a question nobody has asked. Holding him starts a group thread with
// Alex, Jordan and Priya (cast.js `summit`) and enters the "pivot" scene.
//
// The sitting, all over chat (full script: final_arc_draft.html):
//   1. The round-table. The player runs the meeting, calling on each of the
//      three in turn — one tap, one voice, so the group never floods.
//   2. The dig. Taking Alex's plan ends the night without the pivot; plain
//      curiosity (ask Alex for his best matches, or ask Priya why people
//      leave) leads down the hole: the best matches die at 'hey', Maya had
//      nothing to DO, and one tap at a time Priya names the cause, Jordan
//      names the product, and Alex cancels his own push.
//   3. The call (pivot_day_decide): pivot, or flinch into growth.
//   4. Who builds it. Alex asks, and Jordan claims the board — the screen v2
//      lives on — before the founder can answer, with a promise. Priya's
//      goodnight carries a quiet doubt; Alex answers Jordan's offer with a 👍
//      and then DMs the founder: the door to the Jordan question
//      (pivot_alex_concern). Nothing on it says "fire".
//   5. "I'll talk to her." opens Jordan's thread — the ladder and the firing,
//      built by story/jordan_talk.js. Every way of not finishing the sentence
//      keeps her (she builds the board at her part-time pace, world.js), and
//      Alex opens the door one last time two weeks later (story/jordan_arc.js).
//
// Aftermath — the Ch 4 rebuild, on screen: pivot_scope_call, pivot_beta_invite,
// pivot_relaunch (ship v2 once the matching AND the board are done),
// pivot_fifty_verdict (the one redemption card for a growth call),
// pivot_payoff_maya (the bookend).
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const JT = typeof require !== "undefined" ? require("./jordan_talk.js") : window.JORDAN_TALK;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const SCOPE_ITEMS = ["scope_social", "scope_verification", "scope_premium", "scope_socialgraph", "scope_video"];
  function applyActivitiesPivot(s) {
    if (!s.items) return;
    // Cross out the items built for profile-based matching.
    if (s.items.matching_algo) s.items.matching_algo.status = "obsolete";
    if (s.items.ios_ui) s.items.ios_ui.status = "obsolete";
    SCOPE_ITEMS.forEach(k => {
      if (s.items[k] && s.items[k].status === "todo") s.items[k].status = "obsolete";
    });
    // Licensing the core (Jordan's call) bites here: a black box can't be
    // re-tuned — it's ripped out and rebuilt, costing extra cash and fit.
    if (s.matching_licensed && !s.matching_blackbox_ripped) {
      s.matching_blackbox_ripped = true;
      s.cash = Math.max(0, s.cash - 1500);
      s.market_fit = clamp(s.market_fit - 10, 0, 100);
    }
    // Alex repoints the matching; the board belongs to whoever claims it —
    // Jordan, on pivot night (the rebuild clock is in world.js).
    s.items.plans_matching = { status: "active", quality: null, assignee: "alex" };
    s.items.plans_ui = { status: "todo", quality: null, assignee: "jordan" };
  }

  // Alex's growth push, taken — from the door, the round-table, the dig, or a
  // flinch at the call. The default direction wins; Priya's fifty-match tally
  // (pivot_fifty_verdict) is the one way back.
  function growthPath(s, e) {
    s.pivot_summit_done = true;
    s.pivot_choice = "growth";
    s.pivot_deferred = true;
    s.pivot_growth_week = s.week;
    s.cash = Math.max(0, s.cash - 1500);
    s.signal = clamp(s.signal + 4, 0, 100);
    const alex = e.cast.get("alex");
    alex.morale = clamp(alex.morale + 6, 0, 100);
    e.schedule({
      in: 2, char: "alex", unless: (st) => st.activities_pivot,
      effects: { users: 20 },
      say: { char: "alex", text: "mixer report: 40 rsvps, 19 showed, 11 installed on the spot. good night, honestly. i'm watching the after-match numbers like a hawk." },
    });
  }

  // ── the round-table ─────────────────────────────────────────────────────
  // Each voice's opening case, spoken in the group the moment the founder
  // calls on them.
  const CASE = {
    priya: () => "retention, not signups. the people who come don't stay — even the ones who matched.\n\ni don't know why yet. and neither do you. that's the problem with spending the $1,500.",
    jordan: () => "honestly? it looked like it was working. maya signed up, filled out everything, matched in an hour.\n\n…and then i kind of stopped watching. i figured the hard part was done.",
  };
  const CALL_ON = {
    priya: { label: "Priya — what do you see?", reply: "priya — what do you see from the outside?" },
    jordan: { label: "Jordan — you watched launch day.", reply: "jordan, you watched launch day closer than anyone. what did you see?" },
  };
  const asked = (s) => s.pivot_asked || [];
  // The call-on chips, minus whoever has already spoken — Alex made his case
  // in the opener, so it's Priya and Jordan. `branch`: which chips are left
  // is a fact of the meeting, not something earned. Alex's plan stays on the
  // table beside them, so no beat of the meeting is a forced tap.
  const callOnChoices = (first) => ["priya", "jordan"].map(who => ({
    key: who, label: CALL_ON[who].label, branch: true,
    if: (s) => !asked(s).includes(who),
    reply: (s) => (first ? "thanks for jumping on, everyone. " : "") + CALL_ON[who].reply,
    journal: null,
    fx(s) { s.pivot_asked = asked(s).concat(who); return null; },
  }));
  const speakerAt = (i) => (s) => asked(s)[i];
  const caseAt = (i) => (s, e) => CASE[asked(s)[i]](s, e);

  // The growth exits close the room with Priya's number, as the old summit did.
  const takeGrowth = (key, label, reply) => ({
    key, label, reply, journal: null,
    fx(s, e) { growthPath(s, e); return null; },
  });

  const mod = {
    arcs: [
      {
        id: "pivot",
        // The group thread is the meeting; Alex's and Jordan's DMs are where
        // the things nobody says in front of the group get said; the founders'
        // chat is where it ends.
        scene: { cast: ["founders", "summit", "alex", "jordan"] },
        beats: [
          // ── 1 · the round-table ──────────────────────────────────────────
          {
            // The thread opens on the context, not a blank room: Alex's pitch
            // lived in the founders' chat, so he restates it for Priya — and
            // makes his case while he's at it. The player lands knowing what
            // the meeting is about, and that it's theirs to run.
            id: "pivot_roundtable", char: "summit", speaker: "alex",
            text: (s) => "ok, everyone's here. context for priya: i want $1,500 of what's left for a growth push — mixer at the climbing gym, referral codes, flyers on three campuses. the gym holds the slot till midnight.\n\nmy case: the room's empty. " + Math.max(5, s.users) + " users. anyone would leave an empty app. 300 users and we'll know if anything's actually broken.\n\nbut it's your meeting.",
            when: { took: ["pivot_hail_mary:hold"] },
            choices: callOnChoices(true).concat([
              takeGrowth("users", "Alex is right — book the gym.", "you're right. the room's empty. book the gym."),
            ]),
          },
          {
            id: "pivot_round_2", char: "summit", speaker: speakerAt(0),
            text: caseAt(0),
            when: { took: ["pivot_roundtable:priya|jordan"] },
            choices: callOnChoices(false).concat([
              takeGrowth("users", "Enough — book the gym.", "i've heard enough. the room's empty. book the gym."),
            ]),
          },
          {
            // ── 2 · the dig ───────────────────────────────────────────────
            // One way to stop here, two ways down: Alex's plan, or plain
            // curiosity about his numbers or Priya's symptom.
            id: "pivot_fork", char: "summit", speaker: speakerAt(1),
            text: caseAt(1),
            when: { took: ["pivot_round_2:priya|jordan"] },
            choices: [
              takeGrowth("users", "Alex is right — get the users.", "alex is right. the room's empty. book the gym."),
              {
                key: "dig_alex", label: "Wait. Alex — pull the best matches. What happened to them?",
                reply: "wait. before we decide — alex, pull our best matches. the ones that should have worked. what happened to them?",
                journal: null,
              },
              {
                key: "dig_priya", label: "Priya — why don't they stay?",
                reply: "priya, you said even the ones who matched don't stay. why?",
                journal: null,
                effects: { say: { char: "summit", speaker: "priya", text: "i don't know. but alex does, he just hasn't looked. alex — pull your best matches. the ones that should have worked." } },
              },
            ],
          },
          {
            id: "pivot_dig", char: "summit", speaker: "alex",
            text: (s) => s.analytics_live
              ? "…give me a minute.\n\nokay. eleven best matches since launch. both people liked each other, both still had the app.\n\nten of them: match → 'hey' → 'hey' → nothing."
              : "we never set up analytics, so this is me reading raw logs. give me a minute.\n\nokay. our best matches since launch — both people liked each other, both still had the app.\n\nalmost all of them: match → 'hey' → 'hey' → nothing.",
            when: { took: ["pivot_fork:dig_alex|dig_priya"] },
            choices: [
              takeGrowth("users", "Still an empty room. Book the gym.", "that's still an empty room. people get bored when there's nobody around. book the gym."),
              {
                key: "jordan_maya", label: "Jordan — what did Maya do after she matched?",
                reply: "jordan. maya. what did she do after she matched?",
                journal: null,
              },
              {
                key: "maya_quote", label: "Maya told me herself.",
                if: (s) => !!s.maya_quote,
                reply: "i called maya last month. her words: 'it was just a chat window. i already have seven of those. plusone made me feel worse.'",
                journal: null,
              },
            ],
          },
          {
            // ── the eureka, one tap, one voice ─────────────────────────────
            id: "pivot_maya", char: "summit", speaker: "jordan",
            text: (s, e) => e.took("pivot_dig:maya_quote")
              ? "…that's exactly what i watched on launch day. she matched with a guy she liked, and the app gave her a chat box and walked away."
              : "…nothing. she didn't do anything. there was nothing TO do.\n\nshe matched with a guy she liked, and the app gave her a chat box and walked away.",
            when: { took: ["pivot_dig:jordan_maya|maya_quote"] },
            // Two ways to the same insight: hand it to Priya, or say it
            // yourself — the founder can be the one who connects it.
            choices: [
              { key: "is_it", label: "Priya — is that it?", reply: "priya. is that it?", journal: null },
              {
                key: "name_it", label: "The match works — it's what comes after",
                reply: "wait. so the matching isn't broken. the match works — it's what comes after the match that's missing.",
                journal: null,
              },
            ],
          },
          {
            id: "pivot_cause", char: "summit", speaker: "priya",
            text: (s, e) => (e.took("pivot_maya:name_it") ? "exactly. you just said it." : "that's it.")
              + " you don't have a matching problem. you have an 'and then what' problem.\n\nnobody knows what to say after 'hey'. so give them something to say yes to.",
            choices: [
              { key: "look", label: "Jordan — what would that look like?", reply: "jordan — what would that look like? something to say yes to.", journal: null },
              {
                // The tempting half-measure, which Priya shuts down on the spot.
                key: "tab", label: "So we add an events tab?",
                reply: "so we add an events tab? plans people can join?",
                journal: null,
                effects: { say: { char: "summit", speaker: "priya", text: "no. every dying dating app bolts on an events tab, and users can smell it. don't add plans to the app. make the plan the app." } },
              },
            ],
          },
          {
            id: "pivot_idea", char: "summit", speaker: "jordan",
            text: (s, e) => (e.took("pivot_cause:tab") ? "so you don't browse people at all. you browse plans. " : "a plan. ")
              + "thursday, climbing gym, six people, two spots.\n\nyou don't message a stranger. you just tap 'i'm in'.",
            choices: [
              { key: "alex", label: "Alex?", reply: "alex?", journal: null },
              { key: "that_it", label: "That's the product.", reply: "that's it. that's the product.", journal: null },
            ],
          },
          {
            // ── 3 · the call ────────────────────────────────────────────────
            id: "pivot_day_decide", char: "summit", speaker: "alex",
            text: (s) => "…so the $1,500 would have paid for 300 more people to get stuck at 'hey'.\n\ncancel the gym.\n\n"
              + (s.matching_licensed
                ? "bad news: matchkit can't do this. it matches singles, that's all it does, and we can't touch its insides. it has to come out."
                : "good news: the matching engine survives. picking people for a plan is the same math. what has to go is every screen."),
            choices: [
              {
                key: "pivot", label: "We pivot. You browse plans, not people.",
                reply: "we pivot. you browse plans, not people. monday we start building it.",
                journal: "The pivot night. I stopped Alex's growth push and got everyone on one thread. We dug until it was obvious: the best matches die at 'hey', because the app gives people nothing to say yes to. We pivot — you browse plans, not people. Three weeks, $2k.",
                fx(s, e) {
                  s.pivot_summit_done = true;
                  s.pivot_choice = "pivot";
                  s.activities_pivot = true;
                  s.pivot_week = s.week;
                  // The room got there together — Alex cancelled his own push.
                  s.alex_converted = true;
                  s.evidence_chip = e.took("pivot_dig:maya_quote") ? "maya" : "dig";
                  s.cash = Math.max(0, s.cash - 2000);
                  s.market_fit = clamp(s.market_fit + 15, 0, 100);
                  applyActivitiesPivot(s);
                  const jordan = e.cast.get("jordan");
                  if (jordan.active) jordan.morale = clamp(jordan.morale + 5, 0, 100);
                  e.say({ char: "summit", speaker: "alex", text: "ok. if we're doing this: three weeks, no slack, no second try.\n\ni'll repoint the matching. who wants the board — the screen people actually see?" });
                  return null;
                },
              },
              {
                key: "growth", label: "Too risky. Get users first, then rebuild.",
                reply: "it's a good idea. it's also a rebuild on what's left in the bank. users first, then we rebuild.",
                journal: null,
                fx(s, e) { growthPath(s, e); return null; },
              },
            ],
          },
          {
            // Every growth exit closes the room here, with Priya's number.
            id: "pivot_close_growth", char: "summit", speaker: "priya",
            text: "okay, it's your call. do one thing for me: keep count. of the next 50 matches, how many actually make plans to meet up?\n\nif the answer is zero, more users won't fix it. the app itself is the problem, and you change it. deal?",
            when: { took: [["pivot_roundtable:users", "pivot_round_2:users", "pivot_fork:users", "pivot_dig:users", "pivot_day_decide:growth"]] },
            choices: [
              {
                key: "deal", label: "Deal.",
                reply: "deal. goodnight, everyone.",
                journal: "The pivot night. I got everyone on one thread, heard them out — and sided with Alex's growth push. Priya left me one number to watch: of the next 50 matches, how many turn into a plan to meet.",
                effects: { scene: null, say: { char: "summit", system: true, text: "Priya left the conversation" } },
              },
            ],
          },

          // ── 4 · who builds it ──────────────────────────────────────────────
          {
            // Alex asks who wants the board (in the call's own reaction) and
            // Jordan takes it before the founder can answer: the founder never
            // hands it to her, so asking her about it later isn't a reversal.
            // A promise, not a delivery — and she has no idea anything is wrong.
            id: "pivot_board_claim", char: "summit", speaker: "jordan",
            when: { took: ["pivot_day_decide:pivot"] },
            text: "board's mine. it's the intake screen idea all grown up — asking people what they want to *do* instead of who they want to look at.\n\ni'll have a first version by sunday. this is the fun part.",
            // The founder's moment: after months of a graph that only went
            // down, this is the first night the company knows what it is.
            // Said out loud to the whole room before Priya gets the last word.
            choices: [
              {
                key: "priya", label: "This is it. We finally know.",
                reply: "this is it. months of watching people match and vanish, and tonight we finally know why — and what to build instead. i haven't felt like this since the day we started.\n\npriya, anything before we sign off?",
                journal: null,
              },
              {
                key: "sober", label: "Three weeks. Let's not waste one.",
                reply: "okay. this is the one. three weeks, and we don't waste a single one of them.\n\npriya, anything before we sign off?",
                journal: null,
              },
            ],
          },
          {
            // Two readings. Jordan hears encouragement; the player hears an
            // outsider who has seen the pattern, warning without accusing.
            id: "pivot_priya_night", char: "summit", speaker: "priya",
            text: "that's a big responsibility, jordan. the whole pivot lives or dies on that one screen.\n\nand it has to be live in three weeks. not four.",
            choices: [
              {
                key: "night", label: "Goodnight, everyone.",
                reply: "goodnight, everyone. big three weeks.",
                journal: null,
                effects: {
                  say: [
                    { char: "summit", speaker: "jordan", text: "i know!! best job in the company 🙌" },
                    { char: "summit", system: true, text: "Priya left the conversation" },
                    { char: "summit", speaker: "alex", text: "👍" },
                  ],
                },
              },
              {
                key: "thanks", label: "Thank Priya.",
                reply: "priya — thank you. tonight doesn't happen without you. goodnight, everyone.",
                journal: null,
                effects: {
                  say: [
                    { char: "summit", speaker: "jordan", text: "i know!! best job in the company 🙌" },
                    { char: "summit", system: true, text: "Priya left the conversation" },
                    { char: "summit", speaker: "alex", text: "👍" },
                  ],
                },
              },
            ],
          },
          {
            // The door — the old mechanism (Alex's DM about Jordan's work),
            // at the worst possible moment: minutes after she volunteered.
            id: "pivot_alex_door", char: "alex",
            text: "can i say something i've been sitting on. not in the group.",
            choices: [
              { key: "say", label: "Say it.", reply: "say it.", journal: null },
              {
                key: "later", label: "Not tonight.",
                reply: "not tonight. it's been a long one.",
                journal: "Alex wanted to say something about Jordan after the pivot call. I said not tonight.",
                effects: { scene: null, say: { char: "alex", text: "sure." } },
                fx(s) { s.jordan_kept = true; s.jordan_kept_week = s.week; return null; },
              },
            ],
          },
          {
            // He praises her, names the pattern, and doubts his own motives.
            // None of the chips says "fire".
            id: "pivot_alex_concern", char: "alex",
            text: "she's great. i mean that. the intake screen is still the best thing we've made.\n\nshe's also been a week behind on everything since demo night. the picker. the ios sprint. the review on my PR. every time there's a good reason. every time it's a week.\n\nand v2 doesn't have a week in it.\n\n…or maybe that's on me. i wanted 40% in week two. i don't know if i'm being fair to her. that's why i'm telling you and not her.",
            when: { took: ["pivot_alex_door:say"] },
            choices: [
              {
                // Labels carry the founder's intent; the bubble is what a person
                // would actually type (the same split as ff_family's "Let them
                // invest" → "can I come over for dinner").
                key: "talk", label: "I'll talk to her about her pace.",
                reply: "i'll talk to her. tonight, if she's up.",
                journal: null,
                effects: { say: { char: "alex", text: "thank you. i'm sorry it's yours." } },
              },
              {
                key: "week", label: "Let's see how her first week goes.",
                reply: "let's see how her first week on the board goes. then we talk.",
                journal: "Alex told me Jordan's been a week behind on everything since demo night. I said let's see how her first week on the board goes. He's counting now.",
                effects: { scene: null, say: { char: "alex", text: "okay. one week." } },
                fx(s) { s.jordan_kept = true; s.jordan_kept_week = s.week; return null; },
              },
              {
                key: "unfair", label: "That's not fair to her.",
                reply: "that's not fair to her. she's been here since before there was anything to be here for.",
                journal: "Alex told me Jordan's been a week behind on everything since demo night. I told him that wasn't fair to her. He said forget he said it.",
                effects: { scene: null, char: { alex: { morale: -8, trust: -8 } }, say: { char: "alex", text: "maybe not. forget i said it." } },
                fx(s) { s.jordan_kept = true; s.jordan_kept_week = s.week; return null; },
              },
            ],
          },

          // ── 5 · Jordan's thread: the ladder and the firing ────────────────
          ...JT.jordanTalk("", ["pivot_alex_concern:talk"], false),
        ],
      },
    ],

    nodes: [
      // ── THE DOOR: Alex's Hail Mary (L+4) ─────────────────────────────────
      {
        // In the founders' group chat, not Alex's DM: he's asking for the
        // company's money, in front of both co-founders — and the group
        // thread is never busy this late, where Alex's own slot is contested
        // by the trough's beats (a door that can't surface is no door).
        id: "pivot_hail_mary", char: "founders", speaker: "alex",
        text: (s) => {
          const share = s.cash <= 1500 ? "that's everything we have left."
            : s.cash <= 4000 ? "that's most of what's left in the bank."
              : "that's a real chunk of what's left in the bank.";
          return "ok. i'm done watching the graph go down. i have a plan.\n\nmixer at the climbing gym, referral codes, flyers on three campuses. $1,500. six weeks and we're at 300 users — and at 300 the app finally has enough people in it to work.\n\n"
            + share + " i need a yes from you before i book the gym. they want an answer tonight.";
        },
        when: {
          // Delay 4: the trough gets a real stretch of falling numbers and
          // failed fixes before Alex runs out of patience.
          took: ["good_enough_launch:ship"], delay: 4,
          if: (s, e) => !s.activities_pivot && !s.pivot_summit_done && !s.pivot_deferred
            && e.cast.get("priya").active,
        },
        choices: [
          {
            key: "go", label: "Do it. Book the gym.",
            reply: "do it. book the gym.",
            journal: "Alex wanted $1,500 for a growth push — mixer, referrals, flyers. I said yes without asking anyone else.",
            effects: { say: { char: "founders", speaker: "alex", text: "booking it now. you won't regret this." } },
            fx(s, e) { growthPath(s, e); return null; },
          },
          {
            key: "hold", label: "Hold on. Everyone on one thread tonight — Priya too.",
            reply: "hold on. before we spend it, i want everyone on one thread tonight. priya too.",
            journal: null,
            effects: {
              say: { char: "founders", speaker: "alex", text: "…fine. but i'm bringing the numbers, and i'm going to argue for this.\n\nthe gym holds the slot till midnight." },
              scene: "pivot",
            },
          },
        ],
        // Silence is a yes: Alex books it anyway.
        timeout: {
          weeks: 2,
          say: { char: "founders", speaker: "alex", text: "didn't hear back, so i booked it. mixer's on." },
          fx(s, e) { growthPath(s, e); },
        },
      },

      // ── AFTERMATH: THE REBUILD, ON SCREEN ────────────────────────────────
      {
        // The scope call — Ch 1's lean-plan lesson, echoed under pressure.
        id: "pivot_scope_call", char: "alex",
        text: "monday-morning question before i write a line of code. the old app had profiles, browsing, the chat threads. v2 is plans. do i keep a 'classic matching' mode alive next to the plans board — for the users who liked it — or do we cut to the bone and ship one thing?",
        when: {
          if: (s, e) => e.chapter === 4 && s.pivot_week != null
            && s.week >= s.pivot_week + 1
            && s.items && s.items.plans_matching && s.items.plans_matching.status === "active",
        },
        choices: [
          {
            key: "cut", label: "One thing. Cut everything else",
            reply: "cut to the bone. v2 does one thing — you open the app, you see plans. anyone asking for the old mode is asking for the app that was losing everyone.",
            journal: "Scope call for v2: one thing. Plans board, nothing else — no legacy matching mode limping alongside. The lean lesson, learned twice.",
            effects: { marketFit: 4 },
            fx(s, e) {
              s.board_extra = (s.board_extra || 0) - 0.5;
              e.say({ char: "alex", text: "cut it is. deleting code is the fastest i will ever ship. that buys us a few days." });
              return null;
            },
          },
          {
            key: "keep", label: "Keep classic matching alive too",
            reply: "keep the old mode alive next to the board. some people liked it — i don't want to strand them.",
            journal: "Told Alex to keep classic matching alive next to the plans board. Two products in one app — he didn't argue, but the build got slower and the pitch got fuzzier the moment I said it.",
            effects: { marketFit: -4 },
            fx(s, e) {
              s.board_extra = (s.board_extra || 0) + 1;
              s.pivot_kept_legacy = true;
              e.say({ char: "alex", text: "okay. for the record: that's two products in one app, and 'what is plusone' just got harder to answer. it also costs us at least an extra week." });
              return null;
            },
          },
        ],
        timeout: {
          weeks: 2,
          say: { char: "alex", text: "no answer, so i made the call myself: cut to the bone. one screen, plans only. yell at me later if you wanted the museum wing." },
        },
      },
      {
        // The beta-invite call — Jordan's beat: she lurked the support inbox all
        // trough, now she wants to write to the people who left. Only while
        // she's still on the team.
        id: "pivot_beta_invite", char: "jordan",
        text: (s) => (s.maya_quote
          ? "i want to write to the people who left before we relaunch. all of them — maya included — get a two-line email: 'you told us what was wrong. we rebuilt it. want to see?' "
          : "i want to write to the people who left before we relaunch. every quiet account gets a two-line email: 'you told us what was wrong. we rebuilt it. want to see?' ")
          + "the people who quit are the only ones who already know why the old app failed. or do we save the reveal for launch day and a clean slate?",
        when: {
          if: (s, e) => e.chapter === 4 && !s.jordan_resolved
            && s.pivot_week != null && s.week >= s.pivot_week + 1,
        },
        choices: [
          {
            key: "invite", label: "Write them — they diagnosed it",
            reply: "write it. they told us exactly what was wrong — they've earned the first look.",
            journal: "Jordan is writing to everyone who left, before the relaunch: 'you told us what was wrong. we rebuilt it. want to see?'",
            effects: {
              marketFit: 5, flags: { beta_invited: true }, char: { jordan: { morale: 5 } },
              schedule: {
                in: 1, char: "jordan", unless: (s) => s.pivot_shipped,
                say: { char: "jordan", text: "beta invites are out. first replies already warmer than anything the old app ever got. one just says 'finally.'" },
              },
            },
            fx: () => "Jordan's writing the email tonight. The quiet list becomes the beta list.",
          },
          {
            key: "fresh", label: "Clean slate — save it for launch day",
            reply: "save the reveal. i'd rather relaunch to fresh eyes than re-litigate v1 with the people it burned.",
            journal: "Skipped the beta invite to the people who left — v2 relaunches to fresh eyes instead.",
            fx: () => "Clean slate it is. The quiet list stays quiet until launch day.",
          },
        ],
        timeout: { weeks: 2 },
      },
      {
        // Ch 4's mechanical climax — on the FOUNDER's thread. Surfaces once
        // both halves of v2 are built: the matching (Alex) and the board
        // (whoever holds it — which is why keeping Jordan delays it).
        id: "pivot_relaunch", char: "founder",
        text: (s) => "Alex's message is three words: 'staging is green.' The matching is rebuilt around plans" + (s.pivot_kept_legacy ? ", the classic mode limps alongside it," : "") + " and the board is in. This is a different product wearing the same name — and how it meets the world is your call.",
        when: {
          cooldown: 2,
          if: (s, e) => e.chapter === 4
            && s.items && s.items.plans_matching && s.items.plans_matching.status === "done"
            && s.items.plans_ui && s.items.plans_ui.status === "done",
        },
        choices: [
          {
            key: "sarah_event", label: "Debut v2 at Sarah's event",
            if: (s) => !!s.sarah_onboard,
            reply: "staging's green — we're ready. still want us for the event?", replyTo: "sarah",
            journal: "Relaunched at Sarah's event — 200 singles in a room and the app on the projector was a board of plans, not a grid of faces. People RSVP'd to real plans on the spot. PlusOne v2 walked out of that room with a heartbeat.",
            fx(s, e) {
              s.pivot_shipped = true;
              s.pivot_ship_week = s.week;
              s.users += 15 + (s.beta_invited ? 4 : 0);
              s.signal = clamp(s.signal + 12, 0, 100);
              s.market_fit = clamp(s.market_fit + 20, 0, 100);
              e.say({ char: "sarah", text: "that went better than i pitched it to you. three of my regulars made plans on the spot. told you this crowd was your crowd." });
              return "V2 debuted live at Sarah's event. Real plans, made in the room, by strangers. The relaunch has a pulse — and a channel.";
            },
          },
          {
            key: "press", label: "Give the reporter the pivot story",
            journal: "Relaunched with the reporter's second piece: 'the dating app that killed its own product.' The pivot story reads better than a launch story — it has a before and after.",
            fx(s, e) {
              s.pivot_shipped = true;
              s.pivot_ship_week = s.week;
              s.users += 8 + (s.beta_invited ? 4 : 0);
              s.signal = clamp(s.signal + 15, 0, 100);
              s.market_fit = clamp(s.market_fit + 20, 0, 100);
              return "The piece ran: 'the dating app that killed its own product.' A pivot is a better story than a launch — it has a before and after. Signups followed the honesty.";
            },
          },
          {
            key: "quiet", label: "Quiet update to your own users first",
            journal: "Shipped v2 quietly to existing users first. No stage, no headline — just the people who stuck around, seeing the app become what they'd asked for. The first activity was created within an hour.",
            fx(s, e) {
              s.pivot_shipped = true;
              s.pivot_ship_week = s.week;
              s.users += 4 + (s.beta_invited ? 4 : 0);
              s.signal = clamp(s.signal + 6, 0, 100);
              s.market_fit = clamp(s.market_fit + 24, 0, 100);
              return "Pushed to production, no fireworks. Existing users got the update; the first activity was created within an hour. Retention will tell the real story — and this time you'll like what it says.";
            },
          },
          {
            key: "wait", label: "One more week of polish",
            effects: { char: { alex: { morale: -8 } } },
            fx: () => "Another week polishing. Alex thinks you're overthinking it.",
          },
        ],
        timeout: { weeks: 3, effects: { char: { alex: { morale: -10 } } } },
      },
      {
        // The redemption card: two weeks after taking the growth push, Priya's
        // number comes due. Being wrong is recoverable exactly once, at a
        // price — later, costlier, with runway nearly spent.
        id: "pivot_fifty_verdict", char: "alex",
        text: "i kept priya's tally. 61 new signups since the mixer — the growth push worked, you were right about that part. matches since then: 54. actual dates planned: zero. not low. zero. i erased my side of the argument this morning. how much cash do we have left?",
        when: {
          if: (s) => s.pivot_choice === "growth" && !s.activities_pivot && s.launched
            && s.pivot_growth_week != null && s.week >= s.pivot_growth_week + 2,
        },
        choices: [
          {
            key: "pivot_now", label: "Change the app now, with what's left",
            reply: "zero plans out of 54 matches. priya said we'd know, and now we do. we change the app — now, with whatever money is left.",
            journal: "Zero plans to meet out of 54 matches. Alex erased his own argument. We're pivoting late, with runway nearly spent. The lesson was on the table weeks ago.",
            fx(s, e) {
              s.activities_pivot = true;
              s.pivot_week = s.week;
              s.cash = Math.max(0, s.cash - 2000);
              s.market_fit = clamp(s.market_fit + 8, 0, 100);
              applyActivitiesPivot(s);
              const jordan = e.cast.get("jordan");
              if (jordan.active) jordan.morale = clamp(jordan.morale + 3, 0, 100);
              // Alex converted himself watching the tally — he's been sketching
              // the plans screen for days, so the board starts a week in.
              s.board_progress = 1;
              return "Pivoting weeks late. Less cash, less runway, same rebuild. Alex is already sketching the plans screen — he got there on his own this time.";
            },
          },
          {
            key: "ride", label: "Ride Plan A down",
            reply: "we made our call. we ride it.",
            journal: "54 matches, zero plans to meet — and I chose to ride Plan A anyway. Alex went quiet. Priya stopped texting.",
            effects: { marketFit: -15, signal: -15, char: { alex: { morale: -10 } } },
            fx: () => "Riding Plan A. The graph doesn't care about resolve.",
          },
        ],
        timeout: { weeks: 3, effects: { marketFit: -15, signal: -15, char: { alex: { morale: -12 } } } },
      },
      {
        // The bookend — only exists if the player called Maya during the slide.
        id: "pivot_payoff_maya", char: "alex",
        text: (s) => s.beta_invited
          ? "small thing. maya — launch-day maya, the one you called — answered the beta email. she just RSVP'd to a thursday climbing plan. the first person the old app lost is the first one back in the new one."
          : "small thing. maya — launch-day maya, the one you called — just RSVP'd to a thursday climbing plan. she came back on her own. someone must have told her it's a different app now.",
        when: { if: (s) => s.pivot_shipped && !!s.maya_quote },
        choices: [
          {
            key: "ack", label: "It is a different app now",
            reply: "it is a different app now. she told us exactly what was wrong with the old one — feels right that she's first back.",
            journal: "Maya came back. The first launch-day signup, the one who told me the app made her feel worse — she RSVP'd to a Thursday climbing plan. That's the whole pivot in one notification.",
            effects: { signal: 5 },
            fx: () => "The first churned user, back on her own. That's the whole pivot in one notification.",
          },
        ],
        timeout: { weeks: 3 },
      },
    ],
  };

  mod.lib = { applyActivitiesPivot };
  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.STORY = window.STORY || []).push(mod);
})();
