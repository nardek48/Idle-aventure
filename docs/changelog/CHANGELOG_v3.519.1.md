# v3.519.1 — Petite aventure offerte : plus de boucle gratuite

Décision de Seb (option A), sur le défaut relevé par la revue de la v3.519.0. Il existait depuis v3.429.23 sur les étapes de carte.

## Le défaut
- Une Petite aventure offerte par l'Histoire ne prend pas de place dans la réserve.
- En rentrant au camp (100 % du butin gardé), ou en abandonnant, avant d'avoir libéré le secteur, on pouvait la refaire sans fin pendant l'étape.

## La règle (option A)
- Une sortie offerte qui rentre au camp, ou qu'on abandonne, avant son but prend sa place dans la réserve après coup, comme une sortie ordinaire. Le journal le dit : « Retour avant le but : la sortie offerte prend sa place dans la réserve. »
- Une sortie offerte qui libère le secteur ou atteint la destination reste gratuite.
- Le KO reste gratuit : c'est un vrai échec, avec la moitié du butin seulement (règle RE-5 inchangée).
- La préparation l'annonce : « Expédition offerte — l'Histoire t'y mène : aucune place prise, sauf si tu rentres avant le but ».

## Code
- `systems/pa2-run.js` : `_takeStorySlot`, appelé au retour (`finish("home")`) et à l'abandon en route.
- `ui/pa2-view.js` : texte de la préparation.
- `en.js` : 1 clé renommée, 1 ajoutée.
- Harnais [340] : départ offert, retour au camp, la réserve passe de 99 à 100.
- Aucun fichier protégé, aucun fichier ajouté.

## Contrôles
- Round : 5 288 OK, 0 échec, sur deux passes.
- Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
- i18n : 6 570 textes, 100 %, 0 orphelin.
