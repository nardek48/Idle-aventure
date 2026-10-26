# v3.492.8 — Montagne : les 20 dernières images

Seb a fourni les dernières images de la Montagne. Toutes correspondent à leur prompt. Chaque image est découpée, mise au format et déposée à son vrai chemin. La piste du « sentier du dessus » est relevée sur le nouveau fond. Aucun fichier JS ou CSS n'est ajouté.

**Il ne manque plus aucune image de la Montagne.**

## Fond du parcours « Le sentier du dessus »
- **Chemin** : `Maps/parcours/montagne_sommet.webp`, 1024 × 1536.
- **Piste** : relevée au pixel sur le trait bleu peint, du lac à l'aile du dragon. Elle remplace la piste provisoire, qui était celle de la chaîne de la Crypte.
- **Paliers** (points 0, 2, 4, 6 et 8) :
  - les quatre premiers tombent sur les pastilles bleues de l'image : le haut de la coupe, les dragonnets, la source, les deux golems ;
  - le cinquième est sur le plateau aux écailles.

## Hauts faits (256 × 256, tuile au cadre de bronze)
| Haut fait | Chemin |
| --- | --- |
| Le droit de prendre | `Icons/achivement/hf_montagne_dragon.webp` |
| Ce qui tombe dans le lac | `Icons/achivement/hf_montagne_wyrm.webp` |
| Toutes les pentes | `Icons/achivement/hf_montagne_map.webp` |
| Les façonnés de la Gueule | `Icons/achivement/hf_montagne_elites.webp` |
| Ce qu'on prend | `Icons/achivement/hf_montagne_cut.webp` |
| Ce qu'on laisse | `Icons/achivement/hf_montagne_left.webp` |
| Le sol qui brûle | `Icons/achivement/hf_montagne_run.webp` |
| Naturaliste de la Montagne | `Icons/achivement/hf_montagne_bestiary.webp` |
| Les mains vides | `Icons/achivement/hf_montagne_nocut.webp` |
| La coulée, reprise | `Icons/achivement/hf_montagne_retaken.webp` |

Les légendes en anglais de la planche ne sont pas reprises. Les tuiles de la première rangée sont un peu plus hautes que larges (265 × 285) : elles sont ramenées au carré, soit un tassement d'environ 7 %.

## Mémoires 17 à 19 (128 × 128, carte au cadre d'acier)
`Icons/memory/` :
- `peau_basalte` ;
- `taille_franche` ;
- `pierre_profonde` ;
- `cendre_au_pas` ;
- `fidelite_sarkel` ;
- `pioche_sure`.

## Effets d'Histoire (256 × 256)
`Icons/traits/` :
- `ouvrage_acheve` : le golem qui rentre dans la paroi ;
- `veine_mere` : la veine descendue dans le puits ;
- `montagne_apprend` : la main sur la veine, devant l'œil du dragon.

## Remarques pour Seb
- **Deux pioches proches.** La Mémoire « Pioche sûre » et le haut fait « Ce qu'on prend » montrent tous deux une pioche qui frappe la roche noire et fait voler des éclats bleus. Les deux images sont différentes, mais le sujet est le même : il était proche dès les prompts.
- **Haut fait « Toutes les pentes ».** La carte dessinée porte de petits gribouillis qui ressemblent à de l'écriture. On ne les lit pas à la taille du jeu.

## Suivi
- **Images à faire** : les 20 images y sont cochées « faites ». La famille Montagne brûlante est complète.
- **Images absentes du jeu** : il en reste 7, toutes hors Montagne : un état de combat et 6 haltes de donjon.

## Contrôles
- **Harnais** :
  - round-harness : 5035 OK, 0 échec, sur 2 passes ;
  - boot : 4 OK ;
  - création du héros : 44 OK ;
  - parcours : 139 OK.
- **Chromium** à 390 et 320 px, sans erreur de console :
  - le sentier du dessus, avec ses pastilles sur la piste peinte ;
  - les hauts faits de la Montagne, avec les 9 icônes visibles chargées en 256.
