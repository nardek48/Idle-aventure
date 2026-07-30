"use strict";

/* ============================================================
   Panneau village. 
============================================================ */

function buildVillageHTML() {
  var bonus = window.VillageManager && typeof VillageManager.getOfflineBonuses === "function"
    ? VillageManager.getOfflineBonuses()
    : { goldMult: 1, essenceFlat: 0, efficiencyBonus: 0, extraHours: 0 };

  var buildings = ["goldMine", "essenceWell", "barracks", "timeRelay"];
  var h = '';

  h += '<div class="panel-card">';
  h += '<h3>Village</h3>';
  h += '<p class="panel-sub">Développe ton village pour améliorer les gains hors-ligne.</p>';
  h += '<div class="village-bonus-row">';
  h += '<span>Or hors-ligne : x' + (bonus.goldMult || 1).toFixed(2) + '</span>';
  h += '<span>Efficacité : +' + Math.round((bonus.efficiencyBonus || 0) * 100) + '%</span>';
  h += '<span>Essence : +' + Math.floor(bonus.essenceFlat || 0) + '</span>';
  h += '<span>Temps max : +' + (bonus.extraHours || 0).toFixed(1) + 'h</span>';
  h += '</div>';
  h += '</div>';

  buildings.forEach(function (id) {
    var cfg = VILLAGE_CONFIG[id];
    var level = VillageManager.getLevel(id);
    var cost = VillageManager.getCost(id);
    var maxed = level >= (cfg.maxLevel || Infinity);

    h += '<div class="shop-item village-item">';
    h +=   '<div class="shop-main">';
    h +=     '<div class="shop-title-row">';
    h +=       '<strong>' + cfg.name + '</strong>';
    h +=       '<span class="shop-level">Niv. ' + level + '/' + cfg.maxLevel + '</span>';
    h +=     '</div>';
    h +=     '<div class="shop-desc">' + cfg.desc + '</div>';

    if (id === "goldMine") {
      h += '<div class="shop-meta">Bonus actuel : +' + Math.round(level * 12) + '% or hors-ligne</div>';
    } else if (id === "essenceWell") {
      h += '<div class="shop-meta">Bonus actuel : +' + level + ' essence hors-ligne</div>';
    } else if (id === "barracks") {
      h += '<div class="shop-meta">Bonus actuel : +' + Math.round(level * 4) + '% efficacité hors-ligne</div>';
    } else if (id === "timeRelay") {
      h += '<div class="shop-meta">Bonus actuel : +' + (level * 0.5).toFixed(1) + 'h de cap hors-ligne</div>';
    }

    h +=   '</div>';

    if (maxed) {
      h += '<button class="btn disabled" disabled>Max</button>';
    } else {
      h += '<button class="btn" onclick="buyVillageUpgrade(\'' + id + '\')">Améliorer<br>' + formatNumber(cost) + ' or</button>';
    }

    h += '</div>';
  });

  return h;
}

/* ============================================================
   Utilisé par les boutons HTML. 
============================================================ */

function buyVillageUpgrade(id) {
  if (window.VillageManager && typeof VillageManager.buy === "function") {
    VillageManager.buy(id);
  }
}

window.buildVillageHTML = buildVillageHTML;
window.buyVillageUpgrade = buyVillageUpgrade;