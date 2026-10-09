"use strict";
/* v3.269.0 (L-3) : QuestEnemyManager.spawnFor renvoie un TABLEAU quand la quête déclare
   un groupe. Le pronostic raisonne sur un adversaire de référence : on prend le premier
   membre, celui qui frappe en premier après le tri par célérité. */
function firstOfGroup(x) { return Array.isArray(x) ? (x[0] || null) : x; }

/* systems/combat-forecast-system.js — PRONOSTIC DE COMBAT (v3.247.0, demande Seb 15/09/2026).

   Pourquoi ce module existe : rien n'avertissait le joueur qu'un combat était hors de portée.
   Le cas extrême est réel — un boss se soigne de BOSS_HEAL_PERCENT de ses PV tous les
   BOSS_HEAL_ROUNDS rounds ; sous un certain seuil de dégâts, il est MATHÉMATIQUEMENT
   intuable et le joueur peut frapper indéfiniment sans le savoir (constaté sur forest_05).

   Le pronostic ne simule pas : il compare des ordres de grandeur connus avant le combat —
   PV et puissance de l'ennemi, dégâts et PV du héros, seuil de soin s'il y a un boss. Il ne
   prétend pas prédire l'issue, seulement écarter l'impossible et nommer le risque.

   Aucun fichier protégé : toutes les valeurs sont lues via StatsSystem et les constantes
   publiques de combat-engine.js. */

/* Seuils du verdict, calibrés contre les taux d'échec RÉELS (sim/forecast-calibration-bench.js,
   quête « Prouver sa valeur », trois classes × sept profils, 40 runs par cellule). Le ratio est
   « rounds pour tuer » / « rounds pour tomber ».
   Mesures de référence, après prise en compte des potions, des frappes bonus de célérité et de
   l'usure des combats précédents :
     0,52 -> 0 %   0,88 -> 0 %   1,10 -> 18 %   1,36 -> 98 %   2,30 -> 100 %
   Les trois facteurs comptent : sans les potions le pronostic criait au loup (98 % annoncé
   contre 0 % réel), sans la célérité il condamnait le Rôdeur, et sans l'usure il ne voyait que
   le boss alors que le héros tombe souvent avant lui. */
var FORECAST_RATIO_THRESHOLDS = {
  horsportee: 1.3,   // 1,36 mesuré -> 98 % d'échec réel
  tresdur: 1.05,     // 1,10 mesuré -> 18 % : dur, mais pas impossible
  risque: 0.85,      // 0,88 mesuré -> 0 %, la marge est mince
  abordable: 0.35    // en dessous : aucun échec observé, quel que soit le profil
};

/* v3.429.14 : dégâts réels / estimés, par classe. Mesuré au banc (--frappes) : le Chevalier
   garde 12 à 30 % de ses actions et n'exécute presque jamais, il touche 0,38 à 0,65 de l'estimé
   contre 0,57 à 0,89 à distance. 0,7 le recale sur les classes à distance, sur qui les seuils sont calés. */
var FORECAST_CLASS_DMG_MULT = { knight: 0.7 };

/* v3.429.15 : part des soins de compagnon modélisés qui compte. Au banc, le héros boit ses potions
   avant de passer sous le seuil de Wenna : soins réels 0,3 à 0,8 du modèle pour le Chevalier. */
var FORECAST_COMPANION_HEAL_MULT = 0.75;

/* Verdicts, du plus sûr au pire. `level` sert au tri et au style ; `label` est le texte. */
var COMBAT_FORECAST_LEVELS = [
  { id: "trivial", level: 0, label: _t("Sans danger"), hint: "" },
  { id: "abordable", level: 1, label: _t("Abordable"), hint: "" },
  { id: "risque", level: 2, label: _t("Risqué"), hint: _t("Garde une potion de soin sous la main.") },
  { id: "tresdur", level: 3, label: _t("Très difficile"), hint: "" },
  { id: "horsportee", level: 4, label: _t("Hors de portée"), hint: "" }
];

var CombatForecast = {
  getLevelDef: function (id) {
    return COMBAT_FORECAST_LEVELS.find(function (l) { return l.id === id; }) || COMBAT_FORECAST_LEVELS[1];
  },

  /* Multiplicateur de dégâts moyen d'un round joué. Le joueur n'enchaîne pas des attaques de
     base : il place ses compétences dès que la ressource le permet, et retombe sur la frappe
     de base entre deux. On prend la moyenne des actions offensives du kit et de l'attaque de
     base — pessimiste par rapport à un joueur optimal, optimiste par rapport à qui ne fait
     que taper, et surtout stable. Sans kit (classe inconnue), 1. */
  getKitDamageMultiplier: function () {
    if (typeof getClassByHeroId !== "function" || typeof getClassSkills !== "function") return 1;
    var cls = getClassByHeroId(game.heroId);
    var kit = cls ? getClassSkills(cls.id) : null;
    if (!kit || !kit.actions) return 1;
    var mults = [1]; // l'attaque de base
    ["skill1", "skill2", "skill3"].forEach(function (slot) {
      var a = kit.actions[slot];
      if (a && a.type === "damage" && Number(a.damageMultiplier) > 0) mults.push(Number(a.damageMultiplier));
    });
    var sum = 0;
    mults.forEach(function (m) { sum += m; });
    return sum / mults.length;
  },

  /* Frappes par round. La jauge de célérité se remplit à chaque action offensive et déclenche
     une frappe bonus une fois pleine : un héros rapide frappe plus souvent qu'une fois par
     round. Sans ça le Rôdeur était sous-évalué (annoncé « hors de portée » pour 18 % d'échec
     réel au banc, sa célérité n'étant pas comptée). */
  getStrikesPerRound: function () {
    if (!window.CombatEngine || typeof CombatEngine.getGaugeGainPerAction !== "function") return 1;
    var max = (typeof CELERITY_GAUGE_MAX === "number" && CELERITY_GAUGE_MAX > 0) ? CELERITY_GAUGE_MAX : 100;
    var gain = Number(CombatEngine.getGaugeGainPerAction() || 0);
    return 1 + Math.max(0, Math.min(1, gain / max));
  },

  /* Dégâts moyens du héros par round, critiques, compétences et frappes bonus compris. */
  getHeroDamagePerRound: function () {
    if (!window.StatsSystem) return 1;
    var base = Number(StatsSystem.effectiveTapDamage() || 1);
    var crit = Math.min(100, Number(StatsSystem.effectiveCritChance() || 0)) / 100;
    var mult = Math.max(1, Number(StatsSystem.effectiveCritMult() || 1));
    return Math.max(1, base * (1 + crit * (mult - 1)) * this.getKitDamageMultiplier() * this.getStrikesPerRound());
  },

  /* v3.429.14 : dégâts du héros pour le pronostic seul, coefficient de classe compris. La mise à
     l'échelle des ennemis et les Petites Aventures gardent getHeroDamagePerRound. */
  getForecastHeroDamage: function () {
    var cls = (typeof getClassByHeroId === "function") ? getClassByHeroId(game.heroId) : null;
    var tm = Number(game.tapMult || 1), mk = this._markMods; // v3.429.16 : Ascétisme, Fragilité (+dégâts)
    var markMult = (mk && mk.tapDelta && tm > 0) ? Math.max(0, (tm + mk.tapDelta) / tm) : 1;
    return Math.max(1, this.getHeroDamagePerRound() * ((cls && FORECAST_CLASS_DMG_MULT[cls.id]) || 1) * markMult);
  },

  /* v3.429.9 : compagnons présents (hors patrouille). Chacun frappe une fois par round et
     encaisse une part des coups (pickVictim, au prorata de la menace) : ses dégâts s'ajoutent
     à ceux du héros, ses PV au réservoir. full = PV max (entrée de donjon, groupe soigné). */
  getPartyBonus: function (full) {
    var out = { dmg: 0, hp: 0 };
    if (!window.CompanionManager || typeof CompanionManager.partyIds !== "function") return out;
    CompanionManager.partyIds().forEach(function (id) {
      var s = CompanionManager.statsOf(id);
      var hp = full ? CompanionManager.maxHpOf(id) : CompanionManager.hpOf(id);
      if (!s || !(hp > 0)) return;
      out.dmg += Number(s.damage || 0);
      out.hp += Number(hp || 0);
    });
    return out;
  },

  /* Dégâts du groupe par round : le héros, plus les compagnons présents. */
  getPartyDamagePerRound: function (full) {
    return this.getForecastHeroDamage() + this.getPartyBonus(full).dmg;
  },

  /* v3.422.0 → v3.423.0 (chantier Difficulté, A et D) : PV effectifs du héros (défense comprise). */
  getHeroEffectiveHp: function () {
    var def = Math.min(0.9, Math.max(0, Number(game.heroDefensePct || 0)));
    return Math.max(1, Number(game.heroMaxHp || 1) / (1 - def));
  },

  /* Multiplicateurs d'un ennemi face au héros actuel (data/worlds.js, HERO_SCALING_REFS).
     refKey : héros de référence ; cfg : { exp, margin, cap }. Rend { hp, power } (>= 1) :
     PV de l'ennemi selon les dégâts du héros, Puissance selon ses PV effectifs. */
  getHeroScale: function (refKey, cfg) {
    var ref = window.HERO_SCALING_REFS ? HERO_SCALING_REFS[refKey] : null;
    if (!ref || !cfg) return { hp: 1, power: 1 };
    var margin = Number(cfg.margin || 1), exp = Number(cfg.exp || 0), cap = Number(cfg.cap || 1);
    var f = function (ratio) { return Math.min(cap, Math.max(1, Math.pow(Math.max(0, ratio) / margin, exp))); };
    return { hp: f(this.getHeroDamagePerRound() / ref.dmg), power: f(this.getHeroEffectiveHp() / ref.ehp) };
  },

  /* Soin disponible pendant le combat : les potions de soin en stock, dans la limite du cap
     de sortie (SORTIE_POTION_CAP). Mesuré déterminant : à profil égal, 3 potions font passer
     l'échec réel de 98 % à 0 % sur « Prouver sa valeur ». */
  getHealingReserve: function () {
    if (!window.PotionManager || typeof PotionManager.getHealingStock !== "function") return 0;
    if (this._markMods && this._markMods.noPotions) return 0; // v3.429.16 : Ascétisme
    var cap = (typeof getSortiePotionCap === "function") ? getSortiePotionCap() : 2; // v3.322.0
    var used = (game.sortie && game.sortie.active) ? Number(game.sortie.potionsUsed || 0) : 0;
    var restantes = Math.max(0, cap - used);
    var maxHp = Number(game.heroMaxHp || 1);
    var total = 0;
    (window.HEALING_POTIONS_DB || []).forEach(function (po) {
      var stock = PotionManager.getHealingStock(po.id);
      while (stock > 0 && restantes > 0) {
        total += maxHp * Number(po.healPercent || 0);
        stock -= 1; restantes -= 1;
      }
    });
    return Math.floor(total);
  },

  /* v3.429.11 : rounds d'approche. Face à un héros à arc ou à magie, l'ennemi met engageIn
     rounds à venir au contact (combat-engine prepareEnemy) : autant de rounds sans coup reçu.
     Le Chevalier (épée) est au contact dès le premier round. */
  getEngageRounds: function (enemy) {
    if (!enemy || typeof getEnemyEngageRounds !== "function") return 0;
    var heroDef = (window.HEROES_DB && game.heroId) ? HEROES_DB[game.heroId] : null;
    var ranged = !!(heroDef && heroDef.weaponType && heroDef.weaponType !== "sword");
    return ranged ? Math.max(0, Number(getEnemyEngageRounds(enemy.id, !!enemy.isBoss) || 0)) : 0;
  },

  /* Dégâts moyens que l'ennemi inflige par round, défense du héros déduite. */
  getEnemyDamagePerRound: function (enemy) {
    if (!enemy || !enemy.stats) return 0;
    var coef = (typeof ENEMY_POWER_DMG_COEF === "number") ? ENEMY_POWER_DMG_COEF : 1;
    var bossMult = enemy.isBoss ? ((typeof BOSS_DMG_MULT === "number") ? BOSS_DMG_MULT : 1.5) : 1;
    var fleau = (this._markMods && this._markMods.enemyMult) || 1; // v3.429.16 : Fléau, appliqué par le moteur à chaque coup
    var raw = Math.max(1, Number(enemy.stats.power || 0) * coef * bossMult * fleau);
    var def = Math.min(0.9, Number(game.heroDefensePct || 0));
    return Math.max(1, raw * (1 - def));
  },

  /* Le soin d'un boss impose un plancher de dégâts : sous ce seuil, ses PV remontent plus
     vite qu'ils ne descendent. On y ajoute la marge du bouclier (−50 % pendant 2 rounds
     sur un cycle de 4 à 6), soit environ +25 %. Renvoie 0 si l'ennemi ne se soigne pas. */
  getHealThreshold: function (enemy) {
    if (!enemy || !enemy.isBoss || enemy.isElite) return 0; // une élite troque son soin contre l'exaltation
    var pct = (typeof BOSS_HEAL_PERCENT === "number") ? BOSS_HEAL_PERCENT : 0;
    var every = (typeof BOSS_HEAL_ROUNDS === "number") ? BOSS_HEAL_ROUNDS : 5;
    if (!(pct > 0) || !(every > 0)) return 0;
    return (Number(enemy.maxHp || 0) * pct / every) * 1.25;
  },

  /* Coût en PV des combats qui précèdent, dans une mission qui n'offre aucun repos. Sans ça,
     le pronostic ne voyait que le boss : mesuré au banc, un Chevalier sans rien perd 98 % de
     ses runs alors que le boss seul lui est abordable — il tombe pendant les neuf ennemis
     ordinaires. Coût d'un combat = (PV de l'ennemi / dégâts du héros) × dégâts encaissés. */
  getAttritionCost: function (normalEnemy, count) {
    var n = Math.max(0, Number(count || 0));
    if (!normalEnemy || n === 0) return 0;
    var heroDmg = this.getPartyDamagePerRound(); // v3.429.9 : compagnons compris
    var rounds = Math.ceil(Number(normalEnemy.maxHp || 0) / Math.max(1, heroDmg));
    rounds = Math.max(0, rounds - this.getEngageRounds(normalEnemy)); // v3.429.11 : approche sans coup
    var perFight = rounds * this.getEnemyDamagePerRound(normalEnemy);
    return Math.max(0, Math.floor(perFight * n));
  },

  /* v3.429.7 : usure d'une vague à plusieurs ennemis, tués l'un après l'autre (le plus faible
     d'abord) : tant qu'un ennemi est debout, il frappe. Un ennemi seul = getAttritionCost(e, 1). */
  getGroupAttrition: function (list, fullParty) {
    return this.getGroupFight(list, fullParty).cost;
  },

  /* v3.429.15 : la même vague, avec sa durée en rounds (rythme des soins de compagnon). */
  getGroupFight: function (list, fullParty) {
    var heroDmg = Math.max(1, this.getPartyDamagePerRound(fullParty)); // v3.429.9 : compagnons compris
    var alive = (list || []).filter(Boolean).slice().sort(function (a, b) { return Number(a.maxHp || 0) - Number(b.maxHp || 0); });
    var cost = 0, elapsed = 0, self = this;
    /* v3.429.11 : arrivée au contact, règle du moteur (spawnGroup) : seul, l'ennemi met engageIn
       rounds ; en groupe, ceux qui approchent sont échelonnés 0, 1, 2… par célérité décroissante. */
    var arrive;
    if (alive.length > 1) {
      var bySpeed = alive.slice().sort(function (x, y) { return Number((y.stats && y.stats.celerity) || 0) - Number((x.stats && x.stats.celerity) || 0); });
      var retard = 0, delays = [];
      bySpeed.forEach(function (e) { delays.push(self.getEngageRounds(e) > 0 ? retard++ : 0); });
      arrive = alive.map(function (e) { return delays[bySpeed.indexOf(e)]; });
    } else {
      arrive = alive.map(function (e) { return self.getEngageRounds(e); });
    }
    while (alive.length) {
      var rounds = Math.ceil(Number(alive[0].maxHp || 0) / heroDmg);
      for (var i = 0; i < alive.length; i++) {
        var hitting = Math.max(0, Math.min(rounds, elapsed + rounds - arrive[i]));
        cost += hitting * this.getEnemyDamagePerRound(alive[i]);
      }
      elapsed += rounds;
      alive.shift(); arrive.shift();
    }
    return { cost: Math.floor(cost), rounds: elapsed };
  },

  /* v3.429.15 : un combat contre un ennemi seul, coût et durée (getAttritionCost pour un). */
  getSingleFight: function (enemy) {
    var rounds = Math.ceil(Number((enemy && enemy.maxHp) || 0) / Math.max(1, this.getPartyDamagePerRound()));
    return { cost: this.getAttritionCost(enemy, 1), rounds: rounds };
  },

  /* v3.429.15 : PV que les compagnons rendent pendant les combats [{ cost, rounds }], selon
     leurs vraies règles : Wenna (heal) sous son seuil, charges et recharge ; Maddoc (taunt)
     dès qu'un allié est touché. Groupe approché en un seul réservoir de PV. Un compagnon ne
     joue plus une fois l'ennemi tombé (alliesTurn) : un combat d'un round ne lui laisse aucun soin. */
  getCompanionHeals: function (fights, fullParty) {
    if (!window.CompanionManager || typeof CompanionManager.partyIds !== "function" || typeof getCompanionDef !== "function") return 0;
    var heroMax = Number(game.heroMaxHp || 1), poolMax = heroMax, deficit = fullParty ? 0 : Math.max(0, heroMax - Number(game.heroHp != null ? game.heroHp : heroMax));
    var healers = [];
    CompanionManager.partyIds().forEach(function (id) {
      var def = getCompanionDef(id), max = CompanionManager.maxHpOf(id);
      var hp = fullParty ? max : CompanionManager.hpOf(id);
      if (!def || !(hp > 0)) return;
      poolMax += max; deficit += Math.max(0, max - hp);
      var sk = def.skill;
      if (!sk || !(Number(sk.value) > 0)) return;
      if (sk.type === "heal") {
        var st = CompanionManager.state(id) || {};
        healers.push({ amount: sk.value * heroMax, gate: 1 - getCompanionHealThreshold(st.healThreshold).value, cd: Number(sk.cooldown || 1), charges: Number(sk.charges || 0) });
      } else if (sk.type === "taunt") {
        healers.push({ amount: sk.value * max, gate: 0.1, cd: Number(sk.cooldown || 1), charges: Number(sk.charges || 0) }); // « Planté » : un allié sous 90 %
      }
    });
    if (!healers.length) return 0;
    var healed = 0;
    (fights || []).forEach(function (f) {
      var slots = Math.max(1, Math.ceil(Number(f.rounds || 1) / 4)), share = Number(f.cost || 0) / slots;
      var used = healers.map(function () { return 0; });
      for (var j = 0; j < slots; j++) { // fenêtres de 4 rounds : les coups tombent, puis chacun soigne si sa règle le permet
        deficit += share;
        healers.forEach(function (h, k) {
          if (used[k] >= Math.ceil(Math.max(0, Number(f.rounds || 1) - 1) / h.cd)) return; // recharge ; dernier round : l'ennemi tombe avant son tour
          if (h.charges > 0 && used[k] >= h.charges) return;                 // charges du combat
          if (deficit / poolMax <= h.gate) return;
          var gain = Math.min(deficit, h.amount);
          deficit -= gain; healed += gain; used[k]++;
        });
      }
    });
    return Math.floor(healed * FORECAST_COMPANION_HEAL_MULT);
  },

  /* v3.429.7 : pronostic d'un donjon ENTIER (tous les donjons) : usure des vagues, puis le boss
     avec ce qui reste. On entre à PV pleins (DungeonManager.start). Les Marques comptent. */
  forDungeon: function (dungeonId, marks) {
    if (!window.DungeonManager || !window.DUNGEON_CONFIG) return null;
    var savedRun = game.dungeonRun, savedHp = game.heroHp, savedMax = game.heroMaxHp, out = null;
    var AM = window.AfflictionManager, baked = AM ? AM.getCombinedModifiers() : null; // déjà dans les stats si un run est en cours
    try {
      game.dungeonRun = { active: true, wave: 0, dungeonId: Number(dungeonId), marks: (marks || []).slice() };
      /* v3.429.16 : effets des Marques sur le héros, que recalcStats n'applique qu'une fois le run lancé.
         On ne compte que l'écart avec ce qui est déjà dans les stats. */
      if (AM && baked) {
        var want = AM.getCombinedModifiers();
        this._markMods = { tapDelta: want.tapMult - baked.tapMult, enemyMult: want.enemyPowerMult, noPotions: !!want.forbidPotions };
        var hpMult = want.heroMaxHpMult / (baked.heroMaxHpMult || 1);
        if (hpMult !== 1) game.heroMaxHp = Math.max(1, Math.floor(Number(savedMax || 1) * hpMult));
      }
      var n = DUNGEON_CONFIG.waveCount, attrition = 0, waves = [];
      for (var w = 1; w <= n; w++) waves.push(this.getGroupFight([].concat(DungeonManager.buildWaveEnemy(w)), true));
      waves.forEach(function (f) { attrition += f.cost; });
      attrition = Math.max(0, attrition - this.getCompanionHeals(waves, true)); // v3.429.15 : soins de compagnon
      // Correctif propre au donjon (data/dungeon.js, forecastAttritionMult), calé au banc
      var dDef = DungeonManager.getById(Number(dungeonId)) || {};
      attrition = Math.floor(attrition * (Number(dDef.forecastAttritionMult) > 0 ? Number(dDef.forecastAttritionMult) : 1));
      var boss = firstOfGroup(DungeonManager.buildWaveEnemy(n + 1));
      game.heroHp = game.heroMaxHp || 1;
      out = boss ? this.forEnemy(boss, { attrition: attrition, fullParty: true }) : null;
      if (out) { out.enemyName = boss.name; out.precedingFights = n; }
    } finally {
      game.dungeonRun = savedRun;
      game.heroHp = savedHp;
      game.heroMaxHp = savedMax;
      this._markMods = null;
    }
    return out;
  },

  /* Pronostic pour UN ennemi. options.attrition : PV déjà consommés par les combats qui
     précèdent dans la même sortie. */
  forEnemy: function (enemy, options) {
    options = options || {};
    if (!enemy) return null;

    var party = this.getPartyBonus(!!options.fullParty); // v3.429.9
    var heroDmg = this.getForecastHeroDamage() + party.dmg;
    var enemyDmg = this.getEnemyDamagePerRound(enemy);
    var heroHp = Number(game.heroHp != null ? game.heroHp : (game.heroMaxHp || 1));
    var heroMaxHp = Number(game.heroMaxHp || 1);
    var enemyHp = Number(enemy.maxHp || 0);

    var healThreshold = this.getHealThreshold(enemy);
    var netDmg = healThreshold > 0 ? (heroDmg - healThreshold) : heroDmg;

    /* Les potions repoussent le moment où l'on tombe : elles comptent comme des PV.
       L'usure des combats précédents les retire. */
    var reserve = this.getHealingReserve();
    var attrition = Math.max(0, Number(options.attrition || 0));
    var effectiveHp = Math.max(1, heroHp + party.hp + reserve - attrition);

    var out = {
      heroDamagePerRound: Math.round(heroDmg),
      enemyDamagePerRound: Math.round(enemyDmg),
      enemyHp: enemyHp,
      heroHp: heroHp,
      partyHp: party.hp,
      healingReserve: reserve,
      attrition: attrition,
      healThreshold: Math.ceil(healThreshold),
      roundsToKill: null,
      roundsToDie: enemyDmg > 0 ? Math.ceil(effectiveHp / enemyDmg) + this.getEngageRounds(enemy) : Infinity, // v3.429.11 : approche
      unwinnable: false,
      id: "abordable",
      reason: "",
      advice: ""
    };

    /* Cas 1 : le soin dépasse les dégâts — impossible, quel que soit le temps passé. */
    if (healThreshold > 0 && netDmg <= 0) {
      out.unwinnable = true;
      out.id = "horsportee";
      out.reason = _t("Il se soigne plus vite que tu ne frappes : ce combat ne peut pas être gagné en l'état.");
      out.advice = this.buildAdvice(true);
      return out;
    }

    out.roundsToKill = Math.ceil(enemyHp / Math.max(1, netDmg));

    /* Cas 2 : il tue avant d'être tué. Seuils calibrés au banc (FORECAST_RATIO_THRESHOLDS). */
    var ratio = out.roundsToKill / Math.max(1, out.roundsToDie);
    out.ratio = ratio;
    var T = FORECAST_RATIO_THRESHOLDS;
    if (ratio >= T.horsportee) { out.id = "horsportee"; out.reason = _t("Il te met à terre bien avant de tomber."); }
    else if (ratio >= T.tresdur) { out.id = "tresdur"; out.reason = _t("La course est trop serrée : la moindre charge peut te coûter le combat."); }
    else if (ratio >= T.risque) { out.id = "risque"; out.reason = _t("Il t'entamera sérieusement."); }
    else if (ratio >= T.abordable) { out.id = "abordable"; out.reason = ""; }
    else { out.id = "trivial"; out.reason = ""; }

    /* Sans la moindre potion, un combat serré devient un combat perdu : le banc mesure 98 %
       d'échec là où le même profil avec trois potions en mesure 0. On le dit plutôt que de
       durcir le verdict en silence. */
    if (reserve <= 0 && (out.id === "tresdur" || out.id === "risque")) {
      out.advice = _t("Emporte des potions de soin (Campement → Préparer → Potions) : à ce niveau, elles font la différence entre passer et tomber.");
    }

    /* Un combat interminable est un mauvais combat, même gagné. */
    if (!out.unwinnable && out.roundsToKill > 60 && out.id !== "horsportee") {
      out.id = "tresdur";
      out.reason = _t("Il te faudrait des dizaines de rounds pour en venir à bout.");
    }

    if (!out.advice && (out.id === "tresdur" || out.id === "horsportee")) {
      out.advice = this.buildAdvice(out.unwinnable);
    }
    return out;
  },

  /* Le conseil pointe le levier le plus rentable pour CE joueur, mesuré, pas générique :
     l'équipement rapporte plus par or que les caractéristiques tant qu'un emplacement est
     vide ou commun ; sinon c'est l'entraînement (et le Terrain, s'il plafonne). */
  buildAdvice: function (unwinnable) {
    var empty = 0, commons = 0;
    (window.EQUIPMENT_SLOTS || []).forEach(function (slot) {
      var item = (game.equipped || {})[slot];
      if (!item) empty += 1;
      else if (item.rarity === "common") commons += 1;
    });

    var capped = false;
    if (typeof getTrainingCapLevels === "function" && window.HEROS_TRAINING_UPGRADE_IDS) {
      var cap = getTrainingCapLevels();
      capped = HEROS_TRAINING_UPGRADE_IDS.some(function (id) {
        return Number((game.upgrades || {})[id] || 0) >= cap;
      });
    }

    var parts = [];
    if (empty > 0) parts.push(_tn(empty, "{n} emplacement d'équipement vide — l'échoppe du village est le gain le plus rapide", "{n} emplacements d'équipement vides — l'échoppe du village est le gain le plus rapide"));
    else if (commons >= 4) parts.push(_t("ton équipement est encore tout en commun : une pièce de meilleure qualité change plus que dix niveaux d'entraînement"));
    if (capped) parts.push(_t("tes caractéristiques butent sur le plafond : c'est le Terrain d'entraînement qu'il faut monter"));
    else parts.push(_t("monte tes caractéristiques dans Héros → Entraînement"));

    return unwinnable ? _t("Reviens plus fort : {liste}.", { liste: parts.join(", ") }) : _t("Pour améliorer tes chances : {liste}.", { liste: parts.join(", ") });
  },

  /* Pronostic pour un RUN entier (quête, chasse, donjon) : on regarde l'ennemi le plus dur
     annoncé — le boss s'il y en a un, sinon l'ennemi courant. */
  forRun: function (enemy, options) {
    return this.forEnemy(enemy, options);
  },

  /* Ennemi de RÉFÉRENCE d'une mission : celui qui décide de l'issue. Pour une quête à étape
     bossKill, c'est le boss ; sinon l'ennemi ordinaire du pool. QuestEnemyManager.spawnFor
     construit l'objet sans toucher à game.enemy — rien n'est modifié ici. */
  getReferenceEnemy: function (mission) {
    if (!mission || !window.QuestEnemyManager) return null;
    if (mission.sourceKind === "adventure") {
      var aq = (window.ADVENTURE_QUESTS || {})[mission.questId];
      if (!aq) return null;
      var hasBoss = (aq.steps || []).some(function (st) { return st.type === "bossKill"; });
      // v3.311.0 : rencontres scriptées -> la rencontre en cours sert de référence.
      // v3.429.9 : sauf si la quête finit sur un boss (le trône de sable) : c'est lui qui décide.
      if (aq.encounters && window.AdventureQuestManager && !hasBoss) return firstOfGroup(QuestEnemyManager.spawnFor(AdventureQuestManager._encounterQuest(aq), false));
      return firstOfGroup(QuestEnemyManager.spawnFor(aq, hasBoss)); // v3.269.0 : spawnFor peut renvoyer un groupe
    }
    if (mission.sourceKind === "hunt") {
      var hq = (window.HUNT_QUESTS || {})[mission.questId];
      return hq ? firstOfGroup(QuestEnemyManager.spawnFor(hq, false)) : null;
    }
    return null;
  },

  /* Nombre de combats ordinaires avant l'ennemi de référence, d'après la donnée de quête. */
  getPrecedingFights: function (mission) {
    if (!mission) return 0;
    var quest = (mission.sourceKind === "adventure") ? (window.ADVENTURE_QUESTS || {})[mission.questId]
      : (mission.sourceKind === "hunt") ? (window.HUNT_QUESTS || {})[mission.questId] : null;
    if (!quest) return 0;
    var total = 0;
    (quest.steps || []).forEach(function (st) {
      if (st.type === "kill" || st.type === "eliteTrack" || st.type === "encounter") total += Number(st.target || 0); // v3.311.0
    });
    if (!total && quest.lotSize) total = Number(quest.lotSize) || 0; // chasse : un lot de N
    return total;
  },

  /* Pronostic d'une mission du tableau, usure du run comprise. Null si on ne sait pas estimer. */
  forMission: function (mission) {
    // v3.429.7 : un donjon lancé du tableau du Camp reçoit le pronostic du run entier
    if (mission && mission.sourceKind === "dungeon") return this.forDungeon(String(mission.id).replace("dungeon_", ""), []);
    var enemy = this.getReferenceEnemy(mission);
    if (!enemy) return null;
    var attrition = 0, list = [];
    var fights = this.getPrecedingFights(mission);
    if (fights > 0 && window.QuestEnemyManager) {
      var quest = (mission.sourceKind === "adventure") ? (window.ADVENTURE_QUESTS || {})[mission.questId]
        : (window.HUNT_QUESTS || {})[mission.questId];
      if (quest && quest.encounters && window.AdventureQuestManager) {
        /* v3.429.9 : rencontres scriptées — l'objectif compte des RENCONTRES (un groupe = un cran) ;
           chacune a son groupe, on les additionne dans l'ordre du run. */
        for (var k = 0; k < fights; k++) {
          list.push(this.getGroupFight([].concat(QuestEnemyManager.spawnFor(AdventureQuestManager._encounterQuest(quest, k), false) || [])));
        }
      } else {
        var spawned = quest ? QuestEnemyManager.spawnFor(quest, false) : null;
        /* v3.429.8 : un groupe (meute, escouade) frappe à plusieurs. On compte les combats de groupe
           (cible / taille du groupe) et l'usure de chacun membre par membre, comme en donjon. */
        var group = [].concat(spawned || []).filter(Boolean);
        var one = group.length > 1 ? this.getGroupFight(group) : (group[0] ? this.getSingleFight(group[0]) : null);
        var reps = group.length > 1 ? Math.ceil(fights / group.length) : (one ? fights : 0);
        for (var r = 0; r < reps; r++) list.push(one);
      }
      list.forEach(function (f) { attrition += f.cost; });
      attrition = Math.max(0, attrition - this.getCompanionHeals(list, false)); // v3.429.15 : soins de Wenna et Maddoc
    }
    var out = this.forEnemy(enemy, { attrition: attrition });
    if (out) { out.enemyName = enemy.name; out.precedingFights = fights; }
    /* v3.429.11 : sans boss, l'ennemi de référence n'est qu'un ennemi de plus — c'est le run
       entier qui décide. Usure / réservoir (PV + compagnons + potions) au-delà de 0,95 : le run
       mange tout le réservoir (Meute à l'entraînement 0 : 0,97-1,06 -> 0 % de réussite). Seuils
       plus bas écartés au banc : ils condamnaient la Nuée et le Cœur, réussis à 90-100 %. */
    if (out && !enemy.isBoss && !out.unwinnable) {
      var pool = Math.max(1, Number(out.heroHp || 0) + Number(out.partyHp || 0) + Number(out.healingReserve || 0));
      var runRatio = attrition / pool, LV = { trivial: 0, abordable: 1, risque: 2, tresdur: 3, horsportee: 4 };
      var runId = runRatio >= 0.95 ? "horsportee" : null;
      if (runId && LV[runId] > LV[out.id]) {
        out.id = runId;
        out.runRatio = runRatio;
        out.reason = _t("Les combats qui s'enchaînent t'usent plus vite que tu ne récupères.");
        if (runId !== "risque" && !out.advice) out.advice = this.buildAdvice(false);
      }
    }
    return out;
  }
};

window.FORECAST_RATIO_THRESHOLDS = FORECAST_RATIO_THRESHOLDS;
window.FORECAST_CLASS_DMG_MULT = FORECAST_CLASS_DMG_MULT;
window.FORECAST_COMPANION_HEAL_MULT = FORECAST_COMPANION_HEAL_MULT;
window.COMBAT_FORECAST_LEVELS = COMBAT_FORECAST_LEVELS;
window.CombatForecast = CombatForecast;
