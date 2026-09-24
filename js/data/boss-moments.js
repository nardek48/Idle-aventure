"use strict";
/* data/boss-moments.js — v3.333.0 (Évolutions, lot B-1) : ce que disent les boss.
   Conception « Évolutions » v1.0 §5, B2 et B6. Placé à part plutôt que dans BOSS_DB : les
   élites (ELITE_DB) et les boss de donjon (nom propre sur une base de BOSS_DB) en ont aussi.

   Recherche (BossMomentManager.getMoment) : par NOM d'abord (un boss de donjon porte le nom
   du donjon, ex. le Basilic sur la base « slimeking »), puis par identifiant.
     title  une ligne sous le nom sur la carte d'entrée
     intro  la réplique d'entrée ; pour une élite sans réplique, sa `lore` sert d'intro
     phase  la réplique à la bascule de phase (le libellé du moteur reste le titre)
     death  la réplique du coup fatal
   Textes PROVISOIRES, à relire par Seb selon la bible. Absents : la carte n'affiche que le nom. */

var BOSS_MOMENTS = {
  slimeking: {
    title: "Le roi des marais",
    intro: "Ça gargouille. Ça grossit. Ça ne pense qu'à une chose : toi.",
    death: "La masse s'affaisse et redevient une flaque. Une grosse flaque."
  },
  orcwarlord: {
    title: "Celui qui tient le Cœur",
    intro: "« Encore un qui croit que la forêt lui doit quelque chose. »",
    phase: "« Assez joué. »",
    death: "« La forêt… ne vous gardera pas. »"
  },
  djinn: {
    title: "Le souffle qui efface les pistes",
    intro: "« Tu marches sur mon sable, petite flamme. »",
    phase: "« Voyons si tu brûles. »",
    death: "« Le vent… se souviendra de toi. »"
  },
  sphinx: {
    title: "Le gardien de la Cité engloutie",
    intro: "« Tu n'es pas celui que j'attends. Passe quand même, si tu peux. »",
    phase: "« Soit. »",
    death: "Le sphinx se couche lentement, comme on se rassoit."
  },
  "Basilic": {
    title: "Ce qui dort sous les racines",
    intro: "Une odeur de terre mouillée, puis deux yeux jaunes qui ne clignent pas.",
    phase: "Le Basilic siffle. Quelque chose répond dans l'ombre."
  },
  arbre_mere: { title: "Le battement sous l'écorce" },
  araignee_marquee: { title: "Élite de la Forêt" },
  ronce_ardente: { title: "Élite de la Forêt" },
  serment_armure: { title: "Élite" },
  dard_profondeurs: { title: "Élite du Désert" }
};

window.BOSS_MOMENTS = BOSS_MOMENTS;
