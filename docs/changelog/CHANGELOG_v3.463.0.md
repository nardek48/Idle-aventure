# v3.463.0 — Niveaux de donjon, lot 4 : la boutique d'Éclats à paliers

Quatrième lot de la conception « Niveaux de donjon » v0.3 (N-D, N-N, N-O). La boutique d'Éclats gagne quatre articles et un niveau de Sacoche, ouverts par le meilleur niveau atteint à l'**Ossuaire** (le donjon de la Crypte) : 3, 6 et 10. Au robot, on tient l'Ossuaire 4-5 en fin d'Histoire. Les prix sont à juger en jeu.

## Les articles
| Palier | Article | Effet par niveau | Prix |
|---|---|---|---|
| Ossuaire 3 | Sacoche du donjon, niveau 6 (dernier, N-D) | +1 matériau de monde par run réussi | 151 |
| Ossuaire 3 | Butin de faille | +15 % de chance d'un second objet de fin sur un run réussi, à la rareté et au plancher du niveau | 80 / 120 / 180 |
| Ossuaire 6 | Main sûre | +5 % de plancher sur les objets « Touché par l'Aether » (au-delà du plafond seulement, toujours 80 % au plus) | 200 / 300 |
| Ossuaire 6 | Second souffle | +10 % de PV rendus par « Souffler » au campement (Ruines, Crypte) | 150 / 225 |
| Ossuaire 10 | Résonance de la faille | +10 % d'Éclats par run, avant le ÷ 2 du mode libre | 300 / 450 / 675 |

« Résonance de la faille » remplace le nom prévu « Écho de la faille », déjà porté par un bonus de Mémoire.

Le Butin de faille donne un second objet de fin et ne touche pas aux tirages des élites et du boss (décision de Seb). Dans le jeu, seuls les ennemis « boss » (élites, boss, vagues sous Traque) tirent un objet en combat ; le changelog de la v3.459.13 disait à tort que chaque monstre des vagues en tirait un.

## Écran
- Un article fermé affiche « Palier : Ossuaire niveau N » sous sa description, et un cadenas grisé dans le bouton.
- Mesuré à 320 px (Chromium) : les 8 cartes font 304 px, sans débordement.
- Le récapitulatif de fin de donjon montre le second objet.
- Icônes à faire : les 4 chemins sont gardés (`images/Icons/dungeon/dungeon_butin.webp`, `dungeon_main_sure.webp`, `dungeon_second_souffle.webp`, `dungeon_resonance.webp`), et l'icône générique s'affiche en attendant. Ils sont ajoutés à la liste des images à faire.

## Code
- `data/dungeon.js` : les 4 articles, la Sacoche à 6 niveaux (`palierLevels`), `shopPalierDungeonId`.
- `dungeon-system.js` (protégé, accord de Seb) :
  - `getShardShopLock` / `getShardShopLockText`, avec le refus d'achat sous le palier ;
  - `getCampHealPct` ;
  - Main sûre dans `getLevelFloor` ;
  - Résonance et second objet dans `finish`.
- `dungeon-view.js` (campement, récapitulatif) et `village-building-view.js` (fiche de la boutique).
- `en.js` : 9 textes.
- Robot : la boutique respecte les paliers.
- Aucun fichier ajouté.

## Contrôles
- Harnais [276] :
  - prix ;
  - verrous à l'Ossuaire 2 et 6, achat refusé sans dépense, palier affiché dans la fiche ;
  - Main sûre (25 % à l'Ossuaire 5), Second souffle (50 %) ;
  - second objet de fin, Résonance +20 %.
- Harnais [117] : liste des articles mise à jour.
- Robot (3 parties) : toutes au bout, médiane 21 h (inchangé).
- i18n 100 % ; round-harness 4618 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
