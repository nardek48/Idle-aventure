"use strict";
/* ============================================================
Quest Idle — ui/ascension-view.js
Écran "Ascension" : bouton de prestige (voir ascendNow() en
progression-system.js) + boutique d'amélioration Aether.
============================================================ */

function buildAscensionHTML() {
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
  var h = `<div class="panel-title aether-shop-title">Ascension</div>`;
  h += (typeof buildCodexExcerptHTML === "function") ? buildCodexExcerptHTML("ascension") : "";

  h += `<div class="prestige-section">
    <div class="prestige-icon">🌀</div>
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

  h += `<div class="panel-title aether-shop-title">Boutique d’Aether</div>`;

  if (typeof AETHER_SHOP === "undefined" || !Array.isArray(AETHER_SHOP) || !AETHER_SHOP.length) {
    h += `<div class="ascension-conditions">Aucune amélioration d’Aether disponible.</div>`;
    return h;
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
      <div class="nb-purchase-icon-col"><div class="nb-purchase-icon-slot">${renderIconOrEmojiHTML(u.icon || "🌀", "nb-purchase-icon", u.name)}</div></div>

      <div class="nb-purchase-info-col">
        <div class="nb-purchase-top" style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;">
          <div class="nb-purchase-name">${esc(u.name)}</div>
          <div class="nb-purchase-meta" style="color:var(--aether);">🌀 ${isMax ? "MAX" : formatNumber(cost)}</div>
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

window.buildAscensionHTML = buildAscensionHTML;