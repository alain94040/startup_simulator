(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'priya', name: 'Priya (advisor)', type: 'advisor',
    unlockCondition: (s) => s.met_priya === true && s.week >= s.met_priya_week + 2,
    cards: [
      {
        id: 'mentor_competitor_bomb', cat: 'c', from: 'Priya (advisor)',
        body: "looked at your idea over the weekend. you should know: there are at least 8 serious relationship apps in the app store right now — two well-funded. one is YC-backed from last year. you need a sharper answer to 'why kindred.'",
        urgency: 3, weeks: 1,
        available: (s, char) => s.week <= 10 && s.signal < 60 && !char.flags.competitor_resolved,
        options: [
          { label: 'Do a competitive deep-dive', key: 'research',
            execute(s, char) { char.flags.competitor_resolved = true; s.signal = clamp(s.signal + 8, 0, 100); s.market_fit = clamp(s.market_fit + 6, 0, 100); s.network.advisors++; return "Did a full competitive analysis. None of them solve it for your niche. That's your wedge. Priya is now a real advisor."; } },
        ],
        dropDelay: 2, dropFrom: 'Priya',
        dropMsg: "any progress on differentiating from the competition? investors will definitely ask.",
        dropFx(s, char) { s.signal = clamp(s.signal - 8, 0, 100); s.investor_warmth = clamp(s.investor_warmth - 8, 0, 100); },
      },

      // ── PIVOT DISCUSSION (card 3 of 3: Priya weighs in when met_priya) ────────
      {
        id: 'pivot_priya_verdict', cat: 'p', from: 'Priya (advisor)',
        body: (s) => s.pivot_direction_game === "pivot"
          ? "you're making the right call. alex will come around — founders always think the thing they built is the product. the users are telling you otherwise."
          : "i've watched consumer startups ignore early retention signals and spend six months fixing it post-launch. alex built something technically excellent — that's not in question. the question is what users do with a match. 'nowhere to go' is a retention failure, not a feature request. you have time to fix this now. you won't after.",
        urgency: 2, weeks: 1,
        available: (s) => s.pivot_direction_game != null && !s.pivot_resolved_flag
          && s.met_priya && s.week <= 22,
        options: [
          { label: "Priya's right — we pivot", key: "pivot",
            execute(s, char, e) {
              s.pivot_resolved_flag = true;
              s.activities_pivot = true;
              s.cash = clamp(s.cash - 2000, 0, 9999999);
              s.market_fit = clamp(s.market_fit + 15, 0, 100);
              const alex = e.chars.get("alex");
              if (alex) alex.morale = clamp(alex.morale - 10, 0, 100);
              const jordan = e.chars.get("jordan");
              if (jordan) jordan.morale = clamp(jordan.morale + 3, 0, 100);
              if (s.items) {
                if (s.items.matching_algo) s.items.matching_algo.status = "obsolete";
                if (s.items.ios_ui)        s.items.ios_ui.status        = "obsolete";
                ["sprint_social","sprint_algo","sprint_mono","sprint_adv_social","sprint_adv_video"].forEach(k => {
                  if (s.items[k] && s.items[k].status === "todo") s.items[k].status = "obsolete";
                });
                s.items.plans_matching = { status: "active", quality: null, assignee: "alex"   };
                s.items.plans_ui       = { status: "todo",   quality: null, assignee: s.jordan_resolved ? null : "jordan" };
              }
              return "You called Alex. 'I've made the decision.' He went quiet, then: 'okay.' Three weeks. $2k.";
            } },
          { label: "Appreciate it — but we ship as planned", key: "ship",
            execute(s, char, e) {
              s.pivot_resolved_flag = true;
              s.pivot_deferred = true;
              const jordan = e.chars.get("jordan");
              if (jordan) jordan.morale = clamp(jordan.morale + 3, 0, 100);
              return "Alex was relieved. Priya said 'okay — watch your week-two retention closely.'";
            } },
          { label: "Good — let's make it happen", key: "go",
            execute(s, char, e) {
              s.pivot_resolved_flag = true;
              s.activities_pivot = true;
              s.cash = clamp(s.cash - 2000, 0, 9999999);
              s.market_fit = clamp(s.market_fit + 15, 0, 100);
              const alex = e.chars.get("alex");
              if (alex) alex.morale = clamp(alex.morale - 10, 0, 100);
              const jordan = e.chars.get("jordan");
              if (jordan) jordan.morale = clamp(jordan.morale + 3, 0, 100);
              if (s.items) {
                if (s.items.matching_algo) s.items.matching_algo.status = "obsolete";
                if (s.items.ios_ui)        s.items.ios_ui.status        = "obsolete";
                ["sprint_social","sprint_algo","sprint_mono","sprint_adv_social","sprint_adv_video"].forEach(k => {
                  if (s.items[k] && s.items[k].status === "todo") s.items[k].status = "obsolete";
                });
                s.items.plans_matching = { status: "active", quality: null, assignee: "alex"   };
                s.items.plans_ui       = { status: "todo",   quality: null, assignee: s.jordan_resolved ? null : "jordan" };
              }
              return "Three weeks. $2k. Alex built it without comment. The product shifted.";
            } },
        ],
        dropDelay: 0, dropMsg: null,
        dropFx(s, char, e) {
          s.pivot_resolved_flag = true;
          if (s.pivot_direction_game === "pivot") {
            // Player already committed to pivot with Alex — execute it even without engaging Priya
            s.activities_pivot = true;
            s.cash = clamp(s.cash - 2000, 0, 9999999);
            s.market_fit = clamp(s.market_fit + 10, 0, 100);
            if (s.items) {
              if (s.items.matching_algo) s.items.matching_algo.status = "obsolete";
              if (s.items.ios_ui)        s.items.ios_ui.status        = "obsolete";
              ["sprint_social","sprint_algo","sprint_mono","sprint_adv_social","sprint_adv_video"].forEach(k => {
                if (s.items[k] && s.items[k].status === "todo") s.items[k].status = "obsolete";
              });
              s.items.plans_matching = { status: "active", quality: null, assignee: "alex"   };
              s.items.plans_ui       = { status: "todo",   quality: null, assignee: s.jordan_resolved ? null : "jordan" };
            }
          } else {
            s.pivot_deferred = true;
            const alex = e && e.chars && e.chars.get("alex");
            if (alex) alex.morale = clamp(alex.morale + 5, 0, 100);
          }
        },
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.priya = def;
})();
