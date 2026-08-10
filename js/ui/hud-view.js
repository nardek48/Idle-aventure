"use strict";
/* ============================================================
Quest Idle — ui/hud-view.js
Barre du haut, toujours visible quel que soit l'onglet : ressources
(or/essence/Aether), zone/aventure en cours, XP + PV du héros, et la
barre de stats sous la zone de combat.

v2.8 : le HUD et la barre de stats étaient codés en dur dans
index.html (seul le PANEL central passait par un buildXxxHTML()
comme tous les autres écrans). buildHudHTML()/buildStatsBarHTML()
ci-dessous génèrent exactement le même marquage (mêmes id/class),
injecté une seule fois au boot (voir main/boot.js) — aucune fonction
de rendu (renderHud, renderStats...) n'a eu besoin de changer, elles
continuent de faire de simples getElementById.

v2.76 : titre de page centralisé dans le HUD, sous la ligne de
ressources — à la demande de l'utilisateur, pour libérer de la place
en haut de chaque panel (avant : chaque écran avait son propre
".panel-title" sticky en haut du panel, retiré des ~11 fichiers
ui/*.js concernés — voir HUD_PAGE_TITLES et updateHudPageTitle()
ci-dessous). Exceptions qui GARDENT un titre dans le panel lui-même
(pas dans le HUD) :
  - Combat : jamais de titre (écran principal, l'espace y est le
    plus précieux).
  - Ascension : 2 "panel-title" internes ("Ascension" au-dessus du
    bouton prestige, "Boutique d'Aether" plus bas) sont en réalité
    des séparateurs de section dans UN SEUL écran, pas un titre de
    page — laissés tels quels. Le HUD affiche juste "Ascension".
  - Équipement : le titre "Sac (X/50)" au-dessus de l'inventaire est
    aussi un séparateur de section, laissé tel quel. Seul le titre
    principal "Équipement" part dans le HUD. */

/* Titre affiché dans le HUD pour chaque onglet. "combat" est absent
   exprès : updateHudPageTitle() masque complètement la zone titre
   sur cet écran (voir plus bas). */
var HUD_PAGE_TITLES = {
  village: "Village",
  dungeon: "Donjon",
  more: "Personnage",
  shop: "Boutique",
  talents: "Arbres de talents",
  equip: "Équipement",
  quests: "Quêtes",
  ascension: "Ascension",
  map: "Carte du monde",
  bestiary: "Bestiaire",
  log: "Journal",
  settings: "Paramètres",
  achievements: "Hauts faits",
  codex: "Codex"
};

function buildHudHTML() {
  // v2.38 : le HUD n'affiche plus que les 3 ressources (or/essence/
  // Aether). Le bloc zone/aventure en cours + niveau/XP du héros
  // (anciennement ".nb-hud-lower") a été retiré à la demande de
  // l'utilisateur. Les styles CSS associés ont aussi été supprimés
  // (voir css/02-layout.css) et les lookups DOM correspondants dans
  // renderHud() ci-dessous.
  // v2.72 : mini-portrait du héros (#combat-hero-mini) déplacé ici,
  // à côté des ressources, à la demande de l'utilisateur — avant, il
  // flottait en survol de la zone de jeu (écran Combat uniquement,
  // voir css/03-combat.css pour l'historique). Il garde exactement la
  // même taille, structure et IDs qu'avant : renderHeroHp() et
  // renderCombatHeroMini() (dans ui/combat-view.js et ui/hud-view.js)
  // n'ont besoin d'aucun changement, elles ciblent les mêmes IDs peu
  // importe où ils se trouvent dans le DOM. Visible sur tous les
  // écrans maintenant, pas seulement en combat.
  // v2.76 : ligne de titre de page ajoutée sous nb-hud-top-row (voir
  // updateHudPageTitle()) — vide/masquée par défaut, remplie au
  // premier rendu par renderAll()/switchTab().
  // v2.77 : le titre est remonté DANS .nb-hud-top-row, empilé sous
  // .nb-hud-resources dans une colonne commune (.nb-hud-left-col),
  // au lieu d'être une ligne à part sur toute la largeur du HUD — à
  // la demande de l'utilisateur, pour coller le titre juste sous les
  // ressources, à côté du portrait, sans le grand espace vide qu'il
  // y avait avant.
  return ''
    + '<div class="nb-hud-top-row">'
    +   '<div class="nb-hud-left-col">'
    +     '<div class="nb-hud-resources">'
    +       '<span class="nb-pill nb-pill-gold"><img class="nb-pill-icon" src="images/Icons/gold_icon.png" alt="Or"><span id="hud-gold">0</span></span>'
    +       '<span class="nb-pill nb-pill-essence"><img class="nb-pill-icon" src="images/Icons/essence_icon.png" alt="Essence"><span id="hud-essence">0</span></span>'
    +       '<span class="nb-pill nb-pill-aether"><img class="nb-pill-icon" src="images/Icons/aether_icon.png" alt="Aether"><span id="hud-aether">0</span></span>'
    +     '</div>'
    +     '<div id="hud-page-title" class="nb-hud-page-title"></div>'
    +   '</div>'
    +   '<div id="combat-hero-mini" class="combat-hero-mini">'
    +     '<div class="combat-hero-mini-portrait">'
    +       '<img id="combat-hero-mini-img" class="combat-hero-mini-img" src="" alt="" style="display:none">'
    +       '<div id="combat-hero-mini-placeholder" class="combat-hero-mini-placeholder">?</div>'
    +       '<span class="combat-hero-mini-level" id="combat-hero-mini-level">Niv. 1</span>'
    +     '</div>'
    +     '<div class="combat-hero-mini-hp-bar">'
    +       '<div id="combat-hero-mini-hp-fill" class="combat-hero-mini-hp-fill" style="width:100%"></div>'
    +       '<span class="combat-hero-mini-hp-text" id="combat-hero-mini-hp-text">10 / 10</span>'
    +     '</div>'
    +   '</div>'
    + '</div>';
}

function buildStatsBarHTML() {
  // v2.83.11 : indicateur "Aether" retiré de la barre de stats de
  // Combat (demande explicite — pas besoin d'afficher ce chiffre en
  // continu). La mécanique elle-même (getAetherBonuses().tapBonus,
  // voir systems/stats-system.js) reste inchangée et toujours
  // appliquée à game.tapMult — seul l'affichage disparaît.
  return ''
    + '<div class="stat-item"><span class="stat-label">⚡ Dégâts/Tap</span><span class="stat-value" id="stat-tap-dmg">1</span></div>'
    + '<div class="stat-item"><span class="stat-label">🔁 Auto DPS</span><span class="stat-value" id="stat-auto-dps">0</span></div>'
    + '<div class="stat-item"><span class="stat-label">🎯 Critique</span><span class="stat-value" id="stat-crit">5%</span></div>'
    + '<div class="stat-item"><span class="stat-label">🎯 Dégâts crit.</span><span class="stat-value" id="stat-crit-percent">x2.00</span></div>'
    + '<div class="stat-item"><span class="stat-label"><img class="stat-label-icon" src="images/Icons/gold_icon.png" alt="Or"> Or</span><span class="stat-value" id="stat-gold-mult">x1.00</span></div>';
}

/* Injecte le HUD et la barre de stats une seule fois au boot (voir
   main/boot.js), avant le tout premier rendu. */
function mountHudAndStatsBar() {
  var hud = document.getElementById("hud");
  var statsBar = document.getElementById("stats-bar");
  if (hud) hud.innerHTML = buildHudHTML();
  if (statsBar) statsBar.innerHTML = buildStatsBarHTML();
}

/* Rafraîchit tout le HUD principal (ressources, nom de zone/aventure,
   XP du héros). Appelée très souvent (après quasiment chaque action
   qui change une valeur affichée). */
function renderHud() {
  var gold = document.getElementById("hud-gold");
  var essence = document.getElementById("hud-essence");
  var aether = document.getElementById("hud-aether");

  if (gold) gold.textContent = formatNumber(game.gold);
  if (essence) essence.textContent = formatNumber(game.essence);
  if (aether) aether.textContent = formatNumber(game.aether);

  renderHeroHp();
}

/* ============================================================
   v1.8.5 : Barre de vie du héros. La classe "low" (PV <= 25%)
   permet au CSS de la faire clignoter/rougir davantage.
   v2.26 : synchronise AUSSI la barre dupliquée sous les boutons
   d'attaque spéciale/bouclier de l'écran Combat (mêmes PV, deux
   affichages) — voir ui/combat-view.js.
   v2.38 : la barre du HUD (#hud-hero-hp-text/#hud-hero-hp-fill) a été
   retirée avec le bloc zone/XP — plus de lookup ici.
   v2.40 : synchronise aussi la mini-barre sous le portrait du héros
   en haut à gauche de l'écran Combat (#combat-hero-mini-hp-*).
   v2.41 : la carte "❤️ Points de vie" (#combat-hero-hp-text/-fill)
   sous le bouton Attaque a été retirée, redondante avec la mini-barre
   — c'est maintenant la SEULE barre de PV du héros affichée en jeu.
============================================================ */

function renderHeroHp() {
  var miniText = document.getElementById("combat-hero-mini-hp-text");
  var miniFill = document.getElementById("combat-hero-mini-hp-fill");
  if (!miniText && !miniFill) return;

  var hp = Math.max(0, Math.ceil(Number(game.heroHp != null ? game.heroHp : game.heroMaxHp || 1)));
  var maxHp = Math.max(1, Math.floor(Number(game.heroMaxHp || 1)));
  var pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  var hpText = formatNumber(hp) + " / " + formatNumber(maxHp);

  if (miniText) miniText.textContent = hpText;
  if (miniFill) {
    miniFill.style.width = pct + "%";
    miniFill.classList.toggle("low", pct <= 25);
  }
}

/* ============================================================
   v2.40 : portrait + niveau du héros dans la mini-carte en haut à
   gauche de l'écran Combat (#combat-hero-mini). Contrairement à la
   barre de PV (renderHeroHp, appelée très souvent), le portrait ne
   change que si le héros change — appelée depuis renderAll() et
   après confirmHeroSelection(), coût négligeable de toute façon.
============================================================ */

function renderCombatHeroMini() {
  var img = document.getElementById("combat-hero-mini-img");
  var placeholder = document.getElementById("combat-hero-mini-placeholder");
  var levelEl = document.getElementById("combat-hero-mini-level");
  if (!img && !placeholder && !levelEl) return;

  var hero = (typeof getHeroByGameId === "function") ? getHeroByGameId(game.heroId) : null;

  if (hero && hero.image) {
    if (img) {
      img.src = hero.image;
      img.alt = hero.name || "";
      img.style.display = "block";
    }
    if (placeholder) placeholder.style.display = "none";
  } else {
    if (img) img.style.display = "none";
    if (placeholder) placeholder.style.display = "flex";
  }

  if (levelEl) levelEl.textContent = "Niv. " + Number(game.heroLevel || 1);
}
/* ============================================================
   Barre de stats sous la zone de combat : dégâts/tap, auto DPS,
   critique, multiplicateur d'or — tous lus via les getters
   "effective*" de StatsSystem (jamais game.tapDamage etc.
   directement, pour être sûr d'avoir des valeurs propres).
   v2.83.11 : ligne "Aether — Tap +X%" retirée (redondante, le joueur
   n'a pas besoin de ce détail en continu pendant le combat).
============================================================ */

function renderStats() {
  var tap = document.getElementById("stat-tap-dmg");
  var auto = document.getElementById("stat-auto-dps");
  var crit = document.getElementById("stat-crit");
  var critPercent = document.getElementById("stat-crit-percent");
  var gold = document.getElementById("stat-gold-mult");

  function fmt2(n) {
    return (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
  }

  if (tap) tap.textContent = fmt2(EquipmentManager.effectiveTapDamage());
  if (auto) auto.textContent = fmt2(EquipmentManager.effectiveAutoDps());
  if (crit) crit.textContent = fmt2(EquipmentManager.effectiveCritChance()) + "%";
  if (critPercent) critPercent.textContent = "x" + fmt2(EquipmentManager.effectiveCritMult());
  if (gold) gold.textContent = "x" + fmt2(EquipmentManager.effectiveGoldMult());
}

/* ============================================================
   v2.76 : titre de page dans le HUD (voir HUD_PAGE_TITLES plus haut).
   Masqué entièrement sur Combat (display:none) pour ne pas grignoter
   d'espace là où c'est le plus précieux ; affiché pour tous les
   autres onglets. Appelée depuis switchTab() ET renderAll() (voir
   ui/ui-root.js) pour être sûre d'être à jour au premier rendu comme
   à chaque changement d'onglet.
============================================================ */
function updateHudPageTitle() {
  var el = document.getElementById("hud-page-title");
  if (!el) return;

  var tab = game.activeTab;
  if (tab === "combat") {
    el.style.display = "none";
    el.textContent = "";
    return;
  }

  el.textContent = HUD_PAGE_TITLES[tab] || "";
  el.style.display = el.textContent ? "block" : "none";
}

window.renderHud = renderHud;
window.buildHudHTML = buildHudHTML;
window.buildStatsBarHTML = buildStatsBarHTML;
window.mountHudAndStatsBar = mountHudAndStatsBar;
window.renderHeroHp = renderHeroHp;
window.renderCombatHeroMini = renderCombatHeroMini;
window.renderStats = renderStats;
window.updateHudPageTitle = updateHudPageTitle;