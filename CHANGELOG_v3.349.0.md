# Aethervale v3.349.0 — Portraits de Wenna et Maddoc

Base : v3.348.0.

**Aucun fichier JS nouveau** (précache inchangé, sauf `CACHE_VERSION`). **Aucun fichier protégé touché.**

| Fichier | Qui |
| --- | --- |
| `images/Companions/wenna.png` | Wenna. Portrait dédié : elle prenait jusqu'ici `images/Heroes/ranger_f.png`, qui reste au héros rôdeur |
| `images/Companions/maddoc.png` | Maddoc (icône générique jusqu'ici) |

400 × 400, PNG transparent, médaillon au cadre doré. Même cadrage que les portraits de héros, vérifié côte à côte avec `ranger_f.png`. Dossier `images/Companions/` **nouveau**.

`js/data/companions.js` : le chemin de Wenna passe à `./images/Companions/wenna.png`. Celui de Maddoc était déjà le bon.

## Contrôles

| Contrôle | Résultat |
| --- | --- |
| round-harness.js ([85] neutralisée) | 0 échec |
| boot-harness.js | 4 OK |
| missing-icons.js | 7 → **6 absentes** : les 6 fonds de monde que plus aucun code ne lit |

## Fichiers

- `images/Companions/wenna.png`, `images/Companions/maddoc.png` : **NOUVEAUX** (hors précache)
- `js/data/companions.js`
- `js/core/constants.js` (`GAME_VERSION`), `sw.js` (`CACHE_VERSION`)
