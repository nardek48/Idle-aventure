"use strict";
/* ui/combat-view.js — écran Combat par rounds (v3.102.0, P2) : zone ennemi (PV, statuts/télégraphes en rounds), barre de round
   (n°, mode Tactique/Grimoire, Continuer l'attaque, jauge de célérité), 4 boutons de classe, bouton Attaque, potions (= action Objet). */

function buildCombatHTML() {
  return ''

    + '<div id="active-potions-bar" class="active-potions-bar"></div>'

    + '<div id="enemy-display">'
    +   '<div id="combat-mission-progress" class="combat-mission-progress"></div>'
    +   '<div id="enemy-status-bar" class="enemy-status-bar"></div>'
    +   '<div id="enemy-name">Slime</div>'
    +   '<div id="enemy-hp-bar-wrapper">'
    +     '<div class="enemy-hp-bar-track"><div id="enemy-hp-bar" style="width:100%"></div></div>'
    +     '<div id="enemy-hp-text">10 / 10</div>'
    +   '</div>'
    +   '<div id="enemy-emoji">🟢</div>'
    + '</div>'
    + '<div id="class-resource-root"></div>'
    + '<div id="combat-sortie-root" class="combat-sortie-row"></div>'
    + '<div id="combat-controls-root" class="combat-controls"></div>'

    + '<div class="combat-action-row">'
    +   '<div id="class-skills-root"></div>'
    + '</div>'

    + '<div class="combat-attack-row">'
    +   '<div id="heal-quick-root-left"></div>'
    +   '<button id="combat-attack-btn" class="combat-attack-btn" type="button" onclick="heroBasicAttack()" aria-label="Attaque"></button>'
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

  var stock = PotionManager.getHealingStock(potion.id);
  var busy = !!(game.combatRound && game.combatRound.busy);
  var disabled = stock <= 0 || busy || (game.heroHp || 0) <= 0;
  var keyLabel = String(index + 5); // v3.34.0 : "5"/"6" (avant v2.90 : "3"/"4") — "1"à"4" repris par les 4 actions de classe (skill1/2/3/defense)

  var h = '<div class="heal-quick-bar">';
  h += '<button class="heal-quick-btn' + (disabled ? ' disabled' : '') + '" type="button" '
    + (disabled ? 'disabled' : '')
    + ' onclick="CombatEngine.heroAction(\'potion\', \'' + esc(potion.id) + '\')" title="' + esc(potion.name) + ' — consomme le tour (touche ' + keyLabel + ' sur PC)">';
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

  // v3.115.0 : per-run — icônes des potions armées, sans minuteur. ⚔ = effet vivant
  // (mission en cours), sinon armée en attente du prochain run.
  var live = typeof PotionManager.isEffectLive === "function" && PotionManager.isEffectLive();
  var h = "";
  POTIONS_DB.forEach(function (potion) {
    if (!potion.perRun) return; // Élixir d'Aether : hors runs, ignoré ici
    if (!PotionManager.isArmed(potion.id)) return;

    var title = potion.name + (live ? " — active pour ce run" : " — armée pour la prochaine mission");
    h += '<div class="active-potion-icon' + (live ? '' : ' is-armed-idle') + '" title="' + esc(title) + '">';
    h += '<img src="' + esc(potion.icon) + '" alt="' + esc(potion.name) + '">';
    if (live) h += '<span class="active-potion-timer">⚔</span>';
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

  // v3.105.0 : approche — l'ennemi n'est pas encore au contact (héros à distance), il ne frappe pas ce temps-là
  var engageIn = Number(game.enemy.engageIn || 0);
  if (engageIn > 0) {
    h += '<div class="enemy-status-icon enemy-status-approaching" title="À distance : il ne frappe pas encore, mais il approche (et arrive lancé)">';
    h += '<span class="enemy-status-emoji">👣</span>';
    h += '<span class="enemy-status-timer">' + engageIn + '</span>';
    h += '</div>';
  }

  if (game.enemy.archetype === "enraged") {
    var rageFrozen = Number(game.enemy.rageFreezeRounds || 0) > 0;
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
    var lifestealSuppressed = Number(game.enemy.vampiricSuppressedRounds || 0) > 0;
    h += '<div class="enemy-status-icon enemy-status-vampiric' + (lifestealSuppressed ? ' is-suppressed' : '') + '" title="'
      + (lifestealSuppressed ? 'Vampirique (vol de vie bloqué temporairement)' : 'Vampirique : se soigne à chaque coup qu\u2019il te porte') + '">';
    h += '<span class="enemy-status-emoji">🧛</span>';
    h += '</div>';
  }

  if (game.enemy.archetype === "armored") {
    var armorSuppressed = Number(game.enemy.armorSuppressedRounds || 0) > 0;
    h += '<div class="enemy-status-icon enemy-status-armored' + (armorSuppressed ? ' is-suppressed' : '') + '" title="'
      + (armorSuppressed ? 'Blindé (blindage fissuré temporairement)' : 'Blindé : subit un peu moins de dégâts en permanence') + '">';
    h += '<span class="enemy-status-emoji">🛡️‍🩹</span>';
    h += '</div>';
  }

  if (Number(game.enemy.vulnerableRounds || 0) > 0) {
    var vulnPct = Math.round((game.enemy.vulnerableMult || 0) * 100);
    h += '<div class="enemy-status-icon enemy-status-vulnerability" title="Vulnérable : +' + vulnPct + '% dégâts subis">';
    h += '<span class="enemy-status-emoji">⚡</span>';
    h += '<span class="enemy-status-timer">' + game.enemy.vulnerableRounds + '</span>';
    h += '</div>';
  }

  if (game.enemy.dot && game.enemy.dot.rounds > 0) {
    h += '<div class="enemy-status-icon enemy-status-dot" title="Brûlure arcanique : ' + formatNumber(game.enemy.dot.perRound) + ' dégâts par round">';
    h += '<span class="enemy-status-emoji">🔥</span>';
    h += '<span class="enemy-status-timer">' + game.enemy.dot.rounds + '</span>';
    h += '</div>';
  }

  if (game.enemy.chargeTelegraphed) {
    h += '<div class="enemy-status-icon enemy-status-charge" title="Charge au prochain tour !">';
    h += '<span class="enemy-status-emoji">💢</span>';
    h += '</div>';
  }

  if (game.enemy.silenceTelegraphed) {
    h += '<div class="enemy-status-icon enemy-status-silence-telegraph" title="Silence au prochain tour !">';
    h += '<span class="enemy-status-emoji">🔇</span>';
    h += '</div>';
  }

  if (Number(game.silencedRounds || 0) > 0) {
    h += '<div class="enemy-status-icon enemy-status-silenced-active" title="Tu es silencié : tes techniques sont bloquées">';
    h += '<span class="enemy-status-emoji">🔇</span>';
    h += '<span class="enemy-status-timer">' + game.silencedRounds + '</span>';
    h += '</div>';
  }

  if (game.enemy.shieldTelegraphed) {
    h += '<div class="enemy-status-icon enemy-status-shield-telegraph" title="Bouclier au prochain tour !">';
    h += '<span class="enemy-status-emoji">🛡️</span>';
    h += '</div>';
  }

  if (Number(game.enemy.shieldRounds || 0) > 0) {
    h += '<div class="enemy-status-icon enemy-status-shield-active" title="Bouclier actif : -50% dégâts subis">';
    h += '<span class="enemy-status-emoji">🛡️</span>';
    h += '<span class="enemy-status-timer">' + game.enemy.shieldRounds + '</span>';
    h += '</div>';
  }

  if (game.enemy.healTelegraphed) {
    h += '<div class="enemy-status-icon enemy-status-heal-telegraph" title="Soin au prochain tour !">';
    h += '<span class="enemy-status-emoji">💚</span>';
    h += '</div>';
  }

  if (window.CombatEngine && typeof CombatEngine.enemyDoubleStrikeNext === "function" && CombatEngine.enemyDoubleStrikeNext()) {
    h += '<div class="enemy-status-icon enemy-status-double-strike" title="Jauge pleine : il frappera deux fois au prochain tour">';
    h += '<span class="enemy-status-emoji">⚡</span>';
    h += '<span class="enemy-status-timer">×2</span>';
    h += '</div>';
  }

  if (Number(game.enemy.counteredRounds || 0) > 0) {
    h += '<div class="enemy-status-icon enemy-status-countered" title="Attaque contrée !">';
    h += '<span class="enemy-status-emoji">⚡</span>';
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

/* Barre de round : n° du round, mode Tactique/Grimoire (bascule si le Grimoire est débloqué), Continuer l'attaque, jauge de célérité. */
function buildCombatControlsHTML() {
  if (!window.CombatEngine || typeof CombatEngine.ensureState !== "function") return "";
  CombatEngine.ensureState();
  var round = game.combatRound;
  var mode = game.combatMode;
  var grimoireUnlocked = (typeof isTabUnlocked === "function") ? isTabUnlocked("grimoire") : true;
  var gaugeMax = (typeof CELERITY_GAUGE_MAX === "number") ? CELERITY_GAUGE_MAX : 100;
  var gaugePct = Math.max(0, Math.min(100, Math.round((Number(game.heroGauge || 0) / gaugeMax) * 100)));
  var downed = (game.heroHp || 0) <= 0;

  var h = '<div class="combat-round-pill" title="Round en cours">R' + (round.number || 0) + '</div>';
  h += '<div class="combat-gauge" title="Jauge de célérité : à 100 %, une frappe bonus suit ta prochaine attaque">';
  h += '<div class="combat-gauge-fill" style="width:' + gaugePct + '%"></div>';
  h += '<span class="combat-gauge-text">⚡ ' + gaugePct + '%</span>';
  h += '</div>';

  if (grimoireUnlocked) {
    h += '<button type="button" class="combat-mode-btn' + (mode === "grimoire" ? ' is-auto' : '') + '" onclick="CombatEngine.setCombatMode(\'' + (mode === "grimoire" ? "tactique" : "grimoire") + '\')" title="'
      + (mode === "grimoire" ? "Mode Grimoire : les rounds s\u2019enchaînent, le Grimoire choisit. Toucher pour repasser en Tactique." : "Mode Tactique : chaque round attend ton choix. Toucher pour laisser le Grimoire jouer.") + '">';
    h += (mode === "grimoire" ? "📖 Grimoire" : "🎯 Tactique");
    h += '</button>';
  }

  if (mode !== "grimoire") {
    h += '<button type="button" class="combat-continue-btn' + (round.continueAttack ? ' is-active' : '') + '"' + (downed ? ' disabled' : '')
      + ' onclick="CombatEngine.toggleContinueAttack()" title="Répète l\u2019Attaque jusqu\u2019au prochain événement (PV < 50 %, télégraphe, double frappe, nouvel ennemi)">';
    h += round.continueAttack ? "⏸️ Stop" : "⟳ Continuer";
    h += '</button>';
  }
  return h;
}

/* Rangée de sortie (v3.102.1) : butin en cours + Rentrer (exploration) ou Fuir (mission, 50 % du butin). */
function buildCombatSortieHTML() {
  if (!window.SortieManager) return "";
  var s = SortieManager.ensure();
  var downed = (game.heroHp || 0) <= 0;
  var h = "";
  if (s.active) {
    h += '<div class="combat-loot-pill" title="Butin de la sortie — banqué au retour, perdu si tu tombes">🎒 ' + esc(SortieManager.getLootSummary()) + '</div>';
    h += '<div class="combat-loot-pill combat-potion-pill" title="Potions restantes pour cette sortie">🧪 ' + SortieManager.getPotionsLeft() + '</div>';
  }
  if (s.active && SortieManager.isMission()) {
    h += '<button type="button" class="combat-sortie-btn is-flee"' + (downed ? ' disabled' : '') + ' onclick="confirmFlee()" title="Fuir : la mission n\u2019est pas validée, tu rapportes 50 % du butin">🏳️ Fuir</button>';
  } else {
    h += '<button type="button" class="combat-sortie-btn"' + (downed ? ' disabled' : '') + ' onclick="SortieManager.returnToCamp()" title="Rentrer au Campement avec tout le butin">🏕️ Rentrer</button>';
  }
  return h;
}

function confirmFlee() {
  if (!window.SortieManager || !SortieManager.isActive()) return;
  if (confirm("Fuir ? La mission ne sera pas validée et tu ne rapporteras que 50 % du butin de la sortie.")) SortieManager.flee();
}
window.buildCombatSortieHTML = buildCombatSortieHTML;
window.confirmFlee = confirmFlee;

function renderCombatControls() {
  var host = document.getElementById("combat-controls-root");
  if (host) host.innerHTML = buildCombatControlsHTML();
  var sortieHost = document.getElementById("combat-sortie-root");
  if (sortieHost) sortieHost.innerHTML = buildCombatSortieHTML();
  var attackBtn = document.getElementById("combat-attack-btn");
  if (attackBtn) {
    var locked = game.combatMode === "grimoire" || !!(game.combatRound && game.combatRound.continueAttack) || (game.heroHp || 0) <= 0;
    attackBtn.classList.toggle("auto-mode", locked);
    attackBtn.disabled = locked;
  }
}

window.buildCombatControlsHTML = buildCombatControlsHTML;
window.renderCombatControls = renderCombatControls;

/* v3.106.0 : progression "X/Y" de la mission de combat en cours (aventure/chasse/donjon), affichée en tête de l'écran Combat. */
function getCombatMissionProgressLabel() {
  if (window.AdventureQuestManager && game.adventureQuestRun && game.adventureQuestRun.active) {
    var aq = AdventureQuestManager.getRunningQuest();
    if (aq) {
      var step = aq.steps[0];
      if (step && step.type === "kill") {
        return aq.name + " · " + AdventureQuestManager.getStepProgress(aq, step) + "/" + step.target;
      }
    }
  }
  if (window.HuntQuestManager && game.huntRun && game.huntRun.active) {
    var hq = HUNT_QUESTS[game.huntRun.questId];
    if (hq) return hq.name + " · " + Math.min(hq.lotSize, Number(game.huntRun.killsInLot || 0)) + "/" + hq.lotSize;
  }
  if (window.DungeonManager && game.dungeonRun && game.dungeonRun.active) {
    var waveCount = (typeof DUNGEON_CONFIG !== "undefined") ? DUNGEON_CONFIG.waveCount : 0;
    var wave = Math.min(waveCount, Number(game.dungeonRun.wave || 0));
    return "Donjon · Vague " + wave + "/" + waveCount;
  }
  // v3.107.1 : étape Histoire en farm libre avec killTarget déclaratif (ex. forest_02 « Premier sang »).
  if (window.StoryQuestManager) {
    var storyStep = StoryQuestManager.getCurrentStep("forest");
    if (storyStep && storyStep.killTarget && StoryQuestManager.isCurrentStepAccepted("forest")) {
      var kt = storyStep.killTarget;
      var count = Math.min(kt.target, kt.counter(game));
      return kt.label + " · " + count + "/" + kt.target;
    }
  }
  return "";
}

function renderCombatMissionProgress() {
  var host = document.getElementById("combat-mission-progress");
  if (!host) return;
  var label = getCombatMissionProgressLabel();
  host.textContent = label;
  host.style.display = label ? "" : "none";
}
window.getCombatMissionProgressLabel = getCombatMissionProgressLabel;
window.renderCombatMissionProgress = renderCombatMissionProgress;

function renderEnemy() {
  if (!game.enemy) return;

  renderCombatMissionProgress();

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

    if (game.activeTab !== "combat" || !window.CombatEngine) return;

    if (e.key === " " || e.key === "Enter" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      CombatEngine.heroAction("basic");
      return;
    }

    var classSlotByKey = { "1": "skill1", "2": "skill2", "3": "skill3", "4": "defense" };
    if (classSlotByKey[e.key]) {
      CombatEngine.heroAction(classSlotByKey[e.key]);
      return;
    }

    if (typeof HEALING_POTIONS_DB === "undefined") return;
    var index = -1;
    if (e.key === "5") index = 0;
    else if (e.key === "6") index = 1;
    if (index === -1) return;

    var potion = HEALING_POTIONS_DB[index];
    if (potion) CombatEngine.heroAction("potion", potion.id);
  });
}

window.initHealKeyboardShortcuts = initHealKeyboardShortcuts;

var CLASS_SKILL_SLOTS = ["skill1", "skill2", "skill3", "defense"];
var CLASS_SKILL_KEY_LABELS = { skill1: "1", skill2: "2", skill3: "3", defense: "4" };

function buildClassSkillButtonHTML(slot, suggestedSlot) {
  if (!window.ClassCombatManager || typeof ClassCombatManager.getAction !== "function") return "";
  var action = ClassCombatManager.getAction(slot);
  if (!action) return "";

  var resourceState = (typeof ClassCombatManager.ensureForCurrentClass === "function")
    ? ClassCombatManager.ensureForCurrentClass()
    : null;
  var cooldownRemaining = (game.classCooldowns && typeof game.classCooldowns[action.id] === "number")
    ? game.classCooldowns[action.id]
    : 0;
  var onCooldown = cooldownRemaining > 0;
  var cooldownPct = onCooldown && action.cooldownRounds > 0 ? Math.round((cooldownRemaining / action.cooldownRounds) * 100) : 0;

  var affordable = !resourceState || resourceState.current >= (action.resourceCost || 0);
  var autoModeActive = game.combatMode === "grimoire" || !!(game.combatRound && game.combatRound.continueAttack);
  var isSilenced = Number(game.silencedRounds || 0) > 0 && action.slot !== "defense";
  var conditionOk = (typeof checkActionConditions !== "function") || checkActionConditions(action.conditions, {
    enemyHp: game.enemy ? game.enemy.hp : null, enemyMaxHp: game.enemy ? game.enemy.maxHp : null
  });
  var disabled = onCooldown || !affordable || autoModeActive || isSilenced || !conditionOk || (game.heroHp || 0) <= 0;
  var isSuggested = !autoModeActive && !disabled && suggestedSlot === slot;

  var activeDefense = (action.type === "defense" && window.ClassCombatManager && typeof ClassCombatManager.getActiveDefenseEffect === "function")
    ? ClassCombatManager.getActiveDefenseEffect()
    : null;
  var isActiveNow = !!(activeDefense && activeDefense.actionId === action.id);

  var icon = (typeof CLASS_ACTION_ICON_FALLBACK !== "undefined" && CLASS_ACTION_ICON_FALLBACK[action.id]) || (action.type === "defense" ? "🛡️" : "✨");
  var keyLabel = CLASS_SKILL_KEY_LABELS[action.slot] || "";

  var title = autoModeActive
    ? "Combat automatique actif (mode Grimoire / Continuer)"
    : (isSilenced ? "Silencié : cette technique est bloquée un instant"
      : (!conditionOk ? "Condition non remplie : " + esc(action.description)
        : esc(action.description) + (action.cooldownRounds ? " Recharge : " + action.cooldownRounds + " round(s)." : "") + (keyLabel ? " (touche " + keyLabel + " sur PC)" : "")));

  var h = '<button class="combat-action-btn class-skill-btn' + (action.type === "defense" ? " defense-action-btn" : " attack-action-btn")
    + (onCooldown ? ' on-cooldown' : '') + (isActiveNow ? ' is-active' : '') + (!affordable && !onCooldown ? ' not-affordable' : '')
    + (autoModeActive ? ' auto-mode' : '') + (isSilenced ? ' is-silenced' : '') + (isSuggested ? ' is-suggested' : '') + '" type="button" '
    + (disabled ? 'disabled' : '')
    + ' onclick="CombatEngine.heroAction(\'' + esc(slot) + '\')" title="' + title + '">';
  h += '<span class="combat-action-key">' + esc(keyLabel) + '</span>';
  h += renderIconOrEmojiHTML(icon, "combat-action-icon", action.label);
  if (onCooldown) {
    h += '<span class="combat-action-cooldown">' + cooldownRemaining + 'r</span>';
    h += '<span class="combat-action-cooldown-fill" style="width:' + cooldownPct + '%"></span>';
  } else if (isActiveNow) {
    h += '<span class="combat-action-active-tag">ACTIF</span>';
  } else if (isSuggested) {
    h += '<span class="combat-action-suggest-tag">📖</span>';
  }
  h += '</button>';
  return h;
}

function buildClassSkillButtonsHTML() {
  if (!window.ClassCombatManager) return "";
  // v3.102.0 : en Tactique, le Grimoire suggère l'action qu'il aurait jouée (bouton surligné)
  var suggested = (game.combatMode !== "grimoire" && window.CombatEngine && typeof CombatEngine.suggestAction === "function")
    ? CombatEngine.suggestAction()
    : null;
  var h = "";
  CLASS_SKILL_SLOTS.forEach(function (slot) {
    h += buildClassSkillButtonHTML(slot, suggested);
  });
  return h;
}

function renderClassSkillButtons() {
  var host = document.getElementById("class-skills-root");
  if (host) host.innerHTML = buildClassSkillButtonsHTML();
  renderClassResourceBar();
  if (typeof renderCombatControls === "function") renderCombatControls();
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