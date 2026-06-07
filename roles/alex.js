(function () {
  const rnd   = n => Math.floor(Math.random() * n);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ── Roadmap item helpers ──────────────────────────────────────────────────
  function expandItems(s, plan) {
    if (!s.items) return;
    s.items.beta = { status: 'todo', quality: null, assignee: null };
    if (plan === 'full') {
      s.items.sprint_social     = { status: 'todo', quality: null, assignee: null };
      s.items.sprint_algo       = { status: 'todo', quality: null, assignee: null };
      s.items.sprint_mono       = { status: 'todo', quality: null, assignee: null };
      s.items.sprint_adv_social = { status: 'todo', quality: null, assignee: null };
      s.items.sprint_adv_video  = { status: 'todo', quality: null, assignee: null };
    }
  }

  function allSprintsResolved(s) {
    if (!s.items) return true;
    const keys = ['sprint_social', 'sprint_algo', 'sprint_mono', 'sprint_adv_social', 'sprint_adv_video'];
    return keys.every(k => !s.items[k] || s.items[k].status === 'done' || s.items[k].status === 'deferred' || s.items[k].status === 'obsolete');
  }

  function applyActivitiesPivot(s) {
    if (!s.items) return;
    // Cross out the items built for profile-based matching
    if (s.items.matching_algo) s.items.matching_algo.status = 'obsolete';
    if (s.items.ios_ui)        s.items.ios_ui.status        = 'obsolete';
    // Full-plan sprint items are also superseded
    ['sprint_social','sprint_algo','sprint_mono','sprint_adv_social','sprint_adv_video'].forEach(k => {
      if (s.items[k] && s.items[k].status === 'todo') s.items[k].status = 'obsolete';
    });
    // Add plans-first replacements
    s.items.plans_matching = { status: 'active', quality: null, assignee: 'alex'   };
    s.items.plans_ui       = { status: 'todo',   quality: null, assignee: s.jordan_resolved ? null : 'jordan' };
  }

  function sprintResolved(s, key) {
    return !s.items || !s.items[key] || s.items[key].status !== 'todo';
  }

  const def = {
    id: 'alex', name: 'Alex', type: 'cofounder',
    skills: { build: 1.2, discover: 0.7, pitch: 0.5 },
    cards: [

      // ── WEEK 1 ONBOARDING (only 2 cards shown on week 1) ────────────────────
      {
        id: 'start_prototype', cat: 'p', from: 'You',
        body: "three of you in the same room for the first time since you decided to do this for real. time to stop talking. alex is ready on the backend. jordan's offered to take the iOS side. one word from you and this becomes real.",
        urgency: 3, weeks: 1, priority: true,
        available: (s, char) => s.week === 1 && !char.flags.prototype_kicked,
        options: [
          { label: "Game on — everyone start building", key: 'build',
            execute(s, char, e) {
              char.flags.prototype_kicked = true;
              s.jordan_active = true;
              s.activities_cut = true;
              s.items = {
                matching_algo: { status: 'active', quality: null, assignee: 'alex'   },
                api_design:    { status: 'todo',   quality: null, assignee: 'alex'   },
                ios_ui:        { status: 'active', quality: null, assignee: 'jordan' },
                ios_server:    { status: 'todo',   quality: null, assignee: 'jordan' },
              };
              const jordan = e.chars.get('jordan');
              if (jordan) jordan.flags.ios_update_done = true;
              return "Alex is on profiles and matching. Jordan's on the iOS build. Activity planning goes on the backlog — that's a second product. You're building the core first.";
            } },
        ],
        dropFx(s, char, e) {
          char.flags.prototype_kicked = true;
          s.jordan_active = true;
          s.activities_cut = true;
          s.items = {
            matching_algo: { status: 'active', quality: null, assignee: 'alex'   },
            api_design:    { status: 'todo',   quality: null, assignee: 'alex'   },
            ios_ui:        { status: 'active', quality: null, assignee: 'jordan' },
            ios_server:    { status: 'todo',   quality: null, assignee: 'jordan' },
          };
          const jordan = e && e.chars && e.chars.get('jordan');
          if (jordan) jordan.flags.ios_update_done = true;
        },
      },
      {
        id: 'incorporate_week1', cat: 'e', from: 'Alex',
        body: "before we do anything else — all three of us need a legal entity. no bank account, no contracts, no equity split without one. Stripe Atlas is the fastest path: Delaware C-corp, EIN, bank account in two days.",
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

      // ── DEVELOPMENT PLANNING ────────────────────────────────────────────────
      {
        id: 'dev_planning_session', cat: 'p', from: 'Alex',
        body: "jordan and i should align before we go too deep. we could spec the whole product — activity layer, recommendations, the full vision. or scope to what we actually need to test the hypothesis.",
        urgency: 2, weeks: 2, priority: true,
        available: (s, char) => char.flags.prototype_kicked && !char.flags.plan_done && s.week >= 2 && s.week <= 5,
        options: [
          { label: "Full product spec — let's know what we're building", key: 'full',
            execute(s, char) {
              char.flags.plan_done = true;
              s.dev_plan = 'full';
              expandItems(s, 'full');
              return "Three-hour session. Whiteboard filled. Twenty-plus items in the backlog. Jordan's excited. Alex is skeptical but admits it looks thorough.";
            } },
          { label: 'Lean MVP — ship the core and learn', key: 'lean',
            execute(s, char) {
              char.flags.plan_done = true;
              s.dev_plan = 'lean';
              expandItems(s, 'lean');
              return "Ninety minutes. Five items on the board. Alex seemed relieved.";
            } },
          { label: 'Start building — no time for planning', key: 'sprint',
            execute(s, char) {
              char.flags.plan_done = true;
              s.dev_plan = 'sprint';
              return "No plan, just action. No shared picture of what done looks like.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },

      // ── EARLY: RELATIONSHIP ──────────────────────────────────────────────────
      {
        id: 'alex_commitment', cat: 't', from: 'Alex',
        body: "i can't quit my job until we have real traction. evenings and weekends for now. should be enough to get to launch, right?",
        urgency: 3, weeks: 1, priority: true,
        available: (s, char) => s.week >= 2 && s.week <= 5 && !char.flags.commitment_resolved,
        options: [
          { label: "Agree — he'll go full-time once we have traction", key: 'accept',
            execute(s, char) { char.flags.commitment_resolved = true; s.signal = clamp(s.signal - 5, 0, 100); return "Alex stays part-time for now. Slower, but stable. Set a clear milestone to revisit."; } },
          { label: 'Push him — we need full commitment now', key: 'push',
            execute(s, char) { char.flags.commitment_resolved = true; char.flags.committed_fulltime = true; char.morale = clamp(char.morale - 10, 0, 100); char.trust = clamp(char.trust - 10, 0, 100); return "Alex agreed to go full-time. He said yes, but you could tell he wasn't ready. Watch his mood."; } },
        ],
        dropDelay: 3, dropFrom: 'Alex',
        dropMsg: "got a really good offer from a startup. i need to decide by friday. can we talk about where this is actually going?",
        dropCancel: (s, char) => char.flags.committed_fulltime || char.flags.offer_msg_sent,
        dropFx(s, char) { char.flags.offer_msg_sent = true; char.morale = clamp(char.morale - 14, 0, 100); s.alex_offer_week = s.week; },
      },
      {
        id: 'vision_mismatch', cat: 't', from: 'Alex',
        body: "i keep pitching this as 'casual dating done right.' you've been calling it 'serious relationships.' those are different products with different users. which are we actually building?",
        urgency: 3, weeks: 1, priority: true,
        available: (s, char) => s.week >= 4 && s.week <= 10 && !s.has_beta && !char.flags.vision_resolved,
        options: [
          { label: "Go with Alex's framing — casual dating", key: 'alex',
            execute(s, char) { char.flags.vision_resolved = true; char.trust = clamp(char.trust + 8, 0, 100); char.morale = clamp(char.morale + 10, 0, 100); s.signal = clamp(s.signal - 4, 0, 100); return "Went with casual dating. Broader market, easier to explain. Some earlier conversations about 'serious matches' are now awkward, but at least you're aligned."; } },
          { label: 'Defend your framing — serious relationships', key: 'yours',
            execute(s, char) { char.flags.vision_resolved = true; s.signal = clamp(s.signal + 8, 0, 100); char.morale = clamp(char.morale - 8, 0, 100); char.trust = clamp(char.trust - 4, 0, 100); return "Alex went along with it. He thinks the casual market is bigger, but the investor story is cleaner. Tension unresolved."; } },
          { label: 'Run a 1-week test with real users', key: 'test',
            execute(s, char) { char.flags.vision_resolved = true; s.signal = clamp(s.signal + 14, 0, 100); s.market_fit = clamp(s.market_fit + 8, 0, 100); char.morale = clamp(char.morale + 5, 0, 100); char.trust = clamp(char.trust + 6, 0, 100); return "Ran 8 quick calls. People who tried serious relationship apps hate swiping apps and vice versa — two real segments. Decided to lead with the relationship-seekers: they pay more and churn less."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "pitched it as a casual app again. someone in the audience asked me directly which it is. i didn't have a good answer. investors are going to notice.",
        dropFx(s, char) { char.flags.vision_resolved = true; s.signal = clamp(s.signal - 10, 0, 100); char.morale = clamp(char.morale - 10, 0, 100); },
      },
      {
        id: 'alex_side_project', cat: 't', from: 'Alex',
        body: "full disclosure — i've been putting 3 hours a day into a side project. didn't mention it earlier and i should have. i wanted you to hear it from me before it became a problem.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.week >= 3 && s.week <= 14 && char.morale > 50 && !char.flags.committed_fulltime && !char.flags.side_project_resolved && !char.flags.side_project_active,
        options: [
          { label: 'Ask him to pause it', key: 'pause',
            execute(s, char) { char.flags.side_project_resolved = true; char.morale = clamp(char.morale + 5, 0, 100); char.trust = clamp(char.trust + 5, 0, 100); return "Honest conversation. Alex drops the side project until you hit a milestone. Relationship stronger for it."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.side_project_resolved = true; char.flags.side_project_active = true; char.morale = clamp(char.morale - 20, 0, 100); char.trust = clamp(char.trust - 10, 0, 100); },
      },
      {
        id: 'alex_side_project_escalation', cat: 't', from: 'Alex',
        body: "i know we talked about this, but i've been putting more in — probably 15 hours a week. i need to be honest about where my head is at.",
        urgency: 3, weeks: 1,
        available: (s, char) => char.flags.side_project_active && s.week <= 26,
        options: [
          { label: 'Tell him the startup needs him fully', key: 'talk',
            execute(s, char) { char.flags.side_project_active = false; char.morale = clamp(char.morale + 22, 0, 100); char.trust = clamp(char.trust + 10, 0, 100); return "Hard conversation. Alex commits fully. He was relieved you brought it up directly."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          char.flags.side_project_active = false; // set immediately so card can't re-fire
          char.morale = clamp(char.morale - 30, 0, 100);
          char.trust  = clamp(char.trust  - 25, 0, 100);
          if (e && e.pending) e.pending.push({
            fireWeek: s.week + 3, from: 'Alex', charId: 'alex',
            text: "i've decided to pursue it seriously. i'll keep helping part-time but i think we both know i'm not fully in anymore.",
            fx() {},
            cancel: (st, ch) => !ch || !ch.active || !!ch.flags.departure_resolved,
          });
        },
      },
      {
        id: 'alex_quiet', cat: 't', from: 'Alex',
        body: "short replies for 3 days, skipped standup yesterday. you don't know if it's burnout, frustration with progress, or something personal.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.week > 4 && char.morale < 40 && s.week >= (char.flags.last_quiet || 0) + 4,
        options: [
          { label: 'Check in with him', key: 'checkin',
            execute(s, char) { char.flags.last_quiet = s.week; char.morale = clamp(char.morale + 20, 0, 100); return "Had an honest conversation. Alex is exhausted. Adjusted expectations for the week."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          char.flags.last_quiet = s.week; // set immediately so cooldown blocks re-fire
          char.morale = clamp(char.morale - 14, 0, 100);
          char.trust  = clamp(char.trust  - 6,  0, 100);
          if (e && e.pending) e.pending.push({
            fireWeek: s.week + 2, from: 'Alex', charId: 'alex',
            text: "i need some space. working from home this week to figure some things out.",
            fx() {},
            cancel: (st, ch) => !ch || ch.morale >= 40,
          });
        },
      },
      {
        id: 'alex_equity', cat: 't', from: 'Alex',
        body: "third time this month. 'i'm not sure the current split reflects what i'm actually contributing.' getting harder to deflect.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.week >= 16 && char.morale < 55 && !char.flags.equity_resolved,
        options: [
          { label: 'Revise fairly', key: 'fair',
            execute(s, char) { char.flags.equity_resolved = true; char.morale = clamp(char.morale + 30, 0, 100); char.trust = clamp(char.trust + 15, 0, 100); return "Revised the split. Both sides signed. Relationship back on solid ground."; } },
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
        body: (s, char) => {
          if (!char.flags.discoveryEverAgreed)
            return "we've been heads-down building without talking to anyone outside. should we shift to customer discovery for a sprint or two?";
          const weeksAgo = s.week - (char.flags.lastDiscoveryWeek || 0);
          return weeksAgo >= 12
            ? `it's been ${weeksAgo} weeks since we last did discovery. things shift — worth a sprint to check if we're still solving the right problem?`
            : "we're back in build mode. it's only been a few weeks since we last talked to customers, but the queue keeps growing. do another round or keep building?";
        },
        urgency: 1, weeks: 1,
        available: (s, char) => !s.launched && s.week >= 6 && char.focus === 'build' && char.focusSprints >= 3
          && (s.market_fit < 80 && !s.has_beta)
          && s.week >= (char.flags.lastSyncToDiscover || 0) + 8,
        options: [
          { label: 'Yes — shift to discovery', key: 'discover',
            execute(s, char) { char.focus = 'discover'; char.focusSprints = 1; char.flags.lastSyncToDiscover = s.week; char.flags.discoveryEverAgreed = true; char.flags.lastDiscoveryWeek = s.week; return "Agreed. Alex on customer discovery this sprint."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.lastSyncToDiscover = s.week; },
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
        body: "traction story is solid. i'd create more value pitching investors right now than doing more discovery. frees you up to stay on users. worth trying?",
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
        body: "we need to stop calling this 'the project.' found three good domains: one sounds romantic, one sounds clean and abstract, one is a made-up word. pick one.",
        urgency: 1, weeks: 1,
        available: (s, char) => s.week <= 3 && !char.flags.name_done,
        options: [
          { label: 'The romantic one', key: 'catchy',
            execute(s, char) { char.flags.name_done = true; s.signal = clamp(s.signal + 4, 0, 100); return "Name locked. Memorable, a little warm in exactly the right way. People immediately know what it's for."; } },
          { label: 'The clean, abstract one', key: 'descriptive',
            execute(s, char) { char.flags.name_done = true; s.market_fit = clamp(s.market_fit + 2, 0, 100); return "Name locked. Distinctive, hard to confuse with anything else. Grows on people once they try it."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx(s, char) { char.flags.name_done = true; },
      },
      {
        id: 'early_tech_stack', cat: 'e', from: 'Alex', ignoreForTrust: true,
        body: "the matching algorithm is fine for 100 users. at 10,000 it'll fall apart. i can build it to scale properly — takes twice as long. or i ship something that works now and we fix it when it matters.",
        urgency: 1, weeks: 1,
        available: (s, char) => s.dev_plan != null && s.week <= 6 && !char.flags.stack_done,
        options: [
          { label: 'Ship now — fix the algorithm later', key: 'fast',
            execute(s, char) { char.flags.stack_done = true; return "Shipping with the fast version. Alex moving immediately. The 10,000-user problem is a good problem to have."; } },
          { label: 'Build it to scale from the start', key: 'scalable',
            execute(s, char) { char.flags.stack_done = true; s.tech_debt -= 5; return "Slower start, cleaner foundation. Alex is happy — he hates rewriting things."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx(s, char) { char.flags.stack_done = true; },
      },
      {
        id: 'early_customer_target', cat: 't', from: 'Alex', ignoreForTrust: true,
        body: "we keep switching who we're talking to — sometimes we pitch to young singles, sometimes to divorced 30-somethings. we should agree before it gets confusing.",
        urgency: 1, weeks: 1,
        available: (s, char) => s.week <= 6 && !char.flags.customer_target_done,
        options: [
          { label: 'Young singles — bigger market, easier to reach', key: 'individuals',
            execute(s, char) { char.flags.customer_target_done = true; s.market_fit = clamp(s.market_fit + 4, 0, 100); return "Locked in: 25-35 year olds tired of swiping. Bigger pool, faster feedback."; } },
          { label: 'Relationship-seekers — that\'s where the revenue is', key: 'teams',
            execute(s, char) { char.flags.customer_target_done = true; s.investor_warmth = clamp(s.investor_warmth + 4, 0, 100); return "Going after people who are seriously looking. Higher willingness to pay, stronger retention story."; } },
          { label: 'Follow the early users', key: 'open',
            execute(s, char) { char.flags.customer_target_done = true; return "Staying flexible. Let the first signups tell you who they are."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx(s, char) { char.flags.customer_target_done = true; },
      },
      {
        id: 'early_funding_goal', cat: 't', from: 'Alex', ignoreForTrust: true,
        body: "been sitting on this: dating apps go one of three ways — VC-backed and scale fast (Hinge, Bumble), get acquired by Match Group, or build a quiet profitable subscription business. which are we aiming for? changes everything about how we make decisions.",
        urgency: 1, weeks: 1,
        available: (s, char) => s.week >= 3 && s.week <= 8 && !char.flags.funding_goal_done,
        options: [
          { label: 'VC route — raise, grow fast, aim for IPO or acquisition', key: 'vc',
            execute(s, char) { char.flags.funding_goal_done = true; s.investor_warmth = clamp(s.investor_warmth + 5, 0, 100); return "Aligned on the VC path. Every conversation with investors gets sharper when you know what you're building toward."; } },
          { label: 'Profitable first — build a real business, no VC needed', key: 'profitable',
            execute(s, char) { char.flags.funding_goal_done = true; s.market_fit = clamp(s.market_fit + 3, 0, 100); return "Profitable first. Every product decision gets cleaner when the bar is 'do people pay for this', not 'can we raise on this'."; } },
          { label: 'Stay flexible — let traction tell us', key: 'open',
            execute(s, char) { char.flags.funding_goal_done = true; return "Staying flexible. Revisit when you have enough users to know what kind of company you actually are."; } },
        ],
        dropDelay: 0, dropMsg: null, dropFx(s, char) { char.flags.funding_goal_done = true; },
      },

      // ── EARLY: ADMIN & LEGAL ────────────────────────────────────────────────
      {
        id: 'incorporate_now', cat: 'e', from: 'Alex',
        body: "an advisor we're trying to bring on officially asked us to sign an NDA first. we can't without a legal entity. also need a bank account. stripe atlas or find a lawyer?",
        urgency: 2, weeks: 1, priority: true, ignoreForTrust: true,
        available: (s, char) => s.week >= 3 && s.week <= 14 && s.items != null && !s.incorporated,
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
        body: "been meaning to raise this: at my last job i built early prototypes of a recommendation engine — similar ML concepts to what we're using for matching. if an investor's lawyer finds this in diligence, they can kill the deal. we need to clean it up now.",
        urgency: 3, weeks: 1, ignoreForTrust: true,
        available: (s, char) => s.week >= 5 && s.week <= 12 && !s.ip_clear && !s.ip_concern_dismissed,
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
        body: "just got off a customer interview. the real frustration isn't finding matches — it's that conversations go nowhere. they matched with 20 people last month and went on zero dates. they'd pay $200/month for something that actually got them to a date.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.week <= 8 && !s.has_demo && char.focus === 'discover' && !char.flags.interview_shock_resolved,
        options: [
          { label: 'Pivot — focus on getting people to dates', key: 'pivot',
            execute(s, char) { char.flags.interview_shock_resolved = true; s.signal = clamp(s.signal + 15, 0, 100); s.market_fit = clamp(s.market_fit + 14, 0, 100); return "Pivoted focus to conversation quality and date-booking. Three more interviews confirmed it. Some earlier work won't carry over."; } },
          { label: 'Stay the course', key: 'stay',
            execute(s, char) { char.flags.interview_shock_resolved = true; s.signal = clamp(s.signal + 5, 0, 100); s.market_fit = clamp(s.market_fit + 3, 0, 100); return "Filed it away. Not ready to pivot on one data point. Logged it for later."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "had 2 more interviews. same thing — people are matching but never going on dates. we're solving the wrong problem.",
        dropFx(s, char) { char.flags.interview_shock_resolved = true; s.signal = clamp(s.signal - 15, 0, 100); },
      },
      {
        id: 'cold_silence', cat: 'c', from: 'Alex',
        body: "posted in 5 subreddits and messaged 30 people who complained about dating apps. 0 real responses — not even 'not interested.' is the message wrong, or are we targeting the wrong people?",
        urgency: 3, weeks: 1,
        available: (s, char) => s.week >= 2 && s.week <= 12 && !s.launched && s.signal < 50 && char.focus === 'discover' && !char.flags.cold_silence_resolved,
        options: [
          { label: 'Rewrite the outreach', key: 'rewrite',
            execute(s, char) { char.flags.cold_silence_resolved = true; s.signal = clamp(s.signal + 10, 0, 100); s.market_fit = clamp(s.market_fit + 6, 0, 100); return "Rewrote the outreach. New version leads with the pain — 'you've matched with dozens of people and gone on zero dates' — not the product. First reply came in 4 hours."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "week 2 of silence. i'm starting to wonder if the people who complain about dating apps actually want anything different.",
        dropFx(s, char) { char.flags.cold_silence_resolved = true; s.signal = clamp(s.signal - 10, 0, 100); char.morale = clamp(char.morale - 8, 0, 100); },
      },
      {
        id: 'random_reframe', cat: 'c', from: 'Alex',
        body: "talked to a stranger at a coffee shop about what we're building. they reframed it completely — 'sounds less like a dating app, more like a vetting tool.' different pitch, different product. we both went quiet. it kind of makes more sense.",
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
        body: "been talking to users all week and something keeps coming up. they're not frustrated by matching — they're frustrated that matches go nowhere. we've been solving the wrong part.",
        urgency: 3, weeks: 1,
        available: (s, char) => char.focus === 'discover' && char.focusSprints >= 2 && s.market_fit >= 8 && !char.flags.pivot1,
        options: [
          { label: 'Pivot — rethink the approach', key: 'pivot',
            execute(s, char) { char.flags.pivot1 = true; s.market_fit = clamp(s.market_fit + 25, 0, 100); s.signal = clamp(s.signal + 8, 0, 100); return "Rethought the approach. The real problem is conversation quality, not match quantity. Signal improved immediately."; } },
          { label: 'Stay the course', key: 'stay',
            execute(s, char) { char.flags.pivot1 = true; s.market_fit = clamp(s.market_fit + 5, 0, 100); return "Stayed the course. Alex logged the feedback but we're not changing direction yet."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "users keep saying the same thing. i'm worried we're building the wrong product.",
        dropFx(s, char) { char.flags.pivot1 = true; s.market_fit = clamp(s.market_fit - 5, 0, 100); s.signal = clamp(s.signal - 8, 0, 100); },
      },
      {
        id: 'pivot_insight_2', cat: 'c', from: 'Alex',
        body: "second round of interviews done. consistent: they want depth on one thing, not breadth. scope's too wide — they're not seeing the core value.",
        urgency: 3, weeks: 1,
        available: (s, char) => char.flags.pivot1 && char.focus === 'discover' && char.focusSprints >= 2 && s.market_fit >= 35 && !char.flags.pivot2,
        options: [
          { label: 'Narrow scope — go deep', key: 'pivot',
            execute(s, char) { char.flags.pivot2 = true; s.market_fit = clamp(s.market_fit + 20, 0, 100); s.signal = clamp(s.signal + 10, 0, 100); return "Narrowed scope significantly. Less ambitious but far more right. Three users asked for exactly this."; } },
          { label: 'Ship the broader version', key: 'stay',
            execute(s, char) { char.flags.pivot2 = true; s.market_fit = clamp(s.market_fit + 8, 0, 100); return "Decided to ship the broader scope. Market fit isn't perfect but you're moving."; } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "still not hearing the right signal from users. i think we're talking to the wrong people.",
        dropCancel: (s, char) => char.flags.pivot2 || char.flags.pmf_locked,
        dropFx(s, char) { char.flags.pivot2 = true; s.market_fit = clamp(s.market_fit - 8, 0, 100); s.signal = clamp(s.signal - 5, 0, 100); },
      },
      {
        id: 'pmf_lock', cat: 'c', from: 'Alex',
        body: "three users said the exact same thing unprompted this week: 'i actually went on a date because of this.' never seen that before. i think we finally know what to build.",
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
        body: "my parents asked again when i'm getting a real job. yours too? i keep explaining but they don't really get it. tbh it's getting in my head.",
        urgency: 1, weeks: 1,
        available: (s, char) => s.week >= 2 && s.week <= 18 && char.morale < 50 && !char.flags.family_doubt_resolved,
        options: [
          { label: 'Remind each other why', key: 'talk',
            execute(s, char) { char.flags.family_doubt_resolved = true; char.morale = clamp(char.morale + 12, 0, 100); return "Long talk. Reminded each other why you're doing this. Morale reset."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) { char.flags.family_doubt_resolved = true; },
      },

      // ── MID: PRODUCT ────────────────────────────────────────────────────────
      {
        id: 'alex_demo_ready', cat: 'p', from: 'Alex',
        body: "profiles and matching work end-to-end for the first time. create an account, get matched, send a message. that's the core hypothesis. want to put it in front of real people?",
        urgency: 3, weeks: 1,
        available: (s, char) => (char.buildEffort || 0) >= 4 && s.items?.matching_algo?.status === 'active' && !s.launched,
        options: [
          { label: 'Show it rough — learn fast', key: 'rough',
            execute(s) {
              s.has_demo = true; s.tech_debt += 12;
              s.waitlist += 2; s.market_fit = clamp(s.market_fit + 8, 0, 100);
              if (s.items) {
                s.items.matching_algo.status = 'done'; s.items.matching_algo.quality = 'rough';
                if (s.items.api_design) s.items.api_design.status = 'active';
              }
              return "Three contacts in the room. Two hit bugs immediately. One leaned forward: 'Show me that again — I've been on every app and none of them work like this.' You know what to build next.";
            } },
          { label: 'One sprint to polish it first', key: 'polish',
            execute(s) {
              s.has_demo = true; s.tech_debt += 3;
              s.waitlist += 2; s.market_fit = clamp(s.market_fit + 4, 0, 100); s.signal = clamp(s.signal + 4, 0, 100);
              if (s.items) {
                s.items.matching_algo.status = 'done'; s.items.matching_algo.quality = 'solid';
                if (s.items.api_design) s.items.api_design.status = 'active';
              }
              return "Spent the sprint cleaning up the worst rough edges. Demo ran cleanly. Contacts were impressed — but one extra sprint of polish is one sprint of not hearing 'I'd pay for that.'";
            } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "someone asked for a demo and i scheduled it for next week. we're showing what we have.",
        dropFx(s) {
          s.has_demo = true; s.tech_debt += 18; s.waitlist += 1;
          if (s.items) {
            s.items.matching_algo.status = 'done'; s.items.matching_algo.quality = 'rough';
            if (s.items.api_design) s.items.api_design.status = 'active';
          }
        },
      },
      {
        id: 'alex_beta_ready', cat: 'p', from: 'Alex',
        body: "web beta is ready. real accounts, real matches, real data. this is the first time we'll see if the product actually works in the wild.",
        urgency: 3, weeks: 1,
        available: (s) => s.has_demo && (s.ios_unblocked || s.jordan_resolved) && !s.has_beta && !s.launched
          && (s.dev_plan !== 'full' || allSprintsResolved(s)),
        options: [
          { label: 'Invite 10 hand-picked singles', key: 'curated',
            execute(s) {
              s.has_beta = true;
              s.waitlist += 5; s.market_fit = clamp(s.market_fit + 12, 0, 100);
              if (s.items && s.items.beta) s.items.beta.status = 'active';
              return "Invited 10 contacts — making sure we had a real mix of people. Eight signed up. Three matched with each other on day one. Two hit the same bug on day 3 — fixed before they could complain. One asked if they could pay now.";
            } },
          { label: 'Post it in two singles communities', key: 'open',
            execute(s) {
              s.has_beta = true;
              s.waitlist += 20; s.market_fit = clamp(s.market_fit + 5, 0, 100); s.signal = clamp(s.signal + 10, 0, 100);
              if (s.items && s.items.beta) s.items.beta.status = 'active';
              return "Posted in r/datingapps and a singles Facebook group. 20 signups in 48 hours. Chaotic — some people signed up just to see what it is. But you're seeing match patterns you couldn't have predicted.";
            } },
        ],
        dropDelay: 2, dropFrom: 'Alex',
        dropMsg: "getting inbound requests for beta access. i'm opening it up next week.",
        dropFx(s) {
          s.has_beta = true; s.waitlist += 3; s.market_fit = clamp(s.market_fit + 3, 0, 100);
          if (s.items && s.items.beta) s.items.beta.status = 'active';
        },
      },

      // ── FULL-SPEC SPRINT CARDS ───────────────────────────────────────────────
      {
        id: 'sprint_social', cat: 'p', from: 'Alex',
        body: "we planned the social layer — activity-based matching and push re-engagement. two sprints of work. do we build it before beta or defer to v2?",
        urgency: 2, weeks: 2,
        available: (s) => s.dev_plan === 'full' && s.items?.sprint_social?.status === 'todo' && s.has_demo,
        options: [
          { label: 'Build it properly', key: 'build',
            execute(s) {
              s.items.sprint_social.status = 'done'; s.items.sprint_social.quality = 'solid';
              s.cash = clamp(s.cash - 1200, 0, 9999999); s.market_fit = clamp(s.market_fit + 5, 0, 100);
              return "Activity layer and push notifications built. Real re-engagement driver in the product.";
            } },
          { label: 'Build lean versions', key: 'lean',
            execute(s) {
              s.items.sprint_social.status = 'done'; s.items.sprint_social.quality = 'rough';
              s.tech_debt += 6;
              return "Shipped stripped-down versions. Works, but will need revisiting.";
            } },
          { label: 'Defer to v2', key: 'defer',
            execute(s) {
              s.items.sprint_social.status = 'deferred';
              return "Noted. On the backlog. Staying lean for now.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s) { if (s.items?.sprint_social) s.items.sprint_social.status = 'deferred'; },
      },
      {
        id: 'sprint_algo', cat: 'p', from: 'Alex',
        body: "profile verification — photo check, linked accounts, basic trust signals. reduces fake profiles. on the roadmap — build before beta or defer?",
        urgency: 2, weeks: 2,
        available: (s) => s.dev_plan === 'full' && s.items?.sprint_algo?.status === 'todo' && sprintResolved(s, 'sprint_social'),
        options: [
          { label: 'Build it properly', key: 'build',
            execute(s) {
              s.items.sprint_algo.status = 'done'; s.items.sprint_algo.quality = 'solid';
              s.cash = clamp(s.cash - 1200, 0, 9999999); s.market_fit = clamp(s.market_fit + 6, 0, 100);
              return "Profile verification shipped. Photo checks and linked accounts live. Fake profile reports dropped.";
            } },
          { label: 'Build lean versions', key: 'lean',
            execute(s) {
              s.items.sprint_algo.status = 'done'; s.items.sprint_algo.quality = 'rough';
              s.tech_debt += 6;
              return "Basic verification shipped. Photo check only — no linked accounts. Trust signals are there but thin.";
            } },
          { label: 'Defer to v2', key: 'defer',
            execute(s) {
              s.items.sprint_algo.status = 'deferred';
              return "Deferred. Staying focused on core.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s) { if (s.items?.sprint_algo) s.items.sprint_algo.status = 'deferred'; },
      },
      {
        id: 'sprint_mono', cat: 'p', from: 'Alex',
        body: "we spec'd a paid tier. paywall, subscription flow. do we build it before we know if free users stick?",
        urgency: 2, weeks: 2,
        available: (s) => s.dev_plan === 'full' && s.items?.sprint_mono?.status === 'todo' && sprintResolved(s, 'sprint_algo'),
        options: [
          { label: 'Build the paywall', key: 'build',
            execute(s) {
              s.items.sprint_mono.status = 'done'; s.items.sprint_mono.quality = 'solid';
              s.cash = clamp(s.cash - 800, 0, 9999999);
              return "Premium subscription live. No paying users yet, but the infrastructure is there.";
            } },
          { label: 'Minimal version', key: 'lean',
            execute(s) {
              s.items.sprint_mono.status = 'done'; s.items.sprint_mono.quality = 'rough';
              s.tech_debt += 4;
              return "Basic paywall shipped. Will need work before serious monetization.";
            } },
          { label: 'Defer — validate free users first', key: 'defer',
            execute(s) {
              s.items.sprint_mono.status = 'deferred';
              return "Smart. Validate retention before monetizing.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s) { if (s.items?.sprint_mono) s.items.sprint_mono.status = 'deferred'; },
      },
      {
        id: 'sprint_adv_social', cat: 'p', from: 'Alex',
        body: "friend-of-friend discovery — surface matches through mutual connections. adds a trust layer. on the original spec. build now or defer?",
        urgency: 2, weeks: 2,
        available: (s) => s.dev_plan === 'full' && s.items?.sprint_adv_social?.status === 'todo' && sprintResolved(s, 'sprint_mono'),
        options: [
          { label: 'Build it', key: 'build',
            execute(s) {
              s.items.sprint_adv_social.status = 'done'; s.items.sprint_adv_social.quality = 'solid';
              s.market_fit = clamp(s.market_fit + 3, 0, 100);
              return "Social graph shipped. Mutual-connection matches converting at twice the rate.";
            } },
          { label: 'Build a lean version', key: 'lean',
            execute(s) {
              s.items.sprint_adv_social.status = 'done'; s.items.sprint_adv_social.quality = 'rough';
              s.tech_debt += 5;
              return "Basic version in. Discovery is limited to one degree out. Good enough to test the hypothesis.";
            } },
          { label: 'Defer', key: 'defer',
            execute(s) {
              s.items.sprint_adv_social.status = 'deferred';
              return "Deferred. Core product ships without it.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s) { if (s.items?.sprint_adv_social) s.items.sprint_adv_social.status = 'deferred'; },
      },
      {
        id: 'sprint_adv_video', cat: 'p', from: 'Alex',
        body: "in-app video dates. biggest ask from beta users. also the most complex thing left on the roadmap. build it or tell people to use FaceTime?",
        urgency: 2, weeks: 2,
        available: (s) => s.dev_plan === 'full' && s.items?.sprint_adv_video?.status === 'todo' && sprintResolved(s, 'sprint_adv_social'),
        options: [
          { label: 'Build it', key: 'build',
            execute(s) {
              s.items.sprint_adv_video.status = 'done'; s.items.sprint_adv_video.quality = 'solid';
              s.cash = clamp(s.cash - 2000, 0, 9999999); s.market_fit = clamp(s.market_fit + 5, 0, 100);
              return "Video dates shipped. Took longer and cost more than planned. Users love it.";
            } },
          { label: 'Build a lean version', key: 'lean',
            execute(s) {
              s.items.sprint_adv_video.status = 'done'; s.items.sprint_adv_video.quality = 'rough';
              s.cash = clamp(s.cash - 800, 0, 9999999); s.tech_debt += 10;
              return "Basic video in. Drops occasionally, no recording. Users complained, then kept using it anyway.";
            } },
          { label: 'Defer — tell them to use FaceTime', key: 'defer',
            execute(s) {
              s.items.sprint_adv_video.status = 'deferred';
              return "Deferred. You'll revisit after funding.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s) { if (s.items?.sprint_adv_video) s.items.sprint_adv_video.status = 'deferred'; },
      },
      // ── PIVOT DISCUSSION (card 2 of 3: Alex pushes back on Jordan's flag) ──────
      {
        id: 'pivot_alex_pushback', cat: 'p', from: 'Alex',
        body: (s) => {
          const base = "heard what jordan flagged. i disagree. we cut activities for a reason — scope creep is what kills startups at our stage. we built a strong matching engine. users always want more features. three people saying 'i don't know what to do' doesn't mean we rip up the product right before we're ready to ship.";
          return s.met_priya
            ? base + " priya pushed back on me — she said she's seen this kind of signal get ignored before. i respect her, but she didn't build this."
            : base;
        },
        urgency: 2, weeks: 1,
        available: (s, char, e) => {
          const jordan = e.chars.get("jordan");
          return jordan && jordan.flags.pivot_open_done && !char.flags.pivot_direction_set
            && s.activities_cut && !s.jordan_resolved && s.week <= 22;
        },
        options: [
          { label: "Alex is right — ship what we have, add activities post-launch", key: "ship",
            execute(s, char, e) {
              char.flags.pivot_direction = "ship";
              char.flags.pivot_direction_set = true;
              s.pivot_direction_game = "ship";
              char.morale = clamp(char.morale + 6, 0, 100);
              const jordan = e.chars.get("jordan");
              if (jordan) jordan.morale = clamp(jordan.morale - 5, 0, 100);
              if (!s.met_priya) {
                s.pivot_resolved_flag = true;
                s.pivot_deferred = true;
              }
              return "Alex looked relieved. Jordan went quiet — she's not sure you're right, but she'll build the release checklist.";
            } },
          { label: "The signal is real — I think we should pivot", key: "pivot",
            execute(s, char) {
              char.flags.pivot_direction = "pivot";
              char.flags.pivot_direction_set = true;
              s.pivot_direction_game = "pivot";
              char.morale = clamp(char.morale - 8, 0, 100);
              return "Alex went quiet. 'Okay. It's your call.' He doesn't agree.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          char.flags.pivot_direction = "ship";
          char.flags.pivot_direction_set = true;
          s.pivot_direction_game = "ship";
          const jordan = e && e.chars && e.chars.get("jordan");
          if (jordan) jordan.morale = clamp(jordan.morale - 5, 0, 100);
          if (!s.met_priya) { s.pivot_resolved_flag = true; s.pivot_deferred = true; }
        },
      },
      // ── PIVOT DISCUSSION (card 3 of 3: Alex counter, no-Priya pivot path) ────
      {
        id: 'pivot_counter_alex', cat: 'p', from: 'Alex',
        body: "i still think you're wrong. we built the right product — the matching engine is solid. i'll build whatever you decide. but i want it on the record: we're adding scope we already said no to.",
        urgency: 2, weeks: 1,
        available: (s, char) => char.flags.pivot_direction === "pivot" && !s.pivot_resolved_flag
          && !s.met_priya && s.week <= 22,
        options: [
          { label: "I've made the call — we pivot", key: "confirm",
            execute(s, char, e) {
              s.pivot_resolved_flag = true;
              s.activities_pivot = true;
              s.cash = clamp(s.cash - 2000, 0, 9999999);
              s.market_fit = clamp(s.market_fit + 15, 0, 100);
              char.morale = clamp(char.morale - 10, 0, 100);
              const jordan = e.chars.get("jordan");
              if (jordan) jordan.morale = clamp(jordan.morale + 5, 0, 100);
              applyActivitiesPivot(s);
              return "Alex went quiet. 'Okay.' Three weeks. $2k. Rebuilding around activities.";
            } },
          { label: "You're right — we ship as planned", key: "reverse",
            execute(s, char) {
              s.pivot_resolved_flag = true;
              s.pivot_deferred = true;
              char.morale = clamp(char.morale + 5, 0, 100);
              return "Alex seemed relieved. Shipping as planned.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) {
          s.pivot_resolved_flag = true;
          s.pivot_deferred = true;
          char.morale = clamp(char.morale + 5, 0, 100);
        },
      },
      {
        id: 'bad_retention', cat: 'p', from: 'Alex',
        body: "week two post-launch. signups are coming in but nobody's coming back. ran a quick survey — eight out of ten say the same thing: 'i matched with someone but then what?' they don't know what to do with a match. the retention curve is flat.",
        urgency: 3, weeks: 1, priority: true,
        available: (s, char) => s.launched && s.activities_cut && !s.activities_pivot
          && !char.flags.bad_retention_seen && s.week >= 12,
        options: [
          { label: 'Add activity features now — two-sprint fix', key: 'fix',
            execute(s, char) {
              char.flags.bad_retention_seen = true;
              s.activities_pivot = true;
              s.cash = clamp(s.cash - 3000, 0, 9999999);
              s.market_fit = clamp(s.market_fit + 8, 0, 100);
              char.morale = clamp(char.morale + 3, 0, 100);
              applyActivitiesPivot(s);
              return "Two sprints to retrofit activities post-launch. More expensive and disruptive than doing it before. Users who stayed are responding.";
            } },
          { label: "Run user calls — figure out what they actually need", key: 'calls',
            execute(s, char) {
              char.flags.bad_retention_seen = true;
              s.market_fit = clamp(s.market_fit + 4, 0, 100);
              char.morale = clamp(char.morale - 3, 0, 100);
              return "12 user calls this week. Every single one mentioned not knowing what to do after a match. The path forward is clear — it's just late.";
            } },
          { label: "Stay course — improve matching quality", key: 'stay',
            execute(s, char) {
              char.flags.bad_retention_seen = true;
              s.market_fit = clamp(s.market_fit - 20, 0, 100);
              s.signal = clamp(s.signal - 20, 0, 100);
              char.morale = clamp(char.morale - 15, 0, 100);
              return "Decided the problem is matching quality. Users keep churning. Alex thinks this is the wrong call but goes along with it.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char) {
          char.flags.bad_retention_seen = true;
          s.market_fit = clamp(s.market_fit - 25, 0, 100);
          s.signal = clamp(s.signal - 25, 0, 100);
          char.morale = clamp(char.morale - 15, 0, 100);
        },
      },
      {
        id: 'proto_to_product', cat: 'p', from: 'Alex',
        body: "the demo held together long enough to learn what we needed. but we both know it's duct tape. real users will break it in a week. i want to build this properly.",
        urgency: 2, weeks: 1,
        available: (s, char) => s.has_beta && !char.flags.rebuild_triggered
          && s.week >= (char.flags.rebuild_last || 0) + 4,
        options: [
          { label: "Let's build it for real", key: 'commit',
            execute(s, char) {
              char.flags.rebuild_triggered = true;
              s.productPhase = "product";
              return "Keeping what worked, scrapping the rest. We know the core flow — now we build it properly.";
            } },
          { label: 'Not yet — keep polishing the demo', key: 'delay',
            execute(s, char) {
              char.flags.rebuild_last = s.week;
              return "Still things to learn from the demo. Alex nods, but you can tell he's ready to move on.";
            } },
        ],
        dropFx(s, char) { char.flags.rebuild_last = s.week; },
      },
      {
        id: 'good_enough_launch', cat: 'p', from: 'Alex',
        body: "beta users have been in it for weeks. feedback is real, nothing's on fire. as ready as it'll get without public traffic — let's ship it.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.productPhase === "product" && s.has_beta && !s.launched
          && char.focus === 'build' && s.week >= (s.good_enough_last || 0) + 4
          && !(s.jordan_drifting && !s.jordan_resolved),
        options: [
          { label: 'Ship it — launch now', key: 'ship',
            execute(s, char) {
              s.launched = true; s.signal = clamp(s.signal + 12, 0, 100);
              if (s.items && s.items.beta) { s.items.beta.status = 'done'; s.items.beta.quality = 'solid'; }
              if (s.market_fit < 40) return "Launched. Users are signing up but not sticking around — the product doesn't match what they actually needed. Expect churn.";
              return "Launched. First real users are in. Feedback starts flowing.";
            } },
          { label: 'Two more weeks', key: 'wait',
            execute(s, char) { s.good_enough_last = s.week; char.morale = clamp(char.morale - 12, 0, 100); return "Polished a few more things. Alex thinks you're stalling — and he might be right."; } },
        ],
        dropDelay: 1, dropFrom: 'Alex',
        dropMsg: "another week building in a vacuum. runway is ticking and real users are waiting.",
        dropFx(s, char) { s.cash = clamp(s.cash - 800, 0, 9999999); char.morale = clamp(char.morale - 10, 0, 100); },
      },
      {
        id: 'alex_wants_rebuild', cat: 'p', from: 'Alex',
        body: "the current approach won't scale past 100 users. i know it's 2 weeks of work but if we don't do it now, it'll take 3x longer later.",
        urgency: 2, weeks: 2,
        available: (s, char) => !s.alex_rebuild_done && char.focus === 'build' && (s.has_demo || s.tech_debt >= 20),
        options: [
          { label: 'Do the refactor', key: 'refactor',
            execute(s, char) {
              s.alex_rebuild_done = true;
              char.morale = clamp(char.morale + 10, 0, 100);
              if (s.items?.api_design) { s.items.api_design.status = 'active'; s.items.api_design.quality = null; }
              if (s.items) { s.items.arch_refactor = { status: 'active', quality: null, assignee: 'alex' }; }
              s.arch_refactor_effort_target = (char.buildEffort || 0) + 2.0;
              return "Alex is heads-down. He's rebuilding the API layer from scratch — 2 weeks, nothing else gets done.";
            } },
        ],
        dropDelay: 4, dropFrom: 'Alex',
        dropMsg: "3 active outages this week from the tech debt i flagged. we're losing users in real time.",
        dropCancel: (s) => !s.launched,
        dropFx(s, char) {
          s.alex_rebuild_done = true;
          s.users = clamp(s.users - 8, 0, 9999);
          s.customers = clamp(s.customers - 2, 0, 9999);
          char.morale = clamp(char.morale - 20, 0, 100);
          if (s.items?.api_design) { s.items.api_design.status = 'done'; s.items.api_design.quality = 'rough'; }
        },
      },
      {
        id: 'arch_refactor_done', cat: 't', from: 'Alex',
        body: "refactor's done. rebuilt the api layer from scratch — clean, fast, and can scale past 10k users without touching it again.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.arch_refactor_effort_target != null && (char.buildEffort || 0) >= s.arch_refactor_effort_target && s.items?.arch_refactor?.status === 'active',
        options: [
          { label: 'Review the new architecture', key: 'review',
            execute(s, char) {
              if (s.items?.api_design) { s.items.api_design.status = 'done'; s.items.api_design.quality = 'solid'; }
              if (s.items?.arch_refactor) { s.items.arch_refactor.status = 'done'; s.items.arch_refactor.quality = 'solid'; }
              char.trust = clamp(char.trust + 5, 0, 100);
              char.morale = clamp(char.morale + 5, 0, 100);
              return "Walked through the new codebase with Alex. Clean separation, well-documented. He seemed proud of this one.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s) {
          if (s.items?.api_design) { s.items.api_design.status = 'done'; s.items.api_design.quality = 'solid'; }
          if (s.items?.arch_refactor) { s.items.arch_refactor.status = 'done'; s.items.arch_refactor.quality = 'solid'; }
        },
      },
      {
        id: 'alex_decision', cat: 't', from: 'Customer',
        body: "alex told me you'd add photo verification by end of week. it's wednesday. there's nothing about this in the roadmap.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.launched && s.customers > 1 && !char.flags.decision_done,
        options: [
          { label: 'Ship photo verification by Friday', key: 'ship',
            execute(s, char) { char.flags.decision_done = true; s.customers += 1; char.morale = clamp(char.morale + 5, 0, 100); return "Pulled it off. User upgraded immediately. Set clear boundaries with Alex about making commitments without checking first."; } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          char.flags.decision_done = true;
          s.signal = clamp(s.signal - 10, 0, 100);
          s.customers = clamp(s.customers - 1, 0, 9999);
          if (e && e.pending) e.pending.push({
            fireWeek: s.week + 1, from: 'User',
            text: "it's monday. still nothing. i'm going to try flare instead.",
            fx() {},
          });
        },
      },

      // ── DEPARTURE ARC ────────────────────────────────────────────────────────
      {
        id: 'alex_leaving_threat', cat: 't', from: 'Alex',
        body: "got a message from an old colleague at a well-funded startup. not going anywhere — but we need an honest conversation about where this is headed.",
        urgency: 3, weeks: 1, priority: true,
        available: (s, char, e) => e.alexDepartureRisk && char.active,
        options: [
          { label: 'Have the honest conversation', key: 'talk',
            execute(s, char, e) { char.trust = clamp(char.trust + 20, 0, 100); char.morale = clamp(char.morale + 15, 0, 100); char.flags.departure_resolved = true; e.alexDepartureRisk = false; return "Long, honest conversation. Alex is staying. Things need to improve — but you're aligned now."; } },
        ],
        dropDelay: 1, dropFrom: 'Alex',
        dropMsg: "i've decided to take the other opportunity. i'm sorry — i'll do a proper handoff this week.",
        dropFx(s, char, e) { char.active = false; e.alexDepartureRisk = false; },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.alex = def;
})();
