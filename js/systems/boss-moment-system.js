"use strict";
/* systems/boss-moment-system.js — v3.333.0 (Évolutions, lots B-1 et B-2) : moments de boss.
   Conception « Évolutions » v1.0 §5, décisions B1 à B6 (Seb, 24/09/2026).

   B1 : la mise en scène COMPLÈTE (carte d'entrée, flash de phase, coup final, trophée) se
   joue à la PREMIÈRE victoire sur chaque boss ou élite. Tant qu'il n'est pas vaincu, chaque
   rencontre reste une « première ». Rejoué : un bandeau court à l'entrée et à la phase.
   B5 : le trophée est un souvenir (Bestiaire), pas un objectif (Hauts faits).

   PERSISTANCE : game.bossTrophies = { <clé>: { name, at, level, rounds, allies[], worldId } },
   aux quatre points de save-system.js. Conservé à la reprise (hardResetState) : c'est un
   souvenir, comme le Codex.

   Deux appels depuis combat-engine.js (fichier protégé, accord Seb 24/09/2026) :
   onPhase() dans checkPhases, onBossKilled() dans killEnemy. L'entrée est vue par
   combat-view.js (renderEnemy -> onEnemyShown). Tout l'affichage vit dans
   ui/boss-moment-view.js ; ici, les règles et l'état. */

var BossMomentManager = {

  ensure: function () {
    if (!game.bossTrophies || typeof game.bossTrophies !== "object" || Array.isArray(game.bossTrophies)) game.bossTrophies = {};
    return game.bossTrophies;
  },

  /* Nom sans la couronne des boss de donjon (« 👑 Basilic » -> « Basilic »). */
  cleanName: function (enemy) {
    return String((enemy && enemy.name) || "").replace(/^\s*\ud83d\udc51\s*/, "").trim();
  },

  /* Clé d'un boss : identifiant + nom. Le Basilic (donjon) et le Roi Slime partagent la base
     « slimeking » : sans le nom, vaincre l'un compterait pour l'autre. */
  keyOf: function (enemy) {
    if (!enemy) return "";
    return String(enemy.id || "?") + ":" + this.cleanName(enemy);
  },

  getMoment: function (enemy) {
    var M = window.BOSS_MOMENTS || {};
    var m = M[this.cleanName(enemy)] || M[enemy && enemy.id] || {};
    var out = { title: m.title || null, intro: m.intro || null, phase: m.phase || null, death: m.death || null };
    // Élite sans réplique : sa lore (texte déjà validé) tient lieu d'intro
    if (!out.intro && enemy && enemy.isElite && window.ELITE_DB && ELITE_DB[enemy.id]) out.intro = ELITE_DB[enemy.id].lore || null;
    return out;
  },

  hasTrophy: function (enemy) {
    return !!this.ensure()[this.keyOf(enemy)];
  },

  /* Mise en scène complète ? Première victoire pas encore acquise, et réglage actif. */
  isFullMoment: function (enemy) {
    if (!enemy || !enemy.isBoss) return false;
    if (window.Prefs && !Prefs.get("bossMoments")) return false;
    return !this.hasTrophy(enemy);
  },

  /* Portrait : l'objet ennemi, sinon la fiche de sa base. */
  imageOf: function (enemy) {
    if (!enemy) return "";
    if (enemy.image) return enemy.image;
    var db = (window.BOSS_DB || {})[enemy.id] || (window.ENEMY_DB || {})[enemy.id] || {};
    return db.image || "";
  },

  /* Premier compagnon présent qui a une réplique pour l'occasion. */
  allyLine: function (kind) {
    if (!window.CompanionManager || !window.getCompanionDef) return null;
    var ids = CompanionManager.partyIds();
    for (var i = 0; i < ids.length; i++) {
      var def = getCompanionDef(ids[i]);
      if (def && def.lines && def.lines[kind]) return { id: ids[i], name: def.name, image: def.image, text: def.lines[kind] };
    }
    return null;
  },

  /* ---------- Événements ---------- */

  onEnemyShown: function (enemy) {
    if (!enemy || !enemy.isBoss || enemy._momentShown) return null;
    enemy._momentShown = true; // pas sauvegardé : un rechargement en plein combat la rejoue
    if (window.Prefs && !Prefs.get("bossMoments")) return null;
    var mode = this.isFullMoment(enemy) ? "full" : "short";
    if (typeof showBossIntro === "function") showBossIntro(enemy, mode);
    return mode;
  },

  onPhase: function (enemy, ph) {
    if (!enemy || (window.Prefs && !Prefs.get("bossMoments"))) return;
    var m = this.getMoment(enemy);
    if (typeof showBossPhase === "function") {
      showBossPhase(enemy, (ph && ph.label) || "change de rythme", m.phase, this.isFullMoment(enemy));
    }
  },

  /* Dernier ennemi du combat tombé, boss ou élite. Trophée à la première victoire, même
     mises en scène coupées (c'est une donnée du joueur, pas un effet). */
  onBossKilled: function (enemy) {
    if (!enemy || !enemy.isBoss) return null;
    var full = this.isFullMoment(enemy);
    var first = !this.hasTrophy(enemy);
    var trophy = null;
    if (first) {
      var allies = [];
      if (window.CompanionManager) {
        CompanionManager.partyIds().forEach(function (id) { var d = getCompanionDef(id); if (d) allies.push(d.name); });
      }
      var w = (window.WORLDS && window.WorldManager) ? WORLDS[Number(WorldManager.worldIndex || 0)] : null;
      trophy = {
        name: this.cleanName(enemy),
        at: Date.now(),
        level: Number(game.heroLevel || 1),
        rounds: Number((game.combatRound && game.combatRound.number) || 0),
        allies: allies,
        worldId: w ? w.id : null,
        image: this.imageOf(enemy) || null,
        elite: !!enemy.isElite
      };
      this.ensure()[this.keyOf(enemy)] = trophy;
      if (typeof addLog === "function") addLog("🏆 Nouveau trophée : " + trophy.name + ".", "event");
    }
    if (full && typeof showBossFinal === "function") showBossFinal(enemy, trophy);
    else if (first && typeof showToast === "function") showToast("🏆 Trophée : " + trophy.name, 1800);
    return trophy;
  },

  /* Trophées dans l'ordre où ils ont été gagnés (Bestiaire). */
  list: function () {
    var t = this.ensure();
    return Object.keys(t).map(function (k) { return Object.assign({ key: k }, t[k]); })
      .sort(function (a, b) { return (a.at || 0) - (b.at || 0); });
  },

  /* Chargement : ne garde que des entrées bien formées. */
  restore: function (raw) {
    var out = {};
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      Object.keys(raw).forEach(function (k) {
        var t = raw[k];
        if (t && typeof t === "object" && typeof t.name === "string") {
          out[k] = { name: t.name, at: Number(t.at || 0), level: Number(t.level || 1), rounds: Number(t.rounds || 0),
            allies: Array.isArray(t.allies) ? t.allies.filter(function (x) { return typeof x === "string"; }) : [],
            worldId: typeof t.worldId === "string" ? t.worldId : null,
            image: typeof t.image === "string" ? t.image : null, elite: !!t.elite };
        }
      });
    }
    game.bossTrophies = out;
    return out;
  }
};

window.BossMomentManager = BossMomentManager;
