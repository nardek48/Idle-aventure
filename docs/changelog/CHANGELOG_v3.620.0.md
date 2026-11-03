# v3.620.0 — Habillage des cartes, lot 4 : fin du chantier

## Inventaire complet
68 écrans et fiches (onglets, sous-onglets, 21 fiches), téléphone et PC, relevés avec `00-cartes.css` désactivé :
- une seule classe crème restait hors des listes : `.hs-roster-btn` (bouton de l'équipe du Résumé, 70 px en PC) ;
- une seule classe a un pseudo-élément propre : `.ksec` (titres de section, 32 à 50 px), laissée en texture seule comme toute ligne fine. L'estimation « une dizaine » venait d'un relevé faussé par les pseudo-éléments du cadre lui-même.

## Changements
- `css/00-cartes.css` : `.hs-roster-btn` ajouté aux listes (cadre secondaire, texture, encres).
- `tools/harness/parcours-harness.js` (P14) : 33 écrans et fiches au lieu de 22 (Carte, Bibliothèque, Grimoire, Expéditions, fiches Entrepôt, Terrain, Apothicaire, Enchanteresse, Palissade, Grand Ouvrage, Patrouilles), téléphone et PC.
- Quoi de neuf : une ligne (FR + EN).

## Décision de Seb (02/11)
- La Chronique (PC) reste un panneau sombre ; seul son objectif est en parchemin.

## Contrôles
- Harnais, parcours P1–P14 (P14 : 70 contrôles), boot, création du héros, i18n.
