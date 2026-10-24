# v3.470.1 — Combat : plus de toast sur les télégraphes ennemis

Retour de Seb (capture en donjon) : le toast « ⚠️ Charge au prochain tour ! » recouvrait les cartes des compagnons, alors que le bandeau au-dessus de l'ennemi (« Il charge ! ») dit déjà la même chose. Option A validée : retiré partout.

## Ce qui change en jeu
- Plus de toast pour les cinq télégraphes : Charge, Silence, Bouclier, Soin, Exaltation. Dans tous les combats (donjons, quêtes, chasses, cartes).
- Le bandeau au-dessus de l'ennemi et la ligne du journal restent.

## Code
- **Fichier protégé (accord Seb)** : `systems/combat-engine.js`, `telegraphPattern` n'appelle plus `showToast` (et les 5 textes de toast sont retirés).
- `lang/en.js` : 5 textes orphelins retirés.
- Aucun fichier ajouté.

## Outils
- `round-harness.js` : section [290] (les cinq télégraphes se posent sans toast).
