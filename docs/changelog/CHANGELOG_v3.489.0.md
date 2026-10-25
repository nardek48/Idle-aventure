# v3.489.0 — Montagne, lot M-3 : acte II « Ce qui tient au feu »

Les étapes 6 à 10 du chapitre V suivent le document « Montagne — Acte II » v1.0, validé par Seb le 25/10/2026 (six points tranchés en A). Seb a donné son accord pour tout le monde Montagne, fichiers protégés compris : les deux fichiers touchés sont listés plus bas. Aucun fichier du jeu n'est ajouté.

## Les cinq étapes
6. **La Pierre froide** : la Petite Aventure de la Montagne (`petite_aventure_montagne`). Tutoriel « Le sol qui brûle ».
7. **Chaque pente a sa veine** : ouvre la carte vivante de la Montagne et sa caravane. Tutoriel « Les veines de la carte ».
8. **Ce qui trie** : quête `aq_montagne_tri` (5 rencontres). Tutoriel « Le tri ».
9. **Ce qui tient au feu** : le palier Épique (5 pièces Épiques du monde 4, Reforge 10). Tutoriel « Le palier Épique ».
10. **L'ouvrage** : quête `aq_montagne_ouvrage` (4 rencontres).

Récompenses : une pièce Épique aux étapes 6, 7 et 8. Elle comble d'abord un emplacement vide, sous Épique ou **d'un monde antérieur** (nouveau champ `equipmentFillWorld`). Les étapes rapportent aussi de la Cendre vive.

Après l'étape 10 : « La suite de l'histoire arrive bientôt… ».

## Petite Aventure de la Montagne
- **Le sol brûle.** La lave part une rangée sous le départ et monte d'une rangée à chaque pas. Une case sous la lave brûle (niveaux 1 à 3) et coûte du Souffle, sauf si une Pierre froide l'absorbe. 25 % des cases libres brûlent déjà au tirage. Le camp et le seuil repoussent la lave. Le camp, le seuil, le départ et les destinations ne brûlent jamais.
- **Une veine sur le chemin** (actes 1 à 3) : la tailler donne de la Cendre vive, mais la lave monte d'une rangée de plus.
- **Le gardien trie** : le Golem de lave laisse passer qui a les mains vides (aucune veine taillée dans la sortie). Sinon, il faut le combattre.
- **Destinations :** Le trieur (boss), La source chaude (clairière), La paroi fermée (tertre).
- **Objets :**
  - Pierre froide (besace, 2 usages) ;
  - Éclat du trieur (+1 cran sur la voie force) ;
  - Galet de la source (la lave n'avance qu'un pas sur deux).
- **Reliques :** Éclat d'obsidienne, Petit soufflet (+10 Souffle par veine), Cœur de braise (+1 rangée de répit par veine).
- **Le reste du monde :** conditions, pièges, sentiers coupés (coulée fraîche, crevasse fumante), rencontres et répliques.
- **Cartes :** deux cartes, `montagne_1` et `montagne_2`. Leurs places sont reprises de la Crypte en attendant les images.

## Carte vivante de la Montagne
- 11 secteurs autour du Replat. Les positions sont provisoires jusqu'à l'image.
- **Les veines de la carte :** un secteur libéré peut se rouvrir pour tailler sa veine (+2 Cendres vives). La chaleur du secteur monte alors de 10 % par cran, jusqu'à 3 crans, et redescend d'un cran par jour. Si la coulée reprend le secteur, ses ennemis sont plus forts (×1,25).
- La carte ne recule jamais (`noRegress`).
- **Deux élites répétables :**
  - le Vieux golem (forge froide) ;
  - la Mère des dragonnets (le nid).

  Chacune a 35 % de chances de lâcher une pièce Épique du monde 4.
- Caravane de la Montagne et patrouilles : Sarkel, Wenna, Maddoc et Edda ont leurs récits.

## Le tri (combat)
Le Démon mineur trie :
- il annonce le tri (nouvel état « Tri » à l'écran) ;
- au tour suivant, il frappe celui qui a taillé la dernière veine, héros ou compagnon, à ×1,5.

## Mémoire, niveaux 17 à 19
| Niveau | Mémoire | Effet |
| --- | --- | --- |
| 17 | Peau de basalte | Chaleur des veines −7 % |
| 17 | Taille franche | Lame des veines +10 % |
| 18 | Pierre profonde | Pierre froide +2 usages |
| 18 | Cendre au pas | Rare de destination de la PA |
| 19 | Fidélité de Sarkel | Automatique |
| 19 | Pioche sûre | +1 Cendre vive quand une veine est taillée |

Coûts des niveaux : 160, 190 et 225.

## Équilibrage
La campagne de l'acte II a été jouée au robot depuis les vraies sauvegardes de fin de Crypte : 17 étapes OK, 0 échec, pour les trois classes.

| Étape | Chevalier | Rôdeur | Mage |
| --- | --- | --- | --- |
| Montée (PV restants) | 54 % | 49 % | 34 % |
| Petite Aventure (PV restants) | 100 % | 27 % | 7 % |
| Palier Épique (étape 9) | 8 h | 44 h | 52 h |

- Au premier relevé, les élites étaient trop fortes : 234 morts et 265 h pour le palier. Elles ont été recalées (golem endurance 0,9 / puissance 3,6, dragonnets 1,5 / 2,6).
- Le Mage cumule 17 morts sur l'acte.
- Le Terrain d'entraînement reste inchangé : 150 est son plafond.

## Fichiers protégés touchés (accord Montagne de Seb)
- `combat-engine.js`, deux lignes :
  - `enemyTurn` appelle `VeinSystem.onEnemyTurn(e)` ;
  - `enemyStrike` prend la victime et le multiplicateur du tri (`VeinSystem.takeSort`).

  Sans tri en cours, le combat est identique.
- `story-quest-system.js`, une ligne : `equipmentFillWorld`.

## Images (à fournir par Seb)
Les 19 prompts sont dans l'artefact « Images à faire », groupe « M-3 · acte II » :
- les deux cartes de Petite Aventure (`.webp`, 848 × 1264) ;
- la carte vivante `Maps/montagne.webp` ;
- 3 objets, 3 reliques, le nœud veine, 2 sentiers coupés ;
- l'état « Tri » ;
- 6 Mémoires.

En attendant, les icônes gardent leur vrai chemin et affichent l'icône générique, et les cartes affichent le parchemin.

**À signaler :**
- Les deux élites reprennent l'image de leur base (`lavagolem.webp`, `dragonling.webp`). C'est une exception validée par Seb.
- L'icône du gardien de Petite Aventure (`PA2_ICONS.boss`) est un cerf dans tous les mondes. L'image est sans rapport hors de la Forêt.

## Contrôles
- `node --check` sur les JS modifiés.
- Round-harness : 4992 OK, 0 échec, sur 2 passes. Nouvelle section [311] : 29 contrôles.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 6183 textes, 100 %, 0 orphelin.
- Chromium à 390 et 320 px : Petite Aventure (lave, nœud veine) et carte vivante (chaleur, Tailler / Laisser), sans erreur de console.
