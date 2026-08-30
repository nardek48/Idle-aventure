"use strict";
/* ui/modal-view.js — overlay de création de héros (1re fois uniquement), 2 étapes (nom puis héros, v3.22), aperçu stats + kit de classe. Détail complet : COMMENTAIRES_ORIGINAUX.md */

var pendingHeroId = "";
var pendingPlayerName = ""; // v3.22 : saisi à l'étape "name", gardé en
var heroSelectionStep = "name"; // v3.22 : "name" d'abord | "hero" ensuite
var heroAttackPreviewExpanded = false; // v3.29 : bandeau dépliable de l'attaque spéciale, étape "hero"

var HERO_SELECTION_BASE_IDS = ["knight", "ranger", "mage", "chaosKnight", "chaosRanger", "chaosMage"];

function getHeroPreviewStats(hero) {
  var s = (hero && hero.stats) || {};
  var power = Number(s.power || 0);
  var endurance = Number(s.endurance || 0);
  var celerity = Number(s.celerity || 0);
  var precision = Number(s.precision || 0);

  return {
    pv: Math.max(1, Math.floor(endurance * 6)),           // ENDURANCE_HP_COEF
    atk: Math.max(1, Math.floor(1 + power * 0.2)),          // base 1 + FORCE_TAP_COEF
    def: Math.round(Math.min(0.6, endurance * 0.002) * 100), // HERO_DEFENSE_COEF, plafonné 60%
    vit: Math.round(celerity),
    crit: Math.round((5 + precision * 0.06) * 10) / 10       // base 5% + PRECISION_CRIT_COEF
  };
}

function getSelectedHero() {
  if (typeof HEROES_DB === "undefined") return null;

  var keys = Object.keys(HEROES_DB);
  for (var i = 0; i < keys.length; i++) {
    var hero = HEROES_DB[keys[i]];
    if (hero && hero.id === game.heroId) {
      return hero;
    }
  }

  return null;
}

function needsHeroSetup() {
  return !game.playerName || !getSelectedHero();
}

function selectHeroTemp(heroId) {
  pendingHeroId = heroId;
  openHeroSelection();
}

function goToHeroStep() {
  var input = document.getElementById("player-name-input");
  var name = input ? input.value.trim() : "";

  if (!name) {
    showToast("Entre un nom", 1200);
    return;
  }

  pendingPlayerName = name;
  heroSelectionStep = "hero";
  openHeroSelection();
}

function backToNameStep() {
  heroSelectionStep = "name";
  openHeroSelection();
}

function closeHeroSelection() {
  var host = document.getElementById("hero-selection-root");
  if (host) host.innerHTML = "";
  heroSelectionStep = "name";
  heroAttackPreviewExpanded = false;
}

function cancelHeroSelection() {
  var origin = window.pendingHeroCreationOrigin;
  window.pendingHeroCreationOrigin = null;
  pendingHeroId = "";
  pendingPlayerName = "";

  // v3.99.0 : création lancée depuis l'écran titre (Nouvelle Partie / slot vide dans
  // Charger la Partie), donc AVANT le premier init() du jeu — le DOM du jeu (hud,
  // combat, panels...) n'existe pas encore, renderAll() planterait. On rouvre
  // simplement l'écran titre plutôt que de suivre le chemin "annulation en jeu".
  if (window.titleScreenSlotBeingCreated) {
    window.titleScreenSlotBeingCreated = null;
    closeHeroSelection();
    if (typeof titleScreenBackToMain === "function") titleScreenBackToMain();
    return;
  }

  closeHeroSelection();

  if (origin && window.HeroSlotManager && HeroSlotManager.hasSlot(origin)) {
    setActiveSlot(origin);

    if (typeof createInitialGameState === "function") {
      var keptSaveSupported = game.saveSupported;
      var fresh = createInitialGameState();
      Object.keys(game).forEach(function (k) { delete game[k]; });
      Object.assign(game, fresh);
      game.saveSupported = keptSaveSupported;
    }
    loadGame();
    if (typeof ensureGameStateDefaults === "function") ensureGameStateDefaults();
    if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") StatsSystem.recalcStats();
    if (typeof resumeCombatAfterSlotChange === "function") resumeCombatAfterSlotChange();
  } else {
    console.warn("[Aethervale] cancelHeroSelection: pas d'emplacement d'origine valide (origin=" + origin + ") — la fenêtre va se rouvrir via needsHeroSetup(). Si ça se reproduit alors que save-system.js est à jour, remonte ce message à Claude."); // v3.29.4 : TEMPORAIRE, diagnostic
  }

  if (typeof renderAll === "function") renderAll();
}

function buildHeroPickerCloseButtonHTML() {
  if (!window.pendingHeroCreationOrigin) return "";
  return '<button type="button" class="hero-picker-close-btn" aria-label="Annuler" onclick="cancelHeroSelection()">✕</button>';
}

function toggleHeroAttackPreview() {
  heroAttackPreviewExpanded = !heroAttackPreviewExpanded;
  openHeroSelection();
}

function confirmHeroSelection() {
  var name = pendingPlayerName || game.playerName || "";

  if (!pendingHeroId && !getSelectedHero()) {
    showToast("Choisis un héros", 1200);
    return;
  }

  if (!name) {
    showToast("Entre un nom", 1200);
    return;
  }

  var isFirstEverSetup = !game.playerName;

  game.heroId = pendingHeroId || game.heroId;
  if (game.heroId && game.heroId.indexOf("chaos") === 0) {
    game.codexChaosSeen = true;
  }
  if (window.ClassCombatManager && typeof ClassCombatManager.resetForNewHero === "function") {
    ClassCombatManager.resetForNewHero();
  }
  game.playerName = name;
  window.pendingHeroCreationOrigin = null; // v3.29 : création confirmée, la croix ✕ n'a plus lieu d'être pour cet emplacement

  if (!game.equipped || !game.equipped.weapon) {
    if (typeof equipStarterWeapon === "function") equipStarterWeapon();
  }

  if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
    StatsSystem.recalcStats();
  }
  game.heroHp = game.heroMaxHp;

  closeHeroSelection();

  // v3.99.0 : création lancée depuis l'écran titre (Nouvelle Partie / slot vide dans
  // Charger la Partie) -> le jeu n'a pas encore été initialisé (init() jamais appelé).
  // On résout l'écran titre en premier : ça déclenche init() qui monte tout le DOM
  // du jeu (hud, combat, panels...) AVANT switchTab()/renderAll() ci-dessous, sinon
  // ces derniers agiraient sur des éléments encore inexistants.
  if (window.titleScreenSlotBeingCreated) {
    window.titleScreenSlotBeingCreated = null;
    if (typeof resolveTitleScreen === "function") resolveTitleScreen();
  }

  switchTab(isFirstEverSetup ? "campement" : "combat");
  renderAll();
  saveGame();
  showToast("Héros sélectionné", 1200);

  if (isFirstEverSetup && typeof openOnboarding === "function") {
    openOnboarding();
  }
}

function openHeroSelection() {
  var host = document.getElementById("hero-selection-root");
  if (!host || typeof HEROES_DB === "undefined") return;

  var selectedId = pendingHeroId || game.heroId || "";
  var selectedHero = null;

  Object.keys(HEROES_DB).forEach(function (key) {
    var hero = HEROES_DB[key];
    if (hero && hero.id === selectedId) selectedHero = hero;
  });

  if (!selectedHero) {
    var firstId = HERO_SELECTION_BASE_IDS[0];
    selectedHero = HEROES_DB[firstId] || null;
    if (selectedHero && !selectedId) {
      pendingHeroId = selectedHero.id;
      selectedId = selectedHero.id;
    }
  }

  host.innerHTML = heroSelectionStep === "hero"
    ? buildHeroStepHTML(selectedHero)
    : buildNameStepHTML();
}

function buildHeroStepHTML(selectedHero) {
  var stats = selectedHero ? getHeroPreviewStats(selectedHero) : { pv: 0, atk: 0, def: 0, vit: 0, crit: 0 };

  var html = '<div class="hero-picker-overlay">';
  html += '  <div class="hero-picker">';
  html += buildHeroPickerCloseButtonHTML();
  html += '    <button type="button" class="hero-picker-back-btn" onclick="backToNameStep()">‹ Retour</button>';
  html += '    <div class="hero-picker-header">';
  html += '      <h2>Choisissez votre héros</h2>';
  html += '      <p>Sélectionnez un héros pour votre aventure</p>';
  html += '    </div>';

  html += '    <div class="hero-picker-preview-row">';
  html += '      <div class="hero-picker-portrait-frame">';
  if (selectedHero && selectedHero.image) {
    html += '<img src="' + esc(selectedHero.image) + '" alt="' + esc(selectedHero.name) + '">';
  }
  html += '      </div>';

  html += '      <div class="hero-picker-stats">';
  html += '        <div class="hero-picker-stat"><span class="hero-picker-stat-icon">❤️</span><span class="hero-picker-stat-label">PV</span><strong>' + esc(formatNumber(stats.pv)) + '</strong></div>';
  html += '        <div class="hero-picker-stat"><span class="hero-picker-stat-icon">⚔️</span><span class="hero-picker-stat-label">ATK</span><strong>' + esc(formatNumber(stats.atk)) + '</strong></div>';
  html += '        <div class="hero-picker-stat"><span class="hero-picker-stat-icon">🛡️</span><span class="hero-picker-stat-label">DEF</span><strong>' + stats.def + '%</strong></div>';
  html += '        <div class="hero-picker-stat"><span class="hero-picker-stat-icon">⚡</span><span class="hero-picker-stat-label">VIT</span><strong>' + esc(formatNumber(stats.vit)) + '</strong></div>';
  html += '        <div class="hero-picker-stat"><span class="hero-picker-stat-icon">🎯</span><span class="hero-picker-stat-label">CRIT</span><strong>' + stats.crit + '%</strong></div>';
  html += '      </div>';
  html += '    </div>';

  html += '    <div class="hero-picker-name">' + esc(selectedHero ? selectedHero.name.toUpperCase() : "") + '</div>';

  html += '    <div class="hero-grid">';
  HERO_SELECTION_BASE_IDS.forEach(function (id) {
    var hero = HEROES_DB[id];
    if (!hero) return;
    var activeClass = (selectedHero && selectedHero.id === hero.id) ? "active" : "";
    html += '<button type="button" class="hero-card ' + activeClass + '" onclick="selectHeroTemp(\'' + esc(hero.id) + '\')">';
    html += '  <img src="' + esc(hero.image) + '" alt="' + esc(hero.name) + '" class="hero-card-image">';
    html += '  <div class="hero-card-name">' + esc(hero.name) + '</div>';
    html += '</button>';
  });
  html += '    </div>';

  html += '    <button type="button" class="hero-picker-confirm-btn" onclick="confirmHeroSelection()">';
  html += '      <img src="images/Buttons/hero_confirm_button.png" alt="" class="hero-picker-confirm-bg">';
  html += '      <span>CONFIRMER LE HÉROS</span>';
  html += '    </button>';

  html += buildHeroAttackPreviewBandeauHTML(selectedHero);

  html += '  </div>';
  html += '</div>';
  return html;
}

function buildHeroAttackPreviewBandeauHTML(selectedHero) {
  if (!selectedHero || typeof getClassForHero !== "function") return "";
  var cls = getClassForHero(selectedHero);
  var kit = (cls && typeof getClassSkills === "function") ? getClassSkills(cls.id) : null;
  if (!kit) return "";

  var html = '<button type="button" class="hero-attack-preview-toggle" onclick="toggleHeroAttackPreview()">';
  html += '⚔️ Compétences de classe <span class="hero-attack-preview-chevron">' + (heroAttackPreviewExpanded ? '▴' : '▾') + '</span>';
  html += '</button>';

  if (heroAttackPreviewExpanded) {
    var slots = ["skill1", "skill2", "skill3", "defense"];
    slots.forEach(function (slot) {
      var action = kit.actions[slot];
      if (!action) return;
      var icon = (typeof CLASS_ACTION_ICON_FALLBACK !== "undefined" && CLASS_ACTION_ICON_FALLBACK[action.id]) || (action.type === "defense" ? "🛡️" : "✨");

      html += '<div class="hero-attack-preview-card">';
      html += '  <div class="hero-attack-preview-icon-wrap">' + renderIconOrEmojiHTML(icon, "hero-attack-preview-icon", action.label) + '</div>';
      html += '  <div class="hero-attack-preview-body">';
      html += '    <div class="hero-attack-preview-name">' + esc(action.label) + '</div>';
      html += '    <div class="hero-attack-preview-desc">' + esc(action.description) + '</div>';
      html += '  </div>';
      html += '</div>';
    });
  }

  return html;
}

function buildNameStepHTML() {
  var currentName = pendingPlayerName || game.playerName || "";

  var html = '<div class="hero-picker-overlay">';
  html += '  <div class="hero-picker">';
  html += buildHeroPickerCloseButtonHTML();
  html += '    <div class="hero-picker-header">';
  html += '      <h2>Votre légende commence</h2>';
  html += '      <p>Choisissez votre nom</p>';
  html += '    </div>';

  html += '    <div class="hero-name-input-wrap">';
  html += '      <img src="images/Buttons/hero_name_input_frame.png" alt="" class="hero-name-input-bg">';
  html += '      <input id="player-name-input" type="text" maxlength="20" placeholder="Entrez votre nom de héros" value="' + esc(currentName) + '">';
  html += '    </div>';

  html += '    <button type="button" class="hero-picker-confirm-btn" onclick="goToHeroStep()">';
  html += '      <img src="images/Buttons/hero_confirm_button.png" alt="" class="hero-picker-confirm-bg">';
  html += '      <span>CONTINUER</span>';
  html += '    </button>';

  html += '  </div>';
  html += '</div>';
  return html;
}

window.getSelectedHero = getSelectedHero;
window.needsHeroSetup = needsHeroSetup;
window.selectHeroTemp = selectHeroTemp;
window.goToHeroStep = goToHeroStep;
window.backToNameStep = backToNameStep;
window.closeHeroSelection = closeHeroSelection;
window.confirmHeroSelection = confirmHeroSelection;
window.openHeroSelection = openHeroSelection;
window.toggleHeroAttackPreview = toggleHeroAttackPreview;
window.cancelHeroSelection = cancelHeroSelection;