# v3.804.0 — Combat : barre de ressource lisible sur petit écran (14/11/2026)

Audit de l'Alpha (13/11), défauts visuels : « ncentration61 / 1 » en mode Grimoire, « Concentration44/ 100 » en Tactique. CSS seul. Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Mesure (Chromium, 320 / 375 / 390 / 430 px, sauvegardes du robot)
- « Concentration 61 / 100 » tient dans environ 100 px. La barre du héros fait 65 à 102 px en Grimoire (carte épurée) et 113 px en Tactique à 320 px : le texte, centré, débordait des deux côtés, d'où « ncentration… / 1 ».
- L'espace entre le nom, la valeur et « / max » disparaissait (espace en bord d'élément flex), sur la ressource comme sur les PV (« 560/ 560 »).

## Changement (`css/03-combat-screen.css`)
- `.cbx-res` devient un conteneur (`container-type: inline-size`) ; sous 130 px, `.cbx-res-lbl` se retire : la barre affiche « 61 / 100 », comme déjà avec 2 ou 3 compagnons (`07-responsive.css`).
- Espace réel : `gap: .3em` entre nom, valeur et maximum ; `margin-left: .3em` avant le maximum des PV.

## Résultat
- Tactique, 375 px et plus : « Concentration 46 / 100 », « Rage 100 / 100 ». Tactique 320 px et Grimoire : « 46 / 100 ». Plus aucun débordement mesuré.
- Navigateurs sans requêtes de conteneur : le nom reste affiché, comme avant.

## Contrôles
- `round-harness` 7120 OK, 0 échec, sur 2 passes ([513n]).
- boot 4 OK ; création du héros 46 OK ; parcours complet 236 OK ; audit design sans écart ; i18n 100 %.
- Quoi de neuf : une ligne (FR + EN).
