# v3.757.0 — Onglets collants : les pastilles des cartes passent dessous (capture de Seb, 09/11)

Constat (iPhone de Seb, Village › Bâtiments) : en faisant défiler la liste, la pastille de niveau d'une carte (« 10/10 ») passait par-dessus la barre d'onglets collée en haut. Les deux avaient `z-index: 2` ; à égalité, la pastille, plus loin dans la page, passait devant.

- `css/07-responsive.css` : la barre d'onglets collée sous le bandeau (`.kf-mid > .kseg`, téléphone) passe à `z-index: 3`, au-dessus des pastilles et rubans des cartes (2), au niveau du bandeau (3). Règle commune : vaut pour tous les écrans à onglets.
- Mesuré dans Chromium à 390 px (pastille amenée au milieu de la barre, `elementFromPoint`) : avant, la pastille est devant ; après, l'onglet est devant.
- Quoi de neuf : une ligne (FR + EN).
- `tools/harness/round-harness.js` : [467] lit `z-index: 3`.

Contrôles : round-harness 7 280 OK, 0 échec (×2) ; boot 4 OK ; création du héros 44 OK ; i18n 8 962 textes, 100 % ; parcours 235 OK sur deux passes (une première passe à 6 échecs intermittents, non reproduits).
