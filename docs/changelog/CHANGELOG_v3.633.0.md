# v3.633.0 — Talents : la voie « Varier » (Tour)

Option B de Seb (03/11), validée d'un bloc. À la Tour, le plafond des talents restait à 23 alors que le héros finit le chapitre au niveau 28 à 30 : 4 à 6 points dormaient en réserve.

## La voie « Varier »
Commune aux trois classes, ouverte quand la Tour est atteinte. Même modèle que le Commandement : 5 nœuds appris dans l'ordre, la clé au bout. Les effets jouent **partout**, pas seulement à la Tour.

| # | Nœud | Effet |
| --- | --- | --- |
| 1 | Un pas de côté | Une technique différente de la précédente : +8 % de dégâts |
| 2 | Seul s'il le faut | Aucun compagnon debout : +8 % de dégâts |
| 3 | Reprendre son souffle | Chaque combat gagné rend 3 % des PV max |
| 4 | Ce qui ne se forge pas | +2 % de dégâts par pièce Légendaire portée (+14 % à 7) |
| 5 · clé | Varier | Tes trois techniques utilisées dans un combat : +15 % de dégâts jusqu'à la fin du combat |

## Plafond des talents à la Tour
23 (acte I) → 25 (acte II, `tour_06`) → 27 (acte III, `tour_11`) → **28** (acte IV, `tour_16`).
- La proposition disait 29. Or l'arbre de classe n'offre que 18 rangs utilisables (ses clés sont exclusives). 18 + 5 (Commandement) + 5 (Varier) = 28 : tout l'arbre, sans point inutilisable.

## Écran
- Héros › Talents : troisième onglet « Varier » à côté de « ta classe » et « Commandement », la même colonne de 5 nœuds.
- Mesuré dans Chromium à 320 px : les trois onglets tiennent sans débordement.
- 5 icônes et l'emblème `emb_varier.webp` ajoutés à « Images à générer ». Icône générique en attendant.

## Banc (reprise de la Tour au robot `--joueur`, trois classes : 28 contrôles, 0 échec)
- Premier relevé, avec « Seul s'il le faut » à +12 % et « Varier » à +20 % : la silhouette laissait 50 / 67 / 97 % des PV (Chevalier / Rôdeur / Mage), contre 18 / 45 / 57 % sans la voie (v3.632.0).
- Un ajustement (+8 % et +15 %), puis : 58 / 96 / 82 %. Les écarts d'une course à l'autre sont grands.
- La Tour était déjà courte et facile (constat v3.632.0). La voie la rend plus facile encore. **Proposé** : un lot d'équilibrage de la Tour à part.

## Code
- `data/talent-trees.js` : `TALENT_TOWER`, valeurs.
- `data/world-caps.js` : plafonds de la Tour.
- `systems/talent-system.js` : voie dans les nœuds, `towerOpen`, `towerSpent`, ordre d'apprentissage, techniques remises à zéro à chaque combat.
- `systems/tower-system.js` : `talentDmgMult`, `skillMult`, `noteTechnique`, Reprendre son souffle.
- `systems/class-combat-system.js` : bonus d'Un pas de côté, technique notée.
- `ui/heros-screens-view.js` : troisième onglet, colonne générique.
- `lang/data-fields.js`, `lang/en.js` : 18 textes.
- Aucun fichier protégé touché, aucun fichier ajouté.

## Outils
- `round-harness.js` : [428] ; [324] compte l'arbre de classe hors voies communes.
