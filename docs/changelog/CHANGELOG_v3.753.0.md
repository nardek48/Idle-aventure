# v3.753.0 — Édition Alpha : journal, fin de l'Alpha et avis (lot Alpha, points 3 à 5)

Décisions de Seb le 09/11 (atelier `atelier/alpha-fenetres.html`) : ton B, rien à envoyer quand le journal est coupé, questionnaire en option A (l'avis d'abord, puis l'envoi), canal d'envoi au choix du joueur. Rien ne change pour le joueur du lien principal.

- **Fichier nouveau** `js/ui/alpha-view.js` (ajouté à `index.html` après `news-view.js` et au précache de `sw.js`) :
  - **Premier lancement** : « Avant de partir », une fois par appareil (Prefs `alphaIntroSeen`), quand le héros est libre (`newsCanShow`). « D'accord » garde le journal, « Ne pas enregistrer » le coupe.
  - **Fin de l'Alpha** (desert_18 terminé, `AlphaEdition.isFinished`), une fois par appareil (Prefs `alphaFinSeen`) : « La route du nord attendra », puis « Donner mon avis · 1 min » ou « Passer », puis « Le carnet est prêt » avec « Envoyer mon journal » et « Continuer à jouer ». Journal coupé : rien à envoyer, seulement « Continuer à jouer ».
  - **Avis** : 6 notes de 1 à 10, la difficulté en 3 choix, un texte libre (500 caractères), tout facultatif. « Valider » écrit une ligne « avis » dans le journal ; « Passer » n'écrit rien.
  - **Admin** : l'onglet reste vide en Alpha (et son lien est retiré des Paramètres), pour que les testeurs ne sautent pas d'étapes.
- `js/systems/prefs-system.js` : `journalTest` actif par défaut en Alpha, coupé au jeu comme avant.
- `js/main/journal-test.js` : `shareFile()` ouvre le menu de partage du téléphone avec le fichier joint (le joueur choisit le canal) ; annulé, rien ne se passe ; sans menu de partage, le fichier se télécharge. En Alpha, l'export ne contient pas le nom du héros et s'appelle `aethervale-alpha-journal-AAAA-MM-JJ.json` ; champ `edition` ajouté.
- `js/ui/settings-view.js` : en Alpha, « Envoyer mon journal » dans la carte du journal, carte « Version Alpha » (rouvre la fin) une fois le Désert fini, « Version … Alpha » dans la ligne de version, pas de lien vers l'Admin.
- `css/00-components.css` : styles des fenêtres de l'Alpha (`.alpha-*`). Les rangées de deux boutons suivent la grille du kit.
- `js/lang/en.js` : 50 textes traduits (« Passer » de l'avis : contexte `avis`, « Skip »).
- `tools/harness/round-harness.js` : section [506].

Vu dans Chromium à 390 px (copie en édition Alpha) : les quatre fenêtres, journal actif par défaut, questionnaire qui défile dans la fenêtre, aucune erreur. Le menu de partage reste à essayer sur iPhone.

Contrôles : round-harness 7 256 OK, 0 échec (×3) ; boot 4 OK ; création du héros 44 OK ; i18n 8 944 textes, 100 %, 0 orphelin ; parcours 235 OK.
