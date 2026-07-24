"use strict";
/* ============================================================
   Quest Idle — ui.js (version refaite)
   Tabs, HUD, rendu combat, panneaux, toast, badge quêtes
============================================================ */

var toastTimer = null;

/* ============================================================
   HÉROS / SÉLECTION PERSONNAGE
============================================================ */

var pendingHeroId = "";

function getSelectedHero() {
  if (typeof HEROES_DB === "undefined") return null;

  var keys = Object.keys(HEROES_DB);
  for (var i = 0; i < keys.length; i++) {
    var hero = HEROES_DB[keys[i]];
    if (hero && hero.id === game.heroId) {
      return hero;
    }
  }

  return null;
}

function needsHeroSetup() {
  return !game.playerName || !getSelectedHero();
}

function selectHeroTemp(heroId) {
  pendingHeroId = heroId;
  openHeroSelection();
}

function closeHeroSelection() {
  var host = document.getElementById("hero-selection-root");
  if (host) host.innerHTML = "";
}

function changeHero() {
  pendingHeroId = game.heroId || "";
  openHeroSelection();
}

function confirmHeroSelection() {
  var input = document.getElementById("player-name-input");
  var name = input ? input.value.trim() : "";

  if (!pendingHeroId && !getSelectedHero()) {
    showToast("Choisis un héros", 1200);
    return;
  }

  if (!name) {
    showToast("Entre un nom", 1200);
    return;
  }

  game.heroId = pendingHeroId || game.heroId;
  game.playerName = name;

  closeHeroSelection();
  switchTab("combat");
  renderAll();
  saveGame();
  showToast("Héros sélectionné", 1200);
}

function openHeroSelection() {
  var host = document.getElementById("hero-selection-root");
  if (!host || typeof HEROES_DB === "undefined") return;

  var currentName = game.playerName || "";
  var selectedId = pendingHeroId || game.heroId || "";
  var selectedHero = null;

  Object.keys(HEROES_DB).forEach(function(key) {
    var hero = HEROES_DB[key];
    if (hero && hero.id === selectedId) {
      selectedHero = hero;
    }
  });

  if (!selectedHero) {
    var firstKey = Object.keys(HEROES_DB)[0];
    selectedHero = firstKey ? HEROES_DB[firstKey] : null;
    if (selectedHero && !selectedId) {
      pendingHeroId = selectedHero.id;
      selectedId = selectedHero.id;
    }
  }

  var html = '';
  html += '<div class="hero-picker-overlay">';
  html += '  <div class="hero-picker">';
  html += '    <h2>Choisis ton héros</h2>';
  html += '    <p>Choisis un héros et donne un nom à ton personnage.</p>';
  html += '    <input id="player-name-input" type="text" maxlength="20" placeholder="Nom du personnage" value="' + esc(currentName) + '">';
  html += '    <div class="hero-grid">';

  Object.keys(HEROES_DB).forEach(function(key) {
    var hero = HEROES_DB[key];
    var activeClass = selectedId === hero.id ? "active" : "";

    html += '<button type="button" class="hero-card ' + activeClass + '" onclick="selectHeroTemp(\'' + esc(hero.id) + '\')">';
    html += '  <img src="' + esc(hero.image) + '" alt="' + esc(hero.name) + '" class="hero-card-image">';
    html += '  <div class="hero-card-name">' + esc(hero.name) + '</div>';
    html += '</button>';
  });

  html += '    </div>';

  if (selectedHero) {
    var stats = selectedHero.stats || {};
    html += '    <div class="hero-preview">';
    html += '      <div class="hero-preview-title">Statistiques de ' + esc(selectedHero.name) + '</div>';
    html += '      <div class="hero-preview-stats">';
    html += '        <div class="hero-stat"><span>Puissance</span><strong>' + esc(stats.power || 0) + '</strong></div>';
    html += '        <div class="hero-stat"><span>Endurance</span><strong>' + esc(stats.endurance || 0) + '</strong></div>';
    html += '        <div class="hero-stat"><span>Célérité</span><strong>' + esc(stats.celerity || 0) + '</strong></div>';
    html += '        <div class="hero-stat"><span>Précision</span><strong>' + esc(stats.precision || 0) + '</strong></div>';
    html += '        <div class="hero-stat"><span>Volonté</span><strong>' + esc(stats.will || 0) + '</strong></div>';
    html += '      </div>';
    html += '    </div>';
  }

  html += '    <div class="hero-picker-actions">';
  html += '      <button class="btn secondary" onclick="closeHeroSelection()">Annuler</button>';
  html += '      <button class="btn primary" onclick="confirmHeroSelection()">Confirmer</button>';
  html += '    </div>';
  html += '  </div>';
  html += '</div>';

  host.innerHTML = html;
}

/* ============================================================
   HELPERS / TOAST / BADGE QUÊTES
============================================================ */


function getCurrentWorldPanelBackground() {
  var world = typeof WorldManager !== "undefined" && typeof WorldManager.getWorld === "function"
    ? WorldManager.getWorld()
    : null;

  if (!world) return "";

  var worldId = world.id || "";

  if (typeof WORLD_PANEL_BACKGROUNDS !== "undefined" && WORLD_PANEL_BACKGROUNDS[worldId]) {
    return WORLD_PANEL_BACKGROUNDS[worldId];
  }

  return "Images/Worlds/World.png";
}

function updatePanelBackground() {
  var panel = document.getElementById("panel-container");
  if (!panel) return;

  var isCombat = game.activeTab === "combat";
  var bg = getCurrentWorldPanelBackground();

  if (isCombat) {
    panel.style.removeProperty("--panel-bg-image");
    panel.classList.remove("panel-world-bg");
    return;
  }

  if (bg) {
    panel.style.setProperty("--panel-bg-image", 'url("' + bg + '")');
    panel.classList.add("panel-world-bg");
  } else {
    panel.style.removeProperty("--panel-bg-image");
    panel.classList.remove("panel-world-bg");
  }
}

function getHeroByKey(heroKey) {
  if (typeof HEROES_DB === "undefined" || !heroKey) return null;
  return HEROES_DB[heroKey] || null;
}

function getHeroByGameId(heroId) {
  if (typeof HEROES_DB === "undefined") return null;
  var keys = Object.keys(HEROES_DB);
  for (var i = 0; i < keys.length; i++) {
    var hero = HEROES_DB[keys[i]];
    if (hero && hero.id === heroId) return hero;
  }
  return null;
}

function getEnemyDataForRender() {
  if (!game.enemy) return null;
  var db = game.enemy.isBoss ? BOSS_DB : ENEMY_DB;
  return db && db[game.enemy.id] ? db[game.enemy.id] : null;
}

function getStatLabel(statKey) {
  if (typeof RPG_STAT_LABELS !== "undefined" && RPG_STAT_LABELS[statKey]) {
    return RPG_STAT_LABELS[statKey];
  }
  return statKey;
}

function clampStatValue(value) {
  var n = Number(value) || 0;
  return Math.max(0, Math.min(100, n));
}

function buildStatsHTML(stats, tone) {
  if (!stats) return "";
  var keys = ["power", "endurance", "celerity", "precision", "will"];
  var html = '<div class="rpg-stats rpg-stats-' + esc(tone || "neutral") + '">';
  keys.forEach(function (key) {
    var value = clampStatValue(stats[key]);
    html += ''
      + '<div class="rpg-stat-row">'
      +   '<div class="rpg-stat-top">'
      +     '<span class="rpg-stat-label">' + esc(getStatLabel(key)) + '</span>'
      +     '<span class="rpg-stat-value">' + value + '</span>'
      +   '</div>'
      +   '<div class="rpg-stat-bar">'
      +     '<div class="rpg-stat-fill" style="width:' + value + '%"></div>'
      +   '</div>'
      + '</div>';
  });
  html += '</div>';
  return html;
}

function renderHeroCombatCard() {
  var host = document.getElementById("hero-combat-card");
  if (!host) return;

  var hero = getSelectedHero() || getHeroByGameId(game.heroId);
  if (!hero) {
    host.innerHTML = "";
    host.style.display = "none";
    return;
  }

  host.style.display = "block";

  var html = ''
    + '<div class="hero-combat-inner">'
    +   '<div class="hero-combat-head">'
    +     '<div class="hero-combat-portrait">'
    +       '<img src="' + esc(hero.image || "") + '" alt="' + esc(hero.name || "Héros") + '">'
    +     '</div>'
    +     '<div class="hero-combat-meta">'
    +       '<div class="hero-combat-name">' + esc(game.playerName || hero.name || "Héros") + '</div>'
    +       '<div class="hero-combat-subname">' + esc(hero.name || "") + '</div>'
    +     '</div>'
    +   '</div>'
    +   buildStatsHTML(hero.stats, "hero")
    + '</div>';

  host.innerHTML = html;
}

function renderEnemyStatsCard() {
  var host = document.getElementById("enemy-stats");
  if (!host) return;

  var enemyData = getEnemyDataForRender();
  if (!enemyData || !enemyData.stats) {
    host.innerHTML = "";
    host.style.display = "none";
    return;
  }

  host.style.display = "block";
  host.innerHTML = buildStatsHTML(enemyData.stats, game.enemy && game.enemy.isBoss ? "boss" : "enemy");
}

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showToast(message, duration) {
  var el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    el.classList.remove("show");
  }, duration || 2000);
}

function updateQuestBadge() {
  var badge = document.getElementById("quest-badge");
  if (!badge || !Array.isArray(game.quests)) return;
  var available = game.quests.filter(function (q) {
    return !q.claimed && QuestManager.isComplete(q);
  }).length;
  badge.textContent = available > 0 ? String(available) : "";
  badge.style.display = available > 0 ? "inline-flex" : "none";
}

/* ============================================================
   TABS / RENDU GLOBAL
============================================================ */

function switchTab(tabName) {
  game.activeTab = tabName;

  var gameArea = document.getElementById("game-area");
  var statsBar = document.getElementById("stats-bar");
  var panel = document.getElementById("panel-container");
  var buttons = document.querySelectorAll(".tab-btn");

  buttons.forEach(function (btn) {
    btn.classList.remove("active");
  });

  var tabMap = {
    combat: 0,
    shop: 1,
    talents: 2,
    equip: 3,
    quests: 4,
    ascension: 5,
    map: 6,
    village: 7,
    more: 8,
    bestiary: 8,
    log: 8,
    settings: 8
  };

  var activeIndex = tabMap[tabName] != null ? tabMap[tabName] : 0;
  if (buttons[activeIndex]) buttons[activeIndex].classList.add("active");

  var combatMode = tabName === "combat";
  if (gameArea) gameArea.style.display = combatMode ? "flex" : "none";
  if (statsBar) statsBar.style.display = combatMode ? "flex" : "none";
  if (panel) panel.classList.toggle("active", !combatMode);
  updatePanelBackground();
  renderPanel();
}

function renderAll() {
  renderHud();
  renderEnemy();
  renderStats();
  renderPanel();
  updatePanelBackground()
  updateQuestBadge();
  if (typeof renderHeroCombatCard === "function") renderHeroCombatCard();
  if (typeof renderEnemyStatsCard === "function") renderEnemyStatsCard();
  if (needsHeroSetup()) {
    openHeroSelection();
  }
}

/* ============================================================
   HUD / COMBAT / STATS
============================================================ */

function renderHud() {
  var gold = document.getElementById("hud-gold");
  var essence = document.getElementById("hud-essence");
  var aether = document.getElementById("hud-aether");
  var zone = document.getElementById("hud-zone-name");
  var adventure = document.getElementById("hud-adventure-name");

  if (gold) gold.textContent = formatNumber(game.gold);
  if (essence) essence.textContent = formatNumber(game.essence);
  if (aether) aether.textContent = formatNumber(game.aether);

  var world = WorldManager.getWorld();
  var adv = WorldManager.getAdventure();
  if (zone && world) zone.textContent = world.name;
  if (adventure && adv) {
    var currentStep = Math.min((WorldManager.enemyIndex || 0) + 1, adv.enemyCount || 1);
    adventure.textContent = adv.name + " (" + currentStep + "/" + (adv.enemyCount || 1) + ")";
  }
}

function renderEnemy() {
  if (!game.enemy) return;

  var emoji = document.getElementById("enemy-emoji");
  var name = document.getElementById("enemy-name");
  var counter = document.getElementById("enemy-counter");
  var banner = document.getElementById("zone-banner");
  var db = game.enemy.isBoss ? BOSS_DB : ENEMY_DB;
  var enemyData = db[game.enemy.id] || {};
  var assetKey = enemyData.asset || game.enemy.asset || "";
  var imagePath = enemyData.image || game.enemy.image || "";

  if (typeof imagePath !== "string") {
    imagePath = "";
  }

  if (emoji) {
    if (imagePath) {
      emoji.innerHTML =
        '<img class="enemy-image" src="' + esc(imagePath) + '" alt="' + esc(game.enemy.name || "Ennemi") + '">';
      emoji.classList.add("has-image");
    } else {
      emoji.innerHTML = renderIcon(game.enemy.isBoss ? "bosses" : "enemies", assetKey);
      emoji.classList.remove("has-image");
    }
    emoji.classList.toggle("boss", !!game.enemy.isBoss);
  }

  if (name) name.textContent = game.enemy.name + (game.enemy.isBoss ? " [BOSS]" : "");
  if (counter) counter.textContent = "Kills " + (game.killCounts[game.enemy.id] || 0);

  if (banner) {
    banner.textContent = game.enemy.isBoss
      ? "🔥 BOSS ! Vainquez-le pour avancer !"
      : "⚔️ Tappe l'ennemi pour attaquer !";
  }

  renderEnemyHp();
  if (typeof renderEnemyStatsCard === "function") renderEnemyStatsCard();
}

function renderEnemyHp() {
  if (!game.enemy) return;
  var bar = document.getElementById("enemy-hp-bar");
  var text = document.getElementById("enemy-hp-text");
  var pct = Math.max(0, (game.enemy.hp / game.enemy.maxHp) * 100);
  if (bar) bar.style.width = pct + "%";
  if (text) {
    text.textContent =
      formatNumber(Math.max(0, Math.ceil(game.enemy.hp))) + " / " + formatNumber(game.enemy.maxHp);
  }
}

function renderStats() {
  var tap = document.getElementById("stat-tap-dmg");
  var auto = document.getElementById("stat-auto-dps");
  var crit = document.getElementById("stat-crit");
  var aether = document.getElementById("stat-aether-mult");
  var gold = document.getElementById("stat-gold-mult");
  var aetherBonuses = getAetherBonuses();

  if (tap) tap.textContent = formatNumber(EquipmentManager.effectiveTapDamage());
  if (auto) auto.textContent = formatNumber(EquipmentManager.effectiveAutoDps());
  if (crit) crit.textContent = Math.floor(EquipmentManager.effectiveCritChance()) + "%";
  if (aether) aether.textContent = "Tap +" + Math.round((aetherBonuses.tapBonus || 0) * 100) + "%";
  if (gold) gold.textContent = "x" + EquipmentManager.effectiveGoldMult().toFixed(2);
}

/* ============================================================
   PANELS
============================================================ */

function renderPanel() {
  var container = document.getElementById("panel-container");
  if (!container) return;

  switch (game.activeTab) {
    case "shop":
      container.innerHTML = buildShopHTML();
      break;
    case "talents":
      container.innerHTML = buildTalentsHTML();
      break;
    case "equip":
      container.innerHTML = buildEquipHTML();
      break;
    case "quests":
      container.innerHTML = buildQuestsHTML();
      break;
    case "ascension":
      container.innerHTML = buildAscensionHTML();
      break;
    case "map":
      container.innerHTML = buildMapHTML();
      break;
    case "bestiary":
      container.innerHTML = buildBestiaryHTML();
      break;
    case "log":
      container.innerHTML = buildLogHTML();
      break;
    case "settings":
      container.innerHTML = buildSettingsHTML();
      break;
    case "more":
      container.innerHTML = buildMoreHTML();
      break;
    case "village":
      container.innerHTML = buildVillageHTML();
      break;
    default:
      container.innerHTML = "";
  }
}

function buildShopHTML() {
  var h = '<div class="panel-title">Boutique</div>';
  (UPGRADES || []).forEach(function (u) {
    var level = game.upgrades[u.id] || 0;
    var cost = getUpgradeCost(u);
    var maxed = level >= u.maxLevel;
    var locked = WorldManager.worldIndex < (u.unlockWorld || 0);
    var afford = game.gold >= cost;

    h += '<div class="upgrade-card ' + (afford && !maxed && !locked ? 'affordable ' : '') + (locked ? 'locked' : '') + '">';
    h += '<div class="upgrade-icon">' + esc(u.icon) + '</div>';
    h += '<div class="upgrade-info">';
    h += '<div class="upgrade-name">' + esc(u.name) + '</div>';
    h += '<div class="upgrade-desc">' + esc(u.desc) + '</div>';
    h += '<div class="upgrade-level">Niv. ' + level + '/' + (u.maxLevel >= 999 ? '∞' : u.maxLevel) + '</div>';
    h += '</div>';

    if (maxed) {
      h += '<button class="upgrade-buy locked" disabled>MAX</button>';
    } else if (locked) {
      h += '<button class="upgrade-buy locked" disabled>Monde ' + (u.unlockWorld + 1) + '</button>';
    } else {
      h += '<button class="upgrade-buy ' + (!afford ? 'cant-afford' : '') + '" onclick="buyUpgrade(\'' + esc(u.id) + '\')">' + formatNumber(cost) + '</button>';
    }

    h += '</div>';
  });
  return h;
}

function getTalentTree() {
  if (typeof TALENTTREE !== "undefined") return TALENTTREE;
  if (typeof TALENT_TREE !== "undefined") return TALENT_TREE;
  return { combat: [], fortune: [], survival: [] };
}

function isTalentOwned(id) {
  return !!game.talents[id];
}

function hasTalentRequirement(node) {
  return !node.requires || !!game.talents[node.requires];
}

function buildTalentBranchHTML(branchKey, title) {
  var tree = getTalentTree();
  var nodes = tree[branchKey] || [];
  var h = '<div class="talent-branch">';
  h += '<div class="talent-branch-title">' + esc(title) + '</div>';
  h += '<div class="talent-branch-grid">';

  nodes.forEach(function (node) {
    var owned = isTalentOwned(node.id);
    var canBuy = !owned && hasTalentRequirement(node) && (game.talentPoints || 0) >= 1;
    var classes = ["talent-node"];

    if (owned) classes.push("unlocked");
    else if (canBuy) classes.push("available");
    else classes.push("locked");

    if (node.capstone) classes.push("branch-capstone");

    var tooltipText = node.desc || node.effect || "Effet non renseigné";
    var safeTooltip = esc(tooltipText);
    var costText = owned ? "✔" : "1 pt";

    h += '<button class="' + classes.join(" ") + '" ' +
         'style="grid-column:' + ((node.col || 0) + 1) + ';grid-row:' + ((node.row || 0) + 1) + ';" ' +
         'data-tooltip="' + safeTooltip + '" ' +
         'title="' + safeTooltip + '" ' +
         'onclick="buyTalentNode(\'' + esc(node.id) + '\')">';

    h += '<div class="talent-icon">' + esc(node.icon || "✨") + '</div>';
    h += '<div class="talent-name">' + esc(node.name) + '</div>';
    h += '<div class="talent-cost">' + costText + '</div>';
    h += '</button>';
  });

  h += '</div></div>';
  return h;
}

function buildTalentsHTML() {
  var h = '<div class="panel-title">Arbres de talents</div>';
h += '<div style="font-size:12px;color:var(--text-dim);margin-bottom:8px;">' +
     'Niveau héros : <strong>' + esc(game.heroLevel || 1) + '</strong> • ' +
     'XP : <strong>' + esc(Math.floor(game.heroXp || 0)) + '/' + esc(Math.floor(game.heroXpToNext || 10)) + '</strong> • ' +
     'Points de talent : <strong>' + esc(game.talentPoints || 0) + '</strong>' +
     '</div>';
h += '<div style="font-size:12px;color:var(--text-dim);margin-bottom:8px;">' +
     'Chaque niveau donne 1 point de talent.' +
     '</div>';
  h += '<div style="font-size:12px;color:var(--text-dim);margin-bottom:8px;">Trois spécialisations : Combat, Fortune et Survie.</div>';
  h += '<div class="talent-tree-columns">';
  h += buildTalentBranchHTML("combat", "Combat");
  h += buildTalentBranchHTML("fortune", "Fortune");
  h += buildTalentBranchHTML("survival", "Survie");
  h += '</div>';
  return h;
}

function buildEquipHTML() {
  var setBonus = EquipmentManager.getSetBonus();
  var slotLabels = { weapon: "Arme", armor: "Armure", amulet: "Amulette" };
  var h = '<div class="panel-title">Équipement</div>';

  if (setBonus && setBonus.config) {
    h += '<div class="set-bonus">Bonus de set ' + esc(setBonus.rarity) + ' actif : ' + esc(setBonus.config.text) + '</div>';
  } else {
    h += '<div class="set-bonus">Équipe 3 objets de même rareté pour activer un bonus de set.</div>';
  }

  h += '<div class="equip-toolbar" style="margin:8px 0;display:flex;gap:8px;flex-wrap:wrap;">';
  h += '<button class="settings-btn" onclick="sortInventoryByRarity()">Trier par rareté</button>';
  h += '<button class="settings-btn danger" onclick="sellInventoryByRarity(\'common\')">Vendre les communs</button>';
  h += '<button class="settings-btn danger" onclick="sellInventoryByRarity(\'rare\')">Vendre les rares</button>';
  h += '</div>';

  ["weapon", "armor", "amulet"].forEach(function (slot) {
    var item = game.equipped[slot];
    h += '<div class="eq-slot">';
    h += '<div class="eq-slot-header"><span class="eq-slot-label">' + slotLabels[slot] + '</span></div>';
    if (item) {
      h += '<div class="eq-item-card rarity-' + esc(item.rarity) + '">';
      h += '<div class="eq-item-icon">' + renderIcon("equipment", item.icon) + '</div>';
      h += '<div class="eq-item-info">';
      h += '<div class="eq-item-name">' + esc(item.name) + '</div>';
      h += '<div class="eq-item-stat">' + esc(item.value + " " + item.stat) + '</div>';
      h += '</div>';
      h += '<button class="eq-item-btn sell" onclick="EquipmentManager.unequip(\'' + slot + '\')">Retirer</button>';
      h += '</div>';
    } else {
      h += '<div class="eq-empty">Vide</div>';
    }
    h += '</div>';
  });

  h += '<div class="panel-title" style="margin-top:12px;">Inventaire (' + game.inventory.length + '/50)</div>';
  if (!game.inventory.length) {
    h += '<div class="eq-empty">Inventaire vide, vainquez des boss.</div>';
  } else {
    game.inventory.forEach(function (item) {
      h += '<div class="eq-item-card rarity-' + esc(item.rarity) + '">';
      h += '<div class="eq-item-icon">' + renderIcon("equipment", item.icon) + '</div>';
      h += '<div class="eq-item-info">';
      h += '<div class="eq-item-name">' + esc(item.name) + '</div>';
      h += '<div class="eq-item-stat">' + esc(item.value + " " + item.stat) + '</div>';
      h += '</div>';
      h += '<button class="eq-item-btn equipped" onclick="EquipmentManager.equip(\'' + esc(item.uid) + '\')">Équiper</button>';
      h += '<button class="eq-item-btn sell" onclick="EquipmentManager.sell(\'' + esc(item.uid) + '\')">Vendre</button>';
      h += '</div>';
    });
  }

  return h;
}

function buildQuestsHTML() {
  var h = '<div class="panel-title">Quêtes journalières</div>';
  h += '<div class="quest-timer">Reset dans ' + esc(QuestManager.timeUntilReset()) + '</div>';

  if (!game.quests || !game.quests.length) {
    h += '<div class="eq-empty">Aucune quête active.</div>';
    return h;
  }

  game.quests.forEach(function (q) {
    var progress = QuestManager.getProgress(q);
    var done = QuestManager.isComplete(q);
    var claimed = !!q.claimed;
    var pct = Math.min(100, (progress / q.target) * 100);

    h += '<div class="quest-card ' + (claimed ? 'completed' : '') + '">';
    h += '<div class="quest-header"><span class="quest-icon">' + esc(q.icon) + '</span><span class="quest-name">' + esc(q.name) + '</span></div>';
    h += '<div class="quest-desc">' + esc(q.desc) + '</div>';
    h += '<div class="quest-progress-bar"><div class="quest-progress-fill ' + (done ? 'done' : '') + '" style="width:' + pct + '%"></div></div>';
    h += '<div class="quest-progress-text"><span>' + Math.min(progress, q.target) + ' / ' + q.target + '</span><span class="quest-reward">' + formatNumber(q.rewardGold || 0) + ' or · ' + formatNumber(q.rewardEssence || 0) + ' essence</span></div>';

    if (claimed) {
      h += '<button class="quest-claim-btn" disabled>Réclamée</button>';
    } else if (done) {
      h += '<button class="quest-claim-btn" onclick="QuestManager.claim(\'' + esc(q.id) + '\')">Réclamer</button>';
    } else {
      h += '<button class="quest-claim-btn" disabled>En cours</button>';
    }

    h += '</div>';
  });

  return h;
}

function buildAscensionHTML() {
  var minWorld = (typeof ASCENSION_CONFIG !== "undefined" && ASCENSION_CONFIG.minWorldToAscend != null)
    ? ASCENSION_CONFIG.minWorldToAscend
    : 1;

  var currentWorld = Number((window.WorldManager && WorldManager.worldIndex) || 0);
  var gain = (window.AscensionManager && typeof AscensionManager.previewGain === "function")
    ? AscensionManager.previewGain()
    : 0;

  var canAscend = (window.AscensionManager && typeof AscensionManager.canAscend === "function")
    ? AscensionManager.canAscend()
    : false;

  var worldsLeft = Math.max(0, minWorld - currentWorld);
  var h = '<div class="panel-title">Ascension</div>';

  h += '<div class="ascension-card">';
  h += '<div class="ascension-icon">🌀</div>';
  h += '<div class="ascension-main">';
  h += '<div class="ascension-gain">Gain prévu : +' + formatNumber(gain) + ' Aether</div>';
  h += '<div class="ascension-sub">Aether actuel : ' + formatNumber(game.aether || 0) + '</div>';
  h += '<div class="ascension-sub">Ascensions effectuées : ' + formatNumber(game.ascensionCount || 0) + '</div>';
  h += '</div>';
  h += '</div>';

  h += '<div class="settings-info">';
  h += '<strong>Conditions</strong><br><br>';
  h += 'Monde requis : ' + minWorld + '<br>';
  h += 'Monde actuel : ' + currentWorld + '<br>';
  h += (canAscend
    ? '<span class="ascension-ok">Ascension disponible</span>'
    : '<span class="ascension-lock">Encore ' + worldsLeft + ' monde(x) à atteindre</span>');
  h += '</div>';

  h += '<div class="settings-info">';
  h += '<strong>Effet</strong><br><br>';
  h += 'L’ascension réinitialise la progression classique, mais conserve l’Aether, les ascensions et les améliorations astrales.';
  h += '</div>';

  h += '<button class="settings-btn ascension-btn" ' + (canAscend ? 'onclick="doAscend()"' : 'disabled') + '>';
  h += canAscend ? 'Ascensionner maintenant' : 'Ascension indisponible';
  h += '</button>';

  h += '<div class="panel-title aether-shop-title">Boutique d’Aether</div>';

  if (typeof AETHER_SHOP === "undefined" || !Array.isArray(AETHER_SHOP) || !AETHER_SHOP.length) {
    h += '<div class="settings-info">Aucune amélioration d’Aether disponible.</div>';
    return h;
  }

  AETHER_SHOP.forEach(function (u) {
    var level = (game.aetherUpgrades && game.aetherUpgrades[u.id]) || 0;
    var maxLevel = Number(u.maxLevel || 1);
    var isMax = level >= maxLevel;

    var cost = typeof getAetherUpgradeCost === "function"
      ? getAetherUpgradeCost(u)
      : Math.floor((u.baseCost || 1) * Math.pow(1.4, level));

    var canBuy = !isMax && (game.aether || 0) >= cost;

    h += '<div class="aether-shop-card">';
    h += '<div class="aether-shop-top">';
    h += '<div class="aether-shop-head">';
    h += '<div class="aether-shop-name">' + esc(u.name) + '</div>';
    h += '<div class="aether-shop-meta">Niveau ' + level + ' / ' + maxLevel + '</div>';
    h += '</div>';
    h += '<div class="aether-shop-cost">🌀 ' + (isMax ? 'MAX' : formatNumber(cost)) + '</div>';
    h += '</div>';

    if (u.desc) {
      h += '<div class="aether-shop-desc">' + esc(u.desc) + '</div>';
    }

    h += '<div class="aether-shop-footer">';
    h += '<div class="aether-shop-state ' +
      (isMax ? 'is-max' : canBuy ? 'is-ready' : 'is-locked') + '">';

    if (isMax) {
      h += 'Amélioration au niveau maximum';
    } else if (canBuy) {
      h += 'Achat disponible';
    } else {
      h += 'Aether insuffisant';
    }

    h += '</div>';

    h += '<button class="settings-btn aether-shop-buy" ' +
      (isMax || !canBuy ? 'disabled' : 'onclick="buyAetherUpgrade(\'' + esc(u.id) + '\')"') + '>';

    if (isMax) {
      h += 'Maximum';
    } else if (canBuy) {
      h += 'Acheter';
    } else {
      h += 'Coût trop élevé';
    }

    h += '</button>';
    h += '</div>';
    h += '</div>';
  });

  return h;
}

function getMapSelectedWorldIndex() {
  if (typeof game.mapSelectedWorldIndex !== "number") {
    game.mapSelectedWorldIndex = WorldManager.worldIndex || 0;
  }
  if (game.mapSelectedWorldIndex < 0) game.mapSelectedWorldIndex = 0;
  if (game.mapSelectedWorldIndex >= WORLDS.length) {
    game.mapSelectedWorldIndex = WORLDS.length - 1;
  }
  return game.mapSelectedWorldIndex;
}

function selectMapWorld(index) {
  if (index < 0 || index >= WORLDS.length) return;
  game.mapSelectedWorldIndex = index;
  renderPanel();
}

function isWorldUnlocked(index) {
  return index <= (WorldManager.worldIndex || 0);
}

function getWorldProgressText(index) {
  if (index < (WorldManager.worldIndex || 0)) return "Terminé";
  if (index === (WorldManager.worldIndex || 0)) return "En cours";
  return "Verrouillé";
}

function getMapMonsterNodes(worldIndex) {
  var positionsByWorld = {
    0: [
      { left: 22, top: 30 }, // Slim
      { left: 34, top: 24 }, // Wolf
      { left: 15, top: 27 }, // Gobelin
      { left: 32, top: 28 }, // Spider
      { left: 35, top: 19, boss: true } // Lord Slim
    ],
    1: [
      { left: 65, top: 30 }, // Scarab
      { left: 69, top: 26 }, // Scorpion
      { left: 67, top: 20 }, // Ver
      { left: 60, top: 20 }, // Guard
      { left: 73, top: 18, boss: true }
    ],
    2: [
      { left: 16, top: 44 },
      { left: 29, top: 42 },
      { left: 18, top: 55 },
      { left: 31, top: 56 },
      { left: 24, top: 48, boss: true }
    ],
    3: [
      { left: 63, top: 41 },
      { left: 78, top: 40 },
      { left: 65, top: 53 },
      { left: 79, top: 54 },
      { left: 72, top: 47, boss: true }
    ],
    4: [
      { left: 17, top: 73 },
      { left: 31, top: 70 },
      { left: 20, top: 84 },
      { left: 34, top: 85 },
      { left: 28, top: 78, boss: true }
    ],
    5: [
      { left: 66, top: 76 },
      { left: 80, top: 75 },
      { left: 68, top: 88 },
      { left: 81, top: 88 },
      { left: 74, top: 82, boss: true }
    ]
  };

  var world = WORLDS[worldIndex];
  if (!world) return [];

  var positions = positionsByWorld[worldIndex] || [];
  var ids = [];
  var bossId = null;

  world.adventures.forEach(function (adv) {
    (adv.enemyPool || []).forEach(function (enemyId) {
      if (ids.indexOf(enemyId) === -1) ids.push(enemyId);
    });
    if (!bossId && adv.boss) bossId = adv.boss;
  });

  var nodes = [];
  for (var i = 0; i < ids.length && i < positions.length - 1; i++) {
    var enemyId = ids[i];
    var enemyData = ENEMY_DB[enemyId];
    if (!enemyData) continue;
    nodes.push({
      type: "enemy",
      id: enemyId,
      name: enemyData.name,
      image: enemyData.image || "",
      icon: renderIcon("enemies", enemyData.asset),
      left: positions[i].left,
      top: positions[i].top,
      isBoss: false
    });
  }

  if (bossId && positions.length) {
    var bossData = BOSS_DB[bossId];
    var bossPos = positions[positions.length - 1];
    if (bossData && bossPos) {
    nodes.push({
      type: "boss",
      id: bossId,
      name: bossData.name,
      image: bossData.image || "",
      icon: renderIcon("bosses", bossData.asset),
      left: bossPos.left,
      top: bossPos.top,
      isBoss: true
    });
    }
  }

  return nodes;
}

function buildMapHTML() {
  var selectedIndex = getMapSelectedWorldIndex();
  var selectedWorld = WORLDS[selectedIndex] || WORLDS[0];
  var currentWorldIndex = WorldManager.worldIndex || 0;
  var currentAdventureIndex = WorldManager.adventureIndex || 0;
  var total = Array.isArray(game.quests) ? game.quests.length : 0;
  var done = Array.isArray(game.quests)
    ? game.quests.filter(function (q) { return q.claimed; }).length
    : 0;
  var bosses = (game.questProgress && game.questProgress.bossKills) || 0;

  var mapNodes = [
    { index: 0, left: 24, top: 18, label: "Forêt", labelOffsetX: -10, labelOffsetY: -38 },
    { index: 1, left: 73, top: 18, label: "Désert", labelOffsetX: 10, labelOffsetY: -38 },
    { index: 2, left: 25, top: 48, label: "Ruines", labelOffsetX: -12, labelOffsetY: 34 },
    { index: 3, left: 71, top: 47, label: "Crypte", labelOffsetX: 14, labelOffsetY: 34 },
    { index: 4, left: 29, top: 79, label: "Montagne", labelOffsetX: -6, labelOffsetY: -42 },
    { index: 5, left: 73, top: 82, label: "Tour", labelOffsetX: 0, labelOffsetY: -40 }
  ];

  var h = '<div class="panel-title">🗺️ Carte du monde</div>';
  h += '<div class="map-intro">Explore les régions du monde et consulte la progression de chaque aventure.</div>';

  h += '<div class="map-grid">';
  h += '<div class="map-row"><span class="map-label">Monde actuel</span><span class="map-value">' + (currentWorldIndex + 1) + '</span></div>';
  h += '<div class="map-row"><span class="map-label">Quêtes terminées</span><span class="map-value">' + done + '/' + total + '</span></div>';
  h += '<div class="map-row"><span class="map-label">Boss vaincus</span><span class="map-value">' + bosses + '</span></div>';
  h += '</div>';

  h += '<div class="world-map-shell">';

  h += '<div class="world-map-card">';
  h += '<div class="world-map-visual">';
  h += '<img src="Images/Worlds/World.png" alt="Carte du monde fantasy" class="world-map-image">';

  mapNodes.forEach(function (node) {
    var world = WORLDS[node.index];
    if (!world) return;

    var classes = ["map-node"];
    if (node.index === currentWorldIndex) classes.push("is-current");
    if (node.index === selectedIndex) classes.push("is-selected");
    if (!isWorldUnlocked(node.index)) classes.push("is-locked");

    h += '<button class="' + classes.join(" ") + '"';
    h += ' style="left:' + node.left + '%; top:' + node.top + '%;"';
    h += ' onclick="selectMapWorld(' + node.index + ')">';
    h += '<span class="map-node-ping"></span>';
    h += '<span class="map-node-dot"></span>';
    h += '</button>';

    h += '<div class="map-node-label-floating';
    if (node.index === currentWorldIndex) h += ' is-current';
    if (node.index === selectedIndex) h += ' is-selected';
    if (!isWorldUnlocked(node.index)) h += ' is-locked';
    h += '" style="left:calc(' + node.left + '% + ' + (node.labelOffsetX || 0) + 'px); top:calc(' + node.top + '% + ' + (node.labelOffsetY || 0) + 'px);">';
    h += esc(node.label);
    h += '</div>';
  });

  mapNodes.forEach(function (node) {
    if (node.index !== selectedIndex && node.index !== currentWorldIndex) return;

    var monsterNodes = getMapMonsterNodes(node.index);
    monsterNodes.forEach(function (monster) {
      var monsterClasses = ["map-monster-node"];
      if (monster.isBoss) monsterClasses.push("is-boss");
      if (node.index === currentWorldIndex) monsterClasses.push("is-current-world");
      if (node.index !== selectedIndex) monsterClasses.push("is-faded");

      h += '<div class="' + monsterClasses.join(" ") + '"';
      h += ' style="left:' + monster.left + '%; top:' + monster.top + '%;"';
      h += ' title="' + esc(monster.name) + '">';
      if (monster.image) {
        h += '<img class="map-monster-image" src="' + esc(monster.image) + '" alt="' + esc(monster.name) + '">';
      } else {
        h += '<span class="map-monster-icon">' + monster.icon + '</span>';
      }
      h += '</div>';
    });
  });

  h += '</div>';
  h += '</div>';

  h += '<div class="map-world-card">';
  h += '<div class="map-world-head">';
  h += '<div>';
  h += '<div class="map-world-kicker">Monde sélectionné</div>';
  h += '<div class="map-world-title">' + esc(selectedWorld.name) + '</div>';
  h += '<div class="map-world-status ' + (selectedIndex < currentWorldIndex ? 'status-done' : selectedIndex === currentWorldIndex ? 'status-current' : 'status-locked') + '">' + getWorldProgressText(selectedIndex) + '</div>';
  h += '</div>';
  h += '<div class="map-world-icon">' + esc(renderIcon("worlds", selectedWorld.assetKey)) + '</div>';
  h += '</div>';

  if (selectedIndex === currentWorldIndex) {
    var currentAdventure = selectedWorld.adventures[currentAdventureIndex];
    if (currentAdventure) {
      h += '<div class="map-current-adventure">';
      h += '<strong>Aventure actuelle :</strong> ' + esc(currentAdventure.name);
      h += ' <span>(' + ((WorldManager.enemyIndex || 0) + 1) + '/' + (currentAdventure.enemyCount || 1) + ')</span>';
      h += '</div>';
    }
  }

  h += '<div class="map-adventure-list">';
  selectedWorld.adventures.forEach(function (adv, advIndex) {
    var advClasses = ["map-adventure-item"];

    if (selectedIndex < currentWorldIndex) {
      advClasses.push("is-done");
    } else if (selectedIndex > currentWorldIndex) {
      advClasses.push("is-locked");
    } else {
      if (advIndex < currentAdventureIndex) advClasses.push("is-done");
      else if (advIndex === currentAdventureIndex) advClasses.push("is-current");
      else advClasses.push("is-next");
    }

    h += '<div class="' + advClasses.join(" ") + '">';
    h += '<div class="map-adventure-top">';
    h += '<span class="map-adventure-name">' + esc(adv.name) + '</span>';
    if (BOSS_DB[adv.boss]) {
      h += '<span class="map-adventure-boss">' + esc(BOSS_DB[adv.boss].name) + '</span>';
    }
    h += '</div>';
    h += '<div class="map-adventure-text">' + esc(adv.introText || "") + '</div>';
    h += '<div class="map-adventure-meta">' + esc((adv.enemyCount || 0) + ' combats avant le boss') + '</div>';
    h += '</div>';
  });
  h += '</div>';

  h += '</div>';
  h += '</div>';

  return h;
}

function buildBestiaryStatsHTML(stats) {
  if (!stats) return "";

  var keys = ["power", "endurance", "celerity", "precision", "will"];
  var html = '<div class="bestiary-stats">';

  keys.forEach(function (key) {
    var value = clampStatValue(stats[key]);
    html += ''
      + '<div class="bestiary-stat-row">'
      +   '<div class="bestiary-stat-head">'
      +     '<span class="bestiary-stat-label">' + esc(getStatLabel(key)) + '</span>'
      +     '<span class="bestiary-stat-value">' + value + '</span>'
      +   '</div>'
      +   '<div class="bestiary-stat-bar">'
      +     '<div class="bestiary-stat-fill" style="width:' + value + '%"></div>'
      +   '</div>'
      + '</div>';
  });

  html += '</div>';
  return html;
}

function buildBestiaryImageHTML(data, isBoss) {
  var imagePath = data && data.image ? data.image : "";
  var iconKey = data && data.asset ? data.asset : "";

  if (imagePath) {
    return ''
      + '<div class="bestiary-thumb-wrap' + (isBoss ? ' boss' : '') + '">'
      +   '<img class="bestiary-thumb" src="' + esc(imagePath) + '" alt="' + esc(data.name || "Créature") + '">'
      + '</div>';
  }

  return ''
    + '<div class="bestiary-thumb-fallback' + (isBoss ? ' boss' : '') + '">'
    +   renderIcon(isBoss ? "bosses" : "enemies", iconKey)
    + '</div>';
}

function buildResistWeakHTML(data) {
  var resists = data && Array.isArray(data.resists) ? data.resists : [];
  var weak = data && Array.isArray(data.weak) ? data.weak : [];
  var html = '<div class="bestiary-tags">';

  if (resists.length) {
    html += '<div class="bestiary-tag-group"><span class="bestiary-tag-title">Résiste :</span> ' + esc(resists.join(", ")) + '</div>';
  }

  if (weak.length) {
    html += '<div class="bestiary-tag-group"><span class="bestiary-tag-title">Faible :</span> ' + esc(weak.join(", ")) + '</div>';
  }

  html += '</div>';
  return html;
}

function buildBestiaryHTML() {
  var ids = Object.keys(ENEMY_DB).concat(Object.keys(BOSS_DB));
  var h = '<div class="panel-title">Bestiaire</div>';

  ids.forEach(function (id) {
    var isBoss = !!BOSS_DB[id];
    var data = isBoss ? BOSS_DB[id] : ENEMY_DB[id];
    var kills = game.killCounts[id] || 0;

    h += ''
      + '<div class="bestiary-card' + (isBoss ? ' boss' : '') + '">'
      +   '<div class="bestiary-card-top">'
      +     buildBestiaryImageHTML(data, isBoss)
      +     '<div class="bestiary-card-main">'
      +       '<div class="bestiary-card-title-row">'
      +         '<div class="bestiary-card-name">' + esc(data.name) + (isBoss ? ' <span class="bestiary-boss-badge">BOSS</span>' : '') + '</div>'
      +       '</div>'
      +       '<div class="bestiary-card-kills">Tués : ' + formatNumber(kills) + '</div>'
      +       buildResistWeakHTML(data)
      +     '</div>'
      +   '</div>'
      +   buildBestiaryStatsHTML(data.stats)
      + '</div>';
  });

  return h;
}

function buildLogHTML() {
  var entries = window.gameLog || [];
  var h = '<div class="panel-title">Journal</div><div id="log-container">';

  if (!entries.length) {
    h += '<div style="color:var(--text-dim);text-align:center;padding:20px;">Aucun événement.</div>';
  } else {
    entries.slice(0, 50).forEach(function (e) {
      h += '<div class="log-entry ' + esc(e.type || "normal") + '">' + esc(e.text) + '</div>';
    });
  }

  h += '</div>';
  return h;
}

function buildMoreHTML() {
  var hero = getSelectedHero();
  var stats = hero && hero.stats ? hero.stats : null;

  var h = '<div class="panel-title">Plus</div>';

  h += '<div class="hero-summary-card">';
  h += '  <h3>Personnage</h3>';
  h += '  <div class="hero-summary-row">';

  h += '    <div class="hero-summary-avatar">';
  if (hero && hero.image) {
    h += '      <img src="' + esc(hero.image) + '" alt="' + esc(hero.name) + '" class="hero-summary-image">';
  } else {
    h += '      <div class="hero-summary-placeholder">?</div>';
  }
  h += '    </div>';

  h += '    <div class="hero-summary-meta">';
  h += '      <p><strong>Nom :</strong> ' + esc(game.playerName || "Non défini") + '</p>';
  h += '      <p><strong>Héros :</strong> ' + esc(hero ? hero.name : "Non choisi") + '</p>';
  h += '    </div>';

  h += '  </div>';

  if (stats) {
    h += '  <div class="hero-summary-stats">';
    h += '    <div class="hero-summary-stat"><span>Puissance</span><strong>' + esc(stats.power || 0) + '</strong></div>';
    h += '    <div class="hero-summary-stat"><span>Endurance</span><strong>' + esc(stats.endurance || 0) + '</strong></div>';
    h += '    <div class="hero-summary-stat"><span>Célérité</span><strong>' + esc(stats.celerity || 0) + '</strong></div>';
    h += '    <div class="hero-summary-stat"><span>Précision</span><strong>' + esc(stats.precision || 0) + '</strong></div>';
    h += '    <div class="hero-summary-stat"><span>Volonté</span><strong>' + esc(stats.will || 0) + '</strong></div>';
    h += '  </div>';
  }

  h += '  <button class="menu-action-btn" onclick="changeHero()">Changer de héros</button>';
  h += '</div>';

  h += '<button class="settings-btn" onclick="switchTab(\'bestiary\')">Bestiaire</button>';
  h += '<button class="settings-btn" onclick="switchTab(\'log\')">Journal</button>';
  h += '<button class="settings-btn" onclick="switchTab(\'settings\')">Paramètres</button>';

  h += '<div class="settings-info" style="margin-top:10px;">';
  h += '  <strong>Statistiques</strong><br><br>';
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

function buildSettingsHTML() {
  var h = '<div class="panel-title">Paramètres</div>';
  h += '<button class="settings-btn" onclick="saveGame()">Sauvegarder</button>';
  h += '<button class="settings-btn danger" onclick="resetGame()">Réinitialiser tout</button>';
  h += '<div class="settings-info">';
  h += '<strong>Quest Idle</strong><br><br>';
  h += 'Sauvegarde : ' + (game.saveSupported ? 'locale navigateur' : 'indisponible') + '.<br>';
  h += 'La progression hors-ligne, l\'équipement et les quêtes sont activés.';
  h += '</div>';
  return h;
}

function buildVillageHTML() {
  var bonus = window.VillageManager && typeof VillageManager.getOfflineBonuses === "function"
    ? VillageManager.getOfflineBonuses()
    : { goldMult: 1, essenceFlat: 0, efficiencyBonus: 0, extraHours: 0 };

  var buildings = ["goldMine", "essenceWell", "barracks", "timeRelay"];
  var h = '';

  h += '<div class="panel-card">';
  h += '<h3>Village</h3>';
  h += '<p class="panel-sub">Développe ton village pour améliorer les gains hors-ligne.</p>';
  h += '<div class="village-bonus-row">';
  h += '<span>Or hors-ligne : x' + (bonus.goldMult || 1).toFixed(2) + '</span>';
  h += '<span>Efficacité : +' + Math.round((bonus.efficiencyBonus || 0) * 100) + '%</span>';
  h += '<span>Essence : +' + Math.floor(bonus.essenceFlat || 0) + '</span>';
  h += '<span>Temps max : +' + (bonus.extraHours || 0).toFixed(1) + 'h</span>';
  h += '</div>';
  h += '</div>';

  buildings.forEach(function (id) {
    var cfg = VILLAGE_CONFIG[id];
    var level = VillageManager.getLevel(id);
    var cost = VillageManager.getCost(id);
    var maxed = level >= (cfg.maxLevel || Infinity);

    h += '<div class="shop-item village-item">';
    h +=   '<div class="shop-main">';
    h +=     '<div class="shop-title-row">';
    h +=       '<strong>' + cfg.name + '</strong>';
    h +=       '<span class="shop-level">Niv. ' + level + '/' + cfg.maxLevel + '</span>';
    h +=     '</div>';
    h +=     '<div class="shop-desc">' + cfg.desc + '</div>';

    if (id === "goldMine") {
      h += '<div class="shop-meta">Bonus actuel : +' + Math.round(level * 12) + '% or hors-ligne</div>';
    } else if (id === "essenceWell") {
      h += '<div class="shop-meta">Bonus actuel : +' + level + ' essence hors-ligne</div>';
    } else if (id === "barracks") {
      h += '<div class="shop-meta">Bonus actuel : +' + Math.round(level * 4) + '% efficacité hors-ligne</div>';
    } else if (id === "timeRelay") {
      h += '<div class="shop-meta">Bonus actuel : +' + (level * 0.5).toFixed(1) + 'h de cap hors-ligne</div>';
    }

    h +=   '</div>';

    if (maxed) {
      h += '<button class="btn disabled" disabled>Max</button>';
    } else {
      h += '<button class="btn" onclick="buyVillageUpgrade(\'' + id + '\')">Améliorer<br>' + formatNumber(cost) + ' or</button>';
    }

    h += '</div>';
  });

  return h;
}

function buyVillageUpgrade(id) {
  if (window.VillageManager && typeof VillageManager.buy === "function") {
    VillageManager.buy(id);
  }
}
window.buyVillageUpgrade = buyVillageUpgrade;

/* ============================================================
   EXPORTS GLOBALS
============================================================ */

window.showToast = showToast;
window.updateQuestBadge = updateQuestBadge;
window.switchTab = switchTab;
window.renderAll = renderAll;
window.renderHud = renderHud;
window.renderEnemy = renderEnemy;
window.renderEnemyHp = renderEnemyHp;
window.renderStats = renderStats;
window.renderPanel = renderPanel;
window.buildShopHTML = buildShopHTML;
window.buildTalentsHTML = buildTalentsHTML;
window.buildEquipHTML = buildEquipHTML;
window.buildQuestsHTML = buildQuestsHTML;
window.buildAscensionHTML = buildAscensionHTML;
window.buildMapHTML = buildMapHTML;
window.buildBestiaryHTML = buildBestiaryHTML;
window.buildLogHTML = buildLogHTML;
window.buildMoreHTML = buildMoreHTML;
window.buildSettingsHTML = buildSettingsHTML;
window.openHeroSelection = openHeroSelection;
window.closeHeroSelection = closeHeroSelection;
window.selectHeroTemp = selectHeroTemp;
window.confirmHeroSelection = confirmHeroSelection;
window.changeHero = changeHero;
window.getSelectedHero = getSelectedHero;
window.needsHeroSetup = needsHeroSetup;
window.getMapSelectedWorldIndex = getMapSelectedWorldIndex;
window.selectMapWorld = selectMapWorld;
window.getMapMonsterNodes = getMapMonsterNodes;
window.getCurrentWorldPanelBackground = getCurrentWorldPanelBackground;
window.updatePanelBackground = updatePanelBackground;

