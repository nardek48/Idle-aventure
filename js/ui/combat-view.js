"use strict";
/* ui/combat-view.js — écran Combat par rounds (v3.102.0, P2) : zone ennemi (PV, statuts/télégraphes en rounds), barre de round
   (n°, mode Tactique/Grimoire, Continuer l'attaque, jauge de célérité), 4 boutons de classe, bouton Attaque, potions (= action Objet). */

function buildCombatHTML() {
  /* v3.241.0 : écran de combat en trois bandes (atelier-combat.html, layout A2
     validé par Seb) — arène en haut, commandes au milieu, panneau héros en bas. */
  return ''
    + '<div class="cb-arena">'
    +   '<div id="active-potions-bar" class="active-potions-bar"></div>'
    +   '<div id="enemy-display">'
    +     '<div id="combat-mission-progress" class="combat-mission-progress"></div>'
    // v3.269.0 (L-3) : rangée d'ennemis — vide, donc invisible, tant qu'ils sont seuls.
    +     '<div id="enemy-row"></div>'
    +     '<div id="enemy-name">Slime</div>'
    +     '<div id="enemy-hp-bar-wrapper" class="kgauge kgauge-dragon-claw kgauge-hp-enemy">'
    +       '<div class="kgauge-track"><div id="enemy-hp-bar" class="kgauge-fill" style="width:100%"></div></div>'
    +       '<div id="enemy-hp-text" class="kgauge-text">10 / 10</div>'
    +     '</div>'
    +     '<div id="combat-alert-bar" class="combat-alert-bar"></div>'
    +     '<div id="enemy-status-bar" class="enemy-status-bar"></div>'
    +     '<div id="enemy-emoji">\ud83d\udfe2</div>'
    +   '</div>'
    + '</div>'

    + '<div class="cb-cmd">'
    +   '<div class="combat-action-row"><div id="class-skills-root"></div></div>'
    +   '<div class="combat-attack-row">'
    +     '<div id="heal-quick-root-left"></div>'
    +     '<button id="combat-attack-btn" class="combat-attack-btn" type="button" onclick="heroBasicAttack()" aria-label="Attaque">ATTAQUER</button>'
    +     '<div id="heal-quick-root"></div>'
    +   '</div>'
    + '</div>'

    /* v3.273.0 (atelier-bandeau-v2, validé par Seb) : la rangée des acteurs — héros
       COMPRIS — est au-dessus du cadre ; le cadre, lui, englobe la rangée de commandes
       et les jauges de l'acteur affiché. */
    + '<div id="combat-sortie-sheet-root"></div>'
    + '<div id="ally-row"></div>'
    + '<div class="cb-hero">'
    +   '<div class="cb-ctl-row">'
    +     '<div id="combat-controls-root" class="combat-controls"></div>'
    +     '<div id="combat-speed-inline" class="combat-speed-inline"></div>'
    +     '<div id="combat-sortie-root" class="combat-sortie-row"></div>'
    +   '</div>'
    +   '<div id="companion-band-root"></div>'
    +   '<div class="cb-hero-top">'
    +     '<div id="combat-hero-slot" class="cb-hero-slot"></div>'
    +   '</div>'
    /* Les deux jauges secondaires sont décalées de la largeur du portrait pour s'aligner
       sous la barre de PV, et non sur tout le cadre (maquette validée). */
    /* v3.275.0 : plus qu'une jauge secondaire — la célérité s'y superpose. Le conteneur
       de célérité reste dans le DOM (des vues le renseignent) mais n'est plus dessiné. */
    +   '<div class="cb-gauges">'
    +     '<div id="class-resource-root"></div>'
    +     '<div id="combat-celerity-root" class="cb-celerity is-merged"></div>'
    +   '</div>'
    + '</div>';
}

function mountCombatArea() {
  var gameArea = document.getElementById("game-area");
  if (gameArea) gameArea.innerHTML = buildCombatHTML();
  if (typeof relocateCombatHeroMini === "function") relocateCombatHeroMini(document.body.classList.contains("combat-active"));
}

function buildHealButtonHTML(index) {
  if (typeof HEALING_POTIONS_DB === "undefined" || !window.PotionManager) return "";
  var potion = HEALING_POTIONS_DB[index];
  if (!potion) return "";

  var stock = PotionManager.getHealingStock(potion.id);
  var busy = !!(game.combatRound && game.combatRound.busy);
  var disabled = stock <= 0 || busy || (game.heroHp || 0) <= 0;
  var keyLabel = String(index + 5); // v3.34.0 : "5"/"6" (avant v2.90 : "3"/"4") — "1"à"4" repris par les 4 actions de classe (skill1/2/3/defense)

  var h = '<div class="heal-quick-bar">';
  h += '<button class="heal-quick-btn' + (disabled ? ' disabled' : '') + '" type="button" '
    + (disabled ? 'disabled' : '')
    + ' onclick="CombatEngine.heroAction(\'potion\', \'' + esc(potion.id) + '\')" title="' + esc(potion.name) + ' — consomme le tour (touche ' + keyLabel + ' sur PC)">';
  h += '<span class="heal-quick-icon">' + '<img src="' + esc(potion.icon) + '" alt="" draggable="false">' + '</span>';
  h += '<span class="heal-quick-count">' + stock + '</span>';
  h += '<span class="heal-quick-key">' + keyLabel + '</span>';
  h += '</button>';
  h += '</div>';
  return h;
}

function renderHealButtons() {
  var left = document.getElementById("heal-quick-root-left");
  var right = document.getElementById("heal-quick-root");
  if (left) left.innerHTML = buildHealButtonHTML(0);
  if (right) right.innerHTML = buildHealButtonHTML(1);
}

function buildActivePotionsBarHTML() {
  if (typeof POTIONS_DB === "undefined" || !window.PotionManager) return "";

  // v3.115.0 : per-run — icônes des potions armées, sans minuteur. <img class=ico-inline src=images/Icons/combat_stats/stat_attack.png> = effet vivant
  // (mission en cours), sinon armée en attente du prochain run.
  var live = typeof PotionManager.isEffectLive === "function" && PotionManager.isEffectLive();
  var h = "";
  POTIONS_DB.forEach(function (potion) {
    if (!potion.perRun) return; // Élixir d'Aether : hors runs, ignoré ici
    if (!PotionManager.isArmed(potion.id)) return;

    var title = potion.name + (live ? " — active pour ce run" : " — armée pour la prochaine mission");
    h += '<div class="active-potion-icon' + (live ? '' : ' is-armed-idle') + '" title="' + esc(title) + '">';
    h += '<img src="' + esc(potion.icon) + '" alt="">';
    if (live) h += '<span class="active-potion-timer"><img class=ico-inline src=images/Icons/combat_stats/stat_attack.png></span>';
    h += '</div>';
  });

  if (window.AfflictionManager && typeof AfflictionManager.getActiveList === "function") {
    AfflictionManager.getActiveList().forEach(function (affliction) {
      h += '<div class="active-potion-icon active-affliction-icon" title="' + esc(affliction.name) + ' — ' + esc(affliction.desc) + '">';
      h += '<span class="active-affliction-emoji">' + renderIconOrEmojiHTML(affliction.icon, "active-affliction-img", affliction.name) + '</span>';
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

/* ============================================================================
   ÉTATS DE COMBAT (v3.251.0, lot B-1 — atelier atelier-statuts.html)

   Avant : une seule barre, 14 états rendus à l'identique, explication dans un attribut
   title que mobile n'affiche JAMAIS (il faut un survol souris). Une charge imminente, qui
   demande une action ce round, avait le même poids visuel qu'un archétype permanent.

   Maintenant, deux zones :
     - le BANDEAU (buildCombatAlertHTML) : ce qui arrive au prochain round, avec le MOT
       écrit — « Il charge ! » se comprend sans rien apprendre, une pastille rouge non ;
     - la RANGÉE (buildCombatStatesHTML) : tout le reste, discret, sous la barre de PV,
       cliquable EN ENTIER pour ouvrir la feuille (une pastille fait 34 px, sous les 44 px
       recommandés au doigt).
   Le catalogue (nom, effet, conseil d'action) vit dans data/combat-states.js.
   ============================================================================ */

/* Liste des états actifs, lue sur l'état de jeu. Renvoie [{ id, def, n, suppressed }] où
   `n` est un compteur à afficher (rounds restants, cumuls) ou null. */
function getActiveCombatStates() {
  var out = [];
  if (!game.enemy) return out;
  var e = game.enemy;
  var C = window.COMBAT_STATES || {};
  function push(id, n, suppressed) {
    if (!C[id]) return;
    out.push({ id: id, def: C[id], n: (typeof n === "number" && n > 0) ? n : null, suppressed: !!suppressed });
  }

  // --- Au prochain round ---
  var engageIn = Number(e.engageIn || 0);
  if (engageIn > 0) push("approaching", engageIn);
  if (e.chargeTelegraphed) push("charge");
  if (e.silenceTelegraphed) push("silence");
  if (e.shieldTelegraphed) push("shieldIncoming");
  if (e.healTelegraphed) push("healIncoming");
  if (window.CombatEngine && typeof CombatEngine.enemyDoubleStrikeNext === "function" && CombatEngine.enemyDoubleStrikeNext()) {
    push("doubleStrike");
  }

  // --- Porté par l'ennemi ---
  if (e.archetype === "enraged") push("enraged", null, Number(e.rageFreezeRounds || 0) > 0);
  if (e.archetype === "corrupted") push("corrupted", Number(e.corruptedStacks || 0));
  if (e.archetype === "vampiric") push("vampiric", null, Number(e.vampiricSuppressedRounds || 0) > 0);
  if (e.archetype === "armored") push("armored", null, Number(e.armorSuppressedRounds || 0) > 0);
  if (Number(e.shieldRounds || 0) > 0) push("shieldActive", Number(e.shieldRounds));

  // --- Posé par le héros ---
  if (Number(e.vulnerableRounds || 0) > 0) push("vulnerable", Number(e.vulnerableRounds));
  if (e.dot && Number(e.dot.rounds || 0) > 0) push("dot", Number(e.dot.rounds));
  if (Number(e.counteredRounds || 0) > 0) push("countered");

  // --- Subi par le héros ---
  if (Number(game.silencedRounds || 0) > 0) push("silenced", Number(game.silencedRounds));

  return out;
}
window.getActiveCombatStates = getActiveCombatStates;

/* Bandeau : uniquement la famille « alerte ». Un SEUL bandeau même à plusieurs télégraphes —
   deux bandeaux empilés cesseraient d'être lus comme une alerte ; on rétrécit le texte. */
function buildCombatAlertHTML() {
  var alerts = getActiveCombatStates().filter(function (st) { return st.def.famille === "alerte"; });
  if (!alerts.length) return "";
  var teinte = (alerts.length === 1 && alerts[0].def.teinte) ? alerts[0].def.teinte : "";
  /* v3.281.0 (bug Seb, iPhone) : de vrais <button>. Un div porteur d'un onclick ne reçoit
     pas toujours le tap sur iOS, y compris avec cursor:pointer — un bouton, si. Le style
     est neutralisé en CSS, l'apparence ne change pas. */
  var h = '<button type="button" class="cb-alert ' + teinte + (alerts.length > 1 ? " is-multi" : "") + '" onclick="openCombatStatesSheet()">';
  alerts.forEach(function (st, i) {
    if (i > 0) h += '<span class="cb-alert-sep">\u00b7</span>';
    h += renderIconOrEmojiHTML(st.def.icon, "", st.def.nom);
    h += '<span>' + esc(st.def.mot || st.def.nom) + '</span>';
  });
  h += '</button>';
  return h;
}
window.buildCombatAlertHTML = buildCombatAlertHTML;

function familyClass(f) {
  return f === "enemy" ? "is-enemy" : f === "mine" ? "is-mine" : f === "onme" ? "is-onme" : "";
}

/* Rangée : tout sauf les alertes. */
function buildCombatStatesHTML() {
  var states = getActiveCombatStates().filter(function (st) { return st.def.famille !== "alerte"; });
  if (!states.length) return "";
  var max = (typeof COMBAT_STATES_MAX_VISIBLE === "number") ? COMBAT_STATES_MAX_VISIBLE : 6;
  var visibles = states.slice(0, max);
  var reste = states.length - visibles.length;

  var h = '<button type="button" class="cb-states" onclick="openCombatStatesSheet()">';
  visibles.forEach(function (st) {
    var icon = (st.suppressed && st.def.iconSuppressed) ? st.def.iconSuppressed : st.def.icon;
    h += '<span class="cb-state ' + familyClass(st.def.famille) + (st.suppressed ? " is-suppressed" : "") + '">';
    h += renderIconOrEmojiHTML(icon, "", st.def.nom);
    if (st.n) h += '<span class="cb-state-n">' + st.n + '</span>';
    h += '</span>';
  });
  if (reste > 0) h += '<span class="cb-states-more">+' + reste + '</span>';
  h += '</button>';
  return h;
}
window.buildCombatStatesHTML = buildCombatStatesHTML;

/* Feuille d'explication : le remplacement du title, qui n'existait pas sur mobile.
   Elle dit ce que l'état FAIT et ce qu'on peut FAIRE — ce second point manquait partout. */
function buildCombatStatesSheetHTML() {
  var states = getActiveCombatStates();
  var familles = window.COMBAT_STATE_FAMILIES || [];
  var h = '<div class="ksheet-backdrop" onclick="closeCombatStatesSheet()"></div>';
  h += '<div class="ksheet"><div class="ksheet-handle"></div>';
  h += '<div class="ksheet-title"><span>\u00c9tats du combat</span></div>';
  h += '<div class="st-sheet-sub">Ce qui p\u00e8se sur ce combat, et quoi en faire.</div>';
  h += '<div class="ksheet-body">';

  var vide = true;
  familles.forEach(function (fam) {
    var ids = states.filter(function (st) { return st.def.famille === fam.id; });
    if (!ids.length) return;
    vide = false;
    h += '<div class="st-group-title">' + esc(fam.titre) + '</div>';
    ids.forEach(function (st) {
      var desc = (st.suppressed && st.def.descSuppressed) ? st.def.descSuppressed : st.def.desc;
      h += '<div class="st-row' + (fam.id === "alerte" ? " is-alert" : "") + '">';
      h += renderIconOrEmojiHTML((st.suppressed && st.def.iconSuppressed) ? st.def.iconSuppressed : st.def.icon, "st-row-ico", st.def.nom);
      h += '<div class="st-row-body"><div class="st-row-name">' + esc(st.def.nom) + '</div>';
      h += '<div class="st-row-desc">' + esc(desc) + '</div>';
      if (st.def.hint && !st.suppressed) h += '<div class="st-row-hint">' + esc(st.def.hint) + '</div>';
      h += '</div>';
      if (st.n) h += '<div class="st-row-n">' + st.n + (fam.id === "mine" || fam.id === "onme" ? " rd" : "") + '</div>';
      h += '</div>';
    });
  });
  if (vide) h += '<div class="st-empty">Rien de particulier pour l\u2019instant.</div>';

  h += '</div>';
  h += '<button type="button" class="ksheet-close" onclick="closeCombatStatesSheet()">Fermer</button>';
  h += '</div>';
  return h;
}
window.buildCombatStatesSheetHTML = buildCombatStatesSheetHTML;

function openCombatStatesSheet() {
  var host = document.getElementById("combat-states-modal-root");
  if (host) host.innerHTML = buildCombatStatesSheetHTML();
}
function closeCombatStatesSheet() {
  var host = document.getElementById("combat-states-modal-root");
  if (host) host.innerHTML = "";
}
window.openCombatStatesSheet = openCombatStatesSheet;
window.closeCombatStatesSheet = closeCombatStatesSheet;

function renderEnemyStatusBar() {
  var alertHost = document.getElementById("combat-alert-bar");
  if (alertHost) alertHost.innerHTML = buildCombatAlertHTML();
  var statesHost = document.getElementById("enemy-status-bar");
  if (statesHost) statesHost.innerHTML = buildCombatStatesHTML();
  // La feuille ouverte suit l'évolution du combat plutôt que d'afficher un état périmé.
  var sheetHost = document.getElementById("combat-states-modal-root");
  if (sheetHost && sheetHost.innerHTML) sheetHost.innerHTML = buildCombatStatesSheetHTML();
}

/* Alias historique : plusieurs systèmes appellent encore buildEnemyStatusBarHTML(). */
function buildEnemyStatusBarHTML() { return buildCombatStatesHTML(); }

window.buildEnemyStatusBarHTML = buildEnemyStatusBarHTML;
window.renderEnemyStatusBar = renderEnemyStatusBar;

/* Barre de round : n° du round, mode Tactique/Grimoire (bascule si le Grimoire est débloqué), Continuer l'attaque, jauge de célérité. */
function buildCombatControlsHTML() {
  if (!window.CombatEngine || typeof CombatEngine.ensureState !== "function") return "";
  CombatEngine.ensureState();
  var round = game.combatRound;
  var mode = game.combatMode;
  var grimoireUnlocked = (typeof isTabUnlocked === "function") ? isTabUnlocked("grimoire") : true;
  var gaugeMax = (typeof CELERITY_GAUGE_MAX === "number") ? CELERITY_GAUGE_MAX : 100;
  var gaugePct = Math.max(0, Math.min(100, Math.round((Number(game.heroGauge || 0) / gaugeMax) * 100)));
  var downed = (game.heroHp || 0) <= 0;

  /* v3.273.0 (retour Seb) : le compteur de rounds est retiré de la rangée — il ne sert à
     aucune décision, ce sont les télégraphes qui annoncent ce qui arrive au round suivant.
     Il reste au Rapport de combat, où le nombre de rounds a du sens a posteriori. */
  var h = "";

  if (grimoireUnlocked) {
    h += '<button type="button" class="combat-mode-btn' + (mode === "grimoire" ? ' is-auto' : '') + '" onclick="CombatEngine.setCombatMode(\'' + (mode === "grimoire" ? "tactique" : "grimoire") + '\')" title="'
      + (mode === "grimoire" ? "Mode Grimoire : les rounds s\u2019enchaînent, le Grimoire choisit. Toucher pour repasser en Tactique." : "Mode Tactique : chaque round attend ton choix. Toucher pour laisser le Grimoire jouer.") + '">';
    h += (mode === "grimoire" ? "<img class=ico-inline src=images/Icons/codex/codex_lore.png> Grimoire" : "<img class=ico-inline src=images/Icons/combat_stats/stat_critical.png> Tactique");
    h += '</button>';
  }

  if (mode !== "grimoire") {
    h += '<button type="button" class="combat-continue-btn' + (round.continueAttack ? ' is-active' : '') + '"' + (downed ? ' disabled' : '')
      + ' onclick="CombatEngine.toggleContinueAttack()" title="Répète l\u2019Attaque jusqu\u2019au prochain événement (PV < 50 %, télégraphe, double frappe, nouvel ennemi)">';
    h += round.continueAttack ? "<img class=ico-inline src=images/Icons/system/pause_stop.png> Stop" : "<img class=ico-inline src=images/Icons/quests/continue.png> Continuer";
    h += '</button>';
  }
  return h;
}

/* v3.241.0 : jauge de célérité — dans le panneau héros, sous la ressource de classe. */
function buildCombatCelerityHTML() {
  var gaugeMax = (typeof CELERITY_GAUGE_MAX === "number") ? CELERITY_GAUGE_MAX : 100;
  var gaugePct = Math.max(0, Math.min(100, Math.round((Number(game.heroGauge || 0) / gaugeMax) * 100)));
  var h = '<div class="combat-gauge kgauge kgauge-thin" title="Jauge de célérité : à 100 %, une frappe bonus suit ta prochaine attaque">';
  h += '<div class="kgauge-track"><div class="kgauge-fill" style="width:' + gaugePct + '%"></div></div>';
  h += '<span class="kgauge-text"><img class=ico-inline src=images/Icons/combat_stats/stat_speed.png> Célérité ' + gaugePct + ' %</span>';
  h += '</div>';
  return h;
}
window.buildCombatCelerityHTML = buildCombatCelerityHTML;

/* Rangée de sortie (v3.102.1) : butin en cours + Rentrer (exploration) ou Fuir (mission, 50 % du butin). */
function buildCombatSortieHTML() {
  if (!window.SortieManager) return "";
  var s = SortieManager.ensure();
  var downed = (game.heroHp || 0) <= 0;
  var h = "";
  /* v3.273.0 (retour Seb) : le butin devient un BOUTON qui ouvre la feuille de sortie ;
     les potions restantes y entrent aussi — c'est une information de sortie, pas de round,
     et elle encombrait la rangée de commandes. */
  if (s.active) {
    var loot = s.loot || {};
    var objets = (loot.items && loot.items.length) || 0;
    h += '<button type="button" class="combat-loot-pill" onclick="openSortieSheet()"'
      + ' title="Butin de la sortie — banqué au retour, perdu si tu tombes">'
      + '<img class=ico-inline src=images/Icons/gold_icon.png> ' + formatNumber(Math.floor(loot.gold || 0))
      + (objets ? ' · ' + objets + ' objet' + (objets > 1 ? 's' : '') : '')
      + '</button>';
  }
  if (s.active && SortieManager.isMission()) {
    h += '<button type="button" class="combat-sortie-btn is-flee"' + (downed ? ' disabled' : '') + ' onclick="confirmFlee()" title="Fuir : la mission n\u2019est pas validée, tu rapportes 50 % du butin"><img class=ico-inline src=images/Icons/quests/flee.png> Fuir</button>';
  } else {
    h += '<button type="button" class="combat-sortie-btn"' + (downed ? ' disabled' : '') + ' onclick="SortieManager.returnToCamp()" title="Rentrer au Campement avec tout le butin"><img class=ico-inline src=images/Icons/plots/hunting_blind.png> Rentrer</button>';
  }
  return h;
}

/* Feuille de sortie : butin détaillé + potions restantes. Elle réutilise la feuille basse
   .ksheet du jeu, comme celle des états de combat. */
/* v3.276.0 (bug Seb) : la feuille du butin s'ouvrait dans #combat-states-modal-root, que
   renderEnemyStatusBar réécrit à chaque rafraîchissement avec la feuille des ÉTATS de
   combat — on tombait donc sur les actions des ennemis au lieu du sac. Racine dédiée. */
function openSortieSheet() {
  if (!window.SortieManager) return;
  var root = document.getElementById("combat-sortie-sheet-root");
  if (!root) return;
  var s = SortieManager.ensure();
  var loot = s.loot || {};

  var h = '<div class="ksheet-backdrop" onclick="closeSortieSheet()"></div>';
  h += '<div class="ksheet"><div class="ksheet-title"><img src="images/Icons/subtabs/inventory.png" alt=""><span>Sortie en cours</span></div>';
  h += '<div class="ksheet-body">';

  h += '<div class="cbs-sub">Butin ramassé</div>';
  var lignes = "";
  if (Number(loot.gold || 0) > 0) lignes += buildSortieLineHTML("images/Icons/gold_icon.png", "Or", formatNumber(Math.floor(loot.gold)));
  if (Number(loot.essence || 0) > 0) lignes += buildSortieLineHTML("images/Icons/essence_icon.png", "Essence", formatNumber(Math.floor(loot.essence)));
  Object.keys(loot.resources || {}).forEach(function (k) {
    var q = Math.floor(loot.resources[k]);
    if (q <= 0) return;
    var def = (window.WAREHOUSE_RESOURCES && WAREHOUSE_RESOURCES[k]) || null;
    lignes += buildSortieLineHTML((def && def.icon) || "images/Icons/subtabs/inventory.png", (def && def.name) || k, "×" + q);
  });
  (loot.items || []).forEach(function (it) {
    lignes += buildSortieLineHTML("images/Icons/subtabs/equipment.png", it.name || "Objet", it.rarity || "");
  });
  h += lignes || '<div class="cbs-empty">Rien pour l\'instant.</div>';

  h += '<div class="cbs-sub">Potions de cette sortie</div>';
  h += buildSortieLineHTML("images/Icons/subtabs/potions.png", "Il t'en reste",
    SortieManager.getPotionsLeft() + " sur " + (typeof SORTIE_POTION_CAP === "number" ? SORTIE_POTION_CAP : "?"));

  h += '</div><button type="button" class="ksheet-close" onclick="closeSortieSheet()">Fermer</button></div>';
  root.innerHTML = h;
}

function buildSortieLineHTML(icon, nom, valeur) {
  return '<div class="cbs-line"><img src="' + esc(icon) + '" alt=""><span>' + esc(nom) + '</span><b>' + esc(String(valeur)) + '</b></div>';
}

function closeSortieSheet() {
  var root = document.getElementById("combat-sortie-sheet-root");
  if (root) root.innerHTML = "";
}

window.openSortieSheet = openSortieSheet;
window.closeSortieSheet = closeSortieSheet;

function confirmFlee() {
  if (!window.SortieManager || !SortieManager.isActive()) return;
  if (confirm("Fuir ? La mission ne sera pas validée et tu ne rapporteras que 50 % du butin de la sortie.")) SortieManager.flee();
}
window.buildCombatSortieHTML = buildCombatSortieHTML;
window.confirmFlee = confirmFlee;

function renderCombatControls() {
  var host = document.getElementById("combat-controls-root");
  if (host) host.innerHTML = buildCombatControlsHTML();
  /* v3.275.0 : la célérité vit désormais dans la jauge de ressource (voile translucide,
     buildClassResourceBarHTML). Son conteneur reste vide plutôt que d'être supprimé —
     d'autres vues le cherchent encore. */
  var celHost = document.getElementById("combat-celerity-root");
  if (celHost) celHost.innerHTML = "";
  if (typeof renderClassResourceBar === "function") renderClassResourceBar();
  var sortieHost = document.getElementById("combat-sortie-root");
  if (sortieHost) sortieHost.innerHTML = buildCombatSortieHTML();
  /* v3.275.0 : les vitesses apparaissent et disparaissent avec le mode — il faut donc
     les redessiner ici, à chaque bascule, et plus seulement au changement d'onglet. */
  if (typeof renderCombatSpeedBar === "function") renderCombatSpeedBar();
  var attackBtn = document.getElementById("combat-attack-btn");
  if (attackBtn) {
    var locked = game.combatMode === "grimoire" || !!(game.combatRound && game.combatRound.continueAttack) || (game.heroHp || 0) <= 0;
    attackBtn.classList.toggle("auto-mode", locked);
    attackBtn.disabled = locked;
  }
}

window.buildCombatControlsHTML = buildCombatControlsHTML;
window.renderCombatControls = renderCombatControls;

/* v3.106.0 : progression "X/Y" de la mission de combat en cours (aventure/chasse/donjon), affichée en tête de l'écran Combat. */
function getCombatMissionProgressLabel() {
  if (window.AdventureQuestManager && game.adventureQuestRun && game.adventureQuestRun.active) {
    var aq = AdventureQuestManager.getRunningQuest();
    if (aq) {
      var step = aq.steps[0];
      if (step && step.type === "kill") {
        return aq.name + " · " + AdventureQuestManager.getStepProgress(aq, step) + "/" + step.target;
      }
    }
  }
  if (window.HuntQuestManager && game.huntRun && game.huntRun.active) {
    var hq = HUNT_QUESTS[game.huntRun.questId];
    if (hq) return hq.name + " · " + Math.min(hq.lotSize, Number(game.huntRun.killsInLot || 0)) + "/" + hq.lotSize;
  }
  if (window.DungeonManager && game.dungeonRun && game.dungeonRun.active) {
    var waveCount = (typeof DUNGEON_CONFIG !== "undefined") ? DUNGEON_CONFIG.waveCount : 0;
    var wave = Math.min(waveCount, Number(game.dungeonRun.wave || 0));
    return "Donjon · Vague " + wave + "/" + waveCount;
  }
  // v3.256.0 (Cartes Vivantes, C-2) : combat d'élite d'un secteur.
  if (window.LivingMapManager && game.livingMaps && game.livingMaps.fight) {
    var f = game.livingMaps.fight;
    var sec = LivingMapManager.getSectorDef(f.mapId, f.sectorId);
    var wins = LivingMapManager.getDailyWins(f.mapId, f.sectorId);
    return (sec ? sec.name : "Carte") + " · Élite" + (LivingMapManager.isRepeatable(f.mapId, f.sectorId) ? " · " + (wins + 1) + (wins === 0 ? "er" : "e") + " du jour" : "");
  }
  // v3.107.1 : étape Histoire en farm libre avec killTarget déclaratif (ex. forest_02 « Premier sang »).
  if (window.StoryQuestManager) {
    var storyStep = StoryQuestManager.getCurrentStep("forest");
    if (storyStep && storyStep.killTarget && StoryQuestManager.isCurrentStepAccepted("forest")) {
      var kt = storyStep.killTarget;
      var count = Math.min(kt.target, kt.counter(game));
      return kt.label + " · " + count + "/" + kt.target;
    }
  }
  return "";
}

function renderCombatMissionProgress() {
  var host = document.getElementById("combat-mission-progress");
  if (!host) return;
  var label = getCombatMissionProgressLabel();
  host.textContent = label;
  host.style.display = label ? "" : "none";
}
window.getCombatMissionProgressLabel = getCombatMissionProgressLabel;
window.renderCombatMissionProgress = renderCombatMissionProgress;

function renderEnemy() {
  if (!game.enemy) return;

  renderCombatMissionProgress();

  var emoji = document.getElementById("enemy-emoji");
  var name = document.getElementById("enemy-name");
  // v3.205.0 (E5) : une élite n'est ni dans ENEMY_DB ni dans BOSS_DB — elle porte
  // son portrait (celui de sa base) directement sur l'objet ennemi.
  var db = game.enemy.isBoss ? BOSS_DB : ENEMY_DB;
  var enemyData = (window.ELITE_DB && ELITE_DB[game.enemy.id]) ? {} : (db[game.enemy.id] || {});
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

  // v3.205.0 (E5) : une élite est isBoss, mais s'annonce comme élite.
  var suffix = game.enemy.isElite ? " [ÉLITE]" : (game.enemy.isBoss ? " [BOSS]" : "");
  if (name) name.textContent = game.enemy.name + suffix;

  // v3.172.0 : cadre de jauge selon le type d'ennemi (kit) — le cadre élite
  // rejoindra ce choix quand les quêtes Élite seront implémentées.
  var hpWrap = document.getElementById("enemy-hp-bar-wrapper");
  if (hpWrap) {
    // v3.205.0 (E5) : le cadre élite entre enfin en service (asset posé en v3.172.0).
    var isElite = !!game.enemy.isElite;
    hpWrap.classList.toggle("kgauge-elite", isElite);
    hpWrap.classList.toggle("kgauge-boss", !isElite && !!game.enemy.isBoss);
    hpWrap.classList.toggle("kgauge-dragon-claw", !isElite && !game.enemy.isBoss);
  }

  renderEnemyStatusBar();
  renderEnemyHp();
  if (typeof renderEnemyRow === "function") renderEnemyRow();
  if (typeof renderAllyRow === "function") renderAllyRow();
  if (typeof renderActorBand === "function") renderActorBand();
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
  renderEnemyStatusBar();
  if (typeof renderEnemyRow === "function") renderEnemyRow();   // v3.269.0 : PV des autres membres
  if (typeof renderAllyRow === "function") renderAllyRow();
}

window.renderEnemy = renderEnemy;
window.renderEnemyHp = renderEnemyHp;
window.buildCombatHTML = buildCombatHTML;
window.mountCombatArea = mountCombatArea;
window.buildHealButtonHTML = buildHealButtonHTML;
window.renderHealButtons = renderHealButtons;

function initHealKeyboardShortcuts() {
  document.addEventListener("keydown", function (e) {
    var active = document.activeElement;
    var tag = active ? active.tagName : "";
    if (tag === "INPUT" || tag === "TEXTAREA" || (active && active.isContentEditable)) return;

    if (game.activeTab !== "combat" || !window.CombatEngine) return;

    if (e.key === " " || e.key === "Enter" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      CombatEngine.heroAction("basic");
      return;
    }

    var classSlotByKey = { "1": "skill1", "2": "skill2", "3": "skill3", "4": "defense" };
    if (classSlotByKey[e.key]) {
      CombatEngine.heroAction(classSlotByKey[e.key]);
      return;
    }

    if (typeof HEALING_POTIONS_DB === "undefined") return;
    var index = -1;
    if (e.key === "5") index = 0;
    else if (e.key === "6") index = 1;
    if (index === -1) return;

    var potion = HEALING_POTIONS_DB[index];
    if (potion) CombatEngine.heroAction("potion", potion.id);
  });
}

window.initHealKeyboardShortcuts = initHealKeyboardShortcuts;

var CLASS_SKILL_SLOTS = ["skill1", "skill2", "skill3", "defense"];
var CLASS_SKILL_KEY_LABELS = { skill1: "1", skill2: "2", skill3: "3", defense: "4" };

function buildClassSkillButtonHTML(slot, suggestedSlot) {
  if (!window.ClassCombatManager || typeof ClassCombatManager.getAction !== "function") return "";
  var action = ClassCombatManager.getAction(slot);
  if (!action) return "";

  var resourceState = (typeof ClassCombatManager.ensureForCurrentClass === "function")
    ? ClassCombatManager.ensureForCurrentClass()
    : null;
  var cooldownRemaining = (game.classCooldowns && typeof game.classCooldowns[action.id] === "number")
    ? game.classCooldowns[action.id]
    : 0;
  var onCooldown = cooldownRemaining > 0;
  var cooldownPct = onCooldown && action.cooldownRounds > 0 ? Math.round((cooldownRemaining / action.cooldownRounds) * 100) : 0;

  var affordable = !resourceState || resourceState.current >= (action.resourceCost || 0);
  var autoModeActive = game.combatMode === "grimoire" || !!(game.combatRound && game.combatRound.continueAttack);
  var isSilenced = Number(game.silencedRounds || 0) > 0 && action.slot !== "defense";
  var conditionOk = (typeof checkActionConditions !== "function") || checkActionConditions(action.conditions, {
    enemyHp: game.enemy ? game.enemy.hp : null, enemyMaxHp: game.enemy ? game.enemy.maxHp : null
  });
  var disabled = onCooldown || !affordable || autoModeActive || isSilenced || !conditionOk || (game.heroHp || 0) <= 0;
  var isSuggested = !autoModeActive && !disabled && suggestedSlot === slot;

  var activeDefense = (action.type === "defense" && window.ClassCombatManager && typeof ClassCombatManager.getActiveDefenseEffect === "function")
    ? ClassCombatManager.getActiveDefenseEffect()
    : null;
  var isActiveNow = !!(activeDefense && activeDefense.actionId === action.id);

  var icon = (typeof CLASS_ACTION_ICON_FALLBACK !== "undefined" && CLASS_ACTION_ICON_FALLBACK[action.id]) || (action.type === "defense" ? "images/Icons/combat_stats/stat_defense.png" : "images/Icons/scene/node_discovery.png");
  var keyLabel = CLASS_SKILL_KEY_LABELS[action.slot] || "";

  var title = autoModeActive
    ? "Combat automatique actif (mode Grimoire / Continuer)"
    : (isSilenced ? "Silencié : cette technique est bloquée un instant"
      : (!conditionOk ? "Condition non remplie : " + esc(action.description)
        : esc(action.description) + (action.cooldownRounds ? " Recharge : " + action.cooldownRounds + " round(s)." : "") + (keyLabel ? " (touche " + keyLabel + " sur PC)" : "")));

  var h = '<button class="combat-action-btn class-skill-btn' + (action.type === "defense" ? " defense-action-btn" : " attack-action-btn")
    + (onCooldown ? ' on-cooldown' : '') + (isActiveNow ? ' is-active' : '') + (!affordable && !onCooldown ? ' not-affordable' : '')
    + (autoModeActive ? ' auto-mode' : '') + (isSilenced ? ' is-silenced' : '') + (isSuggested ? ' is-suggested' : '') + '" type="button" '
    + (disabled ? 'disabled' : '')
    + ' onclick="CombatEngine.heroAction(\'' + esc(slot) + '\')" title="' + title + '">';
  h += '<span class="combat-action-key">' + esc(keyLabel) + '</span>';
  h += renderIconOrEmojiHTML(icon, "combat-action-icon", action.label);
  if (onCooldown) {
    h += '<span class="combat-action-cooldown">' + cooldownRemaining + 'r</span>';
    h += '<span class="combat-action-cooldown-fill" style="width:' + cooldownPct + '%"></span>';
  } else if (isActiveNow) {
    h += '<span class="combat-action-active-tag">ACTIF</span>';
  } else if (isSuggested) {
    h += '<span class="combat-action-suggest-tag"><img class=ico-inline src=images/Icons/codex/codex_lore.png></span>';
  }
  h += '</button>';
  return h;
}

function buildClassSkillButtonsHTML() {
  if (!window.ClassCombatManager) return "";
  // v3.102.0 : en Tactique, le Grimoire suggère l'action qu'il aurait jouée (bouton surligné)
  var suggested = (game.combatMode !== "grimoire" && window.CombatEngine && typeof CombatEngine.suggestAction === "function")
    ? CombatEngine.suggestAction()
    : null;
  var h = "";
  CLASS_SKILL_SLOTS.forEach(function (slot) {
    h += buildClassSkillButtonHTML(slot, suggested);
  });
  return h;
}

function renderClassSkillButtons() {
  var host = document.getElementById("class-skills-root");
  /* v3.270.0 (L-4) : si un compagnon en Manuel est l'acteur sélectionné, ce sont SES
     actions qui occupent la rangée. Le héros reprend la place dès qu'il est resélectionné
     ou que le round est joué. */
  if (host && window.CombatEngine && typeof CombatEngine.hasManualAllies === "function" && CombatEngine.hasManualAllies()) {
    var acteur = CombatEngine.selectedActor();
    if (acteur && acteur.companionId && typeof buildCompanionActionsHTML === "function") {
      host.innerHTML = buildCompanionActionsHTML(acteur);
      host.classList.add("is-companion");   // voir css/03-combat-group.css : sort de la grille à 4 colonnes
      renderClassResourceBar();
      return;
    }
  }
  if (host) host.classList.remove("is-companion");
  if (host) host.innerHTML = buildClassSkillButtonsHTML();
  renderClassResourceBar();
  if (typeof renderCombatControls === "function") renderCombatControls();
}

window.buildClassSkillButtonsHTML = buildClassSkillButtonsHTML;
window.renderClassSkillButtons = renderClassSkillButtons;

function buildClassResourceBarHTML() {
  if (!window.ClassCombatManager || typeof ClassCombatManager.ensureForCurrentClass !== "function") return "";
  var state = ClassCombatManager.ensureForCurrentClass();
  if (!state || !state.max) return "";

  var pct = Math.max(0, Math.min(100, Math.round((state.current / state.max) * 100)));
  var classId = typeof ClassCombatManager.getCurrentClassId === "function" ? ClassCombatManager.getCurrentClassId() : null;
  var resourceDef = (classId && typeof getClassResource === "function") ? getClassResource(classId) : null;
  var label = resourceDef ? resourceDef.label : "";

  // v3.172.0 : ressource de classe sur la jauge fine du kit — kgauge-rage/
  // kgauge-focus/kgauge-mana (00-kgauge.css) correspondent exactement aux
  // resourceId des 3 classes. .class-resource-bar garde le positionnement.
  /* v3.275.0 (retour Seb) : la célérité n'a plus sa propre jauge — elle se superpose à
     celle de la ressource de classe, en voile translucide. Une seule ligne au lieu de
     deux, et le remplissage reste lisible parce que les deux couleurs ne se mélangent
     jamais : la ressource peint le fond, la célérité pose un film par-dessus. */
  var gaugeMaxCel = (typeof CELERITY_GAUGE_MAX === "number") ? CELERITY_GAUGE_MAX : 100;
  var celPct = Math.max(0, Math.min(100, Math.round((Number(game.heroGauge || 0) / gaugeMaxCel) * 100)));

  var h = '<div class="class-resource-bar class-resource-' + esc(state.resourceId || "") + '">';
  h +=   '<div class="class-resource-track kgauge kgauge-thin kgauge-' + esc(state.resourceId || "rage") + '">';
  h +=     '<div class="kgauge-track"><div class="kgauge-fill" style="width:' + pct + '%"></div>'
    +        '<div class="kgauge-cel" style="width:' + celPct + '%" title="Célérité ' + celPct + ' %"></div></div>';
  h +=     '<span class="kgauge-text">' + esc(label) + ' — ' + Math.floor(state.current) + ' / ' + state.max
    +        ' <span class="kgauge-cel-tag">· ' + celPct + ' %</span></span>';
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