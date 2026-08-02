"use strict";
/* ============================================================
Quest Idle — ui/combat-view.js
Rendu de la zone de combat (écran "Combat") : image/nom/PV de
l'ennemi affiché, et indicateur de résistance/faiblesse de l'arme
équipée face à lui.

v2.8 : buildCombatHTML() génère le marquage de #game-area (mêmes
id/class que l'ancien HTML statique d'index.html), injecté une seule
fois au boot par mountCombatArea() — voir main/boot.js.
============================================================ */

function buildCombatHTML() {
  return ''
    + '<div id="zone-banner">⚔️ Tappe l\'ennemi pour attaquer !</div>'
    + '<div id="dungeon-reminder-banner" class="dungeon-reminder-banner" style="display:none" onclick="switchTab(\'dungeon\')">🎟️ Ticket de donjon disponible — appuie pour y aller</div>'
    + '<div id="enemy-display">'
    +   '<div id="enemy-emoji" onclick="playerAttack()">🟢</div>'
    +   '<div id="enemy-name">Slime</div>'
    +   '<div id="enemy-affinity"></div>'
    +   '<div id="enemy-hp-bar-wrapper">'
    +     '<div id="enemy-hp-bar" style="width:100%"></div>'
    +     '<div id="enemy-hp-text">10 / 10</div>'
    +   '</div>'
    +   '<div class="enemy-counter" id="enemy-counter">Kills: 0</div>'
    + '</div>';
}

/* Injecte la zone de combat une seule fois au boot, avant le tout
   premier spawnEnemy()/renderEnemy(). */
function mountCombatArea() {
  var gameArea = document.getElementById("game-area");
  if (gameArea) gameArea.innerHTML = buildCombatHTML();
}

/* Met à jour tout l'affichage de l'ennemi courant : image (ou emoji
   de repli), nom, compteur de kills, bannière de zone, PV et
   indicateur d'affinité de dégâts. Appelée à chaque spawn d'ennemi
   et après chaque coup porté. */
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
  renderEnemyAffinity();
}

/* ============================================================
   Indicateur de résistance / faiblesse selon l'arme équipée.
   S'appuie sur getDamageAffinity() (combat-engine.js) qui compare
   le type de dégâts de l'arme équipée aux resists/weak de l'ennemi.
============================================================ */

function renderEnemyAffinity() {
  var el = document.getElementById("enemy-affinity");
  if (!el) return;

  if (!game.enemy || typeof getDamageAffinity !== "function") {
    el.textContent = "";
    el.className = "";
    return;
  }

  var affinity = getDamageAffinity();
  var labels = {
    resist: "⚠️ Résistant",
    weak: "✅ Point faible",
    unarmed: "🤜 Sans arme (-20%)",
    neutral: ""
  };

  el.textContent = labels[affinity.status] || "";
  el.className = "enemy-affinity " + affinity.status;
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

window.renderEnemy = renderEnemy;
window.renderEnemyHp = renderEnemyHp;
window.renderEnemyAffinity = renderEnemyAffinity;
window.buildCombatHTML = buildCombatHTML;
window.mountCombatArea = mountCombatArea;