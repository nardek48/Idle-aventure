"use strict";
/* ============================================================
Quest Idle — ui/dungeon-view.js
Écran "Donjon" : billetterie + lancement si aucune tentative n'est
en cours, ou état de la vague actuelle sinon (voir
systems/dungeon-system.js).
============================================================ */

function buildDungeonActiveHTML() {
  var wave = game.dungeonRun.wave || 1;
  var total = DUNGEON_CONFIG.waveCount;
  var isBossWave = wave > total;
  var progressPct = Math.min(100, Math.round((Math.min(wave, total) / total) * 100));

  var h = '<div class="panel-card dungeon-active-card">';
  h += '<div class="dungeon-wave-label">' + (isBossWave ? '👑 Boss du donjon' : 'Vague ' + wave + ' / ' + total) + '</div>';
  h += '<div class="dungeon-progress-bar"><div class="dungeon-progress-fill' + (isBossWave ? ' is-boss' : '') + '" style="width:' + progressPct + '%"></div></div>';
  h += '<p class="panel-sub">Bats-toi dans l\u2019onglet Combat. Si tes PV tombent à 0, la tentative s\u2019arrête ici (récompense réduite selon les vagues passées).</p>';
  h += '<button class="settings-btn danger" type="button" onclick="DungeonManager.forfeit()">Abandonner la tentative</button>';
  h += '</div>';
  return h;
}

function buildDungeonLobbyHTML() {
  var tickets = game.dungeonTickets || 0;
  var canStart = tickets > 0;
  var canBuyTicket = (game.essence || 0) >= DUNGEON_CONFIG.ticketCostEssence;
  var bestWave = game.dungeonBestWave || 0;
  var beatBoss = bestWave > DUNGEON_CONFIG.waveCount;

  var h = '<div class="panel-card">';
  h += '<h3>🎟️ Tickets de donjon</h3>';
  h += '<p class="panel-sub">1 ticket gratuit par jour. Un ticket supplémentaire coûte ' + DUNGEON_CONFIG.ticketCostEssence + ' essence.</p>';
  h += '<div class="dungeon-ticket-row">';
  h += '<span class="dungeon-ticket-count">🎟️ ' + tickets + '</span>';
  h += '<span class="dungeon-ticket-reset">Renouvellement dans ' + esc(DungeonManager.timeUntilTicketReset()) + '</span>';
  h += '</div>';
  h += '<button class="settings-btn' + (canBuyTicket ? '' : ' disabled') + '" type="button" ' + (canBuyTicket ? 'onclick="DungeonManager.buyTicket()"' : 'disabled') + '>Acheter un ticket (' + DUNGEON_CONFIG.ticketCostEssence + ' essence)</button>';
  h += '</div>';

  h += '<div class="panel-card">';
  h += '<h3>🏰 ' + DUNGEON_CONFIG.waveCount + ' vagues + boss</h3>';
  h += '<p class="panel-sub">Un gauntlet nettement plus corsé que le combat classique, avec des ennemis puisés dans tous les mondes déjà débloqués. Termine tout pour une récompense garantie à ta meilleure rareté débloquée — ou récupère quand même quelque chose si tu es vaincu en route.</p>';
  h += '<div class="dungeon-best-wave">🏅 Record : vague ' + Math.min(bestWave, DUNGEON_CONFIG.waveCount) + ' / ' + DUNGEON_CONFIG.waveCount + (beatBoss ? ' — Boss vaincu !' : '') + '</div>';
  h += '<button class="settings-btn' + (canStart ? '' : ' disabled') + '" type="button" ' + (canStart ? 'onclick="DungeonManager.start()"' : 'disabled') + '>' + (canStart ? 'Entrer dans le donjon' : 'Aucun ticket disponible') + '</button>';
  h += '</div>';

  return h;
}

function buildDungeonHTML() {
  if (window.DungeonManager && typeof DungeonManager.checkTicketReset === "function") {
    DungeonManager.checkTicketReset();
  }

  var h = '<div class="panel-title">🏰 Donjon</div>';
  h += (game.dungeonRun && game.dungeonRun.active) ? buildDungeonActiveHTML() : buildDungeonLobbyHTML();
  return h;
}

window.buildDungeonHTML = buildDungeonHTML;
