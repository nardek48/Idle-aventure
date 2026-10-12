# Aethervale v3.448.7 — Le Chevalier n'est plus frappé plus fort parce qu'il encaisse mieux

Suite de l'audit du 11/10 : le Chevalier, la classe « solide », mourait le plus (21 morts au chapitre III dans la campagne du robot, 53 % à la Nuée). Décision de Seb du 12/10 : option B. S'applique sur la v3.448.6.

## La cause (mesurée)
- L'ajustement au héros (point D, v3.423) relève la puissance des ennemis selon les PV effectifs du héros (PV et défense), comparés à un héros de référence moyen des trois classes.
- Le Chevalier encaisse mieux par nature : il est toujours au-dessus de la référence, et frappé plus fort pour cela. Le Rôdeur et le Mage ne sont presque pas touchés.
- Sans la part « puissance », le Chevalier retrouve 90 % à la Nuée et 100 % au Trône ; Rôdeur et Mage ne bougent pas.

## Ce qui change
- La puissance ennemie suit les PV effectifs **ramenés au gabarit de la classe** : Chevalier ÷1,3 (`WORLD_HERO_SCALING.classEhpGabarit`, calé au banc). Rôdeur et Mage : ×1, rien ne change.
- La part « PV des ennemis » (selon les dégâts du héros) ne change pas. La décision D reste entière : les ennemis suivent toujours la force du héros.
- Ennemis du monde seulement (chasses, quêtes, élites, boss d'aventure). Petites Aventures et Labyrinthe gardent leur propre ajustement, sans gabarit.

## Mesure (40 runs par classe)
| Combat | Chevalier avant → après | Rôdeur | Mage |
|---|---|---|---|
| Les dunes (plafond-bench) | 85 → 95 % | 100 % | 100 % |
| La nuée | 53 → **88 %** | 98 % | 100 % |
| Le trône de sable, campagne (plafond-bench) | 70 → **100 %** | 98 % | 100 % |
| Le trône de sable (nezzam-bench) | 75 → 98 % | 88 % | 98 % |
| Varrek, palier Rare (ruines-acte3-bench) | 80 → 88 % | 57 % | 78 % |

Varrek au Chevalier (88 %) et Nezzam au Chevalier (98 %) passent un peu au-dessus de leur cible : à juger en jeu.

## Code
- `js/systems/combat-forecast-system.js` : `getHeroScale` lit `cfg.classEhpGabarit`.
- `js/data/worlds.js` : `classEhpGabarit: { knight: 1.3 }`.
- `tools/harness/round-harness.js` : section [231] (5 contrôles) ; [194] vérifie la formule d'origine avec un Mage.
- Aucun fichier ajouté, aucun fichier protégé touché.

## Contrôles
- Round : **4 252 OK**, 0 échec, sur trois passes. Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK. Campagne : 59 OK.
