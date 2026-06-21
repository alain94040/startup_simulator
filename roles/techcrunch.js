(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const def = {
    id: 'techcrunch', type: 'press',

    slice: [
      "competitor_launch",
      "competitor_growing",
      "investor_moat_question",
    ],

    role: "Industry news",
    name: "Market",  // chat display name
    voice: {
      "competitor_launch|study": "Spent 2 weeks mapping Flare's product. They went broad — swiping, video dates, lots of noise. Our niche is the gap they skipped.",
      "competitor_launch|compare": "Published a direct comparison with Flare. Our niche is clearer now. Alex is rattled but focused.",
      "competitor_launch|copy": "Copied Flare's best features. Shipped fast — but we're building for their users now, not ours. Alex is frustrated.",
      "competitor_launch|ignore": "Ignored Flare's launch and stayed on our roadmap. Their noise is real but so is our plan.",
      "competitor_growing|calls": "Called 5 subscribers. Most still prefer our approach. Two want video dates — for a different reason than I assumed. Now I know what to build next.",
      "competitor_growing|discount": "Offered existing subscribers a discount to stay. Bought loyalty — not ideal, but stopped the bleeding.",
      "competitor_growing|ignore": "Kept building, ignored the Flare noise. Lost two subscribers. The remaining users are still with us — for now.",
      "investor_moat_question|niche": "Answered the moat question directly — explained the niche Flare ignored.",
      "investor_moat_question|speed": "Told the investor we're moving faster and closer to customers. Plausible but he wanted more.",
      "investor_moat_question|deflect": "Tried to pivot to traction instead of answering the Flare question. The investor noticed."
    },
    unlockCondition: (s) => s.items != null,
    cards: [
      {
        id: 'competitor_launch', cat: 'e', from: 'TechCrunch',
        body: "Flare just came out of stealth with $3M. same space — serious relationships, same price point. they already have 5,000 users from a TikTok campaign.",
        urgency: 3, weeks: 1,
        available: (s, char) => s.has_demo && !char.flags.done,
        options: [
          { label: 'Study what they built', key: 'study',
            execute(s, char, e) {
              char.flags.done = true;
              s.competitor_launch_week = s.week;
              s.competitive_intel = true;
              s.market_fit = clamp(s.market_fit + 8, 0, 100);
              s.signal = clamp(s.signal + 4, 0, 100);
              const alex = e.chars.get('alex');
              if (alex && alex.active) alex.morale = clamp(alex.morale - 3, 0, 100);
              const alexActive = e.chars.get('alex')?.active;
              return alexActive
                ? "Spent 2 weeks mapping their product. They went broad — swiping, video dates, lots of noise. Your niche is the gap they skipped. Alex helped with the analysis."
                : "Spent 2 weeks mapping their product. They went broad — swiping, video dates, lots of noise. Your niche is the gap they skipped.";
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
              s.market_fit = clamp(s.market_fit - 8, 0, 100);
              s.signal = clamp(s.signal - 5, 0, 100);
              const alex = e.chars.get('alex');
              if (alex && alex.active) alex.morale = clamp(alex.morale - 10, 0, 100);
              return "Shipped fast. But you're building for their users now, not yours. Alex is frustrated. Twitter called you a Flare clone.";
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
        dropDelay: 2, dropFrom: 'Market signal',
        dropMsg: "Flare has 10,000 users and is well-funded. you need a sharper answer to 'why kindred and not them.'",
        dropFx(s, char) {
          char.flags.done = true;
          s.competitor_launch_week = s.week;
          s.competitor_ignored = true;
          s.signal = clamp(s.signal - 12, 0, 100);
        },
      },

      {
        id: 'competitor_growing', cat: 'e', from: 'TechCrunch',
        body: "Flare hit 10,000 users. two of your subscribers emailed asking if you're planning to add video dates — the feature Flare just launched.",
        urgency: 3, weeks: 1,
        available: (s) => s.competitor_ignored && !s.competitor_pressure_done
          && s.customers >= 1 && s.week >= (s.competitor_launch_week || 0) + 3,
        options: [
          { label: 'Do user calls — understand what they actually need', key: 'calls',
            execute(s) {
              s.competitor_pressure_done = true;
              s.market_fit = clamp(s.market_fit + 6, 0, 100);
              s.signal = clamp(s.signal + 4, 0, 100);
              return "Called 5 subscribers. Most still prefer your approach. Two want video dates — but for a different reason than you assumed. Now you know what to build next.";
            } },
          { label: 'Offer existing subscribers a discount to stay', key: 'discount',
            execute(s) {
              s.competitor_pressure_done = true;
              s.customers = clamp(s.customers + 1, 0, 9999);
              s.cash = clamp(s.cash - 500, 0, 9999999);
              return "Gave 3 subscribers 20% off. Bought loyalty — not ideal, but stopped the bleeding. The feature question didn't go away.";
            } },
          { label: 'Keep building, ignore the noise', key: 'ignore',
            execute(s) {
              s.competitor_pressure_done = true;
              s.market_fit = clamp(s.market_fit - 5, 0, 100);
              return "Stayed the course. Lost two subscribers to Flare. The remaining users are still with you — for now.";
            } },
        ],
        dropDelay: 2, dropFrom: 'User',
        dropMsg: "we've been evaluating Flare. going to give them a try — nothing personal.",
        dropFx(s) {
          s.competitor_pressure_done = true;
          s.market_fit = clamp(s.market_fit - 8, 0, 100);
          s.signal = clamp(s.signal - 8, 0, 100);
          s.users = clamp(s.users - 3, 0, 9999);
        },
      },

      {
        id: 'investor_moat_question', cat: 'e', from: 'Investor',
        body: "an investor you're pitching asks directly: 'Flare raised $3M and has 10,000 users. why does kindred win?'",
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
