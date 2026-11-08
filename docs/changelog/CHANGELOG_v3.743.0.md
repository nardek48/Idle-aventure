# v3.743.0 — Forge des mondes

Décisions Seb 07-08/11 (atelier `atelier/forge-mondes.html`, banc `tools/sim/forge-mondes-bench.js`).
Accord explicite pour `stats-system.js` et `story-quests.js` (protégés).

## La reforge renforce le héros, plus la pièce
- `forge-system.js` : `getForgedValue` rend la valeur de loot pure. `FORGE_WORLD_BONUS_PER_REFORGE = 0.005` :
  chaque reforge (tout emplacement) donne +0,5 % de la stat du monde de sa bande (niveau L → bande ⌈L/4⌉), pour toujours.
- Stats : Désert PV max ; Ruines Défense (relative, plafond 60 %) ; Crypte chance de critique (relative) ;
  Montagne dégâts (sur l'ATK finale, arme comprise) ; Tour dégâts critiques. 7 emplacements × 4 = 14 % par monde.
- `stats-system.js` : un seul bloc en fin de `recalcStats`.
- Grille : 2 niveaux de Forge par monde (Désert 2, Ruines 4, Crypte 6, Montagne 8, Tour 10), 20 reforges par emplacement.
  Second niveau de chaque monde à l'acte III (`forgeActStep`). Coûts des Forges 2 à 10 et des reforges par bande
  (Acier + matériau du monde, + celui du monde d'avant aux crans 3-4).
- Écran de la Forge (monde en cours, mondes finis, gain sur chaque bouton, crans), ligne « Forge, pour toujours » dans les stats.
- Fenêtre « La Forge a changé » une fois par appareil (Prefs `forgeMondesSeen`) : perte sur les pièces et gain chiffrés.
- `story-quests.js` : 8 textes recalés sur la nouvelle grille ; paliers Montagne (Forge 8 / reforge 15) et Tour (Forge 10 / reforge 19).

## Boss
- `WORLD_HERO_SCALING.questBossHpByWorld` : boss de quête de la Crypte, de la Montagne et de la Tour +15 % de PV
  (la Silhouette exclue, `noWorldBossHp`) ; boss de donjon Liche, Wyrm, Reflet : endurance +15 %.
- Banc (60 parties, Forge pleine) : Crypte 35/27/24 rounds (100/98/98 %), Dragon 37/33/14 (100/95/100 %).

## Images
- Nouveaux chemins (icône générique d'ici là) : `village_buildings/forge_mondes.webp`, `equipment_slots/pieces_loot.webp` — prompts dans « Images à générer ».
