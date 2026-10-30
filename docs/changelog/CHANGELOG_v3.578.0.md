# v3.578.0 — Petites Aventures, lot 3 : tout au dé

Validé par Seb le 30/10 (« je suis tes recommandations ») : le Souffle sert aux jets (1A), la ration compte au feu (2A), des jets de qualité sans échec (3), et le repos donne le double dé (4).

## Insister (1A)
- Après un jet **raté** ou **de justesse** (obstacle, ruse, désamorçage), le jet reste en suspens : **Insister** (20 de Souffle) relance le dé une fois, et le nouveau jet compte quel qu'il soit. **Garder ce jet** applique le résultat.
- Sans assez de Souffle, le résultat s'applique tout de suite. La gourde se boit à tout moment, y compris pour avoir de quoi insister.
- Sous le dé : « Relancé (premier jet : 4) ».
- Jet en suspens gardé dans la partie : au rechargement, la feuille reprend sur le choix.

## L'avantage (4)
- **Dormir** au camp ou **reprendre son souffle** au seuil donne l'avantage au prochain jet risqué : deux dés, le meilleur compte.
- Le détail du jet affiche « avantage » et la chance tient compte des deux dés (exemple : 75 → 94 %). Sous le dé : « Avantage : 2 et 4 ».

## La ration au feu (2A)
- Cuisiner soigne **une fois et demie** l'effet de la ration, plafonné aux PV max : petite ration 53 %, ration 90 %, grande ration 100 % (avant : 70 % pour toutes). Toujours une blessure levée.
- Un bouton par ration en stock : tu choisis laquelle cuire.

## Jets de qualité (3)
- Sources, autels, repos, cuisine et trouvailles lancent un d20 **sans échec** : 1-5 maigre (−25 %), 6-15 normal, 16-19 bon (+25 %), 20 parfait (+50 %). En moyenne, l'effet ne change pas (×1,01).
- Un 20 ajoute un petit bonus : la source rend tout le Souffle ; l'autel, la cuisine et le repos lèvent une blessure de plus ; la trouvaille garantit la ressource rare.
- Une feuille montre le dé, la qualité et l'effet, puis « Continuer ».

## Banc (`tools/sim/pa2-bench.js`, 100 runs par cellule)
| Anneau | KO avant | KO après | Or par run |
|---|---|---|---|
| Sentier | 4 % | 3 % | 200 → 207 |
| Chemin | 10 % | 9 % | 257 → 281 |
| Périple | 27 % | 20 % | 292 → 353 |

Relance à 15 de Souffle essayée d'abord : trop généreuse au Périple (18 %), d'où 20. Le banc compte désormais les relances, le Souffle le plus bas, les gorgées de gourde et les soins du camp (options `--sans-gourde`, `--ovr={"d20":{…}}`).

## Code
- `js/data/pa2-content.js` : `PA2_D20.insistBreath`, `PA2_QUALITY`, `PA2_RULES.cookMult` (remplace `cookPct`).
- `js/systems/pa2-run.js` : `_riskRoll`, `quality`, `canInsist`, `insist` ; obstacle, piège et ruse séparés en jet puis conséquences (`_applyObstacle`, `_applyTrap`, `_applyRuse`) ; `cookPct(ration)` ; qualité dans `drink`, `altar`, `placeAction`, `takeRelic`.
- `js/ui/pa2-view.js`, `css/04-panel-pa2.css` : feuille du jet de qualité, choix « Insister / Garder ce jet », cuisine par ration, avantage.
- `js/lang/en.js` : textes anglais ; deux anciennes chaînes retirées.
- Aucun fichier ajouté, aucun fichier protégé. Deux champs nouveaux dans le run en cours (`pending`, `advNext`), sauvegardés avec lui : pas de nouvel état de partie.

## Contrôles
`round-harness` 5 558 OK, 0 échec (passes répétées ; nouvelle section [382], robots et contrôles exacts adaptés au jet en suspens et à la qualité) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` 142 OK ; audit i18n 100 %, 0 orphelin. Écrans vérifiés sous Chromium à 390 × 844.
