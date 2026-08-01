"use strict";
/* ============================================================
Quest Idle — ui/bestiary-view.js
Écran "Bestiaire" : une carte par créature rencontrée (ennemis +
boss), avec image, compteur de kills, résistances/faiblesses et
stats RPG en barres. getStatLabel/clampStatValue viennent de
ui-root.js. Note : n'affiche pas encore le palier de bonus de
bestiaire actif (voir getBestiaryBonus en stats-system.js) — ce
serait un ajout naturel si besoin plus tard.
============================================================ */

/* Barres de stats (Puissance/Endurance/Célérité/Précision/Volonté)
   d'une créature. */
function buildBestiaryStatsHTML(stats) {
  if (!stats) return "";

  var keys = ["power", "endurance", "celerity", "precision", "will"];
  var html = '<div class="bestiary-stats">';

  keys.forEach(function (key) {
    var value = clampStatValue(stats[key]);
    html += ''
      + '<div class="bestiary-stat-row">'
      +   '<div class="bestiary-stat-head">'
      +     '<span class="bestiary-stat-label">' + esc(getStatLabel(key)) + '</span>'
      +     '<span class="bestiary-stat-value">' + value + '</span>'
      +   '</div>'
      +   '<div class="bestiary-stat-bar">'
      +     '<div class="bestiary-stat-fill" style="width:' + value + '%"></div>'
      +   '</div>'
      + '</div>';
  });

  html += '</div>';
  return html;
}

/* ============================================================
   Helper interne. 
============================================================ */

/* Image de la créature si dispo, sinon repli sur l'emoji ASSETS. */
function buildBestiaryImageHTML(data, isBoss) {
  var imagePath = data && data.image ? data.image : "";
  var iconKey = data && data.asset ? data.asset : "";

  if (imagePath) {
    return ''
      + '<div class="bestiary-thumb-wrap' + (isBoss ? ' boss' : '') + '">'
      +   '<img class="bestiary-thumb" src="' + esc(imagePath) + '" alt="' + esc(data.name || "Créature") + '">'
      + '</div>';
  }

  return ''
    + '<div class="bestiary-thumb-fallback' + (isBoss ? ' boss' : '') + '">'
    +   renderIcon(isBoss ? "bosses" : "enemies", iconKey)
    + '</div>';
}

/* ============================================================
   Helper interne. 
============================================================ */

/* Liste "Résiste :" / "Faible :" d'une créature, à partir des types
   de dégâts sword/bow/magic. */
function buildResistWeakHTML(data) {
  var resists = data && Array.isArray(data.resists) ? data.resists : [];
  var weak = data && Array.isArray(data.weak) ? data.weak : [];
  var html = '<div class="bestiary-tags">';

  if (resists.length) {
    html += '<div class="bestiary-tag-group"><span class="bestiary-tag-title">Résiste :</span> ' + esc(resists.join(", ")) + '</div>';
  }

  if (weak.length) {
    html += '<div class="bestiary-tag-group"><span class="bestiary-tag-title">Faible :</span> ' + esc(weak.join(", ")) + '</div>';
  }

  html += '</div>';
  return html;
}

/* ============================================================
   Builder bestiaire. 
============================================================ */

/* Liste TOUTES les créatures du jeu (ENEMY_DB + BOSS_DB), rencontrées
   ou non — le compteur de kills affiche juste 0 pour celles jamais
   croisées, rien n'est caché/verrouillé visuellement ici. */
function buildBestiaryHTML() {
  var ids = Object.keys(ENEMY_DB).concat(Object.keys(BOSS_DB));
  var h = '<div class="panel-title">Bestiaire</div>';

  ids.forEach(function (id) {
    var isBoss = !!BOSS_DB[id];
    var data = isBoss ? BOSS_DB[id] : ENEMY_DB[id];
    var kills = game.killCounts[id] || 0;

    h += ''
      + '<div class="bestiary-card' + (isBoss ? ' boss' : '') + '">'
      +   '<div class="bestiary-card-top">'
      +     buildBestiaryImageHTML(data, isBoss)
      +     '<div class="bestiary-card-main">'
      +       '<div class="bestiary-card-title-row">'
      +         '<div class="bestiary-card-name">' + esc(data.name) + (isBoss ? ' <span class="bestiary-boss-badge">BOSS</span>' : '') + '</div>'
      +       '</div>'
      +       '<div class="bestiary-card-kills">Tués : ' + formatNumber(kills) + '</div>'
      +       buildResistWeakHTML(data)
      +     '</div>'
      +   '</div>'
      +   buildBestiaryStatsHTML(data.stats)
      + '</div>';
  });

  return h;
}

window.buildBestiaryHTML = buildBestiaryHTML;