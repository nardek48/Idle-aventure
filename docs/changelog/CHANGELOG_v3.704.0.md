# v3.704.0 — Aides et récit : atelier 3 intégré (choix de Seb du 05/11)

Variantes choisies dans `atelier/aides-recit.html` (tableaux `SECTIONS` et `FICHES`), reprises avec leurs textes, icônes et déclencheurs. Aucun fichier protégé touché. Aucun état sauvegardé nouveau : les fiches utilisent `game.genericTutorialsSeen` (déjà câblé dans `save-system.js` et `state.js`). Aucun fichier ajouté.

## Corrigés

- **TUTO-16** (A) : neuf fiches d'aide dans `GENERIC_TUTORIALS`, rendues par le composant actuel (`buildTutorialModalHTML`, présentation de v3.703 avec « Suite ↓ »), 3 points chacune, textes de l'atelier. Chaque fiche ne s'ouvre qu'une fois (« Compris » la marque vue) et jamais par-dessus une autre fenêtre (règle TUTO-5 / TUTO-8 de v3.683) : seule la fenêtre qu'elle explique peut rester dessous.
  - Déclencheurs :
    - `tavern_contracts` : première ouverture de la fiche de la Taverne construite (niveau 1 ou plus), au-dessus de la feuille (`openVillageBuildingSheet`, `js/ui/village-building-view.js`).
    - `village_events` : première arrivée sur le Village pendant un événement (`VillageEvents.active()`), déclarée après « Village & Production » et le Terrain.
    - `achievements_intro` : première ouverture de Hauts faits.
    - `bestiary_intro` : première ouverture de la Bibliothèque sur le Bestiaire (onglet, ou toucher du sous-onglet `setBestiaryCodexSubTab`, `js/ui/bestiary-view.js`).
    - `companion_quests` : première ouverture de Quêtes une fois une quête de compagnon ouverte (`CompanionQuestManager.list()`).
    - `chaos_variant` : premier toucher de « Variante du Chaos » à la création (`toggleHeroChaosVariant`, `js/ui/modal-view.js`) ; vue sans sauvegarde pendant la création, sauvée à la confirmation (vérifié : le drapeau est dans la sauvegarde du héros créé).
    - `combat_forecast` : juste avant la première fenêtre « Avant de partir » (`launchWithForecast`, `js/ui/combat-forecast-view.js`) : la fiche d'abord, « Compris » ouvre ensuite le pronostic.
    - `sortie_prep` : première feuille de préparation qui propose un choix (feuille non réduite), au-dessus d'elle (`openSortiePrep`, `js/ui/sortie-prep-view.js`).
    - `equipment_intro` : première ouverture de Héros › Équipement avec au moins un objet au Sac (onglet, ou toucher du rail : `setHerosSubTab`, `js/ui/heros-view.js`).
  - Mécanisme : `openGenericTutorialOnce(id, { allow, after, noSave })` et `tutorialOtherWindowOpen(allow)` (racines `*-modal-root` et feuilles `sortie-prep-root`, `heros-sheet-root`, `grimoire-sheet-root`, `exp-sheet-root`, `hero-selection-root`, `full-menu-root`) ; champ `solo` pour les fiches d'onglet (`maybeShowGenericTutorial` les retient tant qu'une autre fenêtre est ouverte) ; `closeGenericTutorialModal` appelle la suite éventuelle. Fichier : `js/ui/tutorial-view.js`.
  - z-index : `#tutorial-modal-root { position: relative; z-index: 3001; }` (la création, `#hero-selection-root`, est à 3000 et placée après) : la fiche du Chaos passe devant la création (mesuré : « Compris » 100 % touchable). `css/05-overlays.css`.
  - Chiffres revérifiés contre le code actuel (Taverne 2 à 7 contrats, 6 h, +15 % au niveau 6 ; événements 1 sur 2, 2 jours, +50 %, −20 %, nuit toutes les 3 sorties ; Bestiaire 10/50/100 → +1/+3/+5 %, élites et boss 3/10/25 → +2/+5/+10 % ; paliers 3/6/8 ; 7 emplacements, Sac de 25, panoplie à 3 et 7 ; pronostic sous 60 % des PV). Aucune fiche ne parle de faiblesses (retirées en v3.701). **Deux textes corrigés** par rapport à l'atelier :
    - Pronostic, point 2 : « … ou « Partir quand même » » → « … ou partir quand même » : le bouton s'appelle « Partir » quand le combat est seulement Risqué, PV pleins (`launchWithForecast`).
    - Chaos, point 2 : « Seule la répartition de leurs cinq caractéristiques de départ change » → « Seules leurs cinq caractéristiques de départ changent » : le total change aussi (Chevalier 246 → 260, Mage 260 → 262, Rôdeur 260 = 260, `heroes.js`).
  - Icônes : chemins de l'atelier gardés ; six fichiers absents, l'icône générique s'affiche à leur place (relevé `missing-icons.js`) : `achivement/palier.webp`, `classes/chaos.webp`, `companions/relics/relic_unique.webp`, `system/forecast.webp`, `system/sortie_prep.webp`, `village_events/event_village.webp`.
  - Traductions anglaises des 9 titres et 27 points (`js/lang/en.js`).
- **Catalogue** (A) : Taverne et « Ce matin à Aeswyn » dans « Le village » (après les quêtes de village), les sept autres dans « Les bases ». Champ `section: "village"` sur les deux fiches ; `getBySection` lit `entry.section` (fiches génériques) ou la source. L'état « vu » reste celui des fiches génériques. Fichier : `js/systems/tutorial-catalog-system.js`.
- **NOV-2** (A) : carte d'Histoire du Camp : la première phrase du récit de l'étape (`narrative.objective`) en italique sous le titre (2 lignes au plus), et un pli « Récit ▸ » de 44 px sous l'objectif qui déroule le texte entier puis, l'étape acceptée, les répliques (`buildStoryDialogueHTML`, comme dans Quêtes ; le nombre de répliques est annoncé sur le pli). Le pli ouvert est gardé le temps de la session (pas d'état sauvegardé). Fichiers : `js/ui/camp-view.js`, `css/04-panel-camp.css`, `js/lang/en.js` (« Récit », « {n} réplique(s) »).
- **C13** (A) : bandeau de l'arbre de Héros : « a / b placés · le prochain au niveau N » quand le niveau limite, « a / b placés · plafond de l'acte » (+ « · r en réserve ») quand l'acte limite (textes validés en v3.458.3, traductions reprises). Ancienne clé « {a} / {b} placés » retirée de `en.js`. Fichier : `js/ui/heros-screens-view.js`.
- **Codex « Le Chaos »** (correction sans décision) : le texte disait « ce que l'Aether a donné d'un côté, il l'a pris de l'autre » ; il dit désormais que l'Aether a donné un peu plus qu'il n'a pris (Chevalier et Sorcier du Chaos un peu plus que leur classe, Rôdeur autant, autrement placées). FR + EN. Fichiers : `js/data/codex.js`, `js/lang/en.js`.
- **Panneau de talent** (correction sans décision) : `.hst-detail` (collant) prend `z-index: 2`, au-dessus des emblèmes de voie `.hst-emb` (z-index 1) quand l'arbre défile. Fichier : `css/04-panel-heros-screens.css`.
- Quoi de neuf : une ligne FR + EN (`js/ui/news-view.js`, `js/lang/en.js`).
- `tools/harness/round-harness.js` : [469] neuf fiches (3 points, traduites, ≤ 100 mots), ordre et déclencheurs, fiches `solo`, chiffres contre le code, deux textes corrigés, catalogue (A), ouverture unique, refus par-dessus une autre fenêtre puis ouverture à l'arrivée suivante, pronostic après sa fiche puis seul, Chaos sans sauvegarde, conditions événement et Sac, appels posés, z-index ; NOV-2 (première phrase, pli fermé, répliques une fois acceptée, 44 px, 2 lignes, italique) ; C13 (textes, traductions, ancienne clé retirée) ; Codex vrai ; panneau au-dessus des emblèmes. 40 contrôles.
- `tools/harness/parcours-harness.js` : P15 marque la fiche de la Taverne comme vue avant d'ouvrir la feuille (le parcours mesure la feuille au clavier ; la fiche s'ouvrait désormais au-dessus, comme voulu).

## Mesures (vrai jeu, Chromium, partie avancée : Rôdeur, Désert, village niveau 3)

### TUTO-16 — les neuf fiches, déclenchées par le vrai chemin

| Fiche | Caché à 320 N / G (px) | 390 N / G | « Suite ↓ » quand ça défile | « Compris » | Icônes génériques |
|---|---|---|---|---|---|
| Les contrats de la Taverne | 0 / 110 | 0 / 0 | oui | 100 %, 48 px (G 54) | 0 |
| Ce matin à Aeswyn | 0 / 126 | 0 / 0 | oui | 100 % | 3 |
| Les hauts faits | 0 / 87 | 0 / 0 | oui | 100 % | 1 |
| Le Bestiaire | 0 / 67 | 0 / 0 | oui | 100 % | 0 |
| Les quêtes des compagnons | 0 / 52 | 0 / 0 | oui | 100 % | 1 |
| La variante du Chaos | 0 / 48 | 0 / 0 | oui | 100 % (devant la création) | 3 |
| Le pronostic | 27 / 145 | 0 / 0 | oui | 100 % | 1 |
| Préparer la sortie | 0 / 87 | 0 / 0 | oui | 100 % | 2 |
| L'équipement | 27 / 126 | 0 / 0 | oui | 100 % | 0 |

Partout : titre lisible et non coupé, texte des points à 13 px, aucun débordement horizontal ; après « Compris », fiche marquée vue, et le même chemin ne la rouvre pas. Feuille dessous : Taverne (`village-modal-root`), Préparation (`sortie-prep-root`) ; aucune pour les autres. Pronostic : « Compris » ouvre bien la fenêtre « Avant de partir ». Une fenêtre déjà ouverte : la fiche d'onglet ne s'ouvre pas (4 tailles). Même relevé que l'atelier à 320 × 568 Normale (27 px pour le pronostic et l'équipement).

### NOV-2 — carte d'Histoire (forest_wenna, carte amenée sous l'en-tête figé)

| Taille | Récit (lignes) | Pli | Carte pli fermé (proposée / acceptée) | « Partir » pli fermé | Carte pli ouvert (acceptée) |
|---|---|---|---|---|---|
| 320 N | 1, italique | 247 × 44 px | 238 / 261 px | visible (131 px au-dessus du bord) | 554 px, 5 répliques ; « Partir » 161 px sous le bord |
| 320 G | 2 | 239 × 49 px | 282 / 307 px | visible | 656 px ; « Partir » 267 px sous le bord |
| 390 N | 1 | 317 × 44 px | 238 / 246 px | visible | 496 px ; « Partir » visible |
| 390 G | 1 | 309 × 49 px | 262 / 271 px | visible | 599 px ; « Partir » visible |

Étape proposée : pas de répliques (« Récit ▸ » seul, texte entier) ; acceptée : « Récit · 5 répliques ». Pli ouvert gardé après un nouveau rendu du Camp. Aucun débordement horizontal.

### C13 — bandeau des points (Rôdeur, plafond de l'acte 7)

| Cas | Texte | 320 / 390, N / G |
|---|---|---|
| Niveau 4 | « 0 / 7 placés · le prochain au niveau 5 » | 2 lignes, bandeau 55 px (G 61), rien de coupé, visible |
| Niveau 11 | « 0 / 7 placés · plafond de l'acte · 3 en réserve » | idem |

### Panneau de talent

À 320 × 568, deux emblèmes de voie amenés sous le panneau collant : le panneau est dessus dans les deux cas (`elementFromPoint`), Normale et Grande. À 390 × 844, aucun emblème ne passe sous le panneau.

## Laissés

- Aucun.

## À signaler

- Six icônes à créer (liste ci-dessus) ; en attendant, icône générique.
- C13 à 320 px : le bandeau passe sur 2 lignes (comme mesuré dans l'atelier) et « 7 points à placer » passe aussi sur 2 lignes quand il reste des points à placer ; rien n'est coupé.

Contrôles : `node --check` sur chaque JS modifié ; round-harness 6 558 OK, 0 échec (2 passes) ; boot 4 OK ; création 44 OK ; i18n 100 %, 0 orphelin ; parcours 232 OK, 0 échec.
