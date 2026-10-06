# Aethervale v3.423.0 — Difficulté : les ennemis suivent la force réelle du héros

Décisions de Seb du 01/10/2026 (nuit), points A, B, C et D. S'applique sur la v3.422.0.

## Le constat (sauvegarde « Luca », mage niveau 16)
- **Le niveau ne fait pas la force** : Luca ramené au niveau 12 a exactement les mêmes caractéristiques. La force vient de l'entraînement (cinq caractéristiques à 110, le plafond de fin de Désert), de l'équipement et des talents.
- Petites Aventures : réglées sur un héros de banc qui n'entraîne que deux caractéristiques jusqu'à 70. Les tranches s'arrêtaient au niveau 11.
- Résultat pour Luca, besace vide, avant cette version :
  - **0 à 3 % de KO** sur les trois anneaux ;
  - **7 à 19 % des PV perdus par combat** ;
  - **74 à 90 de Souffle** à la fin.
- Robot de campagne (joueur appliqué) : lui aussi entraîne les cinq caractéristiques au plafond. Il finit le chapitre II avec 0 à 2 morts.

## A — Petites Aventures : ajustement à la force réelle
- La tranche de niveau donne toujours les ennemis et les obstacles d'un héros normal. Au-delà, l'aventure compare le héros au **héros de référence de sa tranche** (`heroRef`, `HERO_SCALING_REFS` dans `data/worlds.js`) :
  - ennemis : PV × (dégâts par round du héros / référence / 1,1)^0,75 ;
  - ennemis : Puissance × (PV effectifs / référence / 1,1)^0,75 ;
  - obstacles : difficulté × (moyenne des deux multiplicateurs)^0,6 ;
  - jamais sous ×1, plafond ×3 (`PA2_HERO_SCALING`).
- L'ajustement est **figé au départ** du run (`run.heroScale`) : changer d'arme en route ne le refait pas. Un run d'une ancienne sauvegarde le calcule au premier besoin.
- L'ajustement du monde (D) est coupé au tirage des ennemis de l'aventure : pas de double ajustement.

## B — Le Souffle compte
- Approches : **15 / 8 / 25** de Souffle (Force / Précision / Endurance). C'était 10 / 5 / 20.
- Chaque pas coûte **4** de Souffle, **en Forêt aussi**. Avant : 0 en Forêt, 3 au Désert.

## C — Moins de soin en route
- Repos au camp **10 %** (avant 15 %), au seuil **6 %** (avant 10 %). Le Souffle rendu au repos suit.
- Les combats plus piquants viennent de A : la force réelle du héros relève les ennemis.

## D — Les ennemis du monde suivent « un peu » le héros
- `WorldManager.getHeroScale()` : PV de l'ennemi × (dégâts du héros / référence / 1,15)^0,5, et Puissance × (PV effectifs / référence / 1,15)^0,5. Jamais sous ×1, plafond ×2,5. Le calcul est dans `generateEnemy` : ennemis normaux, boss d'aventure, chasses, battues, quêtes et escortes d'élite.
- **Référence : le joueur appliqué**, c'est-à-dire le robot de campagne en vrais combats, moyenne des trois classes à la fin de chaque segment (`joueurForet`, `joueurDesert1`, `joueurDesert2`). Un joueur dans la norme ne voit rien changer. Un premier essai calé sur les héros du banc donnait au robot 11 morts et un mur au Trône de sable : abandonné.
- L'or et l'XP ne changent pas. Pas d'ajustement dans les Cycles (ils ont le leur), ni aux Ruines (pas encore de référence), ni au Donjon.

## Mesures

### Petites Aventures, Luca (mage 16), besace vide, 100 runs par anneau
| | KO | PV perdus par combat | Souffle à la fin |
|---|---|---|---|
| Forêt avant | 0 % | 7 à 18 % | 88 à 90 |
| **Forêt après** | **0 à 9 %** | **14 à 25 %** | **51 à 56** |
| Désert avant | 0 à 3 % | 8 à 19 % | 74 à 77 |
| **Désert après** | **3 à 20 %** | **16 à 24 %** | **43 à 54** |

Avec une besace pleine : 0 à 25 % de KO selon l'anneau, et 0,6 à 1,8 objet utilisé par run (avant : presque aucun).

### Héros du banc (`sim/pa2-bench.js --resume`, 100 runs)
| KO | Sentier | Chemin | Périple |
|---|---|---|---|
| Forêt | 4 → 6 % | 11 → 13 % | 23 → 30 % |
| Désert | 8 → 11 % | 16 → 21 % | 24 → 34 % |

### Combats du monde, Luca
| | Avant | Après |
|---|---|---|
| Désert, ennemi normal | 1,4 round, 1 % des PV | 2,0 à 2,1 rounds, 2 % |
| Désert, boss d'aventure | 5 rounds, 14 à 15 % | 6 à 7 rounds, 20 à 24 % |

Robot mage (vrais combats) : chapitre II fini, 5 morts, dont 4 au Trône de sable. Il avait reforgé son armure à 30 % de Défense, au-dessus de la référence. Avant : 0 ou 1 mort selon la partie.

## Ce que ça ne règle pas
Le jeu reste facile pour un joueur **dans la norme** : le robot finit le chapitre II avec 0 à 2 morts. Relever la courbe de base des ennemis pour tous est une décision à part : voir l'État des chantiers.

## Outils
- `campagne-harness.js` : `TRACE_FORCE=1` relève les dégâts par round et les PV effectifs du héros à chaque étape. C'est la source des références du joueur appliqué.
- `CombatForecast.getHeroEffectiveHp()` et `CombatForecast.getHeroScale(refKey, cfg)` : nouvelles fonctions.

## Fichiers protégés
Aucun. Aucun nouvel état sauvegardé hors `game.sceneRun` (`heroScale`, avec le run).

## Harnais
- Nouvelle section **[194]** (13 contrôles). Deux contrôles de Souffle mis à jour (Pas lourd en Forêt, soif du Désert).
- Résultats : round **3 786 OK**, boot 4, création 44, parcours 139, campagne 38, i18n 100 %.

---

# v3.423.1 — Retours de Seb après ses parties avec Nardek

Difficulté **validée par Seb** : plus dure, faisable en choisissant son chemin. Beaucoup de combats : on use les babioles ; presque sans combat : on n'en a pas besoin.

- **« Objet trouvé : Pendentif (green) »** : la rareté s'affiche maintenant en clair, « Inhabituel » (« Uncommon » en anglais). Corrigé à quatre endroits : gardien des Petites Aventures (écran et journal), butin de combat, récompense d'Histoire.
- **Gardien du Désert** : la fiche du combat montre le Ver (`ENEMY_DB.sandworm.image`), plus le cerf de la Forêt. La pastille de la destination sur la carte garde son icône.
- Harnais : section **[195]** (3 contrôles). Round **3 789 OK**, parcours 139, i18n 100 %.
