"use strict";
/* data/chapter-openings.js — v3.623.0 : ouvertures des chapitres II à V (textes validés par Seb le 02/11/2026 ; traduits à l'affichage via js/lang/data-fields.js ;
   atelier atelier/ouvertures-chapitres.html). Affichage : ui/prologue-view.js (même composant que le prologue). */

/* Un chapitre = l'étape d'arrivée qui le déclenche, et trois planches. nom : indice de la ligne en titre doré.
   teinte : fond animé tant que l'image manque (le vrai chemin reste demandé). */
var CHAPTER_OPENINGS = {
  desert: {
    num: "Chapitre II", step: "desert_01", teinte: ["217,164,90", "122,74,36", "26,16,10"],
    planches: [
      { img: "desert_1_traversee", lignes: ["Trois jours de sable. Deux puits.", "Derrière toi, la forêt n'est plus qu'un trait vert. Puis plus rien.", "Sarkel ne parle pas en marchant. Il compte les outres."] },
      { img: "desert_2_royaume", lignes: ["Ici, rien ne se presse. Le vent découvre, le sable recouvre.", "Des pierres dépassent. Un toit. Une main de statue.", "Tout un royaume est couché dessous."] },
      { img: "desert_3_portail", lignes: ["Au bout, un camp de toile autour d'un puits. Ici, l'eau se paie et les questions se gardent.", "Sous le sable, quelqu'un attend depuis longtemps.", "Ce que le sable garde"], nom: 2 }
    ]
  },
  ruins: {
    num: "Chapitre III", step: "ruines_01", teinte: ["150,140,118", "58,62,70", "16,16,18"],
    planches: [
      { img: "ruines_1_route", lignes: ["Au nord du camp, le sable durcit. Puis il devient pavé.", "La route que Sarkel connaissait n'est plus là. Il en prend une autre, sans rien dire.", "Le fleuve de ses cartes aussi est parti. Il reste son lit, sec et propre."] },
      { img: "ruines_2_pierres", lignes: ["Une ville entière, debout. Pas une fenêtre cassée. Pas une porte ouverte.", "La nuit, on entend la pierre frotter la pierre.", "Au matin, une rue n'est plus là où elle était."] },
      { img: "ruines_3_borne", lignes: ["Quelqu'un, à la Borne, dessine les rues sur une feuille. Chaque matin, il faut raturer.", "La ville se rebâtit toute seule. Personne ne sait pour qui.", "La ville rangée"], nom: 2 }
    ]
  },
  crypt: {
    num: "Chapitre IV", step: "crypte_01", teinte: ["138,106,58", "46,36,24", "11,9,7"],
    planches: [
      { img: "crypte_1_escalier", lignes: ["Sous la Borne, un escalier. Les marches sont usées au milieu, comme si beaucoup étaient descendus.", "Personne n'en est remonté par ici.", "Sarkel pose une lampe à chaque palier. Il ne revient pas les chercher."] },
      { img: "crypte_2_gisants", lignes: ["En bas, des salles plus hautes que la forêt. Des rangées de pierres couchées, à perte de vue.", "Sur chaque pierre, quelqu'un. Les mains jointes, les yeux fermés.", "Certains portent encore leurs armes."] },
      { img: "crypte_3_veillee", lignes: ["Ici, rien ne bouge. Rien ne pourrit. Ils attendent.", "Ce sont ceux qui sont partis avant toi. Ceux qui sont montés, et ne sont pas revenus.", "Ceux qui sont montés"], nom: 2 }
    ]
  },
  mountain: {
    num: "Chapitre V", step: "montagne_01", teinte: ["192,96,58", "90,42,26", "26,14,10"],
    planches: [
      { img: "montagne_1_montee", lignes: ["En haut de l'escalier, l'air change. Il sent la cendre.", "La roche est tiède sous la main. Puis chaude.", "Sarkel a laissé ses lampes en bas. Ici, on n'en a pas besoin."] },
      { img: "montagne_2_veines", lignes: ["Dans la paroi, des veines brillent. Bleues. Froides, au milieu du feu.", "Elles ne fondent pas. Rien ne les fait fondre.", "On pourrait en prendre. On pourrait les tailler."] },
      { img: "montagne_3_coupe", lignes: ["Plus haut, une paroi coupée net. Pas par la lave.", "Les éclats sont encore au pied du mur. Personne n'est revenu les ramasser.", "Ce qui ne fond pas"], nom: 2 }
    ]
  }
};
/* v3.626.0 (Tour, lot T-1) : textes validés par Seb le 02/11/2026 (Chapitre VI : textes v0.1). Images à générer. */
CHAPTER_OPENINGS.tower = {
  num: "Chapitre VI", step: "tour_01", teinte: ["150,160,190", "50,56,74", "10,11,16"],
  planches: [
    { img: "tour_1_nord", lignes: ["La braise d'Aeswyn ne fume plus droit. Elle penche vers le nord.", "Orwen a mis du pain dans ton sac. Elle n'a rien dit d'autre.", "Sarkel attelle sans qu'on le lui demande."] },
    { img: "tour_2_plaine", lignes: ["Au nord, l'herbe devient grise, puis elle ne pousse plus.", "Au bout, la Tour. Elle perce le ciel exactement là où il est fendu."] },
    { img: "tour_3_porte", lignes: ["Il y a une porte. Ouverte. Personne ne l'a construite.", "Ceux qui sont montés avant toi sont passés par là.", "La Question"], nom: 2 }
  ]
};
var CHAPTER_OPENING_ORDER = ["desert", "ruins", "crypt", "mountain", "tower"];

window.CHAPTER_OPENINGS = CHAPTER_OPENINGS;
window.CHAPTER_OPENING_ORDER = CHAPTER_OPENING_ORDER;
