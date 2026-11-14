# v3.798.0 — Forêt : foret_2b, le camp en détour (14/11/2026)

Point 5 des « Signalés », option C (Seb 14/11). Conception Parcours PA v0.2, §5.2 (E). Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Carte `foret_2b` (`data/pa2-maps.js`)
- Même image et mêmes places que `foret_2`. Seuls deux sentiers changent : `L2 > L4` et `R2 > R4` remplacent `L2 > CAMP` et `R2 > CAMP`.
- Seul C2 mène au camp : le repos et le cadeau du camp deviennent un choix.
- R2 > R4 suit un sentier peint. L2 > L4 coupe à travers les arbres, comme L2 > CAMP avant lui.
- Tirée en Forêt avec `foret_1` et `foret_2` : une chance sur trois chacune.
- Passages secrets et rive du lac (accroche du gouffre) repris de `foret_2`.
- Le carnier, si le camp est sauté, s'annonce déjà au seuil : rien à changer dans le moteur.

## Banc (Périple, 150 runs × 3 classes × 4 étapes, `--ovr={"map":…} --resume`)

| Carte | KO | Repos par run | Or | Sève |
|---|---|---|---|---|
| foret_2 | 11 % | 1,53 | 453 | 4,50 |
| foret_2b | 13 % | 1,03 | 430 | 4,34 |

- Le robot ne fait pas de détour exprès pour le camp. Les +2 points de KO sont le prix du repos sauté.
- Aucun ajustement.

## Contrôles
- `round-harness` 7099 OK, 0 échec, sur 2 passes ([513h] image et places, accès au camp, fins atteignables, reprises).
- boot 4 OK ; création du héros 46 OK ; parcours complet 236 OK ; i18n 100 %.
- Capture iPhone : depuis L2, le seul chemin mène à L4.
- Quoi de neuf : une ligne (FR + EN).
