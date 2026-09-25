# Aethervale v3.346.0 — Icônes des ressources du Désert

Base : v3.345.0. Les **5 ressources** du Désert qui n'avaient pas d'icône.

**Aucun fichier JS nouveau** (précache inchangé, sauf `CACHE_VERSION`). **Aucun fichier protégé touché.**

| Fichier | Ressource |
| --- | --- |
| `images/Icons/resources/bloc_taille_icon.png` | Bloc taillé |
| `images/Icons/resources/chitine_profondeurs_icon.png` | Chitine des profondeurs |
| `images/Icons/resources/outre_pleine_icon.png` | Outre pleine |
| `images/Icons/resources/verre_des_dunes_icon.png` | Verre des dunes |
| `images/Icons/resources/verre_trempe_icon.png` | Verre trempé (la vitre bleu-vert, comme le demandait le prompt) |

400 × 400, médaillon de pierre sombre, coins transparents. Même style que `stone_icon`, `iron_icon` et `water_icon`, vérifié côte à côte. La planche avait 8 médaillons : 3 variantes écartées (sac cerclé de fer, galet à spirale, seconde vitre bleutée).

## Contrôles

| Contrôle | Résultat |
| --- | --- |
| round-harness.js ([85] neutralisée) | 0 échec |
| boot-harness.js | 4 OK |
| missing-icons.js | 16 → **11 absentes** : 3 icônes (clé, doigté, tir de Maddoc), 2 portraits, 6 fonds de monde que plus aucun code ne lit |

## Fichiers

- les 5 PNG ci-dessus : **NOUVEAUX** (hors précache)
- `js/core/constants.js` (`GAME_VERSION`), `sw.js` (`CACHE_VERSION`)
