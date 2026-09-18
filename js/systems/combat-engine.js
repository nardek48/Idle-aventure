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
/* v3.243.0 (bug Seb : « la jauge se remplit très vite, on a tout le temps des doubles
   attaques à partir d'un certain niveau »). La célérité vient surtout des bottes, dont la
   stat plate suit EQUIP_WORLD_SCALE (×1 en Forêt → ×18 à la Tour) ; le plafond de jauge,
   lui, restait à 100. Mesuré : ~40 de célérité en Forêt mais 113 dès la Crypte et 470 à la
   Tour, donc jauge pleine à CHAQUE action. Pire, afterOffensiveAction ne déclenche qu'UNE
   frappe par action : toute célérité au-delà de 100 était purement perdue (470 == 100).
   Rendements décroissants : gain = 100 × célérité / (célérité + K). Le gain tend vers 100
   sans jamais l'atteindre — la frappe bonus n'est donc jamais garantie, et chaque point de
   célérité continue de compter jusqu'au bout. K = 60 retenu en simulation
   (sim/celerity-curve-bench.js) : laisse la Forêt EXACTEMENT telle qu'elle est (40 → 40). */
var CELERITY_SOFT_CAP_K = 60;
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

/* v3.204.0 (E4) — EXALTATION D'ÉLITE. Une élite (enemy.isElite) ne se soigne
   pas : son second minuteur porte ce pattern à la place. Télégraphe au round N,
   impact au round N+1 comme tous les autres ; l'impact double l'intensité de
   son ARCHÉTYPE pendant quelques rounds, au lieu d'introduire une cinquième
   mécanique à lire. Décision Seb (10/09/2026) : le pic S'AJOUTE à l'archétype
   permanent, il ne le remplace pas — mais le soin est retiré aux élites pour
   qu'il n'y ait jamais plus de deux minuteurs simultanés sur 390 px. */
var ELITE_SURGE_ROUNDS_MIN = 4;
var ELITE_SURGE_ROUNDS_MAX = 6;
var ELITE_SURGE_DURATION_ROUNDS = 4;
var ELITE_SURGE_INTENSITY_MULT = 3;   // l'archétype compte triple pendant l'exaltation

var COUNTER_CONFIRMATION_ROUNDS = 1;

/* v3.268.0 (L-2) — ciblage des alliés par la menace (doc §6.2). Valeurs de départ,
   à confirmer au banc (sim/group-bench.js --ally) : on vise 35 à 50 % des frappes
   reçues par le héros lorsqu'un compagnon l'accompagne. */
var THREAT_DECAY = 0.7;
var THREAT_FLOOR = 0.15;
var COMPANION_FLAT_DEFENSE = 0.10;   // un compagnon n'a pas d'équipement : réduction plate

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
    // v3.266.0 (L-0) : socle du combat de groupe — game.combat (acteurs, cible collante).
    // À un seul ennemi, rien ne change : game.enemy est l'alias de la cible courante.
    if (window.CombatActors) CombatActors.ensure();
    if (COMBAT_MODES.indexOf(game.combatMode) === -1) game.combatMode = "tactique";
    if (!game.combatRound || typeof game.combatRound !== "object") {
      game.combatRound = { number: 0, busy: false, continueAttack: false, clockMs: 0 };
    }
    if (typeof game.heroGauge !== "number" || !isFinite(game.heroGauge)) game.heroGauge = 0;
    /* v3.243.0 : avant la courbe ci-dessus, le reliquat de jauge s'accumulait sans limite
       (gain de 470 pour un plafond de 100, une seule frappe consommée par action) et
       n'était jamais remis à zéro entre deux ennemis. Une partie en cours peut donc arriver
       ici avec plusieurs milliers en réserve : on la ramène dans sa plage légitime. */
    if (game.heroGauge > CELERITY_GAUGE_MAX) game.heroGauge = CELERITY_GAUGE_MAX;
    if (game.heroGauge < 0) game.heroGauge = 0;
    if (typeof game.silencedRounds !== "number") game.silencedRounds = 0;
  },

  /* Initialise les compteurs de round d'un ennemi (paresseux : appelé au spawn et au premier tour). */
  /* v3.230.0 (périmètre confirmé par Seb) : pouvoirs légendaires. Un seul point
     d'interrogation, hasLegendaryPower() (equipment-system.js) ; faux tant qu'aucun
     légendaire n'est porté, donc sans effet avant la Tour. */
  hasPower: function (id) {
    return (typeof hasLegendaryPower === "function") ? hasLegendaryPower(id) : false;
  },

  prepareEnemy: function (enemy) {
    if (!enemy || enemy._roundReady) return enemy;
    enemy._roundReady = true;
    // v3.246.0 (retour Seb) : le compteur R est le round DU COMBAT. Il n'était remis à zéro qu'au
    // chargement d'une partie : il affichait donc les rounds cumulés de la session (R85 sur un combat neuf).
    if (game.combatRound) game.combatRound.number = 0;
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
    // v3.204.0 (E4) : l'élite troque le soin contre l'exaltation (voir constantes).
    enemy.surgeIn = enemy.isElite ? randInt(ELITE_SURGE_ROUNDS_MIN, ELITE_SURGE_ROUNDS_MAX) : 0;
    enemy.surgeTelegraphed = false;
    enemy.surgeRounds = 0;
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
    enemy.patternHoldRounds = 0;   // v3.230.0 : Clairvoyance — le pattern attend un round de plus
    game._legSecondWindUsed = false; // v3.230.0 : Second souffle, une fois par combat
    game._legFirstHitDone = false;   // v3.230.0 : Poigne de fer
    game._legBarkRounds = 0;         // v3.230.0 : Peau d'écorce
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

    /* v3.270.0 (L-4) : un compagnon en Manuel attend son choix — on précharge au lieu de
       jouer. Le mode Grimoire ignore l'interrupteur (tout le monde est auto, décision
       Seb), et _playingQueue est le drapeau qui laisse passer le round une fois la file
       complète, sans repasser par ici. */
    if (source !== "auto" && game.combatMode !== "grimoire" && this.hasManualAllies()) {
      return this.queueChoice(slot, arg);
    }

    // v3.102.1 : le premier round hors mission ouvre une sortie d'exploration (décision 1a)
    if (window.SortieManager && !SortieManager.isActive()) SortieManager.start(null);

    var round = game.combatRound;
    round.busy = true;
    round.number += 1;

    /* v3.267.0 (L-1) : le groupe est photographié AVANT l'action du héros. Seuls les
       ennemis présents à ce moment-là jouent leur tour — un ennemi tué puis remplacé
       pendant l'action ne joue pas, exactement comme la condition historique
       « game.enemy === enemyRef » le garantissait à un seul ennemi. */
    var groupRef = window.CombatActors ? CombatActors.enemies().slice() : [game.enemy];

    var played = this.performHeroAction(slot, arg, source);
    if (!played) {
      round.number -= 1;
      round.busy = false;
      return false;
    }

    this.alliesTurn();
    this.enemiesTurn(groupRef);
    this.endRoundGroup(groupRef);
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
    var raw = this.getTotalCelerity() * CELERITY_GAUGE_PER_ACTION * talentMult;
    if (!(CELERITY_SOFT_CAP_K > 0) || raw <= 0) return raw;
    // v3.243.0 : rendements décroissants, voir CELERITY_SOFT_CAP_K en tête de fichier.
    return CELERITY_GAUGE_MAX * raw / (raw + CELERITY_SOFT_CAP_K);
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

    // v3.230.0 : Poigne de fer — le premier coup d'un combat est toujours critique.
    if (!isBonus && !game._legFirstHitDone && this.hasPower("leg_poigne")) {
      isCrit = true;
      game._legFirstHitDone = true;
    } else if (!isBonus) {
      game._legFirstHitDone = true;
    }

    if (isCrit) {
      dmg = Math.floor(dmg * EquipmentManager.effectiveCritMult());
      if (window.QuestManager && typeof QuestManager.track === "function") QuestManager.track("crits", 1);
    }

    // v3.230.0 : Œil du faucon — les critiques mordent plus fort sur les Élites.
    if (isCrit && game.enemy.isElite && this.hasPower("leg_faucon")) dmg = Math.floor(dmg * 1.25);
    // v3.230.0 : Frénésie — +2 % par ennemi vaincu sans avoir subi de dégâts, plafond +20 %.
    if (this.hasPower("leg_frenesie") && Number(game._legFrenzyStacks || 0) > 0) {
      dmg = Math.floor(dmg * (1 + 0.02 * Math.min(10, game._legFrenzyStacks)));
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

    /* v3.230.0 : Écho — 10 % de chance que l'attaque de base frappe deux fois.
       isBonus coupe la récursion : l'écho ne peut pas s'échoïser lui-même. */
    if (!isBonus && game.enemy && game.enemy.hp > 0 && this.hasPower("leg_echo") && chance(10)) {
      addLog("🌀 Écho : la frappe se répète !", "event");
      this.playerAttack(true, extraMult);
    }
  },

  /* ---------- Phases (v3.288.0, décision Seb) ----------

     Un boss ou une élite peut changer d'état à un seuil de PV : appeler des renforts,
     entrer en rage. `phases` est une liste [{ atPct, adds, archetype, label }], champ
     réservé depuis data/elites.js et enfin lu.

     Trois règles, chacune pour une raison mesurée ou constatée :
     1. Les renforts s'ANNONCENT un round avant d'arriver (engageIn). Un pic de danger non
        annoncé se lit comme un bug — c'est la grammaire des télégraphes du jeu.
     2. Le soin de boss est SUSPENDU tant qu'un renfort est debout. Sinon les renforts
        allongent le combat, donc multiplient les soins, et une classe à faibles dégâts
        bute contre un mur : c'est exactement ce que le pronostic de combat sert à éviter.
     3. Les renforts se dispersent à la mort du chef (même règle que l'escorte d'élite,
        voir killEnemy) — sinon une salle de donjon ne se referme jamais. */
  checkPhases: function (e) {
    if (!e || !Array.isArray(e.phases) || !e.phases.length) return;
    if (!(Number(e.maxHp || 0) > 0)) return;

    var pct = Number(e.hp || 0) / Number(e.maxHp);
    e._phasesDone = e._phasesDone || {};

    for (var i = 0; i < e.phases.length; i++) {
      var ph = e.phases[i];
      if (!ph || e._phasesDone[i]) continue;
      if (pct > Number(ph.atPct || 0)) continue;

      e._phasesDone[i] = true;
      if (ph.label) addLog("⚠️ " + e.name + " — " + ph.label, "event");

      if (ph.archetype) {
        e.archetype = ph.archetype;   // « enraged » existe déjà : les dégâts montent avec les PV perdus
      }

      if (Array.isArray(ph.adds) && ph.adds.length) this.summonAdds(e, ph);
    }
  },

  /* Renforts de phase, mis à l'échelle sur le chef : un renfort d'un boss de donjon doit
     être dangereux comme le donjon, pas comme la Lisière. */
  summonAdds: function (chef, ph) {
    if (!window.CombatActors) return;
    var libres = (typeof COMBAT_MAX_ENEMIES === "number" ? COMBAT_MAX_ENEMIES : 3) - CombatActors.enemies().length;
    if (libres <= 0) return;

    var hpMult = Number(ph.addsHpMult);
    if (!isFinite(hpMult) || hpMult <= 0) hpMult = 0.18;
    var powMult = Number(ph.addsPowerMult);
    if (!isFinite(powMult) || powMult <= 0) powMult = 0.45;

    var self = this;
    var nouveaux = ph.adds.slice(0, libres).map(function (id) {
      var data = (window.ENEMY_DB || {})[id];
      if (!data) return null;
      var stats = data.stats || (typeof makeRpgStats === "function" ? makeRpgStats(10, 10, 10, 10, 10) : null);
      if (!stats) return null;
      var hp = Math.max(1, Math.floor(Number(chef.maxHp || 0) * hpMult));
      var renfort = {
        id: id,
        name: data.name || "Renfort",
        asset: data.asset || "slime",
        image: data.image,
        isBoss: false, isElite: false, archetype: null,
        hp: hp, maxHp: hp,
        goldReward: Math.max(1, Math.floor(Number(chef.goldReward || 0) * 0.10)),
        essenceReward: 0,
        resists: data.resists || [], weak: data.weak || [],
        stats: {
          power: Math.max(1, Math.floor(Number((chef.stats && chef.stats.power) || 0) * powMult)),
          endurance: stats.endurance || 0,
          celerity: stats.celerity || 0,
          precision: stats.precision || 0,
          will: stats.will || 0
        }
      };
      self.prepareEnemy(renfort);
      renfort.engageIn = 1;   // annoncé : il arrive au round suivant
      return renfort;
    }).filter(Boolean);

    if (!nouveaux.length) return;
    CombatActors.setEnemies(CombatActors.enemies().concat(nouveaux));
    addLog("🐍 " + nouveaux.map(function (r) { return r.name; }).join(" et ") + " arrive" + (nouveaux.length > 1 ? "nt" : "") + " en renfort !", "danger");
    if (typeof renderEnemy === "function") renderEnemy();
  },

  /* Le soin de boss est suspendu tant qu'un renfort tient debout (règle 2 ci-dessus). */
  bossHealSuspended: function (e) {
    if (!e || !window.CombatActors) return false;
    if (!Array.isArray(e.phases) || !e.phases.length) return false;
    return CombatActors.aliveEnemies().some(function (x) { return x !== e; });
  },

  /* ---------- Mode Manuel : la file d'attente (L-4) ---------- */

  /* v3.270.0 (L-4) : un compagnon en Manuel ne joue plus seul. Le round n'est PAS joué
     tant que chaque acteur manuel n'a pas choisi : les actions sont préchargées, puis
     tout part d'un coup. Sans compagnon manuel, rien de tout ceci ne s'active et
     heroAction se comporte exactement comme avant. */
  manualAllies: function () {
    if (!window.CombatActors || !window.CompanionManager) return [];
    /* v3.276.0 : le mode de combat décide. En Grimoire, aucun compagnon n'est manuel —
       inutile de relire un réglage par compagnon, il n'y en a plus. */
    if (game.combatMode === "grimoire") return [];
    return CombatActors.allies().filter(function (a) {
      return a && a.companionId && Number(a.hp || 0) > 0;
    });
  },

  hasManualAllies: function () {
    return this.manualAllies().length > 0;
  },

  /* Qui doit encore choisir : le héros d'abord, puis les compagnons manuels vivants. */
  actorsToChoose: function () {
    if (!window.CombatActors) return [];
    var out = [CombatActors.heroActor()];
    this.manualAllies().forEach(function (a) { out.push(a); });
    return out;
  },

  pendingOf: function (actor) {
    var c = game.combat;
    return (c && actor && c.pending) ? c.pending[actor.actorId] : null;
  },

  allChosen: function () {
    var self = this;
    return this.actorsToChoose().every(function (a) { return !!self.pendingOf(a); });
  },

  selectedActor: function () {
    var c = CombatActors.ensure();
    var list = this.actorsToChoose();
    for (var i = 0; i < list.length; i++) if (list[i].actorId === c.selection) return list[i];
    return list[0] || CombatActors.heroActor();
  },

  selectActor: function (actorId) {
    var c = CombatActors.ensure();
    var list = this.actorsToChoose();
    for (var i = 0; i < list.length; i++) {
      if (list[i].actorId === actorId) { c.selection = actorId; this.refreshCombatUI(); return true; }
    }
    return false;
  },

  /* Après un choix, on passe seul au premier acteur qui n'a pas encore le sien. */
  advanceSelection: function () {
    var c = CombatActors.ensure();
    var self = this;
    var list = this.actorsToChoose();
    for (var i = 0; i < list.length; i++) {
      if (!self.pendingOf(list[i])) { c.selection = list[i].actorId; return; }
    }
    c.selection = list.length ? list[0].actorId : null;
  },

  /* v3.276.0 (décision Seb) : l'action est RÉSOLUE AU CLIC, plus préchargée. Les dégâts
     partent immédiatement, sur la cible désignée à cet instant — c'est ce qui permet de
     frapper l'ennemi qu'on veut au moment où on le choisit, et de changer de cible entre
     deux acteurs du même round. Les ennemis, eux, ne ripostent qu'une fois que tout le
     monde a joué : le round reste une unité. */
  queueChoice: function (slot, arg) {
    var c = CombatActors.ensure();
    var acteur = this.selectedActor();

    // Une potion est une action DU HÉROS : le plafond par sortie est calibré pour un seul buveur.
    if (slot === "potion" && acteur && acteur.companionId) acteur = CombatActors.heroActor();
    if (this.pendingOf(acteur)) return false;   // il a déjà joué ce round

    // Le round s'ouvre au premier acte, et le groupe ennemi est photographié à cet instant.
    if (!this._manualRoundOpen) {
      if (window.SortieManager && !SortieManager.isActive()) SortieManager.start(null);
      game.combatRound.number += 1;
      this._manualGroupRef = window.CombatActors ? CombatActors.enemies().slice() : [game.enemy];
      this._manualRoundOpen = true;
    }

    /* v3.277.0 (bug Seb) : `busy` ne couvre QUE la résolution d'un acte. Posé pour tout le
       round manuel, il faisait échouer isHeroTurnAvailable() au clic suivant — le gros
       bouton ne faisait donc rien pendant le tour d'un compagnon. */
    var joue;
    game.combatRound.busy = true;
    try {
      if (acteur.companionId) {
        this._actingAlly = acteur;
        try { joue = CompanionManager.takeTurn(acteur, slot, arg); }
        finally { this._actingAlly = null; }
      } else {
        joue = this.performHeroAction(slot, arg, null);
      }
    } finally {
      game.combatRound.busy = false;
    }

    if (!joue) {
      // action refusée (recharge, ressource, condition) : le round reste ouvert, rien n'est perdu
      if (!Object.keys(c.pending).length) this.cancelManualRound();
      return false;
    }

    c.pending[acteur.actorId] = { slot: slot, arg: arg || null };
    this.advanceSelection();

    if (this.allChosen()) return this.finishManualRound();
    this.refreshCombatUI();
    return true;
  },

  /* Le dernier acteur a joué : les ennemis ripostent, puis le round se ferme. */
  finishManualRound: function () {
    var groupRef = this._manualGroupRef || (window.CombatActors ? CombatActors.enemies().slice() : [game.enemy]);
    this.enemiesTurn(groupRef);
    this.endRoundGroup(groupRef);
    this.cancelManualRound();
    game.combatRound.clockMs = 0;
    this.refreshCombatUI();
    if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
    if (typeof renderHealButtons === "function") renderHealButtons();
    return true;
  },

  cancelManualRound: function () {
    this.clearQueue();
    this._manualRoundOpen = false;
    this._manualGroupRef = null;
    /* game.combatRound peut ne pas exister encore : spawnGroup est appelé pendant la
       création d'un héros, avant ensureState (constaté au harnais). */
    if (game.combatRound) game.combatRound.busy = false;
  },

  clearQueue: function () {
    var c = CombatActors.ensure();
    if (c) { c.pending = {}; c.selection = null; }
  },

  refreshCombatUI: function () {
    if (typeof renderActorBand === "function") renderActorBand();   // v3.273.0 : le cadre suit l'acteur
    if (typeof renderClassSkillButtons === "function") renderClassSkillButtons();
    if (typeof renderCombatControls === "function") renderCombatControls();
    if (typeof renderAllyRow === "function") renderAllyRow();
    if (typeof renderEnemyRow === "function") renderEnemyRow();
  },

  /* ---------- Tours alliés (groupe) ---------- */

  /* v3.268.0 (L-2) : après l'action du héros, chaque compagnon vivant joue la sienne.
     Le moteur ne connaît rien des compagnons : il délègue à CompanionManager, qui
     porte la politique automatique, les cooldowns et les compétences. Sans compagnon
     présent, cette boucle est vide et le round est celui d'avant. */
  alliesTurn: function () {
    if (!window.CombatActors || !window.CompanionManager) return;
    if ((game.heroHp || 0) <= 0) return;

    var allies = CombatActors.allies().slice();
    for (var i = 0; i < allies.length; i++) {
      var a = allies[i];
      if (!a || !a.companionId) continue;        // le héros a déjà joué
      if (Number(a.hp || 0) <= 0) continue;      // KO
      if (!CombatActors.aliveEnemies().length) break;
      /* v3.276.0 : en Manuel, le compagnon a DÉJÀ joué au clic (queueChoice) — on ne le
         rejoue pas ici. Cette boucle ne sert donc plus qu'au mode automatique. */
      if (a.control === "manual") continue;
      this._actingAlly = a;
      try { CompanionManager.takeTurn(a, null, null); }
      finally { this._actingAlly = null; }
    }
  },

  /* Qui encaisse la frappe : tirage au prorata de la menace (§6.2). Un Garde attire,
     un Soutien peu, un KO sort du tirage ; le plancher garantit que le héros reste
     exposé — sans lui, un compagnon à forte menace ferait de lui un spectateur. */
  pickVictim: function () {
    if (!window.CombatActors) return null;
    var hero = CombatActors.heroActor();
    var list = CombatActors.aliveAllies();
    if (list.length <= 1) return hero;           // aucun compagnon : chemin historique

    var total = 0, weights = [];
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      var w = (Number(a.threat || 0) * Number(a.threatMult || 1));
      w = Math.max(THREAT_FLOOR, w);
      weights.push(w);
      total += w;
    }
    if (!(total > 0)) return hero;

    var roll = Math.random() * total;
    for (var j = 0; j < list.length; j++) {
      roll -= weights[j];
      if (roll <= 0) return list[j];
    }
    return hero;
  },

  /* Menace de l'allié en train d'agir. _actingAlly est posé par alliesTurn pendant le
     tour d'un compagnon ; hors de cette fenêtre, c'est le héros qui frappe. */
  noteThreat: function (dmg) {
    if (!window.CombatActors) return;
    var actor = this._actingAlly || CombatActors.heroActor();
    if (actor) actor.threat = Number(actor.threat || 0) + Math.max(0, Number(dmg || 0));
  },

  /* Décroissance de la menace en fin de round : sans elle, un compagnon qui a frappé
     fort une fois resterait la cible du combat entier. */
  decayThreat: function () {
    if (!window.CombatActors) return;
    CombatActors.allies().forEach(function (a) {
      if (a && typeof a.threat === "number") a.threat *= THREAT_DECAY;
    });
  },

  /* ---------- Tours ennemis (groupe) ---------- */

  /* v3.267.0 (L-1) : exécute fn en désignant temporairement `e` comme cible courante,
     puis rend la main à la cible choisie par le joueur. C'est ce qui permet à enemyTurn(),
     enemyStrike(), aux cinq resolve*() et au tick de DoT — tous écrits pour « l'ennemi » —
     d'opérer sur un membre précis du groupe SANS être réécrits. À un seul ennemi, la cible
     est déjà la bonne : l'appel est transparent. */
  withTarget: function (e, fn) {
    if (!window.CombatActors) return fn();
    var previous = game.combat ? game.combat.targetId : null;
    CombatActors.setTarget(e);
    try { return fn(); }
    finally { if (game.combat) game.combat.targetId = previous; }
  },

  /* Chaque ennemi encore en vie joue son tour, sur lui-même. Les compteurs de pattern
     vivant déjà sur chaque objet, les télégraphes restent indépendants (décision 9). */
  enemiesTurn: function (groupRef) {
    var self = this;
    var list = groupRef || (window.CombatActors ? CombatActors.enemies().slice() : [game.enemy]);
    var current = window.CombatActors ? CombatActors.enemies() : [game.enemy];

    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if ((game.heroHp || 0) <= 0) return;          // héros tombé : le round s'arrête là
      if (!e || Number(e.hp || 0) <= 0) continue;   // mort pendant le round
      if (current.indexOf(e) === -1) continue;      // remplacé entre-temps (spawn de run)
      this.withTarget(e, function () { self.enemyTurn(); });
    }
  },

  enemyTurn: function () {
    var e = game.enemy;
    if (!e || !e.stats) return;
    if ((game.heroHp || 0) <= 0) return;
    this.prepareEnemy(e);
    e.roundsAlive += 1;

    // Statuts posés PENDANT un tour ennemi (bouclier, silence) : décomptés ici, au tour ennemi suivant,
    // pour couvrir exactement N tours du héros (le décompte de fin de round les rognerait d'un round).
    if (e.shieldRounds > 0) e.shieldRounds -= 1;
    if (e.surgeRounds > 0) e.surgeRounds -= 1; // v3.204.0 (E4)
    if (game.silencedRounds > 0) game.silencedRounds -= 1;

    var impact = false;
    var surgeImpact = false; // v3.204.0 (E4) : voir juste en dessous
    /* v3.230.0 : Clairvoyance — le télégraphe est tombé un round plus tôt (voir
       tickEnemyTelegraphs) ; ce round de retenue rend au joueur le temps gagné,
       sans avancer l'impact. */
    if (Number(e.patternHoldRounds || 0) > 0) {
      e.patternHoldRounds -= 1;
    } else if (e.isBoss) {
      if (e.healTelegraphed) { this.resolveBossHeal(); impact = true; }
      else if (e.surgeTelegraphed) { this.resolveEliteSurge(); impact = true; surgeImpact = true; }
      else if (e.shieldTelegraphed) { this.resolveBossShield(); impact = true; }
    } else if (e.archetype === "silenced") {
      if (e.silenceTelegraphed) { this.resolveSilenceCast(); impact = true; }
    } else if (e.archetype === "shielded") {
      // v3.104.1 (P5) : bouclier réutilisé sur un ennemi normal (identité, pas seulement boss) — mêmes champs/résolveur.
      if (e.shieldTelegraphed) { this.resolveBossShield(); impact = true; }
    } else if (e.chargeTelegraphed) {
      this.resolveEnemyCharge(); impact = true;
    }

    /* v3.204.0 (E4) : tous les patterns REMPLACENT la frappe du round — un
       bouclier ou un soin est donc un round sans dégâts, ce qui les rend
       presque indolores (mesuré : l'exaltation faisait GAGNER 3 à 5 points de
       PV au joueur avant ce correctif). L'exaltation d'élite fait exception :
       elle s'ajoute à la frappe. Ignorer son télégraphe coûte donc vraiment,
       ce qui est tout l'objet du pattern. Périmètre volontairement limité aux
       élites : le comportement des boss et du donjon est inchangé. */
    if (impact && !surgeImpact) return; // le compte à rebours relancé démarre au round suivant

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
    /* v3.230.0 : Clairvoyance — le compte à rebours déclenche à 1 au lieu de 0. */
    var early = this.hasPower("leg_clairvoyance") ? 1 : 0;
    if (e.isBoss) {
      if (e.healTelegraphed || e.shieldTelegraphed || e.surgeTelegraphed) return; // un seul télégraphe à la fois
      // v3.204.0 (E4) : une élite remplace le minuteur de soin par celui d'exaltation.
      if (e.isElite) {
        e.surgeIn -= 1;
        e.shieldIn -= 1;
        if (e.surgeIn <= early) this.telegraphPattern(e, "surge");
        else if (e.shieldIn <= early) this.telegraphPattern(e, "shield");
        return;
      }
      e.healIn -= 1;
      e.shieldIn -= 1;
      /* v3.288.0 : soin suspendu tant qu'un renfort de phase tient debout — sinon les
         renforts allongent le combat, donc multiplient les soins, et une classe à faibles
         dégâts se retrouve devant un mur. Le compte à rebours continue de tourner : le
         soin repart dès que la salle est nettoyée. */
      if (this.bossHealSuspended(e)) {
        if (e.shieldIn <= early) this.telegraphPattern(e, "shield");
        return;
      }
      if (e.healIn <= early) this.telegraphPattern(e, "heal");
      else if (e.shieldIn <= early) this.telegraphPattern(e, "shield");
      return;
    }
    if (e.archetype === "silenced") {
      if (e.silenceTelegraphed) return;
      e.silenceIn -= 1;
      if (e.silenceIn <= early) this.telegraphPattern(e, "silence");
      return;
    }
    if (e.archetype === "shielded") {
      // v3.104.1 (P5) : Troll des forêts — bouclier au lieu de charge, mêmes champs que le bouclier boss.
      if (e.shieldTelegraphed) return;
      e.shieldIn -= 1;
      if (e.shieldIn <= early) this.telegraphPattern(e, "shield");
      return;
    }
    if (e.chargeTelegraphed) return;
    e.chargeIn -= 1;
    if (e.chargeIn <= early) this.telegraphPattern(e, "charge");
  },

  telegraphPattern: function (e, kind) {
    var info = {
      charge: { flag: "chargeTelegraphed", cond: "chargeIncoming", log: "⚠️ " + e.name + " prépare une charge !", toast: "⚠️ Charge au prochain tour !" },
      silence: { flag: "silenceTelegraphed", cond: "enemySilenceIncoming", log: "🔇 " + e.name + " se prépare à te réduire au silence !", toast: "🔇 Silence au prochain tour !" },
      shield: { flag: "shieldTelegraphed", cond: "shieldIncoming", log: "🛡️ " + e.name + " invoque un bouclier !", toast: "🛡️ Bouclier au prochain tour !" },
      heal: { flag: "healTelegraphed", cond: "healIncoming", log: "💚 " + e.name + " se prépare à se soigner !", toast: "💚 Soin au prochain tour !" },
      // v3.204.0 (E4) : exaltation d'élite — son archétype va compter double.
      surge: { flag: "surgeTelegraphed", cond: "eliteSurgeIncoming", log: "🔥 " + e.name + " s'exalte !", toast: "🔥 Exaltation au prochain tour !" }
    }[kind];
    if (!info) return;
    e[info.flag] = true;
    // v3.230.0 : Clairvoyance — un round de retenue, l'impact reste à sa date.
    if (this.hasPower("leg_clairvoyance")) e.patternHoldRounds = 1;
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
    else if (conditionId === "eliteSurgeIncoming") {
      // v3.204.0 (E4) : contrer une exaltation la repousse DEUX fois plus loin que
      // le cycle normal. Sans ça, le contre coûte un round et l'exaltation revient
      // 4 à 6 rounds plus tard : sur un combat de 12 rounds, contrer ne rapportait
      // rien (mesuré). C'est le report qui paie, pas l'annulation seule.
      e.surgeTelegraphed = false;
      e.surgeIn = randInt(ELITE_SURGE_ROUNDS_MIN * 2, ELITE_SURGE_ROUNDS_MAX * 2);
    }
    e.counteredRounds = COUNTER_CONFIRMATION_ROUNDS;
  },

  /* v3.204.0 (E4) : impact de l'exaltation — l'archétype de l'élite compte double
     pendant ELITE_SURGE_DURATION_ROUNDS. Aucune mécanique nouvelle n'est introduite :
     c'est le même archétype, plus fort, sur une fenêtre annoncée. */
  resolveEliteSurge: function () {
    var e = game.enemy;
    if (!e) return;
    if (window.CombatReportManager) {
      getConfiguredCounterSlotsForCondition("eliteSurgeIncoming").forEach(function (s) { CombatReportManager.logCounterExpired(s); });
    }
    e.surgeTelegraphed = false;
    e.surgeIn = randInt(ELITE_SURGE_ROUNDS_MIN, ELITE_SURGE_ROUNDS_MAX);
    e.surgeRounds = ELITE_SURGE_DURATION_ROUNDS;
    addLog("🔥 " + e.name + " s'exalte (" + ELITE_SURGE_DURATION_ROUNDS + " rounds) !", "event");
    if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
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

    /* v3.268.0 (L-2) : la frappe choisit sa victime parmi les alliés vivants. Sans
       compagnon présent, pickVictim() renvoie toujours le héros et la suite de cette
       fonction est celle d'avant, ligne pour ligne. */
    var victim = this.pickVictim();
    if (victim && window.CombatActors && !CombatActors.isHero(victim)) {
      return this.enemyStrikeCompanion(e, victim, dmgMult, isPatternOrBonus);
    }

    var power = Number(e.stats.power || 0);
    var precision = Number(e.stats.precision || 0);

    if (window.AfflictionManager && typeof AfflictionManager.getCombinedModifiers === "function") {
      power *= AfflictionManager.getCombinedModifiers().enemyPowerMult;
    }

    var dmg = Math.max(1, Math.floor(power * ENEMY_POWER_DMG_COEF * (e.isBoss ? BOSS_DMG_MULT : 1)));
    var patternMult = (typeof dmgMult === "number" && dmgMult > 0) ? dmgMult : 1;
    if (patternMult !== 1) dmg = Math.max(1, Math.floor(dmg * patternMult));

    if (e.archetype === "enraged" && typeof getEnragedDamageMultiplier === "function") {
      var enragedMult = getEnragedDamageMultiplier(this.getEnragedEffectivePctHpLost(), e); // v3.204.0 (E4)
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
    // v3.230.0 : Peau d'écorce — +5 % de défense pendant le round qui suit un coup reçu.
    var barkBonus = (Number(game._legBarkRounds || 0) > 0 && this.hasPower("leg_ecorce")) ? 0.05 : 0;
    var defense = Math.min(defenseCapNow, Number(game.heroDefensePct || 0) + barkBonus);
    dmg = Math.max(1, Math.floor(dmg * (1 - defense)));

    if (activeDefense) {
      if (activeDefense.effectType === "damageReduction" || activeDefense.effectType === "damageAbsorption") {
        dmg = Math.max(0, Math.floor(dmg * (1 - activeDefense.value)));
      } else if (activeDefense.effectType === "evasion") {
        if (chance(activeDefense.value * 100)) dmg = 0;
      }
    }

    var hpBefore = Number(game.heroHp != null ? game.heroHp : game.heroMaxHp || 1);
    /* v3.230.0 : Second souffle — une fois par combat, le coup mortel laisse 1 PV. */
    if (dmg >= hpBefore && !game._legSecondWindUsed && this.hasPower("leg_second_souffle")) {
      dmg = Math.max(0, hpBefore - 1);
      game._legSecondWindUsed = true;
      addLog("💨 Second souffle : tu tiens debout avec 1 PV !", "event");
      showToast("💨 Second souffle !", 1600);
    }
    game.heroHp = Math.max(0, hpBefore - dmg);
    if (dmg > 0) {
      game._legBarkRounds = 1;    // v3.230.0 : Peau d'écorce s'arme sur le coup reçu
      game._legFrenzyStacks = 0;  // v3.230.0 : Frénésie retombe dès qu'on encaisse
    }

    if (e.archetype === "vampiric" && dmg > 0 && typeof getVampiricLifestealAmount === "function") {
      if (!(Number(e.vampiricSuppressedRounds || 0) > 0)) {
        var healed = getVampiricLifestealAmount(dmg, e); // v3.204.0 (E4)
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

  /* v3.268.0 (L-2) : frappe encaissée par un compagnon. Volontairement plus simple que
     la version héros : pas de défense d'équipement, pas de Défense de classe, pas de
     pouvoir légendaire, pas de Second souffle — un compagnon n'a ni équipement ni kit.
     Ce qui vient de l'ENNEMI (puissance, boss, pattern, rage, critique, vampirisme,
     corruption) est identique, et c'est ce qui compte pour l'équilibrage. */
  enemyStrikeCompanion: function (e, victim, dmgMult, isPatternOrBonus) {
    var power = Number(e.stats.power || 0);
    var precision = Number(e.stats.precision || 0);

    if (window.AfflictionManager && typeof AfflictionManager.getCombinedModifiers === "function") {
      power *= AfflictionManager.getCombinedModifiers().enemyPowerMult;
    }

    var dmg = Math.max(1, Math.floor(power * ENEMY_POWER_DMG_COEF * (e.isBoss ? BOSS_DMG_MULT : 1)));
    var patternMult = (typeof dmgMult === "number" && dmgMult > 0) ? dmgMult : 1;
    if (patternMult !== 1) dmg = Math.max(1, Math.floor(dmg * patternMult));

    if (e.archetype === "enraged" && typeof getEnragedDamageMultiplier === "function") {
      var enragedMult = getEnragedDamageMultiplier(this.getEnragedEffectivePctHpLost(), e);
      if (enragedMult !== 1) dmg = Math.max(1, Math.floor(dmg * enragedMult));
    }

    if (chance(Math.min(40, precision * ENEMY_PRECISION_CRIT_COEF))) dmg = Math.floor(dmg * ENEMY_CRIT_MULT);
    dmg = Math.max(1, Math.floor(dmg * (1 - COMPANION_FLAT_DEFENSE)));

    victim.hp = Math.max(0, Number(victim.hp || 0) - dmg);
    addLog("🩸 " + e.name + " frappe " + (victim.name || "ton compagnon") + " (-" + formatNumber(dmg) + " PV)", "normal");

    if (e.archetype === "vampiric" && dmg > 0 && typeof getVampiricLifestealAmount === "function"
      && !(Number(e.vampiricSuppressedRounds || 0) > 0)) {
      var healed = getVampiricLifestealAmount(dmg, e);
      if (healed > 0) {
        e.hp = Math.min(e.maxHp, Number(e.hp || 0) + healed);
        if (typeof renderEnemyHp === "function") renderEnemyHp();
      }
    }

    if (e.archetype === "corrupted") {
      e.corruptedStacks = Math.min(
        (typeof CORRUPTED_MAX_STACKS === "number" ? CORRUPTED_MAX_STACKS : 5),
        Number(e.corruptedStacks || 0) + 1
      );
    }

    if (victim.hp <= 0 && window.CompanionManager) CompanionManager.noteKo(victim);

    // Jauge de célérité ennemie : même règle que contre le héros.
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

  /* v3.267.0 (L-1) : la fin de round se scinde en deux. Ce qui appartient au HÉROS
     (cooldowns, mana passif, Défense active, Peau d'écorce) est décompté UNE FOIS par
     round, quel que soit le nombre d'ennemis ; ce qui appartient à un ennemi (DoT,
     vulnérabilité, contre, rage figée, suppressions) est décompté sur chacun.
     Sans cette séparation, trois ennemis feraient tomber un cooldown de 3 au lieu de 1. */
  endRoundGroup: function (groupRef) {
    this.ensureState();
    if (window.ClassCombatManager && typeof ClassCombatManager.onRoundEnd === "function") ClassCombatManager.onRoundEnd();
    // v3.268.0 (L-2) : côté allié, une fois par round comme le reste des drapeaux héros.
    if (window.CompanionManager) CompanionManager.onRoundEnd();
    this.decayThreat();

    var list = groupRef || (window.CombatActors ? CombatActors.enemies().slice() : [game.enemy]);
    var heroFlagsTicked = false;
    for (var i = 0; i < list.length; i++) {
      if (this.endRoundEnemy(list[i], !heroFlagsTicked)) heroFlagsTicked = true;
    }
  },

  /* Décompte de fin de round pour UN ennemi. Retourne true si le tick a bien eu lieu
     (l'ennemi est toujours en lice), ce qui sert à n'armer qu'une fois les drapeaux héros. */
  endRoundEnemy: function (enemyRef, tickHeroFlags) {
    var e = enemyRef;
    if (!e || Number(e.hp || 0) <= 0) return false;
    var current = window.CombatActors ? CombatActors.enemies() : [game.enemy];
    if (current.indexOf(e) === -1) return false;
    this.prepareEnemy(e);

    // DoT (Brûlure arcanique) : peut tuer → killEnemy → nouvel ennemi, on s'arrête là.
    var self = this;
    this.withTarget(e, function () {
      if (window.ClassCombatManager && typeof ClassCombatManager.tickDoTRound === "function") ClassCombatManager.tickDoTRound();
    });
    if ((window.CombatActors ? CombatActors.enemies() : [game.enemy]).indexOf(e) === -1) return false;

    this.checkPhases(e);   // v3.288.0 : seuils de phase d'un boss ou d'une élite

    if (tickHeroFlags && Number(game._legBarkRounds || 0) > 0) game._legBarkRounds -= 1; // v3.230.0 : Peau d'écorce
    if (e.vulnerableRounds > 0) e.vulnerableRounds -= 1;
    if (e.counteredRounds > 0) e.counteredRounds -= 1;
    if (e.rageFreezeRounds > 0) e.rageFreezeRounds -= 1;
    if (e.vampiricSuppressedRounds > 0) e.vampiricSuppressedRounds -= 1;
    if (e.armorSuppressedRounds > 0) e.armorSuppressedRounds -= 1;
    return true;
  },

  /* Conservé tel quel : appelé par le harnais et par tout code qui termine le round
     d'un ennemi unique. Équivaut à endRoundGroup([enemyRef]). */
  endRound: function (enemyRef) {
    this.endRoundGroup([enemyRef]);
  },

  /* ---------- Horloge des modes automatiques (appelée par game-loop, dt déjà × vitesse) ---------- */
  tickRoundClock: function (dt) {
    this.ensureState();
    var round = game.combatRound;
    var auto = game.combatMode === "grimoire";
    if (!auto && !round.continueAttack) return;
    if (!this.isHeroTurnAvailable()) return;
    // v3.293.0 : aucun round automatique hors d'un run de quête (plus de farm libre)
    if (typeof hasCombatQuestContext === "function" && !hasCombatQuestContext()) return;

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
    // v3.267.0 (L-1) : un télégraphe sur N'IMPORTE quel membre du groupe interrompt.
    // À un seul ennemi, c'est exactement la condition historique.
    var group = window.CombatActors ? CombatActors.enemies() : [e];
    for (var i = 0; i < group.length; i++) {
      var f = group[i];
      if (f && (f.chargeTelegraphed || f.silenceTelegraphed || f.shieldTelegraphed || f.healTelegraphed)) return true;
    }
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

  /* v3.266.0 (L-0) : entrée unique de mise en place d'un groupe ennemi (1 à 3 membres).
     spawnEnemy() n'en est plus qu'un cas particulier à un seul membre — même ordre
     d'opérations, mêmes appels de rendu qu'avant. */
  spawnGroup: function (actors) {
    var list = [].concat(actors || []).filter(Boolean);
    if (!list.length) return null;

    /* v3.284.0 : le verrou de spawn vaut AUSSI ici. HuntQuestManager enchaîne son ennemi
       suivant par CombatEngine.spawnEnemy(), qui passe par spawnGroup et court-circuitait
       donc assignCurrentEnemy — une meute de chasse se voyait remplacée dès la mort de son
       premier membre (constaté au banc). */
    if (window.CombatActors && CombatActors._holdSpawn && CombatActors.aliveEnemies().length > 0) return;

    var self = this;
    var prepared = list.map(function (e) { return self.prepareEnemy(e); });

    /* v3.269.0 (L-3) — ORDRE ET ARRIVÉE (décisions Seb 17/09/2026).
       1. Tri par célérité décroissante : le plus rapide frappe en premier, et comme la
          rangée de portraits suit ce tableau, l'ordre des tours se lit à l'écran.
       2. Arrivée au contact décalée : seuls les membres qui doivent réellement approcher
          (engageIn > 0 — un tireur est à 0 par donnée) sont échelonnés 0, 1, 2 rounds.
          Sans ça, ils approchent tous ensemble et un groupe affaibli meurt avant
          d'arriver : le Mage ne perdait pas un PV (mesuré au banc).
       3. Compteurs de pattern décalés d'un round entre membres, pour que trois charges
          ne tombent jamais au même round. */
    if (prepared.length > 1) {
      prepared.sort(function (a, b) {
        return Number((b.stats && b.stats.celerity) || 0) - Number((a.stats && a.stats.celerity) || 0);
      });
      var retard = 0;
      for (var i = 0; i < prepared.length; i++) {
        var e = prepared[i];
        if (Number(e.engageIn || 0) > 0) { e.engageIn = retard; retard += 1; }
        e.chargeIn = Number(e.chargeIn || 0) + i;
        e.shieldIn = Number(e.shieldIn || 0) + i;
        e.silenceIn = Number(e.silenceIn || 0) + i;
        e.healIn = Number(e.healIn || 0) + i;
        if (e.surgeIn) e.surgeIn = Number(e.surgeIn) + i;
      }
    }

    if (window.CombatActors) CombatActors.setEnemies(prepared);
    else game.enemy = prepared[0];

    // v3.268.0 (L-2) : le groupe allié est reconstruit depuis game.companions, et un
    // compagnon KO au combat précédent revient avec des PV réduits (§4.4).
    if (window.CompanionManager) CompanionManager.onCombatStart();
    this.cancelManualRound();   // v3.276.0 : un round manuel en cours ne survit pas au spawn suivant

    if (typeof WorldManager !== "undefined" && typeof WorldManager.applyWorldTheme === "function") WorldManager.applyWorldTheme();

    /* v3.230.0 : deux pouvoirs qui s'appliquent à l'ouverture d'un combat. */
    if (this.hasPower("leg_foulee") && typeof CELERITY_GAUGE_MAX === "number") {
      game.heroGauge = Math.max(Number(game.heroGauge || 0), CELERITY_GAUGE_MAX / 2);
    }
    if (this.hasPower("leg_coeur_ardent") && game.classResource && game.classResource.max) {
      var res = game.classResource;
      res.current = Math.min(res.max, Number(res.current || 0) + Math.floor(res.max * 0.10));
    }

    if (typeof renderEnemy === "function") renderEnemy();
    if (typeof renderHud === "function") renderHud();
    return game.enemy;
  },

  spawnEnemy: function () {
    if (!window.WorldManager || typeof WorldManager.generateEnemy !== "function") return;
    this.spawnGroup([WorldManager.generateEnemy()]);
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

    // v3.256.0 (Cartes Vivantes, C-2) : mort face à l'élite d'un secteur — même dispatch que les autres runs.
    if (window.LivingMapManager && game.livingMaps && game.livingMaps.fight) {
      LivingMapManager.onFightLost();
      return;
    }

    // v3.126.0 (Petites Aventures, Lot PA2) : mort en nœud combat du scene-engine = perte
    // totale du run (SortieManager.end("death") déjà appelé ci-dessus, universel) — décision
    // Seb confirmée avant ce lot : pas d'échec "doux" à 50% ici, réservé à l'évacuation
    // (3 blessures) et à l'abandon volontaire. Termine le run proprement (écran de bilan).
    if (window.SceneRunManager && game.sceneRun && game.sceneRun.status === "combat") {
      SceneRunManager.onCombatDefeat();
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

  /* v3.266.0 (L-0) : `target` (optionnel, dernier argument) désigne l'ennemi frappé.
     Sans lui, c'est la cible courante — donc l'unique ennemi tant qu'il n'y en a qu'un.
     Tous les appels existants restent valides et se comportent à l'identique. */
  dealDamage: function (dmg, isCrit, fromTap, ignoreAffinity, target) {
    var foe = target || game.enemy;
    if (!foe) return;
    this.prepareEnemy(foe);

    dmg = Math.max(0, Number(dmg || 0));
    if (!ignoreAffinity) dmg *= getDamageAffinity().mult;

    if (foe.archetype === "corrupted" && typeof getCorruptedDamageMultiplier === "function") {
      var preCorruptedDmg = dmg;
      dmg *= getCorruptedDamageMultiplier(foe.corruptedStacks || 0, foe); // v3.204.0 (E4)
      if (window.CombatReportManager) CombatReportManager.logArchetypeImpact("corruptedDamageLost", preCorruptedDmg - dmg);
    }

    if (Number(foe.vulnerableRounds || 0) > 0) {
      dmg *= (1 + Number(foe.vulnerableMult || 0));
    }

    if ((foe.isBoss || foe.archetype === "shielded") && Number(foe.shieldRounds || 0) > 0) {
      dmg *= (1 - BOSS_SHIELD_REDUCTION);
    }

    if (foe.archetype === "armored" && typeof getArmoredEffectiveDamageReduction === "function") {
      var preArmoredDmg = dmg;
      dmg *= (1 - getArmoredEffectiveDamageReduction(foe));
      if (window.CombatReportManager) CombatReportManager.logArchetypeImpact("armoredDamageLost", preArmoredDmg - dmg);
    }

    if (foe.isBoss && game.talents.t_perfect_execution && foe.maxHp > 0 && (foe.hp / foe.maxHp) < 0.2) {
      dmg *= (1 + 0.15 * game.talents.t_perfect_execution);
    }

    foe.hp -= dmg;
    // v3.268.0 (L-2) : la menace va à l'allié qui vient de frapper. Sans cette ligne,
    // seuls les compagnons en accumulaient et le héros, coincé au plancher, ne recevait
    // plus aucun coup (mesuré : 0 % de PV perdus, tout encaissé par le compagnon).
    this.noteThreat(dmg);
    game.totalDamageDealt += dmg;
    if (window.CombatReportManager) CombatReportManager.logDamageDealt(dmg);

    if (fromTap) {
      showFloatingDamage(Math.floor(dmg), !!isCrit);
      vibrate(isCrit ? 30 : 10);
    }

    if (foe.hp <= 0) this.killEnemy(foe);
    else if (typeof renderEnemyHp === "function") renderEnemyHp();
  },

    /* v3.266.0 (L-0) : `enemyArg` (optionnel) désigne l'ennemi qui tombe. Sans lui, la
       cible courante.
       v3.269.0 (L-3) : s'il reste des membres vivants, le mort quitte simplement le groupe
       et le combat CONTINUE — pas d'avance de monde, pas de spawn enchaîné, pas de fin de
       quête. Son butin lui est crédité au passage (voir plus bas). À un seul ennemi, le
       flux historique est intact. */
  killEnemy: function (enemyArg) {
    var enemy = enemyArg || game.enemy;
    if (!enemy) return;

    if (window.HuntQuestManager && game.huntRun && game.huntRun.active) {
      game.totalKills += 1;
      game.killCounts[enemy.id] = (game.killCounts[enemy.id] || 0) + 1;
      if (window.SortieManager) SortieManager.noteKill(false); // la chasse n'a pas de boss (branche séparée avant grantGold/grantMissionXp)

      /* v3.284.0 — MEUTES DE CHASSE. Cette branche précède tout le reste, donc le retrait
         d'un membre doit se faire ICI aussi : sans ça, la chasse enchaînait son ennemi
         suivant dès la première mort et remplaçait la meute en cours (constaté au banc).
         Le kill compte pour le lot dans les deux cas — c'est la meute qui ne doit pas
         être balayée tant qu'il en reste. */
      var meute = window.CombatActors && CombatActors.enemies().length > 1;
      if (meute) CombatActors.removeEnemy(enemy);
      if (meute) CombatActors.holdSpawn(true);
      try {
        HuntQuestManager.onEnemyKilled();
      } finally {
        if (meute) CombatActors.holdSpawn(false);
      }
      if (meute && CombatActors.aliveEnemies().length) {
        addLog("⚔️ " + enemy.name + " tombe — il en reste "
          + CombatActors.aliveEnemies().length + ".", "normal");
      }
      if (typeof renderAll === "function") renderAll();
      saveGame();
      return;
    }

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

    var merchantBonusGold = 0;
    if (game.talents.t_merchant_instinct && chance(5 * game.talents.t_merchant_instinct)) {
      merchantBonusGold = Math.floor(goldGain * 0.5);
      goldGain += merchantBonusGold;
    }

    /* v3.230.0 : Prospecteur — un boss sur dix rapporte le double. */
    if (enemy.isBoss && this.hasPower("leg_prospecteur") && chance(10)) {
      goldGain *= 2;
      addLog("💰 Prospecteur : la bourse est doublée !", "event");
    }

    this.grantGold(goldGain);
    this.grantEssence(essenceGain);
    game.totalKills += 1;
    game.killCounts[enemy.id] = (game.killCounts[enemy.id] || 0) + 1;

    /* v3.269.0 (L-3) : membre d'un groupe encore fourni — on s'arrête ici. Le butin est
       crédité, le kill compté, mais rien de ce qui suit (jet d'objet de boss, événement
       aléatoire, avance de monde, fin de run, spawn enchaîné) ne doit se jouer tant que
       le groupe n'est pas vide : sinon un groupe de trois avancerait trois fois. */
    /* v3.286.0 — L'ESCORTE TOMBE AVEC SON ÉLITE. L'objectif d'une étape d'élite est
       « vaincre la Fileuse », pas « nettoyer la clairière » : à sa mort, sa couvée se
       disperse. Sans ça, l'escorte survivante empêchait la fin du combat — et donc la
       libération du secteur sur la Carte Vivante, où l'élite EST l'objectif (attrapé par
       le harnais). Le combat suit alors le flux normal, comme un duel d'élite. */
    if ((enemy.isElite || enemy.isBoss) && window.CombatActors && CombatActors.enemies().length > 1) {
      CombatActors.enemies().slice().forEach(function (e) {
        if (e !== enemy) CombatActors.removeEnemy(e);
      });
      addLog("🕷️ " + enemy.name + " tombe — son escorte se disperse.", "normal");
      // v3.288.0 : vaut aussi pour les renforts de phase d'un boss, même raison.
    }

    if (window.CombatActors && CombatActors.enemies().length > 1) {
      CombatActors.removeEnemy(enemy);
      if (window.QuestManager && typeof QuestManager.track === "function") QuestManager.track("kills", 1);

      /* Le kill doit compter pour la quête en cours — une meute de trois fait avancer un
         objectif de trois crans, pas d'un. On appelle donc le vrai système de run, en
         tenant fermé son spawn enchaîné (CombatActors.holdSpawn) : il compte, il ne
         remplace pas. Aucun fichier de quête n'est modifié. */
      CombatActors.holdSpawn(true);
      try {
        if (window.AdventureQuestManager && game.adventureQuestRun && game.adventureQuestRun.active) {
          AdventureQuestManager.onEnemyKilled(enemy);
        } else if (window.HuntQuestManager && game.huntRun && game.huntRun.active) {
          HuntQuestManager.onEnemyKilled();
        } else if (window.SceneRunManager && game.sceneRun && game.sceneRun.status === "combat") {
          /* v3.285.0 : rien à faire. Une vague de Petite Aventure se compte en RENCONTRES :
             tant qu'il reste un membre, le run ne doit surtout pas être prévenu, sinon la
             meute avancerait la vague deux fois. Le dernier membre, lui, passe par le flux
             normal plus bas et appelle onCombatWon(). */
        }
        // v3.293.0 : plus de trackKill de farm libre ici (voir fin de killEnemy)
      } finally {
        CombatActors.holdSpawn(false);
      }

      addLog("⚔️ " + enemy.name + " tombe (+" + formatNumber(goldGain) + " or) — il en reste "
        + CombatActors.aliveEnemies().length + ".", "normal");
      if (typeof renderAll === "function") renderAll();
      saveGame();
      return;
    }

    /* v3.230.0 : Lame vorace (soin au kill) et Frénésie (pile tant qu'on n'encaisse pas). */
    if (this.hasPower("leg_vorace") && game.heroHp > 0) {
      var healed = Math.max(1, Math.floor(Number(game.heroMaxHp || 0) * 0.02));
      game.heroHp = Math.min(Number(game.heroMaxHp || 0), game.heroHp + healed);
      if (typeof renderHeroHp === "function") renderHeroHp();
    }
    if (this.hasPower("leg_frenesie")) {
      game._legFrenzyStacks = Math.min(10, Number(game._legFrenzyStacks || 0) + 1);
    }
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
      var lootChance = 50 + (getAetherBonuses().lootBonus || 0) + (bestiaryBonus.lootBonus || 0)
        + (Number(game.equipDropChancePct) || 0); // v3.225.0 (périmètre confirmé par Seb) : affixe Chance de butin, plafonné dans recalcStats
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

    // v3.256.0 (Cartes Vivantes, C-2) : élite d'un secteur vaincue — le butin est déjà routé vers la sortie.
    if (window.LivingMapManager && game.livingMaps && game.livingMaps.fight && LivingMapManager.onFightWon(enemy)) {
      if (typeof renderAll === "function") renderAll();
      restoreEquipBagScroll();
      saveGame();
      return;
    }

    // v3.126.0 (Petites Aventures, Lot PA2) : nœud combat du scene-engine (profil Bourrin,
    // voir js/data/scene-templates.js petite_aventure_foret). Le gold/essence de ce kill a
    // déjà été routé vers SortieManager par grantGold()/grantEssence() ci-dessus (inSortie()
    // vrai, contexte "scene" actif depuis SceneRunManager.startRun) — rien à faire de spécial
    // pour le butin, seulement router la suite du combat vers le run plutôt que vers le farm
    // libre (WorldQuestManager/WorldManager.advance ci-dessous, qui ne concernent pas Scene).
    if (window.SceneRunManager && game.sceneRun && game.sceneRun.status === "combat") {
      SceneRunManager.onCombatWon();
      if (typeof renderAll === "function") renderAll();
      restoreEquipBagScroll();
      saveGame();
      return;
    }

    /* v3.293.0 (règle Seb 18/09/2026) : plus de farm libre. Ce point n'est atteint que par un
       combat hors quête, qui n'existe plus en jeu (switchTab le refuse) : il ne fait plus
       avancer ni le monde (WorldManager.advance), ni les questlines de monde (WorldQuestManager),
       ni aucune récompense de chapitre. worldIndex n'est plus écrit que par la traversée,
       le voyage, l'Ascension, le chargement et l'Admin. */

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
window.CELERITY_SOFT_CAP_K = CELERITY_SOFT_CAP_K; // v3.243.0
window.BOSS_DMG_MULT = BOSS_DMG_MULT;
window.ELITE_SURGE_ROUNDS_MIN = ELITE_SURGE_ROUNDS_MIN;
window.ELITE_SURGE_ROUNDS_MAX = ELITE_SURGE_ROUNDS_MAX;
window.ELITE_SURGE_DURATION_ROUNDS = ELITE_SURGE_DURATION_ROUNDS;
window.ELITE_SURGE_INTENSITY_MULT = ELITE_SURGE_INTENSITY_MULT;
window.ENEMY_POWER_DMG_COEF = ENEMY_POWER_DMG_COEF;
window.COMBAT_MODES = COMBAT_MODES;
window.THREAT_DECAY = THREAT_DECAY;          // v3.268.0 (L-2)
window.THREAT_FLOOR = THREAT_FLOOR;
window.COMPANION_FLAT_DEFENSE = COMPANION_FLAT_DEFENSE;
