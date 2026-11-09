"use strict";
/* core/edition.js — v3.751.0 : édition du jeu, « jeu » (lien principal) ou « alpha » (lien /alpha/, testeurs).
   Le dépôt garde toujours « jeu » : pages.yml écrit « alpha » dans la copie publiée sous /alpha/ (branche alpha). */

var GAME_EDITION = "jeu";
var ALPHA_LAST_CHAPTER = "desert"; // l'Alpha s'arrête après ce chapitre (desert_18), le reste jouable

/* v3.752.0 : préfixe des clés de stockage ; l'Alpha partage l'origine (et le localStorage) du jeu */
var STORAGE_PREFIX = GAME_EDITION === "alpha" ? "alpha:" : "";

function isAlphaEdition() { return GAME_EDITION === "alpha"; }

window.GAME_EDITION = GAME_EDITION;
window.ALPHA_LAST_CHAPTER = ALPHA_LAST_CHAPTER;
window.isAlphaEdition = isAlphaEdition;
window.STORAGE_PREFIX = STORAGE_PREFIX;
