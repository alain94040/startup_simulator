// ─────────────────────────────────────────────────────────────────────────────
// v2/story/demo_night.js — the demo-night scene: the first true stranger uses
// the app while Alex live-narrates the session. Three free beats; the last one
// plants the pivot seed as story — her first message is "so what happens now?"
// (the "demo_first_message:note" fact is the evidence chip pivot day cashes in).
//
// The scene only opens if the player *answers* alex_demo_ready (rough or
// polish); ignoring it means a demo happens off-screen, rougher, and demo
// night — with its question — never happens. That asymmetry is the point.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  function demoItems(s, quality) {
    if (!s.items) return;
    if (s.items.matching_algo && s.items.matching_algo.status === "active") {
      s.items.matching_algo.status = "done"; s.items.matching_algo.quality = quality;
    }
    if (s.items.api_design) s.items.api_design.status = "active";
    if (!s.items.analytics) s.items.analytics = { status: "todo", quality: null, assignee: null };
  }

  const mod = {
    arcs: [
      {
        id: "demo",
        scene: { cast: ["alex"] },
        beats: [
          {
            id: "demo_ready", char: "alex",
            text: "profiles and matching work end-to-end for the first time. create an account, get matched, send a message. that's the core hypothesis. want to put it in front of real people?",
            // The binding constraint is Alex's actual build output: part-time
            // Alex (0.4× passive, 0.6× grants) reaches 6 effort weeks later than
            // full-time — the commitment lesson, measured. Also waits for the
            // matching call so a licensed engine isn't overwritten.
            when: {
              after: ["matching_choice"],
              if: (s, e, char) => char.buildEffort >= 6 && !s.has_demo && !s.launched,
            },
            choices: [
              {
                key: "rough", label: "Show it rough — learn fast",
                reply: "show it rough. tonight. i'd rather watch someone hit a wall than polish a guess.",
                effects: {
                  waitlist: 2, marketFit: 8,
                  flags: { has_demo: true },
                  scene: "demo",
                  say: { char: "alex", text: "ok. jordan found us a real first tester — her sister's friend. total stranger, never seen the app. she's on tonight at 8 and i'm watching the session live. don't make plans." },
                },
                fx(s) {
                  s.tech_debt = (s.tech_debt || 0) + 12;
                  demoItems(s, "rough");
                  return "Demo's out — rough edges and all. Tonight it goes in front of a total stranger for the first time, live, while Alex watches the session logs.";
                },
              },
              {
                key: "polish", label: "One sprint to polish it first",
                reply: "one sprint of polish first. if the first stranger hits a crash in minute one we learn nothing.",
                effects: {
                  waitlist: 2, marketFit: 4, signal: 4,
                  flags: { has_demo: true },
                  scene: "demo",
                  say: { char: "alex", text: "polish sprint done — worst edges are gone. and jordan lined up our first true stranger: her sister's friend, tonight at 8. i'm watching the session live. don't make plans." },
                },
                fx(s) {
                  s.tech_debt = (s.tech_debt || 0) + 3;
                  demoItems(s, "solid");
                  return "One sprint of cleanup, then out the door. Tonight the polished demo goes in front of a total stranger for the first time, live, while Alex watches the session logs.";
                },
              },
            ],
            // Ignored: a demo happens anyway — scheduled around you, rougher,
            // and without the night that plants the question.
            timeout: {
              weeks: 2,
              effects: { waitlist: 1, flags: { has_demo: true } },
              fx(s) { s.tech_debt = (s.tech_debt || 0) + 18; demoItems(s, "rough"); },
              say: { char: "alex", text: "someone asked for a demo and i scheduled it for next week. we're showing what we have." },
            },
          },
          {
            id: "demo_watch", char: "alex",
            text: "she's in. no idea we're watching. she's been on the intake screen for 90 seconds — is that good or bad? i genuinely can't tell. nobody has ever used this without one of us narrating over their shoulder.",
            when: { took: ["demo_ready:rough|polish"] },
            choices: [
              {
                key: "watch", label: "Say nothing — watch what she does",
                reply: "don't touch anything. watch what she does with it.",
                journal: null,
                effects: {
                  signal: 3,
                  say: { char: "alex", text: "she typed an answer, deleted it, typed it again. four minutes on question 2. she's taking it seriously." },
                },
              },
              {
                key: "hint", label: "Message her — she can skip ahead",
                reply: "ping her that it's ok to skip anything. i don't want to lose her on question 2.",
                journal: null,
                effects: {
                  say: { char: "alex", text: "she skipped straight to the matches. faster — but now we'll never know if the questions were landing or losing her." },
                },
              },
            ],
          },
          {
            id: "demo_bug", char: "alex",
            text: "problem. she's trying to upload a photo from her camera roll — it's a HEIC file and the uploader just spins. she's retried twice. do i push a converter hotfix while she's mid-session, or note it and let her hit the wall?",
            choices: [
              {
                key: "hotfix", label: "Hotfix it live — she never knows",
                reply: "fix it now, while she's in there. first impressions don't get a second take.",
                journal: null,
                effects: {
                  say: { char: "alex", text: "pushed the converter mid-session. her third retry just worked — she thinks it was her wifi. also: we had zero HEIC handling, which is every iphone since 2017. adding it to the list." },
                },
                fx(s) { s.tech_debt = (s.tech_debt || 0) + 4; return null; },
              },
              {
                key: "note", label: "Note it — see if she pushes through",
                reply: "leave it. i want to see what she does when it doesn't work.",
                journal: null,
                effects: {
                  signal: 4,
                  say: { char: "alex", text: "she gave up on the photo and kept going anyway. still filling everything in. honestly? someone fighting through a broken uploader to finish a profile is the most encouraging bug report we will ever get." },
                },
              },
            ],
          },
          {
            id: "demo_first_message", char: "alex",
            text: "ok. she finished the profile. matched with one of the guys we seeded the app with. she just sent the first message and i have to read it to you verbatim: 'so what happens now?' …i've been staring at it for five minutes. i don't know what our app answers to that.",
            choices: [
              {
                key: "note", label: "Write it down — verbatim",
                reply: "write it down exactly like that. 'so what happens now?' that one goes on the wall.",
                journal: "Demo night. A total stranger finished the flow, matched, and her first message was 'so what happens now?' Wrote it on a post-it and stuck it on the monitor. The product answered every question except the one that matters.",
                effects: {
                  marketFit: 6,
                  flags: { demo_question_seen: true },
                  scene: null, // demo night ends — the world un-holds
                  say: { char: "alex", text: "post-it's on the monitor. good night. weird night. the app works and i can't stop thinking about her question." },
                  // Establishes the pre-launch fiction: a hand-recruited TestFlight
                  // circle — a dozen friends-of-friends, explicitly NOT a launch.
                  schedule: {
                    in: 1, char: "jordan",
                    say: { char: "jordan", text: "put the demo build on testflight for my sister's friend group — a dozen people, all vouched for. not a launch, just eyes on it while we build." },
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.V2STORY = window.V2STORY || []).push(mod);
})();
