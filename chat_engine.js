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
        alex:    require("./roles/alex.js"),
        jordan:  require("./roles/jordan.js"),
        founder: require("./roles/founder.js"),
      }
    : {
        alex:    (typeof ROLES !== "undefined" ? ROLES.alex    : null),
        jordan:  (typeof ROLES !== "undefined" ? ROLES.jordan  : null),
        founder: (typeof ROLES !== "undefined" ? ROLES.founder : null),
      };

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
    ],
    jordan: [
      "jordan_equity_mention",
      "jordan_equity_counter_jordan",
      "jordan_equity_counter_both",
      "jordan_equity_split",
      "early_working_style",
      "early_pricing",
    ],
    founder: [
      "founder_landing",
      "founder_first_interviews",
      "founder_meetup",
      "founder_reflect", // quiet-week fallback
    ],
  };

  const META = {
    alex:    { name: "Alex",   initials: "A",  color: "#0b84ff", role: "Co-founder · CTO" },
    jordan:  { name: "Jordan", initials: "J",  color: "#34c759", role: "Co-founder · iOS" },
    founder: { name: "You",    initials: "Me", color: "#8e8e93", role: "Founder · Journal" },
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

    "jordan_equity_split|sign":
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
  };

  // Milestones that get a rubber-stamp on the journal page when they first flip.
  const STAMPS = [
    { key: "building",     cls: "green", label: "We're Building", test: (s, c) => !!(c.alex.flags.prototype_kicked) },
    { key: "incorporated", cls: "blue",  label: "Incorporated",   test: (s) => !!s.incorporated },
    { key: "equity",       cls: "red",   label: "Equity Signed",  test: (s) => !!s.jordan_equity },
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
        ["alex",    { archetypeId: "alex",    active: true, morale: 80, trust: 90, focus: "build", focusSprints: 0, flags: {} }],
        ["jordan",  { archetypeId: "jordan",  active: true, morale: 80, trust: 90, focus: "build", focusSprints: 0, flags: {} }],
        ["founder", { archetypeId: "founder", active: true, flags: {} }],
      ]);

      this.order = ["alex", "jordan", "founder"];

      // threads[charId] = ordered list of message entries shown in that chat.
      this.threads = { alex: [], jordan: [], founder: [] };

      // surfaced.get(cardId) = { def, charId, week } for currently-open prompts.
      this.surfaced = new Map();

      this.pending = [];   // delayed consequences (rarely used in this slice)
      this.history = [];   // a couple of founder cards read engine.history
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
          if (def && def.unlockCondition && def.unlockCondition(this.s, this)) char.active = true;
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
          const ap = a.priority ? 1 : 0, bp = b.priority ? 1 : 0;
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

      // A choice can immediately open the next beat in the same arc (e.g. the
      // equity proposal unlocking a counter). Surface it now so the thread
      // stays live, but it still costs a future action to answer.
      this._surfaceFollowups();

      this._checkStamps();

      return outcome;
    }

    _voiced(cardId, optKey, fallback) {
      return VOICE[cardId + "|" + optKey] || VOICE[cardId] || fallback;
    }

    // Place a rubber-stamp in the journal for any milestone that just flipped.
    _checkStamps() {
      const ctx = { alex: this.chars.get("alex"), jordan: this.chars.get("jordan") };
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
    // no longer have an open prompt — without advancing the week.
    _surfaceFollowups() {
      for (const charId of this.order) {
        const char = this.chars.get(charId);
        if (!char || !char.active || this._hasOpenFor(charId)) continue;
        const available = this._sliceCards(charId).filter(def => def.available(this.s, char, this));
        const nonFallback = available.filter(def => !def.fallback);
        const pool = nonFallback.length ? nonFallback : available;
        if (!pool.length) continue;
        pool.sort((a, b) => {
          const ap = a.priority ? 1 : 0, bp = b.priority ? 1 : 0;
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
