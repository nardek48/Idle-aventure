# v3.458.5 — Lot 8a : moins de travail à chaque image (audit O1, O5, O12)

Première partie du lot 8 (performance), sans rien de visible. Mesures dans Chromium, processeur ralenti 4 fois (téléphone moyen), 390 × 844, deux relevés de 4 s par écran.

## O1 — L'écran de combat caché ne se redessine plus
- `inCombatScreen()` est vrai seulement sur l'onglet Combat (avant : dès que l'écran existait dans la page, même caché sous le Village). Équipe, scène, commandes et initiative suivent la même garde.
- Au retour sur le combat, les PV mémorisés pour les chiffres flottants repartent de zéro et tout est redessiné : l'écran suit l'état réel, sans faux chiffres (vérifié : PV changés pendant 3 s au Village).

## O5 — Le bandeau du haut
- La régénération du feu se calcule une fois par seconde, les bulles quatre fois par seconde ; `renderPanel` redessine les bulles tout de suite à chaque changement d'écran.
- Le texte et la jauge des PV du mini-héros ne sont réécrits que s'ils changent.

## O12 — Combat, partie affichage
- La classe « en train d'agir » vit dans la classe calculée de chaque ennemi : plus d'aller-retour entre deux fonctions à chaque image.
- Position et profondeur d'un ennemi écrites seulement si elles changent.
- La partie moteur (`tickRoundClock`, fichier protégé) attend une mesure sur un vrai téléphone.

## Mesures (script par image · modifications de la page par seconde)
| Écran | Avant | Après |
|---|---|---|
| Village | 3,5 à 3,7 ms · 120 /s | 0,8 à 1,2 ms · 0 /s |
| Campement | 3,5 à 3,7 ms · 120 /s | 1,0 à 1,4 ms · 0 /s |
| Combat ×4, Grimoire | 45 images/s · 330 /s | 44 à 47 images/s · 90 /s |

Le combat reste limité par les animations (style et mise en page, 5 ms par image) et par le moteur : à mesurer sur ton téléphone avant d'aller plus loin.

## Contrôles
- round-harness 4540 OK, 0 échec (deux passes) ; boot, création du héros OK ; parcours complets 139 OK, 0 échec.
- Aucun fichier protégé, aucun fichier ajouté, aucun texte nouveau.
