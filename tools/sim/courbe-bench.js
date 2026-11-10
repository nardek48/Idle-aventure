"use strict";
/* tools/sim/courbe-bench.js — v3.764.0 (équilibrage propre C1, Seb 10/11) : les ennemis de quête lus
   contre la courbe de référence du héros, sans combat (rapide).
   Pour chaque rencontre de chaque quête (ADVENTURE_QUESTS) : PV de la rencontre en rounds du héros de
   référence (PV ÷ dégâts par round de la réf.), et coup en % des PV effectifs de la réf. Suivi du héros coupé.
   USAGE : node tools/sim/courbe-bench.js . [--quete id] [--json fichier] */
var fs = require("fs"), path = require("path");
var src = fs.readFileSync(path.join(__dirname, "forecast-calibration-bench.js"), "utf8").replace(/\nmain\(\);\s*$/, "\n");
var ROOT = require("../chemins.js").jeu(process.argv[2]);
var ARGS = process.argv.slice(3);
function arg(n, d) { var i = ARGS.indexOf(n); return i >= 0 ? ARGS[i + 1] : d; }
var mod = { exports: {} };
new Function("require", "process", "module", "__dirname", src + "\nmodule.exports = { g: g, run: run };")(
  require, { argv: [process.argv[0], "x", ROOT], env: process.env }, mod, __dirname);
var g = mod.exports.g, run = mod.exports.run;

run("fullResetState(); game.playerName='Banc'; game.heroId='ranger';");
var W = g.WorldManager, AQ = g.AdventureQuestManager, Q = g.ADVENTURE_QUESTS, H = g.WORLD_HERO_SCALING;
W._heroScaleOff = true; // la courbe remplace le suivi : on lit l'ennemi « nu » de la quête

/* Place de chaque quête dans l'Histoire : l'étape dont le lien vise « adv_<quête> » (chapitre, rang). */
var PLACE = {}, CHAP = ["forest", "desert", "ruins", "crypt", "mountain", "tower"], LONG = {};
Object.keys(g.STORY_QUESTS).forEach(function (c) {
  var sq = g.STORY_QUESTS[c], wid = sq.worldId, steps = sq.steps || [];
  LONG[wid] = steps.length;
  steps.forEach(function (st, i) {
    var l = st.linkTo || {}, card = String(l.cardId || "");
    if (card.indexOf("adv_") === 0 && !PLACE[card.slice(4)]) PLACE[card.slice(4)] = { monde: wid, rang: i + 1, etape: st.id };
  });
});
/* Courbe : héros du robot en fin de chapitre (HERO_SCALING_REFS), début de la Forêt = foret1 ; interpolation
   géométrique sur le rang de l'étape dans le chapitre. */
var FIN = { forest: "joueurForet", desert: "joueurDesert2", ruins: "joueurRuines", crypt: "joueurCrypte", mountain: "joueurMontagne", tower: null };
function debutDe(w) { var i = CHAP.indexOf(w); return i <= 0 ? "foret1" : FIN[CHAP[i - 1]]; }
function courbe(w, rang) {
  var R = g.HERO_SCALING_REFS, a = R[debutDe(w)], b = FIN[w] ? R[FIN[w]] : null;
  if (!b) { var p = R[FIN[CHAP[CHAP.indexOf(w) - 2]]]; b = { dmg: a.dmg * a.dmg / p.dmg, ehp: a.ehp * a.ehp / p.ehp }; } // Tour : on prolonge la pente
  var t = Math.max(0, Math.min(1, rang / Math.max(1, LONG[w] || 20)));
  return { dmg: a.dmg * Math.pow(b.dmg / a.dmg, t), ehp: a.ehp * Math.pow(b.ehp / a.ehp, t) };
}
function refOf(q) {
  var pl = PLACE[q.id];
  if (!pl) return { key: "?", r: null };
  return { key: pl.etape, r: courbe(pl.monde, pl.rang) };
}
/* Coup brut d'un ennemi : puissance × coef (× boss), comme CombatEngine.enemyStrike avant la défense. */
function coup(e) { return Number(e.stats.power || 0) * g.ENEMY_POWER_DMG_COEF * (e.isBoss ? g.BOSS_DMG_MULT : 1); }
function mesure(list, ref) {
  list = [].concat(list).filter(Boolean);
  var hp = 0, hit = 0, bossy = false;
  list.forEach(function (e) { hp += Number(e.maxHp || 0); hit = Math.max(hit, coup(e)); if (e.isBoss) bossy = true; });
  return { n: list.length, rounds: hp / ref.r.dmg, pct: 100 * hit / ref.r.ehp, boss: bossy, nom: list.map(function (e) { return e.name; }).join(" + ") };
}

var lignes = [], seule = arg("--quete", null);
Object.keys(Q).forEach(function (id) {
  if (seule && id !== seule) return;
  var q = Q[id], ref = refOf(q);
  if (!ref.r) return;
  var types = (q.steps || []).map(function (s) { return s.type; });
  try {
    if (Array.isArray(q.encounters) && q.encounters.length) {
      q.encounters.forEach(function (enc, i) {
        var e = g.QuestEnemyManager.spawnFor(AQ._encounterQuest(q, i), false);
        lignes.push({ q: id, monde: q.worldId, ref: ref.key, cran: "rencontre " + (i + 1), m: mesure(e, ref) });
      });
    } else if (types.indexOf("kill") >= 0) {
      lignes.push({ q: id, monde: q.worldId, ref: ref.key, cran: "ennemi", m: mesure(AQ.buildQuestEnemy(q, false), ref) });
    }
    if (types.indexOf("bossKill") >= 0) lignes.push({ q: id, monde: q.worldId, ref: ref.key, cran: "boss", m: mesure(AQ.buildQuestEnemy(q, true), ref) });
  } catch (err) { lignes.push({ q: id, monde: q.worldId, ref: ref.key, cran: "ERREUR " + err.message, m: null }); }
});

console.log("ENNEMIS DE QUÊTE CONTRE LA COURBE — rounds = PV ÷ dégâts/round de la réf. ; coup = % des PV effectifs de la réf. (suivi du héros coupé)\n");
console.log("quête                      monde     étape           cran          nb  rounds  coup %   ennemis");
lignes.forEach(function (l) {
  if (!l.m) { console.log(l.q + "  " + l.cran); return; }
  console.log((l.q).padEnd(27) + (l.monde).padEnd(10) + String(l.ref).padEnd(16) + l.cran.padEnd(14) + String(l.m.n).padStart(2) + l.m.rounds.toFixed(1).padStart(8) + l.m.pct.toFixed(1).padStart(8) + "   " + l.m.nom.slice(0, 60));
});
console.log("\nPAR QUÊTE (médiane des rencontres, boss à part) — dégâts/round et PV eff. de la courbe à l'étape");
var parQ = {};
lignes.forEach(function (l) { if (!l.m) return; var k = l.q; (parQ[k] = parQ[k] || { monde: l.monde, ref: l.ref, r: [], c: [], boss: null }); if (l.cran === "boss") parQ[k].boss = l.m; else { parQ[k].r.push(l.m.rounds); parQ[k].c.push(l.m.pct); } });
function med(a) { a = a.slice().sort(function (x, y) { return x - y; }); return a.length ? a[Math.floor(a.length / 2)] : NaN; }
Object.keys(parQ).sort(function (a, b) { var A = PLACE[a], B = PLACE[b]; return (CHAP.indexOf(A.monde) - CHAP.indexOf(B.monde)) || (A.rang - B.rang); }).forEach(function (k) {
  var p = parQ[k], c = courbe(PLACE[k].monde, PLACE[k].rang);
  console.log(k.padEnd(27) + p.ref.padEnd(16) + ("réf " + Math.round(c.dmg) + "/" + Math.round(c.ehp)).padEnd(16) + "rounds " + (p.r.length ? med(p.r).toFixed(1) : "  - ").padStart(5) + "  coup " + (p.c.length ? med(p.c).toFixed(1) : "  - ").padStart(5) + " %" + (p.boss ? "   boss " + p.boss.rounds.toFixed(1) + " r, " + p.boss.pct.toFixed(1) + " %" : ""));
});
var out = arg("--json", null);
if (out) { fs.writeFileSync(out, JSON.stringify(lignes, null, 1)); console.log("\nJSON : " + out); }
