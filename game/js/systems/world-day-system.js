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
  // v3.655.0 (C3, atelier jour-nuit-camp) : le moment du jour au Camp, selon les sorties faites depuis la nuit.
  moment: function () { var w = this.ensure(); return w.dark ? "nuit" : w.done <= 0 ? "matin" : w.done === 1 ? "jour" : "soir"; },

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
     Chantier (Ruines) : la ville rebâtit un quartier ; noRegress (Crypte, Montagne) : rien n'est repris, le réveil et la chaleur retombent ;
     sinon (Forêt, Désert) : une chance de reprendre un secteur libéré lointain non tenu. */
  nightfall: function () {
    var w = this.ensure(), LM = window.LivingMapManager;
    var world = window.WORLDS && window.WorldManager ? WORLDS[Number(WorldManager.worldIndex || 0)] : null;
    var map = LM && world ? LM.getMapForWorld(world.id) : null;
    var rest = map && map.noRegress ? this._restBefore(map) : null; // v3.622.0 : relevé avant le changement de jour
    w.day += 1; w.done = 0; w.dark = true; w.pending = true;
    var night = { day: w.day, world: world ? world.id : null, mapId: map ? map.id : null, sectorId: null, braked: false, kind: "calme" };
    if (rest && (rest.calmed.length || rest.cooled.length)) { night.kind = "repos"; night.calmed = rest.calmed; night.cooled = rest.cooled; }
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
    if (window.VillageEvents) { var ev = VillageEvents.onDawn(w.day); night.event = ev ? ev.id : null; } // v3.604.0 : Ce matin à Aeswyn
    w.night = night;
    if (typeof addLog === "function") addLog("🌙 " + this.nightText(night), "event");
    if (typeof saveGame === "function") saveGame();
    return night;
  },

  /* v3.622.0 — Crypte et Montagne : secteurs hostiles (réveil, coulée) et veines chaudes, relevés avant la nuit.
     La nuit les fait retomber d'eux-mêmes (hostileDay et heatDay suivent le jour) : l'écran le dit. */
  _restBefore: function (map) {
    var LM = LivingMapManager, out = { calmed: [], cooled: [] };
    map.sectors.forEach(function (d) {
      if (LM.isHostile(map.id, d.id)) out.calmed.push(d.id);
      if (map.veins && LM.heatOf(map.id, d.id) > 0) out.cooled.push(d.id);
    });
    return out;
  },

  // « la nef et le crâne » (1 ou 2 noms, initiale en minuscule) ; null au-delà, la phrase donne alors le nombre.
  _names: function (mapId, ids) {
    var LM = LivingMapManager, n = ids.map(function (id) { var d = LM.getSectorDef(mapId, id); var x = d ? String(_td(d.name)) : ""; return x.charAt(0).toLowerCase() + x.slice(1); }).filter(Boolean);
    if (!n.length || n.length > 2) return null;
    return n.length === 1 ? n[0] : _t("{a} et {b}", { a: n[0], b: n[1] });
  },

  _restText: function (n) {
    var LM = window.LivingMapManager, map = LM ? LM.getMap(n.mapId) : null, out = [], self = this;
    if (!map) return "";
    var calmed = n.calmed || [], cooled = n.cooled || [];
    if (calmed.length) {
      var x = self._names(n.mapId, calmed);
      if (map.veins) out.push(x ? _t("Cette nuit, la lave a refroidi : {x}.", { x: x }) : _t("Cette nuit, la lave a refroidi sur {n} secteurs.", { n: calmed.length }));
      else if (map.redite) out.push(x ? _t("Cette nuit, la Tour a fini de refaire : {x}.", { x: x }) : _t("Cette nuit, la Tour a fini de refaire {n} étages.", { n: calmed.length })); // v3.627.0
      else out.push(x ? _t("Cette nuit, les gisants se sont rendormis : {x}.", { x: x }) : _t("Cette nuit, les gisants se sont rendormis dans {n} couloirs.", { n: calmed.length }));
    }
    if (cooled.length) {
      var y = self._names(n.mapId, cooled);
      if (out.length) out.push(y ? _t("La chaleur aussi est retombée : {x}.", { x: y }) : _t("La chaleur aussi est retombée sur {n} secteurs.", { n: cooled.length })); // pas deux « Cette nuit »
      else out.push(y ? _t("Cette nuit, la chaleur est retombée : {x}.", { x: y }) : _t("Cette nuit, la chaleur est retombée sur {n} secteurs.", { n: cooled.length }));
    }
    return out.join(" ");
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
    if (!n || !LM || !n.mapId) return _t("Rien n'a bougé autour du camp.");
    var d = n.sectorId ? LM.getSectorDef(n.mapId, n.sectorId) : null;
    if (n.kind === "reprise" && d) return LM.buildRegressionMessage(n.mapId, n.sectorId);
    if (n.kind === "repos") { var r = this._restText(n); if (r) return r; }
    if (n.kind === "chantier" && d) return _t("Cette nuit, la ville a rebâti {x}.", { x: _td(d.name) });
    if (n.braked) return _t("La Palissade a tenu : rien n'a été repris.");
    return _t("Rien n'a bougé autour du camp.");
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
