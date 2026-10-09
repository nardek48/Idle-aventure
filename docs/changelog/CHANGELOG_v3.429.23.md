# Aethervale v3.429.23 — Petites aventures offertes par l'Histoire

Décision de Seb (option B). Point relevé en jouant la troisième heure. S'applique sur la v3.429.22.

## Le constat
- La réserve de Petites aventures se recharge d'une place toutes les 4 h (4 places au Désert).
- L'Histoire du Désert en demande environ 9 : l'outre, 2 secteurs, les stèles, la porte du Temple par la verrerie ou le marché de sel, la tour de guet, la bête sous la dune. Soit environ 20 h d'attente si on enchaîne. L'heure 3 s'est arrêtée là.

## La règle
- Comme l'entrée de donjon offerte (`storyFreeSteps`), l'étape d'Histoire porte la donnée `storyPa: { worldId, untilFlag? }`.
- **Étape « libérer un secteur ».** La Petite aventure est offerte vers un secteur de ce monde **pas encore libéré**. Rejouer un secteur libéré reste payant : pas de butin à volonté pendant l'étape.
- **Étape « atteindre une destination »** (`untilFlag`). La Petite aventure est offerte dans ce monde tant que la destination n'est pas atteinte.
- Une expédition offerte ne prend pas de place. Un échec ne rend donc rien, puisque rien n'a été pris.
- Étapes concernées : la brume de la Forêt ; Désert 3, 4, 5, 6, 11 et 14 ; Ruines 6 et 7.

## Ce que voit le joueur
- La fiche du secteur garde « Partir » actif même quand la réserve est vide.
- La préparation affiche « Expédition offerte — l'Histoire t'y mène, aucune place de la réserve consommée ».
- La carte du tableau de missions indique « Offerte par l'Histoire ».

## Vérifié dans le jeu (Chromium 390×844, étape « La descente », réserve vidée à 4/4)
- Secteur à libérer (la verrerie) : offert, « Partir » actif, départ réel sans place prise (réserve toujours 4/4).
- Secteur libéré (le puits sec) : non offert, refus d'origine inchangé.
- Renoncer à la préparation laisse la réserve intacte.

## Code
- `js/systems/scene-run-system.js` : `isStoryPaFree`, `hasStoryPaFree`.
- `js/systems/pa2-run.js` : départ et prise de place (`run.storyFree`).
- `js/systems/living-map-system.js`, `js/systems/mission-board-system.js` : la recharge ne bloque plus un départ offert.
- `js/ui/pa2-view.js` : mention à la préparation.
- `js/data/story-quests.js` : `storyPa` sur 9 étapes.
- `js/lang/en.js` : 3 clés.
- Aucun fichier protégé touché. Aucun fichier ajouté.

## Contrôles
- Round : **3 963 OK**, 0 échec, sur trois passages. Boot : 4 OK. Création du héros : 44 OK. i18n : 4 207 textes, 100 %, 0 orphelin.
- `node --check` sur les fichiers modifiés.
