"use strict";
/* tools/sim/montagne-acte3-bench.js — v3.490.0 (Montagne, lot M-4) : la Gueule du volcan de bout en bout
   (Golem-forge, campement, Ifrit qui trie, Wyrm de cendres) et la quête de l'étape 14, sur le vrai moteur.
   Le héros est celui d'une vraie sauvegarde (SAVE_OUT de campagne-harness.js), groupe et potions compris.

   Cibles (Conception, MT7) : le Wyrm 65-80 % par classe, Rôdeur ≥ 60 % ; la quête sans mort, 25-35 % des PV.

   USAGE : node tools/sim/montagne-acte3-bench.js . --save a.json[,b.json] [--runs N] [--diff x] [--boss p,e]
           [--quete pv,puissance] [--sans-potion]
           v3.492.12 (mesure P1, « affinité de monde ») : [--affinite x] [--kit crypte|montagne] [--stats]
             --affinite x : remplace le bonus d'affinité de monde du jeu (EQUIP_WORLD_AFFINITY, +10 % depuis v3.492.12) ; 0 = sans.
             --entrainement N (chantier du héros, H1) : les cinq entraînements posés à N (au-delà du plafond).
             --kit : 7 Épiques retirés au même tirage ; arme et bottes de la Montagne, les 5 autres de la Crypte ou de la Montagne. */
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
var QUETES = opt("--quetes") ? opt("--quetes").split(",") : null; // v3.491.0 : quêtes seules (acte IV : aq_montagne_tries, aq_montagne_dragon)
var QBOSS = opt("--qboss") ? opt("--qboss").split(",").map(Number) : null; // essai bossHpMult,bossPowerMult (aq_montagne_dragon)
var P1_AFF = opt("--affinite") !== null ? Number(opt("--affinite")) : null;
var P1_KIT = opt("--kit");
var P1_STATS = ARGV.indexOf("--stats") >= 0;
var ENTR = opt("--entrainement") !== null ? Number(opt("--entrainement")) : null; // chantier du héros (H1) : les 5 entraînements posés à N
// chantier du héros (H2) : --rang N[,dmg,cd,cout] — rang N sur les 3 techniques : dégâts +dmg par rang (0,08),
// recharge −1 dès le rang `cd` (0 = jamais), coût −cout par rang (0) ; appliqué après les talents
var RANG = opt("--rang") ? opt("--rang").split(",").map(Number) : null;
var TALENTS_MAX = ARGV.indexOf("--talents-max") >= 0; // H3 : chaque talent possédé monté à son rang maximum
var COMP_UPG = opt("--comp-upg") !== null ? Number(opt("--comp-upg")) : null; // H4 : améliorations de tous les compagnons posées à N (+6 % par cran)
var COMP_PCT = opt("--comp-pct") !== null ? Number(opt("--comp-pct")) : null; // H4 : plancher des compagnons, part du coup moyen du héros
var VICTIMES = ARGV.indexOf("--victimes") >= 0; // H4 : qui encaisse les coups ennemis (héros ou compagnon)
var REL_FLOOR = opt("--rel-floor") !== null ? Number(opt("--rel-floor")) : null; // H4 (V1) : plancher de menace relatif
var COMP_VIG = opt("--comp-vig") !== null ? Number(opt("--comp-vig")) : null; // H4 (V1) : N paliers de Vigueur en plus aux compagnons
var WENNA_SOIN = opt("--wenna-soin") !== null ? Number(opt("--wenna-soin")) : null; // H4 partie C : soin de Wenna (part des PV max)
var COMP_RANG = opt("--comp-rang") !== null ? Number(opt("--comp-rang")) : null; // H4 partie C : rang de compétence de tous les compagnons ; affiche la Cendre vive par sortie
// v3.492.15 (fiche objets de combat) : --plafond heal,surge,shell,sort,burn — la mécanique entièrement annulée (borne haute d'un objet)
var PLAFOND = opt("--plafond") ? opt("--plafond").split(",") : [];
var SANS_REGLE = opt("--sans-regle") ? opt("--sans-regle").split(",") : []; // retire ces conditions du Grimoire (joueur sans la règle)
var TAILLER = ARGV.indexOf("--tailler") >= 0;
var OBJETS = opt("--objet") ? opt("--objet").split(",") : []; // v3.492.15 : objets de combat emportés (sortie de mission simulée) // le héros taille : règle « Veine intacte → Tailler » en tête du Grimoire
if (!SAVES.length) { console.log("--save <fichier> attendu (sauvegarde de campagne)"); process.exit(1); }

var extra = function () {
  var d = g.DUNGEONS.filter(function (x) { return x.id === 5; })[0];
  if (DIFF5) d.difficultyMult = DIFF5;
  if (WYRM) { d.boss.statMult.power = WYRM[0]; d.boss.statMult.endurance = WYRM[1]; }
  if (QUETE) { g.ADVENTURE_QUESTS.aq_montagne_salle_ronde.encounterHpMult = QUETE[0]; g.ADVENTURE_QUESTS.aq_montagne_salle_ronde.enemyPowerMult = QUETE[1]; }
  // v3.492.12 : l'affinité est dans le jeu ; --affinite en change seulement le bonus
  if (P1_AFF !== null) g.EQUIP_WORLD_AFFINITY.bonus = P1_AFF;
  if (PLAFOND.indexOf("heal") >= 0) g.BOSS_HEAL_PERCENT = 0;
  if (PLAFOND.indexOf("surge") >= 0) g.ELITE_SURGE_INTENSITY_MULT = 1;
  if (PLAFOND.indexOf("sort") >= 0) g.VEIN_SORT_MULT = 1;
  if (PLAFOND.indexOf("shell") >= 0) Object.keys(g.ELITE_DB).forEach(function (k) { if (g.ELITE_DB[k].forgeShell) g.ELITE_DB[k].forgeShell = 0; });
  if (PLAFOND.indexOf("burn") >= 0) Object.keys(g.ELITE_DB).forEach(function (k) { if (g.ELITE_DB[k].burns) g.ELITE_DB[k].burns.pct = 1e-9; /* 0 reprendrait la valeur par défaut */ });
  if (PLAFOND.length) console.log("PLAFOND : " + PLAFOND.join(", ") + " annulé(s)");
  function kit(seed) {
    if (!P1_KIT) return;
    g.EQUIPMENT_SLOTS.forEach(function (slot, i) {
      B.seedRng(seed * 31 + i); // même tirage pour les deux kits : seul le monde change
      var w = (slot === "weapon" || slot === "boots" || P1_KIT === "montagne") ? 4 : 3;
      g.game.equipped[slot] = g.generateEquipmentItem(slot, "epic", w);
    });
  }
  if (RANG) {
    var modKit0 = g.TalentManager.modKit.bind(g.TalentManager), rcache = {};
    g.TalentManager.modKit = function (cid, kit) {
      var k = modKit0(cid, kit); if (!k) return k;
      var key = cid + "|" + JSON.stringify(g.game.talents || {}); if (rcache[key]) return rcache[key];
      var out = JSON.parse(JSON.stringify(k)), n = RANG[0], dmg = RANG[1] != null ? RANG[1] : 0.08, cd = RANG[2] || 0, cout = RANG[3] || 0;
      ["skill1", "skill2", "skill3"].forEach(function (sl) {
        var a = out.actions[sl]; if (!a) return;
        if (a.damageMultiplier) a.damageMultiplier *= 1 + dmg * n;
        if (cd && n >= cd && a.cooldownRounds > 1) a.cooldownRounds -= 1;
        if (cout) a.resourceCost = Math.round(a.resourceCost * (1 - cout * n));
      });
      rcache = {}; rcache[key] = out; return out;
    };
    console.log("RANG " + RANG.join(",") + " sur les trois techniques");
  }
  if (COMP_PCT !== null) { g.COMPANION_HERO_DMG_PCT = COMP_PCT; console.log("PLANCHER COMPAGNONS : " + COMP_PCT); }
  if (VICTIMES) {
    var pv0 = g.CombatEngine.pickVictim.bind(g.CombatEngine), VIC = {};
    g.CombatEngine.pickVictim = function () { var v = pv0(); var k = v && v.companionId ? v.companionId : "héros"; VIC[k] = (VIC[k] || 0) + 1; return v; };
    process.on("exit", function () { var t = 0; Object.keys(VIC).forEach(function (k) { t += VIC[k]; });
      console.log("VICTIMES : " + Object.keys(VIC).map(function (k) { return k + " " + Math.round(100 * VIC[k] / t) + " %"; }).join(" · ") + " (" + t + " coups)"); });
  }
  if (REL_FLOOR !== null) { g.THREAT_REL_FLOOR = REL_FLOOR; console.log("PLANCHER DE MENACE : " + REL_FLOOR); }
  if (WENNA_SOIN !== null) { g.COMPANIONS_DB.wenna.skill.value = WENNA_SOIN; console.log("SOIN DE WENNA : " + WENNA_SOIN); }
  function charge(saveTxt, seed) {
    B.seedRng(seed);
    g.restoreBaseState(JSON.parse(saveTxt));
    kit(seed); B.seedRng(seed);
    if (TALENTS_MAX) { g.TalentManager.getNodes().forEach(function (e) { if (g.TalentManager.has(e.node.id)) g.game.talents[e.node.id] = g.TalentManager.maxRank(e.node); }); g.StatsSystem.recalcStats(); }
    if (COMP_VIG !== null) { Object.keys(g.game.companions || {}).forEach(function (k) { var st = g.game.companions[k]; st.upgrades += COMP_VIG; st.vigueur = (st.vigueur || 0) + COMP_VIG; }); g.CompanionManager.healAll(); }
    if (COMP_RANG !== null) Object.keys(g.game.companions || {}).forEach(function (k) { g.game.companions[k].skillRank = COMP_RANG; });
    if (COMP_UPG !== null) { Object.keys(g.game.companions || {}).forEach(function (k) { g.game.companions[k].upgrades = COMP_UPG; }); g.CompanionManager.healAll(); }
    if (ENTR !== null) g.HEROS_TRAINING_UPGRADE_IDS.forEach(function (id) { g.game.upgrades[id] = ENTR; g.UPGRADES.filter(function (u) { return u.id === id; })[0].apply(ENTR); });
    g.ensureGrimoireRules();
    B.run("game.combatMode = 'grimoire'; EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp; CompanionManager.healAll();");
    if (SANS_POTION) g.game.healingPotionsOwned = {};
    if (OBJETS.length) g.CombatItems.carried = function () { return OBJETS.slice(); };
    if (SANS_REGLE.length) g.game.grimoireRules = (g.game.grimoireRules || []).filter(function (r) { return !r || SANS_REGLE.indexOf(r.conditionId) === -1; });
    if (TAILLER) g.game.grimoireRules = [{ conditionId: "veinIntact", actionSlot: "vein" }].concat((g.game.grimoireRules || []).filter(function (r) { return r && r.conditionId; })).slice(0, 6);
  }
  function gueule() {
    var cleared = Object.assign({}, g.game.dungeonTierCleared); delete cleared[5];
    g.game.dungeonTierCleared = cleared; g.game.dungeonRunsUsed = {};
    if (g.game.dungeonRun) g.game.dungeonRun.active = false;
    var boss0 = Number(g.game.dungeonBossClears || 0);
    var ash0 = g.WarehouseManager.getAmount("cendre_vive");
    process.__ash = process.__ash || { n: 0, sum: 0 };
    if (COMP_RANG !== null && !process.__ashHook) { process.__ashHook = true; process.on("exit", function () { console.log("CENDRE VIVE par sortie (fin de sortie, campement compris) : " + (process.__ash.sum / Math.max(1, process.__ash.n)).toFixed(2) + " sur " + process.__ash.n + " sorties"); }); }
    g.DungeonManager.start(5, []);
    if (!g.game.dungeonRun.active) return null;
    setTimeout(function () {}, 0);
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
    process.__ash.n += 1; process.__ash.sum += g.WarehouseManager.getAmount("cendre_vive") - ash0;
    return { camp: camp, hpCamp: hpCamp, boss: hpBoss !== null, hpBoss: hpBoss, ok: Number(g.game.dungeonBossClears || 0) > boss0, rounds: rounds,
      hp: Math.max(0, g.game.heroHp) / g.game.heroMaxHp };
  }
  if (P1_STATS) {
    console.log("P1_STATS DU HÉROS — kit " + (P1_KIT || "de la sauvegarde") + " · affinité +" + Math.round(g.EQUIP_WORLD_AFFINITY.bonus * 100) + " % · moyenne sur " + RUNS + " tirages");
    SAVES.forEach(function (f) {
      var t = fs.readFileSync(f, "utf8"), cls = JSON.parse(t).heroId || path.basename(f), m = { flat: 0, mult: 0, cc: 0, cm: 0, def: 0, hp: 0, cel: 0 };
      for (var i = 0; i < RUNS; i++) {
        charge(t, 94000 + i); var G = g.game;
        m.flat += G.equipFlatTapBonus; m.mult += G.tapMult; m.cc += G.critChance; m.cm += G.critMult; m.def += G.heroDefensePct; m.hp += G.heroMaxHp; m.cel += G.bonusCelerity;
      }
      Object.keys(m).forEach(function (k) { m[k] /= RUNS; });
      // coup moyen relatif : (dégâts plats) × multiplicateur × espérance de critique (base 1 ignorée)
      var coup = m.flat * m.mult * (1 + Math.min(100, m.cc) / 100 * (m.cm - 1));
      console.log("   " + String(cls).padEnd(8) + " plats " + Math.round(m.flat) + " · mult ×" + m.mult.toFixed(2) + " · crit " + m.cc.toFixed(1) + " % ×" + m.cm.toFixed(2)
        + " · coup moyen " + Math.round(coup) + " · défense " + (100 * m.def).toFixed(1) + " % · PV " + Math.round(m.hp) + " · célérité " + Math.round(m.cel));
    });
    return;
  }
  if (QUETES) {
    if (QBOSS) { g.ADVENTURE_QUESTS.aq_montagne_dragon.bossHpMult = QBOSS[0]; g.ADVENTURE_QUESTS.aq_montagne_dragon.bossPowerMult = QBOSS[1]; }
    var txt = SAVES.map(function (f) { return fs.readFileSync(f, "utf8"); });
    QUETES.forEach(function (qid) {
      console.log(qid + (QBOSS ? " · essai boss PV ×" + QBOSS[0] + " puissance ×" + QBOSS[1] : "") + (QUETE ? " · essai rencontres PV ×" + QUETE[0] + " puissance ×" + QUETE[1] : ""));
      if (QUETE) { g.ADVENTURE_QUESTS[qid].encounterHpMult = QUETE[0]; g.ADVENTURE_QUESTS[qid].enemyPowerMult = QUETE[1]; }
      txt.forEach(function (t, k) {
        var cls = JSON.parse(t).heroId || path.basename(SAVES[k]), n = 0, ok = 0, hp = 0;
        for (var i = 0; i < RUNS; i++) {
          charge(t, 93000 + i);
          g.game.adventureQuestsCompleted = {}; g.game.adventureQuestProgress = {};
          var garde = g.ADVENTURE_QUESTS[qid].requiresStoryStep; g.ADVENTURE_QUESTS[qid].requiresStoryStep = null;
          var r = playQuest(qid);
          g.ADVENTURE_QUESTS[qid].requiresStoryStep = garde;
          if (!r) continue;
          n++;
          if (r.ok) { ok++; hp += Math.max(0, g.game.heroHp) / g.game.heroMaxHp; }
        }
        console.log("   " + String(cls).padEnd(8) + " réussite " + String(Math.round(100 * ok / Math.max(1, n))).padStart(3) + " %   PV restants " + String(Math.round(100 * (ok ? hp / ok : 0))).padStart(3) + " %   (" + n + " runs)");
      });
    });
    return;
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
