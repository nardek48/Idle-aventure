# Aethervale — v3.198.0

**Base : v3.197.0.** Recalibrage mécanique de la Petite Aventure.
Fichiers protégés intouchés (`save-system.js`, `combat-engine.js`, `stats-system.js`,
`progression-system.js`, `game-loop.js`, `class-combat-system.js`, `dungeon-system.js`,
`adventure/hunt/world-quest-system.js`). `scene-check-system.js` intouché : il reste pur, la
formule de jet n'a pas bougé.

---

## Pourquoi ce lot

Retour Seb : « les petites aventures sont encore trop faciles » après le lot v3.195.0.

Le calibrage v3.195.0 avait été validé contre un joueur qui choisit **au gain**. Simulation
Monte-Carlo de session contre un joueur qui choisit **à la meilleure chance affichée** — ce
que fait n'importe qui, l'estimation est écrite sur la carte — corde jouée :

| stade | Sentier | Chemin | Périple |
|---|---|---|---|
| neuf | 0,2 % | 0,4 % | 0,6 % |
| mi-parcours | 0,2 % | 0,3 % | 0,3 % |
| développé | 0,2 % | 0,3 % | 0,4 % |

Resserrer la formule ne corrige rien : testé jusqu'à base 28 / plafond 85 / pente 1,8, le
joueur prudent passe de 7 % à 10 % pendant que le joueur agressif s'effondre de 18 % à 55 %.
Cela punit le seul joueur qui prenait déjà des risques.

**Cause racine : la voie sûre existait toujours et ne coûtait rien.**

- L'endurance était simultanément la moins difficile (`diffMod` 0,92), la moins chère en
  Souffle (1) et la moins blessante, pour −20 % de butin, face à un `lootMult` d'intensité de
  ×3,5. Pas un triangle : une droite avec un péage symbolique.
- 2 portes × 3 voies = 6 candidats par palier. Il y avait presque toujours une sortie à ~90 %.
- Le filet de sécurité était cumulatif : corde + amulette + provisions + source + autel
  absorbaient cinq échecs sur un budget de trois blessures.

## Deux objets défaillants trouvés en chemin

- **`provisions` n'existait pas.** L'objet était offert en préparation depuis v3.120.0, en
  double exemplaire, mais le mot n'apparaissait que dans `data/scene-templates.js`. Aucun
  système, aucune vue ne le lisait. Un joueur qui en prenait deux jouait avec un seul objet
  utile sur trois emplacements.
- **La corde était illimitée.** Réussite garantie, gratuite en Souffle, réutilisable sans
  compteur, sur 3 des 6 gabarits du pool (gouffre, paroi, rivière) : **3,8 obstacles passés
  sans jeter un dé par Périple**, pour un seul emplacement de sac.

---

## Ce qui change

### Difficulté

- `SCENE_INTENSITY.diffMult` : 0,70 / 1,00 / 1,15 → **0,95 / 1,70 / 2,60**.
- `SCENE_INTENSITY.lootMult` : 1,0 / 2,0 / 3,5 → **1,0 / 2,6 / 6,0**. Le Périple perd la
  moitié de son butin sur un run sur trois : il doit rapporter davantage quand il passe.
- `petite_aventure_foret.maxInjuries: 2` — **nouveau champ de canevas**, défaut 3. Lu par
  `SceneRunManager.getMaxInjuries()`. `expedition_faille` et les six quêtes de déblocage
  migrées gardent 3.
- `petite_aventure_foret.heroScaling: { ref: 21, coef: 0.60, max: 3.5 }` — **nouveau champ de
  canevas**. Multiplie la difficulté selon le développement du héros, via
  `SceneRunManager.heroScale()`, calculé sur `run.heroSnapshot` (figé au départ du run).
  Indexé sur le **bonus de chance réellement gagné** (`min(55, stat × 0,40)`) et non sur la
  stat brute : celle-ci continue de monter après que le bonus a plafonné à 55, ce qui creusait
  un trou de difficulté au stade intermédiaire (20 % d'échec à mi-parcours contre 27 % pour un
  héros neuf, mesuré). Un canevas qui ne déclare pas `heroScaling` renvoie 1.

### Structure du choix

- `gatesPerDepth` : `[2, 2]` → **`[1, 2]`**. Un palier sur deux n'offre qu'un seul passage.
- `optionsPerNode: 2` — **nouveau champ de canevas**. Un nœud-obstacle n'expose que 2 des 3
  voies de son gabarit, tirées à la génération et **mémorisées dans `slot.voies`** (donc
  persistées avec `run.card` : un joueur qui quitte et revient retrouve les mêmes approches).
  Les gabarits gardent leurs trois options en donnée, c'est le run qui en cache une, donc
  aucun autre canevas n'est affecté. Nouveaux `SceneEngine.pickVoies()` et
  `SceneEngine.nodeVoies()` — cette dernière est la source de vérité unique partagée entre
  l'aperçu avant-porte, l'écran d'obstacle et la résolution.
- `petite_aventure_foret.optionProfiles` — **surcharge locale** de
  `SCENE_NODES.optionProfiles`, qui reste le défaut des autres canevas :

| Voie | diffMod | lootMod | Souffle | Sévérité |
|---|---|---|---|---|
| power | 1,05 → **1,12** | 1,20 → **2,60** | 3 | grave |
| precision | 1,0 | 1,00 → **1,15** | 1,5 | normale |
| endurance | 0,92 → **0,95** | 0,80 → **0,50** | 1 | légère |

### Blessures et soins

- `SCENE_NODES.injurySeverityMalus` : 4 / 8 / 16 → **6 / 10 / 16**. Avec un plafond à 2, le
  héros ne porte au plus qu'une blessure à la fois : le malus doit se sentir sur le jet
  suivant plutôt que se diluer sur trois cumuls.
- **Autel et source ne retirent plus qu'une blessure légère.** Une blessure grave, prise en
  voie de puissance, reste jusqu'au bout du run. L'offrande de l'autel n'est facturée que si
  un soin a réellement lieu ; le Souffle est rendu dans tous les cas (rôle de carotte du nœud,
  v3.195.0, indépendant des blessures). Nouveau `SceneRunManager.canHealHere()`.
- **Provisions implémentées** : consommable, soigne la blessure **la plus grave**, utilisable
  à tout moment comme la gourde. Seule réponse à un échec en voie de puissance. Nouveaux
  `SceneRunManager.useSceneProvision()` et `_healOneInjury(run, mode)`.
- **Corde à charges** : `run.ropeCharges`, un usage par exemplaire embarqué. Reste une
  réussite garantie à gain réduit, mais sur un seul obstacle.
- **Doublons retirés de `loadoutOffer`**, sur les deux canevas concernés. Deux provisions sur
  un budget de deux blessures absorbent tous les échecs et ramènent le taux d'échec de 34 % à
  0,3 % : le doublon annulait à lui seul le plafond. Une seconde corde achetait 6 points de
  sécurité en ne déplaçant que l'amulette — une case gratuite, pas un arbitrage.

### Reprise de sauvegarde

`SceneRunManager._migrateRun()` convertit un run démarré avant ce lot : `ropeAvailable` →
1 charge, `provisionCharges` → 0. Idempotent, appelé depuis `getRun()`. Aucune modification de
`save-system.js` : `game.sceneRun` y est persisté tel quel.

---

## Résultat mesuré

Vérifié **contre le code livré** (données et moteur réels chargés depuis le build), 15 000
runs par case, meilleur loadout défensif retenu :

| stade | Sentier | Chemin | Périple |
|---|---|---|---|
| neuf | 2,6 % · 94 or | 10,3 % · 297 | **30,4 % · 696** |
| mi-parcours | 1,0 % · 99 | 6,9 % · 310 | **31,7 % · 685** |
| développé | 0,7 % · 101 | 6,6 % · 308 | **36,5 % · 643** |

Joueur qui prend des risques tant qu'il est indemne, héros développé : Sentier 3,6 % pour
158 or contre 101 en jouant sûr, Chemin 29,8 % pour 339 contre 308. La voie de puissance
redevient le bon calcul sur Sentier et Chemin. Sur Périple elle reste perdante (80 %
d'échec) : le pari, c'est d'y entrer.

---

## Effets de bord traités

- `js/ui/scene-view.js` : le bilan de fin lisait `injuries.length >= 3` en dur et aurait
  affiché « réussite » sur une Petite Aventure évacuée à 2 blessures. Corrigé.
- La pastille de statut affiche le plafond du canevas et passe en alerte à une blessure de
  l'évacuation. Pastilles Corde et Provisions ajoutées (charges visibles).
- Le mystère révélé en obstacle reçoit ses voies restreintes, sinon il devenait la porte de
  secours qui redonnait accès aux trois voies.
- Une voie masquée est refusée **par le manager**, pas seulement cachée dans la vue.

## Tests

`round-harness.js` : **1006 OK, 0 échec**, stable sur 6 exécutions.
`boot-harness.js` 4 OK, `hero-creation-harness.js` 44 OK. `node --check` sur tous les fichiers
modifiés.

Nouvelle **section [PA]** (26 assertions) : plafond par canevas, voies restreintes et figées,
repli des slots sans voies, soins ciblés par sévérité, provisions et corde à charges, absence
de doublon dans l'offre, migration d'un run antérieur, bornes de `heroScale`, non-contamination
d'`expedition_faille`.

Deux assertions existantes corrigées, qui figeaient une constante au lieu de tester un
comportement : le `lootMult` de Chemin (2,0 en dur) et le seuil d'évacuation (3 en dur) sont
désormais lus dans les données.

---

## À revalider

`expedition_faille` hérite du `lootMult` inchangé et des profils par défaut, mais pas du
recalibrage : il reste sur la formule v3.195.0 sans jamais avoir été retravaillé. Point déjà
noté à la session précédente, toujours ouvert.
