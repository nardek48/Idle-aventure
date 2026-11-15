# v3.806.0 — La nuit attend que le trophée ou la fin de quête soient fermés (15/11/2026)

Audit de l'Alpha (13/11), enchaînements de fenêtres : après Nezzam, l'écran « La nuit tombe » s'affichait par-dessus le trophée et la fin de quête. Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Changement
- `ui/camp-view.js` : `worldNightShow` ne montre plus la nuit tant qu'une autre fenêtre est à l'écran (fenêtres « …-modal-root » dont le trophée et la fin de quête, aide ouverte, ouverture de chapitre : `worldNightBlocked`). La nuit reste en attente et se relance toutes les 0,7 s, puis s'affiche dès que la fenêtre est fermée.

## Vérifié, laissé tel quel
- « Décider » (choix d'Histoire) depuis le Camp mène à la carte d'étape de Quêtes › Histoire, où le choix se fait : décision de Seb (v3.429.2), non rouverte.

## Outils
- `tools/harness/parcours-harness.js` (P7) : les aides courtes des Petites Aventures (v3.805.0) peuvent s'ouvrir sur la feuille d'un nœud ; le parcours les ferme avant de jouer (échec intermittent, 3 sur 6 passages, absent en v3.804.0).
- `tools/audit/coach-captures.js` : déclencheurs des aides de la v3.805.0 (commités avec elle).

## Contrôles
- `round-harness` 7126 OK, 0 échec, sur 2 passes ([513o] : nuit bloquée tant qu'une fenêtre est ouverte, montrée ensuite).
- Vrai jeu (Chromium, sauvegarde du robot) : fin de quête ouverte, la nuit attend ; fenêtre fermée, la nuit s'affiche.
- boot 4 OK ; création du héros 46 OK ; parcours complet 236 OK sur 2 passes, P7 seul 8 sur 8 ; i18n 100 %.
- Quoi de neuf : une ligne (FR + EN).
