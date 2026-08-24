"use strict";
/* ui/shop-view.js — écran Boutique, sous-onglets Économie (upgrades or)/Potions. Duplique volontairement les coeffs stats-system.js pour preview "avant→après". Détail : COMMENTAIRES_ORIGINAUX.md */

var activeShopSubTab = "upgrades";

function setShopSubTab(tab) {
  if (tab === "potions") activeShopSubTab = "potions";
  else activeShopSubTab = "upgrades";
  if (typeof renderPanel === "function") renderPanel();
}

function getUpgradePreviewMeta(upgrade) {
  if (!upgrade) return { cls: "neutral", icon: "", label: "Bonus" };

  if (upgrade.id === "utrain_power") return { cls: "damage", icon: "💪", label: "Force" };
  if (upgrade.id === "utrain_celerity") return { cls: "speed", icon: "⚡", label: "Célérité" };
  if (upgrade.id === "utrain_precision") return { cls: "crit", icon: "🎯", label: "Précision" };
  if (upgrade.id === "utrain_will") return { cls: "crit", icon: "✨", label: "Volonté" };
  if (upgrade.id === "utrain_endurance") return { cls: "tank", icon: "🛡️", label: "Endurance" };

  if (upgrade.id === "u_gold") return { cls: "gold", icon: "💰", label: "Or" };
  if (upgrade.id === "u_bounty") return { cls: "gold", icon: "📜", label: "Boss gold" };

  return { cls: "neutral", icon: "", label: "Bonus" };
}

function getUpgradePreviewText(upgrade, currentLevel, nextLevel) {
  if (!upgrade) return "";

  currentLevel = Number.isFinite(Number(currentLevel)) ? Number(currentLevel) : 0;
  nextLevel = Number.isFinite(Number(nextLevel)) ? Number(nextLevel) : (currentLevel + 1);

  var hero = typeof getSelectedHero === "function" ? getSelectedHero() : null;
  var heroStats = hero && hero.stats ? hero.stats : null;

  var basePower = heroStats ? Number(heroStats.power) || 0 : 0;
  var baseCelerity = heroStats ? Number(heroStats.celerity) || 0 : 0;
  var basePrecision = heroStats ? Number(heroStats.precision) || 0 : 0;
  var baseWill = heroStats ? Number(heroStats.will) || 0 : 0;
  var baseEndurance = heroStats ? Number(heroStats.endurance) || 0 : 0;

  var trainedPower = (game.trainedStats && game.trainedStats.power) || 0;
  var trainedCelerity = (game.trainedStats && game.trainedStats.celerity) || 0;
  var trainedPrecision = (game.trainedStats && game.trainedStats.precision) || 0;
  var trainedWill = (game.trainedStats && game.trainedStats.will) || 0;
  var trainedEndurance = (game.trainedStats && game.trainedStats.endurance) || 0;

  var baseCritChance = 5;
  var baseCritMult = 2;
  var baseTap = 1;

  if (upgrade.id === "utrain_power") {
    var FORCE_TAP_COEF = 0.2;
    var currentPower = basePower + trainedPower;
    var nextPower = currentPower + (nextLevel - currentLevel);
    var currentDmg = (baseTap + currentPower * FORCE_TAP_COEF).toFixed(1);
    var nextDmg = (baseTap + nextPower * FORCE_TAP_COEF).toFixed(1);
    return "Force " + currentPower + " → " + nextPower + "  (+" + currentDmg + " → +" + nextDmg + " dgts)";
  }

  if (upgrade.id === "utrain_celerity") {
    var CELERITY_DPS_COEF = 0.03;
    var currentCel = baseCelerity + trainedCelerity;
    var nextCel = currentCel + (nextLevel - currentLevel);
    var currentDps = (currentCel * CELERITY_DPS_COEF).toFixed(1);
    var nextDps = (nextCel * CELERITY_DPS_COEF).toFixed(1);
    return "Célérité " + currentCel + " → " + nextCel + "  (+" + currentDps + " → +" + nextDps + " DPS)";
  }

  if (upgrade.id === "utrain_precision") {
    var PRECISION_CRIT_COEF = 0.06;
    var currentCritStat = basePrecision + trainedPrecision;
    var nextCritStat = currentCritStat + (nextLevel - currentLevel);
    var currentCrit = (baseCritChance + currentCritStat * PRECISION_CRIT_COEF).toFixed(1);
    var nextCrit = (baseCritChance + nextCritStat * PRECISION_CRIT_COEF).toFixed(1);
    return "Précision " + currentCritStat + " → " + nextCritStat + "  (" + currentCrit + "% → " + nextCrit + "%)";
  }

  if (upgrade.id === "utrain_endurance") {
    var ENDURANCE_HP_COEF = 6;
    var currentEndurance = baseEndurance + trainedEndurance;
    var nextEndurance = currentEndurance + (nextLevel - currentLevel);
    var currentHp = Math.floor(currentEndurance * ENDURANCE_HP_COEF);
    var nextHp = Math.floor(nextEndurance * ENDURANCE_HP_COEF);
    return "Endurance " + currentEndurance + " → " + nextEndurance + "  (+" + currentHp + " → +" + nextHp + " PV)";
  }

  if (upgrade.id === "utrain_will") {
    var WILL_CRIT_MULT_COEF = 0.01;
    var currentWillStat = baseWill + trainedWill;
    var nextWillStat = currentWillStat + (nextLevel - currentLevel);
    var currentWill = (baseCritMult + currentWillStat * WILL_CRIT_MULT_COEF).toFixed(2);
    var nextWill = (baseCritMult + nextWillStat * WILL_CRIT_MULT_COEF).toFixed(2);
    return "Volonté " + currentWillStat + " → " + nextWillStat + "  (x" + currentWill + " → x" + nextWill + ")";
  }

  if (upgrade.id === "u_gold") {
    var currentGold = (1 + currentLevel * 0.03).toFixed(2);
    var nextGold = (1 + nextLevel * 0.03).toFixed(2);
    return "Or x" + currentGold + " → x" + nextGold;
  }

  if (upgrade.id === "u_bounty") {
    var currentBoss = Math.round(currentLevel * 10);
    var nextBoss = Math.round(nextLevel * 10);
    return "Or boss +" + currentBoss + "% → +" + nextBoss + "%";
  }

  return "";
}

function buildUpgradeCardHTML(u, buyAmount) {
  var level     = game.upgrades[u.id] || 0;
  var maxLevel  = u.maxLevel || Infinity;
  var nextCost  = getUpgradeCost(u, level);
  var maxed     = level >= maxLevel;
  var locked    = (WorldManager.worldIndex || 0) < (u.unlockWorld || 0);

  var canBuy        = !locked && !maxed;
  var buyAmountLocal = canBuy ? buyAmount : 0;
  var modeLabel      = buyAmount === -1 ? "MAX" : ("x" + buyAmount);

  var preview = typeof getUpgradePurchasePreview === "function"
    ? getUpgradePurchasePreview(u, buyAmountLocal)
    : {
        count: 0,
        totalCost: nextCost,
        currentLevel: level,
        nextLevel: level,
        reachedMax: false
      };

  var afford         = canBuy && preview.count > 0;
  var targetLevelText = canBuy ? preview.nextLevel : level;
  var maxLevelText    = maxLevel >= 999 ? "∞" : maxLevel;
  var levelPct        = maxLevel > 0 && maxLevel !== Infinity ? (level / maxLevel) * 100 : 0;

  var h  = '<div class="nb-purchase-card ' + (afford ? 'affordable ' : '') + (locked ? 'locked' : '') + '">';

  h += '<div class="nb-purchase-icon-col"><div class="nb-purchase-icon-slot">';
    if (u.icon) {
      h += renderIconOrEmojiHTML(u.icon, "nb-purchase-icon", u.name);
    }
  h += '</div></div>';

  h += '<div class="nb-purchase-info-col">';
    h += '<div class="nb-purchase-name">' + esc(u.name) + '</div>';
    h += '<div class="nb-purchase-desc">' + esc(u.desc) + '</div>';

    h += '<div class="nb-purchase-level-row">';
      h += '<div class="nb-purchase-level-badge">' + esc(level) + '</div>';
      h += '<div class="nb-purchase-level-bar">';
        h += '<div class="nb-purchase-level-fill" style="width:' + levelPct + '%;"></div>';
        h += '<span class="nb-purchase-level-text">' + esc(level) + ' / ' + esc(maxLevelText) + '</span>';
      h += '</div>';
    h += '</div>';

    //    if (canBuy) {
    //      var previewText = getUpgradePreviewText(u, level, preview.nextLevel);
    //        h += '<div class="upgrade-preview" style="opacity:.9;font-size:12px;margin-top:4px;">' + esc(previewText) + '</div>';
    //      }
    //    }
  h += '</div>'; // /nb-purchase-info-col

  h += '<div class="nb-purchase-buy-col">';

    h += '<div class="nb-purchase-buy-label">COÛT</div>';

    if (maxed) {
      h += '<button class="btn-buy locked" disabled>MAX</button>';
    } else if (locked) {
      h += '<button class="btn-buy locked" disabled>Monde ' + ((u.unlockWorld || 0) + 1) + '</button>';
    } else {
      var label = '';

      if (afford) {
        label = formatNumber(preview.totalCost);
      } else {
        label = formatNumber(nextCost);
      }

      if (afford) {
        h += '<button class="btn-buy" onclick="buyUpgrade(\'' + u.id + '\', ' + buyAmount + ')">';
          h += '<img class="btn-buy-icon" src="images/Icons/gold_icon.png" alt="">';
          h += '<span class="upgrade-buy-price">' + label + '</span>';
        h += '</button>';
      } else {
        h += '<button class="btn-buy cant-afford" disabled>';
          h += '<img class="btn-buy-icon" src="images/Icons/gold_icon.png" alt="">';
          h += '<span class="upgrade-buy-price">' + label + '</span>';
        h += '</button>';
      }
    }

    h += '<div class="nb-purchase-buy-label">' + (buyAmount === -1 && afford ? "x" + esc(preview.count) : esc(modeLabel)) + '</div>';

  h += '</div>'; // /nb-purchase-buy-col

  h += '</div>'; // /upgrade-card

  return h;
}

function buildShopSubTabBarHTML() {
  var h = '<div class="pc-subtab-bar">';
  h += '<button type="button" class="pc-subtab-btn' + (activeShopSubTab === "upgrades" ? ' is-active' : '') + '" onclick="setShopSubTab(\'upgrades\')">💰<span>Économie</span></button>';
  h += '<button type="button" class="pc-subtab-btn' + (activeShopSubTab === "potions" ? ' is-active' : '') + '" onclick="setShopSubTab(\'potions\')">🧪<span>Potions</span></button>';
  h += '</div>';
  return h;
}

function buildShopHTML() {
  var buyAmount = Number(game.shopBuyAmount || 1);
  if (![1, 10, 25, -1].includes(buyAmount)) buyAmount = 1;

  var modeLabel = buyAmount === -1 ? "MAX" : ("x" + buyAmount);

  var h = '<div class="subtab-page">';
  h += '<div class="subtab-page-content">';
  h += '<div class="nb-page-frame nb-page-frame-fill">'; // v2.83.44 : ouverte ici (pas ré-enveloppée après coup, voir CHANGELOG)

  if (activeShopSubTab === "potions") {
    h += typeof buildPotionShopHTML === "function" ? buildPotionShopHTML() : "";
  } else {
    h += '<div class="shop-buy-toolbar">';
    h += '<button class="settings-btn ' + (buyAmount === 1 ? 'active' : '') + '" onclick="setShopBuyAmount(1)">x1</button>';
    h += '<button class="settings-btn ' + (buyAmount === 10 ? 'active' : '') + '" onclick="setShopBuyAmount(10)">x10</button>';
    h += '<button class="settings-btn ' + (buyAmount === 25 ? 'active' : '') + '" onclick="setShopBuyAmount(25)">x25</button>';
    h += '<button class="settings-btn ' + (buyAmount === -1 ? 'active' : '') + '" onclick="setShopBuyAmount(-1)">MAX</button>';
    h += '</div>';

    h += '<div class="shop-mode-info" style="margin:0 0 12px 0;opacity:.85;width:100%;text-align:right;">Mode d’achat : <strong>' + modeLabel + '</strong></div>';

    h += '<div class="shop-grid">';
    (UPGRADES || []).forEach(function (u) {
      if (typeof HEROS_TRAINING_UPGRADE_IDS !== "undefined" && HEROS_TRAINING_UPGRADE_IDS.indexOf(u.id) !== -1) return;
      h += buildUpgradeCardHTML(u, buyAmount);
    });
    h += '</div>';
  }

  h += '</div>'; // fin .nb-page-frame

  h += '</div>'; // fin .subtab-page-content

  h += '<div class="subtab-bar-wrapper">';
  h += buildShopSubTabBarHTML();
  h += '</div>';

  h += '</div>'; // fin .subtab-page

  return h;
  
}

window.buildShopHTML = buildShopHTML;
window.setShopSubTab = setShopSubTab;
window.buildUpgradeCardHTML = buildUpgradeCardHTML;