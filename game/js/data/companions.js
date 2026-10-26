"use strict";
/* data/companions.js — v3.268.0 (lot L-2) : compagnons de combat.
   Doc : Aethervale_Conception_Combat_Groupe_v1_0.docx §4.

   Un compagnon n'est PAS un second héros. Pas de classe, pas d'équipement, pas de
   talents, pas de ressource de classe, pas de niveau : une attaque de base, UNE
   compétence signature à cooldown en rounds, un rôle fixe, et une ligne
   d'améliorations payée en or. Sa fiche tient en quinze lignes — c'est ce qui rend
   trois compagnons équilibrables.

   ÉCHELLE (§4.2) : les stats suivent EQUIP_WORLD_SCALE, indexée sur le monde DU COMBAT
   et non sur le monde le plus avancé. Un compagnon ramené en Forêt y est au niveau de
   la Forêt : le farm des mondes déjà finis n'est pas trivialisé, et calibrer la fin de
   Forêt ne demande pas de réétalonner tout le jeu.

   RÔLE : "assault" | "guard" | "support". Fixe, porté par la donnée, jamais réglable
   par le joueur. Il pilote la menace (§6.2) et la politique automatique (§4.3). */

/* Coefficients partagés — points de calibrage uniques, mesurés au banc
   (sim/group-bench.js --ally). Référence Forêt, héros nu, entraînement +4 :
   Chevalier 410 PV / 13,0 dégâts · Rôdeur 323 / 10,0 · Mage 302 / 13,0.
   Cible du document : un compagnon fait 55 à 65 % des dégâts d'un héros équipé. */
var COMPANION_POWER_DMG_COEF = 0.20;   // dégâts par frappe = power × coef × échelle de monde
var COMPANION_HP_COEF = 4.2;           // PV max = endurance × coef × échelle de monde
var COMPANION_KO_RETURN_PCT = 0.30;    // PV au combat suivant après un KO (§4.4)
var COMPANION_MAX_PRESENT = 2;
/* H4 (chantier du héros) : plancher de dégâts d'un compagnon = part du coup moyen du héros (critiques comprises),
   pour qu'il suive l'entraînement, les rangs et l'équipement du héros. 0 = sans plancher (réglé au banc). */
var COMPANION_HERO_DMG_PCT = 0.10; // décision Seb (26/10) : 10 %, la Forêt ne bouge pas
/* H4 : entraînement réparti. Chaque palier acheté donne +8 % au choix (Ardeur = dégâts, Vigueur = PV) ; les paliers d'avant
   (et les cadeaux) restent « équilibrés » (+6 % aux deux). Ligne : 5 paliers par monde atteint depuis l'arrivée du compagnon. */
var COMPANION_TRAINING_PCT = 0.08;
var COMPANION_VIGUEUR_THREAT = 0.10;
/* H4 partie C (décision Seb 26/10, C-a) : rangs 1 à 5 de la compétence signature. Rang r ouvert par le monde r−1 (comme les
   sorts du héros), prix moitié de H2 : or + 2 matériaux du monde. Effets : `value` + perRank × rang, ou un cran à un rang donné. */
var COMPANION_SKILL_RANK_MAX = 5;
var COMPANION_SKILL_RANK_PRICES = [
  { gold: 500, mat: "resine_durcie", qty: 2 }, { gold: 2500, mat: "verre_trempe", qty: 2 }, { gold: 7500, mat: "cle_de_voute", qty: 2 },
  { gold: 15000, mat: "cire_consacree", qty: 2 }, { gold: 40000, mat: "obsidienne_taillee", qty: 2 }
];
var COMPANION_SKILL_RANKS = {
  wenna: { value: 0.02 },                              // soin 18 → 28 %
  maddoc: { taunt: { value: 0.02 }, strike: { value: 0.2 } }, // Planté 12 → 22 % ; Tir ajusté ×2,5 → ×3,5 (selon la voie)
  edda: { value: 0.1 },                                // Le dernier trait ×1,5 → ×2
  ysolt: { chargeAt: 3 },                              // +1 charge au rang 3
  sarkel: { ashAt: 3, chargeAt: 5 }                    // +1 Cendre vive (1re taille du combat) au rang 3, 2e taille au rang 5 (S1)
}; // H4 (V1) : chaque palier de Vigueur attire 10 % de coups en plus
var COMPANION_TRAINING_PER_WORLD = 5;
var COMPANION_TRAINING_HARD_MAX = 30;
var COMPANION_JOIN_WORLD = { wenna: 0, maddoc: 1, edda: 2, ysolt: 3, sarkel: 4 };
/* Prix d'un bloc de 5 paliers selon le monde qui l'ouvre : la grille des compagnons de ce monde. */
var COMPANION_TRAINING_PRICES = [[60, 120, 240, 480, 900], [240, 480, 960, 1920, 3600], [480, 960, 1920, 3840, 7200], [960, 1920, 3840, 7200, 12000], [1920, 3840, 7200, 12000, 20000]];         // le héros + 2 compagnons = plafond de 3 alliés

var COMPANIONS_DB = {
  wenna: {
    id: "wenna",
    name: "Wenna",
    image: "./images/Companions/wenna.webp", // v3.349.0 : portrait dédié (ranger_f.png reste au héros rôdeur)
    role: "support",
    weaponType: "bow",
    /* makeRpgStats(power, endurance, celerity, precision, will) — voir data/enemies.js */
    base: { power: 38, endurance: 40, celerity: 44, precision: 46, will: 34 },
    threatMult: 0.7,                     // Soutien : elle attire peu (§6.2)
    skill: {
      id: "wenna_bandage",
      name: "Pansement serré",
      icon: "images/Icons/companions/wenna_bandage.webp",
      type: "heal",
      target: "ally_lowest",             // l'allié le plus bas en PV, héros compris
      value: 0.18,                       // % des PV max de la cible
      cooldown: 4,                       // rythme À L'INTÉRIEUR du combat
      charges: 3,                        // plafond SUR le combat (décision Seb 17/09/2026)
      desc: "Rend 18 % des PV max à l'allié le plus bas. 3 fois par combat."
    },
    /* Politique en mode Auto : premier slot jouable gagne (§4.3). */
    autoPolicy: ["skill", "basic"],
    autoSkillHpThreshold: 0.60,          // seuil par défaut, réglable par le joueur (§4.3)
    upgrades: { costs: [60, 120, 240, 480, 900], statPct: 0.06 },
    unlockedBy: "forest_wenna",          // étape d'Histoire qui la fait rejoindre
    /* Répliques de combat — une par événement, dans sa voix (bible B §2.1 :
       directe, curieuse, la seule à poser les questions à voix haute). */
    lines: {
      join: "Toi aussi tu pars sans rien dire ? Bon. Je viens.",
      skill: "Tiens-toi tranquille deux secondes.",
      ko: "Wenna tombe. Elle ne demande rien, pour une fois.",
      // v3.333.0 (moments de boss, B6) — PROVISOIRES, à relire selon la bible
      bossIntro: "Il est plus grand que dans les histoires. Tant mieux, on ne peut pas le rater.",
      bossWin: "Tu as vu ? Il est tombé. On l'a fait tomber."
    }
  },

  /* v3.311.0 (W-3b, acte II §3 et §6) — MADDOC, second compagnon, rejoint à l'étape 8.
     DEUX VOIES au choix du joueur (D4) : la fiche commune ci-dessous, et dans `voies` ce qui
     change d'une voie à l'autre (rôle, stats, menace, compétence, politique). getCompanionDef
     fusionne la voie courante : le reste du code ne voit qu'un compagnon ordinaire.
     Changement de voie : VOIE_CHANGE_BASE_COST ×3 à chaque fois (D4b), améliorations gardées.
     Stats provisoires, calibrées au banc sim/desert-acte2-bench.js. */
  maddoc: {
    id: "maddoc",
    name: "Maddoc",
    image: "./images/Companions/maddoc.webp", // v3.349.0 : portrait posé
    weaponType: "sling",
    defaultVoie: "tronc",
    voies: {
      tronc: {
        label: "Le tronc", short: "Devant",
        desc: "Il se met devant et prend les coups. Il attire les ennemis et encaisse.",
        role: "guard",
        base: { power: 34, endurance: 74, celerity: 30, precision: 30, will: 36 },
        threatMult: 1.8,                   // Garde : il attire (§6.2)
        skill: {
          id: "maddoc_plante", name: "Planté",
          icon: "images/Icons/companions/maddoc_plante.webp", // à générer
          type: "taunt",
          value: 0.12,                     // se rend 12 % de ses PV max
          cooldown: 4, charges: 0,
          desc: "Attire sur lui les coups des prochains rounds et se rend 12 % de ses PV max."
        },
        autoPolicy: ["skill", "basic"],
        lines: { skill: "Par ici." }
      },
      affut: {
        label: "L'affût", short: "Derrière",
        desc: "Il reste derrière et vise. Il frappe fort mais attire peu.",
        role: "assault",
        base: { power: 52, endurance: 38, celerity: 48, precision: 50, will: 34 },
        threatMult: 0.6,                   // de loin, il attire peu
        skill: {
          id: "maddoc_tir", name: "Tir ajusté",
          icon: "images/Icons/companions/maddoc_tir.webp", // à générer
          type: "strike",
          value: 2.5,                      // ×2,5 ses dégâts de base sur la cible
          cooldown: 3, charges: 0,
          desc: "Une pierre bien ajustée : 2,5 fois ses dégâts sur la cible."
        },
        autoPolicy: ["skill", "basic"],
        lines: { skill: "Bouge pas." }
      }
    },
    upgrades: { costs: [240, 480, 960, 1920, 3600], statPct: 0.06 }, // prix du Désert (×4), provisoires
    unlockedBy: "desert_08",
    lines: {
      join: "Je boite. Je ne tombe pas.",
      ko: "Maddoc s'assoit contre la paroi. Il se relèvera.",
      // v3.333.0 (moments de boss, B6) — PROVISOIRES, à relire selon la bible
      bossIntro: "Je passe devant. Tu frappes quand il me regarde.",
      bossWin: "Bon. On rentre. Et on ne raconte pas ça à ma mère."
    }
  }
};

/* v3.428.0 (Ruines, acte I étape 3) — EDDA, la cartographe, troisième compagnon. Venue « d'un
   pays où les murs restent en place ». À la pioche, au corps à corps. Rôle : Achever — sa
   compétence frappe un ennemi À TERRE et l'empêche de se relever (systems/rise-system.js).
   Stats et prix provisoires, au banc (sim/ruines-bench.js). Portrait à fournir par Seb. */
COMPANIONS_DB.edda = {
  id: "edda",
  name: "Edda",
  image: "./images/Companions/edda.webp",
  role: "finisher",
  weaponType: "pick",
  base: { power: 46, endurance: 52, celerity: 40, precision: 44, will: 30 },
  threatMult: 1.0,
  skill: {
    id: "edda_dernier_trait",
    name: "Le dernier trait",
    icon: "images/Icons/companions/edda_dernier_trait.webp", // à générer
    type: "finish",
    value: 1.5,                          // ×1,5 ses dégâts de base sur l'ennemi à terre (une frappe l'achève)
    cooldown: 2, charges: 0,
    desc: "Frappe un ennemi à terre : il ne se relèvera pas."
  },
  autoPolicy: ["skill", "basic"],
  upgrades: { costs: [480, 960, 1920, 3840, 7200], statPct: 0.06 }, // prix des Ruines, provisoires
  unlockedBy: "ruines_03",
  lines: {
    join: "Je note par où on passe. Pour le retour.",
    skill: "Celui-là, il reste où il est.",
    ko: "Edda tombe. Elle serre son carnet contre elle.",
    bossIntro: "Il n'est sur aucune carte. On va l'y mettre.",
    bossWin: "Je le note. Là, en bas de la page."
  }
};

/* v3.452.0 (Crypte, acte I étape 3, CR5) — YSOLT, une Rôdeuse montée neuf fois, revenue huit.
   Elle porte un carquois vide et ne tire plus. Rôle : Garder le sommeil — sa compétence repousse
   le réveil seul d'un dormeur (systems/sleep-system.js), une fois par combat. Stats et prix
   provisoires, au banc. Portrait à fournir par Seb. */
COMPANIONS_DB.ysolt = {
  id: "ysolt",
  name: "Ysolt",
  image: "./images/Companions/ysolt.webp",
  role: "keeper",
  weaponType: "bow",
  base: { power: 42, endurance: 48, celerity: 52, precision: 50, will: 40 },
  threatMult: 0.9,
  skill: {
    id: "ysolt_pas_encore",
    name: "Pas encore",
    icon: "images/Icons/companions/ysolt_pas_encore.webp", // à générer
    type: "delaySleep",
    value: 2,                            // rounds de plus avant le réveil seul
    cooldown: 0, charges: 1,             // une fois par combat (CR5)
    desc: "Une fois par combat, un mort qui allait se lever dort encore deux rounds."
  },
  autoPolicy: ["skill", "basic"],
  upgrades: { costs: [960, 1920, 3840, 7200, 12000], statPct: 0.06 }, // prix de la Crypte, provisoires
  unlockedBy: "crypte_03",
  /* v3.455.0 (acte III, choix « ysolt », décision Seb du 19/10 : option A) — Garder : elle se recouche et
     quitte le groupe pour de bon ; Donner : elle reste, Pas encore deux fois par combat, −15 % de PV max. */
  departsOnChoice: { key: "ysolt", value: "garder" },
  choiceMods: { key: "ysolt", value: "donner", extraCharges: 1, hpMult: 0.85 },
  lines: {
    join: "Ne marchez pas si fort. Ils dorment.",
    skill: "Pas encore. Dors.",
    ko: "Ysolt s'assoit contre le mur. Elle ne tombe pas. Elle attend.",
    bossIntro: "Celui-là ne dort jamais.",
    bossWin: "Il dormira, maintenant."
  }
};

/* v3.488.0 (Montagne, acte I étape 3, MT5) — SARKEL, le colporteur. Il frappe peu ; il taille. Rôle :
   Celui qui taille — Coup de pioche taille la veine une fois par combat (VeinSystem.cut(false)) : la
   Cendre et la chaleur, pas la lame. Stats et prix provisoires, au banc. Portrait à fournir par Seb. */
COMPANIONS_DB.sarkel = {
  id: "sarkel",
  name: "Sarkel",
  image: "./images/Companions/sarkel.webp",
  role: "cutter",
  weaponType: "pick",
  base: { power: 34, endurance: 54, celerity: 36, precision: 40, will: 38 },
  threatMult: 0.9,
  skill: {
    id: "sarkel_coup_de_pioche",
    name: "Coup de pioche",
    icon: "images/Icons/companions/sarkel_coup_de_pioche.webp", // à générer
    type: "cutVein",
    cooldown: 0, charges: 1,             // une fois par combat (MT5)
    desc: "Une fois par combat, il taille la veine à ta place : +1 Cendre vive, sans perdre ton coup. La chaleur monte."
  },
  autoPolicy: ["skill", "basic"],
  upgrades: { costs: [1920, 3840, 7200, 12000, 20000], statPct: 0.06 }, // prix de la Montagne, provisoires
  unlockedBy: "montagne_03",
  lines: {
    join: "Je tiens la pioche, vous tenez le reste.",
    skill: "Bouge. Je taille.",
    ko: "Sarkel tombe sur sa pioche. Il ne la lâche pas.",
    bossIntro: "Celui-là, personne ne me l'a vendu.",
    bossWin: "Je ne sais pas ce qu'il vaut. Je le saurai."
  }
};

/* v3.311.0 : changement de voie (D4b) — 2 000 or, ×3 à chaque changement. Le premier choix
   (étape 8) est gratuit. */
var VOIE_CHANGE_BASE_COST = 2000;
var VOIE_CHANGE_COST_MULT = 3;

/* v3.271.0 (L-5) — RÉGLAGES DE COMPORTEMENT, sur la fiche du compagnon (décision Seb
   17/09/2026 : ce qui appartient au compagnon se règle chez lui ; les cartes du Grimoire,
   elles, pilotent le kit du HÉROS). Ils ne jouent qu'en mode Auto : en Manuel, c'est le
   joueur qui décide et ces réglages dorment.

   Trois réglages, pas un moteur de règles : un compagnon n'a qu'UNE compétence, un
   système conditionnel complet s'y résumerait de toute façon à « quand l'utiliser ». */
var COMPANION_HEAL_THRESHOLDS = [
  { id: "tot", label: "Tôt", value: 0.80, desc: "Dès qu'un allié descend sous 80 % de ses PV." },
  { id: "normal", label: "Normal", value: 0.60, desc: "Sous 60 % — le réglage par défaut." },
  { id: "tard", label: "Tard", value: 0.40, desc: "Sous 40 %, pour garder ses charges." }
];

var COMPANION_HEAL_PRIORITIES = [
  { id: "lowest", label: "Le plus bas", desc: "Soigne l'allié dont il reste le moins, toi compris." },
  { id: "hero", label: "Toi d'abord", desc: "Te soigne en priorité dès que tu es sous le seuil." }
];

/* Lecture TOLÉRANTE : renvoie toujours un seuil utilisable (le défaut si l'id est
   inconnu), pour que la politique auto ne tombe jamais en panne. */
function getCompanionHealThreshold(id) {
  for (var i = 0; i < COMPANION_HEAL_THRESHOLDS.length; i++) {
    if (COMPANION_HEAL_THRESHOLDS[i].id === id) return COMPANION_HEAL_THRESHOLDS[i];
  }
  return COMPANION_HEAL_THRESHOLDS[1];
}

/* Contrôle STRICT : sert à refuser une valeur à l'écriture et à assainir une save.
   Les deux usages sont distincts — le premier doit dire non, le second doit se replier. */
function isCompanionHealThreshold(id) {
  for (var i = 0; i < COMPANION_HEAL_THRESHOLDS.length; i++) {
    if (COMPANION_HEAL_THRESHOLDS[i].id === id) return true;
  }
  return false;
}

var COMPANION_ROLE_LABELS = {
  assault: "Assaut",
  guard: "Garde",
  support: "Soutien",
  finisher: "Achever", // v3.428.0 (Ruines) : Edda
  keeper: "Garder le sommeil", // v3.452.0 (Crypte) : Ysolt
  cutter: "Celui qui taille"   // v3.488.0 (Montagne) : Sarkel
};

var _companionVoieCache = {}; // fiche fusionnée par « id:voie », identité stable

/* v3.311.0 : un compagnon à voies (Maddoc) renvoie sa fiche commune fusionnée avec la voie
   courante (game.companions[id].voie, sinon defaultVoie). Seule lecture de game.* du fichier. */
function getCompanionDef(companionId, voieId) {
  if (!companionId || typeof companionId !== "string") return null;
  var def = COMPANIONS_DB[companionId] || null;
  if (!def || !def.voies) return def;
  var voie = voieId || (window.game && game.companions && game.companions[companionId] && game.companions[companionId].voie) || def.defaultVoie;
  if (!def.voies[voie]) voie = def.defaultVoie;
  var key = companionId + ":" + voie;
  if (!_companionVoieCache[key]) {
    var v = def.voies[voie], merged = {};
    Object.keys(def).forEach(function (k) { if (k !== "voies") merged[k] = def[k]; });
    Object.keys(v).forEach(function (k) { if (k !== "lines") merged[k] = v[k]; });
    merged.lines = Object.assign({}, def.lines || {}, v.lines || {});
    merged.voie = voie;
    _companionVoieCache[key] = merged;
  }
  return _companionVoieCache[key];
}

/* Coût du prochain changement de voie (changes = changements déjà faits). */
function getVoieChangeCost(changes) {
  return Math.round(VOIE_CHANGE_BASE_COST * Math.pow(VOIE_CHANGE_COST_MULT, Math.max(0, Number(changes || 0))));
}

/* Stats effectives d'un compagnon à un monde donné, améliorations comprises.
   Aucune lecture de game.* ici : donnée pure, testable seule. */
function getCompanionStats(companionId, worldIndex, upgradeCount, ardeur, vigueur) {
  var def = getCompanionDef(companionId);
  if (!def) return null;

  var scale = (typeof getEquipWorldScale === "function") ? getEquipWorldScale(worldIndex) : 1;
  var b = getCompanionTrainingBonus(companionId, upgradeCount, ardeur, vigueur); // H4 : équilibré + Ardeur / Vigueur

  return {
    maxHp: Math.max(1, Math.floor(def.base.endurance * COMPANION_HP_COEF * scale * b.hp)),
    damage: Math.max(1, Math.floor(def.base.power * COMPANION_POWER_DMG_COEF * scale * b.dmg)),
    celerity: def.base.celerity,
    precision: def.base.precision,
    will: def.base.will
  };
}

/* H4 : multiplicateurs d'entraînement. Équilibrés = paliers ni Ardeur ni Vigueur (+statPct aux deux). */
function getCompanionTrainingBonus(companionId, upgradeCount, ardeur, vigueur) {
  var def = getCompanionDef(companionId), statPct = (def && def.upgrades && def.upgrades.statPct) || 0;
  var ar = Math.max(0, Number(ardeur || 0)), vi = Math.max(0, Number(vigueur || 0));
  var eq = Math.max(0, Number(upgradeCount || 0) - ar - vi);
  return { eq: eq, dmg: 1 + statPct * eq + COMPANION_TRAINING_PCT * ar, hp: 1 + statPct * eq + COMPANION_TRAINING_PCT * vi };
}

/* Prix du palier d'indice `upgradeCount` (0 = le premier) : bloc de 5 du monde d'arrivée + n° du bloc.
   H4 : la ligne s'allonge par monde ; la limite (monde atteint) est vérifiée par CompanionManager. */
function getCompanionUpgradeCost(companionId, upgradeCount) {
  var def = getCompanionDef(companionId);
  if (!def) return null;
  var i = Math.max(0, Number(upgradeCount || 0));
  if (i >= COMPANION_TRAINING_HARD_MAX) return null;
  var join = COMPANION_JOIN_WORLD[companionId] || 0, w = join + Math.floor(i / COMPANION_TRAINING_PER_WORLD);
  var row = COMPANION_TRAINING_PRICES[Math.min(w, COMPANION_TRAINING_PRICES.length - 1)];
  var mult = Math.pow(2, Math.max(0, w - (COMPANION_TRAINING_PRICES.length - 1))); // au-delà de la Montagne : ×2 par monde (provisoire)
  return row[i % COMPANION_TRAINING_PER_WORLD] * mult;
}

function getCompanionMaxUpgrades(companionId) {
  var def = getCompanionDef(companionId);
  return (def && def.upgrades && def.upgrades.costs) ? def.upgrades.costs.length : 0;
}

window.COMPANIONS_DB = COMPANIONS_DB;
window.COMPANION_HEAL_THRESHOLDS = COMPANION_HEAL_THRESHOLDS;
window.COMPANION_HEAL_PRIORITIES = COMPANION_HEAL_PRIORITIES;
window.getCompanionHealThreshold = getCompanionHealThreshold;
window.isCompanionHealThreshold = isCompanionHealThreshold;
window.COMPANION_ROLE_LABELS = COMPANION_ROLE_LABELS;
window.COMPANION_POWER_DMG_COEF = COMPANION_POWER_DMG_COEF;
window.COMPANION_HP_COEF = COMPANION_HP_COEF;
window.COMPANION_KO_RETURN_PCT = COMPANION_KO_RETURN_PCT;
window.COMPANION_MAX_PRESENT = COMPANION_MAX_PRESENT;
window.COMPANION_HERO_DMG_PCT = COMPANION_HERO_DMG_PCT;
window.COMPANION_TRAINING_PCT = COMPANION_TRAINING_PCT;
window.COMPANION_VIGUEUR_THREAT = COMPANION_VIGUEUR_THREAT;
window.COMPANION_SKILL_RANK_MAX = COMPANION_SKILL_RANK_MAX;
window.COMPANION_SKILL_RANK_PRICES = COMPANION_SKILL_RANK_PRICES;
window.COMPANION_SKILL_RANKS = COMPANION_SKILL_RANKS;
window.COMPANION_JOIN_WORLD = COMPANION_JOIN_WORLD;
window.getCompanionTrainingBonus = getCompanionTrainingBonus;
window.getCompanionDef = getCompanionDef;
window.getVoieChangeCost = getVoieChangeCost;
window.VOIE_CHANGE_BASE_COST = VOIE_CHANGE_BASE_COST;
window.getCompanionStats = getCompanionStats;
window.getCompanionUpgradeCost = getCompanionUpgradeCost;
window.getCompanionMaxUpgrades = getCompanionMaxUpgrades;
