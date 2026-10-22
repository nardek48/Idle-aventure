# v3.459.10 — Lot 10c : les relances de l'Enchanteresse se paient en or seul (audit I2)

## Le constat
Dans la Crypte, l'or s'entasse : environ 170 000 or en fin de partie. L'Enchanteresse en serait le débouché, mais ni le joueur ni le robot ne la bâtissent : chaque relance coûtait aussi de la Sève, la ressource qui bloque déjà toute la fin de jeu.

## Ce qui change (décision de Seb)
- **Relance d'affixe : or seul.** Le prix en or ne change pas (700 × 1,55ⁿ pour une pièce Épique, indexé sur le monde). La Sève n'est plus demandée.
- Le chantier de l'Enchanteresse garde son coût (Sève et Résine), payé une fois.
- **Doigté de l'Enchanteresse** (boutique d'Éclats) : −10 % d'or par relance et par niveau, soit −30 % au niveau 3 (il retirait 1 Sève par niveau). Les niveaux déjà achetés gardent leur effet, rien à rembourser.
- Une nouvelle conception de l'Enchanteresse est prévue à part (atelier d'abord) ; elle gardera ce paiement en or.

## Code
- `enchant-system.js` : coût en or seul, Doigté sur l'or (`ENCHANT_DOIGTE_PCT`) ; `ENCHANT_BASE_SEVE` et `ENCHANT_SEVE_STEP` retirés.
- `dungeon.js` : texte et effet du Doigté (`enchantDiscount`) ; `village-building-view.js` : l'Établi n'affiche plus que l'or ; `en.js`.
- Aucun fichier protégé.

## Mesure (robot, 9 parties, `--apres 24`)
| | Avec Sève (v3.459.9) | Or seul |
|---|---|---|
| Victoires d'Arbre-mère après l'Histoire | 17 à 27 | 11 à 16 (le chantier seul) |
| Relances | 6 à 9 | 8 à 11 |
| Or dépensé | 105 000 à 204 000 | 147 700 à 174 800 |
| Or restant | ~8 000 | ~10 000 |

La campagne elle-même ne change pas : l'Enchanteresse n'est pas bâtie pendant l'Histoire (9 parties sur 9 au bout, médiane 26 h, dans le bruit).

## Contrôles
- Harnais [38b] et [117] mis à jour ; round-harness 4533 OK, 0 échec (deux passes) ; boot, création du héros, parcours OK ; i18n 100 %, 0 orphelin.
