# v3.706.1 — UI-10, cas restant : pas de bandeau illustré en texte « Grande » sous 600 px de haut (choix de Seb du 05/11)

Ajout au lot de v3.706.0 (déjà publiée, d'où le numéro de correctif). Variante C de l'atelier 1 (`atelier/petits-ecrans.html`), restreinte au seul cas que la variante A (v3.702) laissait : en texte « Grande », à 320×568, « Accepter » (Camp › Missions) restait sous la barre du bas. Aucun fichier protégé touché. Aucun état sauvegardé nouveau. Aucun fichier ajouté.

## Corrigé

- **UI-10 (C restreinte)** : `ScreenBanner.isOff()` = texte Grande (`html.text-big`) ET bandeau court (`phoneH()` à 104 px, donc hauteur d'écran < 600 px, hors mode PC) ET pas `wide-mode`. Dans ce cas `fit()` pose `.kfb.is-off` (caché), `data-fold` à 0, sans `is-short` ; `mini()` ne pose jamais `is-mini` sur un bandeau caché. Le nouveau rendu après un changement de taille de texte (`DesktopScale.setTextSize` → `renderPanel`) et `refitAll` (rotation) repassent par `fit()`. `js/ui/screen-banner.js`.
- CSS : `#panel-container .kfb.is-off { display: none; }` et, pour les onglets collés (NOV-24), `.kfb.is-off ~ .nb-page-frame .kf-mid > .kseg { top: 0; }` : sans bandeau, les onglets se collent en haut de la zone. La règle NOV-24 (`top: 44px`) et la compaction sous bandeau replié sont inchangées partout ailleurs. `css/07-responsive.css`.
- Partout ailleurs rien ne change : 104 px sous 600 px en Normale, 150 px au-dessus (168 px rendus en Grande à 390×844).
- Quoi de neuf : une ligne FR + EN (`js/ui/news-view.js`, `js/lang/en.js`).
- `tools/harness/round-harness.js` : [472] (nouveau, 5 contrôles) : cas caché (568 Grande) et cas non cachés (568 Normale, 844 Grande, mode PC), `fit` / `mini` sans repli, 104 et 150 px inchangés, règles CSS. Aucun contrôle existant adapté.

## Mesures (vrai jeu, Chromium, nouvelle partie, Chevalier ; Camp › Missions, Village, Quêtes, Héros)

Haut des onglets mesuré depuis le haut de la zone de défilement ; « Accepter » : marge entre son bas et le haut de la barre du bas (négatif = dessous).

| 320×568 Grande | Avant | Après |
|---|---|---|
| Bandeau | 116 px (104 × 1,12) | caché |
| « Accepter » (Camp › Missions, ouverture) | −63 px (sous la barre) | **+74 px**, entièrement visible |
| Onglets à l'ouverture (haut / hauteur / touchables) | 143 / 61 / 2 sur 2 | 7 / 61 / 2 sur 2 |
| Onglets après 200 px de défilement | 49 (sous le bandeau replié) / 49 / 2 sur 2 | **0 (collés en haut)** / 61 / 2 sur 2 |
| Village, Quêtes, Héros après défilement | 49 / 49, tous touchables | 0 / 77, 61, 61, tous touchables (4/4, 3/3, 2/2) |
| Débordement horizontal (page / zone) | 0 / 0 | 0 / 0 |

Sans bandeau, les onglets ne se compactent pas une fois défilés (la compaction suit le bandeau replié) : ils gardent leur hauteur d'ouverture.

| Témoins (avant = après, identiques au pixel) | Bandeau | Onglets ouverture / défilé | « Accepter » |
|---|---|---|---|
| 320×568 Normale | 104 px, replié à 44 | 128 / 44 | −16 px |
| 390×844 Grande | 168 px, replié | 195 / 49 | +160 px |
| 390×844 Normale | 150 px, replié | 174 / 44 | +212 px |

Aucune erreur de page.

## Laissés

- Aucun.

## À signaler

- 320×568 texte Normale, nouvelle partie : « Accepter » est encore 16 px sous la barre du bas à l'ouverture (bandeau de 104 px de la variante A, onglets de 55 px). Inchangé ici (hors du cas validé) : à trancher par Seb si ce cas compte.
- Avec le bandeau caché, le Camp perd sa pastille du jour et du festin, et le Village ses habitants (variante C telle que décrite dans l'atelier : l'onglet actif de la barre du bas situe l'écran).

Contrôles : `node --check` sur chaque JS modifié ; round-harness 6 596 OK, 0 échec (2 passes) ; boot 4 OK ; création 44 OK ; i18n 100 % (8 481 textes), 0 orphelin ; parcours 232 OK, 0 échec.
