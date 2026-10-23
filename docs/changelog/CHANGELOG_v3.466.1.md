# v3.466.1 — Potions du sac sans bouton Utiliser ; 3 images inutilisées supprimées

Deux demandes de Seb.

## Potions : plus de bouton « Utiliser » dans le sac du héros
On prend désormais les potions dans la préparation de sortie : les potions à bonus se boivent au départ, les potions de soin s'emportent et se boivent en combat. Le bouton « Utiliser » de la fiche d'une potion, dans le sac du héros, faisait double emploi. Il est retiré pour toutes les potions, soin et bonus. À sa place, une ligne dit où la potion se boit :
- soin : « Se boit en combat : la préparation de sortie dit combien tu en emportes. » ;
- bonus : « Se boit au départ, dans la préparation de sortie. »

Le bouton « Vendre » reste. Les objets de combat avaient déjà une fiche sans bouton d'usage.

## Images supprimées
Les 3 images devenues inutilisées au lot 9, que plus rien ne cite (vérifié dans le jeu, les outils et les ateliers) :
- `images/UI/badges/badge-shield.webp`
- `images/Buttons/bouton-attaque.webp`
- `images/Borders/nom-ennemi.webp`

Elles ne sont pas précachées par `sw.js` (les images se mettent en cache au fil du jeu) : rien à retirer du précache.

## Code
- `equipment-view.js` : fiche d'une potion (`buildUnifiedDetailPanelHTML`).
- `en.js` : 2 textes, et « Utiliser » retiré (orphelin).
- Aucun fichier protégé, aucun fichier ajouté.

## Contrôles
- Harnais [280] : ni « Utiliser » ni appel de potion dans la fiche, l'indication est là, « Vendre » reste.
- Chromium, 320 px, sac du héros, potion de soin : seul le bouton « Vendre », indication affichée, rien ne déborde.
- i18n 100 %, aucun orphelin ; `missing-icons.js` : aucune image absente.
- round-harness 4645 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
