# v3.469.0 — Petites Aventures : la condition du run

Dernier volet du retour de Seb sur les Petites Aventures (la besace toujours identique). Décisions PG-B1a à PG-B1c ; l'atelier `atelier/conditions-run.html` a été validé par Seb avec les recommandations : « Utile cette nuit » gardé, en-tête sur deux lignes, pas d'icône par condition.

## Ce qui change en jeu
- **Chaque Petite Aventure tire une condition au lancement**, propre au monde, avec un avantage et un inconvénient. Une fois sur cinq, c'est « Nuit calme », sans effet.
- **Sur la préparation :**
  - l'en-tête dit la nuit, par exemple « Forêt enchantée · nuit de brouillard » ;
  - un panneau « Cette nuit », placé avant le héros et la besace, donne le nom, la phrase d'ambiance, l'avantage (vert), l'inconvénient (rouge) et l'objet utile.
- **En route**, une pastille dorée dans l'en-tête rappelle la condition au toucher.
- Les parcours (quêtes, étapes d'Histoire) n'ont pas de condition. Un run commencé avant la mise à jour n'en a pas non plus.
- **Les 16 conditions** (conception §7) :

  | Monde | Conditions |
  | --- | --- |
  | Forêt | Brouillard, Orage, Nuit des braconniers, Pleine lune |
  | Désert | Vent de sable, Canicule, Nuit fraîche, Pillards |
  | Ruines | Les murs s'agitent, Poussière de chantier, Bâtisseurs au travail, Nuit des guetteurs |
  | Crypte | Les dormeurs remuent, Mèches humides, Courants d'air, Veillée |

## Mesures (`pa2-bench`, Périple, 150 runs par cellule ; le robot garde toujours la même besace)
| Cas | KO |
| --- | --- |
| Forêt, Nuit calme partout | 31 % |
| Forêt, conditions tirées | 36 % |
| Forêt, par condition | Brouillard 34 %, Orage 29 %, Braconniers 35 %, **Pleine lune 41 %** |
| Désert, calme / tirées | 44 % / 46 % |
| Crypte, Nuit calme partout | 17 % |
| Crypte, conditions tirées | 27 % |
| Crypte, par condition | **Dormeurs 29 %**, Mèches 17 %, **Courants d'air 28 %**, Veillée 19 % |

Trois conditions pèsent nettement plus que les autres : Pleine lune, Les dormeurs remuent et Courants d'air (+10 à +12 points). Le robot n'adapte pas sa besace. Un réglage est proposé à Seb.

## Code
- `data/pa2-content.js` : `PA2_CONDITION_RULES` (Nuit calme 20 %), `PA2_CONDITION_CALM`, `PA2_CONDITIONS` (nom, en-tête, phrase, avantage, inconvénient, objet utile, réglages `fx`).
- `systems/pa2-run.js` :
  - `_drawCondition` au lancement (`run.cond`), `condition`, `condFx` ;
  - réglages lus dans la vue, la Ruse, les dégâts, le premier combat de chaque acte, les sources, la marche, les coupures, les pièges (nombre, Alarme, pièges cachés visibles), les trouvailles, les obstacles (cran, or), les autels, la Craie et les murs, la Lanterne, le butin final, la ressource rare de destination.
- `ui/pa2-view.js` : en-tête, `pa2CondPanelHTML`, `pa2CondChipHTML`, `pa2CondInfo`, ligne du premier combat ; `css/04-panel-pa2.css` : `.pa2-cond`, `.pa2-chip.is-cond`.
- `lang/en.js` (77 textes) et `lang/data-fields.js` (`PA2_CONDITIONS`, `PA2_CONDITION_CALM`).
- État dans `game.sceneRun.cond`, déjà sauvegardé ; aucun fichier protégé, aucun fichier ajouté, aucune image.

## Outils
- `round-harness.js` :
  - section [283] (25 contrôles : tirage et Nuit calme, écran, et chaque réglage vérifié sur le moteur) ;
  - les contrôles historiques tournent en « Nuit calme » (`g.__cond`), et les runs au hasard tirent les conditions.
- `pa2-bench.js` : `--sans-conditions`, `--condition=<id>`.

## Contrôles
- Chromium, 390 et 320 px, vrai jeu : en-tête, panneau « Cette nuit » (Forêt, Crypte, Nuit calme), pastille en route ; rien ne déborde.
- i18n 100 %, aucun orphelin.
- round-harness 4719 OK, 0 échec (deux passes) ; boot, création du héros, parcours (139) OK.
