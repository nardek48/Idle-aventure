"use strict";
/* systems/scene-engine.js — moteur PUR du scene-engine générique (graphe de nœuds à choix,
   type DnD-light). Aucun accès à game, au DOM, à WarehouseManager, à SortieManager ou à
   Math.random (randomValue injecté par l'appelant, comme ExplorationCheckSystem). Consomme
   SceneCheckSystem (jets de stat) et les données pures de js/data/scene-templates.js +
   js/data/scene-nodes.js. La glue jeu (persistance, SortieManager, WarehouseManager) vit dans
   systems/scene-run-system.js — jamais ici. Détail : DESIGN_Scene_Engine_v1.md */

var SceneEngine = {
  getTemplate: function (templateId) {
    return (typeof SCENE_TEMPLATES !== "undefined" && SCENE_TEMPLATES[templateId]) || null;
  },

  getNodeBank: function () {
    return (typeof SCENE_NODES !== "undefined") ? SCENE_NODES : {};
  },

  /* ---------- Tirage pondéré (pur, randomValue injecté) ---------- */
  /* weightedPick(weights, randomValue) -> clé choisie dans un objet {clé: poids}.
     randomValue doit être dans [0, 1[, fourni par l'appelant. */
  weightedPick: function (weights, randomValue) {
    var keys = Object.keys(weights || {});
    var total = keys.reduce(function (sum, k) { return sum + Number(weights[k] || 0); }, 0);
    if (total <= 0 || !keys.length) return null;
    var r = Number(randomValue || 0) * total;
    for (var i = 0; i < keys.length; i++) {
      r -= Number(weights[keys[i]] || 0);
      if (r <= 0) return keys[i];
    }
    return keys[keys.length - 1];
  },

  /* pickFromArray(arr, randomValue) -> élément d'un tableau, tirage uniforme. */
  pickFromArray: function (arr, randomValue) {
    if (!arr || !arr.length) return null;
    var idx = Math.floor(Number(randomValue || 0) * arr.length);
    return arr[this.clamp(idx, 0, arr.length - 1)];
  },

  clamp: function (value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

  /* ---------- Génération d'une carte (mode "generative"/"semi") ---------- */
  /* buildCard(template, randomValues, slotWeightsOverride?) -> tableau de niveaux
     [ [ {type, gabaritId?, riskMod?}, ... ], ... ]
     randomValues : tableau plat de nombres [0,1[ fourni par l'appelant (un par tirage), pour
     un générateur 100% pur et testable (aucun Math.random ici). L'appelant (scene-run-system)
     est responsable de fournir assez de valeurs et de les consommer dans l'ordre.
     v3.121.0 (recalibrage Seb, "le choix est trop linéaire") : chaque porte-obstacle tire un
     riskMod (0.6-1.6, voir template.riskModRange) qui multiplie SA PROPRE difficulté ET son
     gain — deux portes d'un même palier peuvent donc avoir des profils risque/récompense très
     différents, au lieu de la même difficulté de base pour toutes (ce qui rendait le choix
     mécanique : toujours prendre la porte annoncée "aisée").
     v3.125.0 (Petites Aventures, Lot PA1) : slotWeightsOverride remplace template.slotWeights
     UNIQUEMENT pour ce build — permet à un même canevas de générer une carte différente selon
     le profil choisi (Bourrin/Prudent, voir template.profileWeights). Absent : comportement
     inchangé (template.slotWeights). */
  buildCard: function (template, randomValues, slotWeightsOverride) {
    if (!template) return [];
    var self = this;
    var cursor = 0;
    function nextRandom() {
      var v = randomValues[cursor] !== undefined ? randomValues[cursor] : Math.random();
      cursor++;
      return v;
    }

    var slotWeights = slotWeightsOverride || template.slotWeights;
    // v3.132.0 : plafond par type de slot sur tout le run (template.maxSlotsPerRun, ex. {combat: 2}) —
    // au-delà, le slot retombe en obstacle (audit Forêt : 3+ vagues en une sortie = mort quasi certaine).
    var maxPerRun = template.maxSlotsPerRun || null;
    var typeCounts = {};
    var depthMax = Number(template.depthMax || 1);
    var gatesMin = (template.gatesPerDepth && template.gatesPerDepth[0]) || 2;
    var gatesMax = (template.gatesPerDepth && template.gatesPerDepth[1]) || 2;
    var riskMin = (template.riskModRange && template.riskModRange[0]) || 0.6;
    var riskMax = (template.riskModRange && template.riskModRange[1]) || 1.6;
    var card = [];

    for (var d = 0; d < depthMax; d++) {
      var gateCount = gatesMin + Math.floor(nextRandom() * (gatesMax - gatesMin + 1));
      gateCount = this.clamp(gateCount, gatesMin, gatesMax);
      var level = [];
      for (var i = 0; i < gateCount; i++) {
        var type;
        if (d === 0 && template.firstDepthType) {
          type = template.firstDepthType; // v1 : premier palier toujours lisible (obstacle)
        } else {
          type = this.weightedPick(slotWeights, nextRandom());
        }
        if (maxPerRun && maxPerRun[type] != null && (typeCounts[type] || 0) >= Number(maxPerRun[type])) type = "obstacle";
        typeCounts[type] = (typeCounts[type] || 0) + 1;
        var slot = { type: type };
        if (type === "obstacle" && template.pools && template.pools.obstacle) {
          slot.gabaritId = this.pickFromArray(template.pools.obstacle, nextRandom());
          slot.riskMod = riskMin + nextRandom() * (riskMax - riskMin);
        } else if (type === "combat" && template.pools && template.pools.combat) {
          // v3.125.0 (Lot PA2) : slot combat, gabaritId pointe vers un enemyFilter groupé
          // (template.pools.combat), pas vers SCENE_NODES.obstacles — résolu par CombatEngine,
          // pas par SceneEngine.resolveObstacle().
          slot.gabaritId = this.pickFromArray(template.pools.combat, nextRandom());
        } else if (type === "bloqueur") {
          // v3.125.0 (Lot PA1) : durée tirée dans template.blockerDurationRange (ms), pas de
          // gabarit — le nœud est purement temporel, résolu par un timestamp (readyAt).
          var durMin = (template.blockerDurationRange && template.blockerDurationRange[0]) || 300000;
          var durMax = (template.blockerDurationRange && template.blockerDurationRange[1]) || 600000;
          slot.durationMs = Math.round(durMin + nextRandom() * (durMax - durMin));
        }
        level.push(slot);
      }
      card.push(level);
    }
    return card;
  },

  /* Combien de nombres aléatoires buildCard va consommer au maximum, pour que l'appelant
     puisse préparer un tableau randomValues de taille suffisante (1 par palier + 2 par porte
     — gabaritId + riskMod, v3.121.0). */
  estimateRandomCount: function (template) {
    if (!template) return 0;
    var depthMax = Number(template.depthMax || 1);
    var gatesMax = (template.gatesPerDepth && template.gatesPerDepth[1]) || 2;
    return depthMax * (1 + gatesMax * 2);
  },

  /* riskLevel(riskMod) -> "low"|"medium"|"high", pour affichage qualitatif du GAIN relatif
     (distinct de l'estimate de réussite) — jamais de chiffre exact avant résolution. */
  riskLevel: function (riskMod) {
    if (riskMod == null) return "medium";
    if (riskMod < 0.9) return "low";
    if (riskMod < 1.3) return "medium";
    return "high";
  },

  /* ---------- Résolution d'un nœud "check" ---------- */
  /* resolveObstacle(gabarit, optionKey, statEffective, depth, randomValue, riskMod) ->
     { result: "perfect"|"success"|"setback", estimate, successChance }
     statEffective : stat déjà réduite par les blessures (calculée côté run-system). */
  resolveObstacle: function (gabarit, optionKey, statEffective, depth, randomValue, riskMod) {
    var option = gabarit && gabarit.options && gabarit.options[optionKey];
    if (!option) return { result: "setback", estimate: "low", successChance: 15 };
    var difficulty = SceneCheckSystem.depthDifficulty(gabarit.baseDifficulty || 4, depth) * (riskMod || 1);
    return SceneCheckSystem.resolveCheck({
      statValue: statEffective,
      difficulty: difficulty,
      randomValue: randomValue
    });
  },

  /* estimateObstacle(...) -> même calcul que resolveObstacle mais sans randomValue, pour
     affichage AVANT résolution (estimate qualitatif uniquement, jamais de % — vue). */
  estimateObstacle: function (gabarit, optionKey, statEffective, depth, riskMod) {
    var option = gabarit && gabarit.options && gabarit.options[optionKey];
    if (!option) return "low";
    var difficulty = SceneCheckSystem.depthDifficulty(gabarit.baseDifficulty || 4, depth) * (riskMod || 1);
    var chance = SceneCheckSystem.successChance(statEffective, difficulty);
    return SceneCheckSystem.estimate(chance);
  },

  /* ---------- Gains ---------- */
  /* rollLoot(baseRange, depth, randomValue, riskMod) -> entier, base tirée dans [min,max],
     multiplié par depthLootMultiplier ET par riskMod (v3.121.0 : une porte plus périlleuse
     rapporte visiblement plus — c'est ce qui rend le choix risque/récompense réel). */
  rollLoot: function (baseRange, depth, randomValue, riskMod) {
    var min = (baseRange && baseRange[0]) || 0;
    var max = (baseRange && baseRange[1]) || 0;
    var base = min + Math.floor(Number(randomValue || 0) * (max - min + 1));
    return Math.round(base * SceneCheckSystem.depthLootMultiplier(depth) * (riskMod || 1));
  }
};

window.SceneEngine = SceneEngine;
