
const rnd   = n => Math.floor(Math.random() * n);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ─────────────────────────────────────────────
// CHARACTER DEFINITIONS
// Each character owns their card pool.
// Card functions receive (globalState, charInstance, engine).
// charInstance is null for global-pool cards.
// ─────────────────────────────────────────────

const CHARACTER_DEFS = {

  alex: {
    id: 'alex', name: 'Alex', type: 'cofounder',
    skills: { build: 1.2, discover: 0.7, pitch: 0.5 },
    cards: [

      // ── EARLY: RELATIONSHIP ─────────────────
      {
        id: 'equity_talk', cat: 't', from: 'Alex',
        body: "hey — can we actually write down the equity split? i told my girlfriend i own half the company and she asked me to show her something official. also want to make sure we agree before it gets complicated.",
        urgency: 2, weeks: 1, priority: true,
        available: (s, char) => s.incorporated && s.week <= 12 && !char.flags.equity_set,
        options: [
          { label: 'Agree — 50/50', key: 'fair',
            execute(s, char) { char.flags.equity_set = true; char.morale = clamp(char.morale + 10, 0, 100); char.trust = clamp(char.trust + 8, 0, 100); return "50/50 agreed. 4-year vesting, 1-year cliff. Both sides signed. Feels solid."; } },
          { label: 'Push for 60/40', key: 'negotiate',
            execute(s, char) { char.flags.equity_set = true; char.morale = clamp(char.morale - 12, 0, 100); char.trust = clamp(char.trust - 10, 0, 100); return "After a long conversation, Alex accepted 60/40. He agreed, but wasn't thrilled. Watch his mood."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "i keep getting asked about my equity stake and i don't have anything to show. this really needs to happen.",
        dropFx(s, char) { char.morale = clamp(char.morale - 15, 0, 100); },
      },
      {
        id: 'alex_commitment', cat: 't', from: 'Alex',
        body: "i've been thinking — i can't quit my job until we have some real traction. evenings and weekends for now. that should be enough to get to launch, right?",
        urgency: 3, weeks: 1, priority: true,
        available: (s, char) => s.week <= 5 && !char.flags.commitment_resolved,
        options: [
          { label: 'Accept — milestones first', key: 'accept',
            execute(s, char) { char.flags.commitment_resolved = true; char.morale = clamp(char.morale - 5, 0, 100); s.signal = clamp(s.signal - 5, 0, 100); return "Alex stays part-time for now. Slower, but stable. Set a clear milestone to revisit."; } },
          { label: 'Push for full commitment', key: 'push',
            execute(s, char) { char.flags.commitment_resolved = true; char.flags.committed_fulltime = true; char.morale = clamp(char.morale - 25, 0, 100); char.trust = clamp(char.trust - 10, 0, 100); s.product = clamp(s.product + 4, 0, 100); return "Alex agreed to go full-time. He's not happy about the pressure. Watch his mood."; } },
        ],
        dropDelay: 3, dropFrom: 'Alex',
        dropMsg: "got a really good offer from a startup. i need to decide by friday. can we talk about where this is actually going?",
        dropFx(s, char) { char.morale = clamp(char.morale - 14, 0, 100); },
      },
      {
        id: 'vision_mismatch', cat: 't', from: 'Alex',
        body: "wait — i demoed to my colleague today and called it a 'team productivity tool'. you've been telling people it's a 'workflow automation platform'. those are completely different products. which are we building?",
        urgency: 3, weeks: 1, priority: true,
        available: (s, char) => s.week <= 10 && s.product < 50 && !char.flags.vision_resolved,
        options: [
          { label: "Go with Alex's framing", key: 'alex',
            execute(s, char) { char.flags.vision_resolved = true; char.trust = clamp(char.trust + 8, 0, 100); char.morale = clamp(char.morale + 10, 0, 100); s.signal = clamp(s.signal - 4, 0, 100); return "Went with Alex's framing. Cleaner for developers. Some earlier investor conversations are now awkward, but at least you're aligned."; } },
          { label: 'Defend your framing', key: 'yours',
            execute(s, char) { char.flags.vision_resolved = true; s.signal = clamp(s.signal + 8, 0, 100); char.morale = clamp(char.morale - 8, 0, 100); char.trust = clamp(char.trust - 4, 0, 100); return "Alex went along with it. He's not wrong that it doesn't land with developers, but the investor story holds. Tension unresolved."; } },
          { label: 'Run a 1-week test', key: 'test',
            execute(s, char) { char.flags.vision_resolved = true; s.signal = clamp(s.signal + 14, 0, 100); char.morale = clamp(char.morale + 5, 0, 100); char.trust = clamp(char.trust + 6, 0, 100); return "Ran 8 quick calls. Ops buyers respond to 'workflow automation'; developers respond to 'team productivity'. You have a wedge story now. Decided to lead with ops buyers."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "pitched it differently again. i think we're building two different products in our heads. investors are going to notice.",
        dropFx(s, char) { s.signal = clamp(s.signal - 10, 0, 100); char.morale = clamp(char.morale - 10, 0, 100); },
      },
      {
        id: 'alex_side_project', cat: 't', from: 'Alex',
        body: "full disclosure — i've been doing about 3 hours a day on a side project. just exploring, not competitive. didn't mention it because i didn't think it was a big deal.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.week >= 3 && s.week <= 14 && char.morale > 50 && !char.flags.committed_fulltime,
        options: [
          { label: 'Ask him to pause it', key: 'pause',
            execute(s, char) { char.morale = clamp(char.morale + 5, 0, 100); char.trust = clamp(char.trust + 5, 0, 100); return "Honest conversation. Alex drops the side project until you hit a milestone. Relationship stronger for it."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "i've been thinking — i'm putting in more time than we agreed and progress is slow. is our commitment really equal here?",
        dropFx(s, char) { char.flags.side_project_active = true; char.morale = clamp(char.morale - 20, 0, 100); char.trust = clamp(char.trust - 10, 0, 100); },
      },
      {
        id: 'alex_side_project_escalation', cat: 't', from: 'Alex',
        body: "i know we talked about this before, but i've been putting more into it — probably 15 hours a week now. i think i need to be honest with you about where my head is at.",
        urgency: 3, weeks: 1,
        available: (s, char) => char.flags.side_project_active && s.week <= 26,
        options: [
          { label: 'Tell him the startup needs him fully', key: 'talk',
            execute(s, char) { char.flags.side_project_active = false; char.morale = clamp(char.morale + 8, 0, 100); char.trust = clamp(char.trust + 10, 0, 100); return "Hard conversation. Alex commits fully. He was relieved you brought it up directly."; } },
        ],
        dropDelay: 3, dropFrom: 'Alex',
        dropMsg: "i've decided to pursue it seriously. i'll keep helping part-time but i think we both know i'm not fully in anymore.",
        dropFx(s, char) { char.flags.side_project_active = false; char.morale = clamp(char.morale - 30, 0, 100); char.trust = clamp(char.trust - 25, 0, 100); },
      },
      {
        id: 'alex_quiet', cat: 't', from: 'Alex',
        body: "short replies for 3 days, skipped standup yesterday. you don't know if it's burnout, frustration with progress, or something personal.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.week > 4 && char.morale < 65,
        options: [
          { label: 'Check in with him', key: 'checkin',
            execute(s, char) { char.morale = clamp(char.morale + 20, 0, 100); return "Had an honest conversation. Alex is exhausted. Adjusted expectations for the week."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "i need some space. working from home this week to figure some things out.",
        dropFx(s, char) { char.morale = clamp(char.morale - 14, 0, 100); char.trust = clamp(char.trust - 6, 0, 100); },
      },
      {
        id: 'friend_wants_in', cat: 't', from: 'Alex',
        body: "my friend Jamie wants to join as the first employee. smart, enthusiastic. skills overlap with mine a lot but they'd ship fast. your call though.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.week >= 4 && s.week <= 18 && s.product < 70,
        options: [
          { label: 'Bring Jamie on board', key: 'hire',
            execute(s, char) { s.product = clamp(s.product + 6, 0, 100); char.morale = clamp(char.morale + 8, 0, 100); s.network.peers += 2; return "Jamie joined. High energy, shipped 2 useful features in the first week."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "jamie went with another startup. they asked why we passed and honestly i didn't have a great answer.",
        dropFx(s, char) { char.morale = clamp(char.morale - 10, 0, 100); },
      },
      {
        id: 'alex_equity', cat: 't', from: 'Alex',
        body: "third time this month. 'i'm not sure the current split reflects what i'm actually contributing.' getting harder to deflect.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.week >= 16 && char.morale < 55,
        options: [
          { label: 'Revise fairly', key: 'fair',
            execute(s, char) { char.morale = clamp(char.morale + 30, 0, 100); char.trust = clamp(char.trust + 15, 0, 100); return "Revised the split. Both sides signed. Relationship back on solid ground."; } },
          { label: 'Bargain hard', key: 'hard',
            execute(s, char) { char.morale = clamp(char.morale + 8, 0, 100); return "Pushed back hard. Alex accepted for now but isn't happy — expect this again."; } },
          { label: 'Defer it', key: 'defer',
            execute(s, char) { char.morale = clamp(char.morale - 8, 0, 100); char.trust = clamp(char.trust - 5, 0, 100); return "Kicked the can. Alex grudgingly agreed to wait, but this is coming back."; } },
        ],
        dropDelay: 1, dropFrom: 'Alex',
        dropMsg: "i've been talking to a lawyer. i want to revisit the founder agreement formally. this isn't going away.",
        dropFx(s, char) { char.morale = clamp(char.morale - 18, 0, 100); char.trust = clamp(char.trust - 12, 0, 100); },
      },

      // ── FOCUS ALIGNMENT ──────────────────────
      {
        id: 'alex_sync_discover', cat: 't', from: 'Alex',
        body: "we've been heads-down building for a while without talking to anyone outside. should we shift focus to customer discovery for a sprint or two?",
        urgency: 2, weeks: 1, priority: true,
        available: (s, char) => s.week >= 6 && char.focus === 'build' && char.focusSprints >= 2,
        options: [
          { label: 'Yes — shift to discovery', key: 'discover',
            execute(s, char) { char.focus = 'discover'; char.focusSprints = 0; return "Agreed. Alex on customer discovery this sprint."; } },
          { label: 'Not yet — keep building', key: 'build',
            execute(s, char) { char.focusSprints = 0; char.morale = clamp(char.morale - 5, 0, 100); return "Keeping Alex on building. He noted it."; } },
        ],
        dropDelay: 1, dropFrom: 'Alex',
        dropMsg: "didn't hear back on this. sticking to what we're doing, but we should talk.",
        dropFx(s, char) { char.morale = clamp(char.morale - 5, 0, 100); char.focusSprints = 0; },
      },
      {
        id: 'alex_sync_build', cat: 't', from: 'Alex',
        body: "i think we have enough customer feedback to act on for now. ready to get back to building?",
        urgency: 2, weeks: 1, priority: true,
        available: (s, char) => char.focus === 'discover' && char.focusSprints >= 2 && s.customers >= 5,
        options: [
          { label: 'Yes — back to building', key: 'build',
            execute(s, char) { char.focus = 'build'; char.focusSprints = 0; return "Agreed. Alex back to building."; } },
          { label: 'Stay in discovery', key: 'discover',
            execute(s, char) { char.focusSprints = 0; char.morale = clamp(char.morale - 5, 0, 100); return "Staying in discovery mode. Alex a bit frustrated."; } },
        ],
        dropDelay: 1, dropFrom: 'Alex',
        dropMsg: "still doing discovery then. fine — but product progress is going to stall.",
        dropFx(s, char) { char.morale = clamp(char.morale - 5, 0, 100); char.focusSprints = 0; },
      },
      {
        id: 'alex_sync_pitch', cat: 't', from: 'Alex',
        body: "our traction story is getting solid. i could start warming up investor conversations instead of coding — free you up to focus on the product. worth trying?",
        urgency: 1, weeks: 1, priority: true,
        available: (s, char) => char.focus !== 'pitch' && char.focusSprints >= 2 && s.signal >= 45 && s.customers >= 15 && s.deck_ready,
        options: [
          { label: 'Yes — work the pipeline', key: 'pitch',
            execute(s, char) { char.focus = 'pitch'; char.focusSprints = 0; return "Agreed. Alex working the investor pipeline."; } },
          { label: 'Not yet', key: 'stay',
            execute(s, char) { char.focusSprints = 0; return "Staying the course for now."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },

      // ── EARLY: ADMIN & LEGAL ─────────────────
      {
        id: 'incorporate_now', cat: 'e', from: 'Alex',
        body: "a potential user just asked us to sign an NDA before they'd demo their workflow. we can't sign anything without a legal entity. also — we need a bank account. do we use Stripe Atlas or find a lawyer?",
        urgency: 2, weeks: 1, priority: true,
        available: (s, char) => s.week <= 8 && !s.incorporated,
        options: [
          { label: 'Stripe Atlas — fast and cheap', key: 'atlas',
            execute(s, char) { s.incorporated = true; return "Incorporated via Stripe Atlas. $500, Delaware C-corp, EIN, bank account open. Feels official."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "that user followed up on the NDA again. we still don't have a legal entity.",
        dropFx(s, char) { s.signal = clamp(s.signal - 6, 0, 100); },
      },
      {
        id: 'ip_concern', cat: 'e', from: 'Alex',
        body: "something i've been meaning to raise — i wrote some early prototypes at my last job, same general problem space. if an investor or acquirer ever does diligence, could my old employer claim ownership?",
        urgency: 3, weeks: 1,
        available: (s, char) => s.week <= 12 && !s.ip_clear,
        options: [
          { label: 'Get a lawyer to review', key: 'lawyer',
            execute(s, char) { s.ip_clear = true; s.cash -= 1500; return "Lawyer reviewed. Previous employer has no claim — personal time, unrelated enough. IP assignment signed. Clean. ($1,500)"; } },
        ],
        dropDelay: 3, dropFrom: 'Lawyer (friend)',
        dropMsg: "heads up — looked at your previous employer's IP agreement. it's broadly written. clean this up before investor diligence.",
        dropFx(s, char) { s.signal = clamp(s.signal - 12, 0, 100); s.investor_warmth = clamp(s.investor_warmth - 10, 0, 100); },
      },

      // ── EARLY: MARKET & IDEA ─────────────────
      {
        id: 'first_interview_shock', cat: 'c', from: 'Alex',
        body: "just got off a customer interview. they said the real problem isn't what we're solving — it's actually the step before it. they'd pay $200/month for that. we might be building the wrong thing.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.week <= 8 && s.product < 40 && char.focus === 'discover',
        options: [
          { label: 'Pivot — investigate upstream', key: 'pivot',
            execute(s, char) { s.signal = clamp(s.signal + 15, 0, 100); s.product = clamp(s.product - 5, 0, 100); return "Pivoted focus. Lost a week of progress but gained real signal. Three more interviews confirmed it."; } },
          { label: 'Stay the course', key: 'stay',
            execute(s, char) { s.signal = clamp(s.signal + 5, 0, 100); return "Filed it away. Not ready to pivot on one data point. Logged it for later."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "had 2 more interviews. same thing — everyone says the problem is upstream. we need to talk.",
        dropFx(s, char) { s.signal = clamp(s.signal - 15, 0, 100); },
      },
      {
        id: 'cold_silence', cat: 'c', from: 'Alex',
        body: "sent 30 cold emails this week to people in our target market. 0 replies. not even 'not interested'. is the messaging wrong, or are we targeting the wrong people?",
        urgency: 3, weeks: 1,
        available: (s, char) => s.week >= 2 && s.week <= 12 && !s.launched && s.signal < 50 && char.focus === 'discover',
        options: [
          { label: 'Rewrite the outreach', key: 'rewrite',
            execute(s, char) { s.signal = clamp(s.signal + 10, 0, 100); return "Rewrote the cold email. New version leads with the pain, not the product. First reply came in 4 hours."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "week 2 of silence. i'm starting to wonder if anyone actually has this problem badly enough.",
        dropFx(s, char) { s.signal = clamp(s.signal - 10, 0, 100); char.morale = clamp(char.morale - 8, 0, 100); },
      },
      {
        id: 'random_reframe', cat: 'c', from: 'Alex',
        body: "talked to a stranger at a coffee shop about what we're building. they said 'oh so it's like [completely different description] but for [different market].' we both went quiet. it kind of makes more sense than our own pitch.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.week <= 12 && s.signal < 55 && char.focus === 'discover',
        options: [
          { label: 'Test the new framing', key: 'test',
            execute(s, char) { s.signal = clamp(s.signal + 12, 0, 100); s.network.peers += 3; return "Ran the new framing by 3 more people. All 3 immediately got it. Updated the positioning."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'family_doubt', cat: 't', from: 'Alex',
        body: "my parents asked me again when i'm getting a real job. yours too? i keep explaining it but they don't really get it. tbh it's starting to get in my head a little.",
        urgency: 1, weeks: 1,
        available: (s, char) => s.week >= 2 && s.week <= 18 && char.morale < 80,
        options: [
          { label: 'Remind each other why', key: 'talk',
            execute(s, char) { char.morale = clamp(char.morale + 12, 0, 100); return "Long talk. Reminded each other why you're doing this. Morale reset."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },

      // ── MID: PRODUCT ─────────────────────────
      {
        id: 'good_enough_launch', cat: 'p', from: 'Alex',
        body: "it's good enough. every week we wait is a week we're not learning from real users. i know it's not perfect but i think we should just ship it.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.product >= 55 && !s.launched && char.focus === 'build',
        options: [
          { label: 'Ship it — launch now', key: 'ship',
            execute(s, char) { s.launched = true; s.signal = clamp(s.signal + 12, 0, 100); return "Launched. First real users are in. Feedback starts flowing."; } },
          { label: 'Two more weeks', key: 'wait',
            execute(s, char) { s.product = clamp(s.product + 6, 0, 100); char.morale = clamp(char.morale - 12, 0, 100); return "Polished a few more things. Alex thinks you're stalling — and he might be right."; } },
        ],
        dropDelay: 1, dropFrom: 'Alex',
        dropMsg: "another week building in a vacuum. runway is ticking and we still have zero real user feedback.",
        dropFx(s, char) { s.cash = clamp(s.cash - 800, 0, 9999999); char.morale = clamp(char.morale - 10, 0, 100); },
      },
      {
        id: 'alex_wants_rebuild', cat: 'p', from: 'Alex',
        body: "the current approach won't scale past 100 users. i know it's 2 weeks of work but if we don't do it now, it'll take 3x longer later.",
        urgency: 2, weeks: 2,
        available: (s, char) => s.product > 40 && s.week > 8 && char.focus === 'build',
        options: [
          { label: 'Do the refactor', key: 'refactor',
            execute(s, char) { s.product = clamp(s.product + 12, 0, 100); char.morale = clamp(char.morale + 15, 0, 100); return "Architecture refactored. Faster, cleaner. Alex is energized."; } },
        ],
        dropDelay: 4, dropFrom: 'Alex',
        dropMsg: "3 active outages this week from the tech debt i flagged. we're losing users in real time.",
        dropFx(s, char) { s.customers = clamp(s.customers - 8, 0, 9999); char.morale = clamp(char.morale - 20, 0, 100); },
      },
      {
        id: 'alex_decision', cat: 't', from: 'Customer',
        body: "alex told me you'd ship a full integration by friday. it's wednesday. i don't see anything about this in the roadmap.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.launched && s.customers > 3,
        options: [
          { label: 'Ship the integration', key: 'ship',
            execute(s, char) { s.customers += 3; char.morale = clamp(char.morale + 5, 0, 100); return "Pulled off the integration. Customer delighted. Set boundaries with Alex about commitments."; } },
        ],
        dropDelay: 1, dropFrom: 'Customer',
        dropMsg: "it's monday. still nothing. we're blocking our launch on this.",
        dropFx(s, char) { s.signal = clamp(s.signal - 10, 0, 100); s.customers = clamp(s.customers - 4, 0, 9999); },
      },


      // ── DEPARTURE ARC ────────────────────────
      {
        id: 'alex_leaving_threat', cat: 't', from: 'Alex',
        body: "got a message from an old colleague at a well-funded startup. not going anywhere — but i think we need to have an honest conversation about where this is headed for me.",
        urgency: 3, weeks: 1, priority: true,
        available: (s, char, e) => e.alexDepartureRisk && char.active,
        options: [
          { label: 'Have the honest conversation', key: 'talk',
            execute(s, char, e) { char.trust = clamp(char.trust + 20, 0, 100); char.morale = clamp(char.morale + 15, 0, 100); e.alexDepartureRisk = false; return "Long, honest conversation. Alex is staying. Things need to improve — but you're aligned now."; } },
        ],
        dropDelay: 1, dropFrom: 'Alex',
        dropMsg: "i accepted the offer. i'm sorry — i think this is right for me. i'll do a proper handoff this week.",
        dropFx(s, char, e) { char.active = false; e.alexDepartureRisk = false; },
      },
    ],
  },

  priya: {
    id: 'priya', name: 'Priya (advisor)', type: 'advisor',
    unlockCondition: (s) => s.week >= 4 && s.network.peers >= 14,
    cards: [
      {
        id: 'mentor_competitor_bomb', cat: 'c', from: 'Priya (advisor)',
        body: "looked at your idea over the weekend. you should know: there are at least 3 companies working on this right now. one is YC-backed from 2022. you need a much sharper answer to 'why you.'",
        urgency: 3, weeks: 1,
        available: (s, char) => s.week <= 10 && s.signal < 60,
        options: [
          { label: 'Do a competitive deep-dive', key: 'research',
            execute(s, char) { s.signal = clamp(s.signal + 8, 0, 100); s.network.advisors++; return "Did a full competitive analysis. None of them solve it for your niche. That's your wedge. Priya is now a real advisor."; } },
        ],
        dropDelay: 2, dropFrom: 'Priya',
        dropMsg: "any progress on differentiating from the competition? investors will definitely ask.",
        dropFx(s, char) { s.signal = clamp(s.signal - 8, 0, 100); s.investor_warmth = clamp(s.investor_warmth - 8, 0, 100); },
      },
    ],
  },

  marcus: {
    id: 'marcus', name: 'Marcus (angel)', type: 'investor',
    unlockCondition: (s) => s.week >= 6 && s.network.advisors >= 1,
    cards: [
      {
        id: 'investor_intro_warm', cat: 'e', from: 'Marcus (angel)',
        body: "following up — genuinely interested in what you're building. if i don't hear back by end of week i'll assume timing's off.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.week > 4 && s.investor_warmth < 50 && !char.flags.intro_warm_done,
        options: [
          { label: 'Take the call', key: 'call',
            execute(s, char) { char.flags.intro_warm_done = true; s.investor_warmth = clamp(s.investor_warmth + 20, 0, 100); s.network.angels++; return "Great call. Marcus is following your progress."; } },
        ],
        dropDelay: 1, dropFrom: 'Marcus',
        dropMsg: "tried twice. no reply. moving on — good luck with the company.",
        dropFx(s, char) { s.investor_warmth = clamp(s.investor_warmth - 15, 0, 100); },
      },
      {
        id: 'prep_deck', cat: 'e', from: 'Marcus (angel)',
        body: "when you're ready to have a more formal conversation, can you send me a deck? you don't want to be scrambling to build one mid-diligence.",
        urgency: 1, weeks: 1,
        available: (s, char) => !s.deck_ready && s.signal >= 38 && s.customers >= 5,
        options: [
          { label: 'Build the deck now', key: 'build',
            execute(s, char) { s.deck_ready = true; return "Deck done. Story is clear. Ready when the time comes."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'investor_ready', cat: 'e', from: 'Marcus (angel)',
        body: "two investors want to meet this week. deck is ready, story is tight, both have context. momentum is high right now.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.deck_ready && s.signal >= 38 && s.investor_warmth < 75 && s.network.angels >= 1,
        options: [
          { label: 'Take both meetings', key: 'meet',
            execute(s, char) { s.investor_warmth = clamp(s.investor_warmth + 28, 0, 100); return "Strong meetings. Both investors want to see your next milestone."; } },
        ],
        dropDelay: 2, dropFrom: 'Investor',
        dropMsg: "reached out twice. no reply. assumed timing wasn't right. moving on.",
        dropFx(s, char) { s.investor_warmth = clamp(s.investor_warmth - 20, 0, 100); },
      },
      {
        id: 'seed_pitch', cat: 'e', from: 'Marcus (angel)',
        body: "we've been watching your progress. i think the traction is there. ready to have the formal conversation about leading your seed?",
        urgency: 2, weeks: 2,
        available: (s, char) => s.investor_warmth >= 62 && s.deck_ready && s.customers >= 60 && s.product >= 40 && s.signal >= 45,
        options: [{ label: 'Yes — let\'s pitch', key: 'pitch',
        execute(s, char, e) {
          const score = clamp(s.customers / 3, 0, 35) + clamp(s.product / 5, 0, 20)
            + clamp(s.investor_warmth / 4, 0, 25) + (s.signal >= 60 ? 8 : 0) + (s.ycAccepted ? 20 : 0);
          if (Math.random() < (score >= 65 ? 0.80 : score >= 50 ? 0.45 : 0.15)) {
            s.game_won = true;
            return "Seed round closed!";
          }
          s.investor_warmth = clamp(s.investor_warmth - 15, 0, 100);
          return "Marcus: \"we love the vision but need more traction to lead. come back in 2 months.\"";
        } }],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
    ],
  },

  sarah: {
    id: 'sarah', name: 'Sarah (mutual)', type: 'connector',
    unlockCondition: (s) => s.week >= 3 && s.network.peers >= 13,
    cards: [
      {
        id: 'intro_expiring', cat: 'c', from: 'Sarah (mutual)',
        body: "intro'd you to the head of ops at a fast-growing startup. she told me yesterday she's evaluating 2 other tools. you need to reply today.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.week > 3 && !char.flags.intro_done && (s.launched || s.product >= 35),
        options: [
          { label: 'Reply to Sarah now', key: 'reply',
            execute(s, char) { char.flags.intro_done = true; s.customers += 5 + rnd(5); s.signal = clamp(s.signal + 7, 0, 100); s.network.advisors++; return "Had the call. Strong fit — they signed up on the spot. Sarah is now a connector you can rely on."; } },
        ],
        dropDelay: 1, dropFrom: 'Sarah',
        dropMsg: "they went with something else. mentioned they didn't hear back in time. that one hurt.",
        dropFx(s, char) { s.signal = clamp(s.signal - 8, 0, 100); },
      },
    ],
  },
};

// ─────────────────────────────────────────────
// GLOBAL SITUATION POOL
// Market events and system alerts — no character owner.
// ─────────────────────────────────────────────

const SITUATIONS = [
  // ── Friends & Family ────────────────────────────────────────────────────────
  {
    id: 'ff_family', cat: 'e', from: 'Mom',
    body: "just checking in! dad and i were talking about you last night. so proud. how's it going? let us know if there's anything we can do.",
    urgency: 2, weeks: 1, priority: true,
    available: (s) => s.week <= 6 && !s.ff_family_done,
    options: [
      { label: 'Ask if they\'d put money in', key: 'ask',
        execute(s) {
          s.ff_family_done = true;
          if (Math.random() < 0.8) { s.cash += 8000; return "Mom called back. They're in for $8,000. It hits different when it's family money."; }
          return "They'd love to help but timing is bad — stretched with the house right now.";
        } },
    ],
    dropDelay: 0, dropMsg: null, dropFx: null,
  },
  {
    id: 'ff_friend', cat: 'e', from: 'Jamie (college friend)',
    body: "heard you actually quit to do this full time. wild. coffee this week? i've been wanting to hear about it.",
    urgency: 2, weeks: 1, priority: true,
    available: (s) => s.week >= 2 && s.week <= 8 && !s.ff_friend_done,
    options: [
      { label: 'Tell him about it — and ask', key: 'ask',
        execute(s) {
          s.ff_friend_done = true;
          if (Math.random() < 0.8) { s.cash += 7000; return "Jamie sent $7,000 via Venmo. 'Least I could do — you believed in me when I quit my job.'"; }
          return "Jamie's cash is tied up right now — car loan and a wedding. 'Ask me again in 6 months.'";
        } },
    ],
    dropDelay: 0, dropMsg: null, dropFx: null,
  },
  {
    id: 'ff_mentor', cat: 'e', from: 'David (ex-manager)',
    body: "keeping an eye on what you're doing. would love to grab lunch — been a while. let me know when you're free.",
    urgency: 2, weeks: 1, priority: true,
    available: (s) => s.week >= 3 && s.week <= 10 && !s.ff_mentor_done,
    options: [
      { label: 'Pitch him over lunch', key: 'pitch',
        execute(s) {
          s.ff_mentor_done = true;
          if (Math.random() < 0.8) { s.cash += 10000; s.investor_warmth = clamp(s.investor_warmth + 5, 0, 100); return "David pulled out his checkbook. $10,000 and a warm intro to two angels he knows."; }
          return "Great lunch. David's being conservative with money this year — new baby coming. 'I'm rooting for you though.'";
        } },
    ],
    dropDelay: 0, dropMsg: null, dropFx: null,
  },
  // ── Founder-initiated early actions ─────────────────────────────────────────
  {
    id: 'founder_landing', cat: 'p', from: 'You',
    body: "you've been talking about this for two weeks but there's nowhere to point people. no domain, no landing page, no email capture. it's making conversations awkward.",
    urgency: 2, weeks: 1,
    available: (s) => s.week <= 5 && !s.has_landing_page,
    options: [
      { label: 'Register the domain + set up a landing page', key: 'build',
        execute(s) { s.has_landing_page = true; s.signal = clamp(s.signal + 8, 0, 100); return "Domain registered. Simple landing page live. Already have 12 email signups from people you talked to this week."; } },
    ],
    dropDelay: 0, dropMsg: null, dropFx: null,
  },
  {
    id: 'founder_first_interviews', cat: 'c', from: 'You',
    body: "you've been building for two weeks and haven't had a single structured conversation with a real potential customer. everything you're building is a guess.",
    urgency: 2, weeks: 1,
    available: (s) => !s.launched && !s.first_interviews_done && s.week <= 8,
    options: [
      { label: 'Block off this week for 5 customer interviews', key: 'interview',
        execute(s) { s.first_interviews_done = true; s.signal = clamp(s.signal + 15, 0, 100); s.customers += 5; return "5 calls done. Two insights you didn't expect. One interviewee asked if they could pay you now. Signal much clearer."; } },
    ],
    dropDelay: 0, dropMsg: null, dropFx: null,
  },
  // ── YC ─────────────────────────────────────────────────────────────────────
  {
    id: 'yc_discussion_ready', cat: 'e', from: 'Hacker News',
    body: "YC application window just opened. Your stats qualify — 60%+ product, 40+ customers. A lot of founders in your space are applying this batch.",
    urgency: 2, weeks: 1, priority: true,
    available: (s, char, e) => s.week >= e.ycWeek && !s.ycDeciding && !s.ycApplied && s.product >= 60 && s.customers >= 40,
    options: [
      { label: 'Apply this cycle', key: 'apply',
        execute(s, char, e) { s.ycDeciding = true; return "Decided to go for it. Need to write the application this sprint."; } },
      { label: 'Skip this batch', key: 'skip',
        execute(s, char, e) { e.ycWeek += 12; return "Decided to skip this batch. Next one opens in ~12 weeks."; } },
    ],
    dropDelay: 0, dropMsg: null, dropFx: null,
  },
  {
    id: 'yc_discussion_early', cat: 'e', from: 'Hacker News',
    body: "YC application window just opened. Stats aren't quite there yet — need 60% product and 40 customers. Some teams apply anyway to get partner feedback. Apply or wait for next batch?",
    urgency: 2, weeks: 1, priority: true,
    available: (s, char, e) => s.week >= e.ycWeek && !s.ycDeciding && !s.ycApplied && (s.product < 60 || s.customers < 40),
    options: [
      { label: 'Apply anyway', key: 'apply',
        execute(s, char, e) { s.ycDeciding = true; return "Going for it — a long shot, but the partner feedback alone is worth it."; } },
      { label: 'Wait for next batch', key: 'skip',
        execute(s, char, e) { e.ycWeek += 12; return "Waiting for next batch. More time to hit the numbers. Next window in ~12 weeks."; } },
    ],
    dropDelay: 0, dropMsg: null, dropFx: null,
  },
  {
    id: 'yc_apply', cat: 'e', from: 'Y Combinator',
    body: "Application deadline is this week. The questions are straightforward — what you're building, why you, what you've learned from users. Takes a focused day to do it well.",
    urgency: 3, weeks: 1, priority: true,
    available: (s, char, e) => s.ycDeciding && !s.ycApplied,
    options: [
      { label: 'Submit the application', key: 'submit',
        execute(s, char, e) { s.ycDeciding = false; s.ycApplied = true; return "Application submitted. Decision in 3 weeks."; } },
    ],
    dropDelay: 1, dropFrom: 'Y Combinator',
    dropMsg: "Missed the YC deadline. The next batch opens in about 12 weeks.",
    dropFx(s, char, e) { s.ycDeciding = false; e.ycWeek = s.week + 12; },
  },
  {
    id: 'hn_thread', cat: 'e', from: 'Hacker News',
    body: "'Ask HN: Why is [your space] still so broken?' — top thread right now, 300 comments. this is your market talking openly.",
    urgency: 2, weeks: 1,
    available: (s) => !s.launched,
    options: [
      { label: 'Engage the thread', key: 'engage',
        execute(s) { s.signal = clamp(s.signal + 12, 0, 100); s.customers += 3; s.network.peers += 8; return "Engaged the thread authentically. 12 DMs requesting early access."; } },
    ],
    dropDelay: 0, dropMsg: null, dropFx(s) { s.signal = clamp(s.signal - 3, 0, 100); },
  },
  {
    id: 'reporter_deadline', cat: 'e', from: 'Lena (TechMedia)',
    body: "writing about startups in your space. you'd be the only founder quote. story publishes tomorrow 9am — you're out if i don't hear back tonight.",
    urgency: 3, weeks: 1,
    available: (s) => s.launched,
    options: [
      { label: 'Reply to Lena now', key: 'reply',
        execute(s) { const n = 10 + rnd(10); s.customers += n; s.signal = clamp(s.signal + 10, 0, 100); s.network.press++; return `Story ran. ${n} signups in 24 hours.`; } },
    ],
    dropDelay: 0, dropMsg: null, dropFx: null,
  },
  {
    id: 'competitor_launch', cat: 'e', from: 'TechCrunch',
    body: "Rivalio just came out of stealth with $3M. product looks similar to what you're building. they already have developer traction on Twitter.",
    urgency: 3, weeks: 1,
    available: (s) => s.product > 20,
    options: [
      { label: 'Write a comparison piece', key: 'compare',
        execute(s) { s.signal = clamp(s.signal + 6, 0, 100); return "Published a direct comparison. Your niche is clearer. A few users switched from Rivalio to you."; } },
    ],
    dropDelay: 2, dropFrom: 'Priya (advisor)',
    dropMsg: "Rivalio has 200 customers and is well-funded. you need a sharper answer to 'why you and not them.'",
    dropFx(s) { s.signal = clamp(s.signal - 12, 0, 100); },
  },
  {
    id: 'bug_reports', cat: 'p', from: 'Priya + 2 others',
    body: "all three emailed within an hour. same crash, same workflow. the product is unusable for them right now.",
    urgency: 3, weeks: 1,
    available: (s) => s.launched && s.customers >= 3,
    options: [
      { label: 'Drop everything and fix it', key: 'fix',
        execute(s) { return "Fixed the crash. Users notified. Goodwill recovered."; } },
    ],
    dropDelay: 1, dropFrom: 'Priya',
    dropMsg: "we cancelled. the bug never got fixed and we had a deadline. no hard feelings.",
    dropFx(s) { s.customers = clamp(s.customers - 10, 0, 9999); s.signal = clamp(s.signal - 10, 0, 100); },
  },
  {
    id: 'feature_cluster', cat: 'p', from: '3 users (separately)',
    body: "none of them know each other. all three asked for the exact same thing this week. that's not coincidence.",
    urgency: 2, weeks: 2,
    available: (s) => s.launched && s.customers >= 5,
    options: [
      { label: 'Build the feature', key: 'build',
        execute(s) { s.signal = clamp(s.signal + 10, 0, 100); s.product = clamp(s.product + 8, 0, 100); return "Built the feature. All 3 users loved it. Two immediately referred a colleague."; } },
    ],
    dropDelay: 3, dropFrom: 'User',
    dropMsg: "asked about this feature weeks ago. still nothing. starting to wonder if you're listening.",
    dropFx(s) { s.signal = clamp(s.signal - 8, 0, 100); },
  },
  {
    id: 'waitlist_cold', cat: 'c', from: 'Waitlist signups',
    body: "people who expressed interest haven't heard from you in 2 weeks. every day you wait, a few more move on.",
    urgency: 2, weeks: 1,
    available: (s) => !s.launched && s.signal > 45 && s.network.peers >= 14,
    options: [
      { label: 'Reach out now', key: 'reach',
        execute(s) { s.customers += 8; s.signal = clamp(s.signal + 8, 0, 100); return "Reached out to waitlist. 8 became active beta testers."; } },
    ],
    dropDelay: 2, dropFrom: 'Waitlist',
    dropMsg: "signed up a few weeks ago. assumed the product was dead. unsubscribed.",
    dropFx(s) { s.signal = clamp(s.signal - 10, 0, 100); },
  },
  {
    id: 'silent_churn', cat: 'c', from: 'Analytics',
    body: "your first 3 beta users signed up, poked around for 20 minutes, and disappeared. no explanation.",
    urgency: 3, weeks: 1,
    available: (s) => s.launched && s.customers >= 3 && s.customers < 20,
    options: [
      { label: 'Call all three', key: 'call',
        execute(s) { s.signal = clamp(s.signal + 6, 0, 100); return "Called all 3. Found a critical onboarding gap. Fixed it. 2 came back."; } },
    ],
    dropDelay: 2, dropFrom: 'Analytics',
    dropMsg: "churn rate this month: 40%. every new signup leaves after a day.",
    dropFx(s) { s.signal = clamp(s.signal - 12, 0, 100); s.customers = clamp(s.customers - 5, 0, 9999); },
  },
  {
    id: 'public_complaint', cat: 'c', from: 'Twitter',
    body: "'@yourproduct has been broken for 3 days and nobody responded to my support email. do not use this.' — 40 retweets and counting.",
    urgency: 3, weeks: 1,
    available: (s) => s.launched && s.customers >= 5,
    options: [
      { label: 'Respond publicly', key: 'respond',
        execute(s) { s.signal = clamp(s.signal + 5, 0, 100); return "Responded publicly, fixed the issue. Turned a critic into a vocal supporter."; } },
    ],
    dropDelay: 1, dropFrom: 'Twitter',
    dropMsg: "tweet is at 200 retweets. a journalist screenshot it. signup rate dropped 30%.",
    dropFx(s) { s.signal = clamp(s.signal - 18, 0, 100); s.customers = clamp(s.customers - 8, 0, 9999); },
  },
  {
    id: 'power_user_quiet', cat: 'c', from: 'Tom (your top user)',
    body: "he was in the product every single day for 6 weeks. then nothing for 10 days. something changed.",
    urgency: 2, weeks: 1,
    available: (s) => s.launched && s.customers >= 10,
    options: [
      { label: 'Call Tom', key: 'call',
        execute(s) { s.signal = clamp(s.signal + 8, 0, 100); return "Called Tom. He was stuck on a new workflow. Unblocked him — he's back and grateful."; } },
    ],
    dropDelay: 2, dropFrom: 'Tom',
    dropMsg: "moved on to Rivalio. nothing personal, just works better for my workflow now.",
    dropFx(s) { s.signal = clamp(s.signal - 14, 0, 100); s.customers = clamp(s.customers - 3, 0, 9999); },
  },
];

// ─────────────────────────────────────────────
// WORLD EVENTS — silent effects each sprint
// ─────────────────────────────────────────────

const WORLD = [
  {
    available: s => s.launched && s.customers > 0,
    fx: s => { s.customers += 2 + rnd(4); s.signal = clamp(s.signal + 3, 0, 100); },
  },
  {
    available: () => true,
    fx: s => { s.signal = clamp(s.signal - 5, 0, 100); },
  },
  {
    available: s => s.signal > 50,
    fx: s => { s.customers += 1 + rnd(3); s.network.peers += 2; },
  },
  {
    available: s => s.launched,
    fx: s => { /* recruiter email to Alex — handled via departure risk */ },
  },
  {
    available: s => s.cash > 500,
    fx: s => { s.cash = clamp(s.cash - 400, 0, 9999999); },
  },
  {
    available: s => !s.launched,
    fx: s => { s.signal = clamp(s.signal + 5, 0, 100); },
  },
  {
    available: s => s.customers >= 5,
    fx: s => { s.customers += 1; s.signal = clamp(s.signal + 2, 0, 100); s.network.peers += 1; },
  },
  {
    available: s => s.customers >= 10,
    fx: s => { s.signal = clamp(s.signal - 4, 0, 100); },
  },
  {
    available: s => s.week > 6 && !s.launched,
    fx: s => { s.cash = clamp(s.cash - 400, 0, 9999999); },
  },
];

// ─────────────────────────────────────────────
// ENGINE
// ─────────────────────────────────────────────

class Engine {
  constructor() {
    this.s = {
      cash: 10000, week: 1, product: 10, customers: 0,
      signal: 28, launched: false, deck_ready: false,
      investor_warmth: 0,
      incorporated: false, ip_clear: false,
      ycDeciding: false, ycApplied: false, ycAccepted: false, ycDecisionWeek: null,
      game_over: false, game_won: false,
      network: { peers: 12, advisors: 0, angels: 0, press: 0 },
    };
    this.ycWeek = 10 + rnd(8);

    // Live character instances
    this.chars = new Map([
      ['alex',   { archetypeId: 'alex',   active: true,  morale: 80, trust: 90, focus: 'build', focusSprints: 0, flags: {} }],
      ['priya',  { archetypeId: 'priya',  active: false, engagement: 80, flags: {} }],
      ['marcus', { archetypeId: 'marcus', active: false, engagement: 50, flags: {} }],
      ['sarah',  { archetypeId: 'sarah',  active: false, engagement: 60, flags: {} }],
    ]);
    this.alexDepartureRisk = false;

    this.pending = [];
    this.current = [];
    this.shown   = new Set();
  }

  get burnPerWeek() { return 500; }
  get runwayWeeks() { return Math.floor(this.s.cash / this.burnPerWeek); }

  get sigIdx() {
    const v = this.s.signal;
    if (v < 20) return 0; if (v < 40) return 1; if (v < 60) return 2;
    if (v < 80) return 3; return 4;
  }
  get sigDesc() {
    return ["Dead cold — silence.",
      "Polite interest. Nobody's committed.",
      "Warm — people keep asking when you launch.",
      "Hot — inbound you can barely keep up with.",
      "Pull — people are referring others without being asked."][this.sigIdx];
  }

  generateDemands() {
    // Unlock characters whose condition is now met
    for (const [id, char] of this.chars) {
      if (!char.active) {
        const def = CHARACTER_DEFS[id];
        if (def.unlockCondition && def.unlockCondition(this.s, this)) char.active = true;
      }
    }

    // Fire one silent world event
    const worldEligible = WORLD.filter(w => w.available(this.s));
    if (worldEligible.length > 0) worldEligible[rnd(worldEligible.length)].fx(this.s);

    // Check Alex departure risk
    const alex = this.chars.get('alex');
    if (alex && alex.active && alex.trust < 15) {
      this.alexDepartureRisk = true;
    }

    // Collect available cards from all active characters + global pool
    const allCards = [];
    for (const [id, char] of this.chars) {
      if (!char.active) continue;
      const def = CHARACTER_DEFS[id];
      for (const card of def.cards) {
        if (card.available(this.s, char, this)) {
          allCards.push({ ...card, _charId: id });
        }
      }
    }
    for (const card of SITUATIONS) {
      if (card.available(this.s, null, this)) {
        allCards.push({ ...card, _charId: null });
      }
    }

    const unseen = allCards.filter(d => !this.shown.has(d.id));
    const pool   = unseen.length >= 4 ? unseen : allCards;

    // Priority cards jump the queue
    const maxPriority = this.s.week <= 8 ? 2 : 1;
    const picked = allCards.filter(d => d.priority).slice(0, maxPriority);

    // Fill remaining slots: one per category, then random
    for (const cat of ['p', 'c', 't', 'e']) {
      if (picked.length >= 4) break;
      const match = pool.slice().sort(() => Math.random() - .5)
        .find(d => d.cat === cat && !picked.includes(d));
      if (match) picked.push(match);
    }
    for (const d of pool.slice().sort(() => Math.random() - .5)) {
      if (picked.length >= 4) break;
      if (!picked.includes(d)) picked.push(d);
    }

    this.current = picked.slice(0, 4);
    this.current.forEach(d => this.shown.add(d.id));
    this.current.forEach(d => { d._expiring = this.shown.has(d.id + '_seen'); });
    return this.current;
  }

  resolveTurn(ids, optKeys = {}) {
    const chosen  = this.current.filter(d => ids.includes(d.id));
    const dropped = this.current.filter(d => !ids.includes(d.id));
    const results = [];

    for (const d of chosen) {
      const char = d._charId ? this.chars.get(d._charId) : null;
      let m;
      if (d.options) {
        const opt = d.options.find(o => o.key === optKeys[d.id]) || d.options[0];
        m = opt.execute(this.s, char, this);
      } else {
        m = d.execute(this.s, char, this);
      }
      if (m) results.push(m);
    }

    for (const d of dropped) {
      const char = d._charId ? this.chars.get(d._charId) : null;
      if (d.dropDelay > 0 && d.dropFx) {
        this.pending.push({
          fireWeek: this.s.week + d.dropDelay,
          from: d.dropFrom || (d._charId ? CHARACTER_DEFS[d._charId].name : 'System'),
          text: d.dropMsg,
          fx: d.dropFx,
          charId: d._charId,
        });
      } else if (d.dropDelay === 0 && d.dropFx) {
        d.dropFx(this.s, char, this);
      }
    }

    const sprintWeeks = Math.max(...chosen.map(d => d.weeks), 1);
    this.s.week += sprintWeeks;
    this.s.cash -= this.burnPerWeek * sprintWeeks;

    // Co-founder passive contributions (skill-weighted)
    for (const [id, char] of this.chars) {
      if (!char.active || !char.focus) continue;
      const def = CHARACTER_DEFS[id];
      if (def.type !== 'cofounder') continue;
      const skill = (def.skills || {})[char.focus] || 1.0;
      const sideProjectMult = char.flags.side_project_active ? 0.7 : 1.0;
      const base  = sprintWeeks * 2 * skill * sideProjectMult;
      if      (char.focus === 'build')    this.s.product        = clamp(this.s.product        + base,       0, 100);
      else if (char.focus === 'discover') this.s.signal         = clamp(this.s.signal         + base * 1.5, 0, 100);
      else if (char.focus === 'pitch')    this.s.investor_warmth= clamp(this.s.investor_warmth+ base * 2,   0, 100);
      char.focusSprints++;
    }

    // Trust decay + morale recovery for co-founders
    // Trust only drops when the co-founder's cards are ignored (dropped), not just from time passing.
    for (const [id, char] of this.chars) {
      if (!char.active || !('trust' in char)) continue;
      const alexDropped = dropped.filter(d => d._charId === id).length;
      const alexChosen  = chosen.filter(d => d._charId === id).length;
      const delta = alexChosen - alexDropped;
      if (delta > 0)      char.trust = clamp(char.trust + 2 * sprintWeeks, 0, 100);
      else if (delta < 0) char.trust = clamp(char.trust - 2 * sprintWeeks, 0, 100);
      // no change if Alex had no cards in this sprint
      char.morale = clamp(char.morale + 2 * sprintWeeks, 0, 100);
    }

    // Signal drifts without customer attention
    if (!chosen.some(d => d.cat === 'c')) this.s.signal = clamp(this.s.signal - 2 * sprintWeeks, 0, 100);

    // Organic customer growth
    if (this.s.launched && this.s.signal >= 40)
      this.s.customers += Math.floor((this.s.signal - 40) / 20) * sprintWeeks;

    // Fire pending consequences
    const fired = this.pending.filter(p => p.fireWeek <= this.s.week);
    this.pending = this.pending.filter(p => p.fireWeek > this.s.week);
    for (const p of fired) {
      const char = p.charId ? this.chars.get(p.charId) : null;
      p.fx(this.s, char, this);
      if (p.text) results.push(`${p.from}: "${p.text}"`);
    }

    // Clamp global state
    this.s.signal         = clamp(this.s.signal,         0, 100);
    this.s.investor_warmth= clamp(this.s.investor_warmth,0, 100);
    this.s.cash           = clamp(this.s.cash,           0, 9999999);

    // YC decision
    if (this.s.ycApplied && !this.s.ycDecisionWeek) this.s.ycDecisionWeek = this.s.week + 3;
    if (this.s.ycDecisionWeek && this.s.week >= this.s.ycDecisionWeek) {
      this.s.ycDecisionWeek = null;
      if (Math.random() < 0.18) {
        this.s.ycAccepted = true; this.s.cash += 500000;
        this.s.signal = clamp(this.s.signal + 25, 0, 100);
        results.push("YC accepted! $500k added. See you at kickoff.");
      } else {
        this.s.ycApplied = false;
        this.ycWeek = this.s.week + 12;
        results.push("YC: passing on this batch. Next window opens in ~12 weeks.");
      }
    }

    if (this.s.cash <= 0) this.s.game_over = true;
    return { results, sprintWeeks };
  }
}

// Node.js compatibility
if (typeof module !== 'undefined') module.exports = { Engine, CHARACTER_DEFS, SITUATIONS, WORLD };
