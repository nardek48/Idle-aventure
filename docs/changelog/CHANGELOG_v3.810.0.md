# v3.810.0 — Rythme : Puits et Chasse plus généreux au début (15/11/2026)

Rythme de l'Alpha (audit du 13/11), soin au camp du Désert. Option P2 de Seb (15/11). Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Diagnostic (robot, traces `healLog`, `TRACE_EAU`)
- Le soin au camp (Rôdeur et Mage 1,3 h, Chevalier 0,4 h) vient du Repas impayable : il manque 3 à 7 d'eau (parfois de viande) au moment de repartir.
- L'eau part ailleurs : zones de production ~450, Apothicaire jusqu'à 540, quête de Wenna 150 ; le Repas n'en prend que 6 à 56.
- La production attendue par le robot (1,5 à 2 h) est gonflée par son palier de 10 min : 0,4 à 0,85 h strictement nécessaires.

## Changement
- `data/production-plots.js` : `earlyBoost` (Puits 3, Chasse 2) et `earlyBoostUntil: 10` (plafond du Désert).
- `systems/production-plots-system.js` : `earlyBoostMult`, ×earlyBoost au niveau 1, ×1 au niveau 10, baisse au carré (en linéaire, le débit du Puits reculait entre 9 et 10). Débit par niveau (parcelle rapide, eau/min) : 1,68 · 2,46 · 2,97 · 3,28 · 3,44 · 4,22 · 4,79 · 5,29 · 5,85 · 6,61.

## Mesure (robot, 2 lots de 6 parties jusqu'à ruines_01, avant / après)
- Temps total médian 4,2 → 4,0 h ; Forêt 1,0 → 0,7 h ; Désert 3,3 h inchangé.
- Soin au camp (médiane) 1,0 → 0,6 h.
- Effet de bord : le robot monte moins de parcelles (médiane ~103 → ~81, il dépense le bois en Chasse et Puits) et attend plus le fer : production 1,8 → 2,1 h (strictement nécessaire ~0,7 → ~1,2 h). Ordre de montée du robot, à juger en jeu.
- 6/6 au bout dans les deux lots, aucune mort.

## Contrôles
- `round-harness` 7139 OK, 0 échec, sur 2 passes ([513r] ; [190] compare hors bonus de début).
- boot 4 OK ; création du héros 46 OK ; parcours complet 236 OK ; i18n 100 %.
- Quoi de neuf : une ligne (FR + EN).
- Outils : le robot trace le soin (`healLog`), la production (`prodLog`, temps strictement nécessaire), les dépenses d'une denrée (`TRACE_EAU`), les niveaux des parcelles ; bancs `EXP_PUITS`/`EXP_BATS`, `SANS_BOOST`.
