# v3.701.0 — Faiblesses et résistances retirées partout (Seb, 05/11, « on va enlever »)

Décision de Seb du 05/11 : plus aucune faiblesse ni résistance d'ennemi, en combat comme à l'affichage. Mesures sur le vrai moteur, avant et après.

## Corrigés

- **FAIBLESSES** (retrait complet) :
  - Moteur : `getDamageAffinity` renvoie ×1 (statut « neutral ») pour tout héros armé, quel que soit l'ennemi. `RESIST_DMG_MULT` et `WEAK_DMG_MULT` valent 1 : le pronostic et l'auto-pilote (`getPureDamageAffinityMult`, `estimateRoundsToKill`) et le bac à sable de rounds suivent sans autre modification. Fichier : `js/systems/combat-engine.js` **(protégé, accord de Seb)**.
  - Pénalité **sans arme** (×0,8, `NO_WEAPON_MULT`) gardée : ce n'est pas une affinité d'ennemi.
  - Simulateur parallèle aligné : `resistMult` / `weakMult` à 1 par défaut (ils étaient restés à 0,7 / 1,3). Fichier : `js/sim/combat-round-sim.js`.
  - Bestiaire : `bestiaryAffinityLines(d)` renvoie `[]`. Plus de « Résiste / Faible » sur les cartes ni sur les fiches. `bestiaryAttackLabel`, devenue inutile, est retirée. Fichier : `js/ui/bestiary-view.js`.
  - Textes : la description de **Tir perforant** (Rôdeur) ne dit plus « Ignore la résistance/faiblesse d'arme de l'ennemi ». Fichier : `js/data/class-skills.js`.
  - `js/lang/en.js` : clés « Résiste : {liste} », « Faible : {liste} », « l'épée », « l'arc », « la magie » retirées ; clé de Tir perforant remplacée ; Quoi de neuf (une ligne).
  - Recherche faite (FR et EN) : « faible », « résiste », « faiblesse », « résistance », « craint », weakness, resist. Codex, tutoriels (onboarding compris), aides, pronostic et textes d'Histoire n'en parlaient pas. Les autres occurrences sont sans rapport : cible « La plus faible » du Grimoire, forces et faiblesses de classe des Petites Aventures (PA2), vulnérabilité de Brise-garde, résistance aux critiques par la Volonté.
  - Données : les champs `resists` / `weak` des ennemis, boss et élites restent dans les données, **inertes**. Les retirer toucherait `progression-system.js` et `dungeon-system.js` (protégés), ainsi que les outils qui les copient, pour aucun effet en jeu.
- Outillage :
  - `tools/docs-gen/generate-balance-guide.js` : colonnes « Résiste / faible » retirées des tableaux d'ennemis et de boss.
  - `tools/sim/seve-bench.js` : message d'erreur explicite (voir « Laissés »).
  - Les autres outils qui lisent `resists` / `weak` (`test-round-sim`, `celerity-curve-bench`, `run-round-sim`, captures du Bestiaire et de la Crypte) tournent toujours : les données sont là.
- `tools/harness/round-harness.js` :
  - [466] : ×1 pour les 3 classes armées face à tout le bestiaire (111 cas), même dégât réel par `dealDamage` sur « faible », « résiste » et neutre, version pure ×1, simulateur à 1, aucune ligne sur les 54 fiches du Bestiaire ni sur les cartes, Tir perforant, clés EN retirées, pénalité sans arme gardée ;
  - contrôles adaptés : [1] « résistances 0,85 / 1,15 » → ×1 ; [463] « ennemi ordinaire faible à la magie ×1,15 » → ×1 ; [464] affinité en groupe (statuts « weak » / « resist » → « neutral », ratio ×1,15 → ×1) ; [465] FAIBLESSES (Ifrit ordinaire : 2 lignes → 0, carte ordinaire avec « Résiste » → sans, « l'Ifrit résiste toujours » → ×1).

## Mesures

Banc ad hoc sur le vrai moteur (bac à sable de `world-bench.js`) : mondes 1 à 3, les deux aventures de chaque monde, ennemi ordinaire tiré du pool (40 tirages par aventure, mêmes graines avant et après), kit médian du monde, duel à PV pleins.

| Monde · classe | Faible / résiste / neutre (sur 80) | Victoire | PV perdus | Rounds |
|---|---|---|---|---|
| Forêt · Chevalier | 24 / 0 / 56 | 100 → 100 % | 0,9 → 0,9 % | 1,93 → 1,93 |
| Forêt · Rôdeur | 25 / 31 / 24 | 100 → 100 % | 3,3 → 2,9 % | 2,30 → 2,17 (−5 %) |
| Forêt · Mage | 31 / 49 / 0 | 100 → 100 % | 1,9 → 1,9 % | 1,63 → 1,46 (−10 %) |
| Désert · Chevalier | 16 / 43 / 21 | 100 → 100 % | 9,5 → 8,2 % | 6,30 → 5,70 (−10 %) |
| Désert · Rôdeur | 28 / 36 / 16 | 100 → 100 % | 8,8 → 8,5 % | 6,22 → 6,17 |
| Désert · Mage | 36 / 16 / 28 | 100 → 100 % | 6,3 → 6,6 % | 4,80 → 4,83 |
| Ruines · Chevalier | 21 / 59 / 0 | 100 → 100 % | 6,9 → 5,7 % | 5,46 → 4,89 (−11 %) |
| Ruines · Rôdeur | 0 / 0 / 80 | 100 → 100 % | 6,5 → 6,5 % | 5,66 → 5,66 |
| Ruines · Mage | 59 / 21 / 0 | 100 → 100 % | 2,8 → 3,3 % | 3,52 → 3,66 (+4 %) |

Aucun écart de plus de ~5 points : le taux de victoire est saturé (duel à PV pleins), les PV perdus bougent de −1,2 à +0,5 point. Le Chevalier gagne le plus (combats 10 à 11 % plus courts au Désert et aux Ruines, où le pool résistait à l'épée). Boss et élites : déjà neutres, inchangés (`forest-bench` le confirme, il ne joue que les boss).

## Laissés

- `tools/sim/seve-bench.js` : pas simple. `petite_aventure_foret.seveAeswyn` a disparu avec les Petites Aventures PA2 (v3.388.0). La Sève vient désormais de `PA2_RARE.forest` (`js/data/pa2-content.js` : 25 % par trouvaille × qualité du jet, 2 / 3 / 4 à la destination selon l'anneau), lue par `Pa2Run.takeRelic` et `Pa2Run.finish`. Le modèle d'offre du banc (chance par nœud et finale par intensité, profils bourrin / prudent) n'a pas d'équivalent direct : il faut un nouveau modèle (trouvailles par carte, taux de réussite par anneau). Le banc s'arrête maintenant sur un message qui dit où est la donnée.

## Repéré (non corrigé)

- **Tir perforant** perd son avantage propre (ignorer l'affinité) : il reste 200 % des dégâts pour 50 Concentration. Le drapeau `ignoreAffinity` reste lu, sans effet (seule la pénalité sans arme serait encore ignorée). À voir si Seb veut lui redonner un trait.

Contrôles : node --check sur chaque JS modifié · round-harness 6 486 OK, 0 échec (2 passes) · boot 4 OK · création 44 OK · i18n 8 427 textes, 100 %, 0 orphelin · parcours 212 OK · Bestiaire vu dans Chromium à 390 × 844 (fiche du Ver des sables, liste du Désert : aucune ligne d'affinité, page de 390 px, aucune erreur). Fichier protégé touché : `combat-engine.js` (accord de Seb, minimal). Aucun fichier ajouté.
