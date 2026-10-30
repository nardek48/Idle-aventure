# v3.577.0 — Petites Aventures, lot 2 : les jets au d20

Proposition validée par Seb le 30/10 (« ta proposition me semble bien ») : le dé à 6 faces laisse place à un **d20 à la manière de D&D**, avec un détail du jet lisible, et chaque classe a **une force et une faiblesse**.

## La règle
- **Jet** : d20 + bonus ≥ DD. Le 20 naturel réussit toujours, le 1 naturel rate toujours (chance entre 5 et 95 %). Trois points sous le seuil : **de justesse** (comme avant).
- **Bonus de stat** : +1 tous les 35 points au-delà de 30 (plafond +9). Stat entraînée comprise.
- **Classe** (triangle validé) :
  - Chevalier : Force +2, Précision −2 ;
  - Rôdeur : Précision +2, Endurance −2 ;
  - Mage : Endurance +2, Force −2.
  La voie forte du Rôdeur lit aussi sa Célérité, celle du Mage sa Volonté : leur entraînement principal compte.
- **Objets et reliques** : chaque cran vaut +3. **Blessure** : −2 par blessure.
- **DD** : 8 de base, monte avec le monde (+0,5 par monde), la profondeur (+1 toutes les 3 étapes), l'anneau et la difficulté de l'obstacle.
- **Avantage** (deux dés, le meilleur garde) : mécanique prête, aucune source pour l'instant (à décider avec Seb).

Banc `tools/sim/pa2-jets-bench.js` (nouveau), au milieu d'une aventure : voie forte ~78 %, voie moyenne ~55 %, voie faible ~44 %.

## Affichage
- Le dé est un **d20 dessiné** (SVG), la valeur au centre ; il roule de 1 à 20.
- « **Il faut 9+** » avec la chance : « Probable · 60 % ». « 2+ » au plus bas, « 20 » quand seul le naturel passe.
- **Détail du jet** sur chaque choix : « Puissance +2 · Chevalier +2 · matériel +3 · blessure −2 · DD 8 ». Chaque terme reste d'un bloc à la coupure de ligne, le coût en Souffle aussi.
- **20 naturel** : dé vert, « 20 naturel : réussite d'office ». **1 naturel** : dé rouge, « 1 naturel : échec d'office ».
- Après le jet, un rendu de la feuille garde la valeur tombée (avant : la face 1).

## Code
- `js/data/pa2-content.js` : `PA2_D20` (réglages) et `PA2_CLASS_VOIES` (force et faiblesse).
- `js/systems/pa2-run.js` : `statMod`, `masteryOf`, `checkStat`, `dc`, `chanceOf`, `roll` au d20, `_check` détaillé ; la chance est gardée dans le résultat.
- `js/systems/scene-run-system.js` : l'instantané du héros garde Célérité et Volonté (`rawStat`, base + entraînement, même règle que `stats-system.js`, qui n'est pas touché).
- `js/ui/pa2-view.js`, `css/04-panel-pa2.css` : le d20, le seuil, le détail, les naturels.
- `js/lang/en.js` : textes anglais ; trois anciennes chaînes du d6 retirées.
- **Fichier ajouté (outillage, hors jeu)** : `tools/sim/pa2-jets-bench.js`. Aucun fichier ajouté au jeu, aucun fichier protégé, aucun nouvel état sauvegardé.

## Contrôles
`round-harness` 5 541 OK, 0 échec (trois passes ; contrôles du d6 mis à jour, nouvelle section [381]) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` 142 OK ; audit i18n 100 %, 0 orphelin. Rendu vérifié sous Chromium à 390 × 844 et 1440 × 900 (Chevalier, Mage avec 20 naturel, Rôdeur avec 1 naturel).
