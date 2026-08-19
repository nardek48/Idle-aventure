"use strict";
/* ============================================================
Aethervale — systems/combat-auto-policy-system.js
v3.33.10 : logique de DÉCISION AUTOMATIQUE pour le mode "Simulation
auto" du bac à sable (voir ui/combat-sandbox-view.js et
systems/combat-batch-sim-system.js).

STATUT — logique pure, mêmes garanties que combat-resource-system.js
et combat-cooldown-system.js :
  - Aucun accès à game.*, au DOM, ni à combat-engine.js/
    special-attack-system.js/stats-system.js/game-loop.js/
    save-system.js.
  - Toute donnée nécessaire est reçue en paramètre, jamais lue depuis
    une variable globale de partie.
  - Ne mute jamais les objets reçus.
  - Réutilise EXCLUSIVEMENT canUseAction() (déjà exporté par
    systems/combat-cooldown-system.js) pour la vérification de
    disponibilité d'une action — aucune duplication de cette logique
    ici (mêmes règles que le joueur manuel : ressource, cooldown,
    conditions).
============================================================ */

/* chooseAutoAction(priorityList, kit, resourceState, cooldownState, combatContext)
   Parcourt priorityList (tableau de slots, ex. ["skill3","skill2",
   "skill1","defense","basic"]) dans l'ordre et retourne le PREMIER
   slot dont l'action est utilisable (canUseAction()), ou null si
   aucune action de la liste n'est utilisable à cet instant (le
   combat "n'agit pas ce tick", comportement demandé — jamais un
   choix par défaut hors liste).

   - priorityList : tableau de chaînes, voir data/auto-policy-defaults.js.
     Slots absents du kit ou invalides silencieusement ignorés (pas
     d'exception) plutôt que de casser le parcours.
   - kit : objet {classId, resource, actions} — voir getClassSkills()
     (data/class-skills.js), reçu en paramètre, jamais relu ici.
   - resourceState/cooldownState : états purs des modules dédiés.
   - combatContext : { enemyHp, enemyMaxHp } — même forme que celle
     construite par applySandboxAction()/combat-cooldown-system.js.

   Retourne null si priorityList/kit est absent/invalide. Ne mute
   rien, ne lit aucun état externe. */
function chooseAutoAction(priorityList, kit, resourceState, cooldownState, combatContext) {
  if (!priorityList || !Array.isArray(priorityList) || !kit || !kit.actions) return null;
  if (typeof canUseAction !== "function") return null;

  for (var i = 0; i < priorityList.length; i++) {
    var slot = priorityList[i];
    if (typeof slot !== "string") continue;
    var action = kit.actions[slot];
    if (!action) continue; // slot inconnu du kit réel — ignoré silencieusement
    if (canUseAction(resourceState, cooldownState, action, combatContext)) {
      return slot;
    }
  }
  return null; // rien d'utilisable ce tick
}

/* sanitizeAutoPolicyList(rawList, kit)
   Nettoie une liste de priorité potentiellement fournie par l'écran
   (réordonnée par l'utilisateur) : ne garde que des chaînes qui
   correspondent à un slot RÉELLEMENT présent dans kit.actions,
   dédoublonnées, dans l'ordre reçu. Retourne [] si rawList ou kit
   est absent/invalide — jamais d'exception. Utilisée avant de
   lancer une rafale, pour ne jamais transmettre une priorité
   corrompue au moteur de simulation. Ne mute jamais rawList. */
function sanitizeAutoPolicyList(rawList, kit) {
  if (!rawList || !Array.isArray(rawList) || !kit || !kit.actions) return [];
  var seen = {};
  var cleaned = [];
  for (var i = 0; i < rawList.length; i++) {
    var slot = rawList[i];
    if (typeof slot !== "string" || seen[slot] || !kit.actions[slot]) continue;
    seen[slot] = true;
    cleaned.push(slot);
  }
  return cleaned;
}

window.chooseAutoAction = chooseAutoAction;
window.sanitizeAutoPolicyList = sanitizeAutoPolicyList;
