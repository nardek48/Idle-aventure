# v3.784.0 — Simplification : l'Enchanteresse ne relance plus (13/11/2026)

Décision de Seb (13/11) : l'équipement se résume à trois fonctions.
- **Butin** : trouver de meilleures pièces.
- **Forge** : renforcer.
- **Enchanteresse** : remplacer un affixe indésirable.

La relance répétée des valeurs, qui augmentait les mêmes chiffres, est retirée. Aucun fichier protégé modifié, aucun changement de sauvegarde (les compteurs `rerolls` déjà posés sur les affixes restent, sans effet), aucun fichier ajouté.

## Ce qui change
- **`systems/enchant-system.js`** : retrait de `reroll`, `getCost`, `canAfford`, `getRerollCount` et `getRange`.
  - `getBlockReason` ne garde que les verrous communs (bâtiment, rareté, héros en expédition, ligne).
  - L'or se vérifie au prix de la transmutation. Le prix de la transmutation ne change pas (2 relances de base, ×1,55 par transmutation de la ligne).
- **Fiche de l'Enchanteresse** (`ui/village-building-view.js`) : segments **Transmuer · Éclats**, Transmuer par défaut. Retirés : l'établi Relance, le calcul du gain d'une relance et `rerollAffix`.
- **Doigté de l'Enchanteresse** (boutique d'Éclats) : −10 % d'or par niveau, **sur la transmutation**.
- **Bulle d'or** (`ui/or-a-investir-view.js`) : plus de « relancer une ligne ». La transmutation est un choix de stat, pas un achat conseillé.
- **Fil rouge** (objectifs) : l'Enchanteresse « transmute » au niveau 2 ; l'objectif « Bonus au maximum » est retiré.
- **Textes** : description et effet du bâtiment ; 5 textes nouveaux, 25 orphelins retirés de `en.js`.
- **Robot** (`tools/sim/campagne-harness.js`) : n'achète plus de relances (ni pendant l'Histoire ni dans le relevé d'après-Histoire).

## Mesure
Robot, une partie complète (`--combats --joueur`) : 0 mort, aucun mur, Tour finie à 19,7 h, 178 k or en fin de partie. La relance était un puits d'or illimité : l'or en trop sera repris par la fin de partie (talents infinis).

## Contrôles
- `round-harness` 7109 OK, 0 échec, sur 2 passes.
  - [38b] devient le contrôle de la transmutation seule.
  - [47b] la fiche (Transmuer, Éclats), [127] le Doigté sur la transmutation, [279] la transmutation, [360] le retrait du calcul de relance, [499] la bulle d'or.
- boot 4 OK ; création du héros 46 OK ; parcours complet 236 OK ; i18n 100 %, 0 orphelin.
- Quoi de neuf : une ligne (FR + EN).
