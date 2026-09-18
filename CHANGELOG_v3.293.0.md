# v3.293.0 — Plus de farm libre

Règle posée par Seb le 18/09/2026 : **seules les quêtes définies et testées font foi.**
Aucune progression ne dépend plus d'un combat lancé hors quête. Ce lot prépare l'ouverture
du Désert : `worldIndex` ne peut plus être déplacé par un combat.

## 1. Le problème corrigé

En v3.292.0, le farm libre restait joignable par deux entrées :

- **l'Ascension**, qui renvoyait sur l'onglet Combat avec un ennemi sans contexte ;
- **quatre étapes d'Histoire** dont le lien menait à l'onglet Combat.

Or `killEnemy` appelait encore `WorldManager.advance()`. Après une Ascension, un joueur qui
enchaînait la Lisière puis le Cœur voyait donc l'Orc tomber, la porte du Désert s'ouvrir, et
**basculait au Désert sans traversée**. Le même chemin alimentait les questlines de
`world-quests.js`.

## 2. L'onglet Combat n'existe plus sans quête

- `hasCombatQuestContext()` (`quest-enemy-system.js`) : vrai seulement pendant un run de
  donjon, d'aventure, de chasse, d'élite de carte ou de combat de scène.
- `switchTab("combat")` sans run renvoie au Campement. Cela couvre l'Ascension, une
  sauvegarde rouverte sur l'onglet Combat et tout ancien lien.
- L'abandon ou l'échec d'une quête d'aventure et l'arrêt d'une chasse ramènent au Campement.
  Avant, le joueur restait sur l'écran Combat devant un ennemi libre.
- `combat-engine.js` (**fichier protégé, accord Seb**) :
  - `killEnemy` n'appelle plus `WorldManager.advance()`, `WorldQuestManager.trackKill` ni
    `trackBossKill`, et ne verse plus de récompense de chapitre ;
  - l'horloge automatique (`tickRoundClock`) ne joue aucun round hors run de quête.
- `progression-system.js` n'est **pas** modifié : `advance()` n'a simplement plus d'appelant.

`worldIndex` n'est plus écrit que par : l'Ascension (retour à 0), le chargement de sauvegarde
et l'Admin — et, à venir, la traversée et le voyage libre du Désert.

## 3. Quatre étapes de la Forêt

| Étape | Avant | Maintenant |
| --- | --- | --- |
| Premier sang | 5 victoires sur l'onglet Combat | Run **« Premier sang »** : 5 ennemis à la Lisière, PV ×0,8 |
| Franchir la Lisière | Traverser la Lisière en farm (position) | Run **« Franchir la Lisière »** : 9 ennemis puis le Roi Slime, PV pleins |
| Le grimoire du veilleur | 10 victoires au Cœur + 1 règle | 1 règle, puis run **« Tenir le Cœur »** : 10 ennemis de l'Acte III |
| Celle qui demande | Lien vers l'onglet Combat | Lien vers le tableau des missions ; tout combat de quête compte |

- Les trois runs sont des quêtes d'aventure (`data/adventure-quests.js`), visibles au tableau
  seulement pendant leur étape. Elles n'ont pas de récompense propre : l'étape d'Histoire paie.
- Retirées : `storyGoToCoeur`, `storyResetLisiere`, `storyLisiereCrossingProgress`, le
  suivi de position dans `_trackKills` (Cœur atteint, retour à la Lisière, victoires au Cœur).
- Effet de bord : chaque run réussi donne 10 XP de mission, soit 30 XP de plus sur la Forêt.

## 4. Mesures — `sim/story-runs-bench.js` (nouveau)

Même graines, vrai moteur : la suite d'ennemis de l'ancien farm contre le run défini.
300 runs par cellule, une mort = échec.

| Étape, profil | Ancien farm | Nouveau run |
| --- | --- | --- |
| Premier sang, mains nues, 0 potion | C 86 % · R 53 % · M 83 % | C 100 % · R 95 % · M 100 % (fin à 32-44 % des PV) |
| Franchir la Lisière, arme +15 | 100 % partout, fin à 44-50 % | 100 % partout, fin à 45-53 % |
| Le grimoire du veilleur, vitrine + entr. 10 | 100 %, fin à 50-59 % | 100 %, fin à **75-85 %** |

- **Premier sang ×0,8** : en farm libre, une mort ne retirait aucun kill ; dans un run, elle
  fait tout recommencer. À ×1, le Rôdeur échouait 44 % des départs. Réglage à confirmer.
- **Tenir le Cœur est plus facile** que l'ancien farm : ce dernier faisait combattre l'Orc en
  10e ennemi, avant même sa propre quête. Alternative mesurable : 9 ennemis + l'Orc.
- **Biais corrigé dans `sim/premier-sang-bench.js`** : il comptait un kill à chaque changement
  d'objet ennemi, donc aussi la mort du héros (qui régénère un ennemi). Les 90-99 % annoncés en
  v3.260.0 étaient en réalité 53-86 %. Il compte désormais sur `game.totalKills`.

## 5. Sauvegardes

`StoryQuestManager._migrateV3293`, une seule fois :

- étape déjà passée : le run correspondant est marqué terminé ;
- étape acceptée dont l'ancien objectif était déjà rempli : run marqué terminé, l'étape reste
  prête ;
- étape acceptée à mi-chemin : l'avancée en farm est perdue, le run se lance du tableau.

Aucun nouvel état persisté : `save-system.js` n'est pas touché.

## 6. Contrôles

- `round-harness.js` : **0 échec**, stable sur 3 passages (2 555 à 2 556 OK, section [85]
  sautée comme avant). Nouvelle section **[89]**. Les tests de l'ancien farm sont réécrits
  sur le nouveau comportement : horloge automatique, compteur de Premier sang, onglet Combat,
  lien du Grimoire, traversée de la Lisière, garde de scène, et `advance()` — qui vérifie
  désormais qu'un Orc tué hors quête ne mène **pas** au Désert.
- `boot-harness.js` : 4 OK. `hero-creation-harness.js` : 44 OK.
- `sim/forest-bench.js --diff` : écart nul.

## Fichiers

`js/core/constants.js`, `js/data/adventure-quests.js`, `js/data/story-quests.js`,
`js/systems/adventure-quest-system.js`, `js/systems/combat-engine.js` (protégé),
`js/systems/hunt-quest-system.js`, `js/systems/quest-enemy-system.js`,
`js/systems/story-quest-system.js`, `js/ui/ui-root.js`, `round-harness.js`,
`sim/premier-sang-bench.js`, `sim/story-runs-bench.js` (nouveau), `sw.js`.
