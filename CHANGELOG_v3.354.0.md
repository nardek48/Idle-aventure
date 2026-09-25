# Aethervale v3.354.0 — Campagne B : vrais combats, équilibrage, temps

Base : v3.353.0. **Aucun fichier du jeu modifié** en dehors du numéro de version. Deux outils hors jeu, hors `index.html` et hors précache.

## `sim/campagne-harness.js` : option B

Le harnais de campagne gagne l'option `--combats`. Chaque combat se joue alors round par round, par le moteur, à 1,5 s le round (vitesse ×1), et **le héros peut mourir**. Le robot joue comme un joueur appliqué :

- **combat** : Grimoire dès `forest_12`, et le bouton mis en avant avant ça ; `--tactique` garde le bouton mis en avant pour toute la partie. Potion sous 30 % de PV ;
- **avant chaque sortie** : PV pleins au feu de camp (le temps passe), 3 potions mineures en poche, et 2 majeures quand la bourse le permet ;
- **entre deux étapes** : meilleur objet équipé, talents, échoppe, Terrain quand la caractéristique de classe bute, reforge de l'arme et de l'armure, puis entraînement avec 60 % de l'or. Pendant qu'il économise pour un objectif, il ne dépense rien ;
- **bloqué** : il réessaie, avec des lots de Battue entre deux essais (vivres de sortie compris) ;
- **toujours bloqué** : l'étape est notée **MUR**, puis rejouée avec les combats gagnés d'office, pour pouvoir mesurer la suite.

Il mesure : le temps par étape (total, combat, soin), les morts et qui tue, chaque combat de boss et d'élite (PV perdus, rounds, potions), le rendement du farm, le village construit pour la puissance, les obstacles et les secteurs. `--json fichier` écrit le tout.

Sans `--combats`, l'option A ne change pas : 35/35 sur les trois classes.

## `sim/campagne-lot.js` : NOUVEAU

Il lance un lot de parties et agrège les résultats : murs, étapes, qui tue, boss et élites, farm, obstacles, secteurs.

```
node sim/campagne-lot.js . --combats --n 4
```

## Résultats

Le détail est dans `Aethervale_Campagne_B_v3_354_0.md`. Deux lots de 12 parties (Grimoire et Tactique), dont voici l'essentiel :

- **`desert_13` est un mur économique** : 448 h de médiane, sur 603 h de campagne. Les pièces Inhabituelles coûtent 4 000 or à l'échoppe du Désert, qui n'en montre qu'une par vitrine. Le seul or illimité est la Battue de la Forêt, à environ 166 or par heure.
- **Le Chevalier est la classe la plus faible** : 21 à 32 morts sur la partie (contre 5 à 17 pour les autres), et 44 à 65 h pour la Forêt (contre 3 à 20 h).
- **Les boss de fin de chaîne tuent** : le Basilic dans 89 % des combats, le Seigneur de guerre orc dans 68 %.
- **« La nuée » est un mur à 12/12 en Tactique, à 0/12 en Grimoire.**
- **L'estimation des obstacles est juste** avec un héros entraîné : 72 % de réussite pour « élevée », 51 % pour « moyenne », 11 % pour « faible ». Cela corrige le constat de la v3.353.0, qui venait d'un robot sans entraînement.

## Contrôles

| Contrôle | Résultat |
| --- | --- |
| round-harness.js ([85] neutralisée) | 3 320 OK, 0 échec |
| boot-harness.js · hero-creation-harness.js | 4 OK · 44 OK |
| campagne-harness.js, option A | 35 / 35 sur les 3 classes |
| campagne-harness.js, option B | 24 parties au bout (murs rejoués, voir le rapport) |

## Fichiers

- `sim/campagne-harness.js` (outil hors jeu)
- `sim/campagne-lot.js` : **NOUVEAU**, outil hors jeu
- `Aethervale_Campagne_B_v3_354_0.md` : **NOUVEAU**, le rapport
- `js/core/constants.js` (`GAME_VERSION`)
- `sw.js` (`CACHE_VERSION`)
