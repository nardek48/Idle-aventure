# Changelog v3.91.0 — Jalon A : réorganisation des rations

Casse le verrou circulaire Atelier ↔ Carrière repéré à l'analyse : la Petite ration
nécessitait l'Atelier niveau 1, dont le coût inclut de la Pierre — ressource produite
uniquement par la Carrière, que la 2e expédition (Jalon B, à venir) doit débloquer.
Boucle fermée cassée.

2 fichiers modifiés, `node --check` OK sur tout le projet. Comportement revalidé via
harnais `node vm` : `canCraft` sans/avec Atelier, regroupement `RECIPES_BY_INPUT`,
compatibilité d'une commande de craft déjà en file au moment de la mise à jour.

---

## `js/data/recipes.js`

### `RECIPES.petite_ration`
- `station`: `"workshop"` → `null` (accessible dès le début, sans Atelier).
- `inputs`: `[{eau,5},{viande,5}]` → `[{viande,5},{eau,2}]`.
- `craftTimeMs`: `4000` → `3000`.
- `label`: `"Petite ration"` inchangé.

### `RECIPES.ration`
- `label`: `"Ration"` → `"Ration moyenne"` (fallback d'affichage uniquement — la vraie
  source affichée dans l'écran Entrepôt est `WAREHOUSE_RESOURCES.ration.name`, voir
  ci-dessous).
- Recette elle-même (`inputs`/`station`/`craftTimeMs`) **inchangée** : 10 Viande + 1 Pain,
  Atelier niveau 1, 8000ms — correspondait déjà exactement à la spécification "Ration
  moyenne" du document, aucun changement de valeurs nécessaire.

## `js/data/hunt-quests.js` (`WAREHOUSE_RESOURCES`)

- `ration.name`: `"Ration"` → `"Ration moyenne"`, description mise à jour (mention
  "expéditions les plus exigeantes").
- `petite_ration.desc` mise à jour : retrait de la mention Atelier (plus vraie), ajout
  "sans Atelier — pour les expéditions simples de début de monde".
- Aucun ID renommé (`ration` et `petite_ration` conservés à l'identique) — uniquement les
  champs `name`/`desc`.

---

## Ce qui n'a PAS changé

- `RECIPES.pain` : intact, logique et prérequis Atelier préservés comme demandé.
- Aucune structure de sauvegarde modifiée (`game.resources`, `game.craftQueue`) — aucune
  migration nécessaire, ID historiques conservés.
- `js/systems/warehouse-system.js` : aucune modification nécessaire, le système est déjà
  générique (`station: null` déjà géré nativement par `canCraft()`).
- Aucun fichier protégé touché.

---

## Compatibilité sauvegardes / file de craft (vérifié)

- Une commande `petite_ration` déjà en file d'attente au moment de la mise à jour se
  termine normalement : la file ne référence que `recipeId`/`times` (les intrants ont
  déjà été déduits à l'enqueue sous l'ancienne recette), seul l'`output` au moment du tick
  dépend de la recette actuelle — aucune perte, aucun plantage, testé via harnais vm.
- Le stock déjà accumulé de `petite_ration`/`ration` reste inchangé.
- Aucun champ renommé côté `game.resources` — les deux ID (`ration`/`petite_ration`)
  restent strictement identiques à avant.

---

## Tests manuels à effectuer

- **Nouvelle partie** : Petite ration visible et craftable sans Atelier (recette 5 Viande
  + 2 Eau, 3 secondes).
- **Nouvelle partie, sans Atelier** : Ration moyenne visible mais grisée/bloquée
  ("Nécessite Atelier de Construction (niveau 1)").
- **Avec Atelier niveau 1** : Pain et Ration moyenne redeviennent craftables normalement.
- **Tuile Viande dans l'Entrepôt** : propose bien les 2 recettes (Ration moyenne + Petite
  ration) via les onglets déjà en place depuis v3.88.0.
- **Tuile Eau** : propose bien Pain + Petite ration.
- File de craft : lancer une Petite ration, vérifier le nouveau coût/temps appliqué.
- Annulation d'une commande de craft en cours → remboursement des bons intrants (5 Viande
  + 2 Eau pour Petite ration désormais, pas les anciens 5 Eau + 5 Viande).
- Rechargement de page pendant un craft de Petite ration → cohérent, pas de doublon ni de
  perte.
- Ancienne sauvegarde (v3.90.x ou antérieure) : aucune erreur au chargement, le stock
  existant de `ration`/`petite_ration` est conservé tel quel, affiché sous les nouveaux
  libellés ("Ration moyenne" pour l'ancienne `ration`).
- Production, Construction, Combat : aucun changement de comportement observable (aucun de
  ces systèmes n'a été touché).

---

## Prochaine étape

Jalon B (quête "La Veine Instable" + déblocage progressif de la Carrière + minijeu de
récolte) — **en attente de ta validation du Jalon A en jeu** avant de commencer, comme
convenu. Je détaillerai à ce moment l'architecture retenue pour le minijeu (probable
nouveau module dédié plutôt qu'extension du moteur `ExplorationManager` existant, celui-ci
étant structurellement pensé pour un résultat unique par run et non 3 coups cumulatifs).
