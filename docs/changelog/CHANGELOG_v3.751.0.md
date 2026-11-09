# v3.751.0 — Édition Alpha : socle de publication (lot Alpha, point 1)

Décision de Seb le 09/11 : une Alpha Forêt + Désert pour des testeurs, au même dépôt, sur une branche `alpha` figée (option B), à son propre lien (`…/Idle-aventure/alpha/`). Rien ne change pour le joueur du lien principal.

- **Fichier nouveau** `js/core/edition.js` : `GAME_EDITION` (« jeu » au dépôt, toujours), `ALPHA_LAST_CHAPTER = "desert"`, `isAlphaEdition()`. Chargé dans le `<head>` d'`index.html`, avant `prefs-system.js` ; ajouté au précache de `sw.js`.
- `sw.js` : l'Alpha et le jeu partagent l'origine `nardek48.github.io`. Le service worker repère sa portée (`/alpha/`) et préfixe ses caches (`aethervale-alpha-<version>`, `aethervale-alpha-images`). Sans cela, chacun effaçait les caches `quest-idle-*` de l'autre à l'activation. Celui du jeu laisse passer les requêtes sous `/alpha/`. Vérifié dans Chromium : les deux caches cohabitent, chaque page est servie par son propre service worker.
- `.github/workflows/pages.yml` : si la branche `alpha` existe, sa copie passe les harnais puis est publiée sous `/alpha/`, avec « alpha » écrit dans `edition.js` (contrôlé) et le nom « Aethervale Alpha » dans le manifeste. La publication reste déclenchée par `main` ; un correctif poussé sur `alpha` part au push suivant sur `main`, ou à la main (Actions › Publier le jeu › Run workflow). Branche absente : rien sous `/alpha/`.
- `tools/harness/round-harness.js` : [254] suit les nouveaux noms de cache ; section [504] (édition en tête, « jeu » au dépôt, précache, portée du service worker, publication).

Reste à faire avant d'ouvrir la branche `alpha` : blocage après desert_18, écran de fin, journal actif par défaut, bouton « Envoyer », sauvegardes séparées (le `localStorage` est lui aussi partagé entre les deux liens).

Contrôles : round-harness 7 225 OK, 0 échec (×2) ; boot 4 OK (et 4 OK sur une copie en édition alpha) ; création du héros 44 OK.
