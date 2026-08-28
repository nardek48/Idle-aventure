# Changelog v3.89.0

Fondations du nouvel écran Quêtes : 4 catégories repliables (Histoire/Ressources/
Aventure/Expéditions), métadonnées de classification, nettoyage d'une quête obsolète et
d'une anomalie d'écriture ressources. Moteur d'Expéditions non-combat **non commencé**
(hors scope, comme convenu).

9 fichiers modifiés + 1 fichier supprimé, tous `node --check` validés (projet complet).
Comportements revalidés via harnais `node vm` ciblé : gates de progression (transition
inter-aventure + passage au monde suivant), rendu HTML des 4 sections, état vide
Expéditions, non-régression des popups début/fin existants.

---

## 1. Nettoyage (Étape A)

### Suppression de `aq_forest_collect`
Cette quête (type `collect`, ressource `mineraiRare`) était une quête très ancienne,
n'ayant plus lieu d'être (accord Seb). Elle portait `gatesNextWorld: true` — seule qu***ête
bloquant le passage Forêt→Désert. Pour préserver le rythme de progression actuel, une
nouvelle quête `aq_forest_depths` la remplace dans ce rôle : même `adventureIndex: 1`, même
récompense (600 or / 12 essence), mais en `type: "kill"` (20 ennemis en Cœur de la Forêt)
plutôt que `collect` — plus simple, pas de dépendance à une ressource dédiée.

### Suppression du fichier orphelin `js/systems/combat-sandbox-view.js`
Confirmé jamais chargé par `index.html` (seul `js/ui/combat-sandbox-view.js` l'est).
Redemandé explicitement par Seb en session — supprimé.

### Suppression de l'écriture directe dans `game.resources` (anomalie repérée à l'audit)
`AdventureQuestManager.onEnemyKilled()` contenait un bloc `step.type === "collect"` qui
écrivait directement dans `game.resources[step.resourceKey]`, en contournant
`WarehouseManager.addResource()`. Ce bloc n'était plus utilisé par aucune quête après la
suppression de `aq_forest_collect` (seule quête à utiliser `type: "collect"`) — supprimé
avec l'accord de Seb. Plus aucune écriture directe dans `game.resources` ailleurs que
`warehouse-system.js` (vérifié par recherche globale sur tout le projet).

### Nettoyage des résidus `mineraiRare`
Retirés de `js/core/state.js` (état initial + `restoreBaseState`) et des 4 emplacements
obligatoires de `js/systems/save-system.js` (`buildSaveData`, `loadGame`,
`hardResetState`, `fullResetState`). Sans impact sur les sauvegardes existantes — la valeur
resterait présente dans un save existant mais n'est plus régénérée/vérifiée sur les
nouvelles parties.

### Renommage `type: "expedition"` → `type: "transition"`
Champ interne de `adventure-quests.js` (`aq_forest_expedition`), utilisé par
`AdventureQuestManager.isTransitionUnlocked()` pour identifier la quête qui bloque le
passage entre deux aventures d'un même monde. Renommé pour éviter toute confusion avec le
nouveau champ `section: "worldexpedition"` introduit ce même changelog (voir plus bas) —
deux concepts différents qui ne doivent pas partager de nom. Seules 2 lignes concernées
(`adventure-quests.js` + `adventure-quest-system.js`), aucun autre fichier n'utilisait cette
valeur.

---

## 2. Métadonnées de classification (Étape B)

Nouveau schéma ajouté aux 8 quêtes existantes (3 Adventure + 4 World + 1 Hunt) :

```js
{
  section: 'worldexpedition' | 'resource' | 'adventure' | 'expedition',
  difficulty: 'easy' | 'medium' | 'hard',
  progressionStage: 'world_start' | 'world_mid' | 'world_end',
  category: 'main' | 'side'
}
```

**Nom du champ de catégorisation UI : `section`** (pas `type`, déjà utilisé en interne par
`adventure-quests.js` pour la logique de jeu kill/bossKill/transition — collision évitée).

- `section: "worldexpedition"` → catégorie UI **Histoire** (World Quests)
- `section: "resource"` → catégorie UI **Ressources** (Hunt Quests ; `type: "resource"`
  ajouté aussi en interne sur `HUNT_QUESTS`, qui n'avait pas de champ `type` auparavant)
- `section: "adventure"` → catégorie UI **Aventure** (Adventure Quests)
- `section: "expedition"` → catégorie UI **Expéditions** (réservée au futur moteur non-
  combat, aucune quête n'y est rattachée pour l'instant)

Valeurs `difficulty`/`progressionStage`/`category` définies quête par quête avec Seb (pas
de règle automatique généralisée — cas par cas comme demandé) :

| Quête | section | difficulty | progressionStage | category |
|---|---|---|---|---|
| `aq_forest_scout` | adventure | easy | world_start | side |
| `aq_forest_expedition` | adventure | easy | world_start | main |
| `aq_forest_depths` | adventure | medium | world_end | main |
| `wq_ruins` | worldexpedition | easy | world_start | main |
| `wq_crypt` | worldexpedition | medium | world_mid | main |
| `wq_mountain` | worldexpedition | medium | world_mid | main |
| `wq_tower` | worldexpedition | hard | world_end | main |
| `hq_forest_boar` | resource | easy | world_start | side |

---

## 3. Nouvel écran Quêtes (Étape C)

### `js/ui/quests-view.js`
Nouvelle structure à 2 niveaux dans le sous-onglet Général (Journalières inchangé) :

1. **Carte-catégorie repliable** (`buildQuestSectionCardHTML`) — une par section
   (Histoire/Ressources/Aventure/Expéditions), repliée par défaut à l'ouverture de l'écran.
   Affiche au repos : icône, nom, badge de compte (nombre de quêtes dans la section pour le
   filtre actif), chevron. Pattern visuel inspiré de `buildDungeonCardHTML`
   (`dungeon-view.js`), adapté sans bannière image (aucune illustration dédiée par
   catégorie n'existe).
2. **À l'intérieur d'une section dépliée** : regroupement par monde inchangé
   (`buildQuestCardsGroupedByWorldHTML`, logique existante réutilisée telle quelle), avec
   chaque quête individuelle toujours en carte repliable pour le détail
   (`buildCollapsibleQuestCardHTML`, comportement de fond intact).
3. **État vide élégant** par section quand elle ne contient aucune quête pour le filtre
   actif (`.eq-empty`, texte dédié par section) — la catégorie Expéditions l'affiche
   systématiquement pour l'instant.

**Nouveaux badges dans l'en-tête de chaque carte-quête** (`buildQuestBadgesHTML`) :
- Badge difficulté (Facile/Moyen/Difficile), couleur dédiée par palier
- Badge Principale/Secondaire selon `category`

**Filtre Actif/Terminée** : conservé strictement identique (global, en haut de l'écran,
au-dessus des 4 catégories) — pas de filtre par section.

**Ce qui n'a PAS changé** : les 3 managers (`AdventureQuestManager`/`HuntQuestManager`/
`WorldQuestManager`), leurs boutons d'action (Lancer/Chasser/Réclamer/Voir le
combat/Abandonner), les popups début/fin déjà en place — uniquement l'habillage/
l'assemblage visuel a évolué. `buildQuestCardsGroupedByWorldHTML` (regroupement par monde)
existe toujours à l'identique, simplement appelée depuis un niveau au-dessus désormais.

### `css/04-panel-quests.css`
Nouvelles classes `.quest-section-list`/`.quest-section-card`/`.quest-section-head`/
`.quest-section-icon`/`.quest-section-name`/`.quest-section-count`/
`.quest-section-chevron`/`.quest-section-body` (carte-catégorie), et
`.quest-badge`/`.quest-badge-difficulty`/`.quest-badge-main`/`.quest-badge-side` (badges
d'en-tête de carte-quête). Réutilise les tokens de couleur existants (`--nb-gold-dark`,
`--nb-cream-alt`, `--nb-frame`, etc.) et la keyframe `quest-card-detail-in` déjà définie
dans `06-map.css` — aucune duplication de style, aucune nouvelle palette introduite.

---

## Bump technique

### `sw.js`
`CACHE_VERSION` : 3.88.0 → 3.89.0.

---

## Fichiers à ne PAS avoir touchés (vérifié)

Conformément aux règles d'architecture validées en amont : `combat-engine.js`,
`stats-system.js`, `progression-system.js` (`WorldManager`), `warehouse-system.js`,
`game-loop.js`, `class-combat-system.js`, `dungeon-system.js`, `hunt-quest-system.js`,
`world-quest-system.js` (logique interne intacte, seul l'appel `openQuestCompletePopup`
préexistant de la session précédente reste en place, rien de nouveau). Confirmé par
recherche : aucun de ces fichiers n'apparaît dans le diff de cette livraison.

---

## Tests manuels à effectuer

1. **Écran Quêtes → Général** : les 4 catégories apparaissent repliées par défaut, avec un
   badge de compte cohérent. Dépliage/repliage individuel de chaque catégorie.
2. **Catégorie Histoire** : la questline de monde active (ex. Ruines si Crypte pas encore
   débloquée) s'affiche avec son détail habituel (étapes, récompense, bouton Réclamer si
   prête) — comportement de réclamation inchangé.
3. **Catégorie Ressources** : la Chasse Forêt s'affiche et se lance normalement (popup de
   début bloquant, combat, popup de fin bloquant avec relance).
4. **Catégorie Aventure** : `aq_forest_scout` (Secondaire) et `aq_forest_expedition`
   (Principale) se lancent normalement. **Nouveau** : `aq_forest_depths` (remplaçante de
   `aq_forest_collect`) apparaît et se termine en tuant 20 ennemis en Cœur de la Forêt —
   vérifier qu'elle débloque bien le Désert une fois terminée.
5. **Catégorie Expéditions** : état vide "Aucune quête disponible pour le moment." affiché
   proprement au dépliage.
6. **Filtre Actif/Terminée** : bascule correctement, chaque catégorie reste visible même
   vide côté Terminée.
7. **Badges** : difficulté et Principale/Secondaire visibles sur chaque carte-quête dans
   toutes les catégories.
8. **Sauvegarde existante** : charger une save d'avant cette version, vérifier qu'elle se
   charge sans erreur (résidu `mineraiRare` toléré silencieusement s'il existe déjà dans le
   save, pas de crash).
9. **Combat classique et Donjon** : aucun changement, à re-tester rapidement par prudence
   puisque `adventure-quest-system.js` (fichier partagé avec le combat) a été modifié.

## Points de vigilance pour Seb

- Le champ `type` interne de `adventure-quests.js` (`kill`/`bossKill`/`transition`) et le
  nouveau champ `section` (`worldexpedition`/`resource`/`adventure`/`expedition`) sont
  volontairement deux champs distincts sur les mêmes objets — à garder en tête pour toute
  future quête ajoutée à la main.
- La section "Ressources" ne contient qu'un seul type technique (`resource`, ex-`hunt`)
  pour l'instant — pas de sous-groupes internes cette session (confirmé pas nécessaire tant
  qu'il n'y a qu'une seule chasse), à revoir quand de nouvelles quêtes de récolte
  arriveront.
- Le moteur d'Expéditions non-combat n'a pas été commencé — la section correspondante
  reste vide, prête à accueillir du contenu quand ce chantier sera rouvert.
