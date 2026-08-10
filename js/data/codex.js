"use strict";
/* ============================================================
Quest Idle — data/codex.js
Le Codex : l'histoire du jeu ("L'Éveil de l'Aether"), débloquée
progressivement à la première rencontre de chaque monde/système
(comme les hauts faits). Voir systems/codex-system.js pour le suivi
de déblocage/lecture, et ui/codex-view.js pour l'écran dédié.

Chaque entrée :
  - id            identifiant stable
  - title         titre affiché
  - icon          emoji d'illustration
  - category      groupe d'affichage (intro/monde/système)
  - text          le texte complet (peut contenir plusieurs paragraphes
                   séparés par \n\n)
  - isUnlocked()  fonction lisant l'état du jeu ; tant qu'elle renvoie
                  faux, l'entrée apparaît verrouillée dans le Codex
============================================================ */

var CODEX_ENTRIES = [
  {
    id: "prologue",
    title: "Prologue — La Rupture",
    icon: "📖",
    category: "intro",
    text: "Il y a longtemps, le monde ne connaissait pas de fin. Les saisons se répétaient, les royaumes prospéraient, et personne n'avait jamais entendu parler de l'Aether.\n\nPuis vint la Rupture.\n\nUn soir, sans avertissement, le ciel se fendit au-dessus de la Tour la plus septentrionale du royaume. De la faille s'écoula une lumière bleu-pâle, une substance impossible à toucher, impossible à ignorer : l'Aether. Elle s'infiltra dans la terre, dans l'eau, dans le sang des créatures. Les bêtes les plus paisibles devinrent hostiles. Les morts des Cryptes se relevèrent. Et au sommet de la Tour, quelque chose d'ancien se réveilla.\n\nLes érudits l'appelèrent le Cycle : le monde, désormais, ne connaît plus de fin stable. Il se brise, se reforme, et recommence — un peu plus dur, un peu plus étrange à chaque fois. Seuls ceux qui acceptent de traverser la Rupture encore et encore, en absorbant l'Aether plutôt qu'en le fuyant, peuvent espérer un jour comprendre pourquoi le ciel s'est fendu, et ce qui attend réellement au sommet de la Tour.\n\nTu es l'un d'eux.",
    isUnlocked: function () { return true; }
  },

  { id: "world_forest", title: "La Forêt", icon: "🌲", category: "world",
    text: "C'est ici que tout commence, à chaque Cycle. La Forêt était autrefois un sanctuaire ; l'Aether l'a rendue instable. Les créatures qui l'habitent oscillent entre calme animal et fureur soudaine, comme si elles se souvenaient, l'espace d'un instant, de ce qu'elles étaient avant. C'est un terrain d'apprentissage — pour le héros comme pour l'Aether lui-même, qui semble ici hésiter encore sur la forme qu'il veut prendre.",
    isUnlocked: function () { return !!(game.worldsEverReached && game.worldsEverReached[0]); } },

  { id: "world_desert", title: "Le Désert", icon: "🏜️", category: "world",
    text: "Passé la lisière de la Forêt, le sol devient sable et silence. On raconte que le Désert n'a jamais été fertile — que l'Aether n'a fait qu'y révéler ce qui s'y trouvait déjà : des ruines enfouies plus anciennes que la Rupture elle-même. Les créatures du Désert sont patientes, économes en mouvement, comme si elles savaient que le temps, ici, joue en leur faveur.",
    isUnlocked: function () { return !!(game.worldsEverReached && game.worldsEverReached[1]); } },

  { id: "world_ruins", title: "Les Ruines", icon: "🏛️", category: "world",
    text: "Un royaume est mort ici. On ne sait plus lequel, ni quand — les archives elles-mêmes se sont effritées avec les pierres. Les Ruines sont le premier endroit où l'Aether laisse deviner une intention : les structures se reconfigurent légèrement à chaque Cycle, comme si quelque chose, dessous, essayait de reconstruire un plan.",
    isUnlocked: function () { return !!(game.worldsEverReached && game.worldsEverReached[2]); } },

  { id: "world_crypt", title: "La Crypte", icon: "⚰️", category: "world",
    text: "Ici reposaient les rois. Ils n'y reposent plus vraiment. La Crypte est le domaine où l'Aether se mêle le plus intimement à la mort, réveillant gardiens et monarques oubliés dans une parodie de royauté. Beaucoup d'aspirants renoncent ici — non par manque de force, mais parce que la Crypte donne l'impression tenace d'être observé par quelque chose qui attend patiemment son heure.",
    isUnlocked: function () { return !!(game.worldsEverReached && game.worldsEverReached[3]); } },

  { id: "world_mountain", title: "La Montagne", icon: "🌋", category: "world",
    text: "L'air se raréfie, le froid mord, et l'Aether devient visible : de longues veines bleutées courent dans la roche, comme des racines de lumière. Les créatures de la Montagne sont les premières à sembler façonnées par l'Aether plutôt que simplement corrompues par lui — plus grandes, plus anciennes qu'elles ne devraient l'être. C'est ici que l'on comprend que l'Aether n'est pas seulement une malédiction : c'est aussi une matière première.",
    isUnlocked: function () { return !!(game.worldsEverReached && game.worldsEverReached[4]); } },

  { id: "world_tower", title: "La Tour", icon: "🗼", category: "world",
    text: "Elle perce le ciel exactement à l'endroit où la Rupture s'est produite. Personne n'a jamais atteint son sommet et n'est redescendu pour le raconter en entier — seulement des fragments, des mots à demi cohérents sur une silhouette au sommet, sur un choix qu'il faudra faire. La Tour n'est pas une fin. C'est un seuil.",
    isUnlocked: function () { return !!(game.worldsEverReached && game.worldsEverReached[5]); } },

  {
    id: "ascension",
    title: "L'Ascension et la promesse de l'Aether",
    icon: "images/Icons/aether_icon.png",
    category: "system",
    text: "Chaque héros qui s'aventure jusqu'à la Tour, ou qui tombe en chemin, découvre la même vérité : le corps ne suffit pas à contenir ce qu'il faudra affronter au sommet. Alors on Ascensionne — on accepte de tout perdre, sauf l'essentiel, pour renaître un peu plus proche de ce que l'Aether exige.\n\nL'Aether gagné à chaque Ascension n'est pas qu'une monnaie. C'est un souvenir du Cycle précédent, une trace qui reste quand tout le reste s'efface. Certains anciens champions racontent que si l'on accumule assez d'Aether, on cesse un jour d'être simplement plus fort — on commence à comprendre le langage de la Rupture elle-même.",
    isUnlocked: function () { return (game.ascensionCount || 0) >= 1; }
  },

  {
    id: "chaos",
    title: "Le Chaos",
    icon: "🔥",
    category: "system",
    text: "Le Chevalier du Chaos, le Rôdeur du Chaos, le Sorcier du Chaos — ces variantes plus instables des héros classiques ne sont pas un choix esthétique : ce sont des champions qui ont laissé l'Aether s'installer un peu plus profondément en eux que les autres. Leur puissance brute — la Fureur, le Tir chaotique, le Cataclysme — est à la mesure du risque qu'ils ont pris en cessant de résister à ce qui les traverse.",
    isUnlocked: function () { return !!game.codexChaosSeen; }
  },

  {
    id: "bestiary",
    title: "Le Bestiaire — Les Marqués",
    icon: "📖",
    category: "system",
    text: "Toute créature rencontrée dans le Cycle porte une marque de l'Aether, visible seulement à ceux qui prennent le temps de l'observer, de la combattre, de la comprendre. C'est le rôle du Bestiaire : consigner non pas des trophées, mais des fragments de compréhension. Chaque créature « maîtrisée » — tuée assez de fois pour être vraiment connue — cède un peu de son secret, sous forme de bonus durable. Le héros n'apprend pas à tuer plus fort : il apprend à lire le monde brisé qu'il traverse.\n\nLes rumeurs les plus tenaces prétendent que certaines créatures très anciennes, rencontrées uniquement en Cycle avancé, ne sont pas corrompues par l'Aether — elles en sont les gardiennes originelles, chargées de trier les héros dignes d'avancer de ceux qu'il vaut mieux réabsorber dans la boucle.",
    isUnlocked: function () { return (game.totalKills || 0) >= 1; }
  },

  {
    id: "dungeon",
    title: "Le Donjon — la Faille sous les Cinq Sceaux",
    icon: "🏰",
    category: "system",
    text: "Sous chaque monde traversé se trouve un accès à la Faille — un lieu hors du temps normal du Cycle, où l'Aether s'exprime sans filtre. On raconte qu'elle est scellée en cinq couches, chacune plus instable que la précédente.\n\nLes Éclats récoltés dans la Faille ne sont pas de simples fragments de minerai : ce sont des morceaux de Sceau, arrachés à la structure même qui retient la Faille de se répandre dans le reste du Cycle. Les utiliser pour renforcer son équipement, c'est emprunter, un peu, à la prison elle-même.",
    isUnlocked: function () { return !!(game.dungeonTiersEntered && Object.keys(game.dungeonTiersEntered).length > 0); }
  },
  { id: "dungeon_tier_1", title: "Le premier Sceau", icon: "🔓", category: "system",
    text: "Le premier Sceau est presque accueillant : un écho affaibli de la Faille, où même un héros novice peut apprendre sans trop de danger.",
    isUnlocked: function () { return !!(game.dungeonTiersEntered && game.dungeonTiersEntered[1]); } },
  { id: "dungeon_tier_2", title: "Le deuxième Sceau", icon: "🔒", category: "system",
    text: "Le deuxième Sceau demande d'avoir déjà accepté plusieurs Ascensions — la Faille ne se laisse approcher que par ceux qui ont montré qu'ils reviendraient, encore et encore.",
    isUnlocked: function () { return !!(game.dungeonTiersEntered && game.dungeonTiersEntered[2]); } },
  { id: "dungeon_tier_3", title: "Le troisième Sceau", icon: "🔒", category: "system",
    text: "Comme le second, le troisième Sceau ne s'ouvre qu'à ceux qui ont prouvé leur constance à travers plusieurs Ascensions. Ici, l'écho de la Faille commence à se faire sentir plus distinctement.",
    isUnlocked: function () { return !!(game.dungeonTiersEntered && game.dungeonTiersEntered[3]); } },
  { id: "dungeon_tier_4", title: "Le quatrième Sceau", icon: "🔒", category: "system",
    text: "Le quatrième Sceau est le premier où la Faille semble répondre : les créatures y sont façonnées avec une intention presque calculée, comme un test.",
    isUnlocked: function () { return !!(game.dungeonTiersEntered && game.dungeonTiersEntered[4]); } },
  { id: "dungeon_tier_5", title: "Le cinquième Sceau — « la Question »", icon: "❓", category: "system",
    text: "Le cinquième et dernier Sceau connu, réservé aux héros les plus aguerris, est celui que les archivistes du Cycle appellent simplement « la Question ». On y descend rarement en cherchant du butin. On y descend pour comprendre pourquoi la Faille existe.",
    isUnlocked: function () { return !!(game.dungeonTiersEntered && game.dungeonTiersEntered[5]); } },

  {
    id: "village",
    title: "Le Village hors-Cycle",
    icon: "🏘️",
    category: "system",
    text: "Entre deux incursions, le héros n'est pas seul. Un village s'est formé en marge du Cycle, peuplé de ceux qui ont choisi de ne pas Ascensionner — pas par lâcheté, mais parce que quelqu'un doit rester pour entretenir les relais, cultiver les réserves, et veiller sur ceux qui reviennent blessés. C'est grâce à eux que le temps continue de produire des ressources même quand le héros n'est pas présent : ils ne combattent pas la Rupture, ils s'assurent simplement qu'elle ne consume pas tout pendant qu'on n'y prête pas attention.",
    isUnlocked: function () {
      if (!game.village) return false;
      return Object.keys(game.village).some(function (key) { return (game.village[key] || 0) > 0; });
    }
  },

  {
    id: "epilogue",
    title: "Ce qui attend au sommet",
    icon: "✨",
    category: "system",
    text: "Personne ne sait avec certitude ce qui a causé la Rupture, ni ce qui attend réellement au sommet de la Tour, au cœur du cinquième Sceau. Mais chaque Ascension, chaque créature du Bestiaire comprise, chaque Éclat arraché à la Faille rapproche un peu plus le héros d'une réponse.\n\nLe Cycle continuera tant que personne n'aura franchi ce dernier seuil. Jusque-là, il ne reste qu'une chose à faire : recommencer, un peu plus fort, un peu plus proche de la vérité — et voir jusqu'où l'Aether est prêt à mener celui qui refuse de s'arrêter.",
    isUnlocked: function () { return (game.dungeonBossClears || 0) >= 1 && (game.ascensionCount || 0) >= 1; }
  }
];

window.CODEX_ENTRIES = CODEX_ENTRIES;
