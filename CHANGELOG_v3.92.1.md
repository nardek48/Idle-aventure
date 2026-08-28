# Changelog v3.92.1 — La Veine Instable (activité répétable) déplacée vers Quêtes > Ressources

Ajustement de placement suite au retour de Seb sur la v3.92.0 : l'activité de récolte
répétable ne doit pas vivre dans l'écran Production, mais dans la catégorie Ressources de
l'écran Quêtes (aux côtés de la Chasse). La carte de la quête d'expédition elle-même
("La Veine Instable", one-shot) disparaît normalement de la liste active dès qu'elle est
réussie — comportement déjà en place, non modifié.

4 fichiers modifiés, `node --check` OK sur le projet complet. Comportement revalidé via
harnais `node vm` : carte absente avant déblocage, quête d'expédition qui bascule vers
Terminée, carte d'activité qui apparaît, Production qui n'affiche plus jamais le bloc,
redirection correcte au clic sur "Retour aux quêtes".

---

## `js/ui/production-view.js`
Retrait complet du bloc "Veine Instable" (`buildQuarryBonusActivityHTML()` supprimée,
l'appel conditionnel dans `buildProductionCardHTML()` retiré). La carte Carrière
elle-même (production passive, niveau, récolte, amélioration) reste strictement
inchangée — seul le bloc bonus a été retiré.

## `js/ui/quests-view.js`
Nouvelle entrée dans `collectActiveQuestCardEntries()`, section `"resource"` (même
catégorie que la Chasse) : carte repliable `quarry_bonus_vein` (pattern
`buildCollapsibleQuestCardHTML`, identique aux autres cartes de quête), visible **en
permanence** tant que `MiningManager.isQuarryUnlocked()` — pas de notion de "terminée"
pour une activité répétable, donc jamais dans `collectCompletedQuestCardEntries()`.
Nouvelle fonction `buildQuarryBonusQuestDetailHTML()` : statut (Prête / Recharge dans
mm:ss / Session en cours) + bouton "Miner la veine". La carte de la quête d'expédition
(`exploration_unstableVein`) continue de suivre son comportement déjà en place : elle
disparaît de la liste active dès `MiningManager.isQuestCompleted()`, remplacée par son
entrée dans la liste Terminée — rien à changer là, déjà conforme à la demande.

## `js/ui/mining-view.js`
`closeMiningComplete()` : redirige désormais systématiquement vers `switchTab("quests")`
au clic sur le bouton de fin, pour les **deux** sources (`quest` et `quarry_bonus`) — les
deux vivent maintenant dans l'écran Quêtes, plus de distinction nécessaire. Libellé du
bouton uniformisé à "Retour aux quêtes" dans les deux cas (auparavant "Fermer" pour
l'activité bonus, qui n'avait plus de sens une fois relocalisée).

## `css/04-panel-mining.css`
Retrait des classes devenues orphelines (`.production-bonus-activity*`,
`.production-bonus-btn`) — la carte réutilise désormais entièrement le style existant des
cartes de quête (`.map-quest-*`), aucun nouveau CSS nécessaire pour ce changement.

---

## Tests manuels à effectuer

- Avant réussite de "La Veine Instable" : aucune carte "Veine Instable" dans Quêtes >
  Ressources, aucun bloc bonus dans Production (juste absent, pas grisé).
- Réussir la quête (au moins 1 coup non-manqué) : la carte quête disparaît de la liste
  active de la catégorie Expéditions, réapparaît dans l'onglet Terminée avec le message
  "Carrière déverrouillée".
- Immédiatement après : une nouvelle carte "Veine Instable" apparaît dans Quêtes >
  Ressources (repliée par défaut, comme la Chasse), se déplie au clic et affiche le
  bouton "Miner la veine".
- Écran Production : la carte Carrière reste visible et fonctionnelle (production
  passive, récolte, amélioration), mais plus aucun bloc bonus dessous.
- Lancer une session depuis la carte Ressources : jauge, 3 coups, popup de fin avec bouton
  "Retour aux quêtes" qui ramène bien sur l'écran Quêtes.
- Cooldown : après une session, la carte affiche "Recharge dans mm:ss", bouton désactivé,
  redevient "Prête" après 10 minutes (y compris après rechargement de page).
- Rechargement de page en pleine session d'activité bonus : reprise correcte, aucun
  reroll (comportement déjà validé en v3.92.0, non affecté par ce déplacement).
