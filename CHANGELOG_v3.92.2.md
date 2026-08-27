# Changelog v3.92.2 — Correctif : quête verrouillée à tort sur une sauvegarde avec Carrière déjà migrée

Sur une sauvegarde ayant reçu la migration `quarryUnlocked: true` (Carrière déjà
débloquée nativement avant l'existence de cette quête, cf. v3.92.0), la carte "La Veine
Instable" restait affichée dans la liste **Active** avec le message de verrou "La
Carrière est déjà déverrouillée", au lieu de basculer dans **Terminée** comme les vraies
réussites.

1 fichier modifié, `node --check` OK, non-régression confirmée sur tous les tests
existants (harnais vm).

---

## Cause

`MiningManager.isQuestCompleted()` ne testait que
`game.explorationProgression.unstableVeinDiscoveryCompleted` — un flag qui n'est mis à
`true` que lors d'une **vraie** réussite du minijeu (3 coups joués). La migration
`quarryUnlocked` (v3.92.0), elle, ne touche jamais ce flag puisque ces sauvegardes n'ont
jamais réellement joué la quête. Résultat : `isQuestCompleted()` retournait `false`
(carte dans Active), mais `checkQuestRequirements()` refusait quand même de la relancer
(`quarryUnlocked` déjà `true`) — état incohérent visible en jeu.

## `js/systems/mining-system.js`

`isQuestCompleted()` considère désormais la quête comme terminée dès que **l'une ou
l'autre** des deux conditions est vraie : `unstableVeinDiscoveryCompleted` (vraie
réussite) OU `quarryUnlocked` (Carrière acquise, par réussite ou migration). Dans les
deux cas, la Carrière est de toute façon acquise — la carte doit refléter cet état,
peu importe comment il a été atteint.

Aucun autre comportement modifié : le texte affiché ("✔ Carrière déverrouillée") reste
approprié dans les deux cas, la carte d'activité répétable dans Ressources continue de
s'afficher normalement dès que `quarryUnlocked` est vrai (déjà correct, non affecté par
ce bug).

---

## Tests manuels à effectuer

- Charger une sauvegarde antérieure à v3.92.0 (ou toute sauvegarde ayant `quarryUnlocked`
  migré à `true` sans avoir joué la quête) : la carte "La Veine Instable" doit apparaître
  directement dans l'onglet **Terminée** de la catégorie Expéditions, jamais dans Active.
- Vérifier que la carte d'activité répétable ("Veine Instable" dans Ressources) est bien
  présente et fonctionnelle pour ce même profil de sauvegarde.
- Non-régression : une nouvelle partie qui réussit vraiment la quête (3 coups joués)
  continue de basculer correctement vers Terminée, comme avant ce correctif.
