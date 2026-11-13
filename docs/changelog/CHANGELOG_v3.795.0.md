# v3.795.0 — Grand écran : journal du combat groupé par round (13/11/2026)

Suite des « Signalés, sans correction d'office » (Seb 13/11, point 4). Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Journal du combat de la Chronique
- Comme la maquette validée (`atelier/grand-ecran.html`) : un intertitre « Round N » à chaque changement de round, le plus récent en haut.
- `main/log-service.js` : `addLog` note le round du combat en cours (`game.combatRound.number`) sur chaque ligne. Le journal n'est pas sauvegardé, rien à câbler.
- `ui/chronique-view.js` : `journalHTML(since)` insère les intertitres en combat seulement. Un numéro plus grand que celui de la ligne suivante, resté d'un combat d'avant, n'en reçoit pas.
- `css/10-grand-ecran.css` : `.chr-log li.chr-round` (12 px, capitales espacées, couleur des heures).

## Contrôles
- `round-harness` 7088 OK, 0 échec, sur 2 passes ([513e] round noté, intertitres dans l'ordre, pas de round périmé, rien hors combat).
- boot 4 OK ; création du héros 46 OK ; parcours complet 236 OK ; i18n 100 %.
- Capture 1440 × 900 contre l'Arbre-mère : Round 6 à Round 1.
- Quoi de neuf : une ligne (FR + EN).
