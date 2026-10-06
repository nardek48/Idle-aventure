# Aethervale v3.428.0 — Chapitre 3, les Ruines : acte I

Lots U-1 à U-4 de la Conception Ruines v1.3. Texte de l'acte : document « Ruines — Acte I » v1.0. S'applique sur la v3.427.2.

## L'histoire : 5 étapes jouables
Le chapitre s'ouvre à la fin du Désert. Le titre « La ville rangée » est **provisoire** : à valider.
1. **ruines_01 · La traversée** : parcours `traversee_ruines` (4 cases, combat de squelettes à la case 3), entrée 2 Outres pleines. À l'arrivée : monde 3, aventure 1.
2. **ruines_02 · Les couloirs qui changent** : quête `aq_ruines_couloirs` (5 rencontres). Tutoriel « La relève ».
3. **ruines_03 · Edda** : Edda rejoint l'équipe. Choix « qui reste au camp » (Wenna ou Maddoc), puis la quête `aq_ruines_edda` (4 rencontres, Edda obligatoire dans le groupe). Tutoriel « Deux sur trois ».
4. **ruines_04 · Le Marché des Ruines** : envoyer la caravane au nouveau marché et la voir revenir. La Halle passe au prix d'Histoire (niveau 1). Tutoriel « Le Marché des Ruines ».
5. **ruines_05 · Le seuil** : choix **Soi** ou **Aeswyn**.

Récompenses : 1 500 / 1 600 / 1 700 / 1 800 or, puis 3 Pierres errantes et 2 000 or à la dernière étape (**provisoire**).

## La relève (nouveau mécanisme)
- Le **Squelette** et le **Zombie** ne meurent pas à leur premier coup fatal : ils restent **à terre** avec 1 PV.
- Une frappe pendant ce temps les **achève**. Sinon, au round suivant, ils se relèvent avec **50 % de leurs PV**.
- Ils ne se relèvent qu'une fois. À terre, ils ne frappent pas, et la cible passe d'elle-même à un ennemi debout.
- **Grimoire** : nouvelle condition « Un ennemi se relève ». Son action vise l'ennemi à terre.
- La **Gargouille** porte désormais l'archétype Blindé.

## Réglage « Cible » du Grimoire
- Trois choix : **La plus proche** (comportement d'avant, par défaut), **La plus faible**, **Le soutien**.
- Une cible touchée au doigt passe avant le réglage, jusqu'à ce qu'elle tombe.
- Le réglage est sauvegardé.

## Edda, troisième compagnon
- Rôle **Achever**, arme pioche. Compétence « Le dernier trait » : elle frappe l'ennemi à terre (×1,5, recharge 2) et ne la joue que s'il y en a un.
- Le groupe reste à **deux compagnons**. Pendant l'étape 3, Edda ne peut pas quitter le groupe.
- Les quêtes qui exigent un compagnon absent sont masquées au tableau des missions.

## Le seuil (choix de l'étape 5)
- **Soi** : une fois par combat, le héros tombé se relève avec **25 % de ses PV**. **Simplification** : il se relève aussitôt, sans round à terre.
- **Aeswyn** : **−10 % de matériaux** sur les chantiers du village. L'or ne change pas, et l'écran du bâtiment l'indique.

## Monde 3
- **Pierre errante** : nouvelle ressource, la rare du Marché des Ruines.
- Plafonds du monde 3 : **provisoires, égaux à ceux du Désert**. Entraînement et talents prévus jusqu'à ruines_01 (Terrain 9, 11 points).
- Mise à l'échelle des héros : référence provisoire du Désert.
- Deux nouveaux obstacles de parcours : « Route de pierre » et « La rue qui tourne ».
- **La Clé de voûte n'est pas encore déclarée** : elle arrivera avec la Forge 4.

## Équilibrage (mesuré)
- **Banc `sim/ruines-acte1-bench.js`** : profil fin du chapitre II, sans potion, 40 runs. Réussite 100 % sur les deux quêtes.
  - étape 2 : 29 à 43 % de PV perdus ;
  - étape 3 : 32 à 39 % de PV perdus, quel que soit le compagnon qui reste.
- **Traversée** : 31 à 35 % de risque en Tenir, 57 à 65 % en Charger.
- Campagne complète (robot, options A et B, trois classes) : le chapitre 3 se termine.

## Code
- **Nouveau fichier** `js/systems/rise-system.js` : ajouté à `index.html` après `combat-engine.js`, et précaché dans `sw.js`.
- **`combat-engine.js` (accord de Seb)** : une ligne de garde dans chacun de ces points :
  - `killEnemy` ;
  - `enemyTurn` ;
  - `onHeroDefeated` ;
  - l'action automatique du héros ;
  - `tickRoundClock`.
- **`save-system.js` (accord de Seb)** : `grimoireTarget` est ajouté à l'écriture, à la lecture (valeur vérifiée) et à la remise à zéro.
- `combat-actors.js` :
  - nouvelles fonctions `standingEnemies`, `retarget` et `pickByPolicy` ;
  - `removeEnemy` choisit une nouvelle cible.
- Outils de simulation :
  - `sim/campagne-harness.js` : nouvelles options `--avise` (un joueur qui règle ses talents et son Grimoire) et `--jusqua <étape>`, plus les gestes du chapitre 3 ;
  - nouveau banc `sim/ruines-acte1-bench.js`.

## Images à fournir
Tant qu'elles manquent, elles gardent leur vrai chemin et s'affichent en icône générique :
- `images/Maps/parcours/ruines_route.jpg` : fond de la traversée, de la caravane et de la carte des expéditions. Le tracé du parcours est **provisoire**, copié du Désert : à refaire avec l'image.
- `images/Companions/edda.png` : portrait d'Edda.
- `images/Icons/combat_status/rising.png` : condition « Un ennemi se relève ».
- `images/Icons/companions/edda_dernier_trait.png` : compétence d'Edda.
- `images/Icons/resources/pierre_errante_icon.png` : la Pierre errante.

## Contrôles
- Round : **3 924 OK**, 0 échec, sur trois passages. Nouvelle section [203] (31 contrôles). Trois anciens contrôles sont adaptés : le monde 3 a désormais une entrée d’acte et une suite d’Histoire.
- Parcours : 139 OK. Boot : 4 OK. Création du héros : 44 OK.
- i18n : 3 994 textes, 100 %, 0 orphelin. Environ 148 nouvelles traductions anglaises.
- `node --check` sur tous les fichiers modifiés.
