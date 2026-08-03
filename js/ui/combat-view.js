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
    + '</div>'
    + '<div id="special-attack-root"></div>';
}

/* Injecte la zone de combat une seule fois au boot, avant le tout
   premier spawnEnemy()/renderEnemy(). */
function mountCombatArea() {
  var gameArea = document.getElementById("game-area");
  if (gameArea) gameArea.innerHTML = buildCombatHTML();
}

/* ============================================================
   v2.16 : bouton de soin rapide, dans l'emplacement réservé de la
   barre du bas (#tab-bar-special-slot) — utilisable depuis n'importe
   quel écran, pas seulement en combat, pour ne jamais être bloqué en
   plein donjon. Une icône par potion de soin possédée, avec son
   stock ; grisée pendant le cooldown commun ou si le stock est à 0.
============================================================ */
function buildHealButtonsHTML() {
  if (typeof HEALING_POTIONS_DB === "undefined" || !window.PotionManager) return "";

  var onCooldown = PotionManager.getHealCooldownRemainingMs() > 0;
  var h = '<div class="heal-quick-bar">';

  HEALING_POTIONS_DB.forEach(function (potion, index) {
    var stock = PotionManager.getHealingStock(potion.id);
    var disabled = onCooldown || stock <= 0;
    var keyLabel = String(index + 1); // touche "1" pour la 1ère potion, "2" pour la 2e...

    h += '<button class="heal-quick-btn' + (disabled ? ' disabled' : '') + '" type="button" '
      + (disabled ? 'disabled' : '')
      + ' onclick="PotionManager.useHealingPotion(\'' + esc(potion.id) + '\')" title="' + esc(potion.name) + ' (touche ' + keyLabel + ' sur PC)">';
    h += '<span class="heal-quick-icon">' + esc(potion.icon) + '</span>';
    h += '<span class="heal-quick-count">' + stock + '</span>';
    h += '<span class="heal-quick-key">' + keyLabel + '</span>';
    h += '</button>';
  });

  h += '</div>';
  return h;
}

/* Rafraîchit le bouton de soin rapide (stock + état du cooldown).
   Appelée au boot, après achat/usage, et régulièrement depuis la
   boucle de jeu pour que le cooldown se débloque visuellement tout
   seul sans action du joueur. */
function renderHealButtons() {
  var host = document.getElementById("tab-bar-special-slot");
  if (host) host.innerHTML = buildHealButtonsHTML();
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
window.buildHealButtonsHTML = buildHealButtonsHTML;
window.renderHealButtons = renderHealButtons;

/* ============================================================
   v2.19 : raccourcis clavier (version PC) pour les potions de soin —
   touche "1" = 1ère potion (mineure), "2" = 2e (majeure), dans
   l'ordre de HEALING_POTIONS_DB. Ignorés si le joueur est en train
   de taper dans un champ texte (nom du joueur, code d'import de
   sauvegarde, recherche...), pour ne pas interférer avec la saisie.
   Fonctionne depuis n'importe quel écran, comme le bouton rapide. */
function initHealKeyboardShortcuts() {
  document.addEventListener("keydown", function (e) {
    var active = document.activeElement;
    var tag = active ? active.tagName : "";
    if (tag === "INPUT" || tag === "TEXTAREA" || (active && active.isContentEditable)) return;
    if (typeof HEALING_POTIONS_DB === "undefined" || !window.PotionManager) return;

    var index = -1;
    if (e.key === "1") index = 0;
    else if (e.key === "2") index = 1;
    if (index === -1) return;

    var potion = HEALING_POTIONS_DB[index];
    if (potion) PotionManager.useHealingPotion(potion.id);
  });
}

window.initHealKeyboardShortcuts = initHealKeyboardShortcuts;

/* ============================================================
   v2.20 : bouton d'attaque spéciale, propre au héros choisi (voir
   HERO_SPECIAL_ATTACKS dans data/heroes.js), affiché juste sous
   l'ennemi sur l'écran Combat — fonctionne aussi en plein donjon.
============================================================ */
function buildSpecialAttackHTML() {
  if (!window.SpecialAttackManager) return "";
  var special = SpecialAttackManager.getCurrentSpecial();
  if (!special) return "";

  var remainingMs = SpecialAttackManager.getCooldownRemainingMs();
  var onCooldown = remainingMs > 0;
  var cooldownPct = onCooldown ? Math.round((remainingMs / special.cooldownMs) * 100) : 0;

  var h = '<button class="special-attack-btn' + (onCooldown ? ' on-cooldown' : '') + '" type="button" '
    + (onCooldown ? 'disabled' : '')
    + ' onclick="SpecialAttackManager.use()">';
  h += '<span class="special-attack-icon">' + esc(special.icon) + '</span>';
  h += '<span class="special-attack-info">';
  h += '<span class="special-attack-name">' + esc(special.name) + '</span>';
  h += '<span class="special-attack-desc">' + esc(special.desc) + '</span>';
  h += '</span>';
  if (onCooldown) {
    h += '<span class="special-attack-cooldown">' + Math.ceil(remainingMs / 1000) + 's</span>';
    h += '<span class="special-attack-cooldown-fill" style="width:' + cooldownPct + '%"></span>';
  }
  h += '</button>';
  return h;
}

function renderSpecialAttackButton() {
  var host = document.getElementById("special-attack-root");
  if (host) host.innerHTML = buildSpecialAttackHTML();
}

window.buildSpecialAttackHTML = buildSpecialAttackHTML;
window.renderSpecialAttackButton = renderSpecialAttackButton;