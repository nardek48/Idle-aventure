"use strict";
/* systems/talent-system.js — v3.327.0 : TalentManager, point de lecture unique des talents
   par classe (data/talent-trees.js). Conception Talents v1.1, lots T-1 et T-2.

   Points (T2, option B) : 1 par niveau de héros, PLAFONNÉS par acte (TALENT_CAP_BY_ACT,
   data/world-caps.js). Les niveaux au-delà du plafond sont « en réserve ». game.talentPoints
   reste tenu à jour (points disponibles) pour les anciens lecteurs.

   Les sept points d'appel du moteur (crochets) :
     1. coup reçu      -> onHeroStruck        (combat-engine enemyStrike)
     2. esquive        -> onHeroStruck        (même appel, ctx.evaded)
     3. critique       -> onHeroCrit          (combat-engine playerAttack, class-combat applyDamageAction)
     4. ennemi tué     -> onEnemyKilled       (combat-engine killEnemy)
     5. tick de brûlure-> rollDotCrit         (class-combat tickDoTRound)
     6. fin de défense -> onDefenseEnd        (class-combat onRoundEnd)
     7. calcul         -> heroDamageMult, basicGainMult, afterAction, gaugeBonus, bonusStrikeMult
   Plus onCombatStart (Sang chaud, Brasier en attente) et getStatBonuses (stats-system). */

var TalentManager = {
  _kitCache: {},

  /* ---------- Lecture de l'arbre ---------- */
  getClassId: function () {
    if (window.ClassCombatManager && typeof ClassCombatManager.getCurrentClassId === "function") {
      return ClassCombatManager.getCurrentClassId();
    }
    return null;
  },

  getTree: function (classId) {
    return (window.TALENT_TREES || {})[classId || this.getClassId()] || null;
  },

  /* Liste à plat : { node, zone: "trunk" | index de voie, path } */
  getNodes: function (classId) {
    var t = this.getTree(classId), out = [];
    if (!t) return out;
    t.trunk.forEach(function (n) { out.push({ node: n, zone: "trunk", path: null }); });
    t.paths.forEach(function (p, i) { p.nodes.forEach(function (n) { out.push({ node: n, zone: i, path: p }); }); });
    return out;
  },

  find: function (id, classId) {
    var list = this.getNodes(classId);
    for (var i = 0; i < list.length; i++) if (list[i].node.id === id) return list[i];
    return null;
  },

  rank: function (id) { return Number((game.talents && game.talents[id]) || 0); },
  has: function (id) { return this.rank(id) > 0; },
  maxRank: function (node) { return Number(node.maxRank || 1); },

  /* ---------- Points ---------- */
  spent: function () {
    var self = this;
    return this.getNodes().reduce(function (s, e) { return s + self.rank(e.node.id); }, 0);
  },
  earned: function () { return Math.max(0, Number(game.heroLevel || 1) - 1); },
  cap: function () {
    return (window.WorldCaps && typeof WorldCaps.getTalentActCap === "function") ? WorldCaps.getTalentActCap() : Infinity;
  },
  usable: function () { return Math.min(this.earned(), this.cap()); },
  available: function () { return Math.max(0, this.usable() - this.spent()); },
  reserve: function () { return Math.max(0, this.earned() - this.cap()); },

  trunkSpent: function () {
    var t = this.getTree(), self = this;
    return t ? t.trunk.reduce(function (s, n) { return s + self.rank(n.id); }, 0) : 0;
  },
  pathSpent: function (path) {
    var self = this;
    return path.nodes.reduce(function (s, n) { return s + (n.key ? 0 : self.rank(n.id)); }, 0);
  },

  /* Raison du refus d'un achat, ou null. `closed` = clé fermée par l'autre clé. */
  blockReason: function (id) {
    var e = this.find(id);
    if (!e) return "Talent introuvable.";
    var n = e.node, t = this.getTree();
    if (this.rank(id) >= this.maxRank(n)) return "Rang maximum atteint.";
    if (e.zone !== "trunk") {
      var gate = window.TALENT_TRUNK_GATE || 2;
      if (this.trunkSpent() < gate) return "Les voies s'ouvrent après " + gate + " points dans le tronc.";
      if (n.key) {
        var other = t.paths[1 - e.zone];
        var otherKey = other.nodes.filter(function (x) { return x.key; })[0];
        if (otherKey && this.has(otherKey.id)) return "Fermée : tu as choisi « " + otherKey.name + " ». Réinitialise pour changer.";
        var need = window.TALENT_KEY_GATE || 3;
        if (this.pathSpent(e.path) < need) return "Demande " + need + " nœuds de la voie " + e.path.name + ".";
      }
    }
    if (this.available() < 1) {
      if (this.earned() > this.spent() && this.spent() >= this.cap()) return "Plafond de l'acte atteint (" + this.cap() + " points).";
      return "Pas de point disponible.";
    }
    return null;
  },
  isClosed: function (id) { return /^Fermée/.test(this.blockReason(id) || ""); },
  canBuy: function (id) { return !this.blockReason(id); },
  hasAffordable: function () {
    var self = this;
    return this.available() > 0 && this.getNodes().some(function (e) { return self.canBuy(e.node.id); });
  },

  /* ---------- Achat et remise à zéro (T6 : gratuite, hors run) ---------- */
  runLockReason: function () {
    if (typeof heroLockReason === "function" && heroLockReason()) return heroLockReason();
    var busy = (game.dungeonRun && game.dungeonRun.active) || (game.huntRun && game.huntRun.active)
      || (game.adventureQuestRun && game.adventureQuestRun.active);
    return busy ? "Termine ta sortie en cours d'abord." : null;
  },

  buy: function (id) {
    if (window.heroLockToast && heroLockToast()) return false;
    var reason = this.blockReason(id);
    if (reason) {
      // v3.336.0 (F-2) : plafond de l'acte -> où s'ouvre le palier suivant
      if (/^Plafond de l'acte/.test(reason) && typeof showHowToToast === "function") showHowToToast(reason, "talentCap");
      else if (typeof showToast === "function") showToast(reason, 1800);
      return false;
    }
    var n = this.find(id).node;
    game.talents[id] = this.rank(id) + 1;
    this.afterChange();
    addLog("Talent appris : " + n.name + (this.maxRank(n) > 1 ? " (rang " + game.talents[id] + "/" + this.maxRank(n) + ")" : ""), "event");
    if (typeof showToast === "function") showToast(n.name, 1400);
    if (typeof vibrate === "function") vibrate([40, 20, 40]);
    if (typeof saveGame === "function") saveGame();
    if (typeof renderAll === "function") renderAll();
    return true;
  },

  respec: function () {
    var lock = this.runLockReason();
    if (lock) { if (typeof showToast === "function") showToast("🧭 " + lock, 1800); return false; }
    var n = this.spent();
    if (!n) { if (typeof showToast === "function") showToast("Aucun talent à réinitialiser", 1200); return false; }
    game.talents = {};
    this.afterChange();
    addLog("🔄 Talents réinitialisés (" + n + " point" + (n > 1 ? "s" : "") + " rendu" + (n > 1 ? "s" : "") + ")", "event");
    if (typeof showToast === "function") showToast("Talents réinitialisés", 1400);
    if (typeof saveGame === "function") saveGame();
    if (typeof renderAll === "function") renderAll();
    return true;
  },

  /* Remet tout d'aplomb après un changement (achat, remise à zéro, niveau, classe, chargement). */
  afterChange: function () {
    this.sync();
    this._kitCache = {};
    if (window.ClassCombatManager && typeof ClassCombatManager.ensureForCurrentClass === "function") {
      ClassCombatManager.ensureForCurrentClass(); // réaligne le max de ressource (Réserve)
    }
    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") StatsSystem.recalcStats();
  },

  /* Retire les talents d'une autre classe (changement de héros dans la même partie) et
     tient game.talentPoints à jour. Un surplus au-delà du plafond (outil d'admin) est laissé :
     il ne donne simplement plus de point disponible. */
  sync: function () {
    if (!game.talents || typeof game.talents !== "object") game.talents = {};
    var classId = this.getClassId();
    if (classId) {
      var valid = {};
      this.getNodes(classId).forEach(function (e) { valid[e.node.id] = e.node; });
      var self = this;
      Object.keys(game.talents).forEach(function (id) {
        if (!valid[id]) { delete game.talents[id]; return; }
        game.talents[id] = Math.min(self.maxRank(valid[id]), Math.max(0, Math.floor(Number(game.talents[id]) || 0)));
        if (!game.talents[id]) delete game.talents[id];
      });
    }
    game.talentPoints = this.available();
  },

  /* T10 : migration des anciennes sauvegardes (27 talents communs). Tous les points sont
     rendus, un message l'annonce une fois. Appelée par loadGame. */
  migrate: function () {
    if (game.talentsV2) return;
    var old = 0;
    Object.keys(game.talents || {}).forEach(function (id) { if (/^t_/.test(id)) old += Number(game.talents[id] || 0); });
    game.talents = {};
    game.talentsV2 = true;
    // courbe d'XP linéaire : le palier en cours est recalculé, le niveau atteint est gardé
    if (typeof getHeroXpRequiredForLevel === "function") game.heroXpToNext = getHeroXpRequiredForLevel(game.heroLevel || 1);
    delete game._frenzyTapCount;
    delete game._frenzyReady;
    if (old > 0 || Number(game.heroLevel || 1) > 1) game._talentsMigrationNotice = true;
  },

  showMigrationNotice: function () {
    if (!game._talentsMigrationNotice) return;
    delete game._talentsMigrationNotice;
    var msg = "Tes talents ont été refaits pour ta classe. Tes points t'attendent dans Héros › Talents.";
    addLog("🌱 " + msg, "event");
    if (typeof showToast === "function") showToast("🌱 " + msg, 4000);
  },

  /* ---------- Donnée : le kit modifié par les talents ---------- */
  modKit: function (classId, kit) {
    if (!kit || classId !== this.getClassId() || !game.talents) return kit;
    var self = this, mods = [];
    this.getNodes(classId).forEach(function (e) {
      if (self.has(e.node.id) && e.node.mods) mods = mods.concat(e.node.mods);
    });
    if (!mods.length) return kit;
    var key = classId + "|" + Object.keys(game.talents).sort().map(function (k) { return k + game.talents[k]; }).join(",");
    if (this._kitCache[key]) return this._kitCache[key];
    var out = JSON.parse(JSON.stringify(kit));
    mods.forEach(function (m) { self.applyMod(out, m); });
    this._kitCache = {};
    this._kitCache[key] = out;
    return out;
  },

  /* "actions.skill2.effects#enemyVulnerability.value" -> objet parent + clé finale. */
  applyMod: function (root, mod) {
    var parts = String(mod.path).split(".");
    var obj = root;
    for (var i = 0; i < parts.length - 1; i++) {
      obj = this.step(obj, parts[i]);
      if (!obj) return;
    }
    var last = parts[parts.length - 1];
    if (last.indexOf("#") !== -1) { obj = this.step(obj, last); return; }
    if (mod.push) {
      if (!Array.isArray(obj[last])) obj[last] = [];
      obj[last].push(JSON.parse(JSON.stringify(mod.push)));
    } else if ("set" in mod) {
      obj[last] = mod.set;
    }
  },
  step: function (obj, part) {
    var h = part.indexOf("#");
    if (h === -1) {
      if (obj[part] === undefined || obj[part] === null) obj[part] = {};
      return obj[part];
    }
    var list = obj[part.slice(0, h)], type = part.slice(h + 1);
    if (!Array.isArray(list)) return null;
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].type === type) return list[i];
    return null;
  },

  /* ---------- Stats (stats-system) ---------- */
  getStatBonuses: function () {
    var out = { hpPct: 0, critChance: 0 }, self = this;
    this.getNodes().forEach(function (e) {
      var r = self.rank(e.node.id);
      if (!r || !e.node.stats) return;
      if (e.node.stats.hpPct) out.hpPct += e.node.stats.hpPct * r;
      if (e.node.stats.critChance) out.critChance += e.node.stats.critChance * r;
    });
    return out;
  },

  /* ---------- Crochets ---------- */
  V: function (k) { return Number((window.TALENT_VALUES || {})[k] || 0); },

  addResource: function (amount) {
    var st = game.classResource;
    if (!st || !(amount > 0)) return;
    st.current = Math.min(Number(st.max || 100), Number(st.current || 0) + amount);
  },

  /* Ouverture d'un combat (nouveau spawn). */
  onCombatStart: function () {
    if (this.has("k_sang_chaud") && game.classResource) {
      game.classResource.current = Math.max(Number(game.classResource.current || 0), this.V("k_sang_chaud"));
    }
    if (game._talentBurnPending && game.enemy) {
      if (this.has("m_brasier") && !game.enemy.dot) game.enemy.dot = game._talentBurnPending;
      delete game._talentBurnPending;
    }
  },

  /* 1-2. Coup reçu par le héros. ctx : { enemy, taken, blocked, evaded, defenseType } */
  onHeroStruck: function (ctx) {
    if (!ctx) return;
    if (ctx.taken > 0 && this.has("k_rancune")) {
      this.addResource(Math.min(this.V("k_rancune_max"), Math.floor(ctx.taken * this.V("k_rancune_pct"))));
    }
    if (ctx.defenseType === "damageAbsorption" && ctx.blocked > 0) {
      game._talentAbsorbed = Number(game._talentAbsorbed || 0) + ctx.blocked;
      if (this.has("m_echo_barriere")) this.addResource(Math.floor(ctx.blocked * this.V("m_echo_pct")));
    }
    var alive = ctx.enemy && Number(ctx.enemy.hp || 0) > 0 && (game.heroHp || 0) > 0;
    if (alive && ctx.defenseType === "damageReduction" && ctx.blocked > 0 && this.has("k_riposte")) {
      var back = Math.floor(ctx.blocked * this.V("k_riposte_pct"));
      if (back > 0 && window.CombatEngine) {
        addLog("🛡️ Riposte : " + formatNumber(back) + " dégâts renvoyés", "normal");
        CombatEngine.dealDamage(back, false, false, true, ctx.enemy);
      }
    }
    if (ctx.evaded) {
      if (this.has("a_danse_ombres") && typeof CELERITY_GAUGE_MAX === "number") {
        game.heroGauge = Math.min(CELERITY_GAUGE_MAX - 0.01, Number(game.heroGauge || 0) + this.V("a_danse_gauge"));
      }
      if (this.has("a_contre_tir") && game.enemy && game.enemy.hp > 0 && (game.heroHp || 0) > 0 && window.CombatEngine) {
        addLog("🏹 Contre-tir !", "event");
        CombatEngine.playerAttack(true, 1);
      }
    }
  },

  /* 3. Coup critique du héros (attaque ou compétence). */
  onHeroCrit: function () {
    if (!this.has("a_tir_mortel") || !game.classCooldowns) return;
    var cd = game.classCooldowns.archer_piercing_shot;
    if (typeof cd === "number" && cd > 0) {
      if (cd - 1 > 0) game.classCooldowns.archer_piercing_shot = cd - 1;
      else delete game.classCooldowns.archer_piercing_shot;
    }
  },

  /* 4. Un ennemi tombe (avant tout le reste de killEnemy). */
  onEnemyKilled: function (enemy) {
    if (this.has("k_soif_bourreau")) this.addResource(this.V("k_soif_bourreau"));
    if (enemy && enemy.dot && this.has("m_brasier") && Number(enemy.dot.rounds || 0) > 0) {
      var burn = { perRound: enemy.dot.perRound, rounds: enemy.dot.rounds };
      var others = window.CombatActors ? CombatActors.aliveEnemies().filter(function (e) { return e !== enemy && e.hp > 0; }) : [];
      if (others.length) {
        if (!others[0].dot) { others[0].dot = burn; addLog("🔥 Brasier : la brûlure se propage", "normal"); }
      } else {
        game._talentBurnPending = burn; // prochain ennemi du même enchaînement
      }
    }
  },

  /* 5. Tick de brûlure : peut critiquer (Combustion). Retourne { dmg, isCrit }. */
  rollDotCrit: function (dmg) {
    if (!this.has("m_combustion") || !window.EquipmentManager) return { dmg: dmg, isCrit: false };
    var c = Math.max(0, EquipmentManager.effectiveCritChance() - (typeof getEnemyWillCritPenalty === "function" ? getEnemyWillCritPenalty() : 0));
    if (typeof chance === "function" && chance(c)) return { dmg: Math.floor(dmg * EquipmentManager.effectiveCritMult()), isCrit: true };
    return { dmg: dmg, isCrit: false };
  },

  /* 6. Fin de la défense de classe (Surcharge). `def` = l'état qui vient d'expirer. */
  onDefenseStart: function () { game._talentAbsorbed = 0; },
  onDefenseEnd: function (def) {
    var absorbed = Number(game._talentAbsorbed || 0);
    game._talentAbsorbed = 0;
    if (!def || def.effectType !== "damageAbsorption" || !this.has("m_surcharge")) return;
    var dmg = Math.floor(absorbed * this.V("m_surcharge_pct"));
    if (dmg > 0 && game.enemy && game.enemy.hp > 0 && window.CombatEngine) {
      addLog("💥 Surcharge : la Barrière explose (" + formatNumber(dmg) + ")", "event");
      CombatEngine.dealDamage(dmg, false, true, true, game.enemy);
    }
  },

  /* 7. Calculs. */
  heroDamageMult: function (action, target) {
    var m = 1, foe = target || game.enemy;
    if (this.has("m_surtension") && game.classResource && Number(game.classResource.current || 0) > this.V("m_surtension_seuil")) {
      m *= 1 + this.V("m_surtension");
    }
    if (action && action.id === "mage_arcane_nova" && foe && foe.dot && this.has("m_incendie")) m *= 1 + this.V("m_incendie");
    return m;
  },
  afterAction: function (action, target) {
    if (action && action.id === "mage_arcane_blast" && target && target.dot && this.has("m_attiser")) {
      target.dot.rounds = Number(target.dot.rounds || 0) + 1;
    }
  },
  basicGainMult: function () {
    var d = game.classActiveDefense;
    return (this.has("k_bastion") && d && d.effectType === "damageReduction" && d.roundsLeft > 0) ? this.V("k_bastion_rage_mult") : 1;
  },
  gaugeBonus: function () { return this.has("a_rythme") ? this.V("a_rythme") : 0; },
  bonusStrikeMult: function () { return this.has("a_transe") ? 1 + this.V("a_transe") : 1; }
};

/* Façades d'écran (onclick) et compat des anciens appelants. */
function buyTalentNode(id) { return TalentManager.buy(id); }
function respecTalents() {
  if (!TalentManager.spent()) return TalentManager.respec();
  var n = TalentManager.spent();
  var go = function () { TalentManager.respec(); };
  if (typeof showConfirmModal === "function") {
    showConfirmModal("Réinitialiser les talents ?", "C'est gratuit : tes " + n + " point" + (n > 1 ? "s" : "") + " te sont rendus.", "🔄", go);
  } else if (window.confirm("Réinitialiser les talents ?")) go();
}
function getTalentRespecCost() { return 0; }

window.TalentManager = TalentManager;
window.buyTalentNode = buyTalentNode;
window.respecTalents = respecTalents;
window.getTalentRespecCost = getTalentRespecCost;
