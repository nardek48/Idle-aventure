"use strict";
/* ui/combat-sandbox-view.js — écran Bac à sable de combat (Paramètres). 4 modes : Combat unique/Run/Infini/Simulation auto (v3.33.4-12). Etat isolé _sandboxUiState, JAMAIS game.*. Détail complet : COMMENTAIRES_ORIGINAUX.md */

var _sandboxUiState = {
  mode: "single", // "single" | "run" | "infinite" | "auto"
  classId: null,
  heroId: null,
  enemyId: null,       // combat unique
  runQueueMode: "manual", // "manual" | "zone"
  runQueue: [],          // file manuelle en cours de composition
  runZoneWorldId: null,
  runZoneAdventureId: null,
  persistence: null,     // objet créé au premier accès, voir getSandboxPersistence()
  statsOverride: null,    // {power, endurance, celerity, precision, will} partiel, ou null = stats de base
  statsPanelOpen: false,
  equipmentRarity: null,   // v3.46.0 : "common"/"green"/"rare"/"epic"/"legendary", ou null = pas d'équipement simulé
  enemyCoefsOverride: null, // v3.33.12 : {ENDURANCE_HP_COEF, BOSS_ENDURANCE_HP_COEF, POWER_DMG_COEF, ATTACK_BASE_INTERVAL_S, RESIST_DMG_MULT, WEAK_DMG_MULT, NO_WEAPON_MULT} partiel, ou null = coefficients par défaut
  enemyCoefsPanelOpen: false,
  baseCooldownMs: null,   // null = valeur par défaut du système (SANDBOX_DEFAULT_BASE_COOLDOWN_MS)
  combat: null, // objet retourné par createSandboxCombatState(), ou null
  run: null,    // objet retourné par createSandboxRunState(), ou null
  infinite: null, // objet retourné par createSandboxInfiniteState(), ou null
  autoPolicy: null,          // tableau de slots ordonné, ou null tant qu'aucune classe n'est choisie
  autoRunsRequested: 20,      // nombre de runs à lancer dans la prochaine rafale
  autoBatch: null,            // { runsDone, runsTotal, reports: [...] } pendant/après une rafale
  autoBatchRunning: false,    // true entre le clic "Lancer" et la fin de la rafale (asynchrone)
  autoResultsByClass: {}      // { classId: rapport agrégé (aggregateAutoRuns()) }, conservé entre rafales
};

function getSandboxPersistence() {
  if (!_sandboxUiState.persistence) {
    _sandboxUiState.persistence = createDefaultSandboxPersistence();
  }
  return _sandboxUiState.persistence;
}

var _sandboxClockIntervalMs = 500;
var _sandboxClockHandle = null;

function refreshSandboxLiveUI() {
  var state = null;
  var onClickFn = "triggerSandboxAction";
  var progressBuilder = null;
  var counterBuilder = null;

  if (_sandboxUiState.mode === "single" && _sandboxUiState.combat) {
    state = _sandboxUiState.combat;
  } else if (_sandboxUiState.mode === "run" && _sandboxUiState.run) {
    state = _sandboxUiState.run.currentCombat;
    onClickFn = "triggerSandboxRunAction";
    progressBuilder = function () { return buildSandboxRunProgressLineHTML(_sandboxUiState.run); };
  } else if (_sandboxUiState.mode === "infinite" && _sandboxUiState.infinite) {
    state = _sandboxUiState.infinite.currentCombat;
    onClickFn = "triggerSandboxInfiniteAction";
    progressBuilder = function () { return buildSandboxInfiniteProgressLineHTML(_sandboxUiState.infinite); };
    counterBuilder = function () { return buildSandboxInfiniteCounterHTML(_sandboxUiState.infinite); };
  }
  if (!state) return;

  var kit = getClassSkills(state.classId);
  if (!kit) return;

  var grid = document.getElementById("sandbox-actions-grid");
  if (grid) {
    var buttonsHtml = "";
    ["basic", "skill1", "skill2", "skill3", "defense"].forEach(function (slot) {
      buttonsHtml += buildSandboxActionButtonHTML(state, kit.actions[slot], slot, onClickFn);
    });
    grid.innerHTML = buttonsHtml;
  }

  var statusRow = document.getElementById("sandbox-status-row");
  if (statusRow) {
    statusRow.innerHTML =
      buildSandboxCombatantHTML(state.hero.name + ' (test)', state.hero.hp, state.hero.maxHp, 'hero') +
      buildSandboxCombatantHTML(state.enemy.name, state.enemy.hp, state.enemy.maxHp, 'enemy');
  }

  var resourceWrap = document.getElementById("sandbox-resource-wrap");
  if (resourceWrap) {
    resourceWrap.innerHTML = buildSandboxResourceBarHTML(state, getClassResource(state.classId));
  }

  var log = document.getElementById("sandbox-log");
  if (log) {
    log.innerHTML = buildSandboxLogLinesHTML(state.log);
  }

  var progressLine = document.getElementById("sandbox-progress-line");
  if (progressLine && progressBuilder) {
    progressLine.innerHTML = progressBuilder();
  }

  var counterLine = document.getElementById("sandbox-infinite-counter");
  if (counterLine && counterBuilder) {
    counterLine.innerHTML = counterBuilder();
  }
}

function startSandboxClock() {
  if (_sandboxClockHandle !== null) return; // déjà démarré
  _sandboxClockHandle = setInterval(function () {
    if (typeof game !== "undefined" && game && game.activeTab !== "combat-sandbox") {
      stopSandboxClock();
      return;
    }

    var tickedSomething = false;
    if (_sandboxUiState.mode === "single" && _sandboxUiState.combat && _sandboxUiState.combat.status === "ongoing") {
      _sandboxUiState.combat = tickSandboxTime(_sandboxUiState.combat, _sandboxClockIntervalMs);
      tickedSomething = true;
    } else if (_sandboxUiState.mode === "run" && _sandboxUiState.run && _sandboxUiState.run.status === "ongoing") {
      _sandboxUiState.run = tickSandboxRunTime(_sandboxUiState.run, _sandboxClockIntervalMs);
      tickedSomething = true;
    } else if (_sandboxUiState.mode === "infinite" && _sandboxUiState.infinite && _sandboxUiState.infinite.status === "ongoing") {
      _sandboxUiState.infinite = tickSandboxInfiniteTime(_sandboxUiState.infinite, _sandboxClockIntervalMs);
      tickedSomething = true;
    }
    if (tickedSomething) {
      refreshSandboxLiveUI();
    } else {
      stopSandboxClock();
    }
  }, _sandboxClockIntervalMs);
}

function stopSandboxClock() {
  if (_sandboxClockHandle === null) return;
  clearInterval(_sandboxClockHandle);
  _sandboxClockHandle = null;
}

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

  h += buildSandboxModeSelectorHTML();
  h += buildSandboxSetupHTML();

  if (_sandboxUiState.mode === "single" && _sandboxUiState.combat) {
    h += buildSandboxCombatHTML(_sandboxUiState.combat);
  }
  if (_sandboxUiState.mode === "run" && _sandboxUiState.run) {
    h += buildSandboxRunHTML(_sandboxUiState.run);
  }
  if (_sandboxUiState.mode === "infinite" && _sandboxUiState.infinite) {
    h += buildSandboxInfiniteHTML(_sandboxUiState.infinite);
  }
  if (_sandboxUiState.mode === "auto") {
    h += buildSandboxAutoResultsHTML();
  }

  h += '</div>';
  return h;
}

function buildSandboxModeSelectorHTML() {
  var h = '<div class="sandbox-card">';
  h += '<div class="sandbox-card-title">Mode</div>';
  h += '<div class="sandbox-class-row">';
  h += '<button class="sandbox-choice-btn' + (_sandboxUiState.mode === "single" ? ' is-active' : '') + '" onclick="selectSandboxMode(\'single\')"><span>⚔️ Combat unique</span></button>';
  h += '<button class="sandbox-choice-btn' + (_sandboxUiState.mode === "run" ? ' is-active' : '') + '" onclick="selectSandboxMode(\'run\')"><span>🏃 Run</span></button>';
  h += '<button class="sandbox-choice-btn' + (_sandboxUiState.mode === "infinite" ? ' is-active' : '') + '" onclick="selectSandboxMode(\'infinite\')"><span>♾️ Mode infini</span></button>';
  h += '<button class="sandbox-choice-btn' + (_sandboxUiState.mode === "auto" ? ' is-active' : '') + '" onclick="selectSandboxMode(\'auto\')"><span>🤖 Simulation auto</span></button>';
  h += '</div>';
  h += '</div>';
  return h;
}

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

  if (_sandboxUiState.heroId) {
    h += buildSandboxStatsPanelHTML();
    h += buildSandboxEquipmentPanelHTML();
    h += buildSandboxBaseCooldownSettingHTML();
    h += buildSandboxEnemyCoefsPanelHTML();
  }

  if (_sandboxUiState.mode === "run") {
    h += buildSandboxRunSetupHTML();
  } else if (_sandboxUiState.mode === "infinite") {
    h += buildSandboxInfiniteSetupHTML();
  } else if (_sandboxUiState.mode === "auto") {
    h += buildSandboxAutoSetupHTML();
  } else {
    h += buildSandboxSingleSetupHTML();
  }

  h += '</div>';
  return h;
}

function buildSandboxStatsPanelHTML() {
  var heroId = _sandboxUiState.heroId;
  var baseStats = getSandboxHeroBaseStats(heroId);
  if (!baseStats) return '';
  var current = Object.assign({}, baseStats, _sandboxUiState.statsOverride || {});
  var isOverridden = !!_sandboxUiState.statsOverride;

  var h = '<div class="sandbox-card-title sandbox-collapsible-title" onclick="toggleSandboxStatsPanel()">';
  h += '📊 Stats du héros de test' + (isOverridden ? ' <span class="sandbox-modified-tag">modifiées</span>' : '');
  h += ' <span class="sandbox-collapse-caret">' + (_sandboxUiState.statsPanelOpen ? '▲' : '▼') + '</span>';
  h += '</div>';

  if (!_sandboxUiState.statsPanelOpen) return h;

  var fields = [
    { key: "power", label: "Puissance" },
    { key: "endurance", label: "Endurance" },
    { key: "celerity", label: "Célérité" },
    { key: "precision", label: "Précision" },
    { key: "will", label: "Volonté" }
  ];

  h += '<div class="sandbox-stats-grid">';
  fields.forEach(function (f) {
    h += '<div class="sandbox-stat-field">';
    h += '<label class="sandbox-stat-label">' + esc(f.label) + '</label>';
    h += '<input type="number" class="sandbox-stat-input" value="' + current[f.key] + '" onchange="setSandboxStatField(\'' + f.key + '\', this.value)">';
    h += '</div>';
  });
  h += '</div>';

  h += '<button class="settings-btn sandbox-reset-stats-btn" onclick="resetSandboxStats()">↺ Réinitialiser les stats</button>';

  return h;
}

function buildSandboxEquipmentPanelHTML() {
  if (typeof RARITY_ORDER === "undefined" || typeof RARITY_LABELS === "undefined") return '';
  var current = _sandboxUiState.equipmentRarity;

  var h = '<div class="sandbox-card-title">🎽 Équipement simulé (bac à sable)' + (current ? ' <span class="sandbox-modified-tag">' + esc(RARITY_LABELS[current] || current) + '</span>' : '') + '</div>';
  h += '<div class="sandbox-class-row">';
  h += '<button class="sandbox-choice-btn' + (!current ? ' is-active' : '') + '" onclick="setSandboxEquipmentRarity(null)"><span>Aucun</span></button>';
  RARITY_ORDER.forEach(function (r) {
    h += '<button class="sandbox-choice-btn' + (current === r ? ' is-active' : '') + '" onclick="setSandboxEquipmentRarity(\'' + r + '\')"><span>' + esc(RARITY_LABELS[r] || r) + '</span></button>';
  });
  h += '</div>';
  h += '<div class="sandbox-hint">Applique la MOYENNE du range de chaque emplacement (7 emplacements, EQUIPMENT_SLOT_CONFIG) + les bonus de panoplie 3 et 7 pièces de cette rareté — pas un tirage aléatoire, pour un résultat reproductible. N\'affecte ni l\'auto-DPS ni l\'or (non simulés dans ce bac à sable). Appliqué au lancement du combat/run/simulation, comme les stats du héros.</div>';

  return h;
}

function buildSandboxBaseCooldownSettingHTML() {
  var value = (_sandboxUiState.baseCooldownMs != null) ? _sandboxUiState.baseCooldownMs : SANDBOX_DEFAULT_BASE_COOLDOWN_MS;
  var h = '<div class="sandbox-card-title">⏱️ Cooldown de l\'attaque de base (bac à sable)</div>';
  h += '<div class="sandbox-persistence-row">';
  h += '<span class="sandbox-persistence-label">baseCooldownMs</span>';
  h += '<input type="number" class="sandbox-persistence-percent sandbox-cooldown-input" min="0" step="50" value="' + value + '" onchange="setSandboxBaseCooldownMs(this.value)"> ms';
  h += '</div>';
  h += '<div class="sandbox-hint">Réduit par la Célérité au combat (jusqu\'à -50%). N\'affecte jamais le jeu réel, ni les compétences 1/2/3/défense.</div>';
  return h;
}

function buildSandboxEnemyCoefsPanelHTML() {
  var base = window.SANDBOX_ENEMY_COEFS;
  if (!base) return '';
  var current = Object.assign({}, base, _sandboxUiState.enemyCoefsOverride || {});
  var isOverridden = !!_sandboxUiState.enemyCoefsOverride;

  var h = '<div class="sandbox-card-title sandbox-collapsible-title" onclick="toggleSandboxEnemyCoefsPanel()">';
  h += '👹 Coefficients d\'ennemi (bac à sable)' + (isOverridden ? ' <span class="sandbox-modified-tag">modifiés</span>' : '');
  h += ' <span class="sandbox-collapse-caret">' + (_sandboxUiState.enemyCoefsPanelOpen ? '▲' : '▼') + '</span>';
  h += '</div>';

  if (!_sandboxUiState.enemyCoefsPanelOpen) return h;

  var fields = [
    { key: "ENDURANCE_HP_COEF", label: "PV — ennemi normal (× Endurance × échelle)", step: "0.05" },
    { key: "BOSS_ENDURANCE_HP_COEF", label: "PV — boss (× Endurance × échelle)", step: "0.05" },
    { key: "PV_WORLD_EXP", label: "Exposant PV — terme monde uniquement", step: "0.05" },
    { key: "POWER_SCALE_EXP", label: "Exposant Puissance de riposte (× échelle)", step: "0.05" },
    { key: "POWER_DMG_COEF", label: "Dégâts de riposte (× Puissance)", step: "0.05" },
    { key: "ATTACK_BASE_INTERVAL_S", label: "Intervalle d'attaque de base (s)", step: "0.1" },
    { key: "RESIST_DMG_MULT", label: "Multiplicateur résistance", step: "0.05" },
    { key: "WEAK_DMG_MULT", label: "Multiplicateur faiblesse", step: "0.05" },
    { key: "NO_WEAPON_MULT", label: "Multiplicateur sans affinité d'arme", step: "0.05" },
    { key: "WORLD_INDEX", label: "Monde simulé (0 = Forêt … 5 = Tour)", step: "1" },
    { key: "ADVENTURE_INDEX", label: "Aventure simulée (dans le monde)", step: "1" },
    { key: "CYCLE_COUNT", label: "Cycles bouclés simulés", step: "1" }
  ];

  h += '<div class="sandbox-stats-grid">';
  fields.forEach(function (f) {
    h += '<div class="sandbox-stat-field">';
    h += '<label class="sandbox-stat-label">' + esc(f.label) + '</label>';
    h += '<input type="number" step="' + f.step + '" class="sandbox-stat-input" value="' + current[f.key] + '" onchange="setSandboxEnemyCoefField(\'' + f.key + '\', this.value)">';
    h += '</div>';
  });
  h += '</div>';

  h += '<div class="sandbox-hint">La vitesse d\'attaque (intervalle), les PV (Endurance/exposant monde) et le monde/aventure/cycle simulés ne s\'appliquent qu\'au lancement d\'un nouveau combat/run/simulation (l\'ennemi affiché garde ses PV déjà calculés). Les autres réglages (dégâts de riposte, résistance/faiblesse) s\'appliquent immédiatement, y compris en cours de combat.</div>';
  h += '<button class="settings-btn sandbox-reset-stats-btn" onclick="resetSandboxEnemyCoefs()">↺ Coefficients par défaut (valeurs réelles du jeu)</button>';

  return h;
}

function buildSandboxSingleSetupHTML() {
  var h = '<div class="sandbox-card-title">3. Ennemi</div>';
  h += '<select class="sandbox-enemy-select" onchange="selectSandboxEnemy(this.value)">';
  h += '<option value="">— Choisir un ennemi —</option>';
  var enemies = (typeof listSandboxEnemies === "function") ? listSandboxEnemies() : [];
  enemies.forEach(function (e) {
    var isSelected = _sandboxUiState.enemyId === e.id;
    h += '<option value="' + esc(e.id) + '"' + (isSelected ? ' selected' : '') + '>' + esc(e.name) + (e.isBoss ? ' (Boss)' : '') + '</option>';
  });
  h += '</select>';

  var canLaunch = !!(_sandboxUiState.classId && _sandboxUiState.heroId && _sandboxUiState.enemyId);
  h += '<button class="settings-btn primary sandbox-launch-btn" ' + (canLaunch ? '' : 'disabled') + ' onclick="launchSandboxCombat()">▶️ Lancer le combat</button>';

  if (_sandboxUiState.combat) {
    h += '<button class="settings-btn sandbox-reset-btn" onclick="resetSandboxCombat()">🔄 Réinitialiser</button>';
  }
  return h;
}

function buildSandboxRunSetupHTML() {
  var h = '<div class="sandbox-card-title">3. File d\'ennemis</div>';

  h += '<div class="sandbox-class-row">';
  h += '<button class="sandbox-choice-btn' + (_sandboxUiState.runQueueMode === "manual" ? ' is-active' : '') + '" onclick="selectSandboxRunQueueMode(\'manual\')"><span>Sélection manuelle</span></button>';
  h += '<button class="sandbox-choice-btn' + (_sandboxUiState.runQueueMode === "zone" ? ' is-active' : '') + '" onclick="selectSandboxRunQueueMode(\'zone\')"><span>Zone du jeu</span></button>';
  h += '</div>';

  if (_sandboxUiState.runQueueMode === "zone") {
    h += buildSandboxRunZonePickerHTML();
  } else {
    h += buildSandboxRunManualPickerHTML();
  }

  h += buildSandboxRunQueuePreviewHTML();
  h += buildSandboxPersistenceSettingsHTML();

  var canLaunch = !!(_sandboxUiState.classId && _sandboxUiState.heroId && _sandboxUiState.runQueue.length > 0);
  h += '<button class="settings-btn primary sandbox-launch-btn" ' + (canLaunch ? '' : 'disabled') + ' onclick="launchSandboxRun()">▶️ Lancer le run</button>';

  if (_sandboxUiState.run) {
    h += '<button class="settings-btn sandbox-reset-btn" onclick="resetSandboxRun()">🔄 Réinitialiser</button>';
  }
  return h;
}

function buildSandboxInfiniteSetupHTML() {
  var h = '<div class="sandbox-card-title">3. Mode infini</div>';
  var totalEnemies = (typeof listSandboxAllEnemiesInOrder === "function") ? listSandboxAllEnemiesInOrder().length : 0;
  h += '<div class="sandbox-hint">Enchaîne les ' + totalEnemies + ' ennemis de data/enemies.js dans l\'ordre de progression du jeu, en boucle, jusqu\'à la mort du héros ou un arrêt manuel.</div>';

  h += buildSandboxPersistenceSettingsHTML();

  var canLaunch = !!(_sandboxUiState.classId && _sandboxUiState.heroId && totalEnemies > 0);
  h += '<button class="settings-btn primary sandbox-launch-btn" ' + (canLaunch ? '' : 'disabled') + ' onclick="launchSandboxInfinite()">▶️ Lancer le mode infini</button>';

  if (_sandboxUiState.infinite) {
    h += '<button class="settings-btn sandbox-reset-btn" onclick="resetSandboxInfinite()">🔄 Réinitialiser</button>';
  }
  return h;
}

function buildSandboxAutoSetupHTML() {
  var h = '<div class="sandbox-card-title">3. Simulation auto</div>';
  h += '<div class="sandbox-hint">Le héros joue seul : à chaque tick, il utilise la première action DISPONIBLE de cette liste, dans l\'ordre. Enchaîne les ennemis de data/enemies.js comme le mode infini, sur plusieurs runs à la suite.</div>';

  if (!_sandboxUiState.classId || !_sandboxUiState.heroId) {
    h += '<div class="sandbox-hint">Choisis une classe et un héros ci-dessus pour configurer la priorité.</div>';
    return h;
  }

  h += buildSandboxAutoPolicyListHTML();

  h += '<div class="sandbox-persistence-row">';
  h += '<span class="sandbox-persistence-label">Nombre de runs</span>';
  h += '<input type="number" class="sandbox-persistence-percent sandbox-cooldown-input" min="1" step="1" value="' + _sandboxUiState.autoRunsRequested + '" onchange="setSandboxAutoRunsRequested(this.value)">';
  h += '</div>';

  var running = _sandboxUiState.autoBatchRunning;
  var canLaunch = !!(_sandboxUiState.classId && _sandboxUiState.heroId && _sandboxUiState.autoPolicy && _sandboxUiState.autoPolicy.length && !running);
  h += '<button class="settings-btn primary sandbox-launch-btn" ' + (canLaunch ? '' : 'disabled') + ' onclick="launchSandboxAutoBatch()">' + (running ? '⏳ Simulation en cours…' : '▶️ Lancer une simulation') + '</button>';

  if (Object.keys(_sandboxUiState.autoResultsByClass).length) {
    h += '<button class="settings-btn sandbox-reset-btn" ' + (running ? 'disabled' : '') + ' onclick="resetSandboxAutoResults()">🗑️ Effacer les résultats de comparaison</button>';
  }

  return h;
}

function buildSandboxAutoPolicyListHTML() {
  var policy = _sandboxUiState.autoPolicy || [];
  var kit = getClassSkills(_sandboxUiState.classId);
  if (!kit) return '';

  var h = '<div class="sandbox-queue-title">Ordre de priorité</div>';
  h += '<div class="sandbox-queue-list">';
  policy.forEach(function (slot, index) {
    var action = kit.actions[slot];
    var label = action ? action.label : slot;
    h += '<div class="sandbox-queue-item">';
    h += '<span class="sandbox-queue-item-index">' + (index + 1) + '</span>';
    h += '<span class="sandbox-queue-item-name">' + esc(label) + '</span>';
    h += '<span class="sandbox-queue-item-actions">';
    if (index > 0) h += '<button class="sandbox-queue-move-btn" onclick="moveSandboxAutoPolicyEntry(' + index + ', -1)">↑</button>';
    if (index < policy.length - 1) h += '<button class="sandbox-queue-move-btn" onclick="moveSandboxAutoPolicyEntry(' + index + ', 1)">↓</button>';
    h += '</span>';
    h += '</div>';
  });
  h += '</div>';
  h += '<button class="settings-btn sandbox-reset-stats-btn" onclick="resetSandboxAutoPolicy()">↺ Priorité par défaut</button>';
  return h;
}

function buildSandboxAutoResultsHTML() {
  var h = '';

  if (_sandboxUiState.autoBatch && _sandboxUiState.autoBatchRunning) {
    h += '<div class="sandbox-card">';
    h += '<div class="sandbox-card-title">Simulation en cours</div>';
    h += '<div class="sandbox-hint" id="sandbox-auto-progress">Run ' + _sandboxUiState.autoBatch.runsDone + ' / ' + _sandboxUiState.autoBatch.runsTotal + '</div>';
    h += '</div>';
  }

  var classesWithResults = Object.keys(_sandboxUiState.autoResultsByClass);
  if (classesWithResults.length) {
    h += buildSandboxAutoComparisonTableHTML();
  }

  return h;
}

var SANDBOX_AUTO_METRIC_ROWS = [
  { key: "runsCount", label: "Runs simulés", format: "int" },
  { key: "defeatedAvg", label: "Ennemis vaincus (moy.)", format: "int" },
  { key: "defeatedMinMax", label: "Ennemis vaincus (min / max)", format: "raw" },
  { key: "bossRate", label: "Taux de runs ayant atteint un boss", format: "percent" },
  { key: "durationAvgS", label: "Durée moyenne (s)", format: "int" },
  { key: "heroMaxHp", label: "PV max", format: "int" },
  { key: "heroFinalHpAvg", label: "PV restants (moy. en fin de run)", format: "int" },
  { key: "damageDealtAvg", label: "Dégâts infligés (moy.)", format: "int" },
  { key: "damageTakenAvg", label: "Dégâts reçus (moy.)", format: "int" },
  { key: "damageAvoidedAvg", label: "Dégâts évités (moy., Garde/Esquive/Barrière)", format: "int" },
  { key: "deathRate", label: "Mort(s) — taux de runs terminés en défaite", format: "percent" },
  { key: "topAction", label: "Action la plus utilisée (moy./run)", format: "raw" },
  { key: "resourceWastedAvg", label: "Ressource gaspillée en fin de run (moy.)", format: "float" }
];

function buildSandboxAutoComparisonTableHTML() {
  var classIds = (window.CLASSES || []).map(function (c) { return c.id; })
    .filter(function (id) { return _sandboxUiState.autoResultsByClass[id]; });
  if (!classIds.length) return '';

  var h = '<div class="sandbox-card">';
  h += '<div class="sandbox-card-title">Comparaison des classes</div>';
  h += '<div class="sandbox-hint">Le mode infini n\'affronte jamais de boss (uniquement les ennemis normaux de data/enemies.js) — le taux ci-dessous reflète cette limite, pas un défaut de la classe.</div>';

  h += '<table class="sandbox-compare-table"><thead><tr><th></th>';
  classIds.forEach(function (id) {
    var cls = getClassById(id);
    h += '<th>' + esc(cls ? cls.icon + ' ' + cls.label : id) + '</th>';
  });
  h += '</tr></thead><tbody>';

  SANDBOX_AUTO_METRIC_ROWS.forEach(function (row) {
    h += '<tr><td class="sandbox-compare-row-label">' + esc(row.label) + '</td>';
    classIds.forEach(function (id) {
      h += '<td>' + esc(formatSandboxAutoMetric(_sandboxUiState.autoResultsByClass[id], row)) + '</td>';
    });
    h += '</tr>';
  });

  h += '</tbody></table>';
  h += '</div>';
  return h;
}

function formatSandboxAutoMetric(agg, row) {
  if (!agg) return "—";
  switch (row.key) {
    case "runsCount":
      return String(agg.runsCount);
    case "defeatedAvg":
      return String(Math.round(agg.defeatedCount.avg));
    case "defeatedMinMax":
      return agg.defeatedCount.min + " / " + agg.defeatedCount.max;
    case "bossRate":
      return Math.round(agg.bossRate * 100) + "%";
    case "durationAvgS":
      return String(Math.round(agg.durationMsAvg / 1000));
    case "heroMaxHp":
      return String(Math.round(agg.heroMaxHp));
    case "heroFinalHpAvg":
      return String(Math.round(agg.heroFinalHpAvg));
    case "damageDealtAvg":
      return String(Math.round(agg.damageDealtAvg));
    case "damageTakenAvg":
      return String(Math.round(agg.damageTakenAvg));
    case "damageAvoidedAvg":
      return String(Math.round(agg.damageAvoidedAvg));
    case "deathRate":
      return Math.round(agg.deathRate * 100) + "%";
    case "topAction": {
      var freq = agg.actionFrequencyAvg || {};
      var bestId = null, bestVal = 0;
      Object.keys(freq).forEach(function (id) {
        if (freq[id] > bestVal) { bestVal = freq[id]; bestId = id; }
      });
      return bestId ? (bestId + " (" + (Math.round(bestVal * 10) / 10) + "/run)") : "—";
    }
    case "resourceWastedAvg":
      return String(Math.round(agg.resourceWastedAvg * 100) / 100);
    default:
      return "—";
  }
}

function buildSandboxRunManualPickerHTML() {
  var h = '<select class="sandbox-enemy-select" id="sandbox-run-add-select">';
  h += '<option value="">— Ajouter un ennemi à la file —</option>';
  var enemies = (typeof listSandboxEnemies === "function") ? listSandboxEnemies() : [];
  enemies.forEach(function (e) {
    h += '<option value="' + esc(e.id) + '">' + esc(e.name) + (e.isBoss ? ' (Boss)' : '') + '</option>';
  });
  h += '</select>';
  h += '<button class="settings-btn sandbox-add-btn" onclick="addSandboxRunQueueEntryFromSelect()">➕ Ajouter à la file</button>';
  return h;
}

function buildSandboxRunZonePickerHTML() {
  var zones = (typeof listSandboxZones === "function") ? listSandboxZones() : [];
  var h = '<select class="sandbox-enemy-select" onchange="selectSandboxRunZone(this.value)">';
  h += '<option value="">— Choisir une zone —</option>';
  zones.forEach(function (z) {
    var value = z.worldId + '|' + z.adventureId;
    var isSelected = _sandboxUiState.runZoneWorldId === z.worldId && _sandboxUiState.runZoneAdventureId === z.adventureId;
    h += '<option value="' + esc(value) + '"' + (isSelected ? ' selected' : '') + '>' + esc(z.worldName) + ' — ' + esc(z.adventureName) + '</option>';
  });
  h += '</select>';
  return h;
}

function buildSandboxRunQueuePreviewHTML() {
  var queue = _sandboxUiState.runQueue;
  var h = '<div class="sandbox-queue-title">File (' + queue.length + ' combat' + (queue.length > 1 ? 's' : '') + ')</div>';
  if (!queue.length) {
    h += '<div class="sandbox-queue-empty">File vide.</div>';
    return h;
  }
  var isManual = _sandboxUiState.runQueueMode === "manual";
  h += '<div class="sandbox-queue-list">';
  queue.forEach(function (enemyId, index) {
    var isBoss = typeof BOSS_DB !== "undefined" && BOSS_DB && !!BOSS_DB[enemyId];
    var label = isBoss ? (BOSS_DB[enemyId] ? BOSS_DB[enemyId].name : enemyId) : (typeof ENEMY_DB !== "undefined" && ENEMY_DB[enemyId] ? ENEMY_DB[enemyId].name : enemyId);
    h += '<div class="sandbox-queue-item' + (isBoss ? ' is-boss' : '') + '">';
    h += '<span class="sandbox-queue-item-index">' + (index + 1) + '</span>';
    h += '<span class="sandbox-queue-item-name">' + esc(label) + (isBoss ? ' <span class="sandbox-boss-tag">BOSS</span>' : '') + '</span>';
    if (isManual) {
      h += '<span class="sandbox-queue-item-actions">';
      if (index > 0) h += '<button class="sandbox-queue-move-btn" onclick="moveSandboxRunQueueEntry(' + index + ', -1)">↑</button>';
      if (index < queue.length - 1) h += '<button class="sandbox-queue-move-btn" onclick="moveSandboxRunQueueEntry(' + index + ', 1)">↓</button>';
      h += '<button class="sandbox-queue-remove-btn" onclick="removeSandboxRunQueueEntry(' + index + ')">✕</button>';
      h += '</span>';
    }
    h += '</div>';
  });
  h += '</div>';
  return h;
}

function buildSandboxPersistenceSettingsHTML() {
  var p = getSandboxPersistence();
  var h = '<div class="sandbox-card-title">4. Persistance entre combats</div>';

  h += '<div class="sandbox-persistence-row">';
  h += '<span class="sandbox-persistence-label">PV du héros</span>';
  h += '<select class="sandbox-persistence-select" onchange="setSandboxPersistenceField(\'hpMode\', this.value)">';
  ["keep", "percent", "full"].forEach(function (opt) {
    var labels = { keep: "Conservés", percent: "Restauration partielle", full: "Restauration complète" };
    h += '<option value="' + opt + '"' + (p.hpMode === opt ? ' selected' : '') + '>' + labels[opt] + '</option>';
  });
  h += '</select>';
  if (p.hpMode === "percent") {
    h += '<input type="number" class="sandbox-persistence-percent" min="0" max="100" value="' + p.hpPercent + '" onchange="setSandboxPersistenceField(\'hpPercent\', this.value)"> %';
  }
  h += '</div>';

  h += '<div class="sandbox-persistence-row">';
  h += '<span class="sandbox-persistence-label">Ressource</span>';
  h += '<select class="sandbox-persistence-select" onchange="setSandboxPersistenceField(\'resourceMode\', this.value)">';
  ["keep", "percent", "full"].forEach(function (opt) {
    var labels = { keep: "Conservée", percent: "Restauration partielle", full: "Restauration complète" };
    h += '<option value="' + opt + '"' + (p.resourceMode === opt ? ' selected' : '') + '>' + labels[opt] + '</option>';
  });
  h += '</select>';
  if (p.resourceMode === "percent") {
    h += '<input type="number" class="sandbox-persistence-percent" min="0" max="100" value="' + p.resourcePercent + '" onchange="setSandboxPersistenceField(\'resourcePercent\', this.value)"> %';
  }
  h += '</div>';

  h += '<div class="sandbox-persistence-row">';
  h += '<span class="sandbox-persistence-label">Cooldowns</span>';
  h += '<select class="sandbox-persistence-select" onchange="setSandboxPersistenceField(\'cooldownMode\', this.value)">';
  h += '<option value="reset"' + (p.cooldownMode === "reset" ? ' selected' : '') + '>Réinitialisés</option>';
  h += '<option value="keep"' + (p.cooldownMode === "keep" ? ' selected' : '') + '>Conservés en cours</option>';
  h += '</select>';
  h += '</div>';

  return h;
}

function buildSandboxCombatHTML(state) {
  var resourceDef = getClassResource(state.classId);
  var kit = getClassSkills(state.classId);

  var h = '<div class="sandbox-card sandbox-combat-card">';

  h += '<div class="sandbox-status-row" id="sandbox-status-row">';
  h += buildSandboxCombatantHTML(state.hero.name + ' (test)', state.hero.hp, state.hero.maxHp, 'hero');
  h += buildSandboxCombatantHTML(state.enemy.name, state.enemy.hp, state.enemy.maxHp, 'enemy');
  h += '</div>';

  h += '<div id="sandbox-resource-wrap">' + buildSandboxResourceBarHTML(state, resourceDef) + '</div>';

  if (state.status !== "ongoing") {
    h += '<div class="sandbox-result sandbox-result-' + esc(state.status) + '">';
    h += state.status === "victory" ? "🏆 Victoire" : "💀 Défaite";
    h += '</div>';
  }

  h += '<div class="sandbox-actions-grid" id="sandbox-actions-grid">';
  ["basic", "skill1", "skill2", "skill3", "defense"].forEach(function (slot) {
    var action = kit.actions[slot];
    h += buildSandboxActionButtonHTML(state, action, slot);
  });
  h += '</div>';
  h += '<div class="sandbox-log-title">📜 Journal de combat</div>';
  h += '<div class="sandbox-log" id="sandbox-log">' + buildSandboxLogLinesHTML(state.log) + '</div>';

  h += '</div>';
  return h;
}

function buildSandboxResourceBarHTML(state, resourceDef) {
  if (!resourceDef) return '';
  var pct = Math.round((state.resourceState.current / state.resourceState.max) * 100);
  var h = '<div class="sandbox-resource-bar-wrap">';
  h += '<div class="sandbox-resource-label">' + esc(resourceDef.label) + ' : ' + Math.round(state.resourceState.current * 10) / 10 + ' / ' + state.resourceState.max + '</div>';
  h += '<div class="sandbox-resource-bar"><div class="sandbox-resource-bar-fill" style="width:' + pct + '%"></div></div>';
  h += '</div>';
  return h;
}

function buildSandboxLogLinesHTML(log) {
  var lines = log.slice(-60).slice().reverse();
  if (!lines.length) return '<div class="sandbox-log-line sandbox-log-empty">Aucune action pour l\'instant.</div>';
  var h = "";
  lines.forEach(function (entry) {
    h += '<div class="sandbox-log-line">' + esc(entry.text) + '</div>';
  });
  return h;
}

function buildSandboxRunHTML(run) {
  var combat = run.currentCombat;
  var resourceDef = getClassResource(run.classId);
  var kit = getClassSkills(run.classId);

  var h = '<div class="sandbox-card sandbox-combat-card">';

  h += '<div class="sandbox-run-progress" id="sandbox-progress-line">' + buildSandboxRunProgressLineHTML(run) + '</div>';

  h += '<div class="sandbox-status-row" id="sandbox-status-row">';
  h += buildSandboxCombatantHTML(combat.hero.name + ' (test)', combat.hero.hp, combat.hero.maxHp, 'hero');
  h += buildSandboxCombatantHTML(combat.enemy.name, combat.enemy.hp, combat.enemy.maxHp, 'enemy');
  h += '</div>';

  h += '<div id="sandbox-resource-wrap">' + buildSandboxResourceBarHTML(combat, resourceDef) + '</div>';

  if (run.status !== "ongoing") {
    var resultClass = run.status === "victory" ? "victory" : (run.status === "defeat" ? "defeat" : "stopped");
    var resultLabel = run.status === "victory" ? "🏆 Run remporté" : (run.status === "defeat" ? "💀 Run échoué" : "⏹️ Run arrêté");
    h += '<div class="sandbox-result sandbox-result-' + resultClass + '">' + resultLabel + '</div>';
  }

  h += '<div class="sandbox-actions-grid" id="sandbox-actions-grid">';
  ["basic", "skill1", "skill2", "skill3", "defense"].forEach(function (slot) {
    var action = kit.actions[slot];
    h += buildSandboxActionButtonHTML(combat, action, slot, 'triggerSandboxRunAction');
  });
  h += '</div>';

  if (run.status === "ongoing") {
    h += '<button class="settings-btn danger sandbox-stop-run-btn" onclick="stopSandboxRunFromUi()">⏹️ Arrêter le run</button>';
  } else {
    h += '<button class="settings-btn sandbox-reset-btn" onclick="resetSandboxRun()">🔄 Relancer un run</button>';
  }

  h += '<div class="sandbox-log-title">📜 Journal du run</div>';
  h += '<div class="sandbox-log" id="sandbox-log">' + buildSandboxLogLinesHTML(run.log) + '</div>';

  h += '</div>';
  return h;
}

function buildSandboxRunProgressLineHTML(run) {
  var combat = run.currentCombat;
  var h = 'Combat ' + (run.currentIndex + 1) + ' / ' + run.queue.length;
  if (combat.enemy.isBoss) h += ' <span class="sandbox-boss-tag">BOSS</span>';
  h += ' — ' + esc(combat.enemy.name);
  return h;
}

function buildSandboxInfiniteHTML(infinite) {
  var combat = infinite.currentCombat;
  var resourceDef = getClassResource(infinite.classId);
  var kit = getClassSkills(infinite.classId);

  var h = '<div class="sandbox-card sandbox-combat-card">';

  h += '<div class="sandbox-run-progress" id="sandbox-progress-line">' + buildSandboxInfiniteProgressLineHTML(infinite) + '</div>';
  h += '<div class="sandbox-infinite-counter" id="sandbox-infinite-counter">' + buildSandboxInfiniteCounterHTML(infinite) + '</div>';

  h += '<div class="sandbox-status-row" id="sandbox-status-row">';
  h += buildSandboxCombatantHTML(combat.hero.name + ' (test)', combat.hero.hp, combat.hero.maxHp, 'hero');
  h += buildSandboxCombatantHTML(combat.enemy.name, combat.enemy.hp, combat.enemy.maxHp, 'enemy');
  h += '</div>';

  h += '<div id="sandbox-resource-wrap">' + buildSandboxResourceBarHTML(combat, resourceDef) + '</div>';

  if (infinite.status !== "ongoing") {
    var resultClass = infinite.status === "defeat" ? "defeat" : "stopped";
    var resultLabel = infinite.status === "defeat" ? "💀 Défaite" : "⏹️ Arrêt volontaire";
    h += '<div class="sandbox-result sandbox-result-' + resultClass + '">' + resultLabel + '</div>';
  }

  h += '<div class="sandbox-actions-grid" id="sandbox-actions-grid">';
  ["basic", "skill1", "skill2", "skill3", "defense"].forEach(function (slot) {
    var action = kit.actions[slot];
    h += buildSandboxActionButtonHTML(combat, action, slot, 'triggerSandboxInfiniteAction');
  });
  h += '</div>';

  if (infinite.status === "ongoing") {
    h += '<button class="settings-btn danger sandbox-stop-run-btn" onclick="stopSandboxInfiniteFromUi()">⏹️ Arrêter le mode infini</button>';
  } else {
    h += '<button class="settings-btn sandbox-reset-btn" onclick="resetSandboxInfinite()">🔄 Relancer</button>';
  }

  h += '<div class="sandbox-log-title">📜 Journal</div>';
  h += '<div class="sandbox-log" id="sandbox-log">' + buildSandboxLogLinesHTML(infinite.log) + '</div>';

  h += '</div>';
  return h;
}

function buildSandboxInfiniteProgressLineHTML(infinite) {
  var combat = infinite.currentCombat;
  var h = 'Ennemi ' + (infinite.currentPosition + 1) + ' / ' + infinite.enemyOrder.length;
  h += ' — ' + esc(combat.enemy.name);
  if (infinite.loopCount > 1) h += ' <span class="sandbox-boss-tag sandbox-loop-tag">Boucle ' + infinite.loopCount + '</span>';
  return h;
}

function buildSandboxInfiniteCounterHTML(infinite) {
  return '🏆 ' + infinite.defeatedCount + ' ennemi(s) vaincu(s) au total';
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

function buildSandboxActionButtonHTML(state, action, slot, onClickFn) {
  if (!action) return '';
  var fnName = onClickFn || 'triggerSandboxAction';
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

  var h = '<button class="sandbox-action-btn ' + stateClass + '" ' + (usable ? '' : 'disabled') + ' onclick="' + fnName + '(\'' + esc(slot) + '\')">';
  h += '<span class="sandbox-action-label">' + esc(action.label) + '</span>';
  h += '<span class="sandbox-action-cost">' + (action.resourceCost > 0 ? action.resourceCost : '—') + '</span>';
  h += '<span class="sandbox-action-state">' + esc(stateLabel) + '</span>';
  h += '</button>';
  return h;
}

function selectSandboxClass(classId) {
  var cls = getClassById(classId);
  if (!cls) return;
  _sandboxUiState.classId = classId;
  if (!cls.heroIds.includes(_sandboxUiState.heroId)) {
    _sandboxUiState.heroId = null;
  }
  _sandboxUiState.autoPolicy = (typeof getAutoPolicyDefault === "function") ? getAutoPolicyDefault(classId) : null;
  renderCombatSandboxScreen();
}

function selectSandboxHero(heroId) {
  if (!HEROES_DB[heroId]) return;
  _sandboxUiState.heroId = heroId;
  _sandboxUiState.statsOverride = null;
  renderCombatSandboxScreen();
}

function selectSandboxEnemy(enemyId) {
  _sandboxUiState.enemyId = enemyId || null;
  renderCombatSandboxScreen();
}

function launchSandboxCombat() {
  var s = _sandboxUiState;
  if (!s.classId || !s.heroId || !s.enemyId) return;
  var combat = createSandboxCombatState(s.classId, s.heroId, s.enemyId, s.statsOverride, s.baseCooldownMs, s.enemyCoefsOverride, s.equipmentRarity);
  if (!combat) {
    if (typeof showToast === "function") showToast("Impossible de démarrer le combat de test.");
    return;
  }
  _sandboxUiState.combat = combat;
  startSandboxClock();
  renderCombatSandboxScreen();
}

function triggerSandboxAction(slot) {
  if (!_sandboxUiState.combat) return;
  _sandboxUiState.combat = applySandboxAction(_sandboxUiState.combat, slot);
  if (_sandboxUiState.combat.status !== "ongoing") stopSandboxClock();
  renderCombatSandboxScreen();
}

function resetSandboxCombat() {
  var s = _sandboxUiState;
  if (s.classId && s.heroId && s.enemyId) {
    _sandboxUiState.combat = createSandboxCombatState(s.classId, s.heroId, s.enemyId, s.statsOverride, s.baseCooldownMs, s.enemyCoefsOverride);
    startSandboxClock();
  } else {
    _sandboxUiState.combat = null;
    stopSandboxClock();
  }
  renderCombatSandboxScreen();
}

function selectSandboxMode(mode) {
  if (mode !== "single" && mode !== "run" && mode !== "infinite" && mode !== "auto") return;
  _sandboxUiState.mode = mode;
  stopSandboxClock();
  renderCombatSandboxScreen();
}

function selectSandboxRunQueueMode(queueMode) {
  if (queueMode !== "manual" && queueMode !== "zone") return;
  _sandboxUiState.runQueueMode = queueMode;
  _sandboxUiState.runQueue = [];
  _sandboxUiState.runZoneWorldId = null;
  _sandboxUiState.runZoneAdventureId = null;
  renderCombatSandboxScreen();
}

function addSandboxRunQueueEntryFromSelect() {
  var select = document.getElementById("sandbox-run-add-select");
  if (!select || !select.value) return;
  _sandboxUiState.runQueue = _sandboxUiState.runQueue.concat([select.value]);
  renderCombatSandboxScreen();
}

function removeSandboxRunQueueEntry(index) {
  var queue = _sandboxUiState.runQueue.slice();
  if (index < 0 || index >= queue.length) return;
  queue.splice(index, 1);
  _sandboxUiState.runQueue = queue;
  renderCombatSandboxScreen();
}

function moveSandboxRunQueueEntry(index, direction) {
  var queue = _sandboxUiState.runQueue.slice();
  var target = index + direction;
  if (index < 0 || index >= queue.length || target < 0 || target >= queue.length) return;
  var tmp = queue[index];
  queue[index] = queue[target];
  queue[target] = tmp;
  _sandboxUiState.runQueue = queue;
  renderCombatSandboxScreen();
}

function selectSandboxRunZone(value) {
  if (!value) {
    _sandboxUiState.runZoneWorldId = null;
    _sandboxUiState.runZoneAdventureId = null;
    _sandboxUiState.runQueue = [];
    renderCombatSandboxScreen();
    return;
  }
  var parts = value.split("|");
  var worldId = parts[0];
  var adventureId = parts[1];
  _sandboxUiState.runZoneWorldId = worldId;
  _sandboxUiState.runZoneAdventureId = adventureId;
  _sandboxUiState.runQueue = buildSandboxQueueFromZone(worldId, adventureId);
  renderCombatSandboxScreen();
}

function setSandboxPersistenceField(field, rawValue) {
  var p = getSandboxPersistence();
  var next = Object.assign({}, p);
  if (field === "hpPercent" || field === "resourcePercent") {
    var num = parseFloat(rawValue);
    next[field] = isNaN(num) ? 0 : Math.max(0, Math.min(100, num));
  } else {
    next[field] = rawValue;
  }
  _sandboxUiState.persistence = next;
  renderCombatSandboxScreen();
}

function launchSandboxRun() {
  var s = _sandboxUiState;
  if (!s.classId || !s.heroId || !s.runQueue.length) return;
  var run = createSandboxRunState(s.classId, s.heroId, s.runQueue, getSandboxPersistence(), s.statsOverride, s.baseCooldownMs, s.enemyCoefsOverride, s.equipmentRarity);
  if (!run) {
    if (typeof showToast === "function") showToast("Impossible de démarrer le run de test.");
    return;
  }
  _sandboxUiState.run = run;
  startSandboxClock();
  renderCombatSandboxScreen();
}

function triggerSandboxRunAction(slot) {
  if (!_sandboxUiState.run) return;
  _sandboxUiState.run = applySandboxRunAction(_sandboxUiState.run, slot);
  if (_sandboxUiState.run.status !== "ongoing") stopSandboxClock();
  renderCombatSandboxScreen();
}

function stopSandboxRunFromUi() {
  if (!_sandboxUiState.run) return;
  _sandboxUiState.run = stopSandboxRun(_sandboxUiState.run);
  stopSandboxClock();
  renderCombatSandboxScreen();
}

function resetSandboxRun() {
  var s = _sandboxUiState;
  if (s.classId && s.heroId && s.runQueue.length) {
    _sandboxUiState.run = createSandboxRunState(s.classId, s.heroId, s.runQueue, getSandboxPersistence(), s.statsOverride, s.baseCooldownMs, s.enemyCoefsOverride, s.equipmentRarity);
    startSandboxClock();
  } else {
    _sandboxUiState.run = null;
    stopSandboxClock();
  }
  renderCombatSandboxScreen();
}

function launchSandboxInfinite() {
  var s = _sandboxUiState;
  if (!s.classId || !s.heroId) return;
  var infinite = createSandboxInfiniteState(s.classId, s.heroId, getSandboxPersistence(), s.statsOverride, s.baseCooldownMs, s.enemyCoefsOverride, s.equipmentRarity);
  if (!infinite) {
    if (typeof showToast === "function") showToast("Impossible de démarrer le mode infini.");
    return;
  }
  _sandboxUiState.infinite = infinite;
  startSandboxClock();
  renderCombatSandboxScreen();
}

function triggerSandboxInfiniteAction(slot) {
  if (!_sandboxUiState.infinite) return;
  _sandboxUiState.infinite = applySandboxInfiniteAction(_sandboxUiState.infinite, slot);
  if (_sandboxUiState.infinite.status !== "ongoing") stopSandboxClock();
  renderCombatSandboxScreen();
}

function stopSandboxInfiniteFromUi() {
  if (!_sandboxUiState.infinite) return;
  _sandboxUiState.infinite = stopSandboxInfinite(_sandboxUiState.infinite);
  stopSandboxClock();
  renderCombatSandboxScreen();
}

function resetSandboxInfinite() {
  var s = _sandboxUiState;
  if (s.classId && s.heroId) {
    _sandboxUiState.infinite = createSandboxInfiniteState(s.classId, s.heroId, getSandboxPersistence(), s.statsOverride, s.baseCooldownMs, s.enemyCoefsOverride, s.equipmentRarity);
    startSandboxClock();
  } else {
    _sandboxUiState.infinite = null;
    stopSandboxClock();
  }
  renderCombatSandboxScreen();
}

function moveSandboxAutoPolicyEntry(index, direction) {
  var policy = (_sandboxUiState.autoPolicy || []).slice();
  var target = index + direction;
  if (index < 0 || index >= policy.length || target < 0 || target >= policy.length) return;
  var tmp = policy[index];
  policy[index] = policy[target];
  policy[target] = tmp;
  _sandboxUiState.autoPolicy = policy;
  renderCombatSandboxScreen();
}

function resetSandboxAutoPolicy() {
  if (!_sandboxUiState.classId) return;
  _sandboxUiState.autoPolicy = (typeof getAutoPolicyDefault === "function") ? getAutoPolicyDefault(_sandboxUiState.classId) : [];
  renderCombatSandboxScreen();
}

function setSandboxAutoRunsRequested(rawValue) {
  var num = parseInt(rawValue, 10);
  if (isNaN(num) || num < 1) num = 1;
  _sandboxUiState.autoRunsRequested = num;
  renderCombatSandboxScreen();
}

function launchSandboxAutoBatch() {
  var s = _sandboxUiState;
  if (!s.classId || !s.heroId || s.autoBatchRunning) return;

  var kit = getClassSkills(s.classId);
  var cleanedPolicy = (typeof sanitizeAutoPolicyList === "function") ? sanitizeAutoPolicyList(s.autoPolicy, kit) : (s.autoPolicy || []);
  if (!cleanedPolicy.length) {
    if (typeof showToast === "function") showToast("Priorité de simulation vide ou invalide.");
    return;
  }

  var runsTotal = Math.max(1, s.autoRunsRequested || 1);
  s.autoBatchRunning = true;
  s.autoBatch = { runsDone: 0, runsTotal: runsTotal, reports: [] };
  renderCombatSandboxScreen();

  var classId = s.classId;
  var heroId = s.heroId;
  var statsOverride = s.statsOverride;
  var baseCooldownMs = s.baseCooldownMs;
  var enemyCoefsOverride = s.enemyCoefsOverride;
  var equipmentRarity = s.equipmentRarity; // v3.46.0

  function runOne() {
    if (!_sandboxUiState.autoBatchRunning || !_sandboxUiState.autoBatch) return;

    var report = runSingleAutoRun(classId, heroId, cleanedPolicy, statsOverride, baseCooldownMs, null, enemyCoefsOverride, equipmentRarity);
    if (report) _sandboxUiState.autoBatch.reports.push(report);
    _sandboxUiState.autoBatch.runsDone++;

    var progressLine = document.getElementById("sandbox-auto-progress");
    if (progressLine) {
      progressLine.textContent = "Run " + _sandboxUiState.autoBatch.runsDone + " / " + _sandboxUiState.autoBatch.runsTotal;
    }

    if (_sandboxUiState.autoBatch.runsDone < _sandboxUiState.autoBatch.runsTotal) {
      setTimeout(runOne, 0);
    } else {
      var aggregated = aggregateAutoRuns(_sandboxUiState.autoBatch.reports);
      _sandboxUiState.autoResultsByClass = Object.assign({}, _sandboxUiState.autoResultsByClass);
      _sandboxUiState.autoResultsByClass[classId] = aggregated;
      _sandboxUiState.autoBatchRunning = false;
      renderCombatSandboxScreen();
    }
  }
  setTimeout(runOne, 0);
}

function resetSandboxAutoResults() {
  if (_sandboxUiState.autoBatchRunning) return;
  _sandboxUiState.autoResultsByClass = {};
  _sandboxUiState.autoBatch = null;
  renderCombatSandboxScreen();
}

function toggleSandboxStatsPanel() {
  _sandboxUiState.statsPanelOpen = !_sandboxUiState.statsPanelOpen;
  renderCombatSandboxScreen();
}

function setSandboxStatField(field, rawValue) {
  var validFields = ["power", "endurance", "celerity", "precision", "will"];
  if (validFields.indexOf(field) === -1) return;
  var num = parseFloat(rawValue);
  if (isNaN(num)) return;

  var next = Object.assign({}, _sandboxUiState.statsOverride || {});
  next[field] = num;
  _sandboxUiState.statsOverride = next;
  renderCombatSandboxScreen();
}

function resetSandboxStats() {
  _sandboxUiState.statsOverride = null;
  renderCombatSandboxScreen();
}

function setSandboxEquipmentRarity(rarity) {
  if (typeof RARITY_ORDER === "undefined" || (rarity && RARITY_ORDER.indexOf(rarity) === -1)) return;
  _sandboxUiState.equipmentRarity = rarity || null;
  renderCombatSandboxScreen();
}

function setSandboxBaseCooldownMs(rawValue) {
  var num = parseFloat(rawValue);
  if (isNaN(num) || num < 0) num = 0;
  _sandboxUiState.baseCooldownMs = num;
  renderCombatSandboxScreen();
}

function toggleSandboxEnemyCoefsPanel() {
  _sandboxUiState.enemyCoefsPanelOpen = !_sandboxUiState.enemyCoefsPanelOpen;
  renderCombatSandboxScreen();
}

function setSandboxEnemyCoefField(field, rawValue) {
  var validFields = ["ENDURANCE_HP_COEF", "BOSS_ENDURANCE_HP_COEF", "PV_WORLD_EXP", "POWER_SCALE_EXP", "POWER_DMG_COEF", "ATTACK_BASE_INTERVAL_S", "RESIST_DMG_MULT", "WEAK_DMG_MULT", "NO_WEAPON_MULT", "WORLD_INDEX", "ADVENTURE_INDEX", "CYCLE_COUNT"];
  if (validFields.indexOf(field) === -1) return;
  var num = parseFloat(rawValue);
  if (isNaN(num)) return;

  var next = Object.assign({}, _sandboxUiState.enemyCoefsOverride || {});
  next[field] = num;
  _sandboxUiState.enemyCoefsOverride = next;

  if (_sandboxUiState.combat) {
    _sandboxUiState.combat = Object.assign({}, _sandboxUiState.combat, { enemyCoefs: next });
  }
  if (_sandboxUiState.run && _sandboxUiState.run.currentCombat) {
    _sandboxUiState.run = Object.assign({}, _sandboxUiState.run, {
      overrideEnemyCoefs: next,
      currentCombat: Object.assign({}, _sandboxUiState.run.currentCombat, { enemyCoefs: next })
    });
  }
  if (_sandboxUiState.infinite && _sandboxUiState.infinite.currentCombat) {
    _sandboxUiState.infinite = Object.assign({}, _sandboxUiState.infinite, {
      overrideEnemyCoefs: next,
      currentCombat: Object.assign({}, _sandboxUiState.infinite.currentCombat, { enemyCoefs: next })
    });
  }

  renderCombatSandboxScreen();
}

function resetSandboxEnemyCoefs() {
  _sandboxUiState.enemyCoefsOverride = null;
  if (_sandboxUiState.combat) {
    _sandboxUiState.combat = Object.assign({}, _sandboxUiState.combat, { enemyCoefs: null });
  }
  if (_sandboxUiState.run && _sandboxUiState.run.currentCombat) {
    _sandboxUiState.run = Object.assign({}, _sandboxUiState.run, {
      overrideEnemyCoefs: null,
      currentCombat: Object.assign({}, _sandboxUiState.run.currentCombat, { enemyCoefs: null })
    });
  }
  if (_sandboxUiState.infinite && _sandboxUiState.infinite.currentCombat) {
    _sandboxUiState.infinite = Object.assign({}, _sandboxUiState.infinite, {
      overrideEnemyCoefs: null,
      currentCombat: Object.assign({}, _sandboxUiState.infinite.currentCombat, { enemyCoefs: null })
    });
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
window.selectSandboxMode = selectSandboxMode;
window.selectSandboxRunQueueMode = selectSandboxRunQueueMode;
window.addSandboxRunQueueEntryFromSelect = addSandboxRunQueueEntryFromSelect;
window.removeSandboxRunQueueEntry = removeSandboxRunQueueEntry;
window.moveSandboxRunQueueEntry = moveSandboxRunQueueEntry;
window.selectSandboxRunZone = selectSandboxRunZone;
window.setSandboxPersistenceField = setSandboxPersistenceField;
window.launchSandboxRun = launchSandboxRun;
window.triggerSandboxRunAction = triggerSandboxRunAction;
window.stopSandboxRunFromUi = stopSandboxRunFromUi;
window.resetSandboxRun = resetSandboxRun;
window.toggleSandboxStatsPanel = toggleSandboxStatsPanel;
window.setSandboxStatField = setSandboxStatField;
window.resetSandboxStats = resetSandboxStats;
window.setSandboxBaseCooldownMs = setSandboxBaseCooldownMs;
window.startSandboxClock = startSandboxClock;
window.stopSandboxClock = stopSandboxClock;
window.launchSandboxInfinite = launchSandboxInfinite;
window.triggerSandboxInfiniteAction = triggerSandboxInfiniteAction;
window.stopSandboxInfiniteFromUi = stopSandboxInfiniteFromUi;
window.resetSandboxInfinite = resetSandboxInfinite;
window.moveSandboxAutoPolicyEntry = moveSandboxAutoPolicyEntry;
window.resetSandboxAutoPolicy = resetSandboxAutoPolicy;
window.setSandboxAutoRunsRequested = setSandboxAutoRunsRequested;
window.launchSandboxAutoBatch = launchSandboxAutoBatch;
window.resetSandboxAutoResults = resetSandboxAutoResults;
