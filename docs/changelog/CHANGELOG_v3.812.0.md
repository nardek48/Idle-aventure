# v3.812.0 — Rythme : la Forêt 7 à 9 ne se répète plus (15/11/2026)

Rythme de l'Alpha (audit du 13/11) : trois étapes « Terminer l'expédition… » d'affilée, toutes de deux obstacles en ligne droite. Option A de Seb (15/11), textes validés par Seb. Aucun fichier protégé modifié (l'Histoire est inchangée), aucun changement de sauvegarde, aucun fichier ajouté.

## Changement (`data/scene-templates.js`)
- **La Source tarie** (forest_07) : un obstacle (source irrégulière), puis la source, qui rend tout le Souffle.
- **Le Sentier obstrué** (forest_08) : tronc déraciné, combat d'une araignée géante sous le tronc (`FOE_MULT_SENTIER` 1,6, réplique de Brannoc après le combat), racines. Piste : points 0, 1, 2.
- **La Veine instable** (forest_09) : filon fragile, paroi instable, éboulis (« la roche se referme »). Piste : points 3, 4, 5.
- 7 phrases nouvelles, traduites en anglais. Les quêtes de déblocage (Bosquet, Terre en friche, Éboulis ferreux) gardent leurs deux obstacles.

## Mesure (robot, une partie par classe, jusqu'à forest_brume)
- Araignée à 1 : « Tenir » 5 à 6 % des PV, « Charger » ~10 %. À 1,6 (retenu) : « Tenir » 11 à 13 %, « Charger » 20 à 24 %. Aucune mort, les trois étapes passées.

## Contrôles
- `round-harness` 7154 OK, 0 échec, sur 2 passes ([513t] ; [S2a] : 3 étapes, héros au niveau 5 de l'étape — un héros neuf tombe sous l'araignée ; [165] : 3 étapes au Sentier et à la Veine).
- Parcours : P13 joue le Bosquet silencieux (deux obstacles) au lieu du Sentier. Série complète 236 OK sur 5 passes ; une 6e passe a donné 6 échecs non reproduits (instabilité, pas identifiée).
- boot 4 OK ; création du héros 46 OK ; i18n 100 %.
- Quoi de neuf : une ligne (FR + EN).
