# v3.459.1 — Lot 8c, cinquième dossier : icônes des hauts faits et des ressources en WebP (audit O4)

## Retirés
- Les 49 JPG de `images/Enemies/` et `images/Boss/`, remplacés par du WebP en v3.459.0.

## Hauts faits et ressources en WebP
- 77 icônes (`Icons/achivement/`, `Icons/resources/`), ramenées à 256 px au plus, qualité 85 avec transparence : 12,6 → 1,1 Mo.
- Chemins : `achievements.js` (dont l'icône par défaut `ACH_ICON + id + ".webp"`), `warehouse-view.js`, `living-map-view.js`, `tutorial-view.js`, `pa2-content.js`, `hunt-quests.js`, `story-quests.js`, `production-buildings.js`, outil `missing-icons.js`.
- Les 21 icônes de hauts faits encore à créer portent maintenant un nom en `.webp` (icône générique en attendant, comme avant). Les images peuvent être fournies en PNG : elles sont converties à l'intégration.
- Les PNG restent une version.

## Contrôles
- Les 77 WebP se décodent dans Chromium ; Hauts faits et Taverne vérifiés à l'écran ; `missing-icons.js` : les 24 mêmes absentes (noms en .webp).
- round-harness 4545 OK, 0 échec (deux passes) ; boot, création du héros OK ; parcours complets 139 OK, 0 échec.
