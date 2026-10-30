# v3.589.0 — Combat : carte du héros plus basse, tactique lisible, textes à 12 px

Décision de Seb du 30/10, après le relevé `atelier/releve-combat.html` et l'atelier `atelier/combat-lisible.html` (seul, un et deux compagnons).

## Ce qui change
- Carte du héros, plus basse et sans ligne vide (mesuré dans le jeu) : seul 120 → 66 px (portrait à gauche, nom et ressource sur une ligne, PV dessous) ; avec un ou deux compagnons 100 / 94 → 74 px (portrait sur toute la hauteur, nom, ressource et PV empilés à droite). L'arène gagne autant de place. Les cartes des compagnons ne changent pas.
- Le badge de niveau n'apparaît plus sur la carte du héros pendant le combat (Seb).
- « Par défaut → Garde » : pastille sombre à filet doré, texte plus clair ; lisible sur le sable et les pierres.
- Règle des 12 px : compteur des potions 11 → 12 px, raccourcis clavier (grand écran) 10 → 12 px.

## Fichiers
`css/03-combat-screen.css` seulement. Le moteur de combat (fichier protégé) n'est pas touché.

## Contrôles
`round-harness` 5 590 OK, 0 échec (trois passes) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` P11 15 OK. Combats réels sous Chromium (iPhone 390 × 844 et Mac 1440 × 900), Désert et Crypte, seul, un et deux compagnons : hauteurs ci-dessus, potions et raccourcis à 12 px, aucune erreur.
