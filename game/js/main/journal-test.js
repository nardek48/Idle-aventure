"use strict";
/* main/journal-test.js — v3.437.0 : journal de test, activé dans Paramètres › Appareil (désactivé par défaut).
   Relevé toutes les 5 min de jeu + événements clés, stockés hors sauvegarde ; l'export JSON se compare au banc
   (tools/sim/compare-journal.js). Branché par enveloppes autour des systèmes : aucun fichier protégé modifié. */

var JOURNAL_TEST_KEY = (typeof STORAGE_PREFIX === "string" ? STORAGE_PREFIX : "") + "aethervale_journal_test"; // v3.752.0 : préfixe de l'Alpha
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
    if (!this.isOn() || !window.game || !game.heroId) return; // v3.522.0 : au boot, l'état vide n'est pas encore la partie
    try {
      var lines = this._load();
      lines.push({ t: Date.now(), pt: Math.round(Number(game.playTime || 0)), h: game.heroId || "", type: type, d: data || {} });
      if (lines.length > JOURNAL_TEST_MAX) lines.splice(0, lines.length - JOURNAL_TEST_MAX);
      this._dirty = true;
    } catch (e) { noteErreur("journal-test.log", e); /* le journal ne doit jamais gêner la partie */ }
  },

  flush: function () {
    if (!this._dirty) return;
    try { localStorage.setItem(JOURNAL_TEST_KEY, JSON.stringify(this._lines)); this._dirty = false; } catch (e) { noteErreur("journal-test.flush", e); /* stockage plein : on garde en mémoire */ }
  },

  /* L'état du héros, de quoi situer la partie face au banc. */
  snapshot: function (reason) {
    var g = window.game; if (!g || !g.heroId) return;
    var steps = {};
    try {
      if (window.StoryQuestManager) Object.keys(window.STORY_QUESTS || {}).forEach(function (cid) {
        if (!StoryQuestManager.isChapterOpen(cid)) return;
        var st = StoryQuestManager.getCurrentStep(cid);
        steps[cid] = StoryQuestManager.isChapterCompleted(cid) ? "fini" : (st ? st.id : null);
      });
    } catch (e) { noteErreur("journal-test.snapshot", e); /* lecture seule */ }
    var slots = window.EQUIPMENT_SLOTS || [], equip = {}, forge = {};
    slots.forEach(function (s) {
      var it = g.equipped && g.equipped[s];
      equip[s] = it ? it.rarity : null;
      if (window.ForgeManager) { try { forge[s] = ForgeManager.getLevel(s); } catch (e) { noteErreur("journal-test.snapshot", e); /* forge absente */ } }
    });
    this.log("releve", {
      motif: reason || "temps",
      niv: g.heroLevel, or: Math.floor(g.gold || 0), pv: Math.round(g.heroHp || 0), pvMax: Math.round(g.heroMaxHp || 0),
      monde: window.WorldManager ? WorldManager.worldIndex : null, histoire: steps, equip: equip, forge: forge, mat: this._mats(),
      classe: (window.ClassCombatManager && ClassCombatManager.getCurrentClassId) ? ClassCombatManager.getCurrentClassId() : null
    });
    this._lastSnapPt = Number(g.playTime || 0);
  },

  /* v3.522.0 : mort notée par un crochet, avant que la sortie ne se ferme (le tick la verrait au Campement). */
  logDeath: function (where) {
    if (!where) return;
    this.log("mort", where);
    this._lastHp = 0; // le tick ne la note pas une seconde fois
  },

  /* v3.750.0 : matériaux qui freinent la Forge et les rangs (stock au relevé) */
  _mats: function () {
    var W = window.WarehouseManager, out = {};
    if (!W) return out;
    ["acier", "verre_trempe", "cle_de_voute", "cire_consacree", "obsidienne_taillee", "verre_faille"].forEach(function (k) { try { out[k] = W.getAmount(k); } catch (e) { noteErreur("journal-test._mats", e); /* relevé seulement */ } });
    return out;
  },
  /* v3.750.0 : compagnons présents au départ */
  _groupe: function () { try { return window.CompanionManager ? CompanionManager.partyIds().slice() : []; } catch (e) { return []; } },

  _pvPct: function () { var g = window.game; return Math.round(100 * Number(g.heroHp || 0) / Math.max(1, Number(g.heroMaxHp || 1))); },

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
    if (this._lastHp !== null && this._lastHp > 0 && hp <= 0) this.log("mort", this._where()); // repli : mort hors des crochets
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
    if (JournalTest.isOn()) { try { if (after) after.call(this, r, arguments, ctx); } catch (e) { noteErreur("journal-test.journalWrap", e); /* relevé seulement */ } }
    return r;
  };
  obj[name]._journalOrig = orig; // audit 04/11 (ARCH-15) : l'original reste lisible, sans maquiller toString
}

function initJournalTest() {
  var J = JournalTest, g = function () { return window.game; };

  journalWrap(window.StoryQuestManager, "claimStep",
    function (cid) { var st = StoryQuestManager.getCurrentStep(cid || "forest"); return st ? st.id : null; },
    function (r, a, step) { if (r && step) { J.log("etape", { chapitre: a[0] || "forest", etape: step, niv: g().heroLevel }); J.snapshot("etape"); } });
  journalWrap(window.StoryQuestManager, "recordChoice", null,
    function (r, a) { J.log("choix", { chapitre: a[0], cle: a[1], valeur: a[2] }); });

  journalWrap(window.DungeonManager, "start", null,
    function (r, a) { if (g().dungeonRun && g().dungeonRun.active) J.log("donjon_debut", { id: a[0], marques: a[1] || [], pv0: J._pvPct(), groupe: J._groupe() }); });
  // v3.747.0 (Crypte de Seb) : l'or rapporté par le run, récompense de fin comprise
  journalWrap(window.DungeonManager, "finish",
    function () { return { id: g().dungeonRun ? g().dungeonRun.dungeonId : null, or0: Number(g().gold || 0) }; },
    function (r, a, c) { J.log("donjon_fin", { id: c.id, reussi: !!a[0], vague: a[1], issue: a[2] || (a[0] ? "victoire" : null), or: Math.round(Number(g().gold || 0) - c.or0) }); });

  journalWrap(window.AdventureQuestManager, "start", null,
    function (r, a) { if (g().adventureQuestRun && g().adventureQuestRun.active) J.log("quete_debut", { id: a[0], pv0: J._pvPct(), groupe: J._groupe() }); });
  // v3.750.0 : pourquoi la quête s'arrête (victoire, fuite, mort), PV et rounds du dernier combat
  journalWrap(window.AdventureQuestManager, "forfeit", function () { J._fuite = true; }, function () { J._fuite = false; });
  journalWrap(window.AdventureQuestManager, "finish",
    function () { return { fuite: !!J._fuite, rounds: g().combatRound ? g().combatRound.number : null }; },
    function (r, a, c) { J.log("quete_fin", { id: a[0] && a[0].id, reussi: !!a[1], issue: a[1] ? "victoire" : (c.fuite ? "fuite" : (Number(g().heroHp || 0) <= 0 || g().justDied ? "mort" : "echec")), pv: J._pvPct(), rounds: c.rounds }); });

  // v3.747.0 : rounds du combat ; un boss qui se relève (Varrek) est noté « a_terre », pas vaincu
  journalWrap(window.CombatEngine, "killEnemy",
    function (e) { e = e || g().enemy; return e && (e.isBoss || e.isElite) ? { e: e, d: { nom: e.name || e.id, boss: !!e.isBoss, elite: !!e.isElite, rounds: g().combatRound ? g().combatRound.number : null } } : null; },
    function (r, a, ctx) { if (ctx) { ctx.d.pvPct = J._pvPct(); J.log(ctx.e.downed && Number(ctx.e.hp || 0) > 0 ? "a_terre" : "victoire", ctx.d); } });

  // v3.522.0 : la mort au moment où elle tombe (contexte encore ouvert) ; le Seuil et la Fiole noire relèvent : rien
  journalWrap(window.CombatEngine, "onHeroDefeated",
    function () { return J._where(); },
    function (r, a, where) { if (Number(g().heroHp || 0) <= 0) J.logDeath(where); });
  journalWrap(window.Pa2Run, "_hurt",
    function (run) {
      var n = Pa2Run.node(run && run.at, run), w = J._where();
      w.expedition = run ? run.templateId || true : w.expedition;
      w.ennemi = n && n.type === "boss" ? "boss" : (n && n.foeId) || null; // Petite Aventure : pas de game.enemy
      w.boss = !!(n && n.type === "boss");
      // v3.747.0 : PV avant le coup, coup reçu, gisants réveillés, difficulté du secteur
      w.pvAvant = Math.round(Number(g().heroHp || 0)); w.coup = Math.round(Number(arguments[1] || 0));
      w.reveil = !!(run && run.livingMap && run.livingMap.wake); w.mult = Pa2Run.gisantsMult ? Number(Pa2Run.gisantsMult(run).toFixed(2)) : null;
      return w;
    },
    function (r, a, where) { if (r === false) J.logDeath(where); });

  journalWrap(window.LivingMapManager, "onRunEnd", null,
    function (r, a) { J.log("carte", { carte: a[0], secteur: a[1], issue: a[2] }); });
  journalWrap(window.SceneRunManager, "startRun", null,
    function (r, a) { if (r && r.ok) { var lm = a[1] && a[1].livingMap; J.log("expedition", lm ? { id: a[0], pv0: J._pvPct(), secteur: lm.sectorId, reveil: !!lm.wake } : { id: a[0], pv0: J._pvPct() }); } });
  // v3.737.0 (Seb 07/11) : pourquoi une Petite Aventure s'arrête (dest, ko, retour, renoncement en préparation, fuite)
  var paFin = function (r, a, ctx) { if (ctx) J.log("expedition_fin", { id: ctx.id, issue: ctx.how || (a && a[0]) || null, etape: ctx.status, case: ctx.at }); };
  var paCtx = function () { var run = window.Pa2Run && Pa2Run.getRun(); return run ? { id: run.templateId, status: run.status, at: run.at } : null; };
  journalWrap(window.Pa2Run, "finish", paCtx, function (r, a, ctx) { if (ctx) { ctx.how = a[0]; paFin(r, a, ctx); } });
  journalWrap(window.Pa2Run, "abandon", paCtx, function (r, a, ctx) { if (ctx && r && r.ok) { ctx.how = ctx.status === "pa2-prep" ? "renonce_prep" : "fuite"; paFin(r, a, ctx); } });

  // v3.741.0 (Seb 07/11) : où part l'or — entraînement du héros, rangs de techniques, compagnons (niveaux et rangs de sort)
  var orAvant = function () { return Number(g().gold || 0); };
  var depense = function (type, champs) { return function (r, a, or0) { var d = or0 - Number(g().gold || 0); if (d > 0) J.log(type, Object.assign({ or: d }, champs(a))); }; };
  journalWrap(window, "buyUpgrade", orAvant, depense("entrainement", function (a) { return { id: a[0], n: a[1] || 1 }; }));
  journalWrap(window.SkillRanks, "buy", orAvant, depense("rang_technique", function (a) { return { id: a[0] }; }));
  journalWrap(window.CompanionManager, "buyUpgrade", orAvant, depense("compagnon_niveau", function (a) { return { id: a[0], type: a[1] || null }; }));
  journalWrap(window.CompanionManager, "buySkillRank", orAvant, depense("compagnon_sort", function (a) { return { id: a[0] }; }));
  journalWrap(window.EquipShopManager, "buy",
    function (uid) {
      var it = (g().equipShopStock || []).filter(function (x) { return x.uid === uid; })[0];
      if (!it) return null;
      return it.kind === "relic" ? { relique: it.f, monde: it.w, prix: it.price } : { emplacement: it.slot, rarete: it.rarity, prix: it.price }; // v3.522.0
    },
    function (r, a, it) { var s = (g().equipShopStock || []).filter(function (x) { return x.uid === a[0]; })[0]; if (it && s && s.bought) J.log("achat", it); });
  journalWrap(window.ForgeManager, "reforge",
    function (slot) { return { n: ForgeManager.getLevel(slot), or0: orAvant() }; },
    function (r, a, c) { var n = ForgeManager.getLevel(a[0]); if (n > c.n) J.log("reforge", { emplacement: a[0], niveau: n, or: Math.round(c.or0 - orAvant()) }); });
  journalWrap(window.VillageBuildingManager, "startBuild", orAvant,
    function (r, a, or0) { if (r) J.log("chantier", { batiment: a[0], or: Math.round(or0 - orAvant()) }); });
  // v3.747.0 (Crypte de Seb) : départ et déchargement des caravanes (l'or rapporté)
  journalWrap(window.CaravanManager, "depart", null,
    function (r, a) { if (r) J.log("caravane", { trajet: a[0], monde: typeof a[1] === "number" ? a[1] : null }); });
  journalWrap(window.CaravanManager, "unload", orAvant,
    function (r, a, or0) { if (r) J.log("caravane_retour", { n: r.count || 1, trajet: r.trip || null, or: Math.round(orAvant() - or0) }); });
  journalWrap(window.TalentManager, "buy", null,
    function (r, a) { if (r) J.log("talent", { id: a[0] }); });
  journalWrap(window.PotionManager, "useHealingPotion", null,
    function (r, a) { if (r === true) J.log("potion", { id: a[0] || null, pvPct: Math.round(100 * Number(g().heroHp || 0) / Math.max(1, Number(g().heroMaxHp || 1))) }); });

  // v3.750.0 : préparations de l'Apothicaire (pressée ou non, or payé) et potions achetées en or
  journalWrap(window.ApothecaryManager, "craft",
    function () { return { or0: orAvant(), pressee: !!ApothecaryManager._pressCost }; },
    function (r, a, c) { if (r === true) J.log("preparation", { id: a[0], pressee: c.pressee, or: Math.round(c.or0 - orAvant()) }); });
  journalWrap(window.PotionManager, "buyPotion", orAvant, depense("achat_potion", function (a) { return { id: a[0] }; }));
  journalWrap(window.PotionManager, "buyHealingPotion", orAvant, depense("achat_potion", function (a) { return { id: a[0] }; }));
  // v3.750.0 : changement d'équipement, avec les PV max avant et après
  journalWrap(window.EquipmentManager, "equip",
    function (uid) {
      var it = (g().inventory || []).filter(function (x) { return x.uid === uid; })[0];
      if (!it || !it.slot) return null;
      var old = g().equipped && g().equipped[it.slot];
      return { uid: uid, emplacement: it.slot, avant: old ? old.rarity : null, apres: it.rarity, pvMaxAvant: Math.round(Number(g().heroMaxHp || 0)) };
    },
    function (r, a, c) {
      var now = c && g().equipped && g().equipped[c.emplacement];
      if (!now || now.uid !== c.uid) return;
      J.log("equipement", { emplacement: c.emplacement, avant: c.avant, apres: c.apres, pvMaxAvant: c.pvMaxAvant, pvMaxApres: Math.round(Number(g().heroMaxHp || 0)) });
    });
  // v3.750.0 : objets de combat emportés, puis chaque contre posé (une fois par ennemi et par objet)
  journalWrap(window.CombatItems, "takeForSortie", null,
    function (r) { if (r && r.length) J.log("objets_emportes", { ids: r.slice() }); });
  journalWrap(window.CombatItems, "applyTo", null,
    function (r, a) {
      var e = a[0], it = a[1];
      if (r !== true || !e || !it) return;
      var vus = J._contresVus = J._contresVus || []; // hors de l'ennemi : rien d'ajouté à la sauvegarde
      if (vus.some(function (v) { return v.e === e && v.id === it.id; })) return;
      vus.push({ e: e, id: it.id }); if (vus.length > 40) vus.shift();
      J.log("objet_contre", { id: it.id, ennemi: e.name || e.id || null, round: g().combatRound ? g().combatRound.number : null });
    });

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
