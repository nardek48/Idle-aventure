# v3.306.1 — Carte vivante : latence au glissé (retour Seb, carte de la Forêt)

## Le diagnostic

- Sur Chromium, un glissé de la carte ne repeint rien (trace : aucun Paint ni Raster) : le
  déplacement est déjà confié au compositeur. Aucune reconstruction périodique de la carte non
  plus (observée 15 s, boucle de jeu active). Le code n'a donc pas de défaut grossier.
- Ce que Safari paie : la carte empile **trois copies pleine taille de l'image** — la base, la
  brume et le Recouvrement —, les deux dernières avec un **filtre CSS chaîné** (jusqu'à cinq
  fonctions) et un **masque fait de 9 dégradés**. À ×2, la scène fait ~1 700 px de côté, ×3 en
  pixels réels. WebKit peint cette scène par tuiles : chaque tuile qui entre à l'écran pendant
  un glissé doit évaluer image + filtre + masque, trois fois. C'est la latence. La Forêt est la
  plus touchée parce qu'elle a les deux calques (secteurs voilés **et** repris).
- Aggravant, côté script : jusqu'à 120 mouvements par seconde, chacun réécrivant la taille de la
  scène et relisant sa géométrie entre deux écritures.

## Correctifs

1. **Image pré-calculée** (`livingMapBake`). À chaque changement d'état de la carte, l'image
   finale est calculée une fois dans un canvas, avec exactement les opérations du CSS : teinte,
   filtres (matrices de la spec Filter Effects, bornées à chaque étape), masques en disques
   dégradés, empilement. La carte n'a plus qu'**un seul calque d'image**, sans filtre ni masque.
   La trame du Recouvrement reste en CSS pour rester nette à tous les zooms.
   - Vérifié au pixel sur Chromium : écart moyen **0,7 / 255** avec le rendu CSS, aucun pixel
     au-delà de 14. Calcul : ~0,3 s à l'ouverture ou quand un secteur change d'état ; pendant
     ce temps, les calques CSS d'origine s'affichent, puis sont remplacés sans nouveau rendu.
   - Pas de canvas, ou échec : les calques CSS restent, comme avant.
2. **Gestes** : un seul rafraîchissement par image (requestAnimationFrame), géométrie lue une
   fois par geste, taille de la scène réécrite seulement quand elle change (un glissé ne touche
   que la translation).

Vaut pour les deux cartes. Aucun changement de rendu voulu.

**À confirmer sur iPhone** : la mesure faite ici est sur Chromium, qui n'avait pas la latence.

## Contrôles

- round-harness : 0 échec, stable sur 3 passages (2 759-2 760 OK, [85] sautée). Nouvelle section
  **[102]** (5 contrôles).
- boot-harness 4 OK ; `sim/forest-bench.js --diff` : écart nul.
- Playwright (iPhone 13) : comparaison au pixel CSS / pré-calculé, trace de glissé, aucune erreur.

## Fichiers

`css/04-panel-living-map.css`, `js/core/constants.js`, `js/ui/living-map-view.js`,
`round-harness.js`, `sw.js`. Aucun fichier ajouté. À appliquer après v3.306.0.
