// ─────────────────────────────────────────────────────────────────────────────
// v2/story/team.js — the co-founder relationship spine riding the dev clock:
// Alex's part-time confession, the vision alignment fight, and the standing
// build-vs-discover trade.
//
// The commitment card is the effortMult lesson (see v2/cast.js): accepting
// part-time keeps Alex's grants at 0.6× and passive accrual at 0.4×, which is
// what actually delays the demo. Pushing him full-time buys speed at a morale
// and trust cost. Ignoring it entirely gets him a competing offer.
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const mod = {
    nodes: [
      {
        id: "alex_commitment", char: "alex",
        text: "i can't quit my job until we have real traction. evenings and weekends for now. should be enough to get to launch, right?",
        // The quit-my-job talk lands right as the sprint cadence starts making
        // his evenings-and-weekends pace visible.
        when: { after: ["dev_plan"], if: (s, e) => e.weeksSince("dev_plan") <= 3 },
        choices: [
          {
            key: "accept", label: "Agree — part-time for now",
            reply: "that's fair. evenings and weekends works for now. let's set a milestone to revisit — once we hit traction, we talk again.",
            journal: "Agreed Alex stays part-time for now — evenings and weekends. Slower, but he won't resent it. We set a milestone to revisit once we have traction.",
            effects: { signal: -5 },
            fx: () => "Alex stays part-time for now. Slower, but stable. Set a clear milestone to revisit.",
          },
          {
            key: "push", label: "Push for full-time",
            reply: "i hear you but i need you all in. evenings and weekends won't cut it — we'll get outrun. can you make the jump now?",
            journal: "Pushed Alex to go full-time. He said yes, but I could tell he wasn't ready. I'll need to watch how he's doing.",
            effects: { char: { alex: { morale: -10, trust: -10, flags: { committed_fulltime: true } } } },
            fx: () => "Alex agreed to go full-time. He said yes, but you could tell he wasn't ready. Watch his mood.",
          },
        ],
        // Left hanging, he takes a recruiter's call.
        timeout: {
          weeks: 3,
          unless: (s, e, char) => !!char.flags.committed_fulltime,
          effects: { char: { alex: { morale: -14, flags: { offer_msg_sent: true } } } },
          say: { char: "alex", text: "got a really good offer from a startup. i need to decide by friday. can we talk about where this is actually going?" },
        },
      },
      {
        id: "vision_mismatch", char: "alex",
        text: "i keep pitching this as 'casual dating done right.' you've been calling it 'serious relationships.' those are different products with different users. which are we actually building?",
        // Only exists once the commitment talk was actually had — a decision
        // you dodged doesn't spawn follow-up alignment fights (old behavior).
        when: {
          took: ["alex_commitment:accept|push"],
          if: (s, e) => !s.has_demo && e.weeksSince("dev_plan") >= 2 && e.weeksSince("dev_plan") <= 8,
        },
        choices: [
          {
            key: "alex", label: "Go with casual dating",
            reply: "you're right, casual is the bigger market. let's go with your framing — 'casual dating done right.'",
            journal: "Conceded the framing to Alex — we're 'casual dating done right.' Broader market, easier to explain. A few old 'serious matches' conversations are awkward now, but at least we're aligned.",
            effects: { signal: -4, char: { alex: { trust: 8, morale: 10 } } },
            fx: () => "Went with casual dating. Broader market, easier to explain. Some earlier conversations about 'serious matches' are now awkward, but at least you're aligned.",
          },
          {
            key: "yours", label: "Serious relationships",
            reply: "i've been saying serious relationships because that's what we're building. the investor story is cleaner and the users pay more. i want to stay with that.",
            journal: "Held the line on serious relationships. Alex went along with it — he still thinks casual is bigger, but the investor story is cleaner. The tension isn't really gone.",
            effects: { signal: 8, char: { alex: { morale: -8, trust: -4 } } },
            fx: () => "Alex went along with it. He thinks the casual market is bigger, but the investor story is cleaner. Tension unresolved.",
          },
          {
            key: "test", label: "Test it with users",
            reply: "we're both guessing. let me run a quick test this week — 8 calls with real users. let's find out which framing actually resonates before we commit.",
            journal: "Instead of arguing, I ran eight quick user calls. People who want serious relationships hate swiping apps, and vice versa — two real segments. We're leading with the relationship-seekers: they pay more and churn less.",
            effects: { signal: 14, marketFit: 8, char: { alex: { morale: 5, trust: 6 } } },
            fx: () => "Ran 8 quick calls. People who tried serious relationship apps hate swiping apps and vice versa — two real segments. Decided to lead with the relationship-seekers: they pay more and churn less.",
          },
        ],
        timeout: {
          weeks: 3,
          effects: { signal: -10, char: { alex: { morale: -10 } } },
          say: { char: "alex", text: "pitched it as a casual app again. someone in the audience asked me directly which it is. i didn't have a good answer. investors are going to notice." },
        },
      },

      // ── the standing build-vs-discover trade ─────────────────────────────────
      {
        id: "alex_sync_discover", char: "alex", ambient: true,
        text: (s, e, char) => {
          if (!e.done("alex_sync_discover"))
            return "offer: i can take this sprint for user calls instead of code. the build slips a week — that's real. but we've been heads-down since the plan and honestly? it's starting to feel like we're building confidently in the dark.";
          const weeksAgo = e.weeksSince("alex_sync_discover");
          return weeksAgo >= 12
            ? "it's been " + weeksAgo + " weeks since we last did discovery. things shift — worth a sprint to check if we're still solving the right problem?"
            : "we're back in build mode. it's only been a few weeks since we last talked to customers, but the queue keeps growing. do another round or keep building?";
        },
        when: {
          after: ["dev_plan"], delay: 1, cooldown: 4,
          if: (s, e, char) => !s.launched && char.focus === "build" && s.market_fit < 80,
        },
        choices: [
          {
            key: "discover", label: "Yes — take the sprint for user calls",
            effects: { char: { alex: { focus: "discover" } } },
            fx: () => "Agreed. Alex is on user calls this sprint — the build slows while he listens.",
          },
        ],
      },
      {
        id: "alex_sync_build", char: "alex", ambient: true,
        text: "i think we have enough customer feedback to act on for now. ready to get back to building?",
        when: {
          cooldown: 2,
          if: (s, e, char) => char.focus === "discover" && e.weeksSince("alex_sync_discover") >= 2,
        },
        choices: [
          {
            key: "build", label: "Yes — back to building",
            effects: { char: { alex: { focus: "build" } } },
            fx: () => "Agreed. Alex back to building.",
          },
        ],
      },

      // ── RELATIONSHIP TEXTURE ─────────────────────────────────────────────────
      {
        id: "alex_side_project", char: "alex",
        text: "full disclosure — i've been putting 3 hours a day into a side project. didn't mention it earlier and i should have. i wanted you to hear it from me before it became a problem.",
        when: { if: (s, e, char) => s.week >= 3 && s.week <= 14 && char.morale > 50 && !char.flags.committed_fulltime },
        choices: [
          {
            key: "pause", label: "Ask him to pause it",
            reply: "appreciate you telling me. can you pause it until we hit our first real milestone? i need to know you're fully here for this stretch.",
            effects: { char: { alex: { morale: 5, trust: 5 } } },
            fx: () => "Honest conversation. Alex drops the side project until you hit a milestone. Relationship stronger for it.",
          },
        ],
        // Ignored: he keeps going, quietly — the passive build rate takes the hit.
        timeout: {
          weeks: 3,
          effects: { char: { alex: { morale: -20, trust: -10, flags: { side_project_active: true } } } },
        },
      },
      {
        id: "alex_side_project_escalation", char: "alex",
        text: "i know we talked about this, but i've been putting more in — probably 15 hours a week. i need to be honest about where my head is at.",
        when: { if: (s, e, char) => !!char.flags.side_project_active && s.week <= 26 },
        choices: [
          {
            key: "talk", label: "Tell him to commit",
            reply: "alex, i need to be direct. 15 hours a week on something else means you're not here. i need you fully in or we need to have a different conversation.",
            effects: { char: { alex: { morale: 22, trust: 10, flags: { side_project_active: false } } } },
            fx: () => "Hard conversation. Alex commits fully. He was relieved you brought it up directly.",
          },
        ],
        timeout: {
          weeks: 3,
          effects: {
            char: { alex: { morale: -30, trust: -25, flags: { side_project_active: false } } },
            schedule: {
              in: 3, char: "alex",
              unless: (s, e) => !e.cast.get("alex").active,
              say: { char: "alex", text: "i've decided to pursue it seriously. i'll keep helping part-time but i think we both know i'm not fully in anymore." },
            },
          },
        },
      },
      {
        id: "alex_quiet", char: "alex",
        text: "yeah. fine. just busy.",
        subtext: "Short replies for 3 days. Skipped standup yesterday.",
        when: { cooldown: 4, if: (s, e, char) => s.week > 4 && char.morale < 40 },
        choices: [
          {
            key: "checkin", label: "Check in",
            reply: "hey — noticed you've been quiet. everything ok? no pressure, just checking in.",
            journal: "Noticed Alex had gone quiet. Checked in. Honest conversation — he's exhausted. Adjusted expectations for the week.",
            effects: { char: { alex: { morale: 20 } } },
            fx: () => "Had an honest conversation. Alex is exhausted. Adjusted expectations for the week.",
          },
        ],
        timeout: {
          weeks: 2,
          effects: {
            char: { alex: { morale: -14, trust: -6 } },
            schedule: {
              in: 2, char: "alex",
              unless: (s, e) => e.cast.get("alex").morale >= 40,
              say: { char: "alex", text: "i need some space. working from home this week to figure some things out." },
            },
          },
        },
      },
      {
        id: "alex_equity_regret", char: "alex",
        text: "third time this month. 'i'm not sure the current split reflects what i'm actually contributing.' getting harder to deflect.",
        when: { if: (s, e, char) => s.week >= 16 && char.morale < 55 },
        choices: [
          {
            key: "fair", label: "Revise fairly",
            reply: "you're right, and i'd rather fix this than keep deflecting it. let's revise the split so it matches what you're actually carrying.",
            journal: "Revised the equity split. Both sides signed. Relationship's back on solid ground.",
            effects: { char: { alex: { morale: 30, trust: 15 } } },
            fx: () => "Revised the split. Both sides signed. Relationship back on solid ground.",
          },
          {
            key: "hard", label: "Bargain hard",
            effects: { char: { alex: { morale: 8 } } },
            fx: () => "Pushed back hard. Alex accepted for now but isn't happy — expect this again.",
          },
          {
            key: "defer", label: "Defer it",
            effects: { char: { alex: { morale: -8, trust: -5 } } },
            fx: () => "Kicked the can. Alex grudgingly agreed to wait, but this is coming back.",
          },
        ],
        timeout: {
          weeks: 2,
          effects: { char: { alex: { morale: -18, trust: -12 } } },
          say: { char: "alex", text: "i've been talking to a lawyer. i want to revisit the founder agreement formally. this isn't going away." },
        },
      },
      {
        id: "family_doubt", char: "alex", ambient: true,
        text: "my parents asked again when i'm getting a real job. yours too? i keep explaining but they don't really get it. tbh it's getting in my head.",
        when: { if: (s, e, char) => s.week >= 2 && s.week <= 18 && char.morale < 50 },
        choices: [
          {
            key: "talk", label: "Remind each other why",
            reply: "mine too, constantly. listen — we're building the thing we both wished existed when we were the ones swiping. that's still true. don't let them in your head.",
            journal: "Long talk with Alex about family pressure. Reminded each other why we're doing this. Morale reset.",
            effects: { char: { alex: { morale: 12 } } },
            fx: () => "Long talk. Reminded each other why you're doing this. Morale reset.",
          },
        ],
        timeout: { weeks: 3 },
      },

      // ── EARLY FLAVOR DEBATES (low stakes, fill the quiet weeks) ──────────────
      {
        id: "early_name", char: "alex", ambient: true,
        text: "we need to stop calling this 'the project.' found three good domains: one sounds romantic, one sounds clean and abstract, one is a made-up word. pick one.",
        when: { if: (s) => s.week >= 2 && s.week <= 6 && s.incorporated },
        choices: [
          { key: "catchy", label: "The romantic one", effects: { signal: 4 },
            fx: () => "Name locked. Memorable, a little warm in exactly the right way. People immediately know what it's for." },
          { key: "descriptive", label: "The clean, abstract one", effects: { marketFit: 2 },
            fx: () => "Name locked. Distinctive, hard to confuse with anything else. Grows on people once they try it." },
        ],
        timeout: { weeks: 3 },
      },
      {
        id: "early_customer_target", char: "alex", ambient: true,
        text: "we keep switching who we're talking to — sometimes we pitch to young singles, sometimes to divorced 30-somethings. we should agree before it gets confusing.",
        when: { after: ["dev_plan"], if: (s) => s.week <= 9 },
        choices: [
          { key: "individuals", label: "Young singles — bigger market, easier to reach", effects: { marketFit: 4 },
            fx: () => "Locked in: 25-35 year olds tired of swiping. Bigger pool, faster feedback." },
          { key: "teams", label: "Relationship-seekers — that's where the revenue is", effects: { marketFit: 3 },
            fx: () => "Going after people who are seriously looking. Higher willingness to pay, stronger retention story." },
          { key: "open", label: "Follow the early users",
            fx: () => "Staying flexible. Let the first signups tell you who they are." },
        ],
        timeout: { weeks: 3 },
      },
      {
        id: "early_funding_goal", char: "alex", ambient: true,
        text: "been sitting on this: dating apps go one of three ways — VC-backed and scale fast (Hinge, Bumble), get acquired by Match Group, or build a quiet profitable subscription business. which are we aiming for? changes everything about how we make decisions.",
        when: { if: (s) => s.week >= 3 && s.week <= 9 },
        choices: [
          { key: "vc", label: "VC route — raise, grow fast, aim for IPO or acquisition", effects: { signal: 3 },
            fx: () => "Aligned on the VC path. Every conversation with investors gets sharper when you know what you're building toward." },
          { key: "profitable", label: "Profitable first — build a real business, no VC needed", effects: { marketFit: 3 },
            fx: () => "Profitable first. Every product decision gets cleaner when the bar is 'do people pay for this', not 'can we raise on this'." },
          { key: "open", label: "Stay flexible — let traction tell us",
            fx: () => "Staying flexible. Revisit when you have enough users to know what kind of company you actually are." },
        ],
        timeout: { weeks: 3 },
      },

      // ── COMMITMENTS & ARCHITECTURE (post-launch texture) ─────────────────────
      {
        // Ambient: post-launch texture — it must not out-rank the endgame's
        // designed beats (the Jordan arc, the Maya bookend) for Alex's slot.
        id: "alex_decision", char: "alex", from: "Customer", ambient: true,
        text: "alex told me you'd add photo verification by end of week. it's wednesday. there's nothing about this in the roadmap.",
        when: { if: (s) => s.launched && s.customers > 1 },
        choices: [
          {
            key: "ship", label: "Ship photo verification by Friday",
            effects: { customers: 1, char: { alex: { morale: 5 } } },
            fx: () => "Pulled it off. User upgraded immediately. Set clear boundaries with Alex about making commitments without checking first.",
          },
        ],
        timeout: {
          weeks: 2,
          effects: {
            signal: -10, customers: -1,
            schedule: { in: 1, char: "alex", say: { from: "User", text: "it's monday. still nothing. i'm going to try flare instead." } },
          },
        },
      },
      // (The pre-launch architecture-refactor detour — alex_wants_rebuild /
      // arch_refactor_done — was retired in the horizon pass: it double-taught
      // proto_to_product's ship-vs-polish lesson and serialized Alex's thread
      // for ~2 extra weeks on the road to launch.)

      // ── THE DEPARTURE THREAT (neglect has a face) ────────────────────────────
      {
        id: "alex_leaving_threat", char: "alex",
        text: "got a message from an old colleague at a well-funded startup. not going anywhere — but we need an honest conversation about where this is headed.",
        // Fires from the Jordan-fire fallout without signed equity, cratered
        // relationship stats, or sustained neglect: three of his messages
        // ignored within a rolling 10-week window.
        when: {
          if: (s, e, char) => {
            if (!char.active || char.flags.departure_resolved) return false;
            if (s.alex_departure_risk || char.trust < 15 || char.morale < 10) return true;
            const recentIgnores = e.log.filter(
              l => l.charId === "alex" && l.ignored && l.week >= s.week - 10).length;
            return recentIgnores >= 3;
          },
        },
        choices: [
          {
            key: "talk", label: "Have the honest conversation",
            effects: { flags: { alex_departure_risk: false }, char: { alex: { trust: 20, morale: 15, flags: { departure_resolved: true } } } },
            fx: () => "Long, honest conversation. Alex is staying. Things need to improve — but you're aligned now.",
          },
        ],
        timeout: {
          weeks: 2,
          fx(s, e) {
            const alex = e.cast.get("alex");
            alex.active = false;
            s.alex_departure_risk = false;
          },
          say: { char: "alex", text: "i've decided to take the other opportunity. i'm sorry — i'll do a proper handoff this week." },
        },
      },
    ],
  };

  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else (window.V2STORY = window.V2STORY || []).push(mod);
})();
