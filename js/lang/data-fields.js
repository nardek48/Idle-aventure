"use strict";
/* js/lang/data-fields.js — v3.374.0 (lot L-6) : REGISTRE DES TEXTES DES DONNÉES.
   Non chargé par le jeu : lu par sim/i18n-audit.js et par round-harness.js.

   Chaque texte des fichiers js/data/ qui s'affiche au joueur est déclaré ici. Le jeu, lui, le
   traduit à l'affichage avec _td(texte) : la donnée et la sauvegarde restent en français (noms
   d'objets, trophées, titres portés…), seule la lecture change de langue (D1, option B).

   FORMAT : { VARIABLE_GLOBALE: [chemins] }
     - un chemin descend dans l'objet, segment par segment : "steps.*.title" ;
     - « * » = n'importe quelle clé (ou n'importe quel index de tableau) à ce niveau ;
     - « ** » = n'importe quelle profondeur (zéro niveau ou plus) ;
     - le chemin vide "" = la variable elle-même (une chaîne, ou une liste/table de chaînes) ;
     - si le chemin aboutit à une liste ou à un objet, toutes les chaînes qu'il contient sont du texte
       (répliques, listes de noms, journaux par profondeur…).

   RÈGLE POUR LA SUITE : un texte nouveau dans les données va dans un champ déjà déclaré (name, desc,
   title, text…). Un champ nouveau s'ajoute ici. Le harnais [150] signale toute chaîne française des
   données qui n'est couverte par aucun chemin (sauf les exceptions listées plus bas). */

var DATA_TEXT_FIELDS = {
  /* --- Hauts faits --- */
  ACHIEVEMENTS_DB: ["*.name", "*.desc", "*.hint", "*.title"],
  ACHIEVEMENTS_RETIRED: ["*.name", "*.desc"],
  ACHIEVEMENT_CATEGORIES: ["*.label", "*.tierRewards.*.title"],
  ACHIEVEMENT_CATEGORY_LABELS: ["*"],

  /* --- Quêtes, Histoire, village --- */
  ADVENTURE_QUESTS: ["*.name", "*.story", "*.bossLog", "*.bossPhases.*.label", "*.bossPhases.*.line", "*.steps.*.desc"],
  HUNT_QUESTS: ["*.name", "*.story"],
  STORY_QUESTS: [
    "*.title", "*.subtitle", "*.endText",
    "*.steps.*.title", "*.steps.*.act", "*.steps.*.objectiveLabel",
    "*.steps.*.narrative.objective", "*.steps.*.narrative.completion",
    "*.steps.*.narrative.dialogue.*.text", "*.steps.*.narrative.dialogue.*.who",
    "*.steps.*.narrative.completionDialogue.*.text", "*.steps.*.narrative.completionDialogue.*.who",
    "*.steps.*.tutorial.title", "*.steps.*.tutorial.points.*.text",
    "*.steps.*.choice.title", "*.steps.*.choice.text", "*.steps.*.choice.buttonLabel",
    "*.steps.*.choice.options.*.label", "*.steps.*.choice.options.*.desc",
    "*.steps.*.offeringUi.buttonLabel", "*.steps.*.offeringUi.doneToast", "*.steps.*.offeringUi.lackToast", "*.steps.*.offeringUi.log",
    "*.steps.*.linkTo.label", "*.steps.*.killTarget.label",
    "*.steps.*.reward.equipmentItem.byClass.*.name"
  ],
  STORY_REWARDS: ["*.equipmentItem.byClass.*.name"],
  STORY_STARTER_WEAPON: ["byClass.*.name"],
  STORY_TAB_LABELS: ["*"],
  STORY_MADDOC_GREETING: ["*"],
  VILLAGE_QUESTS: ["*.title", "*.objectiveLabel", "*.narrative.objective", "*.narrative.completion", "*.tutorial.title", "*.tutorial.points.*.text"],
  WORKSHOP_UNLOCK_STEPS: ["*.label", "*.narrative.objective", "*.narrative.completion"],
  TAVERN_CONTRACT_TEMPLATES: ["*.title"],

  /* --- Combat, ennemis, compagnons --- */
  ENEMY_DB: ["*.name", "*.lore"],
  BOSS_DB: ["*.name", "*.lore"],
  ELITE_DB: ["*.name", "*.lore"],
  ELITE_UNIQUE_LOOT: ["*.item.name", "*.byClass.*.name"],
  ELITE_UNIQUE_LOOT_LABELS: ["*"],
  BOSS_MOMENTS: ["*.title", "*.intro", "*.phase", "*.death"],
  COMBAT_STATES: ["*.nom", "*.mot", "*.desc", "*.hint", "*.descSuppressed"],
  COMBAT_STATE_FAMILIES: ["*.titre"],
  CLASSES: ["*.label", "*.resource.label"],
  CLASS_SKILLS: ["*.actions.*.label", "*.actions.*.description", "*.resource.label"],
  HEROES_DB: ["*.name"],
  GRIMOIRE_CONDITIONS: ["*.label", "*.description"],
  COMPANIONS_DB: ["*.name", "*.lines", "*.skill.name", "*.skill.desc",
    "*.voies.*.label", "*.voies.*.short", "*.voies.*.desc", "*.voies.*.lines", "*.voies.*.skill.name", "*.voies.*.skill.desc"],
  COMPANION_ROLE_LABELS: ["*"],
  COMPANION_HEAL_THRESHOLDS: ["*.label", "*.desc"],
  COMPANION_HEAL_PRIORITIES: ["*.label", "*.desc"],
  PATROL_STORIES: [""],
  TALENT_TREES: ["*.trunk.*.name", "*.trunk.*.short", "*.trunk.*.effect",
    "*.paths.*.name", "*.paths.*.tag", "*.paths.*.nodes.*.name", "*.paths.*.nodes.*.short", "*.paths.*.nodes.*.effect"],

  /* --- Équipement, objets, économie --- */
  EQUIPMENT_SLOT_LABELS: ["*"],
  EQUIPMENT_SLOT_CONFIG: ["*.names", "*.namesByIcon"],
  EQUIP_SHOP_STARTER: ["*.name"],
  RARITY_LABELS: ["*"],
  RPG_STAT_LABELS: ["*"],
  LEGENDARY_POWERS: ["*.*.label", "*.*.desc"],
  LEGENDARY_POWER_BY_ID: ["*.label", "*.desc"],
  SET_BONUS_CONFIG: ["tiers.*.bonuses.*.name"],
  POTIONS_DB: ["*.name", "*.desc"],
  HEALING_POTIONS_DB: ["*.name"],
  UPGRADES: ["*.name", "*.desc"],
  DUNGEONS: ["*.name", "*.desc", "*.story", "*.lockedHint", "*.boss.name", "*.boss.phases.*.label"],
  DUNGEON_MARKS: ["*.name", "*.desc"],
  DUNGEON_SHOP: ["*.name", "*.desc"],
  MEMORY_LEVELS: ["*.theme", "*.options.*.name", "*.options.*.desc"],

  /* --- Village et production --- */
  WAREHOUSE_RESOURCES: ["*.name", "*.desc", "*.sourceHint", "*.worldName"],
  PRODUCTION_BUILDINGS: ["*.name", "*.desc"],
  PRODUCTION_PLOTS_BUILDINGS: ["*.sectionLabel", "*.zoneNamePrefix", "*.zoneNames", "*.improvementCost.*.label", "*.improvementCost.*.desc"],
  PRODUCTION_PLOTS_SHARED: ["profiles.*.label", "profiles.*.desc"],
  WORKSHOPS_CONFIG: ["*.name"],
  VILLAGE_BUILDINGS: ["*.name", "*.desc", "*.lockLabel"],
  CONSTRUCTION_BUILDINGS: ["*.name", "*.desc"],

  /* --- Mondes, cartes, expéditions --- */
  WORLDS: ["*.name", "*.adventures.*.name", "*.adventures.*.introText"],
  AMBIANCE_TEXTS: [""],
  LIVING_MAPS: ["*.name", "*.village.name", "*.landmarks.*.name", "*.sectors.*.name", "*.sectors.*.lore", "*.sectors.*.heldEffect.label", "*.words"],
  SCENE_NODES: ["obstacles.*.name", "obstacles.*.options.*.label"],
  SCENE_TEMPLATES: ["*.title", "*.departLabel", "*.parcours.steps.*.text", "*.parcours.steps.*.after"], // v3.390.0 : textes des étapes de parcours
  CODEX_ENTRIES: ["*.title", "*.text"],
  /* v3.381.0 (PA2-0) : Petites Aventures v2 (data/pa2-content.js) */
  PA2_ITEMS: ["*.name", "*.pro", "*.con", "*.lockedHint"],
  PA2_PACTS: ["*.name", "*.desc"],
  PA2_RELICS: ["*.name", "*.fx"],
  PA2_FOE_LINES: ["*"],
  PA2_OBSTACLE_LINES: ["*"],
  PA2_PLACES: ["*.name", "*.text"],
  PA2_RINGS: ["*.label"], // v3.388.0 : noms des anneaux (carte vivante)
  PA2_PLACES_BY_WORLD: ["*.*.name", "*.*.text"], // v3.387.0 (PA2-5)
  PA2_DESTS: ["*.*.name", "*.*.line", "*.*.win", "*.*.fail"],
  PA2_HOOKS: ["*.title", "*.lede", "*.event.name", "*.event.text", "*.event.branches.*.label", "*.event.branches.*.text",
    "*.campGift.text", "*.revenge.name", "*.revenge.line", "*.clairiere.*", "*.echo.*"],

  /* --- Hors js/data/ (DATA_TEXT_SOURCES) --- */
  RETIRED_UPGRADES: ["*.name"],                                   // core/state.js : remboursement des anciennes améliorations
  GENERIC_TUTORIALS: ["*.title", "*.points.*.text"],              // ui/tutorial-view.js : fenêtres « Compris »
  LivingMapManager: ["WORDS_DEFAULT"]                             // systems/living-map-system.js : mots de la carte par défaut
};

/* Tables de texte qui vivent hors de js/data/ (fichiers de code) : chargées aussi par l'audit. */
var DATA_TEXT_SOURCES = ["js/core/state.js", "js/ui/tutorial-view.js", "js/systems/living-map-system.js"];

/* Chaînes françaises des données qui ne sont PAS du texte affiché (ou déjà traduites autrement) :
   le harnais [150] ne les réclame pas. [variable, chemin exact ou motif]. */
var DATA_TEXT_IGNORED = {
  TALENT_CAP_BY_ACT: ["*.act"],       // chiffres romains d'acte, repris dans une phrase par WorldCaps.atAct
  TRAINING_CAP_BY_ACT: ["*.act"],
  WORLD_CAPS_DE: [""],                // gabarits déjà passés par _t() à la définition (world-caps.js)
  WORLD_CAPS_PREP: [""],
  TALENT_TREES: ["**.mods.*.path"],   // chemins techniques (« actions.defense.resourceGain »)
  STORY_QUESTS: ["*.steps.*.linkTo.cardId"],
  PA2_MAPS: ["**"]                    // v3.381.0 : identifiants de nœuds des tracés (« CAMP », « SEUIL »…)
};

if (typeof module !== "undefined") module.exports = { DATA_TEXT_FIELDS: DATA_TEXT_FIELDS, DATA_TEXT_IGNORED: DATA_TEXT_IGNORED, DATA_TEXT_SOURCES: DATA_TEXT_SOURCES };
