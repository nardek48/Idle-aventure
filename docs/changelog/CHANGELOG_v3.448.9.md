# Aethervale v3.448.9 — Sauvegarde impossible signalée, erreurs rattrapées tracées

Suite de l'audit du 11/10, deux points demandés par Seb. Modification minimale de `save-system.js` (fichier protégé), nécessaire au premier point. S'applique sur la v3.448.8.

## Sauvegarde impossible
- Avant : si le stockage du navigateur était plein, `saveGame` renvoyait `false` sans rien dire. Le joueur croyait sa partie sauvegardée. Le bouton « Sauvegarder maintenant » non plus ne disait rien.
- Désormais, au premier échec, un message (et une ligne de journal) :
  - stockage plein : « Sauvegarde impossible : la mémoire du navigateur est pleine. Exporte ta partie (Paramètres) pour ne rien perdre. » ;
  - si le Journal de test est actif, il propose d'abord de l'effacer (c'est lui qui occupe le plus de place) ;
  - autre cause : « Sauvegarde impossible pour l'instant… ».
- Tant que ça dure, le message revient au plus toutes les 5 minutes (la sauvegarde automatique tourne toutes les 30 s).
- L'import d'une sauvegarde prévient de la même façon si un emplacement est refusé par le stockage.

## Erreurs rattrapées tracées
- 29 blocs `catch` ne faisaient rien (stockage, vibration, redessin, pronostic, objectifs de hauts faits…). Ils appellent maintenant `noteErreur(lieu, e)` (`core/utils.js`) : une ligne en console par lieu (`[rattrapée] save-system.saveGame : …`), les suivantes seulement comptées dans `window.erreursNotees`.
- Le comportement du jeu ne change pas : ces erreurs restent rattrapées.
- Fichiers : `core/i18n.js`, `main/journal-test.js`, `main/pwa.js`, `systems/achievement-system.js`, `systems/prefs-system.js`, `systems/save-system.js`, `ui/debug-touch-view.js`, `ui/desktop-scale.js`, `ui/dungeon-view.js`, `ui/labyrinth-view.js`, `ui/pa2-view.js`.

## Contrôles
- Chromium : stockage saturé jusqu'au dernier octet → `saveGame` renvoie `false`, le message s'affiche, pas de répétition immédiate ; aucune trace « rattrapée » en jeu normal ; aucune erreur de page.
- `tools/harness/round-harness.js` : section [233] (6 contrôles), dont un relevé qui refuse tout `catch` muet dans les scripts du jeu.
- Round : **4 261 OK**, 0 échec, sur trois passes. Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK. i18n : 4 663 textes, 100 %, 0 orphelin.
- Aucun fichier ajouté. Fichier protégé modifié : `js/systems/save-system.js` (avertissement et traces seulement).
