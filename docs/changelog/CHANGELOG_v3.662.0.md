# v3.662.0 — Scènes peintes de la Production

- **Images** (Seb, 04/11, validées dans l'atelier `atelier/scenes-production.html`) : `images/Buildings/scenes/prod_hunt|prod_farm|prod_sawmill|prod_mine|prod_quarry|prod_well.webp`, 512 × 512 WebP qualité 85 (61 à 73 Ko). Téléphone : moitié droite de chaque ligne, recadrée en 3:2 par le jeu ; PC : vignette entière.
- `js/ui/village-view.js` : `BUILDING_SCENES_READY` liste les 6 clés de Production (système des scènes de ligne de la v3.647.0, inchangé).
- `tools/harness/round-harness.js` [186] : « six vignettes illustrées » accepte aussi les six scènes de ligne.
- À suivre : une version 1536 × 1024 de chaque scène serait plus nette sur PC (la planche donnait 512 px par scène).

Contrôles : round 6 140 OK (2 passes), boot 4 OK, parcours 212 OK.
