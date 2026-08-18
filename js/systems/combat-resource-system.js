"use strict";
/* ============================================================
Aethervale — systems/combat-resource-system.js
v3.33.3 : logique FONCTIONNELLE et PURE pour la ressource de classe
(Rage/Concentration/Mana), lisant les règles déclarées dans
data/class-skills.js (resource.max/initial/generation).

STATUT — bac à sable, PAS branché au jeu :
  - Aucune fonction ici ne touche à game.*, à une variable globale de
    partie, au DOM, ni à combat-engine.js/special-attack-system.js/
    stats-system.js/game-loop.js/save-system.js.
  - Chaque fonction reçoit un état en paramètre et retourne soit un
    NOUVEL état (jamais de mutation de l'objet reçu), soit un résultat
    explicite (booléen, nombre...).
  - Pensé pour être rejouable à l'identique dans un futur bac à sable
    isolé, puis plus tard dans le vrai combat via un adaptateur séparé
    (non créé ici, voir le rapport de livraison).

État de ressource : { classId, resourceId, current, max }.

Règles de gain lues depuis resource.generation (voir
data/class-skills.js) :
  - "damageDealtPercent"     (Chevalier) — gain = context.damageDealt
                              × generation.value. Aucun gain si
                              damageDealt est 0/absent (jamais sur les
                              dégâts REÇUS, ce champ n'est pas lu ici).
  - "successfulBasicAttack"  (Archer) — gain = generation.value, + 
                              generation.criticalBonus si
                              context.isCritical est vrai. Déclenché
                              uniquement par applyResourceGain() appelé
                              explicitement après une attaque de base
                              réussie — cette fonction ne devine jamais
                              seule qu'une attaque a eu lieu.
  - "passiveAndBasicAttack"  (Mage) — deux canaux séparés :
                              tickResourceRegen() pour le passif
                              (generation.passivePerSecond × secondes
                              écoulées), applyResourceGain() avec
                              context.isBasicAttack pour le gain fixe
                              (generation.basicAttackGain) sur attaque
                              de base.
============================================================ */

/* createCombatResourceState(classId)
   Initialise un état de ressource à partir de data/class-skills.js
   (getClassResource(classId)). Retourne null si classId est invalide
   ou inconnu — ne lance jamais d'exception. */
function createCombatResourceState(classId) {
  var resourceDef = (typeof getClassResource === "function") ? getClassResource(classId) : null;
  if (!resourceDef) return null;

  return {
    classId: classId,
    resourceId: resourceDef.id,
    current: resourceDef.initial,
    max: resourceDef.max
  };
}

/* canAfford(state, amount)
   true si state existe et state.current >= amount (amount <= 0
   toujours considéré finançable). Ne mute jamais state. */
function canAfford(state, amount) {
  if (!state || typeof state.current !== "number") return false;
  var cost = (typeof amount === "number" && amount > 0) ? amount : 0;
  return state.current >= cost;
}

/* spendResource(state, amount)
   Retourne un NOUVEL état avec current diminué de amount, plafonné à
   0 (jamais négatif). Ne dépense rien et retourne l'état inchangé
   (copie) si canAfford(state, amount) est faux — appeler canAfford()
   avant si un refus explicite est nécessaire côté appelant. */
function spendResource(state, amount) {
  if (!state) return state;
  var cost = (typeof amount === "number" && amount > 0) ? amount : 0;
  if (!canAfford(state, cost)) {
    return Object.assign({}, state);
  }
  return Object.assign({}, state, {
    current: Math.max(0, state.current - cost)
  });
}

/* applyResourceGain(state, gainRule, context)
   Retourne un NOUVEL état avec current augmenté selon gainRule
   (typiquement resource.generation de data/class-skills.js) et
   context (voir en-tête de fichier). Toujours plafonné à state.max.
   Ne fait rien (retourne une copie inchangée) si state ou gainRule
   est absent, ou si le type de règle est inconnu.

   context attendu (champs lus selon le type de gainRule) :
     - damageDealt   (number)  dégâts infligés par l'action en cours
     - isCritical    (boolean) coup critique ou non
     - isBasicAttack (boolean) l'action en cours est-elle l'attaque de
                                base de la classe */
function applyResourceGain(state, gainRule, context) {
  if (!state) return state;
  if (!gainRule || typeof gainRule.type !== "string") {
    return Object.assign({}, state);
  }
  var ctx = context || {};
  var gain = 0;

  switch (gainRule.type) {
    case "damageDealtPercent": {
      var damageDealt = (typeof ctx.damageDealt === "number" && ctx.damageDealt > 0) ? ctx.damageDealt : 0;
      gain = damageDealt * (gainRule.value || 0);
      break;
    }
    case "successfulBasicAttack": {
      gain = gainRule.value || 0;
      if (ctx.isCritical) gain += (gainRule.criticalBonus || 0);
      break;
    }
    case "passiveAndBasicAttack": {
      // Canal "attaque de base" uniquement ici — le canal passif est
      // géré séparément par tickResourceRegen(), pas cette fonction.
      if (ctx.isBasicAttack) gain = gainRule.basicAttackGain || 0;
      break;
    }
    default:
      gain = 0;
  }

  if (gain <= 0) return Object.assign({}, state);

  return Object.assign({}, state, {
    current: Math.min(state.max, state.current + gain)
  });
}

/* tickResourceRegen(state, gainRule, elapsedMs)
   Régénération PASSIVE dans le temps (uniquement pertinent pour
   generation.type === "passiveAndBasicAttack", ex. Mana). Retourne un
   NOUVEL état, plafonné à state.max. N'a aucun effet (copie inchangée)
   pour les autres types de règle, ou si elapsedMs <= 0. */
function tickResourceRegen(state, gainRule, elapsedMs) {
  if (!state) return state;
  var elapsed = (typeof elapsedMs === "number" && elapsedMs > 0) ? elapsedMs : 0;
  if (elapsed <= 0 || !gainRule || gainRule.type !== "passiveAndBasicAttack") {
    return Object.assign({}, state);
  }
  var perSecond = gainRule.passivePerSecond || 0;
  var gain = perSecond * (elapsed / 1000);
  if (gain <= 0) return Object.assign({}, state);

  return Object.assign({}, state, {
    current: Math.min(state.max, state.current + gain)
  });
}

/* restoreResourcePercent(state, percent)
   v3.33.5 : ajoutée pour le mode Run du bac à sable (voir
   systems/combat-sandbox-system.js), qui a besoin de restaurer la
   ressource d'un pourcentage CONFIGURABLE de state.max entre deux
   combats de la file (réglage de persistance). Aucune des fonctions
   existantes ne couvrait ce cas (applyResourceGain lit une RÈGLE de
   classe déclarative, pas un pourcentage arbitraire fourni par
   l'appelant) — ajout signalé avant modification, comme demandé.
   Retourne un NOUVEL état avec current augmenté de percent% de
   state.max (percent attendu entre 0 et 100), plafonné à state.max,
   jamais < state.current de départ. percent <= 0 ou state absent :
   copie inchangée. */
function restoreResourcePercent(state, percent) {
  if (!state) return state;
  var pct = (typeof percent === "number" && percent > 0) ? Math.min(100, percent) : 0;
  if (pct <= 0) return Object.assign({}, state);

  var gain = state.max * (pct / 100);
  return Object.assign({}, state, {
    current: Math.min(state.max, state.current + gain)
  });
}

window.createCombatResourceState = createCombatResourceState;
window.canAfford = canAfford;
window.spendResource = spendResource;
window.applyResourceGain = applyResourceGain;
window.tickResourceRegen = tickResourceRegen;
window.restoreResourcePercent = restoreResourcePercent;
