# v3.658.0 — Une image, un usage

Point signalé de la feuille de route : « Images qui servent à deux choses » (règle de Seb : une image ne sert qu'à une seule chose). Relevé refait le 04/11 : 697 images référencées par le code, 153 utilisées à trois endroits ou plus. Dix cas portaient deux sens ; proposition validée par Seb (deux temps).

## 1er temps : les images propres qui existaient déjà
- **Terrain d'entraînement** : sa petite icône était `stat_critical`, la stat Critique. Elle passe à `village_buildings/training_grounds`, sur la fiche, le tutoriel et le renvoi « S'entraîner ».
- **Enchanteresse** : sa petite icône était `node_discovery`, la case « Trouvaille » des Petites Aventures. Elle passe à `village_buildings/enchantress_tower`.
- **Compagnons** : les 5 conseils d'étape et le choix « Changer de compagnon » au camp du donjon prenaient `hero_summary`, l'onglet Résumé du héros. Ils passent à `subtabs/companions`.
- **Rapport de combat** : « boucliers retirés » prenait `stat_speed`, la stat Célérité. Il passe à `combat_status/shield_incoming`.
- **Chrono d'une potion active** : il prenait `stat_attack`. Il passe à `subtabs/potions`.
- **Conseils du village** (« améliore d'abord… ») : ils prenaient `stat_critical`. Ils passent à `system/upgrade`.
- **Conseil d'étape sur la Volonté** : il prenait `node_discovery`. Il passe à `stat_critical`, déjà l'icône des dégâts critiques dans les stats.

## 2e temps : 6 images à générer (ajoutées en tête d'« Images à générer »)
Le jeu les attend à leur vrai chemin ; l'icône générique s'affiche en attendant.

| Image | Chemin | Remplace |
| --- | --- | --- |
| Le Grimoire | `system/grimoire.webp` | `codex_lore` (Codex) : onglet du Camp, mode Grimoire, préréglages, « Combat épuré », tutoriel ; `memory/grimoire_etendu` : 10 conseils d'étape sur le Grimoire |
| Le mode Tactique | `system/mode_tactique.webp` | `stat_critical` : préparation, en-tête du Grimoire, écran de combat |
| Compétence par défaut | `combat_actions/skill_generic.webp` | `node_discovery` : compétence sans image propre (6 écrans), conseil « Compétences » |
| Un Sceau | `codex/sceau.webp` | Cadenas de l'interface et `node_unknown` : fiches du Codex des six Sceaux, « Ce qui attend au sommet » |
| La carte vivante | `living_map/carte_vivante.webp` | `node_unknown`, `node_discovery` : 10 conseils sur les cartes vivantes |
| Paramètres · Jeu | `system/settings_game.webp` | `stat_attack` : onglet « Jeu » des Paramètres |

## Laissés tels quels
- **`camp/campfire`** : feu du Camp, camp du donjon (« Sortir », « En sûreté »), retour au camp. C'est la même idée de camp et de repos.
- **`quests/mission_hunt`** : seulement dans le code mort des chasses (retirées en v3.511.0), à ranger avec les nettoyages.

## Contrôles
- `node --check` sur les fichiers modifiés.
- `round-harness.js` : 6 140 OK, 0 échec, sur deux passes. `boot-harness.js` : 4 OK. `parcours-harness.js` : 212 OK.
- `missing-icons.js` : les 6 nouveaux chemins sont les seuls ajoutés à la liste des images absentes.

## Fichiers
- Fichiers modifiés :
  - interface : `ui/grimoire-view.js`, `ui/sortie-prep-view.js`, `ui/camp-view.js`, `ui/combat-screen-view.js`, `ui/settings-view.js`, `ui/tutorial-view.js`, `ui/modal-view.js`, `ui/heros-screens-view.js`, `ui/heros-view.js`, `ui/or-a-investir-view.js`, `ui/combat-view.js`, `ui/combat-report-view.js`, `ui/dungeon-view.js`, `ui/village-building-view.js` ;
  - données : `data/story-quests.js`, `data/codex.js`, `data/village-buildings.js`, `data/village-quests.js` ;
  - version : `ui/news-view.js`, `lang/en.js`, `core/constants.js`, `sw.js`.
- Atelier : « Images à générer » (+6).
- Aucun fichier protégé touché, aucun fichier ajouté.
