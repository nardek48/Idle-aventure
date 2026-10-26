# v3.504.0 — Grand écran, lot GE-4 : fiches à droite, Héros en trois colonnes

Suite de l'option B du compte rendu grand écran (accord de Seb du 26/10). Format large seulement : **le téléphone ne change pas**.

## Ce qui change sur grand écran
| Avant | Maintenant |
| --- | --- |
| Les feuilles du bas (fiche de bâtiment, de production, emplacement, stats, titres…) montaient en bas de l'écran, sur 480 px, avec un voile sombre sur toute la page. | Elles s'ouvrent en **fiche de droite** (440 px, du bandeau au bas de la fenêtre), par-dessus la Chronique, **sans voile** : la page reste lisible. Un clic hors de la fiche la ferme, comme avant. Les fiches courtes (titres, créature) gardent leur hauteur. |
| Héros › Résumé en une colonne étirée : bannière, chiffres, tuiles. | **Trois colonnes** : le héros (médaillon entier, nom, XP, Mes héros) · son équipement (silhouette ; un emplacement ouvre directement sa fiche à droite) · ses chiffres (PV, Attaque, Défense, Critique en 2 × 2, Entraînement, Capacités, Mémoire, Ce que tu portes). |
| Critique du Résumé écrite « 8.6 % » (relevé du compte rendu). | « 8,6 % », à la française, sur téléphone aussi. |

Combat, Petites aventures et cartes vivantes gardent leurs feuilles actuelles (lot GE-5).

## Mesures (Chromium, partie avancée aux Ruines)
- Fiche de droite : x 990 → 1430 à 1440 × 900, 916 → 1356 à 1366 × 768, 730 → 1170 à 1180 × 820 ; aucune barre horizontale.
- Résumé : colonnes de 260 / 380 / 268 px (1440 × 900) et 247 / 327 / 260 px (1366 × 768).
- Téléphone 390 × 844 : feuilles en bas comme avant (0 → 390 px).

## Code
- `css/10-grand-ecran.css` : section « lot GE-4 ».
- `js/ui/heros-screens-view.js` : Résumé en trois colonnes quand `html.wide-mode` ; `slotBtn` accepte l'action du clic ; critique passée par `formatNumber`.
- Aucun fichier ajouté, aucun fichier protégé.

## Contrôles
`round-harness` 5 187 OK, 0 échec (deux passes ; section [329] ajoutée) ; `boot-harness` 4 OK ; `hero-creation-harness` 44 OK ; `parcours-harness` P11 15 OK.
