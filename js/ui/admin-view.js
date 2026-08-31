"use strict";
/* ui/admin-view.js — écran Admin/Debug (dev uniquement) : éditeur rapide de
   stats/ressources + accès direct au bac à sable de combat. Accessible via
   l'onglet caché "admin" (bouton dans Paramètres). N'ajoute aucune logique
   métier : appelle uniquement les points d'écriture déjà en place
   (WarehouseManager, StatsSystem.recalcStats, CombatEngine.killEnemy...). */

function buildAdminHTML() {
  var h = '<div class="admin-panel">';

  h += '<div class="panel-card admin-card">';
  h += '<h3>💰 Or & Essence</h3>';
  h += adminFieldRow("admin-gold", "Or", game.gold, "adminApplyGold()");
  h += adminFieldRow("admin-essence", "Essence", game.essence, "adminApplyEssence()");
  h += '<div class="admin-quick-row">';
  h += '<button class="settings-btn admin-btn" onclick="adminQuickAdd(\'gold\', 10000)">+10 000 or</button>';
  h += '<button class="settings-btn admin-btn" onclick="adminQuickAdd(\'essence\', 1000)">+1 000 essence</button>';
  h += '</div>';
  h += '</div>';

  h += '<div class="panel-card admin-card">';
  h += '<h3>📦 Éclats de donjon</h3>';
  h += adminFieldRow("admin-shards", "Éclats", game.dungeonShards || 0, "adminApplyShards()");
  h += '</div>';

  h += '<div class="panel-card admin-card">';
  h += '<h3>💪 Stats entraînées</h3>';
  h += adminFieldRow("admin-power", "Puissance", game.trainedStats.power, "adminApplyTrainedStat('power')");
  h += adminFieldRow("admin-endurance", "Endurance", game.trainedStats.endurance, "adminApplyTrainedStat('endurance')");
  h += adminFieldRow("admin-celerity", "Célérité", game.trainedStats.celerity, "adminApplyTrainedStat('celerity')");
  h += adminFieldRow("admin-precision", "Précision", game.trainedStats.precision, "adminApplyTrainedStat('precision')");
  h += adminFieldRow("admin-will", "Volonté", game.trainedStats.will, "adminApplyTrainedStat('will')");
  h += '<div class="admin-quick-row">';
  h += '<button class="settings-btn admin-btn" onclick="adminRecalcStats()">🔄 Recalculer les stats</button>';
  h += '</div>';
  h += '</div>';

  h += '<div class="panel-card admin-card">';
  h += '<h3>❤️ PV du héros</h3>';
  h += adminFieldRow("admin-herohp", "PV actuels (max " + Math.floor(game.heroMaxHp) + ")", game.heroHp, "adminApplyHeroHp()");
  h += '<div class="admin-quick-row">';
  h += '<button class="settings-btn admin-btn" onclick="adminHeroHpMax()">💚 PV au maximum</button>';
  h += '<button class="settings-btn admin-btn" onclick="adminKillEnemy()">☠️ Tuer l\'ennemi affiché</button>';
  h += '</div>';
  h += '</div>';

  h += '<div class="panel-card admin-card">';
  h += '<h3>🗺️ Monde & cycle</h3>';
  h += '<p class="panel-sub">Monde actuel : ' + (window.WorldManager ? WorldManager.worldIndex : 0) + ' (' + ((window.WorldManager && WorldManager.getWorld() && WorldManager.getWorld().name) || "?") + ')</p>';
  h += adminFieldRow("admin-worldindex", "Index de monde (0–6)", (window.WorldManager ? WorldManager.worldIndex : 0), "adminApplyWorldIndex()", 0, 6);
  h += adminFieldRow("admin-cyclecount", "Nombre de cycles", game.cycleCount || 0, "adminApplyCycleCount()");
  h += '<p class="panel-sub admin-warn">Changer l\'index de monde réinitialise la progression d\'aventure/ennemi du monde (adventureIndex/enemyIndex à 0).</p>';
  h += '</div>';

  h += '<div class="panel-card admin-card">';
  h += '<h3>🧪 Bac à sable de combat</h3>';
  h += '<p class="panel-sub">Interface complète déjà existante, ouverte directement depuis ici.</p>';
  h += '<button class="settings-btn admin-btn" onclick="switchTab(\'combat-sandbox\')">🧪 Bac à sable (ancien moteur — refonte v3.102.2)</button>';
  h += '</div>';

  h += '<button class="settings-btn admin-btn" onclick="switchTab(\'settings\')">← Retour aux Paramètres</button>';

  h += '</div>';
  return '<div class="nb-page-frame admin-root">' + h + '</div>';
}

function adminFieldRow(inputId, label, currentValue, onApplyCall, minVal, maxVal) {
  var v = (typeof currentValue === "number" && isFinite(currentValue)) ? Math.floor(currentValue) : 0;
  var attrs = "";
  if (typeof minVal === "number") attrs += ' min="' + minVal + '"';
  if (typeof maxVal === "number") attrs += ' max="' + maxVal + '"';
  var row = '<div class="admin-field-row">';
  row += '<label for="' + inputId + '">' + label + '</label>';
  row += '<input type="number" id="' + inputId + '" class="admin-input" value="' + v + '"' + attrs + '>';
  row += '<button class="settings-btn admin-btn admin-apply-btn" onclick="' + onApplyCall + '">Appliquer</button>';
  row += '</div>';
  return row;
}

function adminReadInt(inputId) {
  var el = document.getElementById(inputId);
  if (!el) return null;
  var n = Math.floor(Number(el.value));
  return isFinite(n) ? n : null;
}

function adminRefresh() {
  saveGame();
  if (typeof renderAll === "function") renderAll();
  if (game.activeTab === "admin" && typeof renderPanel === "function") renderPanel();
}

function adminApplyGold() {
  var n = adminReadInt("admin-gold");
  if (n === null || n < 0) return;
  game.gold = n;
  adminRefresh();
}

function adminApplyEssence() {
  var n = adminReadInt("admin-essence");
  if (n === null || n < 0) return;
  game.essence = n;
  adminRefresh();
}

function adminApplyShards() {
  var n = adminReadInt("admin-shards");
  if (n === null || n < 0) return;
  game.dungeonShards = n;
  adminRefresh();
}

function adminQuickAdd(field, amount) {
  if (field === "gold") game.gold = (game.gold || 0) + amount;
  else if (field === "essence") game.essence = (game.essence || 0) + amount;
  adminRefresh();
}

function adminApplyTrainedStat(statKey) {
  var idMap = { power: "admin-power", endurance: "admin-endurance", celerity: "admin-celerity", precision: "admin-precision", will: "admin-will" };
  var n = adminReadInt(idMap[statKey]);
  if (n === null || n < 0) return;
  game.trainedStats[statKey] = n;
  StatsSystem.recalcStats();
  adminRefresh();
}

function adminRecalcStats() {
  StatsSystem.recalcStats();
  adminRefresh();
}

function adminApplyHeroHp() {
  var n = adminReadInt("admin-herohp");
  if (n === null || n < 0) return;
  game.heroHp = Math.min(n, game.heroMaxHp);
  adminRefresh();
}

function adminHeroHpMax() {
  game.heroHp = game.heroMaxHp;
  adminRefresh();
}

function adminKillEnemy() {
  if (!game.enemy) return;
  CombatEngine.killEnemy();
  adminRefresh();
}

function adminApplyWorldIndex() {
  var n = adminReadInt("admin-worldindex");
  if (n === null || n < 0 || n > 6 || !window.WorldManager || typeof WORLDS === "undefined" || !WORLDS[n]) return;
  WorldManager.worldIndex = n;
  WorldManager.adventureIndex = 0;
  WorldManager.enemyIndex = 0;
  if (typeof WorldManager.markWorldReached === "function") WorldManager.markWorldReached(n);
  if (typeof WorldManager.applyWorldTheme === "function") WorldManager.applyWorldTheme();
  adminRefresh();
}

function adminApplyCycleCount() {
  var n = adminReadInt("admin-cyclecount");
  if (n === null || n < 0) return;
  game.cycleCount = n;
  adminRefresh();
}

window.buildAdminHTML = buildAdminHTML;
window.adminApplyGold = adminApplyGold;
window.adminApplyEssence = adminApplyEssence;
window.adminApplyShards = adminApplyShards;
window.adminQuickAdd = adminQuickAdd;
window.adminApplyTrainedStat = adminApplyTrainedStat;
window.adminRecalcStats = adminRecalcStats;
window.adminApplyHeroHp = adminApplyHeroHp;
window.adminHeroHpMax = adminHeroHpMax;
window.adminKillEnemy = adminKillEnemy;
window.adminApplyWorldIndex = adminApplyWorldIndex;
window.adminApplyCycleCount = adminApplyCycleCount;
