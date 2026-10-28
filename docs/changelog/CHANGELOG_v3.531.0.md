# v3.531.0 — Pastille « ! » sur l'onglet Camp (audit, lot 10 : TUT-13)

Décision de Seb : option A de l'atelier `atelier/reclamer-heros.html`.

## Le constat
Une étape d'Histoire se termine souvent dans Héros (s'entraîner, s'équiper). Le fil rouge, qui dit « ! Réclamer : … », y est masqué (décision des ateliers H-2 à H-5). Seul un toast de 2 secondes signalait la récompense.

## Ce qui change en jeu
- Quand le fil rouge propose de réclamer une récompense (l'Histoire d'abord, puis le tableau), l'onglet **Camp** porte une pastille rouge « ! », la même que la bulle du fil rouge.
- Elle s'éteint sur le Camp lui-même, où la bulle « ! » réclame en un toucher. On réclame donc en deux touchers depuis n'importe quel écran.
- Le fil rouge n'est pas touché. S'il est coupé dans les Paramètres, la pastille ne s'affiche pas non plus.
- Même rendu sur la barre du bas (téléphone) et sur le rail de gauche (tablette, PC).

## Code
- `ui/hud-dock-view.js` : `refreshTabClaimBadge`, appelée avec la bulle du fil rouge, toutes les 250 ms au plus.
- `css/02-layout.css` : `.tab-claim-badge`.
- Harnais [350].
- Aucun texte nouveau, aucun état sauvegardé, aucun fichier protégé ni ajouté.

## Contrôles
- Round : 5 350 OK, 0 échec, sur deux passes.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 6 591 textes, 100 %, 0 orphelin.
- Chromium à 390 px et en format tablette (1180 px), sauvegarde avec une récompense à réclamer :
  - pastille allumée sur Héros et au Village ;
  - éteinte sur le Camp ;
  - éteinte quand le fil rouge est coupé ;
  - 0 erreur.
