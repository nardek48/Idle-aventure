# CHANGELOG v3.256.0 — Cartes Vivantes, lot C-2 : la Forêt jouable

**Base :** v3.255.0 (à installer avant) · **Delta :** 19 fichiers, dont 3 nouveaux, aucun supprimé · `CACHE_VERSION` et `GAME_VERSION` → `3.256.0`

La carte vivante de la Forêt devient jouable de bout en bout : on l'ouvre depuis la Carte du monde ou depuis la carte de mission « Petite aventure », on touche un secteur, on part ; l'expédition ou le combat d'élite se joue avec les moteurs existants, et la brume recule — ou avance — au retour.

Décisions prises avec Seb le 15/09/2026 avant le code : **combat d'élite direct dès C-2** (deux insertions dans `combat-engine.js`), **carte vivante en sous-vue de l'onglet Carte** (pas de nouvel onglet), **retour sur la carte après le bilan d'un run ciblé**. Rayon 19 % et brume 36 % validés sur iPhone.

---

## Nouveaux fichiers

| Fichier | Rôle |
|---|---|
| `js/ui/living-map-view.js` | La vue : en-tête (secteurs libérés, Sève, Palissade), carte carrée à quatre calques (image nue, brume des voilés, trame du Recouvrement, liens du secteur sélectionné), nœuds à 44 px, amers en réserve, panneau de secteur (état, lore, contenu, effet, récompense, bouton ou raison du mur), boutons « Le monde » (popup) et « Carte du monde ». Rendu 100 % chaîne HTML, masques en style inline. |
| `css/04-panel-living-map.css` | Styles `.lm-*` portés de l'atelier C-0, plus la ligne de bilan et le bandeau de secteur de l'écran Expédition. Fonds crème enregistrés dans `00-kframe-scope.css`. |
| `atelier-cartes.html` | L'atelier C-0, posé à la racine avec les autres ateliers (il manquait au dépôt). Hors jeu, non précaché. |

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `js/systems/combat-engine.js` (**protégé**, accord Seb) | Deux insertions de 4 lignes, même forme que les dispatchs voisins : dans `onHeroDefeated` après la chasse (`LivingMapManager.onFightLost()`), dans `killEnemy` après la quête d'aventure (`LivingMapManager.onFightWon(enemy)`). Rien d'autre. |
| `js/systems/living-map-system.js` | `start(mapId, sectorId)` (expédition ou élite), `startEliteFight` (sortie en contexte `mapelite`, décor du monde, `EliteManager.spawn`), `getFight`, `respawnFightEnemy`, `onFightWon`, `onFightLost`, `abandonFight`. `game.livingMaps.fight` porte le combat en cours (sur le seul champ déjà câblé en sauvegarde ; annulé à l'Ascension). `canStart` gagne trois murs : Village fermé, sortie déjà en cours, PV à zéro. |
| `js/systems/scene-run-system.js` | `startRun(templateId, opts)` accepte `opts.livingMap` ; `chooseProfile` pose l'intensité de l'anneau sans écran (décision 8) ; `_generateCard` fusionne les pools du secteur dans le gabarit ; les cinq fins de run (`leaveNow` → neutre, `_evacuate` / `abandon` / `onCombatDefeat` → échec, `resolveFinale` → succès) rapportent à `LivingMapManager.onRunEnd`, une seule fois par run (`run.livingMapReport`). |
| `js/systems/sortie-system.js` | Contexte `mapelite` (libellé, `detectContext`, fuite → `LivingMapManager.abandonFight()`). |
| `js/systems/quest-enemy-system.js` | `respawnActiveRunEnemy` fait reparaître l'élite d'un combat de carte au rechargement. |
| `js/systems/mission-board-system.js` | La carte « Petite aventure » ouvre la carte de la Forêt au lieu de lancer un run (décision 7) ; texte adapté. |
| `js/ui/map-view.js` | `buildMapHTML` délègue à la carte vivante ouverte ; toucher un monde qui a une carte l'ouvre (`tapMapWorld`), un monde sans carte garde sa popup. |
| `js/ui/scene-view.js` | Écran de profil : bandeau du secteur (nom, intensité imposée, lore) ; bilan : ligne « ce que la carte en a fait » et un seul bouton « Retour à la carte » ; `leaveSceneScreen` ramène sur la carte pour un run ciblé. |
| `js/ui/combat-view.js` | Compteur de mission « Camp des toiles · Élite » pendant un combat de carte. |
| `css/00-kframe-scope.css` | `.lm-head`, `.lm-pill`, `.lm-panel`, `.scene-map-report` ajoutés à la restauration d'encre. |
| `index.html`, `sw.js`, `js/core/constants.js` | Un script, une feuille, versions bumpées. |
| `round-harness.js` | Bloc **[58]**, 49 assertions. Bloc [57] aligné sur la porte du Village. Bloc [55] : la comparaison élite/vague passe de 20 à 80 tirages (4,6× sortait une fois sur cinq — un test qui échoue au hasard est un test à réparer). |

## Ce que le joueur voit

- **Carte du monde → Forêt** : la carte vivante, 9 nœuds, brume sur ce qui n'a jamais été libéré, trame froide et ✕ sur ce que le Recouvrement a repris, liseré doré sous la Palissade. Un voilé hors d'atteinte est estompé ; un voilé au front est nommé à partir du niveau 5 de Palissade.
- **Panneau** : le mur parle toujours — « Rien ne mène encore là. Libère d'abord Pont du gué. », « La brume attend encore ailleurs : Campement. », « Plus d'expédition aujourd'hui. », « Tes PV sont à zéro. » Un voilé dont le nom est masqué dit « Partir », jamais son contenu.
- **Expédition ciblée** : l'écran de profil rappelle le secteur et son intensité ; pas d'écran d'intensité. Les obstacles sont ceux du lieu (rivière et gouffre au gué, porte scellée et paroi aux menhirs, araignées à l'Arbre doré). Bilan avec la ligne de carte (« Cercle des menhirs est libéré. +8 Sève d'Aeswyn. » ou « Le Recouvrement a repris… Reprends-le depuis… »), puis retour sur la carte, secteur sélectionné. Mort en nœud combat : retour au Campement comme partout, message en toast.
- **Camp des toiles** : la première fois, la Fileuse aux yeux blancs paraît en combat direct, décor de Forêt, « Camp des toiles · Élite » au compteur. Victoire : secteur libéré, +12 Sève, retour sur la carte. Fuite ou mort : échec de secteur (décision 4). Ensuite, expédition Périple aux reprises (décision Seb). L'objet unique de la Fileuse reste la récompense de sa quête d'aventure.
- **Tableau de missions** : « Petite aventure » ouvre la carte ; un run en cours s'y rejoint comme avant.

## Contrôles

- `node --check` sur tous les JS modifiés.
- `round-harness.js` : **2005–2007 OK, 0 échec**, stable sur **huit passages**.
- Chromium headless 390 × 844, zéro erreur console : carte (voilé, libéré, recouvert, protégé, sélection, liens), écran de profil ciblé, bilan, combat d'élite avec décor de Forêt. Captures dans `captures/living-map/`.
- Aucun autre fichier protégé touché que `combat-engine.js`, sur le périmètre annoncé.

## À noter

- `game.livingMaps.fight` déroge à « rien d'autre » de §10.2 : il tient là pour ne pas ouvrir un second champ dans `save-system.js`. Le combat ne traverse pas l'Ascension.
- L'Arbre-mère joue en Périple ordinaire jusqu'au lot C-5 (élite répétable à frein interne), comme prévu au rapport.
- Les effets tenus (`corde_plus`, `puits_plus`, `gourde_40`…) sont exposés par `LivingMapManager.hasEffect(id)` mais **aucun système ne les lit encore** : c'est le lot C-3 avec la Palissade.
- Le cap journalier partagé fait qu'une fois la Forêt entière libérée, « Petite aventure » et rejeu de secteur sont la même chose, sur le même compteur.
