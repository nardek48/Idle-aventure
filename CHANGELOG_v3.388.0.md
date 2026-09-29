# Aethervale v3.388.0 — Petites Aventures v2, lot PA2-6 : le nettoyage

Base : v3.387.0. Décisions de Seb du 29/09/2026 : **G1 A, G2 A.**

**Aucun fichier nouveau. Aucun fichier protégé touché.**

## Correction de ce que je t'avais dit

En préparant G1, je t'ai dit que les profils Bourrin/Prudent servaient aux parcours d'Histoire. **C'est faux** : aucun parcours d'Histoire ne les utilise. Ils sont donc retirés aussi.

## 1. Ce qui est retiré du jeu

Environ 1 000 lignes en moins :

| Fichier | Avant | Après |
| --- | --- | --- |
| `scene-run-system.js` | 1 762 lignes | 1 309 |
| `scene-view.js` | 1 157 | 921 |
| `scene-templates.js` | 888 | 482 |

Retirés :
- **Profils Bourrin/Prudent** : choix, écran, garantie de combat.
- **Intensités Sentier/Chemin/Périple** : le choix v1 et le tableau `SCENE_INTENSITY`. Les noms des anneaux passent dans `PA2_RINGS`, lus par la carte vivante.
- **Mutateurs** : brouillard, pluie, nuit, tempête, chaleur. Retirés aussi : leur tirage, leur écran et leur pastille.
- **Nœuds bloqueurs à minuteur** : génération, écran, exception de navigation dans `ui-root.js`.
- **Tirages de Sève et de Verre des dunes v1** (par nœud et à la finale), et la chambre finale des Petites Aventures.
- **L'ancien événement de Maddoc** (`SCENE_NODES.events`, injection, échos). La v2 le porte comme accroche depuis la v3.387.0.
- **Le bac à sable `expedition_faille`** et son bouton admin.
- **Les canevas des deux Petites Aventures**, ramenés à leur carte de lancement : titre, monde, visibilité au tableau, drapeau de l'étape « L'outre ».
- **Le drapeau `paVersion`**. Une Petite Aventure se reconnaît à son canevas `mode: "pa2"` (`Pa2Run.isTemplate`), partout : lancement, tableau de missions, place de la réserve depuis la carte vivante.

## 2. Ce qui reste, et pourquoi

Le moteur de scènes fait tourner les **six quêtes de déblocage du village** et les **trois parcours d'Histoire** du Désert : la traversée, la descente au Temple, la remontée du fleuve. Ils gardent tout ce qu'ils utilisent :
- la chambre finale, qui clôt aussi les quêtes ;
- la préparation à 3 objets ;
- l'amulette, les provisions, la gourde et l'Outre ;
- le Souffle, les blessures, la torche.

**La remontée du fleuve a maintenant son propre sac** (Outre comprise) et sa phrase de fin, écrits dans son canevas.

**Pour retirer complètement la v1**, comme tu le demandes, il reste un chantier à part : faire passer ces neuf runs au modèle v2 (carte, besace), ou leur donner un petit moteur à eux. Je te proposerai les options quand tu voudras l'ouvrir.

## 3. Sauvegardes en cours

Si une sauvegarde contient une Petite Aventure v1 en cours (ou un run du bac à sable), elle se clôt proprement au chargement : le butin ramassé est rapporté, la place de la réserve est rendue, et une ligne le dit dans le journal (`SceneRunManager._retireLegacyRun`).

## 4. Textes

- **Tableau de missions** : la carte de Petite Aventure dit « Une nuit, une carte, trois fins possibles. Prépare ta besace. » au lieu de « choisis ton style : rapide et risqué… ».
- **Étape « L'outre »** : les astuces et l'objectif parlent de la besace, de la soif à chaque pas et de la destination à atteindre.
- **Anglais** : 58 traductions devenues inutiles sont retirées, 5 nouvelles ajoutées. Couverture : 3790 textes, 100 %, 0 orphelin.

## 5. Tests (G2 A)

- **round-harness.js : 3619 OK, 0 échec, sur 4 passages.** Il y a moins de contrôles parce que les mécanismes retirés ne sont plus testés.
- **Canevas de test du moteur** : les sections qui testent le moteur de scènes lui-même tournent sur ce canevas. C'est une copie de l'ancien `expedition_faille`, avec la gourde et les profils d'option, injectée par le harnais et jamais livrée dans le jeu. Sections concernées :
  - [S1] : moteur, persistance, blessures, retour volontaire, abandon, garde de sortie ;
  - [PA] : blessures, voies, charges, soins, échelle du héros ;
  - [SOUFFLE] ;
  - [98] : Outre payée et bue ;
  - [103] et [104].
- **Supprimées** (mécanismes retirés, la v2 est couverte par [158] à [164]) :
  - [S1b], [PA1], [PA2], [PA2b], [PA4], [PA5], [PA6], [PA3], [PA2-fix] ;
  - [43] Sève par intensité, [108] Maddoc v1 ;
  - le bloc « plafond de 2 combats » (v3.132.0).
- **Réécrites sur la v2** :
  - [58] : run ciblé sur un secteur (préparation, anneau, abandon, destination qui libère le secteur, KO sans régression) et mur sans ration d'entrée ;
  - [59] : corde +1, gourde 40, autel gratuit ;
  - [99] : règles du Désert du moteur (gourde à une gorgée, ligne de mort, guerriers) sur un canevas de test ;
  - [100] et [126] ;
  - [139] : le sac propre de la remontée.
- **[158]** : nouveau contrôle. Un run v1 repris d'une ancienne sauvegarde se clôt, rapporte son butin et rend sa place.
- **Autres harnais** :
  - **campagne-harness : 38/38** ;
  - **parcours-harness P1 à P12 : 131 OK** ;
  - **boot-harness : 4 OK** ;
  - **hero-creation-harness : 44 OK**.
- `node --check` passe sur tous les JS modifiés.

## 6. Outils hors jeu

- **Retirés**, parce qu'ils ne jouaient que les Petites Aventures v1 : `sim/pa-v1-ref-bench.js`, `sim/desert-pa-bench.js`, `sim/desert-pa-combat-bench.js`, `sim/map-bench.js`, `sim/seve-bench.js`. Les deux derniers ne tournaient déjà plus (voir v3.382.0). Les chiffres de référence v1 restent dans le CHANGELOG de la v3.383.0.
- `sim/plafond-bench.js` perd ses deux cellules de Petite Aventure : leur mesure est `sim/pa2-bench.js`.
- `sim/campagne-harness.js` et `sim/pa2-bench.js` sont nettoyés de leurs appels v1.

**À supprimer de ton côté** (un delta ZIP ne peut pas effacer de fichiers) : les cinq fichiers de `sim/` listés ci-dessus.

## Fichiers

- **Jeu :**
  - `js/systems/scene-run-system.js`, `js/systems/scene-engine.js`, `js/systems/pa2-run.js`, `js/systems/mission-board-system.js`, `js/systems/living-map-system.js` ;
  - `js/ui/scene-view.js`, `js/ui/admin-view.js`, `js/ui/ui-root.js`, `js/ui/living-map-view.js` ;
  - `js/data/scene-templates.js`, `js/data/scene-nodes.js`, `js/data/pa2-content.js`, `js/data/story-quests.js`, `js/data/living-maps.js` ;
  - `js/lang/en.js`, `js/lang/data-fields.js` ;
  - `sw.js` (CACHE_VERSION 3.388.0), `js/core/constants.js` (GAME_VERSION 3.388.0).
- **Hors jeu :** `round-harness.js`, `sim/campagne-harness.js`, `sim/pa2-bench.js`, `sim/plafond-bench.js`.
