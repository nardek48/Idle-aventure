"use strict";
/* data/grimoire-conditions.js — catalogue de cartes-conditions du Grimoire (donnée pure, aucun accès à game.*).
   Seuils réels dans evaluateGrimoireCondition(), combat-auto-policy-system.js. Détail complet : COMMENTAIRES_ORIGINAUX.md */

var GRIMOIRE_CONDITIONS = {
  chargeIncoming: {
    id: "chargeIncoming",
    label: "L'ennemi prépare une charge",
    description: "Un ennemi normal s'apprête à charger.",
    icon: "images/Icons/combat_status/charge_incoming.png"
  },
  shieldIncoming: {
    id: "shieldIncoming",
    label: "L'ennemi invoque un bouclier",
    description: "Il va bientôt réduire les dégâts qu'il subit.",
    icon: "images/Icons/combat_status/shield_incoming.png"
  },
  healIncoming: {
    id: "healIncoming",
    label: "Le boss va se soigner",
    description: "Le boss s'apprête à récupérer des PV.",
    icon: "images/Icons/combat_status/heal_incoming.png"
  },
  eliteSurgeIncoming: {
    id: "eliteSurgeIncoming",
    label: "L'élite s'exalte",
    description: "Sa nature va compter double pendant quelques rounds.",
    icon: "images/Icons/combat_status/arcane_burn.png"
  },
  heroLowHp: {
    id: "heroLowHp",
    label: "Je suis blessé",
    description: "Tes PV sont bas.",
    icon: "images/Icons/combat_status/heal_incoming.png"
  },
  enemyAttackIncoming: {
    id: "enemyAttackIncoming",
    label: "L'ennemi va frapper deux fois",
    description: "Sa jauge de célérité sera pleine au prochain tour : il enchaînera deux coups.",
    icon: "images/Icons/combat_status/double_strike.png"
  },
  enemyEnraged: {
    id: "enemyEnraged",
    label: "L'ennemi est enragé",
    description: "Il devient plus dangereux à mesure qu'il perd des PV.",
    icon: "images/Icons/combat_status/rage.png"
  },
  enemyCorrupted: {
    id: "enemyCorrupted",
    label: "L'ennemi est corrompu",
    description: "Chaque coup reçu réduit un peu tes dégâts.",
    icon: "images/Icons/combat_status/corruption.png"
  },
  enemySilenceIncoming: {
    id: "enemySilenceIncoming",
    label: "L'ennemi va te réduire au silence",
    description: "Un ennemi normal s'apprête à bloquer tes techniques.",
    icon: "images/Icons/combat_status/silence_incoming.png"
  },
  enemyVampiric: {
    id: "enemyVampiric",
    label: "L'ennemi est vampirique",
    description: "Il se soigne à chaque coup qu'il te porte.",
    icon: "images/Icons/combat_status/vampiric.png"
  },
  enemyArmored: {
    id: "enemyArmored",
    label: "L'ennemi est blindé",
    description: "Il subit un peu moins de dégâts en permanence.",
    icon: "images/Icons/combat_status/armored.png"
  }
};

var GRIMOIRE_CONDITION_ORDER = ["chargeIncoming", "shieldIncoming", "healIncoming", "eliteSurgeIncoming", "heroLowHp", "enemyAttackIncoming", "enemyEnraged", "enemyCorrupted", "enemySilenceIncoming", "enemyVampiric", "enemyArmored"];

function getGrimoireCondition(conditionId) {
  if (!conditionId || typeof conditionId !== "string") return null;
  return GRIMOIRE_CONDITIONS[conditionId] || null;
}

/* v3.208.0 (bug Seb) — depuis la redistribution des contres d'archétype (v3.204.0), une action
   contre une situation par DEUX canaux distincts :
     - action.counters : les contres de télégraphe (charge, bouclier, soin, exaltation, silence) ;
     - action.effects : les suppressions d'archétype (enemyCorruptionPurge, enemyRageSuppression,
       enemyLifestealSuppression, enemyArmorSuppression), qui n'apparaissent nulle part dans counters.
   Les écrans ne lisaient que le premier : Frappe lourde n'annonçait que « Le boss va se soigner »
   alors qu'elle purge aussi la corruption et apaise la rage. Ce helper rend la liste complète,
   dédoublonnée et rangée dans l'ordre du Grimoire.
   ARCHETYPE_EFFECT_TO_CONDITION_ID vit dans systems/class-combat-system.js (fichier protégé, non
   modifié) : on le lit à l'exécution, jamais au chargement — ce fichier de données est chargé avant. */
function getAllGrimoireCounterIds(action) {
  if (!action) return [];

  var map = window.ARCHETYPE_EFFECT_TO_CONDITION_ID || {};
  var ids = [];

  function push(conditionId) {
    if (!conditionId || !GRIMOIRE_CONDITIONS[conditionId]) return;
    if (ids.indexOf(conditionId) === -1) ids.push(conditionId);
  }

  (action.counters || []).forEach(push);
  (action.effects || []).forEach(function (effect) {
    if (effect) push(map[effect.type]);
  });

  var order = GRIMOIRE_CONDITION_ORDER;
  return ids.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
}

/* v3.208.0 : s'appuie désormais sur getAllGrimoireCounterIds() — inclut donc les contres
   d'archétype portés par action.effects, invisibles jusqu'ici. */
function getGrimoireCounterLabels(action) {
  return getAllGrimoireCounterIds(action).map(function (conditionId) {
    return GRIMOIRE_CONDITIONS[conditionId].label;
  });
}

window.GRIMOIRE_CONDITIONS = GRIMOIRE_CONDITIONS;
window.GRIMOIRE_CONDITION_ORDER = GRIMOIRE_CONDITION_ORDER;
window.getGrimoireCondition = getGrimoireCondition;
window.getAllGrimoireCounterIds = getAllGrimoireCounterIds;
window.getGrimoireCounterLabels = getGrimoireCounterLabels;
