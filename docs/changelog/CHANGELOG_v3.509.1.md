# v3.509.1 — Jalons : préparation et caravane déjà faites reconnues

Décision de Seb du 27/10 (option A).

## Ce qui change en jeu
- Le jalon « Apothicaire : une préparation » (Désert) est validé si la partie a déjà fait une préparation comptée dans le plafond du jour (toutes sauf la Potion de soin mineure).
- Le jalon « Une caravane rentrée » (Ruines) est validé si une caravane est déjà revenue du Marché des Ruines ou de la Crypte (étape ruines_04 de l'Histoire).

## Code
- `systems/village-quest-system.js` : `MilestoneManager.legacyCount`, lu par la mesure des compteurs. Aucun nouvel état persistant.
- Harnais [331] : 2 contrôles. Aucun fichier ajouté, aucun fichier protégé.
