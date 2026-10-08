# Aethervale v3.429.9 — Pronostic : les compagnons comptent, Nezzam en référence

Suite des mesures du pronostic (v3.429.7 donjons, v3.429.8 groupes). S'applique sur la v3.429.8.

## Les compagnons comptent
Chaque compagnon présent (hors patrouille) frappe une fois par round et encaisse une part des coups (`pickVictim`, au prorata de la menace). Le pronostic ajoute donc ses dégâts à ceux du héros et ses PV au réservoir : `getPartyBonus`, `getPartyDamagePerRound`, avec les PV max à l'entrée d'un donjon. Le coefficient ×0,2 de la Cité (v3.429.7), qui compensait leur absence, est retiré.

## Quêtes à rencontres scriptées
- La référence d'une quête à rencontres qui finit sur un boss est le boss. Le Trône de sable lisait le premier « Guerrier des sables » au lieu de Nezzam.
- L'usure additionne les rencontres une par une (chacune a son groupe), au lieu de diviser l'objectif par la taille du premier groupe. `AdventureQuestManager._encounterQuest(quest, index)` prend un index facultatif ; le jeu ne change pas.

## Mesures (`tools/sim/plafond-bench.js --pronostic`, 20 runs, Chevalier / Rôdeur / Mage)
| Contenu · profil | Réussite réelle | v3.429.8 | v3.429.9 |
|---|---|---|---|
| Gouffre · desertII | 100 % ×3 | Hors de portée ×3 | Sans danger ×3 |
| Cité · desert0 | 35 / 20 / 40 % | Risqué / Risqué / Très difficile (×0,2) | Abordable / Risqué / Risqué |
| Cité · campagne | 100 / 85 / 75 % | Abordable ×3 | Abordable ×3 |
| Cité · desertfin | 100 % ×3 | Sans danger / Abordable ×2 | Sans danger ×3 |
| Trône de sable · campagne | 0 / 20 / 5 % | Abordable ×3 | Hors de portée ×3 |
| Trône de sable · desertfin | 0 / 15 / 50 % | Abordable ×3 | Hors de portée ×3 |
| Nuée · desertII | 90 / 95 / 100 % | Sans danger ×3 | Risqué ×3 |

Sans changement : Meute, Lisière, Cœur, Dunes, Tanière.

Limites connues :
- La Nuée est désormais lue trop prudemment : le calcul tue les membres d'un groupe un par un et ignore les attaques de zone (Rafale, sorts du Mage).
- Le Seigneur de guerre orc reste « Hors de portée » pour 50 à 100 % de réussite : l'usure de ses 20 combats est surestimée.
- Le Chevalier reste lu trop optimiste (compétences supposées lancées à chaque round).

## Code
- `js/systems/combat-forecast-system.js` : compagnons, référence boss des quêtes à rencontres, usure par rencontre.
- `js/systems/adventure-quest-system.js` : `_encounterQuest(quest, index)`, index facultatif.
- `js/data/dungeon.js` : coefficient de la Cité retiré.
- Aucun fichier protégé touché. Aucun fichier ajouté.

## Contrôles
- Round : **3 963 OK**, 0 échec, sur trois passages. Boot : 4 OK. Création du héros : 44 OK.
- Chromium : référence du Trône = Nezzam, Wenna comptée (PV et dégâts), état du jeu intact après le calcul. Console sans erreur.
- `node --check` sur tous les fichiers modifiés.
