# v3.705.0 — Quêtes, Boutique et Donjon au standard des pages à cadre (demande de Seb du 05/11)

Les trois écrans quittent l'ancienne mise en page `.subtab-page` (`#panel-container.has-subtab-page`, défilement dans `.subtab-page-content`) et passent sur la page standard du Village, du Camp et de Héros : le décorateur (`decoratePageFrames`) pose `.kfp-wrap` > `.kfp-scrollzone` > bandeau `.kfb` (ScreenBanner) + `.nb-page-frame` > `.kframe` > `.kf-mid`. Contenu, bandeaux, sous-onglets, fiches, liens et comportement des donjons inchangés. Aucun fichier protégé touché. Aucun état sauvegardé nouveau. Aucun fichier ajouté.

## Corrigés

- **Quêtes** : `buildQuestsHTML` rend directement le cadre (bandeau « quetes », rail `.kseg.is-stack.qb-tabs` en tête de `.kf-mid`). Les onglets restent collés sous le bandeau replié (règle NOV-24 de v3.702) et la marge passe à 4 px (MARGES B). Fichier : `js/ui/quests-view.js`.
- **Boutique** : `buildShopHTML` rend directement le cadre « Potions » ; `setShopSubTab` (lien de l'Histoire › potions) inchangé. Fichier : `js/ui/shop-view.js`.
- **Donjon** : la liste et la tentative en cours passent par `dungeonPageFrameHTML` (cadre « Donjon », retour ‹ vers le Camp). La carte de la tentative (vague, Marques, cartes des haltes, « Reprendre le combat », « Abandonner la tentative ») est la même, désormais dans le cadre (elle était posée sans cadre). Feuille de lancement, haltes, camps et sorties vivent dans `#dungeon-modal-root` : non touchés. Fichier : `js/ui/dungeon-view.js`.
- **Règles devenues mortes retirées** (plus aucun écran n'utilise `.subtab-page`, vérifié dans `game/js`, `index.html` et les outils) :
  - `renderPanel` : bascule de `has-subtab-page` et sauvegarde / restauration du défilement de `.subtab-page-content` (le défilement de `.kfp-scrollzone` est restauré par le mécanisme H-2 de v3.425). `js/ui/ui-root.js`.
  - Décorateur : branche « page à sous-onglets » (porte-bandeau `.is-subtab` au-dessus de `.subtab-page-content`). `js/ui/kframe-decorator.js`.
  - CSS : `.subtab-page` et `.subtab-page-content` (`css/00-components.css`), `#panel-container.has-subtab-page` (v3.131 / v3.242, `css/02-layout.css`), la règle MARGES `.has-subtab-page` de v3.703 (`css/07-responsive.css`), `.kfp-top-holder.is-subtab` (`css/00-kbtn.css`, `css/09-wide.css`), les sélecteurs `.subtab-page-content` de `css/02-layout.css` (espace des bulles), `css/00-kbtn.css` (fond), `css/08-desktop.css` (barre de défilement PC) et `css/09-wide.css`.
  - Gardés : `.subtab-bar-wrapper` / `.pc-subtab-bar` (CSS de `00-components.css`, encore lus par `liftHudDock`, `js/ui/hud-dock-view.js`).
- **Rien de coupé** : Quêtes › Aventure, 320 px texte Grande, aventure en cours : « Continuer » + « Abandonner » débordaient du cadre (16 px avant, 8 px avec la nouvelle largeur) ; `.qb-card-action` passe à la ligne (`flex-wrap`, `max-width: 100%`). Débordement 0. `css/04-panel-quests.css`.
- Quoi de neuf : une ligne FR + EN (`js/ui/news-view.js`, `js/lang/en.js`).
- `tools/harness/round-harness.js` :
  - [470] (nouveau, 10 contrôles) : trois écrans en page à cadre (bandeau Quêtes, rail en tête du cadre, cadre « Potions », six cartes de donjon, tentative en cours dans le même cadre avec ses deux boutons), liens gardés, plus de `.subtab-page` / `has-subtab-page` / `is-subtab` en JS ni en CSS, règles NOV-24 et espace des bulles inchangés, boutons d'aventure qui passent à la ligne.
  - [468] **adapté** : le contrôle « MARGES : pages à sous-onglets » testait l'ancienne structure (règle `.has-subtab-page` de v3.703) ; il vérifie maintenant la règle des pages à cadre (`#panel-container:has(> .kfp-wrap)`) et l'absence de l'ancienne.

## Mesures (vrai jeu, Chromium, partie avancée : Chevalier, Désert, village niveau 3)

Marges et largeurs en px depuis le bord de l'écran ; « contenu » = enfants de `.kf-mid`. Village mesuré dans la même session pour référence.

### Haut de page

| Écran | 320 N | 320 G | 390 N | 390 G |
|---|---|---|---|---|
| Village (référence) | bandeau 4/4, contenu 312 | 4/4, 311 | 4/4, 382 | 4/4, 381 |
| Quêtes avant | bandeau 8/8, contenu 304 | 9/9, 302 | 8/8, 374 | 9/9, 372 |
| Quêtes après | 4/4, 312 | 4/4, 311 | 4/4, 382 | 4/4, 381 |
| Boutique avant | titre à 8, contenu 304 | 9, 302 | 8, 374 | 9, 372 |
| Boutique après | titre à 4, contenu 312 | 4, 311 | 4, 382 | 4, 381 |
| Donjon avant | titre à 8, contenu 304 | 9, 302 | 8, 374 | 9, 372 |
| Donjon après | titre à 4, contenu 312 | 4, 311 | 4, 382 | 4, 381 |
| Donjon en cours avant | carte sans cadre ni titre | idem | idem | idem |
| Donjon en cours après | cadre « Donjon », contenu 312 | 311 | 382 | 381 |

Mêmes chiffres pour Quêtes › Histoire, Annexes et Aventure.

### Après 200 px de défilement (Quêtes, mêmes chiffres sur les trois onglets)

| Taille | Avant : bandeau replié / haut des onglets / touchables | Après : bandeau replié (bas) / onglets (haut, hauteur, boutons) / touchables | Village |
|---|---|---|---|
| 320 N | oui (107) / 2 px, sous le bandeau / 0 sur 3 | oui (104) / 104, 56, 44 px / 3 sur 3 | 104 / 104, 56, 44 / 4 sur 4 |
| 320 G | oui (113) / −5 px / 0 sur 3 | oui (109) / 109, 60, 49 px / 3 sur 3 | 109 / 109, 60, 49 / 4 sur 4 |
| 390 N | oui (107) / 37 px / 0 sur 3 | oui (104) / 104, 56, 44 px / 3 sur 3 | 104 / 104, 56, 44 / 4 sur 4 |
| 390 G | oui (113) / 34 px / 0 sur 3 | oui (109) / 109, 62, 49 px / 3 sur 3 | 109 / 109, 62, 49 / 4 sur 4 |

« Touchable » : `elementFromPoint` au centre du bouton tombe sur le bouton. Le bandeau des Quêtes se repliait déjà avant (classe `is-mini`) ; ce sont les onglets qui partaient avec le contenu sous le bandeau. Boutique et Donjon (sans bandeau illustré) : titre fixe hors défilement, comme Paramètres ou Ascension.

Partout (4 tailles, 7 écrans, avant et après défilement) : débordement horizontal 0 (page et zone de défilement), aucun élément hors de la zone, sauf le cas « Continuer + Abandonner » corrigé ci-dessus.

### Mode PC (1280 × 800)

| Écran | Avant | Après |
|---|---|---|
| Village | cadre à 128 px, contenu 804, haut du bandeau à 80 | — |
| Quêtes (deux colonnes) | contenu 804, haut du bandeau à 83 (3 px de `.subtab-page`) | contenu 804, bandeau à 80 |
| Boutique, Donjon | contenu 804, titre à 81 | contenu 804, titre à 78 |
| Donjon en cours | carte sans cadre | cadre « Donjon », contenu 804 |

Débordement 0, aucune erreur de page.

### Parcours vérifiés

`openQuestsAt("adventure")` ouvre Quêtes › Aventure ; Boutique › Potions ; défilement gardé au re-rendu (Boutique 300 px, Quêtes 250 px) ; Donjon : carte → feuille de lancement → départ (écran Combat) → Donjon en cours → « Reprendre le combat » → « Abandonner la tentative » (confirmation, retour au Camp). Aucune erreur.

## Changement de comportement à noter

- Quêtes : changer d'onglet (Histoire, Annexes…) ramène en haut de la liste, comme les onglets du Village (avant, la position était gardée d'un onglet à l'autre, et les onglets étaient alors hors de l'écran).

## Laissés

- Aucun.

## À signaler

- Pages à cadre sans bandeau illustré (Paramètres, Ascension, et désormais Boutique et Donjon) : la barre de titre `.kf-top` fait 100 % de largeur plus ses marges de 4 px et dépasse de 4 px à droite (coupée par le cadre, pas de défilement horizontal). Antérieur à cette version, non corrigé (règle commune à toutes ces pages).

Contrôles : `node --check` sur chaque JS modifié ; round-harness 6 568 OK, 0 échec (2 passes) ; boot 4 OK ; création 44 OK ; i18n 100 %, 0 orphelin ; parcours 232 OK, 0 échec.
