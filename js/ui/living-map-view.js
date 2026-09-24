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
/* v3.324.0 (bug Seb) : emplacement de héros qui a ouvert la carte. Ces variables vivent hors
   de `game` et survivaient au changement de héros : la carte du Désert d'un héros restait
   ouverte pour un héros encore en Forêt. */
var livingMapOpenSlot = null;

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
  livingMapOpenSlot = livingMapCurrentSlot();
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

function livingMapCurrentSlot() {
  return (window.HeroSlotManager && typeof HeroSlotManager.getActiveSlot === "function") ? HeroSlotManager.getActiveSlot() : null;
}

/* Referme une carte ouverte par un autre héros, ou que ce héros n'a pas encore atteinte.
   Appelée avant chaque rendu de l'écran Carte (map-view.js). */
function livingMapDropStale() {
  if (!livingMapOpenId) return false;
  var LM = window.LivingMapManager;
  var stale = livingMapOpenSlot !== livingMapCurrentSlot() || !LM || !LM.isMapOpen(livingMapOpenId);
  if (!stale) return false;
  livingMapOpenId = null;
  livingMapSelected = null;
  livingMapOpenSlot = null;
  lmxLegendOpen = false;
  syncLivingMapBodyClass();
  return true;
}
window.livingMapDropStale = livingMapDropStale;

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

/* ---------- v3.306.1 : pré-calcul de la brume et du Recouvrement ----------
   Sur iPhone, trois copies pleine taille de l'image (base, brume, Recouvrement), chacune avec
   filtre CSS et masque à dégradés, se repeignent tuile par tuile quand la carte glisse ou
   grossit : c'est la latence. Ici, on calcule UNE fois (à chaque changement d'état) l'image
   finale dans un canvas, avec exactement les mêmes opérations que le CSS :
     - calque = image + teinte (::after), puis filtres chaînés (matrices de la spec Filter
       Effects, espace sRGB, bornés à chaque étape comme le navigateur) ;
     - masque = union des disques en dégradé (radial-gradient circle farthest-corner, arrêts
       à 55 % et 100 % du rayon) ;
     - empilement : base, brume, Recouvrement.
   Aucun canvas (harnais) ou échec (image, mémoire) : les calques CSS restent, rien ne casse. */
var LIVING_MAP_BAKE = { key: null, url: null, pending: null };

function livingMapBakeKey(map, fogIds, coverIds) {
  return map.id + "|" + map.asset + "|" + fogIds.join(",") + "|" + coverIds.join(",") + "|" + LIVING_MAP_RADIUS_PCT + "|" + LIVING_MAP_FOG_OPACITY;
}

// Matrices 3×3 (sRGB) des fonctions de filtre CSS, spec Filter Effects 1 §13
function lmFilterMatrix(name, a) {
  var s = 1 - a, c, n;
  if (name === "grayscale") return [0.2126 + 0.7874 * s, 0.7152 - 0.7152 * s, 0.0722 - 0.0722 * s, 0.2126 - 0.2126 * s, 0.7152 + 0.2848 * s, 0.0722 - 0.0722 * s, 0.2126 - 0.2126 * s, 0.7152 - 0.7152 * s, 0.0722 + 0.9278 * s];
  if (name === "sepia") return [0.393 + 0.607 * s, 0.769 - 0.769 * s, 0.189 - 0.189 * s, 0.349 - 0.349 * s, 0.686 + 0.314 * s, 0.168 - 0.168 * s, 0.272 - 0.272 * s, 0.534 - 0.534 * s, 0.131 + 0.869 * s];
  if (name === "saturate") return [0.213 + 0.787 * a, 0.715 - 0.715 * a, 0.072 - 0.072 * a, 0.213 - 0.213 * a, 0.715 + 0.285 * a, 0.072 - 0.072 * a, 0.213 - 0.213 * a, 0.715 - 0.715 * a, 0.072 + 0.928 * a];
  if (name === "hue-rotate") {
    c = Math.cos(a * Math.PI / 180); n = Math.sin(a * Math.PI / 180);
    return [0.213 + c * 0.787 - n * 0.213, 0.715 - c * 0.715 - n * 0.715, 0.072 - c * 0.072 + n * 0.928,
      0.213 - c * 0.213 + n * 0.143, 0.715 + c * 0.285 + n * 0.140, 0.072 - c * 0.072 - n * 0.283,
      0.213 - c * 0.213 - n * 0.787, 0.715 - c * 0.715 + n * 0.715, 0.072 + c * 0.928 + n * 0.072];
  }
  return null;
}
// Chaînes identiques à css/04-panel-living-map.css (.lm-fog, .lm-cover) ; teinte = ::after
var LIVING_MAP_FOG_CHAIN = [["grayscale", 1], ["brightness", 1.35], ["contrast", 0.78]];
var LIVING_MAP_COVER_CHAIN = [["grayscale", 0.75], ["brightness", 0.92], ["sepia", 0.12], ["hue-rotate", 165], ["saturate", 0.9]];
var LIVING_MAP_COVER_TINT = [30, 48, 74, 0.22];

// Une couleur (0-1) à travers une chaîne de filtres, bornée à chaque étape
function lmFilterPixel(chain, rgb) {
  var r = rgb[0], g = rgb[1], b = rgb[2];
  for (var i = 0; i < chain.length; i++) {
    var f = chain[i][0], a = chain[i][1], m;
    if (f === "brightness") { r *= a; g *= a; b *= a; }
    else if (f === "contrast") { var k = 0.5 * (1 - a); r = r * a + k; g = g * a + k; b = b * a + k; }
    else if ((m = lmFilterMatrix(f, a))) {
      var nr = m[0] * r + m[1] * g + m[2] * b, ng = m[3] * r + m[4] * g + m[5] * b, nb = m[6] * r + m[7] * g + m[8] * b;
      r = nr; g = ng; b = nb;
    }
    r = r < 0 ? 0 : r > 1 ? 1 : r; g = g < 0 ? 0 : g > 1 ? 1 : g; b = b < 0 ? 0 : b > 1 ? 1 : b;
  }
  return [r, g, b];
}

// Masque (0-1 par pixel) : union des disques, comme mask-image à plusieurs couches (add)
function lmBakeMask(map, ids, N) {
  var m = new Float32Array(N * N), rPct = LIVING_MAP_RADIUS_PCT / 100, inner = Math.round(LIVING_MAP_RADIUS_PCT * 55) / 100 / 100;
  ids.forEach(function (id) {
    var d = LivingMapManager.getSectorDef(map.id, id); if (!d) return;
    var cx = d.x / 100 * N, cy = d.y / 100 * N;
    var R = Math.max(Math.hypot(cx, cy), Math.hypot(N - cx, cy), Math.hypot(cx, N - cy), Math.hypot(N - cx, N - cy));
    var r0 = inner * R, r1 = rPct * R;
    var x0 = Math.max(0, Math.floor(cx - r1)), x1 = Math.min(N - 1, Math.ceil(cx + r1));
    var y0 = Math.max(0, Math.floor(cy - r1)), y1 = Math.min(N - 1, Math.ceil(cy + r1));
    for (var y = y0; y <= y1; y++) {
      for (var x = x0; x <= x1; x++) {
        var dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (dist >= r1) continue;
        var a = dist <= r0 ? 1 : (r1 - dist) / (r1 - r0);
        var k = y * N + x; m[k] = m[k] + a * (1 - m[k]);
      }
    }
  });
  return m;
}

function livingMapBake(map, fogIds, coverIds, key) {
  if (!fogIds.length && !coverIds.length) { LIVING_MAP_BAKE.key = key; LIVING_MAP_BAKE.url = map.asset; return; }
  if (LIVING_MAP_BAKE.pending === key || typeof document === "undefined" || typeof Image === "undefined") return;
  var probe = document.createElement("canvas");
  if (!probe || typeof probe.getContext !== "function") return;
  LIVING_MAP_BAKE.pending = key;
  var img = new Image();
  img.onload = function () {
    try {
      var N = Math.min(img.naturalWidth, img.naturalHeight, 2048);
      var cv = document.createElement("canvas"); cv.width = N; cv.height = N;
      var ctx = cv.getContext("2d");
      ctx.drawImage(img, 0, 0, N, N);
      var data = ctx.getImageData(0, 0, N, N), px = data.data;
      var mf = fogIds.length ? lmBakeMask(map, fogIds, N) : null, mc = coverIds.length ? lmBakeMask(map, coverIds, N) : null;
      var fa = LIVING_MAP_FOG_OPACITY, ft = [224 / 255, 230 / 255, 236 / 255], ct = LIVING_MAP_COVER_TINT, ca = ct[3];
      for (var k = 0, i = 0; k < N * N; k++, i += 4) {
        var a1 = mf ? mf[k] : 0, a2 = mc ? mc[k] : 0;
        if (a1 <= 0 && a2 <= 0) continue;
        var r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255, o;
        if (a1 > 0) {
          o = lmFilterPixel(LIVING_MAP_FOG_CHAIN, [r * (1 - fa) + ft[0] * fa, g * (1 - fa) + ft[1] * fa, b * (1 - fa) + ft[2] * fa]);
          var br = r, bg = g, bb = b; // base sous la brume
          r = o[0] * a1 + br * (1 - a1); g = o[1] * a1 + bg * (1 - a1); b = o[2] * a1 + bb * (1 - a1);
        }
        if (a2 > 0) {
          var sr = px[i] / 255, sg = px[i + 1] / 255, sb = px[i + 2] / 255; // le calque repart de l'image
          o = lmFilterPixel(LIVING_MAP_COVER_CHAIN, [sr * (1 - ca) + ct[0] / 255 * ca, sg * (1 - ca) + ct[1] / 255 * ca, sb * (1 - ca) + ct[2] / 255 * ca]);
          r = o[0] * a2 + r * (1 - a2); g = o[1] * a2 + g * (1 - a2); b = o[2] * a2 + b * (1 - a2);
        }
        px[i] = Math.round(r * 255); px[i + 1] = Math.round(g * 255); px[i + 2] = Math.round(b * 255);
      }
      ctx.putImageData(data, 0, 0);
      var done = function (url) {
        if (LIVING_MAP_BAKE.pending !== key) return;
        if (LIVING_MAP_BAKE.url && LIVING_MAP_BAKE.url.indexOf("blob:") === 0 && typeof URL !== "undefined") URL.revokeObjectURL(LIVING_MAP_BAKE.url);
        LIVING_MAP_BAKE.key = key; LIVING_MAP_BAKE.url = url; LIVING_MAP_BAKE.pending = null;
        livingMapApplyBake(map, coverIds, key);
      };
      if (cv.toBlob && typeof URL !== "undefined" && URL.createObjectURL) cv.toBlob(function (bl) { if (bl) done(URL.createObjectURL(bl)); else LIVING_MAP_BAKE.pending = null; }, "image/jpeg", 0.92);
      else done(cv.toDataURL("image/jpeg", 0.92));
    } catch (e) { LIVING_MAP_BAKE.pending = null; } // canvas refusé : les calques CSS restent
  };
  img.onerror = function () { LIVING_MAP_BAKE.pending = null; };
  img.src = map.asset;
}

// Pose l'image calculée sur la carte affichée, sans nouveau rendu (un glissé en cours continue)
function livingMapApplyBake(map, coverIds, key) {
  var root = document.getElementById("lmx-root");
  if (!root || root.getAttribute("data-map") !== map.id) return;
  var base = document.getElementById("lm-base"); if (!base) return;
  var img = new Image();
  img.onload = function () { // l'image décodée d'abord : pas de trou pendant la bascule
    if (LIVING_MAP_BAKE.key !== key) return;
    base.style.backgroundImage = "url('" + LIVING_MAP_BAKE.url + "')";
    var mapEl = base.parentNode;
    Array.prototype.slice.call(mapEl.querySelectorAll(".lm-fog, .lm-cover")).forEach(function (el) { el.parentNode.removeChild(el); });
    if (coverIds.length && !mapEl.querySelector(".lm-cover-trame")) {
      var t = document.createElement("div"), mk = livingMapMask(map, coverIds);
      t.className = "lm-layer lm-cover-trame";
      t.style.webkitMaskImage = mk; t.style.maskImage = mk;
      base.parentNode.insertBefore(t, base.nextSibling);
    }
  };
  img.src = LIVING_MAP_BAKE.url;
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
  // v3.305.0 : la ressource de la carte (Sève en Forêt, Verre des dunes au Désert)
  var rewardId = LM.getRewardResourceId(mapId), rewardDef = (window.WAREHOUSE_RESOURCES || {})[rewardId];
  var seve = (window.WarehouseManager && typeof WarehouseManager.getAmount === "function") ? WarehouseManager.getAmount(rewardId) : 0;
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
  /* v3.306.1 (latence au glissé, iPhone) : brume et Recouvrement sont pré-calculés dans UNE image
     (livingMapBake). Tant qu'elle n'est pas prête, les calques CSS d'origine s'affichent, puis
     sont remplacés sans nouveau rendu. Seule la trame du Recouvrement reste en CSS, nette. */
  var bakeKey = livingMapBakeKey(map, fogIds, coverIds);
  var baked = LIVING_MAP_BAKE.key === bakeKey ? LIVING_MAP_BAKE.url : null;
  h += '<div class="lm-layer lm-base" id="lm-base" style="background-image:url(\'' + esc(baked || map.asset) + '\')"></div>';
  if (!baked) livingMapBake(map, fogIds, coverIds, bakeKey);
  if (coverIds.length && baked) {
    var mt = livingMapMask(map, coverIds);
    h += '<div class="lm-layer lm-cover-trame" style="-webkit-mask-image:' + mt + ';mask-image:' + mt + ';"></div>';
  }
  if (fogIds.length && !baked) {
    var mf = livingMapMask(map, fogIds);
    h += '<div class="lm-layer lm-fog is-on" style="background-image:url(\'' + esc(map.asset) + '\');-webkit-mask-image:' + mf + ';mask-image:' + mf + ';"></div>';
  }
  if (coverIds.length && !baked) {
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
  h += '<span class="lmx-pill"><img class=ico-inline src=' + esc((rewardDef && rewardDef.icon) || "images/Icons/resources/seve_aeswyn_icon.png") + ' alt=""> ' + seve + '</span>';
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

/* v3.305.0 : les mots de la carte ouverte (LivingMapManager.getWords), textes de la Forêt par défaut. */
function livingMapWords() {
  var LM = window.LivingMapManager;
  var id = (typeof livingMapOpenId !== "undefined" && livingMapOpenId) || "forest";
  return LM ? LM.getWords(id) : {};
}

/* Légende : les sept états, avec leur vraie pastille. */
function buildLivingMapLegendHTML() {
  function node(cls, glyph) { return '<span class="lm-node ' + cls + '"><span class="lm-node-disc">' + glyph + '</span></span>'; }
  function row(n, label, sub) { return '<div class="lmx-legend-row">' + n + '<span>' + label + (sub ? '<small>' + sub + '</small>' : '') + '</span></div>'; }
  var h = '<div class="lmx-legend" id="lmx-legend"><h5>Légende</h5>';
  h += row(node("is-village", "★"), "Foyer", "point de départ, toujours sûr");
  h += row(node("is-voile", "?"), "Voilé", "à découvrir, atteignable");
  h += row(node("is-voile is-far", "?"), "Voilé, trop loin", "libère d'abord un voisin");
  h += row(node("is-libere", "1"), "Libéré", "son effet s'applique");
  h += row(node("is-recouvert", "3"), esc(livingMapWords().coveredState), "effet perdu, à reprendre"); // v3.305.0
  h += row(node("is-libere is-protege", "1"), "Tenu par la Palissade", "un échec ne le reprend pas"); // v3.335.0
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
  var geo = lmxGeo(); if (!geo) return;
  var W = geo.W, H = geo.H, w = lmxView.w;
  lmxView.tx = w <= W ? (W - w) / 2 : Math.min(0, Math.max(W - w, lmxView.tx));
  lmxView.ty = w <= H ? (H - w) / 2 : Math.min(LMX_TOP_SLACK, Math.max(H - w, lmxView.ty));
}
/* v3.306.1 : la taille n'est réécrite que si elle change (un glissé ne touche que la
   translation, déplacée par le compositeur sans repeindre). */
function lmxApply(anim) {
  var st = document.getElementById("lmx-stage"); if (!st) return;
  st.classList.toggle("is-anim", !!anim);
  st.style.visibility = "";
  var wpx = lmxView.w + "px";
  if (st.style.width !== wpx) { st.style.width = wpx; st.style.height = wpx; }
  st.style.transform = "translate3d(" + lmxView.tx + "px," + lmxView.ty + "px,0)";
  if (anim) setTimeout(lmxUpdateOffscreen, 300); else if (!lmxGesture.mode) lmxUpdateOffscreen();
}

/* v3.306.1 : géométrie figée pendant un geste — la relire à chaque mouvement forçait le
   navigateur à recalculer la page entre deux écritures. */
function lmxGeo() {
  var g = typeof lmxGesture !== "undefined" ? lmxGesture : null;
  if (g && g.geo) return g.geo;
  var vp = lmxVp();
  return vp ? { W: vp.clientWidth, H: vp.clientHeight - lmxSheetH(), rect: vp.getBoundingClientRect() } : null;
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

var lmxGesture = { pts: {}, mode: null, start: null, moved: false, suppressClick: false, lastTap: 0, vel: { x: 0, y: 0 }, lastMove: 0, raf: 0, geo: null, frame: 0 };

function lmxLocal(e) { var r = (lmxGesture.geo && lmxGesture.geo.rect) || lmxVp().getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
/* v3.306.1 : un seul lmxApply par image, quel que soit le nombre de mouvements reçus (l'écran
   tactile en envoie jusqu'à 120 par seconde). */
function lmxSchedule() {
  var g = lmxGesture;
  if (g.frame || typeof requestAnimationFrame !== "function") { if (!g.frame) lmxApply(false); return; }
  g.frame = requestAnimationFrame(function () { g.frame = 0; lmxApply(false); });
}
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
  if (!lmxPts().length) { g.geo = null; g.geo = lmxGeo(); } // lue une fois, au premier doigt
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
    lmxView.tx = s.tx + dx; lmxView.ty = s.ty + dy; lmxClamp(); lmxSchedule();
  } else if (g.mode === "pinch" && p.length >= 2) {
    g.moved = true;
    var m = { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
    var f = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) / s.d;
    var nw = Math.max(lmxCoverW(), Math.min(lmxMaxW(), s.w * f));
    var u = (s.m.x - s.tx) / s.w, v = (s.m.y - s.ty) / s.w;   // point de la carte sous les doigts au départ
    lmxView.w = nw; lmxView.tx = m.x - u * nw; lmxView.ty = m.y - v * nw;
    lmxClamp(); lmxSchedule();
  }
}
function lmxOnUp(e) {
  var g = lmxGesture;
  if (!g.pts[e.pointerId]) return;
  var up = g.pts[e.pointerId]; delete g.pts[e.pointerId];
  if (g.moved) { g.suppressClick = true; setTimeout(function () { g.suppressClick = false; }, 0); }
  if (lmxPts().length) { lmxBegin(); return; }
  if (g.frame && typeof cancelAnimationFrame === "function") { cancelAnimationFrame(g.frame); g.frame = 0; }
  var momentum = g.mode === "pan" && g.moved && performance.now() - g.lastMove < 60;
  if (!momentum) { g.geo = null; lmxApply(false); lmxUpdateOffscreen(); } // position finale posée, repère hors écran à jour
  if (momentum) lmxMomentum();
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
    if ((Math.abs(v.x) < 0.3 && Math.abs(v.y) < 0.3) || !lmxVp()) { g.geo = null; lmxUpdateOffscreen(); return; }
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
  var W = LM.getWords(mapId), rName = LM.getRewardResourceName(mapId); // v3.305.0 : mots et ressource de la carte
  var h = '<div class="lm-panel">';

  if (!livingMapSelected) {
    h += '<div class="lm-panel-name">' + esc(W.homeTitle) + '</div>';
    h += '<p class="lm-panel-lore">' + esc(W.intro) + '</p>';
    return h + '</div>';
  }

  if (livingMapSelected === "village") {
    var pal = LM.getPalisadeLevel(), held = LM.getHeldRing(pal);
    h += '<div class="lm-panel-name">' + esc(map.village.name) + '</div>';
    h += '<p class="lm-panel-lore">' + esc(W.homeLore) + '</p>';
    h += '<p class="lm-panel-line"><b>Palissade niveau ' + pal + '</b> · frein ' + Math.round(LM.getBrakeChance(mapId) * 100) + ' % sur l\'échec · '
      + (held ? 'tient l\'anneau ' + (held === 3 ? '1 à 3' : held === 2 ? '1 et 2' : '1') + ' : un échec n\'y reprend rien' : 'ne tient aucun anneau (niveau 3)') // v3.335.0 + '</p>';
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
  var stTxt = protege ? "Libéré · tenu par la Palissade" : s.state === "voile" ? "Voilé" : s.state === "libere" ? "Libéré" : W.coveredState;
  h += '<span class="lm-panel-state ' + stCls + '">' + stTxt + '</span>';
  if (known) h += '<p class="lm-panel-lore">' + esc(d.lore || "") + '</p>';
  else h += '<p class="lm-panel-lore">' + esc(W.fogLore) + ' On sait seulement que le chemin est ' + (d.ring === 1 ? "court" : d.ring === 2 ? "long" : "très long") + '.</p>';
  h += '<p class="lm-panel-line"><b>Contenu :</b> ' + (known ? esc(livingMapContentLabel(mapId, d)) : esc(intensity) + ' (contenu inconnu)') + '</p>';
  if (d.heldEffect && LM.isEffectLostByChoice(d)) {
    h += '<p class="lm-panel-line is-lost"><b>Effet :</b> aucun. La stèle est vide.</p>'; // v3.306.0 : perdu pour de bon
  } else if (d.heldEffect) {
    if (s.state === "libere") h += '<p class="lm-panel-line"><b>Effet en cours :</b> ' + esc(d.heldEffect.label) + '</p>';
    else if (s.state === "recouvert") h += '<p class="lm-panel-line is-lost"><b>Effet perdu :</b> ' + esc(d.heldEffect.label) + '</p>';
    else h += '<p class="lm-panel-line"><b>Effet :</b> ' + (known ? esc(d.heldEffect.label) : "inconnu") + '</p>';
  }
  var repeatable = LM.isRepeatable(mapId, d.id);
  if (!s.firstRewardClaimed) h += '<p class="lm-panel-line"><b>Première libération :</b> +' + LM.getFirstReward(d) + ' ' + esc(rName) + '</p>';
  else if (s.state !== "libere") h += '<p class="lm-panel-line"><b>Reprise :</b> ' + esc(W.runLoot) + ', pas de récompense de secteur.</p>';
  else if (!repeatable) h += '<p class="lm-panel-line"><b>Rejeu :</b> Petite Aventure ordinaire, ' + esc(W.runLoot) + '.</p>';
  if (repeatable && known) {
    // v3.258.0 (C-5) : élite répétable — Sève par victoire, frein du jour affiché avant de partir.
    var re = LM.getRules().repeatableElite || {}, wins = LM.getDailyWins(mapId, d.id);
    h += '<p class="lm-panel-line"><b>Chaque victoire :</b> +' + Number(re.sevePerWin || 0) + ' ' + esc(rName) + '. Sans ration, hors cap. Fuir ou tomber reste un échec.</p>';
    h += '<p class="lm-panel-line"><b>Aujourd\'hui :</b> ' + wins + ' victoire' + (wins > 1 ? 's' : '') + ' · prochain combat ' + (wins ? '+' + Math.round((LM.getBrakeMult(mapId, d.id) - 1) * 100) + ' % PV et dégâts' : 'à sa force de base') + '</p>';
  }
  if (s.state === "recouvert") {
    var gw = LM.getGateway(mapId, d.id);
    h += '<p class="lm-panel-line is-lost">' + esc(W.coverCap) + ' le tient. Reprends-le depuis ' + esc(d.ring === 1 || !gw ? W.home : gw.name) + '.</p>';
  }

  // v3.306.0 : un choix pesant qui se pose ici (étape en cours, secteur libéré) passe avant le départ
  var pending = (typeof storyPendingChoiceAt === "function") ? storyPendingChoiceAt(mapId, d.id) : null;
  if (pending) {
    h += '<button class="settings-btn primary" type="button" onclick="openStoryChoiceModal(\'' + esc(pending.chapterId) + '\')">' + esc(pending.choice.buttonLabel || "Choisir") + '</button>';
  }
  var content = LM.getContentFor(mapId, d.id);
  var isElite = content && content.type === "elite";
  // Le verbe ne trahit pas un contenu inconnu : « Affronter l'élite » seulement quand le nom est révélé.
  var verb = s.state === "libere" ? (isElite && repeatable ? "Affronter l\'élite" : "Rejouer le secteur") : s.state === "recouvert" ? "Reprendre le secteur" : (isElite && known ? "Affronter l\'élite" : "Partir");
  if (running === d.id) {
    h += '<button class="settings-btn is-running" type="button" disabled>' + (isElite ? "Combat en cours" : "Expédition en cours") + '</button>';
  } else {
    var cs = LM.canStart(mapId, d.id);
    // v3.330.1 : vivres d'une élite rejouée
    if (cs.ok && isElite && window.ProvisionsManager) {
      var lmap = LM.getMap(mapId);
      h += ProvisionsManager.buildLineHTML("mapelite", { mapId: mapId, sectorId: d.id, worldId: lmap ? lmap.worldId : "forest" });
    }
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

/* ---------- v3.306.0 : écran d'un choix pesant ----------
   Les deux conséquences écrites en clair sous chaque option, aucune jauge (acte I §7). Même
   habillage que les tutoriels (.dungeon-story-card), dans le même hôte de modale. */
function buildStoryChoiceModalHTML(chapterId) {
  var step = window.StoryQuestManager && StoryQuestManager.getCurrentStep(chapterId);
  var c = step && step.choice;
  if (!c) return "";
  var h = '<div class="full-menu-overlay tutorial-overlay">';
  h += '  <div class="full-menu dungeon-story-card tutorial-card story-choice-card">';
  h += '    <div class="dungeon-story-title">' + esc(c.title || step.title) + '</div>';
  if (c.text) h += '    <p class="story-choice-text">' + esc(c.text) + '</p>';
  c.options.forEach(function (o) {
    h += '    <div class="story-choice-option">';
    h += '      <button class="settings-btn primary" type="button" onclick="chooseStoryOption(\'' + esc(chapterId) + '\', \'' + esc(o.value) + '\')">' + esc(o.label) + '</button>';
    h += '      <p class="story-choice-desc">' + esc(o.desc || "") + '</p>';
    h += '    </div>';
  });
  h += '    <div class="dungeon-story-actions"><button class="settings-btn" type="button" onclick="closeStoryChoiceModal()">Plus tard</button></div>';
  h += '  </div>';
  h += '</div>';
  return h;
}
window.buildStoryChoiceModalHTML = buildStoryChoiceModalHTML;

function openStoryChoiceModal(chapterId) {
  var host = document.getElementById("tutorial-modal-root");
  if (host) host.innerHTML = buildStoryChoiceModalHTML(chapterId);
}
function closeStoryChoiceModal() {
  var host = document.getElementById("tutorial-modal-root");
  if (host) host.innerHTML = "";
}
// Choisir est définitif : noté, conséquences appliquées, puis l'Histoire est revérifiée
function chooseStoryOption(chapterId, value) {
  closeStoryChoiceModal();
  if (typeof storyMakeChoice !== "function" || !storyMakeChoice(chapterId, value)) return;
  if (window.StoryQuestManager && typeof StoryQuestManager._checkNow === "function") StoryQuestManager._checkNow(false);
  if (typeof renderAll === "function") renderAll();
  else if (typeof renderPanel === "function") renderPanel();
}
window.openStoryChoiceModal = openStoryChoiceModal;
window.closeStoryChoiceModal = closeStoryChoiceModal;
window.chooseStoryOption = chooseStoryOption;
