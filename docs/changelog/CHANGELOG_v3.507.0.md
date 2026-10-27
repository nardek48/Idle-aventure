# v3.507.0 — Zones de production à 20 niveaux (relevé 2, migration b)

Décision de Seb du 27/10 : plus de niveaux pour les bâtiments de production, une production plus mesurée au milieu du jeu, et toujours un niveau à monter (le principe d'un idle).

## Ce qui change en jeu
- **20 niveaux par zone** au lieu de 5.
- **Production linéaire** : chaque niveau ajoute +70 % du débit du niveau 1 (avant : ×1,78 par niveau). Le niveau 8 produit 5,9 fois le niveau 1, le 14 environ 10 fois, le 20 environ 14 fois.
- **La réserve d'une zone suit sa production** : le temps avant l'arrêt reste le même à tout niveau (environ 1 h pour une zone rapide, 3 h pour une équilibrée, 8 h 30 pour une lente).
- **Coût d'amélioration** : ×1,15 par niveau au lieu de ×1,40 (multiplicateur de rangée inchangé).
- **Plafond par monde** : Forêt 5, Désert 8, Ruines 11, Crypte 14, Montagne 17, Tour 20 (avant : 3, puis 5 partout).
- **Partie en cours (migration b)** : chaque zone est convertie une fois au niveau qui produit au moins autant qu'avant (1 → 1, 2 → 3, 3 → 5, 4 → 8, 5 → 14), même au-delà du plafond du monde. La production acquise est gardée ; une zone au-dessus du plafond ne monte plus tant que le monde ne la rattrape pas.

## Mesures (campagnes au robot, 3 classes × 2, durée de chaque monde, niveau moyen des zones, production horaire de tous les bâtiments)

| | Total | Désert | Ruines | Crypte | Montagne |
| --- | --- | --- | --- | --- | --- |
| Avant | 40,0 h | 3,1 h · niv. 3,4 · 4 770/h | 5,6 h · niv. 5 · 9 710/h | 7,6 h · niv. 4,6 · 12 050/h | 21,7 h · niv. 5 · 14 420/h |
| v3.507.0 | 41,7 h | 2,7 h · niv. 3,9 · 2 420/h | 6,7 h · niv. 8,3 · 6 060/h | 9,2 h · niv. 8,5 · 7 700/h | 20,7 h · niv. 9,8 · 9 330/h |

- Durée de l'Histoire inchangée à l'écart de mesure près ; 0 mur, 0 échec.
- La production baisse là où l'Entrepôt saturait (Désert −50 %, Ruines −38 %, Montagne −35 %). Au Désert, une ressource brute produit environ 400 à 450 par heure pour un Entrepôt à 2 000.
- En fin d'Histoire, les zones sont au niveau 10 en moyenne pour un plafond de 17 : il reste de quoi monter.
- Premier relevé écarté (+55 % par niveau, coût ×1,22) : campagne de 54 h, Ruines et Montagne nettement plus longues.

## Code
- `data/production-plots.js` : `plotMaxLevel` 20, `linearPerLevel` 0,7, `model` 2, `upgradeCostMultPerLevel` 1,15.
- `systems/production-plots-system.js` : `levelMult`, `migrateLevel`, débit et réserve linéaires, conversion des anciennes zones dans `ensurePlots` (marqueur `model` dans `game.production[bâtiment]`, déjà sauvegardé tel quel).
- `data/world-caps.js` : `zoneLevel` 5 / 8 / 11 / 14 / 17.
- Aucun fichier ajouté, aucun fichier protégé, aucun nouvel état en dehors de `game.production`.

## Outils
- `round-harness.js` : section [328] (modèle, plafonds, temps de remplissage, migration b, conversion unique) ; [86], [131], [299], [300] mises aux nouveaux plafonds.
- `campagne-harness.js` : bilan par monde avec niveau moyen des zones, production horaire et stocks bruts.
