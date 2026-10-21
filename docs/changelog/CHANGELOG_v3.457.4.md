# Aethervale v3.457.4 — Sauvegarde et mise à jour

Lot 3 de l'audit du 20/10 (constats P3, P4, P5, P6, P8, P9 et O2). Seb a donné son accord le 21/10 pour modifier `save-system.js`.

## Sauvegarde
- **Deux fenêtres ouvertes sur la même partie** (P4) :
  - avant, la seconde écrasait en silence ce que la première avait gagné ;
  - maintenant, la fenêtre ouverte en dernier prend la main. Les autres cessent de sauvegarder et se couvrent d'un voile : « Ta partie est ouverte dans une autre fenêtre », avec un bouton « Recharger ici ».
- **Effacer la partie** (P3) : les hauts faits réclamés, la meilleure vague de donjon et la vitesse de combat sont maintenant remis à zéro. Avant, réclamer de nouveau un haut fait rapportait jusqu'à 650 or au lieu de 150. *(`save-system.js`, avec l'accord de Seb)*
- **Erreur du jeu au chargement** (P6) :
  - avant, une exception dans le code était prise pour une sauvegarde illisible : la partie était mise de côté et sa copie saine écrasée ;
  - maintenant, l'erreur est tracée (`noteErreur`), la partie reste intacte et rien n'est écrit dessus pendant la session. Un message demande de recharger après la prochaine mise à jour. *(`save-system.js`, avec l'accord de Seb)*
- **Rappel Safari** (P5) :
  - le contexte : dans un onglet Safari, si le jeu n'est pas installé, la partie peut être effacée après 7 jours sans visite ;
  - le rappel apparaît au plus une fois par semaine, sur une partie commencée. Il ouvre la feuille d'installation iPhone, avec une ligne qui dit pourquoi et où exporter : Paramètres › Partie.

## Mise à jour
- **Fichiers inchangés** (O2) : le précache revérifie chaque fichier auprès du serveur (`no-cache`, réponse 304) au lieu de le retélécharger à chaque version.
- **Images hors ligne après une mise à jour** (P8) :
  - les images vivent dans un cache à part, `aethervale-images`, qui survit aux versions ;
  - chacune est revérifiée en arrière-plan une fois par démarrage du service worker ;
  - mesure dans Chromium : après une mise à jour, hors ligne, 0 image en échec (17 à 48 avant).
- **Bannière « Nouvelle version disponible »** (P9) :
  - elle attend que le héros ne soit plus en combat ni en expédition ;
  - un bouton « Plus tard » la ferme pour la session ;
  - ses boutons sont plus hauts.

## Contrôles
- **Fichier nouveau** : `js/main/instance-unique.js`, chargé après `boot.js` et précaché dans `sw.js`.
- **Harnais** : section [254]. Résultat : 4 499 OK, 0 échec, sur deux passes.
- **Autres harnais** :
  - démarrage : 4 OK ;
  - création du héros : 44 OK ;
  - parcours P11 : 15 OK.
- **Vérifié dans Chromium** :
  - deux fenêtres : la plus ancienne se verrouille, et le voile passe au-dessus de tout ;
  - mise à jour suivie d'un passage hors ligne : le cache d'images est conservé, aucune image ne casse ;
  - la bannière ne s'affiche pas en combat, apparaît au camp, et « Plus tard » la ferme ;
  - aucune erreur dans la console.
- **Langue** : `en.js` (5 textes). L'audit i18n donne 100 % et 0 orphelin.
