"use strict";
/* ui/modal.js — 2 modales génériques : confirmation (oui/non+callback) et retour hors-ligne (résumé des gains). */

var _confirmModalCallback = null;
var _confirmModalCancel = null; // v3.734.0 : action du bouton de refus (labels.onCancel), facultative

function showConfirmModal(title, text, icon, onConfirm, labels) {
  var modal = document.getElementById("confirm-modal");
  if (!modal) {
    if (window.confirm((title ? title + "\n\n" : "") + (text || ""))) {
      if (typeof onConfirm === "function") onConfirm();
    }
    return;
  }

  var titleEl = document.getElementById("confirm-title");
  var textEl = document.getElementById("confirm-text");
  var iconEl = document.getElementById("confirm-icon");

  if (titleEl) titleEl.textContent = title || _t("Confirmer");
  if (textEl) textEl.textContent = text || "";
  if (iconEl) iconEl.innerHTML = renderIconOrEmojiHTML(icon || "images/Icons/system/ascension.webp", "confirm-icon-img", "");
  // CPL3-10 : libellés des boutons au choix (fenêtre de langue bilingue), sinon ceux par défaut
  var btnNo = modal.querySelector(".confirm-btn.cancel"), btnOk = modal.querySelector(".confirm-btn.ok");
  if (btnNo) btnNo.textContent = (labels && labels.cancel) || _t("Annuler");
  if (btnOk) btnOk.textContent = (labels && labels.ok) || _t("Confirmer");

  _confirmModalCallback = typeof onConfirm === "function" ? onConfirm : null;
  _confirmModalCancel = labels && typeof labels.onCancel === "function" ? labels.onCancel : null; // v3.734.0 (Seb 07/11) : le refus peut aussi agir
  modal.classList.add("show");
  if (window.kDialog) kDialog.open(modal.querySelector(".kwin"), document.activeElement); // CPL3-5
}

function closeConfirmModal(confirmed) {
  var modal = document.getElementById("confirm-modal");
  if (modal) modal.classList.remove("show");
  if (modal && window.kDialog) kDialog.close(modal.querySelector(".kwin")); // CPL3-5 : avant le rappel, qui peut rouvrir une fenêtre

  var cb = _confirmModalCallback;
  var no = _confirmModalCancel;
  _confirmModalCallback = null; _confirmModalCancel = null;

  if (confirmed && typeof cb === "function") cb();
  else if (!confirmed && typeof no === "function") no();
}

window.showConfirmModal = showConfirmModal;
window.closeConfirmModal = closeConfirmModal;

/* v3.113.0 : la modale de retour affiche désormais la PRODUCTION accumulée pendant
   l'absence (zones + ateliers), plus aucun or/essence/kill de village — voir OfflineManager. */
function showOfflineModal(offline) {
  var modal = document.getElementById("offline-modal");
  if (!modal || !offline) return;

  var timeEl = document.getElementById("offline-time");
  var rewardsEl = document.getElementById("offline-rewards");

  var totalMinutes = Math.floor((offline.ms || 0) / 60000);
  var hours = Math.floor(totalMinutes / 60);
  var minutes = totalMinutes % 60;
  var timeText = _t("Absent depuis {d}", { d: hours > 0 ? (hours + "h" + (minutes ? minutes + "m" : "")) : (minutes + "m") });
  if (timeEl) timeEl.textContent = timeText;

  if (rewardsEl) {
    var rows = [];

    var pushResourceRow = function (key, amount, suffix) {
      var def = typeof WAREHOUSE_RESOURCES !== "undefined" ? WAREHOUSE_RESOURCES[key] : null;
      var iconHTML = def && def.icon ? renderIconOrEmojiHTML(def.icon, "offline-reward-icon", _td(def.name)) : '<img class="offline-reward-icon" src="images/Icons/system/warehouse_supplies.webp" alt="">';
      rows.push('<div class="offline-reward-row">' + iconHTML + ' +' + formatNumber(amount) + ' ' + esc(def ? _td(def.name) : key) + (suffix || "") + '</div>');
    };

    Object.keys(offline.produced || {}).forEach(function (key) {
      pushResourceRow(key, offline.produced[key], "");
    });
    Object.keys(offline.crafted || {}).forEach(function (key) {
      pushResourceRow(key, offline.crafted[key], " " + _t("(atelier)"));
    });

    if (offline.fullPlots > 0) {
      rows.push('<div class="offline-reward-row"><img class="ico-inline" src="images/Icons/system/warning.webp" alt=""> ' + _tn(offline.fullPlots, "{n} zone pleine sur {m} — pense à récolter !", "{n} zones pleines sur {m} — pense à récolter !", { m: offline.openPlots }) + '</div>');
    }

    rewardsEl.innerHTML = rows.join("");
  }

  modal.classList.add("show");
}

function closeOfflineModal() {
  var modal = document.getElementById("offline-modal");
  if (modal) modal.classList.remove("show");
}

window.showOfflineModal = showOfflineModal;
window.closeOfflineModal = closeOfflineModal;

/* v3.399.0 (lot F-1, habillage C · Mixte validé par Seb) : en-tête commun des feuilles du bas.
   Bandeau de pierre (poignée, icône, titre, sous-titre) et bouton rond de fermeture en haut
   à droite ; le corps reste en parchemin. Une seule source pour toutes les feuilles : changer
   d'habillage plus tard ne touche que les jetons --sheet-* de css/00-tokens.css.
   o.title, o.icon, o.sub : HTML déjà échappé par l'appelant. o.close : code JS du onclick. */
function kSheetHeadHTML(o) {
  o = o || {};
  var h = '<div class="ksheet-head' + (o.cls ? ' ' + o.cls : '') + '"><div class="ksheet-handle"></div>';
  h += '<div class="ksheet-title">' + (o.icon || '') + '<span class="ksheet-ttl">' + (o.title || '')
    + (o.sub ? '<small class="ksheet-sub">' + o.sub + '</small>' : '') + '</span></div>';
  if (o.close) h += '<button type="button" class="ksheet-x" onclick="' + o.close + '" aria-label="' + esc(_t("Fermer")) + '"></button>';
  return h + '</div>';
}
window.kSheetHeadHTML = kSheetHeadHTML;

/* v3.563.0 (retour Seb) : position de défilement d'une feuille qu'on redessine. Ce qui défile est la
   feuille (.full-menu), pas .ksheet-body : on lit le plus grand des deux et on remet la valeur sur les deux. */
function getSheetScroll(root) {
  if (!root || !root.querySelectorAll) return 0;
  var top = 0;
  root.querySelectorAll(".full-menu, .ksheet-body").forEach(function (el) { top = Math.max(top, el.scrollTop || 0); });
  return top;
}
function setSheetScroll(root, top) {
  if (!root || !root.querySelectorAll || !top) return;
  root.querySelectorAll(".full-menu, .ksheet-body").forEach(function (el) { el.scrollTop = top; });
}
window.getSheetScroll = getSheetScroll;
window.setSheetScroll = setSheetScroll;

/* v3.400.0 (lot F-2) : en-tête des fenêtres centrées (.kwin). Même pierre que les feuilles,
   centré : grande icône, titre, sous-titre. La croix est facultative : une fenêtre qui attend
   une réponse (confirmation, choix, fin de quête) se ferme par ses propres boutons.
   o.icon, o.title, o.sub : HTML déjà échappé par l'appelant. o.close : code JS du onclick. */
function kWinHeadHTML(o) {
  o = o || {};
  var h = '<div class="ksheet-head kwin-head' + (o.cls ? ' ' + o.cls : '') + '">';
  if (o.icon) h += '<div class="kwin-ico">' + o.icon + '</div>';
  h += '<div class="kwin-ttl">' + (o.title || '') + (o.sub ? '<small class="ksheet-sub">' + o.sub + '</small>' : '') + '</div>';
  if (o.close) h += '<button type="button" class="ksheet-x" onclick="' + o.close + '" aria-label="' + esc(_t("Fermer")) + '"></button>';
  return h + '</div>';
}
window.kWinHeadHTML = kWinHeadHTML;

/* v3.703.0 (CPL3-5, atelier « Fenêtres », Seb A) : feuilles et fenêtres modales au clavier et au lecteur d'écran.
   Un observateur du DOM appelle open/close pour chaque fenêtre (innerHTML = "" compris) ; Échap reste à backNavCloseTop. */
var kDialog = (function () {
  var SEL = ".ksheet, .full-menu, .kwin";
  var LAYER = ".kwin-veil, .full-menu-overlay, .hf-sheet-bg, .pwa-install-layer";
  var KEEP = { "toast": 1, "howto-toast-root": 1, "pwa-update-banner": 1 }; // jamais inertes (toasts, mise à jour)
  var FOCUSABLE = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex], [contenteditable="true"]';
  var stack = [], managed = [], uid = 0, touch = null, touchAt = 0, lastIn = null;

  function shown(el) {
    return !!el && el.isConnected && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  }
  function zOf(el) {
    var best = 0;
    for (var e = el; e && e !== document.body; e = e.parentElement) {
      var v = parseInt(getComputedStyle(e).zIndex, 10);
      if (!isNaN(v) && v > best) best = v;
    }
    return best;
  }
  function find(win) { for (var i = 0; i < stack.length; i++) if (stack[i].win === win) return i; return -1; }
  function inside(win, el) { return !!el && !!win && (el === win || win.contains(el)); }
  // Clé d'un élément pour le retrouver après un redessin (même onclick, même onglet)
  function keyOf(el) {
    if (!el || el.nodeType !== 1) return null;
    return { id: el.id || "", tag: el.tagName, onclick: el.getAttribute("onclick") || "", tab: el.getAttribute("data-tab") || "", cls: String(el.className || ""), txt: (el.textContent || "").trim().slice(0, 40) };
  }
  function refind(k, scope) {
    if (!k) return null;
    if (k.id && !scope) return document.getElementById(k.id);
    if (!k.onclick && !k.tab && !k.cls) return null;
    var list = (scope || document).querySelectorAll(k.tag), best = null, byCls = !k.onclick && !k.tab;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if ((e.getAttribute("onclick") || "") !== k.onclick || (e.getAttribute("data-tab") || "") !== k.tab || e.closest("[inert]") || !shown(e)) continue;
      if (byCls && String(e.className || "") !== k.cls) continue; // sans onclick : même classe et même texte
      if (byCls && (e.textContent || "").trim().slice(0, 40) !== k.txt) continue;
      if ((e.textContent || "").trim().slice(0, 40) === k.txt) return e;
      if (!best) best = e;
    }
    return best;
  }
  function focusEl(el) { if (!el || !el.focus) return; try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }
  function tabbables(win) {
    return Array.prototype.filter.call(win.querySelectorAll(FOCUSABLE), function (e) {
      return !e.disabled && e.tabIndex >= 0 && !e.closest("[inert]") && shown(e);
    });
  }
  // Nom : le titre seul ; un sous-titre (.ksheet-sub) passe en description
  function label(win) {
    var t = win.querySelector(".ksheet-ttl, .kwin-ttl, .full-menu-header h2, .full-menu-header h3");
    if (!t) return;
    var sub = t.querySelector(".ksheet-sub"), lab = t;
    if (sub) {
      lab = t.querySelector(".kdlg-t");
      if (!lab) {
        var kids = Array.prototype.filter.call(t.childNodes, function (n) { return n !== sub && (n.nodeType === 1 || String(n.nodeValue).trim()); });
        if (kids.length === 1 && kids[0].nodeType === 1) lab = kids[0];
        else { lab = document.createElement("span"); lab.className = "kdlg-t"; kids.forEach(function (n) { lab.appendChild(n); }); t.insertBefore(lab, sub); }
      }
      if (!sub.id) sub.id = "kdlg-d" + (++uid);
      win.setAttribute("aria-describedby", sub.id);
    }
    if (!lab.id) lab.id = "kdlg-t" + (++uid);
    win.setAttribute("aria-labelledby", lab.id);
  }
  function prep(win) {
    if (!win.getAttribute("role")) win.setAttribute("role", "dialog");
    win.setAttribute("aria-modal", "true");
    if (!win.hasAttribute("tabindex")) win.setAttribute("tabindex", "-1");
    label(win);
  }
  // Calque hors kit (prologue, moment de boss, conversation, nuit…) affiché au-dessus de la fenêtre du dessus
  var PAGE = { "panel-container": 1, "hud": 1, "tab-bar": 1, "game-area": 1, "stats-bar": 1, "combat-speed-bar": 1 };
  function fixedAbove(el, zt, depth) {
    var cs = getComputedStyle(el);
    if (cs.display === "none") return false;
    if (cs.position === "fixed" && el.getClientRects().length && cs.visibility !== "hidden") return (parseInt(cs.zIndex, 10) || 0) > zt;
    for (var i = 0; depth < 3 && i < el.children.length; i++) if (fixedAbove(el.children[i], zt, depth + 1)) return true;
    return false;
  }
  function foreignAbove(top) {
    var zt = zOf(top);
    return Array.prototype.some.call(document.body.children, function (c) {
      if (PAGE[c.id] || KEEP[c.id] || /^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(c.tagName)) return false;
      for (var i = 0; i < stack.length; i++) if (c.contains(stack[i].win)) return false;
      return fixedAbove(c, zt, 0);
    });
  }
  var suspended = false;
  // Inertes : les voisins de la fenêtre du dessus, à chaque niveau jusqu'à <body> (son voile reste actif)
  function applyInert() {
    var top = stack.length ? stack[stack.length - 1].win : null, want = [];
    suspended = !!top && foreignAbove(top); // un calque hors kit au-dessus : kDialog s'efface (ni inert ni boucle)
    if (top && !suspended) {
      var node = top.closest(LAYER) || top;
      for (var n = node; n && n.parentElement && n !== document.body; n = n.parentElement) {
        Array.prototype.forEach.call(n.parentElement.children, function (c) {
          if (c === n || /^(SCRIPT|STYLE|LINK|TEMPLATE)$/.test(c.tagName) || KEEP[c.id]) return;
          if (n === top && c.classList.contains("ksheet-backdrop")) return;
          want.push(c);
        });
      }
    }
    managed = managed.filter(function (c) {
      if (want.indexOf(c) >= 0 && c.isConnected) return true;
      c.removeAttribute("inert");
      return false;
    });
    want.forEach(function (c) { if (!c.hasAttribute("inert")) { c.setAttribute("inert", ""); managed.push(c); } });
  }
  function sortStack() {
    var order = stack.map(function (s, i) { return { s: s, i: i, z: zOf(s.win) }; });
    order.sort(function (a, b) { return a.z - b.z || a.i - b.i; });
    stack = order.map(function (o) { return o.s; });
  }
  function pickOrigin(win) {
    var a = document.activeElement;
    if (a && a !== document.body && a !== document.documentElement && !inside(win, a)) return a;
    if (touch && touch.isConnected && !inside(win, touch) && Date.now() - touchAt < 2000) return touch;
    return null;
  }

  function open(win, origin) {
    if (!win || find(win) >= 0) return;
    prep(win);
    var o = origin && origin.nodeType === 1 && origin !== document.body && !inside(win, origin) ? origin : pickOrigin(win);
    stack.push({ win: win, origin: o, key: keyOf(o) });
    sortStack();
    applyInert();
    if (stack[stack.length - 1].win === win && !inside(win, document.activeElement)) focusEl(win);
  }
  // Rend le focus à l'origine (ou à son double après un redessin), sinon à la fenêtre restée dessous
  function giveBack(entry) {
    var top = stack.length ? stack[stack.length - 1].win : null, a = document.activeElement;
    if (top && inside(top, a)) return;
    if (!top && a && a !== document.body && a.isConnected && !a.closest("[inert]")) return;
    var o = entry.origin && entry.origin.isConnected && !entry.origin.closest("[inert]") ? entry.origin : refind(entry.key);
    if (o && (!top || inside(top, o))) { focusEl(o); return; }
    if (top) focusEl(top);
  }
  function close(win) {
    var i = win ? find(win) : stack.length - 1;
    if (i < 0) return;
    var entry = stack.splice(i, 1)[0];
    applyInert();
    giveBack(entry);
  }

  // Rapproche la pile du DOM : fenêtres apparues, disparues, ou redessinées dans le même hôte
  function sync() {
    var live = Array.prototype.filter.call(document.querySelectorAll(SEL), function (w) {
      var up = w.parentElement && w.parentElement.closest(SEL);
      return shown(w) && !(up && shown(up));
    });
    var gone = stack.filter(function (s) { return live.indexOf(s.win) < 0; });
    var fresh = live.filter(function (w) { return find(w) < 0; });
    if (!gone.length && !fresh.length) { if (stack.length) applyInert(); return; }
    var wasTop = stack.length ? stack[stack.length - 1] : null;
    stack = stack.filter(function (s) { return live.indexOf(s.win) >= 0; });
    var reused = [];
    fresh.forEach(function (w) {
      var host = w.closest("[id]"), rep = null;
      gone.forEach(function (g) { if (!rep && reused.indexOf(g) < 0 && g.host === host) rep = g; });
      if (rep) { reused.push(rep); prep(w); stack.push({ win: w, origin: rep.origin, key: rep.key, host: host, redraw: true }); return; }
      var o = pickOrigin(w), k = keyOf(o);
      if (!o && gone.length) { o = gone[0].origin; k = gone[0].key; } // menu → sous-feuille : l'origine du menu suit
      prep(w);
      stack.push({ win: w, origin: o, key: k, host: host });
    });
    stack.forEach(function (s) { if (!s.host) s.host = s.win.closest("[id]"); });
    sortStack();
    applyInert();
    var top = stack.length ? stack[stack.length - 1] : null, a = document.activeElement;
    if (top && fresh.indexOf(top.win) >= 0) {
      if (inside(top.win, a)) return;
      if (top.redraw) { var same = lastIn && refind(lastIn, top.win); focusEl(same || top.win); }
      else focusEl(top.win);
    } else if (wasTop && gone.indexOf(wasTop) >= 0) giveBack(wasTop);
  }

  if (typeof document !== "undefined" && document.addEventListener && "MutationObserver" in window) { // API absente du harnais
    var MATTR = /(^|-)(root|modal)$/;
    var touches = function (n) {
      if (!n || n.nodeType !== 1) return false;
      if (n.matches(SEL) || n.querySelector(SEL)) return true;
      for (var i = 0; i < stack.length; i++) if (n.contains(stack[i].win)) return true;
      return false;
    };
    var mo = new MutationObserver(function (recs) {
      for (var i = 0; i < recs.length; i++) {
        var r = recs[i], t = r.target;
        if (r.type === "attributes") { if (t.nodeType === 1 && (MATTR.test(t.id) || t.matches(LAYER) || t.matches(SEL))) { sync(); return; } continue; }
        if (stack.length && (t === document.body || t.parentElement === document.body)) { sync(); return; } // calque hors kit posé ou retiré
        var j;
        for (j = 0; j < r.addedNodes.length; j++) if (touches(r.addedNodes[j])) { sync(); return; }
        for (j = 0; j < r.removedNodes.length; j++) if (touches(r.removedNodes[j])) { sync(); return; }
      }
    });
    var start = function () { if (document.body) mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] }); };
    if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
    // Origine d'une fenêtre ouverte au toucher (Safari ne donne pas le focus aux boutons touchés)
    document.addEventListener("pointerdown", function (e) {
      var t = e.target && e.target.closest ? e.target.closest(FOCUSABLE + ', [role="button"]') : null;
      if (t) { touch = t; touchAt = Date.now(); }
    }, true);
    document.addEventListener("focusin", function (e) {
      var top = stack.length ? stack[stack.length - 1].win : null;
      if (top && inside(top, e.target) && e.target !== top) lastIn = keyOf(e.target);
    }, true);
    // Tab et Maj+Tab bouclent dans la fenêtre du dessus
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Tab" || !stack.length || suspended) return;
      var win = stack[stack.length - 1].win, list = tabbables(win), a = document.activeElement;
      if (!list.length) { e.preventDefault(); focusEl(win); return; }
      var first = list[0], last = list[list.length - 1];
      if (!inside(win, a)) { e.preventDefault(); focusEl(e.shiftKey ? last : first); }
      else if (e.shiftKey && (a === first || a === win)) { e.preventDefault(); focusEl(last); }
      else if (!e.shiftKey && a === last) { e.preventDefault(); focusEl(first); }
    }, true);
  }

  return { open: open, close: close, sync: sync, stack: function () { return stack.slice(); }, inertCount: function () { return managed.length; } };
})();
window.kDialog = kDialog;
