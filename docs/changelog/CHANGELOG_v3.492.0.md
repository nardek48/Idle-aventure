# v3.492.0 — Montagne, lot M-6 : hauts faits, campagne complète, réglages

Ce lot ferme le chantier de la Montagne : il ajoute les hauts faits, joue la campagne complète du chapitre V au robot et fait deux réglages. Il est livré avec l'accord de Seb pour tout le monde Montagne. Aucun fichier du jeu n'est ajouté.

## Hauts faits de la Montagne (10, dont 2 cachés)
| Haut fait | Condition | Or |
| --- | --- | --- |
| Le droit de prendre | Vaincre le Dragon ancien | 4 500 |
| Ce qui tombe dans le lac | Vaincre le Wyrm de cendres | 4 500 |
| Toutes les pentes | Les 11 secteurs de la carte libérés en même temps | 4 500 |
| Les façonnés de la Gueule | Vaincre le Golem-forge et l'Ifrit qui trie | 4 500 |
| Ce qu'on prend | Tailler 100 veines | 4 500 |
| Ce qu'on laisse | Gagner 100 combats de la Montagne sans tailler la veine | 4 500 |
| Le sol qui brûle | Mener une Petite Aventure de la Montagne jusqu'au bout | 4 500 |
| Naturaliste de la Montagne | Rencontrer toutes les créatures de la Montagne | 4 500 |
| *Les mains vides* (caché) | Vaincre le Dragon ancien sans tailler une seule veine pendant le combat | 9 000 |
| *La coulée, reprise* (caché) | Libérer un secteur resté sous la lave | 9 000 |

- **Paliers de la catégorie** : 3, 6 et 8 hauts faits.
- **Récompenses des paliers** : 13 500, 33 750 et 6 750 or. Le dernier palier donne aussi le titre neutre « Qui sait ce qui tient au feu ».
- **Nouveaux compteurs** : `veinsLeft`, `runMountain` et `dragonNoCut`.
- **Compteurs déjà en place** : `veinsCut` et `retakenMountain`.

## Réglages après la campagne complète
1. **Le palier Épique de l'acte II** (étape 9) passe de 5 à **4 emplacements sur 7**. C'est le repli prévu par le document de l'acte II.
   - Avec 5 pièces, la campagne y passait 10 h (Chevalier), 34 h (Rôdeur) et 36 h (Mage), presque tout en attente d'échoppe.
   - Le tutoriel et l'objectif sont mis à jour en français et en anglais.
2. **Les élites de la carte** lâchent leur pièce Épique sur un emplacement qui n'en a pas encore. Avant, l'emplacement était tiré au hasard, et la pièce tombait souvent en double.

## Campagne complète du chapitre V
Le robot joue les 27 étapes depuis les vraies sauvegardes de fin de Crypte, combats compris : **27 OK, 0 échec** pour les trois classes.

| | Chevalier | Rôdeur | Mage |
| --- | --- | --- | --- |
| Temps total | 20 h | 21 h | 39 h |
| Palier de l'étape 9 | 4 h | 4 h | 28 h |
| Morts | 0 | 0 | 11 |

**À juger en jeu** : le Mage met encore 28 h au palier de l'étape 9, parce qu'il meurt contre les deux élites de la carte (10 morts). Si Seb le confirme en jeu, la piste est de baisser la puissance des élites pour lui. Le banc n'est pas relancé en boucle.

Les autres temps longs sont des attentes, pas des combats :
- la recharge des sorties de la carte (étapes 11 et 16) ;
- les soins au camp (étapes 13 et 14).

## Images (à fournir par Seb)
Les 10 icônes de hauts faits sont dans « Images à faire », groupe « M-6 · hauts faits ». En attendant, chaque haut fait affiche l'icône générique.

## Contrôles
- `node --check` sur les JS modifiés.
- Round-harness : 5033 OK, 0 échec, sur 2 passes.
  - Nouvelle section [314] : 5 contrôles.
  - [133] : le catalogue passe à 74 hauts faits.
  - [311] : le palier passe à 4.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 6400 textes, 100 %, 0 orphelin.
