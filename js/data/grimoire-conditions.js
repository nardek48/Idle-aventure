"use strict";
/* ============================================================
Aethervale — data/grimoire-conditions.js
v3.50.0 : catalogue de DONNÉES pures pour les cartes de condition du
Grimoire de tactiques (étape 4a — moteur de règles conditionnelles,
2 slots fixes pour cette première livraison — voir résumé de session
"Grimoire de tactiques & combat automatique").

Décision de conception actée par Seb : les conditions sont des cartes
VISUELLES simples ("le monstre prépare un gros coup", "je suis
blessé"), les seuils numériques restent CACHÉS derrière chaque carte
(pas affichés au joueur) — ce fichier ne fait qu'associer un id de
condition à son libellé/description/icône ; la LOGIQUE de vérification
(le seuil réel) vit dans evaluateGrimoireCondition(),
systems/combat-auto-policy-system.js, jamais ici.

4 cartes pour cette première livraison, correspondant exactement aux
3 patterns déjà en jeu (Charge v3.48.0, Bouclier/Soin v3.49.0) + 1
condition côté héros :
  - chargeIncoming  : un ennemi normal a télégraphié une Charge
                      (game.enemy.chargeTelegraphUntil actif)
  - shieldIncoming  : un boss a télégraphié un Bouclier
                      (game.enemy.shieldTelegraphUntil actif)
  - healIncoming    : un boss a télégraphié un Soin
                      (game.enemy.healTelegraphUntil actif)
  - heroLowHp       : PV du héros ≤ 40% de son maximum (seuil caché,
                      voir HERO_LOW_HP_THRESHOLD_PCT dans
                      combat-auto-policy-system.js)

STATUT — donnée déclarative pure, comme data/auto-policy-defaults.js :
aucune fonction ici, aucun accès à game.*. */

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
  }
};

/* Ordre d'affichage stable dans l'écran Grimoire (ui/grimoire-view.js)
   — un tableau séparé plutôt que de dépendre de l'ordre d'énumération
   des clés de l'objet ci-dessus (non garanti historiquement fiable
   pour tout moteur JS, même si V8 le respecte en pratique). */
var GRIMOIRE_CONDITION_ORDER = ["chargeIncoming", "shieldIncoming", "healIncoming", "heroLowHp"];

/* getGrimoireCondition(conditionId) — renvoie une carte de condition,
   ou null si conditionId est absent/invalide/inconnu. Ne modifie
   jamais GRIMOIRE_CONDITIONS. */
function getGrimoireCondition(conditionId) {
  if (!conditionId || typeof conditionId !== "string") return null;
  return GRIMOIRE_CONDITIONS[conditionId] || null;
}

/* v3.53.0 : getGrimoireCounterLabels(action) — renvoie un tableau des
   LIBELLÉS (pas les ids) des conditions que cette action contre (voir
   action.counters, data/class-skills.js, et le mécanisme réel dans
   ClassCombatManager.applyGrimoireCounterIfApplicable(), systems/
   class-combat-system.js). Fonction PARTAGÉE entre 2 écrans qui ont
   besoin d'afficher la même info sans la dupliquer :
     - ui/heros-view.js (fiche Personnage > Stats) — affichée
       directement sur chaque carte de capacité, sans manipulation.
     - ui/grimoire-view.js (écran Grimoire) — affichée sur l'action
       déjà assignée à une règle, même avant que la condition ne soit
       choisie dans le sélecteur (l'ancien indice ⚡ dans le menu
       déroulant "Alors..." dépendait d'avoir déjà choisi "Si...",
       cette fonction ne dépend de rien d'autre que l'action elle-même).
   Retourne [] si action.counters est absent/vide, ou si un id qu'il
   contient est inconnu de GRIMOIRE_CONDITIONS (silencieusement
   ignoré — jamais d'erreur pour une donnée mal formée). Ne mute rien. */
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
