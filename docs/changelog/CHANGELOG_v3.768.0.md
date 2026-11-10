# v3.768.0 — Badges de quêtes tirés du robot, rendement du kit au pronostic (10/11/2026)

Demande de Seb (10/11 : « tu peux les faire à la suite »). Aucun fichier ajouté au jeu.

## Badges Facile / Moyen / Difficile
- `difficulty` des 41 quêtes (`data/adventure-quests.js`) **tiré du robot**, plus posé à la main : `tools/sim/badge-quetes.js` (nouveau, outillage) lit les lots de campagne et calcule, par quête et par partie, PV perdus + 0,35 × potions bues ; médiane < 35 % : Facile ; < 65 % : Moyen ; sinon, ou une mort dans plus de 5 % des parties : Difficile. `--ecrire` met les badges à jour.
- Sur 54 parties (lots v3.764 à v3.767) : 27 badges changent, stables avec un quatrième lot. Exemples : Cœur de la Forêt (l'Orc) Moyen → Difficile (101 % des PV, 7 % de morts) ; quêtes « dures » des Ruines → Faciles (16 à 30 %) ; Dragon, Couronne, Silhouette restent Difficiles.

## Pronostic de combat
- `FORECAST_CLASS_DMG_MULT` (`combat-forecast-system.js`) devient le **rendement du kit** mesuré pour les **trois** classes (dégâts réels ÷ estimés, au banc, après le rééquilibrage du 03/11) : Chevalier 0,75 → 0,72, **Rôdeur 1 → 0,67**, Mage 0,9 → 0,81.
- `forecast-calibration-bench` (30 runs) : la correspondance ratio → échec réel devient strictement ordonnée (0, 0, 0, 0, 33, 83, 100, 100, 100 %) ; avant, le Rôdeur sans arme à 3 potions était annoncé « Risqué » pour 100 % d'échec réel, sous le Chevalier à 83 %.

## Rôdeur et Wyrm de cendres en entretien
- Analyse : le robot refarme la Gueule au niveau dont le butin correspond au monde où il est (en pleine Tour : niveaux élevés, ×1,15 de PV par niveau), sans pronostic. Difficulté choisie, pas un déséquilibre de l'Histoire (décision A1). Avec le nouveau pronostic : 2 morts du Rôdeur au Wyrm (7 au lot précédent). Pas de changement.

## Mesures
- Robot, campagne entière, 6 parties par classe : 18/18 au bout, 31,0 h médianes, 15 morts (12 au lot précédent, dans le bruit). Lot Forêt seule, Mage et Rôdeur, 12 parties chacun, ancien contre nouveau pronostic : 6 contre 8 morts, sans tendance ; le Seigneur orc (forest_15) reste le point chaud (5 à 7 morts sur 24 parties).

## Contrôles
- `round-harness` 7293 OK sur 3 passes ([463], [465] mis à jour) ; boot 4 OK ; création du héros 44 OK ; parcours P11 15 OK ; i18n 100 %.
- Quoi de neuf : une ligne (FR + EN).
