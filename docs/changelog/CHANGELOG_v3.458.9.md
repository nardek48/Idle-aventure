# v3.458.9 — Lot 8c, troisième dossier : portraits des héros en WebP (audit O4)

## Retirés
- Les 37 JPG et PNG de `images/Maps/`, remplacés par du WebP en v3.458.8.

## Héros en WebP
- Les 12 portraits (`images/Heroes/<classe>_m|f`) passent en WebP, mêmes dimensions (546 × 567), qualité 82 avec transparence : 6,2 → 0,7 Mo. Comparés au PNG sur fond parchemin : pas de différence visible.
- `heroes.js` : chemins `imageM` / `imageF`.
- Écran titre : un emplacement sauvegardé avant cette version garde son portrait en `.png` dans son résumé ; l'affichage le ramène au `.webp` (`titleScreenHeroImage`). Rien n'est réécrit dans la sauvegarde.
- Les PNG restent une version.

## Signalé à Seb (pas touché)
- `images/Heroes/full/*.png` : 12 portraits en pied (4,4 Mo) cités nulle part dans le jeu ni les outils.

## Contrôles
- round-harness 4545 OK, 0 échec (deux passes), section [264] ; création du héros 44 OK (attentes passées en .webp) ; boot OK ; parcours complets 139 OK, 0 échec ; `missing-icons.js` : les 24 mêmes absentes.
