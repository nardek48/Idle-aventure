# v3.712.0 — Coque du téléphone : plus de noir autour du cadre, filet lumineux sous l'onglet

Retours de Seb (05/11) sur v3.711.0. Aucun état sauvegardé nouveau, aucun fichier ajouté.

## Livré

- **Bandeau du haut** : fond du `.hud-band` (téléphone) transparent au lieu du brun-noir ; le décor du jeu se voit autour de la plaque, plus de bande noire sur les bords et dans les coins.
- **Sous l'onglet actif** : l'image `lueur.webp` (bords irréguliers) est remplacée par un filet lumineux de 2 px dessiné en CSS (dégradé crème et or, halo) et un losange de 7 px (`.tab-btn.active::after`). Le halo qui monte de la barre est resserré (ellipse 46 %) pour se fondre avant les bords de sa case.
- **Fichier retiré** : `images/UI/coque/lueur.webp` (image, jamais précachée).
- Quoi de neuf : une ligne FR + EN.
- `tools/harness/round-harness.js` [476] : 15 pièces au lieu de 16.

## Contrôles

- `node --check` sur chaque JS modifié.
- `round-harness.js` : 6 625 OK, 0 échec (deux passes) ; `boot-harness.js` 4/0 ; `hero-creation-harness.js` 44/0 ; `parcours-harness.js` 232/0.
- Captures Chromium à 390 et 320 px.
