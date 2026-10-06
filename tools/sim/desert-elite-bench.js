"use strict";
/* tools/sim/desert-elite-bench.js — v3.314.0 : élites de secteur de la carte du Désert.
   Joue le combat tel que LivingMapManager.startEliteFight le lance : sortie "mapelite",
   EliteManager.spawn à l'échelle du Désert, héros en mode Grimoire, Wenna et Maddoc présents,
   potion de soin mineure sous 35 % de PV.

   Sert à caler serment_armure (étape 11) et, plus tard, dard_profondeurs (étape 14).
   Balaie plusieurs couples puissance / endurance pour montrer LEQUEL des deux déplace
   l'échec — le banc de l'acte II a déjà montré que les PV allongent sans durcir.

   USAGE : node tools/sim/desert-elite-bench.js . [--runs N] [--elite id] [--sweep]
     --runs   runs par cellule (défaut 120)
     --elite  identifiant d'ELITE_DB (défaut serment_armure)
     --sweep  balaie les couples power/endurance au lieu de mesurer la donnée en place */
var fs = require("fs"), path = require("path");
var src = fs.readFileSync(path.join(__dirname, "forecast-calibration-bench.js"), "utf8").replace(/\nmain\(\);\s*$/, "\n");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
var RUNS = 120, ELITE = "serment_armure", SWEEP = false, PROFIL_ID = "acte2";
for (var ai = 3; ai < process.argv.length; ai++) {
  if (process.argv[ai] === "--runs") RUNS = Number(process.argv[ai + 1]) || RUNS;
  if (process.argv[ai] === "--elite") ELITE = process.argv[ai + 1] || ELITE;
  if (process.argv[ai] === "--sweep") SWEEP = true;
  if (process.argv[ai] === "--profil") PROFIL_ID = process.argv[ai + 1] || PROFIL_ID; // acte2 | palier
}
var mod = { exports: {} };
new Function("require", "process", "module", "__dirname", src + "\nmodule.exports = { g: g, run: run, seedRng: seedRng, setup: setup, CLASSES: CLASSES };")(
  require, { argv: [process.argv[0], "x", ROOT] }, mod, __dirname);
var B = mod.exports, g = B.g;

/* Profil : celui de l'acte II (arme 30 + vitrine, entraînement 40), deux potions.
   L'étape 11 vient AVANT le palier de l'étape 13 : on mesure donc au niveau d'équipement
   de la fin de l'acte II, pas à celui du palier. */
/* Deux profils : avant le palier (étape 11) et après (étape 14). Le palier de l'étape 13
   demande 4 emplacements Inhabituels dont l'arme, la Forge 3 et l'arme reforgée à 4 — d'où
   une arme nettement au-dessus et un entraînement plus haut. */
var PROFILS = {
  acte2: { label: "fin d'acte II (arme 30 + vitrine, entr. 40)", weapon: 30, kit: true, train: 40, potions: 2, voie: "tronc" },
  palier: { label: "après le palier de l'étape 13 (arme 45 + vitrine, entr. 70)", weapon: 45, kit: true, train: 70, potions: 2, voie: "tronc" }
};
var PROFIL = PROFILS[PROFIL_ID] || PROFILS.acte2;

/* Couples balayés : on fait varier la puissance À PART de l'endurance, pour que la sortie
   dise laquelle des deux porte la difficulté. */
var SWEEP_CELLS = [
  { power: 1.40, endurance: 1.6 }, { power: 2.00, endurance: 1.6 }, { power: 2.60, endurance: 1.6 },
  { power: 3.20, endurance: 1.6 }, { power: 2.60, endurance: 2.2 }
];

function autoRound() {
  var mx = g.game.heroMaxHp;
  if (mx > 0 && g.game.heroHp / mx < 0.35 && g.CombatEngine.heroAction("potion", "potion_soin_mineur", "auto")) return true;
  var d = g.ClassCombatManager.chooseRoundAction(true);
  if (d && d.slot && d.slot !== "basic" && g.CombatEngine.heroAction(d.slot, { matchedConditionId: d.matchedConditionId || null }, "auto")) return true;
  return g.CombatEngine.heroAction("basic", null, "auto");
}

function duel(c, eliteId) {
  B.setup(c.hero, c.id, PROFIL);
  g.WorldManager.worldIndex = 1; // Désert : compagnons et élite à cette échelle
  B.run("game.unlockedTabs.grimoire = true; game.combatMode = 'grimoire'; CompanionManager.unlock('wenna'); CompanionManager.unlock('maddoc');");
  g.CompanionManager.state("maddoc").voie = PROFIL.voie;
  g.CompanionManager.healAll();
  g.game.activeTab = "combat";
  g.SortieManager.end("return");
  if (!g.SortieManager.start("mapelite")) return null;
  var pot0 = Number(g.game.healingPotionsOwned.potion_soin_mineur || 0);
  var enemy = g.EliteManager.spawn(eliteId, "desert", 0, { brakeMult: 1 });
  if (!enemy) return null;
  /* v3.318.0 — PIÈGE : EliteManager.spawn ne reconstruit le groupe allié que s'il y a une
     escorte (CombatEngine.spawnGroup). Sans escorte, il pose game.enemy et s'arrête : les
     alliés restent ceux de l'état courant. Dans un banc fraîchement réinitialisé, le héros
     se bat donc SEUL, et les chiffres n'ont rien à voir. On rebâtit le groupe explicitement. */
  g.CompanionManager.onCombatStart();
  var hpMax = g.game.heroMaxHp, rounds = 0, guard = 600;
  while (g.game.enemy === enemy && enemy.hp > 0 && g.game.heroHp > 0 && guard-- > 0) {
    if (!autoRound()) break;
    rounds++;
  }
  return {
    ok: enemy.hp <= 0 && g.game.heroHp > 0,
    rounds: rounds,
    hp: Math.max(0, g.game.heroHp) / hpMax,
    pots: pot0 - Number(g.game.healingPotionsOwned.potion_soin_mineur || 0)
  };
}

function cellule(eliteId, label) {
  console.log(" " + label);
  B.CLASSES.forEach(function (c) {
    var ok = 0, rounds = 0, hp = 0, pots = 0, n = 0;
    for (var i = 0; i < RUNS; i++) {
      B.seedRng(84000 + i);
      var r = duel(c, eliteId);
      if (!r) continue;
      n++;
      if (r.ok) { ok++; rounds += r.rounds; hp += r.hp; }
      pots += r.pots;
    }
    if (!n) { console.log("   " + c.label.padEnd(10) + " — combat indisponible"); return; }
    console.log("   " + c.label.padEnd(10)
      + " réussite " + String(Math.round(100 * ok / n)).padStart(3) + " %"
      + "   rounds " + (ok ? (rounds / ok).toFixed(0) : "—").padStart(3)
      + "   PV à l'arrivée " + (ok ? Math.round(100 * hp / ok) + " %" : "—").padStart(5)
      + "   potions bues " + (pots / n).toFixed(1));
  });
}

var def = g.ELITE_DB && g.ELITE_DB[ELITE];
if (!def) { console.log("Élite inconnue : " + ELITE); process.exit(1); }

console.log("ÉLITE DE SECTEUR — " + def.name + " (" + ELITE + ", base " + def.baseId + ")");
console.log("Profil : " + PROFIL.label + " · Wenna et Maddoc présents · " + RUNS + " runs par cellule\n");

if (!SWEEP) {
  cellule(ELITE, "donnée en place (puissance ×" + def.statMult.power + ", endurance ×" + def.statMult.endurance + ")");
} else {
  var base = { power: def.statMult.power, endurance: def.statMult.endurance, celerity: def.statMult.celerity };
  SWEEP_CELLS.forEach(function (cell) {
    def.statMult.power = cell.power;
    def.statMult.endurance = cell.endurance;
    cellule(ELITE, "puissance ×" + cell.power.toFixed(2) + "   endurance ×" + cell.endurance.toFixed(1));
  });
  def.statMult.power = base.power;
  def.statMult.endurance = base.endurance;
  def.statMult.celerity = base.celerity;
}
console.log("");
