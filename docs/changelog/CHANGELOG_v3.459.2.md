# v3.459.2 — Lot 8c, sixième passe : attaques, Mémoire, carte, mondes, production, compagnons (audit O4)

## Retirés
- Les 77 PNG des hauts faits et des ressources, remplacés par du WebP en v3.459.1.
- Les 12 portraits en pied `images/Heroes/full/*.png` (4,4 Mo), cités nulle part ; accord de Seb. Les deux silhouettes WebP restent.

## En WebP
- 69 images : `Icons/special_attacks`, `Icons/memory`, `Map`, `Worlds`, `Production`, `Companions`. Icônes ramenées à 256 px au plus ; illustrations aux mêmes dimensions. 9,1 → 1,8 Mo.
- Chemins réécrits dans 11 fichiers (dont `memory.js`, `production-buildings.js`, `companions.js`, `06-map.css`, `04-panel-production.css`), plus la vignette de monde construite par `map-view.js` (`thumb_<monde>.webp`).
- Les attaques de base à créer portent maintenant un nom en `.webp` (`basic_knight`, `basic_archer`, `basic_mage`), comme les hauts faits.
- Les originaux restent une version.

## Contrôles
- Les 69 WebP se décodent dans Chromium ; combat, Mémoire, carte du monde et Village › Production vérifiés à l'écran ; `missing-icons.js` : les 24 mêmes absentes.
- round-harness 4545 OK, 0 échec (deux passes) ; boot, création du héros OK ; parcours complets 139 OK, 0 échec.
