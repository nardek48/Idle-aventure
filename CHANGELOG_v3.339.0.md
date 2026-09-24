# Aethervale v3.339.0 — Icônes des Hauts faits

Base : v3.338.0. Pose des 35 icônes des nouveaux hauts faits, découpées dans les deux planches générées.

**Aucun fichier JS nouveau** (précache inchangé, sauf `CACHE_VERSION`). **Aucun fichier protégé touché.**

## Fichiers

| Fichier | Nature |
| --- | --- |
| `images/Icons/achivement/hf_*.png` (35) | **NOUVEAUX** — hors précache, mis en cache par le service worker au premier affichage |
| `css/04-panel-achievements.css` | `.hf-ico` : plus de bordure ni de fond CSS, `object-fit: contain` |
| `js/core/constants.js` | `GAME_VERSION` 3.339.0 |
| `sw.js` | `CACHE_VERSION` 3.339.0 |

## Les icônes

- Nommées `<id>.png`, exactement comme le chemin que construit `data/achievements.js` (`ACH_ICON + a.id + ".png"`). Les noms du guide des planches (`hfforestpalisade.png`, sans les `_`) n'auraient pas été trouvés par le jeu.
- 256 × 256, PNG avec coins transparents. Contrôle : 35 identifiants `hf_` dans le catalogue = 35 fichiers, aucun écart.
- **Planche Forêt / Désert** : cases carrées d'environ 290 px, gardées telles quelles.
- **Planche Grimoire / Village / Compagnons** : cases en portrait (~180 × 207) avec un cadre plus fin. On garde la peinture, recadrée au carré (perte d'environ 15 % en haut et en bas), et on la replace dans le cadre de la première planche : **un seul cadre pour les 35**.
- La planche Forêt / Désert était exportée **semi-transparente** (alpha 0,6 à 0,98 à l'intérieur des cases). Les cases sont rendues opaques dans leur contour, sinon le fond de la carte transparaissait (sable du Désert troué).
- Liseré rouge des bords (résidu du détourage) repeint en bronze sombre.

## Retouche CSS (`.hf-ico`)

Les icônes portent leur cadre peint. La bordure dorée de 1,5 px et le fond CSS faisaient un double cadre, déjà visible sur les anciennes icônes `ach_*` (elles ont aussi le leur). `object-fit: contain` au lieu de `cover` : les anciennes icônes (274 × 257) ne sont plus rognées. Grisé des hauts faits non obtenus inchangé.

## Contrôles

| Contrôle | Résultat |
| --- | --- |
| round-harness.js ([85] neutralisée) | 0 échec, 3 309 à 3 311 OK, 3 passages (même base que la v3.338.0) |
| boot-harness.js | 4 OK |
| hero-creation-harness.js | 44 OK |
| Rendu Chromium 390 px, DPR 3 | 44 × 44 px, bordure 0, aucune image cassée ; états verrouillé, à réclamer, réclamé |

`missing-icons.js` ne voit toujours pas les hauts faits (chemin construit à l'exécution) : il reste à 81 absentes, sans changement.

## À vérifier sur iPhone

- Lisibilité des cinq scènes de paysage à 44 px : village, entrepôt, champs, voyageur à l'aube, camp vide.
- Recadrage des icônes de la seconde planche : rien d'important perdu en haut ou en bas.
