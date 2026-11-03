# v3.616.0 — Audit de la Forêt : Village, bâtiments offerts, besace, tutoriels

Audit de la Forêt demandé par Seb (02/11) : quêtes, tutoriels, difficulté, bugs. Les quatre corrections recommandées sont livrées en une seule version (accord de Seb).

## 1. Scierie, Mine et Champs ne sont plus offerts (bug trouvé pendant l'audit)
- Cause : dès le Village ouvert, la suggestion « Monter une zone » du fil rouge (`FilRouge._zoneUp`) lisait les zones des 6 bâtiments, même fermés. `ProductionPlotsSystem.ensurePlots` créait alors leur entrée dans `game.production`, et `ProductionManager._migrateLegacyUnlocks` (« déjà en jeu = acquis », v3.110.0) y voyait une ancienne partie : Scierie, Mine et Champs s'ouvraient seuls. Le Bosquet silencieux, la Terre en friche et l'Éboulis ferreux passaient pour faits, et leur dotation (60 bois et 45 pierre chacun) était perdue. L'Entrepôt (`isWarehouseBeingMade`) faisait de même pour la Scierie. Présent depuis la v3.508.0.
- Correctif à la racine : une entrée créée par simple lecture, bâtiment fermé, est marquée `lockedStub` (`ensurePlots`, `ensureWorkshop`). La migration ignore ces entrées. À l'ouverture (`unlockBuilding`, `ensure`), la marque est levée et les horloges des zones repartent de maintenant (pas de rattrapage du temps passé fermé).
- Lectures corrigées : `FilRouge._zoneUp`, `isWarehouseBeingMade` et le jalon `zonesAtLevel` ne lisent plus un bâtiment fermé. `_countFullPlots` ignore une entrée marquée.
- Une ancienne partie (entrée non marquée) garde la migration v3.110.0 telle quelle.
- Les sauvegardes déjà touchées ne sont pas réparées : leurs bâtiments restent ouverts.
- Banc de campagne : le robot ouvrait lui aussi ces bâtiments dès `forest_02` (boucle des zones). Il ne monte plus que les zones des bâtiments ouverts. Les mesures d'économie du village faites avec le robot depuis la v3.508.0 étaient faussées.

## 2. Le Village s'ouvre à la réussite de « La meute affamée »
- Retour de Seb : une Meute ratée laissait le Village ouvert.
- Cause : les onglets d'une étape s'ouvrent à l'acceptation (décision v3.100.0). Accepter `forest_06` ouvrait déjà le Village, la carte vivante (gué, camp, étang), la Petite aventure Forêt et le Bosquet silencieux, quatre étapes avant le tutoriel de la carte.
- Correctif : nouveau champ d'étape `unlockTabsOnClaim`, appliqué par `StoryQuestManager.claimStep`. `forest_06` passe `village` de `unlockTabs` à `unlockTabsOnClaim`. La fenêtre de fin de la Meute réclame l'étape d'office (v3.458.4) et annonce « Débloqué : Village ». La carte d'étape affiche « Débloque à la réussite : Village ».
- Les autres étapes ne changent pas. Une partie qui a déjà accepté `forest_06` garde son Village.

## 3. « Comme la dernière fois » est propre à la partie
- Retour de Seb : sur une partie neuve, le bouton proposait la besace d'une autre sauvegarde (Trousse de maître). L'objet n'était pas réellement donné (stock contrôlé), mais le bouton n'avait rien à faire là.
- Cause : la besace était retenue sur l'appareil (`Prefs`, clé `pa2LastBag:<monde>`).
- Correctif : elle est retenue dans le coffre d'expédition (`game.expeditionChest.lastBag`), déjà sauvegardé en entier et vidé à chaque nouvelle partie (aucun fichier protégé, aucun point de sauvegarde à câbler). Le bouton est masqué si aucun objet retenu n'est disponible (monde, déblocage, stock de l'Entrepôt). Les anciennes clés `Prefs` ne sont plus lues.

## 4. Tutoriels : 7 erreurs factuelles corrigées (français et anglais)
- `forest_brume` : le Recouvrement ne reprend que le secteur rejoué déjà libéré (v3.366.0). Une première tentative ratée ne coûte rien.
- `forest_12` : le mode Tactique ou Grimoire se choisit au départ de la sortie, ou au Campement (v3.440.0).
- `forest_wenna` : un compagnon joue à sa place dans l'ordre des tours (v3.447.0). Le mode de combat décide pour tous les compagnons, il n'y a plus de réglage Auto ou Manuel par compagnon (v3.276.0).
- `village_training` : plafonds de 20 pour la caractéristique de classe et l'Endurance, 14 pour les autres. Chaque niveau du Terrain ajoute +10 ou environ +7 (v3.614.0).
- `pa2_prep` : en route, le repos, les autels et quelques reliques soignent aussi.
- Signalé, non corrigé (hors tutoriels) : la description du bâtiment Terrain (`village-buildings.js`) dit encore « +10 sur chacune des cinq ».

## Difficulté (banc de campagne, vrais combats, Forêt seule, une partie par classe)
- Forêt finie en 2,1 à 2,4 h simulées, aucun mur, 0 à 1 mort.
- La Meute reste la marche la plus haute du début : un robot qui part avec tous ses PV et des potions descend à environ 30 % de PV en Chevalier et en Mage. Aucun chiffre changé.

## Contrôles
- round-harness : 5 820 OK, 0 échec, stable sur 3 passes (après fusion de la v3.615.2). Nouvelle section [413].
  - [66b] et [201] mis à jour : nouvelles règles.
  - [UX-PROD] : la mise en place posait les drapeaux d'ouverture sur `game` au lieu de `game.explorationProgression`, et ne fonctionnait que grâce au bug du point 1.
- boot : 4 OK. Création du héros : 44 OK. Parcours : 142 OK.
- i18n : 100 %. Icônes : 15 absentes, toutes déjà connues avant cette version.
- Banc de campagne (Forêt, 3 classes) : 20 OK chacune.
