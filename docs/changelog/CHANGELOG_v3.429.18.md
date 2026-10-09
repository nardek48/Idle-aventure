# Aethervale v3.429.18 — Étape « L'outre » : Partir mène au Réservoir tant que l'Outre manque

Point relevé en jouant la troisième heure (option A, validée par Seb). S'applique sur la v3.429.17.

## Le constat
- L'étape `desert_03` (« Remplir 1 Outre au Réservoir, puis atteindre une destination en Petite aventure du Désert ») avait un lien fixe vers la Petite aventure du Désert.
- Une fois la Petite aventure faite, Partir y renvoyait encore, alors qu'elle était en recharge (« Dans 2 h 16 »). Rien ne menait au Réservoir, la seule chose qui restait à faire.

## Le correctif
- Le lien suit l'avancement :
  - Outre pas encore remplie : Village › Production › Ateliers, là où se trouve le Réservoir (même chemin que l'étape « Donner l'Outre »).
  - Outre remplie : la Petite aventure du Désert, comme avant.
- Mécanique existante de `goToLink` (`tab` en fonction, `afterGo`). Sans onglet, le lien retombe sur la carte de quête.

## Code
- `js/data/story-quests.js` : `linkTo` de `desert_03`.
- Aucun fichier protégé touché. Aucun fichier ajouté.

## Contrôles
- Chromium (390×844) : `goToLink` sur l'étape, Outre absente puis faite. Écran Village › Ateliers, puis carte de la Petite aventure. État restauré après le test.
- Round : **3 963 OK**, 0 échec, sur trois passages. Boot : 4 OK. Création du héros : 44 OK. i18n : 4 203 textes, 100 %, 0 orphelin.
- `node --check` sur les fichiers modifiés.
