"use strict";
/* tools/sim/montagne-acte3-bench.js — v3.490.0 (Montagne, lot M-4) : la Gueule du volcan de bout en bout
   (Golem-forge, campement, Ifrit qui trie, Wyrm de cendres) et la quête de l'étape 14, sur le vrai moteur.
   Le héros est celui d'une vraie sauvegarde (SAVE_OUT de campagne-harness.js), groupe et potions compris.

   Cibles (Conception, MT7) : le Wyrm 65-80 % par classe, Rôdeur ≥ 60 % ; la quête sans mort, 25-35 % des PV.

   USAGE : node tools/sim/montagne-acte3-bench.js . --save a.json[,b.json] [--runs N] [--diff x] [--boss p,e]
           [--quete pv,puissance] [--sans-potion] */
var fs = require("fs"), path = require("path");
var base = fs.readFileSync(path.join(__dirname, "plafond-bench.js"), "utf8");
base = base.slice(0, base.indexOf('console.log("COMBATS DE L\'HISTOIRE'));
var ARGV = process.argv.slice(3);
function opt(k) { var i = ARGV.indexOf(k); return i >= 0 ? ARGV[i + 1] : null; }
var SAVES = String(opt("--save") || "").split(",").filter(Boolean);
var DIFF5 = opt("--diff") ? Number(opt("--diff")) : null;
var WYRM = opt("--boss") ? opt("--boss").split(",").map(Number) : null;
var QUETE = opt("--quete") ? opt("--quete").split(",").map(Number) : null;
var SANS_POTION = ARGV.indexOf("--sans-potion") >= 0;
if (!SAVES.length) { console.log("--save <fichier> attendu (sauvegarde de campagne)"); process.exit(1); }

var extra = function () {
  var d = g.DUNGEONS.filter(function (x) { return x.id === 5; })[0];
  if (DIFF5) d.difficultyMult = DIFF5;
  if (WYRM) { d.boss.statMult.power = WYRM[0]; d.boss.statMult.endurance = WYRM[1]; }
  if (QUETE) { g.ADVENTURE_QUESTS.aq_montagne_salle_ronde.encounterHpMult = QUETE[0]; g.ADVENTURE_QUESTS.aq_montagne_salle_ronde.enemyPowerMult = QUETE[1]; }
  function charge(saveTxt, seed) {
    B.seedRng(seed);
    g.restoreBaseState(JSON.parse(saveTxt));
    g.ensureGrimoireRules();
    B.run("game.combatMode = 'grimoire'; EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp; CompanionManager.healAll();");
    if (SANS_POTION) g.game.healingPotionsOwned = {};
  }
  function gueule() {
    var cleared = Object.assign({}, g.game.dungeonTierCleared); delete cleared[5];
    g.game.dungeonTierCleared = cleared; g.game.dungeonRunsUsed = {};
    if (g.game.dungeonRun) g.game.dungeonRun.active = false;
    var boss0 = Number(g.game.dungeonBossClears || 0);
    g.DungeonManager.start(5, []);
    if (!g.game.dungeonRun.active) return null;
    var rounds = 0, guard = 8000, camp = false, hpCamp = null, hpBoss = null, pot0 = JSON.stringify(g.game.healingPotionsOwned || {});
    while (g.game.dungeonRun.active && g.game.heroHp > 0 && guard-- > 0) {
      if (g.DungeonManager.isCampPending()) {
        camp = true; hpCamp = g.game.heroHp / g.game.heroMaxHp;
        g.DungeonManager.campAction("souffler");
        if (!g.game.dungeonRun.active) break;
      }
      if (g.DungeonManager.isHaltPending && g.DungeonManager.isHaltPending()) g.DungeonManager.haltAction(null);
      if (hpBoss === null && (g.game.dungeonRun.wave || 1) > g.DUNGEON_CONFIG.waveCount) hpBoss = g.game.heroHp / g.game.heroMaxHp;
      g.game.activeTab = "combat";
      if (!autoRound()) break;
      rounds++;
    }
    return { camp: camp, hpCamp: hpCamp, boss: hpBoss !== null, hpBoss: hpBoss, ok: Number(g.game.dungeonBossClears || 0) > boss0, rounds: rounds,
      hp: Math.max(0, g.game.heroHp) / g.game.heroMaxHp };
  }
  console.log("GUEULE DU VOLCAN — " + RUNS + " runs par sauvegarde, Grimoire, " + (SANS_POTION ? "SANS potion" : "potions de la sauvegarde")
    + (DIFF5 ? " · essai difficultyMult " + DIFF5 : " · difficultyMult " + d.difficultyMult) + (WYRM ? " · essai Wyrm p" + WYRM[0] + " e" + WYRM[1] : ""));
  console.log("Cible : le Wyrm 65-80 % par classe, Rôdeur ≥ 60 %.\n");
  var textes = SAVES.map(function (f) { return fs.readFileSync(f, "utf8"); });
  textes.forEach(function (t, k) {
    var cls = JSON.parse(t).heroId || path.basename(SAVES[k]);
    var n = 0, camp = 0, hpCamp = 0, boss = 0, hpBoss = 0, ok = 0, rounds = 0, hp = 0;
    for (var i = 0; i < RUNS; i++) {
      charge(t, 91000 + i);
      var r = gueule();
      if (!r) continue;
      n++;
      if (r.camp) { camp++; hpCamp += r.hpCamp; }
      if (r.boss) { boss++; hpBoss += r.hpBoss; }
      if (r.ok) { ok++; rounds += r.rounds; hp += r.hp; }
    }
    console.log("   " + String(cls).padEnd(8) + " campement " + String(Math.round(100 * camp / Math.max(1, n))).padStart(3) + " % (PV " + String(Math.round(100 * (camp ? hpCamp / camp : 0))).padStart(3) + " %)"
      + "   Wyrm atteint " + String(Math.round(100 * boss / Math.max(1, n))).padStart(3) + " % (PV " + String(Math.round(100 * (boss ? hpBoss / boss : 0))).padStart(3) + " %)"
      + "   vaincu " + String(Math.round(100 * ok / Math.max(1, n))).padStart(3) + " %   PV fin " + String(Math.round(100 * (ok ? hp / ok : 0))).padStart(3) + " %   rounds " + Math.round(ok ? rounds / ok : 0) + "   (" + n + " runs)");
  });
  console.log("\nÉTAPE 14 · L'ouvrage inachevé (3 rencontres)" + (QUETE ? " · essai PV ×" + QUETE[0] + " puissance ×" + QUETE[1] : ""));
  textes.forEach(function (t, k) {
    var cls = JSON.parse(t).heroId || path.basename(SAVES[k]);
    var n = 0, ok = 0, hp = 0, rounds = 0;
    for (var i = 0; i < RUNS; i++) {
      charge(t, 92000 + i);
      g.game.adventureQuestsCompleted = {}; g.game.adventureQuestProgress = {};
      var r = playQuest("aq_montagne_salle_ronde");
      if (!r) continue;
      n++;
      if (r.ok) { ok++; rounds += r.rounds; hp += Math.max(0, g.game.heroHp) / g.game.heroMaxHp; }
    }
    console.log("   " + String(cls).padEnd(8) + " réussite " + String(Math.round(100 * ok / Math.max(1, n))).padStart(3) + " %   PV restants " + String(Math.round(100 * (ok ? hp / ok : 0))).padStart(3) + " %   rounds/combat " + (ok ? rounds / ok / 3 : 0).toFixed(1) + "   (" + n + " runs)");
  });
};
eval(base + "\n(" + extra.toString() + ")();");
