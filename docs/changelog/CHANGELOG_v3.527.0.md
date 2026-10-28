# v3.527.0 — Images : portraits plus légers, fichiers morts, usages séparés (audit, lot 9 suite)

Décisions de Seb du 28/10, avec une consigne : les images doivent rester nettes en mode PC et sur tablette. Chaque taille a donc été choisie après mesure dans Chromium, dans 9 affichages : iPhone 390 et 430, iPad et iPad Pro en portrait et en paysage, PC 1920 à 1× et 2×, PC 2560.

## Mesures (px physiques à l'écran)
| Affichage | Combat | Fiche du bestiaire | Carte (pastille) |
|---|---|---|---|
| iPhone 430 @3x | 1 006 | 648 | 114 |
| iPad portrait @2x (zoom 1,35) | 906 | 586 | 104 |
| iPad Pro portrait @2x (zoom 1,6) | **1 074** | 692 | 124 |
| iPad Pro paysage @2x | 846 | 432 | 76 |
| PC 1920 @2x | 787 | 498 | 88 |

Liste du bestiaire : cadre de 58 px CSS, au plus 174 px réels (iPhone @3x, iPad Pro portrait).

## Portraits d'ennemis (IMA-2)
- Les 13 portraits de 1254 px passent à **1088 px**, juste au-dessus du plus grand besoin mesuré (1 074 px) : −2,51 Mo, sans différence visible à 100 %. L'audit proposait 768 px, ce qui aurait rendu les portraits flous en combat, sur téléphone comme sur tablette.
- Les 39 portraits de 1024 px et moins ne changent pas.
- **Vignettes de 256 px** (`images/Enemies/vignettes/`, `images/Boss/vignettes/`, 52 fichiers, 1,16 Mo) pour la liste du bestiaire et les pastilles de la carte. La taille laisse de la marge au zoom du PC. Ouvrir un monde du bestiaire ne télécharge plus 4,6 Mo de portraits.
- Une vignette absente n'est pas un problème : le jeu affiche le portrait entier (`portraitThumb`, `portraitThumbSrcAttrs` et repli dans `onMissingImage`, `core/utils.js`). `missing-icons.js` liste les vignettes à tirer.

## Fichiers inutilisés (IMA-7)
- 12 images citées nulle part, supprimées : `quests/quest_hunt`, `talents/up_icon`, `Borders/title`, et les 9 hauts faits retirés (`ach_kills_*`, `ach_crits_*`, `ach_equip_set`, `ach_dungeon_*`).
- Champ `questIcon` des élites retiré (aucun code ne le lisait), avec les 6 icônes qui ne servaient que par lui : `elite2`, `elite_serment`, `elite_dard`, `elite_contremaitre`, `elite_golem_forge`, `elite_ifrit_trieur`.
- Ces images n'étaient pas précachées : `sw.js` n'a rien à retirer.

## Images à deux usages (IMA-5)
Chaque usage a son propre chemin. L'icône générique s'affiche en attendant l'image (règle du projet), et les prompts sont dans la page de suivi, au format 256 px :
- « Rentrer » du combat : `system/return_camp.webp` (était l'Affût aménagé).
- Contexte « Exploration » du combat : `quests/ctx_exploration.webp` (était l'image des chasses).
- Onglet, cadre et fiche Talents : `subtabs/talents.webp` (était le coffre « trouvaille »).
- Onglet Compagnons, fiches Compagnon et Reliques : `subtabs/companions.webp` (était l'icône des Capacités).
- « Établi » de la Forge : `workshops/workbench.webp` (était le coffre « trouvaille »).
- Jalons et livret des rangs des sorts : `special_attacks/spell_ranks.webp` (était la compétence du Chevalier).
- Stats Force, Précision et Endurance des Petites Aventures : les icônes de stat de la fiche du héros (`improvement_icons/*`), à la place des potions. Pas d'image nouvelle.
- Non touchés : les tutoriels (règle d'onboarding) et le repli des actions de classe sans icône (cas de secours, non vérifié en jeu).

## Contrôles
- Round : 5 337 OK, 0 échec, sur deux passes. Harnais [346].
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 6 583 textes, 100 %, 0 orphelin.
- Chromium :
  - bestiaire et carte servis en vignettes, sans aucun portrait entier téléchargé ;
  - vignette absente simulée : le portrait entier prend la place ;
  - Héros, Forge et combat à 390 px et en format tablette (1366 px) : 0 erreur.
- `missing-icons.js --chromium` : 14 images absentes (les 8 d'avant et les 6 nouveaux chemins), aucune vignette manquante.
- Fichiers ajoutés : 52 vignettes (images, non précachées). Aucun fichier JS ou CSS ajouté.
