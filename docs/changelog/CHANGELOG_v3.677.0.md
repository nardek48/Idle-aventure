# v3.677.0 — Pas de repas du Camp en pleine sortie de combat (audit du 04/11, QA-8)

- **Abus corrigé** : `CampManager.eatRation` ne refusait que l'expédition en cours (`heroLockReason`). En plein donjon (ou élite, quête d'aventure, chasse), un passage au Camp par « Continuer » permettait de manger entre deux vagues, contre la règle annoncée (« Tu pars avec tes PV actuels »). Décision de Seb : option A.
- `js/systems/camp-system.js` : `CampManager.rationLockReason()` (expédition, ou `hasCombatQuestContext()`) ; `canEatRation` et `eatRation` refusent, avec le toast « En pleine sortie, pas de repas : termine ou abandonne d'abord. »
- `js/ui/camp-view.js` : le feu de camp affiche cette raison et désactive les rations, comme pour l'expédition. `js/ui/return-view.js` : pas de bouton « Manger » sur l'écran de retour pendant une sortie.
- Inchangé : manger dans la préparation de sortie (avant le départ) et entre deux sorties.
- `js/lang/en.js` : 2 textes. « Quoi de neuf » : une ligne.
- `tools/harness/round-harness.js` [443] : ration acceptée hors sortie, refusée en donjon (stock et PV intacts), en élite de carte, en quête d'aventure ; de nouveau acceptée après.
- Vérifié dans Chromium à 390 × 844 : élite de l'Arbre-mère engagée, Camp › Le feu : rations désactivées, raison affichée.

Repéré au passage, non corrigé ici : le feu de camp régénère pendant une élite de carte engagée (`_hasActiveRun` ignore `livingMaps.fight`).

Contrôles : round 6 158 OK (2 passes), boot 4 OK, création 44 OK, parcours 212 OK, i18n 100 %.
