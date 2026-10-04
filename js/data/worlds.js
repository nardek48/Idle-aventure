"use strict";
/* data/worlds.js — mondes, chapitres, ambiance et fonds de panneaux. Ordre = progression linéaire (WorldManager.worldIndex).
   Note : requiredAscension potentiellement vestigial depuis v2.83 (world-quests.js), à vérifier. Détail : COMMENTAIRES_ORIGINAUX.md */

/* v3.355.0 : WORLD_PANEL_BACKGROUNDS retiré (six fonds que plus rien n'affichait, images absentes). */

var WORLDS = [
  {
    id: "forest",
    name: "Forêt enchantée",
    requiredAscension: 0,
    assetKey: "forest",
    bg: "#0d1a0d",
    combatMap: "../images/Maps/forest-combat.jpg",
    adventures: [
      {
        id: "forest_1",
        name: "Lisière de la forêt",
        introText: "L'air est frais. Ce qui rôde à la Lisière ne dort jamais.", // v3.197.0 (bible B §4.1)
        // v3.107.4 : pool de base réduit aux 3 ennemis génériques (décision Seb — tutoriel, pas de
        // surcharge). Loup, Troll, Ronce restent dans ENEMY_DB mais ne sortent plus du farm libre :
        // ils n'apparaissent que via enemyFilter sur leur quête dédiée (hq_wolf_pack pour le Loup).
        enemyPool: ["slime", "goblin", "spider"],
        enemyCount: 10,
        boss: "slimeking"
      },
      {
        id: "forest_2",
        name: "Cœur de la forêt",
        introText: "Ici, la forêt ne chuchote plus : elle observe.", // v3.197.0 (bible B §4.1)
        enemyPool: ["slime", "goblin", "spider"], // v3.107.4 : voir note Lisière ci-dessus, même logique
        enemyCount: 10,
        boss: "orcwarlord" // v3.104.0 (P5) : nouveau boss du Cœur (le Roi Slime reste le boss de Lisière, forest_1)
      }
    ]
  },
  {
    id: "desert",
    name: "Désert oublié",
    requiredAscension: 0,
    assetKey: "desert",
    bg: "#2a1b0f",
    combatMap: "../images/Maps/desert-combat.jpg",
    adventures: [
      {
        id: "desert_1",
        name: "Dunes brûlantes",
        introText: "Le sable prend tout, et rend tard. Ce qui vit ici a le temps.", // v3.197.0 (bible B §4.1)
        enemyPool: ["scarab", "scorpion", "sandworm", "sandwarrior"],
        enemyCount: 10,
        boss: "sphinx" // v3.360.0 (acte IV) : le gardien répétable ; Nezzam ne sort que par sa quête
      },
      {
        id: "desert_2",
        name: "Temple ensablé",
        reachedFlag: "templeReached", // v3.310.0 : posé par la descente (acte II §4), relu au voyage retour
        introText: "Sous le sable, des pierres taillées avant tout le reste. Elles n'ont pas fini d'attendre.", // v3.197.0 (bible B §4.1)
        enemyPool: ["sandwarrior", "sandworm", "scorpion", "scarab"],
        enemyCount: 10,
        boss: "sphinx" // v3.360.0 (acte IV) : le gardien répétable ; Nezzam ne sort que par sa quête
      }
    ]
  },
  {
    id: "ruins",
    name: "Ruines anciennes",
    requiredAscension: 2,
    assetKey: "ruins",
    bg: "#1a1510",
    combatMap: "../images/Maps/ruins-combat.jpg",
    adventures: [
      {
        id: "ruins_1",
        name: "Couloirs effondrés",
        introText: "Un royaume est mort ici. Les pierres n'ont pas fini de tomber.", // v3.197.0
        enemyPool: ["skeleton", "ghoul", "gargoyle", "zombie"],
        enemyCount: 10,
        boss: "skeletonlord"
      },
      {
        id: "ruins_2",
        name: "Sanctuaire enseveli",
        introText: "Les murs ont été écrits. Quelqu'un les relit encore.", // v3.197.0
        enemyPool: ["gargoyle", "zombie", "skeleton", "ghoul"],
        enemyCount: 10,
        boss: "skeletonlord"
      }
    ]
  },
  {
    id: "crypt",
    name: "Crypte oubliée",
    requiredAscension: 3,
    assetKey: "crypt",
    bg: "#0a0a15",
    combatMap: "../images/Maps/crypt-combat.jpg",
    adventures: [
      {
        id: "crypt_1",
        name: "Sépulcres silencieux",
        introText: "Le froid entre. Il ne ressort pas.", // v3.197.0
        enemyPool: ["spectre", "wraith", "necromancer", "deadknight"],
        enemyCount: 10,
        boss: "necrosupreme"
      },
      {
        id: "crypt_2",
        name: "Chambre funéraire",
        introText: "Ici, on ne repose pas. On attend.", // v3.197.0
        enemyPool: ["deadknight", "necromancer", "wraith", "spectre"],
        enemyCount: 10,
        boss: "necrosupreme"
      }
    ]
  },
  {
    id: "mountain",
    name: "Montagne brûlante",
    requiredAscension: 6,
    assetKey: "mountain",
    bg: "#1a0d0a",
    combatMap: "../images/Maps/mountain-combat.jpg",
    adventures: [
      {
        id: "mountain_1",
        name: "Pentes de cendres",
        introText: "La roche est chaude sous la main. Elle l'était déjà avant le feu.", // v3.197.0
        enemyPool: ["lavagolem", "dragonling", "minordemon", "ifrit"],
        enemyCount: 10,
        boss: "ancientdragon"
      },
      {
        id: "mountain_2",
        name: "Antre du volcan",
        introText: "La lave éclaire. Ce qu'elle éclaire est plus grand qu'il ne devrait.", // v3.197.0
        enemyPool: ["ifrit", "minordemon", "dragonling", "lavagolem"],
        enemyCount: 10,
        boss: "ancientdragon"
      }
    ]
  },
  {
    id: "tower",
    name: "Tour du sorcier",
    requiredAscension: 10,
    assetKey: "tower",
    bg: "#0d0d1a",
    combatMap: "../images/Maps/tower-combat.jpg",
    adventures: [
      {
        id: "tower_1",
        name: "Sommet arcanique",
        introText: "L'air a le goût de la nuit où le ciel s'est fendu.", // v3.197.0
        enemyPool: ["arcanegolem", "corruptmage", "hybrid", "guardian"],
        enemyCount: 10,
        boss: "archmage"
      },
      {
        id: "tower_2",
        name: "Sanctuaire interdit",
        introText: "Le sommet. Ce n'est pas une fin.", // v3.197.0
        enemyPool: ["guardian", "hybrid", "corruptmage", "arcanegolem"],
        enemyCount: 10,
        boss: "archmage"
      }
    ]
  }
];

/* v3.197.0 (passe de ton, bible B §4.2) : narrateur — une chose perçue, au présent, sans
   vouvoiement ni points de suspension. */
var AMBIANCE_TEXTS = [
  "Un craquement, loin. Puis rien.",
  "L'air a un goût de sève.",
  "Les ombres bougent avant toi.",
  "Le vent tourne. Il vient de derrière.",
  "Le sol a tremblé une fois.",
  "Sur la pierre, des traits qui luisent quand tu ne regardes pas.",
  "Quelqu'un parle, trop bas pour les mots."
];

/* v3.423.0 (chantier Difficulté, décisions de Seb du 01/10/2026, points A et D) — LES ENNEMIS
   SUIVENT UN PEU LA FORCE RÉELLE DU HÉROS.
   Constat (sauvegarde « Luca », mage niveau 16, entraînement 110 partout) : 3,2 fois les dégâts
   par round et 1,5 fois les PV effectifs du héros de référence de fin de Désert ; un combat
   du Désert durait 1,5 round. Le niveau ne compte pas : c'est l'entraînement, l'équipement et
   les talents qui font la force. On compare donc le héros à un HÉROS DE RÉFÉRENCE mesuré
   (moyenne des trois classes, sim/pa2-bench.js, CombatForecast) :
     - dmg : dégâts par round (CombatForecast.getHeroDamagePerRound) ;
     - ehp : PV max / (1 − défense).
   Ennemi : PV × (dmg du héros / dmg de réf. / marge)^exp, Puissance × (ehp / ehp de réf. /
   marge)^exp, jamais en dessous de ×1, plafonnés à ×cap. Le héros garde toujours une part de
   son avance (exp < 1) : s'entraîner et s'équiper restent payants.
   Mondes sans référence (Ruines et au-delà) : pas d'ajustement tant qu'ils ne sont pas calés.
   L'or et l'XP ne changent pas. Logique : CombatForecast.getHeroScale (combat-forecast-system.js). */
var HERO_SCALING_REFS = {
  foret1:   { dmg: 64,  ehp: 361 },  // Forêt, acte I (niveau 3, arme +15)
  foret2:   { dmg: 117, ehp: 498 },  // Forêt, acte II (niveau 6, vitrine, entraînement 20)
  foret3:   { dmg: 127, ehp: 634 },  // Forêt, actes III-IV (niveau 8, entraînement 40)
  desert10: { dmg: 151, ehp: 741 },  // Désert, milieu (niveau 10, arme +32, entraînement 55)
  desert12: { dmg: 178, ehp: 845 },  // Désert, fin (niveau 12, arme +40, entraînement 70)
  /* Le joueur appliqué : le robot de campagne en vrais combats (campagne-harness.js --combats,
     TRACE_FORCE=1, v3.422.0), moyenne des trois classes à la FIN de chaque segment. Il entraîne
     les cinq caractéristiques jusqu'au plafond de l'acte : bien plus fort que les héros du banc. */
  joueurForet:   { dmg: 185, ehp: 691 },  // fin de la Forêt (forest_15)
  joueurDesert1: { dmg: 217, ehp: 785 },  // Désert, 1re aventure (desert_06)
  joueurDesert2: { dmg: 371, ehp: 971 }   // Désert, fin du chapitre (desert_18)
};
/* D : les mondes. « Un peu » (Seb) : exp 0,5, et une marge de 15 % au-dessus du joueur
   appliqué de fin de segment : le robot de campagne ne voit aucune différence (mesuré : avec
   les héros du banc comme référence, il prenait 11 morts et butait sur le Trône de sable).
   Référence par aventure du monde. */
var WORLD_HERO_SCALING = {
  exp: 0.5, margin: 1.15, cap: 2.5,
  /* v3.428.0 (Ruines, U-1) : provisoire — le héros de fin du chapitre II, en attendant les
     références « joueur » des Ruines mesurées au robot de campagne. */
  refByWorld: { forest: ["joueurForet", "joueurForet"], desert: ["joueurDesert1", "joueurDesert2"], ruins: ["joueurDesert2", "joueurDesert2"] }
};
window.HERO_SCALING_REFS = HERO_SCALING_REFS;
window.WORLD_HERO_SCALING = WORLD_HERO_SCALING;
