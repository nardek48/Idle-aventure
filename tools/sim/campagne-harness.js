"use strict";
/* tools/sim/campagne-harness.js — harnais de CAMPAGNE.
   v3.353.0 : option A (structure) · v3.354.0 : option B (vrais combats, équilibrage, temps).

   Un joueur-robot enchaîne TOUTE l'Histoire, de la création du héros à la dernière étape du
   Désert, dans le vrai moteur (bac à sable VM, comme boot-harness.js). Il fait les vrais gestes
   du joueur : accepter, réclamer, construire, récolter, fabriquer, choisir, jouer les Petites
   Aventures écran par écran. Après chaque étape, la partie est sauvegardée puis RECHARGÉE dans un
   bac à sable neuf (écran titre, « Continuer ») : une étape qui ne survit pas au rechargement
   est un échec. Le temps est simulé : l'horloge avance quand le robot attend.

   OPTION A (par défaut) : les combats sont gagnés d'office. Question : peut-on finir le jeu ?

   OPTION B (--combats) : chaque combat se joue round par round par le moteur (1,5 s par round,
   vitesse ×1). Le héros peut mourir. Le robot joue comme un joueur appliqué, sans plus :
     - combat : Grimoire dès qu'il est ouvert, le bouton mis en avant avant (--tactique : le
       bouton mis en avant tout le jeu, compagnons compris) ; une potion de soin sous 30 % ;
     - avant chaque sortie : PV pleins au feu de camp (le temps passe), potions en poche ;
     - entre deux étapes : meilleur objet porté, talents, échoppe (pièce meilleure < 40 % de la
       bourse), Terrain quand la caractéristique de classe bute, reforge arme/armure, puis
       entraînement (caractéristique de classe et Endurance d'abord) avec 60 % de l'or ;
     - bloqué : il réessaie, et entre deux essais il va se renforcer (lots de Battue) ;
     - toujours bloqué : l'étape est notée MUR, puis rejouée combats gagnés d'office pour
       mesurer la suite.
   Ce qu'il ne fait PAS (un vrai joueur peut faire mieux) : régler le Grimoire au-delà d'une
   règle, jouer les compagnons à la main, l'Enchanteresse, les améliorations de compagnons,
   l'Apothicaire, la Mémoire, renouveler l'échoppe à prix d'or.

   USAGE :
     node tools/sim/campagne-harness.js . [--classe knight|ranger|mage] [--verbose]
     node tools/sim/campagne-harness.js . --combats [--tactique] [--json sortie.json]
   Liste des scripts lue dans index.html (tools/harness/index-scripts.js).
   TRACE_OR=1 : trace l'or et la vitrine pendant la recherche d'équipement Inhabituel. */

var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
var ARGS = process.argv.slice(3);
var CLASSE = (ARGS[ARGS.indexOf("--classe") + 1] && ARGS.indexOf("--classe") >= 0) ? ARGS[ARGS.indexOf("--classe") + 1] : "knight";
var VERBOSE = ARGS.indexOf("--verbose") >= 0;
var COMBATS = ARGS.indexOf("--combats") >= 0;   // option B : vrais combats, rounds du moteur, défaites comprises
var POLICY = ARGS.indexOf("--tactique") >= 0 ? "attentif" : "grimoire";   // B : Grimoire dès qu'il est ouvert (défaut), ou --tactique : le bouton mis en avant, à chaque round
var SERMENT = ARGS.indexOf("--laisser") >= 0 ? "laisser" : "relever";   // desert_11 : relever le Serment (heaume) par défaut
var ELITES_SECONDAIRES = ARGS.indexOf("--sans-elites") < 0;           // les quêtes d'élite du tableau (butin unique)
var INVESTI = ARGS.indexOf("--investi") >= 0;   // B : le joueur bâtit la Forge dès qu'elle ouvre et reforge tout
var FARM_REFORGES = ARGS.indexOf("--farm-reforges") >= 0;   // ancien comportement : farmer les matériaux de toutes les reforges
var ZONES = ARGS.indexOf("--sans-zones") < 0;  // le joueur monte ses zones de production (Mine, Scierie…) ; --sans-zones pour l'ancien profil
var ARME_DESERT = ARGS.indexOf("--arme-desert") >= 0;   // ESSAI (hors jeu) : une arme Inhabituelle du Désert offerte à desert_12
var COMPAGNONS_MALINS = ARGS.indexOf("--compagnons-malins") >= 0;   // --tactique : les compagnons jouent leur choix automatique
// v3.379.0 : banc de la potion automatique — --potion-auto jamais|tard|normal|tot (réglage du Grimoire),
// --sans-potion-main : le joueur absent ne touche jamais la potion (sinon : potion à la main sous 30 %)
var POTION_AUTO = ARGS.indexOf("--potion-auto") >= 0 ? ARGS[ARGS.indexOf("--potion-auto") + 1] : null;
var POTION_MAIN = ARGS.indexOf("--sans-potion-main") < 0;
var RATIONS_CAMP = ARGS.indexOf("--attendre-camp") < 0;   // repas de ration au camp ; --attendre-camp : ancien robot, régénération seule
var JSON_OUT = ARGS.indexOf("--json") >= 0 ? ARGS[ARGS.indexOf("--json") + 1] : null;
/* v3.428.0 (Ruines, U-0) : --avise = un joueur appliqué QUI LIT SON JEU. Le robot d'avant prenait
   la voie de talents offensive et une seule règle de Grimoire : contre un boss Vampirique (Nezzam),
   20 % de réussite, 100 % avec les talents défensifs (rapport U-0 v1.1, §4.4). Ici : voie B des
   talents (celle de plafond-bench.js) et jusqu'à trois règles, chacune tenue par l'action que
   l'éditeur marque comme contre (⚡). Sans l'option, rien ne change : les mesures restent comparables. */
var AVISE = ARGS.indexOf("--avise") >= 0;
/* v3.428.0 : --jusqua <étape> arrête la campagne à l'entrée de cette étape (sauvegarde de test). */
var JUSQUA = ARGS.indexOf("--jusqua") >= 0 ? ARGS[ARGS.indexOf("--jusqua") + 1] : null;
var TALENTS_AVISES = {
  knight: ["k_cuirasse", "k_cuirasse", "k_sang_chaud", "k_elan", "k_curee", "k_colere_froide", "k_brise_os", "k_sentence", "k_soif_bourreau", "k_rancune", "k_garde_vengeresse"],
  archer: ["a_oeil_vif", "a_rythme", "a_souffle_court", "a_pas_de_cote", "a_contre_tir", "a_oeil_vif", "a_transe", "a_danse_ombres", "a_nuee_fleches", "a_tir_ajuste", "a_coup_au_but"],
  mage: ["m_flux", "m_peau_arcane", "m_peau_arcane", "m_barriere_vive", "m_economie", "m_reserve", "m_echo_barriere", "m_surcharge", "m_surtension", "m_braises_tenaces", "m_incendie"]
};
var REGLES_AVISEES = ["enemyRising", "healIncoming", "enemyArmored", "chargeIncoming", "enemySilenceIncoming"];
var RECHARGE_H = ARGS.indexOf("--recharge") >= 0 ? Number(ARGS[ARGS.indexOf("--recharge") + 1]) : null;   // v3.366.0 : banc du délai de recharge des Petites Aventures
var SCRIPTS = require("../harness/index-scripts.js")(ROOT, /pwa\.js/);
var SOURCES = SCRIPTS.map(function (s) { return { name: s, code: fs.readFileSync(path.join(ROOT, s), "utf8") }; });

/* ---------- Horloge simulée ---------- */

var CLOCK = { offset: 0 };
var RealDate = Date;
function FakeDate() {
  var a = Array.prototype.slice.call(arguments);
  if (!(this instanceof FakeDate)) return new RealDate(RealDate.now() + CLOCK.offset).toString();
  return a.length ? new (Function.prototype.bind.apply(RealDate, [null].concat(a)))() : new RealDate(RealDate.now() + CLOCK.offset);
}
FakeDate.now = function () { return RealDate.now() + CLOCK.offset; };
FakeDate.parse = RealDate.parse; FakeDate.UTC = RealDate.UTC;
FakeDate.prototype = RealDate.prototype;

/* ---------- Un lancement de la PWA = un bac à sable neuf ---------- */

var STORAGE = {};
function el() {
  return { style: { setProperty: function () {}, removeProperty: function () {} }, classList: { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } },
    innerHTML: "", textContent: "", value: "", scrollTop: 0, disabled: false, querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    addEventListener: function () {}, setAttribute: function () {}, getAttribute: function () { return null; }, appendChild: function () {}, removeChild: function () {},
    remove: function () {}, hasChildNodes: function () { return false; }, focus: function () {}, dataset: {}, offsetWidth: 0, parentNode: null };
}
function launch() {
  var timers = [];
  var sb = { console: { log: function () {}, warn: function () {}, error: function () { if (VERBOSE) console.error.apply(console, arguments); } },
    Date: FakeDate, Math: Math, JSON: JSON, Object: Object, Array: Array, Number: Number, String: String, Boolean: Boolean,
    setTimeout: function (fn) { timers.push(fn); return timers.length; }, clearTimeout: function () {}, setInterval: function () { return 0; }, clearInterval: function () {},
    requestAnimationFrame: function () {}, performance: { now: function () { return FakeDate.now(); } },
    navigator: { serviceWorker: null, userAgent: "vm", vibrate: function () {} }, location: { href: "", search: "", hash: "", protocol: "https:" },
    localStorage: { getItem: function (k) { return STORAGE.hasOwnProperty(k) ? STORAGE[k] : null; }, setItem: function (k, v) { STORAGE[k] = String(v); }, removeItem: function (k) { delete STORAGE[k]; }, key: function (i) { return Object.keys(STORAGE)[i] || null; }, get length() { return Object.keys(STORAGE).length; } },
    document: { getElementById: function () { return el(); }, querySelector: function () { return null; }, querySelectorAll: function () { return []; }, createElement: function () { return el(); }, addEventListener: function () {}, body: el(), documentElement: el(), hidden: false, activeElement: null, readyState: "complete" },
    alert: function () {}, confirm: function () { return true; }, atob: function (s) { return Buffer.from(s, "base64").toString("binary"); }, btoa: function (s) { return Buffer.from(s, "binary").toString("base64"); },
    structuredClone: function (v) { return JSON.parse(JSON.stringify(v)); }, TextEncoder: TextEncoder, TextDecoder: TextDecoder, URL: URL, Blob: function () {} };
  sb.window = sb; sb.self = sb; sb.globalThis = sb; sb.addEventListener = function () {}; sb.removeEventListener = function () {};
  sb.__timers = timers;
  vm.createContext(sb);
  SOURCES.forEach(function (s) { vm.runInContext(s.code, sb, { filename: s.name }); });
  // v3.379.0 : compteurs du banc des potions (toutes les potions bues, or dépensé en potions de soin)
  var uh = sb.PotionManager.useHealingPotion, bh = sb.PotionManager.buyHealingPotion;
  sb.PotionManager.useHealingPotion = function () { var r = uh.apply(this, arguments); if (r === true) STATS.potionsBues = (STATS.potionsBues || 0) + 1; return r; };
  sb.PotionManager.buyHealingPotion = function () { var o = sb.game.gold; var r = bh.apply(this, arguments); STATS.potionGold = (STATS.potionGold || 0) + Math.max(0, o - sb.game.gold); return r; };
  return sb;
}
/* Minuteries du jeu (setTimeout) : exécutées quand le robot « laisse passer un instant ». */
function flushTimers(g) {
  for (var n = 0; n < 5 && g.__timers.length; n++) {
    var t = g.__timers.splice(0);
    t.forEach(function (fn) { try { if (typeof fn === "function") fn(); } catch (e) { note("minuterie en erreur : " + e.message); } });
  }
}

/* ---------- Journal ---------- */

var passes = 0, failures = 0, notes = [];
function ok(cond, msg) { if (cond) { passes++; console.log("  ✔ " + msg); } else { failures++; console.log("  ✘ " + msg); } return !!cond; }
function note(msg) { notes.push(msg); if (VERBOSE) console.log("    · " + msg); }

/* ---------- Gestes du robot ---------- */

var G = null;   // bac à sable courant

/* Compte les coups spéciaux annoncés (charge, silence, bouclier…) : relevé « pat » de chaque combat. */
var ANNONCES = 0;
function compterAnnonces() {
  var CE = G.CombatEngine, orig = CE && CE.telegraphPattern;
  if (!orig) return;
  CE.telegraphPattern = function () { ANNONCES++; return orig.apply(this, arguments); };
}

function relaunch() {
  G = launch(); compterAnnonces();
  if (RECHARGE_H) G.SceneRunManager.PETITE_AVENTURE_RECHARGE_MS = RECHARGE_H * 3600e3;
  G.startGame();
  G.titleScreenConfirmLoad(Number(G.HeroSlotManager.getActiveSlot()));
  flushTimers(G);
  /* Espion (lecture seule) : quelle porte de sortie a fermé le dernier run. */
  ["_evacuate", "_exhaust", "leaveNow", "abandon"].forEach(function (fn) {
    var orig = G.SceneRunManager[fn];
    G.SceneRunManager[fn] = function () { LAST_END = fn; return orig.apply(this, arguments); };
  });
  [["CombatEngine", "onHeroDefeated"], ["AdventureQuestManager", "forfeit"], ["AdventureQuestManager", "onDefeat"], ["SortieManager", "flee"], ["AdventureQuestManager", "finish"]].forEach(function (p) {
    var obj = G[p[0]], orig = obj[p[1]];
    obj[p[1]] = function () { if (VERBOSE && p[1] !== "finish") note("   → " + p[0] + "." + p[1] + " (PV " + G.game.heroHp + ")"); if (p[1] === "finish" && arguments[1] === false) QUEST_END = "échec"; var ca = G.CombatActors && G.CombatActors.ensure(), rose0 = !!(ca && ca.heroRose);
      var res = orig.apply(this, arguments);
      // « Le seuil » (RiseSystem.tryHeroRise) relève le héros : ce n'est pas une défaite, le run continue
      var rose = p[1] === "onHeroDefeated" && !rose0 && ca && ca.heroRose && G.game.heroHp > 0;
      if (p[1] === "onHeroDefeated" && !rose) DEFEATED = true;
      return res; };
  });
  return G;
}
var LAST_END = null, QUEST_END = null, DEFEATED = false, STOPPED_AT = null;

/* Le temps passe : la production tourne, les chantiers et les ateliers avancent. */
/* kind : cause de l'attente, cumulée dans STATS.attente pour voir où part le temps. */
function wait(ms, kind) {
  CLOCK.offset += ms;
  kind = kind || "autre"; STATS.attente[kind] = (STATS.attente[kind] || 0) + ms;
  var g = G;
  if (g.ProductionManager) g.ProductionManager.catchUpOffline();
  if (g.VillageBuildingManager) g.VillageBuildingManager.tick();
  if (g.CampManager && g.CampManager.applyRegen) g.CampManager.applyRegen(true);
  flushTimers(g);
}

function harvest() { if (G.ProductionManager.harvestAll) G.ProductionManager.harvestAll(); }

/* Gagne le combat en cours, ennemi par ennemi, par le vrai moteur (killEnemy). */
/* ---------- Option B : un combat joué round par round par le vrai moteur ----------
   Mode Grimoire (le choix d'action est celui du joueur absent), vitesse ×1. Le seul geste
   ajouté est celui d'un joueur attentif : une potion de soin sous 30 % de PV.
   Renvoie true si le combat de quête est terminé sans défaite. */
var FIGHT = null, LAST_WAVE = 0;   // étiquette du combat en cours (étape, type)
function fightCombat(maxKills) {
  var g = G, CE = g.CombatEngine, step = g.ROUND_INTERVAL_MS || 1500;
  var auto = POLICY === "grimoire" && g.game.unlockedTabs && g.game.unlockedTabs.grimoire;
  g.game.activeTab = "combat"; g.game.combatMode = auto ? "grimoire" : "tactique";
  var kills = 0, cur = null, rec = null, stall = 0, sig = "";
  DEFEATED = false;
  for (var t = 0; t < 20000; t++) {
    // DEFEATED (espion sur onHeroDefeated) : le feu de camp a pu rendre quelques PV dans la même frame
    if ((g.game.heroHp || 0) <= 0 || DEFEATED) { if (rec) { rec.died = true; closeRec(rec); } STATS.deaths++; flushTimers(g); return false; }
    var e = g.game.enemy;
    if (!e || !g.hasCombatQuestContext()) { if (rec) closeRec(rec); return true; }
    if (e !== cur) {
      if (rec) closeRec(rec);
      cur = e; kills++;
      if (kills > (maxKills || 60) + 1) { note("combat : plus de " + maxKills + " ennemis"); return false; }
      rec = { step: CURRENT_STEP, name: e.name, kind: e.isBoss ? "boss" : (e.isElite ? "élite" : "normal"), hp0: g.game.heroHp / (g.game.heroMaxHp || 1), rounds: 0, potions: 0, died: false, pat0: ANNONCES };
    }
    // v3.433.0 : halte du Sanctuaire — le joueur souffle (dans le jeu, la feuille bloque le combat)
    if (g.DungeonManager && g.DungeonManager.isCampPending && g.DungeonManager.isCampPending()) { g.DungeonManager.campAction("souffler"); STATS.camps = (STATS.camps || 0) + 1; continue; }
    if (POTION_AUTO) g.game.potionAuto = { threshold: POTION_AUTO, keepForBoss: true };
    var ratio = g.game.heroHp / (g.game.heroMaxHp || 1);
    if (POTION_MAIN && ratio < 0.30) {
      var pid = ["potion_soin_majeur", "potion_soin_mineur"].filter(function (id) { return (g.game.healingPotionsOwned || {})[id] > 0; })[0];
      if (pid && CE.isHeroTurnAvailable() && CE.heroAction("potion", pid)) { rec.potions++; STATS.potions++; }
    }
    if (auto) CE.tickRoundClock(step / 1000);
    else if (CE.isHeroTurnAvailable()) {
      // joueur attentif : il touche le bouton que le mode Tactique met en avant
      var acteur = CE.hasManualAllies() ? CE.selectedActor() : null;
      if (acteur && acteur.companionId) {
        // compagnon en Tactique : --compagnons-malins lui fait jouer son choix automatique, sinon l'attaque
        var cs = COMPAGNONS_MALINS ? g.CompanionManager.chooseAction(acteur) : "basic";
        if (!CE.heroAction(cs)) CE.heroAction("basic");
      } else {
        var act = CE.suggestAction();
        if (!(act && act !== "basic" && CE.heroAction(act))) CE.heroAction("basic");
      }
    }
    CLOCK.offset += step; STATS.combatMs += step; rec.rounds++;
    flushTimers(g);
    g.StoryQuestManager._trackKills();
    if (g.game.dungeonRun && g.game.dungeonRun.active) { g.StoryQuestManager._checkNow(); LAST_WAVE = Math.max(LAST_WAVE, Number(g.game.dungeonRun.wave || 0)); }
    if (g.closeBossFinal) g.closeBossFinal();
    var s2 = (g.game.enemy && g.game.enemy.hp) + "|" + g.game.heroHp;
    if (s2 === sig) { if (++stall > 40) { note("combat figé contre " + (e.name || "?") + " — tour " + CE.isHeroTurnAvailable() + ", busy " + g.game.combatRound.busy + ", modale " + (g.isBlockingModalOpen && g.isBlockingModalOpen()) + ", onglet " + g.game.activeTab + ", suggestion " + CE.suggestAction() + ", basic " + CE.heroAction("basic")); return false; } } else { stall = 0; sig = s2; }
  }
  note("combat trop long"); return false;
}
/* Les quêtes d'élite du tableau de missions (butin unique) : un joueur les fait dès qu'elles
   apparaissent. En B, un échec ne bloque rien : il réessaiera à l'étape suivante. */
function elitesDuTableau() {
  var g = G;
  (g.MissionBoard._adventureMissions() || []).filter(function (m) { return m.isElite && m.status === "available"; }).forEach(function (m) {
    var avant = CURRENT_STEP; CURRENT_STEP = "élite " + m.questId;
    var essais0 = STATS.retries[m.questId] || 0;
    var ok2 = playAdventure(m.questId);
    STATS.elites.push({ quest: m.questId, step: avant, ok: ok2, essais: (STATS.retries[m.questId] || 0) - essais0 + 1 });
    CURRENT_STEP = avant;
    if (ok2 && g.closeQuestCompletePopup) g.closeQuestCompletePopup();
  });
  /* Les expéditions du tableau qui ouvrent une zone de production (Scierie, Champs, Mine…) :
     un joueur les fait, sinon son village ne produit jamais le fer de la Forge. */
  (g.MissionBoard._sceneMissions() || []).forEach(function (m) {
    var tid = m.id.replace(/^scene_/, ""), tpl = g.SCENE_TEMPLATES[tid];
    if (!tpl || !tpl.unlockOnSuccess || !tpl.unlockOnSuccess.buildingId || m.status === "running") return;
    var ok3 = playExpedition(tid, function () { return g.SceneRunManager.isQuestCompleted(tid); });
    STATS.elites.push({ quest: tid, step: CURRENT_STEP, ok: ok3, essais: 1 });
  });
}
/* Même ligne que tools/sim/plafond-bench.js (profils de réglage) : comparer le héros de campagne au profil. */
function combatLine() {
  var g = G, E = g.StatsSystem;
  try {
    return "PV " + Math.floor(g.game.heroMaxHp) + " · ATK " + Math.round(E.effectiveTapDamage()) + " · VIT " + Math.round(g.CombatEngine.getTotalCelerity())
      + " · DEF " + Math.round(g.game.heroDefensePct * 100) + " % · CRIT " + E.effectiveCritChance().toFixed(1) + " % ×" + E.effectiveCritMult().toFixed(2)
      + " · Forge " + JSON.stringify((g.game.forge || {}).levels || {}) + " · Wenna +" + ((g.CompanionManager.state("wenna") || {}).upgrades || 0) + " · Maddoc +" + ((g.CompanionManager.state("maddoc") || {}).upgrades || 0)
      + " · équipement " + g.EQUIPMENT_SLOTS.map(function (sl) { var it = g.game.equipped[sl]; return it ? it.rarity.charAt(0) : "-"; }).join("") + " · arme " + ((g.game.equipped.weapon || {}).name || "-") + " " + ((g.game.equipped.weapon || {}).value || "");
  } catch (e) { return "stats illisibles : " + e.message; }
}
function heroSnapshot() {
  var g = G, eq = g.game.equipped || {};
  var tr = (g.HEROS_TRAINING_UPGRADE_IDS || []).map(function (id) { return id.replace("utrain_", "") + "+" + (g.game.upgrades[id] || 0); }).join(" ");
  return "niv. " + g.game.heroLevel + ", " + g.game.heroMaxHp + " PV, or " + Math.floor(g.game.gold) + ", entraînement " + tr
    + ", équipement " + g.EQUIPMENT_SLOTS.map(function (sl) { return eq[sl] ? eq[sl].rarity.charAt(0) : "-"; }).join("")
    + ", talents " + g.TalentManager.spent() + "/" + g.TalentManager.earned() + " (plafond " + g.TalentManager.cap() + ")" + ", potions " + JSON.stringify(g.game.healingPotionsOwned || {}) + ", Terrain " + g.VillageBuildingManager.getLevel("training") + ", Forge " + g.VillageBuildingManager.getLevel("forge") + " (arme +" + g.ForgeManager.getLevel("weapon") + ")";
}
/* B : bloqué, un joueur va se renforcer ailleurs : une battue (or), sinon une chasse, puis
   il repasse à l'échoppe et à l'entraînement. Rien d'autre n'est répétable à volonté. */
function grindOnce(raison) {
  var g = G;
  if (!COMBATS) return false;
  var dispo = (g.MissionBoard._huntMissions() || []).filter(function (m) { return m.status === "available"; }).map(function (m) { return m.questId; });
  var id = dispo.indexOf("hq_desert_battue") >= 0 ? "hq_desert_battue" : (dispo.indexOf("hq_forest_battue") >= 0 ? "hq_forest_battue" : dispo[0]);
  if (!id) { STATS.grindNone[raison] = (STATS.grindNone[raison] || 0) + 1; return false; }
  healUp();
  var t0 = CLOCK.offset, xp0 = g.game.heroLevel, or0 = g.game.gold;
  var q = g.HUNT_QUESTS[id];
  var faim = g.ProvisionsManager && g.ProvisionsManager.check("hunt", q);
  if (faim) {   // vivres de sortie : la ration que dit le refus
    var m = /(\d+) (Petite ration|Ration moyenne|Grande ration)/.exec(faim) || [];
    obtain({ "Petite ration": "petite_ration", "Ration moyenne": "ration", "Grande ration": "grande_ration" }[m[2]] || "petite_ration", Number(m[1] || 1));
    STATS.provisions++;
  }
  g.HuntQuestManager.start(id);
  if (!g.game.huntRun || !g.game.huntRun.active) { note("chasse " + id + " refusée : " + (g.ProvisionsManager && g.ProvisionsManager.check("hunt", q))); return false; }
  winCombat((q.lotSize || 20) + 2);
  if (g.game.huntRun && g.game.huntRun.active) g.HuntQuestManager.stop();
  if (g.closeHuntLotComplete) g.closeHuntLotComplete();
  flushTimers(g);
  STATS.grinds[raison] = (STATS.grinds[raison] || 0) + 1;
  STATS.grindMs += CLOCK.offset - t0;
  var gf = STATS.goldFarm[id] = STATS.goldFarm[id] || { lots: 0, or: 0, h: 0, morts: 0 };
  gf.lots++; gf.or += g.game.gold - or0; gf.h += (CLOCK.offset - t0) / 3600e3; if (DEFEATED) gf.morts++;
  entretien();
  return true;
}
/* B : ce qu'un joueur construit pour sa puissance. Le Terrain quand la caractéristique de classe
   bute au plafond ; la reforge de l'arme et de l'armure quand la Forge est là. Un cran à la fois,
   et seulement si l'or du cran reste raisonnable : le temps de production et de chantier s'écoule. */
function developVillage() {
  var g = G, V = g.VillageBuildingManager, F = g.ForgeManager;
  var main = g.UPGRADES.find(function (x) { return x.id === (MAIN_STAT[g.game.heroId] || "utrain_power"); });
  if (main && (g.game.upgrades[main.id] || 0) >= g.getUpgradeCap(main)) {
    var why = V.getBlockReason("training"), cost = V.getNextCost("training");
    if (cost && (!why || why === "Matériaux manquants" || /^Atelier niveau/.test(why)) && Number(cost.gold || 0) <= g.game.gold * 0.5) {
      var t0 = CLOCK.offset;
      if (upgradeBuilding("training", V.getLevel("training") + 1)) STATS.village.push("Terrain " + V.getLevel("training") + " (" + CURRENT_STEP + ", " + ((CLOCK.offset - t0) / 3600e3).toFixed(1) + " h)");
    }
  }
  /* Forge (profil --investi) : construite dès qu'elle est ouverte, un niveau par passage, jusqu'au
     plafond du monde, si le chantier coûte moins de 50 % de la bourse. */
  if (INVESTI) {
    var wf = V.getBlockReason("forge"), cf = V.getNextCost("forge");
    if (cf && (!wf || wf === "Matériaux manquants" || /^Atelier niveau/.test(wf)) && Number(cf.gold || 0) <= g.game.gold * 0.5) {
      if (upgradeBuilding("forge", V.getLevel("forge") + 1)) STATS.village.push("Forge " + V.getLevel("forge") + " (" + CURRENT_STEP + ")");
    }
  }
  /* Compagnons : une amélioration par compagnon et par passage, si elle coûte moins de 30 % de la bourse. */
  if (g.CompanionManager) ["wenna", "maddoc"].forEach(function (cid) {
    var st = g.CompanionManager.state(cid);
    if (!st || !st.unlocked) return;
    var cc = g.getCompanionUpgradeCost(cid, st.upgrades);
    if (cc != null && cc <= g.game.gold * 0.3 && g.CompanionManager.buyUpgrade(cid)) STATS.village.push(cid + " +" + st.upgrades + " (" + CURRENT_STEP + ")");
  });
  /* --zones : le joueur défriche et monte ses zones de production avec ce qu'il a en stock,
     si l'or du cran coûte moins de 20 % de la bourse. Une action par zone et par passage. */
  if (ZONES && g.ProductionPlotsSystem) g.ProductionPlotsSystem.getManagedBuildingIds().forEach(function (bid) {
    var P = g.ProductionPlotsSystem;
    P.getPlots(bid).forEach(function (pl, i) {
      var cost = pl.state === "locked" ? (P.isPlotRowOpen(i) && g.getProductionPlotUnlockCost(bid, i))
        : (pl.state === "open" && !P.isPlotMaxLevel(pl) && g.getProductionPlotUpgradeCost(bid, pl.level, i));
      if (!cost || Number(cost.gold || 0) > g.game.gold * 0.2) return;
      var r = pl.state === "locked" ? P.unlockPlot(bid, i) : P.upgradePlot(bid, i);
      if (r.ok) STATS.zones = (STATS.zones || 0) + 1;
    });
  });
  /* Forge : l'arme et l'armure d'abord (30 % de la bourse), les autres pièces ensuite (15 %). */
  if (F && F.getBuildingLevel() > 0) g.EQUIPMENT_SLOTS.forEach(function (slot) {
    var why2 = F.getBlockReason(slot), c2 = F.getCost(slot);
    var part = (slot === "weapon" || slot === "armor") ? (INVESTI ? 0.5 : 0.3) : (INVESTI ? 0.3 : 0.15);
    if (!c2 || (why2 && why2 !== "Matériaux manquants") || Number(c2.gold || 0) > g.game.gold * part) return;
    // décision Seb (option A) : les pièces hors arme/armure ne se reforgent qu'avec les matériaux en stock, sans farm
    if (why2 === "Matériaux manquants" && slot !== "weapon" && slot !== "armor" && !FARM_REFORGES) return;
    if (reforgeTo(slot, F.getLevel(slot) + 1)) STATS.village.push("reforge " + slot + " " + F.getLevel(slot) + " (" + CURRENT_STEP + ")");
  });
}
function closeRec(rec) {
  rec.hp1 = Math.max(0, G.game.heroHp / (G.game.heroMaxHp || 1));
  rec.hpLost = Math.max(0, rec.hp0 - rec.hp1);
  rec.pat = ANNONCES - rec.pat0; delete rec.pat0;
  STATS.fights.push(rec);
}

/* Potions en poche avant de partir : 3 mineures, et les majeures quand la bourse le permet. */
function refillPotions() {
  var g = G;
  g.HEALING_POTIONS_DB.forEach(function (P, i) {
    var want = i === 0 ? 3 : 2;
    for (var q = 0; q < want && Number((g.game.healingPotionsOwned || {})[P.id] || 0) < want; q++) {
      if (i > 0 && g.PotionManager.getCost(P) > g.game.gold * 0.15) break;
      var o2 = g.game.gold; g.PotionManager.buyHealingPotion(P.id); if (o2 === g.game.gold) break;
    }
  });
}

/* Soigner avant de repartir : repas au feu de camp (le temps passe), comme un joueur qui attend. */
function healUp(seuil) {
  var g = G;
  if (!SAVING) refillPotions();
  if (g.game.dungeonRun && g.game.dungeonRun.active) return;   // pas de feu de camp en plein donjon (l'onglet figeait le run)
  if ((g.game.heroHp || 0) >= (g.game.heroMaxHp || 1) * (seuil || 0.95)) return;
  g.game.activeTab = "campement";
  g.CampManager.applyRegen(false);
  if (RATIONS_CAMP) mangerAuCamp();
  var min = g.CampManager.getMinutesToFull();
  if (min > 0) { CLOCK.offset += min * 60000 + 1000; STATS.healMs += min * 60000; }
  g.CampManager.applyRegen(false);
  if (g.ProductionManager) g.ProductionManager.catchUpOffline();
  if (g.VillageBuildingManager) g.VillageBuildingManager.tick();
  flushTimers(g);
}

/* Repas au camp, comme un joueur pressé : au-delà de 20 % de PV manquants (4 min d'attente), il mange
   la plus grosse ration qui ne déborde pas trop, en gardant 1 de chaque pour les vivres de sortie ;
   il cuisine des Petites/Moyennes rations avec le stock présent, sans attendre la production. */
var RATION_RESERVE = 1;
function mangerAuCamp() {
  var g = G, CM = g.CampManager, WM = g.WarehouseManager, max = g.game.heroMaxHp || 1;
  var R = STATS.rations = STATS.rations || { mangees: {}, cuisinees: {}, minutesEvitees: 0 };
  function manque() { return 1 - (g.game.heroHp || 0) / max; }
  function choisir() {
    var opts = CM.getRationOptions().filter(function (r) { return r.amount > RATION_RESERVE && r.healPct > 0 && r.healPct <= manque() + 0.10; });
    opts.sort(function (a, b) { return b.healPct - a.healPct; });
    return opts[0] || null;
  }
  function cuisiner() {   // une recette dont les ingrédients sont déjà là, la plus nourrissante d'abord
    var rec = ((g.WORKSHOPS_CONFIG.cuisine_de_camp || {}).recipes || []).filter(function (r) { return r.id !== "grande_ration"; }).reverse();
    for (var i = 0; i < rec.length; i++) {
      var r = rec[i], heal = ((g.WAREHOUSE_RESOURCES || {})[r.id] || {}).healPct || 0;
      if (heal > manque() + 0.10) continue;
      if (!r.inputs.every(function (inp) { return WM.getAmount(inp.resourceId) >= inp.quantity; })) continue;
      if (!g.WorkshopsSystem.enqueueCraft("cuisine_de_camp", r.id, 1)) continue;
      for (var t = 0; t < 10 && g.WorkshopsSystem.getQueue("cuisine_de_camp").length; t++) {
        var resteMs = g.WorkshopsSystem.getQueue("cuisine_de_camp").reduce(function (s, e) { return s + Number(e.msRemaining || 0); }, 0);
        wait(Math.max(1000, resteMs + 1000), "atelier");
      }
      R.cuisinees[r.id] = (R.cuisinees[r.id] || 0) + 1;
      return true;
    }
    return false;
  }
  for (var k = 0; k < 12 && manque() > 0.20; k++) {
    var r = choisir();
    if (!r && cuisiner()) r = choisir();
    if (!r) break;
    var avant = g.game.heroHp || 0;
    if (!CM.eatRation(r.id)) break;
    R.mangees[r.id] = (R.mangees[r.id] || 0) + 1;
    R.minutesEvitees += ((g.game.heroHp || 0) - avant) / (max * CM.getRegenPctPerMin());
  }
}

/* Entre deux étapes, ce que fait un joueur : meilleur objet porté, points de talent, entraînement,
   potions en poche. Seulement en option B (en A, les combats sont gagnés d'office). */
function entretien() {
  var g = G, ORD = g.RARITY_ORDER;
  function score(it) { return it ? ORD.indexOf(it.rarity) * 1000 + Number(it.value || 0) : -1; }
  (g.game.inventory || []).slice().forEach(function (it) {
    if (!it || !it.slot || it.type === "potion") return;
    if (it.slot === "weapon" && !g.isWeaponIconAllowedForCurrentHero(it.icon)) return;
    if (score(it) > score(g.game.equipped[it.slot])) g.EquipmentManager.equip(it.uid);
  });
  if (g.TalentManager) {
    for (var k = 0; k < 30; k++) {
      if (g.TalentManager.available() <= 0) break;
      var nodes = (g.TalentManager.getNodes() || []).map(function (x) { return x.node || x; });
      var n = null;
      if (AVISE) {   // v3.428.0 : la voie B, dans l'ordre, puis n'importe quel talent achetable
        var cls = g.ClassCombatManager.getCurrentClassId(), ordre = TALENTS_AVISES[cls] || [];
        for (var o = 0; o < ordre.length && !n; o++) if (g.TalentManager.canBuy(ordre[o])) n = { id: ordre[o] };
      }
      if (!n) n = nodes.filter(function (x) { return g.TalentManager.canBuy(x.id); })[0];
      if (!n) break; g.TalentManager.buy(n.id);
    }
  }
  if (AVISE) reglesAvisees(g);
  refillPotions();
  if (SAVING) return;
  /* Échoppe : une pièce meilleure que celle portée, si elle coûte moins de 40 % de la bourse. */
  var S = g.EquipShopManager; S.checkRefresh();
  (g.game.equipShopStock || []).slice().sort(function (a, b) { return (g.game.equipped[a.slot] ? 1 : 0) - (g.game.equipped[b.slot] ? 1 : 0); }).forEach(function (it) {
    if (it.bought || !it.slot || it.price > g.game.gold * 0.4) return;
    if (it.slot === "weapon" && !g.isWeaponIconAllowedForCurrentHero(it.icon)) return;
    if (score(it) <= score(g.game.equipped[it.slot])) return;
    if ((g.game.inventory || []).length >= g.getInventoryCap() - 1) (g.game.inventory || []).slice().forEach(function (x) { if (x.slot && score(x) <= score(g.game.equipped[x.slot])) g.EquipmentManager.sell(x.uid); });
    S.buy(it.uid);
    if (it.bought) {
      STATS.shopBuys++;
      var mine = (g.game.inventory || []).filter(function (x) { return x.slot === it.slot && x.name === it.name && x.value === it.value; })[0];
      if (mine) g.EquipmentManager.equip(mine.uid);
    }
  });
  developVillage();
  var budget = g.game.gold * 0.6, avant = g.game.gold;
  for (var j = 0; j < 60 && avant - g.game.gold < budget; j++) { var o = g.game.gold; buyTraining(g, 1, true, true); if (g.game.gold === o) break; }
}

var FORCE = false, SAVING = 0;   // SAVING : le joueur économise pour un objectif, il ne dépense pas en route   // B : une étape murée est rejouée combats gagnés d'office, pour mesurer la suite
function winCombat(maxKills) {
  if (COMBATS && !FORCE) return fightCombat(maxKills);
  var g = G;
  for (var i = 0; i < (maxKills || 60); i++) {
    if (g.DungeonManager.isCampPending && g.DungeonManager.isCampPending()) g.DungeonManager.campAction("souffler"); // v3.433.0
    var e = g.game.enemy;
    if (!e || !g.hasCombatQuestContext()) return true;
    g.game.heroHp = Math.max(g.game.heroHp || 1, g.game.heroMaxHp || 1);
    g.CombatActors.enemies().forEach(function (x) { if (x !== e) return; });
    e.hp = 1; e.maxHp = Math.max(1, e.maxHp || 1);
    try { g.CombatEngine.killEnemy(); } catch (err) { note("killEnemy : " + err.message); return false; }
    g.StoryQuestManager._trackKills();   // ce que fait le rendu après chaque victoire
    if (g.game.dungeonRun && g.game.dungeonRun.active) g.StoryQuestManager._checkNow();   // la vague n'est lue que pendant le run
    flushTimers(g);
    if (g.closeBossFinal) g.closeBossFinal();
  }
  return !g.hasCombatQuestContext();
}

/* Petite Aventure / parcours (Pa2Run) : le robot joue chaque écran au premier geste valable.
   v3.391.0 : les écrans de l'ancien moteur de scènes sont retirés. */
function playScene(maxSteps) {
  var g = G;
  for (var i = 0; i < (maxSteps || 200); i++) {
    var run = g.SceneRunManager.getRun();
    if (!run || run.status === "completed") return true;
    if (!/^pa2-/.test(run.status)) { note("état de scène inconnu : " + run.status); return false; }
    if (!playPa2Step(run)) return false;
    flushTimers(g);
  }
  note("expédition trop longue");
  return false;
}

/* v3.382.0 (PA2-1) : Petite Aventure v2 (la Forêt). Un pas du robot : besace raisonnable,
   route vers une destination, chaque nœud joué comme un joueur prudent (soin sous 40 %). */
function playPa2Step(run) {
  var g = G, P = g.Pa2Run, max = g.game.heroMaxHp, r = { ok: true };
  if (run.status === "pa2-prep") {
    ["petite_ration", "petite_ration", "gourde", "corde", "torche"].forEach(function (id) { P.addItem(id); });
    r = P.depart();
    if (!r.ok && /héros est à terre/.test(r.reason || "")) { if (COMBATS) healUp(1); else g.game.heroHp = max; r = P.depart(); }
    if (!r.ok) { note("Petite Aventure v2 : départ refusé — " + r.reason); return false; }
    return true;
  }
  ["grande_ration", "ration", "petite_ration"].forEach(function (id) { if (g.game.heroHp / max < 0.4 && run.stock[id] > 0) P.useItem(id); });
  if (run.status === "pa2-map") {
    var gp = P.guardianPreview(), bossOk = gp && !gp.tenir.unwinnable && gp.tenir.hpLoss < g.game.heroHp * 0.8;
    var mv = P.openMoves(), dest = mv.filter(function (k) { return P.node(k, run).row === 9 && (bossOk || P.node(k, run).type !== "boss"); });
    r = P.moveTo(dest.length ? dest[0] : mv[Math.floor(Math.random() * mv.length)]);
  } else {
    var n = P.node(run.at, run), t = n.type;
    if (t === "obstacle" || t === "tertre") {
      var o = P.obstacleOptions().filter(function (x) { return x.affordable; }).sort(function (a, b) { return a.thr - b.thr; });
      var rope = P.obstacleOptions().filter(function (x) { return x.rope; })[0];
      if (rope && (!o.length || o[0].thr >= 5)) r = P.resolveObstacle(rope.voie, true);
      else if (o.length) r = P.resolveObstacle(o[0].voie);
      else r = P.bruteForce();
      if (r.ok && r.result) { var ob = STATS.obstacles[r.result.cran || "corde"] = STATS.obstacles[r.result.cran || "corde"] || { ok: 0, rate: 0 }; if (r.result.kind === "ko") ob.rate++; else ob.ok++; }
    } else if (t === "combat" || t === "boss") {
      // v3.383.0 (PA2-3) : comme un joueur, il mange avant un combat qui risque de le coucher.
      ["grande_ration", "ration", "petite_ration"].forEach(function (id) { while (run.stock[id] > 0 && P.combatPreview().tenir.hpLoss * 1.2 >= g.game.heroHp && P.useItem(id).ok) { /* mange */ } });
      if (t === "boss") r = P.fight("tenir");
      else if (run.lastResult && run.lastResult.surprised) r = P.fight("tenir", true);
      else {
        var pv = P.combatPreview();
        if (pv.tenir.verdict === "mortel" && pv.flee.affordable) r = P.flee();
        else if (pv.tenir.verdict === "mortel" && pv.ruse.thr <= 4) r = P.ruse();
        else r = P.fight(pv.charger.hpLoss < g.game.heroHp * 0.3 ? "charger" : "tenir");
      }
    } else if (t === "source") r = P.drink();
    else if (t === "autel") r = P.altar(run.wounds > 0 && (P.altarCost() === 0 || run.loot >= P.altarCost()));
    else if (t === "trouvaille") r = P.takeRelic();
    else if (t === "evenement") r = P.eventChoice(P.hookBranches().filter(function (b) { return b.ok; })[0].id);
    else if (t === "camp" || t === "seuil") r = P.placeAction(g.game.heroHp / max < 0.5 && P._rationInStock(run) ? "cook" : "rest");
    else if (t === "clairiere") r = P.clairiere();
    else { note("Petite Aventure v2 : nœud inconnu " + t); return false; }
  }
  if (!r.ok) { note("Petite Aventure v2 : " + r.reason); return false; }
  var fin = g.game.sceneRun;
  if (fin && fin.status === "completed" && fin.end) LAST_END = "v2 " + fin.end.how + (fin.end.dest ? " " + fin.end.dest : "");
  return true;
}

/* Obtenir `qty` de `res` comme un joueur : récolter ce que les zones produisent, sinon
   fabriquer à l'atelier qui le sait (ingrédients obtenus d'abord, récursivement). Le temps
   passe par pas d'une heure, 72 h au plus : au-delà, la ressource est déclarée introuvable. */
function obtain(res, qty, depth) {
  // Temps passé à obtenir chaque ressource (appel de tête seulement), pour lire où part le temps
  if (!depth) { var t0o = CLOCK.offset, okO = obtainIn(res, qty, 0), dH = (CLOCK.offset - t0o) / 3600e3;
    if (dH > 0) { var oh = STATS.obtainH = STATS.obtainH || {}; oh[res + " (" + CURRENT_STEP + ")"] = (oh[res + " (" + CURRENT_STEP + ")"] || 0) + dH; }
    return okO; }
  return obtainIn(res, qty, depth);
}
function obtainIn(res, qty, depth) {
  var g = G;
  depth = depth || 0;
  if (depth > 6) { note("chaîne de fabrication trop profonde pour " + res); return false; }
  var have = function () { return g.WarehouseManager.getAmount(res); };
  if (have() >= qty) return true;
  // 0. un matériau de monde : il se gagne sur la carte (élite répétable)
  var CARTE = { seve_aeswyn: ["forest", "arbremere"], chitine_profondeurs: ["desert", "bete_dune"] };
  if (CARTE[res]) {
    /* Comme un joueur : élites enchaînées tant que le frein du jour le permet ; refusé ou perdu après
       au moins une victoire du jour, on revient le lendemain (le frein retombe au jour civil). */
    var LMc = g.LivingMapManager, ca = STATS.carte = STATS.carte || { victoires: 0, lendemains: 0, parJour: [] };
    for (var k = 0; k < 60 && have() < qty; k++) {
      var gagnes = LMc.getDailyWins(CARTE[res][0], CARTE[res][1]);
      if (process.env.TRACE_CARTE) console.log("      [carte] " + res + " " + CURRENT_STEP + " victoires du jour " + gagnes + " · frein " + LMc.getBrakeMult(CARTE[res][0], CARTE[res][1]).toFixed(2) + " · " + new RealDate(FakeDate.now()).toDateString());
      if (freeSectorAgain(CARTE[res][0], CARTE[res][1])) { ca.victoires++; continue; }
      if (gagnes <= 0) break;   // perdu sans frein : l'élite est trop forte, pas une question d'attente
      ca.parJour.push(gagnes);
      attendreLendemain();
    }
    if (have() < qty) note(res + " : " + have() + " / " + qty + " après les combats de carte");
    return have() >= qty;
  }
  // 0 bis. v3.433.0 : la Pierre errante (chantier du jour, Sanctuaire, Petite Aventure des Ruines)
  if (res === "pierre_errante") return obtainPierre(qty);
  // 1. une zone de production la donne ?
  var bid = Object.keys(g.PRODUCTION_BUILDINGS).filter(function (id) { return g.PRODUCTION_BUILDINGS[id].resourceKey === res; })[0];
  if (bid) {
    if (!g.ProductionManager.isBuildingUnlocked(bid)) { note(res + " : bâtiment " + bid + " verrouillé"); return false; }
    for (var h = 0; h < 72 && have() < qty; h++) { wait(3600e3, "production"); harvest(); }
    if (have() < qty) note(res + " : " + have() + " / " + qty + " après 72 h de production (plafond de l'Entrepôt ?)");
    return have() >= qty;
  }
  // 2. un atelier la fabrique ?
  var wid = null, recipe = null;
  Object.keys(g.WORKSHOPS_CONFIG).forEach(function (id) {
    (g.WORKSHOPS_CONFIG[id].recipes || []).forEach(function (r) { if (!recipe && r.outputs[0].resourceId === res) { wid = id; recipe = r; } });
  });
  if (!recipe) { note(res + " : ni zone ni atelier ne la produit"); return false; }
  for (var guard = 0; guard < 40 && have() < qty; guard++) {
    var manque = qty - have();
    var fois = Math.max(1, Math.ceil(manque / recipe.outputs[0].quantity));
    var okIng = recipe.inputs.every(function (inp) { return obtain(inp.resourceId, inp.quantity * fois, depth + 1); });
    if (!okIng) { note(res + " : ingrédients introuvables (" + wid + ")"); return false; }
    if (!g.WorkshopsSystem.enqueueCraft(wid, recipe.id, fois)) {
      if (!g.WorkshopsSystem.enqueueCraft(wid, recipe.id, 1)) { note(res + " : l'atelier " + wid + " refuse la fabrication (verrouillé ?)"); return false; }
    }
    // attendre le temps réel de la file (les recettes durent quelques secondes), pas des paliers de 10 min
    for (var t = 0; t < 48 && g.WorkshopsSystem.getQueue(wid).length; t++) {
      var resteMs = g.WorkshopsSystem.getQueue(wid).reduce(function (s, e) { return s + Number(e.msRemaining || 0); }, 0);
      wait(Math.max(1000, resteMs + 1000), "atelier");
    }
  }
  if (have() < qty) note(res + " : " + have() + " / " + qty + " après fabrication");
  return have() >= qty;
}

/* v3.433.0 : des Pierres errantes. D'abord le chantier du jour (+3), puis une sortie au Sanctuaire
   (1 au campement, 2 en fin de run) s'il est ouvert, sinon une Petite Aventure des Ruines. */
function obtainPierre(qty) {
  var g = G, LM = g.LivingMapManager, have = function () { return g.WarehouseManager.getAmount("pierre_errante"); };
  var t0 = CLOCK.offset;
  for (var k = 0; k < 60 && have() < qty; k++) {
    var c = LM.getChantier && LM.getChantier("ruins");
    if (c && c.sectorId && !c.done && LM.canStart("ruins", c.sectorId).ok) { freeSector("ruins", c.sectorId); continue; }
    if (g.DungeonManager.isUnlocked(3)) { if (COMBATS) healUp(); if (playDungeonOnce(3, false) === null) wait(3600e3, "pierre errante"); continue; }
    if (!playExpedition("petite_aventure_ruines", null)) wait(3600e3, "pierre errante");
  }
  STATS.pierreH = (STATS.pierreH || 0) + (CLOCK.offset - t0) / 3600e3;
  if (have() < qty) note("pierre_errante : " + have() + " / " + qty);
  return have() >= qty;
}

/* Lancer une expédition (scene-engine) et la jouer jusqu'au bout. */
function playExpedition(templateId, flag) {
  var g = G;
  for (var essai = 0; essai < 10; essai++) {
    if (flag && flag()) return true;
    var tpl = g.SceneEngine.getTemplate(templateId), cost = tpl && tpl.entryCost;
    if (cost && !obtain(cost.resourceId, Number(cost.amount || 1))) { note(templateId + " : coût d'entrée introuvable (" + cost.resourceId + ")"); return false; }
    LAST_END = null;
    if (COMBATS) healUp();
    var r = g.SceneRunManager.startRun(templateId);
    if (!r.ok && CAP_RE.test(r.reason || "")) { waitCap(); essai--; continue; } // v3.366.0 : recharge, plus le lendemain
    if (!r.ok) { note(templateId + " : départ refusé — " + r.reason); return false; }
    var fini = playScene();
    var fin = g.game.sceneRun || {};
    if (!fini && g.SceneRunManager.isRunActive()) g.SceneRunManager.abandon();
    if (!flag || flag()) return true;
    var pourquoi = LAST_END ? LAST_END + " — " : "";
    pourquoi += fin.exhausted ? "Souffle épuisé" : ((fin.injuries || []).length >= 3 ? "3 blessures" : (g.game.justDied ? "mort" : "arrêt (" + (fini ? "fini" : "robot") + ")"));
    pourquoi += ", profondeur " + fin.depth + "/" + ((fin.card || []).length) + ", Souffle " + fin.breath;
    STATS.expeditionFails.push(templateId + " (" + pourquoi + ")");
    note(templateId + " : essai " + (essai + 1) + " sans succès — " + pourquoi);
    wait(3600e3, "échec à rejouer");
  }
  return !!(flag && flag());
}

/* Libérer un secteur de carte (le premier atteignable, ou celui demandé) : expédition jouée
   écran par écran, ou élite gagnée. Le coût d'entrée est obtenu d'abord. */
var DAYS_WAITED = 0;   // v3.366.0 : nombre d'attentes de recharge (le nom est resté)
var CAP_WAIT_H = 0;    // heures passées à attendre une place de Petite Aventure
var CAP_RE = /aujourd'hui|Prochaine exp/;
/* v3.366.0 : réserve vide — on attend la prochaine place (recharge), pas le lendemain. */
function waitCap() {
  var ms = (G.SceneRunManager.petiteAventureNextInMs && G.SceneRunManager.petiteAventureNextInMs()) || 24 * 3600e3;
  DAYS_WAITED++; CAP_WAIT_H += (ms + 60000) / 3600e3;
  wait(ms + 60000, "recharge");
}
var STATS = { expeditionFails: [], recouvrements: 0, farms: 0, shopBuys: 0, obstacles: {}, sacPlein: 0, secteurs: {}, fights: [], deaths: 0, potions: 0, combatMs: 0, healMs: 0, attente: {}, steps: [], retries: {}, grinds: {}, grindNone: {}, grindMs: 0, provisions: 0, murs: [], village: [], goldFarm: {}, elites: [], d13: [], r09: [], profils: {} };
var D13_FORGE = 3, D13_REFORGE = 4;
var CURRENT_STEP = "création";   // jours attendus à cause du plafond journalier des Petites Aventures
function freeSector(mapId, sectorId) {
  var g = G, LM = g.LivingMapManager;
  var map = LM.getMap(mapId);
  var cible = sectorId || (map.sectors.filter(function (d) { if (LM.isLiberated(mapId, d.id)) return false; var c = LM.canStart(mapId, d.id); return c.ok || !!c.missingResource || CAP_RE.test(c.reason || ""); })[0] || {}).id;
  if (!cible) {
    var raisons = map.sectors.filter(function (d) { return !LM.isLiberated(mapId, d.id); }).map(function (d) { return d.id + " : " + LM.canStart(mapId, d.id).reason; });
    note("carte " + mapId + " : aucun secteur atteignable — " + raisons.slice(0, 3).join(" ; "));
    return false;
  }
  for (var essai = 0; essai < 20 && !LM.isLiberated(mapId, cible); essai++) {
    /* Le chemin d'abord : « Libère d'abord X » → libérer X (récursif). Refait à chaque essai :
       un échec peut rendre un secteur voisin au sable (Recouvrement). */
    for (var hop = 0; hop < 6 && !LM.isLiberated(mapId, cible); hop++) {
      var pre = /Libère d'abord (.+?)\.?$/.exec(LM.canStart(mapId, cible).reason || "");
      if (!pre) break;
      var avant = map.sectors.filter(function (d) { return d.name === pre[1] || pre[1].indexOf(d.name) >= 0; })[0];
      if (avant && LM.isLiberated(mapId, avant.id)) break;
      STATS.recouvrements++;
      if (!avant || !freeSector(mapId, avant.id)) { note("chemin vers " + cible + " : " + pre[1] + " non libéré"); return false; }
    }
    var cs = LM.canStart(mapId, cible);
    if (!cs.ok && cs.missingResource) obtain(cs.missingResource, 1);
    if (!cs.ok && /PV/.test(cs.reason || "")) { if (COMBATS) healUp(1); else g.game.heroHp = g.game.heroMaxHp; }
    if (COMBATS) healUp();
    var r = LM.start(mapId, cible);
    if (!r.ok && CAP_RE.test(r.reason || "")) { waitCap(); r = LM.start(mapId, cible); }
    if (!r.ok && /Petite ration/.test(r.reason || "")) { obtain("petite_ration", 1); r = LM.start(mapId, cible); }
    if (!r.ok) { note("secteur " + cible + " : " + r.reason); wait(3600e3, "échec à rejouer"); continue; }
    LAST_END = null;
    if (g.SceneRunManager.isRunActive()) { if (!playScene() && g.SceneRunManager.isRunActive()) g.SceneRunManager.abandon(); }
    else winCombat();
    flushTimers(g);
    var ss = STATS.secteurs[mapId] = STATS.secteurs[mapId] || { essais: 0, liberes: 0 };
    ss.essais++; if (LM.isLiberated(mapId, cible)) ss.liberes++;
    if (!LM.isLiberated(mapId, cible)) {
      var fr = g.game.sceneRun || {};
      STATS.expeditionFails.push(cible + " (" + (LAST_END || "?") + ", profondeur " + fr.depth + ", Souffle " + fr.breath + ", blessures " + (fr.injuries || []).length + ")");
      note("secteur " + cible + " : essai " + (essai + 1) + " sans libération (" + LAST_END + ")");
      // élite répétable déjà battue aujourd'hui : le frein reste, un joueur revient le lendemain
      if (LM.isRepeatable(mapId, cible) && LM.getDailyWins(mapId, cible) > 0) attendreLendemain(); else wait(3600e3, "échec à rejouer");
    }
  }
  return LM.isLiberated(mapId, cible);
}

/* Donjon : une Marque au moins si demandé, toutes les vagues gagnées. */
function playDungeon(id, withMark, goal) {
  var g = G;
  goal = goal || function () { return !!(g.game.dungeonTierCleared || {})[id]; };
  for (var essai = 0; essai < 15; essai++) {
    if (goal()) return true;
    if (COMBATS) healUp();
    LAST_WAVE = 0; var nf = STATS.fights.length;
    var r = playDungeonOnce(id, withMark);
    if (r === null) return false;
    if (!goal()) { STATS.retries["donjon " + id] = (STATS.retries["donjon " + id] || 0) + 1; var der = STATS.fights[STATS.fights.length - 1] || {}; note("donjon " + id + " : essai " + (essai + 1) + " sans l'objectif, vague " + LAST_WAVE + " atteinte, tombé contre " + der.kind + " " + der.name + " (" + der.rounds + " rounds)" + (VERBOSE ? " — PV : " + STATS.fights.slice(nf).map(function (f) { return Math.round(f.hp0 * 100) + (f.potions ? "p" : "") + (f.died ? "†" : ""); }).join(" ") + " → " + Math.round((der.hp1 || 0) * 100) + ", fin " + g.game.heroHp : "")); }
    if (!goal() && essai >= 1) for (var gr = 0; gr < 3; gr++) grindOnce("donjon " + id);
  }
  return goal();
}
function playDungeonOnce(id, withMark) {
  var g = G, D = g.DungeonManager;
  if (!D.isUnlocked(id)) { note("donjon " + id + " verrouillé : " + D.getLockReason(id)); return null; }
  var marks = [];
  if (withMark) {
    var m = (g.DUNGEON_MARKS || []).filter(function (x) { return D.isMarkUnlocked(x.id, id); })[0];
    if (m) marks.push(m.id); else note("donjon " + id + " : aucune Marque disponible");
  }
  /* v3.358.0 (D7) : plus de tickets. Sorties du jour épuisées : on attend le renouvellement. */
  if (!D.hasRunLeft(id)) {
    var attente = Math.max(60e3, (g.game.dungeonTicketResetTime || 0) - FakeDate.now() + 1000);
    wait(attente, "donjon"); D.checkTicketReset(); STATS.attenteDonjonH = (STATS.attenteDonjonH || 0) + attente / 3600e3;
  }
  D.start(id, marks);
  if (!g.game.dungeonRun.active) { note("donjon " + id + " : entrée refusée (sorties restantes " + D.getRunsLeft(id) + ")"); return null; }
  winCombat(200);
  flushTimers(g);
  if (process.env.TRACE_SORTIE) console.log("      [donjon " + id + "] run actif " + !!g.game.dungeonRun.active + " · sortie active " + g.SortieManager.isActive() + " · halte " + D.isCampPending() + " · vague " + g.game.dungeonRun.wave + " · PV " + Math.floor(g.game.heroHp));
  if (g.closeDungeonSummary) g.closeDungeonSummary();
  return !!(g.game.dungeonTierCleared || {})[id];
}

/* Rejouer une élite répétable de carte (ou la libérer la première fois). */
function freeSectorAgain(mapId, sectorId) {
  var g = G, LM = g.LivingMapManager;
  if (!LM.isLiberated(mapId, sectorId)) return freeSector(mapId, sectorId);
  var cs = LM.canStart(mapId, sectorId);
  var pre = /Libère d'abord (.+?)\.?$/.exec(cs.reason || "");
  if (pre) {   // le chemin a été repris par le sable : le rouvrir d'abord
    var avant = LM.getMap(mapId).sectors.filter(function (d) { return d.name === pre[1] || pre[1].indexOf(d.name) >= 0; })[0];
    STATS.recouvrements++;
    if (!avant || !freeSector(mapId, avant.id)) { note("chemin vers " + sectorId + " : " + pre[1] + " non libéré"); return false; }
    cs = LM.canStart(mapId, sectorId);
  }
  if (!cs.ok && cs.missingResource) obtain(cs.missingResource, 1);
  if (COMBATS) healUp(); else g.game.heroHp = g.game.heroMaxHp;
  var r = LM.start(mapId, sectorId);
  if (!r.ok && /Vivres/.test(r.reason || "")) {       // vivres de sortie : une ration, comme le dit le refus
    var m = /(\d+) (Petite ration|Ration moyenne|Grande ration)/.exec(r.reason) || [];
    obtain({ "Petite ration": "petite_ration", "Ration moyenne": "ration", "Grande ration": "grande_ration" }[m[2]] || "petite_ration", Number(m[1] || 1));
    r = LM.start(mapId, sectorId);
  }
  if (!r.ok) { note(sectorId + " rejoué : " + r.reason); return false; }
  winCombat();
  // v3.429.0 : combat d'élite pas fini (élite trop forte pour ce farm) : le joueur fuit, sinon la carte reste bloquée
  if (LM.getFight()) { if (g.SortieManager && g.SortieManager.flee) g.SortieManager.flee(); if (LM.getFight()) LM.abandonFight(); return false; }
  return true;
}

/* v3.428.0 (ruines_04) : une caravane Courte au Marché des Ruines, attendue puis déchargée.
   La Halle se bâtit au prix d'Histoire si elle manque ; la cargaison vient de la production. */
function caravaneMarcheRuines(g) {
  var C = g.CaravanManager;
  if (!C.isAvailable()) upgradeBuilding("hall", 1);
  if (!C.isAvailable()) { note("Halle marchande introuvable : " + g.VillageBuildingManager.getLevel("hall")); return; }
  var m = C.getMarkets().filter(function (x) { return x.world === 2; })[0];
  if (!m) { note("Marché des Ruines absent : " + JSON.stringify(C.getMarkets())); return; }
  for (var essai = 0; essai < 6 && !g.storyDesertFlag("ruinsMarketDone"); essai++) {
    if (C.get() && C.isBack()) C.unload();
    if (C.get()) { wait(Math.max(60e3, C.getSecondsLeft() * 1000 + 1000), "caravane"); continue; }
    harvest();   // un joueur récolte avant de charger : la caravane ne prend que le surplus de l'Entrepôt
    var why = C.getBlockReason("court");
    if (why) { note("caravane : " + why); wait(2 * 3600e3, "caravane"); continue; }
    C.depart("court", m.world);
    wait(Math.max(60e3, C.getSecondsLeft() * 1000 + 1000), "caravane");
    if (C.isBack()) C.unload();
  }
}

/* Étape à choix : sur la carte (secteur à libérer d'abord) ou sur la carte d'étape. Premier choix. */
function choiceStep(g, step) {
  var c = step.choice;
  if (!c) { note("étape sans choix déclaré"); return; }
  if (c.mapId && !g.LivingMapManager.isLiberated(c.mapId, c.sectorId)) freeSector(c.mapId, c.sectorId);
  var val = c.options[0].value;
  if (c.options.some(function (o) { return o.value === SERMENT; })) val = SERMENT;
  if (!g.storyMakeChoice(step.chapterId || (c.mapId === "desert" || /desert/.test(step.id) ? "desert" : (/ruines/.test(step.id) ? "ruins" : "forest")), val)) note("choix refusé (" + c.key + ")");
}

/* Le secteur qui porte la descente au Temple. */
function templeSector(g) {
  var map = g.LivingMapManager.getMap("desert");
  var d = map.sectors.filter(function (x) { return x.firstContent || /temple|porte/i.test(x.id + " " + x.name); })[0];
  return d && d.id;
}

/* Offrande d'une étape (braises, Veilleur) : réunir chaque ingrédient, puis offrir. */
function offer(g, cid) {
  var info = g.StoryQuestManager.getOfferingInfo(cid);
  if (!info) { note("aucune offrande attendue"); return false; }
  info.items.forEach(function (it) { obtain(it.id, it.need); });
  if (!g.StoryQuestManager.offerToEmbers(cid)) { note("offrande refusée : " + JSON.stringify(g.StoryQuestManager.getOfferingInfo(cid).items.map(function (i) { return i.id + " " + i.have + "/" + i.need; }))); return false; }
  return true;
}

/* Lancer une quête d'aventure et la gagner. */
function playAdventure(id) {
  var g = G;
  for (var essai = 0; essai < 10; essai++) {
    if (g.game.adventureQuestsCompleted[id]) return true;
    if (COMBATS) healUp();
    g.AdventureQuestManager.start(id);
    if (!g.game.adventureQuestRun.active) { note("quête " + id + " : départ refusé"); return false; }
    var nf = STATS.fights.length;
    var fin = winCombat(80);
    flushTimers(g);
    if (!g.game.adventureQuestsCompleted[id] && COMBATS) {
      var fs2 = STATS.fights.slice(nf);
      note("   " + (fin ? "combat fini" : "combat perdu") + ", " + fs2.length + " ennemis (" + fs2.map(function (f) { return f.name + " " + Math.round(f.hp0 * 100) + "→" + Math.round((f.hp1 || 0) * 100) + (f.died ? "†" : ""); }).join(", ") + "), run actif " + !!g.game.adventureQuestRun.active + ", ennemi " + (g.game.enemy && g.game.enemy.name) + ", PV " + Math.round(g.game.heroHp) + "/" + g.game.heroMaxHp);
    }
    if (!g.game.adventureQuestsCompleted[id]) { STATS.retries[id] = (STATS.retries[id] || 0) + 1; note("quête " + id + " : essai " + (essai + 1) + " perdu"); if (essai >= 1) for (var gr = 0; gr < 3; gr++) grindOnce(id); }
  }
  return !!g.game.adventureQuestsCompleted[id];
}

/* ---------- La campagne ---------- */

function run() {
  // Premier lancement, création du héros
  G = launch(); compterAnnonces();
  if (RECHARGE_H) G.SceneRunManager.PETITE_AVENTURE_RECHARGE_MS = RECHARGE_H * 3600e3;
  G.startGame();
  G.titleScreenNewGame();
  G.pendingHeroId = CLASSE; G.pendingPlayerName = "Robot";
  G.confirmHeroSelection();
  flushTimers(G);
  if (typeof G.init === "function" && !G.game.lastSave) { /* init déjà passé par la confirmation */ }
  ok(G.game.playerName === "Robot" && G.game.heroId, "héros créé (" + G.game.heroId + ")");
  G.saveGame();

  var chapters = ["forest", "desert", "ruins"]; // v3.428.0 : chapitre III ; v3.433.0 : ses 20 étapes
  var t0 = Date.now();
  for (var c = 0; c < chapters.length; c++) {
    var cid = chapters[c];
    for (var guard = 0; guard < 40; guard++) {
      relaunch();
      if (!G.StoryQuestManager.isChapterOpen(cid)) { ok(false, cid + " : le chapitre ne s'ouvre pas"); return; }
      if (G.StoryQuestManager.isChapterCompleted(cid)) break;
      var step = G.StoryQuestManager.getCurrentStep(cid);
      if (!step) { ok(false, cid + " : pas d'étape courante"); return; }
      if (JUSQUA && step.id === JUSQUA) { STOPPED_AT = step.id; ok(true, "arrêt à l'entrée de " + step.id); return; }
      var avant = notes.length;
      CURRENT_STEP = step.id;
      // v3.423.0 : TRACE_FORCE=1 relève la force du héros à chaque étape (référence des ajustements de difficulté)
      if (process.env.TRACE_FORCE) console.log("  [force] " + step.id + " monde " + G.WorldManager.worldIndex + " aventure " + G.WorldManager.adventureIndex + " niv. " + G.game.heroLevel + " dmg " + Math.round(G.CombatForecast.getHeroDamagePerRound()) + " ehp " + Math.round(G.CombatForecast.getHeroEffectiveHp ? G.CombatForecast.getHeroEffectiveHp() : G.game.heroMaxHp));
      if (COMBATS && /^(desert_12|desert_15|desert_17|forest_14|forest_15|ruines_01|ruines_02|ruines_03|ruines_11|ruines_13|ruines_15|ruines_19)$/.test(step.id)) { STATS.profils[step.id] = combatLine(); console.log("  ◦ héros à l'entrée de " + step.id + " : " + STATS.profils[step.id]); if (process.env.TRACE_FORGE) console.log("     forge armure : " + G.ForgeManager.getBlockReason("armor") + " " + JSON.stringify(G.ForgeManager.getCost("armor")) + " or " + Math.floor(G.game.gold)); }
      var t0s = { h: CLOCK.offset, c: STATS.combatMs, s: STATS.healMs, d: STATS.deaths, j: DAYS_WAITED, e: (STATS.secteurs.desert || {}).essais || 0 };
      var snap0 = snapTemps();
      G.StoryQuestManager.acceptStep(cid);
      var solver = SOLVERS[step.id];
      if (!solver) { ok(false, step.id + " « " + step.title + " » : aucun geste connu pour « " + step.objectiveLabel + " »"); return; }
      step.chapterId = cid;
      try { solver(G, step); } catch (e) { note("exception : " + e.message + " " + String(e.stack).split("\n")[1]); }
      G.StoryQuestManager._checkNow(true);
      var pret = G.StoryQuestManager.isCurrentStepReady(cid);
      if (!pret && COMBATS) {
        note("héros : " + heroSnapshot());
        STATS.murs.push({ step: step.id, title: step.title, objective: step.objectiveLabel, hero: heroSnapshot(), notes: notes.slice(avant).filter(function (n) { return !/^   /.test(n); }).slice(0, 6) });
        console.log("  ▲ MUR " + step.id + " « " + step.title + " » — " + heroSnapshot());
        FORCE = true;
        try { solver(G, step); } catch (e2) { note("exception (forcé) : " + e2.message); }
        FORCE = false;
        G.StoryQuestManager._checkNow(true);
        pret = G.StoryQuestManager.isCurrentStepReady(cid);
      }
      if (!ok(pret, step.id + " « " + step.title + " »" + (pret ? "  · " + (CLOCK.offset / 3600e3).toFixed(1) + " h, niv. " + G.game.heroLevel : "" ) + (pret ? "" : " — BLOQUÉE : « " + step.objectiveLabel + " » " + notes.slice(avant).join(" | ")))) return;
      G.StoryQuestManager.claimStep(cid);
      flushTimers(G);
      if (G.closeQuestCompletePopup) G.closeQuestCompletePopup();
      STATS.steps.push({ id: step.id, title: step.title, h: (CLOCK.offset - t0s.h) / 3600e3, combatH: (STATS.combatMs - t0s.c) / 3600e3, healH: (STATS.healMs - t0s.s) / 3600e3,
        deaths: STATS.deaths - t0s.d, capDays: DAYS_WAITED - t0s.j, sorties: ((STATS.secteurs.desert || {}).essais || 0) - t0s.e, level: G.game.heroLevel, gold: Math.floor(G.game.gold), totalH: CLOCK.offset / 3600e3 });
      if (ARME_DESERT && step.id === "desert_12") {
        // Essai de réglage, pas une donnée du jeu : l'arme de Mar (sauvegarde du 23/09), à l'icône de la classe
        var icons = G.getAllowedWeaponIconsForCurrentHero() || ["sword"];
        G.addLootToInventory({ uid: "itm_essai_desert", slot: "weapon", name: "Arme du Désert (essai)", icon: icons[0], rarity: "green", stat: "tapDmg", value: 45, worldIndex: 1, affixes: [{ stat: "tapMult", value: 0.12, tier: "P" }] });
        G.EquipmentManager.equip("itm_essai_desert");
      }
      if (ELITES_SECONDAIRES) elitesDuTableau();
      if (COMBATS) entretien();
      // temps complet de l'étape, y compris ce qui suit la récompense (élites du tableau, entretien)
      var stRec = STATS.steps[STATS.steps.length - 1]; stRec.temps = diffTemps(snap0, snapTemps()); stRec.apresH = stRec.temps.total - stRec.h;
      G.saveGame();
    }
    ok(true, "chapitre " + cid + " terminé");
  }
}

/* Retour au jour civil suivant (le frein des élites répétables retombe). */
function attendreLendemain() {
  var ca = STATS.carte = STATS.carte || { victoires: 0, lendemains: 0, parJour: [] }; ca.lendemains++;
  var now = FakeDate.now(), d = new RealDate(now);
  wait(new RealDate(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - now + 60e3, "carte : lendemain");
}

/* Où part le temps : combat, soin au camp et chaque cause d'attente (heures). */
function snapTemps() { return { t: CLOCK.offset, c: STATS.combatMs, s: STATS.healMs, a: JSON.parse(JSON.stringify(STATS.attente)) }; }
function diffTemps(a, b) {
  var r = { total: (b.t - a.t) / 3600e3, parts: { combat: (b.c - a.c) / 3600e3, "soin au camp": (b.s - a.s) / 3600e3 } };
  Object.keys(b.a).forEach(function (k) { var v = (b.a[k] - (a.a[k] || 0)) / 3600e3; if (v > 0) r.parts[k] = v; });
  return r;
}
function topParts(parts, n, min) {
  return Object.keys(parts).filter(function (k) { return parts[k] >= (min || 0.05); }).sort(function (x, y) { return parts[y] - parts[x]; }).slice(0, n)
    .map(function (k) { return k + " " + parts[k].toFixed(1); }).join(" · ");
}

/* ---------- Un geste par étape (réels, par l'API que les boutons appellent) ---------- */

/* Équipe la meilleure pièce du sac pour chaque emplacement vide. */
function equipAll(g) {
  (g.game.inventory || []).slice().forEach(function (it) {
    if (it && it.uid && it.slot && !g.game.equipped[it.slot]) { try { g.EquipmentManager.equip(it.uid); } catch (e) { note("équiper : " + e.message); } }
  });
}

/* Achète un niveau d'entraînement (le moins cher des cinq). */
var MAIN_STAT = { knight: "utrain_power", ranger: "utrain_celerity", mage: "utrain_will" };
function buyTraining(g, n, silent, focus) {
  var ids = g.HEROS_TRAINING_UPGRADE_IDS || ["utrain_power", "utrain_endurance", "utrain_celerity", "utrain_precision", "utrain_will"];
  // B : un joueur monte d'abord sa caractéristique de classe et l'Endurance, le reste ensuite
  if (focus) {
    var prio = [MAIN_STAT[g.game.heroId] || "utrain_power", "utrain_endurance"].filter(function (id) {
      var u = g.UPGRADES.find(function (x) { return x.id === id; });
      return u && (g.game.upgrades[id] || 0) < g.getUpgradeCap(u);
    });
    if (prio.length) ids = prio;
  }
  for (var k = 0; k < (n || 1); k++) {
    var best = null, bestCost = Infinity;
    ids.forEach(function (id) {
      var u = g.UPGRADES.find(function (x) { return x.id === id; });
      var lvl = g.game.upgrades[id] || 0;
      if (!u || lvl >= g.getUpgradeCap(u)) return;
      var c = g.getUpgradeCost(u, lvl);
      if (c < bestCost) { best = id; bestCost = c; }
    });
    if (!best) { if (!silent) note("entraînement au plafond"); return; }
    if (g.game.gold < bestCost) { if (!silent) note("or insuffisant pour l'entraînement (" + g.game.gold + " / " + bestCost + ")"); return; }
    g.buyUpgrade(best, 1);
  }
}


/* ---------- Farm : l'or et le butin viennent des élites répétables (comme un joueur) ---------- */
function farmOnce() {
  var g = G, LM = g.LivingMapManager;
  var cibles = [];
  ["desert", "forest"].forEach(function (mid) {
    var map = LM.getMap(mid); if (!map) return;
    map.sectors.forEach(function (d) { if (LM.isLiberated(mid, d.id) && LM.isRepeatable(mid, d.id)) cibles.push([mid, d.id]); });
  });
  if (!cibles.length) { if (COMBATS && grindOnce("farm")) return true; note("aucune élite répétable pour farmer"); return false; }
  STATS.farms++;
  var c = cibles[0];
  var ok = freeSectorAgain(c[0], c[1]);
  if (!ok && COMBATS && grindOnce("farm")) return true; // v3.429.0 : l'élite résiste, on farme ailleurs
  if (!ok) wait(3600e3, "échec à rejouer");
  return ok;
}

function ensureGold(n) {
  var g = G;
  SAVING++;
  for (var k = 0; k < 300 && g.game.gold < n; k++) if (!farmOnce() && k > 5) break;
  SAVING--;
  if (g.game.gold < n) note("or insuffisant : " + Math.floor(g.game.gold) + " / " + n);
  return g.game.gold >= n;
}

function ensureCost(cost) {
  var g = G, ok = true;
  Object.keys(cost || {}).forEach(function (k) {
    if (k === "gold") return;
    var have = g.WarehouseManager.getAmount(k);
    if (have < cost[k] && !obtain(k, cost[k])) ok = false;
  });
  if (cost && cost.gold && !ensureGold(cost.gold)) ok = false;
  return ok;
}

/* La chaîne d'ouverture de l'Atelier de Construction (bois, planches, pierre), bannière par bannière. */
function workshopChain() {
  var g = G, W = g.WorkshopUnlockManager, BESOIN = { harvest_wood: ["bois", 10], craft_planks: ["planche", 5], harvest_stone: ["pierre", 15] };
  for (var k = 0; k < 8 && !W.isWorkshopVisible(); k++) {
    var st = g.WORKSHOP_UNLOCK_STEPS[g.game.workshopUnlock.currentStep];
    var b = st && BESOIN[st.id];
    if (b) obtain(b[0], b[1] + (b[0] === "planche" ? g.WarehouseManager.getAmount("planche") : 0));
    W.checkCurrentStep();
  }
  if (!W.isWorkshopVisible()) note("chaîne de l'Atelier bloquée à l'étape " + g.game.workshopUnlock.currentStep);
  return W.isWorkshopVisible();
}

/* Bâtiment du village jusqu'au niveau voulu : matériaux, chantier, attente. */
function upgradeBuilding(id, target) {
  var g = G, V = g.VillageBuildingManager;
  for (var k = 0; k < 20 && V.getLevel(id) < target; k++) {
    if (V.isBuilding()) { wait(V.getSiteSecondsLeft() * 1000 + 1000, "chantier"); V.tick(); continue; }
    var why = V.getBlockReason(id);
    if (why === "Objectif en cours" && id === "workshop") { if (!workshopChain()) return false; continue; }
    var rang = /^Atelier niveau (\d+)/.exec(why || "");
    if (rang) { if (!upgradeBuilding("workshop", Number(rang[1]))) return false; continue; }
    if (why === "Matériaux manquants") { if (!ensureCost(V.getNextCost(id))) return false; why = V.getBlockReason(id); }
    if (why) { note(id + " niveau " + (V.getLevel(id) + 1) + " : " + why); return false; }
    V.startBuild(id);
    wait(V.getSiteSecondsLeft() * 1000 + 1000, "chantier"); V.tick();
  }
  return V.getLevel(id) >= target;
}

/* Reforge d'un emplacement jusqu'au niveau voulu. */
function reforgeTo(slot, target) {
  var g = G, F = g.ForgeManager;
  for (var k = 0; k < 20 && F.getLevel(slot) < target; k++) {
    var why = F.getBlockReason(slot);
    if (why === "Matériaux manquants") { if (!ensureCost(F.getCost(slot))) return false; why = F.getBlockReason(slot); }
    if (why) { note("reforge " + slot + " " + (F.getLevel(slot) + 1) + " : " + why); return false; }
    F.reforge(slot);
  }
  return F.getLevel(slot) >= target;
}

/* N emplacements d'une rareté au moins (dont l'arme si demandé) : sac, puis échoppe, puis farm. */
function gearRarity(rarity, n, needWeapon) {
  var g = G, ORD = g.RARITY_ORDER, min = ORD.indexOf(rarity);
  function good(it) { return it && ORD.indexOf(it.rarity) >= min && (it.slot !== "weapon" || g.isWeaponIconAllowedForCurrentHero(it.icon)); }
  var vus = { armes: 0, armesVertes: 0, armesVertesClasse: 0 };
  function compte(list, ou) { (list || []).forEach(function (it) { if (it && it.slot === "weapon" && !it._vu) { it._vu = 1; vus.armes++; if (ORD.indexOf(it.rarity) >= min) { vus.armesVertes++; if (g.isWeaponIconAllowedForCurrentHero(it.icon)) { vus.armesVertesClasse++; (vus.detail = vus.detail || []).push(ou + (it.price ? " " + it.price + " or (bourse " + Math.floor(g.game.gold) + ")" : "")); } } } }); }
  function done() {
    var slots = g.EQUIPMENT_SLOTS.filter(function (s) { return good(g.game.equipped[s]); });
    return slots.length >= n && (!needWeapon || slots.indexOf("weapon") >= 0);
  }
  SAVING++;
  for (var k = 0; k < 120 && !done(); k++) {
    (g.game.inventory || []).slice().forEach(function (it) {
      if (good(it) && it.slot && !good(g.game.equipped[it.slot])) g.EquipmentManager.equip(it.uid);
    });
    if (done()) break;
    compte(g.game.inventory, "sac");
    /* Sac plein : l'échoppe refuse d'acheter. Le joueur vide ce qui ne sert pas. */
    if ((g.game.inventory || []).length >= g.getInventoryCap() - 1) {
      STATS.sacPlein++;
      (g.game.inventory || []).slice().forEach(function (it) { if (!good(it)) g.EquipmentManager.sell(it.uid); });
    }
    var S = g.EquipShopManager; S.checkRefresh(); compte(g.game.equipShopStock, "échoppe");
    (g.game.equipShopStock || []).forEach(function (it) {
      if (!it.bought && good(it) && !good(g.game.equipped[it.slot]) && g.game.gold >= it.price) { S.buy(it.uid); if (it.bought) STATS.shopBuys++; else note("achat refusé : " + it.name); }
    });
    (g.game.inventory || []).slice().forEach(function (it) {
      if (good(it) && it.slot && !good(g.game.equipped[it.slot])) g.EquipmentManager.equip(it.uid);
    });
    if (done()) break;
    var orAvant = g.game.gold;
    /* Un joueur fait d'abord ses sorties du jour dans les donjons qui donnent cette rareté (un run
       complet en garantit une pièce) ; l'échoppe et le farm ne viennent qu'ensuite. */
    var dj = [3, 2].filter(function (id) { var t = g.DungeonManager.getById(id); return t && g.DungeonManager.isUnlocked(id) && g.DungeonManager.hasRunLeft(id) && ORD.indexOf(t.maxRarity) >= min; })[0];
    if (dj) {
      var vivres = g.ProvisionsManager && g.ProvisionsManager.getRequirement("dungeon", g.DungeonManager.getById(dj));
      if (vivres) obtain(vivres.resourceId, vivres.amount);   // vivres de sortie, comme le dit le refus
      if (COMBATS) healUp();
      var used0 = g.DungeonManager.getRunsUsed(dj);
      playDungeonOnce(dj, false);
      if (g.DungeonManager.getRunsUsed(dj) > used0) { STATS.donjonsEquipement = (STATS.donjonsEquipement || 0) + 1; continue; }
      // entrée refusée malgré tout : on ne boucle pas sans que le temps passe, échoppe et farm prennent le relais
    }
    // v3.433.0 : le Rare se trouve au Sanctuaire (butin de fin de run, et sac de la sortie)
    if (rarity === "rare" && g.DungeonManager.isUnlocked(3)) { if (COMBATS) healUp(); if (playDungeonOnce(3, false) === null) farmOnce(); }
    else farmOnce();
    if (process.env.TRACE_OR) console.log("      [or] " + Math.floor(orAvant) + " → " + Math.floor(g.game.gold) + " (farm) · équipé " + g.EQUIPMENT_SLOTS.map(function (s) { var it = g.game.equipped[s]; return s + ":" + (it ? it.rarity : "-"); }).join(",") + " · vitrine " + (g.game.equipShopStock || []).map(function (it) { return it.slot + "/" + it.rarity + "/" + it.price + (it.bought ? "✓" : ""); }).join(" ") + " · sac " + (g.game.inventory || []).length);
    wait(2 * 3600e3, "échoppe");   // le joueur repasse à l'échoppe quelques heures plus tard
  }
  SAVING--;
  STATS.armes = vus;
  if (!done()) note("armes vues " + JSON.stringify(vus) + " ; équipement " + rarity + " : " + g.EQUIPMENT_SLOTS.filter(function (s) { return good(g.game.equipped[s]); }).join(", "));
  return done();
}

var SOLVERS = {
  forest_01: function () {},
  forest_02: function (g) { playAdventure("aq_story_premier_sang"); },
  forest_03: function (g) {
    if (!(g.game.inventory || []).length && !Object.keys(g.game.equipped || {}).some(function (k) { return g.game.equipped[k]; })) note("aucun équipement dans le sac après « Premier sang »");
    equipAll(g); buyTraining(g, 1);
  },
  forest_04: function (g) {
    var p = g.HEALING_POTIONS_DB[0];
    if (g.game.gold < g.PotionManager.getHealingCost ? 0 : 0) {}
    g.PotionManager.buyHealingPotion(p.id);
    if (!g.storyHasShopPurchase(g.game)) g.PotionManager.buyPotion(g.POTIONS_DB[0].id);
    if (!g.storyHasShopPurchase(g.game)) note("achat impossible, or : " + g.game.gold);
  },
  forest_05: function (g) { playAdventure("aq_forest_expedition"); },
  forest_06: function (g) { playAdventure("hq_wolf_pack"); },
  forest_07: function (g) { playExpedition("source_tarie", function () { return g.storyExplorationDone("driedSpring"); }); },
  forest_08: function (g) {
    obtain("petite_ration", 1);
    playExpedition("sentier_obstrue", function () { return g.storyExplorationDone("blockedPath"); });
  },
  forest_09: function (g) { playExpedition("veine_instable", function () { return g.storyExplorationDone("unstableVein"); }); },
  forest_brume: function (g) { freeSector("forest"); },
  forest_crossing: function (g) { playAdventure("aq_story_lisiere"); },
  forest_11: function (g) {
    var fait = g.TalentManager.getNodes().some(function (n) { return g.TalentManager.canBuy(n.node.id) && g.TalentManager.buy(n.node.id); });
    if (!fait) note("aucun talent achetable (points : " + g.game.talentPoints + ")");
  },
  forest_12: function (g) {
    activateGrimoireRule(g);
    if (!g.storyCountActiveGrimoireRules(g.game)) note("règle du Grimoire non active : " + JSON.stringify(g.game.grimoireRules[0]));
    if (!playAdventure("aq_story_coeur")) note("« Tenir le Cœur » non terminée : " + JSON.stringify(g.game.adventureQuestProgress.aq_story_coeur || {}) + " run=" + JSON.stringify(g.game.adventureQuestRun));
  },
  forest_13: function (g) { playDungeon(1, true, function () { g.StoryQuestManager._checkNow(true); return g.StoryQuestManager.isCurrentStepReady("forest"); }); },
  forest_14: function (g) { if (!(g.game.dungeonTierCleared || {})[1]) playDungeon(1, false); },
  forest_15: function (g) {
    playAdventure("aq_forest_depths");
    offer(g, "forest");
  },
  desert_01: function (g) { playExpedition("traversee_desert", function () { return g.storyDesertFlag("desertCrossingCompleted"); }); },
  desert_02: function (g) { playAdventure("aq_desert_dunes"); },
  desert_03: function (g) {
    obtain("outre_pleine", 1);
    if (!g.storyDesertFlag("outreFilled")) note("Outre pleine en stock mais drapeau outreFilled absent");
    playExpedition("petite_aventure_desert", function () { return g.storyDesertFlag("desertPaCompleted"); });
  },
  desert_04: function (g) { for (var i = 0; i < 4 && g.storyDesertSectorsFreed() < 2; i++) freeSector("desert"); },
  desert_05: choiceStep,
  desert_06: function (g, step) { freeSector("desert", (step.link && step.link.sectorId) || templeSector(g)); },
  desert_07: function (g) { offer(g, "desert"); },
  desert_08: function (g, step) { choiceStep(g, step); playAdventure("aq_desert_gouffre"); },
  desert_09: function (g) { obtain("verre_trempe", 1); },
  desert_10: function (g) { playAdventure("aq_desert_nuee"); },
  desert_11: choiceStep,
  desert_12: function (g) { playDungeon(2, false, function () { return g.storyCiteWave5(g.game); }); },
  desert_13: function (g) {
    // chaque morceau du palier est chronométré (temps simulé, or dépensé)
    function part(nom, fn) {
      var t0 = CLOCK.offset, o0 = g.game.gold, farm0 = STATS.grindMs;
      var verts0 = g.EQUIPMENT_SLOTS.filter(function (s2) { var it = g.game.equipped[s2]; return it && g.RARITY_ORDER.indexOf(it.rarity) >= 1; }).length;
      fn();
      STATS.d13.push({ part: nom, h: (CLOCK.offset - t0) / 3600e3, farmH: (STATS.grindMs - farm0) / 3600e3, verts0: verts0, orAvant: Math.floor(o0), orApres: Math.floor(g.game.gold) });
    }
    part(g.STORY_PALIER_PIECES + " Inhabituels dont l'arme", function () { gearRarity("green", g.STORY_PALIER_PIECES, true); });
    part("Forge " + g.STORY_PALIER_FORGE, function () { upgradeBuilding("forge", g.STORY_PALIER_FORGE); });
    part("reforge arme " + g.STORY_PALIER_REFORGE, function () { reforgeTo("weapon", g.STORY_PALIER_REFORGE); });
  },
  desert_14: function (g) { freeSector("desert", "bete_dune"); },
  desert_15: function (g) { if (!(g.game.dungeonTierCleared || {})[2]) playDungeon(2, false); },
  // v3.364.0 (acte IV) : la remontée du fleuve, Nezzam, le choix du roi (« prendre » par défaut, --rapporter sinon)
  desert_16: function (g) { playExpedition("remontee_fleuve", function () { return g.storyDesertFlag("remonteeFleuveDone"); }); },
  desert_17: function (g) { playAdventure("aq_desert_trone"); },
  // v3.428.0 (Ruines, acte I)
  ruines_01: function (g) { playExpedition("traversee_ruines", function () { return g.storyDesertFlag("ruinsCrossingCompleted"); }); },
  ruines_02: function (g) { playAdventure("aq_ruines_couloirs"); },
  ruines_03: function (g, step) {
    choiceStep(g, step);
    if (!g.storyEddaInParty()) note("Edda n'est pas du groupe : " + JSON.stringify(g.CompanionManager.partyIds()));
    playAdventure("aq_ruines_edda");
  },
  ruines_04: function (g) { caravaneMarcheRuines(g); },
  ruines_05: function (g) {
    var val = ARGS.indexOf("--rapporter") >= 0 ? "aeswyn" : "soi";
    if (!g.storyMakeChoice("ruins", val)) note("choix refusé (seuil)");
  },
  // v3.429.0 (Ruines, acte II)
  ruines_06: function (g) { playExpedition("petite_aventure_ruines", function () { return g.storyDesertFlag("ruinsPaCompleted"); }); },
  ruines_07: function (g) { for (var i = 0; i < 5 && g.storyRuinsSectorsFreed() < 2; i++) freeSector("ruins"); },
  ruines_08: function (g) { playAdventure("aq_ruines_batisseur"); },
  ruines_09: function (g) {
    var P = g.STORY_PALIER_RUINES;
    function part(nom, fn) {
      var t0 = CLOCK.offset, o0 = g.game.gold, farm0 = STATS.grindMs;
      fn();
      STATS.r09.push({ part: nom, h: (CLOCK.offset - t0) / 3600e3, farmH: (STATS.grindMs - farm0) / 3600e3, orAvant: Math.floor(o0), orApres: Math.floor(g.game.gold) });
    }
    part(P.pieces + " Inhabituels", function () { gearRarity("green", P.pieces, true); });
    part("reforge arme " + P.reforge, function () { reforgeTo("weapon", P.reforge); });
    part("reforge armure " + P.reforge, function () { reforgeTo("armor", P.reforge); });
  },
  ruines_10: function (g) { playAdventure("aq_ruines_salle"); },
  // v3.433.0 (Ruines, actes III et IV)
  ruines_11: function (g) { freeSector("ruins", "porte_sanctuaire"); },
  ruines_12: function (g) { playDungeon(3, false, function () { return g.storySanctuaireCamp(g.game); }); },
  ruines_13: function (g) {
    var P = g.STORY_PALIER_RUINES_RARE;
    function part(nom, fn) {
      var t0 = CLOCK.offset, o0 = g.game.gold, farm0 = STATS.grindMs;
      fn();
      (STATS.r13 = STATS.r13 || []).push({ part: nom, h: (CLOCK.offset - t0) / 3600e3, farmH: (STATS.grindMs - farm0) / 3600e3, orAvant: Math.floor(o0), orApres: Math.floor(g.game.gold) });
    }
    part(P.pieces + " Rares", function () { gearRarity("rare", P.pieces, true); });
    part("Forge " + P.forge, function () { upgradeBuilding("forge", P.forge); });
    part("reforge arme " + P.reforge, function () { reforgeTo("weapon", P.reforge); });
  },
  ruines_14: function (g, step) { playAdventure("aq_ruines_golem"); choiceStep(g, step); },
  ruines_15: function (g) { if (!(g.game.dungeonTierCleared || {})[3]) playDungeon(3, false); },
  ruines_16: function (g) {
    var d = g.LivingMapManager.getSectorDef("ruins", "coeur");
    for (var i = 0; i < 8 && g.storyCoeurVoisins() < 3; i++) {
      var id = d.neighbors.filter(function (n) { return !g.LivingMapManager.isLiberated("ruins", n); })[0];
      if (!id || !freeSector("ruins", id)) wait(3600e3, "échec à rejouer");
    }
  },
  ruines_17: function (g) { playExpedition("vers_le_coeur", function () { return g.storyDesertFlag("versLeCoeurDone"); }); },
  ruines_18: function (g) { playAdventure("aq_ruines_coeur"); },
  ruines_19: function (g) { playAdventure("aq_ruines_plan"); },
  ruines_20: function (g) {
    var val = ARGS.indexOf("--tomber") >= 0 ? "tomber" : "finir";
    if (!g.storyMakeChoice("ruins", val)) note("choix refusé (plan)");
  },
  desert_18: function (g, step) {
    var val = ARGS.indexOf("--rapporter") >= 0 ? "aeswyn" : "soi";
    if (!g.storyMakeChoice("desert", val)) note("choix refusé (roi)");
  },
  forest_wenna: function (g) {
    // trois combats avec Wenna : l'Arbre-mère se rejoue, sinon une quête de chasse
    if (!g.CompanionManager.partyIds().length) note("Wenna n'est pas dans le groupe : " + JSON.stringify(g.CompanionManager.state("wenna")));
    for (var i = 0; i < 6 && g.storyCounter(g.game, "companionWins") < 3; i++) {
      if (!(COMBATS && grindOnce("forest_wenna")) && !freeSectorAgain("forest", "arbremere")) break;
    }
  }
};

/* v3.428.0 (--avise) : jusqu'à trois règles, par les fonctions de l'éditeur. Chaque condition est
   tenue par l'action marquée ⚡ (contre) si l'éditeur en propose une, sinon par la première
   compétence. Rejoué à chaque entretien : un emplacement de plus s'ouvre aux Ruines. */
function reglesAvisees(g) {
  if (!g.game.unlockedTabs || !g.game.unlockedTabs.grimoire) return;
  g.ensureGrimoireRules();
  var places = g.getGrimoireSlotCount(g.game.worldsEverReached), i = 0;
  REGLES_AVISEES.forEach(function (cond) {
    if (i >= places) return;
    if (cond === "enemyRising" && !(g.game.worldsEverReached || {})[2]) return;
    var html = g.buildGrimoireActionOptionsHTML(g.getGrimoireCurrentKit(), null, cond);
    var opts = (html.match(/<option value="([^"]+)"[^>]*>([^<]*)/g) || []).map(function (o) {
      var m = /value="([^"]+)"[^>]*>([^<]*)/.exec(o); return { v: m[1], counter: m[2].indexOf("\u26a1") === 0 };
    });
    var pick = opts.filter(function (o) { return o.counter; })[0] || (cond === "enemyRising" ? opts.filter(function (o) { return o.v !== "defense"; })[0] : null);
    if (!pick) return;
    g.setGrimoireRuleCondition(i, cond);
    g.setGrimoireRuleAction(i, pick.v);
    i++;
  });
}

/* Une règle du Grimoire, par les fonctions de l'éditeur (condition, puis action). */
function activateGrimoireRule(g) {
  if ((g.game.grimoireRules || []).some(function (r) { return r && r.conditionId && r.actionSlot; })) return;
  g.ensureGrimoireRules();
  g.setGrimoireRuleCondition(0, g.GRIMOIRE_CONDITION_ORDER[0]);
  // la liste que propose l'écran (premier choix non vide du menu déroulant)
  var html = g.buildGrimoireActionOptionsHTML(g.getGrimoireCurrentKit(), null, g.GRIMOIRE_CONDITION_ORDER[0]);
  var vals = (html.match(/value="([^"]+)"/g) || []).map(function (v) { return v.slice(7, -1); }).filter(Boolean);
  if (!vals.length) note("Grimoire : aucune action proposée");
  g.setGrimoireRuleAction(0, vals[0]);
}

try { run(); }
catch (e) { ok(false, "interrompu : " + e.message + "\n" + String(e.stack).split("\n").slice(1, 4).join("\n")); }
if (COMBATS) {
  console.log("Renforcement (lots de chasse joués pour débloquer) : " + JSON.stringify(STATS.grinds) + " · " + (STATS.grindMs / 3600e3).toFixed(1) + " h" + (Object.keys(STATS.grindNone).length ? " · rien à farmer pendant : " + JSON.stringify(STATS.grindNone) : ""));
  Object.keys(STATS.goldFarm).forEach(function (k) { var f = STATS.goldFarm[k]; console.log("Farm " + k + " : " + f.lots + " lots, " + Math.round(f.or / Math.max(1, f.lots)) + " or par lot, " + Math.round(f.or / Math.max(0.01, f.h)) + " or par heure (soin compris), " + f.morts + " morts"); });
  if (STATS.r13 && STATS.r13.length) console.log("ruines_13 : " + STATS.r13.map(function (d) { return d.part + " " + d.h.toFixed(0) + " h (farm " + d.farmH.toFixed(0) + " h, or " + d.orAvant + " → " + d.orApres + ")"; }).join(" · ") + " · Pierres errantes cherchées : " + (STATS.pierreH || 0).toFixed(0) + " h · campements : " + (STATS.camps || 0));
  if (STATS.obtainH) console.log("Temps d'obtention (h) : " + Object.keys(STATS.obtainH).filter(function (k) { return STATS.obtainH[k] >= 1; }).map(function (k) { return k + " " + STATS.obtainH[k].toFixed(0); }).join(" · "));
  if (STATS.r09 && STATS.r09.length) console.log("ruines_09 : " + STATS.r09.map(function (d) { return d.part + " " + d.h.toFixed(0) + " h (farm " + d.farmH.toFixed(0) + " h, or " + d.orAvant + " → " + d.orApres + ")"; }).join(" · "));
  if (STATS.d13.length) console.log("desert_13 : " + STATS.d13.map(function (d) { return d.part + " " + d.h.toFixed(0) + " h (farm " + d.farmH.toFixed(0) + " h, Inhabituels portés au départ " + d.verts0 + ", or " + d.orAvant + " → " + d.orApres + ")"; }).join(" · "));
  console.log("Quêtes d'élite : " + (STATS.elites.map(function (e) { return e.quest + (e.ok ? " ✔" : " ✘") + " (" + e.step + ", " + e.essais + " essai" + (e.essais > 1 ? "s" : "") + ")"; }).join(" · ") || "aucune"));
  console.log("Village pour la puissance : " + (STATS.village.join(" · ") || "rien"));
  console.log("Morts : " + STATS.deaths + " · potions bues : " + STATS.potions + " à la main, " + (STATS.potionsBues || 0) + " en tout · or en potions : " + (STATS.potionGold || 0) + " · temps de combat : " + (STATS.combatMs / 3600e3).toFixed(1) + " h · temps de soin au camp : " + (STATS.healMs / 3600e3).toFixed(1) + " h");
  if (STATS.rations) console.log("Rations au camp : mangées " + JSON.stringify(STATS.rations.mangees) + " · cuisinées " + JSON.stringify(STATS.rations.cuisinees) + " · attente évitée " + (STATS.rations.minutesEvitees / 60).toFixed(1) + " h");
  if (VERBOSE) STATS.fights.slice(-12).forEach(function (f) { console.log("    " + f.step + " · " + f.kind + " " + f.name + " : " + f.rounds + " rounds, PV " + Math.round(f.hp0 * 100) + "→" + Math.round((f.hp1 || 0) * 100) + " %" + (f.died ? " †" : "") + (f.potions ? " (" + f.potions + " potion)" : "")); });
}
console.log("Farm d'élites : " + STATS.farms + " · achats à l'échoppe : " + STATS.shopBuys + " · secteurs repris au sable : " + STATS.recouvrements + " · sac plein : " + STATS.sacPlein);
console.log("Secteurs de carte (essais → libérés) : " + JSON.stringify(STATS.secteurs));
if (STATS.donjonsEquipement) console.log("Runs de donjon pour l'équipement : " + STATS.donjonsEquipement);
if (STATS.armes) console.log("Armes vues pendant la recherche d'Inhabituels : " + JSON.stringify(STATS.armes));
console.log("Obstacles (estimation → réussis/ratés) : " + JSON.stringify(STATS.obstacles) + " · niveau du héros : " + G.game.heroLevel);
if (STATS.expeditionFails.length) console.log("Expéditions ratées : " + STATS.expeditionFails.join(", "));
if (COMBATS) {
  console.log("\nÉtape                         durée   combat  soin   morts  niv.  (cumul)");
  STATS.steps.forEach(function (st) {
    var mur = STATS.murs.some(function (m) { return m.step === st.id; });
    console.log("  " + (st.id + (mur ? " ▲" : "")).padEnd(28) + (st.h.toFixed(1) + " h").padStart(8) + (st.combatH.toFixed(1) + " h").padStart(8) + (st.healH.toFixed(1) + " h").padStart(7) + String(st.deaths).padStart(6) + String(st.level).padStart(6) + ("  " + st.totalH.toFixed(0) + " h"));
  });
}
if (COMBATS) {
  console.log("\nOù part le temps, par étape (h, étape + élites et entretien qui suivent) :");
  STATS.steps.forEach(function (st) { if (st.temps && st.temps.total >= 0.5) console.log("  " + st.id.padEnd(16) + (st.temps.total.toFixed(1) + " h").padStart(8) + "  " + topParts(st.temps.parts, 4, 0.1)); });
  var parts = { combat: STATS.combatMs / 3600e3, "soin au camp": STATS.healMs / 3600e3 };
  Object.keys(STATS.attente).forEach(function (k) { parts[k] = STATS.attente[k] / 3600e3; });
  var somme = Object.keys(parts).reduce(function (s, k) { return s + parts[k]; }, 0);
  if (STATS.carte) console.log("Élites répétables : " + STATS.carte.victoires + " victoires, " + STATS.carte.lendemains + " retours au lendemain (victoires avant l'arrêt : " + (STATS.carte.parJour.join(" ") || "—") + ")");
  console.log("Total par cause : " + topParts(parts, 20, 0) + " (somme " + somme.toFixed(1) + " / " + (CLOCK.offset / 3600e3).toFixed(1) + " h)");
}
STATS.economie = { orGagne: G.game.totalGoldEarned, or: G.game.gold, aetherTotal: G.game.totalAetherEarned, attenteDonjonH: STATS.attenteDonjonH || 0 };
if (COMBATS) console.log("Économie : " + JSON.stringify(STATS.economie));
if (ZONES) console.log("Zones défrichées ou montées : " + (STATS.zones || 0));
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ classe: CLASSE, policy: POLICY, combats: COMBATS, passes: passes, failures: failures, totalH: CLOCK.offset / 3600e3,
  daysCap: DAYS_WAITED, capWaitH: CAP_WAIT_H, stats: STATS }, null, 1));
// Comparable au « Temps de jeu » du journal (game.playTime, app ouverte) : seuls les combats exigent l'écran, le reste (soin, production, recharges) avance aussi hors ligne.
if (COMBATS) console.log("Temps actif estimé (combats, à comparer au journal) : " + (STATS.combatMs / 3600e3).toFixed(1) + " h · attente hors combat : " + ((CLOCK.offset - STATS.combatMs) / 3600e3).toFixed(1) + " h");
console.log("\n" + passes + " OK, " + failures + " échec(s) — temps simulé : " + (CLOCK.offset / 3600e3).toFixed(1) + " h (dont " + DAYS_WAITED + " attente(s) de recharge des expéditions, " + CAP_WAIT_H.toFixed(1) + " h)");
process.exit(failures ? 1 : 0);
