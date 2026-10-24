# v3.477.0 — Combat : la Charge du Chevalier

Bilan des donjons, point 3 (l'écart entre les classes), option A de Seb, mesurée au banc avant intégration.

## Diagnostic
- Face à un ennemi au corps à corps, le Rôdeur et le Mage (arc, magie) ont **2 rounds d'approche** dans chaque combat, boss et élites compris : ils frappent sans être frappés. Le Chevalier, au contact, n'en avait aucun.
- Son rôle de tank ne compensait presque rien : +10 % de PV, +1 point de défense.
- À la Cité (profil de l'étape 12) : 36 % de PV perdus contre le Dard des profondeurs (22-24 % pour les autres), Sphinx abordé à 53 % de PV (63-64 %), 190 dégâts par round contre le Sphinx (196 / 222) pour 58 PV perdus par round (50 / 47).

## Ce qui change en jeu
- **La Charge** : face au Chevalier, chaque ennemi reste **sonné 1 round** au début du combat (il ne frappe pas). En groupe, les ennemis arrivent un par un, comme face aux classes à distance.
- Nouvel état « **Sonné** » à l'écran (badge et fiche des états) ; journal : « X est encore sonné par ta charge. », puis « X reprend ses esprits. »
- Le pronostic de combat compte la Charge.
- Rôdeur et Mage : inchangés.

## Mesures (30 runs par classe ; campagne : 4 parties)
| Banc | Chevalier avant | Chevalier avec la Charge | Rôdeur | Mage |
| --- | --- | --- | --- | --- |
| Cité, étape 12 | 47 % | 67 % | 77 % | 93 % |
| Varrek, palier Rare | 80 % | 90 % | 60 % | 67 % |
| Campagne complète (médiane) | 25 h, 44 morts | 22 h, 26 morts | 22 h, 22 morts | 22 h, 62 morts |

Le Chevalier rejoint les autres classes sur la campagne. Une Charge de 2 rounds l'aurait poussé trop loin face à Varrek.

## Code
- `data/enemy-archetypes.js` : `KNIGHT_CHARGE_ROUNDS = 1`.
- **Fichier protégé (accord Seb)** : `systems/combat-engine.js`, `prepareEnemy` (l'ennemi `charged`, même compteur que l'approche) et les deux lignes de journal.
- `systems/combat-forecast-system.js` : le pronostic compte la Charge.
- `data/combat-states.js` : état `stunned` ; `ui/combat-screen-view.js` : badge et fiche.
- `lang/en.js` : 4 textes. Aucun fichier ajouté.

## Image à faire
`images/Icons/combat_status/enemy_stunned.webp` (état « Sonné ») : icône générique en attendant.

## Outils
- `round-harness.js` : section [298] (ennemi sonné 1 round, pas de riposte puis riposte, pronostic, état décrit, Rôdeur sans Charge) ; [2], [9], [12], [16] et [17] passent la Charge (ils testent la riposte et la mort), [46] et [71b] testent la Charge.
- `plafond-bench.js`, `campagne-harness.js` : `ESSAI_CHARGE=N` (déjà livré), pour essayer d'autres durées.
