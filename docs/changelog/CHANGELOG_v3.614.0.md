# v3.614.0 — Stats du héros, option B : caractéristiques secondaires à 70 % du plafond du Terrain

Idée de Seb (01/11) : simplifier le héros. La caractéristique de la classe et l'Endurance montent jusqu'au plafond du Terrain d'entraînement ; les trois autres s'arrêtent à 70 % de ce plafond. Un niveau déjà acquis au-delà est toujours gardé.

## Code
- `data/upgrades.js` : `TRAINING_SECONDARY_SHARE = 0.7` et `isTrainingSecondaryId(id)`. La caractéristique de classe est lue par `getHeroMainStat` : Puissance pour le Chevalier, Célérité pour le Rôdeur, Volonté pour le Mage.
- `systems/progression-system.js`, **fichier protégé, modifié avec l'accord de Seb** : trois lignes dans `getUpgradeCap`.
- Fiche du héros : le détail d'une caractéristique secondaire indique son plafond. Le bandeau « Plafond de l'entraînement » (renvoi vers le Terrain) ne s'affiche que si la caractéristique de classe ou l'Endurance bute. La tuile Entraînement compte les niveaux restants caractéristique par caractéristique, et le conseil de combat ne pousse plus vers le Terrain pour une secondaire.

## Banc de campagne (robot joueur, vrais combats, entraînement ×4)
| Classe | Sans l'option | Secondaires 60 % | Secondaires 70 % |
|---|---|---|---|
| Chevalier | 95/95 · 25,9 h · 7 morts | 95/95 · 27,4 h · 4 morts | 95/95 · 27,4 h · 5 morts |
| Rôdeur | 95/95 · 26,0 h · 1 mort | 95/95 · 27,1 h · 2 morts | 95/95 · 24,5 h · 2 morts |
| Mage | 95/95 · 29,4 h · 9 morts | 95/95 · 27,2 h · 13 morts | 95/95 · 30,9 h · 11 morts |

Les heures sont comptées hors attente de recharge des Petites Aventures, qui relève du hasard. 60 % pénalisait trop le Mage, d'où le choix de 70 %.

## Contrôles
- round-harness : 5 791 OK, 0 échec. Nouvelle section [409].
- boot : 4 OK. Création du héros : 44 OK. Parcours : 142 OK.
- i18n : 100 %.
- Aucun fichier ajouté. Un fichier protégé modifié, avec accord : `progression-system.js`.
