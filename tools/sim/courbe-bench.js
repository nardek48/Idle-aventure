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
new Function("require", "process", "module", "__dirname", src + "\nmodule.exports = { g: g, run: run, seedRng: seedRng };")(
  require, { argv: [process.argv[0], "x", ROOT], env: process.env }, mod, __dirname);
var g = mod.exports.g, run = mod.exports.run, seedRng = mod.exports.seedRng; // tirage fixé : mêmes ennemis d'un relevé à l'autre

run("fullResetState(); game.playerName='Banc'; game.heroId='ranger';");
var W = g.WorldManager, AQ = g.AdventureQuestManager, Q = g.ADVENTURE_QUESTS, H = g.WORLD_HERO_SCALING || {}; // v3.767.0 : retiré (--implicite lit l'avant C1)
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
  if (!pl) return { key: "hors-Histoire", r: { dmg: 1, ehp: 1 } }; // rounds / coup sans unité : seuls PV et coup comptent
  return { key: pl.etape, r: courbe(pl.monde, pl.rang) };
}
/* Coup brut d'un ennemi : puissance × coef (× boss), comme CombatEngine.enemyStrike avant la défense. */
function coup(e) { return Number(e.stats.power || 0) * g.ENEMY_POWER_DMG_COEF * (e.isBoss ? g.BOSS_DMG_MULT : 1); }
function mesure(list, ref) {
  list = [].concat(list).filter(Boolean);
  var hp = 0, hit = 0, bossy = false, vit = 0;
  list.forEach(function (e) { hp += Number(e.maxHp || 0); hit = Math.max(hit, coup(e)); vit = Math.max(vit, Number((e.stats && e.stats.celerity) || 0)); if (e.isBoss) bossy = true; });
  return { n: list.length, hp: hp, coup: hit, vit: vit, rounds: hp / ref.r.dmg, pct: 100 * hit / ref.r.ehp, boss: bossy, nom: list.map(function (e) { return e.name; }).join(" + ") };
}

var COURBE_ORDRE = ["forest", "desert", "ruins", "crypt", "mountain", "tower"];
var lignes = [], seule = arg("--quete", null);
Object.keys(Q).forEach(function (id) {
  if (seule && id !== seule) return;
  var q = Q[id], ref = refOf(q);
  if (!ref.r) return;
  var types = (q.steps || []).map(function (s) { return s.type; });
  try {
    if (Array.isArray(q.encounters) && q.encounters.length) {
      q.encounters.forEach(function (enc, i) {
        seedRng(7); var e = g.QuestEnemyManager.spawnFor(AQ._encounterQuest(q, i), false);
        lignes.push({ q: id, monde: q.worldId, ref: ref.key, cran: "rencontre " + (i + 1), m: mesure(e, ref) });
      });
    } else if (types.indexOf("kill") >= 0) {
      seedRng(7); lignes.push({ q: id, monde: q.worldId, ref: ref.key, cran: "ennemi", m: mesure(AQ.buildQuestEnemy(q, false), ref) });
    }
    if (types.indexOf("bossKill") >= 0 && (seedRng(7) || true)) lignes.push({ q: id, monde: q.worldId, ref: ref.key, cran: "boss", m: mesure(AQ.buildQuestEnemy(q, true), ref) });
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
Object.keys(parQ).filter(function (k) { return !!PLACE[k]; }).sort(function (a, b) { var A = PLACE[a], B = PLACE[b]; return (CHAP.indexOf(A.monde) - CHAP.indexOf(B.monde)) || (A.rang - B.rang); }).forEach(function (k) {
  var p = parQ[k], c = courbe(PLACE[k].monde, PLACE[k].rang);
  console.log(k.padEnd(27) + p.ref.padEnd(16) + ("réf " + Math.round(c.dmg) + "/" + Math.round(c.ehp)).padEnd(16) + "rounds " + (p.r.length ? med(p.r).toFixed(1) : "  - ").padStart(5) + "  coup " + (p.c.length ? med(p.c).toFixed(1) : "  - ").padStart(5) + " %" + (p.boss ? "   boss " + p.boss.rounds.toFixed(1) + " r, " + p.boss.pct.toFixed(1) + " %" : ""));
});
var out = arg("--json", null);
if (out) { fs.writeFileSync(out, JSON.stringify(lignes, null, 1)); console.log("\nJSON : " + out); }

/* --implicite : valeurs de chaque quête dans les unités de la courbe (mêmes fonctions que le jeu,
   QuestEnemyManager.placeOf / courbeRef / baseline) — rounds et coup d'un ennemi moyen, puis du boss. */
if (ARGS.indexOf("--implicite") >= 0) {
  var QE = g.QuestEnemyManager, QEW = H.questEnemyByWorld || {}, QBW = H.questBossHpByWorld || {};
  var rows = [];
  Object.keys(Q).forEach(function (id) {
    var q = Q[id], pl = QE.placeOf(q), ref = QE.courbeRef(pl.monde, pl.rang, pl.longueur);
    var wi = g.WORLDS.findIndex(function (w) { return w.id === q.worldId; }), ai = Number(q.adventureIndex || 0);
    var b0 = QE.baseline(wi, ai, null), wm = QEW[q.worldId] || {};
    var hpN = Number(Array.isArray(q.encounters) ? (q.encounterHpMult || 1) : (q.enemyHpMult || 1)) * Number(wm.hp || 1);
    var pwN = Number(q.enemyPowerMult || 1) * Number(wm.power || 1);
    var r = { id: id, monde: q.worldId, rang: pl.rang, diff: q.difficulty || "-", T: hpN * b0.hp / ref.dmg, h: 100 * pwN * b0.coup / ref.ehp };
    var types = (q.steps || []).map(function (s) { return s.type; });
    if (types.indexOf("bossKill") >= 0) {
      var adv = g.WORLDS[wi].adventures[ai], bb = QE.baseline(wi, ai, q.bossId || adv.boss);
      var hpB = Number(q.bossHpMult != null ? q.bossHpMult : (q.enemyHpMult || 1)) * (q.noWorldBossHp ? 1 : Number(QBW[q.worldId] || 1));
      var pwB = Number(q.bossPowerMult != null ? q.bossPowerMult : (q.enemyPowerMult || 1));
      r.Tb = hpB * bb.hp / ref.dmg; r.hb = 100 * pwB * bb.coup / ref.ehp;
    }
    rows.push(r);
  });
  rows.sort(function (a, b) { return (COURBE_ORDRE.indexOf(a.monde) - COURBE_ORDRE.indexOf(b.monde)) || (a.rang - b.rang); });
  console.log("\nIMPLICITE — ennemi moyen de la quête : rounds (PV ÷ dégâts/round de la réf.) et coup (% PV eff.) ; boss à part");
  rows.forEach(function (r) {
    console.log(r.id.padEnd(26) + r.monde.padEnd(9) + String(r.rang).padStart(3) + "  " + r.diff.padEnd(7) + "rounds " + r.T.toFixed(2).padStart(6) + "  coup " + r.h.toFixed(1).padStart(5) + " %" + (r.Tb != null ? "   boss " + r.Tb.toFixed(1).padStart(5) + " r  " + r.hb.toFixed(1).padStart(5) + " %" : ""));
  });
  var oj = arg("--json-implicite", null); if (oj) fs.writeFileSync(oj, JSON.stringify(rows, null, 1));
}

/* --donjons (C2, relevé) : chaque vague des donjons au niveau 1, sans Marque, en unités de la courbe.
   Étape du donjon : requiresStoryStep, sinon la première étape du chapitre qui mène à l'onglet Donjon. */
if (ARGS.indexOf("--donjons") >= 0) {
  var QE2 = g.QuestEnemyManager, DM = g.DungeonManager;
  QE2.placeOf({ id: "_amorce" }); // construit la table des étapes
  var etapeDonjon = function (d) {
    if (d.requiresStoryStep && QE2._places["step:" + d.requiresStoryStep]) return QE2._places["step:" + d.requiresStoryStep];
    var sq = null; Object.keys(g.STORY_QUESTS).forEach(function (c) { if (g.STORY_QUESTS[c].worldId === d.worldId) sq = g.STORY_QUESTS[c]; });
    var st = sq && (sq.steps || []).filter(function (x) { return x.linkTo && x.linkTo.tab === "dungeon"; })[0];
    return st ? QE2._places["step:" + st.id] : { monde: d.worldId, rang: 10 };
  };
  var resume = [];
  console.log("\nDONJONS — niveau 1, sans Marque ; rounds = PV de la vague ÷ dégâts/round du héros attendu ; coup = % de ses PV effectifs");
  g.DUNGEONS.forEach(function (d) {
    var pl = etapeDonjon(d), lg = QE2._longueurs[pl.monde] || 20, ref = QE2.courbeRef(pl.monde, pl.rang, lg);
    DM.ensure(); g.game.dungeonRun = { active: true, dungeonId: d.id, wave: 1, level: 1, marks: [] };
    var vagues = [];
    for (var w = 1; w <= g.DUNGEON_CONFIG.waveCount + 1; w++) {
      seedRng(11 + w); g.game.dungeonRun.wave = w;
      var e = DM.buildWaveEnemy(w), m = mesure(e, { r: ref });
      var kind = w > g.DUNGEON_CONFIG.waveCount ? "boss" : (d.eliteWaves && d.eliteWaves[w] ? "élite" : (d.groupWaves && d.groupWaves[w] ? "groupe" : "vague"));
      vagues.push({ w: w, kind: kind, m: m });
    }
    g.game.dungeonRun = { active: false };
    var norm = vagues.filter(function (v) { return v.kind === "vague" || v.kind === "groupe"; });
    var medR = norm.map(function (v) { return v.m.rounds; }).sort(function (a, b) { return a - b; })[Math.floor(norm.length / 2)];
    var medC = norm.map(function (v) { return v.m.pct; }).sort(function (a, b) { return a - b; })[Math.floor(norm.length / 2)];
    var tot = norm.reduce(function (s, v) { return s + v.m.rounds; }, 0);
    console.log("\n" + d.id + " " + (d.key || "").padEnd(9) + " étape " + (pl.monde + ":" + pl.rang).padEnd(12) + " diff ×" + d.difficultyMult + "  — vagues : médiane " + medR.toFixed(1) + " r, " + medC.toFixed(1) + " %  (total " + tot.toFixed(0) + " r)");
    vagues.forEach(function (v) {
      if (v.kind === "vague" && v.w !== 1 && v.w !== g.DUNGEON_CONFIG.waveCount) return;
      console.log("    v" + String(v.w).padStart(2) + " " + v.kind.padEnd(7) + v.m.rounds.toFixed(1).padStart(6) + " r " + v.m.pct.toFixed(1).padStart(6) + " %   " + v.m.nom.slice(0, 60));
    });
    resume.push({ id: d.id, key: d.key, monde: pl.monde, rang: pl.rang, vagues: vagues });
  });
  var od = arg("--json-donjons", null); if (od) fs.writeFileSync(od, JSON.stringify(resume, null, 1));
}

/* --elites (C2, relevé) : élites de la carte (niveau 1, sans frein) et élites de quête (eliteKill), escorte comprise. */
if (ARGS.indexOf("--elites") >= 0) {
  var EM = g.EliteManager, sortie = [];
  var avecEscorte = function (eid, worldId, ai, opts) {
    var e = EM.make(eid, worldId, ai, opts), def = g.ELITE_DB[eid], wi = g.WORLDS.findIndex(function (w) { return w.id === worldId; });
    var esc = (def && def.escort) ? EM.buildEscort(def.escort, Math.max(0, wi), ai) : [];
    return [e].concat(esc || []);
  };
  Object.keys(g.LIVING_MAPS).forEach(function (mid) {
    var map = g.LIVING_MAPS[mid];
    (map.sectors || []).forEach(function (sec) {
      var c = sec.content || {};
      if (c.type !== "elite" || !c.eliteId) return;
      seedRng(5); var l = avecEscorte(c.eliteId, map.worldId, 0, { brakeMult: 1, levelMult: { hp: 1, power: 1, gold: 1 } });
      sortie.push({ ctx: "carte", id: c.eliteId, monde: map.worldId, m: mesure(l, { r: { dmg: 1, ehp: 1 } }) });
    });
  });
  Object.keys(Q).forEach(function (id) {
    var q = Q[id]; if (!q.eliteId) return;
    seedRng(5); var l = avecEscorte(q.eliteId, q.worldId, q.adventureIndex || 0, q.eliteStatMult ? { statMult: q.eliteStatMult } : null);
    sortie.push({ ctx: "quête " + id, id: q.eliteId, monde: q.worldId, m: mesure(l, { r: { dmg: 1, ehp: 1 } }) });
  });
  console.log("\nÉLITES — PV totaux, coup brut maximal, vitesse maximale");
  sortie.forEach(function (x) { console.log(x.ctx.padEnd(30) + x.id.padEnd(22) + x.monde.padEnd(9) + String(Math.round(x.m.hp)).padStart(8) + String(Math.round(x.m.coup)).padStart(7) + String(x.m.vit).padStart(6) + "   " + x.m.nom.slice(0, 50)); });
  var oe = arg("--json-elites", null); if (oe) fs.writeFileSync(oe, JSON.stringify(sortie, null, 1));
}
