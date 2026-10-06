# Aethervale v3.429.1 — Correctif du donjon, harnais sous Windows

## Jeu
- **Donjon** : les ennemis de vague reprennent le trait fixe de leur créature (le Guerrier des sables est de nouveau Blindé, le Troll garde son bouclier, la Ronce son silence). Le correctif v3.380.0 avait été perdu par le commit « synchro outils » ; `dungeon-system.js` est revenu à sa version v3.429.0 (accord de Seb).

## Outils
- Les harnais et les bancs ne lisent plus `/tmp/scripts.txt` (Linux seulement) : la liste des scripts est lue dans `index.html` par `sim/index-scripts.js` (nouveau fichier d'outillage, pas chargé par le jeu).
- `round-harness.js` (avec la section [204]), `boot-harness.js` et `hero-creation-harness.js` sont remis dans le dépôt.

## Contrôles
- Round : **3 957 OK**, 0 échec (42 passes sur 43 ; la 43e : un échec isolé du test aléatoire « 200 runs au hasard sur foret_2 », à examiner).
- Boot : 4 OK. Création du héros : 44 OK.
