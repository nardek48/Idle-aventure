"use strict";
/* ============================================================
Quest Idle — ui/village-view.js
Écran "Village" — v2.90.2 : grille de 6 cartes illustrées uniformes
(une image découpée par bâtiment dans images/Village/, voir plus bas),
remplace la carte unique v2.90 (une seule grande image + zones
cliquables en %) — abandonnée après retour utilisateur : l'image
touchait les bords, ne respectait pas le cadre parchemin standard des
autres écrans, et le calage des zones/pastilles à la main était
fragile à maintenir. La grille de cartes reprend le même langage
visuel que la grille de paliers de donjon (voir .dungeon-tier-card en
ui/dungeon-view.js) : plus aucune coordonnée en % à caler, chaque
carte est un bloc normal (titre, niveau, image en object-fit:contain
dans une case de taille fixe) — intrinsèquement indépendant de la
résolution, sans calcul.

Les 6 bâtiments (VILLAGE_CONFIG dans systems/offline-system.js,
mécaniques et IDs internes INCHANGÉS) sont représentés par le nouveau
visuel fourni par l'utilisateur (découpé en 6 images individuelles,
une par bâtiment, cadrées pour exclure les bannières de texte de
l'image source — le nom est réaffiché en HTML, pas embarqué dans
l'image), avec une correspondance ID -> bâtiment illustré différente
des anciens noms :
  - goldMine     -> Mine d'Or             (inchangé)
  - essenceWell  -> Hutte de l'Alchimiste (avant "Puits d'essence")
  - barracks     -> Caserne               (inchangé)
  - timeRelay    -> Tour des Mages        (avant "Relais du temps")
  - watchtower   -> Hôtel de Ville        (avant "Vigie")
  - sanctuary    -> Atelier de Forgeron   (avant "Sanctuaire d'Aether"
                     — l'utilisateur envisage de le retirer plus tard)
Seuls le nom affiché et le visuel changent : coûts, effets, formules
et IDs de sauvegarde restent strictement identiques.

Chaque carte ouvre une fenêtre (#village-modal-root, même pattern que
l'intro de donjon — voir buildDungeonIntroHTML en ui/dungeon-view.js)
avec le détail du bâtiment ET le résumé global des bonus hors-ligne
actuels de TOUT le village (décision utilisateur : plus de bloc
résumé permanent sur l'écran, il vit dans chaque popup).
============================================================ */

/* Petit emoji décoratif dans l'en-tête de la popup (aucune image
   dédiée nécessaire : le bâtiment est déjà illustré sur sa carte). */
var VILLAGE_BUILDING_ICONS = {
  goldMine: "⛏️",
  essenceWell: "🧪",
  barracks: "🏋️",
  timeRelay: "🔮",
  watchtower: "🏛️",
  sanctuary: "🔨"
};

/* Nom affiché + image dédiée par bâtiment (voir images/Village/,
   6 fichiers découpés depuis le visuel fourni par l'utilisateur,
   sans les bannières de texte — le nom est réaffiché en HTML). */
var VILLAGE_BUILDING_MAP = {
  watchtower: { label: "Hôtel de Ville", image: "images/Village/watchtower.jpg" },
  barracks: { label: "Caserne", image: "images/Village/barracks.jpg" },
  essenceWell: { label: "Hutte de l'Alchimiste", image: "images/Village/essenceWell.jpg" },
  sanctuary: { label: "Atelier de Forgeron", image: "images/Village/sanctuary.jpg" },
  timeRelay: { label: "Tour des Mages", image: "images/Village/timeRelay.jpg" },
  goldMine: { label: "Mine d'Or", image: "images/Village/goldMine.jpg" }
};

/* Texte "Bonus actuel" pour UN bâtiment donné (même formules que
   VillageManager.getOfflineBonuses(), juste reformatées en phrase —
   à garder synchronisé si un coefficient change là-bas). */
function getVillageBuildingBonusText(id, level) {
  if (id === "goldMine") return "Bonus actuel : +" + Math.round(level * 12) + "% or hors-ligne";
  if (id === "essenceWell") return "Bonus actuel : +" + level + " essence hors-ligne";
  if (id === "barracks") return "Bonus actuel : +" + Math.round(level * 4) + "% efficacité hors-ligne";
  if (id === "timeRelay") return "Bonus actuel : +" + (level * 2).toFixed(1) + "h de cap hors-ligne";
  if (id === "watchtower") return "Bonus actuel : " + (level * 3) + " kills simulés/h (bestiaire + chance de butin)";
  if (id === "sanctuary") return "Bonus actuel : +" + (level * 0.05).toFixed(2) + " Aether/h";
  return "";
}

/* Grille de 6 cartes uniformes (image + nom + niveau), même pattern
   que la grille de paliers de donjon — carte entière cliquable. */
function buildVillageHTML() {
  var h = '<div class="nb-page-frame village-page-frame">';
  h += '<div class="village-building-grid">';

  Object.keys(VILLAGE_BUILDING_MAP).forEach(function (id) {
    var b = VILLAGE_BUILDING_MAP[id];
    var cfg = VILLAGE_CONFIG[id];
    if (!cfg) return;
    var level = VillageManager.getLevel(id);

    h += '<button type="button" class="village-building-card" onclick="openVillageBuildingPopup(\'' + id + '\')">';
    h += '<div class="village-building-image"><img src="' + esc(b.image) + '" alt="' + esc(b.label) + '" draggable="false"></div>';
    h += '<div class="village-building-name">' + esc(b.label) + '</div>';
    h += '<div class="village-building-level">Niv. ' + level + ' / ' + cfg.maxLevel + '</div>';
    h += '</button>';
  });

  h += '</div>';
  h += '</div>';
  return h;
}

/* ============================================================
   Popup de détail/montée de niveau d'UN bâtiment (voir
   #village-modal-root dans index.html), même pattern que l'intro de
   donjon (.full-menu-overlay/.full-menu, voir ui/dungeon-view.js).
============================================================ */

var openVillageBuildingId = null;

function buildVillageBuildingPopupHTML(id) {
  var b = VILLAGE_BUILDING_MAP[id];
  var cfg = VILLAGE_CONFIG[id];
  if (!b || !cfg) return "";

  var level = VillageManager.getLevel(id);
  var cost = VillageManager.getCost(id);
  var maxed = level >= (cfg.maxLevel || Infinity);

  var h = '<div class="full-menu-overlay">';
  h += '  <div class="full-menu village-popup-card">';
  h += '    <div class="village-popup-icon">' + esc(VILLAGE_BUILDING_ICONS[id] || "🏘️") + '</div>';
  h += '    <div class="village-popup-title">' + esc(b.label) + '</div>';
  h += '    <div class="village-popup-text">' + esc(cfg.desc) + '</div>';
  h += '    <div class="village-popup-meta">Niveau ' + level + ' / ' + cfg.maxLevel + '</div>';
  h += '    <div class="village-popup-meta"><strong>' + esc(getVillageBuildingBonusText(id, level)) + '</strong></div>';

  h += '    <div class="village-popup-actions">';
  h += '      <button class="settings-btn" type="button" onclick="closeVillageBuildingPopup()">Fermer</button>';
  if (maxed) {
    h += '      <button class="settings-btn primary is-maxed" type="button" disabled>Niveau max</button>';
  } else {
    h += '      <button class="settings-btn primary" type="button" onclick="buyVillageUpgradeFromPopup(\'' + id + '\')">'
      + '<img class="btn-buy-icon" src="images/Icons/gold_icon.png" alt="">' + formatNumber(cost) + '</button>';
  }
  h += '    </div>';

  h += '  </div>';
  h += '</div>';
  return h;
}

function openVillageBuildingPopup(id) {
  if (!VILLAGE_BUILDING_MAP[id]) return;
  openVillageBuildingId = id;
  var host = document.getElementById("village-modal-root");
  if (host) host.innerHTML = buildVillageBuildingPopupHTML(id);
}

function closeVillageBuildingPopup() {
  openVillageBuildingId = null;
  var host = document.getElementById("village-modal-root");
  if (host) host.innerHTML = "";
}

/* La popup vit dans #village-modal-root, en dehors du cycle
   renderAll()/renderPanel() habituel — sans ce wrapper dédié, le
   niveau/coût affichés dans la popup resteraient figés après achat
   tant qu'elle n'est pas refermée puis rouverte (même remarque que
   buyDungeonTicketFromOverlay, voir ui/dungeon-view.js). La carte
   elle-même (pastilles de niveau) est rafraîchie normalement via
   VillageManager.buy() -> renderAll() -> renderPanel(). */
function buyVillageUpgradeFromPopup(id) {
  buyVillageUpgrade(id);
  if (openVillageBuildingId === id) openVillageBuildingPopup(id);
}

/* ============================================================
   Utilisé par les boutons HTML (achat direct, hors popup — gardé
   pour compatibilité, la popup passe maintenant par
   buyVillageUpgradeFromPopup ci-dessus).
============================================================ */

function buyVillageUpgrade(id) {
  if (window.VillageManager && typeof VillageManager.buy === "function") {
    VillageManager.buy(id);
  }
}

window.buildVillageHTML = buildVillageHTML;
window.buyVillageUpgrade = buyVillageUpgrade;
window.buyVillageUpgradeFromPopup = buyVillageUpgradeFromPopup;
window.openVillageBuildingPopup = openVillageBuildingPopup;
window.closeVillageBuildingPopup = closeVillageBuildingPopup;
