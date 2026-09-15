"use strict";
/* ui/living-map-view.js — v3.256.0 (Cartes Vivantes, lot C-2) : la carte vivante d'un monde.
   Rapport de conception v1.0 §9 ; rendu porté d'atelier-cartes.html (C-0), validé sur iPhone
   par Seb le 15/09/2026 (rayon 19 %, brume 36 %).

   Sous-vue de l'onglet Carte : buildMapHTML() (ui/map-view.js) délègue ici quand une carte
   est ouverte (livingMapOpenId). Toucher la Forêt sur la carte du monde l'ouvre ; « Retour »
   rend la carte du monde. Aucun nouvel onglet, aucun nouveau case dans ui-root.js.

   Rendu 100 % chaîne HTML (le tab est rendu par renderPanel) : les masques de brume et de
   Recouvrement sont écrits en style inline (union de dégradés radiaux, un par secteur),
   rien à poser après insertion. Toute la logique d'état est lue sur LivingMapManager. */

var livingMapOpenId = null;   // id de carte ouverte, ou null (carte du monde)
var livingMapSelected = null; // id de secteur, "village", ou null

var LIVING_MAP_RADIUS_PCT = 19;  // rayon d'un secteur, % de la carte (validé C-0)
var LIVING_MAP_FOG_OPACITY = 0.36; // opacité de la brume (validé C-0)

function openLivingMap(mapId, sectorId) {
  if (!window.LivingMapManager || !LivingMapManager.getMap(mapId)) return;
  livingMapOpenId = mapId;
  livingMapSelected = sectorId || null;
  if (game.activeTab === "map") refreshLivingMap();
  else if (typeof switchTab === "function") switchTab("map");
}
window.openLivingMap = openLivingMap;

function closeLivingMap() {
  livingMapOpenId = null;
  livingMapSelected = null;
  refreshLivingMap();
}
window.closeLivingMap = closeLivingMap;

function isLivingMapOpen() { return !!livingMapOpenId; }
window.isLivingMapOpen = isLivingMapOpen;

function selectLivingMapSector(id) {
  livingMapSelected = id || null;
  refreshLivingMap();
}
window.selectLivingMapSector = selectLivingMapSector;

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
    return "Élite : " + (e ? e.name : content.eliteId) + " · " + intensity;
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

  var h = '<div class="nb-page-frame kframe-page" data-kf-title="' + esc(map.name) + '">';

  /* En-tête */
  h += '<div class="lm-head">';
  h += '<div class="lm-title">' + sum.libere + '/' + sum.total + ' secteurs libérés<small>' + (sum.recouvert ? sum.recouvert + ' repris par le Recouvrement' : 'Le Recouvrement ne tient rien') + '</small></div>';
  h += '<div class="lm-pills">';
  h += '<span class="lm-pill"><img class=ico-inline src=images/Icons/resources/seve_aeswyn_icon.png> ' + seve + '</span>';
  h += '<span class="lm-pill is-pal">Palissade ' + pal + '</span>';
  h += '</div>';
  h += '</div>';

  /* Carte : image nue, brume (voilé), Recouvrement (recouvert), liens, nœuds */
  var fogIds = [], coverIds = [];
  map.sectors.forEach(function (d) {
    var st = LM.getState(mapId, d.id).state;
    if (st === "voile") fogIds.push(d.id);
    if (st === "recouvert") coverIds.push(d.id);
  });
  h += '<div class="lm-map" style="--lm-r:' + LIVING_MAP_RADIUS_PCT + ';--lm-fog:' + LIVING_MAP_FOG_OPACITY + ';">';
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
  h += '<button type="button" class="lm-node is-village' + (livingMapSelected === "village" ? " is-selected" : "") + '" style="left:' + map.village.x + '%;top:' + map.village.y + '%;" onclick="selectLivingMapSector(\'village\')">';
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
    h += '<button type="button" class="' + cls + '" style="left:' + d.x + '%;top:' + d.y + '%;" onclick="selectLivingMapSector(\'' + d.id + '\')">';
    h += '<span class="lm-node-disc">' + (s.state === "voile" ? "?" : String(i + 1)) + '</span>';
    h += '<span class="lm-node-name">' + esc(d.name) + '</span>';
    h += '</button>';
  });

  /* Amers : décor, jamais joués */
  (map.landmarks || []).forEach(function (d) {
    h += '<span class="lm-node is-reserve" style="left:' + d.x + '%;top:' + d.y + '%;"><span class="lm-node-disc">·</span></span>';
  });
  h += '</div>';

  h += buildLivingMapPanelHTML(mapId, running);

  h += '<div class="lm-actions">';
  if (worldIndex >= 0) h += '<button class="settings-btn" type="button" onclick="openWorldPopup(' + worldIndex + ')">Le monde</button>';
  h += '<button class="settings-btn" type="button" onclick="closeLivingMap()">Carte du monde</button>';
  h += '</div>';
  h += '</div>';
  return h;
}
window.buildLivingMapHTML = buildLivingMapHTML;

/* Panneau sous la carte : nom, anneau et intensité, état, lore, contenu, effet, récompense,
   bouton ou raison du mur (§2 : le mur n'est jamais silencieux). */
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
  if (!s.firstRewardClaimed) h += '<p class="lm-panel-line"><b>Première libération :</b> +' + LM.getFirstReward(d) + ' Sève d\'Aeswyn</p>';
  else if (s.state !== "libere") h += '<p class="lm-panel-line"><b>Reprise :</b> Sève du run seule, pas de récompense de secteur.</p>';
  else h += '<p class="lm-panel-line"><b>Rejeu :</b> Petite Aventure ordinaire, Sève du run seule.</p>';
  if (s.state === "recouvert") {
    var gw = LM.getGateway(mapId, d.id);
    h += '<p class="lm-panel-line is-lost">Le Recouvrement le tient. Reprends-le depuis ' + esc(d.ring === 1 || !gw ? "le village" : gw.name) + '.</p>';
  }

  var content = LM.getContentFor(mapId, d.id);
  var isElite = content && content.type === "elite";
  // Le verbe ne trahit pas un contenu inconnu : « Affronter l'élite » seulement quand le nom est révélé.
  var verb = s.state === "libere" ? "Rejouer le secteur" : s.state === "recouvert" ? "Reprendre le secteur" : (isElite && known ? "Affronter l\'élite" : "Partir");
  if (running === d.id) {
    h += '<button class="settings-btn is-running" type="button" disabled>' + (isElite ? "Combat en cours" : "Expédition en cours") + '</button>';
  } else {
    var cs = LM.canStart(mapId, d.id);
    if (cs.ok) h += '<button class="settings-btn primary" type="button" onclick="startLivingMapSector(\'' + d.id + '\')">' + verb + '</button>';
    else {
      h += '<p class="lm-panel-wall">' + esc(cs.reason) + '</p>';
      h += '<button class="settings-btn" type="button" disabled>' + verb + '</button>';
    }
  }
  return h + '</div>';
}
window.buildLivingMapPanelHTML = buildLivingMapPanelHTML;
