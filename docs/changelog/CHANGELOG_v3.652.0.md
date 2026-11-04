# v3.652.0 — Échoppe : les prix à partir de la Crypte

Constat de Seb (03/11) : acheter de l'équipement devient impossible au fil des mondes. Seb a choisi la grille 1, 4, 10, 15, 20, 30 ; Claude a mesuré aussi une variante avec la Tour à ×40.

## Constat (campagne complète du robot v3.634.0, médiane des 3 classes)
Le multiplicateur de prix datait de la v3.114.0. Il était calé sur l'or des combats, avant les grosses dépenses arrivées depuis (rangs de sorts, entraînement, Terrain, reforges).

| Monde | Pièce la plus rare | Prix avant | Or gagné dans le monde | Part avant | Prix après | Part après |
| --- | --- | --- | --- | --- | --- | --- |
| Forêt | Commune | 300 | 30 000 | 1 % | 300 | 1 % |
| Désert | Inhabituelle | 4 000 | 64 000 | 6 % | 4 000 | 6 % |
| Ruines | Rare | 25 000 | 156 000 | 16 % | 25 000 | 16 % |
| Crypte | Épique | 225 000 | 445 000 | 51 % | **135 000** | 30 % |
| Montagne | Épique | 810 000 | 2,27 M | 36 % | **180 000** | 8 % |
| Tour | Légendaire | 7 M | 4,1 M | 171 % | **1,05 M** | 26 % |

## Changement
- `EQUIP_SHOP_WORLD_PRICE_MULT` : 1, 4, 10, **15, 20, 30** (avant 25, 90, 200).
- Suivent la même grille : les objets de l'échoppe, la relique de la vitrine et le renouvellement manuel.
- **L'Enchanteresse garde l'ancienne grille.** Elle lisait le même multiplicateur ; elle a maintenant le sien, `ENCHANT_WORLD_PRICE_MULT`, aux anciennes valeurs, et `getEquipShopWorldPriceMult(table)` prend la grille voulue. Ses prix ne changent pas.
- Les paliers de l'Histoire citaient déjà l'échoppe parmi leurs sources (« le Sommet interdit, le Gardien qui répète et l'échoppe de la Halle marchande »). La baisse rend cette source réelle.

## Mesure (robot `--joueur`, 3 classes × 3 grilles, 122 contrôles et 0 échec pour chacune)
- Règle d'achat du robot : une pièce meilleure que celle portée, si elle coûte moins de 40 % de la bourse.
- Achats au-delà du Désert :
  - grille actuelle : aucun ;
  - ×30 : 1 Épique en Montagne et 1 Légendaire à la Tour (Rôdeur) ;
  - ×40 : 1 Rare aux Ruines (Mage).
- Le robot équipe surtout ses pièces par le butin. L'échoppe complète son équipement sans le remplacer, et aucun palier ne se raccourcit de façon mesurable.
- Les durées par monde varient beaucoup d'une partie à l'autre (Mage : 32 à 63 h au total). Aucun écart net entre les grilles.
- Biais connu : pendant ces 9 parties, l'Enchanteresse suivait encore la grille de l'échoppe (corrigé avant livraison).

## Variante proposée : Tour ×40
- Légendaire à 1,4 M (34 % de l'or de la Tour), Épique à 360 000.
- Au robot, aucune différence mesurable avec ×30. Elle garde la Légendaire comme un vrai achat. Il suffit de changer le dernier chiffre de la grille.

## Contrôles
- `node --check` sur les fichiers modifiés.
- `round-harness.js` : 6 100 OK, 0 échec, sur deux passes. 3 contrôles ajoutés (Épique en Crypte, Enchanteresse ×25, Légendaire à la Tour).
- `boot-harness.js` : 4 OK.
- `parcours-harness.js` : 212 OK, 0 échec.

## Fichiers
- Fichiers modifiés : `systems/equip-shop-system.js`, `systems/enchant-system.js`, `ui/news-view.js`, `lang/en.js`, `core/constants.js`, `sw.js`.
- Outils modifiés :
  - `campagne-harness.js` : variable `SHOP_MULT` pour essayer une autre grille ; achats à l'échoppe comptés dans les dépenses de chaque monde ;
  - `round-harness.js`.
- Aucun fichier protégé touché, aucun fichier ajouté.
