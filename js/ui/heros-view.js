"use strict";
/* ============================================================
Quest Idle — ui/heros-view.js  (anciennement more-view.js, renommé
en v2.73 pour correspondre au bouton "Héros" de la barre du bas)
Écran "Personnage".

v2.75 : refonte complète façon "fiche de personnage" à partir d'une
maquette fournie par l'utilisateur (thème doré/parchemin sur fond
illustré — premier écran à adopter ce nouveau thème, qui a vocation
à être étendu au reste du jeu plus tard, par un chantier séparé).

Structure à 3 sous-onglets (voir activeHerosSubTab / setHerosSubTab) :
  - "hero"        fiche du héros : portrait, niveau, XP, stats
                   PV/ATK/DEF/VIT/CRIT, carrousel de sélection.
  - "amelioration" entraînement de stats contre or (réutilise les
                   upgrades utrain_* de data/upgrades.js, via
                   buildUpgradeCardHTML exposée par ui/shop-view.js).
  - "stats"       capacités actives (attaque spéciale + bouclier
                   universel) — anciennement toujours visibles, voir
                   buildCharacterAbilitiesHTML ci-dessous.

Mapping des stats PV/ATK/DEF/VIT/CRIT de la maquette vers les
valeurs réelles du jeu (qui n'utilise pas ces noms en interne) :
  PV   -> game.heroMaxHp
  ATK  -> EquipmentManager.effectiveTapDamage() (dégâts/tap effectifs)
  DEF  -> game.heroDefensePct (% de réduction de dégâts de riposte)
  VIT  -> Célérité brute (base héros + entraînée) — le jeu n'a pas de
          stat "vitesse" isolée, la Célérité est ce qui s'en rapproche
          le plus (alimente l'auto DPS)
  CRIT -> EquipmentManager.effectiveCritChance()

v2.25 (historique) : première refonte visuelle façon "fiche de
personnage", remplacée par la structure ci-dessus en v2.75.
v2.73 : le bouton "Changer de héros" (overlay plein écran) est
remplacé par un carrousel inline des 6 héros — voir
buildHeroCarouselHTML() et selectHeroInline() ci-dessous. L'overlay
plein écran (modal-view.js) reste utilisé UNIQUEMENT pour la toute
première création de personnage (choix du héros + saisie du nom),
voir needsHeroSetup() dans modal-view.js.
============================================================ */

var activeHerosSubTab = "hero"; // "hero" | "amelioration" | "stats"

function setHerosSubTab(tab) {
  if (tab === "amelioration") activeHerosSubTab = "amelioration";
  else if (tab === "stats") activeHerosSubTab = "stats";
  else activeHerosSubTab = "hero";
  if (typeof renderPanel === "function") renderPanel();
}

/* ============================================================
   Capacités actives (attaque spéciale + bouclier universel) — sous-
   onglet "Stats" de la fiche personnage (v2.75). Contenu identique à
   l'ancien bloc "toujours visible" d'avant v2.75, juste déplacé.
============================================================ */
function buildCharacterAbilityCardHTML(config, cssClass, remainingMs, cooldownMs) {
  var onCooldown = remainingMs > 0;
  var cdText = onCooldown ? Math.ceil(remainingMs / 1000) + "s" : Math.round(cooldownMs / 1000) + "s";

  var h = '<div class="ability-card ' + cssClass + '">';
  h += '<div class="ability-icon-wrap">' + renderIconOrEmojiHTML(config.icon, "ability-icon", config.name) + '</div>';
  h += '<div class="ability-body">';
  h += '<div class="ability-name">' + esc(config.name) + '</div>';
  h += '<div class="ability-desc">' + esc(config.desc) + '</div>';
  h += '</div>';
  h += '<div class="ability-cd' + (onCooldown ? ' is-active' : '') + '">' + esc(cdText) + '</div>';
  h += '</div>';
  return h;
}

function buildCharacterAbilitiesHTML() {
  var h = '';
  var special = (window.SpecialAttackManager && typeof SpecialAttackManager.getCurrentSpecial === "function")
    ? SpecialAttackManager.getCurrentSpecial()
    : null;

  if (special) {
    var specialRemaining = SpecialAttackManager.getCooldownRemainingMs();
    h += buildCharacterAbilityCardHTML(special, "attack", specialRemaining, special.cooldownMs);
  }

  if (typeof DEFENSE_ABILITY !== "undefined" && window.DefenseManager) {
    var defenseRemaining = DefenseManager.getCooldownRemainingMs();
    h += buildCharacterAbilityCardHTML(DEFENSE_ABILITY, "defense", defenseRemaining, DEFENSE_ABILITY.cooldownMs);
  }

  return h;
}

/* ============================================================
   v3.25 : sélecteur des 3 EMPLACEMENTS de héros — remplace le
   carrousel des 6 héros (v2.73), qui ne faisait que changer de
   personnage au sein d'UNE SEULE partie. Chaque emplacement est
   maintenant une PARTIE INDÉPENDANTE (voir HeroSlotManager,
   systems/save-system.js) : cliquer sur un emplacement occupé
   switche vers cette partie, cliquer sur un emplacement vide ouvre la
   création d'un nouveau héros qui repart entièrement de zéro.
   Phase 1 (mécanique) — réutilise les classes CSS existantes
   (.hero-card) pour rester cohérent visuellement sans avoir encore
   un habillage dédié ; l'affinage visuel est prévu dans un second
   temps, une fois la mécanique testée. */
function buildHeroCarouselHTML() {
  if (!window.HeroSlotManager) return "";

  var maxSlots = HeroSlotManager.getMaxSlots();
  var activeSlot = HeroSlotManager.getActiveSlot();
  var h = '<div class="hero-carousel-row">';

  for (var i = 1; i <= maxSlots; i++) {
    var isActive = i === activeSlot;
    var summary = HeroSlotManager.getSlotSummary(i);

    if (summary) {
      // v3.29 : bouton suppression séparé (pas nesté dans la carte, sinon bouton-dans-bouton) + stopPropagation pour ne pas déclencher selectHeroSlot().
      h += '<div class="hero-carousel-slot">';
      h += '<button type="button" class="hero-card hero-carousel-card' + (isActive ? ' active' : '') + '" onclick="selectHeroSlot(' + i + ')">';
      if (summary.heroImage) {
        h += '<img src="' + esc(summary.heroImage) + '" alt="' + esc(summary.heroName) + '" class="hero-card-image">';
      }
      h += '<div class="hero-card-name">' + esc(summary.playerName || summary.heroName) + '</div>';
      h += '<div class="hero-carousel-sub">Niv. ' + esc(summary.heroLevel) + (isActive ? ' · actif' : '') + '</div>';
      h += '</button>';
      h += '<button type="button" class="hero-carousel-delete-btn" aria-label="Supprimer ce héros" onclick="deleteHeroSlot(' + i + ', event)">🗑️</button>';
      h += '</div>';
    } else {
      h += '<button type="button" class="hero-card hero-carousel-card hero-carousel-empty" onclick="createNewHeroInSlot(' + i + ')">';
      h += '<div class="hero-carousel-empty-icon">+</div>';
      h += '<div class="hero-card-name">Nouveau héros</div>';
      h += '</button>';
    }
  }

  h += '</div>';
  return h;
}

/* Bascule vers un AUTRE emplacement (partie indépendante) — ne fait
   rien si déjà actif. Confirmé avant de switcher (changement de partie
   complet, pas anodin). */
function selectHeroSlot(slotNumber) {
  if (!window.HeroSlotManager) return;
  if (slotNumber === HeroSlotManager.getActiveSlot()) return;

  var summary = HeroSlotManager.getSlotSummary(slotNumber);
  var label = summary ? (summary.playerName || summary.heroName) : ("Héros " + slotNumber);

  if (!window.confirm("Passer à " + label + " ? La partie actuelle est sauvegardée automatiquement.")) return;

  var ok = HeroSlotManager.switchToSlot(slotNumber);
  if (ok) {
    if (typeof switchTab === "function") switchTab("campement");
    if (typeof renderAll === "function") renderAll();
    if (typeof showToast === "function") showToast("Héros changé : " + label, 1200);
  }
}

/* Ouvre la création d'un nouveau héros dans un emplacement VIDE —
   repart entièrement de zéro (nouvelle partie complète), confirmé
   avant de quitter la partie active en cours. */
function createNewHeroInSlot(slotNumber) {
  if (!window.HeroSlotManager) return;

  if (!window.confirm("Créer un nouveau héros dans cet emplacement ? La partie actuelle est sauvegardée automatiquement, tu pourras y revenir.")) return;

  HeroSlotManager.createHeroInSlot(slotNumber);
}

/* Supprime définitivement un emplacement occupé — confirmation obligatoire, deleteSlot() gère déjà le basculement si c'était l'actif. */
function deleteHeroSlot(slotNumber, event) {
  if (event) event.stopPropagation();
  if (!window.HeroSlotManager) return;

  var summary = HeroSlotManager.getSlotSummary(slotNumber);
  var label = summary ? (summary.playerName || summary.heroName) : ("Héros " + slotNumber);

  var doDelete = function () {
    var ok = HeroSlotManager.deleteSlot(slotNumber);
    if (ok) {
      if (typeof renderAll === "function") renderAll();
      if (typeof showToast === "function") showToast("Héros supprimé : " + label, 1500);
    }
  };

  var msg = "Supprimer définitivement " + label + " ? Toute sa progression sera perdue. Cette action est irréversible.";
  if (typeof showConfirmModal === "function") {
    showConfirmModal("Supprimer ce héros ?", msg, "🗑️", doDelete);
  } else if (window.confirm(msg)) {
    doDelete();
  }
}

/* ============================================================
   v2.75 : une ligne de stat PV/ATK/DEF/VIT/CRIT dans la fiche.
============================================================ */
function buildPcStatRowHTML(icon, label, value) {
  return ''
    + '<div class="pc-stat-row">'
    + '<span class="pc-stat-icon">' + esc(icon) + '</span>'
    + '<span class="pc-stat-label">' + esc(label) + '</span>'
    + '<span class="pc-stat-value">' + esc(value) + '</span>'
    + '</div>';
}

/* ============================================================
   v2.75 : sous-onglet "Héros" — fiche principale (portrait, niveau,
   XP, stats PV/ATK/DEF/VIT/CRIT), carrousel de sélection, puis les
   statistiques cumulées de la partie.
============================================================ */
function buildHeroFicheHTML() {
  var hero = getSelectedHero();
  var heroLevel = Number(game.heroLevel || 1);
  var heroXp = Number(game.heroXp || 0);
  var heroXpToNext = Number(game.heroXpToNext || 20);
  var xpPct = Math.max(2, Math.min(100, Math.round((heroXp / heroXpToNext) * 100)));

  var heroMaxHp = Math.max(1, Math.floor(Number(game.heroMaxHp || 1)));
  var atk = typeof EquipmentManager !== "undefined" ? EquipmentManager.effectiveTapDamage() : 0;
  var defPct = Math.round(Number(game.heroDefensePct || 0) * 100);
  var baseCelerity = (hero && hero.stats) ? Number(hero.stats.celerity) || 0 : 0;
  var trainedCelerity = (game.trainedStats && game.trainedStats.celerity) || 0;
  var vit = Math.round(baseCelerity + trainedCelerity);
  var critPct = typeof EquipmentManager !== "undefined"
    ? (Math.round(EquipmentManager.effectiveCritChance() * 10) / 10)
    : 0;

  var h = '';

  // ===== Carte fiche de personnage =====
  h += '<div class="pc-card">';

  h += '<div class="pc-card-top">';

  h += '<div class="pc-portrait-col">';
  h += '<div class="pc-hero-name-label">' + esc(game.playerName || (hero ? hero.name : "")) + '</div>';
  h += '<div class="pc-portrait-frame">';
  if (hero && hero.image) {
    h += '<img src="' + esc(hero.image) + '" alt="' + esc(hero.name) + '">';
  } else {
    h += '<div class="pc-portrait-placeholder">?</div>';
  }
  h += '</div>';
  h += '<div class="pc-exp-label">EXP</div>';
  h += '<div class="pc-bar pc-bar-exp"><div class="pc-bar-fill" style="width:' + xpPct + '%"></div><span class="pc-bar-text">' + formatNumber(heroXp) + ' / ' + formatNumber(heroXpToNext) + '</span></div>';
  h += '</div>'; // /pc-portrait-col

h += '<div class="pc-info-wrapper">';
  h += '<div class="pc-info-col">';
    h += '<div class="pc-level-pill"><span class="pc-level-badge">Niv.</span><span>Niveau ' + esc(heroLevel) + '</span></div>';
    h += '<div class="pc-bar pc-bar-level pc-bar-compact"><div class="pc-bar-fill" style="width:' + xpPct + '%"></div></div>';

    h += '<div class="pc-stat-list">';
      h += buildPcStatRowHTML("❤️", "PV", formatNumber(heroMaxHp));
      h += buildPcStatRowHTML("⚔️", "ATK", formatNumber(atk));
      h += buildPcStatRowHTML("🛡️", "DEF", defPct + "%");
      h += buildPcStatRowHTML("⚡", "VIT", formatNumber(vit));
      h += buildPcStatRowHTML("🎯", "CRIT", critPct + "%");
    h += '</div>'; // /pc-stat-list

  h += '</div>'; // /pc-info-col
h += '</div>';   // /pc-info-wrapper

  h += '</div>'; // /pc-card-top

  h += '</div>'; // /pc-card

  // ===== Carrousel de sélection de héros =====
  h += buildHeroCarouselHTML();

  return '<div class="nb-page-frame">' + h + '</div>'; // v2.83.28
}

/* ============================================================
   v2.75 : sous-onglet "Amélioration" — entraînement de stats contre
   or (utrain_power/celerity/precision/will/endurance), extrait tel
   quel de la Boutique (mêmes cartes, mêmes coûts, même bouton x1/x10/
   x25/MAX partagé via game.shopBuyAmount) pour ne pas dupliquer la
   logique d'achat/preview — voir buildUpgradeCardHTML dans
   ui/shop-view.js.
============================================================ */
var HEROS_TRAINING_UPGRADE_IDS = [
  "utrain_power",
  "utrain_endurance",
  "utrain_celerity",
  "utrain_precision",
  "utrain_will"
];

function buildHerosAmeliorationHTML() {
  if (typeof UPGRADES === "undefined" || typeof buildUpgradeCardHTML !== "function") {
    return '<div class="pc-empty">Amélioration indisponible.</div>';
  }

  var buyAmount = Number(game.shopBuyAmount || 1);
  if (![1, 10, 25, -1].includes(buyAmount)) buyAmount = 1;
  var modeLabel = buyAmount === -1 ? "MAX" : ("x" + buyAmount);

  var h = '';

  // === Conteneur global de la section Héro / Améliorations ===
  h += '<div class="pc-heros-train-section nb-page-frame">';
    // --- Toolbar de mode d’achat (x1, x10, x25, MAX) ---
    h += '<div class="pc-heros-train-toolbar">';
      h += '<div class="shop-buy-toolbar">';
        h += '<button class="settings-btn ' + (buyAmount === 1 ? 'active' : '') + '" onclick="setShopBuyAmount(1)">x1</button>';
        h += '<button class="settings-btn ' + (buyAmount === 10 ? 'active' : '') + '" onclick="setShopBuyAmount(10)">x10</button>';
        h += '<button class="settings-btn ' + (buyAmount === 25 ? 'active' : '') + '" onclick="setShopBuyAmount(25)">x25</button>';
        h += '<button class="settings-btn ' + (buyAmount === -1 ? 'active' : '') + '" onclick="setShopBuyAmount(-1)">MAX</button>';
      h += '</div>';

      //h += '<div class="shop-mode-info">Mode d’achat : <strong>' + esc(modeLabel) + '</strong></div>';
    h += '</div>'; // /pc-hero-train-toolbar

    // --- Liste de cartes d’entraînement (Force, Célérité, etc.) ---
    h += '<div class="pc-heros-train-list">';
      h += '<div class="shop-grid">';
        UPGRADES.forEach(function (u) {
          if (HEROS_TRAINING_UPGRADE_IDS.indexOf(u.id) === -1) return;
          h += buildUpgradeCardHTML(u, buyAmount);
        });
      h += '</div>'; // /shop-grid
    h += '</div>';   // /pc-hero-train-list

  h += '</div>';     // /pc-hero-train-section

  return h;
}

/* ============================================================
   v2.75 : sous-onglet "Stats" — pour le moment, uniquement les
   capacités actives (attaque spéciale + bouclier). Pourra accueillir
   d'autres contenus plus tard (détail des stats RPG brutes, etc.).
============================================================ */
function buildHerosStatsHTML() {
  var abilitiesHTML = buildCharacterAbilitiesHTML();
  var h = '';

  if (!abilitiesHTML) {
    h += '<div class="pc-empty">Aucune capacité disponible pour le moment.</div>';
  } else {
    h += abilitiesHTML;
  }

  // Ajout des statistiques cumulées sous les capacités
  h += buildHerosCumulativeStatsHTML();

  return '<div class="nb-page-frame">' + h + '</div>'; // v2.83.28
}

function buildHerosCumulativeStatsHTML() {
  var h = '';
  h += '<div class="pc-section-label">📈 Statistiques cumulées</div>';
  h += '<div class="pc-cumulative-card">';
  h += '  Temps de jeu : ' + esc(typeof formatTime === "function" ? formatTime(game.playTime || 0) : String(Math.floor(game.playTime || 0)) + "s") + '<br>';
  h += '  Total tués : ' + esc(formatNumber(game.totalKills || 0)) + '<br>';
  h += '  Or gagné : ' + esc(formatNumber(game.totalGoldEarned || 0)) + '<br>';
  h += '  Dégâts infligés : ' + esc(formatNumber(game.totalDamageDealt || 0)) + '<br>';
  h += '  Monde : ' + esc((WorldManager.worldIndex + 1) + " / " + WORLDS.length) + '<br>';
  h += '  Cycles : ' + esc(formatNumber(game.cycleCount || 0)) + '<br>';
  h += '  Ascensions : ' + esc(formatNumber(game.ascensionCount || 0));
  h += '</div>';
  return h;
}

/* ============================================================
   v2.75 : les 3 boutons de sous-onglets (Héros / Amélioration /
   Stats), placés sous le contenu, comme sur la maquette fournie par
   l'utilisateur.
============================================================ */
function buildHerosSubTabBarHTML() {
  var h = '<div class="pc-subtab-bar">';
  h += '<button type="button" class="pc-subtab-btn' + (activeHerosSubTab === "hero" ? ' is-active' : '') + '" onclick="setHerosSubTab(\'hero\')">🛡️<span>Héros</span></button>';
  h += '<button type="button" class="pc-subtab-btn' + (activeHerosSubTab === "amelioration" ? ' is-active' : '') + '" onclick="setHerosSubTab(\'amelioration\')">⬆️<span>Amélioration</span></button>';
  h += '<button type="button" class="pc-subtab-btn' + (activeHerosSubTab === "stats" ? ' is-active' : '') + '" onclick="setHerosSubTab(\'stats\')">📊<span>Stats</span></button>';
  h += '</div>';
  return h;
}

function buildHerosHTML() {
  var h = '<div class="subtab-page">';

  // zone principale scrollable
  h += '<div class="subtab-page-content">';

  if (activeHerosSubTab === "amelioration") {
    h += buildHerosAmeliorationHTML();
  } else if (activeHerosSubTab === "stats") {
    h += buildHerosStatsHTML();
  } else {
    h += buildHeroFicheHTML();
  }

  h += '</div>'; // fin .subtab-page-content

  // barre de sous-onglets fixée en bas
  h += '<div class="subtab-bar-wrapper">';
  h +=   buildHerosSubTabBarHTML();
  h += '</div>';

  h += '</div>'; // fin .subtab-page

  return h;
}

/* ============================================================
   v2.73 : callback du carrousel inline. Change directement
   game.heroId (pas de ré-saisie du nom, contrairement à l'ancien
   flux via modal-view.js confirmHeroSelection), recalcule les stats
   et sauvegarde. Ne touche ni au niveau/XP, ni à l'équipement, ni aux
   talents : seuls les stats RPG de base et l'attaque spéciale du
   héros changent (voir stats-system.js et special-attack-system.js).
============================================================ */
function selectHeroInline(heroId) {
  if (!heroId || heroId === game.heroId) return;
  if (typeof HEROES_DB === "undefined") return;

  var found = null;
  Object.keys(HEROES_DB).forEach(function (key) {
    if (HEROES_DB[key] && HEROES_DB[key].id === heroId) found = HEROES_DB[key];
  });
  if (!found) return;

  game.heroId = heroId;
  if (heroId.indexOf("chaos") === 0) game.codexChaosSeen = true;

  if (window.StatsSystem && typeof StatsSystem.recalcStats === "function") {
    StatsSystem.recalcStats();
  }

  if (typeof saveGame === "function") saveGame();
  if (typeof renderAll === "function") renderAll();
  if (typeof showToast === "function") showToast("Héros changé : " + found.name, 1200);
}

window.buildHerosHTML = buildHerosHTML;
window.buildHeroCarouselHTML = buildHeroCarouselHTML;
window.selectHeroSlot = selectHeroSlot;
window.createNewHeroInSlot = createNewHeroInSlot;
window.deleteHeroSlot = deleteHeroSlot;
window.selectHeroInline = selectHeroInline; // v3.25 : conservée pour compat, plus appelée par le carrousel
window.setHerosSubTab = setHerosSubTab;
