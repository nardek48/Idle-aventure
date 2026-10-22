# v3.459.9 — Lot 10b : la Crypte rouvre la Halle 9-10 et l'Entrepôt 8 (audit I3, I2)

## Le constat
Après le Désert, le village ne grandissait presque plus, alors que plusieurs niveaux étaient déjà codés. Dans la Crypte, l'or s'entasse (environ 164 000 gagnés pour 25 000 dépensables en bâtiments).

## Ce qui change
- **Halle marchande 9 et 10** ouvertes dans la Crypte : 11 453 puis 16 263 or, matériaux ordinaires, ni Résine ni Cire. La Halle 9 permet 4 caravanes, une par marché de la Crypte.
- **Entrepôt 8** ouvert dans la Crypte : 5 Cire de sépulcre au lieu de 6 Résine, or et matériaux inchangés (10 082 or). Les Entrepôts 7 et 9 gardent leur coût.
- Les deux restent facultatifs : aucune étape de l'Histoire ne les exige.
- Données seules : `world-caps.js` (Crypte : Halle 10, Entrepôt 8), `village-buildings.js` (palier de l'Entrepôt découpé).

## Mesure
- Robot (18 parties) : toutes au bout, médiane 23 h (22 h en v3.459.8, dans le bruit). Le robot ne monte jamais la Halle ni l'Entrepôt au-delà de ce que l'Histoire exige : il ne mesure donc pas ce débouché.
- Au calcul : Halle 9-10 et Entrepôt 8 = **37 798 or**, face aux ~164 000 or entassés. Le débouché aide, il ne règle pas I2 seul : c'est le lot 10c.

## Contrôles
- Harnais [268] ; round-harness 4532 OK, 0 échec (deux passes) ; boot, création du héros, parcours OK.
