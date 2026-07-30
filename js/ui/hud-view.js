"use strict";


/* ============================================================
   Ressources, zone, aventure. 
============================================================ */

function renderHud() {
  var gold = document.getElementById("hud-gold");
  var essence = document.getElementById("hud-essence");
  var aether = document.getElementById("hud-aether");
  var zone = document.getElementById("hud-zone-name");
  var adventure = document.getElementById("hud-adventure-name");

  var heroLevel = document.getElementById("hud-hero-level");
  var heroXpText = document.getElementById("hud-hero-xp-text");
  var heroXpFill = document.getElementById("hud-hero-xp-fill");

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

  var level = Number(game.heroLevel || 1);
  var xp = Math.floor(Number(game.heroXp || 0));
  var xpToNext = Math.max(1, Math.floor(Number(game.heroXpToNext || 10)));
  var percent = Math.max(0, Math.min(100, (xp / xpToNext) * 100));

  if (heroLevel) heroLevel.textContent = "Niv. " + level;
  if (heroXpText) heroXpText.textContent = xp + " / " + xpToNext + " XP";
  if (heroXpFill) heroXpFill.style.width = percent + "%";
}

/* ============================================================
   	Dégâts, DPS, critique, bonus. 
============================================================ */

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
   Carte héros en combat. 
============================================================ */

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


window.renderHud = renderHud;
window.renderStats = renderStats;