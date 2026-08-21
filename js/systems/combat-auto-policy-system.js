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

/* ============================================================
v3.50.0 : moteur du GRIMOIRE DE TACTIQUES (étape 4a) — extension de
ce même fichier, MÊME contrat de pureté que chooseAutoAction()/
sanitizeAutoPolicyList() ci-dessus (aucun accès à game.*, au DOM, ni à
combat-engine.js/stats-system.js/game-loop.js/save-system.js ;
combatContext est fourni par l'appelant, jamais relu ici).

Décision actée par Seb : si AUCUNE règle configurée ne matche à
l'instant T, le combat auto retombe sur getAutoPolicyDefault() —
le Grimoire s'AJOUTE à la priorité par défaut, ne la remplace jamais
totalement. C'est la responsabilité de l'APPELANT (ClassCombatManager.
tickAutoSkills(), systems/class-combat-system.js) d'enchaîner
chooseGrimoireAction() puis chooseAutoAction() en repli — cette
fonction elle-même ne connaît PAS la priorité par défaut.
============================================================ */

/* Seuil caché derrière la carte "Je suis blessé" (heroLowHp, voir
   data/grimoire-conditions.js) — 40%, volontairement généreux (se
   déclenche tôt) : réponse explicite de Seb, cohérent avec un jeu
   accessible à un jeune public — mieux vaut réagir tôt qu'attendre
   une situation vraiment critique. */
var HERO_LOW_HP_THRESHOLD_PCT = 0.40;

/* evaluateGrimoireCondition(conditionId, combatContext)
   Vérifie si une carte de condition (voir data/grimoire-conditions.js)
   est vraie MAINTENANT, à partir de combatContext — jamais de lecture
   directe de game.* ni de Date.now() ici (l'appelant doit avoir déjà
   résolu ces horodatages en booléens/nombres dans combatContext, voir
   ClassCombatManager.getGrimoireCombatContext()).

   combatContext attendu (sur-ensemble de celui de canUseAction()) :
     { enemyHp, enemyMaxHp,           // déjà utilisé par Exécution
       chargeIncoming: bool,          // game.enemy.chargeTelegraphUntil actif
       shieldIncoming: bool,          // game.enemy.shieldTelegraphUntil actif
       healIncoming: bool,            // game.enemy.healTelegraphUntil actif
       heroHpPercent: number|null }   // game.heroHp / game.heroMaxHp, 0-1

   Un conditionId inconnu retourne false (jamais vrai par défaut — une
   règle mal configurée ne doit jamais agir "par erreur"). Ne mute
   rien, ne lit aucun état externe. */
function evaluateGrimoireCondition(conditionId, combatContext) {
  var ctx = combatContext || {};

  switch (conditionId) {
    case "chargeIncoming":
      return !!ctx.chargeIncoming;
    case "shieldIncoming":
      return !!ctx.shieldIncoming;
    case "healIncoming":
      return !!ctx.healIncoming;
    case "heroLowHp":
      return typeof ctx.heroHpPercent === "number" && ctx.heroHpPercent <= HERO_LOW_HP_THRESHOLD_PCT;
    default:
      return false;
  }
}

/* chooseGrimoireAction(rules, kit, resourceState, cooldownState, combatContext)
   Parcourt rules (tableau de { conditionId, actionSlot }, voir
   game.grimoireRules) DANS L'ORDRE (slot 1 puis slot 2 — l'ordre du
   tableau EST la priorité, pas de champ de priorité séparé) et
   retourne le PREMIER actionSlot dont :
     1) la condition est vraie (evaluateGrimoireCondition()) ET
     2) l'action est RÉELLEMENT utilisable (canUseAction() — même
        garde que le mode manuel et que chooseAutoAction() : ressource
        suffisante, cooldown écoulé, conditions déclaratives de
        l'action elle-même comme Exécution).
   Une règle dont la condition est vraie mais l'action indisponible
   (pas assez de ressource, en cooldown) est SAUTÉE — passe à la règle
   suivante, jamais un blocage. Retourne null si aucune règle ne
   matche (c'est alors à l'appelant de retomber sur
   getAutoPolicyDefault(), voir en-tête de section).

   - rules : tableau d'objets { conditionId, actionSlot }. Entrées
     invalides (pas un objet, conditionId/actionSlot absents ou pas
     des chaînes) silencieusement ignorées. Une règle avec
     actionSlot: null ("aucune action assignée", slot vide dans
     l'écran Grimoire) est aussi ignorée sans erreur.
   - kit/resourceState/cooldownState/combatContext : mêmes formes que
     chooseAutoAction() ci-dessus.

   Retourne null si rules/kit est absent/invalide. Ne mute rien. */
function chooseGrimoireAction(rules, kit, resourceState, cooldownState, combatContext) {
  if (!rules || !Array.isArray(rules) || !kit || !kit.actions) return null;
  if (typeof canUseAction !== "function") return null;

  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    if (!rule || typeof rule !== "object") continue;
    if (typeof rule.conditionId !== "string" || typeof rule.actionSlot !== "string") continue;
    // v3.50.0 : "basic" explicitement exclu même si présent (défense
    // en profondeur — sanitizeGrimoireRules() le filtre déjà en amont,
    // voir sa note pour la raison exacte). Ne dépend jamais du seul
    // filtrage côté sauvegarde.
    if (rule.actionSlot === "basic") continue;

    if (!evaluateGrimoireCondition(rule.conditionId, combatContext)) continue;

    var action = kit.actions[rule.actionSlot];
    if (!action) continue; // slot inconnu du kit réel — ignoré silencieusement

    if (canUseAction(resourceState, cooldownState, action, combatContext)) {
      return rule.actionSlot;
    }
    // condition vraie mais action indisponible (ressource/cooldown) :
    // on NE bloque PAS ici — on continue vers la règle suivante,
    // cohérent avec "jamais un mur silencieux" (principe acté par
    // Seb pour le diagnostic d'échec, même esprit appliqué ici).
  }
  return null;
}

window.HERO_LOW_HP_THRESHOLD_PCT = HERO_LOW_HP_THRESHOLD_PCT;
window.evaluateGrimoireCondition = evaluateGrimoireCondition;
window.chooseGrimoireAction = chooseGrimoireAction;

/* v3.50.0 : slots assignables dans une règle du Grimoire — "basic"
   EXCLU délibérément (voir ClassCombatManager.tickAutoSkills(),
   systems/class-combat-system.js, pour la raison exacte : useSkill
   ("basic") court-circuiterait le gain de ressource normalement lié à
   CombatEngine.playerAttack(), bug silencieux tranché par Seb en
   faveur de l'exclusion plutôt que de complexifier useSkill()). */
var GRIMOIRE_ASSIGNABLE_SLOTS = ["skill1", "skill2", "skill3", "defense"];

/* sanitizeGrimoireRules(rawRules, kit)
   Nettoie un tableau de règles potentiellement fourni par l'écran
   Grimoire (voir ui/grimoire-view.js) avant sauvegarde/lecture : ne
   garde que des entrées { conditionId, actionSlot } où conditionId
   est une clé RÉELLE de GRIMOIRE_CONDITIONS (data/grimoire-
   conditions.js) et actionSlot une clé de GRIMOIRE_ASSIGNABLE_SLOTS
   PRÉSENTE dans kit.actions (le kit de la classe courante — un slot
   valide en général mais absent de CE kit précis, ex. futur kit
   incomplet, est quand même filtré). Une entrée peut avoir
   actionSlot: null ("condition choisie, action pas encore assignée"
   — état transitoire normal pendant l'édition, PAS filtré : conservé
   tel quel, chooseGrimoireAction() l'ignore déjà proprement via son
   propre garde typeof "string"). Retourne [] si rawRules n'est pas un
   tableau. Ne mute jamais rawRules. Longueur jamais tronquée ici (le
   nombre de slots fixes, 2 pour cette livraison, est appliqué côté
   UI/init — voir GRIMOIRE_SLOT_COUNT, ui/grimoire-view.js). */
function sanitizeGrimoireRules(rawRules, kit) {
  if (!rawRules || !Array.isArray(rawRules)) return [];

  return rawRules.map(function (rule) {
    if (!rule || typeof rule !== "object") return { conditionId: null, actionSlot: null };

    var conditionId = (typeof rule.conditionId === "string" && typeof GRIMOIRE_CONDITIONS !== "undefined" && GRIMOIRE_CONDITIONS[rule.conditionId])
      ? rule.conditionId
      : null;

    var actionSlot = null;
    if (typeof rule.actionSlot === "string"
      && GRIMOIRE_ASSIGNABLE_SLOTS.indexOf(rule.actionSlot) !== -1
      && (!kit || !kit.actions || kit.actions[rule.actionSlot])) {
      actionSlot = rule.actionSlot;
    }

    return { conditionId: conditionId, actionSlot: actionSlot };
  });
}

window.GRIMOIRE_ASSIGNABLE_SLOTS = GRIMOIRE_ASSIGNABLE_SLOTS;
window.sanitizeGrimoireRules = sanitizeGrimoireRules;
