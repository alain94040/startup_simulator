// ─────────────────────────────────────────────────────────────────────────────
// engine.js — thin chat-simulation coordinator.
//
// The game is a week-by-week chat sim. Each week the player has 2 actions.
// An action = answering one open chat message (picking a suggested reply) or
// taking one journal action. Each character shows at most one message at a time
// (its single "slot").
//
// The engine does NOT decide what characters say. Each week it polls every
// active character — `def.next(s, char, engine)` if the role defines one, else
// the shared `defaultNext()` — and shows whatever the character returns. The
// character owns its own curation (`def.slice`), ranking (`card.urgency`),
// and its reaction to being ignored (it reads game state/history via the engine
// APIs: pick(), openCardId(), weeksWaiting(), answered(), plus s/chars/history).
// There is no engine-side allowlist, priority table, or drop subsystem.
//
// All content (message bodies, options, journal voice, intros, names) lives in
// roles/*.js. No DOM here. Dual export: Node (module.exports) + browser (window.Engine).
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

  // Weeks a *consequence-bearing* message waits unanswered before its dropFx/dropMsg
  // fires and it leaves the slot, so the character can move on. Consequence-free
  // cards (standing offers, the quiet-week fallback) ignore this — they sit until
  // answered. Cards override with `patience` (Infinity = never expire on time).
  const DEFAULT_PATIENCE = 3;

  class Engine {
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

      // open[charId] = { cardId, def, week } for that character's currently-open prompt.
      // One slot per character — a character shows at most one unanswered message.
      this.open = {};

      this.ycWeek = 10 + Math.floor(Math.random() * 8);
      this.alexDepartureRisk = false;
      this.pending = [];
      this.history = [];
      this.actionsLeft = 2;
      this.act1Complete = false;
      this.firedStamps = new Set();  // milestone stamps already placed
      this.log = [];       // flat event log (debugging / node tests)

      // Open the game: poll characters for week-1 messages without consuming a tick.
      this._poll();
    }

    // ── reusable APIs a character calls from its next() ─────────────────────────
    _resolveBody(def, char) {
      return (typeof def.body === "function") ? def.body(this.s, char, this) : def.body;
    }
    // Display name for a character — from the role def (content lives in roles/*.js).
    _name(charId) {
      const def = DEFS[charId];
      return (def && def.name) || charId;
    }
    // The cards a character has opted into (its own curation, declared in the role).
    sliceCards(def) {
      const cards = def.cards || [];
      return (def.slice || []).map(id => cards.find(c => c.id === id)).filter(Boolean);
    }
    // Slot rank: a `fallback` card (-1) only wins when nothing else is available;
    // otherwise the card's own `urgency` decides. There is a single ranking axis —
    // arc-continuation cards just use a higher urgency band (e.g. 11-23).
    _rankVal(card) {
      return card.fallback ? -1 : (this._urgency(card) || 0);
    }
    // Does card `a` outrank `b` for the single slot?
    _better(a, b) {
      return this._rankVal(a) > this._rankVal(b);
    }
    // Select-by-urgency API: the best currently-available card from `cards`, or null.
    pick(cards, char) {
      const avail = cards.filter(c => c.available(this.s, char, this));
      if (!avail.length) return null;
      avail.sort((a, b) => this._rankVal(b) - this._rankVal(a));
      return avail[0];
    }
    // ── awareness: lets a character read whether it was answered ────────────────
    openCardId(charId) {
      const o = this.open[charId];
      return o ? o.cardId : null;
    }
    weeksWaiting(charId) {
      const o = this.open[charId];
      return o ? this.s.week - o.week : 0;
    }
    answered(cardId) {
      return this.log.some(l => l.acted === cardId);
    }
    // Is this card the currently-open (unanswered) prompt for some character?
    isOpen(cardId) {
      return !!this._openByCard(cardId);
    }
    _openByCard(cardId) {
      for (const charId of this.order) {
        const o = this.open[charId];
        if (o && o.cardId === cardId) return { charId, def: o.def };
      }
      return null;
    }
    // ── default decision, used when a role defines no next() of its own ─────────
    // The character keeps offering its open card while it's still relevant; once
    // the moment passes (its window closed, or it was ignored past its patience)
    // the character reacts and moves on. A consequence-free standing offer may be
    // quietly out-ranked by a more important card.
    defaultNext(def, char) {
      const charId = def.id;
      const o = this.open[charId];
      if (o) {
        const card = o.def;
        const avail = card.available(this.s, char, this);
        const hasConseq = !!(card.dropFx || card.dropMsg);
        const patience = card.patience != null ? card.patience : DEFAULT_PATIENCE;
        const waited = this.s.week - o.week;
        if (avail && !(hasConseq && waited >= patience)) {
          if (!hasConseq) {
            const best = this.pick(this.sliceCards(def), char);
            if (best && best.id !== card.id && this._better(best, card)) return best;
          }
          return card; // still relevant — hold the slot, don't repost
        }
        // moment passed: the character reacts to not getting a response, then moves on
        this._reactIgnored(charId, card, char);
        return this.pick(this.sliceCards(def).filter(c => c.id !== card.id), char);
      }
      return this.pick(this.sliceCards(def), char);
    }
    // Apply a card's reaction when its moment passed unanswered. The reaction
    // content (dropFx / dropMsg) lives on the card in roles/*.js.
    _reactIgnored(charId, card, char) {
      this.log.push({ week: this.s.week, charId, ignored: card.id });
      if (card.dropCancel && card.dropCancel(this.s, char)) return;
      if (card.dropCondition && !card.dropCondition(this.s, char)) return;
      if (card.dropFx) { try { card.dropFx(this.s, char, this); } catch (_) { /* slice-tolerant */ } }
      if (card.dropMsg) {
        this.threads[charId].push({
          type: "incoming", cardId: card.id,
          from: card.dropFrom || this._name(charId),
          body: card.dropMsg, subtext: null,
          week: this.s.week, isNew: true, dropped: true,
        });
      }
    }

    // ── weekly poll: ask each character what (if anything) to say, then show it ──
    _poll() {
      // 1) unlock any inactive characters whose condition now passes
      for (const [id, char] of this.chars) {
        if (!char.active) {
          const def = DEFS[id];
          if (def && def.unlockCondition && def.unlockCondition(this.s, this)) {
            char.active = true;
            if (def.intro) {
              this.threads[id].push({
                type: "incoming", from: this._name(id),
                body: def.intro, week: this.s.week, isNew: true,
              });
            }
          }
        }
      }

      // 2) each active character decides its single message — via its own next()
      //    or the shared defaultNext(). The result becomes its slot this week:
      //    same id → left in place (no repost); new card → replaces it; null → silent.
      for (const charId of this.order) {
        const char = this.chars.get(charId);
        if (!char || !char.active) continue;
        const def = DEFS[charId];
        if (!def) continue;

        const card = def.next ? def.next(this.s, char, this) : this.defaultNext(def, char);
        const cur = this.open[charId];
        if (!card) { this.open[charId] = null; continue; }
        if (cur && cur.cardId === card.id) continue; // unchanged — don't repost

        this.open[charId] = { cardId: card.id, def: card, week: this.s.week };
        this.threads[charId].push({
          type: "incoming",
          cardId: card.id,
          from: card.from || this._name(charId),
          body: this._resolveBody(card, char),
          subtext: card.subtext || null,
          week: this.s.week,
          isNew: true,
        });
        this.log.push({ week: this.s.week, charId, surfaced: card.id });
      }
    }

    _urgency(def) {
      return (typeof def.urgency === "function") ? def.urgency(this.s, this.chars.get("alex")) : def.urgency;
    }

    // ── player action ───────────────────────────────────────────────────────────
    options(cardId) {
      const o = this._openByCard(cardId);
      if (!o) return [];
      const char = this.chars.get(o.charId);
      return (o.def.options || [])
        .filter(opt => !opt.available || opt.available(this.s, char, this))
        .map(opt => ({ key: opt.key, label: opt.label }));
    }

    /** Answer an open prompt. Returns the outcome text (or null). */
    act(cardId, optionKey) {
      const o = this._openByCard(cardId);
      if (!o) return null;
      if (this.actionsLeft <= 0) return null;

      const charId = o.charId;
      const char = this.chars.get(charId);
      const opts = o.def.options || [];
      const opt = opts.find(x => x.key === optionKey) || opts[0];
      if (!opt) return null;

      const outcome = opt.execute(this.s, char, this);

      // Echo the player's choice as a chat reply — but only for *dialogue* actions.
      // "Move" cards (own initiatives) and off-screen "ask" cards mark themselves
      // `chat: false`: they say nothing in the thread. Their story is told in the
      // journal outcome and (for asks) a delayed reply pushed onto `pending`.
      // (For the founder, the thread *is* the journal, so a dialogue reply renders
      // there as the ✓ choice line — that's the intended record.)
      const isDialogue = opt.chat !== false && o.def.chat !== false;
      if (isDialogue) {
        this.threads[charId].push({
          type: "reply",
          cardId,
          body: opt.reply || opt.label,
          week: this.s.week,
          isNew: true,
        });
      }
      if (outcome) {
        // Outcomes are narrated in the founder's journal, not the chat thread.
        // The chat stays pure dialogue; the journal is where the story is told,
        // retold in the founder's own first-person voice where we have one.
        this.threads.founder.push({
          type: "outcome",
          cardId,
          from: this._name(charId),
          sourceChar: charId === "founder" ? null : charId,
          body: this._voiced(charId, cardId, opt.key, outcome),
          week: this.s.week,
          isNew: true,
        });
      }

      this.open[charId] = null;  // answered — slot clears
      this.history.push({ week: this.s.week, chosen: [cardId] });
      this.actionsLeft--;
      this.log.push({ week: this.s.week, charId, acted: cardId, option: opt.key });

      // milestone: equity locked in
      if (this.s.jordan_equity && !this.act1Complete) {
        this.act1Complete = true;
      }

      // New messages (including arc continuations) surface at the next week
      // boundary in _poll(), not mid-week — answering never triggers an instant reply.

      this._checkStamps();

      return outcome;
    }

    // First-person journal retelling of an outcome. Content lives in the role
    // def's `voice` map (keyed "cardId|optionKey", or by "cardId"), falling back
    // to the raw execute() return when a card has no journal voice.
    _voiced(charId, cardId, optKey, fallback) {
      const map = (DEFS[charId] && DEFS[charId].voice) || null;
      if (!map) return fallback;
      const byOpt = map[cardId + "|" + optKey];
      if (byOpt != null) return byOpt;
      return map[cardId] != null ? map[cardId] : fallback;
    }

    // Place a rubber-stamp in the journal for any milestone that just flipped.
    _checkStamps() {
      const ctx = {};
      for (const [id, ch] of this.chars) ctx[id] = ch;
      const stamps = (DEFS.founder && DEFS.founder.milestones) || [];
      for (const st of stamps) {
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

      this._poll();
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
          const def = DEFS[id] || {};
          return {
            id,
            name: def.name || id,
            role: def.role || "",
            isJournal: id === "founder",
            preview: last ? this._preview(last) : "",
            hasAction: !!this.open[id],
            actionCardId: this.openCardId(id),
            empty: thread.length === 0,
          };
        });
    }
    _preview(entry) {
      const b = (entry.body || "").replace(/\s+/g, " ").trim();
      const tag = entry.type === "reply" ? "You: " : entry.type === "outcome" ? "" : "";
      return (tag + b).slice(0, 64);
    }

    // The hand: every currently-open slot that carries a real decision (has at
    // least one available option). This is the single action surface — people's
    // asks and the founder's own moves alike. Pure narration (intros, pending
    // texts, drop follow-ups) never enters `open[]`, so it's naturally excluded;
    // a card can also opt out explicitly with `notify: true`. Ordered by the
    // engine's surfacing order, then urgency-first within that.
    openActions() {
      const out = [];
      for (const charId of this.order) {
        const o = this.open[charId];
        if (!o) continue;
        const card = o.def;
        if (card.notify) continue;
        const opts = this.options(card.id);
        if (!opts.length) continue;
        const char = this.chars.get(charId);
        const def = DEFS[charId] || {};
        out.push({
          charId,
          cardId: card.id,
          name: card.from || def.name || charId,
          role: def.role || "",
          cat: card.cat || "e",
          chat: card.chat !== false,
          urgency: this._rankVal(card),
          body: this._resolveBody(card, char),
          subtext: card.subtext || null,
          options: opts,
          week: o.week,
        });
      }
      out.sort((a, b) => b.urgency - a.urgency);
      return out;
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
    module.exports = { Engine };
  } else {
    window.Engine = Engine;
  }
})();
