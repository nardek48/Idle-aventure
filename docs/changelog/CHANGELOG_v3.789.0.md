# v3.789.0 — Tutoriels sur l'écran, lot 2 (13/11/2026)

Chantier des tutoriels sur l'écran (Seb 13/11, option A), lot 2. Neuf tutoriels passent de la fenêtre aux bulles posées sur les vrais éléments de l'écran. Aucun fichier protégé modifié, aucun changement de sauvegarde, aucun fichier ajouté.

## Ce qui change
- **Désert** (`js/ui/coach-view.js`) :
  - desert_02, le silence, en combat : traits de l'ennemi, Défense (en Tactique), règle du Grimoire (en Grimoire), ce qui n'est jamais réduit au silence, potions ;
  - desert_03, l'outre : le Réservoir, sa recette, l'Entrepôt ;
  - desert_10, la nuée, en combat : la cible, la nuée, le compteur, la règle « Ils sont plusieurs » (en Grimoire) ;
  - desert_13, la Forge : les pièces, le niveau de reforge, les pièces vertes.
- **Génériques** :
  - pronostic : le pronostic s'ouvre d'abord, les bulles se posent sur lui (`combat-forecast-view.js` ; repli : la fiche, comme avant) ;
  - équipement : emplacements, pièce portée, Sac ;
  - nuit des Petites Aventures : la nuit, son avantage, son prix, l'objet de la nuit ;
  - pièges : le piège, les choix sur un piège, le sentier coupé ;
  - Terrain d'entraînement : la carte du Terrain, un chantier à la fois, l'entraînement dans Héros.
- **Bulles** : option `noHit` pour un élément de décor qui ne capte pas le toucher (losanges des pièges).
- **Outil** `tools/audit/coach-captures.js` : pour une étape de combat, il part vraiment au combat (« Partir » puis les boutons de départ) ; déclencheurs de la nuit et des pièges des Petites Aventures ; PV bas pour que le pronostic s'ouvre ; le Terrain se montre par l'onglet Village.
- **Traductions** : 54 textes nouveaux. **CLAUDE.md** : 23 tutoriels sur l'écran.

## Contrôles
- `round-harness` 7080 OK, 0 échec, sur 2 passes ([469] pronostic ouvert d'abord, [513] 23 tutoriels).
- boot 4 OK ; création du héros 46 OK ; i18n 100 %, 0 orphelin.
- Captures iPhone des 9 tutoriels (sauvegardes du robot, Désert) : toutes sur l'écran, 3 ou 4 bulles chacune ; planches dans `captures/lot2-planches/`.
- Quoi de neuf : une ligne (FR + EN).
