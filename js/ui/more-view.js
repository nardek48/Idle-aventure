"use strict";

/* ============================================================
   	Builder bouton plus. 
============================================================ */



function buildMoreHTML() {
  var hero = getSelectedHero();
  var stats = hero && hero.stats ? hero.stats : null;

  var h = '<div class="panel-title">Plus</div>';

  h += '<div class="hero-summary-card">';
  h += '  <h3>Personnage</h3>';
  h += '  <div class="hero-summary-row">';

  h += '    <div class="hero-summary-avatar">';
  if (hero && hero.image) {
    h += '      <img src="' + esc(hero.image) + '" alt="' + esc(hero.name) + '" class="hero-summary-image">';
  } else {
    h += '      <div class="hero-summary-placeholder">?</div>';
  }
  h += '    </div>';

  h += '    <div class="hero-summary-meta">';
  h += '      <p><strong>Nom :</strong> ' + esc(game.playerName || "Non défini") + '</p>';
  h += '      <p><strong>Héros :</strong> ' + esc(hero ? hero.name : "Non choisi") + '</p>';
  h += '    </div>';

  h += '  </div>';

  if (stats) {
    h += '  <div class="hero-summary-stats">';
    h += '    <div class="hero-summary-stat"><span>Puissance</span><strong>' + esc(stats.power || 0) + '</strong></div>';
    h += '    <div class="hero-summary-stat"><span>Endurance</span><strong>' + esc(stats.endurance || 0) + '</strong></div>';
    h += '    <div class="hero-summary-stat"><span>Célérité</span><strong>' + esc(stats.celerity || 0) + '</strong></div>';
    h += '    <div class="hero-summary-stat"><span>Précision</span><strong>' + esc(stats.precision || 0) + '</strong></div>';
    h += '    <div class="hero-summary-stat"><span>Volonté</span><strong>' + esc(stats.will || 0) + '</strong></div>';
    h += '  </div>';
  }

  h += '  <button class="menu-action-btn" onclick="changeHero()">Changer de héros</button>';
  h += '</div>';

  h += '<button class="settings-btn" onclick="switchTab(\'bestiary\')">Bestiaire</button>';
  h += '<button class="settings-btn" onclick="switchTab(\'log\')">Journal</button>';
  h += '<button class="settings-btn" onclick="switchTab(\'settings\')">Paramètres</button>';

  h += '<div class="settings-info" style="margin-top:10px;">';
  h += '  <strong>Statistiques</strong><br><br>';
  h += '  Temps de jeu : ' + esc(typeof formatTime === "function" ? formatTime(game.playTime || 0) : String(Math.floor(game.playTime || 0)) + "s") + '<br>';
  h += '  Total tués : ' + esc(formatNumber(game.totalKills || 0)) + '<br>';
  h += '  Or gagné : ' + esc(formatNumber(game.totalGoldEarned || 0)) + '<br>';
  h += '  Dégâts infligés : ' + esc(formatNumber(game.totalDamageDealt || 0)) + '<br>';
  h += '  Monde : ' + esc((WorldManager.worldIndex + 1) + " / " + WORLDS.length) + '<br>';
  h += '  Cycles : ' + esc(formatNumber(game.cycleCount || 0)) + '<br>';
  h += '  Ascensions : ' + esc(formatNumber(game.ascensionCount || 0));
  h += '</div>';

  return h;
}

window.buildMoreHTML =  buildMoreHTML;