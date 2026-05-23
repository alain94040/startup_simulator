(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'techcrunch', name: 'TechCrunch', type: 'press',
    unlockCondition: (s) => s.product > 15,
    cards: [
      {
        id: 'competitor_launch', cat: 'e', from: 'TechCrunch',
        body: "Rivalio just came out of stealth with $3M. product looks similar to what you're building. they already have developer traction on Twitter.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.product > 20 && !char.flags.done,
        options: [
          { label: 'Study what they built (2 weeks)', key: 'study',
            execute(s, char, e) {
              char.flags.done = true;
              s.competitor_launch_week = s.week;
              s.competitive_intel = true;
              s.market_fit = clamp(s.market_fit + 8, 0, 100);
              s.signal = clamp(s.signal + 4, 0, 100);
              const alex = e.chars.get('alex');
              if (alex && alex.active) alex.morale = clamp(alex.morale - 3, 0, 100);
              return "Spent 2 weeks mapping their product. They went broad — enterprise features, heavy onboarding. Your niche is the gap they skipped. Alex helped with the analysis.";
            } },
          { label: 'Write a comparison piece', key: 'compare',
            execute(s, char, e) {
              char.flags.done = true;
              s.competitor_launch_week = s.week;
              s.signal = clamp(s.signal + 6, 0, 100);
              const alex = e.chars.get('alex');
              if (alex && alex.active) alex.morale = clamp(alex.morale - 5, 0, 100);
              return "Published a direct comparison. Your niche is clearer. Alex is rattled but focused.";
            } },
          { label: 'Copy their best features', key: 'copy',
            execute(s, char, e) {
              char.flags.done = true;
              s.competitor_launch_week = s.week;
              s.copied_competitor = true;
              s.product = clamp(s.product + 4, 0, 100);
              s.market_fit = clamp(s.market_fit - 8, 0, 100);
              s.signal = clamp(s.signal - 5, 0, 100);
              const alex = e.chars.get('alex');
              if (alex && alex.active) alex.morale = clamp(alex.morale - 10, 0, 100);
              return "Shipped fast. But you're building for their customers now, not yours. Alex is frustrated. Twitter called you a Rivalio clone.";
            } },
          { label: 'Ignore it — stay on roadmap', key: 'ignore',
            execute(s, char, e) {
              char.flags.done = true;
              s.competitor_launch_week = s.week;
              s.competitor_ignored = true;
              const alex = e.chars.get('alex');
              if (alex && alex.active) alex.morale = clamp(alex.morale - 5, 0, 100);
              return "Back to building. Their noise is real but so is your roadmap. Alex saw the article and went quiet for a day.";
            } },
        ],
        dropDelay: 2, dropFrom: 'Priya (advisor)',
        dropMsg: "Rivalio has 200 customers and is well-funded. you need a sharper answer to 'why you and not them.'",
        dropFx(s, char) {
          char.flags.done = true;
          s.competitor_launch_week = s.week;
          s.competitor_ignored = true;
          s.signal = clamp(s.signal - 12, 0, 100);
        },
      },

      {
        id: 'competitor_growing', cat: 'e', from: 'TechCrunch',
        body: "Rivalio hit 1,000 users. two of your beta users emailed this week asking if you're planning to match their new export feature.",
        urgency: 3, weeks: 1,
        available: (s) => s.competitor_ignored && !s.competitor_pressure_done
          && s.week >= (s.competitor_launch_week || 0) + 3,
        options: [
          { label: 'Do user calls — understand what they actually need', key: 'calls',
            execute(s) {
              s.competitor_pressure_done = true;
              s.market_fit = clamp(s.market_fit + 6, 0, 100);
              s.signal = clamp(s.signal + 4, 0, 100);
              return "Called 5 users. Most still prefer your approach. Two want the feature — but for a different reason than you assumed. Now you know what to build next.";
            } },
          { label: 'Offer existing users a discount to stay', key: 'discount',
            execute(s) {
              s.competitor_pressure_done = true;
              s.customers = clamp(s.customers + 1, 0, 9999);
              s.cash = clamp(s.cash - 500, 0, 9999999);
              return "Gave 3 accounts 20% off. Bought loyalty — not ideal, but stopped the bleeding. The feature question didn't go away.";
            } },
          { label: 'Keep building, ignore the noise', key: 'ignore',
            execute(s) {
              s.competitor_pressure_done = true;
              s.market_fit = clamp(s.market_fit - 5, 0, 100);
              return "Stayed the course. Lost two beta users to Rivalio. The remaining users are still with you — for now.";
            } },
        ],
        dropDelay: 2, dropFrom: 'User',
        dropMsg: "we've been evaluating Rivalio. going to give them a try — nothing personal.",
        dropFx(s) {
          s.competitor_pressure_done = true;
          s.market_fit = clamp(s.market_fit - 8, 0, 100);
          s.signal = clamp(s.signal - 8, 0, 100);
          s.users = clamp(s.users - 3, 0, 9999);
        },
      },

      {
        id: 'investor_moat_question', cat: 'e', from: 'Investor',
        body: "an investor you're pitching asks directly: 'Rivalio raised $3M in your space last month. why do you win?'",
        urgency: 2, weeks: 1,
        available: (s) => s.deck_ready && s.competitor_launch_week && !s.moat_answered,
        options: [
          { label: "Explain the niche they ignored", key: 'niche',
            execute(s) {
              s.moat_answered = true;
              if (s.competitive_intel) {
                s.investor_warmth = clamp(s.investor_warmth + 12, 0, 100);
                return "Your answer was specific and confident — you mapped their product, you know where they stopped. 'That's exactly what I was hoping to hear.'";
              }
              s.investor_warmth = clamp(s.investor_warmth - 5, 0, 100);
              return "You said 'they're going broad, we're going deep' — but couldn't back it up with specifics. The investor nodded slowly. Conviction cooled.";
            } },
          { label: "We're moving faster and closer to customers", key: 'speed',
            execute(s) {
              s.moat_answered = true;
              s.investor_warmth = clamp(s.investor_warmth + 2, 0, 100);
              return "Plausible answer. The investor appreciated the honesty but wanted more. 'Come back when you have 3 months of retention data.'";
            } },
          { label: "Deflect — pivot to your traction story", key: 'deflect',
            execute(s) {
              s.moat_answered = true;
              s.investor_warmth = clamp(s.investor_warmth - 8, 0, 100);
              return "The investor noticed the pivot. 'You didn't answer my question.' The meeting wrapped up quickly after that.";
            } },
        ],
        dropDelay: 0, dropMsg: null, dropFx: null,
      },
    ],
  };

  if (typeof module !== 'undefined') module.exports = def;
  else ROLES.techcrunch = def;
})();
