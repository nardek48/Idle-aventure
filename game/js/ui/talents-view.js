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
    + (node.key ? '<span class="tt-key-tag">' + _t("Clé de voûte") + '</span>' : '')
    + '<span class="tt-node-name">' + esc(_td(node.name)) + '</span>'
    + '<span class="tt-node-short">' + esc(_td(node.short || "")) + '</span>'
    + talentPipsHTML(node) + '</span></button>';
}

function buildTalentPointsHTML() {
  var TM = TalentManager, cap = TM.cap(), res = TM.reserve(), av = TM.available();
  // v3.458.3 (audit C13) : quand c'est le niveau qui limite, on le dit (un point par niveau)
  var lvlBound = TM.earned() < cap, next = Number(game.heroLevel || 1) + 1;
  var capTxt = !isFinite(cap) ? _t("{a} placés · le prochain au niveau {n}", { a: TM.spent(), n: next })
    : lvlBound ? _t("{a} / {b} placés · le prochain au niveau {n}", { a: TM.spent(), b: cap, n: next })
    : _t("{a} / {b} placés · plafond de l'acte", { a: TM.spent(), b: cap });
  return '<div class="tt-points"><div class="tt-points-main">'
    + '<div class="tt-points-big">' + _tn(av, "<b>{n}</b> point à placer", "<b>{n}</b> points à placer") + '</div>'
    + '<div class="tt-points-sub">' + capTxt
    + (res > 0 ? ' · <span class="tt-res">' + _t("{n} en réserve", { n: res }) + '</span>' : '') + '</div></div>'
    + '<button type="button" class="tt-reset" onclick="respecTalents()"' + (TM.spent() ? '' : ' disabled') + '>'
    + _t("Réinitialiser") + '<small>' + _t("gratuit") + '</small></button></div>';
}

function buildTalentBoardHTML() {
  if (!window.TalentManager || !TalentManager.getTree()) return '<div class="pc-empty">' + _t("Talents indisponibles.") + '</div>';
  var TM = TalentManager, t = TM.getTree(), gate = window.TALENT_TRUNK_GATE || 2;
  var cls = (typeof getClassById === "function") ? getClassById(TM.getClassId()) : null;
  var h = '<div class="tt-board tt-class-' + esc(TM.getClassId()) + '">';
  h += buildTalentPointsHTML();

  h += '<div class="ksec tt-sec"><span>' + _t("Tronc") + (cls ? ' · ' + esc(_td(cls.label)) : '')
    + ' <small>' + _t("{a} / {b} pour ouvrir les voies", { a: Math.min(gate, TM.trunkSpent()), b: gate }) + '</small></span></div>';
  h += '<div class="tt-trunk">' + t.trunk.map(talentNodeHTML).join("") + '</div>';

  h += '<div class="ksec tt-sec"><span>' + _t("Voies") + ' <small>' + _t("une seule clé de voûte") + '</small></span></div><div class="tt-paths">';
  var open = TM.trunkSpent() >= gate;
  t.paths.forEach(function (p) {
    var keyOwned = p.nodes.some(function (n) { return n.key && TM.has(n.id); });
    h += '<div class="tt-path"><div class="tt-path-head' + (open ? '' : ' is-locked') + '">'
      + '<div class="tt-path-name">' + esc(_td(p.name)) + '</div>'
      + '<div class="tt-path-tag">' + esc(_td(p.tag)) + '</div>'
      + '<div class="tt-path-count">' + TM.pathSpent(p) + ' / 4' + (keyOwned ? ' · ' + _t("clé", "voûte") : '') + '</div></div>';
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
  if (!e) return '<div class="pc-empty">' + _t("Talent introuvable.") + '</div>';
  var n = e.node, r = TM.rank(n.id), max = TM.maxRank(n);
  var where = e.zone === "trunk" ? _t("Tronc") : (e.zone === "command" ? _td(e.path.name) : _t("Voie {x}", { x: _td(e.path.name) })) + (n.key ? " · " + _t("clé de voûte") : "");
  var block = TM.blockInfo ? TM.blockInfo(n.id) : null;
  var reason = block ? block.text : null;
  var h = '<div class="tt-sheet"><div class="tt-sheet-top">' + talentIconHTML(n)
    + '<div><div class="tt-sheet-title">' + esc(_td(n.name)) + '</div>'
    + '<div class="tt-sheet-where">' + esc(where) + (max > 1 ? ' · ' + _t("rang {a} / {b}", { a: r, b: max }) : '') + '</div></div></div>'
    + '<div class="tt-sheet-effect">' + esc(_td(n.effect)) + '</div>';
  if (r > 0) h += '<div class="tt-sheet-now">' + (max > 1 ? _t("Rang {n} appris.", { n: r }) : _t("Appris.")) + '</div>';
  if (r < max) {
    if (reason) h += '<div class="tt-sheet-state">' + esc(reason) + '</div>';
    // v3.336.0 (F-2) : plafond de l'acte -> ce qui l'ouvre, et un geste pour y aller
    if (block && block.kind === "actCap" && window.FilRouge && typeof FilRouge.howTo === "function") {
      var how = FilRouge.howTo("talentCap");
      if (how) h += '<div class="tt-sheet-howto">' + esc(_td(how.text)) + ' <button type="button" class="ret-link" onclick="talentHowToGo()">' + esc(_td(how.label)) + ' ›</button></div>';
    }
    h += '<button type="button" class="tt-go"' + (reason ? ' disabled' : '') + ' onclick="learnOpenTalent()">'
      + (r ? _t("Rang suivant · 1 point") : _t("Apprendre · 1 point")) + '</button>';
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
    + '<div class="nb-page-frame kframe-page" data-kf-title="' + esc("images/Icons/subtabs/talents.webp|" + _t("Talents")) + '">'
    + buildTalentBoardHTML() + '</div></div></div>';
}

window.buildTalentsHTML = buildTalentsHTML;
window.buildTalentBoardHTML = buildTalentBoardHTML;
window.buildTalentSheetBodyHTML = buildTalentSheetBodyHTML;
window.openTalentSheet = openTalentSheet;
window.learnOpenTalent = learnOpenTalent;

/* v3.535.0 (audit PLA-11, option A) : carte « Niveau N », ouverte au calme (hors écran de combat,
   aucune autre fenêtre). Le message de progression-system.js (protégé, non modifié) reste tel quel. */
var levelCardPending = null; // { from, to } en mémoire seulement : un niveau gagné avant de quitter ne rouvre rien
var levelCardTimer = null;

/* Note un passage de niveau ; rien avant les talents (forest_11), pour laisser le tutoriel de la Forêt intact. */
function queueLevelCard(from, to) {
  if (!(to > from) || typeof isTabUnlocked !== "function" || !isTabUnlocked("talents")) return;
  levelCardPending = { from: levelCardPending ? levelCardPending.from : from, to: to };
  if (!levelCardTimer && typeof setInterval === "function") levelCardTimer = setInterval(flushLevelCard, 700);
}

function levelCardCalm() {
  if (game.activeTab === "combat") return false;
  return !(typeof workshopOtherWindowOpen === "function" && workshopOtherWindowOpen());
}

function flushLevelCard() {
  if (!levelCardPending) { if (levelCardTimer) { clearInterval(levelCardTimer); levelCardTimer = null; } return; }
  if (!levelCardCalm()) return;
  var host = document.getElementById("talent-modal-root");
  if (!host) return;
  var p = levelCardPending;
  levelCardPending = null;
  if (levelCardTimer) { clearInterval(levelCardTimer); levelCardTimer = null; }
  host.innerHTML = buildLevelCardHTML(p.to - p.from);
}

function buildLevelCardHTML(gained) {
  var TM = window.TalentManager, lvl = Number(game.heroLevel || 1);
  var av = TM ? TM.available() : 0, cap = TM ? TM.cap() : Infinity, res = !av && TM && TM.reserve() > 0;
  var pt = document.getElementById("hud-pt-img"), img = pt && pt.getAttribute("src");
  var h = '<div class="full-menu-overlay kwin-veil"><div class="kwin dungeon-story-card is-success level-card">';
  h += kWinHeadHTML({ icon: img ? '<img class="level-card-ico" src="' + esc(img) + '" alt="">' : renderIconOrEmojiHTML("images/Icons/subtabs/talents.webp", "dungeon-story-icon-img", ""),
    title: esc(_t("Niveau {n}", { n: lvl })), sub: esc(_t("{x} monte d'un niveau", { x: game.playerName || _t("Le héros") })) });
  h += '<div class="kwin-body">';
  if (res) {
    h += '<p class="level-card-big">' + esc(_tn(gained, "+{n} point de talent en réserve", "+{n} points de talent en réserve")) + '</p>';
    h += '<p class="level-card-sub">' + esc(_tn(gained, "Le plafond de l'acte est atteint ({c} points). Ce point servira quand le plafond montera, à un prochain acte de l'Histoire.",
      "Le plafond de l'acte est atteint ({c} points). Ces points serviront quand le plafond montera, à un prochain acte de l'Histoire.", { c: cap })) + '</p>';
  } else {
    h += '<p class="level-card-big">' + esc(_tn(gained, "+{n} point de talent", "+{n} points de talent")) + '</p>';
    h += '<p class="level-card-sub">' + esc(_tn(av, "{n} point à placer", "{n} points à placer") + " · " + _t("le prochain au niveau {n}", { n: lvl + 1 })) + '</p>';
  }
  h += '</div><div class="kwin-foot">';
  if (res || !av) h += '<button class="kbtn primary" type="button" onclick="closeLevelCard()">' + esc(_t("Continuer")) + '</button>';
  else h += '<button class="kbtn primary" type="button" onclick="closeLevelCard(true)">' + esc(_tn(av, "Placer le point", "Placer les points")) + '</button>'
    + '<button class="kbtn" type="button" onclick="closeLevelCard()">' + esc(_t("Plus tard")) + '</button>';
  return h + '</div></div></div>';
}

function closeLevelCard(toTalents) {
  var host = document.getElementById("talent-modal-root");
  if (host) host.innerHTML = "";
  if (!toTalents) return;
  if (typeof switchTab === "function") switchTab("more");
  if (typeof setHerosSubTab === "function") setHerosSubTab("talents");
}

/* Écoute de grantHeroXp sans toucher progression-system.js : l'appel est enveloppé, son effet inchangé. */
if (typeof grantHeroXp === "function" && !grantHeroXp.levelCardWrapped) {
  (function (orig) {
    var wrapped = function () {
      var before = Number(game.heroLevel || 1), r = orig.apply(this, arguments);
      if (r > 0) queueLevelCard(before, Number(game.heroLevel || 1));
      return r;
    };
    wrapped.levelCardWrapped = true;
    window.grantHeroXp = grantHeroXp = wrapped;
  })(grantHeroXp);
}
window.queueLevelCard = queueLevelCard;
window.flushLevelCard = flushLevelCard;
window.buildLevelCardHTML = buildLevelCardHTML;
window.closeLevelCard = closeLevelCard;
