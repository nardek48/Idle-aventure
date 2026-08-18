"use strict";
/* ============================================================
Aethervale — systems/combat-cooldown-system.js
v3.33.3 : logique FONCTIONNELLE et PURE pour les cooldowns d'action de
classe, et vérification des conditions/coûts avant utilisation d'une
action (voir data/class-skills.js).

STATUT — bac à sable, PAS branché au jeu, mêmes garanties de pureté
que systems/combat-resource-system.js (voir son en-tête) : aucun accès
à game.* ni au DOM, aucune mutation d'un état non fourni en paramètre,
uniquement des retours de nouvel état ou de résultat explicite.

Choix d'implémentation : cooldownState stocke un temps RESTANT en ms
par actionId (pas un timestamp de fin), décrémenté explicitement via
tickCooldowns(elapsedMs). Ce choix (plutôt que le pattern
Date.now()-based utilisé par systems/special-attack-system.js pour le
vrai combat) rend ce module testable de façon déterministe sans
dépendre de l'horloge système — cohérent avec l'exigence de pureté de
cette tâche. Un futur adaptateur pourra convertir entre les deux
représentations si besoin.

cooldownState : { [actionId]: remainingMs } — un actionId absent de
l'objet est considéré comme disponible (jamais utilisé, donc pas de
cooldown en cours).
============================================================ */

/* createCooldownState()
   Retourne un état de cooldowns vide (aucune action en recharge). */
function createCooldownState() {
  return {};
}

/* isCooldownReady(cooldownState, actionId)
   true si actionId est absent de cooldownState, ou si son temps
   restant est <= 0. false si cooldownState/actionId est invalide (une
   action inconnue n'est jamais considérée "prête" par erreur). */
function isCooldownReady(cooldownState, actionId) {
  if (!cooldownState || typeof cooldownState !== "object") return false;
  if (!actionId || typeof actionId !== "string") return false;
  var remaining = cooldownState[actionId];
  return !(typeof remaining === "number" && remaining > 0);
}

/* startCooldown(cooldownState, actionId, durationMs)
   Retourne un NOUVEL état de cooldowns avec actionId réglé à
   durationMs (0 ou valeur absente => aucun cooldown démarré, l'action
   reste immédiatement réutilisable, ex. attaques de base à
   cooldownMs: 0). Ne mute jamais cooldownState. */
function startCooldown(cooldownState, actionId, durationMs) {
  var base = (cooldownState && typeof cooldownState === "object") ? cooldownState : {};
  if (!actionId || typeof actionId !== "string") return Object.assign({}, base);

  var duration = (typeof durationMs === "number" && durationMs > 0) ? durationMs : 0;
  var next = Object.assign({}, base);
  if (duration > 0) {
    next[actionId] = duration;
  } else {
    delete next[actionId];
  }
  return next;
}

/* tickCooldowns(cooldownState, elapsedMs)
   Retourne un NOUVEL état avec chaque cooldown en cours décrémenté de
   elapsedMs (plafonné à 0, jamais négatif). Les entrées tombées à 0
   sont retirées de l'état retourné (équivalent à "prêt", cohérent
   avec isCooldownReady()). Copie inchangée si elapsedMs <= 0. */
function tickCooldowns(cooldownState, elapsedMs) {
  var base = (cooldownState && typeof cooldownState === "object") ? cooldownState : {};
  var elapsed = (typeof elapsedMs === "number" && elapsedMs > 0) ? elapsedMs : 0;
  if (elapsed <= 0) return Object.assign({}, base);

  var next = {};
  Object.keys(base).forEach(function (actionId) {
    var remaining = base[actionId] - elapsed;
    if (remaining > 0) next[actionId] = remaining;
  });
  return next;
}

/* checkActionConditions(conditions, combatContext)
   Vérifie les contraintes déclaratives d'une action (champ
   action.conditions de data/class-skills.js) contre combatContext.
   Retourne true si conditions est absent/vide (aucune contrainte).
   Condition actuellement supportée :
     - enemyHpPercentBelowOrEqual (Exécution) — nécessite
       combatContext.enemyHp et combatContext.enemyMaxHp (numbers,
       enemyMaxHp > 0) ; retourne false si ces champs manquent, plutôt
       que d'autoriser par défaut une condition qu'on ne peut pas
       vérifier.
   Un type de condition inconnu dans l'objet est ignoré sans bloquer
   (permissif pour les futurs champs de conditions non encore gérés
   ici), sauf enemyHpPercentBelowOrEqual qui est la seule condition
   réellement câblée dans cette livraison. */
function checkActionConditions(conditions, combatContext) {
  if (!conditions || typeof conditions !== "object") return true;
  var ctx = combatContext || {};

  if (typeof conditions.enemyHpPercentBelowOrEqual === "number") {
    var enemyHp = ctx.enemyHp;
    var enemyMaxHp = ctx.enemyMaxHp;
    if (typeof enemyHp !== "number" || typeof enemyMaxHp !== "number" || enemyMaxHp <= 0) {
      return false;
    }
    var enemyHpPercent = enemyHp / enemyMaxHp;
    if (enemyHpPercent > conditions.enemyHpPercentBelowOrEqual) return false;
  }

  return true;
}

/* canUseAction(resourceState, cooldownState, action, combatContext)
   Vérification COMBINÉE avant utilisation : ressource suffisante
   (canAfford, voir combat-resource-system.js) + cooldown terminé
   (isCooldownReady) + conditions spécifiques (checkActionConditions).
   Retourne false proprement si action ou ses champs requis
   (id/resourceCost/conditions) sont absents/invalides. Ne mute rien. */
function canUseAction(resourceState, cooldownState, action, combatContext) {
  if (!action || typeof action.id !== "string") return false;
  if (typeof canAfford === "function" && !canAfford(resourceState, action.resourceCost)) return false;
  if (!isCooldownReady(cooldownState, action.id)) return false;
  if (!checkActionConditions(action.conditions, combatContext)) return false;
  return true;
}

/* useAction(resourceState, cooldownState, action, combatContext)
   Tente d'utiliser une action : si canUseAction() est faux, retourne
   { success: false, resourceState, cooldownState } avec les états
   INCHANGÉS (mêmes références/valeurs que reçues, pas de mutation).
   Si canUseAction() est vrai, retourne { success: true, resourceState,
   cooldownState } avec :
     - resourceState après dépense de action.resourceCost
       (spendResource) puis gain de action.resourceGain le cas échéant
       (gain FIXE de l'action elle-même, ex. Attaque de base du Mage —
       distinct du gain dérivé de resource.generation, qui reste à la
       charge de l'appelant via applyResourceGain() une fois les
       dégâts réels connus, ex. pour la Rage du Chevalier) ;
     - cooldownState après startCooldown(action.id, action.cooldownMs).
   Ne modifie jamais data/class-skills.js ni data/classes.js (ce
   module ne fait que LIRE les champs d'action reçus en paramètre). */
function useAction(resourceState, cooldownState, action, combatContext) {
  if (!canUseAction(resourceState, cooldownState, action, combatContext)) {
    return {
      success: false,
      resourceState: resourceState,
      cooldownState: cooldownState
    };
  }

  var nextResourceState = (typeof spendResource === "function")
    ? spendResource(resourceState, action.resourceCost)
    : resourceState;

  if (typeof action.resourceGain === "number" && action.resourceGain > 0 && nextResourceState) {
    nextResourceState = Object.assign({}, nextResourceState, {
      current: Math.min(nextResourceState.max, nextResourceState.current + action.resourceGain)
    });
  }

  var nextCooldownState = startCooldown(cooldownState, action.id, action.cooldownMs);

  return {
    success: true,
    resourceState: nextResourceState,
    cooldownState: nextCooldownState
  };
}

/* computeEffectiveCooldownMs(baseCooldownMs, celerity, options)
   v3.33.6 : ajoutée pour le bac à sable UNIQUEMENT — calcule un
   cooldown effectif pour l'attaque de base, dérivé de la Célérité du
   héros de test (voir systems/combat-sandbox-system.js). N'est
   JAMAIS appelée par data/class-skills.js ni par le moteur de combat
   réel : dans le jeu réel, l'attaque de base garde cooldownMs: 0
   (comportement inchangé), cette formule ne s'applique que dans le
   bac à sable.

   Choix d'emplacement : ajoutée ici plutôt que dans un nouveau
   fichier systems/combat-cooldown-formulas.js — c'est une formule de
   COOLDOWN, la responsabilité déjà portée par ce module (même style
   que startCooldown/tickCooldowns/isCooldownReady), et créer un
   fichier séparé pour une seule fonction pure aurait éclaté la
   logique de cooldown en trois endroits sans bénéfice réel.

   Formule : effectiveCooldownMs = baseCooldownMs / (1 + celerity/100),
   plafonnée à un minimum de baseCooldownMs × options.minRatio (defaut
   0.5, soit 50% de réduction maximum — voir options.minRatio pour
   l'ajuster). Retourne baseCooldownMs tel quel si celerity <= 0 ou
   n'est pas un nombre. Retourne 0 si baseCooldownMs <= 0. Ne mute
   rien, ne lit aucun état externe. */
function computeEffectiveCooldownMs(baseCooldownMs, celerity, options) {
  var base = (typeof baseCooldownMs === "number" && baseCooldownMs > 0) ? baseCooldownMs : 0;
  if (base <= 0) return 0;

  var cel = (typeof celerity === "number" && celerity > 0) ? celerity : 0;
  if (cel <= 0) return base;

  var opts = options || {};
  var minRatio = (typeof opts.minRatio === "number" && opts.minRatio > 0 && opts.minRatio <= 1) ? opts.minRatio : 0.5;

  var effective = base / (1 + cel / 100);
  var floor = base * minRatio;
  return Math.max(floor, effective);
}

window.createCooldownState = createCooldownState;
window.isCooldownReady = isCooldownReady;
window.startCooldown = startCooldown;
window.tickCooldowns = tickCooldowns;
window.checkActionConditions = checkActionConditions;
window.canUseAction = canUseAction;
window.useAction = useAction;
window.computeEffectiveCooldownMs = computeEffectiveCooldownMs;
