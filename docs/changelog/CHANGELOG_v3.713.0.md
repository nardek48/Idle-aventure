# v3.713.0 — Tir perforant « dès que prêt » au repli

Décision de Seb (05/11). Aucun état sauvegardé nouveau, aucun fichier ajouté, aucun fichier protégé touché.

## Corrigés / livrés

- **Tir perforant (Rôdeur), priorité « dès que prêt »** au repli par défaut (conseil doré, Grimoire sans règle applicable, robot de campagne) : hors recharge, avec la Concentration suffisante, il passe avant Tir précis et Rafale ; hors recharge sans la Concentration, attaque de base pour la garder. Restent devant : le contre d'une annonce en cours, la Défense quand COMB-1 la justifie (annonce contrée ou PV ≤ 40 %), la veine. Une règle explicite du Grimoire qui s'applique prime (son choix n'est pas touché), réserve et « Varier » respectés. Logique reprise de la variante « pret » de `tools/sim/tir-perforant-bench.js`, appliquée au seul repli.
  - Donnée : `AUTO_POLICY_HOLD_SLOT` / `getAutoPolicyHoldSlot` (`js/data/auto-policy-defaults.js`, Rôdeur seul) ; décision : `applyFallbackHold` en fin de `_chooseRoundAction` (`js/systems/class-combat-system.js`, non protégé).
  - Écart au banc : en attente de Concentration, une Défense justifiée par COMB-1 passe avant l'attaque de base (le banc jouait l'attaque de base, cas qu'il ne rencontrait pas : ses sauvegardes ont une règle charge → Défense).
  - Le conseil doré lit `chooseRoundAction(false)` : même décision que le robot (contrôlé au harnais).
  - `ignoreAffinity` (exemption de Tir perforant au malus « sans arme ») gardé, non renommé.
- Quoi de neuf : une ligne FR + EN (`js/ui/news-view.js`, `js/lang/en.js`).
- `tools/harness/round-harness.js` : [477] (nouveau, 10 contrôles) : Rôdeur seul concerné, Tir perforant prêt et payable joué, Concentration gardée, recharge = Tir précis, contre de soin, Esquive sur charge, Défense sous 40 % PV, règle explicite prioritaire, Chevalier inchangé, `ignoreAffinity` gardé.

## Mesures

`node tools/sim/tir-perforant-bench.js . --variante actuel` sur le jeu v3.713, mêmes sauvegardes et tirages que le relevé de décision :

| Contenu | Jeu v3.712 (« actuel ») | Banc « pret » | Jeu v3.713 |
|---|---|---|---|
| D2 Sphinx (niv. 13, 40 runs) | 100 %, 2,5 TP/run, part 5 %, 306 dég./round | 100 %, 8,2, 19 %, 315 | 100 %, 8,3, 19 %, 314 |
| D3 Varrek (niv. 18, 40 runs) | 95 %, 2,1, 5 %, 802 | 100 %, 5,4, 13 %, 808 | 98 %, 5,4, 13 %, 803 |
| D4 Liche (niv. 22, 40 runs) | 100 %, 4,7, 17 %, 3 046 | 98 %, 4,8, 17 %, 3 029 | 100 %, 4,9, 17 %, 3 040 |
| D5 Wyrm (niv. 26, 40 runs) | 100 %, 8,3, 19 %, 10 850 | 100 %, 8,4, 19 %, 10 938 | 100 %, 8,4, 20 %, 10 942 |
| Dragon (niv. 26, 120 runs) | 91 %, 8,6, 27 %, 11 297 | 90 %, 8,7, 27 %, 11 276 | 88 %, 8,6, 27 %, 11 289 |

Part de Tir perforant sur les boss : Sphinx 7 → 21 %, Varrek 3 → 17 %, Liche 18 %, Wyrm 18 %, Dragon 18 % (inchangés). D3 : une défaite sur 40 (98 %), Dragon −3 points (4 runs sur 120) : dans le bruit des tirages, dégâts/round identiques.

## Hors version du jeu

- `tools/sim/tir-perforant-bench.js` : note « depuis v3.713.0, actuel inclut pret ».

Contrôles : round 6 635 OK (2 passes, avant 6 625), boot 4 OK, création 44 OK, parcours 232 OK, i18n 100 % / 0 orphelin. `node --check` sur chaque JS modifié. Aucun fichier protégé touché, aucun fichier ajouté.
