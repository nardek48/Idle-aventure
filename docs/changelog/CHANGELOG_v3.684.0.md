# v3.684.0 — Quêtes (audit du 04/11, lot I5)

Routage, objectifs et textes des quêtes ; quête liée à un compagnon gardée visible. Accord de Seb (04/11) pour les fichiers de quêtes, modifiés au minimum.

- **QUET-1** : tour_11 et tour_12 : `linkTo: { tab: "dungeon" }` au lieu de `{ section: "dungeon" }` : « Partir » ouvre le Sommet interdit, plus l'écran Quêtes. `js/data/story-quests.js` **(quêtes, protégé)**.
- **QUET-2 (+ risque TUTO-13)** : une quête `requiresParty` dont le compagnon n'est pas dans le groupe reste au tableau, verrouillée, avec « Il faut {x} dans le groupe » (plus masquée) ; « Partir » de l'étape liée affiche cette raison. Nouveau `CompanionManager.requiredReason` (les trois gardes d'étape existantes y sont regroupées) : patrouille refusée pour un compagnon exigé par une étape de rencontre, une quête lancée, la quête liée à l'étape en cours non finie, ou Wenna pendant « Les compagnons » ; `setPresent(false)` refusé aussi pendant la quête lancée qui l'exige. Mesuré dans Chromium 390×844 : raison dans la carte (x 187→349 pour une carte 22→368), aucun défilement horizontal. `js/systems/mission-board-system.js`, `js/systems/companion-system.js`, `js/systems/patrol-system.js`, `js/ui/quests-view.js`.
- **QUET-5** : la silhouette (tour_18) prend le trait de la classe, plus de l'id du héros : Rôdeur et Mage du Chaos ont « blindée » et « silence » au lieu de « enragée » (`TowerSystem.baseHeroId`). `js/systems/tower-system.js`.
- **QUET-6** : tour_03 « Dresser le dernier camp » : bouton « Aller aux Ateliers » (Cuisine de camp) tant que l'offrande n'est pas payable, comme desert_07. `js/data/story-quests.js` **(quêtes, protégé)**.
- **QUET-7** : montagne_04 : « Tailler 5 veines à la Montagne (toi ou Sarkel), dans « Ça ne fond pas » ou ailleurs » (texte seul, règle M-2 inchangée). `js/data/story-quests.js`, `js/lang/en.js`.
- **QUET-10 (+ QUET-V1)** : « Le Golem, encore », « Les marques des Ruines » et « Les marques de la Crypte » comptent aussi les élites de carte du même nom (`golem_tour`, `pleureuse_nef`). `js/data/achievements.js`.
- **QUET-11** : tour_06 « 5 étages » ne compte plus l'élite (`content.type === "expedition"`) : tour_09 n'est plus réussie dès son acceptation. `js/data/story-quests.js` **(quêtes, protégé)**.
- **QUET-12** : récompenses tardives de la Tour posées par id d'étape (`storyTowerSetRewards`), plus par position. `js/data/story-quests.js` **(quêtes, protégé)**.
- **QUET-13** : ruines_11, crypte_11, montagne_11 et tour_09 ouvrent la carte sur leur secteur (`livingmap_<carte>:<secteur>`). Effet de bord : l'admin (`adminApplyStoryLink`) libère désormais ces quatre secteurs en forçant l'étape. `js/data/story-quests.js` **(quêtes, protégé)**.
- **CPL2-3** : « La laisser se recoucher » : « … Son carquois reste avec toi. Ses quêtes s'arrêtent là. » (texte seul, choix clos). `js/data/story-quests.js`, `js/lang/en.js`.
- `js/lang/en.js` : textes remplacés et nouveaux traduits. « Quoi de neuf » : une ligne.
- `tools/harness/round-harness.js` [449] : un contrôle par correction (16).

Laissés :
- QUET-3 (= ECON-1) : choix A/B/C de Seb (Forge 6 et 7).
- QUET-4, QUET-V2 : outillage de campagne, lot I2 à part.
- QUET-8 : incohérence de l'outil admin seul (`ADMIN_STORY_EXTRA`), pas un bug du jeu.
- QUET-9 : « Nef ensevelie », décision de Seb.
- TUTO-13 (déplacer « Les patrouilles » après la réclamation) : onboarding, décision de Seb ; seul le risque est couvert (patrouille de Wenna refusée pendant l'étape).

Aucun fichier ajouté.

Contrôles : round 6 217 OK (2 passes), boot 4 OK, création 44 OK, parcours 212 OK, i18n 100 % (0 orphelin).
