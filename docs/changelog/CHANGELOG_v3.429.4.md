# Aethervale v3.429.4 — Correctif : régénération pendant la préparation d'une petite aventure

Bug relevé en rejouant la première heure de jeu en v3.429.3 dans Chromium. S'applique sur la v3.429.3.

## La préparation d'une petite aventure ne coupe plus la régénération
- Cause : `CampManager._hasActiveRun` coupait la régénération dès qu'une expédition existait (`SceneRunManager.isRunActive`), y compris à l'écran de préparation (besace, pactes), où le héros n'est pas encore parti. Un héros à 1 PV qui laissait cet écran ouvert ne guérissait plus, ni en ligne ni hors ligne. Mesuré : 1 PV après 20 s, puis encore 1 PV après 30 min d'absence.
- Correctif : la régénération lit `SceneRunManager.isHeroEngaged`, qui exclut déjà la préparation (« En préparation v2, rien n'est engagé »). Une fois en route, la régénération reste coupée.
- Mesuré après correctif, 302 PV max : 1 → 8 PV en 30 s sur la préparation, 1 → 152 PV après 30 min hors ligne (plafond 50 %). En route (`pa2-map`), la régénération reste coupée.

## Code
- `js/systems/camp-system.js` : `isRunActive` → `isHeroEngaged` dans `_hasActiveRun`.
- Aucun fichier protégé touché. Aucun fichier ajouté.

## Contrôles
- Round : **3 963 OK**, 0 échec, sur trois passages.
- Boot : 4 OK. Création du héros : 44 OK.
- Vérification dans Chromium (390×844), console sans erreur.
- `node --check` sur tous les fichiers modifiés.
