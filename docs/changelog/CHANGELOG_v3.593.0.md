# v3.593.0 — Combat sur téléphone : le nom de chaque ennemi

Accord de Seb du 31/10, après l'atelier `atelier/combat-noms.html`.

## Ce qui change
- Téléphone : chaque ennemi qui n'est pas la cible porte son nom sous lui (« Spectre errant », « Dragonnet »), dans une petite pastille sombre en 12 px ; sous ses pastilles d'état quand il en a. La cible garde son grand nom en haut, sans étiquette en double.
- Grand écran : inchangé (chaque ennemi avait déjà son étiquette).
- Le nom de la quête en haut du combat reste entier, sur deux lignes si besoin : choix voulu de Seb (la variante « une ligne coupée par … » de l'atelier est écartée).
- Nouveauté ajoutée à « Quoi de neuf ».

## Fichiers
`css/03-combat-screen.css`, `js/ui/news-view.js` (une ligne), `js/lang/en.js`. Le moteur de combat (protégé) n'est pas touché.

## Contrôles
`round-harness` 5 600 OK, 0 échec (deux passes) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` P11 15 OK ; audit i18n 100 %. Combats réels sous Chromium (iPhone 390 × 844, Mac 1440 × 900), Crypte et Montagne à deux ennemis : nom sous le deuxième ennemi, pas de chevauchement avec ses pastilles, aucune erreur.
