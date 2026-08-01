"use strict";
/* ============================================================
Quest Idle — ui/hud-view.js
Barre du haut, toujours visible quel que soit l'onglet : ressources
(or/essence/Aether), zone/aventure en cours, XP + PV du héros, et la
barre de stats sous la zone de combat.
============================================================ */

/* Rafraîchit tout le HUD principal (ressources, nom de zone/aventure,
   XP du héros). Appelée très souvent (après quasiment chaque action
   qui change une valeur affichée). */
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

  renderHeroHp();
}

/* ============================================================
   v1.8.5 : Barre de vie du héros. La classe "low" (PV <= 25%)
   permet au CSS de la faire clignoter/rougir davantage.
============================================================ */

function renderHeroHp() {
  var text = document.getElementById("hud-hero-hp-text");
  var fill = document.getElementById("hud-hero-hp-fill");
  if (!text && !fill) return;

  var hp = Math.max(0, Math.ceil(Number(game.heroHp != null ? game.heroHp : game.heroMaxHp || 1)));
  var maxHp = Math.max(1, Math.floor(Number(game.heroMaxHp || 1)));
  var pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));

  if (text) text.textContent = formatNumber(hp) + " / " + formatNumber(maxHp);
  if (fill) {
    fill.style.width = pct + "%";
    fill.classList.toggle("low", pct <= 25);
  }
}

/* ============================================================
   Barre de stats sous la zone de combat : dégâts/tap, auto DPS,
   critique, bonus Aether et multiplicateur d'or — tous lus via les
   getters "effective*" de StatsSystem (jamais game.tapDamage etc.
   directement, pour être sûr d'avoir des valeurs propres).
============================================================ */

function renderStats() {
  var tap = document.getElementById("stat-tap-dmg");
  var auto = document.getElementById("stat-auto-dps");
  var crit = document.getElementById("stat-crit");
  var critPercent = document.getElementById("stat-crit-percent");
  var aether = document.getElementById("stat-aether-mult");
  var gold = document.getElementById("stat-gold-mult");
  var aetherBonuses = getAetherBonuses();

  function fmt2(n) {
    return (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
  }

  if (tap) tap.textContent = fmt2(EquipmentManager.effectiveTapDamage());
  if (auto) auto.textContent = fmt2(EquipmentManager.effectiveAutoDps());
  if (crit) crit.textContent = fmt2(EquipmentManager.effectiveCritChance()) + "%";
  if (critPercent) critPercent.textContent = "x" + fmt2(EquipmentManager.effectiveCritMult());
  if (aether) aether.textContent = "Tap +" + Math.round((aetherBonuses.tapBonus || 0) * 100) + "%";
  if (gold) gold.textContent = "x" + fmt2(EquipmentManager.effectiveGoldMult());
}

window.renderHud = renderHud;
window.renderHeroHp = renderHeroHp;
window.renderStats = renderStats;