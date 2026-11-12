# v3.779.0 — Simplification : les rangs des sorts deviennent automatiques (12/11/2026)

Décision de Seb (12/11, option A « dans un premier temps »), lot 5 de la simplification avant l'Alpha. Les rangs des techniques et de la défense ne s'achètent plus : ils suivent le monde atteint. Piste notée pour plus tard : un nœud de talent à rangs par classe (option B). Aucun fichier protégé modifié, aucun fichier ajouté ni supprimé, sauvegarde inchangée (`game.skillRanks` reste écrit mais n'est plus lu).

## Ce qui change
- **Règle** (`systems/skill-rank-system.js`) : rang = index du plus haut monde atteint, pour les 4 emplacements (Forêt 0, Désert 1 … Tour 5). Même effet par rang qu'avant : +8 % de dégâts, +2 points de défense.
  - Retirés : les prix, l'achat, le compte des rangs achetables.
  - Rangs payés avant cette version : ignorés, sans remboursement (l'Alpha n'est pas en ligne).
- **Héros › Capacités** (`ui/heros-view.js`) : les pastilles montrent le rang ; la carte dépliée dit « Rang N : s'ouvre au monde suivant » et la valeur visée. Plus de bouton « Monter au rang » ni de flèche ↑. La tuile Capacités n'a plus de pastille « à acheter » (`ui/heros-screens-view.js`).
- **Bulle d'or** (`ui/or-a-investir-view.js`) : plus de rangs de sorts (ni « Tout de suite », ni « Plus tard »). Les compétences des compagnons restent.
- **Jalons** (`data/village-quests.js`) : les 5 jalons de rang sont remplacés.

  | Monde | Avant | Après |
  |---|---|---|
  | Forêt | Premier rang d'un sort | Une caractéristique entraînée à 40 |
  | Désert | Un sort au rang 2 | Une caractéristique entraînée à 90 |
  | Ruines | Les quatre sorts au rang 2 | Une caractéristique entraînée à 120 |
  | Crypte | Un sort au rang 4 | Trois reliques équipées |
  | Montagne | Un sort au rang 5 | Une caractéristique entraînée à 180 |

  Seuils pris sous les valeurs du robot en fin de monde (60, 110, 130, 150, 200). La fiche « Les rangs des sorts » est retirée.
- **Entrepôt** : la Résine et les autres matériaux ne citent plus les rangs du héros.
- **Robot** (`tools/sim/campagne-harness.js`) : n'achète plus de rangs, y compris au relevé de fin de partie.
- **Traductions** : 6 textes nouveaux, 15 orphelins retirés.

## Mesure (robot, 3 parties complètes, `--combats --joueur`)
| | Morts | Murs | Temps simulé | Or en fin de Tour |
|---|---|---|---|---|
| v3.777.0 (rangs achetés) | 0 / 0 / 0 | aucun | 39,5 / 25,4 / 28,1 h | 128 / 122 / 154 k |
| v3.779.0 (rangs automatiques) | 0 / 0 / 0 | aucun | 31,4 / 30,9 / 28,4 h | 169 / 236 / 171 k |

(Chevalier / Rôdeur / Mage.) Rangs en fin de monde : 0, 4, 8, 12, 16, 20 contre 0, 4, 6, 8, 12, 16 achetés par le robot avant ; l'avance aux Ruines et à la Crypte ne crée pas de mur. Les nouveaux jalons se valident dans leur monde (Forêt 7-9, Désert 7, Ruines 7-8, Crypte 11-12, Montagne 16-18).

## Contrôles
- `round-harness` 7229 OK, 0 échec, sur 2 passes. [323] vérifie la règle automatique (Forêt 0, Crypte 3, Tour 5, anciens rangs ignorés, carte sans achat) ; [329], [336], [341] et [499] suivent le retrait.
- boot 4 OK ; création du héros 46 OK ; parcours complet 239 OK ; i18n 100 %, 0 orphelin.
- Quoi de neuf : une ligne (FR + EN).
