# Aethervale v3.429.1 — Correctif du donjon, harnais sous Windows

## Jeu
- **Donjon** : les ennemis de vague reprennent le trait fixe de leur créature (le Guerrier des sables est de nouveau Blindé, le Troll garde son bouclier, la Ronce son silence). Le correctif v3.380.0 avait été perdu par le commit « synchro outils » ; `dungeon-system.js` est revenu à sa version v3.429.0 (accord de Seb).

## Outils
- Les harnais et les bancs ne lisent plus `/tmp/scripts.txt` (Linux seulement) : la liste des scripts est lue dans `index.html` par `sim/index-scripts.js` (nouveau fichier d'outillage, pas chargé par le jeu).
- `round-harness.js` (avec la section [204]), `boot-harness.js` et `hero-creation-harness.js` sont remis dans le dépôt.

## Réorganisation du dépôt (même version : fichiers publiés identiques)
- `game/` : le jeu, seul dossier publié. Les 845 fichiers sont déplacés sans modification : adresse, sauvegardes et cache des joueurs inchangés.
- `tools/harness`, `tools/sim`, `tools/audit`, `tools/docs-gen` : l'outillage ; `tools/chemins.js` donne la racine du jeu (`game/` par défaut) et le dossier de sortie `captures/` (hors git).
- `docs/changelog/` (changelogs v3.422.0 à v3.429.1), `atelier/`, `README.md`.
- Publication par GitHub Actions (`.github/workflows/pages.yml`), seulement si round, boot et création du héros passent.
- `.gitattributes` : fins de ligne LF.
- `tools/docs-gen/generate-balance-guide.js` remarche : le tableau des intensités des Petites Aventures v1 (`SCENE_INTENSITY`, retiré en v3.388.0) est omis. Les tables sont lues dans le code ; le texte rédigé reste daté (v3.331.0) et la section 1.7 décrit encore les Petites Aventures v1.
- Workflow : `actions/checkout@v5` et `actions/setup-node@v5` (Node 24, Node 20 abandonné par GitHub).
- Test « 200 runs au hasard sur foret_2 » : échec rare (1 passe sur ~190, jamais reproduit). Il indique désormais le premier run fautif (nœud, action, résultat, PV, souffle).

## Contrôles
- Round : **3 957 OK**, 0 échec (42 passes sur 43 ; la 43e : un échec isolé du test aléatoire « 200 runs au hasard sur foret_2 », à examiner).
- Boot : 4 OK. Création du héros : 44 OK.
