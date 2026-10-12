# Aethervale v3.448.8 — Une erreur ne fige plus la partie

Suite de l'audit du 11/10 (robustesse). Accord de Seb pour toucher `game-loop.js` (fichier protégé), modification minimale. S'applique sur la v3.448.7.

## Le constat
- La boucle de jeu redemandait l'image suivante à la toute fin de son pas (`requestAnimationFrame(gameLoop)`).
- Une seule exception dans ce pas (affichage, production, quêtes…) arrêtait donc la boucle pour de bon : plus de temps de jeu, plus de combat ni de production jusqu'au rechargement.
- Vérifié dans Chromium sur la v3.448.7 : erreur provoquée dans `renderHud`, temps de jeu figé à 1,45 s.

## Ce qui change
- Le corps de la boucle devient `gameLoopStep()`. `gameLoop()` l'appelle sous `try/catch`, puis demande toujours l'image suivante.
- L'erreur est écrite en console (`[boucle] …`), une seule fois par message : une erreur répétée à chaque image ne noie pas la console.
- Rien d'autre ne change dans la boucle.

## Contrôles
- Chromium, même erreur provoquée à chaque image : le temps de jeu avance (0,98 → 3,98 s en 3 s), une seule ligne en console, aucune erreur de page.
- `tools/harness/round-harness.js` : section [232] (3 contrôles).
- Round : **4 255 OK**, 0 échec, sur trois passes. Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- Aucun fichier ajouté. Fichier protégé modifié avec l'accord de Seb : `js/main/game-loop.js`.
