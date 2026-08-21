# Aethervale — v3.50.0

**Étape 4a du Grimoire de tactiques : le MOTEUR de règles conditionnelles, avec 2 slots fixes.**

Première brique du vrai Grimoire — le joueur peut désormais programmer des règles simples
("si telle situation, alors telle action") qui pilotent le combat automatique, en plus (jamais à la
place) du comportement par défaut déjà en place depuis l'étape 1. Les jalons narratifs par monde
(déblocage progressif des slots) sont volontairement hors périmètre de cette livraison — acté avec
Seb comme une sous-étape 4b séparée, une fois ce moteur validé en conditions réelles.

## Design retenu (validé par Seb)

- **2 slots fixes** pour cette première livraison (pas encore liés à des jalons de monde).
- **4 cartes de condition**, cartes visuelles simples avec seuils cachés dans le moteur :
  - Charge imminente (`chargeIncoming`) — lit `game.enemy.chargeTelegraphUntil` (étape 2)
  - Bouclier imminent (`shieldIncoming`) — lit `game.enemy.shieldTelegraphUntil` (étape 3)
  - Soin imminent (`healIncoming`) — lit `game.enemy.healTelegraphUntil` (étape 3)
  - Je suis blessé (`heroLowHp`) — PV du héros ≤ 40% (seuil généreux, choix explicite pour rester
    accessible à un jeune public — mieux vaut réagir tôt)
- **N'importe quel slot de classe assignable, sauf `basic`** — décision affinée en cours de
  développement : en lisant le code de près, assigner `basic` à une règle aurait court-circuité le
  gain de ressource normalement lié à `CombatEngine.playerAttack()` (bug silencieux). Signalé à Seb,
  qui a tranché en faveur de l'exclusion plutôt que de complexifier `useSkill()`.
- **Repli garanti** : si aucune règle configurée ne matche à l'instant T (condition fausse partout,
  ou action indisponible pour toutes les règles qui matchent), le combat auto retombe sur
  `getAutoPolicyDefault()` — comportement strictement identique à avant v3.50.0. Un joueur qui ne
  configure aucune règle ne voit **aucun changement**.
- **Nouvel écran dédié** "Grimoire", accessible depuis le menu (icône 📖) et depuis Paramètres.

## Implémentation

- **`data/grimoire-conditions.js`** (nouveau) — catalogue pur des 4 cartes (`id`, `label`,
  `description`, `icon`), `GRIMOIRE_CONDITION_ORDER` pour un ordre d'affichage stable,
  `getGrimoireCondition()`.
- **`systems/combat-auto-policy-system.js`** (étendu, `chooseAutoAction()`/`sanitizeAutoPolicyList()`
  existantes **non touchées** — même contrat de pureté, aucun accès à `game.*`) :
  - `evaluateGrimoireCondition(conditionId, combatContext)` — vérifie une carte contre un contexte
    déjà résolu en booléens/nombres (jamais de `Date.now()` ici).
  - `chooseGrimoireAction(rules, kit, resourceState, cooldownState, combatContext)` — parcourt les
    règles dans l'ordre, retourne le premier `actionSlot` dont la condition est vraie **et**
    l'action réellement utilisable (`canUseAction()`, réutilisée telle quelle) ; une règle dont la
    condition matche mais l'action est indisponible (ressource/cooldown) est **sautée**, pas
    bloquante — passe à la règle suivante, cohérent avec le principe "jamais un mur silencieux".
  - `sanitizeGrimoireRules(rawRules, kit)` — nettoie les règles avant sauvegarde/lecture : filtre
    `conditionId` inconnu, `actionSlot` invalide ou `"basic"` (exclusion explicite, voir ci-dessus).
  - `GRIMOIRE_ASSIGNABLE_SLOTS` (`["skill1", "skill2", "skill3", "defense"]`),
    `HERO_LOW_HP_THRESHOLD_PCT` (0.40).
- **`systems/class-combat-system.js`** :
  - `getGrimoireCombatContext()` (nouveau) — sur-ensemble de `getCombatContext()` existant (non
    modifié), ajoute `chargeIncoming`/`shieldIncoming`/`healIncoming`/`heroHpPercent` en convertissant
    les horodatages `game.enemy.*` en simples booléens.
  - `tickAutoSkills()` (modifié) — essaie d'abord `chooseGrimoireAction()` si `game.grimoireRules`
    contient des entrées, retombe sur `chooseAutoAction()` + `getAutoPolicyDefault()` sinon/en repli.
    `"basic"` reste géré exactement comme avant (jamais via une règle, toujours via
    `tryAutoBasicAttack()`).
- **`ui/grimoire-view.js`** (nouveau) — écran d'édition : 2 cartes de règle, chacune avec un
  sélecteur de condition et un sélecteur d'action (filtré sur la classe du héros courant),
  descriptions affichées sous chaque sélection. `ensureGrimoireRules()` garantit toujours 2 entrées.
- **`ui/settings-view.js`** — bouton d'accès "📖 Grimoire de tactiques" dans la carte Combat.
- **`ui/menu-view.js`** — nouvelle entrée `{ tab: "grimoire", label: "Grimoire", icon: "📖" }`.
- **`ui/ui-root.js`** — route `case "grimoire"`.
- **`core/state.js`** — `game.grimoireRules: []` par défaut, garde de migration (validée via
  `sanitizeGrimoireRules()` quand disponible).
- **`systems/save-system.js`** — persistance dans `buildSaveData()`/`restoreBaseState()` ; **omis
  volontairement de `hardResetState()`** (préservé à l'ascension, même principe que
  `autoSkillsEnabled` depuis l'étape 1 — configuration stratégique du joueur, pas un état de run) ;
  remis à `[]` dans `fullResetState()`.
- **`css/04-panel-grimoire.css`** (nouveau) — styles des sélecteurs et cartes de règle, cohérents
  avec `.panel-card`/`.panel-sub` déjà en place.
- **`index.html`** — 4 insertions : script `grimoire-conditions.js` (avant
  `combat-auto-policy-system.js`), script `grimoire-view.js`, feuille de style
  `04-panel-grimoire.css`.
- **`sw.js`** — `CACHE_VERSION` → `3.50.0`.

## Tests effectués

- `node --check` sur les 9 fichiers `.js` modifiés/créés — OK.
- Harness `vm` (moteur pur) :
  - `evaluateGrimoireCondition()` : vrai/faux pour chaque carte, `heroLowHp` au bon seuil (35% → vrai,
    50% → faux), `false` systématique pour un `conditionId` inconnu.
  - `sanitizeGrimoireRules()` : conserve une entrée valide, nettoie un `conditionId` inconnu,
    **exclut bien `"basic"`**, exclut un `actionSlot` inconnu, neutralise une entrée `null`.
  - `chooseGrimoireAction()` : règle 1 matche quand sa condition est vraie et l'action utilisable ;
    règle 1 sautée (ressource insuffisante) → règle 2 prend le relais si sa condition est vraie ;
    retourne `null` si aucune condition n'est vraie ; retourne `null` sur un tableau de règles vide.
- Harness `vm` (intégration `ClassCombatManager`) :
  - **Non-régression** : sans règle configurée, comportement strictement identique à avant v3.50.0.
  - Règle "Je suis blessé → Garde" se déclenche correctement à 30% PV, cooldown de Garde posé.
  - Règle "Charge imminente → Frappe lourde" se déclenche correctement, cooldown de skill1 posé.

## Fichiers protégés / non censés bouger — intacts (vérifiés par checksum)

`combat-sandbox-system.js`, `combat-resource-system.js`, `combat-cooldown-system.js`, `classes.js`,
`class-skills.js`, `auto-policy-defaults.js`, `combat-engine.js` (patterns Charge/Bouclier/Soin des
étapes 2-3, aucune modification nécessaire — le contexte du Grimoire se construit entièrement à
partir des champs déjà posés sur `game.enemy`).

## Ce que cette étape NE fait PAS (volontairement, hors scope)

- Aucun jalon narratif par monde — les 2 slots sont fixes et toujours disponibles dès le début, le
  déblocage progressif est prévu pour une sous-étape 4b.
- Aucun preset nommé/sauvegardable, aucun feedback post-combat ("bouclier non contré : X% dégâts
  perdus") — prévu pour une étape ultérieure une fois le moteur de base validé par l'usage réel.
- Pas de glisser-déposer pour réordonner les règles — avec seulement 2 slots, l'ordre du tableau
  (édité slot par slot) suffit ; un vrai réordonnancement deviendra pertinent avec plus de slots.
- Aucun mode Expert (seuils numériques visibles/réglables) — les 4 seuils restent cachés derrière
  leurs cartes pour cette livraison.

## Prochaine étape

Sous-étape 4b (jalons narratifs par monde, débloquant progressivement de nouveaux slots) — ou,
selon retour d'usage de ce moteur, ajustement des seuils/patterns avant d'aller plus loin. À
discuter avec Seb selon comment cette première version du Grimoire se comporte en jeu réel.
