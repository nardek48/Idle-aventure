# v3.541.0 — La veine suit le monde de la quête

Bug signalé par Seb : bloqué à « Ça ne fond pas » (montagne_04), aucune veine n'apparaissait. Option A.

## Le constat
La veine apparaissait selon le **monde de résidence**, celui où le héros a voyagé en dernier sur la carte, et non selon le monde de la quête jouée. Un joueur reparti dans un autre monde (pour l'Arbre-mère, par exemple) lançait « Ça ne fond pas » depuis l'Histoire : il se battait contre les ennemis de la Montagne, mais sans veine, et l'étape ne pouvait plus avancer. Le cas a été reproduit avec la sauvegarde du robot, qui réside encore à la Crypte.

## Ce qui change en jeu
- Pendant une quête d'aventure, la veine suit le monde de la quête.
  - Une quête de la Montagne a toujours ses veines, où que réside le héros.
  - Une quête d'un autre monde n'en a jamais, même si le héros réside à la Montagne.
- Hors quête, la règle ne change pas : c'est le monde de résidence qui compte. Au donjon, seule la Gueule du volcan a des veines.

## Code
- `systems/vein-system.js` : `worldHasVeins` lit le `worldId` de la quête en cours.
- Harnais [359].
- Aucun fichier protégé, aucun état sauvegardé, aucun texte ajouté.

## Contrôles
- Round : 5 386 OK, 0 échec, sur deux passes. Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- Chromium à 390 et 320 px : sauvegarde qui réside à la Crypte, montagne_04 acceptée, « Ça ne fond pas » lancée. La veine apparaît, et en Tactique elle est conseillée (anneau doré, « Objectif de l'étape → Tailler la veine »). 0 erreur.
- Campagne du robot (Chevalier, `--combats`) : 101 OK, 0 échec, 19,6 h ; 5 veines taillées à montagne_04.
