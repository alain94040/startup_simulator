// ─────────────────────────────────────────────────────────────────────────────
// story/jordan_arc.js — the wrong-co-founder arc: Jordan drifts, Alex covers,
// and the player either has the conversation or lets it rot. Firing her leaves
// her stake on the cap table (s.jordan_cleanup_needed) — the vesting lesson the
// investors' diligence flags until a lawyer cleans it up.
//
// Every drift beat lives on Alex's thread (he's the one telling you) but
// mutates Jordan via effects.char.jordan / e.cast.get("jordan"). Answering the
// confrontation — telling Alex you'll have the talk — opens the firing scene in
// story/firing.js.
//
// Timing note: the drift waits until pivot day has resolved — the pivot marks
// her iOS work obsolete, and THEN she checks out. Starting it earlier, mid
// dev-spine, would silently disable Jordan's own direction cards. Waiting
// keeps the dev arc she owns intact, keeps her present for the launch scene
// (whose beats need her), and keeps the drift from eating the slide's
// evidence weeks.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const mod = {
    nodes: [
      {
        // The pivot deleted Jordan's entire body of work: applyActivitiesPivot
        // marks matching_algo and ios_ui obsolete, then hands her the one new
        // screen (plans_ui). This beat is where the player learns she hasn't
        // started it. It should read as sympathetic — her work was thrown away
        // by a call the PLAYER made, and she is a casualty of a good decision,
        // not a slacker.
        id: "jordan_drift_start", char: "alex",
        // Two framings. After a real pivot the drift has a specific cause —
        // her work was deleted and she owns the one screen v2 needs. On the
        // deferred / growth paths there is no plans_ui and no obsolescence, so
        // it stays the older, vaguer version rather than deleting the arc (and
        // the cap-table lesson with it) from every non-pivot run.
        text: (s) => s.activities_pivot
          ? "something i should flag. the pivot wrote off basically everything jordan built — the profile matching, the whole ios browse flow. months of her evenings, obsolete in one saturday.\n\nshe's got the plans screen now. it's the only piece of v2 that isn't mine. she hasn't opened the branch."
          : "jordan's been slower this week. said she's swamped at work. i covered the iOS push — took me two days. not complaining, just flagging it.",
        when: {
          if: (s) => !s.jordan_drifting && !s.jordan_resolved && !s.jordan_quit && s.launched
            && !s.pivot_shipped
            && (s.activities_pivot || s.pivot_summit_done || s.pivot_deferred),
        },
        choices: [
          {
            key: "talk", label: "Talk to Jordan directly",
            journal: "Talked to Jordan about the plans screen. She was apologetic — said the pivot knocked the wind out of her and she'd pick it up this week. I'm not sure she will.",
            effects: {
              flags: { jordan_drifting: true, jordan_blocking_ui: true },
              char: { jordan: { morale: -10 }, alex: { morale: -5 } },
            },
            fx: () => "Jordan was apologetic. Said the pivot knocked the wind out of her, and she'd pick the branch up this week. You're not sure she will.",
          },
          {
            key: "cover", label: "Ask Alex to take it on top of his own work",
            journal: "Asked Alex to take the plans screen on top of the matching rebuild. He said he'd try. Two pieces of v2, one engineer, and the deadline didn't move.",
            effects: {
              flags: { jordan_drifting: true, jordan_blocking_ui: true },
              char: { alex: { morale: -12 } },
            },
            fx: () => "Alex said he'd try. That's both halves of v2 on one engineer, and the deadline didn't move.",
          },
        ],
        timeout: {
          weeks: 3,
          effects: {
            flags: { jordan_drifting: true, jordan_blocking_ui: true },
            char: { alex: { morale: -8 } },
          },
        },
      },
      {
        // Each repeat names what is BLOCKED, not that she is generally slow:
        // the relaunch is sitting behind one screen nobody is writing.
        id: "jordan_drag", char: "alex",
        text: (s, e) => !s.activities_pivot
          ? (e.timesResolved("jordan_drag") === 0
            ? "pushed the iOS release back again. jordan said she'd review my PR by tuesday — it's friday. i've covered it, but this is the second time this sprint."
            : "user reported a crash on iphone 12. jordan's the only one who knows that part of the codebase. i've been waiting two days. this can't keep going.")
          : e.timesResolved("jordan_drag") === 0
            ? "matching's repointed. i pushed it to staging this morning and it works.\n\nthe plans screen is still an empty branch. i asked jordan for a status and got a thumbs up emoji. we cannot relaunch without that screen — it IS the product now."
            : "second week on the same sentence: staging is green except for jordan's screen.\n\ni can't just take it either. she scoped it, the designs are in her head, and every hour i spend reverse-engineering that is an hour off the matching work. this can't keep going.",
        when: {
          after: ["jordan_drift_start"], delay: 1, cooldown: 3,
          if: (s, e) => s.jordan_drifting && !s.jordan_resolved && !s.jordan_quit
            && e.timesResolved("jordan_drag") < 2
            && e.timesResolved("jordan_confrontation") === 0,
        },
        choices: [
          {
            key: "talk", label: "Talk to Jordan directly",
            journal: "Sat down with Jordan. She heard the weight of it. Alex noticed I followed up.",
            // Alex escalating IS what puts the conversation on the table, so it
            // lands the same week rather than at the next boundary — his slot is
            // free the moment this is answered. Costs the player their second
            // action if they take it now, which is the point: he forced it.
            effects: {
              flags: { jordan_confrontation_triggered: true },
              char: { alex: { morale: 5 } },
              surface: "jordan_confrontation",
            },
            fx: () => "Sat down with Jordan. She heard the weight of it. Alex noticed you followed up — the real conversation is coming.",
          },
        ],
        // Left unanswered twice, Alex breaks — and forces the conversation himself.
        timeout: {
          weeks: 3,
          fx(s, e) {
            const alex = e.cast.get("alex");
            if (e.timesResolved("jordan_drag") >= 2) {
              alex.morale = 5;
              alex.trust = clamp(alex.trust - 20, 0, 100);
              s.jordan_confrontation_triggered = true;
              e.schedule({
                in: 1, char: "alex",
                say: { char: "alex", text: "you've been aware of the jordan situation for weeks. i've been holding a finished backend behind an empty branch and saying nothing. it's been affecting me more than i let on." },
              });
            } else {
              alex.morale = clamp(alex.morale - 12, 0, 100);
            }
          },
        },
      },
      {
        // Only exists if the drift caught the launch un-shipped: web works,
        // iOS doesn't, and a dating app without mobile is a real handicap.
        id: "jordan_launch_blocker", char: "alex",
        text: "backend's solid. web works end to end. i've been ready to ship for two weeks. but we can't launch a dating app without mobile — nobody will use it. jordan needs to finish the iOS build or we need to talk about what's actually happening.",
        when: {
          if: (s) => s.jordan_drifting && !s.jordan_resolved && !s.jordan_quit && s.productPhase === "product"
            && !s.launched && !s.ios_unblocked,
        },
        choices: [
          {
            key: "web_only", label: "Launch web-only — fix iOS later",
            effects: { signal: -10 },
            fx(s) {
              s.launched = true;
              s.launch_week = s.week;
              if (s.items) for (const k of Object.keys(s.items)) {
                const it = s.items[k];
                if (it && (it.status === "active" || it.status === "todo")) { it.status = "done"; it.quality = it.quality || "rough"; }
              }
              return "Launched. Web-only. A dating app without iOS is a real handicap — early retention will show it.";
            },
          },
          {
            key: "confront", label: "Confront Jordan — this has to be resolved",
            journal: "Decided to confront Jordan about the launch blocker. This conversation is overdue.",
            effects: { flags: { jordan_confrontation_triggered: true } },
            fx: () => "Agreed. This conversation is overdue.",
          },
        ],
        // Ignored: Alex ships web-only on his own — worse, and without you.
        timeout: {
          weeks: 3,
          effects: { signal: -15 },
          fx(s) {
            s.launched = true;
            s.launch_week = s.week;
            if (s.items) for (const k of Object.keys(s.items)) {
              const it = s.items[k];
              if (it && (it.status === "active" || it.status === "todo")) { it.status = "done"; it.quality = it.quality || "rough"; }
            }
          },
        },
      },
      {
        // Alex's message, answered in Alex's thread: the player agrees to have
        // the conversation, and that agreement opens the scene. It deliberately
        // is NOT a founder-thread card — a "Your move" card can be skimmed past,
        // and this is the one call in chapter 4 that must be made to somebody's
        // face. Alex's slot is contested here, which is why pivot_payoff_maya
        // yields to this beat (see story/pivot_day.js).
        id: "jordan_confrontation", char: "alex",
        text: (s, e) => {
          const pct = s.equity_proposal === "33/33/33" ? "33%" : s.equity_proposal === "50/25/25" ? "25%" : "20%";
          if (!s.activities_pivot) {
            return "i need to say something out loud. jordan's been part-time for two months. i'm covering her work and mine. she has "
              + pct + " of the company and i don't think she's earning it anymore.\n\ni can't be the one to have this conversation. you can.";
          }
          return "i need to say something out loud, and then i'll drop it.\n\nv2 has been ready to relaunch for weeks except for one screen, and the person who owns that screen hasn't written a line of it. we are burning the runway we pivoted with. she has "
            + pct + " of this company and right now she is the reason we can't ship.\n\ni can't be the one to have this conversation. you can.";
        },
        when: {
          cooldown: 2,
          // Triggered by following up on the drag — or, if the drag was left to
          // fester, by inertia ~8 weeks into the drift (relative, not the old
          // absolute week-20 gate, which predates the drift's post-pivot timing).
          if: (s, e) => s.jordan_drifting && !s.jordan_resolved && !s.jordan_quit
            && (s.jordan_confrontation_triggered
              || (e.weeksSince("jordan_drift_start") >= 3 && s.week >= (s.jordan_confrontation_defer_until || 0))),
        },
        choices: [
          {
            // The door, not the resolution: everything that used to happen in
            // this fx now happens in the scene (story/firing.js), where Jordan
            // is actually in the room. The old one-click fire never let the
            // player say a word to her.
            key: "fire", label: "You're right. I'll talk to her tonight.",
            reply: "you're right, and it's mine to do. i'm messaging her tonight.",
            journal: null,
            effects: { scene: "firing" },
            fx: () => null,
          },
          {
            key: "defer", label: "Not yet — put it off another month",
            journal: "Put the Jordan conversation off another month. Alex went quiet. We both know how this ends.",
            effects: { char: { alex: { morale: -8 } } },
            fx(s) {
              s.jordan_confrontation_triggered = false;
              s.jordan_confrontation_defer_until = s.week + 2;
              return "Alex went quiet. Jordan will try again. You both know how this ends.";
            },
          },
        ],
        // Jordan stays — only the player can fire her. Alex can't take it anymore.
        timeout: { weeks: 3, fx(s, e) { const a = e.cast.get("alex"); a.morale = 0; a.trust = clamp(a.trust - 25, 0, 100); } },
      },
      {
        // The vesting bill. Until the lawyer cleans it up, Marcus's diligence
        // bounces the round (see seed_pitch in story/fundraising.js).
        id: "jordan_cap_table", char: "alex",
        text: (s) => {
          const pct = s.equity_proposal === "33/33/33" ? "33%" : s.equity_proposal === "50/25/25" ? "25%" : "20%";
          return s.jordan_quit
            ? "jordan's " + pct + " is still on the cap table — fully vested, no cliff, and she left on her own terms so there's no exit agreement to hang a buyback on. any investor who looks will ask. a lawyer buys us a negotiation, not a signature."
            : "jordan's " + pct + " is still on the cap table — fully vested, no cliff. any investor who looks at this will ask questions we can't answer well. we need a lawyer to clean it up.";
        },
        // Recurs until cleaned up — a one-shot card would let a single defer
        // lock the round out permanently.
        when: { cooldown: 4, if: (s) => (s.jordan_resolved || s.jordan_quit) && s.jordan_cleanup_needed },
        choices: [
          {
            // Gated on being able to survive it. The cap-table lesson is a cost
            // you plan for, not a bankruptcy trap: the bill lands the week after
            // the firing, when the relaunch has not earned anything yet, and
            // paying it out of a $2k balance ends the run two weeks from the
            // deadline. A lawyer wants a retainer you can actually cover.
            key: "lawyer", label: "Hire a lawyer — $2,000",
            if: (s) => s.cash >= 2000 + 500 * 3,
            payee: "Lawyer",
            journal: "Hired a lawyer to clean up Jordan's equity. $2,000, buyback agreement signed. Cap table clean.",
            effects: { cash: -2000, flags: { jordan_cleanup_needed: false } },
            fx: () => "Lawyer drafted a buyback agreement. Jordan signed for a nominal amount. Cap table clean.",
          },
          {
            // The guilt payment, moved out of the firing scene: on this card
            // it is a cold decision with a price on it, not a midnight flinch.
            key: "keep", label: "Let her keep it — she earned the early part",
            journal: "Decided to let Jordan keep her full stake. It felt like the decent thing. It is also the largest cheque this company will ever write, and it is written to someone who does not work here.",
            effects: { flags: { jordan_cleanup_needed: false, jordan_equity_gifted: true } },
            fx: () => "Left her stake alone. Nothing to clean up now — a departed co-founder simply owns a fifth of the company, forever.",
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
