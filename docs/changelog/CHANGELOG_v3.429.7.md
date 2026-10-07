# Aethervale v3.429.7 — Pronostic des donjons : le run entier, plus le boss seul

Suite de la deuxième heure de jeu testée dans Chromium. S'applique sur la v3.429.6.

## Le constat
La feuille de lancement d'un donjon n'estimait que le boss, à partir des PV actuels du héros. Elle ignorait l'usure des quinze vagues et le soin complet à l'entrée. Résultat mesuré sur la Tanière : « Risqué » affiché pour un run perdu à 100 %.

## Le correctif (tous les donjons)
- `CombatForecast.forDungeon(id, marques)` : usure de chaque vague (groupes et escortes compris, ennemis tués l'un après l'autre), puis le boss avec ce qui reste. Le héros part à PV pleins, les Marques comptent. Le calcul ne modifie pas l'état du jeu.
- La feuille de lancement l'affiche, et un donjon lancé du tableau du Camp (« Avant de partir ») reçoit le même pronostic.
- Nouveau champ de donnée `forecastAttritionMult` par donjon, calé au banc : Tanière ×2 (le modèle sous-estime l'usure quand le héros est juste), Cité ×0,2 (Wenna et Maddoc encaissent et frappent, l'estimation les ignore). Donjons 3 à 6 : ×1 par défaut, à caler quand ils ouvriront.

## Mesures (`tools/sim/plafond-bench.js --pronostic`, 20 runs, Chevalier / Rôdeur / Mage)
| Donjon · profil | Réussite réelle | Pronostic |
|---|---|---|
| Tanière · foret (entr. 60 + uniques) | 100 / 100 / 100 % | Sans danger / Abordable / Abordable |
| Tanière · foretIII (entr. 60, vitrine) | 0 / 0 / 0 % | Hors de portée ×3 |
| Cité · desert0 | 35 / 20 / 40 % | Risqué / Risqué / Très difficile |
| Cité · campagne | 100 / 85 / 75 % | Abordable ×3 |
| Cité · desertfin | 100 / 100 / 100 % | Sans danger / Abordable / Abordable |

Limite connue : hors des situations du jeu (difficulté baissée artificiellement au banc), le Chevalier reste lu trop optimiste. Le modèle suppose les compétences lancées à chaque round.

## Outils
- `tools/sim/plafond-bench.js` : option `--pronostic`. Affiche le verdict de `forDungeon` et l'usure réelle des vagues (PV perdus avant le boss, potions bues comprises), pour caler `forecastAttritionMult`.

## Code
- `js/systems/combat-forecast-system.js` : `getGroupAttrition`, `forDungeon`, branchement dans `forMission`.
- `js/ui/dungeon-view.js` : la feuille appelle `forDungeon`.
- `js/data/dungeon.js` : `forecastAttritionMult` sur la Tanière et la Cité.
- Aucun fichier protégé touché. Aucun fichier ajouté.

## Contrôles
- Round : **3 963 OK**, 0 échec, sur trois passages.
- Boot : 4 OK. Création du héros : 44 OK.
- i18n : 4 185 textes, 100 %, 0 orphelin.
- Chromium (390×844) : pronostic affiché sur la feuille, chemin du tableau du Camp, PV et run en cours intacts après le calcul. Console sans erreur.
- `node --check` sur tous les fichiers modifiés.
