"use strict";
/* systems/combat-engine.js — v3.102.0 (P2) : moteur de combat PAR ROUNDS (LIGNE_DIRECTRICE §5, sim P1 combat-round-sim.js).
   Round = tour du héros (Attaque / compétence / Défense / Objet) → frappe bonus si jauge de célérité ≥ 100 → tour de l'ennemi
   (frappe, ou impact d'un pattern télégraphié au round précédent) → fin de round (cooldowns, statuts, DoT, mana passif).
   Deux modes : Tactique (attend le choix) et Grimoire (1 round / ROUND_INTERVAL_MS, l'auto-pilote choisit). Plus de tap ni d'auto-DPS. */

var RESIST_DMG_MULT = 0.85;   // v3.102.0 : 0,7 → 0,85 (P1 §D, résistances adoucies)
var WEAK_DMG_MULT = 1.15;     // v3.102.0 : 1,3 → 1,15
var NO_WEAPON_MULT = 0.8;

function getPlayerDamageType() {
  if (!game.equipped || !game.equipped.weapon) return null;
  var hero = (window.HEROES_DB && game.heroId) ? HEROES_DB[game.heroId] : null;
  return (hero && hero.weaponType) || null;
}

function getDamageAffinity() {
  if (!game.enemy) return { type: null, status: "neutral", mult: 1 };

  var type = getPlayerDamageType();
  if (!type) return { type: null, status: "unarmed", mult: NO_WEAPON_MULT };

  // v3.102.0 : les boss sont neutres (étalon de kit, décision §11) — ni résistance ni faiblesse.
  var resists = game.enemy.isBoss ? [] : (game.enemy.resists || []);
  var weak = game.enemy.isBoss ? [] : (game.enemy.weak || []);

  if (resists.indexOf(type) !== -1) return { type: type, status: "resist", mult: RESIST_DMG_MULT };
  if (weak.indexOf(type) !== -1) return { type: type, status: "weak", mult: WEAK_DMG_MULT };
  return { type: type, status: "neutral", mult: 1 };
}


var ENEMY_POWER_DMG_COEF = 0.5;
var BOSS_DMG_MULT = 1.5;      // v3.102.0 : dégâts des boss × 1,5 (calibration P1)
var ENEMY_PRECISION_CRIT_COEF = 0.3;
var ENEMY_CRIT_MULT = 1.5;
var WILL_CRIT_RESIST_COEF = 0.05;
var DEFEAT_GOLD_PENALTY = 0; // v3.101.0 (P3-lite) : la mort ne coûte plus d'or (LIGNE_DIRECTRICE §4) — le butin de sortie arrive en P2.1

var ROUND_INTERVAL_MS = 1500;         // tempo du mode Grimoire / « Continuer l'attaque » (× vitesse de combat)
var CELERITY_GAUGE_MAX = 100;
var CELERITY_GAUGE_PER_ACTION = 1.0;  // jauge héros += célérité × coef par action offensive
var ENEMY_CELERITY_GAUGE_COEF = 1.0;  // idem côté ennemi (le loup mord deux fois)
var FRENZY_ATTACKS_REQUIRED = 8;      // Frénésie d'assaut : toutes les 8 Attaques (ex 20 taps)

var ENEMY_CHARGE_ROUNDS_MIN = 3;      // ex 8-12 s → 3-5 rounds
var ENEMY_CHARGE_ROUNDS_MAX = 5;
var ENEMY_CHARGE_DMG_MULT = 1.3;

var BOSS_SHIELD_ROUNDS_MIN = 4;       // ex 10-15 s → 4-6 rounds
var BOSS_SHIELD_ROUNDS_MAX = 6;
var BOSS_SHIELD_DURATION_ROUNDS = 2;  // ex 4 000 ms
var BOSS_SHIELD_REDUCTION = 0.5;

var BOSS_HEAL_ROUNDS = 5;             // fixe, comme le sim P1
var BOSS_HEAL_PERCENT = 0.15;

var COUNTER_CONFIRMATION_ROUNDS = 1;

var COMBAT_MODES = ["tactique", "grimoire"];

function getEnemyWillCritPenalty() {
  var stats = game.enemy && game.enemy.stats;
  if (!stats) return 0;
  return Number(stats.will || 0) * WILL_CRIT_RESIST_COEF;
}

function showFloatingDamage(amount, isCrit) {
  var container = document.getElementById("enemy-display");
  if (!container) return;

  var el = document.createElement("div");
  el.className = "float-dmg " + (isCrit ? "crit" : "normal");
  el.textContent = (isCrit ? "💥 " : "") + formatNumber(amount);
  el.style.left = (45 + randFloat(-18, 18)) + "%";
  el.style.top = (26 + randFloat(-12, 12)) + "%";
  container.appendChild(el);

  setTimeout(function () {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 800);

  var emoji = document.getElementById("enemy-emoji");
  if (emoji) {
    emoji.classList.remove("hit-flash");
    void emoji.offsetWidth;
    emoji.classList.add("hit-flash");
  }
}

function showGoldPopup(amount) {
  var container = document.getElementById("enemy-display");
  if (!container) return;

  var el = document.createElement("div");
  el.className = "gold-popup";
  el.textContent = "+" + formatNumber(amount);
  el.style.left = "50%";
  el.style.top = "60%";
  container.appendChild(el);

  setTimeout(function () {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 1000);
}

function showDamageTakenPopup(amount) {
  var container = document.getElementById("combat-hero-mini");
  if (!container) return;

  var el = document.createElement("div");
  el.className = "damage-taken-popup";
  el.textContent = "-" + formatNumber(amount);
  el.style.left = "50%";
  el.style.top = "30%";
  container.appendChild(el);

  setTimeout(function () {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 1000);
}

function getConfiguredCounterSlotsForCondition(conditionId) {
  if (!window.ClassCombatManager || typeof ClassCombatManager.getCurrentClassId !== "function") return [];
  var classId = ClassCombatManager.getCurrentClassId();
  if (!classId || typeof getClassSkills !== "function") return [];
  var kit = getClassSkills(classId);
  if (!kit || !kit.actions) return [];

  var unlockedSlotCount = (typeof getGrimoireSlotCount === "function")
    ? getGrimoireSlotCount(game.worldsEverReached)
    : 2;
  var activeRules = (Array.isArray(game.grimoireRules) && game.grimoireRules.length)
    ? game.grimoireRules.slice(0, unlockedSlotCount)
    : [];

  var slots = [];
  activeRules.forEach(function (rule) {
    if (!rule || rule.conditionId !== conditionId || !rule.actionSlot) return;
    var action = kit.actions[rule.actionSlot];
    if (action && Array.isArray(action.counters) && action.counters.indexOf(conditionId) !== -1) {
      slots.push(rule.actionSlot);
    }
  });
  return slots;
}

function showCounterSuccessPopup() {
  var container = document.getElementById("enemy-display");
  if (!container) return;

  var el = document.createElement("div");
  el.className = "counter-success-popup";
  el.textContent = "⚡ CONTRÉ !";
  el.style.left = "50%";
  el.style.top = "18%";
  container.appendChild(el);

  setTimeout(function () {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 1400);

  var emoji = document.getElementById("enemy-emoji");
  if (emoji) {
    emoji.classList.remove("counter-flash");
    void emoji.offsetWidth;
    emoji.classList.add("counter-flash");
  }
}

var CombatEngine = {
  /* ---------- État de round ---------- */
  ensureState: function () {
    if (COMBAT_MODES.indexOf(game.combatMode) === -1) game.combatMode = "tactique";
    if (!game.combatRound || typeof game.combatRound !== "object") {
      game.combatRound = { number: 0, busy: false, continueAttack: false, clockMs: 0 };
    }
    if (typeof game.heroGauge !== "number" || !isFinite(game.heroGauge)) game.heroGauge = 0;
    if (typeof game.silencedRounds !== "number") game.silencedRounds = 0;
  },

  /* Initialise les compteurs de round d'un ennemi (paresseux : appelé au spawn et au premier tour). */
  prepareEnemy: function (enemy) {
    if (!enemy || enemy._roundReady) return enemy;
    enemy._roundReady = true;
    enemy.gauge = 0;
    enemy.roundsAlive = 0;
    enemy.chargeIn = randInt(ENEMY_CHARGE_ROUNDS_MIN, ENEMY_CHARGE_ROUNDS_MAX);
    enemy.chargeTelegraphed = false;
    enemy.silenceIn = randInt(ENEMY_CHARGE_ROUNDS_MIN, ENEMY_CHARGE_ROUNDS_MAX);
    enemy.silenceTelegraphed = false;
    enemy.shieldIn = randInt(BOSS_SHIELD_ROUNDS_MIN, BOSS_SHIELD_ROUNDS_MAX);
    enemy.shieldTelegraphed = false;
    enemy.shieldRounds = 0;
    enemy.healIn = BOSS_HEAL_ROUNDS;
    enemy.healTelegraphed = false;
    enemy.vulnerableRounds = 0;
    enemy.vulnerableMult = 0;
    enemy.counteredRounds = 0;
    // v3.105.0 : distance — face à un héros arc/magie, l'ennemi met engageIn rounds à arriver (épée = contact direct)
    var heroDef = (window.HEROES_DB && game.heroId) ? HEROES_DB[game.heroId] : null;
    var heroRanged = !!(heroDef && heroDef.weaponType && heroDef.weaponType !== "sword");
    enemy.engageIn = (heroRanged && typeof getEnemyEngageRounds === "function") ? getEnemyEngageRounds(enemy.id, !!enemy.isBoss) : 0;
    enemy.rageFreezeRounds = 0;
    enemy.vampiricSuppressedRounds = 0;
    enemy.armorSuppressedRounds = 0;
    enemy.corruptedStacks = 0;
    enemy.dot = null;
    return enemy;
  },

  setCombatMode: function (mode) {
    this.ensureState();
    if (COMBAT_MODES.indexOf(mode) === -1) return false;
    if (mode === "grimoire" && typeof isTabUnlocked === "function" && !isTabUnlocked("grimoire")) return false;
    game.combatMode = mode;
    game.combatRound.clockMs = 0;
    game.combatRound.continueAttack = false;
    game.autoSkillsEnabled = (mode === "grimoire"); // champ hérité, gardé en lecture pour les vues
    if (typeof renderCombatControls === "function") renderCombatControls();
    saveGame();
    return true;
  },

  toggleContinueAttack: function (force) {
    this.ensureState();
    var next = (typeof force === "boolean") ? force : !game.combatRound.continueAttack;
    game.combatRound.continueAttack = next;
    game.combatRound.clockMs = ROUND_INTERVAL_MS; // premier round immédiat
    game.combatRound._continueEnemyRef = next ? game.enemy : null;
    if (typeof renderCombatControls === "function") renderCombatControls();
    return next;
  },

  isHeroTurnAvailable: function () {
    this.ensureState();
    if (!game.enemy || !window.EquipmentManager) return false;
    if (game.activeTab !== "combat") return false;
    if (typeof isBlockingModalOpen === "function" && isBlockingModalOpen()) return false;
    if ((game.heroHp || 0) <= 0) return false;
    if (game.combatRound.busy) return false;
    return true;
  },

  /* Action suggérée par le Grimoire en mode Tactique (bouton surligné). */
  suggestAction: function () {
    if (!window.ClassCombatManager || typeof ClassCombatManager.chooseRoundAction !== "function") return "basic";
    if (!game.enemy || (game.heroHp || 0) <= 0) return "basic";
    var decision = ClassCombatManager.chooseRoundAction(false);
    return (decision && decision.slot) ? decision.slot : "basic";
  },

  /* ---------- Butin de sortie (v3.102.1) : en sortie, les gains vont dans game.sortie.loot, sinon directement dans la bourse ---------- */
  inSortie: function () {
    return !!(window.SortieManager && SortieManager.isActive());
  },

  grantGold: function (amount) {
    amount = Math.max(0, Math.floor(Number(amount) || 0));
    if (amount <= 0) return;
    if (this.inSortie()) { SortieManager.addGold(amount); return; }
    game.gold += amount;
    game.totalGoldEarned += amount;
    if (window.QuestManager && typeof QuestManager.track === "function") QuestManager.track("goldEarned", amount);
  },

  grantEssence: function (amount) {
    amount = Math.max(0, Number(amount) || 0);
    if (amount <= 0) return;
    if (this.inSortie()) SortieManager.addEssence(amount);
    else game.essence += amount;
  },

  /* Objet trouvé : rangé dans le butin de sortie (inventaire au retour) ou directement dans le sac. Retourne true si gardé. */
  grantDrop: function (drop) {
    if (!drop) return false;
    if (this.inSortie()) { SortieManager.addItem(drop); return true; }
    return typeof addDropToInventory === "function" ? addDropToInventory(drop) : false;
  },

  /* ---------- Un round complet ---------- */
  /* slot : "basic" | "skill1".."skill3" | "defense" | "potion" (arg = id de potion). source "auto" = Grimoire/Continuer.
     Retourne true si le round a été joué (l'action était valide). */
  heroAction: function (slot, arg, source) {
    if (!this.isHeroTurnAvailable()) return false;
    if (game.combatMode === "grimoire" && source !== "auto" && slot !== "potion") return false;

    // v3.102.1 : le premier round hors mission ouvre une sortie d'exploration (décision 1a)
    if (window.SortieManager && !SortieManager.isActive()) SortieManager.start(null);

    var round = game.combatRound;
    round.busy = true;
    round.number += 1;
    var enemyRef = game.enemy;

    var played = this.performHeroAction(slot, arg, source);
    if (!played) {
      round.number -= 1;
      round.busy = false;
      return false;
    }

    if (game.enemy === enemyRef && game.enemy && game.enemy.hp > 0 && (game.heroHp || 0) > 0) {
      this.enemyTurn();
    }

    this.endRound(enemyRef);
    round.busy = false;
    round.clockMs = 0;

    if (typeof renderClassSkillButtons === "function") renderClassSkillButtons();
    if (typeof renderCombatControls === "function") renderCombatControls();
    if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
    if (typeof renderHealButtons === "function") renderHealButtons();
    return true;
  },

  performHeroAction: function (slot, arg, source) {
    if (slot === "basic") {
      this.playerAttack(false);
      this.afterOffensiveAction();
      return true;
    }
    if (slot === "skill1" || slot === "skill2" || slot === "skill3" || slot === "defense") {
      if (!window.ClassCombatManager) return false;
      var action = ClassCombatManager.getAction(slot);
      var ok = (source === "auto")
        ? ClassCombatManager.useSkill(slot, arg && arg.matchedConditionId ? arg.matchedConditionId : null)
        : ClassCombatManager.useSkillManual(slot);
      if (!ok) return false;
      if (action && action.type === "damage") this.afterOffensiveAction();
      return true;
    }
    if (slot === "potion") {
      if (!window.PotionManager || typeof PotionManager.useHealingPotion !== "function") return false;
      if (window.SortieManager && !SortieManager.canUsePotion()) {
        showToast("🧪 Plus de potion pour cette sortie (" + SORTIE_POTION_CAP + " max)", 1500);
        return false;
      }
      if (PotionManager.useHealingPotion(arg) !== true) return false; // consomme le tour (décision §10 n°10)
      if (window.SortieManager) SortieManager.notePotion();
      return true;
    }
    return false;
  },

  /* Jauge de célérité : chaque action offensive la remplit ; à 100, frappe bonus avant le tour ennemi. */
  getTotalCelerity: function () {
    var hero = typeof getHeroByGameId === "function" ? getHeroByGameId(game.heroId) : null;
    var baseCelerity = (hero && hero.stats) ? Number(hero.stats.celerity) || 0 : 0;
    var trainedCelerity = (game.trainedStats && game.trainedStats.celerity) || 0;
    return (baseCelerity + trainedCelerity + Number(game.bonusCelerity || 0)) * Number(game.celerityMult || 1);
  },

  getGaugeGainPerAction: function () {
    var talentMult = 1 + 0.15 * Number((game.talents && game.talents.t_auto_tap) || 0); // Main spectrale reconvertie
    return this.getTotalCelerity() * CELERITY_GAUGE_PER_ACTION * talentMult;
  },

  afterOffensiveAction: function () {
    this.ensureState();
    game.heroGauge += this.getGaugeGainPerAction();
    if (game.heroGauge >= CELERITY_GAUGE_MAX) {
      game.heroGauge -= CELERITY_GAUGE_MAX;
      if (game.enemy && game.enemy.hp > 0) {
        var bonusMult = 1 + 0.12 * Number((game.talents && game.talents.t_battle_trance) || 0); // Transe de bataille reconvertie
        this.playerAttack(true, bonusMult);
        addLog("⚡ Frappe bonus (jauge de célérité pleine) !", "event");
      }
    }
  },

  /* Attaque de base : formule inchangée (dégâts d'arme + classe + talents + crit), sans cooldown. */
  playerAttack: function (isBonus, extraMult) {
    if (!game.enemy || !window.EquipmentManager) return;
    if ((game.heroHp || 0) <= 0) return;

    var classBasicMult = (window.ClassCombatManager && typeof ClassCombatManager.getBasicAttackMultiplier === "function")
      ? ClassCombatManager.getBasicAttackMultiplier()
      : 1;

    var dmg = Math.max(1, Math.floor(EquipmentManager.effectiveTapDamage() * classBasicMult * (extraMult || 1)));
    var critChance = Math.max(0, EquipmentManager.effectiveCritChance() - getEnemyWillCritPenalty());
    var isCrit = chance(critChance);

    if (isCrit) {
      dmg = Math.floor(dmg * EquipmentManager.effectiveCritMult());
      if (window.QuestManager && typeof QuestManager.track === "function") QuestManager.track("crits", 1);
    }

    if (game.enemy.isBoss && game.talents.t_war_instinct) dmg = Math.floor(dmg * (1 + 0.05 * game.talents.t_war_instinct));
    if (game.enemy.isBoss && game.talents.t_boss_slayer) dmg = Math.floor(dmg * (1 + 0.08 * game.talents.t_boss_slayer));

    if (game.talents.t_assault_frenzy && !isBonus) {
      if (game._frenzyReady) {
        dmg = Math.floor(dmg * (1 + 0.25 * game.talents.t_assault_frenzy));
        game._frenzyReady = false;
        showToast("💥 Frénésie d'assaut !", 1000);
      }
      game._frenzyTapCount = (game._frenzyTapCount || 0) + 1;
      if (game._frenzyTapCount >= FRENZY_ATTACKS_REQUIRED) {
        game._frenzyTapCount = 0;
        game._frenzyReady = true;
      }
    }

    this.dealDamage(dmg, isCrit, true);

    if (window.ClassCombatManager && typeof ClassCombatManager.onBasicAttackDealt === "function") {
      ClassCombatManager.onBasicAttackDealt(dmg, isCrit);
    }
  },

  /* ---------- Tour de l'ennemi ---------- */
  enemyTurn: function () {
    var e = game.enemy;
    if (!e || !e.stats) return;
    if ((game.heroHp || 0) <= 0) return;
    this.prepareEnemy(e);
    e.roundsAlive += 1;

    // Statuts posés PENDANT un tour ennemi (bouclier, silence) : décomptés ici, au tour ennemi suivant,
    // pour couvrir exactement N tours du héros (le décompte de fin de round les rognerait d'un round).
    if (e.shieldRounds > 0) e.shieldRounds -= 1;
    if (game.silencedRounds > 0) game.silencedRounds -= 1;

    var impact = false;
    if (e.isBoss) {
      if (e.healTelegraphed) { this.resolveBossHeal(); impact = true; }
      else if (e.shieldTelegraphed) { this.resolveBossShield(); impact = true; }
    } else if (e.archetype === "silenced") {
      if (e.silenceTelegraphed) { this.resolveSilenceCast(); impact = true; }
    } else if (e.archetype === "shielded") {
      // v3.104.1 (P5) : bouclier réutilisé sur un ennemi normal (identité, pas seulement boss) — mêmes champs/résolveur.
      if (e.shieldTelegraphed) { this.resolveBossShield(); impact = true; }
    } else if (e.chargeTelegraphed) {
      this.resolveEnemyCharge(); impact = true;
    }

    if (impact) return; // le compte à rebours relancé démarre au round suivant

    // v3.105.0 : approche — l'ennemi avance au lieu de frapper ; sa jauge se remplit (il arrive « lancé »)
    // et ses compte à rebours de pattern tournent (un télégraphe peut tomber pendant l'approche).
    if (Number(e.engageIn || 0) > 0) {
      e.engageIn -= 1;
      e.gauge = Number(e.gauge || 0) + this.getEnemyGaugeGain(e);
      if (e.engageIn > 0) addLog("👣 " + e.name + " avance vers toi… (contact dans " + e.engageIn + " round" + (e.engageIn > 1 ? "s" : "") + ")", "event");
      else addLog("👣 " + e.name + " arrive au contact !", "event");
      this.tickEnemyTelegraphs(e);
      if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
      return;
    }

    this.enemyStrike(1, false);
    if ((game.heroHp || 0) <= 0 || game.enemy !== e) return;

    this.tickEnemyTelegraphs(e);
  },

  /* Compte à rebours des patterns : télégraphe au round N (badge + log), impact au round N+1 (remplace la frappe). */
  tickEnemyTelegraphs: function (e) {
    if (e.isBoss) {
      if (e.healTelegraphed || e.shieldTelegraphed) return; // un seul télégraphe à la fois
      e.healIn -= 1;
      e.shieldIn -= 1;
      if (e.healIn <= 0) this.telegraphPattern(e, "heal");
      else if (e.shieldIn <= 0) this.telegraphPattern(e, "shield");
      return;
    }
    if (e.archetype === "silenced") {
      if (e.silenceTelegraphed) return;
      e.silenceIn -= 1;
      if (e.silenceIn <= 0) this.telegraphPattern(e, "silence");
      return;
    }
    if (e.archetype === "shielded") {
      // v3.104.1 (P5) : Troll des forêts — bouclier au lieu de charge, mêmes champs que le bouclier boss.
      if (e.shieldTelegraphed) return;
      e.shieldIn -= 1;
      if (e.shieldIn <= 0) this.telegraphPattern(e, "shield");
      return;
    }
    if (e.chargeTelegraphed) return;
    e.chargeIn -= 1;
    if (e.chargeIn <= 0) this.telegraphPattern(e, "charge");
  },

  telegraphPattern: function (e, kind) {
    var info = {
      charge: { flag: "chargeTelegraphed", cond: "chargeIncoming", log: "⚠️ " + e.name + " prépare une charge !", toast: "⚠️ Charge au prochain tour !" },
      silence: { flag: "silenceTelegraphed", cond: "enemySilenceIncoming", log: "🔇 " + e.name + " se prépare à te réduire au silence !", toast: "🔇 Silence au prochain tour !" },
      shield: { flag: "shieldTelegraphed", cond: "shieldIncoming", log: "🛡️ " + e.name + " invoque un bouclier !", toast: "🛡️ Bouclier au prochain tour !" },
      heal: { flag: "healTelegraphed", cond: "healIncoming", log: "💚 " + e.name + " se prépare à se soigner !", toast: "💚 Soin au prochain tour !" }
    }[kind];
    if (!info) return;
    e[info.flag] = true;
    addLog(info.log, "event");
    showToast(info.toast, 1200);
    if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
    if (window.CombatReportManager) {
      getConfiguredCounterSlotsForCondition(info.cond).forEach(function (s) {
        CombatReportManager.logTelegraphSeen(s);
      });
    }
  },

  /* Après un contre réussi (ClassCombatManager) : le pattern est annulé et son compte à rebours repart. */
  rescheduleCounteredPattern: function (conditionId) {
    var e = game.enemy;
    if (!e) return;
    if (conditionId === "chargeIncoming") { e.chargeTelegraphed = false; e.chargeIn = randInt(ENEMY_CHARGE_ROUNDS_MIN, ENEMY_CHARGE_ROUNDS_MAX); }
    else if (conditionId === "enemySilenceIncoming") { e.silenceTelegraphed = false; e.silenceIn = randInt(ENEMY_CHARGE_ROUNDS_MIN, ENEMY_CHARGE_ROUNDS_MAX); }
    else if (conditionId === "shieldIncoming") { e.shieldTelegraphed = false; e.shieldIn = randInt(BOSS_SHIELD_ROUNDS_MIN, BOSS_SHIELD_ROUNDS_MAX); }
    else if (conditionId === "healIncoming") { e.healTelegraphed = false; e.healIn = BOSS_HEAL_ROUNDS; }
    e.counteredRounds = COUNTER_CONFIRMATION_ROUNDS;
  },

  resolveEnemyCharge: function () {
    var e = game.enemy;
    if (!e) return;
    if (window.CombatReportManager) {
      getConfiguredCounterSlotsForCondition("chargeIncoming").forEach(function (s) { CombatReportManager.logCounterExpired(s); });
    }
    e.chargeTelegraphed = false;
    e.chargeIn = randInt(ENEMY_CHARGE_ROUNDS_MIN, ENEMY_CHARGE_ROUNDS_MAX);
    e.engageIn = 0; // v3.105.0 : la charge le porte au contact
    addLog("💢 " + e.name + " charge !", "event");
    this.enemyStrike(ENEMY_CHARGE_DMG_MULT, true);
    if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
  },

  resolveSilenceCast: function () {
    var e = game.enemy;
    if (!e) return;
    if (window.CombatReportManager) {
      getConfiguredCounterSlotsForCondition("enemySilenceIncoming").forEach(function (s) { CombatReportManager.logCounterExpired(s); });
    }
    e.silenceTelegraphed = false;
    e.silenceIn = randInt(ENEMY_CHARGE_ROUNDS_MIN, ENEMY_CHARGE_ROUNDS_MAX);
    game.silencedRounds = (typeof SILENCE_DURATION_ROUNDS === "number") ? SILENCE_DURATION_ROUNDS : 2;
    addLog("🔇 Tu es réduit au silence ! Tes techniques sont bloquées " + game.silencedRounds + " rounds.", "event");
    showToast("🔇 Silencié !", 1400);
    if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
  },

  resolveBossShield: function () {
    var e = game.enemy;
    if (!e) return;
    if (window.CombatReportManager) {
      getConfiguredCounterSlotsForCondition("shieldIncoming").forEach(function (s) { CombatReportManager.logCounterExpired(s); });
    }
    e.shieldTelegraphed = false;
    e.shieldIn = randInt(BOSS_SHIELD_ROUNDS_MIN, BOSS_SHIELD_ROUNDS_MAX);
    e.shieldRounds = BOSS_SHIELD_DURATION_ROUNDS;
    addLog("🛡️ Le bouclier se referme (" + BOSS_SHIELD_DURATION_ROUNDS + " rounds) !", "event");
    if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
  },

  resolveBossHeal: function () {
    var e = game.enemy;
    if (!e) return;
    if (window.CombatReportManager) {
      getConfiguredCounterSlotsForCondition("healIncoming").forEach(function (s) { CombatReportManager.logCounterExpired(s); });
    }
    e.healTelegraphed = false;
    e.healIn = BOSS_HEAL_ROUNDS;
    var healAmount = Math.max(1, Math.floor(Number(e.hp || 0) * BOSS_HEAL_PERCENT));
    e.hp = Math.min(e.maxHp, e.hp + healAmount);
    addLog("💚 " + e.name + " récupère " + formatNumber(healAmount) + " PV !", "event");
    showToast("💚 +" + formatNumber(healAmount) + " PV boss", 1200);
    if (typeof renderEnemyHp === "function") renderEnemyHp();
    if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
  },

  getEnemyGaugeGain: function (e) {
    return Number((e && e.stats && e.stats.celerity) || 0) * ENEMY_CELERITY_GAUGE_COEF;
  },

  /* Condition Grimoire « enemyAttackIncoming » : la prochaine frappe ennemie sera doublée (jauge pleine). */
  enemyDoubleStrikeNext: function () {
    var e = game.enemy;
    if (!e) return false;
    this.prepareEnemy(e);
    return (Number(e.gauge || 0) + this.getEnemyGaugeGain(e)) >= CELERITY_GAUGE_MAX;
  },

  enemyStrike: function (dmgMult, isPatternOrBonus) {
    var e = game.enemy;
    if (!e || !e.stats) return;
    if ((game.heroHp || 0) <= 0) return;
    this.prepareEnemy(e);

    var power = Number(e.stats.power || 0);
    var precision = Number(e.stats.precision || 0);

    if (window.AfflictionManager && typeof AfflictionManager.getCombinedModifiers === "function") {
      power *= AfflictionManager.getCombinedModifiers().enemyPowerMult;
    }

    var dmg = Math.max(1, Math.floor(power * ENEMY_POWER_DMG_COEF * (e.isBoss ? BOSS_DMG_MULT : 1)));
    var patternMult = (typeof dmgMult === "number" && dmgMult > 0) ? dmgMult : 1;
    if (patternMult !== 1) dmg = Math.max(1, Math.floor(dmg * patternMult));

    if (e.archetype === "enraged" && typeof getEnragedDamageMultiplier === "function") {
      var enragedMult = getEnragedDamageMultiplier(this.getEnragedEffectivePctHpLost());
      if (enragedMult !== 1) {
        var preEnragedDmg = dmg;
        dmg = Math.max(1, Math.floor(dmg * enragedMult));
        if (window.CombatReportManager) CombatReportManager.logArchetypeImpact("enragedBonusDamageTaken", dmg - preEnragedDmg);
      }
    }

    var isCrit = chance(Math.min(40, precision * ENEMY_PRECISION_CRIT_COEF));
    if (isCrit) dmg = Math.floor(dmg * ENEMY_CRIT_MULT);

    var activeDefense = window.ClassCombatManager && typeof ClassCombatManager.getActiveDefenseEffect === "function"
      ? ClassCombatManager.getActiveDefenseEffect()
      : null;
    var defenseCapNow = activeDefense ? 0.85 : 0.6;
    var defense = Math.min(defenseCapNow, Number(game.heroDefensePct || 0));
    dmg = Math.max(1, Math.floor(dmg * (1 - defense)));

    if (activeDefense) {
      if (activeDefense.effectType === "damageReduction" || activeDefense.effectType === "damageAbsorption") {
        dmg = Math.max(0, Math.floor(dmg * (1 - activeDefense.value)));
      } else if (activeDefense.effectType === "evasion") {
        if (chance(activeDefense.value * 100)) dmg = 0;
      }
    }

    game.heroHp = Math.max(0, Number(game.heroHp != null ? game.heroHp : game.heroMaxHp || 1) - dmg);

    if (e.archetype === "vampiric" && dmg > 0 && typeof getVampiricLifestealAmount === "function") {
      if (!(Number(e.vampiricSuppressedRounds || 0) > 0)) {
        var healed = getVampiricLifestealAmount(dmg);
        if (healed > 0) {
          e.hp = Math.min(e.maxHp, Number(e.hp || 0) + healed);
          if (window.CombatReportManager) CombatReportManager.logArchetypeImpact("vampiricHealStolen", healed);
          if (typeof renderEnemyHp === "function") renderEnemyHp();
        }
      }
    }

    if (e.archetype === "corrupted") {
      e.corruptedStacks = Math.min(
        (typeof CORRUPTED_MAX_STACKS === "number" ? CORRUPTED_MAX_STACKS : 5),
        Number(e.corruptedStacks || 0) + 1
      );
      if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
    }

    showDamageTakenPopup(dmg);
    if (typeof renderHeroHp === "function") renderHeroHp();

    if (game.heroHp <= 0) { this.onHeroDefeated(); return; }

    // Jauge de célérité ennemie : une frappe ordinaire la remplit ; pleine → seconde frappe immédiate.
    if (!isPatternOrBonus) {
      e.gauge = Number(e.gauge || 0) + this.getEnemyGaugeGain(e);
      if (e.gauge >= CELERITY_GAUGE_MAX) {
        e.gauge -= CELERITY_GAUGE_MAX;
        addLog("⚡ " + e.name + " enchaîne une seconde frappe !", "event");
        this.enemyStrike(1, true);
      }
    }
  },

  /* ---------- Fin de round ---------- */
  endRound: function (enemyRef) {
    this.ensureState();
    if (window.ClassCombatManager && typeof ClassCombatManager.onRoundEnd === "function") ClassCombatManager.onRoundEnd();

    var e = game.enemy;
    if (!e || e !== enemyRef || e.hp <= 0) return;
    this.prepareEnemy(e);

    // DoT (Brûlure arcanique) : peut tuer → killEnemy → nouvel ennemi, on s'arrête là.
    if (window.ClassCombatManager && typeof ClassCombatManager.tickDoTRound === "function") ClassCombatManager.tickDoTRound();
    if (game.enemy !== e) return;

    if (e.vulnerableRounds > 0) e.vulnerableRounds -= 1;
    if (e.counteredRounds > 0) e.counteredRounds -= 1;
    if (e.rageFreezeRounds > 0) e.rageFreezeRounds -= 1;
    if (e.vampiricSuppressedRounds > 0) e.vampiricSuppressedRounds -= 1;
    if (e.armorSuppressedRounds > 0) e.armorSuppressedRounds -= 1;
  },

  /* ---------- Horloge des modes automatiques (appelée par game-loop, dt déjà × vitesse) ---------- */
  tickRoundClock: function (dt) {
    this.ensureState();
    var round = game.combatRound;
    var auto = game.combatMode === "grimoire";
    if (!auto && !round.continueAttack) return;
    if (!this.isHeroTurnAvailable()) return;

    round.clockMs += Math.max(0, Number(dt || 0)) * 1000;
    if (round.clockMs < ROUND_INTERVAL_MS) return;
    round.clockMs = 0;

    if (round.continueAttack) {
      if (this.shouldStopContinueAttack()) {
        round.continueAttack = false;
        showToast("⏸️ Attaque interrompue : un choix s'impose", 1200);
        if (typeof renderCombatControls === "function") renderCombatControls();
        return;
      }
      this.heroAction("basic", null, "auto");
      return;
    }

    var decision = (window.ClassCombatManager && typeof ClassCombatManager.chooseRoundAction === "function")
      ? ClassCombatManager.chooseRoundAction(true)
      : null;
    if (decision && decision.slot && decision.slot !== "basic") {
      if (this.heroAction(decision.slot, { matchedConditionId: decision.matchedConditionId || null }, "auto")) return;
    }
    this.heroAction("basic", null, "auto");
  },

  /* « Continuer l'attaque » s'arrête sur : PV < 50 %, télégraphe ennemi, double frappe annoncée, nouvel ennemi. */
  shouldStopContinueAttack: function () {
    var e = game.enemy;
    if (!e) return true;
    if (game.combatRound._continueEnemyRef && game.combatRound._continueEnemyRef !== e) return true;
    if ((game.heroHp || 0) / (game.heroMaxHp || 1) < 0.5) return true;
    if (e.chargeTelegraphed || e.silenceTelegraphed || e.shieldTelegraphed || e.healTelegraphed) return true;
    if (this.enemyDoubleStrikeNext()) return true;
    return false;
  },

  /* ---------- Divers ---------- */
  estimateCounterValue: function (conditionId) {
    if (!game.enemy || !game.enemy.stats) return 0;

    var power = Number(game.enemy.stats.power || 0);
    if (window.AfflictionManager && typeof AfflictionManager.getCombinedModifiers === "function") {
      power *= AfflictionManager.getCombinedModifiers().enemyPowerMult;
    }
    var bossMult = game.enemy.isBoss ? BOSS_DMG_MULT : 1;

    if (conditionId === "chargeIncoming") {
      return Math.max(1, Math.floor(power * ENEMY_POWER_DMG_COEF * bossMult * ENEMY_CHARGE_DMG_MULT));
    }
    if (conditionId === "shieldIncoming") {
      return Math.max(1, Math.floor(power * ENEMY_POWER_DMG_COEF * bossMult));
    }
    if (conditionId === "healIncoming") {
      return Math.max(1, Math.floor(Number(game.enemy.hp || 0) * BOSS_HEAL_PERCENT));
    }
    if (conditionId === "enemySilenceIncoming") {
      return (typeof SILENCE_DURATION_ROUNDS === "number") ? SILENCE_DURATION_ROUNDS : 2;
    }
    return 0;
  },

  getEnragedEffectivePctHpLost: function () {
    if (!game.enemy || !(game.enemy.maxHp > 0)) return 0;
    if (Number(game.enemy.rageFreezeRounds || 0) > 0) {
      return Number(game.enemy.rageFrozenPct || 0);
    }
    return 1 - (Number(game.enemy.hp || 0) / Number(game.enemy.maxHp || 1));
  },

  spawnEnemy: function () {
    if (!window.WorldManager || typeof WorldManager.generateEnemy !== "function") return;

    game.enemy = this.prepareEnemy(WorldManager.generateEnemy());
    if (typeof WorldManager.applyWorldTheme === "function") WorldManager.applyWorldTheme();

    if (typeof renderEnemy === "function") renderEnemy();
    if (typeof renderHud === "function") renderHud();
  },

  onHeroDefeated: function () {
    this.ensureState();
    game.combatRound.continueAttack = false;
    game.silencedRounds = 0;
    if (window.SortieManager) SortieManager.end("death"); // v3.102.1 : le butin de la sortie est perdu

    if (window.DungeonManager && game.dungeonRun && game.dungeonRun.active) {
      DungeonManager.onDefeat();
      return;
    }

    if (window.AdventureQuestManager && game.adventureQuestRun && game.adventureQuestRun.active) {
      AdventureQuestManager.onDefeat();
      return;
    }

    if (window.HuntQuestManager && game.huntRun && game.huntRun.active) {
      HuntQuestManager.onDefeat();
      return;
    }

    // v3.101.0 : t_essence_bloom « Sang-froid » = 10 % PV max conservés par niveau à la défaite (au lieu de -pénalité d'or)
    var keptPct = (game.talents && game.talents.t_essence_bloom) ? game.talents.t_essence_bloom * 0.10 : 0;
    game.heroHp = Math.floor((game.heroMaxHp || 1) * keptPct);

    if (typeof openCombatReport === "function") openCombatReport("defeat", game.enemy ? game.enemy.name : null);

    // v3.109.1 (scope validé Seb) : mort en farm libre -> début de l'aventure en cours (resetToAdventureStart),
    // plus resetToCycleStart (une mort au Cœur renvoyait en Lisière, re-traversée complète).
    if (window.WorldManager && typeof WorldManager.resetToAdventureStart === "function") {
      WorldManager.resetToAdventureStart();
      if (typeof WorldManager.applyWorldTheme === "function") WorldManager.applyWorldTheme();
      if (typeof WorldManager.generateEnemy === "function") {
        game.enemy = this.prepareEnemy(WorldManager.generateEnemy());
      }
    }

    addLog("💀 Vous avez été terrassé ! Retour au Campement : mange ou laisse le feu te remettre debout.", "event");
    showToast("💀 Terrassé !", 1800);
    vibrate([80, 40, 80]);

    game.justDied = true;
    if (typeof switchTab === "function") switchTab("campement");

    if (typeof renderHeroHp === "function") renderHeroHp();
    if (typeof renderHud === "function") renderHud();
    saveGame();
  },

  dealDamage: function (dmg, isCrit, fromTap, ignoreAffinity) {
    if (!game.enemy) return;
    this.prepareEnemy(game.enemy);

    dmg = Math.max(0, Number(dmg || 0));
    if (!ignoreAffinity) dmg *= getDamageAffinity().mult;

    if (game.enemy.archetype === "corrupted" && typeof getCorruptedDamageMultiplier === "function") {
      var preCorruptedDmg = dmg;
      dmg *= getCorruptedDamageMultiplier(game.enemy.corruptedStacks || 0);
      if (window.CombatReportManager) CombatReportManager.logArchetypeImpact("corruptedDamageLost", preCorruptedDmg - dmg);
    }

    if (Number(game.enemy.vulnerableRounds || 0) > 0) {
      dmg *= (1 + Number(game.enemy.vulnerableMult || 0));
    }

    if ((game.enemy.isBoss || game.enemy.archetype === "shielded") && Number(game.enemy.shieldRounds || 0) > 0) {
      dmg *= (1 - BOSS_SHIELD_REDUCTION);
    }

    if (game.enemy.archetype === "armored" && typeof getArmoredEffectiveDamageReduction === "function") {
      var preArmoredDmg = dmg;
      dmg *= (1 - getArmoredEffectiveDamageReduction(game.enemy));
      if (window.CombatReportManager) CombatReportManager.logArchetypeImpact("armoredDamageLost", preArmoredDmg - dmg);
    }

    if (game.enemy.isBoss && game.talents.t_perfect_execution && game.enemy.maxHp > 0 && (game.enemy.hp / game.enemy.maxHp) < 0.2) {
      dmg *= (1 + 0.15 * game.talents.t_perfect_execution);
    }

    game.enemy.hp -= dmg;
    game.totalDamageDealt += dmg;
    if (window.CombatReportManager) CombatReportManager.logDamageDealt(dmg);

    if (fromTap) {
      showFloatingDamage(Math.floor(dmg), !!isCrit);
      vibrate(isCrit ? 30 : 10);
    }

    if (game.enemy.hp <= 0) this.killEnemy();
    else if (typeof renderEnemyHp === "function") renderEnemyHp();
  },

    killEnemy: function () {
    if (!game.enemy) return;

    if (window.HuntQuestManager && game.huntRun && game.huntRun.active) {
      game.totalKills += 1;
      game.killCounts[game.enemy.id] = (game.killCounts[game.enemy.id] || 0) + 1;
      if (window.SortieManager) SortieManager.noteKill(false); // la chasse n'a pas de boss (branche séparée avant grantGold/grantMissionXp)
      HuntQuestManager.onEnemyKilled();
      if (typeof renderAll === "function") renderAll();
      saveGame();
      return;
    }

    var enemy = game.enemy;
    var goldGain = Number(enemy.goldReward || 0);
    var essenceGain = Number(enemy.essenceReward || 0);

    if (window.EquipmentManager && typeof EquipmentManager.effectiveGoldMult === "function") {
      goldGain = Math.floor(goldGain * EquipmentManager.effectiveGoldMult());
    }

    if (enemy.isBoss) {
      goldGain = Math.floor(goldGain * (1 + Number(game.bossGoldBonusPct || 0)));
    }

    essenceGain = Math.ceil(essenceGain * Math.max(1, Number(game.essenceGlobalMult || 1)));

    if (enemy.isBoss) {
      var aetherBonuses = getAetherBonuses();
      essenceGain += aetherBonuses.essenceBonus || 0;

      if (game.bossEssenceBonusPct) {
        essenceGain = Math.ceil(essenceGain * (1 + Number(game.bossEssenceBonusPct || 0)));
      }
    }

    var currentWorld = (window.WORLDS && window.WorldManager) ? WORLDS[WorldManager.worldIndex] : null;

    var merchantBonusGold = 0;
    if (game.talents.t_merchant_instinct && chance(5 * game.talents.t_merchant_instinct)) {
      merchantBonusGold = Math.floor(goldGain * 0.5);
      goldGain += merchantBonusGold;
    }

    this.grantGold(goldGain);
    this.grantEssence(essenceGain);
    game.totalKills += 1;
    game.killCounts[enemy.id] = (game.killCounts[enemy.id] || 0) + 1;
    if (window.SortieManager) SortieManager.noteKill(enemy.isBoss);

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("kills", 1);
      if (enemy.isBoss) QuestManager.track("bossKills", 1);

      var masteryType = typeof getPlayerDamageType === "function" ? getPlayerDamageType() : null;
      if (masteryType === "sword") QuestManager.track("swordKills", 1);
      else if (masteryType === "bow") QuestManager.track("bowKills", 1);
      else if (masteryType === "magic") QuestManager.track("magicKills", 1);
    }

    showGoldPopup(goldGain);
    addLog((enemy.isBoss ? "👑 Boss vaincu : " : "⚔️ Ennemi vaincu : ") + enemy.name + " (+" + formatNumber(goldGain) + " or)", enemy.isBoss ? "boss" : "normal");
    if (merchantBonusGold > 0) {
      addLog("📜 Instinct marchand : bonus de +" + formatNumber(merchantBonusGold) + " or", "event");
    }

    if (enemy.isBoss) {
      vibrate([50, 30, 50, 30, 100]);

      var bestiaryBonus = typeof getBestiaryBonus === "function" ? getBestiaryBonus(enemy.id) : { lootBonus: 0 };
      var lootChance = 50 + (getAetherBonuses().lootBonus || 0) + (bestiaryBonus.lootBonus || 0);
      if (window.AfflictionManager && typeof AfflictionManager.getCombinedModifiers === "function") {
        lootChance *= AfflictionManager.getCombinedModifiers().lootChanceMult;
      }
      var rolls = 1;
      if (game.talents.t_astral_prospecting && chance(5 * game.talents.t_astral_prospecting)) rolls = 2;

      for (var r = 0; r < rolls; r++) {
        if (window.LootSystem && typeof LootSystem.rollDrop === "function" && chance(lootChance)) {
          var drop = LootSystem.rollDrop();
          if (this.grantDrop(drop)) {
            addLog("🎁 Objet trouvé : " + drop.name + " (" + drop.rarity + ")" + (this.inSortie() ? " — dans le butin de sortie" : ""), "event");
            showToast("🎁 " + drop.name, 1800);
          }
        }
      }
    } else if (chance(8)) {
      this.triggerRandomEvent();
    }

    saveEquipBagScroll();

    if (window.DungeonManager && game.dungeonRun && game.dungeonRun.active) {
      // v3.103.3 (P4, décision §10 n°6) : XP par mission, plus par kill (SortieManager.grantMissionXp à la fin du donjon)
      DungeonManager.onEnemyKilled();
      if (typeof renderAll === "function") renderAll();
      restoreEquipBagScroll();
      saveGame();
      return;
    }

    if (window.AdventureQuestManager && game.adventureQuestRun && game.adventureQuestRun.active) {
      AdventureQuestManager.onEnemyKilled(enemy);
      if (typeof renderAll === "function") renderAll();
      restoreEquipBagScroll();
      saveGame();
      return;
    }

    if (window.WorldQuestManager && currentWorld) {
      if (enemy.isBoss) WorldQuestManager.trackBossKill(enemy.id);
      else WorldQuestManager.trackKill(currentWorld.id);
    }

    var result = null;
    if (window.WorldManager && typeof WorldManager.advance === "function") result = WorldManager.advance();

    if (result && result.type === "adventure" && result.adventure) {
      addLog("Nouveau chapitre : " + result.adventure.name, "zone");
      showToast(result.adventure.name, 1800);
    } else if (result && result.type === "world" && result.world) {
      addLog("Nouveau monde débloqué : " + result.world.name, "zone");
      showToast(result.world.name, 2200);

      if (window.WorldManager && typeof isGrimoireWorldUnlockMilestone === "function"
        && isGrimoireWorldUnlockMilestone(WorldManager.worldIndex)) {
        addLog("📖 Une nouvelle règle de Grimoire est disponible !", "event");
        showToast("📖 Nouvelle règle de Grimoire débloquée !", 2200);
      }
    } else if (result && result.type === "cycle") {
      addLog("Le cycle recommence, les ennemis deviennent plus forts.", "zone");
      if (typeof openCycleSummary === "function") openCycleSummary();
    } else if (result && result.type === "locked") {
      addLog("🔒 " + result.world.name + " est verrouillé (questline de déblocage incomplète, voir Carte). Le cycle recommence.", "zone");
      showToast("🔒 Termine la questline pour débloquer " + result.world.name, 2200);
      if (typeof openCycleSummary === "function") openCycleSummary(result.world);
    } else if (result && result.type === "world_gate_locked") {
      // v3.109.1 : porte de monde (gatesNextWorld) non franchie — on reste sur place, pas de cycle.
      var gateName = result.gateQuest ? result.gateQuest.name : "la quête de passage";
      addLog("🗺️ Le passage vers le monde suivant est gardé — termine « " + gateName + " » (tableau de missions). Tu restes au " + (result.adventure ? result.adventure.name : "même endroit") + ".", "zone");
      showToast("🗺️ Termine « " + gateName + " » pour ouvrir la suite", 2200);
    } else if (result && result.type === "adventure_locked") {
      addLog("🧭 Une quête d'Expédition attend d'être lancée pour explorer plus loin (voir l'onglet Quêtes).", "zone");
      showToast("🧭 Lance la quête d'Expédition (onglet Quêtes) pour continuer", 2200);
    }

    if (result && (result.type === "adventure" || result.type === "world")) {
      var chapterGold = Math.floor(20 + (WorldManager.worldIndex || 0) * 15);
      var chapterEssence = 2 + (WorldManager.worldIndex || 0);

      if (game.talents.t_deep_pockets) {
        chapterGold = Math.floor(chapterGold * (1 + 0.10 * game.talents.t_deep_pockets));
      }

      this.grantGold(chapterGold);
      this.grantEssence(chapterEssence);
      addLog("🎉 Récompense de chapitre : +" + formatNumber(chapterGold) + " or, +" + chapterEssence + " essence", "event");
    }

    // v3.103.3 (P4, décision §10 n°6) : XP par mission, plus par kill. Le farm classique (context "farm")
    // n'est pas une mission au sens de la ligne directrice §4 : il ne donne pas d'XP (grantMissionXp l'exclut).

    this.spawnEnemy();
    if (typeof renderAll === "function") renderAll();
    restoreEquipBagScroll();
    saveGame();
  },

    triggerRandomEvent: function () {
    var events = [
      function () {
        var bonus = randInt(10, 50);
        if (game.talents.t_deep_pockets) bonus = Math.floor(bonus * (1 + 0.10 * game.talents.t_deep_pockets));
        CombatEngine.grantGold(bonus);
        addLog("💰 Trésor trouvé ! +" + bonus + " or", "event");
        showToast("💰 +" + bonus + " or", 1400);
        if (window.QuestManager && typeof QuestManager.track === "function") {
          QuestManager.track("treasures", 1 + (game.talents.t_treasure_hunter || 0));
        }
      },
      function () {
        var bonus = randInt(1, 3);
        CombatEngine.grantEssence(bonus);
        addLog("🔮 Fontaine d'essence ! +" + bonus + " essence", "event");
        showToast("🔮 +" + bonus + " essence", 1400);
      },
      function () {
        var bonus = Math.floor(game.gold * 0.05);
        if (bonus > 0) {
          CombatEngine.grantGold(bonus);
          addLog("✨ Bénédiction ! +" + formatNumber(bonus) + " or", "event");
          showToast("✨ +" + formatNumber(bonus) + " or", 1400);
        }
      },
      function () {
        if (typeof AMBIANCE_TEXTS !== "undefined" && AMBIANCE_TEXTS.length) {
          addLog(AMBIANCE_TEXTS[randInt(0, AMBIANCE_TEXTS.length - 1)], "event");
        }
      }
    ];

    events[randInt(0, events.length - 1)]();
  }
};

function heroBasicAttack() { CombatEngine.heroAction("basic"); }

window.CombatEngine = CombatEngine;
window.heroBasicAttack = heroBasicAttack;
window.showFloatingDamage = showFloatingDamage;
window.showGoldPopup = showGoldPopup;
window.showCounterSuccessPopup = showCounterSuccessPopup;
window.getDamageAffinity = getDamageAffinity;
window.getPlayerDamageType = getPlayerDamageType;
window.getEnemyWillCritPenalty = getEnemyWillCritPenalty;
window.getConfiguredCounterSlotsForCondition = getConfiguredCounterSlotsForCondition;
window.ROUND_INTERVAL_MS = ROUND_INTERVAL_MS;
window.CELERITY_GAUGE_MAX = CELERITY_GAUGE_MAX;
window.BOSS_DMG_MULT = BOSS_DMG_MULT;
window.ENEMY_POWER_DMG_COEF = ENEMY_POWER_DMG_COEF;
window.COMBAT_MODES = COMBAT_MODES;
