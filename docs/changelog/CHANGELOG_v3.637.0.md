# v3.637.0 — La silhouette : le vrai round intouchable

Demande de Seb (03/11). Il remplace le bouclier provisoire posé en v3.630.0.

## Le round intouchable (TW6)
- À 30 % de ses PV, l'annonce arrive dans le journal (« La lumière va passer à travers elle… ») et un badge « La lumière monte » s'affiche.
- À son tour suivant, la lumière passe à travers elle : badge « Rien ne la touche ! ». Aucun coup ne porte jusqu'à son tour d'après, soit un round du héros sans effet.
- Elle continue d'attaquer pendant ce round : c'est le moment de se défendre ou de se soigner.
- Le tutoriel de l'étape 18 est mis à jour.

## Sans fichier protégé
`combat-engine.js` n'est pas touché. Le moteur interroge déjà `VeinSystem.blocksHit` avant chaque coup (c'est ainsi que le Wyrm plonge sous la lave) et `VeinSystem.onEnemyTurn` au tour de l'ennemi. Ces deux accroches appellent maintenant `TowerSystem.blocksHit` et `TowerSystem.onEnemyTurn`.

## Mesure (banc, héros de fin de Tour avec Terrain 21)
- Réglage inchangé (×4,25 / ×1,1) : 100 % de réussite pour les trois classes. PV restants : Chevalier 81 %, Rôdeur 91 %, Mage 94 %.
- La falaise reste à ×5 / ×1,3 (Chevalier 0 %). Le détail montre qu'elle ne vient pas du round intouchable mais d'une course à l'usure : le héros inflige à peu près la même quantité de dégâts avant de s'épuiser (vers le 41e round) ; si les PV du boss la dépassent, il perd, sinon il gagne avec de la marge grâce aux potions.
- Le robot Chevalier enchaîne aussi sa technique 1, que le contre de la rage déclenche à chaque round : le miroir le pénalise en permanence. Un joueur qui varie s'en sort mieux.

## Code
- `systems/tower-system.js` : `onEnemyTurn`, `blocksHit`, phase `through`.
- `systems/vein-system.js` : appels aux deux accroches.
- `data/combat-states.js` : états `throughIn` et `through`.
- `ui/combat-screen-view.js` : badges.
- `data/story-quests.js` : tutoriel.
- `lang/en.js` : 13 textes.
- Icône `images/Icons/combat_status/through.webp` ajoutée à « Images à générer » ; icône générique en attendant.
- Aucun fichier protégé touché, aucun fichier ajouté.

## Outils
- `round-harness.js` : [425] (annonce, round intouchable, retour).
