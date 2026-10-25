# v3.482.0 — Refonte de l'économie, RE-5 : plus de sources sans limite

Lot F4 de la refonte, recommandation retenue par Seb (corriger 1, 2, 3 et 5, garder la chasse à la Sève). Accord de Seb pour modifier les fichiers protégés de ce lot : `dungeon-system.js`, modification d'une ligne.

## Ce qui change en jeu
1. **Donjon offert par l'Histoire** (Tanière, Cité engloutie, Sanctuaire scellé, Ossuaire, étapes 12 et 15) : l'entrée reste offerte **jusqu'à ce que l'étape soit réussie**. Une fois l'objectif atteint (étape à réclamer), les runs suivants comptent dans les 3 sorties du jour et coûtent leur ration. Avant, on pouvait les rejouer sans limite tant que l'étape n'était pas validée, matériau de monde compris (2 à 20 par run).
2. **Petite Aventure perdue par KO** : la place de la réserve n'est rendue que **si le run n'a rien trouvé**. Avec une trouvaille rapportée, la place reste dépensée (une ligne au journal le dit). La règle D6 (un échec subi rend la place) tient pour les runs sans butin.
3. **Labyrinthe** (KO ou Souffle épuisé) : la descente n'est rendue que **si le sac est vide**. Sinon la moitié du sac gardée se payait d'aucune descente.
4. **Veillée d'Aeswyn** : plus de Cire de sépulcre en **mode libre** du donjon, comme le matériau du donjon lui-même (décision N6, v3.462.0). Ailleurs, +1 Cire par mort laissé endormi, comme avant.
- **Inchangé** : la chasse « Ce que les bêtes ont bu » (Sève), seule source proportionnelle au temps de jeu, pour la seule ressource rare vraiment rare.

## Code
- `systems/dungeon-system.js` (protégé, accord de Seb) : `isStoryTicketFree`, une condition de plus (`isCurrentStepReady`).
- `systems/pa2-run.js` : `finish("ko")`, place rendue sans trouvaille seulement.
- `systems/labyrinth-run.js` : `finish`, descente rendue sac vide seulement.
- `systems/sleep-system.js` : `aeswynVigil`, rien en mode libre.
- `lang/en.js` : 1 texte.
- Aucun fichier ajouté.

## Outils
- `round-harness.js` :
  - section [303] (5 contrôles : donjon d'Histoire avant et après l'étape réussie, KO avec et sans trouvaille, Labyrinthe sac vide, Veillée en mode libre) ;
  - [210] : tomber avec un sac plein ne rend plus la descente.

## Contrôles
- i18n 100 %, aucun orphelin.
- round-harness 4886 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
