"use strict";
/* systems/resume-system.js — v3.239.0 : rattrapage du temps pendant lequel le jeu
   ne tournait pas alors que la page, elle, était toujours là.

   Le défaut corrigé. Le temps était crédité par deux chemins qui ne se parlaient
   pas : catchUpOffline(), qui lit l'écoulé réel mais n'était appelé que depuis
   main/boot.js, et tick(dt), appelé à chaque frame avec un dt borné à 0,25 s — et
   qui écrase lastTick au passage. Quand iOS suspend la PWA, rAF s'arrête ; au
   retour la première frame voyait un dt énorme, le bornait à 0,25 s, puis écrasait
   lastTick. L'écart n'était pas reporté, il était EFFACÉ (mesuré par
   sim/offline-bench.js : 0 unité créditée sur 84 pour 10 min d'absence, et rien de
   récupérable ensuite).

   Deux entrées, deux causes distinctes :
     - catchUpAfterGap()      écart d'horloge, appelé par main/game-loop.js AVANT
                              son tick, donc lastTick porte encore sa valeur
                              d'avant la suspension : aucun rembobinage nécessaire.
     - catchUpAfterSlotLoad() état périmé, appelé après un changement de héros en
                              cours de partie (switchToSlot ne rattrape pas).

   Ce qui n'est PAS ici, et pourquoi : le chantier de Village (endsAt contre
   Date.now) et la régénération du Campement (campRegenLastAt) lisent l'horloge
   murale et se rattrapent seuls. Seule la Production compte le temps en dt — et
   son catchUpOffline() couvre déjà les zones ET les files d'ateliers. */

/* Seuil de déclenchement. Au-dessus de 2 s, l'écart ne peut plus être un à-coup de
   rendu : cohérent avec le seuil de 1 s que catchUpOffline() utilise déjà pour
   ignorer un écart nul, avec une marge pour les gros à-coups mobiles. */
var RESUME_GAP_S = 2;

/* Au-dessus de cette absence, le retour est annoncé (choix Seb : 30 min). En
   dessous, le rattrapage se fait en silence — un toast à chaque déverrouillage
   d'écran serait du bruit. */
var RESUME_NOTICE_MS = 30 * 60 * 1000;

/* Anti-rafale : deux annonces ne peuvent pas se suivre à moins d'une minute. */
var RESUME_NOTICE_COOLDOWN_MS = 60 * 1000;

var ResumeManager = {
  GAP_S: RESUME_GAP_S,
  NOTICE_MS: RESUME_NOTICE_MS,
  _lastNoticeAt: 0,

  /* Écart d'horloge détecté par la boucle. `gapSeconds` est le dt réel, avant
     bornage. Retourne les gains mesurés (ou null si rien). */
  catchUpAfterGap: function (gapSeconds) {
    var ms = Math.max(0, Number(gapSeconds || 0) * 1000);
    if (ms < RESUME_GAP_S * 1000) return null;
    return this._catchUp(ms);
  },

  /* Changement de héros en cours de partie. L'absence n'est pas un écart d'horloge
     mesurable ici : elle se lit dans la sauvegarde qui vient d'être chargée
     (game.lastOnline = date de la dernière sauvegarde de CE héros). */
  catchUpAfterSlotLoad: function () {
    var ms = game.lastOnline ? Math.max(0, Date.now() - game.lastOnline) : 0;
    return this._catchUp(ms);
  },

  /* Corps commun. Idempotent : catchUpOffline() repose lastTick à maintenant, un
     second appel ne crédite rien. */
  _catchUp: function (ms) {
    var before = this._collect();

    if (window.ProductionManager && typeof ProductionManager.catchUpOffline === "function") {
      ProductionManager.catchUpOffline();
    }

    var gains = this._diff(before);
    if (!gains) return null;

    if (ms >= RESUME_NOTICE_MS) this._notify(ms, gains);
    if (typeof saveGame === "function") saveGame();
    if (typeof renderHud === "function") renderHud();

    return gains;
  },

  /* Photographie des deux destinations possibles d'une production : le stock des
     zones (à récolter) et l'Entrepôt (sortie des ateliers). Les deux sont gardées
     séparées — une même ressource peut alimenter les deux. */
  _collect: function () {
    var zones = {}, entrepot = {};

    if (window.ProductionPlotsSystem && window.PRODUCTION_BUILDINGS && game.production) {
      ProductionPlotsSystem.getManagedBuildingIds().forEach(function (id) {
        var def = PRODUCTION_BUILDINGS[id];
        var bucket = game.production[id];
        if (!def || !bucket || !Array.isArray(bucket.plots)) return;
        bucket.plots.forEach(function (plot) {
          if (!plot || plot.state !== "open") return;
          zones[def.resourceKey] = (zones[def.resourceKey] || 0) + Math.floor(Number(plot.stock || 0));
        });
      });
    }

    if (typeof WAREHOUSE_RESOURCES !== "undefined" && game.resources) {
      Object.keys(WAREHOUSE_RESOURCES).forEach(function (key) {
        entrepot[key] = Math.floor(Number(game.resources[key] || 0));
      });
    }

    return { zones: zones, entrepot: entrepot };
  },

  _diff: function (before) {
    var after = this._collect();
    var zones = {}, entrepot = {}, rien = true;

    Object.keys(after.zones).forEach(function (k) {
      var d = after.zones[k] - (before.zones[k] || 0);
      if (d > 0) { zones[k] = d; rien = false; }
    });
    Object.keys(after.entrepot).forEach(function (k) {
      var d = after.entrepot[k] - (before.entrepot[k] || 0);
      if (d > 0) { entrepot[k] = d; rien = false; }
    });

    return rien ? null : { zones: zones, entrepot: entrepot };
  },

  /* Annonce compacte : un toast + une ligne de journal. Volontairement PAS la
     modale d'OfflineManager, qui interrompt une partie en cours (elle reste le
     bon outil au chargement de la page, où le joueur n'est pas encore à l'écran). */
  _notify: function (ms, gains) {
    var now = Date.now();
    if (now - this._lastNoticeAt < RESUME_NOTICE_COOLDOWN_MS) return;
    this._lastNoticeAt = now;

    var parts = [];
    function libelle(key) {
      var def = (typeof WAREHOUSE_RESOURCES !== "undefined") ? WAREHOUSE_RESOURCES[key] : null;
      return def ? def.name : key;
    }
    Object.keys(gains.zones).forEach(function (k) {
      parts.push("+" + formatNumber(gains.zones[k]) + " " + libelle(k));
    });
    Object.keys(gains.entrepot).forEach(function (k) {
      parts.push("+" + formatNumber(gains.entrepot[k]) + " " + libelle(k) + " (atelier)");
    });
    if (!parts.length) return;

    var duree = this.formatAbsence(ms);
    var texte = "Absence de " + duree + " — le village a produit : " + parts.join(", ") + ".";

    if (typeof addLog === "function") addLog(texte, "event");
    if (typeof showToast === "function") showToast("⏳ " + duree + " d'absence : " + parts.join(", "), 3200);
  },

  /* Durée lisible, arrondie à l'unité au-dessus de la minute. */
  formatAbsence: function (ms) {
    var min = Math.round(ms / 60000);
    if (min < 60) return min + " min";
    var h = Math.floor(min / 60);
    var reste = min % 60;
    if (h < 24) return h + " h" + (reste ? " " + reste + " min" : "");
    var j = Math.floor(h / 24);
    return j + " j" + (h % 24 ? " " + (h % 24) + " h" : "");
  }
};

window.ResumeManager = ResumeManager;
