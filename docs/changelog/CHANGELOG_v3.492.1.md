# v3.492.1 — Images de Seb : pièges, sentiers coupés, coffre et reliques des mondes

Seb a fourni quatre planches. Chaque objet a été découpé (fond transparent, 128 × 128, 4 px de marge, comme les icônes déjà en place) et déposé à son vrai chemin. Les 29 images correspondent à leur prompt de « Images à faire » : aucune n'est en double, aucune n'est sans rapport.

## Les 29 images
- **Pièges** (`Icons/scene/traps/`) : `fx_venom`, `fx_alarm`, `fx_snare`, `fx_blind`, `fx_torn_bag`, et la Trousse de crocheteur `items/item_lockpicks`.
- **Sentiers coupés** (`Icons/scene/cuts/`) : `cut_fallen_tree`, `cut_flood`, `cut_dune`, `cut_ravine`, `cut_collapsed_street`, `cut_walled_door`, `cut_gate`, `cut_collapse`.
- **Coffre d'expédition** (`Icons/scene/items/`) : `item_worm_scale`, `item_caravan_mat`, `item_guardian_stone`, `item_well_stone`, `item_sleeper_sword`, `item_chapel_candle`.
- **Reliques des mondes** (`Icons/scene/relics/`) : `relic_perle`, `relic_scarabee`, `relic_dune`, `relic_clou`, `relic_fil`, `relic_marteau`, `relic_meche`, `relic_cendre`, `relic_cloche`.

Ces images remplacent l'icône générique. Aucun code ne change, et aucun fichier JS ou CSS n'est ajouté. Les images ne sont pas précachées par `sw.js`.

## Suivi
- Les 29 images sont cochées « faites » dans « Images à faire ».
- Le contrôle [159] du harnais n'attend plus que les icônes de la Montagne.

## Contrôles
- Round-harness : 5033 OK, 0 échec, sur 2 passes.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n à 100 %.
- Images absentes : 62. Ce sont celles de la Montagne et quelques autres à venir.
