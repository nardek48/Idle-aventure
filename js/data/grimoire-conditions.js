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

v3.67.0 : 5e carte — enemyAttackIncoming : la RIPOSTE NORMALE (pas un
pattern spécial, la simple riposte cadencée par la Célérité ennemie,
voir CombatEngine.enemyAttackTick()) va bientôt frapper. Contrairement
aux 4 cartes ci-dessus, la riposte normale N'A JAMAIS eu de télégraphe
visible (aucun *TelegraphUntil posé, le coup part instantanément dès
que le minuteur atteint l'intervalle) — décision actée avec Seb : PAS
d'ajout d'un vrai télégraphe visible ici (ça changerait le rythme de
TOUS les combats, y compris les plus simples), à la place une
SYNCHRONISATION PRÉDICTIVE cachée (voir getSecondsUntilPatternTrigger(),
systems/class-combat-system.js, et ENEMY_ATTACK_ANTICIPATION_THRESHOLD_S,
systems/combat-auto-policy-system.js). Différence fondamentale avec les
4 conditions ci-dessus : ce n'est PAS un contre qui ANNULE l'attaque
(aucune action ne déclare "enemyAttackIncoming" dans son champ
counters, voir data/class-skills.js) — l'action defense assignée
s'active simplement au bon moment pour que son effet normal (réduction/
évasion/absorption) soit VRAIMENT actif à l'impact, au lieu d'être
jouée en boucle "à l'aveugle" sans savoir si un coup arrive.

v3.70.0 : 2 nouvelles cartes — enemyEnraged/enemyCorrupted, contrôle
explicite des effets Enragé/Corrupteur (Phase 9, v3.68.0/v3.69.0).
Correction d'un trou de design signalé par Seb : à l'origine, skill3/
skill1 déclenchaient AUTOMATIQUEMENT applyEnemyRageSuppression()/
applyEnemyCorruptionPurge() dès qu'utilisés sur l'ennemi concerné,
peu importe COMMENT l'action avait été jouée (tap manuel, repli par
défaut, règle du Grimoire pour une tout autre condition) — aucune
configuration possible, contrairement à tout le reste du Grimoire.
Ces 2 cartes rendent le comportement configurable et priorisable dans
l'ordre des règles, comme les autres. Différence fondamentale avec les
4 conditions basées sur un télégraphe : Enragé/Corrupteur sont des
ÉTATS PERMANENTS de l'ennemi (pas des événements ponctuels à
anticiper) — enemyEnraged/enemyCorrupted sont donc VRAIES EN PERMANENCE
tant que game.enemy.archetype correspond, comme heroLowHp mais liées à
l'ennemi plutôt qu'au héros (option A retenue par Seb : pas de seuil de
stacks avant de proposer le contre — option B, un seuil du type
"Corrompu à 3+ stacks", gardée en note pour une itération future si
souhaité). Ce ne sont PAS des contres au sens counters/
applyGrimoireCounterIfApplicable() (rien n'est "annulé", l'effet est
une réduction/gel ou une purge) — un système de filtrage PARALLÈLE
existe pour elles, voir ClassCombatManager.applyEnemyRageSuppression()/
applyEnemyCorruptionPurge() (matchedConditionId requis, même principe
exact que les contres classiques).

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
  }
};

/* Ordre d'affichage stable dans l'écran Grimoire (ui/grimoire-view.js)
   — un tableau séparé plutôt que de dépendre de l'ordre d'énumération
   des clés de l'objet ci-dessus (non garanti historiquement fiable
   pour tout moteur JS, même si V8 le respecte en pratique). */
var GRIMOIRE_CONDITION_ORDER = ["chargeIncoming", "shieldIncoming", "healIncoming", "heroLowHp", "enemyAttackIncoming", "enemyEnraged", "enemyCorrupted"];

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
