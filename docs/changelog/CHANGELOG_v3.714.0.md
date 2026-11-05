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

Campagne `node tools/sim/campagne-lot.js . --combats --joueur --n 4` (12 parties, 12/12 au bout), comparée au lot de v3.708. Entre les deux : v3.709 (Tir perforant traverse), v3.713 (priorité Tir perforant au repli), v3.710–3.712 (coque du téléphone, sans effet sur la simulation) et ce changement.

| | v3.708 | v3.714 |
|---|---|---|
| Durée médiane (p25–p75 ; min–max) | 44,1 h (42,0–45,6 ; 40–58) | **52,6 h** (48,0–56,1 ; 42–69) |
| Forêt · Désert · Ruines | 2,2 · 3,0 · 4,6 h | 2,4 · 2,8 · 4,7 h |
| Crypte · Montagne · Tour | 8,5 · 13,4 · 12,3 h | 10,8 · 13,1 · 16,3 h |
| Temps actif (dont combat) | 6,2 h (1,6) | 6,7 h (1,8) |
| Atelier · soin au camp · recharge | 13,9 · 10,0 · 9,6 h | 14,5 · 11,7 · 11,2 h |
| Attente de Cire de sépulcre (médiane, max) | 2,0 h (6) | 5,0 h (14) |
| crypte_05 · tour_07 · montagne_11 | 2,5 · 7,2 · 3,3 h | 5,3 · 9,2 · 3,7 h |
| Morts Chevalier · Rôdeur · Mage | 4 · 8 · 24 | 9 · 6 · 38 |

Lecture : le lot est plus lent, mais pas à cause du Périple. Dans la campagne, l'anneau d'un run vient de l'intensité du secteur de la carte vivante (les Petites Aventures du tableau restent au Sentier) : le changement ne peut qu'ajouter des rares là où un secteur Périple est joué. La hausse vient de l'attente de Cire (crypte_05, max 14 h sur une partie), de la recharge (tour_07) et des morts du Mage (19 sur une partie), trois postes que ni v3.714 ni les versions du Rôdeur (v3.709, v3.713) ne touchent, et le Rôdeur meurt moins (8 → 6). Le lot n'a pas de graine : deux lots de 12 parties diffèrent de cet ordre (v3.708 allait déjà de 40 à 58 h). Les contrôles de livraison ont tourné pendant ~10 min de la campagne (le temps réel écoulé entre dans l'horloge simulée, effet de quelques minutes). À confirmer, si Seb le souhaite, par un second lot au calme ; aucun chiffre engagé sur cette mesure.

Contrôles : round 6 637 OK (2 passes, avant 6 635), boot 4 OK, création 44 OK, parcours 232 OK, i18n 100 % / 0 orphelin. `node --check` sur chaque JS modifié. Aucun fichier protégé touché. Aucun fichier ajouté.
