# Aethervale v3.429.11 — Pronostic : l'approche des ennemis, et le run entier des quêtes sans boss

Suite des mesures du pronostic (v3.429.7 à v3.429.9). S'applique sur la v3.429.10.

## Le constat (banc, usure réelle mesurée)
L'usure réelle dépend fortement de la classe : le Chevalier encaisse 2 à 4 fois plus que le Rôdeur et le Mage (Cœur 987 / 418 / 487, Orc 638 / 238 / 256). L'estimation était identique pour les trois. Il n'y a pas d'attaque de zone dans le jeu : la piste « Rafale » était fausse.

La cause : face à un héros à arc ou à magie, l'ennemi met `engageIn` rounds à venir au contact (2 par défaut, 0 pour les tireurs). En groupe, ceux qui approchent arrivent échelonnés 0, 1, 2… par célérité décroissante (`spawnGroup`). Le Chevalier, à l'épée, est au contact dès le premier round.

## Le correctif
- `getEngageRounds(ennemi)` : rounds d'approche, 0 au corps à corps.
- Usure d'un combat : les rounds d'approche ne coûtent rien. Usure d'un groupe : chaque membre frappe à partir de son arrivée, selon la règle exacte du moteur.
- Course contre le boss : l'approche s'ajoute aux rounds avant de tomber.
- Quêtes sans boss : si l'usure du run atteint 95 % du réservoir (PV + compagnons + potions), le verdict passe à « Hors de portée » (« Les combats qui s'enchaînent t'usent plus vite que tu ne récupères. »). Des seuils plus bas (0,6 / 0,75 / 0,85) condamnaient la Nuée et le Cœur, réussis à 90-100 % : écartés.

## Mesures (`tools/sim/plafond-bench.js --pronostic`, 20 runs, Chevalier / Rôdeur / Mage)
| Contenu · profil | Réussite réelle | v3.429.9 | v3.429.11 |
|---|---|---|---|
| Meute · entraînement 0 | 0 / 0 / 0 % | Sans danger / Hors / Hors | Sans danger / Hors / Hors |
| Meute · foretI | 45 / 100 / 100 % | Sans danger ×3 | Sans danger ×3 |
| Orc · foret | 50 / 100 / 100 % | Hors de portée ×3 | Hors / Abordable / Abordable |
| Nuée · desertII | 90 / 95 / 100 % | Risqué ×3 | Hors / Sans danger / Sans danger |
| Dunes · desertI | 95 / 100 / 100 % | Sans danger ×3 | Sans danger ×3 |
| Cité · desert0 | 35 / 20 / 40 % | Abordable / Risqué / Risqué | Abordable ×3 |
| Tanière · foretIII | 0 % ×3 | Hors de portée ×3 | Hors de portée ×3 |
| Trône · campagne | 0 / 20 / 5 % | Hors de portée ×3 | Hors de portée ×3 |

Usure estimée contre usure réelle, Rôdeur / Mage : Meute foretI 472 / 480 contre 514 / 486, Dunes 368 / 372 contre 448 / 292.

Limites connues : le Chevalier reste mal lu (sans approche, l'estimation ne suit pas son usure réelle, trop basse ou trop haute selon la quête) ; la Cité au début de l'acte III est un peu optimiste pour le Rôdeur et le Mage.

## Outils
- `tools/sim/plafond-bench.js --pronostic` : usure réelle aussi pour les quêtes (PV du groupe perdus avant le boss, ou sur tout le run sans boss, potions comprises).

## Code
- `js/systems/combat-forecast-system.js` : approche, groupes échelonnés, règle du run entier.
- `js/lang/en.js` : une traduction.
- Aucun fichier protégé touché. Aucun fichier ajouté.

## Contrôles
- Round : **3 963 OK**, 0 échec, sur trois passages. Boot : 4 OK. Création du héros : 44 OK.
- i18n : 4 185 textes, 100 %, 0 orphelin.
- Chromium : Rôdeur neuf face à la Meute → « Hors de portée » avec la raison du run, état du jeu intact. Console sans erreur.
- `node --check` sur tous les fichiers modifiés.
