# v3.676.0 — Le Retour d'Android ne bloque plus un combat (audit du 04/11, QA-2 et QA-V1)

- **Blocage corrigé** : en combat, sans fenêtre ouverte, le Retour d'Android menait au Camp. Le combat restait figé (il ne tourne qu'à l'écran Combat), sauvegarde comprise. Sur une élite de carte, le secteur n'affichait qu'un bouton éteint « Combat en cours » : plus aucun chemin vers le combat, et la Carte vivante refusait tout autre départ. Décision de Seb : option A.
- `js/ui/ui-root.js` (`backNavOnPop`) : en combat de sortie, le Retour demande « Fuir ? » (règle actuelle, butin réduit) ; refusé, on reste au combat. Sans sortie active : « Termine le combat d'abord. »
- `js/ui/living-map-view.js` : une élite engagée affiche « Reprendre le combat » (vers l'écran Combat) au lieu du bouton éteint. Débloque aussi les parties déjà coincées.
- `js/ui/dungeon-view.js` : la carte du donjon en cours a « Reprendre le combat » ; la consigne ne parle plus d'un « onglet Combat » qui n'existe pas (QA-V1).
- `js/lang/en.js` : 4 textes (1 remplacé). « Quoi de neuf » : une ligne.
- `tools/harness/round-harness.js` [442] : bouton de reprise sur l'élite engagée, Retour en combat avec et sans sortie, texte de la carte du donjon.
- Vérifié dans Chromium à 390 × 844 : Retour en élite → « Fuir ? » ; refusé, on reste au combat ; accepté, fuite et retour au Camp ; partie coincée rechargée → « Reprendre le combat » ramène au combat.

Restent hors de ce lot (proposés à part) : QA-8 (ration en plein donjon), QA-9 (deux sorties à la fois, touche `dungeon-system.js`).

Contrôles : round 6 152 OK (2 passes), boot 4 OK, création 44 OK, parcours 212 OK, i18n 100 %.
