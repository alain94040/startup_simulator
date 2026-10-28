// ─────────────────────────────────────────────────────────────────────────────
// scoring.js — the endgame report card: a 100-point budget of moments.
//
// The card grades the three lessons in GOALS.md, each with a fixed share of
// 100 points: Build something people want (45), The team (30), Money (25).
// Each lesson is a list of moments, the decision points of the story, and
// each moment is worth fixed points. The final grade is the sum. There are no
// averages, so every moment weighs exactly what is written next to it.
//
// Three rules:
//   - Grade the decision, not the dice. Asking Jamie earns the points whether
//     or not his cash is free; David's "no" is caused by not studying Flare,
//     so those points sit on studying Flare.
//   - A moment never reached is worth zero once the run is over, and its line
//     says what kept the run from reaching it. Before the end it simply hasn't
//     been earned yet. Moments that are optional by nature (the consultants,
//     Alex's side project) are the exception: never meeting them costs nothing.
//   - The outcome is the verdict, not a grade line, with two terminal cases:
//     cash hitting zero fails the money lesson outright, Alex leaving fails
//     the team lesson outright, and either one caps the grade at 50.
//
// scoreGame(g) → [{ key, label, ref, score (0-100, for the letter), points,
//   max, verdict, notes, moments: [{ key, label, got, max, note, reached,
//   optional?, voided? }] }]. `voided`: zeroed by a terminal ending.
// finalGrade(g) → the sum of points, 0-100 (capped by gradeCap(g) when the
// company died). moment(g, key) → one moment. scoreSoFar(g) → the same
// lessons graded on the moments reached so far (the mid-run Score card).
// Pure logic, no DOM; dual export (module.exports / window.Scoring).
// Safe to call in any game state.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const round1 = v => Math.round(v * 10) / 10;

  // The communities feed (story/community.js): four threads, each promoted
  // into (a few signups, nothing learned), read, or (earned by reading the
  // first thread in the same community) followed up by DM.
  const THREADS = [
    { id: "community_datingapps", read: 2, dm: 2 },
    { id: "community_hn", read: 1, dm: 1 },
    { id: "community_flare_thread", read: 2, dm: 3 },
    { id: "community_ih", read: 1, dm: 2 },
  ];
  const THREAD_MAX = THREADS.reduce((n, t) => n + t.dm, 0);

  function runState(g) {
    const s = g.s;
    const bankrupt = !!s.game_over && !s.game_won && !s.deadline_passed && !s.cofounder_left;
    const ended = !!(s.game_over || s.game_won) || s.week >= (s.deadline_week || Infinity);
    // What kept the run from a moment it never reached. A run that ended
    // early names the ending; otherwise the moment names its own cause.
    const stop = s.cofounder_left ? "Alex left in week " + s.week + "."
      : bankrupt ? "the money ran out in week " + s.week + "." : null;
    return { bankrupt, ended, stop };
  }

  function scoreGame(g) {
    const s = g.s, t = id => g.took(id), d = id => g.done(id);
    const { bankrupt, ended, stop } = runState(g);
    const alexLeft = !!s.cofounder_left;

    // One moment. `reached` says whether the run got to it; an unreached
    // moment earns 0 and, once the run is over, says why (`why`, unless the
    // run ended early). An optional moment never met earns full points.
    // `hints`: the mid-run Score card's line for this moment, [good, mixed,
    // poor]. The final card's `note` names counts and people ("Read 1 of 4
    // community threads", "Two other checks went unasked for"), which mid-run
    // tells the player what's still out there; a hint only says how the habit
    // is going, never how many there are or what comes next.
    const moment = (key, label, max, m) => {
      if (!m.reached) {
        if (m.optional) return { key, label, max, got: max, reached: false, optional: true, note: null };
        const note = ended ? "Never reached: " + (stop || m.why) : null;
        return { key, label, max, got: 0, reached: false, note };
      }
      const r = { key, label, max, got: round1(clamp(m.got, 0, max)), reached: true, note: m.note || null };
      // Mid-run hints for scoreSoFar (the final card ignores them): `open`, the
      // call is still in front of the player; `soFarMax`, the points the
      // decided parts of a many-part moment are worth so far.
      if (m.open) r.open = true;
      if (m.soFarMax != null) r.soFarMax = m.soFarMax;
      if (m.hints) r.hints = m.hints;
      return r;
    };
    // A card the player has in front of them right now, not yet answered.
    const isOpen = id => Object.values(g.open).some(o => o && o.nodeId === id);

    // ── Build something people want: 45 ──────────────────────────────────────
    const chips = [s.maya_quote, s.rachel_answer, s.demo_question_seen, s.analytics_dropoff_seen].filter(Boolean).length;
    let listen = 0;
    for (const th of THREADS) listen += t(th.id + ":dm") ? th.dm : t(th.id + ":read") ? th.read : t(th.id + ":promote") ? -1 : 0;
    const faced = THREADS.filter(th => d(th.id));
    const promoted = faced.filter(th => t(th.id + ":promote")).length;
    const dms = faced.filter(th => t(th.id + ":dm")).length;
    const reads = faced.filter(th => t(th.id + ":read") || t(th.id + ":dm")).length;
    const FIT_ZERO = 30, FIT_FULL = 60;
    const fitGot = clamp((s.market_fit - FIT_ZERO) / (FIT_FULL - FIT_ZERO), 0, 1);
    const pivoted = t("pivot_day_decide:pivot") || t("pivot_fifty_verdict:pivot_now");
    const notLaunched = "the product never launched, so there was no trough to learn from.";
    const notPivoted = s.launched ? "the product was never questioned, so there was no v2 to ship." : notLaunched;
    const build = [
      moment("users", "Talked to users before scoping", 6, {
        hints: ["You asked users before deciding what to build.", "You asked a few users before deciding what to build.", "You decided what to build without asking anyone who'd use it."],
        reached: d("interviews") || d("waitlist_calls") || d("dev_plan"),
        why: "the run ended before the scope was set.",
        got: (t("interviews:interview") ? 4 : 0) + (t("waitlist_calls:call") ? 2 : 0),
        // Until the scope is set, only the calls already offered count.
        soFarMax: d("dev_plan") ? 6 : (d("interviews") ? 4 : 0) + (d("waitlist_calls") ? 2 : 0),
        note: t("interviews:interview")
          ? (t("waitlist_calls:call") ? "Interviewed users and called the waitlist before locking scope." : "Did the customer interviews before locking scope, but never called the waitlist.")
          : t("waitlist_calls:call") ? "Called the waitlist, but never sat down for real interviews." : "Built without ever interviewing a user.",
      }),
      moment("community", "Listened in the communities", 4, {
        hints: ["You've been listening to your market.", "You've listened to your market some of the time.", "Your market has been talking, and you haven't been listening."],
        reached: faced.length > 0,
        why: "the run ended before the communities started talking.",
        got: 4 * listen / THREAD_MAX,
        soFarMax: 4 * faced.reduce((n, th) => n + th.dm, 0) / THREAD_MAX,
        note: promoted && !reads ? "Posted the link in " + promoted + " thread" + (promoted > 1 ? "s" : "") + " and read none of them."
          : dms ? "Read what the forums said, and DM'd the people behind the comments (" + dms + "×)."
            : reads ? "Read " + reads + " of " + THREADS.length + " community threads" + (promoted ? ", promoted into " + promoted : "") + "."
              : "Scrolled past every thread where your market was talking.",
      }),
      // Priya's general market survey is half credit: it maps the field, but
      // not the one you're up against.
      moment("competitor", "Studied the competitor", 3, {
        hints: ["You studied the competition closely.", "You looked at the competition, but not closely.", "You haven't looked hard at the competition."],
        reached: d("flare_stealth") || d("mentor_competitor_bomb"),
        why: "the run ended before Flare made the news.",
        got: t("flare_stealth:dive") ? 3 : t("mentor_competitor_bomb:research") ? 1.5 : 0,
        note: t("flare_stealth:dive") ? "Took Flare's app apart instead of just reading their press."
          : t("mentor_competitor_bomb:research") ? "Mapped the market, but never opened Flare's app."
            : "Never looked at what the competition actually built.",
      }),
      moment("lean-plan", "Kept the plan lean", 5, {
        hints: ["You kept the plan lean.", "The plan took on more than it needed.", "The plan took on more than it needed."],
        reached: d("dev_plan"),
        why: "the run ended before the plan was chosen.",
        got: s.dev_plan === "lean" ? 5 : 0,
        note: s.dev_plan === "lean" ? "Kept the scope lean." : "Over-scoped the build, and the extra work cost weeks.",
      }),
      moment("edge", "Built the edge, bought the rest", 3, {
        hints: ["You spent build time where it mattered.", "Not every build-or-buy call went your way.", "Your build-or-buy calls went the wrong way."],
        reached: d("auth_choice") || d("matching_choice") || d("analytics_choice"),
        why: "the run ended before the build calls came up.",
        got: (t("auth_choice:buy") ? 1 : t("auth_forced:buy") ? 0.4 : 0)
          + (d("matching_choice") && !t("matching_choice:license") ? 1 : 0)
          + (t("analytics_choice:buy") ? 1 : 0),
        soFarMax: ["auth_choice", "matching_choice", "analytics_choice"].filter(d).length,
        note: [
          t("auth_choice:buy") ? "bought the logins" : t("auth_forced:buy") ? "built logins, then bought them anyway" : d("auth_choice") ? "built our own logins" : null,
          t("matching_choice:license") ? "licensed the matching engine, the one thing you can't rent" : d("matching_choice") ? "kept the matching engine" : null,
          t("analytics_choice:buy") ? "bought analytics" : d("analytics_choice") ? "launched blind on analytics" : null,
        ].filter(Boolean).join(", ").replace(/^./, c => c.toUpperCase()) + ".",
      }),
      // Full marks for launching by week 14, sliding to nothing by week 18.
      moment("launch", "Launched on time", 4, {
        hints: ["You launched on time.", "The launch came late.", "The launch came very late."],
        reached: !!s.launched,
        why: "the product never launched.",
        got: 4 * clamp((18 - s.launch_week) / 4, 0, 1),
        note: "Launched in week " + s.launch_week + (s.launch_week <= 14 ? "." : ", late: every week of build was a week the market didn't see it."),
      }),
      // Feature spree (shipped, or left on read so Alex shipped it anyway)
      // and copying Flare, 2 points each.
      moment("features", "Didn't chase features", 4, {
        hints: ["So far you've kept to the roadmap.", "Part of the roadmap went to chasing features.", "The roadmap went to chasing features."],
        reached: !!s.launched,
        why: notLaunched,
        got: (s.feature_spree ? 0 : 2) + (s.copied_competitor ? 0 : 2),
        note: s.feature_spree && s.copied_competitor ? "Shipped streaks at the graph and chased Flare's feature list. Neither moved anything."
          : s.feature_spree ? "Shipped streaks at the graph. The graph didn't move."
            : s.copied_competitor ? "Chased Flare's feature list instead of your own users."
              : "Held the roadmap until you knew why users leave.",
      }),
      moment("evidence", "Banked the evidence", 4, {
        hints: ["You came into the big decision with evidence.", "You came into the big decision with some evidence.", "You came into the big decision on a hunch."],
        reached: !!s.launched,
        why: notLaunched,
        got: chips,
        open: !(d("pivot_day_decide") || s.pivot_deferred || d("pivot_fifty_verdict")),
        note: chips === 4 ? "Banked all four pieces of evidence before the pivot night."
          : "Banked " + chips + " of the four pieces of evidence before the pivot night.",
      }),
      moment("pivot", "Pivoted on evidence", 6, {
        hints: ["You changed course when the evidence said to.", "You changed course, but late.", "You stayed the course when the evidence said to change it."],
        reached: d("pivot_day_decide") || !!s.pivot_deferred || d("pivot_fifty_verdict"),
        why: notLaunched,
        got: t("pivot_day_decide:pivot") ? 6 : t("pivot_fifty_verdict:pivot_now") ? 3 : 0,
        note: t("pivot_day_decide:pivot") ? "Called the pivot on the evidence, the night it was on the table."
          : t("pivot_fifty_verdict:pivot_now") ? "Pivoted late: the right call, weeks and a growth push dearer."
            : "Kept the old product when the evidence said to change it.",
      }),
      // Where all the listening lands: the fit of what shipped. Nothing at 30
      // (built on guesses), full marks at 60 (a thoroughly researched run).
      moment("v2-fit", "Shipped something people want", 6, {
        hints: ["What you shipped is built on what users told you.", "What you shipped is part listening, part guessing.", "What you shipped is mostly guesses."],
        reached: !!s.pivot_shipped,
        why: pivoted ? "v2 never reached users before the deadline." : notPivoted,
        got: 6 * fitGot,
        note: "Market fit of what shipped: " + Math.round(s.market_fit) + "/100"
          + (fitGot >= 1 ? ", built on what users told you." : fitGot >= 0.5 ? ", partly listened, partly guessed." : ", mostly built on guesses.")
          + (s.pivot_week != null && s.pivot_ship_week - s.pivot_week > 4 ? " It took " + (s.pivot_ship_week - s.pivot_week) + " weeks after the pivot call." : ""),
      }),
    ];

    // ── The team: 30 ──────────────────────────────────────────────────────────
    const coNodes = [];
    for (const [id, node] of g.nodes) if (node.char === "alex" || node.char === "founders") coNodes.push(id);
    let answered = 0, ignored = 0;
    for (const id of coNodes) if (d(id)) g.outcome(id) === "@ignored" ? ignored++ : answered++;
    const jordanAsked = d("pivot_alex_door") || d("jordan_door_again");
    const signed = !!s.jordan_equity && !s.equity_tabled;
    // Sitting down when Jordan asks and then opening it up is the full 2;
    // leaving her invitation on read first halves it.
    const eqOpened = t("equity_dance:open_up") ? (t("equity_open:open") ? 2 : 1) : 0;
    const eqRuling = g.outcome("equity_impasse");
    const eqDodge = t("equity_dance:shortcut") ? "Opened with 'equal thirds and move on'" : "Said nothing when the room opened";
    const equityPending = !s.jordan_equity && !s.equity_tabled
      && [...g.nodes.keys()].some(id => /^equity_|^incorporate/.test(id) && isOpen(id));
    const eqHeld = eqRuling && /^hold_/.test(eqRuling) ? (s.equity_skipped ? 1 : 3) : eqRuling && /^cave_/.test(eqRuling) ? 1 : 0;
    const team = [
      // The equity talk (GOALS.md: it can't end with everyone happy). Three
      // parts: opening the real conversation instead of the "equal thirds and
      // move on" shortcut (2), holding a position through the pushback
      // instead of caving to whoever pushed last or tabling it (3), and a
      // split on paper (2). An offer left on read lets silence make it, so
      // holding that default later is worth only what a cave is. Tabling
      // it zeroes the whole moment.
      moment("equity-split", "Negotiated the equity split", 7, {
        hints: ["You had the equity talk for real, and held your call.", "The split got done, but you gave ground you shouldn't have.", "The equity talk never really happened."],
        reached: d("equity_open") || !!s.equity_proposal,
        why: "the run ended before the split came up.",
        // Tabling is worse than never assembling the room: both cases were
        // made and the founder still blinked, so it earns nothing at all.
        got: s.equity_tabled ? 0 : eqOpened + eqHeld + (signed ? 2 : 0),
        open: equityPending,
        note: s.equity_tabled ? "Got the whole room through it twice, then tabled the split 'until after launch'. The default thirds went into the paperwork unexamined."
          : !s.jordan_equity ? "The split was never signed. Every later conversation got harder."
            : s.equity_skipped ? "Never made your own offer, so silence did: the split defaulted to even thirds."
              : eqRuling === "@ignored" ? "Made an offer, heard the pushback, then never answered. Your number stuck, and everyone saw you go quiet."
                : eqOpened === 1 && eqHeld === 3 ? "Left Jordan's invitation to talk on read, then heard everyone out and held your call once it came to you."
                : !eqOpened && eqHeld < 3 ? eqDodge + ", then gave in to whoever pushed last. Nobody got a real answer."
                  : !eqOpened ? eqDodge + ", but held your number once the real asks came out. Someone left unhappy, and that was the job."
                    : eqHeld < 3 ? "Heard everyone out, then gave in to whoever pushed last. The split was signed, but the hard part was skipped."
                      : "Heard everyone out, made the call and held it. Someone left unhappy, and the split was signed while everyone was still friends.",
      }),
      // A run where Alex never brought it up has nothing to grade.
      moment("side-project", "Asked Alex to focus", 3, {
        hints: ["You asked Alex for his focus when it mattered.", "You asked Alex for his focus, but late.", "You let Alex's attention drift."],
        reached: d("alex_side_project"), optional: true,
        got: t("alex_side_project:pause") ? 3 : t("alex_side_project_escalation:talk") ? 1.5 : 0,
        note: t("alex_side_project:pause") ? "When Alex told you about his side project, you asked him to drop it until launch."
          : t("alex_side_project_escalation:talk") ? "Let Alex's side project slide until it was 15 hours a week, then told him to commit."
            : "Let Alex's side project slide. The build slowed with it.",
      }),
      moment("answered", "Kept answering Alex", 4, {
        hints: ["You've kept answering Alex.", "Some of Alex's messages went unanswered.", "Alex has mostly been talking to himself."],
        reached: answered + ignored > 0 && !alexLeft,
        why: "",
        got: 4 * answered / (answered + ignored),
        note: Math.round(100 * answered / Math.max(1, answered + ignored)) + "% of Alex's messages got an answer.",
      }),
      // The Jordan question, asked on the pivot night (or when Alex first
      // raises it after a late pivot). What's graded is whether the founder
      // finished the sentence, and when.
      moment("jordan-talk", "Had the conversation with Jordan", 12, {
        hints: ["You had the hardest conversation, and finished it.", "You had the hardest conversation, but late.", "You haven't finished the hardest conversation."],
        reached: jordanAsked && !alexLeft,
        why: pivoted ? "the pivot came too late for Alex to raise Jordan."
          : s.launched ? "the product was never questioned, so the Jordan question never came up." : notLaunched,
        got: s.jordan_resolved ? (s.jordan_kept ? 7 : 12) : 0,
        note: s.jordan_resolved
          ? (s.jordan_kept
            ? "Let the Jordan question slide on the pivot night, then had the conversation two weeks later. Late, and it counted."
            : "Had the conversation with Jordan the night Alex raised it, before v2 could slip.")
          : s.jordan_folded ? "Jordan asked if you were asking her to leave. You said no, and v2 kept slipping at her part-time pace."
            : s.jordan_bargained ? "Told Jordan it wasn't working, then took her deal for more time. v2 kept slipping at her part-time pace."
              : "Alex raised Jordan. You never had the conversation, and v2 moved at her part-time pace.",
      }),
      // Asking what was going on changes nothing about the decision and
      // everything about what it cost.
      moment("jordan-ending", "Ended it well with Jordan", 4, {
        hints: ["You ended it with care.", "You ended it coldly.", "You ended it coldly."],
        reached: !!s.jordan_resolved,
        why: "the conversation with Jordan never happened.",
        got: s.jordan_cold_exit ? 1 : 4,
        note: s.jordan_cold_exit
          ? "Said 'I'm sorry' and nothing else. She ended it herself and blocked you, with no handoff."
          : "Asked what was actually going on before finishing, and heard that nothing had changed since week one.",
      }),
    ];

    // ── Money: 25 ─────────────────────────────────────────────────────────────
    let low = 10000;
    for (const wk of g.ledger) low = Math.min(low, wk.balanceAfter);
    low = Math.min(low, s.cash);
    const asks = [
      ["ff_family:ask", "ff_family_2:ask", "ff_family_3:ask"].some(t) && "Mom and Dad",
      t("ff_friend_ask:ask") && "Jamie",
      t("ff_mentor_pitch:pitch") && "David",
    ].filter(Boolean);
    const sharks = ["consultant_growth", "consultant_brand"].filter(id => t(id + ":hire")).length;
    const contract = s.contract_weeks || 0;
    const money = [
      moment("ff-asks", "Raised from friends and family", 9, {
        hints: ["You've asked for the money you need.", "You've left some money unasked for.", "You haven't asked anyone for money."],
        reached: d("ff_family") || d("ff_family_2") || d("ff_family_3") || d("ff_friend") || d("ff_mentor"),
        why: "the run ended before anyone offered.",
        got: 3 * asks.length,
        // Jamie and David each offer first (coffee, lunch) and only come to
        // the money weeks later; their check counts once that ask is answered,
        // or once the first offer was left on read and no ask will come.
        soFarMax: 3 * [d("ff_family") || d("ff_family_2") || d("ff_family_3"),
          d("ff_friend_ask") || (d("ff_friend") && !t("ff_friend:tell")),
          d("ff_mentor_pitch") || (d("ff_mentor") && !t("ff_mentor:lunch"))].filter(Boolean).length,
        note: asks.length === 3 ? "Asked Mom and Dad, Jamie and David. The money bought the weeks the product needed."
          : asks.length ? "Asked " + asks.join(asks[0].includes(" and ") && asks.length > 1 ? ", and " : " and ") + ". " + (3 - asks.length === 1 ? "One other check" : "Two other checks") + " went unasked for."
            : "Never asked anyone for money.",
      }),
      // Kevin and Brett sell nothing an early company needs.
      moment("sharks", "Stayed away from the sharks", 3, {
        hints: ["You turned down people selling what you didn't need.", "You paid someone selling what you didn't need.", "You paid people selling what you didn't need."],
        reached: d("consultant_growth") || d("consultant_brand"), optional: true,
        got: 3 - 1.5 * sharks,
        note: sharks ? "Paid " + (sharks === 2 ? "two consultants" : "a consultant") + " who cold-pitched you. Be careful of sharks: an early company draws people selling services it doesn't need, and every dollar was runway."
          : "Turned down the consultants who cold-pitched you.",
      }),
      // Contract weeks keep the lights on, but investors ask whether the
      // founders are full-time. Not a hard rule, a cost on the card.
      moment("full-time", "Stayed full-time", 3, {
        hints: [null, "You took outside work to make rent.", "You took outside work to make rent."],
        reached: true,
        got: 3 - 1.5 * contract,
        note: contract ? "Took " + (contract === 2 ? "two weeks" : "a week") + " of contract work to make rent. Investors ask whether the founders are full-time, and this answer is a red flag: raise the money so you don't have to." : null,
      }),
      // Two months of burn ($4,000) at the lowest point is full marks.
      moment("runway", "Kept a cushion", 2, {
        hints: ["You've kept a cushion in the bank.", "The bank got thin.", "The bank nearly ran dry."],
        reached: true,
        got: 2 * clamp(low / 4000, 0, 1),
        note: "Lowest bank balance: $" + Math.max(0, Math.round(low)).toLocaleString() + ".",
      }),
      moment("paperwork", "Incorporated and signed", 3, {
        hints: ["The company is real on paper.", "The paperwork is only half done.", "The company isn't real on paper."],
        reached: d("incorporate") || d("incorporate_again") || d("equity_open"),
        why: "the run ended before the paperwork came up.",
        got: (s.incorporated ? 1.5 : 0) + (s.jordan_equity && !s.equity_tabled ? 1.5 : 0),
        open: equityPending,
        note: !s.incorporated ? "Never formed a legal entity, so there is no cap table to keep clean."
          : s.jordan_equity && !s.equity_tabled ? "Incorporated and put the split on paper before the work belonged to nobody."
            : "Incorporated, but the split never made it onto paper.",
      }),
      moment("buyback", "Bought back Jordan's stake", 3, {
        hints: ["The cap table survived the exit.", "The cap table still carries someone who left.", "The cap table still carries someone who left."],
        reached: !!s.jordan_resolved,
        why: "the conversation with Jordan never happened.",
        got: s.jordan_equity_gifted || s.jordan_cleanup_needed ? 0 : 3,
        // The buyback is its own card after the firing (Alex flags the cap
        // table); until it's answered, the stake isn't a call yet.
        open: !!s.jordan_cleanup_needed && !s.jordan_equity_gifted && !d("jordan_cap_table"),
        note: s.jordan_equity_gifted ? "Gave a departed co-founder her full stake rather than have the buyback conversation."
          : s.jordan_cleanup_needed ? "A departed co-founder still owns her stake, fully vested, no cliff. Anyone doing diligence will stop there."
            : "Bought back the departed co-founder's stake, and the cap table survived the exit.",
      }),
      moment("app-store", "Moved the App Store listing", 2, {
        hints: ["You tied up the loose ends of the exit.", "The exit left loose ends.", "The exit left loose ends."],
        reached: d("firing_shares") || d("firing_shares_2") || !!s.jordan_cold_exit,
        why: "the conversation with Jordan never happened.",
        got: s.appstore_on_jordan || s.app_was_delisted ? 0 : 2,
        note: s.app_was_delisted ? "Jordan closed her developer account and the app vanished from the App Store. The listing had never been moved off it."
          : s.appstore_on_jordan ? "The App Store listing is still on a departed co-founder's personal developer account."
            : "Moved the App Store listing off her personal account before she signed anything.",
      }),
    ];

    // The terminal cases. Cash hitting zero is the money lesson's failure,
    // and losing Alex is the team lesson's: the run that ended that way
    // can't keep the points it banked before.
    const zero = (list, note) => {
      for (const m of list) { m.got = 0; m.note = null; m.hints = null; m.voided = true; }
      list[0].note = note; list[0].hints = [note, note, note];
    };
    if (bankrupt) zero(money, "Cash hit zero in week " + s.week + ". Everything else in this lesson is a footnote to that.");
    if (alexLeft) zero(team, "Alex left in week " + s.week + ". Everything else in this lesson is a footnote to that.");

    const cat = (key, label, ref, moments, verdicts) => {
      const points = round1(moments.reduce((n, m) => n + m.got, 0));
      const max = moments.reduce((n, m) => n + m.max, 0);
      // A lesson with a moment the founder flinched on (under three quarters
      // of a sizeable moment's points) can't read as mastered: its letter
      // stops at a B and its verdict at the middle line, so the card never
      // praises the lesson while its takeaway says "gave in". The points,
      // and so the final grade, are untouched.
      const flinched = moments.some(m => m.reached && !m.optional && m.max >= 3 && m.got < 0.75 * m.max);
      const raw = Math.round(100 * points / max);
      const score = flinched ? Math.min(raw, 84) : raw;
      const verdict = score >= 70 && !flinched ? verdicts[0] : score >= 40 ? verdicts[1] : verdicts[2];
      return { key, label, ref, points, max, score, verdict, moments,
        notes: moments.filter(m => m.note).map(m => m.note) };
    };
    return [
      cat("build", "Build something people want", "📚 Steve Blank / PG, \"How to Get Startup Ideas\"", build,
        [pivoted || !s.launched ? "You listened first, built second, and turned the ship while you still could."
          : "You listened first and built lean, then kept the old product when the evidence said to change it.",
        "Some of what users said reached the roadmap; some of it didn't.",
        "The product was built on guesses and defended against evidence."]),
      cat("team", "Have the hard conversations", "📚 Wasserman, The Founder's Dilemmas", team,
        ["You had the talks nobody wants to have, early, and yourself.",
          "You had most of the hard talks, but flinched on at least one.",
          "The hardest conversations settled themselves by default. That bill comes due."]),
      cat("money", "Don't run out of money", "📚 PG, \"Default Alive or Default Dead?\"", money,
        [bankrupt ? "Cash hit zero." : "Raised what you needed, spent it on the product, kept the paper clean.",
          bankrupt ? "Cash hit zero." : "The money held, but it cost you somewhere.",
          bankrupt ? "Cash hit zero. Everything else became irrelevant." : "The money and the paperwork were an afterthought, and it shows."]),
    ];
  }

  // A company that died (cash at zero, or Alex gone) can't grade above a D,
  // however well it played the weeks before: a late bankruptcy otherwise
  // keeps nearly every point it banked.
  const DEAD_CAP = 50;
  function gradeCap(g) {
    const { bankrupt } = runState(g);
    if (!bankrupt && !g.s.cofounder_left) return null;
    return { cap: DEAD_CAP, note: "The company didn't survive, so the grade is capped at " + DEAD_CAP + "." };
  }

  // The final grade: the sum of every moment's points, out of 100.
  function finalGrade(g) {
    const sum = Math.round(scoreGame(g).reduce((n, c) => n + c.points, 0));
    const cap = gradeCap(g);
    return cap ? Math.min(sum, cap.cap) : sum;
  }

  // The score so far, for a run still in progress (or one the player ended
  // early): each lesson graded only on the moments the run has reached, so a
  // week-9 card isn't an F for everything still ahead. Optional moments never
  // met are left out rather than given away. `score` is null when nothing in
  // that lesson has been reached yet (the overall `score` is 100 until any
// lesson is); `ahead` counts the moments still to come, and `hint` is one
// vague line on how the lesson is going (the moment that cost the most, or
// failing that the biggest one done well), with no counts and nothing about
// what's still ahead.
  // Same flinch cap as the final card, so the letter can't praise a lesson
  // whose takeaway says "gave in".
  const STANDING = new Set(["full-time", "runway", "answered"]);
  // The mid-run card's second line per lesson: how much is still to come, by
  // stage (most of it, about half, the last few calls, none). Never names a
  // moment or counts them.
  const OUTLOOK = {
    // Build reads off the launch, not the stage: until you ship, you can't
    // know whether you built something people want.
    build: [launched => launched ? "You've launched, but whether people want it is still an open question."
      : "But until you ship, you won't know if you built something people want.",
      launched => launched ? "You've launched, but whether people want it is still an open question."
        : "But until you ship, you won't know if you built something people want.",
      "A few calls here are still ahead.",
      null],
    team: ["But the team hasn't faced a real challenge yet.",
      "But the team hasn't faced a real challenge yet.",
      "A few loose ends here are still ahead.",
      null],
    money: ["But the money hasn't really been tested yet.",
      "There's more to raise, and more to get right on paper, ahead.",
      "A few calls here are still ahead.",
      null],
  };
  function scoreSoFar(g) {
    let got = 0, max = 0, made = 0, ahead = 0;
    const lessons = scoreGame(g).map(c => {
      // Standing moments (never took contract work, never ran low, answered
      // Alex) are "reached" from week 1, before the player has decided
      // anything; on their own they'd hand a fresh run an A. They count only
      // once the lesson has a real call in it.
      // A call still in front of the player isn't graded yet (`open`), and a
      // many-part moment is graded on its decided parts (`soFarMax`), so the
      // score never drops for a decision nobody has been asked to make.
      const counted = m => m.reached && !m.optional && !m.open && m.soFarMax !== 0;
      const calls = c.moments.filter(m => counted(m) && !STANDING.has(m.key));
      const reached = calls.length ? c.moments.filter(counted) : [];
      const left = c.moments.filter(m => !m.optional && (!m.reached || m.open)).length;
      const worth = m => m.soFarMax != null ? Math.min(m.max, m.soFarMax) : m.max;
      const p = reached.reduce((n, m) => n + Math.min(m.got, worth(m)), 0), mx = reached.reduce((n, m) => n + worth(m), 0);
      got += p; max += mx; made += reached.length; ahead += left;
      const flinched = reached.some(m => worth(m) >= 3 && m.got < 0.75 * worth(m));
      const raw = mx ? Math.round(100 * p / mx) : null;
      const score = raw == null ? null : flinched ? Math.min(raw, 84) : raw;
      const tier = m => { const r = m.got / worth(m); return r >= 0.99 ? 0 : r >= 0.5 ? 1 : 2; };
      const hinted = reached.filter(m => m.hints && m.hints[tier(m)]);
      const missed = hinted.filter(m => worth(m) - m.got >= 1).sort((x, y) => (worth(y) - y.got) - (worth(x) - x.got));
      const best = hinted.filter(m => tier(m) === 0).sort((x, y) => worth(y) - worth(x));
      const take = missed[0] || best[0];
      const hint = take ? take.hints[tier(take)] : null;
      // How much of the lesson is still ahead, by the weight of its calls
      // (standing moments run the whole game, so they don't count), said
      // without naming any of it: a good start in week 5 isn't a lesson won.
      const all = c.moments.filter(m => !STANDING.has(m.key) && !(m.optional && !m.reached));
      const total = all.reduce((n, m) => n + m.max, 0);
      const done = all.filter(m => m.reached && !m.open).reduce((n, m) => n + worth(m), 0);
      const share = total ? done / total : 1;
      const stage = share < 1 / 3 ? 0 : share < 2 / 3 ? 1 : share < 0.99 ? 2 : 3;
      let outlook = score == null ? null : OUTLOOK[c.key][stage];
      if (typeof outlook === "function") outlook = outlook(!!g.s.launched);
      // Money: while the runway doesn't reach the deadline, that is the
      // outlook, whatever stage the lesson is at.
      if (score != null && c.key === "money" && g.runwayWeeks < g.s.deadline_week - g.s.week)
        outlook = "But at this burn, you don't know yet if the money will last until the deadline.";
      // "…, but you gave ground. But you haven't…" reads twice: one "but" is enough.
      if (outlook && /\bbut\b/i.test(hint || "")) outlook = outlook.replace(/^But (.)/, (_, ch) => ch.toUpperCase());
      return { key: c.key, label: c.label, ref: c.ref, score, ahead: left, hint, outlook, moments: reached };
    });
    // Overall: every run starts at an A (no bad call made yet) and moves
    // with each lesson as soon as it has a call, so the first real grade lands
    // right after the equity talk instead of weeks later.
    return { lessons, score: max ? Math.round(100 * got / max) : 100, made, ahead };
  }

  function moment(g, key) {
    for (const c of scoreGame(g)) for (const m of c.moments) if (m.key === key) return m;
    return null;
  }

  const api = { scoreGame, scoreSoFar, finalGrade, gradeCap, moment, DEAD_CAP };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.Scoring = api;
})();
