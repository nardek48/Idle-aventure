"use strict";
/* ui/combat-view.js — écran Combat : zone ennemi (PV, statuts/télégraphes par archétype v3.68-73), 4 boutons de classe (skill1-3/defense, v3.34.0), bouton attaque + soin rapide, raccourcis clavier. Détail complet : COMMENTAIRES_ORIGINAUX.md */

function buildCombatHTML() {
  return ''

    + '<div id="active-potions-bar" class="active-potions-bar"></div>'

    + '<div id="enemy-display">'
    +   '<div id="enemy-status-bar" class="enemy-status-bar"></div>'
    +   '<div id="enemy-name">Slime</div>'
    +   '<div id="enemy-hp-bar-wrapper">'
    +     '<div class="enemy-hp-bar-track"><div id="enemy-hp-bar" style="width:100%"></div></div>'
    +     '<div id="enemy-hp-text">10 / 10</div>'
    +   '</div>'
    +   '<div id="enemy-emoji" onclick="playerAttack()">🟢</div>'
    + '</div>'
    + '<div id="class-resource-root"></div>'

    + '<div class="combat-action-row">'
    +   '<div id="class-skills-root"></div>'
    + '</div>'

    + '<div class="combat-attack-row">'
    +   '<div id="heal-quick-root-left"></div>'
    +   '<button id="combat-attack-btn" class="combat-attack-btn" type="button" onclick="playerAttack()" aria-label="Attaque">'
    +     '<div id="basic-attack-cooldown-overlay"></div>'
    +   '</button>'
    +   '<div id="heal-quick-root"></div>'
    + '</div>';
}

function mountCombatArea() {
  var gameArea = document.getElementById("game-area");
  if (gameArea) gameArea.innerHTML = buildCombatHTML();
}

function buildHealButtonHTML(index) {
  if (typeof HEALING_POTIONS_DB === "undefined" || !window.PotionManager) return "";
  var potion = HEALING_POTIONS_DB[index];
  if (!potion) return "";

  var onCooldown = PotionManager.getHealCooldownRemainingMs() > 0;
  var stock = PotionManager.getHealingStock(potion.id);
  var disabled = onCooldown || stock <= 0;
  var keyLabel = String(index + 5); // v3.34.0 : "5"/"6" (avant v2.90 : "3"/"4") — "1"à"4" repris par les 4 actions de classe (skill1/2/3/defense)

  var h = '<div class="heal-quick-bar">';
  h += '<button class="heal-quick-btn' + (disabled ? ' disabled' : '') + '" type="button" '
    + (disabled ? 'disabled' : '')
    + ' onclick="PotionManager.useHealingPotion(\'' + esc(potion.id) + '\')" title="' + esc(potion.name) + ' (touche ' + keyLabel + ' sur PC)">';
  h += '<span class="heal-quick-icon">' + '<img src="' + esc(potion.icon) + '" alt="" draggable="false">' + '</span>';
  h += '<span class="heal-quick-count">' + stock + '</span>';
  h += '<span class="heal-quick-key">' + keyLabel + '</span>';
  h += '</button>';
  h += '</div>';
  return h;
}

function renderHealButtons() {
  var left = document.getElementById("heal-quick-root-left");
  var right = document.getElementById("heal-quick-root");
  if (left) left.innerHTML = buildHealButtonHTML(0);
  if (right) right.innerHTML = buildHealButtonHTML(1);
}

function buildActivePotionsBarHTML() {
  if (typeof POTIONS_DB === "undefined" || !window.PotionManager) return "";

  var h = "";
  POTIONS_DB.forEach(function (potion) {
    if (!potion.durationMin) return; // Élixir d'Aether : pas de minuteur, ignoré ici
    var remainingMs = PotionManager.getRemainingMs(potion.id);
    if (remainingMs <= 0) return;

    var remainingMin = Math.ceil(remainingMs / 60000);
    h += '<div class="active-potion-icon" title="' + esc(potion.name) + ' — ' + remainingMin + ' min restantes">';
    h += '<img src="' + esc(potion.icon) + '" alt="' + esc(potion.name) + '">';
    h += '<span class="active-potion-timer">' + remainingMin + '</span>';
    h += '</div>';
  });

  if (window.AfflictionManager && typeof AfflictionManager.getActiveList === "function") {
    AfflictionManager.getActiveList().forEach(function (affliction) {
      h += '<div class="active-potion-icon active-affliction-icon" title="' + esc(affliction.name) + ' — ' + esc(affliction.desc) + '">';
      h += '<span class="active-affliction-emoji">' + esc(affliction.icon || "🔥") + '</span>';
      h += '</div>';
    });
  }

  return h;
}

function renderActivePotionsBar() {
  var host = document.getElementById("active-potions-bar");
  if (!host) return;
  host.innerHTML = buildActivePotionsBarHTML();
}
window.buildActivePotionsBarHTML = buildActivePotionsBarHTML;
window.renderActivePotionsBar = renderActivePotionsBar;

function buildEnemyStatusBarHTML() {
  if (!game.enemy) return "";

  var h = "";

  if (game.enemy.archetype === "enraged") {
    var rageFrozen = !!(game.enemy.rageFreezeUntil && Date.now() < game.enemy.rageFreezeUntil);
    h += '<div class="enemy-status-icon enemy-status-enraged' + (rageFrozen ? ' is-suppressed' : '') + '" title="'
      + (rageFrozen ? 'Enragé (rage apaisée temporairement)' : 'Enragé : plus dangereux à mesure qu\u2019il perd des PV') + '">';
    h += '<span class="enemy-status-emoji">' + (rageFrozen ? '😮\u200d💨' : '😡') + '</span>';
    h += '</div>';
  }

  if (game.enemy.archetype === "corrupted") {
    var corruptedStacks = Number(game.enemy.corruptedStacks || 0);
    h += '<div class="enemy-status-icon enemy-status-corrupted" title="Corrupteur : chaque coup reçu réduit tes dégâts (' + corruptedStacks + '/' + (typeof CORRUPTED_MAX_STACKS === "number" ? CORRUPTED_MAX_STACKS : 5) + ' stacks)">';
    h += '<span class="enemy-status-emoji">☠️</span>';
    if (corruptedStacks > 0) {
      h += '<span class="enemy-status-timer">' + corruptedStacks + '</span>';
    }
    h += '</div>';
  }

  if (game.enemy.archetype === "vampiric") {
    var lifestealSuppressed = !!(game.enemy.vampiricSuppressedUntil && Date.now() < game.enemy.vampiricSuppressedUntil);
    h += '<div class="enemy-status-icon enemy-status-vampiric' + (lifestealSuppressed ? ' is-suppressed' : '') + '" title="'
      + (lifestealSuppressed ? 'Vampirique (vol de vie bloqué temporairement)' : 'Vampirique : se soigne à chaque coup qu\u2019il te porte') + '">';
    h += '<span class="enemy-status-emoji">🧛</span>';
    h += '</div>';
  }

  if (game.enemy.archetype === "armored") {
    var armorSuppressed = !!(game.enemy.armorSuppressedUntil && Date.now() < game.enemy.armorSuppressedUntil);
    h += '<div class="enemy-status-icon enemy-status-armored' + (armorSuppressed ? ' is-suppressed' : '') + '" title="'
      + (armorSuppressed ? 'Blindé (blindage fissuré temporairement)' : 'Blindé : subit un peu moins de dégâts en permanence') + '">';
    h += '<span class="enemy-status-emoji">🛡️‍🩹</span>';
    h += '</div>';
  }

  if (game.enemy.vulnerableUntil && Date.now() < game.enemy.vulnerableUntil) {
    var vulnRemainingMs = game.enemy.vulnerableUntil - Date.now();
    var vulnPct = Math.round((game.enemy.vulnerableMult || 0) * 100);
    h += '<div class="enemy-status-icon enemy-status-vulnerability" title="Vulnérable : +' + vulnPct + '% dégâts subis">';
    h += '<span class="enemy-status-emoji">⚡</span>';
    h += '<span class="enemy-status-timer">' + Math.ceil(vulnRemainingMs / 1000) + '</span>';
    h += '</div>';
  }

  if (game.enemy.dot && game.enemy.dot.remainingMs > 0) {
    h += '<div class="enemy-status-icon enemy-status-dot" title="Brûlure arcanique : dégâts sur la durée">';
    h += '<span class="enemy-status-emoji">🔥</span>';
    h += '<span class="enemy-status-timer">' + Math.ceil(game.enemy.dot.remainingMs / 1000) + '</span>';
    h += '</div>';
  }

  if (game.enemy.chargeTelegraphUntil && Date.now() < game.enemy.chargeTelegraphUntil) {
    var chargeRemainingMs = game.enemy.chargeTelegraphUntil - Date.now();
    h += '<div class="enemy-status-icon enemy-status-charge" title="Charge imminente !">';
    h += '<span class="enemy-status-emoji">💢</span>';
    h += '<span class="enemy-status-timer">' + Math.max(0, (chargeRemainingMs / 1000).toFixed(1)) + '</span>';
    h += '</div>';
  }

  if (game.enemy.silenceTelegraphUntil && Date.now() < game.enemy.silenceTelegraphUntil) {
    var silenceTelegraphRemainingMs = game.enemy.silenceTelegraphUntil - Date.now();
    h += '<div class="enemy-status-icon enemy-status-silence-telegraph" title="Silence imminent !">';
    h += '<span class="enemy-status-emoji">🔇</span>';
    h += '<span class="enemy-status-timer">' + Math.max(0, (silenceTelegraphRemainingMs / 1000).toFixed(1)) + '</span>';
    h += '</div>';
  }

  if (game.silencedUntil && Date.now() < game.silencedUntil) {
    var silenceActiveRemainingMs = game.silencedUntil - Date.now();
    h += '<div class="enemy-status-icon enemy-status-silenced-active" title="Tu es silencié : tes techniques sont bloquées">';
    h += '<span class="enemy-status-emoji">🔇</span>';
    h += '<span class="enemy-status-timer">' + Math.max(0, (silenceActiveRemainingMs / 1000).toFixed(1)) + '</span>';
    h += '</div>';
  }

  if (game.enemy.shieldTelegraphUntil && Date.now() < game.enemy.shieldTelegraphUntil) {
    var shieldTelegraphRemainingMs = game.enemy.shieldTelegraphUntil - Date.now();
    h += '<div class="enemy-status-icon enemy-status-shield-telegraph" title="Bouclier imminent !">';
    h += '<span class="enemy-status-emoji">🛡️</span>';
    h += '<span class="enemy-status-timer">' + Math.max(0, (shieldTelegraphRemainingMs / 1000).toFixed(1)) + '</span>';
    h += '</div>';
  }

  if (game.enemy.shieldActiveUntil && Date.now() < game.enemy.shieldActiveUntil) {
    var shieldActiveRemainingMs = game.enemy.shieldActiveUntil - Date.now();
    h += '<div class="enemy-status-icon enemy-status-shield-active" title="Bouclier actif : -50% dégâts subis">';
    h += '<span class="enemy-status-emoji">🛡️</span>';
    h += '<span class="enemy-status-timer">' + Math.ceil(shieldActiveRemainingMs / 1000) + '</span>';
    h += '</div>';
  }

  if (game.enemy.healTelegraphUntil && Date.now() < game.enemy.healTelegraphUntil) {
    var healTelegraphRemainingMs = game.enemy.healTelegraphUntil - Date.now();
    h += '<div class="enemy-status-icon enemy-status-heal-telegraph" title="Soin imminent !">';
    h += '<span class="enemy-status-emoji">💚</span>';
    h += '<span class="enemy-status-timer">' + Math.max(0, (healTelegraphRemainingMs / 1000).toFixed(1)) + '</span>';
    h += '</div>';
  }

  if (game.enemy.counteredUntil && Date.now() < game.enemy.counteredUntil) {
    var counteredRemainingMs = game.enemy.counteredUntil - Date.now();
    h += '<div class="enemy-status-icon enemy-status-countered" title="Attaque contrée !">';
    h += '<span class="enemy-status-emoji">⚡</span>';
    h += '<span class="enemy-status-timer">' + Math.ceil(counteredRemainingMs / 1000) + '</span>';
    h += '</div>';
  }

  return h;
}

function renderEnemyStatusBar() {
  var host = document.getElementById("enemy-status-bar");
  if (host) host.innerHTML = buildEnemyStatusBarHTML();
}

window.buildEnemyStatusBarHTML = buildEnemyStatusBarHTML;
window.renderEnemyStatusBar = renderEnemyStatusBar;

function buildBasicAttackCooldownOverlayHTML() {
  var remainingMs = game.basicAttackCooldownMs || 0;
  if (remainingMs <= 0) return "";

  var totalCelerity = (window.CombatEngine && typeof CombatEngine.getTotalCelerity === "function") ? CombatEngine.getTotalCelerity() : 0;
  var totalMs = (typeof computeEffectiveCooldownMs === "function")
    ? computeEffectiveCooldownMs(BASIC_ATTACK_BASE_COOLDOWN_MS, totalCelerity)
    : BASIC_ATTACK_BASE_COOLDOWN_MS;
  var pct = totalMs > 0 ? Math.round((remainingMs / totalMs) * 100) : 0;

  var h = '<span class="combat-action-cooldown">' + Math.ceil(remainingMs / 1000) + 's</span>';
  h += '<span class="combat-action-cooldown-fill" style="width:' + pct + '%"></span>';
  return h;
}

function renderBasicAttackCooldown() {
  var onCooldown = (game.basicAttackCooldownMs || 0) > 0;

  var overlay = document.getElementById("basic-attack-cooldown-overlay");
  if (overlay) overlay.innerHTML = buildBasicAttackCooldownOverlayHTML();

  var attackBtn = document.getElementById("combat-attack-btn");
  if (attackBtn) attackBtn.classList.toggle("on-cooldown", onCooldown);

}

window.buildBasicAttackCooldownOverlayHTML = buildBasicAttackCooldownOverlayHTML;
window.renderBasicAttackCooldown = renderBasicAttackCooldown;

function renderEnemy() {
  if (!game.enemy) return;

  var emoji = document.getElementById("enemy-emoji");
  var name = document.getElementById("enemy-name");
  var db = game.enemy.isBoss ? BOSS_DB : ENEMY_DB;
  var enemyData = db[game.enemy.id] || {};
  var assetKey = enemyData.asset || game.enemy.asset || "";
  var imagePath = enemyData.image || game.enemy.image || "";

  if (typeof imagePath !== "string") {
    imagePath = "";
  }

  if (emoji) {
    if (imagePath) {
      emoji.innerHTML =
        '<img class="enemy-image" src="' + esc(imagePath) + '" alt="' + esc(game.enemy.name || "Ennemi") + '">';
      emoji.classList.add("has-image");
    } else {
      emoji.innerHTML = renderIcon(game.enemy.isBoss ? "bosses" : "enemies", assetKey);
      emoji.classList.remove("has-image");
    }
    emoji.classList.toggle("boss", !!game.enemy.isBoss);
  }

  if (name) name.textContent = game.enemy.name + (game.enemy.isBoss ? " [BOSS]" : "");

  renderEnemyStatusBar();
  renderEnemyHp();
}

function renderEnemyHp() {
  if (!game.enemy) return;
  var bar = document.getElementById("enemy-hp-bar");
  var text = document.getElementById("enemy-hp-text");
  var pct = Math.max(0, (game.enemy.hp / game.enemy.maxHp) * 100);
  if (bar) bar.style.width = pct + "%";
  if (text) {
    text.textContent =
      formatNumber(Math.max(0, Math.ceil(game.enemy.hp))) + " / " + formatNumber(game.enemy.maxHp);
  }
  renderEnemyStatusBar();
}

window.renderEnemy = renderEnemy;
window.renderEnemyHp = renderEnemyHp;
window.buildCombatHTML = buildCombatHTML;
window.mountCombatArea = mountCombatArea;
window.buildHealButtonHTML = buildHealButtonHTML;
window.renderHealButtons = renderHealButtons;

function initHealKeyboardShortcuts() {
  document.addEventListener("keydown", function (e) {
    var active = document.activeElement;
    var tag = active ? active.tagName : "";
    if (tag === "INPUT" || tag === "TEXTAREA" || (active && active.isContentEditable)) return;

    var classSlotByKey = { "1": "skill1", "2": "skill2", "3": "skill3", "4": "defense" };
    if (classSlotByKey[e.key]) {
      if (window.ClassCombatManager && !game.autoSkillsEnabled) ClassCombatManager.useSkillManual(classSlotByKey[e.key]);
      return;
    }

    if (typeof HEALING_POTIONS_DB === "undefined" || !window.PotionManager) return;
    var index = -1;
    if (e.key === "5") index = 0;
    else if (e.key === "6") index = 1;
    if (index === -1) return;

    var potion = HEALING_POTIONS_DB[index];
    if (potion) PotionManager.useHealingPotion(potion.id);
  });
}

window.initHealKeyboardShortcuts = initHealKeyboardShortcuts;

var CLASS_SKILL_SLOTS = ["skill1", "skill2", "skill3", "defense"];
var CLASS_SKILL_KEY_LABELS = { skill1: "1", skill2: "2", skill3: "3", defense: "4" };

function buildClassSkillButtonHTML(slot) {
  if (!window.ClassCombatManager || typeof ClassCombatManager.getAction !== "function") return "";
  var action = ClassCombatManager.getAction(slot);
  if (!action) return "";

  var resourceState = (typeof ClassCombatManager.ensureForCurrentClass === "function")
    ? ClassCombatManager.ensureForCurrentClass()
    : null;
  var cooldownRemainingMs = (game.classCooldowns && typeof game.classCooldowns[action.id] === "number")
    ? game.classCooldowns[action.id]
    : 0;
  var onCooldown = cooldownRemainingMs > 0;
  var cooldownPct = onCooldown ? Math.round((cooldownRemainingMs / action.cooldownMs) * 100) : 0;

  var affordable = !resourceState || resourceState.current >= (action.resourceCost || 0);
  var autoModeActive = !!game.autoSkillsEnabled;
  var isSilenced = !!(game.silencedUntil && Date.now() < game.silencedUntil && action.slot !== "defense");
  var disabled = onCooldown || !affordable || autoModeActive || isSilenced;

  var activeDefense = (action.type === "defense" && window.ClassCombatManager && typeof ClassCombatManager.getActiveDefenseEffect === "function")
    ? ClassCombatManager.getActiveDefenseEffect()
    : null;
  var isActiveNow = !!(activeDefense && activeDefense.actionId === action.id);

  var icon = (typeof CLASS_ACTION_ICON_FALLBACK !== "undefined" && CLASS_ACTION_ICON_FALLBACK[action.id]) || (action.type === "defense" ? "🛡️" : "✨");
  var keyLabel = CLASS_SKILL_KEY_LABELS[action.slot] || "";

  var h = '<button class="combat-action-btn class-skill-btn' + (action.type === "defense" ? " defense-action-btn" : " attack-action-btn")
    + (onCooldown ? ' on-cooldown' : '') + (isActiveNow ? ' is-active' : '') + (!affordable && !onCooldown ? ' not-affordable' : '') + (autoModeActive ? ' auto-mode' : '') + (isSilenced ? ' is-silenced' : '') + '" type="button" '
    + (disabled ? 'disabled' : '')
    + ' onclick="ClassCombatManager.useSkillManual(\'' + esc(slot) + '\')" title="'
    + (autoModeActive ? 'Combat automatique actif (voir Paramètres)' : (isSilenced ? 'Silencié : cette technique est bloquée un instant' : esc(action.description) + (keyLabel ? ' (touche ' + keyLabel + ' sur PC)' : '')))
    + '">';
  h += '<span class="combat-action-key">' + esc(keyLabel) + '</span>';
  h += renderIconOrEmojiHTML(icon, "combat-action-icon", action.label);
  if (onCooldown) {
    h += '<span class="combat-action-cooldown">' + Math.ceil(cooldownRemainingMs / 1000) + 's</span>';
    h += '<span class="combat-action-cooldown-fill" style="width:' + cooldownPct + '%"></span>';
  } else if (isActiveNow) {
    h += '<span class="combat-action-active-tag">ACTIF</span>';
  }
  h += '</button>';
  return h;
}

function buildClassSkillButtonsHTML() {
  if (!window.ClassCombatManager) return "";
  var h = "";
  CLASS_SKILL_SLOTS.forEach(function (slot) {
    h += buildClassSkillButtonHTML(slot);
  });
  return h;
}

function renderClassSkillButtons() {
  var host = document.getElementById("class-skills-root");
  if (host) host.innerHTML = buildClassSkillButtonsHTML();
  renderClassResourceBar();
}

window.buildClassSkillButtonsHTML = buildClassSkillButtonsHTML;
window.renderClassSkillButtons = renderClassSkillButtons;

function buildClassResourceBarHTML() {
  if (!window.ClassCombatManager || typeof ClassCombatManager.ensureForCurrentClass !== "function") return "";
  var state = ClassCombatManager.ensureForCurrentClass();
  if (!state || !state.max) return "";

  var pct = Math.max(0, Math.min(100, Math.round((state.current / state.max) * 100)));
  var classId = typeof ClassCombatManager.getCurrentClassId === "function" ? ClassCombatManager.getCurrentClassId() : null;
  var resourceDef = (classId && typeof getClassResource === "function") ? getClassResource(classId) : null;
  var label = resourceDef ? resourceDef.label : "";

  var h = '<div class="class-resource-bar class-resource-' + esc(state.resourceId || "") + '">';
  h +=   '<div class="class-resource-track">';
  h +=     '<div class="class-resource-fill" style="width:' + pct + '%"></div>';
  h +=     '<span class="class-resource-text">' + esc(label) + ' — ' + Math.floor(state.current) + ' / ' + state.max + '</span>';
  h +=   '</div>';
  h += '</div>';
  return h;
}

function renderClassResourceBar() {
  var host = document.getElementById("class-resource-root");
  if (host) host.innerHTML = buildClassResourceBarHTML();
}

window.buildClassResourceBarHTML = buildClassResourceBarHTML;
window.renderClassResourceBar = renderClassResourceBar;