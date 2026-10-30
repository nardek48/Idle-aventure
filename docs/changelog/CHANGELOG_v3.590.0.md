# v3.590.0 — Boutons : le danger en contour rouge, « Changer » à 44 px

Décision de Seb du 30/10, après le relevé `atelier/boutons-releve.html` (règle des boutons de la v3.402 vérifiée sur le jeu).

## Ce qui change
- Bouton danger (Abandonner une mission ou une quête, Effacer la partie…) : il quitte le bleu serti (règle D1 de la v3.402) pour un contour rouge sur parchemin, comme un secondaire. À côté d'un principal (« Continuer »), l'action normale ressort seule. Vaut dans les pages, feuilles, menus et fenêtres ; hors de ces conteneurs, classe `.is-sec`.
- Équipement : le bouton « Changer › » passe de 38 à 44 px de haut (zone de toucher).
- Le reste de la règle de la v3.402 ne bouge pas : principal bleu serti, secondaire en contour bronze, lien souligné, indisponible en gris pierre.

## Fichiers
`css/00-kbtn.css`, `css/04-panel-heros-screens.css`.

## Contrôles
`round-harness` 5 590 OK, 0 échec (deux passes) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` P11 15 OK. Captures Chromium iPhone 390 × 844 : mission en cours (Continuer / Abandonner), zone de danger des Paramètres, « Changer › » mesuré à 44 px.
