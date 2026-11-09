# v3.759.0 — Talents au kit (atelier `atelier/talents-kit.html`, variante B avec les cadres, Seb 09/11)

Constat : l'écran Talents (v3.426) gardait le style d'avant le kit. Le sélecteur Classe / Commandement avait son propre style, le bandeau des points était une carte crème plate, et ni l'arbre ni le panneau n'étaient dans la liste des cartes encadrées de `00-cartes.css`.

- `js/ui/heros-screens-view.js` :
  - le sélecteur Classe / Commandement / Varier devient les onglets du kit (`.kseg.hst-mode`, bouton actif `.is-on`) ;
  - la ligne des points (« 9 points », plafond, réserve) ouvre l'arbre, y compris les colonnes du Commandement et de Varier (`buildCommandTreeHTML(C, spent, bar)`) ;
  - ↺ devient le bouton parchemin du pack (`kbtn hst-bar-reset`).
- `css/04-panel-heros-screens.css` : la ligne des points sur une bande parchemin, les points en pastille cuivre, ↺ sans le minimum de 140 px ; l'ancien style du sélecteur (`.hst-seg`) est retiré.
- `css/00-cartes.css` : cadre secondaire (`kc-secondaire.webp`) sur l'arbre, la colonne du Commandement et le panneau du talent ; texture parchemin sur le panneau (comme `.hs-edetail`), qui reste collé en bas ; titre du talent en Alegreya.
- `css/00-kbtn.css`, `css/09-wide.css` : renvois à l'ancien sélecteur remplacés.
- `js/lang/en.js` : « point / points » remplace « point à placer » (devenu orphelin).
- Quoi de neuf : une ligne (FR + EN).
- `tools/harness/round-harness.js` : section [511].

Vu dans Chromium à 390 px (Classe et Commandement) : onglets du kit, points dans l'arbre, cadres visibles, ↺ et « Apprendre » dans leurs blocs, aucune erreur.

Contrôles : round-harness 7 286 OK, 0 échec (×2) ; boot 4 OK ; création du héros 44 OK ; i18n 8 963 textes, 100 %, 0 orphelin ; parcours 235 OK.
