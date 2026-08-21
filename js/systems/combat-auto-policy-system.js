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
   retourne un OBJET { actionSlot, matchedConditionId } décrivant la
   PREMIÈRE règle dont :
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

   v3.52.0 : retourne désormais { actionSlot, matchedConditionId } au
   lieu d'une simple chaîne actionSlot — matchedConditionId permet à
   l'appelant (ClassCombatManager.tickAutoSkills()) de savoir QUELLE
   condition a déclenché l'action, nécessaire pour le mécanisme de
   contre (action.counters, voir data/class-skills.js) : le contre ne
   doit s'appliquer QUE si l'action vient d'une règle du Grimoire dont
   la condition correspond, jamais via un tap manuel ou le repli par
   défaut (décision explicite de Seb). Seul appelant existant
   (ClassCombatManager.tickAutoSkills()) mis à jour en conséquence,
   aucun autre endroit du code n'appelait cette fonction.

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
      return { actionSlot: rule.actionSlot, matchedConditionId: rule.conditionId };
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

/* ============================================================
v3.51.0 : jalons narratifs par monde (étape 4b) — extension du même
fichier, même contrat de pureté (aucun accès direct à game.*, l'objet
worldsEverReached est fourni en paramètre par l'appelant, jamais relu
depuis game.worldsEverReached ici).

Décision actée par Seb : 2 slots de base (comme depuis l'étape 4a) +
1 slot supplémentaire à CHAQUE monde atteint pour la première fois
parmi Ruines/Crypte/Montagne/Tour (indices 2 à 5 dans WORLDS, voir
data/worlds.js) — jusqu'à 6 slots au maximum. Aucune contrainte de
condition imposée sur le nouveau slot (contrairement à l'idée
initiale du résumé de session) : le joueur choisit librement quoi y
assigner dès qu'il est débloqué — décision affinée avec Seb, les 4
conditions actuelles étant génériques (pas liées à un monde
particulier), rien de thématiquement "nouveau" à y forcer pour
l'instant.
============================================================ */

var GRIMOIRE_BASE_SLOT_COUNT = 2;

/* Indices de monde (WORLDS, voir data/worlds.js) dont la première
   visite débloque 1 slot de Grimoire supplémentaire — Forêt (0) et
   Désert (1) sont accessibles dès le début, donc jamais des jalons
   (leur "première visite" a toujours déjà eu lieu). */
var GRIMOIRE_UNLOCK_WORLD_INDEXES = [2, 3, 4, 5];

/* getGrimoireSlotCount(worldsEverReached)
   Retourne le nombre TOTAL de slots de Grimoire actuellement
   débloqués : GRIMOIRE_BASE_SLOT_COUNT + 1 par entrée vraie de
   worldsEverReached[index] parmi GRIMOIRE_UNLOCK_WORLD_INDEXES.
   worldsEverReached invalide/absent -> seulement les slots de base
   (jamais moins que GRIMOIRE_BASE_SLOT_COUNT, jamais d'exception). */
function getGrimoireSlotCount(worldsEverReached) {
  var reached = (worldsEverReached && typeof worldsEverReached === "object") ? worldsEverReached : {};
  var extra = 0;
  for (var i = 0; i < GRIMOIRE_UNLOCK_WORLD_INDEXES.length; i++) {
    if (reached[GRIMOIRE_UNLOCK_WORLD_INDEXES[i]]) extra++;
  }
  return GRIMOIRE_BASE_SLOT_COUNT + extra;
}

/* isGrimoireWorldUnlockMilestone(worldIndex)
   true si atteindre CE monde pour la première fois débloque un slot
   de Grimoire supplémentaire — utilisée par CombatEngine.killEnemy()
   (combat-engine.js) pour savoir s'il faut annoncer un nouveau slot
   en plus du message "Nouveau monde débloqué" déjà existant. Ne lit
   jamais game.* (l'appelant sait déjà que c'est une PREMIÈRE visite,
   voir markWorldReached()/WorldManager.advance() — cette fonction ne
   fait que dire si CET index fait partie des jalons de Grimoire). */
function isGrimoireWorldUnlockMilestone(worldIndex) {
  return GRIMOIRE_UNLOCK_WORLD_INDEXES.indexOf(worldIndex) !== -1;
}

window.GRIMOIRE_BASE_SLOT_COUNT = GRIMOIRE_BASE_SLOT_COUNT;
window.GRIMOIRE_UNLOCK_WORLD_INDEXES = GRIMOIRE_UNLOCK_WORLD_INDEXES;
window.getGrimoireSlotCount = getGrimoireSlotCount;
window.isGrimoireWorldUnlockMilestone = isGrimoireWorldUnlockMilestone;

/* ============================================================
v3.54.0 : réserve de ressource pour le repli par défaut — extension du
même fichier, même contrat de pureté. Problème signalé par Seb : le
repli par défaut (chooseAutoAction(), priorité fixe) dépense la
ressource dès qu'elle est utilisable, la vidant systématiquement AVANT
qu'un télégraphe de pattern n'apparaisse — rendant les règles de
contre du Grimoire inopérantes en pratique, pas par une erreur de
logique de contre (déjà vérifiée fonctionnelle en v3.52.0) mais par
manque de ressource DISPONIBLE au bon moment. Réponse explicite de
Seb : réserver le coût de l'action de la règle de contre la PLUS
PRIORITAIRE (le 1er slot débloqué dont l'action assignée a des
counters non vides), et UNIQUEMENT pour le repli — les autres règles
du Grimoire (contre ou non) continuent de se déclencher normalement
sans se soucier de cette réserve.
============================================================ */

/* getPrioritaryCounterRule(rules, kit)
   Parcourt rules (déjà tronquées aux slots débloqués par l'appelant)
   DANS L'ORDRE et retourne la PREMIÈRE règle { conditionId, actionSlot }
   dont l'action assignée a un champ counters non vide (voir data/
   class-skills.js) — c'est la règle de contre la PLUS PRIORITAIRE.
   Retourne null si rules/kit est absent/invalide, ou si aucune règle
   configurée n'est un contre. Ne mute rien. Extraite de
   getGrimoireCounterReserveAmount() (v3.54.0) pour être réutilisée
   par le calcul de prédiction (v3.55.0, voir plus bas) sans dupliquer
   la boucle de recherche. */
function getPrioritaryCounterRule(rules, kit) {
  if (!rules || !Array.isArray(rules) || !kit || !kit.actions) return null;

  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    if (!rule || typeof rule !== "object" || typeof rule.actionSlot !== "string") continue;

    var action = kit.actions[rule.actionSlot];
    if (!action || !Array.isArray(action.counters) || !action.counters.length) continue;

    return rule;
  }
  return null;
}

/* getGrimoireCounterReserveAmount(rules, kit)
   Parcourt rules (déjà tronquées aux slots débloqués par l'appelant,
   voir ClassCombatManager.tickAutoSkills()) DANS L'ORDRE et retourne
   le resourceCost de l'action assignée à la PREMIÈRE règle dont
   l'action a un champ counters non vide (voir data/class-skills.js) —
   PAS la règle la plus chère parmi toutes, seulement la plus
   prioritaire (décision explicite de Seb). Retourne 0 si rules/kit
   est absent/invalide, ou si aucune règle configurée n'est un contre
   (repli par défaut alors totalement inchangé, comportement identique
   à avant v3.54.0). Ne mute rien, ne lit aucun état externe.
   v3.55.0 : réécrite pour réutiliser getPrioritaryCounterRule()
   ci-dessus, comportement externe strictement inchangé (mêmes entrées
   -> même sortie qu'avant, vérifié par test de non-régression). */
function getGrimoireCounterReserveAmount(rules, kit) {
  var rule = getPrioritaryCounterRule(rules, kit);
  if (!rule) return 0;

  var action = kit.actions[rule.actionSlot];
  return (typeof action.resourceCost === "number" && action.resourceCost > 0) ? action.resourceCost : 0;
}

window.getPrioritaryCounterRule = getPrioritaryCounterRule;
window.getGrimoireCounterReserveAmount = getGrimoireCounterReserveAmount;

/* v3.59.0 : getAllCounterActionSlots(rules, kit) — retourne TOUS les
   actionSlot (dédoublonnés) des règles configurées dont l'action a un
   champ counters non vide, PAS SEULEMENT la première (contrairement à
   getPrioritaryCounterRule() ci-dessus, toujours utilisée telle
   quelle pour la réserve de ressource — décision inchangée depuis
   v3.54.0, seule la règle la plus prioritaire mérite une réserve de
   ressource). Corrige un bug distinct signalé par Seb : le repli par
   défaut ne devait exclure QUE l'action de la 1ère règle de contre
   (voir ClassCombatManager.tickAutoSkills(), v3.58.0), laissant les
   autres règles de contre (ex. Règle 2, Garde contre la Charge)
   totalement exposées — le repli continuait de les jouer dès que
   leur cooldown était prêt (souvent le cas pour une action "defense"
   gratuite et à cooldown court), les rendant indisponibles au moment
   où le Grimoire en aurait besoin. Retourne [] si rules/kit est
   absent/invalide. Ne mute rien. */
function getAllCounterActionSlots(rules, kit) {
  if (!rules || !Array.isArray(rules) || !kit || !kit.actions) return [];

  var seen = {};
  var slots = [];
  for (var i = 0; i < rules.length; i++) {
    var rule = rules[i];
    if (!rule || typeof rule !== "object" || typeof rule.actionSlot !== "string") continue;

    var action = kit.actions[rule.actionSlot];
    if (!action || !Array.isArray(action.counters) || !action.counters.length) continue;

    if (!seen[rule.actionSlot]) {
      seen[rule.actionSlot] = true;
      slots.push(rule.actionSlot);
    }
  }
  return slots;
}

window.getAllCounterActionSlots = getAllCounterActionSlots;

/* ============================================================
v3.55.0 : fenêtre d'ANTICIPATION du Grimoire — extension du même
fichier, même contrat de pureté. Problème signalé par Seb : même avec
la réserve v3.54.0, celle-ci est active EN PERMANENCE dès qu'une règle
de contre est configurée (bride le repli tout le temps, même quand le
pattern est encore loin) — décision affinée avec Seb : la réserve ne
doit s'activer que dans la fenêtre d'anticipation qui précède le
télégraphe réel du pattern concerné, et UNIQUEMENT si une PRÉDICTION
optimiste montre que la ressource nécessaire sera atteignable à temps
(ressource actuelle + régénération estimée sur la fenêtre restante, en
supposant que le combat auto continue de taper l'attaque de base à son
rythme actuel) — sinon (le contre n'a de toute façon aucune chance
d'être payé à temps), le repli continue de taper librement plutôt que
de se brider pour rien. Décision explicite de Seb : l'estimation reste
OPTIMISTE et peut échouer en pratique (ex. moins de critiques que
prévu pour l'Archer, DPS réel plus bas que celui utilisé pour
l'estimation côté Chevalier) — un vrai enjeu plutôt qu'un calcul
garanti, cohérent avec l'esprit du jeu.

v3.56.0 : fenêtre fixe (5.5s) remplacée par une fenêtre PROPORTIONNELLE
au coût de l'action de contre — problème remonté par Seb en jeu réel :
Exécution (100 Rage, l'action de contre la plus chère du jeu) ne se
déclenchait quasiment jamais, 5.5s étant structurellement insuffisant
pour regagner 100 de ressource dans la plupart des profils de héros
(vérifié par simulation hors-jeu avant tout code, voir résumé partagé
avec Seb — jusqu'à 25s nécessaires pour un Chevalier peu équipé).
Formule retenue après simulation sur les 9 actions de contre réelles
du jeu, plusieurs profils de Célérité/dégâts, et plusieurs facteurs
testés : fenêtre = resourceCost × GRIMOIRE_APPROACH_WINDOW_FACTOR_S_PER_COST
(0.10s par point de coût), avec un PLANCHER minimum
(GRIMOIRE_APPROACH_WINDOW_MIN_S, 3s) pour les actions peu coûteuses qui
n'ont pas vraiment besoin d'une longue anticipation. K=0.10 couvre les
9 actions de contre actuelles avec une marge de sécurité dans un
scénario réaliste moyen (Célérité nulle, dégâts de tap moyens pour le
Chevalier) — K=0.05 (équivalent à l'ancienne fenêtre fixe 5.5s pour un
coût de 55) s'est révélé insuffisant pour 5 des 9 actions testées.

v3.59.0 : fenêtre PROPORTIONNELLE (v3.56.0) remplacée PAR UNE VALEUR
FIXE UNIQUE pour toutes les actions — demande explicite de Seb en
cours de calibrage en jeu réel : la fenêtre variable rendait le
comportement difficile à évaluer (rapide pour une action bon marché,
lente pour une chère), un point de test plus simple demandé pour
isoler les autres variables du diagnostic en cours. GRIMOIRE_APPROACH_
WINDOW_FACTOR_S_PER_COST et GRIMOIRE_APPROACH_WINDOW_MIN_S restent
déclarées (non supprimées, aucun autre appelant ne les utilise) au cas
où on repasse à une formule proportionnelle après calibrage — seule
getGrimoireApproachWindowSeconds() change de comportement.
============================================================ */

var GRIMOIRE_APPROACH_WINDOW_FACTOR_S_PER_COST = 0.10; // conservée, non utilisée depuis v3.59.0 (voir note)
var GRIMOIRE_APPROACH_WINDOW_MIN_S = 3;                 // conservée, non utilisée depuis v3.59.0 (voir note)

/* v3.59.0 : fenêtre FIXE de test — même durée pour TOUTES les actions
   de contre, quel que soit leur coût. Valeur de calibrage, pas un
   choix définitif (voir note d'en-tête). */
var GRIMOIRE_APPROACH_WINDOW_FIXED_S = 10;

/* getGrimoireApproachWindowSeconds(actionResourceCost)
   v3.59.0 : retourne désormais GRIMOIRE_APPROACH_WINDOW_FIXED_S pour
   TOUTE action de contre, quel que soit son coût — valeur de
   calibrage demandée par Seb (voir note d'en-tête pour le contexte).
   actionResourceCost reste accepté en paramètre (contrat de fonction
   inchangé pour l'appelant, ClassCombatManager.shouldActivateGrimoireReserve())
   mais n'est plus utilisé dans le calcul. Ne mute rien. */
function getGrimoireApproachWindowSeconds(actionResourceCost) {
  return GRIMOIRE_APPROACH_WINDOW_FIXED_S;
}

/* estimateResourceGainOverWindow(resourceDef, windowSeconds, effectiveBasicCooldownMs, basicDamageEstimate)
   Estimation OPTIMISTE (pas garantie) du gain de ressource sur
   windowSeconds, à partir de resource.generation (voir data/class-
   skills.js) — couvre les 3 types de génération existants :
     - "passiveAndBasicAttack" (Mage) : passif garanti
       (passivePerSecond × windowSeconds) + attaques de base estimées
       (nombre d'attaques × basicAttackGain).
     - "successfulBasicAttack" (Archer) : attaques de base estimées ×
       value — ignore délibérément criticalBonus (estimation PRUDENTE
       sur ce point précis, le bonus de critique n'est jamais garanti,
       même si l'estimation reste globalement optimiste sur le nombre
       d'attaques qui auront réellement lieu).
     - "damageDealtPercent" (Chevalier) : attaques de base estimées ×
       min(basicDamageEstimate × value, maxGainPerHit) — basicDamageEstimate
       est le dégât de tap ACTUEL du héros (voir EquipmentManager.
       effectiveTapDamage() côté appelant), pas recalculé ici.
   Nombre d'attaques estimées = floor(windowSeconds × 1000 / effectiveBasicCooldownMs)
   — cohérent avec computeEffectiveCooldownMs() déjà existant
   (systems/combat-cooldown-system.js), calculé par l'APPELANT (cette
   fonction ne connaît jamais game.* ni CombatEngine).
   Retourne 0 si resourceDef/generation est absent/invalide, ou si les
   paramètres numériques sont invalides. Ne mute rien. */
function estimateResourceGainOverWindow(resourceDef, windowSeconds, effectiveBasicCooldownMs, basicDamageEstimate) {
  if (!resourceDef || !resourceDef.generation || typeof resourceDef.generation.type !== "string") return 0;
  var window = (typeof windowSeconds === "number" && windowSeconds > 0) ? windowSeconds : 0;
  if (window <= 0) return 0;

  var cooldownMs = (typeof effectiveBasicCooldownMs === "number" && effectiveBasicCooldownMs > 0) ? effectiveBasicCooldownMs : 0;
  var estimatedHits = cooldownMs > 0 ? Math.floor((window * 1000) / cooldownMs) : 0;

  var gen = resourceDef.generation;
  switch (gen.type) {
    case "passiveAndBasicAttack": {
      var passiveGain = (gen.passivePerSecond || 0) * window;
      var basicGain = estimatedHits * (gen.basicAttackGain || 0);
      return passiveGain + basicGain;
    }
    case "successfulBasicAttack": {
      return estimatedHits * (gen.value || 0);
    }
    case "damageDealtPercent": {
      var dmg = (typeof basicDamageEstimate === "number" && basicDamageEstimate > 0) ? basicDamageEstimate : 0;
      var perHit = dmg * (gen.value || 0);
      if (typeof gen.maxGainPerHit === "number" && gen.maxGainPerHit > 0) {
        perHit = Math.min(perHit, gen.maxGainPerHit);
      }
      return estimatedHits * perHit;
    }
    default:
      return 0;
  }
}

window.GRIMOIRE_APPROACH_WINDOW_FACTOR_S_PER_COST = GRIMOIRE_APPROACH_WINDOW_FACTOR_S_PER_COST;
window.GRIMOIRE_APPROACH_WINDOW_MIN_S = GRIMOIRE_APPROACH_WINDOW_MIN_S;
window.GRIMOIRE_APPROACH_WINDOW_FIXED_S = GRIMOIRE_APPROACH_WINDOW_FIXED_S;
window.getGrimoireApproachWindowSeconds = getGrimoireApproachWindowSeconds;
window.estimateResourceGainOverWindow = estimateResourceGainOverWindow;
