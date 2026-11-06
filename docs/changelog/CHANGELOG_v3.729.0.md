# v3.729.0 — Grimoire : seulement les situations rencontrées (06/11/2026)

Idée de Seb (06/11), option A : le Grimoire n'affiche plus ses 17 conditions dès le début, seulement celles rencontrées en combat. Accord de Seb pour `save-system.js` (3 lignes).

## Changé
- **Nouvel état** `game.grimoireSeen` (4 points : `buildSaveData`, `restoreBaseState`, `fullResetState`, `createInitialGameState`).
- **Marquage** dans `ClassCombatManager.getGrimoireCombatContext()` (`GrimoireSeen.note`), avec les seuils réels de `evaluateGrimoireCondition` ; seules les conditions pas encore vues sont testées.
- **Message** à la première rencontre : bandeau de 2,2 s et ligne de journal (« 📖 Nouvelle règle au Grimoire : Charge »), une seule fois.
- **Toujours visibles** : « Mes PV sont bas », et toute condition utilisée dans une règle ou un préréglage.
- **Feuille des conditions** : seules les visibles ; groupe vide masqué ; « {n} situations encore inconnues » en bas.
- **Parties existantes** : déduction au premier chargement (ennemis vaincus, mondes atteints, quêtes d'aventure, donjons, compagnons, règles), sans message. Non déduit : le trait aléatoire des boss de monde à partir de la Crypte.
- **Affichage seulement** : choix des règles, évaluation et repli inchangés.
- **Fiche d'aide** corrigée : « Une situation apparaît dans le Grimoire la première fois que tu la rencontres en combat. Les emplacements de règles s'ouvrent en atteignant de nouveaux mondes. »

## Outil
- `tools/sim/charge-bench.js` : banc des profils de Charge (Référence, C1, C2, C3, ×1,70) sur le vrai moteur, enveloppes dans le vm, aucun fichier du jeu modifié. Référence = moteur nu sur 540 parties sur 540.

## Contrôles
round-harness 6 928 OK, 0 échec (2 passes), dont la section [490] (23 contrôles) ; boot ; création du héros ; i18n 0 manquant, 0 orphelin ; parcours 235 OK.
