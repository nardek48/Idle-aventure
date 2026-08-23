"use strict";
/* ============================================================
Aethervale — ui/grimoire-view.js
v3.50.0 : écran "Grimoire" — édition des règles conditionnelles du
combat auto (étape 4a).
v3.51.0 : jalons narratifs par monde (étape 4b) — le nombre de slots
RÉELLEMENT UTILISABLES grandit avec la progression (2 de base + 1 par
monde parmi Ruines/Crypte/Montagne/Tour atteint pour la 1ère fois, voir
getGrimoireSlotCount(), systems/combat-auto-policy-system.js), jusqu'à
GRIMOIRE_SLOT_COUNT (6, le maximum théorique) — décision actée : pas
de contrainte de condition imposée sur un nouveau slot, le joueur
choisit librement quoi y assigner dès qu'il est débloqué.

game.grimoireRules contient TOUJOURS GRIMOIRE_SLOT_COUNT entrées (même
les verrouillées, voir ensureGrimoireRules()) plutôt qu'un tableau à
taille variable — plus simple à maintenir qu'un tableau qui grandirait
à chaque déblocage, et permet à un joueur de préparer une règle sur un
slot pas encore débloqué (elle est juste ignorée par
ClassCombatManager.tickAutoSkills() tant que le slot n'est pas
débloqué, voir sa note sur le troncage par getGrimoireSlotCount()) —
mais l'écran l'affiche quand même GRISÉ/désactivé plutôt que masqué,
pour montrer au joueur qu'un déblocage futur existe.

Chaque slot est une carte { conditionId, actionSlot } (voir
game.grimoireRules, systems/save-system.js) éditée via 2 sélecteurs
déroulants simples — pas de glisser-déposer, l'ORDRE du tableau
(slot 1 avant slot 2 avant...) fait déjà toute la priorité nécessaire
(voir chooseGrimoireAction(), systems/combat-auto-policy-system.js).

Conditions = cartes visuelles (data/grimoire-conditions.js), seuils
numériques jamais affichés ici, cohérent avec la décision de
conception actée par Seb. Actions assignables = skill1/skill2/skill3/
defense de la classe du héros COURANT uniquement (jamais "basic", voir
la note de ClassCombatManager.tickAutoSkills() pour la raison exacte)
— si le joueur change de héros/classe, les actionSlot restent valides
(les 4 slots existent dans les 3 kits) mais leurs LABELS affichés
changent automatiquement au prochain rendu (aucune donnée à migrer).

v3.65.0 : PRESETS nommés (Phase 5 de la feuille de route combat) —
game.grimoirePresets est une collection de profils SAUVEGARDÉS,
distincte de game.grimoireRules (qui reste l'unique tableau ACTIF lu
par le moteur de combat, aucun changement dans class-combat-system.js/
combat-auto-policy-system.js). Un preset est un SNAPSHOT nommé des 6
règles courantes — "enregistrer" copie game.grimoireRules dans un
nouveau preset (ou écrase un preset existant), "charger" fait
l'inverse. Décision actée avec Seb :
  - 6 presets maximum (GRIMOIRE_PRESET_MAX_COUNT) — limite arbitraire
    mais ajustable facilement plus tard (une seule constante) ;
  - charger un preset ÉCRASE la config active : confirmation demandée
    (showConfirmModal) avant d'écraser, pour ne pas perdre une config
    non sauvegardée par accident ;
  - suggestion contextuelle SIMPLE : si le nom d'un preset contient un
    mot-clé qui correspond au monde COURAMMENT affiché (WorldManager.
    worldIndex), un badge discret l'indique — jamais de sélection
    automatique, le joueur choisit toujours lui-même (voir
    getSuggestedGrimoirePreset()).

v3.66.0 : MODE EXPERT (Phase 6 de la feuille de route combat) —
toggle game.expertModeEnabled, réglable directement dans cet écran
(à côté des Presets). Décision actée par Seb à l'origine du projet :
les cartes de condition restent des cartes VISUELLES simples, les
seuils numériques jamais affichés PAR DÉFAUT — le Mode Expert ne
change PAS cette philosophie, il l'étend pour les joueurs qui le
demandent explicitement :
  - un INDICE simple (icône + court libellé) reste TOUJOURS visible
    sur chaque carte de règle, qu'importe le mode (voir
    buildGrimoireRuleStatusHTML(), code court : "ready"/"condition_false"/
    "resource_insufficient"/"on_cooldown"/"action_condition_unmet") ;
  - le DÉTAIL chiffré complet (seuil de PV réel, ressource X/Y réelle,
    cooldown en secondes, temps avant le prochain télégraphe) ne
    s'affiche QUE si game.expertModeEnabled est vrai.
Diagnostic calculé par explainGrimoireRuleStatus() (systems/combat-
auto-policy-system.js, logique PURE) — jamais dupliqué ici, ce fichier
ne fait que mettre en forme le résultat retourné. N'affecte JAMAIS le
comportement réel du combat automatique (aucune modification de
class-combat-system.js/combat-auto-policy-system.js autre que l'ajout
de cette fonction de lecture).
============================================================ */

/* Bascule game.expertModeEnabled — appelée par le toggle de l'écran
   Grimoire (voir buildGrimoireHTML()). Pure préférence d'affichage,
   aucun impact sur le moteur de combat. */
function toggleGrimoireExpertMode() {
  game.expertModeEnabled = !game.expertModeEnabled;
  saveGame();
  if (typeof renderPanel === "function") renderPanel();
}

window.toggleGrimoireExpertMode = toggleGrimoireExpertMode;

/* Nombre MAXIMAL théorique de slots (2 de base + 4 jalons de monde,
   voir GRIMOIRE_BASE_SLOT_COUNT/GRIMOIRE_UNLOCK_WORLD_INDEXES,
   systems/combat-auto-policy-system.js) — game.grimoireRules a
   TOUJOURS cette longueur, voir ensureGrimoireRules(). Le nombre
   RÉELLEMENT débloqué (potentiellement inférieur) est calculé à la
   volée par getGrimoireSlotCount(game.worldsEverReached), jamais
   stocké séparément (une seule source de vérité : worldsEverReached). */
var GRIMOIRE_SLOT_COUNT = 6;

/* S'assure que game.grimoireRules existe et a EXACTEMENT
   GRIMOIRE_SLOT_COUNT entrées (le maximum théorique, PAS le nombre
   débloqué — voir en-tête de fichier), sans jamais écraser une règle
   déjà configurée (même contrat que les autres ensure() du projet,
   voir ClassCombatManager.ensure() pour le précédent). Complète avec
   des slots vides { conditionId: null, actionSlot: null } si
   nécessaire, tronque si trop d'entrées (ex. sauvegarde d'une version
   future avec plus de slots, chargée sur une build qui n'en gère que 6). */
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

/* v3.65.0 : collection de PRESETS nommés (Phase 5) — voir en-tête de
   fichier. game.grimoirePresets : tableau de
   { id, name, icon, rules, lastModified } — id unique généré côté
   client (timestamp + compteur, pas besoin d'UUID pour un usage aussi
   local). rules a EXACTEMENT le même format que game.grimoireRules
   (6 entrées { conditionId, actionSlot }), toujours passé par
   sanitizeGrimoireRules() avant stockage pour ne jamais enregistrer
   une entrée corrompue dans un preset. */
var GRIMOIRE_PRESET_MAX_COUNT = 6;

/* Icônes proposées au joueur au moment de nommer un preset — simple
   sélection parmi un petit set fixe (pas d'upload/choix libre, cohérent
   avec le reste du jeu qui n'expose jamais de picker d'icône complexe). */
var GRIMOIRE_PRESET_ICON_CHOICES = ["⚔️", "🛡️", "🏹", "🔮", "👑", "🌲", "🏜️", "🗿"];

/* S'assure que game.grimoirePresets existe (tableau, jamais undefined)
   — même contrat que ensureGrimoireRules(), ne mute jamais un état
   déjà présent. */
function ensureGrimoirePresets() {
  if (!Array.isArray(game.grimoirePresets)) game.grimoirePresets = [];
  return game.grimoirePresets;
}

/* Génère un id unique simple pour un nouveau preset — timestamp +
   compteur incrémental en cas de 2 créations dans la même milliseconde
   (peu probable ici mais coûte rien à garder). */
var _grimoirePresetIdCounter = 0;
function generateGrimoirePresetId() {
  _grimoirePresetIdCounter++;
  return "preset_" + Date.now() + "_" + _grimoirePresetIdCounter;
}

/* Enregistre la config ACTIVE (game.grimoireRules) comme nouveau
   preset nommé — appelée depuis le petit formulaire inline (voir
   buildGrimoirePresetCreateFormHTML()). Ne fait rien si le nom est
   vide (après trim) ou si la limite GRIMOIRE_PRESET_MAX_COUNT est déjà
   atteinte (garde silencieuse côté logique, le bouton est de toute
   façon désactivé côté UI dans ce cas — voir buildGrimoireHTML()). */
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

/* Charge un preset dans la config ACTIVE (game.grimoireRules) —
   ÉCRASE totalement la config actuelle, sans fusion. Appelée
   uniquement après confirmation (voir confirmLoadGrimoirePreset()
   plus bas) : cette fonction elle-même ne demande jamais de
   confirmation, c'est la responsabilité de l'appelant UI. */
function loadGrimoirePreset(presetId) {
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

/* v3.65.0 : demande confirmation avant d'écraser la config active —
   décision actée avec Seb : "Demander confirmation avant d'écraser la
   config active", pour ne jamais perdre un réglage en cours qui n'a
   pas encore été enregistré comme preset. Même pattern que
   resetCombatReport() (ui/combat-report-view.js) : showConfirmModal()
   avant d'agir. */
function confirmLoadGrimoirePreset(presetId) {
  var presets = ensureGrimoirePresets();
  var preset = presets.filter(function (p) { return p.id === presetId; })[0];
  if (!preset) return;

  showConfirmModal(
    "Charger « " + preset.name + " » ?",
    "Les 6 règles actuellement configurées seront remplacées par celles de ce preset. Enregistre ta configuration actuelle comme preset avant de continuer si tu veux la garder.",
    preset.icon || "📖",
    function () { loadGrimoirePreset(presetId); }
  );
}

/* Supprime un preset après confirmation — même pattern que
   confirmLoadGrimoirePreset() ci-dessus. */
function confirmDeleteGrimoirePreset(presetId) {
  var presets = ensureGrimoirePresets();
  var preset = presets.filter(function (p) { return p.id === presetId; })[0];
  if (!preset) return;

  showConfirmModal(
    "Supprimer « " + preset.name + " » ?",
    "Cette action est irréversible. Le preset sera définitivement supprimé (la config actuellement active n'est pas affectée).",
    "🗑️",
    function () {
      game.grimoirePresets = presets.filter(function (p) { return p.id !== presetId; });
      saveGame();
      if (typeof renderPanel === "function") renderPanel();
    }
  );
}

/* v3.65.0 : suggestion contextuelle SIMPLE (Phase 5, facultatif dans
   la feuille de route mais inclus dès cette livraison à la demande de
   Seb) — jamais de sélection automatique, juste un badge informatif.
   Match par MOT-CLÉ : le nom du monde courant (WorldManager.worldIndex)
   est simplifié (1er mot significatif du nom, ex. "Forêt enchantée" ->
   "forêt", "Ruines oubliées" -> "ruines") et comparé en minuscules à
   une SOUS-CHAÎNE du nom de chaque preset — assez permissif pour
   matcher "Farm Forêt" ou "Boss Forêt" sans exiger un format strict.
   Retourne le PREMIER preset dont le nom contient ce mot-clé, ou null
   si aucun monde résolu ou aucune correspondance. Ne mute rien. */
function getSuggestedGrimoirePreset() {
  var presets = ensureGrimoirePresets();
  if (!presets.length) return null;
  if (typeof WORLDS === "undefined" || !window.WorldManager) return null;

  var world = WORLDS[WorldManager.worldIndex];
  if (!world || !world.name) return null;

  // 1er mot du nom de monde, en minuscules (ex. "Forêt enchantée" -> "forêt").
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

/* Kit d'actions de la classe du héros COURANT, ou null si aucune
   classe résolue (aucun héros choisi) — même source que
   ClassCombatManager.getAction(), pas dupliquée mais lue directement
   ici pour éviter un aller-retour objet par slot. */
function getGrimoireCurrentKit() {
  if (!window.ClassCombatManager || typeof ClassCombatManager.getCurrentClassId !== "function") return null;
  var classId = ClassCombatManager.getCurrentClassId();
  if (!classId || typeof getClassSkills !== "function") return null;
  return getClassSkills(classId);
}

/* Libellé du monde dont atteindre la première fois débloque LE slot
   d'index donné (index >= GRIMOIRE_BASE_SLOT_COUNT uniquement) — pour
   le message affiché sur une carte verrouillée ("Débloqué en
   atteignant Ruines pour la première fois"). Retourne null pour un
   slot de base (jamais verrouillé) ou un index hors plage. */
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
      + esc(cond.icon) + ' ' + esc(cond.label) + '</option>';
  });
  return h;
}

/* v3.52.0 : conditionId (optionnel) — si fourni, les actions dont
   action.counters inclut CETTE condition sont marquées d'une icône ⚡
   dans leur libellé (ex. "⚡ Brise-garde"), pour que le joueur
   comprenne visuellement quelles actions contrent la situation
   choisie dans le sélecteur "Si...". Purement informatif ici (aucune
   logique dupliquée — la vraie vérification reste dans
   ClassCombatManager.applyGrimoireCounterIfApplicable(), ce marquage
   ne fait QUE lire le même champ action.counters en lecture seule). */
function buildGrimoireActionOptionsHTML(kit, selectedSlot, conditionId) {
  var h = '<option value="">— Choisir une action —</option>';
  if (!kit || !kit.actions) return h;

  GRIMOIRE_ASSIGNABLE_SLOTS.forEach(function (slot) {
    var action = kit.actions[slot];
    if (!action) return;
    var isCounter = !!(conditionId && Array.isArray(action.counters) && action.counters.indexOf(conditionId) !== -1);
    h += '<option value="' + esc(slot) + '"' + (selectedSlot === slot ? ' selected' : '') + '>'
      + (isCounter ? '⚡ ' : '') + esc(action.label) + '</option>';
  });
  return h;
}

/* v3.51.0 : locked=true pour un slot pas encore débloqué (index >=
   nombre de slots réellement débloqués) — affiché GRISÉ (sélecteurs
   désactivés, mais valeurs déjà choisies par le joueur restent
   VISIBLES, pas cachées) plutôt que masqué, avec le nom du monde qui
   le débloquera. Cohérent avec le principe "jamais un mur silencieux"
   déjà appliqué ailleurs dans le Grimoire (repli de
   chooseGrimoireAction) : le joueur voit toujours ce qui l'attend. */
/* v3.66.0 : libellés courts pour chaque code retourné par
   explainGrimoireRuleStatus() — l'INDICE simple toujours visible
   (icône + texte court), quel que soit le Mode Expert. */
var GRIMOIRE_RULE_STATUS_LABELS = {
  no_condition: { icon: "⬜", text: "Règle vide" },
  no_action: { icon: "⬜", text: "Aucune action assignée" },
  unknown_action: { icon: "⚠️", text: "Action introuvable" },
  condition_false: { icon: "⏳", text: "En attente" },
  resource_insufficient: { icon: "🔋", text: "Ressource insuffisante" },
  on_cooldown: { icon: "⌛", text: "En recharge" },
  action_condition_unmet: { icon: "🚫", text: "Condition de l'action non remplie" },
  ready: { icon: "🔵", text: "Prête" }
};

/* v3.66.0 : construit le bloc de statut d'une règle — INDICE simple
   toujours affiché (icône + libellé court), DÉTAIL chiffré complet
   affiché seulement si game.expertModeEnabled est vrai. Calculé via
   explainGrimoireRuleStatus() (systems/combat-auto-policy-system.js,
   logique pure) — ce fichier ne fait QUE mettre en forme le résultat.
   Retourne une chaîne vide pour une règle verrouillée (locked) ou
   incomplète (no_condition/no_action) : rien d'utile à diagnostiquer
   tant que la règle elle-même n'est pas configurée. */
function buildGrimoireRuleStatusHTML(rule, kit, locked) {
  if (locked) return "";
  if (typeof explainGrimoireRuleStatus !== "function" || !window.ClassCombatManager) return "";

  var resourceState = (typeof ClassCombatManager.ensureForCurrentClass === "function")
    ? ClassCombatManager.ensureForCurrentClass()
    : null;
  var combatContext = (typeof ClassCombatManager.getGrimoireCombatContext === "function")
    ? ClassCombatManager.getGrimoireCombatContext()
    : {};

  // v3.67.0 : enemyAttackIncoming n'a PAS de _XNextAt/_XTimer sur
  // game.enemy (voir la note de ClassCombatManager.
  // getSecondsUntilPatternTrigger()) — son propre temps restant vient
  // de getSecondsUntilNextEnemyAttack() (déjà calculé dans
  // combatContext.secondsUntilEnemyAttack par getGrimoireCombatContext(),
  // pas besoin d'un second appel ici).
  var secondsUntilTrigger = (rule.conditionId === "enemyAttackIncoming")
    ? (typeof combatContext.secondsUntilEnemyAttack === "number" ? combatContext.secondsUntilEnemyAttack : null)
    : ((typeof ClassCombatManager.getSecondsUntilPatternTrigger === "function")
      ? ClassCombatManager.getSecondsUntilPatternTrigger(rule.conditionId)
      : null);

  var status = explainGrimoireRuleStatus(rule, kit, resourceState, game.classCooldowns, combatContext, secondsUntilTrigger);
  if (status.code === "no_condition" || status.code === "no_action") return "";

  var labelInfo = GRIMOIRE_RULE_STATUS_LABELS[status.code] || { icon: "❔", text: status.code };

  var h = '<div class="grimoire-rule-status grimoire-rule-status-' + esc(status.code) + '">';
  h += '<span class="grimoire-rule-status-badge">' + labelInfo.icon + ' ' + esc(labelInfo.text) + '</span>';

  if (game.expertModeEnabled) {
    var detailParts = [];

    if (rule.conditionId === "heroLowHp") {
      detailParts.push("Seuil : PV ≤ " + Math.round((typeof HERO_LOW_HP_THRESHOLD_PCT === "number" ? HERO_LOW_HP_THRESHOLD_PCT : 0.40) * 100) + "%");
    } else if (rule.conditionId === "enemyAttackIncoming") {
      // v3.67.0 : pas un vrai "télégraphe" (voir en-tête de data/
      // grimoire-conditions.js) — libellé distinct pour rester honnête
      // avec le joueur expert sur ce que ce chiffre représente vraiment.
      detailParts.push("Seuil : ≤ " + ENEMY_ATTACK_ANTICIPATION_THRESHOLD_S + "s avant l'attaque");
      if (status.secondsUntilTrigger !== null) {
        detailParts.push("Prochaine attaque dans ~" + status.secondsUntilTrigger.toFixed(1) + "s");
      }
    } else if (status.secondsUntilTrigger !== null) {
      detailParts.push("Prochain télégraphe dans ~" + status.secondsUntilTrigger.toFixed(1) + "s");
    }

    if (status.resourceCost !== null && status.resourceCost > 0) {
      detailParts.push("Ressource : " + Math.floor(status.resourceCurrent != null ? status.resourceCurrent : 0) + " / " + status.resourceCost + " requis");
    }

    if (status.cooldownRemainingMs !== null && status.cooldownRemainingMs > 0) {
      detailParts.push("Recharge : " + (status.cooldownRemainingMs / 1000).toFixed(1) + "s restantes");
    }

    if (detailParts.length) {
      h += '<p class="panel-sub grimoire-rule-status-detail">' + esc(detailParts.join(" · ")) + '</p>';
    }
  }

  h += '</div>';
  return h;
}

window.buildGrimoireRuleStatusHTML = buildGrimoireRuleStatusHTML;

function buildGrimoireRuleCardHTML(index, rule, kit, locked) {
  var cond = getGrimoireCondition(rule.conditionId);
  var action = (kit && kit.actions && rule.actionSlot) ? kit.actions[rule.actionSlot] : null;
  // v3.52.0 : la règle EST un contre valide si l'action assignée
  // déclare rule.conditionId dans ses counters — même lecture que
  // ClassCombatManager.applyGrimoireCounterIfApplicable() au moment
  // réel du combat, ici seulement pour l'affichage informatif.
  var isActiveCounter = !!(action && rule.conditionId && Array.isArray(action.counters) && action.counters.indexOf(rule.conditionId) !== -1);
  // v3.53.0 : libellés de TOUT ce que l'action assignée contre, quelle
  // que soit la condition actuellement choisie dans "Si..." — visible
  // même AVANT ou en dehors d'une combinaison qui matche déjà, pour
  // que le joueur comprenne le potentiel de son choix sans deviner.
  var counterLabels = (action && typeof getGrimoireCounterLabels === "function") ? getGrimoireCounterLabels(action) : [];

  // v3.70.0 : même principe que counterLabels/isActiveCounter ci-dessus,
  // mais pour les effets d'ARCHÉTYPE (Enragé/Corrupteur) — table
  // PARALLÈLE (voir getArchetypeEffectConditionId(), systems/class-
  // combat-system.js), jamais fusionnée avec le mécanisme de contre :
  // ce n'est PAS un contre qui annule un événement, juste un effet
  // supplémentaire qui s'ajoute aux dégâts normaux de l'action.
  var archetypeConditionId = (action && typeof getArchetypeEffectConditionId === "function") ? getArchetypeEffectConditionId(action) : null;
  var archetypeCond = archetypeConditionId ? getGrimoireCondition(archetypeConditionId) : null;
  var isActiveArchetypeEffect = !!(archetypeConditionId && rule.conditionId === archetypeConditionId);

  var h = '<div class="panel-card grimoire-rule-card' + (locked ? ' grimoire-rule-locked' : '') + '">';
  h += '<h3>Règle ' + (index + 1) + (locked ? ' 🔒' : '') + '</h3>';

  // v3.66.0 : indice de statut (toujours visible) + détail chiffré si
  // Mode Expert actif — voir buildGrimoireRuleStatusHTML(). Placé
  // avant les sélecteurs "Si.../Alors..." pour que le joueur voie
  // d'abord l'état actuel de la règle avant de potentiellement l'éditer.
  h += buildGrimoireRuleStatusHTML(rule, kit, locked);

  if (locked) {
    var worldLabel = getGrimoireUnlockWorldLabel(index);
    h += '<p class="panel-sub">'
      + (worldLabel ? 'Débloquée en atteignant ' + esc(worldLabel) + ' pour la première fois.' : 'Débloquée plus tard dans ta progression.')
      + '</p>';
  }

  h += '<label class="grimoire-field-label">Si...</label>';
  h += '<select class="grimoire-select" onchange="setGrimoireRuleCondition(' + index + ', this.value)"' + (locked ? ' disabled' : '') + '>';
  h += buildGrimoireConditionOptionsHTML(rule.conditionId);
  h += '</select>';
  if (cond) {
    h += '<p class="panel-sub grimoire-condition-desc">' + esc(cond.description) + '</p>';
  }

  h += '<label class="grimoire-field-label">Alors...</label>';
  h += '<select class="grimoire-select" onchange="setGrimoireRuleAction(' + index + ', this.value)"' + ((!kit || locked) ? ' disabled' : '') + '>';
  h += buildGrimoireActionOptionsHTML(kit, rule.actionSlot, rule.conditionId);
  h += '</select>';
  if (!kit) {
    h += '<p class="panel-sub">Choisis d\'abord un héros pour assigner une action.</p>';
  } else if (action) {
    h += '<p class="panel-sub grimoire-action-desc">' + esc(action.description) + '</p>';
    if (counterLabels.length && !isActiveCounter) {
      // v3.53.0 : action a un potentiel de contre, mais la condition
      // choisie actuellement (ou aucune) ne matche pas — indication
      // discrète (pas l'encadré doré réservé à la combinaison ACTIVE
      // ci-dessous) pour orienter le joueur sans fausse promesse.
      h += '<p class="panel-sub">⚡ Cette action contre aussi : ' + esc(counterLabels.join(", ")) + '</p>';
    }
    if (archetypeCond && !isActiveArchetypeEffect) {
      // v3.70.0 : même principe informatif, icône dédiée (🌀, distincte
      // du ⚡ des contres classiques) pour ne jamais laisser croire que
      // c'est une annulation — voir isActiveArchetypeEffect ci-dessous
      // pour la combinaison ACTIVE (encadré dédié).
      h += '<p class="panel-sub">🌀 Cette action a aussi un effet spécial contre : ' + esc(archetypeCond.label) + '</p>';
    }
  }
  if (isActiveCounter) {
    h += '<p class="panel-sub grimoire-counter-active">⚡ Cette action CONTRE la situation choisie : elle annulera complètement l\'attaque adverse si elle est utilisée à temps.</p>';
  }
  if (isActiveArchetypeEffect) {
    // v3.70.0 : encadré dédié (classe CSS distincte de grimoire-counter-
    // active) — texte volontairement différent : "en plus de ses dégâts
    // normaux" plutôt que "annulera l'attaque", pour rester honnête sur
    // la nature de l'effet (réduction/purge, pas une annulation).
    h += '<p class="panel-sub grimoire-archetype-active">🌀 Cette action a un effet spécial contre cette situation, en plus de ses dégâts normaux.</p>';
  }

  h += '</div>';
  return h;
}

/* v3.65.0 : carte d'un preset existant — nom/icône/date, badge de
   suggestion contextuelle si ce preset matche getSuggestedGrimoirePreset(),
   boutons Charger/Supprimer. */
function buildGrimoirePresetCardHTML(preset, isSuggested) {
  var dateLabel = preset.lastModified
    ? new Date(preset.lastModified).toLocaleDateString()
    : "";

  var h = '<div class="panel-card grimoire-preset-card">';
  h += '<div class="grimoire-preset-header">';
  h += '<span class="grimoire-preset-icon">' + esc(preset.icon || "📖") + '</span>';
  h += '<span class="grimoire-preset-name">' + esc(preset.name) + '</span>';
  if (isSuggested) {
    h += '<span class="grimoire-preset-suggested" title="Suggéré pour le monde actuel">💡</span>';
  }
  h += '</div>';
  if (dateLabel) {
    h += '<p class="panel-sub grimoire-preset-date">Modifié le ' + esc(dateLabel) + '</p>';
  }
  h += '<div class="grimoire-preset-actions">';
  h += '<button class="settings-btn grimoire-preset-load-btn" type="button" onclick="confirmLoadGrimoirePreset(\'' + esc(preset.id) + '\')">Charger</button>';
  h += '<button class="settings-btn grimoire-preset-delete-btn" type="button" onclick="confirmDeleteGrimoirePreset(\'' + esc(preset.id) + '\')">🗑️</button>';
  h += '</div>';
  h += '</div>';
  return h;
}

/* v3.65.0 : petit formulaire inline pour enregistrer la config
   ACTIVE comme nouveau preset — input texte (même pattern que
   #player-name-input, ui/modal-view.js) + choix d'icône parmi
   GRIMOIRE_PRESET_ICON_CHOICES. Masqué (retourne une chaîne vide) si
   la limite GRIMOIRE_PRESET_MAX_COUNT est déjà atteinte — affiche à
   la place un message explicite (voir buildGrimoireHTML()). */
function buildGrimoirePresetCreateFormHTML() {
  var h = '<div class="grimoire-preset-create-form">';
  h += '<input id="grimoire-preset-name-input" type="text" maxlength="30" placeholder="Nom du preset (ex. Farm Forêt)">';
  h += '<div class="grimoire-preset-icon-picker">';
  GRIMOIRE_PRESET_ICON_CHOICES.forEach(function (icon, index) {
    h += '<label class="grimoire-preset-icon-choice">';
    h += '<input type="radio" name="grimoire-preset-icon" value="' + esc(icon) + '"' + (index === 0 ? ' checked' : '') + '>';
    h += '<span>' + esc(icon) + '</span>';
    h += '</label>';
  });
  h += '</div>';
  h += '<button class="settings-btn primary" type="button" onclick="handleSaveGrimoirePresetClick()">💾 Enregistrer comme preset</button>';
  h += '</div>';
  return h;
}

/* Lit le formulaire inline (nom + icône sélectionnée) et délègue à
   saveGrimoirePreset() — séparée en fonction dédiée pour garder le
   onclick="..." simple (pas de lecture directe du DOM dans le HTML). */
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

function buildGrimoireHTML() {
  ensureGrimoireRules();
  var kit = getGrimoireCurrentKit();
  var unlockedCount = (typeof getGrimoireSlotCount === "function") ? getGrimoireSlotCount(game.worldsEverReached) : GRIMOIRE_SLOT_COUNT;

  var h = '<div class="panel-card">';
  h += '<h3>📖 Grimoire de tactiques</h3>';
  h += '<p class="panel-sub">Programme des règles pour ton combat automatique : si une situation se présente, ton héros utilisera l\'action choisie en priorité. Les règles s\'ajoutent au comportement automatique habituel — s\'il n\'y a pas de règle applicable, ton héros continue de se battre normalement.</p>';
  h += '<p class="panel-sub">⚡ Certaines actions marquées d\'un éclair CONTRENT complètement une situation (annulent l\'attaque adverse) si tu les assignes à la bonne condition — regarde les actions disponibles une fois une condition choisie.</p>';
  h += '<p class="panel-sub">🔓 ' + unlockedCount + ' / ' + GRIMOIRE_SLOT_COUNT + ' règles débloquées. De nouvelles règles se débloquent en atteignant de nouveaux mondes pour la première fois.</p>';

  // v3.62.0 : accès au rapport post-combat (étape 4.1, voir systems/
  // combat-report-system.js) — déplacé ici depuis l'écran Combat
  // (v3.61.0) : le Grimoire est l'endroit où on configure les règles,
  // donc l'endroit où on veut vérifier si elles marchent. Le rapport
  // est CUMULATIF (aucun reset automatique) — ce bouton rouvre à tout
  // moment les données accumulées depuis le dernier reset manuel.
  h += '<button class="settings-btn" type="button" onclick="openCombatReport(\'manual\', null)">📊 Voir le rapport de combat</button>';

  h += '</div>';

  // v3.65.0 : section des PRESETS (Phase 5) — liste des presets
  // enregistrés (avec badge de suggestion contextuelle), puis
  // formulaire d'enregistrement de la config active (masqué si la
  // limite est atteinte). Placée AVANT les règles elles-mêmes : le
  // joueur voit d'abord "quel profil charger" avant de potentiellement
  // éditer les 6 règles à la main.
  var presets = ensureGrimoirePresets();
  var suggestedPreset = (typeof getSuggestedGrimoirePreset === "function") ? getSuggestedGrimoirePreset() : null;

  h += '<div class="panel-card grimoire-presets-section">';
  h += '<h3>💾 Presets</h3>';
  h += '<p class="panel-sub">Sauvegarde ta configuration de règles sous un nom, pour la retrouver rapidement selon le contexte (farm, boss, donjon...).</p>';

  if (presets.length) {
    presets.forEach(function (preset) {
      h += buildGrimoirePresetCardHTML(preset, !!(suggestedPreset && suggestedPreset.id === preset.id));
    });
  } else {
    h += '<p class="panel-sub">Aucun preset enregistré pour l\'instant.</p>';
  }

  if (presets.length >= GRIMOIRE_PRESET_MAX_COUNT) {
    h += '<p class="panel-sub">Limite de ' + GRIMOIRE_PRESET_MAX_COUNT + ' presets atteinte — supprime-en un pour en enregistrer un nouveau.</p>';
  } else {
    h += buildGrimoirePresetCreateFormHTML();
  }

  h += '</div>';

  // v3.66.0 : toggle Mode Expert (Phase 6) — carte dédiée, juste après
  // les Presets (emplacement demandé par Seb). Le libellé du bouton
  // reflète l'état actuel (activé/désactivé), même pattern que les
  // autres toggles du jeu (voir ui/settings-view.js pour la convention).
  h += '<div class="panel-card grimoire-expert-mode-section">';
  h += '<h3>🔬 Mode Expert</h3>';
  h += '<p class="panel-sub">Affiche les seuils chiffrés réels (ressource, recharge, temps avant une attaque adverse) sur chaque règle, en plus de l\'indice simple toujours visible.</p>';
  h += '<button class="settings-btn' + (game.expertModeEnabled ? ' primary' : '') + '" type="button" onclick="toggleGrimoireExpertMode()">'
    + (game.expertModeEnabled ? '✅ Mode Expert activé' : '⬜ Activer le Mode Expert') + '</button>';
  h += '</div>';

  h += '<div class="panel-card">';
  // v3.54.0 : message informatif sur la RÉSERVE de ressource — sans
  // ça, le joueur ne comprend pas pourquoi son combat auto "ralentit"
  // dès qu'une règle de contre est configurée en 1ère position. Calcul
  // identique à getGrimoireCounterReserveAmount() (systems/combat-
  // auto-policy-system.js), lu ici en LECTURE SEULE sur les règles
  // débloquées uniquement (mêmes règles que celles réellement
  // utilisées par ClassCombatManager.tickAutoSkills()).
  // v3.63.0 : filtré par compatibilité ennemi/condition (voir
  // isConditionPossibleForEnemy(), combat-auto-policy-system.js) —
  // le message ne s'affiche plus si la règle la plus prioritaire vise
  // un pattern impossible pour l'ennemi ACTUELLEMENT affiché (ex.
  // Garde contre Charge alors qu'un boss est affiché), cohérent avec
  // le fait que la réserve réelle ne s'applique plus non plus dans ce
  // cas. game.enemy peut être absent (écran consulté hors combat) :
  // getGrimoireCounterReserveAmount() gère déjà ce cas normalement
  // (isConditionPossibleForEnemy() retourne false pour tout pattern
  // ennemi sans ennemi, le message ne s'affiche alors pas non plus).
  if (kit) {
    var activeRulesForReserve = (Array.isArray(game.grimoireRules) && game.grimoireRules.length)
      ? game.grimoireRules.slice(0, unlockedCount)
      : [];
    var reserveAmount = (typeof getGrimoireCounterReserveAmount === "function")
      ? getGrimoireCounterReserveAmount(activeRulesForReserve, kit, game.enemy)
      : 0;
    if (reserveAmount > 0 && kit.resource) {
      h += '<p class="panel-sub">🔒 Ton héros réserve ' + reserveAmount + ' / ' + kit.resource.max + ' ' + esc(kit.resource.label)
        + ' pour garantir ta règle de contre la plus prioritaire — le combat automatique par défaut jouera moins d\'actions coûteuses en attendant.</p>';
    }
  }

  h += '</div>';

  if (!game.autoSkillsEnabled) {
    h += '<div class="panel-card grimoire-warning-card">';
    h += '<p class="panel-sub">⚠️ Le combat automatique est désactivé (voir Paramètres) — les règles ci-dessous seront ignorées tant qu\'il ne l\'est pas.</p>';
    h += '</div>';
  }

  game.grimoireRules.forEach(function (rule, index) {
    h += buildGrimoireRuleCardHTML(index, rule, kit, index >= unlockedCount);
  });

  return '<div class="nb-page-frame">' + h + '</div>';
}

/* Met à jour la condition d'un slot — remise à zéro de l'action
   assignée NON effectuée ici (une action déjà choisie reste valide
   quelle que soit la condition, les 2 champs sont indépendants). */
function setGrimoireRuleCondition(index, conditionId) {
  ensureGrimoireRules();
  if (!game.grimoireRules[index]) return;
  game.grimoireRules[index].conditionId = conditionId || null;
  saveGame();
  if (typeof renderPanel === "function") renderPanel();
}

function setGrimoireRuleAction(index, actionSlot) {
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
