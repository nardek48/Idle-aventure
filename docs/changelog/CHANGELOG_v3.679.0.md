# v3.679.0 — Sac plein : la récompense d'Histoire n'est plus offerte d'office (audit du 04/11, QA-4)

- **Perte corrigée** : `addLootToInventory` offre (Aether) tout objet non unique quand le sac est plein, récompenses d'Histoire comprises. La pièce de palier (crypte_11, arme de montagne_12, Légendaires de la Tour…) se perdait et l'étape se fermait, sans ligne « Objet » dans le récapitulatif. Accord de Seb (« tous les changements mentionnés »).
- `js/systems/equipment-system.js` : `addLootToInventory(item, opts)` ; avec `opts.keep`, l'objet entre en dépassement comme un objet unique. Sans option, rien ne change (règle v3.322.0 des butins).
- `js/systems/story-quest-system.js` : les deux octrois d'objet de `_grantReward` (pièce fixe, pièces de rareté) passent `{ keep: true }`. Modification de 2 appels.
- « Quoi de neuf » : une ligne (FR et en.js).
- `tools/harness/round-harness.js` [444] : sac plein, la pièce Rare de palier entre en dépassement ; un butin ordinaire reste offert.

Contrôles : round 6 162 OK (2 passes), boot 4 OK, création 44 OK, parcours 212 OK, i18n 100 %.
