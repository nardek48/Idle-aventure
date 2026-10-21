# v3.458.0 — Admin : confirmations, « Débloquer tous les onglets » retiré (audit P15, fin du lot 5)

L'écran Admin (lien dans Paramètres dès le niveau 1) faisait avancer la partie sans retour en un toucher. Choix de Seb : option 1, et retrait de « Débloquer tous les onglets ».

## Retiré
- **« Débloquer tous les onglets »** : le bouton Admin et `unlockAllTabsFromSettings` (`settings-view.js`). Il marquait les 4 chapitres de l'Histoire comme passés, sans retour. `StoryQuestManager.skipAll` (fichier protégé) n'a plus d'appelant ; il part au lot 9.

## Confirmation demandée (fenêtre de confirmation du jeu)
- « Valider l'étape en cours » : « L'Histoire avance d'une étape. Sans retour possible. »
- « Avancer jusqu'à cette étape » : « Toutes les étapes d'ici là sont validées. Sans retour possible. »
- « Recruter les compagnons » : « Tous les compagnons rejoignent la partie, avec leur voie par défaut. Sans retour possible. »
- Les autres actions Admin (or, stats, PV, Petites Aventures) restent directes.

## Contrôles
- round-harness 4512 OK, 0 échec (deux passes), section [258] ; boot, création du héros, parcours P11 OK ; i18n 100 %, 0 orphelin (2 textes retirés de `en.js`).
- Chromium 390 px : la fenêtre s'ouvre au premier plan, l'étape ne bouge pas avant « Confirmer ».
- Aucun fichier protégé, aucun fichier ajouté.
