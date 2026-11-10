# v3.761.0 — Tutoriels sur l'écran (atelier `atelier/tutoriels-ecran.html`, Seb 10/11 : option B, bulle A, « Suivant » ou toucher)

Décision de Seb : les tutoriels du début montrent le vrai écran. L'écran s'assombrit, l'élément réel est éclairé (halo doré), une bulle parchemin explique, « 2 / 6 », « Suivant » ou un toucher sur l'élément pour avancer, « Passer » pour arrêter. CLAUDE.md : la règle « tutoriel d'onboarding, ne pas retravailler » est mise à jour.

- **Fichier nouveau** `js/ui/coach-view.js` (ajouté à `index.html` après `tutorial-view.js` et au précache de `sw.js`) :
  - `COACH_TUTORIALS` : 7 tutoriels, textes d'origine raccourcis. Campement (`camp_welcome`, 4 étapes), premier combat (`forest_02`, 6), Village et production (`village_production`, 5, ouvre l'onglet Production), carte vivante (`forest_brume`, 4), préparation de Petite Aventure (`pa2_prep`, 3 ou 4), Grimoire (`forest_12`, 3), Talents (`forest_11`, 4).
  - `CoachTutorial` : mesure après la pose de l'écran (450 ms, derrière un voile d'attente qui bloque déjà le jeu), remesure toutes les 300 ms (2,1 s au plus) si un élément manque ou est couvert (prologue qui s'efface, autre fenêtre : test `elementFromPoint` sur trois hauteurs). Une étape dont l'élément n'est pas visible est sautée ; moins de deux étapes, ou format large : la fenêtre classique s'ouvre à la place. Le premier élément à l'écran est choisi (carte plus large que le téléphone). Fin : même clôture que la fenêtre (tutoriel noté vu, sauvegarde).
  - Accessibilité : `.coach` est une fenêtre de `kDialog` (rôle, focus gardé dedans, fond inerte) ; focus sur « Suivant » ; pas de pulsation si l'appareil demande moins d'animations.
  - `COACH_OFF` : interrupteur d'outillage (fenêtre classique), faux par défaut.
- `js/ui/tutorial-view.js` : `renderTutorialInto` remplace les trois rendus de fenêtre (étape d'Histoire, tutoriel générique, ouverture unique).
- `js/ui/modal.js` : `kDialog` prend en charge `.coach`.
- `css/05-overlays.css` : éclairage (ombre géante), bulle, voile d'attente.
- Quoi de neuf : une ligne (FR + EN). `js/lang/en.js` : 59 textes (« Passer » et « Renoncer » du tutoriel en contexte `tuto`) ; fil rouge de v3.760.0 en « Next step », comme le glossaire.
- Outils : `tools/harness/round-harness.js` section [513], [468] (TUTO-11 et kDialog) mis à jour ; `tools/harness/parcours-harness.js` : tutoriels sur l'écran coupés sauf au vrai premier lancement (P1), qui vérifie l'accueil (fenêtre, focus, fond inerte, toucher pour avancer) et le combat (6 étapes, combat en pause, noté vu) ; « Passer » au lieu de « Compris ».

Vu dans Chromium à 390 px sur une vraie partie : les 7 tutoriels s'ouvrent sur l'écran, éléments éclairés au bon endroit, aucune erreur.

Contrôles : round-harness 7 302 OK, 0 échec (×2) ; boot 4 OK ; création du héros 44 OK ; i18n 9 031 textes, 100 %, 0 orphelin ; parcours 239 OK (×3).
