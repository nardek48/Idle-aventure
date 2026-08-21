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

  /* v3.50.0 : contexte ÉTENDU pour le Grimoire de tactiques —
     sur-ensemble de getCombatContext() ci-dessus (mêmes champs
     enemyHp/enemyMaxHp, toujours utiles à Exécution même via une
     règle du Grimoire) + les champs lus par evaluateGrimoireCondition()
     (systems/combat-auto-policy-system.js). C'est ICI, et seulement
     ici, que les horodatages posés sur game.enemy par les patterns
     (chargeTelegraphUntil/shieldTelegraphUntil/healTelegraphUntil,
     voir combat-engine.js v3.48.0/v3.49.0) sont convertis en simples
     booléens — le moteur de règles pur ne lit jamais Date.now()
     lui-même. Séparée de getCombatContext() (pas fusionnée dedans)
     pour ne rien changer au contrat existant de checkActionConditions()/
     canUseAction(), déjà utilisé ailleurs avec la forme minimale. */
  getGrimoireCombatContext: function () {
    var base = this.getCombatContext();
    var now = Date.now();

    base.chargeIncoming = !!(game.enemy && game.enemy.chargeTelegraphUntil && now < game.enemy.chargeTelegraphUntil);
    base.shieldIncoming = !!(game.enemy && game.enemy.shieldTelegraphUntil && now < game.enemy.shieldTelegraphUntil);
    base.healIncoming = !!(game.enemy && game.enemy.healTelegraphUntil && now < game.enemy.healTelegraphUntil);

    var heroMaxHp = Number(game.heroMaxHp || 0);
    base.heroHpPercent = heroMaxHp > 0 ? Number(game.heroHp || 0) / heroMaxHp : null;

    return base;
  },

  /* v3.55.0 : secondes restantes avant le PROCHAIN déclenchement du
     pattern associé à conditionId ("chargeIncoming"/"shieldIncoming"/
     "healIncoming"), en Phase 1 d'accumulation (voir CombatEngine.
     enemyChargeTick()/bossShieldTick()/bossHealTick(), qui exposent
     déjà _chargeNextAt/_shieldNextAt/_healNextAt et leurs _Timer
     jumeaux directement sur game.enemy — aucune modification de
     combat-engine.js nécessaire, ces champs sont déjà publics).
     Retourne null si :
       - le télégraphe est DÉJÀ actif (pas en phase d'approche, déjà
         "imminent" — la fenêtre d'anticipation n'a plus de sens ici,
         voir chargeIncoming/etc. dans getGrimoireCombatContext()) ;
       - le minuteur n'a pas encore démarré (_XNextAt absent/0) ;
       - conditionId est inconnu ou "heroLowHp" (pas un pattern
         ennemi, aucun minuteur à lire pour cette condition). */
  getSecondsUntilPatternTrigger: function (conditionId) {
    if (!game.enemy) return null;

    var fieldMap = {
      chargeIncoming: { telegraph: "chargeTelegraphUntil", nextAt: "_chargeNextAt", timer: "_chargeTimer" },
      shieldIncoming: { telegraph: "shieldTelegraphUntil", nextAt: "_shieldNextAt", timer: "_shieldTimer" },
      healIncoming: { telegraph: "healTelegraphUntil", nextAt: "_healNextAt", timer: "_healTimer" }
    };
    var fields = fieldMap[conditionId];
    if (!fields) return null;

    if (game.enemy[fields.telegraph]) return null; // déjà télégraphié, plus en phase d'approche

    var nextAt = Number(game.enemy[fields.nextAt] || 0);
    if (nextAt <= 0) return null; // minuteur pas encore démarré

    var elapsed = Number(game.enemy[fields.timer] || 0);
    var remaining = nextAt - elapsed;
    return remaining > 0 ? remaining : 0;
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

  /* v3.58.0 : point d'entrée pour un contre MANUEL (tap/clic ou
     raccourci clavier, voir ui/combat-view.js) — réponse à Seb :
     "il doit avoir la possibilité de contrer autrement ça n'a aucun
     intérêt de jouer sans le Grimoire". Calcule le matchedConditionId
     de la même façon que le ferait une règle du Grimoire (regarde si
     l'action ciblée a un counters qui correspond à un télégraphe
     ACTUELLEMENT actif sur game.enemy), puis délègue à useSkill().
     Contrairement au Grimoire, il n'y a ici AUCUNE notion de règle
     configurée — l'action manuelle contre TOUT télégraphe actif
     qu'elle sait contrer, du moment que le joueur clique au bon
     moment (c'est le "skill check" manuel qui remplace l'anticipation
     automatique du Grimoire, voir la discussion avec Seb). Si
     l'action ne contre rien d'actif, matchedConditionId reste null et
     useSkill() se comporte exactement comme un tap normal. */
  useSkillManual: function (slot) {
    var action = this.getAction(slot);
    var matchedConditionId = null;

    if (action && Array.isArray(action.counters) && action.counters.length && game.enemy) {
      var context = this.getGrimoireCombatContext();
      for (var i = 0; i < action.counters.length; i++) {
        var conditionId = action.counters[i];
        if (context[conditionId]) {
          matchedConditionId = conditionId;
          break;
        }
      }
    }

    return this.useSkill(slot, matchedConditionId);
  },

  /* Tente d'utiliser une action offensive/défensive de la classe
     courante (skill1/skill2/skill3/defense). Retourne true si
     utilisée, false sinon (cooldown, ressource insuffisante,
     condition non remplie, pas de classe/action) — la fonction reste
     silencieuse sur l'échec, c'est à l'appelant UI de décider
     d'afficher un toast le cas échéant.
     v3.52.0 : matchedConditionId (optionnel) — id de la condition du
     Grimoire qui a sélectionné CETTE action, transmis par
     ClassCombatManager.tickAutoSkills() quand l'action vient d'une
     règle du Grimoire.
     v3.58.0 : désormais transmis AUSSI par useSkillManual() (voir
     juste au-dessus) pour un tap manuel/raccourci clavier qui contre
     réellement un pattern — réponse affinée avec Seb : "ça n'a aucun
     intérêt de jouer sans le Grimoire" si le contre lui reste
     exclusif ; un joueur qui joue manuellement (combat auto
     désactivé) peut désormais contrer lui-même en cliquant la bonne
     action pile pendant le bon télégraphe, exactement comme le ferait
     le Grimoire. Sert exclusivement au mécanisme de contre — voir
     applyGrimoireCounterIfApplicable() plus bas : le contre ne
     s'applique QUE si ce paramètre est fourni ET correspond à
     action.counters, décision explicite de Seb (jamais de contre
     "accidentel" en jouant la bonne action au bon moment SANS que le
     télégraphe correspondant ne soit réellement actif — voir
     applyGrimoireCounterIfApplicable() pour la vérification finale). */
  useSkill: function (slot, matchedConditionId) {
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

    // v3.52.0 : contre d'un pattern (Charge/Bouclier/Soin) — appliqué
    // AVANT les dégâts/l'effet défensif normal ci-dessous, pour que le
    // télégraphe soit déjà annulé au moment où applyDamageAction()/
    // activateDefenseEffect() s'exécutent (ordre sans importance réelle
    // ici puisque les 2 opèrent sur des champs game.enemy distincts,
    // mais plus lisible de "résoudre le contre" avant "jouer l'action").
    this.applyGrimoireCounterIfApplicable(action, matchedConditionId);

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

  /* v3.52.0 : mécanisme de contre — annule TOTALEMENT le pattern en
     cours de télégraphe (Charge/Bouclier/Soin) si l'action jouée
     déclare CETTE condition dans son champ counters (voir data/
     class-skills.js) ET que matchedConditionId (fourni par
     ClassCombatManager.tickAutoSkills() UNIQUEMENT via une règle du
     Grimoire, jamais par un tap manuel) correspond exactement.
     Annulation = remise à 0 du champ *TelegraphUntil correspondant
     sur game.enemy, exactement comme le fait déjà CombatEngine.
     resolve*() une fois le télégraphe écoulé normalement — sauf
     qu'ici, rien n'est résolu : le pattern disparaît purement et
     simplement (pas de bouclier posé, pas de PV rendus, pas de
     dégâts de charge), pas de neutralisation partielle (décision
     explicite de Seb). Le minuteur du PROCHAIN déclenchement (ex.
     game.enemy._shieldNextAt) n'est PAS reprogrammé ici — laissé à 0,
     ce qui refait naturellement démarrer un nouveau cycle
     d'accumulation au prochain tick du pattern concerné (même
     comportement qu'un minuteur qui vient de se déclencher, voir
     CombatEngine.bossShieldTick()/enemyChargeTick() : la ligne
     "if (!game.enemy._shieldNextAt) { ... }" recrée un nouvel
     intervalle aléatoire dès le tick suivant). Ne fait rien
     silencieusement si matchedConditionId est absent, si l'action n'a
     pas de counters, ou si aucun télégraphe correspondant n'est
     actuellement actif (contre "à vide", sans effet ni erreur). */
  applyGrimoireCounterIfApplicable: function (action, matchedConditionId) {
    if (!matchedConditionId || !game.enemy) return;
    if (!Array.isArray(action.counters) || action.counters.indexOf(matchedConditionId) === -1) return;

    var countered = false;

    if (matchedConditionId === "chargeIncoming" && game.enemy.chargeTelegraphUntil) {
      game.enemy.chargeTelegraphUntil = 0;
      countered = true;
    } else if (matchedConditionId === "shieldIncoming" && game.enemy.shieldTelegraphUntil) {
      game.enemy.shieldTelegraphUntil = 0;
      countered = true;
    } else if (matchedConditionId === "healIncoming" && game.enemy.healTelegraphUntil) {
      game.enemy.healTelegraphUntil = 0;
      countered = true;
    }

    if (countered) {
      addLog("⚡ Contre réussi : " + (action.label || "l'action") + " annule l'attaque adverse !", "event");
      showToast("⚡ Contré !", 1600);
      // v3.57.0 : popup flottant "⚡ CONTRÉ !" + badge de confirmation
      // sur l'ennemi — problème signalé par Seb : sans le journal/
      // toast (facile à rater), rien ne distinguait visuellement un
      // contre réussi d'une résolution normale du pattern (le badge
      // de statut disparaît de façon IDENTIQUE dans les 2 cas, au
      // même rendu — pas de fenêtre de temps pour animer une
      // transition sur un élément qui vient de disparaître). Solution
      // retenue : un champ TRANSITOIRE dédié (counteredUntil, ~800ms),
      // qui fait apparaître un badge de CONFIRMATION distinct
      // (buildEnemyStatusBarHTML(), ui/combat-view.js) à la place du
      // badge de télégraphe qui vient de s'effacer — plus robuste
      // qu'un flash CSS sur un élément fantôme. Voir combat-engine.js
      // pour COUNTER_CONFIRMATION_MS.
      game.enemy.counteredUntil = Date.now() + (typeof COUNTER_CONFIRMATION_MS === "number" ? COUNTER_CONFIRMATION_MS : 800);
      if (typeof showCounterSuccessPopup === "function") showCounterSuccessPopup();
      if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
    }
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
  },

  /* v3.55.0 : décide si la réserve de ressource (v3.54.0) doit être
     ACTIVE maintenant, pour la règle de contre la plus prioritaire du
     Grimoire. Conditions cumulatives :
       1) une règle de contre est configurée (getPrioritaryCounterRule) ;
       2) son pattern est en fenêtre d'approche — reste ≤ la fenêtre
          calculée pour CETTE action précise (getGrimoireApproachWindowSeconds(),
          v3.56.0 : proportionnelle au coût de l'action, plus une
          constante fixe — voir sa note pour la raison du changement)
          avant son télégraphe réel (getSecondsUntilPatternTrigger()),
          et n'est pas DÉJÀ télégraphié (dans ce cas la réserve n'a
          plus lieu d'être : soit la ressource est déjà suffisante et
          le Grimoire va agir ce tick, soit elle ne l'est pas et rien
          de plus ne peut être fait en un seul tick de toute façon) ;
       3) la PRÉDICTION optimiste (ressource actuelle + régénération
          estimée sur le temps restant, voir estimateResourceGainOverWindow())
          atteint le coût de l'action de contre — sinon, pas la peine
          de brider le repli pour un contre qui n'a statistiquement
          aucune chance d'être payé à temps.
     Décision explicite de Seb : l'estimation reste OPTIMISTE (peut
     échouer en pratique) — un vrai enjeu plutôt qu'un calcul garanti. */
  shouldActivateGrimoireReserve: function (activeRules, kit, resourceState) {
    if (!activeRules || !kit || !resourceState) return false;
    if (typeof getPrioritaryCounterRule !== "function") return false;

    var rule = getPrioritaryCounterRule(activeRules, kit);
    if (!rule) return false;

    var action = kit.actions[rule.actionSlot];
    if (!action || !(action.resourceCost > 0)) return false;

    var approachWindowSeconds = (typeof getGrimoireApproachWindowSeconds === "function")
      ? getGrimoireApproachWindowSeconds(action.resourceCost)
      : 0;

    var secondsRemaining = this.getSecondsUntilPatternTrigger(rule.conditionId);
    if (secondsRemaining === null) return false;
    if (secondsRemaining > approachWindowSeconds) return false; // pattern encore loin, pas la peine de brider

    var resourceDef = (typeof getClassResource === "function") ? getClassResource(kit.classId) : null;
    if (!resourceDef) return false;

    var totalCelerity = (window.CombatEngine && typeof CombatEngine.getTotalCelerity === "function")
      ? CombatEngine.getTotalCelerity()
      : 0;
    var effectiveCooldownMs = (typeof computeEffectiveCooldownMs === "function")
      ? computeEffectiveCooldownMs(BASIC_ATTACK_BASE_COOLDOWN_MS, totalCelerity)
      : BASIC_ATTACK_BASE_COOLDOWN_MS;

    var basicDamageEstimate = (window.EquipmentManager && typeof EquipmentManager.effectiveTapDamage === "function")
      ? EquipmentManager.effectiveTapDamage()
      : 0;

    var estimatedGain = (typeof estimateResourceGainOverWindow === "function")
      ? estimateResourceGainOverWindow(resourceDef, secondsRemaining, effectiveCooldownMs, basicDamageEstimate)
      : 0;

    var predictedTotal = Number(resourceState.current || 0) + estimatedGain;
    return predictedTotal >= action.resourceCost;
  },

  /* v3.54.0 : construit une COPIE de resourceState avec current
     plafonné à (current - reserveAmount), jamais négatif — utilisée
     UNIQUEMENT pour la décision du repli par défaut (chooseAutoAction),
     jamais pour une vraie dépense (le VRAI game.classResource n'est
     jamais touché ici, voir tickAutoSkills()). Fait "croire" au moteur
     de décision pur que moins de ressource est disponible, sans
     modifier la logique de canAfford()/spendResource() elles-mêmes
     (fichiers protégés, non modifiés) — un simple état d'entrée
     différent suffit à obtenir l'effet voulu. reserveAmount <= 0 :
     retourne resourceState tel quel (aucune réserve à appliquer,
     comportement identique à avant v3.54.0). */
  buildReservedResourceState: function (resourceState, reserveAmount) {
    if (!resourceState || !(reserveAmount > 0)) return resourceState;
    return Object.assign({}, resourceState, {
      current: Math.max(0, resourceState.current - reserveAmount)
    });
  },

  /* v3.47.0 : combat auto de base — remplace le tap manuel sur
     skill1/skill2/skill3/defense tant que game.autoSkillsEnabled est
     vrai (réglable dans Paramètres, actif par défaut).
     v3.50.0 : essaie D'ABORD les règles du Grimoire de tactiques
     (game.grimoireRules, voir chooseGrimoireAction()) — si aucune
     règle ne matche (condition fausse partout, ou action indisponible
     pour toutes les règles qui matchent), retombe sur
     chooseAutoAction() + getAutoPolicyDefault() comme avant v3.50.0.
     Réponse explicite de Seb : le Grimoire s'AJOUTE à la priorité par
     défaut, ne la remplace jamais — un joueur qui n'a configuré aucune
     règle (game.grimoireRules vide) retrouve EXACTEMENT le
     comportement de v3.47.0-v3.49.0, aucune régression.

     Cadencée par un accumulateur (AUTO_SKILLS_DECISION_INTERVAL_MS,
     pas chaque frame) — une décision toutes les 300ms suffit largement
     (les cooldowns/ressources réels évoluent bien plus lentement) et
     évite d'appeler useSkill() en boucle serrée pour rien la plupart
     du temps. Ne fait rien si l'attaque de base n'est pas non plus
     câblée en auto (voir tryAutoBasicAttack() plus bas, appelée
     séparément) — cette méthode ne gère QUE skill1/skill2/skill3/
     defense, jamais "basic". "basic" est délibérément EXCLU des slots
     assignables dans l'écran Grimoire (voir ui/grimoire-view.js) :
     useSkill("basic") existerait mécaniquement (kit.actions.basic est
     une entrée valide) mais court-circuiterait onBasicAttackDealt()
     (gain de ressource propre à l'attaque de base, normalement
     déclenché uniquement par CombatEngine.playerAttack()), créant une
     incohérence silencieuse avec le tap manuel — plutôt que complexifier
     useSkill() pour ce cas, "basic" reste hors périmètre des règles. */
  tickAutoSkills: function (dt) {
    if (!game.autoSkillsEnabled) return;
    if (!this.isCombatActive()) return;
    if (!game.enemy) return;

    game._autoSkillsAccumMs = Number(game._autoSkillsAccumMs || 0) + Math.max(0, Number(dt || 0)) * 1000;
    if (game._autoSkillsAccumMs < AUTO_SKILLS_DECISION_INTERVAL_MS) return;
    game._autoSkillsAccumMs = 0;

    var classId = this.getCurrentClassId();
    if (!classId || typeof getClassSkills !== "function") return;

    var kit = getClassSkills(classId);
    if (!kit) return;

    var resourceState = this.ensureForCurrentClass();
    if (!resourceState) return;

    // v3.50.0 : Grimoire d'abord (règles configurées par le joueur),
    // repli sur la priorité par défaut si rien ne matche.
    // v3.51.0 : tronqué au nombre de slots RÉELLEMENT débloqués (voir
    // getGrimoireSlotCount(), systems/combat-auto-policy-system.js —
    // jalons narratifs par monde, étape 4b) avant d'être transmis au
    // moteur pur — celui-ci ne connaît jamais game.worldsEverReached,
    // c'est la responsabilité de cet adaptateur de ne lui passer QUE
    // les règles autorisées. game.grimoireRules peut légitimement
    // contenir plus d'entrées que de slots actuellement débloqués
    // (ex. règles déjà configurées avant une régression théorique de
    // worldsEverReached, ou simplement le tableau complet à 6 entrées
    // dès l'init — voir ensureGrimoireRules(), ui/grimoire-view.js) :
    // les entrées au-delà du nombre débloqué sont ignorées ici, jamais
    // supprimées (le joueur les retrouve dès que le slot se débloque).
    // v3.52.0 : chooseGrimoireAction() retourne désormais un objet
    // { actionSlot, matchedConditionId } (au lieu d'une chaîne) —
    // matchedConditionId est transmis à useSkill() pour le mécanisme
    // de contre (action.counters, voir data/class-skills.js) : le
    // contre ne doit s'appliquer QUE si l'action vient d'une règle du
    // Grimoire, jamais du repli par défaut ci-dessous (qui, lui, ne
    // transmet jamais de conditionId à useSkill()).
    var grimoireContext = this.getGrimoireCombatContext();
    var slot = null;
    var matchedConditionId = null;

    var unlockedSlotCount = (typeof getGrimoireSlotCount === "function")
      ? getGrimoireSlotCount(game.worldsEverReached)
      : 2;
    var activeRules = (Array.isArray(game.grimoireRules) && game.grimoireRules.length)
      ? game.grimoireRules.slice(0, unlockedSlotCount)
      : null;

    if (activeRules && activeRules.length && typeof chooseGrimoireAction === "function") {
      var grimoireResult = chooseGrimoireAction(activeRules, kit, resourceState, game.classCooldowns, grimoireContext);
      if (grimoireResult) {
        slot = grimoireResult.actionSlot;
        matchedConditionId = grimoireResult.matchedConditionId;
      }
    }

    if (!slot) {
      // v3.54.0 : réserve de ressource pour le repli par défaut —
      // réponse explicite de Seb : "il faut de la ressource pour faire
      // les attaques spéciales, hors dans le combat automatique la
      // ressource est toujours utilisée au max [...] l'idée c'est
      // d'avoir un stock de ressources pour pouvoir utiliser le contre
      // au bon moment". Sans ça, le repli par défaut (chooseAutoAction,
      // priorité fixe qui dépense la ressource dès qu'elle est
      // utilisable) vide systématiquement la ressource AVANT qu'un
      // télégraphe n'apparaisse, rendant les règles de contre du
      // Grimoire inopérantes en pratique — pas un bug de LOGIQUE de
      // contre (déjà vérifié fonctionnel, v3.52.0), mais un problème
      // de RESSOURCE DISPONIBLE au bon moment.
      // v3.55.0 : la réserve n'est plus permanente dès qu'une règle de
      // contre est configurée — réponse affinée avec Seb : elle ne
      // s'active QUE dans la fenêtre d'approche (5.5s avant le
      // télégraphe réel, voir getSecondsUntilPatternTrigger()) ET
      // seulement si une PRÉDICTION optimiste montre que la ressource
      // sera atteignable à temps (voir shouldActivateGrimoireReserve()
      // ci-dessous) — sinon le repli tape librement, jamais bridé pour
      // un contre qui n'a de toute façon aucune chance d'être payé.
      // Le seuil réservé reste le coût de l'action de la règle de
      // contre la PLUS PRIORITAIRE (décision v3.54.0 inchangée) — la
      // réserve ne s'applique QU'AU repli, jamais aux autres règles du
      // Grimoire elles-mêmes.
      var reserveAmount = this.shouldActivateGrimoireReserve(activeRules, kit, resourceState)
        ? ((typeof getGrimoireCounterReserveAmount === "function") ? getGrimoireCounterReserveAmount(activeRules, kit) : 0)
        : 0;
      var resourceStateForFallback = this.buildReservedResourceState(resourceState, reserveAmount);

      var priorityList = (typeof getAutoPolicyDefault === "function") ? getAutoPolicyDefault(classId) : null;
      if (!priorityList) return;

      // v3.58.0 : le repli n'utilise JAMAIS l'action assignée à une
      // règle de contre du Grimoire — réponse affinée avec Seb suite à
      // un diagnostic complet (voir échange) : même avec la réserve de
      // ressource ci-dessus, le repli pouvait encore jouer CETTE MÊME
      // action de son propre chef (elle reste dans sa liste de
      // priorité normale), la mettant en cooldown à un moment
      // quelconque — y compris juste avant qu'un télégraphe n'apparaisse,
      // rendant le contre indisponible pour une raison de COOLDOWN
      // cette fois, pas de ressource (bug distinct de celui déjà
      // corrigé par la réserve v3.54.0-v3.56.0).
      // v3.59.0 : élargi à TOUTES les règles de contre configurées,
      // pas seulement la plus prioritaire — bug distinct signalé par
      // Seb en jeu réel : Règle 2 (ex. Garde contre la Charge) restait
      // exposée au repli, qui la jouait dès que son cooldown était
      // prêt (souvent le cas pour une action "defense" gratuite),
      // rendant CETTE règle indisponible au moment voulu — exactement
      // le même problème que celui corrigé pour la 1ère règle, mais
      // pas couvert par le filtrage initial (getPrioritaryCounterRule()
      // ne retournait qu'UNE règle). getAllCounterActionSlots() (voir
      // combat-auto-policy-system.js) couvre maintenant l'ensemble.
      var counterSlots = (activeRules && typeof getAllCounterActionSlots === "function")
        ? getAllCounterActionSlots(activeRules, kit)
        : [];
      var priorityListForFallback = counterSlots.length
        ? priorityList.filter(function (s) { return counterSlots.indexOf(s) === -1; })
        : priorityList;

      slot = (typeof chooseAutoAction === "function")
        ? chooseAutoAction(priorityListForFallback, kit, resourceStateForFallback, game.classCooldowns, grimoireContext)
        : null;
      matchedConditionId = null; // jamais de contre depuis le repli par défaut, voir note ci-dessus
    }

    // "basic" ne peut venir QUE du repli par défaut ici (jamais d'une
    // règle du Grimoire, voir note ci-dessus et la validation côté UI/
    // sanitizeGrimoireRules()) — sert de filler pour la simulation du
    // bac à sable ; en jeu réel, l'attaque de base auto est déjà
    // couverte séparément par tryAutoBasicAttack(). On évite donc un
    // 2e chemin de code pour "basic" ici.
    if (!slot || slot === "basic") return;

    this.useSkill(slot, matchedConditionId);
  },

  /* v3.47.0 : équivalent automatique de CombatEngine.requestPlayerAttack()
     pour l'attaque de base — déclenche playerAttack() dès que le
     cooldown de base est écoulé, tant que le mode auto est actif.
     Contrairement au tap manuel, pas de file d'attente nécessaire ici
     (on ne "rate" jamais une fenêtre : appelée chaque frame comme
     tickBasicAttackCooldown()). Reste silencieuse si aucune classe
     n'est résolue (repli identique au mode manuel, damageMultiplier=1). */
  tryAutoBasicAttack: function () {
    if (!game.autoSkillsEnabled) return;
    if (!this.isCombatActive()) return;
    if (!game.enemy) return;
    if ((game.basicAttackCooldownMs || 0) > 0) return;
    if (typeof CombatEngine === "undefined" || typeof CombatEngine.playerAttack !== "function") return;
    CombatEngine.playerAttack();
  }
};

/* Cadence de décision du combat auto (skill1/skill2/skill3/defense) —
   volontairement plus lente que le rythme frame (60fps) : les
   cooldowns/ressources réels évoluent sur des centaines de ms au
   minimum (le plus rapide, Frappe lourde, a un cooldown de 1500ms),
   300ms est largement suffisant pour ne rater aucune fenêtre
   d'opportunité tout en restant léger. */
var AUTO_SKILLS_DECISION_INTERVAL_MS = 300;

window.ClassCombatManager = ClassCombatManager;
