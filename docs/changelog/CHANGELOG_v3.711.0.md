# v3.711.0 — Coque du téléphone : pièces détourées par Adobe

Suite de v3.710.0, demande de Seb (05/11, essai sur deux pièces validé). Aucun état sauvegardé nouveau, aucun fichier ajouté (mêmes 16 noms dans `images/UI/coque/`).

## Livré

- **Détourage Adobe (Photoshop, « retirer l'arrière-plan »)** sur les découpes d'origine des planches de Seb (damier compris), à la place du retrait du damier par couleur : bords nets, plus de liseré clair ni de points roses (cœur, anneau). 14 pièces remplacées : plaque, anneau, ecusson, capsule-or, plus, jauge, jauge-pv, jauge-xp, barre, onglet-camp, onglet-quetes, onglet-carte, onglet-village, onglet-heros.
  - Contrôle au pixel contre les pièces précédentes (alpha > 128) : cadres identiques à 0,3–2,2 % près (bords seulement), intérieurs creux (anneau, jauge) bien gardés vides.
  - **Gardée** : `lueur.webp` (le détourage retirait le halo doux et ne gardait que le trait).
  - **Onglet Menu** : non reconnu par l'outil (« aucun sujet »), détouré ici par couleur (barres dorées sur ardoise : chaleur rouge − bleu et luminosité).
- **Icônes de la barre du bas** : fond transparent, recadrées sur leur contenu ; le CSS quitte le masque radial et passe en `object-fit: contain` 36 × 30 px avec une ombre portée (`css/02-layout.css`).
- Quoi de neuf : une ligne FR + EN.
- Réseau de la session : environnement personnel « Aethervale » (at.adobe.com, acp-aep-cs-blobstore-prod-irl1-data.adobe.io, photoshop-api.adobe.io) pour envoyer les pièces à Adobe et récupérer les résultats.

## Contrôles

- `node --check` sur chaque JS modifié.
- `round-harness.js` : 6 625 OK, 0 échec (deux passes) ; `boot-harness.js` 4/0 ; `hero-creation-harness.js` 44/0 ; `parcours-harness.js` 232/0.
- Captures Chromium à 390 et 320 px : bandeau et barre nets, aucune régression de placement.
