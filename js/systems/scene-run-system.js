"use strict";
/* systems/scene-run-system.js — v3.391.0 (chantier P, lot P-3) : porte d'entrée des expéditions.
   L'ancien moteur de scènes est retiré : Petites Aventures et parcours sont menés par Pa2Run
   (pa2-run.js). Restent ici game.sceneRun (sauvegardé), la réserve des Petites Aventures, le
   verrou du héros, les quêtes terminées, le déblocage et le compte rendu à la carte vivante. */

var SceneRunManager = {
  ensureDefaults: function () {
    if (typeof ensureGameStateDefaults === "function") ensureGameStateDefaults();
    if (!game.sceneRun) game.sceneRun = null;
    // v3.125.0 (Petites Aventures, Lot PA1) : cap journalier léger, persisté dans
    // explorationProgression (objet déjà whitelisté save-system.js, pas de nouvelle clé
    // racine — même règle que villageQuests/boardAccepted). "day" = jour civil local
    // (toDateString), pas un timestamp — évite tout souci de fuseau/minuit ambigu.
    if (!game.explorationProgression) game.explorationProgression = {};
    if (!game.explorationProgression.petiteAventure || typeof game.explorationProgression.petiteAventure !== "object") {
      game.explorationProgression.petiteAventure = { spent: 0, since: null }; // v3.366.0 : réserve rechargeable
    }
  },

  PETITE_AVENTURE_DAILY_CAP: 3,

  /* v3.366.0 (décision Seb 28/09/2026) — RECHARGE au lieu du plafond du jour civil. La réserve
     vaut le cap du monde (3 en Forêt, 4 au Désert, + Carte de l'éclaireur) ; chaque place
     dépensée revient une à une, une toutes les PETITE_AVENTURE_RECHARGE_MS (une seule horloge,
     comme une jauge). Persisté dans explorationProgression.petiteAventure : spent (places
     dépensées, négatif = bonus de l'Admin) et since (départ de l'horloge, null si réserve pleine). */
  PETITE_AVENTURE_RECHARGE_MS: 4 * 3600e3,

  _today: function () { return new Date().toDateString(); },

  /* Lecture de l'état, migration de l'ancien compteur du jour (day/count), puis recharge due. */
  _paState: function () {
    this.ensureDefaults();
    var pa = game.explorationProgression.petiteAventure, now = Date.now();
    if (typeof pa.spent !== "number") {
      // ancienne forme : le compteur du jour devient des places dépensées, l'horloge part maintenant
      pa.spent = (pa.day === this._today()) ? Number(pa.count || 0) : 0;
      pa.since = pa.spent > 0 ? now : null;
      delete pa.day; delete pa.count;
    }
    if (pa.spent > 0) {
      if (typeof pa.since !== "number" || pa.since > now) pa.since = now;
      var k = Math.floor((now - pa.since) / this.PETITE_AVENTURE_RECHARGE_MS);
      if (k > 0) {
        var back = Math.min(k, pa.spent);
        pa.spent -= back;
        pa.since += back * this.PETITE_AVENTURE_RECHARGE_MS;
      }
    }
    if (pa.spent <= 0) pa.since = null;
    return pa;
  },

  /* Places dépensées et pas encore revenues (nom historique conservé : l'Admin et le tableau le lisent). */
  petiteAventureCountToday: function () {
    return Number(this._paState().spent || 0);
  },

  /* v3.298.0 (W-1b, D10) : cap du jour lu sur le plus haut monde atteint (WORLD_CAPS,
     petiteAventureCap) : 3 en Forêt, 4 au Désert. Recalculé à chaque lecture, donc dès la
     traversée. PETITE_AVENTURE_DAILY_CAP reste la valeur de repli (et l'ancre des bancs).
     v3.366.0 : c'est désormais la RÉSERVE de places, rechargées une à une. */
  getPetiteAventureCap: function () {
    var c = (window.WorldCaps && typeof WorldCaps.getPetiteAventureCap === "function") ? WorldCaps.getPetiteAventureCap() : null;
    var base = (typeof c === "number" && isFinite(c)) ? c : this.PETITE_AVENTURE_DAILY_CAP;
    // v3.321.0 : Carte de l'éclaireur (boutique d'Éclats), ajoutée au cap du monde
    var bonus = (window.DungeonManager && typeof DungeonManager.getShardEffect === "function") ? DungeonManager.getShardEffect("paBonus") : 0;
    return base + bonus;
  },

  canStartPetiteAventureToday: function () {
    return this.petiteAventureCountToday() < this.getPetiteAventureCap();
  },

  /* v3.366.0 : délai avant la prochaine place (ms), 0 si une place est libre ou si rien ne recharge. */
  petiteAventureNextInMs: function () {
    var pa = this._paState();
    if (this.canStartPetiteAventureToday() || !(pa.spent > 0) || typeof pa.since !== "number") return 0;
    return Math.max(0, pa.since + this.PETITE_AVENTURE_RECHARGE_MS - Date.now());
  },

  /* v3.366.0 : « 2 h 13 », « 45 min » — pour les refus et le tableau. */
  formatPetiteAventureWait: function (ms) {
    var m = Math.max(1, Math.ceil(Number(ms || 0) / 60000));
    var h = Math.floor(m / 60);
    m = m % 60;
    return h ? (_t("{n} h", { n: h }) + (m ? " " + (m < 10 ? "0" : "") + m : "")) : _t("{n} min", { n: m });
  },

  /* Phrase de refus commune (carte vivante, tableau, départ) */
  petiteAventureWaitLabel: function () {
    return _t("Prochaine expédition dans {d}", { d: this.formatPetiteAventureWait(this.petiteAventureNextInMs()) });
  },

  _consumePetiteAventureSlot: function () {
    var pa = this._paState();
    if (!(pa.spent > 0)) pa.since = Date.now(); // réserve pleine : l'horloge part avec cette place
    pa.spent = Number(pa.spent || 0) + 1;
  },

  /* v3.355.0 (D6) : un échec SUBI (évacuation, Souffle épuisé, mort) rend la place.
     L'abandon volontaire la garde : sinon on relancerait le tirage sans limite.
     v3.366.0 : la place revient tout de suite dans la réserve, quel que soit le jour. */
  _refundPetiteAventureSlot: function (run) {
    if (!run || !run.paSlotDay) return;
    var pa = this._paState();
    if (Number(pa.spent || 0) > 0) pa.spent -= 1;
    if (pa.spent <= 0) pa.since = null;
    run.paSlotDay = null;
  },

  getRun: function () {
    this.ensureDefaults();
    var run = game.sceneRun;
    if (run && !run.pa2) { this._retireLegacyRun(run); return null; }
    return run;
  },

  /* v3.388.0-v3.391.0 : un run de l'ancien moteur repris d'une vieille sauvegarde se clôt :
     butin rapporté, place de la réserve ou coût d'entrée rendus, une ligne au journal. */
  _retireLegacyRun: function (run) {
    game.sceneRun = null;
    if (run.status === "completed") return;
    var tpl = window.SceneEngine ? SceneEngine.getTemplate(run.templateId) : null;
    this._refundPetiteAventureSlot(run);
    if (window.SortieManager && SortieManager.isActive()) SortieManager.end("success");
    if (tpl && tpl.mode === "parcours") {
      if (tpl.entryCost && window.WarehouseManager) WarehouseManager.refundResource(tpl.entryCost.resourceId, Number(tpl.entryCost.amount || 0));
      if (typeof addLog === "function") addLog(_t("{t} : le parcours a changé. Il reprend du début, sans nouveau coût.", { t: _td(tpl.title || "") }), "event");
      return;
    }
    if (typeof addLog === "function") addLog(_t("L'ancienne Petite aventure en cours est close : ton butin est rapporté."), "event");
  },

  isRunActive: function () {
    var run = this.getRun();
    return !!(run && run.status !== "completed");
  },

  /* v3.307.0 : héros engagé sur la route, rien de ce qui le touche ne se fait ailleurs.
     En préparation v2, rien n'est engagé (le héros part au « Entrer »). */
  isHeroEngaged: function () {
    var run = this.getRun();
    return !!(run && run.status !== "completed" && run.status !== "pa2-prep");
  },

  /* v3.122.0 (Lot S2a) : vrai si la quête (canevas à unlockOnSuccess) est déjà réussie de
     façon permanente — même contrat que ExplorationManager.isQuestCompleted() (repli sur
     unlockFlag si completionFlag absent, migration "déjà en jeu = acquis" incluse). Les
     canevas sans unlockOnSuccess (expédition générative répétable) ne sont jamais
     "complétés" au sens permanent — retourne toujours false pour eux. */
  isQuestCompleted: function (templateId) {
    this.ensureDefaults();
    var template = SceneEngine.getTemplate(templateId);
    if (!template || !template.unlockOnSuccess) return false;
    var spec = template.unlockOnSuccess;
    if (game.explorationProgression && spec.completionFlag && game.explorationProgression[spec.completionFlag]) return true;
    if (spec.buildingId && spec.unlockFlag && game.explorationProgression && game.explorationProgression[spec.unlockFlag]) return true;
    return false;
  },

  /* Snapshot des 3 stats brutes au moment du départ — jamais recalculé ensuite pendant le run
     (même règle que ExplorationManager.buildHeroSnapshot / MiningManager / WellManager). */
  buildHeroSnapshot: function () {
    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
      StatsSystem.recalcStats();
    }
    return {
      heroId: game.heroId,
      power: Number(game.heroPowerRaw || 0),
      precision: Number(game.heroPrecisionRaw || 0),
      endurance: Number(game.heroEnduranceRaw || 0)
    };
  },

  /* startRun(templateId, opts) -> { ok, reason, run } : Petite Aventure ou parcours, menés par
     Pa2Run. opts.livingMap = { mapId, sectorId } : run ciblé sur un secteur de la carte vivante. */
  startRun: function (templateId, opts) {
    this.ensureDefaults();
    if (this.isRunActive()) return { ok: false, reason: _t("Une expédition est déjà en cours"), run: null };
    var template = SceneEngine.getTemplate(templateId);
    if (!template || !(window.Pa2Run && Pa2Run.isTemplate(template))) return { ok: false, reason: _t("Expédition introuvable"), run: null };
    if (this.isQuestCompleted(templateId)) return { ok: false, reason: _t("Expédition déjà terminée"), run: null };
    return Pa2Run.start(templateId, opts);
  },

  /* v3.256.0 (C-2) : rapporte la fin d'un run ciblé à la carte, une seule fois par run.
     result : "success" | "fail" | "neutral" (voir LivingMapManager.onRunEnd). */
  _notifyLivingMap: function (run, result) {
    if (!run || !run.livingMap || run.livingMapReport || !window.LivingMapManager) return;
    run.livingMapReport = LivingMapManager.onRunEnd(run.livingMap.mapId, run.livingMap.sectorId, result);
  },

  /* v3.122.0 (Lot S2a) : applique le déblocage narratif d'une quête simple (bâtiment de
     production + flags de progression permanents), une seule fois au succès du jet unique.
     unlockSpec : { buildingId, unlockFlag, completionFlag } — même contrat que
     ExplorationManager.settle() (production-system.js + explorationProgression). */
  _applyUnlock: function (unlockSpec) {
    if (!unlockSpec) return;
    this.ensureDefaults();
    if (!game.explorationProgression) game.explorationProgression = {};
    if (unlockSpec.unlockFlag) game.explorationProgression[unlockSpec.unlockFlag] = true;
    if (unlockSpec.completionFlag) game.explorationProgression[unlockSpec.completionFlag] = true;
    if (unlockSpec.buildingId && window.ProductionManager && typeof ProductionManager.unlockBuilding === "function") {
      ProductionManager.unlockBuilding(unlockSpec.buildingId);
    }
  },

  /* abandon() : quitter l'expédition (garde de switchTab, bouton retour). Sans run, ne fait rien. */
  abandon: function () {
    var run = this.getRun();
    if (!run || run.status === "completed" || !window.Pa2Run) return { ok: false, reason: _t("Aucune expédition en cours") };
    return Pa2Run.abandon();
  },

  /* Nettoie le run terminé (après affichage du bilan). */
  clearRun: function () {
    game.sceneRun = null;
    if (typeof saveGame === "function") saveGame();
  },

  /* combat-engine.js (protégé) appelle encore ces deux points sous la garde status "combat",
     qu'aucun run ne porte plus : ils ne font que clore un vieux run qui passerait par là. */
  onCombatWon: function () { this.getRun(); },
  onCombatDefeat: function () { this.getRun(); }
};

window.SceneRunManager = SceneRunManager;

/* v3.307.0 : raison affichable du verrou héros, ou null. Lu par les systèmes et les vues. */
var HERO_LOCK_REASON = _t("Ton héros est en expédition : termine-la d'abord."); // v3.370.0 : traduit à la définition (i18n D2)
function heroLockReason() {
  return (window.SceneRunManager && SceneRunManager.isHeroEngaged()) ? HERO_LOCK_REASON : null;
}
/* Garde d'une ligne : true (et toast) si l'action doit être refusée. */
function heroLockToast() {
  var r = heroLockReason();
  if (r) {
    // v3.336.0 (F-2) : le refus propose de reprendre l'expédition
    if (typeof showHowToToast === "function") showHowToToast(r, "heroLock");
    else if (typeof showToast === "function") showToast(r, 1800);
  }
  return !!r;
}
window.HERO_LOCK_REASON = HERO_LOCK_REASON;
window.heroLockReason = heroLockReason;
window.heroLockToast = heroLockToast;
