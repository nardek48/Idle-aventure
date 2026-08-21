"use strict";
/* ============================================================
Aethervale — ui/grimoire-view.js
v3.50.0 : écran "Grimoire" — édition des règles conditionnelles du
combat auto (étape 4a du Grimoire de tactiques, 2 slots FIXES pour
cette première livraison — le déblocage progressif par jalons
narratifs de monde viendra dans une étape ultérieure, voir résumé de
session).

Chaque slot est une carte { conditionId, actionSlot } (voir
game.grimoireRules, systems/save-system.js) éditée via 2 sélecteurs
déroulants simples — pas de glisser-déposer pour cette 1ère livraison,
l'ORDRE du tableau (slot 1 avant slot 2) fait déjà toute la priorité
nécessaire avec seulement 2 entrées (voir chooseGrimoireAction(),
systems/combat-auto-policy-system.js).

Conditions = cartes visuelles (data/grimoire-conditions.js), seuils
numériques jamais affichés ici, cohérent avec la décision de
conception actée par Seb. Actions assignables = skill1/skill2/skill3/
defense de la classe du héros COURANT uniquement (jamais "basic", voir
la note de ClassCombatManager.tickAutoSkills() pour la raison exacte)
— si le joueur change de héros/classe, les actionSlot restent valides
(les 4 slots existent dans les 3 kits) mais leurs LABELS affichés
changent automatiquement au prochain rendu (aucune donnée à migrer).
============================================================ */

/* Nombre de slots fixes pour cette 1ère livraison — un futur
   déblocage progressif par jalon de monde fera grandir ce nombre,
   voir la note en tête de fichier. */
var GRIMOIRE_SLOT_COUNT = 2;

/* S'assure que game.grimoireRules existe et a EXACTEMENT
   GRIMOIRE_SLOT_COUNT entrées, sans jamais écraser une règle déjà
   configurée (même contrat que les autres ensure() du projet, voir
   ClassCombatManager.ensure() pour le précédent). Complète avec des
   slots vides { conditionId: null, actionSlot: null } si nécessaire,
   tronque si trop d'entrées (ex. sauvegarde d'une version future avec
   plus de slots, chargée sur une build qui n'en gère que 2). */
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

function buildGrimoireActionOptionsHTML(kit, selectedSlot) {
  var h = '<option value="">— Choisir une action —</option>';
  if (!kit || !kit.actions) return h;

  GRIMOIRE_ASSIGNABLE_SLOTS.forEach(function (slot) {
    var action = kit.actions[slot];
    if (!action) return;
    h += '<option value="' + esc(slot) + '"' + (selectedSlot === slot ? ' selected' : '') + '>'
      + esc(action.label) + '</option>';
  });
  return h;
}

function buildGrimoireRuleCardHTML(index, rule, kit) {
  var cond = getGrimoireCondition(rule.conditionId);
  var action = (kit && kit.actions && rule.actionSlot) ? kit.actions[rule.actionSlot] : null;

  var h = '<div class="panel-card grimoire-rule-card">';
  h += '<h3>Règle ' + (index + 1) + '</h3>';

  h += '<label class="grimoire-field-label">Si...</label>';
  h += '<select class="grimoire-select" onchange="setGrimoireRuleCondition(' + index + ', this.value)">';
  h += buildGrimoireConditionOptionsHTML(rule.conditionId);
  h += '</select>';
  if (cond) {
    h += '<p class="panel-sub grimoire-condition-desc">' + esc(cond.description) + '</p>';
  }

  h += '<label class="grimoire-field-label">Alors...</label>';
  h += '<select class="grimoire-select" onchange="setGrimoireRuleAction(' + index + ', this.value)"' + (!kit ? ' disabled' : '') + '>';
  h += buildGrimoireActionOptionsHTML(kit, rule.actionSlot);
  h += '</select>';
  if (!kit) {
    h += '<p class="panel-sub">Choisis d\'abord un héros pour assigner une action.</p>';
  } else if (action) {
    h += '<p class="panel-sub grimoire-action-desc">' + esc(action.description) + '</p>';
  }

  h += '</div>';
  return h;
}

function buildGrimoireHTML() {
  ensureGrimoireRules();
  var kit = getGrimoireCurrentKit();

  var h = '<div class="panel-card">';
  h += '<h3>📖 Grimoire de tactiques</h3>';
  h += '<p class="panel-sub">Programme des règles pour ton combat automatique : si une situation se présente, ton héros utilisera l\'action choisie en priorité. Les règles s\'ajoutent au comportement automatique habituel — s\'il n\'y a pas de règle applicable, ton héros continue de se battre normalement.</p>';
  h += '</div>';

  if (!game.autoSkillsEnabled) {
    h += '<div class="panel-card grimoire-warning-card">';
    h += '<p class="panel-sub">⚠️ Le combat automatique est désactivé (voir Paramètres) — les règles ci-dessous seront ignorées tant qu\'il ne l\'est pas.</p>';
    h += '</div>';
  }

  game.grimoireRules.forEach(function (rule, index) {
    h += buildGrimoireRuleCardHTML(index, rule, kit);
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
