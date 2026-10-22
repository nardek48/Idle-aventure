# v3.459.11 — Lot 10d : le fil rouge après l'Histoire (audit I1)

## Le constat
Après crypte_20, le fil rouge n'avait plus d'étape à proposer : patrouilles, Taverne, récolte, puis « Rien ne presse ». Rien ne montrait au joueur ce qu'il lui restait à bâtir.

## Ce qui change
Une fois tous les chapitres finis, le fil rouge propose des objectifs longs, chiffrés, avant « Rien ne presse » :
- **Reforges** : pièces reforgées au plus haut niveau du monde (10 dans la Crypte), sur 7 ;
- **Mémoire** : niveau atteint, sur le plafond du monde (16) ;
- **Enchanteresse** : bâtie jusqu'au niveau 2 ; ensuite, **bonus au maximum** sur les pièces relançables ;
- **Bestiaire** : fiches complètes (dernier palier atteint), sur le total ;
- **Hauts faits** : réclamés, sur le total.

Le plus proche du but est la proposition principale (« Reforges : 5 / 7 ») ; les suivants passent dans « Aussi ». Chaque bouton ouvre l'écran concerné. Un objectif atteint disparaît. Un nouveau chapitre (Montagne) fera revenir l'Histoire en tête.

## Code
- `fil-rouge-system.js` : source `_apres` (aucun nouvel écran, la bulle existante) ; `en.js` (16 textes).
- Icônes existantes : Forge, Enchanteresse, Bestiaire, Hauts faits (chacune pour son propre sujet).
- Aucun fichier protégé, aucun fichier ajouté.

## Contrôles
- Bulle vérifiée à l'écran à 390 et 320 px.
- Harnais [269] ; round-harness 4540 OK, 0 échec (deux passes) ; boot, création du héros, parcours OK ; i18n 100 %, 0 orphelin.
