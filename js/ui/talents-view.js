"use strict";
/* ui/talents-view.js — v3.327.0 : écran des talents PAR CLASSE (conception Talents v1.1, atelier
   atelier-talents.html validé par Seb sur iPhone le 24/09/2026).
   Bandeau des points (plafond d'acte, réserve, remise à zéro gratuite), tronc de 3 nœuds, deux
   voies côte à côte terminées par une clé de voûte. Un tap ouvre la feuille basse de détail
   (Héros › feuille « talent », voir heros-view.js). Toute la logique vit dans TalentManager. */

var openTalentId = null;

/* Icône : chemin réel de la donnée ; tant qu'elle manque, le repli global (core/utils.js)
   affiche l'icône générique — jamais une autre image du jeu (règle de Seb). */
function talentIconHTML(node) {
  return '<span class="tt-ico"><img src="' + esc(node.img || "") + '" alt=""></span>';
}

function getTalentClassId() {
  return (window.TalentManager && TalentManager.getClassId()) || "knight";
}

function talentPipsHTML(node) {
  var r = TalentManager.rank(node.id), max = TalentManager.maxRank(node), h = '<span class="tt-pips">';
  for (var i = 1; i <= max; i++) h += '<i' + (i <= r ? ' class="is-on"' : '') + '></i>';
  return h + '</span>';
}

function talentNodeState(node) {
  var TM = TalentManager, r = TM.rank(node.id);
  if (r >= TM.maxRank(node)) return "is-owned";
  if (TM.canBuy(node.id)) return r > 0 ? "is-owned is-avail" : "is-avail";
  if (TM.isClosed(node.id)) return "is-closed";
  return r > 0 ? "is-owned" : "is-locked";
}

function talentNodeHTML(node) {
  return '<button type="button" class="tt-node ' + talentNodeState(node) + (node.key ? ' is-key' : '')
    + '" onclick="openTalentSheet(\'' + esc(node.id) + '\')">'
    + talentIconHTML(node) + '<span class="tt-node-col">'
    + (node.key ? '<span class="tt-key-tag">Clé de voûte</span>' : '')
    + '<span class="tt-node-name">' + esc(node.name) + '</span>'
    + '<span class="tt-node-short">' + esc(node.short || "") + '</span>'
    + talentPipsHTML(node) + '</span></button>';
}

function buildTalentPointsHTML() {
  var TM = TalentManager, cap = TM.cap(), res = TM.reserve(), av = TM.available();
  var capTxt = isFinite(cap) ? (TM.spent() + " / " + cap + " placés · plafond de l'acte") : (TM.spent() + " placés");
  return '<div class="tt-points"><div class="tt-points-main">'
    + '<div class="tt-points-big"><b>' + av + '</b> point' + (av > 1 ? 's' : '') + ' à placer</div>'
    + '<div class="tt-points-sub">' + capTxt
    + (res > 0 ? ' · <span class="tt-res">' + res + ' en réserve</span>' : '') + '</div></div>'
    + '<button type="button" class="tt-reset" onclick="respecTalents()"' + (TM.spent() ? '' : ' disabled') + '>'
    + 'Réinitialiser<small>gratuit</small></button></div>';
}

function buildTalentBoardHTML() {
  if (!window.TalentManager || !TalentManager.getTree()) return '<div class="pc-empty">Talents indisponibles.</div>';
  var TM = TalentManager, t = TM.getTree(), gate = window.TALENT_TRUNK_GATE || 2;
  var cls = (typeof getClassById === "function") ? getClassById(TM.getClassId()) : null;
  var h = '<div class="tt-board tt-class-' + esc(TM.getClassId()) + '">';
  h += buildTalentPointsHTML();

  h += '<div class="tt-sec">Tronc' + (cls ? ' · ' + esc(cls.label) : '')
    + '<small>' + Math.min(gate, TM.trunkSpent()) + ' / ' + gate + ' pour ouvrir les voies</small></div>';
  h += '<div class="tt-trunk">' + t.trunk.map(talentNodeHTML).join("") + '</div>';

  h += '<div class="tt-sec">Voies<small>une seule clé de voûte</small></div><div class="tt-paths">';
  var open = TM.trunkSpent() >= gate;
  t.paths.forEach(function (p) {
    var keyOwned = p.nodes.some(function (n) { return n.key && TM.has(n.id); });
    h += '<div class="tt-path"><div class="tt-path-head' + (open ? '' : ' is-locked') + '">'
      + '<div class="tt-path-name">' + esc(p.name) + '</div>'
      + '<div class="tt-path-tag">' + esc(p.tag) + '</div>'
      + '<div class="tt-path-count">' + TM.pathSpent(p) + ' / 4' + (keyOwned ? ' · clé' : '') + '</div></div>';
    p.nodes.forEach(function (n, i) {
      if (n.key) h += '<div class="tt-link"></div>';
      else if (i > 0) h += '<div class="tt-gap"></div>';
      h += talentNodeHTML(n);
    });
    h += '</div>';
  });
  h += '</div></div>';
  return h;
}

/* Corps de la feuille basse (Héros › « talent »). */
function buildTalentSheetBodyHTML() {
  var TM = window.TalentManager, e = TM && openTalentId ? TM.find(openTalentId) : null;
  if (!e) return '<div class="pc-empty">Talent introuvable.</div>';
  var n = e.node, r = TM.rank(n.id), max = TM.maxRank(n);
  var where = e.zone === "trunk" ? "Tronc" : "Voie " + e.path.name + (n.key ? " · clé de voûte" : "");
  var reason = TM.blockReason(n.id);
  var h = '<div class="tt-sheet"><div class="tt-sheet-top">' + talentIconHTML(n)
    + '<div><div class="tt-sheet-title">' + esc(n.name) + '</div>'
    + '<div class="tt-sheet-where">' + esc(where) + (max > 1 ? ' · rang ' + r + ' / ' + max : '') + '</div></div></div>'
    + '<div class="tt-sheet-effect">' + esc(n.effect) + '</div>';
  if (r > 0) h += '<div class="tt-sheet-now">' + (max > 1 ? 'Rang ' + r + ' appris.' : 'Appris.') + '</div>';
  if (r < max) {
    if (reason) h += '<div class="tt-sheet-state">' + esc(reason) + '</div>';
    // v3.336.0 (F-2) : plafond de l'acte -> ce qui l'ouvre, et un geste pour y aller
    if (reason && /^Plafond de l'acte/.test(reason) && window.FilRouge && typeof FilRouge.howTo === "function") {
      var how = FilRouge.howTo("talentCap");
      if (how) h += '<div class="tt-sheet-howto">' + esc(how.text) + ' <button type="button" class="ret-link" onclick="talentHowToGo()">' + esc(how.label) + ' ›</button></div>';
    }
    h += '<button type="button" class="tt-go"' + (reason ? ' disabled' : '') + ' onclick="learnOpenTalent()">'
      + (r ? 'Rang suivant' : 'Apprendre') + ' · 1 point</button>';
  }
  return h + '</div>';
}

/* v3.336.0 (F-2) : ferme la feuille puis suit la proposition (Histoire). */
function talentHowToGo() {
  var how = window.FilRouge ? FilRouge.howTo("talentCap") : null;
  if (typeof closeHerosSheet === "function") closeHerosSheet();
  if (how && typeof how.go === "function") how.go();
}
window.talentHowToGo = talentHowToGo;

function openTalentSheet(id) {
  openTalentId = id;
  if (typeof openHerosSheet === "function") openHerosSheet("talent");
}

function learnOpenTalent() {
  if (!openTalentId || !window.TalentManager) return;
  if (TalentManager.buy(openTalentId) && typeof closeHerosSheet === "function") closeHerosSheet();
}

/* Écran autonome (ancien onglet « talents » de ui-root) : même contenu. */
function buildTalentsHTML() {
  return '<div class="subtab-page"><div class="subtab-page-content">'
    + '<div class="nb-page-frame kframe-page" data-kf-title="images/Icons/scene/node_discovery.png|Talents">'
    + buildTalentBoardHTML() + '</div></div></div>';
}

/* Compat : les trois branches n'existent plus. */
function setTalentCategory() { if (typeof renderPanel === "function") renderPanel(); }

window.buildTalentsHTML = buildTalentsHTML;
window.buildTalentBoardHTML = buildTalentBoardHTML;
window.buildTalentSheetBodyHTML = buildTalentSheetBodyHTML;
window.openTalentSheet = openTalentSheet;
window.learnOpenTalent = learnOpenTalent;
window.setTalentCategory = setTalentCategory;
