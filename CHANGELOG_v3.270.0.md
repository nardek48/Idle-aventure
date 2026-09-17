# v3.270.0 — Combat de groupe, lot L-4 : jouer ses compagnons

Cinquième lot du chantier. L'interrupteur **Auto / Manuel** de l'écran Compagnons, posé
en v3.268.0 mais que rien ne lisait encore en combat, entre en service.

## Ce que ça change

Un compagnon passé en **Manuel** ne décide plus seul : le round attend son action.

- Tu choisis la tienne — elle est **préchargée**, rien ne part encore.
- L'écran passe **tout seul** au compagnon suivant qui doit choisir. Sa mini-carte
  s'allume, celle en attente bat de l'œil, celle qui a choisi se coche.
- La **rangée d'actions du bas** montre ses actions à lui : sa compétence signature et
  son attaque. Le bandeau héros, lui, ne bouge pas — c'est au moment de choisir pour un
  compagnon qu'on a le plus besoin de voir ses propres PV, et les siens restent lisibles
  sur sa mini-carte juste au-dessus.
- Quand tout le monde a choisi, **le round part d'un coup**, dans l'ordre héros puis
  compagnons, puis les ennemis.

Un compagnon en **Auto** n'entre jamais dans la file : il joue comme avant. Sans aucun
compagnon manuel, `heroAction` se comporte exactement comme en v3.269.0 — le round part
au premier tap.

## Le soin et sa cible

Taper la compétence de soin ouvre une feuille basse listant les alliés blessés, avec
leurs PV, leur pourcentage et une barre, celui qui est le plus bas marqué d'un liseré
vert — le choix qu'aurait fait le mode Auto.

**Elle ne s'ouvre que s'il y a un vrai choix.** Un seul allié blessé, le soin part dessus
sans rien demander ; aucun blessé, l'action n'est pas jouable et le dit. Sur un jeu idle,
un tap de plus par round pour une décision évidente est précisément ce qui ferait
basculer tout le monde en Auto — et le Manuel ne servirait plus à rien.

Une compétence indisponible le dit à l'écran : rounds restants affichés en chiffre
pendant la recharge, ∅ quand les charges du combat sont épuisées.

## Une potion reste une action du héros

M�me choisie pendant le tour d'un compagnon, une potion est attribuée au héros et
consomme son action. Le plafond de potions par sortie est calibré pour un seul buveur ;
le laisser à trois changerait cette économie sans qu'on l'ait mesuré.

## Moteur — `combat-engine.js` (fichier protégé)

- `queueChoice` / `allChosen` / `playQueuedRound` : la file d'attente du round. `pending`
  vivait déjà dans `game.combat` depuis le lot L-0, prévu pour ça.
- `selectActor` / `advanceSelection` : qui est l'acteur affiché, et l'enchaînement seul.
- `heroAction` dérive vers la file quand un compagnon manuel attend, sauf en mode
  Grimoire — où l'interrupteur est ignoré, tout le monde est auto, comme décidé au
  cadrage.
- `alliesTurn` joue l'action préchargée d'un compagnon manuel ; en Auto, sa politique
  décide comme avant.
- Un nouveau combat repart d'une file vide.

## Mesures

| Contrôle | v3.269.0 | v3.270.0 |
|---|---|---|
| `round-harness.js` | 2290–2292 OK, 0 échec | 2320 OK, **0 échec** sur 8 passages |
| `sim/forest-bench.js --diff` | écart nul | **écart nul** |
| `sim/forest-bench.js --save` | JSON de référence | **identique au bit près** |
| `boot-harness.js` | 4 OK | 4 OK, 0 échec |
| `hero-creation-harness.js` | 44 OK | 44 OK, 0 échec |
| `sim/balance-bench.js` | ok | ok |

Section **[72]** ajoutée, 29 assertions : la file ne s'active qu'avec un compagnon
manuel, l'ordre des acteurs, le préchargement qui ne joue pas le round, l'enchaînement
automatique, la résolution et le vidage de la file, la bascule de la rangée d'actions,
la sélection à la main, le soin direct à un seul blessé et le popup à plusieurs, les
refus en recharge et sans charge, la potion attribuée au héros, la file vidée au combat
suivant, et le mode Grimoire qui ignore l'interrupteur.

Une assertion du lot précédent a été corrigée : elle comparait des tirages aléatoires et
échouait une fois sur dix quand ils coïncidaient. Elle vérifie désormais le décalage des
compteurs de pattern sur des membres posés déjà préparés, donc de façon déterministe.

## Fichiers livrés

```
sw.js
round-harness.js
CHANGELOG_v3.270.0.md
css/03-combat-group.css
js/core/combat-actors.js
js/core/constants.js
js/systems/combat-engine.js
js/systems/companion-system.js
js/ui/combat-group-view.js
js/ui/combat-view.js
```

## Où en est le chantier

L-0 à L-4 sont livrés. Il reste, au plan d'origine : **L-5** (conditions de Grimoire pour
le groupe, second compagnon avec le Désert, 3 contre 3 réel) et **L-6** (Donjon, Battue,
Chasse et Petites Aventures en groupe, un contexte à la fois).

Deux sujets restent ouverts, notés pour plus tard : l'initiative (file commune ordonnée
par la vitesse) et un vrai modèle de distance et de mouvement. Tous deux à rouvrir
maintenant que le 3 contre 3 est jouable et qu'on peut en juger sur pièce.
