# v3.470.0 — Donjons : un objet unique par boss, avec pouvoir signature

Butin des donjons (point 9 du bilan des donjons) : décisions de Seb, option A (un unique par boss), format 2 (un unique, qui peut retomber, valeurs tirées), sans garantie au bout de N runs, 5 % en mode normal et en mode libre. Pouvoirs validés (Pas du Garde remplace Serment, qui doublait Le seuil et la Fiole noire).

## Ce qui change en jeu
Chaque boss de donjon peut lâcher son objet unique : **5 % par run réussi**, en mode normal comme en mode libre, sans garantie. Le nom, l'emplacement et le pouvoir sont fixes. La rareté et les valeurs sont celles du butin de fin du niveau joué, plancher « Touché par l'Aether » compris : un run à haut niveau donne un meilleur exemplaire.

| Boss | Objet | Emplacement | Pouvoir |
| --- | --- | --- | --- |
| Basilic | Écailles du Basilic | Armure | **Peau de mue** : les cumuls de Corrupteur réduisent tes dégâts deux fois moins |
| Sphinx | Amulette de l'énigme | Amulette | **Énigme** : dans chaque combat, le premier télégraphe ennemi échoue (Charge, Soin, Silence ou Bouclier) |
| Varrek | Bottes du Garde scellé | Bottes | **Pas du Garde** : la rage des Enragés monte deux fois moins vite |
| Liche | Gants du fossoyeur | Gants | **Sépulcre** : les soins ennemis sont réduits de moitié (soin de boss, Vampirique, demi-sommeil) |

- Les pouvoirs agissent partout, pas seulement en donjon, comme les pouvoirs légendaires.
- L'objet est marqué unique : jamais offert d'office (auto-offrande, sac plein, « Tout offrir »). Un doublon s'offre à la main.
- Le rapport de fin a une ligne « Objet unique » avec le pouvoir.

## Mesures (pouvoir porté d'office, 30 runs par classe, Chevalier / Rôdeur / Mage)
| Donjon (profil) | Sans | Pouvoir | Avec |
| --- | --- | --- | --- |
| Tanière (`plafond-bench`, foret) | 93 / 100 / 100 %, PV fin 36 / 48 / 41 % | Peau de mue | 90 / 100 / 100 %, PV 41 / 49 / 43 % |
| | | Pas du Garde | 100 / 100 / 100 %, PV 40 / 48 / 43 % |
| | | Énigme | 100 / 100 / 100 %, PV 40 / 48 / 44 % |
| Sanctuaire (`ruines-acte3-bench`, Rare) | Varrek 80 / 67 / 77 % | Pas du Garde | 87 / 70 / 87 % |
| | | Énigme | 83 / 77 / 90 % |
| Ossuaire (`crypte-acte3-bench`, Épique) | Liche 80 / 77 / 93 %, potions 1,3 / 1,3 / 0,9 | Peau de mue | 83 / 87 / 97 %, potions 0,9 / 1,0 / 0,9 |
| | | Sépulcre | 83 / 87 / 93 %, potions 1,1 / 1,2 / 0,7 |

Chaque pouvoir vaut quelques points (+3 à +13 sur le boss qu'il contre), sans écraser le calibrage. À la Tanière, déjà calée à ~100 %, l'effet se lit surtout en PV restants.

## Code
- `data/dungeon.js` : `boss.unique` sur les 4 donjons ouverts ; `DUNGEON_CONFIG.uniqueDropPct` (5).
- `data/equipment.js` : `DUNGEON_UNIQUE_POWERS` (4 pouvoirs, facteur `mult`), inscrits dans `LEGENDARY_POWER_BY_ID` (fiche d'objet et `hasLegendaryPower` les lisent sans changement).
- `systems/equipment-system.js` : `powerMultOf(id)`.
- `data/enemy-archetypes.js` : Peau de mue (Corrupteur), Pas du Garde (Enragé), Sépulcre (Vampirique).
- `systems/sleep-system.js` : Sépulcre sur le soin du demi-sommeil.
- `core/combat-actors.js` : `enigmaUsed`, remis à zéro à chaque nouveau groupe.
- **Fichiers protégés (accord de Seb)** :
  - `systems/combat-engine.js` : Énigme dans `telegraphPattern` (+ `tryEnigma`), Sépulcre sur le soin de boss ;
  - `systems/dungeon-system.js` : `rollBossUnique`, appelé par `finish` sur tout run réussi.
- `ui/dungeon-view.js` : ligne « Objet unique » du rapport de fin.
- `lang/en.js` (15 textes), `lang/data-fields.js` (`DUNGEON_UNIQUE_POWERS`, `*.boss.unique.name`).
- Aucun état persistant nouveau, aucun fichier ajouté. Icônes : celles des emplacements (armure, amulette, bottes, gants).

## Outils
- `round-harness.js` : section [289] (pouvoirs, Énigme une fois par combat, exaltation jamais annulée, tirage réussite / fuite / mode libre, taux 5 %, rapport).
- `plafond-bench.js` (et les bancs qui s'en servent) : `--pouvoir id[,id]`, pouvoir porté d'office.
- `round-harness.js` [19b] (accord Seb) : le rapport de combat est vidé avant le contrôle « sans activité ». Il héritait des dégâts des sections précédentes (178 dans cet environnement) et échouait déjà sur v3.469.4.
