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

function getVillageCostMeta(key) {
  if (key === "gold") {
    return {
      label: "Or",
      iconHTML: '<img class="vb-cost-icon" src="images/Icons/gold_icon.png" alt="">'
    };
  }
  var def = WAREHOUSE_RESOURCES[key];
  if (!def) return { label: key, iconHTML: "" };
  return {
    label: def.name,
    iconHTML: renderIconOrEmojiHTML(def.icon, "vb-cost-icon", def.name)
  };
}

/* Icône d'un bâtiment : image si elle existe, emoji sinon. Les visuels du
   village ne sont pas encore produits — l'emoji tient la place sans bloquer
   le chantier (décision Seb, 11/09/2026). */
function buildVillageBuildingIconHTML(def, cssClass) {
  return renderIconOrEmojiHTML(def.iconImg || def.icon, cssClass, def.name);
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
    h += '<div class="vb-cost-where vb-cost-provided">Matériaux fournis par le village (niveau exigé par l\u2019Histoire)</div>';
  }
  keys.forEach(function (key) {
    var meta = getVillageCostMeta(key);
    var ok = !!afford[key];
    var have = (key === "gold") ? Number(game.gold || 0) : WarehouseManager.getAmount(key);
    var unreachable = !ok && isVillageResourceUnreachable(key);

    h += '<div class="vb-cost-row' + (ok ? '' : (unreachable ? ' is-unreachable' : ' is-missing')) + '">';
    h += meta.iconHTML;
    h += '<span class="vb-cost-label">' + esc(meta.label) + '</span>';
    /* On affiche le COÛT ; l'avoir n'apparaît que s'il manque quelque
       chose, sinon la ligne est du bruit. */
    h += '<span class="vb-cost-amount">'
       + (ok ? '' : formatNumber(Math.floor(have)) + ' / ')
       + formatNumber(cost[key]) + '</span>';
    /* Une ressource d'un monde pas encore atteint n'est pas « manquante »,
       elle est introuvable : la loupe et non la croix, et on dit où. */
    h += '<span class="vb-cost-check">' + (ok ? '<img class="ico-sys" src="images/Icons/system/check_valid.png" alt="">' : (unreachable ? '<img class="ico-sys" src="images/Icons/system/search_unknown.png" alt="">' : '<img class="ico-sys" src="images/Icons/system/cross_error.png" alt="">')) + '</span>';
    h += '</div>';

    if (!ok) {
      var hint = getVillageResourceHint(key);
      if (hint) h += '<div class="vb-cost-where">' + esc(hint) + '</div>';
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
function isVillageResourceUnreachable(key) {
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
  if (isVillageResourceUnreachable(key)) {
    return def.worldName ? ("Se trouve en " + def.worldName + ".") : "Pas encore accessible.";
  }
  return def.sourceHint || "";
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

  h += '<div class="vb-sheet-head">';
  h += buildVillageBuildingIconHTML(def, "vb-sheet-icon");
  h += '<div class="vb-sheet-head-text">';
  h += '<div class="vb-sheet-title">' + esc(def.name) + '</div>';
  h += '<div class="vb-sheet-level">' + (level === 0 ? 'Non construit' : 'Niveau ' + level + ' / ' + VillageBuildingManager.getMaxLevel(id)) + '</div>';
  h += '</div></div>';

  h += '<div class="vb-sheet-text">' + esc(def.desc) + '</div>';

  if (level > 0) {
    h += '<div class="vb-sheet-effect"><strong>Effet actuel :</strong> '
       + esc(VillageBuildingManager.getEffectLabel(id, level)) + '</div>';
  }

  /* Le Terrain renvoie vers l'écran où l'on dépense réellement : le bâtiment
     décide du plafond, Personnage → Stats reste le lieu de l'entraînement
     (décision Seb, option A). Sans ce renvoi, la fiche annoncerait un plafond
     sans dire où s'en servir. */
  if (id === "training" && level > 0) {
    h += '<div class="vb-sheet-effect vb-sheet-link" onclick="goToHeroTraining()">'
       + '<img class=ico-inline src=images/Icons/combat_stats/stat_critical.png> S\'entraîner dans Héros → Stats ›</div>';
  }

  /* L'Apothicaire renvoie vers l'écran où l'on prépare, comme le Terrain
     renvoie vers l'entraînement : le bâtiment ouvre des recettes, la Boutique
     reste le lieu où l'on s'en sert. */
  if (id === "apothecary" && level > 0) {
    h += '<div class="vb-sheet-effect vb-sheet-link" onclick="goToPotions()">'
       + '<img class=ico-inline src=images/Icons/subtabs/potions.png> Préparer dans Boutique → Potions ›</div>';
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
    h += '<button type="button"' + (level > 0 ? '' : ' disabled') + ' class="' + (seg === "relance" ? 'is-on' : '') + '" onclick="setEnchanterSheetSegment(\'relance\')">Relance</button>';
    h += '<button type="button" class="' + (seg === "eclats" ? 'is-on' : '') + '" onclick="setEnchanterSheetSegment(\'eclats\')">Éclats<span class="kseg-count">' + formatNumber(game.dungeonShards || 0) + '</span></button>';
    h += '</div>';
    h += (seg === "relance" && level > 0) ? buildEnchantBoardHTML() : buildShardShopBoardHTML();
  }

  /* La Taverne est le seul bâtiment dont la fiche porte du contenu jouable :
     ses contrats n'ont pas d'écran ailleurs, contrairement à l'entraînement,
     aux potions ou à l'échoppe. Les envoyer au tableau de missions les
     mélangerait à des quêtes qui racontent quelque chose. */
  if (id === "tavern" && level > 0) {
    h += buildTavernContractsHTML();
  }

  /* v3.244.0 (chantier Navigation, transitoire) : la Boutique a quitté le menu ☰. Ses
     améliorations d'or (Bourse lourde, Contrats lucratifs) n'avaient plus de porte —
     la Taverne, qui vend déjà des contrats, les héberge. Lien de renvoi en N-1 ; le
     lot N-2 embarque les cartes ici même. */
  // v3.313.0 : Bourse et Contrats retirés — la porte n'apparaît que s'il reste une amélioration d'or
  if (id === "tavern" && typeof shopHasEconomyUpgrades === "function" && shopHasEconomyUpgrades()) {
    h += '<div class="vb-sheet-effect vb-sheet-link" onclick="goToEconomy()">'
       + '<img class=ico-inline src=images/Icons/subtabs/economy.png> Bourse et contrats d\'or ›</div>';
  }

  /* L'Entrepôt agrandi renvoie vers l'Entrepôt lui-même. */
  if (id === "warehouse" && level > 0) {
    h += '<div class="vb-sheet-effect vb-sheet-link" onclick="goToWarehouse()">'
       + '<img class=ico-inline src=images/Icons/system/warehouse_supplies.png> Voir l\'Entrepôt ›</div>';
  }

  /* La Halle renvoie vers l'échoppe qu'elle agrandit — même principe que le
     Terrain et l'Apothicaire : le bâtiment change les règles, l'écran d'origine
     reste le lieu où l'on s'en sert. */
  if (id === "hall" && level > 0) {
    h += '<div class="vb-sheet-effect vb-sheet-link" onclick="goToEquipShop()">'
       + '<img class=ico-inline src=images/Icons/subtabs/equipment_shop.png> Voir l\'échoppe dans Héros → Équipement ›</div>';
  }

  /* L'Atelier annonce le rang qu'il ouvre : c'est sa vraie fonction. */
  if (id === "workshop") {
    var rank = VillageBuildingManager.getRank();
    h += '<div class="vb-sheet-effect">'
       + (rank > 0 ? 'Rang ' + rank + ' — chantiers ouverts jusqu\'à ce rang.'
                   : 'Aucun rang atteint : construis l\'Atelier pour ouvrir les premiers chantiers.')
       + '</div>';
  }

  if (onSite) {
    var left = VillageBuildingManager.getSiteSecondsLeft();
    var pct = VillageBuildingManager.getSiteProgressPct();
    h += '<div class="vb-sheet-progress">';
    h += '<div class="vb-sheet-progress-label" id="vb-sheet-left">Chantier en cours — fin dans ' + esc(formatTime(left)) + '</div>';
    h += '<div class="kgauge kgauge-thin kgauge-xp"><div class="kgauge-track">'
       + '<div class="kgauge-fill" id="vb-sheet-bar" style="width:' + pct.toFixed(1) + '%"></div>'
       + '</div></div>';
    h += '</div>';
    h += '<div class="vb-sheet-actions">';
    h += '<button class="settings-btn" type="button" onclick="closeVillageBuildingSheet()">Fermer</button>';
    h += '</div>';

  } else if (maxed) {
    h += '<div class="vb-sheet-actions">';
    h += '<button class="settings-btn" type="button" onclick="closeVillageBuildingSheet()">Fermer</button>';
    // v3.289.0 : plafond du monde -> le bouton dit où se trouve la suite
    h += '<button class="settings-btn primary is-maxed" type="button" disabled>'
       + esc(VillageBuildingManager.isWorldCapped(id) ? VillageBuildingManager.getWorldCapLabel(id) : 'Niveau maximum') + '</button>';
    h += '</div>';

  } else if (!def.implemented) {
    h += '<div class="vb-sheet-effect">Ce bâtiment arrive dans une prochaine mise à jour.</div>';
    h += '<div class="vb-sheet-actions">';
    h += '<button class="settings-btn" type="button" onclick="closeVillageBuildingSheet()">Fermer</button>';
    h += '</div>';

  } else {
    var target = level + 1;
    var reason = VillageBuildingManager.getBlockReason(id);

    h += '<div class="vb-sheet-effect">Niveau ' + target + ' : '
       + esc(VillageBuildingManager.getEffectLabel(id, target)) + '</div>';
    h += buildVillageCostListHTML(id);
    h += '<div class="vb-sheet-timer"><img class=ico-inline src=images/Icons/system/hourglass_waiting.png> Durée du chantier : '
       + esc(formatTime(VillageBuildingManager.getNextBuildSeconds(id))) + '</div>';

    h += '<div class="vb-sheet-actions">';
    h += '<button class="settings-btn" type="button" onclick="closeVillageBuildingSheet()">Fermer</button>';
    if (reason) {
      h += '<button class="settings-btn primary is-unaffordable" type="button" disabled>' + esc(reason) + '</button>';
    } else {
      h += '<button class="settings-btn primary" type="button" onclick="startVillageBuildFromSheet(\'' + id + '\')">'
         + (level === 0 ? 'Construire' : 'Améliorer') + '</button>';
    }
    h += '</div>';
  }

  h += '</div></div>';
  return h;
}

/* v3.291.0 : commandes de l'Apothicaire, dans sa fiche (décision Seb). Une recette
   acquise est cochée, une commande ouverte montre ses ingrédients et « Livrer », une
   commande d'un monde pas encore atteint dit où elle s'ouvre. */
function buildApothecaryOrdersHTML() {
  var A = window.ApothecaryManager;
  if (!A) return "";
  var h = '<div class="vb-sheet-effect"><strong>Aujourd\u2019hui :</strong> '
     + A.getDailyUsed() + ' / ' + A.getDailyCap() + ' préparations (Soin mineur libre)</div>';
  h += '<div class="vb-sheet-effect"><strong>Commandes</strong> — livre une fois, la recette est acquise pour toujours.</div>';

  (APOTHECARY_RECIPES || []).forEach(function (r) {
    if (r.known) return;
    var potion = A._getPotion(r);
    var name = potion ? potion.name : r.potionId;

    if (A.isLearned(r.potionId)) {
      h += '<div class="vb-sheet-effect">✔ ' + esc(name) + ' — recette acquise</div>';
      return;
    }
    if (!A.isOrderOpen(r.potionId)) {
      h += '<div class="vb-sheet-effect is-locked"><img class=ico-inline src=images/Icons/system/lock_closed.png> '
         + esc(name) + ' — ' + esc(A.getLockReason(r.potionId)) + '</div>';
      return;
    }

    h += '<div class="vb-sheet-effect"><strong>' + esc(name) + '</strong></div>';
    h += '<div class="vb-cost-list">';
    Object.keys(r.order).forEach(function (k) {
      var meta = getVillageCostMeta(k);
      var have = WarehouseManager.getAmount(k);
      var ok = have >= r.order[k];
      h += '<div class="vb-cost-row' + (ok ? '' : ' is-missing') + '">' + meta.iconHTML
         + '<span class="vb-cost-label">' + esc(meta.label) + '</span>'
         + '<span class="vb-cost-amount">' + (ok ? '' : formatNumber(Math.floor(have)) + ' / ') + formatNumber(r.order[k]) + '</span></div>';
    });
    h += '</div>';
    var can = A.canDeliver(r.potionId);
    h += '<div class="vb-sheet-actions"><button class="settings-btn primary' + (can ? '' : ' is-unaffordable') + '" type="button"'
       + (can ? ' onclick="deliverApothecaryOrderFromSheet(\'' + esc(r.potionId) + '\')"' : ' disabled') + '>'
       + (can ? 'Livrer la commande' : 'Ingrédients manquants') + '</button></div>';
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
  openVillageBuildingId = id;
  var host = document.getElementById("village-modal-root");
  if (host) host.innerHTML = buildVillageBuildingSheetHTML(id);
}
window.openVillageBuildingSheet = openVillageBuildingSheet;

function closeVillageBuildingSheet() {
  openVillageBuildingId = null;
  var host = document.getElementById("village-modal-root");
  if (host) host.innerHTML = "";
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
  if (label) label.textContent = "Fin dans " + formatTime(left);

  var cardBar = document.getElementById("vb-card-bar");
  if (cardBar) cardBar.style.width = pct;
  var cardLeft = document.getElementById("vb-card-left");
  if (cardLeft) cardLeft.textContent = formatTime(left);

  var sheetBar = document.getElementById("vb-sheet-bar");
  if (sheetBar) sheetBar.style.width = pct;
  var sheetLeft = document.getElementById("vb-sheet-left");
  if (sheetLeft) sheetLeft.textContent = "Chantier en cours — fin dans " + formatTime(left);
}
window.refreshVillageSiteTickers = refreshVillageSiteTickers;

/* Raccourci inverse du mur de Personnage → Stats : de la fiche du Terrain vers
   l'entraînement. Les deux écrans se pointent l'un l'autre. */
function goToHeroTraining() {
  closeVillageBuildingSheet();
  if (typeof switchTab === "function") switchTab("more"); // onglet Personnage (voir ui-root.js)
  /* PIÈGE : les identifiants internes sont inversés par rapport aux libellés.
     Le sous-onglet affiché « <img class=ico-inline src=images/Icons/subtabs/hero_stats.png> Stats » — celui qui porte les cartes de
     caractéristiques — s'appelle "amelioration" ; l'identifiant "stats" est
     celui de « <img class=ico-inline src=images/Icons/combat_stats/stat_attack.png> Capacités ». Voir buildHerosSubTabBarHTML(). */
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

/* v3.244.0 : renvoi de la Taverne vers les améliorations d'or (ex-Boutique › Économie). */
function goToEconomy() {
  closeVillageBuildingSheet();
  if (typeof switchTab === "function") switchTab("shop");
  if (typeof setShopSubTab === "function") setShopSubTab("upgrades");
}
window.goToEconomy = goToEconomy;

/* Renvoi de la fiche de la Halle vers l'échoppe d'équipement. */
function goToEquipShop() {
  closeVillageBuildingSheet();
  if (typeof switchTab === "function") switchTab("equip");
  if (typeof setEquipSubTab === "function") setEquipSubTab("shop");
}
window.goToEquipShop = goToEquipShop;

/* --- Tableau de contrats de la Taverne (rendu DANS la fiche) -------------- */
function buildTavernContractsHTML() {
  if (!window.TavernManager) return "";

  var contracts = TavernManager.getContracts();
  var h = '<div class="tavern-board">';
  h += '<div class="tavern-board-head"><img class=ico-inline src=images/Icons/quests/quest_story.png> Contrats du jour'
     + '<span class="tavern-board-timer">Renouvelés dans ' + esc(formatTime(TavernManager.timeUntilRefresh())) + '</span></div>';

  if (!contracts.length) {
    h += '<div class="tavern-empty">Le tableau est vide pour l\'instant.</div>';
  }

  contracts.forEach(function (c) {
    var def = WAREHOUSE_RESOURCES[c.resourceId] || { name: c.resourceId, icon: "" };
    var have = WarehouseManager.getAmount(c.resourceId);
    var enough = have >= c.quantity;

    h += '<div class="tavern-contract' + (c.done ? ' is-done' : '') + '">';
    h += '<div class="tavern-contract-main">';
    h += '<div class="tavern-contract-title">' + esc(c.title) + '</div>';
    h += '<div class="tavern-contract-need">';
    h += renderIconOrEmojiHTML(def.icon, "tavern-contract-icon", def.name);
    h += '<span class="' + (enough || c.done ? '' : 'is-missing') + '">'
       + formatNumber(Math.floor(have)) + ' / ' + formatNumber(c.quantity) + ' ' + esc(def.name) + '</span>';
    h += '</div></div>';

    h += '<div class="tavern-contract-side">';
    h += '<div class="tavern-contract-reward">'
       + '<img class="tavern-contract-gold" src="images/Icons/gold_icon.png" alt="">'
       + formatNumber(TavernManager.getPayout(c)) + '</div>';
    if (c.done) {
      h += '<div class="tavern-contract-btn is-done">Honoré</div>';
    } else if (enough) {
      h += '<button type="button" class="tavern-contract-btn" onclick="deliverTavernContract(\'' + esc(c.id) + '\')">Livrer</button>';
    } else {
      h += '<button type="button" class="tavern-contract-btn is-poor" disabled>Livrer</button>';
    }
    h += '</div>';

    h += '</div>';
  });

  h += '</div>';
  return h;
}
window.buildTavernContractsHTML = buildTavernContractsHTML;

function deliverTavernContract(id) {
  if (TavernManager.deliver(id) && openVillageBuildingId === "tavern") {
    openVillageBuildingSheet("tavern");
  }
}
window.deliverTavernContract = deliverTavernContract;

/* Renvoi de la fiche de l'Entrepôt agrandi vers l'Entrepôt. */
function goToWarehouse() {
  closeVillageBuildingSheet();
  if (typeof switchTab === "function") switchTab("village");
  if (typeof setVillageSubTab === "function") setVillageSubTab("entrepot");
}
window.goToWarehouse = goToWarehouse;

/* --- Établi de la Forge (rendu DANS la fiche) ---------------------------- */
function buildForgeBoardHTML() {
  if (!window.ForgeManager) return "";
  ForgeManager.ensure();

  var max = ForgeManager.getMaxLevel();
  var h = '<div class="forge-board">';
  h += '<div class="forge-board-head"><img class=ico-inline src=images/Icons/workshops/smithing_station.png> Établi'
     + '<span class="forge-board-max">Niveau maximum : ' + max + '</span></div>';
  h += '<div class="forge-board-note">Le niveau appartient à l\'emplacement : changer de pièce ne fait rien perdre.</div>';

  EQUIPMENT_SLOTS.forEach(function (slot) {
    var level = ForgeManager.getLevel(slot);
    var item = (game.equipped || {})[slot];
    var cost = ForgeManager.getCost(slot);
    var reason = ForgeManager.getBlockReason(slot);

    h += '<div class="forge-row">';
    h += '<div class="forge-row-main">';
    /* Le libellé vit dans EQUIPMENT_SLOT_LABELS, pas dans la config d'emplacement
       (relevé au rendu : la ligne sortait sans nom). */
    h += '<div class="forge-row-name">' + esc(EQUIPMENT_SLOT_LABELS[slot] || slot)
       + ' <span class="forge-row-level">niv. ' + level + ' / ' + max + '</span></div>';

    if (item) {
      /* On montre l'effet réel sur la pièce portée : un pourcentage abstrait
         ne dirait pas au joueur ce qu'il gagne. */
      var brut = Number(item.value || 0);
      var forge = ForgeManager.getForgedValue(item);
      h += '<div class="forge-row-effect">' + esc(item.name) + ' : '
         + esc(formatEquipmentStat({ slot: slot, stat: item.stat, value: forge }))
         + (forge > brut ? ' <span class="forge-row-gain">(+' + Math.round((forge / brut - 1) * 100) + ' %)</span>' : '')
         + '</div>';
    } else {
      h += '<div class="forge-row-effect forge-row-empty">Vide — le niveau attend sa pièce.</div>';
    }

    if (cost) {
      if (ForgeManager.isStoryReforge && ForgeManager.isStoryReforge(slot, level + 1)) {
        h += '<div class="forge-board-note">Matériaux fournis par le village (reforge exigée par l\u2019Histoire)</div>';
      }
      h += '<div class="forge-row-cost">';
      Object.keys(cost).forEach(function (key) {
        var meta = getVillageCostMeta(key);
        var have = (key === "gold") ? Number(game.gold || 0) : WarehouseManager.getAmount(key);
        var ok = have >= cost[key];
        h += '<span class="forge-cost-item' + (ok ? '' : ' is-missing') + '">'
           + meta.iconHTML + formatNumber(cost[key]) + '</span>';
      });
      h += '</div>';
    }
    h += '</div>';

    h += '<div class="forge-row-side">';
    if (!cost) {
      h += '<div class="forge-row-btn is-off">' + (level >= 30 ? 'Maximum' : 'Améliore<br>la Forge') + '</div>';
    } else if (reason) {
      h += '<div class="forge-row-btn is-off">' + esc(reason) + '</div>';
    } else {
      h += '<button type="button" class="forge-row-btn" onclick="reforgeSlot(\'' + esc(slot) + '\')">Reforger</button>';
    }
    h += '</div>';

    h += '</div>';
  });

  h += '</div>';
  return h;
}
window.buildForgeBoardHTML = buildForgeBoardHTML;

function reforgeSlot(slot) {
  if (ForgeManager.reforge(slot) && openVillageBuildingId === "forge") {
    openVillageBuildingSheet("forge");
  }
}
window.reforgeSlot = reforgeSlot;

/* --- Établi de l'Enchanteresse (rendu DANS la fiche) --------------------- */
/* Ne liste que les pièces ÉQUIPÉES qui portent des bonus : une grille de tout
   l'inventaire serait illisible dans une fiche, et on enchante ce qu'on porte. */
function buildEnchantBoardHTML() {
  if (!window.EnchantManager) return "";

  var allowed = EnchantManager.getAllowedRarities().map(function (r) {
    return (typeof RARITY_LABELS !== "undefined" && RARITY_LABELS[r]) || r;
  });
  var h = '<div class="forge-board">';
  h += '<div class="forge-board-head"><img class=ico-inline src=images/Icons/scene/node_discovery.png> Établi'
     + '<span class="forge-board-max">' + (allowed.length ? esc(allowed.join(", ")) : "Aucune rareté") + '</span></div>';
  h += '<div class="forge-board-note">La ligne garde sa nature : seule sa valeur est relancée, et jamais vers le bas. Chaque relance de la même ligne coûte plus cher.</div>';

  var rows = 0;
  EQUIPMENT_SLOTS.forEach(function (slot) {
    var item = (game.equipped || {})[slot];
    var affixes = item ? getItemAffixes(item) : [];
    if (!affixes.length) return;
    rows += 1;

    h += '<div class="ench-item">';
    /* Le libellé d'emplacement n'est repris que s'il n'est pas déjà le nom de la pièce
       (« Gants Gants » sortait au rendu). */
    var slotLabel = EQUIPMENT_SLOT_LABELS[slot] || slot;
    h += '<div class="ench-item-name rarity-' + esc(item.rarity) + '">' + esc(item.name)
       + (slotLabel === item.name ? '' : ' <span class="forge-row-level">' + esc(slotLabel) + '</span>')
       + '</div>';

    affixes.forEach(function (a, index) {
      var range = EnchantManager.getRange(item, index);
      var cost = EnchantManager.getCost(item, index);
      var reason = EnchantManager.getBlockReason(item, index);
      var n = EnchantManager.getRerollCount(item, index);

      h += '<div class="forge-row">';
      h += '<div class="forge-row-main">';
      h += '<div class="forge-row-name">' + esc(formatEquipmentStatValue(a.stat, a.value))
         + (n > 0 ? ' <span class="forge-row-level">' + n + ' relance' + (n > 1 ? 's' : '') + '</span>' : '') + '</div>';
      if (range) {
        /* Le haut de fourchette dit au joueur ce qu'il peut encore espérer —
           sans lui, la relance serait un pari sur un plafond invisible. */
        h += '<div class="forge-row-effect">Maximum possible : '
           + esc(formatEquipmentStatValue(a.stat, Math.round(range.max * Math.pow(10, range.decimals)) / Math.pow(10, range.decimals)))
           + '</div>';
      }
      if (cost) {
        h += '<div class="forge-row-cost">';
        [["gold", cost.gold], ["seve_aeswyn", cost.seve_aeswyn]].forEach(function (pair) {
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
        h += '<button type="button" class="forge-row-btn" onclick="rerollAffix(\'' + esc(slot) + '\',' + index + ')">Relancer</button>';
      }
      h += '</div>';
      h += '</div>';
    });

    h += '</div>';
  });

  if (!rows) {
    h += '<div class="forge-row-effect forge-row-empty">Aucune pièce équipée ne porte de bonus. Les objets inhabituels et au-dessus en ont.</div>';
  }

  h += '</div>';
  return h;
}
window.buildEnchantBoardHTML = buildEnchantBoardHTML;

/* --- Boutique d'éclats (ex-sous-onglet Donjon > Boutique, v3.245.0) ------ */
var enchanterSheetSegment = null; // variable de vue, non sauvegardée

function setEnchanterSheetSegment(seg) {
  enchanterSheetSegment = (seg === "eclats") ? "eclats" : "relance";
  if (openVillageBuildingId === "enchanter") openVillageBuildingSheet("enchanter");
}
window.setEnchanterSheetSegment = setEnchanterSheetSegment;

function buildShardShopBoardHTML() {
  if (!window.DungeonManager || !window.DUNGEON_SHOP) return "";
  var shards = game.dungeonShards || 0;
  var h = '<div class="vb-shard-board">';
  h += '<div class="vb-shard-count"><img class=ico-inline src=images/Icons/subtabs/shard_shop.png> ' + formatNumber(shards) + ' Éclats</div>';
  h += '<div class="vb-board-sub">Payée en Éclats — gagnés en passant des vagues de donjon (1 par vague, +' + DUNGEON_CONFIG.shardsBossBonus + ' si le boss tombe, +' + (DUNGEON_CONFIG.eliteShardsBonus || 0) + ' par élite). Utilisables uniquement ici.</div>';
  h += '<div class="dungeon-shop-grid">';
  (DUNGEON_SHOP || []).forEach(function (item) {
    var level = DungeonManager.getShardShopLevel(item.id);
    var maxed = level >= item.maxLevel;
    var cost = DungeonManager.getShardShopCost(item);
    var canBuy = !maxed && shards >= cost;
    h += '<div class="nb-purchase-card' + (maxed ? ' is-maxed' : '') + '">';
    h += '<div class="nb-purchase-icon-col"><div class="nb-purchase-icon-slot">' + renderIconOrEmojiHTML(item.icon, "nb-purchase-icon", item.name) + '</div></div>';
    h += '<div class="nb-purchase-info-col">';
    h += '<div class="nb-purchase-name">' + esc(item.name) + '</div>';
    h += '<div class="nb-purchase-meta">Niv. ' + level + '/' + item.maxLevel + '</div>';
    h += '<div class="nb-purchase-desc">' + esc(item.desc) + '</div>';
    h += '</div>';
    h += '<div class="nb-purchase-buy-col">';
    if (maxed) {
      h += '<button class="btn-buy is-maxed" type="button" disabled>Max</button>';
    } else {
      h += '<button class="btn-buy' + (canBuy ? '' : ' cant-afford') + '" type="button" onclick="buyShardUpgradeFromSheet(\'' + esc(item.id) + '\')"><img class=ico-inline src=images/Icons/subtabs/shard_shop.png> ' + formatNumber(cost) + '</button>';
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
