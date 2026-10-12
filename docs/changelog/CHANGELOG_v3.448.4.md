# Aethervale v3.448.4 — Le dictionnaire anglais n'est chargé qu'en anglais

Suite de l'audit du 11/10 (poids du démarrage). Validé par Seb. S'applique sur la v3.448.3.

## Ce qui change
- `js/lang/en.js` (424 Ko, 13 % du JS) n'est plus chargé quand le jeu est en français.
- `index.html` : juste après `i18n.js`, un court script l'insère seulement si `I18n.lang()` vaut « en ». L'insertion est synchrone : l'ordre de chargement ne change pas.
- Changer de langue relance déjà le jeu (`I18n.setLang`) : la bascule vers l'anglais charge le dictionnaire au redémarrage.
- `en.js` reste précaché par le service worker (après le chargement de la page) : passer en anglais hors-ligne marche toujours.

## Mesure (Chromium, 390 × 844, 4G simulée, CPU ×4, appareil en français)
- Octets transférés : 5,0 → 4,56 Mo ; 246 → 245 requêtes ; fin du chargement 8,0 → 7,9 s.
- Le gain en temps est faible : le reste tient au nombre de requêtes (178 scripts), moins coûteux sur GitHub Pages (HTTP/2) qu'au banc local.

## Contrôles
- Chromium : appareil fr → `en.js` jamais demandé, interface en français ; bascule fr → en → `en.js` chargé, interface en anglais ; appareil en → anglais dès le départ ; `en.js` présent dans le cache. Aucune erreur de page.
- `tools/harness/round-harness.js` : section [228] (4 contrôles). Les outils (`index-scripts.js`) lisent toujours `en.js` à sa place.
- Round : **4 232 OK**, 0 échec, sur trois passes. Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK. i18n : 4 652 textes, 100 %, 0 orphelin.
- Aucun fichier ajouté, aucun fichier protégé touché.
