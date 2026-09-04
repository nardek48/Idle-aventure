"use strict";
/* ui/modal-view.js — création de héros, plein écran (v3.149.0, refonte
   visuelle sur maquette Seb "Etape_création_du_personnage.png", dans la
   charte or/bronze de l'écran titre — voir css/00-hero-creation.css).

   3 étapes : "name" (nom) -> "hero" (classe + variante Chaos) -> "confirm"
   (récap + Commencer l'aventure). L'étape "création du personnage"
   (cheveux/visage/peau) de la maquette est volontairement SAUTÉE : aucun
   système de customisation dans le jeu, chantier à part si un jour.

   Ce qui n'a PAS changé par rapport à v3.22-v3.99 : la logique de
   confirmation (confirmHeroSelection), d'annulation (cancelHeroSelection),
   le flux depuis l'écran titre (titleScreenSlotBeingCreated ->
   resolveTitleScreen() -> init()), le point de montage #hero-selection-root
   (createHeroInSlot dans systems/save-system.js appelle openHeroSelection()
   de façon synchrone — protégé, pas touché). Seul le rendu change.

   Historique v3.22 (2 étapes), v3.29 (bandeau compétences, croix ✕),
   v3.99.0 (flux écran titre). Détail : COMMENTAIRES_ORIGINAUX.md */

var pendingHeroId = "";
var pendingPlayerName = ""; // saisi à l'étape "name", gardé en mémoire jusqu'à confirmation
var pendingHeroGender = ""; // v3.151.0 : "m" | "f" | "" (= pas encore choisi -> défaut "m" à l'affichage), skin cosmétique du portrait
var heroSelectionStep = "name"; // "name" | "hero" | "confirm"
var heroAttackPreviewExpanded = false; // v3.29 : bandeau dépliable des compétences, étape "hero"

/* v3.149.0 : conservé pour compatibilité (référencé ailleurs ?) — l'étape
   "hero" itère désormais sur CLASSES (data/classes.js), dont heroIds =
   [base, chaos], plutôt que sur cette liste plate. */
var HERO_SELECTION_BASE_IDS = ["knight", "ranger", "mage", "chaosKnight", "chaosRanger", "chaosMage"];

/* Descriptions courtes par classe (validées par Seb, session v3.149.0). Clé = CLASSES[].id. */
var HERO_CLASS_TAGLINES = {
  knight: "Maître du combat et de la défense, inébranlable en toute situation.",
  archer: "Agile et précis, maître des attaques à distance.",
  mage: "Gardien des savoirs anciens, il manipule les éléments et l'énergie arcanique."
};

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

function getHeroById(heroId) {
  if (typeof HEROES_DB === "undefined" || !heroId) return null;
  var keys = Object.keys(HEROES_DB);
  for (var i = 0; i < keys.length; i++) {
    var hero = HEROES_DB[keys[i]];
    if (hero && hero.id === heroId) return hero;
  }
  return null;
}

/* Classe (data/classes.js) d'un héros, avec ses 2 variantes : base = heroIds[0], chaos = heroIds[1]. */
function getHeroClassEntry(heroId) {
  if (typeof CLASSES === "undefined" || !heroId) return null;
  for (var i = 0; i < CLASSES.length; i++) {
    var cls = CLASSES[i];
    if (cls && Array.isArray(cls.heroIds) && cls.heroIds.indexOf(heroId) !== -1) return cls;
  }
  return null;
}

function isChaosHeroId(heroId) {
  return typeof heroId === "string" && heroId.indexOf("chaos") === 0;
}

/* v3.151.0 : lit imageM/imageF directement (pas via le getter hero.image,
   qui lit game.heroGender déjà CONFIRMÉ) — utilisé dans le picker pour
   refléter pendingHeroGender avant toute confirmation, sans écrire dans
   `game` tant que le joueur n'a pas validé (cohérent avec pendingHeroId/
   pendingPlayerName, annulables via cancelHeroSelection()). */
function getHeroImageForGender(hero, gender) {
  if (!hero) return "";
  var g = (gender === "f") ? "f" : "m";
  return (g === "f" ? hero.imageF : hero.imageM) || hero.imageM || hero.imageF || "";
}

/* Genre actuellement affiché dans le picker : le choix en cours (pending),
   sinon celui déjà confirmé sur la partie (recréation), sinon "m". */
function getPendingHeroGender() {
  if (pendingHeroGender === "f" || pendingHeroGender === "m") return pendingHeroGender;
  if (game && (game.heroGender === "f" || game.heroGender === "m")) return game.heroGender;
  return "m";
}

function selectHeroGender(gender) {
  pendingHeroGender = (gender === "f") ? "f" : "m";
  openHeroSelection();
}

function selectHeroTemp(heroId) {
  pendingHeroId = heroId;
  openHeroSelection();
}

/* v3.149.0 : clic sur une colonne de classe. Si on change de classe, on
   repart sur la variante de base (pas de Chaos hérité de l'autre classe). */
function selectHeroClass(classId) {
  if (typeof CLASSES === "undefined") return;
  var cls = null;
  for (var i = 0; i < CLASSES.length; i++) { if (CLASSES[i] && CLASSES[i].id === classId) { cls = CLASSES[i]; break; } }
  if (!cls || !cls.heroIds || !cls.heroIds.length) return;

  var current = getHeroClassEntry(pendingHeroId);
  if (current && current.id === cls.id) return; // déjà sur cette classe, ne touche pas à la variante

  pendingHeroId = cls.heroIds[0];
  openHeroSelection();
}

/* v3.149.0 : toggle base <-> Chaos pour la classe sélectionnée (option A validée par Seb). */
function toggleHeroChaosVariant() {
  var cls = getHeroClassEntry(pendingHeroId);
  if (!cls || !cls.heroIds || cls.heroIds.length < 2) return;
  pendingHeroId = isChaosHeroId(pendingHeroId) ? cls.heroIds[0] : cls.heroIds[1];
  openHeroSelection();
}

function goToHeroStep() {
  var input = document.getElementById("player-name-input");
  var name = input ? input.value.trim() : (pendingPlayerName || "");

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

/* v3.149.0 : étape "confirm" (récap) avant la confirmation réelle. */
function goToConfirmStep() {
  if (!pendingHeroId && !getSelectedHero()) {
    showToast("Choisis un héros", 1200);
    return;
  }
  heroSelectionStep = "confirm";
  heroAttackPreviewExpanded = false;
  openHeroSelection();
}

function backToHeroStep() {
  heroSelectionStep = "hero";
  openHeroSelection();
}

function closeHeroSelection() {
  var host = document.getElementById("hero-selection-root");
  if (host) host.innerHTML = "";
  heroSelectionStep = "name";
  heroAttackPreviewExpanded = false;
  pendingHeroGender = ""; // v3.151.0 : repart du genre déjà confirmé (game.heroGender) au prochain ouverture
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

/* v3.29 : croix ✕ — jamais affichée au tout premier lancement (rien où revenir).
   v3.149.0 : aussi affichée quand la création vient de l'écran titre (retour au titre). */
function buildHeroPickerCloseButtonHTML() {
  if (!window.pendingHeroCreationOrigin && !window.titleScreenSlotBeingCreated) return "";
  return '<button type="button" class="hc-close-btn" aria-label="Annuler" onclick="cancelHeroSelection()">✕</button>';
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
  game.heroGender = getPendingHeroGender(); // v3.151.0 : skin cosmétique, validé à la confirmation seulement
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
}

function openHeroSelection() {
  var host = document.getElementById("hero-selection-root");
  if (!host || typeof HEROES_DB === "undefined") return;

  var selectedId = pendingHeroId || game.heroId || "";
  var selectedHero = getHeroById(selectedId);

  if (!selectedHero) {
    var firstId = HERO_SELECTION_BASE_IDS[0];
    selectedHero = HEROES_DB[firstId] || null;
    if (selectedHero && !selectedId) {
      pendingHeroId = selectedHero.id;
      selectedId = selectedHero.id;
    }
  }

  var body;
  if (heroSelectionStep === "confirm") body = buildConfirmStepHTML(selectedHero);
  else if (heroSelectionStep === "hero") body = buildHeroStepHTML(selectedHero);
  else body = buildNameStepHTML();

  host.innerHTML = buildHeroCreationShellHTML(body);

  // Étape "name" : focus direct dans le champ (sans scroll intempestif sur mobile).
  if (heroSelectionStep === "name") {
    var input = document.getElementById("player-name-input");
    if (input) { try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); } }
  }
}

/* ---------------------------------------------------------------
   Rendu — coquille plein écran commune aux 3 étapes
   --------------------------------------------------------------- */

/* Fond + cadre parchemin + logo + croix ✕. Le contenu de l'étape est
   injecté dans .hc-body (zone scrollable). */
function buildHeroCreationShellHTML(bodyHtml) {
  var html = '<div class="hc-overlay">';
  html += '  <img src="images/TitleScreen/title_background_new.png" alt="" class="hc-bg">';
  html += '  <div class="hc-frame">';
  html += buildHeroPickerCloseButtonHTML();
  html += '    <img src="images/TitleScreen/titre_logo.png" alt="Aethervale" class="hc-logo">';
  html += '    <div class="hc-body">';
  html += bodyHtml;
  html += '    </div>';
  html += '  </div>';
  html += '</div>';
  return html;
}

/* Ruban de titre d'étape (titre_charger.png réutilisé comme cadre, texte
   HTML par-dessus — même technique que l'écran Charger). v3.150.0 : la
   pastille numérotée ①②③ a été retirée (demande Seb, capture annotée). */
function buildHeroStepHeaderHTML(title, subtitle) {
  var html = '<div class="hc-step-title-wrap">';
  html += '  <img src="images/TitleScreen/titre_charger.png" alt="" class="hc-step-title-img">';
  html += '  <h2 class="hc-step-title-text">' + esc(title) + '</h2>';
  html += '</div>';
  if (subtitle) html += '<p class="hc-step-subtitle">' + esc(subtitle) + '</p>';
  return html;
}

/* ---------------------------------------------------------------
   Étape 1 — Nom
   --------------------------------------------------------------- */
function buildNameStepHTML() {
  var currentName = pendingPlayerName || game.playerName || "";

  var html = buildHeroStepHeaderHTML("Choix du nom", "Entrez le nom de votre héros.");

  html += '<div class="hc-name-wrap">';
  html += '  <img src="images/TitleScreen/bouton_titre.png" alt="" class="hc-name-bg">';
  html += '  <input id="player-name-input" type="text" maxlength="20" autocomplete="off" autocapitalize="words" placeholder="Entrez le nom…" value="' + esc(currentName) + '" onkeydown="if(event.key===\'Enter\'){event.preventDefault();goToHeroStep();}">';
  html += '</div>';

  html += '<div class="hc-actions">';
  html += '  <button type="button" class="hc-img-btn" onclick="goToHeroStep()">';
  html += '    <img src="images/TitleScreen/bouton_titre.png" alt="" class="hc-img-btn-bg">';
  html += '    <span>Continuer</span>';
  html += '  </button>';
  html += '</div>';
  return html;
}

/* ---------------------------------------------------------------
   Étape 2 — Classe (3 colonnes) + toggle Chaos sous la colonne active
   --------------------------------------------------------------- */
function buildHeroStepHTML(selectedHero) {
  var selectedClass = selectedHero ? getHeroClassEntry(selectedHero.id) : null;
  var selectedIsChaos = selectedHero ? isChaosHeroId(selectedHero.id) : false;
  var gender = getPendingHeroGender();

  var html = buildHeroStepHeaderHTML("Choix de la classe", "Choisissez la voie que suivra votre héros.");

  html += '<div class="hc-class-grid">';
  if (typeof CLASSES !== "undefined") {
    CLASSES.forEach(function (cls) {
      if (!cls || !cls.heroIds || !cls.heroIds.length) return;
      var baseHero = getHeroById(cls.heroIds[0]);
      if (!baseHero) return;
      var isActive = selectedClass && selectedClass.id === cls.id;
      // Portrait affiché dans la colonne : la variante réellement sélectionnée si c'est cette classe, sinon la base.
      var shownHero = (isActive && selectedHero) ? selectedHero : baseHero;
      var tagline = HERO_CLASS_TAGLINES[cls.id] || "";

      html += '<button type="button" class="hc-class-card' + (isActive ? ' active' : '') + '" onclick="selectHeroClass(\'' + esc(cls.id) + '\')">';
      html += '  <div class="hc-class-portrait"><img src="' + esc(getHeroImageForGender(shownHero, gender)) + '" alt="' + esc(baseHero.name) + '"></div>';
      html += '  <div class="hc-class-name">' + esc(baseHero.name) + '</div>';
      html += '  <div class="hc-class-tagline">' + esc(tagline) + '</div>';
      html += '</button>';
    });
  }
  html += '</div>';

  // Toggle Homme/Femme (v3.151.0, skin cosmétique — option A).
  html += '<div class="hc-gender-toggle">';
  html += '  <button type="button" class="hc-gender-btn' + (gender === "m" ? ' active' : '') + '" onclick="selectHeroGender(\'m\')">Homme</button>';
  html += '  <button type="button" class="hc-gender-btn' + (gender === "f" ? ' active' : '') + '" onclick="selectHeroGender(\'f\')">Femme</button>';
  html += '</div>';

  // Toggle Chaos — uniquement si la classe active a bien 2 variantes.
  if (selectedClass && selectedClass.heroIds && selectedClass.heroIds.length >= 2) {
    var chaosHero = getHeroById(selectedClass.heroIds[1]);
    html += '<button type="button" class="hc-chaos-toggle' + (selectedIsChaos ? ' on' : '') + '" onclick="toggleHeroChaosVariant()">';
    html += '  <span class="hc-chaos-toggle-box">' + (selectedIsChaos ? '✓' : '') + '</span>';
    html += '  <span>Variante du Chaos' + (chaosHero ? ' — ' + esc(chaosHero.name) : '') + '</span>';
    html += '</button>';
  }

  // Aperçu stats + bandeau compétences (v3.29), sous les colonnes.
  var stats = selectedHero ? getHeroPreviewStats(selectedHero) : { pv: 0, atk: 0, def: 0, vit: 0, crit: 0 };
  html += '<div class="hc-stats">';
  html += '  <div class="hc-stat"><span class="hc-stat-icon">❤️</span><span class="hc-stat-label">PV</span><strong>' + esc(formatNumber(stats.pv)) + '</strong></div>';
  html += '  <div class="hc-stat"><span class="hc-stat-icon">⚔️</span><span class="hc-stat-label">ATK</span><strong>' + esc(formatNumber(stats.atk)) + '</strong></div>';
  html += '  <div class="hc-stat"><span class="hc-stat-icon">🛡️</span><span class="hc-stat-label">DEF</span><strong>' + stats.def + '%</strong></div>';
  html += '  <div class="hc-stat"><span class="hc-stat-icon">⚡</span><span class="hc-stat-label">VIT</span><strong>' + esc(formatNumber(stats.vit)) + '</strong></div>';
  html += '  <div class="hc-stat"><span class="hc-stat-icon">🎯</span><span class="hc-stat-label">CRIT</span><strong>' + stats.crit + '%</strong></div>';
  html += '</div>';

  html += buildHeroAttackPreviewBandeauHTML(selectedHero);

  html += '<div class="hc-actions hc-actions-row">';
  html += '  <button type="button" class="hc-back-btn" onclick="backToNameStep()"><img src="images/TitleScreen/bouton_retour_new.png" alt="Retour"></button>';
  html += '  <button type="button" class="hc-img-btn" onclick="goToConfirmStep()">';
  html += '    <img src="images/TitleScreen/bouton_titre.png" alt="" class="hc-img-btn-bg">';
  html += '    <span>Continuer</span>';
  html += '  </button>';
  html += '</div>';
  return html;
}

/* v3.29 : bandeau dépliable des compétences de classe (conservé tel quel, classes CSS renommées hc-). */
function buildHeroAttackPreviewBandeauHTML(selectedHero) {
  if (!selectedHero || typeof getClassForHero !== "function") return "";
  var cls = getClassForHero(selectedHero);
  var kit = (cls && typeof getClassSkills === "function") ? getClassSkills(cls.id) : null;
  if (!kit) return "";

  var html = '<button type="button" class="hc-skills-toggle" onclick="toggleHeroAttackPreview()">';
  html += '⚔️ Compétences de classe <span class="hc-skills-chevron">' + (heroAttackPreviewExpanded ? '▴' : '▾') + '</span>';
  html += '</button>';

  if (heroAttackPreviewExpanded) {
    html += '<div class="hc-skills-list">';
    var slots = ["skill1", "skill2", "skill3", "defense"];
    slots.forEach(function (slot) {
      var action = kit.actions[slot];
      if (!action) return;
      var icon = (typeof CLASS_ACTION_ICON_FALLBACK !== "undefined" && CLASS_ACTION_ICON_FALLBACK[action.id]) || (action.type === "defense" ? "🛡️" : "✨");

      html += '<div class="hc-skill-card">';
      html += '  <div class="hc-skill-icon-wrap">' + renderIconOrEmojiHTML(icon, "hc-skill-icon", action.label) + '</div>';
      html += '  <div class="hc-skill-body">';
      html += '    <div class="hc-skill-name">' + esc(action.label) + '</div>';
      html += '    <div class="hc-skill-desc">' + esc(action.description) + '</div>';
      html += '  </div>';
      html += '</div>';
    });
    html += '</div>';
  }

  return html;
}

/* ---------------------------------------------------------------
   Étape 3 — Confirmation
   --------------------------------------------------------------- */
function buildConfirmStepHTML(selectedHero) {
  var name = pendingPlayerName || game.playerName || "";
  var cls = selectedHero ? getHeroClassEntry(selectedHero.id) : null;
  var baseHero = (cls && cls.heroIds) ? getHeroById(cls.heroIds[0]) : selectedHero;
  var className = baseHero ? baseHero.name : (selectedHero ? selectedHero.name : "");
  var tagline = (cls && HERO_CLASS_TAGLINES[cls.id]) || "";

  var html = buildHeroStepHeaderHTML("Confirmation", "Vérifiez votre héros avant de commencer l'aventure.");

  html += '<div class="hc-confirm-portrait">';
  var confirmImg = getHeroImageForGender(selectedHero, getPendingHeroGender());
  if (confirmImg) html += '<img src="' + esc(confirmImg) + '" alt="' + esc(selectedHero ? selectedHero.name : "") + '">';
  html += '</div>';

  html += '<div class="hc-confirm-name">' + esc(name) + '</div>';
  html += '<div class="hc-confirm-class">' + (cls && cls.icon ? '<span class="hc-confirm-class-icon">' + cls.icon + '</span>' : '') + esc(className) + '</div>';
  if (selectedHero && isChaosHeroId(selectedHero.id)) {
    html += '<div class="hc-confirm-variant">' + esc(selectedHero.name) + '</div>';
  }
  if (tagline) html += '<div class="hc-confirm-tagline">' + esc(tagline) + '</div>';

  html += '<div class="hc-actions hc-actions-row">';
  html += '  <button type="button" class="hc-back-btn" onclick="backToHeroStep()"><img src="images/TitleScreen/bouton_retour_new.png" alt="Retour"></button>';
  html += '  <button type="button" class="hc-img-btn hc-img-btn-start" onclick="confirmHeroSelection()">';
  html += '    <img src="images/TitleScreen/bouton_titre.png" alt="" class="hc-img-btn-bg">';
  html += '    <span>Commencer l\'aventure</span>';
  html += '  </button>';
  html += '</div>';
  return html;
}

window.getSelectedHero = getSelectedHero;
window.needsHeroSetup = needsHeroSetup;
window.selectHeroTemp = selectHeroTemp;
window.selectHeroClass = selectHeroClass;
window.selectHeroGender = selectHeroGender;
window.toggleHeroChaosVariant = toggleHeroChaosVariant;
window.goToHeroStep = goToHeroStep;
window.backToNameStep = backToNameStep;
window.goToConfirmStep = goToConfirmStep;
window.backToHeroStep = backToHeroStep;
window.closeHeroSelection = closeHeroSelection;
window.confirmHeroSelection = confirmHeroSelection;
window.openHeroSelection = openHeroSelection;
window.toggleHeroAttackPreview = toggleHeroAttackPreview;
window.cancelHeroSelection = cancelHeroSelection;
