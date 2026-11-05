# v3.700.0 — Mage face au Dragon, pronostic du Mage, faiblesses des boss et élites, `ensure*` du Camp (Seb, 05/11, option A)

Décisions de Seb du 05/11, appliquées telles quelles. Mesures sur le vrai moteur.

## Corrigés

- **MAGE-DRAGON**, option A : face au Mage seulement, la puissance des ennemis de la quête de `montagne_19` (`aq_montagne_dragon`, deux rencontres et Dragon ancien) est multipliée par **0,8**.
  - Donnée : `classPowerMult: { mage: 0.8 }` sur la quête, lisible à côté de `enemyPowerMult` et `bossPowerMult`. Fichier : `js/data/adventure-quests.js`.
  - Moteur : `QuestEnemyManager.getPowerMult` applique `getClassPowerMult(quest)` (classe du héros ; absent = 1), après le gabarit de classe. Les dragonnets de la phase à 50 % (`addsPowerMult`) ne sont pas concernés. Fichier : `js/systems/quest-enemy-system.js`.
  - Champ générique : il peut servir à une autre quête, sans code de plus.
- **PRONO-MAGE**, option A : `FORECAST_CLASS_DMG_MULT.mage` = **0,9** (le Chevalier reste à 0,75, le Rôdeur sans coefficient). Le Mage sans arme avec 3 potions passe de « Risqué » à « Très difficile ». Les verdicts des profils armés restent les mêmes. Fichier : `js/systems/combat-forecast-system.js`.
- **FAIBLESSES**, option A : le Bestiaire n'affiche plus « Résiste / Faible » pour les boss (boss de donjon compris) et les élites, puisque le moteur les ignore depuis v3.102 (`getDamageAffinity`). Les ennemis ordinaires gardent les deux lignes.
  - Les données (`resists`, `weak`) et le combat ne changent pas.
  - Le Codex, les fiches d'équipement et le pronostic n'affichaient pas d'affinités : rien à y retirer.
  - Un seul point de décision : `bestiaryAffinityLines(d)` sert la carte et la fiche. Pour un retrait complet, il suffit qu'elle renvoie `[]` (ou de supprimer ses deux appels).
  - Fichier : `js/ui/bestiary-view.js`.
  - Vu dans Chromium (390 × 844, français), Montagne : le Dragon ancien (boss) et l'Ifrit qui trie (élite) n'ont aucune ligne d'affinité, ni sur la carte ni sur la fiche. L'Ifrit ordinaire garde « Résiste : la magie » et « Faible : l'arc » sur les deux. Cartes de 324 px de large, page de 390 px (pas de défilement horizontal), aucune erreur.
- **PERF-4** (reste) : drapeau `_ensured`, sur le principe de v3.699.0.
  - Appelants trouvés (Chromium, Camp) : le tableau de missions (`MissionBoard`), par `SceneRunManager.petiteAventureCountToday` / `canStartPetiteAventureToday` (`_paState`, 12 fois/s) et `isQuestCompleted` (3 fois/s). `SceneRunManager.ensureDefaults` relançait `ensureGameStateDefaults` en entier, qui appelle `AdventureQuestManager.ensureDefaults`. Les deux compteurs de v3.699 étaient donc une seule chaîne.
  - `scene-run-system.js` : la réserve des Petites Aventures déjà validée (même objet) n'est pas revalidée. Un état remplacé (chargement, remise à zéro) relance tout.
  - `adventure-quest-system.js` **(protégé, accord de Seb)** : la progression et les quêtes finies déjà validées (mêmes objets) ne sont pas repassées. `start` force la validation complète (`ensureDefaults(true)`).
- **ARCH-9** (fin) : la publication de v3.699.0 est confirmée (run 571). Suppressions :
  - **fichiers supprimés** : `js/systems/hunt-quest-system.js` et `js/data/hunt-quests.js`. Le `sw.js` publié ne les précachait déjà plus, et aucun fichier ne les référence (`game/`, `tools/`, `index.html`, `sw.js`, workflow) ;
  - `js/lang/en.js` : section « hunt-quest-system » (11 textes) et deux en-têtes « HUNT_QUESTS » vides ;
  - outillage : `seve-bench.js` ne charge plus `hunt-quests.js`, et `generate-balance-guide.js` tolère l'absence de `HUNT_QUESTS`.
- `js/lang/en.js` : Quoi de neuf (une ligne).
- `tools/harness/round-harness.js` :
  - [465] : réglage par classe et puissance réelle du Dragon (156 → 125 face au Mage), Chevalier, Rôdeur et autres quêtes inchangés, coefficient du Mage dans le pronostic, Bestiaire (boss, élite, ordinaire, cartes), combat inchangé, textes des chasses, `ensure*` comptés, état remplacé, départ de quête forcé ;
  - [464] : les deux fichiers des chasses sont absents du disque.

## Mesures

### MAGE-DRAGON : `montagne-acte3-bench --quetes aq_montagne_dragon --runs 40` (sauvegardes d'entrée de Tour)

| | Chevalier | Rôdeur | Mage |
|---|---|---|---|
| v3.698.0 (40 runs pour le Mage) | 100 % | 95 % (20 runs) | 58 % |
| **v3.700.0 (Mage ×0,8)** | **100 %** | **85 %** | **80 %** |
| Rounds par run | 33 | 37 | 31 |

Le Mage arrive aux 80 % attendus ; 2 runs sur 40 atteignent la limite de rounds. Le Chevalier et le Rôdeur ne sont pas touchés par le code (contrôle [465]). L'écart du Rôdeur (95 % sur 20 runs, 85 % sur 40) vient du tirage.

### PRONO-MAGE : `forecast-calibration-bench.js .` (80 runs par profil, « Prouver sa valeur »), deux lancements

| Profil Mage | Échec réel | Avant (sans coefficient) | 0,85 (essai) | **0,9 (retenu)** |
|---|---|---|---|---|
| Rien du tout | 100 % | Hors de portée 2,00 | Hors de portée 3,60 | Hors de portée 3,20 |
| **Rien, 3 potions** | 90 % | Risqué 0,93 | Hors de portée 1,38 | **Très difficile 1,23** |
| Arme +10 | 0 % | Abordable 0,37 | Abordable 0,42 | Abordable 0,42 |
| Arme +15 | 0 % | Sans danger 0,25 | Sans danger 0,32 | Sans danger 0,32 |
| Arme +25 (vitrine) | 0 % | Sans danger 0,18 | Sans danger 0,25 | Sans danger 0,20 |
| Vitrine complète | 0 % | Sans danger 0,14 | Sans danger 0,18 | Sans danger 0,14 |
| Vitrine + 20 niveaux | 0 % | Sans danger 0,09 | Sans danger 0,09 | Sans danger 0,09 |

Le ratio ne suit pas le coefficient de façon linéaire, parce que les rounds sont arrondis : à 0,85, il saute au-delà de 1,30. Les profils du Chevalier et du Rôdeur sont identiques à v3.698.0.

### PERF-4 (reste) : arrêt au Camp (Chromium 390 × 844 @3x, CPU ×4, fin de partie de Chevalier, enveloppe de 6 s par fonction)

| | Avant | Après |
|---|---|---|
| `AdventureQuestManager.ensureDefaults` | 16,0 /s (1,03 ms/s) | 1,0 /s (0,02 ms/s) |
| `SceneRunManager.ensureDefaults` (appels / travail) | 15,0 /s (1,63 ms/s) | 15,0 /s (0,10 ms/s, retour immédiat) |
| `ensureGameStateDefaults` | 10,7 /s | 1,0 /s |
| Script, sans enveloppe (2 relevés de 10 s) | 19,7 / 22,3 ms/s | 23,0 / 21,4 ms/s |

Le coût total reste dans le bruit (environ 21 ms/s des deux côtés). Les compteurs montrent environ −2,5 ms/s sous enveloppes. Le reste vient de `VillageQuestManager.ensure` (1 /s, par `_villageMissions`) : il est négligeable et n'est pas touché.

## Repéré (non corrigé)

- `tools/sim/seve-bench.js` refuse de tourner : « ANCRE PERDUE : petite_aventure_foret.seveAeswyn introuvable ». C'est une donnée de scène, sans lien avec les chasses. C'était sans doute déjà le cas avant ce lot.

## Laissés

- Retrait complet des faiblesses (ennemis ordinaires compris) : la question est en attente chez Seb. La modification est prête pour lui (voir FAIBLESSES).

Contrôles : node --check sur chaque JS modifié · round-harness 6 477 OK, 0 échec (2 passes) · boot 4 OK · création 44 OK · i18n 8 431 textes, 100 %, 0 orphelin · parcours 212 OK · icônes : aucune absente · Bestiaire vu dans Chromium à 390 × 844. Fichier protégé touché : `adventure-quest-system.js` (accord de Seb, minimal). Aucun fichier ajouté. Fichiers supprimés : `js/systems/hunt-quest-system.js`, `js/data/hunt-quests.js`.
