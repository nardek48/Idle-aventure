# Aethervale v3.429.20 — Boutique : plus de saccades en défilant

Retour de Seb (latences en défilant dans l'onglet d'achat des potions). S'applique sur la v3.429.19.

## La cause
- La boucle de jeu redessinait tout l'écran de la Boutique chaque seconde. Ce rafraîchissement servait aux minuteurs des anciennes potions ; les potions valent désormais pour le run, et `PotionManager.tick()` renvoie toujours `false`.
- Le rendu était identique d'une seconde à l'autre (5 552 caractères, mêmes octets) : la page était remplacée par elle-même en plein défilement.

## Le correctif
- `js/main/game-loop.js` (fichier protégé, accord explicite de Seb) : le redessin périodique de la Boutique est supprimé. Seul l'appel à `PotionManager.tick()` est gardé ; le reste de la boucle ne change pas.

## Mesure (Chromium 390×844, processeur ralenti ×4, 3,5 s de défilement)
| | Rendus complets | Tâches longues | Pire image | Images lentes |
|---|---|---|---|---|
| Avant | 8 | 4 (258 ms) | 100 ms | 3 |
| Après | 0 | 0 | 33 ms | 0 |

- Un achat met toujours le stock à jour (or 12 421 → 12 271, stock 2 → 3).

## Code
- `js/main/game-loop.js` : modification minimale.
- Aucun fichier ajouté.

## Contrôles
- Round : **3 963 OK**, 0 échec, sur trois passages. Boot : 4 OK. Création du héros : 44 OK.
- `node --check` sur les fichiers modifiés.
