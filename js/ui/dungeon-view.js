"use strict";
/* ui/dungeon-view.js — écran Donjon (v2.16), sous-onglets Donjon/Boutique. Liste en accordéon (v2.83.6), overlay tickets, intro/résumé de palier. Détail complet : COMMENTAIRES_ORIGINAUX.md */

var activeDungeonSubTab = "tiers"; // "tiers" | "shop"
var expandedDungeonId = null; // v2.83.30 : replié par défaut (demande explicite — on veut voir la liste complète des donjons directement)

function setDungeonSubTab(tab) {
  activeDungeonSubTab = (tab === "shop") ? "shop" : "tiers";
  if (typeof renderPanel === "function") renderPanel();
}
window.setDungeonSubTab = setDungeonSubTab;

function toggleDungeonExpand(dungeonId) {
  expandedDungeonId = (expandedDungeonId === dungeonId) ? null : dungeonId;
  if (typeof renderPanel === "function") renderPanel();
}
window.toggleDungeonExpand = toggleDungeonExpand;

function buildDungeonSubTabBarHTML() {
  var h = '<div class="pc-subtab-bar">';
  h += '<button type="button" class="pc-subtab-btn' + (activeDungeonSubTab === "tiers" ? ' is-active' : '') + '" onclick="setDungeonSubTab(\'tiers\')">🏰<span>Donjon</span></button>';
  h += '<button type="button" class="pc-subtab-btn' + (activeDungeonSubTab === "shop" ? ' is-active' : '') + '" onclick="setDungeonSubTab(\'shop\')">🔷<span>Boutique</span></button>';
  h += '</div>';
  return h;
}

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

function buildDungeonTierCardHTML(tier, isLast) {
  var unlocked = DungeonManager.isTierUnlocked(tier.id);
  var heroDowned = (game.heroHp || 0) <= 0;
  var rarityLabel = (typeof RARITY_LABELS !== "undefined" && RARITY_LABELS[tier.maxRarity]) || tier.maxRarity;
  var rarityColor = (typeof RARITY_COLORS !== "undefined" && RARITY_COLORS[tier.maxRarity]) || "#9ca3af";

  var imageHTML = tier.icon
    ? renderIconOrEmojiHTML(tier.icon, "dungeon-tier-img", tier.name)
    : '<span class="dungeon-tier-num">' + tier.id + '</span>';

  
  var cardTag = unlocked ? 'button' : 'div';
  var cardAttrs = unlocked
    ? ' type="button" onclick="openDungeonIntro(' + tier.id + ')"'
    : '';

  var h = '<' + cardTag + ' class="dungeon-tier-card' + (unlocked ? ' is-tappable' : ' is-locked') + (unlocked && heroDowned ? ' is-downed' : '') + (isLast ? ' is-full' : '') + '"' + cardAttrs + '>';
  h += '<div class="dungeon-tier-image">' + imageHTML + (unlocked ? '' : '<span class="dungeon-tier-image-lock">🔒</span>') + (unlocked && heroDowned ? '<span class="dungeon-tier-image-lock">💀</span>' : '') + '</div>';
  h += '<div class="dungeon-tier-info">';
  h += '<div class="dungeon-tier-name">' + esc(tier.name) + '</div>';
  h += '<div class="dungeon-tier-rarity" style="color:' + rarityColor + '">🎁 ' + esc(rarityLabel) + ' max</div>';

  if (!unlocked) {
    var tiers = DUNGEON_TIERS || [];
    var idx = tiers.indexOf(tier);
    var previousTier = idx > 0 ? tiers[idx - 1] : null;
    var lockText = previousTier
      ? 'Termine ' + esc(previousTier.name) + ' pour débloquer'
      : 'Verrouillé';
    h += '<div class="dungeon-tier-lock-text">' + lockText + '</div>';
  } else if (heroDowned) {
    h += '<div class="dungeon-tier-lock-text">Héros à terre — repos requis</div>';
  }

  h += '</div>';
  h += '</' + cardTag + '>';
  return h;
}

function buildDungeonCardHTML(dungeon) {
  var isExpanded = expandedDungeonId === dungeon.id;
  var isLocked = !!dungeon.locked;
  var bestWave = game.dungeonBestWave || 0;
  var beatBoss = bestWave > DUNGEON_CONFIG.waveCount;

  var h = '<div class="dungeon-card' + (isExpanded ? ' is-expanded' : '') + (isLocked ? ' is-locked' : '') + '">';
  h += '<button type="button" class="dungeon-card-head" onclick="' + (isLocked ? '' : 'toggleDungeonExpand(\'' + esc(dungeon.id) + '\')') + '">';
  if (dungeon.banner) {
    h += renderIconOrEmojiHTML(dungeon.banner, "dungeon-card-head-img", dungeon.name);
  } else {
    h += '<span class="dungeon-card-head-placeholder">' + esc(dungeon.icon || "🏰") + '</span>';
  }
  h += '<div class="dungeon-card-head-name">' + esc(dungeon.name) + (isLocked ? ' 🔒' : '') + '</div>';
  if (isLocked) h += '<div class="dungeon-card-head-hint">' + esc(dungeon.lockedHint || "Pas encore disponible") + '</div>';
  if (!isLocked) h += '<div class="dungeon-card-chevron">' + (isExpanded ? "▲" : "▼") + '</div>';
  h += '</button>';

  if (isExpanded && !isLocked) {
    h += '<div class="dungeon-card-body">';
    h += '<div class="dungeon-card-desc">' + esc(dungeon.desc) + '</div>';
    h += '<div class="dungeon-best-wave">🏅 Record : vague ' + Math.min(bestWave, DUNGEON_CONFIG.waveCount) + ' / ' + DUNGEON_CONFIG.waveCount + (beatBoss ? ' — Boss vaincu !' : '') + '</div>';
    h += '<div class="dungeon-tier-grid">';
    var tierIds = dungeon.tierIds || [];
    tierIds.forEach(function (tierId, index) {
      h += buildDungeonTierCardHTML(DungeonManager.getTierById(tierId), index === tierIds.length - 1);
    });
    h += '</div>';
    h += '</div>';
  }

  h += '</div>';
  return h;
}

function buildDungeonTicketBadgeHTML() {
  var tickets = game.dungeonTickets || 0;
  var h = '<button type="button" class="dungeon-ticket-badge" onclick="openDungeonTicketOverlay()">';
  h += '<span class="dungeon-ticket-badge-icon">🎟️</span>';
  h += '<span class="dungeon-ticket-badge-label">Achat de ticket</span>';
  h += '<span class="dungeon-ticket-badge-count">' + tickets + '</span>';
  h += '</button>';
  return h;
}

function buildDungeonLobbyHTML() {
  var h = "";

  if (activeDungeonSubTab === "shop") {
    h += buildDungeonShopHTML();
    return '<div class="nb-page-frame nb-page-frame-fill">' + h + '</div>'; // v2.83.28
  }

  h += buildDungeonTicketBadgeHTML();

  h += '<div class="dungeon-list">';
  (DUNGEONS || []).forEach(function (dungeon) {
    h += buildDungeonCardHTML(dungeon);
  });
  h += '</div>';

  return '<div class="nb-page-frame nb-page-frame-fill">' + h + '</div>'; // v2.83.28
}

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

    h += '<div class="nb-purchase-card' + (maxed ? ' is-maxed' : '') + '">';
    h += '<div class="nb-purchase-icon-col"><div class="nb-purchase-icon-slot">' + renderIconOrEmojiHTML(item.icon, "nb-purchase-icon", item.name) + '</div></div>';
    h += '<div class="nb-purchase-info-col">';
    h += '<div class="nb-purchase-name">' + esc(item.name) + '</div>';
    h += '<div class="nb-purchase-meta">Niv. ' + level + '/' + item.maxLevel + '</div>';
    h += '<div class="nb-purchase-desc">' + esc(item.desc) + '</div>';
    h += '</div>';
    h += '<div class="nb-purchase-buy-col">';
    if (maxed) {
      h += '<button class="btn-buy is-maxed" type="button" disabled>Max</button>';
    } else {
      h += '<button class="btn-buy' + (canBuy ? '' : ' cant-afford') + '" type="button" onclick="DungeonManager.buyShardUpgrade(\'' + esc(item.id) + '\')">🔷 ' + formatNumber(cost) + '</button>';
    }
    h += '</div>';
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

  var isActive = !!(game.dungeonRun && game.dungeonRun.active);

  var h = '<div class="subtab-page">';
  h += '<div class="subtab-page-content">';
  h += isActive ? buildDungeonActiveHTML() : buildDungeonLobbyHTML();
  h += '</div>'; // fin .subtab-page-content

  if (!isActive) {
    h += '<div class="subtab-bar-wrapper">';
    h += buildDungeonSubTabBarHTML();
    h += '</div>';
  }

  h += '</div>'; // fin .subtab-page
  return h;
}

window.buildDungeonHTML = buildDungeonHTML;

var pendingDungeonTierId = null;

function buildDungeonIntroHTML(tierId) {
  var tier = DungeonManager.getTierById(tierId);
  var rarityLabel = (typeof RARITY_LABELS !== "undefined" && RARITY_LABELS[tier.maxRarity]) || tier.maxRarity;
  var tickets = game.dungeonTickets || 0;

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card">';
  h += '    <div class="dungeon-story-icon">🏰</div>';
  h += '    <div class="dungeon-story-title">' + esc(tier.name) + '</div>';
  h += '    <div class="dungeon-story-text">' + esc(tier.story) + '</div>';
  h += buildDungeonSceauLoreHTML(tierId);
  h += '    <div class="dungeon-story-meta">🎁 Butin garanti jusqu\u2019à : <strong>' + esc(rarityLabel) + '</strong> · ⚔️ ' + DUNGEON_CONFIG.waveCount + ' vagues + boss</div>';
  h += '    <div class="dungeon-story-meta">🎟️ Tickets restants : <strong>' + tickets + '</strong>' + (tickets <= 0 ? ' · <a href="javascript:void(0)" onclick="closeDungeonIntro();openDungeonTicketOverlay();">en acheter</a>' : '') + '</div>';
  h += '    <div class="dungeon-story-actions">';
  h += '      <button class="settings-btn" type="button" onclick="closeDungeonIntro()">Annuler</button>';
  h += '      <button class="settings-btn primary" type="button" onclick="confirmDungeonStart()">Entrer</button>';
  h += '    </div>';
  h += '  </div>';
  h += '</div>';
  return h;
}

function buildDungeonSceauLoreHTML(tierId) {
  if (typeof CodexManager === "undefined") return "";
  var entry = CodexManager.getById("dungeon_tier_" + tierId);
  if (!entry) return "";
  return '    <div class="dungeon-story-lore">📖 « ' + esc(entry.text) + ' »</div>';
}

function openDungeonIntro(tierId) {
  if (!DungeonManager.isTierUnlocked(tierId)) return showToast("Palier verrouillé", 1200);
  if ((game.heroHp || 0) <= 0) return showToast("Héros à terre — repose-toi au Campement d'abord", 1600);
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
  h += '      <div class="dungeon-summary-row"><span>' + renderIconOrEmojiHTML("images/Icons/essence_icon.png", "dungeon-summary-icon", "Essence") + ' Essence</span><span>+' + formatNumber(result.essenceReward) + '</span></div>';
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

function buildDungeonTicketOverlayHTML() {
  var tickets = game.dungeonTickets || 0;
  var purchasedToday = game.dungeonTicketsPurchasedToday || 0;
  var maxPerDay = DUNGEON_CONFIG.maxTicketPurchasesPerDay || 20;
  var remainingPurchases = Math.max(0, maxPerDay - purchasedToday);
  var nextTicketCost = DungeonManager.getTicketBuyCost();
  var canBuyTicket = (game.essence || 0) >= nextTicketCost && remainingPurchases > 0;

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card">';
  h += '    <div class="dungeon-story-icon">🎟️</div>';
  h += '    <div class="dungeon-story-title">Tickets de donjon</div>';
  h += '    <div class="dungeon-story-text">1 ticket gratuit par jour, valable pour n\u2019importe quel donjon et n\u2019importe quel palier. Chaque ticket supplémentaire coûte de plus en plus cher au fil de la journée — limité à ' + maxPerDay + ' achats par jour.</div>';

  h += '    <div class="dungeon-ticket-row">';
  h += '      <span class="dungeon-ticket-count">🎟️ ' + tickets + '</span>';
  h += '      <span class="dungeon-ticket-reset">Renouvellement dans ' + esc(DungeonManager.timeUntilTicketReset()) + '</span>';
  h += '    </div>';
  h += '    <div class="dungeon-ticket-limit">Achats aujourd\u2019hui : ' + purchasedToday + ' / ' + maxPerDay + '</div>';
  h += '    <div class="dungeon-ticket-limit">Prix du prochain ticket : ' + formatNumber(nextTicketCost) + ' essence</div>';

  h += '    <div class="dungeon-story-actions">';
  h += '      <button class="settings-btn" type="button" onclick="closeDungeonTicketOverlay()">Fermer</button>';
  h += '      <button class="settings-btn primary' + (canBuyTicket ? '' : ' disabled') + '" type="button" ' + (canBuyTicket ? 'onclick="buyDungeonTicketFromOverlay()"' : 'disabled') + '>' + (remainingPurchases > 0 ? 'Acheter (' + formatNumber(nextTicketCost) + ' essence)' : 'Limite atteinte') + '</button>';
  h += '    </div>';

  h += '  </div>';
  h += '</div>';
  return h;
}

function openDungeonTicketOverlay() {
  var host = document.getElementById("dungeon-modal-root");
  if (host) host.innerHTML = buildDungeonTicketOverlayHTML();
}

function closeDungeonTicketOverlay() {
  var host = document.getElementById("dungeon-modal-root");
  if (host) host.innerHTML = "";
}

function buyDungeonTicketFromOverlay() {
  DungeonManager.buyTicket();
  openDungeonTicketOverlay();
}

window.openDungeonTicketOverlay = openDungeonTicketOverlay;
window.closeDungeonTicketOverlay = closeDungeonTicketOverlay;
window.buyDungeonTicketFromOverlay = buyDungeonTicketFromOverlay;
