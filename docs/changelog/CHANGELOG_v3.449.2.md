# Aethervale v3.449.2 — Acide mordant renforcé, Fiole noire en donjon

Décisions de Seb du 12/10 : Acide option A1, Pastille laissée telle quelle (P2), or de fin de donjon divisé par deux quand la Fiole a servi. Accord de Seb pour `combat-engine.js` et `dungeon-system.js`. S'applique sur la v3.449.1.

## Ce qui change
- **Acide mordant** : le Bouclier tient toujours 1 round au lieu de 2, et ne retient plus que **25 %** des dégâts au lieu de 50 %. Ça reste une atténuation : seule la règle du Grimoire annule le coup.
- **Fiole noire** : si elle a servi, l'**or de fin d'un donjon** (terminé, campement ou abandon) est lui aussi divisé par deux, comme le butin de la sortie. Les quêtes ne changent pas (récompense entière : une quête ne se fait qu'une fois).
- **Pastille de miel** : inchangée. Au banc, même un Silence entièrement annulé ne change pas l'issue (Nezzam, Ronce ardente) : aucun réglage de durée ne la rendrait plus utile.

## Mesure (plafond-bench, 80 essais, Cité engloutie, réussite Ch. / Rô. / Ma.)
| Profil | Sans objet | Acide v3.443 | Acide A1 | Bouclier annulé (plafond) |
|---|---|---|---|---|
| Début d'acte III | 21 / 10 / 9 % | 41 / 16 / 23 % | **56 / 25 / 31 %** | 61 / 30 / 44 % |
| Fin d'acte III | 93 / 79 / 80 % | 96 / 91 / 94 % | **100 / 98 / 94 %** | 99 / 93 / 96 % |
Essai écarté : retarder de 2 rounds le prochain Bouclier ou Silence (aucun effet mesurable).

## Code
- `js/data/combat-items.js` : `COMBAT_ITEM_ACID_SHIELD_REDUCTION = 0.25` ; textes de l'Acide et de la Fiole.
- `js/systems/combat-engine.js` (protégé, accord) : une ligne, la réduction du bouclier lit l'Acide emporté.
- `js/systems/dungeon-system.js` (protégé, accord) : or de fin × `CombatItems.lootMultOf`, lu avant la clôture de la sortie (ou dans son résumé après un abandon).
- `js/systems/sortie-system.js` : `fioleUsed` dans le résumé de fin de sortie.
- `js/systems/combat-item-system.js`, `js/lang/en.js` : journal et traductions.
Aucun fichier ajouté. Aucun nouvel état sauvegardé.

## Contrôles
- `node --check` ; `round-harness` 4270 OK, 0 échec (3 passes), nouvelle section [237] ; boot 4/4, création 44/44, parcours P11 15/15 ; i18n 0 manquant, 0 orphelin.
