# v3.544.0 — L'or du Labyrinthe suit le monde atteint (audit CMP-3, option B)

Point de l'audit traité sur délégation de Seb (« je suis tes recommandations »).

## La mesure
Robot explorateur, profil palier Rare des Ruines, 40 descentes par classe : une descente rapporte 1 500 à 2 000 or et 4,5 à 5,4 Pierres errantes, pour 1 Ration moyenne. À la Crypte, la bourse du robot vaut 90 000 à 240 000 or, et jusqu'à 1 million à la Montagne. L'or du Labyrinthe ne comptait donc plus après les Ruines, et seule la Pierre gardait un intérêt.

## Ce qui change en jeu
- L'or du Labyrinthe (escaliers, coffres, combats) est multiplié selon le monde atteint, comme la Sève des élites (PLA-4) : Ruines ×1, Crypte ×2,86, Montagne ×5,68.
- Le multiplicateur est le rapport entre l'or d'un ennemi du premier lieu du monde atteint et celui du squelette des Ruines. Il suit donc l'or des monstres.
- Exemple, l'escalier de l'étage 3 : 450 or aux Ruines, 1 287 à la Crypte, 2 556 à la Montagne. Une descente moyenne passe d'environ 1 700 or à environ 4 900 (Crypte) et 9 700 (Montagne).
- Les Pierres errantes, les combats et le Souffle ne changent pas.

## Code
- `systems/labyrinth-run.js` : `goldMult` (calculé une fois par descente), appliqué à `stairsGain`, aux coffres et à l'or des combats (l'estimation affichée suit).
- Harnais [362].
- Aucun fichier protégé, aucun nouvel état à câbler (le multiplicateur vit dans la descente en cours), aucun fichier ajouté.

## Contrôles
- Round : 5 392 OK, 0 échec, sur deux passes. Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- Banc du Labyrinthe (`--robot`, 20 descentes par classe) : profondeur et fins inchangées.
- Chromium (sauvegarde de la Montagne) : Crypte ×2,86, Montagne ×5,68, 0 erreur.
