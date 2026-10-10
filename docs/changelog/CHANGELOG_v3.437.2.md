# Aethervale v3.437.2 — 3e rangée de zones : elle s'ouvre à la Crypte

Bug relevé au rejeu des 4 premières heures. Décision de Seb : bug 4 du rapport, la 3e rangée s'ouvre à la Crypte, pas aux Ruines. S'applique sur la v3.437.1.

## Le constat
- RU7 (tranché le 09/10/2026) : pas de 3e rangée de zones aux Ruines (`zoneRows: 2`).
- Le libellé lisait pourtant le monde de même index que la rangée : « S'ouvre aux Ruines anciennes », et « Ruines anciennes » sur les cartes verrouillées de la grille. Un joueur déjà aux Ruines voyait la zone fermée avec ce texte.

## Ce qui change
- Le monde affiché est celui qui ouvre vraiment la rangée : le premier dont la table des plafonds l'ouvre, sinon le monde suivant la table. La 3e rangée affiche « Crypte oubliée » et « S'ouvre à la Crypte oubliée ».
- Rangées 1 et 2 inchangées (Forêt enchantée, Désert oublié). Aucune règle d'ouverture ne change.

## Code
- `js/data/world-caps.js` : `WorldCaps.getRowOpeningIndex(row)`.
- `js/systems/production-plots-system.js` : `getPlotRowOpening` l'utilise.
- `js/ui/production-view.js` : le nom du monde sur les cartes verrouillées de la grille.
- Aucun fichier ajouté.

## Contrôles
- Chromium (390 × 844), sauvegardes en Forêt, au Désert et aux Ruines : rangées 0, 1, 2 → Forêt enchantée, Désert oublié, Crypte oubliée ; refus de déblocage de la zone 7 : « S'ouvre à la Crypte oubliée ».
- Aux Ruines, Mine › Galeries : les trois zones verrouillées portent « Crypte oubliée ».
- Round : 4 114 OK, 0 échec, sur deux passes. Boot : 4 OK. i18n : 100 %.
