# v3.714.0 — Périple : 5 matériaux rares à la destination

Décision de Seb (05/11, option A). Aucun état sauvegardé nouveau, aucun fichier ajouté, aucun fichier protégé touché.

## Corrigés / livrés

- **Récompense de destination du Périple (anneau 3) : 4 → 5** dans les six mondes (Forêt, Désert, Ruines, Crypte, Montagne, Tour) : `PA2_RARE.<monde>.dest = { 1: 2, 2: 3, 3: 5 }` (`js/data/pa2-content.js`). Lu par `Pa2Run.finish("dest")` ; les bonus (Mémoires, carte vivante, rumeur, accroche) s'ajoutent comme avant.
- Textes : aucun texte du jeu (aides, légendes de carte, fiches, `en.js`) ne citait « 4 » pour le Périple, rien à corriger. Seul le commentaire d'en-tête de `tools/sim/seve-bench.js` est mis à jour.
- Quoi de neuf : une ligne FR + EN (`js/ui/news-view.js`, `js/lang/en.js`).
- `tools/harness/round-harness.js` : [478] (nouveau, 2 contrôles) : `dest` 2 / 3 / 5 dans les six mondes ; destination réelle d'un Périple (gardien abattu, sans Mémoire ni rumeur) en Forêt, Désert, Ruines et Crypte : `end.rare` = 5 et +5 à l'Entrepôt.

## Mesures

`node tools/sim/seve-bench.js .` (Forêt, 300 runs × 12 cellules par anneau, hors récompense de secteur, Mémoires et rumeur), comparé au relevé de v3.708 :

| Anneau | Destination | KO | Sève trouvailles | Sève destination | **Sève / run** v3.708 → v3.714 | Sève / jour (3 places) |
|---|---|---|---|---|---|---|
| Sentier | 97 % | 3 % | 0,41 | 2,03 | 2,43 → **2,44** | 7,3 |
| Chemin | 89 % | 7 % | 0,43 | 2,75 | 3,18 → **3,18** | 9,5 |
| Périple | 67 % | 18 % | 0,38 | 3,43 | 3,17 → **3,82** | 11,5 |

Le Périple passe devant le Chemin (+20 %) ; attendu ≈ 3,9, obtenu 3,82 (destination atteinte 67 % au lieu de 68 %). Par étape, le Périple va de 3,1–3,2 Sève/run à l'acte I à 4,6–4,8 au niveau 12. Village au niveau max (160 Sève) : 42 runs (14 jours) au Périple, contre 51 (17 jours) au Chemin.

Campagne (`campagne-lot.js --combats --joueur --n 4`) : en cours au moment de livrer, ajoutée dans un commit séparé.

Contrôles : round 6 637 OK (2 passes, avant 6 635), boot 4 OK, création 44 OK, parcours 232 OK, i18n 100 % / 0 orphelin. `node --check` sur chaque JS modifié. Aucun fichier protégé touché. Aucun fichier ajouté.
