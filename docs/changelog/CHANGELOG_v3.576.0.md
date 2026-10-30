# v3.576.0 — Petites Aventures, lot 1 : la carte ne saute plus, zoom de départ

Retour de Seb du 30/10 (liste des Petites Aventures, lot 1). Fichier modifié : `js/ui/pa2-view.js` (le moteur de caméra commun `ui/map-camera.js` n'est pas touché, la carte vivante est inchangée).

## La carte « allait dans tous les sens »
Quatre causes, toutes corrigées :
1. **Recentrage à chaque feuille.** La caméra recentrait le héros à chaque ouverture et à chaque étape d'une feuille. Désormais elle ne bouge que si la feuille **cache** le héros (`pa2CamHeroHidden`).
2. **Aller-retour pendant un rendu.** Un rendu pendant qu'une feuille est ouverte recalculait les bornes sans elle : la carte remontait, puis redescendait. La hauteur de la feuille ouverte est retenue (`bottomSlack`).
3. **Héros trop bas.** Le héros suivi est placé vers 40 % de la hauteur (`PA2_FOLLOW_Y`), et non plus au centre : une feuille qui s'ouvre le cache rarement.
4. **Glissements coupés.** Un rendu pendant un glissement faisait apparaître la carte d'un coup à l'arrivée. La nouvelle scène repart de la position affichée (`pa2CamShownXY`) et termine son glissement.

Mesuré sous Chromium sur les mêmes parties (hasard fixé) : graine 21, 9 mouvements dont 5 sauts → 5 glissements, 0 saut ; graine 13, 5 mouvements et 6 sauts → 3 glissements, 0 saut ; trois autres parties : 0 saut. Les glissements restants sont voulus : héros tout en bas de la carte, la carte monte pour le montrer au-dessus de la feuille, puis redescend doucement.

## Zoom de départ ×1,4 (choix de Seb, atelier `atelier/zoom-petites-aventures.html`)
La carte d'une Petite Aventure (et des parcours) s'ouvre zoomée ×1,4 (`PA2_ZOOM_START`) : on ne voit plus toute la carte d'un coup. Pincer et double toucher marchent toujours (×2 au plus).
Garde-fou trouvé au parcours P12 : sur « Personne ne remonte le fleuve » (étapes très espacées), le point suivant sortait de l'écran. La caméra garde désormais visibles les points où le héros peut aller (`pa2CamKeepMoves`), aussi à la fermeture d'une feuille (`pa2CamRevealMoves`).

## Contrôles
`round-harness` 5 528 OK, 0 échec (deux passes, nouvelle section [380]) ; `boot-harness` 4 OK ; `parcours-harness` complet 142 OK, 0 échec.
