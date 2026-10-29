# v3.545.0 — Palette : 7 doublons de couleur fusionnés (audit INT-12)

Point de l'audit traité sur délégation de Seb (« je suis tes recommandations »), dans le périmètre que proposait l'audit : ne pas tout migrer.

## Ce qui change
- Les jetons sémantiques demandés par l'audit existaient déjà : encres de rareté (`--rarity-*-ink`, v3.525.0) et `--ink-missing` (v3.516.0).
- Sept paires de la palette brute, indiscernables à l'œil (moins de 3 ΔE), sont fusionnées. La palette passe de 113 à 106 jetons.

| Retiré | Remplacé par | ΔE |
|---|---|---|
| --c-cream-50 #fff8e8 | --c-cream-50-soft #fbf3e4 | 1,7 |
| --c-cream-150-soft #efe4cc | --c-cream-100-2 #f4e9d0 | 1,8 |
| --c-brown-950-2 #0b0806 | --c-black-950 #000000 | 2,6 |
| --c-green-650-4 #23843f | --c-green-650-2 #2f8a46 | 2,7 |
| --c-green-650-3 #2f8f4e | --c-green-650-2 #2f8a46 | 2,8 |
| --c-brown-950-3 #1a1006 | --c-brown-900-soft #1b1510 | 2,8 |
| --c-cream-150-3 #f3e6c4 | --c-cream-150-2 #efe0c2 | 2,8 |

- Les 204 hex et 457 rgba écrits en dur ne sont pas migrés : l'audit le déconseillait, puisque cela n'a aucun effet pour le joueur.

## Code
- 19 fichiers CSS : les `var(--c-…)` des jetons retirés (avec ou sans valeur de repli) pointent vers leur remplaçant, et `00-tokens.css` perd les 7 définitions.
- Aucun JavaScript, aucun fichier protégé ni ajouté.

## Contrôles
- Au pixel, 8 écrans à 390 px (sauvegarde de la Crypte), avant et après :
  - inchangés : Camp, Village, Quêtes, fiche de la Forge, Paramètres ;
  - changés : Héros (19,6 % des pixels, écart max 5/255), Entrepôt (3,3 %, 11/255), Hauts faits (0,2 %, 6/255).
  - Tous ces écarts restent invisibles à l'œil.
- Round : 5 392 OK, 0 échec, sur deux passes. Boot : 4 OK. Création du héros : 44 OK. Parcours : 139 OK.
