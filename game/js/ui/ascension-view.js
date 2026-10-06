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
      _t("Reprendre ce choix ?"),
      _t("Changer d'avis coûte {n} or (tu en as {g}). La prochaine reprise coûtera trois fois plus.", { n: formatNumber(cost), g: formatNumber(game.gold || 0) }),
      "images/Icons/gold_icon.png",
      function () { MemoryManager.choose(level, optionId); }
    );
    return;
  }
  MemoryManager.choose(level, optionId);
}
window.chooseMemoryOption = chooseMemoryOption;

/* v3.407.0 (audit design, point 1) : l'écran Mémoire rejoint le kit — cadre de page,
   carte crème en tête avec la jauge fine du kit (teinte Aether), un titre de section par
   niveau, des choix en cartes avec icône et coche. Plus de bleu en bordure ni d'emoji. */
function buildMemoryGaugeHTML(p) {
  var pct = p.maxed ? 100 : (p.need > 0 ? Math.min(100, Math.floor(100 * p.into / p.need)) : 0);
  var h = '<div class="mem-gauge">';
  h += '<div class="mem-gauge-head"><span class="mem-gauge-lvl">' + _t("Mémoire {n}", { n: p.level }) + '</span></div>';
  h += '<div class="kgauge kgauge-thin kgauge-aether mem-gauge-bar"><div class="kgauge-track"><div class="kgauge-fill" style="width:' + pct + '%"></div></div>'
    + '<span class="kgauge-text">' + (p.maxed ? _t("Tout est retenu") : _t("{a} / {b} Aether", { a: formatNumber(p.into), b: formatNumber(p.need) })) + '</span></div>';
  if (p.capped) h += '<div class="mem-gauge-note">' + _t("La jauge est pleine pour ce monde : le niveau suivant s'ouvrira dans le prochain monde.") + '</div>';
  h += '</div>';
  return h;
}

function buildMemoryLevelHTML(def, p) {
  var level = def.level, chosen = MemoryManager.getChoice(level);
  var reached = level <= p.level;
  var worldLocked = !reached && level > p.cap;
  var pending = reached && !chosen;
  var h = '<div class="mem-level' + (reached ? '' : ' is-locked') + (pending ? ' is-pending' : '') + '">';
  h += '<div class="ksec mem-level-head"><span>' + _t("Niveau {n}", { n: level }) + ' <small>' + esc(_td(def.theme)) + (def.jalon ? ' · ' + _t("jalon") : '') + '</small></span></div>';
  if (!reached) {
    h += '<div class="mem-level-lock"><img class="ico-inline" src="images/Icons/system/lock_closed.png" alt=""> ' + (worldLocked ? _t("S'ouvre dans un monde plus lointain.") : _t("Encore un peu d'Aether à rassembler.")) + '</div>';
  } else if (pending) {
    h += '<div class="mem-level-lock is-pending"><img class="ico-inline" src="images/Icons/aether_icon.png" alt=""> ' + _t("Un choix t'attend ici.") + '</div>';
  }
  h += '<div class="mem-options">';
  def.options.forEach(function (o) {
    var isChosen = chosen === o.id;
    var cls = 'mem-option' + (isChosen ? ' is-chosen' : '') + (chosen && !isChosen ? ' is-other' : '');
    if (reached) h += '<button type="button" class="' + cls + '" onclick="chooseMemoryOption(' + level + ',\'' + esc(o.id) + '\')">';
    else h += '<div class="' + cls + '">';
    h += '<span class="mem-option-ico">' + renderIconOrEmojiHTML(o.icon, "mem-option-img", _td(o.name)) + '</span>';
    h += '<span class="mem-option-txt"><span class="mem-option-name">' + esc(_td(o.name)) + '</span>';
    h += '<span class="mem-option-desc">' + esc(_td(o.desc)) + '</span></span>';
    if (isChosen) h += '<img class="mem-option-check" src="images/Icons/system/check_valid.png" alt="' + esc(_t("Choisi")) + '">';
    h += reached ? '</button>' : '</div>';
  });
  h += '</div></div>';
  return h;
}

function buildAscensionHTML() {
  if (!window.MemoryManager) return '<div class="panel">' + _t("Mémoire indisponible") + '</div>';
  MemoryManager.ensure();
  var p = MemoryManager.getProgress();
  var pending = MemoryManager.getPendingLevels();

  var h = (typeof buildCodexExcerptHTML === "function") ? buildCodexExcerptHTML("ascension") : "";
  h += '<div class="mem-head">';
  h += '<p class="mem-head-desc">' + _t("Ce que tu offres et ce que tu vis, l'Aether le retient. Offre les objets dont tu te sépares depuis ton sac ; tes grandes victoires comptent aussi.") + '</p>';
  h += buildMemoryGaugeHTML(p);
  if (pending.length) h += '<div class="mem-pending"><img class="ico-inline" src="images/Icons/aether_icon.png" alt=""> ' + (pending.length > 1 ? _t("{n} choix t'attendent.", { n: pending.length }) : _t("Un choix t'attend.")) + '</div>';
  h += '<p class="mem-head-note">' + _t("Reprendre un choix coûte de l'or : {n} pour la prochaine reprise, trois fois plus ensuite.", { n: formatNumber(MemoryManager.getRepriseCost()) }) + '</p>'; // v3.358.0 (D7)
  h += '</div>';

  (window.MEMORY_LEVELS || []).forEach(function (def) { h += buildMemoryLevelHTML(def, p); });
  return '<div class="nb-page-frame nb-page-frame-fill kframe-page mem-page" data-kf-title="' + esc("images/Icons/aether_icon.png|" + _t("Mémoire")) + '">' + h + '</div>';
}
window.buildAscensionHTML = buildAscensionHTML;
