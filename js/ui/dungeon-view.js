"use strict";
/* ============================================================
Quest Idle — ui/dungeon-view.js
Écran "Donjon" v2.16 : sélection d'un palier (comme la Carte du
monde) si aucune tentative n'est en cours, ou état de la vague
actuelle sinon (voir systems/dungeon-system.js).
============================================================ */

function buildDungeonActiveHTML() {
  var tier = DungeonManager.getTierById(game.dungeonRun.tierId);
  var wave = game.dungeonRun.wave || 1;
  var total = DUNGEON_CONFIG.waveCount;
  var isBossWave = wave > total;
  var progressPct = Math.min(100, Math.round((Math.min(wave, total) / total) * 100));

  var h = '<div class="panel-card dungeon-active-card">';
  h += '<div class="dungeon-active-tier">' + esc(tier.name) + '</div>';
  h += '<div class="dungeon-wave-label">' + (isBossWave ? '👑 Boss du donjon' : 'Vague ' + wave + ' / ' + total) + '</div>';
  h += '<div class="dungeon-progress-bar"><div class="dungeon-progress-fill' + (isBossWave ? ' is-boss' : '') + '" style="width:' + progressPct + '%"></div></div>';
  h += '<p class="panel-sub">Bats-toi dans l\u2019onglet Combat. Si tes PV tombent à 0, la tentative s\u2019arrête ici (récompense réduite selon les vagues passées).</p>';
  h += '<button class="settings-btn danger" type="button" onclick="DungeonManager.forfeit()">Abandonner la tentative</button>';
  h += '</div>';
  return h;
}

/* Une carte de palier dans le sélecteur (même principe visuel que la
   grille de mondes de la Carte). */
function buildDungeonTierCardHTML(tier) {
  var unlocked = DungeonManager.isTierUnlocked(tier.id);
  var rarityLabel = (typeof RARITY_LABELS !== "undefined" && RARITY_LABELS[tier.maxRarity]) || tier.maxRarity;
  var rarityColor = (typeof RARITY_COLORS !== "undefined" && RARITY_COLORS[tier.maxRarity]) || "#9ca3af";

  var h = '<div class="dungeon-tier-card' + (unlocked ? '' : ' is-locked') + '">';
  h += '<div class="dungeon-tier-top">';
  h += '<div class="dungeon-tier-name">' + esc(tier.name) + '</div>';
  h += '<div class="dungeon-tier-rarity" style="color:' + rarityColor + '">🎁 ' + esc(rarityLabel) + ' max</div>';
  h += '</div>';

  if (unlocked) {
    h += '<button class="dungeon-tier-btn" type="button" onclick="openDungeonIntro(' + tier.id + ')">Entrer</button>';
  } else {
    h += '<div class="dungeon-tier-lock">🔒 ' + (tier.requiredAscension) + ' ascension(s) requise(s)</div>';
  }

  h += '</div>';
  return h;
}

function buildDungeonLobbyHTML() {
  var tickets = game.dungeonTickets || 0;
  var purchasedToday = game.dungeonTicketsPurchasedToday || 0;
  var maxPerDay = DUNGEON_CONFIG.maxTicketPurchasesPerDay || 10;
  var remainingPurchases = Math.max(0, maxPerDay - purchasedToday);
  var canBuyTicket = (game.essence || 0) >= DUNGEON_CONFIG.ticketCostEssence && remainingPurchases > 0;
  var bestWave = game.dungeonBestWave || 0;
  var beatBoss = bestWave > DUNGEON_CONFIG.waveCount;

  var h = '<div class="panel-card">';
  h += '<h3>🎟️ Tickets de donjon</h3>';
  h += '<p class="panel-sub">1 ticket gratuit par jour, valable pour n\u2019importe quel palier. Un ticket supplémentaire coûte ' + DUNGEON_CONFIG.ticketCostEssence + ' essence — limité à ' + maxPerDay + ' achats par jour.</p>';
  h += '<div class="dungeon-ticket-row">';
  h += '<span class="dungeon-ticket-count">🎟️ ' + tickets + '</span>';
  h += '<span class="dungeon-ticket-reset">Renouvellement dans ' + esc(DungeonManager.timeUntilTicketReset()) + '</span>';
  h += '</div>';
  h += '<div class="dungeon-ticket-limit">Achats aujourd\u2019hui : ' + purchasedToday + ' / ' + maxPerDay + '</div>';
  h += '<button class="settings-btn' + (canBuyTicket ? '' : ' disabled') + '" type="button" ' + (canBuyTicket ? 'onclick="DungeonManager.buyTicket()"' : 'disabled') + '>' + (remainingPurchases > 0 ? 'Acheter un ticket (' + DUNGEON_CONFIG.ticketCostEssence + ' essence)' : 'Limite journalière atteinte') + '</button>';
  h += '</div>';

  h += '<div class="panel-card">';
  h += '<h3>🏰 Choisis ton palier</h3>';
  h += '<p class="panel-sub">' + DUNGEON_CONFIG.waveCount + ' vagues + boss par tentative, avec des ennemis puisés dans les mondes couverts par le palier. Plus le palier est haut, plus c\u2019est dur — mais plus le butin garanti est bon.</p>';
  h += '<div class="dungeon-best-wave">🏅 Record : vague ' + Math.min(bestWave, DUNGEON_CONFIG.waveCount) + ' / ' + DUNGEON_CONFIG.waveCount + (beatBoss ? ' — Boss vaincu !' : '') + '</div>';

  h += '<div class="dungeon-tier-grid">';
  (DUNGEON_TIERS || []).forEach(function (tier) {
    h += buildDungeonTierCardHTML(tier);
  });
  h += '</div>';

  h += '</div>';

  h += buildDungeonShopHTML();

  return h;
}

/* Boutique exclusive du donjon (voir DUNGEON_SHOP dans data/dungeon.js) :
   3 bonus permanents achetables en Éclats, la monnaie gagnée en
   passant des vagues — indépendante de l'or/essence classiques. */
function buildDungeonShopHTML() {
  var shards = game.dungeonShards || 0;

  var h = '<div class="panel-card">';
  h += '<h3>🔷 Boutique du donjon</h3>';
  h += '<p class="panel-sub">Payée en Éclats — gagnés en passant des vagues (1 par vague, +' + DUNGEON_CONFIG.shardsBossBonus + ' bonus si le boss tombe). Utilisables uniquement ici.</p>';
  h += '<div class="dungeon-shard-count">🔷 ' + formatNumber(shards) + ' Éclats</div>';

  h += '<div class="dungeon-shop-grid">';
  (DUNGEON_SHOP || []).forEach(function (item) {
    var level = DungeonManager.getShardShopLevel(item.id);
    var maxed = level >= item.maxLevel;
    var cost = DungeonManager.getShardShopCost(item);
    var canBuy = !maxed && shards >= cost;

    h += '<div class="dungeon-shop-card">';
    h += '<div class="dungeon-shop-icon">' + esc(item.icon) + '</div>';
    h += '<div class="dungeon-shop-info">';
    h += '<div class="dungeon-shop-name">' + esc(item.name) + ' <span class="dungeon-shop-level">Niv. ' + level + '/' + item.maxLevel + '</span></div>';
    h += '<div class="dungeon-shop-desc">' + esc(item.desc) + '</div>';
    h += '</div>';
    if (maxed) {
      h += '<button class="dungeon-shop-buy is-maxed" type="button" disabled>Max</button>';
    } else {
      h += '<button class="dungeon-shop-buy' + (canBuy ? '' : ' cant-afford') + '" type="button" onclick="DungeonManager.buyShardUpgrade(\'' + esc(item.id) + '\')">🔷 ' + formatNumber(cost) + '</button>';
    }
    h += '</div>';
  });
  h += '</div>';

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

/* ============================================================
   v2.18 : petite fenêtre narrative avant d'entrer dans un palier, et
   fenêtre de résumé à la fin d'une tentative (succès ou échec).
   Réutilisent le même overlay que le Menu/le tutoriel (.full-menu-*).
============================================================ */

var pendingDungeonTierId = null;

function buildDungeonIntroHTML(tierId) {
  var tier = DungeonManager.getTierById(tierId);
  var rarityLabel = (typeof RARITY_LABELS !== "undefined" && RARITY_LABELS[tier.maxRarity]) || tier.maxRarity;

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card">';
  h += '    <div class="dungeon-story-icon">🏰</div>';
  h += '    <div class="dungeon-story-title">' + esc(tier.name) + '</div>';
  h += '    <div class="dungeon-story-text">' + esc(tier.story) + '</div>';
  h += buildDungeonSceauLoreHTML(tierId);
  h += '    <div class="dungeon-story-meta">🎁 Butin garanti jusqu\u2019à : <strong>' + esc(rarityLabel) + '</strong> · ⚔️ ' + DUNGEON_CONFIG.waveCount + ' vagues + boss</div>';
  h += '    <div class="dungeon-story-actions">';
  h += '      <button class="settings-btn" type="button" onclick="closeDungeonIntro()">Annuler</button>';
  h += '      <button class="settings-btn primary" type="button" onclick="confirmDungeonStart()">Entrer</button>';
  h += '    </div>';
  h += '  </div>';
  h += '</div>';
  return h;
}

/* Citation du Codex sur ce Sceau précis (data/codex.js), en
   complément du texte d'ambiance existant — affichée même si
   l'entrée n'a pas encore été "lue" au sens du Codex, puisque cette
   fenêtre EST le moment de la découverte. */
function buildDungeonSceauLoreHTML(tierId) {
  if (typeof CodexManager === "undefined") return "";
  var entry = CodexManager.getById("dungeon_tier_" + tierId);
  if (!entry) return "";
  return '    <div class="dungeon-story-lore">📖 « ' + esc(entry.text) + ' »</div>';
}

function openDungeonIntro(tierId) {
  if (!DungeonManager.isTierUnlocked(tierId)) return showToast("Palier verrouillé", 1200);
  if ((game.dungeonTickets || 0) <= 0) return showToast("Aucun ticket de donjon", 1200);

  pendingDungeonTierId = tierId;
  var host = document.getElementById("dungeon-modal-root");
  if (host) host.innerHTML = buildDungeonIntroHTML(tierId);
}

function closeDungeonIntro() {
  pendingDungeonTierId = null;
  var host = document.getElementById("dungeon-modal-root");
  if (host) host.innerHTML = "";
}

function confirmDungeonStart() {
  var tierId = pendingDungeonTierId;
  closeDungeonIntro();
  if (tierId) DungeonManager.start(tierId);
}

/* Résumé de fin de tentative (succès ou échec), affiché par
   DungeonManager.finish() en plus du toast/journal habituels. */
function buildDungeonSummaryHTML(result) {
  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card' + (result.success ? ' is-success' : ' is-failure') + '">';
  h += '    <div class="dungeon-story-icon">' + (result.success ? '🏆' : '🏰') + '</div>';
  h += '    <div class="dungeon-story-title">' + esc(result.tierName) + (result.success ? ' terminé !' : ' interrompu') + '</div>';
  h += '    <div class="dungeon-story-text">' + (result.success
    ? 'Le boss s\u2019effondre. La salle retrouve son calme — pour cette fois.'
    : 'La tentative s\u2019arrête à la vague ' + result.clearedWave + ' sur ' + result.wavesTotal + '. Tu récupères quand même quelque chose avant de te replier.') + '</div>';

  h += '    <div class="dungeon-summary-rewards">';
  h += '      <div class="dungeon-summary-row"><span>Vagues passées</span><span>' + Math.min(result.clearedWave, result.wavesTotal) + ' / ' + result.wavesTotal + (result.success ? ' + Boss' : '') + '</span></div>';
  h += '      <div class="dungeon-summary-row"><span>💰 Or</span><span>+' + formatNumber(result.goldReward) + '</span></div>';
  h += '      <div class="dungeon-summary-row"><span>🔮 Essence</span><span>+' + formatNumber(result.essenceReward) + '</span></div>';
  h += '      <div class="dungeon-summary-row"><span>🔷 Éclats</span><span>+' + formatNumber(result.shardsGained) + '</span></div>';
  if (result.lootedItem) {
    h += '      <div class="dungeon-summary-row dungeon-summary-loot"><span>🎁 Butin</span><span>' + esc(result.lootedItem.name) + '</span></div>';
  }
  h += '    </div>';

  h += '    <button class="settings-btn primary dungeon-story-close" type="button" onclick="closeDungeonSummary()">Continuer</button>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function openDungeonSummary(result) {
  var host = document.getElementById("dungeon-modal-root");
  if (host) host.innerHTML = buildDungeonSummaryHTML(result);
}

function closeDungeonSummary() {
  var host = document.getElementById("dungeon-modal-root");
  if (host) host.innerHTML = "";
}

window.openDungeonIntro = openDungeonIntro;
window.closeDungeonIntro = closeDungeonIntro;
window.confirmDungeonStart = confirmDungeonStart;
window.openDungeonSummary = openDungeonSummary;
window.closeDungeonSummary = closeDungeonSummary;
