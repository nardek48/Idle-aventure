"use strict";
/* ============================================================
Quest Idle — ui/modal-view.js
Sélection de héros à la création du personnage : overlay plein écran
(pas un onglet du panel) qui s'ouvre tant que le joueur n'a pas encore
choisi de héros/nom (voir needsHeroSetup(), appelée depuis renderAll()
dans ui-root.js). pendingHeroId garde le choix temporaire avant
confirmation (annuler ne modifie rien).
v2.73 : le changement de héros EN COURS DE PARTIE ne passe plus par
cet overlay — voir le carrousel inline dans js/ui/heros-view.js
(buildHeroCarouselHTML / selectHeroInline).

v3.21 : refonte visuelle complète en 2 ÉTAPES successives, sur une
maquette + assets fournis par Seb — avant, héros/nom/stats/confirmer
étaient tous sur un seul écran encombré.
v3.22 : ordre des 2 étapes inversé (nom D'ABORD, puis héros) + les 6
héros affichés au lieu de 3 seulement (grille 3 colonnes, 2 rangées) :
  1. "name"  — champ de nom (image fournie par Seb en fond, avec la
     plume déjà dessinée dedans), bouton "Continuer".
  2. "hero"  — portrait + stats d'aperçu du héros survolé, les 6
     héros (3 classes de base + 3 variantes du Chaos), bouton
     "Confirmer le héros" qui déclenche confirmHeroSelection() (le
     nom saisi à l'étape 1 est gardé en mémoire le temps du parcours,
     voir pendingPlayerName plus bas — le champ de saisie lui-même
     n'existe plus à ce stade, il faut donc le lire AVANT de changer
     d'étape, pas au moment de la confirmation finale).
Cet overlay ne sert QUE lors de la toute première création de
personnage (needsHeroSetup() ne redevient jamais vrai après) — donc
toujours ces 2 étapes dans cet ordre, jamais de cas où l'une des deux
serait sautée.
============================================================ */

/* ============================================================
   État interne du sélecteur de héros.
============================================================ */

var pendingHeroId = "";
var pendingPlayerName = ""; // v3.22 : saisi à l'étape "name", gardé en
                             // mémoire jusqu'à la confirmation finale
                             // à l'étape "hero" (le <input> lui-même
                             // n'existe plus une fois qu'on a changé
                             // d'étape).
var heroSelectionStep = "name"; // v3.22 : "name" d'abord | "hero" ensuite
var heroAttackPreviewExpanded = false; // v3.29 : bandeau dépliable de l'attaque spéciale, étape "hero"

/* v3.22 : les 6 héros (3 classes de base + 3 variantes du Chaos),
   dans l'ordre d'affichage — avant (v3.21), seules les 3 classes de
   base étaient proposées ici. */
var HERO_SELECTION_BASE_IDS = ["knight", "ranger", "mage", "chaosKnight", "chaosRanger", "chaosMage"];

/* Aperçu des stats PV/ATK/DEF/VIT/CRIT d'un héros AVANT toute
   sélection réelle (aucun game.heroId encore choisi à ce stade) —
   mêmes coefficients EXACTS que StatsSystem.recalcStats() (voir le
   mapping documenté dans ui/heros-view.js), appliqués aux seules
   stats RPG de base du héros (niveau 1, sans amélioration/équipement/
   talent — ce que le joueur aura littéralement au tout premier
   lancement). */
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

/* ============================================================
   Utilisée aussi par d’autres vues comme more.
============================================================ */

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

/* ============================================================
   Appelée dans renderAll.
============================================================ */

function needsHeroSetup() {
  return !game.playerName || !getSelectedHero();
}

/* ============================================================
   Boutons onclick de la sélection héros.
============================================================ */

function selectHeroTemp(heroId) {
  pendingHeroId = heroId;
  openHeroSelection();
}

/* v3.22 : passe de l'étape "name" à l'étape "hero" — appelée par le
   bouton "Continuer" (étape 1). Lit et VALIDE le nom saisi ici (le
   <input> n'existera plus une fois passé à l'étape héros), le garde
   en mémoire dans pendingPlayerName. Ne sauvegarde encore rien. */
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

/* Retour à l'étape "name" depuis l'étape "hero" (bouton retour) — le
   nom déjà saisi est restauré dans le champ (voir buildNameStepHTML). */
function backToNameStep() {
  heroSelectionStep = "name";
  openHeroSelection();
}

/* ============================================================
   Fermeture overlay héros.
============================================================ */

function closeHeroSelection() {
  var host = document.getElementById("hero-selection-root");
  if (host) host.innerHTML = "";
  heroSelectionStep = "name";
  heroAttackPreviewExpanded = false;
}

/* v3.29 : bouton ✕ — annule une création de héros en cours dans un emplacement vide et revient à l'emplacement précédent (jamais sauvegardé, rien à écraser). N'affiche rien au tout premier lancement (pendingHeroCreationOrigin null, needsHeroSetup() rouvrirait de toute façon). */
function cancelHeroSelection() {
  var origin = window.pendingHeroCreationOrigin;
  window.pendingHeroCreationOrigin = null;
  pendingHeroId = "";
  pendingPlayerName = "";

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

/* v3.29 : markup de la croix ✕, partagé entre les 2 étapes — vide si rien où annuler (tout premier lancement). */
function buildHeroPickerCloseButtonHTML() {
  if (!window.pendingHeroCreationOrigin) return "";
  return '<button type="button" class="hero-picker-close-btn" aria-label="Annuler" onclick="cancelHeroSelection()">✕</button>';
}

/* Déplie/replie le bandeau d'aperçu de l'attaque spéciale — étape "hero" uniquement, ré-affiche juste ce step. */
function toggleHeroAttackPreview() {
  heroAttackPreviewExpanded = !heroAttackPreviewExpanded;
  openHeroSelection();
}

/* ============================================================
   Validation du héros choisi.
============================================================ */

function confirmHeroSelection() {
  // v3.22 : le nom a déjà été saisi et validé à l'étape précédente
  // (voir goToHeroStep() ci-dessus) — plus de <input> sur CET écran,
  // on lit pendingPlayerName au lieu du DOM.
  var name = pendingPlayerName || game.playerName || "";

  if (!pendingHeroId && !getSelectedHero()) {
    showToast("Choisis un héros", 1200);
    return;
  }

  if (!name) {
    showToast("Entre un nom", 1200);
    return;
  }

  // Détecté AVANT d'écraser game.playerName : sert à savoir si c'est
  // la toute première création de personnage (pour le tutoriel
  // d'accueil), pas un simple changement de héros en cours de partie.
  var isFirstEverSetup = !game.playerName;

  game.heroId = pendingHeroId || game.heroId;
  if (game.heroId && game.heroId.indexOf("chaos") === 0) {
    game.codexChaosSeen = true;
  }
  // v3.34.0 : ressource/cooldowns de classe repartent toujours de zéro
  // à la sélection d'un héros (confirmé : sécurité, même si la classe
  // reste identique à l'ancien héros) — voir systems/class-combat-system.js.
  if (window.ClassCombatManager && typeof ClassCombatManager.resetForNewHero === "function") {
    ClassCombatManager.resetForNewHero();
  }
  game.playerName = name;
  window.pendingHeroCreationOrigin = null; // v3.29 : création confirmée, la croix ✕ n'a plus lieu d'être pour cet emplacement

  if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
    StatsSystem.recalcStats();
  }
  // v3.41 : recalcStats() ne remonte JAMAIS heroHp au-dessus de sa
  // valeur courante (clamp volontaire, voir stats-system.js #v3.29 —
  // ne pas ressusciter un héros à 0 PV). Un héros neuf part donc à
  // pleine vie explicitement ici, après que heroMaxHp soit connu.
  game.heroHp = game.heroMaxHp;

  closeHeroSelection();
  // v3.7 : au tout premier lancement (isFirstEverSetup), on atterrit
  // sur le Campement — la nouvelle page de base — plutôt que Combat
  // directement. Un changement de héros EN COURS DE PARTIE continue
  // d'aller sur Combat (comportement inchangé, cohérent : on veut
  // voir son nouveau héros se battre tout de suite).
  switchTab(isFirstEverSetup ? "campement" : "combat");
  renderAll();
  saveGame();
  showToast("Héros sélectionné", 1200);

  if (isFirstEverSetup && typeof openOnboarding === "function") {
    openOnboarding();
  }
}
/* ============================================================
   Ouverture overlay héros.
============================================================ */

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

  // v3.22 : "name" est maintenant l'étape par défaut/première.
  host.innerHTML = heroSelectionStep === "hero"
    ? buildHeroStepHTML(selectedHero)
    : buildNameStepHTML();
}

/* v3.21 : portrait + stats d'aperçu du héros survolé, les héros
   sélectionnables en grille en dessous (3 colonnes, 2 rangées pour
   les 6 — voir HERO_SELECTION_BASE_IDS). Sur la maquette fournie par
   Seb (portrait encadré à gauche, panneau de stats à droite, nom du
   héros sous le portrait, bouton doré "Confirmer le héros" tout en
   bas).
   v3.22 : devenue la DERNIÈRE étape (après le nom, pas avant) — le
   bouton "Confirmer le héros" déclenche directement
   confirmHeroSelection() maintenant, plus goToNameStep(). Affiche les
   6 héros (3 classes de base + 3 variantes du Chaos), plus seulement
   3. */
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

/* v3.29 : bandeau dépliable sous le bouton Confirmer, aperçu du kit
   de combat du héros actuellement survolé/sélectionné (pas encore
   choisi définitivement).
   v3.34.0 : montre désormais les 3 skills + l'action defense de la
   CLASSE du héros (voir data/classes.js/class-skills.js) — remplace
   l'aperçu de l'ancienne attaque spéciale unique par héros. Les 2
   héros d'une même classe (ex. Chevalier/Chevalier du Chaos) ont donc
   le même aperçu ici, cohérent avec le fait qu'ils partagent
   réellement le même kit en combat. */
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

/* v3.21 : nom du personnage, sur l'image fournie (fond parchemin +
   plume déjà dessinée dedans).
   v3.22 : devenue la PREMIÈRE étape (avant le héros, pas après) — le
   bouton déclenche maintenant goToHeroStep() (continue vers le choix
   du héros), plus confirmHeroSelection() directement. Pas de bouton
   retour ici : c'est la toute première étape, rien avant. */
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