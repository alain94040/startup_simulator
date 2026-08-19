// ─────────────────────────────────────────────────────────────────────────────
// v2/story/jordan_arc.js — the wrong-co-founder arc: Jordan drifts, Alex covers,
// and the player either has the conversation or lets it rot. Firing her leaves
// her stake on the cap table (s.jordan_cleanup_needed) — the vesting lesson the
// investors' diligence flags until a lawyer cleans it up.
//
// The drift beats live on Alex's thread (he's the one telling you) but mutate
// Jordan via effects.char.jordan / e.cast.get("jordan"). The confrontation
// itself sits on the FOUNDER's thread — it's the founder's call, and Alex's
// chapter-4 slot is too contested to carry it (see the note on that node).
// Answering it opens the firing scene in story/firing.js.
//
// v2 timing note: the old arc could start at week 8, mid-dev-spine, silently
// disabling Jordan's own direction cards. Here the drift waits until pivot day
// has resolved — the pivot marks her iOS work obsolete, and THEN she checks
// out. This keeps the dev arc she owns intact, keeps her present for the
// launch scene (whose beats need her), and keeps the drift from eating the
// slide's evidence weeks.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const mod = {
    nodes: [
      {
        id: "jordan_drift_start", char: "alex",
        text: "jordan's been slower this week. said she's swamped at work. i covered the iOS push — took me two days. not complaining, just flagging it.",
        when: {
          if: (s) => !s.jordan_drifting && !s.jordan_resolved
            && s.launched && (s.pivot_summit_done || s.pivot_deferred),
        },
        choices: [
          {
            key: "talk", label: "Talk to Jordan directly",
            journal: "Talked to Jordan directly about slowing down. She was apologetic, said it's temporary. I'm not sure.",
            effects: { flags: { jordan_drifting: true }, char: { jordan: { focus: null }, alex: { morale: -5 } } },
            fx: () => "Jordan was apologetic. Said it's temporary. You're not sure.",
          },
          {
            key: "cover", label: "Alex can cover for now",
            journal: "Let Alex cover for Jordan. He nodded, but his backlog just got longer.",
            effects: { flags: { jordan_drifting: true }, char: { jordan: { focus: null }, alex: { morale: -10 } } },
            fx: () => "Alex nodded. He'll cover it. The iOS backlog keeps growing.",
          },
        ],
        timeout: {
          weeks: 3,
          effects: { flags: { jordan_drifting: true }, char: { jordan: { focus: null }, alex: { morale: -8 } } },
        },
      },
      {
        id: "jordan_drag", char: "alex",
        text: (s, e) => e.timesResolved("jordan_drag") === 0
          ? "pushed the iOS release back again. jordan said she'd review my PR by tuesday — it's friday. i've covered it, but this is the second time this sprint."
          : "user reported a crash on iphone 12. jordan's the only one who knows that part of the codebase. i've been waiting two days. this can't keep going.",
        when: {
          after: ["jordan_drift_start"], delay: 2, cooldown: 4,
          if: (s, e) => s.jordan_drifting && !s.jordan_resolved && e.timesResolved("jordan_drag") < 2,
        },
        choices: [
          {
            key: "talk", label: "Talk to Jordan directly",
            journal: "Sat down with Jordan. She heard the weight of it. Alex noticed I followed up.",
            effects: { flags: { jordan_confrontation_triggered: true }, char: { alex: { morale: 5 } } },
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
                say: { char: "alex", text: "you've been aware of the jordan situation for weeks. i've been covering for her and saying nothing. it's been affecting me more than i let on." },
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
          if: (s) => s.jordan_drifting && !s.jordan_resolved && s.productPhase === "product"
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
        // On the FOUNDER's thread, deliberately — same reason pivot_relaunch
        // moved off Alex's: in chapter 4 his single slot is contested by the
        // relaunch, the Maya bookend and the Flare epilogue, and this card was
        // getting starved past the deadline. It is also the founder's call to
        // make, which is the whole point of what follows.
        id: "jordan_confrontation", char: "founder",
        text: (s, e) => {
          const pct = s.equity_proposal === "33/33/33" ? "33%" : s.equity_proposal === "50/25/25" ? "25%" : "20%";
          return "Alex finally said it out loud: \"jordan's been part-time for two months. i'm covering her work and mine. she has "
            + pct + " of the company and i don't think she's earning it anymore.\" He won't say it twice, and he can't do anything about it. This one is yours.";
        },
        when: {
          cooldown: 4,
          // Triggered by following up on the drag — or, if the drag was left to
          // fester, by inertia ~8 weeks into the drift (relative, not the old
          // absolute week-20 gate, which predates the drift's post-pivot timing).
          if: (s, e) => s.jordan_drifting && !s.jordan_resolved
            && (s.jordan_confrontation_triggered
              || (e.weeksSince("jordan_drift_start") >= 8 && s.week >= (s.jordan_confrontation_defer_until || 0))),
        },
        choices: [
          {
            // The door, not the resolution: everything that used to happen in
            // this fx now happens in the scene (story/firing.js), where Jordan
            // is actually in the room. The old one-click fire never let the
            // player say a word to her.
            key: "fire", label: "Have the conversation — talk to Jordan",
            reply: "you're right. this is mine to do, and i'm doing it tonight.",
            replyTo: "alex",
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
              s.jordan_confrontation_defer_until = s.week + 4;
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
          return "jordan's " + pct + " is still on the cap table — fully vested, no cliff. any investor who looks at this will ask questions we can't answer well. we need a lawyer to clean it up.";
        },
        // Recurs until cleaned up (v2 deviation: the old card was one-shot, so
        // deferring once locked the round out permanently).
        when: { cooldown: 4, if: (s) => s.jordan_resolved && s.jordan_cleanup_needed },
        choices: [
          {
            key: "lawyer", label: "Hire a lawyer — $2,000",
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
  else (window.V2STORY = window.V2STORY || []).push(mod);
})();
