// ─────────────────────────────────────────────────────────────────────────────
// story/launch_day.js — the road to launch and launch day itself.
//
// proto_to_product (hardening week) → good_enough_launch (the trigger; "ship"
// opens the launch scene) → a two-character scene DAG: Alex works the machine
// (email, staging bug, test profiles, Stripe) while Jordan watches the humans
// (first bounce, first signup, the mass-messager). The old urgency ladder
// (20 → 19.5 → … → 12) is replaced by explicit deps; the branches are:
//  - staging fix: only the hotfix path leaves Alex inside the db to spot the
//    test profiles (took: ["launch_staging_decide:hotfix"])
//  - sending Jordan to hustle on LinkedIn (hustle:go) means nobody watches the
//    platform — the abuser beat never fires and the 9pm crisis arrives blind
//  - warning instead of banning (moderation_warned) also arms the 9pm crisis
// launch_signal closes the scene: two users matched and are talking.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  function allScopeBuilt(s) {
    if (!s.items) return true;
    return Object.keys(s.items).every(k => !s.items[k].auto
      || s.items[k].status === "done" || s.items[k].status === "deferred");
  }
  function finishItemsAtLaunch(s) {
    if (!s.items) return;
    for (const k of Object.keys(s.items)) {
      const it = s.items[k];
      if (it && (it.status === "active" || it.status === "todo")) {
        it.status = "done";
        it.quality = it.quality || "rough";
      }
    }
  }

  const mod = {
    arcs: [
      {
        id: "launch",
        scene: { cast: ["alex", "jordan"] },
        beats: [
          // ── morning ────────────────────────────────────────────────────────
          {
            id: "launch_preflight", char: "alex",
            text: "email's queued — 847 addresses. want a quick look before i hit send, or we go now?",
            when: { took: ["good_enough_launch:ship"] },
            choices: [
              {
                key: "review", label: "Quick review — two minutes",
                reply: "quick review first.", journal: null,
                effects: { flags: { launch_time: "9AM" }, say: { char: "jordan", text: "i'm keeping an eye on the site." } },
              },
              {
                key: "send", label: "Send it — we're ready",
                reply: "send it. we're ready.", journal: null,
                effects: {
                  flags: { launch_time: "9AM", launch_email_mistake: true },
                  say: [
                    { char: "jordan", text: "i'm keeping an eye on the site." },
                    { char: "alex", text: "oh no. subject line on the blast says 'test - do not send'. went to all 847 people." },
                  ],
                  schedule: {
                    in: 1, char: "alex",
                    say: { char: "alex", text: "checked the stats — about 80 people unsubscribed after the launch email. the test subject line thing. annoying but recoverable." },
                  },
                },
              },
            ],
          },
          {
            id: "launch_email_pulse", char: "alex",
            text: "30 minutes since the blast. open rate's at 19% — solid. 6 click-throughs. nobody's signed up yet. want me to keep watching?",
            choices: [
              {
                key: "yes", label: "Yes — keep an eye on it",
                reply: "keep watching. ping me when someone signs up.", journal: null,
                effects: { flags: { launch_time: "10AM" }, say: { char: "alex", text: "47 opens, 8 click-throughs. rate's holding at 19%. most people haven't seen it yet — opens usually spike after lunch." } },
              },
              {
                key: "no", label: "No — step away. Stats don't make signups happen.",
                reply: "step away. watching the numbers won't make people sign up faster.", journal: null,
                effects: { flags: { launch_time: "10AM" } },
              },
            ],
          },
          {
            id: "launch_first_bounce", char: "jordan",
            text: "first click from the blast just came in. someone opened it on their phone, hit the homepage, maybe 10 seconds — didn't scroll past the hero. no signup.",
            when: { after: ["launch_email_pulse"] },
            choices: [
              {
                key: "normal", label: "Normal — first visitors are just curious",
                reply: "normal. probably opened it on their commute. real signups need a minute to think.", journal: null,
              },
              {
                key: "broken", label: "Was something wrong on mobile?",
                reply: "check if the page is broken on mobile.", journal: null,
                effects: { say: { char: "jordan", text: "tested on my phone — page loads clean, 1.4s, no errors. they just weren't ready to commit on a first glance." } },
              },
              {
                key: "who", label: "Can we figure out who it was?",
                reply: "any way to tell who it was? might be worth reaching out.", journal: null,
                fx(s, e) {
                  e.say({
                    char: "jordan",
                    text: s.analytics_live
                      ? "it's a uuid — no name until they sign up. they hit the /how-it-works page before leaving."
                      : "just a hit in the access logs. no identity until they sign up.",
                  });
                  return null;
                },
              },
            ],
          },

          // ── the staging-database fire ──────────────────────────────────────
          {
            id: "launch_staging_discover", char: "alex",
            text: "hold on. signups are coming in but the match pipeline is completely silent — not a single match in 45 minutes. something is wrong. pulling logs.",
            when: { after: ["launch_first_bounce"] },
            choices: [
              { key: "check", label: "What's happening?", reply: "what's wrong?", journal: null,
                effects: { say: { char: "alex", text: "one sec." } } },
            ],
          },
          {
            id: "launch_staging_found", char: "alex",
            text: "oh no. oh no oh no. we're on the staging database. the env var is pointing at staging. every signup since 8am has been going into the test environment — none of them can see each other. we have real users in a ghost app.",
            choices: [
              { key: "options", label: "What are our options?", reply: "okay. what are our options?", journal: null,
                effects: { say: { char: "alex", text: "hotfix — i swap the env var and redeploy. 5 minutes but if prod hiccups during deploy we could end up with a corrupted state. or maintenance page, fix it clean, back up in 30. or we wait — peak traffic is tonight, most people haven't opened the email yet." } } },
            ],
          },
          {
            id: "launch_staging_decide", char: "alex",
            text: "ready to move. what's the call?",
            choices: [
              {
                key: "hotfix", label: "Push the hotfix — 5 minutes of risk",
                reply: "push it. 5 minutes of risk is better than 30 minutes of downtime.", journal: null,
                effects: {
                  flags: { launch_time: "11AM" },
                  say: [
                    { char: "alex", text: "deploying." },
                    { char: "alex", text: "done. pointed at prod. pipeline's running. first real matches should show up in the next few minutes." },
                  ],
                },
              },
              {
                key: "takedown", label: "Take it down — fix it cleanly",
                reply: "take it down. fix it right. i'd rather have 30 minutes of downtime than a corrupted state.", journal: null,
                effects: {
                  flags: { launch_time: "12PM", press_bounce: true },
                  say: [
                    { char: "alex", text: "maintenance page up. fixing the env var. back up in 20-30 min." },
                    { char: "alex", text: "back online. took 25 minutes. env is correct, pipeline is running. some early visitors hit the maintenance page." },
                  ],
                },
              },
              {
                key: "wait", label: "Wait — peak traffic is tonight",
                reply: "wait. peak traffic is tonight. we fix it properly this afternoon before people actually open the app.", journal: null,
                effects: {
                  flags: { launch_time: "11AM", press_bounce: true },
                  say: { char: "alex", text: "ok. every signup right now is in limbo but nobody knows it yet. let's hope nobody tries to use it before we fix it." },
                },
              },
            ],
          },

          // ── midday: the humans arrive ──────────────────────────────────────
          {
            id: "launch_first_signup", char: "jordan",
            text: "first real profile just went live — maya, 28, SF. she's still filling it out but she's in the app. pipeline runs every few minutes so matches haven't shown up yet.",
            when: { after: ["launch_staging_decide", "launch_first_bounce"] },
            choices: [
              {
                key: "watch", label: "Watch her — first real user in the app",
                reply: "watch her. i want to see what a real user actually does.", journal: null,
                effects: { say: { char: "jordan", text: "she completed her profile — 3 photos, full bio. she's now checking for matches." } },
              },
              {
                key: "welcome", label: "Send her a welcome message",
                reply: "send her a personal welcome. first user deserves it.", journal: null,
                effects: { say: { char: "jordan", text: "sent. she replied 'omg i didn't expect to hear from you!' — she's filling out her profile now." } },
              },
              {
                key: "leave", label: "Leave her — let her explore on her own",
                reply: "don't hover. let her figure it out herself.", journal: null,
              },
            ],
          },
          {
            id: "launch_inbox_question", char: "alex",
            text: "first support email just hit the inbox — 'i signed up but i don't understand how matching works. when will i get someone?' what should i tell her?",
            when: { after: ["launch_first_signup"] },
            choices: [
              {
                key: "personal", label: "Reply personally",
                reply: "reply from me personally. first user gets a real answer.", journal: null,
                effects: { flags: { launch_time: "12PM" }, say: { char: "alex", text: "done. she responded: 'omg the founder replied — so cool!'" } },
              },
              {
                key: "faq", label: "Write a 3-line FAQ answer",
                reply: "write a quick faq answer. we'll need the template anyway.", journal: null,
                effects: { flags: { launch_time: "12PM", faq_started: true }, say: { char: "alex", text: "wrote 3 lines, sent it. she said 'thanks!' — first ticket closed." } },
              },
              {
                key: "wait", label: "Leave it — the product should explain itself",
                reply: "leave it. if the product needs a manual, that's the real problem.", journal: null,
                effects: { flags: { launch_time: "12PM" } },
              },
            ],
          },
          {
            id: "launch_hustle", char: "jordan",
            text: "it's noon and we only have 14 signups. should i post a thread on LinkedIn? might drive some traffic while the email's still fresh.",
            when: { after: ["launch_staging_decide", "launch_inbox_question"] },
            choices: [
              {
                key: "go", label: "Go for it — hustle for more signups",
                reply: "yes, go post. let's hustle for signups.", journal: null,
                effects: {
                  flags: { jordan_left_watch: true, launch_time: "1PM" },
                  say: { char: "jordan", text: "on it. writing a great post and pinging all my contacts. back in a couple hours." },
                },
              },
              {
                key: "stay", label: "Stay in the app — watch real users",
                reply: "stay in the app. watch how real users behave — that's worth more than 20 extra signups right now.", journal: null,
                effects: { flags: { launch_time: "1PM" } },
              },
            ],
          },

          // ── afternoon: what the db knows (hotfix path only) ────────────────
          {
            id: "launch_test_profiles", char: "alex",
            text: "hey — while i was swapping the env var i was looking at the db schema to make sure the migration ran clean. we still have test accounts in there.",
            when: { took: ["launch_staging_decide:hotfix"], after: ["launch_hustle"] },
            choices: [
              { key: "how_many", label: "How many?", reply: "how many test accounts?", journal: null,
                effects: { say: { char: "alex", text: "checking." } } },
            ],
          },
          {
            id: "launch_test_profiles_scope", char: "alex",
            text: "6 test accounts total. most are obviously fake — no photo, username like 'test_user_001'. but sarah_test_003 has a real photo and a full bio. she's been in there since the first test builds. she matched with 3 real users. two of them already sent her messages. she replied with lorem ipsum filler from when we seeded the db.",
            choices: [
              { key: "damage", label: "Have they figured out she's fake?", reply: "do the users know she's a test account?", journal: null,
                effects: { say: { char: "alex", text: "not yet. the replies look normal enough that they probably think she's just slow to respond. but if either of them sends another message and gets lorem ipsum back, it's going to be obvious. what do you want to do?" } } },
            ],
          },
          {
            id: "launch_test_profiles_decide", char: "alex",
            text: "i can delete all 6 right now. or we tell those two users what happened. or we leave it and hope nobody notices.",
            choices: [
              {
                key: "disclose", label: "Email the affected users — be honest",
                reply: "email them both. apologize, explain what happened, give them a free month.", journal: null,
                effects: {
                  flags: { honest_launch: true, launch_time: "4PM" },
                  say: { char: "alex", text: "done. two emails out, deleted all 6 test accounts. one user already replied — said he appreciated us catching it. the other hasn't opened it yet." },
                },
              },
              {
                key: "delete", label: "Quietly delete them — nobody will know",
                reply: "just delete all of them now. those matches weren't real anyway.", journal: null,
                effects: {
                  flags: { silent_delete: true, launch_time: "4PM" },
                  say: { char: "alex", text: "deleted. those two users just lost a match without knowing why." },
                  schedule: {
                    in: 2, char: "jordan", unless: (s) => !s.silent_delete,
                    say: { char: "jordan", text: "one of the users who matched with sarah_test_003 just reached out — they want to know why their match disappeared. what do i tell them?" },
                  },
                },
              },
              {
                key: "nothing", label: "Leave them — not worth the disruption on day one",
                reply: "leave them for now. we'll clean it up tonight. one fake profile isn't worth disrupting real users mid-launch.", journal: null,
                effects: { flags: { test_profiles_live: true, launch_time: "4PM" } },
              },
            ],
          },

          // ── afternoon: the platform, watched or unwatched ──────────────────
          {
            id: "launch_abuser", char: "jordan",
            text: "seeing something weird. one user has sent the exact same opener to at least 10 women in the last hour. just got a DM from one asking if this is allowed. what do you want me to do?",
            when: { took: ["launch_hustle:stay"] },
            choices: [
              {
                key: "ban", label: "Ban him now",
                reply: "ban him. we don't need a ToS to know mass-messaging isn't okay.", journal: null,
                effects: { flags: { launch_time: "4PM" }, say: { char: "jordan", text: "done. he's off the platform. the woman who complained sent a thank you." } },
              },
              {
                key: "warn", label: "Send him a warning first",
                reply: "send him a warning — one chance to stop.", journal: null,
                effects: { flags: { moderation_warned: true, launch_time: "4PM" } },
              },
              {
                key: "investigate", label: "Investigate more before deciding",
                reply: "look into it more — how many women, what did he actually say?", journal: null,
                effects: {
                  flags: { moderation_warned: true, launch_time: "4PM" },
                  say: { char: "jordan", text: "checked — he sent the same message to 15 women. nothing explicitly offensive, just copy-pasted. sent him a warning for now." },
                },
              },
            ],
          },

          // ── evening: the money sting ───────────────────────────────────────
          {
            id: "launch_stripe_discover", char: "alex",
            text: "first upgrade attempt. user in SF hit the premium button. stripe rejected it — 'your account cannot currently make live charges.' we built the whole payment flow, tested it perfectly, but never finished the business verification. we literally cannot accept money right now.",
            when: {
              after: ["launch_staging_decide", "launch_hustle"],
              if: (s, e) => e.took("launch_hustle:go") || e.done("launch_abuser"),
            },
            choices: [
              { key: "fix", label: "Fix it — what do we need to do?", reply: "fix it. what do we need?", journal: null,
                effects: { say: { char: "alex", text: "on it. reading the stripe activation docs and getting someone on their support chat." } } },
            ],
          },
          {
            id: "launch_stripe_research", char: "alex",
            text: "okay so. i got someone on stripe's support chat. we need to submit: business type, EIN, bank account for payouts, and they run an identity check on whoever owns the account. i read through the full verification docs while i was waiting.",
            choices: [
              { key: "timeline", label: "How long does verification take?", reply: "how long does it take once we submit?", journal: null,
                effects: { say: { char: "alex", text: "stripe says 1 to 3 business days. minimum. and that's after we submit everything, which i don't have ready right now. so realistically — not today. she's been sitting on a failed payment for 20 minutes." } } },
            ],
          },
          {
            id: "launch_stripe_decide", char: "alex",
            text: "what do we tell the user?",
            choices: [
              {
                key: "fix_now", label: "Tell her honestly — she'll be first when it's live",
                reply: "email her. be honest — our fault, payment system isn't activated yet. she'll be first to retry when it is.", journal: null,
                effects: { flags: { first_paid: true, launch_time: "6PM" } },
              },
              {
                key: "free_month", label: "Give her a free month — she earned it",
                reply: "email her. apologize. give her a free month while we get the account activated.", journal: null,
                effects: { flags: { launch_time: "6PM" } },
              },
              {
                key: "wait", label: "Say nothing — hope she retries herself",
                reply: "say nothing for now. she probably just thinks her card failed. she might retry on her own.", journal: null,
                effects: { flags: { first_churn: true, launch_time: "6PM" } },
              },
            ],
          },

          // ── night ──────────────────────────────────────────────────────────
          {
            id: "launch_going_home", char: "jordan",
            text: "it's 6pm. heading home — long day. 19 signups total. not bad for day one?",
            when: {
              after: ["launch_stripe_decide"],
              if: (s, e) => e.took("launch_hustle:go") || e.done("launch_abuser"),
            },
            choices: [
              {
                key: "ack", label: "Good work today. Rest up.",
                reply: "good work today. rest up.", journal: null,
                fx(s, e) {
                  s.launch_time = (s.moderation_warned || s.jordan_left_watch) ? "9PM" : "11PM";
                  e.say({ char: "alex", text: "same. grabbing dinner. 19 signups honestly isn't bad. more tomorrow." });
                  return null;
                },
              },
            ],
          },
          {
            // Fires if the abuser was warned (not banned) OR Jordan was on
            // LinkedIn all day. Warned: he came back. LinkedIn: she had no idea
            // until the victims DM'd her.
            id: "launch_9pm_crisis", char: "jordan",
            text: (s) => s.jordan_left_watch && !s.moderation_warned
              ? "hey — just got DMs from 3 women who signed up today. one guy's been sending the same opener to everyone while i was posting on linkedin. one of them is about to go public. i had no idea this was happening."
              : "hey — i know we said we were done. the guy i warned is back. messaged 5 more women tonight. one of them is threatening to post publicly about it. alex says he doesn't have his laptop.",
            when: {
              after: ["launch_going_home"],
              if: (s) => !!s.moderation_warned || !!s.jordan_left_watch,
            },
            choices: [
              {
                key: "ban", label: "Ban him now",
                reply: "ban him now. should have done it this afternoon.", journal: null,
                effects: { flags: { launch_time: "11PM" }, say: { char: "jordan", text: "done. banned. reached out to the victim — she's still upset but said thank you. we need a real ToS." } },
              },
              {
                key: "victim_first", label: "Reach out to the victim first, then ban",
                reply: "message the victim first — apologize, then ban him.", journal: null,
                effects: { flags: { launch_time: "11PM" }, say: { char: "jordan", text: "messaged her. she softened when we apologized. banned him. she said she'll hold off on posting." } },
              },
              {
                key: "morning", label: "Handle it in the morning",
                reply: "it can wait until morning.", journal: null,
                effects: {
                  flags: { moderation_ignored: true, launch_time: "11PM" },
                  schedule: {
                    in: 2, char: "jordan", unless: (s) => !s.moderation_ignored,
                    say: { char: "jordan", text: "that woman posted about the harassment overnight. 'new dating app has zero moderation.' it's getting shared." },
                  },
                },
              },
            ],
          },
          {
            id: "launch_signal", char: "jordan",
            text: "hey — i know it's late. just got a DM. two users matched and they're already texting each other. 😭 this is actually real.",
            when: {
              after: ["launch_going_home"],
              if: (s, e) => {
                const needCrisis = !!s.moderation_warned || !!s.jordan_left_watch;
                return !needCrisis || e.done("launch_9pm_crisis");
              },
            },
            choices: [
              {
                key: "ack", label: "That's what we built it for",
                reply: "that's why we did all of this. get some sleep.",
                journal: "11pm. Jordan texted — two users matched and they're already talking to each other. The whole chaotic day collapsed into one message. It's working.",
                effects: { flags: { launch_time: "11PM" }, scene: null }, // launch day is over
              },
            ],
          },
        ],
      },
    ],

    nodes: [
      {
        id: "proto_to_product", char: "alex",
        text: "before we point real strangers at this: honesty hour. password-reset emails land in spam. the match queue crashes on profiles with zero photos. and i'm about 80% sure you can see other people's photos by editing a url. one hardening week and i can sleep at night. or we ship as-is and firefight.",
        when: { cooldown: 4, if: (s) => s.has_demo && s.productPhase !== "product" },
        choices: [
          {
            key: "commit", label: "Take the hardening week",
            reply: "take the week. fix the resets, the crash, and for god's sake the photo urls. then we point strangers at it.",
            effects: { waitlist: 5, marketFit: 8, flags: { productPhase: "product" }, char: { alex: { effort: 1.0 } } },
            fx(s) {
              s.tech_debt = Math.max(0, (s.tech_debt || 0) - 8);
              return "One week of deeply unglamorous work: spam headers fixed, the zero-photo crash squashed, photo urls signed. Nothing to demo, everything to trust. Word's getting around — 5 people asked for early access.";
            },
          },
          {
            key: "delay", label: "Ship as-is — we'll firefight",
            reply: "no hardening week. we ship with the bugs and firefight — write them on the whiteboard so we at least know our own landmines.",
            journal: "Shipped with the bugs — the whiteboard's new heading is 'known landmines.' Alex circled the photo-url one twice.",
            effects: { flags: { productPhase: "product" }, char: { alex: { effort: 0.6, morale: -3 } } },
            fx(s) {
              s.tech_debt = (s.tech_debt || 0) + 5;
            },
          },
        ],
        timeout: { weeks: 3 }, // he asks again in a few weeks (cooldown)
      },
      {
        id: "good_enough_launch", char: "alex",
        text: "the product is solid. we could keep polishing or we could ship it and learn from real users. nothing's on fire — let's launch.",
        when: {
          // Every week, not every four. Once the product is hardened and the
          // scope is clear, "are we shipping?" is the only thing on Alex's mind
          // and the card's own timeout says so ("another week building in a
          // vacuum. runway is ticking"). At 4 a founder who answered "two more
          // weeks" got silence instead — including whole weeks with nothing to
          // answer at all, on the one question the chapter is about.
          cooldown: 1,
          if: (s, e, char) => s.productPhase === "product" && allScopeBuilt(s)
            && s.ios_unblocked && !s.launched && char.focus === "build",
        },
        choices: [
          {
            key: "ship", label: "Ship it — launch now",
            reply: "ship it. we're launching.", journal: null,
            effects: { signal: 12, scene: "launch", say: { char: "alex", text: "tomorrow 8am. game on." } },
            fx(s) {
              s.launched = true;
              s.launch_week = s.week;
              s.launch_time = "8AM";
              finishItemsAtLaunch(s);
              return null;
            },
          },
          {
            key: "wait", label: "Two more weeks",
            journal: "Polished a few more things instead of launching. Alex thinks I'm stalling — and he might be right.",
            effects: { char: { alex: { morale: -12 } } },
          },
        ],
        // Stalling by silence costs real money and morale — and he re-raises it.
        timeout: {
          weeks: 3,
          effects: { cash: -800, char: { alex: { morale: -10 } } },
          say: { char: "alex", text: "another week building in a vacuum. runway is ticking and real users are waiting." },
        },
      },

      // ── the stall: a finished product nobody outside this chat has opened ────
      // good_enough_launch is the only door out of chapter 2, and two of its
      // clauses can jam it shut for the rest of a run by accident: parking Alex
      // on discovery after the hardening week, or never resolving the iOS build
      // (jordan_launch_blocker only covers the drifting case). Either leaves a
      // finished product, a ticking calendar, and no beat anywhere offering to
      // ship. This is the recovery ramp back to that door — ambient, like every
      // backstop here, so it can never outrank a real beat on Alex's thread.
      //
      // The over-scope backlog is deliberately NOT treated as a jam on its own.
      // Never finishing plan A is the designed cost of choosing it (GOALS.md:
      // "if you are too ambitious … the player should run out of money"), and
      // an escape hatch that cut the leftover scope took plan A from never
      // launching to winning as often as a lean plan. So the gate asks about
      // the CAUSE, not the symptom: a backlog that isn't finishing because the
      // build is parked is an accidental lock (world.js burns auto items down
      // out of cumulative buildEffort, which stops accruing the moment Alex is
      // on "discover" — park him and the backlog freezes for good). A backlog
      // that isn't finishing because it is simply enormous, with Alex heads-down
      // on it, is plan A working as intended and gets no card.
      {
        id: "launch_stall", char: "alex", ambient: true,
        text: (s) => !s.ios_unblocked
          ? "the web build is hardened and working. iOS never happened — it's been on the board since week 4 and there's nothing running. we can wait for mobile forever, or we can put the web version in front of real people and take the hit."
          : !allScopeBuilt(s)
            ? "nobody has written a line of product code in weeks — i'm on calls, jordan's on calls, and the list we said we'd finish before launch hasn't moved since. it isn't going to finish itself. put me back on the build."
            : "the product has been sitting on a server since week " + Math.max(1, s.week - 3)
              + ". it works. nobody outside this chat has ever opened it. i'm on user calls because you asked me to be — but at some point the calls are just a way of not launching.",
        when: {
          cooldown: 1,
          // Jordan's drift owns its own version of this conversation.
          if: (s, e, char) => {
            if (s.productPhase !== "product" || s.launched) return false;
            if (s.jordan_drifting && !s.jordan_resolved) return false;  // Jordan's card owns this
            if (allScopeBuilt(s) && s.ios_unblocked && char.focus === "build") return false;  // door is open
            // team.js's alex_sync_build is the softer version of the same ask
            // and owns the moment two weeks into a discovery sprint; this
            // story-class card would otherwise take Alex's slot every time.
            if (char.focus === "discover" && e.weeksSince("alex_sync_discover") >= 2
              && e.weeksSince("alex_sync_build") >= 2) return false;
            return char.focus !== "build" || !s.ios_unblocked;
          },
        },
        choices: [
          {
            key: "ship", label: "You're right — back on the build, then we ship",
            reply: "you're right and i've been avoiding it. back on the build, finish what's left, and we point it at real people.",
            journal: "Alex called it: the user calls had become a way of not launching. Put him back on the build to finish the list and get the thing in front of strangers.",
            effects: {
              char: { alex: { focus: "build", morale: 10 } },
              surface: "good_enough_launch",
            },
            fx(s) {
              // Putting him back on "build" is the whole fix: buildEffort starts
              // accruing again, so world.js resumes burning the backlog down.
              // Nothing is cut and nothing is skipped — a plan too big to finish
              // is still too big to finish. Shipping without mobile costs signal,
              // the same trade jordan_launch_blocker:web_only charges.
              const webOnly = !s.ios_unblocked;
              if (webOnly) { s.ios_unblocked = true; s.signal = Math.max(0, s.signal - 10); }
              return (webOnly
                ? "Going out web-only: no mobile on day one, and a dating app without a phone app will feel it. "
                : "He was right. The research was real, and it was also cover. ")
                + "Alex is back on the build, and whatever is left on the list is moving again.";
            },
          },
          {
            key: "wait", label: "Not yet — keep learning",
            journal: "Kept the product off the internet another week. There's always one more thing to learn first.",
            effects: { char: { alex: { morale: -10 } } },
            fx: () => "Another week with a working product and no users. Alex stopped pushing, which is worse than when he pushed.",
          },
        ],
        // Standing offer, no timeout — same reason as demo_stall: a backstop
        // that resolves itself leaves a hole on the week it resolves.
      },

      // ── the over-scope tax, said out loud ────────────────────────────────────
      // Plan A's punishment is that the list never finishes: world.js burns the
      // auto items down out of cumulative build effort, and an ambitious plan
      // needs more of it than the horizon has weeks. That was previously
      // SILENT — the weeks just went by with a hardened product and no launch
      // card, which is both a dead-air hole and a wasted lesson. This is the
      // grind on-screen. Ambient on purpose: it can never out-compete a real
      // beat, and it offers no way out, because there isn't one. Cutting the
      // list is a week-4 decision (story/dev_plan.js), not a week-20 one.
      {
        id: "scope_grind", char: "alex", ambient: true,
        text: (s) => {
          const left = s.items
            ? Object.keys(s.items).filter(k => s.items[k].auto
                && s.items[k].status !== "done" && s.items[k].status !== "deferred").length
            : 0;
          return "status: still " + left + " thing" + (left === 1 ? "" : "s")
            + " left on the pre-launch list. heads-down on it. i know how this sounds in week "
            + s.week + " — it's the plan we picked and it's the plan we're finishing.";
        },
        when: {
          cooldown: 1,
          if: (s, e, char) => s.productPhase === "product" && !s.launched
            && !allScopeBuilt(s) && char.focus === "build",
        },
        choices: [
          {
            key: "all_hands", label: "Put everyone on it — nothing else until the list is done",
            reply: "everyone on the list. no calls, no side quests, until it's done.",
            journal: (s) => "Week " + s.week + ", still finishing the plan-A list. Pulled the whole team onto it — no calls, no side quests.",
            effects: { char: { alex: { effort: 0.5 }, jordan: { effort: 0.5, focus: "build" } } },
            fx: () => "Everyone on the list. It moves a little faster with two people on it — which is the arithmetic you were doing back when you picked the plan.",
          },
          {
            key: "ack", label: "Understood — keep going",
            journal: null,
            fx: () => "Still building the list. The calendar isn't waiting for it.",
          },
        ],
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.STORY = window.STORY || []).push(mod);
})();
