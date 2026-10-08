# Aethervale v3.429.14 — Pronostic : le Chevalier n'est plus jugé trop facile

S'applique sur la v3.429.13.

## Le constat, mesuré au banc
- Relevé `--frappes` (12 runs par classe, Meute, Cœur, Dunes, Orc, Nuée, Tanière) : les dégâts réels du héros par action valent 0,38 à 0,65 de l'estimation pour le Chevalier, contre 0,57 à 0,89 pour le Rôdeur et le Mage.
- Cause : l'estimation compte toutes les actions comme offensives et fait la moyenne du kit. Le Chevalier passe 12 à 30 % de ses actions en garde et n'exécute presque jamais (moins de 5 %). Sans rounds d'approche pour compenser, son usure était sous-estimée de moitié (Meute : 256 annoncés pour 591 réels).

## Le correctif
- Coefficient de classe sur les dégâts estimés du pronostic : Chevalier × 0,7 (`FORECAST_CLASS_DMG_MULT`). Le Rôdeur et le Mage ne changent pas.
- Le coefficient ne vaut que pour le pronostic (`getForecastHeroDamage`). La mise à l'échelle des ennemis et l'estimation des Petites Aventures gardent `getHeroDamagePerRound` : aucun combat ne change.
- Effet sur le Chevalier :
  - Meute : usure annoncée 256 → 520 (réelle 591).
  - Cœur : usure annoncée 520 → 781 (réelle 994).
  - Dunes : « trivial » → « abordable » (92 % de réussite).
  - Tanière : « trivial » → « abordable ».
- Limite connue : l'Orc et la Nuée restent « hors de portée » pour le Chevalier, alors qu'il réussit 50 % et 83 % des runs. C'est une autre cause, à traiter dans une décision séparée.

## Code
- `js/systems/combat-forecast-system.js` : `FORECAST_CLASS_DMG_MULT`, `getForecastHeroDamage`, utilisé par `getPartyDamagePerRound` et `forEnemy`.
- `tools/sim/plafond-bench.js` : options `--frappes` (frappes et dégâts réels contre l'estimation) et `--kchev k` (essai du coefficient du Chevalier).
- Aucun fichier protégé touché. Aucun fichier ajouté.

## Contrôles
- Round : **3 963 OK**, 0 échec, sur trois passages. Boot : 4 OK. Création du héros : 44 OK.
- `node --check` sur tous les fichiers modifiés.
