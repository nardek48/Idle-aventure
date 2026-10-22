# v3.459.5 — Lot 9a : ménage du code sans fichier protégé (audit O3, O8, O9, O11)

## Harnais (O9)
- Chaque ✘ porte sa section (`[188]`), et la fin du harnais récapitule les échecs.
- Les 63 numéros de section en double sont suffixés (`[16b]`, `[60c]`…) : les renvois des anciens changelogs restent justes.
- [265] Contrôle « globales fantômes » : tout objet testé par `window.X` ou `typeof X` doit exister une fois le jeu chargé. Liste blanche : API du navigateur, et `QuestManager`, `WorldQuestManager`, `QUEST_CONFIG` jusqu'au lot 9b.

## Globales (O3, partie libre)
- `mission-board-system.js` : la garde des Fondations testait `WorkshopUnlockSystem`, qui n'existe pas ; elle teste `WorkshopUnlockManager`. Sans effet visible (la seconde condition suffisait).

## Doublons (O8, partie libre)
- `story-quests.js` : `storyPalier(game, rareté)` et `storyPalierManques(...)` remplacent les 4 relevés de palier et les 3 listes « ce qui manque » (Désert, Ruines, Ruines Rare, Crypte Rare et Épique). Noms publics gardés. −49 lignes.
- `utils.js` : `reserveRecharge` (horloge de réserve des Petites Aventures et du Labyrinthe) et `splitDamage` (dégâts répartis sur les rounds, Parcours et Labyrinthe).

## Code mort (O11)
- 14 fonctions sans appel retirées (dont `getSecondsUntilFull`, `isStockFull`, `forRun`, `getGroupAttrition`, `itemForTrait`, `isWorkshopQuestPending`), plus `MISSION_STATUS_LABEL` et `HEALING_POTION_COOLDOWN_MS`, et leurs 4 traductions. `getHealCooldownRemainingMs` est gardée.
- CSS : 83 classes mortes retirées (108 règles, ~460 lignes), dont tout l'ancien Résumé `.pc-sum-*`, les portes du Campement `.camp-door*`, les badges `.kbadge*`, et 23 entrées de la liste d'encre `00-kframe-scope.css`. Contrôle [ENCRE] du harnais mis à jour.
- Nouvel outil `tools/audit/css-dead.js` : classes CSS que ni le JS ni `index.html` ne citent ; les noms construits par concaténation (`"cbx-team c" + n`, `"is-" + x`) sont mis à part.

## Signalé
- `images/UI/badges/badge-shield.webp` n'est plus utilisée nulle part (elle servait au badge `.kbadge-shield`, resté à l'atelier).

## Contrôles
- round-harness 4543 OK, 0 échec (deux passes) ; boot, création du héros OK ; parcours complets 139 OK ; i18n 100 %, 0 orphelin.
