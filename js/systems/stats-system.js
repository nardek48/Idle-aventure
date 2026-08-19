"use strict";
/* ============================================================
Quest Idle — systems/stats-system.js
Fichier central du calcul des stats. StatsSystem.recalcStats() est
LA fonction qui recompose entièrement game.tapDamage/tapMult/autoDps/
critChance/critMult/goldMult/heroMaxHp/heroDefensePct/essenceGlobalMult
à partir de : le héros choisi, les upgrades classiques, l'équipement,
les talents, les améliorations Aether, le bonus de bestiaire et le
nombre d'ascensions. Elle est appelée après CHAQUE action qui pourrait
changer une stat (achat, équipement, talent, ascension...) — jamais en
boucle continue.
============================================================ */

function getAetherUpgradeLevel(id) {
  return Number((game.aetherUpgrades && game.aetherUpgrades[id]) || 0);
}

/* Bonus dérivés du niveau de chaque amélioration de la Boutique
   d'Aether (voir data/upgrades.js -> AETHER_SHOP). */
function getAetherBonuses() {
  if (typeof ensureGameStateDefaults === "function") ensureGameStateDefaults();

  var levels = game.aetherUpgrades || {};
  return {
    tapBonus: (levels.a_tap || 0) * 0.10,
    goldBonus: (levels.a_gold || 0) * 0.10,
    lootBonus: (levels.a_loot || 0) * 3,
    essenceBonus: Math.floor((levels.a_essence || 0) / 2),
    vitalityBonus: (levels.a_vitality || 0) * 0.10 // v2.90.22
  };
}

function getAetherMult() {
  var bonus = getAetherBonuses();
  return {
    tap: 1 + (bonus.tapBonus || 0),
    gold: 1 + (bonus.goldBonus || 0),
    loot: bonus.lootBonus || 0,
    essence: bonus.essenceBonus || 0
  };
}

/* Coût du prochain niveau d'une amélioration Aether (croissance
   exponentielle, comme les upgrades classiques). */
function getAetherUpgradeCost(upgrade) {
  var level = getAetherUpgradeLevel(upgrade.id);
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult || 1.4, level));
}

/* v1.8.5 : Bonus de bestiaire — meilleur palier atteint pour une créature donnée,
   selon le nombre de kills enregistrés dans game.killCounts. */
function getBestiaryBonus(id) {
  var tiers = (typeof BESTIARY_BONUS_CONFIG !== "undefined" && BESTIARY_BONUS_CONFIG[id]) || [];
  var kills = (game.killCounts && game.killCounts[id]) || 0;
  var result = { goldBonus: 0, essenceBonus: 0, lootBonus: 0 };

  tiers.forEach(function (tier) {
    if (kills >= (tier.kills || 0)) {
      result.goldBonus = Math.max(result.goldBonus, tier.goldBonus || 0);
      result.essenceBonus = Math.max(result.essenceBonus, tier.essenceBonus || 0);
      result.lootBonus = Math.max(result.lootBonus, tier.lootBonus || 0);
    }
  });

  return result;
}

/* v1.8.5 : Somme des bonus or/essence de toutes les créatures déjà rencontrées
   (bonus passif global qui grandit avec la maîtrise du bestiaire). */
function getTotalBestiaryBonus() {
  var config = (typeof BESTIARY_BONUS_CONFIG !== "undefined") ? BESTIARY_BONUS_CONFIG : {};
  var total = { goldBonus: 0, essenceBonus: 0 };

  Object.keys(config).forEach(function (id) {
    var bonus = getBestiaryBonus(id);
    total.goldBonus += bonus.goldBonus;
    total.essenceBonus += bonus.essenceBonus;
  });

  return total;
}

/* Transforme un objet de bonus de set (voir SET_BONUS_CONFIG dans
   data/equipment.js) en texte lisible pour l'UI, ex: "+10% dégâts". */
function formatSetBonusEffect(effect) {
  if (!effect) return "";

  var parts = [];

  if (effect.tapDamage != null) parts.push("+" + formatNumber(effect.tapDamage) + " dégâts/tap");
  if (effect.tapMult != null) parts.push("+" + Math.round(effect.tapMult * 100) + "% dégâts");
  if (effect.goldMult != null) parts.push("+" + Math.round(effect.goldMult * 100) + "% or");
  if (effect.critChance != null) parts.push("+" + formatNumber(effect.critChance) + "% critique");
  if (effect.critMult != null) parts.push("+" + formatNumber(effect.critMult) + "x dégâts crit");
  if (effect.autoDps != null) parts.push("+" + formatNumber(effect.autoDps) + " auto DPS");

  return parts.join(" • ");
}

var StatsSystem = {
  /* LA fonction de recalcul de toutes les stats du joueur. Repart
     TOUJOURS de zéro (valeurs de base ci-dessous) puis additionne
     chaque source de bonus dans l'ordre : upgrades classiques, stats
     RPG du héros (Force/Endurance/Célérité/Précision/Volonté),
     équipement, bonus de set, talents, améliorations Aether, bonus
     de bestiaire, ascension. Rien ne doit modifier les stats du
     joueur en dehors de cette fonction (sauf effets temporaires de
     combat comme la Frénésie d'assaut, gérés directement dans
     combat-engine.js sur l'instant d'une attaque). */
  recalcStats: function () {
    // Valeurs de base, remises à zéro à chaque appel.
    game.tapDamage = 1;
    game.tapMult = 1;
    game.autoDps = 0;
    game.critChance = 5;
    game.critMult = 2;
    game.goldMult = 1;

    // v2.29 : bonus plat de dégâts venant de l'équipement (tapDmg des
    // objets + bonus de panoplie), appliqué APRÈS la multiplication
    // par tapMult — voir effectiveTapDamage() plus bas. Avant, ce
    // bonus plat était ajouté à game.tapDamage AVANT la
    // multiplication, ce qui le faisait grimper avec tapMult : un
    // objet "+100 dégâts" devenait +500 dégâts réels avec un
    // multiplicateur x5, au lieu de rester +100 comme annoncé.
    game.equipFlatTapBonus = 0;

    // v2.83.55 : accumulateur de défense venant de l'équipement
    // (emplacement Armure), combiné avec la défense d'Endurance plus
    // bas dans cette fonction — voir HERO_DEFENSE_CAP.
    game.equipDefensePct = 0;

    // v2.90.19 : bonus d'or spécifique aux boss ("Contrats lucratifs"),
    // consommé uniquement dans CombatEngine.killEnemy() — jamais mélangé
    // à game.goldMult (qui s'applique à TOUT gain d'or, boss ou non).
    game.bossGoldBonusPct = 0;

    game.essenceRegen = 0;
    game.bossEssenceMult = 1;
    game.essenceGlobalMult = 1;

    // Applique chaque upgrade classique achetée (voir data/upgrades.js).
    (UPGRADES || []).forEach(function (u) {
      if (u && typeof u.apply === "function") {
        u.apply(game.upgrades[u.id] || 0);
      }
    });

    // NOUVEAU v1.8 : Force (power) -> dégâts de tap
    var FORCE_TAP_COEF = 0.2;
    var hero = typeof getHeroByGameId === "function" ? getHeroByGameId(game.heroId) : null;
    var basePower = (hero && hero.stats) ? Number(hero.stats.power) || 0 : 0;
    var trainedPower = (game.trainedStats && game.trainedStats.power) || 0;
    var totalPower = basePower + trainedPower;
    game.tapDamage += totalPower * FORCE_TAP_COEF;

    // NOUVEAU v1.8 : Célérité -> auto DPS
    var CELERITY_DPS_COEF = 0.03;
    var baseCelerity = (hero && hero.stats) ? Number(hero.stats.celerity) || 0 : 0;
    var trainedCelerity = (game.trainedStats && game.trainedStats.celerity) || 0;
    game.autoDps += (baseCelerity + trainedCelerity) * CELERITY_DPS_COEF;

    // NOUVEAU v1.8 : Précision -> chance de critique
    var PRECISION_CRIT_COEF = 0.06;
    var basePrecision = (hero && hero.stats) ? Number(hero.stats.precision) || 0 : 0;
    var trainedPrecision = (game.trainedStats && game.trainedStats.precision) || 0;
    game.critChance += (basePrecision + trainedPrecision) * PRECISION_CRIT_COEF;

    // NOUVEAU v1.8 : Volonté -> dégâts critiques
    var WILL_CRIT_MULT_COEF = 0.01;
    var baseWill = (hero && hero.stats) ? Number(hero.stats.will) || 0 : 0;
    var trainedWill = (game.trainedStats && game.trainedStats.will) || 0;
    game.critMult += (baseWill + trainedWill) * WILL_CRIT_MULT_COEF;

     // NOUVEAU v1.8 : Endurance -> PV du héros
    var ENDURANCE_HP_COEF = 6;
    var baseEndurance = (hero && hero.stats) ? Number(hero.stats.endurance) || 0 : 0;
    var trainedEndurance = (game.trainedStats && game.trainedStats.endurance) || 0;
    var totalEndurance = baseEndurance + trainedEndurance;
    game.heroMaxHp = Math.max(1, Math.floor(totalEndurance * ENDURANCE_HP_COEF));
    // v3.19 : le clamp "game.heroHp > game.heroMaxHp -> ramené au max"
    // qui vivait ICI a été RETIRÉ — bug trouvé avec Seb (captures +
    // repro confirmée) : à ce stade du calcul, game.heroMaxHp ne
    // contient encore QUE la valeur de base (Endurance seule), AVANT
    // les bonus qui l'augmentent plus loin dans cette même fonction
    // (ascension +4%/asc, Vitalité éthérée, potion d'Endurance — voir
    // plus bas). Si le joueur était à PV pleins SOUS le max déjà
    // boosté (ex. 545 PV avec l'ascension), ce clamp intermédiaire le
    // ramenait de force à la valeur de base non boostée (ex. 426) —
    // et comme le clamp ne remonte JAMAIS heroHp (seulement à la
    // baisse), il restait bloqué à 426 même une fois heroMaxHp
    // recalculé correctement à 545 juste après. Symptôme observé :
    // "les PV reviennent à leur valeur de base sans bonus" à chaque
    // fois que recalcStats() est rappelée (changement de héros,
    // attaque spéciale à buff, achat, etc.) alors que le joueur était
    // à PV pleins. Un SEUL clamp final, après TOUS les bonus de PV
    // max, suffit — voir tout en bas de cette fonction.

    // NOUVEAU v1.8.5 : Endurance -> réduction des dégâts de riposte ennemie
    // v2.83.55 : le calcul FINAL (avec la contribution de l'équipement)
    // est plus bas, APRÈS la boucle d'équipement qui remplit
    // game.equipDefensePct — sinon on additionnerait une valeur encore
    // à 0 à ce stade. On garde juste les constantes ici.
    var HERO_DEFENSE_COEF = 0.002;
    var HERO_DEFENSE_CAP = 0.6;

    // NOUVEAU v1.8.5 : bonus passif de bestiaire (or/essence), cumulé sur toutes les créatures rencontrées
    var bestiaryTotal = getTotalBestiaryBonus();
    game.goldMult += bestiaryTotal.goldBonus || 0;
    game.essenceGlobalMult += bestiaryTotal.essenceBonus || 0;

    // NOUVEAU v1.8.5 : maîtrise d'arme -> petit bonus de dégâts selon les kills réalisés
    // avec le type d'arme actuellement équipée (compteurs déjà suivis dans questProgress)
    var WEAPON_MASTERY_COEF = 0.0005;
    var WEAPON_MASTERY_CAP = 0.25;
    var masteryType = typeof getPlayerDamageType === "function" ? getPlayerDamageType() : null;
    var masteryProgress = game.questProgress || {};
    var masteryKillsById = {
      sword: masteryProgress.swordKills,
      bow: masteryProgress.bowKills,
      magic: masteryProgress.magicKills
    };
    var masteryKills = masteryType ? Number(masteryKillsById[masteryType] || 0) : 0;
    game.tapMult += Math.min(WEAPON_MASTERY_CAP, masteryKills * WEAPON_MASTERY_COEF);

    // Applique le bonus de CHAQUE pièce équipée (une seule fois chacune,
    // voir js/systems/stats-system.js dans l'historique du projet pour
    // le bug de triplement qui existait ici avant correction).
    // v2.83.55 : 7 emplacements (EQUIPMENT_SLOTS) au lieu de 3.
    var equipped = game.equipped;
    (typeof EQUIPMENT_SLOTS !== "undefined" ? EQUIPMENT_SLOTS : ["weapon", "armor", "amulet"])
      .map(function (slot) { return equipped[slot]; })
      .forEach(function(item) {
      if (!item) return;
      if (item.stat === "tapDmg") game.equipFlatTapBonus += item.value;
      else if (item.stat === "tapMult") game.tapMult += item.value;
      else if (item.stat === "goldMult") game.goldMult += item.value;
      else if (item.stat === "critChance") game.critChance += item.value;
      else if (item.stat === "critMult") game.critMult += item.value;
      else if (item.stat === "autoDps") game.autoDps += item.value;
      else if (item.stat === "defense") game.equipDefensePct += item.value;
    });

    // v2.83.55 : calcul final de la défense — Endurance + équipement
    // (game.equipDefensePct, rempli juste au-dessus), sans jamais
    // toucher aux PV max (contrairement à Endurance qui augmente les
    // deux). Même plafond partagé pour les 2 sources, afin de ne pas
    // casser l'équilibrage existant.
    // v3.28 : talents de survie (Peau de pierre, Constitution de fer,
    // Gardien immuable — +défense passive) ajoutés ICI, AVANT le
    // plafond, comme toute autre source de défense.
    var survivalDefenseBonus =
      (game.talents.t_second_wind || 0) * 0.02 +
      (game.talents.t_vital_anchor || 0) * 0.05 +
      (game.talents.t_immutable_guardian || 0) * 0.05;
    game.heroDefensePct = Math.min(HERO_DEFENSE_CAP, totalEndurance * HERO_DEFENSE_COEF + (game.equipDefensePct || 0) + survivalDefenseBonus);

    // v2.90.22 : bonus de PV max par ascension (+4%/asc, multiplicatif),
    // en complément des bonus existants tapMult/goldMult par ascension
    // (voir plus bas). Appliqué ici, juste après le calcul de base des
    // PV max à partir de l'Endurance, avant tout autre bonus de PV
    // (potions, etc. — voir plus bas).
    // v3.19 : clamp intermédiaire retiré ici aussi (même bug que plus
    // haut) — un seul clamp final suffit, tout en bas de la fonction.
    if (game.ascensionCount > 0) {
      game.heroMaxHp = Math.max(1, Math.floor(game.heroMaxHp * (1 + game.ascensionCount * 0.04)));
    }

    // v3.28 : talents de survie qui touchent aux PV max (Cœur
    // vaillant, Vitalité tenace, Constitution de fer, Gardien
    // immuable) — même principe que le bonus d'ascension juste
    // au-dessus (multiplicatif sur la valeur courante), AVANT le
    // clamp final (voir la note v3.19 plus bas dans cette fonction).
    var survivalHpMult =
      (game.talents.t_regenerate || 0) * 0.05 +
      (game.talents.t_tenacious_will || 0) * 0.08 +
      (game.talents.t_vital_anchor || 0) * 0.05 +
      (game.talents.t_immutable_guardian || 0) * 0.10;
    if (survivalHpMult) {
      game.heroMaxHp = Math.max(1, Math.floor(game.heroMaxHp * (1 + survivalHpMult)));
    }

    // Bonus de panoplie (3 pièces ET 7 pièces équipées de même
    // rareté, v3.18 — les deux paliers se cumulent), voir
    // getActiveSetBonuses() plus bas et SET_BONUS_CONFIG dans
    // data/equipment.js.
    var activeSetBonuses = this.getActiveSetBonuses();
    activeSetBonuses.forEach(function (entry) {
      if (!entry.config || typeof entry.config.apply !== "function") return;
      var bonus = entry.config.apply() || {};
      if (bonus.tapMult != null) game.tapMult += bonus.tapMult;
      if (bonus.goldMult != null) game.goldMult += bonus.goldMult;
      if (bonus.critChance != null) game.critChance += bonus.critChance;
      if (bonus.critMult != null) game.critMult += bonus.critMult;
      if (bonus.autoDps != null) game.autoDps += bonus.autoDps;
      if (bonus.tapDamage != null) game.equipFlatTapBonus += bonus.tapDamage;
    });

    // Talents actifs qui touchent directement les stats globales
    // (les autres talents — combat ponctuel, hors-ligne, événements —
    // sont câblés ailleurs : voir combat-engine.js et offline-system.js).
    // v3.28 : chaque talent va maintenant jusqu'à 3 niveaux —
    // game.talents.t_x est un NOMBRE (0-3), le bonus par niveau est
    // celui qui existait avant cette refonte (niveau 1 = même
    // puissance qu'avant, niveau 3 = 3× plus fort).
    game.tapMult += (game.talents.t_sharpened_blades || 0) * 0.05;
    game.critChance += (game.talents.t_precise_strike || 0) * 6;

    game.goldMult += (game.talents.t_scavenger || 0) * 0.08;
    game.goldMult += (game.talents.t_golden_touch || 0) * 0.12;
    game.goldMult += (game.talents.t_sovereign_treasure || 0) * 0.20;

    if (game.talents.t_bloodlust) {
      var bloodlustLevel = game.talents.t_bloodlust;
      game.tapMult += Math.min((game.ascensionCount || 0) * 0.03 * bloodlustLevel, 0.15 * bloodlustLevel);
    }

    // Bonus automatique par ascension (indépendant des talents).
    // v2.11 : 0.15/0.12 -> 0.06/0.05 (l'ancien taux cumulait trop vite
    // en linéaire pur, voir doc d'équilibrage).
    if (game.ascensionCount > 0) {
      game.tapMult += game.ascensionCount * 0.06;
      game.goldMult += game.ascensionCount * 0.05;
    }

    // v3.28 : t_essence_bloom (Sang-froid) et t_immutable_guardian
    // (Gardien immuable, essence) ont migré ailleurs — la branche
    // Survie est maintenant entièrement défense/PV, plus essence.
    // t_essence_bloom -> combat-engine.js (réduction pénalité de
    // défaite). t_immutable_guardian -> PV max/défense, déjà appliqué
    // plus haut dans cette même fonction (survivalHpMult/
    // survivalDefenseBonus).

    var aether = getAetherBonuses();
    game.tapMult += aether.tapBonus || 0;
    game.goldMult *= 1 + (aether.goldBonus || 0);
    if (aether.vitalityBonus) {
      game.heroMaxHp = Math.max(1, Math.floor(game.heroMaxHp * (1 + aether.vitalityBonus)));
    }

    // Potions temporaires actives (voir systems/potion-system.js) :
    // appliquées en dernier, par-dessus tout le reste, comme un boost
    // ponctuel plutôt qu'une progression permanente.
    var potionEffects = (window.PotionManager && typeof PotionManager.getActiveEffects === "function")
      ? PotionManager.getActiveEffects()
      : {};
    if (potionEffects.power) game.tapDamage *= (1 + potionEffects.power);
    if (potionEffects.celerity) game.autoDps *= (1 + potionEffects.celerity);
    if (potionEffects.critChance) game.critChance += potionEffects.critChance;
    if (potionEffects.gold) game.goldMult *= (1 + potionEffects.gold);
    if (potionEffects.endurance) {
      game.heroMaxHp = Math.max(1, Math.floor(game.heroMaxHp * (1 + potionEffects.endurance)));
      game.heroDefensePct = Math.min(0.6, game.heroDefensePct + potionEffects.endurance * 0.1);
    }

    // v3.20 : Afflictions (voir data/afflictions.js, systems/affliction-system.js)
    // — dernière source de bonus de PV max avant le clamp final, pour
    // respecter la même règle que ci-dessus (jamais de clamp
    // intermédiaire, voir la note v3.19). Le bonus de récompense qui
    // scale avec le nombre d'afflictions actives (+10%/active) se
    // cumule ici aussi, multiplicativement avec goldMult/essenceGlobalMult.
    if (window.AfflictionManager && typeof AfflictionManager.getCombinedModifiers === "function") {
      var afflictionMods = AfflictionManager.getCombinedModifiers();
      var stackRewardMult = AfflictionManager.getStackRewardMult();
      if (afflictionMods.tapMult) game.tapMult += afflictionMods.tapMult;
      if (afflictionMods.heroMaxHpMult !== 1) {
        game.heroMaxHp = Math.max(1, Math.floor(game.heroMaxHp * afflictionMods.heroMaxHpMult));
      }
      if (afflictionMods.goldMult !== 1) game.goldMult *= afflictionMods.goldMult;
      if (stackRewardMult !== 1) {
        game.goldMult *= stackRewardMult;
        game.essenceGlobalMult *= stackRewardMult;
      }
      if (afflictionMods.bossGoldBonusPct) game.bossGoldBonusPct += afflictionMods.bossGoldBonusPct;
      if (afflictionMods.bossEssenceBonusPct) game.bossEssenceBonusPct = (game.bossEssenceBonusPct || 0) + afflictionMods.bossEssenceBonusPct;
    }

    // v3.19 : UN SEUL clamp de game.heroHp, ICI — après TOUS les bonus
    // qui peuvent faire varier game.heroMaxHp (Endurance, ascension,
    // Vitalité éthérée, potion d'Endurance ci-dessus). Bug corrigé :
    // avant, ce clamp existait après CHAQUE étape intermédiaire — si le
    // joueur était à PV pleins sous le max déjà boosté, la toute
    // PREMIÈRE étape (Endurance seule, avant tout bonus) le ramenait de
    // force à cette valeur de base, et il y restait bloqué pour de bon
    // (le clamp ne remonte jamais heroHp, seulement à la baisse) même
    // une fois heroMaxHp recalculé correctement juste après. Un seul
    // clamp final, une fois la valeur DÉFINITIVE de heroMaxHp connue,
    // élimine complètement ce risque.
    // v3.29 : bug corrigé — "!game.heroHp" est VRAI quand heroHp vaut
    // exactement 0 en JavaScript (0 est "falsy"), donc CE clamp
    // soignait accidentellement un héros mort (0 PV, doit se reposer
    // — voir v3.15) à chaque fois que recalcStats() était rappelée,
    // par exemple après un simple achat en boutique ou de talent.
    // "game.heroHp == null" ne vise QUE undefined/null (personnage
    // neuf, jamais initialisé) — 0 est maintenant traité comme une
    // valeur légitime, pas comme "non défini".
    if (game.heroHp == null || game.heroHp > game.heroMaxHp) game.heroHp = game.heroMaxHp;

    // Bonus cumulés des hauts faits réclamés (voir systems/achievement-system.js).
    var achievementBonus = (window.AchievementManager && typeof AchievementManager.getTotalBonus === "function")
      ? AchievementManager.getTotalBonus()
      : {};
    if (achievementBonus.goldMult) game.goldMult += achievementBonus.goldMult;
    if (achievementBonus.tapMult) game.tapMult += achievementBonus.tapMult;
    if (achievementBonus.essenceGlobalMult) game.essenceGlobalMult += achievementBonus.essenceGlobalMult;

    // Bonus de la boutique du donjon (voir systems/dungeon-system.js).
    var dungeonShopBonus = (window.DungeonManager && typeof DungeonManager.getShardShopBonuses === "function")
      ? DungeonManager.getShardShopBonuses()
      : {};
    if (dungeonShopBonus.power) game.tapMult += dungeonShopBonus.power;
    if (dungeonShopBonus.gold) game.goldMult += dungeonShopBonus.gold;
    if (dungeonShopBonus.essence) game.essenceGlobalMult += dungeonShopBonus.essence;
    if (dungeonShopBonus.defense) {
      game.heroDefensePct = Math.min(HERO_DEFENSE_CAP, game.heroDefensePct + dungeonShopBonus.defense);
    }

    // v3.34.0 : l'ancien bonus temporaire d'attaque spéciale (Fureur
    // du Chaos, SpecialAttackManager) et l'ancien bouclier universel
    // (DefenseManager/DEFENSE_ABILITY) ont été retirés — remplacés par
    // le système de classes (voir systems/class-combat-system.js). Le
    // plafond de défense pendant une action defense de classe est
    // maintenant géré directement dans CombatEngine.enemyStrike(),
    // pas ici (recalcStats() ne connaît pas la durée d'un effet
    // temporaire de combat, contrairement à game.tapMult/goldMult qui
    // sont recalculés à chaque changement d'état, pas en continu).

    // Bonus passif : Aether cumulé à vie -> dégâts + or globaux (ne diminue jamais, même dépensé)
    var AETHER_LIFETIME_MULT_COEF = 0.005;
    var totalAether = Number(game.totalAetherEarned || 0);
    game.tapMult += totalAether * AETHER_LIFETIME_MULT_COEF;
    game.goldMult += totalAether * AETHER_LIFETIME_MULT_COEF;
  },

  /* Dégâts réels d'un tap, après application du multiplicateur. */
  /* Les getters "effective*" ci-dessous sont ce que le reste du code
     doit appeler pour AGIR (dégâts réels, DPS réel...) plutôt que de
     lire game.tapDamage/tapMult directement, pour garantir des
     valeurs toujours valides (jamais négatives, jamais < 1 quand ça
     n'aurait pas de sens). */
  /* v2.29 : (base × multiplicateur) PUIS + bonus plat d'équipement —
     voir la note dans recalcStats() plus haut sur pourquoi l'ordre
     compte ici. */
  effectiveTapDamage: function () {
    var multiplied = game.tapDamage * game.tapMult;
    return Math.max(1, Math.floor(multiplied) + Math.floor(game.equipFlatTapBonus || 0));
  },

  effectiveAutoDps: function () {
    return Math.max(0, game.autoDps);
  },

  effectiveCritChance: function () {
    return Math.max(0, game.critChance);
  },

  effectiveCritMult: function () {
    return Math.max(1, game.critMult);
  },

  effectiveGoldMult: function () {
    return Math.max(1, game.goldMult);
  },

  /* Détermine si au moins 3 (sameRarityCount) pièces équipées, parmi
     les 7 emplacements, partagent la même rareté et, si oui, renvoie
     la config du bonus de panoplie correspondant (voir
     SET_BONUS_CONFIG dans data/equipment.js). Renvoie
     { rarity: null, config: null } si le bonus n'est pas actif.
     v2.83.55 : élargi de 3 emplacements fixes (arme/armure/amulette)
     à "3 quelconques parmi les 7" — plus logique maintenant qu'il y a
     7 emplacements indépendants, la version précédente aurait rendu
     le bonus de panoplie quasi impossible à obtenir en pratique.
     v3.18 : renvoie maintenant TOUS les paliers atteints (3 ET 7 si
     le joueur a bien 7 pièces de la même rareté), plus un seul —
     getSetBonus() ci-dessous reste disponible pour compatibilité
     (renvoie juste le palier le plus élevé atteint). */
  getActiveSetBonuses: function () {
    var slots = (typeof EQUIPMENT_SLOTS !== "undefined") ? EQUIPMENT_SLOTS : ["weapon", "armor", "amulet"];
    var equipped = slots.map(function (slot) { return game.equipped[slot]; }).filter(Boolean);

    // Compte les pièces PAR RARETÉ (pas besoin que TOUT l'équipement
    // partage la même rareté) — cherche la rareté la mieux
    // représentée, les paliers s'activent selon CE nombre.
    var countByRarity = {};
    equipped.forEach(function (item) {
      countByRarity[item.rarity] = (countByRarity[item.rarity] || 0) + 1;
    });

    var bestRarity = null;
    var bestCount = 0;
    RARITY_ORDER.forEach(function (r) {
      var count = countByRarity[r] || 0;
      // À égalité, on privilégie la rareté la plus haute (RARITY_ORDER
      // est du plus faible au plus fort) — meilleur bonus pour le joueur.
      if (count >= bestCount) {
        bestCount = count;
        bestRarity = r;
      }
    });

    if (!bestRarity) return [];

    var tiers = (SET_BONUS_CONFIG && SET_BONUS_CONFIG.tiers) || [];
    var results = [];

    tiers.forEach(function (tier) {
      if (bestCount < tier.count) return;
      var baseConfig = (tier.bonuses && tier.bonuses[bestRarity]) || null;
      if (!baseConfig) return;

      var effect = typeof baseConfig.apply === "function" ? (baseConfig.apply() || {}) : {};
      results.push({
        rarity: bestRarity,
        count: tier.count,
        config: {
          name: baseConfig.name || ("Panoplie " + bestRarity + " (" + tier.count + ")"),
          apply: baseConfig.apply,
          effect: effect,
          text: formatSetBonusEffect(effect),
          pieces: bestCount,
          maxPieces: tier.count
        }
      });
    });

    return results;
  },

  /* Compatibilité : renvoie uniquement le MEILLEUR palier atteint
     (le plus haut nombre de pièces), dans l'ancien format à un seul
     résultat — utilisé là où un seul résumé suffit. */
  getSetBonus: function () {
    var active = this.getActiveSetBonuses();
    if (!active.length) return { rarity: null, config: null };
    var best = active[active.length - 1]; // les tiers sont dans l'ordre croissant (3 puis 7)
    return { rarity: best.rarity, config: best.config };
  }
};

window.StatsSystem = StatsSystem;
window.getAetherUpgradeLevel = getAetherUpgradeLevel;
window.getAetherUpgradeCost = getAetherUpgradeCost;
window.getAetherBonuses = getAetherBonuses;
window.getAetherMult = getAetherMult;
window.getBestiaryBonus = getBestiaryBonus;
window.getTotalBestiaryBonus = getTotalBestiaryBonus;