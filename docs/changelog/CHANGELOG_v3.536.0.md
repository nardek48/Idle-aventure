# v3.536.0 — Retour d'Android et touche Échap (audit, lot 10 : ERG-7)

Décision de Seb : option A de l'atelier `atelier/retour-android.html`. Le constat : le jeu n'utilisait pas l'historique du navigateur. Sur Android, le geste retour quittait le jeu même avec une feuille ouverte, et sur PC, Échap ne fermait rien.

## Ce qui change en jeu
- **Retour d'Android** :
  1. il ferme le calque du dessus (feuille, fiche, menu ☰, bulle du fil rouge, rapport…) en touchant sa croix ; une confirmation est annulée ;
  2. une fenêtre sans croix (choix, fin de quête, aide d'étape, carte « Niveau N ») attend sa réponse : le retour ne fait rien, et le jeu ne se ferme plus ;
  3. rien d'ouvert, hors du Camp : retour au Camp ;
  4. rien d'ouvert, au Camp : le message « Retour encore une fois pour quitter » s'affiche, et le retour suivant quitte.
- **Échap (PC)** : ferme le calque du dessus, selon les points 1 et 2. La Chronique garde sa propre touche Échap.
- **iPhone** : pas de bouton retour, rien ne change.

## Code
- `ui/ui-root.js` : `backNavArm`, `backNavCloseTop`, `backNavOnPop`.
- Une seule règle pour toutes les feuilles : toucher la croix `.ksheet-x` du calque du dessus (le plus grand z-index, et à z-index égal le dernier dans la page).
- Une entrée d'historique « garde » est reposée à chaque toucher, car Chrome ignore les entrées ajoutées sans geste de l'utilisateur.
- `en.js` : 1 texte.
- Harnais [355].
- Aucun état sauvegardé, aucun fichier protégé ni ajouté.

## Contrôles
- Round : 5 375 OK, 0 échec, sur deux passes.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 6 608 textes, 100 %, 0 orphelin.
- Chromium en format iPhone, avec le retour du navigateur (même mécanisme que le geste Android) et Échap, 0 erreur :
  - feuille Stats : fermée ;
  - Héros sans calque : retour au Camp ;
  - fiche de la Forge avec une confirmation par-dessus : la confirmation, puis la fiche ;
  - fin de quête : reste ouverte ;
  - menu ☰ et Échap : fermé ;
  - au Camp : le message, puis le jeu se ferme.
- **Reste à faire** : un essai sur un vrai Android, avec le jeu installé.
