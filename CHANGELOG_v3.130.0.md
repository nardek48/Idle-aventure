# CHANGELOG v3.130.0 — Nœud combat : vagues de 6-10 ennemis + boss final

Retour Seb sur v3.129.0 : "les combats sont un peu court, il faudrait un certain nombre de
monstres, par exemple entre 8-10, pour les rencontres normales" + question sur le boss final.

## Clarification actée avant implémentation

Le concept d'origine (§1, §2) parle de "points" du parcours, pas de vagues — "plus de combats"
pour le profil Bourrin décrit déjà plusieurs POINTS de type combat sur le parcours (mécanique
déjà en place depuis le Lot PA2, ~32% de poids sur 8 paliers). La demande de Seb ("6-10
monstres") est une mécanique différente et complémentaire : **chaque point combat devient une
vague de plusieurs ennemis**, plutôt qu'un ennemi unique. Décision actée : les deux mécaniques
se cumulent (un run peut contenir plusieurs points combat, chacun étant une vague de 6-10) —
run plus long assumé, aucun ajustement de `profileWeights`.

Boss : actée après clarification — apparaît **uniquement au tout dernier point combat du
parcours complet**, pas à chaque rencontre. Les vagues normales (n'importe quel point combat
qui n'est pas le dernier du run) restent des rencontres standards sans boss.

## Mécanique : vague + boss final

`js/systems/scene-run-system.js` :

- **`_isLastCombatNodeOfRun(run)`** : scanne les paliers restants de `run.card` (généré
  entièrement à l'avance par `chooseProfile()`) pour savoir si un autre slot `combat` existe
  après le palier courant. Pas de recalcul dynamique nécessaire — la carte est figée dès le
  choix de profil.
- **`enterCombatNode()`** : tire `run._combatWaveTarget` (6 à 10 inclus, une fois, jamais
  recalculé en cours de vague) et pose `run._combatIsFinalWave` via la fonction ci-dessus.
  Spawn le premier ennemi de la vague (toujours normal, jamais le boss directement).
- **`_spawnNextCombatEnemy(run, forceBoss)`** : factorisée depuis l'ancien `enterCombatNode()`
  — génère l'ennemi suivant de la vague (ou le boss), réutilisée par `enterCombatNode()` et
  `onCombatWon()`. Même correctif v3.129.0 conservé (monde/aventure réels du joueur).
- **`onCombatWon()`** — logique réécrite en 3 branches :
  1. Vague pas terminée (`_combatWaveKills < _combatWaveTarget`) : ennemi suivant, le run
     scene-engine reste en pause (`status: "combat"`).
  2. Dernier kill de la vague, **et** c'est le dernier point combat du run
     (`_combatIsFinalWave`) : le **boss de l'aventure courante** apparaît à la place de
     continuer le run (`QuestEnemyManager.spawnFor(quest, true)`, même source que le boss
     d'`AdventureQuestManager` — suit donc automatiquement le monde/l'aventure réels, comme
     tout ennemi de Petite Aventure depuis v3.129.0).
  3. Dernier kill de la vague, run pas encore à son dernier point combat : reprend la
     progression normale du parcours (`_advanceOrFinish`), comme avant ce lot.
  Un flag `run._combatBossSpawned` distingue "le boss vient d'apparaître" de "le boss vient
  d'être vaincu" — le kill du boss lui-même retombe dans `onCombatWon()` (même dispatch
  `combat-engine.js`, inchangé), il faut donc différencier ces deux passages pour ne pas
  relancer un boss en boucle.
- **`onCombatDefeat()`** : inchangé — la mort pendant une vague normale ou face au boss reste
  une perte totale (règle universelle confirmée, aucune exception ajoutée pour le boss).

## Fichiers modifiés

```
js/systems/scene-run-system.js (enterCombatNode, onCombatWon, +2 fonctions internes)
sw.js (CACHE_VERSION -> 3.130.0)
round-harness.js (tests PA2 existants adaptés à la vague, +14 tests dédiés vague/boss)
```

Nettoyage au passage : un commentaire dupliqué (introduit lors d'une édition précédente,
v3.129.0) sur `enterCombatNode()` a été fusionné en un seul bloc cohérent.

## Tests

Harness : **~764-767 OK selon le tirage aléatoire de la cible de vague (6-10), 0 échec**
(742 précédents + 14 nouveaux dédiés vague/boss : cible tirée dans la bonne fourchette, run
reste en pause tant que la vague n'est pas nettoyée, distinction vague normale/vague finale via
`_isLastCombatNodeOfRun`, apparition du boss au dernier kill de la dernière vague seulement,
kill du boss termine réellement le nœud, mort face au boss = perte totale). Le nombre total de
tests varie légèrement d'un run à l'autre par construction (le nombre d'assertions
intermédiaires "vague en cours X/Y" dépend du tirage 6-10) — vérifié stable et sans échec sur
20 runs consécutifs.

Un bug de test (pas de code de jeu) a été trouvé et corrigé en cours de calibration : le
premier test de victoire ne garantissait pas explicitement qu'aucun autre nœud combat
n'existait dans le reste de la carte — sur un tirage défavorable, la vague testée pouvait
s'avérer être "la dernière du run" par hasard, faisant apparaître un boss au lieu de terminer
simplement le nœud, cassant l'assertion suivante. Corrigé en forçant un second combat garanti
plus loin dans la carte pour ce test précis.
