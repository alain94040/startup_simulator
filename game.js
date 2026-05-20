// STARTUP FOUNDER GAME - Core Game Logic

function formatDate(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

class StartupGame {
  constructor() {
    this.game = {
      cash: 0,
      weeks_elapsed: 0,
      start_date: new Date(2024, 0, 1), // January 1, 2024
      product_progress: 0,
      product_market_fit: 50, // 0-100, hidden metric for building right thing
      customers: 0,
      monthly_revenue: 0,
      product_launched: false,
      pitch_deck_ready: false,
      in_incubator: false,
      incubator_name: null,
      incubator_bonus: 0,
      pivot_bonus: 0,
      founder: {
        technical_skill: 0,
        sales_skill: 0,
        equity: 100,
        full_time: true,
        productivity: 1.0
      },
      team: [],
      game_over: false,
      game_won: false,
      pending_cofounder_offer: null,
      pending_incubator_offer: null,
      market_bonus: 0,
      fundraising_bonus: 0
    };

    // Y Combinator application delay logic
    // Pick a random delay between 1 and 6 months after the start date
    const ycDelayMonths = Math.floor(Math.random() * 6) + 1;
    const start = this.game.start_date;
    this.game.yc_application_open_date = new Date(start.getFullYear(), start.getMonth() + ycDelayMonths, 1);
    this.game.yc_application_delay_months = ycDelayMonths;
    // Y Combinator state flags
    this.game.yc_application_submitted = false;
    this.game.pending_yc_application = null;
    this.game.pending_yc_decision_message = null;
    this.game.yc_notice_sent = false;
  }

  // Expose some internal state for testing utilities
  get pending_yc_application() {
    return this.game.pending_yc_application;
  }

  // ===== INITIALIZATION =====

  applyOnboarding(situation, skill, fulltime, hasCofounder, cofounderFulltime) {
    // Apply situation
    if (situation === "1") {
      this.game.cash = 0;
      this.game.founder.technical_skill = 7;
      this.game.founder.sales_skill = 3;
    } else if (situation === "2") {
      this.game.cash = 30000;
      this.game.founder.technical_skill = 6;
      this.game.founder.sales_skill = 5;
    } else if (situation === "3") {
      this.game.cash = 80000;
      this.game.founder.technical_skill = 7;
      this.game.founder.sales_skill = 7;
      this.game.product_progress = 10;
    }

    // Apply skill bonus
    if (skill === "1") {
      this.game.founder.technical_skill += 2;
    } else if (skill === "2") {
      this.game.founder.sales_skill += 2;
    } else if (skill === "3") {
      this.game.founder.technical_skill += 1;
      this.game.founder.sales_skill += 1;
    }

    // Apply full-time vs part-time
    this.game.founder.full_time = (fulltime === "1");
    // Flag university founder for special handling
    this.game.founder.university = (situation === "1");
    // Productivity: part‑time = 0.5, full‑time experienced = 1.0
    if (this.game.founder.university) {
      this.game.founder.productivity = 0.75; // halfway between 0.5 and 1.0
    } else {
      this.game.founder.productivity = this.game.founder.full_time ? 1.0 : 0.5;
    }

    // Calculate initial product-market fit based on team composition
    this.game.product_market_fit = this.calculateInitialMarketFit(situation, skill, hasCofounder);

    // Add co-founder if chosen
    if (hasCofounder === "1") {
      const cofounder = this.generateCofounder();
      cofounder.full_time = (cofounderFulltime === "1");
      cofounder.productivity = cofounder.full_time ? 1.0 : 0.5;
      this.game.team.push(cofounder);
      this.game.founder.equity -= cofounder.equity;
      
      // Improve market fit if co-founder has good sales skills
      this.recalculateMarketFit();
      
      return `Added ${cofounder.name} as co-founder (${cofounder.equity}% equity, ${cofounder.full_time ? 'full-time' : 'part-time'})`;
    }
    return null;
  }

  calculateInitialMarketFit(situation, skill) {
    let fit = 30; // Base for pure technical founder
    
    // Bonus for previous founder experience (they've learned from mistakes)
    if (situation === "3") {
      fit += 20;
    }
    
    // Bonus for sales/marketing skills
    if (skill === "2") {
      fit += 20; // Sales-focused founder understands market better
    } else if (skill === "3") {
      fit += 10; // Balanced founder has some market sense
    }
    
    return Math.min(100, fit);
  }

  recalculateMarketFit() {
    // Recalculate market fit based on team composition
    const totalSales = this.getTotalSalesSkill();
    const totalTech = this.getTotalTechnicalSkill();
    
    // Base fit depends on sales/market understanding
    let fit = 30;
    
    // Each point of sales skill adds market understanding
    fit += Math.min(30, totalSales * 2);
    
    // Pure technical teams (high tech, low sales) have poor market fit
    if (totalTech > totalSales * 2) {
      fit -= 10; // Penalty for tech-heavy team with no market voice
    }
    
    // Cap at current level (can't decrease from customer learning)
    if (this.game.customers > 0) {
      fit = Math.max(this.game.product_market_fit, fit);
    }
    
    this.game.product_market_fit = Math.min(100, Math.max(20, fit));
  }

  // ===== ACTION DEFINITIONS =====

  getAvailableActions() {
    const actions = [];
    
    actions.push('BUILD_PRODUCT');
    actions.push('FIND_COFOUNDER');
    
    // Market research available anytime
    actions.push('TALK_TO_USERS');
    
    if (this.game.product_progress >= 60 && !this.game.product_launched) {
      actions.push('LAUNCH_PRODUCT');
    }
    
    if (this.game.product_launched) {
      actions.push('GET_CUSTOMERS');
    }
    
    if (this.game.customers > 0) {
      actions.push('PIVOT');
    }
    
    actions.push('ASK_FRIENDS_FAMILY');
    
    if (!this.game.pitch_deck_ready) {
      actions.push('PREPARE_PITCH');
    } else {
      actions.push('PITCH_ANGELS');
      actions.push('PITCH_SEED');
    }
    
    if (!this.game.in_incubator && !this.game.yc_application_submitted) {
      if (this.isYCApplicationOpen()) {
        actions.push('APPLY_YC');
      }
      actions.push('APPLY_TECHSTARS');
    }
    
    return actions;
  }

  getActionInfo(action) {
    const info = {
      'BUILD_PRODUCT': { name: 'Build Product', time: 2, category: 'product' },
      'TALK_TO_USERS': { name: 'Talk to Potential Users', time: 1, category: 'sales' },
      'LAUNCH_PRODUCT': { name: 'Launch Product', time: 1, category: 'sales' },
      'GET_CUSTOMERS': { name: 'Get Customers', time: 2, category: 'sales' },
      'FIND_COFOUNDER': { name: 'Find Co-founder', time: 4, category: 'team' },
      'PIVOT': { name: 'Pivot Product', time: 4, category: 'product' },
      'APPLY_YC': { name: 'Apply to Y Combinator', time: 5, category: 'fundraising' },
      'APPLY_TECHSTARS': { name: 'Apply to Techstars', time: 5, category: 'fundraising' },
      'ASK_FRIENDS_FAMILY': { name: 'Ask Friends & Family', time: 1, category: 'fundraising' },
      'PREPARE_PITCH': { name: 'Prepare Pitch Deck', time: 1, category: 'fundraising' },
      'PITCH_ANGELS': { name: 'Pitch Angels', time: 4, category: 'fundraising' },
      'PITCH_SEED': { name: 'Pitch VCs for Seed', time: 8, category: 'fundraising' }
    };
    return info[action];
  }

  // ===== ACTION EXECUTION =====

  executeAction(action) {
    const info = this.getActionInfo(action);
    this.advanceTime(info.time);

    let result = { message: '', type: 'info' };

    switch(action) {
      case 'BUILD_PRODUCT':
        result = this.buildProduct();
        break;
      case 'TALK_TO_USERS':
        result = this.talkToUsers();
        break;
      case 'LAUNCH_PRODUCT':
        result = this.launchProduct();
        break;
      case 'GET_CUSTOMERS':
        result = this.getCustomers();
        break;
      case 'FIND_COFOUNDER':
        result = this.findCofounder();
        break;
      case 'PIVOT':
        result = this.pivot();
        break;
      case 'APPLY_YC':
        result = this.applyToIncubator('YC');
        break;
      case 'APPLY_TECHSTARS':
        result = this.applyToIncubator('Techstars');
        break;
      case 'ASK_FRIENDS_FAMILY':
        result = this.askFriendsFamily();
        break;
      case 'PREPARE_PITCH':
        result = this.preparePitch();
        break;
      case 'PITCH_ANGELS':
        result = this.pitchAngels();
        break;
      case 'PITCH_SEED':
        result = this.pitchSeed();
        break;
    }

    this.updateDerivedValues();
    this.checkGameOver();

    return result;
  }

  // ===== ACTION IMPLEMENTATIONS =====

  buildProduct() {
    const baseGain = this.getTotalTechnicalSkill() * 2;
    
    // Calculate efficiency penalty when building ahead of market understanding
    const gap = this.game.product_progress - this.game.product_market_fit;
    let efficiency = 1.0;
    
    if (gap > 10) {
      // More aggressive exponential decay
      const excess = gap - 10;
      // Exponential formula: efficiency = 0.95^(excess)
      efficiency = Math.pow(0.95, excess);
      efficiency = Math.max(0.05, efficiency); // Minimum 5%
    }
    
    const actualGain = baseGain * efficiency;
    this.game.product_progress = Math.min(100, this.game.product_progress + actualGain);
    
    let message = `Built ${actualGain.toFixed(1)}% of product. Total progress: ${Math.floor(this.game.product_progress)}%`;
    
    // Warn player if building is slowing down
    if (efficiency < 0.5) {
      message += `\n[WARNING] Progress is crawling. Without customer feedback, you're likely building the wrong things.`;
    } else if (efficiency < 0.7) {
      message += `\n[WARNING] Progress is slowing. Without customer feedback, you might be building the wrong features.`;
    } else if (efficiency < 0.9) {
      message += `\n[TIP] Consider talking to customers to validate your direction.`;
    }
    
    return {
      message: message,
      type: efficiency < 0.7 ? 'warning' : 'success',
      debug: {
        base_gain: baseGain,
        efficiency: efficiency,
        gap: gap
      }
    };
  }

  launchProduct() {
    this.game.product_launched = true;
    return {
      message: "[SUCCESS] Product launched! You can now acquire customers.",
      type: 'success'
    };
  }

  talkToUsers() {
    const baseSalesSkill = this.getTotalSalesSkill();
    
    // Base market fit improvement from user interviews
    let baseImprovement = baseSalesSkill * 0.5; // 0.5% per sales skill point
    
    // More aggressive diminishing returns - exponential decay as knowledge increases
    let effectiveness = 1.0;
    if (this.game.product_market_fit > 70) {
      // Very hard to learn more just by talking
      effectiveness = 0.15;
    } else if (this.game.product_market_fit > 50) {
      effectiveness = 0.4;
    } else if (this.game.product_market_fit > 30) {
      effectiveness = 0.7;
    }
    
    // Having some product helps conversations be more concrete
    let concretenessBonus = 1.0;
    if (this.game.product_progress > 50) {
      concretenessBonus = 1.5; // 50% bonus with substantial product
    } else if (this.game.product_progress > 30) {
      concretenessBonus = 1.3; // 30% bonus with something to show
    }
    
    const actualImprovement = baseImprovement * effectiveness * concretenessBonus;
    const oldFit = this.game.product_market_fit;
    this.game.product_market_fit = Math.min(100, this.game.product_market_fit + actualImprovement);
    
    let message = `Talked to potential users. Market understanding improved by ${actualImprovement.toFixed(1)}% (now ${Math.floor(this.game.product_market_fit)}%)`;
    
    // Contextual feedback
    if (this.game.product_progress < 30) {
      message += `\n[TIP] Conversations would be more valuable with a prototype to show.`;
    } else if (this.game.product_progress > 50 && this.game.product_market_fit < 60) {
      message += `\n[SUCCESS] Having a product helps get concrete feedback!`;
    }
    
    if (effectiveness <= 0.4) {
      message += `\n[WARNING] Diminishing returns on user interviews. You need to build and test with real customers.`;
    }
    
    return {
      message: message,
      type: 'success',
      debug: {
        base: baseImprovement,
        effectiveness: effectiveness,
        concreteness_bonus: concretenessBonus,
        actual: actualImprovement
      }
    };
  }

  getCustomers() {
    const baseSalesSkill = this.getTotalSalesSkill();
    
    // Market fit multiplier (are you building right thing?)
    const marketFitMultiplier = this.game.product_market_fit / 100;
    
    // Product readiness multiplier (is there enough to show?)
    // Need at least 40% product to get meaningful traction
    const productMultiplier = Math.min(1.0, Math.max(0.3, this.game.product_progress / 60));
    
    const marketBoost = this.game.market_bonus || 0;
    this.game.market_bonus = 0;
    const newCustomers = Math.floor(baseSalesSkill * 20 * marketFitMultiplier * productMultiplier) + marketBoost;
    this.game.customers += newCustomers;
    
    // Learn from customer feedback - but learning rate depends on product completeness
    // Need something substantial to get meaningful feedback
    let learningRate = 1.0;
    if (this.game.product_progress < 30) {
      learningRate = 0.4; // Hard to learn without much to show
    } else if (this.game.product_progress < 50) {
      learningRate = 0.7; // Some learning possible
    }
    
    if (newCustomers > 0) {
      const baseLearning = Math.min(5, newCustomers / 20);
      const actualLearning = baseLearning * learningRate;
      this.improveMarketFitFromCustomers(actualLearning);
    }
    
    let message = `Acquired ${newCustomers} new customers! Total: ${this.game.customers}`;
    
    // Contextual warnings
    if (this.game.product_progress < 40) {
      message += `\n[WARNING] Hard to get meaningful traction without more product to show.`;
    } else if (marketFitMultiplier < 0.4) {
      message += `\n[WARNING] Customer acquisition is slower than expected. Are you building what people want?`;
    } else if (learningRate < 1.0) {
      message += `\n[TIP] Build more product features to get better customer feedback.`;
    }
    
    return {
      message: message,
      type: newCustomers < baseSalesSkill * 8 ? 'warning' : 'success',
      debug: {
        base_potential: baseSalesSkill * 20,
        market_fit_multiplier: marketFitMultiplier,
        product_multiplier: productMultiplier,
        learning_rate: learningRate
      }
    };
  }

  improveMarketFitFromCustomers(learning) {
    // Market fit improves from customer feedback
    this.game.product_market_fit = Math.min(100, this.game.product_market_fit + learning);
  }

  findCofounder() {
    const candidate = this.generateCofounder();
    this.game.pending_cofounder_offer = candidate;
    return {
      message: 'cofounder_offer',
      type: 'decision',
      data: candidate
    };
  }

  pivot() {
    this.game.product_progress = 40;
    this.game.customers = 0;
    this.game.product_launched = false;
    this.game.pivot_bonus = 5;
    return {
      message: "Pivoting! Product reset to 40%, customers lost, but you've learned (+5 fundraising score)",
      type: 'warning'
    };
  }

  applyToIncubator(name) {

    // Handle Y Combinator specially: decision delayed one month
    if (name === 'YC') {
      // If already applied this cycle, ignore further applications
      if (this.game.yc_application_submitted) {
        return { message: 'Already applied this cycle.', type: 'info' };
      }
      // Mark as submitted and reset notice flag
      this.game.yc_application_submitted = true;
      this.game.yc_notice_sent = false;
      const acceptance = this.calculateIncubatorAcceptance(name);
      const offer = this.generateIncubatorOffer(name);
      this.game.pending_yc_application = {
        // Decision after one month (4 weeks). Stored as weeks remaining.
        weeks_remaining: 4, // 4 weeks per month
        acceptance,
        offer
      };
      return { message: 'Applied to Y Combinator, response in a month', type: 'info' };
    }

    const acceptance = this.calculateIncubatorAcceptance(name);
    if (Math.random() < acceptance) {
      const offer = this.generateIncubatorOffer(name);
      this.game.pending_incubator_offer = offer;
      return {
        message: 'incubator_offer',
        type: 'decision',
        data: offer
      };
    } else {
      return {
        message: `[REJECTED] Rejected from ${name}.`,
        type: 'error'
      };
    }
  }

  // === Customer dynamics constants ===
  // Base growth / churn percentages applied each monthly checkpoint
  get BASE_GROWTH_RATE() { return 0.05; }
  get BASE_CHURN_RATE() { return 0.10; }
  // Effect of product‑market fit (0‑100) on growth and churn
  get FIT_GROWTH_FACTOR() { return 0.10; }
  get FIT_CHURN_FACTOR()  { return 0.05; }

  askFriendsFamily() {
    const success = Math.random() < 0.5;
    
    if (success) {
      const investment = Math.floor(Math.random() * 40000) + 10000;
      const equity = Math.floor(Math.random() * 6) + 5;
      this.game.cash += investment;
      this.game.founder.equity -= equity;
      return {
        message: `[SUCCESS] Raised $${investment.toLocaleString()} from friends & family (-${equity}% equity)`,
        type: 'success'
      };
    } else {
      return {
        message: "[REJECTED] Nobody was willing to invest right now.",
        type: 'warning'
      };
    }
  }

  preparePitch() {
    this.game.pitch_deck_ready = true;
    return {
      message: "[SUCCESS] Pitch deck ready! You can now pitch to investors.",
      type: 'success'
    };
  }

  pitchAngels() {
    const score = this.calculateFundraisingScore();
    const success = Math.random() < (score / 150);
    
    if (success) {
      const investment = Math.floor(Math.random() * 200000) + 100000;
      const equity = Math.floor(Math.random() * 6) + 15;
      this.game.cash += investment;
      this.game.founder.equity -= equity;
      return {
        message: `[SUCCESS] Raised $${investment.toLocaleString()} from angels! (-${equity}% equity)`,
        type: 'success'
      };
    } else {
      return {
        message: `[REJECTED] Angels passed (fundraising score: ${Math.floor(score)}). Keep building traction.`,
        type: 'warning'
      };
    }
  }

  pitchSeed() {
    const score = this.calculateFundraisingScore();
    const success = Math.random() < Math.min(1, (score - 30) / 60) && score >= 65;
    
    if (success) {
      const investment = Math.floor(Math.random() * 1000000) + 1000000;
      const equity = Math.floor(Math.random() * 6) + 20;
      this.game.cash += investment;
      this.game.founder.equity -= equity;
      this.game.game_won = true;
      return {
        message: `[SEED ROUND RAISED!]\n\nInvestment: $${investment.toLocaleString()}\nEquity: -${equity}%`,
        type: 'success'
      };
    } else {
      return {
        message: `[REJECTED] VCs passed (fundraising score: ${Math.floor(score)}). Need more traction or stronger team.`,
        type: 'error'
      };
    }
  }

  // ===== CO-FOUNDER & INCUBATOR DECISIONS =====

  acceptCofounder() {
    const cofounder = this.game.pending_cofounder_offer;
    cofounder.salary = 0;  // Start with no salary (equity only)
    cofounder.productivity = 0.5;  // Part-time at first
    this.game.team.push(cofounder);
    this.game.founder.equity -= cofounder.equity;
    this.game.pending_cofounder_offer = null;
    
    // Recalculate market fit with new team member
    this.recalculateMarketFit();
    
    this.updateDerivedValues();
    return {
      message: `[SUCCESS] ${cofounder.name} joined the team! (On equity, starting part-time)`,
      type: 'success'
    };
  }

  declineCofounder() {
    this.game.pending_cofounder_offer = null;
    return {
      message: "[DECLINED] Declined the co-founder offer.",
      type: 'warning'
    };
  }

  acceptIncubator() {
    const offer = this.game.pending_incubator_offer;
    this.game.cash += offer.investment;
    this.game.founder.equity -= offer.equity;
    this.game.in_incubator = true;
    this.game.incubator_name = offer.name;
    this.game.incubator_bonus = offer.bonus;
    
    // Incubators dramatically improve product-market fit through mentorship
    const marketFitBonus = offer.name === 'Y Combinator' ? 25 : 15;
    this.game.product_market_fit = Math.min(100, this.game.product_market_fit + marketFitBonus);
    
    this.advanceTime(offer.weeks);
    this.game.in_incubator = false;
    this.game.pending_incubator_offer = null;
    this.game.market_bonus = 0;
    this.game.fundraising_bonus = 0;

    this.updateDerivedValues();
    this.checkMonthlyCheckpoint();
    
    return {
      message: `[SUCCESS] Joined ${offer.name}! Completed ${offer.weeks}-week program. Fundraising score boosted by +${offer.bonus}. Market understanding significantly improved!`,
      type: 'success'
    };
  }

  declineIncubator() {
    this.game.pending_incubator_offer = null;
    return {
      message: "[DECLINED] Declined the incubator offer.",
      type: 'warning'
    };
  }

  // ===== CALCULATIONS =====

  getTotalTechnicalSkill() {
    let total = this.game.founder.technical_skill * this.game.founder.productivity;
    this.game.team.forEach(member => {
      total += member.technical_skill * member.productivity;
    });
    return total;
  }

  getTotalSalesSkill() {
    let total = this.game.founder.sales_skill * this.game.founder.productivity;
    this.game.team.forEach(member => {
      total += member.sales_skill * member.productivity;
    });
    return total;
  }

  calculateBurn() {
    // Founder salary: full‑time university founders do not receive a salary
    const founderBurn = this.game.founder.full_time && !this.game.founder.university ? 3000 : 0;
    
    // Co-founder salaries (only what we're actually paying them)
    const teamBurn = this.game.team.reduce((sum, member) => {
      return sum + member.salary;
    }, 0);
    
    return founderBurn + teamBurn;
  }

  calculateFundraisingScore() {
    let score = 0;
    score += Math.min(35, this.game.customers / 50);
    score += this.game.product_progress / 5;
  score += this.game.team.length * 5;
    score += this.game.incubator_bonus;
    score += this.game.pivot_bonus;
    score += this.game.fundraising_bonus || 0;
    this.game.fundraising_bonus = 0;
    return Math.min(100, score);
  }

  calculateIncubatorAcceptance(name) {
    let base = name === 'YC' ? 0.02 : 0.05;
    let bonus = 0;
    
    if (name === 'YC') {
      if (this.game.product_progress >= 80) bonus += 0.03;
      if (this.game.customers >= 100) bonus += 0.05;
      if (this.game.team.length >= 2) bonus += 0.02;
      return Math.min(0.15, base + bonus);
    } else {
      if (this.game.product_progress >= 60) bonus += 0.03;
      if (this.game.customers >= 50) bonus += 0.03;
      if (this.game.team.length >= 1) bonus += 0.02;
      return Math.min(0.20, base + bonus);
    }
  }

  // ===== TASK PANEL DATA =====

  getActionCards() {
    const categoryNames = {
      'product': 'BUILD',
      'sales': 'GROW',
      'team': 'TEAM',
      'fundraising': 'FUNDRAISE',
    };
    const emojis = {
      'BUILD_PRODUCT': '💻',
      'TALK_TO_USERS': '☕',
      'LAUNCH_PRODUCT': '🚀',
      'GET_CUSTOMERS': '📈',
      'FIND_COFOUNDER': '🤝',
      'PIVOT': '🔄',
      'APPLY_YC': '🎯',
      'APPLY_TECHSTARS': '🌟',
      'ASK_FRIENDS_FAMILY': '💰',
      'PREPARE_PITCH': '📊',
      'PITCH_ANGELS': '👼',
      'PITCH_SEED': '💎',
    };

    const cards = { groups: [] };

    const addCard = (actionName, available, reason) => {
      const info = this.getActionInfo(actionName);
      const card = {
        id: actionName,
        name: info.name,
        time: info.time,
        emoji: emojis[actionName] || '🎮',
        available: true,
        reason: null,
        category: info.category
      };
      if (!available) {
        card.available = false;
        card.reason = reason || 'Not available';
      }
      let group = cards.groups.find(g => g.name === categoryNames[card.category]);
      if (!group) {
        group = { name: categoryNames[card.category], cards: [] };
        cards.groups.push(group);
      }
      group.cards.push(card);
    };

    const hasAvailableActions = this.getAvailableActions();

    addCard('BUILD_PRODUCT', true);
    addCard('TALK_TO_USERS', true);

    addCard('LAUNCH_PRODUCT', this.game.product_progress >= 60 && !this.game.product_launched, 'Product needs 60% progress');
    addCard('GET_CUSTOMERS', this.game.product_launched, 'Product must be launched first');
    addCard('PIVOT', this.game.customers > 0, 'Need customers first');

    addCard('FIND_COFOUNDER', true);

    addCard('ASK_FRIENDS_FAMILY', true);

    if (!this.game.pitch_deck_ready) {
      addCard('PREPARE_PITCH', true);
    } else {
      addCard('PITCH_ANGELS', true);
      addCard('PITCH_SEED', this.game.fundraising_score >= 65, 'Fundraising score needs 65+');
    }

    if (!this.game.in_incubator && !this.game.yc_application_submitted) {
      if (this.isYCApplicationOpen()) {
        addCard('APPLY_YC', true);
      } else {
        const nextOpen = this.getNextYCOpenDate();
        addCard('APPLY_YC', false, `Opens ${formatDate(nextOpen)}`);
      }
      addCard('APPLY_TECHSTARS', true);
    }

    return cards;
  }

  getBuildOptions() {
    const options = [];
    const techSkill = this.getTotalTechnicalSkill();
    const baseGain = (techSkill * 2).toFixed(1);

    // Always available: core product work
    options.push({
      id: 'BUILD_PRODUCT',
      name: 'Core Product Work',
      time: 2,
      effect: `+${baseGain}% product progress`,
      context: 'Ship features to move toward launch'
    });

    if (this.game.product_market_fit < 50) {
      options.push({
        id: 'BUILD_PRODUCT',
        name: 'Fix Usability Gaps',
        time: 2,
        effect: '+15% market fit, +10% product',
        context: 'Users find your product hard to use'
      });
    }

    if (this.game.customers > 0) {
      options.push({
        id: 'BUILD_PRODUCT',
        name: 'Ship Feature Users Asked For',
        time: 2,
        effect: '+market fit, +customer conversion',
        context: 'Direct customer feedback drives this'
      });
    }

    if (this.game.product_launched) {
      options.push({
        id: 'BUILD_PRODUCT',
        name: 'Add Enterprise Features',
        time: 2,
        effect: '+revenue per customer',
        context: 'Enterprise buyers want X, Y, Z'
      });
    }

    return options;
  }

  // --- Customer dynamics after a monthly checkpoint ---
  updateCustomerDynamics() {
    if (!this.game.product_launched || this.game.customers <= 0) {
      return;
    }
    const pf = this.game.product_market_fit; // 0‑100
    const growthRate = this.BASE_GROWTH_RATE + (pf / 100) * this.FIT_GROWTH_FACTOR;
    const churnRate  = Math.max(0, this.BASE_CHURN_RATE - (pf / 100) * this.FIT_CHURN_FACTOR);
    const netChange = Math.floor(this.game.customers * (growthRate - churnRate));
    this.game.customers = Math.max(0, this.game.customers + netChange);
  }

  generateIncubatorOffer(name) {
    if (name === 'YC') {
      return {
        name: 'Y Combinator',
        investment: 500000,
        equity: 7,
        weeks: 12,
        bonus: 35
      };
    } else {
      return {
        name: 'Techstars',
        investment: 120000,
        equity: 6,
        weeks: 12,
        bonus: 20
      };
    }
  }

  generateCofounder() {
    const num = this.game.team.length + 1;
    return {
      name: `Co-founder ${num}`,
      technical_skill: Math.floor(Math.random() * 8) + 3,
      sales_skill: Math.floor(Math.random() * 8) + 3,
      equity: Math.floor(Math.random() * 16) + 10,
      months_on_team: 0,
      will_quit: Math.random() < 0.3,
      salary: 0,  // Start with no salary (equity only)
      productivity: 0.5  // Part-time at first
    };
  }

  // ===== TIME & CHECKPOINTS =====

  advanceTime(weeks) {
    for (let i = 0; i < weeks; i++) {
      this.game.weeks_elapsed += 1;
      // Trigger monthly checkpoint logic after each week
      this.checkMonthlyCheckpoint();
    }
  }

  checkMonthlyCheckpoint() {
    // Decrement Y Combinator delay counter every week
    if (this.game.pending_yc_application) {
      this.game.pending_yc_application.weeks_remaining -= 1;
      if (this.game.pending_yc_application.weeks_remaining <= 0) {
        const { acceptance, offer } = this.game.pending_yc_application;
        if (acceptance) {
          // Accept: store as pending incubator offer
          this.game.pending_incubator_offer = offer;
        } else {
          // Rejection: create a simple rejection message to display
          this.game.pending_yc_decision_message = `[REJECTED] Rejected from Y Combinator.`;
        }
        // Reset flags for next cycle
        this.game.pending_yc_application = null;
        this.game.yc_application_submitted = false;
      }
    }

    const currentMonth = Math.floor(this.game.weeks_elapsed / 4);
    const previousMonth = Math.floor((this.game.weeks_elapsed - 1) / 4);

    if (currentMonth > previousMonth) {
      const monthly = this.monthlyCheckpoint();
      return monthly;
    }
    return null;
  }

  monthlyCheckpoint() {
    const burn = this.calculateBurn();
    this.game.cash -= burn;

    let message = `[CHECKPOINT] Monthly checkpoint: -${burn.toLocaleString()} burn`;

    // Market opportunity events (8% chance per month)
    const eventMsg = this.checkMarketOpportunity();
    if (eventMsg) {
      message += '\n' + eventMsg;
    }

    // Customer dynamics now handled by updateCustomerDynamics()
    if (this.game.product_launched && this.game.customers > 0) {
      // Previous static growth logic removed.  Customers adjust in updateCustomerDynamics().
    }

    this.game.monthly_revenue = Math.floor(this.game.customers * 0.5);
    // Update customers based on product-market fit
    this.updateCustomerDynamics();

    // Ensure that monthly checkpoints are evaluated every time we finish
    // a week, even if actions previously advanced more than one week.
    // This guarantees that the monthly burn deduction, co‑founder
    // churn, and customer dynamics happen regularly.
    if ((this.game.weeks_elapsed - 1) % 12 === 0) {
      const quitMessage = this.checkCofounderQuits();
      if (quitMessage) {
        message += '\n' + quitMessage;
      }
    }

    return {
      message: message,
      type: 'warning'
    };
  }

  checkCofounderQuits() {
    let messages = [];
    for (let i = this.game.team.length - 1; i >= 0; i--) {
      const member = this.game.team[i];
      member.months_on_team += 3;
      
      if (member.will_quit && member.months_on_team >= 6) {
        messages.push(`[WARNING] ${member.name} quit the team! Losing 4 weeks dealing with transition...`);
        this.game.team.splice(i, 1);
        this.advanceTime(4);
      }
    }
    return messages.length > 0 ? messages.join('\n') : null;
  }

  updateDerivedValues() {
    this.game.monthly_burn = this.calculateBurn();
    this.game.runway_months = this.game.cash / this.game.monthly_burn;
  }

  // ===== MARKET OPPORTUNITY EVENTS =====

  // 8% chance each month of a random market opportunity
  get MARKET_EVENT_CHANCE() { return 0.05; }

  checkMarketOpportunity() {
    if (Math.random() > this.MARKET_EVENT_CHANCE) return null;

    const events = [
      {
        message: '[MARKET OPPORTUNITY] Your product went viral! Next customer acquisition boosted by +200!',
        effect: (g) => { g.market_bonus = (g.market_bonus || 0) + 200; }
      },
      {
        message: '[MARKET OPPORTUNITY] A major investor expressed interest! Fundraising score +15!',
        effect: (g) => { g.fundraising_bonus = (g.fundraising_bonus || 0) + 15; }
      },
      {
        message: '[MARKET OPPORTUNITY] Major tech publication featured your startup! Immediate +50% customers.',
        effect: (g) => { g.customers = Math.floor(g.customers * 1.5); }
      }
    ];

    const event = events[Math.floor(Math.random() * events.length)];
    event.effect(this.game);
    return event.message;
  }

  checkGameOver() {
    // Game over only if you can't pay your team's burn rate
    if (this.game.cash < 0) {
      this.game.game_over = true;
    }
  }

  isGameOver() {
    return this.game.game_over || this.game.game_won;
  }

  getGameOverStats() {
    return {
      won: this.game.game_won,
      weeks: this.game.weeks_elapsed,
      equity: Math.floor(this.game.founder.equity),
      team_size: this.game.team.length + 1,
      customers: this.game.customers,
      product: Math.floor(this.game.product_progress)
    };
  }

  // ===== GETTERS =====

  getCurrentDate() {
    const date = new Date(this.game.start_date);
    date.setDate(date.getDate() + (this.game.weeks_elapsed * 7));
    return date;
  }

  getFormattedDate() {
    const date = this.getCurrentDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  // Helper to get the current date based on weeks elapsed
  getCurrentDate() {
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    return new Date(this.game.start_date.getTime() + this.game.weeks_elapsed * msPerWeek);
  }

  // Returns true if Y Combinator application window is open
  isYCApplicationOpen() {
    // Y Combinator application window opens 2 months after the first open date, then closes.
    // The cycle repeats every 6 months.
    const current = this.getCurrentDate();
    const start = this.game.start_date;
    // Calculate months elapsed since start
    const monthsSinceStart = (current.getFullYear() - start.getFullYear()) * 12 + (current.getMonth() - start.getMonth());
    // Offset from the first open month
    const offset = monthsSinceStart - this.game.yc_application_delay_months;
    if (offset < 0) {
      return false; // before first open window
    }
    const cycleMonth = offset % 6;
    return cycleMonth < 2; // open for first 2 months of each 6‑month cycle
  }

  // Returns the date of the next opening of the Y Combinator application window
  // based on the current game date. If the window is currently open, this
  // returns the first day of the month when the next opening occurs.
  getNextYCOpenDate() {
    const start = this.game.start_date;
    const current = this.getCurrentDate();
    const monthsSinceStart = (current.getFullYear() - start.getFullYear()) * 12 + (current.getMonth() - start.getMonth());
    const offset = monthsSinceStart - this.game.yc_application_delay_months;
    if (offset < 0) {
      // Before first opening
      return this.game.yc_application_open_date;
    }
    const cycles = Math.floor(offset / 6) + 1;
    const nextOpenMonth = this.game.yc_application_delay_months + cycles * 6;
    return new Date(start.getFullYear(), start.getMonth() + nextOpenMonth, 1);
  }

  // Returns number of weeks until next YC application window opens (0 if currently open)
  weeksUntilNextYCOpen() {
    const nextOpen = this.getNextYCOpenDate();
    const current = this.getCurrentDate();
    const diffMs = nextOpen - current;
    return Math.max(0, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)));
  }

  getState() {
    // Calculate current efficiencies for debug display
    const productGap = this.game.product_progress - this.game.product_market_fit;
    let buildEfficiency = 1.0;
    if (productGap > 10) {
      const excess = productGap - 10;
      buildEfficiency = Math.max(0.1, 1.0 - (excess * 0.025));
    }
    
    let learningRate = 1.0;
    if (this.game.product_progress < 30) {
      learningRate = 0.4;
    } else if (this.game.product_progress < 50) {
      learningRate = 0.7;
    }
    
    return {
      cash: this.game.cash,
      weeks: this.game.weeks_elapsed,
      date: this.getFormattedDate(),
      product: this.game.product_progress,
      product_launched: this.game.product_launched,
      product_market_fit: Math.floor(this.game.product_market_fit),
      build_efficiency: Math.floor(buildEfficiency * 100), // For dev display
      learning_rate: Math.floor(learningRate * 100), // For dev display
      customers: this.game.customers,
      revenue: this.game.monthly_revenue,
      team_size: this.game.team.length + 1,
      equity: Math.floor(this.game.founder.equity),
      technical: this.getTotalTechnicalSkill(),
      sales: this.getTotalSalesSkill(),
      fundraising_score: Math.floor(this.calculateFundraisingScore()),
      runway: this.game.runway_months
    };
  }
}

// Export the class for programmatic use (e.g., unit tests).  This file
// is primarily intended for the browser, but providing a CommonJS
// export keeps the test harness simple without needing to modify the
// original game logic.
// Expose to global for browser usage
if (typeof window !== 'undefined') {
  window.StartupGame = StartupGame;
}
// Expose to global for older Node test harnesses that evaluate the file
// without CommonJS support.
if (typeof global !== 'undefined') {
  global.StartupGame = StartupGame;
}
// Provide a CommonJS export for Node.js environments.
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = { StartupGame };
}
