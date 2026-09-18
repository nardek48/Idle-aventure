"use strict";
/* ui/living-map-view.js — v3.256.0 (Cartes Vivantes, lot C-2) : la carte vivante d'un monde.
   Rapport de conception v1.0 §9 ; rendu porté d'atelier-cartes.html (C-0), validé sur iPhone
   par Seb le 15/09/2026 (rayon 19 %, brume 36 %).

   v3.292.0 (équilibrage Forêt, ateliers A1-A3 validés par Seb le 18/09/2026) :
   - PLEIN ÉCRAN : seul le menu du bas reste (body.living-map-active masque le HUD) ; en-tête
     en pastilles posées sur la carte, bouton retour, ⓘ pour la popup du monde.
   - ZOOM : glisser (avec élan), pincer, double tap ; ouverture en « Couvrant » (la carte
     remplit la hauteur), zoom max ×2, jamais sous Couvrant. Les repères gardent 44 px.
   - VOLET du secteur au-dessus du menu, secteur recadré dans la partie visible.
   - Légende repliable, repère d'un secteur hors écran (expédition en cours), bouton ◎.
   Les gestes sont écoutés sur document (délégation) : renderPanel peut réécrire la carte à
   tout moment sans casser un glissé ; la vue (taille, position) vit dans lmxView.

   Sous-vue de l'onglet Carte : buildMapHTML() (ui/map-view.js) délègue ici quand une carte
   est ouverte (livingMapOpenId). Toute la logique d'état est lue sur LivingMapManager. */

var livingMapOpenId = null;   // id de carte ouverte, ou null (carte du monde)
var livingMapSelected = null; // id de secteur, "village", ou null

var LIVING_MAP_RADIUS_PCT = 19;  // rayon d'un secteur, % de la carte (validé C-0)
var LIVING_MAP_FOG_OPACITY = 0.36; // opacité de la brume (validé C-0)

var LMX_ZOOM_MAX = 2;      // décision Seb (A2) : ×2 par rapport au cadrage Couvrant
var LMX_TOP_SLACK = 112;   // A3b : la carte peut descendre sous l'en-tête (pastilles)
var LMX_TAP_SLOP = 8;      // px avant qu'un appui devienne un glissé
var LMX_DOUBLE_TAP_MS = 300;

/* Vue courante : largeur de la carte en px (w, hauteur = w, cartes carrées) et position. */
var lmxView = { mapId: null, w: 0, tx: 0, ty: 0 };
var lmxLegendOpen = false;
var lmxPendingCenter = false;  // recadrer sur la sélection au prochain rendu
var lmxLastSheetSel = null;    // pour n'animer le volet qu'à son ouverture

function syncLivingMapBodyClass() {
  if (typeof document === "undefined" || !document.body || !document.body.classList) return;
  document.body.classList.toggle("living-map-active", game.activeTab === "map" && !!livingMapOpenId);
}
window.syncLivingMapBodyClass = syncLivingMapBodyClass;

function openLivingMap(mapId, sectorId) {
  if (!window.LivingMapManager || !LivingMapManager.getMap(mapId)) return;
  livingMapOpenId = mapId;
  livingMapSelected = sectorId || null;
  lmxView.mapId = null;            // nouvelle ouverture : cadrage d'ouverture
  lmxLegendOpen = false;
  lmxPendingCenter = !!sectorId;
  if (game.activeTab === "map") refreshLivingMap();
  else if (typeof switchTab === "function") switchTab("map");
  syncLivingMapBodyClass();
}
window.openLivingMap = openLivingMap;

function closeLivingMap() {
  livingMapOpenId = null;
  livingMapSelected = null;
  lmxLegendOpen = false;
  syncLivingMapBodyClass();
  refreshLivingMap();
}
window.closeLivingMap = closeLivingMap;

function isLivingMapOpen() { return !!livingMapOpenId; }
window.isLivingMapOpen = isLivingMapOpen;

function selectLivingMapSector(id) {
  livingMapSelected = id || null;
  lmxPendingCenter = !!id;
  refreshLivingMap();
}
window.selectLivingMapSector = selectLivingMapSector;

/* Taps venus de la carte : ignorés s'ils terminent un glissé. */
function lmxTapSector(id) { if (lmxGesture.suppressClick) return; selectLivingMapSector(id); }
window.lmxTapSector = lmxTapSector;
function lmxTapBackground() {
  if (lmxGesture.suppressClick) return;
  if (lmxLegendOpen) { lmxLegendOpen = false; refreshLivingMap(); return; }
  if (livingMapSelected) selectLivingMapSector(null);
}
window.lmxTapBackground = lmxTapBackground;
function lmxToggleLegend() { lmxLegendOpen = !lmxLegendOpen; refreshLivingMap(); }
window.lmxToggleLegend = lmxToggleLegend;

/* Rafraîchit l'onglet Carte sans repasser par switchTab (même pattern que refreshSceneScreen). */
function refreshLivingMap() {
  var container = document.getElementById("panel-container");
  if (container && game.activeTab === "map" && typeof buildMapHTML === "function") {
    container.innerHTML = buildMapHTML();
    if (window.decoratePageFrames) decoratePageFrames(container);
  }
}
window.refreshLivingMap = refreshLivingMap;

function startLivingMapSector(id) {
  if (!window.LivingMapManager || !livingMapOpenId) return;
  var r = LivingMapManager.start(livingMapOpenId, id);
  if (!r.ok) { if (typeof showToast === "function") showToast(r.reason, 1800); refreshLivingMap(); }
}
window.startLivingMapSector = startLivingMapSector;

/* ---------- Helpers de rendu ---------- */

function livingMapIntensityLabel(intensityId) {
  var it = window.SCENE_INTENSITY && SCENE_INTENSITY[intensityId];
  return it ? it.label : intensityId;
}

function livingMapContentLabel(mapId, def) {
  var LM = LivingMapManager;
  var content = LM.getContentFor(mapId, def.id);
  var intensity = livingMapIntensityLabel(LM.getIntensity(def));
  if (!content) return intensity;
  if (content.type === "elite") {
    var e = window.ELITE_DB && ELITE_DB[content.eliteId];
    return (content.repeatable ? "Élite répétable : " : "Élite : ") + (e ? e.name : content.eliteId) + " · " + intensity;
  }
  return "Expédition · " + intensity;
}

function livingMapMask(map, ids) {
  var r = LIVING_MAP_RADIUS_PCT;
  return ids.map(function (id) {
    var d = LivingMapManager.getSectorDef(map.id, id);
    return "radial-gradient(circle at " + d.x + "% " + d.y + "%, #000 0 " + (Math.round(r * 55) / 100) + "%, transparent " + r + "%)";
  }).join(", ");
}

/* Un run ciblé en cours sur ce secteur (expédition ou combat d'élite) ? */
function livingMapRunningSector(mapId) {
  var run = game.sceneRun;
  if (run && run.status !== "completed" && run.livingMap && run.livingMap.mapId === mapId) return run.livingMap.sectorId;
  var f = LivingMapManager.getFight();
  if (f && f.mapId === mapId) return f.sectorId;
  return null;
}

/* ---------- Écran ---------- */

function buildLivingMapHTML(mapId) {
  var LM = window.LivingMapManager;
  var map = LM && LM.getMap(mapId);
  if (!map) return "";
  var sum = LM.getSummary(mapId);
  var pal = LM.getPalisadeLevel();
  var seve = (window.WarehouseManager && typeof WarehouseManager.getAmount === "function") ? WarehouseManager.getAmount("seve_aeswyn") : 0;
  var running = livingMapRunningSector(mapId);
  var worldIndex = window.WORLDS ? WORLDS.findIndex(function (w) { return w.id === map.worldId; }) : -1;

  var h = '<div class="lmx" id="lmx-root" data-map="' + esc(mapId) + '">';

  /* Scène : taille et position reprises de lmxView (un nouveau rendu ne fait pas sauter la vue) */
  h += '<div class="lmx-viewport" id="lmx-vp">';
  h += '<div class="lmx-stage" id="lmx-stage"' + (lmxView.mapId === mapId && lmxView.w
    ? ' style="width:' + lmxView.w + 'px;height:' + lmxView.w + 'px;transform:translate3d(' + lmxView.tx + 'px,' + lmxView.ty + 'px,0)"'
    : ' style="visibility:hidden"') + '>';

  /* Carte : image nue, brume (voilé), Recouvrement (recouvert), liens, nœuds */
  var fogIds = [], coverIds = [];
  map.sectors.forEach(function (d) {
    var st = LM.getState(mapId, d.id).state;
    if (st === "voile") fogIds.push(d.id);
    if (st === "recouvert") coverIds.push(d.id);
  });
  h += '<div class="lm-map" style="--lm-r:' + LIVING_MAP_RADIUS_PCT + ';--lm-fog:' + LIVING_MAP_FOG_OPACITY + ';" onclick="lmxTapBackground()">';
  h += '<div class="lm-layer lm-base" style="background-image:url(\'' + esc(map.asset) + '\')"></div>';
  if (fogIds.length) {
    var mf = livingMapMask(map, fogIds);
    h += '<div class="lm-layer lm-fog is-on" style="background-image:url(\'' + esc(map.asset) + '\');-webkit-mask-image:' + mf + ';mask-image:' + mf + ';"></div>';
  }
  if (coverIds.length) {
    var mc = livingMapMask(map, coverIds);
    h += '<div class="lm-layer lm-cover is-on" style="background-image:url(\'' + esc(map.asset) + '\');-webkit-mask-image:' + mc + ';mask-image:' + mc + ';"></div>';
  }

  /* Liens du secteur sélectionné vers ses voisins (et le village pour l'anneau 1) */
  h += '<svg class="lm-links" viewBox="0 0 100 100" preserveAspectRatio="none">';
  var sel = livingMapSelected && livingMapSelected !== "village" ? LM.getSectorDef(mapId, livingMapSelected) : null;
  if (sel) {
    var targets = sel.neighbors.slice();
    if (sel.ring === 1) targets.push("village");
    targets.forEach(function (nid) {
      var p = nid === "village" ? map.village : LM.getSectorDef(mapId, nid);
      if (!p) return;
      h += '<path d="M' + sel.x + ' ' + sel.y + ' L' + p.x + ' ' + p.y + '" vector-effect="non-scaling-stroke"></path>';
    });
  }
  h += '</svg>';

  /* Village */
  h += '<button type="button" class="lm-node is-village' + (livingMapSelected === "village" ? " is-selected" : "") + '" style="left:' + map.village.x + '%;top:' + map.village.y + '%;" onclick="event.stopPropagation();lmxTapSector(\'village\')">';
  h += '<span class="lm-node-disc">★</span><span class="lm-node-name">' + esc(map.village.name) + '</span></button>';

  /* Secteurs */
  map.sectors.forEach(function (d, i) {
    var s = LM.getState(mapId, d.id);
    var cls = "lm-node is-" + s.state;
    if (s.state === "voile") {
      if (!LM.isReachable(mapId, d.id)) cls += " is-far";
      else if (LM.isNameRevealed(mapId, d.id)) cls += " is-named";
    }
    if (LM.isProtected(mapId, d.id)) cls += " is-protege";
    if (livingMapSelected === d.id) cls += " is-selected";
    if (running === d.id) cls += " is-running";
    if (d.x > 84) cls += " is-edge-r"; else if (d.x < 14) cls += " is-edge-l";
    if (d.labelTop) cls += " is-label-top";
    h += '<button type="button" class="' + cls + '" style="left:' + d.x + '%;top:' + d.y + '%;" onclick="event.stopPropagation();lmxTapSector(\'' + d.id + '\')">';
    h += '<span class="lm-node-disc">' + (s.state === "voile" ? "?" : String(i + 1)) + '</span>';
    h += '<span class="lm-node-name">' + esc(d.name) + '</span>';
    h += '</button>';
  });

  /* Amers : décor, jamais joués */
  (map.landmarks || []).forEach(function (d) {
    h += '<span class="lm-node is-reserve" style="left:' + d.x + '%;top:' + d.y + '%;"><span class="lm-node-disc">·</span></span>';
  });
  h += '</div>'; // .lm-map
  h += '</div></div>'; // .lmx-stage, .lmx-viewport

  /* En-tête posé sur la carte : retour, pastilles, popup du monde */
  h += '<div class="lmx-hud">';
  h += '<button class="lmx-btn" type="button" aria-label="Carte du monde" onclick="closeLivingMap()">‹</button>';
  h += '<div class="lmx-pills">';
  h += '<span class="lmx-pill is-title">' + sum.libere + '/' + sum.total + ' libérés' + (sum.recouvert ? ' <small>· ' + sum.recouvert + ' repris</small>' : '') + '</span>';
  h += '<span class="lmx-pill"><img class=ico-inline src=images/Icons/resources/seve_aeswyn_icon.png alt=""> ' + seve + '</span>';
  h += '<span class="lmx-pill is-pal">Palissade ' + pal + '</span>';
  h += '</div>';
  if (worldIndex >= 0) h += '<button class="lmx-btn is-info" type="button" aria-label="Le monde" onclick="openWorldPopup(' + worldIndex + ')">i</button>';
  h += '</div>';

  h += '<button class="lmx-btn lmx-recenter" type="button" aria-label="Recentrer" onclick="lmxRecenter()">◎</button>';

  /* Légende et repère hors écran (placés par lmxAfterRender) */
  h += '<button class="lmx-btn lmx-legend-btn" id="lmx-legend-btn" type="button" aria-label="Légende" onclick="lmxToggleLegend()">?</button>';
  if (lmxLegendOpen) h += buildLivingMapLegendHTML();
  if (running) {
    var rd = LM.getSectorDef(mapId, running);
    h += '<button class="lmx-offscreen" id="lmx-offscreen" type="button" data-x="' + rd.x + '" data-y="' + rd.y + '" onclick="lmxGoTo(' + rd.x + ',' + rd.y + ')">'
       + '<span class="lmx-off-arrow" id="lmx-off-arrow">➜</span><span class="lmx-off-txt">Expédition : ' + esc(LM.isNameRevealed(mapId, running) ? rd.name : "secteur voilé") + '</span></button>';
  }

  /* Volet du secteur, au-dessus du menu */
  if (livingMapSelected) {
    var entering = lmxLastSheetSel !== livingMapSelected ? " is-entering" : "";
    h += '<div class="lmx-sheet' + entering + '" id="lmx-sheet">';
    h += '<div class="lmx-sheet-grab"><span></span></div>';
    h += '<button class="lmx-sheet-close" type="button" aria-label="Fermer" onclick="selectLivingMapSector(null)">✕</button>';
    h += '<div class="lmx-sheet-body">' + buildLivingMapPanelHTML(mapId, running) + '</div>';
    h += '</div>';
  }
  lmxLastSheetSel = livingMapSelected;

  h += '</div>'; // .lmx
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(lmxAfterRender);
  return h;
}
window.buildLivingMapHTML = buildLivingMapHTML;

/* Légende : les sept états, avec leur vraie pastille. */
function buildLivingMapLegendHTML() {
  function node(cls, glyph) { return '<span class="lm-node ' + cls + '"><span class="lm-node-disc">' + glyph + '</span></span>'; }
  function row(n, label, sub) { return '<div class="lmx-legend-row">' + n + '<span>' + label + (sub ? '<small>' + sub + '</small>' : '') + '</span></div>'; }
  var h = '<div class="lmx-legend" id="lmx-legend"><h5>Légende</h5>';
  h += row(node("is-village", "★"), "Foyer", "point de départ, toujours sûr");
  h += row(node("is-voile", "?"), "Voilé", "à découvrir, atteignable");
  h += row(node("is-voile is-far", "?"), "Voilé, trop loin", "libère d'abord un voisin");
  h += row(node("is-libere", "1"), "Libéré", "son effet s'applique");
  h += row(node("is-recouvert", "3"), "Recouvert", "effet perdu, à reprendre");
  h += row(node("is-libere is-protege", "1"), "Tenu par la Palissade", "résiste à l'Ascension");
  h += row(node("is-libere is-running", "4"), "Expédition en cours", "");
  return h + '</div>';
}

/* ---------- Vue : géométrie, zoom, recadrage ---------- */

function lmxVp() { return document.getElementById("lmx-vp"); }
function lmxSheetH() { var s = document.getElementById("lmx-sheet"); return s ? s.getBoundingClientRect().height : 0; }
/* Couvrant : la carte (carrée) remplit toute la zone, jamais de bandes noires. */
function lmxCoverW() { var vp = lmxVp(); return vp ? Math.max(vp.clientWidth, vp.clientHeight) : 0; }
function lmxMaxW() { return lmxCoverW() * LMX_ZOOM_MAX; }

/* Bornes : la carte ne quitte jamais l'écran. Elle peut descendre de LMX_TOP_SLACK sous
   l'en-tête ; volet ouvert, la zone utile s'arrête au haut du volet. */
function lmxClamp() {
  var vp = lmxVp(); if (!vp) return;
  var W = vp.clientWidth, H = vp.clientHeight - lmxSheetH(), w = lmxView.w;
  lmxView.tx = w <= W ? (W - w) / 2 : Math.min(0, Math.max(W - w, lmxView.tx));
  lmxView.ty = w <= H ? (H - w) / 2 : Math.min(LMX_TOP_SLACK, Math.max(H - w, lmxView.ty));
}
function lmxApply(anim) {
  var st = document.getElementById("lmx-stage"); if (!st) return;
  st.classList.toggle("is-anim", !!anim);
  st.style.visibility = "";
  st.style.width = lmxView.w + "px"; st.style.height = lmxView.w + "px";
  st.style.transform = "translate3d(" + lmxView.tx + "px," + lmxView.ty + "px,0)";
  if (anim) setTimeout(lmxUpdateOffscreen, 300); else lmxUpdateOffscreen();
}
function lmxZoomAt(nw, px, py, anim) {
  nw = Math.max(lmxCoverW(), Math.min(lmxMaxW(), nw));
  var u = (px - lmxView.tx) / lmxView.w, v = (py - lmxView.ty) / lmxView.w;
  lmxView.w = nw; lmxView.tx = px - u * nw; lmxView.ty = py - v * nw;
  lmxClamp(); lmxApply(anim);
}
/* Place un point de la carte (x %, y %) au centre de la zone utile (sous l'en-tête, au-dessus du volet). */
function lmxCenterOn(xp, yp, anim) {
  var vp = lmxVp(); if (!vp) return;
  var W = vp.clientWidth, H = vp.clientHeight - lmxSheetH();
  lmxView.tx = W / 2 - xp / 100 * lmxView.w;
  lmxView.ty = (LMX_TOP_SLACK + H) / 2 - yp / 100 * lmxView.w;
  lmxClamp(); lmxApply(anim);
}
function lmxRecenter() {
  var map = window.LivingMapManager && LivingMapManager.getMap(livingMapOpenId); if (!map) return;
  lmxView.w = lmxCoverW(); lmxCenterOn(map.village.x, map.village.y, true);
}
window.lmxRecenter = lmxRecenter;
function lmxGoTo(x, y) { lmxCenterOn(x, y, true); }
window.lmxGoTo = lmxGoTo;

/* Après chaque rendu : cadrage d'ouverture, recadrage sur la sélection, bornes, placements. */
function lmxAfterRender() {
  var root = document.getElementById("lmx-root"), vp = lmxVp();
  syncLivingMapBodyClass();
  if (!root || !vp || !vp.clientWidth) return;
  var mapId = root.getAttribute("data-map");
  var map = window.LivingMapManager && LivingMapManager.getMap(mapId); if (!map) return;
  if (lmxView.mapId !== mapId || !lmxView.w) {
    lmxView.mapId = mapId; lmxView.w = lmxCoverW();
    lmxCenterOn(map.village.x, map.village.y, false);
  } else {
    lmxView.w = Math.max(lmxCoverW(), Math.min(lmxMaxW(), lmxView.w)); // l'écran a pu changer
    lmxClamp(); lmxApply(false);
  }
  if (lmxPendingCenter && livingMapSelected) {
    lmxPendingCenter = false;
    var p = livingMapSelected === "village" ? map.village : LivingMapManager.getSectorDef(mapId, livingMapSelected);
    if (p) lmxCenterOn(p.x, p.y, true);
  }
  /* Légende et « ? » remontent avec le volet */
  var sh = lmxSheetH(), lb = document.getElementById("lmx-legend-btn"), lg = document.getElementById("lmx-legend");
  if (lb) lb.style.bottom = (sh + 10) + "px";
  if (lg) lg.style.bottom = (sh + 58) + "px";
  lmxUpdateOffscreen();
}
window.lmxAfterRender = lmxAfterRender;

/* Repère hors écran : pastille au bord, flèche vers le secteur de l'expédition en cours. */
function lmxUpdateOffscreen() {
  var el = document.getElementById("lmx-offscreen"), vp = lmxVp();
  if (!el || !vp) return;
  var W = vp.clientWidth, H = vp.clientHeight - lmxSheetH();
  var sx = lmxView.tx + Number(el.getAttribute("data-x")) / 100 * lmxView.w;
  var sy = lmxView.ty + Number(el.getAttribute("data-y")) / 100 * lmxView.w;
  var TOP = 118, M = 26;
  if (sx > M && sx < W - M && sy > TOP && sy < H - M) { el.classList.remove("is-on"); return; }
  var ang = Math.atan2(sy - (TOP + H) / 2, sx - W / 2);
  var arrow = document.getElementById("lmx-off-arrow");
  if (arrow) arrow.style.transform = "rotate(" + ang + "rad)";
  el.classList.add("is-on");
  var bw = el.offsetWidth, bh = el.offsetHeight;
  el.style.left = Math.max(bw / 2 + 8, Math.min(W - bw / 2 - 8, sx)) + "px";
  el.style.top = Math.max(TOP, Math.min(H - bh / 2 - 8, sy)) + "px";
}

/* ---------- Gestes (délégués sur document : survivent à un nouveau rendu) ---------- */

var lmxGesture = { pts: {}, mode: null, start: null, moved: false, suppressClick: false, lastTap: 0, vel: { x: 0, y: 0 }, lastMove: 0, raf: 0 };

function lmxLocal(e) { var r = lmxVp().getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
function lmxPts() { return Object.keys(lmxGesture.pts).map(function (k) { return lmxGesture.pts[k]; }); }
function lmxBegin() {
  var p = lmxPts(), g = lmxGesture;
  if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(g.raf);
  if (p.length >= 2) {
    g.mode = "pinch";
    g.start = { d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), m: { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 }, w: lmxView.w, tx: lmxView.tx, ty: lmxView.ty };
  } else if (p.length === 1) {
    g.mode = "pan"; g.start = { x: p[0].x, y: p[0].y, tx: lmxView.tx, ty: lmxView.ty };
    g.vel = { x: 0, y: 0 }; g.lastMove = performance.now();
  }
}
function lmxOnDown(e) {
  if (!e.target || !e.target.closest || !e.target.closest("#lmx-vp")) return;
  var g = lmxGesture;
  g.pts[e.pointerId] = lmxLocal(e);
  if (lmxPts().length === 1) { g.moved = false; g.suppressClick = false; }
  lmxBegin();
}
function lmxOnMove(e) {
  var g = lmxGesture;
  if (!g.pts[e.pointerId] || !lmxVp()) return;
  var prev = g.pts[e.pointerId]; g.pts[e.pointerId] = lmxLocal(e);
  var p = lmxPts(), s = g.start;
  if (g.mode === "pan" && p.length === 1) {
    var dx = p[0].x - s.x, dy = p[0].y - s.y;
    if (!g.moved && Math.hypot(dx, dy) < LMX_TAP_SLOP) return;
    g.moved = true;
    var now = performance.now(), dt = Math.max(1, now - g.lastMove);
    g.vel = { x: (p[0].x - prev.x) / dt, y: (p[0].y - prev.y) / dt }; g.lastMove = now;
    lmxView.tx = s.tx + dx; lmxView.ty = s.ty + dy; lmxClamp(); lmxApply(false);
  } else if (g.mode === "pinch" && p.length >= 2) {
    g.moved = true;
    var m = { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
    var f = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) / s.d;
    var nw = Math.max(lmxCoverW(), Math.min(lmxMaxW(), s.w * f));
    var u = (s.m.x - s.tx) / s.w, v = (s.m.y - s.ty) / s.w;   // point de la carte sous les doigts au départ
    lmxView.w = nw; lmxView.tx = m.x - u * nw; lmxView.ty = m.y - v * nw;
    lmxClamp(); lmxApply(false);
  }
}
function lmxOnUp(e) {
  var g = lmxGesture;
  if (!g.pts[e.pointerId]) return;
  var up = g.pts[e.pointerId]; delete g.pts[e.pointerId];
  if (g.moved) { g.suppressClick = true; setTimeout(function () { g.suppressClick = false; }, 0); }
  if (lmxPts().length) { lmxBegin(); return; }
  if (g.mode === "pan" && g.moved && performance.now() - g.lastMove < 60) lmxMomentum();
  else if (!g.moved) {
    var now = performance.now();
    if (now - g.lastTap < LMX_DOUBLE_TAP_MS) {   // double tap : ×1,8 ; au max, retour Couvrant
      g.lastTap = 0;
      if (lmxView.w >= lmxMaxW() - 1) { lmxView.w = lmxCoverW(); lmxClamp(); lmxApply(true); }
      else lmxZoomAt(lmxView.w * 1.8, up.x, up.y, true);
    } else g.lastTap = now;
  }
  g.mode = null;
}
/* Élan : la carte continue sur sa lancée et ralentit. */
function lmxMomentum() {
  var g = lmxGesture, v = { x: g.vel.x * 16, y: g.vel.y * 16 };
  function step() {
    v.x *= 0.92; v.y *= 0.92;
    if ((Math.abs(v.x) < 0.3 && Math.abs(v.y) < 0.3) || !lmxVp()) return;
    lmxView.tx += v.x; lmxView.ty += v.y; lmxClamp(); lmxApply(false);
    g.raf = requestAnimationFrame(step);
  }
  g.raf = requestAnimationFrame(step);
}
function lmxOnWheel(e) {
  if (!e.target || !e.target.closest || !e.target.closest("#lmx-vp")) return;
  e.preventDefault();
  var pt = lmxLocal(e);
  lmxZoomAt(lmxView.w * Math.pow(1.0015, -e.deltaY), pt.x, pt.y, false);
}
if (typeof document !== "undefined" && document.addEventListener) {
  document.addEventListener("pointerdown", lmxOnDown);
  document.addEventListener("pointermove", lmxOnMove);
  document.addEventListener("pointerup", lmxOnUp);
  document.addEventListener("pointercancel", lmxOnUp);
  document.addEventListener("wheel", lmxOnWheel, { passive: false });
  /* iOS : pas de zoom de la page entière par pincement sur la carte. */
  document.addEventListener("gesturestart", function (e) { if (lmxVp()) e.preventDefault(); });
}
if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("resize", function () { if (lmxVp()) lmxAfterRender(); });
}

/* Contenu du volet (v3.292.0, anciennement panneau sous la carte) : nom, anneau et intensité,
   état, lore, contenu, effet, récompense, bouton ou raison du mur (§2 : le mur n'est jamais
   silencieux). */
function buildLivingMapPanelHTML(mapId, running) {
  var LM = LivingMapManager;
  var map = LM.getMap(mapId);
  var h = '<div class="lm-panel">';

  if (!livingMapSelected) {
    h += '<div class="lm-panel-name">Aeswyn tient la clairière.</div>';
    h += '<p class="lm-panel-lore">Touche un secteur pour voir ce qu\'on en sait. Le Recouvrement ne reprend que ce qu\'on lui laisse : un échec, ou l\'Ascension.</p>';
    return h + '</div>';
  }

  if (livingMapSelected === "village") {
    var pal = LM.getPalisadeLevel(), held = LM.getHeldRing(pal);
    h += '<div class="lm-panel-name">' + esc(map.village.name) + '</div>';
    h += '<p class="lm-panel-lore">Le village hors du Cycle. Les trois secteurs de l\'anneau 1 sont toujours à portée.</p>';
    h += '<p class="lm-panel-line"><b>Palissade niveau ' + pal + '</b> · frein ' + Math.round(LM.getBrakeChance() * 100) + ' % sur l\'échec · '
      + (held ? 'tient l\'anneau ' + (held === 3 ? '1 à 3' : held === 2 ? '1 et 2' : '1') + ' à l\'Ascension' : 'ne tient rien encore à l\'Ascension (niveau 3)') + '</p>';
    return h + '</div>';
  }

  var d = LM.getSectorDef(mapId, livingMapSelected);
  if (!d) return h + '</div>';
  var s = LM.getState(mapId, d.id);
  var known = LM.isNameRevealed(mapId, d.id);
  var protege = LM.isProtected(mapId, d.id);
  var intensity = livingMapIntensityLabel(LM.getIntensity(d));

  h += '<div class="lm-panel-head">';
  h += '<div class="lm-panel-name">' + (known ? esc(d.name) : "Secteur inconnu") + '</div>';
  h += '<div class="lm-panel-meta">Anneau ' + d.ring + ' · ' + esc(intensity) + '</div>';
  h += '</div>';
  var stCls = protege ? "is-protege" : "is-" + s.state;
  var stTxt = protege ? "Libéré · tenu par la Palissade" : s.state === "voile" ? "Voilé" : s.state === "libere" ? "Libéré" : "Recouvert";
  h += '<span class="lm-panel-state ' + stCls + '">' + stTxt + '</span>';
  if (known) h += '<p class="lm-panel-lore">' + esc(d.lore || "") + '</p>';
  else h += '<p class="lm-panel-lore">La brume ne laisse rien voir. On sait seulement que le chemin est ' + (d.ring === 1 ? "court" : d.ring === 2 ? "long" : "très long") + '.</p>';
  h += '<p class="lm-panel-line"><b>Contenu :</b> ' + (known ? esc(livingMapContentLabel(mapId, d)) : esc(intensity) + ' (contenu inconnu)') + '</p>';
  if (d.heldEffect) {
    if (s.state === "libere") h += '<p class="lm-panel-line"><b>Effet en cours :</b> ' + esc(d.heldEffect.label) + '</p>';
    else if (s.state === "recouvert") h += '<p class="lm-panel-line is-lost"><b>Effet perdu :</b> ' + esc(d.heldEffect.label) + '</p>';
    else h += '<p class="lm-panel-line"><b>Effet :</b> ' + (known ? esc(d.heldEffect.label) : "inconnu") + '</p>';
  }
  var repeatable = LM.isRepeatable(mapId, d.id);
  if (!s.firstRewardClaimed) h += '<p class="lm-panel-line"><b>Première libération :</b> +' + LM.getFirstReward(d) + ' Sève d\'Aeswyn</p>';
  else if (s.state !== "libere") h += '<p class="lm-panel-line"><b>Reprise :</b> Sève du run seule, pas de récompense de secteur.</p>';
  else if (!repeatable) h += '<p class="lm-panel-line"><b>Rejeu :</b> Petite Aventure ordinaire, Sève du run seule.</p>';
  if (repeatable && known) {
    // v3.258.0 (C-5) : élite répétable — Sève par victoire, frein du jour affiché avant de partir.
    var re = LM.getRules().repeatableElite || {}, wins = LM.getDailyWins(mapId, d.id);
    h += '<p class="lm-panel-line"><b>Chaque victoire :</b> +' + Number(re.sevePerWin || 0) + ' Sève d\'Aeswyn. Sans ration, hors cap. Fuir ou tomber reste un échec.</p>';
    h += '<p class="lm-panel-line"><b>Aujourd\'hui :</b> ' + wins + ' victoire' + (wins > 1 ? 's' : '') + ' · prochain combat ' + (wins ? '+' + Math.round((LM.getBrakeMult(mapId, d.id) - 1) * 100) + ' % PV et dégâts' : 'à sa force de base') + '</p>';
  }
  if (s.state === "recouvert") {
    var gw = LM.getGateway(mapId, d.id);
    h += '<p class="lm-panel-line is-lost">Le Recouvrement le tient. Reprends-le depuis ' + esc(d.ring === 1 || !gw ? "le village" : gw.name) + '.</p>';
  }

  var content = LM.getContentFor(mapId, d.id);
  var isElite = content && content.type === "elite";
  // Le verbe ne trahit pas un contenu inconnu : « Affronter l'élite » seulement quand le nom est révélé.
  var verb = s.state === "libere" ? (isElite && repeatable ? "Affronter l\'élite" : "Rejouer le secteur") : s.state === "recouvert" ? "Reprendre le secteur" : (isElite && known ? "Affronter l\'élite" : "Partir");
  if (running === d.id) {
    h += '<button class="settings-btn is-running" type="button" disabled>' + (isElite ? "Combat en cours" : "Expédition en cours") + '</button>';
  } else {
    var cs = LM.canStart(mapId, d.id);
    if (cs.ok) h += '<button class="settings-btn primary" type="button" onclick="startLivingMapSector(\'' + d.id + '\')">' + verb + '</button>';
    else {
      h += '<p class="lm-panel-wall">' + esc(cs.reason) + '</p>';
      // v3.260.0 : ressource d'entrée manquante -> raccourci vers les Ateliers plutôt qu'un bouton mort
      if (cs.missingResource && typeof goToSceneCostWorkshop === "function") h += '<button class="settings-btn primary" type="button" onclick="goToSceneCostWorkshop()">Préparer aux Ateliers</button>';
      else h += '<button class="settings-btn" type="button" disabled>' + verb + '</button>';
    }
  }
  return h + '</div>';
}
window.buildLivingMapPanelHTML = buildLivingMapPanelHTML;
