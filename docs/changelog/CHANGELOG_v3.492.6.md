# v3.492.6 — Montagne : 12 images de plus (actes III et IV)

Seb a fourni les images de la Gueule du volcan et de la Mémoire 20. Chaque image est découpée, mise au format et déposée à son vrai chemin. Aucun fichier JS ou CSS n'est ajouté, aucun code n'est touché.

| Image | Chemin | Format |
| --- | --- | --- |
| État « Carapace » | `Icons/combat_status/shell.webp` | 128, transparent |
| État « Sous la lave » | `Icons/combat_status/diving.webp` | 128, transparent |
| État « Tu brûles » | `Icons/combat_status/burning.webp` | 128, transparent |
| Mémoire « Rien ne se perd » | `Icons/memory/rien_ne_se_perd.webp` | 128, transparent |
| Mémoire « Lame vive » | `Icons/memory/lame_vive.webp` | 128, transparent |
| Mémoire « Le froid de la pierre » | `Icons/memory/froid_pierre.webp` | 128, transparent |
| Mémoire « Ce qui a été pris » | `Icons/memory/ce_qui_a_ete_pris.webp` | 128, transparent |
| Quête d'élite : l'Ifrit qui trie | `Icons/quest_icons/elite/elite_ifrit_trieur.webp` | 256, transparent |
| Quête d'élite : le Golem-forge | `Icons/quest_icons/elite/elite_golem_forge.webp` | 256, transparent |
| Portrait : l'Ifrit qui trie | `Enemies/elite_ifrit_trieur.webp` | 400, détouré |
| Portrait : le Golem-forge | `Enemies/elite_golem_forge.webp` | 400, détouré |
| Portrait : le Wyrm de cendres | `Boss/wyrm_cendres.webp` | 400, fond plein |

## Remarques pour Seb
- **Le Golem-forge porte une couronne.** Le prompt n'en parle pas ; la couronne rappelle plutôt le Porte-couronne. L'image est gardée.
- **Les deux portraits d'élites sont détourés.** Les autres élites ont un fond plein. Ils s'affichent bien en combat et sur la carte d'intro (vérifié dans Chromium).

## Suivi
- **Images à faire** : les 12 images y sont cochées « faites ». Il en reste 23 pour la Montagne :
  - les cartes `montagne_1` et `montagne_2`, la carte vivante et le fond du sentier du dessus ;
  - les 6 Mémoires 17 à 19 ;
  - 3 effets d'Histoire ;
  - les 10 hauts faits.

## Contrôles
- **Harnais** :
  - round-harness à 5035 OK, 0 échec, sur 2 passes ;
  - boot à 4 OK, création du héros à 44 OK, parcours à 139 OK.
- **Chromium** à 390 px : le Golem-forge, l'Ifrit et le Wyrm en combat, sans erreur de console.
