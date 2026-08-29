# Aethervale — Changelog v3.98.11

## Retrait de la pastille Aether du HUD

La pastille Aether en haut de l'écran (à côté de l'Or et de l'Essence) a été
retirée. L'Aether reste pleinement accessible et affiché via le raccourci
Ascension déjà présent dans le HUD (icône à droite) et dans l'onglet Ascension
lui-même — rien n'est perdu fonctionnellement, seul l'affichage redondant en tête
de page disparaît.

## Fichiers modifiés

- `js/ui/hud-view.js` — pastille `#hud-aether` retirée de `buildHudHTML()` et de
  `renderHud()`
- `css/02-layout.css` — règle `.nb-pill-aether` devenue orpheline, supprimée
- `sw.js` — `CACHE_VERSION` → 3.98.11

## Notes techniques

- Aucun fichier protégé modifié.
- `game.aether` (la donnée elle-même) n'est pas touché — uniquement son affichage
  dans le HUD.
