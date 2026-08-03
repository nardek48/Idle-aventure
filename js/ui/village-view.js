"use strict";
/* ============================================================
Quest Idle — ui/village-view.js
Écran "Village" : skyline visuel + liste des 6 bâtiments achetables
(voir VILLAGE_CONFIG dans systems/offline-system.js pour les coûts
et effets réels — les textes "Bonus actuel" ci-dessous sont dupliqués
à la main pour l'affichage, à garder synchronisés si un coefficient
change côté offline-system.js).
============================================================ */

/* v1.9.2 : icônes provisoires par bâtiment, en attendant l'art dédié.
   La structure ne bougera pas : il suffira de remplacer le
   <span class="village-building-emoji"> par une image plus tard. */
var VILLAGE_BUILDING_ICONS = {
  goldMine: "⛏️",
  essenceWell: "🔮",
  barracks: "🏋️",
  timeRelay: "🕰️",
  watchtower: "🗼",
  sanctuary: "⛩️"
};

/* Rangée de 6 silhouettes de bâtiment, grisées/floues tant qu'un
   bâtiment est au niveau 0, sinon affichées à une taille croissante
   selon le niveau atteint (voir CSS .village-building-emoji). */
function buildVillageSkylineHTML() {
  var buildings = ["goldMine", "essenceWell", "barracks", "timeRelay", "watchtower", "sanctuary"];
  var totalLevel = window.VillageManager && typeof VillageManager.getTotalLevel === "function"
    ? VillageManager.getTotalLevel()
    : 0;

  var h = '<div class="village-skyline">';
  h += '<div class="village-skyline-header">🏘️ Niveau de village : ' + totalLevel + '</div>';
  h += '<div class="village-skyline-row">';

  buildings.forEach(function (id) {
    var cfg = VILLAGE_CONFIG[id];
    if (!cfg) return;

    var level = VillageManager.getLevel(id);
    var maxLevel = cfg.maxLevel || 1;
    var ratio = Math.max(0, Math.min(1, level / maxLevel));
    var scale = (0.55 + ratio * 0.45).toFixed(2);
    var built = level > 0;

    h += '<div class="village-building-visual' + (built ? " built" : " unbuilt") + '" title="' + esc(cfg.name) + ' — niv. ' + level + '/' + maxLevel + '">';
    h += '<span class="village-building-emoji" style="transform:scale(' + scale + ')">' + VILLAGE_BUILDING_ICONS[id] + '</span>';
    h += '<span class="village-building-level">' + level + '</span>';
    h += '</div>';
  });

  h += '</div></div>';
  return h;
}

/* Assemble l'écran : skyline, résumé des bonus hors-ligne actuels,
   puis une carte d'achat par bâtiment. */
function buildVillageHTML() {
  var bonus = window.VillageManager && typeof VillageManager.getOfflineBonuses === "function"
    ? VillageManager.getOfflineBonuses()
    : { goldMult: 1, essenceFlat: 0, efficiencyBonus: 0, extraHours: 0, killsPerHour: 0, aetherPerHour: 0 };

  var buildings = ["goldMine", "essenceWell", "barracks", "timeRelay", "watchtower", "sanctuary"];
  var h = '';

  h += buildVillageSkylineHTML();

  h += '<div class="panel-card">';
  h += '<h3>Village</h3>';
  h += '<p class="panel-sub">Développe ton village pour améliorer les gains hors-ligne.</p>';
  h += buildCodexExcerptHTML("village");
  h += '<div class="village-bonus-row">';
  h += '<span>Or hors-ligne : x' + (bonus.goldMult || 1).toFixed(2) + '</span>';
  h += '<span>Efficacité : +' + Math.round((bonus.efficiencyBonus || 0) * 100) + '%</span>';
  h += '<span>Essence : +' + Math.floor(bonus.essenceFlat || 0) + '</span>';
  h += '<span>Aether : +' + (bonus.aetherPerHour || 0).toFixed(2) + '/h</span>';
  h += '<span>Kills simulés : ' + Math.floor(bonus.killsPerHour || 0) + '/h</span>';
  h += '<span>Temps max : ' + (4 + (bonus.extraHours || 0)).toFixed(1) + 'h</span>';
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
    h +=       '<strong>' + VILLAGE_BUILDING_ICONS[id] + ' ' + cfg.name + '</strong>';
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
      h += '<div class="shop-meta">Bonus actuel : +' + (level * 2).toFixed(1) + 'h de cap hors-ligne</div>';
    } else if (id === "watchtower") {
      h += '<div class="shop-meta">Bonus actuel : ' + (level * 3) + ' kills simulés/h (bestiaire + chance de butin)</div>';
    } else if (id === "sanctuary") {
      h += '<div class="shop-meta">Bonus actuel : +' + (level * 0.05).toFixed(2) + ' Aether/h</div>';
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
