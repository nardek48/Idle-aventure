# v3.733.0 — Correctif : l'offrande aux braises depuis la carte de mission (07/11/2026)

Bug signalé par Seb (07/11, capture iPhone) : à forest_15 « Les braises s'éveillent », Orc battu, 3 Sève et 1 Ration moyenne réunies, impossible de donner la ration : bloqué.

## Cause
La carte de mission de l'étape (Camp › Missions, Quêtes) gardait « Partir », qui renvoie au Campement (`linkTo` → `campement`) : on y est déjà, rien ne se passe. Le bloc « Les braises » et son bouton « Offrir aux braises » existent et marchent, mais ils sont posés sous la carte, hors du premier écran (y = 1 148 px pour un écran de 844).

## Corrigé
- `MissionBoard` (`js/systems/mission-board-system.js`) : quand le reste de l'étape est fait et qu'une offrande du Campement l'attend (lien vers le Campement, ou pas de lien), le bouton de la carte devient « Offrir aux braises » et fait l'offrande (s'il manque quelque chose, le message le dit). Avant l'Orc, la carte mène toujours à la quête d'aventure.
- Vérifié à l'écran (Playwright, 390 × 844) : le bouton est visible sans défiler (y = 560) et fait l'offrande.

## Contrôles
round-harness 7 002 OK, 0 échec (2 passes), dont la section [494] ; boot ; création du héros ; i18n 0 manquant, 0 orphelin ; parcours 235 OK.
