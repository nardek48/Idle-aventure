"use strict";
/* js/sim/combat-round-sim.js — simulateur PUR de combat par rounds (P1, ligne directrice §5). Zéro accès à game.* :
   données (héros, ennemis, boss, kits) et coefficients injectés. Chargé par index.html (bac à sable) et par les harnais Node.
   v3.102.3 : aligné sur le moteur réel (P2) — kits en rounds (cooldownRounds/durationRounds/percentPerRound), patterns
   télégraphe→impact (charge ×1,3, bouclier boss 2 rounds −50 %, soin boss 15 %), contres par les actions `counters`. */

/* Coefficients du modèle par rounds. Les formules de stats-system.js sont conservées ; seuls les
   coefficients marqués (round) sont nouveaux ou recalibrés par P1. */
var ROUND_MODEL_DEFAULTS = {
  heroPowerCoef: 0.20,        // dégâts de l'Attaque = 1 + power * coef (= FORCE_TAP_COEF actuel)
  heroCritBase: 5,            // % de base (constants actuelles)
  precisionCritCoef: 0.06,
  willCritMultCoef: 0.01,
  critMultBase: 2,
  enduranceHpExp: 0.75,
  enduranceHpCoef: 17.716,
  heroDefenseCoef: 0.002,
  heroDefenseCap: 0.6,
  heroDefenseCapActive: 0.85,
  willCritResistCoef: 0.05,   // WILL_CRIT_RESIST_COEF actuel
  resistMult: 0.7,
  weakMult: 1.3,
  enemyHpCoef: 4.0,           // (round) ENEMY_PV_MULT actuel = 4.0 — à recalibrer
  bossHpCoef: 6.7,            // (round) BOSS_PV_MULT actuel
  enemyDmgCoef: 0.5,          // (round) ENEMY_POWER_DMG_COEF actuel
  bossDmgMult: 1.0,           // (round) multiplicateur de dégâts du boss (minions vs boss) — à calibrer
  enemyPrecisionCritCoef: 0.3,
  enemyCritMult: 1.5,
  celerityGaugePerAction: 1.0, // (round) jauge += célérité * coef par action offensive ; à 100 → frappe bonus
  enemyCelerityGaugeCoef: 1.0, // (round) idem côté ennemi
  bossHealEveryRounds: 5,     // (round) soin boss : télégraphe au round 5, impact (remplace la frappe) au round 6
  bossHealPercent: 0.15,
  chargeRoundsMin: 3,         // (round) charge des ennemis normaux : compte à rebours 3-5, télégraphe puis impact ×1,3
  chargeRoundsMax: 5,
  chargeDmgMult: 1.3,
  shieldRoundsMin: 4,         // (round) bouclier boss : compte à rebours 4-6, télégraphe puis 2 rounds à −50 %
  shieldRoundsMax: 6,
  shieldDurationRounds: 2,
  shieldReduction: 0.5,
  patternsEnabled: true,      // false = modèle P1 d'origine (frappe simple, soin boss seul)
  potionHealPct: 0.35,        // décision §10 n°10
  potionsPerSortie: 2,
  engageEnabled: true,        // v3.105.0 (distance) : face à un héros arc/magie, l'ennemi met engageIn rounds à arriver
  engageDefaultRounds: 1,     // défaut si absent de engageTable ; 0 = il frappe lui-même à distance
  engageBossRounds: 1,
  engageTable: {},            // par id d'ennemi — injecter ENEMY_ENGAGE_ROUNDS pour coller au jeu
  manaPassivePerRound: 8,     // passivePerSecond 4 × ~2 s par round
  msPerRound: 2500            // conversion des cooldowns/durées ms → rounds (ceil)
};

function rsClone(o) { return JSON.parse(JSON.stringify(o)); }
function rsMerge(base, over) {
  var out = rsClone(base);
  Object.keys(over || {}).forEach(function (k) { out[k] = over[k]; });
  return out;
}
function msToRounds(ms, cfg) {
  if (!ms || ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / cfg.msPerRound));
}

/* RNG déterministe (mulberry32) — les runs sont reproductibles à graine égale. */
function makeRng(seed) {
  var a = (seed >>> 0) || 1;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    var t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Construction des combattants ---------- */

/* hero : { classId, weaponType, stats {power,endurance,celerity,precision,will}, trained {...}, talents? } */
function buildHero(heroDef, kit, cfg) {
  var s = heroDef.stats, t = heroDef.trained || {};
  var power = s.power + (t.power || 0);
  var endurance = s.endurance + (t.endurance || 0);
  var celerity = s.celerity + (t.celerity || 0);
  var precision = s.precision + (t.precision || 0);
  var will = s.will + (t.will || 0);
  var maxHp = cfg.flatHeroHp || Math.max(1, Math.floor(Math.pow(endurance, cfg.enduranceHpExp) * cfg.enduranceHpCoef)); // flatHeroHp : variante d'analyse
  var actions = {};
  Object.keys(kit.actions).forEach(function (slot) {
    var a = kit.actions[slot];
    actions[slot] = {
      slot: slot, id: a.id, label: a.label, type: a.type,
      damageMultiplier: a.damageMultiplier == null ? 1 : a.damageMultiplier,
      hits: a.hits || 1,
      resourceCost: a.resourceCost || 0,
      counters: a.counters || [],
      cooldownRounds: (typeof a.cooldownRounds === "number") ? a.cooldownRounds : msToRounds(a.cooldownMs, cfg),
      effects: (a.effects || []).map(function (e) {
        return {
          type: e.type, value: e.value,
          durationRounds: (typeof e.durationRounds === "number") ? e.durationRounds : msToRounds(e.durationMs, cfg),
          percentPerRound: (typeof e.percentPerRound === "number") ? e.percentPerRound : (e.percentPerSecond ? e.percentPerSecond * 2.5 : 0.5)
        };
      })
    };
  });
  return {
    classId: heroDef.classId, weaponType: heroDef.weaponType,
    ranged: heroDef.weaponType !== "sword", // v3.105.0 : arc/magie profitent de l'approche, l'épée est au contact
    power: power, endurance: endurance, celerity: celerity, precision: precision, will: will,
    attack: Math.max(1, Math.floor(1 + power * cfg.heroPowerCoef)),
    critChance: cfg.heroCritBase + precision * cfg.precisionCritCoef + (heroDef.bonusCritChance || 0),
    critMult: cfg.critMultBase + will * cfg.willCritMultCoef,
    maxHp: maxHp, hp: maxHp,
    defense: Math.min(cfg.heroDefenseCap, endurance * cfg.heroDefenseCoef + (heroDef.equipDefensePct || 0)),
    resource: { id: kit.resource.id, max: kit.resource.max, value: kit.resource.initial, generation: kit.resource.generation },
    actions: actions,
    cooldowns: {}, gauge: 0, potions: cfg.potionsPerSortie,
    activeDefense: null, // { effectType, value, roundsLeft }
    enemyVulnerability: null
  };
}

/* enemy : { id, name, stats, resists, weak, isBoss } ; scale = facteur de PV/puissance (monde/aventure) */
function buildEnemy(def, isBoss, scale, cfg) {
  var s = def.stats;
  var hpCoef = isBoss ? cfg.bossHpCoef : cfg.enemyHpCoef;
  var hp = Math.floor(s.endurance * hpCoef * scale);
  var neutral = isBoss && cfg.bossNeutral; // variante d'analyse : boss sans résistance/faiblesse
  var power = Math.floor(s.power * Math.pow(scale, 0.3));
  return {
    id: def.id, name: def.name, isBoss: !!isBoss,
    stats: { power: power, endurance: s.endurance, celerity: s.celerity, precision: s.precision, will: s.will },
    resists: neutral ? [] : (def.resists || []), weak: neutral ? [] : (def.weak || []),
    maxHp: hp, hp: hp,
    dmg: Math.max(1, Math.floor(power * cfg.enemyDmgCoef * (isBoss ? cfg.bossDmgMult : 1))),
    critChance: Math.min(40, s.precision * cfg.enemyPrecisionCritCoef),
    gauge: 0, dot: null, vulnerableRounds: 0, roundsAlive: 0, engageIn: 0,
    chargeIn: 0, chargeTelegraphed: false, shieldIn: 0, shieldTelegraphed: false, shieldRounds: 0, healIn: cfg.bossHealEveryRounds, healTelegraphed: false
  };
}

/* Télégraphe en cours de l'ennemi → id de condition Grimoire (pour les contres). */
function pendingCondition(enemy) {
  if (enemy.healTelegraphed) return "healIncoming";
  if (enemy.shieldTelegraphed) return "shieldIncoming";
  if (enemy.chargeTelegraphed) return "chargeIncoming";
  return null;
}

/* ---------- Résolution d'un round ---------- */

function heroHitDamage(hero, enemy, mult, rng, deterministic, cfg) {
  var base = hero.attack * mult;
  var typeMult = 1;
  if (enemy.resists.indexOf(hero.weaponType) !== -1) typeMult = cfg.resistMult;
  else if (enemy.weak.indexOf(hero.weaponType) !== -1) typeMult = cfg.weakMult;
  var critChance = Math.max(0, hero.critChance - enemy.stats.will * cfg.willCritResistCoef) / 100;
  var dmg;
  if (deterministic) {
    dmg = base * typeMult * (1 + critChance * (hero.critMult - 1));
  } else {
    dmg = base * typeMult * (rng() < critChance ? hero.critMult : 1);
  }
  if (enemy.vulnerableRounds > 0) dmg *= 1.20;
  if (enemy.shieldRounds > 0) dmg *= (1 - cfg.shieldReduction);
  return Math.max(1, Math.floor(dmg));
}

function applyHeroDamage(hero, enemy, dmg, isBasic) {
  enemy.hp = Math.max(0, enemy.hp - dmg);
  var gen = hero.resource.generation;
  if (gen.type === "damageDealtPercent") {
    hero.resource.value = Math.min(hero.resource.max, hero.resource.value + Math.min(gen.maxGainPerHit || 20, dmg * gen.value));
  } else if (gen.type === "successfulBasicAttack" && isBasic) {
    hero.resource.value = Math.min(hero.resource.max, hero.resource.value + gen.value);
  } else if (gen.type === "passiveAndBasicAttack" && isBasic) {
    hero.resource.value = Math.min(hero.resource.max, hero.resource.value + (gen.basicAttackGain || 0));
  }
}

function performHeroAction(hero, enemy, slot, rng, det, cfg, log) {
  var a = hero.actions[slot];
  if (slot === "potion") {
    hero.potions -= 1;
    hero.hp = Math.min(hero.maxHp, hero.hp + Math.floor(hero.maxHp * cfg.potionHealPct));
    log.decisions += 1;
    return;
  }
  if (a.resourceCost) hero.resource.value -= a.resourceCost;
  if (a.cooldownRounds) hero.cooldowns[slot] = a.cooldownRounds;
  if (slot !== "basic") log.decisions += 1;

  // contre (moteur réel : une action dont `counters` contient le télégraphe en cours l'annule et relance le compte à rebours)
  var pending = pendingCondition(enemy);
  if (pending && a.counters.indexOf(pending) !== -1) {
    if (pending === "chargeIncoming") { enemy.chargeTelegraphed = false; enemy.chargeIn = randRange(rng, cfg.chargeRoundsMin, cfg.chargeRoundsMax); }
    if (pending === "shieldIncoming") { enemy.shieldTelegraphed = false; enemy.shieldIn = randRange(rng, cfg.shieldRoundsMin, cfg.shieldRoundsMax); }
    if (pending === "healIncoming") { enemy.healTelegraphed = false; enemy.healIn = cfg.bossHealEveryRounds; }
    log.counters += 1;
  }

  if (a.type === "damage") {
    var total = 0, last = 0;
    for (var h = 0; h < a.hits; h++) {
      if (enemy.hp <= 0) break;
      var d = heroHitDamage(hero, enemy, a.damageMultiplier, rng, det, cfg);
      applyHeroDamage(hero, enemy, d, slot === "basic");
      total += d; last = d;
    }
    log.heroDamage += total;
    a.effects.forEach(function (e) {
      if (e.type === "enemyVulnerability") enemy.vulnerableRounds = e.durationRounds || 2;
      if (e.type === "damageOverTime") enemy.dot = { rounds: e.durationRounds || 2, perRound: Math.floor(last * (e.percentPerRound || 0.5)) };
    });
    // jauge de célérité (décision §10 n°1) : action offensive → jauge += célérité ; à 100, frappe bonus
    hero.gauge += hero.celerity * cfg.celerityGaugePerAction;
    if (hero.gauge >= 100 && enemy.hp > 0) {
      hero.gauge -= 100;
      var bonus = heroHitDamage(hero, enemy, 1, rng, det, cfg);
      applyHeroDamage(hero, enemy, bonus, true);
      log.heroDamage += bonus;
      log.bonusStrikes += 1;
    }
  } else if (a.type === "defense") {
    var eff = a.effects[0] || { type: "damageReduction", value: 0.5 };
    hero.activeDefense = { effectType: eff.type, value: eff.value, roundsLeft: eff.durationRounds || 1 };
  }
}

function randRange(rng, min, max) { return min + Math.floor(rng() * (max - min + 1)); }

function enemyStrike(hero, enemy, rng, det, cfg, log, mult) {
  var dmg = enemy.dmg * (mult || 1);
  var crit = enemy.critChance / 100;
  if (det) dmg = dmg * (1 + crit * (cfg.enemyCritMult - 1));
  else if (rng() < crit) dmg = dmg * cfg.enemyCritMult;
  var cap = hero.activeDefense ? cfg.heroDefenseCapActive : cfg.heroDefenseCap;
  dmg = dmg * (1 - Math.min(cap, hero.defense));
  if (hero.activeDefense) {
    var ad = hero.activeDefense;
    if (ad.effectType === "damageReduction" || ad.effectType === "damageAbsorption") dmg *= (1 - ad.value);
    else if (ad.effectType === "evasion") dmg = det ? dmg * (1 - ad.value) : (rng() < ad.value ? 0 : dmg);
  }
  dmg = Math.max(0, Math.floor(dmg));
  hero.hp = Math.max(0, hero.hp - dmg);
  log.enemyDamage += dmg;
  if (mult) return; // impact de pattern : pas de jauge (comme le moteur réel)
  // jauge de célérité ennemie : le loup mord deux fois
  enemy.gauge += enemy.stats.celerity * cfg.enemyCelerityGaugeCoef;
  if (enemy.gauge >= 100 && hero.hp > 0) {
    enemy.gauge -= 100;
    var d2 = Math.max(0, Math.floor(enemy.dmg * (1 - Math.min(cap, hero.defense)) * (hero.activeDefense && hero.activeDefense.effectType !== "evasion" ? (1 - hero.activeDefense.value) : 1)));
    hero.hp = Math.max(0, hero.hp - d2);
    log.enemyDamage += d2;
    log.enemyBonusStrikes += 1;
  }
}

/* Politique « joueur raisonnable » (déterministe, documentée §6) — remplaçable par une politique Grimoire. */
function defaultPolicy(hero, enemy) {
  var ready = function (slot) {
    var a = hero.actions[slot];
    return a && !(hero.cooldowns[slot] > 0) && hero.resource.value >= (a.resourceCost || 0);
  };
  var hpPct = hero.hp / hero.maxHp;
  var threat = enemy.dmg / hero.maxHp;
  if (hero.potions > 0 && hpPct < 0.30) return "potion";
  // contre : un télégraphe est en cours et une action de contre est prête (comme une règle de Grimoire)
  var pending = pendingCondition(enemy);
  if (pending) {
    var slots = ["defense", "skill1", "skill2", "skill3"];
    for (var i = 0; i < slots.length; i++) {
      if (ready(slots[i]) && hero.actions[slots[i]].counters.indexOf(pending) !== -1) return slots[i];
    }
  }
  if (ready("defense") && hpPct < 0.40 && threat >= 0.08 && !hero.activeDefense) return "defense";
  if (ready("skill3") && enemy.hp > hero.attack * 2) return "skill3";
  if (ready("skill2") && (enemy.isBoss || enemy.hp > hero.attack * 3)) return "skill2";
  if (ready("skill1") && enemy.hp > hero.attack * 1.2) return "skill1";
  return "basic";
}

/* Un combat complet. Retourne { won, rounds, decisions, heroHpLeft, ... } */
function simulateFight(hero, enemy, cfg, opts) {
  opts = opts || {};
  var rng = opts.rng || makeRng(1);
  var det = !!opts.deterministic;
  var policy = opts.policy || defaultPolicy;
  var log = { rounds: 0, decisions: 0, heroDamage: 0, enemyDamage: 0, bonusStrikes: 0, enemyBonusStrikes: 0, counters: 0, patternImpacts: 0 };
  var maxRounds = opts.maxRounds || 200;
  if (cfg.patternsEnabled) {
    if (!enemy.isBoss && !enemy.chargeIn) enemy.chargeIn = randRange(rng, cfg.chargeRoundsMin, cfg.chargeRoundsMax);
    if (enemy.isBoss && !enemy.shieldIn) enemy.shieldIn = randRange(rng, cfg.shieldRoundsMin, cfg.shieldRoundsMax);
  }
  // v3.105.0 (distance) : face à un héros arc/magie, l'ennemi met engageIn rounds à arriver (table fixe, défaut cfg)
  if (cfg.engageEnabled && hero.ranged) {
    var eng = cfg.engageTable.hasOwnProperty(enemy.id) ? cfg.engageTable[enemy.id] : cfg.engageDefaultRounds;
    if (enemy.isBoss) eng = cfg.engageBossRounds;
    enemy.engageIn = Math.max(0, eng);
  }

  while (hero.hp > 0 && enemy.hp > 0 && log.rounds < maxRounds) {
    log.rounds += 1;
    // début de round : cooldowns, mana passif, DoT, vulnérabilité
    Object.keys(hero.cooldowns).forEach(function (k) { if (hero.cooldowns[k] > 0) hero.cooldowns[k] -= 1; });
    if (hero.resource.generation.type === "passiveAndBasicAttack") {
      hero.resource.value = Math.min(hero.resource.max, hero.resource.value + cfg.manaPassivePerRound);
    }
    if (enemy.dot && enemy.dot.rounds > 0) { enemy.hp = Math.max(0, enemy.hp - enemy.dot.perRound); log.heroDamage += enemy.dot.perRound; enemy.dot.rounds -= 1; }
    if (enemy.hp <= 0) break;

    // tour du héros
    var slot = policy(hero, enemy);
    performHeroAction(hero, enemy, slot, rng, det, cfg, log);
    if (enemy.hp <= 0) break;

    // tour de l'ennemi : impact du pattern télégraphié (remplace la frappe), sinon frappe ; puis compte à rebours
    enemy.roundsAlive += 1;
    if (enemy.shieldRounds > 0) enemy.shieldRounds -= 1;
    var impact = false;
    if (cfg.patternsEnabled) {
      if (enemy.healTelegraphed) {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + Math.floor(enemy.hp * cfg.bossHealPercent));
        enemy.healTelegraphed = false; enemy.healIn = cfg.bossHealEveryRounds; impact = true;
      } else if (enemy.shieldTelegraphed) {
        enemy.shieldRounds = cfg.shieldDurationRounds;
        enemy.shieldTelegraphed = false; enemy.shieldIn = randRange(rng, cfg.shieldRoundsMin, cfg.shieldRoundsMax); impact = true;
      } else if (enemy.chargeTelegraphed) {
        enemyStrike(hero, enemy, rng, det, cfg, log, cfg.chargeDmgMult);
        enemy.engageIn = 0; // la charge le porte au contact
        enemy.chargeTelegraphed = false; enemy.chargeIn = randRange(rng, cfg.chargeRoundsMin, cfg.chargeRoundsMax); impact = true;
      }
      if (impact) log.patternImpacts += 1;
    } else if (enemy.isBoss && cfg.bossHealEveryRounds && enemy.roundsAlive % cfg.bossHealEveryRounds === 0) {
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + Math.floor(enemy.maxHp * cfg.bossHealPercent));
      impact = true;
    }
    if (!impact) {
      var approaching = enemy.engageIn > 0;
      if (approaching) {
        // approche : il avance au lieu de frapper, sa jauge se remplit (il arrive « lancé »)
        enemy.engageIn -= 1;
        enemy.gauge += enemy.stats.celerity * cfg.enemyCelerityGaugeCoef;
      } else {
        enemyStrike(hero, enemy, rng, det, cfg, log);
      }
      if (cfg.patternsEnabled && hero.hp > 0) { // les compte à rebours tournent même pendant l'approche
        if (enemy.isBoss) {
          if (!enemy.healTelegraphed && !enemy.shieldTelegraphed) {
            enemy.healIn -= 1; enemy.shieldIn -= 1;
            if (enemy.healIn <= 0) enemy.healTelegraphed = true;
            else if (enemy.shieldIn <= 0) enemy.shieldTelegraphed = true;
          }
        } else if (!enemy.chargeTelegraphed) {
          enemy.chargeIn -= 1;
          if (enemy.chargeIn <= 0) enemy.chargeTelegraphed = true;
        }
      }
    }
    if (enemy.vulnerableRounds > 0) enemy.vulnerableRounds -= 1;
    if (hero.activeDefense) { hero.activeDefense.roundsLeft -= 1; if (hero.activeDefense.roundsLeft <= 0) hero.activeDefense = null; }
  }
  log.won = enemy.hp <= 0 && hero.hp > 0;
  log.heroHpLeft = hero.hp;
  return log;
}

/* Une sortie : `fights` ennemis normaux (tirés du pool, cycliquement) puis le boss. PV, ressource, jauge et
   potions du héros persistent entre les combats (pas de soin). Retourne le résumé demandé par §6. */
function simulateSortie(heroDef, kit, pool, bossDef, cfg, opts) {
  opts = opts || {};
  var hero = buildHero(heroDef, kit, cfg);
  var rng = opts.rng || makeRng(opts.seed || 1);
  var fights = opts.fights || 8;
  var scale = opts.scale || 1;
  var res = { won: false, fights: 0, rounds: 0, decisions: 0, diedAt: null, bossReached: false, potionsUsed: 0, hpPctLeft: 0, hpPctAtBoss: 0 };
  var i;
  for (i = 0; i < fights; i++) {
    var def = pool[i % pool.length];
    var enemy = buildEnemy(def, false, scale + i * 0.05, cfg);
    var f = simulateFight(hero, enemy, cfg, { rng: rng, deterministic: opts.deterministic });
    res.rounds += f.rounds; res.decisions += f.decisions; res.fights += 1;
    if (!f.won) { res.diedAt = "fight " + (i + 1) + " (" + def.name + ")"; res.potionsUsed = cfg.potionsPerSortie - hero.potions; return res; }
  }
  res.bossReached = true;
  res.hpPctAtBoss = hero.hp / hero.maxHp;
  var boss = buildEnemy(bossDef, true, scale, cfg);
  var fb = simulateFight(hero, boss, cfg, { rng: rng, deterministic: opts.deterministic });
  res.rounds += fb.rounds; res.decisions += fb.decisions; res.fights += 1;
  res.potionsUsed = cfg.potionsPerSortie - hero.potions;
  if (!fb.won) { res.diedAt = "boss (" + bossDef.name + ")"; return res; }
  res.won = true; res.hpPctLeft = hero.hp / hero.maxHp;
  return res;
}

/* RPT / RPM déterministes pour un duel héros frais vs ennemi (héros n'utilise que l'Attaque : borne basse). */
function duelBudget(heroDef, kit, enemyDef, isBoss, cfg, scale) {
  var hero = buildHero(heroDef, kit, cfg);
  var enemy = buildEnemy(enemyDef, isBoss, scale || 1, cfg);
  var dmgPerRound = heroHitDamage(hero, enemy, 1, null, true, cfg) * (1 + hero.celerity * cfg.celerityGaugePerAction / 100);
  var rpt = enemy.maxHp / dmgPerRound;
  // v3.105.0 (distance) : E rounds d'approche — l'ennemi ne frappe pas, le RPM est décalé d'autant (RPT inchangé)
  var eng = 0;
  if (cfg.engageEnabled && hero.ranged) {
    eng = enemy.isBoss ? cfg.engageBossRounds : (cfg.engageTable.hasOwnProperty(enemy.id) ? cfg.engageTable[enemy.id] : cfg.engageDefaultRounds);
  }
  var enemyPerRound = Math.max(0, enemy.dmg * (1 + enemy.critChance / 100 * (cfg.enemyCritMult - 1)) * (1 - Math.min(cfg.heroDefenseCap, hero.defense))) * (1 + enemy.stats.celerity * cfg.enemyCelerityGaugeCoef / 100);
  var rpm = enemyPerRound > 0 ? eng + hero.maxHp / enemyPerRound : Infinity;
  return { rpt: rpt, rpm: rpm, heroHp: hero.maxHp, heroDmg: dmgPerRound, enemyHp: enemy.maxHp, enemyDmg: enemyPerRound };
}

/* Agrégat Monte-Carlo de sorties. */
function aggregateSorties(heroDef, kit, pool, bossDef, cfg, opts) {
  opts = opts || {};
  var n = opts.runs || 200;
  var agg = { runs: n, wins: 0, bossReached: 0, rounds: 0, decisions: 0, potions: 0, deathsAtBoss: 0, hpAtBoss: 0 };
  for (var i = 0; i < n; i++) {
    var r = simulateSortie(heroDef, kit, pool, bossDef, cfg, { seed: (opts.seed || 1000) + i, fights: opts.fights, scale: opts.scale });
    if (r.won) agg.wins += 1;
    if (r.bossReached) { agg.bossReached += 1; agg.hpAtBoss += r.hpPctAtBoss; }
    if (r.diedAt && r.diedAt.indexOf("boss") === 0) agg.deathsAtBoss += 1;
    agg.rounds += r.rounds; agg.decisions += r.decisions; agg.potions += r.potionsUsed;
  }
  agg.avgHpAtBoss = agg.bossReached ? agg.hpAtBoss / agg.bossReached : 0;
  agg.winRate = agg.wins / n; agg.avgRounds = agg.rounds / n; agg.avgDecisions = agg.decisions / n; agg.avgPotions = agg.potions / n;
  return agg;
}

var CombatRoundSim = {
  DEFAULTS: ROUND_MODEL_DEFAULTS, config: function (over) { return rsMerge(ROUND_MODEL_DEFAULTS, over); },
  makeRng: makeRng, buildHero: buildHero, buildEnemy: buildEnemy, simulateFight: simulateFight,
  simulateSortie: simulateSortie, duelBudget: duelBudget, aggregateSorties: aggregateSorties, defaultPolicy: defaultPolicy
};

if (typeof module !== "undefined" && module.exports) module.exports = CombatRoundSim;
if (typeof window !== "undefined") window.CombatRoundSim = CombatRoundSim;
