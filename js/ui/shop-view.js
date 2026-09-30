"use strict";
/* ui/shop-view.js — écran Boutique, sous-onglets Économie (upgrades or)/Potions. Duplique volontairement les coeffs stats-system.js pour preview "avant→après". Détail : COMMENTAIRES_ORIGINAUX.md */

var activeShopSubTab = "potions"; // v3.313.0 : l'Économie est vide depuis le retrait de la Bourse et des Contrats

/* v3.313.0 : améliorations d'or vendues à la Boutique (hors entraînements, achetés dans Héros). */
function shopHasEconomyUpgrades() {
  return (UPGRADES || []).some(function (u) {
    return !(typeof HEROS_TRAINING_UPGRADE_IDS !== "undefined" && HEROS_TRAINING_UPGRADE_IDS.indexOf(u.id) !== -1);
  });
}

function setShopSubTab(tab) {
  if (tab === "potions" || !shopHasEconomyUpgrades()) activeShopSubTab = "potions";
  else activeShopSubTab = "upgrades";
  if (typeof renderPanel === "function") renderPanel();
}

function getUpgradePreviewMeta(upgrade) {
  if (!upgrade) return { cls: "neutral", icon: "", label: _t("Bonus", "catégorie boutique") };

  if (upgrade.id === "utrain_power") return { cls: "damage", icon: "images/Icons/improvement_icons/power.png", label: _t("Force", "catégorie boutique") };
  if (upgrade.id === "utrain_celerity") return { cls: "speed", icon: "images/Icons/combat_stats/stat_speed.png", label: _t("Célérité", "catégorie boutique") };
  if (upgrade.id === "utrain_precision") return { cls: "crit", icon: "images/Icons/combat_stats/stat_critical.png", label: _t("Précision", "catégorie boutique") };
  if (upgrade.id === "utrain_will") return { cls: "crit", icon: "images/Icons/scene/node_discovery.png", label: _t("Volonté", "catégorie boutique") };
  if (upgrade.id === "utrain_endurance") return { cls: "tank", icon: "images/Icons/combat_stats/stat_defense.png", label: _t("Endurance", "catégorie boutique") };

  if (upgrade.id === "u_gold") return { cls: "gold", icon: "images/Icons/gold_icon.png", label: _t("Or", "catégorie boutique") };
  if (upgrade.id === "u_bounty") return { cls: "gold", icon: "images/Icons/quests/quest_story.png", label: _t("Boss gold", "catégorie boutique") };

  return { cls: "neutral", icon: "", label: _t("Bonus", "catégorie boutique") };
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
    return _t("Force {a} → {b}  (+{c} → +{d} dgts)", { a: currentPower, b: nextPower, c: currentDmg, d: nextDmg });
  }

  if (upgrade.id === "utrain_celerity") {
    var CELERITY_DPS_COEF = 0.03;
    var currentCel = baseCelerity + trainedCelerity;
    var nextCel = currentCel + (nextLevel - currentLevel);
    var currentDps = (currentCel * CELERITY_DPS_COEF).toFixed(1);
    var nextDps = (nextCel * CELERITY_DPS_COEF).toFixed(1);
    return _t("Célérité {a} → {b}  (+{c} → +{d} DPS)", { a: currentCel, b: nextCel, c: currentDps, d: nextDps });
  }

  if (upgrade.id === "utrain_precision") {
    var PRECISION_CRIT_COEF = 0.06;
    var currentCritStat = basePrecision + trainedPrecision;
    var nextCritStat = currentCritStat + (nextLevel - currentLevel);
    var currentCrit = (baseCritChance + currentCritStat * PRECISION_CRIT_COEF).toFixed(1);
    var nextCrit = (baseCritChance + nextCritStat * PRECISION_CRIT_COEF).toFixed(1);
    return _t("Précision {a} → {b}  ({c}% → {d}%)", { a: currentCritStat, b: nextCritStat, c: currentCrit, d: nextCrit });
  }

  if (upgrade.id === "utrain_endurance") {
    var ENDURANCE_HP_COEF = 6;
    var currentEndurance = baseEndurance + trainedEndurance;
    var nextEndurance = currentEndurance + (nextLevel - currentLevel);
    var currentHp = Math.floor(currentEndurance * ENDURANCE_HP_COEF);
    var nextHp = Math.floor(nextEndurance * ENDURANCE_HP_COEF);
    return _t("Endurance {a} → {b}  (+{c} → +{d} PV)", { a: currentEndurance, b: nextEndurance, c: currentHp, d: nextHp });
  }

  if (upgrade.id === "utrain_will") {
    var WILL_CRIT_MULT_COEF = 0.01;
    var currentWillStat = baseWill + trainedWill;
    var nextWillStat = currentWillStat + (nextLevel - currentLevel);
    var currentWill = (baseCritMult + currentWillStat * WILL_CRIT_MULT_COEF).toFixed(2);
    var nextWill = (baseCritMult + nextWillStat * WILL_CRIT_MULT_COEF).toFixed(2);
    return _t("Volonté {a} → {b}  (x{c} → x{d})", { a: currentWillStat, b: nextWillStat, c: currentWill, d: nextWill });
  }

  if (upgrade.id === "u_gold") {
    var currentGold = (1 + currentLevel * 0.03).toFixed(2);
    var nextGold = (1 + nextLevel * 0.03).toFixed(2);
    return _t("Or x{a} → x{b}", { a: currentGold, b: nextGold });
  }

  if (upgrade.id === "u_bounty") {
    var currentBoss = Math.round(currentLevel * 10);
    var nextBoss = Math.round(nextLevel * 10);
    return _t("Or boss +{a}% → +{b}%", { a: currentBoss, b: nextBoss });
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
      h += renderIconOrEmojiHTML(u.icon, "nb-purchase-icon", _td(u.name));
    }
  h += '</div></div>';

  h += '<div class="nb-purchase-info-col">';
    h += '<div class="nb-purchase-name">' + esc(_td(u.name)) + '</div>';
    h += '<div class="nb-purchase-desc">' + esc(_td(u.desc)) + '</div>';

    h += '<div class="nb-purchase-level-row">';
      h += '<div class="nb-purchase-level-badge kbadge kbadge-shield"><span>' + esc(level) + '</span></div>';
      // v3.173.0 : jauge fine du kit (la classe locale ne garde que flex:1).
      h += '<div class="nb-purchase-level-bar kgauge kgauge-thin kgauge-xp">';
        h += '<div class="kgauge-track"><div class="kgauge-fill" style="width:' + levelPct + '%;"></div></div>';
        h += '<span class="kgauge-text">' + esc(level) + ' / ' + esc(maxLevelText) + '</span>';
      h += '</div>';
    h += '</div>';

    //    if (canBuy) {
    //      var previewText = getUpgradePreviewText(u, level, preview.nextLevel);
    //        h += '<div class="upgrade-preview" style="opacity:.9;font-size:12px;margin-top:4px;">' + esc(previewText) + '</div>';
    //      }
    //    }
  h += '</div>'; // /nb-purchase-info-col

  h += '<div class="nb-purchase-buy-col">';

    h += '<div class="nb-purchase-buy-label">' + _t("COÛT") + '</div>';

    if (maxed) {
      h += '<button class="btn-buy kbuy locked" disabled>' + _t("MAX") + '</button>';
    } else if (locked) {
      h += '<button class="btn-buy kbuy locked" disabled>' + _t("Monde {n}", { n: (u.unlockWorld || 0) + 1 }) + '</button>';
    } else {
      var label = '';

      if (afford) {
        label = formatNumber(preview.totalCost);
      } else {
        label = formatNumber(nextCost);
      }

      if (afford) {
        h += '<button class="btn-buy kbuy" onclick="buyUpgrade(\'' + u.id + '\', ' + buyAmount + ')">';
          h += '<img class="btn-buy-icon" src="images/Icons/gold_icon.png" alt="">';
          h += '<span class="upgrade-buy-price">' + label + '</span>';
        h += '</button>';
      } else {
        h += '<button class="btn-buy kbuy cant-afford" disabled>';
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
  if (!shopHasEconomyUpgrades()) return ""; // v3.313.0 : un seul sous-onglet, pas de barre
  var h = '<div class="pc-subtab-bar">';
  h += '<button type="button" class="pc-subtab-btn' + (activeShopSubTab === "upgrades" ? ' is-active' : '') + '" onclick="setShopSubTab(\'upgrades\')"><img class="pc-subtab-ico" src="images/Icons/subtabs/economy.png" alt=""><span>' + _t("Économie") + '</span></button>';
  h += '<button type="button" class="pc-subtab-btn' + (activeShopSubTab === "potions" ? ' is-active' : '') + '" onclick="setShopSubTab(\'potions\')"><img class="pc-subtab-ico" src="images/Icons/subtabs/potions.png" alt=""><span>' + _t("Potions") + '</span></button>';
  h += '</div>';
  return h;
}

function buildShopHTML() {
  var buyAmount = Number(game.shopBuyAmount || 1);
  if (![1, 10, 25, -1].includes(buyAmount)) buyAmount = 1;

  var modeLabel = buyAmount === -1 ? _t("MAX") : ("x" + buyAmount);

  var h = '<div class="subtab-page">';
  h += '<div class="subtab-page-content">';
  if (!shopHasEconomyUpgrades()) activeShopSubTab = "potions"; // v3.313.0
  // v3.194.0 (Seb) : le bandeau suit le sous-onglet actif.
  var kfTitle = activeShopSubTab === "potions" ? _t("Potions") : _t("Économie");
  h += '<div class="nb-page-frame nb-page-frame-fill kframe-page" data-kf-title="' + kfTitle + '">'; // v2.83.44 : ouverte ici (pas ré-enveloppée après coup, voir CHANGELOG)

  if (activeShopSubTab === "potions") {
    h += typeof buildPotionShopHTML === "function" ? buildPotionShopHTML() : "";
  } else {
    // v3.402.0 (lot B-1) : quantité d'achat = rail du kit (.kseg)
    h += '<div class="kseg shop-buy-toolbar">';
    [[1, "×1"], [10, "×10"], [25, "×25"], [-1, _t("MAX")]].forEach(function (b) {
      h += '<button type="button" class="' + (buyAmount === b[0] ? 'is-on' : '') + '" onclick="setShopBuyAmount(' + b[0] + ')">' + b[1] + '</button>';
    });
    h += '</div>';

    h += '<div class="shop-mode-info" style="margin:0 0 12px 0;opacity:.85;width:100%;text-align:right;">' + _t("Mode d’achat :") + ' <strong>' + modeLabel + '</strong></div>';

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