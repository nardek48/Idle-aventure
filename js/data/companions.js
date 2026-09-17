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
var COMPANION_MAX_PRESENT = 2;         // le héros + 2 compagnons = plafond de 3 alliés

var COMPANIONS_DB = {
  wenna: {
    id: "wenna",
    name: "Wenna",
    image: "./images/Heroes/ranger_f.png", // portrait dédié à poser plus tard
    role: "support",
    weaponType: "bow",
    /* makeRpgStats(power, endurance, celerity, precision, will) — voir data/enemies.js */
    base: { power: 38, endurance: 40, celerity: 44, precision: 46, will: 34 },
    threatMult: 0.7,                     // Soutien : elle attire peu (§6.2)
    skill: {
      id: "wenna_bandage",
      name: "Pansement serré",
      icon: "images/Icons/combat_status/heal_incoming.png",
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
      ko: "Wenna tombe. Elle ne demande rien, pour une fois."
    }
  }
};

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
  support: "Soutien"
};

function getCompanionDef(companionId) {
  if (!companionId || typeof companionId !== "string") return null;
  return COMPANIONS_DB[companionId] || null;
}

/* Stats effectives d'un compagnon à un monde donné, améliorations comprises.
   Aucune lecture de game.* ici : donnée pure, testable seule. */
function getCompanionStats(companionId, worldIndex, upgradeCount) {
  var def = getCompanionDef(companionId);
  if (!def) return null;

  var scale = (typeof getEquipWorldScale === "function") ? getEquipWorldScale(worldIndex) : 1;
  var statPct = (def.upgrades && def.upgrades.statPct) || 0;
  var bonus = 1 + statPct * Math.max(0, Number(upgradeCount || 0));

  return {
    maxHp: Math.max(1, Math.floor(def.base.endurance * COMPANION_HP_COEF * scale * bonus)),
    damage: Math.max(1, Math.floor(def.base.power * COMPANION_POWER_DMG_COEF * scale * bonus)),
    celerity: def.base.celerity,
    precision: def.base.precision,
    will: def.base.will
  };
}

/* Coût du prochain palier d'amélioration, null si la ligne est terminée. */
function getCompanionUpgradeCost(companionId, upgradeCount) {
  var def = getCompanionDef(companionId);
  if (!def || !def.upgrades || !def.upgrades.costs) return null;
  var i = Math.max(0, Number(upgradeCount || 0));
  if (i >= def.upgrades.costs.length) return null;
  return def.upgrades.costs[i];
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
window.getCompanionDef = getCompanionDef;
window.getCompanionStats = getCompanionStats;
window.getCompanionUpgradeCost = getCompanionUpgradeCost;
window.getCompanionMaxUpgrades = getCompanionMaxUpgrades;
