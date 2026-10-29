# v3.547.0 — Derniers restes de l'audit : caravane des marchés (QUE-10), images disparues (IMA-10), guides périmés (TUT-14)

Points hors feuille de route, faits à la demande de Seb.

## Ce qui change en jeu
- **ruines_04 et crypte_04 (QUE-10)** : la progression de l'étape dit où en est la caravane du marché :
  - « Caravane en route, de retour dans 2h 10m » ;
  - « Caravane rentrée : décharge-la dans Campement › Expéditions » ;
  - quand toutes les caravanes roulent ailleurs : « Toutes les caravanes sont parties : la prochaine rentre dans 1h 0m ». Si celle qui est rentrée n'est pas encore déchargée, le texte dit de la décharger pour libérer une place.
  - Sinon, rien ne change (« Caravane du Marché de la Crypte 0/1 »).
- **Images disparues (IMA-10)** : le cache d'images du téléphone se nettoie.
  - Une image que le serveur ne connaît plus (404) en est retirée quand le jeu la redemande.
  - Au plus une fois par semaine, à l'activation d'une nouvelle version, le service worker revérifie les images du cache par des requêtes HEAD légères, 4 à la fois. Il retire les 404 et garde tout le reste, y compris quand le réseau est en panne.
  - Cette vérification se fait en arrière-plan et ne retarde pas la mise à jour.

## Documentation (TUT-14)
- `tutoriel/tutorial.md` et `tutoriel/Aethervale Mini Tutoriel.md` (dépôt de documentation) portent en tête la mention « PÉRIMÉ (rédigé en v3.60) ». Ils sont gardés pour l'historique.

## Code
- `data/story-quests.js` : `storyMarketCaravanProgress`, utilisée par ruines_04 et crypte_04.
- `sw.js` : `purgeMissingImages`, plus la suppression d'une image en 404 lors de sa revérification.
- `en.js` : 4 textes.
- Harnais [363] (caravane) et [364] (purge, service worker simulé). Le harnais round attend désormais ses contrôles asynchrones avant d'afficher le bilan.
- Aucun fichier protégé, aucun état sauvegardé, aucun fichier ajouté.

## Contrôles
- Round : 5 400 OK, 0 échec, sur deux passes.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 100 %, 0 orphelin.
- Chromium, avec un vrai service worker : une image fantôme placée dans le cache est retirée à la réactivation suivante, et la date de purge est notée. 0 erreur.
