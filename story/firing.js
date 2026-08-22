// ─────────────────────────────────────────────────────────────────────────────
// story/firing.js — the firing: a one-on-one with Jordan, in her thread, in
// the middle of the night. Chapter 4's human climax, opposite the relaunch's
// mechanical one.
//
// Entered from jordan_confrontation:fire (story/jordan_arc.js), which stopped
// being a resolution and became a door — the old one-click "fire" happened in
// ALEX's thread and Jordan never heard from you at all.
//
// Design:
//  - The scene always happens. There is no "text it instead" fork: the best
//    content in the arc must not be skippable by a wrong turn, and in a game
//    made of text bubbles a call-vs-text choice isn't a real distinction.
//  - The player speaks FIRST (firing_open is on the founder's thread, the
//    "Your move" card): the blue bubble is the deed, and they watch themselves
//    send it.
//  - Beat 2 is an exam on the whole run, not on the last five minutes: her
//    temperature reads the drift history, her answered-message ratio and the
//    equity paperwork. At the bottom of that scale she pre-empts you and the
//    scene ends — you can LOSE this conversation.
//  - Every mechanical consequence is applied once, at the terminal beat
//    (jordanLeaves), from flags the scene set along the way. Nothing halfway
//    through the conversation mutates the company.
//
// Two exits: the clean exit (firing_last_word) and the compromise
// (firing_reaction:fold / firing_ask_finish:fold_informed), which schedules her
// resignation four weeks out with an `unless` — reopen the conversation before
// then and you still get the clean exit, minus the weeks.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const pctOf = (s) => s.equity_proposal === "33/33/33" ? "33%"
    : s.equity_proposal === "50/25/25" ? "25%" : "20%";

  // How much of Jordan the player actually answered across the run — the spine
  // of her reaction. Scene beats are excluded on purpose: they are free of
  // action cost and effectively always answered, so counting them washes the
  // signal out. What's left is the messages that competed for the founder's
  // two actions a week, which is the thing she actually noticed.
  function jordanNeglect(e) {
    let answered = 0, ignored = 0;
    for (const [id, node] of e.nodes) {
      if (node.char !== "jordan" || e.arcOf.get(id) || !e.done(id)) continue;
      if (e.outcome(id) === "@ignored") ignored++; else answered++;
    }
    const total = answered + ignored;
    return total === 0 ? 0 : ignored / total;
  }

  // Tier 1 kept close · tier 2 drifted apart · tier 3 ghosted. A third of her
  // messages on read, or trust on the floor, and she has already left inside.
  function tier(s, e) {
    const jordan = e.cast.get("jordan");
    if (jordanNeglect(e) >= 1 / 3 || (jordan && jordan.trust != null && jordan.trust <= 35)) return 3;
    if (e.took("jordan_drift_start:talk") || e.took("jordan_drag:talk")) return 1;
    return 2;
  }

  // Ghosted for the whole run AND an opener that spent her last patience: she
  // resigns before you finish. Read by three beats, so it lives in one place.
  const preempts = (s, e) => tier(s, e) === 3 && s.firing_open_key !== "own";

  // Hand Jordan's open work to Alex — shared by every way she leaves.
  function reassign(s) {
    if (!s.items) return;
    const live = (k) => s.items[k] && s.items[k].status !== "done" && s.items[k].status !== "obsolete";
    if (live("ios_ui")) s.items.ios_ui.assignee = "alex";
    if (live("plans_ui")) s.items.plans_ui.assignee = "alex";
  }

  // Alex picks up the iOS backend a couple of weeks later (carried over from
  // the old jordan_confrontation:fire fx, which this scene replaced).
  function scheduleIosPickup(s, e) {
    if (!s.items || !s.items.ios_server) return;
    if (s.items.ios_server.status === "done" || s.items.ios_server.status === "obsolete") return;
    s.items.ios_server.assignee = "alex";
    e.schedule({
      in: 2, char: "alex",
      unless: (st) => !!st.ios_unblocked,
      say: { char: "alex", text: "picked up jordan's ios backend integration. took a few days to orient in her code but it's running." },
      fx(st) {
        if (st.items && st.items.ios_server) { st.items.ios_server.status = "done"; st.items.ios_server.quality = "solid"; }
        st.ios_unblocked = true;
      },
    });
  }

  // The re-orientation tax: Alex reading a codebase nobody wrote down. Same
  // idiom as pivot_scope_call's "at least an extra week".
  function reorientCost(s, weeks) {
    if (s.pivot_effort_base != null) s.pivot_effort_base += weeks;
  }

  // ── the terminal effects, applied once ──────────────────────────────────────
  // mode: "exit" (you made the call) | "quit" (she left first, or after the
  // compromise). Everything reads the flags the scene banked.
  function jordanLeaves(s, e, mode) {
    const jordan = e.cast.get("jordan");
    const alex = e.cast.get("alex");
    jordan.active = false;
    reassign(s);

    const handoff = !!s.jordan_handoff;
    if (mode === "exit") {
      s.jordan_resolved = true;
      s.jordan_cleanup_needed = true;   // her stake stays on the cap table
      scheduleIosPickup(s, e);
      if (s.jordan_contract) {
        // Paid to finish the plans UI: it lands, and she stays visible for it.
        e.schedule({
          in: 2, char: "jordan",
          unless: (st) => !st.items || !st.items.plans_ui || st.items.plans_ui.status === "done",
          say: { char: "jordan", text: "plans UI is done and merged. invoice sent. that's me — good luck with the relaunch." },
          fx(st) {
            if (st.items && st.items.plans_ui) { st.items.plans_ui.status = "done"; st.items.plans_ui.quality = "solid"; }
          },
        });
      } else if (!handoff) {
        reorientCost(s, 1.0);
      }
      if (!s.jordan_equity) {
        // Equity was never papered — Alex sees the same dysfunction coming.
        alex.morale = clamp(alex.morale - 30, 0, 100);
        alex.trust = clamp(alex.trust - 25, 0, 100);
        s.alex_departure_risk = true;
        return "Hard conversation, and you had it yourself. Then Alex: 'we never actually signed anything. no equity split, no vesting. what are we even building here?'";
      }
      alex.morale = clamp(alex.morale + 10, 0, 100);
      alex.trust = clamp(alex.trust + 8, 0, 100);
      return "Jordan's off the team. Her " + pctOf(s) + " is still on the cap table until the paperwork lands.";
    }

    // mode === "quit": she left. You didn't decide — you got beaten to it.
    s.jordan_quit = true;
    s.jordan_cleanup_needed = true;
    scheduleIosPickup(s, e);
    reorientCost(s, handoff ? 1.0 : 1.5);
    if (s.items && s.items.plans_ui && s.items.plans_ui.status === "todo") s.items.plans_ui.quality = null;
    alex.morale = clamp(alex.morale - 15, 0, 100);
    alex.trust = clamp(alex.trust - 10, 0, 100);
    return null;
  }

  const mod = {
    arcs: [
      {
        id: "firing",
        // Two threads, and the rail only ever shows the one with something in
        // it: Jordan all the way through, and Alex only on the branch where he
        // interrupts. Nothing here is a founder card — a firing is a
        // conversation, so every beat is a message somebody sent.
        scene: { cast: ["jordan", "alex"] },
        beats: [
          {
            // She has no idea. She is still working, on the one evening she has
            // been free in a month, and she is asking about tomorrow. That is
            // the whole beat: you have to answer this with something else.
            id: "firing_open", char: "jordan",
            text: "hey! good timing — i just pushed the plans screen to staging. it's rough but the flow works end to end. first clear evening i've had in weeks.\n\nwant me to walk you through it tomorrow?",
            when: {
              took: ["jordan_confrontation:fire"],
              if: (s) => !s.jordan_compromised,
            },
            choices: [
              {
                key: "own", label: "I've made a decision, and you should hear it from me",
                reply: "jordan — i'm sorry, this isn't about the staging build. i've made a decision and i want you to hear it from me: i'm taking you off the founding team. you're not going to be building plusone with us.",
                journal: null,
                effects: { say: { char: "jordan", text: "…okay. say the rest." } },
                fx(s) { s.firing_open_key = "own"; return null; },
              },
              {
                key: "outsource", label: "Alex can't keep covering for you",
                reply: "before that — alex can't keep covering for you. it's not fair to him and it isn't sustainable.",
                journal: null,
                fx(s) { s.firing_open_key = "outsource"; return null; },
              },
              {
                key: "litigate", label: "The iOS PR sat four days. The crash took two.",
                reply: "before that — the ios PR sat four days. the crash on the 12 took two. you've missed standup six times this month. i can keep going.",
                journal: null,
                fx(s) { s.firing_open_key = "litigate"; return null; },
              },
            ],
          },

          {
            // The two weak openers cost a message and land in exactly the same
            // place: you say the sentence you should have opened with.
            id: "firing_restate", char: "jordan",
            text: (s) => s.firing_open_key === "litigate"
              ? "the PR sat four days because i asked a question about it on the tuesday and nobody answered until friday. i can keep going too.\n\nis that what this is?"
              : "is this alex talking or you? because he hasn't said a word to me and now his name is in your message.\n\njust say what you sat down to say.",
            when: {
              took: ["firing_open:outsource|litigate"],
              if: (s, e) => !preempts(s, e),
            },
            choices: [
              {
                key: "say_it", label: "It's my call, and it isn't a debate",
                reply: "you're right. it's mine, and it isn't a debate — i'd decided before i opened this thread. i'm taking you off the founding team.",
                journal: null,
                fx(s, e) {
                  const jordan = e.cast.get("jordan");
                  jordan.trust = clamp(jordan.trust - 6, 0, 100);
                  e.say({
                    char: "jordan",
                    text: s.firing_open_key === "litigate"
                      ? "then you should have opened with that instead of the charge sheet."
                      : "there it is. that took a while.",
                  });
                  return null;
                },
              },
            ],
          },

          {
            // The second time. You do not get the full conversation twice —
            // no counter-offer, no logistics, no last word. The compromise ate
            // everything the conversation could have bought you.
            id: "firing_reentry", char: "jordan",
            text: "we did this three weeks ago. you asked me for one more sprint, i said okay, and we both went to bed.\n\nso say it or don't. just don't do the sprint thing again.",
            when: { took: ["jordan_confrontation:fire"], if: (s) => !!s.jordan_compromised },
            choices: [
              {
                key: "finish", label: "I should have said this three weeks ago.",
                reply: "i should have said this three weeks ago and i didn't. you're off the founding team. i'm sorry i made you sit through it twice.",
                journal: (s) => "Went back to Jordan and finished what I started three weeks ago. Her " + pctOf(s)
                  + " gets papered this week. Three weeks of everyone pretending, and Alex reading her code cold.",
                effects: { scene: null, say: { char: "jordan", text: "okay. thank you for coming back and saying it." } },
                fx: (s, e) => jordanLeaves(s, e, "exit"),
              },
              {
                key: "fold_again", label: "One more sprint. I mean it this time.",
                reply: "give me one more sprint. i mean it this time.",
                journal: "Asked Jordan for one more sprint. Again. She stopped replying, and a week later she was gone.",
                effects: { scene: null },
                fx(s, e) {
                  e.say({ char: "jordan", text: "no. nothing has changed since last time and you've now asked me twice to pretend it will. i'm out. i'll keep my shares." });
                  jordanLeaves(s, e, "quit");
                  return "She's gone. You asked twice and she answered once.";
                },
              },
            ],
          },

          {
            // The scene you can lose: ghosted for the whole run AND an opener
            // that spent her last patience. No player choice, no terms, no
            // handoff, no YC chip — she resigns before you finish.
            id: "firing_preempt", char: "jordan",
            text: "stop. i'm going to save you the rest of it.\n\ni'm out. i was going to tell you this week — i just wanted to get the ios build somewhere alex could pick it up. now i'm not going to bother.",
            when: { after: ["firing_open"], if: preempts },
            choices: [
              {
                key: "nothing", label: "There's nothing to say to that.",
                journal: "Opened the conversation with Jordan and she finished it for me. She resigned before I could say it. Two months of drift and I never once told her — she quit holding her stake and a codebase nobody else has read.",
                effects: { scene: null },
                fx(s, e) {
                  jordanLeaves(s, e, "quit");
                  return "She resigned before you could say it. You didn't make the call — you got beaten to it by ninety seconds.";
                },
              },
            ],
          },

          {
            id: "firing_reaction", char: "jordan",
            text: (s, e) => {
              const t = tier(s, e);
              const core = t === 1
                ? "i figured. i've been half-waiting for this since the pivot. i'd have respected it more three weeks ago, but okay."
                : t === 3
                  ? "okay.\n\ni've been talking to an empty room since about week six. this is the longest message you've sent me in two months and it's this one."
                  : "this is the first time anyone has told me it was a problem. alex carried it for two months and you watched him do it.\n\ni'm not going to sit here and tell you i was pulling my weight. i'm telling you that you saw it and said nothing, and that part is yours.";
              return s.jordan_equity ? core
                : core + "\n\nand before you get to the shares — we never signed anything. no split, no vesting, no paper. so what exactly are you taking off me?";
            },
            when: {
              after: ["firing_open"],
              not: ["firing_preempt"],
              if: (s, e) => !preempts(s, e)
                && (s.firing_open_key === "own" || e.done("firing_restate")),
            },
            choices: [
              {
                key: "hold", label: "You're right about me. It's still the decision.",
                reply: "you're right. i should have said it three weeks ago. that's mine and i'm sorry for it. it doesn't change the decision.",
                journal: null,
                effects: { say: { char: "jordan", text: "…yeah. okay." } },
              },
              {
                key: "ask", label: "What's actually going on with you?",
                reply: "before we go further. what's actually going on with you? not the work. you.",
                journal: null,
                fx(s, e) {
                  s.firing_asked = true;
                  const jordan = e.cast.get("jordan");
                  jordan.trust = clamp(jordan.trust + 8, 0, 100);
                  return null;
                },
              },
              {
                key: "fold", label: "One more sprint. Show me.",
                reply: "look — one more sprint. land the ios build and we forget tonight happened.",
                journal: "Opened the conversation with Jordan and blinked. Gave her one more sprint. Alex typed \"okay.\" and nothing else.",
                effects: { scene: null },
                fx: (s, e) => compromise(s, e),
              },
            ],
          },

          {
            id: "firing_ask_finish", char: "jordan",
            // No secret, no betrayal, no new job: she has been part-time with a
            // day job since week one and said so out loud in the equity scene.
            // Nothing changed — the company changed around her. That removes
            // the player's excuse, which is the entire point of asking.
            text: (s) => "honestly? nothing. that's the whole answer, and i know how it sounds.\n\n"
              + "i'm doing exactly what i said i'd do in week one — evenings and weekends, around a job i can't afford to quit. that hasn't changed once since we started. you two went full-time and i didn't, and i was never going to be able to match that.\n\n"
              + (s.jordan_equity
                ? "you knew that when we signed the split. nobody's said a word about it since."
                : "you knew that when we were arguing about the split. the one we never got round to signing.")
              + "\n\nso. finish what you opened this to say.",
            when: { took: ["firing_reaction:ask"] },
            choices: [
              {
                key: "hold_informed", label: "You're right, and it doesn't change the call.",
                reply: "you're right, and i should have said it months ago instead of letting it drift. it doesn't change the call — it's most of why it's the right one. you're off the founding team.",
                journal: null,
                effects: { say: { char: "jordan", text: "yeah. i know. it's just easier to hear when someone asks first." } },
              },
              {
                key: "fold_informed", label: "…Forget what I said. Take the sprint.",
                reply: "…okay. forget what i said. take the sprint, see how it goes.",
                journal: "Jordan told me straight that nothing about her situation was going to change — and I asked her for one more sprint anyway.",
                effects: {
                  scene: null,
                  say: { char: "jordan", text: "i just told you nothing is going to change." },
                },
                fx: (s, e) => compromise(s, e),
              },
            ],
          },

          {
            id: "firing_counter", char: "jordan",
            text: "one thing before shares. the plans UI is half built and most of it is in my head, not in the repo.\n\nlet me finish it as a contractor. three weeks, $3k, then i'm gone clean. you relaunch on time and alex doesn't have to learn my code with a deadline on his neck.",
            when: { took: [["firing_reaction:hold", "firing_ask_finish:hold_informed"]] },
            choices: [
              {
                key: "hire_back", label: "Yes — three weeks, scoped to plans UI ($3,000)",
                reply: "yes. three weeks, scoped to plans UI, $3k on delivery.",
                journal: null,
                effects: { cash: -3000, say: { char: "jordan", text: "done. i'll keep out of everything else." } },
                fx(s) { s.jordan_contract = true; s.jordan_exit_clean = false; return null; },
              },
              {
                key: "buy_handoff", label: "Not the work — the handoff. Two days ($500)",
                reply: "not the work — the handoff. two days, write it all down properly, $500. alex builds from your notes.",
                journal: null,
                effects: { cash: -500, say: { char: "jordan", text: "…that's smarter than what i offered. okay." } },
                fx(s) { s.jordan_handoff = true; return null; },
              },
              {
                key: "decline", label: "No. Clean break is worth more to us.",
                reply: "no. clean break is worth more to us than three weeks. alex owns iOS from monday.",
                journal: null,
                effects: { say: { char: "jordan", text: "okay. that's probably right. it's going to hurt though." } },
              },
            ],
          },

          {
            // The practical half — the half founders actually botch. She raises
            // the developer account herself, helpfully; the landmine is yours.
            id: "firing_logistics", char: "jordan",
            text: (s) => "what happens to my shares?\n\nand one practical thing while i think of it — the app store listing is on my apple developer account. it's been mine since before plusone existed. we never opened an org one because it was $99 and we were being careful with money.",
            when: { after: ["firing_counter"] },
            choices: [
              {
                key: "transfer", label: "Paperwork this week, and I'll move the account ($99)",
                reply: "paperwork this week — you keep what's vested, i pay the lawyer. and good catch on the account: i'll open the org one tomorrow and we'll transfer before you sign anything.",
                journal: null,
                effects: { cash: -99, say: { char: "jordan", text: "yeah. do it while i still care about doing it properly." } },
              },
              {
                key: "defer", label: "Paperwork's coming. Leave the account for now.",
                reply: "i'll send the paperwork this week. can we leave the account where it is for now? i've got about nine things ahead of that one.",
                journal: null,
                effects: {
                  flags: { appstore_on_jordan: true },
                  say: { char: "jordan", text: "sure. it's not going anywhere." },
                },
              },
            ],
          },

          {
            // Alex is awake and waiting. He's in the scene cast so this is a
            // real thread in the room — his name only appears in the rail once
            // he says this, so the one-on-one stays a one-on-one on every other
            // path. Inside the scene because on his own thread afterwards it
            // landed past the last playable week in a third of runs. Only
            // exists if she told you something private; ungraded either way.
            id: "firing_alex_after", char: "alex",
            text: "so what did she say? i've been staring at my phone for an hour.",
            when: { after: ["firing_logistics"], if: (s) => !!s.firing_asked },
            choices: [
              {
                key: "tell_alex", label: "She knew months ago she couldn't match us.",
                reply: "she's known for months she was never going to be able to match us. she just never said it out loud.",
                journal: "Repeated to Alex what Jordan told me in confidence an hour after I let her go — that she'd known for months and said nothing.",
                effects: {
                  char: { alex: { morale: 8 } },
                  say: { char: "alex", text: "…months. and she let me carry it anyway." },
                },
              },
              {
                key: "keep_confidence", label: "That's between her and me.",
                reply: "that's between her and me. it's done, and it was the right call.",
                journal: "Kept what Jordan told me to myself. Alex carried her work for two months and still doesn't know why she went.",
                effects: {
                  char: { alex: { trust: 6, morale: -3 } },
                  say: { char: "alex", text: "okay. i'll take that." },
                },
              },
            ],
          },

          {
            id: "firing_last_word", char: "jordan",
            text: "is that everything?",
            // Closes the scene, so it yields to Alex's question when there is
            // one — otherwise the sitting could end with him still waiting.
            when: {
              after: ["firing_logistics"],
              if: (s, e) => !s.firing_asked || e.done("firing_alex_after"),
            },
            choices: [
              {
                key: "human", label: "The intake screen was yours. Tonight doesn't erase it.",
                reply: "one more thing. the intake screen — the one your sister screenshotted into her group chat — is still the only organic share this company has ever had. that was you. tonight doesn't erase it.",
                journal: (s) => "Told Jordan tonight, myself, in her thread. She wasn't surprised and she didn't pretend to be. Her "
                  + pctOf(s) + " gets papered this week; Alex has iOS from Monday. She's writing the handoff up before she goes dark.",
                effects: { scene: null },
                fx(s, e) {
                  s.jordan_handoff = true;
                  e.say({ char: "jordan", text: "…thanks. that lands better than you'd think." });
                  e.say({ char: "jordan", text: "i'll write the ios stuff up properly before i go dark. you'll want it in english, not in my head." });
                  return jordanLeaves(s, e, "exit");
                },
              },
              {
                key: "close", label: "That's everything. I'll send the paperwork.",
                reply: "that's everything. i'll send the paperwork.",
                journal: (s) => "Told Jordan tonight, myself, in her thread. She wasn't surprised and she didn't pretend to be. Her "
                  + pctOf(s) + " gets papered this week; Alex has iOS from Monday.",
                effects: { scene: null, say: { char: "jordan", text: "okay. goodnight." } },
                fx: (s, e) => jordanLeaves(s, e, "exit"),
              },
            ],
          },
        ],
      },
    ],

  };

  // ── the compromise ──────────────────────────────────────────────────────────
  // Worse than never having the conversation: she now knows you considered it
  // and blinked. Her resignation is scheduled four weeks out with an `unless`,
  // so reopening the conversation in time still reaches the clean exit.
  function compromise(s, e) {
    const alex = e.cast.get("alex");
    alex.morale = clamp(alex.morale - 12, 0, 100);
    alex.trust = clamp(alex.trust - 12, 0, 100);
    s.jordan_compromised = true;
    s.jordan_confrontation_triggered = false;
    s.jordan_confrontation_defer_until = s.week + 3;   // the conversation re-arms
    e.say({ char: "jordan", text: "so… nothing changes. okay." });
    e.schedule({
      in: 1, char: "alex",
      unless: (st) => !!st.jordan_resolved,
      say: { char: "alex", text: "jordan messaged me last night. she sounded relieved. so — one more sprint?" },
    });
    e.schedule({
      in: 5, char: "jordan",
      unless: (st) => !!st.jordan_resolved || !!st.jordan_quit,
      fx(st, en) {
        en.say({
          char: "jordan",
          text: st.firing_asked
            ? "i'm stepping back. i told you that night that nothing was going to change and you asked me for one more sprint anyway, so i think we both knew. i'll keep my shares. good luck with the relaunch."
            : "i'm stepping back. nothing's changed since that night and nothing was going to — i think we both knew that when you asked. i'll keep my shares. good luck with the relaunch. i mean that.",
        });
        jordanLeaves(st, en, "quit");
        en.schedule({
          in: 1, char: "alex",
          say: { char: "alex", text: "so we spent a month waiting to lose her, and now i'm reading her ios branch with three weeks to relaunch and no comments in it. we could have had a month of me owning this." },
        });
      },
    });
    return "One more sprint. Alex typed \"okay.\" and nothing else. You both know how this ends.";
  }

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.STORY = window.STORY || []).push(mod);
})();
