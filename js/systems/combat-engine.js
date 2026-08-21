"use strict";

var autoTapInterval = null;

/* ============================================================
Quest Idle — systems/combat-engine.js
Cœur de la boucle de combat : attaque du joueur (tap/auto-DPS/auto-tap),
riposte ennemie, mort d'un ennemi (récompenses, butin, avancée de la
progression), et petits événements aléatoires entre deux combats.
============================================================ */

/* v3.8 : le type de dégâts vient désormais du HÉROS choisi
   (HEROES_DB[heroId].weaponType), plus de l'icône de l'objet équipé
   dans l'emplacement Arme. Avant v3.8, chaque objet d'arme tirait au
   hasard une icône parmi sword/axe/staff/bow (voir
   EQUIPMENT_SLOT_CONFIG.weapon.icons, data/equipment.js), ce qui
   faisait varier le type de dégâts d'un joueur à l'autre selon la
   chance du loot. Depuis la simplification des icônes d'équipement
   (une seule illustration par type, l'arme ne montre plus plusieurs
   flavors mais seulement des variantes de rareté), l'icône de l'arme
   équipée ne varie plus assez pour porter cette mécanique — elle est
   donc rattachée au héros à la place (Chevalier/Chevalier du Chaos =
   épée, Rôdeur/Rôdeur du Chaos = arc, Mage/Sorcier du Chaos = magie),
   un choix qui a l'avantage d'être stable et lisible plutôt que
   dépendant d'un tirage aléatoire invisible pour le joueur. Aucune
   arme équipée du tout = toujours "unarmed" (malus -20%), inchangé. */
var RESIST_DMG_MULT = 0.7;   // Ennemi résistant au type d'arme -> -30% de dégâts infligés
var WEAK_DMG_MULT = 1.3;     // Ennemi faible au type d'arme -> +30% de dégâts infligés
var NO_WEAPON_MULT = 0.8;    // Aucune arme équipée -> -20% de dégâts infligés

function getPlayerDamageType() {
  if (!game.equipped || !game.equipped.weapon) return null;
  var hero = (window.HEROES_DB && game.heroId) ? HEROES_DB[game.heroId] : null;
  return (hero && hero.weaponType) || null;
}

/* Retourne l'affinité de dégâts courante face à l'ennemi affiché.
   status: "resist" | "weak" | "unarmed" | "neutral". */
function getDamageAffinity() {
  if (!game.enemy) return { type: null, status: "neutral", mult: 1 };

  var type = getPlayerDamageType();
  if (!type) return { type: null, status: "unarmed", mult: NO_WEAPON_MULT };

  var resists = game.enemy.resists || [];
  var weak = game.enemy.weak || [];

  if (resists.indexOf(type) !== -1) return { type: type, status: "resist", mult: RESIST_DMG_MULT };
  if (weak.indexOf(type) !== -1) return { type: type, status: "weak", mult: WEAK_DMG_MULT };
  return { type: type, status: "neutral", mult: 1 };
}

/* ============================================================
   v1.8.5 — Riposte ennemie (power/celerity/precision) et
   résistance ennemie au critique (will).
============================================================ */
var ENEMY_ATTACK_BASE_INTERVAL = 3;    // secondes entre deux attaques ennemies à célérité neutre
var ENEMY_POWER_DMG_COEF = 0.5;        // dégâts de riposte = power ennemi * ce coefficient
var ENEMY_PRECISION_CRIT_COEF = 0.3;   // % de chance de coup critique ennemi par point de précision
var ENEMY_CRIT_MULT = 1.5;             // multiplicateur sur un coup critique ennemi
var WILL_CRIT_RESIST_COEF = 0.05;      // réduction de la chance de critique du joueur par point de volonté ennemie
var DEFEAT_GOLD_PENALTY = 0.10;        // % d'or perdu quand le héros tombe à 0 PV

/* v3.48.0 : Charge — 1er pattern ennemi (étape 2 du Grimoire de
   tactiques, voir résumé de session). Un seul pattern, sur TOUS les
   ennemis normaux (pas les boss, voir enemyChargeTick() plus bas),
   sur un minuteur INDÉPENDANT de la riposte normale (n'y touche pas).
   Effet MODÉRÉ tant qu'aucun contre n'est disponible côté joueur (le
   Grimoire/les contres arrivent aux étapes 3-4) — réponse explicite de
   Seb : ne pas casser l'équilibrage v3.46.0 déjà calibré serré (pire
   cas ~6 kills avant KO). ×1.3 sur les dégâts de riposte de base,
   modéré par design, pas un nouveau palier de danger. */
var ENEMY_CHARGE_MIN_INTERVAL_S = 8;    // minuteur aléatoire 8-12s entre 2 Charges
var ENEMY_CHARGE_MAX_INTERVAL_S = 12;
var ENEMY_CHARGE_TELEGRAPH_MS = 1500;   // délai fixe entre l'avertissement visuel et l'impact — "déclenché tôt"
var ENEMY_CHARGE_DMG_MULT = 1.3;        // modéré, voir note ci-dessus

/* v3.49.0 : patterns de BOSS (étape 3 du Grimoire de tactiques) —
   Bouclier et Soin, TOTALEMENT distincts de la Charge ci-dessus
   (réservée aux ennemis normaux, inchangée). Réponse explicite de
   Seb : les 2 patterns peuvent être actifs SIMULTANÉMENT sur un même
   boss (2 minuteurs indépendants l'un de l'autre ET de la riposte
   normale), et s'appliquent identiquement en farm classique et en
   Donjon — le seul critère est game.enemy.isBoss === true, déjà posé
   par WorldManager.generateEnemy() ET DungeonManager.buildWaveEnemy()
   (même forme d'objet ennemi dans les 2 cas, voir data/bosses.js).
   Timings "longs" (10-25s de rencontre, catégorie élite-boss de la
   conception actée) — volontairement plus espacés que la Charge
   (8-12s) : un boss qui cumule 2 patterns sur des intervalles courts
   deviendrait illisible sans aucun contre disponible (le Grimoire
   n'existe pas encore, étape 4). */
var BOSS_SHIELD_MIN_INTERVAL_S = 10;
var BOSS_SHIELD_MAX_INTERVAL_S = 15;
var BOSS_SHIELD_TELEGRAPH_MS = 1500;
var BOSS_SHIELD_DURATION_MS = 4000;
var BOSS_SHIELD_REDUCTION = 0.5;        // -50% dégâts subis par le boss pendant BOSS_SHIELD_DURATION_MS

var BOSS_HEAL_MIN_INTERVAL_S = 10;
var BOSS_HEAL_MAX_INTERVAL_S = 15;
var BOSS_HEAL_TELEGRAPH_MS = 1500;
var BOSS_HEAL_PERCENT = 0.15;           // +15% des PV ACTUELS du boss au moment du soin (pas des PV max)

/* v3.34.3 : cooldown sur l'attaque de base (tap manuel) — repris du
   bac à sable (SANDBOX_DEFAULT_BASE_COOLDOWN_MS, systems/combat-
   sandbox-system.js), qui l'avait validé par simulation comme donnant
   un ressenti correct (ajusté 600ms -> 1000ms en v3.33.9, "trop proche
   du spam de clics" en dessous). Réduit par la Célérité totale du
   héros (base + entraînée) via computeEffectiveCooldownMs(), même
   formule et même plafond (-50% max) que les skills de classe — voir
   systems/combat-cooldown-system.js. Contrairement au bac à sable,
   cette valeur n'est pas réglable en jeu (pas d'écran de test),
   directement la constante ci-dessous. */
var BASIC_ATTACK_BASE_COOLDOWN_MS = 1000;

function getEnemyWillCritPenalty() {
  var stats = game.enemy && game.enemy.stats;
  if (!stats) return 0;
  return Number(stats.will || 0) * WILL_CRIT_RESIST_COEF;
}

/* Fait apparaître un nombre de dégâts flottant à un endroit
   légèrement aléatoire au-dessus de l'ennemi, avec un flash sur son
   icône. Purement visuel, aucun impact sur game.* */
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

/* Fait apparaître un "+X or" flottant. Purement visuel. */
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

/* v3.14 : dégâts encaissés par le héros affichés en rouge flottant,
   même principe que showGoldPopup() ci-dessus mais ancré sur le mini
   portrait du héros (#combat-hero-mini, HUD en haut de l'écran Combat
   — voir ui/hud-view.js) plutôt que sur l'ennemi, pour bien distinguer
   visuellement "dégâts infligés" (or vert, sur l'ennemi) de "dégâts
   reçus" (rouge, sur le héros). */
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

var CombatEngine = {
  /* Fait apparaître un nouvel ennemi (via WorldManager.generateEnemy)
     et réinitialise le minuteur de riposte. Appelée au démarrage et
     après chaque kill. */
  spawnEnemy: function () {
    if (!window.WorldManager || typeof WorldManager.generateEnemy !== "function") return;

    game.enemy = WorldManager.generateEnemy();
    game._enemyAttackTimer = 0;
    if (typeof WorldManager.applyWorldTheme === "function") WorldManager.applyWorldTheme();
    if (typeof renderEnemy === "function") renderEnemy();
    if (typeof renderHud === "function") renderHud();
  },

  /* v3.34.3 : point d'entrée pour un tap HUMAIN (clic/tap sur le
     bouton ATTAQUE ou le sprite ennemi) — playerAttack() reste la
     fonction qui exécute réellement un coup (appelée directement par
     autoTap(), qui gère son propre rythme et n'a pas besoin de file
     d'attente). Si le cooldown de l'attaque de base est déjà écoulé,
     exécute immédiatement. Sinon, met le coup en FILE D'ATTENTE
     (profondeur 1 — un seul coup en attente, les clics suivants
     pendant le même cooldown sont ignorés) : il se déclenche
     automatiquement dès la fin du cooldown, voir tickBasicAttackCooldown()
     appelée depuis main/game-loop.js. */
  requestPlayerAttack: function () {
    if (!game.enemy || !window.EquipmentManager) return;
    if (typeof isBlockingModalOpen === "function" && isBlockingModalOpen()) return;
    if ((game.heroHp || 0) <= 0) return;

    if ((game.basicAttackCooldownMs || 0) > 0) {
      game.basicAttackPending = true;
      return;
    }

    this.playerAttack();
  },

  /* Célérité TOTALE du héros (base + entraînée), même source que
     game.autoDps (voir StatsSystem.recalcStats(), systems/stats-system.js)
     mais ce total brut n'est stocké nulle part ailleurs dans game.* —
     recalculé ici à la volée, même pattern que ui/heros-view.js et
     ui/shop-view.js qui font déjà ce calcul pour l'affichage. */
  getTotalCelerity: function () {
    var hero = typeof getHeroByGameId === "function" ? getHeroByGameId(game.heroId) : null;
    var baseCelerity = (hero && hero.stats) ? Number(hero.stats.celerity) || 0 : 0;
    var trainedCelerity = (game.trainedStats && game.trainedStats.celerity) || 0;
    return baseCelerity + trainedCelerity;
  },

  /* Décompte du cooldown de l'attaque de base — appelée depuis
     main/game-loop.js à chaque frame avec le dt réel (secondes).
     Déclenche automatiquement le coup en attente (game.basicAttackPending)
     dès que le cooldown atteint 0. */
  tickBasicAttackCooldown: function (dt) {
    if ((game.basicAttackCooldownMs || 0) <= 0) return;

    game.basicAttackCooldownMs -= Math.max(0, Number(dt || 0)) * 1000;

    if (game.basicAttackCooldownMs > 0) {
      // v3.34.3 : rafraîchi À CHAQUE FRAME tant que le cooldown court
      // (même rythme que renderEnemyHp(), pas throttlé) — le compte à
      // rebours affiché doit défiler sans attendre le prochain coup.
      if (typeof renderBasicAttackCooldown === "function") renderBasicAttackCooldown();
      return;
    }

    game.basicAttackCooldownMs = 0;
    if (game.basicAttackPending) {
      game.basicAttackPending = false;
      this.playerAttack(); // relance elle-même un nouveau cooldown + son propre rendu, voir plus bas
    } else if (typeof renderBasicAttackCooldown === "function") {
      // Cooldown terminé SANS coup en attente : il faut quand même
      // retirer le grisage visuel, playerAttack() ne sera pas appelée
      // ici pour le faire à notre place.
      renderBasicAttackCooldown();
    }
  },

  /* Une attaque "tap" (clic manuel, ou déclenchée par le talent
     Main spectrale via autoTap). Calcule les dégâts avec critique
     éventuel, applique les bonus de talents pertinents, puis
     délègue à dealDamage() pour l'appliquer réellement. */
  playerAttack: function () {
    if (!game.enemy || !window.EquipmentManager) return;
    // v3.4 : garde défensive supplémentaire — un tap ne doit jamais
    // faire progresser le combat tant qu'une fenêtre plein écran est
    // ouverte (voir isBlockingModalOpen, main/game-loop.js). En
    // temps normal le clic est déjà bloqué visuellement par la
    // fenêtre elle-même ; ce garde couvre les cas où ce ne serait pas
    // le cas (ex. autoTap() appelle aussi playerAttack()).
    if (typeof isBlockingModalOpen === "function" && isBlockingModalOpen()) return;
    // v3.15 : un héros à 0 PV ne peut plus taper du tout (couvre aussi
    // autoTap(), qui appelle cette même fonction) — doit se reposer au
    // Campement avant de continuer à se battre. Pas de toast ici
    // (silencieux) pour éviter un spam de messages si autoTap()
    // continue de se déclencher toutes les 2s pendant que le joueur
    // reste sur l'écran Combat à 0 PV.
    if ((game.heroHp || 0) <= 0) return;

    // v3.34.0 : le tap manuel EST désormais l'attaque de base de la
    // classe du héros choisi (voir data/classes.js/class-skills.js et
    // systems/class-combat-system.js) — damageMultiplier appliqué ici
    // (knight 1.00 / archer 0.85 / mage 0.70), avant tout autre bonus.
    // window.ClassCombatManager peut être absent en théorie (ordre de
    // script) : repli à 1 (comportement identique à avant v3.34.0).
    var classBasicMult = (window.ClassCombatManager && typeof ClassCombatManager.getBasicAttackMultiplier === "function")
      ? ClassCombatManager.getBasicAttackMultiplier()
      : 1;

    var dmg = Math.max(1, Math.floor(EquipmentManager.effectiveTapDamage() * classBasicMult));
    var critChance = Math.max(0, EquipmentManager.effectiveCritChance() - getEnemyWillCritPenalty());
    var isCrit = chance(critChance);

    if (isCrit) {
      dmg = Math.floor(dmg * EquipmentManager.effectiveCritMult());
      if (window.QuestManager && typeof QuestManager.track === "function") QuestManager.track("crits", 1);
    }

    // v3.28 : chaque talent va maintenant jusqu'à 3 niveaux —
    // game.talents.t_x est un NOMBRE (0-3). Chaque ligne convertie
    // garde EXACTEMENT la magnitude par niveau qui existait avant
    // cette refonte (niveau 1 = même puissance qu'avant).
    // v3.29.6 : t_sharpened_blades et t_bloodlust retirés d'ici — déjà
    // appliqués via game.tapMult dans effectiveTapDamage() (stats-system.js),
    // les réappliquer ici les comptait deux fois (bug, voir CHANGELOG).
    if (game.enemy.isBoss && game.talents.t_war_instinct) dmg = Math.floor(dmg * (1 + 0.05 * game.talents.t_war_instinct));
    if (game.enemy.isBoss && game.talents.t_boss_slayer) dmg = Math.floor(dmg * (1 + 0.08 * game.talents.t_boss_slayer));

    if (game.talents.t_assault_frenzy) {
      if (game._frenzyReady) {
        dmg = Math.floor(dmg * (1 + 0.25 * game.talents.t_assault_frenzy));
        game._frenzyReady = false;
        showToast("💥 Frénésie d'assaut !", 1000);
      }
      game._frenzyTapCount = (game._frenzyTapCount || 0) + 1;
      if (game._frenzyTapCount >= 20) {
        game._frenzyTapCount = 0;
        game._frenzyReady = true;
      }
    }

    this.dealDamage(dmg, isCrit, true);

    // v3.34.0 : gain de ressource de classe (Rage/Concentration/Mana)
    // sur ce tap — voir ClassCombatManager.onBasicAttackDealt() pour
    // la règle exacte par classe (resource.generation). dmg est le
    // montant AVANT affinité d'arme (même base que le bac à sable) —
    // volontaire, l'affinité ne doit pas pénaliser la génération de
    // ressource d'un joueur mal équipé face à un ennemi résistant.
    if (window.ClassCombatManager && typeof ClassCombatManager.onBasicAttackDealt === "function") {
      ClassCombatManager.onBasicAttackDealt(dmg, isCrit);
    }

    // v3.34.3 : démarre le cooldown de l'attaque de base — voir
    // BASIC_ATTACK_BASE_COOLDOWN_MS en tête de fichier. Réduit par la
    // Célérité totale (computeEffectiveCooldownMs(), systems/combat-
    // cooldown-system.js — même formule que les skills de classe).
    // Démarré ICI (fin de playerAttack, pas de requestPlayerAttack) :
    // autoTap() appelle playerAttack() directement et doit aussi
    // relancer ce cooldown, sinon un tap Main spectrale pourrait
    // s'enchaîner avec un tap manuel sans délai.
    var totalCelerity = this.getTotalCelerity();
    game.basicAttackCooldownMs = (typeof computeEffectiveCooldownMs === "function")
      ? computeEffectiveCooldownMs(BASIC_ATTACK_BASE_COOLDOWN_MS, totalCelerity)
      : BASIC_ATTACK_BASE_COOLDOWN_MS;
    if (typeof renderBasicAttackCooldown === "function") renderBasicAttackCooldown();
  },

  /* DPS automatique continu (stat Célérité + bonus), appelée chaque
     frame de la boucle de jeu avec le delta-temps écoulé. */
  /* Auto-DPS du héros (stat Célérité). v3.0 : appelée uniquement quand
     le joueur est SUR l'écran Combat (voir main/game-loop.js) — ce
     n'est plus une simulation de fond permanente, c'est une aide
     active. La chasse ambiante (que le joueur regarde l'écran ou non)
     est désormais portée par le village (Hôtel de Ville), voir
     VillageManager.tickAmbientHunting() dans systems/offline-system.js. */
  autoAttack: function (dt) {
    if (!game.enemy || !window.EquipmentManager) return;

    var dps = EquipmentManager.effectiveAutoDps();
    if (dps <= 0) return;

    var damage = dps * Math.max(0, Number(dt || 0));
    if (damage <= 0) return;
    this.dealDamage(damage, false, false);
  },

  /* Talent "Main spectrale" : déclenche une vraie attaque (tap complet,
     avec chance de critique etc.) toutes les X secondes automatiquement.
     Voir syncAutoTapLoop() dans main/game-loop.js pour le minuteur.
     v3.0 : ne se déclenche plus que sur l'écran Combat — même principe
     que autoAttack() ci-dessus (aide active, plus de simulation en
     fond ; c'est désormais l'Hôtel de Ville qui simule la chasse
     ambiante, voir VillageManager.tickAmbientHunting).
     v3.34.3 : respecte aussi le cooldown de l'attaque de base — sans
     ce garde, Main spectrale contournerait le cooldown du tap manuel
     (silencieux, pas de mise en file : l'auto-tap se redéclenchera de
     lui-même au prochain intervalle, inutile d'empiler une attente). */
  autoTap: function () {
    if (!game.enemy || !game.talents.t_auto_tap) return;
    if (game.activeTab !== "combat") return;
    if ((game.basicAttackCooldownMs || 0) > 0) return;
    this.playerAttack();
  },

  /* v1.8.5 : riposte ennemie, cadencée par la célérité de l'ennemi affiché.
     Accumule le temps écoulé dans game._enemyAttackTimer et déclenche
     une ou plusieurs frappes (enemyStrike) quand l'intervalle est atteint
     — le `while` gère le cas d'un gros pic de dt (ex: onglet remis au
     premier plan après un moment) sans spammer indéfiniment (guard). */
  enemyAttackTick: function (dt) {
    if (!game.enemy || !game.enemy.stats) return;

    var celerity = Number(game.enemy.stats.celerity || 0);
    var interval = ENEMY_ATTACK_BASE_INTERVAL / (1 + celerity / 40);

    game._enemyAttackTimer = Number(game._enemyAttackTimer || 0) + Math.max(0, Number(dt || 0));

    var guard = 0;
    while (game._enemyAttackTimer >= interval && guard < 10) {
      game._enemyAttackTimer -= interval;
      this.enemyStrike();
      guard++;
    }
  },

  /* v3.48.0 : minuteur INDÉPENDANT de la Charge — n'accumule/ne
     déclenche jamais rien via game._enemyAttackTimer (riposte normale
     ci-dessus), pour ne pas modifier sa cadence existante. Stocké sur
     game.enemy lui-même (game.enemy._chargeTimer/chargeTelegraphUntil),
     comme vulnerableUntil/dot — disparaît naturellement si l'ennemi
     meurt/est remplacé par spawnEnemy(), aucun nettoyage manuel requis.
     Deux phases :
       1) accumulation jusqu'à un intervalle aléatoire 8-12s -> pose
          chargeTelegraphUntil (Date.now() + 1500ms), log + toast,
          rafraîchit la barre de statut (badge visuel, voir
          buildEnemyStatusBarHTML(), ui/combat-view.js) ;
       2) une fois chargeTelegraphUntil dépassé -> résout l'impact
          (resolveEnemyCharge()) et reprogramme le prochain minuteur.
     Uniquement les ennemis NORMAUX (jamais un boss, réponse explicite
     de Seb — les patterns de boss sont l'étape 3, potentiellement
     plusieurs patterns cumulés, pas de raison de préempter ce
     territoire avec la Charge ici). */
  enemyChargeTick: function (dt) {
    if (!game.enemy || !game.enemy.stats || game.enemy.isBoss) return;
    if ((game.heroHp || 0) <= 0) return;

    // Phase 2 : télégraphe en cours, vérifie l'expiration.
    if (game.enemy.chargeTelegraphUntil) {
      if (Date.now() >= game.enemy.chargeTelegraphUntil) {
        this.resolveEnemyCharge();
      }
      return; // rien d'autre à faire tant que le télégraphe est actif
    }

    // Phase 1 : accumulation vers le prochain déclenchement.
    if (!game.enemy._chargeNextAt) {
      game.enemy._chargeNextAt = randFloat(ENEMY_CHARGE_MIN_INTERVAL_S, ENEMY_CHARGE_MAX_INTERVAL_S);
    }
    game.enemy._chargeTimer = Number(game.enemy._chargeTimer || 0) + Math.max(0, Number(dt || 0));

    if (game.enemy._chargeTimer >= game.enemy._chargeNextAt) {
      game.enemy._chargeTimer = 0;
      game.enemy._chargeNextAt = 0; // reprogrammé après résolution (resolveEnemyCharge)
      game.enemy.chargeTelegraphUntil = Date.now() + ENEMY_CHARGE_TELEGRAPH_MS;

      addLog("⚠️ " + game.enemy.name + " prépare une charge !", "event");
      showToast("⚠️ Charge imminente !", 1200);
      if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
    }
  },

  /* Impact de la Charge, une fois le télégraphe écoulé — réutilise
     enemyStrike(dmgMult) pour tout le reste du pipeline (défense
     passive/active, critique, popup rouge, mort du héros...), sans
     dupliquer cette logique. Reprogramme immédiatement le prochain
     minuteur (nouvel intervalle aléatoire), pour que la Charge se
     répète tant que ce même ennemi reste affiché. */
  resolveEnemyCharge: function () {
    if (!game.enemy) return;
    game.enemy.chargeTelegraphUntil = 0;
    game.enemy._chargeNextAt = randFloat(ENEMY_CHARGE_MIN_INTERVAL_S, ENEMY_CHARGE_MAX_INTERVAL_S);

    this.enemyStrike(ENEMY_CHARGE_DMG_MULT);

    if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
  },

  /* v3.49.0 : orchestre les 2 minuteurs de pattern boss (Bouclier,
     Soin) — appelée depuis main/game-loop.js à côté de
     enemyChargeTick(), même conditions de garde. Chacun des 2 tourne
     sur son propre minuteur INDÉPENDANT (voir en-tête des constantes
     BOSS_SHIELD_ et BOSS_HEAL_ ci-dessus), sans interaction entre eux — les 2
     peuvent donc se télégraphier/résoudre au même moment sur le même
     boss (cumul voulu, réponse explicite de Seb). Ne fait rien si
     l'ennemi affiché n'est pas un boss (ni les 2 sous-fonctions, mais
     un seul garde ici évite de le répéter 2 fois). */
  bossPatternTick: function (dt) {
    if (!game.enemy || !game.enemy.stats || !game.enemy.isBoss) return;
    if ((game.heroHp || 0) <= 0) return;

    this.bossShieldTick(dt);
    this.bossHealTick(dt);
  },

  /* Bouclier — même structure à 2 phases que enemyChargeTick() ci-
     dessus (accumulation -> télégraphe -> résolution), mais SANS
     réutiliser son code : minuteur/champs dédiés
     (game.enemy._shieldTimer/_shieldNextAt/shieldTelegraphUntil),
     Charge reste totalement inchangée par cette étape. Une fois
     résolu, pose game.enemy.shieldActiveUntil (lu par dealDamage()
     pour réduire les dégâts subis par le boss pendant
     BOSS_SHIELD_DURATION_MS) — PAS un simple flag booléen, pour que
     l'effet expire de lui-même sans action de tick dédiée (même
     principe que vulnerableUntil, déjà en place pour la vulnérabilité
     posée par Brise-garde). */
  bossShieldTick: function (dt) {
    if (game.enemy.shieldTelegraphUntil) {
      if (Date.now() >= game.enemy.shieldTelegraphUntil) {
        this.resolveBossShield();
      }
      return;
    }

    if (!game.enemy._shieldNextAt) {
      game.enemy._shieldNextAt = randFloat(BOSS_SHIELD_MIN_INTERVAL_S, BOSS_SHIELD_MAX_INTERVAL_S);
    }
    game.enemy._shieldTimer = Number(game.enemy._shieldTimer || 0) + Math.max(0, Number(dt || 0));

    if (game.enemy._shieldTimer >= game.enemy._shieldNextAt) {
      game.enemy._shieldTimer = 0;
      game.enemy._shieldNextAt = 0; // reprogrammé après résolution (resolveBossShield)
      game.enemy.shieldTelegraphUntil = Date.now() + BOSS_SHIELD_TELEGRAPH_MS;

      addLog("🛡️ " + game.enemy.name + " invoque un bouclier !", "event");
      showToast("🛡️ Bouclier imminent !", 1200);
      if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
    }
  },

  /* Active l'effet du Bouclier (lu par dealDamage()) et reprogramme
     le prochain minuteur — le bouclier lui-même expire de lui-même
     via shieldActiveUntil, pas de résolution "d'impact" comme la
     Charge (rien à infliger ici, c'est un effet PASSIF sur les
     prochains coups reçus, pas un coup porté). */
  resolveBossShield: function () {
    if (!game.enemy) return;
    game.enemy.shieldTelegraphUntil = 0;
    game.enemy._shieldNextAt = randFloat(BOSS_SHIELD_MIN_INTERVAL_S, BOSS_SHIELD_MAX_INTERVAL_S);
    game.enemy.shieldActiveUntil = Date.now() + BOSS_SHIELD_DURATION_MS;

    addLog("🛡️ Le bouclier se referme !", "event");
    if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
  },

  /* Soin périodique — même structure à 2 phases, champs dédiés
     (game.enemy._healTimer/_healNextAt/healTelegraphUntil). +15% des
     PV ACTUELS du boss au moment du soin (pas des PV max, réponse
     explicite de Seb — impact plus faible si le boss est déjà bas),
     plafonné à maxHp (jamais de sur-soin visible côté barre de vie). */
  bossHealTick: function (dt) {
    if (game.enemy.healTelegraphUntil) {
      if (Date.now() >= game.enemy.healTelegraphUntil) {
        this.resolveBossHeal();
      }
      return;
    }

    if (!game.enemy._healNextAt) {
      game.enemy._healNextAt = randFloat(BOSS_HEAL_MIN_INTERVAL_S, BOSS_HEAL_MAX_INTERVAL_S);
    }
    game.enemy._healTimer = Number(game.enemy._healTimer || 0) + Math.max(0, Number(dt || 0));

    if (game.enemy._healTimer >= game.enemy._healNextAt) {
      game.enemy._healTimer = 0;
      game.enemy._healNextAt = 0; // reprogrammé après résolution (resolveBossHeal)
      game.enemy.healTelegraphUntil = Date.now() + BOSS_HEAL_TELEGRAPH_MS;

      addLog("💚 " + game.enemy.name + " se prépare à se soigner !", "event");
      showToast("💚 Soin imminent !", 1200);
      if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
    }
  },

  /* Applique le soin (+15% des PV actuels, plafonné à maxHp) et
     reprogramme le prochain minuteur. Ne déclenche jamais killEnemy()
     (un soin ne peut évidemment pas faire tomber les PV à 0) —
     rafraîchit juste la barre de vie affichée. */
  resolveBossHeal: function () {
    if (!game.enemy) return;
    game.enemy.healTelegraphUntil = 0;
    game.enemy._healNextAt = randFloat(BOSS_HEAL_MIN_INTERVAL_S, BOSS_HEAL_MAX_INTERVAL_S);

    var healAmount = Math.max(1, Math.floor(Number(game.enemy.hp || 0) * BOSS_HEAL_PERCENT));
    game.enemy.hp = Math.min(game.enemy.maxHp, game.enemy.hp + healAmount);

    addLog("💚 " + game.enemy.name + " récupère " + formatNumber(healAmount) + " PV !", "event");
    showToast("💚 +" + formatNumber(healAmount) + " PV boss", 1200);

    if (typeof renderEnemyHp === "function") renderEnemyHp();
    if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
  },

  /* Une frappe de riposte ennemie : dégâts basés sur sa Puissance,
     chance de critique basée sur sa Précision, réduits par la
     défense du héros (issue de son Endurance).
     v3.48.0 : paramètre optionnel dmgMult (defaut 1) — réutilisée par
     resolveEnemyCharge() (Charge, voir plus bas) pour appliquer un
     multiplicateur modéré SANS dupliquer tout le pipeline (défense
     passive/active, critique, popup, mort du héros...). Un appel
     enemyStrike() sans argument reste identique au comportement
     d'avant v3.48.0 (dmgMult replié à 1). */
  enemyStrike: function (dmgMult) {
    if (!game.enemy || !game.enemy.stats) return;
    // v3.15 : un héros déjà à 0 PV est "à terre" — ne doit plus
    // pouvoir encaisser de dégâts supplémentaires (et donc plus
    // redéclencher onHeroDefeated() en boucle, avec sa pénalité d'or,
    // à chaque tick de riposte). En pratique ce cas ne devrait plus
    // se produire du tout : le combat automatique est maintenant
    // coupé dès que game.heroHp <= 0 (voir main/game-loop.js) — ce
    // garde reste en dernier recours, défense en profondeur.
    if ((game.heroHp || 0) <= 0) return;

    var power = Number(game.enemy.stats.power || 0);
    var precision = Number(game.enemy.stats.precision || 0);

    // v3.20 : Fléau (affliction) augmente la puissance de riposte
    // ennemie — voir AfflictionManager.getCombinedModifiers().enemyPowerMult.
    if (window.AfflictionManager && typeof AfflictionManager.getCombinedModifiers === "function") {
      power *= AfflictionManager.getCombinedModifiers().enemyPowerMult;
    }

    var dmg = Math.max(1, Math.floor(power * ENEMY_POWER_DMG_COEF));
    // v3.48.0 : multiplicateur de pattern (Charge) — appliqué sur les
    // dégâts DE BASE, avant critique/défense, comme un coup "plus
    // fort" ordinaire plutôt qu'un mécanisme séparé.
    var patternMult = (typeof dmgMult === "number" && dmgMult > 0) ? dmgMult : 1;
    if (patternMult !== 1) dmg = Math.max(1, Math.floor(dmg * patternMult));

    var isCrit = chance(Math.min(40, precision * ENEMY_PRECISION_CRIT_COEF));
    if (isCrit) dmg = Math.floor(dmg * ENEMY_CRIT_MULT);

    // v3.34.0 : l'ancien bouclier universel (DefenseManager/
    // DEFENSE_ABILITY, data/heroes.js) est remplacé par l'action
    // "defense" propre à la classe du héros (Garde/Esquive/Barrière,
    // voir data/class-skills.js + systems/class-combat-system.js).
    // Plafond de défense normal (Endurance + équipement) toujours 60%,
    // relevé à 85% pendant qu'une action défensive de classe est
    // active — même principe que l'ancien bouclier, juste sa source.
    var activeDefense = window.ClassCombatManager && typeof ClassCombatManager.getActiveDefenseEffect === "function"
      ? ClassCombatManager.getActiveDefenseEffect()
      : null;
    var defenseCapNow = activeDefense ? 0.85 : 0.6;
    var defense = Math.min(defenseCapNow, Number(game.heroDefensePct || 0));
    dmg = Math.max(1, Math.floor(dmg * (1 - defense)));

    // Effet de l'action défensive de classe, EN PLUS de la réduction
    // de défense classique ci-dessus (les deux se cumulent, dans cet
    // ordre — cohérent avec le bac à sable) :
    //   - damageReduction (Garde)    : réduit dmg de X%
    //   - damageAbsorption (Barrière) : réduit dmg de X% (même calcul,
    //     nom différent pour rester fidèle au texte de l'action)
    //   - evasion (Esquive)          : X% de chance d'ignorer TOUT le
    //     coup (dmg mis à 0), sinon dégâts inchangés par cet effet
    if (activeDefense) {
      if (activeDefense.effectType === "damageReduction" || activeDefense.effectType === "damageAbsorption") {
        dmg = Math.max(0, Math.floor(dmg * (1 - activeDefense.value)));
      } else if (activeDefense.effectType === "evasion") {
        if (chance(activeDefense.value * 100)) dmg = 0;
      }
    }

    game.heroHp = Math.max(0, Number(game.heroHp != null ? game.heroHp : game.heroMaxHp || 1) - dmg);

    showDamageTakenPopup(dmg);

    if (typeof renderHeroHp === "function") renderHeroHp();

    if (game.heroHp <= 0) this.onHeroDefeated();
  },

  /* Quand les PV du héros tombent à 0 : pénalité légère (perte d'une
     partie de l'or courant) puis PV totalement restaurés — pas de
     "game over", juste une petite sanction pour inciter à investir
     en Endurance/défense plutôt qu'un vrai risque d'arrêt du jeu. */
  onHeroDefeated: function () {
    // En donjon, une défaite arrête la tentative en cours (voir
    // DungeonManager.onDefeat) au lieu du malus léger habituel.
    if (window.DungeonManager && game.dungeonRun && game.dungeonRun.active) {
      DungeonManager.onDefeat();
      return;
    }

    // v3.2 : même principe pour un run de quête d'aventure en cours —
    // arrête le run (sans pénalité de récompense, la progression déjà
    // enregistrée reste acquise, voir AdventureQuestManager.onDefeat).
    if (window.AdventureQuestManager && game.adventureQuestRun && game.adventureQuestRun.active) {
      AdventureQuestManager.onDefeat();
      return;
    }

    // v3.30 : même principe pour une Chasse en cours (voir
    // HuntQuestManager.onDefeat) — arrête le lot en cours, la viande
    // déjà stockée reste acquise.
    if (window.HuntQuestManager && game.huntRun && game.huntRun.active) {
      HuntQuestManager.onDefeat();
      return;
    }

    // v3.28 : talent "Sang-froid" (t_essence_bloom, branche Survie
    // rethématisée) — réduit la pénalité de défaite de 10%/niveau
    // (ex. niveau 3 = pénalité effective ×0.70 de sa valeur normale).
    var talentPenaltyReduction = (game.talents && game.talents.t_essence_bloom) ? game.talents.t_essence_bloom * 0.10 : 0;
    var effectivePenaltyPct = DEFEAT_GOLD_PENALTY * Math.max(0, 1 - talentPenaltyReduction);
    var lost = Math.floor((game.gold || 0) * effectivePenaltyPct);
    game.gold = Math.max(0, game.gold - lost);
    // v3.15 : les PV tombent à 0 (au lieu d'être totalement restaurés)
    // — un vrai repos au Campement (long ou court, voir
    // systems/camp-system.js) est maintenant nécessaire avant de
    // repartir au combat. Le combat automatique se coupe tant que
    // game.heroHp <= 0 (voir main/game-loop.js), donc pas de risque de
    // redéclencher la défaite en boucle en revenant sur l'écran Combat
    // sans s'être soigné.
    game.heroHp = 0;

    // v3.41 : une défaite renvoie aussi au tout début du cycle (monde
    // 1, 1er ennemi) — même position que switch/création de héros,
    // sans incrémenter cycleCount (ce n'est pas un cycle bouclé).
    if (window.WorldManager && typeof WorldManager.resetToCycleStart === "function") {
      WorldManager.resetToCycleStart();
      if (typeof WorldManager.applyWorldTheme === "function") WorldManager.applyWorldTheme();
      // game.enemy pointait encore sur l'ancien monde : régénéré tout
      // de suite pour que le repos au Campement reprenne bien au 1er
      // ennemi du monde 1 (les PV du héros restent à 0, spawnEnemy()
      // ne touche pas au combat automatique).
      if (typeof WorldManager.generateEnemy === "function") {
        game.enemy = WorldManager.generateEnemy();
      }
    }

    addLog("💀 Vous avez été terrassé ! -" + formatNumber(lost) + " or. Il faut te reposer avant de repartir au combat.", "event");
    showToast("💀 Terrassé ! -" + formatNumber(lost) + " or", 1800);
    vibrate([80, 40, 80]);

    // v3.14 : renvoie au Campement avec un petit message.
    // v3.15 : ce n'est plus une simple mise en scène — les PV sont
    // vraiment à 0, le repos est désormais réellement nécessaire.
    // game.justDied est un indicateur transitoire (pas sauvegardé) lu
    // une seule fois par buildCampHTML() puis effacé, pour n'afficher
    // le message qu'au tout premier rendu suivant la mort.
    game.justDied = true;
    if (typeof switchTab === "function") switchTab("campement");

    if (typeof renderHeroHp === "function") renderHeroHp();
    if (typeof renderHud === "function") renderHud();
    saveGame();
  },

  /* Point d'entrée UNIQUE pour infliger des dégâts à l'ennemi affiché,
     que ce soit depuis un tap, l'auto-DPS, ou l'auto-tap — applique
     l'affinité de dégâts (résistance/faiblesse/sans arme) et le
     bonus "Exécution parfaite" avant de retirer les PV, puis
     déclenche killEnemy() si l'ennemi tombe à 0. */
  /* ignoreAffinity (optionnel) : si vrai, saute le multiplicateur de
     résistance/faiblesse d'arme — utilisé par l'attaque spéciale du
     Mage ("Explosion arcanique", dégâts purs qui ignorent tout). */
  dealDamage: function (dmg, isCrit, fromTap, ignoreAffinity) {
    if (!game.enemy) return;

    dmg = Math.max(0, Number(dmg || 0));
    if (!ignoreAffinity) dmg *= getDamageAffinity().mult;

    // v3.34.1 : vulnérabilité posée par Brise-garde (Chevalier, voir
    // data/class-skills.js) — stockée sur game.enemy lui-même (pas
    // game.classActiveDefense, qui ne concerne que les effets DÉFENSIFS
    // du héros) car liée à CET ennemi précis : si l'ennemi meurt avant
    // expiration, spawnEnemy() fait apparaître un nouvel objet enemy
    // sans ce champ, l'effet disparaît donc naturellement avec lui.
    if (game.enemy.vulnerableUntil && Date.now() < game.enemy.vulnerableUntil) {
      dmg *= (1 + Number(game.enemy.vulnerableMult || 0));
    }

    // v3.49.0 : Bouclier de boss (voir CombatEngine.resolveBossShield())
    // — réduit les dégâts subis PENDANT shieldActiveUntil. Appliqué
    // APRÈS la vulnérabilité ci-dessus (les 2 peuvent coexister sur un
    // même coup en théorie — vulnérabilité vient du joueur, bouclier
    // du boss, chacun garde son propre effet indépendamment) et AVANT
    // Exécution parfaite ci-dessous (le bonus de dégâts sous 20% PV
    // doit continuer de s'appliquer sur le montant déjà réduit par le
    // bouclier, pas le contourner).
    if (game.enemy.isBoss && game.enemy.shieldActiveUntil && Date.now() < game.enemy.shieldActiveUntil) {
      dmg *= (1 - BOSS_SHIELD_REDUCTION);
    }

    if (game.enemy.isBoss && game.talents.t_perfect_execution && game.enemy.maxHp > 0 && (game.enemy.hp / game.enemy.maxHp) < 0.2) {
      dmg *= (1 + 0.15 * game.talents.t_perfect_execution);
    }

    game.enemy.hp -= dmg;
    game.totalDamageDealt += dmg;

    if (fromTap) {
      showFloatingDamage(Math.floor(dmg), !!isCrit);
      vibrate(isCrit ? 30 : 10);
    }

    if (game.enemy.hp <= 0) this.killEnemy();
    else if (typeof renderEnemyHp === "function") renderEnemyHp();
  },

  /* La plus grosse fonction du fichier : tout ce qui se passe à la
     mort d'un ennemi, dans l'ordre —
     1) calcul or/essence (multiplicateurs équipement/bestiaire/talents)
     2) application des compteurs (kills, quêtes, maîtrise d'arme)
     3) butin si c'est un boss (+ chance de le doubler)
     4) événement aléatoire si ce n'est PAS un boss (8% de chance)
     5) avancée de la progression (WorldManager.advance) + récompense
        de fin de chapitre éventuelle
     6) XP du héros, puis fait apparaître le prochain ennemi. */
  killEnemy: function () {
    if (!game.enemy) return;

    // v3.42 : Chasse (voir data/hunt-quests.js) — ne rapporte QUE la
    // viande (gérée par HuntQuestManager.onEnemyKilled()), jamais
    // d'or/essence/XP/équipement/événement aléatoire du kill normal.
    // Court-circuite ICI, avant tout calcul de récompense, contrairement
    // à Donjon/Quête d'aventure plus bas qui gardent l'or/essence/XP de
    // base et ne différent que sur la suite (vague/chapitre).
    if (window.HuntQuestManager && game.huntRun && game.huntRun.active) {
      game.totalKills += 1;
      game.killCounts[game.enemy.id] = (game.killCounts[game.enemy.id] || 0) + 1;
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

    // v2.90.19 : "Contrats lucratifs" (boutique classique) ne bonifie QUE
    // l'or de boss, séparément de game.goldMult — voir data/upgrades.js
    // (u_bounty) et stats-system.js (game.bossGoldBonusPct).
    if (enemy.isBoss) {
      goldGain = Math.floor(goldGain * (1 + Number(game.bossGoldBonusPct || 0)));
    }

    essenceGain = Math.ceil(essenceGain * Math.max(1, Number(game.essenceGlobalMult || 1)));

    if (enemy.isBoss) {
      var aetherBonuses = getAetherBonuses();
      essenceGain += aetherBonuses.essenceBonus || 0;

      // v3.28 : t_thick_skin et t_vital_anchor ont migré vers un thème
      // défense/PV (branche Survie rethématisée) — leurs anciens
      // bonus d'essence de boss ont donc été retirés d'ici.

      // v3.20 : Colosses (affliction) — bonus d'essence de boss, même
      // principe que game.bossGoldBonusPct juste au-dessus (voir
      // stats-system.js recalcStats() pour où ce champ est rempli).
      if (game.bossEssenceBonusPct) {
        essenceGain = Math.ceil(essenceGain * (1 + Number(game.bossEssenceBonusPct || 0)));
      }
    }

    // v3.28 : t_tenacious_will a migré vers un thème PV max (branche
    // Survie rethématisée) — cet ancien bonus or/essence "monde
    // difficile" a été retiré.
    var currentWorld = (window.WORLDS && window.WorldManager) ? WORLDS[WorldManager.worldIndex] : null;

    // Instinct marchand : petite chance de récompense bonus
    var merchantBonusGold = 0;
    if (game.talents.t_merchant_instinct && chance(5 * game.talents.t_merchant_instinct)) {
      merchantBonusGold = Math.floor(goldGain * 0.5);
      goldGain += merchantBonusGold;
    }

    game.gold += goldGain;
    game.essence += essenceGain;
    game.totalGoldEarned += goldGain;
    game.totalKills += 1;
    game.killCounts[enemy.id] = (game.killCounts[enemy.id] || 0) + 1;

    if (window.QuestManager && typeof QuestManager.track === "function") {
      QuestManager.track("kills", 1);
      QuestManager.track("goldEarned", goldGain);
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
      // v3.20 : Avarice (affliction) divise la chance de drop — voir
      // AfflictionManager.getCombinedModifiers().lootChanceMult.
      if (window.AfflictionManager && typeof AfflictionManager.getCombinedModifiers === "function") {
        lootChance *= AfflictionManager.getCombinedModifiers().lootChanceMult;
      }
      var rolls = 1;
      // Prospection astrale : petite chance de doubler le butin gagné
      if (game.talents.t_astral_prospecting && chance(5 * game.talents.t_astral_prospecting)) rolls = 2;

      for (var r = 0; r < rolls; r++) {
        if (window.LootSystem && typeof LootSystem.rollDrop === "function" && chance(lootChance)) {
          var drop = LootSystem.rollDrop();
          if (drop && addDropToInventory(drop)) {
            addLog("🎁 Objet trouvé : " + drop.name + " (" + drop.rarity + ")", "event");
            showToast("🎁 " + drop.name, 1800);
          }
        }
      }
    } else if (chance(8)) {
      this.triggerRandomEvent();
    }

    saveEquipBagScroll();

    // En donjon : pas de progression de monde, pas de récompense de
    // chapitre — DungeonManager gère la suite (vague suivante ou fin
    // de la tentative). Le loot de boss classique juste au-dessus
    // s'applique quand même au boss de donjon, en plus de la
    // récompense garantie de fin de donjon.
    if (window.DungeonManager && game.dungeonRun && game.dungeonRun.active) {
      var dungeonXpBonus = game.cycleCount || 0;
      var dungeonXpGain = enemy.isBoss ? (3 + dungeonXpBonus * 0.5) : (1 + dungeonXpBonus * 0.1);
      if (typeof grantHeroXp === "function") grantHeroXp(dungeonXpGain, enemy.isBoss ? "boss" : "enemy");

      DungeonManager.onEnemyKilled();
      if (typeof renderAll === "function") renderAll();
      restoreEquipBagScroll();
      saveGame();
      return;
    }

    // v3.2 : quêtes d'aventure (voir data/adventure-quests.js) — même
    // principe que le Donjon juste au-dessus : un run dédié
    // (game.adventureQuestRun.active), lancé explicitement depuis
    // l'onglet Quêtes, PAS un suivi ambiant du farm classique. Avant
    // v3.2, la progression se faisait en tâche de fond pendant le
    // farm normal du monde (v3.0) ; ce n'est plus le cas — voir
    // AdventureQuestManager.start()/onEnemyKilled() dans
    // systems/adventure-quest-system.js pour le nouveau flux complet.
    // Doit court-circuiter AVANT le tracking WorldQuestManager
    // ci-dessous, même position que le donjon : un run de quête n'est
    // pas du farm ambiant classique.
    if (window.AdventureQuestManager && game.adventureQuestRun && game.adventureQuestRun.active) {
      AdventureQuestManager.onEnemyKilled(enemy);
      if (typeof renderAll === "function") renderAll();
      restoreEquipBagScroll();
      saveGame();
      return;
    }

    // v3.42 : le court-circuit Chasse est désormais tout en haut de
    // killEnemy() (avant même le calcul or/essence) — voir plus haut.
    // Ce bloc n'est jamais atteint pour un run de chasse actif.

    // v3.0 : progression des questlines de déblocage de monde (voir
    // data/world-quests.js) — uniquement en combat classique, jamais
    // en donjon ni en run de quête (return plus haut avant d'arriver
    // ici).
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
    } else if (result && result.type === "cycle") {
      addLog("Le cycle recommence, les ennemis deviennent plus forts.", "zone");
      if (typeof openCycleSummary === "function") openCycleSummary();
    } else if (result && result.type === "locked") {
      addLog("🔒 " + result.world.name + " est verrouillé (questline de déblocage incomplète, voir Carte). Le cycle recommence.", "zone");
      showToast("🔒 Termine la questline pour débloquer " + result.world.name, 2200);
      if (typeof openCycleSummary === "function") openCycleSummary(result.world);
    } else if (result && result.type === "adventure_locked") {
      addLog("🧭 Une quête d'Expédition attend d'être lancée pour explorer plus loin (voir l'onglet Quêtes).", "zone");
      showToast("🧭 Lance la quête d'Expédition (onglet Quêtes) pour continuer", 2200);
    }

    // v3.28 : Bourse profonde (Fortune, inchangée) — récompense de fin
    // de chapitre. Second souffle a migré vers un thème défense
    // (branche Survie rethématisée), son ancien bonus ici a été retiré.
    if (result && (result.type === "adventure" || result.type === "world")) {
      var chapterGold = Math.floor(20 + (WorldManager.worldIndex || 0) * 15);
      var chapterEssence = 2 + (WorldManager.worldIndex || 0);

      if (game.talents.t_deep_pockets) {
        chapterGold = Math.floor(chapterGold * (1 + 0.10 * game.talents.t_deep_pockets));
      }

      game.gold += chapterGold;
      game.essence += chapterEssence;
      game.totalGoldEarned += chapterGold;
      addLog("🎉 Récompense de chapitre : +" + formatNumber(chapterGold) + " or, +" + chapterEssence + " essence", "event");
    }

    var cycleXpBonus = game.cycleCount || 0;
    var xpGain = enemy.isBoss ? (3 + cycleXpBonus * 0.5) : (1 + cycleXpBonus * 0.1);

    if (typeof grantHeroXp === "function") {
      grantHeroXp(xpGain, enemy.isBoss ? "boss" : "enemy");
    }

    this.spawnEnemy();
    if (typeof renderAll === "function") renderAll();
    restoreEquipBagScroll();
    saveGame();
  },

  /* Petit événement aléatoire (8% de chance après un kill normal,
     voir killEnemy) : trésor, fontaine d'essence, bénédiction d'or,
     ou simple texte d'ambiance. Un seul tiré au hasard parmi les 4. */
  triggerRandomEvent: function () {
    var events = [
      function () {
        var bonus = randInt(10, 50);
        if (game.talents.t_deep_pockets) bonus = Math.floor(bonus * (1 + 0.10 * game.talents.t_deep_pockets));
        game.gold += bonus;
        game.totalGoldEarned += bonus;
        addLog("💰 Trésor trouvé ! +" + bonus + " or", "event");
        showToast("💰 +" + bonus + " or", 1400);
        if (window.QuestManager && typeof QuestManager.track === "function") {
          QuestManager.track("treasures", 1 + (game.talents.t_treasure_hunter || 0));
          QuestManager.track("goldEarned", bonus);
        }
      },
      function () {
        var bonus = randInt(1, 3);
        game.essence += bonus;
        addLog("🔮 Fontaine d'essence ! +" + bonus + " essence", "event");
        showToast("🔮 +" + bonus + " essence", 1400);
      },
      function () {
        var bonus = Math.floor(game.gold * 0.05);
        if (bonus > 0) {
          game.gold += bonus;
          game.totalGoldEarned += bonus;
          addLog("✨ Bénédiction ! +" + formatNumber(bonus) + " or", "event");
          showToast("✨ +" + formatNumber(bonus) + " or", 1400);
          if (window.QuestManager && typeof QuestManager.track === "function") {
            QuestManager.track("goldEarned", bonus);
          }
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

// Alias globaux pour les onclick="..." générés dans le HTML (voir
// index.html, le bouton d'attaque appelle playerAttack() directement).
// v3.34.3 : l'alias global playerAttack() (appelé par les onclick="..."
// dans le HTML, voir ui/combat-view.js) pointe maintenant vers
// requestPlayerAttack() (garde de cooldown + file d'attente) plutôt
// que playerAttack() directement — le nom de l'alias global reste
// inchangé pour ne pas casser le HTML existant, seul son contenu change.
function playerAttack() { CombatEngine.requestPlayerAttack(); }
function autoAttack() { CombatEngine.autoAttack(0.1); }
function autoTap() { CombatEngine.autoTap(); }

window.CombatEngine = CombatEngine;
window.playerAttack = playerAttack;
window.autoAttack = autoAttack;
window.autoTap = autoTap;
window.showFloatingDamage = showFloatingDamage;
window.showGoldPopup = showGoldPopup;
window.getDamageAffinity = getDamageAffinity;
window.getPlayerDamageType = getPlayerDamageType;
window.getEnemyWillCritPenalty = getEnemyWillCritPenalty;
