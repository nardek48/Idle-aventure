"use strict";
/* ui/chronique-view.js — v3.503.0 (grand écran, lots GE-2 et GE-3, atelier atelier/grand-ecran.html) :
   la Chronique, colonne de droite du format large (html.wide-mode) : objectif d'Histoire, « à faire »
   (les bulles du dock, en clair), le village qui produit et le journal. Repliée en bande sous 1 280 px
   de fenêtre ou à la demande (préférence « chronique »). Raccourcis clavier de la coque : 1 à 5, C.
   Le téléphone ne la voit jamais (css/10-grand-ecran.css). */

var CHRON_MIN_W = 1280;           // fenêtre (px de jeu) sous laquelle la Chronique se replie d'office
var CHRON_KEYS = { "1": "campement", "2": "quests", "3": "village", "4": "more", "5": "map" };

var Chronique = {
  el: null,
  last: "",
  at: 0,
  over: false,                    // repliée mais ouverte par-dessus la page

  mount: function () {
    if (typeof document === "undefined" || !document.body || document.getElementById("chronique")) return;
    var el = document.createElement("aside");
    el.id = "chronique";
    el.setAttribute("aria-label", _t("Chronique"));
    document.body.appendChild(el);
    this.el = el;
    this.layout();
  },

  /* Largeur de la fenêtre de jeu en px CSS (zoom du mode PC compris) */
  windowW: function () {
    var z = window.DesktopScale ? (DesktopScale.zoom || 1) : 1;
    return Math.min(typeof WIDE_W === "number" ? WIDE_W : 1440, (window.innerWidth || 0) / z);
  },

  isMin: function () {
    return (window.Prefs && Prefs.get("chronique") === false) || this.windowW() < CHRON_MIN_W;
  },

  layout: function () {
    var root = document.documentElement, min = this.isMin();
    if (!min) this.over = false;
    root.classList.toggle("chron-min", min);
    root.classList.toggle("chron-over", min && this.over);
    this.last = "";
    this.render(true);
  },

  /* Bouton de tête et touche C : replier, rouvrir, ou ouvrir par-dessus quand la fenêtre est étroite */
  toggle: function () {
    var narrow = this.windowW() < CHRON_MIN_W;
    if (narrow) this.over = !this.over;
    else if (window.Prefs) Prefs.set("chronique", Prefs.get("chronique") === false);
    this.layout();
  },

  openOver: function () { this.over = true; this.layout(); },

  /* Appelé par renderHud (chaque image) : au plus deux fois par seconde, et seulement si le contenu change */
  render: function (force) {
    if (!this.el || !document.documentElement.classList.contains("wide-mode")) return;
    var now = Date.now();
    if (!force && now - this.at < 500) return;
    this.at = now;
    var min = document.documentElement.classList.contains("chron-min") && !this.over;
    var html = this.headHTML(min) + (min ? this.stripHTML() : '<div class="chr-body">' + this.objectiveHTML() + this.todoHTML() + this.villageHTML() + this.journalHTML() + '</div>');
    if (html === this.last) return;
    var body = this.el.querySelector(".chr-body"), top = body ? body.scrollTop : 0;
    this.last = html;
    this.el.innerHTML = html;
    body = this.el.querySelector(".chr-body");
    if (body) body.scrollTop = top;
  },

  headHTML: function (min) {
    return '<div class="chr-h"><strong>' + esc(_t("Chronique")) + '</strong>'
      + '<button type="button" class="chr-x" onclick="Chronique.toggle()" title="' + esc(_t("Replier ou ouvrir la Chronique (touche C)")) + '" aria-label="' + esc(_t("Replier ou ouvrir la Chronique")) + '">' + (min ? "‹" : "›") + '</button></div>';
  },

  todoItems: function () {
    var out = [];
    var or = typeof hudDockOr === "function" ? hudDockOr() : null, fil = typeof hudDockFil === "function" ? hudDockFil() : null;
    if (fil) out.push(fil);
    if (or) out.push(or);
    if (typeof hudDockItems === "function") out = out.concat(hudDockItems());
    return out;
  },

  stripHTML: function () {
    var n = this.todoItems().length;
    var b = function (ico, tip, badge) {
      return '<button type="button" onclick="Chronique.openOver()" title="' + esc(tip) + '"><img src="' + ico + '" alt="">' + (badge ? '<span class="chr-badge">' + badge + '</span>' : '') + '</button>';
    };
    return '<div class="chr-strip">'
      + b("images/Icons/quests/quest_story.webp", _t("Objectif"), "")
      + b("images/Icons/quests/quest_list.webp", _t("À faire"), n ? String(n) : "")
      + b("images/Icons/menu_icons/village_menu.webp", _t("Le village"), "")
      + b("images/Icons/menu_icons/journal_menu.webp", _t("Journal"), "")
      + '</div>';
  },

  objectiveHTML: function () {
    var SQ = window.StoryQuestManager, cid = SQ && SQ.activeChapterIds ? SQ.activeChapterIds()[0] : null;
    var ch = cid && window.STORY_QUESTS ? STORY_QUESTS[cid] : null, step = ch ? SQ.getCurrentStep(cid) : null;
    if (!step) return "";
    var go = "switchTab('quests');if(typeof setQuestCategory==='function')setQuestCategory('histoire')";
    return '<section class="chr-s"><h4>' + esc(_t("Objectif")) + '<a onclick="' + go + '">' + esc(_t("Quêtes")) + ' ›</a></h4>'
      + '<button type="button" class="chr-obj" onclick="' + go + '"><small>' + esc(_td(ch.title)) + ' · ' + (ch.steps.indexOf(step) + 1) + ' / ' + ch.steps.length + '</small>'
      + '<b>' + esc(_td(step.title)) + '</b>'
      + (step.objectiveLabel ? '<span>' + esc(_td(step.objectiveLabel)) + '</span>' : '')
      + '<em>' + esc(SQ.isCurrentStepAccepted(cid) ? _t("En cours") : _t("À accepter")) + '</em></button></section>';
  },

  todoHTML: function () {
    var items = this.todoItems();
    var h = '<section class="chr-s"><h4>' + esc(_t("À faire")) + (items.length ? '<span class="chr-count">' + items.length + '</span>' : '') + '</h4>';
    if (!items.length) return h + '<p class="chr-empty">' + esc(_t("Rien d'urgent.")) + '</p></section>';
    h += '<div class="chr-todo">';
    items.forEach(function (it) {
      h += '<button type="button" class="chr-td' + (it.urgent ? ' is-urgent' : '') + '" onclick="' + it.go + '">'
        + '<img src="' + esc(it.icon) + '" alt=""><span>' + esc(it.tip) + '</span>'
        + (it.badge ? '<span class="chr-badge">' + esc(it.badge) + '</span>' : (it.urgent ? '<span class="chr-badge">!</span>' : '<i>›</i>')) + '</button>';
    });
    return h + '</div></section>';
  },

  villageHTML: function () {
    if (!window.ProductionManager || !window.PRODUCTION_BUILDINGS || (typeof isTabUnlocked === "function" && !isTabUnlocked("village"))) return "";
    var rows = "", stock = 0;
    Object.keys(PRODUCTION_BUILDINGS).forEach(function (id) {
      if (!ProductionManager.isBuildingUnlocked(id)) return;
      var def = PRODUCTION_BUILDINGS[id], res = window.WAREHOUSE_RESOURCES ? WAREHOUSE_RESOURCES[def.resourceKey] : null;
      var s = ProductionManager.getStock(id), cap = ProductionManager.getCapacity(id), pct = cap > 0 ? Math.min(100, 100 * s / cap) : 0;
      var rate = ProductionManager.getRatePerMin(id) || 0;
      stock += Math.floor(s);
      rows += '<div class="chr-pr" title="' + esc(_td(def.name)) + ' · ' + Math.floor(s) + ' / ' + cap + '">'
        + '<img src="' + esc((res && res.icon) || def.icon) + '" alt=""><span>' + esc(_td(res ? res.name : def.name)) + '</span>'
        + '<span class="chr-bar' + (pct >= 100 ? ' is-full' : '') + '"><i style="width:' + pct.toFixed(0) + '%"></i></span>'
        + '<em>+' + (rate < 1 ? rate.toFixed(2) : rate.toFixed(1)).replace(".", ",") + '/min</em></div>';
    });
    if (!rows) return "";
    return '<section class="chr-s"><h4>' + esc(_t("Le village tourne")) + '<a onclick="switchTab(\'village\')">' + esc(_t("Village")) + ' ›</a></h4>'
      + '<div class="chr-prod">' + rows + '</div>'
      + '<button type="button" class="chr-harvest"' + (stock > 0 ? '' : ' disabled') + ' onclick="ProductionManager.harvestAll()"><img src="images/Icons/system/collect_all.webp" alt="">' + esc(_t("Tout récolter")) + '</button></section>';
  },

  journalHTML: function () {
    var log = (window.gameLog || []).slice(0, 6);
    if (!log.length) return "";
    var now = Date.now();
    var age = function (t) {
      var m = Math.floor((now - (t || now)) / 60000);
      return m < 1 ? _t("à l'instant") : m < 60 ? _t("{n} min", { n: m }) : _t("{h} h", { h: Math.floor(m / 60) });
    };
    var h = '<section class="chr-s"><h4>' + esc(_t("Journal")) + '<a onclick="switchTab(\'log\')">' + esc(_t("Tout")) + ' ›</a></h4><ul class="chr-log">';
    log.forEach(function (e) { h += '<li class="is-' + esc(e.type || "event") + '"><span>' + esc(_td(e.text)) + '</span><time>' + esc(age(e.at)) + '</time></li>'; });
    return h + '</ul></section>';
  }
};

/* Raccourcis de la coque (format large, hors combat et hors scène, aucune fenêtre ouverte) */
function chroniqueKeydown(e) {
  var root = document.documentElement, b = document.body;
  if (!root.classList.contains("wide-mode") || e.ctrlKey || e.metaKey || e.altKey) return;
  if (b.classList.contains("combat-active") || b.classList.contains("scene-active") || b.classList.contains("living-map-active")) return;
  var t = e.target;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  if (e.key === "Escape" && Chronique.over) { Chronique.over = false; Chronique.layout(); return; }
  var open = document.querySelector(".ksheet, .full-menu, .kwin-veil.show, .kwin-overlay");
  if (open && open.offsetParent !== null) return;
  var tab = CHRON_KEYS[e.key];
  if (tab) {
    if (typeof isTabUnlocked === "function" && !isTabUnlocked(tab)) return;
    e.preventDefault();
    if (typeof switchTab === "function") switchTab(tab);
  } else if (e.key === "c" || e.key === "C") {
    e.preventDefault();
    Chronique.toggle();
  }
}

window.Chronique = Chronique;
window.renderChronique = function () { Chronique.render(false); };
if (typeof document !== "undefined" && typeof window.addEventListener === "function") {
  var chronResizeT = 0;
  window.addEventListener("resize", function () { clearTimeout(chronResizeT); chronResizeT = setTimeout(function () { Chronique.layout(); }, 200); });
  document.addEventListener("keydown", chroniqueKeydown);
}
