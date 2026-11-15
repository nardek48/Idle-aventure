# v3.807.0 — Bulles du sac et du fil rouge effacées pendant le défilement (15/11/2026)

Audit de l'Alpha (13/11) : les bulles flottantes recouvraient le bord droit des cartes pendant le défilement (badges « 4/7 », « 2/2 »…). Option B, atelier `atelier/bulles-defilement.html` (vraies captures du village à 390 px), variante B1 retenue par Seb : 25 %, retour en 0,4 s. Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté au jeu.

## Changement
- `ui/hud-dock-view.js` : `hudDockOnScroll`, écouté en capture sur le document (le défilement ne remonte pas) : toute zone qui défile pose `.is-scrolling` sur les bulles, retiré 0,4 s après le dernier défilement (`HUD_DOCK_SCROLL_BACK_MS`).
- `css/02-layout.css` : `.hud-dock.is-scrolling { opacity: .25 }`, fondu de 0,15 s à l'aller et de 0,25 s au retour. Les bulles restent touchables.
- L'espace laissé en fin de liste (v3.650.0) reste en place.

## Vérifié dans le vrai jeu (Chromium, sauvegarde du robot)
- Village : opacité 1 → 0,25 pendant le défilement → 1 après 0,4 s ; le badge « 1/7 » se lit sous la bulle ; toucher le sac pendant l'effacement l'ouvre.

## Atelier
- `atelier/bulles-defilement.html` : trois variantes (25 %, 25 % + glisse, 45 %) et trois délais (0,4 / 0,7 / 1 s).

## Contrôles
- `round-harness` 7130 OK, 0 échec, sur 2 passes ([513p]).
- boot 4 OK ; création du héros 46 OK ; parcours complet 236 OK ; audit design sans écart ; i18n 100 %.
- Quoi de neuf : une ligne (FR + EN).
