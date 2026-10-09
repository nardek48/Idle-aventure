# Aethervale v3.436.1 — Or : fin de la Bénédiction exponentielle, rapport de donjon complet

Bug signalé par Seb : 43,7k d'or affichés pendant la Cité engloutie, +2 177 dans le rapport de fin, et une bourse à 834k au niveau 20.

## Ce qui change
- **Bénédiction** (événement aléatoire après un kill, 8 % × 1/3) : rapporte **5 × l'or du kill** au lieu de **5 % de toute la bourse**.
  - L'ancien calcul faisait croître l'or de façon exponentielle : plus le joueur en avait, plus il en gagnait.
  - Avec 1 M en bourse, le même kill de vague donnait 50 000 ; il donne désormais 535 (fin de la Cité).
- **Rapport de fin de donjon** : affiche tout l'or reçu.
  - « Butin des vagues » : l'or ramassé pendant le run, déjà versé au retour mais absent du rapport ;
  - « Prime de fin » : l'ancienne ligne « Or » ;
  - « Total or » : vagues + campement + prime.

## Code
- `systems/combat-engine.js` (protégé, accord de Seb) : `triggerRandomEvent(killGold)`, Bénédiction indexée sur l'or du kill.
- `systems/dungeon-system.js` (protégé, accord de Seb) : `wavesGold` transmis au rapport, lu dans `game.lastSortieSummary`.
- `ui/dungeon-view.js` : lignes Butin des vagues, Prime de fin, Total or.
- `lang/en.js` : trois libellés.
- Aucun fichier ajouté. La bourse existante n'est pas corrigée.

## Contrôles
- Banc (Cité, 3 Marques) : vagues 2 612 + prime 1 951 = 4 563 versés, et le rapport affiche les deux.
- Round : 4 113 OK, 0 échec, sur deux passes. Boot : 4 OK. Création du héros : 44 OK. i18n : 100 %.
