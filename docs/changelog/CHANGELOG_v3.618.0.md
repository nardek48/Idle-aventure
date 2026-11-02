# v3.618.0 — Habillage des cartes, lot 2 : interface

Atelier « Cartes E » (Seb, 02/11). Le cadre secondaire et la texture parchemin passent sur les onglets et les cartes d'interface. Les documents (quêtes, missions, Taverne, Chronique) suivront au lot 3.

## Changements
- `css/00-cartes.css` : listes de classes tirées d'un inventaire du jeu (téléphone et PC, onglets, sous-onglets et 21 fiches) :
  - **cadre secondaire + texture** (46 classes) : onglets `kseg`, cartes du Camp (sauf Missions), Village (production, bâtiments, ateliers, entrepôt), Héros (résumé, équipement, boutique, compagnons), hauts faits, journal, paramètres, et cartes des fiches (Halle, Forge, Stats, Capacités, Caravane, Donjon, Grand Ouvrage…) ;
  - **texture seule** (13 classes) : lignes de moins de 44 px et cartes rangées dans un document ;
  - une carte déjà rangée dans une carte encadrée ne reçoit pas de second cadre (`:not(… *)`).
- Repères d'état redessinés à l'intérieur du cadre (ils passaient par la bordure ou l'ombre) : rareté des cartes d'achat, haut fait prêt, tuile de production sélectionnée (liseré en `::after`), haut fait caché (fond plus sombre), expédition prête (barre or à gauche).
- `tools/harness/parcours-harness.js` : **P14**, 22 écrans et fiches en téléphone puis en PC ; toute carte crème doit porter la texture, sinon la classe oubliée est nommée. Il a trouvé deux oublis pendant le lot (tuiles du Résumé en PC).
- Quoi de neuf : une ligne (FR + EN).

## Contrôles
- Captures du vrai jeu sur 15 écrans (téléphone et PC) ; états vérifiés au pixel (rareté, haut fait prêt, tuile sélectionnée, expédition prête).
- Harnais 5 822 OK, 0 échec (2 passes) ; parcours P1–P14 ; boot, création du héros, i18n 100 %, icônes.
- Aucun fichier JS du jeu modifié, aucun fichier protégé.

## Reste (lot 3)
- Documents en parchemin déchiré : `story-chain`, `story-step`, `story-prologue-card`, `camp-missions-card` (et la carte Missions en PC), `ms-block`, `qb-card`, `tavern-board`, Chronique (`chr-*`) ; correction de l'en-tête de la Taverne. P14 les inclura.
