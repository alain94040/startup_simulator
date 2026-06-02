
const rnd   = n => Math.floor(Math.random() * n);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ─────────────────────────────────────────────
// CHARACTER DEFINITIONS
// Loaded from roles/ files.
// Node.js: required below. Browser: populated by <script> tags before this file.
// ─────────────────────────────────────────────

const CHARACTER_DEFS = typeof require !== 'undefined'
  ? {
      jordan:       require('./roles/jordan.js'),
      alex:         require('./roles/alex.js'),
      priya:        require('./roles/priya.js'),
      marcus:       require('./roles/marcus.js'),
      fatima:       require('./roles/fatima.js'),
      ryan:         require('./roles/ryan.js'),
      sarah:        require('./roles/sarah.js'),
      brett:        require('./roles/brett.js'),
      kevin:        require('./roles/kevin.js'),
      mom:          require('./roles/mom.js'),
      jamie:        require('./roles/jamie.js'),
      david:        require('./roles/david.js'),
      founder:      require('./roles/founder.js'),
      hacker_news:  require('./roles/hacker_news.js'),
      yc:           require('./roles/yc.js'),
      lena:         require('./roles/lena.js'),
      techcrunch:   require('./roles/techcrunch.js'),
      users:        require('./roles/users.js'),
      analytics:    require('./roles/analytics.js'),
      twitter:      require('./roles/twitter.js'),
      tom:          require('./roles/tom.js'),
    }
  : ROLES;



// ─────────────────────────────────────────────
// WORLD EVENTS — silent effects each sprint
// ─────────────────────────────────────────────

const WORLD = [
  {
    available: s => s.launched && s.customers > 0,
    fx: s => { s.signal = clamp(s.signal + 3, 0, 100); },
  },
  {
    available: () => true,
    fx: s => { s.signal = clamp(s.signal - 5, 0, 100); },
  },
  {
    available: s => s.signal > 50,
    fx: s => { s.network.peers += 2; },
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
    fx: s => { s.signal = clamp(s.signal + 2, 0, 100); s.network.peers += 1; },
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
      cash: 10000, week: 1, product: 0, waitlist: 0, users: 0, customers: 0, revenue: 0,
      signal: 28, market_fit: 0, launched: false, deck_ready: false,
      productPhase: "proto",
      has_demo: false, has_beta: false, tech_debt: 0,
      investor_warmth: 0,
      incorporated: false, ip_clear: false,
      ycDeciding: false, ycApplied: false, ycAccepted: false, ycDecisionWeek: null,
      marcusCommitted: false, followerCommitted: false,
      game_over: false, game_won: false,
      network: { peers: 12, advisors: 0, angels: 0, press: 0 },
      items: null,
      dev_plan: null,
    };
    this.ycWeek = 10 + rnd(8);

    // Live character instances
    this.chars = new Map([
      ['jordan', { archetypeId: 'jordan', active: true,  focus: 'build', flags: {} }],
      ['alex',   { archetypeId: 'alex',   active: true,  morale: 80, trust: 90, focus: 'build', focusSprints: 0, flags: {} }],
      ['priya',  { archetypeId: 'priya',  active: false, engagement: 80, flags: {} }],
      ['marcus', { archetypeId: 'marcus', active: false, engagement: 50, flags: {} }],
      ['fatima', { archetypeId: 'fatima', active: false, flags: {} }],
      ['ryan',   { archetypeId: 'ryan',   active: false, flags: {} }],
      ['sarah',  { archetypeId: 'sarah',  active: false, engagement: 60, flags: {} }],
      ['brett',        { archetypeId: 'brett',        active: false, flags: {} }],
      ['kevin',        { archetypeId: 'kevin',        active: false, flags: {} }],
      // Friends & family
      ['mom',          { archetypeId: 'mom',          active: true,  flags: {} }],
      ['jamie',        { archetypeId: 'jamie',        active: false, flags: {} }],
      ['david',        { archetypeId: 'david',        active: false, flags: {} }],
      // Founder self-prompts
      ['founder',      { archetypeId: 'founder',      active: true,  flags: {} }],
      // Platforms & press
      ['hacker_news',  { archetypeId: 'hacker_news',  active: true,  flags: {} }],
      ['yc',           { archetypeId: 'yc',           active: false, flags: {} }],
      ['lena',         { archetypeId: 'lena',         active: false, flags: {} }],
      ['techcrunch',   { archetypeId: 'techcrunch',   active: false, flags: {} }],
      // Market & product signals
      ['users',        { archetypeId: 'users',        active: false, flags: {} }],
      ['analytics',    { archetypeId: 'analytics',    active: false, flags: {} }],
      ['twitter',      { archetypeId: 'twitter',      active: false, flags: {} }],
      ['tom',          { archetypeId: 'tom',          active: false, flags: {} }],
    ]);
    this.alexDepartureRisk = false;

    this.pending = [];
    this.current = [];
    this.shown   = new Set();

    // Proposal A: sprint history — one record per resolved turn
    this.history = [];

    // Proposal C: event bus — populated from onEvents in role definitions
    this._eventHandlers = {};
    for (const [id, def] of Object.entries(CHARACTER_DEFS)) {
      if (!def.onEvents) continue;
      for (const [event, fn] of Object.entries(def.onEvents)) {
        if (!this._eventHandlers[event]) this._eventHandlers[event] = [];
        this._eventHandlers[event].push({ charId: id, fn });
      }
    }
  }

  // Proposal C: emit a named event to all registered handlers
  _emit(event) {
    const handlers = this._eventHandlers[event] || [];
    for (const { charId, fn } of handlers) {
      const char = this.chars.get(charId);
      if (!char) continue;
      fn(this.s, char, this);
    }
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
    if (alex && alex.active && (alex.trust < 15 || alex.morale < 10)) {
      this.alexDepartureRisk = true;
    }

    // Collect available cards from all active characters + global pool
    const allCards = [];
    const fallbackCards = [];
    for (const [id, char] of this.chars) {
      if (!char.active) continue;
      const def = CHARACTER_DEFS[id];
      for (const card of def.cards) {
        if (card.available(this.s, char, this)) {
          const resolved = { ...card, _charId: id };
          if (typeof resolved.body === 'function') resolved.body = resolved.body(this.s, char, this);
          (card.fallback ? fallbackCards : allCards).push(resolved);
        }
      }
    }
    // Fallback cards only enter the pool when nothing else is available
    const basePool = allCards.length > 0 ? allCards : fallbackCards;
    const unseen = basePool.filter(d => !this.shown.has(d.id));
    const pool   = unseen.length >= 4 ? unseen : basePool;

    // Priority cards jump the queue
    const maxPriority = this.s.week <= 8 ? 2 : 1;
    const picked = basePool.filter(d => d.priority).slice(0, maxPriority);

    // Fill remaining slots: one per category, then random
    for (const cat of ['p', 'c', 't', 'e']) {
      if (picked.length >= 6) break;
      const match = pool.slice().sort(() => Math.random() - .5)
        .find(d => d.cat === cat && !picked.includes(d));
      if (match) picked.push(match);
    }
    for (const d of pool.slice().sort(() => Math.random() - .5)) {
      if (picked.length >= 6) break;
      if (!picked.includes(d)) picked.push(d);
    }

    this.current = picked.slice(0, this.s.week === 1 ? 2 : 6);
    this.current.forEach(d => this.shown.add(d.id));
    this.current.forEach(d => { d._expiring = this.shown.has(d.id + '_seen'); });
    return this.current;
  }

  resolveTurn(ids, optKeys = {}) {
    const wasLaunched = this.s.launched;
    const sprintWeek  = this.s.week;

    // Snapshot state for Proposal C event detection (compare after resolution)
    const wasAlexActive       = this.chars.get('alex')?.active ?? false;
    const preMarcusCommitted  = this.s.marcusCommitted;
    const preFollowerCommitted = this.s.followerCommitted;
    const preYCAccepted       = this.s.ycAccepted;
    const preYCApplied        = this.s.ycApplied;

    const chosen  = this.current.filter(d => ids.includes(d.id));
    const dropped = this.current.filter(d => !ids.includes(d.id));
    const results = [];
    const transactions = [];

    const marketFitBefore = this.s.market_fit;

    for (const d of chosen) {
      const char = d._charId ? this.chars.get(d._charId) : null;
      const cashBefore = this.s.cash;
      let m;
      if (d.options) {
        const opt = d.options.find(o => o.key === optKeys[d.id]) || d.options[0];
        m = opt.execute(this.s, char, this);
      } else {
        m = d.execute(this.s, char, this);
      }
      if (m) results.push(m);
      const cashDelta = this.s.cash - cashBefore;
      if (cashDelta !== 0) transactions.push({ label: m, delta: cashDelta, type: cashDelta > 0 ? 'income' : 'expense' });
    }

    const sprintWeeks = Math.max(...chosen.map(d => d.weeks), 1);

    for (const d of dropped) {
      const char = d._charId ? this.chars.get(d._charId) : null;
      if (d.dropDelay > 0 && d.dropFx) {
        this.pending.push({
          fireWeek: this.s.week + d.dropDelay + (d.dropDelay === 1 ? sprintWeeks : 0),
          from: d.dropFrom || (d._charId ? CHARACTER_DEFS[d._charId].name : 'System'),
          text: d.dropMsg,
          fx: d.dropFx,
          charId: d._charId,
          condition: d.dropCondition || null,  // show only if condition is true (skip both if false)
          cancel:    d.dropCancel    || null,  // Proposal B: explicit cancel — skip both if true
        });
      } else if (d.dropDelay === 0 && d.dropFx) {
        const cashBefore = this.s.cash;
        d.dropFx(this.s, char, this);
        const cashDelta = this.s.cash - cashBefore;
        if (cashDelta !== 0) {
          const from = d._charId ? CHARACTER_DEFS[d._charId].name : 'System';
          transactions.push({ label: `${from} — ignored`, delta: cashDelta, type: 'expense' });
        }
      }
    }
    this.s.week += sprintWeeks;
    this.s.cash -= this.burnPerWeek * sprintWeeks;
    transactions.push({ label: 'Team & ops', note: `${sprintWeeks}-wk sprint · $${this.burnPerWeek}/wk`, delta: -(this.burnPerWeek * sprintWeeks), type: 'burn' });

    // Co-founder passive contributions (skill-weighted)
    for (const [id, char] of this.chars) {
      if (!char.active || !char.focus) continue;
      const def = CHARACTER_DEFS[id];
      if (def.type !== 'cofounder') continue;
      const skill = (def.skills || {})[char.focus] || 1.0;
      const sideProjectMult = char.flags.side_project_active ? 0.7 : 1.0;
      // Passive output scales with trust: at zero trust, Alex has checked out entirely
      const trustFactor = 'trust' in char ? char.trust / 100 : 1.0;
      const base  = sprintWeeks * 1.2 * skill * sideProjectMult * trustFactor;
      if (char.focus === 'build') {
        // Product now grows only via card plays — no passive increment here
      } else if (char.focus === 'discover') {
        this.s.signal     = clamp(this.s.signal     + base * 1.5, 0, 100);
        this.s.market_fit = clamp(this.s.market_fit + base,       0, 100);
      } else if (char.focus === 'pitch') {
        this.s.investor_warmth = clamp(this.s.investor_warmth + base * 2, 0, 100);
      }
      char.focusSprints++;
    }

    // Trust decay + morale recovery for co-founders
    // Trust only drops when the co-founder's cards are ignored (dropped), not just from time passing.
    for (const [id, char] of this.chars) {
      if (!char.active || !('trust' in char)) continue;
      const alexDropped = dropped.filter(d => d._charId === id && !d.ignoreForTrust).length;
      const alexChosen  = chosen.filter(d => (!d.ignoreForTrust) && (d._charId === id || d._cofounderEngagement === id)).length;
      const delta = alexChosen - alexDropped;
      if (delta > 0)      char.trust = clamp(char.trust + 2 * sprintWeeks, 0, 100);
      else if (delta < 0) char.trust = clamp(char.trust - 4 * sprintWeeks, 0, 100);
      // no change if Alex had no cards in this sprint
      char.morale = clamp(char.morale + 3 * sprintWeeks, 0, 100);
    }

    // Signal drifts without customer attention
    if (!chosen.some(d => d.cat === 'c')) this.s.signal = clamp(this.s.signal - 2 * sprintWeeks, 0, 100);

    // Competitive pressure: ignored competitor erodes market fit for 4 weeks
    if (this.s.competitor_ignored && !this.s.competitor_pressure_done) {
      const weeksExposed = this.s.week - (this.s.competitor_launch_week || 0);
      if (weeksExposed > 0 && weeksExposed <= 4)
        this.s.market_fit = clamp(this.s.market_fit - sprintWeeks, 0, 100);
    }

    // Launch day: convert a fraction of the waitlist into active users, then clear it
    if (!wasLaunched && this.s.launched && this.s.waitlist > 0) {
      const rate = 0.25 + Math.random() * 0.15;
      const converted = Math.max(1, Math.round(this.s.waitlist * rate));
      this.s.users += converted;
      this.s.waitlist = 0;
      results.push(`${converted} people from your waitlist activated on launch day.`);
    }

    // Organic signups — word-of-mouth at high signal
    if (this.s.launched && this.s.signal >= 70)
      this.s.users += Math.floor((this.s.signal - 70) / 30) + 1;

    // Free-to-paid conversion (B2B freemium: 0.5–3% per sprint based on market fit)
    if (this.s.launched && this.s.users > 0) {
      const baseRate = this.s.market_fit < 30 ? 0.005 :
                       this.s.market_fit < 50 ? 0.01  :
                       this.s.market_fit < 70 ? 0.02  : 0.03;
      const rate = baseRate * (this.s.website_updated ? 1.3 : 1.0);
      const raw = this.s.users * rate;
      // Probabilistic rounding so small pools still convert
      const converted = Math.floor(raw) + (Math.random() < (raw % 1) ? 1 : 0);
      if (converted > 0) {
        this.s.users = Math.max(0, this.s.users - converted);
        this.s.customers += converted;
      }
    }

    // Free user churn: most free users disappear without re-engagement
    if (this.s.launched && this.s.users > 0) {
      const churnRate = this.s.market_fit < 40 ? 0.08 : 0.04;
      this.s.users = Math.max(0, this.s.users - Math.floor(this.s.users * churnRate));
    }

    // Paying customer churn: B2B customers are sticky; only lose one if PMF is very poor
    if (this.s.launched && this.s.market_fit < 30 && this.s.customers > 0) {
      this.s.customers--;
    }

    // Fire pending consequences
    const fired = this.pending.filter(p => p.fireWeek <= this.s.week);
    this.pending = this.pending.filter(p => p.fireWeek > this.s.week);
    for (const p of fired) {
      const char = p.charId ? this.chars.get(p.charId) : null;
      if (char && !char.active) continue;
      // Proposal B: dropCancel — explicit cancel; dropCondition — guard; both skip text AND fx
      if (p.cancel    && p.cancel(this.s, char))    continue;
      if (p.condition && !p.condition(this.s, char)) continue;
      const cashBefore = this.s.cash;
      p.fx(this.s, char, this);
      const cashDelta = this.s.cash - cashBefore;
      if (cashDelta !== 0) transactions.push({ label: p.text || `${p.from} — consequence`, delta: cashDelta, type: cashDelta > 0 ? 'income' : 'expense' });
      if (p.text) results.push(`${p.from}: "${p.text}"`);
    }

    // Clamp global state
    this.s.signal         = clamp(this.s.signal,         0, 100);
    this.s.market_fit     = clamp(this.s.market_fit,     0, 100);
    this.s.investor_warmth= clamp(this.s.investor_warmth,0, 100);
    this.s.cash           = clamp(this.s.cash,           0, 9999999);

    // YC decision — guard against re-scheduling after acceptance
    if (this.s.ycApplied && !this.s.ycAccepted && !this.s.ycDecisionWeek) this.s.ycDecisionWeek = this.s.week + 3;
    if (this.s.ycDecisionWeek && this.s.week >= this.s.ycDecisionWeek) {
      this.s.ycDecisionWeek = null;
      if (Math.random() < (this.s.ycQualified ? 0.18 : 0.04)) {
        this.s.ycAccepted = true; this.s.cash += 500000;
        transactions.push({ label: 'YC accepted — $500k investment', delta: 500000, type: 'income' });
        this.s.signal = clamp(this.s.signal + 25, 0, 100);
        results.push("YC accepted! $500k added. See you at kickoff.");
      } else {
        this.s.ycApplied = false;
        this.ycWeek = this.s.week + 12;
        results.push("YC: passing on this batch. Next window opens in ~12 weeks.");
      }
    }

    // B2B revenue: $50/customer/month (~$12/customer/week)
    this.s.revenue = this.s.customers * 50;

    if (this.s.cash <= 0) this.s.game_over = true;

    // Win conditions: YC acceptance OR angel round complete ($400K Marcus + $100K follower)
    if (!this.s.game_won) {
      if (this.s.ycAccepted) this.s.game_won = true;
      if (this.s.marcusCommitted && this.s.followerCommitted) this.s.game_won = true;
    }

    // Proposal A: record sprint in history (after full resolution)
    this.history.push({
      week:    sprintWeek,
      chosen:  chosen.map(d => d.id),
      dropped: dropped.map(d => d.id),
    });

    // Proposal C: emit events for major state transitions
    if (!wasLaunched && this.s.launched)                               this._emit('launch');
    if (wasAlexActive && !(this.chars.get('alex')?.active ?? false))   this._emit('alex.departed');
    if (!preMarcusCommitted   && this.s.marcusCommitted)               this._emit('marcus.committed');
    if (!preFollowerCommitted && this.s.followerCommitted)             this._emit('follower.committed');
    if (!preYCAccepted && this.s.ycAccepted)                           this._emit('yc.accepted');
    if (preYCApplied && !this.s.ycApplied && !this.s.ycAccepted)      this._emit('yc.rejected');

    return { results, sprintWeeks, transactions };
  }
}

// Node.js compatibility
if (typeof module !== 'undefined') module.exports = { Engine, CHARACTER_DEFS, WORLD };
