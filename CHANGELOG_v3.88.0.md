# Changelog v3.88.0

Session « améliorations diverses » : armes liées aux classes, arme de départ, nouvelle
recette d'Entrepôt, template de popup début/fin pour les quêtes.

14 fichiers modifiés, tous `node --check` validés (y compris l'ensemble du projet, pas
seulement les fichiers touchés). Comportements clés revalidés via harnais `node vm` ciblé
(filtre loot par classe, génération arme starter, refus/acceptation à l'équipement,
déséquipement auto, structure des nouvelles recettes).

---

## 1. Armes bloquées par classe

### `js/data/classes.js`
Chaque classe déclare désormais `weaponIcons` (liste des icônes d'arme compatibles) :
- Chevalier (`knight`) : `["sword", "axe"]`
- Archer (`archer`) : `["bow"]`
- Mage (`mage`) : `["staff"]`

Nouvelle fonction `getAllowedWeaponIconsForCurrentHero()` : renvoie les icônes autorisées
pour `game.heroId` courant (fallback : toutes les icônes si classe introuvable, pour ne
jamais bloquer un état inattendu).

### `js/systems/loot-system.js`
`generateEquipmentItem()` : quand `slot === "weapon"`, l'icône tirée au hasard est
restreinte au pool `getAllowedWeaponIconsForCurrentHero()` au lieu de la liste complète
`config.icons`. Aucun autre slot n'est affecté.

### `js/systems/equipment-system.js`
- `EquipmentSystem.equip()` : refuse désormais d'équiper une arme dont l'icône n'est pas
  compatible avec la classe active (toast d'avertissement, aucune modification d'état).
- Nouvelle fonction `isWeaponIconAllowedForCurrentHero(icon)`.
- Nouvelle fonction `unequipIncompatibleWeapon()` : si l'arme actuellement équipée n'est
  plus compatible (typiquement après un changement de héros), la retire automatiquement
  vers l'inventaire (jamais supprimée).

**Point de vigilance accepté (validé avec Seb) :** une classe peut looter plusieurs
icônes d'arme (Chevalier = épée ET hache) — pas de restriction stricte 1 icône = 1 classe.

---

## 2. Arme de départ liée à la classe (1 dégât tap)

### `js/systems/equipment-system.js`
Nouvelle fonction `equipStarterWeapon()` : génère un vrai item d'équipement réel (via
`generateEquipmentItem("weapon", "common")`), force son icône/nom à la première arme
autorisée pour la classe active, force `value: 1`, puis l'équipe directement au slot
`weapon` (sans passer par l'inventaire). Vendable/remplaçable normalement comme n'importe
quel loot — pas de verrou spécifique.

### `js/ui/modal-view.js`
`confirmHeroSelection()` (création de héros neuf) : appelle `equipStarterWeapon()` si
aucune arme n'est déjà équipée. `game.equipped` venant d'être remis à zéro par
`createInitialGameState()` en amont, ce cas correspond systématiquement à une vraie
création.

### `js/ui/heros-view.js`
`selectHeroInline()` (changement de héros en cours de partie, sans reset) : appelle
`unequipIncompatibleWeapon()` puis `equipStarterWeapon()` si le slot arme est vide après
coup — garantit qu'un héros a toujours une arme correspondant à sa classe, sans jamais
softlocker le joueur sans arme.

---

## 3. Petite ration (Eau + Viande)

### `js/data/recipes.js`
Nouvelle recette `petite_ration` : 5 Eau + 5 Viande → 1 Petite ration, station `workshop`
(même atelier que la Ration classique), `craftTimeMs: 4000` (contre 8000 pour la Ration
classique — lot plus rapide).

### `js/data/hunt-quests.js`
Nouvelle entrée `WAREHOUSE_RESOURCES.petite_ration` (nom, description, `sellPrice: 18`,
tier `crafted`, cap 999). Icône réutilisée depuis `ration_icon.png` en attendant une icône
dédiée si souhaitée plus tard.

### `js/systems/save-system.js`
Ajout de `petite_ration: 0` aux 4 emplacements obligatoires de `game.resources`
(`buildSaveData`, `loadGame`, `hardResetState`, `fullResetState`) — cohérent avec le
protocole de save existant.

### Refactor structurel : plusieurs recettes par ressource brute
`viande` et `eau` étant désormais chacune intrant de DEUX recettes (`ration`/
`petite_ration` pour `viande`, `pain`/`petite_ration` pour `eau`), l'ancien système
`RECIPE_BY_INPUT` (1 recette par ressource, `viande` aurait silencieusement pointé
uniquement vers la dernière recette déclarée) ne suffisait plus.

- `js/data/recipes.js` : nouvelle structure `RECIPES_BY_INPUT` (map ressource → tableau de
  recettes). `RECIPE_BY_INPUT` (singulier) est conservé tel quel pour compat mais n'est
  plus la source de vérité de l'UI.
- `js/ui/warehouse-view.js` : nouvel état `selectedWarehouseRecipeId` + fonction
  `selectWarehouseRecipe()`. `buildWarehouseCraftBlockHTML()` affiche désormais des onglets
  de sélection de recette quand une ressource a plusieurs débouchés (ex: cliquer sur
  « Viande » propose Ration ET Petite ration, sélectionnables). `adjustWarehouseCraftQty`,
  `confirmCraftWarehouseResource`, et le hint « rien à faire » utilisent la nouvelle
  fonction `getSelectedWarehouseRecipe()`.
- `css/04-panel-village.css` : nouvelles classes `.warehouse-craft-recipe-tabs` /
  `.warehouse-craft-recipe-tab` (styles cohérents avec les tokens existants, pas de
  nouvelle palette).

---

## 4. Template de popup début/fin pour les quêtes

### État constaté avant travaux (important pour comprendre le scope réel)
- **Chasses (Hunt quests)** avaient déjà le pattern complet : popup de début bloquant
  (`openHuntQuestIntro`) et popup de fin bloquant (`openHuntLotComplete`).
- **Quêtes d'aventure (Adventure quests)** avaient déjà le popup de début
  (`openAdventureQuestIntro`) mais **pas** de popup de fin — seulement un `showToast`
  fugace, d'où l'ambiguïté remontée (« on sait pas si on fait toujours la quête »).
- **Questlines de monde (World quests)** n'ont pas de notion de « début » (progression
  passive en tâche de fond via `trackKill`/`trackBossKill`/`trackLoot`, réclamation
  manuelle) — pas de popup de fin non plus, seulement un toast.
- **Quêtes journalières** (3 tirées au hasard/jour) : hors scope de cette session (décision
  Seb) — pattern différent (pas de « début » à proprement parler), toast conservé tel quel.

### `js/ui/quests-view.js`
Nouveau composant générique, prévu pour toute future quête :
- `buildQuestCompleteHTML(config)` — construit le HTML du popup de fin à partir d'un objet
  `{ icon, title, text, rewardRows[], closeLabel, extraActionLabel, extraActionOnclick }`.
  Réutilise le CSS existant (`dungeon-story-card`, `dungeon-summary-rewards`) — aucun
  nouveau CSS nécessaire pour ce point.
- `openQuestCompletePopup(config)` / `closeQuestCompletePopup()` — ouverture/fermeture sur
  l'ancrage partagé `#adventure-quest-modal-root` (déjà dans `BLOCKING_MODAL_IDS` du
  game-loop, donc bloquant par nature — cohérent avec la demande).
- `buildHuntLotCompleteHTML()` refactorée pour utiliser `buildQuestCompleteHTML()` en
  interne (même rendu visuel, aucun changement de comportement pour les Chasses).
- `openHuntLotComplete`/`closeHuntLotComplete` conservées comme wrappers (compat), pas de
  renommage d'API publique.

### `js/systems/adventure-quest-system.js`
`AdventureQuestManager.finish()` : appelle désormais `openQuestCompletePopup()` (récap.
or/essence) en plus du toast existant, uniquement en cas de succès (`onDefeat`/`forfeit`
ne déclenchent pas le popup — cohérent avec « progression conservée mais pas terminée »).

### `js/systems/world-quest-system.js`
`WorldQuestManager.claim()` : appelle `openQuestCompletePopup()` (récap. or/essence/Aether/
objets obtenus) après réclamation manuelle réussie.

---

## Bump technique

### `sw.js`
`CACHE_VERSION` : 3.87.0 → 3.88.0.

---

## Points de vigilance pour Seb

1. **Icône `petite_ration`** : réutilise `ration_icon.png` faute d'asset dédié fourni.
   Remplaçable facilement (`WAREHOUSE_RESOURCES.petite_ration.icon` dans
   `js/data/hunt-quests.js`).
2. **Arme starter et sauvegardes existantes** : `equipStarterWeapon()` ne s'exécute que si
   `game.equipped.weapon` est vide au moment de la création/changement de héros. Une
   sauvegarde déjà en cours (héros existant avec arme déjà équipée) n'est pas rétroactivement
   modifiée — comportement volontaire (pas de perte de progression sur une save existante).
3. **`RECIPE_BY_INPUT` (singulier) conservé mais déprécié** : encore présent pour éviter de
   casser un appel externe non repéré, mais toute nouvelle UI doit utiliser
   `RECIPES_BY_INPUT` (pluriel). À terme, `RECIPE_BY_INPUT` pourra être supprimé si confirmé
   inutilisé ailleurs.
4. **Daily quests non touchées** : décision explicite de Seb en session, pattern
   volontairement différent (pas de popup bloquant, toast conservé).

## À faire côté Seb

- Tester en jeu : loot d'arme par classe, création de personnage (arme starter visible dans
  l'UI Équipement), changement de héros avec arme incompatible, craft de la Petite ration
  (onglet Viande ET onglet Eau doivent maintenant proposer un choix de recette), fin de
  quête d'aventure et de questline de monde (popup bloquant avec bouton de validation).
