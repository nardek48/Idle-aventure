# v3.644.0 — Faille, lot F-3 : Mémoire 25 à 28, Souvenirs, hauts faits

Dernier lot de la faille (conception « Faille » v0.1, docs `idees/`). FA8 option C et FA9, validés par Seb le 03/11 ; FA10.

## Mémoire 25 à 28
Après la Tour, le plafond ne vient plus du monde atteint mais du **record de la faille** : un niveau de plus aux étages 5, 10, 15 et 20 (`MEMORY_FAILLE_GATES`). L'écran le dit (« S'ouvre à l'étage 15 de la faille. », « La jauge est pleine : le niveau suivant s'ouvrira quand tu atteindras l'étage 15 de la faille. »).

Coûts : 570 / 660 / 760 / 870 Aether (même pente que la Tour, ×1,15 environ).

| Niv. | Thème | Garder | Donner |
| --- | --- | --- | --- |
| 25 | Le Souffle long | **Le Souffle long** : +15 de Souffle au départ | **La source vive** : la source rend le double, −10 de Souffle au départ |
| 26 | L'écho appris | **L'écho appris** : à l'escalier, l'écho de l'étage suivant est annoncé | **L'écho rend** : +25 % de Givre bleu sur les étages à écho |
| 27 | Le Reflet | **Ce qu'il ne prend pas** : au palier, le miroir ne coûte que +15 % | **Le verre du Reflet** : +1 Verre de faille par Reflet vaincu |

**Jalon 28, Plus haut que la Tour** : une option par fin, comme le jalon 24 (il attend la Question).

| Fin | Option | Effet |
| --- | --- | --- |
| La forme au sommet | Elle regarde | la forme au sol ne prend que 5 de Souffle |
| Ce que la braise a gardé | Le pain du dernier camp | chaque montée commence avec tous tes PV |
| Ce que tu as gardé | Ce que tu portes | les combats de la faille coûtent 10 % de PV en moins |
| Le feu tient encore | La braise tient encore | +1 Givre bleu par escalier franchi |

**À valider par Seb** : FA9 ne précisait ni les quatre options du jalon 28 ni le nom « Plus haut que la Tour » (la conception disait « Plus bas » : on monte dans la faille). Ce sont des propositions.

## Souvenirs de la faille (nouveau, à valider)
Relevé fait en préparant ce lot : en fin d'Histoire, les robots de campagne ont **2 083 à 5 358 Aether**, alors que le jalon 24 en demande 3 191 cumulés. L'Aether ne « dort » donc pas après la Tour : sans source dans la faille, les niveaux 25 à 28 ne s'atteindraient qu'en rejouant ailleurs. Proposition livrée :
- **+2 Aether** par étage franchi, **+10** par Reflet vaincu (`MEMORY_SOUVENIRS.failleFloor`, `failleReflet`).
- Mesure (robot au plan parfait, héros de fin d'Histoire, 30 montées par classe) : **44 à 50 Aether par montée**. Avec 4 montées par jour, environ 190 Aether par jour : 3 à 5 jours de faille par niveau, une quinzaine de jours pour 25 à 28, en plus des autres sources.

## Hauts faits de la faille (FA10)
Catégorie « Faille », sans monde, paliers 2 / 3 / 5 (25 000 / 60 000 / 15 000 or), titre au palier or « **Plus haut que la carte** » (FA10 disait « Plus bas que la carte » : même raison, à valider).
- Visibles : **Dix étages**, **Vingt étages**, **Trente étages** (record), **Cinq mondes** (un étage franchi de chacun des cinq échos), **Le Reflet, là-haut**.
- Caché : **Sans redite** (vaincre le Reflet dans la faille sans avoir repris la même approche sur son palier).

## Moteur
- `systems/labyrinth-run.js` : points d'accroche par sorte (`hook` : `onStart`, `startBreath`, `springMult`, `foresee`, `stoneGain`, `mirrorPct`, `lossMult`, `touchBreath`, `stairsBonus`, `onStairs`, `onBossDown`) ; l'écho suivant peut être tiré d'avance (`run.nextEcho`).
- `data/faille.js` branche la Mémoire, les Souvenirs et les hauts faits sur ces points. **Le Labyrinthe n'en a aucun** : banc à graine fixe identique, octet pour octet.
- `systems/memory-system.js` : `getCap` (record lu sans créer d'état), `failleGate`. `ui/ascension-view.js` : textes de plafond.

## Fichiers
- Modifiés : `data/faille.js`, `data/memory.js`, `data/achievements.js`, `systems/labyrinth-run.js`, `systems/memory-system.js`, `ui/ascension-view.js`, `ui/labyrinth-view.js`, `ui/news-view.js`, `lang/en.js` (40 textes), `atelier/images-a-generer.html` (10 icônes de Mémoire, 6 de hauts faits).
- Aucun fichier ajouté, aucun fichier protégé touché.
- Harnais [435] : 28 contrôles. [133] (95 hauts faits) et [427] (Mémoire de la Tour) mis à jour. Chromium : écran de Mémoire avec les niveaux 25 à 28, sans erreur.
- **À signaler** : les thèmes « Le reflet » (niveau 23, Sommet interdit) et « Le Reflet » (niveau 27, faille) se ressemblent beaucoup. C'est le nom validé en FA9 ; à renommer si tu préfères.
