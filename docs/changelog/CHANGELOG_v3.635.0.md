# v3.635.0 — Le rythme de la Tour

Décision de Seb (03/11) : les leviers 1 + 2 + 3. Cible : un dernier chapitre de 8 à 10 h simulées, au lieu de 2,7 à 3,7 h.

## Les trois leviers
1. **Terrain d'entraînement 19 à 21** (idée de Seb) :
   - un niveau par acte de la Tour (étapes 6, 11, 16), soit 210 → 220 → 230 d'entraînement, les trois caractéristiques secondaires à 70 % ;
   - les niveaux coûtent 30 000 or ×1,25 par niveau, plus planches, pierre, acier, 6 Givre bleu et 2 Verres de faille ;
   - `TRAINING_HARD_CAP` passe à 230.
2. **Le palier de l'acte III** (étape 13) : 7 Légendaires, **Forge 7 et arme reforgée à 13**, comme la Forge 6 à la Montagne. « Ce qui manque » détaille ce qui reste à faire.
3. **Les étages en entier** :
   - étape 6 : les 5 étages de l'escalier, au lieu de 3 ;
   - étape 7 : 2 Petites aventures réussies, au lieu d'une ;
   - le sixième secteur (« La veine du dedans », l'élite) reste l'objet de l'étape 9.

## Mesure (reprise de la Tour au robot `--joueur`, trois classes : 28 contrôles, 0 échec)

| | Chevalier | Rôdeur | Mage |
| --- | --- | --- | --- |
| Durée de la Tour | **13,6 h** (2,7 à 3,7 avant) | **8,1 h** | **11,2 h** |
| Dont attente de recharge | 7,2 h | 1,6 h | 3,4 h |
| Dont atelier (Fonderie, Forge) | 4,0 h | 3,5 h | 4,9 h |

L'écart vient surtout du hasard des recharges d'expédition.

## La silhouette, avec le Terrain 21
Le héros est plus fort : la silhouette ne laissait plus que 7 à 14 % de PV en moins (86 à 93 % restants).
- Un ajustement : PV ×3,75 → **×4,25**, puissance ×1 → **×1,1**.
- Réussite de 100 % pour les trois classes, avec 85 à 97 % de PV restants.
- À ×5 / ×1,3, le Chevalier tombe à 0 % : le combat bascule net (rage, miroir, bouclier), sans entre-deux. La cible de 25 à 40 % de PV n'est pas atteignable proprement avec ce boss tel quel. Le vrai round intouchable, prévu plus tard, pourrait lui donner une montée plus progressive.

## Code (données seulement, aucun fichier protégé touché)
- `data/village-buildings.js` : Terrain 21, palier de coût 19 à 21.
- `data/upgrades.js` : 230.
- `data/world-caps.js` : Terrain par acte de la Tour, plafond village 21.
- `data/story-quests.js` : `STORY_PALIER_TOUR_COMPLET` (Forge, reforge), ce qui manque, `STORY_TOUR_ETAGES`, `STORY_TOUR_PA`.
- `data/adventure-quests.js` : la silhouette.
- `lang/en.js` : 7 textes.
- Aucun fichier ajouté.

## Outils
- `round-harness.js` : [430] ; tests du plafond d'entraînement (200 → 230).
- `campagne-harness.js` :
  - gestes `tour_06`, `tour_07` et `tour_13` ;
  - le Terrain se construit sans attendre le lendemain d'une carte ;
  - un secteur d'expédition rejoué se joue comme une Petite aventure ;
  - attente de la recharge des expéditions ;
  - `getBoundingClientRect` dans le faux DOM.
