// ─────────────────────────────────────────────────────────────────────────────
// v2/engine.js — story-graph chat engine. No urgency, no hand-stamped weeks.
//
// The game is a week-by-week chat sim: characters text the founder, the player
// answers with reply chips (2 actions per week). This engine replaces the old
// urgency-ranked slot model with an explicit dependency graph:
//
//  - FACTS LEDGER. Every node resolution is recorded as (nodeId, outcome, week).
//    Being ignored is just another outcome ("@ignored"), so the ignored path is
//    a queryable edge in the story graph like any choice. Content never hand-rolls
//    "_done" flags or "*_week" stamps — it asks e.took()/e.done()/e.weeksSince().
//
//  - WHEN-CLAUSES decide when a node can surface:
//      when: {
//        after:  ["dev_plan"],            // AND: these nodes resolved (any outcome)
//        took:   ["dev_plan:full|lean"],  // AND: these outcomes taken ("a|b" = OR of
//                                         //   keys; an array entry = OR across specs)
//        not:    ["pivot:defer"],         // none of these outcomes taken
//        delay:  2,                       // weeks after the latest after/took dep
//        if:     (s, e, char) => bool,    // world-state escape hatch
//        cooldown: 5,                     // recurring: re-eligible n weeks after the
//      }                                  //   last resolution (default: fires once)
//
//  - ONE CONSEQUENCE VOCABULARY. A choice (or a timeout) carries `effects` (data)
//    and/or `fx` (escape hatch). `timeout: { weeks, when, unless, effects, fx, say }`
//    resolves the node as "@ignored" when its patience runs out or its moment
//    passes. `effects.schedule` queues delayed consequences.
//
//  - ARCS are ordered beat lists; a beat with no `when` of its own chains to the
//    previous beat. An arc with `scene: { cast: [...] }` is a war-room: entering it
//    (effects.scene = arcId) makes only its cast surface, its beats free of action
//    cost, and re-polls after each answer so the talk flows in one sitting.
//
//  - SCHEDULER. Per character, per week: the first eligible node by class —
//    scene beat > story beat > ambient > filler — then FIFO (earliest-eligible
//    first, then declaration order). An open node holds its slot until answered
//    or timed out; a node without a timeout is a standing offer and yields to a
//    higher-class node.
//
// All content lives in v2/cast.js + v2/story/*.js; the weekly economy lives in
// v2/world.js. No DOM here. Dual export: Node (module.exports) + browser
// (window.V2Engine, reading the V2CAST/V2STORY/V2WORLD globals).
// ─────────────────────────────────────────────────────────────────────────────

(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Deterministic RNG (mulberry32). The engine owns all randomness so a seed
  // reproduces a full game; content reaches it via e.rng().
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const DEPS = (typeof require !== "undefined")
    ? {
        cast: require("./cast.js"),
        world: require("./world.js"),
        story: [
          require("./story/opening.js"),
          require("./story/equity.js"),
          require("./story/dev_plan.js"),
          require("./story/team.js"),
          require("./story/dev_directions.js"),
          require("./story/demo_night.js"),
          require("./story/users.js"),
          require("./story/launch_day.js"),
          require("./story/slide.js"),
          require("./story/pivot_day.js"),
          require("./story/community.js"),
          require("./story/fundraising.js"),
          require("./story/growth.js"),
          require("./story/jordan_arc.js"),
          require("./story/discovery.js"),
          require("./story/press.js"),
          require("./story/ambient.js"),
        ],
      }
    : {
        cast: typeof V2CAST !== "undefined" ? V2CAST : [],
        world: typeof V2WORLD !== "undefined" ? V2WORLD : null,
        story: typeof V2STORY !== "undefined" ? V2STORY : [],
      };

  class Game {
    constructor(opts) {
      opts = opts || {};
      this.rng = mulberry32(opts.seed != null ? opts.seed : 1);

      this.s = {
        cash: 10000, week: 1, waitlist: 0, users: 0, customers: 0, revenue: 0,
        signal: 28, market_fit: 0, launched: false,
        incorporated: false, has_demo: false, productPhase: "proto",
        extra_burn: 0, saas: [], items: null, dev_plan: null,
        investor_warmth: 0, deck_ready: false,
        marcusCommitted: false, followerCommitted: false,
        yc_week: 25,
        beachhead: null, channels: {}, primary_channel: null,
        game_over: false, game_won: false,
      };

      // ── cast instances ──────────────────────────────────────────────────────
      this.cast = new Map();
      this.order = [];
      for (const def of DEPS.cast) {
        const st = def.start || {};
        this.cast.set(def.id, {
          def, active: !def.unlock,
          morale: st.morale != null ? st.morale : null,
          trust: st.trust != null ? st.trust : null,
          focus: st.focus || null,
          buildEffort: 0, flags: {},
        });
        this.order.push(def.id);
      }

      // ── story graph ─────────────────────────────────────────────────────────
      this.nodes = new Map();     // id -> node
      this.arcOf = new Map();     // nodeId -> arc
      this.arcs = new Map();      // arcId -> arc
      this.byChar = new Map();    // charId -> [node, ...]
      this._decl = new Map();     // nodeId -> declaration index (FIFO tiebreak)
      let decl = 0;
      const add = (node, arc) => {
        if (this.nodes.has(node.id)) throw new Error("duplicate node id: " + node.id);
        this.nodes.set(node.id, node);
        this._decl.set(node.id, decl++);
        if (arc) this.arcOf.set(node.id, arc);
        if (!this.byChar.has(node.char)) this.byChar.set(node.char, []);
        this.byChar.get(node.char).push(node);
      };
      for (const mod of DEPS.story) {
        for (const arc of mod.arcs || []) {
          this.arcs.set(arc.id, arc);
          let prev = null;
          for (const beat of arc.beats) {
            // A beat that declares no `when` of its own chains to the previous beat.
            if (!beat.when && prev) beat.when = { after: [prev.id] };
            add(beat, arc);
            prev = beat;
          }
        }
        for (const node of mod.nodes || []) add(node, null);
      }

      // ── runtime state ───────────────────────────────────────────────────────
      this.resolved = new Map();      // nodeId -> { outcome, week, count }
      this.eligibleSince = new Map(); // nodeId -> week it first became eligible
      this.threads = {};
      for (const id of this.order) this.threads[id] = [];
      this.open = {};                 // charId -> { nodeId, week } | null
      this.scene = null;              // active scene arc | null
      this.scheduled = [];            // { week, charId, ev }
      this.actionsLeft = 2;
      this.log = [];                  // flat event log (tests / debugging)
      this.ledger = []; this._weekTx = [];
      this.firedStamps = new Set();
      this._seq = 0;                  // monotonic stamp for merged transcripts

      this._poll();
      this._checkStamps();
    }

    // ── facts API (what content queries instead of hand-rolled flags) ─────────
    done(id) { return this.resolved.has(id); }
    outcome(id) { const r = this.resolved.get(id); return r ? r.outcome : null; }
    weekOf(id) { const r = this.resolved.get(id); return r ? r.week : null; }
    weeksSince(id) { const r = this.resolved.get(id); return r ? this.s.week - r.week : Infinity; }
    timesResolved(id) { const r = this.resolved.get(id); return r ? r.count : 0; }
    // "node" (resolved at all) or "node:key1|key2" (one of these outcomes taken).
    took(spec) {
      const i = spec.indexOf(":");
      if (i < 0) return this.done(spec);
      const r = this.resolved.get(spec.slice(0, i));
      return !!r && spec.slice(i + 1).split("|").includes(r.outcome);
    }
    _tookEntry(entry) { // an array entry means OR across specs
      return Array.isArray(entry) ? entry.some(sp => this.took(sp)) : this.took(entry);
    }
    _depIds(took) {
      const out = [];
      for (const entry of took || [])
        for (const sp of [].concat(entry)) out.push(sp.split(":")[0]);
      return out;
    }

    // Queue a delayed consequence from content: { in, char?, say?, effects?, fx?, unless? }
    schedule(ev) {
      this.scheduled.push({ week: this.s.week + (ev.in != null ? ev.in : 1), charId: ev.char || null, ev });
    }

    // ── eligibility & selection ────────────────────────────────────────────────
    _eligible(node) {
      const char = this.cast.get(node.char);
      if (!char || !char.active) return false;
      const w = node.when || {};
      const r = this.resolved.get(node.id);
      if (r && (w.cooldown == null || this.s.week < r.week + w.cooldown)) return false;
      if (w.after && !w.after.every(id => this.resolved.has(id))) return false;
      if (w.took && !w.took.every(e2 => this._tookEntry(e2))) return false;
      if (w.not && w.not.some(e2 => this._tookEntry(e2))) return false;
      if (w.delay != null) {
        const deps = (w.after || []).concat(this._depIds(w.took));
        let base = 1; // no deps: delay counts from the start of the game
        for (const id of deps) { const rr = this.resolved.get(id); if (rr && rr.week > base) base = rr.week; }
        if (this.s.week < base + w.delay) return false;
      }
      if (w.if && !w.if(this.s, this, char)) return false;
      return true;
    }
    _class(node) { return node.filler ? 0 : node.ambient ? 1 : 2; }
    _pick(cands) {
      if (!cands.length) return null;
      cands = cands.slice().sort((a, b) =>
        (this._class(b) - this._class(a))
        || ((this.eligibleSince.get(a.id) || 0) - (this.eligibleSince.get(b.id) || 0))
        || (this._decl.get(a.id) - this._decl.get(b.id)));
      return cands[0];
    }
    _candidates(charId) {
      const nodes = this.byChar.get(charId) || [];
      return nodes.filter(n =>
        (!this.scene || this.arcOf.get(n.id) === this.scene) && this._eligible(n));
    }

    // ── surfacing ──────────────────────────────────────────────────────────────
    _poll() {
      // 1) unlock characters whose condition now passes (suppressed mid-scene).
      if (!this.scene) for (const [id, char] of this.cast) {
        if (!char.active && char.def.unlock && char.def.unlock(this.s, this)) {
          char.active = true;
          if (char.def.intro) this._push(id, {
            type: "incoming", from: char.def.name,
            body: this._text(char.def.intro, char),
          });
        }
      }
      // 2) sweep eligibility for FIFO ordering.
      for (const [id, node] of this.nodes) {
        if (this._eligible(node)) {
          if (!this.eligibleSince.has(id)) this.eligibleSince.set(id, this.s.week);
        } else {
          this.eligibleSince.delete(id);
        }
      }
      // 3) per character: surface (or hold) its single slot.
      for (const charId of this.order) {
        const char = this.cast.get(charId);
        if (!char || !char.active) continue;
        // Mid-scene, non-cast characters are held in place untouched.
        if (this.scene && !this.scene.scene.cast.includes(charId)) continue;
        const cur = this.open[charId];
        const cands = this._candidates(charId);
        if (cur) {
          const curNode = this.nodes.get(cur.nodeId);
          const curInScene = this.scene && this.arcOf.get(cur.nodeId) === this.scene;
          if (this.scene && !curInScene) {
            // A scene displaces whatever was open; the displaced node was never
            // resolved, so it simply resurfaces once the scene ends.
            const best = this._pick(cands);
            if (best) this._show(charId, best);
            continue;
          }
          if (this.scene && curInScene && !this._stillRelevant(curNode)) {
            // Mid-scene, a beat whose moment passed (its `if` window closed while
            // the talk moved on) resolves right away so the sitting keeps flowing.
            this._resolveIgnored(charId, curNode);
            const best = this._pick(this._candidates(charId));
            if (best) this._show(charId, best);
            continue;
          }
          // A standing offer (no timeout = no consequence) yields to a higher class.
          if (!curNode.timeout) {
            const best = this._pick(cands.filter(n => n.id !== curNode.id));
            if (best && this._class(best) > this._class(curNode)) this._show(charId, best);
          }
          continue; // otherwise hold — don't repost
        }
        const best = this._pick(cands);
        if (best) this._show(charId, best);
      }
    }
    _show(charId, node) {
      const cur = this.open[charId];
      if (cur && cur.nodeId === node.id) return;
      const char = this.cast.get(charId);
      this.open[charId] = { nodeId: node.id, week: this.s.week };
      this._push(charId, {
        type: "incoming", nodeId: node.id,
        from: node.from || char.def.name,
        body: this._text(node.text, char),
        subtext: node.subtext || null,
        mockups: node.mockups || null,
        scene: this.arcOf.get(node.id) && this.arcOf.get(node.id).scene ? this.arcOf.get(node.id).id : null,
      });
      this.log.push({ week: this.s.week, charId, surfaced: node.id });
    }
    _push(charId, entry) {
      entry.week = this.s.week; entry.isNew = true; entry.seq = this._seq++;
      this.threads[charId].push(entry);
    }
    _text(v, char) { return typeof v === "function" ? v(this.s, this, char) : v; }

    // ── player action ──────────────────────────────────────────────────────────
    options(nodeId) {
      const hit = this._openByNode(nodeId);
      if (!hit) return [];
      const char = this.cast.get(hit.charId);
      return (this.nodes.get(nodeId).choices || [])
        .filter(c => !c.if || c.if(this.s, this, char))
        .map(c => ({ key: c.key, label: c.label }));
    }
    _openByNode(nodeId) {
      for (const charId of this.order) {
        const o = this.open[charId];
        if (o && o.nodeId === nodeId) return { charId };
      }
      return null;
    }

    /** Answer an open node. Returns the outcome text (or null). */
    act(nodeId, key) {
      const hit = this._openByNode(nodeId);
      if (!hit) return null;
      const charId = hit.charId;
      const char = this.cast.get(charId);
      const node = this.nodes.get(nodeId);
      const arc = this.arcOf.get(nodeId);
      const inSceneBefore = this.scene && arc === this.scene;
      if (this.actionsLeft <= 0 && !inSceneBefore) return null;
      const choice = (node.choices || [])
        .filter(c => !c.if || c.if(this.s, this, char))
        .find(c => c.key === key);
      if (!choice) return null;

      if (typeof choice.reply === "string" && !char.def.noChat) {
        this._push(charId, { type: "reply", nodeId, body: choice.reply });
      }

      const cashBefore = this.s.cash;
      let outcome = null;
      if (choice.effects) this._applyEffects(choice.effects, char, node);
      if (choice.fx) outcome = choice.fx(this.s, this, char) || null;
      this._tx(node.from || char.def.name, cashBefore);

      const journalBody = choice.journal !== undefined ? choice.journal : outcome;
      if (journalBody) {
        this._push("founder", {
          type: "outcome", nodeId,
          from: char.def.name, sourceChar: charId === "founder" ? null : charId,
          body: journalBody,
          mockup: node.mockups && node.mockups[choice.key] || null,
        });
      }

      this._record(node, choice.key);
      this.open[charId] = null;
      // Scene beats are free — including the answer that opens the scene.
      const free = inSceneBefore || (this.scene && arc === this.scene);
      if (!free) this.actionsLeft--;
      this.log.push({ week: this.s.week, charId, acted: nodeId, key: choice.key });

      // New messages surface at the week boundary — except mid-scene, where the
      // next beat lands immediately so the conversation flows in one sitting.
      if (this.scene) this._poll();
      this._checkStamps();
      return outcome;
    }

    _record(node, outcome) {
      const prev = this.resolved.get(node.id);
      this.resolved.set(node.id, { outcome, week: this.s.week, count: (prev ? prev.count : 0) + 1 });
    }

    // The node's moment passed unanswered: resolve as "@ignored" and fire the
    // timeout consequence (unless its `unless` guard suppresses it).
    _resolveIgnored(charId, node) {
      const char = this.cast.get(charId);
      this._record(node, "@ignored");
      this.open[charId] = null;
      this.log.push({ week: this.s.week, charId, ignored: node.id });
      const t = node.timeout || {};
      if (t.unless && t.unless(this.s, this, char)) return;
      const cashBefore = this.s.cash;
      if (t.effects) this._applyEffects(t.effects, char, node);
      if (t.fx) t.fx(this.s, this, char);
      this._tx((node.from || char.def.name) + " — missed", cashBefore);
      if (t.say) this._say(t.say, charId);
    }

    // ── effects vocabulary ─────────────────────────────────────────────────────
    _applyEffects(fx, char, node) {
      const s = this.s;
      if (fx.cash) s.cash = Math.max(0, s.cash + fx.cash);
      if (fx.signal) s.signal = clamp(s.signal + fx.signal, 0, 100);
      if (fx.marketFit) s.market_fit = clamp(s.market_fit + fx.marketFit, 0, 100);
      if (fx.warmth) s.investor_warmth = clamp(s.investor_warmth + fx.warmth, 0, 100);
      if (fx.waitlist) s.waitlist = Math.max(0, s.waitlist + fx.waitlist);
      if (fx.users) s.users = Math.max(0, s.users + fx.users);
      if (fx.customers) s.customers = Math.max(0, s.customers + fx.customers);
      if (fx.saas) { s.saas.push({ label: fx.saas.label, cost: fx.saas.cost }); s.extra_burn += fx.saas.cost; }
      if (fx.flags) Object.assign(s, fx.flags);
      if (fx.char) for (const id of Object.keys(fx.char)) {
        const c = this.cast.get(id);
        if (!c) continue;
        const d = fx.char[id];
        if (d.morale) c.morale = clamp((c.morale || 0) + d.morale, 0, 100);
        if (d.trust) c.trust = clamp((c.trust || 0) + d.trust, 0, 100);
        if (d.effort) {
          // Positive grants scale by the character's own multiplier (e.g. Alex
          // part-time); penalties land raw.
          const mult = d.effort > 0 && c.def.effortMult ? c.def.effortMult(s, c) : 1;
          c.buildEffort = Math.max(0, c.buildEffort + d.effort * mult);
        }
        if (d.focus) c.focus = d.focus;
        if (d.flags) Object.assign(c.flags, d.flags);
      }
      if (fx.say) this._say(fx.say, node && node.char);
      if (fx.schedule) for (const ev of [].concat(fx.schedule)) this.schedule(ev);
      if ("scene" in fx) this.scene = fx.scene ? this.arcs.get(fx.scene) : null;
    }
    // Public alias for content code that needs a conditional in-character
    // message mid-fx (e.g. pivot day's evidence-chip responses).
    say(spec) { this._say(spec); }
    _say(spec, fallbackCharId) {
      for (const m of [].concat(spec)) {
        const charId = m.char || fallbackCharId;
        const char = this.cast.get(charId);
        this._push(charId, {
          type: "incoming",
          from: m.from || (char ? char.def.name : charId),
          body: this._text(m.text, char),
          // a line spoken while a scene is running belongs to that scene, so the
          // focus UI can scope each private thread to its own sitting.
          scene: this.scene ? this.scene.id : null,
        });
      }
    }

    // Record a cash movement on this week's bank statement, if cash moved.
    _tx(label, before, opts) {
      const delta = this.s.cash - before;
      if (delta === 0) return;
      const o = opts || {};
      this._weekTx.push({
        label: label || (delta > 0 ? "Income" : "Expense"),
        note: o.note, delta,
        type: o.type || (delta > 0 ? "income" : "expense"),
      });
    }

    // ── weekly tick ────────────────────────────────────────────────────────────
    nextWeek() {
      const wk = this.s.week;
      this.s.cash = Math.max(0, this.s.cash - this.burnPerWeek);
      this._weekTx.push({ label: "Team & ops", note: "$500/wk", delta: -500, type: "burn" });
      for (const sub of this.s.saas) {
        this._weekTx.push({ label: sub.label, note: "$" + sub.cost + "/wk", delta: -sub.cost, type: "saas" });
      }
      this.s.week += 1;
      this.actionsLeft = 2;

      // Fire due scheduled consequences.
      const due = this.scheduled.filter(p => p.week <= this.s.week);
      this.scheduled = this.scheduled.filter(p => p.week > this.s.week);
      for (const p of due) {
        const ev = p.ev;
        const char = p.charId ? this.cast.get(p.charId) : null;
        if (char && !char.active) continue;
        if (ev.unless && ev.unless(this.s, this, char)) continue;
        const cashBefore = this.s.cash;
        if (ev.effects) this._applyEffects(ev.effects, char, { char: p.charId });
        if (ev.fx) ev.fx(this.s, this, char);
        this._tx("Consequence", cashBefore);
        if (ev.say) this._say(ev.say, p.charId);
      }

      // Weekly economy (passive contributions, build burn-down, growth, lose).
      if (DEPS.world) DEPS.world.tick(this);

      // Timeouts & window expiry on open nodes.
      for (const charId of this.order) {
        const o = this.open[charId];
        if (!o) continue;
        const node = this.nodes.get(o.nodeId);
        const waited = this.s.week - o.week;
        const windowClosed = !this._stillRelevant(node);
        if (node.timeout) {
          const t = node.timeout;
          if ((t.weeks != null && waited >= t.weeks)
            || (t.when && t.when(this.s, this))
            || windowClosed) this._resolveIgnored(charId, node);
        } else if (windowClosed) {
          this.open[charId] = null; // standing offer quietly withdrawn, unresolved
        }
      }

      this._poll();
      this._checkStamps();
      this.ledger.push({ week: wk, transactions: this._weekTx, balanceAfter: this.s.cash });
      this._weekTx = [];
    }
    // Is an already-open node's moment still live? Same as _eligible minus the
    // resolved/cooldown check (an open node is by definition unresolved).
    _stillRelevant(node) {
      const char = this.cast.get(node.char);
      if (!char || !char.active) return false;
      const w = node.when || {};
      if (w.if && !w.if(this.s, this, char)) return false;
      return true;
    }

    get burnPerWeek() { return 500 + (this.s.extra_burn || 0); }
    get runwayWeeks() { return Math.floor(this.s.cash / this.burnPerWeek); }

    // ── milestones (founder journal rubber-stamps) ─────────────────────────────
    _checkStamps() {
      const founder = this.cast.get("founder");
      const stamps = (founder && founder.def.milestones) || [];
      for (const st of stamps) {
        if (this.firedStamps.has(st.key)) continue;
        if (st.test(this.s, this)) {
          this.firedStamps.add(st.key);
          this._push("founder", { type: "stamp", stampKey: st.key, label: st.label, stampClass: st.cls });
        }
      }
    }

    // ── view helpers for the UI ────────────────────────────────────────────────
    conversations() {
      return this.order
        .filter(id => this.cast.get(id).active && !this.cast.get(id).def.noChat)
        .map(id => {
          const def = this.cast.get(id).def;
          const thread = this.threads[id];
          const last = thread.length ? thread[thread.length - 1] : null;
          return {
            id, name: def.name, role: def.role || "",
            isJournal: id === "founder",
            preview: last ? ((last.type === "reply" ? "You: " : "") + String(last.body || "").replace(/\s+/g, " ").trim()).slice(0, 64) : "",
            hasAction: !!this.open[id],
            actionNodeId: this.open[id] ? this.open[id].nodeId : null,
            empty: thread.length === 0,
            onHold: !!(this.scene && !this.scene.scene.cast.includes(id)),
          };
        });
    }
    openActions() {
      const out = [];
      for (const charId of this.order) {
        const o = this.open[charId];
        if (!o) continue;
        const node = this.nodes.get(o.nodeId);
        const opts = this.options(node.id);
        if (!opts.length) continue;
        const char = this.cast.get(charId);
        const arc = this.arcOf.get(node.id);
        out.push({
          charId, nodeId: node.id,
          name: node.from || char.def.name, role: char.def.role || "",
          noChat: !!char.def.noChat,
          kind: node.filler ? "filler" : node.ambient ? "ambient" : "story",
          body: this._text(node.text, char),
          subtext: node.subtext || null,
          options: opts, week: o.week,
          onHold: !!(this.scene && arc !== this.scene),
          scene: arc && arc.scene ? arc.id : null,
        });
      }
      return out;
    }
    stats() {
      return {
        week: this.s.week, cash: this.s.cash, runway: this.runwayWeeks,
        actionsLeft: this.actionsLeft,
        signal: Math.round(this.s.signal), marketFit: Math.round(this.s.market_fit),
        incorporated: this.s.incorporated,
        gameOver: this.s.game_over, gameWon: this.s.game_won,
        scene: this.scene ? this.scene.id : null,
      };
    }
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { Game };
  } else {
    window.V2Engine = Game;
  }
})();
