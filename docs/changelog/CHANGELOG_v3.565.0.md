# v3.565.0 — Fiche de l'Apothicaire allégée

Retour de Seb : la fiche de l'Apothicaire avait beaucoup trop de lignes, une par recette acquise. Option A retenue, validée sur captures avant et après.

## Changements
- **Les recettes acquises tiennent en une ligne repliée**, « ✓ N recettes acquises › » (pluriel géré). Un toucher la déplie en pastilles, et elle reste dépliée jusqu'à ce qu'on la referme.
- **La ligne « Effet actuel » disparaît** pour l'Apothicaire : « Aujourd'hui : x / N préparations (Soin mineur libre) » disait la même chose.
- **Le titre « Commandes » ne s'affiche que s'il reste une commande à livrer.** Les commandes en cours (ingrédients, bouton « Livrer ») et les commandes verrouillées restent affichées en entier.

## Mesure (vrai jeu, 390 px, Apothicaire niveau 6, 13 recettes acquises)
| | Avant | Après |
|---|---|---|
| Lignes | 19 | 6 |
| Hauteur de la fiche | 1 364 px | 909 px |

À 320 px, la fiche tient sans débordement, liste dépliée comprise.

## Fichiers
- `js/ui/village-building-view.js` : `buildApothecaryOrdersHTML`, `apothecaryLearnedOpen`.
- `css/04-panel-village.css` : styles `.vb-learned*`.
- `js/lang/en.js` : « {n} recette acquise » au pluriel, l'ancienne entrée retirée.

Aucun fichier ajouté.
