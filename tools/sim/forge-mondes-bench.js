"use strict";
/* tools/sim/forge-mondes-bench.js — refonte de la Forge « remplacer » (Seb 07/11) : la reforge ne touche plus la pièce,
   chaque reforge donne +X % d'une stat héros liée au monde de sa bande (4 reforges par emplacement et par monde, 7 emplacements).
   Vrai moteur dans un vm (socle de charge-bench.js) ; rien du jeu ne change : profils posés par ENVELOPPES dans le contexte du banc
   (ForgeManager.getLevel pour la forge actuelle, StatsSystem.recalcStats pour les bonus de la refonte, appliqués après la recomposition).

   Héros : sauvegardes du robot (--joueur) à l'entrée de la quête de boss de fin de monde (captures/bouclier-soin/saves).
   Profils : save (forge de la sauvegarde) · nf (aucune forge) · actuel (7 emplacements au plafond du monde : Forge 3/4/5/6/7 ×2)
             · r04 / r05 / r06 (refonte, 0,4 / 0,5 / 0,6 % par reforge, toutes les bandes des mondes finis, pièces nues)
             · r05dr (r05, Défense relative ×(1+b) au lieu de points) · r05x<stat> (r05 sans la stat <stat> : hp, def, cm, dmg, cc).
   Bandes (proposition) : Désert PV max (multiplicatif, comme maxHpPct) · Ruines Défense (points, sous le plafond 60 %)
             · Crypte dégâts critiques (critMult ×(1+b)) · Montagne dégâts (tapMult +b, comme les gants : Force seule) · Tour critique (points).
   Combats repères : la quête de boss de fin de monde jouée en entier, et l'élite répétable de la carte du monde (niveau 1, 0 victoire du jour).
   Politique : « Tout préparer » (pronostic, 3 règles), potion à la main sous 30 %, comme boss-courts-bench.js (prepare3).

   USAGE : node tools/sim/forge-mondes-bench.js . [--runs 60] [--classes knight,ranger,mage] [--mondes desert,ruines,crypte,montagne,tour]
             [--profils save,nf,actuel,r04,r05,r06] [--jobs 4] [--tag fm]     sorties : captures/forge-mondes/<tag>-<runs>runs.{txt,json} */
var fs = require("fs"), path = require("path"), cp = require("child_process");
var CB = require("./charge-bench.js");
var CH = require("../chemins.js");
var ROOT = CH.jeu(process.argv[2]);
var ARGS = process.argv.slice(3);
function opt(k, d) { var i = ARGS.indexOf(k); return i >= 0 ? ARGS[i + 1] : d; }
var RUNS = Number(opt("--runs", 60));
var WORKER = ARGS.indexOf("--worker") >= 0;
var SAVES = opt("--saves", path.join(CH.DEPOT, "captures", "bouclier-soin", "saves"));

// wi = index de monde (WORLD_CAPS) ; boss = quête de fin de monde ; elite = élite répétable de la carte
var MONDES = {
  desert: { wi: 1, step: "desert_17", chap: "desert", quest: "aq_desert_trone", boss: "Nezzam", elite: { map: "desert", sector: "bete_dune", id: "dard_profondeurs", nom: "Dard des profondeurs" } },
  ruines: { wi: 2, step: "ruines_19", chap: "ruins", quest: "aq_ruines_plan", boss: "Maître d'œuvre", elite: { map: "ruins", sector: "tour_garde", id: "golem_tour", nom: "Golem de la tour" } },
  crypte: { wi: 3, step: "crypte_19", chap: "crypt", quest: "aq_crypte_retient", boss: "Nécromancien suprême", elite: { map: "crypt", sector: "nef", id: "pleureuse_nef", nom: "Pleureuse de la nef" } },
  montagne: { wi: 4, step: "montagne_19", chap: "mountain", quest: "aq_montagne_dragon", boss: "Dragon ancien", elite: { map: "mountain", sector: "nid", id: "mere_dragonnets", nom: "Mère des dragonnets" } },
  tour: { wi: 5, step: "tour_18", chap: "tower", quest: "aq_tour_silhouette", boss: "La silhouette", elite: { map: "tower", sector: "etage_veines", id: "gardien_qui_repete", nom: "Gardien qui répète" } }
};
var BANDES = ["hp", "def", "cm", "dmg", "cc"];   // bande 1 = Désert … bande 5 = Tour
var NOM_BANDE = { hp: "PV max", def: "Défense", cm: "dégâts crit.", dmg: "dégâts", cc: "critique" };
var CLASSES = { knight: "Chevalier", ranger: "Rôdeur", mage: "Mage" };
function profil(id) {
  if (id === "save") return { forge: "save" };
  if (id === "nf") return { forge: "zero" };
  if (id === "actuel") return { forge: "cap" };
  var m = /^r(\d\d)(dr)?(?:x(hp|def|cm|dmg|cc))?$/.exec(id); if (!m) throw new Error("profil inconnu : " + id);
  return { forge: "zero", pct: Number(m[1]) / 1000, defRel: !!m[2], sans: m[3] || null };
}
function liste(k, all) { var v = opt(k, null); return v ? v.split(",") : (Array.isArray(all) ? all : Object.keys(all)); }
var L_CLASSES = liste("--classes", CLASSES), L_MONDES = liste("--mondes", MONDES), L_PROF = liste("--profils", ["save", "nf", "actuel", "r04", "r05", "r06"]);
var CUR = { lv: null, bonus: null };
// niveau de l'élite repère par monde (--niv desert:6,ruines:6,…) : au niveau 1 elles tombent en quelques rounds
var NIV = { desert: 1, ruines: 1, crypte: 1, montagne: 1, tour: 1 };
(opt("--niv", "") || "").split(",").filter(Boolean).forEach(function (x) { var a = x.split(":"); NIV[a[0]] = Number(a[1]) || 1; });

function wrap(obj, name, fn) { var o = obj[name]; obj[name] = function () { return fn.call(this, o, arguments); }; }

/* ---------- Enveloppes du profil ---------- */
function installProfil(g) {
  // forge actuelle : niveau imposé par emplacement (le calcul de la pièce reste celui du jeu)
  wrap(g.ForgeManager, "getLevel", function (o, a) { return CUR.lv != null ? CUR.lv : o.apply(this, a); });
  // refonte : bonus posés APRÈS la recomposition ; les PV courants suivent le plafond agrandi (même règle que le jeu)
  wrap(g.StatsSystem, "recalcStats", function (o, a) {
    var G = g.game, hp0 = G.heroHp, r = o.apply(this, a), B = CUR.bonus;
    if (!B) return r;
    if (B.hp) G.heroMaxHp = Math.max(1, Math.floor(G.heroMaxHp * (1 + B.hp)));
    if (B.def) G.heroDefensePct = B.defRel ? Math.min(0.6, G.heroDefensePct * (1 + B.def)) : Math.min(0.6, G.heroDefensePct + B.def);
    if (B.cm) G.critMult = G.critMult * (1 + B.cm);
    if (B.dmg) G.tapMult += B.dmg;
    if (B.cc) G.critChance += B.cc * 100;
    G.heroHp = (hp0 == null) ? G.heroMaxHp : Math.min(hp0, G.heroMaxHp);
    return r;
  });
}
function poserProfil(g, P, M) {
  CUR.lv = null; CUR.bonus = null;
  if (P.forge === "zero") CUR.lv = 0;
  if (P.forge === "cap") CUR.lv = g.WORLD_CAPS[M.wi].village.forge * g.FORGE_LEVELS_PER_BUILDING_LEVEL;
  if (P.pct) {   // mondes finis = bandes 1..wi, 4 reforges × 7 emplacements chacune
    var B = { defRel: P.defRel }, n = 4 * g.EQUIPMENT_SLOTS.length;
    for (var b = 0; b < M.wi; b++) if (BANDES[b] !== P.sans) B[BANDES[b]] = n * P.pct;
    CUR.bonus = B;
  }
}

/* ---------- Compteurs (lecture seule) ---------- */
function instrument(g) {
  var CE = g.CombatEngine, S = { st: null };
  function rec() { return S.st; }
  function isBoss(e) { return !!(e && e.isBoss && !e.isElite); }
  wrap(CE, "beginRound", function (o, a) { if (rec()) { rec().rounds++; if (rec().cur) rec().cur.r++; } return o.apply(this, a); });
  wrap(g.PotionManager, "useHealingPotion", function (o, a) { var r = o.apply(this, a); if (r === true && rec()) rec().potions++; return r; });
  wrap(CE, "onHeroDefeated", function (o, a) {
    var ca = g.CombatActors && g.CombatActors.ensure(), rose0 = !!(ca && ca.heroRose), r = o.apply(this, a);
    if (!(!rose0 && ca && ca.heroRose && g.game.heroHp > 0) && rec()) rec().mort = true;
    return r;
  });
  wrap(g.LivingMapManager, "onFightWon", function (o, a) {
    var hp = g.game.heroHp, r = o.apply(this, a);
    if (r && rec()) { rec().eliteWin = true; rec().hpFin = hp; }
    return r;
  });
  // une rencontre = un changement d'ennemis ; le boss garde son relevé quand ses renforts arrivent
  var CA = g.CombatActors, oSet = CA.setEnemies;
  CA.setEnemies = function () {
    var avant = CA.enemies().slice(), r = oSet.apply(this, arguments), apres = CA.enemies();
    if (S.st && apres.length && (apres.length !== avant.length || apres.some(function (e) { return avant.indexOf(e) < 0; }))) {
      var boss = apres.some(isBoss), suite = S.st.cur && S.st.cur.boss && boss && avant.some(function (e) { return apres.indexOf(e) >= 0 && isBoss(e); });
      if (!suite) { S.st.cur = { r: 0, boss: boss, elite: apres.some(function (e) { return e.isElite; }), hp0: g.game.heroHp }; S.st.combats.push(S.st.cur); }
    }
    return r;
  };
  return S;
}

/* ---------- Un run ---------- */
function setRules(g, rules, n) { var R = rules.slice(0, n); while (R.length < 6) R.push({ conditionId: null, actionSlot: null }); g.game.grimoireRules = R; }
function prepare(g, saveTxt, M, kind) {
  g.fullResetState();
  g.restoreBaseState(JSON.parse(saveTxt));
  g.ensureGrimoireRules();
  g.game.unlockedTabs.grimoire = true;
  g.game.combatMode = "grimoire";
  var slots = g.getGrimoireSlotCount(g.game.worldsEverReached);
  var robot = g.game.grimoireRules.filter(function (r) { return r && r.conditionId && r.actionSlot; });
  setRules(g, robot, Math.min(3, slots));
  var st = g.StoryQuestManager.getCurrentStep(M.chap);
  if (kind === "boss" && st && st.id === M.step) { try { g.StoryQuestManager.acceptStep(M.chap); } catch (e) {} }
  g.EquipmentManager.recalcStats();
  g.game.heroHp = g.game.heroMaxHp;
  g.CompanionManager.healAll();
  g.CombatEngine.ensureState();
  var ctx;
  if (kind === "boss") {
    var q = g.ADVENTURE_QUESTS[M.quest];
    st = g.StoryQuestManager.getCurrentStep(M.chap);
    if (q && q.requiresVoie && st && st.choice && !g.CompanionManager.state(q.requiresVoie).voie) g.storyMakeChoice(M.chap, st.choice.options[0].value);
    ctx = { type: "adventure", id: M.quest };
  } else {
    ctx = { type: "elite", id: M.elite.id, mapId: M.elite.map, sectorId: M.elite.sector };
    ["petite_ration", "ration", "grande_ration"].forEach(function (k) { if (g.WarehouseManager.getAmount(k) < 10) g.WarehouseManager.addResource(k, 10, true); }); // vivres : hors mesure
    var sec = g.LivingMapManager.getState(M.elite.map, M.elite.sector);   // niveau ouvert (meilleur battu + 1), aucune victoire du jour
    if (sec) { sec.dailyWins = 0; sec.levelBest = Math.max(Number(sec.levelBest || 0), NIV[M.key] - 1); }
  }
  if (typeof g.grimoirePrepareAll === "function") g.grimoirePrepareAll(ctx, []);
}
function heroLigne(g) {
  var E = g.StatsSystem, atk = E.effectiveTapDamage(), cc = Math.min(100, E.effectiveCritChance()), cm = E.effectiveCritMult();
  return { atk: atk, pv: g.game.heroMaxHp, def: g.game.heroDefensePct, cc: cc, cm: cm, vit: g.CombatEngine.getTotalCelerity(), frappe: atk * (1 + cc / 100 * (cm - 1)) };
}
function playRun(g, S, saveTxt, M, kind, s) {
  CB.seed(s); CB.CLOCK.now = Date.UTC(2026, 9, 1, 8);
  prepare(g, saveTxt, M, kind);
  var hero = heroLigne(g);
  var st = S.st = { rounds: 0, potions: 0, mort: false, combats: [], cur: null, eliteWin: false, hpFin: null };
  var active;
  if (kind === "boss") { delete g.game.adventureQuestsCompleted[M.quest]; g.AdventureQuestManager.start(M.quest); active = function () { return g.game.adventureQuestRun.active; }; }
  else {
    var res = g.LivingMapManager.startEliteFight(M.elite.map, M.elite.sector, { type: "elite", eliteId: M.elite.id, repeatable: true }, NIV[M.key]);
    if (!res.ok) throw new Error("élite " + M.elite.id + " : " + res.reason);
    active = function () { return !!(g.game.livingMaps && g.game.livingMaps.fight); };
  }
  g.__flush();
  var CE = g.CombatEngine, stall = 0, last = -1;
  for (var t = 0; t < 12000 && active() && !st.mort && g.game.heroHp > 0; t++) {
    g.game.activeTab = "combat";
    if (g.game.heroHp / (g.game.heroMaxHp || 1) < 0.30) {   // le robot : potion à la main sous 30 %
      var pid = ["potion_soin_majeur", "potion_soin_mineur"].filter(function (id) { return (g.game.healingPotionsOwned || {})[id] > 0; })[0];
      if (pid && CE.isHeroTurnAvailable()) CE.heroAction("potion", pid);
    }
    CE.tickRoundClock(1.5);
    CB.CLOCK.now += 1500;
    g.__flush();
    g.StoryQuestManager._trackKills();
    if (g.closeBossFinal) g.closeBossFinal();
    if (st.rounds === last) { if (++stall > 60) { st.fige = true; break; } } else { stall = 0; last = st.rounds; }
  }
  var win = kind === "boss" ? !!g.game.adventureQuestsCompleted[M.quest] : st.eliteWin;
  var hpAbs = kind === "boss" ? g.game.heroHp : st.hpFin;
  var hp = win ? Math.max(0, hpAbs) / (g.game.heroMaxHp || 1) : 0;
  if (kind === "boss" && g.game.adventureQuestRun.active) { try { g.AdventureQuestManager.forfeit(); } catch (e) {} }
  if (kind === "elite" && active()) { try { g.LivingMapManager.abandonFight(); } catch (e) {} }
  S.st = null;
  var cible = st.combats.filter(function (c) { return (kind === "boss" ? c.boss : c.elite) && c.r > 0; }), b = cible.length ? cible[cible.length - 1] : null;
  return { win: win, hp: hp, rounds: st.rounds, potions: st.potions, fige: !!st.fige, rCible: b ? b.r : 0, hero: hero };
}
function saveFor(classe, M) { return fs.readFileSync(path.join(SAVES, classe + "_" + M.step + ".json"), "utf8"); }
function seedFor(mi, ki, i) { return 700000 + mi * 10000 + ki * 1000 + i; }

/* ---------- Agrégats ---------- */
function q(arr, p) { if (!arr.length) return 0; var s = arr.slice().sort(function (a, b) { return a - b; }); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; }
function agg(runs) {
  var n = runs.length, W = runs.filter(function (r) { return r.win; });
  return { n: n, win: W.length / n, hp: W.length ? W.reduce(function (a, r) { return a + r.hp; }, 0) / W.length : 0,
    pot: runs.reduce(function (a, r) { return a + r.potions; }, 0) / n, rMed: q(W.map(function (r) { return r.rounds; }), 0.5),
    cMed: q(W.map(function (r) { return r.rCible; }), 0.5), figes: runs.filter(function (r) { return r.fige; }).length, hero: runs[0].hero };
}

/* ---------- Worker : une classe × un profil ---------- */
function worker() {
  var classe = L_CLASSES[0], pid = L_PROF[0], P = profil(pid), out = {};
  var g = CB.launch(); installProfil(g); var S = instrument(g);
  L_MONDES.forEach(function (mid) {
    var M = MONDES[mid], txt, mi = Object.keys(MONDES).indexOf(mid);
    M.key = mid; txt = saveFor(classe, M);
    poserProfil(g, P, M);
    ["boss", "elite"].forEach(function (kind, ki) {
      if (opt("--kinds", null) && opt("--kinds").split(",").indexOf(kind) < 0) return;
      var runs = [];
      for (var i = 0; i < RUNS; i++) runs.push(playRun(g, S, txt, M, kind, seedFor(mi, ki, i)));
      out[[pid, classe, mid, kind].join("|")] = agg(runs);
    });
    process.stderr.write(".");
  });
  fs.writeFileSync(opt("--out"), JSON.stringify(out));
}

/* ---------- Principal ---------- */
function main() {
  var dir = CH.captures("forge-mondes"), t0 = Date.now(), tag = opt("--tag", "fm");
  var taches = []; L_PROF.forEach(function (p) { L_CLASSES.forEach(function (c) { taches.push([c, p]); }); });
  var all = {}, k = 0, actifs = 0;
  new Promise(function (fin, echec) {
    function suivante() {
      if (k >= taches.length) { if (!actifs) fin(); return; }
      var t = taches[k++], out = path.join(dir, "part-" + tag + "-" + t[0] + "-" + t[1] + ".json"); actifs++;
      var args = [__filename, ROOT, "--worker", "--classes", t[0], "--profils", t[1], "--runs", String(RUNS), "--mondes", L_MONDES.join(","), "--saves", SAVES, "--out", out].concat(opt("--niv", null) ? ["--niv", opt("--niv")] : []).concat(opt("--kinds", null) ? ["--kinds", opt("--kinds")] : []);
      var pr = cp.spawn(process.execPath, args, { stdio: ["ignore", "ignore", "inherit"] });
      pr.on("exit", function (code) {
        actifs--;
        if (code) return echec(new Error("worker " + t.join("/") + " : code " + code));
        Object.assign(all, JSON.parse(fs.readFileSync(out, "utf8"))); fs.unlinkSync(out);
        suivante();
      });
    }
    for (var i = 0; i < Number(opt("--jobs", 4)); i++) suivante();
  }).then(function () {
    var brut = path.join(dir, tag + "-" + RUNS + "runs.json");
    fs.writeFileSync(brut, JSON.stringify({ date: new Date().toISOString(), runs: RUNS, profils: L_PROF, mondes: MONDES, cellules: all }, null, 1));
    var txt = rapport(all, (Date.now() - t0) / 60000, brut);
    fs.writeFileSync(path.join(dir, tag + "-" + RUNS + "runs.txt"), txt);
    console.log(txt);
  }).catch(function (e) { console.error(e.message); process.exit(1); });
}
function rapport(all, minutes, brut) {
  var out = [], p0 = function (x) { return (100 * x).toFixed(0).padStart(3) + "%"; };
  out.push("BANC FORGE PAR MONDE — " + RUNS + " parties par cellule, graines fixes (mêmes graines pour tous les profils), " + minutes.toFixed(1) + " min");
  out.push("Profils : " + L_PROF.join(", ") + "   (save = forge de la sauvegarde du robot ; nf = sans forge ; actuel = 7 emplacements au plafond ; rXX = refonte XX ‰ par reforge)");
  out.push("Héros : ATK effective · PV max · DEF · critique % ×mult · frappe moyenne (ATK × (1 + p·(m−1)))");
  out.push("Combats : victoires · PV restants (victoires) · potions · rounds de la sortie (méd.) · rounds du combat repère (méd.)");
  L_MONDES.forEach(function (mid) {
    var M = MONDES[mid];
    out.push("\n== Fin " + mid + " (" + M.step + ") — boss : " + M.boss + " (" + M.quest + ") · élite : " + M.elite.nom);
    L_CLASSES.forEach(function (c) {
      out.push("  " + CLASSES[c]);
      L_PROF.forEach(function (pid) {
        var vide = { win: 0, hp: 0, pot: 0, rMed: 0, cMed: 0, figes: 0 };
        var b = all[[pid, c, mid, "boss"].join("|")], e = all[[pid, c, mid, "elite"].join("|")]; if (!b && !e) return;
        var h = (b || e).hero; b = b || vide; e = e || vide;
        var l = "    " + pid.padEnd(8) + "ATK " + String(Math.round(h.atk)).padStart(5) + "  PV " + String(h.pv).padStart(5) + "  DEF " + (100 * h.def).toFixed(1).padStart(4)
          + "  crit " + h.cc.toFixed(1).padStart(4) + " ×" + h.cm.toFixed(2) + "  frappe " + String(Math.round(h.frappe)).padStart(5)
          + "  | boss " + p0(b.win) + " PV " + p0(b.hp) + " pot " + b.pot.toFixed(1) + " r " + String(b.rMed).padStart(3) + " (boss " + String(b.cMed).padStart(3) + ")"
          + "  | élite " + p0(e.win) + " PV " + p0(e.hp) + " pot " + e.pot.toFixed(1) + " r " + String(e.cMed).padStart(3);
        if (b.figes || e.figes) l += "  FIGÉS " + (b.figes + e.figes);
        out.push(l);
      });
    });
  });
  out.push("\nJSON brut : " + brut);
  return out.join("\n");
}

if (WORKER) worker(); else main();
