# v3.471.0 — Donjons : des vagues de groupe

Point 1 du bilan des donjons (13 combats à un seul ennemi, tous joués pareil) : option A (vagues de groupe), option 1 (4 vagues par donjon), puis option 1 (une vague de groupe continue le combat), décisions de Seb.

## Ce qui change en jeu
Quatre vagues normales par donjon arrivent en groupe : 2 ou 3 ennemis tirés dans le pool du donjon, mélangés. Jamais sur une élite ni au campement ; les vagues 1 et 2 restent seules.

| Donjon | Vagues de groupe (taille) |
| --- | --- |
| Tanière du Basilic | 3 (×2), 7 (×2), 12 (×3), 14 (×2) |
| Cité engloutie | 3 (×2), 7 (×2), 12 (×3), 14 (×2) |
| Sanctuaire scellé | 3 (×2), 6 (×2), 10 (×3), 14 (×2) |
| Ossuaire | 3 (×2), 6 (×2), 10 (×3), 14 (×2) ; les morts y dorment (règle de la Crypte) |

- Chaque membre a les PV, la puissance et l'or d'un ennemi de la vague, réduits : ×0,5 / ×0,45 à deux, ×0,35 / ×0,35 à trois.
- Une vague de groupe **continue le combat**, comme une vague seule : un compagnon KO reste KO, ses recharges et charges ne reviennent pas. Les vagues d'élite gardent leur comportement (nouveau combat).
- Sous la Marque Traque, chaque vague reste une élite seule.

## Pourquoi « continuer le combat »
Premier banc : les groupes rendaient les donjons bien plus faciles (Cité desert0 7/3/0 % → 77/73/70 %, Varrek au palier Rare 77/67/77 % → 100/90/100 %), quelles que soient leurs stats. Cause : un groupe passait par l'ouverture d'un nouveau combat (`spawnGroup`), qui relève les compagnons KO et leur rend recharges et charges (Wenna relançait Pansement serré, +177 PV au héros). Une vague seule, elle, ne rouvre pas le combat.

## Mesures (30 runs par classe, Chevalier / Rôdeur / Mage)
| Banc | Avant | Après |
| --- | --- | --- |
| Tanière (foret) | 93 / 100 / 100 % | 100 / 100 / 97 % |
| Cité (campagne, étape 12) | 63 / 83 / 93 % | 47 / 77 / 93 % |
| Cité (desert0 / desertfin), réglage précédent | 7 / 3 / 0 % · 100 / 90 / 100 % | 0 / 0 / 7 % · 100 / 100 / 100 % |
| Sanctuaire, Varrek (Rare) | 77 / 67 / 77 % | 80 / 60 / 67 % |
| Ossuaire, Liche (Épique) | 80 / 73 / 93 % | 77 / 70 / 90 % |

À surveiller en jeu : le Chevalier à la Cité, au profil de l'étape 12 (47 % contre 63 %), déjà la classe en retrait de ce donjon.

## Code
- `data/dungeon.js` : `groupWaves` sur les 4 donjons ouverts, `DUNGEON_CONFIG.groupWave` (multiplicateurs par taille).
- **Fichier protégé (accord Seb)** : `systems/dungeon-system.js`, `buildGroupWave`, `isGroupWaveNow`, et `buildWaveEnemyBase(wave, noGroup)`.
- `systems/companion-system.js` : `onCombatStart` ne rouvre pas le combat sur une vague de groupe de donjon.
- Aucun état persistant nouveau, aucun fichier ajouté.

## Outils
- `round-harness.js` : section [291] (positions, tailles, Traque, élites et campement épargnés, compagnon KO qui reste KO).
- `plafond-bench.js` (et les bancs qui s'en servent) : `--groupe pv2,puiss2,pv3,puiss3`.
- `round-harness.js` : [33] tue tous les ennemis jusqu'au boss (plus « 15 coups ») ; [85 bis] et [272] lisent la vague 8, la 7 étant devenue une vague de groupe.
