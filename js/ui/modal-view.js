"use strict";
/* ============================================================
Quest Idle — ui/modal-view.js
Sélection/changement de héros : l'overlay plein écran (pas un onglet
du panel) qui s'ouvre à la création du personnage ou via "Changer de
héros" dans l'écran Plus. pendingHeroId garde le choix temporaire
avant confirmation (annuler ne modifie rien).
============================================================ */

/* ============================================================
   État interne du sélecteur de héros. 
============================================================ */

var pendingHeroId = "";


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

/* ============================================================
   Fermeture overlay héros.
============================================================ */

function closeHeroSelection() {
  var host = document.getElementById("hero-selection-root");
  if (host) host.innerHTML = "";
}

/* ============================================================
   Utilisée dans le panneau more.
============================================================ */

function changeHero() {
  pendingHeroId = game.heroId || "";
  openHeroSelection();
}

/* ============================================================
   Validation du héros choisi.
============================================================ */

function confirmHeroSelection() {
  var input = document.getElementById("player-name-input");
  var name = input ? input.value.trim() : "";

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
  game.playerName = name;

  if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
    StatsSystem.recalcStats();
  }

  closeHeroSelection();
  switchTab("combat");
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

  var currentName = game.playerName || "";
  var selectedId = pendingHeroId || game.heroId || "";
  var selectedHero = null;

  Object.keys(HEROES_DB).forEach(function(key) {
    var hero = HEROES_DB[key];
    if (hero && hero.id === selectedId) {
      selectedHero = hero;
    }
  });

  if (!selectedHero) {
    var firstKey = Object.keys(HEROES_DB)[0];
    selectedHero = firstKey ? HEROES_DB[firstKey] : null;
    if (selectedHero && !selectedId) {
      pendingHeroId = selectedHero.id;
      selectedId = selectedHero.id;
    }
  }

  var html = '';
  html += '<div class="hero-picker-overlay">';
  html += '  <div class="hero-picker">';
  html += '    <h2>Choisis ton héros</h2>';
  html += '    <p>Choisis un héros et donne un nom à ton personnage.</p>';
  html += '    <input id="player-name-input" type="text" maxlength="20" placeholder="Nom du personnage" value="' + esc(currentName) + '">';
  html += '    <div class="hero-grid">';

  Object.keys(HEROES_DB).forEach(function(key) {
    var hero = HEROES_DB[key];
    var activeClass = selectedId === hero.id ? "active" : "";

    html += '<button type="button" class="hero-card ' + activeClass + '" onclick="selectHeroTemp(\'' + esc(hero.id) + '\')">';
    html += '  <img src="' + esc(hero.image) + '" alt="' + esc(hero.name) + '" class="hero-card-image">';
    html += '  <div class="hero-card-name">' + esc(hero.name) + '</div>';
    html += '</button>';
  });

  html += '    </div>';

  html += '    <div class="hero-picker-actions">';
  html += '      <button class="btn secondary" onclick="closeHeroSelection()">Annuler</button>';
  html += '      <button class="btn primary" onclick="confirmHeroSelection()">Confirmer</button>';
  html += '    </div>';

  if (selectedHero) {
    var stats = selectedHero.stats || {};
    html += '    <div class="hero-preview">';
    html += '      <div class="hero-preview-title">Statistiques de ' + esc(selectedHero.name) + '</div>';
    html += '      <div class="hero-preview-stats">';
    html += '        <div class="hero-stat"><span>Puissance</span><strong>' + esc(stats.power || 0) + '</strong></div>';
    html += '        <div class="hero-stat"><span>Endurance</span><strong>' + esc(stats.endurance || 0) + '</strong></div>';
    html += '        <div class="hero-stat"><span>Célérité</span><strong>' + esc(stats.celerity || 0) + '</strong></div>';
    html += '        <div class="hero-stat"><span>Précision</span><strong>' + esc(stats.precision || 0) + '</strong></div>';
    html += '        <div class="hero-stat"><span>Volonté</span><strong>' + esc(stats.will || 0) + '</strong></div>';
    html += '      </div>';
    html += '    </div>';

    if (selectedHero.id && selectedHero.id.indexOf("chaos") === 0 && typeof CodexManager !== "undefined") {
      var chaosEntry = CodexManager.getById("chaos");
      if (chaosEntry) {
        var chaosSentence = chaosEntry.text.split(".")[0] + ".";
        html += '    <div class="hero-preview-lore">📖 « ' + esc(chaosSentence) + ' »</div>';
      }
    }
  }

  html += '  </div>';
  html += '</div>';

  host.innerHTML = html;
}

window.getSelectedHero = getSelectedHero;
window.needsHeroSetup = needsHeroSetup;
window.selectHeroTemp = selectHeroTemp;
window.closeHeroSelection = closeHeroSelection;
window.changeHero = changeHero;
window.confirmHeroSelection = confirmHeroSelection;
window.openHeroSelection = openHeroSelection;