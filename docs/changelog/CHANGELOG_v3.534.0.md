# v3.534.0 — Bilan de fin de l'Histoire (audit, lot 10 : PLA-9)

Décision de Seb : option A de l'atelier `atelier/fin-histoire.html`. Le constat : après « Le droit de prendre » (montagne_20), rien ne disait que l'Histoire s'arrête là pour l'instant, et il n'y avait aucun bilan.

## Ce qui change en jeu
- « Continuer » sur la dernière fenêtre de montagne_20 ouvre **« Fin du chapitre 5 »**, de la même famille que les fins de quête. On y trouve :
  - « La Tour sera le prochain chapitre. Elle n'est pas encore ouverte. » ;
  - le bilan : temps de jeu, étapes d'Histoire, ennemis vaincus, hauts faits ;
  - « Tes choix » : les 12 choix pesants, rangés par chapitre, avec les mots du jeu (titre du choix, option prise).
- Ensuite, une carte « Fin de l'Histoire, pour l'instant » reste en tête de Quêtes › Histoire, avec « Revoir le bilan ». Un joueur qui avait fini l'Histoire avant cette version y trouve aussi son bilan.
- Bible narrative respectée : ni axe (Donner, Garder, Soi, Aeswyn), ni score, ni jugement.
- 12 choix, pas 15 comme le disait l'audit : les 3 choix de compagnons (« On y passe à trois », « Deux sur quatre », « Deux sur cinq ») ne sont pas enregistrés.

## Code
- `ui/quests-view.js` : `storyAllDone`, `storyEndChoices`, `buildStoryEndHTML`, `openStoryEndPopup`, `buildStoryEndCardHTML`, `storyEndChain`.
- `css/04-panel-quests.css` : classes `.story-end-*`.
- `en.js` : 8 textes.
- Harnais [353].
- La fenêtre s'ouvre une seule fois, parce que la dernière étape ne se réclame qu'une fois : aucun état sauvegardé. Aucun fichier protégé ni ajouté.

## Contrôles
- Round : 5 362 OK, 0 échec, sur deux passes.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 6 599 textes, 100 %, 0 orphelin.
- Chromium à 320 et 390 px et en tablette ou PC (1180 px), sur la sauvegarde de fin d'Histoire du robot :
  - la réclamation de montagne_20, puis « Continuer », ouvre le bilan (4 lignes et 12 choix) ;
  - « Continuer » le ferme ;
  - la carte est en tête de Quêtes › Histoire, et « Revoir le bilan » rouvre la fenêtre ;
  - le bouton reste visible dans l'écran, sans défilement ;
  - en anglais, tout est traduit ;
  - 0 erreur.
