# v3.469.4 — Petites Aventures : un coffre d'expédition dans chaque monde

Bilan des Petites Aventures, récompenses propres à chaque monde : décision PA-R1 de Seb (option 1, le coffre d'abord), objets validés.

## Ce qui change en jeu
Seule la Forêt débloquait des objets de besace (Bois de cerf, Lanterne des veilleurs). Le Désert, les Ruines et la Crypte en ont maintenant deux chacun. Un objet entre au coffre une fois pour toutes, en atteignant la destination. Comme ceux de la Forêt, il sert ensuite dans tous les mondes.

| Monde | Destination | Objet | Places | Effet |
| --- | --- | --- | --- | --- |
| Désert | Le Ver du plateau | Écaille du Ver | 2 | +1 cran sur la voie endurance ; la marche coûte 1 Souffle de moins par pas |
| Désert | Le campement des tentes | Natte de caravane | 1 | Le repos au camp ou au seuil rend le double (PV et Souffle) |
| Ruines | Le gardien de la porte | Pierre taillée du gardien | 2 | +1 cran sur la voie précision et pour désamorcer un piège |
| Ruines | La cour au puits | Pierre du puits | 1 | Les pièges cachés se voient dans toute ta vue |
| Crypte | Le gardien couché | Épée du gisant | 2 | Combats : en Tenant, −20 % de dégâts reçus |
| Crypte | La chapelle de l'ouest | Cierge de la chapelle | 1 | Les effets des pièges ne durent qu'un pas |

Les objets de gardien couvrent chacun une voie : force (Bois de cerf), endurance (Écaille), précision (Pierre taillée). L'Épée ne se gagne qu'en combattant le gardien couché : si on le contourne, son coffre reste sous lui. Tant qu'un objet est verrouillé, la besace dit où le gagner.

## Mesures (`pa2-bench`, Périple, 150 runs par cellule, l'objet à la place de la torche)
| Monde | Torche | Objets |
| --- | --- | --- |
| Désert | 45 % | Écaille 46 %, Natte 39 % |
| Ruines | 35 % | Pierre taillée 32 %, Pierre du puits 37 % |
| Crypte | 24 % | Épée 24 %, Cierge 28 % |

Chaque objet aide sans écraser les autres choix de besace (KO à ±6 points de la torche, avec plus d'or pour la plupart).

## Code
- `data/pa2-content.js` : 6 objets dans `PA2_ITEMS` et `PA2_ITEM_ORDER`, `PA2_CHEST_REWARDS` pour le Désert, les Ruines et la Crypte, réglages dans `PA2_RULES`.
- `systems/pa2-run.js` : crans d'obstacle et de désamorçage, marche, repos, pièges cachés, dégâts en Tenant, durée des effets.
- `lang/en.js` : 18 textes.
- Le coffre est déjà sauvegardé (`game.expeditionChest`) : rien à câbler. Aucun fichier protégé, aucun fichier ajouté.

## Images à faire
6 icônes, ajoutées à la page de suivi avec leurs prompts : `images/Icons/scene/items/` `item_worm_scale`, `item_caravan_mat`, `item_guardian_stone`, `item_well_stone`, `item_sleeper_sword`, `item_chapel_candle` (`.webp`). L'icône générique les remplace en attendant.

## Outils
- `round-harness.js` :
  - section [286] (13 contrôles : coffre par monde, verrou, déblocage, gardien couché contourné ou combattu, chaque effet) ;
  - [164] : le Désert ouvre maintenant son propre coffre ;
  - [159] : les 6 icônes à fournir.
- `pa2-bench.js` : `--objet=<id>` (un objet du coffre à la place de la torche).

## Contrôles
- i18n 100 %, aucun orphelin ; `missing-icons.js` : 20 images absentes (pièges, obstacles, coffre).
- round-harness 4756 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
