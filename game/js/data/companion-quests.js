"use strict";
/* data/companion-quests.js — v3.598.0 (chantier « parler avec les compagnons », 14 quêtes validées par Seb le 31/10) :
   les quêtes personnelles. Les déroulés et les textes viennent de l'atelier des textes, une fois validés. */

/* Une quête : id, companion, title, blurb, relic (clé de COMPANION_RELIC_UNIQUES), steps.
   Une conversation la débloque (companion-talks.js, unlocks: { quest: id, title }). Types d'étape :
   - deliver : { res: { eau: 10 } }, ressources données depuis l'Entrepôt ;
   - run : { world: "desert", count: 1 }, Petites Aventures ou parcours réussis dans ce monde, le compagnon dans l'équipe ;
   - elite : { world: "desert", count: 1 }, élites de la carte vivante de ce monde vaincues, le compagnon dans l'équipe ;
   - scene : { lines: [...] }, une scène au format des conversations.
   Chaque étape a un label (ce qu'il faut faire). La relique est donnée à la fin de la dernière étape. */
function companionQuestsData() {
  return [];
}

window.companionQuestsData = companionQuestsData;
