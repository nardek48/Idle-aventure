"use strict";
/* ============================================================
Aethervale — ui/combat-sandbox-view.js
v3.33.4 : écran "Bac à sable de combat" (Paramètres > Bac à sable de
combat) — outil de développement pour tester manuellement les 3
classes (data/classes.js, data/class-skills.js) contre un ennemi réel
(data/enemies.js), via systems/combat-sandbox-system.js.

État isolé : _sandboxUiState (variable de module ci-dessous), JAMAIS
game.*. Ce fichier ne fait qu'orchestrer l'affichage autour des
fonctions PURES de combat-sandbox-system.js — il ne recalcule aucune
règle de combat ici. Rien n'est sauvegardé (pas de champ save-system),
rien n'est envoyé à combat-engine.js.
============================================================ */

/* État d'écran (sélections en cours + état de combat actif, ou null
   avant "Lancer le combat"). Réinitialisé par resetSandboxSelection()/
   au chargement de l'écran (buildCombatSandboxHTML() ne réinitialise
   PAS automatiquement pour permettre de revenir sur l'écran sans
   perdre un combat en cours, ex. après une navigation accidentelle). */
var _sandboxUiState = {
  classId: null,
  heroId: null,
  enemyId: null,
  combat: null // objet retourné par createSandboxCombatState(), ou null
};

/* Rafraîchit uniquement le contenu de l'écran (pas tout le panel) —
   évite de perdre le scroll/focus des sélecteurs à chaque clic. */
function renderCombatSandboxScreen() {
  var container = document.getElementById("panel-container");
  if (!container) return;
  container.innerHTML = buildCombatSandboxHTML();
}

function buildCombatSandboxHTML() {
  var h = '<div class="nb-page-frame">';
  h += '<div class="sandbox-intro">';
  h += '<div class="sandbox-intro-title">🧪 Bac à sable de combat</div>';
  h += '<div class="sandbox-intro-desc">Outil de développement — teste les kits de classe (data/class-skills.js) contre un ennemi réel, sans toucher à ta partie : aucune sauvegarde, aucune récompense, aucune progression.</div>';
  h += '</div>';

  h += buildSandboxSetupHTML();

  if (_sandboxUiState.combat) {
    h += buildSandboxCombatHTML(_sandboxUiState.combat);
  }

  h += '</div>';
  return h;
}

/* Section de configuration : classe -> héros -> ennemi -> Lancer. */
function buildSandboxSetupHTML() {
  var h = '<div class="sandbox-card">';
  h += '<div class="sandbox-card-title">1. Classe</div>';
  h += '<div class="sandbox-class-row">';
  (window.CLASSES || []).forEach(function (cls) {
    var isActive = _sandboxUiState.classId === cls.id;
    h += '<button class="sandbox-choice-btn' + (isActive ? ' is-active' : '') + '" onclick="selectSandboxClass(\'' + esc(cls.id) + '\')">';
    h += '<span class="sandbox-choice-icon">' + esc(cls.icon || '⚔️') + '</span>';
    h += '<span>' + esc(cls.label) + '</span>';
    h += '</button>';
  });
  h += '</div>';

  var selectedClass = _sandboxUiState.classId ? getClassById(_sandboxUiState.classId) : null;
  if (selectedClass) {
    h += '<div class="sandbox-card-title">2. Héros</div>';
    h += '<div class="sandbox-class-row">';
    selectedClass.heroIds.forEach(function (heroId) {
      var hero = HEROES_DB[heroId];
      if (!hero) return;
      var isActive = _sandboxUiState.heroId === heroId;
      h += '<button class="sandbox-choice-btn' + (isActive ? ' is-active' : '') + '" onclick="selectSandboxHero(\'' + esc(heroId) + '\')">';
      h += '<span>' + esc(hero.name) + '</span>';
      h += '</button>';
    });
    h += '</div>';
  }

  h += '<div class="sandbox-card-title">3. Ennemi</div>';
  h += '<select class="sandbox-enemy-select" onchange="selectSandboxEnemy(this.value)">';
  h += '<option value="">— Choisir un ennemi —</option>';
  var enemies = (typeof listSandboxEnemies === "function") ? listSandboxEnemies() : [];
  enemies.forEach(function (e) {
    var isSelected = _sandboxUiState.enemyId === e.id;
    h += '<option value="' + esc(e.id) + '"' + (isSelected ? ' selected' : '') + '>' + esc(e.name) + '</option>';
  });
  h += '</select>';

  var canLaunch = !!(_sandboxUiState.classId && _sandboxUiState.heroId && _sandboxUiState.enemyId);
  h += '<button class="settings-btn primary sandbox-launch-btn" ' + (canLaunch ? '' : 'disabled') + ' onclick="launchSandboxCombat()">▶️ Lancer le combat</button>';

  if (_sandboxUiState.combat) {
    h += '<button class="settings-btn sandbox-reset-btn" onclick="resetSandboxCombat()">🔄 Réinitialiser</button>';
  }

  h += '</div>';
  return h;
}

/* Section combat actif : PV, ressource, boutons d'action, journal. */
function buildSandboxCombatHTML(state) {
  var resourceDef = getClassResource(state.classId);
  var kit = getClassSkills(state.classId);

  var h = '<div class="sandbox-card sandbox-combat-card">';

  h += '<div class="sandbox-status-row">';
  h += buildSandboxCombatantHTML(state.hero.name + ' (test)', state.hero.hp, state.hero.maxHp, 'hero');
  h += buildSandboxCombatantHTML(state.enemy.name, state.enemy.hp, state.enemy.maxHp, 'enemy');
  h += '</div>';

  if (resourceDef) {
    var pct = Math.round((state.resourceState.current / state.resourceState.max) * 100);
    h += '<div class="sandbox-resource-bar-wrap">';
    h += '<div class="sandbox-resource-label">' + esc(resourceDef.label) + ' : ' + Math.round(state.resourceState.current * 10) / 10 + ' / ' + state.resourceState.max + '</div>';
    h += '<div class="sandbox-resource-bar"><div class="sandbox-resource-bar-fill" style="width:' + pct + '%"></div></div>';
    h += '</div>';
  }

  if (state.status !== "ongoing") {
    h += '<div class="sandbox-result sandbox-result-' + esc(state.status) + '">';
    h += state.status === "victory" ? "🏆 Victoire" : "💀 Défaite";
    h += '</div>';
  }

  h += '<div class="sandbox-actions-grid">';
  ["basic", "skill1", "skill2", "skill3", "defense"].forEach(function (slot) {
    var action = kit.actions[slot];
    h += buildSandboxActionButtonHTML(state, action, slot);
  });
  h += '</div>';

  h += '<div class="sandbox-log-title">📜 Journal de combat</div>';
  h += '<div class="sandbox-log">';
  var lines = state.log.slice(-40).slice().reverse();
  lines.forEach(function (entry) {
    h += '<div class="sandbox-log-line">' + esc(entry.text) + '</div>';
  });
  if (!lines.length) h += '<div class="sandbox-log-line sandbox-log-empty">Aucune action pour l\'instant.</div>';
  h += '</div>';

  h += '</div>';
  return h;
}

function buildSandboxCombatantHTML(name, hp, maxHp, side) {
  var pct = maxHp > 0 ? Math.max(0, Math.round((hp / maxHp) * 100)) : 0;
  var h = '<div class="sandbox-combatant sandbox-combatant-' + esc(side) + '">';
  h += '<div class="sandbox-combatant-name">' + esc(name) + '</div>';
  h += '<div class="sandbox-hp-bar"><div class="sandbox-hp-bar-fill" style="width:' + pct + '%"></div></div>';
  h += '<div class="sandbox-hp-value">' + Math.max(0, Math.floor(hp)) + ' / ' + Math.floor(maxHp) + ' PV</div>';
  h += '</div>';
  return h;
}

/* État visuel d'un bouton d'action : disponible / cooldown (avec
   temps restant) / ressource insuffisante / condition non remplie —
   dérivé des mêmes fonctions pures que la simulation elle-même
   (canAfford/isCooldownReady/checkActionConditions), jamais recalculé
   indépendamment ici. */
function buildSandboxActionButtonHTML(state, action, slot) {
  if (!action) return '';
  var combatContext = { enemyHp: state.enemy.hp, enemyMaxHp: state.enemy.maxHp };
  var combatOngoing = state.status === "ongoing";

  var affordable = canAfford(state.resourceState, action.resourceCost);
  var cooldownRemaining = state.cooldownState[action.id] || 0;
  var ready = isCooldownReady(state.cooldownState, action.id);
  var conditionOk = checkActionConditions(action.conditions, combatContext);

  var usable = combatOngoing && affordable && ready && conditionOk;

  var stateClass = 'is-ready';
  var stateLabel = 'Disponible';
  if (!combatOngoing) {
    stateClass = 'is-disabled'; stateLabel = 'Combat terminé';
  } else if (!ready) {
    stateClass = 'is-cooldown'; stateLabel = Math.ceil(cooldownRemaining / 100) / 10 + 's';
  } else if (!affordable) {
    stateClass = 'is-unaffordable'; stateLabel = 'Ressource insuffisante';
  } else if (!conditionOk) {
    stateClass = 'is-blocked'; stateLabel = 'Condition non remplie';
  }

  var h = '<button class="sandbox-action-btn ' + stateClass + '" ' + (usable ? '' : 'disabled') + ' onclick="triggerSandboxAction(\'' + esc(slot) + '\')">';
  h += '<span class="sandbox-action-label">' + esc(action.label) + '</span>';
  h += '<span class="sandbox-action-cost">' + (action.resourceCost > 0 ? action.resourceCost : '—') + '</span>';
  h += '<span class="sandbox-action-state">' + esc(stateLabel) + '</span>';
  h += '</button>';
  return h;
}

/* ============================================================
   Handlers — appelés depuis les onclick ci-dessus. Chacun mute
   UNIQUEMENT _sandboxUiState (variable de module isolée), jamais
   game.*, puis redessine l'écran.
============================================================ */

function selectSandboxClass(classId) {
  var cls = getClassById(classId);
  if (!cls) return;
  _sandboxUiState.classId = classId;
  // Changer de classe invalide le héros sélectionné s'il n'y appartient plus.
  if (!cls.heroIds.includes(_sandboxUiState.heroId)) {
    _sandboxUiState.heroId = null;
  }
  renderCombatSandboxScreen();
}

function selectSandboxHero(heroId) {
  if (!HEROES_DB[heroId]) return;
  _sandboxUiState.heroId = heroId;
  renderCombatSandboxScreen();
}

function selectSandboxEnemy(enemyId) {
  _sandboxUiState.enemyId = enemyId || null;
  renderCombatSandboxScreen();
}

function launchSandboxCombat() {
  var s = _sandboxUiState;
  if (!s.classId || !s.heroId || !s.enemyId) return;
  var combat = createSandboxCombatState(s.classId, s.heroId, s.enemyId);
  if (!combat) {
    if (typeof showToast === "function") showToast("Impossible de démarrer le combat de test.");
    return;
  }
  _sandboxUiState.combat = combat;
  renderCombatSandboxScreen();
}

function triggerSandboxAction(slot) {
  if (!_sandboxUiState.combat) return;
  _sandboxUiState.combat = applySandboxAction(_sandboxUiState.combat, slot);
  renderCombatSandboxScreen();
}

/* Relance un combat neuf avec la même sélection classe/héros/ennemi
   (ne recharge pas la page, comme demandé). */
function resetSandboxCombat() {
  var s = _sandboxUiState;
  if (s.classId && s.heroId && s.enemyId) {
    _sandboxUiState.combat = createSandboxCombatState(s.classId, s.heroId, s.enemyId);
  } else {
    _sandboxUiState.combat = null;
  }
  renderCombatSandboxScreen();
}

window.buildCombatSandboxHTML = buildCombatSandboxHTML;
window.selectSandboxClass = selectSandboxClass;
window.selectSandboxHero = selectSandboxHero;
window.selectSandboxEnemy = selectSandboxEnemy;
window.launchSandboxCombat = launchSandboxCombat;
window.triggerSandboxAction = triggerSandboxAction;
window.resetSandboxCombat = resetSandboxCombat;
