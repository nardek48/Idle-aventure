# Aethervale v3.379.1 — Petites corrections d'affichage (retour Seb, capture iPhone)

Base : v3.379.0.

## 1. Journal : « Bague offert à l'Aether »

Le message n'accordait pas avec l'objet. Il prend une tournure neutre, qui marche pour tous les objets :

| Avant | Après |
| --- | --- |
| Bague offert à l'Aether (+3) | Offert à l'Aether : Bague (+3) |
| … offert à l'Aether — cet objet ne porte aucun souvenir | Offert à l'Aether : … — cet objet ne porte aucun souvenir |

Anglais : « Offered to the Aether: Ring (+3) ». Les anciennes lignes déjà écrites dans le Journal restent telles quelles.

## 2. HUD : les PV du héros coupés sous l'avatar

« 623 / 895 » passait sur deux lignes, et le « 895 » disparaissait sous l'avatar.
- Le texte est écrit sans espaces (« 623/895 ») et ne passe plus jamais à la ligne.
- Au-delà de 1 000, un format court : 1.2K, 45K, 1.5M. Avant, « 1.23K / 1.58K » aurait débordé de la jauge.
- Mesuré au pixel dans Chromium sur 4 largeurs (320, 375, 390, 430 px), avec 623/895, 1.2K/1.5K et 45K/99K : le texte tient toujours dans la fenêtre de la jauge. Au pire, 43 px de texte pour 48 px de fenêtre.

## 3. Journal, Bilan de la partie : libellés tronqués

- « Ennemis vainc… » : un libellé trop long passe maintenant à la ligne au lieu d'être coupé.
- « Hist… » : l'Histoire (« Ch. 2 terminé ») est déplacée en dernière position. Elle occupe désormais seule toute la largeur, à la place d'« Aether gagné », qui rejoint la grille.

## Fichiers modifiés

- `js/systems/memory-system.js` (message d'offrande) et `js/lang/en.js` ;
- `js/ui/hud-view.js` (`hudHpShort`), `css/02-layout.css` ;
- `js/ui/achievement-view.js` (ordre du Bilan), `css/04-panel-achievements.css` ;
- `js/core/constants.js`, `sw.js` (3.379.1).

Aucun fichier nouveau, aucun fichier protégé.

## Contrôles

| Contrôle | Résultat |
| --- | --- |
| round-harness.js ([85] neutralisée) | 3 626 OK, 0 échec |
| boot-harness.js | 4 OK |
| Audit i18n | 100 %, 0 orphelin, 0 {paramètre} différent |
| Captures, Journal à 375 px, français et anglais | aucun libellé tronqué |
