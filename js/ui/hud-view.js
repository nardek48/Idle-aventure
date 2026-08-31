"use strict";
/* ui/hud-view.js — barre du haut (ressources, titre de page, mini-portrait héros) + barre de stats sous combat. Injectés une fois au boot. Détail complet : COMMENTAIRES_ORIGINAUX.md */

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
  afflictions: "Afflictions"
};

function buildHudHTML() {
  return ''
    + '<div class="nb-hud-top-row">'
    +   '<div class="nb-hud-left-col">'
    +     '<div class="nb-hud-resources">'
    +       '<span class="nb-pill nb-pill-gold"><img class="nb-pill-icon" src="images/Icons/gold_icon.png" alt="Or"><span id="hud-gold">0</span></span>'
    +       '<span class="nb-pill nb-pill-essence"><img class="nb-pill-icon" src="images/Icons/essence_icon.png" alt="Essence"><span id="hud-essence">0</span></span>'
    +     '</div>'
    +     '<div class="nb-hud-title-row">'
    +       '<div id="hud-page-title" class="nb-hud-page-title"></div>'
    +     '</div>'
    +   '</div>'
    +   '<div class="nb-hud-shortcuts">'
    +     '<button type="button" class="nb-hud-bag-btn" onclick="openBagFromHud()" aria-label="Inventaire"><img src="./images/Icons/menu_icons/equip_menu.png" alt="" class="nb-hud-bag-icon"><span id="hud-bag-badge" class="nb-hud-bag-badge" style="display:none;">0</span></button>'
    +     '<button type="button" class="nb-hud-bag-btn" onclick="switchTab(\'ascension\')" aria-label="Ascension"><img src="./images/Icons/menu_icons/aether_menu.png" alt="" class="nb-hud-bag-icon"><span id="hud-ascension-badge" class="nb-hud-bag-badge" style="display:none;"></span></button>'
    +   '</div>'
    +   '<div id="combat-hero-mini" class="combat-hero-mini" onclick="switchTab(\'talents\')" role="button" aria-label="Talents">'
    +     '<div class="combat-hero-mini-portrait">'
    +       '<img id="combat-hero-mini-img" class="combat-hero-mini-img" src="" alt="" style="display:none">'
    +       '<div id="combat-hero-mini-placeholder" class="combat-hero-mini-placeholder">?</div>'
    +       '<span class="combat-hero-mini-level" id="combat-hero-mini-level">Niv. 1</span>'
    +       '<img id="hud-hero-levelup-badge" class="hud-hero-levelup-badge" src="./images/Icons/talents/up_icon.png" alt="Talent disponible" style="display:none;">'
    +     '</div>'
    +     '<div class="combat-hero-mini-hp-bar">'
    +       '<div id="combat-hero-mini-hp-fill" class="combat-hero-mini-hp-fill" style="width:100%"></div>'
    +       '<span class="combat-hero-mini-hp-text" id="combat-hero-mini-hp-text">10 / 10</span>'
    +     '</div>'
    +   '</div>'
    + '</div>'
    + '<div id="workshop-unlock-banner" class="workshop-unlock-banner" style="display:none;" onclick="openWorkshopStepPopup()"></div>';
}

function buildStatsBarHTML() {
  return ''
    + '<div class="stat-item"><span class="stat-label">⚔️ Attaque</span><span class="stat-value" id="stat-tap-dmg">1</span></div>'
    + '<div class="stat-item"><span class="stat-label">⚡ Célérité</span><span class="stat-value" id="stat-auto-dps">0</span></div>'
    + '<div class="stat-item"><span class="stat-label">🎯 Critique</span><span class="stat-value" id="stat-crit">5%</span></div>'
    + '<div class="stat-item"><span class="stat-label">🎯 Dégâts crit.</span><span class="stat-value" id="stat-crit-percent">x2.00</span></div>'
    + '<div class="stat-item"><span class="stat-label"><img class="stat-label-icon" src="images/Icons/gold_icon.png" alt="Or"> Or</span><span class="stat-value" id="stat-gold-mult">x1.00</span></div>';
}

function mountHudAndStatsBar() {
  var hud = document.getElementById("hud");
  var statsBar = document.getElementById("stats-bar");
  if (hud) hud.innerHTML = buildHudHTML();
  if (statsBar) statsBar.innerHTML = buildStatsBarHTML();
}

function renderHud() {
  // v3.101.0 : régénération au camp (accrual paresseux, voir systems/camp-system.js)
  if (window.CampManager && typeof CampManager.applyRegen === "function") CampManager.applyRegen(false);
  var gold = document.getElementById("hud-gold");
  var essence = document.getElementById("hud-essence");

  if (gold) gold.textContent = formatNumber(game.gold);
  if (essence) essence.textContent = formatNumber(game.essence);

  renderHeroHp();
  renderHudBagBadge();
  renderHudLevelUpBadge();
  renderHudAscensionBadge();
  renderWorkshopUnlockBanner();
}

function renderWorkshopUnlockBanner() {
  var host = document.getElementById("workshop-unlock-banner");
  if (!host) return;

  if (!window.WorkshopUnlockManager || typeof WorkshopUnlockManager.getBannerText !== "function") {
    host.style.display = "none";
    return;
  }

  var text = WorkshopUnlockManager.getBannerText();
  if (!text) {
    host.style.display = "none";
    host.textContent = "";
    return;
  }

  host.textContent = text;
  host.style.display = "block";
}

function renderHudLevelUpBadge() {
  var badge = document.getElementById("hud-hero-levelup-badge");
  if (!badge) return;

  var available = (typeof getTalentsAvailableCount === "function") ? getTalentsAvailableCount() : 0;
  badge.style.display = available > 0 ? "block" : "none";
}
window.renderHudLevelUpBadge = renderHudLevelUpBadge;

function renderHudBagBadge() {
  var badge = document.getElementById("hud-bag-badge");
  if (!badge) return;

  var count = Array.isArray(game.inventory) ? game.inventory.length : 0;
  if (count > 0) {
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}
window.renderHudBagBadge = renderHudBagBadge;

function renderHudAscensionBadge() {
  var badge = document.getElementById("hud-ascension-badge");
  if (!badge) return;

  var available = (typeof getAscensionAvailableCount === "function") ? getAscensionAvailableCount() : 0;
  badge.style.display = available > 0 ? "flex" : "none";
}
window.renderHudAscensionBadge = renderHudAscensionBadge;

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
  if (auto) auto.textContent = String(Math.round((window.CombatEngine && typeof CombatEngine.getTotalCelerity === "function") ? CombatEngine.getTotalCelerity() : 0));
  if (crit) crit.textContent = fmt2(EquipmentManager.effectiveCritChance()) + "%";
  if (critPercent) critPercent.textContent = "x" + fmt2(EquipmentManager.effectiveCritMult());
  if (gold) gold.textContent = "x" + fmt2(EquipmentManager.effectiveGoldMult());
}

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

function openBagFromHud() {
  if (typeof activeEquipSubTab !== "undefined") activeEquipSubTab = "inventory";
  if (typeof switchTab === "function") switchTab("equip");
}
window.openBagFromHud = openBagFromHud;