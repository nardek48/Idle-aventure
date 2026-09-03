# CHANGELOG v3.131.3

Correctif ciblé remonté par Seb (capture d'écran du Campement).

## "Les fondations" — progression compacte plus claire (Campement)

**Problème** : sur la carte compacte du Campement (résumé `MissionBoard.top(3)`), "Les
fondations" affichait juste "2/4" — un compteur brut d'étapes sans aucun contexte sur ce qu'il
reste concrètement à faire. La carte détaillée de l'écran Quêtes avait déjà été enrichie en
v3.131.0 (détail des 4 étapes avec statut), mais ce résumé compact du Campement n'en profitait
pas.

**Fix** : `progressLabel` de "Les fondations" devient le libellé concret de l'étape en cours
avec sa progression chiffrée — ex. `"Récolter 15 Pierre (2/15)"` au lieu de `"2/4"`. Réutilise
les données déjà présentes (`WORKSHOP_UNLOCK_STEPS[step].label` + `.progress(game)`), pas de
nouvelle donnée à maintenir.

Sur la carte détaillée de l'écran Quêtes, ce même `progressLabel` est désormais masqué quand le
détail des 4 étapes (`stepsDetail`) est déjà affiché — évite la redondance entre les deux blocs
(le libellé de l'étape en cours apparaissait deux fois).

**Portée** : ce correctif cible spécifiquement "Les fondations" (seul cas de compteur brut sans
contexte identifié — les autres types de mission affichent déjà un texte contextualisé : "Vague
X/Y", "X/Y objectifs", "Cœur X/10 · Règle X/1", etc.).

**Fichiers touchés** : `js/systems/mission-board-system.js`, `js/ui/quests-view.js`,
`round-harness.js` (7 nouveaux tests)

---

## Harness

797 OK, 0 échec.

## Fichiers touchés (récapitulatif)

- `js/systems/mission-board-system.js`
- `js/ui/quests-view.js`
- `sw.js` (CACHE_VERSION)
- `round-harness.js` (tests ajoutés)
