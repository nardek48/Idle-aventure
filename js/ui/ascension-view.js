"use strict";
/* ui/ascension-view.js — v3.322.0 (Offrande, conception v1.2) : l'onglet « ascension » devient
   l'écran de MÉMOIRE — jauge, niveaux, choix et reprises. Le nom de fichier et la clé d'onglet
   sont gardés (ui-root.js, heros-view.js, verrous d'onglets). */

function chooseMemoryOption(level, optionId) {
  if (!window.MemoryManager) return;
  var current = MemoryManager.getChoice(level);
  if (current && current !== optionId && typeof showConfirmModal === "function") {
    var cost = MemoryManager.getRepriseCost();
    showConfirmModal(
      "Reprendre ce choix ?",
      "Changer d'avis coûte " + formatNumber(cost) + " Aether (tu en as " + formatNumber(game.aether || 0) + "). La prochaine reprise coûtera trois fois plus.",
      "images/Icons/aether_icon.png",
      function () { MemoryManager.choose(level, optionId); }
    );
    return;
  }
  MemoryManager.choose(level, optionId);
}
window.chooseMemoryOption = chooseMemoryOption;

function buildMemoryGaugeHTML(p) {
  var pct = p.maxed ? 100 : (p.need > 0 ? Math.min(100, Math.floor(100 * p.into / p.need)) : 0);
  var h = '<div class="mem-gauge">';
  h += '<div class="mem-gauge-head"><span class="mem-gauge-lvl">Mémoire ' + p.level + '</span>';
  h += '<span class="mem-gauge-num">' + (p.maxed ? "Tout est retenu" : formatNumber(p.into) + ' / ' + formatNumber(p.need) + ' Aether') + '</span></div>';
  h += '<div class="mem-gauge-bar"><div class="mem-gauge-fill" style="width:' + pct + '%"></div></div>';
  if (p.capped) h += '<div class="mem-gauge-note">La jauge est pleine pour ce monde : le niveau suivant s\'ouvrira dans le prochain monde.</div>';
  h += '</div>';
  return h;
}

function buildMemoryLevelHTML(def, p) {
  var level = def.level, chosen = MemoryManager.getChoice(level);
  var reached = level <= p.level;
  var worldLocked = !reached && level > p.cap;
  var h = '<div class="mem-level' + (reached ? '' : ' is-locked') + (reached && !chosen ? ' is-pending' : '') + '">';
  h += '<div class="mem-level-head"><span class="mem-level-num">Niveau ' + level + '</span>';
  h += '<span class="mem-level-theme">' + esc(def.theme) + (def.jalon ? ' · jalon' : '') + '</span></div>';
  if (!reached) {
    h += '<div class="mem-level-lock">' + (worldLocked ? 'S\'ouvre dans un monde plus lointain.' : 'Encore un peu d\'Aether à rassembler.') + '</div>';
  }
  h += '<div class="mem-options">';
  def.options.forEach(function (o) {
    var isChosen = chosen === o.id;
    var cls = 'mem-option' + (isChosen ? ' is-chosen' : '') + (chosen && !isChosen ? ' is-other' : '');
    if (reached) h += '<button type="button" class="' + cls + '" onclick="chooseMemoryOption(' + level + ',\'' + esc(o.id) + '\')">';
    else h += '<div class="' + cls + '">';
    h += '<span class="mem-option-ico">' + renderIconOrEmojiHTML(o.icon, "mem-option-img", o.name) + '</span>';
    h += '<span class="mem-option-txt"><span class="mem-option-name">' + esc(o.name) + (isChosen ? ' ✓' : '') + '</span>';
    h += '<span class="mem-option-desc">' + esc(o.desc) + '</span></span>';
    h += reached ? '</button>' : '</div>';
  });
  h += '</div></div>';
  return h;
}

function buildAscensionHTML() {
  if (!window.MemoryManager) return '<div class="panel">Mémoire indisponible</div>';
  MemoryManager.ensure();
  var p = MemoryManager.getProgress();
  var pending = MemoryManager.getPendingLevels();

  var h = (typeof buildCodexExcerptHTML === "function") ? buildCodexExcerptHTML("ascension") : "";
  h += '<div class="prestige-section">';
  h += '<div class="prestige-icon">' + renderIconOrEmojiHTML("images/Icons/aether_icon.png", "prestige-icon-img", "Aether") + '</div>';
  h += '<div class="prestige-title">Mémoire</div>';
  h += '<div class="prestige-desc">Ce que tu offres et ce que tu vis, l\'Aether le retient. Offre les objets dont tu te sépares depuis ton sac ; tes grandes victoires comptent aussi.</div>';
  h += buildMemoryGaugeHTML(p);
  h += '<div class="prestige-desc">Aether disponible pour les reprises : ' + formatNumber(game.aether || 0)
     + ' · prochaine reprise : ' + formatNumber(MemoryManager.getRepriseCost()) + '</div>';
  if (pending.length) h += '<div class="mem-pending">🌟 ' + (pending.length > 1 ? pending.length + ' choix t\'attendent.' : 'Un choix t\'attend.') + '</div>';
  h += '</div>';

  (window.MEMORY_LEVELS || []).forEach(function (def) { h += buildMemoryLevelHTML(def, p); });
  return '<div class="panel mem-panel">' + h + '</div>';
}
window.buildAscensionHTML = buildAscensionHTML;
