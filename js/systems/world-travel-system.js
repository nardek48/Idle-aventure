"use strict";
/* systems/world-travel-system.js — v3.298.0 (W-1b) : CHANGER DE MONDE DE RÉSIDENCE.
   Conception Désert v1.4, D6 et D7. Depuis la v3.293.0 (plus de farm libre), plus rien ne
   déplace le joueur d'un monde à l'autre : WorldManager.advance n'a plus d'appelant. Ce
   fichier est désormais le seul point d'écriture durable de worldIndex, avec l'Ascension
   (retour à 0), le chargement de sauvegarde et l'Admin.

   Deux entrées :
     - arrive()   : appelée par la fin d'un run de traversée (canevas à travelOnSuccess), une
                    fois la chambre finale résolue. Aucune garde : c'est la traversée qui fait foi.
     - travelTo() : le voyage libre entre mondes déjà atteints (D7, à brancher sur la carte).
                    Refusé en combat, en run, en donjon.
   Aucun ennemi n'est généré : sans run de quête, il n'y a pas de combat. */

var WorldTravel = {
  indexOf: function (worldId) {
    if (typeof WORLDS === "undefined") return -1;
    return WORLDS.findIndex(function (w) { return w.id === worldId; });
  },

  /* Pose le monde de résidence. Renvoie true si le monde existe. */
  arrive: function (worldId, adventureIndex) {
    var idx = this.indexOf(worldId);
    if (idx === -1 || !window.WorldManager) return false;
    var world = WORLDS[idx];
    var adv = Math.max(0, Math.min((world.adventures || []).length - 1, Number(adventureIndex || 0)));
    var first = !(game.worldsEverReached && game.worldsEverReached[idx]);
    WorldManager.worldIndex = idx;
    WorldManager.adventureIndex = adv;
    WorldManager.enemyIndex = 0;
    if (typeof WorldManager.markWorldReached === "function") WorldManager.markWorldReached(idx);
    if (typeof WorldManager.applyWorldTheme === "function") WorldManager.applyWorldTheme();
    if (typeof addLog === "function") addLog((first ? "🗺️ Nouveau monde : " : "🗺️ Tu rejoins ") + world.name + ".", "zone");
    if (typeof saveGame === "function") saveGame();
    return true;
  },

  /* Une activité en cours interdit le voyage libre (D7 : au Camp, hors combat, hors run). */
  isBusy: function () {
    if (game.dungeonRun && game.dungeonRun.active) return true;
    if (game.adventureQuestRun && game.adventureQuestRun.active) return true;
    if (game.huntRun && game.huntRun.active) return true;
    if (game.livingMaps && game.livingMaps.fight) return true;
    if (game.sceneRun && game.sceneRun.status && game.sceneRun.status !== "completed") return true;
    return false;
  },

  canTravelTo: function (worldId) {
    var idx = this.indexOf(worldId);
    if (idx === -1) return false;
    if (!(game.worldsEverReached && game.worldsEverReached[idx])) return false;
    return !this.isBusy();
  },

  /* v3.301.0 (W-2b) : aventure où l'on revient. Chapitre du monde terminé -> sa dernière
     aventure (le Cœur pour la Forêt, là où la partie s'était arrêtée) ; sinon la première.
     Seuls les canevas sans aventure déclarée la lisent. */
  defaultAdventureFor: function (worldId) {
    var idx = this.indexOf(worldId);
    if (idx === -1) return 0;
    var last = Math.max(0, (WORLDS[idx].adventures || []).length - 1);
    var chapters = window.STORY_QUESTS || {};
    var done = Object.keys(chapters).some(function (id) {
      return chapters[id].worldId === worldId && window.StoryQuestManager && StoryQuestManager.isChapterCompleted(id);
    });
    if (done) return last;
    // v3.310.0 : sinon la plus avancée des aventures déjà atteintes (reachedFlag, ex. le Temple)
    var ep = game.explorationProgression || {}, best = 0;
    (WORLDS[idx].adventures || []).forEach(function (a, i) { if (a.reachedFlag && ep[a.reachedFlag]) best = i; });
    return best;
  },

  /* Pourquoi le voyage est refusé (texte affichable), ou null s'il est possible. */
  refusalReason: function (worldId) {
    var idx = this.indexOf(worldId);
    if (idx === -1) return "Monde inconnu";
    if (!(game.worldsEverReached && game.worldsEverReached[idx])) return "Tu n'as pas encore atteint ce monde";
    if (window.WorldManager && Number(WorldManager.worldIndex || 0) === idx) return "Tu y es déjà";
    if (this.isBusy()) return "Termine d'abord ton combat ou ton expédition";
    return null;
  },

  /* Voyage libre vers un monde déjà atteint (la cérémonie ne sert qu'une fois). */
  travelTo: function (worldId, adventureIndex) {
    if (!this.canTravelTo(worldId)) return false;
    if (typeof adventureIndex !== "number") adventureIndex = this.defaultAdventureFor(worldId);
    return this.arrive(worldId, adventureIndex);
  }
};

window.WorldTravel = WorldTravel;
