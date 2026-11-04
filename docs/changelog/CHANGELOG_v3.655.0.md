# v3.655.0 — Le camp au rythme du jour (C3)

Chantier « Un camp qui évolue », dernier morceau : C3, le jour et la nuit. Atelier `atelier/jour-nuit-camp.html` sur les vrais bandeaux des 6 camps ; **choix de Seb (04/11) : teinte B (marquée) + T2 (phrases du matin et de la journée)**.

## Le moment du jour
- `WorldDays.moment()` le déduit des sorties faites depuis la nuit (une nuit toutes les 3 sorties) :

  | Sorties faites | Moment |
  | --- | --- |
  | 0 | matin |
  | 1 | jour |
  | 2 | soir |
  | soirée qui suit la nuit | nuit |

- Rien de nouveau dans la sauvegarde : l'état vient de `explorationProgression.worldDay`, déjà sauvegardé.

## Le bandeau du Camp
- Une teinte par moment, sans image neuve (les six bandeaux sont peints en lumière de fin de journée) :
  - **matin** froid et pâle ;
  - **jour** clair ;
  - **soir** plus doré ;
  - **nuit** bleu sombre avec la lueur du feu.
- La teinte passe par `::before` (`backdrop-filter` sur l'image de fond) : le titre et la pastille restent nets. La nuit s'ajoute au voile existant, réglé pour garder le feu visible.
- Pastille : ☀ le matin et en journée, ☾ le soir et la nuit.

## La carte du feu
- **En-tête** :
  - « Ce matin au camp » ;
  - « Au camp, en journée » ;
  - « Ce soir au camp » ;
  - « Cette nuit » (inchangé).
- Un liseré de couleur suit le moment.
- **Phrases** : 2 du matin et 2 de la journée par monde, soit 24 phrases nouvelles, sans compagnon.
  - Le soir garde les phrases de lieu et des compagnons.
  - La phrase change quand le moment change.
- Les 24 phrases sont **à relire par Seb** dans l'atelier des textes (chantier « Camp · le jour et la nuit », statut « À relire ») ; elles sont traduites en anglais.

## Code
- `systems/world-day-system.js` : `moment()`.
- `ui/screen-banner.js` : icône de la pastille, classe du moment sur le bandeau.
- `ui/camp-view.js` : `campMoment`, `campMomentTitle`, tirage selon le moment, clé de la phrase.
- `data/camp-soir.js` : `matin`, `jour` par monde.
- `css/00-kbtn.css` : teintes du bandeau. `css/04-panel-camp.css` : liserés de la carte.
- `lang/en.js` : 27 textes.

## Contrôles
- `node --check` sur les fichiers modifiés.
- `round-harness.js` : 6 119 OK, 0 échec, sur deux passes.
  - [393] adapté : le soir, comme avant.
  - [438] ajouté, 7 contrôles : moments, phrases et en-têtes du matin, du jour, du soir et de la nuit, teintes CSS, classe du bandeau.
- `boot-harness.js` : 4 OK. `parcours-harness.js` : 212 OK, 0 échec.
- **Chromium à 390 px, sauvegarde de fin de Montagne** :
  - bandeau `is-matin`, `is-jour`, `is-soir`, `is-night` ;
  - pastille ☀ puis ☾ ;
  - pas de défilement horizontal ;
  - nuit lisible, feu visible.

## Fichiers
- Fichiers modifiés : `systems/world-day-system.js`, `ui/screen-banner.js`, `ui/camp-view.js`, `data/camp-soir.js`, `css/00-kbtn.css`, `css/04-panel-camp.css`, `ui/news-view.js`, `lang/en.js`, `core/constants.js`, `sw.js`.
- Aucun fichier protégé touché, aucun fichier ajouté.
