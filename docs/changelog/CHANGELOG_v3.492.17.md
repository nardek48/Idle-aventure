# v3.492.17 — Combat : plus de toast quand le journal le dit déjà

Retour de Seb (capture du Dard des profondeurs) : le toast « 😤 Rage apaisée ! » recouvrait la barre de règle, alors que le journal dit déjà la même chose. Suite de v3.470.1 (télégraphes) : option A validée, groupe 1 retiré partout.

## Ce qui change en jeu
- Plus de toast pour 12 événements de combat, dans tous les combats (donjons, quêtes, chasses, cartes) :
  - effets de classe : Contré, Rage apaisée, Corruption purgée, Vol de vie bloqué, Blindage fissuré ;
  - ennemi : Silencié, +n PV boss, « X se relève », « Le boss du donjon apparaît » ;
  - héros : Second souffle, Le seuil, Fiole noire.
- La ligne du journal et la barre d'état de l'ennemi restent.
- Gardés : butin (objet, or), « Terrassé ! », et les réponses à un geste du joueur (potions, attaque interrompue).

## Code
- **Fichiers protégés (accord Seb)** : `systems/combat-engine.js` (3 appels retirés), `systems/dungeon-system.js` (1 appel retiré). Seul l'appel à `showToast` disparaît, la ligne de journal reste.
- `systems/class-combat-system.js` (5), `systems/rise-system.js` (2), `systems/combat-item-system.js` (1) : idem.
- `lang/en.js` : 11 textes orphelins retirés (« {x} se relève ! » reste, le journal l'utilise).
- Aucun fichier ajouté.

## Outils
- `round-harness.js` : section [321] (silence, soin du boss et 4 effets de classe appliqués sans toast ; les 12 textes ne passent plus par `showToast`).
