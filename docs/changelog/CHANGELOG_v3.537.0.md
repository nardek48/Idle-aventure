# v3.537.0 — Images manquantes : 14 ajoutées, 1 refaite

Images générées par Seb, d'après les prompts de `atelier/images-a-faire.html`. Les planches ont été découpées et chaque objet recadré au carré. Les fonds étaient déjà transparents.

## Images ajoutées (elles s'affichaient jusqu'ici avec l'icône générique)
- **Objets de combat de la Montagne** (128 px) : `combat_items/leurre_de_cendre.webp`, `combat_items/coin_obsidienne.webp`.
- **Reliques des compagnons** (128 px) : `companions/relics/relic_croc`, `relic_ecorce`, `relic_sceau`, `relic_sablier`, `relic_talisman`, `relic_besace` (.webp).
- **Images à usage unique de l'audit IMA-5** (256 px, nettes sur tablette et PC) : `subtabs/talents`, `subtabs/companions`, `workshops/workbench`, `system/return_camp`, `quests/ctx_exploration`, `special_attacks/spell_ranks` (.webp).

## Image refaite
- `dungeon/halte_pacte_sang.webp` (128 px) : un parchemin vierge scellé d'une goutte de sang et trois pièces d'or.

## Remarques
- **Rangs des sorts** : 4 chevrons, au lieu des 5 du prompt. Image gardée telle quelle.
- **Leurre, Coin et Pacte** : contour noir plus épais que celui des objets voisins. Écart léger.
- **Icônes d'élite** `quest_icons/elite/elite_golem_forge` et `elite_ifrit_trieur` : elles ne servent plus. Le champ `questIcon` a été retiré en v3.527.0, et les élites utilisent leur portrait. Elles peuvent sortir de la liste.

## Contrôles
- Audit des icônes : aucune image absente.
- Chromium : les 15 images se chargent à leur taille ; Talents et Compagnons apparaissent sur le rail de Héros.
- Round : 5 375 OK, 0 échec, sur deux passes. Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- Aucun code modifié, en dehors du numéro de version : il vide le cache, pour que l'ancien Pacte de sang ne reste pas sur les téléphones.
