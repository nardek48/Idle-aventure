# v3.459.6 — Lot 9b : ménage dans les fichiers protégés (audit O3, O8, O10, P24 ; accord de Seb)

## Fichier nouveau
- **`js/ui/save-transfer-view.js`** : ajouté à `index.html` (après `settings-view.js`) et au précache de `sw.js`, dans ce même commit.

## Globales fantômes (O3)
- Les 52 appels à `QuestManager`, objet disparu, sont retirés de 16 fichiers, dont `combat-engine.js` (11), `save-system.js` (8) et `game-loop.js` (4). Ils ne faisaient rien (garde toujours fausse).
- `progression-system.js` : la garde `WorldQuestManager` (objet absent) est retirée ; `save-system.js` : `QUEST_CONFIG` partait avec le bloc `QuestManager.generateDaily`.
- `StoryQuestManager.skipAll` retiré : son bouton (« Débloquer tous les onglets ») est parti en v3.458.0.
- Le contrôle [265] des globales fantômes n'a plus d'exception hors API du navigateur.

## Sauvegarde (O10)
- L'interface d'export et d'import (fichier JSON, code à copier/coller, environ 260 lignes) quitte `save-system.js` pour `js/ui/save-transfer-view.js`. Fonctions et noms inchangés.
- La modale d'import s'appelle « Coller un code », comme le bouton des Paramètres (elle disait « Importer un code »).
- `stats-system.js` et `save-system.js` : les 8 lignes d'essence mortes (`essenceRegen`, `bossEssenceMult`, `essenceGlobalMult`, jamais lus) sont retirées.

## Quêtes (P24, O8)
- `QuestEnemyManager.spawnFor` : le monde, l'aventure, le pool et le boss empruntés sont rendus dans un `finally`, même si la génération lève une erreur.
- PV d'un membre de groupe par défaut (×0,50 à deux, ×0,35 à trois) : `QuestEnemyManager.groupHpMultDefault`, lu aussi par `adventure-quest-system.js`.

## Harnais
- [266] : erreur injectée dans `spawnFor` (échoue sur l'ancien code, passe sur le nouveau), PV de groupe, export/import déplacé et précaché, plus d'appel `QuestManager` ni d'essence morte, `skipAll` retiré, `storyPalierDesert` lu par `storyPalier`.

## Contrôles
- Export puis import par code dans Chromium : la partie exportée revient.
- round-harness 4550 OK, 0 échec (deux passes) ; boot, création du héros OK ; parcours complets 139 OK ; i18n 100 %, 0 orphelin.
- Campagne au robot (`campagne-lot --combats --n 2`) : les 3 classes vont au bout, médiane 26 h.
