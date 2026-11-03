"use strict";
/* systems/tower-system.js — v3.626.0 : règles propres à la Tour (chapitre VI, Conception Tour v0.1).
   Lot T-1 : la braise d'Aeswyn (choix « braise », étape 5). Lue par VeinSystem.bladeMult / onVictory,
   déjà appelés par le moteur : aucun fichier protégé touché. */

var TOWER_BRAISE_HEAL = 0.05;  // garder : 5 % des PV max rendus par combat gagné à la Tour
var TOWER_BRAISE_DMG = 0.10;   // poser : +10 % de dégâts du héros à la Tour
/* v3.629.0 (lot T-3, TW2) : le miroir. Le Reflet (boss du Sommet interdit) et le Gardien qui répète gardent la
   dernière technique du héros : la même, utilisée juste après contre eux, perd 25 %. Varier garde toute la force. */
var TOWER_MIRROR_PENALTY = 0.25;
/* v3.629.0 (choix « copie », tour_14) : Aeswyn d'avant laissée debout -> le Sommet interdit plus dur et plus riche. */
var TOWER_SUMMIT_HARD = 1.2, TOWER_SUMMIT_LOOT = 2;
/* v3.630.0 (TW6) : le trait que la silhouette prend à chaque classe (un contre connu du Grimoire pour chacun).
   Rôdeur : blindée, pas corruptrice (au banc, la corruption rendait le combat impossible quel que soit le réglage). */
var TOWER_CLASS_ARCHETYPE = { knight: "enraged", ranger: "armored", mage: "silenced" };

var TowerSystem = {
  /* Le héros se bat à la Tour (monde de résidence). */
  atTower: function () {
    var w = window.WORLDS && window.WorldManager ? WORLDS[Number(WorldManager.worldIndex || 0)] : null;
    return !!(w && w.id === "tower");
  },
  braise: function () {
    return (window.StoryQuestManager && typeof StoryQuestManager.getChoice === "function") ? StoryQuestManager.getChoice("braise") : null;
  },
  /* v3.632.0 (Mémoire 21 à 24) : choix de Mémoire porté. */
  mem: function (id) { return !!(window.MemoryManager && MemoryManager.has(id)); },
  memV: function (k) { return Number((window.MEMORY_VALUES || {})[k] || 0); },
  /* Multiplicateur des dégâts du héros : la braise posée sur le palier ; Braise vive ; La forme prêtée (boss, élite). */
  dmgMult: function () {
    if (!this.atTower()) return 1;
    var m = 1 + (this.braise() === "poser" ? TOWER_BRAISE_DMG : 0) + (this.mem("braise_vive") ? this.memV("braise_vive_dmg") : 0);
    var foe = game.enemy;
    if (this.mem("forme_pretee") && foe && (foe.isBoss || foe.isElite)) m += this.memV("forme_pretee_dmg");
    return m;
  },
  /* Ton nom (Mémoire 24) : +10 % de PV max à la Tour, lu par TalentManager.getStatBonuses (recalc au voyage). */
  hpPct: function () { return (this.atTower() && this.mem("ton_nom")) ? this.memV("ton_nom_hp") : 0; },
  /* Le pain d'abord (Mémoire 24) : multiplicateur du soin des rations. */
  rationMult: function () { return this.mem("pain_dabord") ? this.memV("pain_dabord_mult") : 1; },
  /* La redite apprise (Mémoire 22) : durcissement d'un étage raté. */
  rediteMult: function (base) { return this.mem("redite_apprise") ? this.memV("redite_apprise_mult") : base; },
  /* Ce qui se répète (Mémoire 23) : points de chance de Légendaire en plus pour le Gardien qui répète. */
  eliteDropBonus: function (eliteId) { return (eliteId === "gardien_qui_repete" && this.mem("ce_qui_se_repete")) ? this.memV("ce_qui_se_repete_pct") : 0; },
  /* La braise tient (Mémoire 24) : +1 Givre bleu par sortie terminée du Sommet interdit. */
  onDungeonClear: function () {
    var r = game.dungeonRun;
    if (!this.mem("braise_tient") || !r || Number(r.dungeonId) !== 6 || !window.WarehouseManager) return 0;
    var n = this.memV("braise_tient_givre");
    WarehouseManager.addResource("givre_bleu", n, true);
    if (typeof addLog === "function") addLog("🔥 " + _t("La braise tient : +{n} Givre bleu.", { n: n }), "event");
    return n;
  },
  /* Le miroir : la cible garde-t-elle tes gestes ? */
  isMirror: function (foe) {
    if (!foe) return false;
    if (foe.mirror) return true; // v3.630.0 : la silhouette, à partir de sa phase « elle garde tes gestes »
    if (foe.isElite && foe.id === "gardien_qui_repete") return true;
    var r = game.dungeonRun;
    return !!(foe.isBoss && !foe.isElite && r && r.active && Number(r.dungeonId) === 6);
  },
  _foeKey: function (foe) { return foe ? String(foe.uid || foe.id || foe.name || "") : ""; },
  /* Multiplicateur de la technique `slot` : 0,75 si c'est la même que la précédente contre ce reflet. */
  mirrorMult: function (slot) {
    var foe = game.enemy, m = game._towerMirror;
    if (!this.isMirror(foe) || !m || m.slot !== slot || m.foe !== this._foeKey(foe)) return 1;
    return 1 - (this.mem("geste_cache") ? this.memV("geste_cache_penalty") : TOWER_MIRROR_PENALTY); // v3.632.0 : Geste caché
  },
  noteSkill: function (slot) {
    var foe = game.enemy;
    game._towerMirror = this.isMirror(foe) ? { slot: slot, foe: this._foeKey(foe) } : null; // non sauvegardé : propre au combat
  },
  /* Le Sommet interdit selon le choix « copie ». */
  summitLeftStanding: function (dungeon) {
    return !!(dungeon && Number(dungeon.id) === 6 && window.StoryQuestManager && StoryQuestManager.getChoice("copie") === "laisser");
  },
  summitHardMult: function (dungeon) { return this.summitLeftStanding(dungeon) ? TOWER_SUMMIT_HARD : 1; },
  summitLootMult: function (dungeon) { return this.summitLeftStanding(dungeon) ? TOWER_SUMMIT_LOOT : 1; },

  /* v3.630.0 (TW5) : quête ou parcours marqué `solo` en cours -> aucun compagnon (lu par CompanionManager.partyIds). */
  isSolo: function () {
    var q = game.adventureQuestRun, r = game.sceneRun;
    if (q && q.active && q.questId && window.ADVENTURE_QUESTS && ADVENTURE_QUESTS[q.questId] && ADVENTURE_QUESTS[q.questId].solo) return true;
    return !!(r && r.templateId && r.status !== "completed" && window.SCENE_TEMPLATES && SCENE_TEMPLATES[r.templateId] && SCENE_TEMPLATES[r.templateId].solo);
  },
  /* v3.630.0 (TW6) : phases de la silhouette, appelées par BossMomentManager.onPhase. */
  onBossPhase: function (e, ph) {
    if (!e || !ph) return;
    // elle prend le trait de ta classe : posé sur la phase, que checkPhases applique juste après (silence compris)
    if (ph.copyClass) ph.archetype = TOWER_CLASS_ARCHETYPE[game.heroId] || "enraged";
    if (ph.mirror) e.mirror = true;
    if (ph.through) { // la lumière passe à travers elle : le bouclier de boss, tout de suite (round intouchable : plus tard)
      e.shieldTelegraphed = false;
      e.shieldRounds = (typeof BOSS_SHIELD_DURATION_ROUNDS === "number") ? BOSS_SHIELD_DURATION_ROUNDS : 2;
      if (typeof renderEnemyStatusBar === "function") renderEnemyStatusBar();
    }
  },

  /* ---------- v3.631.0 (TW4, lot T-4b) : la Question ----------
     Pente = pôle dominant de chaque axe, choix notés hors `question` ; égalité : le dernier choix de la Tour sur cet axe
     (copie puis braise), sinon Donner / Aeswyn. Trois réponses : la pente sans prix, une bascule par axe avec son prix. */
  pente: function () {
    var axes = window.STORY_CHOICE_AXES || {}, SQ = window.StoryQuestManager, reg = { donner: 0, garder: 0, soi: 0, aeswyn: 0 };
    if (!SQ) return { don: "donner", lieu: "aeswyn" };
    Object.keys(axes).forEach(function (k) {
      if (k === "question") return;
      var v = SQ.getChoice(k);
      ((v != null && axes[k][v]) || []).forEach(function (p) { if (reg[p] != null) reg[p] += 1; });
    });
    function departage(a, b) {
      var ordre = ["copie", "braise"];
      for (var i = 0; i < ordre.length; i++) {
        var v = SQ.getChoice(ordre[i]), poles = (v != null && axes[ordre[i]] && axes[ordre[i]][v]) || [];
        if (poles.indexOf(a) >= 0) return a;
        if (poles.indexOf(b) >= 0) return b;
      }
      return a;
    }
    return {
      don: reg.donner > reg.garder ? "donner" : (reg.garder > reg.donner ? "garder" : departage("donner", "garder")),
      lieu: reg.soi > reg.aeswyn ? "soi" : (reg.aeswyn > reg.soi ? "aeswyn" : departage("aeswyn", "soi"))
    };
  },
  /* Réponse -> axes, et l'inverse. */
  answerOf: function (don, lieu) { return don === "donner" ? (lieu === "soi" ? "sienne" : "aeswyn") : (lieu === "soi" ? "tienne" : "rien"); },
  axesOf: function (value) { var a = (window.STORY_CHOICE_AXES && STORY_CHOICE_AXES.question && STORY_CHOICE_AXES.question[value]) || []; return { don: a[0], lieu: a[1] }; },
  /* Les trois réponses proposées, dans l'ordre : pente, bascule Donner/Garder (Le fil bleu), bascule Soi/Aeswyn (Brannoc). */
  questionAnswers: function () {
    var p = this.pente(), flip = function (x, a, b) { return x === a ? b : a; };
    return [
      { value: this.answerOf(p.don, p.lieu), prix: null },
      { value: this.answerOf(flip(p.don, "donner", "garder"), p.lieu), prix: "fil" },
      { value: this.answerOf(p.don, flip(p.lieu, "soi", "aeswyn")), prix: "brannoc" }
    ];
  },
  /* Prix payé au moment de répondre (gardé dans explorationProgression, déjà sauvegardé). */
  payQuestion: function (value) {
    var ans = this.questionAnswers().filter(function (a) { return a.value === value; })[0];
    var prix = ans ? ans.prix : null, ep = game.explorationProgression || (game.explorationProgression = {});
    ep.questionPrix = prix || "aucun";
    if (prix === "fil") this.takeFilBleu();
    if (prix === "brannoc" && typeof addLog === "function") addLog(_t("Brannoc ne sera pas au dernier feu."), "event");
    return prix;
  },
  /* Le fil bleu quitte l'équipement ou le sac (rien si déjà vendu). */
  takeFilBleu: function () {
    var pris = false, eq = game.equipped || {};
    Object.keys(eq).forEach(function (sl) { if (eq[sl] && eq[sl].eliteId === "fil_bleu") { eq[sl] = null; pris = true; } });
    if (Array.isArray(game.inventory)) {
      var n = game.inventory.length;
      game.inventory = game.inventory.filter(function (it) { return !(it && it.eliteId === "fil_bleu"); });
      if (game.inventory.length !== n) pris = true;
    }
    if (pris && window.EquipmentManager && typeof EquipmentManager.recalcStats === "function") EquipmentManager.recalcStats();
    if (typeof addLog === "function") addLog("🧵 " + _t("Le fil bleu se défait dans ta main. La faille le reprend."), "event");
    return pris;
  },
  /* La fin choisie (clé de TOWER_FINS) ou null. */
  ending: function () { var v = window.StoryQuestManager ? StoryQuestManager.getChoice("question") : null; return (v && window.TOWER_FINS && TOWER_FINS[v]) ? v : null; },
  bannerLine: function () { var f = this.ending(); return f ? _td(TOWER_FINS[f].banniere) : null; },
  /* Planches de la fin, avec la ligne de Brannoc si ce prix a été payé. */
  endingDeck: function () {
    var f = this.ending(); if (!f) return null;
    var d = TOWER_FINS[f], planches = d.planches.map(function (p) { return { img: p.img, lignes: p.lignes.slice(), nom: p.nom }; });
    if ((game.explorationProgression || {}).questionPrix === "brannoc") {
      var last = planches[planches.length - 1];
      last.lignes.splice(last.nom, 0, TOWER_FIN_PRIX.brannoc); last.nom += 1;
    }
    return { num: d.num, eyebrow: _t("Épilogue"), teinte: d.teinte, planches: planches };
  },
  playVision: function (onEnd) { if (window.PrologueView) PrologueView.playDeck({ num: TOWER_VISION.num, eyebrow: TOWER_VISION.num, teinte: TOWER_VISION.teinte, planches: TOWER_VISION.planches }, onEnd); else if (onEnd) onEnd(); },
  playEpilogue: function (onEnd) { var d = this.endingDeck(); if (d && window.PrologueView) PrologueView.playDeck(d, onEnd); else if (onEnd) onEnd(); },

  /* Combat gagné : la braise gardée rend un peu de PV. */
  onVictory: function () {
    // v3.632.0 : Feu couvé (Mémoire 21) s'ajoute à la braise gardée, ou joue seul
    var pct = (this.braise() === "garder" ? TOWER_BRAISE_HEAL : 0) + (this.mem("feu_couve") ? this.memV("feu_couve_heal") : 0);
    if (!this.atTower() || !(pct > 0) || !(game.heroHp > 0)) return 0;
    var max = Number(game.heroMaxHp || 0), heal = Math.min(Math.floor(max * pct), Math.max(0, max - game.heroHp));
    if (heal <= 0) return 0;
    game.heroHp += heal;
    if (typeof renderHeroHp === "function") renderHeroHp();
    if (typeof addLog === "function") addLog("🔥 " + (this.braise() === "garder" ? _t("La braise d'Aeswyn : +{n} PV.", { n: formatNumber(heal) }) : _t("Feu couvé : +{n} PV.", { n: formatNumber(heal) })), "event");
    return heal;
  }
};

window.TowerSystem = TowerSystem;
window.TOWER_BRAISE_HEAL = TOWER_BRAISE_HEAL;
window.TOWER_BRAISE_DMG = TOWER_BRAISE_DMG;
window.TOWER_MIRROR_PENALTY = TOWER_MIRROR_PENALTY;
window.TOWER_CLASS_ARCHETYPE = TOWER_CLASS_ARCHETYPE;
