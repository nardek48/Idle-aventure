# v3.469.5 — Petites Aventures : trois reliques par monde

Fin du bilan des Petites Aventures, récompenses propres à chaque monde, second volet (PA-R2, reliques validées par Seb).

## Ce qui change en jeu
Le Désert, les Ruines et la Crypte ont chacun trois reliques (une commune, une rare, une légendaire). Elles se tirent seulement dans leur monde, aux trouvailles et au tertre ouvert, en plus des 8 reliques communes à tous.

| Monde | Rareté | Relique | Effet |
| --- | --- | --- | --- |
| Désert | Commune | Perle de rosée | La marche coûte 1 Souffle de moins par pas |
| Désert | Rare | Œil de scarabée | Ruser gagne un cran |
| Désert | Légendaire | Cœur de dune | Butin final +25 %, mais les points d'eau ne rendent que la moitié |
| Ruines | Commune | Clou de bâtisseur | Désamorcer un piège gagne un cran |
| Ruines | Rare | Fil d'Edda | Les murs ne bougent plus devant toi |
| Ruines | Légendaire | Marteau du Contremaître | +1 cran sur toutes les voies d'obstacle, combats +15 % de dégâts reçus |
| Crypte | Commune | Mèche de Sarkel | La Lanterne brûle 3 pas de plus |
| Crypte | Rare | Cendre de veilleur | Les alcôves sont gratuites et soignent le double |
| Crypte | Légendaire | Cloche muette | L'Alarme ne se déclenche jamais, et Ruser gagne deux crans |

Quand la Cloche muette étouffe une Alarme, la fiche du piège le dit.

## Mesures (`pa2-bench`, Périple, 150 runs par cellule)
| Monde | Sans les reliques du monde | Avec |
| --- | --- | --- |
| Désert | 47 % | 45 % |
| Ruines | 33 % | 35 % |
| Crypte | 24 % | 24 % |

Les reliques varient le run sans changer l'équilibre.

## Code
- `data/pa2-content.js` : 9 reliques dans `PA2_RELICS` (champ `world`), réglages dans `PA2_RULES`.
- `systems/pa2-run.js` :
  - le tirage ne garde que les reliques sans monde ou de ce monde ;
  - effets dans la marche, la Ruse (nouvelle `ruseBonus`), les sources, le butin final, le désamorçage, les murs, les obstacles, les dégâts, la Lanterne, les autels et l'Alarme ;
  - `hasRelic` accepte un run sans reliques.
- `ui/pa2-view.js` : la ligne de l'Alarme étouffée.
- `lang/en.js` : 19 textes.
- Aucun fichier protégé, aucun fichier ajouté.

## Images à faire
9 icônes `images/Icons/scene/relics/relic_<id>.webp` (perle, scarabee, dune, clou, fil, marteau, meche, cendre, cloche), ajoutées à la page de suivi avec leurs prompts. L'icône générique les remplace en attendant.

## Outils
- `round-harness.js` :
  - section [287] (14 contrôles : trois reliques par monde, tirage limité au monde, chaque effet) ;
  - [159] : les 9 icônes à fournir.
- `pa2-bench.js` : `--sans-reliques-monde`.

## Contrôles
- i18n 100 %, aucun orphelin ; `missing-icons.js` : 29 images absentes (pièges, obstacles, coffre, reliques).
- round-harness 4768 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
