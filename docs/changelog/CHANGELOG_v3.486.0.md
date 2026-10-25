# v3.486.0 — Montagne, lot M-0 : le socle

Premier lot du chapitre V (Conception Montagne v1.0, plan de lots validé par Seb le 25/10). Rien ne change en jeu tant que le chapitre n'est pas écrit : la Montagne ne s'atteint pas encore.

## Ce qui est posé
- **Plafonds du monde 5** (`WORLD_CAPS[4]`), écrits avant d'ouvrir le monde. Ils sont provisoires et égaux à la Crypte. La Forge reste à 5 : la Forge 6 arrive avec l'acte III (MT7).
- **Terrain et points de talent** : une entrée d'acte I (`montagne_01`), sans changement.
- **Matériaux** :
  - *Cendre vive* (brute, « spéciale » comme la Cire de sépulcre), en anglais *Living Ash* ;
  - *Obsidienne taillée* (raffinée, plafond 999), en anglais *Cut Obsidian*.

  Leurs icônes manquent : le jeu affiche l'icône générique, et les prompts sont dans « Images à faire ». La recette de l'Obsidienne viendra avec l'acte III.
- **Forge** :
  - la bande des reforges 11 et 12 demande l'Obsidienne taillée (1 puis 2), et la Cire consacrée continue d'une unité, sur la règle de la refonte (RE-4) ;
  - la Cire consacrée reste seule aux reforges 9 et 10 ;
  - le palier de coût du bâtiment Forge 6 est posé (15 000 or, 520 pierre, 130 acier, 3 Obsidiennes taillées, provisoire). Le plafond du bâtiment reste à 5 jusqu'à l'acte III.
- **Ajustement au héros** : nouvelle référence `joueurCrypte`, le héros de fin de Crypte (étape `crypte_20`). Elle est mesurée avec la campagne `--combats --avise` sur la v3.485.0 :
  - Chevalier : 2 548 dégâts par round, 2 520 PV effectifs ;
  - Rôdeur : 3 123 et 2 046 ;
  - Mage : 3 947 et 1 930 ;
  - moyenne retenue : **3 206 et 2 165**.

  Les deux zones de la Montagne s'y réfèrent.
- **Codex de la Montagne** : un monde de feu, décision de Seb (MT0). « L'air se raréfie, le froid mord » devient « La roche est chaude sous la main, et la lave éclaire les pentes ».
- **Gueule du volcan** : reste fermée.

## Le passage entre les mondes
- Vérifié dans Chromium, sur le vrai jeu, avec une sauvegarde de fin de Crypte :
  - `WorldTravel.arrive("mountain")` : la Montagne devient le monde de résidence et est notée atteinte ;
  - les huit onglets s'affichent ;
  - la sauvegarde se recharge sur la Montagne ;
  - aucune erreur.
- Le canevas de la montée (`traversee_montagne`) viendra avec l'acte I (lot M-2), une fois son texte validé.

## À décider : l'échelle d'équipement de la Montagne
Elle multiplie les stats plates des objets de la Montagne. Elle vaut aujourd'hui ×10, contre ×4 à la Crypte. Mesure dans le vrai jeu sur le Chevalier de fin de Crypte (3 901 dégâts par round, 2 246 PV effectifs), avec un Épique complet de la Montagne (moyenne de 40 tirages) :

| Échelle | Dégâts par round | PV effectifs |
| --- | --- | --- |
| ×4 | 5 316 | 2 582 |
| ×5 | 6 518 | 2 481 |
| ×6 | 7 597 | 2 444 |
| ×7 | 8 672 | 2 531 |
| ×10 | 12 232 | 2 529 |

La condition de Seb (un Épique de la Montagne meilleur que l'équipement de fin de Crypte) est tenue dès ×4. Le chiffre ne joue qu'une fois la Montagne ouverte : rien ne change dans cette version.

## Code
- `data/world-caps.js` : `WORLD_CAPS[4]`, entrées `montagne_01` du Terrain et des talents.
- `data/hunt-quests.js` : `cendre_vive`, `obsidienne_taillee`.
- `systems/forge-system.js` : bande des reforges 11 et 12.
- `data/village-buildings.js` : palier 6 de la Forge, commentaire du plafond.
- `data/worlds.js` : `HERO_SCALING_REFS.joueurCrypte`, `refByWorld.mountain`.
- `data/codex.js` : texte de la Montagne.
- `ui/warehouse-view.js` : l'Obsidienne figure parmi les matériaux de reforge.
- `lang/en.js` : 6 textes ajoutés, 1 remplacé.
- Aucun fichier protégé touché : la référence d'ajustement est une donnée, comme pour la Crypte. Aucun fichier ajouté. Rien dans la sauvegarde.

## Outils
- `round-harness.js` :
  - nouvelle section [308] (11 contrôles : plafonds, Terrain et talents, matériaux, référence, codex, reforges 9 et 11, Forge 6, arrivée, plafonds lus, donjon fermé, voyage retour) ;
  - sections [21b] et [120] : le « monde au-delà de la table » devient la Tour.

## Contrôles
- `node --check` sur chaque JS modifié.
- round-harness 4922 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
- i18n : 100 %, aucun orphelin.
- `missing-icons` : les deux icônes des nouveaux matériaux manquent, comme prévu (icône générique en attendant).
