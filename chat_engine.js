// ─────────────────────────────────────────────────────────────────────────────
// chat_engine.js — clean chat-simulation engine (no card-dealing machinery)
//
// The game is a week-by-week chat sim. Each week the player has 2 actions.
// An action = answering one surfaced chat message (picking a suggested reply)
// or taking one journal action. Characters surface at most one message at a
// time; messages persist until answered. If a message's moment passes (its
// available() predicate flips false while still unanswered) its dropFx fires
// once and its dropMsg, if any, is posted as a follow-up.
//
// Content comes from the existing roles/*.js definitions, but only a curated
// allowlist of card IDs is wired up for this slice (Alex + Jordan early arc
// through the equity negotiation, plus the founder "You" journal).
//
// No DOM here. Dual export: Node (module.exports) + browser (window.ChatEngine).
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  // Character definitions: Node requires them; browser reads the ROLES global
  // populated by the <script src="roles/*.js"> tags.
  const DEFS = (typeof require !== "undefined")
    ? {
        alex:         require("./roles/alex.js"),
        jordan:       require("./roles/jordan.js"),
        priya:        require("./roles/priya.js"),
        marcus:       require("./roles/marcus.js"),
        fatima:       require("./roles/fatima.js"),
        ryan:         require("./roles/ryan.js"),
        sarah:        require("./roles/sarah.js"),
        brett:        require("./roles/brett.js"),
        kevin:        require("./roles/kevin.js"),
        mom:          require("./roles/mom.js"),
        jamie:        require("./roles/jamie.js"),
        david:        require("./roles/david.js"),
        founder:      require("./roles/founder.js"),
        hacker_news:  require("./roles/hacker_news.js"),
        yc:           require("./roles/yc.js"),
        lena:         require("./roles/lena.js"),
        techcrunch:   require("./roles/techcrunch.js"),
        users:        require("./roles/users.js"),
        analytics:    require("./roles/analytics.js"),
        twitter:      require("./roles/twitter.js"),
        tom:          require("./roles/tom.js"),
      }
    : (typeof ROLES !== "undefined" ? ROLES : {});

  // ── Curated slice: which cards from each role participate ──────────────────
  const SLICE = {
    alex: [
      "start_prototype",
      "incorporate_week1",
      "dev_planning_session",
      "alex_commitment",
      "early_name",
      "early_tech_stack",
      "early_customer_target",
      "early_funding_goal",
      "vision_mismatch",
      "jordan_equity_alex",
      "jordan_equity_counter_alex",
      "alex_side_project",
      "alex_side_project_escalation",
      "alex_quiet",
      "alex_equity",
      "alex_sync_discover",
      "alex_sync_build",
      "alex_sync_pitch",
      "alex_demo_ready",
      "alex_beta_ready",
      "sprint_social",
      "sprint_algo",
      "sprint_mono",
      "sprint_adv_social",
      "sprint_adv_video",
      "pivot_alex_pushback",
      "pivot_counter_alex",
      "bad_retention",
      "proto_to_product",
      "good_enough_launch",
      "alex_wants_rebuild",
      "arch_refactor_done",
      "alex_decision",
      "alex_leaving_threat",
      "incorporate_now",
      "ip_concern",
      "first_interview_shock",
      "cold_silence",
      "random_reframe",
      "pivot_insight_1",
      "pivot_insight_2",
      "pmf_lock",
      "family_doubt",
    ],
    jordan: [
      "jordan_equity_mention",
      "jordan_equity_counter_jordan",
      "jordan_equity_counter_both",
      "early_working_style",
      "early_pricing",
      "jordan_ios_sprint",
      "pivot_open",
      "jordan_drift_start",
      "jordan_drag",
      "jordan_fulltime_ask",
      "jordan_launch_blocker",
      "jordan_confrontation",
      "jordan_cap_table",
    ],
    priya: [
      "mentor_competitor_bomb",
      "pivot_priya_verdict",
    ],
    marcus: [
      "investor_intro_warm",
      "prep_deck",
      "investor_ready",
      "seed_pitch",
    ],
    fatima: [
      "fatima_intro",
      "fatima_meeting",
      "fatima_deck",
      "fatima_commit",
    ],
    ryan: [
      "ryan_intro",
      // "ryan_checkin" — DEFERRED: from:"You", uses get body() getter syntax
      // which won't resolve via _resolveBody. Needs rework to a function body.
    ],
    sarah: [
      "intro_expiring",
    ],
    brett: [
      "consultant_brand",
    ],
    kevin: [
      "consultant_growth",
    ],
    mom: [
      "ff_family",
      "ff_family_2",
      "ff_family_3",
    ],
    jamie: [
      "ff_friend",
      "ff_friend_ask",
    ],
    david: [
      "ff_mentor",
      "ff_mentor_pitch",
    ],
    hacker_news: [
      "hn_thread",
      "community_signal_hn_1",
      "community_signal_hn_2",
      "community_signal_hn_3",
      "community_signal_reddit_1",
      "community_signal_reddit_2",
      "community_signal_reddit_3",
      "community_signal_slack_1",
      "community_signal_slack_2",
      "community_signal_slack_3",
      "community_product_hn",
      "community_product_reddit",
      "community_product_slack",
      "yc_discussion_ready",
      "yc_discussion_early",
    ],
    yc: [
      "yc_apply",
    ],
    lena: [
      "reporter_deadline",
    ],
    techcrunch: [
      "competitor_launch",
      "competitor_growing",
      "investor_moat_question",
    ],
    users: [
      "bug_reports",
      "churn_interview",
      "feature_request_custom",
      "feature_cluster",
      "waitlist_cold",
    ],
    analytics: [
      "silent_churn",
    ],
    twitter: [
      "public_complaint",
    ],
    tom: [
      "power_user_quiet",
    ],
    founder: [
      "founder_landing",
      "founder_first_interviews",
      "equity_signing",
      "founder_meetup",
      "founder_codebuild",
      "founder_build_onboarding",
      "founder_build_empty_states",
      "founder_build_export",
      "founder_build_demo_account",
      "founder_solo_launch",
      "founder_solo_build",
      "founder_solo_discover",
      "founder_solo_growth",
      "founder_user_depth",
      "first_customer_offer",
      "reference_checkin",
      "website_social_proof",
      "founder_pricing_experiment",
      "founder_reflect", // quiet-week fallback
    ],
  };

  const META = {
    alex:         { name: "Alex",       initials: "A",  color: "#0b84ff", role: "Co-founder · CTO" },
    jordan:       { name: "Jordan",     initials: "J",  color: "#34c759", role: "Co-founder · iOS" },
    priya:        { name: "Priya",      initials: "P",  color: "#af52de", role: "Advisor" },
    marcus:       { name: "Marcus",     initials: "M",  color: "#ff9500", role: "Angel investor" },
    fatima:       { name: "Fatima",     initials: "F",  color: "#ff6482", role: "Angel investor" },
    ryan:         { name: "Ryan",       initials: "R",  color: "#5ac8fa", role: "Angel investor" },
    sarah:        { name: "Sarah",      initials: "S",  color: "#ff2d55", role: "Community leader" },
    brett:        { name: "Brett",      initials: "B",  color: "#8e8e93", role: "Brand consultant" },
    kevin:        { name: "Kevin",      initials: "K",  color: "#8e8e93", role: "Growth consultant" },
    mom:          { name: "Mom",        initials: "👩",  color: "#ffcc02", role: "Family" },
    jamie:        { name: "Jamie",      initials: "Ja", color: "#64d2ff", role: "College friend" },
    david:        { name: "David",      initials: "D",  color: "#30b0c7", role: "Ex-manager" },
    hacker_news:  { name: "HN / Reddit",initials: "📰", color: "#ff6600", role: "Communities" },
    yc:           { name: "YC",         initials: "Y",  color: "#f26522", role: "Y Combinator" },
    lena:         { name: "Lena",       initials: "L",  color: "#bf5af2", role: "Tech journalist" },
    techcrunch:   { name: "Market",     initials: "📊", color: "#00c853", role: "Industry news" },
    users:        { name: "Users",      initials: "👥", color: "#007aff", role: "Your customers" },
    analytics:    { name: "Analytics",  initials: "📈", color: "#5856d6", role: "Product data" },
    twitter:      { name: "Twitter",    initials: "𝕏",  color: "#1da1f2", role: "Social media" },
    tom:          { name: "Tom",        initials: "T",  color: "#34c759", role: "Power user" },
    founder:      { name: "You",        initials: "Me", color: "#8e8e93", role: "Founder · Journal" },
  };

  // Greeting message posted when a character first unlocks and appears in the sidebar.
  const INTROS = {
    priya: "hey! great meeting you at the meetup last week. been thinking about what you're building — i have some thoughts on the dating app space when you have a minute.",
    marcus: "heard about kindred through the network. genuinely curious about what you're building in the dating space — would love to connect when you have a minute.",
    fatima: "a few people i trust have mentioned kindred. i invest in consumer social — would love to hear more.",
    ryan: "heard about you through the network. love what you're building in the dating space — would love to grab coffee.",
    sarah: "hey — heard about kindred from a mutual friend. i run a singles community in SF and i think there could be a fit.",
    brett: "found you on crunchbase. i work with early-stage founders on positioning — dropping you a line.",
    kevin: "saw your HN post. i do growth audits for consumer startups — think i can help.",
    jamie: "yo! heard you actually quit to do this for real. wild. coffee?",
    david: "keeping an eye on what you're doing. would love to grab lunch — been a while.",
    lena: "hi — i'm a reporter covering the consumer dating space. might want to feature you in an upcoming piece.",
    users: "you have real users now. they're going to start talking.",
    analytics: "enough data to start seeing patterns.",
    twitter: "people are talking about kindred on social media.",
    tom: "your most active subscriber just went quiet.",
  };

  // ── Journal voice ──────────────────────────────────────────────────────────
  // The role files' execute() returns are neutral narration meant for a card UI.
  // In the journal we retell each outcome in the founder's own first-person,
  // past-tense voice. Keyed by "cardId|optionKey"; missing keys fall back to the
  // original outcome text. (This bridge keeps roles/*.js untouched for now;
  // when cards are properly ported to chats the voice moves into the content.)
  const VOICE = {
    "start_prototype|build":
      "Told the team to start building today. Alex took profiles and matching, Jordan's on iOS, I'll cover everything else. We're shelving the activity-planning idea — it's really a second product. Core first.",
    "incorporate_week1|atlas":
      "Filed through Stripe Atlas. Delaware C-corp, EIN, bank account in two days. $500 gone, but we're a real company now.",

    "dev_planning_session|full":
      "We spec'd the whole thing — three hours, the whiteboard packed with twenty-plus items. Jordan's thrilled. Alex thinks it's too much, and part of me suspects he's right.",
    "dev_planning_session|lean":
      "Kept the plan tight: ninety minutes, five items, core hypothesis only. Alex looked relieved. We can spec the rest once we know what works.",
    "dev_planning_session|sprint":
      "Skipped planning. We're just going to build and figure it out as we go. No shared picture of what 'done' looks like — which nags at me a little.",

    "alex_commitment|accept":
      "Agreed Alex stays part-time for now — evenings and weekends. Slower, but he won't resent it. We set a milestone to revisit once we have traction.",
    "alex_commitment|push":
      "Pushed Alex to go full-time. He said yes, but I could tell he wasn't ready. I'll need to watch how he's doing.",

    "early_name|catchy":
      "Locked the name. Warm and memorable — people get what it's for the second they hear it.",
    "early_name|descriptive":
      "Locked the name. Clean and distinctive, hard to confuse with anything else. It grows on people once they try it.",

    "early_tech_stack|fast":
      "Decided to ship the fast version of the matching algorithm and fix scale later. The 10,000-user problem is a good problem to have.",
    "early_tech_stack|scalable":
      "Decided to build the matching engine to scale from the start. Slower, but a cleaner foundation — and Alex hates rewriting things.",

    "early_customer_target|individuals":
      "Settled on who we're for: 25–35, tired of swiping. Bigger pool, faster feedback.",
    "early_customer_target|teams":
      "Settled on relationship-seekers — people seriously looking. Higher willingness to pay, a stronger retention story.",
    "early_customer_target|open":
      "Decided to stay flexible on who we're for and let the first signups tell us who they are.",

    "early_funding_goal|vc":
      "We aligned on the VC path — raise, grow fast, aim big. Every investor conversation gets sharper now that we know what we're building toward.",
    "early_funding_goal|profitable":
      "We agreed to aim for profitable first — a real business, no VC required. Every product call gets cleaner when the bar is 'do people pay for this.'",
    "early_funding_goal|open":
      "Left the funding question open. We'll revisit once we have enough users to know what kind of company we actually are.",

    "vision_mismatch|alex":
      "Conceded the framing to Alex — we're 'casual dating done right.' Broader market, easier to explain. A few old 'serious matches' conversations are awkward now, but at least we're aligned.",
    "vision_mismatch|yours":
      "Held the line on serious relationships. Alex went along with it — he still thinks casual is bigger, but the investor story is cleaner. The tension isn't really gone.",
    "vision_mismatch|test":
      "Instead of arguing, I ran eight quick user calls. People who want serious relationships hate swiping apps, and vice versa — two real segments. We're leading with the relationship-seekers: they pay more and churn less.",

    "jordan_equity_alex|propose_33":
      "Proposed equal thirds — Jordan found the space and brought us together, Alex builds, I run it. We're all essential. Alex went quiet; he expected more for being all-in.",
    "jordan_equity_alex|propose_40":
      "Proposed 40/40/20 — Alex and I are all in, Jordan's still at her job. Alex was happy. Jordan hasn't heard yet.",
    "jordan_equity_alex|propose_50":
      "Took 50 for myself, 25 each for Alex and Jordan. Alex went quiet for a moment, then said okay. I'll be hearing from both of them.",

    "jordan_equity_counter_alex|cave_40":
      "Alex pushed back, and he had a point — he's full-time, Jordan isn't. Moved to 40/40/20. He appreciated it.",
    "jordan_equity_counter_alex|hold_33":
      "Alex pushed for more, but I held equal thirds. Everyone's essential. He didn't agree — but he dropped it.",

    "jordan_equity_mention|open":
      "Jordan brought up equity before it gets weird. Put it on the agenda — glad someone said it out loud.",

    "jordan_equity_counter_jordan|cave_33":
      "Jordan was right — two people writing code shouldn't be split so unevenly. Went back to equal thirds. She was relieved; Alex went quiet when he heard.",
    "jordan_equity_counter_jordan|hold_40":
      "Held 40/40/20 — Jordan's not full-time and the split reflects that. She went quiet. 'Fine. I'll show you what 20% of work looks like.'",

    "jordan_equity_counter_both|cave_alex":
      "Gave Alex what he wanted — 40/40/20. Jordan has less than she hoped, but she accepted it.",
    "jordan_equity_counter_both|cave_jordan":
      "Gave Jordan equal thirds. Alex went quiet, and I gave up my majority — but it felt fair.",
    "jordan_equity_counter_both|hold_50":
      "Held 50/25/25 — I run this company. Both accepted it. Alex was terse, Jordan just said 'okay.' The tension didn't disappear.",

    "equity_signing|sign":
      "We signed the founder agreement. The split's locked in. Nobody set up vesting schedules — it felt unnecessary between friends. I hope that's not something I regret.",

    "early_working_style|standup":
      "Set a daily 15-minute standup at 9am with Jordan. Keeps us both honest while she's still juggling her day job.",
    "early_working_style|async":
      "Decided to work async with Jordan — ping when blocked. Fewer interruptions, more deep work.",

    "early_pricing|charge":
      "Decided to charge from day one. Ten serious subscribers beat a hundred who open it once. If they pay before there are many matches, they really want this.",
    "early_pricing|free":
      "Decided to stay free until we have critical mass. More people in the door — the cold-start problem is real, and nobody finds a match worth paying for in an empty app.",

    "founder_landing|build":
      "Registered the domain and put up a simple landing page — $200 for the domain, hosting, and Carrd. Already got twelve 'signups'… all crypto spam. Still, we exist online now.",
    "founder_first_interviews|interview":
      "Blocked off the week for five customer interviews. Two insights I didn't expect, and one person said they'd pay right now if it existed. The picture's much clearer.",
    "founder_meetup|go":
      "Went to the founder meetup. Good crowd. Long talk with Priya — she launched a consumer app years ago, has strong opinions on retention, and seemed genuinely curious about what we're building.",
    "founder_reflect|review":
      "Quiet week. Sharpened the pitch — small refinements, nothing dramatic. Sometimes that's the work.",

    "mentor_competitor_bomb|research":
      "Spent the weekend doing a full competitive analysis. Eight serious dating apps, two well-funded, one YC-backed. None of them solve it the way we do — that's our wedge. Priya's officially advising now.",

    "pivot_priya_verdict|pivot":
      "Called Alex. 'I've made the decision — we're pivoting.' He went quiet, then: 'okay.' Three weeks, $2k. We're rebuilding around activities.",
    "pivot_priya_verdict|ship":
      "Decided to ship as planned. Alex was relieved. Priya said 'okay — watch your week-two retention closely.' I'll remember that.",
    "pivot_priya_verdict|go":
      "Three weeks. $2k. Alex built it without comment. The product shifted underneath us — and it feels right.",

    // ── Alex remaining cards ──────────────────────────────────────────────
    "alex_side_project|pause":
      "Appreciated the honesty. Asked him to pause the side project until we hit a milestone. He agreed — relationship's stronger for it.",
    "alex_side_project_escalation|talk":
      "Had a hard conversation. Alex committed fully — said he was relieved I brought it up directly.",
    "alex_quiet|checkin":
      "Noticed Alex had gone quiet. Checked in. Honest conversation — he's exhausted. Adjusted expectations for the week.",
    "alex_equity|fair":
      "Revised the equity split. Both sides signed. Relationship's back on solid ground.",
    "alex_equity|hard":
      "Pushed back hard on the equity ask. Alex accepted for now but he's not happy — this is coming back.",
    "alex_equity|defer":
      "Kicked the equity discussion down the road. Alex grudgingly agreed, but the tension's building.",

    "alex_sync_discover|discover":
      "Agreed to shift Alex to customer discovery this sprint. Time to talk to real people again.",
    "alex_sync_build|build":
      "Alex back to building. Enough feedback for now — time to act on what we learned.",
    "alex_sync_pitch|pitch":
      "Alex is working the investor pipeline. Traction story is solid enough to pitch.",

    "alex_demo_ready|rough":
      "Showed the demo rough. Three contacts in the room — two hit bugs, but one leaned forward: 'Show me that again.' We know what to build next.",
    "alex_demo_ready|polish":
      "Spent a sprint polishing before showing anyone. Demo ran cleanly. Contacts were impressed — but one extra sprint of polish is one sprint of not hearing 'I'd pay for that.'",
    "alex_beta_ready|curated":
      "Invited 10 hand-picked singles for the beta. Eight signed up. Three matched on day one. One asked if they could pay now.",
    "alex_beta_ready|open":
      "Posted in two singles communities. 20 signups in 48 hours. Chaotic — but we're seeing match patterns we couldn't have predicted.",

    "sprint_social|build":
      "Built the activity layer and push notifications properly. Real re-engagement driver in the product now.",
    "sprint_social|lean":
      "Shipped stripped-down versions of the social features. Works, but we'll need to revisit.",
    "sprint_social|defer":
      "Deferred the social layer to v2. Staying lean for now.",
    "sprint_algo|build":
      "Profile verification shipped — photo checks and linked accounts. Fake profile reports dropped immediately.",
    "sprint_algo|lean":
      "Basic verification only — photo check, no linked accounts. Trust signals are thin but there.",
    "sprint_algo|defer":
      "Deferred verification. Staying focused on core.",
    "sprint_mono|build":
      "Premium subscription is live. No paying users yet, but the infrastructure's there.",
    "sprint_mono|lean":
      "Basic paywall shipped. Will need work before serious monetization.",
    "sprint_mono|defer":
      "Deferred monetization. Smart — validate retention before building a paywall.",
    "sprint_adv_social|build":
      "Social graph shipped. Mutual-connection matches converting at twice the rate of cold ones.",
    "sprint_adv_social|lean":
      "Basic social discovery in — limited to one degree out. Good enough to test the hypothesis.",
    "sprint_adv_social|defer":
      "Deferred social discovery. Core product ships without it.",
    "sprint_adv_video|build":
      "Video dates shipped. Took longer and cost more than planned. Users love it.",
    "sprint_adv_video|lean":
      "Basic video in. Drops occasionally, no recording. Users complained, then kept using it anyway.",
    "sprint_adv_video|defer":
      "Deferred video dates — told users to use FaceTime. We'll revisit after funding.",

    "pivot_alex_pushback|ship":
      "Sided with Alex — we ship what we have, add activities post-launch. Alex looked relieved. Jordan went quiet.",
    "pivot_alex_pushback|pivot":
      "Told Alex the signal is real — we should pivot. He went quiet. 'Okay. It's your call.' He doesn't agree.",
    "pivot_counter_alex|confirm":
      "Confirmed the pivot over Alex's objection. Three weeks, $2k. We're rebuilding around activities.",
    "pivot_counter_alex|reverse":
      "Changed my mind — shipping as planned. Alex seemed relieved.",

    "bad_retention|fix":
      "Retrofitted activity features post-launch. More expensive and disruptive than doing it pre-launch, but users who stayed are responding.",
    "bad_retention|calls":
      "Did 12 user calls this week. Every single one mentioned not knowing what to do after matching. The path forward is clear — just late.",
    "bad_retention|stay":
      "Decided the problem was matching quality, not the post-match experience. Users keep churning. I think Alex is right that this was the wrong call.",
    "proto_to_product|commit":
      "Keeping what worked from the demo, scrapping the rest. We know the core flow — now we build it properly.",
    "proto_to_product|delay":
      "Not ready to rebuild yet — still learning from the demo. Alex nods, but I can tell he wants to move on.",
    "good_enough_launch|ship":
      "Launched. First real users are in. Feedback starts flowing.",
    "good_enough_launch|wait":
      "Polished a few more things instead of launching. Alex thinks I'm stalling — and he might be right.",
    "alex_wants_rebuild|refactor":
      "Gave Alex two weeks to rebuild the API layer from scratch. Nothing else gets done — but if he's right, it'll save us months later.",
    "arch_refactor_done|review":
      "Walked through the new codebase with Alex. Clean separation, well-documented. He seemed proud of this one.",
    "alex_decision|ship":
      "Pulled off photo verification by Friday. User upgraded immediately. Set clear boundaries with Alex about making commitments without asking first.",
    "alex_leaving_threat|talk":
      "Long, honest conversation with Alex. He's staying. Things need to improve — but we're aligned now.",

    "incorporate_now|atlas":
      "Incorporated via Stripe Atlas. $500, Delaware C-corp, EIN, bank account. Feels official.",
    "ip_concern|lawyer":
      "Lawyer reviewed Alex's previous employer IP agreement. Personal time, unrelated enough — no claim. IP assignment signed. Clean. $1,500.",
    "first_interview_shock|pivot":
      "Pivoted focus to conversation quality and date-booking. Three more interviews confirmed it. Some earlier work won't carry over.",
    "first_interview_shock|stay":
      "Filed the customer insight away. Not ready to pivot on one data point.",
    "cold_silence|rewrite":
      "Rewrote the outreach. New version leads with the pain — 'you've matched with dozens of people and gone on zero dates.' First reply came in 4 hours.",
    "random_reframe|test":
      "Ran the 'vetting tool' framing by 3 more people. All 3 immediately got it. Updated the positioning.",
    "pivot_insight_1|pivot":
      "Rethought the approach. The real problem is conversation quality, not match quantity. Signal improved immediately.",
    "pivot_insight_1|stay":
      "Logged the feedback but staying the course for now. Alex isn't convinced either.",
    "pivot_insight_2|pivot":
      "Narrowed scope significantly. Less ambitious but far more right. Three users asked for exactly this.",
    "pivot_insight_2|stay":
      "Decided to ship the broader scope. Market fit isn't perfect but we're moving.",
    "pmf_lock|lock":
      "Locked in. Three users said the same thing unprompted this week: 'I actually went on a date because of this.' This is the product. Now build it right.",
    "family_doubt|talk":
      "Long talk with Alex about family pressure. Reminded each other why we're doing this. Morale reset.",

    // ── Jordan remaining cards ────────────────────────────────────────────
    "jordan_ios_sprint|ack":
      "Jordan's iOS sprint is done. Good momentum — keep it rolling.",
    "pivot_open|open":
      "Jordan flagged something in the beta feedback: users keep saying 'I matched, but then what?' Put it on the agenda.",
    "jordan_drift_start|talk":
      "Talked to Jordan directly about slowing down. She was apologetic, said it's temporary. I'm not sure.",
    "jordan_drift_start|cover":
      "Let Alex cover for Jordan. He nodded, but his backlog just got longer.",
    "jordan_drag|talk":
      "Sat down with Jordan. She heard the weight of it. Alex noticed I followed up.",
    "jordan_fulltime_ask|accept":
      "Accepted Jordan's answer — she stays part-time. Alex heard and he's covering her work.",
    "jordan_fulltime_ask|pressure":
      "Told Jordan this is a dealbreaker. She said she'd think about it. She didn't change.",
    "jordan_launch_blocker|web_only":
      "Launched web-only. A dating app without iOS is a real handicap — early retention will show it.",
    "jordan_launch_blocker|wait":
      "Gave Jordan two more weeks. Alex wasn't happy. The clock is running.",
    "jordan_launch_blocker|confront":
      "Decided to confront Jordan about the launch blocker. This conversation is overdue.",
    "jordan_confrontation|fire":
      "Hard conversation. Jordan wasn't surprised — she knew it wasn't working. She's off the team.",
    "jordan_confrontation|defer":
      "Gave Jordan one more sprint. Alex went quiet. We both know how this ends.",
    "jordan_cap_table|lawyer":
      "Hired a lawyer to clean up Jordan's equity. $2,000, buyback agreement signed. Cap table clean.",
    "jordan_cap_table|defer":
      "Can't afford cap table cleanup right now. Every investor who looks will ask about Jordan's stake.",

    // ── Marcus ────────────────────────────────────────────────────────────
    "investor_intro_warm|call":
      "Great call with Marcus. He's following our progress now.",
    "prep_deck|build":
      "Built the investor deck. Story is clear, numbers are real. Ready when the time comes.",
    "investor_ready|meet":
      "Took both investor meetings. Strong — both want to see our next milestone.",
    "seed_pitch|pitch":
      "Had the formal conversation with Marcus about leading our round.",

    // ── Fatima ────────────────────────────────────────────────────────────
    "fatima_intro|call":
      "Good call with Fatima. Sharp questions about the problem space. She asked for the deck when it's ready.",
    "fatima_intro|pass":
      "Declined Fatima's call. She said to reach out when timing is better.",
    "fatima_meeting|meet":
      "Strong meeting with Fatima. She pushed hard on distribution, then asked for the deck and latest numbers.",
    "fatima_deck|walk":
      "Walked Fatima through the unit economics and TAM. She said the story is tight — completing diligence now.",
    "fatima_commit|welcome":
      "Fatima committed. Her diligence is done.",

    // ── Ryan ──────────────────────────────────────────────────────────────
    "ryan_intro|meet":
      "Great coffee with Ryan. Sharp questions, genuinely excited. He wants to stay close as things develop.",
    "ryan_intro|pass":
      "Declined Ryan's coffee invite. He said to reach out when timing's better.",

    // ── Sarah ─────────────────────────────────────────────────────────────
    "intro_expiring|reply":
      "Met with Sarah — she runs a singles community of 18,000 members. She liked the product and agreed to feature kindred at her next event. 12 signups in the first week.",

    // ── Brett ─────────────────────────────────────────────────────────────
    "consultant_brand|hire":
      "Hired Brett for a brand workshop. 45 minutes of sticky notes and a 'narrative architecture' framework. His main insight: 'lean into your why.' I already knew this. $1,500.",

    // ── Kevin ─────────────────────────────────────────────────────────────
    "consultant_growth|hire":
      "Hired Kevin for a growth audit. Got a 58-slide deck titled 'Growth Architecture 2.0.' Top recommendation: post more on LinkedIn. $2,000.",

    // ── Mom ───────────────────────────────────────────────────────────────
    "ff_family|ask":
      "Asked the parents to invest. It hits different when it's family money.",
    "ff_family|intro":
      "Asked Mom for investor introductions. Turns out she doesn't know any investors.",
    "ff_family_2|ask":
      "Asked the parents again. Family money — complicated feelings.",
    "ff_family_2|intro":
      "Mom asked around again. Still no investor connections.",
    "ff_family_3|ask":
      "Dad wants to invest. Let him. Family money hits different.",

    // ── Jamie ─────────────────────────────────────────────────────────────
    "ff_friend|tell":
      "Caught up with Jamie over coffee. Told him everything. He was into it — put him on the beta list.",
    "ff_friend_ask|ask":
      "Asked Jamie to invest. He wants to support this.",

    // ── David ─────────────────────────────────────────────────────────────
    "ff_mentor|lunch":
      "Good lunch with David. Sharp questions about the dating app space. He wants something concrete — what makes people stay.",
    "ff_mentor_pitch|pitch":
      "Went through the numbers with David over coffee.",

    // ── Hacker News / Reddit / IH ─────────────────────────────────────────
    "hn_thread|engage":
      "Engaged the HN thread authentically. 7 DMs requesting early access.",
    "community_signal_hn_1|engage":
      "Commented on the HN thread with a genuine take. 4 people DM'd asking when we're launching.",
    "community_signal_hn_1|skip":
      "Read the HN thread. Nothing actionable right now.",
    "community_signal_hn_2|engage":
      "Left a detailed reply on the HN thread. Two people asked to be notified at launch — one is a former PM at a big company.",
    "community_signal_hn_2|skip":
      "Didn't engage the HN thread. Kept building.",
    "community_signal_hn_3|engage":
      "Shared the waitlist link on HN. 8 signups from the thread. One person asked to beta test.",
    "community_signal_hn_3|skip":
      "Watched the HN thread from the sidelines. Three potential users moved on.",
    "community_signal_reddit_1|engage":
      "Joined the Reddit conversation as a builder. 2 people signed up for early access.",
    "community_signal_reddit_1|skip":
      "Skipped the Reddit thread. Staying focused.",
    "community_signal_reddit_2|engage":
      "Added my take on why anti-Tinder startups keep failing. 12 upvotes, 3 private follow-ups.",
    "community_signal_reddit_2|skip":
      "Took notes from the Reddit thread. Three failure modes to avoid.",
    "community_signal_reddit_3|engage":
      "Jumped into the Reddit thread as the founder. Thread stayed warm for two days. 7 signups.",
    "community_signal_reddit_3|watch":
      "Let the Reddit thread run on its own. 3 signups without lifting a finger.",
    "community_signal_slack_1|engage":
      "Posted an honest update on Indie Hackers. 5 people followed up with their own experiences.",
    "community_signal_slack_1|skip":
      "Skipped the Indie Hackers thread. Head down this week.",
    "community_signal_slack_2|engage":
      "Replied to the dating app post-mortem on Indie Hackers with what we're doing differently. The author DM'd me.",
    "community_signal_slack_2|skip":
      "Took notes from the IH post-mortem. Three failure modes to avoid.",
    "community_signal_slack_3|engage":
      "Started posting weekly updates on Indie Hackers. 6 new subscribers in 48 hours. Two founders reached out.",
    "community_signal_slack_3|skip":
      "Stayed quiet on Indie Hackers. The gap with other builders is widening.",
    "community_product_hn|engage":
      "Responded to every comment on the HN post about us. Thread stayed warm for 3 days. 5 signups.",
    "community_product_hn|watch":
      "Let the HN post run. Thread faded quickly. 1 signup.",
    "community_product_reddit|engage":
      "Thanked the Reddit poster publicly and privately. They became a power user and wrote a short review.",
    "community_product_reddit|watch":
      "Let the Reddit post ride. 2 more signups from the thread tail.",
    "community_product_slack|engage":
      "Answered pricing questions on the IH post honestly. 2 signups, 1 feature request worth exploring.",
    "community_product_slack|watch":
      "Let the IH post run. 1 signup.",

    "yc_discussion_ready|apply":
      "Committed to this YC batch. Deadline is next sprint — time to write the application.",
    "yc_discussion_ready|skip":
      "Decided to skip this YC batch. Next one opens in ~12 weeks.",
    "yc_discussion_early|apply":
      "Going for YC anyway — a long shot, but the partner feedback alone is worth it.",
    "yc_discussion_early|skip":
      "Waiting for the next YC batch. More time to hit the numbers.",
    "yc_apply|submit":
      "YC application submitted. Decision in 3 weeks.",

    // ── Lena ──────────────────────────────────────────────────────────────
    "reporter_deadline|reply":
      "Replied to Lena's deadline. Story ran the next morning.",

    // ── TechCrunch / Market ───────────────────────────────────────────────
    "competitor_launch|study":
      "Spent 2 weeks mapping Flare's product. They went broad — swiping, video dates, lots of noise. Our niche is the gap they skipped.",
    "competitor_launch|compare":
      "Published a direct comparison with Flare. Our niche is clearer now. Alex is rattled but focused.",
    "competitor_launch|copy":
      "Copied Flare's best features. Shipped fast — but we're building for their users now, not ours. Alex is frustrated.",
    "competitor_launch|ignore":
      "Ignored Flare's launch and stayed on our roadmap. Their noise is real but so is our plan.",
    "competitor_growing|calls":
      "Called 5 subscribers. Most still prefer our approach. Two want video dates — for a different reason than I assumed. Now I know what to build next.",
    "competitor_growing|discount":
      "Offered existing subscribers a discount to stay. Bought loyalty — not ideal, but stopped the bleeding.",
    "competitor_growing|ignore":
      "Kept building, ignored the Flare noise. Lost two subscribers. The remaining users are still with us — for now.",
    "investor_moat_question|niche":
      "Answered the moat question directly — explained the niche Flare ignored.",
    "investor_moat_question|speed":
      "Told the investor we're moving faster and closer to customers. Plausible but he wanted more.",
    "investor_moat_question|deflect":
      "Tried to pivot to traction instead of answering the Flare question. The investor noticed.",

    // ── Users ─────────────────────────────────────────────────────────────
    "bug_reports|fix":
      "Dropped everything and fixed the crash. Users notified. Goodwill recovered.",
    "churn_interview|call":
      "Called the churned subscriber. They left because Flare launched video dates — the one thing they'd been asking for. Now I know exactly what to build next.",
    "churn_interview|email":
      "Emailed the churned subscriber. One paragraph back. Less than a call, more than nothing.",
    "churn_interview|ignore":
      "Let the churned subscriber go. I'll never know why they left.",
    "feature_request_custom|build":
      "Built video dates for our power user. They doubled their plan — but it's really built around one person's workflow.",
    "feature_request_custom|decline":
      "Declined the video dates request. They churned. The clarity on what NOT to build was worth it.",
    "feature_request_custom|negotiate":
      "Proposed a 60-second video hello instead of full video calls. Low friction, easy to build. 5 other subscribers turned it on immediately.",
    "feature_cluster|build":
      "Built the feature three users independently asked for. All 3 loved it. Two immediately referred a friend.",
    "waitlist_cold|reach":
      "Reached out to the waitlist. Good feedback — people are still excited, want to know when we're launching.",

    // ── Analytics ─────────────────────────────────────────────────────────
    "silent_churn|call":
      "Called all 3 silent users. Found a critical onboarding gap. Fixed it. 2 came back.",

    // ── Twitter ───────────────────────────────────────────────────────────
    "public_complaint|respond":
      "Responded publicly to the Twitter complaint, fixed the duplicate match bug. The user deleted the tweet and posted an apology.",

    // ── Tom ───────────────────────────────────────────────────────────────
    "power_user_quiet|call":
      "Called Tom. He met someone on kindred 5 weeks ago — they've been on 7 dates. He forgot to cancel his subscription. He wrote a glowing review before hanging up. Best churn I've ever had.",

    // ── Founder remaining cards ───────────────────────────────────────────
    "founder_codebuild|pair":
      "Paired up with Alex this sprint. My contribution was modest but Alex shipped faster with me there.",
    "founder_codebuild|demos":
      "Ran 3 demos instead of pairing with Alex. 3 people signed up for early access.",
    "founder_build_onboarding|build":
      "Built the onboarding end-to-end myself. Took longer than expected — not my strongest skill — but it shipped.",
    "founder_build_onboarding|pass":
      "Handed the onboarding spec to Alex. He'll fit it in — but his queue just got longer.",
    "founder_build_empty_states|build":
      "Added helpful empty states to every screen. Small fix, big impact.",
    "founder_build_empty_states|pass":
      "Added empty states to the backlog. It'll stay there a while.",
    "founder_build_export|build":
      "Photo verification shipped. All four users who asked about it upgraded.",
    "founder_build_export|pass":
      "Asked Alex to prioritize photo verification. He'll ship it — but two weeks later, two of the four users had moved on.",
    "founder_build_demo_account|build":
      "Seeded the demo account with realistic profiles. Next investor call, they asked 'can I sign up?' instead of 'how does this work?'",
    "founder_build_demo_account|pass":
      "Kept winging investor demos. Lost two calls to confusion.",
    "founder_solo_launch|ship":
      "Launched solo. No fanfare. But it's live.",
    "founder_solo_launch|wait":
      "Polished a few things. Still not launched.",
    "founder_solo_build|build":
      "Two weeks of solo heads-down. Much slower without Alex — things that took a day take a week now.",
    "founder_solo_build|min":
      "Kept things barely moving. Not much progress but nothing broke.",
    "founder_solo_discover|calls":
      "Three calls done on my own. One person asked if they could pay now. Signal is still there.",
    "founder_solo_discover|survey":
      "Sent a survey instead of doing calls. Lower signal but saves time.",
    "founder_solo_growth|outreach":
      "Cold batch sent. 2 signups from people I messaged directly.",
    "founder_solo_growth|light":
      "Posted an update in one community. Small ripple. Keeps the light on.",
    "founder_user_depth|deep":
      "Five user sessions done. Found patterns I didn't expect.",
    "founder_user_depth|survey":
      "Sent a structured survey. 60% response rate. Useful signal, but nothing I didn't already suspect.",
    "first_customer_offer|reference":
      "Offered 3 months free for a testimonial. They said yes immediately. First reference customer locked in.",
    "first_customer_offer|pitch":
      "Pitched them at $49/month. They converted. First paying subscriber. Not much, but it's real.",
    "reference_checkin|call":
      "One hour call with the reference customer. They've been on two dates from kindred. Got a quote I can use anywhere.",
    "reference_checkin|email":
      "Asked the reference customer for a testimonial over email. Short paragraph back — honest and usable.",
    "website_social_proof|rebuild":
      "Rebuilt the website around the customer story. Hero section is now the customer quote. Conversion jumped immediately.",
    "founder_pricing_experiment|prompt":
      "Added an upgrade prompt. A few users complained about the nag — but some converted. Worth it.",
    "founder_pricing_experiment|cap":
      "Capped the free tier at 3 seats. More revenue, fewer free users.",
    "founder_pricing_experiment|hold":
      "Held off on pricing. Free users keep coming. The conversion problem isn't going anywhere.",
  };

  // Cards that need priority boosting because they're continuations of arcs the
  // player already engaged with, but weren't marked priority in the role files
  // (they didn't need it in the old pick-6 model where everything surfaced).
  const PRIORITY_BOOST = new Set([
    "jordan_equity_counter_alex",
    "jordan_equity_counter_jordan",
    "jordan_equity_counter_both",
    "jordan_ios_sprint",
    "jordan_confrontation",
    "jordan_cap_table",
    "jordan_launch_blocker",
    "fatima_meeting",
    "fatima_deck",
    "fatima_commit",
    "arch_refactor_done",
    "investor_ready",
  ]);

  // Milestones that get a rubber-stamp on the journal page when they first flip.
  const STAMPS = [
    { key: "building",     cls: "green", label: "We're Building",  test: (s, c) => !!(c.alex.flags.prototype_kicked) },
    { key: "incorporated", cls: "blue",  label: "Incorporated",    test: (s) => !!s.incorporated },
    { key: "equity",       cls: "red",   label: "Equity Signed",   test: (s) => !!s.jordan_equity },
    { key: "demo",         cls: "green", label: "First Demo",      test: (s) => !!s.has_demo },
    { key: "beta",         cls: "green", label: "Beta Live",       test: (s) => !!s.has_beta },
    { key: "launched",     cls: "green", label: "Launched",        test: (s) => !!s.launched },
    { key: "firstcust",    cls: "blue",  label: "First Customer",  test: (s) => s.customers >= 1 },
    { key: "marcus",       cls: "blue",  label: "Lead Investor",   test: (s) => !!s.marcusCommitted },
    { key: "funded",       cls: "red",   label: "Round Closed",    test: (s) => !!s.followerCommitted },
    { key: "yc",           cls: "red",   label: "YC Accepted",     test: (s) => !!s.ycAccepted },
  ];

  class ChatEngine {
    constructor() {
      // Mirrors the initial-state shape of the legacy engine so every slice
      // card finds the field it reads. Unused fields are harmless.
      this.s = {
        cash: 10000, week: 1, product: 0, waitlist: 0, users: 0, customers: 0, revenue: 0,
        signal: 28, market_fit: 0, launched: false, deck_ready: false,
        productPhase: "proto",
        has_demo: false, has_beta: false, tech_debt: 0,
        investor_warmth: 0,
        incorporated: false, ip_clear: false,
        has_landing_page: false,
        marcusCommitted: false, followerCommitted: false,
        game_over: false, game_won: false,
        network: { peers: 12, advisors: 0, angels: 0, press: 0 },
        items: null,
        dev_plan: null,
      };

      this.chars = new Map([
        ["alex",         { archetypeId: "alex",         active: true, morale: 80, trust: 90, focus: "build", focusSprints: 0, buildEffort: 0, flags: {} }],
        ["jordan",       { archetypeId: "jordan",       active: true, morale: 80, trust: 90, focus: "build", focusSprints: 0, buildEffort: 0, flags: {} }],
        ["priya",        { archetypeId: "priya",        active: false, engagement: 80, flags: {} }],
        ["marcus",       { archetypeId: "marcus",       active: false, engagement: 50, flags: {} }],
        ["fatima",       { archetypeId: "fatima",       active: false, flags: {} }],
        ["ryan",         { archetypeId: "ryan",         active: false, flags: {} }],
        ["sarah",        { archetypeId: "sarah",        active: false, engagement: 60, flags: {} }],
        ["brett",        { archetypeId: "brett",         active: false, flags: {} }],
        ["kevin",        { archetypeId: "kevin",        active: false, flags: {} }],
        ["mom",          { archetypeId: "mom",          active: true,  flags: {} }],
        ["jamie",        { archetypeId: "jamie",        active: false, flags: {} }],
        ["david",        { archetypeId: "david",        active: false, flags: {} }],
        ["hacker_news",  { archetypeId: "hacker_news",  active: true,  flags: {} }],
        ["yc",           { archetypeId: "yc",           active: false, flags: {} }],
        ["lena",         { archetypeId: "lena",         active: false, flags: {} }],
        ["techcrunch",   { archetypeId: "techcrunch",   active: false, flags: {} }],
        ["users",        { archetypeId: "users",        active: false, flags: {} }],
        ["analytics",    { archetypeId: "analytics",    active: false, flags: {} }],
        ["twitter",      { archetypeId: "twitter",      active: false, flags: {} }],
        ["tom",          { archetypeId: "tom",          active: false, flags: {} }],
        ["founder",      { archetypeId: "founder",      active: true,  flags: {} }],
      ]);

      this.order = [
        "alex", "jordan", "priya", "marcus", "fatima", "ryan", "sarah",
        "brett", "kevin", "mom", "jamie", "david",
        "hacker_news", "yc", "lena", "techcrunch",
        "users", "analytics", "twitter", "tom",
        "founder", // always last
      ];

      // threads[charId] = ordered list of message entries shown in that chat.
      this.threads = {};
      for (const id of this.order) this.threads[id] = [];

      // surfaced.get(cardId) = { def, charId, week } for currently-open prompts.
      this.surfaced = new Map();

      this.ycWeek = 10 + Math.floor(Math.random() * 8);
      this.alexDepartureRisk = false;
      this.pending = [];
      this.history = [];
      this.actionsLeft = 2;
      this.act1Complete = false;
      this.firedStamps = new Set();  // milestone stamps already placed
      this.log = [];       // flat event log (debugging / node tests)

      // Open the game: surface week-1 messages without consuming a tick.
      this._surface();
    }

    // ── lookups ───────────────────────────────────────────────────────────────
    _cardDef(charId, cardId) {
      const def = DEFS[charId];
      if (!def) return null;
      return def.cards.find(c => c.id === cardId) || null;
    }
    _sliceCards(charId) {
      const ids = SLICE[charId] || [];
      return ids.map(id => this._cardDef(charId, id)).filter(Boolean);
    }
    _resolveBody(def, char) {
      return (typeof def.body === "function") ? def.body(this.s, char, this) : def.body;
    }
    _hasOpenFor(charId) {
      for (const e of this.surfaced.values()) if (e.charId === charId) return true;
      return false;
    }

    // ── weekly surfacing ───────────────────────────────────────────────────────
    _surface() {
      // 1) unlock any inactive characters whose condition now passes
      for (const [id, char] of this.chars) {
        if (!char.active) {
          const def = DEFS[id];
          if (def && def.unlockCondition && def.unlockCondition(this.s, this)) {
            char.active = true;
            if (INTROS[id]) {
              this.threads[id].push({
                type: "incoming", from: META[id].name,
                body: INTROS[id], week: this.s.week, isNew: true,
              });
            }
          }
        }
      }

      // 2) drop any open prompt whose moment has passed (predicate now false)
      for (const [cardId, entry] of [...this.surfaced]) {
        const char = this.chars.get(entry.charId);
        if (!entry.def.available(this.s, char, this)) {
          this._dropCard(cardId, entry);
        }
      }

      // 3) surface the top available card for each character with no open prompt
      for (const charId of this.order) {
        const char = this.chars.get(charId);
        if (!char || !char.active) continue;
        if (this._hasOpenFor(charId)) continue;

        const available = this._sliceCards(charId)
          .filter(def => def.available(this.s, char, this));
        if (available.length === 0) continue;

        const nonFallback = available.filter(def => !def.fallback);
        const pool = nonFallback.length ? nonFallback : available;
        pool.sort((a, b) => {
          const ap = PRIORITY_BOOST.has(a.id) ? 2 : a.priority ? 1 : 0;
          const bp = PRIORITY_BOOST.has(b.id) ? 2 : b.priority ? 1 : 0;
          if (ap !== bp) return bp - ap;
          return (this._urgency(b) || 0) - (this._urgency(a) || 0);
        });
        const top = pool[0];
        if (this.surfaced.has(top.id)) continue;

        this.surfaced.set(top.id, { def: top, charId, week: this.s.week });
        this.threads[charId].push({
          type: "incoming",
          cardId: top.id,
          from: top.from || META[charId].name,
          body: this._resolveBody(top, char),
          subtext: top.subtext || null,
          week: this.s.week,
          isNew: true,
        });
        this.log.push({ week: this.s.week, charId, surfaced: top.id });
      }
    }

    _urgency(def) {
      return (typeof def.urgency === "function") ? def.urgency(this.s, this.chars.get("alex")) : def.urgency;
    }

    _dropCard(cardId, entry) {
      const char = this.chars.get(entry.charId);
      if (entry.def.dropFx) {
        try { entry.def.dropFx(this.s, char, this); } catch (_) { /* slice-tolerant */ }
      }
      if (entry.def.dropMsg) {
        this.threads[entry.charId].push({
          type: "incoming",
          cardId,
          from: entry.def.dropFrom || META[entry.charId].name,
          body: entry.def.dropMsg,
          subtext: null,
          week: this.s.week,
          isNew: true,
          dropped: true,
        });
      }
      this.surfaced.delete(cardId);
      this.log.push({ week: this.s.week, charId: entry.charId, dropped: cardId });
    }

    // ── player action ───────────────────────────────────────────────────────────
    options(cardId) {
      const entry = this.surfaced.get(cardId);
      if (!entry) return [];
      const char = this.chars.get(entry.charId);
      return (entry.def.options || [])
        .filter(o => !o.available || o.available(this.s, char, this))
        .map(o => ({ key: o.key, label: o.label }));
    }

    /** Answer a surfaced prompt. Returns the outcome text (or null). */
    act(cardId, optionKey) {
      const entry = this.surfaced.get(cardId);
      if (!entry) return null;
      if (this.actionsLeft <= 0) return null;

      const char = this.chars.get(entry.charId);
      const opts = entry.def.options || [];
      const opt = opts.find(o => o.key === optionKey) || opts[0];
      if (!opt) return null;

      const outcome = opt.execute(this.s, char, this);

      this.threads[entry.charId].push({
        type: "reply",
        cardId,
        body: opt.reply || opt.label,
        week: this.s.week,
        isNew: true,
      });
      if (outcome) {
        // Outcomes are narrated in the founder's journal, not the chat thread.
        // The chat stays pure dialogue; the journal is where the story is told,
        // retold in the founder's own first-person voice where we have one.
        this.threads.founder.push({
          type: "outcome",
          cardId,
          from: META[entry.charId] ? META[entry.charId].name : null,
          sourceChar: entry.charId === "founder" ? null : entry.charId,
          body: this._voiced(cardId, opt.key, outcome),
          week: this.s.week,
          isNew: true,
        });
      }

      this.surfaced.delete(cardId);
      this.history.push({ week: this.s.week, chosen: [cardId] });
      this.actionsLeft--;
      this.log.push({ week: this.s.week, charId: entry.charId, acted: cardId, option: opt.key });

      // milestone: equity locked in
      if (this.s.jordan_equity && !this.act1Complete) {
        this.act1Complete = true;
      }

      // Surface any follow-ups that just became available for OTHER characters
      // (e.g. answering Jordan's equity mention unlocks Alex's proposal).
      // The same character never gets a new message mid-week — that would feel
      // like an instant double-text. They wait for the next week.
      this._surfaceFollowups(entry.charId);

      this._checkStamps();

      return outcome;
    }

    _voiced(cardId, optKey, fallback) {
      return VOICE[cardId + "|" + optKey] || VOICE[cardId] || fallback;
    }

    // Place a rubber-stamp in the journal for any milestone that just flipped.
    _checkStamps() {
      const ctx = {};
      for (const [id, ch] of this.chars) ctx[id] = ch;
      for (const st of STAMPS) {
        if (this.firedStamps.has(st.key)) continue;
        if (st.test(this.s, ctx)) {
          this.firedStamps.add(st.key);
          this.threads.founder.push({
            type: "stamp", stampKey: st.key, label: st.label, stampClass: st.cls,
            week: this.s.week, isNew: true,
          });
        }
      }
    }

    // After an action, reveal any newly-available follow-ups for characters that
    // no longer have an open prompt — without advancing the week. Skip the
    // character the player just talked to: same-person follow-ups wait for the
    // next week so they don't feel like an instant double-text.
    _surfaceFollowups(skipCharId) {
      for (const charId of this.order) {
        if (charId === skipCharId) continue;
        const char = this.chars.get(charId);
        if (!char || !char.active || this._hasOpenFor(charId)) continue;
        const available = this._sliceCards(charId).filter(def => def.available(this.s, char, this));
        const nonFallback = available.filter(def => !def.fallback);
        const pool = nonFallback.length ? nonFallback : available;
        if (!pool.length) continue;
        pool.sort((a, b) => {
          const ap = PRIORITY_BOOST.has(a.id) ? 2 : a.priority ? 1 : 0;
          const bp = PRIORITY_BOOST.has(b.id) ? 2 : b.priority ? 1 : 0;
          if (ap !== bp) return bp - ap;
          return (this._urgency(b) || 0) - (this._urgency(a) || 0);
        });
        const top = pool[0];
        if (this.surfaced.has(top.id)) continue;
        this.surfaced.set(top.id, { def: top, charId, week: this.s.week });
        this.threads[charId].push({
          type: "incoming",
          cardId: top.id,
          from: top.from || META[charId].name,
          body: this._resolveBody(top, char),
          subtext: top.subtext || null,
          week: this.s.week,
          isNew: true,
        });
      }
    }

    // ── advance to next week ─────────────────────────────────────────────────────
    nextWeek() {
      // burn + clock
      this.s.cash = Math.max(0, this.s.cash - this.burnPerWeek);
      this.s.week += 1;
      this.actionsLeft = 2;

      // fire any due delayed consequences
      const due = this.pending.filter(p => p.fireWeek <= this.s.week);
      this.pending = this.pending.filter(p => p.fireWeek > this.s.week);
      for (const p of due) {
        const char = p.charId ? this.chars.get(p.charId) : null;
        if (char && !char.active) continue;
        if (p.cancel && p.cancel(this.s, char)) continue;
        if (p.condition && !p.condition(this.s, char)) continue;
        if (p.fx) p.fx(this.s, char, this);
        if (p.text) {
          const tid = this.threads[p.charId] ? p.charId : "founder";
          this.threads[tid].push({
            type: "incoming", from: p.from || "System", body: p.text,
            week: this.s.week, isNew: true,
          });
        }
      }

      // Passive co-founder contributions (mirrors engine.js resolveTurn)
      for (const [id, char] of this.chars) {
        if (!char.active || !char.focus) continue;
        const def = DEFS[id];
        if (!def || def.type !== "cofounder") continue;
        const skill = (def.skills || {})[char.focus] || 1.0;
        const sideProjectMult = char.flags.side_project_active ? 0.7 : 1.0;
        const trustFactor = "trust" in char ? char.trust / 100 : 1.0;
        const base = 1.2 * skill * sideProjectMult * trustFactor;
        const ptMult = id === "alex" ? (char.flags.committed_fulltime ? 1.0 : 0.5) : 1.0;
        if (char.focus === "build") {
          char.buildEffort = (char.buildEffort || 0) + base * ptMult;
        } else if (char.focus === "discover") {
          this.s.signal = Math.min(100, this.s.signal + base * 1.5);
          this.s.market_fit = Math.min(100, this.s.market_fit + base);
        } else if (char.focus === "pitch") {
          this.s.investor_warmth = Math.min(100, this.s.investor_warmth + base * 2);
        }
        char.focusSprints = (char.focusSprints || 0) + 1;
      }

      // Launch day: convert waitlist to users
      if (this.s.launched && this.s.waitlist > 0 && !this._launchConverted) {
        this._launchConverted = true;
        const converted = Math.max(1, Math.round(this.s.waitlist * (0.25 + Math.random() * 0.15)));
        this.s.users += converted;
        this.s.waitlist = 0;
      }

      // Organic signups at high signal
      if (this.s.launched && this.s.signal >= 70)
        this.s.users += Math.floor((this.s.signal - 70) / 30) + 1;

      // Free-to-paid conversion
      if (this.s.launched && this.s.users > 0) {
        const baseRate = this.s.market_fit < 30 ? 0.005 : this.s.market_fit < 50 ? 0.01 : this.s.market_fit < 70 ? 0.02 : 0.03;
        const rate = baseRate * (this.s.website_updated ? 1.3 : 1.0);
        const raw = this.s.users * rate;
        const converted = Math.floor(raw) + (Math.random() < (raw % 1) ? 1 : 0);
        if (converted > 0) { this.s.users = Math.max(0, this.s.users - converted); this.s.customers += converted; }
      }

      // B2B revenue
      this.s.revenue = this.s.customers * 50;

      // Win conditions
      if (!this.s.game_won) {
        if (this.s.ycAccepted) this.s.game_won = true;
        if (this.s.marcusCommitted && this.s.followerCommitted) this.s.game_won = true;
      }

      if (this.s.cash <= 0) this.s.game_over = true;

      this._surface();
      this._checkStamps();
    }

    get burnPerWeek() { return 500; }
    get runwayWeeks() { return Math.floor(this.s.cash / this.burnPerWeek); }

    // ── view helpers for the UI ───────────────────────────────────────────────────
    conversations() {
      return this.order
        .filter(id => this.chars.get(id) && this.chars.get(id).active)
        .map(id => {
          const thread = this.threads[id];
          const last = thread.length ? thread[thread.length - 1] : null;
          return {
            id,
            name: META[id].name,
            initials: META[id].initials,
            color: META[id].color,
            role: META[id].role,
            isJournal: id === "founder",
            preview: last ? this._preview(last) : "",
            hasAction: this._hasOpenFor(id),
            actionCardId: this._openCardId(id),
            empty: thread.length === 0,
          };
        });
    }
    _openCardId(charId) {
      for (const [cardId, e] of this.surfaced) if (e.charId === charId) return cardId;
      return null;
    }
    _preview(entry) {
      const b = (entry.body || "").replace(/\s+/g, " ").trim();
      const tag = entry.type === "reply" ? "You: " : entry.type === "outcome" ? "" : "";
      return (tag + b).slice(0, 64);
    }

    // snapshot of headline numbers for the status bar
    stats() {
      return {
        week: this.s.week,
        cash: this.s.cash,
        runway: this.runwayWeeks,
        actionsLeft: this.actionsLeft,
        signal: Math.round(this.s.signal),
        marketFit: Math.round(this.s.market_fit),
        incorporated: this.s.incorporated,
        equity: this.chars.get("jordan").flags.equity_proposal || null,
        equitySigned: !!this.s.jordan_equity,
        act1Complete: this.act1Complete,
        gameOver: this.s.game_over,
      };
    }
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { ChatEngine, SLICE, META };
  } else {
    window.ChatEngine = ChatEngine;
    window.CHAT_META = META;
  }
})();
