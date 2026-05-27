(function () {
  const rnd   = n => Math.floor(Math.random() * n);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'alex', name: 'Alex', type: 'cofounder',
    skills: { build: 1.2, discover: 0.7, pitch: 0.5 },
    cards: [

      // ── WEEK 1 ONBOARDING (only 2 cards shown on week 1) ────────────────────
      {
        id: 'start_prototype', cat: 'p', from: 'You',
        body: "you've been talking about this idea long enough. time to build something real. you pull up Alex's calendar and block a week.",
        urgency: 3, weeks: 1, priority: true,
        available: (s, char) => s.week === 1 && !char.flags.prototype_kicked,
        options: [
          { label: 'Tell Alex to start building', key: 'build',
            execute(s, char) { char.flags.prototype_kicked = true; s.product = clamp(s.product + 8, 0, 100); return "Exciting. Alex thinks he\'ll get a demo going soon."; } },
        ],
        dropFx(s, char) { char.flags.prototype_kicked = true; },
      },
      {
        id: 'incorporate_week1', cat: 'e', from: 'Alex',
        body: "before we do anything else — we need a legal entity. no bank account, no contracts, no equity split without one. Stripe Atlas is the fastest path: Delaware C-corp, EIN, bank account in two days.",
        urgency: 3, weeks: 1, priority: true, ignoreForTrust: true,
        available: (s, char) => s.week === 1 && !s.incorporated,
        options: [
          { label: 'Incorporate via Stripe Atlas — $500', key: 'atlas',
            execute(s, char) { s.incorporated = true; s.cash = clamp(s.cash - 500, 0, 9999999); return "Delaware C-corp registered. EIN assigned, bank account open. $500 gone — you're officially a company."; } },
        ],
        dropDelay: 1, dropFrom: 'Alex',
        dropMsg: "we still don't have a legal entity. can't split equity or sign anything without one.",
        dropFx(s, char) { char.morale = clamp(char.morale - 4, 0, 100); },
      },

      // ── EARLY: RELATIONSHIP ──────────────────────────────────────────────────
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
        dropFx(s, char) { char.morale = clamp(char.morale - 6, 0, 100); },
        dropCondition: (s, char) => !char.flags.equity_set,
      },
      {
        id: 'alex_commitment', cat: 't', from: 'Alex',
        body: "i've been thinking — i can't quit my job until we have some real traction. evenings and weekends for now. that should be enough to get to launch, right?",
        urgency: 3, weeks: 1, priority: true,
        available: (s, char) => s.week >= 2 && s.week <= 5 && !char.flags.commitment_resolved,
        options: [
          { label: 'Accept — milestones first', key: 'accept',
            execute(s, char) { char.flags.commitment_resolved = true; s.signal = clamp(s.signal - 5, 0, 100); return "Alex stays part-time for now. Slower, but stable. Set a clear milestone to revisit."; } },
          { label: 'Push for full commitment', key: 'push',
            execute(s, char) { char.flags.commitment_resolved = true; char.flags.committed_fulltime = true; char.morale = clamp(char.morale - 10, 0, 100); char.trust = clamp(char.trust - 10, 0, 100); s.product = clamp(s.product + 4, 0, 100); return "Alex agreed to go full-time. He's not happy about the pressure. Watch his mood."; } },
        ],
        dropDelay: 3, dropFrom: 'Alex',
        dropMsg: "got a really good offer from a startup. i need to decide by friday. can we talk about where this is actually going?",
        dropFx(s, char) { char.morale = clamp(char.morale - 14, 0, 100); },
      },
      {
        id: 'vision_mismatch', cat: 't', from: 'Alex',
        body: "wait — i demoed to my colleague today and called it a 'team productivity tool'. you've been telling people it's a 'workflow automation platform'. those are completely different products. which are we building?",
        urgency: 3, weeks: 1, priority: true,
        available: (s, char) => s.week >= 2 && s.week <= 10 && s.product < 50 && !char.flags.vision_resolved,
        options: [
          { label: "Go with Alex's framing", key: 'alex',
            execute(s, char) { char.flags.vision_resolved = true; char.trust = clamp(char.trust + 8, 0, 100); char.morale = clamp(char.morale + 10, 0, 100); s.signal = clamp(s.signal - 4, 0, 100); return "Went with Alex's framing. Cleaner for developers. Some earlier investor conversations are now awkward, but at least you're aligned."; } },
          { label: 'Defend your framing', key: 'yours',
            execute(s, char) { char.flags.vision_resolved = true; s.signal = clamp(s.signal + 8, 0, 100); char.morale = clamp(char.morale - 8, 0, 100); char.trust = clamp(char.trust - 4, 0, 100); return "Alex went along with it. He's not wrong that it doesn't land with developers, but the investor story holds. Tension unresolved."; } },
          { label: 'Run a 1-week test', key: 'test',
            execute(s, char) { char.flags.vision_resolved = true; s.signal = clamp(s.signal + 14, 0, 100); s.market_fit = clamp(s.market_fit + 8, 0, 100); char.morale = clamp(char.morale + 5, 0, 100); char.trust = clamp(char.trust + 6, 0, 100); return "Ran 8 quick calls. Ops buyers respond to 'workflow automation'; developers respond to 'team productivity'. You have a wedge story now. Decided to lead with ops buyers."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "pitched it differently again. i think we're building two different products in our heads. investors are going to notice.",
        dropFx(s, char) { s.signal = clamp(s.signal - 10, 0, 100); char.morale = clamp(char.morale - 10, 0, 100); },
      },
      {
        id: 'alex_side_project', cat: 't', from: 'Alex',
        body: "full disclosure — i've been doing about 3 hours a day on a side project. just exploring, not competitive. didn't mention it because i didn't think it was a big deal.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.week >= 3 && s.week <= 14 && char.morale > 50 && !char.flags.committed_fulltime && !char.flags.side_project_resolved && !char.flags.side_project_active,
        options: [
          { label: 'Ask him to pause it', key: 'pause',
            execute(s, char) { char.flags.side_project_resolved = true; char.morale = clamp(char.morale + 5, 0, 100); char.trust = clamp(char.trust + 5, 0, 100); return "Honest conversation. Alex drops the side project until you hit a milestone. Relationship stronger for it."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "i've been thinking — i'm putting in more time than we agreed and progress is slow. is our commitment really equal here?",
        dropFx(s, char) { char.flags.side_project_resolved = true; char.flags.side_project_active = true; char.morale = clamp(char.morale - 20, 0, 100); char.trust = clamp(char.trust - 10, 0, 100); },
      },
      {
        id: 'alex_side_project_escalation', cat: 't', from: 'Alex',
        body: "i know we talked about this before, but i've been putting more into it — probably 15 hours a week now. i think i need to be honest with you about where my head is at.",
        urgency: 3, weeks: 1,
        available: (s, char) => char.flags.side_project_active && s.week <= 26,
        options: [
          { label: 'Tell him the startup needs him fully', key: 'talk',
            execute(s, char) { char.flags.side_project_active = false; char.morale = clamp(char.morale + 22, 0, 100); char.trust = clamp(char.trust + 10, 0, 100); return "Hard conversation. Alex commits fully. He was relieved you brought it up directly."; } },
        ],
        dropDelay: 3, dropFrom: 'Alex',
        dropMsg: "i've decided to pursue it seriously. i'll keep helping part-time but i think we both know i'm not fully in anymore.",
        dropFx(s, char) { char.flags.side_project_active = false; char.morale = clamp(char.morale - 30, 0, 100); char.trust = clamp(char.trust - 25, 0, 100); },
      },
      {
        id: 'alex_quiet', cat: 't', from: 'Alex',
        body: "short replies for 3 days, skipped standup yesterday. you don't know if it's burnout, frustration with progress, or something personal.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.week > 4 && char.morale < 40,
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
        body: "my friend Dev wants to join as the first employee. smart, enthusiastic. skills overlap with mine a lot but they'd ship fast. your call though.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.week >= 4 && s.week <= 18 && s.product < 70 && !char.flags.dev_resolved,
        options: [
          { label: 'Bring Dev on board', key: 'hire',
            execute(s, char) { char.flags.dev_resolved = true; s.product = clamp(s.product + 6, 0, 100); char.morale = clamp(char.morale + 8, 0, 100); s.network.peers += 2; return "Dev joined. High energy, shipped 2 useful features in the first week."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "dev went with another startup. they asked why we passed and honestly i didn't have a great answer.",
        dropFx(s, char) { char.flags.dev_resolved = true; char.morale = clamp(char.morale - 10, 0, 100); },
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

      // ── FOCUS ALIGNMENT ──────────────────────────────────────────────────────
      {
        id: 'alex_sync_discover', cat: 't', from: 'Alex', ignoreForTrust: true,
        body: "we've been heads-down building for a while without talking to anyone outside. should we shift focus to customer discovery for a sprint or two?",
        urgency: 1, weeks: 1,
        available: (s, char) => s.week >= 6 && char.focus === 'build' && char.focusSprints >= 3
          && (s.market_fit < 80 || s.product < 55)
          && s.week >= (char.flags.lastSyncToDiscover || 0) + 8,
        options: [
          { label: 'Yes — shift to discovery', key: 'discover',
            execute(s, char) { char.focus = 'discover'; char.focusSprints = 1; char.flags.lastSyncToDiscover = s.week; return "Agreed. Alex on customer discovery this sprint."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'alex_sync_build', cat: 't', from: 'Alex', ignoreForTrust: true,
        body: "i think we have enough customer feedback to act on for now. ready to get back to building?",
        urgency: 1, weeks: 1,
        available: (s, char) => char.focus === 'discover' && char.focusSprints >= 2 && !(s.signal >= 45 && s.customers >= 8 && s.deck_ready),
        options: [
          { label: 'Yes — back to building', key: 'build',
            execute(s, char) { char.focus = 'build'; char.focusSprints = 1; return "Agreed. Alex back to building."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'alex_sync_pitch', cat: 't', from: 'Alex', ignoreForTrust: true,
        body: "our traction story is getting solid. i think i'd create more value right now talking to investors than doing more discovery. free you up to stay focused on users. worth trying?",
        urgency: 1, weeks: 1,
        available: (s, char) => char.focus === 'discover' && char.focusSprints >= 2 && s.signal >= 45 && s.customers >= 8 && s.deck_ready,
        options: [
          { label: 'Yes — work the pipeline', key: 'pitch',
            execute(s, char) { char.focus = 'pitch'; char.focusSprints = 1; return "Agreed. Alex working the investor pipeline."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },

      // ── EARLY CONVERSATIONS (weeks 1–8): founder debates, low-stakes ────────
      {
        id: 'early_name', cat: 'e', from: 'Alex', ignoreForTrust: true,
        body: "we need to stop calling this 'the project.' i found three good .com domains. can we just pick one and commit?",
        urgency: 1, weeks: 1,
        available: (s, char) => s.week <= 3 && !char.flags.name_done,
        options: [
          { label: 'The catchy one', key: 'catchy',
            execute(s, char) { char.flags.name_done = true; s.signal = clamp(s.signal + 4, 0, 100); return "Name locked. Catchy, memorable, works on a t-shirt."; } },
          { label: 'The descriptive one', key: 'descriptive',
            execute(s, char) { char.flags.name_done = true; s.market_fit = clamp(s.market_fit + 2, 0, 100); return "Name locked. Says exactly what it does. Customers know what they're signing up for."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx(s, char) { char.flags.name_done = true; },
      },
      {
        id: 'early_tech_stack', cat: 'e', from: 'Alex', ignoreForTrust: true,
        body: "stack question: i could ship twice as fast with what i know, but the 'right' choice is more scalable. does the stack matter to you, or just ship speed?",
        urgency: 1, weeks: 1,
        available: (s, char) => s.week >= 1 && s.week <= 4 && !char.flags.stack_done,
        options: [
          { label: 'Ship speed — use what you know', key: 'fast',
            execute(s, char) { char.flags.stack_done = true; s.product = clamp(s.product + 4, 0, 100); return "Going with the fast stack. Alex shipping immediately."; } },
          { label: 'Pick the scalable one', key: 'scalable',
            execute(s, char) { char.flags.stack_done = true; s.product = clamp(s.product + 2, 0, 100); s.tech_debt -= 5; return "Scalable stack chosen. Slower start but cleaner foundation."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx(s, char) { char.flags.stack_done = true; },
      },
      {
        id: 'early_working_style', cat: 't', from: 'Alex', ignoreForTrust: true,
        body: "how are we working together day to day? i go heads-down for long stretches. not sure if you want standups or just ping each other when stuck.",
        urgency: 1, weeks: 1,
        available: (s, char) => s.week <= 4 && !char.flags.working_style_done,
        options: [
          { label: 'Daily 15-min standup', key: 'standup',
            execute(s, char) { char.flags.working_style_done = true; char.morale = clamp(char.morale + 5, 0, 100); return "Daily standup at 9am. Keeps both of you honest."; } },
          { label: 'Async — ping when blocked', key: 'async',
            execute(s, char) { char.flags.working_style_done = true; return "Async by default. Fewer interruptions, more deep work."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx(s, char) { char.flags.working_style_done = true; },
      },
      {
        id: 'early_customer_target', cat: 't', from: 'Alex', ignoreForTrust: true,
        body: "noticed we're pitching this differently every time. sometimes it's for individuals, sometimes for teams. we should probably agree before it gets confusing.",
        urgency: 1, weeks: 1,
        available: (s, char) => s.week <= 6 && !char.flags.customer_target_done,
        options: [
          { label: 'Individuals first — faster to close', key: 'individuals',
            execute(s, char) { char.flags.customer_target_done = true; s.market_fit = clamp(s.market_fit + 4, 0, 100); return "Locked in: individual users first. Shorter sales cycle, faster feedback."; } },
          { label: 'Teams — that\'s where the revenue is', key: 'teams',
            execute(s, char) { char.flags.customer_target_done = true; s.investor_warmth = clamp(s.investor_warmth + 4, 0, 100); return "Going after teams. Bigger deals, stronger investor story."; } },
          { label: 'Follow the early users', key: 'open',
            execute(s, char) { char.flags.customer_target_done = true; return "Staying flexible. Let the first users tell you who they are."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx(s, char) { char.flags.customer_target_done = true; },
      },
      {
        id: 'early_mvp_scope', cat: 't', from: 'Alex', ignoreForTrust: true,
        body: "made two lists. one is everything we talked about shipping. the other is the smallest thing that actually proves the idea. they're pretty different.",
        urgency: 1, weeks: 1,
        available: (s, char) => s.week >= 2 && s.week <= 6 && !char.flags.mvp_scope_done,
        options: [
          { label: 'Lean version — ship in 2 weeks, learn in 3', key: 'lean',
            execute(s, char) { char.flags.mvp_scope_done = true; s.product = clamp(s.product + 3, 0, 100); s.market_fit = clamp(s.market_fit + 2, 0, 100); return "Lean scope locked. Alex looks like he\'ll get something real in two weeks."; } },
          { label: 'Full scope — do it right', key: 'full',
            execute(s, char) { char.flags.mvp_scope_done = true; s.product = clamp(s.product + 1, 0, 100); return "Full build. More impressive on launch day — if it ships on time."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx(s, char) { char.flags.mvp_scope_done = true; },
      },
      {
        id: 'early_pricing', cat: 't', from: 'Alex', ignoreForTrust: true,
        body: "i keep going back and forth: do we charge from day one, or give it away until we hit some real usage threshold? what's your instinct?",
        urgency: 1, weeks: 1,
        available: (s, char) => s.week >= 2 && s.week <= 7 && !char.flags.pricing_done,
        options: [
          { label: 'Charge from day one — validate willingness to pay', key: 'charge',
            execute(s, char) { char.flags.pricing_done = true; s.signal = clamp(s.signal + 4, 0, 100); return "Charging early. Even $10/month proves someone cares. Sets the mindset."; } },
          { label: 'Free first — maximize early feedback', key: 'free',
            execute(s, char) { char.flags.pricing_done = true; s.waitlist += 2; return "Free to start. More people in the door, more feedback loops."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx(s, char) { char.flags.pricing_done = true; },
      },
      {
        id: 'early_funding_goal', cat: 't', from: 'Alex', ignoreForTrust: true,
        body: "serious question i've been sitting on: are we building to raise VC money, sell to a big company, or run a profitable business? i want to make sure we have the same picture.",
        urgency: 1, weeks: 1,
        available: (s, char) => s.week >= 3 && s.week <= 8 && !char.flags.funding_goal_done,
        options: [
          { label: 'VC route — raise, scale, exit', key: 'vc',
            execute(s, char) { char.flags.funding_goal_done = true; s.investor_warmth = clamp(s.investor_warmth + 5, 0, 100); return "Aligned on the VC path. Changes how you talk to investors."; } },
          { label: 'Profitable first — control our own destiny', key: 'profitable',
            execute(s, char) { char.flags.funding_goal_done = true; s.market_fit = clamp(s.market_fit + 3, 0, 100); return "Profitable first. Every product decision gets cleaner with that bar."; } },
          { label: 'Stay flexible for now', key: 'open',
            execute(s, char) { char.flags.funding_goal_done = true; return "Staying flexible. Revisit when you have real traction."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx(s, char) { char.flags.funding_goal_done = true; },
      },

      // ── EARLY: ADMIN & LEGAL ────────────────────────────────────────────────
      {
        id: 'incorporate_now', cat: 'e', from: 'Alex',
        body: "a potential user just asked us to sign an NDA before they'd demo their workflow. we can't sign anything without a legal entity. also — we need a bank account. do we use Stripe Atlas or find a lawyer?",
        urgency: 2, weeks: 1, priority: true, ignoreForTrust: true,
        available: (s, char) => s.week >= 3 && s.week <= 14 && s.product >= 12 && !s.incorporated,
        options: [
          { label: 'Stripe Atlas — fast and cheap', key: 'atlas',
            execute(s, char) { s.incorporated = true; s.cash = clamp(s.cash - 500, 0, 9999999); return "Incorporated via Stripe Atlas. $500, Delaware C-corp, EIN, bank account open. Feels official."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "that user followed up on the NDA again. we still don't have a legal entity.",
        dropFx(s, char) { s.signal = clamp(s.signal - 6, 0, 100); },
      },
      {
        id: 'ip_concern', cat: 'e', from: 'Alex',
        body: "something i've been meaning to raise — i wrote some early prototypes at my last job, same general problem space. if an investor or acquirer ever does diligence, could my old employer claim ownership?",
        urgency: 3, weeks: 1, ignoreForTrust: true,
        available: (s, char) => s.week <= 12 && !s.ip_clear && !s.ip_concern_dismissed,
        options: [
          { label: 'Get a lawyer to review', key: 'lawyer',
            execute(s, char) { s.ip_clear = true; s.cash -= 1500; return "Lawyer reviewed. Previous employer has no claim — personal time, unrelated enough. IP assignment signed. Clean. ($1,500)"; } },
        ],
        dropDelay: 3, dropFrom: 'Lawyer (friend)',
        dropMsg: "heads up — looked at your previous employer's IP agreement. it's broadly written. clean this up before investor diligence.",
        dropFx(s, char) { s.ip_concern_dismissed = true; s.signal = clamp(s.signal - 12, 0, 100); s.investor_warmth = clamp(s.investor_warmth - 10, 0, 100); },
      },

      // ── EARLY: MARKET & IDEA ────────────────────────────────────────────────
      {
        id: 'first_interview_shock', cat: 'c', from: 'Alex',
        body: "just got off a customer interview. they said the real problem isn't what we're solving — it's actually the step before it. they'd pay $200/month for that. we might be building the wrong thing.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.week <= 8 && s.product < 40 && char.focus === 'discover' && !char.flags.interview_shock_resolved,
        options: [
          { label: 'Pivot — investigate upstream', key: 'pivot',
            execute(s, char) { char.flags.interview_shock_resolved = true; s.signal = clamp(s.signal + 15, 0, 100); s.market_fit = clamp(s.market_fit + 14, 0, 100); return "Pivoted focus. Three more interviews confirmed it. Some earlier work won't carry over."; } },
          { label: 'Stay the course', key: 'stay',
            execute(s, char) { char.flags.interview_shock_resolved = true; s.signal = clamp(s.signal + 5, 0, 100); s.market_fit = clamp(s.market_fit + 3, 0, 100); return "Filed it away. Not ready to pivot on one data point. Logged it for later."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "had 2 more interviews. same thing — everyone says the problem is upstream. we need to talk.",
        dropFx(s, char) { char.flags.interview_shock_resolved = true; s.signal = clamp(s.signal - 15, 0, 100); },
      },
      {
        id: 'cold_silence', cat: 'c', from: 'Alex',
        body: "sent 30 cold emails this week to people in our target market. 0 replies. not even 'not interested'. is the messaging wrong, or are we targeting the wrong people?",
        urgency: 3, weeks: 1,
        available: (s, char) => s.week >= 2 && s.week <= 12 && !s.launched && s.signal < 50 && char.focus === 'discover' && !char.flags.cold_silence_resolved,
        options: [
          { label: 'Rewrite the outreach', key: 'rewrite',
            execute(s, char) { char.flags.cold_silence_resolved = true; s.signal = clamp(s.signal + 10, 0, 100); s.market_fit = clamp(s.market_fit + 6, 0, 100); return "Rewrote the cold email. New version leads with the pain, not the product. First reply came in 4 hours."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "week 2 of silence. i'm starting to wonder if anyone actually has this problem badly enough.",
        dropFx(s, char) { char.flags.cold_silence_resolved = true; s.signal = clamp(s.signal - 10, 0, 100); char.morale = clamp(char.morale - 8, 0, 100); },
      },
      {
        id: 'random_reframe', cat: 'c', from: 'Alex',
        body: "talked to a stranger at a coffee shop about what we're building. they said 'oh so it's like [completely different description] but for [different market].' we both went quiet. it kind of makes more sense than our own pitch.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.week <= 12 && s.signal < 55 && char.focus === 'discover' && !char.flags.reframe_resolved,
        options: [
          { label: 'Test the new framing', key: 'test',
            execute(s, char) { char.flags.reframe_resolved = true; s.signal = clamp(s.signal + 12, 0, 100); s.market_fit = clamp(s.market_fit + 8, 0, 100); s.network.peers += 3; return "Ran the new framing by 3 more people. All 3 immediately got it. Updated the positioning."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'pivot_insight_1', cat: 'c', from: 'Alex',
        body: "been talking to users all week and something keeps coming up. they describe a different workflow than what we assumed. i think we've been solving the wrong part of the problem.",
        urgency: 3, weeks: 1,
        available: (s, char) => char.focus === 'discover' && char.focusSprints >= 2 && s.market_fit >= 8 && !char.flags.pivot1,
        options: [
          { label: 'Pivot — rethink the approach', key: 'pivot',
            execute(s, char) { char.flags.pivot1 = true; s.market_fit = clamp(s.market_fit + 25, 0, 100); s.signal = clamp(s.signal + 8, 0, 100); return "Rethought the approach. Found the real problem. Signal improved immediately."; } },
          { label: 'Stay the course', key: 'stay',
            execute(s, char) { char.flags.pivot1 = true; s.market_fit = clamp(s.market_fit + 5, 0, 100); return "Stayed the course. Alex logged the feedback but we're not changing direction yet."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "users keep saying the same thing. i'm worried we're building the wrong product.",
        dropFx(s, char) { char.flags.pivot1 = true; s.market_fit = clamp(s.market_fit - 5, 0, 100); s.signal = clamp(s.signal - 8, 0, 100); },
      },
      {
        id: 'pivot_insight_2', cat: 'c', from: 'Alex',
        body: "second round of user interviews done. consistent feedback — they want depth on one thing, not breadth. our current scope is too wide and they're not seeing the core value.",
        urgency: 3, weeks: 1,
        available: (s, char) => char.flags.pivot1 && char.focus === 'discover' && char.focusSprints >= 2 && s.market_fit >= 35 && !char.flags.pivot2,
        options: [
          { label: 'Narrow scope — go deep', key: 'pivot',
            execute(s, char) { char.flags.pivot2 = true; s.market_fit = clamp(s.market_fit + 20, 0, 100); s.signal = clamp(s.signal + 10, 0, 100); return "Narrowed scope significantly. Less ambitious but far more right. Three users asked for exactly this."; } },
          { label: 'Ship the broader version', key: 'stay',
            execute(s, char) { char.flags.pivot2 = true; s.market_fit = clamp(s.market_fit + 8, 0, 100); return "Decided to ship the broader scope. Market fit isn't perfect but you're moving."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "still not seeing the retention signal. we're building for the wrong customer.",
        dropFx(s, char) { char.flags.pivot2 = true; s.market_fit = clamp(s.market_fit - 8, 0, 100); s.signal = clamp(s.signal - 5, 0, 100); },
      },
      {
        id: 'pmf_lock', cat: 'c', from: 'Alex',
        body: "three users described exactly the same workflow gap unprompted this week. i've never seen that before. i think we finally know what we need to build.",
        urgency: 2, weeks: 1,
        available: (s, char) => char.flags.pivot2 && char.focus === 'discover' && char.focusSprints >= 2 && s.market_fit >= 55 && !char.flags.pmf_locked,
        options: [
          { label: 'Lock in the direction', key: 'lock',
            execute(s, char) { char.flags.pmf_locked = true; s.market_fit = clamp(s.market_fit + 15, 0, 100); s.signal = clamp(s.signal + 15, 0, 100); return "Locked in. This is the product. Now build it right."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
      {
        id: 'family_doubt', cat: 't', from: 'Alex',
        body: "my parents asked me again when i'm getting a real job. yours too? i keep explaining it but they don't really get it. tbh it's starting to get in my head a little.",
        urgency: 1, weeks: 1,
        available: (s, char) => s.week >= 2 && s.week <= 18 && char.morale < 50 && !char.flags.family_doubt_resolved,
        options: [
          { label: 'Remind each other why', key: 'talk',
            execute(s, char) { char.flags.family_doubt_resolved = true; char.morale = clamp(char.morale + 12, 0, 100); return "Long talk. Reminded each other why you're doing this. Morale reset."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },

      // ── MID: PRODUCT ────────────────────────────────────────────────────────
      {
        id: 'alex_demo_ready', cat: 'p', from: 'Alex',
        body: "the core flow works end-to-end for the first time. rough edges everywhere, but it actually does the thing. i want to put it in front of a real person before we build another feature — get a reaction while our assumptions are still easy to change.",
        urgency: 3, weeks: 1,
        available: (s) => s.product >= 18 && !s.has_demo && !s.launched,
        options: [
          { label: 'Show it rough — learn fast', key: 'rough',
            execute(s) {
              s.has_demo = true; s.tech_debt += 12;
              s.waitlist += 2; s.market_fit = clamp(s.market_fit + 8, 0, 100);
              return "Three contacts in a room. Two hit bugs immediately. One leaned forward: 'Show me that again — I've been trying to solve this for months.' You know what to build next.";
            } },
          { label: 'One sprint to polish it first', key: 'polish',
            execute(s) {
              s.has_demo = true; s.tech_debt += 3;
              s.product = clamp(s.product + 6, 0, 100);
              s.waitlist += 2; s.market_fit = clamp(s.market_fit + 4, 0, 100); s.signal = clamp(s.signal + 4, 0, 100);
              return "Spent the sprint cleaning up the worst rough edges. Demo ran cleanly. Contacts were impressed — but one extra sprint of polish is one sprint of not hearing 'I'd pay for that.'";
            } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "someone asked for a demo and i scheduled it for next week. we're showing what we have.",
        dropFx(s) { s.has_demo = true; s.tech_debt += 18; s.waitlist += 1; },
      },
      {
        id: 'alex_beta_ready', cat: 'p', from: 'Alex',
        body: "we've been showing demos but nobody's actually living with the product day to day. i think we're ready to give 5–10 people real credentials and see what breaks when we're not in the room.",
        urgency: 3, weeks: 1,
        available: (s) => s.has_demo && s.product >= 38 && !s.has_beta && !s.launched,
        options: [
          { label: 'Invite our 5 best-fit contacts', key: 'curated',
            execute(s) {
              s.has_beta = true;
              s.waitlist += 5; s.market_fit = clamp(s.market_fit + 12, 0, 100);
              return "Invited 5 hand-picked contacts. All 5 accepted. Three used it every day. Two hit the same bug on day 3 — fixed before they could complain. One asked if they could pay now.";
            } },
          { label: 'Post it publicly — open beta', key: 'open',
            execute(s) {
              s.has_beta = true;
              s.waitlist += 20; s.market_fit = clamp(s.market_fit + 5, 0, 100); s.signal = clamp(s.signal + 10, 0, 100);
              return "Posted in two Slack communities. 20 signups in 48 hours. Noisy — power users mixed with people who'll never come back. But you're seeing usage patterns you couldn't have predicted.";
            } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "getting inbound requests for beta access. i'm opening it up next week.",
        dropFx(s) { s.has_beta = true; s.waitlist += 3; s.market_fit = clamp(s.market_fit + 3, 0, 100); },
      },
      {
        id: 'good_enough_launch', cat: 'p', from: 'Alex',
        body: "beta users have been in it for a few weeks. the feedback is real. nothing's on fire. it's as ready as it's going to be without real public traffic — let's ship it.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.product >= 50 && s.has_beta && !s.launched && char.focus === 'build' && s.week >= (s.good_enough_last || 0) + 4,
        options: [
          { label: 'Ship it — launch now', key: 'ship',
            execute(s, char) { s.launched = true; s.signal = clamp(s.signal + 12, 0, 100); if (s.market_fit < 40) return "Launched. Users are signing up but not sticking around — the product doesn't match what they actually needed. Expect churn."; return "Launched. First real users are in. Feedback starts flowing."; } },
          { label: 'Two more weeks', key: 'wait',
            execute(s, char) { s.good_enough_last = s.week; s.product = clamp(s.product + 6, 0, 100); char.morale = clamp(char.morale - 12, 0, 100); return "Polished a few more things. Alex thinks you're stalling — and he might be right."; } },
        ],
        dropDelay: 1, dropFrom: 'Alex',
        dropMsg: "another week building in a vacuum. runway is ticking and real users are waiting.",
        dropFx(s, char) { s.cash = clamp(s.cash - 800, 0, 9999999); char.morale = clamp(char.morale - 10, 0, 100); },
      },
      {
        id: 'alex_wants_rebuild', cat: 'p', from: 'Alex',
        body: "the current approach won't scale past 100 users. i know it's 2 weeks of work but if we don't do it now, it'll take 3x longer later.",
        urgency: 2, weeks: 2,
        available: (s, char) => !s.alex_rebuild_done && char.focus === 'build' && ((s.product > 40 && s.week > 8) || s.tech_debt >= 20),
        options: [
          { label: 'Do the refactor', key: 'refactor',
            execute(s, char) { s.alex_rebuild_done = true; s.product = clamp(s.product + 12, 0, 100); char.morale = clamp(char.morale + 15, 0, 100); return "Architecture refactored. Faster, cleaner. Alex is energized."; } },
        ],
        dropDelay: 4, dropFrom: 'Alex',
        dropMsg: "3 active outages this week from the tech debt i flagged. we're losing users in real time.",
        dropFx(s, char) { s.alex_rebuild_done = true; s.users = clamp(s.users - 8, 0, 9999); s.customers = clamp(s.customers - 2, 0, 9999); char.morale = clamp(char.morale - 20, 0, 100); },
      },
      {
        id: 'alex_decision', cat: 't', from: 'Customer',
        body: "alex told me you'd ship a full integration by friday. it's wednesday. i don't see anything about this in the roadmap.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.launched && s.customers > 1 && !char.flags.decision_done,
        options: [
          { label: 'Ship the integration', key: 'ship',
            execute(s, char) { char.flags.decision_done = true; s.customers += 1; char.morale = clamp(char.morale + 5, 0, 100); return "Pulled off the integration. Customer delighted. Set boundaries with Alex about commitments."; } },
        ],
        dropDelay: 1, dropFrom: 'Customer',
        dropMsg: "it's monday. still nothing. we're blocking our launch on this.",
        dropFx(s, char) { char.flags.decision_done = true; s.signal = clamp(s.signal - 10, 0, 100); s.customers = clamp(s.customers - 1, 0, 9999); },
      },

      // ── DEPARTURE ARC ────────────────────────────────────────────────────────
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
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.alex = def;
})();
