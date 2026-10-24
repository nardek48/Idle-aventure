# v3.472.0 — Donjons : les haltes

Bilan des donjons, point 1 suite (option A, décisions de Seb) : des haltes dans le run, avec trois cartes au choix. Prototype : `atelier/halte-donjon.html` et la page Artifact « Halte de donjon ».

## Ce qui change en jeu
- **1 à 3 haltes par run** (25 % une, 50 % deux, 25 % trois), tirées au lancement parmi les emplacements du donjon :
  - Tanière, Cité : après les vagues 4, 9 et 13 (avant les élites 5 et 10, puis la fin) ;
  - Sanctuaire, Ossuaire : après les vagues 4, 11 et 13 (jamais au campement).
- **Seulement sur un donjon déjà terminé**, et jamais sur une sortie offerte par l'Histoire (option 1) : les donjons de l'Histoire ne bougent pas. Ensuite, la difficulté vient des niveaux de donjon.
- À chaque halte, **3 cartes différentes** : on en prend une, ou on **passe** (sans contrepartie). Une carte prise ne revient pas sur le même run. **Aucune halte ne soigne.**
- La vague suivante attend derrière la feuille (comme au campement) ; recharger la partie rouvre la feuille.

| Carte | Effet jusqu'à la fin du run | Type |
| --- | --- | --- |
| Lame bénie | +10 % de dégâts | Bonus |
| Rempart | ennemis −10 % de PV | Bonus |
| Pacte de sang | or du run +30 % (vagues et fin) ; ennemis +25 % de PV | Échange |
| Pacte du dément | +20 % de dégâts ; plus de potions | Échange |
| Râtelier | l'objet de combat qui contre le trait du boss (Encens amer, Baume froid…), proposé seulement s'il n'est pas déjà emporté | Préparation |
| Coffre | +5 Éclats tout de suite, acquis même en cas de mort | Butin |
| Autel brisé | boss −15 % de PV ; pas d'objet unique sur ce run | Échange |

- Les cartes prises s'affichent sur la carte du run en cours (onglet Donjon) et dans le rapport de fin (ligne « Haltes »). Elles ne comptent pas comme des Marques (pas de bonus de +15 %).

## Mesures (`plafond-bench --halte`, 30 runs par classe, Chevalier / Rôdeur / Mage ; robot : bonus purs d'abord, pactes en dernier)
| Banc | Sans halte | Avec haltes |
| --- | --- | --- |
| Tanière (foret) | 100 / 100 / 97 %, PV 38 / 48 / 44 % | 97 / 100 / 100 %, PV 40 / 49 / 43 % |
| Cité (campagne) | 47 / 77 / 93 % | 70 / 83 / 87 % |

Les haltes facilitent le run d'une dizaine de points là où il résiste : c'est leur récompense, qui sert à monter un ou deux niveaux de donjon plus haut.

## Code
- `data/dungeon.js` : `haltSlots` par donjon, `DUNGEON_CONFIG.haltCountWeights` et `haltCardCount`, `DUNGEON_HALT_CARDS`, `DUNGEON_HALT_KIND_LABELS`.
- **Fichier protégé (accord Seb)** : `systems/dungeon-system.js` : `drawHalts`, `reachHalt`, `haltAction`, `drawHaltCards`, `getRunBoons`, `getCounterItemId` ; PV des ennemis et du boss dans `buildWaveEnemy`, or de fin dans `finish`, pas d'unique sous l'Autel brisé.
- `systems/affliction-system.js` : les cartes passent par le canal des Marques (dégâts, or, potions interdites).
- `ui/dungeon-view.js` : feuille de halte, cartes sur le run en cours, ligne du rapport ; `css/04-panel-dungeon.css`.
- `lang/en.js` (33 textes), `lang/data-fields.js`.
- État dans `game.dungeonRun` (sauvegardé en entier) : aucun câblage de sauvegarde. Aucun fichier ajouté.

## Images à faire (icône générique en attendant, chemins gardés)
`images/Icons/dungeon/` : `halte.webp` (en-tête de la feuille), `halte_lame.webp`, `halte_rempart.webp`, `halte_pacte_sang.webp`, `halte_pacte_dement.webp`, `halte_autel.webp`. Le Râtelier montre l'icône de l'objet donné ; le Coffre, celle des Éclats.

## Outils
- `round-harness.js` : section [293] (tirage 1 à 3, pas de halte sur un donjon jamais terminé, carte hors tirage refusée, aucun soin, Passer, chaque carte, rapport, feuille).
- `plafond-bench.js` : `--halte`.
