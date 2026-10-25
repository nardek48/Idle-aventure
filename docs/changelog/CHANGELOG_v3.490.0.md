# v3.490.0 — Montagne, lot M-4 : acte III « La Gueule »

Les étapes 11 à 15 du chapitre V suivent le document « Montagne — Acte III » v1.0. Seb a validé ce document par délégation le 25/10 : il a donné son accord pour tout le monde Montagne, fichiers protégés compris. Aucun fichier du jeu n'est ajouté. Un outil est ajouté : `tools/sim/montagne-acte3-bench.js`.

## Les cinq étapes
11. **La bouche** : libérer « L'entrée de l'Antre » sur la carte. La Forge 6 s'ouvre, et Brannoc apprend à tailler la Cendre vive.
12. **La Gueule du volcan** : atteindre le campement du donjon, après le Golem-forge. Récompense : une **arme** Épique de la Montagne, à la classe du héros. Tutoriel « La Gueule du volcan ».
13. **Ce qui ne fond pas** : le palier « Épique complet ». Il faut 7 emplacements sur 7 avec un Épique de la Montagne, la Forge 6 et l'arme reforgée à 11. Tutoriel « L'Épique complet ».
14. **L'ouvrage inachevé** : trois rencontres dans la salle ronde, puis le choix `ouvrage` (axe Garder / Donner).
    - *L'achever* (Donner) : la Gueule devient plus chaude et plus riche. Chaque vague commence avec un cran de chaleur, et chaque taille y rapporte une Cendre vive de plus.
    - *Le défaire* (Garder) : 4 Obsidiennes taillées et 10 Cendres vives, tout de suite.
15. **Le Wyrm de cendres** : vaincre le boss de la Gueule. Tutoriel du même nom.

Après l'étape 15 : « La suite de l'histoire arrive bientôt… ».

## La Gueule du volcan (donjon 5)
- **Ouverture** : le donjon s'ouvre à `montagne_12`. Les entrées sont offertes aux étapes 12 et 15, comme à l'Ossuaire.
- **Ennemis** : golem de lave, dragonnet, démon mineur et ifrit, avec des vagues de groupe et des haltes.
- **Campement** : il se trouve après la vague 8, dans la forge à mi-chemin.
- **Butin** : de la Cendre vive en fin de run (3) et au campement (2), et des pièces Épiques de la Montagne.
- **Une veine à chaque vague.** La chaleur repart de zéro à chaque vague. Le mode libre ne verse pas de Cendre (RE-5).
- **Le Golem-forge** (vague 8, élite) : chaque taille, du héros ou de Sarkel, lui ajoute une carapace de 8 % de ses PV max. La carapace prend les coups avant ses PV.
- **L'Ifrit qui trie** (vague 12, élite) : il trie comme le Démon mineur. Celui qu'il frappe ainsi brûle deux rounds : à chaque tour de l'Ifrit, il perd 3 % de ses PV max. Tuer l'Ifrit éteint le feu.
- **Le Wyrm de cendres** (boss, Enragé) :
  - à 60 % de ses PV, la chaleur monte de deux crans ;
  - à 30 %, il plonge un round sous la lave : on ne peut pas le toucher. À son tour, il ressort et frappe tout le groupe (×0,8 chacun).
- **Unique du boss** : *Heaume du Wyrm*, pouvoir « Pas de braise ». Chaque cran de chaleur porte les ennemis 30 % de moins.
- **Trois états à l'écran** : Carapace, Sous la lave, Tu brûles. Leurs icônes sont à fournir.

## Forge 6 et Obsidienne taillée
- **Forge 6** : plafond du monde à 6, ouvert seulement à `montagne_11` (nouveau champ `forgeActStep` de `WORLD_CAPS`). Le bâtiment passe à 6 niveaux.
- **Coût de la Forge 6** : la Pierre passe de 520 à 480. L'Entrepôt de la Montagne n'en tient que 500 : la campagne au robot butait sur la Forge 6.
- **Obsidienne taillée** : se fait à la Fonderie, avec 3 Cendres vives et 1 Acier.

## Équilibrage
Mesures sur le vrai moteur, avec les vraies sauvegardes de fin de Crypte. La campagne joue les actes II et III : 22 étapes OK, 0 échec pour les trois classes.

**Campagne au robot** (durée de l'étape) :

| Étape | Chevalier | Rôdeur | Mage |
| --- | --- | --- | --- |
| Palier Épique complet (étape 13) | 0,9 h | 0,9 h | 0,9 h |
| Total des actes II et III | 35 h | 14 h | 34 h |

Sans l'arme de l'étape 12, le robot passait 120 à 180 h à l'échoppe pour trouver l'arme du palier 13. L'étape 12 la donne donc, avec un nouveau champ de récompense, `equipmentSlot`. Le reste du palier tombe dans la Gueule.

**Le Wyrm** (`montagne-acte3-bench.js`, 8 à 10 runs par sauvegarde, avec les potions de la sauvegarde) :

| Réglage du Wyrm (puissance / endurance) | Chevalier | Rôdeur | Mage |
| --- | --- | --- | --- |
| 1 / 1 | 0 % | 100 % | 0 % |
| 0,7 / 0,8 | 63 % | 100 % | 63 % |
| 0,62 / 0,75 | 90 % | 100 % | 100 % |
| **Retenu : 0,66 / 0,78** | (entre les deux) | | |

Le campement est atteint dans 100 % des runs, avec 47 à 71 % des PV.

**« L'ouvrage inachevé »** : à une puissance de 6,5, réussite de 90 / 100 / 80 %, avec 46 à 72 % des PV restants.

## Fichiers protégés touchés (accord Montagne de Seb)
- `combat-engine.js`, trois lignes :
  - le tour ennemi lit le retour de `VeinSystem.onEnemyTurn` (brûlure, Wyrm qui ressort) ;
  - `dealDamage` saute un coup sur le Wyrm sous la lave (`VeinSystem.blocksHit`) ;
  - `dealDamage` passe par la carapace (`VeinSystem.absorb`).

  Hors de la Montagne, le combat est identique.
- `story-quest-system.js`, une ligne : `equipmentSlot`.
- `dungeon-system.js` n'est pas touché. La Gueule n'est que de la donnée.

## Images (à fournir par Seb)
Les 8 prompts sont dans l'artefact « Images à faire », groupe « M-4 · acte III » :
- les portraits et icônes de quête du Golem-forge et de l'Ifrit qui trie ;
- le portrait du Wyrm de cendres ;
- les états Carapace, Sous la lave et Tu brûles.

En attendant, chaque image garde son vrai chemin et affiche l'icône générique.

## Contrôles
- `node --check` sur les JS modifiés.
- Round-harness : 5014 OK, 0 échec, sur 2 passes. Nouvelle section [312] : 22 contrôles. Quatre anciens contrôles sont mis à jour : Forge à 6 niveaux, Gueule ouverte par l'Histoire, matériau de la Gueule.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 6280 textes, 100 %, 0 orphelin.
- Chromium à 390 et 320 px, sans erreur de console : liste des donjons, Golem-forge et sa carapace, Wyrm sous la lave avec la brûlure.
