"use strict";

/* ============================================================
  Vue du Shop
============================================================ */

function getUpgradePreviewMeta(upgrade) {
  if (!upgrade) {
    return { cls: "neutral", icon: "✨", label: "Bonus" };
  }

  if (upgrade.id === "u_tap") return { cls: "damage", icon: "⚔️", label: "Dégâts tap" };
  if (upgrade.id === "u_auto") return { cls: "speed", icon: "⚙️", label: "Auto DPS" };
  if (upgrade.id === "u_crit") return { cls: "crit", icon: "🎯", label: "Critique" };
  if (upgrade.id === "u_gold") return { cls: "gold", icon: "💰", label: "Or" };
  if (upgrade.id === "u_tap_mult") return { cls: "damage", icon: "💥", label: "Tap final" };
  if (upgrade.id === "u_crit_mult") return { cls: "crit", icon: "🩸", label: "Crit dmg" };
  if (upgrade.id === "u_auto_mult") return { cls: "speed", icon: "🤖", label: "Auto final" };
  if (upgrade.id === "u_bounty") return { cls: "gold", icon: "📜", label: "Boss gold" };

  return { cls: "neutral", icon: "✨", label: "Bonus" };
}

function getUpgradePreviewText(upgrade, currentLevel, nextLevel) {
  if (!upgrade) return "";

  if (upgrade.id === "u_tap") {
    return (1 + currentLevel) + " -> " + (1 + nextLevel);
  }

  if (upgrade.id === "u_auto") {
    return currentLevel + " -> " + nextLevel;
  }

  if (upgrade.id === "u_crit") {
    return (5 + currentLevel * 0.5).toFixed(1) + "% -> " + (5 + nextLevel * 0.5).toFixed(1) + "%";
  }

  if (upgrade.id === "u_gold") {
    return "x" + (1 + currentLevel * 0.03).toFixed(2) + " -> x" + (1 + nextLevel * 0.03).toFixed(2);
  }

  if (upgrade.id === "u_tap_mult") {
    return "x" + (1 + currentLevel * 0.10).toFixed(2) + " -> x" + (1 + nextLevel * 0.10).toFixed(2);
  }

  if (upgrade.id === "u_crit_mult") {
    return "x" + (2 + currentLevel * 0.10).toFixed(2) + " -> x" + (2 + nextLevel * 0.10).toFixed(2);
  }

  if (upgrade.id === "u_auto_mult") {
    return "x" + (1 + currentLevel * 0.18).toFixed(2) + " -> x" + (1 + nextLevel * 0.18).toFixed(2);
  }

  if (upgrade.id === "u_bounty") {
    return "+" + Math.round(currentLevel * 10) + "% -> +" + Math.round(nextLevel * 10) + "%";
  }

  return "";
}

function buildShopHTML() {
  var buyAmount = Number(game.shopBuyAmount || 1);
  if (![1, 10, 25, -1].includes(buyAmount)) buyAmount = 1;

  var modeLabel = buyAmount === -1 ? "MAX" : ("x" + buyAmount);


  var h = '<div class="shop-shell">';
  h += '<div class="panel-title">Boutique</div>';

  h += '<div class="shop-buy-toolbar">';
  h += '<button class="settings-btn ' + (buyAmount === 1 ? 'active' : '') + '" onclick="setShopBuyAmount(1)">x1</button>';
  h += '<button class="settings-btn ' + (buyAmount === 10 ? 'active' : '') + '" onclick="setShopBuyAmount(10)">x10</button>';
  h += '<button class="settings-btn ' + (buyAmount === 25 ? 'active' : '') + '" onclick="setShopBuyAmount(25)">x25</button>';
  h += '<button class="settings-btn ' + (buyAmount === -1 ? 'active' : '') + '" onclick="setShopBuyAmount(-1)">MAX</button>';
  h += '</div>';

  h += '<div class="shop-mode-info" style="margin:0 0 12px 0;opacity:.85;width:100%;text-align:right;">Mode d’achat : <strong>' + modeLabel + '</strong></div>';

  h += '<div class="shop-grid">';
  (UPGRADES || []).forEach(function (u) {
    var level = game.upgrades[u.id] || 0;
    var maxLevel = u.maxLevel || Infinity;
    var nextCost = getUpgradeCost(u, level);
    var maxed = level >= maxLevel;
    var locked = (WorldManager.worldIndex || 0) < (u.unlockWorld || 0);

    var preview = typeof getUpgradePurchasePreview === "function"
      ? getUpgradePurchasePreview(u, buyAmount)
      : {
          count: 0,
          totalCost: nextCost,
          currentLevel: level,
          nextLevel: level,
          reachedMax: false
        };

    var afford = !locked && !maxed && preview.count > 0;
    var targetLevelText = preview.nextLevel;
    var maxLevelText = maxLevel >= 999 ? "∞" : maxLevel;

    h += '<div class="upgrade-card ' + (afford ? 'affordable ' : '') + (locked ? 'locked' : '') + '">';
    h += '<div class="upgrade-icon">' + esc(u.icon) + '</div>';
    h += '<div class="upgrade-info">';
    h += '<div class="upgrade-name">' + esc(u.name) + '</div>';
    h += '<div class="upgrade-desc">' + esc(u.desc) + '</div>';
    h += '<div class="upgrade-level">Niv. ' + level + '/' + maxLevelText + '</div>';

    if (!locked && !maxed) {
      h += '<div class="upgrade-level" style="opacity:.85;">Après achat : ' + targetLevelText + '/' + maxLevelText + '</div>';
      var previewText = getUpgradePreviewText(u, level, preview.nextLevel);
      if (previewText) {
        h += '<div class="upgrade-preview" style="opacity:.9;font-size:12px;margin-top:4px;">' + esc(previewText) + '</div>';
      }
    }

    h += '</div>';

    if (maxed) {
      h += '<button class="upgrade-buy locked" disabled>MAX</button>';
    } else if (locked) {
      h += '<button class="upgrade-buy locked" disabled>Monde ' + ((u.unlockWorld || 0) + 1) + '</button>';
    } else {
      var label = '';
      if (preview.count > 0) {
        label = formatNumber(preview.totalCost) + ' • +' + preview.count;
      } else {
        label = formatNumber(nextCost) + ' • ' + modeLabel;
      }

      h += '<button class="upgrade-buy ' + (!afford ? 'cant-afford' : '') + '" onclick="buyUpgrade(\'' + u.id + '\', ' + buyAmount + ')">';
      h += label;
      h += '</button>';
    }

    h += '</div>';
  });

  h += '</div>'; // ferme .shop-grid
  h += '</div>'; // ferme .shop-shell

  return h;
  
}

window.buildShopHTML = buildShopHTML;