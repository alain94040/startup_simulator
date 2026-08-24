// ─────────────────────────────────────────────────────────────────────────────
// story/pivot_day.js — pivot day: one Saturday, one whiteboard. Alex argues
// density, Priya argues retention, the player decides. A scene arc entered from
// the founder's summit call; ignoring the call is itself the scored failure
// (pivot_deferred sets silently — the default won).
//
// The hinge is pivot_day_evidence: the options are evidence chips gated on what
// was banked during the demo/slide. The conversion rule: the cohort (bought
// analytics) plus one human quote — a face on the data — is what moves Alex off
// his own column (s.alex_converted → no morale hit, rebuild head start).
//
// Aftermath — the Ch 4 rebuild, on screen: pivot_scope_call (the lean lesson
// again, under pressure), pivot_beta_invite (Jordan writes the churned list),
// pivot_relaunch (ship v2 — on the founder's thread with the relaunch-channel
// choice: Sarah's event / the reporter's second bite / a quiet update),
// pivot_fifty_verdict (the one redemption card if you chose growth/hedge),
// pivot_payoff_maya (the bookend).
// ─────────────────────────────────────────────────────────────────────────────

(function () {
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
    s.items.plans_matching = { status: "active", quality: null, assignee: "alex" };
    s.items.plans_ui = { status: "todo", quality: null, assignee: "jordan" };
  }

  // The player plays an evidence chip and Alex responds in character.
  function playChip(s, e, key) {
    s.evidence_chip = key;
    const human = key === "maya" || key === "rachel" || key === "demo";
    if (human && s.analytics_live) {
      s.alex_converted = true;
      e.say({ char: "alex", text: "…yeah. her words, next to my numbers, saying the same thing. i'm going to go quietly erase half my whiteboard." });
    } else if (key === "circle") {
      e.say({ char: "alex", text: "…yeah. twelve friends and almost every match stuck at 'hey'. more users just means more people stuck at 'hey'." });
    } else if (key === "fixes") {
      e.say({ char: "alex", text: "…i ran two of those pushes myself. every bump washed out in a week — i watched it happen. more water into a bucket i haven't patched. that's my own column arguing against me." });
    } else if (human) {
      e.say({ char: "alex", text: "that's real, and it stings. i just wish we had numbers to check it against. one person's story is a clue, not proof." });
    } else {
      // 'gut' — Priya answers, gently.
      e.say({ char: "priya", text: "then we're guessing. i've won and lost on guesses. just know which one this is." });
    }
    return null;
  }

  const mod = {
    arcs: [
      {
        id: "pivot",
        scene: { cast: ["alex", "priya"] },
        beats: [
          {
            id: "pivot_day_open", char: "alex",
            text: "saturday. office. i got here early and split the whiteboard in two: NOT ENOUGH USERS / WRONG PRODUCT. before priya shows up, one thing founder-to-founder: i'm going to argue my side as hard as i can today, because someone has to. but whatever you decide at 6pm, i build it. deal?",
            when: { took: ["pivot_summit_call:call_it"] },
            choices: [
              { key: "deal", label: "Deal — argue hard", reply: "deal. argue hard. i'd be worried if you didn't.", journal: null },
            ],
          },
          {
            id: "pivot_day_alex_case", char: "alex",
            text: (s) => "my case. " + Math.max(5, s.users) + " users. everyone who left saw the same thing: three so-so matches, an empty screen, silence. that would drive people out of *hinge*, and hinge works. give me six weeks and $1,500 — the mixer, referrals, campus flyers — and we're at 300 users. THEN we'll know if something's actually broken. rebuilding the app because a handful of people got bored isn't strategy, it's panic.",
            choices: [
              {
                key: "probe", label: "What would change your mind?",
                reply: "before i argue back: what result would change your mind?", journal: null,
                effects: { say: { char: "alex", text: "…fine. if the GOOD matches also died. two people who liked each other, started talking — and still nothing. an empty room explains bad matches. it can't explain good ones going nowhere." } },
              },
              {
                key: "challenge", label: "When do we find out you were wrong?",
                reply: "your plan takes six weeks. we don't have six spare. if you're wrong — when do we find out?", journal: null,
                effects: { say: { char: "alex", text: "…yeah. the money is the weak part of my side. i know." } },
              },
            ],
          },
          {
            // Priya doesn't argue back — she raises the stakes on evidence.
            id: "pivot_day_priya_case", char: "priya",
            text: "my turn. short version. 'it'll get better when we're bigger' is the most expensive sentence in this business — i've said it myself, and it cost me a year. sometimes it's even true. that's what makes it dangerous. so let's not argue opinions. alex: your analytics score every match, right? pull up the best ones — the matches that *should* have worked. show me what happened to them.",
            when: { after: ["pivot_day_alex_case"] },
            choices: [
              { key: "pull_it", label: "Pull the best matches — watch the replay",
                reply: "do it. best matches we've ever made. let's watch the replay.", journal: null },
            ],
          },
          {
            // The hinge: what fires here depends entirely on what was banked.
            id: "pivot_day_evidence", char: "alex",
            text: (s, e) => {
              const core = s.analytics_live
                ? "…okay. pulled our eleven best matches since launch — both people liked each other, both still using the app. ten of them went: match — 'hey' — 'hey' — nothing. the eleventh made it to five messages and died when he asked 'so what does your week look like?' and she never answered. …that's not an empty-room problem. the app goes silent at the exact moment it's supposed to help."
                : "i can't answer that. we never set up analytics — all i have is totals and what i remember from watching the logs. you'll have to make this call on gut, because i can't make it on data.";
              return core;
            },
            when: { after: ["pivot_day_priya_case"] },
            choices: [
              {
                key: "maya", label: "Maya's call — she liked her match",
                if: (s) => !!s.maya_quote,
                reply: "maya matched with a guy she *liked*. her words: 'it was just a chat window. i already have seven of those on hinge. plusone made me feel worse.' we didn't lose her because the room was empty. we lost her after the match — the part that's ours.",
                journal: null,
                fx: (s, e) => playChip(s, e, "maya"),
              },
              {
                key: "rachel", label: "Rachel's email — 'a place to say yes'",
                if: (s) => !!s.rachel_answer,
                reply: "rachel told me what she wanted, unprompted: 'i hoped the app would give one of us an excuse. a place to say yes to.' she wasn't asking for more matches.",
                journal: null,
                fx: (s, e) => playChip(s, e, "rachel"),
              },
              {
                key: "demo", label: "Demo night — 'so what happens now?'",
                if: (s) => !!s.demo_question_seen,
                reply: "the first stranger who ever touched this app finished the flow, matched, and typed 'so what happens now?' we've had the question since demo night. we just never answered it.",
                journal: null,
                fx: (s, e) => playChip(s, e, "demo"),
              },
              {
                key: "circle", label: "Test group — 11 of 14 went nowhere",
                if: (s) => !!s.analytics_dropoff_seen,
                reply: "and our testflight group settles it — twelve people, all friends of friends, everyone knew everyone. a full room. 11 of their 14 matches still went nowhere.",
                journal: null,
                fx: (s, e) => playChip(s, e, "circle"),
              },
              {
                // Banked by the trough's failed-fix loop: trying the growth
                // answer and watching it wash out is itself evidence.
                key: "fixes", label: "We already tried the growth answer",
                if: (s) => !!(s.funnel_first || s.feature_spree || s.winback_flat),
                reply: "and we already ran your experiment. traffic push, win-back email, a shiny feature — every one bought a bump and every bump was gone in a week. we filled the room three times. it kept emptying at the same spot.",
                journal: null,
                fx: (s, e) => playChip(s, e, "fixes"),
              },
              {
                key: "gut", label: "A feeling and a flat graph",
                reply: "i don't have clean data. i have a feeling and a flat graph.",
                journal: null,
                fx: (s, e) => playChip(s, e, "gut"),
              },
            ],
          },
          {
            // What "pivot" even means — a reframe, not a feature.
            id: "pivot_day_shape", char: "priya",
            text: "so say it's the product. one warning first: don't just bolt an 'events tab' onto the app. every dying dating app does that, and users can smell it. flip the whole thing instead. you don't browse people — you browse plans: 'thursday. climbing gym. six of us, two spots open.' the first message is never 'hey' again — it's 'i'm in.' plusone stops being a chat app full of dead ends and becomes a calendar with people on it.",
            when: { after: ["pivot_day_evidence"] },
            choices: [
              {
                key: "flip", label: "Browse plans, not people",
                reply: "that's it. you browse a plan, not a person. write it on the board.", journal: null,
                fx(s, e) {
                  // Alex's engineering read — the old MatchKit decision bites or pays here.
                  e.say({
                    char: "alex",
                    text: s.matching_licensed
                      ? "here's where i get to be mad about a months-old decision: matchkit can't do this. it matches singles, that's all it does, and we can't touch its insides. it has to come out — all of it. we'd be paying to remove the thing we paid to add."
                      : "…the weird part: the matching engine survives. picking people for a plan is the same math — i can repoint it in a week. what dies is everything you can see. every screen. all of it.",
                  });
                  return null;
                },
              },
            ],
          },
          {
            id: "pivot_day_cost", char: "alex",
            text: (s, e) => {
              const weeks = Math.max(0, Math.floor((s.cash - 2000) / e.burnPerWeek));
              return "the price, because someone has to say it. rebuild: three weeks, about $2k. that leaves us relaunching with " + weeks + " weeks of cash — i did the math twice hoping i was wrong. if we rebuild and it turns out we just needed more users — we die with two apps nobody used. if we chase users and priya's right — we spend our last dollars promoting a dead end. wrong either way is the same grave. different flowers.";
            },
            when: { after: ["pivot_day_shape"] },
            choices: [
              { key: "ack", label: "Write it in red — then we decide",
                reply: "noted. write it in red. now let's decide anyway — that's the job.", journal: null },
            ],
          },
          {
            id: "pivot_day_decide", char: "alex",
            text: "6pm. whiteboard's full. both sides made their case. your company, your call: what are we building monday morning?",
            when: { after: ["pivot_day_cost"] },
            choices: [
              {
                key: "pivot", label: "We pivot — the plan is the product",
                reply: "we pivot. the plan is the product — a match needs somewhere to go, and monday we start building the somewhere.",
                journal: "Pivot day, 6pm. I called it: we pivot. The thing you browse won't be a person anymore — it'll be a plan. Three weeks, $2k, and PlusOne becomes a calendar with people attached.",
                fx(s, e) {
                  s.pivot_summit_done = true;
                  s.pivot_choice = "pivot";
                  s.activities_pivot = true;
                  s.pivot_week = s.week;
                  s.cash = Math.max(0, s.cash - 2000);
                  s.market_fit = clamp(s.market_fit + 15, 0, 100);
                  applyActivitiesPivot(s);
                  const jordan = e.cast.get("jordan");
                  if (jordan.active) jordan.morale = clamp(jordan.morale + 5, 0, 100);
                  const alex = e.cast.get("alex");
                  if (s.alex_converted) {
                    // He argued himself out of his own column — the rebuild
                    // starts committed, with a head start on the effort clock.
                    const jordanEffort = jordan.active ? jordan.buildEffort : 0;
                    s.pivot_effort_base = alex.buildEffort + jordanEffort - 1.0;
                    e.say({ char: "alex", text: "yeah. honestly? i got there around 4 o'clock — match eleven did it. monday. erase my side of the board." });
                  } else {
                    alex.morale = clamp(alex.morale - 10, 0, 100);
                    e.say({ char: "alex", text: "okay. on the record: not convinced. but i said i'd build whatever you decide, and i meant it." });
                  }
                  return null;
                },
              },
              {
                key: "growth", label: "Alex is right — get more users",
                reply: "alex is right — the room's just empty. we don't touch the product. everything goes into getting users: the mixer, referrals, all of it.",
                journal: "Pivot day, 6pm. I sided with Alex: the product is fine, the room is empty. We don't touch the app — mixer, referrals, all of it. Priya left me one number to watch: of the next 50 matches, how many turn into a plan to meet.",
                effects: {
                  signal: 4,
                  flags: { pivot_summit_done: true, pivot_choice: "growth", pivot_deferred: true },
                  char: { alex: { morale: 6 } },
                  schedule: {
                    in: 2, char: "alex", unless: (s) => s.activities_pivot,
                    effects: { users: 20 },
                    say: { char: "alex", text: "mixer report: 40 rsvps, 19 showed, 11 installed on the spot. good night, honestly. i'm watching the after-match numbers like a hawk, like you asked." },
                  },
                },
              },
              {
                key: "hedge", label: "Split it — tab, deck, and growth",
                reply: "split it. keep the deck, add an activities tab, push growth too. cover every base.",
                journal: "Pivot day, 6pm. I split the difference: keep the deck, bolt on an activities tab, push growth too. Priya said it out loud — that's not a strategy, it's a hedge. We'll see who's right.",
                effects: {
                  cash: -800, marketFit: 5,
                  flags: { pivot_summit_done: true, pivot_choice: "hedge", pivot_hedged: true },
                },
              },
            ],
          },
          {
            // Night. Closes the scene — the world resumes.
            id: "pivot_day_close", char: "priya",
            text: (s) => s.pivot_choice === "pivot"
              ? "one more thing before i go. most founders can't do what you did today — kill a thing that works in favor of a thing that's true. that's the whole job, and almost nobody does it while there's still enough cash to survive it. text me the second v2 is live. i want to be user #1."
              : s.pivot_choice === "growth"
                ? "good fight today. it's your company and it was a real argument. watch one number for me: of your next 50 matches, how many turn into a plan to meet. zero at fifty and you move — no second summit. deal?"
                : "that's not a strategy, it's a hedge — and hedges ship late and mediocre twice. i said it once, and now i'll respect your call. for what it's worth, i hope i'm wrong. i'm usually not about this one.",
            when: { after: ["pivot_day_decide"] },
            choices: [
              {
                key: "night", label: "Thank her — long day, right call",
                reply: "thank you for today. whichever way it goes — that was the most useful room this company has ever been in.",
                journal: "Pivot day ended after dark. Whiteboard full, coffee cold, decision made. Whatever happens next, that room was the most useful eight hours this company has spent.",
                effects: { scene: null },
              },
            ],
          },
        ],
      },
    ],

    nodes: [
      // ── THE SUMMIT CALL (founder journal, L+3) ───────────────────────────────
      {
        id: "pivot_summit_call", char: "founder",
        text: (s, e) => "A month since launch and the graph only goes down — every push bought a bump, every bump evaporated. Two explanations on the table. Alex: the product is fine, there just aren't enough users yet. Priya: more users won't help — every match hits a dead end. You can't chase both. With " + e.runwayWeeks + " weeks of cash left, you get to be wrong exactly once. Clear Saturday. Get them both in a room. Settle it.",
        when: {
          // Delay 4 (was 3): the trough gets a real stretch of falling numbers
          // and failed fixes before the diagnosis room convenes.
          took: [["good_enough_launch:ship", "jordan_launch_blocker:web_only", "jordan_launch_blocker:@ignored"]], delay: 4,
          if: (s, e) => !s.activities_pivot && !s.pivot_summit_done && !s.pivot_deferred
            && e.cast.get("priya").active,
        },
        choices: [
          {
            key: "call_it", label: "Call it — Saturday, whiteboard",
            journal: "Called the summit. Saturday, whiteboard, nobody leaves until we know what we're building Monday. Alex will argue we just need more users; Priya's bringing four years of scar tissue.",
            effects: { scene: "pivot" },
          },
        ],
        // Never called the room: the default direction wins by inertia. No summit
        // means no Priya tally either — the story just goes quiet, which is
        // exactly what drifting into a default feels like.
        timeout: { weeks: 3, effects: { flags: { pivot_deferred: true, pivot_summit_done: true } } },
      },

      // ── AFTERMATH: THE REBUILD, ON SCREEN ────────────────────────────────────
      {
        // The scope call — Ch 1's lean-plan lesson, echoed under pressure. On
        // Alex's thread ahead of the Jordan drift beats (declared earlier, so
        // FIFO ties break its way).
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
            journal: "v2 ships one thing — the plans board. No legacy mode.",
            effects: { marketFit: 4 },
            fx(s, e) {
              if (s.pivot_effort_base != null) s.pivot_effort_base -= 0.8;
              e.say({ char: "alex", text: "cut it is. deleting code is the fastest i will ever ship. that buys us most of a week." });
              return null;
            },
          },
          {
            key: "keep", label: "Keep classic matching alive too",
            reply: "keep the old mode alive next to the board. some people liked it — i don't want to strand them.",
            journal: "Told Alex to keep classic matching alive next to the plans board. Two products in one app — he didn't argue, but the build got slower and the pitch got fuzzier the moment I said it.",
            effects: { marketFit: -4 },
            fx(s, e) {
              if (s.pivot_effort_base != null) s.pivot_effort_base += 1.5;
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
        // trough, now she wants to write to the people who left. Optional; if
        // she's already gone (late-pivot firings) the beat never exists.
        id: "pivot_beta_invite", char: "jordan",
        text: (s) => (s.maya_quote
          ? "i want to write to the people who left before we relaunch. all of them — maya included — get a two-line email: 'you told us what was wrong. we rebuilt it. want to see?' "
          : "i want to write to the people who left before we relaunch. every quiet account gets a two-line email: 'you told us what was wrong. we rebuilt it. want to see?' ")
          + "the people who quit are the only ones who already know why the old app failed. or do we save the reveal for launch day and a clean slate?",
        when: {
          if: (s, e) => e.chapter === 4 && !s.jordan_resolved && !s.jordan_quit
            && s.pivot_week != null && s.week >= s.pivot_week + 1,
        },
        choices: [
          {
            key: "invite", label: "Write them — they diagnosed it",
            reply: "write it. they told us exactly what was wrong — they've earned the first look.",
            journal: "The quiet list becomes the beta list — Jordan's writing to everyone who left.",
            effects: {
              marketFit: 5, flags: { beta_invited: true }, char: { jordan: { morale: 5 } },
              schedule: {
                in: 1, char: "jordan", unless: (s) => s.pivot_shipped,
                say: { char: "jordan", text: "beta invites are out. first replies already warmer than anything the old app ever got. one just says 'finally.'" },
              },
            },
          },
          {
            key: "fresh", label: "Clean slate — save it for launch day",
            reply: "save the reveal. i'd rather relaunch to fresh eyes than re-litigate v1 with the people it burned.",
            journal: "V2 relaunches to fresh eyes — the quiet list stays quiet until launch day.",
          },
        ],
        timeout: { weeks: 2 },
      },
      {
        // Ch 4's climax — on the FOUNDER's thread, deliberately: it used to live
        // on Alex's, where the Jordan arc's beats (same class, earlier in the
        // queue) could starve it past the deadline on the late-pivot path.
        id: "pivot_relaunch", char: "founder",
        text: (s) => "Alex's message is three words: 'staging is green.' The matching is rebuilt around plans" + (s.pivot_kept_legacy ? ", the classic mode limps alongside it," : "") + " and the new screens are in. This is a different product wearing the same name — and how it meets the world is your call.",
        when: {
          cooldown: 2,
          if: (s, e) => e.chapter === 4
            && s.items && s.items.plans_matching && s.items.plans_matching.status === "done"
            && (!s.items.plans_ui || s.items.plans_ui.status === "done" || s.jordan_resolved || s.jordan_quit),
        },
        choices: [
          {
            key: "sarah_event", label: "Debut v2 at Sarah's event",
            if: (s) => !!s.sarah_onboard,
            journal: "Relaunched at Sarah's event — 200 singles in a room and the app on the projector was a board of plans, not a grid of faces. People RSVP'd to real plans on the spot. PlusOne v2 walked out of that room with a heartbeat.",
            fx(s, e) {
              s.pivot_shipped = true;
              s.users += 15 + (s.beta_invited ? 4 : 0);
              s.signal = clamp(s.signal + 12, 0, 100);
              s.market_fit = clamp(s.market_fit + 20, 0, 100);
              e.say({ char: "sarah", text: "that went better than i pitched it to you. three of my regulars made plans on the spot. told you this crowd was your crowd." });
            },
          },
          {
            key: "press", label: "Give the reporter the pivot story",
            journal: "Relaunched with the reporter's second piece: 'the dating app that killed its own product.' The pivot story reads better than a launch story — it has a before and after.",
            fx(s, e) {
              s.pivot_shipped = true;
              s.users += 8 + (s.beta_invited ? 4 : 0);
              s.signal = clamp(s.signal + 15, 0, 100);
              s.market_fit = clamp(s.market_fit + 20, 0, 100);
            },
          },
          {
            key: "quiet", label: "Quiet update to your own users first",
            journal: "Shipped v2 quietly to existing users first. No stage, no headline — just the people who stuck around, seeing the app become what they'd asked for. The first activity was created within an hour.",
            fx(s, e) {
              s.pivot_shipped = true;
              s.users += 4 + (s.beta_invited ? 4 : 0);
              s.signal = clamp(s.signal + 6, 0, 100);
              s.market_fit = clamp(s.market_fit + 24, 0, 100);
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
        // The redemption card: three weeks after choosing growth (or the hedge),
        // Priya's number comes due. Being wrong is recoverable exactly once, at
        // a price — later, costlier, with runway nearly spent.
        id: "pivot_fifty_verdict", char: "alex",
        text: (s) => {
          const core = "i kept priya's tally on the whiteboard. 61 new signups since that saturday — the growth push worked, you were right about that part. matches since then: 54. actual dates planned: zero. not low. zero. i erased my side of the board this morning. how much cash do we have left?";
          return s.pivot_choice === "hedge"
            ? core + " and the events tab has 9 views. the deck is still the front door. half-pivots don't count — i checked."
            : core;
        },
        when: {
          // Two weeks, not three: the tally fills fast once the growth push
          // lands, and the deadline leaves no slack for a leisurely reckoning.
          took: ["pivot_day_decide:growth|hedge"], delay: 2,
          if: (s) => !s.activities_pivot && s.launched,
        },
        choices: [
          {
            key: "pivot_now", label: "Pivot now — late beats never",
            reply: "zero at fifty. priya said we'd know, and we know. we pivot — now, with whatever runway is left.",
            journal: "Zero at fifty. We pivot late — $3k instead of $2k, runway nearly spent.",
            fx(s, e) {
              s.activities_pivot = true;
              s.pivot_week = s.week;
              s.cash = Math.max(0, s.cash - 3000);
              s.market_fit = clamp(s.market_fit + 8, 0, 100);
              applyActivitiesPivot(s);
              const jordan = e.cast.get("jordan");
              if (jordan.active) jordan.morale = clamp(jordan.morale + 3, 0, 100);
              // Alex converted himself watching the tally — he's been sketching
              // the plans screen for days, so the rebuild starts with momentum
              // (a bigger head start than the summit's, bought with worse odds
              // everywhere else: less cash, less runway, less time to relaunch).
              let teamEffort = 0;
              for (const id of ["alex", "jordan"]) {
                const c = e.cast.get(id);
                if (c && c.active) teamEffort += c.buildEffort;
              }
              s.pivot_effort_base = teamEffort - 2.0;
            },
          },
          {
            key: "ride", label: "Ride Plan A down",
            reply: "we made our call at the summit. we ride it.",
            journal: "54 matches, zero plans to meet — and I chose to ride Plan A anyway. Alex went quiet. Priya stopped texting.",
            effects: { marketFit: -15, signal: -15, char: { alex: { morale: -10 } } },
          },
        ],
        timeout: { weeks: 3, effects: { marketFit: -15, signal: -15, char: { alex: { morale: -12 } } } },
      },
      {
        // The bookend — only exists if the player called Maya during the slide.
        // Story class, not ambient: it's the pivot's designed payoff, and the
        // packed post-pivot weeks would otherwise starve it of a slot.
        id: "pivot_payoff_maya", char: "alex",
        text: (s) => s.beta_invited
          ? "small thing. maya — launch-day maya, the one you called — answered jordan's beta email. she just RSVP'd to a thursday climbing plan. the first person the old app lost is the first one back in the new one."
          : "small thing. maya — launch-day maya, the one you called — just RSVP'd to a thursday climbing plan. she came back on her own. someone must have told her it's a different app now.",
        // Yields Alex's single slot while the Jordan conversation is waiting on
        // it: both go eligible the week after the relaunch, and a bookend
        // notification must not outrank chapter 4's other climax. Bounded —
        // the confrontation resolves within its own 3-week patience either way.
        when: {
          if: (s, e) => s.pivot_shipped && !!s.maya_quote
            && !(s.jordan_confrontation_triggered && !e.done("jordan_confrontation")),
        },
        choices: [
          {
            key: "ack", label: "It is a different app now",
            reply: "it is a different app now. she told us exactly what was wrong with the old one — feels right that she's first back.",
            journal: "Maya RSVP'd to a Thursday climbing plan — the first user v1 lost is the first v2 wins back.",
            effects: { signal: 5 },
          },
        ],
        timeout: { weeks: 3 },
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.STORY = window.STORY || []).push(mod);
})();
