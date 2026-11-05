# v3.702.0 — Petits écrans : atelier 1 intégré (choix de Seb du 05/11)

Variantes choisies dans `atelier/petits-ecrans.html`, reprises avec le CSS et le balisage du prototype. Le CSS est regroupé en fin de `css/07-responsive.css` (bloc « v3.702.0 : petits écrans »), après les feuilles d'écran, comme les variantes l'étaient dans l'atelier.

## Corrigés

- **MARGES** (B) : 4 px de chaque côté au lieu de 22, sur téléphone seulement (≤ 430 px, hors mode PC), pages à cadre seulement (`#panel-container:has(> .kfp-wrap)` sans padding, `.kf-mid` et bandeau à 4 px, rails du Camp et du Village sans marge négative). Feuilles et combat inchangés. Fichier : `css/07-responsive.css`.
- **UI-10** (A) : sous 600 px de haut (hors mode PC), bandeau de 104 px au lieu de 150, sans la phrase ; il se replie ensuite comme avant (44 px). `ScreenBanner.phoneH()` lit `window.innerHeight` ; `fit()` pose la hauteur, le repli et la classe `is-short` (phrase masquée). Recalculé au redimensionnement (`refitAll`). Fichiers : `js/ui/screen-banner.js`, `css/07-responsive.css`.
- **UI-10 suite** (B) : « Partir » puis « Abandonner » l'un sous l'autre, centrés, 12 px d'écart. Fichier : `css/07-responsive.css`.
- **UI-9 + SUIV-12** (A) : liens « Aussi » du fil rouge un par ligne (44 px), le séparateur « · » est désormais un `<span class="fr-also-sep">` posé par le code (masqué) ; pastille « habitants » du Village, badges « États du combat » et « à distance » : zone invisible de 44 px ; ligne de recette (ressources et « manque … › ») et besoins de la Taverne : 44 px visibles ; pastilles du haut du combat : zone de 48 px. Fichiers : `js/ui/fil-rouge-view.js`, `css/07-responsive.css`.
- **COMB-7** (A) : la barre de ressource du héros écrit le nom dans son propre `<span class="cbx-res-lbl">`, et porte `aria-label` (« Concentration 0 / 100 ») et `title` (« Concentration ») ; avec un ou deux compagnons, le nom est masqué, la barre n'écrit que « 0 / 100 ». Sous 360 px, « Prêt » des compagnons devient ✓ (texte « Prêt » gardé pour les lecteurs d'écran). Seul, le héros garde « Concentration 0 / 100 ». Fichiers : `js/ui/combat-screen-view.js`, `css/07-responsive.css`.
- **NOV-24** (C) : les onglets restent collés sous le bandeau replié (`top: 44px`, fond opaque) et passent en version compacte (libellés seuls, 44 px) tant qu'il est replié. Règle limitée aux pages à bandeau (`.kfb ~ .nb-page-frame`) et hors format tablette (bandeau replié de 56 px) : l'atelier ne montrait que le Camp. Fichier : `css/07-responsive.css`.
- **UI-14** (A) : en texte Grande sous 360 px, libellés des onglets sur deux lignes, sans ellipse, césure douce. Césures posées dans les chaînes, avec le contexte « sous-onglet » : Mis­sions, Expé­di­tions, Gri­moire (Camp), Bâti­ments, Ate­liers, Entre­pôt (Village), Équi­pe­ment (Héros, qui débordait aussi, voir les mesures). Anglais césuré aussi : Mis­sions, Expe­di­tions, Gri­moire, Build­ings, Work­shops, Ware­house, Equip­ment. Clés `sous-onglet|Ateliers` et `sous-onglet|Entrepôt` remplacées, « Bâtiments » (plus utilisé) retiré. Fichiers : `js/ui/camp-view.js`, `js/ui/village-view.js`, `js/ui/heros-view.js`, `js/lang/en.js`, `css/07-responsive.css`.
- Quoi de neuf : une ligne FR + EN (`js/ui/news-view.js`, `js/lang/en.js`).
- `tools/harness/round-harness.js` :
  - [467] : bloc CSS en place et commentaires fermés, règles MARGES, `phoneH()` (568 → 104, 844 → 150) et `is-short`, pile Partir/Abandonner, séparateur « Aussi » isolé et cibles de 44 px, balisage et CSS de COMB-7, onglets collants de NOV-24, 7 césures traduites (FR et EN), onglets du Camp/Village/Héros césurés, règle UI-14 ;
  - contrôles adaptés aux césures (texte comparé sans les U+00AD) : [RESUME] onglet « Équipement », [186] ordre du rail du Village, [198] onglet « Expéditions », [462] clés EN de CPL3-11 (`Ate­liers`, `Entre­pôt`).
- `tools/harness/parcours-harness.js` : contrôle « cartes crème habillées » adapté. Les trois compteurs de `.exp-sum` (Camp › Expéditions, fiche Patrouilles) dépassent maintenant 120 px de large (111 → 123 px à 390) grâce aux marges de 4 px, et étaient pris pour des cartes non habillées : ils sont exclus (ce sont des compteurs, pas des cartes).

## Mesures (vrai jeu, Chromium, fonctions `zone`, `cut`, `rowPage` de l'atelier)

Partie avancée (Rôdeur, Désert étape 16, Wenna et Maddoc), 320 × 568 et 390 × 844, texte Normale et Grande ; combat à trois pour les trois classes ; anglais pour les onglets. Avant = v3.701.0, après = v3.702.0.

| Constat | Avant | Après |
|---|---|---|
| MARGES, largeur utile (320 / 390) | 276 / 346 px (86 / 89 %), marges 22 px | 312 / 382 px (98 %), marges 4 px |
| UI-10 « Accepter », 320 × 568 Normale | 151 × 19 px, 33 % visible, −28 px sous la barre | 151 × 49 px, entier, 34 px au-dessus de la barre (bandeau 104 px) |
| UI-10, 390 × 844 | bandeau 150 px | inchangé (150 px) |
| UI-10 suite, carte acceptée | « Partir » / « Abandonner » dépassent de 34 px (320 N), 57 px (320 G), 22 px (390 G) ; écart 6-7 px | dans la carte partout, 151 × 49 px (G : 169 × 55), écart 12-13 px |
| UI-9, liens « Aussi » | 181 × 19 à 181 × 39 px | 44 px de haut (181 × 44, 165 × 45, 133 × 44) |
| UI-9, pastille « 40 habitants » | 116 × 29 px | 116 × 45 px |
| UI-9, recette | « 8 » / « 4 » 29 × 19, « manque Viande › » 101 × 17 | 45 × 45 et 101 × 45 px |
| SUIV-12, besoins de la Taverne | 66-90 × 15 px | 73-89 × 45 px |
| UI-9, badges du combat | « États du combat » 47 × 33, « à distance » 85 × 33 ; pastilles du haut 43 px à 390 | 47 × 45, 85 × 45 ; pastilles 45-49 px |
| COMB-7, Rôdeur à trois | « Concentration 0 / 100 » coupé de 30 px (320), 16 px (390) | « 0 / 100 » entier, 12 px gardés |
| COMB-7, Mage / Chevalier à trois, 320 | « Mana 100 / 100 » coupé de 11 px, « Rage 0 / 100 » de 2 px | « 100 / 100 », « 0 / 100 » entiers |
| COMB-7, « Prêt » de Wenna, 320 | coupé de 14 px | ✓ entier |
| NOV-24, défilé de 200 px | 4 onglets masqués par le bandeau ; 388 px libres (320), 648 (390) | 4 onglets touchables (73 × 45 à 320, 91 × 45 à 390) ; 332 px libres (320), 592 (390) |
| UI-14, Camp 320 Grande | « Expéditions » déborde de 4 px, à 4 px du voisin | 2 lignes, marge 11 px, écart ≥ 20 px |
| UI-14, Village 320 Grande | « Bâtiments » coupé de 4 px | entier, marge 3 px |
| UI-14, Héros 320 Grande | « Équipement » déborde de 9 px, « Talents » à 1 px | entiers, écart ≥ 6 px |
| UI-14, anglais 320 Grande | « Expeditions » déborde de 4 px ; « Equipment » de 5, « Summary » de 1 | entiers |
| Débordement horizontal de l'écran | aucun | aucun (toutes combinaisons) |

Relevé complet : 88 combinaisons, 53 avec au moins un défaut avant, 1 après (voir « Repéré »). Mode PC vérifié inchangé (1 440 × 900 et 1 000 × 560 : marges, bandeau et onglets identiques à v3.701.0).

## Laissés

- Aucun.

## Repéré (non corrigé)

- **UI-10 en texte Grande à 320 × 568** : « Accepter » reste sous la barre (169 × 13 px visibles, −40 px). Le zoom de 1,12 agrandit aussi la carte de mission ; l'atelier donnait le même relevé pour la variante A (−43 px). À voir si Seb veut aller plus loin en texte Grande.

Contrôles : node --check sur chaque JS modifié · round-harness 6 501 OK, 0 échec (2 passes) · boot 4 OK · création 44 OK · i18n 8 432 textes, 100 %, 0 orphelin · parcours 212 OK · mesures Chromium ci-dessus. Aucun fichier protégé touché. Aucun fichier ajouté.
