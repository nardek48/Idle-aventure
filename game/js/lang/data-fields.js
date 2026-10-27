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
  GRIMOIRE_TARGET_POLICIES: ["*.label", "*.desc"], // v3.428.0 (Ruines)
  STORY_SEUIL_TEXTS: ["*.completion", "*.dialogue.*.text", "*.dialogue.*.who"], // v3.428.0 (Ruines) : les deux branches du choix « seuil »
  STORY_PORTENT_TEXTS: ["*.completion", "*.dialogue.*.text", "*.dialogue.*.who"], // v3.452.0 (Crypte) : les deux branches du choix « portent »
  STORY_VEINE_TEXTS: ["*.completion", "*.dialogue.*.text", "*.dialogue.*.who"], // v3.488.0 (Montagne) : les deux branches du choix « veine »
  STORY_OUVRAGE_TEXTS: ["*.completion", "*.dialogue.*.text", "*.dialogue.*.who"], // v3.490.0 (Montagne) : les deux branches du choix « ouvrage »
  STORY_DROIT_TEXTS: ["*.completion", "*.text", "*.dialogue.*.text", "*.dialogue.*.who"], // v3.491.0 (Montagne) : le choix « droit » et la fin du chapitre
  STORY_PIOCHE_OPTIONS: ["*.label", "*.desc"], // v3.488.0 (Montagne, montagne_03) : « Deux sur cinq »
  STORY_DEUX_SUR_CINQ: [""],                   // v3.488.0 : le tutoriel, quatre ou cinq compagnons
  STORY_YSOLT_TEXTS: ["*.completion", "*.edda15", "*.dialogue.*.text", "*.dialogue.*.who"], // v3.455.0 (Crypte) : les deux branches du choix « ysolt »
  STORY_CHAINE_YS: ["*.donner", "*.garder"], // v3.456.0 (Crypte, acte IV) : répliques selon le choix « ysolt »
  STORY_BAT_TEXTS: ["*.completion", "*.aeswyn", "*.text", "*.*.*.text", "*.*.*.who", "*.aeswynDialogue.*.text", "*.aeswynDialogue.*.who", "*.dialogue.*.text", "*.dialogue.*.who"], // v3.456.0 : le choix « bat »
  LABYRINTH_TEXTS: [""], // v3.434.0 (Ruines, RU12) : le Labyrinthe aux leviers
  LABYRINTH_CONFIG: ["bossName"],
  STORY_SALLE_TEXTS: ["*.completion", "*.chaise", "*.dialogue.*.text", "*.dialogue.*.who"], // v3.431.0 (Ruines) : les deux branches du choix « salle »
  STORY_PLAN_TEXTS: ["*.completion", "*.dialogue.*.text", "*.dialogue.*.who", "suite.*.text", "suite.*.who"], // v3.433.0 (Ruines) : le plan et la fin du chapitre
  ADVENTURE_QUESTS: ["*.name", "*.story", "*.bossLog", "*.bossPhases.*.label", "*.bossPhases.*.line", "*.steps.*.desc", "*.encounterLines.*"],
  HUNT_QUESTS: ["*.name", "*.story"],
  STORY_QUESTS: [
    "*.title", "*.subtitle", "*.endText",
    "*.steps.*.title", "*.steps.*.act", "*.steps.*.objectiveLabel", "*.steps.*.hint",
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
  VILLAGE_MILESTONES: ["*.title"], // v3.509.0
  MILESTONE_BOOKS: ["*.title", "*.tips.*.1"],
  VILLAGE_QUESTS: ["*.title", "*.objectiveLabel", "*.narrative.objective", "*.narrative.completion", "*.tutorial.title", "*.tutorial.points.*.text"],
  WORKSHOP_UNLOCK_STEPS: ["*.label", "*.lockedHint", "*.narrative.objective", "*.narrative.completion"],
  TAVERN_CONTRACT_TEMPLATES: ["*.title"],

  /* --- Combat, ennemis, compagnons --- */
  ENEMY_DB: ["*.name", "*.lore"],
  BOSS_DB: ["*.name", "*.lore", "*.riseLine", "*.riseAdds.line", "*.risePhases.*.label", "*.risePhases.*.line"], // v3.433.0 : phases à la relève (le Maître d'œuvre)
  ELITE_DB: ["*.name", "*.lore"],
  ELITE_UNIQUE_LOOT: ["*.item.name", "*.byClass.*.name"],
  ELITE_UNIQUE_LOOT_LABELS: ["*"],
  BOSS_MOMENTS: ["*.title", "*.intro", "*.phase", "*.death"],
  COMBAT_STATES: ["*.nom", "*.mot", "*.desc", "*.hint", "*.descSuppressed"],
  COMBAT_STATES_SCREEN: ["*.nom", "*.mot", "*.desc", "*.hint"],
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
  PATROL_STORY_NARRATOR: [""], // v3.457.3 : compagnon hors de son monde
  TALENT_TREES: ["*.trunk.*.name", "*.trunk.*.short", "*.trunk.*.effect",
    "*.paths.*.name", "*.paths.*.tag", "*.paths.*.nodes.*.name", "*.paths.*.nodes.*.short", "*.paths.*.nodes.*.effect"],
  TALENT_COMMAND: ["name", "tag", "nodes.*.name", "nodes.*.short", "nodes.*.effect"], // v3.453.0 : voie du Commandement

  /* --- Équipement, objets, économie --- */
  EQUIPMENT_SLOT_LABELS: ["*"],
  EQUIPMENT_SLOT_CONFIG: ["*.names", "*.namesByIcon"],
  EQUIP_SHOP_STARTER: ["*.name"],
  RARITY_LABELS: ["*"],
  RPG_STAT_LABELS: ["*"],
  LEGENDARY_POWERS: ["*.*.label", "*.*.desc"],
  DUNGEON_UNIQUE_POWERS: ["*.label", "*.desc"], // v3.470.0
  LEGENDARY_POWER_BY_ID: ["*.label", "*.desc"],
  SET_BONUS_CONFIG: ["tiers.*.bonuses.*.name"],
  POTIONS_DB: ["*.name", "*.desc"],
  COMPANION_RELIC_FAMILIES: ["*.name"], // H4 : reliques des compagnons
  COMBAT_ITEMS: ["*.name", "*.desc", "*.con"], // v3.441.0 : objets de combat (v3.442.0 : contrepartie)
  HEALING_POTIONS_DB: ["*.name"],
  UPGRADES: ["*.name", "*.desc"],
  DUNGEONS: ["*.name", "*.desc", "*.story", "*.lockedHint", "*.prepHint", "*.boss.name", "*.boss.phases.*.label", "*.boss.riseLine", "*.boss.unique.name"],
  DUNGEON_MARKS: ["*.name", "*.desc"],
  DUNGEON_SHOP: ["*.name", "*.desc"],
  DUNGEON_HALT_CARDS: ["*.name", "*.gain", "*.cost", "*.note"], // v3.472.0
  DUNGEON_HALT_KIND_LABELS: ["*"],
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
  PA2_DESTS: ["*.*.name", "*.*.line", "*.*.win", "*.*.fail", "*.*.pass", "*.*.sorted"], // v3.454.0 : pass (le gardien qui dort) ; v3.489.0 : sorted (le trieur)
  PA2_TRAP_FX: ["*.name", "*.desc", "*.cure"], // v3.467.0 (Pièges)
  PA2_TRAPS: ["*.*.name", "*.*.line"],
  PA2_CUTS: ["*.*.name"], // v3.468.0 (sentiers coupés)
  PA2_CONDITIONS: ["*.*.name", "*.*.kicker", "*.*.line", "*.*.pro", "*.*.con"], // v3.469.0 (condition du run)
  PA2_CONDITION_CALM: ["name", "kicker", "line"],
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
  PA2_MAPS: ["**"],                   // v3.381.0 : identifiants de nœuds des tracés (« CAMP », « SEUIL »…)
  RUINES_PA_LINKS: ["**"],            // v3.429.0 : tracé partagé des deux cartes des Ruines
  RUINES_PA_SHIFTS: ["**"],           // v3.429.0 : bascules « les murs bougent »
  VILLAGE_MILESTONES: ["*.go", "*.kind", "*.arg", "*.book", "*.g", "*.id", "*.icon"], // v3.509.0 : champs techniques des jalons
  MILESTONE_BOOKS: ["*.icon", "*.tips.*.0"]
};

if (typeof module !== "undefined") module.exports = { DATA_TEXT_FIELDS: DATA_TEXT_FIELDS, DATA_TEXT_IGNORED: DATA_TEXT_IGNORED, DATA_TEXT_SOURCES: DATA_TEXT_SOURCES };
