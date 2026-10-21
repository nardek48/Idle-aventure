# v3.457.9 — « 3 combats avec Wenna » : des combats, pas des kills (audit P23, lot 5)

L'étape « Celle qui demande » (forest_wenna) comptait chaque ennemi tué dès que Wenna était inscrite au groupe, Petites Aventures comprises : une seule rencontre de PA (meute de 3) validait l'étape. Choix de Seb : **option 1.**

## Règle
- Un combat compte une fois, dès qu'un ennemi y tombe, quel que soit le nombre d'ennemis.
- Wenna (ou un compagnon) doit être alliée du combat en cours, pas seulement inscrite au groupe.
- Une Petite Aventure ou un parcours en cours ne compte pas (rencontres réglées sans combat ni compagnon).

## Code
- `story-quest-system.js` (protégé, accord de Seb) : `_countKills` compte un combat par `Initiative.combatKey` ; nouveau `_companionFought()` (allié compagnon dans `CombatActors`, aucun run PA engagé). Repère gardé en mémoire, rien de nouveau dans la sauvegarde.

## Contrôles
- round-harness 4509 OK, 0 échec (deux passes) ; section [257] (vérifiée en échec sur l'ancien code), tests [L-2] et chapitre 2 adaptés.
- Robot (`campagne-harness --combats`) : forest_wenna validée en 3 lots de chasse, 0,4 h.
- Boot, création du héros, parcours P11 OK. Aucun fichier ajouté.
