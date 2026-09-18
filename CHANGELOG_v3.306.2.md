# v3.306.2 — « Rentrer au camp » avant le premier palier ne donne plus d'XP

## Le bug

`SceneRunManager.leaveNow()` clôturait toujours la sortie en `"success"` (décision du 03/09 :
un retour volontaire vaut mission réussie, XP forfaitaire). Le bouton « Rentrer au camp »
apparaissant dès la première porte, on pouvait partir, rentrer aussitôt et toucher **10 XP**
pour 1 ration + 1 tentative — une ferme d'XP.

## Correctif

- `leaveNow` : sortie close en `"success"` **seulement si au moins un palier a été franchi**
  (`run.depth > 0`) ; sinon en `"return"` — butin éventuel gardé à 100 %, **0 XP**.
- La décision du 03/09 tient pour tout le reste : dès le premier palier, rentrer vaut mission
  réussie, et la profondeur n'influence toujours pas l'XP.
- Carte vivante inchangée (`"neutral"` dans les deux cas), écran de fin inchangé.
- Ration et tentative restent consommées (payées à la préparation, comme avant).

## Fichiers modifiés

- `js/systems/scene-run-system.js` (`leaveNow`)
- `round-harness.js` (libellés [S1], nouvelle section **[103]**)
- `sw.js`, `js/core/constants.js` (version)

Aucun fichier ajouté.

## Contrôles

- round-harness : 0 échec, stable sur 3 passages (2 763-2 765 OK, [85] sautée). Section
  **[103]** : 4 contrôles (profondeur 0 → `return`, 0 XP, butin banqué ; profondeur 1 → XP).
- boot-harness 4 OK ; hero-creation-harness 44 OK.
