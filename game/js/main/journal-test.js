"use strict";
/* main/journal-test.js — v3.437.0 : journal de test, activé dans Paramètres › Appareil (désactivé par défaut).
   Relevé toutes les 5 min de jeu + événements clés, stockés hors sauvegarde ; l'export JSON se compare au banc
   (tools/sim/compare-journal.js). Branché par enveloppes autour des systèmes : aucun fichier protégé modifié. */

var JOURNAL_TEST_KEY = "aethervale_journal_test";
var JOURNAL_TEST_MAX = 5000;      // ~150 o par ligne : moins de 1 Mo, loin du quota de l'iPhone
var JOURNAL_TEST_SNAP_S = 300;    // un relevé toutes les 5 min de jeu actif (game.playTime)

var JournalTest = {
  _lines: null,
  _dirty: false,
  _lastSnapPt: -1,
  _lastHp: null,

  isOn: function () { return !!(window.Prefs && Prefs.get("journalTest")); },

  _load: function () {
    if (this._lines) return this._lines;
    var arr = [];
    try { var raw = localStorage.getItem(JOURNAL_TEST_KEY); arr = raw ? JSON.parse(raw) : []; } catch (e) { arr = []; }
    this._lines = Array.isArray(arr) ? arr : [];
    return this._lines;
  },

  count: function () { return this._load().length; },

  /* Une ligne : heure réelle, temps de jeu (s), héros, type, données. Ne lève jamais d'erreur vers le jeu. */
  log: function (type, data) {
    if (!this.isOn() || !window.game) return;
    try {
      var lines = this._load();
      lines.push({ t: Date.now(), pt: Math.round(Number(game.playTime || 0)), h: game.heroId || "", type: type, d: data || {} });
      if (lines.length > JOURNAL_TEST_MAX) lines.splice(0, lines.length - JOURNAL_TEST_MAX);
      this._dirty = true;
    } catch (e) { /* le journal ne doit jamais gêner la partie */ }
  },

  flush: function () {
    if (!this._dirty) return;
    try { localStorage.setItem(JOURNAL_TEST_KEY, JSON.stringify(this._lines)); this._dirty = false; } catch (e) { /* stockage plein : on garde en mémoire */ }
  },

  /* L'état du héros, de quoi situer la partie face au banc. */
  snapshot: function (reason) {
    var g = window.game; if (!g) return;
    var steps = {};
    try {
      if (window.StoryQuestManager) Object.keys(window.STORY_QUESTS || {}).forEach(function (cid) {
        if (!StoryQuestManager.isChapterOpen(cid)) return;
        var st = StoryQuestManager.getCurrentStep(cid);
        steps[cid] = StoryQuestManager.isChapterCompleted(cid) ? "fini" : (st ? st.id : null);
      });
    } catch (e) { /* lecture seule */ }
    var slots = window.EQUIPMENT_SLOTS || [], equip = {}, forge = {};
    slots.forEach(function (s) {
      var it = g.equipped && g.equipped[s];
      equip[s] = it ? it.rarity : null;
      if (window.ForgeManager) { try { forge[s] = ForgeManager.getLevel(s); } catch (e) { /* forge absente */ } }
    });
    this.log("releve", {
      motif: reason || "temps",
      niv: g.heroLevel, or: Math.floor(g.gold || 0), pv: Math.round(g.heroHp || 0), pvMax: Math.round(g.heroMaxHp || 0),
      monde: window.WorldManager ? WorldManager.worldIndex : null, histoire: steps, equip: equip, forge: forge,
      classe: (window.ClassCombatManager && ClassCombatManager.getCurrentClassId) ? ClassCombatManager.getCurrentClassId() : null
    });
    this._lastSnapPt = Number(g.playTime || 0);
  },

  /* Où se trouvait le héros : sert au contexte d'une mort. */
  _where: function () {
    var g = window.game, e = g.enemy;
    return {
      onglet: g.activeTab,
      ennemi: e ? (e.name || e.id || null) : null, boss: !!(e && e.isBoss), elite: !!(e && e.isElite),
      donjon: g.dungeonRun && g.dungeonRun.active ? g.dungeonRun.dungeonId : null,
      quete: g.adventureQuestRun && g.adventureQuestRun.active ? g.adventureQuestRun.questId : null,
      carte: g.livingMaps && g.livingMaps.fight ? g.livingMaps.fight.sectorId : null,
      expedition: (window.SceneRunManager && SceneRunManager.isRunActive() && g.sceneRun) ? (g.sceneRun.templateId || true) : null
    };
  },

  /* Chaque seconde : relevé périodique, mort (PV qui tombent à 0), écriture toutes les 10 s. */
  _tickCount: 0,
  tick: function () {
    if (!this.isOn() || !window.game) return;
    var g = window.game;
    if (this._lastSnapPt < 0 || Number(g.playTime || 0) - this._lastSnapPt >= JOURNAL_TEST_SNAP_S) this.snapshot("temps");
    var hp = Number(g.heroHp || 0);
    if (this._lastHp !== null && this._lastHp > 0 && hp <= 0) this.log("mort", this._where());
    this._lastHp = hp;
    if (++this._tickCount % 10 === 0) this.flush();
  },

  setOn: function (on) {
    if (!window.Prefs) return;
    if (!on) { this.log("journal", { actif: false }); this.flush(); }
    Prefs.set("journalTest", !!on);
    if (on) { this.log("journal", { actif: true, version: (typeof GAME_VERSION === "string" ? GAME_VERSION : "") }); this.snapshot("activation"); this.flush(); }
    if (typeof renderPanel === "function") renderPanel();
  },

  exportFile: function () {
    this.flush();
    var payload = {
      aethervaleJournalTest: 1, version: (typeof GAME_VERSION === "string" ? GAME_VERSION : ""), exporte: Date.now(),
      heros: { id: game.heroId, nom: game.playerName }, lignes: this._load()
    };
    var blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url;
    a.download = "aethervale-journal-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  },

  clear: function () {
    if (!window.confirm(_t("Effacer le journal de test ? Ta partie n'est pas touchée."))) return;
    this._lines = []; this._dirty = true; this.flush();
    if (this.isOn()) this.snapshot("effacement");
    if (typeof renderPanel === "function") renderPanel();
  }
};

/* Enveloppe une méthode d'un système : la méthode d'origine s'exécute toujours, le relevé est
   protégé par try/catch. before() lit l'état avant l'appel, after() reçoit le résultat. */
function journalWrap(obj, name, before, after) {
  if (!obj || typeof obj[name] !== "function") return;
  var orig = obj[name];
  obj[name] = function () {
    var ctx = null;
    if (JournalTest.isOn()) { try { ctx = before ? before.apply(this, arguments) : null; } catch (e) { ctx = null; } }
    var r = orig.apply(this, arguments);
    if (JournalTest.isOn()) { try { if (after) after.call(this, r, arguments, ctx); } catch (e) { /* relevé seulement */ } }
    return r;
  };
  obj[name].toString = function () { return orig.toString(); }; // les contrôles qui lisent le code voient l'original
}

function initJournalTest() {
  var J = JournalTest, g = function () { return window.game; };

  journalWrap(window.StoryQuestManager, "claimStep",
    function (cid) { var st = StoryQuestManager.getCurrentStep(cid || "forest"); return st ? st.id : null; },
    function (r, a, step) { if (r && step) { J.log("etape", { chapitre: a[0] || "forest", etape: step, niv: g().heroLevel }); J.snapshot("etape"); } });
  journalWrap(window.StoryQuestManager, "recordChoice", null,
    function (r, a) { J.log("choix", { chapitre: a[0], cle: a[1], valeur: a[2] }); });

  journalWrap(window.DungeonManager, "start", null,
    function (r, a) { if (g().dungeonRun && g().dungeonRun.active) J.log("donjon_debut", { id: a[0], marques: a[1] || [] }); });
  journalWrap(window.DungeonManager, "finish",
    function () { return g().dungeonRun ? g().dungeonRun.dungeonId : null; },
    function (r, a, id) { J.log("donjon_fin", { id: id, reussi: !!a[0], vague: a[1], issue: a[2] || (a[0] ? "victoire" : null) }); });

  journalWrap(window.AdventureQuestManager, "start", null,
    function (r, a) { if (g().adventureQuestRun && g().adventureQuestRun.active) J.log("quete_debut", { id: a[0] }); });
  journalWrap(window.AdventureQuestManager, "finish", null,
    function (r, a) { J.log("quete_fin", { id: a[0] && a[0].id, reussi: !!a[1] }); });

  journalWrap(window.CombatEngine, "killEnemy",
    function (e) { e = e || g().enemy; return e && (e.isBoss || e.isElite) ? { nom: e.name || e.id, boss: !!e.isBoss, elite: !!e.isElite } : null; },
    function (r, a, ctx) { if (ctx) { ctx.pvPct = Math.round(100 * Number(g().heroHp || 0) / Math.max(1, Number(g().heroMaxHp || 1))); J.log("victoire", ctx); } });

  journalWrap(window.LivingMapManager, "onRunEnd", null,
    function (r, a) { J.log("carte", { carte: a[0], secteur: a[1], issue: a[2] }); });
  journalWrap(window.SceneRunManager, "startRun", null,
    function (r, a) { if (r && r.ok) J.log("expedition", { id: a[0] }); });

  journalWrap(window.EquipShopManager, "buy",
    function (uid) { var it = (g().equipShopStock || []).filter(function (x) { return x.uid === uid; })[0]; return it ? { emplacement: it.slot, rarete: it.rarity, prix: it.price } : null; },
    function (r, a, it) { var s = (g().equipShopStock || []).filter(function (x) { return x.uid === a[0]; })[0]; if (it && s && s.bought) J.log("achat", it); });
  journalWrap(window.ForgeManager, "reforge",
    function (slot) { return ForgeManager.getLevel(slot); },
    function (r, a, avant) { var n = ForgeManager.getLevel(a[0]); if (n > avant) J.log("reforge", { emplacement: a[0], niveau: n }); });
  journalWrap(window.VillageBuildingManager, "startBuild", null,
    function (r, a) { if (r) J.log("chantier", { batiment: a[0] }); });
  journalWrap(window.TalentManager, "buy", null,
    function (r, a) { if (r) J.log("talent", { id: a[0] }); });
  journalWrap(window.PotionManager, "useHealingPotion", null,
    function (r, a) { if (r === true) J.log("potion", { id: a[0] || null, pvPct: Math.round(100 * Number(g().heroHp || 0) / Math.max(1, Number(g().heroMaxHp || 1))) }); });

  // Sessions : ouverture, passage en fond, retour (le temps hors app se lit entre deux lignes)
  if (typeof document !== "undefined" && document.addEventListener) document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") { J.log("session_fin", {}); J.flush(); }
    else J.log("session_debut", { reprise: true });
  });
  if (typeof window.addEventListener === "function") window.addEventListener("pagehide", function () { J.flush(); });
  setTimeout(function () { J.log("session_debut", { reprise: false }); J.snapshot("ouverture"); J.flush(); }, 3000);
  setInterval(function () { J.tick(); }, 1000);
}

window.JournalTest = JournalTest;
initJournalTest();
