# Aethervale v3.429.15 — Pronostic : les soins des compagnons comptent

S'applique sur la v3.429.14. Seul le pronostic change : les soins de Wenna et de Maddoc sont inchangés.

## Le constat, mesuré au banc
- Sur l'Orc, à l'arrivée du boss, le pronostic du Chevalier était juste : 10 rounds estimés pour le tuer, 8 réels. L'erreur venait de l'usure annoncée avant le boss (1 294 PV pour environ 950 reçus) : les soins des compagnons n'étaient pas comptés.
- Soins réels par run : Wenna, 140 à 300 PV avant le boss de l'Orc. Wenna et Maddoc ensemble, 1 050 à 1 420 PV sur la Nuée.

## Le correctif
- Le pronostic retire de l'usure les soins des compagnons, selon leurs vraies règles. Wenna soigne 18 % des PV max, au plus 3 fois par combat, avec une recharge de 4 rounds, sous son seuil de soin. Maddoc se soigne de 12 % (« Planté ») dès qu'un allié est touché. Aucun soin au dernier round : l'ennemi tombe avant leur tour.
- Ces soins comptent à 0,75 (`FORECAST_COMPANION_HEAL_MULT`). Au banc, le héros boit ses potions avant de passer sous le seuil de Wenna, donc elle soigne moins que le modèle complet.
- S'applique aux quêtes, aux chasses et aux donjons.

## Effet au banc (8 runs par classe, 15 contenus)
- Chevalier : Orc « hors de portée » → « très dur » (50 % de réussite). Nuée « hors de portée » → « trivial » (100 %). Cité, profil début de Désert, « hors de portée » → « très dur » (25 %). Cité, profil campagne, « risqué » → « abordable » (100 %).
- Plus optimiste qu'avant : Dunes « abordable » → « trivial » pour le Chevalier (88 %), et Gouffre, réussi à 100 %. Cité, profil campagne, Mage : « abordable » → « trivial » pour 63 % de réussite, à reprendre avec la Cité à distance, déjà connue pour être optimiste.
- Les 52 autres verdicts ne changent pas.

## Code
- `js/systems/combat-forecast-system.js` : `getGroupFight` (coût et durée d'une vague), `getSingleFight`, `getCompanionHeals`, `FORECAST_COMPANION_HEAL_MULT`. Branché dans `forMission` et `forDungeon`.
- `tools/sim/plafond-bench.js` : relevé du combat de boss, soins réels et estimés, option `--soinscomp`. Correctif : sans `--frappes`, le banc s'arrêtait après le Chevalier (ligne d'affichage sans garde, depuis la v3.429.14).
- Aucun fichier protégé touché. Aucun fichier ajouté.

## Contrôles
- Round : **3 963 OK**, 0 échec, sur trois passages. Boot : 4 OK. Création du héros : 44 OK.
- `node --check` sur tous les fichiers modifiés.
