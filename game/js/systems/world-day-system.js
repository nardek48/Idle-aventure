"use strict";
/* systems/world-day-system.js — v3.602.0 (chantier « jours du monde », J2 + nuit vivante, atelier jours-du-monde B, choix de Seb du 31/10).
   Une nuit tombe toutes les 3 sorties terminées (le farm libre ne compte pas). Aucune nuit ne passe en l'absence du joueur.
   État : game.explorationProgression.worldDay (déjà sauvegardé en entier, aucun changement de save-system.js). */

var WORLD_DAY_SORTIES = 3;          // sorties terminées par nuit
var WORLD_DAY_RECLAIM = 0.5;        // chance de base qu'une nuit reprenne un secteur (réduite par le frein de la Palissade)

var WorldDays = {
  ensure: function () {
    var ep = game.explorationProgression || (game.explorationProgression = {});
    var w = ep.worldDay;
    if (!w || typeof w !== "object") w = ep.worldDay = { day: 1, done: 0, night: null, pending: false, dark: false };
    w.day = Math.max(1, Math.floor(Number(w.day) || 1));
    w.done = Math.max(0, Math.min(WORLD_DAY_SORTIES - 1, Math.floor(Number(w.done) || 0)));
    return w;
  },
  day: function () { return this.ensure().day; },
  key: function () { return "J" + this.day(); },             // clé du jour de jeu (règles des cartes)
  left: function () { return WORLD_DAY_SORTIES - this.ensure().done; },
  isDark: function () { return !!this.ensure().dark; },     // la soirée qui suit la nuit, jusqu'à la sortie suivante

  // Appelé par SortieManager.end (hors farm libre).
  onSortieEnd: function (context) {
    if (context === "farm") return null;
    var w = this.ensure();
    w.dark = false;
    w.done += 1;
    if (w.done < WORLD_DAY_SORTIES) return null;
    return this.nightfall();
  },

  /* La nuit : jour +1, puis la carte du monde où vit le héros réagit selon sa règle.
     Chantier (Ruines) : la ville rebâtit un quartier ; noRegress (Crypte, Montagne) : rien n'est repris ;
     sinon (Forêt, Désert) : une chance de reprendre un secteur libéré lointain non tenu. */
  nightfall: function () {
    var w = this.ensure(), LM = window.LivingMapManager;
    w.day += 1; w.done = 0; w.dark = true; w.pending = true;
    var world = window.WORLDS && window.WorldManager ? WORLDS[Number(WorldManager.worldIndex || 0)] : null;
    var map = LM && world ? LM.getMapForWorld(world.id) : null, night = { day: w.day, world: world ? world.id : null, mapId: map ? map.id : null, sectorId: null, braked: false, kind: "calme" };
    if (map) {
      if (map.chantier) {
        var c = LM.getChantier(map.id);
        night.kind = "chantier";
        if (c && c.sectorId) night.sectorId = c.sectorId;
      } else if (!map.noRegress) {
        var pick = this._pickReclaim(map);
        if (pick) {
          if (LM._rand() < LM.getBrakeChance(map.id)) night.braked = true;
          else if (LM._rand() < WORLD_DAY_RECLAIM && LM.regress(map.id, pick.id, "nuit")) { night.sectorId = pick.id; night.kind = "reprise"; }
        }
      }
    }
    w.night = night;
    if (typeof addLog === "function") addLog("🌙 " + this.nightText(night), "event");
    if (typeof saveGame === "function") saveGame();
    return night;
  },

  // Un secteur libéré de l'anneau le plus lointain (3, puis 2), non tenu par la Palissade, pas l'élite rejouable, pas celui qu'on vient de jouer.
  _pickReclaim: function (map) {
    var LM = LivingMapManager, busy = [];
    if (game.sceneRun && game.sceneRun.livingMap) busy.push(game.sceneRun.livingMap.sectorId);
    if (game.livingMaps && game.livingMaps.fight) busy.push(game.livingMaps.fight.sectorId);
    var pool = map.sectors.filter(function (d) {
      return d.ring >= 2 && LM.isLiberated(map.id, d.id) && !LM.isProtected(map.id, d.id) && !LM.isRepeatable(map.id, d.id) && busy.indexOf(d.id) < 0;
    });
    if (!pool.length) return null;
    var top = Math.max.apply(null, pool.map(function (d) { return d.ring; }));
    pool = pool.filter(function (d) { return d.ring === top; });
    return pool[Math.min(pool.length - 1, Math.floor(LM._rand() * pool.length))];
  },

  // Ce que la nuit a fait, en une phrase (journal, écran de la nuit, « Cette nuit » au camp).
  nightText: function (night) {
    var LM = window.LivingMapManager, n = night || this.ensure().night;
    if (!n || !LM || !n.mapId) return _t("La nuit tombe. Rien n'a bougé autour du camp.");
    var d = n.sectorId ? LM.getSectorDef(n.mapId, n.sectorId) : null;
    if (n.kind === "reprise" && d) return LM.buildRegressionMessage(n.mapId, n.sectorId);
    if (n.kind === "chantier" && d) return _t("Cette nuit, la ville a rebâti {x}.", { x: _td(d.name) });
    if (n.braked) return _t("La Palissade a tenu : rien n'a été repris.");
    return _t("La nuit tombe. Rien n'a bougé autour du camp.");
  },

  // Écran de la nuit : montré une fois, au premier passage au Camp après la tombée de la nuit.
  takePending: function () {
    var w = this.ensure();
    if (!w.pending) return null;
    w.pending = false;
    return w.night;
  }
};

window.WorldDays = WorldDays;
window.WORLD_DAY_SORTIES = WORLD_DAY_SORTIES;
