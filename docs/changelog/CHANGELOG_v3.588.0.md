# v3.588.0 — Les polices du grand écran aussi sur téléphone

Décision de Seb du 30/10, après l'atelier `atelier/polices-telephone.html` (version B, « comme le PC »).

## Ce qui change
- Téléphone : mêmes polices que le grand écran.
  - Cinzel : titre de l'étape d'Histoire en cours, titres de section (« Matières brutes »…), nom du héros, titres des fiches (feuilles du bas), nom de l'ennemi en combat.
  - Alegreya italique : récit de l'étape d'Histoire en cours.
- Grand écran : inchangé.
- Aucune place prise ; les deux polices étaient déjà hébergées et précachées.

## Fichiers
`css/10-grand-ecran.css` : les variables `--f-title` et `--f-story`, et les règles de titres et de récit, ne sont plus réservées au format large. Contrôle [369] du harnais adapté à la nouvelle décision (il vérifiait que le téléphone gardait la police du système).

## Contrôles
`round-harness` 5 590 OK, 0 échec (deux passes) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` P11 15 OK. Polices relevées dans le jeu sous Chromium (iPhone 390 × 844 et Mac 1440 × 900) : conformes à la version B de l'atelier, aucune erreur.
