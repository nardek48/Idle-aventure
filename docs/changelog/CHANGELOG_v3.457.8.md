# v3.457.8 — Maîtrise d'arme retirée (audit P7, lot 5)

La maîtrise d'arme (+0,05 % de dégâts par ennemi tué avec l'arme de sa classe, jusqu'à +25 %) ne progressait plus depuis v3.116.0 : ses compteurs n'étaient incrémentés que par `QuestManager`, qui n'existe plus. Une nouvelle partie restait à 0 ; une ancienne sauvegarde gardait un bonus figé et invisible. Choix de Seb : **retirer le bonus.**

## Code
- `stats-system.js` (protégé, accord de Seb) : le calcul de la maîtrise est supprimé de `recalcStats`.
- Les appels morts à `QuestManager.track` (`combat-engine.js`, `pa2-run.js`) et les compteurs de `questProgress` restent en place jusqu'au lot 9 (ménage du code).

## Effet en jeu
- Nouvelles parties et bancs : aucun changement (le bonus valait déjà 0).
- Anciennes sauvegardes d'avant v3.116.0 : elles perdent leur bonus figé, au plus 25 % de dégâts.

## Contrôles
- round-harness 4505 OK, 0 échec (deux passes), section [256] (vérifiée en échec sur l'ancien code) ; boot, création du héros, parcours P11 OK.
- Aucun fichier ajouté.
