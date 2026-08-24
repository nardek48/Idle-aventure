"use strict";
/* ui/grimoire-view.js — écran Grimoire (v3.50-51) : 6 règles conditionnelles {Si condition -> Alors action}, déblocage par jalon de monde. Presets nommés (v3.65), Mode Expert (v3.66), indices de contre/archétype. Détail complet : COMMENTAIRES_ORIGINAUX.md */

function toggleGrimoireExpertMode() {
  game.expertModeEnabled = !game.expertModeEnabled;
  saveGame();
  if (typeof renderPanel === "function") renderPanel();
}

window.toggleGrimoireExpertMode = toggleGrimoireExpertMode;

var GRIMOIRE_SLOT_COUNT = 6;

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

var GRIMOIRE_PRESET_MAX_COUNT = 6;

var GRIMOIRE_PRESET_ICON_CHOICES = ["⚔️", "🛡️", "🏹", "🔮", "👑", "🌲", "🏜️", "🗿"];

function ensureGrimoirePresets() {
  if (!Array.isArray(game.grimoirePresets)) game.grimoirePresets = [];
  return game.grimoirePresets;
}

var _grimoirePresetIdCounter = 0;
function generateGrimoirePresetId() {
  _grimoirePresetIdCounter++;
  return "preset_" + Date.now() + "_" + _grimoirePresetIdCounter;
}

function saveGrimoirePreset(name, icon) {
  var trimmedName = (typeof name === "string") ? name.trim() : "";
  if (!trimmedName) return;

  var presets = ensureGrimoirePresets();
  if (presets.length >= GRIMOIRE_PRESET_MAX_COUNT) return;

  ensureGrimoireRules();
  var rulesSnapshot = (typeof sanitizeGrimoireRules === "function")
    ? sanitizeGrimoireRules(game.grimoireRules, getGrimoireCurrentKit())
    : game.grimoireRules.slice();

  presets.push({
    id: generateGrimoirePresetId(),
    name: trimmedName.slice(0, 30), // même esprit que maxlength sur le nom du héros (modal-view.js)
    icon: (icon && GRIMOIRE_PRESET_ICON_CHOICES.indexOf(icon) !== -1) ? icon : GRIMOIRE_PRESET_ICON_CHOICES[0],
    rules: rulesSnapshot,
    lastModified: Date.now()
  });

  saveGame();
  if (typeof renderPanel === "function") renderPanel();
}

function loadGrimoirePreset(presetId) {
  var presets = ensureGrimoirePresets();
  var preset = presets.filter(function (p) { return p.id === presetId; })[0];
  if (!preset) return;

  game.grimoireRules = (typeof sanitizeGrimoireRules === "function")
    ? sanitizeGrimoireRules(preset.rules, getGrimoireCurrentKit())
    : preset.rules.slice();
  ensureGrimoireRules(); // complète/tronque à GRIMOIRE_SLOT_COUNT si le preset provient d'une version différente

  saveGame();
  if (typeof renderPanel === "function") renderPanel();
}

function confirmLoadGrimoirePreset(presetId) {
  var presets = ensureGrimoirePresets();
  var preset = presets.filter(function (p) { return p.id === presetId; })[0];
  if (!preset) return;

  showConfirmModal(
    "Charger « " + preset.name + " » ?",
    "Les 6 règles actuellement configurées seront remplacées par celles de ce preset. Enregistre ta configuration actuelle comme preset avant de continuer si tu veux la garder.",
    preset.icon || "📖",
    function () { loadGrimoirePreset(presetId); }
  );
}

function confirmDeleteGrimoirePreset(presetId) {
  var presets = ensureGrimoirePresets();
  var preset = presets.filter(function (p) { return p.id === presetId; })[0];
  if (!preset) return;

  showConfirmModal(
    "Supprimer « " + preset.name + " » ?",
    "Cette action est irréversible. Le preset sera définitivement supprimé (la config actuellement active n'est pas affectée).",
    "🗑️",
    function () {
      game.grimoirePresets = presets.filter(function (p) { return p.id !== presetId; });
      saveGame();
      if (typeof renderPanel === "function") renderPanel();
    }
  );
}

function getSuggestedGrimoirePreset() {
  var presets = ensureGrimoirePresets();
  if (!presets.length) return null;
  if (typeof WORLDS === "undefined" || !window.WorldManager) return null;

  var world = WORLDS[WorldManager.worldIndex];
  if (!world || !world.name) return null;

  var keyword = world.name.split(" ")[0].toLowerCase();
  if (!keyword) return null;

  var match = presets.filter(function (p) {
    return typeof p.name === "string" && p.name.toLowerCase().indexOf(keyword) !== -1;
  })[0];
  return match || null;
}

window.GRIMOIRE_PRESET_MAX_COUNT = GRIMOIRE_PRESET_MAX_COUNT;
window.GRIMOIRE_PRESET_ICON_CHOICES = GRIMOIRE_PRESET_ICON_CHOICES;
window.ensureGrimoirePresets = ensureGrimoirePresets;
window.saveGrimoirePreset = saveGrimoirePreset;
window.loadGrimoirePreset = loadGrimoirePreset;
window.confirmLoadGrimoirePreset = confirmLoadGrimoirePreset;
window.confirmDeleteGrimoirePreset = confirmDeleteGrimoirePreset;
window.getSuggestedGrimoirePreset = getSuggestedGrimoirePreset;

function getGrimoireCurrentKit() {
  if (!window.ClassCombatManager || typeof ClassCombatManager.getCurrentClassId !== "function") return null;
  var classId = ClassCombatManager.getCurrentClassId();
  if (!classId || typeof getClassSkills !== "function") return null;
  return getClassSkills(classId);
}

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

var GRIMOIRE_RULE_STATUS_LABELS = {
  no_condition: { icon: "⬜", text: "Règle vide" },
  no_action: { icon: "⬜", text: "Aucune action assignée" },
  unknown_action: { icon: "⚠️", text: "Action introuvable" },
  condition_false: { icon: "⏳", text: "En attente" },
  resource_insufficient: { icon: "🔋", text: "Ressource insuffisante" },
  on_cooldown: { icon: "⌛", text: "En recharge" },
  action_condition_unmet: { icon: "🚫", text: "Condition de l'action non remplie" },
  ready: { icon: "🔵", text: "Prête" }
};

function buildGrimoireRuleStatusHTML(rule, kit, locked) {
  if (locked) return "";
  if (typeof explainGrimoireRuleStatus !== "function" || !window.ClassCombatManager) return "";

  var resourceState = (typeof ClassCombatManager.ensureForCurrentClass === "function")
    ? ClassCombatManager.ensureForCurrentClass()
    : null;
  var combatContext = (typeof ClassCombatManager.getGrimoireCombatContext === "function")
    ? ClassCombatManager.getGrimoireCombatContext()
    : {};

  var secondsUntilTrigger = (rule.conditionId === "enemyAttackIncoming")
    ? (typeof combatContext.secondsUntilEnemyAttack === "number" ? combatContext.secondsUntilEnemyAttack : null)
    : ((typeof ClassCombatManager.getSecondsUntilPatternTrigger === "function")
      ? ClassCombatManager.getSecondsUntilPatternTrigger(rule.conditionId)
      : null);

  var status = explainGrimoireRuleStatus(rule, kit, resourceState, game.classCooldowns, combatContext, secondsUntilTrigger);
  if (status.code === "no_condition" || status.code === "no_action") return "";

  var labelInfo = GRIMOIRE_RULE_STATUS_LABELS[status.code] || { icon: "❔", text: status.code };

  var h = '<div class="grimoire-rule-status grimoire-rule-status-' + esc(status.code) + '">';
  h += '<span class="grimoire-rule-status-badge">' + labelInfo.icon + ' ' + esc(labelInfo.text) + '</span>';

  if (game.expertModeEnabled) {
    var detailParts = [];

    if (rule.conditionId === "heroLowHp") {
      detailParts.push("Seuil : PV ≤ " + Math.round((typeof HERO_LOW_HP_THRESHOLD_PCT === "number" ? HERO_LOW_HP_THRESHOLD_PCT : 0.40) * 100) + "%");
    } else if (rule.conditionId === "enemyAttackIncoming") {
      detailParts.push("Seuil : ≤ " + ENEMY_ATTACK_ANTICIPATION_THRESHOLD_S + "s avant l'attaque");
      if (status.secondsUntilTrigger !== null) {
        detailParts.push("Prochaine attaque dans ~" + status.secondsUntilTrigger.toFixed(1) + "s");
      }
    } else if (status.secondsUntilTrigger !== null) {
      detailParts.push("Prochain télégraphe dans ~" + status.secondsUntilTrigger.toFixed(1) + "s");
    }

    if (status.resourceCost !== null && status.resourceCost > 0) {
      detailParts.push("Ressource : " + Math.floor(status.resourceCurrent != null ? status.resourceCurrent : 0) + " / " + status.resourceCost + " requis");
    }

    if (status.cooldownRemainingMs !== null && status.cooldownRemainingMs > 0) {
      detailParts.push("Recharge : " + (status.cooldownRemainingMs / 1000).toFixed(1) + "s restantes");
    }

    if (detailParts.length) {
      h += '<p class="panel-sub grimoire-rule-status-detail">' + esc(detailParts.join(" · ")) + '</p>';
    }
  }

  h += '</div>';
  return h;
}

window.buildGrimoireRuleStatusHTML = buildGrimoireRuleStatusHTML;

function buildGrimoireRuleCardHTML(index, rule, kit, locked) {
  var cond = getGrimoireCondition(rule.conditionId);
  var action = (kit && kit.actions && rule.actionSlot) ? kit.actions[rule.actionSlot] : null;
  var isActiveCounter = !!(action && rule.conditionId && Array.isArray(action.counters) && action.counters.indexOf(rule.conditionId) !== -1);
  var counterLabels = (action && typeof getGrimoireCounterLabels === "function") ? getGrimoireCounterLabels(action) : [];

  var archetypeConditionId = (action && typeof getArchetypeEffectConditionId === "function") ? getArchetypeEffectConditionId(action) : null;
  var archetypeCond = archetypeConditionId ? getGrimoireCondition(archetypeConditionId) : null;
  var isActiveArchetypeEffect = !!(archetypeConditionId && rule.conditionId === archetypeConditionId);

  var h = '<div class="panel-card grimoire-rule-card' + (locked ? ' grimoire-rule-locked' : '') + '">';
  h += '<h3>Règle ' + (index + 1) + (locked ? ' 🔒' : '') + '</h3>';

  h += buildGrimoireRuleStatusHTML(rule, kit, locked);

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
      h += '<p class="panel-sub">⚡ Cette action contre aussi : ' + esc(counterLabels.join(", ")) + '</p>';
    }
    if (archetypeCond && !isActiveArchetypeEffect) {
      h += '<p class="panel-sub">🌀 Cette action a aussi un effet spécial contre : ' + esc(archetypeCond.label) + '</p>';
    }
  }
  if (isActiveCounter) {
    h += '<p class="panel-sub grimoire-counter-active">⚡ Cette action CONTRE la situation choisie : elle annulera complètement l\'attaque adverse si elle est utilisée à temps.</p>';
  }
  if (isActiveArchetypeEffect) {
    h += '<p class="panel-sub grimoire-archetype-active">🌀 Cette action a un effet spécial contre cette situation, en plus de ses dégâts normaux.</p>';
  }

  h += '</div>';
  return h;
}

function buildGrimoirePresetCardHTML(preset, isSuggested) {
  var dateLabel = preset.lastModified
    ? new Date(preset.lastModified).toLocaleDateString()
    : "";

  var h = '<div class="panel-card grimoire-preset-card">';
  h += '<div class="grimoire-preset-header">';
  h += '<span class="grimoire-preset-icon">' + esc(preset.icon || "📖") + '</span>';
  h += '<span class="grimoire-preset-name">' + esc(preset.name) + '</span>';
  if (isSuggested) {
    h += '<span class="grimoire-preset-suggested" title="Suggéré pour le monde actuel">💡</span>';
  }
  h += '</div>';
  if (dateLabel) {
    h += '<p class="panel-sub grimoire-preset-date">Modifié le ' + esc(dateLabel) + '</p>';
  }
  h += '<div class="grimoire-preset-actions">';
  h += '<button class="settings-btn grimoire-preset-load-btn" type="button" onclick="confirmLoadGrimoirePreset(\'' + esc(preset.id) + '\')">Charger</button>';
  h += '<button class="settings-btn grimoire-preset-delete-btn" type="button" onclick="confirmDeleteGrimoirePreset(\'' + esc(preset.id) + '\')">🗑️</button>';
  h += '</div>';
  h += '</div>';
  return h;
}

function buildGrimoirePresetCreateFormHTML() {
  var h = '<div class="grimoire-preset-create-form">';
  h += '<input id="grimoire-preset-name-input" type="text" maxlength="30" placeholder="Nom du preset (ex. Farm Forêt)">';
  h += '<div class="grimoire-preset-icon-picker">';
  GRIMOIRE_PRESET_ICON_CHOICES.forEach(function (icon, index) {
    h += '<label class="grimoire-preset-icon-choice">';
    h += '<input type="radio" name="grimoire-preset-icon" value="' + esc(icon) + '"' + (index === 0 ? ' checked' : '') + '>';
    h += '<span>' + esc(icon) + '</span>';
    h += '</label>';
  });
  h += '</div>';
  h += '<button class="settings-btn primary" type="button" onclick="handleSaveGrimoirePresetClick()">💾 Enregistrer comme preset</button>';
  h += '</div>';
  return h;
}

function handleSaveGrimoirePresetClick() {
  var nameInput = document.getElementById("grimoire-preset-name-input");
  var name = nameInput ? nameInput.value : "";

  var iconInputs = document.getElementsByName("grimoire-preset-icon");
  var selectedIcon = GRIMOIRE_PRESET_ICON_CHOICES[0];
  for (var i = 0; i < iconInputs.length; i++) {
    if (iconInputs[i].checked) { selectedIcon = iconInputs[i].value; break; }
  }

  saveGrimoirePreset(name, selectedIcon);
}

window.buildGrimoirePresetCardHTML = buildGrimoirePresetCardHTML;
window.buildGrimoirePresetCreateFormHTML = buildGrimoirePresetCreateFormHTML;
window.handleSaveGrimoirePresetClick = handleSaveGrimoirePresetClick;

function buildGrimoireHTML() {
  ensureGrimoireRules();
  var kit = getGrimoireCurrentKit();
  var unlockedCount = (typeof getGrimoireSlotCount === "function") ? getGrimoireSlotCount(game.worldsEverReached) : GRIMOIRE_SLOT_COUNT;

  var h = '<div class="panel-card">';
  h += '<h3>📖 Grimoire de tactiques</h3>';
  h += '<p class="panel-sub">Programme des règles pour ton combat automatique : si une situation se présente, ton héros utilisera l\'action choisie en priorité. Les règles s\'ajoutent au comportement automatique habituel — s\'il n\'y a pas de règle applicable, ton héros continue de se battre normalement.</p>';
  h += '<p class="panel-sub">⚡ Certaines actions marquées d\'un éclair CONTRENT complètement une situation (annulent l\'attaque adverse) si tu les assignes à la bonne condition — regarde les actions disponibles une fois une condition choisie.</p>';
  h += '<p class="panel-sub">🔓 ' + unlockedCount + ' / ' + GRIMOIRE_SLOT_COUNT + ' règles débloquées. De nouvelles règles se débloquent en atteignant de nouveaux mondes pour la première fois.</p>';

  h += '<button class="settings-btn" type="button" onclick="openCombatReport(\'manual\', null)">📊 Voir le rapport de combat</button>';

  h += '</div>';

  var presets = ensureGrimoirePresets();
  var suggestedPreset = (typeof getSuggestedGrimoirePreset === "function") ? getSuggestedGrimoirePreset() : null;

  h += '<div class="panel-card grimoire-presets-section">';
  h += '<h3>💾 Presets</h3>';
  h += '<p class="panel-sub">Sauvegarde ta configuration de règles sous un nom, pour la retrouver rapidement selon le contexte (farm, boss, donjon...).</p>';

  if (presets.length) {
    presets.forEach(function (preset) {
      h += buildGrimoirePresetCardHTML(preset, !!(suggestedPreset && suggestedPreset.id === preset.id));
    });
  } else {
    h += '<p class="panel-sub">Aucun preset enregistré pour l\'instant.</p>';
  }

  if (presets.length >= GRIMOIRE_PRESET_MAX_COUNT) {
    h += '<p class="panel-sub">Limite de ' + GRIMOIRE_PRESET_MAX_COUNT + ' presets atteinte — supprime-en un pour en enregistrer un nouveau.</p>';
  } else {
    h += buildGrimoirePresetCreateFormHTML();
  }

  h += '</div>';

  h += '<div class="panel-card grimoire-expert-mode-section">';
  h += '<h3>🔬 Mode Expert</h3>';
  h += '<p class="panel-sub">Affiche les seuils chiffrés réels (ressource, recharge, temps avant une attaque adverse) sur chaque règle, en plus de l\'indice simple toujours visible.</p>';
  h += '<button class="settings-btn' + (game.expertModeEnabled ? ' primary' : '') + '" type="button" onclick="toggleGrimoireExpertMode()">'
    + (game.expertModeEnabled ? '✅ Mode Expert activé' : '⬜ Activer le Mode Expert') + '</button>';
  h += '</div>';

  h += '<div class="panel-card">';
  if (kit) {
    var activeRulesForReserve = (Array.isArray(game.grimoireRules) && game.grimoireRules.length)
      ? game.grimoireRules.slice(0, unlockedCount)
      : [];
    var reserveAmount = (typeof getGrimoireCounterReserveAmount === "function")
      ? getGrimoireCounterReserveAmount(activeRulesForReserve, kit, game.enemy)
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
