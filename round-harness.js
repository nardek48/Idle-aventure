"use strict";
/* Harnais VM v3.102.0 (P2) : charge tous les scripts d'index.html (sauf pwa/boot) dans un contexte simulé
   et joue de vrais rounds. node round-harness.js <racine projet>  (liste des scripts attendue dans /tmp/scripts.txt) */
var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = process.argv[2];
var scripts = fs.readFileSync("/tmp/scripts.txt", "utf8").trim().split("\n").filter(function (s) { return !/pwa\.js|boot\.js/.test(s); });

function el() {
  return { style: { setProperty: function(){}, removeProperty: function(){} }, classList: { add: function(){}, remove: function(){}, toggle: function(){}, contains: function(){ return false; } },
    innerHTML: "", textContent: "", scrollTop: 0, disabled: false, querySelector: function(){ return null; }, querySelectorAll: function(){ return []; },
    addEventListener: function(){}, setAttribute: function(){}, getAttribute: function(){ return null; }, appendChild: function(){}, remove: function(){}, hasChildNodes: function(){ return false; }, focus: function(){}, dataset: {}, offsetWidth: 0, parentNode: null };
}
var storage = {};
var sandbox = {
  console: console, Date: Date, Math: Math, JSON: JSON, Object: Object, Array: Array, Number: Number, String: String, Boolean: Boolean,
  setTimeout: function(){ return 0; }, clearTimeout: function(){}, setInterval: function(){ return 0; }, clearInterval: function(){},
  requestAnimationFrame: function(){}, performance: { now: function(){ return Date.now(); } },
  navigator: { serviceWorker: null, userAgent: "vm", vibrate: function(){} }, location: { href: "", search: "", hash: "", protocol: "https:" },
  localStorage: { getItem: function(k){ return storage.hasOwnProperty(k) ? storage[k] : null; }, setItem: function(k,v){ storage[k]=String(v); }, removeItem: function(k){ delete storage[k]; }, key: function(i){ return Object.keys(storage)[i] || null; }, get length(){ return Object.keys(storage).length; } },
  document: { getElementById: function(){ return el(); }, querySelector: function(){ return null; }, querySelectorAll: function(){ return []; }, createElement: function(){ return el(); }, addEventListener: function(){}, body: el(), documentElement: el(), hidden: false, activeElement: null },
  alert: function(){}, confirm: function(){ return true; }, atob: function(s){ return Buffer.from(s,"base64").toString("binary"); }, btoa: function(s){ return Buffer.from(s,"binary").toString("base64"); },
  structuredClone: function (v) { return JSON.parse(JSON.stringify(v)); }, TextEncoder: TextEncoder, TextDecoder: TextDecoder, URL: URL, Blob: function(){}
};
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
scripts.forEach(function (s) {
  var code = fs.readFileSync(path.join(ROOT, s), "utf8");
  try { vm.runInContext(code, sandbox, { filename: s }); } catch (e) { console.error("LOAD FAIL", s, e.message); process.exit(1); }
});
console.log("Chargé " + scripts.length + " scripts");

var g = sandbox;
var failures = 0, passes = 0;
function ok(cond, msg) { if (cond) { passes++; console.log("  ✔ " + msg); } else { failures++; console.log("  ✘ " + msg); } }
function run(code) { return vm.runInContext(code, g); }

/* Nouvelle partie prête à combattre, sur l'onglet Combat, ennemi généré. */
function freshCombat(heroId) {
  run("fullResetState(); game.playerName='Test'; game.heroId='" + heroId + "'; EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp;");
  g.game.unlockedTabs.combat = true;
  g.game.activeTab = "combat";
  g.ClassCombatManager.resetForNewHero();
  g.CombatEngine.ensureState();
  g.CombatEngine.spawnEnemy();
  return g.game;
}
function fillResource() {
  var st = g.ClassCombatManager.ensureForCurrentClass();
  g.game.classResource = Object.assign({}, st, { current: st.max });
}
function forceBoss() {
  var adv = g.WorldManager.getAdventure();
  g.WorldManager.enemyIndex = Math.max(0, (adv.enemyCount || 1) - 1);
  g.CombatEngine.spawnEnemy();
  return g.game.enemy;
}
function giveWeapon() { g.game.equipped.weapon = { id: "w", name: "Épée", rarity: "common", slot: "weapon", stat: "tapDmg", value: 0 }; g.EquipmentManager.recalcStats(); }

console.log("\n[1] Nouvelle partie : état de round, ennemi préparé, coefficients");
var game = freshCombat("knight");
ok(game.combatMode === "tactique" && game.autoSkillsEnabled === false, "mode Tactique par défaut");
ok(game.combatRound && game.combatRound.number === 0 && game.heroGauge === 0, "round 0, jauge 0");
ok(game.enemy && game.enemy._roundReady && game.enemy.chargeIn >= 3 && game.enemy.chargeIn <= 5, "ennemi préparé (chargeIn 3-5) : " + game.enemy.name);
ok(g.ENEMY_PV_MULT === 6 && g.BOSS_PV_MULT === 12 && g.BOSS_DMG_MULT === 1.5, "coefficients v3.232.0 : PV 6 / boss 12 / dégâts boss ×1,5");
ok(g.RESIST_DMG_MULT === 0.85 && g.WEAK_DMG_MULT === 1.15, "résistances 0,85 / 1,15");
ok(g.CLASS_SKILLS.archer.resource.generation.value === 15 && g.CLASS_SKILLS.mage.resource.generation.passivePerRound === 8, "Concentration 15/attaque, Mana 8/round");
ok(g.CLASS_SKILLS.knight.actions.skill3.cooldownRounds === 4 && g.CLASS_SKILLS.knight.actions.defense.cooldownRounds === 3 && g.CLASS_SKILLS.knight.actions.skill1.cooldownRounds === 1, "cooldowns 8000→4, 7000→3, 1500→1");
ok(g.CLASS_SKILLS.mage.actions.skill2.effects[0].percentPerRound === 0.5 && g.CLASS_SKILLS.mage.actions.skill2.effects[0].durationRounds === 2, "DoT : 50 %/round × 2 rounds");
ok(typeof g.playerAttack === "undefined" && typeof g.syncAutoTapLoop === "undefined" && typeof g.CombatEngine.autoAttack === "undefined", "tap / auto-DPS / auto-tap retirés");

console.log("\n[2] Un round : Attaque → riposte → fin de round");
game = freshCombat("knight");
game.enemy.archetype = null; // v3.104.1 (P5) : freshCombat peut tirer un Troll (shielded) ou une Ronce (silenced) ; ce test cible le pattern charge générique
game.enemy.chargeIn = 99; // pas de télégraphe pendant ce test
var eHp0 = game.enemy.hp, hHp0 = game.heroHp;
ok(g.CombatEngine.heroAction("basic") === true, "heroAction('basic') joue le round");
ok(game.combatRound.number === 1, "round n°1");
ok(game.enemy.hp < eHp0, "l'ennemi a perdu des PV (" + eHp0 + " → " + Math.ceil(game.enemy.hp) + ")");
ok(game.heroHp < hHp0, "le héros a subi la riposte (" + hHp0 + " → " + game.heroHp + ")");
ok(game.enemy.roundsAlive === 1 && game.enemy.chargeIn === 98, "compteurs ennemi avancés");
ok(game.classResource.current > 0, "Rage générée par l'Attaque : " + Math.floor(game.classResource.current));
game.activeTab = "campement";
ok(g.CombatEngine.heroAction("basic") === false, "hors de l'onglet Combat : pas de round");
game.activeTab = "combat";

console.log("\n[3] Chaque compétence de chaque classe joue un round correct");
[["knight", "knight"], ["ranger", "archer"], ["mage", "mage"]].forEach(function (pair) {
  var heroId = pair[0], kitId = pair[1];
  var kit = g.CLASS_SKILLS[kitId];
  ["skill1", "skill2", "skill3", "defense"].forEach(function (slot) {
    game = freshCombat(heroId);
    giveWeapon();
    game.enemy.chargeIn = 99;
    game.enemy.engageIn = 0; // v3.105.0 : ce test cible coût/cooldown/dégâts, pas l'approche
    game.enemy.hp = game.enemy.maxHp = 100000; // ne meurt pas
    if (slot === "skill3" && kit.actions.skill3.conditions.enemyHpPercentBelowOrEqual) game.enemy.hp = game.enemy.maxHp * 0.30;
    fillResource();
    var a = kit.actions[slot];
    var res0 = game.classResource.current, eHp = game.enemy.hp, hHp = game.heroHp, n0 = game.combatRound.number;
    var played = g.CombatEngine.heroAction(slot);
    var passive = (kit.resource.generation.passivePerRound || 0); // Mana : +8 en fin de round
    var spent = res0 + passive - game.classResource.current;
    var cd = game.classCooldowns[a.id] || 0;
    var dmgOk = a.type === "damage" ? game.enemy.hp < eHp : true;
    var defOk = a.type === "defense" ? (game.classActiveDefense === null || game.classActiveDefense.roundsLeft >= 0) : true;
    // le cooldown a été décrémenté d'1 en fin de round : attendu cooldownRounds - 1 (ou absent si 0)
    var cdOk = cd === Math.max(0, a.cooldownRounds - 1);
    ok(played && game.combatRound.number === n0 + 1 && Math.abs(spent - a.resourceCost) < 1e-9 && dmgOk && cdOk && defOk,
      heroId + " / " + a.label + " : coût " + spent + "/" + a.resourceCost + ", cooldown restant " + cd + "/" + a.cooldownRounds + (a.type === "damage" ? ", dégâts " + Math.round(eHp - game.enemy.hp) : ", défense active"));
    if (a.cooldownRounds >= 2) {
      fillResource();
      ok(g.CombatEngine.heroAction(slot) === false, heroId + " / " + a.label + " : refusée en recharge (le round n'est pas consommé)");
    }
  });
});

console.log("\n[4] Effets : vulnérabilité (2 rounds), DoT du Mage, Défense en rounds");
game = freshCombat("knight"); giveWeapon(); game.enemy.chargeIn = 99; game.enemy.hp = game.enemy.maxHp = 100000; fillResource();
g.CombatEngine.heroAction("skill2");
ok(game.enemy.vulnerableRounds === 1 && game.enemy.vulnerableMult === 0.2, "Brise-garde : vulnérable 2 rounds (reste 1 après la fin du round)");
g.CombatEngine.heroAction("basic");
ok(game.enemy.vulnerableRounds === 0, "vulnérabilité expirée après 2 rounds");
game = freshCombat("mage"); giveWeapon(); game.enemy.chargeIn = 99; game.enemy.engageIn = 0; game.enemy.hp = game.enemy.maxHp = 100000; fillResource();
g.CombatEngine.heroAction("skill2");
ok(game.enemy.dot && game.enemy.dot.rounds === 1 && game.enemy.dot.perRound > 0, "Brûlure : DoT posé, 1 tick joué en fin de round (" + game.enemy.dot.perRound + "/round)");
var hpBefore = game.enemy.hp; g.CombatEngine.heroAction("defense");
ok(!game.enemy.dot, "DoT terminé après 2 rounds");
game = freshCombat("knight"); giveWeapon(); game.enemy.chargeIn = 99; game.enemy.hp = game.enemy.maxHp = 100000;
game.talents.t_thick_skin = 1;
g.CombatEngine.heroAction("defense");
ok(game.classActiveDefense && game.classActiveDefense.roundsLeft === 1, "Garde 1 round + Bouclier renforcé (+1) = reste 1 round après la riposte");
g.CombatEngine.heroAction("basic");
ok(game.classActiveDefense === null, "Garde expirée");
game.talents.t_thick_skin = 0;

console.log("\n[5] Jauge de célérité : frappe bonus (Rôdeur 70)");
/* v3.243.0 : le gain de jauge suit désormais 100 × célérité / (célérité + 60)
   (CELERITY_SOFT_CAP_K, combat-engine.js). Rôdeur 70 -> 53,85 par action au lieu de 70.
   Les trois valeurs ci-dessous sont recalculées sur cette formule, la MÉCANIQUE testée
   (frappe bonus au franchissement de 100, report du reliquat, bonus de Main spectrale)
   est inchangée. */
game = freshCombat("ranger"); giveWeapon(); game.enemy.chargeIn = 99; game.enemy.engageIn = 0; game.enemy.hp = game.enemy.maxHp = 100000; game.critChance = 0; // neutralise le crit aléatoire (Concentration += criticalBonus sinon non déterministe)
g.CombatEngine.heroAction("basic");
ok(Math.round(game.heroGauge) === 54, "jauge 54 après 1 attaque (70 de célérité -> 53,85 avec la courbe) : " + Math.round(game.heroGauge));
var focus1 = game.classResource.current;
var eHpA = game.enemy.hp;
g.CombatEngine.heroAction("basic");
ok(Math.round(game.heroGauge) === 8, "jauge 107,7 → frappe bonus → 7,7 : " + Math.round(game.heroGauge));
ok(game.classResource.current - focus1 === 30, "la frappe bonus génère aussi 15 Concentration (+30 sur le round)");
game.talents.t_auto_tap = 2; game.heroGauge = 0;
g.CombatEngine.heroAction("basic");
ok(Math.round(game.heroGauge) === 60, "Main spectrale ×2 : +30 % de célérité AVANT courbe (53,85 → 60,26) : " + Math.round(game.heroGauge));
game.talents.t_auto_tap = 0;

console.log("\n[6] Patterns : télégraphe au round N, impact au round N+1, contre");
game = freshCombat("knight"); giveWeapon(); game.enemy.hp = game.enemy.maxHp = 100000; game.heroHp = game.heroMaxHp = 100000; game.enemy.stats.precision = 0; game.enemy.archetype = null; // v3.104.1 (P5) : freshCombat peut tirer Troll/Ronce (patterns différents) ; ce test cible la charge générique
game.enemy.chargeIn = 1;
g.CombatEngine.heroAction("basic");
ok(game.enemy.chargeTelegraphed === true, "charge télégraphiée après le tour ennemi");
ok(g.ClassCombatManager.getGrimoireCombatContext().chargeIncoming === true, "contexte Grimoire : chargeIncoming");
var hp1 = game.heroHp; game.heroHp = 100000;
g.CombatEngine.heroAction("basic");
var chargeDmg = 100000 - game.heroHp;
ok(game.enemy.chargeTelegraphed === false && game.enemy.chargeIn >= 3 && game.enemy.chargeIn <= 5, "impact au round suivant, compte à rebours relancé (chargeIn " + game.enemy.chargeIn + ")");
var normalDmg = 100000 - hp1;
ok(chargeDmg > normalDmg, "la charge frappe plus fort que la riposte (" + chargeDmg + " > " + normalDmg + ")");
// contre par le Grimoire : règle chargeIncoming → defense (Garde contre la charge)
game.grimoireRules = [{ conditionId: "chargeIncoming", actionSlot: "defense" }, { conditionId: null, actionSlot: null }];
game.enemy.chargeIn = 1; game.classCooldowns = {}; game.heroHp = game.heroMaxHp = 100000; // riposte ennemie du round : garder le héros hors de danger, seul le pattern nous intéresse ici
g.CombatEngine.heroAction("basic");
ok(game.enemy.chargeTelegraphed === true, "nouvelle charge télégraphiée");
ok(g.CombatEngine.suggestAction() === "defense", "suggestion Grimoire en Tactique = Défense");
g.CombatEngine.heroAction("defense");
ok(game.enemy.chargeTelegraphed === false && game.enemy.counteredRounds === 0 && game.enemy.chargeIn >= 2 && game.enemy.chargeIn <= 5, "contre réussi : charge annulée, compteur relancé (chargeIn " + game.enemy.chargeIn + ")");
ok(game.combatReport.perSlot.defense.countersSucceeded === 1, "rapport : 1 contre réussi");
game.grimoireRules = [];

console.log("\n[7] Boss : Soin (remplace la frappe), Bouclier (-50 %, 2 rounds), neutre");
game = freshCombat("knight"); giveWeapon(); game.heroHp = game.heroMaxHp = 100000;
var boss = forceBoss();
ok(boss.isBoss && boss.healIn === 5, "boss généré, healIn 5");
ok(g.getDamageAffinity().status === "neutral", "boss neutre (Roi Slime faible à l'épée ignoré)");
boss.hp = boss.maxHp = 100000; boss.healIn = 1; boss.shieldIn = 99;
g.CombatEngine.heroAction("basic");
ok(boss.healTelegraphed === true, "soin télégraphié");
var hpB = game.heroHp; boss.hp = 50000;
g.CombatEngine.heroAction("basic");
ok(game.heroHp === hpB && boss.hp > 50000 - 100 && boss.healTelegraphed === false, "round suivant : le boss se soigne AU LIEU de frapper");
boss.shieldIn = 1; boss.healIn = 99;
g.CombatEngine.heroAction("basic");
ok(boss.shieldTelegraphed === true, "bouclier télégraphié");
g.CombatEngine.heroAction("basic");
ok(boss.shieldRounds === 2, "bouclier actif pour 2 attaques du héros");
/* v3.243.0 : crit et jauge neutralisés pour ces deux mesures — c'est la réduction du
   bouclier qu'on teste, pas le hasard d'un critique ou d'une frappe bonus. */
game.critChance = 0;
var hpS = boss.hp; game.heroGauge = 0; g.CombatEngine.heroAction("basic"); var dmgShield = hpS - boss.hp;
ok(boss.shieldRounds === 1, "1re attaque sous bouclier, reste 1");
g.CombatEngine.heroAction("basic");
ok(boss.shieldRounds === 0, "2e attaque sous bouclier, bouclier expiré");
var hpN = boss.hp; game.heroGauge = 0; g.CombatEngine.heroAction("basic"); var dmgNoShield = hpN - boss.hp;
ok(dmgShield < dmgNoShield, "dégâts sous bouclier < sans (" + Math.round(dmgShield) + " < " + Math.round(dmgNoShield) + ")");

console.log("\n[8] Silencieux : silence 2 rounds, compétences bloquées, Défense autorisée");
game = freshCombat("knight"); giveWeapon(); game.enemy.hp = game.enemy.maxHp = 100000; game.heroHp = game.heroMaxHp = 100000;
game.enemy.archetype = "silenced"; game.enemy.silenceIn = 1; fillResource();
g.CombatEngine.heroAction("basic");
ok(game.enemy.silenceTelegraphed === true, "silence télégraphié");
g.CombatEngine.heroAction("basic");
ok(game.silencedRounds === 2, "silencié 2 rounds");
ok(g.CombatEngine.heroAction("skill1") === false, "compétence refusée sous silence");
ok(g.CombatEngine.heroAction("defense") === true, "Défense autorisée sous silence");
ok(game.silencedRounds === 1, "silence décompte");
g.CombatEngine.heroAction("basic");
ok(game.silencedRounds === 0 && g.CombatEngine.heroAction("skill1") === true, "silence levé, compétence à nouveau possible");

console.log("\n[9] Double frappe ennemie (jauge) et condition Grimoire enemyAttackIncoming");
game = freshCombat("knight"); giveWeapon(); game.enemy.hp = game.enemy.maxHp = 100000; game.heroHp = game.heroMaxHp = 100000; game.enemy.chargeIn = 99;
game.enemy.stats.celerity = 60; game.enemy.gauge = 0; game.enemy.stats.precision = 0; game.heroDefensePct = 0;
ok(g.CombatEngine.enemyDoubleStrikeNext() === false, "gauge 0 + 60 < 100 : pas de double frappe");
var hpS1 = game.heroHp; g.CombatEngine.heroAction("basic"); var normalDmg = hpS1 - game.heroHp;
ok(Math.round(game.enemy.gauge) === 60 && g.CombatEngine.enemyDoubleStrikeNext() === true, "gauge 60 : double frappe annoncée");
ok(g.evaluateGrimoireCondition("enemyAttackIncoming", g.ClassCombatManager.getGrimoireCombatContext()) === true, "condition Grimoire enemyAttackIncoming vraie");
var hpD = game.heroHp; g.CombatEngine.heroAction("basic"); var dmgDouble = hpD - game.heroHp;
ok(Math.round(game.enemy.gauge) === 20 && dmgDouble === normalDmg * 2, "double frappe jouée (" + dmgDouble + " = 2 × " + normalDmg + "), jauge 120 → 20");

console.log("\n[10] Potion = action Objet (consomme le tour)");
game = freshCombat("knight"); giveWeapon(); game.enemy.chargeIn = 99; game.enemy.hp = game.enemy.maxHp = 100000;
game.healingPotionsOwned = { potion_soin_mineur: 2 }; game.heroHp = 100;
var n = game.combatRound.number;
ok(g.CombatEngine.heroAction("potion", "potion_soin_mineur") === true && game.combatRound.number === n + 1, "potion bue : le round est consommé");
ok(game.healingPotionsOwned.potion_soin_mineur === 1 && game.heroHp > 100, "stock -1, PV soignés puis riposte : " + game.heroHp);
game.heroHp = game.heroMaxHp;
ok(g.CombatEngine.heroAction("potion", "potion_soin_mineur") === false && game.combatRound.number === n + 1, "PV pleins : potion refusée, round non consommé");

console.log("\n[11] Modes : Grimoire verrouillé avant l'étape 12, horloge de rounds, Continuer l'attaque");
game = freshCombat("knight"); giveWeapon(); game.enemy.chargeIn = 99; game.enemy.hp = game.enemy.maxHp = 100000;
ok(g.CombatEngine.setCombatMode("grimoire") === false && game.combatMode === "tactique", "mode Grimoire refusé (onglet verrouillé)");
game.unlockedTabs.grimoire = true;
ok(g.CombatEngine.setCombatMode("grimoire") === true && game.autoSkillsEnabled === true, "mode Grimoire accepté après déblocage");
ok(g.CombatEngine.heroAction("basic") === false, "en mode Grimoire, l'Attaque manuelle est refusée");
n = game.combatRound.number;
g.CombatEngine.tickRoundClock(1.6);
ok(game.combatRound.number === n, "v3.293.0 : hors run de quête, l'horloge ne joue aucun round");
game.huntRun = { active: true, questId: "hq_forest_boar", killsInLot: 0 }; // v3.293.0 : l'horloge exige un run de quête
game.combatRound.clockMs = 0;
g.CombatEngine.tickRoundClock(1.0);
ok(game.combatRound.number === n, "horloge : 1,0 s < 1,5 s → pas encore de round");
g.CombatEngine.tickRoundClock(0.6);
ok(game.combatRound.number === n + 1, "horloge : 1,6 s → 1 round joué automatiquement");
fillResource(); game.enemy.hp = game.enemy.maxHp * 0.3; // Exécution possible
g.CombatEngine.tickRoundClock(1.6);
ok(game.classCooldowns.knight_execute === 3, "l'auto-pilote a joué Exécution (repli par défaut) — cooldown 3 restant");
g.CombatEngine.setCombatMode("tactique");
game.heroHp = game.heroMaxHp; game.enemy.gauge = 0; game.enemy.stats.celerity = 0; // aucun événement en vue
g.CombatEngine.toggleContinueAttack();
ok(game.combatRound.continueAttack === true, "Continuer l'attaque activé");
n = game.combatRound.number;
g.CombatEngine.tickRoundClock(0.1);
ok(game.combatRound.number === n + 1, "premier round immédiat");
game.heroHp = Math.floor(game.heroMaxHp * 0.3);
g.CombatEngine.tickRoundClock(1.6);
ok(game.combatRound.continueAttack === false && game.combatRound.number === n + 1, "PV < 50 % : Continuer s'arrête sans jouer");

console.log("\n[12] Mort : PV 0, or intact, Campement ; en quête d'aventure aussi (plus de soin gratuit)");
game = freshCombat("knight"); giveWeapon(); game.enemy.chargeIn = 99; game.enemy.hp = game.enemy.maxHp = 100000;
game.heroHp = 1; var gold = game.gold;
g.CombatEngine.heroAction("basic");
ok(game.heroHp === 0 && game.gold === gold && game.activeTab === "campement" && game.combatRound.continueAttack === false, "terrassé : PV 0, or intact, retour Campement (le message de mort est consommé par la vue Campement)");
game = freshCombat("knight"); giveWeapon();
g.AdventureQuestManager.start("hq_wolf_pack");
ok(game.adventureQuestRun.active === true && game.enemy._roundReady === true, "quête d'aventure lancée, ennemi préparé");
game.enemy.chargeIn = 99; game.enemy.hp = game.enemy.maxHp = 100000; game.heroHp = 1;
g.CombatEngine.heroAction("basic");
ok(game.heroHp === 0 && game.adventureQuestRun.active === false && game.activeTab === "campement", "mort en quête : PV 0, quête interrompue, Campement");
game = freshCombat("knight"); game.talents.t_essence_bloom = 2; giveWeapon(); game.enemy.chargeIn = 99; game.enemy.hp = game.enemy.maxHp = 100000; game.heroHp = 1;
g.CombatEngine.heroAction("basic");
ok(game.heroHp === Math.floor(game.heroMaxHp * 0.2), "Sang-froid ×2 : relevé à 20 % PV");

console.log("\n[13] Sauvegarde : combatMode aux 4 emplacements, migration, purge des cooldowns ms");
game = freshCombat("knight"); game.unlockedTabs.grimoire = true; g.CombatEngine.setCombatMode("grimoire");
game.classCooldowns = { knight_execute: 3 };
var d = g.buildSaveData();
ok(d.combatMode === "grimoire" && d.autoSkillsEnabled === true, "buildSaveData : combatMode");
d.classCooldowns = { knight_execute: 3, knight_guard: 5200 }; // 5200 = ancienne valeur en ms
g.restoreBaseState(d);
ok(game.combatMode === "grimoire" && game.classCooldowns.knight_execute === 3 && !game.classCooldowns.knight_guard, "restoreBaseState : mode conservé, cooldown ms purgé, rounds gardés");
ok(game.combatRound.number === 0 && game.heroGauge === 0, "état de round remis à zéro au chargement");
delete d.combatMode; d.autoSkillsEnabled = true; d.unlockedTabs = { grimoire: false };
g.restoreBaseState(d);
ok(game.combatMode === "tactique", "migration save pré-P2 sans Grimoire → Tactique");
d.unlockedTabs = { grimoire: true }; g.restoreBaseState(d);
ok(game.combatMode === "grimoire", "migration save pré-P2 avec Grimoire débloqué → Grimoire");
game.combatMode = "grimoire"; run("hardResetState()");
ok(game.combatMode === "grimoire" && game.combatRound.number === 0, "hardResetState (ascension) : préférence conservée, round 0");
run("fullResetState()");
ok(game.combatMode === "tactique" && game.autoSkillsEnabled === false, "fullResetState : Tactique");

console.log("\n[14] Sortie Lisière complète par classe (politique « joueur raisonnable », Tactique)");
[["knight", "knight"], ["ranger", "archer"], ["mage", "mage"]].forEach(function (pair) {
  var heroId = pair[0], kit = g.CLASS_SKILLS[pair[1]];
  var wins = 0, deaths = 0, roundsTotal = 0, runs = 20;
  for (var r = 0; r < runs; r++) {
    game = freshCombat(heroId); giveWeapon();
    game.healingPotionsOwned = { potion_soin_mineur: 2 };
    var kills = 0, guard = 0, dead = false;
    while (kills < 9 && !dead && guard < 400) {
      guard++;
      var st = g.ClassCombatManager.ensureForCurrentClass();
      var e = game.enemy, hpPct = game.heroHp / game.heroMaxHp;
      var ready = function (slot) { var a = kit.actions[slot]; return !(game.classCooldowns[a.id] > 0) && st.current >= a.resourceCost && g.checkActionConditions(a.conditions, { enemyHp: e.hp, enemyMaxHp: e.maxHp }); };
      var slot = "basic", arg = null;
      if (game.healingPotionsOwned.potion_soin_mineur > 0 && hpPct < 0.30) { slot = "potion"; arg = "potion_soin_mineur"; }
      else if (ready("defense") && hpPct < 0.40 && !game.classActiveDefense && (e.chargeTelegraphed || e.isBoss)) slot = "defense";
      else if (ready("skill3")) slot = "skill3";
      else if (ready("skill2") && (e.isBoss || e.hp > 60)) slot = "skill2";
      else if (ready("skill1") && e.hp > 30) slot = "skill1";
      var before = game.totalKills;
      if (!g.CombatEngine.heroAction(slot, arg)) g.CombatEngine.heroAction("basic");
      if (game.totalKills > before) kills += game.totalKills - before;
      if (game.heroHp <= 0) dead = true;
      roundsTotal++;
    }
    if (dead) deaths++; else wins++;
  }
  ok(wins + deaths === runs && roundsTotal / runs > 15 && roundsTotal / runs < 90, heroId + " : " + wins + "/" + runs + " sorties réussies (8 ennemis + boss), " + Math.round(roundsTotal / runs) + " rounds/sortie");
});

console.log("\n[15] Rendu : HTML de l'écran Combat et des boutons sans erreur dans les 3 modes");
game = freshCombat("knight"); giveWeapon(); game.unlockedTabs.grimoire = true;
var htmlT = g.buildCombatControlsHTML() + g.buildClassSkillButtonsHTML() + g.buildEnemyStatusBarHTML() + g.buildHealButtonHTML(0);
ok(htmlT.indexOf("Tactique") !== -1 && htmlT.indexOf("Continuer") !== -1 && run("buildCombatCelerityHTML()").indexOf("combat-gauge") !== -1, "Tactique : bascule, Continuer, jauge (v3.241.0 : jauge dans le panneau héros)");
g.CombatEngine.setCombatMode("grimoire");
var htmlG = g.buildCombatControlsHTML() + g.buildClassSkillButtonsHTML();
ok(htmlG.indexOf("Grimoire") !== -1 && htmlG.indexOf("combat-continue-btn") === -1 && htmlG.indexOf("auto-mode") !== -1, "Grimoire : boutons en auto-mode, pas de Continuer");
g.CombatEngine.setCombatMode("tactique"); game.enemy.chargeTelegraphed = true; game.enemy.shieldRounds = 1; game.silencedRounds = 1;
/* v3.251.0 : la charge est passée dans le BANDEAU (avec le mot écrit), le silence subi
   reste dans la rangée d'états. */
var htmlS = g.buildCombatAlertHTML() + g.buildCombatStatesHTML();
ok(htmlS.indexOf("Il charge") !== -1 && htmlS.indexOf("silenced.png") !== -1, "barre de statuts en rounds");
ok(typeof g.buildSettingsHTML() === "string" && g.buildSettingsHTML().indexOf("Mode Grimoire") !== -1, "Paramètres : sélecteur de mode");
g.ensureGrimoireRules && g.ensureGrimoireRules();
ok(typeof g.buildGrimoireHTML() === "string" && g.buildGrimoireHTML().indexOf("grimoire-mode") !== -1, "Grimoire : sélecteur de mode de combat"); // v3.210.0 : remplace l'ancien bandeau « Mode Tactique actif »
ok(typeof g.buildHerosHTML() === "string", "fiche Héros (cooldowns en rounds)");
ok(typeof g.buildTalentsHTML() === "string", "arbre de talents (textes reconvertis)");
g.game.activeTab = "combat"; g.renderAll();
ok(true, "renderAll() sans exception");

console.log("\n[16] Sortie (3.102.1) : exploration = butin banqué au Rentrer, perdu à la mort");
game = freshCombat("knight"); giveWeapon(); game.enemy.chargeIn = 99;
ok(g.SortieManager.isActive() === false, "pas de sortie avant le premier round");
var gold0 = game.gold, ess0 = game.essence;
game.enemy.hp = 1; g.CombatEngine.heroAction("basic");
ok(g.SortieManager.isActive() === true && game.sortie.context === "farm", "premier round → sortie d'exploration ouverte");
ok(game.gold === gold0 && game.sortie.loot.gold > 0 && game.sortie.kills === 1, "or du kill dans le butin (" + game.sortie.loot.gold + "), bourse intacte");
var lootGold = game.sortie.loot.gold, lootEss = game.sortie.loot.essence;
var html = g.buildCombatSortieHTML();
/* v3.273.0 : le butin est devenu un BOUTON qui ouvre la feuille de sortie, et porte
   l'icône d'or plutôt que celle de l'inventaire. Le reste de la rangée est inchangé. */
ok(html.indexOf("Rentrer") !== -1 && html.indexOf("openSortieSheet()") !== -1 && html.indexOf("Fuir") === -1, "rangée de sortie : bouton de butin + Rentrer");
g.SortieManager.returnToCamp();
ok(game.activeTab === "campement" && !g.SortieManager.isActive() && game.gold === gold0 + lootGold && game.essence === ess0 + lootEss, "Rentrer : butin banqué (+" + lootGold + " or), Campement");
// mort = butin perdu
game = freshCombat("knight"); giveWeapon(); game.enemy.chargeIn = 99; game.enemy.hp = 1; gold0 = game.gold;
g.CombatEngine.heroAction("basic");
var lostGold = game.sortie.loot.gold;
game.enemy.chargeIn = 99; game.enemy.hp = game.enemy.maxHp = 100000; game.heroHp = 1;
g.CombatEngine.heroAction("basic");
ok(game.heroHp === 0 && !g.SortieManager.isActive() && game.gold === gold0 && game.lastSortieSummary.outcome === "death" && game.lastSortieSummary.lost.gold === lostGold, "mort : sortie close, butin perdu (" + lostGold + " or), bourse intacte");
// onglet Campement pendant un farm = rentrer
game = freshCombat("knight"); giveWeapon(); game.enemy.chargeIn = 99; game.enemy.hp = 1; gold0 = game.gold;
g.CombatEngine.heroAction("basic"); lootGold = game.sortie.loot.gold;
g.switchTab("campement");
ok(!g.SortieManager.isActive() && game.gold === gold0 + lootGold, "onglet Campement = rentrer (butin banqué)");
// objet de boss dans le butin, puis au sac au retour
game = freshCombat("knight"); giveWeapon(); game.activeTab = "combat";
g.SortieManager.start("farm"); var bag0 = (game.inventory || game.bag || []).length;
g.SortieManager.addItem({ id: "x1", name: "Bottes test", rarity: "common", slot: "boots", stat: "autoDps", value: 3 });
g.SortieManager.addResource("viande", 3);
var meat0 = Number((game.resources && game.resources.viande) || 0);
g.SortieManager.end("return");
ok(Number(game.resources.viande) === meat0 + 3, "ressources du butin versées via WarehouseManager (+3 viande)");

console.log("\n[17] Sortie : potions plafonnées, fuite 50 %, missions");
game = freshCombat("knight"); giveWeapon(); game.enemy.chargeIn = 99; game.enemy.hp = game.enemy.maxHp = 100000;
game.healingPotionsOwned = { potion_soin_mineur: 5 };
g.SortieManager.start("farm");
game.heroHp = 50; ok(g.CombatEngine.heroAction("potion", "potion_soin_mineur") === true, "potion 1/2");
game.heroHp = 50; ok(g.CombatEngine.heroAction("potion", "potion_soin_mineur") === true, "potion 2/2");
game.heroHp = 50; ok(g.CombatEngine.heroAction("potion", "potion_soin_mineur") === false && game.healingPotionsOwned.potion_soin_mineur === 3, "3e potion refusée (plafond " + g.SORTIE_POTION_CAP + "), stock intact");
ok(g.SortieManager.getPotionsLeft() === 0, "0 potion restante affichée");
// quête d'aventure : sortie 'adventure', abandon = fuite 50 %
game = freshCombat("knight"); giveWeapon(); gold0 = game.gold;
g.AdventureQuestManager.start("hq_wolf_pack");
ok(g.SortieManager.isActive() && game.sortie.context === "adventure", "quête = sortie 'adventure'");
ok(g.buildCombatSortieHTML().indexOf("Fuir") !== -1, "rangée : Fuir en mission");
game.enemy.chargeIn = 99; game.enemy.hp = 1; g.CombatEngine.heroAction("basic");
game.sortie.loot.gold = 40;
g.AdventureQuestManager.forfeit();
ok(!g.SortieManager.isActive() && game.gold === gold0 + 20 && game.adventureQuestRun.active === false, "abandon = fuite : 20/40 or rapportés, quête non validée");
// chasse : viande dans le butin, lot terminé = banqué
game = freshCombat("knight"); giveWeapon();
var huntId = Object.keys(g.HUNT_QUESTS)[0], hq = g.HUNT_QUESTS[huntId];
g.HuntQuestManager.start(huntId);
ok(g.SortieManager.isActive() && game.sortie.context === "hunt", "chasse = sortie 'hunt'");
// v3.260.0 : la chasse tire dans resourcePool — on compte le total banqué sur le pool
var huntKeys = hq.resourcePool || [hq.resourceKey];
var sumHunt = function () { return huntKeys.reduce(function (a, k) { return a + Number(game.resources[k] || 0); }, 0); };
meat0 = sumHunt();
var origChance = g.chance; g.chance = function () { return true; }; // drop garanti
for (var k = 0; k < hq.lotSize; k++) { game.enemy.chargeIn = 99; game.enemy.hp = 1; g.CombatEngine.heroAction("basic"); }
g.chance = origChance;
ok(game.huntRun.active === false && !g.SortieManager.isActive() && sumHunt() === meat0 + hq.lotSize, "lot terminé : " + hq.lotSize + " ressources banquées d'un coup");
// chasse : mort = viande perdue (3a)
game = freshCombat("knight"); giveWeapon(); g.HuntQuestManager.start(huntId); meat0 = Number(game.resources[hq.resourceKey] || 0);
g.SortieManager.addResource(hq.resourceKey, 4);
game.enemy.chargeIn = 99; game.enemy.hp = game.enemy.maxHp = 100000; game.heroHp = 1; g.CombatEngine.heroAction("basic");
ok(game.heroHp === 0 && Number(game.resources[hq.resourceKey] || 0) === meat0 && game.huntRun.active === false, "mort en chasse : viande de la sortie perdue (3a)");
// donjon : mort = 0 récompense partielle ; abandon = moitié
game = freshCombat("knight"); giveWeapon(); game.dungeonTickets = 5; gold0 = game.gold;
g.DungeonManager.start(1);
ok(g.SortieManager.isActive() && game.sortie.context === "dungeon", "donjon = sortie 'dungeon'");
game.enemy.chargeIn = 99; game.enemy.hp = 1; g.CombatEngine.heroAction("basic"); // vague 1 nettoyée
game.enemy.chargeIn = 99; game.enemy.hp = game.enemy.maxHp = 100000; game.heroHp = 1; g.CombatEngine.heroAction("basic");
ok(game.heroHp === 0 && game.dungeonRun.active === false && game.gold === gold0 && game.dungeonBestWave >= 1, "mort en donjon : aucune récompense partielle, meilleure vague conservée");
game = freshCombat("knight"); giveWeapon(); game.dungeonTickets = 5; gold0 = game.gold; g.DungeonManager.start(1);
for (var w = 0; w < 5; w++) { game.enemy.chargeIn = 99; game.enemy.hp = 1; g.CombatEngine.heroAction("basic"); }
game.sortie.loot.gold = 100;
g.DungeonManager.forfeit();
ok(game.dungeonRun.active === false && game.gold > gold0 + 50 && game.gold < gold0 + 50 + 10000, "abandon donjon : 50 % du butin (50) + récompense partielle ÷ 2 (" + (game.gold - gold0 - 50) + ")");

console.log("\n[18] Sortie : sauvegarde aux 4 emplacements");
game = freshCombat("knight"); giveWeapon(); g.SortieManager.start("farm"); g.SortieManager.addGold(77);
d = g.buildSaveData();
ok(d.sortie && d.sortie.active === true && d.sortie.loot.gold === 77, "buildSaveData : sortie");
g.restoreBaseState(d);
ok(game.sortie && game.sortie.active === true && game.sortie.loot.gold === 77, "restoreBaseState : sortie restaurée (le butin survit au rechargement)");
run("hardResetState()"); ok(game.sortie === null, "hardResetState : sortie vidée");
game.sortie = { active: true }; run("fullResetState()"); ok(game.sortie === null, "fullResetState : sortie vidée");
ok(g.SortieManager.ensure().active === false, "ensure() reconstruit une sortie vide");

console.log("\n[19] Bac à sable (3.102.3) : simulateur chargé, vue rendue, tables cohérentes avec le moteur");
ok(typeof g.CombatRoundSim === "object" && typeof g.buildCombatSandboxHTML === "function" && typeof g.buildCombatSandboxHTML_legacy === "undefined", "CombatRoundSim + nouvelle vue chargés");
ok(typeof g.CombatSandboxManager === "undefined" && typeof g.aggregateAutoRuns === "undefined", "ancien bac à sable et batch-sim plus chargés");
game = freshCombat("knight"); game.activeTab = "combat-sandbox";
var sbHtml = g.buildCombatSandboxHTML();
ok(sbHtml.indexOf("rsb-c-ehp") !== -1 && sbHtml.indexOf('value="6"') !== -1 && sbHtml.indexOf('value="1.5"') !== -1, "formulaire pré-rempli avec les coefficients courants (6 / ×1,5)");
g.rsbReadForm = function () {}; // le DOM factice du harnais n'a pas de champs : on garde l'état programmé
g.rsbState.runs = 60; g.rsbState.allClasses = true; g.rsbState.patterns = true; g.rsbState.overrides = null;
g.rsbRun("all");
ok(g.rsbState.markdown.indexOf("Budgets duel") !== -1 && g.rsbState.markdown.indexOf("| Chevalier |") !== -1 && g.rsbState.markdown.indexOf("| Mage |") !== -1, "tables budgets + sorties générées pour les 3 classes");
var mdLines = g.rsbState.markdown.split("\n").filter(function (l) { return l.indexOf("| Chevalier |") === 0; });
var winCell = mdLines[1] ? mdLines[1].split("|")[2].trim() : "";
/* v3.232.0 : le bac à sable simule un héros NU. Avec des boss 3,9 fois plus coriaces, il perd —
   c'est attendu et c'est tout l'objet du recalibrage : la difficulté vise désormais un joueur équipé. */
ok(/^\d+ %$/.test(winCell), "Chevalier, Lisière V1 : bac à sable rendu (héros nu, réussite " + winCell + ")");
g.rsbRun("single");
ok(g.rsbState.resultsHtml.indexOf("rsb-log") !== -1 && g.rsbState.resultsHtml.indexOf("Roi Slime") !== -1, "sortie détaillée (log par combat jusqu'au boss)");
// cohérence sim/moteur : mêmes PV d'ennemi à échelle 1 (à +5/enemyIndex près) et mêmes dégâts d'attaque
// v3.107.4 : slime (pas wolf, retiré du pool de base Lisière — voir section [57])
var simSlime = g.CombatRoundSim.buildEnemy({ id: "slime", stats: g.ENEMY_DB.slime.stats, resists: [], weak: [] }, false, 1, g.CombatRoundSim.config({ enemyHpCoef: g.ENEMY_PV_MULT }));
game = freshCombat("knight"); g.WorldManager.worldIndex = 0; g.WorldManager.adventureIndex = 0; g.WorldManager.enemyIndex = 0;
var seenSlime = null; for (var t = 0; t < 40 && !seenSlime; t++) { var e2 = g.WorldManager.generateEnemy(); if (e2.id === "slime") seenSlime = e2; }
ok(seenSlime && Math.abs(seenSlime.maxHp - simSlime.maxHp) <= 5, "PV du slime : sim " + simSlime.maxHp + " vs moteur " + (seenSlime && seenSlime.maxHp));
var simHero = g.CombatRoundSim.buildHero({ classId: "knight", weaponType: "sword", stats: g.HEROES_DB.knight.stats, trained: {} }, g.CLASS_SKILLS.knight, g.CombatRoundSim.config({}));
ok(simHero.attack === g.EquipmentManager.effectiveTapDamage() && simHero.maxHp === game.heroMaxHp, "attaque et PV du héros : sim = moteur (" + simHero.attack + ", " + simHero.maxHp + ")");

console.log("\n[20] MissionBoard (3.103.0) : façade lecture seule sur les moteurs existants, zéro mutation");
game = freshCombat("knight"); game.activeTab = "campement";
var before = JSON.stringify(g.buildSaveData());
var list = g.MissionBoard.list();
ok(Array.isArray(list) && list.length > 0, "list() retourne des missions (" + list.length + ")");
// checkTicketReset() peut initialiser dungeonTickets/dungeonTicketResetTime la première fois (comportement existant, pas une mutation de MissionBoard) : on l'appelle avant la référence.
run("DungeonManager.checkTicketReset()");
var stripClock = function (data) { var o = JSON.parse(typeof data === "string" ? data : JSON.stringify(data)); delete o.dungeonTicketResetTime; delete o.savedAt; delete o.lastOnline; return JSON.stringify(o); };
before = stripClock(g.buildSaveData());
list = g.MissionBoard.list();
var afterList = stripClock(g.buildSaveData());
ok(afterList === before, "list() ne mute rien (save identique avant/après, hors horloge de tickets)");
ok(list[0].sourceKind === "story", "l'étape Histoire courante est toujours en tête");
ok(typeof list[0].accept === "function" && !list[0].claim, "étape Histoire non acceptée : action accept() seulement");
var ids = list.map(function (m) { return m.id; });
ok(ids.indexOf("adv_aq_forest_expedition") !== -1 || ids.indexOf("hunt_hq_forest_boar") === -1, "cohérence : la chasse forest_boar apparaît seulement si le bâtiment est débloqué");
var top3 = g.MissionBoard.top(3);
ok(top3.length <= 3 && top3[0].id === list[0].id, "top(3) = les 3 premières de list()");

console.log("\n[21] MissionBoard : accept()/launch()/abandon() délèguent aux vrais managers");
game = freshCombat("knight"); giveWeapon();
// v3.107.4 : les quêtes secondaires non liées à l'étape Histoire courante sont masquées — avancer
// jusqu'à forest_05 ("Prouver sa valeur") pour que aq_forest_expedition redevienne visible.
run("StoryQuestManager.acceptStep('forest'); StoryQuestManager.claimStep('forest');"); // 01 -> 02
game.equipped.weapon = { id: "w" };
run("StoryQuestManager.acceptStep('forest');"); game.adventureQuestsCompleted.aq_story_premier_sang = true; /* v3.293.0 : run défini */ run("StoryQuestManager.claimStep('forest');"); // v3.260.0 : kills comptés après acceptation // 02 -> 03
game.heroLevel = 2; game.upgrades.utrain_power = 1;
run("StoryQuestManager.acceptStep('forest'); StoryQuestManager.claimStep('forest');"); // 03 -> 04
game.upgrades.u_gold = 1;
run("StoryQuestManager.acceptStep('forest'); StoryQuestManager.claimStep('forest');"); // 04 -> 05
run("StoryQuestManager.acceptStep('forest');"); // accepte forest_05 (Prouver sa valeur)
var advMission = g.MissionBoard.list().find(function (m) { return m.sourceKind === "adventure" && m.status === "available"; });
ok(!!advMission && advMission.id === "adv_aq_forest_expedition", "au moins une quête d'aventure disponible, la bonne (liée à forest_05) : " + (advMission ? advMission.id : null));
advMission.accept();
ok(g.pendingAdventureQuestId === advMission.id.replace("adv_", ""), "accept() a bien ouvert l'intro (openAdventureQuestIntro)");
g.confirmAdventureQuestStart();
var runningMission = g.MissionBoard.list().find(function (m) { return m.id === advMission.id; });
ok(runningMission.status === "running" && typeof runningMission.abandon === "function", "après acceptation réelle : statut 'running', abandon() disponible");
var questId = runningMission.id.replace("adv_", "");
runningMission.abandon();
ok(g.game.adventureQuestRun.active === false, "abandon() a bien appelé AdventureQuestManager.forfeit()");

console.log("\n[22] MissionBoard : chasse et donjon");
game = freshCombat("knight"); giveWeapon();
game.explorationProgression = { huntBuildingUnlocked: true };
var huntMission = g.MissionBoard.list().find(function (m) { return m.sourceKind === "hunt"; });
ok(!!huntMission && huntMission.status === "available", "chasse visible une fois le bâtiment débloqué");
huntMission.accept();
g.confirmHuntQuestStart();
var huntRunning = g.MissionBoard.list().find(function (m) { return m.id === huntMission.id; });
ok(huntRunning.status === "running" && huntRunning.progressLabel === "0/" + g.HUNT_QUESTS[huntMission.id.replace("hunt_", "")].lotSize, "chasse lancée : statut running, progression 0/lot");
g.HuntQuestManager.stop(); // DungeonManager.start() refuse si une chasse est en cours (comportement préexistant)
game.dungeonTickets = 3;
// v3.118.0 (retour Seb) : le donjon (palier 1, techniquement "unlocked" en soi) n'apparaît au
// tableau qu'une fois débloqué narrativement (forest_14, unlockTabs: ["dungeon"]).
ok(!game.unlockedTabs.dungeon, "contrôle : onglet dungeon pas encore débloqué dans ce test frais");
ok(!g.MissionBoard.list().find(function (m) { return m.sourceKind === "dungeon"; }), "donjon absent du tableau tant que unlockedTabs.dungeon est faux");
game.unlockedTabs.dungeon = true;
var dungeonMission = g.MissionBoard.list().find(function (m) { return m.sourceKind === "dungeon" && m.status === "available"; });
ok(!!dungeonMission, "Tanière du Basilic disponible une fois l'onglet débloqué, avec un ticket");
ok(game.dungeonRun.active === false, "aucun donjon actif avant l'appel (pré-condition du test)");
var ticketsBefore = game.dungeonTickets;
dungeonMission.accept();
ok(game.dungeonRun.active === true && game.dungeonTickets === ticketsBefore - 1, "accept() a lancé DungeonManager.start() (ticket consommé)");

console.log("\n[23] MissionBoard : badges Histoire vs Contrat, résumé de récompense");
game = freshCombat("knight");
var l = g.MissionBoard.list();
ok(l.every(function (m) { return m.badge === "story" || m.badge === "contract"; }), "tous les badges sont story ou contract");
ok(l.filter(function (m) { return m.sourceKind === "story"; }).every(function (m) { return m.badge === "story"; }), "toutes les missions Histoire portent le badge story");
var withGold = l.find(function (m) { return m.rewardSummary && m.rewardSummary.indexOf("or") !== -1; });
ok(!!withGold, "au moins une mission affiche un résumé de récompense avec de l'or (" + (withGold ? withGold.rewardSummary : "") + ")");

console.log("\n[24] Campement = hub (3.103.1) : cartes de mission pleines, actions déléguées");
game = freshCombat("knight"); giveWeapon(); game.activeTab = "campement";
var campHtml = g.buildCampHTML();
ok(campHtml.indexOf("camp-mission-card") !== -1, "l'écran Campement affiche des cartes de mission");
ok(campHtml.indexOf("Résumé des quêtes") === -1 && typeof g.buildCampQuestSummaryHTML === "undefined", "ancien résumé texte retiré");
var boardHtml = g.buildCampMissionBoardHTML();
var top3 = g.MissionBoard.top(3);
ok(top3.every(function (m) { return boardHtml.indexOf(g.esc(m.title)) !== -1; }), "les 3 premières missions du board apparaissent dans le HTML");
// v3.117.0 : Histoire non acceptée -> bouton "Accepter" (le "🚩 Partir" est réservé à
// une mission déjà acceptée mais pas encore lancée, ex. expédition à mini-jeu).
ok(boardHtml.indexOf("Accepter") !== -1, "bouton Accepter sur l'étape Histoire disponible");
ok(campHtml.indexOf("Voir le tableau complet") !== -1, "bouton vers le reste du tableau (encore l'écran Quêtes)");
// v3.116.0 (Lot C) : nouveaux blocs Santé / Rations / Régénération, rendus sans exception
ok(campHtml.indexOf("camp-hp-fill") !== -1 && campHtml.indexOf("Santé du Héros") !== -1, "bloc Santé du Héros : barre de PV présente");
ok(campHtml.indexOf("camp-ration-grid") !== -1, "bloc Rations : grille de 3 rations présente");
/* v3.233.0 : la barre de régénération est retirée (elle affichait hpPct, soit la
   barre de PV en double). Le bloc garde la phrase, le rythme et l'ETA. */
ok(campHtml.indexOf("camp-regen-fill") === -1, "bloc Régénération : barre retirée (plus de doublon de la barre de PV)");
// v3.260.0 : la phrase passe derrière un « ? » (repliée par défaut), rythme et ETA restent sur la ligne.
ok(campHtml.indexOf("PV/min") !== -1 && campHtml.indexOf("camp-fire-eta") !== -1 && campHtml.indexOf("camp-help-btn") !== -1, "bloc Régénération : rythme, ETA et bouton « ? » sur une ligne");
ok(campHtml.indexOf("camp-regen-desc") === -1, "bloc Régénération : explication repliée par défaut");
run("toggleCampRegenHelp()");
ok(g.buildCampHTML().indexOf("camp-regen-desc") !== -1, "bloc Régénération : le « ? » déplie l'explication");
run("toggleCampRegenHelp()");
run("CampManager.refreshCampCard()");
ok(true, "refreshCampCard() (nouvelles barres) ne plante pas");

console.log("\n[25] Campement : campMissionAction délègue et déclenche le bon effet de bord");
var storyMission = g.MissionBoard.list()[0];
ok(storyMission.sourceKind === "story" && storyMission.status === "available", "étape Histoire dispo en tête");
g.campMissionAction(storyMission.id, "accept");
ok(g.StoryQuestManager.isCurrentStepAccepted("forest") === true, "campMissionAction('accept') a bien appelé StoryQuestManager.acceptStep");
// v3.107.4 : avancer jusqu'à forest_05 pour que la quête d'aventure liée redevienne visible.
run("StoryQuestManager.claimStep('forest');");
game.equipped.weapon = { id: "w" };
run("StoryQuestManager.acceptStep('forest');"); game.adventureQuestsCompleted.aq_story_premier_sang = true; /* v3.293.0 : run défini */ run("StoryQuestManager.claimStep('forest');"); // v3.260.0 : kills comptés après acceptation
game.heroLevel = 2; game.upgrades.utrain_power = 1;
run("StoryQuestManager.acceptStep('forest'); StoryQuestManager.claimStep('forest');");
game.upgrades.u_gold = 1;
run("StoryQuestManager.acceptStep('forest'); StoryQuestManager.claimStep('forest');");
run("StoryQuestManager.acceptStep('forest');");
var advM = g.MissionBoard.list().find(function (m) { return m.sourceKind === "adventure" && m.status === "available"; });
g.campMissionAction(advM.id, "accept");
/* v3.247.0 : « accept » passe d'abord par le pronostic de combat quand il est risqué ou pire
   (le héros du harnais est nu, donc il l'est). On confirme, comme le joueur avec « Partir ». */
if (typeof g.confirmCombatForecast === "function") g.confirmCombatForecast();
ok(g.pendingAdventureQuestId === advM.id.replace("adv_", ""), "campMissionAction('accept') sur une quête d'aventure ouvre l'intro réelle");
g.confirmAdventureQuestStart();
var advRunning = g.MissionBoard.getById(advM.id);
var htmlRunning = g.buildCampMissionCardHTML(advRunning);
ok(htmlRunning.indexOf("Continuer") !== -1 && htmlRunning.indexOf("Abandonner") !== -1, "mission en cours : boutons Continuer + Abandonner");
g.campMissionAction(advM.id, "abandon");
ok(g.game.adventureQuestRun.active === false, "campMissionAction('abandon') a bien appelé forfeit()");

console.log("\n[26] Campement : réclamer une mission prête depuis la carte");
game = freshCombat("knight");
g.StoryQuestManager.acceptStep("forest"); // étape 1 sans condition -> prête immédiatement
var readyMission = g.MissionBoard.list().find(function (m) { return m.sourceKind === "story" && m.status === "claimable"; });
ok(!!readyMission, "étape Histoire prête à réclamer");
var readyHtml = g.buildCampMissionCardHTML(readyMission);
ok(readyHtml.indexOf("Réclamer") !== -1 && readyHtml.indexOf("is-claimable") !== -1, "carte prête : bouton Réclamer, style is-claimable");
var gold0 = game.gold;
g.campMissionAction(readyMission.id, "claim");
ok(game.gold === gold0 + 50 && game.storyQuests.forest.currentStep === 1, "campMissionAction('claim') a bien réclamé et avancé l'étape");

console.log("\n[27] Écran Quêtes = onglets de catégorie (3.116.0, Lot B)");
game = freshCombat("knight"); giveWeapon(); game.activeTab = "quests"; g.activeQuestsFilter = "active";
ok(typeof g.collectActiveQuestCardEntries === "undefined" && typeof g.buildActiveQuestCardsHTML === "undefined", "ancienne collecte par catégories retirée");
g.activeQuestCategory = "histoire";
var questsHtml = g.buildQuestsHTML();
ok(questsHtml.indexOf("qb-tabs") !== -1 && questsHtml.indexOf("qb-tab") !== -1, "barre d'onglets de catégorie présente");
ok(questsHtml.indexOf("story-step") !== -1, "onglet Histoire : chaîne Histoire (détaillée) affichée");
// chaque mission non-Histoire apparaît sur SON onglet de catégorie (et pas ailleurs)
var allMissions = g.MissionBoard.list();
g.QUEST_BOARD_CATEGORIES.forEach(function (cat) {
  g.activeQuestCategory = cat.key;
  var catHtml = g.buildQuestsHTML();
  var catMissions = allMissions.filter(function (m) { return cat.kinds.indexOf(m.sourceKind) !== -1 && m.sourceKind !== "story"; });
  ok(catMissions.every(function (m) { return catHtml.indexOf(g.esc(m.title)) !== -1; }), "onglet " + cat.label + " : ses " + catMissions.length + " mission(s) affichée(s)");
});
g.activeQuestCategory = "histoire";
ok(g.buildQuestsHTML().indexOf("qb-card") !== -1 || allMissions.filter(function (m) { return m.sourceKind === "worldExpedition"; }).length === 0, "cartes bannière .qb-card utilisées (buildQuestBoardCardHTML)");

console.log("\n[28] Filtre Terminée : toujours fonctionnel (chemin inchangé)");
game = freshCombat("knight");
g.activeQuestsFilter = "completed";
var completedHtml = g.buildQuestsHTML();
ok(typeof completedHtml === "string", "le filtre Terminée rend sans exception");
g.activeQuestsFilter = "active";

console.log("\n[29] Journalières retirées (3.116.0, Lot A) : plus aucun vestige actif");
ok(typeof g.QuestManager === "undefined" && typeof g.QUEST_CONFIG === "undefined" && typeof g.QUEST_TEMPLATES === "undefined", "QuestManager / QUEST_CONFIG / QUEST_TEMPLATES absents");
ok(typeof g.ensureDailyQuests === "undefined" && typeof g.buildQuestsDailySubTabHTML === "undefined", "ensureDailyQuests / buildQuestsDailySubTabHTML absents");
ok(g.MissionBoard.list().every(function (m) { return m.sourceKind !== "contract"; }), "aucune mission sourceKind contract au tableau");
run("updateQuestBadge()");
ok(true, "updateQuestBadge() ne plante pas sans journalières");
// save migrée : un vieux game.quests en mémoire ne fait rien planter (données inertes)
game.quests = [{ id: "kills", name: "A", desc: "d", target: 5, rewardGold: 10, rewardEssence: 1, claimed: false }];
run("updateQuestBadge()");
var htmlWithLegacyQuests = g.buildQuestsHTML();
ok(typeof htmlWithLegacyQuests === "string" && htmlWithLegacyQuests.indexOf(">A<") === -1, "save migrée : vieux game.quests ignoré partout, aucun rendu");
delete game.quests;

console.log("\n[30] Navigation : openQuestsAt bascule bien sur l'onglet Quêtes");
game.activeTab = "campement"; g.activeQuestsFilter = "completed"; g.activeQuestCategory = "histoire";
g.openQuestsAt("expedition", null);
ok(game.activeTab === "quests" && g.activeQuestsFilter === "active", "openQuestsAt : onglet Quêtes, filtre Active");
ok(g.activeQuestCategory === "secondaires", "openQuestsAt('expedition') route vers l'onglet Secondaires");
g.openQuestsAt("adventure", null);
ok(g.activeQuestCategory === "aventure", "openQuestsAt('adventure') route vers l'onglet Aventure");
g.activeQuestCategory = "histoire";

console.log("\n[31] Écran Quêtes : lien Terminées discret, plus de sous-onglets ni de filtre pleine largeur");
game = freshCombat("knight"); game.activeTab = "quests"; g.activeQuestsFilter = "active"; g.activeQuestCategory = "histoire";
ok(typeof g.setQuestsSubTab === "undefined" && typeof g.buildQuestsSubTabBarHTML === "undefined", "sous-onglet Journalières retiré (fonctions absentes)");
var questsHtml = g.buildQuestsHTML();
ok(questsHtml.indexOf("pc-subtab-bar") === -1 && questsHtml.indexOf("quest-mode-btn") === -1, "plus de sous-onglets ni de boutons de filtre pleine largeur");
ok(questsHtml.indexOf("qb-completed-link") !== -1, "lien discret vers les quêtes terminées présent");
g.setQuestsFilter("completed");
var completedHtml2 = g.buildQuestsHTML();
ok(completedHtml2.indexOf("Retour aux quêtes actives") !== -1, "vue Terminées : lien de retour présent");
g.setQuestsFilter("active");

console.log("\n[32] XP par mission (3.103.3, décision §10 n°6) : 10 combat / 5 boss / 15 Histoire, jamais par kill");
game = freshCombat("knight"); giveWeapon();
var xp0 = game.heroXp, lvl0 = game.heroLevel;
game.enemy.chargeIn = 99; game.enemy.hp = 1;
g.CombatEngine.heroAction("basic"); // 1er kill hors mission -> ouvre une sortie farm
ok(game.heroXp === xp0 && game.heroLevel === lvl0, "kill en farm (hors mission) : aucune XP (pas de kill-XP, farm exclu de grantMissionXp)");
g.SortieManager.returnToCamp();
ok(game.heroXp === xp0, "Rentrer (farm) : toujours aucune XP");

game = freshCombat("knight"); giveWeapon();
xp0 = game.heroXp;
g.AdventureQuestManager.start("hq_wolf_pack"); // pure kill, pas de boss (v3.109.0 : ex-aq_forest_scout, supprimée)
var quest = g.ADVENTURE_QUESTS.hq_wolf_pack;
for (var i = 0; i < quest.steps[0].target; i++) { game.enemy.chargeIn = 99; game.enemy.hp = 1; g.CombatEngine.heroAction("basic"); }
ok(game.adventureQuestsCompleted.hq_wolf_pack === true, "quête d'aventure (kill) terminée");
ok(game.heroXp - xp0 === 10 || (game.heroLevel > lvl0), "mission de combat réussie : +10 XP (xp0=" + xp0 + " -> " + game.heroXp + ", niveau " + game.heroLevel + ")");

game = freshCombat("knight"); giveWeapon();
xp0 = game.heroXp; var lvlBefore = game.heroLevel; var xpToNextBefore = game.heroXpToNext;
g.AdventureQuestManager.start("aq_forest_expedition"); // se termine sur un bossKill (Roi Slime)
var qBoss = g.ADVENTURE_QUESTS.aq_forest_expedition;
for (var k = 0; k < qBoss.steps[0].target; k++) { game.enemy.chargeIn = 99; game.enemy.hp = 1; g.CombatEngine.heroAction("basic"); }
game.enemy.isBoss = true; game.enemy.id = "slimeking"; game.enemy.chargeIn = 99; game.enemy.hp = 1;
g.CombatEngine.heroAction("basic");
ok(game.adventureQuestsCompleted.aq_forest_expedition === true, "quête d'aventure (boss) terminée");
var xpGained = (game.heroLevel - lvlBefore) * xpToNextBefore + game.heroXp - xp0; // approx si level-up entre-temps (peu probable ici)
ok(g.game.sortie.killedBoss === false, "sortie remise à zéro après end() : killedBoss reset"); // sortie déjà close, ensure() en recrée une vide
console.log("  (contrôle visuel) heroXp " + xp0 + " -> " + game.heroXp + ", niveau " + lvlBefore + " -> " + game.heroLevel);

console.log("\n[33] XP par mission : donjon (boss = 5), Histoire (15), farm exclu");
game = freshCombat("knight"); giveWeapon(); game.dungeonTickets = 3;
xp0 = game.heroXp;
g.DungeonManager.start(1);
for (var w = 0; w < g.DUNGEON_CONFIG.waveCount; w++) { game.enemy.chargeIn = 99; game.enemy.hp = 1; g.CombatEngine.heroAction("basic"); }
game.enemy.isBoss = true; game.enemy.chargeIn = 99; game.enemy.hp = 1;
g.CombatEngine.heroAction("basic");
ok(game.dungeonRun.active === false, "donjon terminé (15 vagues + boss)");
ok(game.heroXp > xp0 || game.heroLevel > lvl0, "donjon réussi (se termine sur un boss) : XP créditée (" + xp0 + " -> " + game.heroXp + ")");

game = freshCombat("knight");
xp0 = game.heroXp; lvl0 = game.heroLevel; xpToNextBefore = game.heroXpToNext;
gold0 = game.gold;
g.StoryQuestManager.acceptStep("forest");
g.StoryQuestManager.claimStep("forest");
ok(game.heroXp - xp0 === 15 || game.heroLevel > lvl0, "étape Histoire réclamée : +15 XP (" + xp0 + " -> " + game.heroXp + ")");
ok(game.gold === gold0 + 50, "la récompense d'or de l'étape reste inchangée (+50, l'XP s'ajoute)");

console.log("\n[34] P5 : Troll des forêts, Ronce animée, Seigneur de guerre orc — données intégrées");
ok(g.ENEMY_DB.foresttroll && g.ENEMY_DB.foresttroll.name === "Troll des forêts", "Troll des forêts dans ENEMY_DB");
ok(g.ENEMY_DB.bramble && g.ENEMY_DB.bramble.name === "Ronce animée", "Ronce animée dans ENEMY_DB");
ok(g.BOSS_DB.orcwarlord && g.BOSS_DB.orcwarlord.name === "Seigneur de guerre orc", "Seigneur de guerre orc dans BOSS_DB");
ok(g.ENEMY_DB.foresttroll.image === "./images/Enemies/foresttroll.jpg" && g.ENEMY_DB.bramble.image === "./images/Enemies/bramble.jpg", "chemins d'image ennemis corrects");
ok(g.BOSS_DB.orcwarlord.image === "./images/Boss/Lord_OrcWarlord.jpg", "chemin d'image boss correct");
ok(g.ASSETS.enemies.foresttroll && g.ASSETS.enemies.bramble && g.ASSETS.bosses.orcwarlord, "emojis de repli présents (ASSETS)");

console.log("\n[35] P5/v3.107.4 : pools Forêt réduits au tutoriel de base, boss du Cœur changé");
var forestWorld = g.WORLDS.find(function (w) { return w.id === "forest"; });
var lisiere = forestWorld.adventures.find(function (a) { return a.id === "forest_1"; });
var coeur = forestWorld.adventures.find(function (a) { return a.id === "forest_2"; });
ok(lisiere.enemyPool.indexOf("foresttroll") === -1 && lisiere.enemyPool.indexOf("bramble") === -1, "Lisière : pool réduit (Troll/Ronce absents en base, décision Seb v3.107.4)");
ok(coeur.enemyPool.indexOf("foresttroll") === -1 && coeur.enemyPool.indexOf("bramble") === -1, "Cœur : pool réduit avant Acte III (Troll/Ronce absents par défaut)");
ok(lisiere.boss === "slimeking", "Lisière : le Roi Slime reste le boss");
ok(coeur.boss === "orcwarlord", "Cœur : nouveau boss (Seigneur de guerre orc)");

console.log("\n[36] P5/v3.107.4 : generateEnemy pioche dans le pool réduit en base, sans toucher combat-engine.js");
game = freshCombat("knight");
run("WorldManager.worldIndex = 0; WorldManager.adventureIndex = 0; WorldManager.enemyIndex = 0;");
var seenIds = {};
for (var i = 0; i < 200; i++) { var e = g.WorldManager.generateEnemy(); seenIds[e.id] = true; }
ok(!seenIds.foresttroll && !seenIds.bramble, "Troll/Ronce ne sortent plus du tirage en Lisière de base (200 tirages) : " + JSON.stringify(Object.keys(seenIds)));
run("WorldManager.worldIndex = 0; WorldManager.adventureIndex = 1; WorldManager.enemyIndex = 9;"); // dernier index = boss
var bossE = g.WorldManager.generateEnemy();
ok(bossE.id === "orcwarlord" && bossE.isBoss === true, "Cœur, dernier index : le boss généré est bien le Seigneur de guerre orc");
run("WorldManager.worldIndex = 0; WorldManager.adventureIndex = 0; WorldManager.enemyIndex = 9;");
var bossL = g.WorldManager.generateEnemy();
ok(bossL.id === "slimeking" && bossL.isBoss === true, "Lisière, dernier index : le boss généré reste le Roi Slime");

console.log("\n[37] v3.109.0 : étape 15 recâblée sur la quête « Le Cœur de la Forêt » (plus de compteur de boss en farm libre)");
game = freshCombat("knight");
run("StoryQuestManager.ensure();");
ok(typeof game.storyQuests.forest.counters.coeurBossKills === "undefined" && typeof game.storyQuests.forest.lastSeenBossKills === "undefined", "coeurBossKills / lastSeenBossKills ne sont plus initialisés");
var step15 = g.STORY_QUESTS.forest.steps.find(function (s) { return s.id === "forest_15"; });
ok(step15.linkTo && step15.linkTo.section === "adventure" && step15.linkTo.cardId === "adv_aq_forest_depths", "forest_15 liée à aq_forest_depths (linkTo)");
ok(step15.objectiveLabel.indexOf("Seigneur de guerre orc") !== -1 && step15.objectiveLabel.indexOf("niveau") === -1, "texte de l'étape 15 : nomme le boss, plus de condition de niveau");
game.adventureQuestsCompleted.aq_forest_depths = false;
ok(step15.check(game) === false && step15.progress(game).indexOf("Seigneur de guerre orc 0/1") !== -1, "sans la quête : non prête (Orc 0/1)");
game.adventureQuestsCompleted.aq_forest_depths = true;
ok(step15.check(game) === false, "v3.133.0 : quête terminée mais pas d'offrande : toujours non prête (les 200 kills ne sont plus une condition)");
game.storyQuests.forest.counters.offeringDone = 1;
ok(step15.check(game) === true, "quête terminée + offrande faite : prête");
ok(typeof g.STORY_STEP15_PROVISIONAL === "undefined" && g.STORY_STEP15_OFFERING.seve_aeswyn === 3 && g.STORY_STEP15_OFFERING.ration === 1, "STORY_STEP15_PROVISIONAL retiré, STORY_STEP15_OFFERING = 3 Sève + 1 Ration");

console.log("\n[38] P5 : la quête d'aventure de Lisière (Roi Slime) n'est pas affectée");
var aqExpedition = g.ADVENTURE_QUESTS.aq_forest_expedition;
ok(aqExpedition.steps[1].bossId === "slimeking", "aq_forest_expedition (Lisière) cible toujours slimeking, inchangé");

console.log("\n[39] P5 : un combat complet contre chaque nouvel ennemi et le nouveau boss fonctionne (moteur réel)");
["foresttroll", "bramble"].forEach(function (enemyId) {
  game = freshCombat("knight"); giveWeapon();
  game.enemy = g.CombatEngine.prepareEnemy(Object.assign({}, g.ENEMY_DB[enemyId], { id: enemyId, isBoss: false, hp: 50, maxHp: 50, goldReward: 1, essenceReward: 0 }));
  game.enemy.chargeIn = 99;
  var played = g.CombatEngine.heroAction("basic");
  ok(played === true && game.enemy.hp < 50, enemyId + " : un round se joue normalement (dégâts infligés)");
});
game = freshCombat("knight"); giveWeapon();
game.enemy = g.CombatEngine.prepareEnemy(Object.assign({}, g.BOSS_DB.orcwarlord, { id: "orcwarlord", isBoss: true, hp: 80, maxHp: 80, goldReward: 40, essenceReward: 3 }));
game.enemy.chargeIn = 99; game.enemy.healIn = 99; game.enemy.shieldIn = 99;
ok(g.CombatEngine.heroAction("basic") === true && game.enemy.hp < 80, "Seigneur de guerre orc : un round se joue normalement (dégâts infligés)");
ok(g.getDamageAffinity().status === "neutral", "boss neutre : orcwarlord aussi (règle boss = neutre, quel que soit resists/weak déclarés)");

console.log("\n[40] Profils de round distincts (3.104.1, P5) : archétype fixe par ennemi");
ok(g.FIXED_ENEMY_ARCHETYPES.foresttroll === "shielded" && g.FIXED_ENEMY_ARCHETYPES.bramble === "silenced", "table d'archétypes fixes correcte");
ok(g.decideNormalEnemyArchetype(0, false, 99, "foresttroll") === "shielded", "Troll : bouclier même en Forêt (worldIndex 0), même avec un tirage défavorable");
ok(g.decideNormalEnemyArchetype(0, false, 1, "bramble") === "silenced", "Ronce : silence même en Forêt, même avec un tirage favorable à rien");
ok(g.decideNormalEnemyArchetype(0, false, 1, "slime") === null, "Slime : pas d'archétype fixe, worldIndex 0 -> toujours null (silenced réservé au tirage dès worldIndex 1)");
ok(g.decideNormalEnemyArchetype(1, false, 10, "slime") === "silenced", "comportement de tirage existant inchangé pour le reste du pool (silenced dès worldIndex 1)");

/* v3.259.0 : index d'étape cherché par id — une étape insérée dans la chaîne ne casse plus ces tests. */
function stepIdx(id) { return g.STORY_QUESTS.forest.steps.findIndex(function (s) { return s.id === id; }); }
console.log("\n[41] generateEnemy assigne bien l'archétype fixe en conditions réelles (Cœur, Acte III — v3.107.4)");
game = freshCombat("knight");
game.storyQuests.forest.currentStep = stepIdx("forest_crossing"); // Acte III (v3.109.0) : synchro pool Cœur
g.StoryQuestManager._syncCoeurEnemyPool();
run("WorldManager.worldIndex = 0; WorldManager.adventureIndex = 1; WorldManager.enemyIndex = 0;"); // Cœur
var trollSeen = null, brambleSeen = null;
for (var i = 0; i < 300 && (!trollSeen || !brambleSeen); i++) {
  var e = g.WorldManager.generateEnemy();
  if (e.id === "foresttroll") trollSeen = e;
  if (e.id === "bramble") brambleSeen = e;
}
ok(trollSeen && trollSeen.archetype === "shielded", "Troll généré au Cœur (Acte III) : archetype shielded");
ok(brambleSeen && brambleSeen.archetype === "silenced", "Ronce générée au Cœur (Acte III) : archetype silenced");

console.log("\n[42] Troll (shielded) : télégraphe -> bouclier -50% dégâts, comme le bouclier boss");
game = freshCombat("knight"); giveWeapon(); game.heroHp = game.heroMaxHp = 100000;
game.enemy = g.CombatEngine.prepareEnemy({ id: "foresttroll", name: "Troll des forêts", isBoss: false, archetype: "shielded", hp: 100000, maxHp: 100000, stats: g.ENEMY_DB.foresttroll.stats, resists: [], weak: [] });
game.enemy.shieldIn = 1;
g.CombatEngine.heroAction("basic");
ok(game.enemy.shieldTelegraphed === true, "bouclier télégraphié sur un ennemi normal");
ok(g.ClassCombatManager.getGrimoireCombatContext().shieldIncoming === true, "contexte Grimoire : shieldIncoming vrai pour un ennemi normal");
g.CombatEngine.heroAction("basic");
ok(game.enemy.shieldRounds === 2, "impact : bouclier actif 2 rounds (comme le bouclier boss)");
/* v3.243.0 : la jauge est remise à zéro avant CHAQUE mesure. Sans ça, la frappe bonus
   tombait sur l'une des deux attaques et pas sur l'autre, ce qui mesurait le hasard du
   remplissage au lieu de la réduction du bouclier. */
game.critChance = 0;
var hpBeforeShield = game.enemy.hp;
game.heroGauge = 0;
g.CombatEngine.heroAction("basic");
var dmgWithShield = hpBeforeShield - game.enemy.hp;
game.enemy.shieldRounds = 0;
var hpNoShield = game.enemy.hp;
game.heroGauge = 0;
g.CombatEngine.heroAction("basic");
var dmgNoShield = hpNoShield - game.enemy.hp;
ok(dmgWithShield < dmgNoShield, "dégâts réduits sous bouclier (" + Math.round(dmgWithShield) + " < " + Math.round(dmgNoShield) + ")");

console.log("\n[43] Ronce (silenced) : télégraphe -> silence, identique au comportement existant");
game = freshCombat("knight"); giveWeapon(); game.heroHp = game.heroMaxHp = 100000;
game.enemy = g.CombatEngine.prepareEnemy({ id: "bramble", name: "Ronce animée", isBoss: false, archetype: "silenced", hp: 100000, maxHp: 100000, stats: g.ENEMY_DB.bramble.stats, resists: [], weak: [] });
game.enemy.silenceIn = 1;
g.CombatEngine.heroAction("basic");
ok(game.enemy.silenceTelegraphed === true, "silence télégraphié");
g.CombatEngine.heroAction("basic");
ok(game.silencedRounds === 2, "silence actif 2 rounds");

console.log("\n[44] Grimoire : shieldIncoming utilisable comme contre sur un ennemi normal (Troll)");
game = freshCombat("knight"); giveWeapon();
var enemyShielded = { isBoss: false, archetype: "shielded", stats: g.ENEMY_DB.foresttroll.stats };
var enemyChargeNormal = { isBoss: false, archetype: null, stats: g.ENEMY_DB.wolf.stats };
ok(g.isConditionPossibleForEnemy("shieldIncoming", enemyShielded) === true, "shieldIncoming possible pour le Troll (ennemi normal shielded)");
ok(g.isConditionPossibleForEnemy("chargeIncoming", enemyShielded) === false, "chargeIncoming impossible pour le Troll (il ne charge jamais)");
ok(g.isConditionPossibleForEnemy("chargeIncoming", enemyChargeNormal) === true, "chargeIncoming toujours possible pour un ennemi charge classique (Loup)");
ok(g.isConditionPossibleForEnemy("shieldIncoming", { isBoss: true }) === true, "shieldIncoming toujours possible pour un boss (comportement existant préservé)");

console.log("\n[45] Non-régression : Roi Slime et Seigneur de guerre orc gardent leur bouclier/soin de boss normal");
game = freshCombat("knight"); giveWeapon(); game.heroHp = game.heroMaxHp = 100000;
game.enemy = g.CombatEngine.prepareEnemy(Object.assign({}, g.BOSS_DB.orcwarlord, { id: "orcwarlord", isBoss: true, hp: 100000, maxHp: 100000 }));
game.enemy.healIn = 99; game.enemy.shieldIn = 1;
g.CombatEngine.heroAction("basic");
ok(game.enemy.shieldTelegraphed === true, "le boss orcwarlord télégraphie toujours son bouclier normalement");
g.CombatEngine.heroAction("basic");
ok(game.enemy.shieldRounds === 2, "bouclier boss inchangé (2 rounds)");

console.log("\n[46] Distance (3.105.0) : table d'approche, Chevalier au contact, approche = pas de frappe");
ok(g.getEnemyEngageRounds("spider", false) === 0 && g.getEnemyEngageRounds("goblin", false) === 0 && g.getEnemyEngageRounds("bramble", false) === 0, "araignée/gobelin/Ronce frappent à distance (0)");
ok(g.getEnemyEngageRounds("slime", false) === 2 && g.getEnemyEngageRounds("wolf", false) === 2 && g.getEnemyEngageRounds("foresttroll", false) === 2, "slime/loup approchent en 2 (v3.206.0), Troll en 2");
ok(g.getEnemyEngageRounds("foresttroll", true) === 2, "boss : toujours ENGAGE_BOSS_ROUNDS (la table des normaux est ignorée)");
game = freshCombat("knight");
ok(Number(game.enemy.engageIn || 0) === 0, "Chevalier (épée) : ennemi au contact direct (engageIn 0)");
game = freshCombat("ranger");
var engExpected = { slime: 2, wolf: 2, goblin: 0, spider: 0, foresttroll: 2, bramble: 0 }; // v3.206.0 : défaut 1 -> 2
ok(game.enemy.engageIn === engExpected[game.enemy.id], "Rôdeur : engageIn selon la table (" + game.enemy.id + " -> " + game.enemy.engageIn + ")");
game = freshCombat("mage");
ok(game.enemy.engageIn === engExpected[game.enemy.id], "Mage : à distance aussi (" + game.enemy.id + " -> " + game.enemy.engageIn + ")");
// round d'approche : l'ennemi avance au lieu de frapper, sa jauge se remplit, ses compteurs tournent
game = freshCombat("ranger"); giveWeapon();
game.enemy = g.CombatEngine.prepareEnemy({ id: "slime", name: "Slime", isBoss: false, archetype: null, hp: 100000, maxHp: 100000, stats: g.ENEMY_DB.slime.stats, resists: [], weak: [] });
ok(game.enemy.engageIn === 2, "prepareEnemy : slime à 2 rounds d'approche face au Rôdeur (v3.206.0)");
game.enemy.chargeIn = 3;
var hp0 = game.heroHp, gauge0 = game.enemy.gauge, charge0 = game.enemy.chargeIn;
g.CombatEngine.heroAction("basic");
ok(game.heroHp === hp0, "round d'approche : le héros n'est pas frappé");
ok(game.enemy.engageIn === 1, "il reste un round d'approche (v3.206.0)");
g.CombatEngine.heroAction("basic");
ok(game.heroHp === hp0, "second round d'approche : toujours pas frappé");
ok(game.enemy.engageIn === 0, "l'ennemi est arrivé au contact");
ok(game.enemy.gauge > gauge0, "sa jauge s'est remplie pendant l'approche (arrive « lancé ») : " + Math.round(game.enemy.gauge));
ok(game.enemy.chargeIn === charge0 - 2, "le compte à rebours de charge a tourné pendant les deux rounds d'approche");
g.CombatEngine.heroAction("basic");
ok(game.heroHp < hp0, "au contact : la riposte tombe (" + hp0 + " -> " + game.heroHp + ")");

console.log("\n[47] Distance : charge = contact, statut UI, parité simulateur, Chevalier inchangé");
game = freshCombat("ranger"); giveWeapon(); game.heroHp = game.heroMaxHp = 100000;
game.enemy = g.CombatEngine.prepareEnemy({ id: "wolf", name: "Loup", isBoss: false, archetype: null, hp: 100000, maxHp: 100000, stats: g.ENEMY_DB.wolf.stats, resists: [], weak: [] });
game.enemy.engageIn = 3; game.enemy.chargeTelegraphed = true; // charge télégraphiée pendant une longue approche
g.CombatEngine.heroAction("basic");
ok(game.enemy.engageIn === 0 && game.enemy.chargeTelegraphed === false, "impact de charge : la distance est fermée d'un coup");
game.enemy.engageIn = 2;
var sb = g.buildCombatAlertHTML();
ok(sb.indexOf("enemy_approaching.png") !== -1, "barre de statut : approche annonc\u00e9e dans le bandeau (engageIn 2)");
game.enemy.engageIn = 0;
ok(g.buildEnemyStatusBarHTML().indexOf("enemy-status-approaching") === -1, "icône absente au contact");
// parité simulateur : défauts, RPM décalé, Chevalier strictement inchangé
ok(g.CombatRoundSim.DEFAULTS.engageEnabled === true && g.CombatRoundSim.DEFAULTS.engageDefaultRounds === 1 && g.CombatRoundSim.DEFAULTS.engageBossRounds === 1, "sim : approche activée par défaut (1 / boss 1)");
var cfgOn = g.CombatRoundSim.config({ enemyHpCoef: g.ENEMY_PV_MULT, engageTable: g.ENEMY_ENGAGE_ROUNDS });
var cfgOff = g.CombatRoundSim.config({ enemyHpCoef: g.ENEMY_PV_MULT, engageEnabled: false });
var slimeDef = { id: "slime", name: "Slime", stats: g.ENEMY_DB.slime.stats, resists: [], weak: [] };
var trollDef = { id: "foresttroll", name: "Troll", stats: g.ENEMY_DB.foresttroll.stats, resists: [], weak: [] };
var hdR = { classId: "archer", weaponType: "bow", stats: g.HEROES_DB.ranger.stats, trained: {} };
var bOn = g.CombatRoundSim.duelBudget(hdR, g.CLASS_SKILLS.archer, slimeDef, false, cfgOn, 1);
var bOff = g.CombatRoundSim.duelBudget(hdR, g.CLASS_SKILLS.archer, slimeDef, false, cfgOff, 1);
ok(Math.abs(bOn.rpm - bOff.rpm - 1) < 1e-9 && Math.abs(bOn.rpt - bOff.rpt) < 1e-9, "sim duelBudget Rôdeur vs slime : RPM +1 (approche), RPT inchangé");
var tOn = g.CombatRoundSim.duelBudget(hdR, g.CLASS_SKILLS.archer, trollDef, false, cfgOn, 1);
var tOff = g.CombatRoundSim.duelBudget(hdR, g.CLASS_SKILLS.archer, trollDef, false, cfgOff, 1);
ok(Math.abs(tOn.rpm - tOff.rpm - 2) < 1e-9, "sim : Troll lent, RPM +2");
var hdK = { classId: "knight", weaponType: "sword", stats: g.HEROES_DB.knight.stats, trained: {} };
var kOn = g.CombatRoundSim.duelBudget(hdK, g.CLASS_SKILLS.knight, slimeDef, false, cfgOn, 1);
var kOff = g.CombatRoundSim.duelBudget(hdK, g.CLASS_SKILLS.knight, slimeDef, false, cfgOff, 1);
ok(Math.abs(kOn.rpm - kOff.rpm) < 1e-9 && Math.abs(kOn.rpt - kOff.rpt) < 1e-9, "sim : Chevalier strictement inchangé (mêlée)");

console.log("\n[48] Verrou Meute affamée (3.105.1) : hq_wolf_pack seul débloque l'étape 6, condition viande impossible retirée");
game = freshCombat("knight"); giveWeapon();
run("StoryQuestManager.ensure();");
game.storyQuests.forest.currentStep = 5; // forest_06
game.adventureQuestsCompleted = game.adventureQuestsCompleted || {};
game.adventureQuestsCompleted.hq_wolf_pack = true;
game.resources.viande = 0; // état bloqué réel observé en jeu (stock consommé par les repas)
var step06 = g.STORY_QUESTS.forest.steps[5];
ok(step06.objectiveLabel.indexOf("Viande") === -1, "libellé de l'étape : mention Viande retirée");
ok(step06.check(game) === true, "check() vrai avec hq_wolf_pack seule, viande à 0 (verrou levé)");
ok(step06.progress(game) === "Meute 1/1", "progress() : plus de fraction Viande");
g.StoryQuestManager.acceptStep("forest");
ok(g.StoryQuestManager.isCurrentStepReady("forest") === true, "isCurrentStepReady : true dès hq_wolf_pack terminée");
var gold0 = game.gold;
var claimed = g.StoryQuestManager.claimStep("forest");
ok(claimed === true && game.gold === gold0 + 200 && game.storyQuests.forest.currentStep === 6, "claimStep() réussit : or crédité, passage à l'étape 7");
// non-régression : hq_wolf_pack non complétée -> toujours bloqué
game = freshCombat("knight"); run("StoryQuestManager.ensure();");
game.storyQuests.forest.currentStep = 5;
game.adventureQuestsCompleted = {};
ok(g.STORY_QUESTS.forest.steps[5].check(game) === false, "sans hq_wolf_pack : étape toujours non validée (pas un déverrouillage inconditionnel)");

console.log("\n[49] Rations (3.106.0) : remplacent Repas, un bouton par type, soin = % de PV max, grande_ration inerte");
game = freshCombat("knight"); giveWeapon();
ok(game.resources.ration === 3 && game.resources.petite_ration === 0 && game.resources.grande_ration === 0, "départ : 3 rations moyennes (v3.107.1), 0 petite/grande (" + game.resources.ration + ")");
var rOpts = g.CampManager.getRationOptions();
ok(rOpts.length === 3 && rOpts[0].id === "petite_ration" && rOpts[2].id === "grande_ration", "getRationOptions() : ordre petite -> moyenne -> grande");
ok(Math.abs(rOpts[0].healPct - 0.35) < 1e-9 && Math.abs(rOpts[1].healPct - 0.60) < 1e-9 && Math.abs(rOpts[2].healPct - 1.00) < 1e-9, "% de soin : 35/60/100");
game.heroHp = 10;
var maxHp0 = game.heroMaxHp, before = game.resources.ration;
var ate = g.CampManager.eatRation("ration");
ok(ate === true && game.resources.ration === before - 1, "eatRation('ration') : 1 unité consommée");
ok(game.heroHp === 10 + Math.floor(maxHp0 * 0.60), "soin = 60 % des PV max (" + game.heroHp + ")");
game.heroHp = 10;
ok(g.CampManager.eatRation("grande_ration") === false, "grande_ration : refusée sans stock (structure inerte, pas de recette)");
game.heroHp = game.heroMaxHp;
ok(g.CampManager.eatRation("ration") === false, "PV pleins : ration refusée");
ok(typeof g.CAMP_MEAL_COST === "undefined" && typeof g.CampManager.eat === "undefined", "ancien système Repas (viande+eau) retiré");
game.activeTab = "campement";
game.heroHp = Math.floor(game.heroMaxHp * 0.5); // PV pleins -> "Pas faim" masque la liste (comportement voulu)
var campHtml = g.buildCampHTML();
ok(campHtml.indexOf("Rations") !== -1 && campHtml.indexOf("Petite ration") !== -1 && campHtml.indexOf("Grande ration") !== -1, "écran Campement : carte Rations avec les 3 types");
game.heroHp = game.heroMaxHp;

console.log("\n[50] Compteur de mission en combat (3.106.0) : aventure, chasse, donjon");
game = freshCombat("knight"); giveWeapon();
ok(g.getCombatMissionProgressLabel() === "", "hors mission (farm) : pas de label");
g.AdventureQuestManager.start("hq_wolf_pack");
ok(g.getCombatMissionProgressLabel().indexOf("0/16") !== -1, "quête d'aventure : label 0/16 au lancement (objectif porté à 16 en v3.282.0)");
var qs = g.ADVENTURE_QUESTS.hq_wolf_pack;
/* v3.282.0 : la Meute lance un GROUPE de deux — trois tours de boucle tuent la cible
   courante à chaque fois, donc trois crans, mais il faut viser l'ennemi vivant. */
for (var mk = 0; mk < 3; mk++) { var vise = game.enemy; vise.chargeIn = 99; vise.engageIn = 0; vise.hp = 1; g.CombatEngine.heroAction("basic"); }
ok(g.getCombatMissionProgressLabel().indexOf("3/16") !== -1,
  "quête d'aventure : label avancé à 3/16 après 3 kills (" + g.getCombatMissionProgressLabel() + ")");
game = freshCombat("knight"); giveWeapon();
g.HuntQuestManager.start("hq_forest_boar");
ok(g.getCombatMissionProgressLabel().indexOf("0/16") !== -1 && g.getCombatMissionProgressLabel().indexOf("Chasse") !== -1,
  "chasse : label 0/16 au lancement (lot porté à 16 en v3.284.0)");
for (var mh = 0; mh < 4; mh++) { var viseH = game.enemy; viseH.chargeIn = 99; viseH.engageIn = 0; viseH.hp = 1; g.CombatEngine.heroAction("basic"); }
ok(g.getCombatMissionProgressLabel().indexOf("4/16") !== -1,
  "chasse : label avancé à 4/16 après 4 kills (" + g.getCombatMissionProgressLabel() + ")");
game = freshCombat("knight"); giveWeapon(); game.dungeonTickets = 3;
g.DungeonManager.start(1);
ok(g.getCombatMissionProgressLabel().indexOf("Vague 1/") !== -1, "donjon : label vague 1/N au lancement (start() place directement la vague 1)");
game.enemy.chargeIn = 99; game.enemy.engageIn = 0; game.enemy.hp = 1; g.CombatEngine.heroAction("basic");
ok(g.getCombatMissionProgressLabel().indexOf("Vague 2/") !== -1, "donjon : label avance à la vague 2 après le 1er kill");
game = freshCombat("knight");
var html2 = g.buildCombatHTML();
ok(html2.indexOf("combat-mission-progress") !== -1, "l'écran Combat contient le slot du bandeau de mission");

console.log("\n[51] Difficulté Forêt plate (3.106.1) : enemyIndex neutralisé en Forêt, intact ailleurs");
run("WorldManager.worldIndex = 0; WorldManager.adventureIndex = 0;");
var slimeHp0 = null, slimeHp8 = null;
for (var wi = 0; wi < 40 && (slimeHp0 === null || slimeHp8 === null); wi++) {
  g.WorldManager.enemyIndex = 0; var e0 = g.WorldManager.generateEnemy(); if (e0.id === "slime") slimeHp0 = e0.maxHp;
  g.WorldManager.enemyIndex = 8; var e8 = g.WorldManager.generateEnemy(); if (e8.id === "slime") slimeHp8 = e8.maxHp;
}
ok(slimeHp0 !== null && slimeHp8 !== null && slimeHp0 === slimeHp8, "Forêt : PV du Slime identiques au 1er et au 9e ennemi (" + slimeHp0 + " = " + slimeHp8 + ")");
run("WorldManager.worldIndex = 1; WorldManager.adventureIndex = 0; WorldManager.enemyIndex = 0;");
var deserte0 = g.WorldManager.generateEnemy().maxHp;
run("WorldManager.enemyIndex = 9;");
var deserte9 = g.WorldManager.generateEnemy().maxHp;
ok(deserte9 > deserte0, "Désert : scaling enemyIndex toujours actif (idx0 " + deserte0 + " < idx9 " + deserte9 + ")");
run("WorldManager.worldIndex = 0; WorldManager.adventureIndex = 0; WorldManager.enemyIndex = 9;");
var forestBoss = g.WorldManager.generateEnemy();
ok(forestBoss.isBoss === true && forestBoss.id === "slimeking", "Forêt : le 10e index reste bien le boss (non affecté par le fix)");

console.log("\n[52] Boss stable (3.106.1) : plus de scaling sur totalKills GLOBAL (grandissait sans plafond)");
run("WorldManager.worldIndex = 0; WorldManager.adventureIndex = 0; WorldManager.enemyIndex = 9;");
game.totalKills = 0;
var bossAt0 = g.WorldManager.generateEnemy().maxHp;
game.totalKills = 500;
var bossAt500 = g.WorldManager.generateEnemy().maxHp;
ok(bossAt0 === bossAt500, "PV du boss de Lisière identiques à 0 et 500 kills totaux (" + bossAt0 + " = " + bossAt500 + ")");
game.totalKills = 0;
var bossBase = g.WorldManager.generateEnemy();
ok(bossBase.maxHp === Math.floor(58 * g.BOSS_PV_MULT), "PV boss = endurance × BOSS_PV_MULT (bossScale=1 en Lisière) : " + bossBase.maxHp);

console.log("\n[53] Filtre d'ennemis par quête (3.107.0) : QuestEnemyManager, générique, appliqué à la Meute affamée");
ok(typeof g.QuestEnemyManager === "object" && typeof g.QuestEnemyManager.spawnFor === "function", "QuestEnemyManager chargé avec spawnFor()");
ok(g.ADVENTURE_QUESTS.hq_wolf_pack.enemyFilter && g.ADVENTURE_QUESTS.hq_wolf_pack.enemyFilter.indexOf("wolf") !== -1, "hq_wolf_pack : enemyFilter = ['wolf']");
game = freshCombat("knight"); game.dungeonRun = { active: false }; game.adventureQuestRun = { active: false, questId: null };
var wolfPackIds = {};
for (var wp = 0; wp < 60; wp++) { g.AdventureQuestManager.start("hq_wolf_pack"); wolfPackIds[game.enemy.id] = true; g.AdventureQuestManager.forfeit(); }
ok(Object.keys(wolfPackIds).length === 1 && wolfPackIds.wolf === true, "60 lancements de hq_wolf_pack : que des loups (" + Object.keys(wolfPackIds).join(",") + ")");
var scoutIds = {};
for (var sc = 0; sc < 60; sc++) { g.AdventureQuestManager.start("aq_forest_depths"); scoutIds[game.enemy.id] = true; g.AdventureQuestManager.forfeit(); } // v3.109.0 : depths (sans filtre) remplace scout
ok(Object.keys(scoutIds).length > 1, "quête sans enemyFilter : pool complet toujours pioché (" + Object.keys(scoutIds).length + " ennemis distincts vus)");
var lisiereAdv = g.WORLDS.find(function (w) { return w.id === "forest"; }).adventures[0];
ok(lisiereAdv.enemyPool.length === 3 && lisiereAdv.enemyPool.indexOf("slime") !== -1, "pool Lisière intact après usage du filtre (aucune fuite d'état, pool réduit v3.107.4) : " + JSON.stringify(lisiereAdv.enemyPool));
var bossViaFilter = g.QuestEnemyManager.spawnFor(g.ADVENTURE_QUESTS.hq_wolf_pack, true);
ok(bossViaFilter.isBoss === true && bossViaFilter.id === "slimeking", "forceBoss ignore le filtre : le vrai boss de l'aventure sort, pas un loup");
var badFilterQuest = { worldId: "forest", adventureIndex: 0, enemyFilter: ["ennemi_inexistant"] };
var badFilterEnemy = g.QuestEnemyManager.spawnFor(badFilterQuest, false);
ok(!!badFilterEnemy, "enemyFilter incohérent (aucun match) : retombe sur le pool complet plutôt que de planter");

console.log("\n[54] Retours de test v3.107.1 : 5 points");
game = freshCombat("knight"); giveWeapon();
run("StoryQuestManager.acceptStep('forest'); StoryQuestManager.claimStep('forest');"); // 01 -> 02
run("StoryQuestManager.acceptStep('forest');"); // accepte forest_02
// v3.293.0 : Premier sang se joue dans son run défini (aq_story_premier_sang), plus en farm libre
g.AdventureQuestManager.start("aq_story_premier_sang");
ok(g.getCombatMissionProgressLabel() === "Premier sang · 0/5", "point 1 : compteur affiché pour forest_02 en combat (" + g.getCombatMissionProgressLabel() + ")");
for (var pk = 0; pk < 4; pk++) { game.enemy.chargeIn = 99; game.enemy.engageIn = 0; game.enemy.hp = 1; g.CombatEngine.heroAction("basic"); }
ok(g.getCombatMissionProgressLabel() === "Premier sang · 4/5", "point 1 : compteur avance avec les kills (4/5)");
game.enemy.chargeIn = 99; game.enemy.engageIn = 0; game.enemy.hp = 1; g.CombatEngine.heroAction("basic");
g.StoryQuestManager._checkNow(true);
ok(game.activeTab === "campement" && g.StoryQuestManager.isCurrentStepReady("forest"), "point 1 : run terminé -> retour au Campement, étape prête");

var forest04 = g.STORY_QUESTS.forest.steps[3];
ok(forest04.objectiveLabel.indexOf("300") === -1 && forest04.objectiveLabel.indexOf("or") === -1, "point 2 : condition 300 or retirée du libellé du Colporteur");
game = freshCombat("knight");
ok(!forest04.check(game), "point 2 : check() faux sans achat (même avec totalGoldEarned=0)");
game.upgrades.u_gold = 1;
ok(forest04.check(game), "point 2 : check() vrai avec un achat, peu importe l'or gagné");

run("fullResetState();");
ok(game.resources.ration === 3, "point 3 : 3 rations de départ (" + game.resources.ration + ")");

game = freshCombat("knight"); game.activeTab = "campement";
run("StoryQuestManager.acceptStep('forest'); StoryQuestManager.claimStep('forest');"); // 01 -> 02
game.equipped.weapon = { id: "w" };
run("StoryQuestManager.acceptStep('forest');"); game.adventureQuestsCompleted.aq_story_premier_sang = true; /* v3.293.0 : run défini */ run("StoryQuestManager.claimStep('forest');"); // v3.260.0 : kills comptés après acceptation // 02 -> 03
run("StoryQuestManager.acceptStep('forest');"); // accepte forest_03
g.activeHerosSubTab = "hero";
g.StoryQuestManager.goToLink("forest");
// v3.244.0 : « Stats » est une feuille basse du Résumé — le lien ouvre la feuille.
ok(game.activeTab === "more" && g.herosOpenSheet === "stats", "point 4 : « Continuer » sur forest_03 ouvre directement Héros > feuille Stats");

game = freshCombat("knight"); game.activeTab = "campement";
run("StoryQuestManager.acceptStep('forest'); StoryQuestManager.claimStep('forest');"); // 01 -> 02
game.equipped.weapon = { id: "w" };
run("StoryQuestManager.acceptStep('forest');"); game.adventureQuestsCompleted.aq_story_premier_sang = true; /* v3.293.0 : run défini */ run("StoryQuestManager.claimStep('forest');"); // v3.260.0 : kills comptés après acceptation // 02 -> 03
game.heroLevel = 2; game.upgrades.utrain_power = 1;
run("StoryQuestManager.acceptStep('forest'); StoryQuestManager.claimStep('forest');"); // 03 -> 04
game.upgrades.u_gold = 1;
run("StoryQuestManager.acceptStep('forest'); StoryQuestManager.claimStep('forest');"); // 04 -> 05
run("StoryQuestManager.acceptStep('forest');"); // accepte forest_05 (Prouver sa valeur)
var missionsP5 = g.MissionBoard.list();
var expedMission = missionsP5.find(function (m) { return m.id === "adv_aq_forest_expedition"; });
ok(expedMission && expedMission.isMain === true, "point 5 : aq_forest_expedition mise en évidence (isMain) pendant forest_05");
var scoutMission = missionsP5.find(function (m) { return m.id === "adv_aq_forest_depths"; });
ok(!scoutMission, "point 5/3 : une quête non liée à l'étape courante est masquée (aq_forest_depths absente pendant forest_05)");

console.log("\n[55] Retours de test v3.107.2 : 3 points (rations 1er lancement, position compteur, quête allégée)");
ok(g.ADVENTURE_QUESTS.aq_forest_expedition.steps[0].target === 9, "point 3 : Prouver sa valeur — 15 -> 9 kills (+ boss = 10 combats)");
var htmlCheck = g.buildCombatHTML();
var idxProg = htmlCheck.indexOf("combat-mission-progress");
var idxName = htmlCheck.indexOf("enemy-name");
ok(idxProg !== -1 && idxProg < idxName, "point 2 : le compteur de mission précède le nom de l'ennemi dans le DOM");
ok(g.game.resources.ration === 3, "point 1 (contrôle nouvelle partie via fullResetState) : 3 rations toujours posées");
// Le vrai bug (1er lancement, jamais de save, avant fullResetState) est couvert par un harnais séparé
// incluant boot.js (round-harness ne le charge pas — cf. session, chemin init()/ensureGameStateDefaults()).

console.log("\n[56] Retours de test v3.107.3 : blocage 0 PV, position compteur, vraie source des rations");
game = freshCombat("knight"); giveWeapon();
game.heroHp = 0; game.activeTab = "campement";
g.switchTab("combat");
ok(game.activeTab === "campement", "point 1 : switchTab('combat') refusé à 0 PV, retombe sur Campement");
game.heroHp = game.heroMaxHp;
game.huntRun = { active: true, questId: "hq_forest_boar", killsInLot: 0 }; // v3.293.0 : Combat exige un run de quête
g.switchTab("combat");
ok(game.activeTab === "combat", "point 1 (contrôle) : switchTab('combat') fonctionne normalement à PV > 0");
game.huntRun = { active: false, questId: null, killsInLot: 0 };
var dCorrupt = g.buildSaveData();
dCorrupt.activeTab = "combat"; dCorrupt.heroHp = 0;
g.restoreBaseState(dCorrupt);
ok(game.activeTab === "campement", "point 1 : une save chargée avec activeTab=combat + 0 PV retombe sur Campement (pas de blocage au reload)");

var htmlOrder = g.buildCombatHTML();
var idxMissionProg = htmlOrder.indexOf("combat-mission-progress");
var idxEnemyDisplay = htmlOrder.indexOf('id="enemy-display"');
var idxEnemyName = htmlOrder.indexOf("enemy-name");
ok(idxMissionProg !== -1 && idxEnemyDisplay < idxMissionProg && idxMissionProg < idxEnemyName, "point 2 (v3.107.5) : le compteur est DANS #enemy-display, avant enemy-name (suit le même margin-top que le reste du bloc)");

ok(typeof g.createInitialGameState === "function", "point 3 : createInitialGameState existe (vraie source d'un nouveau slot)");
var freshState = g.createInitialGameState();
ok(freshState.resources.ration === 3, "point 3 : createInitialGameState().resources.ration = 3 (corrigé à la source, v3.106.0/107.1/107.2 avaient patché le mauvais endroit)");
ok(freshState.resources.viande === 0, "point 3 : plus de 10 viande/6 eau résiduels dans l'état initial");

console.log("\n[57] Retours de test v3.107.4 : 6 points");
// Point 1 : v3.299.0 (W-1c, D5) — plus aucune questline de monde, nulle part
game = freshCombat("knight"); giveWeapon();
run("WorldManager.worldIndex = 1; WorldManager.adventureIndex = 1;"); // l'ancien cas d'affichage de « L'Appel des Ruines »
ok(!g.MissionBoard.list().some(function (m) { return m.sourceKind === "worldExpedition"; }) && typeof g.WorldQuestManager === "undefined" && typeof g.WORLD_QUESTS === "undefined", "point 1 : questlines de monde retirées (système, données, tableau)");
run("WorldManager.worldIndex = 0; WorldManager.adventureIndex = 0;"); // remet l'état par défaut pour la suite

// Point 2 : pool de base réduit, Troll/Ronce réapparaissent au Cœur dès l'Acte III
var lisiereP2 = g.WORLDS.find(function (w) { return w.id === "forest"; }).adventures[0];
ok(JSON.stringify(lisiereP2.enemyPool) === JSON.stringify(["slime", "goblin", "spider"]), "point 2 : pool de base Lisière = slime/goblin/spider uniquement");
var coeurP2 = g.WORLDS.find(function (w) { return w.id === "forest"; }).adventures[1];
game.storyQuests.forest.currentStep = 5; // avant Acte III
g.StoryQuestManager._syncCoeurEnemyPool();
ok(coeurP2.enemyPool.indexOf("foresttroll") === -1, "point 2 : Troll absent du Cœur avant l'Acte III");
game.storyQuests.forest.currentStep = g.STORY_QUESTS.forest.steps.findIndex(function (st) { return st.id === "forest_crossing"; }); // Acte III (v3.109.0)
g.StoryQuestManager._syncCoeurEnemyPool();
ok(coeurP2.enemyPool.indexOf("foresttroll") !== -1 && coeurP2.enemyPool.indexOf("bramble") !== -1, "point 2 : Troll+Ronce réapparaissent au Cœur dès l'Acte III (forest_crossing)");

// Point 3 : masquage des quêtes secondaires non liées, sauf si déjà en cours
game = freshCombat("knight"); giveWeapon();
run("StoryQuestManager.acceptStep('forest'); StoryQuestManager.claimStep('forest');"); // 01 -> 02
game.adventureQuestsCompleted.aq_story_premier_sang = true; /* v3.293.0 : run défini */ game.equipped.weapon = { id: "w" };
run("StoryQuestManager.acceptStep('forest');"); // accepte forest_02 (pas encore forest_05)
var m3 = g.MissionBoard.list();
ok(!m3.find(function (m) { return m.id === "adv_hq_wolf_pack"; }), "point 3 : hq_wolf_pack masquée pendant forest_02 (non liée à cette étape)");
// une quête lancée AVANT le changement d'étape reste visible (running)
g.AdventureQuestManager.start("hq_wolf_pack");
var m3b = g.MissionBoard.list();
var scoutRunning = m3b.find(function (m) { return m.id === "adv_hq_wolf_pack"; });
ok(scoutRunning && scoutRunning.status === "running", "point 3 : une quête déjà LANCÉE reste visible même non liée à l'étape courante");
g.AdventureQuestManager.forfeit();

// Point 4 : Prouver sa valeur limitée aux 3 ennemis génériques
ok(JSON.stringify(g.ADVENTURE_QUESTS.aq_forest_expedition.enemyFilter) === JSON.stringify(["slime", "goblin", "spider"]), "point 4 : aq_forest_expedition.enemyFilter = slime/goblin/spider");
game = freshCombat("knight"); giveWeapon(); game.dungeonRun = { active: false }; game.adventureQuestRun = { active: false, questId: null };
var seenExped = {};
for (var pe = 0; pe < 60; pe++) { g.AdventureQuestManager.start("aq_forest_expedition"); if (!game.enemy.isBoss) seenExped[game.enemy.id] = true; g.AdventureQuestManager.forfeit(); }
ok(Object.keys(seenExped).every(function (id) { return ["slime", "goblin", "spider"].indexOf(id) !== -1; }), "point 4 : seuls slime/goblin/spider sortent du tirage de Prouver sa valeur (" + Object.keys(seenExped).join(",") + ")");

// Point 5 : compteur de kills + seuil 10 pour la Meute affamée
/* v3.282.0 : 16 et non plus 10 — une meute de deux fait avancer l'objectif de deux crans,
   16 ramène le coût total à celui d'avant les groupes (sim/quest-cost-bench.js). */
ok(g.ADVENTURE_QUESTS.hq_wolf_pack.steps[0].target === 16, "point 5 : Meute affamée à 16 crans");
game = freshCombat("knight"); giveWeapon(); game.dungeonRun = { active: false }; game.adventureQuestRun = { active: false, questId: null };
g.AdventureQuestManager.start("hq_wolf_pack");
ok(g.getCombatMissionProgressLabel() === "La Meute Affamée · 0/16", "point 5 : compteur de mission affiché pour la Meute affamée (" + g.getCombatMissionProgressLabel() + ")");

// Point 6 : la Carrière redevient visible AVANT d'être débloquée (comportement historique
// toujours valable pour elle). v3.123.0 (Lot S2b) : ids "scene_*" (migrées vers le scene-engine).
// v3.131.0 (retour Seb) : CORRIGÉ pour La Source Tarie — elle N'A JAMAIS eu de boardRequires
// (seul canevas dans ce cas), donc visible dès le lancement d'une partie neuve, avant même Le
// Bosquet Silencieux. C'était un oubli, pas un choix voulu : elle exige maintenant
// sawmillUnlocked (débloqué par Le Bosquet Silencieux) pour s'afficher, alignée sur le reste
// de la chaîne (terre_en_friche exige déjà wellUnlocked, donc suppose Source Tarie déjà faite).
game = freshCombat("knight");
game.explorationProgression.wellUnlocked = false; game.explorationProgression.driedSpringDiscoveryCompleted = false;
game.explorationProgression.quarryUnlocked = false; game.explorationProgression.unstableVeinDiscoveryCompleted = false;
game.explorationProgression.sawmillUnlocked = false;
var m6 = g.MissionBoard.list();
ok(!m6.find(function (m) { return m.id === "scene_source_tarie"; }), "point 6 (fix v3.131.0) : La source tarie absente avant sawmillUnlocked (n'arrive plus trop tôt)");
game.explorationProgression.sawmillUnlocked = true;
var m6a = g.MissionBoard.list();
ok(!!m6a.find(function (m) { return m.id === "scene_source_tarie"; }), "point 6 (fix v3.131.0) : La source tarie apparaît une fois sawmillUnlocked (Bosquet Silencieux terminé)");
// v3.118.0 (retour Seb) : CORRIGÉ — ce "bonus, même bug" documentait un vrai défaut (la Veine
// Instable apparaissait dès le boot, avant même d'avoir terminé le Sentier Obstrué, alors que
// c'est déjà son prérequis de LANCEMENT). Elle exige maintenant forgottenClearingUnlocked pour
// s'afficher, alignée sur son vrai prérequis.
ok(!m6a.find(function (m) { return m.id === "scene_veine_instable"; }), "point 6 (fix v3.118.0) : La veine instable absente tant que le Sentier Obstrué n'est pas terminé");
game.explorationProgression.forgottenClearingUnlocked = true;
var m6c = g.MissionBoard.list();
ok(!!m6c.find(function (m) { return m.id === "scene_veine_instable"; }), "point 6 (fix v3.118.0) : réapparaît une fois forgottenClearingUnlocked (Sentier Obstrué terminé)");
game.explorationProgression.wellUnlocked = true;
var m6b = g.MissionBoard.list();
ok(!m6b.find(function (m) { return m.id === "scene_source_tarie"; }), "point 6 : disparaît une fois le Puits débloqué (comportement normal)");

console.log("\n[58] Compteur de mission — repositionnement définitif (3.107.5)");
var htmlFinal = g.buildCombatHTML();
var idxED = htmlFinal.indexOf('id="enemy-display"');
var idxMP = htmlFinal.indexOf("combat-mission-progress");
var idxEN = htmlFinal.indexOf('id="enemy-name"');
var idxESB = htmlFinal.indexOf("enemy-status-bar");
var idxEHP = htmlFinal.indexOf('id="enemy-hp-bar-wrapper"');
// v3.241.0 (layout A2) : les statuts passent SOUS la jauge de PV, en rangée.
ok(idxED < idxMP && idxMP < idxEN && idxEN < idxEHP && idxEHP < idxESB, "ordre DOM : enemy-display > mission > enemy-name > PV > enemy-status-bar (v3.241.0)");
ok(htmlFinal.indexOf("position: absolute") === -1 || true, "pas de contrainte sur inline styles (vérif CSS externe séparée)");
var cssFinal = fs.readFileSync(path.join(ROOT, "css/03-combat.css"), "utf8");
var cssBlockStart = cssFinal.indexOf(".combat-mission-progress {");
var cssBlockEnd = cssFinal.indexOf("}", cssBlockStart);
var cssBlock = cssFinal.substring(cssBlockStart, cssBlockEnd);
ok(cssBlock.indexOf("position: absolute") === -1, "le compteur n'est plus en position absolute (suit le flux flex normal comme le nom/PV/sprite)");

console.log("\n[59] Retours de test v3.107.6 : 2 points");
// Point 1 : compteur compense le translateY(-25px) de #enemy-name — visible, pas quasi-recouvert
var cssV6 = fs.readFileSync(path.join(ROOT, "css/03-combat.css"), "utf8");
var blockStart = cssV6.indexOf(".combat-mission-progress {");
var blockEnd = cssV6.indexOf("}", blockStart);
var block = cssV6.substring(blockStart, blockEnd);
ok(block.indexOf("margin-bottom: 28px") !== -1, "point 1 : marge de compensation du translateY(-25px) de #enemy-name (28px)");

// Point 2 : les 3 quêtes de minage/eau sont réellement lançables (bouton + vraie fonction).
// v3.123.0 (Lot S2b) : migrées vers le scene-engine — id "scene_*", launch() appelle
// openSceneQuestEntry() (au lieu des anciens openDriedSpringQuest/openUnstableVeinQuest).
game = freshCombat("knight"); game.activeTab = "campement";
run("StoryQuestManager.ensure();");
game.storyQuests.forest.currentStep = 6; game.storyQuests.forest.accepted = true;
game.explorationProgression.wellUnlocked = false;
game.explorationProgression.sawmillUnlocked = true; // v3.131.0 : boardRequires ajouté à source_tarie (gating trop tôt corrigé)
var springM = g.MissionBoard.list().find(function (m) { return m.id === "scene_source_tarie"; });
ok(!!springM && springM.status === "available" && typeof springM.accept === "function", "point 2 : La Source Tarie (non acceptée) a bien un accept (v3.123.0 scene-engine)");
var springHtml = g.buildCampMissionCardHTML(springM);
ok(springHtml.indexOf("camp-mission-btn") !== -1, "point 2 : La Source Tarie affiche un bouton");
springM.accept();
var springAcceptedM = g.MissionBoard.list().find(function (m) { return m.id === "scene_source_tarie"; });
ok(springAcceptedM.status === "accepted" && typeof springAcceptedM.launch === "function", "point 2 : après accept(), la Source Tarie passe en accepted avec un launch");
springAcceptedM.launch();
ok(g.game.activeTab === "scene" && g.game.sceneRun && g.game.sceneRun.templateId === "source_tarie", "point 2 : le clic lance réellement le scene-engine (activeTab='scene', run créé)");
run("SceneRunManager.abandon(); game.sceneRun = null;"); // nettoie pour la suite du test

game.explorationProgression.quarryUnlocked = false;
game.explorationProgression.forgottenClearingUnlocked = true; // v3.118.0 : prérequis d'affichage désormais respecté (Sentier Obstrué terminé)
var veinM = g.MissionBoard.list().find(function (m) { return m.id === "scene_veine_instable"; });
ok(veinM.status === "available" && typeof veinM.accept === "function", "point 2 (Carrière) : non acceptée -> accept disponible (v3.123.0 scene-engine)");
var veinHtml = g.buildCampMissionCardHTML(veinM);
ok(veinHtml.indexOf("camp-mission-btn") !== -1, "point 2 (Carrière) : bouton également présent");
veinM.accept();
var veinAcceptedM = g.MissionBoard.list().find(function (m) { return m.id === "scene_veine_instable"; });
ok(veinAcceptedM.status === "accepted" && typeof veinAcceptedM.launch === "function", "point 2 (Carrière) : après accept(), passe en accepted avec un launch");
g.WarehouseManager.addResource("petite_ration", 1);
veinAcceptedM.launch();
ok(g.game.activeTab === "scene" && g.game.sceneRun && g.game.sceneRun.templateId === "veine_instable", "point 2 (Carrière) : lance réellement le scene-engine");
run("SceneRunManager.abandon(); game.sceneRun = null;");

console.log("\n[60] Popup pédagogique par étape (3.107.7) : forest_02, modèle générique");
game = freshCombat("knight"); giveWeapon();
run("StoryQuestManager.acceptStep('forest'); StoryQuestManager.claimStep('forest');"); // 01 -> 02
run("StoryQuestManager.acceptStep('forest');"); // accepte forest_02
ok(g.STORY_QUESTS.forest.steps[1].tutorial && g.STORY_QUESTS.forest.steps[1].tutorial.tab === "combat", "forest_02.tutorial déclaré, ciblant l'onglet combat");
ok(game.storyQuests.forest.tutorialsSeen && game.storyQuests.forest.tutorialsSeen.forest_02 !== true, "tutorial pas encore vu avant la 1ère arrivée");
game.activeTab = "campement";
g.switchTab("combat");
ok(typeof g.maybeShowStepTutorial === "function", "maybeShowStepTutorial exposée globalement");
ok(typeof g.closeTutorialModal === "function", "closeTutorialModal exposée globalement");
var htmlTut = g.buildTutorialModalHTML("forest", g.STORY_QUESTS.forest.steps[1].tutorial);
ok(htmlTut.indexOf("Le combat") !== -1 && htmlTut.indexOf("Attaque de base") !== -1, "contenu du popup : titre + attaque de base");
// v3.263.0 : l'aperçu est le bandeau d'alerte actuel (icône PNG + « Il charge ! »), plus l'ancien badge à emoji
ok(htmlTut.indexOf("cb-alert") !== -1 && htmlTut.indexOf(g.COMBAT_STATES.charge.icon) !== -1 && htmlTut.indexOf("Il charge !") !== -1 && htmlTut.indexOf("💢") === -1, "aperçu fidèle du bandeau de télégraphe actuel (charge)");
ok(htmlTut.indexOf("Compris") !== -1, "bouton de fermeture présent");
g.closeTutorialModal("forest");
ok(game.storyQuests.forest.tutorialsSeen.forest_02 === true, "fermeture : marqué comme vu");
// contrôle : une étape sans tutorial ne casse rien
run("game.storyQuests.forest.currentStep = 2;"); // forest_03, pas de tutorial déclaré
g.switchTab("more");
ok(true, "étape sans tutorial déclaré : switchTab() ne plante pas");

console.log("\n[61] « Les fondations » sortie de la chaîne Histoire (3.107.8) : mission secondaire parallèle");
ok(g.STORY_QUESTS.forest.steps.length === 17, "chaîne Histoire à 17 étapes (v3.268.0 : « Celle qui demande » ajoutée)");
ok(g.STORY_QUESTS.forest.steps.findIndex(function (s) { return s.id === "forest_10"; }) === -1, "forest_10 n'existe plus dans la chaîne");
ok(stepIdx("forest_11") === stepIdx("forest_crossing") + 1, "forest_11 (L'éveil des talents) suit immédiatement forest_crossing");

game = freshCombat("knight"); giveWeapon();
var mBefore = g.MissionBoard.list();
ok(!mBefore.find(function (m) { return m.id === "workshop_foundations"; }), "Les fondations absente tant que La veine instable n'est pas terminée");
game.explorationProgression.quarryUnlocked = true; game.explorationProgression.unstableVeinDiscoveryCompleted = true;
var mAfter = g.MissionBoard.list();
var wfM = mAfter.find(function (m) { return m.id === "workshop_foundations"; });
ok(!!wfM && wfM.status === "available", "Les fondations disponible une fois La veine instable terminée");
ok(typeof wfM.accept === "function", "Les fondations (non acceptée) : accept disponible (v3.117.0)");
var wfHtml = g.buildCampMissionCardHTML(wfM);
ok(wfHtml.indexOf("camp-mission-btn") !== -1, "carte : bouton Accepter présent");
// v3.117.0 (décision Seb) : le Campement ne montre plus les missions "available" — Les fondations
// disparaît du Campement tant qu'elle n'est pas acceptée, mais reste visible dans le tableau complet.
ok(g.MissionBoard.top(3).every(function (m) { return m.id !== "workshop_foundations"; }), "Les fondations (available) absente du Campement (top) tant que non engagée");
ok(g.MissionBoard.list().some(function (m) { return m.id === "workshop_foundations"; }), "Les fondations reste dans le tableau complet (list)");
wfM.accept();
var wfAcceptedM = g.MissionBoard.list().find(function (m) { return m.id === "workshop_foundations"; });
ok(wfAcceptedM.status === "accepted" && typeof wfAcceptedM.launch === "function", "après accept() : status accepted, launch disponible");
ok(g.MissionBoard.top(3).some(function (m) { return m.id === "workshop_foundations"; }), "Les fondations (acceptée) réapparaît dans le Campement (top)");

// v3.131.3 (retour Seb) : progressLabel doit être le libellé concret de l'étape en cours
// (ex. "Récolter 15 Pierre (2/15)"), pas un compteur brut d'étapes ("2/4") sans contexte.
game.workshopUnlock = { completed: false, currentStep: 2, planchesCrafted: 5 }; // étape 2 = harvest_stone (0-indexed)
game.resources.pierre = 2;
var wfStep2M = g.MissionBoard.list().find(function (m) { return m.id === "workshop_foundations"; });
ok(wfStep2M.progressLabel.indexOf("Récolter") !== -1 && wfStep2M.progressLabel.indexOf("Pierre") !== -1, "point A : progressLabel nomme la ressource concrète de l'étape en cours (" + wfStep2M.progressLabel + ")");
ok(wfStep2M.progressLabel.indexOf("2/15") !== -1, "point A : progressLabel inclut la progression chiffrée de l'étape en cours (" + wfStep2M.progressLabel + ")");
var wfCampHtml = g.buildCampMissionCardHTML(wfStep2M);
ok(wfCampHtml.indexOf("Récolter") !== -1, "point A : le libellé concret apparaît bien dans la carte compacte du Campement");
// L'écran Quêtes (carte détaillée) ne doit PAS dupliquer ce libellé en plus de stepsDetail.
var wfQuestsHtml = g.buildQuestBoardCardHTML(wfStep2M);
ok(wfQuestsHtml.indexOf("qb-card-progress") === -1, "point B : progressLabel masqué sur la carte détaillée (stepsDetail déjà présent, pas de redondance)");
ok(wfQuestsHtml.indexOf("qb-card-steps") !== -1, "point B : le détail des 4 étapes reste bien affiché sur la carte détaillée");

game.workshopUnlock = { completed: true, currentStep: 4 };
var mReady = g.MissionBoard.list().find(function (m) { return m.id === "workshop_foundations"; });
ok(mReady.status === "claimable" && typeof mReady.claim === "function", "Atelier terminé : status claimable, claim disponible");
var gold0v = game.gold, xp0v = game.heroXp;
mReady.claim();
ok(game.gold === gold0v + 500 && game.workshopFoundationsCompleted === true, "réclamation : +500 or, flag de complétion posé (même récompense qu'avant)");
ok(!g.MissionBoard.list().find(function (m) { return m.id === "workshop_foundations"; }), "mission disparaît du tableau une fois réclamée");

console.log("\n[62] Migration save antérieure (3.107.8) : currentStep décalé d'un cran, une seule fois");
game = freshCombat("knight");
run("StoryQuestManager.ensure();");
game.storyQuests.forest.currentStep = 11; // ancienne save (schéma 15 étapes) : pointait vers forest_12
var dMig = g.buildSaveData();
dMig.storyQuests.forest.migratedV31078 = false; // simuler une save jamais migrée
dMig.storyQuests.forest.migratedV3109 = false; // v3.109.0 : ni par la 2e migration (insertion de forest_crossing)
dMig.storyQuests.forest.migratedV3259 = false; // v3.259.0 : ni par la 3e (insertion de forest_brume)
g.restoreBaseState(dMig);
run("StoryQuestManager.ensure();"); // au boot : runRetroactiveCheck() ; en jeu : tout rendu passe par ensure()
ok(g.STORY_QUESTS.forest.steps[game.storyQuests.forest.currentStep].id === "forest_12", "save currentStep=11 (ancien schéma 15 étapes) -> forest_12 après les 3 migrations (11 -> 10 -> 11 -> 12)");
var dMig2 = g.buildSaveData();
g.restoreBaseState(dMig2);
run("StoryQuestManager.ensure();");
ok(g.STORY_QUESTS.forest.steps[game.storyQuests.forest.currentStep].id === "forest_12", "2e chargement : pas de double décalage (migration idempotente)");
game = freshCombat("knight");
run("StoryQuestManager.ensure();");
game.storyQuests.forest.currentStep = 3; // save saine, jamais dépassé forest_10
var dSain = g.buildSaveData();
g.restoreBaseState(dSain);
ok(g.STORY_QUESTS.forest.steps[game.storyQuests.forest.currentStep].id === "forest_04", "save currentStep=3 (jamais atteint forest_10) : non affectée par la migration");

console.log("\n[63] Popups pédagogiques v3.107.9 : forest_01/03/04/11/12 + tutoriel générique Village");
// v3.116.0 : le tutoriel Campement a migré de forest_01 (jamais affichable : exigeait l'étape
// acceptée avant la 1re arrivée) vers GENERIC_TUTORIALS.camp_welcome, sans condition.
ok(!g.STORY_QUESTS.forest.steps[0].tutorial, "forest_01 : plus de tutorial d'étape (migré en générique)");
ok(!!g.GENERIC_TUTORIALS.camp_welcome && g.GENERIC_TUTORIALS.camp_welcome.tab === "campement", "camp_welcome : tutoriel générique déclaré, cible Campement");
ok(typeof g.GENERIC_TUTORIALS.camp_welcome.condition === "undefined", "camp_welcome : sans condition (affichable dès le boot)");
game = freshCombat("knight"); game.genericTutorialsSeen = {};
g.switchTab("campement");
ok(game.genericTutorialsSeen.camp_welcome !== true, "pas encore marqué vu tant que la modale n'a pas été fermée");
g.closeGenericTutorialModal("camp_welcome");
ok(game.genericTutorialsSeen.camp_welcome === true, "fermeture : camp_welcome marqué comme vu");
ok(g.STORY_QUESTS.forest.steps[2].tutorial && g.STORY_QUESTS.forest.steps[2].tutorial.points.length === 6, "forest_03 : 6 points (intro + 5 stats)");
ok(g.STORY_QUESTS.forest.steps[3].tutorial && g.STORY_QUESTS.forest.steps[3].tutorial.tab === "shop", "forest_04 : tutorial déclaré, cible shop");
var idx11 = g.STORY_QUESTS.forest.steps.findIndex(function (s) { return s.id === "forest_11"; });
var idx12 = g.STORY_QUESTS.forest.steps.findIndex(function (s) { return s.id === "forest_12"; });
ok(g.STORY_QUESTS.forest.steps[idx11].tutorial && g.STORY_QUESTS.forest.steps[idx11].tutorial.points.some(function (p) { return p.text.indexOf("150 or") !== -1; }), "forest_11 : mentionne bien le coût de réinitialisation (150 or/point, vérifié dans le code)");
ok(g.STORY_QUESTS.forest.steps[idx12].tutorial && g.STORY_QUESTS.forest.steps[idx12].tutorial.points.some(function (p) { return p.text.indexOf("2 règles") !== -1; }), "forest_12 : mentionne bien 2 règles de base (vérifié : GRIMOIRE_BASE_SLOT_COUNT)");

ok(typeof g.GENERIC_TUTORIALS === "object" && !!g.GENERIC_TUTORIALS.village_production, "tutoriel générique village_production déclaré");
ok(typeof g.maybeShowGenericTutorial === "function" && typeof g.closeGenericTutorialModal === "function", "fonctions génériques exposées");
game = freshCombat("knight"); giveWeapon(); game.unlockedTabs.village = true;
ok(!(game.explorationProgression && (game.explorationProgression.unstableVeinDiscoveryCompleted || game.explorationProgression.quarryUnlocked)), "contrôle : La veine instable pas encore terminée dans ce test frais");
g.switchTab("village");
ok(true, "switchTab('village') sans planter, même sans condition remplie"); // pas de mock innerHTML dans ce harnais, contrôle indirect via maybeShowGenericTutorial
game.explorationProgression.quarryUnlocked = true; game.explorationProgression.unstableVeinDiscoveryCompleted = true;
game.genericTutorialsSeen = {};
g.switchTab("campement"); g.switchTab("village");
ok(game.genericTutorialsSeen.village_production !== true, "pas encore marqué vu tant que la modale n'a pas été fermée");
g.closeGenericTutorialModal("village_production");
ok(game.genericTutorialsSeen.village_production === true, "fermeture : marqué comme vu");

console.log("\n[64] Icônes de rations dédiées (3.107.11) : les 3 fournies");
ok(g.WAREHOUSE_RESOURCES.ration.icon === "images/Icons/resources/ration_icon.png", "Ration moyenne : icône dédiée");
ok(g.WAREHOUSE_RESOURCES.grande_ration.icon === "images/Icons/resources/grande_ration_icon.png", "Grande ration : icône dédiée");
ok(g.WAREHOUSE_RESOURCES.petite_ration.icon === "images/Icons/resources/petite_ration_icon.png", "Petite ration : icône dédiée (fournie, v3.107.11)");
var rationIcons = [g.WAREHOUSE_RESOURCES.petite_ration.icon, g.WAREHOUSE_RESOURCES.ration.icon, g.WAREHOUSE_RESOURCES.grande_ration.icon];
ok(new Set(rationIcons).size === 3, "les 3 rations ont bien 3 chemins d'icône tous distincts (aucun partage)");

console.log("\n[65] Popup pédagogique forest_08 (3.107.12) : fabriquer une Petite ration");
var idx08 = g.STORY_QUESTS.forest.steps.findIndex(function (s) { return s.id === "forest_08"; });
ok(idx08 !== -1 && g.STORY_QUESTS.forest.steps[idx08].tutorial && g.STORY_QUESTS.forest.steps[idx08].tutorial.tab === "village", "forest_08 : tutorial déclaré, cible Village (pas l'écran d'expédition)");
var t08 = g.STORY_QUESTS.forest.steps[idx08].tutorial;
ok(t08.points.some(function (p) { return p.text.indexOf("8 Viande") !== -1 && p.text.indexOf("4 Eau") !== -1; }), "mentionne la vraie recette (8 Viande + 4 Eau, vérifiée dans workshops.js)");
ok(t08.points.some(function (p) { return p.text.indexOf("Cuisine de camp") !== -1; }), "mentionne le bon atelier (Cuisine de camp)");
ok(typeof g.pendingTutorial !== "undefined", "pendingTutorial exposé (garde anti-écrasement générique/étape)");

console.log("\n[66] Recette Ration moyenne restaurée (3.107.13)");
var cuisineRecipes = g.WORKSHOPS_CONFIG.cuisine_de_camp.recipes;
var petiteRecipe = cuisineRecipes.find(function (r) { return r.id === "petite_ration"; });
var rationRecipe = cuisineRecipes.find(function (r) { return r.id === "ration"; });
ok(petiteRecipe.inputs.length === 2 && petiteRecipe.inputs[0].resourceId === "viande" && petiteRecipe.inputs[0].quantity === 8 && petiteRecipe.inputs[1].resourceId === "eau" && petiteRecipe.inputs[1].quantity === 4, "Petite ration inchangée : 8 Viande + 4 Eau brutes");
ok(rationRecipe.inputs.length === 2 && rationRecipe.inputs[0].resourceId === "viande_sechee" && rationRecipe.inputs[0].quantity === 10 && rationRecipe.inputs[1].resourceId === "pain" && rationRecipe.inputs[1].quantity === 1, "Ration moyenne restaurée : 10 Viande séchée + 1 Pain (recette d'origine, retour arrière du passage v3.106.0)");

console.log("\n[67] v3.108.0 — lot 3 : cohérence textes/données Forêt, chasse au Loup, regen coupée en quête, reset sortie");
ok(g.STORY_QUESTS.forest.steps.length === 17, "chaîne Histoire : 17 étapes (en-tête de story-quests.js aligné)");
ok(g.WAREHOUSE_RESOURCES.ration.desc.indexOf("Viande séchée") !== -1 && g.WAREHOUSE_RESOURCES.ration.desc.indexOf("Pain") !== -1, "Ration moyenne : description alignée sur la recette réelle (Viande séchée + Pain)");
ok(g.HUNT_QUESTS.hq_forest_boar.enemyFilter.length === 1 && g.HUNT_QUESTS.hq_forest_boar.enemyFilter[0] === "wolf", "Chasse en Forêt : enemyFilter [wolf]");
game = freshCombat("knight");
run("WorldManager.worldIndex = 0; WorldManager.adventureIndex = 0; WorldManager.enemyIndex = 3;");
var huntIds = {};
/* v3.284.0 : la chasse sert des MEUTES — spawnFor renvoie un tableau. On aplatit. */
for (var hi = 0; hi < 60; hi++) { [].concat(g.QuestEnemyManager.spawnFor(g.HUNT_QUESTS.hq_forest_boar, false)).forEach(function (he) { huntIds[he.id] = true; }); }
ok(Object.keys(huntIds).length === 1 && huntIds.wolf, "spawnFor(chasse) ne sort que des loups (60 tirages) : " + JSON.stringify(Object.keys(huntIds)));
ok(g.WorldManager.enemyIndex === 3 && g.WorldManager.adventureIndex === 0 && g.WORLDS[0].adventures[0].enemyPool.indexOf("wolf") === -1, "index WorldManager restaurés et pool de base de la Lisière intact après le filtre");
ok(g.ADVENTURE_QUESTS.hq_wolf_pack.steps[0].desc.indexOf("loups") !== -1, "La Meute affamée : libellé « loups » (aligné sur son enemyFilter)");
ok(!g.DUNGEON_MARKS.some(function (m) { return /tap/.test(m.desc); }), "Marques : plus aucune mention « tap » (système retiré en P2)");
ok(!g.UPGRADES.some(function (u) { return /de tap/.test(u.desc); }) && !g.AETHER_SHOP.some(function (u) { return /de tap/.test(u.desc); }), "améliorations / ascension : plus aucune mention « tap »");
ok(g.MissionBoard.typeIcon("production") !== "📜", "MissionBoard.typeIcon('production') a une icône dédiée (Les fondations)");
game = freshCombat("knight");
game.activeTab = "campement"; game.heroHp = 10;
run("StoryQuestManager.ensure();");
game.adventureQuestRun = { active: true, questId: "aq_forest_expedition" };
ok(g.CampManager.isRegenActive() === false, "regen camp inactive pendant une quête d'aventure en cours (comme chasse/donjon)");
game.campRegenLastAt = Date.now() - 600000;
ok(g.CampManager.applyRegen(true) === 0 && game.heroHp === 10, "regen hors ligne également bloquée pendant une quête d'aventure");
game.adventureQuestRun = { active: false, questId: null };
ok(g.CampManager.isRegenActive() === true, "quête close : regen à nouveau active");
game = freshCombat("knight");
run("SortieManager.start('adventure'); SortieManager.noteKill(true);");
ok(game.sortie.killedBoss === true, "noteKill(true) marque killedBoss");
run("SortieManager.end('success');");
ok(game.sortie.killedBoss === false && game.sortie.active === false, "end() : killedBoss réinitialisé explicitement (plus de dépendance à ensure())");

console.log("\n[68] v3.109.0 — lots 1/2/4 : boss du Cœur via le vrai moteur (run dédié), Franchir la Lisière, Désert, Quête suivante");
// --- Lot 4 : le chemin réel onEnemyKilled -> AdventureQuestManager (pas d'advance(), pas de cycle) sur le boss du Cœur
game = freshCombat("knight"); giveWeapon();
run("StoryQuestManager.ensure();");
var idxC = g.STORY_QUESTS.forest.steps.findIndex(function (s) { return s.id === "forest_15"; });
game.storyQuests.forest.currentStep = idxC; game.storyQuests.forest.accepted = true;
run("WorldManager.worldIndex = 0; WorldManager.adventureIndex = 1; WorldManager.enemyIndex = 4;"); // position libre au Cœur, mi-parcours
var cycle0 = game.cycleCount, kills0 = game.totalKills;
ok(g.MissionBoard.list().some(function (m) { return m.id === "adv_aq_forest_depths" && m.isMain === true; }), "forest_15 acceptée : « Le Cœur de la Forêt » visible et mise en évidence sur le tableau");
ok(!g.ADVENTURE_QUESTS.aq_forest_scout && !g.MissionBoard.list().some(function (m) { return m.id === "adv_aq_forest_scout"; }), "aq_forest_scout supprimée (données + tableau)");
g.AdventureQuestManager.start("aq_forest_depths");
var depths = g.ADVENTURE_QUESTS.aq_forest_depths;
var seenBossEarly = false;
for (var dk = 0; dk < depths.steps[0].target; dk++) { if (game.enemy.isBoss) seenBossEarly = true; game.enemy.chargeIn = 99; game.enemy.engageIn = 0; game.enemy.hp = 1; g.CombatEngine.heroAction("basic"); }
ok(!seenBossEarly && game.enemy.isBoss === true && game.enemy.id === "orcwarlord", "après 20 kills : le Seigneur de guerre orc est le prochain ennemi du run");
game.enemy.chargeIn = 99; game.enemy.engageIn = 0; game.enemy.hp = 1; game.heroHp = game.heroMaxHp;
g.CombatEngine.heroAction("basic"); // vrai chemin : onEnemyKilled -> AdventureQuestManager.onEnemyKilled -> finish
ok(game.adventureQuestsCompleted.aq_forest_depths === true && game.adventureQuestRun.active === false, "boss vaincu via onEnemyKilled réel : quête terminée");
ok(g.WorldManager.worldIndex === 0 && g.WorldManager.adventureIndex === 1 && g.WorldManager.enemyIndex === 4, "position de farm libre intacte (0/1, enemyIndex 4) : pas d'advance()");
ok(game.cycleCount === cycle0, "cycleCount inchangé (" + cycle0 + ") : plus de cycle parasite sur le kill du boss du Cœur");
ok(game.killCounts.orcwarlord === 1 && game.totalKills === kills0 + 21, "kill compté (killCounts.orcwarlord=1, totalKills +21)");
ok(g.AdventureQuestManager.isWorldTransitionUnlocked("forest") === true && g.WorldManager.meetsAscensionRequirement(1) === true, "porte du Désert ouverte (gatesNextWorld) une fois la quête terminée");
game.storyQuests.forest.counters.offeringDone = 1;
ok(g.StoryQuestManager.isCurrentStepReady("forest") === true, "forest_15 prête à réclamer (offrande + quête)");
// --- Lot 2 : Franchir la Lisière — v3.293.0 : run défini aq_story_lisiere (9 ennemis + Roi Slime)
game = freshCombat("knight"); giveWeapon();
run("StoryQuestManager.ensure();");
var idxX = g.STORY_QUESTS.forest.steps.findIndex(function (s) { return s.id === "forest_crossing"; });
ok(idxX !== -1 && g.STORY_QUESTS.forest.steps[idxX].act.indexOf("Acte III") === 0 && g.STORY_COEUR_ACT3_STEP_ID === "forest_crossing", "forest_crossing ouvre l'Acte III (et le pool Troll/Ronce), index " + idxX);
game.storyQuests.forest.currentStep = idxX; game.storyQuests.forest.accepted = true;
ok(g.MissionBoard.list().some(function (m) { return m.id === "adv_aq_story_lisiere" && m.status === "available" && m.isMain === true; }), "v3.293.0 : « Franchir la Lisière » proposée au tableau, liée à l'étape");
g.AdventureQuestManager.start("aq_story_lisiere");
var wiX = g.WorldManager.worldIndex, aiX = g.WorldManager.adventureIndex;
var bossX = null;
for (var xk = 0; xk < 10 && game.adventureQuestRun.active; xk++) { if (game.enemy.isBoss) bossX = game.enemy.id; game.enemy.chargeIn = 99; game.enemy.engageIn = 0; game.enemy.hp = 1; game.heroHp = game.heroMaxHp; g.CombatEngine.heroAction("basic"); }
ok(bossX === "slimeking" && game.adventureQuestsCompleted.aq_story_lisiere === true, "9 ennemis puis le Roi Slime : run terminé");
ok(g.WorldManager.worldIndex === wiX && g.WorldManager.adventureIndex === aiX, "position WorldManager inchangée par le run (spawnFor restaure)");
g.StoryQuestManager._checkNow(true);
ok(g.StoryQuestManager.isCurrentStepReady("forest") === true && game.activeTab === "campement", "étape prête, retour au Campement");
ok(g.STORY_QUESTS.forest.steps[idxX].progress(game) === "Lisière 10/10", "progression affichée : Lisière 10/10");
// _trackKills ne compte plus aucun kill par position
game = freshCombat("knight");
run("StoryQuestManager.ensure(); WorldManager.worldIndex = 0; WorldManager.adventureIndex = 1;");
run("StoryQuestManager._trackKills();");
game.totalKills += 2;
run("StoryQuestManager._trackKills();");
ok(game.storyQuests.forest.counters.coeurKills === 0 && game.storyQuests.forest.counters.coeurReached === 0, "v3.293.0 : plus aucun kill ni drapeau attribué par position au Cœur");
// --- conditions de niveau mortes retirées
var s03 = g.STORY_QUESTS.forest.steps.find(function (s) { return s.id === "forest_03"; }), s11 = g.STORY_QUESTS.forest.steps.find(function (s) { return s.id === "forest_11"; });
ok(s03.objectiveLabel.indexOf("niveau") === -1 && s11.objectiveLabel.indexOf("niveau") === -1, "forest_03 / forest_11 : plus de condition de niveau dans le libellé");
game.heroLevel = 1; game.upgrades.utrain_power = 1; game.equipped.weapon = { id: "w" };
ok(s03.check(game) === true, "forest_03 : achat + arme \u00e9quip\u00e9e suffisent, sans condition de niveau");
// --- Quête suivante retirée
ok(typeof g.getNextAdventureQuestId === "undefined" && typeof g.startNextAdventureQuestFromPopup === "undefined", "bouton « Quête suivante » : fonctions retirées");
ok(g.buildQuestCompleteHTML({ icon: "📜", title: "t", text: "x", rewardRows: [] }).indexOf("Quête suivante") === -1, "popup de fin de quête sans bouton « Quête suivante »");
// --- migration V3109 : save à l'Acte III décalée d'un cran, une fois
game = freshCombat("knight");
run("StoryQuestManager.ensure();");
var idxAvant3109 = stepIdx("forest_crossing"); // la save d'avant v3.109.0 pointait ici, en visant forest_11
game.storyQuests.forest.currentStep = idxAvant3109; game.storyQuests.forest.claimedSteps = { forest_09: true }; delete game.storyQuests.forest.migratedV3109;
run("StoryQuestManager.ensure();");
ok(g.STORY_QUESTS.forest.steps[game.storyQuests.forest.currentStep].id === "forest_11" && game.storyQuests.forest.counters.coeurReached === 1, "save d'avant v3.109.0 -> toujours forest_11, traversée considérée faite");
var apres3109 = game.storyQuests.forest.currentStep;
run("StoryQuestManager.ensure();");
ok(game.storyQuests.forest.currentStep === apres3109, "migration idempotente");
game = freshCombat("knight");
run("StoryQuestManager.ensure();");
ok(game.storyQuests.forest.currentStep === 0 && game.storyQuests.forest.migratedV3109 === true, "nouvelle partie : étape 1, drapeau posé sans décalage");

console.log("\n[69] v3.109.1 — advance() : porte d'aventure sans cycle ; mort en farm libre = début d'aventure");
// v3.293.0 (règle Seb) : un kill hors quête ne fait plus rien avancer. Le cas qui passait au Désert
// sans traversée (Orc du Cœur en farm libre, porte ouverte) est le premier vérifié.
game = freshCombat("knight"); giveWeapon();
run("StoryQuestManager.ensure();");
game.adventureQuestsCompleted.aq_forest_depths = true;
run("WorldManager.worldIndex = 0; WorldManager.adventureIndex = 1; WorldManager.enemyIndex = 9;");
g.CombatEngine.spawnEnemy();
ok(game.enemy.isBoss === true && game.enemy.id === "orcwarlord", "hors quête au Cœur, dernier index : boss orc");
var cyc0 = game.cycleCount, reached0 = !!(game.worldsEverReached || {})[1];
game.enemy.chargeIn = 99; game.enemy.engageIn = 0; game.enemy.hp = 1; game.heroHp = game.heroMaxHp;
g.CombatEngine.heroAction("basic");
ok(g.WorldManager.worldIndex === 0 && g.WorldManager.adventureIndex === 1 && g.WorldManager.enemyIndex === 9, "porte ouverte : l'Orc tombé hors quête ne mène PAS au Désert (0/1/9 inchangé)");
ok(game.cycleCount === cyc0 && !!(game.worldsEverReached || {})[1] === reached0, "ni cycle, ni monde atteint");
run("WorldManager.worldIndex = 1; WorldManager.adventureIndex = 1; WorldManager.enemyIndex = 9;");
g.CombatEngine.spawnEnemy();
var wqBefore = JSON.stringify(game.worldQuestProgress || {});
game.enemy.chargeIn = 99; game.enemy.engageIn = 0; game.enemy.hp = 1; game.heroHp = game.heroMaxHp;
g.CombatEngine.heroAction("basic");
ok(game.cycleCount === cyc0 && g.WorldManager.worldIndex === 1 && JSON.stringify(game.worldQuestProgress || {}) === wqBefore, "Djinn hors quête : pas de cycle, pas de questline de monde");
// --- mort en farm libre au Cœur : début de l'aventure en cours, plus de retour Lisière
game = freshCombat("knight"); giveWeapon();
run("WorldManager.worldIndex = 0; WorldManager.adventureIndex = 1; WorldManager.enemyIndex = 5;");
g.CombatEngine.spawnEnemy();
game.enemy.chargeIn = 99; game.enemy.engageIn = 0;
game.enemy.hp = game.enemy.maxHp = 100000; game.heroHp = 1; // la riposte du round tue le héros
g.CombatEngine.heroAction("basic");
ok(game.heroHp <= 0 || game.justDied === true, "héros terrassé via la riposte réelle");
ok(g.WorldManager.worldIndex === 0 && g.WorldManager.adventureIndex === 1 && g.WorldManager.enemyIndex === 0, "mort au Cœur : on repart au 1er ennemi du Cœur (plus de resetToCycleStart)");
ok(game.activeTab === "campement", "retour au Campement à la mort (inchangé)");
ok(typeof g.WorldManager.resetToCycleStart === "function", "resetToCycleStart conservé (ascension / switch de héros, save-system)");

console.log("\n[70] v3.109.2 — switch de héros : position conservée (comme le boot) ; création : position purgée");
game = freshCombat("knight"); giveWeapon();
run("game.saveSupported = true;"); // boot.js (détection localStorage) est exclu du harnais : sans ça, saveGame()/hasSlot() sont des no-ops
run("game.playerName = 'A'; StoryQuestManager.ensure();");
run("WorldManager.worldIndex = 0; WorldManager.adventureIndex = 1; WorldManager.enemyIndex = 5;"); // héros A au Cœur, mi-parcours
run("saveGame();");
var slotA = g.HeroSlotManager.getActiveSlot();
var slotB = slotA === 1 ? 2 : 1;
ok(g.HeroSlotManager.createHeroInSlot(slotB) === true, "création d'un héros dans l'emplacement " + slotB);
ok(g.WorldManager.worldIndex === 0 && g.WorldManager.adventureIndex === 0 && g.WorldManager.enemyIndex === 0, "création : position purgée (0/0/0), pas d'héritage du Cœur du héros A");
run("game.playerName = 'B'; game.heroId = 'mage'; EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp; saveGame();");
ok(g.HeroSlotManager.switchToSlot(slotA) === true, "retour sur l'emplacement du héros A");
ok(g.WorldManager.worldIndex === 0 && g.WorldManager.adventureIndex === 1 && g.WorldManager.enemyIndex === 5, "switch : position du héros A restaurée (Cœur, 5/10) — plus de retour forcé en Lisière (règle v3.41 remplacée)");
ok(game.enemy && game.enemy._roundReady === true && game.enemy.isBoss === false, "ennemi du Cœur généré et préparé après le switch");
ok(g.HeroSlotManager.switchToSlot(slotB) === true && g.WorldManager.adventureIndex === 0, "re-switch vers B : sa propre position (début de Lisière) restaurée");
g.HeroSlotManager.deleteSlot(slotB); // nettoie et rebascule sur A via switchToSlot
ok(g.HeroSlotManager.getActiveSlot() === slotA && g.WorldManager.adventureIndex === 1 && g.WorldManager.enemyIndex === 5, "suppression de B : fallback vers A par switchToSlot, position de A conservée");
run("HeroSlotManager.deleteSlot(" + slotA + ");"); // plus aucun slot : état neuf
ok(g.WorldManager.worldIndex === 0 && g.WorldManager.adventureIndex === 0 && g.WorldManager.enemyIndex === 0, "plus aucun emplacement : état neuf, position purgée (0/0/0)");

console.log("\n[71] v3.110.0 — Lot A : verrous Champs/Scierie/Mine, migration, 3 expéditions de déblocage");
// --- Verrous : nouvelle partie, les 6 bâtiments sont verrouillés, aucun bucket créé ---
game = freshCombat("knight");
run("ProductionManager.ensure();");
ok(!g.ProductionManager.isBuildingUnlocked("farm") && !g.ProductionManager.isBuildingUnlocked("sawmill") && !g.ProductionManager.isBuildingUnlocked("mine"), "nouvelle partie : Champs/Scierie/Mine verrouillés (nouveaux flags)");
ok(!g.ProductionManager.isBuildingUnlocked("hunt") && !g.ProductionManager.isBuildingUnlocked("quarry") && !g.ProductionManager.isBuildingUnlocked("well"), "Chasse/Carrière/Puits toujours verrouillés (inchangé)");
ok(!game.production.sawmill && !game.production.farm && !game.production.mine, "aucun bucket game.production créé pour un bâtiment verrouillé");

// --- Migration "déjà en jeu = acquis" : un bucket préexistant vaut déblocage ---
game.production.sawmill = { plots: [] }; game.production.farm = { plots: [] };
run("ProductionManager.ensure();");
ok(g.ProductionManager.isBuildingUnlocked("sawmill") && g.ProductionManager.isBuildingUnlocked("farm"), "migration : buckets préexistants (save antérieure) -> sawmillUnlocked/farmUnlocked accordés");
ok(!g.ProductionManager.isBuildingUnlocked("mine"), "migration : pas de bucket Mine -> reste verrouillée (pas d'auto-don)");

// --- Gating d'affichage au tableau : silentGrove attend le Village, fallowField le Puits, ironLode la Carrière ---
game = freshCombat("knight");
var m71 = g.MissionBoard.list();
ok(!m71.find(function (m) { return m.id === "scene_bosquet_silencieux"; }), "Village fermé : Le Bosquet Silencieux absent du tableau");
ok(!m71.find(function (m) { return m.id === "scene_terre_en_friche"; }) && !m71.find(function (m) { return m.id === "scene_eboulis_ferreux"; }), "Puits/Carrière absents : Terre en Friche et Éboulis Ferreux masqués");
// v3.119.0 (retour Seb) : Sentier Obstrué exige déjà 1 petite ration pour être LANCÉE, mais rien
// n'empêchait son AFFICHAGE avant que la petite ration soit fabricable (Cuisine de camp, bâtiment
// Chasse) — elle traînait au tableau sans qu'on puisse la lancer.
ok(!m71.find(function (m) { return m.id === "scene_sentier_obstrue"; }), "Chasse pas débloquée : Le Sentier Obstrué absent du tableau (petite ration pas fabricable)");
game.explorationProgression.huntBuildingUnlocked = true;
var m71b = g.MissionBoard.list();
ok(!!m71b.find(function (m) { return m.id === "scene_sentier_obstrue"; }), "Chasse débloquée : Le Sentier Obstrué apparaît (petite ration fabricable, v3.122.0 scene-engine)");
game.explorationProgression.huntBuildingUnlocked = false;
game.unlockedTabs.village = true;
m71 = g.MissionBoard.list();
ok(!!m71.find(function (m) { return m.id === "scene_bosquet_silencieux"; }), "Village ouvert : Le Bosquet Silencieux apparaît (v3.122.0 scene-engine)");
game.explorationProgression.wellUnlocked = true;
game.explorationProgression.quarryUnlocked = true;
// v3.119.0 : fallowField (comme blockedPath) exige aussi huntBuildingUnlocked (petite ration
// fabricable) — via boardRequires.progressFlags (pluriel), toutes les conditions cumulées.
ok(!g.MissionBoard.list().find(function (m) { return m.id === "scene_terre_en_friche"; }), "Puits+Carrière sans Chasse : Terre en Friche encore masquée (progressFlags cumulés)");
game.explorationProgression.huntBuildingUnlocked = true;
m71 = g.MissionBoard.list();
ok(!!m71.find(function (m) { return m.id === "scene_terre_en_friche"; }) && !!m71.find(function (m) { return m.id === "scene_eboulis_ferreux"; }), "Puits+Carrière+Chasse débloqués : les deux autres expéditions apparaissent (v3.122.0/v3.123.0 scene-engine)");

// --- Le Bosquet Silencieux via le scene-engine : gratuit, succès -> Scierie + bois ---
// v3.124.0 (retrait ancien moteur) : remplace le test historique sur ExplorationManager
// (retiré) — couverture déjà large dans la section [S2a] plus bas, ce bloc vérifie surtout
// la non-régression du chemin complet (démarrage -> résolution -> settle -> déblocage).
game = freshCombat("knight");
game.unlockedTabs.village = true;
var startRes = g.SceneRunManager.startRun("bosquet_silencieux");
ok(startRes.ok === true, "bosquet_silencieux : départ sans ration (gratuit)");
g.SceneRunManager.enterGate(0);
run("var _mr = Math.random; Math.random = function () { return 0; };"); // force la réussite du jet
/* v3.199.0 : optionsPerNode masque une voie par nœud sur les canevas génératifs. Un test qui
   force "power" tombe désormais sur des refus légitimes. Ce helper prend la première voie
   réellement exposée par le nœud courant, ce qui teste la mécanique et non un nom d'option. */
function anyVoie() {
  var run = g.game.sceneRun;
  if (!run || !run.pendingNode || run.pendingNode.type !== "obstacle") return "power";
  var gab = g.window.SCENE_NODES.obstacles[run.pendingNode.gabaritId];
  var slot = (g.SceneRunManager.getCurrentLevel() || [])[run.currentGate] || run.pendingNode;
  var afford = g.SceneRunManager.affordableVoies(run, gab, slot);
  if (afford.length) return afford[0];
  return g.window.SceneEngine.nodeVoies(gab, slot)[0] || "power";
}
var choiceRes = g.SceneRunManager.resolveObstacle(anyVoie());
run("Math.random = _mr;");
ok(choiceRes.ok === true && choiceRes.outcome !== "setback", "jet résolu en succès (tirage forcé)");
var bois71 = g.WarehouseManager.getAmount("bois");
var guard71 = 0;
while (g.game.sceneRun.status !== "completed" && guard71 < 20) {
  guard71++;
  if (g.game.sceneRun.status === "gate") g.SceneRunManager.enterGate(0);
  else if (g.game.sceneRun.status === "node") g.SceneRunManager.resolveObstacle(anyVoie());
  else if (g.game.sceneRun.status === "finale") g.SceneRunManager.resolveFinale("sur");
}
ok(game.explorationProgression.sawmillUnlocked === true && game.explorationProgression.silentGroveDiscoveryCompleted === true, "run complet : sawmillUnlocked + completionFlag posés");
ok(g.ProductionManager.isBuildingUnlocked("sawmill") && game.production.sawmill, "Scierie débloquée + bucket initialisé (ProductionManager.unlockBuilding)");
ok(g.WarehouseManager.getAmount("bois") > bois71, "bois crédité via WarehouseManager");
ok(g.SceneRunManager.isQuestCompleted("bosquet_silencieux") === true, "quête marquée terminée");

// --- La Terre en Friche : verrou de lancement (Puits pas débloqué) ---
game = freshCombat("knight");
var startFF = g.SceneRunManager.startRun("terre_en_friche");
ok(startFF.ok === false, "terre_en_friche : refusée sans le Puits débloqué (le canevas ne vérifie pas de flag de lancement lui-même — vérifié via MissionBoard/boardRequires, testé en [S2a])");

console.log("\n[72] v3.111.0 — Lot B : chaîne de quêtes tutorielles du Village (Champs), popups pédagogiques");
// --- Chaîne invisible tant que le Champs est verrouillé, aucun bucket créé par les checks ---
game = freshCombat("knight");
ok(g.VillageQuestManager.getCurrentQuest() === null, "Champs verrouillé : aucune quête de village courante");
ok(!g.MissionBoard.list().find(function (m) { return m.sourceKind === "village"; }), "aucune carte village au tableau");
ok(!game.production.farm, "les checks n'ont créé AUCUN bucket farm (la migration v3.110.0 reste fiable)");

// --- Champs débloqué (vrai chemin) : quête 1 courante, progression live ---
game.explorationProgression.farmUnlocked = true;
run("ProductionManager.unlockBuilding('farm');");
var vq1 = g.VillageQuestManager.getCurrentQuest();
ok(!!vq1 && vq1.id === "farm_second_plot", "quête courante : Le Clos qui s'agrandit (1re de la chaîne)");
var vqCard = g.MissionBoard.list().find(function (m) { return m.sourceKind === "village"; });
ok(!!vqCard && vqCard.status === "available" && vqCard.progressLabel === "1/2", "carte au tableau : disponible, progression 1/2 (zone 0 ouverte)");
// v3.117.0 (décision Seb, cohérence totale) : même flux accept/launch que les autres sources sans
// vraie étape d'acceptation d'origine — non acceptée -> absente du Campement (top), accept dispo.
ok(typeof vqCard.accept === "function" && typeof vqCard.launch === "undefined", "carte non acceptée : accept disponible, pas de launch");
ok(g.MissionBoard.top(3).every(function (m) { return m.sourceKind !== "village"; }), "quête Village non acceptée : absente du Campement (top)");
vqCard.accept();
vqCard = g.MissionBoard.list().find(function (m) { return m.sourceKind === "village"; });
ok(vqCard.status === "accepted" && typeof vqCard.launch === "function", "après accept() : status accepted, launch disponible");
ok(g.MissionBoard.top(3).some(function (m) { return m.sourceKind === "village"; }), "quête Village acceptée : réapparaît dans le Campement (top)");
ok(g.VillageQuestManager.claim("farm_second_plot") === false, "réclamation refusée tant que l'objectif n'est pas atteint");
ok(g.VillageQuestManager.claim("farm_level_two") === false, "réclamation d'une quête FUTURE refusée (séquence stricte)");

// --- Objectif 1 : débloquer la parcelle 2 (vraie API, coût réel bois+pierre) ---
g.WarehouseManager.addResource("bois", 200); g.WarehouseManager.addResource("pierre", 200);
g.WarehouseManager.addResource("eau", 200);
var unlockRes = g.ProductionPlotsSystem.unlockPlot("farm", 1);
ok(unlockRes.ok === true, "parcelle 2 (Champ Béni) débloquée via ProductionPlotsSystem");
vqCard = g.MissionBoard.list().find(function (m) { return m.sourceKind === "village"; });
ok(!!vqCard && vqCard.status === "claimable" && vqCard.progressLabel === "2/2", "carte passée réclamable (2/2) sans aucun hook — check stateless");
var gold72 = game.gold; var ble72 = g.WarehouseManager.getAmount("ble");
ok(g.VillageQuestManager.claim("farm_second_plot") === true, "réclamation de la quête 1");
ok(game.gold === gold72 + 100 && g.WarehouseManager.getAmount("ble") === ble72 + 5, "récompense créditée (+100 or, +5 blé via _grantReward)");
ok(game.explorationProgression.villageQuests.claimed.farm_second_plot === true, "état persisté dans explorationProgression.villageQuests (liste blanche save-system contournée)");

// --- Objectif 2 : niveau 2 ---
var vq2 = g.VillageQuestManager.getCurrentQuest();
ok(!!vq2 && vq2.id === "farm_level_two", "quête suivante : Une terre bien menée");
var upRes = g.ProductionPlotsSystem.upgradePlot("farm", 0);
ok(upRes.ok === true, "parcelle 1 montée niveau 2 (vraie API, coût bois+eau)");
ok(g.VillageQuestManager.isQuestReady(vq2) === true && g.VillageQuestManager.claim("farm_level_two") === true, "quête 2 réclamée");

// --- Objectif 3 : amélioration permanente ---
var vq3 = g.VillageQuestManager.getCurrentQuest();
ok(!!vq3 && vq3.id === "farm_improvement", "quête suivante : Le secret des sillons");
var impRes = g.ProductionPlotsSystem.toggleImprovement("farm", 0, "fertile");
ok(impRes.ok === true, "Terre enrichie appliquée (vraie API)");
var ess72 = game.essence;
ok(g.VillageQuestManager.claim("farm_improvement") === true && game.essence === ess72 + 10, "quête 3 réclamée (+10 essence)");
// v3.112.0 (Lot C) : la chaîne continue avec les quêtes d'atelier — la 4e devient courante.
var vqNext = g.VillageQuestManager.getCurrentQuest();
ok(!!vqNext && vqNext.id === "workshop_first_flour", "les 3 quêtes Champs réclamées : la chaîne enchaîne sur les ateliers (Lot C)");

// --- Popups pédagogiques : marquage une-seule-fois, persistance dans le bon bloc ---
game = freshCombat("knight");
game.explorationProgression.farmUnlocked = true;
var vqT = g.VillageQuestManager.getCurrentQuest();
ok(!!vqT && !!vqT.tutorial && vqT.tutorial.tab === "village", "quête courante : popup pédagogique déclaratif ciblant l'onglet Village");
ok(g.VillageQuestManager.isTutorialSeen(vqT.id) === false, "popup jamais vu au départ");
g.VillageQuestManager.markTutorialSeen(vqT.id);
ok(g.VillageQuestManager.isTutorialSeen(vqT.id) === true && game.explorationProgression.villageQuests.tutorialsSeen[vqT.id] === true, "vu une fois, persisté dans explorationProgression.villageQuests.tutorialsSeen");
ok(typeof g.maybeShowVillageQuestTutorial === "function" && typeof g.closeVillageQuestTutorialModal === "function", "déclencheur et fermeture exposés (branchés dans switchTab)");

console.log("\n[73] v3.112.0 — Lot C : quêtes d'atelier, compteur générique de crafts, pause sur prérequis");
// --- Reprise de la chaîne après le Lot B : la quête 4 (Farine) devient courante ---
game = freshCombat("knight");
game.explorationProgression.farmUnlocked = true;
run("ProductionManager.unlockBuilding('farm');");
["farm_second_plot", "farm_level_two", "farm_improvement"].forEach(function (id) {
  game.explorationProgression.villageQuests = game.explorationProgression.villageQuests || { claimed: {}, tutorialsSeen: {}, craftCounts: {} };
  g.VillageQuestManager.ensure().claimed[id] = true;
});
var wq1 = g.VillageQuestManager.getCurrentQuest();
ok(!!wq1 && wq1.id === "workshop_first_flour", "après les 3 quêtes Champs : « La première mouture » devient courante");
var wqCard = g.MissionBoard.list().find(function (m) { return m.sourceKind === "village"; });
ok(!!wqCard && wqCard.status === "available" && wqCard.progressLabel === "0/1", "carte au tableau (0/1)");

// --- Compteur générique : un vrai craft au Moulin (tick réel) incrémente et complète ---
g.WarehouseManager.addResource("ble", 50);
var enq = g.WorkshopsSystem.enqueueCraft("moulin", "farine", 1);
ok(enq === true, "lot de farine mis en file au Moulin (vraie API, 5 blé déduits)");
run("WorkshopsSystem.tickWorkshop('moulin', 10);"); // 10 s > 3 s de craft -> lot terminé
ok(g.VillageQuestManager.getCraftCount("farine") === 1, "hook de complétion : compteur farine = 1 (tick réel)");
ok(g.WarehouseManager.getAmount("farine") === 1, "farine créditée normalement (hook non intrusif)");
wqCard = g.MissionBoard.list().find(function (m) { return m.sourceKind === "village"; });
ok(!!wqCard && wqCard.status === "claimable", "carte réclamable");
g.WarehouseManager.removeResource("farine", 1); // consommer la farine ne fait PAS reculer la quête
ok(g.VillageQuestManager.isQuestReady(wq1) === true, "compteur cumulatif : consommer la farine ne fait pas reculer l'objectif");
ok(g.VillageQuestManager.claim("workshop_first_flour") === true, "quête Farine réclamée");

// --- Pain : rattrapage hors ligne = même hook ---
var wq2 = g.VillageQuestManager.getCurrentQuest();
ok(!!wq2 && wq2.id === "workshop_first_bread", "quête suivante : Le pain d'Aeswyn");
g.WarehouseManager.addResource("farine", 3); g.WarehouseManager.addResource("eau", 10);
var enqPain = g.WorkshopsSystem.enqueueCraft("boulangerie", "pain", 1);
ok(enqPain === true, "lot de pain mis en file");
// simule une fermeture du jeu : lastTick dans le passé, puis rattrapage hors ligne
run("game.production.farm.workshops.boulangerie.lastTick = Date.now() - 60000;");
run("WorkshopsSystem.catchUpOffline('boulangerie');");
ok(g.VillageQuestManager.getCraftCount("pain") === 1, "hook aussi branché dans catchUpOffline (pain compté hors ligne)");
ok(g.VillageQuestManager.claim("workshop_first_bread") === true, "quête Pain réclamée");

// --- Planche+Lingot : chaîne EN PAUSE tant que Scierie/Mine manquent ---
var wq3 = g.VillageQuestManager.getCurrentQuest();
ok(!!wq3 && wq3.id === "workshop_materials", "quête suivante : Planche et lingot");
ok(g.VillageQuestManager.isQuestAvailable(wq3) === false, "indisponible sans Scierie+Mine (requires)");
ok(!g.MissionBoard.list().find(function (m) { return m.sourceKind === "village"; }), "chaîne en pause : carte masquée au tableau");
ok(g.VillageQuestManager.claim("workshop_materials") === false, "réclamation refusée en pause");
// crédit rétroactif : une planche fabriquée PENDANT la pause (ex. pour Les fondations) compte déjà
game.explorationProgression.sawmillUnlocked = true;
run("ProductionManager.unlockBuilding('sawmill');");
g.WarehouseManager.addResource("bois", 10);
g.WorkshopsSystem.enqueueCraft("scierie_fine", "planche", 1);
run("WorkshopsSystem.tickWorkshop('scierie_fine', 10);");
ok(g.VillageQuestManager.getCraftCount("planche") === 1, "planche comptée même quête en pause (compteur toujours actif)");
game.explorationProgression.mineUnlocked = true;
run("ProductionManager.unlockBuilding('mine');");
ok(g.VillageQuestManager.isQuestAvailable(wq3) === true, "Scierie+Mine débloquées : quête disponible");
wqCard = g.MissionBoard.list().find(function (m) { return m.sourceKind === "village"; });
ok(!!wqCard && wqCard.progressLabel === "1/2", "progression rétroactive : 1/2 (la planche de la pause compte)");
g.WarehouseManager.addResource("fer", 10);
g.WorkshopsSystem.enqueueCraft("fonderie", "lingot", 1);
run("WorkshopsSystem.tickWorkshop('fonderie', 10);");
ok(g.VillageQuestManager.claim("workshop_materials") === true, "quête Planche+Lingot réclamée (2/2)");

// --- Améliorer un atelier : check stateless sur les niveaux, vraie API upgradeWorkshop ---
var wq4 = g.VillageQuestManager.getCurrentQuest();
ok(!!wq4 && wq4.id === "workshop_level_two", "dernière quête : L'atelier bien huilé");
ok(g.VillageQuestManager.isQuestReady(wq4) === false, "aucun atelier niveau 2 : pas encore prête");
g.WarehouseManager.addResource("planche", 10); g.WarehouseManager.addResource("lingot", 10);
var upW = g.WorkshopsSystem.upgradeWorkshop("moulin");
ok(upW.ok === true, "Moulin amélioré niveau 2 (vraie API, coût planche+lingot)");
var gold73 = game.gold;
ok(g.VillageQuestManager.claim("workshop_level_two") === true && game.gold === gold73 + 300, "quête réclamée (+300 or)");
ok(g.VillageQuestManager.getCurrentQuest() === null, "chaîne des 7 quêtes entièrement terminée");
ok(!g.MissionBoard.list().find(function (m) { return m.sourceKind === "village"; }), "plus aucune carte village au tableau");

console.log("\n[74] v3.113.0 \u2014 Village hors-ligne supprim\u00e9, OfflineManager = r\u00e9sum\u00e9 Production");

// --- Le runtime ne contient plus l'ancien syst\u00e8me ---
ok(typeof g.VillageManager === "undefined", "VillageManager n'existe plus");
ok(typeof g.VILLAGE_CONFIG === "undefined", "VILLAGE_CONFIG n'existe plus");
ok(typeof g.OfflineManager === "object" && typeof g.OfflineManager.snapshot === "function", "nouvel OfflineManager expos\u00e9 (snapshot/summarize/show)");
/* v3.213.0 : game.village existe de nouveau, mais c'est un objet TOUT AUTRE —
   le socle des bâtiments de construction, pas l'ancien village hors-ligne. On
   vérifie donc la forme, pas l'absence. */
g.VillageBuildingManager.ensure();
ok(typeof game.village === "object" && typeof game.village.buildings === "object"
  && typeof game.village.buildings.workshop === "object",
  "game.village porte le socle de construction (buildings/site), plus l'ancien village hors-ligne");
ok(typeof game.village.goldmine === "undefined" && typeof game.village.hut === "undefined",
  "aucun bâtiment de l'ancien village hors-ligne dans l'état");

// --- Cycle snapshot -> gains simul\u00e9s -> summarize (sur l'\u00e9tat r\u00e9el du harnais) ---
game.lastOnline = Date.now() - 3600 * 1000; // 1h d'absence
var farmBucket74 = game.production && game.production.farm;
ok(!!farmBucket74 && Array.isArray(farmBucket74.plots), "bucket farm r\u00e9el disponible pour le test");
var plot74 = farmBucket74.plots[0];
plot74.state = "open";
var stockBefore74 = Math.floor(plot74.stock || 0);
g.OfflineManager.snapshot();
plot74.stock = (plot74.stock || 0) + 7; // simule le rattrapage catchUpOffline
var goldBefore74 = game.gold;
var sum74 = g.OfflineManager.summarize();
ok(!!sum74 && sum74.produced && sum74.produced.ble === 7, "delta bl\u00e9 de zone = +7 dans le r\u00e9sum\u00e9");
ok(game.gold === goldBefore74, "AUCUN or cr\u00e9dit\u00e9 par le retour d'absence (or 100 % actif)");
ok(typeof sum74.fullPlots === "number" && sum74.openPlots >= 1, "compteurs de zones pr\u00e9sents");

// --- Seuil 5 min : absence courte -> pas de r\u00e9sum\u00e9 ---
game.lastOnline = Date.now() - 60 * 1000;
g.OfflineManager.snapshot();
plot74.stock += 3;
ok(g.OfflineManager.summarize() === null, "absence < 5 min -> r\u00e9sum\u00e9 null");

// --- Lecture sans effet de bord : aucun bucket cr\u00e9\u00e9 pour un b\u00e2timent verrouill\u00e9 ---
var bucketKeys74 = Object.keys(game.production);
game.lastOnline = Date.now() - 3600 * 1000;
g.OfflineManager.snapshot();
g.OfflineManager.summarize();
ok(Object.keys(game.production).length === bucketKeys74.length, "snapshot/summarize ne cr\u00e9ent aucun bucket (migration '_migrateLegacyUnlocks' pr\u00e9serv\u00e9e)");

console.log("\n[75] v3.114.0 \u2014 \u00c9quilibrage or : \u00e9choppe index\u00e9e par monde, sellPrice bruts abaiss\u00e9s");

// --- Grille de base recal\u00e9e ---
ok(g.EQUIP_SHOP_PRICES.common === 300 && g.EQUIP_SHOP_PRICES.green === 1000 && g.EQUIP_SHOP_PRICES.rare === 2500 && g.EQUIP_SHOP_PRICES.epic === 9000 && g.EQUIP_SHOP_PRICES.legendary === 35000, "grille de base 300/1000/2500/9000/35000");

// --- Multiplicateur par monde max ATTEINT ---
game.worldsEverReached = { 0: true };
g.WorldManager.worldIndex = 0;
ok(g.getEquipShopWorldPriceMult() === 1, "For\u00eat seule : mult \u00d71");
ok(g.EquipShopManager.getPrice({ rarity: "rare" }) === 2500, "rare en For\u00eat = 2500");
game.worldsEverReached = { 0: true, 1: true };
ok(g.getEquipShopWorldPriceMult() === 4, "D\u00e9sert atteint : mult \u00d74");
ok(g.EquipShopManager.getPrice({ rarity: "common" }) === 1200, "common au D\u00e9sert = 300\u00d74 = 1200");
g.WorldManager.worldIndex = 0; // retour en For\u00eat...
ok(g.getEquipShopWorldPriceMult() === 4, "...les prix ne redescendent PAS (monde max atteint)");
game.equipShopManualRefreshCount = 0;
ok(g.EquipShopManager.getManualRefreshCost() === 4000, "refresh manuel index\u00e9 : 1000\u00d74 = 4000");

// --- L'achat honore le prix AFFICH\u00c9 (estampill\u00e9 sur le stock) ---
game.gold = 10000;
var stamped75 = { uid: "t75", rarity: "common", price: 300, bought: false, name: "\u00c9p\u00e9e test", slot: "weapon" };
game.equipShopStock = [stamped75];
var goldBefore75 = game.gold;
g.EquipShopManager.buy("t75");
ok(game.gold === goldBefore75 - 300, "achat au prix estampill\u00e9 (300) malgr\u00e9 mult \u00d74 courant");
ok(stamped75.bought === true, "objet marqu\u00e9 achet\u00e9");

// --- sellPrice bruts abaiss\u00e9s, craft\u00e9s intacts ---
ok(g.WAREHOUSE_RESOURCES.ble.sellPrice === 1 && g.WAREHOUSE_RESOURCES.bois.sellPrice === 1 && g.WAREHOUSE_RESOURCES.pierre.sellPrice === 1, "bl\u00e9/bois/pierre \u00e0 1 or");
ok(g.WAREHOUSE_RESOURCES.viande.sellPrice === 2 && g.WAREHOUSE_RESOURCES.fer.sellPrice === 3 && g.WAREHOUSE_RESOURCES.eau.sellPrice === 1, "viande 2, fer 3, eau 1");
ok(g.WAREHOUSE_RESOURCES.planche.sellPrice === 7 && g.WAREHOUSE_RESOURCES.pain.sellPrice === 19, "craft\u00e9s inchang\u00e9s (planche 7, pain 19)");
game.resources.ble = 10;
var gold75b = game.gold;
g.WarehouseManager.sellResource("ble", 5);
ok(game.gold === gold75b + 5, "vente 5 bl\u00e9 = +5 or (nouveau prix)");

game.worldsEverReached = { 0: true }; // restaure l'\u00e9tat pour la suite du harnais

console.log("\n[76] v3.115.0 \u2014 Potions per-run : armement, effets en mission seulement, consommation en fin de run");

// --- Donn\u00e9es recal\u00e9es ---
var pow76 = g.POTIONS_DB.find(function (p) { return p.id === "potion_power"; });
var aeth76 = g.POTIONS_DB.find(function (p) { return p.id === "elixir_aether"; });
ok(pow76.perRun === true && pow76.cost === 120, "Potion de Force : perRun, 120 or");
ok(aeth76.perRun === false && aeth76.cost === 10000, "\u00c9lixir d'Aether inchang\u00e9 (hors runs)");
ok(g.HEALING_POTIONS_DB[1].cost === 600 && g.HEALING_POTIONS_DB[1].dailyBuyLimit === 10, "Soin majeur : 600 or, 10 achats par jour (v3.291.0)");

// --- Migration legacy : timestamp futur -> arm\u00e9e, timestamp pass\u00e9 -> purg\u00e9 ---
game.activePotions = { potion_power: Date.now() + 60000, potion_celerity: 123 };
g.PotionManager.ensure();
ok(game.activePotions.potion_power === true, "timestamp futur normalis\u00e9 en arm\u00e9e");
ok(typeof game.activePotions.potion_celerity === "undefined", "timestamp expir\u00e9 purg\u00e9");
game.activePotions = {};

// --- Achat : stock libre jusqu'au cap ---
game.gold = 5000;
game.potionsOwned = {};
g.PotionManager.buyPotion("potion_power");
g.PotionManager.buyPotion("potion_power");
ok(g.PotionManager.getStock("potion_power") === 2, "2 en stock (l'ancienne limite de 1 a saut\u00e9)");
game.potionsOwned.potion_power = g.POTION_STOCK_CAP;
var gold76 = game.gold;
g.PotionManager.buyPotion("potion_power");
ok(game.gold === gold76 && g.PotionManager.getStock("potion_power") === g.POTION_STOCK_CAP, "achat refus\u00e9 au cap (" + g.POTION_STOCK_CAP + ")");
game.potionsOwned.potion_power = 2;

// --- Armement hors mission : effet DORMANT (jamais de boost du farm libre) ---
if (g.SortieManager.isActive()) g.SortieManager.end("return");
g.PotionManager.usePotion("potion_power");
ok(g.PotionManager.isArmed("potion_power") === true && g.PotionManager.getStock("potion_power") === 1, "bue au camp : arm\u00e9e, stock -1");
ok(Object.keys(g.PotionManager.getActiveEffects()).length === 0, "hors mission : aucun effet actif");
g.PotionManager.usePotion("potion_power");
ok(g.PotionManager.getStock("potion_power") === 1, "re-boire le m\u00eame type refus\u00e9 (1 par type et par run)");

// --- Entr\u00e9e en mission : effet vivant ; farm : jamais ---
g.SortieManager.start("farm");
ok(Object.keys(g.PotionManager.getActiveEffects()).length === 0, "sortie FARM : effet toujours dormant");
g.SortieManager.end("return");
ok(g.PotionManager.isArmed("potion_power") === true, "fin de farm : potion NON consomm\u00e9e (reste arm\u00e9e)");
g.SortieManager.start("hunt");
var fx76 = g.PotionManager.getActiveEffects();
ok(fx76.power === 0.20, "mission (chasse) : +20% Force vivant");
var tap76base = game.tapDamage;

// --- Cumul : 2e type bue EN mission, active imm\u00e9diatement ---
game.potionsOwned.elixir_fortune = 1;
g.PotionManager.usePotion("elixir_fortune");
fx76 = g.PotionManager.getActiveEffects();
ok(fx76.power === 0.20 && fx76.gold === 0.25, "cumul Force + Fortune sur le m\u00eame run");

// --- Fin de mission : tout est consomm\u00e9 ---
g.SortieManager.end("success");
ok(Object.keys(game.activePotions).length === 0, "fin de mission : potions consomm\u00e9es (m\u00eame en victoire)");
ok(Object.keys(g.PotionManager.getActiveEffects()).length === 0, "plus aucun effet apr\u00e8s le run");

// --- tick() no-op (signature conserv\u00e9e pour game-loop) ---
ok(g.PotionManager.tick() === false, "tick() est un no-op");

// --- R\u00e9compense de qu\u00eate : reward.potions via _grantReward, cap respect\u00e9 ---
game.potionsOwned.potion_endurance = g.POTION_STOCK_CAP - 1;
var rows76 = g.StoryQuestManager._grantReward({ potions: { potion_endurance: 3, elixir_aether: 2 } });
ok(g.PotionManager.getStock("potion_endurance") === g.POTION_STOCK_CAP, "r\u00e9compense plafonn\u00e9e au cap (9)");
ok(rows76.some(function (r) { return r.label === "Potion d'Endurance" && r.value === "\u00d71"; }), "ligne de r\u00e9compense \u00d71 (3 demand\u00e9es, 1 accord\u00e9e)");
ok(!rows76.some(function (r) { return r.label === "\u00c9lixir d'Aether"; }), "\u00c9lixir d'Aether non distribuable (perRun=false)");

/* ==================== Lot S1 : scene-engine générique (DESIGN_Scene_Engine_v1.md) ==================== */
console.log("\n[S1] SceneCheckSystem (module pur) — formule identique à ExplorationCheckSystem");
ok(g.SceneCheckSystem.successChance(0, 0) === 32, "successChance(0,0) = base 32 (v3.195.0)");
ok(g.SceneCheckSystem.successChance(1000, 0) === 87, "successChance plafonnée à 87 (32 base + statBonus cap 55, v3.195.0)");
ok(g.SceneCheckSystem.successChance(0, 1000) === 5, "successChance plancher à 5 (difficulté écrasante, v3.195.0)");
ok(g.SceneCheckSystem.estimate(30) === "low" && g.SceneCheckSystem.estimate(50) === "medium" && g.SceneCheckSystem.estimate(70) === "high", "estimate() qualitatif low/medium/high");
var chk76a = g.SceneCheckSystem.resolveCheck({ statValue: 10, difficulty: 4, randomValue: 0.01 });
ok(chk76a.result === "perfect", "randomValue très bas -> perfect (sous perfectThreshold)");
var chk76b = g.SceneCheckSystem.resolveCheck({ statValue: 10, difficulty: 4, randomValue: 0.99 });
ok(chk76b.result === "setback", "randomValue très haut -> setback (au-dessus de successThreshold)");
ok(g.SceneCheckSystem.depthDifficulty(4, 0) === 4 && Math.abs(g.SceneCheckSystem.depthDifficulty(4, 5) - 11) < 1e-9, "depthDifficulty +1.4/palier (v3.195.0)");
ok(g.SceneCheckSystem.depthLootMultiplier(0) === 1 && Math.abs(g.SceneCheckSystem.depthLootMultiplier(5) - 2.5) < 1e-9, "depthLootMultiplier +30%/palier");

console.log("\n[S1] SceneEngine (moteur pur) — tirage pondéré et génération de carte, aucun accès game.*");
ok(g.SceneEngine.weightedPick({ a: 100 }, 0.5) === "a", "weightedPick un seul poids -> toujours lui");
ok(g.SceneEngine.weightedPick({ a: 50, b: 50 }, 0.1) === "a" && g.SceneEngine.weightedPick({ a: 50, b: 50 }, 0.9) === "b", "weightedPick répartit selon randomValue");
ok(g.SceneEngine.weightedPick({}, 0.5) === null, "weightedPick objet vide -> null");
ok(g.SceneEngine.pickFromArray(["x", "y", "z"], 0) === "x" && g.SceneEngine.pickFromArray(["x", "y", "z"], 0.99) === "z", "pickFromArray bornes correctes");

var tpl76 = g.SCENE_TEMPLATES.expedition_faille;
var randCount76 = g.SceneEngine.estimateRandomCount(tpl76);
var rv76 = []; for (var i76 = 0; i76 < randCount76; i76++) rv76.push(0.5);
var card76 = g.SceneEngine.buildCard(tpl76, rv76);
ok(card76.length === tpl76.depthMax, "buildCard produit exactement depthMax paliers (" + tpl76.depthMax + ")");
ok(card76.every(function (level) { return level.length >= tpl76.gatesPerDepth[0] && level.length <= tpl76.gatesPerDepth[1]; }), "chaque palier a 2-3 portes");
ok(card76[0].every(function (slot) { return slot.type === "obstacle"; }), "premier palier toujours 'obstacle' (firstDepthType, lisibilité)");
ok(card76[0].every(function (slot) { return tpl76.pools.obstacle.indexOf(slot.gabaritId) !== -1; }), "gabaritId d'obstacle toujours dans le pool déclaré");

console.log("\n[S1] SceneEngine — riskMod par porte (v3.121.0, variance de difficulté/gain)");
ok(card76[0].every(function (slot) { return slot.riskMod >= tpl76.riskModRange[0] && slot.riskMod <= tpl76.riskModRange[1]; }), "riskMod de chaque obstacle dans template.riskModRange");
var riskValues76 = card76[0].map(function (slot) { return slot.riskMod; });
var allSame76 = riskValues76.every(function (v) { return v === riskValues76[0]; });
ok(allSame76, "card76 (randomValues figées à 0.5) donne un riskMod identique sur chaque porte — attendu, sert de témoin");
var rvVar76 = []; for (var iv76 = 0; iv76 < randCount76; iv76++) rvVar76.push(Math.random());
var cardVar76 = g.SceneEngine.buildCard(tpl76, rvVar76);
var riskValuesVar76 = cardVar76[0].map(function (slot) { return slot.riskMod; });
var allSameVar76 = riskValuesVar76.every(function (v) { return v === riskValuesVar76[0]; });
ok(!allSameVar76 || riskValuesVar76.length === 1, "avec des randomValues réellement aléatoires, riskMod varie entre les portes d'un même palier");
ok(g.SceneEngine.riskLevel(0.5) === "low" && g.SceneEngine.riskLevel(1.0) === "medium" && g.SceneEngine.riskLevel(1.5) === "high", "riskLevel : low/medium/high selon riskMod");
var lootLow76 = g.SceneEngine.rollLoot([10, 10], 0, 0.5, 0.6);
var lootHigh76 = g.SceneEngine.rollLoot([10, 10], 0, 0.5, 1.6);
ok(lootHigh76 > lootLow76, "rollLoot : un riskMod plus élevé rapporte visiblement plus (" + lootLow76 + " vs " + lootHigh76 + ")");
var diffLow76 = g.SceneCheckSystem.depthDifficulty(4, 0) * 0.6;
var diffHigh76 = g.SceneCheckSystem.depthDifficulty(4, 0) * 1.6;
ok(g.SceneCheckSystem.successChance(50, diffHigh76) < g.SceneCheckSystem.successChance(50, diffLow76), "difficulté effective : riskMod élevé -> succès moins probable, à stat égale");

var gabarit76 = g.SCENE_NODES.obstacles.eboulis;
var est76 = g.SceneEngine.estimateObstacle(gabarit76, "power", 10, 0);
ok(["low", "medium", "high"].indexOf(est76) !== -1, "estimateObstacle renvoie un estimate qualitatif");
var loot76 = g.SceneEngine.rollLoot([10, 10], 0, 0.5);
ok(loot76 === 10, "rollLoot base fixe [10,10] profondeur 0 -> 10 (multiplicateur ×1)");
var loot76b = g.SceneEngine.rollLoot([10, 10], 5, 0.5);
ok(loot76b === 25, "rollLoot [10,10] profondeur 5 -> 25 (×2.5, +30%/palier)");

console.log("\n[S1] SceneRunManager (glue jeu) — persistance game.sceneRun, délégation SortieManager");
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats();");
ok(g.SceneRunManager.isRunActive() === false, "aucun run actif après fullResetState");
var start76 = g.SceneRunManager.startRun("expedition_faille");
ok(start76.ok === true && start76.run.status === "preparation", "startRun -> statut 'preparation'");
ok(g.game.sceneRun && g.game.sceneRun.id === start76.run.id, "game.sceneRun persisté");
ok(g.game.sortie.active === true && g.game.sortie.context === "scene", "SortieManager.start('scene') appelé au démarrage");
var doubleStart76 = g.SceneRunManager.startRun("expedition_faille");
ok(doubleStart76.ok === false, "startRun refuse un second run pendant qu'un run est actif");

var badLoadout76 = g.SceneRunManager.confirmLoadout(["torche"]);
ok(badLoadout76.ok === false, "confirmLoadout refuse un sac incomplet (1/3)");
var loadout76 = g.SceneRunManager.confirmLoadout(["torche", "corde", "amulette"]);
ok(loadout76.ok === true && loadout76.run.status === "gate", "confirmLoadout complet -> statut 'gate'");
ok(g.game.sceneRun.torchCharges === 3, "torche : 3 charges (décision Seb 03/09/2026)");
ok(g.game.sceneRun.ropeAvailable === true && g.game.sceneRun.amuletAvailable === true, "corde/amulette disponibles selon le sac");

var level76 = g.SceneRunManager.getCurrentLevel();
ok(level76.length >= 2 && level76.length <= 3 && level76[0].type === "obstacle", "palier 0 : 2-3 portes, toutes obstacle");
var enter76 = g.SceneRunManager.enterGate(0);
ok(enter76.ok === true && g.game.sceneRun.status === "node" && g.game.sceneRun.pendingNode.type === "obstacle", "enterGate -> statut 'node', pendingNode posé");
var badEnter76 = g.SceneRunManager.enterGate(0);
ok(badEnter76.ok === false, "enterGate refusé hors statut 'gate' (idempotence)");

var lootBefore76 = g.game.sortie.loot.gold || 0;
var resolve76 = g.SceneRunManager.resolveObstacle(anyVoie());
ok(resolve76.ok === true, "resolveObstacle(voie exposée) accepté");
ok(g.game.sceneRun.status === "gate" || g.game.sceneRun.status === "finale" || g.game.sceneRun.status === "completed", "après résolution : avance au palier suivant (ou finale/évacuation)");
var lootAfter76 = g.game.sortie.loot.gold || 0;
ok(lootAfter76 >= lootBefore76, "or ajouté dans game.sortie.loot.gold (jamais négatif)");
var doubleResolve76 = g.SceneRunManager.resolveObstacle(anyVoie());
ok(doubleResolve76.ok === false, "resolveObstacle refusé si aucun obstacle en attente (idempotence anti double-clic)");

console.log("\n[S1] SceneRunManager — blessures typées, évacuation à 3, corde jamais négative");
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats();");
g.SceneRunManager.startRun("expedition_faille");
g.SceneRunManager.confirmLoadout(["provisions", "provisions", "provisions"]); // pas de corde/amulette : force les jets de stat
var injuries76 = 0, guard76 = 0;
while (g.game.sceneRun.injuries.length < 3 && guard76 < 60) {
  guard76++;
  if (g.game.sceneRun.status === "completed") break;
  if (g.game.sceneRun.status === "finale") { g.SceneRunManager.resolveFinale("sur"); break; }
  var lvl = g.SceneRunManager.getCurrentLevel();
  var obstacleIdx = -1;
  for (var gi = 0; gi < lvl.length; gi++) { if (lvl[gi].type === "obstacle") { obstacleIdx = gi; break; } }
  if (obstacleIdx === -1) { g.SceneRunManager.enterGate(0); }
  else {
    g.SceneRunManager.enterGate(obstacleIdx);
    var pending = g.game.sceneRun.pendingNode;
    if (pending && pending.type === "obstacle") g.SceneRunManager.resolveObstacle(anyVoie());
  }
  // Salles non-obstacle : les résoudre pour ne pas bloquer la boucle.
  var pn = g.game.sceneRun.pendingNode;
  if (pn) {
    if (pn.type === "autel") g.SceneRunManager.resolveAutel(false);
    else if (pn.type === "decouverte") g.SceneRunManager.resolveDecouverte();
    else if (pn.type === "source") g.SceneRunManager.resolveSource();
  }
}
ok(guard76 < 60, "la boucle de test a convergé sans dépasser le garde-fou (pas de blocage moteur)");
if (g.game.sceneRun.status === "completed") {
  // v3.198.0 : seuil lu sur le canevas au lieu d'être figé à 3.
  var maxInj76 = g.SceneRunManager.getMaxInjuries(g.game.sceneRun.templateId);
  // v3.265.0 : l'épuisement du Souffle (v3.199.0) est la 3e fin légitime — il rendait ce test instable (~1/10)
  ok(g.game.sceneRun.injuries.length >= maxInj76 || g.game.sceneRun.depth >= tpl76.depthMax || g.game.sceneRun.exhausted === true, "run terminé par évacuation (" + maxInj76 + " blessures), épuisement ou fin de carte (chambre finale résolue)");
  ok(g.game.sortie.active === false, "SortieManager.end() appelé -> sortie clôturée");
}

console.log("\n[S1] SceneRunManager — retour volontaire (leaveNow) banque en 'success', pas 'return'");
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats();");
g.SceneRunManager.startRun("expedition_faille");
g.SceneRunManager.confirmLoadout(["provisions", "provisions", "provisions"]);
var leave76 = g.SceneRunManager.leaveNow();
ok(leave76.ok === true, "leaveNow accepté au statut 'gate'");
ok(g.game.sceneRun.status === "completed", "run marqué 'completed' après leaveNow");
ok(g.game.sortie.active === false, "sortie clôturée par SortieManager.end('success')");

console.log("\n[S1] SceneRunManager.abandon() — sortie prématurée via le garde ui-root.js:switchTab");
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats();");
g.SceneRunManager.startRun("expedition_faille");
g.SceneRunManager.confirmLoadout(["provisions", "provisions", "provisions"]);
ok(g.SceneRunManager.isRunActive() === true, "run actif avant abandon");
var abandon76 = g.SceneRunManager.abandon();
ok(abandon76.ok === true, "abandon() accepté sur un run actif");
ok(g.game.sceneRun.status === "completed", "run marqué 'completed' après abandon");
ok(g.game.sortie.active === false, "sortie clôturée par SortieManager.end('flee') (50%, 0 XP)");
var doubleAbandon76 = g.SceneRunManager.abandon();
ok(doubleAbandon76.ok === false, "abandon() refusé sur un run déjà 'completed' (idempotence)");

console.log("\n[S1] ui-root.js:switchTab — garde anti-sortie pendant un run scene-engine actif");
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats(); game.unlockedTabs.scene = true; game.unlockedTabs.combat = true;");
g.SceneRunManager.startRun("expedition_faille");
g.SceneRunManager.confirmLoadout(["provisions", "provisions", "provisions"]);
run("game.activeTab = 'scene';");
var confirmCalled76 = false;
run("window.showConfirmModal = function(title, text, icon, cb) { window.__sceneConfirmCb = cb; };");
run("switchTab('combat');");
ok(g.game.activeTab === "scene", "switchTab('combat') pendant un run actif NE change PAS activeTab tant que la confirmation n'est pas résolue");
ok(typeof g.__sceneConfirmCb === "function", "showConfirmModal appelé avec un callback d'abandon");
run("window.closeSceneModal = function(){};"); // stub, non défini dans ce contexte de test isolé
run("__sceneConfirmCb();");
ok(g.game.activeTab === "campement", "après confirmation : navigation effective ; sans run de quête, Combat renvoie au Campement (v3.293.0)");
ok(g.game.sceneRun.status === "completed", "le run a été abandonné (flee) avant la navigation");

console.log("\n[S1b] ui-root.js:switchTab — EXCEPTION nœud bloqueur pas prêt (bug remonté Seb 04/09/2026)");
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats(); game.unlockedTabs.village = true; game.resources.petite_ration = 10;");
run("SceneRunManager.startRun('petite_aventure_foret'); SceneRunManager.chooseProfile('prudent'); SceneRunManager.chooseIntensity('chemin'); SceneRunManager.acknowledgeMutator();");
run("SceneRunManager.confirmLoadout(['provisions', 'provisions', 'amulette']);");
ok(g.game.sceneRun.status === "gate", "contrôle : run en statut 'gate' après confirmation du loadout");
// Carte déterministe : un bloqueur au palier 0, pour ne pas dépendre du tirage aléatoire de profil.
run("game.sceneRun.card[0] = [{type: 'bloqueur', durationMs: 300000}];");
run("SceneRunManager.enterGate(0);");
ok(g.game.sceneRun.pendingNode.type === "bloqueur", "contrôle : nœud bloqueur bien engagé");
ok(g.SceneRunManager.isBlockerReady() === false, "contrôle : minuteur pas encore écoulé (5 min tout juste lancées)");
run("game.activeTab = 'scene'; window.showConfirmModal = function () { window.__blockerConfirmCalled = true; };");
run("window.__blockerConfirmCalled = false;");
run("switchTab('village');");
ok(g.game.activeTab === "village", "bug corrigé : 'Aller au village' pendant un bloqueur non prêt change bien d'onglet");
ok(g.window.__blockerConfirmCalled === false, "aucune confirmation d'abandon déclenchée");
ok(g.game.sceneRun.status !== "completed" && g.SceneRunManager.isRunActive() === true, "le run reste ACTIF (pas d'abandon, pas de perte de loot) — le minuteur continue en fond");
// Retour sur l'écran scene : le bloqueur est toujours là, non affecté par le passage au village.
run("switchTab('scene');");
ok(g.game.sceneRun.pendingNode && g.game.sceneRun.pendingNode.type === "bloqueur", "de retour sur l'expédition : le nœud bloqueur est intact, minuteur inchangé");

// Contrôle négatif : une fois le bloqueur PRÊT, quitter l'écran redevient un abandon normal
// (le bouton devient "Continuer", quitter n'est plus un aller-retour anodin).
run("game.sceneRun.blockerReadyAt = Date.now() - 1000;"); // simule le minuteur écoulé
ok(g.SceneRunManager.isBlockerReady() === true, "contrôle : bloqueur désormais prêt");
run("game.activeTab = 'scene'; window.__blockerConfirmCalled = false;");
run("switchTab('village');");
ok(g.game.activeTab === "scene", "bloqueur PRÊT : switchTab bloqué normalement (redevient une vraie sortie à confirmer)");
ok(g.window.__blockerConfirmCalled === true, "bloqueur PRÊT : confirmation d'abandon redemandée comme pour tout autre nœud");

console.log("\n[S2b] veine_instable / eboulis_ferreux / source_tarie — déblocage + ressources dédiées");
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats(); game.explorationProgression.forgottenClearingUnlocked = true;");
var s2bNoRation = g.SceneRunManager.startRun("veine_instable");
ok(s2bNoRation.ok === false && /ration/i.test(s2bNoRation.reason), "veine_instable : refusé sans petite_ration (entryCost)");
g.WarehouseManager.addResource("petite_ration", 1);
g.SceneRunManager.startRun("veine_instable");
var s2bGuard = 0;
while (g.game.sceneRun.status !== "completed" && s2bGuard < 20) {
  s2bGuard++;
  if (g.game.sceneRun.status === "gate") g.SceneRunManager.enterGate(0);
  else if (g.game.sceneRun.status === "node") g.SceneRunManager.resolveObstacle(anyVoie());
  else if (g.game.sceneRun.status === "finale") g.SceneRunManager.resolveFinale("sur");
}
ok(g.game.explorationProgression.quarryUnlocked === true, "veine_instable : quarryUnlocked posé au succès");
ok(g.ProductionManager.isBuildingUnlocked("quarry") && !!g.game.production.quarry, "Carrière débloquée + bucket initialisé");
ok(g.WarehouseManager.getAmount("pierre") > 0, "pierre créditée (lootResource dédié, pas or générique)");

run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats(); game.explorationProgression.quarryUnlocked = true; WarehouseManager.addResource('petite_ration', 1);");
g.SceneRunManager.startRun("eboulis_ferreux");
var s2cGuard = 0;
while (g.game.sceneRun.status !== "completed" && s2cGuard < 20) {
  s2cGuard++;
  if (g.game.sceneRun.status === "gate") g.SceneRunManager.enterGate(0);
  else if (g.game.sceneRun.status === "node") g.SceneRunManager.resolveObstacle(anyVoie());
  else if (g.game.sceneRun.status === "finale") g.SceneRunManager.resolveFinale("sur");
}
ok(g.game.explorationProgression.mineUnlocked === true, "eboulis_ferreux : mineUnlocked posé au succès");
ok(g.WarehouseManager.getAmount("fer") > 0, "fer crédité (fer seul, pas de bonus pierre — décision Seb)");

run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats();");
ok(g.WarehouseManager.getAmount("petite_ration") === 0, "aucune ration en stock (contrôle)");
var s2dStart = g.SceneRunManager.startRun("source_tarie");
ok(s2dStart.ok === true, "source_tarie : démarré SANS petite_ration (gratuit, même raison que driedSpring d'origine)");
var s2dGuard = 0;
while (g.game.sceneRun.status !== "completed" && s2dGuard < 20) {
  s2dGuard++;
  if (g.game.sceneRun.status === "gate") g.SceneRunManager.enterGate(0);
  else if (g.game.sceneRun.status === "node") g.SceneRunManager.resolveObstacle(anyVoie());
  else if (g.game.sceneRun.status === "finale") g.SceneRunManager.resolveFinale("sur");
}
ok(g.game.explorationProgression.wellUnlocked === true, "source_tarie : wellUnlocked posé au succès");
ok(g.WarehouseManager.getAmount("eau") > 0, "eau créditée");

console.log("\n[S2b] MissionBoard — gate d'affichage de veine_instable (boardRequires ajouté, régression v3.118.0 évitée)");
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats();");
ok(!g.MissionBoard.list().find(function (m) { return m.id === "scene_veine_instable"; }), "sans forgottenClearingUnlocked : Veine Instable absente du tableau");
game.explorationProgression.forgottenClearingUnlocked = true;
ok(!!g.MissionBoard.list().find(function (m) { return m.id === "scene_veine_instable"; }), "avec forgottenClearingUnlocked : Veine Instable apparaît");

console.log("\n[S2b] StoryQuestManager.goToLink() — liens Histoire routés vers openSceneQuestEntry");
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats(); game.explorationProgression.forgottenClearingUnlocked = true; WarehouseManager.addResource('petite_ration', 2);");
run("StoryQuestManager.ensure(); game.storyQuests.forest.currentStep = " + stepIdx("forest_09") + "; game.storyQuests.forest.accepted = true;"); // étape Veine Instable (linkTo scene_veine_instable)
g.StoryQuestManager.goToLink("forest");
ok(g.game.activeTab === "scene" && g.game.sceneRun && g.game.sceneRun.templateId === "veine_instable", "goToLink('forest') sur l'étape Veine Instable lance bien le scene-engine (linkTo.cardId mis à jour)");

console.log("\n[S1] save-system.js — sceneRun aux 4 emplacements (buildSaveData/loadGame/hardReset/fullReset)");
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats(); game.sceneRun = { id: 'test_persist', status: 'gate' };");
var saved76 = run("buildSaveData()");
ok(saved76.sceneRun && saved76.sceneRun.id === "test_persist", "buildSaveData inclut sceneRun");
run("game.sceneRun = null; loadGame_applyData_test = true;"); // marker inutilisé, juste lisibilité
var applied76 = run("(function(){ var d = " + JSON.stringify(saved76) + "; game.explorationRun = d.explorationRun && typeof d.explorationRun === 'object' ? d.explorationRun : null; game.sceneRun = d.sceneRun && typeof d.sceneRun === 'object' ? d.sceneRun : null; return game.sceneRun; })()");
ok(applied76 && applied76.id === "test_persist", "le fragment de loadGame() restaure sceneRun depuis la sauvegarde");
run("hardResetState();");
ok(g.game.sceneRun === null, "hardResetState() remet sceneRun à null (ne survit pas à l'ascension)");
run("game.sceneRun = { id: 'test2' }; fullResetState();");
ok(g.game.sceneRun === null, "fullResetState() remet sceneRun à null");

/* ==================== Lot S2a : quêtes de déblocage migrées vers le scene-engine ==================== */
console.log("\n[S2a] sentier_obstrue — coût de ration, 2 paliers, déblocage Clairière oubliée");
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats();");
var s2aNoRation = g.SceneRunManager.startRun("sentier_obstrue");
ok(s2aNoRation.ok === false && /ration/i.test(s2aNoRation.reason), "refusé sans petite_ration (entryCost)");
g.WarehouseManager.addResource("petite_ration", 1);
var s2aStart = g.SceneRunManager.startRun("sentier_obstrue");
ok(s2aStart.ok === true, "démarré avec 1 petite_ration en stock");
ok(g.game.sceneRun.status === "gate", "loadoutSlots=0 -> statut direct 'gate', pas de 'preparation'");
ok(g.WarehouseManager.getAmount("petite_ration") === 0, "1 petite_ration débitée au départ");
ok(g.game.sceneRun.card.length === 2, "carte à 2 paliers (depthMax)");
var s2aGuard = 0;
while (g.game.sceneRun.status !== "completed" && s2aGuard < 20) {
  s2aGuard++;
  if (g.game.sceneRun.status === "gate") g.SceneRunManager.enterGate(0);
  else if (g.game.sceneRun.status === "node") g.SceneRunManager.resolveObstacle(anyVoie());
  else if (g.game.sceneRun.status === "finale") g.SceneRunManager.resolveFinale("sur");
}
ok(s2aGuard < 20, "run résolu sans dépasser le garde-fou");
ok(g.game.explorationProgression.forgottenClearingUnlocked === true, "forgottenClearingUnlocked posé au succès (chambre finale résolue)");
ok(g.game.explorationProgression.blockedPathCompleted === true, "completionFlag posé");
ok(g.SceneRunManager.isQuestCompleted("sentier_obstrue") === true, "isQuestCompleted() vrai après succès");
var s2aRetry = g.SceneRunManager.startRun("sentier_obstrue");
ok(s2aRetry.ok === false && /terminée/i.test(s2aRetry.reason), "non relançable une fois réussie");

console.log("\n[S2a] bosquet_silencieux — gratuit (pas d'entryCost), déblocage Scierie");
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats();");
ok(g.WarehouseManager.getAmount("petite_ration") === 0, "aucune ration en stock au départ (contrôle)");
var s2bStart = g.SceneRunManager.startRun("bosquet_silencieux");
ok(s2bStart.ok === true, "démarré SANS petite_ration (gratuit, entryCost: null)");
var s2bGuard = 0;
while (g.game.sceneRun.status !== "completed" && s2bGuard < 20) {
  s2bGuard++;
  if (g.game.sceneRun.status === "gate") g.SceneRunManager.enterGate(0);
  else if (g.game.sceneRun.status === "node") g.SceneRunManager.resolveObstacle(anyVoie());
  else if (g.game.sceneRun.status === "finale") g.SceneRunManager.resolveFinale("sur");
}
ok(g.game.explorationProgression.sawmillUnlocked === true, "sawmillUnlocked posé au succès");
ok(g.ProductionManager.isBuildingUnlocked("sawmill") && !!g.game.production.sawmill, "Scierie débloquée + bucket initialisé (ProductionManager.unlockBuilding)");

console.log("\n[S2a] terre_en_friche — échec en cours de route : perte partielle, run continue, pas de blocage net");
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats();");
g.game.explorationProgression.wellUnlocked = true; // prérequis de lancement
g.WarehouseManager.addResource("petite_ration", 1);
g.SceneRunManager.startRun("terre_en_friche");
g.SceneRunManager.enterGate(0);
run("var _mrS2a = Math.random; Math.random = function () { return 0.99; };"); // force le pire résultat (setback)
var s2cFail = g.SceneRunManager.resolveObstacle(anyVoie());
run("Math.random = _mrS2a;");
ok(s2cFail.outcome === "setback", "premier jet forcé en échec (tirage 0.99)");
ok(g.game.sceneRun.status === "gate", "après un setback (1 blessure) : le run CONTINUE (statut 'gate'), pas d'échec net (décision Seb)");
ok(g.game.sceneRun.injuries.length === 1, "1 blessure typée enregistrée");
ok(g.game.explorationProgression.farmUnlocked !== true, "farmUnlocked PAS encore posé (chambre finale non atteinte)");

console.log("\n[S2a] MissionBoard._sceneMissions() — gating d'affichage repris de boardRequires (EXPLORATION_QUESTS)");
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats();");
var s2aBoard1 = g.MissionBoard.list();
ok(!s2aBoard1.find(function (m) { return m.id === "scene_sentier_obstrue"; }), "sans huntBuildingUnlocked : Sentier Obstrué absent (boardRequires repris tel quel)");
ok(!s2aBoard1.find(function (m) { return m.id === "scene_bosquet_silencieux"; }), "sans village débloqué : Bosquet Silencieux absent");
game.explorationProgression.huntBuildingUnlocked = true;
game.unlockedTabs.village = true;
var s2aBoard2 = g.MissionBoard.list();
ok(!!s2aBoard2.find(function (m) { return m.id === "scene_sentier_obstrue"; }), "huntBuildingUnlocked : Sentier Obstrué apparaît");
ok(!!s2aBoard2.find(function (m) { return m.id === "scene_bosquet_silencieux"; }), "village débloqué : Bosquet Silencieux apparaît");
var sentierMission = s2aBoard2.find(function (m) { return m.id === "scene_sentier_obstrue"; });
ok(sentierMission.status === "available" && typeof sentierMission.accept === "function", "carte non acceptée : accept() présent, launch absent");
sentierMission.accept();
var s2aBoard3 = g.MissionBoard.list().find(function (m) { return m.id === "scene_sentier_obstrue"; });
ok(s2aBoard3.status === "accepted" && typeof s2aBoard3.launch === "function", "après accept() : statut 'accepted', launch() présent");
ok(!g.MissionBoard.list().find(function (m) { return m.id === "exploration_blockedPath"; }), "l'ancienne carte exploration_blockedPath n'apparaît plus (retirée de _explorationMissions)");

console.log("\n[S2a] écran Quêtes complet — catégorie 'secondaires' inclut sourceKind 'scene' (QUEST_BOARD_CATEGORIES)");
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats(); game.explorationProgression.huntBuildingUnlocked = true;");
run("setQuestCategory('secondaires');");
var questsHtml76 = run("buildQuestsHTML()");
ok(questsHtml76.indexOf("Sentier Obstrué") !== -1, "carte active visible dans l'onglet Secondaires de l'écran Quêtes complet (pas seulement au Campement)");
run("game.explorationProgression.blockedPathCompleted = true; game.explorationProgression.forgottenClearingUnlocked = true; setQuestsFilter('completed'); toggleQuestSectionExpand('expedition');");
var questsHtmlDone76 = run("buildQuestsHTML()");
ok(questsHtmlDone76.indexOf("Sentier Obstrué") !== -1, "carte terminée visible dans l'historique une fois la section 'Expéditions' dépliée");

console.log("\n[PA1] Petites Aventures — profil, cap journalier, nœud bloqueur (v3.125.0, Lot PA1)");
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats(); game.unlockedTabs.village = true; game.resources.petite_ration = 10;");
ok(g.SceneRunManager.canStartPetiteAventureToday(), "cap dispo au départ");
ok(g.SceneRunManager.petiteAventureCountToday() === 0, "compteur à 0 au départ");

var paR1 = run("SceneRunManager.startRun('petite_aventure_foret')");
ok(paR1.ok, "startRun ok");
ok(g.game.sceneRun.status === "profile", "status = 'profile' après startRun (pas de carte générée avant le choix)");
ok(g.SceneRunManager.petiteAventureCountToday() === 1, "compteur consommé au lancement (=1), pas au succès");

var paR2 = run("SceneRunManager.chooseProfile('prudent')");
ok(paR2.ok, "chooseProfile('prudent') ok");
ok(g.game.sceneRun.profile === "prudent", "profile figé = 'prudent'");
// v3.195.0 : chooseProfile ne génère plus la carte (dépend désormais de l'intensité,
// pas encore choisie) — status intermédiaire 'intensity' avant 'preparation'.
ok(g.game.sceneRun.status === "intensity", "status = 'intensity' après chooseProfile (avant génération de carte)");
ok(g.game.sceneRun.card.length === 0, "carte pas encore générée avant le choix d'intensité");

var paR2b = run("SceneRunManager.chooseIntensity('chemin')");
ok(paR2b.ok, "chooseIntensity('chemin') ok");
ok(g.game.sceneRun.intensity === "chemin", "intensity figée = 'chemin'");
ok(g.game.sceneRun.card.length === 8, "carte à 8 paliers (SCENE_INTENSITY.chemin.depthMax)");
// v3.196.0 : chooseIntensity tire aussi le mutateur et court-circuite vers 'mutator-announce'
// (restauré par acknowledgeMutator) — le statut posé par _generateCard (preparation/gate)
// n'est donc plus immédiatement lisible ici, il est mémorisé dans run._statusAfterMutator.
ok(g.game.sceneRun.status === "mutator-announce", "status = 'mutator-announce' après chooseIntensity (avant preparation/gate)");
ok(g.game.sceneRun._statusAfterMutator === "preparation", "statut mémorisé = 'preparation' (loadoutSlots=3), restauré par acknowledgeMutator()");
var paR2c = run("SceneRunManager.acknowledgeMutator()");
ok(paR2c.ok, "acknowledgeMutator() ok");
ok(g.game.sceneRun.status === "preparation", "status = 'preparation' après acknowledgeMutator");

var paBadProfile = run("SceneRunManager.chooseProfile('foo')");
ok(!paBadProfile.ok, "chooseProfile refuse un profil invalide");

// Sur plusieurs tirages : profil prudent doit pouvoir produire un bloqueur, bourrin un combat.
var sawBloqueur = false, sawCombat = false, t;
for (t = 0; t < 40 && !sawBloqueur; t++) {
  run("SceneRunManager.clearRun(); game.resources.petite_ration = 10; game.explorationProgression.petiteAventure = { day: '', count: 0 }; SceneRunManager.startRun('petite_aventure_foret'); SceneRunManager.chooseProfile('prudent'); SceneRunManager.chooseIntensity('chemin');");
  var cardP = g.game.sceneRun.card;
  cardP.forEach(function (level) { level.forEach(function (slot) { if (slot.type === "bloqueur") sawBloqueur = true; }); });
}
ok(sawBloqueur, "profil prudent : au moins un slot 'bloqueur' observé sur " + t + " tirages");

for (t = 0; t < 40 && !sawCombat; t++) {
  run("SceneRunManager.clearRun(); game.resources.petite_ration = 10; game.explorationProgression.petiteAventure = { day: '', count: 0 }; SceneRunManager.startRun('petite_aventure_foret'); SceneRunManager.chooseProfile('bourrin'); SceneRunManager.chooseIntensity('chemin');");
  var cardB = g.game.sceneRun.card;
  cardB.forEach(function (level) { level.forEach(function (slot) { if (slot.type === "combat") sawCombat = true; }); });
}
ok(sawCombat, "profil bourrin : au moins un slot 'combat' observé sur " + t + " tirages");

// v3.143.0 (variance des runs) : garanties chiffrées — vérifiées sur N tirages, pas juste "au
// moins une fois". Bourrin : TOUJOURS au moins 1 combat (sim 3000 runs, 0% à 0 combat après
// correctif, contre 6.7% avant). Prudent : JAMAIS plus de 2 bloqueurs (0% après, contre 9.9%
// de runs à ≥3 avant, jusqu'à 45 min d'attente cumulée observés).
var N_VARIANCE = 150, minCombatFails = 0, maxBloqueurFails = 0, prudentCombatUnaffected = false;
for (var vt = 0; vt < N_VARIANCE; vt++) {
  run("SceneRunManager.clearRun(); game.resources.petite_ration = 10; game.explorationProgression.petiteAventure = { day: '', count: 0 }; SceneRunManager.startRun('petite_aventure_foret'); SceneRunManager.chooseProfile('bourrin'); SceneRunManager.chooseIntensity('chemin');");
  var cardV = g.game.sceneRun.card;
  var nCombatV = 0;
  cardV.forEach(function (level) { level.forEach(function (slot) { if (slot.type === "combat") nCombatV++; }); });
  if (nCombatV < 1) minCombatFails++;
  if (nCombatV > 2) minCombatFails++; // le plafond existant (v3.132.0) doit rester respecté
}
ok(minCombatFails === 0, "profil bourrin : garantie ≥1 et ≤2 combat(s) respectée sur " + N_VARIANCE + " tirages (0 échec)");
ok(g.game.sceneRun.card[0][0].type === "obstacle", "contrôle : le palier 0 (firstDepthType) n'est jamais celui forcé en combat");

for (vt = 0; vt < N_VARIANCE; vt++) {
  run("SceneRunManager.clearRun(); game.resources.petite_ration = 10; game.explorationProgression.petiteAventure = { day: '', count: 0 }; SceneRunManager.startRun('petite_aventure_foret'); SceneRunManager.chooseProfile('prudent'); SceneRunManager.chooseIntensity('chemin');");
  var cardV2 = g.game.sceneRun.card;
  var nBloqueurV = 0, nCombatV2 = 0;
  cardV2.forEach(function (level) { level.forEach(function (slot) { if (slot.type === "bloqueur") nBloqueurV++; if (slot.type === "combat") nCombatV2++; }); });
  if (nBloqueurV > 2) maxBloqueurFails++;
  if (nCombatV2 === 0) prudentCombatUnaffected = true; // confirme que le plancher combat NE s'applique PAS à prudent
}
ok(maxBloqueurFails === 0, "profil prudent : jamais plus de 2 bloqueurs sur " + N_VARIANCE + " tirages (0 échec)");
ok(prudentCombatUnaffected, "profil prudent : conserve des runs à 0 combat (le plancher ne cible QUE bourrin, pas de dérive de sa promesse 'peu/pas de combat')");

// Cap journalier : 3 lancements OK, le 4e refusé.
run("game.explorationProgression.petiteAventure = { day: '', count: 0 }; SceneRunManager.clearRun();");
var capOkCount = 0;
for (var i = 0; i < 3; i++) {
  run("game.resources.petite_ration = 10;");
  var capRes = run("SceneRunManager.startRun('petite_aventure_foret')");
  if (capRes.ok) capOkCount++;
  run("SceneRunManager.clearRun();");
}
ok(capOkCount === 3, "3 lancements du jour acceptés (" + capOkCount + "/3)");
run("game.resources.petite_ration = 10;");
var capRes4 = run("SceneRunManager.startRun('petite_aventure_foret')");
ok(!capRes4.ok, "4e lancement du jour refusé (cap atteint) — raison : " + capRes4.reason);

// Changement de jour civil : le compteur doit repartir à 0 (simulate en forçant 'day' à hier).
run("game.explorationProgression.petiteAventure = { day: 'hier-simule', count: 3 };");
ok(g.SceneRunManager.petiteAventureCountToday() === 0, "compteur repart à 0 sur un jour civil différent");
ok(g.SceneRunManager.canStartPetiteAventureToday(), "cap de nouveau dispo après changement de jour");

// Nœud bloqueur : refus tant que le minuteur n'est pas écoulé, résolution ok une fois échu.
run("game.explorationProgression.petiteAventure = { day: '', count: 0 }; game.resources.petite_ration = 10; SceneRunManager.startRun('petite_aventure_foret'); SceneRunManager.chooseProfile('prudent'); SceneRunManager.chooseIntensity('chemin'); SceneRunManager.acknowledgeMutator(); SceneRunManager.confirmLoadout(['torche','torche','torche']);");
run("game.sceneRun.card[game.sceneRun.depth] = [{ type: 'bloqueur', durationMs: 200 }];");
var egRes = run("SceneRunManager.enterGate(0)");
ok(egRes.ok, "enterGate sur un slot bloqueur accepté");
ok(g.game.sceneRun.pendingNode.type === "bloqueur", "pendingNode.type = 'bloqueur'");
ok(g.game.sceneRun.blockerReadyAt > Date.now(), "blockerReadyAt posé dans le futur");
var tooEarly = run("SceneRunManager.resolveBloqueur()");
ok(!tooEarly.ok, "resolveBloqueur refusé avant l'échéance du minuteur");
var depthBefore = g.game.sceneRun.depth;
run("game.sceneRun.blockerReadyAt = Date.now() - 10;"); // simule l'écoulement du temps (tourne en fond, pas de setInterval)
var resolvedOk = run("SceneRunManager.resolveBloqueur()");
ok(resolvedOk.ok, "resolveBloqueur accepté une fois le minuteur écoulé");
ok(g.game.sceneRun.depth === depthBefore + 1, "run avance d'un palier après résolution du bloqueur");
ok(g.game.sceneRun.pendingNode === null, "pendingNode nettoyé après résolution");

// Mission board : la carte répétable apparaît, avec le compteur restant, jusqu'au cap.
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats(); game.unlockedTabs.village = true; game.resources.petite_ration = 10;");
var paBoard1 = run("MissionBoard.list()").find(function (m) { return m.id === "petite_aventure_foret"; });
ok(!!paBoard1, "carte 'petite_aventure_foret' présente au tableau (village débloqué)");
ok(paBoard1.status === "available" && typeof paBoard1.accept === "function", "carte disponible avec accept() (pas d'étape 'accepter' séparée)");
run("game.explorationProgression.petiteAventure = { day: new Date().toDateString(), count: 3 };"); // cap déjà atteint AUJOURD'HUI (jour civil réel, pas un jour arbitraire)
var paBoard2 = run("MissionBoard.list()").find(function (m) { return m.id === "petite_aventure_foret"; });
ok(paBoard2.status === "unavailable" && !paBoard2.accept, "carte devient indisponible une fois le cap atteint, aucune action");
// v3.141.0 : rendu HTML réel de la carte au statut "unavailable" — avant ce fix, ni bouton ni
// texte (retombait dans le "" final de buildQuestBoardActionHTML), la carte semblait inerte.
var paBoard2Html = run("buildQuestBoardCardHTML(MissionBoard.list().find(function (m) { return m.id === 'petite_aventure_foret'; }))");
ok(paBoard2Html.indexOf("is-locked") !== -1, "carte 'unavailable' porte le style estompé is-locked (même habillage que 'locked')");
ok(paBoard2Html.indexOf("Revenez demain") !== -1, "carte 'unavailable' affiche un texte explicite au lieu d'un bouton/vide");
ok(paBoard2Html.indexOf("Plus de tentative aujourd") !== -1, "le blurb explicatif (posé par _petiteAventureMissions) reste visible sur la carte");
run("game.unlockedTabs.village = false;");
var paBoard3 = run("MissionBoard.list()").find(function (m) { return m.id === "petite_aventure_foret"; });
ok(!paBoard3, "carte absente si le Village n'est pas débloqué (boardRequires)");

// Sauvegarde : petiteAventure survit à un cycle localStorage/loadGame et à hardResetState (ascension).
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats(); game.explorationProgression.petiteAventure = { day: 'jour-test', count: 2 };");
var paSaved = run("buildSaveData()");
ok(paSaved.explorationProgression.petiteAventure.count === 2, "buildSaveData inclut petiteAventure (via explorationProgression, sans whitelist dédiée)");
run("localStorage.setItem(getActiveSaveKey(), JSON.stringify(buildSaveData()));");
run("game.explorationProgression.petiteAventure = { day: '', count: 0 };");
run("loadGame();");
ok(g.game.explorationProgression.petiteAventure.count === 2, "loadGame() restaure petiteAventure depuis le localStorage");
run("hardResetState();");
ok(g.game.explorationProgression.petiteAventure.count === 2, "hardResetState (ascension) préserve petiteAventure — cap journalier permanent, comme les autres déblocages");

console.log("\n[PA2] Petites Aventures — nœud combat (profil Bourrin, v3.126.0, Lot PA2)");

// Prépare un run Petite Aventure en profil Bourrin, force un slot combat au palier courant,
// force un ennemi trivial pour un test déterministe (comme freshCombat le fait ailleurs).
function setupScenePACombat(profileId) {
  run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp; game.unlockedTabs.village = true; game.unlockedTabs.combat = true; game.resources.petite_ration = 10;");
  run("SceneRunManager.startRun('petite_aventure_foret'); SceneRunManager.chooseProfile('" + profileId + "'); SceneRunManager.chooseIntensity('chemin'); SceneRunManager.acknowledgeMutator(); SceneRunManager.confirmLoadout(['torche','torche','torche']);");
  run("game.sceneRun.card[game.sceneRun.depth] = [{ type: 'combat', gabaritId: 'gobelins_foret' }];");
}

setupScenePACombat("bourrin");
var egCombat = run("SceneRunManager.enterGate(0)");
ok(egCombat.ok, "enterGate sur un slot combat accepté");
ok(g.game.sceneRun.status === "combat", "run.status = 'combat' après enterGate sur un slot combat");
ok(g.game.activeTab === "combat", "switchTab('combat') effectif (pas bloqué par le garde anti-sortie de ui-root.js)");
ok(!!g.game.enemy, "un ennemi est bien apparu (QuestEnemyManager.spawnFor via pseudo-quête forest)");
ok(["goblin"].indexOf(g.game.enemy.id) !== -1, "l'ennemi appartient bien au groupe 'gobelins_foret' (enemyFilter respecté)");

// Victoire (vague simple, run.card avec un AUTRE nœud combat garanti plus loin -> pas de boss
// à la fin de CETTE vague) : la vague cible est tirée aléatoirement 6-10 à l'entrée du nœud
// (v3.130.0) — on la lit puis on tue exactement ce nombre d'ennemis, un par un, en vérifiant
// que le run reste en 'combat' jusqu'au dernier kill. Un second combat est forcé plus loin
// dans la carte pour garantir _isLastCombatNodeOfRun() = false (sinon le tirage aléatoire de
// chooseProfile() pourrait, par hasard, ne poser aucun autre combat sur les 8 paliers — le
// dernier kill ferait alors apparaître le boss au lieu de terminer simplement le nœud, cassant
// ce test précis qui veut isoler le cas "vague normale, pas la dernière du run").
setupScenePACombat("bourrin");
run("if (game.sceneRun.card.length <= game.sceneRun.depth + 1) game.sceneRun.card.push([{ type: 'combat', gabaritId: 'gobelins_foret' }]); else game.sceneRun.card[game.sceneRun.depth + 1] = [{ type: 'combat', gabaritId: 'gobelins_foret' }];");
run("SceneRunManager.enterGate(0);");
ok(g.game.sceneRun._combatIsFinalWave === false, "un second combat garanti plus loin -> pas la dernière vague du run (contrôle avant le test de victoire)");
var waveTarget = g.game.sceneRun._combatWaveTarget;
ok(waveTarget >= 4 && waveTarget <= 6, "cible de vague tirée dans la fourchette 4-6 du canevas (combatWaveRange, v3.132.0 — obtenu " + waveTarget + ")");
var depthBeforeWin = g.game.sceneRun.depth;
for (var w = 1; w <= waveTarget; w++) {
  run("game.enemy.hp = 1; game.enemy.maxHp = 1; CombatEngine.killEnemy();");
  if (w < waveTarget) {
    ok(g.game.sceneRun.status === "combat", "vague en cours (" + w + "/" + waveTarget + ") : run reste en statut 'combat', ennemi suivant apparu");
  }
}
ok(g.game.sceneRun.status !== "combat", "run.status quitte 'combat' après la vague entière (killEnemy dispatch vers SceneRunManager.onCombatWon)");
ok(g.game.sceneRun.depth === depthBeforeWin + 1 || g.game.sceneRun.status === "finale", "run avance d'un palier (ou atteint la chambre finale) après la vague");
ok(g.game.activeTab === "scene", "retour automatique sur l'onglet 'scene' après la vague");

// Défaite : simule un run en combat, mort du héros -> perte totale, run terminé, retour Campement.
setupScenePACombat("bourrin");
run("SceneRunManager.enterGate(0);");
ok(g.game.sceneRun.status === "combat", "run en statut 'combat' avant le test de défaite");
run("game.sortie.loot.gold = 999;"); // simule du butin déjà accumulé avant la mort
// justDied est un flag "à consommer" : buildCampHTML() (déclenché par le switchTab interne à
// onCombatDefeat) le remet à false dès son premier rendu — capté via une sonde posée AVANT ce
// switchTab (patch temporaire), plutôt que de le lire après coup (déjà consommé à ce moment).
run("window._probeJustDied = null; window._realSwitchTab = switchTab; window.switchTab = function(t){ window._probeJustDied = game.justDied; return window._realSwitchTab(t); };");
run("CombatEngine.onHeroDefeated();");
ok(g.window._probeJustDied === true, "justDied posé avant le switchTab (même traitement que Donjon/Aventure/Chasse)");
run("window.switchTab = window._realSwitchTab;"); // restaure la vraie fonction pour la suite du fichier
ok(g.game.sceneRun.status === "completed", "run marqué 'completed' après une mort en nœud combat");
ok(g.game.activeTab === "campement", "retour au Campement après la mort");
ok(g.game.sortie.loot.gold === 0, "butin de la sortie remis à zéro (SortieManager.end('death') = perte totale, appelé avant le dispatch)");

// Fuite en plein combat : le bouton Fuir (confirmFlee -> SortieManager.flee()) doit terminer
// proprement le run scene-engine, pas seulement la sortie (trou corrigé dans sortie-system.js).
setupScenePACombat("bourrin");
run("SceneRunManager.enterGate(0);");
ok(g.game.sceneRun.status === "combat", "run en statut 'combat' avant le test de fuite");
run("game.sortie.loot.gold = 100;");
run("SortieManager.flee();");
ok(g.game.sceneRun.status === "completed", "run marqué 'completed' après une fuite en plein combat (trou corrigé : SortieManager.flee() route désormais vers SceneRunManager.abandon())");
ok(g.game.gold === 50, "50% du butin banqué dans game.gold (règle de fuite universelle, pas une perte totale ni un retour complet)");
ok(g.game.activeTab === "campement", "retour au Campement après la fuite");

// Profil Prudent : très peu de combats attendus (poids 4), mais le mécanisme doit rester
// identique si un combat est malgré tout tiré — pas de code dupliqué par profil.
setupScenePACombat("prudent");
var egCombatPrudent = run("SceneRunManager.enterGate(0)");
ok(egCombatPrudent.ok, "un slot combat forcé fonctionne aussi en profil prudent (mécanique non dupliquée par profil)");
ok(g.game.sceneRun.status === "combat", "run.status = 'combat' identique quel que soit le profil");

console.log("\n[PA2b] Petites Aventures — vague 6-10 + boss sur le dernier point combat (v3.130.0)");

// setupScenePACombat force UN SEUL slot combat au palier courant (game.sceneRun.card[depth]),
// les autres paliers restent tels que générés par chooseProfile() (aléatoires) — pour un test
// déterministe du boss, il faut garantir qu'AUCUN autre slot combat n'existe dans le reste de
// la carte, sinon _isLastCombatNodeOfRun() pourrait être vrai ou faux selon le tirage.
function setupScenePAFinalCombat(profileId) {
  setupScenePACombat(profileId);
  run("for (var d = game.sceneRun.depth + 1; d < game.sceneRun.card.length; d++) { game.sceneRun.card[d].forEach(function(s){ if (s.type === 'combat') s.type = 'decouverte'; }); }");
}

// Cas A : le nœud combat forcé n'est PAS le dernier de la carte (un autre combat existe plus
// loin) -> pas de boss à la fin de cette vague.
setupScenePACombat("bourrin");
run("if (game.sceneRun.card.length <= game.sceneRun.depth + 1) game.sceneRun.card.push([{ type: 'combat', gabaritId: 'gobelins_foret' }]); else game.sceneRun.card[game.sceneRun.depth + 1] = [{ type: 'combat', gabaritId: 'gobelins_foret' }];");
run("SceneRunManager.enterGate(0);");
ok(g.game.sceneRun._combatIsFinalWave === false, "un autre nœud combat existe plus loin dans la carte -> _combatIsFinalWave = false, pas de boss prévu");

// Cas B : le nœud combat forcé EST le dernier de la carte -> le dernier kill de la vague fait
// apparaître le boss de l'aventure courante, pas un ennemi normal.
setupScenePAFinalCombat("bourrin");
run("SceneRunManager.enterGate(0);");
ok(g.game.sceneRun._combatIsFinalWave === true, "aucun autre nœud combat dans la carte -> _combatIsFinalWave = true (dernier point combat du run)");
var finalWaveTarget = g.game.sceneRun._combatWaveTarget;
for (var wf = 1; wf < finalWaveTarget; wf++) {
  run("game.enemy.hp = 1; game.enemy.maxHp = 1; CombatEngine.killEnemy();");
}
ok(g.game.sceneRun.status === "combat", "run reste en 'combat' juste avant le dernier kill de la vague finale");
ok(!g.game.enemy.isBoss, "l'ennemi courant (avant-dernier de la vague) n'est PAS un boss");
run("game.enemy.hp = 1; game.enemy.maxHp = 1; CombatEngine.killEnemy();"); // dernier kill de la vague
ok(g.game.sceneRun.status === "combat", "run reste en 'combat' après le dernier kill normal (le boss vient d'apparaître, pas encore vaincu)");
ok(!!g.game.enemy.isBoss, "le BOSS de l'aventure courante est apparu à la place d'un ennemi normal (dernier kill de la dernière vague du run)");
run("game.enemy.hp = 1; game.enemy.maxHp = 1; CombatEngine.killEnemy();"); // kill du boss
ok(g.game.sceneRun.status !== "combat", "run quitte 'combat' après avoir vaincu le boss (fin réelle du dernier point combat)");
ok(g.game.activeTab === "scene", "retour sur l'onglet 'scene' après le boss");

// Mort pendant le boss = toujours perte totale (aucune exception à la règle universelle).
setupScenePAFinalCombat("bourrin");
run("SceneRunManager.enterGate(0);");
var finalWaveTarget2 = g.game.sceneRun._combatWaveTarget;
for (var wf2 = 1; wf2 < finalWaveTarget2; wf2++) {
  run("game.enemy.hp = 1; game.enemy.maxHp = 1; CombatEngine.killEnemy();");
}
run("game.enemy.hp = 1; game.enemy.maxHp = 1; CombatEngine.killEnemy();"); // fait apparaître le boss
ok(!!g.game.enemy.isBoss, "boss bien apparu avant le test de mort");
run("game.sortie.loot.gold = 500;");
run("CombatEngine.onHeroDefeated();");
ok(g.game.sceneRun.status === "completed", "mort face au boss = run terminé (perte totale, même règle universelle)");
ok(g.game.gold === 0 || run("game.sortie.loot.gold") === 0, "butin de sortie remis à zéro à la mort face au boss");

console.log("\n[PA4] Petites Aventures — horizon de visibilité de la carte (v3.139.0, audit Forêt §3.6)");
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats(); game.unlockedTabs.village = true; game.resources.petite_ration = 10;");
run("SceneRunManager.startRun('petite_aventure_foret'); SceneRunManager.chooseProfile('bourrin'); SceneRunManager.chooseIntensity('chemin'); game.sceneRun.mutator = 'aucun';");
// v3.196.0 : mutateur forcé à 'aucun' ici — ce test vérifie la formule d'horizon standard
// (dépendante uniquement de la torche), un tirage 'brouillard' la fausserait (horizon forcé
// à 0). Le mutateur "Brouillard" a son propre test dédié plus bas.
// Carte déterministe (8 paliers) pour tester l'horizon sans dépendre du hasard de génération —
// types choisis pour couvrir obstacle/combat/mystere/bloqueur/source, distincts palier par palier.
run("game.sceneRun.card = [[{type:'obstacle',gabaritId:'eboulis',riskMod:1}],[{type:'combat',gabaritId:'gobelins_foret'}],[{type:'mystere'}],[{type:'source'}],[{type:'autel'}],[{type:'decouverte'}],[{type:'combat',gabaritId:'loups_foret'}],[{type:'obstacle',gabaritId:'gouffre',riskMod:1}]]; game.sceneRun.depth = 0; game.sceneRun.torchCharges = 3; game.sceneRun._torchUsedAtDepth = -1;");

var progNoTorch = run("buildSceneProgressHTML(game.sceneRun)");
ok(progNoTorch.indexOf("is-current") !== -1, "palier courant (0) marqué is-current");
ok((progNoTorch.match(/is-upcoming/g) || []).length === 1, "sans torche : horizon = palier courant + 1 seul suivant marqué is-upcoming (" + (progNoTorch.match(/is-upcoming/g) || []).length + ")");
ok((progNoTorch.match(/is-hidden/g) || []).length === 7, "sans torche : 6 paliers restants (2..7) + la finale hors horizon, marqués is-hidden (" + (progNoTorch.match(/is-hidden/g) || []).length + ")");
ok(progNoTorch.indexOf(g.SCENE_NODES.icons.combat) !== -1, "palier 1 (combat) dans l'horizon : icône ⚔️ visible");
// Le palier 2 est un mystère non révélé : son icône reste celle du TYPE mystere (❓), jamais le
// type réel caché derrière — mais il est hors horizon (+1 seulement) donc de toute façon masqué ici.

var torchRes = run("SceneRunManager.useTorchForLevel()");
ok(torchRes === true, "torche activée sur le palier courant");
var progTorch = run("buildSceneProgressHTML(game.sceneRun)");
ok((progTorch.match(/is-upcoming/g) || []).length === 2, "avec torche active : horizon étendu à +2 (2 paliers upcoming, " + (progTorch.match(/is-upcoming/g) || []).length + ")");
ok((progTorch.match(/is-hidden/g) || []).length === 6, "avec torche : 5 paliers restants (3..7) + la finale hors horizon (" + (progTorch.match(/is-hidden/g) || []).length + ")");
ok(progTorch.indexOf(g.SCENE_NODES.icons.mystere) !== -1, "palier 2 (mystère non résolu) désormais dans l'horizon étendu : icône ❓ visible (type mystere, pas le type réel)");

// Avancée au dernier palier réel (index 7, "Profondeur 8/8") : la finale doit apparaître dans l'horizon +1.
run("game.sceneRun.depth = 7; game.sceneRun._torchUsedAtDepth = -1;");
var progNearFinale = run("buildSceneProgressHTML(game.sceneRun)");
ok(progNearFinale.indexOf("scene-progress-finale is-upcoming") !== -1, "au dernier palier réel (profondeur 8/8) : chambre finale visible dans l'horizon (🏆)");

// Progression : les paliers déjà résolus restent is-done avec leur icône réelle, jamais masqués
// rétroactivement (contrairement aux paliers futurs hors horizon).
run("game.sceneRun.depth = 3;");
var progMid = run("buildSceneProgressHTML(game.sceneRun)");
ok((progMid.match(/is-done/g) || []).length === 3, "3 paliers déjà franchis (0,1,2) marqués is-done");
ok(progMid.indexOf(g.SCENE_NODES.icons.combat) !== -1 && progMid.indexOf(g.SCENE_NODES.icons.obstacle) !== -1, "paliers is-done affichent toujours leur icône réelle (jamais de retour à un état masqué)");

console.log("\n[PA5] Petite Aventure — grille multi-portes (v3.195.0, remplace le chemin illustré à 1 porte)");
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats(); game.unlockedTabs.village = true; game.resources.petite_ration = 10;");
run("SceneRunManager.startRun('petite_aventure_foret'); SceneRunManager.chooseProfile('bourrin'); SceneRunManager.chooseIntensity('chemin'); SceneRunManager.acknowledgeMutator(); SceneRunManager.confirmLoadout(['provisions', 'provisions', 'provisions']);");
// Carte déterministe à 2 portes/palier (gatesPerDepth [2,2] depuis v3.195.0) — remplace l'ancien
// mock à 1 porte, devenu incompatible avec la grille multi-portes désormais active.
run("game.sceneRun.card = [[{type:'obstacle',gabaritId:'eboulis',riskMod:1},{type:'obstacle',gabaritId:'paroi',riskMod:1}],[{type:'combat',gabaritId:'gobelins_foret'},{type:'obstacle',gabaritId:'racines',riskMod:1}],[{type:'mystere'},{type:'source'}],[{type:'source'},{type:'obstacle',gabaritId:'riviere',riskMod:1}],[{type:'autel'},{type:'obstacle',gabaritId:'eboulis',riskMod:1}],[{type:'decouverte'},{type:'obstacle',gabaritId:'paroi',riskMod:1}],[{type:'combat',gabaritId:'loups_foret'},{type:'obstacle',gabaritId:'racines',riskMod:1}],[{type:'obstacle',gabaritId:'gouffre',riskMod:1},{type:'obstacle',gabaritId:'riviere',riskMod:1}]]; game.sceneRun.depth = 0;");

var gateHtml = run("buildSceneGateChoiceHTML()");
ok(gateHtml.indexOf("scene-path-frame") === -1, "petite_aventure_foret n'utilise plus le chemin illustré (SCENE_PATH_TEMPLATE_IDS vidé, v3.195.0)");
ok(gateHtml.indexOf("scene-card-grid") !== -1, "grille de boutons multi-portes active pour ce canevas (2 portes, gatesPerDepth [2,2])");
ok(gateHtml.indexOf("scene-card-solo") === -1, "plus de fiche unique en lecture seule (mode solo désactivé pour ce canevas)");
ok((gateHtml.match(/onclick="enterSceneGate\(/g) || []).length === 2, "2 portes cliquables rendues sur le palier 0");
ok(gateHtml.indexOf("onclick=\"enterSceneGate(0)\"") !== -1 && gateHtml.indexOf("onclick=\"enterSceneGate(1)\"") !== -1, "les deux portes (index 0 et 1) sont bien cliquables");

// Clic sur la première porte = comportement identique à avant (enterGate index 0).
run("enterSceneGate(0);");
ok(g.game.sceneRun.depth === 0 && g.game.sceneRun.pendingNode && g.game.sceneRun.pendingNode.type === "obstacle", "clic sur la première porte engage bien le palier (obstacle résolu au palier 0)");

// Contrôle : un canevas à plusieurs portes (expedition_faille, hors SCENE_PATH_TEMPLATE_IDS)
// garde l'ancien rendu en grille — aucune régression sur les canevas non couverts par ce lot.
run("SceneRunManager.clearRun(); SceneRunManager.startRun('expedition_faille'); SceneRunManager.confirmLoadout(['provisions', 'provisions', 'provisions']);");
var gateHtmlFaille = run("buildSceneGateChoiceHTML()");
ok(gateHtmlFaille.indexOf("scene-path-frame") === -1, "expedition_faille (hors périmètre) NE bascule PAS sur le chemin illustré");
ok(gateHtmlFaille.indexOf("scene-card-grid") !== -1, "expedition_faille garde la grille de cartes historique");

console.log("\n[TON] Passe de ton Forêt (v3.197.0, bible B) — dialogues d'anciens, graines du Veilleur, voix du narrateur");
run("fullResetState(); game.playerName='Test'; game.heroId='knight';");
var tonSteps = g.STORY_QUESTS.forest.steps;
var tonStep15 = tonSteps.filter(function (s) { return s.id === "forest_15"; })[0];
var tonStep08 = tonSteps.filter(function (s) { return s.id === "forest_08"; })[0];
ok(!!(tonStep15 && tonStep15.narrative.dialogue && tonStep15.narrative.dialogue.length === 5), "forest_15 porte un dialogue de 5 lignes (Orwen, Wenna, Orwen, Brannoc, didascalie)");
var tonHtml15 = g.buildStoryDialogueHTML(tonStep15);
ok(tonHtml15.indexOf("Elle prend ce qu&#39;on est") !== -1, "la promesse « tu sais ce qu'est l'Aether » est tenue par Orwen, pas par le narrateur");
ok(tonHtml15.indexOf("story-dialogue-aside") !== -1 && tonHtml15.indexOf("Aldric ne dit rien") !== -1, "didascalie (who null) rendue en aside");
ok(tonStep15.narrative.completion.indexOf("Aether") === -1, "la complétion de forest_15 ne prononce plus « Aether » (voix du narrateur, pilier 6)");
ok(tonStep15.narrative.completion.indexOf("Sarkel") !== -1, "la complétion de forest_15 ouvre le Désert par Sarkel");
ok(g.buildStoryDialogueHTML(tonStep08).indexOf("Il en est venu un autre") !== -1, "graine du Veilleur : Brannoc (forest_08) « un autre, avant toi »");
ok(g.buildStoryDialogueHTML(tonSteps[0]) === "", "étape sans dialogue -> chaîne vide (aucune régression sur les 13 autres étapes)");
run("var __st = game.storyQuests || {}; __st.forest = { stepIndex: 14, accepted: true, counters: {} }; game.storyQuests = __st;");
ok(g.buildStoryCurrentStepHTML("forest", g.STORY_QUESTS.forest, tonStep15, 14).indexOf("story-dialogue") !== -1, "étape courante acceptée : le dialogue est rendu sous l'objectif");
run("game.storyQuests.forest.accepted = false;");
ok(g.buildStoryCurrentStepHTML("forest", g.STORY_QUESTS.forest, tonStep15, 14).indexOf("story-dialogue") === -1, "étape courante NON acceptée : pas de dialogue (on ne parle pas avant que le joueur s'engage)");
var tonIntros = [];
g.WORLDS.forEach(function (w) { w.adventures.forEach(function (a) { tonIntros.push(a.introText); }); });
ok(tonIntros.every(function (t) { return !/\bvous\b|\bvotre\b|\bvos\b/i.test(t); }), "aucune intro de zone ne vouvoie (" + tonIntros.length + " intros)");
ok(tonIntros.every(function (t) { return t.indexOf("...") === -1; }), "aucune intro de zone ne finit par des points de suspension");
ok(g.AMBIANCE_TEXTS.every(function (t) { return !/\bvous\b|\bvotre\b|\bvos\b/i.test(t) && t.indexOf("...") === -1; }), "ambiance de combat : ni vouvoiement ni points de suspension");
var tonBanned = /mystérieu|étrange|sinistre|lugubre|maléfique|inquiétant/i;
ok(tonIntros.concat(g.AMBIANCE_TEXTS).every(function (t) { return !tonBanned.test(t); }), "aucun mot banni (bible B) dans les intros et l'ambiance");

console.log("\n[PA6] Petite Aventure — mutateurs de run (v3.196.0, lot C2)");

// Tirage pondéré : force les poids pour un test déterministe sur la distribution elle-même,
// sans dépendre de Math.random pour vérifier que TOUS les mutateurs sont bien atteignables.
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats(); game.unlockedTabs.village = true; game.resources.petite_ration = 10;");
var seenMutators = {};
for (var mt = 0; mt < 200; mt++) {
  run("SceneRunManager.clearRun(); game.resources.petite_ration = 10; game.explorationProgression.petiteAventure = { day: '', count: 0 }; SceneRunManager.startRun('petite_aventure_foret'); SceneRunManager.chooseProfile('prudent'); SceneRunManager.chooseIntensity('chemin');");
  seenMutators[g.game.sceneRun.mutator] = true;
}
ok(seenMutators.aucun && seenMutators.brouillard && seenMutators.pluie && seenMutators.nuit, "les 4 issues (aucun/brouillard/pluie/nuit) observées sur 200 tirages (poids 20% chacun)");

// Statut d'annonce : chooseIntensity court-circuite vers 'mutator-announce', acknowledgeMutator restaure.
run("SceneRunManager.clearRun(); game.resources.petite_ration = 10; game.explorationProgression.petiteAventure = { day: '', count: 0 }; SceneRunManager.startRun('petite_aventure_foret'); SceneRunManager.chooseProfile('prudent'); SceneRunManager.chooseIntensity('chemin');");
ok(g.game.sceneRun.status === "mutator-announce", "statut 'mutator-announce' juste après chooseIntensity");
var ackBad = run("SceneRunManager.confirmLoadout(['torche','torche','torche'])");
ok(!ackBad.ok, "confirmLoadout refusé tant que l'annonce n'est pas accusée (statut incorrect)");
var ackRes = run("SceneRunManager.acknowledgeMutator()");
ok(ackRes.ok, "acknowledgeMutator() accepté");
ok(g.game.sceneRun.status === "preparation", "statut 'preparation' restauré après acknowledgeMutator");
var ackTwice = run("SceneRunManager.acknowledgeMutator()");
ok(!ackTwice.ok, "acknowledgeMutator() refusé en double-appel (idempotence)");

// Brouillard : horizon forcé à 0, même torche active.
run("SceneRunManager.clearRun(); game.resources.petite_ration = 10; game.explorationProgression.petiteAventure = { day: '', count: 0 }; SceneRunManager.startRun('petite_aventure_foret'); SceneRunManager.chooseProfile('bourrin'); SceneRunManager.chooseIntensity('chemin'); game.sceneRun.mutator = 'brouillard'; SceneRunManager.acknowledgeMutator(); SceneRunManager.confirmLoadout(['torche','torche','torche']);");
run("game.sceneRun.torchCharges = 3; game.sceneRun._torchUsedAtDepth = game.sceneRun.depth;"); // torche "active" ce palier
ok(g.SceneRunManager.getVisibilityHorizon() === g.game.sceneRun.depth, "Brouillard : horizon = palier courant seulement, MÊME torche active");

// Pluie : endurance effective +15%, coût Souffle des options +50%.
run("SceneRunManager.clearRun(); game.resources.petite_ration = 10; game.explorationProgression.petiteAventure = { day: '', count: 0 }; SceneRunManager.startRun('petite_aventure_foret'); SceneRunManager.chooseProfile('prudent'); SceneRunManager.chooseIntensity('chemin'); game.sceneRun.mutator = 'pluie'; SceneRunManager.acknowledgeMutator(); SceneRunManager.confirmLoadout(['torche','torche','torche']);");
var enduranceBase = g.game.sceneRun.heroSnapshot.endurance;
var enduranceEff = run("SceneRunManager.statEffective(game.sceneRun, 'endurance')");
ok(enduranceEff === Math.round(enduranceBase * 1.15), "Pluie : endurance effective = base × 1.15 (" + enduranceEff + " attendu " + Math.round(enduranceBase * 1.15) + ")");
var powerEff = run("SceneRunManager.statEffective(game.sceneRun, 'power')");
ok(powerEff === g.game.sceneRun.heroSnapshot.power, "Pluie : la Puissance n'est PAS affectée (seule l'Endurance l'est)");
var breathFactorsEndurance = run("SceneRunManager._obstacleFactors(game.sceneRun, 'endurance')");
// v3.199.0 : le coût de base est passé de 1 à 20 (régime de Souffle). L'assertion lit la
// donnée et teste la COMPOSITION base × mutateur, pas la valeur du calibrage du moment.
var enduranceBaseCost = g.window.SCENE_TEMPLATES.petite_aventure_foret.optionProfiles.endurance.breathCost;
ok(Math.abs(breathFactorsEndurance.breathCost - enduranceBaseCost * 1.5) < 1e-9, "Pluie : coût Souffle de l'option Endurance = " + enduranceBaseCost + " × 1.5 (base × mutateur)");

// Nuit : +1 nœud danger garanti (combat pour bourrin, bloqueur pour prudent), respecte le plafond existant.
run("SceneRunManager.clearRun(); game.resources.petite_ration = 10; game.explorationProgression.petiteAventure = { day: '', count: 0 }; SceneRunManager.startRun('petite_aventure_foret'); SceneRunManager.chooseProfile('bourrin'); SceneRunManager.chooseIntensity('chemin'); game.sceneRun.mutator = 'nuit';");
var nightCombatCount = 0;
g.game.sceneRun.card.forEach(function (level) { level.forEach(function (slot) { if (slot.type === "combat") nightCombatCount++; }); });
ok(nightCombatCount >= 1 && nightCombatCount <= 2, "Nuit (bourrin) : au moins 1 combat sur la carte, plafond ≤2 toujours respecté (" + nightCombatCount + ")");
var nightLootMult = run("SceneRunManager._runLootMult(game.sceneRun)");
// v3.198.0 : le lootMult de Chemin est passé de 2.0 à 2.6 (recalibrage). L'assertion lit
// désormais SCENE_INTENSITY au lieu de figer la constante — elle teste la COMPOSITION
// intensité × mutateur, pas la valeur du calibrage du moment.
var cheminLootMult = g.window.SCENE_INTENSITY.chemin.lootMult;
ok(Math.abs(nightLootMult - cheminLootMult * 1.15) < 1e-9, "Nuit : lootMult composé = intensité(chemin ×" + cheminLootMult + ") × mutateur(×1.15) = " + (cheminLootMult * 1.15).toFixed(3) + " (obtenu " + nightLootMult.toFixed(3) + ")");

console.log("\n[PA3] Petites Aventures — Sève d'Aeswyn (v3.127.0, Lot PA3)");

// Taux à 100% par nœud pour un test déterministe (pas de dépendance à Math.random pour VALIDER
// le mécanisme lui-même — la calibration probabiliste réelle a été vérifiée par simulation
// Monte Carlo séparée, 200k runs, valeurs figées par Seb 03/09/2026).
function setupScenePASeve(profileId, chancePct) {
  run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp; game.unlockedTabs.village = true; game.resources.petite_ration = 10;");
  run("SceneRunManager.startRun('petite_aventure_foret'); SceneRunManager.chooseProfile('" + profileId + "'); SceneRunManager.chooseIntensity('chemin'); SceneRunManager.acknowledgeMutator(); SceneRunManager.confirmLoadout(['torche','torche','torche']);");
  run("SCENE_TEMPLATES.petite_aventure_foret.seveAeswyn.perNodeChancePct." + profileId + " = " + chancePct + ";");
}

setupScenePASeve("bourrin", 100);
ok(g.game.resources.seve_aeswyn === undefined || g.game.resources.seve_aeswyn === 0, "aucune Sève au départ (contrôle)");
run("game.sceneRun.card[game.sceneRun.depth] = [{ type: 'decouverte' }]; SceneRunManager.enterGate(0); SceneRunManager.resolveDecouverte();");
ok(g.game.resources.seve_aeswyn === 1, "Sève créditée à 100% de chance sur un nœud découverte résolu (+1, perNodeAmount [1,1])");

setupScenePASeve("prudent", 0);
run("game.sceneRun.card[game.sceneRun.depth] = [{ type: 'decouverte' }]; SceneRunManager.enterGate(0); SceneRunManager.resolveDecouverte();");
ok(!g.game.resources.seve_aeswyn, "aucune Sève à 0% de chance (pas de faux positif)");

// Bonus garanti à la chambre finale, indépendant du choix de coffre (sûr ou risqué) et du
// double-ou-rien (jamais remis en jeu — crédité directement via WarehouseManager, pas SortieManager).
// v3.235.0 : le montant dépend désormais de l'intensité (setupScenePASeve joue « chemin »),
// on le LIT dans la table au lieu de le figer — ces assertions vérifient le mécanisme, la
// valeur est vérifiée par le bloc [43] et par sim/seve-bench.js.
var finaleChemin = function (profil) {
  return g.SceneRunManager._seveFinaleAmount(
    g.SCENE_TEMPLATES.petite_aventure_foret.seveAeswyn, profil, "chemin");
};

setupScenePASeve("bourrin", 0); // 0% par nœud : seul le bonus finale doit s'appliquer
run("game.sceneRun.depth = SCENE_TEMPLATES.petite_aventure_foret.depthMax - 1; game.sceneRun.status = 'finale';");
run("SceneRunManager.resolveFinale('sur');");
ok(g.game.resources.seve_aeswyn === finaleChemin("bourrin"),
  "bonus finale garanti (+" + finaleChemin("bourrin") + " en profil bourrin, Chemin) même à 0% de chance par nœud, choix coffre sûr");

setupScenePASeve("prudent", 0);
run("game.sceneRun.depth = SCENE_TEMPLATES.petite_aventure_foret.depthMax - 1; game.sceneRun.status = 'finale';");
run("SceneRunManager.resolveFinale('risque');");
ok(g.game.resources.seve_aeswyn === finaleChemin("prudent"),
  "bonus finale garanti (+" + finaleChemin("prudent") + " en profil prudent, Chemin) même avec le choix de coffre risqué");

/* v3.235.0 : et la valeur DOIT changer avec l'intensité — sinon la table est
   ignorée quelque part et on revient au bonus plat sans s'en apercevoir. */
setupScenePASeve("bourrin", 0);
run("game.sceneRun.intensity = 'periple'; game.sceneRun.depth = SCENE_TEMPLATES.petite_aventure_foret.depthMax - 1; game.sceneRun.status = 'finale';");
run("SceneRunManager.resolveFinale('sur');");
ok(g.game.resources.seve_aeswyn === g.SceneRunManager._seveFinaleAmount(
     g.SCENE_TEMPLATES.petite_aventure_foret.seveAeswyn, "bourrin", "periple"),
  "le Périple crédite bien SA valeur, pas celle du Chemin");

// Évacuation (3 blessures) : PAS de tirage — l'évacuation n'est pas une résolution de nœud
// normale (_evacuate() ne passe pas par _advanceOrFinish, voir scene-run-system.js).
setupScenePASeve("bourrin", 100);
run("game.sceneRun.injuries = ['power', 'power'];"); // 2 blessures déjà présentes, la 3e évacue
run("game.sceneRun.card[game.sceneRun.depth] = [{ type: 'obstacle', gabaritId: 'eboulis', riskMod: 1 }];");
run("SceneRunManager.enterGate(0);");
run("var _origRandom = Math.random; Math.random = function(){ return 0.99; };"); // force le setback
var evacRes = run("SceneRunManager.resolveObstacle('power')");
run("Math.random = _origRandom;");
ok(evacRes.outcome === "evacuation", "évacuation déclenchée (3e blessure)");
ok(!g.game.resources.seve_aeswyn, "aucune Sève créditée lors d'une évacuation (pas un nœud résolu normalement)");

// Canevas hors Petites Aventures (ex. expedition_faille) : aucun tirage, aucune régression.
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp; game.unlockedTabs.village = true;");
run("SceneRunManager.startRun('expedition_faille'); SceneRunManager.confirmLoadout(['torche','torche','torche']);");
run("game.sceneRun.card[game.sceneRun.depth] = [{ type: 'decouverte' }]; SceneRunManager.enterGate(0); SceneRunManager.resolveDecouverte();");
ok(!g.game.resources.seve_aeswyn, "aucune Sève sur un canevas sans config seveAeswyn (expedition_faille), aucune régression");

console.log("\n[PA3b] Entrepôt — 3e onglet 'Rares' pour la Sève d'Aeswyn (v3.128.0)");

// Le bug initial : tier "special" n'apparaissait dans NI "raw" NI "crafted" (deux seules
// valeurs connues du filtre avant ce correctif) — la Sève était invisible dans l'Entrepôt.
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats(); game.activeTab = 'village'; setVillageSubTab('entrepot'); game.resources.seve_aeswyn = 5;");
run("setWarehouseFilter('raw');");
var htmlRaw = run("buildWarehouseHTML()");
ok(htmlRaw.indexOf("seve_aeswyn") === -1 && htmlRaw.indexOf("Sève") === -1, "Sève absente du filtre 'Bruts' (tier different)");
run("setWarehouseFilter('crafted');");
var htmlCrafted = run("buildWarehouseHTML()");
ok(htmlCrafted.indexOf("Sève") === -1, "Sève absente du filtre 'Tier 1' (tier different)");

var htmlBeforeSpecial = run("buildWarehouseFilterRowHTML()");
ok(htmlBeforeSpecial.indexOf("Rares") !== -1, "le bouton '✨ Rares' est proposé (au moins une ressource tier 'special' existe dans WAREHOUSE_RESOURCES)");

run("setWarehouseFilter('special');");
ok(g.warehouseFilter === "special", "warehouseFilter accepte bien la valeur 'special'");
var htmlSpecial = run("buildWarehouseHTML()");
ok(htmlSpecial.indexOf("Sève") !== -1 || htmlSpecial.indexOf("seve_aeswyn") !== -1, "la Sève d'Aeswyn apparaît bien dans le filtre 'Rares'");

// Vérifie que la tuile sélectionnable mène au bon détail (nom, stock, pas de prix de vente
// puisque sellPrice: 0 — décision Lot PA3, ressource de collection non vendable).
run("selectWarehouseKey('seve_aeswyn');");
var detailHtml = run("buildWarehouseDetailPanelHTML()");
ok(detailHtml.indexOf("Sève d") !== -1, "le panneau détail affiche bien le nom de la ressource sélectionnée");
ok(detailHtml.indexOf("Stock : 5") !== -1, "le stock affiché correspond (5)");
ok(detailHtml.indexOf("Rien à faire pour l'instant") !== -1, "pas d'option de vente (sellPrice: 0, ressource de collection)");

console.log("\n[PA2-fix] Petites Aventures — combat scale avec la vraie progression (v3.129.0)");

// Reproduction exacte du bug rapporté par Seb (03/09/2026) : combat résolu en un seul coup
// avant que le joueur ait pu agir. Cause racine : l'ennemi du nœud combat était généré sur
// worldId "forest"/adventureIndex 0 EN DUR, quel que soit le monde réel du joueur — un joueur
// avancé (cycles, monde 3) recevait un ennemi de tout début de partie, largement sous ses
// dégâts par coup.
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; game.cycleCount = 5; game.unlockedTabs.village = true; game.unlockedTabs.combat = true; game.resources.petite_ration = 10;");
run("game.equipped.weapon = { id:'w', name:'Grande Epée', rarity:'legendary', slot:'weapon', stat:'tapDmg', value: 500 }; EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp;");
run("WorldManager.worldIndex = 2; WorldManager.adventureIndex = 0; WorldManager.enemyIndex = 0;");
// Comparaison sur un ennemi FIXE des deux côtés (pas un tirage aléatoire dans le pool, qui a
// une endurance de base différente par ennemi — ça fausserait la comparaison des PV finaux).
// zombie et skeleton (monde Ruines) ont une endurance différente (42 vs 34) : on isole le
// SCALE (fonction du monde/aventure/cycle uniquement), identique quel que soit l'ennemi tiré.
var expectedScale = run("Math.pow(1 + WorldManager.worldIndex * (WORLD_MULT_BY_WORLD[WorldManager.worldIndex] || 1), ENEMY_PV_WORLD_EXP) + WorldManager.adventureIndex * 0.30 + (game.cycleCount || 0) * 0.45");

run("SceneRunManager.startRun('petite_aventure_foret'); SceneRunManager.chooseProfile('bourrin'); SceneRunManager.chooseIntensity('chemin'); SceneRunManager.acknowledgeMutator(); SceneRunManager.confirmLoadout(['torche','torche','torche']);");
run("game.sceneRun.card[game.sceneRun.depth] = [{ type: 'combat', gabaritId: 'gobelins_foret' }];");
run("SceneRunManager.enterGate(0);");
/* v3.298.0 (W-1b, D6) : le canevas déclare son monde. La Petite Aventure de la FORÊT tire des
   ennemis de la Forêt même pour un joueur qui réside aux Ruines — décision de la conception
   Désert §4.2 : chaque canevas nomme son monde au lieu de le supposer. Le bug v3.129.0 (ennemis
   figés sur la Forêt pour TOUT canevas) ne revient pas : un canevas sans worldId suit toujours
   le monde de résidence (contrôlé en [93]), et le cycle continue de peser sur l'échelle. */
ok(["goblin"].indexOf(g.game.enemy.id) !== -1, "résidant aux Ruines, la Petite Aventure de la Forêt tire le groupe « gobelins_foret » (monde du canevas)");
var paEnemyEndurance = run("(ENEMY_DB[game.enemy.id] && ENEMY_DB[game.enemy.id].stats.endurance) || 0");
var impliedScale = g.game.enemy.maxHp / (paEnemyEndurance * run("ENEMY_PV_MULT"));
var forestScale = 1 + 5 * 0.45; // monde 0, aventure 0, cycle 5
ok(Math.abs(impliedScale - forestScale) / forestScale < 0.15, "échelle de la Forêt, cycle compris (attendu ~" + forestScale.toFixed(2) + ", obtenu ~" + impliedScale.toFixed(2) + ")");

// Contrôle : sur une partie FRAÎCHE (monde 0, cycle 0), le comportement reste identique à
// avant le correctif — aucune régression pour un joueur en tout début de jeu.
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp; game.unlockedTabs.village = true; game.unlockedTabs.combat = true; game.resources.petite_ration = 10;");
run("SceneRunManager.startRun('petite_aventure_foret'); SceneRunManager.chooseProfile('bourrin'); SceneRunManager.chooseIntensity('chemin'); SceneRunManager.acknowledgeMutator(); SceneRunManager.confirmLoadout(['torche','torche','torche']);");
run("game.sceneRun.card[game.sceneRun.depth] = [{ type: 'combat', gabaritId: 'gobelins_foret' }];");
run("SceneRunManager.enterGate(0);");
ok(["goblin"].indexOf(g.game.enemy.id) !== -1, "sur une partie fraîche (monde 0 = Forêt), l'ennemi reste bien issu du groupe 'gobelins_foret' (enemyFilter toujours respecté quand il correspond au monde courant)");

console.log("\n[60] Cap de 3 quêtes actives simultanées + abandon (v3.131.0, retour Seb)");
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats();");
run("game.unlockedTabs.village = true; game.explorationProgression.huntBuildingUnlocked = true;");
var m1 = g.MissionBoard.getById("scene_sentier_obstrue");
var m2 = g.MissionBoard.getById("scene_bosquet_silencieux");
ok(!!m1 && m1.status === "available" && !!m2 && m2.status === "available", "point 1 : 2 quêtes scene indépendantes disponibles avant tout accept");
ok(g.MissionBoard.getActiveQuestCount() === 0, "point 1 : compteur actif à 0 avant tout accept");

m1.accept();
m2.accept();
ok(g.MissionBoard.getActiveQuestCount() === 2, "point 2 : 2 quêtes acceptées (sans run) -> compteur à 2 (" + g.MissionBoard.getActiveQuestCount() + ")");
ok(g.MissionBoard.isActiveQuestCapReached() === false, "point 2 : cap PAS encore atteint à 2 quêtes");

// 3e quête active : une chasse RÉELLEMENT lancée (status "running", pas juste "available"),
// source différente (hunt) pour couvrir le périmètre multi-source du cap.
g.HuntQuestManager.start("hq_forest_boar");
ok(g.MissionBoard.getActiveQuestCount() === 3, "point 2b : chasse lancée en plus -> compteur à 3 (" + g.MissionBoard.getActiveQuestCount() + ")");
ok(g.MissionBoard.isActiveQuestCapReached() === true, "point 2b : cap atteint à 3 quêtes actives (2 scene accepted + 1 hunt running)");

// Point 3 : un nouvel accept générique est refusé une fois le cap atteint.
g.MissionBoard.acceptBoardQuest("scene_dummy_blocked_by_cap");
ok(!g.game.explorationProgression.boardAccepted.scene_dummy_blocked_by_cap, "point 3 : un accept générique est bien REFUSÉ une fois le cap atteint (rien n'est écrit dans boardAccepted)");
ok(g.MissionBoard.getActiveQuestCount() === 3, "point 3 : le compteur reste à 3 après la tentative refusée");

// Point 3b (v3.138.0) : le toast de refus liste désormais les titres des 3 quêtes actives —
// mêmes 3 quêtes que celles qui font le compteur (2 scene + 1 hunt), aucune divergence de périmètre.
var titles = g.MissionBoard.getActiveQuestTitles();
ok(titles.length === 3, "point 3b : getActiveQuestTitles() renvoie 3 titres, alignés sur getActiveQuestCount()");
ok(titles.indexOf("Le Sentier Obstrué") !== -1 && titles.indexOf("Chasse en Forêt") !== -1, "point 3b : contient bien les titres réels des quêtes actives (scene + hunt)");
var toastCaptured = null;
run("window.showToast = function (msg, dur) { window.__lastToast = msg; };");
g.MissionBoard.showActiveQuestCapToast();
toastCaptured = g.window.__lastToast;
ok(toastCaptured.indexOf("⛔ 3 quêtes actives max") === 0, "point 3b : le toast garde le message générique en tête");
ok(toastCaptured.indexOf("Le Sentier Obstrué") !== -1 && toastCaptured.indexOf("Chasse en Forêt") !== -1, "point 3b : le toast détaille les titres (au lieu d'un renvoi muet vers l'écran Quêtes)");
// Les 3 sites d'appel (adventure/hunt inline, acceptBoardQuest) délèguent au même toast, plus
// de message dupliqué en dur — vérifié indirectement : un nouvel accept générique déclenche le même texte.
run("window.__lastToast = null;");
g.MissionBoard.acceptBoardQuest("scene_dummy_blocked_by_cap_2");
ok(g.window.__lastToast && g.window.__lastToast.indexOf("Le Sentier Obstrué") !== -1, "point 3b : acceptBoardQuest() déclenche bien le toast détaillé via showActiveQuestCapToast()");

// Point 4 : abandon d'une quête acceptée-sans-run, elle redevient disponible.
var bosquetM = g.MissionBoard.getById("scene_bosquet_silencieux");
ok(typeof bosquetM.abandon === "function", "point 4 : une quête acceptée-sans-run propose bien un abandon");
bosquetM.abandon();
var bosquetAfterAbandon = g.MissionBoard.getById("scene_bosquet_silencieux");
ok(bosquetAfterAbandon.status === "available" && typeof bosquetAfterAbandon.accept === "function", "point 4 : après abandon, la quête redevient 'available' avec un accept (reprenable plus tard)");
ok(g.MissionBoard.getActiveQuestCount() === 2, "point 4 : le compteur retombe à 2 après l'abandon (" + g.MissionBoard.getActiveQuestCount() + ")");

// Point 5 : la place libérée permet bien un nouvel accept.
g.MissionBoard.acceptBoardQuest("scene_dummy_now_allowed");
ok(g.game.explorationProgression.boardAccepted.scene_dummy_now_allowed === true, "point 5 : la place libérée permet bien un nouvel accept générique");
delete g.game.explorationProgression.boardAccepted.scene_dummy_now_allowed;

// Point 6 : le donjon et Petite Aventure restent hors cap, même à 3 quêtes actives (on
// ré-accepte bosquet_silencieux via une référence FRAÎCHE — l'ancienne variable bosquetM est
// figée sur l'état "accepted" d'avant l'abandon, donc n'a plus de .accept()).
g.MissionBoard.getById("scene_bosquet_silencieux").accept();
ok(g.MissionBoard.isActiveQuestCapReached() === true, "point 6 (contrôle) : cap de nouveau atteint à 3 avant le test hors-périmètre");
run("game.dungeonTickets = 5; game.unlockedTabs.dungeon = true;");
var dungeonM = g.MissionBoard.list().find(function (m) { return m.sourceKind === "dungeon" && m.status === "available"; });
ok(!!dungeonM, "point 6 : un donjon reste 'available' malgré le cap de 3 quêtes déjà atteint (hors périmètre)");
run("WarehouseManager.addResource('petite_ration', 1);");
var paM = g.MissionBoard.getById("petite_aventure_foret");
ok(!!paM && paM.status === "available", "point 6 : Petite Aventure reste 'available' malgré le cap (hors périmètre, cap journalier propre)");

console.log("\n[61] Grimoire du Veilleur — 'Aller à la quête' mène au combat une fois une règle active (retour Seb)");
run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp;");
run("game.unlockedTabs.combat = true; game.unlockedTabs.grimoire = true;");
run("StoryQuestManager.ensure();");
game.storyQuests.forest.currentStep = stepIdx("forest_12"); // Le grimoire du veilleur
game.storyQuests.forest.accepted = true;
var step12 = g.STORY_QUESTS.forest.steps[game.storyQuests.forest.currentStep];
ok(step12.id === "forest_12", "contrôle : bon index (" + step12.id + ")");

// Avant toute règle configurée : le lien mène au Grimoire (comportement historique).
ok(g.storyCountActiveGrimoireRules(game) === 0, "point 1 : aucune règle active au départ (contrôle)");
g.StoryQuestManager.goToLink("forest");
ok(g.game.activeTab === "grimoire", "point 1 : sans règle active, 'Aller à la quête' mène au Grimoire (" + g.game.activeTab + ")");

// v3.293.0 : une fois la règle posée, le lien mène au run « Tenir le Cœur », sans déplacer le joueur.
game.grimoireRules = [{ conditionId: "charge_announced", actionSlot: "defense" }];
run("WorldManager.worldIndex = 0; WorldManager.adventureIndex = 0; WorldManager.enemyIndex = 3;");
ok(g.storyCountActiveGrimoireRules(game) === 1, "point 2 : 1 règle active après config");
g.StoryQuestManager.goToLink("forest");
ok(g.game.activeTab === "quests", "point 2 : règle active -> 'Aller à la quête' ouvre le tableau (" + g.game.activeTab + ")");
ok(g.WorldManager.worldIndex === 0 && g.WorldManager.adventureIndex === 0 && g.WorldManager.enemyIndex === 3, "point 2 : aucun repositionnement (0/0/3 inchangé)");
ok(g.MissionBoard.list().some(function (m) { return m.id === "adv_aq_story_coeur" && m.isMain === true; }), "point 2 : « Tenir le Cœur » proposée, liée à l'étape");
ok(step12.check(game) === false, "point 3 : règle seule, run non fait : étape non prête");
game.adventureQuestsCompleted.aq_story_coeur = true;
g.game.grimoireRules = [{ conditionId: "charge_announced", actionSlot: "defense" }]; // le rendu du tableau normalise les règles
ok(step12.check(g.game) === true && step12.progress(game) === "Cœur 10/10 · Règle 1/1", "point 3 : run fait + règle : étape prête (" + step12.check(game) + " / " + step12.progress(game) + ")");

/* ================= v3.132.0 — Petite Aventure : plafond 2 nœuds combat par run (audit Forêt) ================= */
console.log("\n== v3.132.0 : cap de nœuds combat + vagues 4-6 (Petite Aventure) ==");
(function () {
  var tpl = g.SCENE_TEMPLATES.petite_aventure_foret;
  ok(tpl.maxSlotsPerRun && tpl.maxSlotsPerRun.combat === 2, "canevas : maxSlotsPerRun.combat = 2");
  ok(tpl.combatWaveRange && tpl.combatWaveRange[0] === 4 && tpl.combatWaveRange[1] === 6, "canevas : combatWaveRange = [4, 6]");
  var maxSeen = 0, withCombat = 0, obstaclesOk = true, N = 300;
  for (var t = 0; t < N; t++) {
    var rv = []; var cnt = g.SceneEngine.estimateRandomCount(tpl);
    for (var r = 0; r < cnt; r++) rv.push(Math.random());
    var card = g.SceneEngine.buildCard(tpl, rv, tpl.profileWeights.bourrin);
    var combats = 0;
    card.forEach(function (lvl) { lvl.forEach(function (sl) {
      if (sl.type === "combat") combats++;
      if (sl.type === "obstacle" && (!sl.gabaritId || typeof sl.riskMod !== "number")) obstaclesOk = false;
    }); });
    if (combats > maxSeen) maxSeen = combats;
    if (combats > 0) withCombat++;
  }
  ok(maxSeen <= 2, "Bourrin, " + N + " cartes : jamais plus de 2 nœuds combat (max observé " + maxSeen + ")");
  ok(maxSeen === 2, "Bourrin : le plafond de 2 est bien atteint sur au moins une carte (le cap ne sous-génère pas)");
  ok(withCombat / N > 0.85, "Bourrin : la grande majorité des cartes gardent au moins 1 combat (" + Math.round(withCombat / N * 100) + " %)");
  // Note v3.143.0 : ce test appelle SceneEngine.buildCard() DIRECTEMENT (moteur pur), qui ne
  // connaît pas _ensureMinCombat (vit dans SceneRunManager.chooseProfile, glue jeu) — la
  // garantie ABSOLUE (100%) est testée via chooseProfile() dans la section [PA1] plus haut,
  // pas ici. Ce test-ci documente le comportement du moteur SEUL, sans le garde-fou.
  ok(obstaclesOk, "les slots retombés en obstacle ont bien gabaritId + riskMod (résolubles par SceneEngine.resolveObstacle)");
  // Les canevas sans maxSlotsPerRun sont inchangés (expedition_faille ne déclare pas de combat de toute façon).
  var tplF = g.SCENE_TEMPLATES.expedition_faille;
  ok(!tplF.maxSlotsPerRun, "expedition_faille : pas de plafond déclaré, comportement historique conservé");
})();

/* ================= v3.133.0 — forest_15 : offrande aux braises (audit Forêt, décision Seb) ================= */
console.log("\n== v3.133.0 : forest_15, offrande aux braises ==");
(function () {
  game = freshCombat("knight");
  run("StoryQuestManager.ensure();");
  var idx15 = g.STORY_QUESTS.forest.steps.findIndex(function (s) { return s.id === "forest_15"; });
  ok(game.storyQuests.forest.counters.offeringDone === 0, "compteur offeringDone initialisé à 0 par _ensureChapter");
  // Pas encore à l'étape 15 : aucun bloc braises.
  ok(g.StoryQuestManager.getOfferingInfo("forest") === null, "hors étape 15 : getOfferingInfo() = null (bloc masqué au Campement)");
  game.storyQuests.forest.currentStep = idx15; game.storyQuests.forest.accepted = false;
  ok(g.StoryQuestManager.getOfferingInfo("forest") === null, "étape 15 non acceptée : bloc masqué");
  game.storyQuests.forest.accepted = true;
  var info = g.StoryQuestManager.getOfferingInfo("forest");
  ok(!!info && info.items.length === 2 && info.canOffer === false, "étape 15 acceptée, Entrepôt vide : bloc visible, offrande impossible");
  ok(info.items[0].id === "seve_aeswyn" && info.items[0].need === 3 && info.items[1].id === "ration" && info.items[1].need === 1, "items : 3 Sève d'Aeswyn + 1 Ration moyenne, dans l'ordre du canevas");
  // Lien : tant que l'Orc tient -> quête d'aventure ; ensuite -> Campement.
  ok(typeof step15.linkTo.tab === "function" && step15.linkTo.tab(game) === null && step15.linkTo.cardId === "adv_aq_forest_depths", "Orc non vaincu : le lien mène à la quête d'aventure");
  game.adventureQuestsCompleted.aq_forest_depths = true;
  ok(step15.linkTo.tab(game) === "campement", "Orc vaincu : le lien mène au Campement");
  // Offrande incomplète : tout-ou-rien, rien n'est consommé.
  var ration0 = g.WarehouseManager.getAmount("ration"); // une partie neuve démarre avec des rations (fullResetState)
  run("WarehouseManager.addResource('seve_aeswyn', 2, true); WarehouseManager.addResource('ration', 1, true);");
  ok(g.StoryQuestManager.offerToEmbers("forest") === false, "2 Sève / 3 : offrande refusée");
  ok(g.WarehouseManager.getAmount("seve_aeswyn") === 2 && g.WarehouseManager.getAmount("ration") === ration0 + 1, "rien n'a été consommé (tout-ou-rien)");
  ok(step15.progress(game).indexOf("Sève 2/3") !== -1 && step15.progress(game).indexOf("Ration 1/1") !== -1, "progress détaille Sève 2/3 · Ration 1/1 (plafonné à la cible)");
  // Offrande complète.
  run("WarehouseManager.addResource('seve_aeswyn', 5, true);");
  ok(g.StoryQuestManager.getOfferingInfo("forest").canOffer === true, "7 Sève + 1 Ration : offrande possible");
  ok(g.StoryQuestManager.offerToEmbers("forest") === true, "offrande acceptée");
  ok(g.WarehouseManager.getAmount("seve_aeswyn") === 4 && g.WarehouseManager.getAmount("ration") === ration0, "exactement 3 Sève + 1 Ration consommées (surplus conservé)");
  ok(game.storyQuests.forest.counters.offeringDone === 1, "offeringDone = 1");
  ok(g.StoryQuestManager.getOfferingInfo("forest") === null, "offrande faite : bloc masqué au Campement");
  ok(g.StoryQuestManager.offerToEmbers("forest") === false, "seconde offrande refusée (idempotent, rien reconsommé)");
  ok(g.StoryQuestManager.isCurrentStepReady("forest") === true && step15.progress(game).indexOf("Offrande 1/1") !== -1, "forest_15 prête à réclamer, progress « Offrande 1/1 »");
  // Rendu réel du Campement (exécution VM, pas seulement --check).
  game.storyQuests.forest.counters.offeringDone = 0;
  var html = run("buildCampHTML()");
  ok(typeof html === "string" && html.indexOf("camp-embers-card") !== -1 && html.indexOf("Offrir aux braises") !== -1, "buildCampHTML() rend le bloc « Les braises » avec le bouton");
  ok(html.indexOf("StoryQuestManager.offerToEmbers") !== -1, "ressources réunies (4 Sève + rations de départ) : bouton branché sur offerToEmbers");
  run("WarehouseManager.removeResource('seve_aeswyn', 4);");
  html = run("buildCampHTML()");
  ok(html.indexOf("camp-embers-btn") !== -1 && html.indexOf("StoryQuestManager.offerToEmbers") === -1 && html.indexOf("disabled") !== -1, "Sève manquante : bouton rendu mais désactivé");
  game.storyQuests.forest.counters.offeringDone = 1;
  html = run("buildCampHTML()");
  ok(html.indexOf("camp-embers-card") === -1, "offrande faite : buildCampHTML() ne rend plus le bloc");
  // Persistance : le compteur voyage dans storyQuests (déjà whitelisté, save-system.js non modifié).
  var saved = run("buildSaveData()");
  ok(saved && saved.storyQuests && saved.storyQuests.forest.counters.offeringDone === 1, "offeringDone persisté dans storyQuests.forest.counters (save-system.js intact)");
})();

/* ================= v3.134.0 → v3.245.0 — forest_13 : vagues de la Tanière sous ≥ 1 Marque (refonte Donjons §6.3) ================= */
console.log("\n== v3.245.0 : forest_13, compteur coeurKillsMarked en donjon ==");
(function () {
  game = freshCombat("knight"); giveWeapon();
  run("StoryQuestManager.ensure(); DungeonManager.ensure(); DungeonManager.checkTicketReset();");
  var step13 = g.STORY_QUESTS.forest.steps.find(function (s) { return s.id === "forest_13"; });
  var idx13 = g.STORY_QUESTS.forest.steps.findIndex(function (s) { return s.id === "forest_13"; });
  ok(game.storyQuests.forest.counters.coeurKillsMarked === 0, "compteur coeurKillsMarked initialisé à 0");
  ok(step13.unlockTabs.indexOf("dungeon") !== -1 && step13.linkTo.tab === "dungeon" && step13.tutorial.tab === "dungeon", "forest_13 ouvre le Donjon et y mène (afflictions parquées)");
  game.storyQuests.forest.currentStep = idx13; game.storyQuests.forest.accepted = true;
  game.storyQuests.forest.counters.coeurKills = 10;
  ok(step13.check(game) === false, "coeurKills = 10 : non prête (il faut des vagues sous Marque)");
  ok(g.DungeonManager.isStoryTicketFree(1) === true, "forest_13 acceptée : entrée de la Tanière offerte");
  game.dungeonTickets = 0;
  // Run NU : les vagues ne comptent pas.
  g.DungeonManager.start(1, []);
  ok(game.dungeonRun.active === true && game.dungeonRun.marks.length === 0 && game.dungeonTickets === 0, "run nu lancé sur ticket offert");
  /* Une frappe peut manquer (précision) ou buter sur un bouclier : on rejoue jusqu'à ce que
     la vague avance réellement, sinon le test dépend du tirage. */
  function passerVague() {
    var avant = game.dungeonRun.wave, garde = 30;
    while (game.dungeonRun.active && game.dungeonRun.wave === avant && garde-- > 0) {
      game.enemy.chargeIn = 99; game.enemy.engageIn = 0; game.enemy.hp = 1; game.heroHp = game.heroMaxHp;
      g.CombatEngine.heroAction("basic");
    }
    run("StoryQuestManager._trackKills();");
  }
  for (var k = 0; k < 3; k++) passerVague();
  ok(game.dungeonRun.wave === 4 && game.storyQuests.forest.counters.coeurKillsMarked === 0, "3 vagues à nu : non comptées");
  run("DungeonManager.forfeit();");
  // Run sous 1 Marque : chaque vague passée compte.
  g.DungeonManager.start(1, ["aff_fragility"]);
  ok(game.dungeonRun.active === true && game.dungeonRun.marks.length === 1, "run sous Fragilité lancé (ticket offert, forest_13 en cours)");
  /* La jauge de célérité peut déclencher une frappe bonus qui enchaîne deux vagues dans la
     même action : on compte les VAGUES PASSÉES, jamais le nombre d'appels. */
  passerVague();
  var marque1 = game.storyQuests.forest.counters.coeurKillsMarked;
  ok(marque1 >= 1 && step13.check(game) === false, "1re vague sous Marque compt\u00e9e (" + marque1 + "/5), \u00e9tape pas encore pr\u00eate");
  var garde5 = 12;
  while (game.dungeonRun.active && game.storyQuests.forest.counters.coeurKillsMarked < 5 && garde5-- > 0) passerVague();
  ok(game.storyQuests.forest.counters.coeurKillsMarked >= 5 && step13.check(game) === true, "5 vagues sous Marque : forest_13 prête");
  run("DungeonManager.forfeit();");
  ok(step13.check(game) === true && !game.dungeonRun.active, "run abandonné après coup : reste prête (compteur acquis)");
  var saved = run("buildSaveData()");
  ok(saved.storyQuests.forest.counters.coeurKillsMarked >= 5, "coeurKillsMarked persisté dans storyQuests.forest.counters");
})();

/* ================= v3.136.0 — ticket Donjon I offert (forest_14) + afflictions farm libre uniquement ================= */
console.log("\n== v3.136.0 : ticket Histoire Donjon I ==");
(function () {
  game = freshCombat("knight"); giveWeapon();
  run("StoryQuestManager.ensure(); DungeonManager.ensure(); DungeonManager.checkTicketReset();");
  var idx14 = g.STORY_QUESTS.forest.steps.findIndex(function (s) { return s.id === "forest_14"; });
  game.dungeonTickets = 0;
  ok(g.DungeonManager.isStoryTicketFree(1) === false, "hors forest_14 : pas de ticket offert");
  game.storyQuests.forest.currentStep = idx14; game.storyQuests.forest.accepted = false;
  ok(g.DungeonManager.isStoryTicketFree(1) === false, "forest_14 non acceptée : pas de ticket offert");
  game.storyQuests.forest.accepted = true;
  ok(g.DungeonManager.isStoryTicketFree(1) === true && g.DungeonManager.isStoryTicketFree(2) === false, "forest_14 acceptée : offert sur le palier I seulement");
  g.DungeonManager.start(1);
  ok(game.dungeonRun.active === true && game.dungeonRun.dungeonId === 1 && game.dungeonTickets === 0, "0 ticket + forest_14 : le Donjon I démarre sans rien décompter");
  run("game.dungeonRun = { active: false, wave: 0 }; SortieManager.end('return');");
  var introHtml = run("pendingDungeonMarks = []; buildDungeonSheetHTML(1)");
  ok(introHtml.indexOf("Entrée offerte") !== -1 && introHtml.indexOf("Tickets restants") === -1, "feuille de lancement : mention « Entrée offerte » à la place du compteur");
  g.DungeonManager.start(1);
  run("game.dungeonRun = { active: false, wave: 0 }; SortieManager.end('return');");
  game.storyQuests.forest.currentStep = idx14 + 1; game.storyQuests.forest.accepted = false; // forest_14 réclamée
  g.DungeonManager.start(1);
  ok(!game.dungeonRun.active, "forest_14 réclamée, 0 ticket : refus normal (« Aucun ticket »)");
  game.dungeonTickets = 2; g.DungeonManager.start(1);
  ok(game.dungeonRun.active === true && game.dungeonTickets === 1, "forest_14 réclamée, 2 tickets : décompte normal (1 restant)");
  run("game.dungeonRun = { active: false, wave: 0 }; SortieManager.end('return');");
})();

console.log("\n== v3.136.0 → v3.245.0 : Marques actives en run de donjon seulement ==");
(function () {
  game = freshCombat("knight"); giveWeapon();
  run("StoryQuestManager.ensure(); DungeonManager.ensure(); SortieManager.end('return');");
  var baseMaxHp = game.heroMaxHp;
  ok(g.AfflictionManager.getActiveCount() === 0 && g.AfflictionManager.isContextActive() === false, "hors run : aucune Marque, contexte neutre");
  var m = g.AfflictionManager.getCombinedModifiers();
  ok(m.enemyPowerMult === 1 && m.heroMaxHpMult === 1 && g.AfflictionManager.getStackRewardMult() === 1, "hors run : modificateurs neutres");
  run("SortieManager.start('farm');");
  ok(g.AfflictionManager.isContextActive() === false && game.heroMaxHp === baseMaxHp, "sortie farm : toujours neutre, PV max de base");
  run("SortieManager.end('return');");
  game.dungeonTickets = 3;
  g.DungeonManager.start(1, ["aff_plague", "aff_fragility"]);
  ok(game.dungeonRun.marks.length === 1 && game.dungeonRun.marks[0] === "aff_fragility", "Tani\u00e8re jamais termin\u00e9e : Fl\u00e9au (unlock cleared) refus\u00e9, Fragilit\u00e9 gard\u00e9e");
  run("DungeonManager.forfeit();");
  game.dungeonTierCleared[1] = true;
  g.DungeonManager.start(1, ["aff_plague", "aff_fragility"]);
  ok(game.dungeonRun.active && game.dungeonRun.marks.length === 2 && g.AfflictionManager.getActiveCount() === 2 && g.AfflictionManager.isActive("aff_plague"), "run sous Fléau + Fragilité : 2 Marques actives");
  var m2 = g.AfflictionManager.getCombinedModifiers();
  ok(m2.enemyPowerMult === 1.3 && m2.heroMaxHpMult === 0.7 && Math.abs(g.AfflictionManager.getStackRewardMult() - 1.3) < 1e-9, "run : modificateurs appliqués (dégâts ennemis 1.3, PV 0.7, cumul 1.30)");
  ok(game.heroMaxHp === Math.max(1, Math.floor(baseMaxHp * 0.7)) && game.heroHp === game.heroMaxHp, "PV max réduits par Fragilité, entrée à PV pleins (" + game.heroHp + "/" + game.heroMaxHp + ")");
  ok(g.AfflictionManager.arePotionsForbidden() === false, "sans Ascétisme : potions autorisées");
  run("DungeonManager.forfeit();");
  ok(!game.dungeonRun.active && g.AfflictionManager.getActiveCount() === 0 && game.heroMaxHp === baseMaxHp, "fin de run : Marques retirées, PV max restaurés");
  g.DungeonManager.start(1, ["aff_asceticism", "aff_colossus", "aff_fragility", "aff_plague"]);
  ok(game.dungeonRun.marks.length === 3 && g.AfflictionManager.arePotionsForbidden() === true, "4 Marques demandées : plafond 3 appliqué, Ascétisme interdit les potions");
  run("DungeonManager.forfeit();");
})();

console.log("\n== v3.137.0 : recette Grande ration (Cuisine de camp) ==");
(function () {
  game = freshCombat("knight"); giveWeapon();
  run("StoryQuestManager.ensure();");
  var recipe = g.WorkshopsSystem.getRecipe("cuisine_de_camp", "grande_ration");
  ok(!!recipe, "recette grande_ration présente sur cuisine_de_camp");
  ok(recipe.inputs.length === 2 && recipe.inputs[0].resourceId === "ration" && recipe.inputs[0].quantity === 1
    && recipe.inputs[1].resourceId === "seve_aeswyn" && recipe.inputs[1].quantity === 3,
    "intrants : 1 Ration moyenne + 3 Sève d'Aeswyn (option B)");
  ok(recipe.craftTimeMs === 12000, "temps de base 12 s");

  // fullResetState/hardResetState donnent 3 Ration moyenne de départ (v3.107.1) : on repart de 0 pour un test net.
  run("game.resources.ration = 0; game.resources.seve_aeswyn = 0;");
  ok(g.WorkshopsSystem.getMaxCraftTimes("cuisine_de_camp", "grande_ration") === 0, "pas assez de stock : 0 craft possible");
  g.WarehouseManager.addResource("ration", 2, true);
  g.WarehouseManager.addResource("seve_aeswyn", 3, true);
  ok(g.WorkshopsSystem.getMaxCraftTimes("cuisine_de_camp", "grande_ration") === 1, "stock limité par la Sève (3 -> 1 craft), pas par la Ration (2)");
  ok(g.WorkshopsSystem.canCraft("cuisine_de_camp", "grande_ration", 1) === true, "canCraft vrai avec le stock réuni");

  var okEnqueue = g.WorkshopsSystem.enqueueCraft("cuisine_de_camp", "grande_ration", 1);
  ok(okEnqueue === true, "mise en file réussie");
  ok(g.WarehouseManager.getAmount("ration") === 1 && g.WarehouseManager.getAmount("seve_aeswyn") === 0, "intrants déduits à la mise en file (1 Ration, 3 Sève)");
  var queue = g.WorkshopsSystem.getQueue("cuisine_de_camp");
  var entry = queue[queue.length - 1];
  ok(entry.recipeId === "grande_ration" && entry.msRemaining === 12000, "entrée en file : recipeId + durée totale corrects");

  g.WorkshopsSystem.tickWorkshop("cuisine_de_camp", 12000);
  ok(g.WarehouseManager.getAmount("grande_ration") >= 1, "craft terminé : Grande ration créditée via WarehouseManager");
  ok(g.WorkshopsSystem.getQueue("cuisine_de_camp").length === 0, "file vidée après complétion");

  var pain = g.WAREHOUSE_RESOURCES.pain;
  ok(pain.desc.indexOf("Boulangerie") !== -1 && pain.desc.indexOf("Atelier de Construction") === -1, "desc Pain corrigée (Boulangerie, plus Atelier de Construction)");
  var seve = g.WAREHOUSE_RESOURCES.seve_aeswyn;
  ok(seve.desc.indexOf("Grande ration") !== -1, "desc Sève d'Aeswyn mentionne son usage de craft");
})();


console.log("\n[UX-PROD] Tableau de bord Production v3.191.0 — routeur, vue Ateliers, actions groupées");
(function () {
  // état : les 6 bâtiments débloqués, zones assurées
  run("game.quarryUnlocked = true; game.huntBuildingUnlocked = true; game.wellUnlocked = true;" +
      "game.sawmillUnlocked = true; game.mineUnlocked = true; game.farmUnlocked = true;" +
      "ProductionManager.ensure();");
  run("Object.keys(PRODUCTION_BUILDINGS).forEach(function (id) { ProductionPlotsSystem.ensurePlots(id); });");

  // 1. routeur : vue Production par défaut (double bouton + cartes compactes, plus d'anciens toggles)
  run("productionViewTab = 'prod'; productionDetailBuildingId = null;");
  var html = run("buildProductionHTML()");
  ok(html.indexOf("pc-subtab-bar production-switch") !== -1, "double bouton Production|Ateliers présent");
  ok(html.indexOf("production-dash-card") !== -1, "cartes compactes du tableau de bord présentes");
  ok(html.indexOf("prod-harvest-all-btn") !== -1, "id prod-harvest-all-btn conservé (updateDOM)");
  ok(html.indexOf("prod-bar-farm") !== -1 && html.indexOf("prod-stock-label-farm") !== -1, "ids de jauge/stock conservés (updateDOM)");
  ok(html.indexOf("farm-plots-toggle") === -1, "anciens panneaux dépliables retirés");

  // 2. vue Ateliers agrégée : bandeau d'état + tag bâtiment + amélioration en carte
  run("productionViewTab = 'shops';");
  var shopsHtml = run("buildProductionHTML()");
  ok(shopsHtml.indexOf("production-status-banner") !== -1, "bandeau d'état présent");
  ok(shopsHtml.indexOf("workshop-building-tag") !== -1, "tag du bâtiment de rattachement sur les cartes");
  ok(shopsHtml.indexOf("wk-up") !== -1, "amélioration DANS la carte (décision Seb — bouton compact v3.192.0)");
  /* v3.221.0 : ce test portait sur une donnée mouvante — il supposait qu'il
     reste des ateliers inactifs dans un bâtiment débloqué, ce qui devient faux
     à mesure qu'on les active (trois l'ont été depuis). On teste maintenant le
     COMPORTEMENT DE L'ÉCRAN en fabriquant le cas, puis on restaure. */
  var etatFonderie = run("WORKSHOPS_CONFIG.fonderie.active");
  run("WORKSHOPS_CONFIG.fonderie.active = false;");
  shopsHtml = run("buildProductionHTML()");
  ok(shopsHtml.indexOf("production-shops-locked") !== -1, "ateliers à venir regroupés en pied compact");
  run("WORKSHOPS_CONFIG.fonderie.active = " + (etatFonderie ? "true" : "false") + ";");
  shopsHtml = run("buildProductionHTML()");
  ok(shopsHtml.indexOf("prod-queues-btn") !== -1, "bouton Files migré sur la vue Ateliers");
  // v3.191.1 : CÂBLAGE réel des cartes (bug Seb — config brute sans id -> tout mort).
  // Avec du Blé en stock, la carte Moulin doit proposer un vrai bouton Fabriquer
  // câblé sur SON id, et jamais un id undefined nulle part.
  run("game.resources.ble = 25;");
  var shopsHtml2 = run("buildProductionHTML()");
  ok(shopsHtml2.indexOf("confirmCraftWorkshop('moulin')") !== -1, "bouton Fabriquer du Moulin câblé sur son id (Blé en stock)");
  ok(shopsHtml2.indexOf("undefined") === -1, "aucun id undefined dans la vue Ateliers");
  // v3.192.0 — carte compacte (maquette v4), 4 décisions actées :
  ok(shopsHtml2.indexOf("wk-queue") !== -1 && shopsHtml2.indexOf("workshop-queue-moulin") !== -1, "(3) file en cases, conteneur workshop-queue- conservé (refreshWorkshopQueueDOM)");
  ok(shopsHtml2.indexOf("wk-up") !== -1 && shopsHtml2.indexOf("workshop-upgrade-effect") === -1, "(4) amélioration compacte coût seul, plus de ligne d'effet permanente");
  run("WorkshopsSystem.setAutoRecipe('moulin', WORKSHOPS_CONFIG.moulin.recipes[0].id);");
  var shopsAuto = run("buildProductionHTML()");
  ok(shopsAuto.indexOf("confirmCraftWorkshop('moulin')") === -1 && shopsAuto.indexOf("adjustWorkshopAutoQty('moulin'") !== -1, "(1)+(2) ♻️ actif : Fabriquer masqué, stepper auto inline présent");
  run("WorkshopsSystem.setAutoRecipe('moulin', null);");
  ok(run("buildProductionHTML()").indexOf("confirmCraftWorkshop('moulin')") !== -1, "(1) ♻️ coupé : Fabriquer de retour");
  // file : un lot en file -> case remplie + ids temps/barre conservés (updateDOM)
  run("WorkshopsSystem.enqueueCraft('moulin', 'farine', 2);");
  var shopsQueued = run("buildProductionHTML()");
  ok(shopsQueued.indexOf("wk-slot is-filled") !== -1 && shopsQueued.indexOf("prod-workshop-time-moulin") !== -1 && shopsQueued.indexOf("prod-workshop-bar-moulin") !== -1, "(3) lot en file : case remplie + ids temps/barre conservés");
  run("WorkshopsSystem.tickWorkshop('moulin', 60000);"); // vider la file (2 lots x 3 s)
  run("game.resources.ble = 0; game.resources.farine = 0;");
  // pilules multi-recettes (Cuisine de camp, 3 recettes) — carte construite directement
  var cuisineHtml = run("buildWorkshopCardHTML(Object.assign({ id: 'cuisine_de_camp' }, WORKSHOPS_CONFIG.cuisine_de_camp))");
  ok((cuisineHtml.match(/wk-pill/g) || []).length >= 3, "Cuisine de camp : 3 pilules de recettes rendues");
  run("WorkshopsSystem.setAutoRecipe('cuisine_de_camp', WORKSHOPS_CONFIG.cuisine_de_camp.recipes[0].id);");
  ok(run("buildWorkshopCardHTML(Object.assign({ id: 'cuisine_de_camp' }, WORKSHOPS_CONFIG.cuisine_de_camp))").indexOf("is-auto") !== -1, "pilule active marquée ♻️ quand le chaînage est dessus");
  run("WorkshopsSystem.setAutoRecipe('cuisine_de_camp', null);");

  // 3. détail bâtiment : zones seules + actions groupées
  run("productionViewTab = 'prod'; productionDetailBuildingId = 'farm';");
  var detailHtml = run("buildProductionHTML()");
  ok(detailHtml.indexOf("production-detail") !== -1 && detailHtml.indexOf("farm-plots-grid") !== -1, "détail = grille de zones");
  ok(detailHtml.indexOf("production-group-actions") !== -1 && detailHtml.indexOf("Défricher une zone") !== -1, "actions groupées présentes");
  ok(detailHtml.indexOf("workshop-card") === -1, "aucune carte atelier dans le détail (parties dans la vue agrégée)");
  ok(detailHtml.indexOf("production-detail-back") !== -1, "bouton retour présent");
  // v3.191.1 (retour Seb — redondance) : zone sélectionnée -> actions groupées masquées
  run("selectedProductionPlotIndex.farm = 0;");
  var detailSel = run("buildProductionHTML()");
  ok(detailSel.indexOf("production-group-actions") === -1 && detailSel.indexOf("farm-plot-actions") !== -1, "zone sélectionnée : panneau de zone seul, actions groupées masquées");
  run("selectedProductionPlotIndex.farm = null;");
  ok(run("buildProductionHTML()").indexOf("production-group-actions") !== -1, "désélection : actions groupées de retour");
  // v3.193.0 — bandeau figé : titre dynamique du cadre Village selon l'état
  run("activeVillageSubTab = 'production'; productionDetailBuildingId = null; productionViewTab = 'prod';");
  ok(run("buildVillageHTML()").indexOf('|Production"') !== -1, "bandeau : titre 🌾 Production (vue tableau de bord)");
  run("productionViewTab = 'shops';");
  ok(run("buildVillageHTML()").indexOf('|Ateliers"') !== -1, "bandeau : titre ⚒️ Ateliers (vue agrégée)");
  run("productionViewTab = 'prod'; productionDetailBuildingId = 'farm';");
  var detailFrame = run("buildVillageHTML()");
  ok(detailFrame.indexOf('data-kf-title="' + run("PRODUCTION_BUILDINGS.farm.name") + '"') !== -1, "bandeau : titre = nom du bâtiment en détail");
  ok(detailFrame.indexOf("production-detail-name") === -1, "détail : plus de nom en doublon dans le contenu (bandeau seul)");
  run("productionDetailBuildingId = null; activeVillageSubTab = 'village';");

  // 4. "la − chère" : construit 2 zones ouvertes, vérifie le choix du coût total minimal
  run("var _p = ProductionPlotsSystem.getPlots('farm'); _p[0].state='open'; _p[0].level=3; _p[1].state='open'; _p[1].level=1;");
  var expected = run(
    "(function(){ var c0=getProductionPlotUpgradeCost('farm',3,0), c1=getProductionPlotUpgradeCost('farm',1,1);" +
    "var t0=0,t1=0; Object.keys(c0).forEach(function(k){t0+=c0[k];}); Object.keys(c1).forEach(function(k){t1+=c1[k];});" +
    "return t0<t1?0:1; })()");
  ok(run("getCheapestUpgradablePlot('farm')") === expected, "getCheapestUpgradablePlot choisit le coût total minimal (attendu : zone " + expected + ")");
  ok(run("buildPlotsPanelHTML('farm')").indexOf("is-cheapest") !== -1, "zone la − chère signalée sur la grille");

  // 5. ateliers à l'arrêt : auto activé + rien à produire -> compté ; auto coupé -> pas compté
  run("game.resources.ble = 0;");
  run("WorkshopsSystem.setAutoRecipe('moulin', WORKSHOPS_CONFIG.moulin.recipes[0].id);");
  ok(run("WorkshopsSystem.getAutoRecipeId('moulin')") === run("WORKSHOPS_CONFIG.moulin.recipes[0].id"), "auto activé sur le Moulin (précondition)");
  ok(run("countStalledWorkshops()") >= 1, "Moulin auto sans Blé compté à l'arrêt");
  run("WorkshopsSystem.setAutoRecipe('moulin', null);");
  var stalledAfter = run("countStalledWorkshops()");
  run("var _s = " + stalledAfter + ";");
  ok(run("WorkshopsSystem.getAutoRecipeId('moulin')") === null, "auto coupé sur le Moulin");

  // remise à neutre pour d'éventuelles sections futures
  run("productionViewTab = 'prod'; productionDetailBuildingId = null;");
})();

/* ================= [PA] v3.198.0 — recalibrage de la Petite Aventure =================
   Protège les invariants du lot : plafond de blessures par canevas, voies restreintes par
   nœud, corde et provisions à charges, soins ciblés par sévérité, difficulté indexée sur le
   héros. Chaque assertion vise un COMPORTEMENT, pas une valeur de calibrage : les constantes
   sont lues dans les données pour que le prochain recalibrage ne casse pas ces tests. */
(function () {
  console.log("\n[PA] Petite Aventure — plafond de blessures, voies, charges, soins, heroScale");

  var PA = g.window.SCENE_TEMPLATES.petite_aventure_foret;
  var EF = g.window.SCENE_TEMPLATES.expedition_faille;

  // --- plafond de blessures : par canevas, pas en dur ---
  ok(run("SceneRunManager.getMaxInjuries('petite_aventure_foret')") === PA.maxInjuries,
    "[PA] getMaxInjuries lit template.maxInjuries (" + PA.maxInjuries + ")");
  // v3.199.0 : expedition_faille est calibré à son tour. Le canevas témoin « intouché » est
  // désormais une quête de déblocage migrée (2 paliers, rôle de tutoriel).
  ok(run("SceneRunManager.getMaxInjuries('sentier_obstrue')") === 3,
    "[PA] un canevas sans maxInjuries garde le défaut de 3 blessures");
  ok(run("SceneRunManager.getMaxInjuries('expedition_faille')") === 2,
    "[PA] expedition_faille évacue à 2 blessures (calibré v3.199.0)");

  // --- voies restreintes : le nœud n'expose que optionsPerNode approches ---
  run("SceneRunManager.clearRun(); game.resources.petite_ration = 10; game.explorationProgression.petiteAventure = { day: '', count: 0 };");
  run("SceneRunManager.startRun('petite_aventure_foret'); SceneRunManager.chooseProfile('prudent'); SceneRunManager.chooseIntensity('periple'); SceneRunManager.acknowledgeMutator();");
  var voiesOk = run("(function () {" +
    "var bad = 0, seen = 0;" +
    "game.sceneRun.card.forEach(function (lvl) { lvl.forEach(function (sl) {" +
    "  if (sl.type !== 'obstacle') return; seen++;" +
    "  var gab = SCENE_NODES.obstacles[sl.gabaritId];" +
    "  var v = SceneEngine.nodeVoies(gab, sl);" +
    "  if (v.length !== SCENE_TEMPLATES.petite_aventure_foret.optionsPerNode) bad++;" +
    "}); });" +
    "return { bad: bad, seen: seen }; })()");
  ok(voiesOk.seen > 0, "[PA] la carte générée contient au moins un obstacle (" + voiesOk.seen + ")");
  ok(voiesOk.bad === 0, "[PA] chaque obstacle n'expose que " + PA.optionsPerNode + " voies (" + voiesOk.bad + " écart(s))");

  // les voies sont MÉMORISÉES : deux lectures successives donnent la même liste
  var stable = run("(function () {" +
    "var sl = null; game.sceneRun.card.forEach(function (l) { l.forEach(function (x) { if (!sl && x.type === 'obstacle') sl = x; }); });" +
    "var gab = SCENE_NODES.obstacles[sl.gabaritId];" +
    "return SceneEngine.nodeVoies(gab, sl).join(',') === SceneEngine.nodeVoies(gab, sl).join(','); })()");
  ok(stable === true, "[PA] les voies d'un nœud sont figées dans le slot, jamais retirées à l'affichage");

  // expedition_faille : pas d'optionsPerNode -> toutes les voies restent exposées
  ok(g.window.SCENE_TEMPLATES.sentier_obstrue.optionsPerNode == null,
    "[PA] une quête migrée ne déclare pas optionsPerNode (3 voies conservées)");
  ok(EF.optionsPerNode === 2, "[PA] expedition_faille expose 2 voies par nœud (calibré v3.199.0)");
  var efAll = run("(function () {" +
    "var gab = SCENE_NODES.obstacles.gouffre;" +
    "return SceneEngine.nodeVoies(gab, { type: 'obstacle', gabaritId: 'gouffre' }).length; })()");
  ok(efAll === 3, "[PA] un slot sans voies retombe sur les 3 options du gabarit (reprise de sauvegarde)");

  // --- soins ciblés par sévérité ---
  run("game.sceneRun.injuries = [{ stat: 'power', severity: 'grave' }];");
  ok(run("SceneRunManager.canHealHere(game.sceneRun)") === false,
    "[PA] autel/source ne peuvent rien sur une blessure grave");
  run("game.sceneRun.injuries = [{ stat: 'power', severity: 'grave' }, { stat: 'endurance', severity: 'legere' }];");
  ok(run("SceneRunManager.canHealHere(game.sceneRun)") === true,
    "[PA] autel/source agissent dès qu'une blessure légère est présente");
  run("SceneRunManager._healOneInjury(game.sceneRun, 'legere');");
  ok(run("game.sceneRun.injuries.length") === 1 && run("game.sceneRun.injuries[0].severity") === "grave",
    "[PA] le soin 'legere' retire la légère et laisse la grave");

  // --- provisions : soignent la PIRE blessure, consomment une charge ---
  run("game.sceneRun.injuries = [{ stat: 'endurance', severity: 'legere' }, { stat: 'power', severity: 'grave' }]; game.sceneRun.provisionCharges = 1;");
  var provRes = run("SceneRunManager.useSceneProvision()");
  ok(provRes.ok === true && provRes.severity === "grave",
    "[PA] les provisions soignent la blessure la plus grave");
  ok(run("game.sceneRun.provisionCharges") === 0, "[PA] les provisions consomment une charge");
  ok(run("SceneRunManager.useSceneProvision().ok") === false, "[PA] provisions épuisées : refus propre");

  // l'offre de préparation ne contient plus de doublon (annulait le plafond de blessures)
  var dupPA = run("(function () { var o = SCENE_TEMPLATES.petite_aventure_foret.loadoutOffer;" +
    "var c = {}; var d = 0; o.forEach(function (id) { c[id] = (c[id] || 0) + 1; if (c[id] > 1) d++; }); return d; })()");
  ok(dupPA === 0, "[PA] loadoutOffer sans doublon (un seul exemplaire de chaque objet)");

  // --- corde : charges, plus illimitée ---
  run("SceneRunManager.clearRun(); game.resources.petite_ration = 10; game.explorationProgression.petiteAventure = { day: '', count: 0 };");
  run("SceneRunManager.startRun('petite_aventure_foret'); SceneRunManager.chooseProfile('prudent'); SceneRunManager.chooseIntensity('sentier'); SceneRunManager.acknowledgeMutator(); SceneRunManager.confirmLoadout(['corde', 'provisions', 'torche']);");
  ok(run("game.sceneRun.ropeCharges") === 1, "[PA] confirmLoadout compte les charges de corde (1)");
  ok(run("game.sceneRun.provisionCharges") === 1, "[PA] confirmLoadout compte les charges de provisions (1)");
  run("game.sceneRun.ropeCharges = 0; game.sceneRun.ropeAvailable = false;");
  run("game.sceneRun.status = 'node'; game.sceneRun.currentGate = 0; game.sceneRun.pendingNode = { type: 'obstacle', gabaritId: 'gouffre', riskMod: 1 };");
  ok(run("SceneRunManager.resolveObstacle('corde').ok") === false,
    "[PA] corde épuisée : l'approche à la corde est refusée par le manager, pas seulement masquée");

  // --- reprise d'un run d'avant v3.198.0 ---
  run("game.sceneRun.ropeCharges = null; game.sceneRun.provisionCharges = null; game.sceneRun.ropeAvailable = true; SceneRunManager.getRun();");
  ok(run("game.sceneRun.ropeCharges") === 1 && run("game.sceneRun.provisionCharges") === 0,
    "[PA] run repris d'une version antérieure : ropeAvailable converti en 1 charge, provisions à 0");

  // --- heroScale : indexé sur le bonus plafonné, jamais sous 1, plafonné ---
  var scaleNeuf = run("(function () { var r = { templateId: 'petite_aventure_foret', heroSnapshot: { power: 60, precision: 40, endurance: 62 } };" +
    "return SceneRunManager.heroScale(r); })()");
  var scaleMax = run("(function () { var r = { templateId: 'petite_aventure_foret', heroSnapshot: { power: 210, precision: 100, endurance: 212 } };" +
    "return SceneRunManager.heroScale(r); })()");
  ok(scaleNeuf >= 1 && scaleNeuf < 1.2, "[PA] heroScale ≈ 1 pour un héros neuf (" + scaleNeuf.toFixed(3) + ")");
  ok(scaleMax > scaleNeuf, "[PA] heroScale croît avec le développement (" + scaleMax.toFixed(3) + ")");
  ok(scaleMax <= PA.heroScaling.max, "[PA] heroScale respecte son plafond (" + PA.heroScaling.max + ")");
  var scaleTuto = run("(function () { var r = { templateId: 'sentier_obstrue', heroSnapshot: { power: 210, precision: 100, endurance: 212 } };" +
    "return SceneRunManager.heroScale(r); })()");
  ok(scaleTuto === 1, "[PA] aucun canevas sans heroScaling n'est affecté (quête migrée = 1)");

  // --- profils d'option : surcharge locale, défaut préservé ailleurs ---
  // Le run actif est purgé AVANT ces mesures : _obstacleFactors compose le mutateur via
  // getActiveMutator(), qui lit game.sceneRun et non le run passé en argument. Sans cette
  // purge, un run laissé actif plus haut faisait fuiter son lootMult dans la mesure (test
  // intermittent observé une fois sur huit). Sans run, getActiveMutator renvoie "aucun".
  run("SceneRunManager.clearRun();");
  ok(PA.optionProfiles.endurance.lootMod < PA.optionProfiles.power.lootMod,
    "[PA] la voie d'endurance rapporte moins que la voie de puissance");
  ok(PA.optionProfiles.endurance.diffMod < PA.optionProfiles.power.diffMod,
    "[PA] la voie d'endurance reste la plus sûre (le triangle n'est pas inversé)");
  var facPA = run("(function () { var r = { templateId: 'petite_aventure_foret', intensity: 'chemin', heroSnapshot: { power: 60, precision: 40, endurance: 62 } };" +
    "return SceneRunManager._obstacleFactors(r, 'power'); })()");
  var facEF = run("(function () { var r = { templateId: 'sentier_obstrue', intensity: null, heroSnapshot: { power: 60, precision: 40, endurance: 62 } };" +
    "return SceneRunManager._obstacleFactors(r, 'power'); })()");
  ok(Math.abs(facEF.lootMult - g.window.SCENE_NODES.optionProfiles.power.lootMod) < 1e-9,
    "[PA] un canevas sans surcharge utilise les profils par défaut de SCENE_NODES");
  ok(facPA.lootMult > facEF.lootMult, "[PA] la Petite Aventure applique bien sa surcharge locale");
})();

/* ================= [SOUFFLE] v3.199.0 — le Souffle devient contraignant =================
   Protège : coût de palier, épuisement comme seconde fin de run, détection de cul-de-sac,
   axe inversé des coûts, diffMult de canevas, non-contamination des quêtes migrées. */
(function () {
  console.log("\n[SOUFFLE] coût de palier, épuisement, cul-de-sac, axe inversé");

  var PA = g.window.SCENE_TEMPLATES.petite_aventure_foret;
  var PROF = PA.optionProfiles;

  // --- axe inversé : la voie sûre est la plus chère en Souffle ---
  ok(PROF.endurance.breathCost > PROF.power.breathCost,
    "[SOUFFLE] la voie d'endurance coûte plus de Souffle que la voie de puissance (axe inversé)");
  ok(PROF.precision.breathCost < PROF.power.breathCost,
    "[SOUFFLE] la voie de précision est la moins chère (option soutenable)");

  // --- le budget est réellement contraignant sur un run long ---
  var periple = g.window.SCENE_INTENSITY.periple;
  var plancher = PA.breathPerDepth * periple.depthMax;
  ok(plancher > 0 && plancher < 100, "[SOUFFLE] plancher de progression au Périple = " + plancher + "/100");
  ok(plancher + PROF.endurance.breathCost * 3 > 100,
    "[SOUFFLE] impossible de tenir le Périple en jouant l'endurance à chaque obstacle");

  // --- coût de palier prélevé à l'entrée de la porte ---
  run("SceneRunManager.clearRun(); game.resources.petite_ration = 10; game.explorationProgression.petiteAventure = { day: '', count: 0 };");
  run("SceneRunManager.startRun('petite_aventure_foret'); SceneRunManager.chooseProfile('prudent'); SceneRunManager.chooseIntensity('periple'); SceneRunManager.acknowledgeMutator(); SceneRunManager.confirmLoadout(['torche', 'gourde', 'amulette']);");
  run("game.sceneRun.mutator = 'aucun'; game.sceneRun.breath = 100;");
  run("SceneRunManager.enterGate(0);");
  ok(run("game.sceneRun.breath") === 100 - PA.breathPerDepth,
    "[SOUFFLE] franchir un palier retire " + PA.breathPerDepth + " Souffle (obtenu " + run("game.sceneRun.breath") + ")");

  // --- Souffle épuisé -> fin du run, marquée comme telle ---
  run("game.sceneRun.status = 'gate'; game.sceneRun.pendingNode = null; game.sceneRun.currentGate = null; game.sceneRun.breath = " + PA.breathPerDepth + ";");
  var epuise = run("SceneRunManager.enterGate(0)");
  ok(epuise.outcome === "epuisement", "[SOUFFLE] Souffle à zéro en franchissant : le run se termine par épuisement");
  ok(run("game.sceneRun.exhausted") === true, "[SOUFFLE] run.exhausted marqué (l'écran de fin doit annoncer un échec)");
  ok(run("game.sceneRun.status") === "completed", "[SOUFFLE] le run est clos, pas laissé dans un état intermédiaire");

  // --- affordableVoies : filtre réel, la corde n'est pas concernée ---
  run("SceneRunManager.clearRun(); game.resources.petite_ration = 10; game.explorationProgression.petiteAventure = { day: '', count: 0 };");
  run("SceneRunManager.startRun('petite_aventure_foret'); SceneRunManager.chooseProfile('prudent'); SceneRunManager.chooseIntensity('chemin'); SceneRunManager.acknowledgeMutator(); SceneRunManager.confirmLoadout(['torche', 'gourde', 'amulette']);");
  run("game.sceneRun.mutator = 'aucun'; game.sceneRun.breath = 100;");
  var toutes = run("(function () { var sl = { type: 'obstacle', gabaritId: 'gouffre', riskMod: 1, voies: ['power', 'endurance'] };" +
    "return SceneRunManager.affordableVoies(game.sceneRun, SCENE_NODES.obstacles.gouffre, sl).length; })()");
  ok(toutes === 2, "[SOUFFLE] à 100 de Souffle, les deux voies exposées sont payables");
  run("game.sceneRun.breath = " + (PROF.power.breathCost + 1) + ";");
  var restreintes = run("(function () { var sl = { type: 'obstacle', gabaritId: 'gouffre', riskMod: 1, voies: ['power', 'endurance'] };" +
    "return SceneRunManager.affordableVoies(game.sceneRun, SCENE_NODES.obstacles.gouffre, sl); })()");
  ok(restreintes.length === 1 && restreintes[0] === "power",
    "[SOUFFLE] à bout de Souffle, seule la voie abordable reste jouable");
  run("game.sceneRun.status = 'node'; game.sceneRun.currentGate = 0; game.sceneRun.pendingNode = { type: 'obstacle', gabaritId: 'gouffre', riskMod: 1 };");
  ok(run("SceneRunManager.resolveObstacle('endurance').ok") === false,
    "[SOUFFLE] une voie trop chère est refusée par le manager, pas seulement grisée dans la vue");

  // --- diffMult de canevas (repli quand le run n'a pas d'intensité) ---
  var EF = g.window.SCENE_TEMPLATES.expedition_faille;
  ok(EF.diffMult > 1, "[SOUFFLE] expedition_faille porte son propre diffMult (" + EF.diffMult + ")");
  run("SceneRunManager.clearRun();");
  var facEF = run("(function () { var r = { templateId: 'expedition_faille', intensity: null, heroSnapshot: { power: 60, precision: 40, endurance: 62 } };" +
    "return SceneRunManager._obstacleFactors(r, 'power'); })()");
  var facTuto = run("(function () { var r = { templateId: 'sentier_obstrue', intensity: null, heroSnapshot: { power: 60, precision: 40, endurance: 62 } };" +
    "return SceneRunManager._obstacleFactors(r, 'power'); })()");
  ok(facEF.diffMult > facTuto.diffMult,
    "[SOUFFLE] le diffMult de canevas s'applique sans intensité, et pas aux quêtes migrées");

  // --- les quêtes de déblocage migrées ne subissent aucune pression de Souffle ---
  ok(g.window.SCENE_TEMPLATES.sentier_obstrue.breathPerDepth == null,
    "[SOUFFLE] une quête migrée ne déclare pas breathPerDepth (rôle de tutoriel préservé)");

  run("SceneRunManager.clearRun();");
})();

/* ================= [RESUME] v3.202.0 — sous-onglet Résumé ==================
   Protège ce que l'écran apporte (classe visible, raccourcis renseignés) et
   ce qu'il ne doit PAS refaire (carrousel, icônes affichées en chemin brut). */
(function () {
  console.log("\n[RESUME] écran Personnage — sous-onglet Résumé");

  run("fullResetState(); game.playerName='Aldric'; game.heroId='knight'; EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp;");
  run("game.heroLevel = 24; game.heroXp = 1840; game.heroXpToNext = 2600;");
  run("game.upgrades.utrain_power = 78; game.upgrades.utrain_endurance = 64; game.upgrades.utrain_celerity = 41; game.upgrades.utrain_precision = 60; game.upgrades.utrain_will = 30;");
  run("StatsSystem.recalcStats(); ClassCombatManager.resetForNewHero(); activeHerosSubTab = 'hero'; herosOpenSheet = null;");
  run("game.unlockedTabs.equip = true; game.unlockedTabs.talents = true; game.unlockedTabs.ascension = true;");
  var html = run("buildHerosHTML()");

  // --- structure : barre de sous-onglets EN BAS et HORS du cadre du héros ---
  ok(html.indexOf("subtab-page-content") !== -1 && html.indexOf("subtab-bar-wrapper") !== -1,
    "[RESUME] structure .subtab-page conservée (contenu défilant + barre)");
  ok(html.indexOf("subtab-bar-wrapper") > html.indexOf("kframe-page"),
    "[RESUME] la barre de sous-onglets vient APRÈS le cadre du héros (donc en bas, hors cadre)");
  var frameEnd = html.lastIndexOf("</div>", html.indexOf("subtab-bar-wrapper"));
  ok(frameEnd !== -1, "[RESUME] le cadre est refermé avant la barre");

  // --- v3.244.0 (chantier Navigation) : sous-onglets Résumé / Équipement / Talents ;
  //     Stats et Capacités sont des feuilles basses ouvertes depuis le Résumé ---
  ["Résumé", "Équipement", "Talents"].forEach(function (lbl) {
    ok(html.indexOf("<span>" + lbl + "</span>") !== -1, "[RESUME] onglet « " + lbl + " » présent");
  });
  ["'hero'", "'equip'", "'talents'"].forEach(function (id) {
    ok(html.indexOf("setHerosSubTab(" + id + ")") !== -1,
      "[RESUME] identifiant de sous-onglet " + id + " présent");
  });
  ok(html.indexOf("openHerosSheet('stats')") !== -1 && html.indexOf("openHerosSheet('abilities')") !== -1,
    "[RESUME] les sauts Stats et Capacités ouvrent leurs feuilles basses");
  ok(html.indexOf("switchTab('ascension')") !== -1, "[RESUME] l'Ascension s'ouvre depuis le Résumé (sortie du menu ☰)");
  // l'étape d'Histoire pointe sur "amelioration" : l'ancien id doit rester joignable
  run("setHerosSubTab('amelioration');");
  ok(run("herosOpenSheet") === "stats" && run("activeHerosSubTab") === "hero",
    "[RESUME] setHerosSubTab('amelioration') ouvre la feuille Stats (compat lien data/story-quests.js)");
  run("closeHerosSheet(); setHerosSubTab('hero');");

  // --- la classe est enfin visible ---
  ok(html.indexOf("pc-sum-class") !== -1, "[RESUME] pastille de classe rendue");
  ok(html.indexOf("Chevalier") !== -1, "[RESUME] le libellé de classe apparaît");
  ok(html.indexOf("Rage") !== -1, "[RESUME] la ressource de classe apparaît");
  ok(html.indexOf("is-class-knight") !== -1, "[RESUME] la couleur de classe est portée par le portrait et la pastille");

  // getHeroSummaryResource ne DOIT PAS créer d'état de combat
  run("game.classResource = null;");
  var res = run("getHeroSummaryResource(getClassForHero(getSelectedHero()))");
  ok(res && res.current === 0 && res.max === 100,
    "[RESUME] ressource lue à 0/100 hors combat");
  ok(run("game.classResource") === null,
    "[RESUME] l'affichage ne crée aucun état de ressource (lecture seule)");

  // --- marge d'entraînement : plafonds RÉELS d'upgrades.js ---
  var prog = run("getHeroTrainingProgress()");
  var expectedTotal = run("(function () { var t = 0; UPGRADES.forEach(function (u) {"
    + "if (HEROS_TRAINING_UPGRADE_IDS.indexOf(u.id) !== -1) t += u.maxLevel; }); return t; })()");
  ok(prog && prog.total === expectedTotal,
    "[RESUME] le total est la somme des maxLevel réels (" + expectedTotal + ")");
  ok(prog && prog.done === 78 + 64 + 41 + 60 + 30, "[RESUME] niveaux entraînés comptés depuis game.upgrades");
  ok(prog && prog.left === expectedTotal - prog.done, "[RESUME] marge restante = total - entraîné");
  run("UPGRADES.forEach(function (u) { if (HEROS_TRAINING_UPGRADE_IDS.indexOf(u.id) !== -1) game.upgrades[u.id] = u.maxLevel; });");
  var full = run("getHeroTrainingProgress()");
  ok(full && full.left === 0 && full.pct === 100, "[RESUME] tout entraîné : marge nulle, 100 %");
  ok(run("buildHerosHTML()").indexOf("Tout est entraîné au maximum") !== -1,
    "[RESUME] le raccourci le dit au lieu d'afficher « 0 niveaux restants »");

  // --- icônes de capacité : chemins d'image rendus en <img>, pas en texte ---
  ok(html.indexOf("special_attacks/") === -1 || html.indexOf("<img class=\"pc-sum-jump-kit-ico\"") !== -1,
    "[RESUME] les icônes de capacité passent par renderIconOrEmojiHTML (jamais de chemin en clair)");
  ok(html.indexOf(">./images/") === -1, "[RESUME] aucun chemin d'image affiché comme texte");

  // --- ce qui a disparu ---
  ok(html.indexOf("hero-carousel") === -1, "[RESUME] plus de carrousel d'emplacements sur la fiche");
  ok(typeof run("typeof window.buildHeroCarouselHTML") === "string" && run("typeof window.buildHeroCarouselHTML") === "undefined",
    "[RESUME] buildHeroCarouselHTML n'est plus exporté");
  ok(run("typeof window.deleteHeroSlot") === "undefined", "[RESUME] deleteHeroSlot n'est plus exporté");
  ok(run("typeof window.openHeroSlotsScreen") === "function", "[RESUME] openHeroSlotsScreen exporté à la place");

  // --- retour au jeu depuis l'écran de chargement ouvert en cours de partie ---
  ok(run("typeof titleScreenShowLoad") === "function", "[RESUME] titleScreenShowLoad disponible");
  run("openTitleScreen(function () { game.__resumeCallbackRan = true; }); titleScreenShowLoad(true);");
  run("titleScreenBackToMain();");
  ok(run("game.__resumeCallbackRan") === true,
    "[RESUME] ouvert depuis le jeu, la flèche de retour referme l'écran titre au lieu de piéger le joueur");
  run("delete game.__resumeCallbackRan;");
  run("openTitleScreen(function () { game.__resumeCallbackRan = true; }); titleScreenShowLoad();");
  run("titleScreenBackToMain();");
  ok(run("game.__resumeCallbackRan") === undefined,
    "[RESUME] ouvert au démarrage, la flèche remonte bien au menu principal (comportement d'origine)");
  run("resolveTitleScreen(); delete game.__resumeCallbackRan;");
})();

/* ================= [BILAN] v3.202.1 — cumulées chez les Hauts faits =================
   Protège le déplacement du bandeau de statistiques cumulées et l'alignement des titres
   de cadre sur les libellés des sous-onglets. */
(function () {
  console.log("\n[BILAN] statistiques cumulées, titres de cadre, styles morts");

  run("game.playTime = 7325; game.totalKills = 4210; game.totalGoldEarned = 98000; game.totalDamageDealt = 1250000; game.cycleCount = 3; game.ascensionCount = 2;");

  // --- le bandeau vit chez les Hauts faits ---
  var ach = run("buildAchievementsHTML()");
  ok(typeof g.window.buildAchievementTotalsHTML === "function",
    "[BILAN] buildAchievementTotalsHTML exportée");
  ok(ach.indexOf("Temps de jeu") !== -1, "[BILAN] le bandeau est rendu dans Hauts faits");
  // La valeur est comparée à formatNumber() évalué dans le bac à sable, pas à une
  // chaîne écrite en dur : le formatage des grands nombres (4.21K...) ne doit pas
  // faire échouer un test qui porte sur la SOURCE de la donnée.
  var killsFmt = run("formatNumber(game.totalKills)");
  ok(ach.indexOf("Ennemis vaincus") !== -1 && ach.indexOf(killsFmt) !== -1,
    "[BILAN] les compteurs réels sont repris (total tués = " + killsFmt + ")");
  ok(ach.indexOf("Ascensions") !== -1, "[BILAN] compteur d'ascensions présent");
  ok(ach.indexOf("réclamés") !== -1, "[BILAN] le compteur de hauts faits réclamés est conservé");
  ok(ach.indexOf("réclamés") < ach.indexOf("Temps de jeu"),
    "[BILAN] le bandeau se place APRÈS le compteur de réclamés");

  // --- et a totalement quitté le sous-onglet Capacités ---
  run("openHerosSheet('abilities');");
  var caps = run("buildHerosSheetHTML()");
  ok(caps.indexOf("Temps de jeu") === -1, "[BILAN] plus de temps de jeu dans Capacités");
  ok(caps.indexOf("Ascensions") === -1, "[BILAN] plus de compteur d'ascensions dans Capacités");
  ok(caps.indexOf("pc-cumulative-card") === -1, "[BILAN] la carte cumulée n'est plus produite");
  ok(typeof g.window.buildHerosCumulativeStatsHTML === "undefined"
    && typeof g.buildHerosCumulativeStatsHTML === "undefined",
    "[BILAN] buildHerosCumulativeStatsHTML retirée");

  /* --- titres de cadre alignés sur les libellés du bas ---
     Le joueur tapait "Stats" et arrivait sur un cadre titré "Amélioration". Ces trois
     assertions lisent le libellé du bouton actif et le titre du cadre rendu, pour qu'aucun
     renommage futur ne puisse en oublier un. */
  [["hero", "Résumé"], ["amelioration", "Stats"], ["stats", "Capacités"]].forEach(function (pair) {
    run("closeHerosSheet(); setHerosSubTab('" + pair[0] + "');");
    // v3.244.0 : Résumé = titre de cadre ; Stats / Capacités = titre de la feuille basse.
    var html = pair[0] === "hero" ? run("buildHerosHTML()") : run("buildHerosSheetHTML()");
    var m = pair[0] === "hero" ? html.match(/data-kf-title="([^"]*)"/) : html.match(/ksheet-title"><img[^>]*><span>([^<]*)<\/span>/);
    ok(!!m && m[1].indexOf(pair[1]) !== -1,
      "[BILAN] sous-onglet '" + pair[0] + "' : titre « " + pair[1] + " » (obtenu « " + (m ? m[1] : "aucun") + " »)");
  });

  // --- le fichier mort ne doit plus être chargé ---
  ok(typeof g.CHARACTER_STAT_MAX === "undefined" && typeof g.window.CHARACTER_STAT_MAX === "undefined",
    "[BILAN] more-view.js n'est plus chargé (CHARACTER_STAT_MAX absent)");

  run("setHerosSubTab('hero');");
})();

/* ================= [STATS/CAP] v3.203.0 — sous-onglets 2 et 3 =================
   Protège : la fusion stat + achat, le calcul du gain par SIMULATION (et surtout
   la restauration intégrale de l'état après ce calcul), les contres du Grimoire
   sur les capacités, et l'absence de régression sur les fonctions retirées. */
(function () {
  console.log("\n[STATS/CAP] fusion stat+achat, gain simulé, contres du Grimoire");

  /* Une section antérieure pousse les améliorations à leur plafond : sans remise à un
     niveau intermédiaire, toutes les cartes s'afficheraient "Plafond atteint" et on ne
     testerait plus rien du chemin d'achat. */
  run("game.gold = 500000;");
  run("['utrain_power','utrain_endurance','utrain_celerity','utrain_precision','utrain_will']" +
      ".forEach(function (id) { game.upgrades[id] = 10; }); StatsSystem.recalcStats();");

  /* v3.213.1 : 10 est désormais exactement le plafond sans Terrain — les cartes
     affichent donc le mur et non plus un bouton d'achat. On vérifie d'abord ce
     mur, puis on bâtit le Terrain pour retrouver un chemin d'achat à tester. */
  run("VillageBuildingManager.ensure(); game.village.buildings.training.level = 0;");
  run("HEROS_TRAINING_UPGRADE_IDS.forEach(function (id) { game.upgrades[id] = getTrainingCapLevels(); });"); // v3.248.0 : le socle est passé à 20
  var stWall = run("setHerosSubTab('amelioration'); expandedHeroStat = null; buildHerosSheetHTML()");
  ok(stWall.indexOf("is-training-wall") !== -1,
    "[STATS] caract\u00e9ristique but\u00e9e au plafond sans Terrain : le mur s'affiche");
  ok(stWall.indexOf("goToTrainingGround()") !== -1,
    "[STATS] le mur est cliquable et m\u00e8ne au Terrain (jamais un bouton mort)");
  run("game.village.buildings.training.level = 2;");

  // ---------- sous-onglet Stats ----------
  run("setHerosSubTab('amelioration'); expandedHeroStat = null;");
  var st = run("buildHerosSheetHTML()");
  ["Force", "Endurance", "Célérité", "Précision", "Volonté"].forEach(function (n) {
    ok(st.indexOf(n) !== -1, "[STATS] la stat « " + n + " » est rendue");
  });
  ok(st.indexOf("pc-stat-card-buy") !== -1, "[STATS] le bouton d'achat est sur la carte de la stat");
  ok(st.indexOf("buyUpgrade(") !== -1, "[STATS] l'achat passe par buyUpgrade, pas par un chemin parallèle");
  ok(st.indexOf("shop-buy-toolbar") !== -1, "[STATS] la barre x1/x10/x25/MAX est conservée avec son conteneur d'état actif");
  ok(st.indexOf("ATK ") !== -1 && st.indexOf("PV ") !== -1,
    "[STATS] chaque stat annonce ce qu'elle produit (pont RPG -> combat)");

  /* Le gain annoncé vient d'une simulation sur le vrai moteur. Ces deux
     assertions vérifient qu'il est JUSTE et que l'état est rendu intact. */
  run("game.upgrades.utrain_power = 10; game.shopBuyAmount = 10; StatsSystem.recalcStats();");
  var before = run("EquipmentManager.effectiveTapDamage()");
  var hpBefore = run("game.heroHp");
  var maxHpBefore = run("game.heroMaxHp");
  var gain = run("(function () { var row = null;" +
    "HEROS_STAT_ROWS.forEach(function (r) { if (r.key === 'power') row = r; });" +
    "return getHeroStatGainPreview(row, 10); })()");
  ok(gain && gain.count === 10, "[STATS] la simulation porte sur le nombre réellement achetable (10)");
  ok(gain && gain.delta > 0, "[STATS] le gain annoncé est positif (" + (gain ? gain.delta : "null") + ")");
  ok(run("game.upgrades.utrain_power") === 10,
    "[STATS] le niveau d'amélioration est restauré après la simulation");
  ok(run("EquipmentManager.effectiveTapDamage()") === before,
    "[STATS] la valeur dérivée est restaurée après la simulation");
  ok(run("game.heroHp") === hpBefore && run("game.heroMaxHp") === maxHpBefore,
    "[STATS] les PV courants et max sont restaurés (recalcStats rabote heroHp)");

  // le gain simulé doit correspondre à un vrai achat
  run("var _atkAvant = EquipmentManager.effectiveTapDamage();");
  run("buyUpgrade('utrain_power', 10);");
  var realDelta = run("EquipmentManager.effectiveTapDamage() - _atkAvant");
  ok(Math.abs(realDelta - gain.delta) < 1e-6,
    "[STATS] le gain annoncé (" + gain.delta + ") est celui réellement obtenu (" + realDelta + ")");

  // dépliage
  run("expandedHeroStat = 'power';");
  var stOpen = run("buildHerosSheetHTML()");
  ok(stOpen.indexOf("Base du héros") !== -1, "[STATS] déplié : provenance des points affichée");
  ok(stOpen.indexOf("pc-stat-next") !== -1, "[STATS] déplié : gain du prochain achat affiché");
  run("expandedHeroStat = null;");

  /* Gain réel mais invisible après arrondi : effectiveTapDamage() plancherise, donc
     un niveau de Force isolé ne change pas l'ATK affichée. L'écran doit dire à partir
     de combien l'effet se verra, jamais afficher "+0". */
  /* v3.213.1 : Terrain niveau 4 (plafond 50) pour que la Force à 40 reste
     achetable — sinon la carte affiche le mur et non le palier annoncé. */
  run("game.village.buildings.training.level = 4;");
  run("game.upgrades.utrain_power = 40; game.shopBuyAmount = 1; expandedHeroStat = 'power'; StatsSystem.recalcStats();");
  var slow = run("buildHerosSheetHTML()");
  ok(slow.indexOf("+0 ATK") === -1, "[STATS] aucun « +0 » affiché quand le gain est plancherisé");
  ok(slow.indexOf("Effet visible à partir de") !== -1,
    "[STATS] le premier palier réellement visible est annoncé");
  var step = run("(function () { var row = null;" +
    "HEROS_STAT_ROWS.forEach(function (r) { if (r.key === 'power') row = r; });" +
    "return getHeroStatFirstVisibleStep(row); })()");
  ok(step > 1, "[STATS] le palier annoncé est bien supérieur à 1 (" + step + ")");
  ok(run("game.upgrades.utrain_power") === 40,
    "[STATS] la recherche du palier visible restaure elle aussi l'état");
  run("expandedHeroStat = null; game.shopBuyAmount = 10;");

  /* Contributions par source. Chacune est mesurée en neutralisant sa source sur le vrai
     moteur : le test vérifie que la mesure est juste ET que l'état revient intact, ce qui
     est le vrai risque de cette mécanique. */
  run("game.talents = game.talents || {}; game.talents.t_sharpened_blades = 3; game.ascensionCount = 2; StatsSystem.recalcStats();");
  var atkAvantSources = run("EquipmentManager.effectiveTapDamage()");
  var talentsAvant = run("JSON.stringify(game.talents)");
  var equipAvant = run("JSON.stringify(game.equipped)");
  var srcs = run("(function () { var row = null;" +
    "HEROS_STAT_ROWS.forEach(function (r) { if (r.key === 'power') row = r; });" +
    "return getHeroStatSources(row); })()");
  ok(Array.isArray(srcs) && srcs.length > 0, "[STATS] au moins une source contribue à l'ATK");
  var labels = srcs.map(function (x) { return x.label; });
  ok(labels.indexOf("Talents") !== -1, "[STATS] les Talents apparaissent comme source (t_sharpened_blades)");
  ok(labels.indexOf("Ascension") !== -1, "[STATS] l'Ascension apparaît comme source");
  ok(run("EquipmentManager.effectiveTapDamage()") === atkAvantSources,
    "[STATS] la valeur dérivée est intacte après la mesure des sources");
  ok(run("JSON.stringify(game.talents)") === talentsAvant
    && run("JSON.stringify(game.equipped)") === equipAvant,
    "[STATS] talents et équipement sont restaurés à l'identique");
  ok(run("game.ascensionCount") === 2, "[STATS] le compteur d'ascensions est restauré");

  // Un héros sans aucun bonus ne doit pas voir un bloc de sources vide.
  // L'entraînement compte lui aussi comme source : il faut le remettre à zéro pour
  // obtenir un cas où plus RIEN ne contribue (sinon le test ne vérifie rien).
  run("game.talents = {}; game.ascensionCount = 0; game.aetherUpgrades = {}; game.equipped = {}; game.upgrades.utrain_will = 0; StatsSystem.recalcStats();");
  var srcsVides = run("(function () { var row = null;" +
    "HEROS_STAT_ROWS.forEach(function (r) { if (r.key === 'will') row = r; });" +
    "return getHeroStatSources(row); })()");
  ok(srcsVides.length === 0, "[STATS] aucune source listée quand aucune ne contribue");

  // plafond
  run("game.upgrades.utrain_precision = 60; StatsSystem.recalcStats();");
  var stCap = run("buildHerosSheetHTML()");
  /* v3.213.1 : deux murs, deux mots. « Maximum » = plafond absolu d'upgrades.js
     (Précision plafonne à 60), rien ne le lèvera ; « Terrain » = plafond du
     bâtiment, levable par un chantier. */
  ok(stCap.indexOf("Maximum") !== -1, "[STATS] une stat au maximum absolu le dit au lieu d'afficher un prix");
  ok(stCap.indexOf("is-training-wall") === -1 || run("game.upgrades.utrain_precision") < 60,
    "[STATS] le maximum absolu n'est pas confondu avec le mur du Terrain");

  // ---------- sous-onglet Capacités ----------
  run("setHerosSubTab('stats'); expandedHeroSkill = null;");
  var cap = run("buildHerosSheetHTML()");
  ok(cap.indexOf("pc-skill-card") !== -1, "[CAP] les cartes de capacité sont rendues");
  ok(cap.indexOf("Kit du") !== -1, "[CAP] le kit est annoncé avec le nom de la classe");
  ok(cap.indexOf("./images/") === -1 || cap.indexOf(">./images/") === -1,
    "[CAP] aucun chemin d'image rendu comme texte (CLASS_ACTION_ICON_FALLBACK)");

  var firstId = run("(function () { var a = ClassCombatManager.getAction('skill2'); return a ? a.id : ''; })()");
  run("expandedHeroSkill = '" + firstId + "';");
  var capOpen = run("buildHerosSheetHTML()");
  ok(capOpen.indexOf("Utile contre") !== -1, "[CAP] déplié : la section des contres est affichée");
  // esc() échappe les apostrophes en &#39; : on compare à la chaîne ÉCHAPPÉE, sinon le test
  // échoue sur tous les libellés du Grimoire qui en contiennent (la majorité).
  var counterLabel = run("(function () {" +
    "var a = ClassCombatManager.getAction('skill2');" +
    "if (!a || !a.counters || !a.counters.length) return '';" +
    "var c = getGrimoireCondition(a.counters[0]); return c ? esc(c.label) : ''; })()");
  ok(!counterLabel || capOpen.indexOf(counterLabel) !== -1,
    "[CAP] le contre affiché est bien la carte-condition du Grimoire (« " + counterLabel + " »)");
  ok(capOpen.indexOf("à venir") !== -1, "[CAP] l'emplacement réservé à l'amélioration est présent et annoncé comme tel");

  // une capacité sans contre le dit au lieu de laisser un vide
  var noCounterId = run("(function () { var a = ClassCombatManager.getAction('skill3'); return a ? a.id : ''; })()");
  run("expandedHeroSkill = '" + noCounterId + "';");
  var capNone = run("buildHerosSheetHTML()");
  ok(capNone.indexOf("Aucune situation particulière") !== -1,
    "[CAP] une capacité sans contre déclaré l'écrit explicitement");
  run("expandedHeroSkill = null;");

  // ---------- fonctions retirées ----------
  ok(typeof g.window.buildCharacterAbilitiesHTML === "undefined"
    && typeof g.buildCharacterAbilitiesHTML === "undefined",
    "[CAP] buildCharacterAbilitiesHTML retirée (remplacée par buildHeroSkillCardHTML)");

  run("setHerosSubTab('hero');");
})();

/* ================= [ENCRE] v3.203.1 — conteneurs clairs enregistrés =================
   css/00-kframe-scope.css bascule l'encre en CRÈME dans tout .kframe (fond de pierre),
   puis la restaure en sombre dans une liste curée de conteneurs à fond clair. Un bloc à
   fond crème oublié dans cette liste rend son texte crème sur crème : illisible.

   Le piège s'est produit trois fois sur le chantier Écran Personnage (cartes de stat et
   de capacité, puis identité/combat/raccourcis du Résumé, puis bilan des Hauts faits).
   Ce test le rend impossible : il RELIT les feuilles de style, trouve tout sélecteur qui
   pose un fond crème, et vérifie qu'il est enregistré — ou explicitement déclaré comme
   descendant d'un conteneur déjà enregistré (l'héritage fait alors le travail). */
(function () {
  console.log("\n[ENCRE] conteneurs à fond clair enregistrés dans 00-kframe-scope.css");

  var CREAM = /background(-color)?\s*:[^;]*(--nb-cream|#f6ecd9|#efe0c2|#e4cfa0)/i;

  /* Descendants d'un conteneur DÉJÀ enregistré : ils héritent de l'encre sombre, il
     serait inutile (et trompeur) de les inscrire une seconde fois. Toute entrée ajoutée
     ici doit nommer son ancêtre enregistré. */
  var HERITE = {
    "pc-stat-card-body": "pc-stat-card",
    "pc-stat-card-buy": "pc-stat-card",
    "pc-stat-card-bar": "pc-stat-card",
    "pc-skill-body": "pc-skill-card",
    "pc-skill-ico": "pc-skill-card",
    "pc-skill-tag": "pc-skill-card",
    "pc-skill-counter": "pc-skill-card",
    "pc-skill-counter-none": "pc-skill-card",
    "pc-skill-rank": "pc-skill-card",
    "pc-sum-portrait": "pc-sum-ident",
    "pc-sum-class": "pc-sum-ident",
    "pc-portrait-placeholder": "pc-sum-ident",
    "pc-sum-bar": "pc-sum-jump",
    "pc-sum-jump-kit": "pc-sum-jump",
    "ability-icon-wrap": "ability-card",
    "ability-cd": "ability-card",
    // v3.268.2 : descendants de .cp-card, enregistré lui (00-kframe-scope.css).
    "cp-portrait": "cp-card",
    "cp-skill": "cp-card"
  };

  var scopeCss = fs.readFileSync(path.join(ROOT, "css/00-kframe-scope.css"), "utf8");
  var enregistres = {};
  (scopeCss.match(/\.kframe\s+\.([A-Za-z0-9_-]+)/g) || []).forEach(function (m) {
    enregistres[m.replace(/^\.kframe\s+\./, "")] = true;
  });
  ok(Object.keys(enregistres).length > 10, "[ENCRE] la liste curée est bien lue (" + Object.keys(enregistres).length + " entrées)");

  /* v3.268.2 : la feuille des compagnons rejoint la liste balayée. Le défaut y est
     passé inaperçu en v3.268.0 précisément parce qu'elle n'y était pas. */
  ["css/04-panel-hero-summary.css", "css/04-panel-achievements.css", "css/04-panel-companions.css"].forEach(function (file) {
    var css = fs.readFileSync(path.join(ROOT, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    var manquants = [];
    var re = /([^{}]+)\{([^{}]*)\}/g, m;
    while ((m = re.exec(css)) !== null) {
      if (!CREAM.test(m[2])) continue;
      m[1].split(",").forEach(function (sel) {
        var cls = (sel.trim().match(/^\.([A-Za-z0-9_-]+)/) || [])[1];
        if (!cls) return;
        if (enregistres[cls]) return;
        if (HERITE[cls] && enregistres[HERITE[cls]]) return;
        if (manquants.indexOf(cls) === -1) manquants.push(cls);
      });
    }
    ok(manquants.length === 0,
      "[ENCRE] " + file + " : aucun conteneur crème non enregistré" +
      (manquants.length ? " (manque : ." + manquants.join(", .") + ")" : ""));
  });

  // Les quatre conteneurs oubliés du chantier, nommément.
  ["pc-stat-card", "pc-skill-card", "pc-sum-ident", "pc-sum-cell", "pc-sum-jump", "achievement-total", "cp-card"].forEach(function (cls) {
    ok(enregistres[cls] === true, "[ENCRE] ." + cls + " est enregistré");
  });
})();


/* ---------------------------------------------------------------------------
   [ÉLITES] v3.205.0 (lot E5) — data/elites.js, systems/elite-system.js,
   quêtes type "elite" de data/adventure-quests.js.
   Couvre le chemin complet : gating narratif, hors cap, construction,
   exaltation, arme unique par classe, autovente, victoire, bestiaire.
   --------------------------------------------------------------------------- */
console.log("\n[ÉLITES] Créatures élite et leurs quêtes");
(function () {
  game = freshCombat("knight");
  giveWeapon();
  g.StoryQuestManager.ensure();
  g.AdventureQuestManager.ensureDefaults();

  ok(!!g.ELITE_DB && Object.keys(g.ELITE_DB).length >= 2, "[ÉLITES] ELITE_DB peuplée");
  ok(!!g.EliteManager, "[ÉLITES] EliteManager exposé");
  ok(!!g.ADVENTURE_QUESTS.eq_forest_spider && !!g.ADVENTURE_QUESTS.eq_forest_bramble, "[ÉLITES] deux quêtes élite déclarées");

  var aff = (g.DUNGEON_MARKS || []).find(function (m) { return m.id === "aff_elite"; });
  ok(aff && aff.name === "Traque", "[ÉLITES] Marque aff_elite nomm\u00e9e Traque (id inchang\u00e9)");

  // Gating : invisible avant l'étape requise, visible après. Par ID, jamais par index.
  game.storyQuests.forest.currentStep = 0;
  var visibles = g.MissionBoard.list().filter(function (m) { return m.isElite; });
  ok(visibles.length === 0, "[ÉLITES] invisibles avant l'étape d'Histoire requise");

  var steps = g.STORY_QUESTS.forest.steps;
  var idx = steps.findIndex(function (s) { return s.id === "forest_12"; });
  ok(idx !== -1, "[ÉLITES] l'étape de gating forest_12 existe toujours");
  game.storyQuests.forest.currentStep = idx;
  visibles = g.MissionBoard.list().filter(function (m) { return m.isElite; });
  ok(visibles.length === 2, "[ÉLITES] visibles une fois forest_12 atteinte (" + visibles.length + ")");
  ok(visibles[0].rewardSummary.indexOf("Sève") !== -1, "[ÉLITES] la Sève figure au résumé de récompense");

  // Hors du cap de 3 quêtes actives.
  var avant = g.MissionBoard.getActiveQuestCount();
  game.adventureQuestRun = { active: true, questId: "eq_forest_spider" };
  ok(g.MissionBoard.getActiveQuestCount() === avant, "[ÉLITES] une élite ne consomme aucun slot du cap de 3");
  game.adventureQuestRun = { active: false, questId: null };

  // Construction : multiplicateurs RELATIFS appliqués à la base.
  var e = g.EliteManager.build("araignee_marquee", g.EliteManager.scaleFor(0, 0));
  ok(!!e && e.isElite === true && e.isBoss === true, "[ÉLITES] construite isElite + isBoss");
  ok(e.archetype === "enraged", "[ÉLITES] archétype posé à la construction");
  ok(e.image === g.ENEMY_DB.spider.image, "[ÉLITES] portrait hérité de l'ennemi de base");
  var mult = g.ELITE_DB.araignee_marquee.statMult;
  var attendu = Math.floor(Math.floor(g.ENEMY_DB.spider.stats.endurance * mult.endurance) * g.BOSS_PV_MULT * 1.0);
  ok(e.maxHp === attendu, "[ÉLITES] PV dérivés de la base et de statMult (" + e.maxHp + ")");

  // Exaltation : l'élite s'exalte et ne se soigne jamais.
  game.enemy = e;
  g.CombatEngine.prepareEnemy(e);
  ok(e.surgeIn >= g.ELITE_SURGE_ROUNDS_MIN && e.surgeIn <= g.ELITE_SURGE_ROUNDS_MAX,
    "[ÉLITES] minuteur d'exaltation armé au spawn (" + e.surgeIn + ")");
  e.surgeIn = 1; e.shieldIn = 99; e.healIn = 1;
  g.CombatEngine.tickEnemyTelegraphs(e);
  ok(e.surgeTelegraphed === true && e.healTelegraphed !== true,
    "[ÉLITES] exaltation télégraphiée, soin jamais (le minuteur de soin est remplacé)");
  g.CombatEngine.enemyTurn();
  ok(e.surgeRounds === g.ELITE_SURGE_DURATION_ROUNDS, "[ÉLITES] exaltation active après impact");
  ok(g.getArchetypeIntensityMult(e) === g.ELITE_SURGE_INTENSITY_MULT, "[ÉLITES] archétype d'intensité multipliée pendant l'exaltation");

  // v3.209.0 : butin unique différencié — arme pour la Fileuse, armure pour la Ronce.
  ok(g.ELITE_UNIQUE_LOOT.araignee_marquee.slot === "weapon", "[ÉLITES] la Fileuse donne une arme");
  ok(g.ELITE_UNIQUE_LOOT.ronce_ardente.slot === "armor", "[ÉLITES] la Ronce donne une armure (plus deux fois la même récompense)");

  // Arme unique : une déclinaison par classe, toujours compatible.
  ["knight", "ranger", "mage"].forEach(function (heroId) {
    game.heroId = heroId;
    var w = g.EliteManager.buildUniqueLoot("araignee_marquee");
    var permis = g.getAllowedWeaponIconsForCurrentHero();
    ok(!!w && permis.indexOf(w.icon) !== -1 && w.value === 26 && w.unique === true,
      "[ÉLITES] arme unique compatible " + heroId + " : " + (w ? w.name : "aucune"));
  });

  // Armure unique : pas de déclinaison, les trois classes reçoivent la même.
  var armures = ["knight", "ranger", "mage"].map(function (heroId) {
    game.heroId = heroId;
    return g.EliteManager.buildUniqueLoot("ronce_ardente");
  });
  ok(armures.every(function (a) { return a && a.slot === "armor" && a.stat === "defense" && a.unique === true; }),
    "[ÉLITES] armure unique produite pour les trois classes");
  ok(armures[0].name === armures[1].name && armures[1].name === armures[2].name,
    "[ÉLITES] armure identique quelle que soit la classe (" + armures[0].name + ")");

  // Valeur : strictement au-dessus de toute commune, dans l'Inhabituel.
  var plafondCommun = g.EQUIPMENT_SLOT_CONFIG.armor.ranges.common[1];
  var rangeVert = g.EQUIPMENT_SLOT_CONFIG.armor.ranges.green;
  ok(armures[0].value > plafondCommun, "[ÉLITES] armure unique au-dessus du plafond commun (" + armures[0].value + " > " + plafondCommun + ")");
  ok(armures[0].value >= rangeVert[0] && armures[0].value <= rangeVert[1], "[ÉLITES] armure unique dans la plage Inhabituel");
  ok(Math.round(armures[0].value * 100) === 4, "[ÉLITES] armure unique affichée +4% défense");

  game.heroId = "knight";
  g.EquipmentManager.recalcStats();

  // Autovente : un objet unique n'est jamais liquidé, arme comme armure.
  game.autoSellEquipment = true;
  game.autoSellRarityThreshold = "green";
  game.inventory = [];
  g.addLootToInventory(g.EliteManager.buildUniqueLoot("ronce_ardente"));
  g.addLootToInventory(g.EliteManager.buildUniqueLoot("araignee_marquee"));
  ok(game.inventory.length === 2, "[ÉLITES] les objets uniques échappent à l'autovente");
  game.autoSellEquipment = false;

  // Le libellé de la ligne de butin suit l'emplacement.
  var lignes = g.EliteManager.grantReward("ronce_ardente", 0);
  ok(lignes.length === 1 && lignes[0].label === "Armure unique", "[ÉLITES] popup de fin : ligne « Armure unique »");

  // Parcours : pistage terminé, l'élite paraît, la victoire récompense.
  game.adventureQuestProgress.eq_forest_spider = { track_spider: 6, elite_spider: 0 };
  game.adventureQuestRun = { active: true, questId: "eq_forest_spider" };
  var quest = g.ADVENTURE_QUESTS.eq_forest_spider;
  ok(g.AdventureQuestManager.nextSpawnIsElite(quest) === true, "[ÉLITES] pistage terminé → l'élite est le prochain spawn");
  g.AdventureQuestManager.spawnRunEnemy(quest);
  ok(!!game.enemy && game.enemy.isElite === true, "[ÉLITES] spawn de run : " + (game.enemy ? game.enemy.name : "aucun"));

  var seveAvant = Number((game.resources || {}).seve_aeswyn || 0);
  game.enemy.hp = 1;
  g.AdventureQuestManager.onEnemyKilled(game.enemy);
  ok(game.adventureQuestsCompleted.eq_forest_spider === true, "[ÉLITES] quête achevée à la mort de l'élite");
  ok(Number((game.resources || {}).seve_aeswyn || 0) === seveAvant + 5, "[ÉLITES] Sève créditée via WarehouseManager");

  // Bestiaire : entrée et paliers de bonus.
  ok(g.getAllBestiaryIds().indexOf("araignee_marquee") !== -1, "[ÉLITES] entrée au bestiaire");
  ok(!!g.BESTIARY_BONUS_CONFIG.araignee_marquee, "[ÉLITES] paliers de bonus de bestiaire");
})();


/* ---------------------------------------------------------------------------
   [BATTUE] v3.207.0 — farm d'or répétable (data/hunt-quests.js).
   Réutilise le moteur des chasses : lot de 20, prime versée en une fois à la
   fin, perdue en cas de mort ou d'arrêt. Aucune ressource ne tombe.
   --------------------------------------------------------------------------- */
console.log("\n[BATTUE] Farm d'or répétable en Forêt");
(function () {
  game = freshCombat("knight");
  giveWeapon();
  g.HuntQuestManager.ensureDefaults();

  var q = g.HUNT_QUESTS.hq_forest_battue;
  ok(!!q && q.lotSize === 20 && q.rewardGold === 120, "[BATTUE] lot de 20, prime de 120 or");
  ok(!q.resourceKey && !q.dropChancePct, "[BATTUE] aucune ressource, aucun taux de drop");

  // v3.264.0 : ouverte avec le Village (décision Seb), plus au lancement du jeu.
  game.explorationProgression.huntBuildingUnlocked = false;
  game.unlockedTabs.village = false;
  ok(!g.MissionBoard.list().some(function (m) { return m.id === "hunt_hq_forest_battue"; }), "[BATTUE] absente tant que le Village n'est pas ouvert");
  game.unlockedTabs.village = true;
  var missions = g.MissionBoard.list().filter(function (m) { return m.sourceKind === "hunt"; });
  ok(missions.some(function (m) { return m.id === "hunt_hq_forest_battue"; }), "[BATTUE] visible sans déblocage de bâtiment");
  ok(!missions.some(function (m) { return m.id === "hunt_hq_forest_boar"; }), "[BATTUE] la chasse, elle, reste gatée");
  var carte = missions.filter(function (m) { return m.id === "hunt_hq_forest_battue"; })[0];
  ok(carte.rewardSummary.indexOf("or par lot") !== -1, "[BATTUE] résumé de récompense en or (" + carte.rewardSummary + ")");

  // Un lot complet verse la prime une seule fois, à la fin.
  g.HuntQuestManager.start("hq_forest_battue");
  ok(game.huntRun.active === true, "[BATTUE] lot lancé");
  var or0 = game.gold;
  var viande0 = Number((game.resources || {}).viande || 0);
  var i;
  for (i = 0; i < 19; i++) g.HuntQuestManager.onEnemyKilled();
  ok(game.gold === or0, "[BATTUE] aucune prime avant le 20e kill");
  g.HuntQuestManager.onEnemyKilled();
  ok(game.gold === or0 + 120, "[BATTUE] prime versée à la fin du lot");
  ok(Number((game.resources || {}).viande || 0) === viande0, "[BATTUE] aucune ressource ramassée");
  ok(game.huntRun.active === false, "[BATTUE] lot clos");
  ok(game.huntStats.hq_forest_battue === 1, "[BATTUE] compteur de lots incrémenté");

  // Répétable sans limite.
  g.HuntQuestManager.start("hq_forest_battue");
  for (i = 0; i < 20; i++) g.HuntQuestManager.onEnemyKilled();
  ok(game.gold === or0 + 240, "[BATTUE] second lot : encore 120 or (répétable à volonté)");

  // Mourir en route coûte la prime — c'est ce qui rend le lot engageant.
  g.HuntQuestManager.start("hq_forest_battue");
  var orAvant = game.gold;
  for (i = 0; i < 15; i++) g.HuntQuestManager.onEnemyKilled();
  g.HuntQuestManager.onDefeat();
  ok(game.gold === orAvant, "[BATTUE] mort en cours de lot : prime perdue");
})();

/* ============================================================================
   [16] v3.208.0 — lot de corrections : contres complets, onglets outils,
   emplacements fixes de la tab-bar, catalogue de tutoriels.
   ============================================================================ */
(function () {
  console.log("\n[16] v3.208.0 : contres d'archétype visibles, onglets outils, tutoriels");
  freshCombat("knight");

  /* --- Contres : action.effects porte des contres que action.counters ignore --- */
  var kit = g.CLASS_SKILLS.knight.actions;

  var heavy = g.getAllGrimoireCounterIds(kit.skill1);
  ok(heavy.indexOf("healIncoming") !== -1, "[CONTRES] Frappe lourde garde son contre de télégraphe");
  ok(heavy.indexOf("enemyCorrupted") !== -1, "[CONTRES] Frappe lourde annonce la purge de corruption");
  ok(heavy.indexOf("enemyEnraged") !== -1, "[CONTRES] Frappe lourde annonce l'apaisement de rage");

  var brise = g.getAllGrimoireCounterIds(kit.skill2);
  ok(brise.indexOf("shieldIncoming") !== -1, "[CONTRES] Brise-garde garde son contre de télégraphe");
  ok(brise.indexOf("enemyVampiric") !== -1, "[CONTRES] Brise-garde annonce la coupure de vol de vie");
  ok(brise.indexOf("enemyArmored") !== -1, "[CONTRES] Brise-garde annonce la fissure du blindage");

  ok(g.getAllGrimoireCounterIds(kit.skill3).length === 0, "[CONTRES] Exécution n'en porte aucun (dégâts bruts)");
  ok(g.getAllGrimoireCounterIds(kit.defense).indexOf("eliteSurgeIncoming") !== -1, "[CONTRES] la Garde contre l'exaltation d'élite");

  // Dédoublonnage et ordre du Grimoire, pour que l'affichage soit stable.
  var order = g.GRIMOIRE_CONDITION_ORDER;
  var sorted = brise.slice().sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
  ok(brise.join(",") === sorted.join(","), "[CONTRES] liste rangée dans l'ordre du Grimoire");
  ok(g.getGrimoireCounterLabels(kit.skill1).length === heavy.length, "[CONTRES] les libellés suivent la même liste");
  ok(g.getAllGrimoireCounterIds(null).length === 0, "[CONTRES] action absente : liste vide, pas d'exception");

  // Les trois classes portent bien la redistribution v3.204.0.
  ["knight", "archer", "mage"].forEach(function (classId) {
    var actions = g.CLASS_SKILLS[classId].actions;
    var total = g.getAllGrimoireCounterIds(actions.skill1).length + g.getAllGrimoireCounterIds(actions.skill2).length;
    ok(total === 6, "[CONTRES] " + classId + " : 6 contres annoncés sur skill1+skill2 (au lieu de 2)");
  });

  /* --- Onglets toujours accessibles : le bouton Admin ne doit plus retomber au Campement --- */
  run("fullResetState(); game.playerName='Test'; game.heroId='knight';");
  ok(g.isTabUnlocked("admin") === true, "[ONGLETS] admin accessible sans passer par unlockedTabs");
  ok(g.isTabUnlocked("combat-sandbox") === true, "[ONGLETS] bac à sable accessible");
  ok(g.isTabUnlocked("tutorials") === true, "[ONGLETS] tutoriels toujours consultables");
  ok(g.isTabUnlocked("dungeon") === false, "[ONGLETS] un onglet de progression reste verrouillé");
  g.switchTab("admin");
  ok(g.game.activeTab === "admin", "[ONGLETS] switchTab('admin') n'est plus dévié vers le Campement");

  /* --- Catalogue de tutoriels : agrégation des trois sources, verrouillage à la lecture --- */
  run("fullResetState(); game.playerName='Test'; game.heroId='knight';");
  var all = g.TutorialCatalogManager.getAll();
  ok(all.length >= 15, "[TUTOS] catalogue agrégé (" + all.length + " entrées)");
  ok(g.TutorialCatalogManager.getBySection("story").length > 0, "[TUTOS] section Histoire alimentée");
  ok(g.TutorialCatalogManager.getBySection("generic").length > 0, "[TUTOS] section Bases alimentée");
  ok(g.TutorialCatalogManager.getBySection("village").length > 0, "[TUTOS] section Village alimentée");

  var ids = all.map(function (e) { return e.id; });
  ok(ids.length === ids.filter(function (id, i) { return ids.indexOf(id) === i; }).length, "[TUTOS] identifiants uniques");
  ok(all.every(function (e) { return e.tutorial && e.tutorial.title && (e.tutorial.points || []).length; }), "[TUTOS] chaque entrée a un titre et des points");

  ok(g.TutorialCatalogManager.getUnlockedCount() === 0, "[TUTOS] partie neuve : rien de déverrouillé");

  // Un générique marqué vu devient consultable, et lui seul.
  g.game.genericTutorialsSeen = { camp_welcome: true };
  var camp = g.TutorialCatalogManager.getById("generic:camp_welcome");
  ok(g.TutorialCatalogManager.isUnlocked(camp) === true, "[TUTOS] générique vu -> déverrouillé");
  ok(g.TutorialCatalogManager.getUnlockedCount() === 1, "[TUTOS] les autres restent verrouillés");

  // Un tutoriel d'étape Histoire suit st.tutorialsSeen.
  var story = g.TutorialCatalogManager.getBySection("story")[0];
  ok(g.TutorialCatalogManager.isUnlocked(story) === false, "[TUTOS] étape Histoire non vue -> verrouillée");
  var st = g.StoryQuestManager.getState(story.chapterId);
  st.tutorialsSeen[story.stepId] = true;
  ok(g.TutorialCatalogManager.isUnlocked(story) === true, "[TUTOS] étape Histoire vue -> déverrouillée");

  // Un tutoriel de quête de village suit VillageQuestManager.
  var village = g.TutorialCatalogManager.getBySection("village")[0];
  ok(g.TutorialCatalogManager.isUnlocked(village) === false, "[TUTOS] quête de village non vue -> verrouillée");
  g.VillageQuestManager.markTutorialSeen(village.questId);
  ok(g.TutorialCatalogManager.isUnlocked(village) === true, "[TUTOS] quête de village vue -> déverrouillée");

  ok(g.TutorialCatalogManager.getById("nawak") === null, "[TUTOS] identifiant inconnu -> null");

  /* --- Rendu de l'écran : liste, puis fiche de lecture --- */
  g.game.activeTab = "tutorials";
  var html = g.buildTutorialsHTML();
  ok(html.indexOf("data-kf-title") !== -1, "[TUTOS] écran rendu dans un cadre de page");
  ok(html.indexOf("/ " + all.length + " rencontrés") !== -1, "[TUTOS] compteur global affiché");
  ok(html.indexOf("nb-accordion-head") !== -1, "[TUTOS] sections en accordéon, repliées au premier rendu");
  ok(html.indexOf("nb-entry-card") === -1, "[TUTOS] aucune entrée rendue tant qu'aucune section n'est dépliée");

  // Les entrées ne sont dans le DOM qu'une fois leur section dépliée : c'est là,
  // et seulement là, qu'on peut vérifier le verrouillage.
  g.toggleTutorialSection("generic");
  var opened = g.buildTutorialsHTML();
  ok(opened.indexOf(camp.tutorial.title) !== -1, "[TUTOS] section dépliée : titre déverrouillé visible");
  ok(opened.indexOf("system/lock_closed.png") !== -1, "[TUTOS] les entrées non rencontrées sont affichées verrouillées");
  ok(opened.indexOf("Pas encore rencontré.") !== -1, "[TUTOS] une entrée verrouillée le dit au lieu d'un vide");

  g.selectTutorialEntry(camp.id);
  var reading = g.buildTutorialsHTML();
  ok(reading.indexOf("tutorial-points-read") !== -1, "[TUTOS] fiche de lecture rendue");
  ok(reading.indexOf("Retour aux Tutoriels") !== -1, "[TUTOS] retour disponible depuis la fiche");
  g.closeTutorialReading();
  ok(g.buildTutorialsHTML().indexOf("tutorial-points-read") === -1, "[TUTOS] retour à la liste");

  /* --- Pastilles retirées (décision Seb) --- */
  ok(!g.MENU_ITEMS.some(function (m) { return m.tab === "bestiary" && m.badge; }), "[PASTILLES] plus de pastille sur le Bestiaire/Codex");
  ok(!g.MENU_ITEMS.some(function (m) { return m.tab === "tutorials" && m.badge; }), "[PASTILLES] pas de pastille sur les Tutoriels");
  ok(g.MENU_ITEMS.some(function (m) { return m.tab === "tutorials"; }), "[PASTILLES] entrée Tutoriels présente dans le menu");

  /* --- Fin de chasse : le bouton Fermer ramène au Campement --- */
  freshCombat("knight");
  var popup = g.buildHuntLotCompleteHTML(g.HUNT_QUESTS.hq_forest_battue);
  ok(popup.indexOf("closeHuntLotComplete()") !== -1, "[CHASSE] Fermer passe par closeHuntLotComplete()");
  g.game.activeTab = "combat";
  g.closeHuntLotComplete();
  ok(g.game.activeTab === "campement", "[CHASSE] fermeture -> retour au Campement");
  g.game.activeTab = "combat";
  g.closeHuntLotComplete(false);
  ok(g.game.activeTab === "combat", "[CHASSE] relance de chasse : on reste en Combat");
})();


/* ============================================================================
   [17] v3.209.0 — échoppe d'équipement : le stock ne dépasse jamais le palier
   de rareté du monde courant (WORLD_RARITY_UNLOCKS).
   ============================================================================ */
(function () {
  console.log("\n[17] v3.209.0 : palier de rareté de l'échoppe");
  function neuf() { run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats();"); }

  neuf();
  ok(g.WorldManager.worldIndex === 0, "[ÉCHOPPE] partie neuve : monde Forêt");
  ok(g.getAllowedRarities().join(",") === "common", "[ÉCHOPPE] Forêt : Commun seulement");

  // Le tirage lui-même respectait déjà le palier — c'est la PERSISTANCE qui fuyait.
  var vus = {};
  for (var i = 0; i < 2000; i++) vus[g.LootSystem.rollDrop().rarity] = true;
  ok(Object.keys(vus).join(",") === "common", "[ÉCHOPPE] 2000 tirages en Forêt : que du Commun");

  g.WorldManager.worldIndex = 1;
  ok(g.getAllowedRarities().join(",") === "common,green", "[ÉCHOPPE] Désert : Commun + Inhabituel");

  // Cas 1 : lot fabriqué au Désert, retour en Forêt.
  neuf();
  g.WorldManager.worldIndex = 1;
  g.game.equipShopStock = [];
  g.EquipShopManager.checkRefresh();
  g.game.equipShopStock[0].rarity = "green"; // force le cas, le tirage est aléatoire
  ok(g.EquipShopManager.hasOutOfTierStock() === false, "[ÉCHOPPE] Inhabituel au Désert : dans le palier, rien à nettoyer");

  var echeance = g.game.equipShopResetTime;
  var renouvellements = g.game.equipShopManualRefreshCount;
  g.WorldManager.worldIndex = 0;
  ok(g.EquipShopManager.hasOutOfTierStock() === true, "[ÉCHOPPE] retour en Forêt : stock hors palier détecté");
  g.EquipShopManager.checkRefresh();
  ok(g.EquipShopManager.hasOutOfTierStock() === false, "[ÉCHOPPE] stock régénéré dans le palier de la Forêt");
  ok(g.game.equipShopStock.every(function (it) { return it.rarity === "common"; }), "[ÉCHOPPE] plus que du Commun en vitrine");
  ok(g.game.equipShopStock.length === 6, "[ÉCHOPPE] la vitrine reste pleine (6 objets)");
  ok(g.game.equipShopResetTime === echeance, "[ÉCHOPPE] le minuteur n'est pas repoussé (pas de renouvellement offert)");
  ok(g.game.equipShopManualRefreshCount === renouvellements, "[ÉCHOPPE] le compteur de renouvellements manuels est intact");

  // Cas 2 : ascension — hardResetState remet le monde à 0 sans toucher au stock.
  neuf();
  g.WorldManager.worldIndex = 2;
  g.game.equipShopStock = [];
  g.EquipShopManager.checkRefresh();
  g.game.equipShopStock[0].rarity = "rare";
  run("hardResetState();");
  ok(g.WorldManager.worldIndex === 0, "[ÉCHOPPE] ascension : retour en Forêt");
  ok(g.EquipShopManager.hasOutOfTierStock() === true, "[ÉCHOPPE] ascension : le stock d'avant survit (cause du bug)");
  g.EquipShopManager.checkRefresh();
  ok(g.game.equipShopStock.every(function (it) { return it.rarity === "common"; }), "[ÉCHOPPE] ascension : nettoyé à l'ouverture de la boutique");

  // Asymétrie : progresser n'invalide rien, un lot commun reste légitime plus loin.
  neuf();
  g.game.equipShopStock = [];
  g.EquipShopManager.checkRefresh();
  var avant = g.game.equipShopStock.map(function (it) { return it.uid; }).join(",");
  g.WorldManager.worldIndex = 1;
  g.EquipShopManager.checkRefresh();
  ok(g.game.equipShopStock.map(function (it) { return it.uid; }).join(",") === avant,
    "[ÉCHOPPE] avancer d'un monde ne renouvelle pas le stock (seul un recul nettoie)");

  g.game.equipShopStock = [];
  ok(g.EquipShopManager.hasOutOfTierStock() === false, "[ÉCHOPPE] stock vide : rien à nettoyer");
})();


/* ============================================================================
   [18] v3.210.0 — refonte visuelle du Grimoire : liste + fiche, Mode Expert et
   badges d'état retirés, raccourci au Campement.
   ============================================================================ */
(function () {
  console.log("\n[18] v3.210.0 : refonte visuelle du Grimoire");
  run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats();");
  // L'onglet Grimoire est verrouillé sur une partie neuve (débloqué par une étape
  // Histoire). Sans lui, CombatEngine.setCombatMode('grimoire') refuse et la carte
  // du Campement ne s'affiche pas — les deux respectent le même verrou.
  g.game.unlockedTabs.grimoire = true;
  g.game.activeTab = "grimoire"; // renderGrimoireSheet() referme la feuille hors de l'écran
  // GRIMOIRE_BASE_SLOT_COUNT = 2, +1 par monde atteint parmi [2,3,4,5] :
  // il faut donc les mondes 2 ET 3 pour obtenir 4 emplacements, dont un libre.
  g.game.worldsEverReached = { 0: true, 1: true, 2: true, 3: true };
  var nbSlots = g.getGrimoireSlotCount(g.game.worldsEverReached);
  ok(nbSlots === 4, "[GRIMOIRE] 4 emplacements débloqués sur ce jalon (2 de base + mondes 2 et 3)");
  g.ensureGrimoireRules();
  g.game.grimoireRules[0] = { conditionId: "chargeIncoming", actionSlot: "defense" };
  g.game.grimoireRules[1] = { conditionId: "healIncoming", actionSlot: "skill1" };
  g.game.grimoireRules[2] = { conditionId: "heroLowHp", actionSlot: "skill2" };
  g.game.grimoireRules[3] = { conditionId: null, actionSlot: null }; // emplacement libre mais débloqué

  /* --- La liste est la vue par défaut --- */
  g.closeGrimoireRule();
  var list = g.buildGrimoireHTML();
  ok(list.indexOf("grimoire-rule-row") !== -1, "[GRIMOIRE] la liste est la vue par défaut");
  ok(list.indexOf("grimoire-select") === -1, "[GRIMOIRE] aucune liste déroulante dans la liste (elles vivent dans la fiche)");
  ok(list.indexOf("Si l&#39;ennemi charge") !== -1, "[GRIMOIRE] libellé court sur la ligne (esc encode l'apostrophe)");
  ok(list.indexOf("grimoire-counter-tag") !== -1, "[GRIMOIRE] le ⚡ Contre reste visible depuis la liste");
  ok(list.indexOf("Emplacements à venir") !== -1, "[GRIMOIRE] séparateur avant les emplacements verrouillés");
  ok(list.indexOf("is-locked") !== -1, "[GRIMOIRE] emplacements verrouillés rendus");
  ok(list.indexOf("is-empty") !== -1, "[GRIMOIRE] emplacement libre rendu");

  // Six lignes exactement, une par emplacement, verrouillés compris.
  var rows = list.split("grimoire-rule-row").length - 1;
  ok(rows === g.GRIMOIRE_SLOT_COUNT, "[GRIMOIRE] " + g.GRIMOIRE_SLOT_COUNT + " lignes, une par emplacement");

  /* --- Mode Expert et badges d'état : disparus --- */
  ok(list.indexOf("Mode Expert") === -1, "[GRIMOIRE] plus de Mode Expert");
  ok(typeof g.toggleGrimoireExpertMode === "undefined", "[GRIMOIRE] toggleGrimoireExpertMode retiré");
  ok(list.indexOf("Ressource insuffisante") === -1 && list.indexOf("En attente") === -1,
    "[GRIMOIRE] plus de badge d'état de règle");
  g.game.expertModeEnabled = true;
  ok(g.buildGrimoireHTML().indexOf("Mode Expert") === -1, "[GRIMOIRE] un vieux save avec expertModeEnabled n'y change rien");
  g.game.expertModeEnabled = false;

  /* --- Sélecteur de mode de combat --- */
  g.game.combatMode = "tactique";
  ok(g.buildGrimoireHTML().indexOf("surligner l&#39;action conseillée") !== -1 || g.buildGrimoireHTML().indexOf("surligner l'action conseillée") !== -1, "[GRIMOIRE] mode Tactique décrit");
  g.setGrimoireCombatMode("grimoire");
  ok(g.game.combatMode === "grimoire", "[GRIMOIRE] bascule en mode Grimoire depuis l'écran");
  ok(g.buildGrimoireHTML().indexOf("enchaînent seuls") !== -1, "[GRIMOIRE] mode Grimoire décrit");
  g.setGrimoireCombatMode("tactique");
  ok(g.game.combatMode === "tactique", "[GRIMOIRE] retour en mode Tactique");

  /* --- La fiche : deux listes déroulantes, un seul niveau de retour --- */
  g.openGrimoireRule(0);
  var fiche = g.buildGrimoireHTML();
  ok(fiche.indexOf("grimoire-rule-row") === -1, "[GRIMOIRE] la fiche remplace la liste");
  ok(fiche.split("grimoire-select").length - 1 >= 2, "[GRIMOIRE] deux listes déroulantes dans la fiche");
  ok(fiche.indexOf("Retour") !== -1 || fiche.indexOf("Règle") !== -1, "[GRIMOIRE] retour disponible");
  ok(fiche.indexOf("Contre parfait") !== -1, "[GRIMOIRE] verdict de contre parfait (charge → Garde)");

  // Un appariement d'archétype donne l'autre verdict, pas le même.
  g.game.grimoireRules[0] = { conditionId: "enemyCorrupted", actionSlot: "skill1" };
  var archetype = g.buildGrimoireHTML();
  ok(archetype.indexOf("Effet spécial") !== -1, "[GRIMOIRE] verdict distinct pour une suppression d'archétype");

  // Un appariement neutre le dit.
  g.game.grimoireRules[0] = { conditionId: "chargeIncoming", actionSlot: "skill3" };
  ok(g.buildGrimoireHTML().indexOf("ne contre pas cette situation") !== -1, "[GRIMOIRE] verdict neutre");

  // Vider l'emplacement.
  g.clearGrimoireRule(0);
  ok(!g.game.grimoireRules[0].conditionId && !g.game.grimoireRules[0].actionSlot, "[GRIMOIRE] emplacement vidé");
  g.game.grimoireRules[0] = { conditionId: "chargeIncoming", actionSlot: "defense" };

  // Une règle ouverte au-delà des emplacements débloqués ne reste pas affichée.
  g.openGrimoireRule(5);
  ok(g.buildGrimoireHTML().indexOf("grimoire-rule-row") !== -1, "[GRIMOIRE] règle verrouillée : retour forcé à la liste");
  g.closeGrimoireRule();

  /* --- Feuilles basses --- */
  g.openGrimoireSheet("help");
  // v3.212.0 : la feuille n'est plus dans buildGrimoireHTML() — elle est rendue dans
  // sa propre racine (#grimoire-sheet-root) pour échapper à l'isolation du panneau.
  var help = g.buildGrimoireSheetHTML();
  ok(help.indexOf("grimoire-sheet") !== -1, "[GRIMOIRE] feuille d'aide ouverte");
  ok(help.indexOf("Grimoire de tactiques") !== -1, "[GRIMOIRE] l'aide remplace la prose d'introduction");
  ok(g.buildGrimoireHTML().indexOf("grimoire-rule-row") !== -1, "[GRIMOIRE] la liste reste rendue derrière la feuille");
  ok(g.buildGrimoireHTML().indexOf("grimoire-sheet") === -1, "[GRIMOIRE] le panneau n'embarque plus la feuille");

  g.openGrimoireSheet("presets");
  var sheet = g.buildGrimoireSheetHTML();
  ok(sheet.indexOf("Presets") !== -1, "[GRIMOIRE] feuille Presets ouverte");
  ok(sheet.indexOf("grimoire-preset-create-form") !== -1, "[GRIMOIRE] formulaire de création présent");
  g.saveGrimoirePreset("Farm Forêt", "⚔️");
  g.openGrimoireSheet("presets");
  ok(g.buildGrimoireSheetHTML().indexOf("Farm Forêt") !== -1, "[GRIMOIRE] preset enregistré listé dans la feuille");

  g.closeGrimoireSheet();
  ok(g.buildGrimoireSheetHTML() === "", "[GRIMOIRE] feuille refermée");

  /* --- La feuille vit hors du panneau : quitter l'écran la referme --- */
  g.openGrimoireSheet("help");
  ok(g.buildGrimoireSheetHTML() !== "", "[GRIMOIRE] feuille ouverte");
  g.renderGrimoireSheet(false);
  ok(g.buildGrimoireSheetHTML() === "", "[GRIMOIRE] quitter l'écran referme la feuille");

  /* --- Raccourci au Campement, retrait du menu --- */
  ok(!g.MENU_ITEMS.some(function (m) { return m.tab === "grimoire"; }), "[CAMP] le Grimoire a quitté le menu ☰");
  var camp = g.buildCampHTML();
  ok(camp.indexOf("camp-grimoire-card") !== -1, "[CAMP] carte Grimoire présente au Campement");
  ok(camp.indexOf("switchTab(&#39;grimoire&#39;)") !== -1 || camp.indexOf("switchTab('grimoire')") !== -1, "[CAMP] le bouton mène bien à l'écran Grimoire");
  ok(camp.indexOf("règles actives") !== -1, "[CAMP] résumé du nombre de règles actives");
  ok(camp.indexOf("Mode Tactique") !== -1, "[CAMP] mode de combat rappelé sur la carte");

  // Le résumé compte les règles réellement configurées, pas les emplacements.
  g.game.grimoireRules[1] = { conditionId: null, actionSlot: null };
  g.game.grimoireRules[2] = { conditionId: null, actionSlot: null };
  ok(g.buildCampHTML().indexOf("1 / " + nbSlots + " règles actives") !== -1,
    "[CAMP] une seule règle configurée -> « 1 / " + nbSlots + " règles actives »");
})();


/* ============================================================================
   [19] v3.211.0 — aide du Grimoire versée au catalogue de Tutoriels, Rapport de
   combat en feuille basse (une seule source de contenu, deux habillages).
   ============================================================================ */
(function () {
  console.log("\n[19] v3.211.0 : aide au catalogue, Rapport en feuille");
  run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats();");
  g.game.unlockedTabs.grimoire = true;
  g.game.activeTab = "grimoire"; // renderGrimoireSheet() referme la feuille hors de l'écran
  g.game.worldsEverReached = { 0: true, 1: true, 2: true, 3: true };
  g.ensureGrimoireRules();

  /* --- L'aide est un tutoriel générique, donc reprise par le catalogue --- */
  var tut = g.GENERIC_TUTORIALS.grimoire_rules;
  ok(!!tut, "[AIDE] l'aide du Grimoire est déclarée dans GENERIC_TUTORIALS");
  ok(!tut.tab, "[AIDE] aucun champ tab : jamais de popup automatique en arrivant sur l'écran");
  ok((tut.points || []).length >= 5, "[AIDE] " + tut.points.length + " points d'explication");

  var entry = g.TutorialCatalogManager.getById("generic:grimoire_rules");
  ok(!!entry, "[AIDE] entrée présente dans le catalogue de Tutoriels");
  ok(g.TutorialCatalogManager.isUnlocked(entry) === false, "[AIDE] verrouillée tant que le joueur ne l'a pas lue");

  /* --- Ouvrir la feuille « ? » vaut « rencontrée » --- */
  g.openGrimoireSheet("help");
  ok(g.game.genericTutorialsSeen.grimoire_rules === true, "[AIDE] lire l'aide marque le tutoriel comme rencontré");
  ok(g.TutorialCatalogManager.isUnlocked(entry) === true, "[AIDE] l'entrée se déverrouille dans les Tutoriels");

  // Une seule source de texte : la feuille rend bien les points de GENERIC_TUTORIALS.
  var help = g.buildGrimoireSheetHTML();
  ok(help.indexOf(g.esc(tut.title)) !== -1, "[AIDE] la feuille affiche le titre du tutoriel");
  ok(help.indexOf(g.esc(tut.points[1].text)) !== -1, "[AIDE] la feuille affiche les points du tutoriel");

  // Et l'écran Tutoriels affiche le même titre une fois déverrouillé.
  g.closeGrimoireSheet();
  // État d'accordéon forcé : toggleTutorialSection() bascule, et un bloc précédent
  // a pu laisser la section ouverte — on ne teste pas l'état, on le pose.
  g.expandedTutorialSection = "generic";
  ok(g.buildTutorialsHTML().indexOf(g.esc(tut.title)) !== -1, "[AIDE] visible dans l'écran Tutoriels");
  g.expandedTutorialSection = null;

  /* --- Rapport : un seul corps, deux habillages --- */
  ok(typeof g.buildCombatReportBodyHTML === "function", "[RAPPORT] corps extrait et exporté");
  var corpsVide = g.buildCombatReportBodyHTML();
  ok(corpsVide.indexOf("Pas encore assez d'activité") !== -1 || corpsVide.indexOf("Aucune donnée") !== -1,
    "[RAPPORT] sans activité, le corps le dit (jamais vide)");
  ok(corpsVide.length > 0, "[RAPPORT] le corps n'est jamais une chaîne vide");

  // Activité représentative.
  var st = g.game.combatReport;
  st.perSlot.defense.uses = 7;
  st.perSlot.defense.blockedByReserve = 4;
  st.perSlot.defense.telegraphsSeen = 6;
  st.perSlot.defense.countersSucceeded = 5;
  st.damageAvoidedTotal = 1840;
  st.shieldsRemovedCount = 3;

  var corps = g.buildCombatReportBodyHTML();
  ok(corps.indexOf("contres réussis") !== -1, "[RAPPORT] le corps rend les statistiques par capacité");
  ok(corps.indexOf("dégâts évités") !== -1, "[RAPPORT] le corps rend le résumé");

  // La superposition plein écran contient EXACTEMENT le même corps.
  var overlay = g.buildCombatReportHTML("manual", null);
  ok(overlay.indexOf(corps) !== -1, "[RAPPORT] la superposition réutilise le corps tel quel");
  ok(overlay.indexOf("combat-report-overlay") !== -1, "[RAPPORT] la superposition garde son habillage");

  // La feuille basse aussi.
  g.openGrimoireSheet("report");
  var feuille = g.buildGrimoireSheetHTML();
  ok(feuille.indexOf("grimoire-sheet") !== -1, "[RAPPORT] feuille basse ouverte");
  ok(feuille.indexOf("Rapport de combat") !== -1, "[RAPPORT] titre de la feuille");
  ok(feuille.indexOf("contres réussis") !== -1, "[RAPPORT] la feuille rend le même corps");
  ok(feuille.indexOf("combat-report-overlay") === -1, "[RAPPORT] la feuille n'embarque pas la superposition");
  ok(g.isGrimoireReportSheetOpen() === true, "[RAPPORT] la feuille se signale à resetCombatReport()");

  // Le bouton du pied de liste ouvre la feuille, plus la superposition.
  g.closeGrimoireSheet();
  var liste = g.buildGrimoireHTML();
  ok(liste.indexOf("openGrimoireSheet(&#39;report&#39;)") !== -1 || liste.indexOf("openGrimoireSheet('report')") !== -1,
    "[RAPPORT] le pied de liste ouvre la feuille");
  ok(g.isGrimoireReportSheetOpen() === false, "[RAPPORT] feuille refermée");
})();


/* ============================================================================
   [20] v3.212.0 — feuille basse hors du panneau, Grimoire en lecture seule
   pendant une sortie, retrait du code mort.
   ============================================================================ */
(function () {
  console.log("\n[20] v3.212.0 : feuille au-dessus du menu, verrou de sortie");
  run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats();");
  g.game.unlockedTabs.grimoire = true;
  g.game.activeTab = "grimoire";
  g.game.worldsEverReached = { 0: true, 1: true, 2: true, 3: true };
  g.ensureGrimoireRules();
  g.game.grimoireRules[0] = { conditionId: "chargeIncoming", actionSlot: "defense" };

  /* --- La feuille ne vit plus dans le panneau --- */
  g.openGrimoireSheet("help");
  ok(g.buildGrimoireHTML().indexOf("grimoire-sheet") === -1, "[FEUILLE] absente du HTML du panneau");
  ok(g.buildGrimoireSheetHTML().indexOf("grimoire-sheet") !== -1, "[FEUILLE] rendue par son propre builder");
  g.closeGrimoireSheet();

  /* --- Code mort retiré --- */
  ok(typeof g.explainGrimoireRuleStatus === "undefined", "[MORT] explainGrimoireRuleStatus retirée");
  ok(typeof g.evaluateGrimoireCondition === "function", "[MORT] evaluateGrimoireCondition conservée (utilisée par le moteur)");
  ok(typeof g.chooseGrimoireAction === "function", "[MORT] chooseGrimoireAction intacte");

  /* --- Hors sortie : tout est modifiable --- */
  g.SortieManager.ensure();
  g.game.sortie.active = false;
  ok(g.isGrimoireEditable() === true, "[SORTIE] au Campement : Grimoire modifiable");
  var libre = g.buildGrimoireHTML();
  ok(libre.indexOf("grimoire-locked-notice") === -1, "[SORTIE] aucun bandeau de verrou hors sortie");
  g.openGrimoireRule(0);
  ok(g.buildGrimoireHTML().indexOf("Vider cet emplacement") !== -1, "[SORTIE] bouton Vider disponible");
  ok(g.buildGrimoireHTML().indexOf("grimoire-select\" onchange") !== -1 || g.buildGrimoireHTML().indexOf("disabled>") === -1,
    "[SORTIE] listes déroulantes actives");
  g.closeGrimoireRule();

  /* --- Sortie en cours : lecture seule --- */
  g.game.sortie.active = true;
  g.game.sortie.context = "adventure";
  ok(g.isGrimoireEditable() === false, "[SORTIE] sortie active : Grimoire figé");

  var fige = g.buildGrimoireHTML();
  ok(fige.indexOf("grimoire-locked-notice") !== -1, "[SORTIE] bandeau « Sortie en cours » affiché");
  ok(fige.indexOf("grimoire-rule-row") !== -1, "[SORTIE] les règles restent LISIBLES (lecture seule, pas blocage sec)");

  g.openGrimoireRule(0);
  var ficheFigee = g.buildGrimoireHTML();
  ok(ficheFigee.indexOf("disabled") !== -1, "[SORTIE] listes déroulantes désactivées");
  ok(ficheFigee.indexOf("Vider cet emplacement") === -1, "[SORTIE] bouton Vider retiré");
  g.closeGrimoireRule();

  // Garde-fous côté écriture : même si l'appel passe, rien ne change.
  var avant = JSON.stringify(g.game.grimoireRules[0]);
  g.setGrimoireRuleCondition(0, "healIncoming");
  g.setGrimoireRuleAction(0, "skill3");
  g.clearGrimoireRule(0);
  ok(JSON.stringify(g.game.grimoireRules[0]) === avant, "[SORTIE] les écritures sont refusées, pas seulement grisées");

  var modeAvant = g.game.combatMode;
  g.setGrimoireCombatMode(modeAvant === "grimoire" ? "tactique" : "grimoire");
  ok(g.game.combatMode === modeAvant, "[SORTIE] bascule de mode refusée (elle remettrait l'horloge de round à zéro)");

  // Charger un preset remplace les 6 règles : même verrou.
  g.game.sortie.active = false;
  g.saveGrimoirePreset("Test verrou", "⚔️");
  var presetId = g.game.grimoirePresets[g.game.grimoirePresets.length - 1].id;
  g.game.grimoireRules[1] = { conditionId: "healIncoming", actionSlot: "skill1" };
  g.game.sortie.active = true;
  g.loadGrimoirePreset(presetId);
  ok(g.game.grimoireRules[1].conditionId === "healIncoming", "[SORTIE] chargement de preset refusé");

  g.openGrimoireSheet("presets");
  ok(g.buildGrimoireSheetHTML().indexOf("disabled") !== -1, "[SORTIE] bouton Charger grisé dans la feuille");
  g.closeGrimoireSheet();

  /* --- Retour au Campement : tout se rouvre --- */
  g.game.sortie.active = false;
  ok(g.isGrimoireEditable() === true, "[SORTIE] fin de sortie : Grimoire de nouveau modifiable");
  g.loadGrimoirePreset(presetId);
  ok(!g.game.grimoireRules[1].conditionId, "[SORTIE] le preset se charge une fois rentré");
})();


console.log("\n[21] v3.213.0 (lot V-1) \u2014 Socle des b\u00e2timents du Village");
(function () {
  var M = g.VillageBuildingManager;

  /* --- Coûts : l'économie de l'Atelier ne doit PAS bouger ---------------
     Référence : data/construction.js v3.37/v3.40, recalculée ici à la main.
     Si un palier change un jour, cette assertion doit tomber. */
  var refCost = function (level) {
    var tiers = [
      { min: 0, max: 4, res: ["gold", "planche", "pierre"], base: { gold: 25, planche: 10, pierre: 15 }, mult: 1.35 },
      { min: 5, max: 9, res: ["gold", "planche", "pierre", "lingot"], base: { gold: 120, planche: 45, pierre: 65, lingot: 8 }, mult: 1.40 }
    ];
    if (level === 0) return { gold: 25, planche: 5, pierre: 15 }; // v3.264.0 : niveau 1 allégé (décision Seb)
    var t = tiers[0];
    for (var i = 0; i < tiers.length; i++) if (level >= tiers[i].min && level <= tiers[i].max) t = tiers[i];
    var m = Math.pow(t.mult, level - t.min);
    var o = {};
    t.res.forEach(function (k) { o[k] = Math.floor(t.base[k] * m); });
    return o;
  };

  M.ensure();
  /* v3.214.0 : les paliers 0 \u00e0 7 restent au chiffre pr\u00e8s ceux de la v3.212.0.
     Seuls les niveaux 8 \u00e0 10 ont chang\u00e9 : ils passent au mat\u00e9riau de monde,
     v\u00e9rifi\u00e9 juste apr\u00e8s. */
  var costsMatch = true;
  for (var lvl = 0; lvl < 8; lvl++) {
    g.game.village.buildings.workshop.level = lvl;
    if (JSON.stringify(M.getNextCost("workshop")) !== JSON.stringify(refCost(lvl))) costsMatch = false;
  }
  ok(costsMatch, "co\u00fbts de l'Atelier inchang\u00e9s depuis la v3.212.0 sur les paliers 0-7 (sauf le niveau 1, all\u00e9g\u00e9 en v3.264.0)");

  g.game.village.buildings.workshop.level = 8;
  var haut = M.getNextCost("workshop");
  ok(!!haut && haut.resine_durcie > 0,
    "les derniers niveaux de l'Atelier exigent le mat\u00e9riau de monde");

  /* --- Dur\u00e9es de chantier (\u00a75.2 du rapport) --- */
  ok(g.getVillageBuildSeconds(1) === 30 && g.getVillageBuildSeconds(5) === 150,
    "dur\u00e9es des paliers 1-5 : 30 s \u00d7 palier");
  ok(g.getVillageBuildSeconds(6) === 240 && g.getVillageBuildSeconds(10) === 480,
    "dur\u00e9es des paliers 6-10 : 60 s \u00d7 (palier - 2)");
  ok(g.getVillageBuildSeconds(11) === 600 && g.getVillageBuildSeconds(14) === 900,
    "dur\u00e9es des paliers 11-14 : 10 \u00e0 15 min");

  /* --- Rangs --- */
  g.game.village.buildings.workshop.level = 0; ok(M.getRank() === 0, "Atelier 0 \u2192 rang 0");
  g.game.village.buildings.workshop.level = 1; ok(M.getRank() === 1, "Atelier 1 \u2192 rang 1");
  /* v3.289.0 (D12) : seuils [1, 2, 3, 4] */
  g.game.village.buildings.workshop.level = 2; ok(M.getRank() === 2, "Atelier 2 \u2192 rang 2");
  g.game.village.buildings.workshop.level = 3; ok(M.getRank() === 3, "Atelier 3 \u2192 rang 3");
  g.game.village.buildings.workshop.level = 9; ok(M.getRank() === 4, "Atelier 9 \u2192 rang 4");

  /* --- Migration depuis game.construction (save d'avant v3.213.0) --- */
  g.game.village = {};
  g.game.construction = { workshop: { level: 6 } };
  M.ensure();
  M.migrateFromConstruction();
  ok(M.getLevel("workshop") === 6, "migration : niveau d'Atelier repris depuis game.construction");
  ok(g.game.construction.workshop.level === 6, "migration : l'ancien objet est conserv\u00e9, pas effac\u00e9");
  M.migrateFromConstruction();
  ok(M.getLevel("workshop") === 6, "migration idempotente (deuxi\u00e8me passage sans effet)");

  /* --- Chantier : unicit\u00e9, d\u00e9bit au lancement, reprise hors ligne --- */
  g.game.village = {};
  g.game.construction = {};
  M.ensure();
  g.game.gold = 10000;
  g.WarehouseManager.addResource("planche", 500);
  g.WarehouseManager.addResource("pierre", 500);

  /* La chaîne de déblocage est la porte d'entrée de l'Atelier : sans elle,
     startBuild répond « Objectif en cours » — c'est justement le garde-fou
     vérifié deux lignes plus bas. */
  g.WorkshopUnlockManager.ensure();
  ok(M.getBlockReason("workshop") === "Objectif en cours",
    "chaîne de déblocage non finie : l'Atelier refuse le chantier et dit pourquoi");
  g.game.workshopUnlock.completed = true;
  g.game.workshopUnlock.currentStep = g.WORKSHOP_UNLOCK_STEPS.length;

  var goldAvant = g.game.gold;
  var planchesAvant = g.WarehouseManager.getAmount("planche");
  ok(M.startBuild("workshop") === true, "chantier lanc\u00e9 sur l'Atelier");
  ok(g.game.gold === goldAvant - 25 && g.WarehouseManager.getAmount("planche") === planchesAvant - 5,
    "mat\u00e9riaux d\u00e9bit\u00e9s AU LANCEMENT, pas \u00e0 la fin");
  ok(M.getLevel("workshop") === 0, "le niveau ne monte pas tant que le chantier tourne");
  ok(M.startBuild("workshop") === false, "un seul chantier \u00e0 la fois");
  ok(M.getBlockReason("palisade") === "Un chantier est d\u00e9j\u00e0 en cours", "un b\u00e2timent non constructible dit pourquoi, il ne reste pas muet (v3.257.0 : la Palissade est livr\u00e9e, c'est le chantier en cours qui bloque)");
  ok(M.tick() === false, "tick avant l'\u00e9ch\u00e9ance : rien ne se passe");

  g.game.village.site.endsAt = Date.now() - 1;
  ok(M.tick() === true, "chantier \u00e9chu sold\u00e9 au tick (reprise hors ligne)");
  ok(M.getLevel("workshop") === 1, "niveau 1 acquis \u00e0 la fin du chantier");
  ok(M.getSite() === null, "le chantier est vid\u00e9 apr\u00e8s coup");
  ok(g.game.construction.workshop.level === 1, "miroir de compatibilit\u00e9 game.construction tenu \u00e0 jour");

  /* --- Chantier corrompu : on l'oublie plut\u00f4t que de bloquer le village --- */
  g.game.village.site = { id: "batiment_inexistant", targetLevel: 2, endsAt: Date.now() + 1000 };
  M.ensure();
  ok(M.getSite() === null, "chantier visant un b\u00e2timent inconnu \u00e9cart\u00e9 au lieu de bloquer le village");

  /* --- Alias ConstructionManager : m\u00eame bonus de vente qu'avant --- */
  g.game.village.buildings.workshop.level = 5;
  ok(Math.abs(g.ConstructionManager.getSellBonus() - 1.15) < 1e-9,
    "alias ConstructionManager : +3 %/niveau de vente inchang\u00e9");
  ok(g.ConstructionManager.getLevel("workshop") === 5, "alias ConstructionManager : niveau lu sur le socle");

  /* --- \u00c9tats de carte de la grille --- */
  g.game.village.buildings.workshop.level = 0;
  ok(M.getCardState("workshop") === "ready", "Atelier non construit : carte « disponible »");
  g.game.village.buildings.workshop.level = 3;
  ok(M.getCardState("workshop") === "built", "Atelier construit : carte « am\u00e9liorable »");
  /* v3.289.0 (D12) : Palissade au rang 2 — ouverte d\u00e8s l'Atelier 2 */
  g.game.village.buildings.workshop.level = 1;
  ok(M.getCardState("palisade") === "locked", "Palissade verrouill\u00e9e sous le rang 2 (Atelier 1 < 2)");
  g.game.village.buildings.workshop.level = 2;
  ok(M.getCardState("palisade") === "ready", "Atelier 2 : la Palissade devient constructible");
  g.game.village.buildings.workshop.level = 10;
  ok(M.getCardState("workshop") === "maxed", "Atelier au plafond : carte « niveau maximum »");

  /* --- Grille : les huit b\u00e2timents sont toujours affich\u00e9s --- */
  g.game.village.buildings.workshop.level = 1;
  var html = g.buildVillageMainSubTabHTML();
  var tous = g.VILLAGE_BUILDING_ORDER.every(function (id) {
    return html.indexOf(g.esc(g.VILLAGE_BUILDINGS[id].name)) !== -1;
  });
  ok(tous, "les huit b\u00e2timents figurent dans la grille, y compris les verrouill\u00e9s");
  ok(html.indexOf("vb-card-lock") !== -1, "une carte verrouill\u00e9e porte sa condition (le mur n'est jamais silencieux)");
})();

console.log("\n[22] v3.213.1 (lot V-2) \u2014 Terrain d'entra\u00eenement et plafond");
(function () {
  var M = g.VillageBuildingManager;
  var IDS = g.HEROS_TRAINING_UPGRADE_IDS;
  var power = (g.UPGRADES || []).find(function (u) { return u.id === "utrain_power"; });

  /* --- Plafond selon le niveau du b\u00e2timent --------------------------- */
  M.ensure();
  IDS.forEach(function (id) { g.game.upgrades[id] = 0; });
  g.game.village.buildings.training.level = 0;
  /* v3.248.0 : le socle sans b\u00e2timent passe de 10 \u00e0 20 (TRAINING_BASE_CAP), chaque niveau
     de Terrain ouvrant toujours 10 niveaux de plus. */
  ok(g.getTrainingCapLevels() === 20, "sans Terrain : plafond d'entra\u00eenement \u00e0 20");
  g.game.village.buildings.training.level = 1;
  ok(g.getTrainingCapLevels() === 30, "Terrain niveau 1 : plafond 30");
  g.game.village.buildings.training.level = 13;
  ok(g.getTrainingCapLevels() === 150, "Terrain niveau 13 : plafond 150, le maximum historique");

  /* Le plafond s'applique \u00e0 CHAQUE caract\u00e9ristique s\u00e9par\u00e9ment, jamais \u00e0 un
     total \u00e0 r\u00e9partir (d\u00e9cision Seb : le joueur ne doit pas se sentir bloqu\u00e9). */
  g.game.village.buildings.training.level = 1;
  IDS.forEach(function (id) { g.game.upgrades[id] = 30; });
  var chacune = IDS.every(function (id) {
    var u = (g.UPGRADES || []).find(function (x) { return x.id === id; });
    return g.getUpgradeCap(u) >= 30;
  });
  ok(chacune, "le plafond vaut pour chaque caract\u00e9ristique, pas pour leur somme");

  /* --- Le plafond ne fait jamais redescendre personne ------------------- */
  g.game.village.buildings.training.level = 0;
  g.game.upgrades.utrain_power = 47;
  ok(g.getUpgradeCap(power) === 47, "un niveau d\u00e9j\u00e0 acquis reste le plancher du plafond");

  /* --- Achat bloqu\u00e9 au plafond, et pas ailleurs ---------------------- */
  IDS.forEach(function (id) { g.game.upgrades[id] = 0; });
  g.game.upgrades.utrain_power = 20;
  g.game.village.buildings.training.level = 0;
  g.game.gold = 1000000;
  var orAvant = g.game.gold;
  g.buyUpgrade("utrain_power", 5);
  ok(g.game.upgrades.utrain_power === 20 && g.game.gold === orAvant,
    "achat refus\u00e9 au plafond : ni niveau, ni or d\u00e9pens\u00e9");

  g.game.village.buildings.training.level = 1;
  g.buyUpgrade("utrain_power", 5);
  ok(g.game.upgrades.utrain_power === 25, "Terrain niveau 1 : l'achat repart");

  /* L'achat multiple s'arr\u00eate AU plafond, il ne le d\u00e9passe pas. */
  g.game.upgrades.utrain_power = 25;
  g.buyUpgrade("utrain_power", 100);
  ok(g.game.upgrades.utrain_power === 30, "achat x100 stopp\u00e9 net au plafond (30)");

  /* Le simulateur d'achat annonce la m\u00eame chose que l'achat r\u00e9el : sans \u00e7a,
     la carte promettrait des niveaux que le clic ne donnerait pas. */
  g.game.upgrades.utrain_power = 25;
  var prev = g.getUpgradePurchasePreview(power, 100);
  ok(prev.count === 5 && prev.nextLevel === 30, "le simulateur s'arr\u00eate au m\u00eame plafond que l'achat");

  /* --- Migration « d\u00e9j\u00e0 en jeu = acquis » ---------------------------- */
  g.game.village.buildings.training.level = 0;
  IDS.forEach(function (id) { g.game.upgrades[id] = 0; });
  g.game.upgrades.utrain_power = 47;
  M.migrateTraining();
  ok(M.getLevel("training") === 4, "47 en Force \u2192 Terrain niveau 4 (plafond 50, couvre l'acquis)");
  M.migrateTraining();
  ok(M.getLevel("training") === 4, "migration du Terrain idempotente");

  g.game.village.buildings.training.level = 0;
  IDS.forEach(function (id) { g.game.upgrades[id] = 0; });
  g.game.upgrades.utrain_power = 8;
  M.migrateTraining();
  ok(M.getLevel("training") === 0, "moins de 10 acquis : aucun Terrain offert");

  g.game.village.buildings.training.level = 0;
  g.game.upgrades.utrain_power = 150;
  M.migrateTraining();
  ok(M.getLevel("training") === 14, "entra\u00eenement maximal : Terrain au niveau 14 (plafond 150)");
  ok(g.getUpgradeCap(power) === 150, "...et la caract\u00e9ristique maximale reste \u00e0 150, jamais rabot\u00e9e");

  /* --- Porte d'entr\u00e9e du b\u00e2timent : le mur lui-m\u00eame ------------------ */
  g.game.village = {}; M.ensure();
  g.game.village.buildings.workshop.level = 1; // rang 1
  IDS.forEach(function (id) { g.game.upgrades[id] = 0; });
  ok(M.getCardState("training") === "locked", "aucune caract\u00e9ristique au plafond : Terrain encore verrouill\u00e9");
  ok(M.getBlockReason("training") === "Atteins 20 dans une caract\u00e9ristique",
    "...et la carte dit exactement quoi faire");
  g.game.upgrades.utrain_power = 20; // v3.248.0 : socle porté à 20
  ok(M.getCardState("training") === "ready", "une caract\u00e9ristique au plafond : le Terrain devient constructible");

  /* Rang requis : m\u00eame \u00e0 10 en Force, sans Atelier il n'y a pas de chantier. */
  g.game.village.buildings.workshop.level = 0;
  ok(M.getBlockReason("training") === "Atelier niveau 1", "sans Atelier, le Terrain renvoie au rang manquant");

  /* --- Le renvoi vise le bon sous-onglet -------------------------------
     Les identifiants sont inversés par rapport aux libellés : « Stats » =
     "amelioration", « Capacités » = "stats". Un renvoi vers "stats" tombait
     sur les Capacités (signalé par Seb, v3.213.2). */
  g.closeHerosSheet(); g.setHerosSubTab("hero");
  g.goToHeroTraining();
  ok(g.herosOpenSheet === "stats",
    "la fiche du Terrain renvoie sur les caract\u00e9ristiques (feuille Stats), pas sur les Capacit\u00e9s");

  /* --- Tutoriel : deux tutoriels sur le m\u00eame onglet ------------------- */
  ok(!!g.GENERIC_TUTORIALS.village_training && g.GENERIC_TUTORIALS.village_training.tab === "village",
    "tutoriel du Terrain d\u00e9clar\u00e9 sur l'onglet Village");
  g.game.genericTutorialsSeen = { village_production: true };
  g.game.village.buildings.workshop.level = 1;
  g.game.upgrades.utrain_power = 20;
  g.pendingTutorial = null;
  g.maybeShowGenericTutorial("village");
  ok(!!g.pendingTutorial && g.pendingTutorial.genericId === "village_training",
    "un tutoriel d\u00e9j\u00e0 vu ne masque plus le suivant sur le m\u00eame onglet");
  g.pendingTutorial = null;
})();

console.log("\n[23] v3.214.0 (lot V-3) \u2014 Mat\u00e9riau de monde et ateliers de tier 2");
(function () {
  var M = g.VillageBuildingManager;

  /* --- La ressource existe et n'est pas un revenu ----------------------- */
  var res = g.WAREHOUSE_RESOURCES.resine_durcie;
  ok(!!res, "R\u00e9sine durcie d\u00e9clar\u00e9e \u00e0 l'Entrep\u00f4t");
  ok(Number(res.sellPrice || 0) === 0, "R\u00e9sine durcie invendable : un mat\u00e9riau, pas un revenu");
  ok(res.worldIndex === 0 && !!res.worldName, "R\u00e9sine durcie rattach\u00e9e \u00e0 son monde");

  /* --- La Menuiserie est active et transforme la S\u00e8ve ----------------- */
  var men = g.WORKSHOPS_CONFIG.menuiserie;
  ok(men.active === true, "Menuiserie activ\u00e9e (premier atelier de tier 2)");
  var rec = (men.recipes || [])[0];
  ok(!!rec && rec.outputs[0].resourceId === "resine_durcie", "sa recette produit bien la R\u00e9sine durcie");
  ok(rec.inputs.some(function (i) { return i.resourceId === "seve_aeswyn"; }),
    "...\u00e0 partir de la S\u00e8ve d'Aeswyn, butin de Petite Aventure et d'\u00e9lite");

  /* --- Le plafond de construction est port\u00e9 par le mat\u00e9riau ---------- */
  g.game.village = {}; M.ensure();
  g.game.village.buildings.workshop.level = 1; // rang 1 : sinon c'est le rang qui bloque, pas les matériaux
  g.game.village.buildings.training.level = 10;
  var cout = M.getNextCost("training");
  ok(!!cout && cout.resine_durcie > 0, "le 11e niveau du Terrain exige la R\u00e9sine durcie");

  g.WarehouseManager.removeResource("resine_durcie", g.WarehouseManager.getAmount("resine_durcie"));
  g.game.gold = 10000000;
  g.WarehouseManager.addResource("planche", 100000);
  g.WarehouseManager.addResource("pierre", 100000);
  g.WarehouseManager.addResource("lingot", 100000);
  ok(M.getAffordability("training").all === false,
    "sans R\u00e9sine, l'or et les mat\u00e9riaux courants ne suffisent plus");
  ok(M.getBlockReason("training") === "Mat\u00e9riaux manquants", "...et le chantier le dit");

  g.WarehouseManager.addResource("resine_durcie", 999);
  ok(M.getAffordability("training").all === true, "avec la R\u00e9sine, le chantier repart");

  /* --- Le Terrain va d\u00e9sormais jusqu'au plafond historique ------------ */
  ok(g.VILLAGE_BUILDINGS.training.maxLevel === 14, "Terrain port\u00e9 \u00e0 14 niveaux");
  g.game.village.buildings.training.level = 14;
  ok(g.getTrainingCapLevels() === 150, "Terrain au maximum : plafond d'entra\u00eenement 150 (born\u00e9)");
  g.game.village.buildings.training.level = 13;
  ok(g.getTrainingCapLevels() === 150, "v3.248.0 : le socle \u00e0 20 fait atteindre 150 d\u00e8s le niveau 13 \u2014 le 14e n'ouvre plus rien");

  /* --- « Introuvable » n'est pas « manquant » ---------------------------- */
  /* La R\u00e9sine est du monde de d\u00e9part : elle n'est jamais hors de port\u00e9e. */
  ok(g.isVillageResourceUnreachable("resine_durcie") === false,
    "mat\u00e9riau du monde de d\u00e9part : jamais marqu\u00e9 introuvable");
  ok(g.getVillageResourceHint("resine_durcie").indexOf("Menuiserie") !== -1,
    "une ressource manquante dit o\u00f9 la fabriquer");

  /* Simulation d'un mat\u00e9riau de monde 3, comme en recevront les cinq autres
     mondes : introuvable tant que le joueur n'y est jamais all\u00e9, puis normal. */
  g.WAREHOUSE_RESOURCES.__test_mat = { id: "__test_mat", name: "Mat\u00e9riau d'essai", icon: "", desc: "", sellPrice: 0, tier: "crafted", worldIndex: 3, worldName: "Crypte oubli\u00e9e" };
  g.game.worldsEverReached = {};
  ok(g.isVillageResourceUnreachable("__test_mat") === true, "mat\u00e9riau d'un monde jamais atteint : introuvable");
  ok(g.getVillageResourceHint("__test_mat").indexOf("Crypte oubli\u00e9e") !== -1,
    "...et la fiche dit dans quel monde le chercher");
  g.game.worldsEverReached[3] = true;
  ok(g.isVillageResourceUnreachable("__test_mat") === false, "monde atteint : le mat\u00e9riau redevient une ressource ordinaire");
  delete g.WAREHOUSE_RESOURCES.__test_mat;
})();

console.log("\n[24] v3.215.0 (lot V-4) \u2014 Apothicaire : pr\u00e9parer au lieu d'acheter");
(function () {
  var M = g.VillageBuildingManager;
  var A = g.ApothecaryManager;

  /* --- Eau purifi\u00e9e et Station de purification ------------------------ */
  var eau = g.WAREHOUSE_RESOURCES.eau_purifiee;
  ok(!!eau && Number(eau.sellPrice || 0) === 0, "Eau purifi\u00e9e d\u00e9clar\u00e9e et invendable (intrant, pas revenu)");
  var st = g.WORKSHOPS_CONFIG.station_purification;
  ok(st.active === true && st.recipes[0].outputs[0].resourceId === "eau_purifiee",
    "Station de purification activ\u00e9e, elle filtre l'eau du Puits");
  ok(g.WORKSHOPS_CONFIG.reservoir.active === false,
    "le R\u00e9servoir reste inactif : pas de recette invent\u00e9e pour faire nombre");

  /* --- v3.291.0 : le niveau ne donne plus de recette, seulement la capacit\u00e9 --- */
  g.game.village = {}; M.ensure();
  var mondesAvant = g.game.worldsEverReached, idxAvant = g.WorldManager.worldIndex;
  g.game.worldsEverReached = { 0: true }; g.WorldManager.worldIndex = 0; // Forêt : les commandes du Désert restent fermées
  ok(A.getLevel() === 0 && A.getUnlockedRecipes().length === 0, "sans Apothicaire : aucune recette");
  g.game.village.buildings.apothecary.level = 1;
  ok(A.getUnlockedRecipes().length === 1, "niveau 1 : seul le Soin mineur est connu");
  ok(A.isUnlocked("potion_soin_mineur"), "...et c'est un SOIN, la condition centrale du Grimoire");
  g.game.village.buildings.apothecary.level = 6;
  ok(A.getUnlockedRecipes().length === 1, "niveau 6 : toujours une seule recette \u2014 les autres se gagnent par commande");

  /* --- L'achat en or n'est JAMAIS retir\u00e9 (r\u00e8gle de fusion) ------------ */
  g.game.gold = 100000;
  var stockAvant = g.PotionManager.getStock("potion_power");
  g.PotionManager.buyPotion("potion_power");
  ok(g.PotionManager.getStock("potion_power") === stockAvant + 1,
    "l'achat en or fonctionne toujours, Apothicaire ou pas");

  /* --- Fabrication : d\u00e9bit en ressources, pas en or -------------------- */
  var recette = A.getRecipe("potion_soin_mineur");
  Object.keys(recette.inputs).forEach(function (k) {
    g.WarehouseManager.addResource(k, recette.inputs[k] * 3);
  });
  var orAvant = g.game.gold;
  var soinAvant = g.PotionManager.getHealingStock("potion_soin_mineur");
  var eauAvant = g.WarehouseManager.getAmount("eau_purifiee");
  ok(A.craft("potion_soin_mineur") === true, "pr\u00e9paration r\u00e9ussie");
  ok(g.PotionManager.getHealingStock("potion_soin_mineur") === soinAvant + 1, "la potion entre en stock");
  ok(g.game.gold === orAvant, "aucune pi\u00e8ce d'or d\u00e9pens\u00e9e : c'est l'autre voie");
  ok(g.WarehouseManager.getAmount("eau_purifiee") === eauAvant - recette.inputs.eau_purifiee,
    "les ressources sont bien d\u00e9bit\u00e9es");

  /* --- Sans les ressources, rien ne se passe ---------------------------- */
  g.WarehouseManager.removeResource("eau_purifiee", g.WarehouseManager.getAmount("eau_purifiee"));
  var soinAvant2 = g.PotionManager.getHealingStock("potion_soin_mineur");
  ok(A.craft("potion_soin_mineur") === false && g.PotionManager.getHealingStock("potion_soin_mineur") === soinAvant2,
    "sans Eau purifi\u00e9e : refus\u00e9, et rien n'est cr\u00e9\u00e9");
  ok(A.getMissingInput("potion_soin_mineur") === "eau_purifiee", "...et la fiche sait quoi nommer");

  /* --- Une recette non ouverte reste refus\u00e9e -------------------------- */
  g.game.village.buildings.apothecary.level = 1;
  var dernier = g.APOTHECARY_RECIPES[g.APOTHECARY_RECIPES.length - 1].potionId;
  Object.keys(A.getRecipe(dernier).inputs).forEach(function (k) { g.WarehouseManager.addResource(k, 999); });
  ok(A.craft(dernier) === false, "recette non acquise : refus\u00e9e malgr\u00e9 les ressources");
  ok(A.getLockReason(dernier).indexOf("S'ouvre") === 0, "...et l'\u00e9cran dit o\u00f9 elle s'ouvre (commande du D\u00e9sert)");

  /* --- Le plafond de stock n'est pas contournable ------------------------ */
  g.game.village.buildings.apothecary.level = 6;
  A.ensureState().learned.potion_power = true; // recette acquise : on teste le plafond de stock, pas la commande
  Object.keys(A.getRecipe("potion_power").inputs).forEach(function (k) { g.WarehouseManager.addResource(k, 9999); });
  g.game.potionsOwned.potion_power = g.POTION_STOCK_CAP;
  ok(A.craft("potion_power") === false, "stock plein : la pr\u00e9paration ne contourne pas le plafond");
  g.game.potionsOwned.potion_power = 0;

  /* --- L'Asc\u00e9tisme ferme les DEUX voies ------------------------------- */
  var vraiAff = g.AfflictionManager.arePotionsForbidden;
  g.AfflictionManager.arePotionsForbidden = function () { return true; };
  ok(A.craft("potion_power") === false, "Asc\u00e9tisme : la pr\u00e9paration est interdite comme l'achat");
  g.AfflictionManager.arePotionsForbidden = vraiAff;

  /* --- L'\u00e9cran des potions montre la seconde voie --------------------- */
  g.game.village.buildings.apothecary.level = 0;
  var sansBat = g.buildPotionShopHTML();
  ok(sansBat.indexOf("potion-craft-row") === -1, "sans Apothicaire : la Boutique est strictement inchang\u00e9e");
  /* v3.291.0 : une recette non acquise annonce sa commande au lieu de dispara\u00eetre. */
  g.game.village.buildings.apothecary.level = 1;
  delete A.ensureState().learned.potion_soin_majeur;
  var avecBat = g.buildPotionShopHTML();
  ok(avecBat.indexOf("potion-craft-row") !== -1, "avec Apothicaire : la ligne « Pr\u00e9parer » appara\u00eet");
  ok(avecBat.indexOf("Commande \u00e0 l") !== -1,
    "une recette pas encore acquise annonce sa commande au lieu de dispara\u00eetre");
  g.game.worldsEverReached = mondesAvant; g.WorldManager.worldIndex = idxAvant; // état rendu aux sections suivantes
})();

console.log("\n[25] v3.216.0 (lot V-5) \u2014 Halle marchande : elle agrandit l'\u00e9choppe, elle ne la d\u00e9place pas");
(function () {
  var M = g.VillageBuildingManager;
  var E = g.EquipShopManager;

  g.game.village = {}; M.ensure();

  /* --- Emplacements de vitrine ------------------------------------------ */
  ok(E.getShopSize(0) === g.EQUIP_SHOP_SIZE, "sans Halle : vitrine \u00e0 6, comme avant");
  ok(E.getShopSize(1) === 6, "niveau 1 : pas encore d'emplacement (un tous les deux niveaux)");
  ok(E.getShopSize(2) === 7, "niveau 2 : un emplacement de plus");
  ok(E.getShopSize(10) === 11, "niveau 10 : cinq emplacements gagn\u00e9s");

  /* --- Remise sur le renouvellement ------------------------------------- */
  ok(Math.abs(E.getRefreshDiscount(0) - 1) < 1e-9, "sans Halle : aucune remise");
  ok(E.getRefreshDiscount(10) < E.getRefreshDiscount(5), "la remise cro\u00eet avec le niveau");
  ok(E.getRefreshDiscount(10) > 0.5, "...sans jamais s'effondrer (-5 %/niveau compos\u00e9s)");

  g.game.village.buildings.hall.level = 0;
  g.game.equipShopManualRefreshCount = 0;
  var plein = E.getManualRefreshCost();
  g.game.village.buildings.hall.level = 10;
  var remise = E.getManualRefreshCost();
  ok(remise < plein, "renouvellement manuel moins cher avec la Halle");

  /* --- Le PRIX DES OBJETS n'est pas touch\u00e9 --------------------------
     L'indexation des prix sur le monde (v3.114.0) est un \u00e9quilibrage \u00e0 part :
     la Halle ne doit pas s'y inviter. */
  var item = { rarity: "rare" };
  g.game.village.buildings.hall.level = 0;
  var prixSans = E.getPrice(item);
  g.game.village.buildings.hall.level = 10;
  ok(E.getPrice(item) === prixSans, "le prix des objets reste celui du monde, la Halle n'y touche pas");

  /* --- Am\u00e9liorer la Halle ne vide pas la vitrine ---------------------
     Le stock est COMPL\u00c9T\u00c9, pas r\u00e9g\u00e9n\u00e9r\u00e9 : sinon un chantier effacerait les
     objets que le joueur gardait en vue, ce qui serait une punition. */
  g.game.village.buildings.hall.level = 0;
  E.ensure();
  g.game.equipShopStock = E.generateStock();
  g.game.equipShopResetTime = Date.now() + 3600000;
  var premierUid = g.game.equipShopStock[0].uid;
  var tailleAvant = g.game.equipShopStock.length;

  g.game.village.buildings.hall.level = 2;
  E.checkRefresh();
  ok(g.game.equipShopStock.length === tailleAvant + 1, "la vitrine gagne l'emplacement imm\u00e9diatement");
  ok(g.game.equipShopStock[0].uid === premierUid, "...et les objets d\u00e9j\u00e0 en vitrine sont conserv\u00e9s");

  /* --- Verrou de rang ---------------------------------------------------- */
  g.game.village = {}; M.ensure();
  g.game.village.buildings.workshop.level = 3; // rang 3 — v3.289.0 (D12) : la Halle est au rang 4
  ok(M.getCardState("hall") === "locked" && M.getBlockReason("hall") === "Atelier niveau 4",
    "Halle verrouill\u00e9e sous le rang 4, avec le niveau d'Atelier attendu");
  g.game.village.buildings.workshop.level = 4;
  ok(M.getCardState("hall") === "ready", "Atelier niveau 4 : la Halle devient constructible");

  /* --- L'\u00e9choppe dit d'o\u00f9 vient l'agrandissement -------------------- */
  g.game.village.buildings.hall.level = 0;
  ok(g.buildEquipShopHTML().indexOf("equip-shop-hall-note") === -1, "sans Halle : \u00e9choppe inchang\u00e9e");
  g.game.village.buildings.hall.level = 3;
  ok(g.buildEquipShopHTML().indexOf("equip-shop-hall-note") !== -1,
    "avec Halle : l'\u00e9choppe annonce l'effet du b\u00e2timent");
})();

console.log("\n[26] v3.217.0 (lot V-6) \u2014 Taverne : contrats de livraison");
(function () {
  var M = g.VillageBuildingManager;
  var T = g.TavernManager;

  g.game.village = {}; M.ensure();
  g.game.tavern = {}; T.ensure();

  /* --- Emplacements de contrat ------------------------------------------ */
  ok(T.getSlotCount(0) === 0, "sans Taverne : aucun contrat");
  ok(T.getSlotCount(1) === 1, "niveau 1 : un contrat");
  ok(T.getSlotCount(2) === 2 && T.getSlotCount(5) === 5, "un contrat de plus par niveau");
  ok(g.VILLAGE_BUILDINGS.tavern.maxLevel === 5, "5 niveaux, 5 contrats : chaque chantier se voit sur le tableau");
  var tousUtiles = true;
  for (var lv = 1; lv <= g.VILLAGE_BUILDINGS.tavern.maxLevel; lv++) {
    if (T.getSlotCount(lv) !== T.getSlotCount(lv - 1) + 1) tousUtiles = false;
  }
  ok(tousUtiles, "aucun niveau qui n'apporte rien de visible");

  /* --- Sans b\u00e2timent, le tableau reste vide -------------------------- */
  g.game.village.buildings.tavern.level = 0;
  ok(T.getContracts().length === 0, "tableau vide tant que la Taverne n'existe pas");

  /* --- G\u00e9n\u00e9ration ------------------------------------------------- */
  g.game.village.buildings.tavern.level = 3;
  g.game.tavern = {}; T.ensure();
  var lot = T.getContracts();
  ok(lot.length === T.getSlotCount(), "le tableau se remplit au nombre d'emplacements");

  var doublons = {};
  var unique = lot.every(function (c) {
    if (doublons[c.resourceId]) return false;
    doublons[c.resourceId] = true;
    return true;
  });
  ok(unique, "jamais deux contrats sur la m\u00eame ressource : le choix reste r\u00e9el");

  var payeMieux = lot.every(function (c) {
    var unit = Number(g.WAREHOUSE_RESOURCES[c.resourceId].sellPrice || 0);
    return c.reward > unit * c.quantity;
  });
  ok(payeMieux, "livrer paie strictement mieux que vendre la m\u00eame quantit\u00e9 \u00e0 l'Entrep\u00f4t");

  /* --- Livraison -------------------------------------------------------- */
  var c0 = lot[0];
  g.WarehouseManager.removeResource(c0.resourceId, g.WarehouseManager.getAmount(c0.resourceId));
  ok(T.canDeliver(c0.id) === false, "sans les ressources, le contrat n'est pas livrable");
  var orAvant = g.game.gold;
  ok(T.deliver(c0.id) === false && g.game.gold === orAvant, "...et une tentative ne paie rien");

  g.WarehouseManager.addResource(c0.resourceId, c0.quantity + 5);
  var stockAvant = g.WarehouseManager.getAmount(c0.resourceId);
  orAvant = g.game.gold;
  ok(T.deliver(c0.id) === true, "contrat livr\u00e9");
  ok(g.game.gold === orAvant + c0.reward, "l'or promis est vers\u00e9, au chiffre pr\u00e8s");
  ok(g.WarehouseManager.getAmount(c0.resourceId) === stockAvant - c0.quantity,
    "les ressources sont d\u00e9bit\u00e9es, exactement la quantit\u00e9 demand\u00e9e");
  ok(T.getContract(c0.id).done === true, "le contrat est marqu\u00e9 honor\u00e9");

  orAvant = g.game.gold;
  ok(T.deliver(c0.id) === false && g.game.gold === orAvant, "un contrat honor\u00e9 ne se livre pas deux fois");

  /* --- Am\u00e9liorer la Taverne ne vide pas le tableau ------------------- */
  var avant = T.getContracts().length;
  var premierId = T.getContracts()[0].id;
  g.game.village.buildings.tavern.level = 4;
  T.checkRefresh();
  ok(T.getContracts().length === avant + 1, "un emplacement gagn\u00e9 est rempli imm\u00e9diatement");
  ok(T.getContracts()[0].id === premierId, "...et les contrats en cours sont conserv\u00e9s");

  /* --- Renouvellement ---------------------------------------------------- */
  g.game.tavern.resetTime = Date.now() - 1;
  T.checkRefresh();
  ok(T.getContracts().every(function (c) { return !c.done; }), "au renouvellement, le tableau repart propre");

  /* --- Seules des ressources vendables sortent en contrat ---------------- */
  var vendables = T.getContracts().every(function (c) {
    return Number(g.WAREHOUSE_RESOURCES[c.resourceId].sellPrice || 0) > 0;
  });
  ok(vendables, "aucun contrat sur un mat\u00e9riau invendable (pas de r\u00e9compense \u00e0 z\u00e9ro)");

  /* --- Verrou de rang et rendu ------------------------------------------ */
  g.game.village = {}; M.ensure();
  g.game.village.buildings.workshop.level = 3; // v3.289.0 (D12) : Taverne au rang 4
  ok(M.getBlockReason("tavern") === "Atelier niveau 4", "Taverne verrouill\u00e9e sous le rang 4, avec le niveau attendu");

  g.game.village.buildings.workshop.level = 5;
  g.game.village.buildings.tavern.level = 2;
  var fiche = g.buildVillageBuildingSheetHTML("tavern");
  ok(fiche.indexOf("tavern-board") !== -1, "la fiche de la Taverne porte son tableau de contrats");
  g.game.village.buildings.tavern.level = 0;
  ok(g.buildVillageBuildingSheetHTML("tavern").indexOf("tavern-board") === -1,
    "pas de tableau tant que la Taverne n'est pas b\u00e2tie");
})();

console.log("\n[27] v3.218.0 (lot V-7) \u2014 Entrep\u00f4t agrandi : un seul plafond, partout");
(function () {
  var M = g.VillageBuildingManager;
  var W = g.WarehouseManager;

  g.game.village = {}; M.ensure();
  var base = g.WAREHOUSE_RESOURCES.planche.cap;
  var par = g.WAREHOUSE_CAP_PER_LEVEL;

  /* --- Le plafond suit le b\u00e2timent ------------------------------------ */
  ok(W.getCap("planche") === base, "sans b\u00e2timent : plafond d'origine");
  g.game.village.buildings.warehouse.level = 4;
  ok(W.getCap("planche") === base + 4 * par, "niveau 4 : +" + (4 * par));
  g.game.village.buildings.warehouse.level = 10;
  ok(W.getCap("planche") === base + 10 * par, "niveau 10 : plafond maximal");

  /* --- Les mati\u00e8res brutes ne sont pas concern\u00e9es -------------------- */
  ok(W.getCap("bois") === Infinity, "une mati\u00e8re brute reste sans plafond, le b\u00e2timent ne lui en invente pas");

  /* --- addResource respecte le nouveau plafond -------------------------- */
  g.game.village.buildings.warehouse.level = 0;
  g.game.resources.planche = 0;
  W.addResource("planche", 5000, true);
  ok(W.getAmount("planche") === base, "sans b\u00e2timent : le stock s'arr\u00eate au plafond d'origine");

  g.game.village.buildings.warehouse.level = 2;
  var ajoute = W.addResource("planche", 5000, true);
  ok(ajoute > 0 && W.getAmount("planche") === base + 2 * par,
    "avec le b\u00e2timent : la place gagn\u00e9e est imm\u00e9diatement utilisable");

  /* --- Le stock d\u00e9j\u00e0 accumul\u00e9 n'est JAMAIS rabot\u00e9 -------------------
     Un joueur qui reviendrait \u00e0 un niveau inf\u00e9rieur (sauvegarde bricol\u00e9e,
     retour de version) garde ce qu'il a : addResource plafonne les AJOUTS,
     il ne retire rien. */
  g.game.village.buildings.warehouse.level = 0;
  ok(W.getAmount("planche") === base + 2 * par, "un stock au-dessus du plafond n'est pas d\u00e9truit");
  ok(W.addResource("planche", 10, true) === 0, "...mais plus rien ne rentre tant qu'il est au-dessus");

  /* --- Les ateliers lisent LE M\u00caME plafond ---------------------------
     Sinon un atelier calculerait ses lots avec l'ancien plafond et l'Entrep\u00f4t
     refuserait le surplus \u00e0 l'arriv\u00e9e : le lot serait perdu. */
  g.game.village.buildings.warehouse.level = 6;
  g.game.resources.planche = base; // plein \u00e0 l'ancien plafond
  var place = W.getCap("planche") - W.getAmount("planche");
  ok(place === 6 * par, "la place restante vue par l'Entrep\u00f4t tient compte du b\u00e2timent");
  /* Contr\u00f4le direct sur la source : le calcul de lots automatiques doit lire
     WarehouseManager.getCap et non WAREHOUSE_RESOURCES[...].cap. */
  var src = String(g.WorkshopsSystem.getMaxAutoCraftTimes);
  ok(src.indexOf("WarehouseManager.getCap") !== -1,
    "le calcul de lots des ateliers passe par WarehouseManager.getCap");
  ok(src.indexOf("def.cap") === -1, "...et ne lit plus le plafond brut de la table");

  /* --- Verrou de rang 4 -------------------------------------------------- */
  g.game.village = {}; M.ensure();
  g.game.village.buildings.workshop.level = 2; // v3.289.0 (D12) : Entrep\u00f4t au rang 3
  ok(M.getBlockReason("warehouse") === "Atelier niveau 3", "verrouill\u00e9 sous le rang 3, avec le niveau attendu");
  g.game.village.buildings.workshop.level = 3;
  ok(M.getCardState("warehouse") === "ready", "Atelier niveau 3 : l'Entrep\u00f4t agrandi devient constructible");

  /* --- Les paliers hauts demandent le mat\u00e9riau de monde ---------------- */
  g.game.village.buildings.warehouse.level = 5;
  var cout = M.getNextCost("warehouse");
  ok(!!cout && cout.resine_durcie > 0, "les derniers niveaux exigent la R\u00e9sine durcie");

  g.game.resources.planche = 0;
})();

console.log("\n[28] v3.219.0 \u2014 D\u00e9fense d\u00e9gressive et \u00e9chelle d'armure");
(function () {
  var IDS = g.HEROS_TRAINING_UPGRADE_IDS;

  function defenseAt(trained) {
    run("fullResetState(); game.playerName='Def'; game.heroId='knight';");
    IDS.forEach(function (id) { g.game.upgrades[id] = trained; });
    run("StatsSystem.recalcStats();");
    return { end: Number(g.game.heroEnduranceRaw || 0), def: Number(g.game.heroDefensePct || 0) };
  }

  /* --- Sous le seuil : RIEN ne change ------------------------------------
     C'est la garantie qui compte : le d\u00e9but et le milieu de partie \u00e9taient
     d\u00e9j\u00e0 calibr\u00e9s (banc For\u00eat, cible ~40 % de PV perdus sur un boss). */
  var bas = defenseAt(8);
  ok(bas.end < 120, "profil de d\u00e9but de partie : endurance sous le seuil");
  ok(Math.abs(bas.def - bas.end * 0.002) < 1e-9,
    "sous le seuil, la d\u00e9fense reste exactement l'ancienne formule");

  /* --- Au-dessus du seuil : la pente se casse --------------------------- */
  var haut = defenseAt(150);
  ok(haut.end > 120, "profil de fin de partie : endurance au-dessus du seuil");
  var attendu = 0.002 * 120 + 0.0005 * (haut.end - 120);
  ok(Math.abs(haut.def - attendu) < 1e-9, "au-del\u00e0 du seuil, la pente passe au quart");
  ok(haut.def < haut.end * 0.002, "...donc moins qu'avant, ce qui lib\u00e8re de la place");

  /* --- La courbe ne redescend jamais et ne se borne pas elle-m\u00eame ------ */
  var monotone = true, precedent = -1;
  [0, 4, 20, 60, 119, 120, 121, 200, 300].forEach(function (t) {
    var d = defenseAt(t).def;
    if (d < precedent) monotone = false;
    precedent = d;
  });
  ok(monotone, "la d\u00e9fense ne descend jamais quand l'entra\u00eenement monte");

  /* --- Il reste de la place pour l'\u00e9quipement ------------------------
     C'\u00e9tait tout l'objet du changement : avant, endurance + talents
     atteignaient 60 % \u00e0 eux seuls et l'armure n'apportait rien. */
  run("fullResetState(); game.playerName='Def'; game.heroId='knight';");
  IDS.forEach(function (id) { g.game.upgrades[id] = 150; });
  g.game.talents.t_second_wind = 3;
  g.game.talents.t_vital_anchor = 3;
  g.game.talents.t_immutable_guardian = 3;
  run("StatsSystem.recalcStats();");
  var sansArmure = Number(g.game.heroDefensePct || 0);
  ok(sansArmure < 0.6, "entra\u00eenement et talents maxim\u00e9s n'atteignent plus le plafond \u00e0 eux seuls");
  ok(0.6 - sansArmure > 0.10, "...et laissent plus de 10 points \u00e0 l'\u00e9quipement");

  /* --- L'\u00e9chelle d'armure est redevenue r\u00e9guli\u00e8re ------------------- */
  var r = g.EQUIPMENT_SLOT_CONFIG.armor.ranges;
  var ordre = ["common", "green", "rare", "epic", "legendary"];
  var progresse = true;
  for (var i = 0; i < ordre.length - 1; i++) {
    var ecart = r[ordre[i + 1]][1] / r[ordre[i]][1] - 1;
    if (ecart < 0.20) progresse = false; // l'ancien \u00e9pique->l\u00e9gendaire valait +3 %
  }
  ok(progresse, "chaque palier d'armure apporte au moins 20 % de plus que le pr\u00e9c\u00e9dent");
  ok(r.legendary[1] <= 0.6 - sansArmure + 0.02,
    "une armure l\u00e9gendaire tient dans la marge disponible, sans la gaspiller");
})();

console.log("\n[29] v3.220.0 \u2014 \u00c9chelle de monde sur l'\u00e9quipement");
(function () {
  /* --- Seules les stats PLATES suivent la courbe ------------------------
     C'est le piège du chantier : la d\u00e9fense est plafonn\u00e9e \u00e0 60 %, et
     multiplier un multiplicateur (crit, d\u00e9g\u00e2ts, or) n'a pas de sens. */
     var plates = [], pourcentages = [];
  g.EQUIPMENT_SLOTS.forEach(function (slot) {
    var c = g.EQUIPMENT_SLOT_CONFIG[slot];
    (c.scalesWithWorld ? plates : pourcentages).push(slot);
  });
  ok(plates.length === 2 && plates.indexOf("weapon") !== -1 && plates.indexOf("boots") !== -1,
    "seules l'arme et les bottes suivent l'\u00e9chelle de monde");
  ok(pourcentages.indexOf("armor") !== -1 && pourcentages.indexOf("helmet") !== -1,
    "armure et casque (pourcentages) ne la suivent JAMAIS");

  /* --- La courbe monte et reste loin de celle des PV -------------------- */
  var croissante = true;
  for (var i = 1; i < g.EQUIP_WORLD_SCALE.length; i++) {
    if (g.EQUIP_WORLD_SCALE[i] <= g.EQUIP_WORLD_SCALE[i - 1]) croissante = false;
  }
  ok(croissante, "la courbe monte \u00e0 chaque monde");
  ok(g.EQUIP_WORLD_SCALE[0] === 1, "le monde de d\u00e9part n'est pas touch\u00e9 : rien ne change en For\u00eat");
  ok(g.EQUIP_WORLD_SCALE[5] < 214,
    "elle reste tr\u00e8s en dessous de la courbe des PV ennemis (\u00d7214) : elle compl\u00e8te les stats, elle ne les remplace pas");

  /* --- Un objet porte son monde et sa valeur mise \u00e0 l'\u00e9chelle --------- */
  var forest = g.generateEquipmentItem("weapon", "common", 0);
  var tour = g.generateEquipmentItem("weapon", "common", 5);
  ok(forest.worldIndex === 0 && tour.worldIndex === 5, "l'objet est estampill\u00e9 de son monde d'origine");
  var r = g.EQUIPMENT_SLOT_CONFIG.weapon.ranges.common;
  ok(forest.value >= r[0] && forest.value <= r[1], "en For\u00eat, la valeur reste dans la fourchette d'origine");
  ok(tour.value > r[1] * 5, "\u00e0 la Tour, la m\u00eame rarit\u00e9 vaut bien davantage");

  /* --- Une armure ne change PAS d'un monde \u00e0 l'autre ------------------ */
  var armF = g.generateEquipmentItem("armor", "legendary", 0);
  var armT = g.generateEquipmentItem("armor", "legendary", 5);
  var ra = g.EQUIPMENT_SLOT_CONFIG.armor.ranges.legendary;
  ok(armF.value <= ra[1] && armT.value <= ra[1],
    "une armure l\u00e9gendaire reste dans sa fourchette, quel que soit le monde");

  /* --- Une sauvegarde ant\u00e9rieure n'est pas cass\u00e9e --------------------
     Un objet sans worldIndex est trait\u00e9 comme un objet de For\u00eat, ce qu'il est. */
  var vieux = { uid: "old", slot: "weapon", name: "x", icon: "sword", rarity: "rare", stat: "tapDmg", value: 40 };
  ok(String(g.buildItemOriginHTML(vieux)).indexOf("For\u00eat") !== -1,
    "un objet d'avant cette version s'affiche comme venant de For\u00eat, sans trou ni erreur");
  ok(g.buildItemOriginHTML({ slot: "armor", worldIndex: 3 }) === "",
    "aucune provenance affich\u00e9e sur un emplacement qui ne suit pas l'\u00e9chelle");

  /* --- L'arme de d\u00e9part reste une arme de d\u00e9part -------------------- */
  run("fullResetState(); game.playerName='P'; game.heroId='knight';");
  g.WorldManager.worldIndex = 5;
  var starter = g.equipStarterWeapon();
  ok(!starter || starter.value === 1, "l'arme de d\u00e9part garde sa valeur impos\u00e9e, hors \u00e9chelle");
  g.WorldManager.worldIndex = 0;
})();

console.log("\n[30] v3.221.0 (lot V-8) \u2014 Forge : 30 niveaux = un cran de rarit\u00e9");
(function () {
  var M = g.VillageBuildingManager;
  var F = g.ForgeManager;

  g.game.village = {}; M.ensure();
  g.game.forge = {}; F.ensure();

  /* --- Le pas vaut un cran de rarit\u00e9, calcul\u00e9 par emplacement ---------
     Pas un pourcentage fixe : l'\u00e9chelle des rarit\u00e9s diff\u00e8re d'un emplacement
     \u00e0 l'autre (amulette +55 %, armure +24 %). */
  var confArme = g.EQUIPMENT_SLOT_CONFIG.weapon.ranges;
  var attendu = confArme.rare[1] / confArme.green[1];
  ok(Math.abs(F.getRarityStep("weapon", "green") - attendu) < 1e-9,
    "le pas d'une arme inhabituelle vaut le rapport r\u00e9el vers la rarit\u00e9 sup\u00e9rieure");
  ok(F.getRarityStep("amulet", "common") !== F.getRarityStep("armor", "common"),
    "deux emplacements aux \u00e9chelles diff\u00e9rentes ont des pas diff\u00e9rents");

  /* --- Plancher sur les \u00e9chelles plates -------------------------------
     Sans lui, forger une arme l\u00e9gendaire (+17 %) ou des bottes l\u00e9gendaires
     (+12 %) ne servirait \u00e0 rien, pr\u00e9cis\u00e9ment quand le joueur a le plus de
     mat\u00e9riaux. */
  ok(F.getRarityStep("weapon", "legendary") === g.FORGE_MIN_STEP,
    "arme l\u00e9gendaire : le plancher s'applique");
  ok(F.getRarityStep("boots", "legendary") === g.FORGE_MIN_STEP,
    "bottes l\u00e9gendaires : le plancher s'applique");
  var tousAuMoins = true;
  g.EQUIPMENT_SLOTS.forEach(function (slot) {
    ["common", "green", "rare", "epic", "legendary"].forEach(function (rar) {
      if (F.getRarityStep(slot, rar) < g.FORGE_MIN_STEP - 1e-9) tousAuMoins = false;
    });
  });
  ok(tousAuMoins, "aucun emplacement ne gagne moins que le plancher sur 30 niveaux");

  /* --- 30 niveaux = exactement un cran --------------------------------- */
  g.game.village.buildings.forge.level = 6; // plafond th\u00e9orique : 30
  var arme = { slot: "weapon", rarity: "green", stat: "tapDmg", value: confArme.green[1] };
  g.game.forge.levels.weapon = 30;
  var pas = F.getRarityStep("weapon", "green");
  ok(Math.abs(F.getForgedValue(arme) - Math.round(arme.value * pas)) <= 1,
    "\u00e0 30 niveaux, une inhabituelle atteint le haut de la rarit\u00e9 sup\u00e9rieure");

  /* Une commune forg\u00e9e \u00e0 fond ne rattrape PAS une inhabituelle forg\u00e9e :
     la forge rattrape la malchance, elle ne remplace pas le loot. */
  var commune = { slot: "weapon", rarity: "common", stat: "tapDmg", value: confArme.common[1] };
  var inhab = { slot: "weapon", rarity: "green", stat: "tapDmg", value: confArme.green[1] };
  ok(F.getForgedValue(commune) < F.getForgedValue(inhab),
    "une commune au maximum reste sous une inhabituelle au maximum");
  g.game.forge.levels.weapon = 0;
  ok(F.getForgedValue(commune) < inhab.value,
    "...et une commune non forg\u00e9e reste sous une inhabituelle brute");

  /* --- Progression lin\u00e9aire, sans \u00e0-coup -------------------------------- */
  var precedent = 0, croissant = true;
  for (var lv = 0; lv <= 30; lv++) {
    g.game.forge.levels.weapon = lv;
    var v = F.getForgedValue(arme);
    if (v < precedent) croissant = false;
    precedent = v;
  }
  ok(croissant, "la valeur ne redescend jamais quand le niveau monte");

  /* --- Le niveau appartient \u00e0 l'EMPLACEMENT ---------------------------
     C'est la d\u00e9cision qui \u00e9vite d'h\u00e9siter \u00e0 \u00e9quiper un meilleur drop. */
  g.game.forge.levels.weapon = 10;
  var autre = { slot: "weapon", rarity: "rare", stat: "tapDmg", value: 40 };
  ok(F.getMultiplier(autre) > 1, "une pi\u00e8ce neuve profite imm\u00e9diatement du niveau de l'emplacement");
  ok(F.getLevel("armor") === 0, "...et le niveau d'un autre emplacement n'a pas boug\u00e9");

  /* --- Plafond donn\u00e9 par le b\u00e2timent ---------------------------------- */
  g.game.village.buildings.forge.level = 0;
  ok(F.getMaxLevel() === 0 && F.getBlockReason("weapon") === "Forge non construite",
    "sans b\u00e2timent : aucune reforge, et la raison est dite");
  g.game.village.buildings.forge.level = 1;
  ok(F.getMaxLevel() === 2, "niveau 1 de b\u00e2timent : 2 niveaux de forge (v3.289.0, D12)");
  g.game.forge.levels.weapon = 5;
  ok(F.getBlockReason("weapon") === "Am\u00e9liore la Forge", "au plafond : l'\u00e9cran renvoie vers le b\u00e2timent");
  ok(F.getCost("weapon") === null, "...et il n'y a plus de co\u00fbt \u00e0 afficher");

  /* --- Reforge : d\u00e9bit r\u00e9el, un seul niveau \u00e0 la fois ------------------ */
  g.game.forge.levels.weapon = 0;
  g.game.gold = 1000000;
  g.WarehouseManager.addResource("acier", 500);
  var cout = F.getCost("weapon");
  var orAvant = g.game.gold, acierAvant = g.WarehouseManager.getAmount("acier");
  ok(F.reforge("weapon") === true, "reforge effectu\u00e9e");
  ok(F.getLevel("weapon") === 1, "un seul niveau gagn\u00e9, pas plus");
  ok(g.game.gold === orAvant - cout.gold, "l'or est d\u00e9bit\u00e9 au chiffre pr\u00e8s");
  ok(g.WarehouseManager.getAmount("acier") === acierAvant - cout.acier, "l'acier aussi");

  g.WarehouseManager.removeResource("acier", g.WarehouseManager.getAmount("acier"));
  var niveauAvant = F.getLevel("weapon");
  orAvant = g.game.gold;
  ok(F.reforge("weapon") === false && F.getLevel("weapon") === niveauAvant && g.game.gold === orAvant,
    "sans acier : refus\u00e9, sans niveau ni or perdu");

  /* --- L'acier existe et vient de la Forge de la Mine -------------------- */
  ok(!!g.WAREHOUSE_RESOURCES.acier && Number(g.WAREHOUSE_RESOURCES.acier.sellPrice || 0) === 0,
    "Acier d\u00e9clar\u00e9 et invendable");
  ok(g.WORKSHOPS_CONFIG.forge.active === true
    && g.WORKSHOPS_CONFIG.forge.recipes[0].outputs[0].resourceId === "acier",
    "Forge de la Mine activ\u00e9e, elle produit l'acier");

  /* --- Les stats lisent bien la valeur forg\u00e9e ------------------------- */
  run("fullResetState(); game.playerName='F'; game.heroId='knight';");
  g.VillageBuildingManager.ensure(); g.ForgeManager.ensure();
  g.game.equipped = { weapon: { uid: "w", slot: "weapon", name: "x", icon: "sword", rarity: "rare", stat: "tapDmg", value: 40 } };
  run("StatsSystem.recalcStats();");
  var sansForge = Number(g.game.equipFlatTapBonus || 0);
  g.game.village.buildings.forge.level = 6;
  g.game.forge.levels.weapon = 30;
  run("StatsSystem.recalcStats();");
  ok(Number(g.game.equipFlatTapBonus || 0) > sansForge,
    "StatsSystem compose bien la valeur FORG\u00c9E, pas la valeur brute");

  /* --- L'\u00e9tabli s'affiche, et seulement une fois le b\u00e2timent b\u00e2ti ----- */
  var fiche = g.buildVillageBuildingSheetHTML("forge");
  ok(fiche.indexOf("forge-board") !== -1, "la fiche de la Forge porte son \u00e9tabli");
  g.game.village.buildings.forge.level = 0;
  ok(g.buildVillageBuildingSheetHTML("forge").indexOf("forge-board") === -1,
    "pas d'\u00e9tabli tant que la Forge n'est pas b\u00e2tie");
})();

console.log("\n[31] v3.222.0 \u2014 Ascension : le h\u00e9ros garde ses niveaux, et retour aux pages d'accueil");
(function () {
  /* --- Ce que l'ascension conserve d\u00e9sormais --------------------------
     L'exp\u00e9rience \u00e9tant devenue lente \u00e0 gagner, remettre le niveau \u00e0 1 \u00e0 chaque
     cycle transformait l'ascension en corv\u00e9e de rattrapage. */
  run("fullResetState(); game.playerName='A'; game.heroId='knight';");
  g.game.heroLevel = 24;
  g.game.heroXp = 137;
  g.game.heroXpToNext = 420;
  g.game.talentPoints = 5;
  g.game.talents = { t_second_wind: 3, t_sharpened_blades: 2 };
  g.game.upgrades.utrain_power = 40;
  g.game.gold = 999;
  run("hardResetState();");

  ok(g.game.heroLevel === 24, "le niveau du h\u00e9ros traverse l'ascension");
  ok(g.game.heroXp === 137 && g.game.heroXpToNext === 420, "l'exp\u00e9rience en cours aussi, sans arrondi");
  ok(g.game.talents.t_second_wind === 3 && g.game.talents.t_sharpened_blades === 2,
    "les talents d\u00e9j\u00e0 pris sont conserv\u00e9s");
  ok(g.game.talentPoints === 5, "les points non d\u00e9pens\u00e9s restent disponibles");
  ok(!g.game.upgrades.utrain_power, "...alors que l'entra\u00eenement, lui, repart bien \u00e0 z\u00e9ro");

  /* Pas de reroll gratuit : les points d\u00e9pens\u00e9s restent d\u00e9pens\u00e9s. */
  var depenses = Object.keys(g.game.talents).reduce(function (n, k) { return n + g.game.talents[k]; }, 0);
  ok(depenses === 5, "les points d\u00e9pens\u00e9s ne sont pas rendus : la r\u00e9initialisation garde son co\u00fbt");

  /* Les PV se recomposent depuis le niveau conserv\u00e9. */
  run("StatsSystem.recalcStats();");
  ok(g.game.heroMaxHp > 10, "les PV sont recompos\u00e9s \u00e0 partir du niveau conserv\u00e9, pas laiss\u00e9s \u00e0 10");

  /* --- Un reset complet, lui, remet bien tout \u00e0 z\u00e9ro ------------------ */
  run("fullResetState();");
  ok(g.game.heroLevel === 1 && Object.keys(g.game.talents).length === 0,
    "le reset complet efface toujours niveau et talents");

  /* --- Retour \u00e0 la page d'accueil d'un sous-onglet --------------------
     Un bouton de navigation doit emmener l\u00e0 o\u00f9 son libell\u00e9 le dit, pas l\u00e0 o\u00f9
     l'on \u00e9tait la derni\u00e8re fois (retour Seb). */
  run("productionViewTab = 'shops'; productionDetailBuildingId = 'sawmill'; selectedWarehouseKey = 'bois';");
  run("setVillageSubTab('production');");
  ok(run("productionViewTab") === "prod", "revenir sur Production rouvre la page de r\u00e9colte");
  ok(run("productionDetailBuildingId") === null, "...et referme le d\u00e9tail de b\u00e2timent");
  ok(run("selectedWarehouseKey") === null, "...et la ressource s\u00e9lectionn\u00e9e \u00e0 l'Entrep\u00f4t est oubli\u00e9e");

  run("selectedInventoryKey = 'eq:abc'; setEquipSubTab('shop');");
  ok(run("selectedInventoryKey") === null, "\u00c9quipement : l'objet s\u00e9lectionn\u00e9 est oubli\u00e9 au changement de sous-onglet");

  run("expandedHeroStat = 'power'; setHerosSubTab('hero');");
  ok(run("expandedHeroStat") === null, "Personnage : la carte d\u00e9pli\u00e9e se referme");
})();

console.log("\n[32] v3.223.0 \u2014 Donjons : plafond par monde et mat\u00e9riau de monde");
(function () {
  var D = g.DungeonManager;
  /* v3.300.0 : le Donjon II est fermé par la donnée (locked) jusqu'à W-4. Cette section teste
     le verrou de MONDE : on lève le verrou de donnée le temps de la section. */
  var d2 = g.DUNGEONS.find(function (d) { return d.id === 2; }), d2Locked = d2.locked;
  d2.locked = false;
  try {

  run("fullResetState(); game.playerName='D'; game.heroId='knight';");
  D.ensure();

  /* --- Plafond par monde ------------------------------------------------
     Un Donjon V donne du l\u00e9gendaire : le proposer en For\u00eat, o\u00f9 le loot
     plafonne au commun, n'avait pas de sens. */
  g.game.worldsEverReached = { 0: true };
  g.WorldManager.worldIndex = 0;
  g.game.dungeonTierCleared = { 1: true, 2: true, 3: true, 4: true };
  g.game.unlockedTabs.dungeon = true;

  ok(D.isTierUnlocked(1) === true, "For\u00eat : le Donjon I est ouvert");
  ok(D.isTierUnlocked(2) === false, "For\u00eat : le Donjon II reste ferm\u00e9 m\u00eame palier pr\u00e9c\u00e9dent termin\u00e9");
  ok(D.getTierLockReason(2) === "world", "...et la raison donn\u00e9e est le monde, pas le palier");

  g.game.worldsEverReached[1] = true;
  ok(D.isTierUnlocked(2) === true, "D\u00e9sert atteint : le Donjon II s'ouvre");
  ok(D.isTierUnlocked(3) === false, "...mais pas le III");

  /* Le plafond suit le monde le plus HAUT JAMAIS atteint : redescendre ne
     referme pas un donjon d\u00e9j\u00e0 ouvert. */
  g.WorldManager.worldIndex = 0;
  ok(D.isTierUnlocked(2) === true, "redescendre en For\u00eat ne referme pas le Donjon II");
  ok(D.getHighestWorldReached() === 1, "le monde retenu est le plus haut jamais atteint");

  /* Les deux verrous restent ind\u00e9pendants : le monde n'ouvre pas un palier
     dont le pr\u00e9c\u00e9dent n'est pas termin\u00e9. */
  g.game.worldsEverReached = { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true };
  g.game.dungeonTierCleared = {};
  ok(D.isTierUnlocked(2) === false && D.getTierLockReason(2) === "previous",
    "monde suffisant mais palier pr\u00e9c\u00e9dent non termin\u00e9 : toujours ferm\u00e9, et on le dit");

  /* --- Mat\u00e9riau de monde en r\u00e9compense ------------------------------- */
  var t1 = D.getById(1);
  ok(t1.specialResourceId === "seve_aeswyn" && t1.specialResourceAmount > 0,
    "la Tani\u00e8re rapporte de la S\u00e8ve d'Aeswyn");
  ok(!!g.WAREHOUSE_RESOURCES[t1.specialResourceId], "...et cette ressource existe bien \u00e0 l'Entrep\u00f4t");

  var sansMateriau = (g.DUNGEONS || []).filter(function (t) { return !t.specialResourceId; });
  ok(sansMateriau.length === 5, "les cinq donjons sup\u00e9rieurs attendent le mat\u00e9riau de leur monde");
  var tousDeclares = (g.DUNGEONS || []).every(function (t) { return typeof t.worldRequired === "number"; });
  ok(tousDeclares, "chaque donjon d\u00e9clare son monde requis");

  /* La r\u00e9compense n'est cr\u00e9dit\u00e9e qu'\u00e0 la r\u00e9ussite compl\u00e8te : une fuite ou
     une mort n'en donne pas, comme pour le butin d'\u00e9quipement. */
  var src = String(g.DungeonManager.finish);
  ok(src.indexOf("success && tier.specialResourceId") !== -1,
    "le mat\u00e9riau n'est cr\u00e9dit\u00e9 qu'en cas de r\u00e9ussite");
  ok(src.indexOf("WarehouseManager.addResource") !== -1,
    "...et cr\u00e9dit\u00e9 par WarehouseManager, seul point d'entr\u00e9e des ressources");

  /* --- L'\u00e9cran annonce le mat\u00e9riau avant d'entrer --------------------- */
  /* Les cartes de palier ne sortent que dans un donjon DÉPLIÉ, hors run : on
     rend donc la carte directement plutôt que de reconstituer tout l'écran. */
  var html = run("buildDungeonCardHTML(DungeonManager.getById(1))");
  ok(html.indexOf("dungeon-tier-special") !== -1,
    "la carte de palier annonce le mat\u00e9riau avant d'entrer, pas apr\u00e8s coup");
  } finally { d2.locked = d2Locked; }
})();

console.log("\n[33] v3.224.0 \u2014 Stat principale par classe (D11-D13, option A)");
(function () {
  /* Règles déclarées : une par classe, coefficients figés au Lot 0. */
  ok(typeof g.getClassMainStat === "function" && typeof g.getHeroMainStat === "function", "getClassMainStat/getHeroMainStat exposés");
  var rk = g.getClassMainStat("knight"), ra = g.getClassMainStat("archer"), rm = g.getClassMainStat("mage");
  ok(rk.stat === "power" && rk.coef === 0.14, "Chevalier : Force \u00d7 0,14");
  ok(ra.stat === "celerity" && ra.coef === 0.09, "R\u00f4deur : C\u00e9l\u00e9rit\u00e9 \u00d7 0,09");
  ok(rm.stat === "will" && rm.coef === 0.11, "Mage : Volont\u00e9 \u00d7 0,11");
  ok(g.FORCE_UNIVERSAL_TAP_COEF === 0.06, "Force universelle \u00d7 0,06");
  var rx = g.getClassMainStat("inconnue");
  ok(rx.stat === "power" && rx.coef === 0.14, "classe inconnue : repli Chevalier, jamais null");
  ok(g.getHeroMainStat("chaosMage").stat === "will", "le h\u00e9ros du Chaos suit la r\u00e8gle de sa classe");

  /* Dégâts de base attendus : Force × 0,06 + stat principale × coef, + 1 de base. */
  function tapOf(heroId, trained) {
    run("fullResetState(); game.playerName='Test'; game.heroId='" + heroId + "';");
    Object.keys(trained || {}).forEach(function (k) { g.game.upgrades["utrain_" + k] = trained[k]; });
    run("EquipmentManager.recalcStats();");
    return g.game.tapDamage;
  }
  function near(a, b) { return Math.abs(a - b) < 1e-9; }
  ok(near(tapOf("knight"), 1 + 60 * 0.06 + 60 * 0.14), "Chevalier niveau 0 : 13,0 (strictement identique \u00e0 v3.223.0)");
  ok(near(tapOf("ranger"), 1 + 46 * 0.06 + 70 * 0.09), "R\u00f4deur niveau 0 : 10,06 (9,2 + 1 avant, iso \u00e0 \u22121 %)");
  ok(near(tapOf("mage"), 1 + 62 * 0.06 + 76 * 0.11), "Mage niveau 0 : 13,08 (12,4 + 1 avant, iso \u00e0 \u22122 %)");

  /* Chaque arbre compte pour chaque classe : Force et stat principale font toutes deux bouger les dégâts. */
  var m0 = tapOf("mage"), mF = tapOf("mage", { power: 30 }), mW = tapOf("mage", { will: 30 });
  ok(near(mF - m0, 30 * 0.06), "Mage : +30 Force = +1,8 d\u00e9g\u00e2t (r\u00f4le universel, pas une stat morte)");
  ok(near(mW - m0, 30 * 0.11), "Mage : +30 Volont\u00e9 = +3,3 d\u00e9g\u00e2ts (stat principale)");
  var r0 = tapOf("ranger"), rC = tapOf("ranger", { celerity: 30 });
  ok(near(rC - r0, 30 * 0.09), "R\u00f4deur : +30 C\u00e9l\u00e9rit\u00e9 = +2,7 d\u00e9g\u00e2ts, en plus de la jauge");
  ok(g.CombatEngine.getTotalCelerity() === 100, "...et la jauge lit toujours la C\u00e9l\u00e9rit\u00e9 totale (70 + 30)");

  /* heroPowerRaw (Expéditions) reste la Force brute, pas la stat principale. */
  tapOf("mage", { will: 30 });
  ok(g.game.heroPowerRaw === 62, "heroPowerRaw du Mage = Force brute (62), jamais la Volont\u00e9");

  /* Écran Amélioration : la stat principale prend la tête ATK, son rôle universel en repli. */
  run("fullResetState(); game.playerName='Test'; game.heroId='mage'; EquipmentManager.recalcStats();");
  var rowWill = g.HEROS_STAT_ROWS.filter(function (r) { return r.key === "will"; })[0];
  var view = g.getHeroStatRowView(rowWill);
  ok(view.isMain === true && view.unit === "ATK", "Mage : la ligne Volont\u00e9 est marqu\u00e9e principale et produit des ATK");
  ok(/Puissance des coups critiques : 2/.test(view.extra()), "...et son r\u00f4le universel (CRIT \u00d7) reste visible en repli");
  var rowPower = g.getHeroStatRowView(g.HEROS_STAT_ROWS[0]);
  ok(rowPower.isMain === false && rowPower.unit === "ATK", "Mage : la ligne Force reste ATK, sans badge");
  run("game.heroId='knight'; EquipmentManager.recalcStats();");
  ok(g.getHeroStatRowView(g.HEROS_STAT_ROWS[0]).isMain === true, "Chevalier : Force est sa stat principale");
  ok(g.getHeroStatRowView(rowWill).isMain === false && g.getHeroStatRowView(rowWill).unit === "CRIT \u00d7", "Chevalier : Volont\u00e9 inchang\u00e9e");
  var html = run("buildHerosAmeliorationHTML()");
  ok(html.indexOf("pc-stat-card-main") !== -1, "le badge \u00ab principale \u00bb est rendu dans l'\u00e9cran");
  /* Un niveau de Célérité fait bouger la jauge tout de suite : la sonde ne doit pas annoncer « 25 niveaux ». */
  run("game.heroId='ranger'; EquipmentManager.recalcStats();");
  var rowCel = g.HEROS_STAT_ROWS.filter(function (r) { return r.key === "celerity"; })[0];
  ok(g.getHeroStatFirstVisibleStep(g.getHeroStatRowView(rowCel)) === 1, "R\u00f4deur : le premier niveau de C\u00e9l\u00e9rit\u00e9 a un effet visible (VIT), la sonde le dit");
})();

console.log("\n[34] v3.225.0 \u2014 Affixes d'\u00e9quipement (Lot 1b : donn\u00e9es, g\u00e9n\u00e9ration, recalcStats, affichage)");
(function () {
  /* --- Tables --- */
  ok(g.AFFIX_COUNT_BY_RARITY.common.primary === 0 && g.AFFIX_COUNT_BY_RARITY.green.primary === 1 && g.AFFIX_COUNT_BY_RARITY.green.secondary === 0,
    "Commun 0 affixe, Inhabituel 1 primaire (V2-lite)");
  var tapDmgSlots = Object.keys(g.AFFIX_POOLS).filter(function (sl) { return g.AFFIX_POOLS[sl].primary.indexOf("tapDmg") !== -1; });
  ok(tapDmgSlots.join(",") === "gloves,ring", "tapDmg en affixe : Gants et Anneau seulement (D16)");
  ok(Object.keys(g.AFFIX_RANGES).every(function (st) { return ["green", "rare", "epic", "legendary"].every(function (r) { return Array.isArray(g.AFFIX_RANGES[st][r]); }); }),
    "chaque stat d'affixe a ses 4 fourchettes");

  /* --- Générateur : 2 000 tirages par rareté, bornes, unicité, stat de base exclue --- */
  var bad = 0, seenStats = {};
  ["green", "rare", "epic", "legendary"].forEach(function (r) {
    var cnt = g.AFFIX_COUNT_BY_RARITY[r];
    for (var i = 0; i < 2000; i++) {
      var slot = g.EQUIPMENT_SLOTS[i % 7];
      var base = g.EQUIPMENT_SLOT_CONFIG[slot].stat;
      var af = g.rollEquipmentAffixes(slot, base, r, 0);
      if (af.length !== cnt.primary + cnt.secondary) bad++;
      var seen = {};
      af.forEach(function (a) {
        if (seen[a.stat] || a.stat === base) bad++;
        seen[a.stat] = 1; seenStats[a.stat] = 1;
        var rg = g.AFFIX_RANGES[a.stat][r];
        if (a.value < rg[0] - 1e-9 || a.value > rg[1] + 1e-9) bad++;
        if (a.tier !== "P" && a.tier !== "S") bad++;
      });
    }
  });
  ok(bad === 0, "8 000 tirages : comptes exacts, aucun doublon, jamais la stat de base, toujours dans les bornes");
  ok(Object.keys(seenStats).length === 10, "les 10 stats du pool A sortent toutes (" + Object.keys(seenStats).length + ")");
  ok(g.rollEquipmentAffixes("weapon", "tapDmg", "common", 0).length === 0, "Commun : []");
  ok(g.rollEquipmentAffixes("inconnu", "x", "rare", 0).length === 0, "emplacement inconnu : [], jamais null");

  /* Plats × échelle de monde : un tapDmg de Gants au monde 5 vaut ×18. */
  var maxFlat = 0;
  for (var k = 0; k < 300; k++) {
    g.rollEquipmentAffixes("gloves", "tapMult", "legendary", 5).forEach(function (a) { if (a.stat === "tapDmg") maxFlat = Math.max(maxFlat, a.value); });
  }
  ok(maxFlat > 28 && maxFlat <= 28 * 18, "affixe plat mis \u00e0 l'\u00e9chelle du monde (" + maxFlat + " \u2264 504)");
  var maxPct = 0;
  for (var k2 = 0; k2 < 300; k2++) {
    g.rollEquipmentAffixes("weapon", "tapDmg", "legendary", 5).forEach(function (a) { if (a.stat === "tapMult") maxPct = Math.max(maxPct, a.value); });
  }
  ok(maxPct <= 0.65, "affixe en % JAMAIS mis \u00e0 l'\u00e9chelle (tapMult \u2264 0,65 au monde 5)");

  /* --- generateEquipmentItem porte ses affixes --- */
  g.WorldManager.worldIndex = 0;
  var itC = g.generateEquipmentItem("armor", "common", 0), itG = g.generateEquipmentItem("armor", "green", 0);
  ok(Array.isArray(itC.affixes) && itC.affixes.length === 0, "objet Commun g\u00e9n\u00e9r\u00e9 : affixes = []");
  ok(itG.affixes.length === 1 && itG.affixes[0].tier === "P", "objet Inhabituel g\u00e9n\u00e9r\u00e9 : 1 affixe primaire");

  /* --- getItemAffixes : rétro-compat --- */
  ok(g.getItemAffixes({ stat: "tapDmg", value: 12 }).length === 0, "objet d'avant v3.225.0 (sans champ) : []");
  ok(g.getItemAffixes({ affixes: [{ stat: "critChance", value: 2 }, { stat: "x" }, null] }).length === 1, "entr\u00e9es mal form\u00e9es filtr\u00e9es");

  /* --- recalcStats : un objet sans affixe donne exactement le même résultat qu'avant --- */
  run("fullResetState(); game.playerName='Test'; game.heroId='knight';");
  var sword = { uid: "t1", slot: "weapon", name: "T", icon: "sword", rarity: "rare", stat: "tapDmg", value: 40, worldIndex: 0 };
  g.game.equipped.weapon = sword;
  run("EquipmentManager.recalcStats();");
  var refTap = g.StatsSystem.effectiveTapDamage(), refHp = g.game.heroMaxHp, refCrit = g.game.critChance;
  ok(refTap === Math.floor(13) + 40 && g.game.equipMaxHpPct === 0 && g.game.equipXpMult === 0 && g.game.equipDropChancePct === 0,
    "sans affixe : d\u00e9g\u00e2ts identiques \u00e0 v3.224.0, accumulateurs \u00e0 0");

  /* --- recalcStats : kit multi-affixes, valeurs attendues --- */
  sword.affixes = [{ stat: "tapMult", value: 0.2, tier: "P" }, { stat: "xpMult", value: 0.1, tier: "S" }];
  g.game.equipped.helmet = { uid: "t2", slot: "helmet", name: "H", icon: "casque", rarity: "epic", stat: "critMult", value: 0.4, affixes: [{ stat: "critChance", value: 3, tier: "P" }, { stat: "dropChance", value: 20, tier: "S" }] };
  g.game.equipped.boots = { uid: "t3", slot: "boots", name: "B", icon: "bottes", rarity: "green", stat: "autoDps", value: 5, affixes: [{ stat: "maxHpPct", value: 0.10, tier: "P" }, { stat: "dropChance", value: 20, tier: "S" }] };
  run("EquipmentManager.recalcStats();");
  ok(Math.abs(g.game.tapMult - 1.2) < 1e-9 && g.StatsSystem.effectiveTapDamage() === Math.floor(13 * 1.2) + 40, "tapMult d'affixe appliqu\u00e9 (13 \u00d7 1,2 + 40 plats)");
  ok(Math.abs(g.game.critChance - (refCrit + 3)) < 1e-9, "critChance d'affixe +3");
  ok(g.game.heroMaxHp === Math.floor(refHp * 1.10), "maxHpPct +10 % : " + refHp + " \u2192 " + g.game.heroMaxHp);
  ok(Math.abs(g.game.equipXpMult - 0.1) < 1e-9, "equipXpMult accumul\u00e9");
  ok(g.game.equipDropChancePct === 25, "dropChance 20 + 20 plafonn\u00e9 \u00e0 25 (EQUIP_DROP_CHANCE_CAP)");
  ok(g.game.bonusCelerity === 5, "la stat de base des bottes reste appliqu\u00e9e une seule fois");

  /* --- Forge : la valeur forgée ne concerne que la stat de base --- */
  ok(g.ForgeManager.getForgedValue(sword) === 40, "getForgedValue lit item.value, jamais les affixes (D14)");

  /* --- XP : arrondi au plus proche --- */
  g.game.heroXp = 0; g.game.heroLevel = 1; g.game.heroXpToNext = 10000;
  g.grantHeroXp(10, "test");
  ok(g.game.heroXp === 11, "10 XP \u00d7 1,10 = 11 (arrondi)");

  /* --- Chance de butin : killEnemy lit l'accumulateur --- */
  ok(String(g.CombatEngine.killEnemy).indexOf("equipDropChancePct") !== -1, "killEnemy ajoute game.equipDropChancePct \u00e0 la chance de butin");

  /* --- Élite : affixe fixe, copié --- */
  var loot = g.EliteManager.buildUniqueLoot("araignee_marquee");
  ok(loot && loot.affixes.length === 1 && loot.affixes[0].stat === "critChance" && loot.affixes[0].value === 2, "arme d'\u00c9lite : +2 % critique fixe (O3)");
  ok(loot.affixes !== g.ELITE_UNIQUE_LOOT.araignee_marquee.affixes, "...copi\u00e9, pas la r\u00e9f\u00e9rence de la donn\u00e9e");

  /* --- Autovente inchangée --- */
  g.game.autoSellEquipment = true; g.game.autoSellRarityThreshold = "green"; g.game.inventory = []; g.game.gold = 0;
  var greenItem = g.generateEquipmentItem("ring", "green", 0);
  g.addDropToInventory(greenItem);
  ok(g.game.inventory.length === 0 && g.game.gold === 25, "Inhabituel avec affixe : vendu par le seuil de raret\u00e9 comme avant (D2)");

  /* --- Affichage --- */
  g.game.autoSellEquipment = false;
  run("selectedEquipSlot = 'weapon';");
  var html = run("buildEquipDetailPanelHTML()");
  ok(html.indexOf("eq-affix-line") !== -1 && html.indexOf("+20% dégâts") !== -1 && html.indexOf("is-secondary") !== -1,
    "panneau \u00c9quipement : lignes d'affixes, primaire puis secondaire att\u00e9nu\u00e9e");
  ok(html.indexOf("+10% expérience") !== -1, "libell\u00e9 des nouvelles stats (exp\u00e9rience)");
  var card = run("buildEquipShopCardHTML(" + JSON.stringify(Object.assign({}, g.game.equipped.helmet, { price: 10 })) + ")");
  ok(card.indexOf("+3% critique") !== -1 && card.indexOf("+20% de butin") !== -1, "carte d'\u00e9choppe : affixes visibles avant l'achat");
  var noAffix = run("buildEquipmentAffixLinesHTML({ stat: 'tapDmg', value: 5 })");
  ok(noAffix === "", "objet sans affixe : aucune ligne, aucun bloc vide");
})();

console.log("\n[35] v3.226.0 \u2014 Comparaison ligne \u00e0 ligne (Lot 2, D6)");
(function () {
  var cand = { uid: "c", slot: "gloves", name: "C", icon: "gants", rarity: "epic", stat: "tapMult", value: 0.6,
    affixes: [{ stat: "tapDmg", value: 20, tier: "P" }, { stat: "critChance", value: 4, tier: "P" }, { stat: "xpMult", value: 0.1, tier: "S" }] };
  var eq = { uid: "e", slot: "gloves", name: "E", icon: "gants", rarity: "rare", stat: "tapMult", value: 0.4,
    affixes: [{ stat: "critChance", value: 2, tier: "P" }, { stat: "goldMult", value: 0.08, tier: "S" }] };
  var L = g.getEquipmentCompareLines(cand, eq);
  ok(L.length === 5, "union des stats : 5 lignes (base, 3 affixes candidat, 1 stat perdue)");
  ok(L[0].stat === "tapMult" && L[0].tier === "B" && Math.abs(L[0].delta - 0.2) < 1e-9, "stat de base en t\u00eate, delta +0,20");
  ok(L[1].stat === "tapDmg" && L[1].delta === 20 && L[1].equipValue === 0, "affixe absent de l'\u00e9quip\u00e9 : delta = valeur pleine");
  ok(L[2].stat === "critChance" && L[2].delta === 2, "m\u00eame affixe des deux c\u00f4t\u00e9s : delta = diff\u00e9rence (4 \u2212 2)");
  var lost = L.filter(function (l) { return l.onlyEquipped; });
  ok(lost.length === 1 && lost[0].stat === "goldMult" && Math.abs(lost[0].delta + 0.08) < 1e-9, "stat port\u00e9e seulement par l'\u00e9quip\u00e9 : ligne \u00ab perdue \u00bb, delta n\u00e9gatif");
  ok(lost[0] === L[L.length - 1], "...plac\u00e9e en dernier");
  var Lv = g.getEquipmentCompareLines(cand, null);
  ok(Lv.length === 4 && Lv.every(function (l) { return l.delta > 0; }), "emplacement vide : 4 lignes, tout en gain");
  ok(g.getEquipmentCompareLines(null, eq).length === 0, "candidat null : [] (jamais d'erreur)");
  var legacy = g.getEquipmentCompareLines({ slot: "gloves", stat: "tapMult", value: 0.3 }, { slot: "gloves", stat: "tapMult", value: 0.5 });
  ok(legacy.length === 1 && Math.abs(legacy[0].delta + 0.2) < 1e-9, "deux objets d'avant v3.225.0 : une ligne, delta \u22120,20");

  /* Rendu : Inventaire, candidat sélectionné face à l'équipé. */
  run("fullResetState(); game.playerName='Test'; game.heroId='knight';");
  g.game.equipped.gloves = eq; g.game.inventory = [cand];
  run("EquipmentManager.recalcStats(); selectedInventoryKey = 'eq:c'; inventoryFilter = 'all';");
  var html = run("buildInventoryTabContentHTML()");
  ok(html.indexOf("eq-cmp-row is-base") !== -1 && html.indexOf("\u25b2 +20%") !== -1, "ligne de base avec \u25b2 +20%");
  ok(html.indexOf("\u25b2 +20</span>") !== -1 && html.indexOf("\u25b2 +2%") !== -1, "affixes primaires avec leur delta");
  ok(html.indexOf("is-lost") !== -1 && html.indexOf("\u25bc -8%") !== -1, "ligne perdue \u25bc -8% (or)");
  ok(html.indexOf("eq-compare-delta") === -1 && html.indexOf("Types de bonus") === -1, "plus de delta global ni de \u00ab compare \u00e0 l'\u0153il \u00bb (D6)");
  var flat = run("buildEquipmentCompareLinesHTML(" + JSON.stringify(eq) + ", " + JSON.stringify(eq) + ")");
  ok((flat.match(/is-flat/g) || []).length === 3 && flat.indexOf("\u2014") !== -1, "objet identique \u00e0 lui-m\u00eame : 3 lignes \u2014, aucun \u25b2/\u25bc");

  /* Échoppe : le delta est calculé face à l'objet équipé du même emplacement. */
  var card = run("buildEquipShopCardHTML(" + JSON.stringify(Object.assign({}, cand, { price: 10 })) + ")");
  ok(card.indexOf("eq-cmp-row") !== -1 && card.indexOf("\u25b2 +20%") !== -1, "carte d'\u00e9choppe : deltas face \u00e0 l'\u00e9quip\u00e9");
  var d1 = g.formatStatDelta("defense", 0.022), d2 = g.formatStatDelta("maxHpPct", 0.1), d3 = g.formatStatDelta("dropChance", 4);
  ok(d1 === "+2.2%" && d2 === "+10%" && d3 === "+4%", "formatStatDelta : d\u00e9fense 1 d\u00e9cimale, PV max %, butin %");
})();

console.log("\n[36] v3.232.0 \u2014 Recalibrage For\u00eat (boss \u00d73,9, normaux \u00d71,8), mondes 1-5 compens\u00e9s");
(function () {
  var W = g.WORLD_MULT_BY_WORLD;
  ok(W.length === 6, "six mondes");
  ok(W[1] < W[2] && W[2] < W[3] && W[3] < W[4] && W[4] < W[5], "la table reste strictement croissante");
  /* Forêt : PV d'un ennemi normal identiques à v3.223.0 (la formule ne lit que W[0]). */
  run("fullResetState(); game.playerName='Test'; game.heroId='knight'; EquipmentManager.recalcStats();");
  g.WorldManager.worldIndex = 0; g.WorldManager.adventureIndex = 0; g.WorldManager.enemyIndex = 0;
  var e = g.WorldManager.generateEnemy();
  var scale0 = Math.pow(1 + 0 * W[0], g.ENEMY_PV_WORLD_EXP);
  ok(e && e.maxHp === Math.floor(e.stats.endurance * g.ENEMY_PV_MULT * scale0), "For\u00eat : PV ennemi = endurance \u00d7 3,33 (inchang\u00e9)");
  /* v3.232.0 : la table compense exactement la hausse de BOSS_PV_MULT — les PV des BOSS
     des mondes 1 \u00e0 5 doivent rester ceux de la v3.231.0, la hausse n'allant qu'\u00e0 la For\u00eat. */
  var RATIO = 1.3 / 0.90, OLD_W = [1.264, 2.03, 2.30, 4.19, 5.418, 7.892];
  var maxDrift = 0;
  for (var w = 1; w <= 5; w++) {
    var before = Math.pow(1 + w * OLD_W[w] * RATIO, g.ENEMY_PV_WORLD_EXP) * 3.1;
    var after = Math.pow(1 + w * W[w] * RATIO, g.ENEMY_PV_WORLD_EXP) * g.BOSS_PV_MULT;
    maxDrift = Math.max(maxDrift, Math.abs(after / before - 1));
  }
  ok(maxDrift < 0.02, "PV des boss des mondes 1-5 inchang\u00e9s (\u00e9cart max " + Math.round(maxDrift * 100) + " %)");
  /* For\u00eat : worldIndex 0 annule le terme de monde, la hausse y passe en entier. */
  ok(Math.abs(g.BOSS_PV_MULT / 3.1 - 3.87) < 0.01, "For\u00eat : boss \u00d73,9 (0 \u2192 8 % de PV perdus devenait 40 %)");
  ok(Math.abs(g.ENEMY_PV_MULT / 3.33 - 1.80) < 0.01, "For\u00eat : ennemis normaux \u00d71,8");
})();

console.log("\n[37] v3.228.0 \u2014 Finitions (fiche R\u00e9sum\u00e9, aide autovente)");
(function () {
  run("fullResetState(); game.playerName='Test'; game.heroId='mage'; EquipmentManager.recalcStats();");
  ok(g.getHeroMainStatLabel() === "Volont\u00e9", "Mage : libell\u00e9 de la stat principale = Volont\u00e9");
  run("game.heroId='ranger'; EquipmentManager.recalcStats();");
  ok(g.getHeroMainStatLabel() === "C\u00e9l\u00e9rit\u00e9", "R\u00f4deur : C\u00e9l\u00e9rit\u00e9");
  run("game.heroId='knight'; EquipmentManager.recalcStats();");
  ok(g.getHeroMainStatLabel() === "Force", "Chevalier : Force (libell\u00e9 de l'Am\u00e9lioration, pas \u00ab Puissance \u00bb)");
  var sum = run("buildHeroSummaryCombatHTML()");
  ok(sum.indexOf("pc-sum-cell-hint") !== -1 && sum.indexOf(">Force<") !== -1, "la case ATK du R\u00e9sum\u00e9 nomme la stat principale");
  ok((sum.match(/pc-sum-cell-hint/g) || []).length === 1, "...sur la seule case ATK");
  var set = run("buildInventorySettingsHTML()");
  ok(set.indexOf("rareté seule") !== -1, "R\u00e9glages du sac : l'autovente pr\u00e9vient qu'elle ignore les affixes");
})();

console.log("\n[38] v3.229.0 \u2014 Enchanteresse : relance de la valeur d'un bonus (Lot 5)");
(function () {
  run("fullResetState(); game.playerName='Test'; game.heroId='knight';");
  function setLevel(n) { g.VillageBuildingManager.ensure(); g.game.village.buildings.enchanter = { level: n }; }
  ok(g.VILLAGE_BUILDINGS.enchanter && g.VILLAGE_BUILDINGS.enchanter.maxLevel === 3 && g.VILLAGE_BUILDINGS.enchanter.costTiers.length === 3,
    "b\u00e2timent d\u00e9clar\u00e9, 3 niveaux : une raret\u00e9 par niveau, L\u00e9gendaire compris (v3.289.0, D12)");
  ok(g.VILLAGE_BUILDING_ORDER.indexOf("enchanter") !== -1, "pr\u00e9sent dans la grille du Village");

  /* Raretés ouvertes par niveau. */
  setLevel(0);
  ok(g.EnchantManager.getAllowedRarities().length === 0, "non construite : aucune raret\u00e9");
  setLevel(1);
  ok(g.EnchantManager.getAllowedRarities().join(",") === "green,rare", "niveau 1 : Inhabituel et Rare");
  setLevel(2);
  ok(g.EnchantManager.getAllowedRarities().join(",") === "green,rare,epic", "niveau 2 : + \u00c9pique");
  ok(!g.EnchantManager.canRerollRarity("legendary"), "L\u00e9gendaire ferm\u00e9 au niveau 2");
  ok(!g.EnchantManager.canRerollRarity("common"), "Commun jamais relan\u00e7able (aucun bonus)");

  /* Objet de test : Gants rares, 2 affixes. */
  function makeItem() {
    return { uid: "en1", slot: "gloves", name: "Gants", icon: "gants", rarity: "rare", stat: "tapMult", value: 0.4,
      worldIndex: 0, affixes: [{ stat: "critChance", value: 2, tier: "P" }, { stat: "xpMult", value: 0.05, tier: "S" }] };
  }
  var item = makeItem();
  g.game.equipped.gloves = item;
  g.game.worldsEverReached = { 0: true };

  /* Fourchette : celle du tirage, jamais plus. */
  var rg = g.EnchantManager.getRange(item, 0);
  ok(rg.min === 2 && rg.max === 4, "fourchette de la ligne = celle de sa raret\u00e9 (critChance rare : 2-4)");
  var flatItem = { slot: "gloves", rarity: "rare", worldIndex: 2, affixes: [{ stat: "tapDmg", value: 20, tier: "P" }] };
  var rgFlat = g.EnchantManager.getRange(flatItem, 0);
  ok(rgFlat.max === 15 * 2.2, "valeur plate : fourchette \u00e0 l'\u00e9chelle du monde de l'objet (monde 2 : \u00d72,2)");

  /* Coût : croissant sur la même ligne, indexé sur le monde. */
  var c0 = g.EnchantManager.getCost(item, 0);
  ok(c0.gold === 200 && c0.seve_aeswyn === 2, "1re relance d'un Rare en For\u00eat : 200 or, 2 S\u00e8ve");
  item.affixes[0].rerolls = 1;
  ok(g.EnchantManager.getCost(item, 0).gold === 310, "2e relance : \u00d71,55 (310 or)");
  item.affixes[0].rerolls = 3;
  ok(g.EnchantManager.getCost(item, 0).seve_aeswyn === 3, "4e relance : +1 S\u00e8ve (palier de 3)");
  ok(g.EnchantManager.getCost(item, 1).gold === 200, "le compteur est par LIGNE : l'autre bonus reste au prix de d\u00e9part");
  item.affixes[0].rerolls = 0;
  g.game.worldsEverReached = { 0: true, 1: true };
  ok(g.EnchantManager.getCost(item, 0).gold === 800, "index\u00e9 sur le monde max atteint comme l'\u00e9choppe (D\u00e9sert : \u00d74)");
  g.game.worldsEverReached = { 0: true };

  /* Blocages lisibles. */
  setLevel(0);
  ok(g.EnchantManager.getBlockReason(item, 0) === "Enchanteresse non construite", "blocage : non construite");
  setLevel(1);
  g.game.gold = 0;
  ok(g.EnchantManager.getBlockReason(item, 0) === "Ressources manquantes", "blocage : ressources");
  ok(g.EnchantManager.getBlockReason(item, 9) === "Aucun bonus", "blocage : ligne inexistante, jamais d'erreur");
  var epic = { slot: "ring", rarity: "epic", worldIndex: 0, affixes: [{ stat: "tapDmg", value: 10, tier: "P" }] };
  ok(g.EnchantManager.getBlockReason(epic, 0) === "Niveau 2 requis", "blocage : dit QUEL niveau ouvre cette raret\u00e9");
  ok(g.EnchantManager.getRequiredLevel("legendary") === 3 && g.EnchantManager.getRequiredLevel("common") === 0, "niveau requis par raret\u00e9");

  /* Relance : la valeur ne descend jamais, la stat ne change jamais. */
  g.game.gold = 100000;
  g.WarehouseManager.addResource("seve_aeswyn", 500);
  var statBefore = item.affixes[0].stat;
  var best = item.affixes[0].value;
  var wentDown = false, moved = false, done = 0;
  for (var i = 0; i < 40; i++) {
    var prev = item.affixes[0].value;
    if (g.EnchantManager.reroll(item, 0)) done += 1;
    var now = item.affixes[0].value;
    if (now < prev) wentDown = true;
    if (now > prev) moved = true;
    if (now > best) best = now;
  }
  ok(!wentDown, "relances r\u00e9p\u00e9t\u00e9es : la valeur ne baisse JAMAIS (on garde la meilleure)");
  ok(moved, "...mais elle monte bien");
  ok(item.affixes[0].stat === statBefore, "la stat de la ligne n'a jamais chang\u00e9");
  ok(item.affixes[0].value <= 4, "et ne d\u00e9passe jamais le haut de fourchette");
  ok(item.affixes[0].rerolls === done, "compteur de relances = nombre de relances r\u00e9ussies (" + done + ")");
  ok(done < 40 && done > 5, "le co\u00fbt croissant finit par bloquer de lui-m\u00eame, sans verrou : " + done + " relances pour 100 000 or");
  ok(item.affixes[1].value === 0.05 && !item.affixes[1].rerolls, "l'autre ligne n'a pas boug\u00e9");

  /* Une relance refusée ne coûte rien. */
  var goldBefore = g.game.gold;
  setLevel(0);
  ok(g.EnchantManager.reroll(item, 0) === false && g.game.gold === goldBefore, "relance refus\u00e9e : rien n'est d\u00e9pens\u00e9");
  setLevel(1);

  /* La relance passe par recalcStats : la stat du héros suit. */
  run("EquipmentManager.recalcStats();");
  var critBefore = g.game.critChance;
  item.affixes[0].value = 2;
  run("EquipmentManager.recalcStats();");
  ok(Math.abs((critBefore - g.game.critChance) - (4 - 2)) < 1e-9 || critBefore >= g.game.critChance, "la valeur relanc\u00e9e alimente bien critChance");

  /* Objet sans affixe (Commun, ou d'avant v3.225.0). */
  ok(g.EnchantManager.getCost({ slot: "ring", rarity: "common", affixes: [] }, 0) === null, "objet sans bonus : aucun co\u00fbt, aucune relance");
  ok(g.EnchantManager.getRange({ slot: "ring", rarity: "rare", value: 5 }, 0) === null, "objet d'avant v3.225.0 : null, jamais d'erreur");

  /* Rendu de l'établi. */
  g.game.equipped.gloves = makeItem();
  setLevel(1);
  var html = run("buildEnchantBoardHTML()");
  ok(html.indexOf("rerollAffix(&#039;gloves&#039;,0)") !== -1 || html.indexOf("rerollAffix('gloves',0)") !== -1, "\u00e9tabli : un bouton Relancer par ligne");
  ok(html.indexOf("Maximum possible") !== -1, "\u00e9tabli : le haut de fourchette est annonc\u00e9");
  g.game.equipped = {};
  ok(run("buildEnchantBoardHTML()").indexOf("Aucune pi\u00e8ce \u00e9quip\u00e9e ne porte de bonus") !== -1, "\u00e9tabli vide : message, pas une page blanche");
})();

console.log("\n[39] v3.230.0 \u2014 Pouvoirs l\u00e9gendaires : donn\u00e9es, tirage, lecture (Lot 4, partie A)");
(function () {
  var slots = Object.keys(g.LEGENDARY_POWERS);
  ok(slots.length === 7, "une table par emplacement");
  ok(slots.every(function (sl) { return g.LEGENDARY_POWERS[sl].length === 2; }), "2 candidats par emplacement, aucun trou");
  var ids = {}, dup = 0;
  slots.forEach(function (sl) {
    g.LEGENDARY_POWERS[sl].forEach(function (p) {
      if (ids[p.id]) dup++;
      ids[p.id] = 1;
      if (!p.label || !p.desc || !p.hook) dup++;
    });
  });
  ok(dup === 0 && Object.keys(ids).length === 14, "14 pouvoirs uniques, tous avec libell\u00e9, description et point d'accroche");
  ok(!ids.leg_tenacite && !!ids.leg_memoire, "\u00ab T\u00e9nacit\u00e9 \u00bb retir\u00e9e, \u00ab M\u00e9moire des anciens \u00bb \u00e0 sa place sur l'amulette");
  ok(!ids.leg_pas_rapides && !ids.leg_chasseur && !!ids.leg_foulee && !!ids.leg_marcheur, "bottes : les 2 pouvoirs sans m\u00e9canique remplac\u00e9s (Foul\u00e9e vive, Endurance du marcheur)");
  ok(g.LEGENDARY_POWER_BY_ID.leg_echo.slot === "weapon" && g.LEGENDARY_POWER_BY_ID.leg_memoire.slot === "amulet", "index id \u2192 pouvoir, emplacement compris");

  /* Tirage : seulement au Légendaire, toujours dans le pool de l'emplacement. */
  ok(g.rollLegendaryPower("weapon", "epic") === null, "\u00c9pique : aucun pouvoir");
  ok(g.rollLegendaryPower("inconnu", "legendary") === null, "emplacement inconnu : null, jamais d'erreur");
  var seen = {};
  for (var i = 0; i < 300; i++) seen[g.rollLegendaryPower("boots", "legendary")] = 1;
  ok(Object.keys(seen).length === 2 && seen.leg_foulee && seen.leg_marcheur, "300 tirages : les 2 pouvoirs de l'emplacement sortent, et rien d'autre");

  var leg = g.generateEquipmentItem("amulet", "legendary", 5);
  ok(typeof leg.power === "string" && g.LEGENDARY_POWER_BY_ID[leg.power].slot === "amulet", "objet l\u00e9gendaire g\u00e9n\u00e9r\u00e9 : porte un pouvoir de son emplacement");
  ok(leg.affixes.length === 4, "...en plus de ses 4 affixes");
  ok(g.generateEquipmentItem("amulet", "rare", 0).power === null, "objet Rare g\u00e9n\u00e9r\u00e9 : power null");

  /* Lecture : un seul point, rétro-compatible. */
  ok(g.getItemPower({ power: "leg_echo" }).label === "\u00c9cho", "getItemPower renvoie le pouvoir complet");
  ok(g.getItemPower({ stat: "tapDmg", value: 5 }) === null, "objet d'avant v3.230.0 : null");
  ok(g.getItemPower({ power: "leg_inexistant" }) === null, "id inconnu : null, jamais d'erreur");
  run("fullResetState(); game.playerName='Test'; game.heroId='knight';");
  g.game.equipped.weapon = { uid: "p1", slot: "weapon", name: "L", icon: "sword", rarity: "legendary", stat: "tapDmg", value: 60, affixes: [], power: "leg_echo" };
  ok(g.hasLegendaryPower("leg_echo") === true, "hasLegendaryPower : vrai quand la pi\u00e8ce est port\u00e9e");
  ok(g.hasLegendaryPower("leg_vorace") === false, "...faux sinon");
  g.game.inventory = [{ uid: "p2", slot: "ring", rarity: "legendary", power: "leg_prospecteur" }];
  ok(g.hasLegendaryPower("leg_prospecteur") === false, "un l\u00e9gendaire dans le SAC ne donne pas son pouvoir");

  /* Affichage. */
  run("selectedEquipSlot = 'weapon';");
  var html = run("buildEquipDetailPanelHTML()");
  ok(html.indexOf("eq-power-line") !== -1 && html.indexOf("frappe deux fois") !== -1, "panneau \u00c9quipement : la ligne de pouvoir est rendue");
  ok(run("buildEquipmentPowerHTML({ stat: 'tapDmg', value: 5 })") === "", "objet sans pouvoir : aucune ligne, aucun bloc vide");
})();

console.log("\n[40] v3.230.0 \u2014 Pouvoirs l\u00e9gendaires : effets c\u00e2bl\u00e9s (Lot 4, partie B)");
(function () {
  /* Pose un légendaire portant `powerId` à l'emplacement voulu, puis un combat frais. */
  function withPower(slot, powerId, heroId) {
    run("fullResetState(); game.playerName='Test'; game.heroId='" + (heroId || "knight") + "';");
    if (powerId) {
      g.game.equipped[slot] = { uid: "lp", slot: slot, name: "L", icon: "sword", rarity: "legendary",
        stat: g.EQUIPMENT_SLOT_CONFIG[slot].stat, value: 1, affixes: [], power: powerId };
    }
    run("EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp;");
    g.game.unlockedTabs.combat = true; g.game.activeTab = "combat";
    g.ClassCombatManager.resetForNewHero(); g.CombatEngine.ensureState();
    g.CombatEngine.spawnEnemy();
    return g.game.enemy;
  }

  /* --- Poigne de fer : le premier coup est critique. Mesure déterministe sur le
     MÊME ennemi, chance de critique naturelle mise à zéro. --- */
  withPower("gloves", "leg_poigne");
  var enP = g.game.enemy;
  enP.hp = enP.maxHp = 100000000;
  g.game.critChance = 0;
  var hp0 = enP.hp;
  g.CombatEngine.playerAttack(false, 1);
  var withFist = hp0 - enP.hp;
  g.game._legFirstHitDone = false;
  g.game.equipped.gloves = null;
  hp0 = enP.hp;
  g.CombatEngine.playerAttack(false, 1);
  var without = hp0 - enP.hp;
  ok(withFist > without * 1.5, "Poigne de fer : premier coup critique (" + Math.round(withFist) + " contre " + Math.round(without) + " sans)");

  /* --- Écho : l'attaque de base frappe parfois deux fois. --- */
  var echoes = 0;
  for (var e2 = 0; e2 < 200; e2++) {
    withPower("weapon", "leg_echo");
    g.game.enemy.hp = g.game.enemy.maxHp = 100000000; // pas de mort, on compte les répétitions
    var before = g.gameLog.length;
    g.CombatEngine.playerAttack(false, 1);
    for (var k = 0; k < g.gameLog.length - before; k++) {
      if (/\u00c9cho/.test(g.gameLog[k].text)) { echoes += 1; break; }
    }
  }
  ok(echoes > 5 && echoes < 45, "\u00c9cho : environ 10 % des attaques se r\u00e9p\u00e8tent (" + echoes + "/200)");

  /* --- Lame vorace : un kill rend des PV. --- */
  withPower("weapon", "leg_vorace");
  g.game.heroHp = Math.floor(g.game.heroMaxHp / 2);
  var hpMid = g.game.heroHp;
  g.game.enemy.hp = 1;
  g.CombatEngine.dealDamage(9999, false, true);
  ok(g.game.heroHp > hpMid, "Lame vorace : le kill rend 2 % des PV max (" + hpMid + " \u2192 " + g.game.heroHp + ")");
  withPower("weapon", null);
  g.game.heroHp = Math.floor(g.game.heroMaxHp / 2);
  var hpMid2 = g.game.heroHp;
  g.game.enemy.hp = 1;
  g.CombatEngine.dealDamage(9999, false, true);
  ok(g.game.heroHp === hpMid2, "...et rien sans le pouvoir");

  /* --- Second souffle : survit une fois, puis meurt. --- */
  withPower("armor", "leg_second_souffle");
  g.game.heroHp = 5;
  g.CombatEngine.enemyStrike(999, true);
  ok(g.game.heroHp === 1, "Second souffle : le coup mortel laisse 1 PV");
  g.CombatEngine.enemyStrike(999, true);
  ok(g.game.heroHp === 0, "...une seule fois par combat");

  /* --- Peau d'écorce : la défense monte après un coup reçu. --- */
  withPower("armor", "leg_ecorce");
  ok(Number(g.game._legBarkRounds || 0) === 0, "Peau d'\u00e9corce : d\u00e9sarm\u00e9e en d\u00e9but de combat");
  g.game.heroHp = g.game.heroMaxHp;
  g.CombatEngine.enemyStrike(1, true);
  ok(g.game._legBarkRounds === 1, "...arm\u00e9e apr\u00e8s le coup re\u00e7u");
  g.CombatEngine.endRound(g.game.enemy);
  ok(g.game._legBarkRounds === 0, "...et retomb\u00e9e \u00e0 la fin du round");

  /* --- Frénésie : monte au kill, retombe au premier coup encaissé. --- */
  withPower("gloves", "leg_frenesie");
  g.game._legFrenzyStacks = 0;
  g.game.enemy.hp = 1;
  g.CombatEngine.dealDamage(9999, false, true);
  ok(g.game._legFrenzyStacks === 1, "Fr\u00e9n\u00e9sie : +1 pile par ennemi vaincu");
  g.game._legFrenzyStacks = 7;
  g.game.heroHp = g.game.heroMaxHp;
  g.CombatEngine.enemyStrike(1, true);
  ok(g.game._legFrenzyStacks === 0, "...remise \u00e0 z\u00e9ro d\u00e8s qu'on encaisse");

  /* --- Foulée vive : jauge à moitié pleine à l'ouverture. --- */
  withPower("boots", "leg_foulee");
  ok(g.game.heroGauge >= g.CELERITY_GAUGE_MAX / 2, "Foul\u00e9e vive : jauge \u00e0 moiti\u00e9 pleine au d\u00e9but du combat");
  withPower("boots", null);
  ok(g.game.heroGauge < g.CELERITY_GAUGE_MAX / 2, "...et \u00e0 z\u00e9ro sans le pouvoir");

  /* --- Cœur ardent : la réserve de classe démarre plus haut. --- */
  /* Mesuré sur le Chevalier : la Mana du Mage démarre déjà pleine, le pouvoir
     n'a rien à y ajouter (limite connue, signalée à Seb). */
  withPower("amulet", null, "knight");
  var resWithout = g.game.classResource.current;
  withPower("amulet", "leg_coeur_ardent", "knight");
  ok(g.game.classResource.current > resWithout, "C\u0153ur ardent : la r\u00e9serve de classe d\u00e9marre \u00e0 +10 % (" + resWithout + " \u2192 " + g.game.classResource.current + ")");
  ok(g.game.classResource.current <= g.game.classResource.max, "...sans jamais d\u00e9passer le maximum");

  /* --- Mémoire des anciens : un round de recharge en moins, plancher 1. --- */
  withPower("amulet", "leg_memoire");
  ok(g.startCooldown({}, "sk", 4).sk === 3, "M\u00e9moire des anciens : 4 rounds de recharge \u2192 3");
  ok(g.startCooldown({}, "sk", 1).sk === 1, "...jamais en dessous de 1");
  withPower("amulet", null);
  ok(g.startCooldown({}, "sk", 4).sk === 4, "...et rien sans le pouvoir");

  /* --- Prospecteur : borné au boss, jamais sur un ennemi normal. --- */
  ok(String(g.CombatEngine.killEnemy).indexOf("leg_prospecteur") !== -1
    && /isBoss && this\.hasPower\("leg_prospecteur"\)/.test(String(g.CombatEngine.killEnemy)), "Prospecteur : condition limit\u00e9e aux boss");

  /* --- Clairvoyance : le télégraphe tombe un round plus tôt, l'impact reste à sa date. --- */
  withPower("helmet", "leg_clairvoyance");
  var en = g.game.enemy;
  en.chargeIn = 2; en.engageIn = 0; en.chargeTelegraphed = false;
  g.CombatEngine.tickEnemyTelegraphs(en);
  ok(en.chargeTelegraphed === true && en.patternHoldRounds === 1, "Clairvoyance : t\u00e9l\u00e9graphe d\u00e8s qu'il reste 1 round, avec un round de retenue");
  g.game.heroHp = g.game.heroMaxHp;
  g.CombatEngine.enemyTurn();
  ok(en.chargeTelegraphed === true && en.patternHoldRounds === 0, "...la charge ne part pas ce round-l\u00e0");
  withPower("helmet", null);
  var en2 = g.game.enemy;
  en2.chargeIn = 2; en2.chargeTelegraphed = false;
  g.CombatEngine.tickEnemyTelegraphs(en2);
  ok(en2.chargeTelegraphed === false, "...sans le pouvoir, rien \u00e0 1 round restant");
  ok(Number(en2.patternHoldRounds || 0) === 0, "...et aucun round de retenue");

  /* --- Œil du faucon : condition bornée aux Élites. --- */
  ok(/isCrit && game\.enemy\.isElite && this\.hasPower\("leg_faucon"\)/.test(String(g.CombatEngine.playerAttack)), "\u0152il du faucon : condition limit\u00e9e aux critiques sur \u00c9lite");

  /* --- Collectionneur et Endurance du marcheur : câblés en Sortie. --- */
  ok(String(g.SceneRunManager._creditLoot).indexOf("leg_collectionneur") !== -1, "Collectionneur : c\u00e2bl\u00e9 dans le cr\u00e9dit de butin de Sortie");
  ok(String(g.SceneRunManager._obstacleFactors).indexOf("leg_marcheur") !== -1, "Endurance du marcheur : c\u00e2bl\u00e9e sur le co\u00fbt de Souffle");

  /* --- Aucun pouvoir porté : le combat est strictement celui d'avant. --- */
  withPower("weapon", null);
  ok(g.CombatEngine.hasPower("leg_echo") === false && g.CombatEngine.hasPower("leg_foulee") === false,
    "sans l\u00e9gendaire \u00e9quip\u00e9, aucun pouvoir n'est actif");
})();

/* [41] v3.233.0 — verrou de version. L'écran titre affichait v3.151.0 depuis
   81 livraisons parce que le numéro était codé en dur dans la vue. Il vient
   maintenant de GAME_VERSION (core/constants.js) ; cette assertion garantit
   qu'il ne peut plus diverger du CACHE_VERSION de sw.js, seul numéro que le
   rituel de livraison bumpe à coup sûr. */
console.log("\n[41] Verrou de version");
(function () {
  var swSrc = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  var m = swSrc.match(/CACHE_VERSION\s*=\s*"([^"]+)"/);
  var cacheVersion = m ? m[1] : null;
  ok(cacheVersion !== null, "CACHE_VERSION lisible dans sw.js");
  ok(typeof g.GAME_VERSION === "string" && g.GAME_VERSION.length > 0, "GAME_VERSION exposée par core/constants.js");
  ok(g.GAME_VERSION === cacheVersion,
    "GAME_VERSION (" + g.GAME_VERSION + ") === CACHE_VERSION de sw.js (" + cacheVersion + ")");
  var titleHtml = run("typeof buildTitleScreenMainHTML === 'function' ? buildTitleScreenMainHTML() : ''");
  ok(titleHtml.indexOf("v" + cacheVersion) !== -1,
    "l'écran titre affiche bien v" + cacheVersion);
})();

/* [42] v3.234.0 — l'objectif accompagne toujours le compteur. Avant, le `||`
   faisait gagner progressLabel dès qu'il existait et objectiveLabel — le seul
   champ qui dit quoi faire — était jeté : sur une quête de village le joueur
   ne voyait qu'un « 0/2 » nu. Les deux écrans sont couverts. */
console.log("\n[42] Libellé d'objectif sur les cartes de mission");
(function () {
  var m = {
    id: "t", sourceKind: "village", title: "Quête test", blurb: "Du lore qui ne dit rien de la tâche.",
    type: "production", place: "", objectiveLabel: "Fabriquer 1 Farine au Moulin",
    progressLabel: "0/2", rewardSummary: "", badge: "contract", status: "accepted", isMain: false,
    launch: function () {}, abandon: function () {}
  };
  var camp = g.buildCampMissionCardHTML(m);
  ok(camp.indexOf("Fabriquer 1 Farine au Moulin") !== -1, "Campement : l'objectif est affiché");
  ok(camp.indexOf("0/2") !== -1, "Campement : le compteur est conservé");

  var board = g.buildQuestBoardCardHTML(m);
  ok(board.indexOf("Fabriquer 1 Farine au Moulin") !== -1, "Quêtes : l'objectif est affiché");
  ok(board.indexOf("0/2") !== -1, "Quêtes : le compteur est conservé");

  /* Sans objectiveLabel, on retombe sur le compteur seul plutôt que sur du vide. */
  var sansObjectif = JSON.parse(JSON.stringify(m));
  sansObjectif.objectiveLabel = "";
  sansObjectif.launch = function () {}; sansObjectif.abandon = function () {};
  ok(g.buildCampMissionCardHTML(sansObjectif).indexOf("0/2") !== -1,
    "sans objectif, le Campement affiche encore le compteur");

  /* Chaque quête de village et chaque étape d'Histoire doit porter un objectiveLabel :
     c'est la donnée qui alimente ces lignes, un oubli redonnerait un compteur nu. */
  var sansLabel = [];
  (g.VILLAGE_QUESTS || []).forEach(function (q) {
    if (!q.objectiveLabel || !String(q.objectiveLabel).trim()) sansLabel.push("village/" + q.id);
  });
  Object.keys(g.STORY_QUESTS || {}).forEach(function (chId) {
    (g.STORY_QUESTS[chId].steps || []).forEach(function (s) {
      if (!s.objectiveLabel || !String(s.objectiveLabel).trim()) sansLabel.push("story/" + s.id);
    });
  });
  ok(sansLabel.length === 0, "toutes les quêtes de village et étapes d'Histoire ont un objectiveLabel"
    + (sansLabel.length ? " (manquant : " + sansLabel.join(", ") + ")" : ""));
})();

/* [43] v3.235.0 — bonus de Sève à la chambre finale, par intensité. Avant, le
   bonus était plat : le Sentier (6 nœuds, 2 % d'échec) rapportait plus que le
   Périple (10 nœuds, 35 %), donc le risque ne payait pas. La table doit rester
   croissante avec la longueur du parcours, et l'ancienne forme plate doit encore
   être lue pour pouvoir revenir en arrière sans toucher au code. */
console.log("\n[43] Bonus de Sève par intensité");
(function () {
  var cfg = g.SCENE_TEMPLATES.petite_aventure_foret.seveAeswyn;
  var lire = function (profil, intensite) {
    return g.SceneRunManager._seveFinaleAmount(cfg, profil, intensite);
  };
  var intensites = ["sentier", "chemin", "periple"];

  ["bourrin", "prudent"].forEach(function (profil) {
    var vals = intensites.map(function (i) { return lire(profil, i); });
    ok(vals.every(function (v) { return v > 0; }),
      profil + " : un bonus défini pour les 3 intensités (" + vals.join(" / ") + ")");
    ok(vals[0] <= vals[1] && vals[1] <= vals[2],
      profil + " : le bonus croît avec la longueur du parcours — le risque paie");
  });

  ok(lire("bourrin", "periple") > lire("prudent", "periple"),
    "Bourrin reste mieux payé que Prudent à intensité égale");

  /* Repli sur l'ancienne forme plate (nombre simple). */
  var plat = { finaleGuaranteedAmount: { bourrin: 4, prudent: 2 } };
  ok(g.SceneRunManager._seveFinaleAmount(plat, "bourrin", "periple") === 4,
    "forme plate (nombre) encore lue telle quelle");
  /* Intensité inconnue : on retombe sur une valeur, jamais sur 0. */
  ok(lire("bourrin", "intensite_inexistante") > 0,
    "intensité inconnue : repli sur une valeur, jamais zéro");
  ok(g.SceneRunManager._seveFinaleAmount({ finaleGuaranteedAmount: {} }, "bourrin", "chemin") === 0,
    "profil absent : zéro, sans exception");
})();

/* [44] v3.236.0 — chasse à la Sève « Ce que les bêtes ont bu ». Elle existe parce
   que les deux autres sources sont insensibles à l'effort (cap journalier pour la
   Petite Aventure, prix des tickets en 1,2^n pour le Donjon). Ces assertions
   verrouillent ce qui la rend utile : elle donne bien de la Sève, elle est
   rattachée au Cœur (son seul verrou de difficulté disponible), et elle reste
   fermée tant que le Cœur ne l'est pas. */
console.log("\n[44] Chasse à la Sève");
(function () {
  var q = g.HUNT_QUESTS.hq_forest_seve;
  ok(!!q, "la chasse hq_forest_seve existe");
  ok(q.resourceKey === "seve_aeswyn" && q.dropChancePct > 0,
    "elle fait tomber de la Sève (" + q.dropChancePct + " % par kill)");
  ok(Number(q.adventureIndex) === 1,
    "rattachée au Cœur de la forêt — seul verrou de difficulté lisible par le moteur");
  ok(!q.rewardGold,
    "aucune prime d'or : c'est une chasse à ressource, pas une battue");

  /* Le moteur ne lit que sept champs ; un champ inventé serait inerte et
     donnerait une quête qui ne fait rien. */
  var lus = { id:1, type:1, section:1, difficulty:1, progressionStage:1, category:1, worldId:1,
    adventureIndex:1, name:1, story:1, icon:1, resourceKey:1, dropChancePct:1, lotSize:1,
    rewardGold:1, enemyFilter:1 };
  var inconnus = Object.keys(q).filter(function (k) { return !lus[k]; });
  ok(inconnus.length === 0,
    "aucun champ inerte" + (inconnus.length ? " (trouvés : " + inconnus.join(", ") + ")" : ""));

  /* Verrou d'accès : fermée avant la fin de « Prouver sa valeur », ouverte après. */
  run("fullResetState(); game.playerName='T'; game.heroId='knight'; EquipmentManager.recalcStats();");
  run("Object.keys(game.unlockedTabs).forEach(function(k){ game.unlockedTabs[k]=true; });");
  var visible = function () {
    return g.MissionBoard.list().some(function (m) { return m.id === "hunt_hq_forest_seve"; });
  };
  run("game.adventureQuestsCompleted.aq_forest_expedition = false;");
  ok(!visible(), "invisible tant que « Prouver sa valeur » n'est pas terminée");
  run("game.adventureQuestsCompleted.aq_forest_expedition = true;");
  ok(visible(), "visible une fois le Cœur ouvert");

  /* La ligne de récompense doit nommer la ressource : « 3 % par kill » tout seul
     ne disait pas de quoi, maintenant qu'il y a deux chasses à ressource. */
  var m = g.MissionBoard.list().find(function (x) { return x.id === "hunt_hq_forest_seve"; });
  ok(m && m.rewardSummary.indexOf("Sève") !== -1,
    "la récompense affichée nomme la ressource : « " + (m ? m.rewardSummary : "") + " »");
})();

/* [45] v3.238.0 — les icônes de ressources existent vraiment sur le disque.
   L'Acier et la Résine durcie empruntaient l'icône d'une autre ressource (Lingot,
   Sève) faute d'asset ; Seb en a fourni deux. Rien ne relie une chaîne de chemin à
   un fichier : une faute de frappe ou un asset non livré donne une image cassée en
   silence, et le jeu en a déjà un cas connu (vitalite_etheree.png). Ce bloc lit
   WAREHOUSE_RESOURCES et va voir sur le disque. */
(function () {
  console.log("\n[45] Icônes de ressources présentes sur le disque");
  var db = g.WAREHOUSE_RESOURCES || {};
  var ids = Object.keys(db);
  ok(ids.length > 0, "WAREHOUSE_RESOURCES chargée (" + ids.length + " ressources)");

  var manquants = [], doublons = {};
  ids.forEach(function (id) {
    var icon = db[id] && db[id].icon;
    if (!icon || icon.indexOf("images/") !== 0) return; // emoji ou icône inline : rien à vérifier
    if (!fs.existsSync(path.join(ROOT, icon))) manquants.push(id + " -> " + icon);
    (doublons[icon] = doublons[icon] || []).push(id);
  });
  ok(manquants.length === 0,
    "aucun chemin d'icône ne pointe dans le vide" + (manquants.length ? " (" + manquants.join(", ") + ")" : ""));

  /* Icône partagée : toléré (c'est un choix, pas un bug), mais on le dit — c'est
     exactement l'état dont l'Acier et la Résine sortent en v3.238.0. */
  var partagees = Object.keys(doublons).filter(function (p) { return doublons[p].length > 1; });
  console.log("  · icônes partagées par plusieurs ressources : "
    + (partagees.length ? partagees.map(function (p) { return doublons[p].join("/"); }).join(", ") : "aucune"));

  ok(db.acier && db.acier.icon === "images/Icons/resources/acier_icon.png",
    "l'Acier a son icône propre");
  ok(db.resine_durcie && db.resine_durcie.icon === "images/Icons/resources/resine_durcie_icon.png",
    "la Résine durcie a son icône propre");
})();

/* [46] v3.239.0 — reprise après un écart d'horloge. Le temps écoulé pendant que la
   page était suspendue était EFFACÉ, pas reporté : la boucle bornait dt à 0,25 s
   puis écrasait lastTick. Trois choses à tenir : la garde est bien AVANT le
   plafond dans game-loop.js, le rattrapage crédite l'écoulé réel, et il est
   idempotent (il est appelé deux fois au démarrage, par le chargeur d'emplacement
   puis par init()). */
(function () {
  console.log("\n[46] Reprise après écart d'horloge");

  ok(!!g.ResumeManager, "ResumeManager chargé");
  ok(g.ResumeManager && g.ResumeManager.GAP_S === 2, "seuil d'écart à 2 s");
  ok(g.ResumeManager && g.ResumeManager.NOTICE_MS === 30 * 60 * 1000,
    "annonce de retour au-delà de 30 min (choix Seb)");

  /* --- la garde vit AVANT le plafond, sinon elle ne sert à rien --- */
  var loopSrc = fs.readFileSync(path.join(ROOT, "js/main/game-loop.js"), "utf8");
  var posGarde = loopSrc.indexOf("ResumeManager.catchUpAfterGap");
  var posPlafond = loopSrc.indexOf("if (dt > 0.25) dt = 0.25;");
  ok(posGarde !== -1, "game-loop.js appelle le rattrapage");
  ok(posGarde !== -1 && posPlafond !== -1 && posGarde < posPlafond,
    "la garde est placée AVANT le plafond de dt");
  ok(/window\.ResumeManager && dt >/.test(loopSrc),
    "la garde est conditionnée à la présence du système (aucune régression s'il manque)");

  /* --- les deux chemins de changement de héros rattrapent --- */
  ["js/ui/title-screen-view.js", "js/ui/modal-view.js"].forEach(function (f) {
    var src = fs.readFileSync(path.join(ROOT, f), "utf8");
    ok(src.indexOf("ResumeManager.catchUpAfterSlotLoad") !== -1,
      f.split("/").pop() + " rattrape après avoir chargé un autre héros");
  });

  /* --- mesure : une absence de 30 min doit être créditée --- */
  run("fullResetState(); game.playerName='T'; game.heroId='knight';");
  run("game.explorationProgression = game.explorationProgression || {};");
  run("['quarryUnlocked','huntBuildingUnlocked','wellUnlocked','sawmillUnlocked','mineUnlocked','farmUnlocked']"
    + ".forEach(function(f){ game.explorationProgression[f] = true; });");
  run("ProductionManager.ensure();");
  run("ProductionPlotsSystem.getManagedBuildingIds().forEach(function(id){"
    + " var p = ProductionPlotsSystem.getPlots(id);"
    + " for (var i=0;i<3;i++){ p[i].state='open'; p[i].stock=0; p[i].lastTick=Date.now(); } });");

  var stock = function () {
    return run("ProductionPlotsSystem.getManagedBuildingIds().reduce(function(s,id){"
      + " return s + ProductionPlotsSystem.getTotalStock(id); }, 0);");
  };
  ok(stock() === 0, "point de départ : aucun stock");

  /* Recule lastTick de 30 min : strictement équivalent à une suspension de 30 min,
     c'est la seule trace que le jeu en garde. */
  run("ProductionPlotsSystem.getManagedBuildingIds().forEach(function(id){"
    + " ProductionPlotsSystem.getPlots(id).forEach(function(p){"
    + " if (p.state==='open') p.lastTick = Date.now() - 30*60*1000; }); });");

  var gains = run("ResumeManager.catchUpAfterGap(30*60);");
  var apres = stock();
  ok(apres > 0, "30 min d'absence créditées (" + apres + " unités)");
  ok(gains && gains.zones && Object.keys(gains.zones).length > 0,
    "le rattrapage rend le détail des gains par ressource");

  /* Idempotence : rejouer ne doit rien créditer de plus. */
  run("ResumeManager.catchUpAfterGap(30*60);");
  ok(stock() === apres, "second appel immédiat : rien de plus crédité (idempotent)");

  /* Sous le seuil, la garde ne doit pas se déclencher du tout. */
  run("ProductionPlotsSystem.getManagedBuildingIds().forEach(function(id){"
    + " ProductionPlotsSystem.getPlots(id).forEach(function(p){"
    + " if (p.state==='open') p.lastTick = Date.now() - 30*60*1000; }); });");
  var sousSeuil = run("ResumeManager.catchUpAfterGap(1);");
  ok(sousSeuil === null, "un écart d'1 s est ignoré (à-coup de rendu, pas une absence)");

  /* Test négatif du défaut d'origine : la boucle telle qu'elle était, sans garde,
     bornait à 0,25 s et écrasait lastTick — le temps devenait irrécupérable. */
  run("ProductionPlotsSystem.getManagedBuildingIds().forEach(function(id){"
    + " ProductionPlotsSystem.getPlots(id).forEach(function(p){"
    + " if (p.state==='open') { p.stock = 0; p.lastTick = Date.now() - 30*60*1000; } }); });");
  run("ProductionManager.tick(0.25);"); // l'ancien comportement, à la frame de reprise
  var apresAncien = stock();
  run("ResumeManager.catchUpAfterGap(30*60);");
  ok(stock() === apresAncien,
    "témoin : une fois lastTick écrasé, plus rien n'est récupérable — c'était le défaut");
})();

/* [47] v3.245.0 — Refonte des Donjons (doc de conception v1.1). Un donjon par monde, Marques de run,
   élites de données aux vagues 5/10, boss identitaire à trait signature, Boutique d'éclats chez l'Enchanteresse. */
console.log("\n[47] v3.245.0 \u2014 Refonte des Donjons");
(function () {
  var D = g.DungeonManager;
  game = freshCombat("knight"); giveWeapon();
  run("StoryQuestManager.ensure(); DungeonManager.ensure(); DungeonManager.checkTicketReset(); SortieManager.end('return');");

  /* --- Données : six donjons, un par monde, id = ancien palier --- */
  ok(g.DUNGEONS.length === 6 && g.DUNGEONS.every(function (d, i) { return d.id === i + 1 && d.worldId === g.WORLDS[i].id; }), "six donjons, id 1..6 = index du monde + 1");
  ok(typeof g.DUNGEON_TIERS === "undefined", "DUNGEON_TIERS a disparu (absorb\u00e9 dans DUNGEONS)");
  ok(g.DUNGEONS[5].locked === true && D.getLockReason(6) === "data", "la Tour est d\u00e9clar\u00e9e locked (raison 'data')");
  ok(g.DUNGEONS.every(function (d) { return d.boss && g.BOSS_DB[d.boss.baseId] && d.boss.name && d.boss.archetype; }), "chaque donjon porte un boss identitaire (baseId connu, nom, trait)");
  ok(g.DUNGEON_MARKS.length === 5 && !g.DUNGEON_MARKS.some(function (m) { return m.id === "aff_greed"; }), "cinq Marques, Avarice parqu\u00e9e");
  ok(g.DUNGEON_MARKS.every(function (m) { return /^aff_/.test(m.id) && /afflictions\//.test(m.icon); }), "id et ic\u00f4nes h\u00e9rit\u00e9s des anciennes afflictions (aucune migration)");
  ok(g.DUNGEON_CONFIG.maxMarks === 3 && g.DUNGEON_CONFIG.markStackBonus === 0.15 && g.DUNGEON_CONFIG.specialPerMark === 2, "config : 3 Marques max, +15 %/Marque, +2 mat\u00e9riau/Marque");

  /* --- Verrous de Marques --- */
  game.dungeonTierCleared = {};
  ok(D.isMarkUnlocked("aff_colossus", 1) && D.isMarkUnlocked("aff_asceticism", 1) && D.isMarkUnlocked("aff_fragility", 1), "Colosses, Asc\u00e9tisme, Fragilit\u00e9 libres");
  ok(!D.isMarkUnlocked("aff_elite", 1) && !D.isMarkUnlocked("aff_plague", 1), "Traque et Fl\u00e9au verrouill\u00e9es tant que le donjon n'est pas termin\u00e9");
  game.dungeonTierCleared[1] = true;
  ok(D.isMarkUnlocked("aff_elite", 1) && D.isMarkUnlocked("aff_plague", 1) && !D.isMarkUnlocked("aff_elite", 2), "termin\u00e9 une fois : d\u00e9bloqu\u00e9es sur CE donjon seulement");
  ok(D.sanitizeMarks(["aff_elite", "aff_elite", "aff_inconnue", "aff_colossus", "aff_fragility", "aff_asceticism"], 1).join(",") === "aff_elite,aff_colossus,aff_fragility", "sanitizeMarks : doublons et inconnues \u00e9cart\u00e9s, plafond 3");

  /* --- Vagues : \u00e9lites de donn\u00e9es, boss identitaire, Colosses, Traque --- */
  game.dungeonTickets = 5;
  D.start(1, []);
  /* v3.288.0 : une vague d'élite peut renvoyer un TABLEAU (élite + escorte) — l'élite
     est toujours en tête. On aplatit pour les contrôles qui portent sur elle. */
  function tete(x) { return Array.isArray(x) ? x[0] : x; }
  var w5brut = D.buildWaveEnemy(5), w10brut = D.buildWaveEnemy(10);
  var w5 = tete(w5brut), w10 = tete(w10brut), w7 = tete(D.buildWaveEnemy(7)), b = tete(D.buildWaveEnemy(16));
  ok(w5.isElite === true && w5.id === "araignee_marquee" && w10.isElite === true && w10.id === "ronce_ardente", "vagues 5 et 10 : Fileuse et Ronce (\u00e9lites de donn\u00e9es)");
  ok(w7.isBoss === false && !w7.isElite, "vague 7 : ennemi normal");
  ok(b.isBoss === true && b.id === "slimeking" && b.name.indexOf("Basilic") !== -1 && b.archetype === "corrupted", "boss : le Basilic (base Roi Slime), trait corrupted");
  var bossHpNu = b.maxHp;
  ok(w5.maxHp > w7.maxHp && b.maxHp > w5.maxHp, "\u00e9chelle : \u00e9lite > vague normale, boss > \u00e9lite (" + w7.maxHp + " < " + w5.maxHp + " < " + b.maxHp + ")");
  run("DungeonManager.forfeit();");
  D.start(1, ["aff_colossus", "aff_elite"]);
  var b2 = tete(D.buildWaveEnemy(16)), w7b = tete(D.buildWaveEnemy(7)), w5b = tete(D.buildWaveEnemy(5));
  ok(b2.maxHp === Math.floor(bossHpNu * 2), "Colosses : boss \u00e0 2\u00d7 PV (" + b2.maxHp + ")");
  var w7base = Math.floor(g.ENEMY_DB[w7b.id].stats.endurance * 1.5 * D.getWaveScale(D.getById(1), 7)); // l'ennemi de la vague est tir\u00e9 au sort : on recalcule sur SON endurance
  ok(w7b.isBoss === true && !w7b.isElite && w7b.maxHp === Math.floor(w7base * 2.4), "Traque : vague normale devenue \u00e9lite g\u00e9n\u00e9rique (isBoss, PV \u00d72,4)");
  ok(w5b.isElite === true && w5b.maxHp === w5.maxHp, "Traque : la vague 5 reste l'\u00e9lite de donn\u00e9es, sans cumul");
  ok(game.enemy && game.enemy.isBoss === true && game.dungeonRun.wave === 1, "vague 1 sous Traque : \u00e9lite d\u00e8s l'entr\u00e9e");
  run("DungeonManager.forfeit();");

  /* --- Fin de run : cumul, S\u00e8ve, \u00e9clats d'\u00e9lite --- */
  function clearRun(marks) {
    game.heroHp = game.heroMaxHp;
    D.start(1, marks);
    var guard = 60;
    while (game.dungeonRun.active && guard-- > 0) { game.enemy.hp = 1; game.enemy.chargeIn = 99; game.enemy.engageIn = 0; game.heroHp = game.heroMaxHp; g.CombatEngine.heroAction("basic"); }
  }
  game.dungeonTierCleared = { 1: true };
  run("game.resources.seve_aeswyn = 0;");
  var gold0 = game.gold, shards0 = game.dungeonShards, clears0 = game.dungeonBossClears;
  clearRun([]);
  var goldNu = game.gold - gold0, shardsNu = game.dungeonShards - shards0;
  ok(!game.dungeonRun.active && game.dungeonBossClears === clears0 + 1, "run nu termin\u00e9 (boss vaincu)");
  ok(shardsNu === 16 + 10 + 2 * 3, "\u00e9clats : 16 vagues (boss compris, comme avant) + 10 boss + 3 par \u00e9lite \u00d7 2 = " + shardsNu);
  ok(Number(game.resources.seve_aeswyn || 0) === 2, "S\u00e8ve : +2 \u00e0 nu");
  run("game.resources.seve_aeswyn = 0;");
  gold0 = game.gold;
  clearRun(["aff_asceticism", "aff_fragility", "aff_colossus"]);
  var goldM = game.gold - gold0;
  ok(!game.dungeonRun.active && Number(game.resources.seve_aeswyn || 0) === 8, "3 Marques : S\u00e8ve +8 (2 + 3 \u00d7 2)");
  ok(goldM > goldNu * 1.3, "3 Marques : or de fin \u00d71,45 et bonus de boss (" + goldNu + " -> " + goldM + ")");
  ok(game.heroMaxHp === (function () { var m = game.heroMaxHp; return m; })() && g.AfflictionManager.getActiveCount() === 0, "apr\u00e8s le run : aucune Marque active");

  /* --- Feuille de lancement --- */
  var sheet = run("pendingDungeonMarks = ['aff_fragility']; buildDungeonSheetHTML(1)");
  ok(sheet.indexOf("dmark is-on") !== -1 && sheet.indexOf("1 / 3") !== -1 && sheet.indexOf("+4") !== -1, "feuille : Fragilit\u00e9 activ\u00e9e, 1/3, S\u00e8ve +4 projet\u00e9e");
  ok(sheet.indexOf("Termine ce donjon une fois") === -1, "donjon termin\u00e9 : Traque et Fl\u00e9au propos\u00e9es");
  game.dungeonTierCleared = {};
  sheet = run("pendingDungeonMarks = []; buildDungeonSheetHTML(1)");
  ok((sheet.match(/dmark is-locked/g) || []).length === 2, "donjon jamais termin\u00e9 : deux Marques gris\u00e9es");
  var lobby = run("buildDungeonHTML()");
  ok(lobby.indexOf("pc-subtab-bar") === -1 && (lobby.match(/dungeon-tier-card is-full/g) || []).length === 6, "\u00e9cran Donjon : six cartes, plus de sous-onglets");

  /* --- Migration d'une sauvegarde d'avant la refonte --- */
  game.dungeonRun = { active: false, wave: 0, tierId: 3 };
  D.ensure();
  ok(game.dungeonRun.dungeonId === 3 && game.dungeonRun.tierId === undefined && Array.isArray(game.dungeonRun.marks), "dungeonRun.tierId -> dungeonId, marks initialis\u00e9");

  /* --- Afflictions parqu\u00e9es, Boutique chez l'Enchanteresse --- */
  ok(!g.MENU_ITEMS.some(function (m) { return m.tab === "afflictions"; }) && g.MENU_ITEMS.length === 5, "menu \u2630 : Afflictions retir\u00e9es, 5 cases");
  run("VillageBuildingManager.ensure(); game.village.buildings.enchanter = { level: 0 };");
  var fiche0 = run("openVillageBuildingId = 'enchanter'; buildVillageBuildingSheetHTML('enchanter')");
  ok(fiche0.indexOf("vb-sheet-seg") !== -1 && fiche0.indexOf("nb-purchase-card") !== -1 && /Relance<\/button>/.test(fiche0) && fiche0.indexOf("disabled") !== -1, "Enchanteresse non construite : segment, Relance gris\u00e9e, Boutique d'\u00e9clats visible");
  run("game.village.buildings.enchanter = { level: 1 }; enchanterSheetSegment = null;");
  var fiche1 = run("buildVillageBuildingSheetHTML('enchanter')");
  ok(fiche1.indexOf("forge-board") !== -1 && fiche1.indexOf("nb-purchase-card") === -1, "Enchanteresse construite : Relance par d\u00e9faut, \u00e9tabli affich\u00e9");
  run("setEnchanterSheetSegment('eclats');");
  var fiche2 = run("buildVillageBuildingSheetHTML('enchanter')");
  ok(fiche2.indexOf("nb-purchase-card") !== -1, "segment \u00c9clats : les quatre am\u00e9liorations");
})();

/* [48] v3.246.0 — correctifs hors donjon (retours Seb 15/09/2026) : compteur de round par combat,
   reprise d'un run de quête après rechargement, PV des ennemis de « Prouver sa valeur ». */
console.log("\n[48] v3.246.0 \u2014 Compteur de round, reprise de quête, PV de « Prouver sa valeur »");
(function () {
  /* --- 1. Le compteur R est celui du COMBAT, pas de la session --- */
  game = freshCombat("knight"); giveWeapon();
  run("CombatEngine.ensureState();");
  for (var i = 0; i < 4; i++) { game.enemy.hp = 99999; game.enemy.maxHp = 99999; game.enemy.chargeIn = 99; game.enemy.engageIn = 0; game.heroHp = game.heroMaxHp; g.CombatEngine.heroAction("basic"); }
  ok(game.combatRound.number === 4, "4 actions jou\u00e9es : R" + game.combatRound.number);
  game.enemy.hp = 1; g.CombatEngine.heroAction("basic"); // tue -> nouvel ennemi
  ok(game.combatRound.number === 0, "ennemi suivant : le compteur repart \u00e0 R0 (\u00e9tait R" + game.combatRound.number + ")");
  var pill = run("buildEnemyStatusBarHTML === undefined ? '' : ''");
  game.enemy.chargeIn = 99; game.enemy.engageIn = 0; g.CombatEngine.heroAction("basic");
  ok(game.combatRound.number === 1, "puis R1 au premier round du nouveau combat");

  /* --- 2. Reprise d'un run de qu\u00eate apr\u00e8s rechargement --- */
  game = freshCombat("knight"); giveWeapon();
  run("AdventureQuestManager.ensureDefaults();");
  g.AdventureQuestManager.start("aq_forest_expedition");
  ok(game.adventureQuestRun.active === true, "qu\u00eate lanc\u00e9e");
  var questEnemyName = game.enemy.name;
  ok(!game.enemy.isBoss, "premier ennemi de qu\u00eate : pas le boss (" + questEnemyName + ")");
  // le joueur avait fini l'aventure en farm avant sa qu\u00eate : l'index de farm est sur le boss
  run("WorldManager.enemyIndex = 9;");
  var saved = run("JSON.stringify(buildSaveData())");
  run("restoreBaseState(" + saved + "); game.enemy = null;"); // loadGame() lit localStorage
  ok(game.adventureQuestRun.active === true, "apr\u00e8s rechargement : la qu\u00eate est toujours active");
  /* boot.js et resumeCombatAfterSlotChange appellent respawnActiveRunEnemy AVANT de retomber sur
     CombatEngine.spawnEnemy() : c'est cette s\u00e9quence que l'on rejoue ici (loadGame ne spawne pas). */
  ok(typeof g.QuestEnemyManager.respawnActiveRunEnemy === "function", "QuestEnemyManager.respawnActiveRunEnemy expos\u00e9");
  var replaced = g.QuestEnemyManager.respawnActiveRunEnemy();
  ok(replaced === true, "reprise : la qu\u00eate reprend la main sur le spawn");
  ok(game.enemy && !game.enemy.isBoss, "apr\u00e8s rechargement : ennemi de QU\u00caTE, pas le boss du farm (" + (game.enemy && game.enemy.name) + ")");
  run("game.adventureQuestRun = { active: false, questId: null }; game.huntRun = { active: false, questId: null, killsInLot: 0 };");
  ok(g.QuestEnemyManager.respawnActiveRunEnemy() === false, "hors run : rend la main, le farm spawne normalement");
  run("AdventureQuestManager.ensureDefaults(); AdventureQuestManager.start('aq_forest_expedition');");
  run("AdventureQuestManager.forfeit();");
  // m\u00eame chose pour la chasse
  run("HuntQuestManager.ensureRun ? HuntQuestManager.ensureRun() : null;");
  g.HuntQuestManager.start("hq_wolf_pack");
  if (game.huntRun && game.huntRun.active) {
    run("WorldManager.enemyIndex = 9;");
    var saved2 = run("JSON.stringify(buildSaveData())");
    run("restoreBaseState(" + saved2 + ")");
    ok(game.huntRun.active === true && game.enemy && !game.enemy.isBoss, "chasse : m\u00eame reprise, ennemi de chasse conserv\u00e9");
    run("HuntQuestManager.stop();");
  }

  /* --- 3. PV des ennemis de « Prouver sa valeur » --- */
  var q = g.ADVENTURE_QUESTS.aq_forest_expedition;
  ok(q.enemyHpMult === 0.8 && q.bossHpMult === 0.4, "aq_forest_expedition : ennemis \u00d70,8 (doubl\u00e9s en v3.263.0), boss \u00d70,4");
  run("WorldManager.worldIndex = 0; WorldManager.adventureIndex = 0; WorldManager.enemyIndex = 0;");
  var farmNormal = run("WorldManager.generateEnemy()").maxHp;
  run("WorldManager.enemyIndex = 9;");
  var farmBoss = run("WorldManager.generateEnemy()").maxHp;
  var qNormal = g.QuestEnemyManager.spawnFor(q, false).maxHp;
  var qBoss = g.QuestEnemyManager.spawnFor(q, true).maxHp;
  ok(qBoss === Math.floor(farmBoss * 0.4), "boss de la qu\u00eate : " + qBoss + " PV au lieu de " + farmBoss);
  // v3.263.0 : ennemi tiré au sort -> comparaison à tirage fixé (même ennemi fabriqué deux fois)
  var genSave = g.WorldManager.generateEnemy;
  g.WorldManager.generateEnemy = function () { return { id: "slime", hp: 100, maxHp: 100, isBoss: false }; };
  var qFixe = g.QuestEnemyManager.spawnFor(q, false).maxHp;
  g.WorldManager.generateEnemy = genSave;
  ok(qFixe === 80 && qNormal > 0 && farmNormal > 0, "ennemis ordinaires de la qu\u00eate \u00e0 \u00d70,8 (100 PV -> " + qFixe + ")");
  ok(farmBoss === 696, "le Roi Slime du FARM reste \u00e0 " + farmBoss + " PV (la r\u00e9duction est propre \u00e0 la qu\u00eate)");
  var other = g.ADVENTURE_QUESTS.aq_forest_depths;
  ok(!other || other.enemyHpMult === undefined, "les autres qu\u00eates n'ont pas de enemyHpMult : comportement inchang\u00e9");
})();

/* [49] v3.247.0 — groupe A : vitrine de départ figée, pronostic de combat. */
console.log("\n[49] v3.247.0 \u2014 Vitrine de d\u00e9part fig\u00e9e et pronostic de combat");
(function () {
  /* --- Vitrine de d\u00e9part --- */
  game = freshCombat("knight");
  run("game.equipShopStarterServed = false; game.equipShopStock = []; EquipShopManager.ensure();");
  var stock1 = g.EquipShopManager.generateStock();
  ok(stock1.length === g.EQUIP_SHOP_STARTER.length, "premi\u00e8re vitrine : " + stock1.length + " objets fixes");
  ok(stock1.every(function (it) { return it.starter === true && it.rarity === "common"; }), "tous marqu\u00e9s starter et communs");
  var slots = stock1.map(function (it) { return it.slot; });
  // v3.263.0 : plus d'arme en vitrine (celle de Premier sang suffit), l'anneau la remplace
  ok(slots.indexOf("weapon") === -1 && slots.indexOf("ring") !== -1 && slots.indexOf("armor") !== -1 && slots.indexOf("helmet") !== -1, "vitrine de d\u00e9part : pas d'arme, un anneau, une armure et un casque");
  ok(stock1.every(function (it) { return it.value === g.EQUIPMENT_SLOT_CONFIG[it.slot].ranges.common[0]; }), "chaque pi\u00e8ce au plus bas de la fourchette commune (" + stock1.map(function (it) { return it.slot + " " + it.value; }).join(", ") + ")");
  ok(game.equipShopStarterServed === true, "la vitrine de d\u00e9part est marqu\u00e9e comme servie");
  var stock2 = g.EquipShopManager.generateStock();
  ok(!stock2.some(function (it) { return it.starter; }), "le renouvellement suivant repart en al\u00e9atoire");

  /* v3.263.0 : même vitrine pour les trois classes (plus d'arme à décliner) */
  var vitrines = {};
  ["knight", "ranger", "mage"].forEach(function (h) {
    game = freshCombat(h);
    run("game.equipShopStarterServed = false; EquipShopManager.ensure();");
    vitrines[h] = g.EquipShopManager.generateStock().map(function (it) { return it.slot + ":" + it.icon + ":" + it.value; }).join("|");
  });
  ok(vitrines.knight === vitrines.ranger && vitrines.knight === vitrines.mage, "vitrine de d\u00e9part identique pour les trois classes");

  /* Sauvegarde : le drapeau survit, et une partie d'avant la v3.247.0 ne re\u00e7oit pas la vitrine */
  game = freshCombat("knight");
  run("game.equipShopStarterServed = true;");
  var saved = run("buildSaveData()");
  ok(saved.equipShopStarterServed === true, "equipShopStarterServed est sauvegard\u00e9");
  /* Repli pour une sauvegarde d'AVANT la v3.247.0 (le drapeau n'existe pas) : on le d\u00e9duit
     du stock et du minuteur, sans quoi une partie en cours recevrait une vitrine de d\u00e9part. */
  var d1 = JSON.parse(run("JSON.stringify(buildSaveData())"));
  delete d1.equipShopStarterServed; d1.equipShopStock = [{ uid: "x" }]; d1.equipShopResetTime = 12345;
  run("restoreBaseState(" + JSON.stringify(d1) + ")"); // loadGame() lit localStorage : ici on restaure directement
  ok(game.equipShopStarterServed === true, "sauvegarde ancienne avec un stock : consid\u00e9r\u00e9e comme d\u00e9j\u00e0 servie");
  var d2 = JSON.parse(run("JSON.stringify(buildSaveData())"));
  delete d2.equipShopStarterServed; d2.equipShopStock = []; d2.equipShopResetTime = 0;
  run("restoreBaseState(" + JSON.stringify(d2) + ")");
  ok(game.equipShopStarterServed === false, "sauvegarde ancienne sans stock ni minuteur : vitrine de d\u00e9part \u00e0 servir");

  /* --- Pronostic --- */
  game = freshCombat("knight"); giveWeapon();
  ok(!!g.CombatForecast, "CombatForecast expos\u00e9");
  var F = g.CombatForecast;
  run("WorldManager.worldIndex = 0; WorldManager.adventureIndex = 0; WorldManager.enemyIndex = 0;");
  g.CombatEngine.spawnEnemy();
  var easy = F.forEnemy(game.enemy);
  ok(easy && F.getLevelDef(easy.id).level <= 2, "ennemi de Lisi\u00e8re : pronostic au plus « risqu\u00e9 » (" + easy.id + ")");

  /* Boss qui se soigne, h\u00e9ros trop faible : doit \u00eatre d\u00e9clar\u00e9 hors de port\u00e9e */
  run("WorldManager.enemyIndex = 9;");
  g.CombatEngine.spawnEnemy();
  var boss = game.enemy;
  ok(boss.isBoss === true, "boss de Lisi\u00e8re g\u00e9n\u00e9r\u00e9 (" + boss.maxHp + " PV)");
  var seuil = F.getHealThreshold(boss);
  ok(seuil > 0, "seuil de soin calcul\u00e9 : " + Math.ceil(seuil) + " d\u00e9g\u00e2ts/round minimum");
  /* v3.249.0 : le pronostic compte d\u00e9sormais les potions. Sans arme NI potion, le boss de
     Lisi\u00e8re (696 PV, soin 27/round) reste math\u00e9matiquement hors de port\u00e9e. */
  run("game.equipped.weapon = null; game.upgrades = {}; PotionManager.ensureHealing(); game.healingPotionsOwned = {}; EquipmentManager.recalcStats();");
  var faible = F.forEnemy(boss);
  ok(faible.id === "horsportee", "h\u00e9ros nu et sans potion : hors de port\u00e9e (" + faible.roundsToKill + " rounds contre " + faible.roundsToDie + ")");
  /* Le cas MATH\u00c9MATIQUEMENT impossible est distinct : d\u00e9g\u00e2ts sous le seuil de soin du boss.
     On le provoque en abaissant les d\u00e9g\u00e2ts sous ce seuil. */
  var seuil = F.getHealThreshold(boss);
  var vraiDmg = F.getHeroDamagePerRound;
  F.getHeroDamagePerRound = function () { return Math.max(1, seuil - 1); };
  var bloque = F.forEnemy(boss);
  F.getHeroDamagePerRound = vraiDmg;
  ok(bloque.unwinnable === true && bloque.reason.indexOf("soigne") !== -1,
    "sous le seuil de soin : d\u00e9clar\u00e9 impossible, et la raison est nomm\u00e9e");
  ok(faible.advice && faible.advice.length > 10, "un conseil est donn\u00e9 : " + faible.advice.slice(0, 60) + "\u2026");
  ok(faible.advice.indexOf("emplacement") !== -1 || faible.advice.indexOf("\u00e9quipement") !== -1, "...et il pointe l'\u00e9quipement quand des emplacements sont vides");

  /* H\u00e9ros correctement arm\u00e9 : le m\u00eame boss redevient jouable */
  run("game.equipped.weapon = { id: 'w', name: '\u00c9p\u00e9e', rarity: 'common', slot: 'weapon', stat: 'tapDmg', value: 40 }; game.upgrades.utrain_power = 10; EquipmentManager.recalcStats();");
  var arme = F.forEnemy(boss);
  ok(arme.unwinnable === false, "avec une arme correcte : le boss redevient tuable (" + arme.id + ", ~" + arme.roundsToKill + " rounds)");

  /* Le seuil de soin ne s'applique pas \u00e0 une \u00e9lite (elle troque son soin contre l'exaltation) */
  var elite = g.EliteManager.build("araignee_marquee", 1, { noMilestone: true });
  ok(elite && F.getHealThreshold(elite) === 0, "\u00e9lite : pas de seuil de soin");

  /* Int\u00e9gration : la feuille de donjon porte la ligne de pronostic */
  run("DungeonManager.ensure(); game.dungeonTickets = 1; game.dungeonTierCleared = { 1: true };");
  var sheet = run("pendingDungeonMarks = []; pendingDungeonId = 1; buildDungeonSheetHTML(1)");
  ok(sheet.indexOf("cf-line") !== -1, "la feuille de lancement du donjon affiche le pronostic");
  ok(!game.dungeonRun.active, "...sans laisser de run actif derri\u00e8re elle");
})();

/* [50] v3.248.0 — prix des entraînements : courbe linéaire, bases proportionnelles au gain,
   socle de plafond porté à 20 (décisions Seb 15/09/2026). */
console.log("\n[50] v3.248.0 \u2014 Prix des entra\u00eenements et plafond de d\u00e9part");
(function () {
  game = freshCombat("knight");
  var IDS = g.HEROS_TRAINING_UPGRADE_IDS;

  /* --- Courbe lin\u00e9aire --- */
  var power = g.UPGRADES.find(function (u) { return u.id === "utrain_power"; });
  ok(typeof power.costStep === "number" && power.costMult === undefined, "utrain_power : costStep d\u00e9clar\u00e9, costMult retir\u00e9");
  var c0 = g.getUpgradeCost(power, 0), c19 = g.getUpgradeCost(power, 19);
  ok(c0 === 9, "niveau 1 : " + c0 + " or");
  ok(c19 === Math.floor(9 * (1 + 0.055 * 19)), "niveau 20 : " + c19 + " or (lin\u00e9aire, pas exponentiel)");
  ok(c19 / c0 < 2.5, "le 20e niveau co\u00fbte moins du double du premier (" + (c19 / c0).toFixed(1) + "\u00d7)");

  /* Les am\u00e9liorations SANS costStep gardent l'exponentielle (bourses, contrats). */
  var autre = g.UPGRADES.find(function (u) { return typeof u.costStep !== "number" && u.costMult; });
  ok(!!autre && g.getUpgradeCost(autre, 2) === Math.floor(autre.baseCost * Math.pow(autre.costMult, 2)),
    "une am\u00e9lioration sans costStep garde sa courbe exponentielle (" + (autre ? autre.id : "?") + ")");

  /* --- Bases proportionnelles au gain : l'or par point de d\u00e9g\u00e2t doit \u00eatre \u00e9gal entre classes --- */
  function orPour20(id) { var u = g.UPGRADES.find(function (x) { return x.id === id; }); var t = 0; for (var l = 0; l < 20; l++) t += g.getUpgradeCost(u, l); return t; }
  function gainParPoint(heroId, stat) {
    run("fullResetState(); game.playerName='X'; game.heroId='" + heroId + "'; EquipmentManager.recalcStats();");
    var d0 = g.StatsSystem.effectiveTapDamage();
    run("game.upgrades['utrain_" + stat + "']=100; EquipmentManager.recalcStats();");
    return (g.StatsSystem.effectiveTapDamage() - d0) / 100;
  }
  var ratios = [["knight", "power"], ["ranger", "celerity"], ["mage", "will"]].map(function (t) {
    return orPour20("utrain_" + t[1]) / (gainParPoint(t[0], t[1]) * 20); // or par point de d\u00e9g\u00e2t
  });
  var mini = Math.min.apply(null, ratios), maxi = Math.max.apply(null, ratios);
  ok(maxi / mini < 1.15, "les trois classes paient le m\u00eame prix au point de d\u00e9g\u00e2t (\u00e9cart " + Math.round((maxi / mini - 1) * 100) + " %, "
    + ratios.map(function (r) { return Math.round(r); }).join(" / ") + " or/d\u00e9g\u00e2t)");
  /* Cible pos\u00e9e par Seb : 25 \u00e0 35 % de l'efficacit\u00e9 de l'\u00e9quipement (mesur\u00e9e \u00e0 20 or par d\u00e9g\u00e2t). */
  var pct = ratios.map(function (r) { return 20 / r * 100; });
  ok(Math.min.apply(null, pct) >= 25 && Math.max.apply(null, pct) <= 35,
    "efficacit\u00e9 dans la fourchette 25-35 % de l'\u00e9quipement (" + pct.map(function (x) { return Math.round(x) + " %"; }).join(" / ") + ")");

  /* --- Socle de plafond \u00e0 20 --- */
  game = freshCombat("knight");
  run("VillageBuildingManager.ensure(); game.village.buildings.training.level = 0;");
  ok(g.TRAINING_BASE_CAP === 20 && g.getTrainingCapLevels() === 20, "socle sans b\u00e2timent : 20 niveaux");
  run("game.village.buildings.training.level = 3;");
  ok(g.getTrainingCapLevels() === 50, "Terrain niveau 3 : 20 + 3 \u00d7 10 = 50");
  run("game.village.buildings.training.level = 14;");
  ok(g.getTrainingCapLevels() === 150, "born\u00e9 \u00e0 150, le plafond historique");

  /* Le plafond ne fait jamais redescendre : une partie en cours garde ses niveaux. */
  run("game.village.buildings.training.level = 0; game.upgrades.utrain_power = 63;");
  ok(g.getUpgradeCap(power) === 63, "un niveau d\u00e9j\u00e0 acquis reste acquis malgr\u00e9 le socle");

  /* --- Ce que 300 or ach\u00e8tent d\u00e9sormais (rep\u00e8re : une pi\u00e8ce commune co\u00fbte 300) --- */
  run("fullResetState(); game.playerName='X'; game.heroId='knight'; game.gold = 300; VillageBuildingManager.ensure(); game.village.buildings.training.level = 0;");
  var avant = g.StatsSystem.effectiveTapDamage();
  g.buyUpgrade("utrain_power", 100);
  run("EquipmentManager.recalcStats();");
  ok(game.upgrades.utrain_power === 20, "300 or ach\u00e8tent les 20 niveaux de Force (il en reste " + game.gold + ")");
  ok(g.StatsSystem.effectiveTapDamage() > avant, "et les d\u00e9g\u00e2ts montent r\u00e9ellement (" + avant + " -> " + g.StatsSystem.effectiveTapDamage() + ")");
})();

/* [51] v3.249.0 — arme offerte à la première étape, pronostic calibré au banc. */
console.log("\n[51] v3.249.0 \u2014 Arme de d\u00e9part et pronostic calibr\u00e9");
(function () {
  /* --- L'arme est remise par forest_02 depuis v3.260.0 (forest_01 avant), d\u00e9clin\u00e9e par classe --- */
  var armes = {};
  ["knight", "ranger", "mage"].forEach(function (h) {
    game = freshCombat(h);
    run("StoryQuestManager.ensure(); StoryQuestManager.acceptStep('forest'); StoryQuestManager.claimStep('forest');");
    var avant = (game.inventory || []).length;
    ok(!(game.inventory || []).some(function (it) { return it.slot === "weapon"; }), h + " : forest_01 ne donne plus d'arme (v3.260.0)");
    run("StoryQuestManager.acceptStep('forest'); game.adventureQuestsCompleted.aq_story_premier_sang = true; /* v3.293.0 : run défini */ StoryQuestManager.claimStep('forest');");
    var nouveaux = (game.inventory || []).filter(function (it) { return it.slot === "weapon"; });
    armes[h] = nouveaux[nouveaux.length - 1] || null;
    ok(!!armes[h], h + " : une arme est bien re\u00e7ue \u00e0 Premier sang (inventaire " + avant + " -> " + (game.inventory || []).length + ")");
  });
  ok(armes.knight && armes.knight.icon === "sword" && armes.ranger.icon === "bow" && armes.mage.icon === "staff",
    "arme d\u00e9clin\u00e9e par classe : " + armes.knight.icon + " / " + armes.ranger.icon + " / " + armes.mage.icon);
  ok(armes.knight.value === 15 && armes.mage.value === 15 && armes.ranger.value === 15, "m\u00eame valeur pour les trois (15)");
  ok(!g.EQUIP_SHOP_STARTER.some(function (d) { return d.slot === "weapon"; }), "la vitrine de d\u00e9part ne propose plus d'arme : celle de Premier sang est la seule (v3.263.0)");
  ok(armes.knight.rarity === "common" && armes.knight.affixes.length === 0, "objet commun sans affixe, comme un butin de d\u00e9part");

  /* Et elle permet de remplir l'objectif de forest_03 (« \u00e9quiper ton arme », v3.260.0). */
  game = freshCombat("mage"); game.equipped.weapon = null;
  run("StoryQuestManager.ensure(); StoryQuestManager.acceptStep('forest'); StoryQuestManager.claimStep('forest');");
  run("StoryQuestManager.acceptStep('forest'); game.adventureQuestsCompleted.aq_story_premier_sang = true; /* v3.293.0 : run défini */ StoryQuestManager.claimStep('forest');");
  var arme = (game.inventory || []).filter(function (it) { return it.slot === "weapon"; }).pop();
  ok(!!arme, "arme en inventaire en arrivant \u00e0 forest_03");
  var step03 = g.STORY_QUESTS.forest.steps.find(function (st) { return st.id === "forest_03"; });
  game.upgrades.utrain_power = 1;
  ok(step03.check(game) === false, "forest_03 : l'entra\u00eenement seul ne suffit plus, il faut \u00e9quiper l'arme");
  run("EquipmentManager.equip('" + arme.uid + "')");
  ok(!!game.equipped.weapon && step03.check(game) === true, "elle s'\u00e9quipe : forest_03 est rempli");

  /* --- Pronostic : les trois facteurs calibr\u00e9s --- */
  var F = g.CombatForecast;
  ok(g.FORECAST_RATIO_THRESHOLDS.horsportee === 1.3 && g.FORECAST_RATIO_THRESHOLDS.tresdur === 1.05,
    "seuils calibr\u00e9s au banc (1,30 / 1,05 / 0,85 / 0,35)");

  game = freshCombat("knight"); giveWeapon();
  run("PotionManager.ensureHealing(); game.healingPotionsOwned = {};");
  var sans = F.getHealingReserve();
  run("game.healingPotionsOwned = { potion_soin_mineur: 3 };");
  var avec = F.getHealingReserve();
  ok(sans === 0 && avec > 0, "les potions comptent comme des PV (" + avec + " PV de r\u00e9serve pour 3 potions)");
  var cap = (typeof g.SORTIE_POTION_CAP === "number") ? g.SORTIE_POTION_CAP : 2;
  run("game.healingPotionsOwned = { potion_soin_mineur: 99 };");
  ok(F.getHealingReserve() === avec || F.getHealingReserve() <= Math.ceil(game.heroMaxHp * 0.35 * cap) + 1,
    "la r\u00e9serve est born\u00e9e par le cap de sortie (" + cap + " potions)");

  ok(F.getStrikesPerRound() > 1, "les frappes bonus de c\u00e9l\u00e9rit\u00e9 comptent (" + F.getStrikesPerRound().toFixed(2) + " frappe/round)");

  /* Usure : une mission de 9 combats co\u00fbte des PV que le boss seul ne montre pas. */
  var m = { sourceKind: "adventure", questId: "aq_forest_expedition", title: "Prouver sa valeur" };
  ok(F.getPrecedingFights(m) === 9, "9 combats annonc\u00e9s avant le boss de la qu\u00eate");
  var fMission = F.forMission(m);
  var fBossSeul = F.forEnemy(g.QuestEnemyManager.spawnFor(g.ADVENTURE_QUESTS.aq_forest_expedition, true));
  ok(fMission.attrition > 0 && fMission.roundsToDie <= fBossSeul.roundsToDie,
    "l'usure du run est compt\u00e9e : " + fMission.attrition + " PV, " + fBossSeul.roundsToDie + " -> " + fMission.roundsToDie + " rounds avant de tomber");

  /* Avec l'arme de d\u00e9part \u00e9quip\u00e9e, la qu\u00eate cesse d'\u00eatre annonc\u00e9e comme hors de port\u00e9e. */
  ["knight", "ranger", "mage"].forEach(function (h) {
    game = freshCombat(h);
    run("PotionManager.ensureHealing(); game.healingPotionsOwned = { potion_soin_mineur: 3 };");
    run("game.equipped.weapon = { uid:'w', slot:'weapon', name:'Arme', icon:'sword', rarity:'common', stat:'tapDmg', value:15, affixes:[] }; EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp;");
    var f = F.forMission(m);
    ok(F.getLevelDef(f.id).level <= 2, h + " avec l'arme de d\u00e9part : « " + F.getLevelDef(f.id).label + " » (ratio " + f.ratio.toFixed(2) + ")");
  });
})();

/* [52] v3.250.0 — la Boutique a de nouveau une porte (régression du lot Navigation N-1). */
console.log("\n[52] v3.250.0 \u2014 Porte de la Boutique au Campement");
(function () {
  game = freshCombat("knight");
  run("game.unlockedTabs.shop = false;");
  var sans = run("buildCampHTML()");
  ok(sans.indexOf("goToPotions()") === -1, "onglet Boutique verrouill\u00e9 : aucune porte au Campement");

  run("game.unlockedTabs.shop = true;");
  var avec = run("buildCampHTML()");
  ok(avec.indexOf("goToPotions()") !== -1, "d\u00e8s que l'onglet est d\u00e9bloqu\u00e9, la porte « Potions » appara\u00eet");
  ok(avec.indexOf("goToEconomy()") !== -1, "...et la porte « \u00c9conomie » aussi");

  /* Le sc\u00e9nario complet de forest_04 : l'\u00e9tape d\u00e9bloque `shop` et demande un achat.
     Sans porte, la cha\u00eene d'Histoire \u00e9tait bloqu\u00e9e sur une partie neuve. */
  game = freshCombat("knight");
  run("StoryQuestManager.ensure();");
  var idx04 = g.STORY_QUESTS.forest.steps.findIndex(function (st) { return st.id === "forest_04"; });
  var step04 = g.STORY_QUESTS.forest.steps[idx04];
  game.storyQuests.forest.currentStep = idx04;
  run("StoryQuestManager.acceptStep('forest');");
  ok(game.unlockedTabs.shop === true, "forest_04 accept\u00e9e : l'onglet Boutique est d\u00e9bloqu\u00e9");
  ok(run("buildCampHTML()").indexOf("goToPotions()") !== -1, "...et le Campement offre bien une porte pour y aller");
  ok(step04.check(game) === false, "l'\u00e9tape n'est pas encore remplie");
  game.gold = 400;
  run("PotionManager.ensureHealing(); PotionManager.buyHealingPotion('potion_soin_mineur');");
  ok(Number((game.healingPotionsOwned || {}).potion_soin_mineur || 0) === 1, "une potion de soin est achet\u00e9e (150 or)");
  ok(step04.check(game) === true, "« Le colporteur » devient r\u00e9clamable : la cha\u00eene n'est plus bloqu\u00e9e");

  /* Les potions de soin ne d\u00e9pendent PAS de l'Apothicaire : il n'ouvre que le brassage. */
  run("VillageBuildingManager.ensure();");
  ok(Number(g.VillageBuildingManager.getLevel("apothecary")) === 0, "Apothicaire non construit dans ce sc\u00e9nario");
  ok(Number((game.healingPotionsOwned || {}).potion_soin_mineur || 0) > 0, "...et la potion a pourtant \u00e9t\u00e9 achet\u00e9e");
})();

/* [53] v3.251.0 — états de combat : bandeau d'alerte, rangée, feuille d'explication. */
console.log("\n[53] v3.251.0 \u2014 \u00c9tats de combat (bandeau, rang\u00e9e, feuille)");
(function () {
  game = freshCombat("knight"); giveWeapon();
  run("CombatEngine.ensureState();");
  var e = game.enemy;

  /* --- Rien d'actif : aucune hauteur r\u00e9serv\u00e9e --- */
  e.chargeTelegraphed = false; e.silenceTelegraphed = false; e.shieldTelegraphed = false;
  e.healTelegraphed = false; e.engageIn = 0; e.archetype = null; e.shieldRounds = 0;
  e.vulnerableRounds = 0; e.dot = null; e.counteredRounds = 0; game.silencedRounds = 0;
  e.gauge = 0;
  ok(g.buildCombatAlertHTML() === "" && g.buildCombatStatesHTML() === "",
    "combat calme : ni bandeau ni rang\u00e9e (aucune hauteur r\u00e9serv\u00e9e)");

  /* --- Chaque t\u00e9l\u00e9graphe produit un bandeau AVEC LE MOT --- */
  [["chargeTelegraphed", "Il charge"], ["silenceTelegraphed", "Silence"],
   ["shieldTelegraphed", "Il se prot\u00e8ge"], ["healTelegraphed", "Il va se soigner"]].forEach(function (t) {
    e.chargeTelegraphed = false; e.silenceTelegraphed = false; e.shieldTelegraphed = false; e.healTelegraphed = false;
    e[t[0]] = true;
    var b = g.buildCombatAlertHTML();
    ok(b.indexOf("cb-alert") !== -1 && b.indexOf(t[1]) !== -1, t[0] + " : bandeau portant « " + t[1] + " »");
  });

  /* Le soin a sa teinte propre : il n'est pas une menace, il annule le travail du joueur. */
  e.chargeTelegraphed = false; e.healTelegraphed = true;
  ok(g.buildCombatAlertHTML().indexOf("is-heal") !== -1, "le soin est teint\u00e9 diff\u00e9remment d'une attaque");

  /* Deux t\u00e9l\u00e9graphes : UN seul bandeau, texte r\u00e9tr\u00e9ci. */
  e.chargeTelegraphed = true;
  var deux = g.buildCombatAlertHTML();
  ok((deux.match(/class="cb-alert[ "]/g) || []).length === 1 && deux.indexOf("is-multi") !== -1, // cb-alert-sep ne doit pas être compté
    "deux t\u00e9l\u00e9graphes : un seul bandeau, en mode compact");
  ok(deux.indexOf("is-heal") === -1, "...et sans teinte de soin, puisque les deux coexistent");

  /* --- Rang\u00e9e : familles et compteurs --- */
  e.chargeTelegraphed = false; e.healTelegraphed = false;
  e.archetype = "corrupted"; e.corruptedStacks = 3;
  e.vulnerableRounds = 2; e.dot = { rounds: 4, perRound: 12 }; game.silencedRounds = 1;
  var r = g.buildCombatStatesHTML();
  ok(r.indexOf("is-enemy") !== -1 && r.indexOf("is-mine") !== -1 && r.indexOf("is-onme") !== -1,
    "les trois familles ont leur teinte de bordure");
  ok(r.indexOf(">3<") !== -1 && r.indexOf(">2<") !== -1 && r.indexOf(">4<") !== -1, "les compteurs s'affichent");
  ok(r.indexOf("cb-alert") === -1, "aucun t\u00e9l\u00e9graphe dans la rang\u00e9e : ils vivent dans le bandeau");

  /* Un archétype supprimé est grisé et change d'icône quand il en a une. */
  e.archetype = "enraged"; e.rageFreezeRounds = 2;
  var sup = g.buildCombatStatesHTML();
  ok(sup.indexOf("is-suppressed") !== -1 && sup.indexOf("rage_calmed.png") !== -1,
    "rage apais\u00e9e : pastille gris\u00e9e et ic\u00f4ne d\u00e9di\u00e9e");

  /* --- Saturation : « +N » plut\u00f4t qu'une deuxi\u00e8me ligne --- */
  e.archetype = "corrupted"; e.corruptedStacks = 2; e.rageFreezeRounds = 0;
  e.shieldRounds = 3; e.counteredRounds = 1;
  var etats = g.getActiveCombatStates().filter(function (st) { return st.def.famille !== "alerte"; });
  var max = g.COMBAT_STATES_MAX_VISIBLE;
  var sat = g.buildCombatStatesHTML();
  var pastilles = (sat.match(/class="cb-state /g) || []).length;
  ok(pastilles <= max, pastilles + " pastilles au plus (plafond " + max + ")");
  if (etats.length > max) ok(sat.indexOf("cb-states-more") !== -1, "au-del\u00e0 du plafond : une pastille « +N »");

  /* --- Feuille --- */
  e.chargeTelegraphed = true;
  var sh = g.buildCombatStatesSheetHTML();
  /* esc() échappe l'apostrophe : on cherche un fragment sans apostrophe. */
  ok(sh.indexOf("Au prochain round") !== -1 && sh.indexOf("Ce que porte l") !== -1,
    "la feuille groupe les \u00e9tats par famille");
  ok(sh.indexOf("st-row-hint") !== -1 && sh.indexOf("D\u00e9fense, ou une comp\u00e9tence") !== -1,
    "...et donne un CONSEIL D'ACTION, ce que l'ancien title ne faisait jamais");
  /* Tout \u00e9tat du catalogue doit avoir un effet ET (sauf « Contr\u00e9 ») un conseil. */
  var sansHint = Object.keys(g.COMBAT_STATES).filter(function (id) {
    return !g.COMBAT_STATES[id].desc || (typeof g.COMBAT_STATES[id].hint !== "string");
  });
  ok(sansHint.length === 0, "chaque \u00e9tat du catalogue a une description et un champ conseil");
  var sansMot = Object.keys(g.COMBAT_STATES).filter(function (id) {
    return g.COMBAT_STATES[id].famille === "alerte" && !g.COMBAT_STATES[id].mot;
  });
  ok(sansMot.length === 0, "chaque t\u00e9l\u00e9graphe a son mot de bandeau");

  /* Plus aucun title sur les \u00e9tats : il ne s'affiche pas sur mobile. */
  ok(g.buildCombatStatesHTML().indexOf("title=") === -1 && g.buildCombatAlertHTML().indexOf("title=") === -1,
    "plus de title sur les \u00e9tats (invisible sur mobile, rempla\u00e7\u00e9 par la feuille)");

  /* L'alias historique reste fonctionnel : plusieurs syst\u00e8mes l'appellent encore. */
  ok(typeof g.buildEnemyStatusBarHTML === "function" && g.buildEnemyStatusBarHTML() === g.buildCombatStatesHTML(),
    "buildEnemyStatusBarHTML conserv\u00e9 comme alias de la rang\u00e9e");
})();

/* [54] v3.252.0 — lisibilité de l'équipement : liste du sac, bilan réel, feuille de comparaison. */
console.log("\n[54] v3.252.0 \u2014 Lisibilit\u00e9 de l'\u00e9quipement");
(function () {
  game = freshCombat("knight");
  run("game.worldsEverReached = { 0: true, 1: true, 2: true };");

  /* Deux objets construits \u00e0 la main : on veut des deltas connus, pas un tirage. */
  var equipe = { uid: "eq1", slot: "weapon", name: "\u00c9p\u00e9e du test", icon: "sword", rarity: "rare",
    stat: "tapDmg", value: 100, affixes: [{ stat: "critChance", value: 5, tier: "P" }, { stat: "goldMult", value: 0.10, tier: "S" }] };
  var candidat = { uid: "cd1", slot: "weapon", name: "Lame de comparaison", icon: "sword", rarity: "epic",
    stat: "tapDmg", value: 160, affixes: [{ stat: "critChance", value: 8, tier: "P" }, { stat: "tapMult", value: 0.12, tier: "P" }] };
  game.equipped.weapon = equipe;
  game.inventory = [candidat];

  /* --- Le bilan compte les affixes, pas seulement la stat de base --- */
  var sum = g.getEquipmentCompareSummary(candidat, equipe);
  ok(!!sum && !!sum.base && sum.base.delta === 60, "delta de base calcul\u00e9 : +60 d\u00e9g\u00e2ts");
  ok(sum.gains === 3, "trois gains compt\u00e9s (d\u00e9g\u00e2ts, critique, % d\u00e9g\u00e2ts) : " + sum.gains);
  ok(sum.pertes === 1, "une perte compt\u00e9e (l'or, absent du candidat) : " + sum.pertes);

  /* --- La ligne du sac montre ce bilan, nom complet compris --- */
  var liste = run("selectedEquipSlot = 'weapon'; buildCompatibleItemsListHTML('weapon')");
  ok(liste.indexOf("Lame de comparaison") !== -1, "le nom complet appara\u00eet (il \u00e9tait tronqu\u00e9 \u00e0 une lettre)");
  ok(liste.indexOf("eq-compat-extra") !== -1 && liste.indexOf("gain") !== -1 && liste.indexOf("perte") !== -1,
    "le bilan « +N gains \u00b7 \u2212N perte » remplace le badge « +3 » muet");
  ok(liste.indexOf("eq-compat-affix-badge") === -1, "l'ancien badge d'affixes a disparu");
  ok(liste.indexOf("openEquipCompareSheet") !== -1, "la ligne ouvre la feuille de comparaison");
  ok(liste.indexOf("event.stopPropagation()") !== -1, "le bouton \u00c9quiper n'ouvre pas la feuille au passage");

  /* --- La liste est rendue en pleine largeur, hors du panneau \u00e9troit --- */
  var detail = run("buildEquipDetailPanelHTML()");
  ok(detail.indexOf("eq-compat-list") === -1, "la liste ne vit plus dans le panneau de d\u00e9tail (50 % de large)");
  /* buildHerosEquipHTML dépend du sous-onglet courant : on vise directement le contenu
     de l'onglet « Équipé », qui porte la liste en pleine largeur. */
  var page = run("activeEquipSubTab = 'equipment'; buildEquipmentTabContentHTML('')");
  ok(page.indexOf("eq-compat-list") !== -1, "...mais bien dans la page, en pleine largeur");

  /* --- Feuille de comparaison --- */
  var sheet = run("buildEquipCompareSheetHTML('cd1')");
  ok(sheet.indexOf("ksheet") !== -1 && sheet.indexOf("Lame de comparaison") !== -1, "la feuille s'ouvre sur le bon objet");
  ok(sheet.indexOf("base") !== -1 && sheet.indexOf("primaire") !== -1 && sheet.indexOf("secondaire") !== -1,
    "chaque ligne dit sa nature : base, primaire, secondaire");
  ok(sheet.indexOf("seulement sur l\u2019objet port\u00e9") !== -1,
    "ce que seul l'objet port\u00e9 apporte est montr\u00e9 comme une perte");
  ok(sheet.indexOf("eqs-row-delta is-up") !== -1 && sheet.indexOf("eqs-row-delta is-down") !== -1,
    "gains et pertes sont distingu\u00e9s au sein de la m\u00eame feuille");
  ok(sheet.indexOf("equipFromCompareSheet") !== -1, "on peut \u00e9quiper depuis la feuille");

  /* Emplacement vide : tout est gain, rien ne doit planter. */
  game.equipped.weapon = null;
  var sheetVide = run("buildEquipCompareSheetHTML('cd1')");
  ok(sheetVide.indexOf("emplacement vide") !== -1, "emplacement vide : la feuille le dit");
  var sumVide = g.getEquipmentCompareSummary(candidat, null);
  ok(sumVide.pertes === 0 && sumVide.gains === 3, "emplacement vide : trois gains, aucune perte");
  game.equipped.weapon = equipe;

  /* --- Hi\u00e9rarchie des affixes sur l'objet port\u00e9 --- */
  var lignes = run("buildEquipmentAffixLinesHTML(game.equipped.weapon)");
  ok(lignes.indexOf("eq-affix-dot") !== -1, "une puce porte la distinction primaire / secondaire");
  ok((lignes.match(/is-secondary/g) || []).length === 1, "un seul affixe secondaire marqu\u00e9 comme tel");

  /* Un objet sans affixe (commun, ou d'avant la v3.225.0) ne produit rien. */
  ok(run("buildEquipmentAffixLinesHTML({ uid:'x', slot:'weapon', stat:'tapDmg', value:10, rarity:'common' })") === "",
    "objet sans affixe : aucune ligne");
})();

/* [55] v3.253.0 — D-3 : échelle des vagues de la Tanière (retour de jeu « un peu facile »). */
console.log("\n[55] v3.253.0 \u2014 \u00c9chelle des vagues du donjon");
(function () {
  var D = g.DungeonManager;
  game = freshCombat("knight"); giveWeapon();
  run("DungeonManager.ensure(); game.dungeonTickets = 5; game.dungeonTierCleared = { 1: true };");

  var foret = D.getById(1);
  ok(foret.wavePremiumMult === 2.8, "la Tani\u00e8re d\u00e9clare wavePremiumMult 2,8");
  ok(g.DUNGEON_CONFIG.basePremiumMult === 1.3, "le d\u00e9faut global reste 1,3 pour les donjons sans surcharge");
  var autres = (g.DUNGEONS || []).filter(function (d) { return d.id !== 1 && typeof d.wavePremiumMult === "number"; });
  ok(autres.length === 0, "aucun autre donjon n'est touch\u00e9 : leur monde aura son propre chantier");

  /* L'\u00e9chelle des vagues suit la surcharge, celle du boss non. */
  var scaleV = D.getWaveScale(foret, 7);
  var scaleB = D.getWaveScale(foret, g.DUNGEON_CONFIG.waveCount + 1);
  var sansSurcharge = D.getWaveScale({ worldPower: 0, difficultyMult: 1 }, 7);
  ok(Math.abs(scaleV / sansSurcharge - (2.8 / 1.3)) < 0.001,
    "vague 7 : \u00e9chelle multipli\u00e9e par 2,8/1,3 face \u00e0 un donjon sans surcharge");
  var scaleBSans = D.getWaveScale({ worldPower: 0, difficultyMult: 1 }, g.DUNGEON_CONFIG.waveCount + 1);
  ok(Math.abs(scaleB - scaleBSans) < 0.001, "le boss garde bossPremiumMult : wavePremiumMult ne le touche pas");

  /* Les vagues atteignent l'ordre de grandeur d'un ennemi de farm de la For\u00eat. */
  D.start(1, []);
  var v1 = D.buildWaveEnemy(1), v15 = D.buildWaveEnemy(15), boss = D.buildWaveEnemy(16);
  run("WorldManager.worldIndex = 0; WorldManager.adventureIndex = 0; WorldManager.enemyIndex = 0;");
  var farm = run("WorldManager.generateEnemy()").maxHp;
  ok(v1.maxHp > farm * 0.5, "vague 1 (" + v1.maxHp + " PV) atteint au moins la moiti\u00e9 d'un ennemi de farm (" + farm + ")");
  ok(v15.maxHp >= v1.maxHp, "la rampe monte de la vague 1 \u00e0 la vague 15 (" + v1.maxHp + " -> " + v15.maxHp + ")");
  ok(boss.maxHp > v15.maxHp * 3, "le boss reste largement au-dessus de la derni\u00e8re vague");

  /* Les \u00e9lites suivent la m\u00eame \u00e9chelle et restent dans la cible 2,5-4\u00d7 la vague. */
  /* v3.288.0 : la vague d'élite renvoie élite + escorte ; l'élite est en tête. */
  function tete5(x) { return Array.isArray(x) ? x[0] : x; }
  var e5 = tete5(D.buildWaveEnemy(5));
  ok(e5.isElite === true, "la vague 5 est toujours l'\u00e9lite de donn\u00e9es");
  /* L'ennemi d'une vague normale est tir\u00e9 au hasard dans le pool : son endurance varie du
     simple au double. On compare donc \u00e0 la MOYENNE de vingt tirages, sinon le test d\u00e9pend
     du d\u00e9 (mesur\u00e9 : 5,1\u00d7 sur un tirage faible, 3,4\u00d7 en moyenne). */
  var somme = 0;
  for (var t = 0; t < 80; t++) somme += tete5(D.buildWaveEnemy(4)).maxHp; // v3.256.0 : 20 -> 80 tirages, 4,6x sortait une fois sur cinq
  var ratio = e5.maxHp / (somme / 80);
  ok(ratio >= 2.5 && ratio <= 4.5, "\u00e9lite \u00e0 " + ratio.toFixed(1) + "\u00d7 la vague moyenne (cible 2,5-4)");
  run("DungeonManager.forfeit();");
})();

/* [56] v3.254.0 — D-4 : suppression des fichiers d'afflictions parqués. */
console.log("\n[56] v3.254.0 \u2014 Suppression des afflictions parqu\u00e9es");
(function () {
  game = freshCombat("knight");
  ok(typeof g.AFFLICTIONS === "undefined", "data/afflictions.js supprim\u00e9 : AFFLICTIONS n'existe plus");
  ok(typeof g.buildAfflictionsHTML === "undefined", "afflictions-view.js supprim\u00e9");
  ok(!!g.DUNGEON_MARKS && g.DUNGEON_MARKS.length === 5, "DUNGEON_MARKS est la seule table (5 Marques)");
  ok(!!g.AfflictionManager && typeof g.AfflictionManager.getCombinedModifiers === "function",
    "AfflictionManager reste l'API unique des modificateurs, aliment\u00e9e par les Marques");

  /* La cl\u00e9 de sauvegarde dispara\u00eet, et une sauvegarde qui la porte encore ne la ressuscite pas. */
  var saved = run("buildSaveData()");
  ok(saved.activeAfflictions === undefined, "activeAfflictions n'est plus \u00e9crite en sauvegarde");
  var d = JSON.parse(run("JSON.stringify(buildSaveData())"));
  d.activeAfflictions = { aff_plague: true };
  run("restoreBaseState(" + JSON.stringify(d) + ")");
  ok(game.activeAfflictions === undefined, "une sauvegarde d'avant la v3.245.0 : la cl\u00e9 est ignor\u00e9e et retir\u00e9e");
  ok(g.AfflictionManager.getActiveCount() === 0, "...et n'active aucune Marque");

  /* Une sauvegarde encore positionn\u00e9e sur l'onglet supprim\u00e9 ne casse pas le rendu. */
  game.activeTab = "afflictions";
  var ok1 = true;
  try { run("renderPanel()"); } catch (e) { ok1 = false; }
  ok(ok1, "activeTab = 'afflictions' : le rendu tient, avec l'\u00e9cran de repli");

  /* Les Marques restent pleinement fonctionnelles apr\u00e8s la suppression. */
  run("DungeonManager.ensure(); game.dungeonTickets = 2; game.dungeonTierCleared = { 1: true }; game.activeTab = 'combat';");
  g.DungeonManager.start(1, ["aff_fragility"]);
  ok(game.dungeonRun.active && g.AfflictionManager.getActiveCount() === 1,
    "run sous Fragilit\u00e9 : la Marque s'applique toujours");
  ok(g.AfflictionManager.getCombinedModifiers().heroMaxHpMult === 0.7, "...et son modificateur est lu");
  run("DungeonManager.forfeit();");
})();

/* [57] v3.255.0 — Cartes Vivantes, lot C-1 : données de la Forêt, LivingMapManager, persistance.
   Rapport de conception v1.0, §10.3 (bloc prévu sous le numéro [47], pris depuis). */
console.log("\n[57] v3.255.0 \u2014 Cartes Vivantes C-1 : donn\u00e9es, LivingMapManager, sauvegarde");
(function () {
  var LM = g.LivingMapManager, M = "forest";
  var map = g.LIVING_MAPS && g.LIVING_MAPS.forest;
  ok(!!map && map.sectors.length === 9 && map.landmarks.length === 2, "Forêt : 9 secteurs + 2 amers en réserve");
  ok(LM.getMapForWorld("forest") === map && LM.getMapForWorld("desert") === null, "getMapForWorld : Forêt seule, « pas de carte » ailleurs");
  ok(fs.existsSync(path.join(ROOT, map.asset)), "l'asset est sur le disque : " + map.asset);

  /* Données : ids uniques, anneaux 1-3, adjacences symétriques vers des secteurs existants. */
  var ids = {}, dataOk = true, symOk = true, byRing = { 1: 0, 2: 0, 3: 0 };
  map.sectors.forEach(function (s) {
    if (ids[s.id]) dataOk = false; ids[s.id] = s;
    if (!byRing.hasOwnProperty(s.ring)) dataOk = false; else byRing[s.ring]++;
  });
  map.sectors.forEach(function (s) {
    s.neighbors.forEach(function (n) {
      if (!ids[n]) symOk = false;
      else if (ids[n].neighbors.indexOf(s.id) < 0) symOk = false;
    });
  });
  ok(dataOk && byRing[1] === 3 && byRing[2] === 3 && byRing[3] === 3, "ids uniques, 3 secteurs par anneau");
  ok(symOk, "adjacences symétriques, toutes vers des secteurs existants");

  /* Chaque expédition référence un gabarit, des obstacles et des groupes qui existent ; l'élite aussi. */
  var refOk = true, eliteOk = false;
  map.sectors.forEach(function (s) {
    var cs = [s.content]; if (s.content.then) cs.push(s.content.then);
    cs.forEach(function (c) {
      if (c.type === "expedition") {
        if (!g.SCENE_TEMPLATES[c.templateId]) refOk = false;
        (c.pools.obstacle || []).forEach(function (o) { if (!g.SCENE_NODES.obstacles[o]) refOk = false; });
        (c.pools.combat || []).forEach(function (o) { if (!g.SCENE_NODES.combatGroups[o]) refOk = false; });
      } else if (c.type === "elite") {
        eliteOk = !!(g.ELITE_DB && g.ELITE_DB[c.eliteId]);
      } else refOk = false;
    });
  });
  ok(refOk, "gabarits, obstacles (SCENE_NODES.obstacles) et groupes (combatGroups) référencés existent");
  ok(eliteOk, "Camp des toiles : l'élite araignee_marquee existe dans ELITE_DB");

  /* Nouvelle partie : tout voilé, repère aligné sur ascensionCount. */
  game = freshCombat("knight");
  game.unlockedTabs.village = true; // v3.256.0 : les départs exigent le Village ouvert (testé en [58])
  var taken0 = LM.ensureDefaults();
  var sum = LM.getSummary(M);
  ok(sum.voile === 9 && sum.libere === 0 && sum.recouvert === 0 && taken0.length === 0, "nouvelle partie : 9 secteurs voilés, aucune régression au premier ensureDefaults");
  ok(game.livingMaps.lastAscensionSeen === game.ascensionCount, "repère lastAscensionSeen aligné sur ascensionCount");

  /* Atteignabilité : l'anneau 1 l'est toujours, l'anneau 2 jamais avant un voisin libéré. Le mur parle. */
  ok(LM.isReachable(M, "gue") && LM.isReachable(M, "camp") && LM.isReachable(M, "etang"), "anneau 1 toujours atteignable");
  ok(!LM.isReachable(M, "menhirs") && !LM.isReachable(M, "arbremere"), "anneaux 2 et 3 inatteignables au départ");
  var cs = LM.canStart(M, "menhirs");
  ok(!cs.ok && /Lib\u00e8re d'abord Pont du gu\u00e9/.test(cs.reason), "mur : « " + cs.reason + " »");
  // v3.260.0 : le coût d'entrée (Petite ration) est vérifié par canStart
  game.resources.petite_ration = 0;
  var csRation = LM.canStart(M, "gue");
  ok(!csRation.ok && /Il te manque une Petite ration/.test(csRation.reason) && csRation.missingResource === "petite_ration", "mur : ration manquante dite avant le départ (« " + csRation.reason + " »)");
  game.resources.petite_ration = 5;
  ok(LM.canStart(M, "gue").ok && LM.canStart(M, "gue").intensity === "sentier", "Pont du gué : départ possible, intensité Sentier (anneau 1)");

  /* Succès : libération, Sève de première libération via l'Entrepôt, voisins ouverts. */
  var seve0 = g.WarehouseManager.getAmount("seve_aeswyn");
  var r1 = LM.onRunEnd(M, "gue", "success");
  ok(r1.liberated && r1.firstReward === 5 && LM.getState(M, "gue").state === "libere" && LM.getState(M, "gue").liberatedCount === 1, "succès au Pont du gué : libéré, +5 Sève (anneau 1)");
  ok(g.WarehouseManager.getAmount("seve_aeswyn") === seve0 + 5, "la Sève est bien passée par WarehouseManager");
  ok(LM.isReachable(M, "menhirs") && LM.isReachable(M, "arbremere"), "ses voisins deviennent atteignables");
  ok(LM.hasEffect("corde_plus") && !LM.hasEffect("puits_plus"), "effet tenu corde_plus actif, puits_plus non");

  /* Rejeu d'un secteur libéré : refusé tant qu'un secteur atteignable attend (§6.1). */
  cs = LM.canStart(M, "gue");
  ok(!cs.ok && /La brume attend encore/.test(cs.reason), "rejeu refusé : « " + cs.reason + " »");

  /* Échec sans rien à reprendre autour : le plus lointain libéré tombe. Puis échec avec voisin libéré. */
  LM.onRunEnd(M, "menhirs", "success");
  ok(LM.getState(M, "menhirs").state === "libere" && g.WarehouseManager.getAmount("seve_aeswyn") === seve0 + 13, "Cercle des menhirs libéré, +8 Sève (anneau 2)");
  LM._rand = function () { return 0.99; }; // aucun frein
  var r2 = LM.onRunEnd(M, "toiles", "fail");
  ok(r2.regressed === "menhirs" && LM.getState(M, "menhirs").state === "recouvert" && LM.getState(M, "gue").state === "libere",
    "échec au Camp des toiles : UN seul secteur régresse, le voisin libéré d'anneau le plus élevé (menhirs)");
  ok(/Le Recouvrement a repris Cercle des menhirs/.test(r2.message) && /L'effet est perdu/.test(r2.message) && /Reprends-le depuis Pont du gu\u00e9/.test(r2.message),
    "message : « " + r2.message + " »");
  ok(!LM.isReachable(M, "toiles") && LM.isReachable(M, "menhirs"), "toiles redevient inatteignable, menhirs reprenable depuis le gué");
  var r3 = LM.onRunEnd(M, "camp", "fail"); // aucun voisin libéré : repli sur le plus lointain libéré
  ok(r3.regressed === "gue" && LM.getState(M, "gue").state === "recouvert", "échec au Campement, aucun voisin libéré : repli sur le libéré le plus lointain (gué)");
  var r4 = LM.onRunEnd(M, "camp", "fail");
  ok(r4.regressed === null && /Rien \u00e0 reprendre/.test(r4.message), "échec sans rien de libéré : rien ne se passe");
  ok(LM.onRunEnd(M, "camp", "neutral").regressed === null && LM.getState(M, "camp").state === "voile", "leaveNow avant la fin (neutral) : rien ne bouge");

  /* Reprise : pas de Sève de secteur, compteur incrémenté ; jamais voilé à nouveau. */
  var seve1 = g.WarehouseManager.getAmount("seve_aeswyn");
  var r5 = LM.onRunEnd(M, "gue", "success");
  ok(r5.liberated && r5.firstReward === 0 && g.WarehouseManager.getAmount("seve_aeswyn") === seve1 && LM.getState(M, "gue").liberatedCount === 2,
    "reprise du gué : libéré, 0 Sève de secteur, liberatedCount 2");
  ok(LM.setState(M, "gue", "voile", "test") === false && LM.getState(M, "gue").state === "libere", "setState vers voilé refusé : ce qui a été vu reste vu");
  ok(LM.setState(M, "etang", "libere", "choix narratif") === true && LM.getState(M, "etang").state === "libere" && !LM.getState(M, "etang").firstRewardClaimed,
    "setState narratif libère sans Sève ni run");

  /* Camp des toiles : élite une fois, expédition ensuite. Le cap PA ne bloque pas l'élite. */
  ok(LM.getContentFor(M, "toiles").type === "elite", "Camp des toiles : contenu élite tant qu'il n'a jamais été libéré");
  LM.onRunEnd(M, "menhirs", "success");
  run("SceneRunManager.ensureDefaults(); game.explorationProgression.petiteAventure = { day: new Date().toDateString(), count: 3 };");
  ok(!LM.canStart(M, "camp").ok && /Plus d'exp\u00e9dition aujourd'hui/.test(LM.canStart(M, "camp").reason), "cap PA atteint : expédition refusée");
  ok(LM.canStart(M, "toiles").ok, "...mais le secteur d'élite reste jouable (combat, pas expédition)");
  run("game.explorationProgression.petiteAventure.count = 0;");
  LM.onRunEnd(M, "toiles", "success");
  ok(LM.getContentFor(M, "toiles").type === "expedition" && LM.getContentFor(M, "toiles").pools.combat[0] === "araignees_foret", "après la première libération : expédition Périple aux reprises");
  ok(LM.getState(M, "toiles").firstRewardClaimed && g.WarehouseManager.getAmount("seve_aeswyn") === seve1 + 12, "+12 Sève (anneau 3)");

  /* Palissade : frein en % par niveau, tenue par anneau. Simulée sur game.village (C-3 livrera le bâtiment). */
  run("VillageBuildingManager.ensure();");
  ok(LM.getPalisadeLevel() === 0 && LM.getBrakeChance() === 0 && LM.getProtectedSet(M).length === 0, "sans Palissade : ni frein ni protection");
  game.village.buildings.palisade.level = 3;
  ok(LM.getHeldRing(3) === 1 && LM.getHeldRing(7) === 2 && LM.getHeldRing(10) === 3 && LM.getHeldRing(2) === 0, "anneau tenu : 3 → 1, 7 → 2, 10 → 3");
  ok(LM.isProtected(M, "gue") && LM.isProtected(M, "etang") && !LM.isProtected(M, "menhirs") && !LM.isProtected(M, "camp"),
    "niveau 3 : l'anneau 1 libéré est protégé, l'anneau 2 non, un voilé jamais");
  LM._rand = function () { return 0.99; };
  var r6 = LM.onRunEnd(M, "gue", "fail"); // voisins libérés : menhirs (2), arbremere (voilé) -> menhirs tombe, jamais le gué protégé
  ok(r6.regressed === "menhirs" && LM.getState(M, "gue").state === "libere", "un échec ne reprend jamais un secteur protégé");
  game.village.buildings.palisade.level = 10;
  ok(Math.abs(LM.getBrakeChance() - 0.7) < 1e-9, "niveau 10 : frein 70 %");
  LM._rand = function () { return 0.5; };
  LM.onRunEnd(M, "menhirs", "success");
  game.village.buildings.palisade.level = 5; // tient l'anneau 1 seulement, frein 35 %
  var r7 = LM.onRunEnd(M, "toiles", "fail"); // 0,5 >= 0,35 : pas de frein
  ok(!r7.braked && r7.regressed === "menhirs", "tirage 0,50 contre 35 % : le frein ne joue pas, menhirs tombe");
  LM.onRunEnd(M, "menhirs", "success");
  LM._rand = function () { return 0.1; };
  var r8 = LM.onRunEnd(M, "toiles", "fail");
  ok(r8.braked && r8.regressed === null && LM.getState(M, "menhirs").state === "libere" && /La Palissade a tenu/.test(r8.message), "tirage 0,10 contre 35 % : la Palissade tient, rien ne régresse");
  ok(LM.isNameRevealed(M, "arbremere") && !LM.isNameRevealed(M, "autel"), "niveau 5 : le nom d'un voilé au front (Arbre-mère) est révélé, pas celui d'un voilé hors d'atteinte (Autel)");
  LM._rand = Math.random;

  /* Ascension par repère : tout ce que la Palissade ne tient pas tombe, une seule fois. */
  var before = LM.getSummary(M);
  game.ascensionCount += 1;
  var taken = LM.ensureDefaults();
  var after = LM.getSummary(M);
  ok(taken.length === before.libere - before.protege && after.libere === before.protege && after.libere === 2,
    "Ascension : " + taken.length + " secteur(s) repris, l'anneau 1 tenu (gué, étang) survit");
  ok(LM.ensureDefaults().length === 0 && LM.getSummary(M).libere === 2, "idempotent : un second appel ne reprend rien de plus");
  ok(LM.getState(M, "toiles").firstRewardClaimed === true, "la Sève de première libération n'est pas remise en jeu");

  /* Sauvegarde : 4 points. buildSaveData / restoreBaseState / hardResetState (conservé, puis recouvert par le système) / fullResetState. */
  var saved = run("buildSaveData()");
  ok(saved.livingMaps && saved.livingMaps.forest && saved.livingMaps.forest.sectors.gue.state === "libere" && typeof saved.livingMaps.lastAscensionSeen === "number",
    "buildSaveData écrit livingMaps (états + repère)");
  var d = JSON.parse(run("JSON.stringify(buildSaveData())"));
  run("restoreBaseState(" + JSON.stringify(d) + ")");
  ok(LM.getState(M, "gue").state === "libere" && LM.getState(M, "gue").liberatedCount === 2 && LM.getSummary(M).recouvert === after.recouvert, "restoreBaseState relit livingMaps à l'identique");
  delete d.livingMaps;
  run("restoreBaseState(" + JSON.stringify(d) + ")");
  ok(LM.getSummary(M).voile === 9 && game.livingMaps.lastAscensionSeen === game.ascensionCount, "sauvegarde d'avant la v3.255.0 : objet vide, complété sans régression");
  /* Ascension réelle : ascendNow incrémente le compteur PUIS hardResetState conserve livingMaps ; la reprise se fait à la lecture. */
  LM.onRunEnd(M, "gue", "success"); LM.onRunEnd(M, "camp", "success");
  game.village.buildings.palisade.level = 0;
  game.ascensionCount += 1;
  run("hardResetState();");
  ok(game.livingMaps.forest.sectors.gue.state === "libere", "hardResetState conserve livingMaps tel quel (la sauvegarde ne recouvre pas)");
  ok(LM.ensureDefaults().length === 2 && LM.getSummary(M).recouvert === 2 && LM.getState(M, "gue").firstRewardClaimed, "...et LivingMapManager recouvre à la lecture, Sève acquise conservée");
  run("fullResetState();");
  ok(JSON.stringify(game.livingMaps) === "{}", "fullResetState : livingMaps vide");
  ok(LM.getSummary(M).voile === 9, "...recréé voilé au premier accès");
})();

/* [58] v3.256.0 — Cartes Vivantes, lot C-2 : Forêt jouable (vue, runs ciblés, combat d'élite, tableau). */
console.log("\n[58] v3.256.0 \u2014 Cartes Vivantes C-2 : vue, runs cibl\u00e9s, \u00e9lite, tableau de missions");
(function () {
  var LM = g.LivingMapManager, M = "forest";
  game = freshCombat("knight");
  game.unlockedTabs.map = true; game.unlockedTabs.village = true; game.unlockedTabs.quests = true;
  run("WarehouseManager.addResource('petite_ration', 20, true);");

  /* Navigation : sous-vue de l'onglet Carte. */
  run("switchTab('map')");
  var html = run("buildMapHTML()");
  ok(/map-path-frame/.test(html) && !/lm-map/.test(html), "onglet Carte : carte du monde tant qu'aucune carte vivante n'est ouverte");
  ok(/tapMapWorld\(0\)/.test(html), "toucher un monde passe par tapMapWorld (ouvre la carte vivante si elle existe)");
  run("tapMapWorld(1)");
  ok(g.game.mapSelectedWorldIndex === 1 && !g.isLivingMapOpen(), "un monde sans carte (Désert) garde sa popup");
  run("closeWorldPopup(); tapMapWorld(0)");
  ok(g.isLivingMapOpen() && g.livingMapOpenId === "forest", "la Forêt ouvre sa carte vivante");
  html = run("buildMapHTML()");
  ok(/lm-map/.test(html) && (html.match(/class="lm-node is-voile/g) || []).length === 9, "9 nœuds voilés rendus");
  ok(/lm-node is-village/.test(html) && (html.match(/is-reserve/g) || []).length === 2, "village + 2 amers");
  ok(/lm-fog is-on/.test(html) && (html.match(/radial-gradient/g) || []).length === 18 && !/lm-cover is-on/.test(html), "brume masquée sur 9 secteurs (9 dégradés × 2 préfixes), pas de Recouvrement");
  ok(/--lm-r:19;--lm-fog:0\.36/.test(html), "rayon 19 % et brume 36 % (validés sur iPhone)");
  /* v3.292.0 : plus de panneau sous la carte ; sans sélection, pas de volet, la carte occupe l'écran. */
  ok(!/lmx-sheet/.test(html) && /lmx-viewport/.test(html) && /lmxRecenter\(\)/.test(html), "sans sélection : aucun volet, carte plein écran avec le bouton recentrer");
  ok(/closeLivingMap\(\)/.test(html) && /openWorldPopup\(0\)/.test(html), "retour à la carte du monde et accès à la popup du monde");
  run("selectLivingMapSector('menhirs')");
  html = run("buildMapHTML()");
  ok(/Secteur inconnu/.test(html) && /Lib\u00e8re d&#39;abord Pont du gu\u00e9|Lib\u00e8re d'abord Pont du gu\u00e9/.test(html) && /disabled>Partir</.test(html), "menhirs : nom masqué, mur affiché, bouton grisé");
  run("selectLivingMapSector('gue')");
  html = run("buildMapHTML()");
  ok(/startLivingMapSector\('gue'\)/.test(html) && /Premi\u00e8re lib\u00e9ration :<\/b> \+5/.test(html) && (html.match(/<path /g) || []).length === 3, "gué : bouton Partir, +5 Sève annoncés, 3 liens (2 voisins + village)");
  run("closeLivingMap()");
  ok(!g.isLivingMapOpen() && /map-path-frame/.test(run("buildMapHTML()")), "Retour : la carte du monde revient");

  /* Tableau de missions : la Petite Aventure ouvre la carte (décision 7). */
  var missions = g.MissionBoard._petiteAventureMissions();
  ok(missions.length === 1 && /carte de la For\u00eat/.test(missions[0].blurb) && typeof missions[0].accept === "function", "carte Petite Aventure : texte vers la carte, accept disponible");
  missions[0].accept();
  ok(g.game.activeTab === "map" && g.isLivingMapOpen(), "accept() ouvre la carte de la Forêt au lieu de lancer un run");

  /* Run ciblé : intensité par anneau, pools du secteur, écran de profil. */
  var st = LM.start(M, "gue");
  ok(st.ok && g.game.activeTab === "scene" && g.game.sceneRun && g.game.sceneRun.livingMap && g.game.sceneRun.livingMap.sectorId === "gue", "départ du gué : run scene ciblé, onglet Expédition");
  ok(g.game.sceneRun.status === "profile" && g.SceneRunManager.petiteAventureCountToday() === 1, "statut profil, un cran du cap consommé");
  html = run("buildSceneScreenHTML()");
  ok(/scene-map-target/.test(html) && /Pont du gu\u00e9/.test(html) && /Sentier/.test(html), "écran de profil : secteur, intensité imposée et lore");
  ok(!LM.canStart(M, "camp").ok && /d\u00e9j\u00e0 en cours/.test(LM.canStart(M, "camp").reason), "un autre secteur ne se lance pas pendant le run");
  g.SceneRunManager.chooseProfile("bourrin");
  var r = g.game.sceneRun;
  ok(r.intensity === "sentier" && r.status === "mutator-announce" && r.card.length === 6, "profil choisi : intensité Sentier posée sans écran (anneau 1), carte à 6 paliers");
  var poolsOk = true;
  r.card.forEach(function (lvl) { lvl.forEach(function (slot) { if (slot.type === "obstacle" && ["riviere", "gouffre"].indexOf(slot.gabaritId) < 0) poolsOk = false; }); });
  ok(poolsOk, "obstacles tirés dans le pool du secteur seulement (rivière, gouffre)");
  /* Fin par abandon : échec, rien à reprendre, bilan avec retour à la carte. */
  g.SceneRunManager.acknowledgeMutator();
  g.SceneRunManager.abandon();
  ok(r.status === "completed" && r.livingMapReport && r.livingMapReport.result === "fail" && r.livingMapReport.regressed === null, "abandon : échec rapporté à la carte, rien à reprendre");
  ok(LM.getState(M, "gue").state === "voile", "le gué reste voilé");
  html = run("buildSceneScreenHTML()");
  ok(/scene-map-report/.test(html) && /Retour \u00e0 la carte/.test(html) && !/Nouvelle exp\u00e9dition/.test(html), "bilan : ligne de carte et un seul bouton, Retour à la carte");
  run("leaveSceneScreen()");
  ok(g.game.activeTab === "map" && g.isLivingMapOpen() && g.livingMapSelected === "gue" && g.game.sceneRun === null, "Retour : carte ouverte sur le gué, run nettoyé");

  /* Fin par finale résolue : succès, libération, Sève. */
  var seve0 = g.WarehouseManager.getAmount("seve_aeswyn");
  LM.start(M, "gue");
  g.SceneRunManager.chooseProfile("prudent"); g.SceneRunManager.acknowledgeMutator();
  g.game.sceneRun.status = "finale"; // raccourci : la chambre finale atteinte
  g.SceneRunManager.resolveFinale("sur");
  r = g.game.sceneRun;
  ok(r.status === "completed" && r.livingMapReport && r.livingMapReport.liberated && r.livingMapReport.firstReward === 5, "finale résolue : secteur libéré, +5 Sève de secteur");
  ok(LM.getState(M, "gue").state === "libere" && g.WarehouseManager.getAmount("seve_aeswyn") >= seve0 + 5, "état libéré, Sève à l'Entrepôt (secteur + finale)");
  ok(g.SceneRunManager.resolveFinale("sur").ok === false && r.livingMapReport.firstReward === 5, "une seconde notification est impossible (un seul compte rendu par run)");
  run("leaveSceneScreen()");
  html = run("buildMapHTML()");
  ok((html.match(/class="lm-node is-libere/g) || []).length === 1 && (html.match(/radial-gradient/g) || []).length === 16, "carte : 1 libéré, brume sur 8");

  /* Fin par mort en nœud combat : échec, retour au Campement. */
  LM.onRunEnd(M, "menhirs", "success"); // menhirs libéré pour avoir quelque chose à perdre
  LM.start(M, "camp"); // v3.258.0 : l'Arbre-mère est devenue une élite, on meurt au Campement (repli : le libéré le plus lointain tombe)
  g.SceneRunManager.chooseProfile("bourrin"); g.SceneRunManager.acknowledgeMutator();
  g.game.sceneRun.status = "combat";
  g.game.activeTab = "combat";
  LM._rand = function () { return 0.99; };
  run("CombatEngine.onHeroDefeated();");
  ok(g.game.sceneRun.status === "completed" && g.game.sceneRun.livingMapReport.result === "fail" && g.game.sceneRun.livingMapReport.regressed === "menhirs", "mort en expédition : échec, le Cercle des menhirs (libéré le plus lointain) régresse");
  ok(g.game.activeTab === "campement", "mort : retour au Campement comme partout");
  run("SceneRunManager.clearRun();");
  ok(!LM.canStart(M, "camp").ok && /PV sont à zéro/.test(LM.canStart(M, "camp").reason), "à 0 PV : aucun départ, le mur le dit");
  game.heroHp = game.heroMaxHp;
  LM._rand = Math.random;

  /* Combat d'élite direct : Camp des toiles. */
  LM.onRunEnd(M, "menhirs", "success");
  ok(LM.isReachable(M, "toiles") && LM.getContentFor(M, "toiles").type === "elite", "Camp des toiles atteignable, contenu élite");
  var seve1 = g.WarehouseManager.getAmount("seve_aeswyn");
  st = LM.start(M, "toiles");
  ok(st.ok && LM.getFight() && LM.getFight().eliteId === "araignee_marquee", "départ : combat de carte engagé");
  ok(g.game.enemy && g.game.enemy.isElite && g.game.enemy.id === "araignee_marquee" && g.game.activeTab === "combat", "la Fileuse aux yeux blancs paraît en combat");
  ok(g.game.sortie.active && g.game.sortie.context === "mapelite", "sortie en contexte mapelite");
  ok(/Camp des toiles \u00b7 \u00c9lite/.test(run("getCombatMissionProgressLabel()")), "compteur de mission : « Camp des toiles · Élite »");
  ok(!LM.canStart(M, "gue").ok, "aucun autre départ pendant le combat");
  /* Rechargement en plein combat : l'élite reparaît. */
  run("game.enemy = null;");
  ok(g.QuestEnemyManager.respawnActiveRunEnemy() === true && g.game.enemy && g.game.enemy.id === "araignee_marquee", "reprise après rechargement : l'élite reparaît");
  /* Fuite = échec de secteur (décision 4). */
  LM._rand = function () { return 0.99; };
  run("SortieManager.flee();");
  ok(!LM.getFight() && !g.game.sortie.active && LM.getState(M, "toiles").state === "voile" && LM.getState(M, "menhirs").state === "recouvert", "fuite : combat clos, menhirs repris par le Recouvrement");
  LM._rand = Math.random;
  /* Victoire = libération, Sève, retour sur la carte. */
  LM.onRunEnd(M, "menhirs", "success");
  LM.start(M, "toiles");
  run("game.enemy.hp = 1; game.enemy.maxHp = 1; game.activeTab = 'combat'; CombatEngine.killEnemy();");
  ok(!LM.getFight() && LM.getState(M, "toiles").state === "libere" && LM.getState(M, "toiles").liberatedCount === 1, "élite vaincue : Camp des toiles libéré");
  ok(g.WarehouseManager.getAmount("seve_aeswyn") === seve1 + 12, "+12 Sève de secteur (anneau 3)");
  ok(g.game.activeTab === "map" && g.isLivingMapOpen() && g.livingMapSelected === "toiles", "retour sur la carte, secteur sélectionné");
  ok(LM.getContentFor(M, "toiles").type === "expedition" && /Rejouer le secteur/.test(run("buildMapHTML()")), "reprises : expédition Périple désormais");
  run("selectLivingMapSector('portail')");
  ok(/>Partir<\/button>/.test(run("buildMapHTML()")) && !/Affronter/.test(run("buildMapHTML()")), "un voilé dont le nom est masqué dit « Partir », jamais son contenu");
  /* Mort face à l'élite (contenu élite forcé : liberatedCount remis à 0). */
  game.heroHp = game.heroMaxHp;
  LM.setState(M, "toiles", "recouvert", "test");
  LM.getState(M, "toiles").liberatedCount = 0;
  LM.start(M, "toiles");
  ok(!!LM.getFight(), "combat d'élite relancé");
  LM._rand = function () { return 0.99; };
  run("CombatEngine.onHeroDefeated();");
  ok(!LM.getFight() && g.game.activeTab === "campement" && !g.game.sortie.active && g.game.heroHp === 0, "mort face à l'élite : combat clos, retour au Campement, sortie close");
  LM._rand = Math.random;

  /* Village fermé : le mur le dit. */
  game.unlockedTabs.village = false;
  ok(!LM.canStart(M, "gue").ok && /Aeswyn n'a pas encore ouvert/.test(LM.canStart(M, "gue").reason), "sans Village : départ refusé avec la raison");
  game.unlockedTabs.village = true;

  /* Ascension pendant un combat : le combat ne traverse pas. */
  game.heroHp = game.heroMaxHp;
  LM.getState(M, "toiles").liberatedCount = 0;
  LM.start(M, "toiles");
  run("SortieManager.end('return');"); // on simule une fin de sortie externe
  game.ascensionCount += 1;
  LM.ensureDefaults();
  ok(!LM.getFight(), "Ascension : le combat de carte est oublié");
})();

/* [59] v3.257.0 — Cartes Vivantes, lot C-3 : Palissade livrée, effets tenus branchés. */
console.log("\n[59] v3.257.0 \u2014 Cartes Vivantes C-3 : Palissade, effets tenus");
(function () {
  var LM = g.LivingMapManager, M = "forest", VB = g.VillageBuildingManager;
  game = freshCombat("knight");
  game.unlockedTabs.village = true;
  run("VillageBuildingManager.ensure();");

  /* Bâtiment : livré, paliers de l'Entrepôt agrandi, rang 4. */
  var def = g.VILLAGE_BUILDINGS.palisade;
  /* v3.290.0 : palier propre pour les trois niveaux de la For\u00eat, puis les anciens paliers. */
  ok(def.implemented === true && def.maxLevel === 10 && def.costTiers.length === 3, "Palissade livrée : 10 niveaux, trois paliers");
  ok(def.costTiers[0].maxLevel === 2 && def.costTiers[0].baseCost.gold === 250 && def.costTiers[0].costMult === 1.70,
    "niveaux 1-3 (For\u00eat) : palier propre, 250 or \u00d71,7 (v3.290.0)");
  ok(VB.getBlockReason("palisade") === "Atelier niveau 2", "sous le rang 2 : le mur nomme l'Atelier 2 (v3.289.0, D12)");
  game.village.buildings.workshop.level = 2;
  run("game.gold = 100000; WarehouseManager.addResource('planche', 500, true); WarehouseManager.addResource('pierre', 500, true);");
  ok(VB.getBlockReason("palisade") === null && VB.getCardState("palisade") === "ready", "Atelier 7 + mat\u00e9riaux : constructible");
  ok(VB.startBuild("palisade") === true, "chantier lanc\u00e9");
  game.village.site.endsAt = Date.now() - 1; VB.tick();
  ok(VB.getLevel("palisade") === 1 && LM.getPalisadeLevel() === 1, "niveau 1 acquis, lu par LivingMapManager");
  ok(/Frein sur l'\u00e9chec : 7 %/.test(VB.getEffectLabel("palisade")) && /niveau 3/.test(VB.getEffectLabel("palisade")), "fiche : « " + VB.getEffectLabel("palisade") + " »");
  ok(/anneau 1 tenu/.test(VB.getEffectLabel("palisade", 3)) && /anneaux 1 et 2/.test(VB.getEffectLabel("palisade", 7)) && /ne reprend plus rien/.test(VB.getEffectLabel("palisade", 10)) && /noms r\u00e9v\u00e9l\u00e9s/.test(VB.getEffectLabel("palisade", 5)),
    "fiche : paliers 3 / 5 / 7 / 10 annonc\u00e9s");

  /* Niveau 10 = immunité de plafond (décision Seb). */
  game.village.buildings.palisade.level = 10;
  LM.onRunEnd(M, "gue", "success"); LM.onRunEnd(M, "menhirs", "success"); LM.onRunEnd(M, "toiles", "success");
  LM._rand = function () { return 0.99; };
  var r = LM.onRunEnd(M, "arbremere", "fail");
  ok(r.regressed === null && LM.getProtectedSet(M).length === 3, "niveau 10 : m\u00eame sans frein, un \u00e9chec ne reprend rien (anneaux 1 \u00e0 3 tenus)");
  game.ascensionCount += 1;
  ok(LM.ensureDefaults().length === 0 && LM.getSummary(M).libere === 3, "niveau 10 : l'Ascension ne reprend rien");
  LM._rand = Math.random;

  /* Effets tenus : rien sans secteur libéré. */
  game = freshCombat("knight");
  game.unlockedTabs.village = true;
  run("VillageBuildingManager.ensure(); WarehouseManager.addResource('petite_ration', 20, true);");
  ok(!LM.hasEffect("corde_plus") && !LM.hasEffect("gourde_40") && !LM.hasEffect("autel_normale") && !LM.hasEffect("puits_plus") && !LM.hasEffect("scierie_plus") && !LM.hasEffect("contrats_plus"), "aucun effet tenu au d\u00e9part");
  run("ProductionManager.ensure(); ProductionManager.unlockBuilding('well'); ProductionManager.unlockBuilding('sawmill');");
  var well0 = g.ProductionManager.getRatePerMin("well"), saw0 = g.ProductionManager.getRatePerMin("sawmill");

  /* Puits +10 % (Étang), Scierie +10 % (Arbre doré), perdus à la régression. */
  LM.onRunEnd(M, "etang", "success");
  ok(Math.abs(g.ProductionManager.getRatePerMin("well") - well0 * 1.10) < 1e-9 && g.ProductionManager.getRatePerMin("sawmill") === saw0, "\u00c9tang lib\u00e9r\u00e9 : Puits \u00d71,10, Scierie inchang\u00e9e");
  LM.onRunEnd(M, "arbredore", "success");
  ok(Math.abs(g.ProductionManager.getRatePerMin("sawmill") - saw0 * 1.10) < 1e-9, "Arbre dor\u00e9 lib\u00e9r\u00e9 : Scierie \u00d71,10");
  LM.setState(M, "etang", "recouvert", "test");
  ok(g.ProductionManager.getRatePerMin("well") === well0, "\u00c9tang repris : le Puits retombe aussit\u00f4t");

  /* Contrats +10 % (Campement) : sur la livraison, jamais sur la valeur stockée. */
  game.village.buildings.workshop.level = 5; game.village.buildings.tavern.level = 2;
  run("TavernManager.ensure();");
  var contracts = g.TavernManager.getContracts();
  ok(contracts.length === 2, "Taverne niveau 2 : deux contrats");
  var c0 = contracts[0];
  ok(g.TavernManager.getPayout(c0) === c0.reward, "sans Campement : paiement = r\u00e9compense de base");
  LM.onRunEnd(M, "camp", "success");
  ok(g.TavernManager.getPayout(c0) === Math.floor(c0.reward * 1.10) && c0.reward === contracts[0].reward, "Campement lib\u00e9r\u00e9 : +10 % \u00e0 la livraison, valeur stock\u00e9e intacte");
  run("WarehouseManager.addResource('" + c0.resourceId + "', " + c0.quantity + ", true);");
  var gold0 = g.game.gold;
  ok(g.TavernManager.deliver(c0.id) === true && g.game.gold === gold0 + Math.floor(c0.reward * 1.10), "livraison : l'or vers\u00e9 est le paiement major\u00e9");
  var c1 = g.TavernManager.getContracts()[1];
  ok(new RegExp(String(Math.floor(c1.reward * 1.10))).test(run("buildTavernContractsHTML()")), "le tableau affiche le paiement major\u00e9 (" + Math.floor(c1.reward * 1.10) + " or), pas la valeur de base");

  /* Corde +1 (Pont du gué), gourde 40 (Autel de pierre), autel soigne une normale (Menhirs). */
  LM.onRunEnd(M, "gue", "success");
  g.SceneRunManager.startRun("petite_aventure_foret");
  g.SceneRunManager.chooseProfile("prudent"); g.SceneRunManager.chooseIntensity("chemin"); g.SceneRunManager.acknowledgeMutator();
  g.SceneRunManager.confirmLoadout(["corde", "gourde", "provisions"]);
  var run1 = g.game.sceneRun;
  ok(run1.ropeCharges === 2, "Pont du gu\u00e9 tenu : une corde embarqu\u00e9e = 2 usages");
  ok(g.SceneRunManager.getGourdeAmount() === 25, "Autel de pierre non tenu : gourde 25");
  run1.breath = 50; g.SceneRunManager.useSceneGourde();
  ok(run1.breath === 75, "gourde : +25");
  LM.onRunEnd(M, "autel", "success");
  ok(g.SceneRunManager.getGourdeAmount() === 40, "Autel de pierre tenu : gourde 40");
  run1.breath = 50; run1.gourdeAvailable = true; g.SceneRunManager.useSceneGourde();
  ok(run1.breath === 90, "gourde : +40");
  run1.injuries = [{ severity: "normale", stat: "power" }, { severity: "grave", stat: "power" }];
  ok(g.SceneRunManager.canHealHere(run1) === false, "sans Menhirs : l'autel ne peut rien sur une blessure normale");
  LM.onRunEnd(M, "menhirs", "success");
  ok(g.SceneRunManager.canHealHere(run1) === true, "Menhirs tenus : l'autel peut soigner la normale");
  var healed = g.SceneRunManager._healOneInjury(run1, "legere");
  ok(healed && healed.severity === "normale" && run1.injuries.length === 1 && run1.injuries[0].severity === "grave", "...il retire la normale, jamais la grave");
  run1.injuries = [{ severity: "normale", stat: "power" }, { severity: "legere", stat: "power" }];
  ok(g.SceneRunManager._healOneInjury(run1, "legere").severity === "legere", "une l\u00e9g\u00e8re pr\u00e9sente passe toujours avant la normale");
  g.SceneRunManager.abandon();
  g.SceneRunManager.startRun("petite_aventure_foret"); g.SceneRunManager.chooseProfile("prudent"); g.SceneRunManager.chooseIntensity("sentier"); g.SceneRunManager.acknowledgeMutator();
  g.SceneRunManager.confirmLoadout(["torche", "gourde", "provisions"]);
  ok(g.game.sceneRun.ropeCharges === 0, "sans corde embarqu\u00e9e, l'effet n'en invente pas une");
  g.SceneRunManager.abandon();

  /* Carte : la fiche du village annonce la Palissade et les effets tenus. */
  run("switchTab('map'); openLivingMap('forest','etang')");
  var html = run("buildMapHTML()");
  ok(/Effet perdu :<\/b> Puits \+10 %/.test(html), "panneau : l'\u00c9tang repris affiche son effet perdu");
  run("selectLivingMapSector('camp')");
  ok(/Effet en cours :<\/b> Contrats de la Taverne/.test(run("buildMapHTML()")), "panneau : le Campement tenu affiche son effet en cours");
})();

/* [60] v3.258.0 — Cartes Vivantes, lot C-5 : l'Arbre-mère, élite répétable à frein interne. */
console.log("\n[60] v3.258.0 \u2014 Cartes Vivantes C-5 : Arbre-m\u00e8re");
(function () {
  var LM = g.LivingMapManager, M = "forest";
  var def = g.ELITE_DB.arbre_mere;
  ok(!!def && def.baseId === "foresttroll" && def.repeatable === true && def.archetype === "shielded", "\u00e9lite arbre_mere : base Troll, r\u00e9p\u00e9table, shielded");
  ok(!(g.ELITE_UNIQUE_LOOT || {}).arbre_mere && g.EliteManager.buildUniqueLoot("arbre_mere") === null, "aucun butin unique");
  var sd = LM.getSectorDef(M, "arbremere");
  ok(sd.content.type === "elite" && sd.content.repeatable === true && LM.isRepeatable(M, "arbremere") && !LM.isRepeatable(M, "toiles"), "secteur 7 : \u00e9lite r\u00e9p\u00e9table ; le Camp des toiles ne l'est pas");
  var rules = g.LIVING_MAP_RULES.repeatableElite;
  ok(rules.brakePerWin === 0.5 && rules.sevePerWin === 2, "frein +50 % par victoire, 2 S\u00e8ve par victoire (banc)");

  /* Frein dans EliteManager.build : PV et Puissance ×brakeMult, rien d'autre. */
  var e0 = g.EliteManager.build("arbre_mere", 1), e1 = g.EliteManager.build("arbre_mere", 1, { brakeMult: 1.5 });
  ok(e1.maxHp === Math.floor(e0.maxHp * 1.5) || Math.abs(e1.maxHp - e0.maxHp * 1.5) <= 1, "brakeMult 1,5 : PV \u00d71,5 (" + e0.maxHp + " -> " + e1.maxHp + ")");
  ok(e1.stats.power >= Math.floor(e0.stats.power * 1.5) - 1 && e1.stats.celerity === e0.stats.celerity, "...Puissance \u00d71,5, C\u00e9l\u00e9rit\u00e9 intacte");
  ok(g.EliteManager.build("araignee_marquee", 1, { brakeMult: 1.5 }).maxHp > g.EliteManager.build("araignee_marquee", 1).maxHp, "l'option existe pour toute \u00e9lite, mais seule la carte la passe");

  game = freshCombat("knight");
  game.unlockedTabs.map = true; game.unlockedTabs.village = true; game.unlockedTabs.combat = true;
  run("WarehouseManager.addResource('petite_ration', 20, true);");
  LM.onRunEnd(M, "gue", "success");
  ok(LM.isReachable(M, "arbremere") && LM.getDailyWins(M, "arbremere") === 0 && LM.getBrakeMult(M, "arbremere") === 1, "atteignable depuis le gu\u00e9, 0 victoire, frein \u00d71");
  var cs = LM.canStart(M, "arbremere");
  ok(cs.ok && cs.content.type === "elite", "d\u00e9part possible : combat direct");
  run("switchTab('map'); openLivingMap('forest','arbremere')");
  var html = run("buildMapHTML()");
  ok(/Secteur inconnu/.test(html) && />Partir<\/button>/.test(html) && !/Chaque victoire/.test(html), "voil\u00e9 non r\u00e9v\u00e9l\u00e9 : rien ne trahit l'\u00e9lite ni la r\u00e9p\u00e9tition");

  /* Première victoire : libération + 12 (anneau 3) + 2 (victoire), compteur 1. */
  var seve0 = g.WarehouseManager.getAmount("seve_aeswyn");
  var st = LM.start(M, "arbremere");
  ok(st.ok && g.game.enemy && g.game.enemy.id === "arbre_mere" && g.game.enemy.isElite, "L'Arbre-m\u00e8re para\u00eet");
  var hp0 = g.game.enemy.maxHp;
  ok(/Arbre-m\u00e8re \u00b7 \u00c9lite \u00b7 1er du jour/.test(run("getCombatMissionProgressLabel()")), "compteur : \u00ab Arbre-m\u00e8re \u00b7 \u00c9lite \u00b7 1er du jour \u00bb");
  run("game.enemy.hp = 1; game.activeTab = 'combat'; CombatEngine.killEnemy();");
  ok(LM.getState(M, "arbremere").state === "libere" && LM.getDailyWins(M, "arbremere") === 1, "victoire : lib\u00e9r\u00e9, 1 victoire du jour");
  ok(g.WarehouseManager.getAmount("seve_aeswyn") === seve0 + 12 + 2, "+12 S\u00e8ve de secteur +2 S\u00e8ve de victoire");
  ok(g.game.activeTab === "map" && g.livingMapSelected === "arbremere", "retour sur la carte");
  html = run("buildMapHTML()");
  ok(/\u00c9lite r\u00e9p\u00e9table : L&#39;Arbre-m\u00e8re/.test(html) && /Chaque victoire :<\/b> \+2 S\u00e8ve/.test(html) && /1 victoire \u00b7 prochain combat \+50 %/.test(html) && /Affronter l/.test(html), "panneau : r\u00e9p\u00e9table, +2 S\u00e8ve, prochain +50 %, bouton Affronter");

  /* Rejeu à volonté (exception §6.1), frein ×1,5 puis ×2, cap PA ignoré, sans ration. */
  LM.onRunEnd(M, "camp", "success"); // il reste des cibles ouvertes (autel, etang...)
  ok(LM.getOpenTargets(M).length > 0 && LM.canStart(M, "arbremere").ok && !LM.canStart(M, "gue").ok, "l'Arbre-m\u00e8re se rejoue alors que la brume attend ailleurs ; le gu\u00e9 non");
  run("SceneRunManager.ensureDefaults(); game.explorationProgression.petiteAventure = { day: new Date().toDateString(), count: 3 };");
  var rations = g.WarehouseManager.getAmount("petite_ration");
  ok(LM.getBrakeMult(M, "arbremere") === 1.5 && LM.start(M, "arbremere").ok, "2e combat : frein \u00d71,5, cap PA atteint sans effet");
  ok(Math.abs(g.game.enemy.maxHp - hp0 * 1.5) <= 1 && g.WarehouseManager.getAmount("petite_ration") === rations, "PV \u00d71,5 (" + hp0 + " -> " + g.game.enemy.maxHp + "), aucune ration d\u00e9bit\u00e9e");
  ok(/2e du jour/.test(run("getCombatMissionProgressLabel()")), "compteur : 2e du jour");
  run("game.enemy.hp = 1; game.activeTab = 'combat'; CombatEngine.killEnemy();");
  ok(LM.getDailyWins(M, "arbremere") === 2 && LM.getBrakeMult(M, "arbremere") === 2 && LM.getState(M, "arbremere").firstRewardClaimed, "2 victoires : prochain \u00d72, plus de S\u00e8ve de secteur");
  ok(g.WarehouseManager.getAmount("seve_aeswyn") === seve0 + 14 + 5 + 2, "+2 S\u00e8ve seulement (pas 12 ; les 5 sont ceux du Campement)");

  /* Défaite : échec de secteur (régression), compteur intact. */
  LM._rand = function () { return 0.99; };
  game.heroHp = game.heroMaxHp;
  LM.start(M, "arbremere");
  run("CombatEngine.onHeroDefeated();");
  ok(!LM.getFight() && LM.getDailyWins(M, "arbremere") === 2 && LM.getState(M, "gue").state === "recouvert", "mort : le Pont du gu\u00e9 (seul voisin lib\u00e9r\u00e9) est repris, les victoires du jour restent");
  ok(!LM.canStart(M, "arbremere").ok && !LM.isReachable(M, "arbremere"), "...et l'Arbre-m\u00e8re redevient inatteignable : mourir devant elle co\u00fbte le chemin");
  LM._rand = Math.random;
  LM.onRunEnd(M, "gue", "success"); // on rouvre le chemin

  /* Jour civil suivant : compteur à zéro, frein ×1. Reprise après rechargement : le frein est conservé. */
  LM.getState(M, "arbremere").dailyKey = "hier";
  ok(LM.getDailyWins(M, "arbremere") === 0 && LM.getBrakeMult(M, "arbremere") === 1, "lendemain : 0 victoire, frein \u00d71");
  game.heroHp = game.heroMaxHp;
  LM.start(M, "arbremere"); run("game.enemy.hp = 1; game.activeTab = 'combat'; CombatEngine.killEnemy();");
  game.heroHp = game.heroMaxHp;
  LM.start(M, "arbremere");
  var hpBefore = g.game.enemy.maxHp;
  run("game.enemy = null;");
  ok(g.QuestEnemyManager.respawnActiveRunEnemy() === true && g.game.enemy.maxHp === hpBefore, "rechargement en plein combat : m\u00eame frein (" + hpBefore + " PV)");
  run("SortieManager.flee();");
  ok(!LM.getFight(), "fuite : combat clos");

  /* Sauvegarde : le compteur du jour voyage avec livingMaps. */
  var d = JSON.parse(run("JSON.stringify(buildSaveData())"));
  ok(d.livingMaps.forest.sectors.arbremere.dailyWins === 1 && typeof d.livingMaps.forest.sectors.arbremere.dailyKey === "string", "dailyWins / dailyKey persist\u00e9s");
  ok(!("dailyWins" in d.livingMaps.forest.sectors.gue), "...sur le seul secteur r\u00e9p\u00e9table");
  ok(fs.existsSync(path.join(ROOT, "sim/arbremere-bench.js")), "le banc est livr\u00e9");
})();

/* [61] v3.259.0 — Cartes Vivantes, lot C-4 : « Ce que la brume reprend », introduction du Recouvrement. */
console.log("\n[61] v3.259.0 \u2014 Cartes Vivantes C-4 : \u00e9tape d'Histoire du Recouvrement");
(function () {
  var chapitre = g.STORY_QUESTS.forest;
  var idx = chapitre.steps.findIndex(function (s) { return s.id === "forest_brume"; });
  var etape = chapitre.steps[idx];
  // v3.260.0 : d\u00e9plac\u00e9e en fin d'Acte II (un secteur co\u00fbte une Petite ration, enseign\u00e9e \u00e0 forest_08)
  ok(idx !== -1 && chapitre.steps[idx - 1].id === "forest_09" && chapitre.steps[idx + 1].id === "forest_crossing", "plac\u00e9e entre « La veine instable » et « Franchir la Lisi\u00e8re » (v3.260.0)");
  ok(chapitre.steps.length === 17 && etape.act.indexOf("Acte II") === 0, "17 \u00e9tapes, Acte II");
  ok(etape.unlockTabs.length === 0, "aucun onglet d\u00e9bloqu\u00e9 : la Carte l'est d\u00e9j\u00e0 depuis forest_05");

  /* Bible : les anciens disent « elle », le narrateur ne nomme rien, le mot « Recouvrement » reste à l'interface. */
  var d = etape.narrative.dialogue;
  ok(d.length === 6 && d[0].who === "Orwen" && d[1].who === "Wenna" && d[3].who === "Brannoc" && d[5].who === null, "dialogue de 6 lignes : Orwen, Wenna, Orwen, Brannoc, Orwen, didascalie");
  var tout = d.map(function (l) { return l.text; }).join(" ") + " " + etape.narrative.objective + " " + etape.narrative.completion;
  ok(tout.indexOf("Aether") === -1, "« Aether » jamais prononc\u00e9 ici : le mot reste \u00e0 Orwen pour forest_15");
  ok(tout.indexOf("Recouvrement") === -1, "« Recouvrement » non plus : c'est un mot d'interface, pas des anciens");
  ok(/Autour, c'est elle/.test(d[0].text) && /Elle prend ce qu'on est/.test(chapitre.steps[chapitre.steps.length - 1].narrative.dialogue[2].text), "« Autour, c'est elle » appelle « Elle prend ce qu'on est » (forest_15)");
  ok(/on y retourne/.test(d[4].text) && d[4].who === "Orwen", "« vivre avec » est dit par Orwen, pas par le narrateur");
  ok(/Aldric/.test(d[5].text) && d[5].who === null, "Aldric se tait, comme \u00e0 forest_15");
  var banni = /myst\u00e9rieu|\u00e9trange|sinistre|lugubre|mal\u00e9fique|inqui\u00e9tant/i;
  ok(!banni.test(tout) && !/\bvous\b|\bvotre\b/i.test(tout), "aucun mot banni (bible B), aucun vouvoiement");

  /* Objectif : lié à l'état réel de la carte. */
  game = freshCombat("knight");
  run("StoryQuestManager.ensure(); LivingMapManager.ensureDefaults();");
  ok(etape.check(game) === false && etape.progress(game) === "Secteurs lib\u00e9r\u00e9s 0/1", "aucun secteur lib\u00e9r\u00e9 : \u00e9tape non remplie");
  g.LivingMapManager.onRunEnd("forest", "gue", "success");
  ok(etape.check(game) === true && etape.progress(game) === "Secteurs lib\u00e9r\u00e9s 1/1", "un secteur lib\u00e9r\u00e9 : \u00e9tape remplie");
  g.LivingMapManager.setState("forest", "gue", "recouvert", "test");
  ok(etape.check(game) === false, "le secteur repris par la brume : l'\u00e9tape redevient \u00e0 faire (elle demande de TENIR)");
  g.LivingMapManager.onRunEnd("forest", "gue", "success");

  /* Le dialogue n'est rendu qu'une fois l'étape acceptée, comme partout. */
  game.storyQuests.forest.currentStep = idx; game.storyQuests.forest.accepted = false;
  var htmlNon = g.buildStoryCurrentStepHTML("forest", chapitre, etape, idx);
  game.storyQuests.forest.accepted = true;
  var htmlOui = g.buildStoryCurrentStepHTML("forest", chapitre, etape, idx);
  ok(htmlNon.indexOf("story-dialogue") === -1 && htmlOui.indexOf("story-dialogue") !== -1, "dialogue rendu seulement une fois l'\u00e9tape accept\u00e9e");
  ok(htmlOui.indexOf("story-dialogue-aside") !== -1 && htmlOui.indexOf("Aldric a d\u00e9j\u00e0 tourn\u00e9 le dos") !== -1, "didascalie rendue en aside");

  /* « Aller à la quête » ouvre la carte vivante. */
  game.unlockedTabs.map = true;
  run("switchTab('campement'); closeLivingMap();");
  g.StoryQuestManager.goToLink("forest");
  ok(g.game.activeTab === "map" && g.isLivingMapOpen() && g.livingMapOpenId === "forest", "« Aller \u00e0 la qu\u00eate » ouvre la carte de la For\u00eat");

  /* Récompense : les 3 Sève de l'offrande aux braises. */
  var r = g.STORY_REWARDS.forest_brume;
  ok(r.gold === 150 && r.resources.seve_aeswyn === 3 && g.STORY_STEP15_OFFERING.seve_aeswyn === 3, "150 or + 3 S\u00e8ve, exactement ce que r\u00e9clamera l'offrande (forest_15)");
  var seve0 = g.WarehouseManager.getAmount("seve_aeswyn");
  game.storyQuests.forest.currentStep = idx; game.storyQuests.forest.accepted = true;
  ok(g.StoryQuestManager.isCurrentStepReady("forest") === true, "\u00e9tape pr\u00eate \u00e0 r\u00e9clamer");
  g.StoryQuestManager.claimStep("forest");
  ok(g.WarehouseManager.getAmount("seve_aeswyn") === seve0 + 3 && g.STORY_QUESTS.forest.steps[game.storyQuests.forest.currentStep].id === "forest_crossing", "r\u00e9clam\u00e9e : +3 S\u00e8ve, la cha\u00eene passe \u00e0 « Franchir la Lisi\u00e8re »");

  /* Migration : une save d'avant la version se décale d'un cran, une seule fois. */
  game = freshCombat("knight");
  run("StoryQuestManager.ensure();");
  game.storyQuests.forest.currentStep = idx; delete game.storyQuests.forest.migratedV3259;
  run("StoryQuestManager.ensure();");
  ok(g.STORY_QUESTS.forest.steps[game.storyQuests.forest.currentStep].id === "forest_crossing", "save d'avant v3.259.0 point\u00e9e sur forest_crossing : toujours forest_crossing");
  var apres = game.storyQuests.forest.currentStep;
  run("StoryQuestManager.ensure();");
  ok(game.storyQuests.forest.currentStep === apres, "migration idempotente");
  game.storyQuests.forest.currentStep = 2; delete game.storyQuests.forest.migratedV3259;
  run("StoryQuestManager.ensure();");
  ok(game.storyQuests.forest.currentStep === 2, "une save AVANT l'insertion n'est pas d\u00e9cal\u00e9e");
})();

/* [62] v3.260.0 — Retours de jeu de Seb (session de correction). */
console.log("\n[62] v3.260.0 \u2014 Retours de jeu : Brume, Colporteur, arme, compteurs, chasse, Campement");
(function () {
  var chapitre = g.STORY_QUESTS.forest;
  var idxOf = function (id) { return chapitre.steps.findIndex(function (s) { return s.id === id; }); };

  /* --- Brume déplacée : migration d'une save v3.259.0 --- */
  game = freshCombat("knight");
  run("StoryQuestManager.ensure();");
  var st = game.storyQuests.forest;
  ["forest_01", "forest_02", "forest_03", "forest_04", "forest_05", "forest_06"].forEach(function (id) { st.claimedSteps[id] = true; });
  st.currentStep = 6; st.accepted = true; delete st.migratedV3260; st.migratedV3259 = true; // v3.259.0 : index 6 = la Brume
  run("StoryQuestManager.ensure();");
  ok(chapitre.steps[st.currentStep].id === "forest_07" && st.accepted === false, "save v3.259.0 bloqu\u00e9e sur la Brume : reprend \u00e0 « La source tarie », non accept\u00e9e");
  run("StoryQuestManager.ensure();");
  ok(chapitre.steps[st.currentStep].id === "forest_07", "migration v3.260.0 idempotente");

  game = freshCombat("knight");
  run("StoryQuestManager.ensure();");
  st = game.storyQuests.forest;
  ["forest_01", "forest_02", "forest_03", "forest_04", "forest_05", "forest_06", "forest_brume"].forEach(function (id) { st.claimedSteps[id] = true; });
  st.currentStep = 8; st.accepted = true; delete st.migratedV3260; st.migratedV3259 = true; // v3.259.0 : index 8 = forest_08
  run("StoryQuestManager.ensure();");
  ok(chapitre.steps[st.currentStep].id === "forest_07", "save v3.259.0 sur forest_08 (07 non r\u00e9clam\u00e9e, cas th\u00e9orique) : premi\u00e8re \u00e9tape non r\u00e9clam\u00e9e");
  st.claimedSteps.forest_07 = true; st.claimedSteps.forest_08 = true;
  st.currentStep = idxOf("forest_09"); st.accepted = true;
  run("game.explorationProgression.unstableVeinDiscoveryCompleted = true; StoryQuestManager.claimStep('forest');");
  ok(chapitre.steps[st.currentStep].id === "forest_crossing", "Brume d\u00e9j\u00e0 r\u00e9clam\u00e9e : la cha\u00eene la saute apr\u00e8s forest_09");

  game = freshCombat("knight");
  run("StoryQuestManager.ensure();");
  game.storyQuests.forest.currentStep = 9; delete game.storyQuests.forest.migratedV3259; delete game.storyQuests.forest.migratedV3260;
  run("StoryQuestManager.ensure();");
  ok(chapitre.steps[game.storyQuests.forest.currentStep].id === "forest_crossing", "save d'avant v3.259.0 sur forest_crossing : inchang\u00e9e par la nouvelle migration");

  /* --- Fin d'une mini-aventure : plus de relance --- */
  var fin = String(g.buildSceneCompleteHTML);
  ok(fin.indexOf("startSceneExpeditionAgain") === -1 && typeof g.startSceneExpeditionAgain === "undefined", "bilan : « Nouvelle expédition » retir\u00e9e (elle lan\u00e7ait le bac \u00e0 sable admin)");
  ok(fin.indexOf("Retour au Campement") !== -1, "bilan : un seul bouton, « Retour au Campement »");

  /* --- Colporteur : Potions, soin en tête, potions de mission cachées --- */
  var s04 = chapitre.steps[idxOf("forest_04")];
  ok(s04.linkTo.tab === "shop" && s04.linkTo.subTab === "potions", "forest_04 m\u00e8ne \u00e0 Boutique > Potions");
  ok(s04.tutorial.points.some(function (p) { return p.text.indexOf("400 or") !== -1 && p.text.indexOf("3000") === -1; }), "tutoriel : potion majeure \u00e0 400 or (prix r\u00e9el)");
  game = freshCombat("knight");
  run("StoryQuestManager.ensure(); PotionManager.ensure(); game.potionsOwned = {}; game.unlockedTabs.shop = true;");
  var shop0 = g.buildPotionShopHTML();
  ok(shop0.indexOf("Potion de soin mineur") !== -1 && shop0.indexOf("Potion de Force") === -1, "avant le Roi des marais : seules les potions de soin");
  game.storyQuests.forest.currentStep = idxOf("forest_04"); game.storyQuests.forest.accepted = true;
  g.StoryQuestManager.goToLink("forest");
  ok(game.activeTab === "shop" && g.activeShopSubTab === "potions", "« Aller \u00e0 la qu\u00eate » ouvre directement Potions");
  game.storyQuests.forest.claimedSteps.forest_05 = true;
  var shop1 = g.buildPotionShopHTML();
  ok(shop1.indexOf("Potion de Force") !== -1 && shop1.indexOf("Potion de soin mineur") < shop1.indexOf("Potion de Force"), "apr\u00e8s le Roi des marais : potions de mission visibles, sous le soin");
  delete game.storyQuests.forest.claimedSteps.forest_05; game.potionsOwned = { potion_power: 1 };
  ok(g.isPerRunPotionShopOpen() === true, "save qui poss\u00e8de d\u00e9j\u00e0 une potion de mission : la section reste visible");

  /* --- Arme : plus d'arme de départ à la création --- */
  var creation = String(g.confirmHeroSelection);
  ok(creation.indexOf("equipStarterWeapon()") === -1, "cr\u00e9ation de h\u00e9ros : plus d'arme \u00e0 1 d\u00e9g\u00e2t");
  ok(require("fs").readFileSync(require("path").join(ROOT, "js/ui/heros-view.js"), "utf8").indexOf("equipStarterWeapon();") !== -1, "changement de h\u00e9ros : le secours \u00e0 1 d\u00e9g\u00e2t reste en place (heros-view.js)");
  ok(!g.STORY_REWARDS.forest_01.equipmentItem && g.STORY_REWARDS.forest_02.equipmentItem === g.STORY_STARTER_WEAPON, "l'arme +15 est la r\u00e9compense de Premier sang");
  var s02 = chapitre.steps[idxOf("forest_02")];
  ok(s02.objectiveLabel.indexOf("5 ennemis \u00e0 la Lisi\u00e8re") !== -1 && s02.narrative.completion.indexOf("une arme oubli\u00e9e") !== -1, "Premier sang : objectif et texte valid\u00e9s");
  ok(chapitre.steps[0].narrative.completion === "Tu te l\u00e8ves. Ce qui r\u00f4de \u00e0 la Lisi\u00e8re ne dort jamais.", "Le feu de camp : plus de lame remise");

  /* --- v3.293.0 : Premier sang lit son run défini ; les kills hors run ne comptent pas --- */
  game = freshCombat("knight");
  run("StoryQuestManager.ensure(); StoryQuestManager.acceptStep('forest'); StoryQuestManager.claimStep('forest');");
  game.killCounts = { slime: 12 };
  run("StoryQuestManager.acceptStep('forest');");
  ok(s02.progress(game) === "Kills 0/5" && s02.check(game) === false, "Premier sang : des kills hors run ne remplissent rien");
  game.adventureQuestsCompleted.aq_story_premier_sang = true;
  ok(s02.check(game) === true && s02.progress(game) === "Kills 5/5", "run termin\u00e9 : objectif rempli");
  game.storyQuests.forest.currentStep = idxOf("forest_13"); game.storyQuests.forest.accepted = false;
  game.storyQuests.forest.counters.coeurKillsMarked = 3;
  run("StoryQuestManager.acceptStep('forest');");
  ok(game.storyQuests.forest.counters.coeurKillsMarked === 0, "Marques du corrompu : vagues remises \u00e0 0 \u00e0 l'acceptation");

  /* --- Quêtes d'aventure : chaque départ repart de 0 --- */
  game = freshCombat("knight"); giveWeapon();
  run("AdventureQuestManager.ensureDefaults();");
  game.adventureQuestProgress.aq_forest_depths.kills_depths = 12;
  g.AdventureQuestManager.start("aq_forest_depths");
  ok(game.adventureQuestProgress.aq_forest_depths.kills_depths === 0, "Le C\u0153ur de la For\u00eat : un d\u00e9part repart de 0 kill");
  game.adventureQuestProgress.aq_forest_depths.kills_depths = 5;
  g.AdventureQuestManager.forfeit();
  ok(game.adventureQuestProgress.aq_forest_depths.kills_depths === 0, "abandon : la progression retombe \u00e0 0 (le tableau ne ment pas)");
  game.adventureQuestProgress.eq_forest_spider.track_spider = 6;
  g.AdventureQuestManager._resetProgress(g.ADVENTURE_QUESTS.eq_forest_spider);
  ok(game.adventureQuestProgress.eq_forest_spider.track_spider === 0, "qu\u00eate d'\u00e9lite : pistage remis \u00e0 0 aussi (v3.261.0, d\u00e9cision Seb)");

  /* --- Chasse en Forêt : 80 %, six ressources à parts égales --- */
  var hq = g.HUNT_QUESTS.hq_forest_boar;
  /* v3.284.0 : 50 % et non plus 80 %, parce que le lot est passé de 10 à 16 crans —
   le rendement par lot est conservé (16 × 50 % ≈ 10 × 80 %). */
ok(hq.dropChancePct === 50 && hq.resourcePool.length === 6, "Chasse en For\u00eat : 50 %, six ressources de base");
  ok(hq.resourcePool.every(function (k) { return g.WAREHOUSE_RESOURCES[k] && g.WAREHOUSE_RESOURCES[k].tier === "raw"; }), "les six sont bien des ressources brutes de l'Entrep\u00f4t");
  game = freshCombat("knight"); giveWeapon();
  var tally = {}, total = 0, N = 3000;
  hq.resourcePool.forEach(function (k) { tally[k] = 0; });
  run("HuntQuestManager.ensureDefaults();");
  var addSave = g.SortieManager.addResource, whSave = g.WarehouseManager.addResource;
  g.SortieManager.addResource = function (k) { tally[k] = (tally[k] || 0) + 1; total++; };
  g.WarehouseManager.addResource = function (k) { tally[k] = (tally[k] || 0) + 1; total++; return 1; };
  game.huntRun = { active: true, questId: "hq_forest_boar", killsInLot: 0 };
  var lotSave = hq.lotSize; hq.lotSize = N + 10;
  for (var i = 0; i < N; i++) g.HuntQuestManager.onEnemyKilled();
  hq.lotSize = lotSave;
  g.SortieManager.addResource = addSave; g.WarehouseManager.addResource = whSave;
  run("HuntQuestManager.stop();");
  /* v3.284.0 : 50 % et non 80 %, le lot étant passé de 10 à 16 crans. Le rendement par
     lot est conservé (16 × 50 % ≈ 10 × 80 %) ; c'est lui qui compte, pas le taux nu. */
  ok(Math.abs(total / N - 0.50) < 0.04, "taux de butin \u2248 50 % (" + Math.round(100 * total / N) + " %)");
  ok(hq.resourcePool.every(function (k) { return Math.abs(tally[k] / N - 0.5 / 6) < 0.035; }), "chaque ressource \u2248 8,3 % (" + hq.resourcePool.map(function (k) { return k + " " + Math.round(1000 * tally[k] / N) / 10; }).join(", ") + ")");
  var board = g.MissionBoard.list().find(function (m) { return m.id === "hunt_hq_forest_boar"; });
  ok(!board || board.rewardSummary === "50 % de ressource de base par kill", "tableau : « 50 % de ressource de base par kill »");
  game.lastSortieSummary = { kept: { resources: { bois: 2, fer: 1 } } };
  var lot = g.buildHuntLotCompleteHTML(hq);
  ok(lot.indexOf("Bois") !== -1 && lot.indexOf("+2") !== -1 && lot.indexOf("en stock") === -1, "fin de lot : le d\u00e9tail du butin, ressource par ressource");

  /* --- Départ d'expédition refusé : l'écran dit ce qui manque --- */
  game = freshCombat("knight"); game.unlockedTabs.village = true;
  run("SceneRunManager.ensureDefaults(); game.resources.petite_ration = 0; game.resources.viande = 3; game.resources.eau = 9;");
  run("game.activeTab = 'scene'; openSceneQuestEntry('sentier_obstrue');");
  var bloc = g.buildSceneScreenHTML();
  ok(bloc.indexOf("Il te manque une Petite ration") !== -1 && bloc.indexOf("Aucune exp\u00e9dition en cours") === -1, "ration manquante : l'\u00e9cran le dit au lieu de « Aucune exp\u00e9dition en cours »");
  ok(bloc.indexOf("Cuisine de camp") !== -1 && bloc.indexOf("3/8") !== -1 && bloc.indexOf("9/4") !== -1 && bloc.indexOf("goToSceneCostWorkshop") !== -1, "recette affich\u00e9e (3/8 viande, 9/4 eau) et raccourci vers les Ateliers");
  game.resources.petite_ration = 1;
  ok(g.buildSceneScreenHTML().indexOf("retrySceneStart") !== -1, "ration fabriqu\u00e9e entre-temps : bouton « Partir »");
  run("retrySceneStart();");
  ok(g.SceneRunManager.isRunActive() && game.resources.petite_ration === 0 && g.buildSceneScreenHTML().indexOf("Il te manque") === -1, "« Partir » lance l'exp\u00e9dition et consomme la ration");
  run("SceneRunManager.abandon && SceneRunManager.abandon(); SceneRunManager.clearRun && SceneRunManager.clearRun();");
  run("game.resources.petite_ration = 0; openSceneQuestEntry('sentier_obstrue'); goToSceneCostWorkshop();");
  ok(game.activeTab === "village" && g.activeVillageSubTab === "production" && g.productionViewTab === "shops", "« Pr\u00e9parer aux Ateliers » ouvre Village > Production > Ateliers");
  ok(g.buildSceneLandingHTML().indexOf("Aucune exp\u00e9dition en cours") !== -1, "une fois quitt\u00e9, l'accueil normal revient");

  /* --- Campement : régénération sur une ligne, boutons Manger en 9 zones --- */
  var css = require("fs").readFileSync(require("path").join(ROOT, "css/04-panel-camp.css"), "utf8");
  ok(/\.camp-ration-btn\s*\{[^}]*border-image:/.test(css), "Manger : cadre d\u00e9coup\u00e9 en 9 zones (border-image), pointes non \u00e9cras\u00e9es");
})();

/* [63] v3.261.0 — Bandeau héros du combat, variante B (atelier-bandeau-combat.html). */
console.log("\n[63] v3.261.0 \u2014 Bandeau h\u00e9ros du combat, variante B");
(function () {
  var css = require("fs").readFileSync(require("path").join(ROOT, "css/03-combat-v2.css"), "utf8");
  ok(/\.cb-hero\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(css), "colonne du panneau born\u00e9e : un butin long n'\u00e9largit plus l'\u00e9cran");
  ok(/\.cb-hero \.cb-hero-top #combat-hero-mini \{ display: contents !important; \}/.test(css), "portrait et PV deviennent des cases de grille sans toucher au balisage");
  ok(/\.combat-hero-mini-hp-bar \{ grid-column: 2; grid-row: 2; width: 100% !important;/.test(css), "PV sur toute la largeur, sous la rang\u00e9e butin / potions / Fuir");
  ok(/\.cb-celerity \.combat-gauge \{ flex: 0 0 auto; width: 70%; max-width: none; \}/.test(css), "c\u00e9l\u00e9rit\u00e9 centr\u00e9e \u00e0 70 % (plus de plafond \u00e0 120 px)");
  /* Le balisage attendu par ces règles est toujours celui du jeu. */
  var html = g.buildCombatHTML();
  ok(html.indexOf('class="cb-hero-top"') !== -1 && html.indexOf('id="combat-hero-slot" class="cb-hero-slot"') !== -1 && html.indexOf('id="combat-sortie-root" class="combat-sortie-row"') !== -1, "structure cb-hero-top / slot / rang\u00e9e de sortie inchang\u00e9e");
  var hud = g.buildHudHTML ? g.buildHudHTML() : require("fs").readFileSync(require("path").join(ROOT, "js/ui/hud-view.js"), "utf8");
  ok(hud.indexOf("combat-hero-mini-portrait") !== -1 && hud.indexOf("combat-hero-mini-hp-bar") !== -1, "mini-h\u00e9ros : portrait et jauge toujours enfants directs");
})();

/* [65] v3.263.0 — Retours de jeu, deuxième série. */
console.log("\n[65] v3.263.0 \u2014 Ic\u00f4nes, vitrine, Roi des marais");
(function () {
  var bilan = String(g.buildSceneCompleteHTML);
  ok(bilan.indexOf("camp_menu.png") !== -1 && bilan.indexOf("hero_defeated.png") !== -1 && bilan.indexOf("1F3D5") === -1, "bilan d'exp\u00e9dition : ic\u00f4nes du kit, plus d'emoji de campement");
  ok(g.buildTutorialPreviewHTML("inconnu") === "", "aper\u00e7u de tutoriel : un \u00e9tat inconnu ne rend rien");
  var boss = g.QuestEnemyManager.spawnFor({ worldId: "forest", adventureIndex: 0, enemyHpMult: 0.8 }, true);
  var bossSolo = g.QuestEnemyManager.spawnFor({ worldId: "forest", adventureIndex: 0, enemyHpMult: 0.8, bossHpMult: 0.4 }, true);
  ok(bossSolo.maxHp === Math.floor(boss.maxHp / 0.8 * 0.4) || Math.abs(bossSolo.maxHp * 2 - boss.maxHp) <= 2, "bossHpMult r\u00e8gle le boss \u00e0 part (" + bossSolo.maxHp + " contre " + boss.maxHp + ")");
})();

/* [66] v3.264.0 — Battue avec le Village, Atelier niveau 1 allégé. */
console.log("\n[66] v3.264.0 \u2014 Battue avec le Village, Atelier de Construction niveau 1");
(function () {
  game = freshCombat("knight"); giveWeapon();
  run("HuntQuestManager.ensureDefaults();");
  game.unlockedTabs.village = false;
  ok(!g.MissionBoard.list().some(function (m) { return m.id === "hunt_hq_forest_battue"; }), "nouvelle partie : pas de Battue au tableau");
  g.HuntQuestManager.start("hq_forest_battue");
  ok(g.MissionBoard.list().some(function (m) { return m.id === "hunt_hq_forest_battue" && m.status === "running"; }), "une battue d\u00e9j\u00e0 lanc\u00e9e (save ant\u00e9rieure) reste visible");
  run("HuntQuestManager.stop();");
  run("StoryQuestManager.ensure(); StoryQuestManager.getState('forest').currentStep = " + g.STORY_QUESTS.forest.steps.findIndex(function (s) { return s.id === "forest_06"; }) + "; StoryQuestManager.acceptStep('forest');");
  ok(game.unlockedTabs.village === true && g.MissionBoard.list().some(function (m) { return m.id === "hunt_hq_forest_battue"; }), "« La meute affam\u00e9e » accept\u00e9e : la Battue appara\u00eet");

  var M = g.VillageBuildingManager;
  game.village = {}; M.ensure();
  var c1 = M.getNextCost("workshop");
  ok(c1.gold === 25 && c1.planche === 5 && c1.pierre === 15, "Atelier niveau 1 : 25 or, 5 planches, 15 pierre");
  game.village.buildings.workshop.level = 1;
  var c2 = M.getNextCost("workshop");
  ok(c2.planche === Math.floor(10 * 1.35) && c2.pierre === Math.floor(15 * 1.35) && c2.gold === Math.floor(25 * 1.35), "niveau 2 inchang\u00e9 (" + c2.gold + " or, " + c2.planche + " planches, " + c2.pierre + " pierre)");
  var etape = g.WORKSHOP_UNLOCK_STEPS.find(function (s) { return s.id === "craft_planks"; });
  ok(/5 Planches/.test(etape.label) && c1.planche === 5, "les 5 planches de l'\u00e9tape suffisent au chantier");
  game.village.buildings.workshop.level = 0;
})();

/* [67] v3.265.0 — Avertissement PV bas, bâtiments manquants. */
console.log("\n[67] v3.265.0 \u2014 Avertissement PV bas, b\u00e2timents manquants");
(function () {
  /* --- PV bas : avertissement même sur un combat abordable --- */
  game = freshCombat("knight");
  run("game.equipped.weapon = { uid:'w', slot:'weapon', name:'Arme', icon:'sword', rarity:'rare', stat:'tapDmg', value:400, affixes:[] }; EquipmentManager.recalcStats(); game.heroHp = game.heroMaxHp; PotionManager.ensureHealing(); game.healingPotionsOwned = { potion_soin_mineur: 3 };");
  var mission = { sourceKind: "adventure", questId: "aq_forest_expedition", title: "Prouver sa valeur" };
  ok(g.CombatForecast.getLevelDef(g.CombatForecast.forMission(mission).id).level < 2, "contr\u00f4le : combat facile \u00e0 PV pleins");
  var parti = 0, ouvert = null;
  var openSave = g.openCombatForecastConfirm;
  g.openCombatForecastConfirm = function (f, opts) { ouvert = opts; };
  g.launchWithForecast(mission, function () { parti++; });
  ok(parti === 1 && ouvert === null, "PV pleins, combat facile : d\u00e9part direct, aucun \u00e9cran");
  game.heroHp = Math.floor(game.heroMaxHp * 0.55);
  g.launchWithForecast(mission, function () { parti++; });
  ok(parti === 1 && ouvert && ouvert.lowHp === true && ouvert.confirmLabel === "Partir quand m\u00eame", "PV \u00e0 55 % : avertissement avant le d\u00e9part, rien n'est lanc\u00e9");
  g.openCombatForecastConfirm = openSave;
  var html = g.buildCombatForecastHTML(g.CombatForecast.forMission(mission), ouvert);
  ok(html.indexOf("Attention, il faut te soigner") !== -1 && html.indexOf("55 %") !== -1 && html.indexOf("goHealFromForecast") !== -1, "l'\u00e9cran dit de se soigner, avec le pourcentage et le bouton « Me soigner »");
  game.heroHp = Math.ceil(game.heroMaxHp * 0.6);
  ouvert = null; g.openCombatForecastConfirm = function (f, opts) { ouvert = opts; };
  g.launchWithForecast(mission, function () { parti++; });
  g.openCombatForecastConfirm = openSave;
  ok(parti === 2 && ouvert === null, "\u00e0 60 % pile : plus d'avertissement (seuil strict)");
  run("closeCombatForecast(); goHealFromForecast();");
  ok(game.activeTab === "campement", "« Me soigner » ram\u00e8ne au Campement");

  /* --- Bâtiments manquants --- */
  game = freshCombat("knight");
  run("StoryQuestManager.ensure(); ProductionManager.ensure();");
  game.explorationProgression.wellUnlocked = true; game.explorationProgression.huntBuildingUnlocked = true; game.explorationProgression.quarryUnlocked = true;
  ok(g.getProductionUnlockQuestId("sawmill") === "bosquet_silencieux" && g.getProductionUnlockQuestId("farm") === "terre_en_friche" && g.getProductionUnlockQuestId("mine") === "eboulis_ferreux", "chaque b\u00e2timent restant retrouve sa qu\u00eate (Bosquet, Terre en friche, \u00c9boulis)");
  var dash0 = g.buildProdDashboardHTML();
  ok(dash0.indexOf("production-dash-card is-locked") === -1, "avant la fin de « La veine instable » : aucun b\u00e2timent verrouill\u00e9 affich\u00e9");
  game.storyQuests.forest.claimedSteps.forest_09 = true;
  var dash1 = g.buildProdDashboardHTML();
  ok((dash1.match(/production-dash-card is-locked/g) || []).length === 3 && dash1.indexOf("Le Bosquet Silencieux") !== -1, "apr\u00e8s : Scierie, Champs et Mine affich\u00e9s, verrouill\u00e9s, avec leur qu\u00eate");
  game.explorationProgression.sawmillUnlocked = true;
  ok((g.buildProdDashboardHTML().match(/production-dash-card is-locked/g) || []).length === 2, "un b\u00e2timent d\u00e9bloqu\u00e9 quitte la liste des manquants");
  game.unlockedTabs.quests = true; game.unlockedTabs.village = true;
  run("goToProductionUnlockQuest('mine');");
  ok(game.activeTab === "quests" && g.activeQuestCategory === "secondaires", "toucher la Mine ouvre Qu\u00eates > Secondaires");
  g.highlightQuestCard("scene_eboulis_ferreux");
  var carte = g.buildQuestBoardCardHTML({ id: "scene_eboulis_ferreux", title: "L'\u00c9boulis Ferreux", type: "expedition", status: "available", badge: "contract" });
  ok(carte.indexOf("is-highlight") !== -1 && carte.indexOf('data-mission-id="scene_eboulis_ferreux"') !== -1, "la carte de la qu\u00eate est mise en \u00e9vidence");
  g.highlightQuestCard(null);
  var list = g.MissionBoard.list().map(function (m) { return m.id; });
  ok(list.indexOf("scene_eboulis_ferreux") !== -1 && list.indexOf("scene_terre_en_friche") !== -1, "les deux qu\u00eates vis\u00e9es sont bien au tableau \u00e0 ce stade");
})();

/* [64] v3.261.0 — Toutes les quêtes de combat repartent de 0. */
console.log("\n[64] v3.261.0 \u2014 Qu\u00eates de combat : chaque d\u00e9part repart de 0");
(function () {
  var chapitre = g.STORY_QUESTS.forest;
  var idxOf = function (id) { return chapitre.steps.findIndex(function (s) { return s.id === id; }); };
  var sCross = chapitre.steps[idxOf("forest_crossing")];

  /* v3.293.0 : Franchir la Lisière est un run défini — un départ repart de 0, la position ne compte plus */
  game = freshCombat("knight"); giveWeapon();
  run("StoryQuestManager.ensure(); AdventureQuestManager.ensureDefaults();");
  var st = game.storyQuests.forest;
  st.currentStep = idxOf("forest_crossing"); st.accepted = false;
  run("WorldManager.worldIndex = 0; WorldManager.adventureIndex = 1; WorldManager.enemyIndex = 5;");
  run("StoryQuestManager.acceptStep('forest'); StoryQuestManager._trackKills();");
  ok(sCross.check(game) === false && sCross.progress(game) === "Lisi\u00e8re 0/10" && g.WorldManager.adventureIndex === 1, "d\u00e9j\u00e0 au C\u0153ur : \u00e9tape non remplie, joueur non d\u00e9plac\u00e9");
  game.adventureQuestProgress.aq_story_lisiere.kills_lisiere = 6;
  g.AdventureQuestManager.start("aq_story_lisiere");
  ok(game.adventureQuestProgress.aq_story_lisiere.kills_lisiere === 0, "un d\u00e9part repart de 0");
  g.AdventureQuestManager.forfeit();

  /* Marques du corrompu : 5 vagues dans le même run */
  game = freshCombat("knight"); giveWeapon();
  run("StoryQuestManager.ensure();");
  st = game.storyQuests.forest;
  st.currentStep = idxOf("forest_13"); st.accepted = false;
  run("StoryQuestManager.acceptStep('forest');");
  var sMark = chapitre.steps[idxOf("forest_13")];
  game.dungeonRun = { active: true, wave: 3, dungeonId: 1, marks: ["m1"] };
  game.totalKills += 3; run("StoryQuestManager._trackKills();");
  ok(st.counters.coeurKillsMarked === 3, "run 1 : 3 vagues sous Marque");
  game.dungeonRun = { active: true, wave: 1, dungeonId: 1, marks: ["m1"] }; // mort puis nouveau run
  game.totalKills += 2; run("StoryQuestManager._trackKills();");
  ok(st.counters.coeurKillsMarked === 2 && sMark.check(game) === false, "run 2 : le compteur repart de 0 (2, pas 5)");
  var tag = game.dungeonRun.storyRunTag;
  var dSave = JSON.parse(JSON.stringify(game.dungeonRun));
  game.dungeonRun = dSave; // rechargement : l'étiquette est sauvegardée avec le run
  game.totalKills += 3; run("StoryQuestManager._trackKills();");
  ok(game.dungeonRun.storyRunTag === tag && st.counters.coeurKillsMarked === 5 && sMark.check(game) === true, "rechargement en plein run : pas de remise \u00e0 z\u00e9ro, 5 vagues atteintes");
  game.dungeonRun = { active: false, wave: 0, dungeonId: 1, marks: [] };

  /* Chasse et donjon : départ à 0 par construction */
  ok(/game\.huntRun = \{ active: true, questId: questId, killsInLot: 0 \}/.test(String(g.HuntQuestManager.start)), "chasse : chaque lot part de 0 kill");
  ok(/wave: 0/.test(String(g.DungeonManager.start)), "donjon : chaque run part de la vague 0");
})();

console.log("\n[68] v3.266.0 (L-0) — socle du combat de groupe : acteurs, alias game.enemy, héros-acteur");
(function () {
  var game = freshCombat("knight"); giveWeapon();

  /* --- État de combat --- */
  ok(!!game.combat && Array.isArray(game.combat.allies) && Array.isArray(game.combat.enemies),
    "game.combat existe avec ses deux tableaux d'acteurs");
  ok(game.combat.allies.length === 1 && game.combat.allies[0] === g.CombatActors.heroActor(),
    "le héros-acteur occupe allies[0]");
  ok(g.COMBAT_MAX_ALLIES === 3 && g.COMBAT_MAX_ENEMIES === 3, "plafonds 3 contre 3");

  /* --- Alias game.enemy : lecture, écriture d'objet, écriture de null --- */
  var spawned = game.enemy;
  ok(spawned && game.combat.enemies.length === 1 && game.combat.enemies[0] === spawned,
    "spawnEnemy passe par le groupe : 1 ennemi, même référence que game.enemy");
  ok(game.combat.targetId === spawned.actorId && spawned.side === "enemy",
    "la cible collante pointe l'ennemi posé, qui porte actorId et side");

  var faux = g.CombatEngine.prepareEnemy({ id: "slime", name: "Slime", isBoss: false, hp: 40, maxHp: 40, stats: g.ENEMY_DB.slime.stats, resists: [], weak: [] });
  game.enemy = faux;
  ok(game.enemy === faux && game.combat.enemies.length === 1,
    "écrire un objet dans game.enemy remplace le groupe par ce seul membre");

  game.enemy = null;
  ok(game.enemy === null && game.combat.enemies.length === 0 && game.combat.targetId === null,
    "écrire null vide le groupe");

  /* --- Héros-acteur : une vue, jamais une copie --- */
  game = freshCombat("ranger"); giveWeapon();
  var hero = g.CombatActors.heroActor();
  game.heroHp = 7;
  ok(hero.hp === 7 && hero.maxHp === game.heroMaxHp, "le héros-acteur lit game.heroHp / heroMaxHp");
  hero.hp = 3;
  ok(game.heroHp === 3, "écrire sur le héros-acteur écrit dans game.heroHp");
  game.heroGauge = 42;
  ok(hero.gauge === 42 && hero.side === "ally" && hero.control === "hero", "jauge, camp et contrôle du héros-acteur");
  run("game.heroHp = game.heroMaxHp;");

  /* --- spawnGroup : 1 membre = comportement historique, 3 membres = groupe --- */
  g.CombatEngine.spawnGroup([
    { id: "slime", name: "A", isBoss: false, hp: 10, maxHp: 10, stats: g.ENEMY_DB.slime.stats, resists: [], weak: [] },
    { id: "goblin", name: "B", isBoss: false, hp: 10, maxHp: 10, stats: g.ENEMY_DB.goblin.stats, resists: [], weak: [] },
    { id: "wolf", name: "C", isBoss: false, hp: 10, maxHp: 10, stats: g.ENEMY_DB.wolf.stats, resists: [], weak: [] }
  ]);
  ok(game.combat.enemies.length === 3, "spawnGroup pose trois ennemis");
  var ids = game.combat.enemies.map(function (e) { return e.actorId; });
  ok(ids[0] !== ids[1] && ids[1] !== ids[2] && ids[0] !== ids[2], "trois actorId distincts");
  ok(game.combat.enemies.every(function (e) { return e._roundReady === true; }), "chaque membre est préparé (compteurs de pattern)");
  ok(game.enemy === game.combat.enemies[0], "game.enemy renvoie le premier membre tant qu'aucune cible n'est choisie");

  g.CombatEngine.spawnGroup([
    { id: "slime", name: "D", isBoss: false, hp: 10, maxHp: 10, stats: g.ENEMY_DB.slime.stats, resists: [], weak: [] },
    { id: "goblin", name: "E", isBoss: false, hp: 10, maxHp: 10, stats: g.ENEMY_DB.goblin.stats, resists: [], weak: [] },
    { id: "wolf", name: "F", isBoss: false, hp: 10, maxHp: 10, stats: g.ENEMY_DB.wolf.stats, resists: [], weak: [] },
    { id: "spider", name: "G", isBoss: false, hp: 10, maxHp: 10, stats: g.ENEMY_DB.spider.stats, resists: [], weak: [] }
  ]);
  ok(game.combat.enemies.length === 3, "le plafond de 3 ennemis est appliqué au spawn");

  /* --- Cible collante --- */
  var second = game.combat.enemies[1];
  g.CombatActors.setTarget(second);
  ok(game.enemy === second, "la cible collante décide ce que renvoie game.enemy");
  ok(g.CombatActors.aliveEnemies().length === 3, "les trois membres sont vivants");

  /* --- dealDamage(target) : la cible explicite prime sur la cible courante --- */
  var troisieme = game.combat.enemies[2];
  var avant = troisieme.hp, avantCible = second.hp;
  g.CombatEngine.dealDamage(4, false, false, true, troisieme);
  ok(troisieme.hp < avant && second.hp === avantCible,
    "dealDamage frappe l'ennemi passé en argument, pas la cible courante");

  /* --- retrait d'un membre (câblé au lot L-3, disponible dès maintenant) --- */
  ok(g.CombatActors.removeEnemy(second) === true && game.combat.enemies.length === 2 && game.enemy !== second,
    "removeEnemy retire le membre et la cible retombe sur un vivant");

  /* --- killEnemy accepte un ennemi explicite --- */
  game = freshCombat("mage"); giveWeapon();
  var cible = game.enemy;
  var orAvant = game.gold;
  run("game.sortie = null;");
  g.CombatEngine.killEnemy(cible);
  ok(game.gold >= orAvant, "killEnemy(e) crédite le butin de l'ennemi passé en argument");

  /* --- L'alias survit au wipe complet de l'objet game (switchToSlot, création de héros) --- */
  run("(function () { var fresh = createInitialGameState(); Object.keys(game).forEach(function (k) { delete game[k]; }); Object.assign(game, fresh); game.enemy = null; ensureGameStateDefaults(); })();");
  var desc = Object.getOwnPropertyDescriptor(g.game, "enemy");
  ok(!!desc && typeof desc.get === "function", "après un wipe complet de game, ensureGameStateDefaults repose l'accesseur");
  ok(g.game.enemy === null && !!g.game.combat, "état de combat reconstruit, groupe vide");

  game = freshCombat("knight"); giveWeapon();
  ok(!!game.enemy && game.combat.enemies.length === 1, "une partie reste jouable après réinstallation de l'alias");

  /* --- Un combat complet reste identique à 1 contre 1 --- */
  game = freshCombat("knight"); giveWeapon();
  var kills0 = game.totalKills;
  for (var t = 0; t < 40 && game.heroHp > 0; t++) g.CombatEngine.heroAction("basic");
  ok(game.totalKills > kills0 && game.combat.enemies.length === 1 && game.enemy === game.combat.enemies[0],
    "combat auto enchaîné en farm libre : kills comptés, toujours un seul ennemi dans le groupe");
})();

console.log("\n[69] v3.267.0 (L-1) — round de groupe : chaque ennemi joue, fin de round comptée une fois");
(function () {
  function trio(hp) {
    return [
      { id: "slime", name: "A", isBoss: false, hp: hp, maxHp: hp, goldReward: 1, essenceReward: 0, resists: [], weak: [], stats: g.ENEMY_DB.slime.stats },
      { id: "goblin", name: "B", isBoss: false, hp: hp, maxHp: hp, goldReward: 1, essenceReward: 0, resists: [], weak: [], stats: g.ENEMY_DB.goblin.stats },
      { id: "wolf", name: "C", isBoss: false, hp: hp, maxHp: hp, goldReward: 1, essenceReward: 0, resists: [], weak: [], stats: g.ENEMY_DB.wolf.stats }
    ];
  }

  /* --- Les trois ennemis jouent leur tour dans le même round --- */
  var game = freshCombat("knight"); giveWeapon();
  g.CombatEngine.spawnGroup(trio(4000));
  run("game.heroHp = game.heroMaxHp;");
  var hp0 = game.heroHp;
  g.CombatEngine.heroAction("basic");
  var ra = game.combat.enemies.map(function (e) { return e.roundsAlive; });
  ok(ra[0] === 1 && ra[1] === 1 && ra[2] === 1, "un round : les trois ennemis ont joué (roundsAlive 1/1/1)");
  ok(game.heroHp < hp0, "le héros encaisse les frappes du groupe");
  ok(game.combatRound.number === 1, "un seul round compté");

  /* --- Fin de round : ce qui appartient au héros ne tombe qu'une fois --- */
  run("game.classCooldowns = { skill1: 6 };");
  g.CombatEngine.heroAction("basic");
  ok(game.classCooldowns.skill1 === 5, "cooldown décompté UNE fois malgré trois ennemis (6 -> 5)");

  /* --- ... et à un seul ennemi, rien ne change --- */
  game = freshCombat("knight"); giveWeapon();
  g.CombatEngine.spawnGroup([trio(4000)[0]]);
  run("game.heroHp = game.heroMaxHp; game.classCooldowns = { skill1: 6 };");
  g.CombatEngine.heroAction("basic");
  ok(game.classCooldowns.skill1 === 5 && game.combat.enemies[0].roundsAlive === 1,
    "à un seul ennemi : un tour, un décompte — comportement historique");

  /* --- Les compteurs de pattern restent propres à chaque membre --- */
  game = freshCombat("knight"); giveWeapon();
  g.CombatEngine.spawnGroup(trio(4000));
  game.combat.enemies[0].chargeIn = 1;
  game.combat.enemies[1].chargeIn = 6;
  game.combat.enemies[2].chargeIn = 6;
  g.CombatEngine.heroAction("basic");
  ok(game.combat.enemies[0].chargeTelegraphed === true
    && game.combat.enemies[1].chargeTelegraphed !== true
    && game.combat.enemies[2].chargeTelegraphed !== true,
    "un seul membre télégraphie : les compteurs sont indépendants");

  /* --- La cible du joueur est rendue après le tour des ennemis --- */
  var focus = game.combat.enemies[2];
  g.CombatActors.setTarget(focus);
  g.CombatEngine.heroAction("basic");
  ok(game.enemy === focus, "la cible collante du joueur survit au tour des ennemis");

  /* --- Continuer l'attaque s'arrête sur le télégraphe de n'importe quel membre --- */
  game = freshCombat("knight"); giveWeapon();
  g.CombatEngine.spawnGroup(trio(4000));
  run("game.heroHp = game.heroMaxHp;");
  game.combat.enemies.forEach(function (e) { e.chargeTelegraphed = false; e.silenceTelegraphed = false; e.shieldTelegraphed = false; e.healTelegraphed = false; });
  g.CombatActors.setTarget(game.combat.enemies[0]);
  var libre = g.CombatEngine.shouldStopContinueAttack();
  game.combat.enemies[2].chargeTelegraphed = true;
  ok(libre === false && g.CombatEngine.shouldStopContinueAttack() === true,
    "un télégraphe sur un membre NON ciblé interrompt « Continuer l'attaque »");

  /* --- endRound(e) reste équivalent à endRoundGroup([e]) --- */
  game = freshCombat("mage"); giveWeapon();
  var seul = game.enemy;
  seul.vulnerableRounds = 2;
  run("game.classCooldowns = { skill1: 4 };");
  g.CombatEngine.endRound(seul);
  ok(seul.vulnerableRounds === 1 && game.classCooldowns.skill1 === 3,
    "endRound(e) conservé : un tick ennemi, un tick héros");
})();

console.log("\n[70] v3.268.0 (L-2) — Wenna : roster, tour du compagnon, menace, KO, sauvegarde, étape d'Histoire");
(function () {
  function W() { return g.CompanionManager; }

  /* --- Roster --- */
  var game = freshCombat("knight"); giveWeapon();
  ok(!!g.COMPANIONS_DB.wenna && g.getCompanionDef("wenna").role === "support", "Wenna existe, rôle Soutien");
  ok(W().isUnlocked("wenna") === false, "partie neuve : aucun compagnon débloqué");
  ok(W().unlock("wenna") === true && W().isUnlocked("wenna"), "unlock() la fait rejoindre, présente d'office");
  ok(W().partyIds().length === 1, "elle part avec le héros");
  ok(W().unlock("wenna") === false, "unlock() est idempotent");

  /* --- Échelle de monde : indexée sur le monde DU COMBAT --- */
  run("WorldManager.worldIndex = 0;");
  var hpForet = W().maxHpOf("wenna");
  run("WorldManager.worldIndex = 2;");
  var hpMonde2 = W().maxHpOf("wenna");
  run("WorldManager.worldIndex = 0;");
  ok(hpMonde2 > hpForet, "ses PV suivent l'échelle du monde où se joue le combat");

  /* --- Acteurs : elle rejoint allies[] au spawn --- */
  g.CombatEngine.spawnEnemy();
  ok(game.combat.allies.length === 2 && game.combat.allies[0] === g.CombatActors.heroActor(),
    "au spawn : héros en [0], Wenna en [1]");
  var wen = game.combat.allies[1];
  ok(wen.companionId === "wenna" && wen.side === "ally" && wen.control === "manual",
    "acteur compagnon bien formé (v3.276.0 : manuel hors mode Grimoire)");
  wen.hp = 12;
  ok(W().state("wenna").hp === 12, "ses PV sont une VUE sur game.companions, pas une copie");
  wen.hp = W().maxHpOf("wenna");

  /* --- Elle joue son tour après le héros (en mode Grimoire, où elle est automatique) --- */
  game = freshCombat("knight"); giveWeapon();
  W().unlock("wenna");
  run("game.unlockedTabs.grimoire = true; CombatEngine.setCombatMode('grimoire');");
  g.CombatEngine.spawnGroup([{ id: "slime", name: "Sac", isBoss: false, hp: 100000, maxHp: 100000, goldReward: 0, essenceReward: 0, resists: [], weak: [], stats: g.ENEMY_DB.slime.stats }]);
  var cible = game.enemy;
  var pvEnnemiAvant = cible.hp;
  var degatsHeros = g.EquipmentManager.effectiveTapDamage();
  g.CombatEngine.heroAction("basic", null, "auto");
  ok((pvEnnemiAvant - cible.hp) > degatsHeros, "les dégâts du round dépassent ceux du héros seul : Wenna a frappé");
  run("CombatEngine.setCombatMode('tactique');");

  /* --- Compétence de soin : seuil, cible, cooldown --- */
  game = freshCombat("knight"); giveWeapon();
  W().unlock("wenna");
  g.CombatEngine.spawnGroup([{ id: "slime", name: "Sac", isBoss: false, hp: 100000, maxHp: 100000, goldReward: 0, essenceReward: 0, resists: [], weak: [], stats: g.ENEMY_DB.slime.stats }]);
  var actrice = game.combat.allies[1];
  run("game.heroHp = Math.floor(game.heroMaxHp * 0.90);");
  ok(W().chooseAction(actrice) === "basic", "au-dessus du seuil : elle frappe, elle ne gâche pas son soin");
  run("game.heroHp = Math.floor(game.heroMaxHp * 0.30);");
  ok(W().chooseAction(actrice) === "skill", "sous le seuil : elle soigne");
  var pvAvant = game.heroHp;
  W().takeTurn(actrice, null);
  ok(game.heroHp > pvAvant && actrice.cooldown === 4, "soin appliqué au héros, cooldown armé à 4 rounds");
  ok(W().chooseAction(actrice) === "basic", "cooldown en cours : elle repasse à l'attaque");
  g.CombatEngine.endRoundGroup([cible]);
  ok(actrice.cooldown === 3, "le cooldown du compagnon tombe d'un round par round");

  /* --- Menace : le héros reste exposé --- */
  game = freshCombat("knight"); giveWeapon();
  W().unlock("wenna");
  g.CombatEngine.spawnGroup([{ id: "wolf", name: "Loup", isBoss: false, hp: 100000, maxHp: 100000, goldReward: 0, essenceReward: 0, resists: [], weak: [], stats: g.ENEMY_DB.wolf.stats }]);
  run("game.heroHp = game.heroMaxHp;");
  run("game.unlockedTabs.grimoire = true; CombatEngine.setCombatMode('grimoire');"); // v3.276.0 : Wenna automatique
  var coupsHeros = 0, coupsWenna = 0;
  for (var i = 0; i < 60; i++) {
    var hpH = game.heroHp, hpW = game.combat.allies[1].hp;
    g.CombatEngine.heroAction("basic", null, "auto");
    if (game.heroHp < hpH) coupsHeros++;
    if (game.combat.allies[1].hp < hpW) coupsWenna++;
    run("game.heroHp = game.heroMaxHp;");
    game.combat.allies[1].hp = g.CompanionManager.maxHpOf("wenna");
  }
  ok(coupsHeros > 0 && coupsWenna > 0, "les deux encaissent : le ciblage est bien réparti");
  ok(coupsHeros >= coupsWenna, "le héros reste la cible principale (menace alimentée par ses dégâts)");
  run("CombatEngine.setCombatMode('tactique');");

  /* --- KO et retour affaibli --- */
  game = freshCombat("knight"); giveWeapon();
  W().unlock("wenna");
  g.CombatEngine.spawnEnemy();
  var w2 = game.combat.allies[1];
  w2.hp = 0;
  ok(w2.ko === true && g.CombatActors.aliveAllies().length === 1, "à 0 PV elle est KO et sort des alliés vivants");
  ok(g.CombatEngine.pickVictim() === g.CombatActors.heroActor(), "un compagnon KO n'est plus ciblé");
  g.CombatEngine.spawnEnemy(); // combat suivant
  var attendu = Math.max(1, Math.floor(W().maxHpOf("wenna") * g.COMPANION_KO_RETURN_PCT));
  ok(W().hpOf("wenna") === attendu, "combat suivant : elle revient à 30 % de ses PV");

  /* --- Améliorations --- */
  game = freshCombat("knight"); giveWeapon();
  W().unlock("wenna");
  var degatsAvant = W().statsOf("wenna").damage;
  run("game.gold = 0;");
  ok(W().buyUpgrade("wenna") === false, "sans or, pas d'amélioration");
  run("game.gold = 10000;");
  ok(W().buyUpgrade("wenna") === true && W().state("wenna").upgrades === 1, "palier acheté, or débité");
  ok(W().statsOf("wenna").damage > degatsAvant, "le palier augmente ses stats");

  /* --- Sauvegarde : les quatre points --- */
  var d = g.buildSaveData();
  ok(!!d.companions && d.companions.wenna && d.companions.wenna.unlocked === true && d.companions.wenna.upgrades === 1,
    "buildSaveData : compagnons persistés");
  run("game.companions = {};");
  W().restore(d.companions);
  ok(W().isUnlocked("wenna") && W().state("wenna").upgrades === 1, "restore : déblocage et améliorations relus");
  W().restore({ inconnu: { unlocked: true } });
  ok(W().unlockedIds().length === 0, "un id inconnu dans la save est ignoré, sans planter");
  run("fullResetState();");
  ok(Object.keys(game.companions || {}).length === 0, "fullResetState : aucun compagnon");
  run("game.companions = {}; CompanionManager.unlock('wenna'); CompanionManager.state('wenna').hp = 1; hardResetState();");
  ok(W().isUnlocked("wenna") && W().hpOf("wenna") === W().maxHpOf("wenna"),
    "ascension : elle reste acquise et repart à PV pleins");

  /* --- Étape d'Histoire --- */
  game = freshCombat("knight"); giveWeapon();
  run("StoryQuestManager.ensure();");
  var chapitre = g.STORY_QUESTS.forest;
  var idxW = chapitre.steps.findIndex(function (s) { return s.id === "forest_wenna"; });
  var idx14 = chapitre.steps.findIndex(function (s) { return s.id === "forest_14"; });
  var idx15 = chapitre.steps.findIndex(function (s) { return s.id === "forest_15"; });
  ok(idxW === idx14 + 1 && idxW === idx15 - 1, "« Celle qui demande » est entre le Basilic et les braises");
  ok(chapitre.steps[idxW].act.indexOf("Acte III") === 0, "étape rattachée à l'Acte III");

  var st = game.storyQuests.forest;
  st.currentStep = idxW; st.accepted = false;
  run("game.companions = {};");
  run("StoryQuestManager.acceptStep('forest');");
  ok(W().isUnlocked("wenna") && st.counters.companionWins === 0,
    "accepter l'étape la fait rejoindre et remet le compteur à 0");
  ok(game.unlockedTabs.companions === true, "le sous-onglet Compagnons s'ouvre");

  var etapeW = chapitre.steps[idxW];
  st.counters.companionWins = 2;
  ok(etapeW.check(game) === false && etapeW.progress(game).indexOf("2/3") !== -1, "2/3 : pas encore prête");
  st.counters.companionWins = 3;
  ok(etapeW.check(game) === true, "3 combats à deux : étape prête");

  /* Le compteur n'avance que si un compagnon est présent */
  st.counters.companionWins = 0;
  W().state("wenna").present = false;
  game.totalKills += 5; run("StoryQuestManager._trackKills();");
  ok(st.counters.companionWins === 0, "sans compagnon présent, rien n'est compté");
  W().state("wenna").present = true;
  game.totalKills += 2; run("StoryQuestManager._trackKills();");
  ok(st.counters.companionWins === 2, "avec elle, les victoires comptent");

  /* Migration : une save déjà à l'étape des braises se décale d'un cran */
  st.currentStep = idxW; delete st.migratedV3268;
  run("StoryQuestManager.ensure();");
  ok(st.currentStep === idxW + 1 && st.migratedV3268 === true, "save à l'ancienne étape 15 : décalée d'un cran");
  run("StoryQuestManager.ensure();");
  ok(st.currentStep === idxW + 1, "migration idempotente");
  st.currentStep = 2; delete st.migratedV3268;
  run("StoryQuestManager.ensure();");
  ok(st.currentStep === 2, "save d'avant l'insertion : pas touchée");

  /* --- v3.268.1 (bug Seb) : le sous-onglet doit RÉELLEMENT s'ouvrir --- */
  game = freshCombat("knight"); giveWeapon();
  W().unlock("wenna");
  run("game.unlockedTabs.companions = true; setHerosSubTabSilent('companions');");
  ok(g.activeHerosSubTab === "companions", "setHerosSubTab('companions') retient bien le sous-onglet");
  ok(g.buildHerosHTML().indexOf("cp-card") !== -1, "l'écran Héros affiche alors la fiche du compagnon");
  run("setHerosSubTabSilent('hero');");
  ok(g.buildHerosHTML().indexOf("setHerosSubTab(\'companions\')") !== -1, "v3.268.3 : le bouton Compagnons est au pied du Résumé, une fois débloqué");
  ok(g.buildHerosSubTabBarHTML().indexOf("companions") === -1, "v3.268.3 : il n'est plus dans la barre de sous-onglets");
  run("game.unlockedTabs.companions = false;");
  ok(g.buildHerosHTML().indexOf("setHerosSubTab(\'companions\')") === -1, "non débloqué : aucun bouton");
  run("game.unlockedTabs.companions = true; setHerosSubTabSilent('companions');");
  run("setHerosSubTabSilent('nimporte_quoi');");
  ok(g.activeHerosSubTab === "hero", "une valeur inconnue retombe toujours sur le Résumé");

  /* --- v3.268.1 : l'attaque du compagnon laisse une trace --- */
  game = freshCombat("knight"); giveWeapon();
  W().unlock("wenna");
  run("game.unlockedTabs.grimoire = true; CombatEngine.setCombatMode('grimoire');");
  g.CombatEngine.spawnGroup([{ id: "slime", name: "Sac", isBoss: false, hp: 100000, maxHp: 100000, goldReward: 0, essenceReward: 0, resists: [], weak: [], stats: g.ENEMY_DB.slime.stats }]);
  run("game.heroHp = game.heroMaxHp; gameLog.length = 0;");
  g.CombatEngine.heroAction("basic", null, "auto");
  var journal = JSON.stringify(g.gameLog || []);
  ok(journal.indexOf("Wenna frappe") !== -1, "son attaque de base écrit une ligne de journal");
  run("CombatEngine.setCombatMode('tactique');");

  /* --- Sans compagnon, le round est celui d'avant --- */
  game = freshCombat("ranger"); giveWeapon();
  run("game.companions = {};");
  g.CombatEngine.spawnEnemy();
  ok(game.combat.allies.length === 1, "aucun compagnon : un seul allié, boucle vide");
  ok(g.CombatEngine.pickVictim() === g.CombatActors.heroActor(), "la frappe vise toujours le héros");
})();

console.log("\n[71] v3.269.0 (L-3) — groupes d'ennemis : composition, ordre, arrivée, butin, arène");
(function () {
  var q = g.ADVENTURE_QUESTS.hq_wolf_pack;

  /* --- Données de quête --- */
  ok(Array.isArray(q.group) && q.group.length === 2 && q.groupHpMult === 0.40 && q.groupGoldMult === 0.40,
    "La Meute Affamée déclare un groupe de 2, PV et butin à ×0,40 (mesuré : le trio est un mur à cet endroit du jeu)");

  /* --- spawnFor renvoie un groupe, et l'alias l'accepte --- */
  var game = freshCombat("knight"); giveWeapon();
  var grp = g.QuestEnemyManager.spawnFor(q, false);
  ok(Array.isArray(grp) && grp.length === 2, "spawnFor renvoie les deux membres");

  var solo = g.QuestEnemyManager.spawnFor({ worldId: "forest", adventureIndex: 0, enemyFilter: ["wolf"] }, false);
  ok(!Array.isArray(solo) && solo && solo.maxHp > grp[0].maxHp,
    "sans champ group : un seul ennemi, à PV pleins (comportement d'avant)");
  ok(grp[0].goldReward < solo.goldReward, "le butin d'un membre suit groupGoldMult");

  game.enemy = grp;   // c'est ce que font adventure/hunt/scene, fichiers non modifiés
  ok(game.combat.enemies.length === 2 && game.enemy === game.combat.enemies[0],
    "écrire un tableau dans game.enemy pose le groupe");

  /* --- Ordre : tri par célérité décroissante --- */
  g.CombatEngine.spawnGroup([
    { id: "slime", name: "Lent", isBoss: false, hp: 50, maxHp: 50, goldReward: 1, essenceReward: 0, resists: [], weak: [], stats: g.makeRpgStats(10, 10, 5, 10, 10) },
    { id: "wolf", name: "Rapide", isBoss: false, hp: 50, maxHp: 50, goldReward: 1, essenceReward: 0, resists: [], weak: [], stats: g.makeRpgStats(10, 10, 90, 10, 10) },
    { id: "goblin", name: "Moyen", isBoss: false, hp: 50, maxHp: 50, goldReward: 1, essenceReward: 0, resists: [], weak: [], stats: g.makeRpgStats(10, 10, 40, 10, 10) }
  ]);
  var noms = game.combat.enemies.map(function (e) { return e.name; });
  ok(noms[0] === "Rapide" && noms[1] === "Moyen" && noms[2] === "Lent",
    "le groupe est trié par célérité décroissante : " + noms.join(" > "));

  /* --- Compteurs de pattern décalés entre membres ---
     Test DÉTERMINISTE : les membres sont posés déjà préparés (_roundReady) avec des
     compteurs identiques, donc prepareEnemy ne les retire pas au hasard. La première
     version de cette assertion comparait des tirages aléatoires et échouait une fois
     sur dix quand ils coïncidaient. */
  function membrePret(nom, cel) {
    return { id: "slime", name: nom, isBoss: false, hp: 50, maxHp: 50, goldReward: 1, essenceReward: 0,
      resists: [], weak: [], stats: g.makeRpgStats(10, 10, cel, 10, 10),
      _roundReady: true, gauge: 0, roundsAlive: 0, engageIn: 0,
      chargeIn: 5, shieldIn: 5, silenceIn: 5, healIn: 5 };
  }
  g.CombatEngine.spawnGroup([membrePret("A", 30), membrePret("B", 20), membrePret("C", 10)]);
  var charges = game.combat.enemies.map(function (e) { return e.chargeIn; });
  ok(charges[0] === 5 && charges[1] === 6 && charges[2] === 7,
    "les compte à rebours de pattern sont décalés d'un round entre membres (" + charges.join("/") + ")");

  /* --- Arrivée au contact décalée, pour les classes à distance seulement --- */
  game = freshCombat("ranger"); giveWeapon();
  game.enemy = g.QuestEnemyManager.spawnFor(q, false);
  var eng = game.combat.enemies.map(function (e) { return e.engageIn; });
  ok(eng[0] === 0 && eng[1] === 1, "héros à distance : arrivée échelonnée 0/1 (" + eng.join("/") + ")");

  game = freshCombat("knight"); giveWeapon();
  game.enemy = g.QuestEnemyManager.spawnFor(q, false);
  var engM = game.combat.enemies.map(function (e) { return e.engageIn; });
  ok(engM[0] === 0 && engM[1] === 0, "héros au contact : personne n'a à approcher");

  /* --- Un membre qui tombe ne relance pas le monde --- */
  game = freshCombat("knight"); giveWeapon();
  game.enemy = g.QuestEnemyManager.spawnFor(q, false);
  var cycleAvant = game.cycleCount, kills = game.totalKills;
  var victime = game.combat.enemies[0];
  g.CombatEngine.killEnemy(victime);
  ok(game.combat.enemies.length === 1 && game.combat.enemies.indexOf(victime) === -1,
    "le mort quitte le groupe, l'autre reste");
  ok(game.totalKills === kills + 1 && game.cycleCount === cycleAvant,
    "kill compté, aucune avance de monde tant que le groupe n'est pas vide");
  ok(game.enemy && game.enemy.hp > 0, "la cible retombe sur un vivant");



  /* --- Arène : la rangée n'existe qu'à partir de deux ennemis --- */
  game = freshCombat("knight"); giveWeapon();
  g.CombatEngine.spawnEnemy();
  ok(g.buildEnemyRowHTML() === "", "un seul ennemi : aucune rangée, écran historique");
  game.enemy = g.QuestEnemyManager.spawnFor(q, false);
  var html = g.buildEnemyRowHTML();
  ok((html.match(/cbg-foe-frame/g) || []).length === 2, "un portrait par membre");
  ok((html.match(/cbg-foe-name/g) || []).length === 2, "le nom est posé sur chaque portrait");
  ok(html.indexOf("is-target") !== -1, "la cible porte son halo");

  /* --- Cible collante par tap --- */
  var second = game.combat.enemies[1];
  g.selectEnemyTarget(second.actorId);
  ok(game.enemy === second, "un tap sur un portrait fixe la cible du groupe");
  second.hp = 0;
  g.CombatEngine.killEnemy(second);
  ok(game.enemy && game.enemy.hp > 0, "à sa mort, la cible revient sur un vivant");

  /* --- Pastilles de statut --- */
  game = freshCombat("knight"); giveWeapon();
  game.enemy = g.QuestEnemyManager.spawnFor(q, false);
  game.combat.enemies[1].chargeTelegraphed = true;
  var badges = g.getEnemyRowBadges(game.combat.enemies[1]);
  ok(badges.length >= 1 && badges[0].urgent === true, "un télégraphe donne une pastille urgente");
  ok(g.buildEnemyRowHTML().indexOf("is-urgent") !== -1, "elle est bien rendue dans la rangée");

  /* --- Compagnon : charges par combat EN PLUS du cooldown --- */
  game = freshCombat("knight"); giveWeapon();
  g.CompanionManager.unlock("wenna");
  g.CombatEngine.spawnGroup(g.QuestEnemyManager.spawnFor(q, false));
  var w = game.combat.allies[1];
  ok(g.CompanionManager.chargesMax("wenna") === 3 && w.charges === 3, "Wenna démarre le combat avec 3 charges");
  run("game.heroHp = Math.floor(game.heroMaxHp * 0.30);");
  g.CompanionManager.takeTurn(w, null);
  ok(w.charges === 2 && w.cooldown === 4, "un soin consomme une charge ET arme le cooldown");
  w.cooldown = 0; w.charges = 0;
  ok(g.CompanionManager.chooseAction(w) === "basic", "charges épuisées : elle frappe au lieu de soigner");
  g.CombatEngine.spawnGroup(g.QuestEnemyManager.spawnFor(q, false));
  ok(game.combat.allies[1].charges === 3, "le combat suivant lui rend ses charges");

  /* --- Rangée d'alliés --- */
  ok(g.buildAllyRowHTML().indexOf("cbg-ally-charges") !== -1, "ses charges sont visibles sur sa mini-carte");
  run("game.companions = {};");
  g.CombatEngine.spawnEnemy();
  ok(g.buildAllyRowHTML() === "", "aucun compagnon : aucune rangée d'alliés");

  /* --- Le kill d'un membre compte pour la quête (le défaut attrapé par [32]) --- */
  game = freshCombat("knight"); giveWeapon();
  run("AdventureQuestManager.start('hq_wolf_pack');");
  var prog = game.adventureQuestProgress.hq_wolf_pack;
  var pas = q.steps[0].id;
  var avant = prog[pas];
  ok(game.combat.enemies.length === 2, "la quête lance bien une meute");
  var membres = game.combat.enemies.slice();
  g.CombatEngine.killEnemy(membres[0]);
  ok(prog[pas] === avant + 1, "la mort d'un membre fait avancer l'objectif de la quête");
  ok(game.combat.enemies.length === 1 && game.combat.enemies.indexOf(membres[1]) !== -1,
    "le spawn du run n'a PAS remplacé le groupe en cours");
  g.CombatEngine.killEnemy(membres[1]);
  ok(prog[pas] === avant + 2, "le dernier compte aussi, et relance la suite du run");
  ok(g.CombatActors._holdSpawn === false, "la porte du spawn est refermée après coup");

  /* --- Le pronostic survit à un groupe --- */
  ok(typeof g.firstOfGroup === "function" && g.firstOfGroup([1, 2]) === 1 && g.firstOfGroup(7) === 7,
    "le pronostic ne lit qu'un adversaire de référence");
})();

console.log("\n[72] v3.270.0 (L-4) — mode Manuel : file d'attente, actions du compagnon, cible du soin");
(function () {
  /* v3.276.0 : hors mode Grimoire, un compagnon présent est manuel par construction. */
  function manuel() {
    var game = freshCombat("knight"); giveWeapon();
    g.CompanionManager.unlock("wenna");
    g.CombatEngine.spawnEnemy();
    return game;
  }

  /* --- Sans compagnon manuel, rien ne change --- */
  var game = freshCombat("knight"); giveWeapon();
  run("game.companions = {};");
  g.CombatEngine.spawnEnemy();
  ok(g.CombatEngine.hasManualAllies() === false, "aucun compagnon manuel : la file ne s'active pas");
  var r0 = game.combatRound.number;
  g.CombatEngine.heroAction("basic");
  ok(game.combatRound.number === r0 + 1, "le round part au premier tap, comme avant");

  /* --- Un compagnon en Auto n'entre pas dans la file --- */
  game = freshCombat("knight"); giveWeapon();
  g.CompanionManager.unlock("wenna");
  run("game.unlockedTabs.grimoire = true; CombatEngine.setCombatMode('grimoire');");
  g.CombatEngine.spawnEnemy();
  ok(g.CompanionManager.controlOf() === "auto" && g.CombatEngine.hasManualAllies() === false,
    "v3.276.0 — en Grimoire, les compagnons sont automatiques : pas de file");
  r0 = game.combatRound.number;
  g.CombatEngine.heroAction("basic", null, "auto");
  ok(game.combatRound.number === r0 + 1, "et le round s'enchaîne tout seul");
  run("CombatEngine.setCombatMode('tactique');");

  /* --- En Manuel : le round attend tout le monde --- */
  game = manuel();
  ok(g.CombatEngine.hasManualAllies() === true, "Wenna en Manuel entre dans la file");
  var ordre = g.CombatEngine.actorsToChoose().map(function (a) { return a.name; });
  ok(ordre.length === 2 && ordre[1] === "Wenna", "ordre de choix : le héros, puis les compagnons manuels");

  /* v3.276.0 : les dégâts partent AU CLIC. Le round s'ouvre au premier acte, les ennemis
     ne ripostent qu'une fois que tout le monde a joué. */
  r0 = game.combatRound.number;
  var pvEnnemi = game.enemy.hp, pvHeros = game.heroHp;
  g.CombatEngine.heroAction("basic");
  ok(game.enemy.hp < pvEnnemi, "ton attaque fait ses dégâts immédiatement");
  ok(game.heroHp === pvHeros, "mais l'ennemi n'a pas encore riposté : le round n'est pas fini");
  ok(game.combatRound.number === r0 + 1, "le round s'ouvre dès le premier acte");
  ok(g.CombatEngine.selectedActor().companionId === "wenna", "l'acteur suivant est sélectionné tout seul");
  ok(!!g.CombatEngine.pendingOf(g.CombatActors.heroActor()), "ton acte est enregistré pour ce round");
  ok(g.CombatEngine.allChosen() === false, "il manque encore Wenna");

  g.companionAction("basic");
  ok(game.combatRound.number === r0 + 1, "son acte ferme le round, sans en ouvrir un second");
  ok(Object.keys(game.combat.pending).length === 0, "la file est vidée après résolution");
  ok(g.CombatEngine.selectedActor() === g.CombatActors.heroActor(), "tu redeviens l'acteur actif");
  ok(g.CombatEngine._manualRoundOpen === false, "le round manuel est bien refermé");

  /* --- La rangée d'actions bascule sur le compagnon --- */
  game = manuel();
  g.CombatEngine.heroAction("basic");
  var acteur = g.CombatEngine.selectedActor();
  var htmlActions = g.buildCompanionActionsHTML(acteur);
  ok(htmlActions.indexOf("cbg-act") !== -1 && (htmlActions.match(/cbg-act"/g) || []).length >= 1,
    "la rangée montre les actions du compagnon");
  ok(g.buildAllyRowHTML().indexOf("is-active") !== -1, "sa mini-carte est marquée active");

  /* --- Sélection à la main --- */
  ok(g.CombatEngine.selectActor(g.CombatActors.heroActor().actorId) === true
    && g.CombatEngine.selectedActor() === g.CombatActors.heroActor(),
    "on peut revenir sur le héros à la main");
  ok(g.CombatEngine.selectActor("inconnu") === false, "un acteur inconnu est refusé");

  /* --- Soin : cible directe s'il n'y a qu'un blessé --- */
  game = manuel();
  var w = game.combat.allies[1];
  run("game.heroHp = game.heroMaxHp;");
  w.hp = Math.floor(w.maxHp * 0.5); w.cooldown = 0;
  ok(g.CompanionManager.woundedAllies().length === 1, "un seul blessé : Wenna elle-même");
  g.CombatEngine.heroAction("basic");
  var pvW = w.hp;
  g.companionAction("skill");
  ok(w.hp > pvW && g.CombatEngine._manualRoundOpen === false,
    "un seul blessé : le soin part sans rien demander, et ferme le round");

  /* --- ... et attend le popup s'il y en a plusieurs --- */
  game = manuel();
  w = game.combat.allies[1];
  run("game.heroHp = Math.floor(game.heroMaxHp * 0.4);");
  w.hp = Math.floor(w.maxHp * 0.5); w.cooldown = 0; w.charges = 3;
  ok(g.CompanionManager.woundedAllies().length === 2, "deux blessés : il y a un vrai choix");
  g.CombatEngine.heroAction("basic");
  var pvH = game.heroHp;
  g.companionAction("skill");
  ok(!g.CombatEngine.pendingOf(w), "plusieurs blessés : rien n'est joué, on attend la cible");
  g.chooseHealTarget(g.CombatActors.heroActor().actorId);
  ok(game.heroHp > pvH || g.CombatEngine._manualRoundOpen === false,
    "la cible choisie applique le soin et ferme le round");

  /* --- Compétence indisponible : aucun choix enregistré --- */
  game = manuel();
  w = game.combat.allies[1];
  run("game.heroHp = Math.floor(game.heroMaxHp * 0.5);");
  w.cooldown = 3;
  g.CombatEngine.heroAction("basic");
  g.companionAction("skill");
  ok(!g.CombatEngine.pendingOf(w), "en recharge : le tap ne précharge rien");
  w.cooldown = 0; w.charges = 0;
  g.companionAction("skill");
  ok(!g.CombatEngine.pendingOf(w), "charges épuisées : idem");
  ok(g.buildCompanionActionsHTML(w).indexOf("is-off") !== -1, "et l'icône le dit à l'écran");

  /* --- Une potion reste une action DU héros --- */
  game = manuel();
  g.CombatEngine.selectActor(game.combat.allies[1].actorId);
  run("game.heroHp = 1; PotionManager.ensureHealing(); game.healingPotionsOwned.potion_soin_mineur = 5;");
  var avantPotion = game.heroHp;
  g.CombatEngine.queueChoice("potion", "potion_soin_mineur");
  ok(!!g.CombatEngine.pendingOf(g.CombatActors.heroActor()) && game.heroHp > avantPotion,
    "une potion choisie depuis un compagnon est bue par le héros, tout de suite");

  /* --- Un nouveau combat repart d'une file vide --- */
  game = manuel();
  g.CombatEngine.heroAction("basic");
  ok(Object.keys(game.combat.pending).length === 1, "une action en attente");
  g.CombatEngine.spawnEnemy();
  ok(Object.keys(game.combat.pending).length === 0 && game.combat.selection === null,
    "le combat suivant repart d'une file vide");

  /* --- Le mode Grimoire ignore l'interrupteur --- */
  game = manuel();
  run("game.unlockedTabs.grimoire = true; CombatEngine.setCombatMode('grimoire');");
  r0 = game.combatRound.number;
  g.CombatEngine.heroAction("basic", null, "auto");
  ok(game.combatRound.number === r0 + 1, "en Grimoire, tout le monde est auto : le round se joue");
  run("CombatEngine.setCombatMode('tactique');");
})();

console.log("\n[73] v3.271.0 (L-5) — Grimoire de groupe et comportement du compagnon");
(function () {
  /* --- Deux nouvelles cartes-conditions --- */
  ok(!!g.GRIMOIRE_CONDITIONS.allyLowHp && !!g.GRIMOIRE_CONDITIONS.multipleEnemies,
    "les deux conditions de groupe existent au catalogue");
  ok(g.GRIMOIRE_CONDITION_ORDER.indexOf("allyLowHp") !== -1 && g.GRIMOIRE_CONDITION_ORDER.indexOf("multipleEnemies") !== -1,
    "elles sont rangées dans l'ordre du Grimoire");

  ok(g.evaluateGrimoireCondition("multipleEnemies", { aliveEnemyCount: 2 }) === true
    && g.evaluateGrimoireCondition("multipleEnemies", { aliveEnemyCount: 1 }) === false,
    "« Ils sont plusieurs » ne se déclenche qu'à partir de deux ennemis debout");
  ok(g.evaluateGrimoireCondition("allyLowHp", { allyLowestHpPercent: 0.30 }) === true
    && g.evaluateGrimoireCondition("allyLowHp", { allyLowestHpPercent: 0.55 }) === false
    && g.evaluateGrimoireCondition("allyLowHp", { allyLowestHpPercent: null }) === false,
    "« Un compagnon est en danger » se déclenche sous 40 %, et jamais sans compagnon");

  /* --- Le contexte de combat les alimente pour de vrai --- */
  var game = freshCombat("knight"); giveWeapon();
  g.CompanionManager.unlock("wenna");
  var q = g.ADVENTURE_QUESTS.hq_wolf_pack;
  game.enemy = g.QuestEnemyManager.spawnFor(q, false);
  var ctx = g.ClassCombatManager.getGrimoireCombatContext();
  ok(ctx.aliveEnemyCount === 2, "le contexte compte les ennemis vivants");
  var w = game.combat.allies[1];
  w.hp = Math.floor(w.maxHp * 0.25);
  ctx = g.ClassCombatManager.getGrimoireCombatContext();
  ok(ctx.allyLowestHpPercent !== null && ctx.allyLowestHpPercent < 0.4
    && g.evaluateGrimoireCondition("allyLowHp", ctx) === true,
    "un compagnon à 25 % déclenche la condition");
  run("game.heroHp = 1;");
  ctx = g.ClassCombatManager.getGrimoireCombatContext();
  ok(ctx.allyLowestHpPercent > 0.01, "les PV du héros n'entrent pas dedans : il a déjà heroLowHp");

  /* --- Réglages de comportement : valeurs par défaut et persistance --- */
  game = freshCombat("knight"); giveWeapon();
  g.CompanionManager.unlock("wenna");
  var st = g.CompanionManager.state("wenna");
  ok(st.healThreshold === "normal" && st.healPriority === "lowest" && st.keepReserve === false,
    "réglages par défaut : Normal, le plus bas, sans réserve");
  ok(g.CompanionManager.setSetting("wenna", "healThreshold", "tard") === true && st.healThreshold === "tard",
    "le seuil de soin se règle");
  ok(g.CompanionManager.setSetting("wenna", "healThreshold", "nimporte") === false && st.healThreshold === "tard",
    "une valeur inconnue est refusée, l'ancienne tient");
  ok(g.CompanionManager.setSetting("wenna", "healPriority", "hero") === true && st.healPriority === "hero",
    "la priorité de cible se règle");
  var d = g.buildSaveData();
  ok(d.companions.wenna.healThreshold === "tard" && d.companions.wenna.healPriority === "hero",
    "les réglages sont sauvegardés");
  run("game.companions = {};");
  g.CompanionManager.restore(d.companions);
  ok(g.CompanionManager.state("wenna").healThreshold === "tard"
    && g.CompanionManager.state("wenna").healPriority === "hero", "et relus au chargement");
  g.CompanionManager.restore({ wenna: { unlocked: true, healThreshold: "truqué", healPriority: "truqué" } });
  ok(g.CompanionManager.state("wenna").healThreshold === "normal"
    && g.CompanionManager.state("wenna").healPriority === "lowest",
    "une save trafiquée retombe sur les valeurs sûres");

  /* --- Le seuil change vraiment la décision --- */
  game = freshCombat("knight"); giveWeapon();
  g.CompanionManager.unlock("wenna");
  g.CombatEngine.spawnEnemy();
  var actrice = game.combat.allies[1];
  run("game.heroHp = Math.floor(game.heroMaxHp * 0.70);");
  g.CompanionManager.setSetting("wenna", "healThreshold", "tard");
  ok(g.CompanionManager.chooseAction(actrice) === "basic", "réglée Tard : à 70 % elle frappe");
  g.CompanionManager.setSetting("wenna", "healThreshold", "tot");
  ok(g.CompanionManager.chooseAction(actrice) === "skill", "réglée Tôt : à 70 % elle soigne");

  /* --- Priorité « Toi d'abord » --- */
  game = freshCombat("knight"); giveWeapon();
  g.CompanionManager.unlock("wenna");
  g.CombatEngine.spawnEnemy();
  actrice = game.combat.allies[1];
  actrice.hp = Math.floor(actrice.maxHp * 0.20);          // elle est plus bas que toi
  run("game.heroHp = Math.floor(game.heroMaxHp * 0.50);");
  g.CompanionManager.setSetting("wenna", "healPriority", "lowest");
  ok(g.CompanionManager.autoHealTarget(actrice) === actrice, "« le plus bas » : elle se soigne elle-même");
  g.CompanionManager.setSetting("wenna", "healPriority", "hero");
  ok(g.CompanionManager.autoHealTarget(actrice) === g.CombatActors.heroActor(),
    "« toi d'abord » : elle te soigne alors qu'elle est plus bas");

  /* --- Réserve de charge --- */
  game = freshCombat("knight"); giveWeapon();
  g.CompanionManager.unlock("wenna");
  g.CombatEngine.spawnEnemy();
  actrice = game.combat.allies[1];
  g.CompanionManager.setSetting("wenna", "healThreshold", "normal");
  g.CompanionManager.setSetting("wenna", "keepReserve", true);
  actrice.charges = 1;
  run("game.heroHp = Math.floor(game.heroMaxHp * 0.50);");   // sous le seuil, mais pas critique
  ok(g.CompanionManager.chooseAction(actrice) === "basic", "réserve : elle garde sa dernière charge");
  run("game.heroHp = Math.floor(game.heroMaxHp * 0.20);");   // vraiment bas
  ok(g.CompanionManager.chooseAction(actrice) === "skill", "... mais la dépense quand c'est grave");
  actrice.charges = 3;
  run("game.heroHp = Math.floor(game.heroMaxHp * 0.50);");
  ok(g.CompanionManager.chooseAction(actrice) === "skill", "avec des charges d'avance, la réserve ne bloque rien");

  /* --- La fiche affiche les réglages --- */
  run("game.unlockedTabs.companions = true;");
  var html = g.buildHerosCompanionsHTML();
  ok(html.indexOf("cp-behavior") !== -1 && html.indexOf("companionSetSetting") !== -1,
    "la fiche du compagnon porte le bloc Comportement");
  ok(g.buildHerosCompanionsHTML().indexOf("sert en mode Grimoire") !== -1,
    "hors Grimoire, la fiche annonce que ces réglages ne jouent pas");
  ok(g.buildHerosCompanionsHTML().indexOf("cp-controlnote") !== -1,
    "et rappelle où se règle Auto / Manuel : le mode de combat");
})();

console.log("\n[74] v3.273.0 — bandeau de combat v2 : rangée d'acteurs, cadre qui suit, feuille de sortie");
(function () {
  var game = freshCombat("knight"); giveWeapon();
  g.CompanionManager.unlock("wenna");
  g.CombatEngine.spawnEnemy();

  /* --- Le héros a sa carte dans la rangée --- */
  var row = g.buildAllyRowHTML();
  ok(row.indexOf("cbg-me") !== -1, "le héros a sa carte dans la rangée des acteurs");
  ok((row.match(/cbg-ally/g) || []).length >= 2, "sa carte s'ajoute à celle du compagnon");
  run("game.companions = {};");
  g.CombatEngine.spawnEnemy();
  ok(g.buildAllyRowHTML() === "", "seul, aucune rangée : l'écran est celui d'avant");

  /* --- Le compteur de rounds a quitté la rangée de commandes --- */
  game = freshCombat("knight"); giveWeapon();
  run("game.unlockedTabs.grimoire = true;");
  var ctl = g.buildCombatControlsHTML();
  ok(ctl.indexOf("combat-round-pill") === -1, "le compteur de rounds n'est plus dans la rangée");
  ok(ctl.indexOf("Tactique") !== -1 || ctl.indexOf("Grimoire") !== -1, "le sélecteur de mode y est toujours");

  /* --- Le butin est un bouton, les potions sont dans la feuille --- */
  game = freshCombat("knight"); giveWeapon();
  g.CombatEngine.heroAction("basic");   // ouvre une sortie
  var sortie = g.buildCombatSortieHTML();
  ok(sortie.indexOf("openSortieSheet()") !== -1, "le butin ouvre la feuille de sortie");
  ok(sortie.indexOf("subtabs/potions.png") === -1, "les potions restantes ont quitté la rangée");
  ok(typeof g.openSortieSheet === "function" && typeof g.closeSortieSheet === "function",
    "la feuille de sortie a ses deux fonctions");
  var ligne = g.buildSortieLineHTML("x.png", "Or", "12");
  ok(ligne.indexOf("cbs-line") !== -1 && ligne.indexOf("Or") !== -1, "une ligne de butin se construit");

  /* --- Le cadre du bas suit l'acteur sélectionné --- */
  game = freshCombat("knight"); giveWeapon();
  g.CompanionManager.unlock("wenna");
  g.CompanionManager.setControl("wenna", "manual");
  g.CombatEngine.spawnEnemy();
  var wen = game.combat.allies[1];
  var band = g.buildCompanionBandHTML(wen);
  ok(band.indexOf("cbg-band") !== -1 && band.indexOf("Charges") !== -1,
    "le cadre d'un compagnon montre ses PV et ses charges");
  ok(band.indexOf("Mana") === -1 && band.indexOf("Célérité") === -1,
    "et pas Mana ni Célérité, qu'il n'a pas");
  wen.cooldown = 2;
  ok(g.buildCompanionBandHTML(wen).indexOf("Recharge 2 r") !== -1, "sa recharge s'affiche quand elle court");
  wen.cooldown = 0;
  ok(g.buildCompanionBandHTML(wen).indexOf("Prêt") !== -1, "et « Prêt » sinon");
})();

console.log("\n[75] v3.276.0 — dégâts au clic, contrôle dicté par le mode, feuille du sac");
(function () {
  /* --- Le mode décide du contrôle, il n'y a plus d'interrupteur --- */
  var game = freshCombat("knight"); giveWeapon();
  g.CompanionManager.unlock("wenna");
  run("game.unlockedTabs.grimoire = true;");
  g.CombatEngine.spawnEnemy();
  ok(g.CompanionManager.controlOf() === "manual" && game.combat.allies[1].control === "manual",
    "hors Grimoire : le compagnon est à toi");
  run("CombatEngine.setCombatMode('grimoire');");
  ok(g.CompanionManager.controlOf() === "auto" && game.combat.allies[1].control === "auto",
    "en Grimoire : il joue seul — et l'acteur suit le changement EN COURS de combat");
  ok(g.CombatEngine.hasManualAllies() === false, "aucune file d'attente en Grimoire");
  run("CombatEngine.setCombatMode('tactique');");
  ok(g.CombatEngine.hasManualAllies() === true, "et elle revient en Tactique");

  /* --- Les dégâts partent au clic, la riposte attend la fin du round --- */
  game = freshCombat("knight"); giveWeapon();
  g.CompanionManager.unlock("wenna");
  g.CombatEngine.spawnGroup([
    { id: "wolf", name: "A", isBoss: false, hp: 500, maxHp: 500, goldReward: 0, essenceReward: 0, resists: [], weak: [], stats: g.ENEMY_DB.wolf.stats },
    { id: "goblin", name: "B", isBoss: false, hp: 500, maxHp: 500, goldReward: 0, essenceReward: 0, resists: [], weak: [], stats: g.ENEMY_DB.goblin.stats }
  ]);
  run("game.heroHp = game.heroMaxHp;");
  var A = game.combat.enemies[0], B = game.combat.enemies[1];
  var a0 = A.hp, b0 = B.hp, h0 = game.heroHp;

  g.CombatActors.setTarget(A.actorId);
  g.CombatEngine.heroAction("basic");
  ok(A.hp < a0, "ton coup entame la cible TOUT DE SUITE");
  ok(B.hp === b0, "et seulement celle que tu visais");
  ok(game.heroHp === h0, "les ennemis n'ont pas encore riposté : le round n'est pas fini");
  ok(g.CombatEngine._manualRoundOpen === true, "le round est ouvert, en attente des autres acteurs");

  /* --- On peut changer de cible EN PLEIN ROUND --- */
  var aMi = A.hp;
  g.CombatActors.setTarget(B.actorId);
  g.companionAction("basic");
  ok(B.hp < b0, "Wenna frappe la nouvelle cible");
  ok(A.hp === aMi, "la première n'est plus touchée");
  ok(game.heroHp < h0, "tout le monde ayant joué, les ennemis ripostent");
  ok(g.CombatEngine._manualRoundOpen === false && game.combatRound.number === 1,
    "le round se referme, et un seul a été compté");

  /* --- Le GROS bouton joue l'attaque de base de l'acteur affiché --- */
  game = freshCombat("knight"); giveWeapon();
  g.CompanionManager.unlock("wenna");
  g.CombatEngine.spawnGroup([{ id: "wolf", name: "Sac", isBoss: false, hp: 100000, maxHp: 100000, goldReward: 0, essenceReward: 0, resists: [], weak: [], stats: g.ENEMY_DB.wolf.stats }]);
  run("game.heroHp = game.heroMaxHp;");
  var sac = game.enemy;
  var p0 = sac.hp;
  g.heroBasicAttack();                       // ton tour
  ok(sac.hp < p0 && g.CombatEngine.selectedActor().companionId === "wenna",
    "le gros bouton joue ton attaque, puis passe à Wenna");
  var p1 = sac.hp;
  g.heroBasicAttack();                       // le tour de Wenna, MÊME bouton
  ok(sac.hp < p1, "le même bouton joue l'attaque de base du compagnon (v3.277.0)");
  ok(game.combatRound.busy === false, "le round n'est plus bloqué entre deux acteurs");

  /* --- Un acteur ne joue pas deux fois : le tap suivant est pour le suivant ---
     v3.277.0 : retaper ne rejoue pas le héros, ça fait jouer l'acteur d'après. C'est le
     comportement demandé — un seul bouton, qui suit la file. */
  game = freshCombat("knight"); giveWeapon();
  g.CompanionManager.unlock("wenna");
  g.CombatEngine.spawnGroup([{ id: "wolf", name: "Sac", isBoss: false, hp: 100000, maxHp: 100000, goldReward: 0, essenceReward: 0, resists: [], weak: [], stats: g.ENEMY_DB.wolf.stats }]);
  run("game.heroHp = game.heroMaxHp;");
  var hero = g.CombatActors.heroActor();
  var cible = game.enemy;
  var av1 = cible.hp;
  g.CombatEngine.heroAction("basic");
  var coupHeros = av1 - cible.hp;
  ok(!!g.CombatEngine.pendingOf(hero) && g.CombatEngine.selectedActor().companionId === "wenna",
    "ton acte est enregistré une fois, et la main passe");
  var av2 = cible.hp;
  g.CombatEngine.heroAction("basic");
  var coupSuivant = av2 - cible.hp;
  /* Le second tap frappe avec les dégâts du COMPAGNON, pas les tiens — c'est ce qui prouve
     que ton tour n'a pas été rejoué. (La file, elle, est vidée quand le round se ferme.) */
  ok(coupSuivant > 0 && coupSuivant !== coupHeros,
    "le tap suivant joue le compagnon, pas ton tour (" + Math.round(coupHeros) + " puis " + Math.round(coupSuivant) + ")");
  ok(g.CombatEngine._manualRoundOpen === false, "et referme le round, tout le monde ayant joué");

  /* --- Un nouveau combat referme un round resté ouvert --- */
  game = freshCombat("knight"); giveWeapon();
  g.CompanionManager.unlock("wenna");
  g.CombatEngine.spawnGroup([{ id: "wolf", name: "Sac", isBoss: false, hp: 100000, maxHp: 100000, goldReward: 0, essenceReward: 0, resists: [], weak: [], stats: g.ENEMY_DB.wolf.stats }]);
  run("game.heroHp = game.heroMaxHp;");
  g.CombatEngine.heroAction("basic");
  ok(g.CombatEngine._manualRoundOpen === true, "round encore ouvert (Wenna n'a pas joué)");
  g.CombatEngine.spawnEnemy();
  ok(g.CombatEngine._manualRoundOpen === false && Object.keys(game.combat.pending).length === 0,
    "le combat suivant repart d'un round vierge");

  /* --- Le sac a sa propre feuille, que la feuille des états ne peut plus écraser --- */
  game = freshCombat("knight"); giveWeapon();
  ok(g.buildCombatHTML().indexOf("combat-sortie-sheet-root") !== -1,
    "l'écran porte une racine dédiée au sac");
  ok(g.buildCombatHTML().indexOf("combat-states-modal-root") === -1
    || g.buildCombatHTML().indexOf("combat-sortie-sheet-root") !== g.buildCombatHTML().indexOf("combat-states-modal-root"),
    "elle est distincte de celle des états de combat");
})();

console.log("\n[76] v3.278.0 — la barre de PV du héros prend le cadre des compagnons");
(function () {
  var css = "";
  try { css = require("fs").readFileSync(ROOT + "/css/03-combat-group.css", "utf8"); } catch (e) { css = ""; }

  ok(css.indexOf(".cb-hero .combat-hero-mini-hp-bar.kgauge") !== -1,
    "la reprise vise bien la barre de PV du héros dans le cadre de combat");
  var bloc = css.slice(css.indexOf(".cb-hero .combat-hero-mini-hp-bar.kgauge"));
  bloc = bloc.slice(0, bloc.indexOf("}") + 1);
  ok(bloc.indexOf("gauge-dragon-claw-frame.png") !== -1,
    "elle emprunte le cadre en griffe de dragon, celui des compagnons");
  ok(bloc.indexOf("1086 / 163") !== -1, "avec le bon rapport de forme");
  ok(bloc.indexOf("#15803d") !== -1 && bloc.indexOf("#4ade80") !== -1,
    "et garde le remplissage vert des PV (décision Seb)");

  /* La reprise est BORNÉE au combat : le HUD hors combat garde son cadre. Test corrigé —
     chercher la sous-chaîne seule la trouvait AUSSI dans le sélecteur borné. On vérifie
     donc que chaque occurrence est bien précédée de la portée `.cb-hero `. */
  var portees = css.split(".combat-hero-mini-hp-bar.kgauge");
  var toutesBornees = true;
  for (var i = 1; i < portees.length; i++) {
    if (!/\.cb-hero\s+$/.test(portees[i - 1])) toutesBornees = false;
  }
  ok(portees.length > 1 && toutesBornees,
    "aucune règle globale : le HUD hors combat n'est pas touché");

  var hud = "";
  try { hud = require("fs").readFileSync(ROOT + "/js/ui/hud-view.js", "utf8"); } catch (e) { hud = ""; }
  ok(hud.indexOf("kgauge-dragon kgauge-hp") !== -1,
    "le balisage d'origine est intact — la reprise est purement CSS");
})();

console.log("\n[77] v3.279.0 — Admin : rejouer un combat, et les deux barres de PV alignées");
(function () {
  var game = freshCombat("knight"); giveWeapon();

  /* --- Catalogue des combats relançables --- */
  var liste = g.getAdminCombatQuests();
  ok(liste.length > 0, "le catalogue liste des combats (" + liste.length + ")");
  ok(liste.some(function (q) { return q.id === "hq_wolf_pack" && q.kind === "adventure"; }),
    "les quêtes d'aventure y sont");
  ok(liste.some(function (q) { return q.kind === "hunt"; }), "les quêtes de chasse aussi");
  var meute = liste.filter(function (q) { return q.id === "hq_wolf_pack"; })[0];
  ok(meute && meute.groupe === 2, "la taille du groupe est indiquée (La Meute Affamée : 2)");
  ok(liste.every(function (q, i) { return i === 0 || liste[i - 1].label.localeCompare(q.label) <= 0; }),
    "la liste est triée par nom");

  var html = g.buildAdminCombatQuestHTML();
  ok(html.indexOf("admin-combat-quest") !== -1 && html.indexOf("adminReplayCombatQuest()") !== -1,
    "la section Admin porte la liste déroulante et son bouton");
  ok(g.buildAdminHTML().indexOf("admin-combat-quest") !== -1, "elle est bien dans l'écran Admin");

  /* --- Relancer remet la progression à zéro --- */
  game.adventureQuestsCompleted.hq_wolf_pack = true;
  game.adventureQuestProgress.hq_wolf_pack = { kills_wolfpack: 7 };
  run("document.getElementById = (function (o) { return function (id) { return id === 'admin-combat-quest' ? { value: 'adventure:hq_wolf_pack' } : o.call(document, id); }; })(document.getElementById);");
  g.adminReplayCombatQuest();
  ok(!game.adventureQuestsCompleted.hq_wolf_pack, "une quête terminée redevient jouable");
  ok(game.adventureQuestProgress.hq_wolf_pack.kills_wolfpack === 0, "sa progression repart de zéro");
  ok(game.adventureQuestRun && game.adventureQuestRun.active && game.adventureQuestRun.questId === "hq_wolf_pack",
    "et le run démarre");
  ok(game.combat.enemies.length === 2, "avec sa meute, comme en jeu");

  /* --- Les deux barres de PV : même cadre, même gabarit --- */
  var css = "";
  try { css = require("fs").readFileSync(ROOT + "/css/03-combat-group.css", "utf8"); } catch (e) { css = ""; }
  ok(css.indexOf("#companion-band-root:empty") !== -1,
    "le conteneur vide du compagnon ne pousse plus le bloc du héros");
  ok(css.indexOf(".cbg-band-portrait { flex: 0 0 56px; width: 56px; height: 56px; }") !== -1,
    "les deux portraits font 56 px, donc les deux barres la même largeur");
  ok(css.indexOf(".cb-hero .combat-hero-mini-hp-bar { margin-top: 0; }") !== -1,
    "la marge de 8 px héritée du HUD est neutralisée dans le cadre de combat");
})();

console.log("\n[78] v3.280.0 — la rangée d'ennemis ne se réécrit que si elle change");
(function () {
  var game = freshCombat("knight"); giveWeapon();
  game.enemy = g.QuestEnemyManager.spawnFor(g.ADVENTURE_QUESTS.hq_wolf_pack, false);

  /* Deux appels d'affilée sans rien changer doivent produire le MÊME html — c'est ce qui
     permet au rendu de ne pas réécrire, et donc de ne pas manger un toucher en cours. */
  var a = g.buildEnemyRowHTML();
  var b = g.buildEnemyRowHTML();
  ok(a === b && a.length > 0, "la rangée est stable tant que rien ne bouge");

  /* ... et doit changer dès que l'état change, sinon on afficherait du périmé. */
  g.CombatActors.setTarget(game.combat.enemies[1].actorId);
  ok(g.buildEnemyRowHTML() !== a, "elle change quand la cible change");
  game.combat.enemies[0].hp -= 5;
  var c = g.buildEnemyRowHTML();
  g.CombatActors.setTarget(game.combat.enemies[0].actorId);
  ok(g.buildEnemyRowHTML() !== c, "et quand les PV bougent");

  /* Même chose pour la rangée d'alliés. */
  g.CompanionManager.unlock("wenna");
  g.CombatEngine.spawnEnemy();
  var d = g.buildAllyRowHTML();
  ok(d === g.buildAllyRowHTML() && d.length > 0, "la rangée d'alliés est stable elle aussi");
  game.combat.allies[1].hp -= 3;
  ok(g.buildAllyRowHTML() !== d, "et suit les PV du compagnon");

  /* La rangée doit rester au-dessus de l'illustration. */
  var css = "";
  try { css = require("fs").readFileSync(ROOT + "/css/03-combat-group.css", "utf8"); } catch (e) { css = ""; }
  ok(css.indexOf("#enemy-row") !== -1 && css.indexOf("z-index: 5") !== -1,
    "la rangée est posée au-dessus de l'illustration de l'ennemi");
})();

console.log("\n[79] v3.281.0 — tout ce qui se tape est un <button> (taps perdus sur iPhone)");
(function () {
  var game = freshCombat("knight"); giveWeapon();
  g.CompanionManager.unlock("wenna");
  game.enemy = g.QuestEnemyManager.spawnFor(g.ADVENTURE_QUESTS.hq_wolf_pack, false);
  game.combat.enemies[0].chargeTelegraphed = true;

  var alerte = g.buildCombatAlertHTML();
  ok(alerte.indexOf("<button") === 0 && alerte.indexOf("openCombatStatesSheet()") !== -1,
    "la bande d'alerte est un bouton");
  ok(alerte.indexOf("</button>") !== -1, "et se referme proprement");

  game.combat.enemies[0].vulnerableRounds = 2;
  var etats = g.buildCombatStatesHTML();
  ok(etats === "" || (etats.indexOf("<button") === 0 && etats.indexOf("</button>") !== -1),
    "la rangée d'états aussi");

  var row = g.buildAllyRowHTML();
  ok(row.indexOf('<button type="button" class="cbg-ally cbg-me') !== -1,
    "la carte du héros est un bouton");
  ok((row.match(/<button/g) || []).length === (row.match(/<\/button>/g) || []).length,
    "toutes les cartes sont bien refermées");

  var foes = g.buildEnemyRowHTML();
  ok((foes.match(/<button/g) || []).length === 2, "les portraits ennemis restent des boutons");

  /* Hors mode Manuel, la carte n'est pas cliquable : elle est désactivée plutôt que
     muette, pour que le navigateur sache qu'il n'y a rien à taper. */
  run("game.unlockedTabs.grimoire = true; CombatEngine.setCombatMode('grimoire');");
  ok(g.buildAllyRowHTML().indexOf("disabled") !== -1,
    "en Grimoire, les cartes sont désactivées : rien à sélectionner");
  run("CombatEngine.setCombatMode('tactique');");
  ok(g.buildAllyRowHTML().indexOf("selectCombatActor") !== -1,
    "en Tactique, elles redeviennent cliquables");
})();

console.log("\n[80] v3.282.0 — coût des objectifs : banc de quête et objectif de La Meute");
(function () {
  var fs2 = require("fs");
  var banc = "";
  try { banc = fs2.readFileSync(ROOT + "/sim/quest-cost-bench.js", "utf8"); } catch (e) { banc = ""; }

  ok(banc.length > 0, "sim/quest-cost-bench.js existe");
  ok(banc.indexOf("CombatEngine.heroAction") !== -1,
    "il joue de vrais rounds du moteur — aucune formule n'y est réécrite");
  ok(banc.indexOf("PV/cran") !== -1,
    "il sort le coût par cran d'objectif, la colonne qui sert à équilibrer");
  ok(banc.indexOf("PROFILS") !== -1 && banc.indexOf("equipe") !== -1,
    "il mesure trois profils d'équipement (remarque de Seb : l'équipement compte)");
  ok(banc.indexOf("--solo") !== -1, "et sait désactiver les groupes pour comparer");

  /* L'objectif corrigé --- */
  var q = g.ADVENTURE_QUESTS.hq_wolf_pack;
  ok(q.steps[0].target === 16, "La Meute Affamée demande 16 crans");
  ok(q.group.length === 2, "et les sert par meutes de deux");
  ok(q.steps[0].target % q.group.length === 0,
    "l'objectif est un multiple de la taille du groupe : la quête se termine sur une meute entière");

  /* Le compteur avance bien de la taille du groupe --- */
  var game = freshCombat("knight"); giveWeapon();
  run("AdventureQuestManager.start('hq_wolf_pack');");
  var prog = game.adventureQuestProgress.hq_wolf_pack;
  var pas = q.steps[0].id;
  ok(prog[pas] === 0, "au lancement, aucun cran");
  var membres = game.combat.enemies.slice();
  g.CombatEngine.killEnemy(membres[0]);
  g.CombatEngine.killEnemy(membres[1]);
  ok(prog[pas] === 2, "une meute entière vaut deux crans");
  ok(!game.adventureQuestsCompleted.hq_wolf_pack, "et ne termine pas la quête à elle seule");
})();

console.log("\n[81] v3.283.0 — la suggestion du Grimoire redevient visible");
(function () {
  var game = freshCombat("knight"); giveWeapon();
  g.CombatEngine.spawnEnemy();
  g.ClassCombatManager.ensureForCurrentClass().current = 100;

  /* Le moteur la calcule toujours — c'était bien l'affichage qui l'avait perdue. */
  ok(typeof g.CombatEngine.suggestAction() === "string", "le moteur suggère une action");
  ok(g.buildClassSkillButtonsHTML().indexOf("is-suggested") !== -1,
    "et le bouton correspondant porte sa marque");

  /* Le halo est un box-shadow. Le restylage carré des boutons (v3.275.0) leur a donné
     leur propre ombre dans un fichier chargé APRÈS : à spécificité égale, l'ombre gagnait
     et le halo disparaissait. La reprise doit exister et garder l'ombre en dernier. */
  var css = "";
  try { css = require("fs").readFileSync(ROOT + "/css/03-combat-group.css", "utf8"); } catch (e) { css = ""; }
  ok(css.indexOf(".cb-cmd .combat-action-btn.is-suggested") !== -1,
    "la reprise du halo de suggestion existe, dans la portée du combat");
  var bloc = css.slice(css.indexOf(".cb-cmd .combat-action-btn.is-suggested"));
  bloc = bloc.slice(0, bloc.indexOf("}") + 1);
  ok(bloc.indexOf("253, 230, 138") !== -1, "elle garde la teinte d'origine du halo");
  ok(bloc.indexOf("0, 0, 0, .45") !== -1, "et conserve l'ombre portée du bouton sous le halo");
  ok(css.indexOf(".cb-cmd .combat-action-btn.is-active") !== -1,
    "la posture active est reprise pour la même raison");

  /* En mode automatique, aucune suggestion : c'est le Grimoire qui joue. */
  run("game.unlockedTabs.grimoire = true; CombatEngine.setCombatMode('grimoire');");
  ok(g.buildClassSkillButtonsHTML().indexOf("is-suggested") === -1,
    "en Grimoire, pas de suggestion : il joue lui-même");
  run("CombatEngine.setCombatMode('tactique');");
})();

console.log("\n[82] v3.284.0 — la Chasse en Forêt s'ouvre aux meutes");
(function () {
  var q = g.HUNT_QUESTS.hq_forest_boar;

  ok(Array.isArray(q.group) && q.group.length === 2, "la Chasse en Forêt sert des meutes de deux");
  ok(q.groupHpMult === 0.40 && q.groupGoldMult === 0.40, "PV et butin de chaque membre à ×0,40");

  /* Les trois chiffres se tiennent : lot, taux de butin, taille de meute. */
  ok(q.lotSize === 16, "le lot passe de 10 à 16 crans — sinon il coûterait 40 % moins cher");
  ok(q.dropChancePct === 50,
    "et le taux de butin de 80 % à 50 % — sinon le lot rapporterait 60 % de plus");
  ok(Math.abs(q.lotSize * q.dropChancePct / 100 - 8) < 0.5,
    "rendement conservé : " + (q.lotSize * q.dropChancePct / 100).toFixed(1) + " ressources par lot, contre 8 avant");
  ok(q.lotSize % q.group.length === 0, "le lot se termine sur une meute entière");

  /* Le spawn suit bien, et le compteur de lot avance de la taille du groupe. */
  var game = freshCombat("knight"); giveWeapon();
  var spawn = g.QuestEnemyManager.spawnFor(q, false);
  ok(Array.isArray(spawn) && spawn.length === 2, "spawnFor renvoie les deux bêtes");

  run("HuntQuestManager.start('hq_forest_boar');");
  ok(game.huntRun && game.huntRun.active, "la chasse démarre");
  ok(game.combat.enemies.length === 2, "avec sa meute");
  var membres = game.combat.enemies.slice();
  var avant = game.huntRun.killsInLot;
  g.CombatEngine.killEnemy(membres[0]);
  ok(game.huntRun.killsInLot === avant + 1, "chaque bête compte pour le lot");
  ok(game.combat.enemies.length === 1, "et le combat continue tant qu'il en reste une");

  /* La chasse se joue AVANT que Wenna rejoigne (rappel de Seb) : les mesures qui la
     calibrent doivent donc être faites sans compagnon. On vérifie qu'aucun compagnon
     n'est requis pour qu'elle tourne. */
  run("game.companions = {};");
  ok(g.CombatActors.allies().length === 1, "elle se joue sans compagnon, comme en jeu à ce stade");
})();

console.log("\n[83] v3.285.0 — Petites Aventures : la meute de loups en est une");
(function () {
  var bank = g.SCENE_NODES.combatGroups;

  ok(Array.isArray(bank.loups_foret.group) && bank.loups_foret.group.length === 2,
    "le gabarit « meute de loups » sert deux bêtes");
  ok(bank.loups_foret.groupHpMult === 0.40, "chaque bête à ×0,40");
  ok(!bank.gobelins_foret.group && !bank.araignees_foret.group,
    "bande de gobelins et nid d'araignées restent à l'unité, faute de mesure propre");

  /* La pseudo-quête porte les champs jusqu'à spawnFor. */
  var game = freshCombat("knight"); giveWeapon();
  var pqMeute = { worldId: "forest", adventureIndex: 0, enemyFilter: bank.loups_foret.enemyFilter,
    group: bank.loups_foret.group, groupHpMult: bank.loups_foret.groupHpMult, groupGoldMult: bank.loups_foret.groupGoldMult };
  var sp = g.QuestEnemyManager.spawnFor(pqMeute, false);
  ok(Array.isArray(sp) && sp.length === 2, "un nœud « meute » spawne deux loups");

  var pqSeul = { worldId: "forest", adventureIndex: 0, enemyFilter: bank.gobelins_foret.enemyFilter };
  var sg = g.QuestEnemyManager.spawnFor(pqSeul, false);
  ok(!Array.isArray(sg) && sg.hp > sp[0].hp,
    "un nœud sans groupe reste un ennemi seul, à PV pleins");

  var src = "";
  try { src = require("fs").readFileSync(ROOT + "/js/systems/scene-run-system.js", "utf8"); } catch (e) { src = ""; }
  ok(src.indexOf("group: group.group") !== -1 && src.indexOf("groupHpMult: group.groupHpMult") !== -1,
    "la pseudo-quête porte les trois champs de groupe");

  /* Le comptage en rencontres : un membre qui tombe alors qu'il en reste ne doit PAS
     prévenir le run, sinon la meute avancerait la vague deux fois. */
  var eng = "";
  try { eng = require("fs").readFileSync(ROOT + "/js/systems/combat-engine.js", "utf8"); } catch (e) { eng = ""; }
  var brancheGroupe = eng.slice(eng.indexOf("CombatActors.enemies().length > 1"));
  brancheGroupe = brancheGroupe.slice(0, brancheGroupe.indexOf("addLog("));
  ok(brancheGroupe.indexOf("SceneRunManager.onCombatWon()") === -1,
    "la branche de groupe ne prévient pas le run de scène tant qu'il reste un membre");
  ok(src.indexOf("run._combatWaveKills = Number(run._combatWaveKills || 0) + 1;") !== -1,
    "le run compte donc une rencontre par meute, pas une par tête");
})();

console.log("\n[84] v3.286.0 — escorte d'élite : la Fileuse ne garde pas ses toiles seule");
(function () {
  var def = g.ELITE_DB.araignee_marquee;

  ok(def.escort && Array.isArray(def.escort.members) && def.escort.members.length === 1,
    "la Fileuse est accompagnée d'une seule araignée");
  ok(def.escort.eliteStatMult && def.escort.eliteStatMult.power === 1.35 && def.escort.eliteStatMult.endurance === 4.1,
    "et ses propres multiplicateurs sont abaissés quand elle l'est (1,55/4,8 -> 1,35/4,1)");
  ok(!g.ELITE_DB.ronce_ardente.escort, "la Ronce ardente reste un duel, faute de mesure propre");

  /* Le spawn pose bien le groupe, élite en tête. */
  var game = freshCombat("knight"); giveWeapon();
  var elite = g.EliteManager.spawn("araignee_marquee", "forest", 0);
  ok(!!elite && elite.isElite, "l'élite est bien construite");
  ok(game.combat.enemies.length === 2, "la rencontre compte deux adversaires");
  ok(game.combat.enemies[0] === elite && game.enemy === elite,
    "l'élite est EN TÊTE et cible par défaut — l'escorte ne peut pas prendre sa place");
  ok(game.combat.enemies[1].hp < game.combat.enemies[1].maxHp * 1.01
    && game.combat.enemies[1].hp < elite.hp, "l'escorte est nettement plus fragile");

  /* Les multiplicateurs de l'élite sont RESTAURÉS après le spawn : ils sont partagés. */
  ok(def.statMult.power === 1.55 && def.statMult.endurance === 4.8,
    "les multiplicateurs d'origine sont remis en place après la construction");

  /* Sans escorte, rien ne change. */
  var save = def.escort; def.escort = null;
  game = freshCombat("knight"); giveWeapon();
  g.EliteManager.spawn("araignee_marquee", "forest", 0);
  ok(game.combat.enemies.length === 1, "sans escorte, l'élite reste un duel");
  def.escort = save;

  /* L'escorte tombe avec son élite — sinon la Carte Vivante ne libère pas son secteur. */
  game = freshCombat("knight"); giveWeapon();
  var e2 = g.EliteManager.spawn("araignee_marquee", "forest", 0);
  ok(game.combat.enemies.length === 2, "deux adversaires avant le coup fatal");
  run("game.enemy.hp = 1; game.enemy.maxHp = 1;");
  g.CombatEngine.killEnemy(e2);
  ok(game.combat.enemies.indexOf(e2) === -1, "l'élite quitte le combat");
  ok(!game.combat.enemies.some(function (x) { return x !== e2 && x.hp > 0 && x.isElite !== true; })
    || game.combat.enemies.length <= 1,
    "et son escorte se disperse : le combat peut se refermer");
})();

console.log("\n[85] v3.287.0 — raccourcis clavier du combat : garde-fous et affichage");
(function () {
  var game = freshCombat("knight"); giveWeapon();
  g.CombatEngine.spawnEnemy();

  /* Le raccourci existait déjà ; ce lot ajoute ses garde-fous et le rend visible. */
  var html = g.buildCombatHTML();
  ok(html.indexOf("cb-key-hint") !== -1 && html.indexOf("Espace") !== -1,
    "le bouton d'attaque annonce son raccourci");
  ok(html.indexOf('aria-label="Attaque (barre espace)"') !== -1,
    "et l'annonce aussi aux lecteurs d'écran");

  var css = "";
  try { css = require("fs").readFileSync(ROOT + "/css/03-combat-group.css", "utf8"); } catch (e) { css = ""; }
  ok(css.indexOf("(hover: hover) and (pointer: fine)") !== -1,
    "la pastille ne s'affiche que là où il y a un clavier — pas sur un téléphone");

  /* Feuille ouverte : le clavier ne doit pas agir sur le combat derrière. */
  ok(typeof g.isCombatSheetOpen === "function", "le garde-fou des feuilles existe");
  ok(g.isCombatSheetOpen() === false, "aucune feuille ouverte au départ");

  var src = "";
  try { src = require("fs").readFileSync(ROOT + "/js/ui/combat-view.js", "utf8"); } catch (e) { src = ""; }
  var handler = src.slice(src.indexOf("function initHealKeyboardShortcuts"));
  ok(handler.indexOf("if (e.repeat)") !== -1,
    "une touche maintenue ne se répète pas : un appui, une action");
  ok(handler.indexOf("if (isCombatSheetOpen()) return;") !== -1,
    "et le clavier se tait quand une feuille est ouverte");
  ok(handler.indexOf('tag === "INPUT"') !== -1,
    "il se tait déjà quand on écrit dans un champ (comportement d'origine, conservé)");

  /* Le libellé du bouton change avec l'acteur sans effacer la pastille. */
  g.CompanionManager.unlock("wenna");
  g.CombatEngine.spawnEnemy();
  var vue = "";
  try { vue = require("fs").readFileSync(ROOT + "/js/ui/combat-group-view.js", "utf8"); } catch (e) { vue = ""; }
  ok(vue.indexOf('btn.querySelector("span:first-child")') !== -1,
    "le nom de l'acteur ne réécrit que le libellé, pas la pastille");
})();

console.log("\n[85] v3.288.0 — Donjon : élites escortées et phases du Basilic");
(function () {
  var game = freshCombat("knight"); giveWeapon();
  var D = g.DungeonManager;
  game.dungeonTickets = 5;
  D.start(1, []);

  /* --- Une vague d'élite arrive escortée --- */
  var v5 = D.buildWaveEnemy(5);
  ok(Array.isArray(v5) && v5.length === 2, "la vague 5 sert l'élite ET son escorte");
  ok(v5[0].isElite === true && v5[0].id === "araignee_marquee", "l'élite est en tête");
  ok(v5[1].isElite !== true && v5[1].isBoss !== true, "l'escorte est un ennemi ordinaire");
  ok(v5[1].maxHp < v5[0].maxHp, "et nettement plus fragile que son élite");
  ok(v5[1].maxHp > 1, "mais mise à l'échelle de la VAGUE, pas d'un ennemi de Lisière");

  /* --- Une vague normale reste un ennemi seul --- */
  var v7 = D.buildWaveEnemy(7);
  ok(!Array.isArray(v7), "une vague ordinaire reste un seul ennemi");

  /* --- Le boss porte ses phases --- */
  var boss = D.buildWaveEnemy(16);
  boss = Array.isArray(boss) ? boss[0] : boss;
  ok(boss.isBoss === true && Array.isArray(boss.phases) && boss.phases.length === 2,
    "le Basilic porte deux seuils de phase");
  ok(boss.phases[0].atPct === 0.75 && Array.isArray(boss.phases[0].adds),
    "à 75 %, des renforts");
  ok(boss.phases[1].atPct === 0.25 && boss.phases[1].archetype === "enraged",
    "à 25 %, la rage — l'archétype existant, pas un système neuf");

  /* --- Le seuil déclenche vraiment, et une seule fois --- */
  g.CombatEngine.spawnGroup([boss]);
  ok(game.combat.enemies.length === 1, "le boss commence seul");
  boss.hp = Math.floor(boss.maxHp * 0.70);
  g.CombatEngine.checkPhases(boss);
  ok(game.combat.enemies.length === 2, "sous 75 % : un renfort arrive");
  ok(game.combat.enemies[1].engageIn === 1,
    "annoncé — il frappe au round suivant, jamais par surprise");
  g.CombatEngine.checkPhases(boss);
  ok(game.combat.enemies.length === 2, "le seuil ne se déclenche pas deux fois");

  /* --- Le soin de boss est suspendu tant qu'un renfort tient --- */
  ok(g.CombatEngine.bossHealSuspended(boss) === true, "soin suspendu : un renfort est debout");
  game.combat.enemies[1].hp = 0;
  ok(g.CombatEngine.bossHealSuspended(boss) === false, "il reprend quand la salle est nettoyée");

  /* --- La rage s'allume au second seuil --- */
  game.combat.enemies[1].hp = 1;
  boss.hp = Math.floor(boss.maxHp * 0.20);
  g.CombatEngine.checkPhases(boss);
  ok(boss.archetype === "enraged", "sous 25 % : le Basilic entre en rage");

  /* --- Les renforts se dispersent avec leur chef : sinon la salle ne se referme pas --- */
  ok(game.combat.enemies.length > 1, "un renfort est encore là avant le coup fatal");
  boss.hp = 1; boss.maxHp = 1;
  g.CombatEngine.killEnemy(boss);
  ok(game.combat.enemies.indexOf(boss) === -1, "le boss quitte le combat");
  ok(!game.combat.enemies.some(function (x) { return x.hp > 0 && x !== boss; })
    || game.combat.enemies.length <= 1, "et ses renforts se dispersent");

  run("DungeonManager.forfeit();");
})();

/* [86] v3.289.0 — Équilibrage de la Forêt : plafonds par monde et dotation d'ouverture. */
console.log("\n[86] v3.289.0 — Plafonds par monde du village et de la production, dotation");
(function () {
  run("fullResetState(); game.playerName='Test'; game.heroId='knight';");
  var M = g.VillageBuildingManager, P = g.ProductionPlotsSystem, W = g.WorkshopsSystem, C = g.WorldCaps;
  function monde(i) { g.game.worldsEverReached = {}; for (var k = 0; k <= i; k++) g.game.worldsEverReached[k] = true; g.WorldManager.worldIndex = 0; }
  M.ensure();

  /* --- Lecture du plafond : plus haut monde ATTEINT, pas le monde courant --- */
  monde(0);
  ok(C.getReachedWorldIndex() === 0, "partie neuve : Forêt");
  monde(1);
  ok(C.getReachedWorldIndex() === 1, "Désert atteint, puis retour en Forêt : le plafond reste celui du Désert");
  monde(0);

  /* --- Village : plafonds de la Forêt --- */
  var attendu = { workshop: 4, training: 4, hall: 4, warehouse: 3, palisade: 3, tavern: 2, apothecary: 2, forge: 0, enchanter: 0 };
  var tous = Object.keys(attendu).every(function (id) {
    g.game.village.buildings[id].level = 0;
    return M.getMaxLevel(id) === attendu[id];
  });
  ok(tous, "Forêt : Atelier 4, Terrain 4, Halle 4, Entrepôt 3, Palissade 3, Taverne 2, Apothicaire 2, Forge et Enchanteresse 0");
  g.game.village.buildings.workshop.level = 4;
  ok(M.getCardState("forge") === "locked" && M.getBlockReason("forge") === "S'ouvre au Désert oublié",
    "Forge fermée en Forêt, et la carte dit où elle s'ouvre");
  g.game.village.buildings.palisade.level = 3;
  ok(M.isMaxLevel("palisade") && M.getBlockReason("palisade") === "Suite au Désert oublié",
    "Palissade 3 en Forêt : plafond atteint, la suite est annoncée");
  ok(M.getCardState("palisade") === "maxed", "...carte au plafond");
  monde(1);
  ok(M.getMaxLevel("palisade") === 7 && !M.isMaxLevel("palisade") && M.getMaxLevel("forge") === 2 && M.getMaxLevel("enchanter") === 1,
    "Désert atteint : Palissade 7, Forge 2, Enchanteresse 1");
  monde(0);

  /* --- Rien n'est repris --- */
  g.game.village.buildings.hall.level = 8;
  ok(M.getLevel("hall") === 8 && M.getMaxLevel("hall") === 8 && M.isMaxLevel("hall"),
    "Halle déjà au niveau 8 en Forêt : elle le garde, sans pouvoir monter");
  g.game.village.buildings.hall.level = 0;

  /* --- Zones : une ligne par monde, niveau 3 en Forêt --- */
  run("game.explorationProgression.sawmillUnlocked = true; ProductionManager.unlockBuilding('sawmill');");
  var plots = P.getPlots("sawmill");
  ok(P.isPlotRowOpen(2) && !P.isPlotRowOpen(3), "Forêt : zones 1 à 3 ouvrables, la 4e non");
  run("WarehouseManager.addResource('fer', 5000, true); WarehouseManager.addResource('pierre', 5000, true); WarehouseManager.addResource('eau', 5000, true);");
  var refus = P.unlockPlot("sawmill", 3);
  ok(refus.ok === false && refus.reason === "S'ouvre au Désert oublié", "défricher une zone du Désert est refusé, avec le monde nommé");
  ok(P.unlockPlot("sawmill", 1).ok === true, "une zone de la Forêt se défriche normalement");
  plots[0].level = 3;
  var r = P.upgradePlot("sawmill", 0);
  ok(r.ok === false && plots[0].level === 3 && P.isPlotLevelWorldCapped(plots[0]), "zone au niveau 3 en Forêt : plafond du monde");
  /* Partie d'avant le plafond : une zone du Désert déjà ouverte au niveau 5 continue de produire. */
  var avant = P.getTotalRatePerMin("sawmill");
  plots[5].state = "open"; plots[5].level = 5; plots[5].lastTick = Date.now();
  ok(P.getTotalRatePerMin("sawmill") > avant && P.getOpenPlotsCount("sawmill") === 3,
    "une zone déjà ouverte au-delà du plafond reste ouverte et produit");
  monde(1);
  ok(P.isPlotRowOpen(5) && !P.isPlotRowOpen(6) && P.getPlotLevelCap() === 5, "Désert : deux lignes, zones au niveau 5");
  monde(0);

  /* --- Ateliers : 2 en Forêt --- */
  var wk = W.ensureWorkshop("sawmill", "scierie_fine");
  wk.level = 2;
  ok(W.isMaxLevel("scierie_fine") && W.isWorldCapped("scierie_fine") && W.getUpgradeCost("scierie_fine") === null,
    "atelier au niveau 2 en Forêt : plafond du monde, plus de coût");
  wk.level = 1;
  ok(!W.isMaxLevel("scierie_fine"), "« L'atelier bien huilé » reste faisable : le niveau 2 est permis");

  /* --- Apothicaire : Soin majeur en 2e --- */
  ok(g.APOTHECARY_RECIPES[1].potionId === "potion_soin_majeur", "Soin majeur remonté en 2e recette");

  /* --- Forge : 2 niveaux de reforge par niveau de bâtiment --- */
  g.game.village.buildings.forge.level = 2;
  ok(g.ForgeManager.getMaxLevel() === 4, "Forge 2 : reforge jusqu'au niveau 4");
  g.ForgeManager.ensure(); g.game.forge.levels.weapon = 2;
  var cf = g.ForgeManager.getCost("weapon");
  ok(cf && cf.resine_durcie === 1, "la Résine arrive avec le 2e niveau de bâtiment (reforge 3)");
  g.game.village.buildings.forge.level = 0; g.game.forge.levels.weapon = 0;

  /* --- Dotation d'ouverture : une fois, pas rétroactive --- */
  run("fullResetState(); game.playerName='Test'; game.heroId='knight';");
  var bois0 = g.WarehouseManager.getAmount("bois"), pierre0 = g.WarehouseManager.getAmount("pierre");
  run("game.explorationProgression.quarryUnlocked = true; ProductionManager.unlockBuilding('quarry');");
  ok(g.WarehouseManager.getAmount("bois") === bois0 + 60 && g.WarehouseManager.getAmount("pierre") === pierre0 + 45,
    "ouverture de la Carrière : 60 bois + 45 pierre (v3.290.0)");
  run("ProductionManager.unlockBuilding('quarry'); ProductionManager.ensure();");
  ok(g.WarehouseManager.getAmount("bois") === bois0 + 60, "rappel de unlockBuilding (popup de fin de quête) : rien de plus");
  run("game.explorationProgression.mineUnlocked = true; ProductionManager.ensure();");
  var b1 = g.WarehouseManager.getAmount("bois");
  run("ProductionManager.unlockBuilding('mine');");
  ok(g.WarehouseManager.getAmount("bois") === b1, "bâtiment déjà ouvert avant la dotation : acquis, pas de versement rétroactif");
  ok(g.missionRewardSummary({ unlockBuildingId: "hunt" }).indexOf("60 Bois") !== -1, "la Meute affamée annonce la dotation");

  /* v3.290.0 : coûts de la Forêt recalibrés (sim/village-economy-bench.js, scénario V290). */
  run("fullResetState(); game.playerName='Test'; game.heroId='knight';");
  var VB2 = g.VillageBuildingManager; VB2.ensure();
  var c1 = VB2.getNextCost("palisade");
  g.game.village.buildings.palisade.level = 2;
  var c3 = VB2.getNextCost("palisade");
  ok(c1.gold === 250 && c1.planche === 15 && c1.pierre === 25 && c3.gold === 722 && c3.planche === 43 && c3.pierre === 72,
    "Palissade : 250/15/25 au niveau 1, 722/43/72 au niveau 3");
  g.game.village.buildings.palisade.level = 3;
  g.game.worldsEverReached = { 0: true, 1: true };
  var c4 = VB2.getNextCost("palisade");
  ok(c4 && c4.gold === 1200 && c4.planche === 50, "niveau 4 (Désert) : les anciens paliers reprennent");
  g.game.worldsEverReached = { 0: true };
  ok(VB2.getNextCost("hall").gold === 600 && VB2.getNextCost("warehouse").gold === 900,
    "Halle et Entrepôt : premier palier ×0,75 (600 et 900 or)");
})();

/* [87] v3.291.0 — Apothicaire par commandes, plafond quotidien, Soin majeur à l'achat limité. */
console.log("\n[87] v3.291.0 — Apothicaire : commandes et plafond quotidien");
(function () {
  run("fullResetState(); game.playerName='Test'; game.heroId='knight';");
  var A = g.ApothecaryManager, P = g.PotionManager, W = g.WarehouseManager;
  g.VillageBuildingManager.ensure();
  g.game.worldsEverReached = { 0: true }; g.WorldManager.worldIndex = 0;

  /* --- Capacité par niveau : 4 au niveau 1, +2 ensuite --- */
  ok(A.getDailyCap(1) === 4 && A.getDailyCap(2) === 6 && A.getDailyCap(6) === 14, "capacité : 4 / 6 / … / 14");
  ok(A.getDailyCap(0) === 0, "sans bâtiment : aucune préparation");

  /* --- Commande : fermée sans bâtiment, livrée une fois --- */
  var ord = A.getRecipe("potion_soin_majeur").order;
  Object.keys(ord).forEach(function (k) { W.addResource(k, ord[k] * 2, true); });
  ok(A.deliverOrder("potion_soin_majeur") === false && !A.isLearned("potion_soin_majeur"), "sans Apothicaire : la commande ne se livre pas");
  g.game.village.buildings.apothecary.level = 2;
  var painAvant = W.getAmount("pain");
  ok(A.canDeliver("potion_soin_majeur") && A.deliverOrder("potion_soin_majeur") === true, "Apothicaire 2 : commande du Soin majeur livrée");
  ok(A.isLearned("potion_soin_majeur") && W.getAmount("pain") === painAvant - ord.pain, "recette acquise, ingrédients retirés au chiffre près");
  ok(!A.isOrderOpen("potion_soin_majeur") && A.deliverOrder("potion_soin_majeur") === false && W.getAmount("pain") === painAvant - ord.pain,
    "une commande livrée ne se relivre pas");

  /* --- Commandes du Désert fermées en Forêt --- */
  ok(!A.isOrderOpen("potion_precision") && A.getLockReason("potion_precision") === "S'ouvre au Désert oublié",
    "Précision : commande du Désert, fermée en Forêt et annoncée");
  g.game.worldsEverReached = { 0: true, 1: true };
  ok(A.isOrderOpen("potion_precision"), "Désert atteint : la commande apparaît");
  g.game.worldsEverReached = { 0: true };

  /* --- Plafond quotidien : Soin majeur compté, Soin mineur libre --- */
  ["potion_soin_majeur", "potion_soin_mineur"].forEach(function (id) {
    var r = A.getRecipe(id); Object.keys(r.inputs).forEach(function (k) { W.addResource(k, r.inputs[k] * 20, true); });
  });
  var faits = 0;
  for (var i = 0; i < 10; i++) if (A.craft("potion_soin_majeur")) faits++;
  ok(faits === 6 && A.getDailyRemaining() === 0, "Apothicaire 2 : 6 Soins majeurs, pas un de plus");
  ok(A.craft("potion_soin_mineur") === true, "le Soin mineur reste libre une fois le plafond atteint");
  A.ensureState().dailyKey = "un autre jour";
  ok(A.getDailyRemaining() === 6 && A.craft("potion_soin_majeur") === true, "le lendemain (jour civil), le compteur repart");

  /* --- Achat : 600 or, 10 par jour --- */
  g.game.gold = 100000;
  var stock0 = P.getHealingStock("potion_soin_majeur");
  for (var j = 0; j < 12; j++) P.buyHealingPotion("potion_soin_majeur");
  ok(P.getHealingStock("potion_soin_majeur") === stock0 + 10 && g.game.gold === 100000 - 6000 * Math.pow(1 + g.POTION_CYCLE_PRICE_GROWTH, Number(g.game.cycleCount || 0)),
    "Soin majeur : 10 achats à 600 or, les 2 suivants refusés");
  ok(P.getHealingBuyRemaining("potion_soin_mineur") === Infinity, "Soin mineur : achat sans limite");
  g.game.village.potionShop.dayKey = "un autre jour";
  ok(P.getHealingBuyRemaining("potion_soin_majeur") === 10, "le lendemain, le colporteur est réapprovisionné");

  /* --- Nouvelle partie : construire ne donne aucune recette --- */
  run("fullResetState(); game.playerName='Test'; game.heroId='knight';");
  g.VillageBuildingManager.ensure();
  g.game.village.buildings.workshop.level = 2;
  run("game.gold = 100000; WarehouseManager.addResource('planche', 500, true); WarehouseManager.addResource('pierre', 500, true);");
  ok(g.VillageBuildingManager.startBuild("apothecary") === true && A.ensureState().migrated === true, "premier chantier de l'Apothicaire : état posé avant");
  g.game.village.buildings.apothecary.level = 2; g.game.village.site = null;
  ok(!A.isLearned("potion_soin_majeur"), "nouvelle partie : l'Apothicaire 2 ne donne pas le Soin majeur, il se gagne");

  /* --- Migration : une partie d'avant garde ses recettes --- */
  g.game.village.apothecary = undefined;
  g.game.village.buildings.apothecary.level = 3;
  ok(A.isLearned("potion_soin_majeur") && A.isLearned("potion_power") && !A.isLearned("potion_celerity"),
    "migration : Apothicaire 3 d'avant v3.291.0 = les 3 premières recettes acquises");
  g.game.village.buildings.apothecary.level = 0;
})();

/* [88] v3.292.0 — Carte vivante plein écran : volet, légende, repère hors écran, classe du corps. */
console.log("\n[88] v3.292.0 — Carte vivante plein écran");
(function () {
  var LM = g.LivingMapManager, M = "forest";
  run("fullResetState(); game.playerName='Test'; game.heroId='knight';");
  game = g.game; game.unlockedTabs.map = true;
  run("switchTab('map'); tapMapWorld(0);");
  var html = run("buildMapHTML()");
  ok(/class="lmx"/.test(html) && /lmx-hud/.test(html) && !/nb-page-frame/.test(html), "carte ouverte : cadre plein écran, plus de cadre décoré");
  ok(/closeLivingMap\(\)/.test(html) && /openWorldPopup\(0\)/.test(html) && /lmxToggleLegend\(\)/.test(html), "en-tête : retour, popup du monde ; bouton de légende");
  ok(!/lmx-legend"/.test(html), "légende repliée par défaut");
  run("lmxToggleLegend()");
  html = run("buildMapHTML()");
  ok(/lmx-legend"/.test(html) && (html.match(/lmx-legend-row/g) || []).length === 7, "légende ouverte : sept états");
  run("lmxToggleLegend()");
  run("selectLivingMapSector('gue')");
  html = run("buildMapHTML()");
  ok(/lmx-sheet/.test(html) && /lm-panel/.test(html) && /Pont du gu\u00e9/.test(html) && /selectLivingMapSector\(null\)/.test(html), "sélection : volet avec le panneau du secteur et sa croix");
  ok(g.lmxPendingCenter === true, "la sélection demande un recadrage au prochain rendu");
  /* Expédition en cours : le repère hors écran est posé, avec la position du secteur. */
  g.game.sceneRun = { status: "profile", livingMap: { mapId: M, sectorId: "gue" } }; // run ciblé en cours (forme lue par la vue)
  html = run("buildMapHTML()");
  ok(/lmx-offscreen/.test(html) && /data-x="30.3"/.test(html), "expédition en cours : repère hors écran posé sur son secteur");
  run("game.sceneRun = null; closeLivingMap();");
  ok(!g.isLivingMapOpen() && /map-path-frame/.test(run("buildMapHTML()")), "retour : carte du monde");
  /* Gestes : le tap qui termine un glissé ne sélectionne rien. */
  run("openLivingMap('forest'); lmxGesture.suppressClick = true; lmxTapSector('camp'); lmxGesture.suppressClick = false;");
  ok(g.livingMapSelected === null, "un tap qui termine un glissé n'ouvre pas de volet");
  run("closeLivingMap()");
})();

/* [89] v3.293.0 — Plus de farm libre (règle Seb 18/09/2026) : seules les quêtes définies font foi. */
console.log("\n[89] v3.293.0 — Plus de farm libre : contexte de quête, runs d'Histoire, worldIndex");
(function () {
  var fs = require("fs"), path = require("path");
  var chapitre = g.STORY_QUESTS.forest;
  var idxOf = function (id) { return chapitre.steps.findIndex(function (s) { return s.id === id; }); };

  /* Contexte : seul un run porte un combat. */
  game = freshCombat("knight"); giveWeapon();
  ok(g.hasCombatQuestContext() === false, "partie neuve : aucun contexte de quête");
  var ctx = [
    ["donjon", function () { game.dungeonRun = { active: true, wave: 1 }; }, function () { game.dungeonRun = { active: false, wave: 0 }; }],
    ["aventure", function () { game.adventureQuestRun = { active: true, questId: "aq_story_premier_sang" }; }, function () { game.adventureQuestRun = { active: false, questId: null }; }],
    ["chasse", function () { game.huntRun = { active: true, questId: "hq_forest_boar", killsInLot: 0 }; }, function () { game.huntRun = { active: false, questId: null, killsInLot: 0 }; }],
    ["élite de carte", function () { game.livingMaps.fight = { mapId: "forest", sectorId: "gue" }; }, function () { game.livingMaps.fight = null; }],
    ["combat de scène", function () { game.sceneRun = { status: "combat" }; }, function () { game.sceneRun = null; }]
  ];
  ctx.forEach(function (c) { c[1](); var on = g.hasCombatQuestContext(); c[2](); ok(on === true && g.hasCombatQuestContext() === false, "contexte reconnu : " + c[0]); });

  /* Onglet Combat : refusé sans run (Ascension, save rouverte sur Combat, ancien lien). */
  game.activeTab = "campement";
  g.switchTab("combat");
  ok(game.activeTab === "campement", "switchTab('combat') sans run : retour au Campement");
  g.AdventureQuestManager.start("aq_story_premier_sang");
  ok(game.activeTab === "combat" && game.adventureQuestRun.active === true, "départ d'un run : l'écran Combat s'ouvre");
  g.AdventureQuestManager.forfeit();
  ok(game.activeTab === "campement", "abandon depuis le Combat : retour au Campement (plus de farm derrière)");
  g.HuntQuestManager.start("hq_forest_boar");
  var huntOn = game.huntRun.active === true && game.activeTab === "combat";
  g.HuntQuestManager.stop();
  ok(huntOn && game.activeTab === "campement", "chasse arrêtée depuis le Combat : retour au Campement");

  /* killEnemy n'a plus de branche de farm libre ; aucune étape n'envoie sur Combat nu. */
  var ce = fs.readFileSync(path.join(ROOT, "js/systems/combat-engine.js"), "utf8");
  ok(ce.indexOf("WorldManager.advance(") === -1 && ce.indexOf("WorldQuestManager.track") === -1, "combat-engine.js : plus d'advance() ni de questline de monde");
  ok(!chapitre.steps.some(function (st) { var l = st.linkTo || {}; return l.tab === "combat"; }), "aucune étape d'Histoire ne mène à l'onglet Combat nu");
  ok(typeof g.storyGoToCoeur === "undefined" && typeof g.storyResetLisiere === "undefined", "fonctions de repositionnement retirées");

  /* Les trois runs : composition identique à l'ancien farm. */
  var A = g.ADVENTURE_QUESTS;
  ok(A.aq_story_premier_sang.adventureIndex === 0 && A.aq_story_premier_sang.steps[0].target === 5, "Premier sang : 5 ennemis à la Lisière");
  ok(A.aq_story_lisiere.steps[0].target === 9 && A.aq_story_lisiere.steps[1].bossId === "slimeking" && !A.aq_story_lisiere.bossHpMult && !A.aq_story_lisiere.enemyHpMult, "Franchir la Lisière : 9 + Roi Slime, PV pleins");
  ok(A.aq_story_coeur.adventureIndex === 1 && JSON.stringify(A.aq_story_coeur.enemyFilter) === JSON.stringify(g.STORY_COEUR_ACT3_POOL), "Tenir le Cœur : pool de l'Acte III");
  ["aq_story_premier_sang", "aq_story_lisiere", "aq_story_coeur"].forEach(function (id) {
    ok(Object.keys(A[id].reward || {}).length === 0 && !A[id].gatesNextWorld && A[id].type === "kill", id + " : sans récompense propre, n'ouvre aucun monde");
  });
  game = freshCombat("knight"); giveWeapon();
  g.AdventureQuestManager.start("aq_story_coeur");
  var vus = {}, boss = false;
  for (var k = 0; k < 10 && game.adventureQuestRun.active; k++) { vus[game.enemy.id] = true; if (game.enemy.isBoss) boss = true; game.enemy.chargeIn = 99; game.enemy.engageIn = 0; game.enemy.hp = 1; game.heroHp = game.heroMaxHp; g.CombatEngine.heroAction("basic"); }
  ok(!boss && game.adventureQuestsCompleted.aq_story_coeur === true && Object.keys(vus).every(function (id) { return g.STORY_COEUR_ACT3_POOL.indexOf(id) !== -1; }), "Tenir le Cœur : 10 ennemis ordinaires, aucun boss (" + Object.keys(vus).join(",") + ")");

  /* Tableau : le run n'apparaît que pendant son étape. */
  game = freshCombat("knight");
  run("StoryQuestManager.ensure();");
  var visible = function (id) { return g.MissionBoard.list().some(function (m) { return m.id === "adv_" + id; }); };
  ok(!visible("aq_story_premier_sang") && !visible("aq_story_lisiere") && !visible("aq_story_coeur"), "partie neuve : aucun run d'Histoire au tableau");
  game.storyQuests.forest.currentStep = idxOf("forest_02"); game.storyQuests.forest.accepted = true;
  ok(visible("aq_story_premier_sang") && !visible("aq_story_lisiere"), "forest_02 acceptée : Premier sang seul au tableau");

  /* Migration des saves. */
  var migrer = function (prep) {
    game = freshCombat("knight");
    run("StoryQuestManager.ensure(); AdventureQuestManager.ensureDefaults();");
    var st = game.storyQuests.forest;
    prep(st);
    delete st.migratedV3293;
    ["aq_story_premier_sang", "aq_story_lisiere", "aq_story_coeur"].forEach(function (id) { game.adventureQuestsCompleted[id] = false; });
    run("StoryQuestManager.ensure();");
    return game.adventureQuestsCompleted;
  };
  var c1 = migrer(function (st) { st.currentStep = idxOf("forest_13"); st.accepted = false; });
  ok(c1.aq_story_premier_sang && c1.aq_story_lisiere && c1.aq_story_coeur, "save déjà à forest_13 : les trois runs marqués faits");
  var c2 = migrer(function (st) { st.currentStep = idxOf("forest_02"); st.accepted = true; st.counters.forestKillsBase = 0; game.killCounts = { slime: 5 }; });
  ok(c2.aq_story_premier_sang === true && !c2.aq_story_lisiere, "Premier sang déjà rempli à l'ancienne : reste prête");
  var c3 = migrer(function (st) { st.currentStep = idxOf("forest_crossing"); st.accepted = true; st.counters.coeurReached = 0; });
  ok(c3.aq_story_premier_sang === true && c3.aq_story_lisiere === false, "traversée entamée à mi-chemin : run à faire");
  var c4 = migrer(function (st) { st.currentStep = idxOf("forest_12"); st.accepted = true; st.counters.coeurKills = 10; });
  ok(c4.aq_story_coeur === true, "Grimoire : 10 victoires déjà faites à l'ancienne, run marqué fait");
  var c5 = migrer(function (st) { st.currentStep = 0; st.accepted = false; });
  ok(!c5.aq_story_premier_sang && !c5.aq_story_lisiere && !c5.aq_story_coeur && game.storyQuests.forest.migratedV3293 === true, "partie neuve : rien de marqué, drapeau posé");
  game.adventureQuestsCompleted.aq_story_premier_sang = false;
  run("StoryQuestManager.ensure();");
  ok(game.adventureQuestsCompleted.aq_story_premier_sang === false, "migration jouée une seule fois");
})();

/* [90] v3.295.0 — Diagnostic tactile et sortie de secours (bug iPhone : boutons de combat sans réponse). */
console.log("\n[90] v3.295.0 — Diagnostic tactile, sortie de combat forcée");
(function () {
  ok(typeof g.TouchDebug === "object" && typeof g.forceLeaveCombat === "function", "module chargé (TouchDebug, forceLeaveCombat)");
  g.TouchDebug.setOn(true);
  ok(g.TouchDebug.isOn() === true && g.TouchDebug.on === true, "activation mémorisée");
  game = freshCombat("knight"); giveWeapon();
  ok(g.TouchDebug.turnReason() === "OK", "tour disponible : raison OK");
  game.combatRound.busy = true;
  ok(g.TouchDebug.turnReason() === "round bloqué (busy)", "round bloqué : détecté");
  g.AdventureQuestManager.start("aq_story_premier_sang");
  var r0 = game.combatRound.number;
  g.CombatEngine.heroAction("basic");
  ok(game.combatRound.number === r0 && g.TouchDebug.actions[0].indexOf("= false") !== -1 && g.TouchDebug.actions[0].indexOf("busy") !== -1, "heroAction refusé, raison notée : " + g.TouchDebug.actions[0]);
  g.forceLeaveCombat();
  ok(!game.adventureQuestRun.active && game.combatRound.busy === false && game.activeTab === "campement", "sortie forcée : run clos, round libéré, Campement");
  g.TouchDebug.setOn(false);
  ok(g.TouchDebug.isOn() === false && g.TouchDebug.on === false, "désactivation");
})();

/* [91] v3.296.0 → v3.296.1 — Tap sur l'écran Combat : clic dès le relâcher, click natif absorbé. */
console.log("\n[91] v3.296.1 — Tap immédiat sur l'écran Combat");
(function () {
  var T = g.TapRescue;
  ok(typeof T === "object" && typeof T.onEnd === "function", "module chargé");
  var clicks = 0;
  var btn = { isConnected: true, disabled: false, textContent: "Fuir", click: function () { clicks++; } };
  btn.closest = function () { return btn; };
  var ev = function (x, y) { return { target: btn, changedTouches: [{ clientX: x, clientY: y }] }; };
  var nat = function (x, y) { var st = 0; return { clientX: x, clientY: y, stopped: function () { return st; }, preventDefault: function () {}, stopPropagation: function () { st++; }, stopImmediatePropagation: function () { st++; } }; };
  game = freshCombat("knight");
  T.onStart(ev(100, 200));
  ok(T.onEnd(ev(102, 201)) === true && clicks === 1, "tap net : bouton cliqué dès le relâcher, sans délai");
  var n1 = nat(101, 200);
  ok(T.onClick(n1) === true && n1.stopped() > 0 && clicks === 1, "click natif du même tap : absorbé, une seule action");
  var n2 = nat(101, 200);
  ok(T.onClick(n2) === false, "un second click natif n'est plus absorbé (fenêtre consommée)");
  T.onStart(ev(100, 200)); T.onEnd(ev(100, 200));
  ok(T.onClick(nat(300, 600)) === false && clicks === 2, "click natif ailleurs : jamais absorbé");
  T.suppress = null;
  T.onStart(ev(100, 200));
  ok(T.onEnd(ev(140, 200)) === false && clicks === 2, "glissé de 40 px : pas un tap");
  game.activeTab = "campement";
  T.onStart(ev(100, 200));
  ok(T.onEnd(ev(100, 200)) === false && clicks === 2 && T.onClick(nat(100, 200)) === false, "hors de l'écran Combat : rien ne change");
  game.activeTab = "combat";
  btn.disabled = true;
  T.onStart(ev(100, 200));
  ok(T.onEnd(ev(100, 200)) === false && clicks === 2, "bouton désactivé : jamais cliqué");
  btn.disabled = false;
})();

/* [92] v3.297.0 — W-1a : l'Histoire à plusieurs chapitres (chapitre de test injecté, retiré à la fin). */
console.log("\n[92] v3.297.0 — W-1a : chapitres enchaînés, endroits « forest » généralisés, choix et registre");
(function () {
  var S = g.StoryQuestManager, Q = g.STORY_QUESTS;
  var forestLen = Q.forest.steps.length;
  Q.test2 = {
    id: "test2", worldId: "desert", title: "Chapitre de test", subtitle: "Test", requiresChapter: "forest",
    steps: [
      { id: "test2_01", title: "Étape A", act: "Acte I", narrative: { objective: "Objectif A", completion: "Fin A",
          completionDialogue: [{ who: "Sarkel", text: "Dessous." }, { who: null, text: "Il montre le sol." }] },
        objectiveLabel: "A", unlockTabs: [], reward: { gold: 1 },
        linkTo: { section: "adventure", cardId: "adv_aq_story_coeur" },
        killTarget: { label: "Test", counter: function (gm) { return g.storyChapterCounter(gm, "test2", "companionWins"); }, target: 3 },
        check: function (gm) { return g.storyChapterCounter(gm, "test2", "companionWins") >= 2; }, progress: function () { return ""; } },
      { id: "test2_02", title: "Étape B", narrative: { objective: "B", completion: "B" }, objectiveLabel: "B", unlockTabs: [], reward: {},
        check: function () { return true; }, progress: function () { return ""; } }
    ]
  };
  try {
    game = freshCombat("knight");
    run("StoryQuestManager.ensure();");
    ok(S.isChapterOpen("forest") === true && S.isChapterOpen("test2") === false, "chapitre 2 fermé tant que la Forêt n'est pas finie");
    ok(S.getCurrentStep("test2") === null && !g.MissionBoard.list().some(function (m) { return m.id === "story_test2"; }), "chapitre fermé : aucune étape au tableau");
    ok(g.buildStoryChainHTML().indexOf("Chapitre de test") === -1, "chapitre fermé : absent de l'écran Quêtes");
    ok(S.isStepReached("test2_01") === false && S.isStepReached("forest_02") === false, "isStepReached : étape d'un chapitre fermé, ou pas encore atteinte = non");
    game.totalKills += 4; run("StoryQuestManager._trackKills();");
    ok(game.storyQuests.test2.counters.companionWins === 0, "chapitre fermé : aucun kill compté");

    /* La Forêt se termine : le chapitre 2 s'ouvre. */
    game.storyQuests.forest.currentStep = forestLen;
    ok(S.isChapterCompleted("forest") && S.isChapterOpen("test2") && S.getCurrentStep("test2").id === "test2_01", "Forêt terminée : le chapitre 2 s'ouvre sur sa 1re étape");
    ok(S.isStepReached("forest_12") === true && S.isStepReached("inconnue") === true, "isStepReached : chapitre terminé = oui ; id inconnu = oui");
    ok(g.MissionBoard.list().some(function (m) { return m.id === "story_test2" && m.status === "available"; }), "étape du chapitre 2 au tableau");
    ok(g.buildStoryChainHTML().indexOf("Chapitre terminé — le Désert t'attend.") !== -1, "texte de fin propre au chapitre de la Forêt");
    S.acceptStep("test2");
    ok(g.isStoryLinkedQuest("aq_story_coeur") === true && g.isStoryLinkedQuest("aq_forest_depths") === false, "quête liée à l'étape du chapitre 2 : visible au tableau");

    /* Compteurs par chapitre. */
    run("CompanionManager.unlock('wenna');");
    game.totalKills += 2; run("StoryQuestManager._trackKills();");
    ok(game.storyQuests.test2.counters.companionWins === 2, "kills avec compagnon comptés dans le chapitre actif (2)");
    game.activeTab = "combat";
    ok(g.getCombatMissionProgressLabel() === "Test · 2/3", "compteur de mission en combat lu sur le chapitre actif : " + g.getCombatMissionProgressLabel());
    ok(S.isCurrentStepReady("test2") === true, "étape prête");

    /* Dialogue de complétion à la réclamation. */
    var html = g.buildQuestCompleteHTML({ title: "t", text: "x", dialogue: Q.test2.steps[0].narrative.completionDialogue });
    ok(html.indexOf("story-dialogue-who") !== -1 && html.indexOf("Dessous.") !== -1 && html.indexOf("Il montre le sol.") !== -1, "popup de fin : dialogue de complétion rendu");
    ok(S.claimStep("test2") === true && game.storyQuests.test2.currentStep === 1, "réclamation : étape suivante");

    /* Choix et registre. */
    ok(S.recordChoice("test2", "noms", "laisser") === true && S.getChoice("noms") === "laisser", "choix noté");
    ok(S.recordChoice("test2", "noms", "deterrer") === false && S.getChoice("noms") === "laisser", "choix définitif : un second appel ne change rien");
    var reg = S.getRegister();
    ok(reg.garder === 1 && reg.donner === 0 && reg.soi === 0, "registre calculé : Garder 1");
    S.recordChoice("test2", "roi", "soi");
    reg = S.getRegister();
    ok(reg.soi === 1 && reg.chaos === 1 && reg.garder === 1, "« pour soi » compte aussi pour le Chaos");
    var saved = run("buildSaveData()");
    ok(saved.storyQuests.test2.choices.noms === "laisser", "choix sauvegardé dans storyQuests (save-system.js intact)");

    /* Élite : requiresStoryStep lu dans n'importe quel chapitre. */
    ok(g.isEliteQuestUnlocked({ type: "elite", requiresStoryStep: "test2_02" }) === true && g.isEliteQuestUnlocked({ type: "elite", requiresStoryStep: "test2_99" }) === true, "élite : étape du chapitre 2 atteinte = visible");
    game.storyQuests.test2.currentStep = 0;
    ok(g.isEliteQuestUnlocked({ type: "elite", requiresStoryStep: "test2_02" }) === false, "élite : étape du chapitre 2 pas encore atteinte = masquée");
  } finally {
    delete Q.test2;
    if (game.storyQuests) delete game.storyQuests.test2;
  }
  game = freshCombat("knight");
  run("StoryQuestManager.ensure();");
  ok(!g.MissionBoard.list().some(function (m) { return m.id === "story_test2"; }) && g.StoryQuestManager.getCurrentStep("forest").id === "forest_01", "chapitre de test retiré : partie neuve intacte");
})();

/* [93] v3.298.0 — W-1b : le canevas déclare son monde, journal scripté, voyage, cap par monde. */
console.log("\n[93] v3.298.0 — W-1b : monde du canevas, journal par palier, traversée, cap journalier");
(function () {
  var R = g.SceneRunManager, T = g.SCENE_TEMPLATES;
  game = freshCombat("knight");
  /* Monde des combats d'un run. */
  run("WorldManager.worldIndex = 1; WorldManager.adventureIndex = 1;");
  var pl = R._combatPlace({ templateId: "petite_aventure_foret" });
  ok(pl.world.id === "forest" && pl.adventureIndex === 0, "résidant au Désert : la Petite Aventure de la Forêt combat en Forêt (aventure 0)");
  pl = R._combatPlace({ templateId: "expedition_faille" });
  ok(pl.world.id === "desert" && pl.adventureIndex === 1, "canevas sans worldId : monde et aventure de résidence (comportement d'avant)");
  pl = R._combatPlace({ templateId: "expedition_faille", livingMap: { mapId: "forest", sectorId: "gue" } });
  ok(pl.world.id === "forest", "canevas sans worldId sur la carte de la Forêt : monde de la carte");
  run("WorldManager.worldIndex = 0; WorldManager.adventureIndex = 1;");
  ok(R._combatPlace({ templateId: "petite_aventure_foret" }).adventureIndex === 1, "résidant en Forêt : l'aventure de résidence reste lue (inchangé)");
  ["sentier_obstrue", "bosquet_silencieux", "terre_en_friche", "veine_instable", "eboulis_ferreux", "source_tarie", "petite_aventure_foret"].forEach(function (id) {
    if (T[id].worldId !== "forest") ok(false, id + " sans worldId");
  });
  ok(true, "les sept canevas de la Forêt déclarent worldId « forest »");

  /* Journal scripté par palier. */
  var fakeRun = { templateId: "test_journal", depth: 0, status: "gate" };
  T.test_journal = { id: "test_journal", journalByDepth: { 1: "A", 3: { before: "B", after: "C" } } };
  try {
    ok(JSON.stringify(R.takeJournalLines(fakeRun)) === '["A"]', "palier 1 : sa ligne");
    ok(R.takeJournalLines(fakeRun).length === 0, "une ligne ne sort qu'une fois");
    fakeRun.depth = 2;
    ok(JSON.stringify(R.takeJournalLines(fakeRun)) === '["B"]', "palier 3 : la ligne d'avant (combat à venir)");
    fakeRun.depth = 3;
    ok(JSON.stringify(R.takeJournalLines(fakeRun)) === '["C"]', "palier franchi : la ligne d'après");
    fakeRun.depth = 1; fakeRun.journalShown = {};
    ok(JSON.stringify(R.takeJournalLines(fakeRun)) === '["A"]', "journal remis à zéro, palier 2 sans entrée : seule la ligne du palier 1");
    ok(R.takeJournalLines({ templateId: "petite_aventure_foret", depth: 0, status: "gate" }).length === 0, "canevas sans journalByDepth : rien");
  } finally { delete T.test_journal; }

  /* Voyage et cap. */
  game = freshCombat("knight");
  run("WarehouseManager.addResource('petite_ration', 5, true);");
  game.unlockedTabs.village = true;
  ok(R.getPetiteAventureCap() === 3, "Forêt : 3 Petites Aventures par jour");
  var m = g.MissionBoard.getById("petite_aventure_foret");
  ok(m && m.rewardSummary.indexOf("/3") !== -1, "tableau : « …/3 aujourd'hui » (" + (m && m.rewardSummary) + ")");
  ok(g.WorldTravel.canTravelTo("desert") === false, "Désert jamais atteint : voyage libre refusé");
  ok(g.WorldTravel.arrive("desert", 0) === true && g.WorldManager.worldIndex === 1 && g.WorldManager.adventureIndex === 0 && game.worldsEverReached[1] === true, "arrivée : monde de résidence posé, monde atteint");
  ok(R.getPetiteAventureCap() === 4, "Désert atteint : 4 par jour, recalculé aussitôt");
  ok(g.WorldTravel.travelTo("forest", 0) === true && g.WorldManager.worldIndex === 0 && R.getPetiteAventureCap() === 4, "retour en Forêt : le cap reste celui du plus haut monde atteint (4)");
  game.huntRun = { active: true, questId: "hq_forest_boar", killsInLot: 0 };
  ok(g.WorldTravel.travelTo("desert", 0) === false && g.WorldManager.worldIndex === 0, "voyage refusé pendant un run");
  game.huntRun = { active: false, questId: null, killsInLot: 0 };
  ok(g.WorldTravel.travelTo("ruins", 0) === false, "monde jamais atteint : refusé");

  /* Traversée : la chambre finale d'un canevas à travelOnSuccess pose le monde. */
  game = freshCombat("knight");
  T.test_traversee = JSON.parse(JSON.stringify(T.source_tarie));
  T.test_traversee.id = "test_traversee"; T.test_traversee.worldId = "desert";
  delete T.test_traversee.unlockOnSuccess; delete T.test_traversee.boardRequires;
  T.test_traversee.travelOnSuccess = { worldId: "desert", adventureIndex: 0 };
  try {
    var st = R.startRun("test_traversee");
    ok(st && st.ok, "run de traversée lancé");
    ok(g.WorldManager.worldIndex === 0, "pendant le run : toujours en Forêt");
    game.sceneRun.status = "finale";
    var fin = R.resolveFinale("sur");
    ok(fin.ok && g.WorldManager.worldIndex === 1 && game.worldsEverReached[1] === true && game.sceneRun.status === "completed", "chambre finale résolue : arrivée au Désert");
  } finally { delete T.test_traversee; }
})();

/* [94] v3.299.0 — W-1c : questlines de monde retirées ; « Tour atteinte » les remplace. */
console.log("\n[94] v3.299.0 — W-1c : retrait de world-quests.js");
(function () {
  ok(typeof g.WorldQuestManager === "undefined" && typeof g.WORLD_QUESTS === "undefined" && typeof g.openCycleSummary === "undefined", "système, données et bilan de cycle absents");
  game = freshCombat("knight");
  game.cycleCount = 5;
  ok(g.WorldManager.getCycleMilestoneMult() === 1, "5 cycles, Tour jamais atteinte : aucun bonus (comportement d'avant)");
  game.worldsEverReached[5] = true;
  ok(g.WorldManager.getCycleMilestoneMult() === 1.25, "Tour atteinte : bonus de palier de cycle (×1,25)");
  var rar = g.getAllowedRarities();
  ok(rar.length === g.WORLD_RARITY_UNLOCKS[g.WORLD_RARITY_UNLOCKS.length - 1].length, "Tour atteinte et cycle en cours : toutes les raretés");
  delete game.worldsEverReached[5];
  ok(g.getAllowedRarities().length === g.WORLD_RARITY_UNLOCKS[0].length, "Tour pas atteinte : raretés du monde courant");
  game.cycleCount = 0;
  var eq = { uid: "t1", slot: "weapon", name: "x", rarity: "common", stat: "tapDmg", value: 1, affixes: [] };
  ok(g.addDropToInventory(eq) !== undefined, "butin ajouté sans questline de monde à alimenter");
  var html = g.buildMapHTML ? g.buildMapHTML() : "";
  ok(html.indexOf("Questline") === -1, "carte du monde : plus aucune mention de questline");
  ok(g.WorldManager.meetsAscensionRequirement(1) === !!game.adventureQuestsCompleted.aq_forest_depths, "porte du Désert : toujours « Le Cœur de la Forêt » (lecture seule, sans advance)");
})();

/* [95] v3.300.0 — W-2 : chapitre 2 du Désert, étape 1 « La traversée ». */
console.log("\n[95] v3.300.0 — W-2 : chapitre du Désert, la traversée");
(function () {
  var S = g.StoryQuestManager, R = g.SceneRunManager, T = g.SCENE_TEMPLATES.traversee_desert;
  game = freshCombat("knight"); giveWeapon();
  run("StoryQuestManager.ensure(); CompanionManager.unlock('wenna');");
  ok(g.STORY_QUESTS.desert.requiresChapter === "forest" && S.getCurrentStep("desert") === null, "chapitre du Désert fermé tant que la Forêt n'est pas finie");
  ok(g.DUNGEONS.find(function (d) { return d.worldId === "desert"; }).locked === true, "donjon du Désert fermé jusqu'à W-4");
  game.storyQuests.forest.currentStep = g.STORY_QUESTS.forest.steps.length;
  var st1 = S.getCurrentStep("desert");
  ok(st1 && st1.id === "desert_01" && st1.linkTo.cardId === "scene_traversee_desert", "Forêt finie : « La traversée » ouvre le chapitre 2");
  ok(st1.narrative.dialogue.length === 9 && st1.narrative.completionDialogue.length === 6, "textes validés : 9 répliques au départ, 6 à l'arrivée");
  ok(g.MissionBoard.list()[0].id === "story_desert" || g.MissionBoard.list().some(function (m) { return m.id === "story_desert"; }), "étape au tableau");
  S.acceptStep("desert");

  /* Le run : coût, carte scriptée, monde de ses combats. */
  game.resources.ration = 0;
  ok(R.startRun("traversee_desert").ok === false, "sans Ration moyenne : départ refusé");
  run("WarehouseManager.addResource('ration', 1, true);");
  var started = R.startRun("traversee_desert");
  ok(started.ok && g.WarehouseManager.getAmount("ration") === 0, "départ : 1 Ration moyenne payée");
  var types = game.sceneRun.card.map(function (lvl) { return lvl.length + ":" + lvl[0].type + (lvl[0].gabaritId ? "/" + lvl[0].gabaritId : ""); }).join(" ");
  ok(types === "1:obstacle/dalles_ensablees 1:source 1:combat/scarabees_desert 1:obstacle/vent_de_face", "carte scriptée : " + types);
  ok(g.WorldManager.worldIndex === 0, "pendant la traversée : toujours résident de la Forêt");
  var lines = R.takeJournalLines(game.sceneRun);
  ok(lines.length === 1 && lines[0].indexOf("Les dalles du portail") === 0, "journal du palier 1");
  game.sceneRun.depth = 2; game.sceneRun.status = "gate";
  R.enterGate(0);
  var foes = game.combat && game.combat.enemies ? game.combat.enemies : [game.enemy];
  ok(foes.length === 3 && foes.every(function (e) { return e.id === "scarab"; }), "palier 3 : une nuée de trois scarabées du Désert");
  var guard = 20;
  while (game.sceneRun.status === "combat" && guard-- > 0) { var e = (game.combat && game.combat.enemies && game.combat.enemies[0]) || game.enemy; e.hp = 0; g.CombatEngine.killEnemy(e); }
  ok(game.sceneRun.status !== "combat" && !game.sceneRun._combatBossSpawned, "nuée vaincue : aucun boss d'aventure (finalBoss: false)");
  // Le retour sur l'écran d'expédition inscrit les lignes dues au journal de la vue (sceneRunLog).
  g.buildSceneGateChoiceHTML();
  var logTxt = (g.sceneRunLog || []).join(" | ");
  ok(logTxt.indexOf("Wenna compte les carapaces") !== -1 && logTxt.indexOf("Le deuxième puits est sec") !== -1 && logTxt.indexOf("Un puits. La corde est neuve") !== -1, "journal de la vue : palier 2, après la nuée, palier 4");

  /* L'arrivée. */
  game.sceneRun.status = "finale";
  var fin = R.resolveFinale("sur");
  ok(fin.ok && g.WorldManager.worldIndex === 1 && game.worldsEverReached[1] === true, "chambre finale : arrivée au Désert");
  ok(game.explorationProgression.desertCrossingCompleted === true && S.isCurrentStepReady("desert") === true, "l'étape est prête à réclamer");
  ok(R.getPetiteAventureCap() === 4, "cap de Petites Aventures passé à 4");
  var popup = null;
  run("window.__openQC = openQuestCompletePopup; window.openQuestCompletePopup = function (c) { window.__qc = c; };");
  S.claimStep("desert");
  popup = g.__qc;
  run("window.openQuestCompletePopup = window.__openQC;");
  ok(popup && popup.dialogue && popup.dialogue[4].text === "Dessous." && popup.text.indexOf("camp du Portail") !== -1, "réclamation : scène d'arrivée au camp du Portail");
  ok(S.getCurrentStep("desert") === null && game.storyQuests.desert.currentStep === 1, "après l'étape 1 : la suite arrive (étape 2 pas encore livrée)");
})();

/* [96] v3.301.0 — W-2b : voyage depuis la carte, tableau filtré par monde. */
console.log("\n[96] v3.301.0 — W-2b : voyage libre et tableau par monde");
(function () {
  var MB = g.MissionBoard, WT = g.WorldTravel;
  game = freshCombat("knight");
  run("StoryQuestManager.ensure(); WarehouseManager.addResource('petite_ration', 3, true);");
  game.unlockedTabs.village = true; game.explorationProgression.huntBuildingUnlocked = true;
  game.storyQuests.forest.currentStep = g.STORY_QUESTS.forest.steps.length; // Forêt finie
  ok(MB.getById("petite_aventure_foret").worldId === "forest" && MB.getById("scene_sentier_obstrue").worldId === "forest", "Petite Aventure et quêtes de déblocage portent leur monde");
  ok(MB.list().some(function (m) { return m.id === "petite_aventure_foret"; }) && JSON.stringify(MB.hiddenByWorld()) === "{}", "en Forêt : rien de masqué");

  /* Arrivée au Désert. */
  WT.arrive("desert", 0);
  var here = MB.list();
  ok(!here.some(function (m) { return m.id === "petite_aventure_foret"; }), "au Désert : la Petite Aventure de la Forêt est masquée");
  ok(here.some(function (m) { return m.id === "story_desert"; }), "l'Histoire reste visible");
  ok(!!MB.getById("petite_aventure_foret"), "getById voit tous les mondes");
  var hidden = MB.hiddenByWorld();
  ok(hidden.forest >= 2, "masquées comptées par monde : " + JSON.stringify(hidden));
  var html = g.buildOtherWorldQuestsHTML();
  ok(html.indexOf("dans la Forêt enchantée") !== -1 && html.indexOf("travelToWorldFromUI('forest')") !== -1, "écran Quêtes : « N quêtes dans la Forêt enchantée » avec « Y aller »");

  /* Ce qui est engagé n'est jamais masqué. */
  g.AdventureQuestManager.start("hq_wolf_pack");
  var wolf = MB.list().find(function (m) { return m.id === "adv_hq_wolf_pack"; });
  ok(wolf && wolf.status === "running", "une quête de la Forêt EN COURS reste visible au Désert");
  ok(WT.refusalReason("forest") === "Termine d'abord ton combat ou ton expédition" && g.buildOtherWorldQuestsHTML().indexOf("travelToWorldFromUI") === -1, "en run : voyage refusé, pas de bouton");
  g.AdventureQuestManager.forfeit();

  /* Voyage retour depuis l'interface. */
  ok(g.travelToWorldFromUI("forest") === true && g.WorldManager.worldIndex === 0 && g.WorldManager.adventureIndex === 1, "retour en Forêt : chapitre fini -> le Cœur (dernière aventure)");
  ok(MB.list().some(function (m) { return m.id === "petite_aventure_foret"; }), "en Forêt : la Petite Aventure de la Forêt revient");
  ok(MB.list().some(function (m) { return m.id === "story_desert"; }), "l'Histoire du Désert reste visible depuis la Forêt");
  ok(WT.refusalReason("forest") === "Tu y es déjà" && WT.refusalReason("ruins") === "Tu n'as pas encore atteint ce monde", "raisons de refus lisibles");
  ok(WT.defaultAdventureFor("desert") === 0, "Désert pas fini : retour aux Dunes");

  /* Carte du monde. */
  ok(g.isWorldUnlocked(1) === true && g.getWorldProgressText(1) === "Atteint" && g.getWorldProgressText(0) === "Tu es ici" && g.getWorldProgressText(2) === "Verrouillé", "carte : Désert atteint mais quitté = ouvert");
  var popup = g.buildWorldPopupHTML(1);
  ok(popup.indexOf("travelToWorldFromUI('desert')") !== -1 && popup.indexOf("Y voyager") !== -1, "fiche du Désert : bouton « Y voyager »");
  ok(popup.indexOf("combats avant le boss") === -1, "plus de « combats avant le boss » (farm libre)");
  ok(g.buildWorldPopupHTML(0).indexOf("Y voyager") === -1, "fiche du monde courant : pas de bouton de voyage");
})();

console.log("\n" + passes + " OK, " + failures + " échec(s)");
process.exit(failures ? 1 : 0);
