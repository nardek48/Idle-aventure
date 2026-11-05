# v3.663.0 — Tout le Village est peint

- **Images** (Seb, 04/11, trois planches + une image) : 19 scènes de ligne dans `images/Buildings/scenes/`, 512 × 512 WebP qualité 85 (57 à 94 Ko).
  - Bâtiments (10) : village_grand_ouvrage, workshop, training, forge, apothecary, enchanter, hall, tavern, warehouse, palisade.
  - Ateliers (9) : atelier_boulangerie, cuisine_de_camp, scierie_fine, menuiserie, fonderie, forge_mine, tailleur_de_pierre, maconnerie, reservoir.
- `js/ui/village-view.js` : `BUILDING_SCENES_READY` liste les 25 scènes (6 de Production en v3.662.0).
- `tools/harness/round-harness.js` [186] : « Bâtiments : grille de vignettes » accepte aussi les scènes de ligne.
- Vérifié en capture (téléphone 390, PC 1440) sur les onglets Bâtiments et Ateliers.

Contrôles : round 6 140 OK (2 passes), boot 4 OK, parcours 212 OK.
