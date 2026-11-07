"use strict";
/* ui/grimoire-view.js — écran Grimoire : 3 règles conditionnelles {Si condition -> Alors action} (v3.736.0, 6 avant),
   déblocage par jalon de monde, jeux de règles en onglets (presets nommés v3.65, jeu actif v3.736.0).
   v3.210.0 — REFONTE VISUELLE (atelier Seb). L'écran mesurait 3 462 px à 390 px de large, dont
   1 429 px de préambule avant la première règle : chaque règle affichait en permanence tout ce
   qu'il faut pour la MODIFIER (deux libellés, deux listes, deux descriptions, un badge d'état).
   Désormais deux niveaux :
     - LISTE  : une ligne par règle, « Si X -> Y », lisible d'un coup d'œil (~560 px au total) ;
     - FICHE  : ouverte au toucher ; v3.654.0 : feuille des conditions et tuiles d'action, puis le verdict d'appariement.
   Retirés sur décision Seb : le Mode Expert (game.expertModeEnabled reste en sauvegarde, inerte)
   et les badges d'état de règle (prête / en attente / ressource insuffisante) — cette information
   n'a de sens qu'en combat, et le Rapport de combat la couvre déjà a posteriori. */

/* État d'écran volontairement NON persisté (aucun nouveau champ dans save-system.js) :
   quelle règle est ouverte et quelle feuille est déployée n'a pas d'intérêt d'une session
   à l'autre. Même parti pris que ui/tutorials-view.js. */
var grimoireEditIndex = null;
var grimoireOpenSheet = null;

var GRIMOIRE_SLOT_COUNT = 3; // v3.736.0 (Seb 07/11) : 6 -> 3 emplacements

/* Complète à 3 ; v3.736.0 : ne tronque plus (règles 4 à 6 d'avant gardées tant que migrateGrimoireExtraRules n'a pas de place). */
function ensureGrimoireRules() {
  if (!Array.isArray(game.grimoireRules)) game.grimoireRules = [];
  if (typeof migrateGrimoireExtraRules === "function") migrateGrimoireExtraRules(); // boot : loadGame() ne repasse pas par ensureGameStateDefaults

  while (game.grimoireRules.length < GRIMOIRE_SLOT_COUNT) {
    game.grimoireRules.push({ conditionId: null, actionSlot: null });
  }
  return game.grimoireRules;
}

var GRIMOIRE_PRESET_MAX_COUNT = 6;

var GRIMOIRE_PRESET_ICON_CHOICES = ["images/Icons/combat_stats/stat_attack.webp", "images/Icons/combat_stats/stat_defense.webp", "images/Icons/classes/class_ranger.webp", "images/Icons/classes/class_mage.webp", "images/Icons/dungeon/boss_crown.webp", "images/Icons/codex/world_forest.webp", "images/Icons/codex/world_desert.webp", "images/Icons/codex/world_mountain.webp"];

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
  ensureGrimoireJeux(); // le jeu en cours garde ses règles avant d'en créer un autre
  if (!canCreateGrimoireJeu()) return;
  var rulesSnapshot = grimoireFirstRules(game.grimoireRules);

  presets.forEach(function (p) { delete p.actif; });
  presets.push({
    id: generateGrimoirePresetId(),
    name: trimmedName.slice(0, 30), // même esprit que maxlength sur le nom du héros (modal-view.js)
    icon: (icon && GRIMOIRE_PRESET_ICON_CHOICES.indexOf(icon) !== -1) ? icon : GRIMOIRE_PRESET_ICON_CHOICES[0],
    rules: rulesSnapshot,
    lastModified: Date.now(),
    actif: true // v3.736.0 : le nouveau jeu devient le jeu actif (mêmes règles)
  });

  saveGame();
  if (typeof renderPanel === "function") renderPanel();
}

/* v3.736.0 (Seb 07/11, jeux A) : le jeu actif (game.grimoirePresets[i].actif) ; game.grimoireRules en est la copie jouée.
   Aucun jeu marqué (partie d'avant) : celui qui a les mêmes 3 règles, sinon un jeu « Mes règles » créé en tête. */
function grimoireFirstRules(list) {
  var max = GRIMOIRE_SLOT_COUNT, out = (typeof sanitizeGrimoireRules === "function") ? sanitizeGrimoireRules((list || []).slice(0, max), getGrimoireCurrentKit()) : (list || []).slice(0, max);
  out = out.map(function (r) { return { conditionId: (r && r.conditionId) || null, actionSlot: (r && r.actionSlot) || null }; });
  while (out.length < max) out.push({ conditionId: null, actionSlot: null });
  return out;
}
function grimoireSameRules(a, b) {
  var x = grimoireFirstRules(a), y = grimoireFirstRules(b);
  return x.every(function (r, i) { return r.conditionId === y[i].conditionId && r.actionSlot === y[i].actionSlot; });
}
function ensureGrimoireJeux() {
  ensureGrimoireRules(); // migration des règles 4 à 6 d'abord
  var presets = ensureGrimoirePresets(), act = presets.filter(function (p) { return p && p.actif; });
  act.slice(1).forEach(function (p) { delete p.actif; });
  if (act.length) return act[0];
  var same = presets.filter(function (p) { return grimoireSameRules(p.rules, game.grimoireRules); })[0];
  if (same) { same.actif = true; return same; }
  var mine = { id: generateGrimoirePresetId(), name: GRIMOIRE_MY_RULES_NAME, icon: "images/Icons/system/grimoire.webp", rules: grimoireFirstRules(game.grimoireRules), lastModified: Date.now(), actif: true };
  presets.unshift(mine);
  return mine;
}
function getActiveGrimoireJeu() { return ensureGrimoireJeux(); }
/* Jeux permis par les mondes atteints (3 -> 6) ; les jeux déjà enregistrés au-delà restent. */
function getGrimoireJeuxCap() {
  var n = (typeof getGrimoireJeuxCount === "function") ? getGrimoireJeuxCount(game.worldsEverReached) : GRIMOIRE_PRESET_MAX_COUNT;
  return Math.min(GRIMOIRE_PRESET_MAX_COUNT, n);
}
function canCreateGrimoireJeu() { return ensureGrimoirePresets().length < getGrimoireJeuxCap(); }

/* Ce qu'on modifie s'écrit dans le jeu actif (ses règles 4 à 6 d'avant restent stockées). */
function syncGrimoireActiveJeu() {
  var j = ensureGrimoireJeux(), cur = grimoireFirstRules(game.grimoireRules);
  if (!Array.isArray(j.rules)) j.rules = [];
  cur.forEach(function (r, i) { j.rules[i] = { conditionId: r.conditionId, actionSlot: r.actionSlot }; });
  j.lastModified = Date.now();
  return j;
}

/* Un toucher change de jeu : ses 3 premières règles deviennent celles du combat. Verrou de sortie comme toute modification. */
function activateGrimoireJeu(presetId) {
  if (typeof isGrimoireEditable === "function" && !isGrimoireEditable()) return false;
  var presets = ensureGrimoirePresets();
  var preset = presets.filter(function (p) { return p.id === presetId; })[0];
  if (!preset) return false;
  ensureGrimoireJeux();
  presets.forEach(function (p) { delete p.actif; });
  preset.actif = true;
  game.grimoireRules = grimoireFirstRules(preset.rules);
  grimoireEditIndex = null;
  saveGame();
  if (typeof renderPanel === "function") renderPanel();
  return true;
}

function loadGrimoirePreset(presetId) { return activateGrimoireJeu(presetId); }

// v3.736.0 : plus de confirmation, rien n'est perdu en changeant de jeu
function confirmLoadGrimoirePreset(presetId) { return activateGrimoireJeu(presetId); }

function confirmDeleteGrimoirePreset(presetId) {
  var presets = ensureGrimoirePresets();
  var preset = presets.filter(function (p) { return p.id === presetId; })[0];
  if (!preset || preset.actif) return; // v3.736.0 : le jeu actif ne se supprime pas

  showConfirmModal(
    _t("Supprimer « {x} » ?", { x: _td(preset.name) }),
    _t("Ce jeu de règles sera définitivement supprimé. Ton jeu actif n'est pas touché."),
    "images/Icons/system/trash.webp",
    function () {
      game.grimoirePresets = presets.filter(function (p) { return p.id !== presetId; });
      saveGame();
      if (typeof renderPanel === "function") renderPanel();
    }
  );
}

/* v3.736.0 : jeu conseillé pour une sortie = celui qui couvre le plus de ses situations (le jeu actif à égalité). */
function getSuggestedGrimoirePreset(ctx) {
  if (!ctx || typeof grimoireJeuScore !== "function") return null;
  var best = null, bestN = -1;
  ensureGrimoirePresets().forEach(function (p) {
    var n = grimoireJeuScore(p.rules, ctx).n;
    if (n > bestN || (n === bestN && p.actif)) { best = p; bestN = n; }
  });
  return best;
}

window.GRIMOIRE_PRESET_MAX_COUNT = GRIMOIRE_PRESET_MAX_COUNT;
window.GRIMOIRE_PRESET_ICON_CHOICES = GRIMOIRE_PRESET_ICON_CHOICES;
window.ensureGrimoirePresets = ensureGrimoirePresets;
window.saveGrimoirePreset = saveGrimoirePreset;
window.loadGrimoirePreset = loadGrimoirePreset;
window.confirmLoadGrimoirePreset = confirmLoadGrimoirePreset;
window.ensureGrimoireJeux = ensureGrimoireJeux;
window.getActiveGrimoireJeu = getActiveGrimoireJeu;
window.activateGrimoireJeu = activateGrimoireJeu;
window.syncGrimoireActiveJeu = syncGrimoireActiveJeu;
window.getGrimoireJeuxCap = getGrimoireJeuxCap;
window.canCreateGrimoireJeu = canCreateGrimoireJeu;
window.grimoireFirstRules = grimoireFirstRules;
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
  return world ? _td(world.name) : null;
}

/* v3.654.0 (atelier grimoire-fiche.html, variante C de Seb) : les listes déroulantes natives laissent la place
   à une feuille pour la condition (icône, description, en groupes) et à des tuiles pour l'action. */
var GRIMOIRE_CONDITION_GROUPS = [
  { title: _t("L'ennemi annonce", "grimoire groupe"), ids: ["chargeIncoming", "shieldIncoming", "healIncoming", "eliteSurgeIncoming", "enemyAttackIncoming", "enemySilenceIncoming"] },
  { title: _t("L'ennemi est", "grimoire groupe"), ids: ["enemyEnraged", "enemyCorrupted", "enemyVampiric", "enemyArmored", "multipleEnemies", "enemyRising", "enemySleeping"] },
  { title: _t("Ton groupe", "grimoire groupe"), ids: ["heroLowHp", "allyLowHp", "allyChained"] },
  { title: _t("Le terrain", "grimoire groupe"), ids: ["veinIntact"] }
];

/* Groupes de la feuille ; une condition oubliée des groupes tombe dans « Autres » (jamais perdue).
   v3.729.0 (Seb 06/11) : seulement les situations visibles (GrimoireSeen) ; un groupe vide disparaît. */
function getGrimoireConditionGroups() {
  var order = (typeof GRIMOIRE_CONDITION_ORDER !== "undefined") ? GRIMOIRE_CONDITION_ORDER : Object.keys(GRIMOIRE_CONDITIONS || {});
  var shown = function (id) { return getGrimoireCondition(id) && (!window.GrimoireSeen || GrimoireSeen.isVisible(id)); };
  var seen = {}, out = [];
  GRIMOIRE_CONDITION_GROUPS.forEach(function (g) {
    g.ids.forEach(function (id) { seen[id] = true; });
    var ids = g.ids.filter(shown);
    if (ids.length) out.push({ title: g.title, ids: ids });
  });
  var rest = order.filter(function (id) { return !seen[id] && shown(id); });
  if (rest.length) out.push({ title: _t("Autres", "grimoire groupe"), ids: rest });
  return out;
}

/* « Contre » (le télégraphe est annulé) ou « Effet » (suppression d'archétype), sinon rien. */
function getGrimoireCounterKind(action, conditionId) {
  if (!action || !conditionId) return null;
  if (Array.isArray(action.counters) && action.counters.indexOf(conditionId) !== -1) return "counter";
  if (typeof getAllGrimoireCounterIds === "function" && getAllGrimoireCounterIds(action).indexOf(conditionId) !== -1) return "effect";
  return null;
}

function buildGrimoireCounterTagHTML(kind) {
  if (kind === "counter") return '<span class="grimoire-counter-tag"><img class=ico-inline src=images/Icons/combat_status/counter.webp> ' + _t("Contre") + '</span>';
  if (kind === "effect") return '<span class="grimoire-effect-tag">' + _t("Effet") + '</span>';
  return "";
}

function getGrimoireActionIcon(action) {
  return (typeof CLASS_ACTION_ICON_FALLBACK !== "undefined" && CLASS_ACTION_ICON_FALLBACK[action.id])
    || (action.type === "defense" ? "images/Icons/combat_stats/stat_defense.webp" : "images/Icons/combat_actions/skill_generic.webp");
}

/* Bouton « Si… » : la condition choisie, toucher ouvre la feuille. */
function buildGrimoireConditionPickHTML(index, rule, editable) {
  var cond = getGrimoireCondition(rule.conditionId);
  var h = '<button type="button" class="grimoire-pick"' + (editable ? ' onclick="openGrimoireSheet(\'cond\')"' : ' disabled') + '>';
  h += cond ? renderIconOrEmojiHTML(cond.icon, "grimoire-pick-ico", _td(cond.label)) : '<span class="grimoire-pick-ico is-empty">＋</span>';
  h += '<span class="grimoire-pick-lab">' + (cond ? esc(_td(cond.label)) : _t("Choisir une condition")) + '</span>';
  h += '<span class="grimoire-rule-chevron">›</span></button>';
  return h;
}

/* Feuille des conditions : icône, nom et description, en groupes. */
function buildGrimoireConditionSheetHTML() {
  var index = grimoireEditIndex, rule = (index !== null && game.grimoireRules) ? game.grimoireRules[index] : null;
  var h = kSheetHeadHTML({ icon: '<img src="images/Icons/system/grimoire.webp" alt="">', title: _t("Si…"), close: "closeGrimoireSheet()" });
  h += '<div class="ksheet-body grimoire-sheet-body">';
  getGrimoireConditionGroups().forEach(function (g) {
    h += '<div class="grimoire-group-title">' + esc(g.title) + '</div>';
    g.ids.forEach(function (id) {
      var c = getGrimoireCondition(id), on = !!(rule && rule.conditionId === id);
      h += '<button type="button" class="grimoire-opt' + (on ? ' is-on' : '') + '" aria-pressed="' + on + '" onclick="pickGrimoireCondition(\'' + esc(id) + '\')">'
        + renderIconOrEmojiHTML(c.icon, "grimoire-opt-ico", _td(c.label))
        + '<span><b>' + esc(_td(c.label)) + '</b><span class="grimoire-opt-desc">' + esc(_td(c.description)) + '</span></span></button>';
    });
  });
  var hidden = window.GrimoireSeen ? GrimoireSeen.hiddenCount() : 0; // v3.729.0 : le reste se découvre en combat
  if (hidden > 0) h += '<p class="grimoire-hint">' + esc(_tn(hidden, "{n} situation encore inconnue", "{n} situations encore inconnues")) + '</p>';
  return h + '</div>';
}

/* Tuiles d'action : une par action du kit, badge « Contre » / « Effet » selon la condition choisie. */
function buildGrimoireActionTilesHTML(index, kit, rule, editable) {
  var h = '<div class="grimoire-acts">';
  GRIMOIRE_ASSIGNABLE_SLOTS.forEach(function (slot) {
    var action = getGrimoireActionDef(kit, slot);
    if (!action) return;
    // v3.487.0 : « Tailler » ne se propose qu'une fois la Montagne atteinte (ou s'il est déjà choisi)
    if (slot === "vein" && rule.actionSlot !== "vein" && !(game.worldsEverReached && game.worldsEverReached[4])) return;
    var on = rule.actionSlot === slot;
    h += '<button type="button" class="grimoire-act' + (on ? ' is-on' : '') + '" aria-pressed="' + on + '"'
      + (editable ? ' onclick="setGrimoireRuleAction(' + index + ', \'' + slot + '\')"' : ' disabled') + '>'
      + buildGrimoireCounterTagHTML(getGrimoireCounterKind(action, rule.conditionId))
      + renderIconOrEmojiHTML(getGrimoireActionIcon(action), "grimoire-act-ico", _td(action.label))
      + '<span>' + esc(_td(action.label)) + '</span></button>';
  });
  return h + '</div>';
}

/* ============================================================
   LIGNE DE RÈGLE — la liste
   ============================================================ */

/* Libellé court pour la ligne : le label complet d'une condition
   (« L'ennemi prépare une charge ») fait passer la ligne sur trois lignes.
   Défini ici et pas dans data/grimoire-conditions.js parce que c'est un besoin
   d'affichage propre à cet écran, pas une propriété de la condition. */
var GRIMOIRE_CONDITION_SHORT_LABELS = {
  chargeIncoming: _t("l'ennemi charge", "grimoire court"),
  shieldIncoming: _t("l'ennemi se protège", "grimoire court"),
  healIncoming: _t("le boss se soigne", "grimoire court"),
  eliteSurgeIncoming: _t("l'élite s'exalte", "grimoire court"),
  heroLowHp: _t("mes PV sont bas", "grimoire court"),
  enemyAttackIncoming: _t("l'ennemi frappe 2 fois", "grimoire court"), // v3.437.4 : « Si il » → sujet explicite
  enemyEnraged: _t("l'ennemi est enragé", "grimoire court"),
  enemyCorrupted: _t("l'ennemi est corrompu", "grimoire court"),
  enemySilenceIncoming: _t("l'ennemi va te museler", "grimoire court"),
  enemyVampiric: _t("l'ennemi est vampirique", "grimoire court"),
  enemyArmored: _t("l'ennemi est blindé", "grimoire court"),
  enemyRising: _t("un ennemi se relève", "grimoire court"), // v3.428.0 (Ruines)
  enemySleeping: _t("un ennemi dort", "grimoire court"), // v3.451.0 (Crypte)
  allyChained: _t("un compagnon est enchaîné", "grimoire court"), // v3.456.0 (Crypte, acte IV)
  veinIntact: _t("la veine est intacte", "grimoire court") // v3.487.0 (Montagne)
};

function getGrimoireConditionShortLabel(conditionId) {
  var cond = getGrimoireCondition(conditionId);
  if (!cond) return "";
  return GRIMOIRE_CONDITION_SHORT_LABELS[conditionId] || _td(cond.label);
}

/* Une règle contre-t-elle vraiment la situation choisie ? Couvre les DEUX
   canaux (télégraphe + suppression d'archétype), cf. getAllGrimoireCounterIds. */
function isGrimoireRuleCounter(rule, kit) {
  if (!rule || !rule.conditionId || !rule.actionSlot) return false;
  var action = getGrimoireActionDef(kit, rule.actionSlot);
  if (!action || typeof getAllGrimoireCounterIds !== "function") return false;
  return getAllGrimoireCounterIds(action).indexOf(rule.conditionId) !== -1;
}

function buildGrimoireRuleRowHTML(index, rule, kit, locked) {
  var cond = getGrimoireCondition(rule.conditionId);
  var action = getGrimoireActionDef(kit, rule.actionSlot); // v3.487.0 : « Tailler » hors kit
  var configured = !!(cond && action);

  var cls = "grimoire-rule-row";
  if (locked) cls += " is-locked";
  else if (!configured) cls += " is-empty";

  var h = '<button type="button" class="' + cls + '"'
    + (locked ? ' disabled' : ' onclick="openGrimoireRule(' + index + ')"') + '>';

  // Numéro d'ordre : les règles sont évaluées DANS L'ORDRE, ce que l'ancien
  // écran ne montrait nulle part.
  h += '<span class="grimoire-rule-order">' + (index + 1) + '</span>';
  h += '<span class="grimoire-rule-icon">' + (locked ? '<img class="ico-sys" src="images/Icons/system/lock_closed.webp" alt="">' : (cond ? renderIconOrEmojiHTML(cond.icon, "grimoire-rule-ico", _td(cond.label)) : '＋')) + '</span>';
  h += '<span class="grimoire-rule-body">';

  if (locked) {
    var worldLabel = getGrimoireUnlockWorldLabel(index);
    h += '<span class="grimoire-rule-text">' + _t("Emplacement verrouillé") + '</span>';
    h += '<span class="grimoire-rule-sub">'
      + (worldLabel ? esc(_t("Atteindre {w}", { w: worldLabel })) : _t("Débloqué plus tard dans ta progression"))
      + '</span>';
  } else if (!configured) {
    h += '<span class="grimoire-rule-text">' + _t("Emplacement libre") + '</span>';
    h += '<span class="grimoire-rule-sub">' + _t("Toucher pour créer une règle") + '</span>';
  } else {
    h += '<span class="grimoire-rule-text">' + esc(_t("Si {x}", { x: getGrimoireConditionShortLabel(rule.conditionId) }))
      + ' <span class="grimoire-rule-arrow">→</span> ' + esc(_td(action.label))
      + (isGrimoireRuleCounter(rule, kit) ? '<span class="grimoire-counter-tag"><img class=ico-inline src=images/Icons/combat_status/counter.webp> ' + _t("Contre") + '</span>' : '')
      + '</span>';
  }

  h += '</span>';
  h += '<span class="grimoire-rule-chevron">›</span>';
  h += '</button>';
  return h;
}

/* ============================================================
   FICHE — condition en feuille, actions en tuiles (v3.654.0)
   ============================================================ */

function buildGrimoireEditHTML(index, kit) {
  ensureGrimoireRules();
  var rule = game.grimoireRules[index];
  if (!rule) return "";

  var cond = getGrimoireCondition(rule.conditionId);
  var action = getGrimoireActionDef(kit, rule.actionSlot); // v3.487.0 : « Tailler » hors kit
  var unlockedCount = (typeof getGrimoireSlotCount === "function") ? getGrimoireSlotCount(game.worldsEverReached) : GRIMOIRE_SLOT_COUNT;

  var h = '<button type="button" class="grimoire-back-btn" onclick="closeGrimoireRule()"><img class=ico-inline src=images/Icons/system/back.webp> ' + _t("Règle {a} sur {b}", { a: index + 1, b: unlockedCount }) + '</button>';

  h += '<div class="grimoire-card">';
  h += '<div class="grimoire-card-title">' + _t("Si…") + '</div>';
  var editable = isGrimoireEditable();
  h += buildGrimoireConditionPickHTML(index, rule, editable);
  if (cond) {
    h += '<span class="grimoire-select-desc">'
      + renderIconOrEmojiHTML(cond.icon, "grimoire-select-desc-ico", _td(cond.label))
      + '<span>' + esc(_td(cond.description)) + '</span></span>';
  }
  h += '</div>';

  h += '<div class="grimoire-card">';
  h += '<div class="grimoire-card-title">' + _t("Alors…") + '</div>';
  if (!kit) {
    h += '<p class="grimoire-hint">' + _t("Choisis d'abord un héros pour assigner une action.") + '</p>';
  } else {
    h += buildGrimoireActionTilesHTML(index, kit, rule, editable);
    if (action) {
      h += '<span class="grimoire-select-desc">'
        + renderIconOrEmojiHTML(getGrimoireActionIcon(action), "grimoire-select-desc-ico", _td(action.label))
        + '<span>' + esc(_td(action.description)) + '</span></span>';
    }
  }

  if (cond && action) {
    // Les deux canaux de contre restent distingués ICI, et seulement ici : un contre
    // de télégraphe ANNULE l'attaque, une suppression d'archétype s'ajoute aux dégâts.
    var isTelegraphCounter = !!(Array.isArray(action.counters) && action.counters.indexOf(rule.conditionId) !== -1);
    var isArchetypeCounter = !isTelegraphCounter && isGrimoireRuleCounter(rule, kit);

    if (isTelegraphCounter) {
      h += '<div class="grimoire-verdict is-counter"><span><img class=ico-inline src=images/Icons/combat_status/counter.webp></span><span><strong>' + _t("Contre parfait.") + '</strong> '
        + _t("Cette action annulera complètement l'attaque adverse si elle est jouée à temps.")
        // v3.730.0 (Seb 06/11) : contre protecteur (P1) et contre rapide (P3, Charge seulement)
        + (action.type === "defense" && window.GROUP_DEFENSE_ANNONCES && GROUP_DEFENSE_ANNONCES[rule.conditionId] ? " " + _t("Elle couvre aussi tes compagnons tant qu'elle dure.") : "")
        + (action.type === "defense" && rule.conditionId === "chargeIncoming" ? " " + _t("Et tu frappes dans la foulée.") : "") + '</span></div>';
    } else if (isArchetypeCounter) {
      h += '<div class="grimoire-verdict is-counter"><span><img class=ico-inline src=images/Icons/system/ascension.webp></span><span><strong>' + _t("Effet spécial.") + '</strong> '
        + _t("Cette action agit sur cette situation en plus de ses dégâts normaux.") + '</span></div>';
    } else {
      h += '<div class="grimoire-verdict is-neutral"><span>○</span><span>' + _t("Cette action ne contre pas cette situation — elle sera simplement jouée en priorité.") + '</span></div>';
    }

    var allCounterIds = (typeof getAllGrimoireCounterIds === "function") ? getAllGrimoireCounterIds(action) : [];
    var otherLabels = allCounterIds
      .filter(function (conditionId) { return conditionId !== rule.conditionId; })
      .map(function (conditionId) { return _td(getGrimoireCondition(conditionId).label); });
    if (otherLabels.length) {
      h += '<p class="grimoire-hint"><img class=ico-inline src=images/Icons/combat_status/counter.webp> ' + esc(_t("{x} contre aussi : {liste}.", { x: _td(action.label), liste: otherLabels.join(", ") })) + '</p>';
    }
  }
  h += '</div>';

  if ((rule.conditionId || rule.actionSlot) && isGrimoireEditable()) {
    h += '<button type="button" class="grimoire-clear-btn" onclick="clearGrimoireRule(' + index + ')">' + _t("Vider cet emplacement") + '</button>';
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

  var h = kSheetHeadHTML({ icon: renderIconOrEmojiHTML(tut.icon, "grimoire-sheet-ico", ""), title: esc(_td(tut.title)), close: "closeGrimoireSheet()" });
  h += '<div class="ksheet-body grimoire-sheet-body">';
  (tut.points || []).forEach(function (p) {
    h += '<div class="grimoire-help-point"><span class="grimoire-help-point-icon">' + renderIconOrEmojiHTML(p.icon, "tutorial-point-ico", "") + '</span>'
      + '<span class="grimoire-help-point-text">' + esc(_td(p.text)) + '</span></div>';
  });
  h += '</div>';
  return h;
}

/* Le Rapport de combat partage la feuille basse de l'Aide et des Presets.
   Le corps vient de buildCombatReportBodyHTML() (ui/combat-report-view.js) — la
   superposition plein écran garde le même contenu, qu'elle utilise pour l'ouverture
   automatique à la mort. Une seule source, deux habillages. */
function buildGrimoireReportSheetHTML() {
  var h = kSheetHeadHTML({ icon: '<img src="images/Icons/system/combat_report.webp" alt="">', title: _t("Rapport de combat"), close: "closeGrimoireSheet()" });
  h += '<div class="ksheet-body grimoire-sheet-body grimoire-report-body">';
  h += (typeof buildCombatReportBodyHTML === "function")
    ? buildCombatReportBodyHTML()
    : '<p class="grimoire-hint">' + _t("Rapport indisponible.") + '</p>';
  h += '<button type="button" class="grimoire-clear-btn" onclick="resetCombatReport()"><img class=ico-inline src=images/Icons/system/trash.webp> ' + _t("Réinitialiser le rapport") + '</button>';
  h += '</div>';
  return h;
}

/* v3.736.0 (Seb 07/11, jeux A) : la feuille des jeux — prendre, supprimer (sauf l'actif), en créer un. */
function buildGrimoirePresetsSheetHTML() {
  ensureGrimoireJeux();
  var presets = ensureGrimoirePresets(), cap = getGrimoireJeuxCap();

  var h = kSheetHeadHTML({ icon: '<img src="images/Icons/system/save.webp" alt="">', title: _t("Jeux de règles"), close: "closeGrimoireSheet()" });
  h += '<div class="ksheet-body grimoire-sheet-body">';
  h += '<p class="grimoire-hint" style="margin-top:0">' + _t("Un jeu garde 3 règles sous un nom. Change de jeu d'un toucher avant de partir : ce que tu modifies s'écrit dans le jeu actif.") + '</p>';

  presets.forEach(function (preset) { h += buildGrimoirePresetCardHTML(preset, false); });

  if (presets.length >= cap) {
    h += '<p class="grimoire-hint">' + esc(_t("{a} / {b} jeux.", { a: presets.length, b: cap })) + ' '
      + (cap < GRIMOIRE_PRESET_MAX_COUNT ? _t("La Crypte, la Montagne et la Tour en donnent chacune un de plus.") : _t("Supprime un jeu pour en créer un autre.")) + '</p>';
  } else {
    h += buildGrimoirePresetCreateFormHTML();
    h += '<p class="grimoire-hint">' + esc(_t("{a} / {b} jeux.", { a: presets.length, b: cap })) + '</p>';
  }

  h += '</div>';
  return h;
}

var GRIMOIRE_SHEETS = {
  cond: buildGrimoireConditionSheetHTML, // v3.654.0 : choix de la condition
  help: buildGrimoireHelpSheetHTML,
  presets: buildGrimoirePresetsSheetHTML,
  report: buildGrimoireReportSheetHTML
};

function buildGrimoireSheetHTML() {
  if (!grimoireOpenSheet || !GRIMOIRE_SHEETS[grimoireOpenSheet]) return "";
  // v3.399.0 (F-1) : feuille du kit (.ksheet), habillage commun
  return '<div class="ksheet-backdrop grimoire-sheet-backdrop" onclick="closeGrimoireSheet()"></div>'
    + '<div class="ksheet grimoire-sheet">'
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
  var keep = host.getAttribute("data-sheet") === String(grimoireOpenSheet) ? getSheetScroll(host) : 0; // v3.563.0 : même feuille, même position
  host.innerHTML = buildGrimoireSheetHTML();
  host.setAttribute("data-sheet", String(grimoireOpenSheet));
  setSheetScroll(host, keep);
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
  syncGrimoireActiveJeu(); // v3.736.0
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
  h += '<span class="grimoire-preset-icon">' + renderIconOrEmojiHTML(preset.icon || "images/Icons/system/grimoire.webp", "grimoire-preset-ico", "") + '</span>';
  h += '<span class="grimoire-preset-name">' + esc(_td(preset.name)) + '</span>';
  if (isSuggested) {
    h += '<span class="grimoire-preset-suggested" title="' + esc(_t("Suggéré pour le monde actuel")) + '"><img class=ico-inline src=images/Icons/system/suggested_preset.webp></span>';
  }
  h += '</div>';
  if (dateLabel) {
    h += '<p class="panel-sub grimoire-preset-date">' + esc(_t("Modifié le {d}", { d: dateLabel })) + '</p>';
  }
  h += '<div class="grimoire-preset-actions">';
  if (preset.actif) {
    h += '<span class="grimoire-preset-active">' + _t("Jeu actif") + '</span>'; // v3.736.0
  } else {
    h += '<button class="settings-btn grimoire-preset-load-btn" type="button"'
      + ((typeof isGrimoireEditable === "function" && !isGrimoireEditable()) ? ' disabled' : '')
      + ' onclick="activateGrimoireJeu(\'' + esc(preset.id) + '\')">' + _t("Prendre ce jeu") + '</button>';
    h += '<button class="settings-btn grimoire-preset-delete-btn" type="button" aria-label="' + esc(_t("Supprimer")) + '" onclick="confirmDeleteGrimoirePreset(\'' + esc(preset.id) + '\')"><img class=ico-inline src=images/Icons/system/trash.webp></button>';
  }
  h += '</div>';
  h += '</div>';
  return h;
}

/* Nom proposé d'après les situations du jeu (« Charge, Soin »), modifiable. */
function grimoireJeuAutoName(rules) {
  var n = grimoireFirstRules(rules).filter(function (r) { return r.conditionId; }).slice(0, 2).map(function (r) {
    var c = getGrimoireCondition(r.conditionId); return c ? _td(c.short || c.label) : "";
  }).filter(Boolean);
  return n.join(", ").slice(0, 30);
}

function buildGrimoirePresetCreateFormHTML() {
  var h = '<div class="grimoire-preset-create-form">';
  h += '<input id="grimoire-preset-name-input" type="text" maxlength="30" value="' + esc(grimoireJeuAutoName(game.grimoireRules)) + '" placeholder="' + esc(_t("Nom du jeu (ex. Boss)")) + '">';
  h += '<div class="grimoire-preset-icon-picker">';
  GRIMOIRE_PRESET_ICON_CHOICES.forEach(function (icon, index) {
    h += '<label class="grimoire-preset-icon-choice">';
    h += '<input type="radio" name="grimoire-preset-icon" value="' + esc(icon) + '"' + (index === 0 ? ' checked' : '') + '>';
    h += '<span>' + renderIconOrEmojiHTML(icon, "grimoire-choice-ico", "") + '</span>';
    h += '</label>';
  });
  h += '</div>';
  h += '<button class="settings-btn primary" type="button" onclick="handleSaveGrimoirePresetClick()"><img class=ico-inline src=images/Icons/system/save.webp> ' + _t("Créer un jeu avec ces règles") + '</button>';
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
window.buildGrimoireJeuxRowHTML = buildGrimoireJeuxRowHTML;
window.grimoireJeuAutoName = grimoireJeuAutoName;
window.buildGrimoirePresetCreateFormHTML = buildGrimoirePresetCreateFormHTML;
window.handleSaveGrimoirePresetClick = handleSaveGrimoirePresetClick;

/* ============================================================
   ÉCRAN — liste par défaut, fiche quand une règle est ouverte
   ============================================================ */

/* En-tête du Grimoire : le mode en cours (v3.440.0 : il se choisit à la préparation de sortie,
   ui/sortie-prep-view.js ; ici, il se lit), son explication, le verrou de sortie. */
function buildGrimoireModeHTML() {
  var on = game.combatMode === "grimoire";
  var editable = isGrimoireEditable();
  var h = '<div class="grimoire-head">';
  h += '<div class="grimoire-mode-now"><img src="' + (on ? 'images/Icons/system/grimoire.webp' : 'images/Icons/system/mode_tactique.webp') + '" alt=""><span>'
    + _t("Mode : {x}", { x: on ? _t("Grimoire") : _t("Tactique") }) + '<small>' + _t("Il se choisit au départ de chaque sortie.") + '</small></span></div>';
  h += '<button type="button" class="grimoire-help-btn" onclick="openGrimoireSheet(\'help\')">?</button>';
  h += '</div>';

  h += '<p class="grimoire-mode-desc">' + (on
    ? _t("Les rounds s'enchaînent seuls et tes règles choisissent l'action.")
    : _t("Chaque round attend ton choix — tes règles se contentent de surligner l'action conseillée.")) + '</p>';

  if (!editable) {
    h += '<div class="grimoire-locked-notice"><span><img class=ico-inline src=images/Icons/system/lock_closed.webp></span><span>' + _t("Sortie en cours — tes règles sont figées. Rentre au Campement pour les modifier.") + '</span></div>';
  }
  return h;
}

/* v3.736.0 (Seb 07/11, jeux A) : la rangée des jeux, un toucher change de jeu ; ＋ ouvre la feuille des jeux.
   suggestedId : le jeu conseillé (préparation de sortie), marqué ★. onPick : fonction appelée avec l'id. */
function buildGrimoireJeuxRowHTML(suggestedId, onPick) {
  var active = ensureGrimoireJeux(), editable = isGrimoireEditable(), pick = onPick || "activateGrimoireJeu";
  var h = '<div class="grimoire-jeux" role="tablist" aria-label="' + esc(_t("Jeux de règles")) + '">';
  ensureGrimoirePresets().forEach(function (p) {
    var on = p.id === active.id, sugg = suggestedId && p.id === suggestedId;
    h += '<button type="button" role="tab" aria-selected="' + on + '" class="grimoire-jeu' + (on ? ' is-on' : '') + (sugg ? ' is-sugg' : '') + '"'
      + (editable && !on ? ' onclick="' + pick + '(\'' + esc(p.id) + '\')"' : (on ? '' : ' disabled')) + '>'
      + (sugg ? '<span class="grimoire-jeu-star" aria-label="' + esc(_t("Conseillé")) + '">★</span>' : '')
      + renderIconOrEmojiHTML(p.icon || "images/Icons/system/grimoire.webp", "grimoire-jeu-ico", "") + '<span>' + esc(_td(p.name)) + '</span></button>';
  });
  if (editable && canCreateGrimoireJeu()) h += '<button type="button" class="grimoire-jeu is-new" aria-label="' + esc(_t("Nouveau jeu")) + '" onclick="openGrimoireSheet(\'presets\')">＋</button>';
  return h + '</div>';
}

/* « Ce jeu répond à : Charge · Soin » : ses situations, d'un coup d'œil. */
function buildGrimoireJeuCoversHTML() {
  var n = grimoireFirstRules(game.grimoireRules).filter(function (r) { return r.conditionId && r.actionSlot; }).map(function (r) {
    var c = getGrimoireCondition(r.conditionId); return c ? _td(c.short || c.label) : "";
  }).filter(Boolean);
  return '<p class="grimoire-jeu-covers">' + esc(_t("Ce jeu répond à : {x}", { x: n.length ? n.join(" · ") : _t("rien pour l'instant") })) + '</p>';
}

function buildGrimoireListHTML(kit, unlockedCount) {
  var h = buildGrimoireModeHTML();
  var jeu = ensureGrimoireJeux();
  h += '<div class="grimoire-jeu-box">' + buildGrimoireJeuxRowHTML(null) + buildGrimoireJeuCoversHTML()
    + '<p class="grimoire-jeu-note">' + esc(_t("Ce que tu modifies s'enregistre dans « {x} ». Le combat joue le jeu actif.", { x: _td(jeu.name) })) + '</p></div>';

  game.grimoireRules.slice(0, GRIMOIRE_SLOT_COUNT).forEach(function (rule, index) {
    if (index === unlockedCount) {
      h += '<div class="ksec grimoire-divider">' + _t("Emplacements à venir") + '</div>';
    }
    h += buildGrimoireRuleRowHTML(index, rule, kit, index >= unlockedCount);
  });

  // v3.440.0 : Cible et potion automatique se règlent à la préparation de sortie
  h += '<div class="grimoire-foot">';
  h += '<button type="button" onclick="openGrimoireSheet(\'presets\')"><img class=ico-inline src=images/Icons/system/save.webp> ' + _t("Jeux") + '<span class="grimoire-foot-badge">'
    + ensureGrimoirePresets().length + '</span></button>';
  h += '<button type="button" onclick="openGrimoireSheet(\'report\')"><img class=ico-inline src=images/Icons/system/combat_report.webp> ' + _t("Rapport") + '</button>';
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

  // v3.422.0 : venu de l'encart « avant le combat » -> bouton de retour en tête
  var back = (typeof buildGrimoireReturnHTML === "function") ? buildGrimoireReturnHTML() : "";
  return '<div class="nb-page-frame kframe-page" data-kf-title="' + esc("images/Icons/system/grimoire.webp|" + _t("Grimoire")) + '">' + back + h + '</div>';
}

function setGrimoireRuleCondition(index, conditionId) {
  if (!isGrimoireEditable()) return; // garde-fou : l'UI désactive déjà, le code refuse aussi
  ensureGrimoireRules();
  if (!game.grimoireRules[index]) return;
  game.grimoireRules[index].conditionId = conditionId || null;
  syncGrimoireActiveJeu(); // v3.736.0 : écrit dans le jeu actif
  saveGame();
  if (typeof renderPanel === "function") renderPanel();
}

/* v3.654.0 : choix dans la feuille des conditions — la feuille se referme sur la fiche. */
function pickGrimoireCondition(conditionId) {
  if (grimoireEditIndex === null) return;
  grimoireOpenSheet = null;
  setGrimoireRuleCondition(grimoireEditIndex, conditionId);
  if (typeof renderPanel === "function") renderPanel();
}

function setGrimoireRuleAction(index, actionSlot) {
  if (!isGrimoireEditable()) return;
  ensureGrimoireRules();
  if (!game.grimoireRules[index]) return;
  game.grimoireRules[index].actionSlot = actionSlot || null;
  syncGrimoireActiveJeu(); // v3.736.0
  saveGame();
  if (typeof renderPanel === "function") renderPanel();
}

window.GRIMOIRE_SLOT_COUNT = GRIMOIRE_SLOT_COUNT;
window.ensureGrimoireRules = ensureGrimoireRules;
window.buildGrimoireHTML = buildGrimoireHTML;
window.setGrimoireRuleCondition = setGrimoireRuleCondition;
window.setGrimoireRuleAction = setGrimoireRuleAction;
window.pickGrimoireCondition = pickGrimoireCondition;
