"use strict";
/* systems/resource-reserve-system.js — v3.98.13 : ResourceReserveManager, seuils de
   réserve protégée par ressource — un montant que le CHAÎNAGE AUTOMATIQUE des ateliers
   (voir WorkshopsSystem) ne peut jamais entamer, réglable depuis l'Entrepôt (voir
   ui/warehouse-view.js). Décision validée avec Seb : la réserve ne s'applique QU'au
   chaînage auto — jamais au craft manuel (WorkshopsSystem.enqueueCraft) ni aux
   améliorations (zones ou ateliers), qui restent libres de descendre sous la réserve si
   le joueur le décide lui-même.

   Persistance dans game.production._resourceReserves = { [resourceKey]: number|null } —
   DÉTOURNÉ de son usage habituel (game.production[buildingId] par bâtiment) : choix
   validé avec Seb pour éviter de modifier save-system.js (fichier protégé, les 4
   emplacements obligatoires — buildSaveData/loadGame/hardResetState/fullResetState — ne
   listent pas ce champ). game.production dans son ensemble est déjà traité comme un bloc
   opaque, entièrement sérialisé sans que save-system.js connaisse sa structure interne
   (voir COMMENTAIRES_ORIGINAUX.md), donc _resourceReserves y voyage "gratuitement" sans
   aucune modification de fichier protégé. La clé "_resourceReserves" ne collisionne
   jamais avec un buildingId réel (aucun id de PRODUCTION_BUILDINGS ne commence par "_").

   v3.98.14 : réserve par DÉFAUT de DEFAULT_RESERVE (100), appliquée à TOUTE ressource
   jamais réglée explicitement par le joueur — y compris sur une sauvegarde déjà
   existante (décision validée avec Seb : comme ce réglage vient d'être introduit, aucun
   joueur n'a pu le régler avant, donc "jamais réglé" et "sauvegarde existante" sont le
   même cas, sans migration spéciale nécessaire). Distingue "jamais réglé" (undefined ->
   DEFAULT_RESERVE) de "réglé explicitement à 0 par le joueur" (0 stocké tel quel -> pas
   de protection) via null comme marqueur de "explicitement vidé" : setReserve(key, 0)
   stocke null plutôt que de supprimer la clé, pour que ce 0 volontaire ne retombe jamais
   sur le défaut au prochain chargement. */

var RESOURCE_RESERVE_DEFAULT = 100;

var ResourceReserveManager = {
  ensure: function () {
    if (!game.production || typeof game.production !== "object") game.production = {};
    if (!game.production._resourceReserves || typeof game.production._resourceReserves !== "object") {
      game.production._resourceReserves = {};
    }
  },

  /* undefined (jamais réglé) -> DEFAULT_RESERVE. null (explicitement mis à 0 par le
     joueur) ou un nombre stocké -> cette valeur telle quelle. */
  getReserve: function (key) {
    this.ensure();
    var stored = game.production._resourceReserves[key];
    if (typeof stored === "undefined") return RESOURCE_RESERVE_DEFAULT;
    return Math.max(0, Number(stored || 0));
  },

  setReserve: function (key, amount) {
    this.ensure();
    var value = Math.max(0, Math.floor(Number(amount) || 0));
    // v3.98.14 : stocke `null` pour un 0 explicite (pas de suppression de clé) — sinon
    // la ressource retomberait sur RESOURCE_RESERVE_DEFAULT au prochain calcul, alors
    // que le joueur vient justement de choisir "aucune protection".
    game.production._resourceReserves[key] = value > 0 ? value : null;
    if (typeof renderPanel === "function") renderPanel();
    if (typeof saveGame === "function") saveGame();
  },

  /* Quantité de `key` disponible pour le CHAÎNAGE AUTO uniquement — le stock total moins
     la réserve protégée. Jamais négatif. Le craft manuel continue d'utiliser
     WarehouseManager.getAmount(key) directement, sans passer par ici. */
  getAvailableForAutoCraft: function (key) {
    var total = WarehouseManager.getAmount(key);
    var reserve = this.getReserve(key);
    return Math.max(0, total - reserve);
  }
};

window.ResourceReserveManager = ResourceReserveManager;
