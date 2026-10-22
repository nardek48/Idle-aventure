"use strict";
/* ui/ascension-view.js — v3.322.0 (Offrande, conception v1.2) : l'onglet « ascension » devient
   l'écran de MÉMOIRE — jauge, niveaux, choix et reprises. Le nom de fichier et la clé d'onglet
   sont gardés (ui-root.js, heros-view.js, verrous d'onglets). */

function chooseMemoryOption(level, optionId) {
  if (!window.MemoryManager) return;
  var current = MemoryManager.getChoice(level);
  if (current && current !== optionId && !MemoryManager.isLineBroken(level) && !MemoryManager.isFreeReprise(level) && typeof showConfirmModal === "function") { // ligne cassée, reprise offerte : sans frais
    var cost = MemoryManager.getRepriseCost();
    showConfirmModal(
      _t("Reprendre ce choix ?"),
      _t("Changer d'avis coûte {n} or (tu en as {g}). La prochaine reprise coûtera trois fois plus.", { n: formatNumber(cost), g: formatNumber(game.gold || 0) }),
      "images/Icons/gold_icon.webp",
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
  var broken = reached && !!chosen && MemoryManager.isLineBroken(level); // v3.453.0 : la ligne ne tient plus
  var pending = reached && (!chosen || broken);
  var h = '<div class="mem-level' + (reached ? '' : ' is-locked') + (pending ? ' is-pending' : '') + '" id="mem-level-' + level + '">';
  h += '<div class="ksec mem-level-head"><span>' + _t("Niveau {n}", { n: level }) + ' <small>' + esc(_td(def.theme)) + (def.jalon ? ' · ' + _t("jalon") : '') + '</small></span></div>';
  if (!reached) {
    h += '<div class="mem-level-lock"><img class="ico-inline" src="images/Icons/system/lock_closed.webp" alt=""> ' + (worldLocked ? _t("S'ouvre dans un monde plus lointain.") : _t("Encore un peu d'Aether à rassembler.")) + '</div>';
  } else if (pending) {
    h += '<div class="mem-level-lock is-pending"><img class="ico-inline" src="images/Icons/aether_icon.webp" alt=""> ' + (broken ? _t("La ligne ne tient plus : choisis à nouveau, sans frais.") : _t("Un choix t'attend ici.")) + '</div>';
  }
  if (reached && MemoryManager.isFreeReprise(level)) h += '<div class="mem-level-lock is-pending"><img class="ico-inline" src="images/Icons/aether_icon.webp" alt=""> ' + _t("Ysolt s'est recouchée : tu peux changer ce choix une fois, sans frais.") + '</div>'; // v3.455.0
  // v3.458.4 (audit C4) : un niveau déjà choisi se replie sur son choix ; un toucher le rouvre pour en changer
  var free = reached && MemoryManager.isFreeReprise(level);
  if (reached && chosen && !pending && !free && !memLevelOpen[level]) {
    var pick = def.options.filter(function (o) { return o.id === chosen; })[0];
    h += '<button type="button" class="mem-chosen" onclick="toggleMemLevel(' + level + ')">'
      + renderIconOrEmojiHTML(pick ? pick.icon : "", "mem-chosen-img", pick ? _td(pick.name) : "")
      + '<span>' + esc(pick ? _td(pick.name) : "") + '</span><small>' + _t("Changer") + ' ›</small></button>';
    return h + '</div>';
  }
  h += '<div class="mem-options">';
  def.options.forEach(function (o) {
    var isChosen = chosen === o.id && !(broken && o.line);
    // v3.453.0 : la ligne du jalon reste grisée tant que les trois niveaux d'avant ne sont pas du même côté
    var lineLocked = !!o.line && !MemoryManager.lineOpen(level, o.line);
    var cls = 'mem-option' + (isChosen ? ' is-chosen' : '') + (chosen && !isChosen ? ' is-other' : '') + (lineLocked ? ' is-line-locked' : '');
    if (reached && !lineLocked) h += '<button type="button" class="' + cls + '" onclick="chooseMemoryOption(' + level + ',\'' + esc(o.id) + '\')">';
    else h += '<div class="' + cls + '">';
    var side = o.line || o.side;
    var tag = !side ? '' : ' <span class="mem-tag is-' + (o.line ? 'line' : side) + '">'
      + (o.line ? (side === "garder" ? _t("Ligne Garder") : _t("Ligne Donner")) : (side === "garder" ? _t("Garder") : _t("Donner"))) + '</span>';
    h += '<span class="mem-option-ico">' + renderIconOrEmojiHTML(o.icon, "mem-option-img", _td(o.name)) + '</span>';
    h += '<span class="mem-option-txt"><span class="mem-option-name">' + esc(_td(o.name)) + tag + '</span>';
    h += '<span class="mem-option-desc">' + esc(_td(o.desc)) + '</span>';
    if (lineLocked) h += '<span class="mem-line-cond">' + esc(side === "garder" ? _t("S'ouvre si tu as choisi Garder aux niveaux {a}, {b}, {c}.", { a: level - 3, b: level - 2, c: level - 1 }) : _t("S'ouvre si tu as choisi Donner aux niveaux {a}, {b}, {c}.", { a: level - 3, b: level - 2, c: level - 1 })) + '</span>';
    h += '</span>';
    if (isChosen) h += '<img class="mem-option-check" src="images/Icons/system/check_valid.webp" alt="' + esc(_t("Choisi")) + '">';
    h += (reached && !lineLocked) ? '</button>' : '</div>';
  });
  h += '</div></div>';
  return h;
}

var memLevelOpen = {};
function toggleMemLevel(level) { memLevelOpen[level] = !memLevelOpen[level]; if (typeof renderPanel === "function") renderPanel(); }
window.toggleMemLevel = toggleMemLevel;

function buildAscensionHTML() {
  if (!window.MemoryManager) return '<div class="panel">' + _t("Mémoire indisponible") + '</div>';
  MemoryManager.ensure();
  var p = MemoryManager.getProgress();
  var pending = MemoryManager.getPendingLevels();

  var h = (typeof buildCodexExcerptHTML === "function") ? buildCodexExcerptHTML("ascension") : "";
  h += '<div class="mem-head">';
  h += '<p class="mem-head-desc">' + _t("Ce que tu offres et ce que tu vis, l'Aether le retient. Offre les objets dont tu te sépares depuis ton sac ; tes grandes victoires comptent aussi.") + '</p>';
  h += buildMemoryGaugeHTML(p);
  // v3.458.3 (audit C4) : la pastille mène au premier choix en attente
  if (pending.length) h += '<button type="button" class="mem-pending" onclick="memScrollToPending()"><img class="ico-inline" src="images/Icons/aether_icon.webp" alt=""> ' + (pending.length > 1 ? _t("{n} choix t'attendent.", { n: pending.length }) : _t("Un choix t'attend.")) + ' ›</button>';
  // v3.458.4 (audit C4) : Garder, Donner et le jalon en une phrase
  h += '<p class="mem-head-note">' + _t("À partir du niveau 9, chaque niveau oppose Garder (prudence, réserves) à Donner (risquer, aller plus vite). Le jalon de chaque monde ajoute une ligne, ouverte si les trois niveaux d'avant sont du même côté.") + '</p>';
  h += '<p class="mem-head-note">' + _t("Reprendre un choix coûte de l'or : {n} pour la prochaine reprise, trois fois plus ensuite.", { n: formatNumber(MemoryManager.getRepriseCost()) }) + '</p>'; // v3.358.0 (D7)
  h += '</div>';

  (window.MEMORY_LEVELS || []).forEach(function (def) { h += buildMemoryLevelHTML(def, p); });
  return '<div class="nb-page-frame nb-page-frame-fill kframe-page mem-page" data-kf-title="' + esc("images/Icons/aether_icon.webp|" + _t("Mémoire")) + '">' + h + '</div>';
}
window.buildAscensionHTML = buildAscensionHTML;

/* v3.458.3 (audit C4) : amène à l'écran le premier niveau qui attend un choix (l'écran fait
   plus de 4 000 px ; le choix en attente était à 3 200 px). Appelé par la pastille et à l'ouverture. */
function memScrollToPending() {
  var pending = window.MemoryManager ? MemoryManager.getPendingLevels() : [];
  if (!pending.length || typeof document === "undefined") return false;
  var lvl = pending[0], el = document.getElementById("mem-level-" + (lvl && lvl.level != null ? lvl.level : lvl));
  if (!el || typeof el.scrollIntoView !== "function") return false;
  el.scrollIntoView({ block: "start" });
  return true;
}
window.memScrollToPending = memScrollToPending;
