# v3.803.0 — Pronostic des élites blindées : coups reçus ×1,6 (14/11/2026)

Option C du chantier pronostic (audit de l'Alpha) : les élites. Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Diagnostic
- Robot, 6 parties, nouvelle trace `PRONO=1` des **élites de carte** : 182 combats, 0 mort, 2 « Très difficile » seulement (Bête des dunes, Rôdeur). Rien à corriger.
- Quêtes d'élite : seul le **Porte-couronne** pose problème, 3 morts du Mage sous « Abordable » (ratio 0,82) sur l'ensemble des séries.
- Sonde au moteur (sauvegardes du robot à crypte_11, 6 combats au Mage, 6 au Chevalier) : durée du combat juste (20 à 22 rounds pour 21) ; coups reçus par le groupe 125 à 148 par round pour 96 estimés (Mage), 92 à 123 pour 84 (Chevalier), soit ×1,33 environ.
- L'escorte (spectre, esprit) n'y est pour rien : 12 et 19 par round, tombée au premier round.

## Changement
- `systems/combat-forecast-system.js` : `FORECAST_ELITE_DMG_MULT.armored` 1,2 → 1,6 (1,2 × 1,33 mesuré). Enragée (2,0) et protégée (1,2) inchangées.
- Élites blindées concernées : Porte-couronne, Serment sous l'armure, Gardien qui répète, golems.

## Mesure
- Hors ligne (série précédente) : les 2 morts du Mage au Porte-couronne passent en « Risqué » ; les autres élites blindées bougent d'un cran au plus.
- Robot, 6 parties : **0 mort sur 677 sorties**. Porte-couronne : « Risqué » à « Hors de portée » pour le Rôdeur (gagné à 32 à 41 % des PV), « Abordable » ou « Risqué » pour les autres.
- « Hors de portée » 8, sans mort (le Rôdeur concentre ces alertes dans cette série : Ossuaire, Porte-couronne, Tour) ; à suivre en jeu.
- Banc `forecast-calibration-bench.js` : sortie identique.

## Outils
- Robot `tools/sim/campagne-harness.js` : trace `PRONO=1` des élites de carte (première libération et rejeu).

## Contrôles
- `round-harness` 7118 OK, 0 échec, sur 2 passes ([513m] ; contrôle de v3.523.0 mis à jour pour ×1,6).
- boot 4 OK ; création du héros 46 OK ; parcours complet 236 OK ; i18n 100 %, 0 orphelin.
- Quoi de neuf : une ligne (FR + EN).
