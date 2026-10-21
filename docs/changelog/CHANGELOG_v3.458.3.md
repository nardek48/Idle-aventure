# v3.458.3 — Lot 7a : parcours plus courts (audit C1, C4, C9, C13)

Première partie du lot 7 (parcours simplifiés) : ce qui change un geste sans changer la mise en page. Le reste (7b) passe d'abord par l'atelier.

## C1 — « Partir » lance la quête de l'étape
- Une étape d'Histoire liée à une quête d'aventure ou de chasse ouvre directement sa fenêtre « Commencer » depuis le Camp (avec le pronostic et la préparation, comme sa propre carte). Avant : changement d'onglet vers Quêtes › Aventure, puis « Accepter » une seconde fois la même quête.
- 2 touches et un détour de moins, environ 75 fois par partie (17 étapes concernées). Quête déjà lancée : retour au combat.
- Les autres liens (onglets, donjons, cartes vivantes, scènes) gardent leur chemin. Code : `MissionBoard.launchStoryLink` (`mission-board-system.js`), sans toucher au système de quêtes.

## C4 — Mémoire : le choix en attente d'abord
- L'écran Mémoire s'ouvre sur le premier niveau qui attend un choix (il était à environ 3 200 px plus bas).
- La pastille « Un choix t'attend » devient un bouton qui y mène.

## C9 — Ration épuisée
- Toucher une ration à 0 dit où elle se prépare : « Les rations se préparent à la Cuisine de camp : Village › Ateliers. » Avant : bouton muet.

## C13 — Talents : ce qui limite
- Quand c'est le niveau qui limite (un point par niveau), l'écran dit « le prochain au niveau N » au lieu de « plafond de l'acte ». Le plafond de l'acte reste affiché quand c'est lui qui limite.
- Outil : profils de `plafond-bench.js` recalés sur les points réels du robot en début d'acte (4 / 6 / 7 / 8, 9 à l'entrée de desert_15, 10 en fin de Désert ; avant 5 / 7 / 9 / 11).

## Contrôles
- round-harness 4533 OK, 0 échec (deux passes), section [261] ; boot, création du héros OK ; parcours complets 139 OK ; i18n 100 %, 0 orphelin.
- Chromium : « Partir » sur forest_02 ouvre « Premier sang » sans quitter le Camp ; Mémoire ouverte sur le niveau 3 en attente ; message de la ration vide ; texte des talents au niveau 4 et au niveau 9.
- Aucun fichier protégé, aucun fichier ajouté.
