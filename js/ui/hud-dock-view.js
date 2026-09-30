"use strict";
/* ui/hud-dock-view.js — v3.396.0 (lot HUD-1, atelier HUD validé par Seb le 30/09/2026) :
   les raccourcis sortent du bandeau du HUD et deviennent des bulles, en bas à droite au-dessus
   de la barre du menu, affichées quand il y a quelque chose à faire.
   Règles de Seb :
   - fil rouge : toujours présent, en petite bulle discrète ; plus grand avec « ! » si urgent ;
   - sac : comme avant, visible dès que l'inventaire contient des objets, avec leur nombre ;
   - talents : quand un point est à placer (remplace la pastille « Up » du portrait).
   Trois bulles au plus, la plus importante en bas (sous le pouce). Une lueur et le libellé à
   l'apparition, une seule fois : jamais d'animation en boucle (pas de pression).
   renderHud tourne à chaque image : le calque n'est réécrit que si son contenu change. */

var HUD_DOCK_ICONS = { bag: "images/Icons/menu_icons/equip_menu.png", talent: "images/Icons/talents/up_icon.png" };
var hudDockLastKey = null;
var hudDockSeen = null;   // bulles affichées au rendu précédent (null : premier rendu, pas de lueur)
var hudDockFilId = null;  // proposition du fil rouge au rendu précédent

function mountHudDock() {
  if (typeof document === "undefined" || !document.body || document.getElementById("hud-dock")) return;
  var el = document.createElement("div");
  el.id = "hud-dock";
  el.className = "hud-dock";
  document.body.appendChild(el);
}
window.mountHudDock = mountHudDock;

/* Situations actives, la plus importante d'abord. */
function hudDockItems() {
  var out = [];
  var n = typeof getTalentsAvailableCount === "function" ? Number(getTalentsAvailableCount() || 0) : 0;
  if (n > 0) out.push({ k: "talent", icon: HUD_DOCK_ICONS.talent, badge: n > 1 ? String(n) : "",
    tip: _tn(n, "Un point de talent à placer", "{n} points de talent à placer", { n: n }), go: "switchTab('talents')" });
  var c = Array.isArray(game.inventory) ? game.inventory.length : 0;
  if (c > 0) out.push({ k: "bag", icon: HUD_DOCK_ICONS.bag, badge: c > 99 ? "99+" : String(c),
    tip: _tn(c, "{n} objet dans le sac", "{n} objets dans le sac", { n: c }), go: "openBagFromHud()" });
  return out;
}
function hudDockFil() {
  if ((window.Prefs && !Prefs.get("filRouge")) || !window.FilRouge) return null;
  var a = FilRouge.get();
  return { k: "fil", id: a.id, icon: a.icon, urgent: !!a.urgent, tip: _td(a.title), go: "openFilRougeBubble()" };
}

/* Ordre d'affichage, de haut en bas : la plus importante en bas.
   Fil rouge urgent : il compte parmi les trois et se place en bas.
   Fil rouge au calme : petite bulle tout en haut, plus deux situations au plus. */
function hudDockOrder(fil, items) {
  if (fil && fil.urgent) return [fil].concat(items).slice(0, 3).reverse();
  return (fil ? [fil] : []).concat(items.slice(0, 2).reverse());
}

function hudDockBubbleHTML(it, isNew) {
  var quiet = it.k === "fil" && !it.urgent;
  var ico = typeof renderIconOrEmojiHTML === "function" ? renderIconOrEmojiHTML(it.icon, "hud-bub-ico", it.tip) : '<img class="hud-bub-ico" src="' + esc(it.icon) + '" alt="">';
  var badge = it.k === "fil" ? (it.urgent ? "!" : "") : it.badge;
  return '<button type="button" class="hud-bub' + (quiet ? " is-quiet" : "") + (it.k === "fil" ? " is-fil" : "") + (isNew ? " is-new" : "") +
    '" data-k="' + it.k + '" onclick="' + it.go + '" aria-label="' + esc(it.k === "fil" ? _t("Fil rouge : que faire maintenant") + " — " + it.tip : it.tip) + '">' +
    ico + (it.k === "fil" ? '<span class="hud-fr-thread"></span>' : '') +
    (badge ? '<span class="hud-bub-badge">' + esc(badge) + '</span>' : '') +
    '<span class="hud-bub-tip">' + esc(it.tip) + '</span></button>';
}

function renderHudDock() {
  var root = document.getElementById("hud-dock");
  if (!root) { mountHudDock(); root = document.getElementById("hud-dock"); if (!root) return; }
  var fil = hudDockFil(), list = hudDockOrder(fil, hudDockItems());
  var key = list.map(function (it) { return it.k + ":" + (it.badge || "") + ":" + (it.urgent ? 1 : 0) + ":" + (it.id || "") + ":" + it.icon; }).join("|");
  if (key === hudDockLastKey) return;
  hudDockLastKey = key;
  var first = hudDockSeen === null, prev = hudDockSeen || {}, now = {};
  var filChanged = !!fil && hudDockFilId !== null && hudDockFilId !== fil.id;
  root.innerHTML = list.map(function (it) {
    now[it.k] = true;
    var isNew = !first && (!prev[it.k] || (it.k === "fil" && (filChanged || (it.urgent && !prev.filUrgent))));
    return hudDockBubbleHTML(it, isNew);
  }).join("");
  if (fil && fil.urgent) now.filUrgent = true;
  hudDockSeen = now;
  hudDockFilId = fil ? fil.id : null;
  // Le libellé des nouvelles bulles s'affiche deux secondes, puis s'efface
  Array.prototype.forEach.call(root.querySelectorAll(".hud-bub.is-new"), function (b) {
    b.classList.add("show-tip");
    setTimeout(function () { b.classList.remove("show-tip"); }, 2200);
  });
}
window.renderHudDock = renderHudDock;

/* v3.401.0 (lot O-1, choix de Seb « bulles remontées ») : sur un écran à sous-onglets du bas
   (Village, Héros, Bestiaire…), les bulles recouvraient le 3e sous-onglet. On mesure l'écart
   entre la barre du menu et la barre des sous-onglets, et les bulles montent d'autant
   (variable --hud-dock-lift lue par .hud-dock, css/02-layout.css). Appelé après chaque
   rendu du panneau et au redimensionnement ; n'écrit que si la valeur change. */
var hudDockLift = null;
function liftHudDock() {
  if (typeof document === "undefined" || !document.body || !document.body.style || typeof document.querySelector !== "function") return;
  var bar = document.querySelector("#panel-container .subtab-bar-wrapper .pc-subtab-bar");
  var tab = document.getElementById("tab-bar");
  var lift = 0;
  if (bar && tab && typeof bar.getBoundingClientRect === "function" && typeof tab.getBoundingClientRect === "function") {
    var f = (window.DesktopScale && typeof DesktopScale.factorOf === "function") ? (DesktopScale.factorOf(bar) || 1) : 1;
    var dy = (tab.getBoundingClientRect().top - bar.getBoundingClientRect().top) / f;
    if (dy > 0 && dy < 240) lift = Math.round(dy);
  }
  if (lift === hudDockLift) return;
  hudDockLift = lift;
  document.body.style.setProperty("--hud-dock-lift", lift + "px");
}
window.liftHudDock = liftHudDock;
if (typeof window.addEventListener === "function") window.addEventListener("resize", function () { hudDockLift = null; liftHudDock(); });
window.hudDockOrder = hudDockOrder;
window.hudDockItems = hudDockItems;
