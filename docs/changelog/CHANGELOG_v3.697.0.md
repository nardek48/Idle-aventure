# v3.697.0 — Décisions : règles et textes (Seb, 05/11, option A partout)

Décisions prises par Seb le 05/11 sur la page de décisions, appliquées telles quelles (option A pour les douze points). Aucun fichier protégé touché.

## Corrigés

- **EQUI-11** : « Régler d'un coup » (puce « Sans danger · Régler d'un coup », v3.459.12, règle I4) vaut aussi pour l'**élite répétable de carte** en cours (`repeatable: true` dans `living-maps.js` : `arbre_mere`, `dard_profondeurs`, `golem_tour`, `pleureuse_nef`, `mere_dragonnets`, `vieux_golem`, `gardien_qui_repete`), quand le pronostic la juge « Sans danger » et que l'usure prévue reste sous 25 % des PV. Même règle qu'avant : pas en donjon, ni contre un boss ou une autre élite ; le combat se joue avec les vrais tours du moteur, donc mêmes récompenses (Sève, niveau, victoire du jour, pièce) qu'un combat gagné ; il rend la main sous 30 % des PV. Fichier : `js/systems/combat-forecast-system.js`. Vu dans Chromium à 390 × 844 : puce sous la barre de vie de l'Arbre-mère, victoire du jour comptée, retour sur la carte.
- **CPL2-2** : les paliers d'entraînement qui ouvrent les 3 emplacements de relique (5/15/25) sont rapportés à la ligne d'entraînement du compagnon depuis son arrivée (`CompanionRelics.slotAt` : palier × longueur de sa ligne ÷ 30, arrondi au-dessus). Wenna 5/15/25 (inchangée), Maddoc 5/13/21, Edda 4/10/17, Ysolt 3/8/13, Sarkel 2/5/9 : chacun ouvre ses 3 emplacements au bout de sa ligne et peut porter toutes ses reliques uniques. Calculé, aucun nouvel état. La fiche « Entraîner un compagnon » le dit (« plus tôt pour un compagnon arrivé tard »), la case fermée affiche le vrai palier. Fichiers : `js/systems/companion-relic-system.js`, `js/ui/companions-view.js`, `js/data/village-quests.js`.
- **QA-7** : carte, accroche et nuit d'une Petite Aventure sont figées 4 h par secteur (`PA2_DRAW_FREEZE_MS`) : annuler la préparation et revenir redonne le même tirage. Le tirage est noté dans `game.expeditionChest.draws`, coffre déjà sauvegardé en entier (aucune ligne de `save-system.js`, comme les trophées v3.384.0). **Choix d'application** : le départ consomme le tirage, la sortie suivante sur ce secteur est tirée à neuf (sinon on rejouerait la même carte et la même accroche pendant 4 h, contre la règle E3). Fichier : `js/systems/pa2-run.js`.
- **CPL1-6** : le résumé de l'écran de retour est gardé en stockage local (`aethervale_return_pending`, hors sauvegarde, avec l'emplacement du héros). Rechargé, il revient (écran ouvert, ou en attente si le héros est engagé). Il est effacé une fois l'écran fermé, au changement ou à l'effacement de héros, ou s'il appartient à un autre emplacement. Fichiers : `js/systems/return-system.js`, `js/ui/return-view.js`, `js/main/boot.js`. Vu dans Chromium : résumé posé pendant un combat, page rechargée, écran de retour ouvert.
- **UI-11** : `.affordable` posé sur les cartes d'achat payables : échoppe (objets et reliques), potions de mission et de soin, boutique d'Éclats ; les préparations de combat (rien à payer sur la carte) aussi. Le voile à 0,8 ne couvre plus que les cartes trop chères. Fichiers : `js/ui/equip-shop-view.js`, `js/ui/potion-view.js`, `js/ui/village-building-view.js`. Mesuré dans Chromium : potions à 1 d'opacité avec 100 000 or, 0,8 sans or.
- **CPL3-11** : sous 340 px, le rail du Village passe ses libellés sur deux lignes, en 12 px (S-2), avec une césure douce : « Work-shops », « Ware-house », « Produc-tion » (« Production » débordait aussi, en français comme en anglais : « Producti… » à 320 px). Le rail s'élargit de 6 px de chaque côté, comme celui du Camp (v3.648.0). Au-dessus de 340 px, rien ne change. Fichiers : `css/04-panel-village.css`, `js/ui/village-view.js`, `js/lang/en.js` (contexte `sous-onglet`). Mesures au pixel (Chromium) :

  | Largeur | Langue | Onglets (largeur) | Deux lignes | Taille |
  |---|---|---|---|---|
  | 320 | FR | 67 px | Production | 12 px |
  | 320 | EN | 67 px | Production, Workshops, Warehouse | 12 px |
  | 339 | FR / EN | 72 px | aucun | 12 px |
  | 390 | FR / EN | 81 px | aucun | 12 px |

- **QUET-9** : le premier « Sanctuaire » (`ruins_2`, enseveli) s'appelle « **Nef ensevelie** », « Buried Nave » en anglais (cohérent avec « La nef » / « The Nave » de la Crypte) ; ajouté au glossaire. Ids inchangés. Les deux objectifs « Vaincre {target} rencontres à la Nef ensevelie » suivent. Fichiers : `js/data/worlds.js`, `js/data/adventure-quests.js`, `docs/i18n-glossaire-en.md`, `tools/audit/bestiaire-captures.js`.
- **TUTO-6** : « Village & Production » s'ouvre à la première ouverture de l'onglet Village (condition retirée, déclaré avant le Terrain d'entraînement, qui vient à la visite suivante). Fichier : `js/ui/tutorial-view.js`. Vu dans Chromium.
- **TUTO-9** : crypte_07, montagne_07 et tour_06 disent « jusqu'à la prochaine nuit (toutes les 3 sorties) », comme desert_14 ; texte seul, pas de fenêtre « La nuit ». Fichier : `js/data/story-quests.js`.
- **TUTO-10** : mots des aides alignés sur l'écran : un seul badge, « Histoire » (Quêtes disait « Principale », le Campement et l'aide « Histoire ») ; « Sac » au lieu d'« Inventaire » (Équipement) ; « Attaque de base (Trait arcanique pour le Mage) » dans l'aide du combat ; « l'Entrepôt ne rachète rien » partout (l'écran disait « ne rachète plus rien », l'aide « ne rachète rien » : le « plus » parlait d'un temps que le joueur n'a pas connu). Les titres d'onboarding ne changent pas. Fichiers : `js/ui/quests-view.js`, `js/ui/equipment-view.js`, `js/data/story-quests.js`, `js/ui/warehouse-view.js`, `js/systems/warehouse-system.js`, `js/data/village-buildings.js`.
- **TUTO-13** : « Les patrouilles » attend que forest_wenna soit réclamée (helper `storyStepClaimed`). Fichier : `js/ui/tutorial-view.js`.
- **NOV-11** (décision du 10/10, option A, une seule version) : accroches de classe neutres (« La maîtrise du combat et de la défense… », « Agilité et précision… », « Les savoirs anciens en garde, les éléments et l'énergie arcanique en main. ») ; forest_01 « Il te faudra une arme » ; marché de Sarkel « Toi, tu es là. ». Fichiers : `js/ui/modal-view.js`, `js/data/story-quests.js`, `js/data/village-events.js`. Vu dans Chromium à 320 et 390, FR et EN : au plus deux lignes, comme avant.
- `js/lang/en.js` : textes remplacés (clés changées), entrée « Ateliers » retirée (orpheline), « Principale » retirée, 3 entrées de contexte `sous-onglet`, Quoi de neuf (deux lignes).
- `tools/harness/round-harness.js` : [462] (un contrôle ou plus par décision) ; [162] E3 vide le tirage figé entre deux départs (il teste le tirage lui-même) ; accroche du Chevalier mise à jour. `tools/harness/hero-creation-harness.js` : accroche du Chevalier.

## Repéré (non corrigé)

- « Nef ensevelie » (Ruines) et « La nef » (secteur de la carte de la Crypte, élite « Pleureuse de la nef ») partagent le mot « nef ». Choix de Seb, appliqué tel quel ; à garder en tête.
- NOV-11 : l'acte I s'appelle « Le feu et la lame » et la Montagne parle de « ta lame » (Tailler la veine, mécanique MT2, question QUE-8 du 27/10) : titres et nom de mécanique, non touchés.
- Au-dessus de 340 px, « Workshops » (68 px) tient tout juste dans son onglet (69 px à 340 px).

## Laissés

- TUTO-10 : titres d'onboarding (« L'Amélioration » contre la tuile « Entraînement », « La Boutique » contre « Potions ») : l'option A ne vise que les mots.

Contrôles : node --check sur chaque JS modifié · round-harness 6 501 OK, 0 échec (2 passes) · boot 4 OK · création 44 OK · i18n 8 453 textes, 100 %, 0 orphelin · parcours 212 OK · Chromium (390 × 844 ; 320, 339, 340 et 390 pour le rail du Village, FR et EN) : puce de l'Arbre-mère, Village & Production, voile des cartes, résumé de retour après rechargement, accroches de classe. Aucun fichier ajouté.
