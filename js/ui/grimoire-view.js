"use strict";
/* ui/grimoire-view.js — écran Grimoire : 6 règles conditionnelles {Si condition -> Alors action},
   déblocage par jalon de monde, presets nommés (v3.65).
   v3.210.0 — REFONTE VISUELLE (atelier Seb). L'écran mesurait 3 462 px à 390 px de large, dont
   1 429 px de préambule avant la première règle : chaque règle affichait en permanence tout ce
   qu'il faut pour la MODIFIER (deux libellés, deux listes, deux descriptions, un badge d'état).
   Désormais deux niveaux :
     - LISTE  : une ligne par règle, « Si X -> Y », lisible d'un coup d'œil (~560 px au total) ;
     - FICHE  : ouverte au toucher, deux listes déroulantes natives et le verdict d'appariement.
   Retirés sur décision Seb : le Mode Expert (game.expertModeEnabled reste en sauvegarde, inerte)
   et les badges d'état de règle (prête / en attente / ressource insuffisante) — cette information
   n'a de sens qu'en combat, et le Rapport de combat la couvre déjà a posteriori.
   Détail complet : COMMENTAIRES_ORIGINAUX.md */

/* État d'écran volontairement NON persisté (aucun nouveau champ dans save-system.js) :
   quelle règle est ouverte et quelle feuille est déployée n'a pas d'intérêt d'une session
   à l'autre. Même parti pris que ui/tutorials-view.js. */
var grimoireEditIndex = null;
var grimoireOpenSheet = null;

var GRIMOIRE_SLOT_COUNT = 6;

function ensureGrimoireRules() {
  if (!Array.isArray(game.grimoireRules)) game.grimoireRules = [];

  while (game.grimoireRules.length < GRIMOIRE_SLOT_COUNT) {
    game.grimoireRules.push({ conditionId: null, actionSlot: null });
  }
  if (game.grimoireRules.length > GRIMOIRE_SLOT_COUNT) {
    game.grimoireRules = game.grimoireRules.slice(0, GRIMOIRE_SLOT_COUNT);
  }
  return game.grimoireRules;
}

var GRIMOIRE_PRESET_MAX_COUNT = 6;

var GRIMOIRE_PRESET_ICON_CHOICES = ["images/Icons/combat_stats/stat_attack.png", "images/Icons/combat_stats/stat_defense.png", "images/Icons/classes/class_ranger.png", "images/Icons/classes/class_mage.png", "images/Icons/dungeon/boss_crown.png", "images/Icons/codex/world_forest.png", "images/Icons/codex/world_desert.png", "images/Icons/codex/world_mountain.png"];

function ensureGrimoirePresets() {
  if (!Array.isArray(game.grimoirePresets)) game.grimoirePresets = [];
  return game.grimoirePresets;
}

var _grimoirePresetIdCounter = 0;
function generateGrimoirePresetId() {
  _grimoirePresetIdCounter++;
  return "preset_" + Date.now() + "_" + _grimoirePresetIdCounter;
}

function saveGrimoirePreset(name, icon) {
  var trimmedName = (typeof name === "string") ? name.trim() : "";
  if (!trimmedName) return;

  var presets = ensureGrimoirePresets();
  if (presets.length >= GRIMOIRE_PRESET_MAX_COUNT) return;

  ensureGrimoireRules();
  var rulesSnapshot = (typeof sanitizeGrimoireRules === "function")
    ? sanitizeGrimoireRules(game.grimoireRules, getGrimoireCurrentKit())
    : game.grimoireRules.slice();

  presets.push({
    id: generateGrimoirePresetId(),
    name: trimmedName.slice(0, 30), // même esprit que maxlength sur le nom du héros (modal-view.js)
    icon: (icon && GRIMOIRE_PRESET_ICON_CHOICES.indexOf(icon) !== -1) ? icon : GRIMOIRE_PRESET_ICON_CHOICES[0],
    rules: rulesSnapshot,
    lastModified: Date.now()
  });

  saveGame();
  if (typeof renderPanel === "function") renderPanel();
}

function loadGrimoirePreset(presetId) {
  // v3.212.0 : charger un preset REMPLACE les 6 règles — c'est une modification,
  // donc soumis au même verrou de sortie que les listes déroulantes.
  if (typeof isGrimoireEditable === "function" && !isGrimoireEditable()) return;
  var presets = ensureGrimoirePresets();
  var preset = presets.filter(function (p) { return p.id === presetId; })[0];
  if (!preset) return;

  game.grimoireRules = (typeof sanitizeGrimoireRules === "function")
    ? sanitizeGrimoireRules(preset.rules, getGrimoireCurrentKit())
    : preset.rules.slice();
  ensureGrimoireRules(); // complète/tronque à GRIMOIRE_SLOT_COUNT si le preset provient d'une version différente

  saveGame();
  if (typeof renderPanel === "function") renderPanel();
}

function confirmLoadGrimoirePreset(presetId) {
  var presets = ensureGrimoirePresets();
  var preset = presets.filter(function (p) { return p.id === presetId; })[0];
  if (!preset) return;

  showConfirmModal(
    "Charger « " + preset.name + " » ?",
    "Les 6 règles actuellement configurées seront remplacées par celles de ce preset. Enregistre ta configuration actuelle comme preset avant de continuer si tu veux la garder.",
    preset.icon || "images/Icons/codex/codex_lore.png",
    function () { loadGrimoirePreset(presetId); }
  );
}

function confirmDeleteGrimoirePreset(presetId) {
  var presets = ensureGrimoirePresets();
  var preset = presets.filter(function (p) { return p.id === presetId; })[0];
  if (!preset) return;

  showConfirmModal(
    "Supprimer « " + preset.name + " » ?",
    "Cette action est irréversible. Le preset sera définitivement supprimé (la config actuellement active n'est pas affectée).",
    "images/Icons/system/trash.png",
    function () {
      game.grimoirePresets = presets.filter(function (p) { return p.id !== presetId; });
      saveGame();
      if (typeof renderPanel === "function") renderPanel();
    }
  );
}

function getSuggestedGrimoirePreset() {
  var presets = ensureGrimoirePresets();
  if (!presets.length) return null;
  if (typeof WORLDS === "undefined" || !window.WorldManager) return null;

  var world = WORLDS[WorldManager.worldIndex];
  if (!world || !world.name) return null;

  var keyword = world.name.split(" ")[0].toLowerCase();
  if (!keyword) return null;

  var match = presets.filter(function (p) {
    return typeof p.name === "string" && p.name.toLowerCase().indexOf(keyword) !== -1;
  })[0];
  return match || null;
}

window.GRIMOIRE_PRESET_MAX_COUNT = GRIMOIRE_PRESET_MAX_COUNT;
window.GRIMOIRE_PRESET_ICON_CHOICES = GRIMOIRE_PRESET_ICON_CHOICES;
window.ensureGrimoirePresets = ensureGrimoirePresets;
window.saveGrimoirePreset = saveGrimoirePreset;
window.loadGrimoirePreset = loadGrimoirePreset;
window.confirmLoadGrimoirePreset = confirmLoadGrimoirePreset;
window.confirmDeleteGrimoirePreset = confirmDeleteGrimoirePreset;
window.getSuggestedGrimoirePreset = getSuggestedGrimoirePreset;

/* v3.212.0 (décision Seb) — le Grimoire est un écran de PRÉPARATION : on règle ses
   tactiques avant de partir, on assume sa configuration une fois dehors.
   Gate = SortieManager.isActive(), le seul marqueur d'activité engagée du jeu :
   `game.enemy` est présent en permanence (un ennemi réapparaît après chaque kill),
   il ne dit donc rien. Une sortie démarre à la première action de combat
   (combat-engine.js) et se termine au retour, à la fuite, à la mort ou au succès.
   LECTURE SEULE plutôt que blocage sec : on peut relire ses règles en pleine sortie,
   on ne peut simplement plus les changer. */
function isGrimoireEditable() {
  if (window.heroLockReason && heroLockReason()) return false; // v3.307.0
  if (!window.SortieManager || typeof SortieManager.isActive !== "function") return true;
  return !SortieManager.isActive();
}
window.isGrimoireEditable = isGrimoireEditable;

function getGrimoireCurrentKit() {
  if (!window.ClassCombatManager || typeof ClassCombatManager.getCurrentClassId !== "function") return null;
  var classId = ClassCombatManager.getCurrentClassId();
  if (!classId || typeof getClassSkills !== "function") return null;
  return getClassSkills(classId);
}

function getGrimoireUnlockWorldLabel(slotIndex) {
  var base = (typeof GRIMOIRE_BASE_SLOT_COUNT === "number") ? GRIMOIRE_BASE_SLOT_COUNT : 2;
  var worldIndexes = (typeof GRIMOIRE_UNLOCK_WORLD_INDEXES !== "undefined") ? GRIMOIRE_UNLOCK_WORLD_INDEXES : [];
  var jalonIndex = slotIndex - base;
  if (jalonIndex < 0 || jalonIndex >= worldIndexes.length) return null;

  var worldIndex = worldIndexes[jalonIndex];
  var world = (typeof WORLDS !== "undefined") ? WORLDS[worldIndex] : null;
  return world ? world.name : null;
}

function buildGrimoireConditionOptionsHTML(selectedId) {
  var h = '<option value="">— Choisir une condition —</option>';
  var order = (typeof GRIMOIRE_CONDITION_ORDER !== "undefined") ? GRIMOIRE_CONDITION_ORDER : Object.keys(GRIMOIRE_CONDITIONS || {});
  order.forEach(function (conditionId) {
    var cond = getGrimoireCondition(conditionId);
    if (!cond) return;
    h += '<option value="' + esc(conditionId) + '"' + (selectedId === conditionId ? ' selected' : '') + '>'
      + esc(cond.label) + '</option>';
  });
  return h;
}

function buildGrimoireActionOptionsHTML(kit, selectedSlot, conditionId) {
  var h = '<option value="">— Choisir une action —</option>';
  if (!kit || !kit.actions) return h;

  GRIMOIRE_ASSIGNABLE_SLOTS.forEach(function (slot) {
    var action = kit.actions[slot];
    if (!action) return;
    // v3.208.0 : le <img class=ico-inline src=images/Icons/combat_stats/stat_speed.png> ne s'allumait que sur action.counters — une action qui contre par
    // suppression d'archétype (Frappe lourde vs corrompu, Brise-garde vs blindé) paraissait
    // neutre dans la liste. getAllGrimoireCounterIds() couvre les deux canaux.
    var isCounter = !!(conditionId && typeof getAllGrimoireCounterIds === "function"
      && getAllGrimoireCounterIds(action).indexOf(conditionId) !== -1);
    // v3.242.2 : le suffixe « — contre … » tenté en v3.242.0 tronquait le libellé dans le
    // champ fermé. L'information passe maintenant par l'icône + la description sous la
    // liste (voir buildGrimoireEditHTML) ; ici on garde le seul marqueur ⚡.
    h += '<option value="' + esc(slot) + '"' + (selectedSlot === slot ? ' selected' : '') + '>'
      + (isCounter ? '\u26a1 ' : '') + esc(action.label) + '</option>';
  });
  return h;
}

/* ============================================================
   LIGNE DE RÈGLE — la liste
   ============================================================ */

/* Libellé court pour la ligne : le label complet d'une condition
   (« L'ennemi prépare une charge ») fait passer la ligne sur trois lignes.
   Défini ici et pas dans data/grimoire-conditions.js parce que c'est un besoin
   d'affichage propre à cet écran, pas une propriété de la condition. */
var GRIMOIRE_CONDITION_SHORT_LABELS = {
  chargeIncoming: "l'ennemi charge",
  shieldIncoming: "l'ennemi se protège",
  healIncoming: "le boss se soigne",
  eliteSurgeIncoming: "l'élite s'exalte",
  heroLowHp: "je suis blessé",
  enemyAttackIncoming: "il frappe 2 fois",
  enemyEnraged: "l'ennemi est enragé",
  enemyCorrupted: "l'ennemi est corrompu",
  enemySilenceIncoming: "il va te silencer",
  enemyVampiric: "l'ennemi est vampirique",
  enemyArmored: "l'ennemi est blindé"
};

function getGrimoireConditionShortLabel(conditionId) {
  var cond = getGrimoireCondition(conditionId);
  if (!cond) return "";
  return GRIMOIRE_CONDITION_SHORT_LABELS[conditionId] || cond.label;
}

/* Une règle contre-t-elle vraiment la situation choisie ? Couvre les DEUX
   canaux (télégraphe + suppression d'archétype), cf. getAllGrimoireCounterIds. */
function isGrimoireRuleCounter(rule, kit) {
  if (!rule || !rule.conditionId || !rule.actionSlot) return false;
  var action = (kit && kit.actions) ? kit.actions[rule.actionSlot] : null;
  if (!action || typeof getAllGrimoireCounterIds !== "function") return false;
  return getAllGrimoireCounterIds(action).indexOf(rule.conditionId) !== -1;
}

function buildGrimoireRuleRowHTML(index, rule, kit, locked) {
  var cond = getGrimoireCondition(rule.conditionId);
  var action = (kit && kit.actions && rule.actionSlot) ? kit.actions[rule.actionSlot] : null;
  var configured = !!(cond && action);

  var cls = "grimoire-rule-row";
  if (locked) cls += " is-locked";
  else if (!configured) cls += " is-empty";

  var h = '<button type="button" class="' + cls + '"'
    + (locked ? ' disabled' : ' onclick="openGrimoireRule(' + index + ')"') + '>';

  // Numéro d'ordre : les règles sont évaluées DANS L'ORDRE, ce que l'ancien
  // écran ne montrait nulle part.
  h += '<span class="grimoire-rule-order">' + (index + 1) + '</span>';
  h += '<span class="grimoire-rule-icon">' + (locked ? '<img class="ico-sys" src="images/Icons/system/lock_closed.png" alt="">' : (cond ? renderIconOrEmojiHTML(cond.icon, "grimoire-rule-ico", cond.label) : '＋')) + '</span>';
  h += '<span class="grimoire-rule-body">';

  if (locked) {
    var worldLabel = getGrimoireUnlockWorldLabel(index);
    h += '<span class="grimoire-rule-text">Emplacement verrouillé</span>';
    h += '<span class="grimoire-rule-sub">'
      + (worldLabel ? 'Atteindre ' + esc(worldLabel) : 'Débloqué plus tard dans ta progression')
      + '</span>';
  } else if (!configured) {
    h += '<span class="grimoire-rule-text">Emplacement libre</span>';
    h += '<span class="grimoire-rule-sub">Toucher pour créer une règle</span>';
  } else {
    h += '<span class="grimoire-rule-text">Si ' + esc(getGrimoireConditionShortLabel(rule.conditionId))
      + ' <span class="grimoire-rule-arrow">→</span> ' + esc(action.label)
      + (isGrimoireRuleCounter(rule, kit) ? '<span class="grimoire-counter-tag"><img class=ico-inline src=images/Icons/combat_stats/stat_speed.png> Contre</span>' : '')
      + '</span>';
  }

  h += '</span>';
  h += '<span class="grimoire-rule-chevron">›</span>';
  h += '</button>';
  return h;
}

/* ============================================================
   FICHE — deux listes déroulantes natives
   ============================================================ */

function buildGrimoireEditHTML(index, kit) {
  ensureGrimoireRules();
  var rule = game.grimoireRules[index];
  if (!rule) return "";

  var cond = getGrimoireCondition(rule.conditionId);
  var action = (kit && kit.actions && rule.actionSlot) ? kit.actions[rule.actionSlot] : null;
  var unlockedCount = (typeof getGrimoireSlotCount === "function") ? getGrimoireSlotCount(game.worldsEverReached) : GRIMOIRE_SLOT_COUNT;

  var h = '<button type="button" class="grimoire-back-btn" onclick="closeGrimoireRule()"><img class=ico-inline src=images/Icons/system/back.png> Règle '
    + (index + 1) + ' sur ' + unlockedCount + '</button>';

  h += '<div class="grimoire-card">';
  h += '<div class="grimoire-card-title">Si…</div>';
  var lock = isGrimoireEditable() ? '' : ' disabled';
  h += '<select class="grimoire-select" onchange="setGrimoireRuleCondition(' + index + ', this.value)"' + lock + '>';
  h += buildGrimoireConditionOptionsHTML(rule.conditionId);
  h += '</select>';
  if (cond) {
    // v3.242.2 (retour Seb) : une <option> native ne peut pas porter d'image. Une fois
    // la condition choisie, on rappelle son icône à côté de la description — le joueur
    // voit ainsi quelle attaque ennemie sera contrée.
    h += '<span class="grimoire-select-desc">'
      + renderIconOrEmojiHTML(cond.icon, "grimoire-select-desc-ico", cond.label)
      + '<span>' + esc(cond.description) + '</span></span>';
  }
  h += '</div>';

  h += '<div class="grimoire-card">';
  h += '<div class="grimoire-card-title">Alors…</div>';
  if (!kit) {
    h += '<p class="grimoire-hint">Choisis d\'abord un héros pour assigner une action.</p>';
  } else {
    h += '<select class="grimoire-select" onchange="setGrimoireRuleAction(' + index + ', this.value)"' + lock + '>';
    h += buildGrimoireActionOptionsHTML(kit, rule.actionSlot, rule.conditionId);
    h += '</select>';
    if (action) {
      // v3.242.2 : même rappel côté action — l'icône est celle du bouton de compétence
      // en combat, pour que le lien soit immédiat.
      var actionIcon = (typeof CLASS_ACTION_ICON_FALLBACK !== "undefined" && CLASS_ACTION_ICON_FALLBACK[action.id])
        || (action.type === "defense" ? "images/Icons/combat_stats/stat_defense.png" : "images/Icons/scene/node_discovery.png");
      h += '<span class="grimoire-select-desc">'
        + renderIconOrEmojiHTML(actionIcon, "grimoire-select-desc-ico", action.label)
        + '<span>' + esc(action.description) + '</span></span>';
    }
  }

  if (cond && action) {
    // Les deux canaux de contre restent distingués ICI, et seulement ici : un contre
    // de télégraphe ANNULE l'attaque, une suppression d'archétype s'ajoute aux dégâts.
    var isTelegraphCounter = !!(Array.isArray(action.counters) && action.counters.indexOf(rule.conditionId) !== -1);
    var isArchetypeCounter = !isTelegraphCounter && isGrimoireRuleCounter(rule, kit);

    if (isTelegraphCounter) {
      h += '<div class="grimoire-verdict is-counter"><span><img class=ico-inline src=images/Icons/combat_stats/stat_speed.png></span><span><strong>Contre parfait.</strong> '
        + 'Cette action annulera complètement l\'attaque adverse si elle est jouée à temps.</span></div>';
    } else if (isArchetypeCounter) {
      h += '<div class="grimoire-verdict is-counter"><span><img class=ico-inline src=images/Icons/system/ascension.png></span><span><strong>Effet spécial.</strong> '
        + 'Cette action agit sur cette situation en plus de ses dégâts normaux.</span></div>';
    } else {
      h += '<div class="grimoire-verdict is-neutral"><span>○</span><span>Cette action ne contre pas cette '
        + 'situation — elle sera simplement jouée en priorité.</span></div>';
    }

    var allCounterIds = (typeof getAllGrimoireCounterIds === "function") ? getAllGrimoireCounterIds(action) : [];
    var otherLabels = allCounterIds
      .filter(function (conditionId) { return conditionId !== rule.conditionId; })
      .map(function (conditionId) { return getGrimoireCondition(conditionId).label; });
    if (otherLabels.length) {
      h += '<p class="grimoire-hint"><img class=ico-inline src=images/Icons/combat_stats/stat_speed.png> ' + esc(action.label) + ' contre aussi : ' + esc(otherLabels.join(", ")) + '.</p>';
    }
  }
  h += '</div>';

  if ((rule.conditionId || rule.actionSlot) && isGrimoireEditable()) {
    h += '<button type="button" class="grimoire-clear-btn" onclick="clearGrimoireRule(' + index + ')">Vider cet emplacement</button>';
  }

  return h;
}

/* ============================================================
   FEUILLES BASSES — aide et presets
   Ancrées en bas : la liste reste visible derrière, on ne perd pas le contexte.
   ============================================================ */

/* L'aide remplace les 367 px de prose qui ouvraient l'ancien écran. Son texte vit
   dans GENERIC_TUTORIALS.grimoire_rules (ui/tutorial-view.js) : une seule source pour
   la feuille ci-dessous ET pour l'écran Tutoriels, qui l'agrège automatiquement. */
function getGrimoireHelpTutorial() {
  return (window.GENERIC_TUTORIALS && GENERIC_TUTORIALS.grimoire_rules) || null;
}

function buildGrimoireHelpSheetHTML() {
  var tut = getGrimoireHelpTutorial();
  if (!tut) return "";

  var h = '<div class="grimoire-sheet-title"><span>' + renderIconOrEmojiHTML(tut.icon, "grimoire-sheet-ico", "") + '</span><span>' + esc(tut.title) + '</span></div>';
  h += '<div class="grimoire-sheet-body">';
  (tut.points || []).forEach(function (p) {
    h += '<div class="grimoire-help-point"><span class="grimoire-help-point-icon">' + renderIconOrEmojiHTML(p.icon, "tutorial-point-ico", "") + '</span>'
      + '<span class="grimoire-help-point-text">' + esc(p.text) + '</span></div>';
  });
  h += '</div>';
  h += '<button type="button" class="grimoire-sheet-close" onclick="closeGrimoireSheet()">Compris</button>';
  return h;
}

/* Le Rapport de combat partage la feuille basse de l'Aide et des Presets.
   Le corps vient de buildCombatReportBodyHTML() (ui/combat-report-view.js) — la
   superposition plein écran garde le même contenu, qu'elle utilise pour l'ouverture
   automatique à la mort. Une seule source, deux habillages. */
function buildGrimoireReportSheetHTML() {
  var h = '<div class="grimoire-sheet-title"><span><img class=ico-inline src=images/Icons/subtabs/hero_stats.png></span><span>Rapport de combat</span></div>';
  h += '<div class="grimoire-sheet-body grimoire-report-body">';
  h += (typeof buildCombatReportBodyHTML === "function")
    ? buildCombatReportBodyHTML()
    : '<p class="grimoire-hint">Rapport indisponible.</p>';
  h += '<button type="button" class="grimoire-clear-btn" onclick="resetCombatReport()"><img class=ico-inline src=images/Icons/system/trash.png> Réinitialiser le rapport</button>';
  h += '</div>';
  h += '<button type="button" class="grimoire-sheet-close" onclick="closeGrimoireSheet()">Fermer</button>';
  return h;
}

function buildGrimoirePresetsSheetHTML() {
  var presets = ensureGrimoirePresets();
  var suggested = (typeof getSuggestedGrimoirePreset === "function") ? getSuggestedGrimoirePreset() : null;

  var h = '<div class="grimoire-sheet-title"><span><img class=ico-inline src=images/Icons/system/save.png></span><span>Presets</span></div>';
  h += '<div class="grimoire-sheet-body">';
  h += '<p class="grimoire-hint" style="margin-top:0">Enregistre ta configuration sous un nom pour la retrouver selon le contexte.</p>';

  if (presets.length) {
    presets.forEach(function (preset) {
      h += buildGrimoirePresetCardHTML(preset, !!(suggested && suggested.id === preset.id));
    });
  } else {
    h += '<p class="grimoire-hint">Aucun preset enregistré pour l\'instant.</p>';
  }

  if (presets.length >= GRIMOIRE_PRESET_MAX_COUNT) {
    h += '<p class="grimoire-hint">Limite de ' + GRIMOIRE_PRESET_MAX_COUNT + ' presets atteinte — supprime-en un pour en enregistrer un nouveau.</p>';
  } else {
    h += buildGrimoirePresetCreateFormHTML();
    h += '<p class="grimoire-hint">' + presets.length + ' / ' + GRIMOIRE_PRESET_MAX_COUNT + ' presets enregistrés.</p>';
  }

  h += '</div>';
  h += '<button type="button" class="grimoire-sheet-close" onclick="closeGrimoireSheet()">Fermer</button>';
  return h;
}

var GRIMOIRE_SHEETS = {
  help: buildGrimoireHelpSheetHTML,
  presets: buildGrimoirePresetsSheetHTML,
  report: buildGrimoireReportSheetHTML
};

function buildGrimoireSheetHTML() {
  if (!grimoireOpenSheet || !GRIMOIRE_SHEETS[grimoireOpenSheet]) return "";
  return '<div class="grimoire-sheet-backdrop" onclick="closeGrimoireSheet()"></div>'
    + '<div class="grimoire-sheet"><div class="grimoire-sheet-handle"></div>'
    + GRIMOIRE_SHEETS[grimoireOpenSheet]() + '</div>';
}

/* v3.212.0 (bug Seb) — la feuille passait DERRIÈRE la barre de navigation du bas.
   Elle était rendue dans #panel-container, qui porte `isolation: isolate` : son
   z-index restait donc enfermé dans ce contexte d'empilement, et le panneau est
   peint sous #tab-bar. Un z-index plus grand n'y aurait rien changé.
   La feuille vit maintenant dans sa propre racine en fin de <body>, comme les
   autres modales du jeu (tutorial-modal-root, combat-report-modal-root...). */
function renderGrimoireSheet(isGrimoireTab) {
  var host = document.getElementById("grimoire-sheet-root");
  if (!host) return;
  if (isGrimoireTab === false) {
    grimoireOpenSheet = null; // quitter l'écran referme la feuille
    host.innerHTML = "";
    return;
  }
  host.innerHTML = buildGrimoireSheetHTML();
}
window.renderGrimoireSheet = renderGrimoireSheet;

/* Lu par resetCombatReport() (ui/combat-report-view.js) pour savoir lequel des deux
   habillages du rapport est à l'écran. */
function isGrimoireReportSheetOpen() {
  return grimoireOpenSheet === "report";
}
window.isGrimoireReportSheetOpen = isGrimoireReportSheetOpen;

function openGrimoireSheet(name) {
  grimoireOpenSheet = name;
  // Lire l'aide ici vaut « rencontrée » : l'entrée se déverrouille dans l'écran
  // Tutoriels, au même titre qu'un popup pédagogique réellement affiché.
  if (name === "help") {
    if (!game.genericTutorialsSeen || typeof game.genericTutorialsSeen !== "object") game.genericTutorialsSeen = {};
    if (!game.genericTutorialsSeen.grimoire_rules) {
      game.genericTutorialsSeen.grimoire_rules = true;
      saveGame();
    }
  }
  if (typeof renderPanel === "function") renderPanel();
}

function closeGrimoireSheet() {
  grimoireOpenSheet = null;
  if (typeof renderPanel === "function") renderPanel();
}

function openGrimoireRule(index) {
  grimoireEditIndex = index;
  grimoireOpenSheet = null;
  if (typeof renderPanel === "function") renderPanel();
}

function closeGrimoireRule() {
  grimoireEditIndex = null;
  if (typeof renderPanel === "function") renderPanel();
}

function clearGrimoireRule(index) {
  if (!isGrimoireEditable()) return;
  ensureGrimoireRules();
  if (!game.grimoireRules[index]) return;
  game.grimoireRules[index] = { conditionId: null, actionSlot: null };
  saveGame();
  if (typeof renderPanel === "function") renderPanel();
}

window.openGrimoireRule = openGrimoireRule;
window.closeGrimoireRule = closeGrimoireRule;
window.clearGrimoireRule = clearGrimoireRule;
window.openGrimoireSheet = openGrimoireSheet;
window.closeGrimoireSheet = closeGrimoireSheet;
window.buildGrimoireEditHTML = buildGrimoireEditHTML;
window.buildGrimoireRuleRowHTML = buildGrimoireRuleRowHTML;
window.isGrimoireRuleCounter = isGrimoireRuleCounter;
window.getGrimoireConditionShortLabel = getGrimoireConditionShortLabel;

function buildGrimoirePresetCardHTML(preset, isSuggested) {
  var dateLabel = preset.lastModified
    ? new Date(preset.lastModified).toLocaleDateString()
    : "";

  var h = '<div class="panel-card grimoire-preset-card">';
  h += '<div class="grimoire-preset-header">';
  h += '<span class="grimoire-preset-icon">' + renderIconOrEmojiHTML(preset.icon || "images/Icons/codex/codex_lore.png", "grimoire-preset-ico", "") + '</span>';
  h += '<span class="grimoire-preset-name">' + esc(preset.name) + '</span>';
  if (isSuggested) {
    h += '<span class="grimoire-preset-suggested" title="Suggéré pour le monde actuel"><img class=ico-inline src=images/Icons/system/suggested_preset.png></span>';
  }
  h += '</div>';
  if (dateLabel) {
    h += '<p class="panel-sub grimoire-preset-date">Modifié le ' + esc(dateLabel) + '</p>';
  }
  h += '<div class="grimoire-preset-actions">';
  h += '<button class="settings-btn grimoire-preset-load-btn" type="button"'
    + ((typeof isGrimoireEditable === "function" && !isGrimoireEditable()) ? ' disabled' : '')
    + ' onclick="confirmLoadGrimoirePreset(\'' + esc(preset.id) + '\')">Charger</button>';
  h += '<button class="settings-btn grimoire-preset-delete-btn" type="button" onclick="confirmDeleteGrimoirePreset(\'' + esc(preset.id) + '\')"><img class=ico-inline src=images/Icons/system/trash.png></button>';
  h += '</div>';
  h += '</div>';
  return h;
}

function buildGrimoirePresetCreateFormHTML() {
  var h = '<div class="grimoire-preset-create-form">';
  h += '<input id="grimoire-preset-name-input" type="text" maxlength="30" placeholder="Nom du preset (ex. Farm Forêt)">';
  h += '<div class="grimoire-preset-icon-picker">';
  GRIMOIRE_PRESET_ICON_CHOICES.forEach(function (icon, index) {
    h += '<label class="grimoire-preset-icon-choice">';
    h += '<input type="radio" name="grimoire-preset-icon" value="' + esc(icon) + '"' + (index === 0 ? ' checked' : '') + '>';
    h += '<span>' + renderIconOrEmojiHTML(icon, "grimoire-choice-ico", "") + '</span>';
    h += '</label>';
  });
  h += '</div>';
  h += '<button class="settings-btn primary" type="button" onclick="handleSaveGrimoirePresetClick()"><img class=ico-inline src=images/Icons/system/save.png> Enregistrer comme preset</button>';
  h += '</div>';
  return h;
}

function handleSaveGrimoirePresetClick() {
  var nameInput = document.getElementById("grimoire-preset-name-input");
  var name = nameInput ? nameInput.value : "";

  var iconInputs = document.getElementsByName("grimoire-preset-icon");
  var selectedIcon = GRIMOIRE_PRESET_ICON_CHOICES[0];
  for (var i = 0; i < iconInputs.length; i++) {
    if (iconInputs[i].checked) { selectedIcon = iconInputs[i].value; break; }
  }

  saveGrimoirePreset(name, selectedIcon);
}

window.buildGrimoirePresetCardHTML = buildGrimoirePresetCardHTML;
window.buildGrimoirePresetCreateFormHTML = buildGrimoirePresetCreateFormHTML;
window.handleSaveGrimoirePresetClick = handleSaveGrimoirePresetClick;

/* ============================================================
   ÉCRAN — liste par défaut, fiche quand une règle est ouverte
   ============================================================ */

/* Sélecteur de mode de combat (demande Seb) : l'ancien écran se contentait d'un
   bandeau disant d'aller basculer le mode AILLEURS (écran Combat ou Paramètres).
   CombatEngine.setCombatMode() est appelable d'ici — c'est exactement ce que fait
   le bouton de l'écran Combat, mêmes effets. Fichier protégé non modifié. */
function buildGrimoireModeHTML() {
  var on = game.combatMode === "grimoire";
  var editable = isGrimoireEditable();
  // Basculer le mode remet à zéro l'horloge de round (CombatEngine.setCombatMode) :
  // interdit en pleine sortie, au même titre que modifier une règle.
  var lock = editable ? '' : ' disabled';

  var h = '<div class="grimoire-head">';
  h += '<div class="grimoire-mode' + (editable ? '' : ' is-locked') + '">';
  h += '<button type="button" class="' + (on ? '' : 'is-on') + '"' + lock + ' onclick="setGrimoireCombatMode(\'tactique\')"><img class=ico-inline src=images/Icons/combat_stats/stat_critical.png> Tactique</button>';
  h += '<button type="button" class="' + (on ? 'is-on' : '') + '"' + lock + ' onclick="setGrimoireCombatMode(\'grimoire\')"><img class=ico-inline src=images/Icons/codex/codex_lore.png> Grimoire</button>';
  h += '</div>';
  h += '<button type="button" class="grimoire-help-btn" onclick="openGrimoireSheet(\'help\')">?</button>';
  h += '</div>';

  h += '<p class="grimoire-mode-desc">' + (on
    ? 'Les rounds s\'enchaînent seuls et tes règles choisissent l\'action.'
    : 'Chaque round attend ton choix — tes règles se contentent de surligner l\'action conseillée.') + '</p>';

  if (!editable) {
    h += '<div class="grimoire-locked-notice"><span><img class=ico-inline src=images/Icons/system/lock_closed.png></span><span>Sortie en cours — tes règles sont figées. '
      + 'Rentre au Campement pour les modifier.</span></div>';
  }
  return h;
}

function setGrimoireCombatMode(mode) {
  if (!isGrimoireEditable()) return;
  if (window.CombatEngine && typeof CombatEngine.setCombatMode === "function") CombatEngine.setCombatMode(mode);
  if (typeof renderPanel === "function") renderPanel();
}
window.setGrimoireCombatMode = setGrimoireCombatMode;

function buildGrimoireListHTML(kit, unlockedCount) {
  var h = buildGrimoireModeHTML();

  game.grimoireRules.forEach(function (rule, index) {
    if (index === unlockedCount) {
      h += '<div class="grimoire-divider">Emplacements à venir</div>';
    }
    h += buildGrimoireRuleRowHTML(index, rule, kit, index >= unlockedCount);
  });

  h += '<div class="grimoire-foot">';
  h += '<button type="button" onclick="openGrimoireSheet(\'presets\')"><img class=ico-inline src=images/Icons/system/save.png> Presets<span class="grimoire-foot-badge">'
    + ensureGrimoirePresets().length + '</span></button>';
  h += '<button type="button" onclick="openGrimoireSheet(\'report\')"><img class=ico-inline src=images/Icons/subtabs/hero_stats.png> Rapport</button>';
  h += '</div>';

  return h;
}

function buildGrimoireHTML() {
  ensureGrimoireRules();
  var kit = getGrimoireCurrentKit();
  var unlockedCount = (typeof getGrimoireSlotCount === "function") ? getGrimoireSlotCount(game.worldsEverReached) : GRIMOIRE_SLOT_COUNT;

  // Une règle ouverte hors des emplacements débloqués ne doit pas rester affichée
  // (changement de héros, preset d'une autre version, état d'écran resté en mémoire).
  if (grimoireEditIndex !== null && grimoireEditIndex >= unlockedCount) grimoireEditIndex = null;

  var h = (grimoireEditIndex !== null)
    ? buildGrimoireEditHTML(grimoireEditIndex, kit)
    : buildGrimoireListHTML(kit, unlockedCount);

  return '<div class="nb-page-frame kframe-page" data-kf-title="images/Icons/codex/codex_lore.png|Grimoire">' + h + '</div>';
}

function setGrimoireRuleCondition(index, conditionId) {
  if (!isGrimoireEditable()) return; // garde-fou : l'UI désactive déjà, le code refuse aussi
  ensureGrimoireRules();
  if (!game.grimoireRules[index]) return;
  game.grimoireRules[index].conditionId = conditionId || null;
  saveGame();
  if (typeof renderPanel === "function") renderPanel();
}

function setGrimoireRuleAction(index, actionSlot) {
  if (!isGrimoireEditable()) return;
  ensureGrimoireRules();
  if (!game.grimoireRules[index]) return;
  game.grimoireRules[index].actionSlot = actionSlot || null;
  saveGame();
  if (typeof renderPanel === "function") renderPanel();
}

window.GRIMOIRE_SLOT_COUNT = GRIMOIRE_SLOT_COUNT;
window.ensureGrimoireRules = ensureGrimoireRules;
window.buildGrimoireHTML = buildGrimoireHTML;
window.setGrimoireRuleCondition = setGrimoireRuleCondition;
window.setGrimoireRuleAction = setGrimoireRuleAction;
