# v3.510.0 — Petite aventure et donjon dans le fil rouge, moins de bulles

Décisions de Seb du 27/10 : option B (petite aventure et donjon dans le fil rouge, bulle des talents retirée), puis option A (3 places dans « Aussi »).

## Ce qui change en jeu
- Les bulles **Talents**, **Petite aventure** et **Donjon** disparaissent. Il reste au plus 3 bulles : or à investir, sac, fil rouge.
- Le fil rouge propose la petite aventure du jour et les sorties de donjon restantes, juste après la Taverne et avant les zones pleines. Pas de proposition sur l'écran concerné (petite aventure en cours, écran Donjon).
- Les talents restaient déjà dans le fil rouge depuis v3.508.0.
- La ligne « Aussi » de la bulle du fil rouge a 3 places : les deux propositions suivantes, puis les hauts faits à réclamer (ils prenaient avant la 2e place).

## Code
- `systems/fil-rouge-system.js` : sources `_pa` et `_dungeon` (et leurs aides, reprises du dock) ; `also()` ajoute le haut fait en 3e place.
- `ui/hud-dock-view.js` : `hudDockItems()` ne garde que le sac.
- `lang/en.js` : 3 textes, 1 orphelin retiré (« point de talent à placer »).
- Harnais [178] mis à jour, [332] nouveau. Vérifié dans Chromium à 320 et 390 px.
- Aucun fichier ajouté, aucun fichier protégé.
