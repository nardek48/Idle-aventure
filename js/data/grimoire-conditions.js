"use strict";
/* data/grimoire-conditions.js — catalogue de cartes-conditions du Grimoire (donnée pure, aucun accès à game.*).
   Seuils réels dans evaluateGrimoireCondition(), combat-auto-policy-system.js. Détail complet : COMMENTAIRES_ORIGINAUX.md */

var GRIMOIRE_CONDITIONS = {
  chargeIncoming: {
    id: "chargeIncoming",
    label: "L'ennemi prépare une charge",
    description: "Un ennemi normal s'apprête à charger.",
    icon: "💢"
  },
  shieldIncoming: {
    id: "shieldIncoming",
    label: "Le boss invoque un bouclier",
    description: "Le boss va bientôt réduire les dégâts qu'il subit.",
    icon: "🛡️"
  },
  healIncoming: {
    id: "healIncoming",
    label: "Le boss va se soigner",
    description: "Le boss s'apprête à récupérer des PV.",
    icon: "💚"
  },
  heroLowHp: {
    id: "heroLowHp",
    label: "Je suis blessé",
    description: "Tes PV sont bas.",
    icon: "❤️‍🩹"
  },
  enemyAttackIncoming: {
    id: "enemyAttackIncoming",
    label: "L'ennemi va bientôt attaquer",
    description: "Une attaque ordinaire arrive dans un instant.",
    icon: "⚔️"
  },
  enemyEnraged: {
    id: "enemyEnraged",
    label: "L'ennemi est enragé",
    description: "Il devient plus dangereux à mesure qu'il perd des PV.",
    icon: "😡"
  },
  enemyCorrupted: {
    id: "enemyCorrupted",
    label: "L'ennemi est corrompu",
    description: "Chaque coup reçu réduit un peu tes dégâts.",
    icon: "☠️"
  },
  enemySilenceIncoming: {
    id: "enemySilenceIncoming",
    label: "L'ennemi va te réduire au silence",
    description: "Un ennemi normal s'apprête à bloquer tes techniques.",
    icon: "🔇"
  },
  enemyVampiric: {
    id: "enemyVampiric",
    label: "L'ennemi est vampirique",
    description: "Il se soigne à chaque coup qu'il te porte.",
    icon: "🧛"
  },
  enemyArmored: {
    id: "enemyArmored",
    label: "L'ennemi est blindé",
    description: "Il subit un peu moins de dégâts en permanence.",
    icon: "🛡️‍🩹"
  }
};

var GRIMOIRE_CONDITION_ORDER = ["chargeIncoming", "shieldIncoming", "healIncoming", "heroLowHp", "enemyAttackIncoming", "enemyEnraged", "enemyCorrupted", "enemySilenceIncoming", "enemyVampiric", "enemyArmored"];

function getGrimoireCondition(conditionId) {
  if (!conditionId || typeof conditionId !== "string") return null;
  return GRIMOIRE_CONDITIONS[conditionId] || null;
}

function getGrimoireCounterLabels(action) {
  if (!action || !Array.isArray(action.counters) || !action.counters.length) return [];

  var labels = [];
  action.counters.forEach(function (conditionId) {
    var cond = getGrimoireCondition(conditionId);
    if (cond) labels.push(cond.label);
  });
  return labels;
}

window.GRIMOIRE_CONDITIONS = GRIMOIRE_CONDITIONS;
window.GRIMOIRE_CONDITION_ORDER = GRIMOIRE_CONDITION_ORDER;
window.getGrimoireCondition = getGrimoireCondition;
window.getGrimoireCounterLabels = getGrimoireCounterLabels;
