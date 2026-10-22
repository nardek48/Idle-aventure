"use strict";
/* ui/combat-view.js — services de l'écran Combat. Depuis v3.459.7 (audit O13), l'écran lui-même vit dans
   ui/combat-screen-view.js ; restent ici la barre des préparatifs, les feuilles de sortie et des états,
   la progression de mission, la fuite, les raccourcis clavier et setHtmlIfChanged. */

/* v3.320.0 (bug Seb) : ce que le joueur a PRÉPARÉ pour le run — potions armées et Marques
   du donjon. Source unique de la barre du haut ET de la section « Pour ce run » de la feuille. */
function getRunPreparations() {
  var out = [];
  if (typeof POTIONS_DB !== "undefined" && window.PotionManager) {
    var live = typeof PotionManager.isEffectLive === "function" && PotionManager.isEffectLive();
    POTIONS_DB.forEach(function (potion) {
      if (!potion.perRun || !PotionManager.isArmed(potion.id)) return; // Élixir d'Aether : hors runs
      out.push({ kind: "potion", icon: potion.icon, name: potion.name, desc: potion.desc, live: live });
    });
  }
  if (window.AfflictionManager && typeof AfflictionManager.getActiveList === "function") {
    AfflictionManager.getActiveList().forEach(function (m) {
      out.push({ kind: "mark", icon: m.icon, name: m.name, desc: m.desc, live: true });
    });
  }
  return out;
}
window.getRunPreparations = getRunPreparations;

function buildActivePotionsBarHTML() {
  var preps = getRunPreparations();
  if (!preps.length) return "";
  /* Un seul <button> pour toute la barre : le title ne s'affiche jamais sur mobile,
     et un div à onclick ne reçoit pas toujours le tap sur iOS (cf. v3.281.0). */
  var h = '<button type="button" class="active-potions-btn" onclick="openCombatStatesSheet()" aria-label="' + _t("Préparatifs du run") + '">';
  preps.forEach(function (p) {
    if (p.kind === "potion") {
      h += '<span class="active-potion-icon' + (p.live ? '' : ' is-armed-idle') + '">';
      h += '<img src="' + esc(p.icon) + '" alt="">';
      if (p.live) h += '<span class="active-potion-timer"><img class=ico-inline src=images/Icons/combat_stats/stat_attack.webp></span>';
      h += '</span>';
    } else {
      h += '<span class="active-potion-icon active-affliction-icon">';
      h += '<span class="active-affliction-emoji">' + renderIconOrEmojiHTML(p.icon, "active-affliction-img", _td(p.name)) + '</span>';
      h += '</span>';
    }
  });
  h += '</button>';
  return h;
}

function renderActivePotionsBar() {
  var host = document.getElementById("active-potions-bar");
  if (!host) return;
  host.innerHTML = buildActivePotionsBarHTML();
}
window.buildActivePotionsBarHTML = buildActivePotionsBarHTML;
window.renderActivePotionsBar = renderActivePotionsBar;

/* Feuille des états du combat : construite et ouverte par combat-screen-view.js, fermée ici. */

function closeCombatStatesSheet() {
  var host = document.getElementById("combat-states-modal-root");
  if (host) host.innerHTML = "";
}
window.closeCombatStatesSheet = closeCombatStatesSheet;

/* v3.329.0 (bug « Il approche », Seb) — N'ÉCRIRE QUE SI ÇA A CHANGÉ.
   renderEnemyStatusBar est appelée à CHAQUE image par la boucle (game-loop -> renderEnemyHp).
   Réécrire innerHTML remplaçait le bouton du bandeau 60 fois par seconde :
     - souris : l'appui et le relâcher tombent sur deux boutons différents, pas de click ;
     - iPhone : le doigt reste sur un bouton retiré du document, touchend ne remonte plus
       jusqu'au document, donc ni click natif ni secours de tap (tap-rescue.js) ;
     - en mode mobile du navigateur, le secours clique au relâcher : ça marchait par chance.
   La chaîne produite est gardée sur l'hôte ; on ne réécrit que si elle diffère, ou si le
   contenu a été remplacé par quelqu'un d'autre. On ne compare pas à innerHTML : sa
   sérialisation (guillemets, entités) ne redonne jamais la chaîne d'origine. */
function setHtmlIfChanged(host, html) {
  if (!host) return false;
  if (host.__cbHtml === html && host.__cbFirst === host.firstChild) return false;
  host.innerHTML = html;
  host.__cbHtml = html;
  host.__cbFirst = host.firstChild;
  return true;
}
window.setHtmlIfChanged = setHtmlIfChanged;

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
  h += '<div class="ksheet">';
  h += kSheetHeadHTML({ icon: '<img src="images/Icons/subtabs/inventory.webp" alt="">', title: _t("Sortie en cours"), close: "closeSortieSheet()" });
  h += '<div class="ksheet-body">';

  h += '<div class="cbs-sub">' + _t("Butin ramassé") + '</div>';
  var lignes = "";
  if (Number(loot.gold || 0) > 0) lignes += buildSortieLineHTML("images/Icons/gold_icon.webp", _t("Or"), formatNumber(Math.floor(loot.gold)));
  Object.keys(loot.resources || {}).forEach(function (k) {
    var q = Math.floor(loot.resources[k]);
    if (q <= 0) return;
    var def = (window.WAREHOUSE_RESOURCES && WAREHOUSE_RESOURCES[k]) || null;
    lignes += buildSortieLineHTML((def && def.icon) || "images/Icons/subtabs/inventory.webp", (def && def.name) ? _td(def.name) : k, "×" + q);
  });
  (loot.items || []).forEach(function (it) {
    lignes += buildSortieLineHTML("images/Icons/subtabs/equipment.webp", it.name ? _td(it.name) : _t("Objet"), it.rarity || "");
  });
  h += lignes || '<div class="cbs-empty">' + _t("Rien pour l'instant.") + '</div>';

  h += '<div class="cbs-sub">' + _t("Potions de cette sortie") + '</div>';
  h += buildSortieLineHTML("images/Icons/subtabs/potions.webp", _t("Il t'en reste"),
    _t("{a} sur {b}", { a: SortieManager.getPotionsLeft(), b: (typeof getSortiePotionCap === "function" ? getSortiePotionCap() : "?") }));

  h += '</div></div>';
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
  if (confirm(_t("Fuir ? La mission ne sera pas validée et tu ne rapporteras que {n} % du butin de la sortie.", { n: Math.round(100 * SortieManager.fleeKeepPct()) }))) SortieManager.flee();
}
window.confirmFlee = confirmFlee;

/* v3.106.0 : progression "X/Y" de la mission de combat en cours (aventure/chasse/donjon), affichée en tête de l'écran Combat. */
function getCombatMissionProgressLabel() {
  if (window.AdventureQuestManager && game.adventureQuestRun && game.adventureQuestRun.active) {
    var aq = AdventureQuestManager.getRunningQuest();
    if (aq) {
      var step = aq.steps[0];
      if (step && (step.type === "kill" || step.type === "encounter")) { // v3.311.0 : rencontres scriptées
        return _td(aq.name) + " · " + AdventureQuestManager.getStepProgress(aq, step) + "/" + step.target;
      }
    }
  }
  if (window.HuntQuestManager && game.huntRun && game.huntRun.active) {
    var hq = HUNT_QUESTS[game.huntRun.questId];
    if (hq) return _td(hq.name) + " · "+ Math.min(hq.lotSize, Number(game.huntRun.killsInLot || 0)) + "/" + hq.lotSize;
  }
  if (window.DungeonManager && game.dungeonRun && game.dungeonRun.active) {
    var waveCount = (typeof DUNGEON_CONFIG !== "undefined") ? DUNGEON_CONFIG.waveCount : 0;
    var wave = Math.min(waveCount, Number(game.dungeonRun.wave || 0));
    return _t("Donjon · Vague {a}/{b}", { a: wave, b: waveCount });
  }
  // v3.256.0 (Cartes Vivantes, C-2) : combat d'élite d'un secteur.
  if (window.LivingMapManager && game.livingMaps && game.livingMaps.fight) {
    var f = game.livingMaps.fight;
    var sec = LivingMapManager.getSectorDef(f.mapId, f.sectorId);
    var wins = LivingMapManager.getDailyWins(f.mapId, f.sectorId);
    return (sec ? _td(sec.name) : _t("Carte")) + " · " + _t("Élite") + (LivingMapManager.isRepeatable(f.mapId, f.sectorId) ? " · " + (wins === 0 ? _t("1er du jour") : _t("{n}e du jour", { n: wins + 1 })) : "");
  }
  // v3.107.1 : étape Histoire en farm libre avec killTarget déclaratif (ex. forest_02 « Premier sang »).
  // v3.297.0 (W-1a) : tout chapitre actif, plus seulement la Forêt
  if (window.StoryQuestManager && typeof StoryQuestManager.activeChapterIds === "function") {
    var chapters = StoryQuestManager.activeChapterIds();
    for (var ci = 0; ci < chapters.length; ci++) {
      var storyStep = StoryQuestManager.getCurrentStep(chapters[ci]);
      if (storyStep && storyStep.killTarget && StoryQuestManager.isCurrentStepAccepted(chapters[ci])) {
        var kt = storyStep.killTarget;
        var count = Math.min(kt.target, kt.counter(game));
        return _td(kt.label) + " · " + count + "/" + kt.target;
      }
    }
  }
  return "";
}

window.getCombatMissionProgressLabel = getCombatMissionProgressLabel;

/* v3.422.0 : garde-fous de la v3.287.0 remis (perdus en route, harnais [85]).
   Une feuille, une fenêtre ou une modale ouverte : le clavier ne joue pas le combat derrière. */
var COMBAT_SHEET_SELECTOR = ".ksheet, .ksheet-backdrop, .kwin-veil, .full-menu-overlay, .modal-overlay";
function isCombatSheetOpen() {
  if (typeof document === "undefined" || !document.querySelectorAll) return false;
  // Les modales fixes d'index.html (#offline-modal, #confirm-modal...) restent dans le
  // document, masquées : seule une feuille réellement affichée compte.
  var list = document.querySelectorAll(COMBAT_SHEET_SELECTOR);
  for (var i = 0; i < list.length; i++) {
    if (list[i].getClientRects && list[i].getClientRects().length > 0) return true;
  }
  return false;
}
window.isCombatSheetOpen = isCombatSheetOpen;

function initHealKeyboardShortcuts() {
  document.addEventListener("keydown", function (e) {
    var active = document.activeElement;
    var tag = active ? active.tagName : "";
    if (tag === "INPUT" || tag === "TEXTAREA" || (active && active.isContentEditable)) return;

    if (game.activeTab !== "combat" || !window.CombatEngine) return;
    if (isCombatSheetOpen()) return;
    // Une touche maintenue ne se répète pas : un appui, une action.
    if (e.repeat) { if (e.key === " ") e.preventDefault(); return; }

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

