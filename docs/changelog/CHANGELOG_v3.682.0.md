# v3.682.0 — Élite de carte engagée : pas de seconde sortie (audit du 04/11, QA-9)

- **Incohérence corrigée** : `AdventureQuestManager.start`, `HuntQuestManager.start` et `DungeonManager.start` se refusaient entre eux, mais ne regardaient pas l'élite de carte engagée (`livingMaps.fight`). On pouvait lancer une quête ou un donjon par-dessus : le butin de l'élite était rangé (`SortieManager.end("return")`) et l'élite restait bloquée « Combat en cours ». Accord de Seb (« tous les changements mentionnés »).
- `js/systems/adventure-quest-system.js`, `js/systems/hunt-quest-system.js`, `js/systems/dungeon-system.js` **(protégé, accord de Seb)** : une ligne chacun, refus avec « Termine d'abord le combat engagé sur la carte ». Le sens inverse (carte pendant une sortie) était déjà gardé par `LivingMapManager.canStart`.
- `js/lang/en.js` : 2 textes. « Quoi de neuf » : une ligne.
- `tools/harness/round-harness.js` [447] : quête, chasse et donjon refusés pendant l'élite ; témoin : le même donjon démarre sans elle.

Contrôles : round 6 173 OK (2 passes), boot 4 OK, création 44 OK, parcours 212 OK, i18n 100 %.
