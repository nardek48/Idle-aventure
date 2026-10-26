# v3.492.9 — Les 7 dernières images : haltes de donjon et état « Sonné »

Seb a fourni les 7 dernières images absentes du jeu. Leurs prompts ont été ajoutés le 26/10 dans « Images à faire », famille « Donjons et combat ». Toutes correspondent à leur prompt. Aucun fichier JS ou CSS n'est ajouté, et aucun code n'est touché.

**Le jeu n'a plus aucune image absente** (`missing-icons` : « Aucune image absente »).

| Image | Chemin |
| --- | --- |
| État « Sonné » (Charge du Chevalier) | `Icons/combat_status/enemy_stunned.webp` |
| Une halte (en-tête de la feuille) | `Icons/dungeon/halte.webp` |
| Lame bénie | `Icons/dungeon/halte_lame.webp` |
| Rempart | `Icons/dungeon/halte_rempart.webp` |
| Pacte de sang | `Icons/dungeon/halte_pacte_sang.webp` |
| Pacte du dément | `Icons/dungeon/halte_pacte_dement.webp` |
| Autel brisé | `Icons/dungeon/halte_autel.webp` |

Toutes les images sont en 128 × 128, sur fond transparent.

## Détourage
Les deux planches avaient un fond en damier incrusté dans l'image, et non une vraie transparence.
- **Haltes** : le damier (cases de 21,2 px, gris 87 et 146) est reconstruit, puis retiré.
  - Les objets sont délimités par leur contour sombre.
  - Les halos lumineux (épée, fiole, bougie, étincelles de l'autel) sont séparés du fond par calcul de leur transparence. Ils restent translucides.
  - Pour l'autel, le contour est ouvert par la fissure lumineuse : il est refermé avant le découpage.
- **Sonné** : le fond blanc est retiré par remplissage depuis les bords.

## Remarques pour Seb
- **Pacte de sang** : le parchemin porte le mot anglais « Contract », alors que le prompt interdisait le texte. Il se lit à peine à 40 px, mais c'est un mot anglais dans un jeu en français. Il serait à régénérer.
- **Coffre** : la carte de halte « Coffre » affiche toujours l'icône de l'onglet de la boutique d'Éclats (`subtabs/shard_shop.webp`). C'est une image qui sert à deux choses ; c'est signalé, pas corrigé.

## Suivi
- **Images à faire** : les 7 images y sont cochées « faites ».

## Contrôles
- **Harnais** :
  - round-harness : 5035 OK, 0 échec, sur 2 passes ;
  - boot : 4 OK ;
  - création du héros : 44 OK ;
  - parcours : 139 OK.
