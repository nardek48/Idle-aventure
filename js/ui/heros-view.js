"use strict";
/* ui/heros-view.js — écran Personnage (v2.75, fiche façon jeu de rôle), 3 sous-onglets Héros/Amélioration/Stats. Carrousel de 3 emplacements de héros indépendants (v3.25). Détail : COMMENTAIRES_ORIGINAUX.md */

var activeHerosSubTab = "hero"; // "hero" | "amelioration" | "stats"

function setHerosSubTab(tab) {
  if (tab === "amelioration") activeHerosSubTab = "amelioration";
  else if (tab === "stats") activeHerosSubTab = "stats";
  else activeHerosSubTab = "hero";
  if (typeof renderPanel === "function") renderPanel();
}

function buildCharacterAbilityCardHTML(config, cssClass, remainingMs, cooldownMs) {
  var onCooldown = remainingMs > 0;
  var cdText = onCooldown ? Math.ceil(remainingMs / 1000) + "s" : Math.round(cooldownMs / 1000) + "s";

  var h = '<div class="ability-card ' + cssClass + '">';
  h += '<div class="ability-icon-wrap">' + renderIconOrEmojiHTML(config.icon, "ability-icon", config.name) + '</div>';
  h += '<div class="ability-body">';
  h += '<div class="ability-name">' + esc(config.name) + '</div>';
  h += '<div class="ability-desc">' + esc(config.desc) + '</div>';
  if (config.counterLabels && config.counterLabels.length) {
    h += '<div class="ability-counter">⚡ Contre : ' + esc(config.counterLabels.join(", ")) + '</div>';
  }
  h += '</div>';
  h += '<div class="ability-cd' + (onCooldown ? ' is-active' : '') + '">' + esc(cdText) + '</div>';
  h += '</div>';
  return h;
}

function buildCharacterAbilitiesHTML() {
  if (!window.ClassCombatManager || typeof ClassCombatManager.getAction !== "function") return "";

  var h = '';
  var slots = ["skill1", "skill2", "skill3", "defense"];
  slots.forEach(function (slot) {
    var action = ClassCombatManager.getAction(slot);
    if (!action) return;

    var remainingMs = (game.classCooldowns && typeof game.classCooldowns[action.id] === "number") ? game.classCooldowns[action.id] : 0;
    var icon = (typeof CLASS_ACTION_ICON_FALLBACK !== "undefined" && CLASS_ACTION_ICON_FALLBACK[action.id]) || (action.type === "defense" ? "🛡️" : "✨");
    var counterLabels = (typeof getGrimoireCounterLabels === "function") ? getGrimoireCounterLabels(action) : [];
    var config = { icon: icon, name: action.label, desc: action.description, counterLabels: counterLabels };
    var cssClass = action.type === "defense" ? "defense" : "attack";
    h += buildCharacterAbilityCardHTML(config, cssClass, remainingMs, action.cooldownMs);
  });

  return h;
}

function buildHeroCarouselHTML() {
  if (!window.HeroSlotManager) return "";

  var maxSlots = HeroSlotManager.getMaxSlots();
  var activeSlot = HeroSlotManager.getActiveSlot();
  var h = '<div class="hero-carousel-row">';

  for (var i = 1; i <= maxSlots; i++) {
    var isActive = i === activeSlot;
    var summary = HeroSlotManager.getSlotSummary(i);

    if (summary) {
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

function createNewHeroInSlot(slotNumber) {
  if (!window.HeroSlotManager) return;

  if (!window.confirm("Créer un nouveau héros dans cet emplacement ? La partie actuelle est sauvegardée automatiquement, tu pourras y revenir.")) return;

  HeroSlotManager.createHeroInSlot(slotNumber);
}

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

function buildPcStatRowHTML(icon, label, value) {
  return ''
    + '<div class="pc-stat-row">'
    + '<span class="pc-stat-icon">' + esc(icon) + '</span>'
    + '<span class="pc-stat-label">' + esc(label) + '</span>'
    + '<span class="pc-stat-value">' + esc(value) + '</span>'
    + '</div>';
}

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

  h += buildHeroCarouselHTML();

  return '<div class="nb-page-frame">' + h + '</div>'; // v2.83.28
}

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

  h += '<div class="pc-heros-train-section nb-page-frame">';
    h += '<div class="pc-heros-train-toolbar">';
      h += '<div class="shop-buy-toolbar">';
        h += '<button class="settings-btn ' + (buyAmount === 1 ? 'active' : '') + '" onclick="setShopBuyAmount(1)">x1</button>';
        h += '<button class="settings-btn ' + (buyAmount === 10 ? 'active' : '') + '" onclick="setShopBuyAmount(10)">x10</button>';
        h += '<button class="settings-btn ' + (buyAmount === 25 ? 'active' : '') + '" onclick="setShopBuyAmount(25)">x25</button>';
        h += '<button class="settings-btn ' + (buyAmount === -1 ? 'active' : '') + '" onclick="setShopBuyAmount(-1)">MAX</button>';
      h += '</div>';

      //h += '<div class="shop-mode-info">Mode d’achat : <strong>' + esc(modeLabel) + '</strong></div>';
    h += '</div>'; // /pc-hero-train-toolbar

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

function buildHerosStatsHTML() {
  var abilitiesHTML = buildCharacterAbilitiesHTML();
  var h = '';

  if (!abilitiesHTML) {
    h += '<div class="pc-empty">Aucune capacité disponible pour le moment.</div>';
  } else {
    h += abilitiesHTML;
  }

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

  h += '<div class="subtab-page-content">';

  if (activeHerosSubTab === "amelioration") {
    h += buildHerosAmeliorationHTML();
  } else if (activeHerosSubTab === "stats") {
    h += buildHerosStatsHTML();
  } else {
    h += buildHeroFicheHTML();
  }

  h += '</div>'; // fin .subtab-page-content

  h += '<div class="subtab-bar-wrapper">';
  h +=   buildHerosSubTabBarHTML();
  h += '</div>';

  h += '</div>'; // fin .subtab-page

  return h;
}

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

  if (window.ClassCombatManager && typeof ClassCombatManager.resetForNewHero === "function") {
    ClassCombatManager.resetForNewHero();
  }

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
