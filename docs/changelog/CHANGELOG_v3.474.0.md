# v3.474.0 — Donjons : une élite vaincue met le butin en sûreté

Bilan des donjons, point 4 (la mort punitive), option A de Seb.

## Ce qui change en jeu
- Chaque **élite de donjon vaincue** (vagues 5 et 10 à la Tanière et à la Cité, 12 au Sanctuaire et à l'Ossuaire) met en sûreté le butin des vagues gagné jusque-là (or et objets du sac), comme le campement : il est versé tout de suite.
- Une mort ne coûte plus que le butin gagné **depuis la dernière élite** (ou depuis le campement). La fuite garde toujours la moitié de ce qui reste exposé.
- À la vague 8 du Sanctuaire et de l'Ossuaire (élite et campement à la fois), c'est le campement qui met en sûreté, et sa feuille l'affiche comme avant.
- Sous la Marque Traque, seules les élites de données comptent (pas chaque vague).
- Journal : « L'élite tombe : le butin des vagues est en sûreté (+X or, n objets). » Rapport de fin : ligne « En sûreté après les élites », objets compris. Message de mort adapté quand une part est sauvée.

## Code
- **Fichier protégé (accord Seb)** : `systems/dungeon-system.js`, `secureAfterElite` (via `SortieManager.secure`), appelé par `onEnemyKilled` ; `eliteLoot` dans le run et le rapport.
- `ui/dungeon-view.js` : ligne du rapport, totaux d'or.
- `lang/en.js` : 3 textes (dont un pluriel). Aucun état persistant nouveau (`game.dungeonRun`, sauvegardé en entier), aucun fichier ajouté. Difficulté inchangée.

## Outils
- `round-harness.js` : section [295] (vague ordinaire exposée, élite qui met en sûreté, mort ensuite, rapport, campement prioritaire à la vague 8).
