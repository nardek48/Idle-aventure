"use strict";
/* ui/dungeon-view.js — écran Donjon (v3.245.0, refonte Donjons, doc v1.1 §5) : une carte par monde, feuille basse .ksheet de
   lancement avec les Marques, carte de run actif, overlay tickets, rapport de fin. La Boutique d'éclats vit chez l'Enchanteresse
   (ui/village-building-view.js). Détail complet : COMMENTAIRES_ORIGINAUX.md */

var pendingDungeonId = null;   // donjon ouvert dans la feuille de lancement
var pendingDungeonMarks = [];  // bascules de la feuille — copiées dans game.dungeonRun.marks au start() seulement

function buildDungeonActiveHTML() {
  var dungeon = DungeonManager.getById(game.dungeonRun.dungeonId);
  var wave = game.dungeonRun.wave || 1;
  var total = DUNGEON_CONFIG.waveCount;
  var isBossWave = wave > total;
  var progressPct = Math.min(100, Math.round((Math.min(wave, total) / total) * 100));
  var marks = DungeonManager.getRunMarks();

  var h = '<div class="panel-card dungeon-active-card">';
  h += '<div class="dungeon-active-tier">' + esc(dungeon.name) + '</div>';
  h += '<div class="dungeon-wave-label">' + (isBossWave ? '<img class=ico-inline src=images/Icons/dungeon/boss_crown.png> Boss du donjon' : 'Vague ' + wave + ' / ' + total) + '</div>';
  h += '<div class="dungeon-progress-bar"><div class="dungeon-progress-fill' + (isBossWave ? ' is-boss' : '') + '" style="width:' + progressPct + '%"></div></div>';
  if (marks.length) {
    h += '<div class="dungeon-active-marks">';
    marks.forEach(function (m) { h += renderIconOrEmojiHTML(m.icon, "dungeon-active-mark-icon", m.name); });
    h += '<span>×' + DungeonManager.getMarkRewardMult(marks.length).toFixed(2).replace(/0$/, "") + '</span></div>';
  }
  h += '<p class="panel-sub">Bats-toi dans l\u2019onglet Combat. Si tes PV tombent à 0, la tentative s\u2019arrête ici (récompense réduite selon les vagues passées).</p>';
  h += '<button class="settings-btn danger" type="button" onclick="DungeonManager.forfeit()">Abandonner la tentative</button>';
  h += '</div>';
  return h;
}

/* Une carte par donjon : image 96 px à gauche (.is-full existante), monde, nom, rareté max,
   matériau annoncé, raison du verrou ou statut « Boss vaincu ». */
function buildDungeonCardHTML(dungeon) {
  var reason = DungeonManager.getLockReason(dungeon.id);
  var unlocked = reason === null;
  var heroDowned = (game.heroHp || 0) <= 0;
  var rarityLabel = (typeof RARITY_LABELS !== "undefined" && RARITY_LABELS[dungeon.maxRarity]) || dungeon.maxRarity;
  var rarityColor = (typeof RARITY_COLORS !== "undefined" && RARITY_COLORS[dungeon.maxRarity]) || "#9ca3af";
  var world = (window.WORLDS || []).find(function (w) { return w.id === dungeon.worldId; });

  var imageHTML = dungeon.icon
    ? renderIconOrEmojiHTML(dungeon.icon, "dungeon-tier-img", dungeon.name)
    : '<span class="dungeon-tier-num">' + dungeon.id + '</span>';

  var cardTag = unlocked ? 'button' : 'div';
  var cardAttrs = unlocked ? ' type="button" onclick="openDungeonSheet(' + dungeon.id + ')"' : '';

  var h = '<' + cardTag + ' class="dungeon-tier-card is-full' + (unlocked ? ' is-tappable' : ' is-locked') + (unlocked && heroDowned ? ' is-downed' : '') + '"' + cardAttrs + '>';
  h += '<div class="dungeon-tier-image">' + imageHTML
     + (unlocked ? '' : '<span class="dungeon-tier-image-lock"><img class=ico-inline src=images/Icons/system/lock_closed.png></span>')
     + (unlocked && heroDowned ? '<span class="dungeon-tier-image-lock"><img class=ico-inline src=images/Icons/camp/hero_defeated.png></span>' : '') + '</div>';
  h += '<div class="dungeon-tier-info">';
  if (world) h += '<div class="dungeon-tier-world">' + esc(world.name) + '</div>';
  h += '<div class="dungeon-tier-name">' + esc(dungeon.name) + '</div>';
  h += '<div class="dungeon-tier-rarity" style="color:' + rarityColor + '"><img class=ico-inline src=images/Icons/dungeon/dungeon_guaranteed_loot.png> ' + esc(rarityLabel) + ' max</div>';

  /* v3.223.0 : le matériau de monde est annoncé AVANT d'entrer — c'est une raison de choisir ce donjon. */
  if (dungeon.specialResourceId && dungeon.specialResourceAmount > 0) {
    var specialDef = WAREHOUSE_RESOURCES[dungeon.specialResourceId];
    if (specialDef) {
      h += '<div class="dungeon-tier-special">'
         + renderIconOrEmojiHTML(specialDef.icon, "dungeon-tier-special-icon", specialDef.name)
         + '+' + dungeon.specialResourceAmount + ' ' + esc(specialDef.name) + '</div>';
    }
  }

  if (!unlocked) {
    var lockText;
    if (reason === "data") {
      lockText = dungeon.lockedHint || "Pas encore disponible";
    } else if (reason === "world") {
      var reqWorld = (window.WORLDS && WORLDS[dungeon.worldRequired]) ? WORLDS[dungeon.worldRequired].name : null;
      lockText = reqWorld ? ('Atteins ' + esc(reqWorld) + ' pour débloquer') : 'Monde trop bas';
    } else {
      var list = DUNGEONS || [];
      var idx = list.indexOf(dungeon);
      var previous = idx > 0 ? list[idx - 1] : null;
      lockText = previous ? 'Termine ' + esc(previous.name) + ' pour débloquer' : 'Verrouillé';
    }
    h += '<div class="dungeon-tier-lock-text">' + lockText + '</div>';
  } else if (heroDowned) {
    h += '<div class="dungeon-tier-lock-text">Héros à terre — repos requis</div>';
  } else if ((game.dungeonTierCleared || {})[dungeon.id]) {
    h += '<div class="dungeon-tier-done"><img src="images/Icons/dungeon/boss_crown.png" alt=""> Boss vaincu</div>';
  }

  h += '</div>';
  h += '</' + cardTag + '>';
  return h;
}
// alias historique (harnais)
function buildDungeonTierCardHTML(dungeon) { return buildDungeonCardHTML(dungeon); }
window.buildDungeonTierCardHTML = buildDungeonTierCardHTML;

function buildDungeonTicketBadgeHTML() {
  var tickets = game.dungeonTickets || 0;
  var h = '<button type="button" class="dungeon-ticket-badge" onclick="openDungeonTicketOverlay()">';
  h += '<span class="dungeon-ticket-badge-icon"><img class=ico-inline src=images/Icons/dungeon/dungeon_ticket.png></span>';
  h += '<span class="dungeon-ticket-badge-label">Achat de ticket</span>';
  h += '<span class="dungeon-ticket-badge-count kbadge kbadge-round"><span>' + tickets + '</span></span>';
  h += '</button>';
  return h;
}

function buildDungeonLobbyHTML() {
  var h = buildDungeonTicketBadgeHTML();
  h += '<div class="dungeon-list">';
  (DUNGEONS || []).forEach(function (dungeon) { h += buildDungeonCardHTML(dungeon); });
  h += '</div>';
  return '<div class="nb-page-frame nb-page-frame-fill kframe-page" data-kf-title="images/Icons/subtabs/dungeon.png|Donjon">' + h + '</div>'; // v2.83.28
}

function buildDungeonHTML() {
  if (window.DungeonManager && typeof DungeonManager.checkTicketReset === "function") {
    DungeonManager.checkTicketReset();
  }
  var isActive = !!(game.dungeonRun && game.dungeonRun.active);
  // v3.245.0 : plus de sous-onglets (la Boutique est chez l'Enchanteresse) — .subtab-page conservé pour le scroll
  var h = '<div class="subtab-page">';
  h += '<div class="subtab-page-content">';
  h += isActive ? buildDungeonActiveHTML() : buildDungeonLobbyHTML();
  h += '</div>';
  h += '</div>';
  return h;
}
window.buildDungeonHTML = buildDungeonHTML;

/* ---------- Feuille de lancement (.ksheet) ---------- */
function buildDungeonSceauLoreHTML(dungeonId) {
  if (typeof CodexManager === "undefined") return "";
  var entry = CodexManager.getById("dungeon_tier_" + dungeonId);
  if (!entry) return "";
  return '<div class="dsheet-lore">« ' + esc(entry.text) + ' »</div>';
}

function buildDungeonSheetHTML(dungeonId) {
  var dungeon = DungeonManager.getById(dungeonId);
  var world = (window.WORLDS || []).find(function (w) { return w.id === dungeon.worldId; });
  var rarityLabel = (typeof RARITY_LABELS !== "undefined" && RARITY_LABELS[dungeon.maxRarity]) || dungeon.maxRarity;
  var rarityColor = (typeof RARITY_COLORS !== "undefined" && RARITY_COLORS[dungeon.maxRarity]) || "#9ca3af";
  var tickets = game.dungeonTickets || 0;
  var n = pendingDungeonMarks.length;
  var maxMarks = DUNGEON_CONFIG.maxMarks || 3;
  var mult = DungeonManager.getMarkRewardMult(n);
  var storyFree = typeof DungeonManager.isStoryTicketFree === "function" && DungeonManager.isStoryTicketFree(dungeon.id);

  var h = '<div class="ksheet-backdrop" onclick="closeDungeonSheet()"></div>';
  h += '<div class="ksheet dungeon-sheet"><div class="ksheet-handle"></div>';
  h += '<div class="ksheet-title">' + renderIconOrEmojiHTML(dungeon.icon || "images/Icons/subtabs/dungeon.png", "", dungeon.name) + '<span>' + esc(dungeon.name) + '</span></div>';
  h += '<div class="dsheet-sub">' + (world ? esc(world.name) + ' · ' : '') + DUNGEON_CONFIG.waveCount + ' vagues + boss · <span style="color:' + rarityColor + ';font-weight:800">' + esc(rarityLabel) + '</span> max</div>';
  h += '<div class="ksheet-body">';
  if (dungeon.story) h += '<div class="dsheet-story">' + esc(dungeon.story) + '</div>';
  h += buildDungeonSceauLoreHTML(dungeon.id);

  h += '<div class="dsheet-marks-title"><span>Marques</span><span>' + n + ' / ' + maxMarks + '</span></div>';
  (DUNGEON_MARKS || []).forEach(function (m) {
    var on = pendingDungeonMarks.indexOf(m.id) !== -1;
    var ok = DungeonManager.isMarkUnlocked(m.id, dungeon.id);
    h += '<button type="button" class="dmark' + (on ? ' is-on' : '') + (ok ? '' : ' is-locked') + '" onclick="toggleDungeonMark(\'' + esc(m.id) + '\')">';
    h += renderIconOrEmojiHTML(m.icon, "dmark-img", m.name);
    h += '<span class="dmark-body"><span class="dmark-name">' + esc(m.name) + '</span><br><span class="dmark-desc">' + (ok ? esc(m.desc) : 'Termine ce donjon une fois') + '</span></span>';
    h += '<span class="dmark-state"></span></button>';
  });

  /* Récompense projetée : la raison d'être des Marques, visible sans dérouler. */
  h += '<div class="dsheet-reward"><span>Récompenses <strong>×' + mult.toFixed(2).replace(/0$/, "") + '</strong></span>';
  var specialDef = dungeon.specialResourceId ? WAREHOUSE_RESOURCES[dungeon.specialResourceId] : null;
  if (specialDef && dungeon.specialResourceAmount > 0) {
    h += '<span>' + renderIconOrEmojiHTML(specialDef.icon, "dsheet-reward-icon", specialDef.name) + ' ' + esc(specialDef.name) + ' <strong>+' + DungeonManager.getSpecialAmount(dungeon, n) + '</strong></span>';
  } else {
    h += '<span><img class=ico-inline src=images/Icons/subtabs/shard_shop.png> Éclats <strong>+' + (DUNGEON_CONFIG.waveCount + DUNGEON_CONFIG.shardsBossBonus) + '</strong></span>';
  }
  h += '</div>';

  /* v3.247.0 : pronostic du BOSS du donjon, Marques comprises. buildWaveEnemy lit
     game.dungeonRun.dungeonId : on le pose le temps du calcul (le run n'est pas actif,
     start() le réécrira de toute façon) et on restaure ensuite. */
  if (window.CombatForecast && window.DungeonManager) {
    var savedRun = game.dungeonRun;
    try {
      game.dungeonRun = { active: true, wave: 0, dungeonId: dungeon.id, marks: pendingDungeonMarks.slice() };
      var bossPreview = DungeonManager.buildWaveEnemy(DUNGEON_CONFIG.waveCount + 1);
      game.dungeonRun = savedRun;
      var f = CombatForecast.forEnemy(bossPreview);
      if (f) h += buildCombatForecastLineHTML(f);
    } catch (e) { game.dungeonRun = savedRun; }
  }

  if (storyFree) {
    h += '<div class="dsheet-ticket"><img class=ico-inline src=images/Icons/dungeon/dungeon_ticket.png> <strong>Entrée offerte</strong> — les braises te guident, aucun ticket consommé</div>';
  } else {
    h += '<div class="dsheet-ticket"><img class=ico-inline src=images/Icons/dungeon/dungeon_ticket.png> Tickets restants : <strong>' + tickets + '</strong>'
       + (tickets <= 0 ? ' · <a href="javascript:void(0)" onclick="closeDungeonSheet();openDungeonTicketOverlay();">en acheter</a>' : '') + '</div>';
  }
  // v3.330.1 : vivres de sortie (donjon déjà fini une fois)
  var dDef = (window.DUNGEONS || []).filter(function (x) { return x.id === Number(dungeonId); })[0];
  if (window.ProvisionsManager && dDef) h += ProvisionsManager.buildLineHTML("dungeon", dDef);
  h += '</div>'; // ksheet-body
  h += '<button type="button" class="ksheet-close" onclick="confirmDungeonStart()">Entrer</button>';
  h += '</div>';
  return h;
}

function renderDungeonSheet() {
  var host = document.getElementById("dungeon-modal-root");
  if (host && pendingDungeonId != null) host.innerHTML = buildDungeonSheetHTML(pendingDungeonId);
}

function openDungeonSheet(dungeonId) {
  if (!DungeonManager.isUnlocked(dungeonId)) return showToast("Donjon verrouillé", 1200);
  if ((game.heroHp || 0) <= 0) return showToast("Héros à terre — repose-toi au Campement d'abord", 1600);
  var storyFree = typeof DungeonManager.isStoryTicketFree === "function" && DungeonManager.isStoryTicketFree(dungeonId);
  if (!storyFree && (game.dungeonTickets || 0) <= 0) return showToast("Aucun ticket de donjon", 1200);
  pendingDungeonId = Number(dungeonId);
  pendingDungeonMarks = [];
  renderDungeonSheet();
}
// alias historique
function openDungeonIntro(dungeonId) { return openDungeonSheet(dungeonId); }

function closeDungeonSheet() {
  pendingDungeonId = null;
  pendingDungeonMarks = [];
  var host = document.getElementById("dungeon-modal-root");
  if (host) host.innerHTML = "";
}
function closeDungeonIntro() { return closeDungeonSheet(); }

function toggleDungeonMark(markId) {
  if (pendingDungeonId == null) return;
  if (!DungeonManager.isMarkUnlocked(markId, pendingDungeonId)) return;
  var i = pendingDungeonMarks.indexOf(markId);
  if (i !== -1) pendingDungeonMarks.splice(i, 1);
  else if (pendingDungeonMarks.length >= (DUNGEON_CONFIG.maxMarks || 3)) return showToast((DUNGEON_CONFIG.maxMarks || 3) + " Marques au plus", 1200);
  else pendingDungeonMarks.push(markId);
  renderDungeonSheet();
}

function confirmDungeonStart() {
  var id = pendingDungeonId;
  var marks = pendingDungeonMarks.slice();
  closeDungeonSheet();
  if (id != null) DungeonManager.start(id, marks);
}

/* ---------- Rapport de fin ---------- */
function buildDungeonSummaryHTML(result) {
  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card' + (result.success ? ' is-success' : ' is-failure') + '">';
  h += '    <div class="dungeon-story-icon">' + (result.success ? '<img class=ico-inline src=images/Icons/scene/final_reward.png>' : '<img class=ico-inline src=images/Icons/subtabs/dungeon.png>') + '</div>';
  h += '    <div class="dungeon-story-title">' + esc(result.tierName) + (result.success ? ' terminé !' : ' interrompu') + '</div>';
  h += '    <div class="dungeon-story-text">' + (result.success
    ? 'Le boss s\u2019effondre. La salle retrouve son calme — pour cette fois.'
    : 'La tentative s\u2019arrête à la vague ' + result.clearedWave + ' sur ' + result.wavesTotal + '. Tu récupères quand même quelque chose avant de te replier.') + '</div>';

  h += '    <div class="dungeon-summary-rewards">';
  h += '      <div class="dungeon-summary-row"><span>Vagues passées</span><span>' + Math.min(result.clearedWave, result.wavesTotal) + ' / ' + result.wavesTotal + (result.success ? ' + Boss' : '') + '</span></div>';
  if (result.marks && result.marks.length) {
    var names = result.marks.map(function (id) { var m = DungeonManager.getMark(id); return m ? m.name : id; }).join(", ");
    h += '      <div class="dungeon-summary-row"><span>Marques</span><span>×' + Number(result.markMult || 1).toFixed(2).replace(/0$/, "") + ' · ' + esc(names) + '</span></div>';
  }
  h += '      <div class="dungeon-summary-row"><span><img class=ico-inline src=images/Icons/gold_icon.png> Or</span><span>+' + formatNumber(result.goldReward) + '</span></div>';
  h += '      <div class="dungeon-summary-row"><span>' + renderIconOrEmojiHTML("images/Icons/essence_icon.png", "dungeon-summary-icon", "Essence") + ' Essence</span><span>+' + formatNumber(result.essenceReward) + '</span></div>';
  h += '      <div class="dungeon-summary-row"><span><img class=ico-inline src=images/Icons/subtabs/shard_shop.png> Éclats</span><span>+' + formatNumber(result.shardsGained) + '</span></div>';
  if (result.specialGained > 0 && result.specialName) {
    h += '      <div class="dungeon-summary-row"><span><img class=ico-inline src=images/Icons/scene/path_easy.png> ' + esc(result.specialName) + '</span><span>+' + result.specialGained + '</span></div>';
  }
  if (result.lootedItem) {
    h += '      <div class="dungeon-summary-row dungeon-summary-loot"><span><img class=ico-inline src=images/Icons/dungeon/dungeon_guaranteed_loot.png> Butin</span><span>' + esc(result.lootedItem.name) + '</span></div>';
  }
  h += '    </div>';
  // v3.245.0 : les éclats se dépensent chez l'Enchanteresse
  h += '    <div class="dungeon-story-meta"><img class=ico-inline src=images/Icons/subtabs/shard_shop.png> Les Éclats se dépensent chez l\u2019Enchanteresse, au Village.</div>';
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

window.openDungeonSheet = openDungeonSheet;
window.closeDungeonSheet = closeDungeonSheet;
window.toggleDungeonMark = toggleDungeonMark;
window.openDungeonIntro = openDungeonIntro;
window.closeDungeonIntro = closeDungeonIntro;
window.confirmDungeonStart = confirmDungeonStart;
window.openDungeonSummary = openDungeonSummary;
window.closeDungeonSummary = closeDungeonSummary;

/* ---------- Tickets (inchangé) ---------- */
function buildDungeonTicketOverlayHTML() {
  var tickets = game.dungeonTickets || 0;
  var purchasedToday = game.dungeonTicketsPurchasedToday || 0;
  var maxPerDay = DUNGEON_CONFIG.maxTicketPurchasesPerDay || 20;
  var remainingPurchases = Math.max(0, maxPerDay - purchasedToday);
  var nextTicketCost = DungeonManager.getTicketBuyCost();
  var canBuyTicket = (game.essence || 0) >= nextTicketCost && remainingPurchases > 0;

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu dungeon-story-card">';
  h += '    <div class="dungeon-story-icon"><img class=ico-inline src=images/Icons/dungeon/dungeon_ticket.png></div>';
  h += '    <div class="dungeon-story-title">Tickets de donjon</div>';
  h += '    <div class="dungeon-story-text">1 ticket gratuit par jour, valable pour n\u2019importe quel donjon. Chaque ticket supplémentaire coûte de plus en plus cher au fil de la journée — limité à ' + maxPerDay + ' achats par jour.</div>';
  h += '    <div class="dungeon-ticket-row">';
  h += '      <span class="dungeon-ticket-count"><img class=ico-inline src=images/Icons/dungeon/dungeon_ticket.png> ' + tickets + '</span>';
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
