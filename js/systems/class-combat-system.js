"use strict";
/* ============================================================
Aethervale — systems/class-combat-system.js
v3.34.0 : ADAPTATEUR qui branche le prototype de classes (data/
classes.js, data/class-skills.js) et ses modules purs (systems/
combat-resource-system.js, systems/combat-cooldown-system.js) au vrai
état de partie (game.*) et au vrai moteur de combat
(systems/combat-engine.js).

Rôle de ce fichier :
  - possède game.classResource / game.classCooldowns (état persistant,
    voir systems/save-system.js pour les 4 endroits câblés) ;
  - ClassCombatManager.getCurrentClassId() résout la classe du héros
    ACTUELLEMENT choisi (game.heroId) via getClassForHero() ;
  - useSkill(slot) est le point d'entrée UI (skill1/skill2/skill3/
    defense) : vérifie via canUseAction() (pur), applique les dégâts
    réels via CombatEngine.dealDamage(), dépense/gagne la ressource,
    démarre le cooldown, active l'effet défensif le cas échéant ;
  - getBasicAttackMultiplier()/onBasicAttackDealt() sont appelées par
    CombatEngine.playerAttack() (le tap) : la première applique le
    damageMultiplier de l'attaque de base de la classe AVANT le calcul
    de dégâts, la seconde fait gagner la ressource APRÈS, selon
    resource.generation (voir combat-resource-system.js) ;
  - tick(dt) est appelée depuis main/game-loop.js : décrémente les
    cooldowns et régénère la ressource passive (Mana), UNIQUEMENT tant
    que le combat actif tourne (écran Combat, pas de modale bloquante,
    héros pas à 0 PV) — même règle que l'auto-DPS/la riposte
    (confirmé par Seb : la ressource se fige hors combat actif).

Ne remplace PAS combat-resource-system.js / combat-cooldown-system.js
(toujours purs, non modifiés) — ce fichier ne fait qu'appeler leurs
fonctions avec le state réel et réassigner le résultat à game.*.

Comportement PAS branché dans cette livraison (déclaré en donnée,
ignoré ici, voir en-tête de data/class-skills.js) :
  - criticalChanceBonus (Tir précis), ignoreDefense (Tir perforant),
    damageOverTime (Brûlure arcanique), areaOfEffect (Déflagration).
  - Volonté -> réduction de cooldown ("option B" du bac à sable,
    SANDBOX_WILL_COOLDOWN_MIN_RATIO) : PAS repris ici, cooldowns fixes.
============================================================ */

/* getClassResourceIconForSlot/labels : petites tables d'icônes de
   repli (emoji) utilisées tant que Seb n'a pas fourni les vraies
   illustrations dédiées aux 3 nouvelles classes — voir
   renderIconOrEmojiHTML() (déjà tolérant à un emoji simple), ui/
   combat-view.js. Réutilise en priorité les icônes déjà livrées
   (images/Icons/special_attacks/) pour rester cohérent visuellement
   avec l'attaque spéciale historique, faute de mieux. */
var CLASS_ACTION_ICON_FALLBACK = {
  knight_heavy_strike: "./images/Icons/special_attacks/smashing_blow.png",
  knight_guard_break: "./images/Icons/special_attacks/attack6.png",
  knight_execute: "./images/Icons/special_attacks/attack10.png",
  knight_guard: "./images/Icons/special_attacks/defensive_stance.png",
  archer_precise_shot: "./images/Icons/special_attacks/attack3.png",
  archer_volley: "./images/Icons/special_attacks/multishot.png",
  archer_piercing_shot: "./images/Icons/special_attacks/attack4.png",
  archer_evasion: "./images/Icons/special_attacks/attack11.png",
  mage_arcane_blast: "./images/Icons/special_attacks/arcane_blast.png",
  mage_arcane_burn: "./images/Icons/special_attacks/attack12.png",
  mage_arcane_nova: "./images/Icons/special_attacks/cataclysm.png",
  mage_arcane_barrier: "./images/Icons/special_attacks/chaos_fury.png"
};

var ClassCombatManager = {
  /* Garantit l'existence de game.classResource/game.classCooldowns/
     game.classActiveDefense, sans jamais écraser un état déjà présent
     (même contrat que les autres ensure() du projet). */
  ensure: function () {
    if (!game.classResource || typeof game.classResource !== "object") {
      game.classResource = null; // recréé au premier besoin, voir ensureForCurrentClass()
    }
    if (!game.classCooldowns || typeof game.classCooldowns !== "object") {
      game.classCooldowns = (typeof createCooldownState === "function") ? createCooldownState() : {};
    }
    if (typeof game.classActiveDefense === "undefined") {
      game.classActiveDefense = null; // { actionId, effectType, value, expiresAt } ou null
    }
  },

  /* Classe du héros couramment sélectionné, ou null. */
  getCurrentClassId: function () {
    if (typeof getClassForHero !== "function" || typeof HEROES_DB === "undefined" || !game.heroId) return null;
    var hero = HEROES_DB[game.heroId];
    var cls = getClassForHero(hero);
    return cls ? cls.id : null;
  },

  /* (Re)crée game.classResource si absent ou si la classe attendue ne
     correspond plus à celle stockée (ex. juste après un changement de
     héros, voir resetForNewHero()). N'écrase jamais un état déjà
     cohérent avec la classe courante. */
  ensureForCurrentClass: function () {
    this.ensure();
    var classId = this.getCurrentClassId();
    if (!classId) return null;

    if (!game.classResource || game.classResource.classId !== classId) {
      game.classResource = (typeof createCombatResourceState === "function") ? createCombatResourceState(classId) : null;
    }
    return game.classResource;
  },

  /* v3.34.0 : appelée aux 2 points de sélection/changement de héros
     (confirmHeroSelection() dans ui/modal-view.js, selectHeroInline()
     dans ui/heros-view.js) — remise à zéro TOTALE de la ressource et
     des cooldowns de classe, même si la classe est identique
     (confirmé par Seb : sécurité, pas de report d'état entre héros). */
  resetForNewHero: function () {
    this.ensure();
    game.classResource = null;
    game.classCooldowns = (typeof createCooldownState === "function") ? createCooldownState() : {};
    game.classActiveDefense = null;
    this.ensureForCurrentClass();
  },

  /* true si le combat actif tourne (même règle que l'auto-DPS/la
     riposte, voir main/game-loop.js) — condition sous laquelle la
     ressource/les cooldowns de classe progressent. */
  isCombatActive: function () {
    if (game.activeTab !== "combat") return false;
    if (typeof isBlockingModalOpen === "function" && isBlockingModalOpen()) return false;
    if ((game.heroHp || 0) <= 0) return false;
    return true;
  },

  /* Un slot d'action ("skill1"/"skill2"/"skill3"/"defense") de la
     classe courante, ou null. */
  getAction: function (slot) {
    var classId = this.getCurrentClassId();
    if (!classId || typeof getClassAction !== "function") return null;
    return getClassAction(classId, slot);
  },

  /* Contexte combat pour checkActionConditions() (Exécution du
     Chevalier). */
  getCombatContext: function () {
    return {
      enemyHp: game.enemy ? game.enemy.hp : null,
      enemyMaxHp: game.enemy ? game.enemy.maxHp : null
    };
  },

  /* Réduction/évitement/absorption actuellement actif sur la riposte
     ennemie, ou null si rien n'est actif ou si l'effet a expiré.
     Appelée par CombatEngine.enemyStrike() (systems/combat-engine.js)
     AVANT d'appliquer les dégâts de riposte. */
  getActiveDefenseEffect: function () {
    this.ensure();
    var active = game.classActiveDefense;
    if (!active) return null;
    if (Date.now() >= active.expiresAt) {
      game.classActiveDefense = null;
      return null;
    }
    return active;
  },

  /* Tente d'utiliser une action offensive/défensive de la classe
     courante (skill1/skill2/skill3/defense). Retourne true si
     utilisée, false sinon (cooldown, ressource insuffisante,
     condition non remplie, pas de classe/action) — la fonction reste
     silencieuse sur l'échec, c'est à l'appelant UI de décider
     d'afficher un toast le cas échéant. */
  useSkill: function (slot) {
    this.ensure();
    if (!game.enemy) return false;
    if ((game.heroHp || 0) <= 0) return false;
    if (typeof isBlockingModalOpen === "function" && isBlockingModalOpen()) return false;

    var action = this.getAction(slot);
    if (!action) return false;

    var resourceState = this.ensureForCurrentClass();
    if (!resourceState) return false;

    var combatContext = this.getCombatContext();
    if (typeof canUseAction !== "function" || !canUseAction(resourceState, game.classCooldowns, action, combatContext)) {
      return false;
    }

    var result = useAction(resourceState, game.classCooldowns, action, combatContext);
    if (!result.success) return false;

    game.classResource = result.resourceState;
    game.classCooldowns = result.cooldownState;

    if (action.type === "defense") {
      this.activateDefenseEffect(action);
      addLog("🛡️ " + action.label + " !", "event");
      showToast((action.icon || "🛡️") + " " + action.label, 1400);
    } else {
      this.applyDamageAction(action);
      addLog("✨ " + action.label + " !", "event");
      showToast((action.icon || "✨") + " " + action.label, 1400);
    }

    if (typeof renderClassSkillButtons === "function") renderClassSkillButtons();
    saveGame();
    return true;
  },

  /* Applique une action de type "damage" (skill1/skill2/skill3) via
     CombatEngine.dealDamage() — même point d'entrée que le tap/l'auto-
     DPS/l'attaque spéciale historique, donc même traitement (affinité
     d'arme, popup flottant, Exécution parfaite, vulnérabilité posée
     par un Brise-garde précédent...).
     v3.34.1 : applique aussi les effets déclarés de l'action une fois
     le(s) coup(s) porté(s) — enemyVulnerability (Brise-garde) pose une
     vulnérabilité sur game.enemy, damageOverTime (Brûlure arcanique)
     démarre un DoT (voir applyDoT()). ignoreAffinity (Tir perforant)
     est lu directement sur l'action, pas sur ses effects[] (voir
     data/class-skills.js), et transmis à dealDamage(). */
  applyDamageAction: function (action) {
    var baseDamage = (window.EquipmentManager && typeof EquipmentManager.effectiveTapDamage === "function")
      ? EquipmentManager.effectiveTapDamage()
      : Math.max(1, Math.floor(game.tapDamage * game.tapMult) + Math.floor(game.equipFlatTapBonus || 0));

    var hits = Math.max(1, Number(action.hits || 1));
    var lastHitDmg = 0;
    for (var i = 0; i < hits; i++) {
      if (!game.enemy) break;
      var dmg = baseDamage * Number(action.damageMultiplier || 1);
      var critChance = Math.max(0, EquipmentManager.effectiveCritChance() - getEnemyWillCritPenalty());
      var isCrit = chance(critChance);
      if (isCrit) dmg = dmg * EquipmentManager.effectiveCritMult();
      lastHitDmg = dmg;
      CombatEngine.dealDamage(dmg, isCrit, true, !!action.ignoreAffinity);
    }

    if (game.enemy) this.applyActionEffects(action, lastHitDmg);
  },

  /* Applique les effets déclaratifs d'une action offensive (voir
     action.effects, data/class-skills.js) une fois le(s) coup(s)
     porté(s) — ignore silencieusement tout type d'effet inconnu ou
     non géré ici (aucune erreur, cohérent avec le reste du fichier). */
  applyActionEffects: function (action, lastHitDmg) {
    var effects = action.effects || [];
    for (var i = 0; i < effects.length; i++) {
      var effect = effects[i];
      if (!effect || !game.enemy) continue;

      if (effect.type === "enemyVulnerability") {
        // v3.34.1 : Brise-garde — voir CombatEngine.dealDamage(), qui
        // lit ces 2 champs sur game.enemy à CHAQUE coup porté (tap,
        // auto-DPS, autres skills), pas seulement celui-ci. Stocké sur
        // l'ennemi (pas un état "de classe") car lié à CET ennemi
        // précis : disparaît de lui-même s'il meurt avant expiration.
        game.enemy.vulnerableUntil = Date.now() + Number(effect.durationMs || 0);
        game.enemy.vulnerableMult = Number(effect.value || 0);
      } else if (effect.type === "damageOverTime") {
        this.applyDoT(effect, lastHitDmg);
      }
    }
  },

  /* Démarre/rafraîchit le DoT de Brûlure arcanique sur game.enemy —
     v3.34.1. percentPerSecond s'applique au dégât DIRECT du coup qui
     a posé le DoT (lastHitDmg, AVANT vulnérabilité/affinité, cohérent
     avec le texte de l'action "20% des dégâts de ce coup par
     seconde") — pas au damageMultiplier brut ni recalculé à chaque
     tick sur les stats courantes, pour un montant par tick stable et
     prévisible pendant toute la durée. Une nouvelle Brûlure sur le
     même ennemi REMPLACE le DoT en cours (pas de cumul), plus simple
     à lire pour le joueur qu'un empilement. Stocké sur game.enemy,
     comme la vulnérabilité, pour la même raison (disparaît avec lui). */
  applyDoT: function (effect, lastHitDmg) {
    var perTick = Math.max(0, Number(lastHitDmg || 0) * Number(effect.percentPerSecond || 0));
    game.enemy.dot = {
      perTickDamage: perTick,
      remainingMs: Number(effect.durationMs || 0),
      accumMs: 0 // accumulateur pour ticker toutes les 1000ms même avec un dt irrégulier
    };
  },

  /* Décompte du DoT actif sur game.enemy — v3.34.1. Appelée depuis
     tick(), déjà sous condition isCombatActive() (mêmes conditions que
     la riposte ennemie réelle) : pas de vérification redondante ici.
     Tick réel toutes les 1000ms (pas un dégât continu lissé), dégâts
     appliqués via CombatEngine.dealDamage() (fromTap: false, comme
     l'auto-DPS — pas de popup flottant dédié pour l'instant, cohérent
     avec l'auto-DPS qui n'en affiche pas non plus). */
  tickDoT: function (elapsedMs) {
    if (!game.enemy || !game.enemy.dot) return;

    var dot = game.enemy.dot;
    dot.accumMs += elapsedMs;
    dot.remainingMs -= elapsedMs;

    var guard = 0;
    while (dot.accumMs >= 1000 && guard < 10) {
      dot.accumMs -= 1000;
      guard++;
      if (!game.enemy || !game.enemy.dot) return; // l'ennemi a pu mourir sur un tick précédent de cette boucle
      CombatEngine.dealDamage(dot.perTickDamage, false, false, true); // ignoreAffinity: true, dégâts déjà calculés sur le coup d'origine
    }

    if (game.enemy && game.enemy.dot && game.enemy.dot.remainingMs <= 0) {
      delete game.enemy.dot;
    }
  },

  /* Active l'effet défensif d'une action "defense" (Garde/Esquive/
     Barrière) pour sa durée — lu par CombatEngine.enemyStrike() via
     getActiveDefenseEffect(). Un seul effet actif à la fois (une
     nouvelle activation remplace la précédente, cohérent avec le
     cooldown propre à chaque action qui empêche déjà tout chevauchement
     réel entre les 3 classes puisqu'une seule classe est active par
     héros).
     v3.34.0 : reprend les 2 talents de l'ancien bouclier universel
     (branche Survie), maintenant génériques aux 3 actions defense de
     classe — voir data/talents.js :
       - t_thick_skin ("Bouclier renforcé")  : +2000ms de durée/niveau
       - t_calm_breath ("Riposte du bouclier") : +5% de réduction/
         absorption/évasion SUPPLÉMENTAIRE par niveau, en plus de la
         valeur de base déclarée dans l'action (ex. Garde 50% base +
         5%/niveau = 65% au niveau 3). */
  activateDefenseEffect: function (action) {
    var effect = (action.effects && action.effects[0]) || null;
    if (!effect) return;

    var talentDurationBonusMs = (game.talents && game.talents.t_thick_skin) ? game.talents.t_thick_skin * 2000 : 0;
    var talentValueBonus = (game.talents && game.talents.t_calm_breath) ? game.talents.t_calm_breath * 0.05 : 0;

    game.classActiveDefense = {
      actionId: action.id,
      effectType: effect.type, // "damageReduction" | "evasion" | "damageAbsorption"
      value: Math.min(1, Number(effect.value || 0) + talentValueBonus),
      expiresAt: Date.now() + Number(effect.durationMs || 0) + talentDurationBonusMs
    };
  },

  /* Multiplicateur de dégâts de l'attaque de base de la classe
     courante (knight 1.00 / archer 0.85 / mage 0.70) — à appliquer par
     CombatEngine.playerAttack() (le tap) EN PLUS du calcul de dégâts
     existant (EquipmentManager.effectiveTapDamage()), avant tout autre
     bonus (talents, affinité d'arme...). Repli à 1 (comportement
     identique à avant v3.34.0) si aucune classe n'est résolue. */
  getBasicAttackMultiplier: function () {
    var action = this.getAction("basic");
    return action ? Number(action.damageMultiplier || 1) : 1;
  },

  /* À appeler par CombatEngine.playerAttack() APRÈS avoir infligé les
     dégâts du tap, avec le montant réellement infligé et si le coup
     était critique — fait gagner la ressource de classe selon la
     règle déclarée (resource.generation, voir data/class-skills.js
     et combat-resource-system.js pour le détail par type). */
  onBasicAttackDealt: function (damageDealt, isCritical) {
    var resourceState = this.ensureForCurrentClass();
    if (!resourceState) return;

    var classId = this.getCurrentClassId();
    var resourceDef = (typeof getClassResource === "function") ? getClassResource(classId) : null;
    if (!resourceDef || !resourceDef.generation) return;

    // Les 3 types de generation (damageDealtPercent/successfulBasicAttack/
    // passiveAndBasicAttack-canal attaque de base) sont tous couverts
    // par ce seul appel — voir applyResourceGain(), combat-resource-
    // system.js, pour le détail par type. Le champ basic.resourceGain
    // de data/class-skills.js (ex. Mage: 8) n'est qu'une VALEUR
    // AFFICHÉE dans le texte de l'action ; la vraie règle de gain
    // appliquée ici vient de resource.generation, source unique de
    // vérité (évite tout double comptage entre les deux champs).
    game.classResource = applyResourceGain(resourceState, resourceDef.generation, {
      damageDealt: damageDealt,
      isCritical: !!isCritical,
      isBasicAttack: true
    });
  },

  /* Décompte des cooldowns + régénération passive de la ressource
     (Mana) + DoT actif sur l'ennemi (Brûlure arcanique), UNIQUEMENT
     tant que le combat actif tourne (voir isCombatActive() — même
     conditions que la riposte ennemie réelle : écran Combat, pas de
     modale bloquante, héros pas à 0 PV) — appelée depuis
     main/game-loop.js à chaque frame avec le dt réel. */
  tick: function (dt) {
    this.ensure();
    if (!this.isCombatActive()) return;

    var elapsedMs = Math.max(0, Number(dt || 0)) * 1000;
    if (elapsedMs <= 0) return;

    // v3.34.1 : DoT sorti du bloc "classId requis" ci-dessous — un
    // Brûlure déjà posée sur l'ennemi doit continuer de ticker même si
    // getCurrentClassId() échouait pour une raison quelconque (garde
    // en profondeur, ne devrait pas arriver en jeu normal).
    this.tickDoT(elapsedMs);

    var classId = this.getCurrentClassId();
    if (!classId) return;

    this.ensureForCurrentClass();

    game.classCooldowns = tickCooldowns(game.classCooldowns, elapsedMs);

    var resourceDef = (typeof getClassResource === "function") ? getClassResource(classId) : null;
    if (resourceDef && resourceDef.generation && resourceDef.generation.type === "passiveAndBasicAttack") {
      game.classResource = tickResourceRegen(game.classResource, resourceDef.generation, elapsedMs);
    }
  }
};

window.ClassCombatManager = ClassCombatManager;
