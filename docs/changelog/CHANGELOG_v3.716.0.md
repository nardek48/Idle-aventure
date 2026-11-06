# v3.716.0 — Contres de groupe (06/11/2026)

Décision de Seb (06/11, option A), compte rendu de conception du 05/11 : prérequis du renforcement de la Charge.

## Changé
- **Le Grimoire voit l'annonce de n'importe quel ennemi du groupe** (Charge, Bouclier, Soin, Silence, Exaltation), plus seulement celle de la cible (`ClassCombatManager.getGrimoireCombatContext`).
- **Le contre annule l'annonce de son émetteur** : celui qui la jouera le premier (ordre des tours, une retenue de Clairvoyance passe après). Le coup reste sur la cible choisie. `CombatEngine.findAnnouncer` (nouveau), `rescheduleCounteredPattern(conditionId, emitter)` (fichier protégé `combat-engine.js`, accord de Seb).
- À un seul ennemi, rien ne change.

## Mesure (campagne 4 parties par classe, `--combats --joueur`)
| | v3.715 | v3.716 |
|---|---|---|
| Chevalier | 42,2 h · 2 morts | 57,6 h · 6 morts |
| Rôdeur | 53,5 h · 12 morts | 45,7 h · 6 morts |
| Mage | 44,4 h · 23 morts | 47,2 h · 20 morts |

Temps de combat inchangé (0,2 à 0,4 h par partie) : les écarts de durée viennent de l'attente de recharge des expéditions du robot (Chevalier 6,7 → 16,7 h, Rôdeur 13,8 → 9,0 h), pas du combat. Morts : 37 → 32.

## Contrôles
- `round-harness` : 6 640 contrôles, 0 échec (2 passes), dont 3 nouveaux (contre de groupe).
- boot, création du héros, i18n (0 manquant), parcours 232 OK.
