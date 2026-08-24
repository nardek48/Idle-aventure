"use strict";
/* ui/ascension-view.js — écran Ascension : sous-onglets Ascension (bouton prestige) / Boutique Aether. Détail : COMMENTAIRES_ORIGINAUX.md */

var activeAscensionSubTab = "ascension";

function setAscensionSubTab(tab) {
  activeAscensionSubTab = (tab === "shop") ? "shop" : "ascension";
  if (typeof renderPanel === "function") renderPanel();
}
window.setAscensionSubTab = setAscensionSubTab;

function buildAscensionSubTabBarHTML() {
  var h = '<div class="pc-subtab-bar">';
  h += '<button type="button" class="pc-subtab-btn' + (activeAscensionSubTab === "ascension" ? ' is-active' : '') + '" onclick="setAscensionSubTab(\'ascension\')">🌀<span>Ascension</span></button>';
  h += '<button type="button" class="pc-subtab-btn' + (activeAscensionSubTab === "shop" ? ' is-active' : '') + '" onclick="setAscensionSubTab(\'shop\')">🔷<span>Boutique</span></button>';
  h += '</div>';
  return h;
}

function buildAscensionTabContentHTML() {
  var minKills = (typeof ASCENSION_CONFIG !== "undefined" && ASCENSION_CONFIG.minKillsToAscend != null)
    ? ASCENSION_CONFIG.minKillsToAscend
    : 50;

  var currentKills = Number(game.totalKills || 0);
  var gain = (window.AscensionManager && typeof AscensionManager.previewGain === "function")
    ? AscensionManager.previewGain()
    : 0;

  var canAscend = (window.AscensionManager && typeof AscensionManager.canAscend === "function")
    ? AscensionManager.canAscend()
    : false;

  var killsLeft = Math.max(0, minKills - currentKills);
  var h = (typeof buildCodexExcerptHTML === "function") ? buildCodexExcerptHTML("ascension") : "";

  h += `<div class="prestige-section">
    <div class="prestige-icon">${renderIconOrEmojiHTML("images/Icons/aether_icon.png", "prestige-icon-img", "Aether")}</div>
    <div class="prestige-title">Ascension</div>
    <div class="prestige-desc">
      Réinitialise la progression classique mais conserve l’Aether, les ascensions et les améliorations astrales.
    </div>
    <div class="prestige-gain">+${formatNumber(gain)} Aether</div>
    <div class="prestige-desc">
      Aether actuel : ${formatNumber(game.aether || 0)}<br>
      Ascensions effectuées : ${formatNumber(game.ascensionCount || 0)}
    </div>
    <button class="prestige-btn ${canAscend ? "" : "disabled"}"
      ${canAscend ? 'onclick="doAscend()"' : "disabled"}>
      ${canAscend ? "Ascension maintenant" : "Ascension indisponible"}
    </button>
  </div>`;

  h += `<div class="ascension-conditions">
    <strong>Conditions</strong><br><br>
    Kills requis : ${minKills}<br>
    Kills actuels : ${currentKills}<br>
    ${
      canAscend
        ? '<span class="ascension-ok">Ascension disponible</span>'
        : `<span class="ascension-lock">Encore ${killsLeft} kill(s) avant de pouvoir ascensionner</span>`
    }
  </div>`;

  return h;
}

function buildAscensionShopTabContentHTML() {
  var h = "";

  if (typeof AETHER_SHOP === "undefined" || !Array.isArray(AETHER_SHOP) || !AETHER_SHOP.length) {
    return `<div class="ascension-conditions">Aucune amélioration d’Aether disponible.</div>`;
  }

  AETHER_SHOP.forEach(function (u) {
    var level = (game.aetherUpgrades && game.aetherUpgrades[u.id]) || 0;
    var maxLevel = Number(u.maxLevel || 1);
    var isMax = level >= maxLevel;

    var cost = typeof getAetherUpgradeCost === "function"
      ? getAetherUpgradeCost(u)
      : Math.floor((u.baseCost || 1) * Math.pow(1.4, level));

    var canBuy = !isMax && (game.aether || 0) >= cost;

    h += `<div class="nb-purchase-card">
      <div class="nb-purchase-icon-col"><div class="nb-purchase-icon-slot">${renderIconOrEmojiHTML(u.icon || "images/Icons/aether_icon.png", "nb-purchase-icon", u.name)}</div></div>

      <div class="nb-purchase-info-col">
        <div class="nb-purchase-top" style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;">
          <div class="nb-purchase-name">${esc(u.name)}</div>
          <div class="nb-purchase-meta" style="color:var(--aether);display:flex;align-items:center;gap:3px;">${renderIconOrEmojiHTML("images/Icons/aether_icon.png", "nb-purchase-cost-icon", "Aether")} ${isMax ? "MAX" : formatNumber(cost)}</div>
        </div>

        <div class="nb-purchase-meta">Niveau ${level} / ${maxLevel}</div>
        ${u.desc ? `<div class="nb-purchase-desc">${esc(u.desc)}</div>` : ""}
      </div>

      <div class="nb-purchase-buy-col">
        <button class="btn-buy ${isMax || !canBuy ? "cant-afford" : ""}"
          ${isMax || !canBuy ? "disabled" : `onclick="buyAetherUpgrade('${esc(u.id)}')"`}>
          ${isMax ? "Maximum" : canBuy ? "Acheter" : "Coût trop élevé"}
        </button>
      </div>
    </div>`;
  });

  return h;
}

function buildAscensionHTML() {
  var h = '<div class="subtab-page">';
  h += '<div class="subtab-page-content">';
  h += '<div class="nb-page-frame nb-page-frame-fill">';
  h += (activeAscensionSubTab === "shop") ? buildAscensionShopTabContentHTML() : buildAscensionTabContentHTML();
  h += '</div>';
  h += '</div>';

  h += '<div class="subtab-bar-wrapper">';
  h += buildAscensionSubTabBarHTML();
  h += '</div>';

  h += '</div>';
  return h;
}

window.buildAscensionHTML = buildAscensionHTML;
