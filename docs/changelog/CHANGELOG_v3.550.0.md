# v3.550.0 — Une élite qui se rejoue aux Ruines et à la Crypte

Retour de Seb, point 7, option A : les cartes des Ruines et de la Crypte n'avaient que des expéditions.

## Nouveautés
| Carte | Secteur | Élite | Gain par victoire |
|---|---|---|---|
| Ruines | La tour de garde (anneau 3) | Le Golem (`golem_tour`) | pièce **Rare** du monde à 35 % |
| Crypte | La nef (anneau 3) | La Pleureuse (`pleureuse_nef`) | pièce **Épique** du monde à 35 % |

- La règle de chance est celle des élites de la Montagne : 35 % par victoire, et la 3e victoire sans pièce en donne une à coup sûr. Le compteur est commun aux élites de la carte.
- La pièce va d'abord à un emplacement qui n'en a pas encore.
- Comme toute élite qui se rejoue, elles donnent aussi la ressource de la carte (Pierre errante, Cire de sépulcre), et chaque victoire du jour rend la suivante plus dure.
- Nom, portrait et escorte sont repris des élites d'Histoire. La sortie de chacune reste celle d'une élite de carte.
- Sur la carte, la pastille montre l'armure Rare ou Épique (même icône d'emprunt que pour la Montagne, déjà signalée).

## Banc
Combats rejoués par le robot, héros pris au milieu du monde (entrée de ruines_12 et de crypte_12), 3 classes, 20 combats à force de base, puis une série dans la journée.

| Élite | Victoires | Rounds | PV perdus | Victoires d'affilée par jour |
|---|---|---|---|---|
| Golem, données d'Histoire (endurance 3,5) | 60 à 90 % | 22 à 48 | 65 à 81 % | 0 à 1 |
| **Golem retenu (endurance 1,4, puissance 4)** | 100 % | 8 à 10 | 28 à 30 % | 3 à 4 |
| **Pleureuse (données d'Histoire)** | 100 % | 7 à 10 | 44 à 50 % | 2 à 3 |

- Le Golem retenu a la même cible que les élites de la Montagne (27 à 34 % des PV perdus).
- La Pleureuse reste un peu plus dure, la Crypte étant jugée trop facile.

Campagne complète (Mage) : 101 étapes réussies, 18,5 h, 2 morts.

## Fichiers
- `js/data/elites.js` : `golem_tour`, `pleureuse_nef`.
- `js/data/living-maps.js` : tour de garde et nef en élites qui se rejouent.
- `js/ui/living-map-view.js` : pastille selon la rareté de la pièce.
- `js/lang/en.js` : 2 textes.
- `tools/sim/campagne-harness.js` : `BANC_ELITE=carte:secteur:N` (après `--jusqua`) et `ESSAI_ELITE=id:endurance,puissance`.
- `tools/harness/round-harness.js` : contrôle [367].

Aucun fichier ajouté.
