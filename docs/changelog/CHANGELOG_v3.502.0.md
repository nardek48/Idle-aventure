# v3.502.0 — Grand écran, lot GE-1 : le format large corrigé

Accord de Seb du 26/10 (« on peut déjà faire les modifications »), option B du compte rendu grand écran, premier lot. Il corrige le format large existant (PC et tablette en paysage) d'après la mesure au pixel du 26/10 (`systemes/grand-ecran/` du dépôt Documentation). **Le téléphone ne change pas** : toutes les règles sont sous `html.wide-mode`.

## Ce qui change sur grand écran
| # | Avant | Maintenant |
| --- | --- | --- |
| G3 | Les bulles « à faire », empilées sous le menu de gauche, le recouvraient sous 900 px de haut (24 px à 1440 × 900, 35 px à 1366 × 768). | Elles sont en ligne dans le bandeau du haut, à gauche de l'or. Leur libellé s'affiche au survol de la souris. |
| G4 | Le portrait du Résumé, étiré dans une bannière de 1 141 px, ne montrait que 21 % du médaillon (s 4,2 sur Mac). | Le médaillon s'affiche en entier (220 px), le nom et l'XP à côté : s 0,89 sur Mac, 0,77 sur iPad. |
| G5 | La silhouette d'Équipement suivait la largeur : torse seul, emplacements loin du corps. | Elle garde une largeur fixe de 380 px, centrée. |
| G6 | L'arbre de Talents s'étirait, son fond aussi. | L'arbre, le sélecteur, la barre de points et la fiche tiennent dans une colonne de 520 px. |
| G7 | Une carte de compagnon prenait toute la largeur (interrupteur d'environ 1 000 px). | Les compagnons sont en grille (2 colonnes à 1440 px). |
| G8 | La carte du monde s'étirait : 2 mondes visibles sur 6, vignettes agrandies ×1,86. | La carte fait 540 px de large au plus, centrée : vignettes nettes (s 0,93 sur Mac). |
| G1 | Le récit d'une étape d'Histoire courait sur 145 à 196 caractères. | 60ch au plus (environ 70 caractères). |

## Mesures (Chromium, partie avancée aux Ruines)
- Bulles et menu : plus aucun chevauchement à 1440 × 900, 1366 × 768 et 1180 × 820.
- Téléphone (390 × 844) : mêmes positions et mêmes agrandissements d'images qu'en v3.501.0.
- Silhouette : s 1,56 sur Mac (zoom 1,15) ; le flou restant se règle avec l'image 2× (P3 de la liste des images) ou la mise en page du lot GE-4.

## Code
- `css/09-wide.css` : section « lot GE-1 ».
- `js/ui/heros-screens-view.js` : la liste des compagnons est enveloppée dans `.hs-comp-list` (sans style sur téléphone).
- Aucun fichier ajouté, aucun fichier protégé.

## Contrôles
`round-harness` 5 166 OK, 0 échec (deux passes) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` P11 15 OK.

## Reste à faire (lots suivants)
G2 (bandeau enrichi) et G11 (Menu dans le rail) au lot GE-2, Chronique au lot GE-3, fiches à droite au lot GE-4, combat dans la coque au lot GE-5.
