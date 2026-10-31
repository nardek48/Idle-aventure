"use strict";
/* data/companion-talks.js — v3.597.0 (chantier « parler avec les compagnons », cadre validé par Seb le 31/10) :
   les conversations au feu. Les textes viennent de l'atelier des textes, une fois validés par Seb. */

/* Une conversation : id, companion, step (étape de l'Histoire atteinte), after (conversation faite avant), afterQuest (quête finie avant),
   lines (w : compagnon, "n" narrateur ; un nœud { choix: [{ t, suite }] } propose deux réponses),
   unlocks ({ quest, title } : la quête personnelle débloquée, data/companion-quests.js). Textes littéraux pour l'audit i18n. */
function companionTalksData() {
  return [];
}

window.companionTalksData = companionTalksData;
