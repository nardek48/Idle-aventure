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

/* v3.631.0 (Tour, lot T-4b) : la vision de l'étape 19 et les quatre fins (deux planches), même composant.
   Textes de l'atelier (vision validée, fins à relire). {nom} = nom du héros. Images livrées (images/Tour/, v3.667 à v3.670). */
var TOWER_VISION = {
  num: "Cette nuit-là", teinte: ["120,150,200", "40,46,70", "8,9,14"],
  planches: [
    { img: "vision_1_homme", lignes: ["Douze hivers. Un homme descend vers un village de la forêt. Un homme sec, qui ne ment pas.", "Dans ses mains, une goutte de lumière bleue, prise à la Montagne."] },
    { img: "vision_2_feu", lignes: ["Il la pose au milieu des maisons. Il dit : « Prends. Tout. »", "Elle prend. Le feu. Trois familles qui courent. Une femme crie un nom. C'est Orwen, plus jeune. Elle crie le tien : {nom}."] },
    { img: "vision_3_enfant", lignes: ["Un enfant ne court pas. Il regarde la lumière, et la lumière le regarde.", "Elle le touche. Elle ne le prend pas. Elle prend seulement ce qu'il regarde : la nuit, le feu, l'homme.", "Tu as toujours été ce qu'elle a gardé de cette nuit-là."], nom: 2 }
  ]
};
/* Une fin par réponse à la Question (clé `question`) ; banniere = phrase du bandeau du Village une fois la fin choisie. */
var TOWER_FINS = {
  sienne: { num: "La forme au sommet", teinte: ["150,170,210", "46,54,84", "8,10,18"],
    banniere: "Orwen met un morceau de pain de côté, sans dire pour qui.",
    planches: [
      { img: "fin_ds_1", lignes: ["Tu es là où la fente est la plus large. La lumière passe à travers toi. Tu n'as plus froid.", "En bas, le monde se brise encore, et recommence. Il apprend ton visage."] },
      { img: "fin_ds_2", lignes: ["À Aeswyn, Orwen coupe le pain. Elle en met un morceau de côté, sans dire pour qui.", "La forme au sommet"], nom: 1 }
    ] },
  aeswyn: { num: "Ce que la braise a gardé", teinte: ["214,150,90", "92,52,30", "20,12,8"],
    banniere: "Wenna demande ce qu'il y avait avant. Quelqu'un lui répond.",
    planches: [
      { img: "fin_da_1", lignes: ["Le ciel se referme. Pas d'un coup : comme une braise qui retombe.", "Tu redescends. Maddoc lâche la barre de fer. Sarkel n'a rien à vendre, et il te fait monter quand même."] },
      { img: "fin_da_2", lignes: ["À Aeswyn, la braise est un feu de camp, rien de plus. Orwen pose une tranche devant la place vide, puis la mange elle-même.", "Wenna demande ce qu'il y avait avant. Et pour une fois, quelqu'un lui répond.", "Ce que la braise a gardé"], nom: 2 }
    ] },
  tienne: { num: "Ce que tu as gardé", teinte: ["150,160,190", "50,56,74", "10,11,16"],
    banniere: "Le ciel est toujours fendu. Tu as ton nom.",
    planches: [
      { img: "fin_gs_1", lignes: ["Tu redescends. La Tour est derrière toi, le ciel toujours fendu.", "Le monde se brisera encore."] },
      { img: "fin_gs_2", lignes: ["Tu as ton nom : {nom}. C'est tout ce que tu as. C'est à toi.", "Ce que tu as gardé"], nom: 1 }
    ] },
  rien: { num: "Le feu tient encore", teinte: ["200,130,70", "84,46,26", "18,10,6"],
    banniere: "La file devant la Boulangerie est longue, et le pain est bon.",
    planches: [
      { img: "fin_ga_1", lignes: ["La braise est petite. Aldric la surveille, et ne demande pas pourquoi.", "Le monde ne guérit pas."] },
      { img: "fin_ga_2", lignes: ["Mais la file devant la Boulangerie est longue, et le pain est bon.", "Le feu tient encore"], nom: 1 }
    ] }
};
/* Prix de la bascule Soi/Aeswyn (Seb, 02/11) : Brannoc manque au dernier feu, ligne glissée avant le titre doré. */
var TOWER_FIN_PRIX = { brannoc: "Au dernier feu, la place de Brannoc reste vide. L'enclume ne sonne plus." };

window.CHAPTER_OPENINGS = CHAPTER_OPENINGS;
window.CHAPTER_OPENING_ORDER = CHAPTER_OPENING_ORDER;
window.TOWER_VISION = TOWER_VISION;
window.TOWER_FINS = TOWER_FINS;
window.TOWER_FIN_PRIX = TOWER_FIN_PRIX;
