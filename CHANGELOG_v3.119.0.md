# Aethervale v3.119.0 — Sentier Obstrué / Terre en Friche masqués tant que la petite ration n'est pas fabricable

Retour de test sur la v3.118.0. Harnais : **593 OK / 0 échec**, stable sur 5 runs.

---

## Retour Seb

Le Sentier Obstrué et la Terre en Friche exigent chacune 1 petite ration pour être lancées — mais la petite ration ne se fabrique qu'à la Cuisine de camp (bâtiment Chasse), débloqué plus tard. Résultat : ces deux cartes traînaient au tableau de missions dès le début du jeu, sans que le joueur puisse jamais les lancer.

## Diagnostic

- **Sentier Obstrué** (`blockedPath`) : `requirements.minPetiteRation: 1` pour le lancement, mais aucun `boardRequires` pour l'affichage — visible dès le boot.
- **Terre en Friche** (`fallowField`) : même exigence de ration, mais son `boardRequires` ne portait que sur `wellUnlocked` (Puits) — elle pouvait réapparaître une fois le Puits débloqué, alors que la ration restait souvent encore infabricable (bâtiment Chasse indépendant du Puits).
- Le flag qui conditionne réellement la fabrication de la petite ration est `game.explorationProgression.huntBuildingUnlocked` (posé quand le bâtiment Chasse est débloqué, via la quête d'aventure « La Meute Affamée », `forest_06` — Acte II, ouverture du village). C'est aussi exactement le moment où l'étape Histoire liée au Sentier Obstrué (`forest_08`) devient accessible — le nouveau gating est donc aligné sur le déroulé narratif prévu.

## Correctifs

### `js/data/exploration-quests.js`
- **Sentier Obstrué** : `boardRequires: { progressFlag: "huntBuildingUnlocked" }` ajouté.
- **Terre en Friche** : `boardRequires` étendu à `{ progressFlags: ["wellUnlocked", "huntBuildingUnlocked"] }` (les deux conditions désormais cumulées, au lieu du seul Puits).

### `js/systems/mission-board-system.js`
- `_isExplorationQuestBoardVisible()` accepte maintenant `boardRequires.progressFlags` (tableau, pluriel) en plus du `progressFlag` (singulier) existant — toutes les conditions du tableau doivent être vraies.

## Harnais (`round-harness.js`)

- Bloc [71] (gating d'affichage au tableau) enrichi : couverture explicite du nouveau gating du Sentier Obstrué (absent puis visible selon `huntBuildingUnlocked`) et de la combinaison `progressFlags` sur la Terre en Friche (masquée avec Puits+Carrière seuls, visible une fois la Chasse ajoutée).
- **593 assertions OK / 0 échec, stable sur 5 runs.**

## Divers

- `sw.js` : `CACHE_VERSION` → **3.119.0**.

## Fichiers du ZIP delta

`sw.js`, `round-harness.js`, `CHANGELOG_v3.119.0.md`,
`js/data/exploration-quests.js`, `js/systems/mission-board-system.js`.
