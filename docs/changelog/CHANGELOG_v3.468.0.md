# v3.468.0 — Petites Aventures : des sentiers coupés à chaque run

Suite du retour de Seb (« toujours les mêmes chemins »). Décisions PG-A1 et PG-A1b de la conception des pièges ; l'atelier `atelier/sentiers-coupes.html` a été validé par Seb.

## Ce qui change en jeu
- **À chaque run, 3 à 5 sentiers sont coupés** par un obstacle du monde :

  | Monde | Obstacles |
  | --- | --- |
  | Forêt | Arbre abattu, Ruisseau en crue |
  | Désert | Dune nouvelle, Ravin effondré |
  | Ruines | Rue effondrée, Porte murée |
  | Crypte | Grille tombée, Voûte écroulée |

- La route change donc d'un run à l'autre, sur les mêmes cartes peintes.
- Garanties :
  - chaque point garde une sortie, et les trois destinations restent accessibles ;
  - aux Ruines, rien n'est coupé au départ d'un point dont un mur bouge ;
  - les parcours (quêtes, étapes d'Histoire) ne sont jamais coupés.
- **Un rond gris barré** marque le milieu du sentier coupé, sur un trait gris pâle, dès qu'il est en vue, même dans le noir de la Crypte. Le toucher nomme l'obstacle : « Arbre abattu : le sentier est coupé. »
- Les pièges se posent ensuite sur les sentiers restants. Un point garde toujours une sortie sans piège parmi ses sentiers ouverts.
- Légende de la carte : une ligne « Sentier coupé ».
- Un run commencé avant la mise à jour n'a pas de coupures.

## Mesures (`pa2-bench`, 150 runs par cellule)
| Cas | KO sans coupures | KO avec | Or par run sans / avec |
| --- | --- | --- | --- |
| Forêt, Périple | 35 % | 34 % | 234 / 236 |
| Crypte, Périple | 18 % | 17 % | 1 848 / 1 845 |

Les coupures ne changent ni la difficulté ni l'or : elles ne font que varier la route.

## Code
- `data/pa2-content.js` : `PA2_CUT_RULES` (3 à 5), `PA2_CUTS` (deux obstacles par monde).
- `systems/pa2-run.js` :
  - `_placeCuts` et `_destsReachable` au départ, avant les pièges ;
  - `links` retire les sentiers coupés, et `_placeTraps` travaille sur ce tracé ;
  - `isCutShown`, `cutDef`.
- `ui/pa2-view.js` : rond gris sur la carte, `pa2CutInfo`, ligne de légende ; `css/04-panel-pa2.css` : `.pa2-cut`.
- `lang/en.js` (11 textes) et `lang/data-fields.js` (`PA2_CUTS`).
- État du run dans `game.sceneRun.cuts`, déjà sauvegardé ; aucun fichier protégé, aucun fichier ajouté.

## Images à faire (icône générique en attendant)
`images/Icons/scene/cuts/` :
- `cut_fallen_tree.webp`, `cut_flood.webp` (Forêt) ;
- `cut_dune.webp`, `cut_ravine.webp` (Désert) ;
- `cut_collapsed_street.webp`, `cut_walled_door.webp` (Ruines) ;
- `cut_gate.webp`, `cut_collapse.webp` (Crypte).

## Outils
- `round-harness.js` :
  - section [282] (9 contrôles ; 150 runs sur cinq cartes : nombre, sortie, destinations accessibles, pièges, Ruines, obstacle ; tracé, carte, Crypte, parcours) ;
  - les coupures suivent le même interrupteur que les pièges (`g.__traps`) ;
  - en [281], un test qui pose ses pièges à la main part d'un tracé intact.
- `pa2-bench.js` : `--sans-coupes`.

## Contrôles
- Chromium, 390 et 320 px, vrai jeu : ronds gris de 36 et 27 px, nom de l'obstacle au toucher, Crypte, rien ne déborde.
- i18n 100 %, aucun orphelin ; `missing-icons.js` : 14 images absentes (les 8 ci-dessus et les 6 des pièges).
- round-harness 4694 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
