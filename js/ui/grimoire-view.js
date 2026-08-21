"use strict";
/* ============================================================
Aethervale — ui/grimoire-view.js
v3.50.0 : écran "Grimoire" — édition des règles conditionnelles du
combat auto (étape 4a).
v3.51.0 : jalons narratifs par monde (étape 4b) — le nombre de slots
RÉELLEMENT UTILISABLES grandit avec la progression (2 de base + 1 par
monde parmi Ruines/Crypte/Montagne/Tour atteint pour la 1ère fois, voir
getGrimoireSlotCount(), systems/combat-auto-policy-system.js), jusqu'à
GRIMOIRE_SLOT_COUNT (6, le maximum théorique) — décision actée : pas
de contrainte de condition imposée sur un nouveau slot, le joueur
choisit librement quoi y assigner dès qu'il est débloqué.

game.grimoireRules contient TOUJOURS GRIMOIRE_SLOT_COUNT entrées (même
les verrouillées, voir ensureGrimoireRules()) plutôt qu'un tableau à
taille variable — plus simple à maintenir qu'un tableau qui grandirait
à chaque déblocage, et permet à un joueur de préparer une règle sur un
slot pas encore débloqué (elle est juste ignorée par
ClassCombatManager.tickAutoSkills() tant que le slot n'est pas
débloqué, voir sa note sur le troncage par getGrimoireSlotCount()) —
mais l'écran l'affiche quand même GRISÉ/désactivé plutôt que masqué,
pour montrer au joueur qu'un déblocage futur existe.

Chaque slot est une carte { conditionId, actionSlot } (voir
game.grimoireRules, systems/save-system.js) éditée via 2 sélecteurs
déroulants simples — pas de glisser-déposer, l'ORDRE du tableau
(slot 1 avant slot 2 avant...) fait déjà toute la priorité nécessaire
(voir chooseGrimoireAction(), systems/combat-auto-policy-system.js).

Conditions = cartes visuelles (data/grimoire-conditions.js), seuils
numériques jamais affichés ici, cohérent avec la décision de
conception actée par Seb. Actions assignables = skill1/skill2/skill3/
defense de la classe du héros COURANT uniquement (jamais "basic", voir
la note de ClassCombatManager.tickAutoSkills() pour la raison exacte)
— si le joueur change de héros/classe, les actionSlot restent valides
(les 4 slots existent dans les 3 kits) mais leurs LABELS affichés
changent automatiquement au prochain rendu (aucune donnée à migrer).
============================================================ */

/* Nombre MAXIMAL théorique de slots (2 de base + 4 jalons de monde,
   voir GRIMOIRE_BASE_SLOT_COUNT/GRIMOIRE_UNLOCK_WORLD_INDEXES,
   systems/combat-auto-policy-system.js) — game.grimoireRules a
   TOUJOURS cette longueur, voir ensureGrimoireRules(). Le nombre
   RÉELLEMENT débloqué (potentiellement inférieur) est calculé à la
   volée par getGrimoireSlotCount(game.worldsEverReached), jamais
   stocké séparément (une seule source de vérité : worldsEverReached). */
var GRIMOIRE_SLOT_COUNT = 6;

/* S'assure que game.grimoireRules existe et a EXACTEMENT
   GRIMOIRE_SLOT_COUNT entrées (le maximum théorique, PAS le nombre
   débloqué — voir en-tête de fichier), sans jamais écraser une règle
   déjà configurée (même contrat que les autres ensure() du projet,
   voir ClassCombatManager.ensure() pour le précédent). Complète avec
   des slots vides { conditionId: null, actionSlot: null } si
   nécessaire, tronque si trop d'entrées (ex. sauvegarde d'une version
   future avec plus de slots, chargée sur une build qui n'en gère que 6). */
function ensureGrimoireRules() {
  if (!Array.isArray(game.grimoireRules)) game.grimoireRules = [];

  while (game.grimoireRules.length < GRIMOIRE_SLOT_COUNT) {
    game.grimoireRules.push({ conditionId: null, actionSlot: null });
  }
  if (game.grimoireRules.length > GRIMOIRE_SLOT_COUNT) {
    game.grimoireRules = game.grimoireRules.slice(0, GRIMOIRE_SLOT_COUNT);
  }
  return game.grimoireRules;
}

/* Kit d'actions de la classe du héros COURANT, ou null si aucune
   classe résolue (aucun héros choisi) — même source que
   ClassCombatManager.getAction(), pas dupliquée mais lue directement
   ici pour éviter un aller-retour objet par slot. */
function getGrimoireCurrentKit() {
  if (!window.ClassCombatManager || typeof ClassCombatManager.getCurrentClassId !== "function") return null;
  var classId = ClassCombatManager.getCurrentClassId();
  if (!classId || typeof getClassSkills !== "function") return null;
  return getClassSkills(classId);
}

/* Libellé du monde dont atteindre la première fois débloque LE slot
   d'index donné (index >= GRIMOIRE_BASE_SLOT_COUNT uniquement) — pour
   le message affiché sur une carte verrouillée ("Débloqué en
   atteignant Ruines pour la première fois"). Retourne null pour un
   slot de base (jamais verrouillé) ou un index hors plage. */
function getGrimoireUnlockWorldLabel(slotIndex) {
  var base = (typeof GRIMOIRE_BASE_SLOT_COUNT === "number") ? GRIMOIRE_BASE_SLOT_COUNT : 2;
  var worldIndexes = (typeof GRIMOIRE_UNLOCK_WORLD_INDEXES !== "undefined") ? GRIMOIRE_UNLOCK_WORLD_INDEXES : [];
  var jalonIndex = slotIndex - base;
  if (jalonIndex < 0 || jalonIndex >= worldIndexes.length) return null;

  var worldIndex = worldIndexes[jalonIndex];
  var world = (typeof WORLDS !== "undefined") ? WORLDS[worldIndex] : null;
  return world ? world.name : null;
}

function buildGrimoireConditionOptionsHTML(selectedId) {
  var h = '<option value="">— Choisir une condition —</option>';
  var order = (typeof GRIMOIRE_CONDITION_ORDER !== "undefined") ? GRIMOIRE_CONDITION_ORDER : Object.keys(GRIMOIRE_CONDITIONS || {});
  order.forEach(function (conditionId) {
    var cond = getGrimoireCondition(conditionId);
    if (!cond) return;
    h += '<option value="' + esc(conditionId) + '"' + (selectedId === conditionId ? ' selected' : '') + '>'
      + esc(cond.icon) + ' ' + esc(cond.label) + '</option>';
  });
  return h;
}

/* v3.52.0 : conditionId (optionnel) — si fourni, les actions dont
   action.counters inclut CETTE condition sont marquées d'une icône ⚡
   dans leur libellé (ex. "⚡ Brise-garde"), pour que le joueur
   comprenne visuellement quelles actions contrent la situation
   choisie dans le sélecteur "Si...". Purement informatif ici (aucune
   logique dupliquée — la vraie vérification reste dans
   ClassCombatManager.applyGrimoireCounterIfApplicable(), ce marquage
   ne fait QUE lire le même champ action.counters en lecture seule). */
function buildGrimoireActionOptionsHTML(kit, selectedSlot, conditionId) {
  var h = '<option value="">— Choisir une action —</option>';
  if (!kit || !kit.actions) return h;

  GRIMOIRE_ASSIGNABLE_SLOTS.forEach(function (slot) {
    var action = kit.actions[slot];
    if (!action) return;
    var isCounter = !!(conditionId && Array.isArray(action.counters) && action.counters.indexOf(conditionId) !== -1);
    h += '<option value="' + esc(slot) + '"' + (selectedSlot === slot ? ' selected' : '') + '>'
      + (isCounter ? '⚡ ' : '') + esc(action.label) + '</option>';
  });
  return h;
}

/* v3.51.0 : locked=true pour un slot pas encore débloqué (index >=
   nombre de slots réellement débloqués) — affiché GRISÉ (sélecteurs
   désactivés, mais valeurs déjà choisies par le joueur restent
   VISIBLES, pas cachées) plutôt que masqué, avec le nom du monde qui
   le débloquera. Cohérent avec le principe "jamais un mur silencieux"
   déjà appliqué ailleurs dans le Grimoire (repli de
   chooseGrimoireAction) : le joueur voit toujours ce qui l'attend. */
function buildGrimoireRuleCardHTML(index, rule, kit, locked) {
  var cond = getGrimoireCondition(rule.conditionId);
  var action = (kit && kit.actions && rule.actionSlot) ? kit.actions[rule.actionSlot] : null;
  // v3.52.0 : la règle EST un contre valide si l'action assignée
  // déclare rule.conditionId dans ses counters — même lecture que
  // ClassCombatManager.applyGrimoireCounterIfApplicable() au moment
  // réel du combat, ici seulement pour l'affichage informatif.
  var isActiveCounter = !!(action && rule.conditionId && Array.isArray(action.counters) && action.counters.indexOf(rule.conditionId) !== -1);
  // v3.53.0 : libellés de TOUT ce que l'action assignée contre, quelle
  // que soit la condition actuellement choisie dans "Si..." — visible
  // même AVANT ou en dehors d'une combinaison qui matche déjà, pour
  // que le joueur comprenne le potentiel de son choix sans deviner.
  var counterLabels = (action && typeof getGrimoireCounterLabels === "function") ? getGrimoireCounterLabels(action) : [];

  var h = '<div class="panel-card grimoire-rule-card' + (locked ? ' grimoire-rule-locked' : '') + '">';
  h += '<h3>Règle ' + (index + 1) + (locked ? ' 🔒' : '') + '</h3>';

  if (locked) {
    var worldLabel = getGrimoireUnlockWorldLabel(index);
    h += '<p class="panel-sub">'
      + (worldLabel ? 'Débloquée en atteignant ' + esc(worldLabel) + ' pour la première fois.' : 'Débloquée plus tard dans ta progression.')
      + '</p>';
  }

  h += '<label class="grimoire-field-label">Si...</label>';
  h += '<select class="grimoire-select" onchange="setGrimoireRuleCondition(' + index + ', this.value)"' + (locked ? ' disabled' : '') + '>';
  h += buildGrimoireConditionOptionsHTML(rule.conditionId);
  h += '</select>';
  if (cond) {
    h += '<p class="panel-sub grimoire-condition-desc">' + esc(cond.description) + '</p>';
  }

  h += '<label class="grimoire-field-label">Alors...</label>';
  h += '<select class="grimoire-select" onchange="setGrimoireRuleAction(' + index + ', this.value)"' + ((!kit || locked) ? ' disabled' : '') + '>';
  h += buildGrimoireActionOptionsHTML(kit, rule.actionSlot, rule.conditionId);
  h += '</select>';
  if (!kit) {
    h += '<p class="panel-sub">Choisis d\'abord un héros pour assigner une action.</p>';
  } else if (action) {
    h += '<p class="panel-sub grimoire-action-desc">' + esc(action.description) + '</p>';
    if (counterLabels.length && !isActiveCounter) {
      // v3.53.0 : action a un potentiel de contre, mais la condition
      // choisie actuellement (ou aucune) ne matche pas — indication
      // discrète (pas l'encadré doré réservé à la combinaison ACTIVE
      // ci-dessous) pour orienter le joueur sans fausse promesse.
      h += '<p class="panel-sub">⚡ Cette action contre aussi : ' + esc(counterLabels.join(", ")) + '</p>';
    }
  }
  if (isActiveCounter) {
    h += '<p class="panel-sub grimoire-counter-active">⚡ Cette action CONTRE la situation choisie : elle annulera complètement l\'attaque adverse si elle est utilisée à temps.</p>';
  }

  h += '</div>';
  return h;
}

function buildGrimoireHTML() {
  ensureGrimoireRules();
  var kit = getGrimoireCurrentKit();
  var unlockedCount = (typeof getGrimoireSlotCount === "function") ? getGrimoireSlotCount(game.worldsEverReached) : GRIMOIRE_SLOT_COUNT;

  var h = '<div class="panel-card">';
  h += '<h3>📖 Grimoire de tactiques</h3>';
  h += '<p class="panel-sub">Programme des règles pour ton combat automatique : si une situation se présente, ton héros utilisera l\'action choisie en priorité. Les règles s\'ajoutent au comportement automatique habituel — s\'il n\'y a pas de règle applicable, ton héros continue de se battre normalement.</p>';
  h += '<p class="panel-sub">⚡ Certaines actions marquées d\'un éclair CONTRENT complètement une situation (annulent l\'attaque adverse) si tu les assignes à la bonne condition — regarde les actions disponibles une fois une condition choisie.</p>';
  h += '<p class="panel-sub">🔓 ' + unlockedCount + ' / ' + GRIMOIRE_SLOT_COUNT + ' règles débloquées. De nouvelles règles se débloquent en atteignant de nouveaux mondes pour la première fois.</p>';

  // v3.54.0 : message informatif sur la RÉSERVE de ressource — sans
  // ça, le joueur ne comprend pas pourquoi son combat auto "ralentit"
  // dès qu'une règle de contre est configurée en 1ère position. Calcul
  // identique à getGrimoireCounterReserveAmount() (systems/combat-
  // auto-policy-system.js), lu ici en LECTURE SEULE sur les règles
  // débloquées uniquement (mêmes règles que celles réellement
  // utilisées par ClassCombatManager.tickAutoSkills()).
  if (kit) {
    var activeRulesForReserve = (Array.isArray(game.grimoireRules) && game.grimoireRules.length)
      ? game.grimoireRules.slice(0, unlockedCount)
      : [];
    var reserveAmount = (typeof getGrimoireCounterReserveAmount === "function")
      ? getGrimoireCounterReserveAmount(activeRulesForReserve, kit)
      : 0;
    if (reserveAmount > 0 && kit.resource) {
      h += '<p class="panel-sub">🔒 Ton héros réserve ' + reserveAmount + ' / ' + kit.resource.max + ' ' + esc(kit.resource.label)
        + ' pour garantir ta règle de contre la plus prioritaire — le combat automatique par défaut jouera moins d\'actions coûteuses en attendant.</p>';
    }
  }

  h += '</div>';

  if (!game.autoSkillsEnabled) {
    h += '<div class="panel-card grimoire-warning-card">';
    h += '<p class="panel-sub">⚠️ Le combat automatique est désactivé (voir Paramètres) — les règles ci-dessous seront ignorées tant qu\'il ne l\'est pas.</p>';
    h += '</div>';
  }

  game.grimoireRules.forEach(function (rule, index) {
    h += buildGrimoireRuleCardHTML(index, rule, kit, index >= unlockedCount);
  });

  return '<div class="nb-page-frame">' + h + '</div>';
}

/* Met à jour la condition d'un slot — remise à zéro de l'action
   assignée NON effectuée ici (une action déjà choisie reste valide
   quelle que soit la condition, les 2 champs sont indépendants). */
function setGrimoireRuleCondition(index, conditionId) {
  ensureGrimoireRules();
  if (!game.grimoireRules[index]) return;
  game.grimoireRules[index].conditionId = conditionId || null;
  saveGame();
  if (typeof renderPanel === "function") renderPanel();
}

function setGrimoireRuleAction(index, actionSlot) {
  ensureGrimoireRules();
  if (!game.grimoireRules[index]) return;
  game.grimoireRules[index].actionSlot = actionSlot || null;
  saveGame();
  if (typeof renderPanel === "function") renderPanel();
}

window.GRIMOIRE_SLOT_COUNT = GRIMOIRE_SLOT_COUNT;
window.ensureGrimoireRules = ensureGrimoireRules;
window.buildGrimoireHTML = buildGrimoireHTML;
window.setGrimoireRuleCondition = setGrimoireRuleCondition;
window.setGrimoireRuleAction = setGrimoireRuleAction;
