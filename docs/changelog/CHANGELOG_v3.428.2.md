# Aethervale v3.428.2 — Retours de Seb (04/10)

Ce delta s'applique sur la v3.428.1.

## Donjon : le décor ne change plus en cours de route
- Cause : à chaque nouveau groupe d'ennemis, le moteur remettait le décor du monde par-dessus celui du donjon. Le donjon de la Forêt passait au décor de la Forêt dès la première vague à plusieurs ennemis.
- Correctif : `WorldManager.applyWorldTheme` reprend le décor de la sortie en cours. C'est le donjon, sinon la quête d'aventure ou de chasse, sinon l'élite de carte. Le même défaut touchait une quête jouée dans un autre monde que celui où l'on réside : il est réglé aussi.

## La traversée vers le Désert est plus dure
- Les trois scarabées passent de 0,5 à **1,3** de force.
- Banc au profil fin de Forêt : « Tenir » coûte **20 à 23 %** des PV, « Charger » **38 à 42 %**. Avant, c'était 3 et 6 %. Pour comparaison, la traversée des Ruines coûte 31-35 % et 57-65 %.
- Le robot de campagne passe toujours la traversée avec les trois classes, sans mort.

## La relève se voit à l'écran
- Un ennemi à terre est **couché et grisé**, avec un halo pâle.
- Le bandeau affiche **« Il se relève ! Achève-le ! »**.
- La pastille ouvre la feuille « États du combat », qui a une nouvelle ligne « À terre » : ce qui se passe, et comment l'achever.
- L'icône `rising.png` reste à générer : un « ? » générique s'affiche en attendant.

## La Petite ration de « La source tarie »
- Elle est déjà en jeu depuis la v3.427.1 : 175 or, 5 Eau et **1 Petite ration**.

## Contrôles
- Round : 3 924 OK, 0 échec. Le contrôle de la nuée utilise maintenant un héros au profil fin de Forêt.
- Boot : 4 OK. Parcours : 139 OK.
- i18n : 3 998 textes, 100 %.
