# v3.492.15 — Deux objets de combat pour la Montagne : Leurre de cendre et Coin d'obsidienne

Seb a validé les deux objets de la fiche « Objets de combat de la Montagne » v0.1 (décision 2 de l'audit des télégraphes) : donner un rôle à la préparation pour qui taille les veines. Les chiffres et les recettes sont ceux de la fiche, mesurés au banc. Aucun fichier JS ou CSS n'est ajouté. Deux images sont à fournir.

## Pourquoi ces deux-là (mesure de la fiche)
On mesure le plafond d'un objet en annulant entièrement la mécanique : c'est le plus qu'il puisse rapporter. Wyrm de la Gueule vaincu, héros qui taille, 30 runs, Chevalier / Rôdeur / Mage :
- sans rien annuler : 43 / 97 / 77 % ;
- Tri annulé : 77 / 97 / 87 % ;
- Carapace annulée : 63 / 97 / 83 %.

La Brûlure, le Soin des boss et l'Exaltation ne pèsent presque rien. Ils n'ont pas d'objet.

## Les objets
| Objet | Contre | Effet | Dès | Préparation | Commande |
| --- | --- | --- | --- | --- | --- |
| Leurre de cendre | Tri (Démon mineur, Ifrit qui trie, Dragon ancien) | Celui qui a taillé est frappé à ×1,2 au lieu de ×1,5 | Montagne | 48 Eau + 2 Cendres vives | 8 Cendres vives + 240 Eau |
| Coin d'obsidienne | Carapace (Golem-forge) | +4 % des PV max par taille au lieu de +8 % | Montagne | 48 Eau + 1 Obsidienne taillée | 4 Obsidiennes taillées + 240 Eau |

Les deux objets **atténuent** (`soften`), comme l'Acide mordant et la Pastille de miel. Aucune règle du Grimoire ne vise le Tri ni la Carapace : ils sont donc la seule réponse. La préparation les montre déjà : « Utile ici : Tri », « Leurre de cendre l'atténue ».

## Mesure au banc (avec les objets)
Wyrm de la Gueule vaincu, héros qui taille (`--tailler`), 30 runs, Chevalier / Rôdeur / Mage :

| Objets emportés | Wyrm vaincu |
| --- | --- |
| aucun | 43 / 97 / 77 % |
| Leurre de cendre | 57 / 97 / 80 % |
| Coin d'obsidienne | 60 / 97 / 83 % |
| les deux (Apothicaire niveau 4) | 60 / 97 / 97 % |

Le Leurre rapporte environ 40 % de son plafond, et le Coin presque tout le sien, qui est plus petit. C'est dans la cible de la fiche, à juger en jeu.

## Fichiers touchés
- `data/combat-items.js` : les 2 objets, `COMBAT_ITEM_LURE_SORT_MULT` (1,2) et `COMBAT_ITEM_WEDGE_SHELL_PCT` (0,04).
- `data/apothecary-recipes.js` : 2 recettes, commande à la Montagne (`worldIndex: 4`).
- `systems/vein-system.js` (accord Montagne) : le tri et la carapace lisent l'objet emporté (`CombatItems.holds`).
- `ui/potion-view.js` : « Contre : … » lit le nom par `enemyTraitLook`, car le Tri et la Carapace sont dans le second registre d'états.
- `lang/en.js` : 4 textes.

## À fournir par Seb
2 icônes, dont les prompts sont dans « Images à faire », groupe « Objets de combat » :
- `Icons/combat_items/leurre_de_cendre.webp` ;
- `Icons/combat_items/coin_obsidienne.webp`.

En attendant, chaque objet affiche l'icône générique.

## Remarque pour Seb
Dans la préparation de sortie, la section « Objets » est repliée sous « Réglages » (audit C14, v3.458.4). On ne la voit qu'en ouvrant ce pli : c'est peut-être une raison de plus pour laquelle la préparation sert peu. C'est signalé, pas changé (UI : atelier d'abord).

## Outil
`tools/sim/montagne-acte3-bench.js` : option `--objet id[,id]`, les objets emportés.

## Harnais
- [215] : 9 objets.
- Nouvelle section [319] : 5 contrôles (recettes, ×1,5 → ×1,2, 8 % → 4 %, lignes de la préparation).

## Contrôles
- `node --check` sur les JS modifiés.
- **Harnais** :
  - round-harness : 5069 OK, 0 échec, sur 2 passes ;
  - boot : 4 OK ;
  - création du héros : 44 OK ;
  - parcours : 139 OK.
- **i18n** : 6418 textes, 100 %, 0 orphelin.
- **Chromium** à 390 et 320 px, sans erreur de console : la préparation de la Gueule, avec les deux objets en stock.
