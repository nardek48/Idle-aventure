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
    // v2.58 : bannière "Tappe l'ennemi pour attaquer !" (#zone-banner)
    // retirée à la demande de l'utilisateur — le bouton ATTAQUE et le
    // tap direct sur le monstre sont déjà assez explicites sans elle.
    // v2.70 : bannière "Ticket de donjon disponible" (#dungeon-
    // reminder-banner) retirée aussi — remplacée par une pastille
    // dédiée sur le bouton Donjon de la barre du bas (voir
    // #dungeon-tab-badge dans index.html et updateQuestBadge() dans
    // ui/quests-view.js).
    // v2.72 : mini-portrait du héros (#combat-hero-mini) déplacé dans
    // le HUD (voir ui/hud-view.js), à côté des ressources — il était
    // ici en survol de la zone de jeu, maintenant visible en
    // permanence sur tous les écrans, pas seulement en combat.

    // v2.40 : nom + PV de l'ennemi remontés AU-DESSUS de son
    // icône/image (avant : en dessous). Même id/class, juste
    // réordonné dans le flux (#enemy-display reste en colonne).
    // v2.58 : indicateur de résistance/point faible (#enemy-affinity)
    // retiré à la demande de l'utilisateur.
    + '<div id="enemy-display">'
    +   '<div id="enemy-name">Slime</div>'
    // v2.61 : le remplissage (#enemy-hp-bar) est maintenant dans un
    // sous-conteneur dédié (.enemy-hp-bar-track) qui porte le
    // découpage arrondi — avant, ce découpage était sur
    // #enemy-hp-bar-wrapper lui-même et rognait au passage les pointes
    // décoratives du cadre image, qui dépassaient légèrement de chaque
    // côté. Le cadre (::after sur le wrapper, voir css/03-combat.css)
    // n'est plus découpé, seul le remplissage rouge l'est.
    +   '<div id="enemy-hp-bar-wrapper">'
    +     '<div class="enemy-hp-bar-track"><div id="enemy-hp-bar" style="width:100%"></div></div>'
    +     '<div id="enemy-hp-text">10 / 10</div>'
    +   '</div>'
    +   '<div id="enemy-emoji" onclick="playerAttack()">🟢</div>'
    // v2.60 : compteur "Kills X" retiré à la demande de l'utilisateur.
    + '</div>'

    + '<div class="combat-action-row">'
    +   '<div id="special-attack-root"></div>'
    +   '<div id="defense-root"></div>'
    + '</div>'

    // v2.40 : nouveau bouton ATTAQUE explicite (en plus du tap direct
    // sur #enemy-emoji, toujours actif) — les potions de soin
    // rapides sont passées à côté de CE bouton (avant : à côté de
    // l'attaque spéciale/défense juste au-dessus).
    // v2.41 : la carte "❤️ Points de vie" qui suivait ce bloc a été
    // retirée (redondante avec la mini-barre de PV sous le portrait
    // du héros en haut à gauche, ajoutée en v2.40). Voir
    // renderHeroHp() dans ui/hud-view.js, qui ne cible plus que
    // #combat-hero-mini-hp-text/-fill désormais.
    // v2.67 : une potion de chaque côté (#heal-quick-root-left et
    // #heal-quick-root) pour un centrage parfait du bouton, voir
    // renderHealButtons() plus bas.
    + '<div class="combat-attack-row">'
    +   '<div id="heal-quick-root-left"></div>'
    +   '<button id="combat-attack-btn" class="combat-attack-btn" type="button" onclick="playerAttack()" aria-label="Attaque"></button>'
    +   '<div id="heal-quick-root"></div>'
    + '</div>';
}

/* Injecte la zone de combat une seule fois au boot, avant le tout
   premier spawnEnemy()/renderEnemy(). */
function mountCombatArea() {
  var gameArea = document.getElementById("game-area");
  if (gameArea) gameArea.innerHTML = buildCombatHTML();
}

/* ============================================================
   v2.16 : bouton de soin rapide. Une icône par potion de soin
   possédée, avec son stock ; grisée pendant le cooldown commun ou si
   le stock est à 0.
   v2.38 : déplacé de la barre du bas (#tab-bar-special-slot,
   supprimée) vers la rangée d'actions de combat (#heal-quick-root,
   juste à côté des boutons d'attaque spéciale et de défense) — la
   barre du bas accueille maintenant la navigation principale
   (Combat/Village/Donjon/Héros/Menu). Toujours visible pendant un
   donjon : DungeonManager bascule sur l'onglet "combat" pour
   combattre les vagues (voir switchTab("combat") dans
   dungeon-system.js), donc #heal-quick-root reste affiché.
============================================================ */
function buildHealButtonHTML(index) {
  if (typeof HEALING_POTIONS_DB === "undefined" || !window.PotionManager) return "";
  var potion = HEALING_POTIONS_DB[index];
  if (!potion) return "";

  var onCooldown = PotionManager.getHealCooldownRemainingMs() > 0;
  var stock = PotionManager.getHealingStock(potion.id);
  var disabled = onCooldown || stock <= 0;
  var keyLabel = String(index + 1); // touche "1" pour la 1ère potion, "2" pour la 2e...

  var h = '<div class="heal-quick-bar">';
  h += '<button class="heal-quick-btn' + (disabled ? ' disabled' : '') + '" type="button" '
    + (disabled ? 'disabled' : '')
    + ' onclick="PotionManager.useHealingPotion(\'' + esc(potion.id) + '\')" title="' + esc(potion.name) + ' (touche ' + keyLabel + ' sur PC)">';
  h += '<span class="heal-quick-icon">' + '<img src="' + esc(potion.icon) + '" alt="" draggable="false">' + '</span>';
  h += '<span class="heal-quick-count">' + stock + '</span>';
  h += '<span class="heal-quick-key">' + keyLabel + '</span>';
  h += '</button>';
  h += '</div>';
  return h;
}

/* Rafraîchit les boutons de soin rapide (stock + état du cooldown).
   v2.67 : une potion de chaque côté du bouton ATTAQUE (#heal-quick-
   root-left et #heal-quick-root) au lieu des deux groupées à droite —
   ça permet au bouton, de taille fixe, d'être PARFAITEMENT centré
   (les deux côtés ont désormais le même contenu, donc la même
   largeur), sans le compromis de centrage approximatif qu'il fallait
   avant pour ne pas chevaucher 2 potions groupées à droite.
   Appelée au boot, après achat/usage, et régulièrement depuis la
   boucle de jeu pour que le cooldown se débloque visuellement tout
   seul sans action du joueur. */
function renderHealButtons() {
  var left = document.getElementById("heal-quick-root-left");
  var right = document.getElementById("heal-quick-root");
  if (left) left.innerHTML = buildHealButtonHTML(0);
  if (right) right.innerHTML = buildHealButtonHTML(1);
}

/* Met à jour tout l'affichage de l'ennemi courant : image (ou emoji
/* v2.58 : nom du monstre, icône (image ou emoji de repli), compteur
   de kills et PV — la bannière de zone (#zone-banner) et l'indicateur
   de résistance/point faible (#enemy-affinity, voir
   renderEnemyAffinity ci-dessous) ont été retirés à la demande de
   l'utilisateur. Appelée à chaque spawn d'ennemi et après chaque
   coup porté. */
function renderEnemy() {
  if (!game.enemy) return;

  var emoji = document.getElementById("enemy-emoji");
  var name = document.getElementById("enemy-name");
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

  renderEnemyHp();
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
window.buildCombatHTML = buildCombatHTML;
window.mountCombatArea = mountCombatArea;
window.buildHealButtonHTML = buildHealButtonHTML;
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

  var h = '<button class="combat-action-btn attack-action-btn' + (onCooldown ? ' on-cooldown' : '') + '" type="button" '
    + (onCooldown ? 'disabled' : '')
    + ' onclick="SpecialAttackManager.use()" title="' + esc(special.desc) + '">';
  h += '<span class="combat-action-icon">' + esc(special.icon) + '</span>';
  h += '<span class="combat-action-name">' + esc(special.name) + '</span>';
  if (onCooldown) {
    h += '<span class="combat-action-cooldown">' + Math.ceil(remainingMs / 1000) + 's</span>';
    h += '<span class="combat-action-cooldown-fill" style="width:' + cooldownPct + '%"></span>';
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

/* ============================================================
   v2.21 : bouton de bouclier temporaire (voir DEFENSE_ABILITY dans
   data/heroes.js), universel — juste à côté du bouton d'attaque.
============================================================ */
function buildDefenseHTML() {
  if (typeof DEFENSE_ABILITY === "undefined" || !window.DefenseManager) return "";

  var remainingMs = DefenseManager.getCooldownRemainingMs();
  var onCooldown = remainingMs > 0;
  var cooldownPct = onCooldown ? Math.round((remainingMs / DEFENSE_ABILITY.cooldownMs) * 100) : 0;
  var active = DefenseManager.isActive();

  var h = '<button class="combat-action-btn defense-action-btn' + (onCooldown ? ' on-cooldown' : '') + (active ? ' is-active' : '') + '" type="button" '
    + (onCooldown ? 'disabled' : '')
    + ' onclick="DefenseManager.use()" title="' + esc(DEFENSE_ABILITY.desc) + '">';
  h += '<span class="combat-action-icon">' + esc(DEFENSE_ABILITY.icon) + '</span>';
  h += '<span class="combat-action-name">' + esc(DEFENSE_ABILITY.name) + '</span>';
  if (onCooldown) {
    h += '<span class="combat-action-cooldown">' + Math.ceil(remainingMs / 1000) + 's</span>';
    h += '<span class="combat-action-cooldown-fill" style="width:' + cooldownPct + '%"></span>';
  } else if (active) {
    h += '<span class="combat-action-active-tag">ACTIF</span>';
  }
  h += '</button>';
  return h;
}

function renderDefenseButton() {
  var host = document.getElementById("defense-root");
  if (host) host.innerHTML = buildDefenseHTML();
}

window.buildDefenseHTML = buildDefenseHTML;
window.renderDefenseButton = renderDefenseButton;