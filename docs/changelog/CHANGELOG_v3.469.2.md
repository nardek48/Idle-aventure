# v3.469.2 — Petites Aventures : les nouveautés s'expliquent au premier contact

Point 1 du bilan des Petites Aventures (décision PA-T1, textes validés par Seb) : aucune fenêtre n'expliquait les pièges, les sentiers coupés ni la condition du run.

## Ce qui change en jeu
- **« La nuit du run »** s'ouvre une seule fois, à la première préparation qui a une condition (pas une nuit calme). En 4 lignes : la nuit annoncée, le vert et le rouge, « Utile cette nuit » et la Nuit calme, la pastille dorée en route.
- **« Pièges et sentiers coupés »** s'ouvre une seule fois, la première fois qu'un losange rouge ou un rond gris apparaît sur la carte, ou qu'on marche sur un piège caché. En 5 lignes : le losange et son icône, les pièges cachés (torche, Lanterne), les quatre choix, les effets en rouge en haut de l'écran, le rond gris.
- En aventure, les fenêtres s'enchaînent : à la première préparation, « La nuit du run » vient juste après « Préparer une petite aventure », au lieu de surgir au geste suivant.
- Le tutoriel d'accueil n'est pas touché. Les icônes des pièges et des obstacles manquent encore : l'icône générique les remplace.

## Code
- `ui/tutorial-view.js` : fenêtres `pa2_night` et `pa2_traps` (onglet « scene », condition sur le run) ; `closeGenericTutorialModal` cherche la fenêtre suivante quand on est en aventure.
- `ui/pa2-view.js` : `pa2AfterRender` cherche ces fenêtres à chaque rendu (avant : seulement au changement d'onglet).
- `lang/en.js` : 11 textes.
- Aucun fichier protégé, aucun fichier ajouté.

## Outils
- `round-harness.js` :
  - section [284] (8 contrôles : fenêtres, conditions d'ouverture, piège caché découvert, appel au rendu) ;
  - en [283], deux contrôles qui dépendaient du hasard sont rendus sûrs : coupures d'orage sur un tirage figé (3 → 5), part de l'Alarme sur 4 000 tirages.
- `parcours-harness.js` (P7) : ferme les fenêtres de la préparation et de la carte comme un joueur.

## Contrôles
- Chromium, 390 et 320 px, vrai jeu : les deux fenêtres s'ouvrent au bon moment ; à 320 px, la liste défile, comme celle du Labyrinthe.
- i18n 100 %, aucun orphelin.
- round-harness 4728 OK, 0 échec (trois passes) ; boot, création du héros, parcours (139) OK.
