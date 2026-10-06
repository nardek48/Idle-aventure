// Analyse non livrée : charge la sauvegarde de Seb (slot actif) dans le vrai moteur.
var fs = require("fs"), path = require("path");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
var SAVE = process.argv[3];
var src = fs.readFileSync(path.join(__dirname, "forecast-calibration-bench.js"), "utf8").replace(/\nmain\(\);\s*$/, "\n");
var mod = { exports: {} };
new Function("require", "process", "module", "__dirname", src + "\nmodule.exports = { g: g, run: run, seedRng: seedRng, setup: setup, CLASSES: CLASSES };")(
  require, { argv: [process.argv[0], "x", ROOT] }, mod, __dirname);
var B = mod.exports, g = B.g;
var file = JSON.parse(fs.readFileSync(SAVE, "utf8"));
var SLOT = process.env.SLOT || file.activeSlot;
var slot = file.slots[SLOT];
function load() {
  B.run("fullResetState();");
  g.restoreBaseState(JSON.parse(JSON.stringify(slot)));
  g.reapplyProgressEffects();
  if (g.TalentManager) { g.TalentManager.migrate(); g.TalentManager.afterChange(); }
  if (g.ensureGameStateDefaults) g.ensureGameStateDefaults();
  g.StatsSystem.recalcStats();
  g.EquipmentManager.recalcStats();
}
module.exports = { B: B, g: g, load: load, slot: slot };
if (require.main === module) {
  load();
  var G = g.game;
  console.log("Héros", G.playerName, G.heroId, "niv.", G.heroLevel, "PV", Math.round(G.heroMaxHp), "monde", G.worldIndex, "aventure", G.adventureIndex, "cycle", G.cycleCount);
  console.log("Raw  power/precision/endurance :", G.heroPowerRaw, G.heroPrecisionRaw, G.heroEnduranceRaw);
  console.log("Total stats :", JSON.stringify({ power: G.heroPower, precision: G.heroPrecision, endurance: G.heroEndurance, crit: G.critChance, critMult: G.critMult, tap: G.tapDamage }));
  console.log("Entraînement :", JSON.stringify(Object.keys(G.upgrades || {}).filter(function (k) { return /train/.test(k) && G.upgrades[k]; }).reduce(function (o, k) { o[k] = G.upgrades[k]; return o; }, {})));
  console.log("trainedStats :", JSON.stringify(G.trainedStats));
  console.log("Équipé :", Object.keys(G.equipped || {}).map(function (s) { var e = G.equipped[s]; return e ? s + ":" + e.rarity + ":" + e.stat + "=" + e.value : s + ":-"; }).join(" | "));
  console.log("Temps de jeu (h) :", ((G.playTime || 0) / 3600).toFixed(1), " tués :", G.totalKills);
  console.log("Histoire :", JSON.stringify(Object.keys(G.storyQuests || {}).map(function (k) { var s = G.storyQuests[k]; return k + ":" + (s && (s.stepIndex != null ? s.stepIndex : s.currentStep)); })));
  console.log("PA :", JSON.stringify(G.explorationProgression && G.explorationProgression.petiteAventure), " sceneRun:", !!G.sceneRun);
  console.log("Talents :", JSON.stringify(G.talentsV2 || G.talents).slice(0, 400));
  console.log("Compagnons :", JSON.stringify(Object.keys(G.companions || {}).map(function (k) { var c = G.companions[k]; return k + (c.unlocked ? "+" : "-") + (c.voie || ""); })));
  console.log("Rations :", JSON.stringify(["petite_ration","ration","grande_ration","outre_pleine"].map(function(k){return k+"="+(G.resources[k]||0);})));
}
