"use strict";
/* v3.269.0 (L-3) : QuestEnemyManager.spawnFor renvoie un TABLEAU quand la quête déclare
   un groupe. Le pronostic raisonne sur un adversaire de référence : on prend le premier
   membre, celui qui frappe en premier après le tri par célérité. */
function firstOfGroup(x) { return Array.isArray(x) ? (x[0] || null) : x; }

/* systems/combat-forecast-system.js — PRONOSTIC DE COMBAT (v3.247.0, demande Seb 15/09/2026).

   Pourquoi ce module existe : rien n'avertissait le joueur qu'un combat était hors de portée.
   Le cas extrême est réel — un boss se soigne de BOSS_HEAL_PERCENT de ses PV tous les
   BOSS_HEAL_ROUNDS rounds ; sous un certain seuil de dégâts, il est MATHÉMATIQUEMENT
   intuable et le joueur peut frapper indéfiniment sans le savoir (constaté sur forest_05).

   Le pronostic ne simule pas : il compare des ordres de grandeur connus avant le combat —
   PV et puissance de l'ennemi, dégâts et PV du héros, seuil de soin s'il y a un boss. Il ne
   prétend pas prédire l'issue, seulement écarter l'impossible et nommer le risque.

   Aucun fichier protégé : toutes les valeurs sont lues via StatsSystem et les constantes
   publiques de combat-engine.js. */

/* Seuils du verdict, calibrés contre les taux d'échec RÉELS (sim/forecast-calibration-bench.js,
   quête « Prouver sa valeur », trois classes × sept profils, 40 runs par cellule). Le ratio est
   « rounds pour tuer » / « rounds pour tomber ».
   Mesures de référence, après prise en compte des potions, des frappes bonus de célérité et de
   l'usure des combats précédents :
     0,52 -> 0 %   0,88 -> 0 %   1,10 -> 18 %   1,36 -> 98 %   2,30 -> 100 %
   Les trois facteurs comptent : sans les potions le pronostic criait au loup (98 % annoncé
   contre 0 % réel), sans la célérité il condamnait le Rôdeur, et sans l'usure il ne voyait que
   le boss alors que le héros tombe souvent avant lui. */
var FORECAST_RATIO_THRESHOLDS = {
  horsportee: 1.3,   // 1,36 mesuré -> 98 % d'échec réel
  tresdur: 1.05,     // 1,10 mesuré -> 18 % : dur, mais pas impossible
  risque: 0.85,      // 0,88 mesuré -> 0 %, la marge est mince
  abordable: 0.35    // en dessous : aucun échec observé, quel que soit le profil
};

/* Verdicts, du plus sûr au pire. `level` sert au tri et au style ; `label` est le texte. */
var COMBAT_FORECAST_LEVELS = [
  { id: "trivial", level: 0, label: "Sans danger", hint: "" },
  { id: "abordable", level: 1, label: "Abordable", hint: "" },
  { id: "risque", level: 2, label: "Risqué", hint: "Garde une potion de soin sous la main." },
  { id: "tresdur", level: 3, label: "Très difficile", hint: "" },
  { id: "horsportee", level: 4, label: "Hors de portée", hint: "" }
];

var CombatForecast = {
  getLevelDef: function (id) {
    return COMBAT_FORECAST_LEVELS.find(function (l) { return l.id === id; }) || COMBAT_FORECAST_LEVELS[1];
  },

  /* Multiplicateur de dégâts moyen d'un round joué. Le joueur n'enchaîne pas des attaques de
     base : il place ses compétences dès que la ressource le permet, et retombe sur la frappe
     de base entre deux. On prend la moyenne des actions offensives du kit et de l'attaque de
     base — pessimiste par rapport à un joueur optimal, optimiste par rapport à qui ne fait
     que taper, et surtout stable. Sans kit (classe inconnue), 1. */
  getKitDamageMultiplier: function () {
    if (typeof getClassByHeroId !== "function" || typeof getClassSkills !== "function") return 1;
    var cls = getClassByHeroId(game.heroId);
    var kit = cls ? getClassSkills(cls.id) : null;
    if (!kit || !kit.actions) return 1;
    var mults = [1]; // l'attaque de base
    ["skill1", "skill2", "skill3"].forEach(function (slot) {
      var a = kit.actions[slot];
      if (a && a.type === "damage" && Number(a.damageMultiplier) > 0) mults.push(Number(a.damageMultiplier));
    });
    var sum = 0;
    mults.forEach(function (m) { sum += m; });
    return sum / mults.length;
  },

  /* Frappes par round. La jauge de célérité se remplit à chaque action offensive et déclenche
     une frappe bonus une fois pleine : un héros rapide frappe plus souvent qu'une fois par
     round. Sans ça le Rôdeur était sous-évalué (annoncé « hors de portée » pour 18 % d'échec
     réel au banc, sa célérité n'étant pas comptée). */
  getStrikesPerRound: function () {
    if (!window.CombatEngine || typeof CombatEngine.getGaugeGainPerAction !== "function") return 1;
    var max = (typeof CELERITY_GAUGE_MAX === "number" && CELERITY_GAUGE_MAX > 0) ? CELERITY_GAUGE_MAX : 100;
    var gain = Number(CombatEngine.getGaugeGainPerAction() || 0);
    return 1 + Math.max(0, Math.min(1, gain / max));
  },

  /* Dégâts moyens du héros par round, critiques, compétences et frappes bonus compris. */
  getHeroDamagePerRound: function () {
    if (!window.StatsSystem) return 1;
    var base = Number(StatsSystem.effectiveTapDamage() || 1);
    var crit = Math.min(100, Number(StatsSystem.effectiveCritChance() || 0)) / 100;
    var mult = Math.max(1, Number(StatsSystem.effectiveCritMult() || 1));
    return Math.max(1, base * (1 + crit * (mult - 1)) * this.getKitDamageMultiplier() * this.getStrikesPerRound());
  },

  /* Soin disponible pendant le combat : les potions de soin en stock, dans la limite du cap
     de sortie (SORTIE_POTION_CAP). Mesuré déterminant : à profil égal, 3 potions font passer
     l'échec réel de 98 % à 0 % sur « Prouver sa valeur ». */
  getHealingReserve: function () {
    if (!window.PotionManager || typeof PotionManager.getHealingStock !== "function") return 0;
    var cap = (typeof SORTIE_POTION_CAP === "number") ? SORTIE_POTION_CAP : 2;
    var used = (game.sortie && game.sortie.active) ? Number(game.sortie.potionsUsed || 0) : 0;
    var restantes = Math.max(0, cap - used);
    var maxHp = Number(game.heroMaxHp || 1);
    var total = 0;
    (window.HEALING_POTIONS_DB || []).forEach(function (po) {
      var stock = PotionManager.getHealingStock(po.id);
      while (stock > 0 && restantes > 0) {
        total += maxHp * Number(po.healPercent || 0);
        stock -= 1; restantes -= 1;
      }
    });
    return Math.floor(total);
  },

  /* Dégâts moyens que l'ennemi inflige par round, défense du héros déduite. */
  getEnemyDamagePerRound: function (enemy) {
    if (!enemy || !enemy.stats) return 0;
    var coef = (typeof ENEMY_POWER_DMG_COEF === "number") ? ENEMY_POWER_DMG_COEF : 1;
    var bossMult = enemy.isBoss ? ((typeof BOSS_DMG_MULT === "number") ? BOSS_DMG_MULT : 1.5) : 1;
    var raw = Math.max(1, Number(enemy.stats.power || 0) * coef * bossMult);
    var def = Math.min(0.9, Number(game.heroDefensePct || 0));
    return Math.max(1, raw * (1 - def));
  },

  /* Le soin d'un boss impose un plancher de dégâts : sous ce seuil, ses PV remontent plus
     vite qu'ils ne descendent. On y ajoute la marge du bouclier (−50 % pendant 2 rounds
     sur un cycle de 4 à 6), soit environ +25 %. Renvoie 0 si l'ennemi ne se soigne pas. */
  getHealThreshold: function (enemy) {
    if (!enemy || !enemy.isBoss || enemy.isElite) return 0; // une élite troque son soin contre l'exaltation
    var pct = (typeof BOSS_HEAL_PERCENT === "number") ? BOSS_HEAL_PERCENT : 0;
    var every = (typeof BOSS_HEAL_ROUNDS === "number") ? BOSS_HEAL_ROUNDS : 5;
    if (!(pct > 0) || !(every > 0)) return 0;
    return (Number(enemy.maxHp || 0) * pct / every) * 1.25;
  },

  /* Coût en PV des combats qui précèdent, dans une mission qui n'offre aucun repos. Sans ça,
     le pronostic ne voyait que le boss : mesuré au banc, un Chevalier sans rien perd 98 % de
     ses runs alors que le boss seul lui est abordable — il tombe pendant les neuf ennemis
     ordinaires. Coût d'un combat = (PV de l'ennemi / dégâts du héros) × dégâts encaissés. */
  getAttritionCost: function (normalEnemy, count) {
    var n = Math.max(0, Number(count || 0));
    if (!normalEnemy || n === 0) return 0;
    var heroDmg = this.getHeroDamagePerRound();
    var rounds = Math.ceil(Number(normalEnemy.maxHp || 0) / Math.max(1, heroDmg));
    var perFight = rounds * this.getEnemyDamagePerRound(normalEnemy);
    return Math.max(0, Math.floor(perFight * n));
  },

  /* Pronostic pour UN ennemi. options.attrition : PV déjà consommés par les combats qui
     précèdent dans la même sortie. */
  forEnemy: function (enemy, options) {
    options = options || {};
    if (!enemy) return null;

    var heroDmg = this.getHeroDamagePerRound();
    var enemyDmg = this.getEnemyDamagePerRound(enemy);
    var heroHp = Number(game.heroHp != null ? game.heroHp : (game.heroMaxHp || 1));
    var heroMaxHp = Number(game.heroMaxHp || 1);
    var enemyHp = Number(enemy.maxHp || 0);

    var healThreshold = this.getHealThreshold(enemy);
    var netDmg = healThreshold > 0 ? (heroDmg - healThreshold) : heroDmg;

    /* Les potions repoussent le moment où l'on tombe : elles comptent comme des PV.
       L'usure des combats précédents les retire. */
    var reserve = this.getHealingReserve();
    var attrition = Math.max(0, Number(options.attrition || 0));
    var effectiveHp = Math.max(1, heroHp + reserve - attrition);

    var out = {
      heroDamagePerRound: Math.round(heroDmg),
      enemyDamagePerRound: Math.round(enemyDmg),
      enemyHp: enemyHp,
      heroHp: heroHp,
      healingReserve: reserve,
      attrition: attrition,
      healThreshold: Math.ceil(healThreshold),
      roundsToKill: null,
      roundsToDie: enemyDmg > 0 ? Math.ceil(effectiveHp / enemyDmg) : Infinity,
      unwinnable: false,
      id: "abordable",
      reason: "",
      advice: ""
    };

    /* Cas 1 : le soin dépasse les dégâts — impossible, quel que soit le temps passé. */
    if (healThreshold > 0 && netDmg <= 0) {
      out.unwinnable = true;
      out.id = "horsportee";
      out.reason = "Il se soigne plus vite que tu ne frappes : ce combat ne peut pas être gagné en l'état.";
      out.advice = this.buildAdvice(true);
      return out;
    }

    out.roundsToKill = Math.ceil(enemyHp / Math.max(1, netDmg));

    /* Cas 2 : il tue avant d'être tué. Seuils calibrés au banc (FORECAST_RATIO_THRESHOLDS). */
    var ratio = out.roundsToKill / Math.max(1, out.roundsToDie);
    out.ratio = ratio;
    var T = FORECAST_RATIO_THRESHOLDS;
    if (ratio >= T.horsportee) { out.id = "horsportee"; out.reason = "Il te met à terre bien avant de tomber."; }
    else if (ratio >= T.tresdur) { out.id = "tresdur"; out.reason = "La course est trop serrée : la moindre charge peut te coûter le combat."; }
    else if (ratio >= T.risque) { out.id = "risque"; out.reason = "Il t'entamera sérieusement."; }
    else if (ratio >= T.abordable) { out.id = "abordable"; out.reason = ""; }
    else { out.id = "trivial"; out.reason = ""; }

    /* Sans la moindre potion, un combat serré devient un combat perdu : le banc mesure 98 %
       d'échec là où le même profil avec trois potions en mesure 0. On le dit plutôt que de
       durcir le verdict en silence. */
    if (reserve <= 0 && (out.id === "tresdur" || out.id === "risque")) {
      out.advice = "Emporte des potions de soin (Campement → Préparer → Potions) : à ce niveau, elles font la différence entre passer et tomber.";
    }

    /* Un combat interminable est un mauvais combat, même gagné. */
    if (!out.unwinnable && out.roundsToKill > 60 && out.id !== "horsportee") {
      out.id = "tresdur";
      out.reason = "Il te faudrait des dizaines de rounds pour en venir à bout.";
    }

    if (!out.advice && (out.id === "tresdur" || out.id === "horsportee")) {
      out.advice = this.buildAdvice(out.unwinnable);
    }
    return out;
  },

  /* Le conseil pointe le levier le plus rentable pour CE joueur, mesuré, pas générique :
     l'équipement rapporte plus par or que les caractéristiques tant qu'un emplacement est
     vide ou commun ; sinon c'est l'entraînement (et le Terrain, s'il plafonne). */
  buildAdvice: function (unwinnable) {
    var empty = 0, commons = 0;
    (window.EQUIPMENT_SLOTS || []).forEach(function (slot) {
      var item = (game.equipped || {})[slot];
      if (!item) empty += 1;
      else if (item.rarity === "common") commons += 1;
    });

    var capped = false;
    if (typeof getTrainingCapLevels === "function" && window.HEROS_TRAINING_UPGRADE_IDS) {
      var cap = getTrainingCapLevels();
      capped = HEROS_TRAINING_UPGRADE_IDS.some(function (id) {
        return Number((game.upgrades || {})[id] || 0) >= cap;
      });
    }

    var parts = [];
    if (empty > 0) parts.push(empty + " emplacement" + (empty > 1 ? "s" : "") + " d'équipement vide" + (empty > 1 ? "s" : "") + " — l'échoppe du village est le gain le plus rapide");
    else if (commons >= 4) parts.push("ton équipement est encore tout en commun : une pièce de meilleure qualité change plus que dix niveaux d'entraînement");
    if (capped) parts.push("tes caractéristiques butent sur le plafond : c'est le Terrain d'entraînement qu'il faut monter");
    else parts.push("monte tes caractéristiques dans Héros → Stats");

    var head = unwinnable ? "Reviens plus fort : " : "Pour améliorer tes chances : ";
    return head + parts.join(", ") + ".";
  },

  /* Pronostic pour un RUN entier (quête, chasse, donjon) : on regarde l'ennemi le plus dur
     annoncé — le boss s'il y en a un, sinon l'ennemi courant. */
  forRun: function (enemy, options) {
    return this.forEnemy(enemy, options);
  },

  /* Ennemi de RÉFÉRENCE d'une mission : celui qui décide de l'issue. Pour une quête à étape
     bossKill, c'est le boss ; sinon l'ennemi ordinaire du pool. QuestEnemyManager.spawnFor
     construit l'objet sans toucher à game.enemy — rien n'est modifié ici. */
  getReferenceEnemy: function (mission) {
    if (!mission || !window.QuestEnemyManager) return null;
    if (mission.sourceKind === "adventure") {
      var aq = (window.ADVENTURE_QUESTS || {})[mission.questId];
      if (!aq) return null;
      var hasBoss = (aq.steps || []).some(function (st) { return st.type === "bossKill"; });
      return firstOfGroup(QuestEnemyManager.spawnFor(aq, hasBoss)); // v3.269.0 : spawnFor peut renvoyer un groupe
    }
    if (mission.sourceKind === "hunt") {
      var hq = (window.HUNT_QUESTS || {})[mission.questId];
      return hq ? firstOfGroup(QuestEnemyManager.spawnFor(hq, false)) : null;
    }
    return null;
  },

  /* Nombre de combats ordinaires avant l'ennemi de référence, d'après la donnée de quête. */
  getPrecedingFights: function (mission) {
    if (!mission) return 0;
    var quest = (mission.sourceKind === "adventure") ? (window.ADVENTURE_QUESTS || {})[mission.questId]
      : (mission.sourceKind === "hunt") ? (window.HUNT_QUESTS || {})[mission.questId] : null;
    if (!quest) return 0;
    var total = 0;
    (quest.steps || []).forEach(function (st) {
      if (st.type === "kill" || st.type === "eliteTrack") total += Number(st.target || 0);
    });
    if (!total && quest.lotSize) total = Number(quest.lotSize) || 0; // chasse : un lot de N
    return total;
  },

  /* Pronostic d'une mission du tableau, usure du run comprise. Null si on ne sait pas estimer. */
  forMission: function (mission) {
    var enemy = this.getReferenceEnemy(mission);
    if (!enemy) return null;
    var attrition = 0;
    var fights = this.getPrecedingFights(mission);
    if (fights > 0 && window.QuestEnemyManager) {
      var quest = (mission.sourceKind === "adventure") ? (window.ADVENTURE_QUESTS || {})[mission.questId]
        : (window.HUNT_QUESTS || {})[mission.questId];
      var normal = quest ? firstOfGroup(QuestEnemyManager.spawnFor(quest, false)) : null;
      attrition = this.getAttritionCost(normal, fights);
    }
    var out = this.forEnemy(enemy, { attrition: attrition });
    if (out) { out.enemyName = enemy.name; out.precedingFights = fights; }
    return out;
  }
};

window.FORECAST_RATIO_THRESHOLDS = FORECAST_RATIO_THRESHOLDS;
window.COMBAT_FORECAST_LEVELS = COMBAT_FORECAST_LEVELS;
window.CombatForecast = CombatForecast;
