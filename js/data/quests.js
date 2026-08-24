"use strict";
/* data/quests.js — quêtes journalières (config + templates). DEFAULT_QUEST_PROGRESS ici fait foi (chargé après constants.js). Détail : COMMENTAIRES_ORIGINAUX.md */

var QUEST_CONFIG = {
  count: 3,
  resetHours: 24
};

var DEFAULT_QUEST_PROGRESS = {
  kills: 0,
  bossKills: 0,
  goldEarned: 0,
  goldSpent: 0,
  crits: 0,
  combatTime: 0,
  treasures: 0,
  forestChaptersDone: 0,
  ruinsChaptersDone: 0,
  swordKills: 0,
  bowKills: 0,
  magicKills: 0
};

var QUEST_TEMPLATES = [
  {
    id: "kills",
    name: "Chasseur débutant",
    icon: "images/Icons/quest/chasseur_debutant_icone.png",
    desc: "Vaincre {target} ennemis.",
    target: 25,
    rewardGold: 150,
    rewardEssence: 8,
    tracker: function () { return game.questProgress.kills || 0; }
  },
  {
    id: "bossKills",
    name: "Briseur de boss",
    icon: "images/Icons/quest/briseur_boss_icone.png",
    desc: "Vaincre {target} boss.",
    target: 3,
    rewardGold: 300,
    rewardEssence: 15,
    tracker: function () { return game.questProgress.bossKills || 0; }
  },
  {
    id: "goldEarned",
    name: "Bourse pleine",
    icon: "images/Icons/quest/bourse_pleine_icone.png",
    desc: "Gagner {target} or.",
    target: 2000,
    rewardGold: 400,
    rewardEssence: 12,
    tracker: function () { return game.questProgress.goldEarned || 0; }
  },
  {
    id: "goldSpent",
    name: "Investisseur",
    icon: "images/Icons/quest/investisseur_icone.png",
    desc: "Dépenser {target} or en améliorations.",
    target: 1500,
    rewardGold: 300,
    rewardEssence: 10,
    tracker: function () { return game.questProgress.goldSpent || 0; }
  },
  {
    id: "crits",
    name: "Exécuteur",
    icon: "images/Icons/quest/executueur_icone.png",
    desc: "Infliger {target} coups critiques.",
    target: 20,
    rewardGold: 250,
    rewardEssence: 12,
    tracker: function () { return game.questProgress.crits || 0; }
  },
  {
    id: "treasures",
    name: "Chercheur de trésors",
    icon: "images/Icons/quest/chercheur_tresors_icone.png",
    desc: "Déclencher {target} trésors.",
    target: 3,
    rewardGold: 450,
    rewardEssence: 18,
    tracker: function () { return game.questProgress.treasures || 0; }
  },
  {
    id: "swordKills",
    name: "Maître de la lame",
    icon: "images/Icons/quest/maitre_lame_icone.png",
    desc: "Vaincre {target} ennemis à l'épée ou à la hache.",
    target: 20,
    rewardGold: 250,
    rewardEssence: 10,
    tracker: function () { return game.questProgress.swordKills || 0; }
  },
  {
    id: "bowKills",
    name: "Maître de l'arc",
    icon: "images/Icons/quest/maitre_arc_icone.png",
    desc: "Vaincre {target} ennemis à l'arc.",
    target: 20,
    rewardGold: 250,
    rewardEssence: 10,
    tracker: function () { return game.questProgress.bowKills || 0; }
  },
  {
    id: "magicKills",
    name: "Maître arcanique",
    icon: "images/Icons/quest/maitre_arcanique_icone.png",
    desc: "Vaincre {target} ennemis avec un bâton.",
    target: 20,
    rewardGold: 250,
    rewardEssence: 10,
    tracker: function () { return game.questProgress.magicKills || 0; }
  }
];
