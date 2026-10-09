# Aethervale v3.429.19 — Camp : le bloc « Les braises » passe sous les Missions

Point relevé en jouant la troisième heure (option A, validée par Seb). S'applique sur la v3.429.18.

## Le constat, mesuré dans Chromium (390×844, étape `forest_15`)
- Le bloc « Les braises » s'affichait au-dessus des onglets du Camp. Il mesure 542 px, dont 203 px de dialogue des anciens.
- Le bouton Partir de l'Histoire descendait alors de y=520 à y=1076, sous la barre de navigation (qui commence à y=752). Le joueur devait défiler pour lancer l'étape qui précède l'offrande, le combat de l'Orc.

## Le correctif
- Le bloc garde tout son contenu, mais il est posé sous les onglets (Missions, Départ, Grimoire), quel que soit l'onglet ouvert.
- Mesuré après : avec le bloc affiché, Partir reste à y=520.

## Code
- `js/ui/camp-view.js` : le bloc est rendu dans une variable, puis posé après l'onglet courant.
- Aucun fichier protégé touché. Aucun fichier ajouté.

## Contrôles
- Round : **3 963 OK**, 0 échec, sur trois passages. Boot : 4 OK. Création du héros : 44 OK.
- `node --check` sur les fichiers modifiés.
