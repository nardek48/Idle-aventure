# v3.492.3 — Petites Aventures : chaque monde a ses icônes

Seb a fourni les 27 icônes propres à chaque monde, décidées le 24/10 (v3.469.0). Conformément à sa décision, chaque monde bascule d'un bloc vers ses propres icônes.

## Les images
Chaque objet a été découpé de sa planche et déposé à son vrai chemin.
- **Points de carte** : 128 × 128, fond transparent. Ils sont rangés dans `Icons/scene/<monde>/node_event`, `node_obstacle`, `node_spring`, `node_altar`, `node_camp` et `node_threshold`.
- **Destinations** : médaillons de 256 × 256, `Icons/scene/dest/dest_<monde>_boss`, `_clairiere` et `_tertre`.
- **Planche de la Crypte** : son fond en damier était incrusté dans l'image. Il a été retiré par détourage depuis les bords.

| Monde | Icônes |
| --- | --- |
| Forêt | la Rencontre (un voyageur contre un chêne) |
| Désert | obstacle, point d'eau, stèle, oasis, seuil, et les trois destinations (le Ver, les tentes, les colonnes). Il garde la Rencontre commune, qui est déjà une scène du Désert |
| Ruines | les six points et les trois destinations |
| Crypte | les six points et les trois destinations |

Les 27 images correspondent à leur prompt. Aucune n'est en double, aucune n'est sans rapport.

## Branchement (`js/ui/pa2-view.js`)
- **`PA2_ICONS_BY_WORLD` et `pa2Ico(clé, run)`** : l'icône est choisie selon le monde du run. Un monde sans entrée prend celles de la Forêt : c'est le cas de la Montagne, en attendant ses images.
- **Endroits branchés** :
  - les points de la carte et l'en-tête des fiches ;
  - la légende ;
  - les trophées ;
  - l'aperçu du gardien et le portrait du gardien de la Forêt ;
  - l'écran de fin.
- **Inchangé** : les icônes qui ne dépendent pas du monde (Combat, Trouvaille, voies, besace).

## Suivi
Les 27 images sont cochées « faites » dans « Images à faire ». Il reste les 55 de la Montagne.

## Contrôles
- **Harnais** : round-harness à 5035 OK, 0 échec, sur 2 passes. Un nouveau contrôle dans [314] vérifie trois points :
  - les 27 fichiers sont présents ;
  - le Désert garde la Rencontre commune ;
  - la Montagne prend les icônes de la Forêt.
- **Autres harnais** : boot à 4 OK, création du héros à 44 OK, parcours à 139 OK, i18n à 100 %.
- **Chromium** à 390 et 320 px, sans erreur de console : Petites Aventures de la Crypte, du Désert et des Ruines, avec la légende ouverte et les bonnes icônes partout.
