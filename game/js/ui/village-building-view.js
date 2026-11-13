"use strict";
/* ui/village-building-view.js — v3.213.0 (lot V-1) : fiche d'un bâtiment du
   Village, rendue dans #village-modal-root, HORS du cycle renderPanel().

   Pourquoi hors du panneau : #panel-container porte `isolation: isolate`.
   Un position:fixed rendu à l'intérieur reste enfermé dans son contexte
   d'empilement et passe sous #tab-bar — augmenter le z-index n'y change
   rien (piège rencontré en v3.212.0 avec les feuilles du Grimoire).

   Remplace ui/construction-view.js, dont elle est la généralisation :
   mêmes lignes de coût, même feuille basse, mais pour N bâtiments. */

var openVillageBuildingId = null;
var hallSheetSegment = "shop"; // v3.419.0 (E-2) : segment de la feuille de la Halle ; v3.426.0 : Échoppe · Agrandir

function setHallSheetSegment(seg) {
  hallSheetSegment = (seg === "build") ? "build" : "shop"; // v3.426.0 : Échoppe · Agrandir
  if (openVillageBuildingId === "hall") openVillageBuildingSheet("hall");
}
window.setHallSheetSegment = setHallSheetSegment;

function getVillageCostMeta(key) {
  if (key === "gold") {
    return {
      label: _t("Or"),
      iconHTML: '<img class="vb-cost-icon" src="images/Icons/gold_icon.webp" alt="">'
    };
  }
  var def = WAREHOUSE_RESOURCES[key];
  if (!def) return { label: key, iconHTML: "" };
  return {
    label: def.name,
    iconHTML: renderIconOrEmojiHTML(def.icon, "vb-cost-icon", _td(def.name))
  };
}

/* Icône d'un bâtiment : image si elle existe, emoji sinon. Les visuels du
   village ne sont pas encore produits — l'emoji tient la place sans bloquer
   le chantier (décision Seb, 11/09/2026). */
function buildVillageBuildingIconHTML(def, cssClass) {
  return renderIconOrEmojiHTML(def.iconImg || def.icon, cssClass, _td(def.name));
}
window.buildVillageBuildingIconHTML = buildVillageBuildingIconHTML;

function buildVillageCostListHTML(id) {
  var cost = VillageBuildingManager.getNextCost(id);
  if (!cost) return "";

  var afford = VillageBuildingManager.getAffordability(id);
  var keys = Object.keys(cost).sort(function (a, b) {
    if (a === "gold") return -1;
    if (b === "gold") return 1;
    return 0;
  });

  var h = '<div class="vb-cost-list">';
  // v3.330.0 (E2) : niveau exigé par l'Histoire, matériaux communs fournis
  if (VillageBuildingManager.isNextLevelStoryProvided && VillageBuildingManager.isNextLevelStoryProvided(id)) {
    h += '<div class="vb-cost-where vb-cost-provided">' + _t("Matériaux fournis par le village (niveau exigé par l’Histoire)") + '</div>';
  }
  // v3.433.0 (Ruines, choix « plan » = tomber) : la clé du Cœur se voit sur les chantiers en Clés de voûte
  if (cost && cost.cle_de_voute > 0 && window.StoryQuestManager && StoryQuestManager.getChoice("plan") === "tomber") {
    h += '<div class="vb-cost-where vb-cost-provided">' + _t("La clé du Cœur : une Clé de voûte de moins") + '</div>';
  }
  // v3.428.0 (Ruines, choix « seuil ») : la remise du seuil d'Aeswyn se voit sur chaque chantier
  if (window.StoryQuestManager && StoryQuestManager.getChoice("seuil") === "aeswyn") {
    h += '<div class="vb-cost-where vb-cost-provided">' + _t("Le seuil d'Aeswyn : 10 % de matériaux en moins") + '</div>';
  }
  keys.forEach(function (key) {
    var meta = getVillageCostMeta(key);
    var ok = !!afford[key];
    var have = (key === "gold") ? Number(game.gold || 0) : WarehouseManager.getAmount(key);
    var unreachable = !ok && isVillageResourceUnreachable(key);

    h += '<div class="vb-cost-row' + (ok ? '' : (unreachable ? ' is-unreachable' : ' is-missing') + (key === "gold" ? '' : ' res-go')) + '"' + (ok ? '' : resGoAttr(key)) + '>';
    h += meta.iconHTML;
    h += '<span class="vb-cost-label">' + esc(_td(meta.label)) + '</span>';
    /* On affiche le COÛT ; l'avoir n'apparaît que s'il manque quelque
       chose, sinon la ligne est du bruit. */
    h += '<span class="vb-cost-amount">'
       + (ok ? '' : formatNumber(Math.floor(have)) + ' / ')
       + formatNumber(cost[key]) + '</span>';
    /* Une ressource d'un monde pas encore atteint n'est pas « manquante »,
       elle est introuvable : la loupe et non la croix, et on dit où. */
    h += '<span class="vb-cost-check">' + (ok ? '<img class="ico-sys" src="images/Icons/system/check_valid.webp" alt="">' : (unreachable ? '<img class="ico-sys" src="images/Icons/system/search_unknown.webp" alt="">' : '<img class="ico-sys" src="images/Icons/system/cross_error.webp" alt="">')) + '</span>';
    if (!ok && key !== "gold") h += '<span class="res-go-chev" aria-hidden="true">›</span>';
    h += '</div>';

    if (!ok) {
      var capWhy = key === "gold" ? "" : WarehouseManager.capHint(key, cost[key]); // EQUI-2 : le stock ne peut pas y arriver
      if (capWhy) { h += '<div class="vb-cost-where res-go-link"' + resGoAttr(key) + '>' + esc(capWhy) + ' ›</div>'; return; }
      var hint = getVillageResourceHint(key);
      if (hint) h += key === "gold" ? '<div class="vb-cost-where">' + esc(hint) + '</div>'
        : '<div class="vb-cost-where res-go-link"' + resGoAttr(key) + '>' + esc(_t("Où en trouver : {x}", { x: hint })) + ' ›</div>';
    }
  });
  h += '</div>';
  return h;
}

/* v3.214.0 (lot V-3) — MATÉRIAUX DE MONDE.
   Un matériau porte l'index du monde où il se trouve. Tant que le joueur n'y a
   jamais mis les pieds, le palier qui le demande est de fait hors de portée :
   c'est CE mécanisme qui plafonne la construction, à la place d'un verrou
   abstrait. worldsEverReached n'est jamais lu comme un verrou, seulement pour
   formuler la phrase. */
/* v3.754.0 (audit A, MES-6) : matériau fait par un atelier que l'Histoire n'a pas encore ouvert (Verre trempé
   avant desert_09) : introuvable pour l'instant, avec l'étape qui l'ouvre. Renvoie le titre de l'étape, sinon "". */
/* v3.770.0 : aussi une ressource brute ouverte par l'Histoire (openAtStoryStep, le Givre bleu à tour_06) et un matériau
   fabriqué dont un ingrédient est encore fermé (le Verre de faille). Rend le titre de l'étape qui l'ouvre, sinon "". */
function getResourceStoryLock(key, prof) {
  if ((prof || 0) > 3) return "";
  var titreDe = function (id) {
    var q = window.STORY_QUESTS || {}, titre = "";
    Object.keys(q).forEach(function (c) { (q[c].steps || []).forEach(function (s) { if (s.id === id) titre = s.title; }); });
    return titre || id;
  };
  var def = window.WAREHOUSE_RESOURCES ? WAREHOUSE_RESOURCES[key] : null;
  if (def && def.openAtStoryStep && window.StoryQuestManager && !StoryQuestManager.isStepReached(def.openAtStoryStep)) return titreDe(def.openAtStoryStep);
  var prod = typeof findResourceProducer === "function" ? findResourceProducer(key) : null;
  var w = prod && prod.kind === "workshop" && window.WORKSHOPS_CONFIG ? WORKSHOPS_CONFIG[prod.id] : null;
  if (!w) return "";
  if (w.openAtStoryStep && !w.active) return titreDe(w.openAtStoryStep);
  var rec = (w.recipes || []).filter(function (r) { return r.outputs[0].resourceId === key; })[0], lock = "";
  (rec ? rec.inputs : []).forEach(function (i) { if (!lock && i.resourceId !== key) lock = getResourceStoryLock(i.resourceId, (prof || 0) + 1); });
  return lock;
}
window.getResourceStoryLock = getResourceStoryLock;

function isVillageResourceUnreachable(key) {
  if (getResourceStoryLock(key)) return true; // v3.754.0 (MES-6)
  var def = WAREHOUSE_RESOURCES[key];
  if (!def || typeof def.worldIndex !== "number") return false;
  if (def.worldIndex <= 0) return false; // monde de départ : toujours atteignable
  var reached = (game.worldsEverReached && typeof game.worldsEverReached === "object")
    ? game.worldsEverReached : {};
  return !reached[def.worldIndex];
}
window.isVillageResourceUnreachable = isVillageResourceUnreachable;

/* Où trouver une ressource qui manque. Le mur n'est jamais silencieux : une
   ligne rouge sans explication laisserait le joueur chercher. */
function getVillageResourceHint(key) {
  var def = WAREHOUSE_RESOURCES[key];
  if (!def) return "";
  var lock = getResourceStoryLock(key);
  if (lock) return _t("S'ouvre avec l'Histoire : « {s} ».", { s: _td(lock) }); // v3.754.0 (MES-6)
  if (isVillageResourceUnreachable(key)) {
    return def.worldName ? _t("Se trouve en {w}.", { w: _td(def.worldName) }) : _t("Pas encore accessible.");
  }
  if (def.sourceHint) return _td(def.sourceHint);
  var prod = typeof findResourceProducer === "function" ? findResourceProducer(key) : null; // v3.515.0
  if (!prod) return "";
  if (prod.kind === "building") return prod.name;
  var w = WORKSHOPS_CONFIG[prod.id], b = w && PRODUCTION_BUILDINGS[w.buildingId];
  return b ? _t("{x} ({y})", { x: prod.name, y: _td(b.name) }) : prod.name;
}
window.getVillageResourceHint = getVillageResourceHint;

function buildVillageBuildingSheetHTML(id) {
  var def = VILLAGE_BUILDINGS[id];
  if (!def) return "";

  var level = VillageBuildingManager.getLevel(id);
  var onSite = VillageBuildingManager.isBuilding(id);
  var maxed = VillageBuildingManager.isMaxLevel(id);

  var h = '<div class="full-menu-overlay" onclick="closeVillageBuildingSheetFromBackdrop(event)">';
  h += '<div class="full-menu vb-sheet-card" onclick="event.stopPropagation()">';

  h += kSheetHeadHTML({
    icon: buildVillageBuildingIconHTML(def, "vb-sheet-icon"),
    title: esc(_td(def.name)),
    sub: level === 0 ? _t("Non construit") : _t("Niveau {a} / {b}", { a: level, b: VillageBuildingManager.getMaxLevel(id) }),
    close: "closeVillageBuildingSheet()"
  });
  h += '<div class="ksheet-body">';

  /* v3.419.0 (E-2) : la Halle construite porte des segments (Échoppe · Agrandir ; v3.780.0 : sans caravane). */
  if (id === "hall" && level > 0) {
    var hseg = (hallSheetSegment === "build") ? "build" : "shop";
    h += '<div class="kseg vb-sheet-seg">';
    // v3.424.0 (chantier Héros, H-1, décision Seb) : la Boutique d'équipement s'installe à la Halle
    h += '<button type="button" class="' + (hseg === "shop" ? 'is-on' : '') + '" onclick="setHallSheetSegment(\'shop\')"><img class="vb-seg-ico" src="images/Icons/subtabs/equipment_shop.webp" alt="">' + _t("Échoppe") + '</button>';
    h += '<button type="button" class="' + (hseg === "build" ? 'is-on' : '') + '" onclick="setHallSheetSegment(\'build\')">'
       + (maxed ? _t("Halle") : _t("Agrandir · niv. {n}", { n: level + 1 })) + '</button>';
    h += '</div>';
    if (hseg === "shop" && typeof buildEquipShopHTML === "function") {
      h += '<div class="vb-hall-shop">' + buildEquipShopHTML() + '</div>';
      h += '</div></div></div>';
      return h;
    }
  }

  h += '<div class="vb-sheet-text">' + esc(_td(def.desc)) + '</div>';

  if (level > 0 && id !== "apothecary") { // v3.565.0 : l'Apothicaire dit la même chose dans « Aujourd'hui »
    h += '<div class="vb-sheet-effect"><strong>' + _t("Effet actuel :") + '</strong> '
       + esc(VillageBuildingManager.getEffectLabel(id, level)) + '</div>';
  }

  /* Le Terrain renvoie vers l'écran où l'on dépense réellement : le bâtiment
     décide du plafond, Personnage → Stats reste le lieu de l'entraînement
     (décision Seb, option A). Sans ce renvoi, la fiche annoncerait un plafond
     sans dire où s'en servir. */
  if (id === "training" && level > 0) {
    h += '<div class="vb-sheet-effect vb-sheet-link" onclick="goToHeroTraining()">'
       + '<img class=ico-inline src=images/Icons/village_buildings/training_grounds.webp> ' + _t("S'entraîner dans Héros → Entraînement ›") + '</div>';
  }

  /* L'Apothicaire renvoie vers l'écran où l'on prépare, comme le Terrain
     renvoie vers l'entraînement : le bâtiment ouvre des recettes, la Boutique
     reste le lieu où l'on s'en sert. */
  if (id === "apothecary" && level > 0) {
    h += '<div class="vb-sheet-effect vb-sheet-link" onclick="goToPotions()">'
       + '<img class=ico-inline src=images/Icons/subtabs/potions.webp> ' + _t("Préparer dans Boutique → Potions ›") + '</div>';
    h += buildApothecaryOrdersHTML(); // v3.291.0 : les recettes se gagnent ici
  }

  /* La Forge, comme la Taverne, porte son contenu dans sa fiche : reforger n'a
     d'écran nulle part ailleurs. */
  if (id === "forge" && level > 0) {
    h += buildForgeBoardHTML();
  }

  /* L'Enchanteresse, comme la Forge, porte son établi dans sa fiche.
     v3.245.0 (refonte Donjons, décision 12.5) : la Boutique d'éclats du Donjon vit ici aussi, derrière
     un segment Relance / Éclats. Éclats reste accessible bâtiment NON construit — les éclats arrivent
     dès forest_13, bien avant l'Atelier niveau 3 : c'est une invitation à construire, pas une porte fermée. */
  if (id === "enchanter") {
    var seg = enchanterSheetSegment || (level > 0 ? "relance" : "eclats");
    if (level <= 0) seg = "eclats";
    h += '<div class="kseg vb-sheet-seg">';
    h += '<button type="button"' + (level > 0 ? '' : ' disabled') + ' class="' + (seg === "relance" ? 'is-on' : '') + '" onclick="setEnchanterSheetSegment(\'relance\')">' + _t("Relance") + '</button>';
    h += '<button type="button"' + (level > 0 ? '' : ' disabled') + ' class="' + (seg === "transmute" ? 'is-on' : '') + '" onclick="setEnchanterSheetSegment(\'transmute\')">' + _t("Transmuer") + '</button>'; // v3.465.0
    h += '<button type="button" class="' + (seg === "eclats" ? 'is-on' : '') + '" onclick="setEnchanterSheetSegment(\'eclats\')">' + _t("Éclats") + '<span class="kseg-count">' + formatNumber(game.dungeonShards || 0) + '</span></button>';
    h += '</div>';
    h += (level > 0 && seg === "relance") ? buildEnchantBoardHTML() : (level > 0 && seg === "transmute") ? buildTransmuteBoardHTML() : buildShardShopBoardHTML();
  }

  /* v3.778.0 : les contrats se livrent au tableau des missions ; la fiche en garde le résumé. */
  if (id === "tavern" && level > 0) {
    h += buildTavernContractsHTML();
  }

  /* L'Entrepôt agrandi renvoie vers l'Entrepôt lui-même. */
  if (id === "warehouse" && level > 0) {
    h += '<div class="vb-sheet-effect vb-sheet-link" onclick="goToWarehouse()">'
       + '<img class=ico-inline src=images/Icons/system/warehouse_supplies.webp> ' + _t("Voir l'Entrepôt ›") + '</div>';
  }

  /* La Halle renvoie vers l'échoppe qu'elle agrandit — même principe que le
     Terrain et l'Apothicaire : le bâtiment change les règles, l'écran d'origine
     reste le lieu où l'on s'en sert. */
  // v3.424.0 (H-1) : l'échoppe est un segment de cette feuille, plus de renvoi vers Héros.

  /* L'Atelier annonce le rang qu'il ouvre : c'est sa vraie fonction. */
  if (id === "workshop") {
    var rank = VillageBuildingManager.getRank();
    h += '<div class="vb-sheet-effect">'
       + (rank > 0 ? _t("Rang {n} — chantiers ouverts jusqu'à ce rang.", { n: rank })
                   : _t("Aucun rang atteint : construis l'Atelier pour ouvrir les premiers chantiers."))
       + '</div>';
  }

  if (onSite) {
    var left = VillageBuildingManager.getSiteSecondsLeft();
    var pct = VillageBuildingManager.getSiteProgressPct();
    h += '<div class="vb-sheet-progress">';
    h += '<div class="vb-sheet-progress-label" id="vb-sheet-left">' + esc(_t("Chantier en cours — fin dans {d}", { d: formatTime(left) })) + '</div>';
    h += '<div class="kgauge kgauge-thin kgauge-xp"><div class="kgauge-track">'
       + '<div class="kgauge-fill" id="vb-sheet-bar" style="width:' + pct.toFixed(1) + '%"></div>'
       + '</div></div>';
    h += '</div>';

  } else if (maxed) {
    h += '<div class="vb-sheet-actions">';
    // v3.289.0 : plafond du monde -> le bouton dit où se trouve la suite
    h += '<button class="settings-btn primary is-maxed" type="button" disabled>'
       + esc(VillageBuildingManager.isWorldCapped(id) ? VillageBuildingManager.getWorldCapLabel(id) : _t("Niveau maximum")) + '</button>';
    h += '</div>';

  } else if (!def.implemented) {
    h += '<div class="vb-sheet-effect">' + _t("Ce bâtiment arrive dans une prochaine mise à jour.") + '</div>';

  } else {
    var target = level + 1;
    var reason = VillageBuildingManager.getBlockReason(id);

    h += '<div class="vb-sheet-effect">' + _t("Niveau {n} :", { n: target }) + ' '
       + esc(VillageBuildingManager.getEffectLabel(id, target)) + '</div>';
    h += buildVillageCostListHTML(id);
    h += '<div class="vb-sheet-timer"><img class=ico-inline src=images/Icons/system/hourglass_waiting.webp> '
       + esc(_t("Durée du chantier : {d}", { d: formatTime(VillageBuildingManager.getNextBuildSeconds(id)) })) + '</div>';

    h += '<div class="vb-sheet-actions">';
    if (reason) {
      h += '<button class="settings-btn primary is-unaffordable" type="button" disabled>' + esc(reason) + '</button>';
    } else {
      h += '<button class="settings-btn primary" type="button" onclick="startVillageBuildFromSheet(\'' + id + '\')">'
         + (level === 0 ? _t("Construire") : _t("Améliorer")) + '</button>';
    }
    h += '</div>';
  }

  h += '</div></div></div>'; // ksheet-body, carte, voile
  return h;
}

/* v3.291.0 : commandes de l'Apothicaire, dans sa fiche (décision Seb). Une recette
   acquise est cochée, une commande ouverte montre ses ingrédients et « Livrer », une
   commande d'un monde pas encore atteint dit où elle s'ouvre. */
var apothecaryLearnedOpen = false; // v3.565.0 : « N recettes acquises » déplié

function buildApothecaryOrdersHTML() {
  var A = window.ApothecaryManager;
  if (!A) return "";
  var h = '<div class="vb-sheet-effect"><strong>' + _t("Aujourd’hui :") + '</strong> '
     + _t("{a} / {b} préparations (Soin mineur libre)", { a: A.getDailyUsed(), b: A.getDailyCap() }) + '</div>';
  // v3.363.0 (acte IV) : le puits du roi, si la forme a été rapportée à Aeswyn
  if (A.hasPuitsDuRoi()) h += '<div class="vb-sheet-effect"><img class="ico-inline" src="images/Icons/village_buildings/puits_du_roi.webp" alt=""> '
     + '<strong>' + _t("Le puits du roi :") + '</strong> ' + _t("2 préparations de plus par jour, moitié moins d’eau.") + '</div>';
  /* v3.565.0 (retour Seb, option A) : les recettes acquises tiennent en une ligne repliée ; seules
     les commandes encore à livrer restent en entier. */
  var recettes = (APOTHECARY_RECIPES || []).filter(function (r) { return !r.known; });
  var acquises = recettes.filter(function (r) { return A.isLearned(r.potionId); });
  if (acquises.length) {
    h += '<details class="vb-learned"' + (apothecaryLearnedOpen ? ' open' : '') + ' ontoggle="apothecaryLearnedOpen = this.open">'
       + '<summary class="vb-sheet-effect"><img class="ico-inline" src="images/Icons/system/check_valid.webp" alt=""> '
       + esc(_tn(acquises.length, "{n} recette acquise", "{n} recettes acquises", { n: acquises.length })) + '<span class="vb-learned-chev" aria-hidden="true">›</span></summary><div class="vb-learned-list">';
    acquises.forEach(function (r) { var po = A._getPotion(r); h += '<span class="vb-learned-chip">' + esc(po ? _td(po.name) : r.potionId) + '</span>'; });
    h += '</div></details>';
  }
  if (acquises.length < recettes.length) h += '<div class="vb-sheet-effect"><strong>' + _t("Commandes") + '</strong> ' + _t("— livre une fois, la recette est acquise pour toujours.") + '</div>';

  recettes.forEach(function (r) {
    var potion = A._getPotion(r);
    var name = potion ? _td(potion.name) : r.potionId;

    if (A.isLearned(r.potionId)) return; // dans la ligne repliée
    if (!A.isOrderOpen(r.potionId)) {
      h += '<div class="vb-sheet-effect is-locked"><img class=ico-inline src=images/Icons/system/lock_closed.webp> '
         + esc(name) + ' — ' + esc(A.getLockReason(r.potionId)) + '</div>';
      return;
    }

    h += '<div class="vb-sheet-effect"><strong>' + esc(name) + '</strong></div>';
    h += '<div class="vb-cost-list">';
    Object.keys(r.order).forEach(function (k) {
      var meta = getVillageCostMeta(k);
      var have = WarehouseManager.getAmount(k);
      var ok = have >= r.order[k];
      h += '<div class="vb-cost-row' + (ok ? '' : ' is-missing res-go') + '"' + (ok ? '' : resGoAttr(k)) + '>' + meta.iconHTML
         + '<span class="vb-cost-label">' + esc(_td(meta.label)) + '</span>'
         + '<span class="vb-cost-amount">' + (ok ? '' : formatNumber(Math.floor(have)) + ' / ') + formatNumber(r.order[k]) + '</span>' + (ok ? '' : '<span class="res-go-chev" aria-hidden="true">›</span>') + '</div>';
    });
    h += '</div>';
    var can = A.canDeliver(r.potionId);
    h += '<div class="vb-sheet-actions"><button class="settings-btn primary' + (can ? '' : ' is-unaffordable') + '" type="button"'
       + (can ? ' onclick="deliverApothecaryOrderFromSheet(\'' + esc(r.potionId) + '\')"' : ' disabled') + '>'
       + (can ? _t("Livrer la commande") : _t("Ingrédients manquants")) + '</button></div>';
  });
  return h;
}
window.buildApothecaryOrdersHTML = buildApothecaryOrdersHTML;

function deliverApothecaryOrderFromSheet(potionId) {
  if (ApothecaryManager.deliverOrder(potionId) && openVillageBuildingId === "apothecary") {
    openVillageBuildingSheet("apothecary"); // la fiche se redessine avec la recette cochée
  }
}
window.deliverApothecaryOrderFromSheet = deliverApothecaryOrderFromSheet;

function openVillageBuildingSheet(id) {
  var def = VILLAGE_BUILDINGS[id];
  if (!def) return;
  VillageBuildingManager.ensure();
  if (openVillageBuildingId !== id) hallSheetSegment = "shop"; // v3.426.0 : la Halle s'ouvre sur son Échoppe
  openVillageBuildingId = id;
  if (typeof productionDetailBuildingId !== "undefined") productionDetailBuildingId = null; // v3.414.0 : la feuille de production cède la place
  if (typeof openWorkshopId !== "undefined") openWorkshopId = null; // v3.415.0 : la feuille d'atelier aussi
  if (typeof selectedWarehouseKey !== "undefined") { selectedWarehouseKey = null; warehousePickerOpen = false; } // v3.416.0
  var host = document.getElementById("village-modal-root");
  if (!host) return;
  var top = (host.querySelector(".vb-sheet-card") && host.dataset.vb === id) ? getSheetScroll(host) : 0; // v3.563.0 : même fiche redessinée -> même position
  host.innerHTML = buildVillageBuildingSheetHTML(id);
  host.dataset.vb = id; delete host.dataset.go;
  setSheetScroll(host, top);
  // v3.704.0 (TUTO-16) : la fiche des contrats, une fois, au-dessus de la Taverne construite
  if (id === "tavern" && VillageBuildingManager.getLevel("tavern") >= 1 && typeof openGenericTutorialOnce === "function") openGenericTutorialOnce("tavern_contracts", { allow: "village-modal-root" });
}
window.openVillageBuildingSheet = openVillageBuildingSheet;

function closeVillageBuildingSheet() {
  openVillageBuildingId = null;
  var host = document.getElementById("village-modal-root");
  if (host) { host.innerHTML = ""; delete host.dataset.vb; }
}
window.closeVillageBuildingSheet = closeVillageBuildingSheet;

function closeVillageBuildingSheetFromBackdrop(e) {
  if (e && e.target && e.target.classList && e.target.classList.contains("full-menu-overlay")) {
    closeVillageBuildingSheet();
  }
}
window.closeVillageBuildingSheetFromBackdrop = closeVillageBuildingSheetFromBackdrop;

function startVillageBuildFromSheet(id) {
  if (VillageBuildingManager.startBuild(id) && openVillageBuildingId === id) {
    openVillageBuildingSheet(id);
  }
}
window.startVillageBuildFromSheet = startVillageBuildFromSheet;

/* Rafraîchissement léger du chantier : on ne re-rend PAS la fiche ni la
   grille à chaque seconde (le panneau clignoterait et le scroll sauterait).
   Seules la barre et l'étiquette de temps bougent. Appelé par la boucle. */
function refreshVillageSiteTickers() {
  var site = VillageBuildingManager.getSite();
  if (!site) return;

  var left = VillageBuildingManager.getSiteSecondsLeft();
  var pct = VillageBuildingManager.getSiteProgressPct().toFixed(1) + "%";

  var bar = document.getElementById("vb-site-bar");
  if (bar) bar.style.width = pct;
  var label = document.getElementById("vb-site-left");
  if (label) label.textContent = _t("Fin dans {d}", { d: formatTime(left) });

  var cardBar = document.getElementById("vb-card-bar");
  if (cardBar) cardBar.style.width = pct;
  var cardLeft = document.getElementById("vb-card-left");
  if (cardLeft) cardLeft.textContent = formatTime(left);

  var sheetBar = document.getElementById("vb-sheet-bar");
  if (sheetBar) sheetBar.style.width = pct;
  var sheetLeft = document.getElementById("vb-sheet-left");
  if (sheetLeft) sheetLeft.textContent = _t("Chantier en cours — fin dans {d}", { d: formatTime(left) });
}
window.refreshVillageSiteTickers = refreshVillageSiteTickers;

/* Raccourci inverse du mur de Personnage → Stats : de la fiche du Terrain vers
   l'entraînement. Les deux écrans se pointent l'un l'autre. */
function goToHeroTraining() {
  closeVillageBuildingSheet();
  if (typeof switchTab === "function") switchTab("more"); // onglet Personnage (voir ui-root.js)
  /* PIÈGE : les identifiants internes sont inversés par rapport aux libellés.
     Le sous-onglet affiché « <img class=ico-inline src=images/Icons/subtabs/hero_stats.webp> Stats » — celui qui porte les cartes de
     caractéristiques — s'appelle "amelioration" ; l'identifiant "stats" est
     celui de « <img class=ico-inline src=images/Icons/combat_stats/stat_attack.webp> Capacités ». Voir buildHerosSubTabBarHTML(). */
  if (typeof setHerosSubTab === "function") setHerosSubTab("amelioration");
}
window.goToHeroTraining = goToHeroTraining;

/* Renvoi de la fiche de l'Apothicaire vers l'écran des potions. */
function goToPotions() {
  closeVillageBuildingSheet();
  if (typeof switchTab === "function") switchTab("shop");
  if (typeof setShopSubTab === "function") setShopSubTab("potions");
}
window.goToPotions = goToPotions;

/* --- Contrats de la Taverne : résumé dans la fiche (v3.778.0, lot 4 Seb A) ---- */
/* Les contrats vivent au tableau des missions (Quêtes › Annexes) ; la fiche dit combien et renvoie. */
function buildTavernContractsHTML() {
  if (!window.TavernManager) return "";
  var open = TavernManager.getContracts().filter(function (c) { return !c.done; });
  var ready = open.filter(function (c) { return TavernManager.canDeliver(c.id); });
  var gold = open.reduce(function (s, c) { return s + TavernManager.getPayout(c); }, 0);
  var h = '<div class="tavern-board">';
  h += '<div class="tavern-board-head"><img class=ico-inline src=images/Icons/village_buildings/tavern_contracts.webp> ' + _t("Contrats du jour")
     + '<span class="tavern-board-timer">' + esc(_t("Renouvelés dans {d}", { d: formatTime(TavernManager.timeUntilRefresh()) })) + '</span></div>';
  h += '<div class="tavern-empty">' + (open.length
    ? esc(_tn(open.length, "{n} contrat ouvert, {g} or à gagner.", "{n} contrats ouverts, {g} or à gagner.", { g: formatNumber(gold) }))
      + (ready.length ? ' <b>' + esc(_tn(ready.length, "{n} livrable maintenant.", "{n} livrables maintenant.")) + '</b>' : '')
    : esc(_t("Tous les contrats du jour sont honorés."))) + '</div>';
  h += '<div class="vb-sheet-effect vb-sheet-link" onclick="goToTavernMissions()"><img class=ico-inline src=images/Icons/quests/quest_side.webp> '
     + esc(_t("Voir les contrats au tableau des missions ›")) + '</div>';
  return h + '</div>';
}
window.buildTavernContractsHTML = buildTavernContractsHTML;

/* Fiche fermée, puis Quêtes › Annexes où les contrats se livrent. */
function goToTavernMissions() {
  closeVillageBuildingSheet();
  if (typeof openQuestsAt === "function") openQuestsAt("resource");
}
window.goToTavernMissions = goToTavernMissions;

/* Renvoi de la fiche de l'Entrepôt agrandi vers l'Entrepôt. */
function goToWarehouse() {
  closeVillageBuildingSheet();
  if (typeof switchTab === "function") switchTab("village");
  if (typeof setVillageSubTab === "function") setVillageSubTab("entrepot");
}
window.goToWarehouse = goToWarehouse;

/* --- Établi de la Forge (rendu DANS la fiche) ---------------------------- */
// Forge des mondes (atelier forge-mondes.html, choix C et A) : monde en cours en grand, mondes finis en une ligne, gain sur le bouton

var FORGE_BAND_CLASSES = ["", "is-w1", "is-w2", "is-w3", "is-w4", "is-w5"];

/* Valeur affichable d'une stat du héros pour une bande (PV, Défense, critique, ATK, ×crit). */
function forgeHeroStatText(band) {
  var S = window.StatsSystem;
  if (!S) return "";
  if (band === 1) return formatNumber(Math.floor(game.heroMaxHp || 0));
  if (band === 2) return fmtPct(fmtDec(Math.round((game.heroDefensePct || 0) * 1000) / 10));
  if (band === 3) return fmtPct(fmtDec(Math.round(S.effectiveCritChance() * 10) / 10));
  if (band === 4) return formatNumber(Math.round(S.effectiveTapDamage()));
  return "×" + fmtDec(Math.round(S.effectiveCritMult() * 100) / 100);
}

/* Stat du héros sans les reforges de la bande, puis avec (recalcul remis en place, PV courants compris). */
function forgeHeroBandDelta(band) {
  if (!window.StatsSystem || !game.forge || !game.forge.levels) return null;
  var lv = game.forge.levels, saved = {}, hp = game.heroHp, lo = FORGE_REFORGES_PER_WORLD * (band - 1), out = null;
  var avec = forgeHeroStatText(band);
  try {
    Object.keys(lv).forEach(function (k) { saved[k] = lv[k]; lv[k] = Math.min(lv[k], lo); });
    StatsSystem.recalcStats();
    out = { sans: forgeHeroStatText(band), avec: avec };
  } catch (e) { noteErreur("forgeHeroBandDelta", e); }
  finally {
    Object.keys(saved).forEach(function (k) { lv[k] = saved[k]; });
    StatsSystem.recalcStats(); game.heroHp = Math.min(hp, game.heroMaxHp);
  }
  return out;
}

/* Une carte de monde : grande (le monde en cours), « mini » (fini ou entamé) ou fermée (le suivant). */
function forgeWorldCardHTML(band, kind) {
  var F = ForgeManager, def = F.getBandDef(band), n = F.getBandCount(band), full = F.getBandMaxCount();
  var per = FORGE_REFORGES_PER_WORLD, first = per * (band - 1) + 1, fMin = 2 * band - 1, top = F.formatPct(full * FORGE_WORLD_BONUS_PER_REFORGE);
  var cls = 'forge-world ' + FORGE_BAND_CLASSES[band], ico = '<img class="forge-world-ico" src="' + esc(def.icon) + '" alt="">';
  if (kind === "lock") {
    return '<div class="' + cls + ' is-lock"><div class="forge-world-title">' + ico + esc(def.world) + ' · ' + esc(def.label) + '</div>'
      + '<div class="forge-world-line">' + esc(_t("S'ouvre à la Forge {f} : reforges {a} à {b}, +{p} à chacune, jusqu'à {t}.", { f: fMin, a: first, b: first + per - 1, p: F.formatPct(FORGE_WORLD_BONUS_PER_REFORGE), t: top })) + '</div></div>';
  }
  if (kind === "mini") {
    return '<div class="' + cls + ' is-mini"><div class="forge-world-title">' + ico + (n >= full ? '✓ ' : '') + esc(_t("{w} : {s}", { w: def.world, s: def.label }))
      + '<span>' + esc("+" + F.formatPct(F.getWorldBonus(band)) + (n < full ? " / " + top : "")) + '</span></div></div>';
  }
  var ticks = "";
  for (var t = 1; t < EQUIPMENT_SLOTS.length; t++) ticks += '<u style="left:' + (t * 100 / EQUIPMENT_SLOTS.length).toFixed(2) + '%"></u>';
  var d = forgeHeroBandDelta(band);
  var h = '<div class="' + cls + '"><div class="forge-world-title">' + ico + esc(def.world) + '<span>' + esc("+" + F.formatPct(F.getWorldBonus(band)) + " / " + top) + '</span></div>';
  h += '<div class="forge-world-bar"><i style="width:' + Math.round(n / full * 1000) / 10 + '%"></i>' + ticks + '</div>';
  h += '<div class="forge-world-line"><b>' + esc(_t("+{p} de {s} à chaque reforge", { p: F.formatPct(FORGE_WORLD_BONUS_PER_REFORGE), s: def.label })) + '</b> · '
    + esc(_t("reforges {a} à {b} (Forge {f}-{g}), {n} / {m}", { a: first, b: first + per - 1, f: fMin, g: fMin + 1, n: n, m: full })) + '</div>';
  if (d) h += '<div class="forge-world-line">' + esc(d.sans === d.avec ? _t("Ton héros : {s} {a}", { s: def.label, a: d.avec }) : _t("Ton héros : {s} {a} → {b}", { s: def.label, a: d.sans, b: d.avec }))
    + esc(n < full ? " · " + _t("encore +{p} à gagner", { p: F.formatPct((full - n) * FORGE_WORLD_BONUS_PER_REFORGE) }) : " · " + _t("complet")) + '</div>';
  return h + '</div>';
}

/* 4 crans à la couleur du monde de la prochaine reforge : ceux déjà faits dans cette bande. */
function forgePipsHTML(level) {
  var F = ForgeManager, per = FORGE_REFORGES_PER_WORLD, last = FORGE_WORLD_BONUSES.length;
  var band = F.getBand(Math.min(level + 1, per * last)), on = Math.max(0, Math.min(per, level - per * (band - 1)));
  var h = '<span class="forge-pips ' + FORGE_BAND_CLASSES[band] + '" title="' + esc(F.getBandDef(band).world) + '">';
  for (var i = 0; i < per; i++) h += '<i' + (i < on ? ' class="on"' : '') + '></i>';
  return h + '</span>';
}

function buildForgeBoardHTML() {
  if (!window.ForgeManager) return "";
  ForgeManager.ensure();

  var F = ForgeManager, max = F.getMaxLevel(), last = FORGE_WORLD_BONUSES.length;
  var cur = Math.max(1, F.getBand(Math.min(max, FORGE_REFORGES_PER_WORLD * last)));
  var h = '<div class="forge-worlds">';
  for (var b = 1; b < cur; b++) h += forgeWorldCardHTML(b, "mini");
  h += forgeWorldCardHTML(cur, "big");
  if (cur < last) h += forgeWorldCardHTML(cur + 1, "lock");
  h += '</div>';

  h += '<div class="forge-board">';
  h += '<div class="forge-board-head"><img class=ico-inline src=images/Icons/workshops/smithing_station.webp> ' + _t("Établi")
     + '<span class="forge-board-max">' + _t("Reforges jusqu'à {n}", { n: max }) + '</span></div>';
  h += '<div class="forge-board-note">' + _t("La reforge ne touche plus la pièce : elle renforce ton héros, pour toujours. Le niveau reste à l'emplacement.") + '</div>';

  var provenancesVues = {}; // v3.448.6 : chaque provenance une seule fois sur l'établi
  EQUIPMENT_SLOTS.forEach(function (slot) {
    var level = F.getLevel(slot);
    var item = (game.equipped || {})[slot];
    var cost = F.getCost(slot);
    var reason = F.getBlockReason(slot);

    h += '<div class="forge-row">';
    h += '<div class="forge-row-main">';
    h += '<div class="forge-row-name">' + esc(_td(EQUIPMENT_SLOT_LABELS[slot] || slot)) + ' ' + forgePipsHTML(level)
       + ' <span class="forge-row-level">' + esc(_tn(level, "{n} reforge", "{n} reforges")) + '</span></div>';

    if (item) {
      // La pièce garde sa valeur de butin : la reforge renforce le héros
      h += '<div class="forge-row-effect">' + esc(_t("{a} : {b}", { a: _td(item.name), b: formatEquipmentStat(item) })) + '</div>';
    } else {
      h += '<div class="forge-row-effect forge-row-empty">' + _t("Vide — le niveau reste à l'emplacement.") + '</div>';
    }

    if (cost) {
      if (F.isStoryReforge && F.isStoryReforge(slot, level + 1)) {
        // v3.437.3 : seul l'acier est fourni (STORY_PROVIDED_MATERIALS) ; Résine et Chitine restent dues
        h += '<div class="forge-board-note">' + _t("Acier fourni par le village (reforge exigée par l’Histoire)") + '</div>';
      }
      h += '<div class="forge-row-cost">';
      var manquants = [];
      Object.keys(cost).forEach(function (key) {
        var meta = getVillageCostMeta(key);
        var have = (key === "gold") ? Number(game.gold || 0) : WarehouseManager.getAmount(key);
        var ok = have >= cost[key];
        h += '<span class="forge-cost-item' + (ok ? '' : ' is-missing' + (key === "gold" ? '' : ' res-go')) + '"' + (ok ? '' : resGoAttr(key)) + '>'
           + meta.iconHTML + formatNumber(cost[key]) + '</span>';
        if (!ok && key !== "gold" && !provenancesVues[key]) { provenancesVues[key] = true; manquants.push(key); }
      });
      h += '</div>';
      // v3.448.6 : où trouver chaque matériau qui manque (comme sur les chantiers du village)
      manquants.forEach(function (key) {
        var hint = WarehouseManager.capHint(key, cost[key]) || getVillageResourceHint(key); // EQUI-2
        if (hint) h += '<div class="vb-cost-where forge-row-where res-go-link"' + resGoAttr(key) + '>' + esc(_t("{a} : {b}", { a: _td(getVillageCostMeta(key).label), b: hint })) + ' ›</div>';
      });
    }
    h += '</div>';

    h += '<div class="forge-row-side">';
    if (!cost) {
      h += '<div class="forge-row-btn is-off">' + (level >= FORGE_REFORGES_PER_WORLD * last ? _t("Maximum") : _t("Améliore") + '<br>' + _t("la Forge")) + '</div>';
    } else if (reason) {
      h += '<div class="forge-row-btn is-off">' + esc(reason) + '</div>';
    } else {
      h += '<button type="button" class="forge-row-btn" onclick="reforgeSlot(\'' + esc(slot) + '\')">' + _t("Reforger") + '<small>' + esc(F.getNextGainShort(slot) || "") + '</small></button>';
    }
    h += '</div>';

    h += '</div>';
  });

  h += '</div>';
  return h;
}
window.buildForgeBoardHTML = buildForgeBoardHTML;

/* Forge des mondes, fenêtre « La Forge a changé » (choix A) : une fois par appareil (Prefs forgeMondesSeen), pièces
   (valeur reforgée → butin) contre bonus du héros. Héros sans reforge : marquée vue sans rien montrer. */
function forgeChangeTotal() {
  var lv = (game.forge && game.forge.levels) || {};
  return Object.keys(lv).reduce(function (a, k) { return a + Math.max(0, Number(lv[k]) || 0); }, 0);
}

function forgeChangeHTML() {
  var F = ForgeManager, total = forgeChangeTotal(), lis = "";
  FORGE_WORLD_BONUSES.forEach(function (def, i) {
    var n = F.getBandCount(i + 1);
    if (!n) return;
    lis += '<li><img src="' + esc(def.icon) + '" alt=""><span><b>' + esc(_tn(n, "{w} · {n} reforge", "{w} · {n} reforges", { w: def.world })) + '</b><small>'
      + esc(_t("+{p} de {s}, pour toujours", { p: F.formatPct(F.getWorldBonus(i + 1)), s: def.label })) + '</small></span></li>';
  });
  var pertes = [];
  EQUIPMENT_SLOTS.forEach(function (slot) {
    var it = (game.equipped || {})[slot];
    if (!it || F.getLevel(slot) <= 0) return;
    var avant = formatEquipmentStat(Object.assign({}, it, { value: F.getLegacyForgedValue(it) })), apres = formatEquipmentStat(it);
    if (avant !== apres) pertes.push(_t("{x} : {a} → {b}", { x: _td(it.name), a: avant, b: apres }));
  });
  if (pertes.length) lis += '<li><img src="images/Icons/equipment_slots/pieces_loot.webp" alt=""><span><b>' + esc(_t("Tes pièces reprennent leur valeur")) + '</b><small>' + esc(pertes.join(" · ")) + '</small></span></li>';
  var h = '<div class="full-menu-overlay kwin-veil"><div class="kwin news-win forge-news-win" role="dialog" aria-label="' + esc(_t("La Forge a changé")) + '">';
  h += kWinHeadHTML({ icon: '<img src="images/Icons/village_buildings/forge_mondes.webp" alt="">', title: esc(_t("La Forge a changé")), sub: esc(_tn(total, "Ta {n} reforge est gardée", "Tes {n} reforges sont gardées")) });
  h += '<div class="kwin-body"><p class="forge-news-txt">' + esc(_t("Une reforge ne renforce plus la pièce : elle renforce ton héros, pour toujours. Chaque monde a sa stat ; tes reforges sont rangées par monde.")) + '</p>';
  h += '<ul class="news-list">' + lis + '</ul>';
  h += '<div class="forge-news-btns"><button type="button" class="kbtn" onclick="closeForgeChange()">' + esc(_t("Fermer")) + '</button>'
    + '<button type="button" class="kbtn primary" onclick="closeForgeChange(true)">' + esc(_t("Voir la Forge")) + '</button></div></div></div></div>';
  return h;
}

function openForgeChange() {
  if (!window.ForgeManager || !document.body) return;
  var root = document.getElementById("forge-news-root");
  if (!root) { root = document.createElement("div"); root.id = "forge-news-root"; document.body.appendChild(root); }
  root.innerHTML = forgeChangeHTML();
  if (window.Prefs) Prefs.setValue("forgeMondesSeen", "1"); // vue une fois sur cet appareil
}

function closeForgeChange(voir) {
  var root = document.getElementById("forge-news-root");
  if (root) root.innerHTML = "";
  if (!voir) return;
  if (typeof switchTab === "function") switchTab("village");
  if (typeof setVillageSubTab === "function") setVillageSubTab("village");
  if (typeof openVillageBuildingSheet === "function") openVillageBuildingSheet("forge");
}

// Au lancement, comme « Quoi de neuf » : attend que le héros soit libre et qu'aucune fenêtre ne soit ouverte
var forgeChangeTimer = null;
function forgeChangeWatch() {
  if (forgeChangeTimer || typeof setInterval !== "function" || !window.Prefs || Prefs.has("forgeMondesSeen")) return;
  forgeChangeTimer = setInterval(function () {
    if (typeof titleScreenResolved !== "undefined" && !titleScreenResolved) return;
    if (!window.game || !game.heroId || !window.ForgeManager) return;
    var stop = function () { clearInterval(forgeChangeTimer); forgeChangeTimer = null; };
    if (Prefs.has("forgeMondesSeen")) return stop();
    if (!forgeChangeTotal()) { Prefs.setValue("forgeMondesSeen", "1"); return stop(); }
    if (typeof newsCanShow === "function" && !newsCanShow()) return;
    stop(); openForgeChange();
  }, 2500);
}
if (typeof window !== "undefined" && typeof window.addEventListener === "function") window.addEventListener("load", forgeChangeWatch);
window.openForgeChange = openForgeChange;
window.closeForgeChange = closeForgeChange;
window.forgeChangeHTML = forgeChangeHTML;

function reforgeSlot(slot) {
  if (ForgeManager.reforge(slot) && openVillageBuildingId === "forge") {
    openVillageBuildingSheet("forge");
  }
}
window.reforgeSlot = reforgeSlot;

/* v3.542.0 (audit CMP-2, option 1B) : ce que vaut une relance avant de payer. Gain moyen (la valeur ne baisse
   jamais : E[max(v, x)] − v, x uniforme sur la fourchette) et effet sur le héros si le bonus monte au maximum. */
function enchantHeroSnapshot() {
  var S = StatsSystem;
  return { pv: Math.floor(game.heroMaxHp || 0), atk: Math.round(S.effectiveTapDamage()), vit: Math.round(CombatEngine.getTotalCelerity()),
    def: Math.round((game.heroDefensePct || 0) * 1000) / 10, crit: Math.round(S.effectiveCritChance() * 10) / 10, critx: Math.round(S.effectiveCritMult() * 100) / 100 };
}
/* Recalcule le héros avec la ligne posée à `value`, puis remet tout en place (PV courants compris). */
function enchantHeroDelta(affix, value) {
  if (!window.StatsSystem || !window.CombatEngine) return null;
  var before = enchantHeroSnapshot(), old = affix.value, hp = game.heroHp, after = null;
  try {
    affix.value = value; StatsSystem.recalcStats(); after = enchantHeroSnapshot();
  } catch (e) { noteErreur("enchantHeroDelta", e); }
  finally { affix.value = old; StatsSystem.recalcStats(); game.heroHp = Math.min(hp, game.heroMaxHp); }
  if (!after) return null;
  var parts = [], fmt = function (x) { return formatNumber(Math.round(x * 100) / 100); };
  if (after.pv > before.pv) parts.push(_t("+{n} PV", { n: fmt(after.pv - before.pv) }));
  if (after.atk > before.atk) parts.push(_t("+{n} ATK", { n: fmt(after.atk - before.atk) }));
  if (after.vit > before.vit) parts.push(_t("+{n} de célérité", { n: fmt(after.vit - before.vit) }));
  if (after.def > before.def) parts.push(_t("+{n} % de défense", { n: fmt(after.def - before.def) }));
  if (after.crit > before.crit) parts.push(_t("+{n} % de critique", { n: fmt(after.crit - before.crit) }));
  if (after.critx > before.critx) parts.push(_t("+{n} aux dégâts critiques", { n: "×" + fmt(after.critx - before.critx) }));
  return parts.join(" · ");
}
function enchantGainHTML(item, index, affix, range) {
  var v = Number(affix.value) || 0, lo = range.min, hi = range.max, f = Math.pow(10, range.decimals);
  var mean = hi > lo ? (v <= lo ? (lo + hi) / 2 - v : (hi - v) * (hi - v) / (2 * (hi - lo))) : 0;
  mean = Math.round(mean * f) / f;
  var h = '<div class="forge-row-effect ench-gain">';
  var txt = mean > 0 ? formatEquipmentStatValue(affix.stat, mean) : "";
  h += esc(txt && !/\+0(?![.,\d])/.test(txt) ? _t("Une relance, en moyenne : {x}", { x: txt }) : _t("Une relance, en moyenne : presque rien"));
  var hero = enchantHeroDelta(affix, hi);
  if (hero) h += '<br>' + esc(_t("Au maximum, ton héros gagne {x}", { x: hero }));
  return h + '</div>';
}

/* --- Établi de l'Enchanteresse (rendu DANS la fiche) --------------------- */
/* Ne liste que les pièces ÉQUIPÉES qui portent des bonus : une grille de tout
   l'inventaire serait illisible dans une fiche, et on enchante ce qu'on porte. */
function buildEnchantBoardHTML() {
  if (!window.EnchantManager) return "";

  var allowed = EnchantManager.getAllowedRarities().map(function (r) {
    return _td((typeof RARITY_LABELS !== "undefined" && RARITY_LABELS[r]) || r);
  });
  var h = '<div class="forge-board">';
  h += '<div class="forge-board-head"><img class=ico-inline src=images/Icons/workshops/workbench.webp> ' + _t("Établi")
     + '<span class="forge-board-max">' + (allowed.length ? esc(allowed.join(", ")) : _t("Aucune rareté")) + '</span></div>';
  h += '<div class="forge-board-note">' + _t("La ligne garde sa nature : seule sa valeur est relancée, et jamais vers le bas. Chaque relance de la même ligne coûte plus cher.") + '</div>';

  var rows = 0;
  EQUIPMENT_SLOTS.forEach(function (slot) {
    var item = (game.equipped || {})[slot];
    var affixes = item ? getItemAffixes(item) : [];
    if (!affixes.length) return;
    rows += 1;

    h += '<div class="ench-item">';
    /* Le libellé d'emplacement n'est repris que s'il n'est pas déjà le nom de la pièce
       (« Gants Gants » sortait au rendu). */
    var slotLabel = _td(EQUIPMENT_SLOT_LABELS[slot] || slot);
    h += '<div class="ench-item-name rarity-' + esc(item.rarity) + '">' + esc(_td(item.name))
       + (slotLabel === _td(item.name) ? '' : ' <span class="forge-row-level">' + esc(slotLabel) + '</span>')
       + '</div>';

    affixes.forEach(function (a, index) {
      var range = EnchantManager.getRange(item, index);
      var cost = EnchantManager.getCost(item, index);
      var reason = EnchantManager.getBlockReason(item, index);
      var n = EnchantManager.getRerollCount(item, index);

      h += '<div class="forge-row">';
      h += '<div class="forge-row-main">';
      h += '<div class="forge-row-name">' + esc(formatEquipmentStatValue(a.stat, a.value))
         + (n > 0 ? ' <span class="forge-row-level">' + _tn(n, "{n} relance", "{n} relances") + '</span>' : '') + '</div>';
      if (range) {
        /* Le haut de fourchette dit au joueur ce qu'il peut encore espérer —
           sans lui, la relance serait un pari sur un plafond invisible. */
        h += '<div class="forge-row-effect">'
           + esc(_t("Maximum possible : {x}", { x: formatEquipmentStatValue(a.stat, Math.round(range.max * Math.pow(10, range.decimals)) / Math.pow(10, range.decimals)) }))
           + '</div>';
      }
      if (range && Number(a.value) < range.max) h += enchantGainHTML(item, index, a, range); // v3.542.0 (CMP-2, 1B)
      if (cost) {
        h += '<div class="forge-row-cost">';
        [["gold", cost.gold]].forEach(function (pair) { // v3.459.10 : relance en or seul
          var meta = getVillageCostMeta(pair[0]);
          var have = (pair[0] === "gold") ? Number(game.gold || 0) : WarehouseManager.getAmount(pair[0]);
          h += '<span class="forge-cost-item' + (have >= pair[1] ? '' : ' is-missing') + '">'
             + meta.iconHTML + formatNumber(pair[1]) + '</span>';
        });
        h += '</div>';
      }
      h += '</div>';

      h += '<div class="forge-row-side">';
      if (reason) {
        h += '<div class="forge-row-btn is-off">' + esc(reason) + '</div>';
      } else {
        h += '<button type="button" class="forge-row-btn" onclick="rerollAffix(\'' + esc(slot) + '\',' + index + ')">' + _t("Relancer") + '</button>';
      }
      h += '</div>';
      h += '</div>';
    });

    h += '</div>';
  });

  if (!rows) {
    h += '<div class="forge-row-effect forge-row-empty">' + _t("Aucune pièce équipée ne porte de bonus. Les objets inhabituels et au-dessus en ont.") + '</div>';
  }

  h += '</div>';
  return h;
}
window.buildEnchantBoardHTML = buildEnchantBoardHTML;

/* v3.465.0 (atelier/enchanteresse.html, validé le 23/10) : onglet Transmuer. Chaque bonus montre en
   puces les stats qu'il peut devenir, valeur comprise ; une puce demande confirmation. */
function buildTransmuteBoardHTML() {
  if (!window.EnchantManager) return "";
  var EM = EnchantManager, meta = getVillageCostMeta("gold");
  var h = '<div class="forge-board">';
  h += '<div class="forge-board-head"><img class=ico-inline src=images/Icons/workshops/workbench.webp> ' + _t("Établi") + '<span class="forge-board-max">' + _t("Transmutation") + '</span></div>';
  h += '<div class="forge-board-note">' + _t("Change la nature d'un bonus. La valeur garde sa place dans la fourchette : un bonus haut reste haut.") + '</div>';
  var rows = 0;
  EQUIPMENT_SLOTS.forEach(function (slot) {
    var item = (game.equipped || {})[slot], aff = item ? getItemAffixes(item) : [];
    if (!aff.length) return;
    rows += 1;
    var slotLabel = _td(EQUIPMENT_SLOT_LABELS[slot] || slot);
    h += '<div class="ench-item"><div class="ench-item-name rarity-' + esc(item.rarity) + '">' + esc(_td(item.name))
       + (slotLabel === _td(item.name) ? '' : ' <span class="forge-row-level">' + esc(slotLabel) + '</span>') + '</div>';
    aff.forEach(function (a, i) {
      var reason = EM.getTransmuteBlockReason(item, i), cost = EM.getTransmuteCost(item, i), n = EM.getTransmuteCount(item, i);
      var opts = EM.getTransmuteOptions(item, i), poor = reason === _t("Pas assez d'or"); // v3.483.0 : le blocage de l'or s'appelle ainsi
      h += '<div class="forge-row"><div class="forge-row-main ench-tr-main">';
      h += '<div class="forge-row-name">' + esc(formatEquipmentStatValue(a.stat, a.value))
         + (n > 0 ? ' <span class="forge-row-level">' + _tn(n, "{n} transmutation", "{n} transmutations") + '</span>' : '') + '</div>';
      if (reason && !poor) {
        h += '<div class="ench-tr-none">' + esc(reason) + '</div>';
      } else {
        h += '<div class="forge-row-cost"><span class="forge-cost-item' + (poor ? ' is-missing' : '') + '">' + meta.iconHTML + formatNumber(cost.gold) + '</span></div>';
        h += '<div class="ench-tr-chips">';
        opts.forEach(function (o) {
          h += '<button type="button" class="ench-tr-chip"' + (poor ? ' disabled' : '') + ' onclick="askTransmuteAffix(\'' + esc(slot) + '\',' + i + ',\'' + esc(o.stat) + '\')">'
             + esc(formatEquipmentStatValue(o.stat, o.value)) + '</button>';
        });
        h += '</div>';
      }
      h += '</div></div>';
    });
    h += '</div>';
  });
  if (!rows) h += '<div class="forge-row-effect forge-row-empty">' + _t("Aucune pièce équipée ne porte de bonus. Les objets inhabituels et au-dessus en ont.") + '</div>';
  h += '</div>';
  return h;
}
window.buildTransmuteBoardHTML = buildTransmuteBoardHTML;

function askTransmuteAffix(slot, index, stat) {
  var item = (game.equipped || {})[slot], a = item && getItemAffixes(item)[index];
  var o = a && EnchantManager.getTransmuteOptions(item, index).filter(function (x) { return x.stat === stat; })[0];
  var cost = a && EnchantManager.getTransmuteCost(item, index);
  if (!o || !cost) return;
  showConfirmModal(_t("Transmuer ce bonus ?"),
    _t("{a} devient {b}, pour {g} or. La ligne pourra être transmuée de nouveau, plus cher.", { a: formatEquipmentStatValue(a.stat, a.value), b: formatEquipmentStatValue(o.stat, o.value), g: formatNumber(cost.gold) }),
    "images/Icons/workshops/workbench.webp", function () {
      if (EnchantManager.transmute(item, index, stat) && openVillageBuildingId === "enchanter") openVillageBuildingSheet("enchanter");
    });
}
window.askTransmuteAffix = askTransmuteAffix;

/* --- Boutique d'éclats (ex-sous-onglet Donjon > Boutique, v3.245.0) ------ */
var enchanterSheetSegment = null; // variable de vue, non sauvegardée

function setEnchanterSheetSegment(seg) {
  enchanterSheetSegment = (seg === "eclats" || seg === "transmute") ? seg : "relance";
  if (openVillageBuildingId === "enchanter") openVillageBuildingSheet("enchanter");
}
window.setEnchanterSheetSegment = setEnchanterSheetSegment;

function buildShardShopBoardHTML() {
  if (!window.DungeonManager || !window.DUNGEON_SHOP) return "";
  var shards = game.dungeonShards || 0;
  var h = '<div class="vb-shard-board">';
  h += '<div class="vb-shard-count"><img class=ico-inline src=images/Icons/subtabs/shard_shop.webp> ' + _t("{n} Éclats", { n: formatNumber(shards) }) + '</div>';
  h += '<div class="vb-board-sub">' + _t("Payée en Éclats — gagnés en passant des vagues de donjon (1 par vague, +{b} si le boss tombe, +{e} par élite). Utilisables uniquement ici.", { b: DUNGEON_CONFIG.shardsBossBonus, e: DUNGEON_CONFIG.eliteShardsBonus || 0 }) + '</div>';
  h += '<div class="dungeon-shop-grid">';
  (DUNGEON_SHOP || []).forEach(function (item) {
    var level = DungeonManager.getShardShopLevel(item.id);
    var maxed = level >= item.maxLevel;
    var cost = DungeonManager.getShardShopCost(item);
    var lock = maxed ? 0 : DungeonManager.getShardShopLock(item); // v3.463.0 : palier de la Crypte
    var canBuy = !maxed && !lock && shards >= cost;
    h += '<div class="nb-purchase-card' + (maxed ? ' is-maxed' : '') + (canBuy ? ' affordable' : '') + '">'; // UI-11
    h += '<div class="nb-purchase-icon-col"><div class="nb-purchase-icon-slot">' + renderIconOrEmojiHTML(item.icon, "nb-purchase-icon", _td(item.name)) + '</div></div>';
    h += '<div class="nb-purchase-info-col">';
    h += '<div class="nb-purchase-name">' + esc(_td(item.name)) + '</div>';
    h += '<div class="nb-purchase-meta">' + _t("Niv. {a}/{b}", { a: level, b: item.maxLevel }) + '</div>';
    h += '<div class="nb-purchase-desc">' + esc(_td(item.desc)) + '</div>';
    if (lock) h += '<div class="nb-purchase-meta">' + esc(DungeonManager.getShardShopLockText(lock)) + '</div>';
    h += '</div>';
    h += '<div class="nb-purchase-buy-col">';
    if (maxed) {
      h += '<button class="btn-buy kbuy is-maxed" type="button" disabled>' + _t("Max") + '</button>';
    } else if (lock) {
      h += '<button class="btn-buy kbuy cant-afford" type="button" disabled aria-label="' + esc(DungeonManager.getShardShopLockText(lock)) + '"><img src="images/Icons/system/lock_closed.webp" alt=""></button>';
    } else {
      h += '<button class="btn-buy kbuy' + (canBuy ? '' : ' cant-afford') + '" type="button" onclick="buyShardUpgradeFromSheet(\'' + esc(item.id) + '\')"><img src="images/Icons/subtabs/shard_shop.webp" alt="">' + formatNumber(cost) + '</button>';
    }
    h += '</div>';
    h += '</div>';
  });
  h += '</div>';
  h += '</div>';
  return h;
}
window.buildShardShopBoardHTML = buildShardShopBoardHTML;

function buyShardUpgradeFromSheet(id) {
  DungeonManager.buyShardUpgrade(id);
  if (openVillageBuildingId === "enchanter") openVillageBuildingSheet("enchanter");
}
window.buyShardUpgradeFromSheet = buyShardUpgradeFromSheet;

function rerollAffix(slot, index) {
  var item = (game.equipped || {})[slot];
  if (EnchantManager.reroll(item, index) && openVillageBuildingId === "enchanter") {
    openVillageBuildingSheet("enchanter");
  }
}
window.rerollAffix = rerollAffix;
