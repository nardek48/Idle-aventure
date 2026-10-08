"use strict";
/* tools/sim/plafond-bench.js — v3.325.0 (plan C, partie 1, décision Seb 23/09/2026) : les combats de
   l'Histoire joués au PROFIL « PLAFOND ATTEIGNABLE », et non plus au profil minimal des bancs.

   Constat de départ (sauvegarde de Mar, Mage, fin du Désert, 3 h 23 de jeu) : entraînement à 110
   sur les cinq stats, Forge 5/4/4/2/2/2/2, 15 vagues de la Cité en 29 rounds sans potion. Les
   bancs jouaient 70 sur deux stats. Avec la revente du Village, l'or ne freine plus rien : le
   seul frein réel est le plafond du Terrain d'entraînement (WORLD_CAPS).

   Trois profils, tous au plafond du Terrain de leur monde :
     foret     : entraînement 60 partout (Terrain 4), uniques des deux élites + vitrine, sans
                 Forge (plafond 0 en Forêt), talents d'un héros niveau 8, Wenna +5 ;
     desert0   : entraînement 110 partout (Terrain 9, ouvert dès l'arrivée), MÊME équipement que
                 « foret » — l'effet du seul plafond d'entraînement ;
     desertfin : sauvegarde réelle de Mar (équipement, Forge, talents), entraînement 110,
                 Wenna +5, Maddoc +3 (tronc).

   Mesure, par classe : réussite, rounds, PV restants à la fin (sur les réussites), potions.
   Politique : Grimoire automatique (ClassCombatManager.chooseRoundAction), potion sous 35 %.

   USAGE : node tools/sim/plafond-bench.js . [--runs N] [--only id] */
var fs = require("fs"), path = require("path");
var src = fs.readFileSync(path.join(__dirname, "forecast-calibration-bench.js"), "utf8").replace(/\nmain\(\);\s*$/, "\n");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
var SET_ELITES = [], QSET = [], MARKS = [];
var RING_CRIT = null;
var SUITE = false, PA_POWER = null, PA_HP = null, JOURNEE = false, BRAKE = 1;
var VOIE_ARG = null, POINTS_ARG = null, NO_TAL_ARG = false;
var CITE_ARG = null;
var PRONO = false; // v3.429.7 : --pronostic, verdict de CombatForecast.forDungeon à côté de la mesure
var FRAPPES = false; // v3.429.14 : --frappes, frappes et dégâts réels contre l'estimation
var KCHEV = null;
var SOINSCOMP = null; // v3.429.15 : --soinscomp k, essai : réserve = k charges de soin de compagnon    // v3.429.14 : --kchev k, essai du coefficient de classe du Chevalier (FORECAST_CLASS_DMG_MULT)
var RUNS = 40, ONLY = null, TRAIN = null, PROFIL_FORCE = null, SOLO = false, ELITE_MULT = null, DIFF = null, BOSS = null;
for (var ai = 3; ai < process.argv.length; ai++) {
  if (process.argv[ai] === "--runs") RUNS = Number(process.argv[ai + 1]) || RUNS;
  if (process.argv[ai] === "--only") ONLY = process.argv[ai + 1];
  // Balayages du lot C-2 : multiplicateurs d'essai, sans toucher aux données du jeu
  if (process.argv[ai] === "--elite") { var em = String(process.argv[ai + 1]).split(","); ELITE_MULT = { power: Number(em[0]), endurance: Number(em[1]) }; }
  if (process.argv[ai] === "--diff") DIFF = Number(process.argv[ai + 1]);
  if (process.argv[ai] === "--boss") { var bm = String(process.argv[ai + 1]).split(","); BOSS = { power: Number(bm[0]), endurance: Number(bm[1]) }; }
  if (process.argv[ai] === "--setelite") SET_ELITES.push(process.argv[ai + 1]); // id:puissance,endurance, pour tout le banc (vagues élites de la Cité comprises)
  if (process.argv[ai] === "--qset") QSET.push(process.argv[ai + 1]); // id:champ=valeur[,champ=valeur] sur ADVENTURE_QUESTS
  if (process.argv[ai] === "--mark") MARKS.push(process.argv[ai + 1]); // Marque(s) de donjon, ex. aff_plague (étape 13)
  if (process.argv[ai] === "--suite") SUITE = true;
  if (process.argv[ai] === "--ringcrit") RING_CRIT = Number(process.argv[ai + 1]); // v3.427.2 : anneau de Mar en critique (base) au lieu de l'or
  if (process.argv[ai] === "--journee") JOURNEE = true; // élite répétable : victoires d'une journée avec le frein (LIVING_MAP_RULES)
  if (process.argv[ai] === "--pa") { var pm = String(process.argv[ai + 1]).split(","); PA_POWER = Number(pm[0]); PA_HP = Number(pm[1]); } // puissance,PV des combats de PA // v3.331.0 : seulement les contenus de la suite du recalage
  if (process.argv[ai] === "--pronostic") PRONO = true;
  if (process.argv[ai] === "--frappes") FRAPPES = true;
  if (process.argv[ai] === "--soinscomp") SOINSCOMP = Number(process.argv[ai + 1]);
  if (process.argv[ai] === "--kchev") KCHEV = Number(process.argv[ai + 1]); // essai : dégâts du Chevalier estimés × k
  if (process.argv[ai] === "--solo") SOLO = true; // sans compagnons : ce qu'ils portent
  if (process.argv[ai] === "--train") TRAIN = Number(process.argv[ai + 1]); // balayage : entraînement imposé
  if (process.argv[ai] === "--profil") PROFIL_FORCE = process.argv[ai + 1];   // un seul profil pour tous les contenus
  if (process.argv[ai] === "--voie") VOIE_ARG = process.argv[ai + 1];          // v3.327.0 : A ou B
  if (process.argv[ai] === "--points") POINTS_ARG = Number(process.argv[ai + 1]);
  if (process.argv[ai] === "--sans-talents") NO_TAL_ARG = true;
  if (process.argv[ai] === "--cite") CITE_ARG = Number(process.argv[ai + 1]); // v3.356.0 : valeur d'essai de l'arme de la Cité
}
var mod = { exports: {} };
new Function("require", "process", "module", "__dirname", src + "\nmodule.exports = { g: g, run: run, seedRng: seedRng, setup: setup, CLASSES: CLASSES };")(
  require, { argv: [process.argv[0], "x", ROOT] }, mod, __dirname);
var B = mod.exports, g = B.g;

if (CITE_ARG != null && g.ELITE_UNIQUE_LOOT.arme_cite) g.ELITE_UNIQUE_LOOT.arme_cite.value = CITE_ARG;
SET_ELITES.forEach(function (spec) {
  var parts = spec.split(":"), v = parts[1].split(",");
  if (g.ELITE_DB[parts[0]]) Object.assign(g.ELITE_DB[parts[0]].statMult, { power: Number(v[0]), endurance: Number(v[1]) });
});

QSET.forEach(function (spec) {
  var i = spec.indexOf(":"), q = g.ADVENTURE_QUESTS[spec.slice(0, i)];
  if (!q) return;
  spec.slice(i + 1).split(",").forEach(function (kv) { var p = kv.split("="); q[p[0]] = Number(p[1]); });
});

var STATS = ["power", "endurance", "celerity", "precision", "will"];

/* Équipement de Mar (sauvegarde du 23/09/2026) — l'arme est un bâton : on garde ses valeurs
   pour les trois classes, seule l'icône change (même stat tapDmg). */
var MAR_GEAR = {
  weapon: { rarity: "green", stat: "tapDmg", value: 45, worldIndex: 1, affixes: [{ stat: "tapMult", value: 0.12, tier: "P" }] },
  armor: { rarity: "green", stat: "defense", value: 0.05, worldIndex: 1, affixes: [{ stat: "autoDps", value: 4, tier: "P" }] },
  helmet: { rarity: "green", stat: "critMult", value: 0.24, worldIndex: 1, affixes: [{ stat: "critChance", value: 2, tier: "P" }] },
  gloves: { rarity: "green", stat: "tapMult", value: 0.29, worldIndex: 1, affixes: [{ stat: "autoDps", value: 4, tier: "P" }] },
  boots: { rarity: "common", stat: "autoDps", value: 5, worldIndex: 0, affixes: [] },
  ring: { rarity: "green", stat: "goldMult", value: 0.14, worldIndex: 0, affixes: [{ stat: "critChance", value: 1, tier: "P" }] },
  amulet: { rarity: "green", stat: "critChance", value: 3, worldIndex: 1, affixes: [{ stat: "tapMult", value: 0.14, tier: "P" }] }
};
var MAR_FORGE = { weapon: 5, armor: 4, helmet: 4, gloves: 2, boots: 2, ring: 2, amulet: 2 };
/* v3.327.0 (lot T-3) : talents PAR CLASSE et PAR VOIE. Chaque ordre est celui d'un joueur qui
   vise sa clé de voûte ; le profil en prend les N premiers, N = plafond de points de l'acte
   (TALENT_CAP_BY_ACT). Anciens profils (talents communs) : sauvegarde de Mar et « Nardek ». */
var TALENT_BUILDS = {
  knight: {
    A: ["k_cuirasse", "k_cuirasse", "k_sang_chaud", "k_rancune", "k_garde_vengeresse", "k_colere_froide", "k_mur", "k_bastion", "k_riposte", "k_elan", "k_curee"],
    B: ["k_cuirasse", "k_cuirasse", "k_sang_chaud", "k_elan", "k_curee", "k_colere_froide", "k_brise_os", "k_sentence", "k_soif_bourreau", "k_rancune", "k_garde_vengeresse"]
  },
  archer: {
    A: ["a_oeil_vif", "a_oeil_vif", "a_rythme", "a_tir_ajuste", "a_coup_au_but", "a_souffle_court", "a_perforation", "a_tir_mortel", "a_marque_chasseur", "a_pas_de_cote", "a_transe"],
    B: ["a_oeil_vif", "a_rythme", "a_souffle_court", "a_pas_de_cote", "a_contre_tir", "a_oeil_vif", "a_transe", "a_danse_ombres", "a_nuee_fleches", "a_tir_ajuste", "a_coup_au_but"]
  },
  mage: {
    A: ["m_flux", "m_peau_arcane", "m_peau_arcane", "m_braises_tenaces", "m_incendie", "m_reserve", "m_combustion", "m_brasier", "m_attiser", "m_economie", "m_barriere_vive"],
    B: ["m_flux", "m_peau_arcane", "m_peau_arcane", "m_barriere_vive", "m_economie", "m_reserve", "m_echo_barriere", "m_surcharge", "m_surtension", "m_braises_tenaces", "m_incendie"]
  }
};
var VOIE = VOIE_ARG || "A";  // --voie A|B
var TALENT_POINTS = POINTS_ARG; // --points N : impose le nombre de points
var NO_TALENTS = NO_TAL_ARG;   // --sans-talents
function talentsFor(classId, points) {
  var out = {};
  if (NO_TALENTS) return out;
  (TALENT_BUILDS[classId][VOIE] || []).slice(0, TALENT_POINTS != null ? TALENT_POINTS : points).forEach(function (id) { out[id] = (out[id] || 0) + 1; });
  return out;
}

/* v3.326.0 (lot C-2) : un profil par acte, au plafond d'entraînement DE L'ACTE (TRAINING_CAP_BY_ACT).
   L'équipement est pris au plus prudent : celui qu'on est SÛR d'avoir à ce moment-là. */
var PROFILS = {
  // v3.331.0 (suite du recalage) : actes I et II de la Forêt, au plafond de l'acte, sans talents
  foretI: { label: "Forêt, acte I (entr. 20, vitrine de départ)", train: 20, gear: "vitrine", points: 0, wenna: 0, maddoc: 0 },
  foretII: { label: "Forêt, acte II (entr. 40, vitrine de départ)", train: 40, gear: "vitrine", points: 0, wenna: 0, maddoc: 0 },
  foretIII: { label: "Forêt, acte III (entr. 60, vitrine de départ)", train: 60, gear: "vitrine", points: 5, wenna: 5, maddoc: 0 },
  foret: { label: "Forêt, fin (entr. 60, uniques des deux élites + vitrine, Wenna +5)", train: 60, gear: "foret", points: 5, wenna: 5, maddoc: 0 },
  desertI: { label: "Désert, acte I (entr. 70, équipement de Forêt, Wenna +5)", train: 70, gear: "foret", points: 7, wenna: 5, maddoc: 0 },
  desertII: { label: "Désert, acte II (entr. 90, équipement de Forêt, Wenna +5, Maddoc +1)", train: 90, gear: "foret", points: 9, wenna: 5, maddoc: 1 },
  desert0: { label: "Désert, début d'acte III (entr. 110, équipement de Forêt)", train: 110, gear: "foret", points: 11, wenna: 5, maddoc: 3 },
  desertfin: { label: "Désert, fin d'acte III (profil réel de Mar : entr. 110, Forge, talents)", train: 110, gear: "mar", points: 11, wenna: 5, maddoc: 3 },
  // v3.356.0 (D4) : le héros de la campagne B à l'entrée de desert_15 — uniques de la Forêt, heaume, arme de la Cité, reforge arme 4 / armure 2
  campagne: { label: "Désert, campagne (entr. 110, uniques + heaume + arme de la Cité, Forge arme 4 / armure 2)", train: 110, gear: "cite", points: 11, wenna: 5, maddoc: 2 }
};

function equipFor(p) {
  var E = g.game.equipped;
  if (p.gear === "mar") {
    Object.keys(MAR_GEAR).forEach(function (slot) {
      var it = JSON.parse(JSON.stringify(MAR_GEAR[slot]));
      it.uid = "m_" + slot; it.slot = slot; it.name = slot; it.icon = slot; E[slot] = it;
    });
    if (RING_CRIT != null) { E.ring.stat = "critChance"; E.ring.value = RING_CRIT; }
    g.game.forge = { levels: JSON.parse(JSON.stringify(MAR_FORGE)) };
    return;
  }
  // Forêt : vitrine de départ, puis (profil « foret ») les uniques des deux élites (arme et plastron)
  (g.EQUIP_SHOP_STARTER || []).forEach(function (d) {
    E[d.slot] = { uid: "s_" + d.slot, slot: d.slot, name: d.name, icon: d.icon, rarity: "common", stat: d.stat, value: d.value, affixes: [] };
  });
  g.game.forge = { levels: {} };
  if (p.gear === "vitrine") return;
  var uniques = ["araignee_marquee", "ronce_ardente"].concat(p.gear === "cite" ? ["heaume_guet", "arme_cite"] : []);
  uniques.forEach(function (id) {
    var it = g.EliteManager && g.EliteManager.buildUniqueLoot(id);
    if (it) E[it.slot] = it;
  });
  g.game.forge = { levels: p.gear === "cite" ? { weapon: 4, armor: 2 } : {} };
}

function prepare(c, p, worldIndex, withWenna, withMaddoc) {
  B.setup(c.hero, c.id, { weapon: 0, kit: false, train: 0, potions: 2 });
  g.WorldManager.worldIndex = worldIndex;
  g.game.worldsEverReached = worldIndex ? { 0: true, 1: true } : { 0: true };
  STATS.forEach(function (s) { g.game.upgrades["utrain_" + s] = TRAIN != null ? TRAIN : p.train; });
  g.game.talents = talentsFor(c.id, p.points); g.game.heroLevel = 30; // v3.327.0
  equipFor(p);
  B.run("game.unlockedTabs.grimoire = true; game.unlockedTabs.dungeon = true; game.combatMode = 'grimoire';");
  if (withWenna) { g.CompanionManager.unlock("wenna"); g.CompanionManager.state("wenna").upgrades = p.wenna; }
  if (withMaddoc) {
    g.CompanionManager.unlock("maddoc");
    var m = g.CompanionManager.state("maddoc"); m.voie = "tronc"; m.upgrades = p.maddoc;
  }
  B.run("EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp; CompanionManager.healAll();");
  g.game.healingPotionsOwned = { potion_soin_mineur: 2 };
  g.game.resources.petite_ration = 5; g.game.resources.ration = 5; // v3.331.0 : vivres (E4), jamais le goulot du banc
}

/* v3.429.14 : --frappes. Enveloppe enemyTurn (tour au contact -> dégâts estimés du round) et
   enemyStrike (PV du groupe perdus, par sorte de frappe). Le moteur n'est pas modifié. */
function bossEnVie() {
  var l = g.CombatActors ? g.CombatActors.enemies() : [g.game.enemy];
  return l.filter(function (e) { return e && e.isBoss && Number(e.hp || 0) > 0; })[0] || null;
}
function installFrappes(F) {
  var CE = g.CombatEngine, FB = F.B, CM = g.CompanionManager, PM = g.PotionManager;
  F.runs++;
  if (!CE._frappesSoins) CE._frappesSoins = { take: CM.takeTurn, pot: PM.useHealingPotion };
  CM.takeTurn = function () { // soin d'un compagnon = PV du groupe regagnés pendant son tour
    var before = partyHp(), out = CE._frappesSoins.take.apply(CM, arguments), gain = Math.max(0, partyHp() - before);
    F.soinsComp += gain; if (!FB._enCours) F.soinsCompAvant += gain;
    return out;
  };
  PM.useHealingPotion = function () {
    var before = partyHp(), out = CE._frappesSoins.pot.apply(PM, arguments), gain = Math.max(0, partyHp() - before);
    F.soinsPot += gain; if (!FB._enCours) F.soinsPotAvant += gain;
    return out;
  };
  FB._enCours = false;
  if (!CE._frappesOrig) CE._frappesOrig = { act: CE.performHeroAction, deal: CE.dealDamage, turns: CE.enemiesTurn, turn: CE.enemyTurn, strike: CE.enemyStrike };
  CE.performHeroAction = function (slot) { // action jouée : répartition par emplacement, héros estimé
    var ok = CE._frappesOrig.act.apply(CE, arguments);
    if (ok) { F.slots[slot] = (F.slots[slot] || 0) + 1; F.heroEst += g.CombatForecast.getHeroDamagePerRound(); }
    if (ok && bossEnVie()) { FB.actions++; if (slot === "defense") FB.gardes++; }
    return ok;
  };
  CE.dealDamage = function (dmg, isCrit, fromTap, ignoreAffinity, target) { // utile = PV réellement retirés (sans excédent)
    var foe = target || g.game.enemy, hp0 = foe ? Math.max(0, Number(foe.hp || 0)) : 0;
    var out = CE._frappesOrig.deal.apply(CE, arguments);
    var hp1 = foe ? Math.max(0, Number(foe.hp || 0)) : 0;
    if (CE._actingAlly) F.alliesUtile += hp0 - hp1; else { F.heroUtile += hp0 - hp1; F.heroBrut += Number(out || 0); }
    return out;
  };
  CE.enemiesTurn = function () { // un appel par round : dégâts du groupe estimés pour ce round
    F.rounds++; F.dmgEst += g.CombatForecast.getPartyDamagePerRound();
    var b = bossEnVie();
    if (b && !b._frappesBoss) { // arrivée du boss : ce que dirait le pronostic à cet instant (PV actuels)
      b._frappesBoss = true; FB._enCours = true; FB.combats++; FB.pv0 += partyHp();
      var fe = g.CombatForecast.forEnemy(b, {});
      if (fe) { FB.tueEst += Number(fe.roundsToKill || 0); FB.tombeEst += Math.min(999, Number(fe.roundsToDie || 0)); }
    }
    if (b) FB.rounds++;
    return CE._frappesOrig.turns.apply(CE, arguments);
  };
  CE.enemyTurn = function () {
    var e = g.game.enemy, CF = g.CombatForecast;
    if (e && e.stats && !e._frappesVu) { // 1er tour de cet ennemi : rounds au contact estimés (comme getAttritionCost)
      e._frappesVu = true; F.ennemis++; F.pvEnn += Number(e.maxHp || 0);
      F.toursEst += Math.max(0, Math.ceil(Number(e.maxHp || 0) / Math.max(1, CF.getPartyDamagePerRound())) - CF.getEngageRounds(e));
    }
    if (e && e.stats && !(Number(e.engageIn || 0) > 0) && g.game.heroHp > 0) { F.tours++; F.est += g.CombatForecast.getEnemyDamagePerRound(e);
      if (bossEnVie()) { FB.tours++; FB.est += g.CombatForecast.getEnemyDamagePerRound(e); } }
    return CE._frappesOrig.turn.apply(CE, arguments);
  };
  CE.enemyStrike = function (mult, isPatternOrBonus) {
    var before = partyHp();
    var out = CE._frappesOrig.strike.apply(CE, arguments);
    F.reel += Math.max(0, before - partyHp());
    if (bossEnVie() || (g.game.enemy && g.game.enemy.isBoss)) { FB.reel += Math.max(0, before - partyHp()); }
    if (!isPatternOrBonus) F.normales++; else if (mult === 1) F.secondes++; else F.charges++;
    return out;
  };
}

function autoRound() {
  var mx = g.game.heroMaxHp;
  if (mx > 0 && g.game.heroHp / mx < 0.35 && g.CombatEngine.heroAction("potion", "potion_soin_mineur", "auto")) return true;
  var d = g.ClassCombatManager.chooseRoundAction(true);
  if (d && d.slot && d.slot !== "basic" && g.CombatEngine.heroAction(d.slot, { matchedConditionId: d.matchedConditionId || null }, "auto")) return true;
  return g.CombatEngine.heroAction("basic", null, "auto");
}

/* ---------- Trois sortes de combat ---------- */

/* v3.429.10 : PV du groupe (héros + compagnons présents), pour mesurer l'usure réelle (--pronostic). */
function partyHp() {
  var t = Number(g.game.heroHp || 0);
  if (g.CompanionManager) g.CompanionManager.partyIds().forEach(function (id) { t += Number(g.CompanionManager.hpOf(id) || 0); });
  return t;
}

function playQuest(questId) {
  g.AdventureQuestManager.ensureDefaults();
  g.AdventureQuestManager.start(questId);
  if (!g.game.adventureQuestRun.active) return null;
  var rounds = 0, guard = 3000, hp0 = partyHp(), pot0 = Number(g.game.healingPotionsOwned.potion_soin_mineur || 0), usure = null;
  var quest = g.ADVENTURE_QUESTS[questId], hasBoss = (quest.steps || []).some(function (st) { return st.type === "bossKill"; });
  while (g.game.adventureQuestRun.active && g.game.heroHp > 0 && guard-- > 0) {
    g.game.activeTab = "combat";
    // usure réelle : PV du groupe perdus avant le boss (ou sur tout le run sans boss), potions comprises
    if (hasBoss && usure === null && g.game.enemy && (g.game.enemy.isBoss || (Array.isArray(g.game.enemy) && g.game.enemy.some(function (e) { return e.isBoss; })))) {
      usure = hp0 - partyHp() + (pot0 - Number(g.game.healingPotionsOwned.potion_soin_mineur || 0)) * Math.floor(g.game.heroMaxHp * 0.35);
    }
    if (!autoRound()) break;
    rounds++;
  }
  if (!hasBoss && g.game.heroHp > 0) usure = hp0 - partyHp() + (pot0 - Number(g.game.healingPotionsOwned.potion_soin_mineur || 0)) * Math.floor(g.game.heroMaxHp * 0.35);
  return { ok: !!g.game.adventureQuestsCompleted[questId], rounds: rounds, usure: usure };
}

function playElite(eliteId, worldId) {
  if (ELITE_MULT) Object.assign(g.ELITE_DB[eliteId].statMult, ELITE_MULT);
  g.SortieManager.end("return");
  if (!g.SortieManager.start("mapelite")) return null;
  var enemy = g.EliteManager.spawn(eliteId, worldId || "desert", 0, { brakeMult: BRAKE });
  if (!enemy) return null;
  g.CompanionManager.onCombatStart(); // piège v3.318.0 : sans escorte, le groupe n'est pas rebâti
  var rounds = 0, guard = 600;
  while (g.game.enemy === enemy && enemy.hp > 0 && g.game.heroHp > 0 && guard-- > 0) {
    if (!autoRound()) break;
    rounds++;
  }
  return { ok: enemy.hp <= 0 && g.game.heroHp > 0, rounds: rounds };
}

/* v3.331.0 : un lot de chasse entier, sans soin entre les bêtes (réglage du jeu). */
function playHunt(questId) {
  g.game.huntStats = {};
  g.HuntQuestManager.start(questId);
  if (!g.game.huntRun.active) return null;
  var rounds = 0, guard = 6000;
  while (g.game.huntRun.active && g.game.heroHp > 0 && guard-- > 0) {
    g.game.activeTab = "combat";
    if (!autoRound()) break;
    rounds++;
  }
  return { ok: Number(g.game.huntStats[questId] || 0) >= 1, rounds: rounds };
}

/* v3.388.0 : les Petites Aventures v1 sont retirées ; leur mesure vit dans tools/sim/pa2-bench.js. */

function playDungeon(dungeonId) {
  var d = g.DUNGEONS.filter(function (x) { return x.id === dungeonId; })[0];
  var garde = d.requiresStoryStep;
  g.game.dungeonTierCleared = dungeonId > 1 ? { 1: true } : {};
  g.DungeonManager.ensure();
  g.game.dungeonRunsUsed = {}; // v3.358.0 : sorties du jour remises à zéro
  d.requiresStoryStep = null;
  if (DIFF) d.difficultyMult = DIFF;
  if (BOSS && d.boss && d.boss.statMult) { d.boss.statMult.power = BOSS.power; d.boss.statMult.endurance = BOSS.endurance; }
  var boss0 = Number(g.game.dungeonBossClears || 0);
  g.DungeonManager.start(dungeonId, MARKS.slice());
  d.requiresStoryStep = garde;
  if (!g.game.dungeonRun.active) return null;
  var rounds = 0, guard = 4000, maxWave = 1, hpBoss = null, potBoss = null;
  var potDepart = Number(g.game.healingPotionsOwned.potion_soin_mineur || 0);
  while (g.game.dungeonRun.active && g.game.heroHp > 0 && guard-- > 0) {
    maxWave = Math.max(maxWave, g.game.dungeonRun.wave || 1);
    if (hpBoss === null && (g.game.dungeonRun.wave || 1) > g.DUNGEON_CONFIG.waveCount) { hpBoss = g.game.heroHp; potBoss = potDepart - Number(g.game.healingPotionsOwned.potion_soin_mineur || 0); }
    g.game.activeTab = "combat";
    if (!autoRound()) break;
    rounds++;
  }
  // v3.429.7 : usure réelle des vagues (PV perdus avant le boss, potions bues comprises), pour --pronostic
  var usure = hpBoss === null ? null : (g.game.heroMaxHp - hpBoss) + potBoss * Math.floor(g.game.heroMaxHp * 0.35);
  return { ok: Number(g.game.dungeonBossClears || 0) > boss0, rounds: rounds, v5: maxWave > 5, usure: usure };
}

/* ---------- Contenus mesurés : étape, sorte, monde, compagnons, profils ---------- */
var CONTENUS = [
  // v3.331.0 (suite du recalage) : tutoriel, chasses, Petites Aventures, élite de carte de la Forêt
  { id: "sang", label: "Forêt I · 1-2 · Premier sang", kind: "quest", ref: "aq_story_premier_sang", world: 0, wenna: false, profils: ["foretI"], suite: true },
  { id: "marais", label: "Forêt I · 5 · Le Roi des marais", kind: "quest", ref: "aq_forest_expedition", world: 0, wenna: false, profils: ["foretI"], suite: true },
  { id: "meute", label: "Forêt II · 6 · La meute", kind: "quest", ref: "hq_wolf_pack", world: 0, wenna: false, profils: ["foretII"], suite: true },
  { id: "chasse", label: "Chasse en Forêt (lot de 16)", kind: "hunt", ref: "hq_forest_boar", world: 0, wenna: false, profils: ["foretII", "foretIII"], suite: true },
  { id: "battue", label: "Battue en Forêt (lot de 20)", kind: "hunt", ref: "hq_forest_battue", world: 0, wenna: false, profils: ["foretII", "foretIII"], suite: true },
  { id: "seve", label: "Ce que les bêtes ont bu (Cœur, lot de 30)", kind: "hunt", ref: "hq_forest_seve", world: 0, wenna: false, profils: ["foretIII", "foret"], suite: true },
  { id: "arbre", label: "Carte de la Forêt · élite : l'Arbre-mère", kind: "elite", ref: "arbre_mere", worldId: "forest", world: 0, wenna: true, profils: ["foret"], suite: true },
  { id: "lisiere", label: "Forêt III · Franchir la Lisière", kind: "quest", ref: "aq_story_lisiere", world: 0, wenna: false, profils: ["foretIII"] },
  { id: "coeur", label: "Forêt III · Le grimoire du veilleur (Cœur)", kind: "quest", ref: "aq_story_coeur", world: 0, wenna: false, profils: ["foretIII"] },
  { id: "araignee", label: "Forêt III · Élite : l'araignée marquée", kind: "quest", ref: "eq_forest_spider", world: 0, wenna: false, profils: ["foretIII"] },
  { id: "ronce", label: "Forêt III · Élite : la ronce ardente", kind: "quest", ref: "eq_forest_bramble", world: 0, wenna: false, profils: ["foretIII"] },
  { id: "taniere", label: "Forêt III · Tanière du Basilic (donjon complet)", kind: "dungeon", ref: 1, world: 0, wenna: false, profils: ["foret"] },
  { id: "depths", label: "Forêt IV · Seigneur de guerre orc (étape 15)", kind: "quest", ref: "aq_forest_depths", world: 0, wenna: true, profils: ["foret"] },
  { id: "dunes", label: "Désert I · 2 · Les dunes", kind: "quest", ref: "aq_desert_dunes", world: 1, wenna: true, profils: ["desertI"] },
  { id: "gouffre", label: "Désert II · 8 · Le gouffre", kind: "quest", ref: "aq_desert_gouffre", world: 1, wenna: true, maddoc: true, profils: ["desertII"] },
  { id: "nuee", label: "Désert II · 10 · La nuée", kind: "quest", ref: "aq_desert_nuee", world: 1, wenna: true, maddoc: true, profils: ["desertII"] },
  { id: "serment", label: "Désert III · 11 · Élite : le serment sous l'armure", kind: "elite", ref: "serment_armure", world: 1, wenna: true, maddoc: true, profils: ["desert0", "desertfin"] },
  { id: "cite", label: "Désert III · 12/15 · Cité engloutie (donjon complet)", kind: "dungeon", ref: 2, world: 1, wenna: true, maddoc: true, profils: ["desert0", "campagne", "desertfin"] },
  { id: "dard", label: "Désert III · 14 · Élite : le dard des profondeurs", kind: "elite", ref: "dard_profondeurs", world: 1, wenna: true, maddoc: true, profils: ["campagne", "desertfin"] },
  // v3.362.0 (acte IV) : le trône de sable, run entier (détail : tools/sim/nezzam-bench.js)
  { id: "trone", label: "Désert IV · 17 · Le trône de sable (Nezzam)", kind: "quest", ref: "aq_desert_trone", world: 1, wenna: true, maddoc: true, profils: ["campagne", "desertfin"] }
];

function mesure(ct, profilId, c) {
  var p = PROFILS[profilId];
  var n = 0, ok = 0, rounds = 0, hp = 0, pots = 0, v5 = 0, prono = null, usureSum = 0, usureN = 0;
  if (KCHEV != null) { var CFk = g.CombatForecast; // pronostic seul : remplace le coefficient du Chevalier
    if (!CFk._fhOrig) CFk._fhOrig = CFk.getForecastHeroDamage;
    CFk.getForecastHeroDamage = function () { return /knight/i.test(String(g.game.heroId)) ? Math.max(1, CFk.getHeroDamagePerRound() * KCHEV) : CFk._fhOrig.call(CFk); }; }
  if (SOINSCOMP != null) { var CFs = g.CombatForecast; // réserve + k soins (valeur × PV max du héros) par compagnon soigneur présent
    if (!CFs._hrOrig) CFs._hrOrig = CFs.getHealingReserve;
    CFs.getHealingReserve = function () {
      var add = 0;
      g.CompanionManager.partyIds().forEach(function (id) { var d = g.getCompanionDef(id); if (d && d.skill && d.skill.type === "heal") add += SOINSCOMP * d.skill.value * Number(g.game.heroMaxHp || 0); });
      return CFs._hrOrig.call(CFs) + Math.round(add);
    }; }
  var F = { heroEst: 0, heroBrut: 0, heroUtile: 0, alliesUtile: 0, slots: {}, rounds: 0, dmgEst: 0, pvEnn: 0, ennemis: 0, toursEst: 0, tours: 0, est: 0, reel: 0, normales: 0, secondes: 0, charges: 0, tourMax: 0,
    soinsComp: 0, soinsCompAvant: 0, soinsPot: 0, soinsPotAvant: 0, runs: 0,
    B: { combats: 0, rounds: 0, tueEst: 0, tombeEst: 0, pv0: 0, perdu: 0, tours: 0, est: 0, reel: 0, gardes: 0, actions: 0 } };
  for (var i = 0; i < RUNS; i++) {
    B.seedRng(93000 + i);
    prepare(c, p, ct.world, ct.wenna && !SOLO, ct.maddoc && !SOLO);
    if (PRONO && i === 0 && (ct.kind === "quest" || ct.kind === "hunt")) {
      var fm = g.CombatForecast.forMission({ sourceKind: ct.kind === "quest" ? "adventure" : "hunt", questId: ct.ref });
      prono = fm ? fm.id + " (ratio " + (fm.ratio != null ? fm.ratio.toFixed(2) : "—") + ", usure " + fm.attrition + " / PV " + Math.round(g.game.heroMaxHp) + "+" + fm.healingReserve + ", " + (fm.precedingFights || 0) + " combats)" : "—";
    }
    if (PRONO && i === 0 && ct.kind === "dungeon") {
      if (DIFF) g.DUNGEONS.filter(function (x) { return x.id === ct.ref; })[0].difficultyMult = DIFF;
      var fp = g.CombatForecast.forDungeon(ct.ref, MARKS.slice());
      prono = fp ? fp.id + " (ratio " + (fp.ratio != null ? fp.ratio.toFixed(2) : "—") + ", usure " + fp.attrition + " / PV " + Math.round(g.game.heroMaxHp) + "+" + fp.healingReserve + ")" : "—";
    }
    var pot0 = Number(g.game.healingPotionsOwned.potion_soin_mineur || 0);
    if (FRAPPES) installFrappes(F);
    var r = ct.kind === "quest" ? playQuest(ct.ref) : ct.kind === "elite" ? playElite(ct.ref, ct.worldId)
      : ct.kind === "hunt" ? playHunt(ct.ref) : playDungeon(ct.ref);
    if (!r) continue;
    n++;
    if (r.v5) v5++;
    if (r.usure != null) { usureSum += r.usure; usureN++; }
    pots += pot0 - Number(g.game.healingPotionsOwned.potion_soin_mineur || 0);
    if (r.ok) { ok++; rounds += r.rounds; hp += Math.max(0, g.game.heroHp) / g.game.heroMaxHp; }
  }
  if (!n) return null;
  return { win: ok / n, rounds: ok ? rounds / ok : 0, hp: ok ? hp / ok : 0, pots: pots / n, v5: ct.kind === "dungeon" ? v5 / n : null, prono: prono, usure: usureN ? usureSum / usureN : null, usureN: usureN, F: FRAPPES ? F : null };
}

function profilStats(profilId, c) {
  prepare(c, PROFILS[profilId], /^foret/.test(profilId) ? 0 : 1, false, false);
  var E = g.EquipmentManager;
  return "PV " + Math.floor(g.game.heroMaxHp) + " · ATK " + Math.round(E.effectiveTapDamage())
    + " · VIT " + Math.round(g.CombatEngine.getTotalCelerity()) + " · DEF " + Math.round(g.game.heroDefensePct * 100)
    + " % · CRIT " + E.effectiveCritChance().toFixed(1) + " % ×" + E.effectiveCritMult().toFixed(2);
}

console.log("COMBATS DE L'HISTOIRE AU PLAFOND ATTEIGNABLE — " + RUNS + " runs par cellule, 2 potions, Grimoire auto · talents " + (NO_TALENTS ? "aucun" : "voie " + VOIE + (TALENT_POINTS != null ? ", " + TALENT_POINTS + " points" : "")) + (TRAIN != null ? " · entraînement imposé " + TRAIN : "") + "\n");
Object.keys(PROFILS).forEach(function (pid) {
  console.log("Profil " + pid + " : " + PROFILS[pid].label);
  B.CLASSES.forEach(function (c) { console.log("   " + c.label.padEnd(10) + profilStats(pid, c)); });
});
console.log("");
CONTENUS.forEach(function (ct) {
  if (ONLY && ct.id !== ONLY) return;
  if (SUITE && !ct.suite) return;
  (PROFIL_FORCE ? [PROFIL_FORCE] : ct.profils).forEach(function (pid) {
    console.log(ct.label + "  [" + pid + "]");
    B.CLASSES.forEach(function (c) {
      var r = mesure(ct, pid, c);
      if (!r) { console.log("   " + c.label.padEnd(10) + " — indisponible"); return; }
      console.log("   " + c.label.padEnd(10)
        + " réussite " + String(Math.round(100 * r.win)).padStart(3) + " %"
        + "   rounds " + String(Math.round(r.rounds)).padStart(4)
        + "   PV restants " + String(Math.round(100 * r.hp)).padStart(3) + " %"
        + "   potions " + r.pots.toFixed(1)
        + (r.v5 != null ? "   vague 5 passée " + Math.round(100 * r.v5) + " %" : "")
        + (r.prono ? "   pronostic " + r.prono : "")
        + (PRONO && r.usure != null ? "   usure réelle " + Math.round(r.usure) + " (" + r.usureN + " runs au boss)" : ""));
      var nAct = 0; if (r.F) Object.keys(r.F.slots).forEach(function (k) { nAct += r.F.slots[k]; });
      if (r.F && nAct) console.log("              héros : " + nAct + " actions (" + Object.keys(r.F.slots).map(function (k) { return k + " " + Math.round(100 * r.F.slots[k] / nAct) + " %"; }).join(", ") + ") · estimé " + Math.round(r.F.heroEst / nAct) + " / action · brut " + Math.round(r.F.heroBrut / nAct) + " · utile " + Math.round(r.F.heroUtile / nAct) + " · compagnons utile " + Math.round(r.F.alliesUtile / nAct));
      var fb = r.F && r.F.B;
      if (r.F && r.F.runs) console.log("              soins par run : compagnons " + Math.round(r.F.soinsComp / r.F.runs) + " (avant le boss " + Math.round(r.F.soinsCompAvant / r.F.runs) + ") · potions " + Math.round(r.F.soinsPot / r.F.runs) + " (avant le boss " + Math.round(r.F.soinsPotAvant / r.F.runs) + ")");
      if (fb && fb.combats) console.log("              boss : " + fb.combats + " combats · PV du groupe à l'arrivée " + Math.round(fb.pv0 / fb.combats) + " · rounds pour le tuer estimés " + Math.round(fb.tueEst / fb.combats) + " / réels " + Math.round(fb.rounds / fb.combats) + " · rounds avant de tomber estimés " + Math.round(fb.tombeEst / fb.combats) + " · PV perdus au boss " + Math.round(fb.reel / fb.combats) + " (estimé " + Math.round(fb.est / fb.combats) + ") · gardes " + Math.round(100 * fb.gardes / Math.max(1, fb.actions)) + " %");
      if (r.F && r.F.tours) console.log("              groupe : dégâts estimés " + Math.round(r.F.dmgEst / Math.max(1, r.F.rounds)) + " / round · réels ≤ " + Math.round(r.F.pvEnn / Math.max(1, r.F.rounds)) + " (PV ennemis / rounds)");
      console.log("              frappes : " + r.F.ennemis + " ennemis · tours au contact estimés " + r.F.toursEst + " / réels " + r.F.tours + " (×" + (r.F.tours / Math.max(1, r.F.toursEst)).toFixed(2) + ") · estimé " + Math.round(r.F.est / r.F.tours) + " / tour · réel " + Math.round(r.F.reel / r.F.tours) + " / tour (×" + (r.F.reel / Math.max(1, r.F.est)).toFixed(2) + ") · par tour : " + (r.F.normales / r.F.tours).toFixed(2) + " normale, " + (r.F.secondes / r.F.tours).toFixed(2) + " seconde, " + (r.F.charges / r.F.tours).toFixed(2) + " charge");
    });
  });
});

/* v3.331.0 : --journee — une journée d'élite répétable (Arbre-mère) : soin et 2 potions entre deux
   combats (même modèle que tools/sim/arbremere-bench.js), frein +brakePerWin par victoire, arrêt à la
   première défaite, 10 victoires au plus. Sève = victoires × sevePerWin. */
if (JOURNEE) {
  var RE = g.LIVING_MAP_RULES.repeatableElite;
  console.log("\nJOURNÉE D'ÉLITE RÉPÉTABLE (frein +" + Math.round(RE.brakePerWin * 100) + " % par victoire, " + RE.sevePerWin + " Sève par victoire)");
  CONTENUS.forEach(function (ct) {
    if (ct.kind !== "elite" || (ONLY && ct.id !== ONLY)) return;
    (PROFIL_FORCE ? [PROFIL_FORCE] : ct.profils).forEach(function (pid) {
      console.log(ct.label + "  [" + pid + "]");
      B.CLASSES.forEach(function (c) {
        var tot = 0, zero = 0;
        for (var i = 0; i < RUNS; i++) {
          B.seedRng(71000 + i);
          var wins = 0;
          while (wins < 10) {
            prepare(c, PROFILS[pid], ct.world, ct.wenna && !SOLO, ct.maddoc && !SOLO);
            BRAKE = 1 + RE.brakePerWin * wins;
            var r = playElite(ct.ref, ct.worldId);
            g.SortieManager.end("return");
            if (!r || !r.ok) break;
            wins++;
          }
          BRAKE = 1;
          tot += wins; if (!wins) zero++;
        }
        console.log("   " + c.label.padEnd(10) + " victoires par jour " + (tot / RUNS).toFixed(1) + " · Sève " + (tot / RUNS * RE.sevePerWin).toFixed(1) + " · journées sans victoire " + Math.round(100 * zero / RUNS) + " %");
      });
    });
  });
}
