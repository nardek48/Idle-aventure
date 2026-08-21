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

    // v3.23 : la barre des potions actives est sortie de #enemy-display
    // (qui porte un margin-top:-100px pour remonter tout le bloc
    // ennemi) — elle se retrouvait décalée avec lui, quasi collée au
    // HUD et chevauchant visuellement le nom de l'ennemi au lieu
    // d'être clairement au-dessus. Maintenant un sibling DIRECT de
    // #enemy-display à l'intérieur de #game-area, avec son propre
    // espacement normal (voir .active-potions-bar, css/03-combat.css).
    + '<div id="active-potions-bar" class="active-potions-bar"></div>'

    // v2.40 : nom + PV de l'ennemi remontés AU-DESSUS de son
    // icône/image (avant : en dessous). Même id/class, juste
    // réordonné dans le flux (#enemy-display reste en colonne).
    // v2.58 : indicateur de résistance/point faible (#enemy-affinity)
    // retiré à la demande de l'utilisateur.
    + '<div id="enemy-display">'
    // v3.34.2 : badge de statuts actifs sur l'ennemi (vulnérabilité
    // posée par Brise-garde, DoT de Brûlure arcanique) — ancré en haut
    // à droite du bloc ennemi, même logique que .active-potions-bar
    // (absolu, vide/invisible tant qu'aucun statut n'est actif). Voir
    // buildEnemyStatusBarHTML().
    +   '<div id="enemy-status-bar" class="enemy-status-bar"></div>'
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
    // v3.34.0 : jauge de ressource de classe (Rage/Concentration/Mana)
    // au-dessus des 4 boutons d'action — voir buildClassResourceBarHTML().
    + '<div id="class-resource-root"></div>'

    // v3.34.0 : les 2 anciens boutons (attaque spéciale par héros,
    // bouclier universel) sont remplacés par les 4 actions de la
    // classe du héros choisi (skill1/skill2/skill3/defense) — voir
    // buildClassSkillButtonsHTML(). L'attaque de BASE de la classe
    // reste le tap normal (#combat-attack-btn, ci-dessous), pas un
    // 5e bouton ici.
    + '<div class="combat-action-row">'
    +   '<div id="class-skills-root"></div>'
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
    // v3.34.3 : ajout d'un overlay de recharge à l'intérieur du bouton
    // (#basic-attack-cooldown-overlay) — cooldown de l'attaque de base,
    // voir buildBasicAttackCooldownOverlayHTML()/renderBasicAttackCooldown().
    // Vide/invisible tant qu'aucun cooldown n'est en cours.
    + '<div class="combat-attack-row">'
    +   '<div id="heal-quick-root-left"></div>'
    +   '<button id="combat-attack-btn" class="combat-attack-btn" type="button" onclick="playerAttack()" aria-label="Attaque">'
    +     '<div id="basic-attack-cooldown-overlay"></div>'
    +   '</button>'
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
  var keyLabel = String(index + 5); // v3.34.0 : "5"/"6" (avant v2.90 : "3"/"4") — "1"à"4" repris par les 4 actions de classe (skill1/2/3/defense)

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

/* ============================================================
   v2.90 : mini-icônes des potions à effet ACTUELLEMENT actives
   (Force/Célérité/Précision/Endurance/Fortune — voir game.activePotions
   dans systems/potion-system.js), affichées en haut de l'écran Combat
   pour que le joueur sache d'un coup d'œil ce qui tourne, sans avoir
   à aller les chercher dans l'Inventaire. L'Élixir d'Aether n'a pas
   de minuteur (bonus consommé à l'ascension suivante) donc n'a pas sa
   place ici. Barre vide (rien affiché) si aucune potion active.
   Rafraîchie chaque seconde depuis la boucle de jeu, même rythme que
   les autres compte-à-rebours (soin/attaque spéciale/défense). */
/* v3.27 : affiche aussi les afflictions actuellement actives, dans la
   même barre que les potions à effet — demandé, en complément direct
   du plafond "une seule potion active à la fois" (v3.23) qui a
   libéré de la place ici. Contrairement aux potions (durée limitée,
   minuteur affiché), une affliction reste active tant qu'elle n'est
   pas désactivée manuellement (Menu ☰ > Afflictions) — pas de
   minuteur, juste l'icône avec son nom/effet en infobulle. */
function buildActivePotionsBarHTML() {
  if (typeof POTIONS_DB === "undefined" || !window.PotionManager) return "";

  var h = "";
  POTIONS_DB.forEach(function (potion) {
    if (!potion.durationMin) return; // Élixir d'Aether : pas de minuteur, ignoré ici
    var remainingMs = PotionManager.getRemainingMs(potion.id);
    if (remainingMs <= 0) return;

    var remainingMin = Math.ceil(remainingMs / 60000);
    h += '<div class="active-potion-icon" title="' + esc(potion.name) + ' — ' + remainingMin + ' min restantes">';
    h += '<img src="' + esc(potion.icon) + '" alt="' + esc(potion.name) + '">';
    h += '<span class="active-potion-timer">' + remainingMin + '</span>';
    h += '</div>';
  });

  if (window.AfflictionManager && typeof AfflictionManager.getActiveList === "function") {
    AfflictionManager.getActiveList().forEach(function (affliction) {
      h += '<div class="active-potion-icon active-affliction-icon" title="' + esc(affliction.name) + ' — ' + esc(affliction.desc) + '">';
      h += '<span class="active-affliction-emoji">' + esc(affliction.icon || "🔥") + '</span>';
      h += '</div>';
    });
  }

  return h;
}

function renderActivePotionsBar() {
  var host = document.getElementById("active-potions-bar");
  if (!host) return;
  host.innerHTML = buildActivePotionsBarHTML();
}
window.buildActivePotionsBarHTML = buildActivePotionsBarHTML;
window.renderActivePotionsBar = renderActivePotionsBar;

/* Met à jour tout l'affichage de l'ennemi courant : image (ou emoji
/* ============================================================
   v3.34.2 : badge de statuts actifs sur l'ennemi (vulnérabilité posée
   par Brise-garde, DoT de Brûlure arcanique — voir
   systems/class-combat-system.js, champs game.enemy.vulnerableUntil/
   vulnerableMult et game.enemy.dot). Vide (invisible) si aucun statut
   actif, même principe que .active-potions-bar. Emoji simple en
   attendant de vraies icônes dédiées (⚡ vulnérabilité, 🔥 DoT).
============================================================ */
function buildEnemyStatusBarHTML() {
  if (!game.enemy) return "";

  var h = "";

  if (game.enemy.vulnerableUntil && Date.now() < game.enemy.vulnerableUntil) {
    var vulnRemainingMs = game.enemy.vulnerableUntil - Date.now();
    var vulnPct = Math.round((game.enemy.vulnerableMult || 0) * 100);
    h += '<div class="enemy-status-icon enemy-status-vulnerability" title="Vulnérable : +' + vulnPct + '% dégâts subis">';
    h += '<span class="enemy-status-emoji">⚡</span>';
    h += '<span class="enemy-status-timer">' + Math.ceil(vulnRemainingMs / 1000) + '</span>';
    h += '</div>';
  }

  if (game.enemy.dot && game.enemy.dot.remainingMs > 0) {
    h += '<div class="enemy-status-icon enemy-status-dot" title="Brûlure arcanique : dégâts sur la durée">';
    h += '<span class="enemy-status-emoji">🔥</span>';
    h += '<span class="enemy-status-timer">' + Math.ceil(game.enemy.dot.remainingMs / 1000) + '</span>';
    h += '</div>';
  }

  // v3.48.0 : télégraphe de Charge — visible UNIQUEMENT pendant la
  // fenêtre d'avertissement (chargeTelegraphUntil posé par
  // CombatEngine.enemyChargeTick()), disparaît dès l'impact résolu
  // (resolveEnemyCharge() remet ce champ à 0). Icône distincte des 2
  // statuts ci-dessus (danger imminent, pas un effet déjà appliqué).
  if (game.enemy.chargeTelegraphUntil && Date.now() < game.enemy.chargeTelegraphUntil) {
    var chargeRemainingMs = game.enemy.chargeTelegraphUntil - Date.now();
    h += '<div class="enemy-status-icon enemy-status-charge" title="Charge imminente !">';
    h += '<span class="enemy-status-emoji">💢</span>';
    h += '<span class="enemy-status-timer">' + Math.max(0, (chargeRemainingMs / 1000).toFixed(1)) + '</span>';
    h += '</div>';
  }

  // v3.49.0 : télégraphe de Bouclier (boss uniquement) — même
  // principe que le télégraphe de Charge ci-dessus (visible seulement
  // pendant la fenêtre d'avertissement).
  if (game.enemy.shieldTelegraphUntil && Date.now() < game.enemy.shieldTelegraphUntil) {
    var shieldTelegraphRemainingMs = game.enemy.shieldTelegraphUntil - Date.now();
    h += '<div class="enemy-status-icon enemy-status-shield-telegraph" title="Bouclier imminent !">';
    h += '<span class="enemy-status-emoji">🛡️</span>';
    h += '<span class="enemy-status-timer">' + Math.max(0, (shieldTelegraphRemainingMs / 1000).toFixed(1)) + '</span>';
    h += '</div>';
  }

  // v3.49.0 : Bouclier ACTIF (dégâts réduits en cours, voir
  // CombatEngine.dealDamage()) — badge distinct du télégraphe
  // ci-dessus (état "en cours" vs "va arriver"), pas de superposition
  // possible (shieldTelegraphUntil est effacé avant que
  // shieldActiveUntil ne soit posé, voir resolveBossShield()).
  if (game.enemy.shieldActiveUntil && Date.now() < game.enemy.shieldActiveUntil) {
    var shieldActiveRemainingMs = game.enemy.shieldActiveUntil - Date.now();
    h += '<div class="enemy-status-icon enemy-status-shield-active" title="Bouclier actif : -50% dégâts subis">';
    h += '<span class="enemy-status-emoji">🛡️</span>';
    h += '<span class="enemy-status-timer">' + Math.ceil(shieldActiveRemainingMs / 1000) + '</span>';
    h += '</div>';
  }

  // v3.49.0 : télégraphe de Soin (boss uniquement).
  if (game.enemy.healTelegraphUntil && Date.now() < game.enemy.healTelegraphUntil) {
    var healTelegraphRemainingMs = game.enemy.healTelegraphUntil - Date.now();
    h += '<div class="enemy-status-icon enemy-status-heal-telegraph" title="Soin imminent !">';
    h += '<span class="enemy-status-emoji">💚</span>';
    h += '<span class="enemy-status-timer">' + Math.max(0, (healTelegraphRemainingMs / 1000).toFixed(1)) + '</span>';
    h += '</div>';
  }

  // v3.57.0 : badge de CONFIRMATION d'un contre réussi (voir
  // ClassCombatManager.applyGrimoireCounterIfApplicable(), systems/
  // class-combat-system.js, qui pose ce champ) — apparaît à la place
  // du badge de télégraphe qui vient de disparaître (Charge/Bouclier/
  // Soin s'effacent au MÊME rendu que l'annulation, sans fenêtre pour
  // animer une transition dessus). Durée courte (voir
  // COUNTER_CONFIRMATION_MS, combat-engine.js), disparaît de lui-même.
  if (game.enemy.counteredUntil && Date.now() < game.enemy.counteredUntil) {
    var counteredRemainingMs = game.enemy.counteredUntil - Date.now();
    h += '<div class="enemy-status-icon enemy-status-countered" title="Attaque contrée !">';
    h += '<span class="enemy-status-emoji">⚡</span>';
    h += '<span class="enemy-status-timer">' + Math.ceil(counteredRemainingMs / 1000) + '</span>';
    h += '</div>';
  }

  return h;
}

function renderEnemyStatusBar() {
  var host = document.getElementById("enemy-status-bar");
  if (host) host.innerHTML = buildEnemyStatusBarHTML();
}

window.buildEnemyStatusBarHTML = buildEnemyStatusBarHTML;
window.renderEnemyStatusBar = renderEnemyStatusBar;

/* ============================================================
   v3.34.3 : rendu du cooldown de l'attaque de base (tap manuel) — 2
   points concernés, le bouton ATTAQUE dédié (#combat-attack-btn, via
   un overlay de remplissage à l'intérieur, même principe que les
   boutons de skill) et le sprite ennemi (#enemy-emoji, via une classe
   CSS de grisage). Les 2 restent cliquables pendant le cooldown (le
   clic met le coup en file d'attente, voir
   CombatEngine.requestPlayerAttack()) — seul l'aspect visuel change,
   jamais l'attribut disabled.
============================================================ */
function buildBasicAttackCooldownOverlayHTML() {
  var remainingMs = game.basicAttackCooldownMs || 0;
  if (remainingMs <= 0) return "";

  // v3.34.3 : le pourcentage de remplissage a besoin du cooldown total
  // (pas seulement du restant) pour animer la jauge — recalculé ici à
  // partir de la Célérité courante (même formule que
  // CombatEngine.playerAttack(), légèrement redondant mais évite de
  // stocker un 2e champ game.basicAttackCooldownTotalMs juste pour ça).
  var totalCelerity = (window.CombatEngine && typeof CombatEngine.getTotalCelerity === "function") ? CombatEngine.getTotalCelerity() : 0;
  var totalMs = (typeof computeEffectiveCooldownMs === "function")
    ? computeEffectiveCooldownMs(BASIC_ATTACK_BASE_COOLDOWN_MS, totalCelerity)
    : BASIC_ATTACK_BASE_COOLDOWN_MS;
  var pct = totalMs > 0 ? Math.round((remainingMs / totalMs) * 100) : 0;

  var h = '<span class="combat-action-cooldown">' + Math.ceil(remainingMs / 1000) + 's</span>';
  h += '<span class="combat-action-cooldown-fill" style="width:' + pct + '%"></span>';
  return h;
}

function renderBasicAttackCooldown() {
  var onCooldown = (game.basicAttackCooldownMs || 0) > 0;

  var overlay = document.getElementById("basic-attack-cooldown-overlay");
  if (overlay) overlay.innerHTML = buildBasicAttackCooldownOverlayHTML();

  var attackBtn = document.getElementById("combat-attack-btn");
  if (attackBtn) attackBtn.classList.toggle("on-cooldown", onCooldown);

  var emoji = document.getElementById("enemy-emoji");
  if (emoji) emoji.classList.toggle("on-cooldown", onCooldown);
}

window.buildBasicAttackCooldownOverlayHTML = buildBasicAttackCooldownOverlayHTML;
window.renderBasicAttackCooldown = renderBasicAttackCooldown;

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

  // v3.34.2 : nouvel ennemi -> aucun statut hérité de l'ancien (un
  // spawn remplace intégralement game.enemy, voir CombatEngine.spawnEnemy()).
  renderEnemyStatusBar();
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
  // v3.34.2 : rafraîchi ici aussi (pas seulement au spawn) — les
  // compte-à-rebours affichés changent à chaque coup porté, comme le
  // reste de cette fonction.
  renderEnemyStatusBar();
}

window.renderEnemy = renderEnemy;
window.renderEnemyHp = renderEnemyHp;
window.buildCombatHTML = buildCombatHTML;
window.mountCombatArea = mountCombatArea;
window.buildHealButtonHTML = buildHealButtonHTML;
window.renderHealButtons = renderHealButtons;

/* ============================================================
   v2.19 : raccourcis clavier (version PC) pour les potions de soin —
   touche "1"/"2".
   v2.90 : élargi aux 4 actions de combat rapide — "1" Attaque
   spéciale, "2" Défense spéciale (bouclier), "3"/"4" potions de soin.
   v3.34.0 : "1"/"2"/"3" -> skill1/skill2/skill3 de classe, "4" ->
   defense de classe (remplace l'ancien système, voir
   ClassCombatManager.useSkillManual()) — les potions de soin sont donc
   décalées en "5"/"6". Ignorés si le joueur est en train de taper
   dans un champ texte (nom du joueur, code d'import de sauvegarde,
   recherche...), pour ne pas interférer avec la saisie. Fonctionne
   depuis n'importe quel écran, comme les boutons tactiles
   équivalents — chaque manager (ClassCombat/Potion) gère déjà
   lui-même son cooldown/sa disponibilité, aucune vérification
   supplémentaire nécessaire ici. */
function initHealKeyboardShortcuts() {
  document.addEventListener("keydown", function (e) {
    var active = document.activeElement;
    var tag = active ? active.tagName : "";
    if (tag === "INPUT" || tag === "TEXTAREA" || (active && active.isContentEditable)) return;

    var classSlotByKey = { "1": "skill1", "2": "skill2", "3": "skill3", "4": "defense" };
    if (classSlotByKey[e.key]) {
      // v3.47.0 : mêmes touches ignorées si le combat auto est actif
      // — cohérent avec les boutons tactiles équivalents (disabled),
      // sinon le raccourci clavier contournerait le remplacement total.
      if (window.ClassCombatManager && !game.autoSkillsEnabled) ClassCombatManager.useSkillManual(classSlotByKey[e.key]);
      return;
    }

    if (typeof HEALING_POTIONS_DB === "undefined" || !window.PotionManager) return;
    var index = -1;
    if (e.key === "5") index = 0;
    else if (e.key === "6") index = 1;
    if (index === -1) return;

    var potion = HEALING_POTIONS_DB[index];
    if (potion) PotionManager.useHealingPotion(potion.id);
  });
}

window.initHealKeyboardShortcuts = initHealKeyboardShortcuts;

/* ============================================================
   v3.34.0 : 4 boutons d'action de la classe du héros choisi
   (skill1/skill2/skill3/defense — voir data/class-skills.js et
   systems/class-combat-system.js), affichés sous l'ennemi sur l'écran
   Combat — fonctionne aussi en plein donjon. Remplace les 2 anciens
   boutons (attaque spéciale par héros + bouclier universel, voir
   data/heroes.js pour la note de suppression).
   Touches PC : 1/2/3 pour skill1/2/3, 4 pour defense — décale les
   anciennes touches 3/4 des potions de soin, reprises en 5/6
   (voir initHealKeyboardShortcuts() plus haut dans ce fichier).
============================================================ */
var CLASS_SKILL_SLOTS = ["skill1", "skill2", "skill3", "defense"];
var CLASS_SKILL_KEY_LABELS = { skill1: "1", skill2: "2", skill3: "3", defense: "4" };

function buildClassSkillButtonHTML(slot) {
  if (!window.ClassCombatManager || typeof ClassCombatManager.getAction !== "function") return "";
  var action = ClassCombatManager.getAction(slot);
  if (!action) return "";

  var resourceState = (typeof ClassCombatManager.ensureForCurrentClass === "function")
    ? ClassCombatManager.ensureForCurrentClass()
    : null;
  var cooldownRemainingMs = (game.classCooldowns && typeof game.classCooldowns[action.id] === "number")
    ? game.classCooldowns[action.id]
    : 0;
  var onCooldown = cooldownRemainingMs > 0;
  var cooldownPct = onCooldown ? Math.round((cooldownRemainingMs / action.cooldownMs) * 100) : 0;

  var affordable = !resourceState || resourceState.current >= (action.resourceCost || 0);
  // v3.47.0 : combat auto de base — remplacement TOTAL du tap manuel
  // sur ces 4 boutons tant que game.autoSkillsEnabled est vrai (voir
  // ClassCombatManager.tickAutoSkills(), systems/class-combat-system.js).
  // Réponse explicite de Seb : pas de coexistence pour cette 1ère étape.
  var autoModeActive = !!game.autoSkillsEnabled;
  var disabled = onCooldown || !affordable || autoModeActive;

  var activeDefense = (action.type === "defense" && window.ClassCombatManager && typeof ClassCombatManager.getActiveDefenseEffect === "function")
    ? ClassCombatManager.getActiveDefenseEffect()
    : null;
  var isActiveNow = !!(activeDefense && activeDefense.actionId === action.id);

  var icon = (typeof CLASS_ACTION_ICON_FALLBACK !== "undefined" && CLASS_ACTION_ICON_FALLBACK[action.id]) || (action.type === "defense" ? "🛡️" : "✨");
  var keyLabel = CLASS_SKILL_KEY_LABELS[action.slot] || "";

  var h = '<button class="combat-action-btn class-skill-btn' + (action.type === "defense" ? " defense-action-btn" : " attack-action-btn")
    + (onCooldown ? ' on-cooldown' : '') + (isActiveNow ? ' is-active' : '') + (!affordable && !onCooldown ? ' not-affordable' : '') + (autoModeActive ? ' auto-mode' : '') + '" type="button" '
    + (disabled ? 'disabled' : '')
    + ' onclick="ClassCombatManager.useSkillManual(\'' + esc(slot) + '\')" title="' + (autoModeActive ? 'Combat automatique actif (voir Paramètres)' : esc(action.description) + (keyLabel ? ' (touche ' + keyLabel + ' sur PC)' : '')) + '">';
  h += '<span class="combat-action-key">' + esc(keyLabel) + '</span>';
  h += renderIconOrEmojiHTML(icon, "combat-action-icon", action.label);
  if (onCooldown) {
    h += '<span class="combat-action-cooldown">' + Math.ceil(cooldownRemainingMs / 1000) + 's</span>';
    h += '<span class="combat-action-cooldown-fill" style="width:' + cooldownPct + '%"></span>';
  } else if (isActiveNow) {
    h += '<span class="combat-action-active-tag">ACTIF</span>';
  }
  h += '</button>';
  return h;
}

function buildClassSkillButtonsHTML() {
  if (!window.ClassCombatManager) return "";
  var h = "";
  CLASS_SKILL_SLOTS.forEach(function (slot) {
    h += buildClassSkillButtonHTML(slot);
  });
  return h;
}

function renderClassSkillButtons() {
  var host = document.getElementById("class-skills-root");
  if (host) host.innerHTML = buildClassSkillButtonsHTML();
  renderClassResourceBar();
}

window.buildClassSkillButtonsHTML = buildClassSkillButtonsHTML;
window.renderClassSkillButtons = renderClassSkillButtons;

/* ============================================================
   v3.34.0 : jauge de ressource de classe (Rage/Concentration/Mana),
   affichée au-dessus des 4 boutons d'action. Vide (rien affiché) si
   aucune classe résolue (ne devrait pas arriver en jeu normal).
============================================================ */
function buildClassResourceBarHTML() {
  if (!window.ClassCombatManager || typeof ClassCombatManager.ensureForCurrentClass !== "function") return "";
  var state = ClassCombatManager.ensureForCurrentClass();
  if (!state || !state.max) return "";

  var pct = Math.max(0, Math.min(100, Math.round((state.current / state.max) * 100)));
  var classId = typeof ClassCombatManager.getCurrentClassId === "function" ? ClassCombatManager.getCurrentClassId() : null;
  var resourceDef = (classId && typeof getClassResource === "function") ? getClassResource(classId) : null;
  var label = resourceDef ? resourceDef.label : "";

  var h = '<div class="class-resource-bar class-resource-' + esc(state.resourceId || "") + '">';
  h +=   '<div class="class-resource-track">';
  h +=     '<div class="class-resource-fill" style="width:' + pct + '%"></div>';
  h +=     '<span class="class-resource-text">' + esc(label) + ' — ' + Math.floor(state.current) + ' / ' + state.max + '</span>';
  h +=   '</div>';
  h += '</div>';
  return h;
}

function renderClassResourceBar() {
  var host = document.getElementById("class-resource-root");
  if (host) host.innerHTML = buildClassResourceBarHTML();
}

window.buildClassResourceBarHTML = buildClassResourceBarHTML;
window.renderClassResourceBar = renderClassResourceBar;