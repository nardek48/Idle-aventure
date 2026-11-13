# v3.787.0 — Simplification des rations (3/4) : vivres gratuits dans la besace (13/11/2026)

Décision de Seb (13/11, option 3) : la besace des Petites Aventures garde ses trois rations (Petite 35 %, Moyenne 60 %, Grande 100 %, 1 à 3 places), toujours disponibles et gratuites. Le choix devient la place dans la besace. Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Ce qui change
- **Rations sans stock** (`data/pa2-content.js`) : les trois rations n'ont plus de `resource`. Elles ne sont plus prises à l'Entrepôt au départ ni rendues au retour, et la feuille ne montre plus « Entrepôt : n ». Elles portent leur nom en propre.
- **Le pain d'abord** (Mémoire 24) : toujours +10 % sur les rations de la besace (`systems/pa2-run.js`, lu par l'id de l'objet).
- **Textes** : la fuite ne dit plus que les rations retournent à l'Entrepôt ; la description du Pain d'abord précise « de la besace ».
- **Traductions** : 2 textes nouveaux, 2 orphelins retirés.

## Rattrapage de la v3.786.0
La publication de la v3.786.0 a échoué au harnais de GitHub (le site est resté en v3.785.0) : des textes changés après le dernier passage local (PV bas avant un combat, fiches des rations) cassaient 4 contrôles. Ils sont adaptés ici : [188], [274], [458], [495]. La v3.786.0 part en ligne avec cette version.

## Contrôles
- `round-harness` 7093 OK, 0 échec. Contrôles de la besace adaptés : [158] (trois rations sans stock, Entrepôt intact au départ et au retour), [484] (les trois rations toujours dans la feuille ; rien pris à l'Entrepôt).
- boot 4 OK ; création du héros 46 OK ; i18n 100 %, 0 orphelin.
- Quoi de neuf : une ligne (FR + EN).
