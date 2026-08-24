"use strict";
/* ui/more-view.js — écran Personnage : portrait, capacités actives, stats RPG, changement de héros, stats cumulées.
   NOTE : buildCharacterAbilitiesHTML() lit encore SpecialAttackManager/DEFENSE_ABILITY, potentiellement legacy (v3.34.0 système de classes).
   Détail complet : COMMENTAIRES_ORIGINAUX.md */

var CHARACTER_STAT_MAX = {
  power: 500,
  endurance: 300,
  celerity: 400,
  precision: 200,
  will: 250
};

var CHARACTER_STAT_COLORS = {
  power: "#f87171",
  endurance: "#4ade80",
  celerity: "#60a5fa",
  precision: "#fbbf24",
  will: "#c084fc"
};

var CHARACTER_STAT_ICONS = {
  power: "⚔️",
  endurance: "❤️",
  celerity: "✦",
  precision: "🎯",
  will: "🔮"
};

function buildCharacterAbilityCardHTML(config, cssClass, remainingMs, cooldownMs) {
  var onCooldown = remainingMs > 0;
  var cdText = onCooldown ? Math.ceil(remainingMs / 1000) + "s" : Math.round(cooldownMs / 1000) + "s";

  var h = '<div class="ability-card ' + cssClass + '">';
  h += '<div class="ability-icon-wrap">' + esc(config.icon) + '</div>';
  h += '<div class="ability-body">';
  h += '<div class="ability-name">' + esc(config.name) + '</div>';
  h += '<div class="ability-desc">' + esc(config.desc) + '</div>';
  h += '</div>';
  h += '<div class="ability-cd' + (onCooldown ? ' is-active' : '') + '">' + esc(cdText) + '</div>';
  h += '</div>';
  return h;
}

function buildCharacterAbilitiesHTML() {
  var h = '';
  var special = (window.SpecialAttackManager && typeof SpecialAttackManager.getCurrentSpecial === "function")
    ? SpecialAttackManager.getCurrentSpecial()
    : null;

  if (special) {
    var specialRemaining = SpecialAttackManager.getCooldownRemainingMs();
    h += buildCharacterAbilityCardHTML(special, "attack", specialRemaining, special.cooldownMs);
  }

  if (typeof DEFENSE_ABILITY !== "undefined" && window.DefenseManager) {
    var defenseRemaining = DefenseManager.getCooldownRemainingMs();
    h += buildCharacterAbilityCardHTML(DEFENSE_ABILITY, "defense", defenseRemaining, DEFENSE_ABILITY.cooldownMs);
  }

  return h;
}

function buildCharacterStatChipHTML(key, value, spanFull) {
  var max = CHARACTER_STAT_MAX[key] || 100;
  var pct = Math.max(2, Math.min(100, Math.round((value / max) * 100)));
  var color = CHARACTER_STAT_COLORS[key] || "#8b83a3";

  var h = '<div class="stat-chip' + (spanFull ? ' stat-chip-full' : '') + '">';
  h += '<div class="stat-chip-top">';
  h += '<span class="stat-chip-label">' + esc(CHARACTER_STAT_ICONS[key] || "") + ' ' + esc(RPG_STAT_LABELS[key] || key) + '</span>';
  h += '<span class="stat-chip-value">' + esc(value) + '</span>';
  h += '</div>';
  h += '<div class="stat-chip-bar"><div class="stat-chip-bar-fill" style="width:' + pct + '%;background:' + color + ';"></div></div>';
  h += '</div>';
  return h;
}

function buildMoreHTML() {
  var hero = getSelectedHero();
  var stats = hero && hero.stats ? hero.stats : null;
  var heroLevel = Number(game.heroLevel || 1);
  var heroXp = Number(game.heroXp || 0);
  var heroXpToNext = Number(game.heroXpToNext || 20);
  var heroHp = Math.max(0, Math.ceil(Number(game.heroHp != null ? game.heroHp : game.heroMaxHp || 1)));
  var heroMaxHp = Math.max(1, Math.floor(Number(game.heroMaxHp || 1)));
  var xpPct = Math.max(2, Math.min(100, Math.round((heroXp / heroXpToNext) * 100)));
  var hpPct = Math.max(0, Math.min(100, Math.round((heroHp / heroMaxHp) * 100)));

  var h = '<div class="panel-title">Personnage</div>';

  h += '<div class="char-header">';
  h += '<div class="char-portrait-wrap">';
  if (hero && hero.image) {
    h += '<img src="' + esc(hero.image) + '" alt="' + esc(hero.name) + '">';
  } else {
    h += '<div class="char-portrait-placeholder">?</div>';
  }
  h += '<div class="char-level-badge">Niv. ' + esc(heroLevel) + '</div>';
  h += '</div>';

  h += '<div class="char-info">';
  h += '<div class="char-class">' + esc(hero ? hero.name : "Non choisi") + '</div>';
  h += '<div class="char-name">' + esc(game.playerName || "Non défini") + '</div>';
  h += '<div class="char-xp-row"><span class="char-xp-label">XP</span><div class="char-bar-bg"><div class="char-bar-fill xp" style="width:' + xpPct + '%"></div></div><span class="char-xp-text">' + formatNumber(heroXp) + '/' + formatNumber(heroXpToNext) + '</span></div>';
  h += '<div class="char-xp-row"><span class="char-xp-label">❤️ PV</span><div class="char-bar-bg"><div class="char-bar-fill hp" style="width:' + hpPct + '%"></div></div><span class="char-xp-text">' + formatNumber(heroHp) + '/' + formatNumber(heroMaxHp) + '</span></div>';
  h += '</div>';
  h += '</div>';

  var abilitiesHTML = buildCharacterAbilitiesHTML();
  if (abilitiesHTML) {
    h += '<div class="section-label">⚔️ Capacités actives</div>';
    h += abilitiesHTML;
  }

  if (stats) {
    h += '<div class="section-label">📊 Statistiques</div>';
    h += '<div class="stat-grid">';
    h += buildCharacterStatChipHTML("power", stats.power || 0);
    h += buildCharacterStatChipHTML("endurance", stats.endurance || 0);
    h += buildCharacterStatChipHTML("celerity", stats.celerity || 0);
    h += buildCharacterStatChipHTML("precision", stats.precision || 0);
    h += '</div>';
    h += '<div class="stat-grid stat-grid-single">';
    h += buildCharacterStatChipHTML("will", stats.will || 0, true);
    h += '</div>';
  }

  h += '<button class="btn-change-hero" onclick="changeHero()">Changer de héros</button>';

  h += '<div class="settings-info" style="margin-top:14px;">';
  h += '  <strong>Statistiques cumulées</strong><br><br>';
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

window.buildMoreHTML = buildMoreHTML;
