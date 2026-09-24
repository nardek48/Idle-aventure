"use strict";
/* systems/provisions-system.js — v3.330.0 : VIVRES DE SORTIE (économie du village, décision E4
   option a de Seb, 24/09/2026).

   Une ration pour partir, seulement pour les sorties qu'on REFAIT :
     - chasse : dès qu'un lot de cette chasse a déjà été bouclé (game.huntStats) ;
     - run de donjon : dès que ce donjon a déjà été fini une fois (game.dungeonTierCleared),
       sauf ticket d'Histoire (DungeonManager.isStoryTicketFree) ;
     - élite de carte : dès que son secteur est libéré (combat rejoué).
   L'Histoire et les premières victoires restent gratuites : un joueur qui avance vite n'est
   jamais bloqué. Aux actes I et II de la Forêt, rien du tout (découverte du jeu).
   Forêt : Petite ration. Désert : Ration moyenne (recette revue, data/workshops.js).
   Les Petites Aventures gardent leur propre coût d'entrée (scene-templates.js, entryCost). */

var PROVISIONS_BY_WORLD = { forest: "petite_ration", desert: "ration" };
var PROVISIONS_FREE_UNTIL_STEP = "forest_crossing"; // acte III de la Forêt

var ProvisionsManager = {
  /* Ration demandée pour cette sortie, ou null si elle est gratuite.
     kind : "hunt" | "dungeon" | "mapelite" ; ref : l'objet de données (chasse, donjon) ou
     { mapId, sectorId, worldId } pour une élite de carte. */
  getRequirement: function (kind, ref) {
    if (!ref) return null;
    var worldId = ref.worldId || "forest";
    var resourceId = PROVISIONS_BY_WORLD[worldId] || null;
    if (!resourceId) return null; // mondes suivants : à régler avec eux
    if (worldId === "forest" && window.StoryQuestManager && typeof StoryQuestManager.isStepReached === "function"
        && !StoryQuestManager.isStepReached(PROVISIONS_FREE_UNTIL_STEP)) return null;
    if (!this.isRepeat(kind, ref)) return null;
    return { resourceId: resourceId, amount: 1 };
  },

  /* Vrai si cette sortie a déjà été réussie une fois. */
  isRepeat: function (kind, ref) {
    if (kind === "hunt") return Number((game.huntStats || {})[ref.id] || 0) >= 1;
    if (kind === "dungeon") {
      if (window.DungeonManager && typeof DungeonManager.isStoryTicketFree === "function" && DungeonManager.isStoryTicketFree(ref.id)) return false;
      return !!(game.dungeonTierCleared || {})[ref.id];
    }
    if (kind === "mapelite") {
      return !!(window.LivingMapManager && typeof LivingMapManager.isLiberated === "function"
        && LivingMapManager.isLiberated(ref.mapId, ref.sectorId));
    }
    return false;
  },

  /* Libellé court : « 1 Petite ration ». */
  label: function (req) {
    if (!req) return "";
    var def = (typeof WAREHOUSE_RESOURCES !== "undefined") ? WAREHOUSE_RESOURCES[req.resourceId] : null;
    return req.amount + " " + (def ? def.name : req.resourceId);
  },

  /* Raison du refus (texte prêt à afficher), ou null si on peut partir. */
  check: function (kind, ref) {
    var req = this.getRequirement(kind, ref);
    if (!req) return null;
    var have = window.WarehouseManager ? WarehouseManager.getAmount(req.resourceId) : 0;
    if (have >= req.amount) return null;
    return "Vivres : il te faut " + this.label(req) + " pour repartir (Cuisine de camp, à la Chasse)";
  },

  /* v3.330.1 : ligne d'écran « Vivres : 1 Petite ration (en stock : 3) », vide si la sortie
     est gratuite. Posée sur la fiche de chasse, la feuille de donjon et le panneau de carte. */
  buildLineHTML: function (kind, ref) {
    var req = this.getRequirement(kind, ref);
    if (!req) return "";
    var have = window.WarehouseManager ? Math.floor(WarehouseManager.getAmount(req.resourceId)) : 0;
    var ok = have >= req.amount;
    return '<div class="provisions-line' + (ok ? '' : ' is-missing') + '">Vivres : ' + (typeof esc === "function" ? esc(this.label(req)) : this.label(req))
      + ' <span class="provisions-have">(en stock : ' + have + ')</span></div>';
  },

  /* Prélève les vivres (à appeler juste avant le départ, après check()). */
  consume: function (kind, ref) {
    var req = this.getRequirement(kind, ref);
    if (!req || !window.WarehouseManager) return true;
    if (!WarehouseManager.removeResource(req.resourceId, req.amount)) return false;
    if (typeof addLog === "function") addLog("🎒 Vivres emportés : " + this.label(req), "event");
    return true;
  }
};

window.PROVISIONS_BY_WORLD = PROVISIONS_BY_WORLD;
window.ProvisionsManager = ProvisionsManager;
