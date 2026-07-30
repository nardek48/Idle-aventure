"use strict";

/* ============================================================
   	Nom, image, bannière, compteur. 
============================================================ */

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

/* ============================================================
   Barre de vie. 
============================================================ */

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


/* ============================================================
   Carte stats ennemi. 
============================================================ */

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


window.renderEnemy = renderEnemy;
window.renderEnemyHp = renderEnemyHp;