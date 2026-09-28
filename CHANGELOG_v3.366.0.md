# Aethervale v3.366.0 — Petites Aventures rechargeables, Ensablement du seul secteur tenté

Base : v3.365.0. Décisions de Seb du 28/09/2026, après un blocage en jeu à « La descente » (`desert_06`).

**Aucun fichier nouveau**, aucun fichier protégé touché, rien de neuf dans la sauvegarde : l'état reste dans `explorationProgression.petiteAventure`, déjà sauvegardé.

## 1. Les Petites Aventures se rechargent

On n'attend plus le lendemain.

- La **réserve** vaut le plafond du monde : 3 en Forêt, 4 au Désert, +1 avec la Carte de l'éclaireur.
- Une place dépensée revient **toutes les 4 h**, une à la fois (`SceneRunManager.PETITE_AVENTURE_RECHARGE_MS`). C'est une seule horloge, comme une jauge : une nuit de 8 h rend 2 places.
- Une sortie ratée (blessures, Souffle, mort) **rend toujours sa place** (D6), tout de suite, quel que soit le jour.
- **Refus affichés** :
  - carte vivante et départ : « Prochaine expédition dans 2 h 13 » ;
  - tableau des missions : « Dans 2 h 13 » sur la carte, « 3/4 disponibles » tant qu'il en reste.
- **Admin** : « Remplir la réserve » remplace « Remettre le jour à zéro » ; les places en plus (compteur négatif) marchent comme avant.
- **Migration** : l'ancien compteur du jour devient des places dépensées, et l'horloge part au chargement. Un compteur d'un autre jour donne une réserve pleine.

Fichiers : `js/systems/scene-run-system.js` (`_paState`, `petiteAventureNextInMs`, `formatPetiteAventureWait`, `petiteAventureWaitLabel`), `living-map-system.js`, `mission-board-system.js`, `js/ui/quests-view.js`, `js/ui/admin-view.js`, `js/core/state.js`.

## 2. Un échec ne reprend que le secteur tenté (option A)

**Avant** : un échec sur la carte (Recouvrement en Forêt, Ensablement au Désert) reprenait **un autre secteur**, le voisin libéré le plus éloigné du camp. Il pouvait refermer le chemin vers la zone visée, comme la verrerie avant la porte du Temple.

**Maintenant** :
- un échec ne reprend **que le secteur tenté**, et seulement s'il était déjà libéré (un rejeu) ;
- une première tentative ratée ne coûte que la sortie. Message : « Rien n'est perdu : tu n'as pas avancé, c'est tout. »

Ce qui reste en place :
- la Palissade et le frein des stèles protègent toujours, sur les rejeux ;
- mourir devant une élite répétable (l'Arbre-mère, le Dard) ensable l'élite elle-même, mais ne coupe plus le chemin ;
- `pickRegression()` reste dans le code, mais n'est plus appelé.

Fichier : `js/systems/living-map-system.js` (`onRunEnd`).

## 3. Mesures (campagne, 12 parties, vrais combats)

| | v3.365.0 (plafond du jour) | **Recharge 4 h** | Recharge 3 h (mesurée, non retenue) |
| --- | --- | --- | --- |
| Arrivée au bout de l'acte III (`desert_15`) | 58 h | **32 h** | 32 h |
| `desert_05` (stèles) | 24 h | **1,3 h** | 1,3 h |
| `desert_06` (la descente) | 6 h | **5,9 h** | 2,8 h |
| Attente de recharge, sur toute la partie | ~1 nuit | **3,1 h** | 0 h |
| Fin de partie | 98 h | **82 h** | 72 h |
| Murs | 0 | 0 | 0 |

Plafond théorique sur 24 h : 4 sorties avant, 10 à 4 h, 12 à 3 h. Un joueur qui passe matin, midi et soir en fera environ deux fois plus qu'avant : c'est autant de Verre des dunes, de Sève et de butin en plus.

Il restait 5,9 h médianes à `desert_06`. Ce sont surtout les sorties nécessaires pour atteindre la porte du Temple, plus l'attente.

## 4. Harnais

- `round-harness.js` : nouvelle section **[143]** (recharge, migration, affichage, onRunEnd). Les sections [PA1], [57], [58], [60], [100] et [135] passent à la nouvelle règle.
- `sim/campagne-harness.js` : attend la **prochaine place**, plus le lendemain. Il compte les heures d'attente (`capWaitH`) et accepte `--recharge H` pour le banc.
- `sim/campagne-lot.js` : `--recharge H` et `--tag nom` (dossier de sortie à part).
- `sim/parcours-harness.js`, **P7** : quand le tirage ne donne aucun combat et que le parcours s'achève de lui-même (blessures), P7 ne cherche plus le bouton « Rentrer au camp ». C'était la cause de ses échecs aléatoires, déjà présents en v3.359.0.

`GAME_VERSION` et `CACHE_VERSION` : **3.366.0**.
