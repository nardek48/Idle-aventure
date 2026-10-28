# v3.530.0 — La fenêtre de l'Atelier attend le Village (audit, lot 10 : TUT-12)

Décision de Seb : option C de l'atelier `atelier/fenetres-meute.html`.

## Le constat
La récompense de « La Meute affamée » (60 Bois) valide d'un coup la première étape de la chaîne de l'Atelier, « Récolter 10 Bois », que le joueur n'a jamais vue. Sa fenêtre « Étape terminée » s'ouvrait en même temps que la fin de quête : double voile, puis une étape d'une chaîne inconnue, lue hors du Village.

## Ce qui change en jeu
- Une étape de la chaîne de l'Atelier validée hors du Village ne montre sur le moment que le toast (« ✅ Récolter 10 Bois ») et la ligne du journal, comme avant.
- Sa fenêtre « Étape terminée » s'ouvre à l'arrivée au Village, une fois fermée toute autre fenêtre (aide d'étape, fin de quête, confirmation). Le joueur lit « Prochain objectif : Fabriquer 5 Planches » là où se joue la chaîne.
- Une étape validée au Village, sans autre fenêtre ouverte, s'affiche tout de suite, comme avant.
- L'attente est en mémoire seulement : si le jeu est fermé avant la visite, la fenêtre ne s'affiche pas, et le bandeau du Village donne quand même l'objectif.

## Code
- `ui/workshop-quest-modal.js` : `workshopPendingPopup`, `workshopOtherWindowOpen`, `flushWorkshopPendingPopup`. Une vérification toutes les 0,7 s, active seulement pendant l'attente.
- Harnais [349].
- Aucun nouvel état sauvegardé, aucun fichier protégé ni ajouté.

## Contrôles
- Round : 5 347 OK, 0 échec, sur deux passes.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 6 591 textes, 100 %, 0 orphelin.
- Chromium à 390 px (0 erreur) :
  - validée au Camp pendant la fin de quête : rien ne s'ouvre, ni pendant ni après la fermeture ;
  - au Village : elle attend la fermeture de l'aide d'étape, puis celle de la confirmation, et s'ouvre ensuite, avec le bon prochain objectif ;
  - elle ne revient pas après « Continuer » ;
  - étape suivante validée au Village : tout de suite ;
  - la vérification s'arrête dès qu'il n'y a plus rien en attente.
