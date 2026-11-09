# v3.754.0 — Forge 2 : le Verre trempé dit quand il s'ouvre (audit A, MES-6, option A) — lot Alpha, point 7

Constat (audit d'équilibrage A, MES-6) : en arrivant au Désert, la Forge 2 demande 3 Verres trempés. Le Tailleur de pierre qui les fait n'ouvre qu'à desert_09 (« Le verre des dunes », `openAtStoryStep`). La fiche et la bulle d'or envoyaient vers cet atelier fermé, et « Fabriquer » n'y faisait rien, sans message. Fenêtre mesurée : 2,45 h au Désert (1,4 à 3,1 h).

- `js/ui/village-building-view.js` : `getResourceStoryLock(key)` donne l'étape qui ouvre l'atelier producteur, tant qu'il est fermé. Le matériau est alors introuvable (loupe, comme un matériau d'un monde pas encore atteint) et l'aide dit « S'ouvre avec l'Histoire : « Le verre des dunes » ».
- `js/ui/or-a-investir-view.js` : la carte du matériau ne propose plus la recette ni « Produire » vers un atelier fermé ; elle dit l'étape.
- `js/ui/production-view.js` : un lien vers un atelier fermé affiche l'étape au lieu d'ouvrir l'atelier.
- Vaut pour tout atelier ouvert par l'Histoire (même mécanisme pour les matériaux plus loin). La grille de Forge ne change pas.
- Quoi de neuf : une ligne (FR + EN).
- `tools/harness/round-harness.js` : section [507] ; [230] et [499] posent un Désert fini quand ils placent le héros aux Ruines (état cohérent, Tailleur ouvert).
- Outil : `campagne-lot.js` transmet `--jusqua` (lot arrêté à une étape).

Mesure du lot Alpha (outils, `campagne-lot.js . --combats --joueur --n 4 --jusqua ruines_01`, sur v3.753.0) : 12/12 jusqu'à ruines_01, aucun mur ; Forêt 2,1 h, Désert 3,9 h (fin 5,9 h simulées, temps actif 1,9 h) ; 3 morts (Orc de forest_15 : 2, Basilic de forest_14 : 1).

Contrôles : round-harness 7 261 OK, 0 échec (×2) ; boot 4 OK ; création du héros 44 OK ; i18n 8 946 textes, 100 % ; parcours 235 OK.
