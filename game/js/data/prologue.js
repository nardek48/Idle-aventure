"use strict";
/* data/prologue.js — v3.570.0 : les six planches du prologue (textes validés par Seb le 30/10/2026,
   systemes/introduction/Aethervale_Prologue_v0_2.md). Affichage : ui/prologue-view.js. */

/* Une planche = une image (portrait pour le téléphone, -wide pour le PC) et ses lignes de récit. */
var PROLOGUE_PLANCHES = [
  { img: "prologue_1_ciel", lignes: ["Cette nuit-là, les étoiles ont disparu.", "Au nord, le ciel s'est ouvert. Une lumière en est tombée. Bleue. Froide. Sans forme."] },
  { img: "prologue_2_terre", lignes: ["Elle est entrée dans la terre. Dans l'eau, dans les racines, dans le sang des bêtes.", "Au matin, les bêtes avaient changé."] },
  { img: "prologue_3_feu", lignes: ["Cette même nuit, un village de la forêt a brûlé.", "Aeswyn.", "Trois familles ont fui dans les bois. D'autres n'en sont jamais sorties."], nom: 1 },
  { img: "prologue_4_enfant", lignes: ["Au milieu des flammes, un enfant ne bougeait pas.", "Pas un cri. Pas un pas.", "Les yeux ouverts."] },
  { img: "prologue_5_hivers", lignes: ["Douze hivers ont passé.", "Ceux qui ont survécu vivent autour du feu.", "Quand on parle de cette nuit-là, on se tait en te voyant."] },
  { img: "prologue_6_soir", lignes: ["La nuit, les bêtes rôdent autour du camp. Elles viennent de plus en plus près.", "Orwen t'observe, près du feu.", "Cette nuit, il faudra bien que quelqu'un s'en charge."] }
];

window.PROLOGUE_PLANCHES = PROLOGUE_PLANCHES;
