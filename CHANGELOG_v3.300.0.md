# v3.300.0 — W-2 : le chapitre du Désert s'ouvre, « La traversée »

Premier lot de contenu du Désert. Il pose le chapitre 2 et sa première étape, telle qu'écrite
et validée dans « Désert — Acte I » v1.0, §3. Une partie qui a terminé la Forêt voit
désormais « La traversée » au tableau ; après l'arrivée au camp du Portail, le chapitre
affiche « La suite de l'histoire arrive bientôt… » en attendant l'étape 2.

## 1. Le chapitre 2 — `js/data/story-quests.js`

- `STORY_QUESTS.desert` : « **Ce que le sable garde** », Chapitre 2 — Désert. S'ouvre quand la
  Forêt est terminée (`requiresChapter`, v3.297.0). Le titre du chapitre est une proposition.
- Étape `desert_01` « La traversée », Acte I — La surface : objectif, 9 répliques au départ
  (Orwen et Brannoc dans leur version révisée), complétion, et la scène d'arrivée (6 répliques)
  affichée à la réclamation. L'étape mène au run et se remplit à l'arrivée.
- Récompense **provisoire** : 600 or, 20 essence, à caler au banc avec le reste de l'acte I.

## 2. Le run — `js/data/scene-templates.js`, `js/data/scene-nodes.js`

- Canevas `traversee_desert` : quatre paliers **écrits**, rien de tiré :
  1. obstacle « Les dalles ensablées » ;
  2. le premier puits (nœud source : rend du Souffle ou soigne) ;
  3. la nuée : trois scarabées du Désert ;
  4. obstacle « Le vent de face ».
- Coût : **une Ration moyenne**, le prix de Sarkel. Sans elle, le départ est refusé.
- Journal fixe par palier, dont la ligne d'après la nuée (« Wenna compte les carapaces »).
- Ses combats sortent du Désert (`worldId`) ; le monde de résidence ne bascule qu'à l'arrivée
  (`travelOnSuccess`). Pas de boss d'aventure en fin de run.
- Deux gabarits d'obstacle du Désert, réutilisables par la future Petite Aventure. **Leurs
  libellés sont une proposition**, pas encore validés :
  - Les dalles ensablées : *Soulever la roue enlisée* / *Suivre les traces de la carriole* /
    *Pousser jusqu'au sable dur* ;
  - Le vent de face : *Avancer contre le vent* / *Suivre les pieux plantés* / *Attendre qu'il
    retombe, puis marcher*.
- Groupe de combat `scarabees_desert` : trois scarabées, PV et butin ×0,35 chacun (grammaire D2).

## 3. Moteur (petits ajouts)

- `SceneEngine.buildCard` : `template.fixedCard` — parcours scripté, palier par palier (copie
  profonde, le canevas partagé ne bouge jamais).
- `template.finalBoss: false` : pas de boss d'aventure après le dernier combat du run.

## 4. Donjon du Désert fermé jusqu'à W-4

La traversée rend le Désert atteignable ; « Cité engloutie » s'ouvrait alors (plafond de monde
1), sans pool, sans élites ni boss calibré. Elle passe `locked: true` (« Pas encore
disponible ») jusqu'au lot W-4.

## 5. Mesure — `sim/traversee-bench.js` (nouveau)

La nuée face à un héros de fin de Forêt, 150 rencontres par cellule :

| Profil | Chevalier | Rôdeur | Mage |
| --- | --- | --- | --- |
| vitrine, entr. 20, Wenna | 100 %, 5 rounds, 82 % PV | 100 %, 4 rounds, 90 % | 100 %, 5 rounds, 85 % |
| vitrine, entr. 40, Wenna | 100 %, 4 rounds, 88 % | 100 %, 4 rounds, 92 % | 100 %, 5 rounds, 89 % |
| vitrine, entr. 20, seul | 100 %, 5 rounds, 82 % | 100 %, 4 rounds, 91 % | 100 %, 4 rounds, 91 % |

Premier contact volontairement doux (deux scarabées sur trois tirent déjà l'archétype
Silencieux). Le pool du Désert reste à rééquilibrer (D1) : ce banc sera relancé à ce moment.

## Contrôles

- round-harness : 0 échec, stable sur 3 passages (2 639-2 640 OK, [85] sautée). Nouvelle
  section **[95]** (19 contrôles) : verrou du chapitre, donjon fermé, textes, coût, carte
  scriptée, résidence pendant le run, journal (palier 1, puits, après la nuée, palier 4), nuée de
  trois scarabées du Désert sans boss, arrivée, étape prête, cap à 4, scène d'arrivée à la
  réclamation. Section [32] : le verrou de donnée du Donjon II est levé le temps de la section,
  qui teste le verrou de monde.
- boot-harness 4 OK ; hero-creation-harness 44 OK ; `sim/forest-bench.js --diff` : écart nul.
- Playwright (iPhone 13) : chapitre visible à l'écran Quêtes, « Aller à la quête » lance la
  traversée (Ration payée), premier palier et sa ligne de journal, aucune erreur de page.

Aucun fichier protégé modifié.

## Fichiers

Nouveau : `sim/traversee-bench.js`. Modifiés : `js/data/story-quests.js`,
`js/data/scene-templates.js`, `js/data/scene-nodes.js`, `js/data/dungeon.js`,
`js/systems/scene-engine.js`, `js/systems/scene-run-system.js`, `js/core/constants.js`,
`sw.js`, `round-harness.js`.

À appliquer après v3.299.0.
