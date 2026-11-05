# v3.690.0 — Anglais, accessibilité et finitions (audit du 04/11, lot A2)

En anglais, les nombres s'écrivent à l'anglaise et les deux-points ne sont plus collés à la française. Pour les lecteurs d'écran, les messages sont annoncés, les icônes de coût ont un nom et les liens « ressource manquante » répondent au clavier. S'y ajoutent huit finitions repérées pendant les lots précédents. Aucun chiffre d'équilibrage n'a changé.

- **CPL3-1** : nombres selon la langue. En anglais : « 5,000 », « 12.3 k », « 1.5 B », « 7% ». En français : « 5 000 », « 12,3 k », « 1,5 Md », « 7 % ».
  - Nouvelles aides dans `js/core/utils.js` : `fmtDec`, qui pose la virgule décimale en français seulement, et `fmtPct`, qui colle le % en anglais. `formatNumber` et `formatNumberGroup` suivent la langue.
  - Les remplacements « . » → « , » écrits en dur passent par ces aides : PV du mini-héros, débits, Chronique, Petites Aventures, compagnons, CRIT, multiplicateurs des marques de donjon, comparaison de défense, panneau de stats.
  - Il en va de même pour les « 7 % » écrits en dur (bandeau des stats de Héros, rations du Camp, Petites Aventures).
  - Au passage, 999 999 s'affiche « 1 M » au lieu de « 1 000 k ».
  - Fichiers : `js/core/utils.js`, `js/ui/hud-view.js`, `js/ui/production-view.js`, `js/ui/chronique-view.js`, `js/ui/pa2-view.js`, `js/ui/companions-view.js`, `js/ui/heros-view.js`, `js/ui/heros-screens-view.js`, `js/ui/camp-view.js`, `js/ui/dungeon-view.js`, `js/ui/equipment-view.js`.
  - Dans Chromium (anglais, 390 px, 55 écrans) : aucun nombre au format français, contre 17 relevés avant (dont « 7,4 % », « +0,1x » et « 48 000 »). En français à 320 px (55 écrans), plus aucune décimale à l'anglaise. La dernière, « ▲ +1.5% » dans la comparaison d'équipement, est corrigée (reste de NOV-20).
- **CPL3-2** : douze deux-points collés en dur passent par `_t("{a} : {b}")`, traduit « {a}: {b} ».
  - Fichiers : `js/ui/pa2-view.js`, `js/ui/village-building-view.js`, `js/ui/village-event-view.js`, `js/ui/dungeon-view.js`, `js/ui/production-view.js`, `js/ui/heros-view.js`, `js/systems/companion-system.js`, `js/systems/living-map-system.js`, `js/data/story-quests.js` **(quêtes, protégé, une ligne)**.
- **CPL3-3** : un élément `role="button"` qui n'est pas un `<button>` répond à Entrée et à Espace (écouteur délégué). Dans Chromium : le focus est mis sur « Bois » manquant dans une fenêtre de zone, Entrée ouvre « D'où ça vient ». `js/ui/ui-root.js`.
- **CPL3-4** : `renderIconOrEmojiHTML` pose `alt` avec le nom reçu ; « 2 Acier » se lit en entier. L'icône de la fenêtre de confirmation reste décorative (sinon le titre serait lu deux fois). `js/core/utils.js`, `js/ui/modal.js`.
- **CPL3-6** : `#toast` est passé en `role="status" aria-live="polite"`. `index.html`.
- **CPL3-7** : avec le mouvement réduit, le halo de la cible, le pouls d'urgence, l'oscillation de la charge, le badge d'attente et le pouls du monde actuel sur la carte sont coupés. Dans Chromium (`reducedMotion: reduce`), en combat puis sur la carte du monde : 0 animation infinie, contre 3 avant. `css/03-combat-screen.css`, `css/06-map.css`.
- **CPL3-10** : les boutons de la fenêtre de changement de langue sont dans les deux langues : « Annuler · Cancel » et « Confirmer · Confirm » (ou l'inverse vers le français). Les libellés par défaut sont rétablis à la confirmation suivante. Ils tiennent à 320 px (125 et 121 px, rien de coupé). `js/ui/settings-view.js`, `js/ui/modal.js` (5ᵉ paramètre `labels` de `showConfirmModal`).
- **CPL3-12** : commandes nommées.
  - L'interrupteur « Zéros » de l'Entrepôt a un nom.
  - Le donjon de la carte du monde est atteignable au clavier (`tabindex`).
  - Un secteur voilé sans nom se lit « Secteur inconnu », sans rien révéler.
  - Les lignes ouvrables de « Départs » sont atteignables au clavier.
  - Mesure du script d'audit : 0 commande sans nom sur 327, contre 20 avant.
  - Fichiers : `js/ui/warehouse-view.js`, `js/ui/map-view.js`, `js/ui/living-map-view.js`, `js/ui/expeditions-view.js`.
- **CPL3-14** : « Defence » (en-GB) dans 3 traductions. Le « % » est collé au nombre dans 4 traductions (« 12% »). `js/lang/en.js`.
- **Finitions repérées pendant les lots précédents** :
  1. PV des compagnons (Héros › Alliés) : le texte est posé sur une pastille sombre. Contraste mesuré au pixel : 15,2:1, contre 2,2 à 2,5:1 avant. À 320 px, la pastille (80 px) couvre presque toute la jauge (82 px). `css/04-panel-heros-screens.css`.
  2. Compteur de l'accordéon du Codex : 5,3 à 5,6:1 mesurés au pixel, à 390 et 320 px, replié et déplié (3 catégories). Rien à corriger : la valeur 3,15:1 venait d'un échantillon de fond pris dans l'ombre du cadre (la mesure au pixel du même relevé donnait 8,8:1).
  3. Échoppe de Héros › Équipement : les cartes non payables ne sont plus voilées à 0,8, comme à l'échoppe de la Halle (INT-1). « +1,5% défense » passe de 2,9:1 à 5,0:1 (390 px) et 5,2:1 (320 px). `css/00-components.css`.
  4. `.potion-section-note` : la note était posée sur le décor sombre (1,7:1). Elle passe en encre claire avec une ombre, comme le titre de section : 6,2 à 6,7:1. `css/04-panel-upgrades.css`.
  5. Pendant la création d'un héros, le message monte sur l'illustration (30 % de la hauteur). « Partie de X effacée » ne recouvre plus le champ du nom (message en 253-289 px et champ en 700-750 px à 390 ; 170-206 et 424-474 à 320). `js/ui/toast.js`, `css/05-overlays.css`.
  6. La ligne de coût d'une fenêtre de zone lit l'or dans l'or du joueur et l'affiche avec `images/Icons/gold_icon.webp`. Le bouton de la fenêtre fait de même. Aucun coût de zone actuel ne contient d'or (vérifié : 6 bâtiments × 9 zones × 40 niveaux). Le cas a été vérifié en injectant un coût en or : icône chargée (72 px), pas d'icône générique. `js/ui/production-view.js`.
  7. Défaite en farm libre : l'astuce « ressource pleine » s'affiche dans le rapport, et le Campement ne la répète plus. Dans Chromium : rapport 1 et Campement 0, contre 1 et 1 avant. `js/ui/combat-report-view.js`.
  8. Le statut « Stock plein » / « Plein dans {d} » de `ProductionManager.updateDOM` est retiré. Il visait `prod-status-<id>`, un id que rien ne pose : aucune occurrence dans `index.html`, `js/`, `css/` ni `tools/`. Le bloc ne s'exécutait donc jamais. Les deux clés anglaises devenues orphelines sont retirées. `js/systems/production-system.js`, `js/lang/en.js`.
- `js/lang/en.js` : 1 texte nouveau (« {a} : {b} »), 2 retirés, 7 traductions corrigées. « Quoi de neuf » : une ligne.
- `tools/harness/round-harness.js` [455] : 18 contrôles. Trois contrôles anciens suivent le nouveau format : [381] « 60 % » avec espace insécable, [76] « +2,2% » (`formatStatDelta`), [448] NOV-20 CRIT par `fmtPct`.

Laissés :
- CPL3-5 : `role="dialog"`, focus dans les feuilles et `inert`. UI transversale, atelier d'abord.
- CPL3-11 : « Warehouse » touche le bord à 320 px. Mesuré dans Chromium en anglais : à 12 px, « Workshops » et « Warehouse » font 68 px pour des boutons de 64 px. À 11 px, il reste 1 px de marge, mais la règle S-2 (v3.398.0, contrôle [171]) interdit le texte de lecture sous 12 px. Deux solutions possibles, au choix de Seb : une exception à S-2 pour ces onglets, ou des libellés anglais plus courts.
- UI-16 (= CPL3-9), partie « Échap = Compris » des tutoriels à un bouton : fenêtres sans croix qui bloquent le Retour, décision v3.536.0 (option A). La partie carte vivante a été faite en v3.685.0.
- CPL3-13 (= COMB-7) : ressource de classe coupée à 320 px. Atelier d'abord.

Déjà corrigés : CPL3-8 (v3.686.0) ; NOV-21 (v3.683.0). NOV-20 avait été fait en v3.683.0 ; il ne restait que la comparaison de défense et les multiplicateurs de donjon, faits ici.

Contrôles : `node --check` sur chaque JS modifié ; round 6 375 OK, 0 échec (2 passes) ; boot 4 OK ; création 44 OK ; i18n 8 454 textes, 100 %, 0 orphelin ; parcours 212 OK. Aucun fichier ajouté. Fichier protégé touché : `js/data/story-quests.js` (une ligne, CPL3-2).
