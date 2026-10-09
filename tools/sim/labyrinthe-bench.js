"use strict";
/* tools/sim/labyrinthe-bench.js — v3.434.0 (Ruines, RU12) : le Labyrinthe aux leviers.
   Livraison 1 : pertes de PV estimées des trois combats (garde, Contremaître, Gardien) aux profils
   des Ruines, héros seul (règle des Petites Aventures).
   Livraison 2 (--robot) : un joueur qui explore dans le noir, sans connaître le plan ; il ne sait
   que ce qu'Edda a dessiné. Mesure : profondeur, pas, Souffle, prises du Contremaître, gains.
   USAGE : node tools/sim/labyrinthe-bench.js . [--profil palier|rare] [--robot] [--runs N] [--prudent] */
var fs = require("fs"), path = require("path");
var base = fs.readFileSync(path.join(__dirname, "plafond-bench.js"), "utf8");
base = base.slice(0, base.indexOf('console.log("COMBATS DE L\'HISTOIRE'));
var ARGV = process.argv.slice(3);
function arg(k) { return ARGV.indexOf(k) >= 0 ? ARGV[ARGV.indexOf(k) + 1] : null; }
var PROFIL_ARG = arg("--profil");
var ROBOT = ARGV.indexOf("--robot") >= 0, RUNS = Number(arg("--runs") || 60), PRUDENT = ARGV.indexOf("--prudent") >= 0;

var extra = function () {
  PROFILS.palier = { label: "Palier de l'acte II", train: 120, gear: "palier", points: 12, wenna: 5, maddoc: 4 };
  PROFILS.rare = { label: "Palier Rare (acte III)", train: 130, gear: "rare", points: 13, wenna: 5, maddoc: 5 };
  var _equipFor = equipFor;
  equipFor = function (p) {
    if (p.gear !== "palier" && p.gear !== "rare") return _equipFor(p);
    _equipFor({ gear: "cite" });
    var it = g.EliteManager.buildUniqueLoot("arme_fleuve");
    if (it) g.game.equipped.weapon = it;
    var E = g.game.equipped, order = g.RARITY_ORDER;
    g.EQUIPMENT_SLOTS.forEach(function (slot) {
      if (E[slot] && order.indexOf(E[slot].rarity) >= order.indexOf("green")) return;
      var n = g.generateEquipmentItem(slot, "green", 2); if (n) E[slot] = n;
    });
    g.game.forge = { levels: { weapon: 4, armor: 4, helmet: 3, gloves: 3, boots: 3, ring: 2, amulet: 2 } };
    if (p.gear === "rare") {
      ["armor", "helmet", "boots"].forEach(function (slot) { var n = g.generateEquipmentItem(slot, "rare", 2); if (n) E[slot] = n; });
      g.game.forge.levels.weapon = 7;
    }
  };
  var L = g.LabyrinthRun, C = g.LABYRINTH_CONFIG;
  /* ---------- Le robot explorateur ---------- */
  /* Un pas de joueur : aller vers la salle inconnue la plus proche (par les salles dessinées),
     sinon vers l'escalier dès qu'il est vu, sinon tirer le levier vu le moins tiré. Il ne connaît
     que ce qu'il a vu ; il descend si PV et Souffle le permettent (voir decide). */
  function robotFloor(st) {
    var run = g.game.sceneRun, F = run.F, guard = 0;
    while (run.status === "lab-map" && guard++ < 400) {
      if (run.at === F.stairs) return true;
      var known = function (d, m) { return L.openNow(run, d) && (run.seen[m] || L.isLit(run, m)); };
      var target = null, path = null;
      if (run.seen[F.stairs] || L.isLit(run, F.stairs)) { path = L.pathTo(F, run.at, F.stairs, known); if (path) target = "stairs"; }
      if (!path) {   // la salle inconnue la plus proche
        var d = {}, prev = {}, q = [run.at]; d[run.at] = 0; prev[run.at] = null; var found = null;
        while (q.length && !found) { var k = q.shift(); L.nbrs(F, k).forEach(function (m) { if (found || d[m] != null || !L.openNow(run, L.door(k, m))) return; d[m] = d[k] + 1; prev[m] = k; if (!run.seen[m]) found = m; else q.push(m); }); }
        if (found) { path = []; var c = found; while (c) { path.unshift(c); c = prev[c]; } target = "explore"; }
      }
      if (!path) {   // plus rien à voir dans cet état des pans : on le note épuisé, puis un levier
        /* Le joueur lit la carte d'Edda : il sait ce que fait un levier déjà tiré. Il tire d'abord un levier
           inconnu, sinon celui qui mène à un état des pans pas encore exploré. */
        st.done = st.done || {}; st.done[run.floor + "#" + run.bits] = 1;
        var lv = F.levers.map(function (k, i) { var known = !!run.pulled[i]; return { k: k, i: i, known: known, fresh: !known || !st.done[run.floor + "#" + (run.bits ^ F.map[i])] }; })
          .filter(function (x) { return run.seen[x.k] && x.fresh; });
        lv.sort(function (a, b) { return (a.known ? 1 : 0) - (b.known ? 1 : 0); });
        var pick = null; for (var j = 0; j < lv.length && !pick; j++) { var pp = L.pathTo(F, run.at, lv[j].k, known); if (pp) { pick = lv[j]; path = pp; } }
        if (!pick) return false;   // coincé : remonter
        if (path.length === 1) {   // déjà sur le levier
          if (pick.i === F.guarded && run.guardUp) { st.fights++; L.fightGuard(pick.i); if (run.status !== "lab-map") return false; }
          st.pulls++; if (!L.pull(pick.i).ok) return false; continue;
        }
        target = "lever";
      }
      var next = path[1];
      var hp0 = g.game.heroHp, r = L.move(next);
      if (!r.ok) return false;
      st.steps++;
      if (r.event === "caught") st.caught++;
      if (run.status !== "lab-map") return false;
      if (r.event === "lever" && !run.pulled[L.leverAt(run, run.at)]) {   // un levier découvert : le tirer une fois (combat de garde d'abord)
        var li = L.leverAt(run, run.at);
        if (li === F.guarded && run.guardUp) { st.fights++; L.fightGuard(li); if (run.status !== "lab-map") return false; }
        st.pulls++; L.pull(li); if (run.status !== "lab-map") return false;
      }
    }
    return run.at === F.stairs;
  }
  function decide(run) {   // descendre ?
    var hp = g.game.heroHp / g.game.heroMaxHp;
    return PRUDENT ? (hp > 0.6 && run.breath >= 50) : (hp > 0.4 && run.breath >= 35);
  }
  function robotBench(profils) {
    console.log("LABYRINTHE — robot explorateur, " + RUNS + " descentes par classe, " + (PRUDENT ? "prudent" : "normal") + " (descend si PV > " + (PRUDENT ? 60 : 40) + " % et Souffle ≥ " + (PRUDENT ? 50 : 35) + ")");
    var SQ = g.StoryQuestManager; SQ.isStepReached = function () { return true; };
    profils.forEach(function (pid) {
      console.log(PROFILS[pid].label);
      B.CLASSES.forEach(function (c) {
        var tot = { depth: 0, steps: 0, best: 0, pulls: 0, caught: 0, fights: 0, stones: 0, gold: 0, ko: 0, souffle: 0, remonte: 0, stuck: 0, floors: 0, depths: {} };
        for (var i = 0; i < RUNS; i++) {
          prepare(c, PROFILS[pid], 2, true, true);
          g.game.heroHp = g.game.heroMaxHp; g.game.sceneRun = null; g.game.explorationProgression.labyrinth = null;
          g.WarehouseManager.addResource("petite_ration", 1);
          if (!L.start().ok) { console.log("départ refusé"); return; }
          var run = g.game.sceneRun, st = { steps: 0, pulls: 0, caught: 0, fights: 0 };
          while (run.status === "lab-map") {
            var okF = robotFloor(st);
            if (run.status !== "lab-map") break;
            if (!okF) {   // coincé : le robot s'est-il perdu, ou l'étage n'a-t-il plus d'issue ?
              var F0 = run.F, saveS = F0.start; F0.start = run.at;
              var sv = run.bits, sol = (function () { var seen = {}, q = [{ k: run.at, bits: sv }]; seen[run.at + "#" + sv] = 1;
                while (q.length) { var s2 = q.shift(); if (s2.k === F0.stairs) return true;
                  L.nbrs(F0, s2.k).forEach(function (m) { if (L.isOpen(F0, L.door(s2.k, m), s2.bits) && !seen[m + "#" + s2.bits]) { seen[m + "#" + s2.bits] = 1; q.push({ k: m, bits: s2.bits }); } });
                  F0.levers.forEach(function (lk, li) { if (lk === s2.k) { var b2 = s2.bits ^ F0.map[li]; if (!seen[s2.k + "#" + b2]) { seen[s2.k + "#" + b2] = 1; q.push({ k: s2.k, bits: b2 }); } } }); }
                return false; })();
              F0.start = saveS; if (sol) tot.lost = (tot.lost || 0) + 1; else tot.trap = (tot.trap || 0) + 1;
              tot.stuck++; L.finish("remonte"); break; }
            tot.floors++;
            if (!run.bossDown) { st.fights++; L.fightBoss(); if (run.status !== "lab-map") break; }
            L.claimStairs();
            if (decide(run)) L.descend(); else L.finish("remonte");
          }
          var e = run.end || {}, kept = (e.summary && e.summary.kept) || { gold: 0, resources: {} };
          tot[e.how] = (tot[e.how] || 0) + 1;
          if (e.floor === 1) { tot.f1 = tot.f1 || {}; tot.f1[e.how] = (tot.f1[e.how] || 0) + 1; if (process.env.TRACE_F1 && e.how !== "remonte") console.log("      [ét.1] " + e.how + " · PV " + Math.round(100 * g.game.heroHp / g.game.heroMaxHp) + " % · Souffle " + run.breath + " · pas " + st.steps + " · tirages " + st.pulls + " · combats " + st.fights); }
          tot.depth += e.floor; tot.best = Math.max(tot.best, e.floor); tot.depths[e.floor] = (tot.depths[e.floor] || 0) + 1;
          tot.steps += st.steps; tot.pulls += st.pulls; tot.caught += st.caught; tot.fights += st.fights;
          tot.stones += Number((kept.resources || {})[C.stoneResource] || 0); tot.gold += Number(kept.gold || 0);
        }
        var n = RUNS;
        console.log("   " + c.label.padEnd(10) + " profondeur moy. " + (tot.depth / n).toFixed(1) + " (max " + tot.best + ") · fins : remonté " + Math.round(100 * (tot.remonte || 0) / n) + " %, tombé " + Math.round(100 * (tot.ko || 0) / n) + " %, souffle " + Math.round(100 * (tot.souffle || 0) / n) + " %, coincé " + tot.stuck
          + " (perdu " + (tot.lost || 0) + ", sans issue " + (tot.trap || 0) + ")" + " · pas/étage " + (tot.steps / Math.max(1, tot.depth)).toFixed(1) + " · tirages/étage " + (tot.pulls / Math.max(1, tot.depth)).toFixed(1) + " · prises/descente " + (tot.caught / n).toFixed(2)
          + " · Pierres/descente " + (tot.stones / n).toFixed(1) + " · or " + Math.round(tot.gold / n));
        if (tot.f1) console.log("      fins à l'étage 1 : " + JSON.stringify(tot.f1));
        console.log("      répartition des profondeurs : " + Object.keys(tot.depths).sort(function (a, b) { return a - b; }).map(function (k) { return "ét." + k + " " + Math.round(100 * tot.depths[k] / n) + " %"; }).join(" · "));
      });
    });
  }

  var profils = PROFIL_ARG ? [PROFIL_ARG] : ["palier", "rare"];
  if (ROBOT) return robotBench(profils);
  console.log("LABYRINTHE AUX LEVIERS — PV perdus estimés (% des PV max, héros seul, comme les Petites Aventures)");
  profils.forEach(function (pid) {
    console.log(PROFILS[pid].label);
    B.CLASSES.forEach(function (c) {
      B.seedRng(91000);
      prepare(c, PROFILS[pid], 2, true, true);
      g.game.heroHp = g.game.heroMaxHp;
      g.game.sceneRun = { lab: true, status: "lab-map", worldId: "ruins", floor: 1, heroScale: null };
      var run = g.game.sceneRun, out = [];
      [1, 3, 5].forEach(function (f) {
        run.floor = f;
        var gd = C.guardFoes.map(function (id) { run.guardFoe = id; var e = L.estimate("guard"); return e.unwinnable ? "∞" : Math.round(100 * e.hpLoss / g.game.heroMaxHp); });
        out.push("ét." + f + " garde " + gd.join("/") + " %");
      });
      var ef = L.estimate("foe"), eb = L.estimate("boss");
      out.push("Contremaître " + (ef.unwinnable ? "∞" : Math.round(100 * ef.hpLoss / g.game.heroMaxHp)) + " %");
      out.push("Gardien " + (eb.unwinnable ? "∞" : Math.round(100 * eb.hpLoss / g.game.heroMaxHp)) + " %");
      console.log("   " + c.label.padEnd(10) + " PV " + g.game.heroMaxHp + " · " + out.join(" · "));
      g.game.sceneRun = null;
    });
  });
};
eval(base + "\n(" + extra.toString() + ")();");
