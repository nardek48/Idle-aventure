# v3.511.0 — Chasses et battues retirées, plus d'onglet Chasse

Décision de Seb du 27/10 (option A) : l'onglet Chasse n'était presque pas utilisé, les battues jamais.

## Ce qui change en jeu
- L'onglet Quêtes passe à trois catégories : Histoire, Secondaires, Aventure.
- Retirées : Chasse en Forêt, « Ce que les bêtes ont bu », Battue en Forêt, Battue du Désert.
- Inchangés : le bâtiment Chasse et sa Cuisine de camp, la quête d'Aventure « La meute ».
- Textes : la Sève d'Aeswyn ne cite plus la chasse (ses 5 autres sources restent) ; la Viande vient du bâtiment Chasse et des patrouilles ; l'étape « 3 combats avec Wenna » cite élite, donjon ou carte.

## Mesures (campagnes au robot, 2 par classe, avec combats)
- Avant (v3.510.0) : 6/6 au bout, 0 mur, médiane 40 h (38 à 55 h).
- Après : 6/6 au bout, 0 mur, médiane 42 h (37 à 50 h).
- Le robot se renforçait aux battues ; il va désormais au donjon (Tanière du Basilic, ouverte à forest_13, avant l'étape de Wenna).

## Code
- `data/hunt-quests.js` : `HUNT_QUESTS` vide (le catalogue de l'Entrepôt reste). Le moteur des chasses reste, inerte.
- `ui/quests-view.js` : catégorie Chasse retirée. `lang/en.js`, `lang/data-fields.js` : textes retirés ou mis à jour.
- Harnais : le moteur reste testé avec les anciennes chasses, copiées dans `tools/harness/hunt-fixture.js` (nouveau, outillage seulement) ; section [333]. Robot (`campagne-harness.js`) : renforcement au donjon. `design-audit.js`, `plafond-bench.js` : cas des chasses retirés.
- Vérifié dans Chromium à 320 et 390 px : trois onglets égaux, sans débordement.
- Aucun fichier du jeu ajouté, aucun fichier protégé.
