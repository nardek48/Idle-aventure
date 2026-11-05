# v3.683.0 — Tutoriel factuel (audit du 04/11, lot I1)

Corrections factuelles et de code des fenêtres d'aide, sans nouvelle fenêtre ni réordonnancement de l'onboarding. Accord de Seb (04/11) pour les fichiers protégés, modifiés au minimum.

- **TUTO-1** : forest_08 « Fabriquer une ration » (fenêtre laissée à son moment, décision close) : points 2 à 4 au futur (« Pour la suivante, tu iras au Village… », « tu lanceras « La veine instable » »). Le joueur n'est plus invité à quitter l'expédition en cours. `js/data/story-quests.js`, `js/lang/en.js`.
- **TUTO-2** : aperçu de la création calculé par le moteur (`StatsSystem.recalcStats` sur un état neuf temporaire, état réel toujours rétabli) : Mage 295 PV au lieu de 240, ATK du Rôdeur juste. `js/ui/modal-view.js`.
- **TUTO-3** : la nuit (toutes les 3 sorties) peut reprendre un secteur éloigné : ajouté à forest_brume, desert_04 et à la légende de la Palissade (« ni un échec ni la nuit ne le reprennent »). `js/data/story-quests.js`, `js/ui/living-map-view.js`.
- **TUTO-4** : un niveau de Mémoire atteint écran fermé n'est plus annoncé vers « Héros › Mémoire » ; l'annonce est rattrapée au premier changement d'onglet une fois la Mémoire ouverte. `js/systems/memory-system.js`, `js/ui/ui-root.js`.
- **TUTO-5** : `maybeShowStepTutorial` ne remplace plus une aide ouverte ; crypte_06, montagne_06 et ruines_06 ne s'ouvrent qu'en Petite Aventure (prédicat `tutorial.when`, jamais dans le Labyrinthe). `js/ui/tutorial-view.js`, `js/data/story-quests.js`.
- **TUTO-8** : après « Partir », le tutoriel d'étape ne s'empile plus sur le pronostic ou une autre fenêtre (`otherModalRootOpen`). `js/ui/tutorial-view.js`.
- **TUTO-9** : desert_14 : « Après la prochaine nuit (toutes les 3 sorties) » au lieu de « Le lendemain ».
- **TUTO-15** : forest_15 dit comment ouvrir le Champs (« La Terre en Friche », Quêtes › Annexes).
- **TUTO-V1** : `tutorial-modal-root` ajouté à `BLOCKING_MODAL_IDS` : le combat attend sous une fenêtre d'aide. `js/main/game-loop.js` **(protégé, une ligne)**.
- **NOV-3** : `checkCurrentStep` franchit d'un coup les étapes déjà remplies (15 pierres avant la fin du chantier), une seule fenêtre pour la dernière. « Construire l'Atelier (1/1) » ne reste plus en attente. `js/systems/workshop-unlock-system.js`.
- **NOV-4** : la fiche ouverte du bâtiment est redessinée à la fin du chantier (plus de « fin dans 0s »). `js/systems/village-building-system.js`.
- **NOV-5 / OUB-1** : l'aperçu « Il charge ! » de forest_02 est la vraie puce du combat (`.cbx-chip.is-urgent`), sur fond sombre opaque : 12,5:1 mesuré (1,57:1 avant). `js/ui/tutorial-view.js`, `css/04-panel-tutorial.css`.
- **NOV-6** : notes de la préparation de Petite Aventure (« Tu pars avec tes PV actuels… », « Expédition offerte… ») en encre claire avec ombre : 8,8 à 9,3:1 mesurés (1,06:1 avant). `css/04-panel-pa2.css`.
- **NOV-7** : titres des sections de potions en encre claire avec ombre : 11 à 11,9:1 mesurés. `css/04-panel-upgrades.css`.
- **NOV-8** : « Me soigner » (pronostic) ouvre l'onglet « Le feu » du Campement. `js/ui/combat-forecast-view.js`.
- **NOV-10 (= UI-3)** : `#toast` passe au z-index 9 500, au-dessus des feuilles (3 000), sous le voile PWA (9 999). Vérifié à 320 et 390 px : visible sur une feuille du Village, aucun bouton couvert. `css/05-overlays.css`.
- **NOV-15** : village_production : « la jauge « 0 / 45 » sur sa carte » au lieu de « Plein dans Xm », « zone » au lieu de « parcelle ». `js/ui/tutorial-view.js`.
- **NOV-17** : plafonds d'entraînement en double chiffre (« 20 pour ta caractéristique de classe et l'Endurance, 14 pour les autres ») sur le bandeau de Héros et la fiche du Terrain. `js/ui/heros-view.js`, `js/data/village-buildings.js`.
- **NOV-19** : plus de « Débloqué : Équipement / Talents » tant que Héros est fermé. `js/systems/story-quest-system.js` **(quêtes, protégé)**.
- **NOV-20** : décimales à la française : « CRIT 7,5 % », « CRIT × 2,05 », « +1,5% défense », « 3,0 s/lot ». `js/ui/heros-view.js`, `js/ui/equipment-view.js`, `js/core/utils.js`.
- **NOV-21** : « Pas assez de Viande (…) », « Pas assez d'Eau (…) » au lieu de « Viande insuffisant ». `js/ui/production-view.js`.
- `js/lang/en.js` : textes remplacés et nouveaux traduits. « Quoi de neuf » : une ligne.
- `tools/harness/round-harness.js` [448] : un contrôle par correction (28) ; [60] mis à jour pour la puce `.cbx-chip`.

Laissés :
- TUTO-6, TUTO-10, TUTO-13, TUTO-16, NOV-2, NOV-11 et la proposition du §3.7 : décisions de Seb (nouveau contenu ou déplacement d'onboarding).
- TUTO-9, autres étapes « le lendemain » (crypte_07, montagne_07, tour_06) et fenêtre « La nuit » : hors du périmètre du lot (desert_14 seul) ; la fenêtre est un nouveau contenu, à Seb.
- NOV-20, espace avant « % » des lignes d'équipement (« +1,5% défense ») : toutes les lignes sœurs s'écrivent sans espace ; à traiter ensemble si Seb le souhaite.

Aucun fichier ajouté.

Contrôles : round 6 201 OK (2 passes), boot 4 OK, création 44 OK, parcours 212 OK, i18n 100 % (0 orphelin).
