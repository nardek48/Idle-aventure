# v3.760.0 — Fil rouge : construire au village et quête annexe (Seb 09/11, option A)

Constat (lecture du code) : le fil rouge passe l'Histoire avant tout le reste, et les quêtes annexes n'y venaient qu'en tout dernier recours (« Rien ne presse »), jamais atteint tant qu'un chapitre est ouvert. Aucune proposition ne disait de construire ou d'améliorer un bâtiment du village, alors que l'Histoire ne le demande pas en Forêt ni au Désert.

- `js/systems/fil-rouge-system.js` :
  - `_build` : un bâtiment à construire ou à améliorer tout de suite, même règle que sa fiche (`getBlockReason` nul : or et matériaux réunis, aucun chantier en cours, rang et condition remplis). Ordre : Terrain d'entraînement, Entrepôt, Halle, Atelier, puis la grille. « Voir » ouvre la fiche du bâtiment.
  - `_annexe` : une quête annexe en cours, sinon disponible (les types de l'onglet Annexes ; les Petites Aventures et le Labyrinthe ont leur proposition). « Reprendre » ou « Voir » (Quêtes › Annexes). Une annexe terminée passe déjà par « Réclamer ».
  - Place : après l'Histoire et la patrouille rentrée, avant la Taverne ; en pratique dans « Pendant ce temps… » sous l'étape d'Histoire.
  - « Rien ne presse » ne reprend plus les annexes (pas de doublon).
- Quoi de neuf : une ligne (FR + EN). `js/lang/en.js` : 6 textes.
- `tools/harness/round-harness.js` : section [512].

Vu dans Chromium à 390 px (Forêt, forest_07, Atelier construit) : « La source tarie », puis « Construire : Entrepôt agrandi » et « Quête annexe : Le Bosquet Silencieux ».

Contrôles : round-harness 7 293 OK, 0 échec (×2) ; boot 4 OK ; création du héros 44 OK ; i18n 8 971 textes, 100 % ; parcours 235 OK.
