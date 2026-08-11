# CHANGELOG — v2.90.11 (Correctif critique — sauvegarde du donjon séquentiel)

## Bug trouvé en auditant le code pour la mise à jour de la doc
`game.dungeonTierCleared` (progression de déblocage séquentiel des
paliers de donjon, ajoutée en v2.90.9) n'était référencé nulle part
dans `js/systems/save-system.js` :
- Absent de `buildSaveData()` → jamais écrit dans la sauvegarde.
- Absent de `loadGame()` → jamais restauré au chargement.
- Absent de `hardResetState()` (reset d'ascension) → pas géré comme
  progression permanente.
- Absent de `fullResetState()` (reset complet) → pas remis à zéro
  explicitement.

**Conséquence concrète** : un joueur qui termine le palier 1 et
débloque le palier 2 perdrait cette progression au moindre
rechargement de page (fermeture d'onglet, relance de la PWA, etc.) —
le palier 2 redeviendrait verrouillé alors qu'il avait été mérité.

## Correctif — `js/systems/save-system.js`
Ajouté aux 4 endroits, en suivant exactement le même traitement que
`dungeonBossClears`/`dungeonShopLevels` (déjà correctement gérés,
servent de modèle) :
- `buildSaveData()` : `dungeonTierCleared: game.dungeonTierCleared || {}`
- `loadGame()` / `restoreBaseState()` : restauration avec repli sur
  `{}` si absent (sauvegardes antérieures à ce correctif).
- `hardResetState()` : conservé across ascension (même philosophie
  que le Codex, les Hauts faits, la Boutique du donjon — une
  progression permanente ne doit pas être effacée par le prestige).
- `fullResetState()` : remis à `{}`, comme le reste du donjon.

## Tests effectués
- `node --check` : OK.
- Harnais Node.js (vrais fichiers, cycle complet en 4 étapes) :
  1. Palier 1+2 marqués terminés, sauvegarde effectuée.
  2. Simulation d'un rechargement de page complet (nouvel objet
     `game` vierge) + `loadGame()` : progression bien restaurée.
  3. `hardResetState()` (ascension) : progression bien conservée.
  4. `fullResetState()` (reset complet) : progression bien remise à
     zéro.

## sw.js
`CACHE_VERSION` incrémenté à `"2.90.11"`.

## Recommandation
Livraison à déployer en priorité — c'est un correctif de bug, pas une
nouvelle fonctionnalité, et il concerne une mécanique livrée hier
(v2.90.9) probablement pas encore beaucoup jouée par de vrais joueurs.
