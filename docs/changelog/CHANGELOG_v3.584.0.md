# v3.584.0 — Plus de grand cadre : des blocs encadrés sur le décor

Décision de Seb du 30/10, après les ateliers `atelier/sans-cadre.html` (variantes A, B, C) et `atelier/jeu-sans-cadre.html` (toutes les pages, avant et après). Variante B retenue.

## Ce qui change
- Le grand cadre doré autour des pages (chapeau, rails, pied) disparaît, sur téléphone comme en grand écran.
- Le décor du monde, assombri, passe entre les blocs ; chaque bloc garde son fond et reçoit un filet doré, comme le bandeau illustré.
- Les pages sans bandeau (Équipement, Sac, Boutique, Talents, Grimoire, Mémoire, Donjon, Paramètres) ont un titre simple : Cinzel doré sur bande sombre à filet doré, retour « ‹ » conservé.
- Les zones qui n'avaient pas de fond propre reçoivent le parchemin : barres d'onglets, niveaux de la Mémoire, emplacements libres du Grimoire, onglets des Talents, filtre et sections de l'Entrepôt, légende du Sac, minuteur de la Boutique, panoplies.
- Les textes posés sur le décor passent en clair (« Quêtes actives », « Zone de danger », en-têtes du Grimoire, noms des actes en grand écran…).
- Grand écran : le bloc du mannequin (Équipement) prend toute la largeur, l'image garde ses 380 px au centre et ses emplacements sont recalés.

## Pour la suite
Le fond parchemin et les cadres légers prévus par Seb remplaceront deux réglages en tête de la règle (`css/00-kbtn.css`) : `--kf-scrim` (voile du décor) et `--kf-ring` (filet des blocs).

## Fichiers
`css/00-kbtn.css` (règle commune), `css/10-grand-ecran.css` (grand écran). Aucun nouveau fichier, aucun fichier protégé.

## Contrôles
`round-harness` 5 584 OK, 0 échec (deux passes) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` P11 15 OK. Relevé automatique sous Chromium (iPhone 390 × 844 et Mac 1440 × 900) sur 18 pages : aucun texte sombre posé sans fond (jusqu'à 60 par page avant correction).
