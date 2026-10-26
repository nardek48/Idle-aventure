# v3.492.12 — Affinité de monde : +10 % aux objets de la Montagne, dans la Montagne (P1)

Décision de Seb (26/10), prise après la mesure au banc : option P1 à 10 %, sans retoucher les ennemis (option A). Seb a donné son accord pour modifier `stats-system.js`. Aucun fichier JS ou CSS n'est ajouté.

## La règle
Un objet de la Montagne, ou d'un monde suivant, vaut **+10 %** quand le héros se tient dans son monde. Le bonus s'applique à sa stat de base (forge comprise) et à tous ses affixes.
- Les objets des mondes précédents ne changent pas.
- Le bonus suit le monde où se trouve le héros (`WorldManager.worldIndex`). Il ne dépend pas du lieu du combat. Un donjon d'un ancien monde fait depuis la Montagne garde donc le bonus.
- Les réglages sont dans `EQUIP_WORLD_AFFINITY = { fromWorld: 4, bonus: 0.10 }` (`data/equipment.js`).

## Pourquoi
Seules les stats plates suivent l'échelle de monde. Sur 5 emplacements sur 7, un Épique de la Montagne valait donc un Épique de la Crypte, au tirage près. Mesure au banc (40 tirages, Chevalier) :

| | Coup moyen, équipement Montagne | Coup moyen, équipement Crypte | Écart | Défense | PV |
| --- | --- | --- | --- | --- | --- |
| Avant | 6 966 | 6 323 | +10 % | 41,2 % | 1 462 |
| **Avec l'affinité** | 8 585 | 6 943 | **+24 %** | 42,5 % | 1 498 |

## Effet sur les combats de la Montagne
Mesure avec les équipements des sauvegardes de campagne, 20 runs par classe (Chevalier / Rôdeur / Mage) :

| Combat | Vaincu ou réussi | PV restants |
| --- | --- | --- |
| Wyrm de cendres | 80 / 100 / 95 % | 28 / 54 / 36 % |
| Étape 14 · L'ouvrage inachevé | 100 / 100 / 95 % | 54 / 72 / 46 % |
| Ceux qu'il a triés | 100 / 100 / 85 % | 93 / 97 / 93 % |
| Dragon ancien | 100 / 100 / 85 % | 88 / 97 / 90 % |

- Avec des équipements tirés pour la mesure, les combats contre le Wyrm sont environ 10 % plus courts.
- Les ennemis ne sont pas retouchés (option A) : c'est à juger en jeu.

## Fichiers touchés
- `data/equipment.js` : `EQUIP_WORLD_AFFINITY` et `getItemAffinityMult(item)`.
- `systems/stats-system.js` (protégé, accord Seb) : la stat de base et les affixes sont multipliés par l'affinité, dans `recalcStats`.
- `systems/world-travel-system.js` : les stats sont recalculées à l'arrivée dans un monde.
- `systems/equipment-system.js` : la comparaison lit les valeurs avec l'affinité de chaque objet.
- `ui/equipment-view.js` :
  - la valeur affichée (base et affixes) est celle lue par le moteur ;
  - nouvelle ligne « ✦ Affinité : +10 % ici, dans son monde » ou « Affinité : +10 % en {monde} ».
- `ui/heros-screens-view.js` : « Montagne brûlante · +10 % » dans le panneau d'Équipé.
- `lang/en.js` : 2 textes.

**Limite connue :** la Forge et la transmutation affichent toujours la valeur tirée de l'objet, sans l'affinité.

## Outil
- `tools/sim/montagne-acte3-bench.js` : `--affinite x` remplace le bonus du jeu (0 pour le retirer).
- Options de mesure : `--kit crypte|montagne` et `--stats`.

## Contrôles
- `node --check` sur les JS modifiés.
- **Harnais** :
  - round-harness : 5051 OK, 0 échec, sur 2 passes ;
  - nouvelle section [316] : 8 contrôles ;
  - boot : 4 OK ;
  - création du héros : 44 OK ;
  - parcours : 139 OK.
- **i18n** : 6404 textes, 100 %, 0 orphelin.
- **Chromium** à 390 et 320 px, sans erreur de console : la fiche de comparaison, le panneau d'Équipé et l'échoppe.
